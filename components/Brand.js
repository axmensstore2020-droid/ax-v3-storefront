export default function Brand({ inverse = false }) {
  return <span className={`brand-mark${inverse ? ' inverse' : ''}`}><img src="/ax-logo-160.webp" srcSet="/ax-logo-96.webp 96w, /ax-logo-160.webp 160w, /ax-logo-240.webp 240w, /ax-logo.webp 320w" sizes="(max-width:700px) 60px, 80px" alt="AX" width="320" height="186" decoding="async"/></span>;
}
