'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import Dialog from './Dialog';
import Icon from './Icon';
import Brand from './Brand';
import ProductImage from './ProductImage';
import AXParticleLoader from './AXParticleLoader';
import {useNavigation} from './NavigationProvider';
import {formatMoney} from '../lib/catalog';
import {CONSENT_VERSION,normalizeProfile} from '../lib/stylist/validation';
import './stylist.css';

const blankProfile = {unit:'cm',chest:'',waist:'',hip:'',height:'',inseam:'',weight:'',fit:'regular',build:'',topFit:'',bottomFit:'',styles:'',colors:'',avoid:'',usualSize:''};
const precisionFields = [
  ['chest','Chest'],['waist','Waist'],['hip','Hips'],['inseam','Inseam']
];
const FIT_STEPS = ['Basics','Build','Tops','Bottoms','Style','Review'];
const STYLE_OPTIONS = ['Streetwear','Minimal','Y2K','Old money','Clean','Motorsport','Formal','Oversized'];
const COLOUR_OPTIONS = ['Black','White','Grey','Cream','Brown','Blue','Green','Red'];
const AVOID_OPTIONS = ['Large prints','Tight sleeves','Skinny fits','Loud colours','Cropped lengths'];
const TOP_SIZE_OPTIONS = ['XS','S','M','L','XL','XXL'];

function tokenList(value='') {
  return String(value).split(',').map(item=>item.trim()).filter(Boolean);
}
function FitFigure({type,value}) {
  const safe=value || (type==='build'?'average':type==='top'?'regular':'relaxed');
  return <div className={`ax-fit-figure ax-fit-figure-${type} is-${safe}`} aria-hidden="true">
    {type==='build' && <svg viewBox="0 0 120 150"><circle cx="60" cy="22" r="11"/><path d="M42 40C46 34 52 31 60 31s14 3 18 9l9 22-8 7-5-12v64H46V57l-5 12-8-7 9-22Z"/></svg>}
    {type==='top' && <svg viewBox="0 0 120 150"><path d="M42 28 29 35 17 56 31 65 38 54v67h44V54l7 11 14-9-12-21-13-7-8-5H50l-8 5Z"/></svg>}
    {type==='bottom' && <svg viewBox="0 0 120 150"><path d="M35 26h50l-4 95H64l-4-59-4 59H39L35 26Z"/><path d="M40 38h40" fill="none"/></svg>}
  </div>;
}
const needsCustomerFitData = fit => fit?.status === 'needs_data' && ((Array.isArray(fit.missing) && fit.missing.length > 0) || /(?:choose the unit|add your body)/i.test(fit.message || ''));
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
  const [profile,setProfile] = useState(blankProfile), [saveConsent,setSaveConsent] = useState(false), [consent,setConsent] = useState(false), [fitStep,setFitStep] = useState(0);
  const [messages,setMessages] = useState([]), [draft,setDraft] = useState(''), [conversation,setConversation] = useState('');
  const [photo,setPhoto] = useState(''), [busy,setBusy] = useState(false), [profileBusy,setProfileBusy] = useState(false), [photoBusy,setPhotoBusy] = useState(false);
  const [error,setError] = useState(''), [profileNotice,setProfileNotice] = useState('');
  const abort = useRef(null), transcript = useRef(null), latestReply = useRef(null), lastMessageCount = useRef(0), sending = useRef(false), mounted = useRef(true), fitFlow = useRef(null);
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
  useEffect(() => {
    const grew = messages.length > lastMessageCount.current;
    lastMessageCount.current = messages.length;
    if (!grew || messages.at(-1)?.role !== 'assistant') return;
    const frame = requestAnimationFrame(() => {
      if (!transcript.current || !latestReply.current) return;
      const viewport = transcript.current.getBoundingClientRect();
      const reply = latestReply.current.getBoundingClientRect();
      transcript.current.scrollTo({top:Math.max(0,transcript.current.scrollTop + reply.top - viewport.top),behavior:'instant'});
    });
    return () => cancelAnimationFrame(frame);
  },[messages]);
  useEffect(() => {
    if (tab !== 'fit') return;
    const frame = requestAnimationFrame(() => {
      fitFlow.current?.scrollTo?.({top:0,behavior:'instant'});
      fitFlow.current?.querySelector?.('.ax-fit-stage')?.scrollTo?.({top:0,behavior:'instant'});
    });
    return () => cancelAnimationFrame(frame);
  },[fitStep,tab]);
  function changeProfile(key,value) {setProfile(current => ({...current,[key]:value}));setProfileNotice('Changes are not saved yet.');}
  function changeUnit(value) {
    const lengthFactor = value === 'inches' ? 1/2.54 : 2.54;
    const weightFactor = value === 'inches' ? 2.2046226218 : 1/2.2046226218;
    setProfile(current => ({...current,unit:value,
      ...Object.fromEntries(['chest','waist','hip','height','inseam'].map(key => [key,current[key] === '' || current[key] == null ? '' : String(Math.round(Number(current[key])*lengthFactor*100)/100)])),
      weight:current.weight === '' || current.weight == null ? '' : String(Math.round(Number(current.weight)*weightFactor*100)/100)
    }));
    setProfileNotice('Measurements converted. Check them before saving.');
  }
  function togglePreference(key,label) {
    setProfile(current => {
      const values=tokenList(current[key]);
      const match=values.findIndex(item=>item.toLowerCase()===label.toLowerCase());
      const next=match>=0 ? values.filter((_,index)=>index!==match) : [...values,label];
      return {...current,[key]:next.join(', ')};
    });
    setProfileNotice('Changes are not saved yet.');
  }
  function resetChat() {abort.current?.abort();sending.current=false;setBusy(false);setMessages([]);setConversation('');setPhoto('');setDraft('');setError('');}
  function useQuickAction(action) {
    if (action.fit) {setFitStep(0);setTab('fit');return;}
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
      {tab === 'fit' ? <div ref={fitFlow} className="ax-fit-form ax-fit-experience">
        <div className="ax-fit-progress" aria-label={`Fit profile step ${fitStep+1} of ${FIT_STEPS.length}`}>
          <span>{String(fitStep+1).padStart(2,'0')}</span>
          <div>{FIT_STEPS.map((label,index)=><i key={label} className={index<=fitStep?'active':''}/>)}</div>
          <span>{String(FIT_STEPS.length).padStart(2,'0')}</span>
        </div>

        {fitStep===0 && <section className="ax-fit-stage" aria-labelledby="ax-fit-basics-title">
          <p className="ax-fit-kicker">MY FIT &amp; STYLE</p>
          <h3 id="ax-fit-basics-title">Start with the basics.</h3>
          <p>Move the dials only if you want to add height or weight. You can skip anything and refine it later.</p>
          <div className="ax-unit-toggle" role="group" aria-label="Measurement unit">
            <button type="button" aria-pressed={profile.unit==='cm'} onClick={()=>changeUnit('cm')}>CM / KG</button>
            <button type="button" aria-pressed={profile.unit==='inches'} onClick={()=>changeUnit('inches')}>IN / LB</button>
          </div>
          <div className="ax-fit-metric-grid">
            <div className={`ax-fit-metric ${profile.height?'is-set':''}`}>
              <div><span>Height</span><strong>{profile.height ? `${profile.height} ${profile.unit==='cm'?'cm':'in'}` : 'Optional'}</strong></div>
              <input type="range" min={profile.unit==='cm'?120:47} max={profile.unit==='cm'?220:87} step="1" value={profile.height || (profile.unit==='cm'?170:67)} onChange={e=>changeProfile('height',e.target.value)} aria-label="Height"/>
              <div className="ax-range-labels"><span>{profile.unit==='cm'?'120':'47'}</span><span>{profile.height?'Drag to adjust':'Move to add'}</span><span>{profile.unit==='cm'?'220':'87'}</span></div>
              {profile.height && <button type="button" className="ax-fit-clear" onClick={()=>changeProfile('height','')}>Clear</button>}
            </div>
            <div className={`ax-fit-metric ${profile.weight?'is-set':''}`}>
              <div><span>Weight</span><strong>{profile.weight ? `${profile.weight} ${profile.unit==='cm'?'kg':'lb'}` : 'Optional'}</strong></div>
              <input type="range" min={profile.unit==='cm'?30:66} max={profile.unit==='cm'?200:441} step="1" value={profile.weight || (profile.unit==='cm'?70:154)} onChange={e=>changeProfile('weight',e.target.value)} aria-label="Weight"/>
              <div className="ax-range-labels"><span>{profile.unit==='cm'?'30':'66'}</span><span>{profile.weight?'Drag to adjust':'Move to add'}</span><span>{profile.unit==='cm'?'200':'441'}</span></div>
              {profile.weight && <button type="button" className="ax-fit-clear" onClick={()=>changeProfile('weight','')}>Clear</button>}
            </div>
          </div>
          <div className="ax-fit-subchoice">
            <span>Usual top size <small>optional</small></span>
            <div className="ax-size-pills">{TOP_SIZE_OPTIONS.map(size=><button type="button" key={size} aria-pressed={profile.usualSize===size} onClick={()=>changeProfile('usualSize',profile.usualSize===size?'':size)}>{size}</button>)}</div>
          </div>
        </section>}

        {fitStep===1 && <section className="ax-fit-stage" aria-labelledby="ax-fit-build-title">
          <p className="ax-fit-kicker">BUILD</p>
          <h3 id="ax-fit-build-title">Which shape feels closest?</h3>
          <p>This is preference context, not a body scan. Choose the closest match or skip it.</p>
          <div className="ax-fit-visual-card"><FitFigure type="build" value={profile.build}/><span>{profile.build ? ({narrow:'Narrow',average:'Average',broad:'Broader'}[profile.build]) : 'Choose your closest match'}</span></div>
          <div className="ax-fit-segments" role="group" aria-label="Build preference">
            {[['narrow','Narrow'],['average','Average'],['broad','Broader']].map(([value,label])=><button type="button" key={value} aria-pressed={profile.build===value} onClick={()=>changeProfile('build',profile.build===value?'':value)}>{label}</button>)}
          </div>
        </section>}

        {fitStep===2 && <section className="ax-fit-stage" aria-labelledby="ax-fit-top-title">
          <p className="ax-fit-kicker">TOPS</p>
          <h3 id="ax-fit-top-title">How should your tops sit?</h3>
          <p>The silhouette changes with your choice so you can feel the difference before saving it.</p>
          <div className="ax-fit-visual-card"><FitFigure type="top" value={profile.topFit}/><span>{profile.topFit ? profile.topFit : 'Choose a top fit'}</span></div>
          <div className="ax-fit-segments ax-fit-segments-four" role="group" aria-label="Top fit preference">
            {[['close','Close'],['regular','Regular'],['relaxed','Relaxed'],['oversized','Oversized']].map(([value,label])=><button type="button" key={value} aria-pressed={profile.topFit===value} onClick={()=>{changeProfile('topFit',profile.topFit===value?'':value); if(profile.topFit!==value) changeProfile('fit',value==='close'?'regular':value);}}>{label}</button>)}
          </div>
        </section>}

        {fitStep===3 && <section className="ax-fit-stage" aria-labelledby="ax-fit-bottom-title">
          <p className="ax-fit-kicker">BOTTOMS</p>
          <h3 id="ax-fit-bottom-title">And your trousers?</h3>
          <p>Pick the silhouette you naturally reach for. AX can use it when ranking jeans, cargos and trousers.</p>
          <div className="ax-fit-visual-card"><FitFigure type="bottom" value={profile.bottomFit}/><span>{profile.bottomFit ? profile.bottomFit : 'Choose a bottom fit'}</span></div>
          <div className="ax-fit-segments" role="group" aria-label="Bottom fit preference">
            {[['straight','Straight'],['relaxed','Relaxed'],['baggy','Baggy']].map(([value,label])=><button type="button" key={value} aria-pressed={profile.bottomFit===value} onClick={()=>changeProfile('bottomFit',profile.bottomFit===value?'':value)}>{label}</button>)}
          </div>
        </section>}

        {fitStep===4 && <section className="ax-fit-stage" aria-labelledby="ax-fit-style-title">
          <p className="ax-fit-kicker">STYLE DNA</p>
          <h3 id="ax-fit-style-title">What feels like you?</h3>
          <p>Tap as many as you want. These become soft preferences, not hard filters.</p>
          <div className="ax-fit-choice-block">
            <span>Style direction</span>
            <div className="ax-fit-chip-grid">{STYLE_OPTIONS.map(label=><button type="button" key={label} aria-pressed={tokenList(profile.styles).some(item=>item.toLowerCase()===label.toLowerCase())} onClick={()=>togglePreference('styles',label)}>{label}</button>)}</div>
          </div>
          <div className="ax-fit-choice-block">
            <span>Colours you reach for</span>
            <div className="ax-colour-picks">{COLOUR_OPTIONS.map(label=><button type="button" key={label} aria-pressed={tokenList(profile.colors).some(item=>item.toLowerCase()===label.toLowerCase())} onClick={()=>togglePreference('colors',label)}><i className={'tone-'+label.toLowerCase()}/><span>{label}</span></button>)}</div>
          </div>
          <div className="ax-fit-choice-block">
            <span>Usually avoid</span>
            <div className="ax-fit-chip-grid compact">{AVOID_OPTIONS.map(label=><button type="button" key={label} aria-pressed={tokenList(profile.avoid).some(item=>item.toLowerCase()===label.toLowerCase())} onClick={()=>togglePreference('avoid',label)}>{label}</button>)}</div>
          </div>
        </section>}

        {fitStep===5 && <section className="ax-fit-stage ax-fit-review" aria-labelledby="ax-fit-review-title">
          <p className="ax-fit-kicker">YOUR AX PROFILE</p>
          <h3 id="ax-fit-review-title">This is how AX will read your fit.</h3>
          <p>You can use this now. Add exact body measurements only when you want a more accurate product size check.</p>
          <div className="ax-fit-summary">
            <div><span>Build</span><strong>{profile.build || 'Not set'}</strong></div>
            <div><span>Tops</span><strong>{profile.topFit || 'Not set'}</strong></div>
            <div><span>Bottoms</span><strong>{profile.bottomFit || 'Not set'}</strong></div>
            <div><span>Usual size</span><strong>{profile.usualSize || 'Not set'}</strong></div>
            <div><span>Style</span><strong>{profile.styles || 'Open'}</strong></div>
            <div><span>Colours</span><strong>{profile.colors || 'Open'}</strong></div>
          </div>
          <details className="ax-precision-measurements">
            <summary><span><strong>More accurate measurements (optional)</strong><small>Chest, waist, hips and inseam are used only when you want AX to compare you with an approved product size guide.</small></span></summary>
            <div className="ax-precision-body">
              <p>Use a tape around your body. Do not enter flat garment widths here.</p>
              <div className="ax-fit-grid">{precisionFields.map(([key,label]) => <label key={key}>{label} ({profile.unit})<input type="number" inputMode="decimal" min="0" step="0.01" value={profile[key] ?? ''} onChange={e=>changeProfile(key,e.target.value)}/></label>)}</div>
            </div>
          </details>
          <label className="ax-checkbox"><input type="checkbox" checked={saveConsent} onChange={e=>setSaveConsent(e.target.checked)}/><span>Save my fit and style profile privately for 30 days on this browser.</span></label>
          <div className="ax-profile-actions"><button onClick={saveProfile} disabled={!saveConsent || !status?.profiles || profileBusy}>Save profile</button><button onClick={forgetProfile} disabled={profileBusy}>Delete saved profile</button></div>
          <p role="status" className="ax-small">{profileNotice}</p>
          <button className="solid-button" onClick={()=>{setTab('chat');setDraft(request.product ? 'Use my fit and style profile to check this piece and tell me how it should wear.' : 'Use my fit and style profile to help me find something.');}}>USE WITH AX <Icon name="arrow"/></button>
        </section>}

        <div className="ax-fit-flow-nav">
          <button type="button" onClick={()=>setFitStep(step=>Math.max(0,step-1))} disabled={fitStep===0}><Icon name="arrow" size={14}/><span>Back</span></button>
          {fitStep<FIT_STEPS.length-1 && <button type="button" className="primary" onClick={()=>setFitStep(step=>Math.min(FIT_STEPS.length-1,step+1))}><span>{fitStep===0?'START FIT':'CONTINUE'}</span><Icon name="arrow" size={14}/></button>}
        </div>
      </div> : <>
        <div className="ax-transcript" ref={transcript} role="log" aria-label="Stylist conversation" aria-live="polite" aria-relevant="additions">
          {!messages.length && status?.available && <div className="ax-stylist-start">
            <div className="ax-stylist-orb" aria-hidden="true"><span className="ax-stylist-fluid ax-stylist-fluid-a"/><span className="ax-stylist-fluid ax-stylist-fluid-b"/><span className="ax-stylist-fluid ax-stylist-fluid-c"/><Brand/></div>
            <p className="ax-fit-kicker">AX STYLIST</p>
            <h3>What are we building today?</h3>
            <p>Search the store, style a piece, check fit, or add a photo for colour and outfit advice.</p>
            <div className="ax-quick-actions" aria-label="Quick asks">{quickActions.map(action=><button type="button" key={action.label} onClick={()=>useQuickAction(action)}><span className="ax-quick-icon"><Icon name={action.icon} size={17}/></span><span>{action.label}</span></button>)}</div>
          </div>}
          {status === null && <p className="ax-status-line" role="status">Checking availability…</p>}
          {status && !status.available && <div className="ax-chat-notice"><p>AX Stylist is temporarily unavailable.</p><div className="style-links">{styles.slice(0,3).map(style=><Link key={style.key} href={style.href} onClick={onClose}>{style.label}<Icon name="arrow" size={15}/></Link>)}</div></div>}
          {messages.map((item,i)=><article ref={item.role === 'assistant' && i === messages.length-1 ? latestReply : null} className={'ax-message ax-message-'+item.role} key={i}><span className="ax-message-role">{item.role === 'user' ? 'YOU' : 'AX'}</span><p>{item.message}</p>{item.photo && <p className="ax-small">Photo used for this reply; not saved in the chat.</p>}
            {item.fits?.filter(needsCustomerFitData).map(fit=><button className="ax-fit-action" type="button" key={fit.handle} onClick={()=>setTab('fit')}><Icon name="profile" size={15}/><span>Add fit details</span><Icon name="arrow" size={14}/></button>)}
            {item.products?.length > 0 && <div className="ax-chat-products">{item.products.map(product=><Link href={product.href} onClick={onClose} className="ax-chat-product" key={product.handle}><ProductImage src={product.image} alt={product.title} sizes="80px"/><div><span>{product.title}</span>{product.price && <strong>{!product.variantId && 'From '}{formatMoney(Number(product.price.amount),product.price.currencyCode)}</strong>}<small>{product.requiresSize ? 'Choose size' : 'View product'} →</small></div></Link>)}</div>}
            {item.links?.map(link=><Link className="ax-source-link" key={link.href} href={link.href} onClick={onClose}>{link.label} →</Link>)}
          </article>)}
          {busy && <div className="ax-working"><AXParticleLoader variant="stylist" label="AX is thinking…" /></div>}
        </div>
        <form id="ax-chat-form" className="ax-composer" onSubmit={send}>
          {photo && <div className="ax-photo-preview"><img src={photo} width="52" height="52" alt="Your selected clothing photo"/><span>Photo ready</span><button type="button" onClick={()=>setPhoto('')} aria-label="Remove photo"><Icon name="close" size={18}/></button></div>}
          {status?.images && <label className="ax-photo-button"><Icon name="wide" size={14}/>{photoBusy ? 'Preparing photo…' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={busy || photoBusy}/></label>}
          <label className="sr-only" htmlFor="ax-message">Message AX Stylist</label><div className="ax-message-input"><textarea id="ax-message" rows={1} maxLength={1200} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={request.product ? 'Ask about this piece…' : 'Ask AX…'} disabled={busy}/><button type="submit" aria-label="Send to AX Stylist" disabled={busy || photoBusy || !consent || !status?.available || !draft.trim()}><Icon name="arrow"/></button></div>
          <label className="ax-checkbox"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Allow AX Stylist to process this chat and optional fit/photo details using trusted service providers.</span></label>
          <p className="ax-small">Fit suggestions are estimates based on AX product data and any measurements you provide; actual fit can vary by cut and preference.</p>
        </form>
      </>}
      {error && <div className="ax-chat-error" role="alert"><p>{error}</p>{tab==='chat' && <button type="submit" form="ax-chat-form" disabled={busy || !consent || !status?.available || !draft.trim()}>Try again</button>}</div>}
    </div>
    <div className="ax-chat-footer"><Link href="/ax-stylist" onClick={onClose}>Privacy & info</Link></div>
  </Dialog>;
}
