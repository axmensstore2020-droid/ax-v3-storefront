import InfoPage from '../../components/InfoPage';
import {StylistButton} from '../../components/StylistProvider';
import {stylistConfigured} from '../../lib/stylist/http';
import Icon from '../../components/Icon';
export const metadata={title:'How AX Stylist works'};
export const dynamic='force-dynamic';

// Keep customer-facing explanations focused on AX; named processors live in the Privacy Policy.
export default function StylistInfoPage() {
  const available=stylistConfigured();
  const images=available && process.env.AX_STYLIST_IMAGES_ENABLED==='true';
  return <InfoPage eyebrow="AX STYLIST" title="A little direction. Your own style.">
    <h2>{available ? 'Meet your AI shopping stylist.' : 'Personal AI styling is being prepared.'}</h2>
    <p>{available ? 'Ask AX about outfits, fabrics, colour pairings, product numbers or store information. The assistant searches the live AX catalog. Open a recommended piece to choose size and colour, then add it to your bag yourself.' : 'You can browse collections today. AI conversations and saved profiles remain disabled until our live setup and checks are complete.'}</p>
    <h2>Size guidance, with real measurements</h2>
    <p>On a product page, choose “Find my size with AX”, then enter optional body measurements in “My fit & style”. AX compares these with that product’s approved body-size ranges. Garment charts are different from body measurements. Height alone is never used to guess a size.</p>
    <p>If AX has not supplied a complete guide, the Stylist will ask for more information or suggest contacting our team. Fit estimates are not guarantees. It will not silently recommend a larger size when your measurements are outside the chart.</p>
    <h2>Photos</h2>
    <p>{images ? 'You can attach a clothing photo for colour and pairing ideas. ' : 'Photo styling is not enabled yet. When enabled, you can attach a clothing photo for colour and pairing ideas. '}Photos are resized in your browser and re-encoded without location metadata before sending. The feature looks at clothing, not your identity, health or body measurements. Lighting may change how colours appear. Do not upload private documents or intimate photos.</p>
    <h2>What is sent and stored?</h2>
    <ul>
      <li>When you agree and send a message, your message, recent chat context, relevant fit/profile details and any selected clothing photo may be processed by trusted third-party service providers used to operate AX Stylist. AX product and policy data relevant to your request may also be processed.</li>
      <li>AX does not save chat transcripts or photos to its profile database. Recent text and a short summary of older preferences are kept temporarily in this open chat in your browser, including a signed continuation token. Closing or clearing the chat removes that local chat state. Photos are used for the current reply only.</li>
      <li>“Save profile” is optional and has a separate agreement. It saves the measurements and preferences you entered in AX’s private profile storage, linked to this browser using an anonymous cookie, for up to 30 days. It is not linked to your store login and does not follow you across devices.</li>
      <li>An essential anonymous cookie and short-lived usage counters help limit abuse and cost. A protected hash of your IP may be used if the hosting proxy is configured for it. AX records pseudonymous request counts, response times, processing usage and errors for 30 days to maintain this service. These records contain no message text, measurements or photos.</li>
      <li>AX does not ask its AI service provider to keep conversation state. Some service providers may retain limited data for security, abuse-prevention, operational logs or backups under their own settings and applicable terms. Named providers and their roles are listed in our <a href="/policies#service-providers">Privacy Policy service-provider disclosure</a>.</li>
    </ul>
    <h2>Your controls</h2>
    <p>Use “Clear chat” to clear this conversation. Use “Delete saved profile” to remove your stored fit/profile and clear this chat. Deleting the profile does not reset usage limits or delete store accounts, orders or checkout data. Delete your profile before clearing site cookies; otherwise this browser will lose the anonymous link needed to access it.</p>
    <h2>What AX Stylist does not do</h2>
    <p>It is an AI, not a human support agent. Unrelated questions receive a polite return to shopping. It does not offer professional advice, process payments, change orders, issue refunds, promise discounts or contact staff for you. Never share passwords, OTPs, card details or private account documents in chat.</p>
    <p>For order help, product measurements or data questions, email <a href="mailto:contact@axstore.in">contact@axstore.in</a>. AX Stylist does not process payments or modify account, checkout or order records.</p>
    <StylistButton className="underlined-link">OPEN AX STYLIST <Icon name="arrow"/></StylistButton>
  </InfoPage>;
}