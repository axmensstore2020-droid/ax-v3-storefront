import AXParticleLoader from '../components/AXParticleLoader';

export default function Loading(){
  return <div className="ax-route-loading" aria-busy="true">
    <AXParticleLoader variant="route" label="Loading AX" />
  </div>;
}
