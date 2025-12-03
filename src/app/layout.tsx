
'use client'; // This directive is added to resolve the ChunkLoadError

import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { Providers } from '@/components/providers';

// Metadata can still be exported from a client component layout in Next.js 13+
// but it's often better to move it to the page level if the layout is client-side.
// For now, we'll keep it here as it might still work depending on the Next.js version.
// export const metadata: Metadata = {
//   title: 'Değerler Oyunu',
//   description: 'Değerler Oyunu - Eğlenerek Değerlerimizi Öğrenelim',
// };

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <div className="bg-gradient-to-br from-primary/10 via-blue-50/50 to-rose-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-rose-950">
          <Providers>
              {children}
              <Toaster />
          </Providers>
        </div>
      </body>
    </html>
  );
}
