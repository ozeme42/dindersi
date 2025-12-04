"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '../oyun-kurulum/page';
import { Link2, Loader2 } from 'lucide-react';

function DYZinciriPage() {
    return (
        <OyunKurulum 
            gameName="Doğru/Yanlış Zinciri"
            gameIcon={Link2}
            gamePath="dogru-yanlis-zinciri"
        />
    );
}

export default function DYZinciriSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <DYZinciriPage />
        </Suspense>
    );
}
