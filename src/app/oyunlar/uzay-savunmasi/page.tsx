"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Rocket, Loader2 } from 'lucide-react';

function UzaySavunmasiPage() {
    return (
        <OyunKurulum 
            gameName="Uzay Savunması"
            gameIcon={Rocket}
            gamePath="uzay-savunmasi"
            dataType="games"
            isStatic={true}
        />
    );
}

export default function UzaySavunmasiSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <UzaySavunmasiPage />
        </Suspense>
    );
}
