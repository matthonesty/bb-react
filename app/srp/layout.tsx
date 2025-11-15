import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'Ship Replacement Program',
  description: 'View and manage SRP requests for fleet losses',
});

export default function SRPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
