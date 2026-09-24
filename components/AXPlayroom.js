'use client';
import '../app/playroom.css';
import {useEffect,useMemo,useRef,useState} from 'react';
import Icon from './Icon';
import Brand from './Brand';
import {playroomOutcome} from '../lib/playroom-game.js';

function OMark({className=''}){return <svg className={className} viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="29"/></svg>;}
function XMark({className=''}){return <svg className={className} viewBox="0 0 100 100" aria-hidden="true"><path d="m25 25 50 50"/><path d="M75 25 25 75"/></svg>;}
function Arrow(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>;}
function outcomeName(winner){return winner==='O'?'win':winner==='X'?'loss':'draw';}

export default function AXPlayroom({initialStatus=null}){
 const [visible,setVisible]=useState(true);
 const [open,setOpen]=useState(true);
 const [phase,setPhase]=useState('choose');
 const [board,setBoard]=useState(Array(9).fill(''));
 const [turn,setTurn]=useState('');
 const [line,setLine]=useState([]);
 const [lastMove,setLastMove]=useState(-1);
 const [rounds,setRounds]=useState(0);
 const [scores,setScores]=useState({O:0,X:0,draw:0});
 const [result,setResult]=useState(null);
 const [thinking,setThinking]=useState(false);
 const [starting,setStarting]=useState(false);
 const [bonusRound,setBonusRound]=useState(Boolean(initialStatus?.bonusAvailable));
 const [showRules,setShowRules]=useState(false);
 const [toast,setToast]=useState('');
 const [motionOn,setMotionOn]=useState(true);
 const [soundOn,setSoundOn]=useState(false);
 const [focusCell,setFocusCell]=useState(4);
 const [settlement,setSettlement]=useState({state:'idle',outcome:null,bonusAvailable:false,rewardCode:null,rewardEndsAt:null,nextEligibleAt:null,error:''});
 const cells=useRef([]);
 const endTimer=useRef(null);
 const audioRef=useRef(null);
 const movesRef=useRef([]);
 const settledRef=useRef(false);
 const moveCount=useMemo(()=>board.filter(Boolean).length,[board]);
 const status=starting?'Preparing your round':phase==='choose'?'Your opening. Your choice.':phase==='ending'?'Round complete.':turn==='X'?'AX is thinking':phase==='review'?'Final board.':phase==='result'&&settlement.state==='loading'?'Verifying your result':phase==='result'?'Round complete.':'Your move. Make it count.';


 useEffect(()=>{
  if(!open||phase!=='playing'||turn!=='X')return;
  let cancelled=false;
  setThinking(true);
  const timer=window.setTimeout(async()=>{
   let data=null,errorMessage='';
   for(let attempt=0;attempt<2&&!cancelled;attempt++){
    try{
     const response=await fetch('/api/playroom',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'move',moves:movesRef.current})});
     data=await response.json().catch(()=>null);
     if(response.ok&&data?.ok&&Number.isInteger(data.index))break;
     errorMessage=data?.error||'AX could not make a move.';
    }catch(error){errorMessage=error.message||'AX could not make a move.';}
    if(attempt===0)await new Promise(resolve=>window.setTimeout(resolve,350));
   }
   if(cancelled)return;
   if(!data?.ok||!Number.isInteger(data.index)){
    setThinking(false);setToast(errorMessage||'AX could not make a move. Reopen the Playroom to retry.');window.setTimeout(()=>setToast(''),2800);return;
   }
   const index=data.index;
   setBoard(current=>{
    if(playroomOutcome(current)||current[index])return current;
    const next=current.slice();next[index]='X';
    const nextMoves=[...movesRef.current,index];movesRef.current=nextMoves;
    setLastMove(index);playSound('ax');
    const nextOutcome=playroomOutcome(next);
    if(nextOutcome)window.setTimeout(()=>finish(nextOutcome,nextMoves),0);
    else{setTurn('O');setThinking(false);}
    return next;
   });
  },motionOn?680:180);
  return()=>{cancelled=true;window.clearTimeout(timer);};
 },[open,phase,turn,motionOn]);

 useEffect(()=>()=>{if(endTimer.current)window.clearTimeout(endTimer.current);},[]);

 function playSound(kind){
  if(!soundOn||typeof window==='undefined')return;
  try{
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
   const audio=audioRef.current||new Context();audioRef.current=audio;if(audio.state==='suspended')audio.resume().catch(()=>{});
   const notes=kind==='win'?[523.25,659.25,783.99]:kind==='draw'?[440,587.33]:kind==='ax'?[261.63]:[392];
   notes.forEach((frequency,index)=>{const osc=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+index*.075;osc.frequency.value=frequency;osc.type='sine';gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.035,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+.13);osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+.15);});
  }catch{}
 }

 async function start(mark){
  if(phase!=='choose'||starting)return;
  setStarting(true);setToast('');
  try{
   const response=await fetch('/api/playroom',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',first:mark,bonus:bonusRound})});
   const data=await response.json().catch(()=>null);
   if(!response.ok||!data?.ok)throw new Error(data?.error||'The Playroom round could not start.');
   setBonusRound(Boolean(data.bonus));
   if(endTimer.current)window.clearTimeout(endTimer.current);
   movesRef.current=[];settledRef.current=false;
   setSettlement({state:'idle',outcome:null,bonusAvailable:false,rewardCode:null,rewardEndsAt:null,nextEligibleAt:null,error:''});
   setRounds(value=>value+1);setBoard(Array(9).fill(''));setLine([]);setLastMove(-1);setResult(null);setPhase('playing');setFocusCell(4);playSound('place');setTurn(mark);
  }catch(error){
   setToast(error.message||'The Playroom round could not start.');
   window.setTimeout(()=>setToast(''),2600);
  }finally{setStarting(false);}
 }

 function play(index){
  if(phase!=='playing'||turn!=='O'||thinking||board[index])return;
  const next=board.slice();next[index]='O';
  const nextMoves=[...movesRef.current,index];movesRef.current=nextMoves;
  setBoard(next);setLastMove(index);setFocusCell(index);playSound('place');
  const nextOutcome=playroomOutcome(next);
  if(nextOutcome)finish(nextOutcome,nextMoves);else setTurn('X');
 }

 function finish(nextOutcome,nextMoves){
  if(settledRef.current)return;
  settledRef.current=true;setThinking(false);setTurn('');setLine(nextOutcome.line||[]);setResult(nextOutcome);setPhase('ending');
  setScores(current=>({...current,[nextOutcome.winner]:current[nextOutcome.winner]+1}));
  playSound(nextOutcome.winner==='O'?'win':nextOutcome.winner==='draw'?'draw':'ax');
  settle(nextMoves,nextOutcome);
  if(endTimer.current)window.clearTimeout(endTimer.current);
  endTimer.current=window.setTimeout(()=>setPhase('result'),motionOn?(nextOutcome.line?.length?900:520):120);
 }

 async function settle(nextMoves,nextOutcome){
  const expected=outcomeName(nextOutcome.winner);
  setSettlement({state:'loading',outcome:expected,bonusAvailable:false,rewardCode:null,rewardEndsAt:null,nextEligibleAt:null,error:''});
  try{
   const response=await fetch('/api/playroom',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'finish',moves:nextMoves})});
   const data=await response.json().catch(()=>null);
   if(!response.ok||!data?.ok)throw new Error(data?.error||'Your Playroom result could not be verified.');
   if(data.outcome!==expected)throw new Error('Your Playroom result could not be verified.');
   setSettlement({state:'ready',outcome:data.outcome,bonusAvailable:Boolean(data.bonusAvailable),rewardCode:data.rewardCode||null,rewardEndsAt:data.rewardEndsAt||null,nextEligibleAt:data.nextEligibleAt||null,error:''});
  }catch(error){
   setSettlement(current=>({...current,state:'error',error:error.message||'Your result could not be verified.'}));
  }
 }

 function retrySettlement(){
  if(!result||!movesRef.current.length)return;
  settle(movesRef.current,result);
 }

 function resetRound(asBonus=false){
  if(endTimer.current)window.clearTimeout(endTimer.current);
  movesRef.current=[];settledRef.current=false;setBonusRound(Boolean(asBonus));
  setBoard(Array(9).fill(''));setPhase('choose');setTurn('');setLine([]);setLastMove(-1);setResult(null);setThinking(false);setFocusCell(4);
  setSettlement({state:'idle',outcome:null,bonusAvailable:false,rewardCode:null,rewardEndsAt:null,nextEligibleAt:null,error:''});
 }

 function keyMove(index,event){
  if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const row=Math.floor(index/3),col=index%3;let target=index;
  if(event.key==='ArrowRight')target=row*3+(col+1)%3;if(event.key==='ArrowLeft')target=row*3+(col+2)%3;if(event.key==='ArrowDown')target=(index+3)%9;if(event.key==='ArrowUp')target=(index+6)%9;if(event.key==='Home')target=0;if(event.key==='End')target=8;setFocusCell(target);cells.current[target]?.focus({preventScroll:true});
 }

 function minimizeGame(){
  if(result&&settlement.state==='loading'){setToast('Finishing your verified result…');window.setTimeout(()=>setToast(''),1800);return;}
  const cooldownStarted=result&&settlement.state==='ready'&&(settlement.outcome==='win'||settlement.outcome==='loss'||(settlement.outcome==='draw'&&!settlement.bonusAvailable&&Boolean(settlement.nextEligibleAt)));
  setOpen(false);setVisible(!cooldownStarted);setShowRules(false);
 }
 function openGame(){setVisible(true);setOpen(true);}
 async function copyCode(){
  const value=settlement.rewardCode;
  if(!value){setToast(settlement.state==='error'?'Reward pending — retry verification first.':'Your 10% code is still being created.');window.setTimeout(()=>setToast(''),2200);return;}
  try{await navigator.clipboard.writeText(value);setToast('10% code copied.');}catch{setToast('Your code: '+value);}
  window.setTimeout(()=>setToast(''),2200);
 }

 const finalDraw=result?.winner==='draw'&&settlement.state==='ready'&&!settlement.bonusAvailable;
 const resultTitle=result?.winner==='O'?'You beat AX.':result?.winner==='draw'?(finalDraw?'Still evenly matched.':'Perfectly matched.'):'AX got this one.';
 const resultKicker=result?.winner==='O'?'10% unlocked':result?.winner==='draw'?(finalDraw?'Good game':'Bonus round unlocked'):'Good game';
 const resultCopy=result?.winner==='O'?'Your verified 10% code is ready for your next AX order.':result?.winner==='draw'?(finalDraw?'That was your bonus round. AX Playroom returns tomorrow.':'No discount used. Your draw unlocked one Bonus Round — one last shot at 10%.'):'No penalty. The Playroom will be back tomorrow.';
 const miniTitle=phase==='result'&&settlement.state==='loading'?'Checking your result':phase==='result'&&settlement.outcome==='win'?'10% reward ready':phase==='result'&&settlement.outcome==='draw'?(settlement.bonusAvailable?'BONUS ROUND ready':'Good game'):phase==='result'&&settlement.outcome==='loss'?'Good game':bonusRound?'BONUS ROUND ready':'Play AX XO';
 const miniCopy=phase==='result'&&settlement.state==='loading'?'Tap to reopen':phase==='result'&&settlement.outcome==='win'?'Tap to copy your code':phase==='result'&&settlement.outcome==='draw'?(settlement.bonusAvailable?'One last shot at 10%':'Returns tomorrow'):phase==='result'&&settlement.outcome==='loss'?'Tap to view your result':bonusRound?'One last shot at 10%':'Win 10% off';

 return <>
  {visible&&!open&&<div className="ax-play-teaser ax-play-teaser-minimized" role="region" aria-label="AX Playroom"><button type="button" className="ax-play-card" onClick={openGame}><span className="ax-play-mark">XO</span><span><strong>{miniTitle}</strong><small>{miniCopy}</small></span><Icon name="arrow" size={15}/></button></div>}

  {open&&<div className="ax-xo-backdrop" role="presentation"><section className={'ax-xo-modal'+(motionOn?'':' reduce-motion')} role="dialog" aria-modal="true" aria-labelledby="ax-xo-title">
   <header className="ax-xo-topbar"><div className="ax-xo-brand"><Brand/><span>A little<br/>off the clock.</span></div><div className="ax-xo-top-actions"><span className="ax-xo-edition"><i/>Playroom / Live</span><button type="button" className="ax-xo-icon-button" aria-label={motionOn?'Turn animations off':'Turn animations on'} aria-pressed={motionOn} onClick={()=>setMotionOn(value=>!value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h3l3-7 3 14 3-7h2"/></svg></button><button type="button" className="ax-xo-icon-button" aria-label={soundOn?'Turn sound off':'Turn sound on'} aria-pressed={soundOn} onClick={()=>setSoundOn(value=>!value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5 5 9H2v6h3l5 4z"/>{soundOn?<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>:<path d="m16 9 6 6m0-6-6 6"/>}</svg></button><button type="button" className="ax-xo-icon-button ax-xo-close" aria-label="Minimize AX Playroom" onClick={minimizeGame}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></header>

   <main className="ax-xo-experience">
    <section className="ax-xo-editorial" aria-labelledby="ax-xo-title"><div><p className="ax-xo-eyebrow">The AX Playroom</p><h1 id="ax-xo-title"><span>Your</span><span className="ax-xo-headline-last"><em>move.</em><svg className="ax-xo-star" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 1v38M1 20h38M6.5 6.5l27 27M33.5 6.5l-27 27"/></svg></span></h1><p className="ax-xo-description">Step out of the scroll.<br/>Take on AX in a little friendly rivalry.</p></div><div className="ax-xo-art" aria-hidden="true"><div className="ax-xo-orbit"/><div className="ax-xo-sculpture-shadow"/><div className="ax-xo-art-o"/><div className="ax-xo-art-x"/><span>Nine squares. All yours.</span></div><div><div className="ax-xo-rewards" aria-label="Playroom rewards: win 10 percent off, first draw unlocks one bonus round"><div><span className="ax-xo-reward-number">10<small>%</small></span><p><strong>Win the round</strong>One-use reward.</p></div><i/><div><span className="ax-xo-reward-number">1<small>×</small></span><p><strong>First draw</strong>One Bonus Round.</p></div></div><p className="ax-xo-demo-caption ax-xo-live-caption">Win 10% off. First draw unlocks one Bonus Round. Then the Playroom rests until tomorrow.</p></div></section>

    <section className="ax-xo-play-side" aria-label="Play tic-tac-toe with AX"><div className="ax-xo-play-shell"><div className="ax-xo-game-top"><span>You × AX</span><span>{bonusRound?'BONUS ROUND':rounds?'Round '+String(rounds).padStart(2,'0'):'A friendly match'}</span></div><div className="ax-xo-players" data-turn={turn}><span className="ax-xo-turn-track" aria-hidden="true"/><div className={'ax-xo-player'+(turn==='O'?' active':'')}><span className="ax-xo-player-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/></svg></span><span>You<small>Always O</small></span><i/></div><div className={'ax-xo-player ax'+(turn==='X'?' active':'')}><span className="ax-xo-player-icon"><svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19"/></svg></span><span>AX<small>Always X</small></span><i/></div></div>

     <div className="ax-xo-stage-wrap">
      {phase==='choose'&&<section className="ax-xo-stage ax-xo-choose-stage"><div className="ax-xo-choose-top"><div className="ax-xo-opening-marks" aria-hidden="true"><span className="o"><OMark/></span><em>vs.</em><span><XMark/></span></div><h2>{bonusRound?'Bonus Round.':'You’re O. AX is X.'}</h2><p>{bonusRound?'One last shot at 10%. Choose who starts.':'Who makes the first move?'}</p></div><div className="ax-xo-choices"><button type="button" className="primary" disabled={starting} onClick={()=>start('O')}><span className="symbol"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/></svg></span><span><strong>{starting?'Preparing…':'I’ll go first'}</strong><small>Set the pace. You start with O.</small></span><Arrow/></button><button type="button" disabled={starting} onClick={()=>start('X')}><span className="symbol"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></span><span><strong>Let AX start</strong><small>AX opens with X. You’re still O.</small></span><Arrow/></button></div></section>}

      {(phase==='playing'||phase==='ending'||phase==='review')&&<section className="ax-xo-stage ax-xo-board-stage" aria-label="Game in progress"><div className="ax-xo-board-frame"><div className="ax-xo-board-wrap"><div className="ax-xo-board" role="group" aria-label="Tic-tac-toe board. You play O. Use arrow keys to move and Enter to place a mark." aria-busy={thinking}>{board.map((cell,index)=><button type="button" key={index} ref={node=>{cells.current[index]=node;}} className={'ax-xo-cell'+(line.includes(index)?(result?.winner==='O'?' win-o':' win-x'):'')+(lastMove===index?' last':'')} data-value={cell||undefined} aria-label={'Row '+(Math.floor(index/3)+1)+', column '+(index%3+1)+': '+(cell?(cell==='O'?'your O':'AX’s X'):'empty')} aria-disabled={phase!=='playing'||turn!=='O'||Boolean(cell)} tabIndex={focusCell===index?0:-1} onKeyDown={event=>keyMove(index,event)} onClick={()=>play(index)}>{!cell&&<span className="ghost" aria-hidden="true"/>}{cell==='O'&&<OMark className="mark"/>}{cell==='X'&&<XMark className="mark"/>}</button>)}</div>{line.length===3&&<svg className={'ax-xo-win-stroke '+(result?.winner==='X'?'is-x':'')} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1={line[0]%3*100/3+100/6} y1={Math.floor(line[0]/3)*100/3+100/6} x2={line[2]%3*100/3+100/6} y2={Math.floor(line[2]/3)*100/3+100/6}/></svg>}</div></div><div className="ax-xo-board-footer">{phase==='review'?<button type="button" onClick={()=>setPhase('result')}>View result →</button>:<span>Round locked · {moveCount} / 9 moves</span>}</div></section>}

      {phase==='result'&&<section className={'ax-xo-stage ax-xo-result-stage outcome-'+(result?.winner||'')}>{result?.winner==='O'&&<div className="ax-xo-confetti" aria-hidden="true">{Array.from({length:22},(_,index)=><i key={index}/>)}</div>}<div className="ax-xo-result-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 3h8v6a4 4 0 0 1-8 0zM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v5m-4 3h8m-10 0h12"/></svg></div><p className="ax-xo-result-kicker">{resultKicker}</p><h2>{resultTitle}</h2><p className="ax-xo-result-copy">{resultCopy}</p>
       {result?.winner==='O'&&<div className={'ax-xo-ticket '+(settlement.state==='error'?'has-error':'')}><div className="ax-xo-ticket-percent"><b>10</b><small>%</small><span>AX reward</span></div><div className="ax-xo-ticket-info"><strong>{settlement.state==='ready'&&settlement.rewardCode?settlement.rewardCode:settlement.state==='error'?'REWARD PENDING':'CREATING CODE…'}</strong><p>{settlement.state==='error'?settlement.error:'Single use · valid 7 days · non-stackable'}</p></div><button type="button" className="ax-xo-copy" disabled={!settlement.rewardCode} onClick={copyCode} aria-label="Copy 10 percent reward code"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg></button></div>}
       {settlement.state==='error'&&<button type="button" className="ax-xo-retry-reward" onClick={retrySettlement}>Retry verification</button>}
       <div className="ax-xo-result-actions">{result?.winner==='draw'&&settlement.bonusAvailable?<button type="button" className="solid" disabled={settlement.state!=='ready'} onClick={()=>resetRound(true)}>Play bonus round <span aria-hidden="true">↗</span></button>:result?.winner==='draw'?<button type="button" className="solid" disabled={settlement.state!=='ready'} onClick={minimizeGame}>Back to AX <span aria-hidden="true">↗</span></button>:result?.winner==='O'?<button type="button" className="solid" disabled={!settlement.rewardCode} onClick={copyCode}>Copy 10% code <span aria-hidden="true">↗</span></button>:<button type="button" className="solid" onClick={minimizeGame}>Back to AX <span aria-hidden="true">↗</span></button>}<button type="button" onClick={()=>setPhase('review')}>See final board</button></div><p className="ax-xo-result-footnote">{result?.winner==='O'?'One code per verified win. The Playroom returns in 7 days.':result?.winner==='draw'?(settlement.bonusAvailable?'One draw unlocks one Bonus Round only.':'Bonus Round complete. Your next Playroom unlocks tomorrow.'):'No discount, no penalty. Your next round unlocks tomorrow.'}</p></section>}
     </div>

     <div className={'ax-xo-game-bottom'+(thinking?' thinking':'')}><div className="ax-xo-live-status"><span/><span role="status" aria-live="polite">{status}</span>{thinking&&<em><i/><i/><i/></em>}</div><button type="button" onClick={()=>setShowRules(true)}>How to play</button></div></div><div className="ax-xo-session"><span>This session</span><div aria-label="Session scores"><span>You <b>{scores.O}</b></span><span>Draw <b>{scores.draw}</b></span><span>AX <b>{scores.X}</b></span></div></div></section>
   </main>

   <footer className="ax-xo-footer"><span>✣ Good style. Great moves.</span><span>Win 10% · One draw bonus · Lose nothing.</span><a href="/products" onClick={minimizeGame}>Explore AX <span aria-hidden="true">↗</span></a></footer>

   {showRules&&<div className="ax-xo-rules-backdrop" role="presentation" onMouseDown={event=>{if(event.currentTarget===event.target)setShowRules(false);}}><section className="ax-xo-rules" role="dialog" aria-modal="true" aria-labelledby="ax-xo-rules-title"><button type="button" onClick={()=>setShowRules(false)} aria-label="Close how to play"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button><p className="ax-xo-eyebrow">A quick breather</p><h2 id="ax-xo-rules-title">Three makes a win.</h2><ol><li>You’re always <strong>O</strong>. AX is always <strong>X</strong>. Choose who makes the opening move.</li><li>Tap an empty square. Get three of your marks in a row, column, or diagonal.</li><li><strong>Win:</strong> get one verified 10% off code. <strong>First draw:</strong> unlock one Bonus Round immediately. If the Bonus Round also draws, the Playroom returns tomorrow. <strong>AX wins:</strong> lose nothing and come back tomorrow.</li></ol><p>Win codes are single-use, valid for 7 days and cannot be combined with other discounts. A verified win also pauses the Playroom for 7 days.</p><p className="demo ax-xo-live-note">Results are verified by AX before a reward code is issued. No purchase is required to play.</p></section></div>}
   {toast&&<div className="ax-xo-toast" role="status" aria-live="polite">{toast}</div>}
  </section></div>}
 </>;
}
