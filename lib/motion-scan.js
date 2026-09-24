export function requestMotionScan(root=null){
 if(typeof window==='undefined') return;
 requestAnimationFrame(()=>{
  window.dispatchEvent(new CustomEvent('ax:motion-scan',{detail:{root}}));
 });
}
