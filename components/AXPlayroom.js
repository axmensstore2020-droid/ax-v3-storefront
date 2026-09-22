'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Icon from './Icon';
import Brand from './Brand';

const TEASER_KEY='ax:playroom-teaser:v1';
const DISMISSED_KEY='ax:playroom-dismissed:v1';
const WINS=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function outcome(board){
 for(const line of WINS){
  const [a,b,c]=line;
  if(board[a] && board[a]===board[b] && board[a]===board[c]) return {winner:board[a],line};
 }
 return board.every(Boolean)?{winner:'draw',line:[]}:null;
}
function empty(board){return board.flatMap((value,index)=>value?[]:[index]);}
function chooseMove(board,random=Math.random){
 if(outcome(board)) return null;
 const free=empty(board);
 const pick=list=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
 for(const mark of ['X','O']){
  const winning=free.filter(index=>{const next=board.slice();next[index]=mark;return outcome(next)?.winner===mark;});
  if(winning.length && (mark==='X' || random()<.87)) return pick(winning);
 }
 if(random()<.17) return pick(free);
 if(free.includes(4)) return 4;
 const corners=free.filter(index=>[0,2,6,8].includes(index));
 return pick(corners.length?corners:free);
}
function OMark({className=''}){return <svg className={className} viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="29"/></svg>;}
function XMark({className=''}){return <svg className={className} viewBox="0 0 100 100" aria-hidden="true"><path d="m25 25 50 50"/><path d="M75 25 25 75"/></svg>;}
function Arrow(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>;}

export default function AXPlayroom(){
 const [visible,setVisible]=useState(false);
 const [open,setOpen]=useState(false);
 const [phase,setPhase]=useState('choose');
 const [board,setBoard]=useState(Array(9).fill(''));
 const [turn,setTurn]=useState('');
 const [line,setLine]=useState([]);
 const [lastMove,setLastMove]=useState(-1);
 const [rounds,setRounds]=useState(0);
 const [scores,setScores]=useState({O:0,X:0,draw:0});
 const [result,setResult]=useState(null);
 const [thinking,setThinking]=useState(false);
 const [showRules,setShowRules]=useState(false);
 const [toast,setToast]=useState('');
 const [motionOn,setMotionOn]=useState(true);
 const [soundOn,setSoundOn]=useState(false);
 const [focusCell,setFocusCell]=useState(4);
 const cells=useRef([]);
 const endTimer=useRef(null);
 const audioRef=useRef(null);
 const moveCount=useMemo(()=>board.filter(Boolean).length,[board]);
 const status=phase==='choose'?'Your opening. Your choice.':phase==='ending'?'Round complete.':turn==='X'?'AX is thinking':phase==='review'?'Final board.':phase==='result'?'Round complete.':'Your move. Make it count.';

 useEffect(()=>{
  if(typeof window==='undefined') return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if(reduced?.matches) setMotionOn(false);
  const eligible=/^\/($|products|collections)/.test(window.location.pathname);
  const direct=new URLSearchParams(window.location.search).get('play')==='1';
  if(direct){setVisible(true);setOpen(true);return;}
  if(!eligible || window.sessionStorage.getItem(DISMISSED_KEY)) return;
  const delay=window.sessionStorage.getItem(TEASER_KEY)?2400:8500;
  const timer=window.setTimeout(()=>{setVisible(true);window.sessionStorage.setItem(TEASER_KEY,'1');},delay);
  return()=>window.clearTimeout(timer);
 },[]);

 useEffect(()=>{
  if(!open || phase!=='playing' || turn!=='X') return;
  setThinking(true);
  const timer=window.setTimeout(()=>{
   setBoard(current=>{
    if(outcome(current)) return current;
    const index=chooseMove(current);
    if(index==null || index<0) return current;
    const next=current.slice();next[index]='X';
    setLastMove(index);playSound('ax');
    const nextOutcome=outcome(next);
    if(nextOutcome) window.setTimeout(()=>finish(nextOutcome),0);
    else {setTurn('O');setThinking(false);}
    return next;
   });
  },motionOn?680:180);
  return()=>window.clearTimeout(timer);
 },[open,phase,turn,motionOn]);

 useEffect(()=>()=>{if(endTimer.current)window.clearTimeout(endTimer.current);},[]);

 function playSound(kind){
  if(!soundOn || typeof window==='undefined') return;
  try{
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
   const audio=audioRef.current||new Context();audioRef.current=audio;if(audio.state==='suspended')audio.resume().catch(()=>{});
   const notes=kind==='win'?[523.25,659.25,783.99]:kind==='draw'?[440,587.33]:kind==='ax'?[261.63]:[392];
   notes.forEach((frequency,index)=>{const osc=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+index*.075;osc.frequency.value=frequency;osc.type='sine';gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.035,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+.13);osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+.15);});
  }catch{}
 }
 function finish(nextOutcome){
  setThinking(false);setTurn('');setLine(nextOutcome.line||[]);setResult(nextOutcome);setPhase('ending');setScores(current=>({...current,[nextOutcome.winner]:current[nextOutcome.winner]+1}));playSound(nextOutcome.winner==='O'?'win':nextOutcome.winner==='draw'?'draw':'ax');
  if(endTimer.current)window.clearTimeout(endTimer.current);
  endTimer.current=window.setTimeout(()=>setPhase('result'),motionOn?(nextOutcome.line?.length?900:520):120);
 }
 function resetRound(){if(endTimer.current)window.clearTimeout(endTimer.current);setBoard(Array(9).fill(''));setPhase('choose');setTurn('');setLine([]);setLastMove(-1);setResult(null);setThinking(false);setFocusCell(4);}
 function start(mark){if(phase!=='choose')return;setRounds(value=>value+1);setBoard(Array(9).fill(''));setLine([]);setLastMove(-1);setResult(null);setPhase('playing');setFocusCell(4);playSound('place');setTurn(mark==='X'?'X':'O');}
 function play(index){if(phase!=='playing'||turn!=='O'||thinking||board[index])return;const next=board.slice();next[index]='O';setBoard(next);setLastMove(index);setFocusCell(index);playSound('place');const nextOutcome=outcome(next);if(nextOutcome)finish(nextOutcome);else setTurn('X');}
 function keyMove(index,event){
  if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const row=Math.floor(index/3),col=index%3;let target=index;
  if(event.key==='ArrowRight')target=row*3+(col+1)%3;if(event.key==='ArrowLeft')target=row*3+(col+2)%3;if(event.key==='ArrowDown')target=(index+3)%9;if(event.key==='ArrowUp')target=(index+6)%9;if(event.key==='Home')target=0;if(event.key==='End')target=8;setFocusCell(target);cells.current[target]?.focus({preventScroll:true});
 }
 function closeAll(){setOpen(false);setVisible(false);setShowRules(false);try{window.sessionStorage.setItem(DISMISSED_KEY,'1');}catch{}}
 function openGame(){setVisible(true);setOpen(true);}
 async function copyCode(){const value=result?.winner==='O'?'AXWIN10-DEMO':'AXDRAW5-DEMO';try{await navigator.clipboard.writeText(value);setToast('Demo code copied. Not valid at checkout.');}catch{setToast('Demo code: '+value);}window.setTimeout(()=>setToast(''),2200);}

 const reward=result?.winner==='O'?10:5;
 const rewardCode=result?.winner==='O'?'AXWIN10-DEMO':'AXDRAW5-DEMO';
 const resultTitle=result?.winner==='O'?'You beat AX.':result?.winner==='draw'?'Perfectly matched.':'AX got this one.';
 const resultKicker=result?.winner==='O'?'A very good move':result?.winner==='draw'?'Respect, rival':'The house takes this one';
 const resultCopy=result?.winner==='O'?'Three in a row. A little something for your next move.':result?.winner==='draw'?'A worthy opponent. Even a draw deserves a little love.':'Good game. A fresh board and a new opening could change everything.';

 return <>
  {visible&&!open&&<div className="ax-play-teaser" role="region" aria-label="AX XO game"><button type="button" className="ax-play-card" onClick={openGame}><span className="ax-play-mark">XO</span><span><strong>Play AX XO</strong><small>Take a 30 second style break</small></span><Icon name="arrow" size={15}/></button><button type="button" className="ax-play-dismiss" aria-label="Dismiss AX XO" onClick={closeAll}>×</button></div>}

  {open&&<div className="ax-xo-backdrop" role="presentation"><section className={'ax-xo-modal'+(motionOn?'':' reduce-motion')} role="dialog" aria-modal="true" aria-labelledby="ax-xo-title">
   <header className="ax-xo-topbar"><div className="ax-xo-brand"><Brand/><span>A little<br/>off the clock.</span></div><div className="ax-xo-top-actions"><span className="ax-xo-edition"><i/>Playroom / Preview</span><button type="button" className="ax-xo-icon-button" aria-label={motionOn?'Turn animations off':'Turn animations on'} aria-pressed={motionOn} onClick={()=>setMotionOn(value=>!value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h3l3-7 3 14 3-7h2"/></svg></button><button type="button" className="ax-xo-icon-button" aria-label={soundOn?'Turn sound off':'Turn sound on'} aria-pressed={soundOn} onClick={()=>setSoundOn(value=>!value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5 5 9H2v6h3l5 4z"/>{soundOn?<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>:<path d="m16 9 6 6m0-6-6 6"/>}</svg></button><button type="button" className="ax-xo-icon-button ax-xo-close" aria-label="Close AX Playroom" onClick={closeAll}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></header>

   <main className="ax-xo-experience">
    <section className="ax-xo-editorial" aria-labelledby="ax-xo-title"><div><p className="ax-xo-eyebrow">The AX Playroom</p><h1 id="ax-xo-title"><span>Your</span><span className="ax-xo-headline-last"><em>move.</em><svg className="ax-xo-star" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 1v38M1 20h38M6.5 6.5l27 27M33.5 6.5l-27 27"/></svg></span></h1><p className="ax-xo-description">Step out of the scroll.<br/>Take on AX in a little friendly rivalry.</p></div><div className="ax-xo-art" aria-hidden="true"><div className="ax-xo-orbit"/><div className="ax-xo-sculpture-shadow"/><div className="ax-xo-art-o"/><div className="ax-xo-art-x"/><span>Nine squares. All yours.</span></div><div><div className="ax-xo-rewards" aria-label="Demo rewards: win 10 percent, draw 5 percent"><div><span className="ax-xo-reward-number">10<small>%</small></span><p><strong>Win the round</strong>Make your three.</p></div><i/><div><span className="ax-xo-reward-number">5<small>%</small></span><p><strong>Hold to a draw</strong>A worthy rival.</p></div></div><p className="ax-xo-demo-caption">Preview experience. Rewards are for demonstration only.</p></div></section>

    <section className="ax-xo-play-side" aria-label="Play tic-tac-toe with AX"><div className="ax-xo-play-shell"><div className="ax-xo-game-top"><span>You × AX</span><span>{rounds?'Round '+String(rounds).padStart(2,'0'):'A friendly match'}</span></div><div className="ax-xo-players" data-turn={turn}><span className="ax-xo-turn-track" aria-hidden="true"/><div className={'ax-xo-player'+(turn==='O'?' active':'')}><span className="ax-xo-player-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/></svg></span><span>You<small>Always O</small></span><i/></div><div className={'ax-xo-player ax'+(turn==='X'?' active':'')}><span className="ax-xo-player-icon"><svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19"/></svg></span><span>AX<small>Always X</small></span><i/></div></div>

     <div className="ax-xo-stage-wrap">
      {phase==='choose'&&<section className="ax-xo-stage ax-xo-choose-stage"><div className="ax-xo-choose-top"><div className="ax-xo-opening-marks" aria-hidden="true"><span className="o"><OMark/></span><em>vs.</em><span><XMark/></span></div><h2>You’re O. AX is X.</h2><p>Who makes the first move?</p></div><div className="ax-xo-choices"><button type="button" className="primary" onClick={()=>start('O')}><span className="symbol"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/></svg></span><span><strong>I’ll go first</strong><small>Set the pace. You start with O.</small></span><Arrow/></button><button type="button" onClick={()=>start('X')}><span className="symbol"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></span><span><strong>Let AX start</strong><small>AX opens with X. You’re still O.</small></span><Arrow/></button></div></section>}

      {(phase==='playing'||phase==='ending'||phase==='review')&&<section className="ax-xo-stage ax-xo-board-stage" aria-label="Game in progress"><div className="ax-xo-board-frame"><div className="ax-xo-board-wrap"><div className="ax-xo-board" role="group" aria-label="Tic-tac-toe board. You play O. Use arrow keys to move and Enter to place a mark." aria-busy={thinking}>{board.map((cell,index)=><button type="button" key={index} ref={node=>{cells.current[index]=node;}} className={'ax-xo-cell'+(line.includes(index)?(result?.winner==='O'?' win-o':' win-x'):'')+(lastMove===index?' last':'')} data-value={cell||undefined} aria-label={'Row '+(Math.floor(index/3)+1)+', column '+(index%3+1)+': '+(cell?(cell==='O'?'your O':'AX’s X'):'empty')} aria-disabled={phase!=='playing'||turn!=='O'||Boolean(cell)} tabIndex={focusCell===index?0:-1} onKeyDown={event=>keyMove(index,event)} onClick={()=>play(index)}>{!cell&&<span className="ghost" aria-hidden="true"/>}{cell==='O'&&<OMark className="mark"/>}{cell==='X'&&<XMark className="mark"/>}</button>)}</div>{line.length===3&&<svg className={'ax-xo-win-stroke '+(result?.winner==='X'?'is-x':'')} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1={line[0]%3*100/3+100/6} y1={Math.floor(line[0]/3)*100/3+100/6} x2={line[2]%3*100/3+100/6} y2={Math.floor(line[2]/3)*100/3+100/6}/></svg>}</div></div><div className="ax-xo-board-footer"><button type="button" onClick={resetRound}><svg viewBox="0 0 18 18"><path d="M3 7a6 6 0 1 1 0 5M3 3v4h4"/></svg>Start over</button>{phase==='review'?<button type="button" onClick={()=>setPhase('result')}>View result →</button>:<span>{moveCount} / 9 moves</span>}</div></section>}

      {phase==='result'&&<section className={'ax-xo-stage ax-xo-result-stage outcome-'+(result?.winner||'')}>{result?.winner==='O'&&<div className="ax-xo-confetti" aria-hidden="true">{Array.from({length:22},(_,index)=><i key={index}/>)}</div>}<div className="ax-xo-result-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 3h8v6a4 4 0 0 1-8 0zM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v5m-4 3h8m-10 0h12"/></svg></div><p className="ax-xo-result-kicker">{resultKicker}</p><h2>{resultTitle}</h2><p className="ax-xo-result-copy">{resultCopy}</p>{result?.winner!=='X'&&<div className="ax-xo-ticket"><div className="ax-xo-ticket-percent"><b>{reward}</b><small>%</small><span>Reward preview</span></div><div className="ax-xo-ticket-info"><strong>{rewardCode}</strong><p>Demo code · not redeemable</p></div><button type="button" className="ax-xo-copy" onClick={copyCode} aria-label="Copy demo reward code"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg></button></div>}<div className="ax-xo-result-actions"><button type="button" className="solid" onClick={resetRound}>Play again <span aria-hidden="true">↗</span></button><button type="button" onClick={()=>setPhase('review')}>See final board</button></div><p className="ax-xo-result-footnote">A friendly preview. Play as many rounds as you like.</p></section>}
     </div>

     <div className={'ax-xo-game-bottom'+(thinking?' thinking':'')}><div className="ax-xo-live-status"><span/><span role="status" aria-live="polite">{status}</span>{thinking&&<em><i/><i/><i/></em>}</div><button type="button" onClick={()=>setShowRules(true)}>How to play</button></div></div><div className="ax-xo-session"><span>This session</span><div aria-label="Session scores"><span>You <b>{scores.O}</b></span><span>Draw <b>{scores.draw}</b></span><span>AX <b>{scores.X}</b></span></div></div></section>
   </main>

   <footer className="ax-xo-footer"><span>✣ Good style. Great moves.</span><span>Made for a moment away from the ordinary.</span><a href="/products" onClick={()=>setOpen(false)}>Explore AX <span aria-hidden="true">↗</span></a></footer>

   {showRules&&<div className="ax-xo-rules-backdrop" role="presentation" onMouseDown={event=>{if(event.currentTarget===event.target)setShowRules(false);}}><section className="ax-xo-rules" role="dialog" aria-modal="true" aria-labelledby="ax-xo-rules-title"><button type="button" onClick={()=>setShowRules(false)} aria-label="Close how to play"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button><p className="ax-xo-eyebrow">A quick breather</p><h2 id="ax-xo-rules-title">Three makes a win.</h2><ol><li>You’re always <strong>O</strong>. AX is always <strong>X</strong>. Choose who makes the opening move.</li><li>Tap an empty square. Get three of your marks in a row, column, or diagonal.</li><li>A win previews a 10% reward. A draw previews 5%. If AX wins, have another go.</li></ol><p>On a keyboard, use the arrow keys to move across the board, then Enter or Space to play. Sound is optional.</p><p className="demo">This is a playable design preview. Reward codes cannot be used at checkout. No account, purchase, or personal details needed.</p></section></div>}
   {toast&&<div className="ax-xo-toast" role="status" aria-live="polite">{toast}</div>}
  </section></div>}
 </>;
}
