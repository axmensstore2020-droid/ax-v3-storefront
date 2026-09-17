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
 <path d="M87 50 126 30 150 45 167 57 184 45 208 30 247 50 276 76 252 108 220 88 220 232 114 232 114 88 82 108 58 76Z" {...outline}/>
 <path d="M150 45q17 21 34 0" {...seam}/>
 <line x1="126" y1="32" x2="208" y2="32" {...guide}/><line x1="114" y1="116" x2="220" y2="116" {...guide}/><line x1="126" y1="50" x2="126" y2="232" {...guide}/><line x1="208" y1="50" x2="252" y2="91" {...guide}/>
 <Dot x={126} y={50}/><Dot x={208} y={50}/><Dot x={114} y={116}/><Dot x={220} y={116}/><Dot x={126} y={232}/><Dot x={252} y={91}/>
 <Label x={167} y={18}>SHOULDER</Label><Label x={20} y={119} anchor="start">CHEST ×2</Label><Label x={226} y={176} anchor="start">LENGTH</Label><Label x={264} y={65} anchor="start">SLEEVE</Label><Footer/>
 </Base>;}

export function ShirtMeasurementSvg(){return <Base label="Shirt">
 <path d="M91 56 126 38 144 54 167 69 190 54 208 38 243 56 276 83 252 113 220 91 220 232 114 232 114 91 82 113 58 83Z" {...outline}/>
 <path d="M144 54 167 83 190 54M167 83v149M154 79l13 14 13-14M120 121h94" {...seam}/>
 <circle cx="167" cy="115" r="2" fill="currentColor" opacity=".35"/><circle cx="167" cy="145" r="2" fill="currentColor" opacity=".35"/><circle cx="167" cy="175" r="2" fill="currentColor" opacity=".35"/>
 <line x1="126" y1="40" x2="208" y2="40" {...guide}/><line x1="114" y1="121" x2="220" y2="121" {...guide}/><line x1="126" y1="56" x2="126" y2="232" {...guide}/><line x1="208" y1="56" x2="252" y2="96" {...guide}/>
 <Dot x={126} y={56}/><Dot x={208} y={56}/><Dot x={114} y={121}/><Dot x={220} y={121}/><Dot x={126} y={232}/><Dot x={252} y={96}/>
 <Label x={167} y={26}>SHOULDER</Label><Label x={20} y={124} anchor="start">CHEST ×2</Label><Label x={226} y={173} anchor="start">FRONT LENGTH</Label><Label x={264} y={73} anchor="start">SLEEVE</Label><Footer/>
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

export function ShortsMeasurementSvg(){return <Base label="Shorts">
 <path d="M106 38h122l6 63-23 95-40-2-4-59-4 59-40 2-23-95Z" {...outline}/>
 <path d="M102 70h130M167 38v73q-19 13-21 32M167 111q19 13 21 32" {...seam}/>
 <line x1="108" y1="48" x2="226" y2="48" {...guide}/><line x1="104" y1="82" x2="230" y2="82" {...guide}/><line x1="167" y1="55" x2="167" y2="125" {...guide}/><line x1="108" y1="128" x2="158" y2="128" {...guide}/><line x1="167" y1="140" x2="167" y2="193" {...guide}/><line x1="226" y1="42" x2="211" y2="196" {...guide}/><line x1="171" y1="188" x2="211" y2="188" {...guide}/>
 {[ [108,48],[226,48],[104,82],[230,82],[167,55],[167,125],[108,128],[158,128],[167,140],[167,193],[226,42],[211,196],[171,188],[211,188] ].map(([x,y],i)=><Dot x={x} y={y} r={3.2} key={i}/>)}
 <Label x={167} y={28} size={9}>WAIST ×2</Label><Label x={22} y={85} anchor="start" size={9}>HIP ×2</Label><Label x={174} y={103} anchor="start" size={9}>FRONT RISE</Label><Label x={22} y={131} anchor="start" size={9}>THIGH ×2</Label><Label x={174} y={169} anchor="start" size={9}>INSEAM</Label><Label x={236} y={145} anchor="start" size={9}>OUTSEAM</Label><Label x={214} y={185} anchor="start" size={9}>LEG OPENING ×2</Label><Footer/>
 </Base>;}

const SVG_BY_CATEGORY={tee:TeeMeasurementSvg,shirt:ShirtMeasurementSvg,hoodie:HoodieMeasurementSvg,jacket:JacketMeasurementSvg,bottom:BottomMeasurementSvg,shorts:ShortsMeasurementSvg};
export default function MeasurementIllustration({category}){const Component=SVG_BY_CATEGORY[category];return Component?<Component/>:null;}
