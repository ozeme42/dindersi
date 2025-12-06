
"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '../oyun-kurulum/page';
import { Skull, Loader2 } from 'lucide-react';

function AdamAsmacaPage() {
    return (
        <OyunKurulum 
            gameName="Adam Asmaca"
            gameIcon={Skull}
            gamePath="adam-asmaca"
        />
    );
}

export default function AdamAsmacaSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <AdamAsmacaPage />
        </Suspense>
    );
}
