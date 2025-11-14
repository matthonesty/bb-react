import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bombers Bar - EVE Online Fleet Management & SRP",
  description: "Ship Replacement Program and Fleet Management for Bombers Bar - EVE Online",
  keywords: ["EVE Online", "Bombers Bar", "SRP", "Fleet Management", "EVE SSO"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <QueryProvider>
          <Header />
          <main className="flex-1 w-full">
            {children}
          </main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}
