const outline={fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round',vectorEffect:'non-scaling-stroke'};
const seam={fill:'none',stroke:'currentColor',strokeWidth:1,strokeLinecap:'round',strokeLinejoin:'round',vectorEffect:'non-scaling-stroke',opacity:.42};
const guide={fill:'none',stroke:'currentColor',strokeWidth:1.35,strokeLinecap:'round',strokeLinejoin:'round',strokeDasharray:'6 5',vectorEffect:'non-scaling-stroke'};

function Base({label,children}){
 return <svg viewBox="0 0 334 260" role="img" aria-label={`${label} garment measurement guide`} preserveAspectRatio="xMidYMid meet">
  <title>{label} garment measurement guide</title>{children}
 </svg>;
}
function Dot({x,y,r=3.5}){return <circle cx={x} cy={y} r={r} fill="currentColor"/>;}
function Label({x,y,children,anchor='middle',size=10}){return <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" fill="currentColor">{children}</text>;}
function Footer({children='Lay flat · measure in cm · do not stretch'}){return <text x="167" y="253" textAnchor="middle" fontSize="9" fontFamily="Arial, Helvetica, sans-serif" fill="currentColor" opacity=".58">{children}</text>;}

export function TeeMeasurementSvg(){return <Base label="T-shirt">
 <path d="M86 55c13-8 27-15 41-21 9 11 23 17 40 17s31-6 40-17c14 6 28 13 41 21 12 8 23 17 31 28l-28 32c-11-8-22-15-34-21v138H117V94c-12 6-23 13-34 21L55 83c8-11 19-20 31-28Z" {...outline}/>
 <path d="M140 41c5 18 18 28 27 28s22-10 27-28M122 213h90" {...seam}/>
 <line x1="127" y1="34" x2="207" y2="34" {...guide}/><line x1="117" y1="118" x2="217" y2="118" {...guide}/><line x1="127" y1="55" x2="127" y2="232" {...guide}/><line x1="207" y1="55" x2="253" y2="98" {...guide}/>
 <Dot x={127} y={55}/><Dot x={207} y={55}/><Dot x={117} y={118}/><Dot x={217} y={118}/><Dot x={127} y={232}/><Dot x={253} y={98}/>
 <Label x={167} y={20}>SHOULDER</Label><Label x={20} y={121} anchor="start">CHEST ×2</Label><Label x={226} y={176} anchor="start">LENGTH</Label><Label x={262} y={70} anchor="start">SLEEVE</Label><Footer/>
 </Base>;}

export function LongSleeveMeasurementSvg(){return <Base label="Long sleeve T-shirt">
 <path d="M89 50 126 30 150 45 167 57 184 45 208 30 245 50 268 70 286 190 253 196 224 87 220 232 114 232 110 87 81 196 48 190 66 70Z" {...outline}/>
 <path d="M150 45q17 21 34 0M116 210h102" {...seam}/>
 <line x1="126" y1="32" x2="208" y2="32" {...guide}/><line x1="114" y1="116" x2="220" y2="116" {...guide}/><line x1="126" y1="50" x2="126" y2="232" {...guide}/><line x1="208" y1="50" x2="268" y2="190" {...guide}/>
 <Dot x={126} y={50}/><Dot x={208} y={50}/><Dot x={114} y={116}/><Dot x={220} y={116}/><Dot x={126} y={232}/><Dot x={268} y={190}/>
 <Label x={167} y={18}>SHOULDER</Label><Label x={20} y={119} anchor="start">CHEST ×2</Label><Label x={226} y={176} anchor="start">LENGTH</Label><Label x={273} y={126} anchor="start">SLEEVE</Label><Footer/>
 </Base>;}

export function ShirtMeasurementSvg(){return <Base label="Shirt">
 <path d="M91 58c12-8 24-14 37-19l19 17c6 5 13 9 20 13 7-4 14-8 20-13l19-17c13 5 25 11 37 19 13 8 24 18 33 30l-26 31c-10-8-21-15-32-21v134H116V98c-11 6-22 13-32 21L58 88c9-12 20-22 33-30Z" {...outline}/>
 <path d="M147 56 167 86 187 56M167 86v146M151 78l16 16 16-16M122 123h90M121 213h92" {...seam}/>
 <path d="M137 41c5 17 18 28 30 28s25-11 30-28" {...seam}/>
 <circle cx="167" cy="116" r="2" fill="currentColor" opacity=".35"/><circle cx="167" cy="145" r="2" fill="currentColor" opacity=".35"/><circle cx="167" cy="174" r="2" fill="currentColor" opacity=".35"/><circle cx="167" cy="203" r="2" fill="currentColor" opacity=".35"/>
 <line x1="128" y1="40" x2="206" y2="40" {...guide}/><line x1="116" y1="123" x2="218" y2="123" {...guide}/><line x1="128" y1="58" x2="128" y2="232" {...guide}/><line x1="206" y1="58" x2="251" y2="101" {...guide}/>
 <Dot x={128} y={58}/><Dot x={206} y={58}/><Dot x={116} y={123}/><Dot x={218} y={123}/><Dot x={128} y={232}/><Dot x={251} y={101}/>
 <Label x={167} y={26}>SHOULDER</Label><Label x={20} y={126} anchor="start">CHEST ×2</Label><Label x={226} y={173} anchor="start">LENGTH</Label><Label x={263} y={75} anchor="start">SLEEVE</Label><Footer/>
 </Base>;}

export function HoodieMeasurementSvg(){return <Base label="Hoodie">
 <path d="M128 48q-2-34 39-38 41 4 39 38l26 10 33 26 22 53-28 14-34-48v129H109V103l-34 48-28-14 22-53 33-26Z" {...outline}/>
 <path d="M128 48q39 28 78 0M136 193h62l13 25h-88Z" {...seam}/>
 <line x1="105" y1="61" x2="229" y2="61" {...guide}/><line x1="105" y1="121" x2="229" y2="121" {...guide}/><line x1="114" y1="64" x2="114" y2="232" {...guide}/><line x1="228" y1="64" x2="270" y2="139" {...guide}/>
 <Dot x={105} y={61}/><Dot x={229} y={61}/><Dot x={105} y={121}/><Dot x={229} y={121}/><Dot x={114} y={64}/><Dot x={114} y={232}/><Dot x={270} y={139}/>
 <Label x={167} y={48}>SHOULDER</Label><Label x={20} y={124} anchor="start">CHEST ×2</Label><Label x={232} y={181} anchor="start">LENGTH</Label><Label x={270} y={102} anchor="start">SLEEVE</Label><Footer/>
 </Base>;}

export function JacketMeasurementSvg(){return <Base label="Jacket">
 <path d="M118 42 145 28 167 44 189 28 216 42 245 61 264 116 239 125 220 85 220 234 114 234 114 85 95 125 70 116 89 61Z" {...outline}/>
 <path d="M145 28 167 62 189 28M167 62v172" {...seam}/>
 <line x1="118" y1="48" x2="216" y2="48" {...guide}/><line x1="114" y1="112" x2="220" y2="112" {...guide}/><line x1="122" y1="48" x2="122" y2="234" {...guide}/><line x1="216" y1="48" x2="250" y2="118" {...guide}/>
 <Dot x={118} y={48}/><Dot x={216} y={48}/><Dot x={114} y={112}/><Dot x={220} y={112}/><Dot x={122} y={234}/><Dot x={250} y={118}/>
 <Label x={167} y={18}>SHOULDER</Label><Label x={20} y={115} anchor="start">CHEST ×2</Label><Label x={226} y={181} anchor="start">LENGTH</Label><Label x={260} y={80} anchor="start">SLEEVE</Label><Footer>Close naturally · measure in cm · do not stretch</Footer>
 </Base>;}

export function BottomMeasurementSvg(){return <Base label="Trousers">
 <path d="M112 24h110l8 67-22 147h-37l-4-114-4 114h-37L104 91Z" {...outline}/>
 <path d="M106 56h122M167 24v80q-21 15-22 41M167 104q21 15 22 41" {...seam}/>
 <line x1="112" y1="34" x2="222" y2="34" {...guide}/><line x1="108" y1="70" x2="226" y2="70" {...guide}/><line x1="167" y1="42" x2="167" y2="119" {...guide}/><line x1="109" y1="120" x2="158" y2="120" {...guide}/><line x1="167" y1="134" x2="167" y2="238" {...guide}/><line x1="222" y1="28" x2="208" y2="238" {...guide}/><line x1="171" y1="230" x2="208" y2="230" {...guide}/>
 {[ [112,34],[222,34],[108,70],[226,70],[167,42],[167,119],[109,120],[158,120],[167,134],[167,238],[222,28],[208,238],[171,230],[208,230] ].map(([x,y],i)=><Dot x={x} y={y} r={3.2} key={i}/>)}
 <Label x={167} y={14} size={9}>WAIST ×2</Label><Label x={24} y={73} anchor="start" size={9}>HIP ×2</Label><Label x={174} y={93} anchor="start" size={9}>FRONT RISE</Label><Label x={25} y={123} anchor="start" size={9}>THIGH ×2</Label><Label x={173} y={188} anchor="start" size={9}>INSEAM</Label><Label x={232} y={159} anchor="start" size={9}>OUTSEAM</Label><Label x={214} y={228} anchor="start" size={9}>LEG OPENING ×2</Label>
 </Base>;}

export function JeansMeasurementSvg(){return <Base label="Jeans">
 <path d="M108 24h118l9 66-21 150h-39l-8-115-8 115h-39L99 90Z" {...outline}/>
 <path d="M104 58h126M126 25q5 17 41 17t41-17M167 24v80q-22 14-23 42M167 104q22 14 23 42M124 92h34M176 92h34" {...seam}/>
 <line x1="108" y1="34" x2="226" y2="34" {...guide}/><line x1="105" y1="72" x2="229" y2="72" {...guide}/><line x1="167" y1="43" x2="167" y2="120" {...guide}/><line x1="108" y1="121" x2="158" y2="121" {...guide}/><line x1="167" y1="135" x2="167" y2="240" {...guide}/><line x1="226" y1="28" x2="214" y2="240" {...guide}/><line x1="175" y1="232" x2="214" y2="232" {...guide}/>
 {[ [108,34],[226,34],[105,72],[229,72],[167,43],[167,120],[108,121],[158,121],[167,135],[167,240],[226,28],[214,240],[175,232],[214,232] ].map(([x,y],i)=><Dot x={x} y={y} r={3.2} key={i}/>)}
 <Label x={167} y={14} size={9}>WAIST ×2</Label><Label x={22} y={75} anchor="start" size={9}>HIP ×2</Label><Label x={174} y={94} anchor="start" size={9}>FRONT RISE</Label><Label x={23} y={124} anchor="start" size={9}>THIGH ×2</Label><Label x={173} y={189} anchor="start" size={9}>INSEAM</Label><Label x={237} y={160} anchor="start" size={9}>OUTSEAM</Label><Label x={220} y={230} anchor="start" size={9}>LEG OPENING ×2</Label>
 </Base>;}

export function ShortsMeasurementSvg(){return <Base label="Shorts">
 <path d="M106 38h122l6 63-23 95-40-2-4-59-4 59-40 2-23-95Z" {...outline}/>
 <path d="M102 70h130M167 38v73q-19 13-21 32M167 111q19 13 21 32" {...seam}/>
 <line x1="108" y1="48" x2="226" y2="48" {...guide}/><line x1="104" y1="82" x2="230" y2="82" {...guide}/><line x1="167" y1="55" x2="167" y2="125" {...guide}/><line x1="108" y1="128" x2="158" y2="128" {...guide}/><line x1="167" y1="140" x2="167" y2="193" {...guide}/><line x1="226" y1="42" x2="211" y2="196" {...guide}/><line x1="171" y1="188" x2="211" y2="188" {...guide}/>
 {[ [108,48],[226,48],[104,82],[230,82],[167,55],[167,125],[108,128],[158,128],[167,140],[167,193],[226,42],[211,196],[171,188],[211,188] ].map(([x,y],i)=><Dot x={x} y={y} r={3.2} key={i}/>)}
 <Label x={167} y={28} size={9}>WAIST ×2</Label><Label x={22} y={85} anchor="start" size={9}>HIP ×2</Label><Label x={174} y={103} anchor="start" size={9}>FRONT RISE</Label><Label x={22} y={131} anchor="start" size={9}>THIGH ×2</Label><Label x={174} y={169} anchor="start" size={9}>INSEAM</Label><Label x={236} y={145} anchor="start" size={9}>OUTSEAM</Label><Label x={214} y={185} anchor="start" size={9}>LEG OPENING ×2</Label><Footer/>
 </Base>;}

const SVG_BY_CATEGORY={tee:TeeMeasurementSvg,long_sleeve:LongSleeveMeasurementSvg,shirt:ShirtMeasurementSvg,hoodie:HoodieMeasurementSvg,jacket:JacketMeasurementSvg,jeans:JeansMeasurementSvg,bottom:BottomMeasurementSvg,shorts:ShortsMeasurementSvg};
export default function MeasurementIllustration({category}){const Component=SVG_BY_CATEGORY[category];return Component?<Component/>:null;}
