function AXRouteLineLoader({label}) {
  const track='M 38 80 C 76 22 116 138 160 80 C 204 22 244 138 282 80';
  return <div className="ax-line-loader" role="status" aria-live="polite" aria-label={label}>
    <svg className="ax-line-loader-svg" viewBox="0 0 320 160" aria-hidden="true">
      <path className="ax-line-loader-path" d={track}>
        <animate
          attributeName="d"
          dur="2.8s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines=".42 0 .2 1;.42 0 .2 1"
          values="M 38 80 C 74 40 116 40 160 80 C 204 120 246 120 282 80;M 38 80 C 76 22 116 138 160 80 C 204 22 244 138 282 80;M 38 80 C 74 40 116 40 160 80 C 204 120 246 120 282 80"
        />
      </path>
      <image className="ax-line-loader-mark" href="/ax-logo-160.webp" x="-20" y="-12" width="40" height="24" preserveAspectRatio="xMidYMid meet">
        <animateMotion dur="2.8s" repeatCount="indefinite" rotate="0" path={track}/>
      </image>
    </svg>
  </div>;
}

export default function AXParticleLoader({variant='route',label='Loading',showLabel=true}) {
  if(variant==='route') return <AXRouteLineLoader label={label}/>;

  const rings=[
    {name:'a',count:14},
    {name:'b',count:12},
    {name:'c',count:10},
    {name:'d',count:8}
  ];
  return <div className={`ax-particle-loader ax-particle-loader-${variant}`} role="status" aria-live="polite" aria-label={label}>
    <div className="ax-particle-sphere" aria-hidden="true">
      {rings.map(ring=><span className={`ax-particle-ring ax-particle-ring-${ring.name}`} key={ring.name}>
        {Array.from({length:ring.count},(_,index)=><i key={index} style={{'--ax-dot-index':index,'--ax-dot-count':ring.count}}/> )}
      </span>)}
      <span className="ax-particle-axis"/>
    </div>
    {showLabel && <span className="ax-particle-label">{label}</span>}
  </div>;
}
