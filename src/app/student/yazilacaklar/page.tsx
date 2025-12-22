
'use client';

import React, { Suspense } from 'react';
import { Columns, Loader2 } from 'lucide-react';
import OyunKurulum from '@/app/oyunlar/oyun-kurulum/SetupComponent';

function YazilacaklarPage() {
    return (
        <div className="pb-20 md:pb-0">
            <OyunKurulum
                pageTitle="Yazılacaklar"
                pageIcon={Columns}
                targetPath="student/yazilacaklar"
                dataType="yazilacaklar"
            />
        </div>
    );
}

export default function YazilacaklarSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <YazilacaklarPage />
        </Suspense>
    );
}
