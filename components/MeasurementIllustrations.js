import {useId} from 'react';
// Front-only technical vectors with external letter badges and directional arrows.
const stroke={fill:'none',stroke:'currentColor',strokeWidth:1.25,strokeLinecap:'round',strokeLinejoin:'round'};
const detail={...stroke,strokeWidth:.8,opacity:.6};
const tops=['tee','sleeveless','long_sleeve','polo','shirt','short_shirt','hoodie','sweatshirt','jacket','blazer','coat'];
const bottoms=['jeans','bottom','cargo','joggers','shorts'];
function Garment({kind}){
 if(tops.includes(kind)){
  const short=['tee','polo','short_shirt'].includes(kind),tank=kind==='sleeveless',coat=kind==='coat';
  const hem=coat?345:305;
  return <g>
   <path d={tank?`M148 70 Q160 95 180 95 Q200 95 212 70 L226 77 Q215 125 234 151 L234 ${hem} Q180 ${hem+9} 126 ${hem} L126 151 Q145 125 134 77 Z`:short?`M148 70 Q180 97 212 70 L237 79 Q253 88 270 103 L303 136 L275 169 L238 146 L238 ${hem} Q180 ${hem+9} 122 ${hem} L122 146 L85 169 L57 136 L90 103 Q107 88 123 79 Z`:`M148 70 Q180 97 212 70 L237 79 Q251 85 261 103 Q279 160 309 266 L281 279 Q258 220 239 157 L238 ${hem} Q180 ${hem+9} 122 ${hem} L121 157 Q102 220 79 279 L51 266 Q81 160 99 103 Q109 85 123 79 Z`} {...stroke}/>
   {!tank&&<path d={short?'M123 79 Q136 106 122 146 M237 79 Q224 106 238 146 M63 132 L90 161 M297 132 L270 161':'M123 79 Q139 117 121 157 M237 79 Q221 117 239 157 M55 255 L84 269 M305 255 L276 269'} {...detail}/>}
   <path d={`M126 ${hem-9} Q180 ${hem} 234 ${hem-9}`} {...detail}/>
   {['shirt','short_shirt','polo'].includes(kind)?<><path d="M148 70 L157 58 L180 66 L203 58 L212 70 L197 98 L180 80 L163 98 Z" {...detail}/><path d={`M180 80 V${kind==='polo'?130:hem}`} {...detail}/>{kind!=='polo'&&[120,156,192,228,264].map(y=><circle key={y} cx="180" cy={y} r="1.7" fill="currentColor" opacity=".4"/>)}</>:kind==='hoodie'?<><path d="M148 70 C128 22 157 17 180 17 C203 17 232 22 212 70 Q180 94 148 70 Z M153 66 Q180 40 207 66" {...stroke}/><path d="M149 246 Q180 253 211 246 L225 280 Q180 286 135 280 Z M164 85 V128 M196 85 V128" {...detail}/></>:<path d="M148 70 Q180 115 212 70" {...detail}/>}
   {['hoodie','sweatshirt'].includes(kind)&&<path d={`M123 ${hem-16} Q180 ${hem-8} 237 ${hem-16} M58 259 L82 271 M302 259 L278 271`} {...detail}/>}
   {['jacket','blazer','coat'].includes(kind)&&<><path d={`M180 87 V${hem} M138 226 L164 215 M196 215 L222 226`} {...detail}/><path d={kind==='jacket'?'M148 70 L149 56 L180 64 L211 56 L212 70':'M148 70 L161 128 L180 151 L161 100 M212 70 L199 128 L180 151 L199 100'} {...detail}/></>}
  </g>;
 }
 if(bottoms.includes(kind)){
  const shorts=kind==='shorts',y=shorts?228:335;
  return <g><path d={`M119 47 Q180 53 241 47 Q250 91 250 129 Q249 155 246 179 L235 ${y} L192 ${y} L180 164 L168 ${y} L125 ${y} L114 179 Q111 155 110 129 Z`} {...stroke}/><path d={`M117 64 Q180 70 243 64 M180 53 V135 Q179 153 166 163 M124 ${y-9} H168 M192 ${y-9} H236`} {...detail}/>
   <path d="M133 67 Q137 98 113 112 M227 67 Q223 98 247 112" {...detail}/>
   {kind==='jeans'&&<path d="M130 48 V65 M153 51 V68 M207 51 V68 M230 48 V65 M210 73 H231 V92 H218" {...detail}/>}
   {kind==='cargo'&&<path d="M117 188 H155 V232 H120 M205 188 H243 L240 232 H205 Z M117 197 H155 M205 197 H243" {...detail}/>}
   {kind==='joggers'&&<path d={`M119 55 Q180 61 241 55 M177 62 Q154 76 169 83 L180 69 L191 83 Q206 76 183 62 M127 ${y-14} H167 M193 ${y-14} H233`} {...detail}/>}
   {kind==='bottom'&&<path d={`M145 104 L145 ${y-15} M215 104 L215 ${y-15}`} {...detail}/>}
  </g>;
 }
 if(kind==='chain')return <path d="M85 70 C55 270 105 316 180 318 C255 316 305 270 275 70" {...stroke} strokeDasharray="3 3"/>;
 if(kind==='belt')return <g><rect x="50" y="157" width="265" height="39" rx="10" {...stroke}/><rect x="43" y="152" width="39" height="49" rx="5" {...stroke}/>{[220,235,250,265,280].map(x=><circle key={x} cx={x} cy="176" r="2" fill="currentColor"/>)}</g>;
 if(kind==='cap')return <g><path d="M86 203 C85 59 273 59 274 203 Q180 240 86 203 Z M86 203 Q180 293 296 248 Q303 231 274 203 M180 98 V216" {...stroke}/></g>;
 if(kind==='eyewear')return <g><rect x="55" y="122" width="103" height="70" rx="25" {...stroke}/><rect x="202" y="122" width="103" height="70" rx="25" {...stroke}/><path d="M158 144 Q180 131 202 144 M55 144 L39 106 M305 144 L321 106 M71 278 H261 Q293 278 298 255" {...stroke}/></g>;
 if(kind==='watch')return <g><rect x="155" y="35" width="50" height="275" rx="15" {...stroke}/><circle cx="180" cy="174" r="52" fill="var(--soft, #eeeee9)" stroke="currentColor" strokeWidth="1.7"/><path d="M180 140 V174 L201 185" {...detail}/></g>;
 return null;
}
export function measurementPath(kind,field){
 if(tops.includes(kind)){
  const short=['tee','polo','short_shirt'].includes(kind),tank=kind==='sleeveless',hem=kind==='coat'?345:305;
  return {chest:`M${tank?126:122} 157 H${tank?234:238}`,shoulder:tank?'M134 77 H226':'M123 79 H237',length:`M148 70 V${hem}`,sleeve:short?'M237 79 Q258 98 289 151':'M237 79 Q251 85 261 103 L295 272'}[field];
 }
 if(bottoms.includes(kind)){
  const y=kind==='shorts'?228:335;
  return {waist:'M119 29 H241',hip:'M110 129 H250',front_rise:'M180 53 V135 Q181 152 180 164',thigh:'M114 177 H179',knee:'M120 247 H173',inseam:`M180 164 L192 ${y}`,outseam:`M241 47 Q250 91 250 129 Q249 155 246 179 L235 ${y}`,leg_opening:`M192 ${y} H235`}[field];
 }
 return {chain_length:'M85 70 C55 270 105 316 180 318 C255 316 305 270 275 70',belt_length:'M62 176 H250',width:'M185 157 V196',head_circumference:'M86 203 C125 177 238 177 274 203 C242 237 122 237 86 203',lens_width:'M55 157 H158',bridge:'M158 144 H202',temple_length:'M71 278 H261 Q293 278 298 255',case_width:'M128 174 H232',strap_length:'M180 35 V121 M180 227 V310'}[field];
}
const topBadges={chest:[94,157],shoulder:[180,35],length:[83,236],sleeve:[309,192]};
const accessoryBadges={chain_length:[180,340],belt_length:[180,219],width:[185,134],head_circumference:[180,270],lens_width:[107,215],bridge:[180,112],temple_length:[185,300],case_width:[180,245],strap_length:[228,70]};
const bottomBadges={waist:[180,10],hip:[279,129],front_rise:[201,94],thigh:[88,179],knee:[91,247],inseam:[166,290],outseam:[282,238],leg_opening:[215,358]};
export default function MeasurementIllustration({category,field='chest',fields=[field],label}){
 const id=useId().replaceAll(':','');
 const badges={...(tops.includes(category)?topBadges:bottoms.includes(category)?bottomBadges:accessoryBadges)};
 if(category==='shorts')Object.assign(badges,{inseam:[166,211],outseam:[282,190],leg_opening:[215,252]});
 if(category==='hoodie')badges.shoulder=[267,60];
 if(['tee','polo','short_shirt'].includes(category))badges.sleeve=[322,145];
 return <svg xmlns="http://www.w3.org/2000/svg" width="360" height="390" viewBox="0 -10 360 390" role="img" aria-label={`${label||category}: front view with lettered measurement arrows`}>
  <title>{`${label||category} — front view`}</title>
  <defs><marker id={`${id}-arrow`} viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#426fc1"/></marker></defs>
  <Garment kind={category}/>
  {fields.map((item,index)=>{const path=measurementPath(category,item);if(!path)return null;
   const [x,y]=badges[item]||[180,340];const active=item===field;
   return <g key={item}>
    <path d={path} fill="none" stroke="#426fc1" opacity={active?1:.38} strokeWidth={active?1.8:1.2} strokeDasharray="4 4" markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`}/>
    <circle cx={x} cy={y} r="11" fill={active?'#171716':'#eeeeeb'} stroke="#fff" strokeWidth="2"/>
    <text x={x} y={y+4} textAnchor="middle" fill={active?'white':'#171716'} fontFamily="Arial, sans-serif" fontSize="12">{String.fromCharCode(65+index)}</text>
   </g>;
  })}
 </svg>;
}
