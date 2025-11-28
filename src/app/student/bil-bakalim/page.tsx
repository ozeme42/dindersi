
"use client";

import { Suspense } from 'react';
import BilBakalimSetupClientPage from './client-page';

export default function BilBakalimPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <BilBakalimSetupClientPage />
        </Suspense>
    );
}
