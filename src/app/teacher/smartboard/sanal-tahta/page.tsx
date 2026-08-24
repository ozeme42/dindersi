'use client';

import React from 'react';
import { PresentationDrawingBoard } from '@/components/presentation-drawing-board';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function VirtualBoardPage() {
    const router = useRouter();

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#020617]">
            <PresentationDrawingBoard
                isOpen={true}
                onClose={() => router.push('/teacher/smartboard')}
                isDarkMode={true}
            />
            {/* Hızlı Çıkış Butonu */}
            <div className="fixed top-4 left-4 z-[60]">
                <Button asChild variant="ghost" size="sm" className="bg-slate-900/90 hover:bg-slate-800 text-white border border-white/20 rounded-xl backdrop-blur-xl gap-2 shadow-xl">
                    <Link href="/teacher/smartboard">
                        <ArrowLeft className="w-4 h-4" /> Akıllı Tahta Menüsü
                    </Link>
                </Button>
            </div>
        </div>
    );
}
