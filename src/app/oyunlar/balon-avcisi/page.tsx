
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Target, Loader2 } from 'lucide-react';

function BalonAvcisiPage() {
    const isStatic = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';
    return (
        <OyunKurulum 
            gameName="Balon Avcısı"
            gameIcon={Target}
            gamePath="balon-avcisi"
            dataType="games"
            isStatic={isStatic}
        />
    );
}

export default function BalonAvcisiSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <BalonAvcisiPage />
        </Suspense>
    );
}
