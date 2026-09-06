'use client';

import React, { Suspense } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { OyunKurulum } from '@/components/oyun-kurulum';


function OzetlerPage() {
    return (
        <div className="pb-20 md:pb-0">
            <OyunKurulum 
                pageTitle="Konu Özetleri"
                pageIcon={BookOpen}
                targetPath="student/ozetler"
                dataType="ozetler"
                isStatic={true} // Menü listeden (manifest) gelsin, ama tıklanınca canlı DB'ye gitsin
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
