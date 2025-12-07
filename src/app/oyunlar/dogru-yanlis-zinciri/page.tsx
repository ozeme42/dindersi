
"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '@/app/oyunlar/oyun-kurulum/SetupComponent';
import { Link2, Loader2 } from 'lucide-react';

function DogruYanlisZinciriPage() {
    return (
        <OyunKurulum 
            gameName="Doğru/Yanlış Zinciri"
            gameIcon={Link2}
            gamePath="dogru-yanlis-zinciri"
        />
    );
}

export default function DogruYanlisZinciriSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <DogruYanlisZinciriPage />
        </Suspense>
    );
}
