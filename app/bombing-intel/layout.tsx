import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'Bombing Intel',
  description: 'Submit and view bombing intelligence reports',
});

export default function BombingIntelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
