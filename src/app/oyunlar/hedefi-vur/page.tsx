
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { MousePointerClick, Loader2 } from 'lucide-react';

function HedefiVurPage() {
    return (
        <OyunKurulum 
            gameName="Hedefi Vur"
            gameIcon={MousePointerClick}
            gamePath="hedefi-vur"
            dataType="games"
        />
    );
}

export default function HedefiVurSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <HedefiVurPage />
        </Suspense>
    );
}
