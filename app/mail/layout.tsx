import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Processed Mails - Bombers Bar",
  description: "Processed Mails",
  openGraph: {
    title: "Processed Mails - Bombers Bar",
    description: "Processed Mails",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "Processed Mails - Bombers Bar",
    description: "Processed Mails",
    images: ["/logo.png"],
  },
};

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
