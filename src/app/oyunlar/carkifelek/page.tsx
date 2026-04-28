
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Star, Loader2 } from 'lucide-react';

function CarkifelekPage() {
    return (
        <OyunKurulum 
            gameName="Çarkıfelek"
            gameIcon={Star}
            gamePath="carkifelek"
            dataType="games"
            isStatic={false}
        />
    );
}

export default function CarkifelekSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <CarkifelekPage />
        </Suspense>
    );
}
