import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'Doctrines',
  description: 'Manage fleet types and ship fittings (doctrines)',
});

export default function DoctrinesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
