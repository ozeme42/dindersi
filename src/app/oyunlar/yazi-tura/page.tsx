
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Trophy, Loader2 } from 'lucide-react';

function YaziTuraPage() {
    return (
        <OyunKurulum 
            gameName="Gol Kralı"
            gameIcon={Trophy}
            gamePath="yazi-tura"
            dataType="games"
            isStatic={true}
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
