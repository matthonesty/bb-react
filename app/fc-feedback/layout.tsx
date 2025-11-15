import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'FC Feedback',
  description: 'Provide feedback on Fleet Commander performance',
});

export default function FCFeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
