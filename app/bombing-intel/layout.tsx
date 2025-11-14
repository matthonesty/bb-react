import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bombing Intel - Bombers Bar",
  description: "Bombing Intel",
  openGraph: {
    title: "Bombing Intel - Bombers Bar",
    description: "Bombing Intel",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "Bombing Intel - Bombers Bar",
    description: "Bombing Intel",
    images: ["/logo.png"],
  },
};

export default function BombingIntelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
