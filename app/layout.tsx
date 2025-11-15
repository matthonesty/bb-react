import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.bombers.bar'),
  title: 'Bombers Bar - EVE Online NPSI Stealth Bomber Community',
  description: 'Join EVE Online\'s premier NPSI stealth bomber community. Fly with us in organized torpedo runs, participate in epic fleet battles, and experience coordinated bombing strikes. All are welcome - Not Purple Shoot It!',
  keywords: ['EVE Online', 'NPSI', 'Bombers Bar', 'Stealth Bombers', 'Fleet PvP', 'Torpedoes', 'Bombing Runs', 'Public Fleets'],
  openGraph: {
    type: 'website',
    url: 'https://www.bombers.bar',
    title: 'Bombers Bar - EVE Online NPSI Stealth Bomber Community',
    description: 'EVE Online\'s premier NPSI stealth bomber community. Join organized fleet operations, learn bombing tactics, and fly with experienced FCs. All pilots welcome!',
    siteName: 'Bombers Bar',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Bombers Bar Logo - EVE Online NPSI Community',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bombers Bar - EVE Online NPSI Stealth Bomber Community',
    description: 'Join EVE Online\'s premier NPSI stealth bomber community. Organized fleets, experienced FCs, epic bombing runs. All pilots welcome!',
    images: ['/logo.png'],
  },
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
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}
