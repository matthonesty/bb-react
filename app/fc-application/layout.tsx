import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'FC Application',
  description: 'Apply to become a Fleet Commander for Bombers Bar',
});

export default function FCApplicationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
