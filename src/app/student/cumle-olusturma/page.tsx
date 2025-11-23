
"use client";

import { Suspense } from 'react';
import { CumleOlusturmaSetupClientPage } from './client-page';

export default function CumleOlusturmaPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <CumleOlusturmaSetupClientPage />
        </Suspense>
    );
}
