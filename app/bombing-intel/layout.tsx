import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'Bombing Intel',
  description: 'Submit Intel to Bombers Bar',
});

export default function BombingIntelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
