"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '../oyun-kurulum/page';
import { ArrowDownUp, Loader2 } from 'lucide-react';

function OlaySiralamaPage() {
    return (
        <OyunKurulum 
            gameName="Olay Sıralama"
            gameIcon={ArrowDownUp}
            gamePath="olay-siralama"
        />
    );
}

export default function OlaySiralamaSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <OlaySiralamaPage />
        </Suspense>
    );
}
