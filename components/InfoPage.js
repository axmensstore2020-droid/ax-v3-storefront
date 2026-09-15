import Link from 'next/link';
export default function InfoPage({eyebrow='AX MEN’S STORE',title,intro,children,wide=false}) {
 return <main id="main-content" className={`info-page${wide?' info-wide':''}`}><Link className="info-back" href="/">AX / {eyebrow}</Link><header className="info-heading"><h1>{title}</h1>{intro && <p>{intro}</p>}</header>{children}</main>;
}
