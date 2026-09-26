'use client';

const LAUNCH_EVENTS=new Set([
  'launch_visit',
  'launch_playroom_open',
  'launch_game_start',
  'launch_round_complete',
  'launch_match_complete',
  'launch_match_win',
  'launch_reward_issued',
  'launch_calendar_click'
]);

export function trackLaunchEvent(eventName,{metadata={},onceKey=''}={}){
  if(typeof window==='undefined'||!LAUNCH_EVENTS.has(eventName))return;
  if(onceKey){
    const key='ax_launch_event:'+eventName+':'+String(onceKey).slice(0,120);
    try{
      if(window.sessionStorage.getItem(key))return;
      window.sessionStorage.setItem(key,'1');
    }catch{}
  }
  const cleanMetadata=metadata&&typeof metadata==='object'&&!Array.isArray(metadata)?metadata:{};
  fetch('/api/launch/events',{
    method:'POST',
    credentials:'same-origin',
    keepalive:true,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({eventName,metadata:cleanMetadata})
  }).catch(()=>{});
}
