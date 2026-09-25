import ComingSoonClient from './ComingSoonClient';

export const metadata = {
  title: 'AX — Coming Soon',
  description: 'AX goes live Sunday at 12:00 PM IST. Mark the launch and be among the first 10 purchases.',
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return <ComingSoonClient />;
}
