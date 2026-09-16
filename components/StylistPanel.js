'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import Dialog from './Dialog';
import Icon from './Icon';
import ProductImage from './ProductImage';
import {useNavigation} from './NavigationProvider';
import {formatMoney} from '../lib/catalog';
import {CONSENT_VERSION,normalizeProfile} from '../lib/stylist/validation';
import './stylist.css';

const blankProfile = {unit:'cm',chest:'',waist:'',hip:'',height:'',inseam:'',fit:'regular',styles:'',colors:'',avoid:'',usualSize:''};
async function prepareImage(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8000000) throw new Error('Choose a JPEG, PNG or WebP photo under 8 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1,Math.round(bitmap.width*ratio)); canvas.height = Math.max(1,Math.round(bitmap.height*ratio));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f7f7f4'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    // Re-encode to remove EXIF/location metadata. Photo is held only in memory.
    const data = canvas.toDataURL('image/jpeg',0.8);
    if (data.length > 2000000) throw new Error('Please choose a smaller photo.');
    return data;
  } finally { bitmap.close(); }
}

export default function StylistPanel({request,onClose}) {
  const {styles} = useNavigation();
  const [status,setStatus] = useState(null), [tab,setTab] = useState(request.mode === 'size' || request.mode === 'profile' ? 'fit' : 'chat');
  const [profile,setProfile] = useState(blankProfile), [saveConsent,setSaveConsent] = useState(false), [consent,setConsent] = useState(false);
  const [messages,setMessages] = useState([]), [draft,setDraft] = useState(''), [conversation,setConversation] = useState('');
  const [photo,setPhoto] = useState(''), [busy,setBusy] = useState(false), [profileBusy,setProfileBusy] = useState(false), [photoBusy,setPhotoBusy] = useState(false);
  const [error,setError] = useState(''), [profileNotice,setProfileNotice] = useState('');
  const abort = useRef(null), transcript = useRef(null), sending = useRef(false), mounted = useRef(true);
  const quickActions = [
    {label:'White shirts',icon:'search',message:'Show me white shirts.'},
    {label:'Raw denim',icon:'explore',message:'Show me raw denim.'},
    {label:'Check my fit',icon:'profile',fit:true},
    {label:request.product ? 'Match with this' : 'Style a look',icon:'wide',message:request.product ? 'What would match with this piece?' : 'Help me style a complete look.'}
  ];
  useEffect(() => {
    const controller = new AbortController(); mounted.current = true;
    fetch('/api/stylist',{signal:controller.signal,cache:'no-store'}).then(r => r.json()).then(setStatus).catch(() => {if (!controller.signal.aborted) setStatus({available:false});});
    fetch('/api/stylist/profile',{signal:controller.signal,cache:'no-store'}).then(r => r.json()).then(data => {
      if (data.profile) {setProfile({...blankProfile,...data.profile});setProfileNotice('Your saved profile is loaded for this browser.');}
      else if (data.error) setProfileNotice(data.error);
    }).catch(() => {});
    return () => {mounted.current = false;controller.abort();abort.current?.abort();};
  },[]);
  useEffect(() => {transcript.current?.scrollTo({top:transcript.current.scrollHeight,behavior:'instant'});},[messages,busy]);
  function changeProfile(key,value) {setProfile(current => ({...current,[key]:value}));setProfileNotice('Changes are not saved yet.');}
  function changeUnit(value) {
    const factor = value === 'inches' ? 1/2.54 : 2.54;
    setProfile(current => ({...current,unit:value,...Object.fromEntries(['chest','waist','hip','height','inseam'].map(key => [key,current[key] === '' || current[key] == null ? '' : String(Math.round(Number(current[key])*factor*100)/100)]))}));
    setProfileNotice('Measurements converted. Check them before saving.');
  }
  function resetChat() {abort.current?.abort();sending.current=false;setBusy(false);setMessages([]);setConversation('');setPhoto('');setDraft('');setError('');}
  function useQuickAction(action) {
    if (action.fit) {setTab('fit');return;}
    setDraft(action.message);
    requestAnimationFrame(()=>document.getElementById('ax-message')?.focus());
  }
  async function send(event) {
    event.preventDefault();
    if (sending.current || !consent || !draft.trim() || !status?.available) return;
    let normalized;
    try {normalized=normalizeProfile(profile);} catch(e) {setError(e.message);setTab('fit');return;}
    const message = draft.trim(), image = photo;
    const controller = new AbortController();abort.current=controller;sending.current=true;setBusy(true);setError('');
    try {
      const response = await fetch('/api/stylist',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({message,image,conversation,consent:true,profile:normalized,productHandle:request.product?.handle || '',selectedOptions:request.product?.selectedOptions || {}})});
      const result = await response.json();
      if (!response.ok || !result.ok) {if (result.code === 'CHAT_EXPIRED') {setConversation('');setMessages([]);}throw new Error(result.error || 'Please try again.');}
      if (controller.signal.aborted) return;
      setMessages(current => [...current,{role:'user',message,...(image ? {photo:true} : {})},{role:'assistant',...result}]);
      setConversation(result.conversation);setDraft('');setPhoto('');
    } catch(e) {if (!controller.signal.aborted) setError(e.message || 'Could not reach AX. Please try again.');}
    finally {if (abort.current === controller && mounted.current) {sending.current=false;setBusy(false);}}
  }
  async function saveProfile() {
    if (!saveConsent || profileBusy) return;
    setProfileBusy(true);setProfileNotice('');
    try {
      const response = await fetch('/api/stylist/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:normalizeProfile(profile),consent:true,consentVersion:CONSENT_VERSION})});
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setProfileNotice('Saved for 30 days, accessible from this browser.');
    } catch(e) {setProfileNotice(e.message || 'Your profile was not saved.');} finally {setProfileBusy(false);}
  }
  async function forgetProfile() {
    if (profileBusy) return;
    setProfileBusy(true);
    try {
      const response = await fetch('/api/stylist/profile',{method:'DELETE',headers:{'Content-Type':'application/json'}});
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setProfile(blankProfile);setSaveConsent(false);resetChat();setProfileNotice('Saved profile deleted. This chat and its measurements have been cleared.');
    } catch(e) {setProfileNotice(e.message || 'Could not delete the profile. Please contact AX.');} finally {setProfileBusy(false);}
  }
  async function selectPhoto(event) {
    const file=event.target.files?.[0];event.target.value='';if (!file) return;
    setPhotoBusy(true);setError('');
    try {const data=await prepareImage(file);if(mounted.current)setPhoto(data);} catch(e) {setError(e.message);} finally {if(mounted.current)setPhotoBusy(false);}
  }
  return <Dialog title="AX Stylist" className="stylist-dialog ax-chat-dialog" onClose={onClose}>
    {request.product && <p className="ax-chat-context">{request.product.title ? `Styling: ${request.product.title}${request.product.selectedOptions?.Size ? ` · ${request.product.selectedOptions.Size}` : ''}` : 'Styling this piece'}</p>}
    <div className="ax-chat-tabs" role="tablist" aria-label="Stylist view">
      {['chat','fit'].map(value => <button key={value} role="tab" tabIndex={tab===value?0:-1} aria-selected={tab === value} aria-controls={'ax-panel-'+value} id={'ax-tab-'+value} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'chat':event.key==='End'?'fit':tab==='chat'?'fit':'chat';setTab(next);document.getElementById('ax-tab-'+next)?.focus();}}} onClick={()=>setTab(value)}>{value === 'chat' ? 'Ask AX' : 'My fit & style'}</button>)}
      {messages.length > 0 && <button className="ax-clear-chat" onClick={resetChat}>Clear chat</button>}
    </div>
    <div className="ax-chat-body" id={'ax-panel-'+tab} role="tabpanel" aria-labelledby={'ax-tab-'+tab}>
      {tab === 'fit' ? <div className="ax-fit-form">
        <p>Optional body measurements—not flat garment widths. Use a tape around your chest, waist and hips without pulling tight. A photo cannot tell us your measurements.</p>
        <label>Measurement unit<select value={profile.unit} onChange={e=>changeUnit(e.target.value)}><option value="cm">Centimetres (cm)</option><option value="inches">Inches</option></select></label>
        <div className="ax-fit-grid">{['chest','waist','hip','height','inseam'].map(key => <label key={key}>{key === 'hip' ? 'Hips' : key.charAt(0).toUpperCase()+key.slice(1)} ({profile.unit})<input type="number" inputMode="decimal" min="0" step="0.01" value={profile[key] ?? ''} onChange={e=>changeProfile(key,e.target.value)}/></label>)}</div>
        <label>Preferred fit<select value={profile.fit} onChange={e=>changeProfile('fit',e.target.value)}><option value="regular">Regular</option><option value="relaxed">Relaxed</option><option value="oversized">Oversized</option></select></label>
        <label>Usual size (optional)<input value={profile.usualSize} maxLength={40} onChange={e=>changeProfile('usualSize',e.target.value)} placeholder="Tops M, trousers 32…"/></label>
        <label>Styles you like<input value={profile.styles} maxLength={180} onChange={e=>changeProfile('styles',e.target.value)} placeholder="Minimal, Korean fits, streetwear…"/></label>
        <label>Colours you like<input value={profile.colors} maxLength={180} onChange={e=>changeProfile('colors',e.target.value)} placeholder="Black, sage, cream…"/></label>
        <label>Anything to avoid?<input value={profile.avoid} maxLength={180} onChange={e=>changeProfile('avoid',e.target.value)} placeholder="Large prints, tight sleeves…"/></label>
        <p className="ax-small">Relevant details are used when you ask about styling or fit. Saving is optional. Personal fit checks need AX’s approved size guide for that product.</p>
        <label className="ax-checkbox"><input type="checkbox" checked={saveConsent} onChange={e=>setSaveConsent(e.target.checked)}/><span>Save my measurements and preferences privately for 30 days, for this browser.</span></label>
        <div className="ax-profile-actions"><button onClick={saveProfile} disabled={!saveConsent || !status?.profiles || profileBusy}>Save profile</button><button onClick={forgetProfile} disabled={profileBusy}>Delete saved profile</button></div>
        <p role="status" className="ax-small">{profileNotice}</p>
        <button className="solid-button" onClick={()=>{setTab('chat');setDraft(request.product ? 'Check my fit for this piece and tell me how the cut will wear and what to pair it with.' : 'Help me find a piece that suits my fit and style.');}}>USE THESE DETAILS <Icon name="arrow"/></button>
      </div> : <>
        <div className="ax-transcript" ref={transcript} role="log" aria-label="Stylist conversation" aria-live="polite" aria-relevant="additions">
          {!messages.length && status?.available && <div className="ax-quick-actions" aria-label="Quick asks">{quickActions.map(action=><button type="button" key={action.label} onClick={()=>useQuickAction(action)}><span className="ax-quick-icon"><Icon name={action.icon} size={17}/></span><span>{action.label}</span></button>)}</div>}
          {status === null && <p className="ax-status-line" role="status">Checking availability…</p>}
          {status && !status.available && <div className="ax-chat-notice"><p>AX Stylist is temporarily unavailable.</p><div className="style-links">{styles.slice(0,3).map(style=><Link key={style.key} href={style.href} onClick={onClose}>{style.label}<Icon name="arrow" size={15}/></Link>)}</div></div>}
          {messages.map((item,i)=><article className={'ax-message ax-message-'+item.role} key={i}><span className="ax-message-role">{item.role === 'user' ? 'YOU' : 'AX'}</span><p>{item.message}</p>{item.photo && <p className="ax-small">Photo used for this reply; not saved in the chat.</p>}
            {item.fits?.filter(fit=>fit.status === 'needs_data').map(fit=><button className="ax-fit-action" type="button" key={fit.handle} onClick={()=>setTab('fit')}><Icon name="profile" size={15}/><span>Add fit details</span><Icon name="arrow" size={14}/></button>)}
            {item.products?.length > 0 && <div className="ax-chat-products">{item.products.map(product=><Link href={product.href} onClick={onClose} className="ax-chat-product" key={product.handle}><ProductImage src={product.image} alt={product.title} sizes="80px"/><div><span>{product.title}</span>{product.price && <strong>{!product.variantId && 'From '}{formatMoney(Number(product.price.amount),product.price.currencyCode)}</strong>}<small>{product.requiresSize ? 'Choose size' : 'View product'} →</small></div></Link>)}</div>}
            {item.links?.map(link=><Link className="ax-source-link" key={link.href} href={link.href} onClick={onClose}>{link.label} →</Link>)}
          </article>)}
          {busy && <p className="ax-working" role="status">AX is checking…</p>}
        </div>
        <form id="ax-chat-form" className="ax-composer" onSubmit={send}>
          {photo && <div className="ax-photo-preview"><img src={photo} width="52" height="52" alt="Your selected clothing photo"/><span>Photo ready</span><button type="button" onClick={()=>setPhoto('')} aria-label="Remove photo"><Icon name="close" size={18}/></button></div>}
          {status?.images && <label className="ax-photo-button"><Icon name="wide" size={14}/>{photoBusy ? 'Preparing photo…' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={busy || photoBusy}/></label>}
          <label className="sr-only" htmlFor="ax-message">Message AX Stylist</label><div className="ax-message-input"><textarea id="ax-message" rows={1} maxLength={1200} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={request.product ? 'Ask about this piece…' : 'Ask AX…'} disabled={busy}/><button type="submit" aria-label="Send to AX Stylist" disabled={busy || photoBusy || !consent || !status?.available || !draft.trim()}><Icon name="arrow"/></button></div>
          <label className="ax-checkbox"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Send this chat and optional fit/photo details to OpenAI for styling.</span></label>
          <p className="ax-small">Fit suggestions are estimates based on AX product data and any measurements you provide; actual fit can vary by cut and preference.</p>
        </form>
      </>}
      {error && <div className="ax-chat-error" role="alert"><p>{error}</p>{tab==='chat' && <button type="submit" form="ax-chat-form" disabled={busy || !consent || !status?.available || !draft.trim()}>Try again</button>}</div>}
    </div>
    <div className="ax-chat-footer"><Link href="/ax-stylist" onClick={onClose}>Privacy & info</Link></div>
  </Dialog>;
}