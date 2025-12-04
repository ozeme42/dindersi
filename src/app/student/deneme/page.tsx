"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '../oyun-kurulum/page';
import { ClipboardCheck, Loader2 } from 'lucide-react';

function DenemePage() {
    return (
        <OyunKurulum 
            gameName="Deneme Sınavı"
            gameIcon={ClipboardCheck}
            gamePath="deneme"
        />
    );
}

export default function DenemeSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <DenemePage />
        </Suspense>
    );
}
