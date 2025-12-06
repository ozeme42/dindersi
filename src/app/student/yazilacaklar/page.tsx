'use client';

import React, { Suspense } from 'react';
import OyunKurulum from '@/app/oyunlar/oyun-kurulum/page';
import { Columns, Loader2 } from 'lucide-react';

function YazilacaklarPage() {
    return (
        <OyunKurulum 
            gameName="Yazılacaklar"
            gameIcon={Columns}
            gamePath="yazilacaklar"
            isGame={false}
        />
    );
}

export default function YazilacaklarSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <YazilacaklarPage />
        </Suspense>
    );
}
