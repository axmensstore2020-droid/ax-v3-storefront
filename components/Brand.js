export default function Brand({ inverse = false }) {
  return <span className={`brand-mark${inverse ? ' inverse' : ''}`}><img src="/ax-logo.jpg" alt="AX" width="1536" height="1536"/></span>;
}
