
'use client';

import { useState } from "react";
import Link from 'next/link';
import { Gamepad2, BrainCircuit, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, Layers, FolderKanban, MousePointerClick, Trophy, ArrowDownUp, Link as LinkIcon, Coins, Pencil, ClipboardCheck } from 'lucide-react';
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";

const smartboardGames = [
  { href: '/teacher/smartboard/milyoner-yarismasi', label: 'Milyoner', icon: Trophy, colorClass: "from-purple-500 to-purple-800 border-purple-500/50 text-purple-100 hover:shadow-purple-500/40" },
  { href: '/teacher/smartboard/yazi-tura', label: 'Yazı Tura', icon: Coins, colorClass: "from-amber-500 to-amber-800 border-amber-500/50 text-amber-100 hover:shadow-amber-500/40" },
  { href: '/teacher/smartboard/kavram-yarismasi', label: 'Kavram Yarışması', icon: BrainCircuit, colorClass: "from-pink-500 to-pink-800 border-pink-500/50 text-pink-100 hover:shadow-pink-500/40" },
  { href: '/teacher/smartboard/kelime-avi', label: 'Kelime Avı', icon: Search, colorClass: "from-teal-500 to-teal-800 border-teal-500/50 text-teal-100 hover:shadow-teal-500/40" },
  { href: '/teacher/smartboard/kavram-avi', label: 'Kavram Avı', icon: Crosshair, colorClass: "from-cyan-500 to-cyan-800 border-cyan-500/50 text-cyan-100 hover:shadow-cyan-500/40" },
  { href: '/teacher/smartboard/eslestirme', label: 'Eşleştirme', icon: Puzzle, colorClass: "from-indigo-500 to-indigo-800 border-indigo-500/50 text-indigo-100 hover:shadow-indigo-500/40" },
  { href: '/teacher/smartboard/cumle-olusturma', label: 'Cümle Oluşturma', icon: Shuffle, colorClass: "from-orange-500 to-orange-800 border-orange-500/50 text-orange-100 hover:shadow-orange-500/40" },
  { href: '/teacher/smartboard/olay-siralama', label: 'Olay Sıralama', icon: ArrowDownUp, colorClass: "from-sky-500 to-sky-800 border-sky-500/50 text-sky-100 hover:shadow-sky-500/40" },
  { href: '/teacher/smartboard/adam-asmaca', label: 'Adam Asmaca', icon: Skull, colorClass: "from-slate-500 to-slate-800 border-slate-500/50 text-slate-100 hover:shadow-slate-500/40" },
  { href: '/teacher/smartboard/hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers, colorClass: "from-rose-500 to-rose-800 border-rose-500/50 text-rose-100 hover:shadow-rose-500/40" },
  { href: '/teacher/smartboard/kategorilere-ayir', label: 'Kategorize Et', icon: FolderKanban, colorClass: "from-lime-500 to-lime-800 border-lime-500/50 text-lime-100 hover:shadow-lime-500/40" },
  { href: '/teacher/smartboard/hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick, colorClass: "from-red-500 to-red-800 border-red-500/50 text-red-100 hover:shadow-red-500/40" },
  { href: '/teacher/smartboard/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb, colorClass: "from-yellow-500 to-yellow-800 border-yellow-500/50 text-yellow-100 hover:shadow-yellow-500/40" },
  { href: '/teacher/smartboard/dogru-yanlis-zinciri', label: 'D/Y Zinciri', icon: LinkIcon, colorClass: "from-green-500 to-green-800 border-green-500/50 text-green-100 hover:shadow-green-500/40" },
  { href: '/teacher/smartboard/acik-uclu-cevapla', label: 'Açık Uçlu', icon: Pencil, colorClass: "from-blue-500 to-blue-800 border-blue-500/50 text-blue-100 hover:shadow-blue-500/40" },
  { href: '/teacher/smartboard/deneme', label: 'Deneme Sınavı', icon: ClipboardCheck, colorClass: "from-violet-500 to-violet-800 border-violet-500/50 text-violet-100 hover:shadow-violet-500/40" },
];


const GameButton = ({ href, label, icon: Icon, colorClass }: { href: string; label: string; icon: React.ElementType; colorClass: string; }) => (
    <Link href={href} passHref>
        <div className={cn(
            "relative overflow-hidden rounded-2xl p-4 h-28 sm:h-36 flex flex-col items-center justify-center gap-2 text-center transition-all duration-300 border bg-gradient-to-br shadow-lg",
            colorClass,
            "hover:shadow-lg hover:scale-105 hover:-translate-y-1"
        )}>
            <Icon className="w-8 h-8 sm:w-12 sm:h-12 drop-shadow-md" />
            <span className="font-bold text-sm sm:text-base">{label}</span>
        </div>
    </Link>
);


function SmartboardPageContent() {
    return (
        <div className="flex flex-col min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black text-white">
            <AppHeader title="Akıllı Tahta Oyunları" />
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-300 drop-shadow-sm">
                        Akıllı Tahta Merkezi
                    </h1>
                    <p className="text-indigo-200/60 font-medium max-w-lg mx-auto mt-2">
                        Sınıfınızla birlikte oynayabileceğiniz etkileşimli oyunları buradan başlatın.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {smartboardGames.map((game) => (
                        <GameButton key={game.href} {...game} />
                    ))}
                </div>
            </main>
        </div>
    );
}


export default function SmartboardPage() {
    return (
        <AuthGuard role={['teacher', 'superadmin']}>
            <SmartboardPageContent />
        </AuthGuard>
    );
}
