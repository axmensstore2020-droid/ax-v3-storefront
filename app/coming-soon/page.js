import ComingSoonClient from './ComingSoonClient';

export const metadata = {
  title: 'AX — Coming Soon',
  description: 'Inspired by the fear of being average. AX goes live Sunday at 12:00 PM IST.',
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return <ComingSoonClient />;
}
