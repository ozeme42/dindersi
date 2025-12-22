
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Target, Loader2 } from 'lucide-react';

function BalonAvcisiPage() {
    return (
        <OyunKurulum 
            gameName="Balon Avcısı"
            gameIcon={Target}
            gamePath="balon-avcisi"
            dataType="games"
            isStatic={true}
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
