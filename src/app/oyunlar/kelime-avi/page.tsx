
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Search, Loader2 } from 'lucide-react';

function KelimeAviPage() {
    const isStatic = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';
    return (
        <OyunKurulum 
            gameName="Kelime Avı"
            gameIcon={Search}
            gamePath="kelime-avi"
            dataType="games"
            isStatic={isStatic}
        />
    );
}

export default function KelimeAviSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <KelimeAviPage />
        </Suspense>
    );
}
