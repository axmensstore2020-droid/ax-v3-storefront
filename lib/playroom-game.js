export const PLAYROOM_WINS=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

export function playroomOutcome(board){
  if(!Array.isArray(board)||board.length!==9)return null;
  for(const line of PLAYROOM_WINS){
    const [a,b,c]=line;
    if(board[a]&&board[a]===board[b]&&board[a]===board[c])return {winner:board[a],line};
  }
  return board.every(Boolean)?{winner:'draw',line:[]}:null;
}

export function playroomEmpty(board){return board.flatMap((value,index)=>value?[]:[index]);}

export function choosePlayroomMove(board,random=Math.random,{friendly=false}={}){
  if(playroomOutcome(board))return null;
  const free=playroomEmpty(board);
  if(!free.length)return null;
  const pick=list=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
  const winChance=friendly?.72:1;
  const blockChance=friendly?.68:.87;
  for(const mark of ['X','O']){
    const winning=free.filter(index=>{const next=board.slice();next[index]=mark;return playroomOutcome(next)?.winner===mark;});
    if(winning.length&&random()<(mark==='X'?winChance:blockChance))return pick(winning);
  }
  if(random()<(friendly?.29:.17))return pick(free);
  if(free.includes(4)&&(!friendly||random()<.78))return 4;
  const corners=free.filter(index=>[0,2,6,8].includes(index));
  return pick(corners.length?corners:free);
}

function seedNumber(value){
  let hash=2166136261;
  for(const char of String(value||'')){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return hash>>>0||0x6d2b79f5;
}

export function seededPlayroomRandom(seed){
  let state=seedNumber(seed);
  return ()=>{
    state=(state+0x6d2b79f5)>>>0;
    let value=state;
    value=Math.imul(value^(value>>>15),value|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return ((value^(value>>>14))>>>0)/4294967296;
  };
}

function replayState({first,moves,seed,friendly=false}={}){
  if(first!=='O'&&first!=='X')throw new Error('Invalid Playroom opening.');
  if(typeof seed!=='string'||seed.length<8||seed.length>128)throw new Error('Invalid Playroom seed.');
  if(!Array.isArray(moves)||moves.length>9)throw new Error('Invalid Playroom move history.');
  const board=Array(9).fill(''),random=seededPlayroomRandom(seed);
  let turn=first;
  for(let step=0;step<moves.length;step++){
    const index=moves[step];
    if(!Number.isInteger(index)||index<0||index>8||board[index])throw new Error('Invalid Playroom move history.');
    if(turn==='X'){
      const expected=choosePlayroomMove(board,random,{friendly});
      if(expected!==index)throw new Error('This Playroom round could not be verified.');
    }
    board[index]=turn;
    const result=playroomOutcome(board);
    if(result){
      if(step!==moves.length-1)throw new Error('Invalid Playroom move history.');
      return {board,result,turn:null,random};
    }
    turn=turn==='O'?'X':'O';
  }
  return {board,result:null,turn,random};
}

export function nextPlayroomAxMove(value){
  const state=replayState(value);
  if(state.result)throw new Error('This Playroom round is already complete.');
  if(state.turn!=='X')throw new Error('It is not AX’s turn.');
  const index=choosePlayroomMove(state.board,state.random,{friendly:Boolean(value?.friendly)});
  if(index==null)throw new Error('AX could not make a move.');
  return index;
}

export function replayPlayroomRound(value){
  const state=replayState(value);
  if(!state.result)throw new Error('This Playroom round is not complete.');
  return {board:state.board,result:state.result};
}
