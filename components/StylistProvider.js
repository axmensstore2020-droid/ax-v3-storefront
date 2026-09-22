'use client';
import dynamic from 'next/dynamic';
import { createContext, useContext, useState } from 'react';
const Panel = dynamic(() => import('./StylistPanel'), { ssr:false });
const Context = createContext(null);
export function StylistProvider({ children }) {
 const [request,setRequest] = useState(null);
 return <Context.Provider value={{openStylist:(mode='style',product=null) => setRequest({mode,product}),stylistOpen:Boolean(request)}}>{children}{request && <Panel request={request} onClose={() => setRequest(null)}/>}</Context.Provider>;
}
export const useStylist = () => useContext(Context);
export function StylistButton({ children,className='',mode='style',product=null }) {
 const {openStylist} = useStylist(); return <button className={className} onClick={() => openStylist(mode,product)}>{children}</button>;
}
