import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ship Replacement Program - Bombers Bar",
  description: "Ship Replacement Program",
  openGraph: {
    title: "Ship Replacement Program - Bombers Bar",
    description: "Ship Replacement Program",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "Ship Replacement Program - Bombers Bar",
    description: "Ship Replacement Program",
    images: ["/logo.png"],
  },
};

export default function SRPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
