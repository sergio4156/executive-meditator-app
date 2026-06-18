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
  title: 'The Executive Meditator | Peace, Productivity & Profits',
  description:
    'Become an Executive Meditator — no title required. In just 21 days, the Great Silence becomes a permanent capacity: 10 seconds of inner stillness, accessible anytime, for life.',
  keywords: [
    'executive meditator',
    'meditation app',
    '10 second meditation',
    'great silence',
    'mindfulness for anyone',
    'corporate meditation',
    'workplace wellness',
    '21 day meditation program',
  ],
  authors: [{ name: 'The Executive Meditator' }],
  openGraph: {
    title: 'The Executive Meditator | Peace, Productivity & Profits',
    description:
      'Become an Executive Meditator in 21 days. Lifetime access to the Great Silence — 10 seconds of inner stillness, anytime, for life.',
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
