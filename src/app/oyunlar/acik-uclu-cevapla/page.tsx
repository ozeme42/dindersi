
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Pencil, Loader2 } from 'lucide-react';

function AcikUcluCevaplaPage() {
    return (
        <OyunKurulum 
            gameName="Açık Uçlu Cevapla"
            gameIcon={Pencil}
            gamePath="acik-uclu-cevapla"
            dataType="games"
        />
    );
}

export default function AcikUcluCevaplaSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <AcikUcluCevaplaPage />
        </Suspense>
    );
}
