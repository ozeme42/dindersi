"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Gamepad2, ArrowLeft, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, 
  Layers, FolderKanban, MousePointerClick, Trophy, ArrowDownUp, Link2, 
  Pencil, ClipboardCheck, Coins, BrainCircuit, Milestone, Package, Wind, BookOpen, Star, Footprints, Target, Sparkles, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

// --- RENK PALETİ VE EFEKTLER ---
// Her oyun türü için özel gradient ve gölge tanımları
const colorStyles: Record<string, { bg: string, border: string, shadow: string, icon: string, glow: string }> = {
    purple: { bg: "from-purple-600/20 to-purple-900/40", border: "border-purple-500/30", shadow: "group-hover:shadow-purple-500/40", icon: "text-purple-400", glow: "bg-purple-500" },
    amber:  { bg: "from-amber-500/20 to-amber-900/40", border: "border-amber-500/30", shadow: "group-hover:shadow-amber-500/40", icon: "text-amber-400", glow: "bg-amber-500" },
    pink:   { bg: "from-pink-500/20 to-pink-900/40", border: "border-pink-500/30", shadow: "group-hover:shadow-pink-500/40", icon: "text-pink-400", glow: "bg-pink-500" },
    teal:   { bg: "from-teal-500/20 to-teal-900/40", border: "border-teal-500/30", shadow: "group-hover:shadow-teal-500/40", icon: "text-teal-400", glow: "bg-teal-500" },
    indigo: { bg: "from-indigo-500/20 to-indigo-900/40", border: "border-indigo-500/30", shadow: "group-hover:shadow-indigo-500/40", icon: "text-indigo-400", glow: "bg-indigo-500" },
    cyan:   { bg: "from-cyan-500/20 to-cyan-900/40", border: "border-cyan-500/30", shadow: "group-hover:shadow-cyan-500/40", icon: "text-cyan-400", glow: "bg-cyan-500" },
    blue:   { bg: "from-blue-600/20 to-blue-900/40", border: "border-blue-500/30", shadow: "group-hover:shadow-blue-500/40", icon: "text-blue-400", glow: "bg-blue-500" },
    orange: { bg: "from-orange-500/20 to-orange-900/40", border: "border-orange-500/30", shadow: "group-hover:shadow-orange-500/40", icon: "text-orange-400", glow: "bg-orange-500" },
    sky:    { bg: "from-sky-500/20 to-sky-900/40", border: "border-sky-500/30", shadow: "group-hover:shadow-sky-500/40", icon: "text-sky-400", glow: "bg-sky-500" },
    rose:   { bg: "from-rose-500/20 to-rose-900/40", border: "border-rose-500/30", shadow: "group-hover:shadow-rose-500/40", icon: "text-rose-400", glow: "bg-rose-500" },
    emerald:{ bg: "from-emerald-500/20 to-emerald-900/40", border: "border-emerald-500/30", shadow: "group-hover:shadow-emerald-500/40", icon: "text-emerald-400", glow: "bg-emerald-500" },
    lime:   { bg: "from-lime-500/20 to-lime-900/40", border: "border-lime-500/30", shadow: "group-hover:shadow-lime-500/40", icon: "text-lime-400", glow: "bg-lime-500" },
    red:    { bg: "from-red-500/20 to-red-900/40", border: "border-red-500/30", shadow: "group-hover:shadow-red-500/40", icon: "text-red-400", glow: "bg-red-500" },
    yellow: { bg: "from-yellow-500/20 to-yellow-900/40", border: "border-yellow-500/30", shadow: "group-hover:shadow-yellow-500/40", icon: "text-yellow-400", glow: "bg-yellow-500" },
    green:  { bg: "from-green-500/20 to-green-900/40", border: "border-green-500/30", shadow: "group-hover:shadow-green-500/40", icon: "text-green-400", glow: "bg-green-500" },
    fuchsia:{ bg: "from-fuchsia-500/20 to-fuchsia-900/40", border: "border-fuchsia-500/30", shadow: "group-hover:shadow-fuchsia-500/40", icon: "text-fuchsia-400", glow: "bg-fuchsia-500" },
    slate:  { bg: "from-slate-500/20 to-slate-900/40", border: "border-slate-500/30", shadow: "group-hover:shadow-slate-500/40", icon: "text-slate-400", glow: "bg-slate-500" },
    violet: { bg: "from-violet-500/20 to-violet-900/40", border: "border-violet-500/30", shadow: "group-hover:shadow-violet-500/40", icon: "text-violet-400", glow: "bg-violet-500" },
    zinc:   { bg: "from-zinc-500/20 to-zinc-900/40", border: "border-zinc-500/30", shadow: "group-hover:shadow-zinc-500/40", icon: "text-zinc-400", glow: "bg-zinc-500" },
};

const activityTypes = [
  { href: '/oyunlar/milyoner-yarismasi', label: 'Kim 1000 Puan İster?', icon: Trophy, color: 'purple', badge: 'POPÜLER' },
  { href: '/oyunlar/yazi-tura', label: 'Yazı Tura', icon: Coins, color: 'amber' },
  { href: '/oyunlar/kavram-yarismasi', label: 'Kavram Yarışması', icon: BrainCircuit, color: 'pink' },
  { href: '/oyunlar/kelime-avi', label: 'Kelime Avı', icon: Search, color: 'teal' },
  { href: '/oyunlar/kutu-ac', label: 'Kutu Aç', icon: Package, color: 'indigo' },
  { href: '/oyunlar/kavram-avi', label: 'Kavram Avı', icon: Crosshair, color: 'cyan' },
  { href: '/oyunlar/eslestirme', label: 'Eşleştirme', icon: Puzzle, color: 'blue' },
  { href: '/oyunlar/cumle-olusturma', label: 'Cümle Ustası', icon: Shuffle, color: 'orange' },
  { href: '/oyunlar/adam-asmaca', label: 'Adam Asmaca', icon: Skull, color: 'rose' },
  { href: '/oyunlar/hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers, color: 'emerald' },
  { href: '/oyunlar/hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick, color: 'red' },
  { href: '/oyunlar/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb, color: 'yellow' },
  { href: '/oyunlar/dogru-yanlis-zinciri', label: 'D/Y Zinciri', icon: Link2, color: 'green' },
  { href: '/oyunlar/acik-uclu-cevapla', label: 'Açık Uçlu', icon: Pencil, color: 'slate' },
  { href: '/oyunlar/ilim-hazinesi', label: 'İlim Hazinesi', icon: BookOpen, color: 'violet' },
  { href: '/oyunlar/labirent', label: 'Labirent', icon: Milestone, color: 'zinc' },
  { href: '/oyunlar/tornado', label: 'Tornado', icon: Wind, color: 'cyan' },
  { href: '/oyunlar/dogru-yol-kosucusu', label: 'Doğru Yol Koşucusu', icon: Footprints, color: 'blue' },
  { href: '/oyunlar/balon-avcisi', label: 'Balon Avcısı', icon: Target, color: 'sky' },
];

// --- HAREKETLİ ARKA PLAN ---
const AnimatedBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#020617] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.05 }}/>
        
        {/* Hareketli "Orb"lar */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[100px] animate-pulse-slow delay-2000" />
    </div>
);

// --- OYUN KARTI BİLEŞENİ ---
const GameCard = ({ activity, index }: { activity: typeof activityTypes[0], index: number }) => {
    const Icon = activity.icon;
    const styles = colorStyles[activity.color] || colorStyles['slate'];

    return (
        <Link 
            href={`${activity.href}?gameName=${encodeURIComponent(activity.label)}&gamePath=${activity.href.substring(8)}`} 
            className="group relative block h-full animate-in fade-in zoom-in-50 duration-500 fill-mode-backwards"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Kartın Kendisi */}
            <div className={cn(
                "relative h-32 sm:h-40 overflow-hidden rounded-[1.5rem] border backdrop-blur-xl transition-all duration-500",
                "bg-gradient-to-br hover:scale-[1.03] hover:-translate-y-1 shadow-xl",
                styles.bg,
                styles.border,
                styles.shadow
            )}>
                
                {/* Arkaplan Deseni & Işıltı */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                    <div className={cn("absolute -bottom-10 -right-10 w-32 h-32 blur-2xl rounded-full opacity-60", styles.glow)}></div>
                </div>

                {/* Büyük Arkaplan İkonu (Dekoratif) */}
                <Icon className={cn(
                    "absolute -right-6 -bottom-6 w-28 h-28 opacity-5 rotate-12 transition-transform duration-700 ease-out",
                    "group-hover:rotate-0 group-hover:scale-110 group-hover:opacity-10",
                    styles.icon
                )} />

                {/* İçerik */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4">
                    
                    {/* İkon Kutusu */}
                    <div className={cn(
                        "relative mb-3 p-3 rounded-2xl bg-black/20 border border-white/5 transition-all duration-500 group-hover:bg-black/40 group-hover:border-white/20 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]",
                        "group-hover:scale-110"
                    )}>
                        <Icon className={cn("w-7 h-7 sm:w-8 sm:h-8 transition-colors duration-300", styles.icon, "group-hover:text-white")} />
                        {/* İkon Parıltısı */}
                        <div className={cn("absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-50 blur-lg transition-opacity duration-300", styles.glow)}></div>
                    </div>

                    {/* Başlık */}
                    <h3 className="font-black text-sm sm:text-base text-white/90 leading-tight group-hover:text-white transition-colors">
                        {activity.label}
                    </h3>

                    {/* Hover'da Çıkan "Oyna" Butonu */}
                    <div className="absolute bottom-0 left-0 w-full h-10 bg-black/40 backdrop-blur-md border-t border-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-2">
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
                            Oyna <Play className="w-3 h-3 fill-current" />
                        </span>
                    </div>
                </div>

                {/* Rozet (Varsa) */}
                {activity.badge && (
                    <div className="absolute top-0 right-0">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-bl-xl shadow-lg">
                            {activity.badge}
                        </div>
                    </div>
                )}
            </div>
        </Link>
    );
};

export const dynamic = 'force-dynamic';

export default function StudentActivitiesPage() {
  const { user } = useAuth();
  
  const backUrl = user ? (user.role === 'teacher' || user.role === 'superadmin' ? '/teacher' : '/student') : '/';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 relative overflow-hidden flex flex-col font-sans selection:bg-cyan-500/30">
        <AnimatedBackground />
        
        <div className="container mx-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-12 relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-6">
                <div className="flex items-center gap-4 group">
                    <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500/30 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                        <div className="relative p-3.5 bg-slate-900 rounded-2xl border border-white/10 shadow-2xl">
                            <Gamepad2 className="h-8 w-8 text-cyan-400 group-hover:rotate-12 transition-transform duration-500" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-2xl">
                            OYUN<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">MERKEZİ</span>
                        </h1>
                        <p className="text-slate-400 font-medium text-sm md:text-base flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                            Eğlenerek öğren, puanları topla!
                        </p>
                    </div>
                </div>
                
                <Button asChild variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white hover:border-white/20 text-slate-300 rounded-xl h-12 px-6 backdrop-blur-md transition-all duration-300 hover:scale-105">
                    <Link href={backUrl}><ArrowLeft className="mr-2 h-5 w-5"/> Panele Dön</Link>
                </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {activityTypes.sort((a,b) => a.label.localeCompare(b.label, 'tr')).map((activity, index) => (
                    <GameCard key={activity.href} activity={activity} index={index} />
                ))}
            </div>
        </div>
    </div>
  );
}