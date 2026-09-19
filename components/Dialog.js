'use client';
import { useEffect, useRef } from 'react';
import {animate} from 'motion';
import Icon from './Icon';
import {AX_MOTION} from '../lib/motion';

function dialogPreset(dialog){
 const drawer=dialog.classList.contains('side-dialog')||dialog.classList.contains('cart-dialog');
 if(drawer) return {
  opacity:[.82,1],
  transform:['translate3d(14px,-2px,0px) scale(.997)','translate3d(0px,0px,0px) scale(1)'],
  transition:AX_MOTION.drawer
 };
 if(dialog.classList.contains('category-dialog')) return {
  opacity:[0,1],
  transform:['translate3d(-3px,-5px,0px) scale(1.004)','translate3d(0px,0px,0px) scale(1)'],
  transition:AX_MOTION.menu
 };
 return {
  opacity:[0,1],
  transform:['translate3d(2px,6px,0px) scale(1.006)','translate3d(0px,0px,0px) scale(1)'],
  transition:AX_MOTION.dialog
 };
}

export default function Dialog({ title, onClose, children, className = '', id }) {
 const ref = useRef(null);
 useEffect(() => {
  const dialog = ref.current;
  const overflow = document.body.style.overflow;
  dialog.showModal();
  document.body.style.overflow = 'hidden';

  let controls;
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   const preset=dialogPreset(dialog);
   controls=animate(dialog,{opacity:preset.opacity,transform:preset.transform},preset.transition);
  }

  return () => {
   controls?.stop?.();
   document.body.style.overflow = overflow;
   dialog.close();
  };
 }, []);

 return <dialog id={id} ref={ref} className={`dialog ${className}`} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="dialog-inner"><div className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label={`Close ${title}`} onClick={onClose}><Icon name="close"/></button></div>{children}</div></dialog>;
}
