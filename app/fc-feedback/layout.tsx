import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FC Feedback - Bombers Bar",
  description: "FC Feedback",
  openGraph: {
    title: "FC Feedback - Bombers Bar",
    description: "FC Feedback",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "FC Feedback - Bombers Bar",
    description: "FC Feedback",
    images: ["/logo.png"],
  },
};

export default function FCFeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
