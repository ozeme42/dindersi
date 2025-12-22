
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Link2, Loader2 } from 'lucide-react';

function DogruYanlisZinciriPage() {
    const isStatic = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';
    return (
        <OyunKurulum 
            gameName="Doğru/Yanlış Zinciri"
            gameIcon={Link2}
            gamePath="dogru-yanlis-zinciri"
            dataType="games"
            isStatic={isStatic}
        />
    );
}

export default function DogruYanlisZinciriSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <DogruYanlisZinciriPage />
        </Suspense>
    );
}
