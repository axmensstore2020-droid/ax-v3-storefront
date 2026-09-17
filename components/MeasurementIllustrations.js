const outline = {fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round',vectorEffect:'non-scaling-stroke'};
const seam = {fill:'none',stroke:'currentColor',strokeWidth:1,strokeLinecap:'round',strokeLinejoin:'round',vectorEffect:'non-scaling-stroke',opacity:.45};
const measure = {fill:'none',stroke:'currentColor',strokeWidth:1.15,strokeLinecap:'round',strokeLinejoin:'round',strokeDasharray:'5 4',vectorEffect:'non-scaling-stroke'};

function Mark({x,y,label}) {
  return <g aria-hidden="true"><circle cx={x} cy={y} r="11" fill="var(--paper,#f7f7f4)" stroke="currentColor" strokeWidth="1.1"/><text x={x} y={y+4} textAnchor="middle" fontSize="11" fontFamily="Arial, Helvetica, sans-serif" fill="currentColor">{label}</text></g>;
}
function Measure({x1,y1,x2,y2,label,mx,my}) {
  return <g aria-hidden="true"><line x1={x1} y1={y1} x2={x2} y2={y2} {...measure}/><circle cx={x1} cy={y1} r="2.5" fill="var(--paper,#f7f7f4)" stroke="currentColor" strokeWidth="1"/><circle cx={x2} cy={y2} r="2.5" fill="var(--paper,#f7f7f4)" stroke="currentColor" strokeWidth="1"/><Mark x={mx} y={my} label={label}/></g>;
}
function Base({label,children}) {
  return <svg viewBox="0 0 320 320" role="img" aria-label={`${label} garment measurement guide`} preserveAspectRatio="xMidYMid meet"><title>{label} garment measurement guide</title>{children}</svg>;
}

export function TeeMeasurementSvg() {
  return <Base label="T-shirt"><path d="M111 69 83 84 48 116 70 145 98 125 99 260 221 260 222 125 250 145 272 116 237 84 209 69C197 83 181 90 160 90s-37-7-49-21Z" {...outline}/><path d="M111 69c10 11 27 17 49 17s39-6 49-17M99 125l16-17M221 125l-16-17" {...seam}/><Measure x1="101" y1="139" x2="219" y2="139" label="A" mx="160" my="122"/><Measure x1="112" y1="80" x2="208" y2="80" label="B" mx="160" my="61"/><Measure x1="218" y1="96" x2="218" y2="256" label="C" mx="243" my="176"/><Measure x1="228" y1="94" x2="258" y2="127" label="D" mx="269" my="94"/></Base>;
}
export function ShirtMeasurementSvg() {
  return <Base label="Shirt"><path d="M117 67 91 81 54 107 70 142 99 125 100 262 220 262 221 125 250 142 266 107 229 81 203 67 184 82 160 91 136 82Z" {...outline}/><path d="m136 82 24 28 24-28M160 110v152M149 111l11 13 11-13M104 146h112M99 125l17-20M221 125l-17-20" {...seam}/><circle cx="160" cy="139" r="2" fill="currentColor" opacity=".5"/><circle cx="160" cy="164" r="2" fill="currentColor" opacity=".5"/><circle cx="160" cy="189" r="2" fill="currentColor" opacity=".5"/><Measure x1="103" y1="145" x2="217" y2="145" label="A" mx="160" my="128"/><Measure x1="118" y1="77" x2="202" y2="77" label="B" mx="160" my="58"/><Measure x1="215" y1="98" x2="215" y2="258" label="C" mx="241" my="179"/><Measure x1="231" y1="94" x2="257" y2="126" label="D" mx="270" my="92"/></Base>;
}
export function HoodieMeasurementSvg() {
  return <Base label="Hoodie"><path d="M132 70c-4-26 9-42 28-42s32 16 28 42l21 7 31 22 34 55-30 18-23-38v128H99V134l-23 38-30-18 34-55 31-22Z" {...outline}/><path d="M132 70c8 10 18 15 28 15s20-5 28-15M136 53c7-10 15-14 24-14s17 4 24 14M129 214h62l16 28H113Z" {...seam}/><Measure x1="102" y1="143" x2="218" y2="143" label="A" mx="160" my="126"/><Measure x1="113" y1="82" x2="207" y2="82" label="B" mx="160" my="101"/><Measure x1="218" y1="102" x2="218" y2="258" label="C" mx="244" my="181"/><Measure x1="221" y1="92" x2="255" y2="153" label="D" mx="271" my="112"/></Base>;
}
export function JacketMeasurementSvg() {
  return <Base label="Jacket"><path d="M119 62 92 78 66 101 51 177 82 184 100 126 101 263 219 263 220 126 238 184 269 177 254 101 228 78 201 62 184 80 160 90 136 80Z" {...outline}/><path d="m136 80 24 28 24-28M160 108v155M111 151h28v33h-28M181 151h28v33h-28M100 126l18-25M220 126l-18-25" {...seam}/><Measure x1="103" y1="139" x2="217" y2="139" label="A" mx="160" my="122"/><Measure x1="120" y1="72" x2="200" y2="72" label="B" mx="160" my="53"/><Measure x1="215" y1="96" x2="215" y2="259" label="C" mx="241" my="180"/><Measure x1="229" y1="91" x2="254" y2="173" label="D" mx="274" my="128"/></Base>;
}
export function BottomMeasurementSvg() {
  return <Base label="Bottom"><path d="M112 40h96l13 88-16 153h-39l-6-116-6 116h-39L99 128Z" {...outline}/><path d="M103 72h114M101 95h118M160 42v75M160 117c-16 17-21 34-20 51M160 117c16 17 21 34 20 51" {...seam}/><Measure x1="105" y1="56" x2="215" y2="56" label="A" mx="236" my="56"/><Measure x1="103" y1="91" x2="217" y2="91" label="B" mx="238" my="91"/><Measure x1="160" y1="64" x2="160" y2="132" label="C" mx="181" my="116"/><Measure x1="111" y1="128" x2="153" y2="128" label="D" mx="91" my="128"/><Measure x1="160" y1="143" x2="160" y2="279" label="E" mx="181" my="211"/><Measure x1="218" y1="43" x2="202" y2="279" label="F" mx="236" my="211"/><Measure x1="166" y1="276" x2="205" y2="276" label="G" mx="186" my="296"/></Base>;
}
export function ShortsMeasurementSvg() {
  return <Base label="Shorts"><path d="M104 58h112l10 70-17 102-47-2-2-58-2 58-47 2-17-102Z" {...outline}/><path d="M99 91h122M97 115h126M160 60v64M160 124c-13 15-18 29-18 46M160 124c13 15 18 29 18 46" {...seam}/><Measure x1="101" y1="74" x2="219" y2="74" label="A" mx="241" my="74"/><Measure x1="99" y1="111" x2="221" y2="111" label="B" mx="242" my="111"/><Measure x1="160" y1="82" x2="160" y2="139" label="C" mx="181" my="133"/><Measure x1="106" y1="138" x2="153" y2="138" label="D" mx="86" my="138"/><Measure x1="160" y1="150" x2="160" y2="224" label="E" mx="181" my="190"/><Measure x1="220" y1="61" x2="207" y2="226" label="F" mx="241" my="190"/><Measure x1="163" y1="224" x2="210" y2="224" label="G" mx="187" my="246"/></Base>;
}

const SVG_BY_CATEGORY = {tee:TeeMeasurementSvg,shirt:ShirtMeasurementSvg,hoodie:HoodieMeasurementSvg,jacket:JacketMeasurementSvg,bottom:BottomMeasurementSvg,shorts:ShortsMeasurementSvg};
export default function MeasurementIllustration({category}) {
  const Component = SVG_BY_CATEGORY[category];
  return Component ? <Component/> : null;
}
