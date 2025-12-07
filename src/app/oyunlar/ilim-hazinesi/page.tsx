
"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '@/app/oyunlar/oyun-kurulum/SetupComponent';
import { BookOpen, Loader2 } from 'lucide-react';

function IlimHazinesiPage() {
    return (
        <OyunKurulum
            gameName="İlim Hazinesi"
            gameIcon={BookOpen}
            gamePath="ilim-hazinesi"
        />
    );
}

export default function IlimHazinesiSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <IlimHazinesiPage />
        </Suspense>
    );
}
