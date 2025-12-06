
'use client';

import React, { Suspense } from 'react';
import OyunKurulum from '@/app/oyunlar/oyun-kurulum/page';
import { BookOpen, Loader2 } from 'lucide-react';

function OzetlerPage() {
    return (
        <div className="pb-20 md:pb-0">
            <OyunKurulum 
                gameName="Konu Özetleri"
                gameIcon={BookOpen}
                gamePath="ozetler"
                isGame={false}
            />
        </div>
    );
}

export default function OzetlerSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <OzetlerPage />
        </Suspense>
    );
}
