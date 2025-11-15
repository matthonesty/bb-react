import { generatePageMetadata } from '@/lib/utils/metadata';

export const metadata = generatePageMetadata({
  title: 'Processed Mails',
  description: 'View EVE in-game mails processed by the automated SRP mailer system',
});

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
