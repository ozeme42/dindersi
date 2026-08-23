import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { Providers } from '@/components/providers';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

const poppins = Poppins({
  weight: ['600', '700', '800', '900'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Değerler Oyunu',
  description: 'Değerler Oyunu - Eğlenerek Değerlerimizi Öğrenelim',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-body`}>
          <Providers>
              {children}
              <Toaster />
              <Suspense fallback={<div className="fixed bottom-0 left-0 right-0 h-[70px] bg-slate-950 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white"/></div>}>
                <BottomNavBar />
              </Suspense>
          </Providers>
      </body>
    </html>
  );
}
