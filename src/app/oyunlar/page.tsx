"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Gamepad2, ArrowLeft, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, 
  Layers, FolderKanban, MousePointerClick, Trophy, ArrowDownUp, Link2, 
  Pencil, ClipboardCheck, Coins, BrainCircuit, Milestone, Package, Wind, BookOpen, Star, Footprints, Target, Sparkles, Play, Rocket, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

// --- RENK PALETİ VE EFEKTLER (3D MOBİL OYUN TARZI) ---
const colorStyles: Record<string, { bg: string, border: string, shadow: string, icon: string, text: string }> = {
    purple: { bg: "from-purple-500 to-violet-600", border: "border-purple-400 border-b-purple-800", shadow: "shadow-purple-500/50", icon: "text-white", text: "text-white" },
    amber:  { bg: "from-amber-400 to-orange-500", border: "border-amber-300 border-b-orange-700", shadow: "shadow-orange-500/50", icon: "text-white", text: "text-white" },
    pink:   { bg: "from-pink-400 to-rose-500", border: "border-pink-300 border-b-rose-700", shadow: "shadow-rose-500/50", icon: "text-white", text: "text-white" },
    teal:   { bg: "from-teal-400 to-emerald-500", border: "border-teal-300 border-b-emerald-800", shadow: "shadow-teal-500/50", icon: "text-white", text: "text-white" },
    indigo: { bg: "from-indigo-400 to-blue-600", border: "border-indigo-300 border-b-blue-800", shadow: "shadow-blue-500/50", icon: "text-white", text: "text-white" },
    cyan:   { bg: "from-cyan-400 to-sky-500", border: "border-cyan-300 border-b-sky-700", shadow: "shadow-cyan-500/50", icon: "text-white", text: "text-white" },
    blue:   { bg: "from-blue-500 to-indigo-600", border: "border-blue-400 border-b-indigo-800", shadow: "shadow-blue-500/50", icon: "text-white", text: "text-white" },
    orange: { bg: "from-orange-400 to-red-500", border: "border-orange-300 border-b-red-700", shadow: "shadow-orange-500/50", icon: "text-white", text: "text-white" },
    sky:    { bg: "from-sky-400 to-blue-500", border: "border-sky-300 border-b-blue-700", shadow: "shadow-sky-500/50", icon: "text-white", text: "text-white" },
    rose:   { bg: "from-rose-400 to-red-500", border: "border-rose-300 border-b-red-800", shadow: "shadow-rose-500/50", icon: "text-white", text: "text-white" },
    emerald:{ bg: "from-emerald-400 to-green-500", border: "border-emerald-300 border-b-green-800", shadow: "shadow-emerald-500/50", icon: "text-white", text: "text-white" },
    lime:   { bg: "from-lime-400 to-green-500", border: "border-lime-300 border-b-green-700", shadow: "shadow-lime-500/50", icon: "text-white", text: "text-white" },
    red:    { bg: "from-red-400 to-rose-600", border: "border-red-300 border-b-rose-800", shadow: "shadow-red-500/50", icon: "text-white", text: "text-white" },
    yellow: { bg: "from-yellow-400 to-amber-500", border: "border-yellow-300 border-b-amber-700", shadow: "shadow-yellow-500/50", icon: "text-white", text: "text-white" },
    green:  { bg: "from-green-400 to-emerald-600", border: "border-green-300 border-b-emerald-800", shadow: "shadow-green-500/50", icon: "text-white", text: "text-white" },
    fuchsia:{ bg: "from-fuchsia-400 to-purple-500", border: "border-fuchsia-300 border-b-purple-700", shadow: "shadow-fuchsia-500/50", icon: "text-white", text: "text-white" },
    slate:  { bg: "from-slate-500 to-slate-700", border: "border-slate-400 border-b-slate-800", shadow: "shadow-slate-500/50", icon: "text-white", text: "text-white" },
    violet: { bg: "from-violet-400 to-purple-600", border: "border-violet-300 border-b-purple-800", shadow: "shadow-violet-500/50", icon: "text-white", text: "text-white" },
    zinc:   { bg: "from-zinc-400 to-zinc-600", border: "border-zinc-300 border-b-zinc-800", shadow: "shadow-zinc-500/50", icon: "text-white", text: "text-white" },
};

const activityTypes = [
  { href: '/oyunlar/milyoner-yarismasi', label: 'Kim 1000 Puan İster?', icon: Trophy, color: 'purple', badge: 'POPÜLER' },
  { href: '/oyunlar/yazi-tura', label: 'Gol Kralı', icon: Trophy, color: 'amber', badge: 'YENİ' }, 
  { href: '/oyunlar/carkifelek', label: 'Çarkıfelek', icon: Star, color: 'fuchsia', badge: 'YENİ' },
  { href: '/oyunlar/siber-sifre-kirici', label: 'Siber Şifre Kırıcı', icon: Lock, color: 'emerald', badge: 'YENİ' },
  { href: '/oyunlar/uzay-savunmasi', label: 'Uzay Savunması', icon: Rocket, color: 'blue', badge: 'YENİ' },
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
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#0b0f19] overflow-hidden">
        {/* Hareketli "Orb"lar */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-fuchsia-600/15 rounded-full blur-[100px] animate-pulse-slow delay-2000" />
        
        {/* Oyun Desenleri (Gamepad vs arka planda uçuşan) */}
        <div className="absolute top-1/4 left-10 opacity-5 rotate-12"><Gamepad2 className="w-32 h-32 text-white" /></div>
        <div className="absolute bottom-1/4 right-20 opacity-5 -rotate-12"><Trophy className="w-40 h-40 text-white" /></div>
        <div className="absolute top-1/2 left-2/3 opacity-5 rotate-45"><Star className="w-24 h-24 text-white" /></div>
    </div>
);

// --- OYUN KARTI BİLEŞENİ ---
const GameCard = ({ activity, index }: { activity: typeof activityTypes[0], index: number }) => {
    const Icon = activity.icon;
    const styles = colorStyles[activity.color] || colorStyles['slate'];
    const isPopular = activity.badge === 'POPÜLER';

    return (
        <Link 
            href={`${activity.href}?gameName=${encodeURIComponent(activity.label)}&gamePath=${activity.href.substring(8)}`} 
            className={cn(
                "group relative block h-full animate-in fade-in zoom-in-50 duration-500 fill-mode-backwards outline-none focus-visible:ring-4 focus-visible:ring-white/50 rounded-[2rem]",
                isPopular ? "col-span-2 sm:col-span-2" : "col-span-1"
            )}
            style={{ animationDelay: `${index * 40}ms` }}
        >
            {/* Kartın Kendisi (3D Buton Efekti) */}
            <div className={cn(
                "relative w-full h-full min-h-[140px] sm:min-h-[160px] rounded-[2rem] border-2 transition-all duration-300 ease-out",
                "bg-gradient-to-br shadow-xl hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]",
                "border-b-[8px] active:border-b-2 active:translate-y-2", 
                styles.bg,
                styles.border,
                styles.shadow
            )}>
                
                {/* Işıltı Efekti */}
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-[2rem]"></div>
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-[2rem] opacity-50"></div>

                {/* Büyük Arkaplan İkonu */}
                <Icon className={cn(
                    "absolute -right-4 -bottom-4 w-28 h-28 opacity-20 rotate-12 transition-transform duration-500",
                    "group-hover:rotate-0 group-hover:scale-110",
                    styles.icon
                )} />

                {/* İçerik */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4 gap-3">
                    
                    {/* İkon Kutusu */}
                    <div className={cn(
                        "relative p-3 sm:p-4 rounded-[1.5rem] bg-white/20 backdrop-blur-sm border border-white/40 shadow-[0_8px_16px_rgba(0,0,0,0.2)] transition-transform duration-500",
                        "group-hover:scale-110 group-hover:rotate-6"
                    )}>
                        <Icon className={cn("w-8 h-8 sm:w-10 sm:h-10 drop-shadow-md", styles.icon)} />
                    </div>

                    {/* Başlık */}
                    <h3 className={cn(
                        "font-black text-sm sm:text-base md:text-lg leading-tight drop-shadow-md",
                        styles.text
                    )}>
                        {activity.label}
                    </h3>
                </div>

                {/* Rozet (POPÜLER/YENİ) */}
                {activity.badge && (
                    <div className="absolute -top-3 -right-3 rotate-12 group-hover:rotate-6 transition-transform z-20">
                        <div className="bg-yellow-400 text-yellow-900 text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-2xl shadow-lg border-2 border-yellow-200">
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                {activityTypes.map((activity, index) => (
                    <GameCard key={activity.href} activity={activity} index={index} />
                ))}
            </div>
        </div>
    </div>
  );
}
