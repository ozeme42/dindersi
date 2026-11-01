"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Bomb, Loader2 } from 'lucide-react';

function SaatliBombaPage() {
    return (
        <OyunKurulum 
            gameName="Saatli Bomba"
            gameIcon={Bomb}
            gamePath="saatli-bomba"
            dataType="games"
            isStatic={true}
        />
    );
}

export default function SaatliBombaSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <SaatliBombaPage />
        </Suspense>
    );
}
