import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'Ban List',
  description: 'Manage banned characters, corporations, and alliances',
});

export default function BansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
