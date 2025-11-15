import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'Fleet Commanders',
  description: 'Manage fleet commanders and their access levels',
});

export default function FCsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
