'use client';
import { useEffect, useRef } from 'react';
import Icon from './Icon';
export default function Dialog({ title, onClose, children, className = '' }) {
 const ref = useRef(null);
 useEffect(() => { const dialog = ref.current; const overflow = document.body.style.overflow; dialog.showModal(); document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = overflow; dialog.close(); }; }, []);
 return <dialog ref={ref} className={`dialog ${className}`} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="dialog-inner"><div className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label={`Close ${title}`} onClick={onClose}><Icon name="close"/></button></div>{children}</div></dialog>;
}
