import { Instrument_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata = { title: 'IJIPB — Interview Prep Coach' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
