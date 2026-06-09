"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Lock, Loader2 } from 'lucide-react';

function SiberSifreKiriciPage() {
    return (
        <OyunKurulum 
            gameName="Siber Şifre Kırıcı"
            gameIcon={Lock}
            gamePath="siber-sifre-kirici"
            dataType="games"
            isStatic={true}
        />
    );
}

export default function SiberSifreKiriciSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <SiberSifreKiriciPage />
        </Suspense>
    );
}
