export default function AXParticleLoader({variant='route',label='Loading',showLabel=true}) {
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
