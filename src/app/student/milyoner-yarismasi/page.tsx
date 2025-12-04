"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '../oyun-kurulum/page';
import { Trophy, Loader2 } from 'lucide-react';

function MilyonerYarismasiPage() {
    return (
        <OyunKurulum 
            gameName="Milyoner Yarışması"
            gameIcon={Trophy}
            gamePath="milyoner-yarismasi"
        />
    );
}

export default function MilyonerYarismasiSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <MilyonerYarismasiPage />
        </Suspense>
    );
}
