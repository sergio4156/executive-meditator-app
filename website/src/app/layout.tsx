import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Executive Meditator | Profits, Productivity & Peace',
  description:
    'The Executive Meditator app is designed for high-performing leaders who understand that true excellence requires stillness. Experience the 3 P\'s — Profits, Productivity, and Peace — in just 3 weeks.',
  keywords: [
    'executive meditation',
    'mindfulness for executives',
    'leadership meditation',
    'productivity meditation',
    'corporate wellness',
    'executive performance',
  ],
  authors: [{ name: 'The Executive Meditator' }],
  openGraph: {
    title: 'The Executive Meditator | Profits, Productivity & Peace',
    description:
      'Designed for high-performing leaders. Experience the 3 P\'s — Profits, Productivity, and Peace — in just 3 weeks.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="font-sans bg-cream-50 text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
