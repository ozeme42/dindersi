"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '../oyun-kurulum/page';
import { Search, Loader2 } from 'lucide-react';

function KelimeAviPage() {
    return (
        <OyunKurulum 
            gameName="Kelime Avı"
            gameIcon={Search}
            gamePath="kelime-avi"
        />
    );
}

export default function KelimeAviSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <KelimeAviPage />
        </Suspense>
    );
}
