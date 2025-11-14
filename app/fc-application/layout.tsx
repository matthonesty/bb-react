import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FC Application - Bombers Bar",
  description: "FC Application",
  openGraph: {
    title: "FC Application - Bombers Bar",
    description: "FC Application",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "FC Application - Bombers Bar",
    description: "FC Application",
    images: ["/logo.png"],
  },
};

export default function FCApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
