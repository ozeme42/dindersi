
'use client';

import { ThemeProvider } from '@/context/theme-provider';
import { AuthProvider } from '@/context/auth-context';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider
            storageKey="degerler-oyunu-theme"
            defaultTheme="default"
            defaultMode="system"
        >
            <AuthProvider>
                {children}
            </AuthProvider>
        </ThemeProvider>
    );
}
