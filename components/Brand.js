export default function Brand({ inverse = false }) {
  return <span className={`brand-mark${inverse ? ' inverse' : ''}`}><img src="/ax-logo.webp" alt="AX" width="320" height="186" decoding="async"/></span>;
}
