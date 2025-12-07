'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { YazilacaklarClientPage } from './YazilacaklarClientPage';

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-500"/></div>}>
            <YazilacaklarClientPage />
        </Suspense>
    );
}
