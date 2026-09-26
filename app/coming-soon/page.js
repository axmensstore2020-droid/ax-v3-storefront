import ComingSoonClient from './ComingSoonClient';

export const metadata = {
  title: 'AX — Play Before We Go Live',
  description: 'AX goes live Thursday, 1 October at 4:00 PM IST. Beat AX in the Playroom before launch and unlock 10% off for launch day.',
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return <ComingSoonClient />;
}
