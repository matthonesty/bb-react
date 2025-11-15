import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'SRP Config',
  description: 'Configure SRP payouts for ship types',
});

export default function SRPConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
