import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet - Bombers Bar",
  description: "Wallet History",
  openGraph: {
    title: "Wallet - Bombers Bar",
    description: "Wallet History",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "Wallet - Bombers Bar",
    description: "Wallet History",
    images: ["/logo.png"],
  },
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
