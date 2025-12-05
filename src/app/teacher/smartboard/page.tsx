
'use client';

import { useState } from "react";
import Link from "next/link";
import { Gamepad2, Users, User, Trophy, BarChart3, Settings, MonitorPlay, BrainCircuit, Search, Crosshair, Shuffle, Puzzle, Skull, Layers, FolderKanban, MousePointerClick, Lightbulb, Link2, Pencil, ClipboardCheck, Coins, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";

const games = [
    { name: 'Bireysel Yarışma', href: '/teacher/bireysel', icon: User, color: 'bg-blue-500 hover:bg-blue-600' },
    { name: 'Takım Yarışması', href: '/teacher/takim', icon: Users, color: 'bg-green-500 hover:bg-green-600' },
    { name: 'Düello', href: '/teacher/duello', icon: Trophy, color: 'bg-red-500 hover:bg-red-600' },
    { name: 'Yazı Tura', href: '/teacher/yazi-tura-oyunu', icon: Coins, color: 'bg-amber-500 hover:bg-amber-600' },
    { name: 'Kelime Avı', href: '/teacher/kelime-avi', icon: Search, color: 'bg-teal-600 hover:bg-teal-700' },
    { name: 'Kavram Avı', href: '/teacher/kavram-avi', icon: Crosshair, color: 'bg-cyan-600 hover:bg-cyan-700' },
    { name: 'Cümle Oluşturma', href: '/teacher/cumle-olusturma', icon: Shuffle, color: 'bg-orange-500 hover:bg-orange-600' },
    { name: 'Eşleştirme', href: '/teacher/eslestirme', icon: Puzzle, color: 'bg-indigo-600 hover:bg-indigo-700' },
    { name: 'Adam Asmaca', href: '/teacher/adam-asmaca', icon: Skull, color: 'bg-slate-600 hover:bg-slate-700' },
    { name: 'Hafıza Kartları', href: '/teacher/hafiza-kartlari', icon: Layers, color: 'bg-rose-600 hover:bg-rose-700' },
    { name: 'Kategorilere Ayır', href: '/teacher/kategorilere-ayir', icon: FolderKanban, color: 'bg-lime-600 hover:bg-lime-700' },
    { name: 'Hedefi Vur', href: '/teacher/hedefi-vur', icon: MousePointerClick, color: 'bg-pink-500 hover:bg-pink-600' },
    { name: 'Bil Bakalım', href: '/teacher/bil-bakalim', icon: Lightbulb, color: 'bg-yellow-500 hover:bg-yellow-600' },
    { name: 'D/Y Zinciri', href: '/teacher/dogru-yanlis-zinciri', icon: Link2, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { name: 'Açık Uçlu', href: '/teacher/acik-uclu-cevapla', icon: Pencil, color: 'bg-sky-500 hover:bg-sky-600' },
    { name: 'Olay Sıralama', href: '/teacher/olay-siralama', icon: ArrowDownUp, color: 'bg-violet-500 hover:bg-violet-600' },
];

const GameButton = ({ name, href, icon: Icon, color }: typeof games[0]) => (
    <Link href={href} className="block group">
        <div className={cn(
            "relative overflow-hidden rounded-2xl p-4 h-28 sm:h-36 flex flex-col items-center justify-center gap-2 text-center text-white font-bold transition-all duration-300 border border-white/20 shadow-lg",
            color,
            "hover:shadow-2xl hover:scale-105 hover:-translate-y-1"
        )}>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 opacity-10 group-hover:opacity-20 group-hover:scale-125 transition-all duration-300">
                <Icon className="w-full h-full" />
            </div>
            <Icon className="h-8 w-8 sm:h-10 sm:w-10 drop-shadow-md" />
            <span className="text-sm sm:text-base">{name}</span>
        </div>
    </Link>
);


export default function SmartboardPage() {

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />
        <main className="container mx-auto p-4 md:p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-800 dark:text-white">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                        Akıllı Tahta
                    </span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto mt-4">
                    Sınıfınızla birlikte oynamak için bir etkinlik seçin.
                </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {games.map(game => (
                    <GameButton key={game.href} {...game} />
                ))}
            </div>

        </main>
    </div>
  );
}
