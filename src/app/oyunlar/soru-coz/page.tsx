"use client";

import React, { Suspense } from 'react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { BrainCircuit, Loader2 } from 'lucide-react';

function SoruCozPage() {
    return (
        <OyunKurulum 
            gameName="Soru Çöz"
            gameIcon={BrainCircuit}
            gamePath="soru-coz"
            dataType="questions"
            isStatic={true}
        />
    );
}

export default function SoruCozSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <SoruCozPage />
        </Suspense>
    );
}
