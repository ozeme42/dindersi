"use client";

import React, { Suspense } from 'react';
import OyunKurulum from '../oyun-kurulum/page';
import { FolderKanban, Loader2 } from 'lucide-react';

function KategorilereAyirPage() {
    return (
        <OyunKurulum 
            gameName="Kategorilere Ayır"
            gameIcon={FolderKanban}
            gamePath="kategorilere-ayir"
        />
    );
}

export default function KategorilereAyirSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <KategorilereAyirPage />
        </Suspense>
    );
}
