
'use client';

import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Gamepad2 } from 'lucide-react';
import { OyunKurulum } from '@/components/oyun-kurulum';


function OyunKurulumWrapper() {
    return (
        <OyunKurulum
            pageTitle="Oyun Kurulumu"
            pageIcon={Gamepad2}
            targetPath="oyunlar"
            dataType="games"
        />
    );
}

export default function OyunKurulumSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <OyunKurulumWrapper />
        </Suspense>
    );
}
