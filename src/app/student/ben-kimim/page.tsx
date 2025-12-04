"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '../oyun-kurulum/page';
import { BrainCircuit, Loader2 } from 'lucide-react';

function BenKimimPage() {
    return (
        <OyunKurulum 
            gameName="Ben Kimim?"
            gameIcon={BrainCircuit}
            gamePath="ben-kimim"
        />
    );
}

export default function BenKimimSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <BenKimimPage />
        </Suspense>
    );
}
