'use client';
import {useEffect,useMemo,useState} from 'react';
import Icon from './Icon';

const TEASER_KEY='ax:playroom-teaser:v1';
const DISMISSED_KEY='ax:playroom-dismissed:v1';
const WINS=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function winner(board){
 for(const [a,b,c] of WINS) if(board[a] && board[a]===board[b] && board[a]===board[c]) return {mark:board[a],line:[a,b,c]};
 return board.every(Boolean)?{mark:'draw',line:[]}:null;
}

function bestMove(board){
 const result=winner(board);
 if(result) return {score:result.mark==='X'?1:result.mark==='O'?-1:0};
 let best={score:-Infinity,index:-1};
 for(let index=0;index<board.length;index++){
  if(board[index]) continue;
  const next=[...board];
  next[index]='X';
  const reply=worstMove(next);
  if(reply.score>best.score) best={score:reply.score,index};
 }
 return best.index>=0?best:{score:0,index:board.findIndex(cell=>!cell)};
}

function worstMove(board){
 const result=winner(board);
 if(result) return {score:result.mark==='X'?1:result.mark==='O'?-1:0};
 let worst={score:Infinity,index:-1};
 for(let index=0;index<board.length;index++){
  if(board[index]) continue;
  const next=[...board];
  next[index]='O';
  const reply=bestMove(next);
  if(reply.score<worst.score) worst={score:reply.score,index};
 }
 return worst.index>=0?worst:{score:0,index:board.findIndex(cell=>!cell)};
}

function openingMove(board){
 if(!board[4]) return 4;
 return [0,2,6,8,1,3,5,7].find(index=>!board[index]) ?? -1;
}

export default function AXPlayroom(){
 const [visible,setVisible]=useState(false);
 const [open,setOpen]=useState(false);
 const [started,setStarted]=useState(false);
 const [board,setBoard]=useState(Array(9).fill(''));
 const [turn,setTurn]=useState('O');
 const [line,setLine]=useState([]);
 const [status,setStatus]=useState('Choose who makes the first move.');
 const [thinking,setThinking]=useState(false);

 const result=useMemo(()=>winner(board),[board]);

 useEffect(()=>{
  if(typeof window==='undefined') return;
  const eligible=/^\/($|products|collections)/.test(window.location.pathname);
  const direct=new URLSearchParams(window.location.search).get('play')==='1';
  if(direct){
   setVisible(true);
   setOpen(true);
   return;
  }
  if(!eligible || window.sessionStorage.getItem(DISMISSED_KEY)) return;
  const delay=window.sessionStorage.getItem(TEASER_KEY)?2400:8500;
  const timer=window.setTimeout(()=>{
   setVisible(true);
   window.sessionStorage.setItem(TEASER_KEY,'1');
  },delay);
  return()=>window.clearTimeout(timer);
 },[]);

 useEffect(()=>{
  if(!started || result) return;
  if(turn!=='X') return;
  setThinking(true);
  const timer=window.setTimeout(()=>{
   setBoard(current=>{
    if(winner(current)) return current;
    const index=bestMove(current).index;
    if(index<0) return current;
    const next=[...current];
    next[index]='X';
    return next;
   });
   setThinking(false);
   setTurn('O');
  },520);
  return()=>window.clearTimeout(timer);
 },[turn,started,result]);

 useEffect(()=>{
  if(!result){
   if(started) setStatus(turn==='O'?'Your move. You are O.':'AX is choosing a square.');
   return;
  }
  setLine(result.line);
  if(result.mark==='O') setStatus('You won this round.');
  else if(result.mark==='X') setStatus('AX takes this one.');
  else setStatus('Draw. Clean defence.');
 },[result,started,turn]);

 function closeAll(){
  setOpen(false);
  setVisible(false);
  try { window.sessionStorage.setItem(DISMISSED_KEY,'1'); } catch {}
 }

 function openGame(){
  setVisible(true);
  setOpen(true);
 }

 function start(first){
  const next=Array(9).fill('');
  if(first==='AX'){
   next[openingMove(next)]='X';
   setTurn('O');
   setStatus('AX opened with X. Your move.');
  } else {
   setTurn('O');
   setStatus('Your move. You are O.');
  }
  setBoard(next);
  setLine([]);
  setStarted(true);
 }

 function reset(){
  setBoard(Array(9).fill(''));
  setLine([]);
  setStarted(false);
  setTurn('O');
  setStatus('Choose who makes the first move.');
 }

 function play(index){
  if(!started || turn!=='O' || thinking || board[index] || result) return;
  const next=[...board];
  next[index]='O';
  setBoard(next);
  if(!winner(next)) setTurn('X');
 }

 return <>
  {visible && !open && <div className="ax-play-teaser" role="region" aria-label="AX XO game">
   <button type="button" className="ax-play-card" onClick={openGame}>
    <span className="ax-play-mark">XO</span>
    <span><strong>Play AX XO</strong><small>Take a 30 second style break</small></span>
    <Icon name="arrow" size={15}/>
   </button>
   <button type="button" className="ax-play-dismiss" aria-label="Dismiss AX XO" onClick={closeAll}>x</button>
  </div>}
  {open && <div className="ax-play-backdrop" role="presentation">
   <section className="ax-play-modal" role="dialog" aria-modal="true" aria-labelledby="ax-play-title">
    <button type="button" className="ax-play-close" aria-label="Close AX XO" onClick={closeAll}>x</button>
    <div className="ax-play-copy">
     <p className="eyebrow">AX Playroom</p>
     <h2 id="ax-play-title">Your move.</h2>
     <p>You are O. AX is X. Choose who goes first, then try to hold the board.</p>
    </div>
    <div className="ax-play-shell">
     <div className="ax-play-status" role="status">{status}</div>
     {!started && <div className="ax-play-choices">
      <button type="button" onClick={()=>start('YOU')}><span>O</span><strong>I will go first</strong><small>Start with the opening move.</small></button>
      <button type="button" onClick={()=>start('AX')}><span>X</span><strong>Let AX be first</strong><small>Respond after AX opens.</small></button>
     </div>}
     <div className={`ax-play-board${thinking?' thinking':''}`} aria-label="Tic tac toe board">
      {board.map((cell,index)=><button
       type="button"
       key={index}
       className={`ax-play-cell ${cell ? `is-${cell.toLowerCase()}` : ''} ${line.includes(index)?'is-win':''}`}
       aria-label={`Square ${index+1}${cell?`, ${cell}`:', empty'}`}
       onClick={()=>play(index)}
       disabled={!started || turn!=='O' || thinking || Boolean(cell) || Boolean(result)}
      >{cell}</button>)}
     </div>
     <div className="ax-play-actions">
      <button type="button" onClick={reset}>New round</button>
      <a href="/products" onClick={()=>setOpen(false)}>Explore collection <Icon name="arrow" size={14}/></a>
     </div>
    </div>
   </section>
  </div>}
 </>;
}
