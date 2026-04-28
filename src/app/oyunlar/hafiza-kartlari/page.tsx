
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Layers, Loader2 } from 'lucide-react';

function HafizaKartlariPage() {
    return (
        <OyunKurulum 
            gameName="Hafıza Kartları"
            gameIcon={Layers}
            gamePath="hafiza-kartlari"
            dataType="games"
            isStatic={false}
        />
    );
}

export default function HafizaKartlariSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <HafizaKartlariPage />
        </Suspense>
    );
}
