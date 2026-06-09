'use client';

import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { Providers } from '@/components/providers';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <title>Değerler Oyunu</title>
        <meta name="description" content="Değerler Oyunu - Eğlenerek Değerlerimizi Öğrenelim" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#020617" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
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
