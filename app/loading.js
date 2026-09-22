import AXParticleLoader from '../components/AXParticleLoader';

export default function Loading(){
  return <main id="main-content" className="ax-route-loading" aria-busy="true">
    <AXParticleLoader variant="route" label="Loading AX" />
  </main>;
}
