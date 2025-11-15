import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'Wallet',
  description: 'View corporation wallet journal entries',
});

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
