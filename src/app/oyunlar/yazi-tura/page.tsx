
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Coins, Loader2 } from 'lucide-react';

function YaziTuraPage() {
    return (
        <OyunKurulum 
            gameName="Yazı Tura"
            gameIcon={Coins}
            gamePath="yazi-tura"
            dataType="games"
            isStatic={false}
        />
    );
}

export default function YaziTuraSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <YaziTuraPage />
        </Suspense>
    );
}
