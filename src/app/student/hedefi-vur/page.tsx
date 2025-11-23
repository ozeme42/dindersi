
"use client";

import { Suspense } from 'react';
import { HedefiVurSetupClientPage } from './client-page';

export default function HedefiVurPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <HedefiVurSetupClientPage />
        </Suspense>
    );
}
