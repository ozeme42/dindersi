"use client";

import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Loader2 } from 'lucide-react';
import Link from 'next/link';

function MilyonerPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 font-sans relative overflow-hidden bg-[#000022]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a5c_0%,_#000022_100%)] -z-10"></div>
            
            <div className="w-48 h-48 rounded-full border-4 border-yellow-600 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(212,175,55,0.5)] bg-gradient-to-br from-blue-900 to-black animate-pulse">
                <Trophy className="w-24 h-24 text-yellow-400" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 drop-shadow-lg">
                KİM 1000 PUAN İSTER?
            </h1>
            <p className="text-gray-300 mb-8 text-lg font-medium">Bilgilerini Test Et, Büyük Ödülü Kazan!</p>
            <Button asChild size="lg" className="px-12 py-8 bg-gradient-to-r from-blue-800 to-blue-600 border-2 border-gray-400 rounded-full text-white text-xl font-bold hover:border-yellow-500 hover:text-yellow-400 hover:scale-105 transition-all shadow-lg">
                <Link href="/oyunlar/milyoner-yarismasi/oyun">
                    YARIŞMAYA BAŞLA
                </Link>
            </Button>
      </div>
    );
}

export default function MilyonerSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <MilyonerPage />
        </Suspense>
    );
}
