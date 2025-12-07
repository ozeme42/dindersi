
"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '@/app/oyunlar/oyun-kurulum/SetupComponent';
import { Wind, Loader2 } from 'lucide-react';

function TornadoPage() {
    return (
        <OyunKurulum 
            gameName="Tornado"
            gameIcon={Wind}
            gamePath="tornado"
        />
    );
}

export default function TornadoSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <TornadoPage />
        </Suspense>
    );
}
