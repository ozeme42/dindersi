
"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Crosshair, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function KavramAviPage() {
    const searchParams = useSearchParams();
    const isStatic = searchParams.get('isStatic') === 'true';

    return (
        <OyunKurulum 
            gameName="Kavram Avı"
            gameIcon={Crosshair}
            gamePath="kavram-avi"
            dataType="games"
            isStatic={isStatic}
        />
    );
}

export default function KavramAviSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <KavramAviPage />
        </Suspense>
    );
}
