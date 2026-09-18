'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {productMarketingData} from '../lib/marketing';
import {trackMarketingEvent} from './MetaMarketing';
const Context=createContext(null), CART_ID='ax_shopify_cart_id', DEMO_LINES='ax_demo_bag_v2';
function read(key){try{return localStorage.getItem(key);}catch{return null;}}
function write(key,value){try{value===null?localStorage.removeItem(key):localStorage.setItem(key,value);}catch{}}
async function requestCart(body){
 const response=await fetch('/api/cart',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}), data=await response.json();
 if(!data.ok){const error=new Error(data.error || 'We couldn’t update your bag. Please try again.');error.code=data.code;throw error;}
 return data.cart;
}
export function CartProvider({children,demo=false,freeShippingThreshold=0}) {
 const [cart,setCart]=useState(null),[demoLines,setDemoLines]=useState([]),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const locked=useRef(false),currentCartId=useRef(null),demoRef=useRef([]);
 useEffect(() => {
  let active=true;
  if(demo){try{const lines=JSON.parse(read(DEMO_LINES)||'[]');if(Array.isArray(lines)){demoRef.current=lines.filter(line => line.product?.handle && Number.isInteger(line.quantity) && line.quantity>0 && line.quantity<=99);setDemoLines(demoRef.current);}}catch{}return;}
  const id=read(CART_ID);currentCartId.current=id;if(!id)return;
  locked.current=true;setBusy(true);
  requestCart({action:'get',cartId:id}).then(value => {if(active)setCart(value);}).catch(error => {if(error.code==='CART_NOT_FOUND'){write(CART_ID,null);currentCartId.current=null;}else if(active)setNotice('Your bag could not be loaded. Please try again.');}).finally(() => {if(active){locked.current=false;setBusy(false);}});
  return () => {active=false;};
 },[demo]);
 function saveDemo(lines){demoRef.current=lines;setDemoLines(lines);write(DEMO_LINES,JSON.stringify(lines));}
 function saveCart(value){setCart(value);currentCartId.current=value.id;write(CART_ID,value.id);}
 async function addItem({merchandiseId,variant,product}){
  if(locked.current)return;locked.current=true;setBusy(true);setNotice('');
  try{
   if(demo && product.demo){
    const lines=demoRef.current,key=merchandiseId||product.handle,found=lines.find(line => line.key===key);
    saveDemo(found?lines.map(line => line.key===key?{...line,quantity:Math.min(99,line.quantity+1)}:line):[...lines,{key,product,variant,quantity:1}]);
   }else{
    if(!merchandiseId || product.demo)throw new Error('Please select an available option.');
    const cartId=currentCartId.current;
    try{saveCart(await requestCart({action:cartId?'add':'create',cartId,merchandiseId,quantity:1}));}
    catch(error){if(error.code==='CART_NOT_FOUND')saveCart(await requestCart({action:'create',merchandiseId,quantity:1}));else throw error;}
    trackMarketingEvent('AddToCart',productMarketingData(product,variant,1));
   }
   setOpen(true);
  }catch(error){setNotice(error.message);setOpen(true);}finally{locked.current=false;setBusy(false);}
 }
 async function addItems(items=[]){
  if(locked.current || !Array.isArray(items) || !items.length)return;
  const safe=items.filter(item=>item?.merchandiseId && item?.variant && item?.product).slice(0,10);
  if(!safe.length)return;
  locked.current=true;setBusy(true);setNotice('');
  try{
   if(demo){
    let lines=[...demoRef.current];
    for(const item of safe){
      const key=item.merchandiseId||item.product.handle,found=lines.find(line=>line.key===key);
      lines=found?lines.map(line=>line.key===key?{...line,quantity:Math.min(99,line.quantity+1)}:line):[...lines,{key,product:item.product,variant:item.variant,quantity:1}];
    }
    saveDemo(lines);
   }else{
    const cartId=currentCartId.current,lines=safe.map(item=>({merchandiseId:item.merchandiseId,quantity:1}));
    try{saveCart(await requestCart({action:cartId?'addMany':'createMany',cartId,lines}));}
    catch(error){if(error.code==='CART_NOT_FOUND')saveCart(await requestCart({action:'createMany',lines}));else throw error;}
    for(const item of safe) trackMarketingEvent('AddToCart',productMarketingData(item.product,item.variant,1));
   }
   setOpen(true);
  }catch(error){setNotice(error.message);setOpen(true);}finally{locked.current=false;setBusy(false);}
 }
 async function updateItem(id,quantity){
  if(locked.current)return;locked.current=true;setBusy(true);setNotice('');
  try{if(demo)saveDemo(demoRef.current.map(line => line.key===id?{...line,quantity}:line).filter(line => line.quantity>0));else saveCart(await requestCart({action:quantity===0?'remove':'update',cartId:currentCartId.current,lineId:id,quantity}));}
  catch(error){setNotice(error.message);}finally{locked.current=false;setBusy(false);}
 }
 const count=demo?demoLines.reduce((sum,line)=>sum+line.quantity,0):(cart?.totalQuantity||0);
 return <Context.Provider value={{cart,demoLines,demo,count,open,setOpen,busy,notice,addItem,addItems,updateItem,freeShippingThreshold}}>{children}</Context.Provider>;
}
export const useCart=()=>useContext(Context);
