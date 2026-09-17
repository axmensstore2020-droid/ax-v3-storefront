const outline={fill:'none',stroke:'currentColor',strokeWidth:1.65,strokeLinecap:'round',strokeLinejoin:'round',vectorEffect:'non-scaling-stroke'};
const seam={fill:'none',stroke:'currentColor',strokeWidth:1,strokeLinecap:'round',strokeLinejoin:'round',vectorEffect:'non-scaling-stroke',opacity:.42};
const guide={fill:'none',stroke:'currentColor',strokeWidth:1.35,strokeLinecap:'round',strokeLinejoin:'round',strokeDasharray:'6 5',vectorEffect:'non-scaling-stroke'};

function Base({label,id,children}){
 return <svg viewBox="0 0 320 320" role="img" aria-label={`${label} garment measurement guide`} preserveAspectRatio="xMidYMid meet">
  <title>{label} garment measurement guide</title>
  <defs>
   <marker id={`${id}-arrow`} viewBox="0 0 8 8" refX="6.8" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 8 4 0 8Z" fill="currentColor"/></marker>
  </defs>
  {children}
 </svg>;
}
function Label({x,y,children}){return <text x={x} y={y} textAnchor="middle" fontSize="15" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" fill="currentColor">{children}</text>;}
function Dot({x,y}){return <circle cx={x} cy={y} r="3.1" fill="currentColor"/>;}
function Line({id,x1,y1,x2,y2,start=true,end=true}){return <line x1={x1} y1={y1} x2={x2} y2={y2} {...guide} markerStart={start?`url(#${id}-arrow)`:undefined} markerEnd={end?`url(#${id}-arrow)`:undefined}/>;}
function ShoulderGuide({id,leftX,rightX,shoulderY,guideY}){
 return <g aria-hidden="true">
  <line x1={leftX} y1={guideY+5} x2={leftX} y2={shoulderY-4} {...guide}/><line x1={rightX} y1={guideY+5} x2={rightX} y2={shoulderY-4} {...guide}/>
  <Dot x={leftX} y={shoulderY}/><Dot x={rightX} y={shoulderY}/><Line id={id} x1={leftX+3} y1={guideY} x2={rightX-3} y2={guideY}/><Label x={(leftX+rightX)/2} y={guideY-10}>B</Label>
 </g>;
}

export function TeeMeasurementSvg(){const id='tee-measure';return <Base label="T-shirt" id={id}>
 <path d="M111 69 83 84 48 116 70 145 98 125 99 260 221 260 222 125 250 145 272 116 237 84 209 69C197 83 181 90 160 90s-37-7-49-21Z" {...outline}/><path d="M111 69c10 11 27 17 49 17s39-6 49-17M99 125l16-17M221 125l-16-17" {...seam}/>
 <ShoulderGuide id={id} leftX={112} rightX={208} shoulderY={80} guideY={52}/><Line id={id} x1={103} y1={139} x2={217} y2={139}/><Label x={160} y={129}>A</Label><Line id={id} x1={218} y1={98} x2={218} y2={254}/><Label x={238} y={182}>C</Label><Line id={id} x1={228} y1={94} x2={258} y2={127}/><Label x={270} y={105}>D</Label>
 </Base>;}
export function ShirtMeasurementSvg(){const id='shirt-measure';return <Base label="Shirt" id={id}>
 <path d="M117 70 91 83 55 108 71 143 100 126 101 263 219 263 220 126 249 143 265 108 229 83 203 70 184 83 160 93 136 83Z" {...outline}/><path d="m136 83 24 29 24-29M160 112v151M149 113l11 13 11-13M104 147h112M100 126l17-19M220 126l-17-19" {...seam}/><circle cx="160" cy="141" r="2" fill="currentColor" opacity=".45"/><circle cx="160" cy="166" r="2" fill="currentColor" opacity=".45"/><circle cx="160" cy="191" r="2" fill="currentColor" opacity=".45"/>
 <ShoulderGuide id={id} leftX={117} rightX={203} shoulderY={70} guideY={42}/><Line id={id} x1={104} y1={147} x2={216} y2={147}/><Label x={160} y={136}>A</Label><Line id={id} x1={205} y1={92} x2={205} y2={258}/><Label x={226} y={181}>C</Label><Line id={id} x1={224} y1={91} x2={254} y2={132}/><Label x={269} y={107}>D</Label>
 </Base>;}
export function HoodieMeasurementSvg(){const id='hoodie-measure';return <Base label="Hoodie" id={id}>
 <path d="M132 72c-4-27 9-44 28-44s32 17 28 44l21 7 31 22 34 55-30 18-23-38v126H99V136l-23 38-30-18 34-55 31-22Z" {...outline}/><path d="M132 72c8 10 18 15 28 15s20-5 28-15M136 54c7-10 15-14 24-14s17 4 24 14M129 214h62l16 28H113Z" {...seam}/>
 <ShoulderGuide id={id} leftX={112} rightX={208} shoulderY={82} guideY={55}/><Line id={id} x1={102} y1={143} x2={218} y2={143}/><Label x={160} y={132}>A</Label><Line id={id} x1={218} y1={103} x2={218} y2={257}/><Label x={239} y={182}>C</Label><Line id={id} x1={221} y1={93} x2={255} y2={154}/><Label x={271} y={118}>D</Label>
 </Base>;}
export function JacketMeasurementSvg(){const id='jacket-measure';return <Base label="Jacket" id={id}>
 <path d="M119 64 92 80 66 103 51 178 82 185 100 127 101 263 219 263 220 127 238 185 269 178 254 103 228 80 201 64 184 82 160 92 136 82Z" {...outline}/><path d="m136 82 24 28 24-28M160 110v153M111 151h28v33h-28M181 151h28v33h-28M100 127l18-25M220 127l-18-25" {...seam}/>
 <ShoulderGuide id={id} leftX={119} rightX={201} shoulderY={64} guideY={39}/><Line id={id} x1={103} y1={139} x2={217} y2={139}/><Label x={160} y={128}>A</Label><Line id={id} x1={215} y1={97} x2={215} y2={258}/><Label x={237} y={181}>C</Label><Line id={id} x1={229} y1={92} x2={254} y2={173}/><Label x={271} y={130}>D</Label>
 </Base>;}
export function BottomMeasurementSvg(){const id='bottom-measure';return <Base label="Bottom" id={id}>
 <path d="M112 40h96l13 88-16 153h-39l-6-116-6 116h-39L99 128Z" {...outline}/><path d="M103 72h114M101 95h118M160 42v75M160 117c-16 17-21 34-20 51M160 117c16 17 21 34 20 51" {...seam}/>
 <Line id={id} x1={106} y1={56} x2={214} y2={56}/><Label x={160} y={47}>A</Label><Line id={id} x1={104} y1={91} x2={216} y2={91}/><Label x={160} y={82}>B</Label><Line id={id} x1={160} y1={66} x2={160} y2={132}/><Label x={180} y={113}>C</Label><Line id={id} x1={112} y1={128} x2={152} y2={128}/><Label x={92} y={133}>D</Label><Line id={id} x1={160} y1={145} x2={160} y2={278}/><Label x={180} y={214}>E</Label><Line id={id} x1={218} y1={45} x2={202} y2={278}/><Label x={236} y={214}>F</Label><Line id={id} x1={167} y1={276} x2={204} y2={276}/><Label x={186} y={299}>G</Label>
 </Base>;}
export function ShortsMeasurementSvg(){const id='shorts-measure';return <Base label="Shorts" id={id}>
 <path d="M104 58h112l10 70-17 102-47-2-2-58-2 58-47 2-17-102Z" {...outline}/><path d="M99 91h122M97 115h126M160 60v64M160 124c-13 15-18 29-18 46M160 124c13 15 18 29 18 46" {...seam}/>
 <Line id={id} x1={101} y1={74} x2={219} y2={74}/><Label x={160} y={64}>A</Label><Line id={id} x1={100} y1={111} x2={220} y2={111}/><Label x={160} y={101}>B</Label><Line id={id} x1={160} y1={83} x2={160} y2={139}/><Label x={181} y={133}>C</Label><Line id={id} x1={107} y1={138} x2={152} y2={138}/><Label x={87} y={143}>D</Label><Line id={id} x1={160} y1={151} x2={160} y2={224}/><Label x={181} y={191}>E</Label><Line id={id} x1={220} y1={62} x2={207} y2={225}/><Label x={241} y={191}>F</Label><Line id={id} x1={164} y1={224} x2={209} y2={224}/><Label x={187} y={247}>G</Label>
 </Base>;}

const SVG_BY_CATEGORY={tee:TeeMeasurementSvg,shirt:ShirtMeasurementSvg,hoodie:HoodieMeasurementSvg,jacket:JacketMeasurementSvg,bottom:BottomMeasurementSvg,shorts:ShortsMeasurementSvg};
export default function MeasurementIllustration({category}){const Component=SVG_BY_CATEGORY[category];return Component?<Component/>:null;}
