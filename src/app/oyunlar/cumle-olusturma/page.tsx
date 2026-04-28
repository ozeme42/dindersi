
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Shuffle, Loader2 } from 'lucide-react';

function CumleOlusturmaPage() {
    return (
        <OyunKurulum 
            gameName="Cümle Oluşturma"
            gameIcon={Shuffle}
            gamePath="cumle-olusturma"
            dataType="games"
            isStatic={false}
        />
    );
}

export default function CumleOlusturmaSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <CumleOlusturmaPage />
        </Suspense>
    );
}
