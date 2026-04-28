
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Trophy, Loader2 } from 'lucide-react';

function MilyonerPage() {
    return (
        <OyunKurulum 
            gameName="Kim 1000 Puan İster?"
            gameIcon={Trophy}
            gamePath="milyoner-yarismasi"
            dataType="games"
            isStatic={false}
        />
    );
}

export default function MilyonerSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <MilyonerPage />
        </Suspense>
    );
}
