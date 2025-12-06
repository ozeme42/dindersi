
"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '../oyun-kurulum/page';
import { Milestone, Loader2 } from 'lucide-react';

function LabirentPage() {
    return (
        <OyunKurulum 
            gameName="Labirent"
            gameIcon={Milestone}
            gamePath="labirent"
        />
    );
}

export default function LabirentSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <LabirentPage />
        </Suspense>
    );
}
