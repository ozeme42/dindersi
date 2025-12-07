
"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '@/app/oyunlar/oyun-kurulum/SetupComponent';
import { BrainCircuit, Loader2 } from 'lucide-react';

function KavramYarismasiPage() {
    return (
        <OyunKurulum 
            gameName="Kavram Yarışması"
            gameIcon={BrainCircuit}
            gamePath="kavram-yarismasi"
        />
    );
}

export default function KavramYarismasiSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <KavramYarismasiPage />
        </Suspense>
    );
}
