'use client';

import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { User, Users, Swords, Settings, Home, Trophy, Sparkles, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- ÖZEL KART BİLEŞENİ ---
const CompetitionCard = ({ 
    href, 
    title, 
    description, 
    icon, 
    colorClass,
    gradient 
}: { 
    href: string; 
    title: string; 
    description: string; 
    icon: React.ReactNode; 
    colorClass: string;
    gradient: string;
}) => {
    return (
        <Link href={href} className="group relative w-full">
            {/* Arka Plan Glow Efekti */}
            <div className={cn(
                "absolute -inset-0.5 rounded-[2rem] blur opacity-30 group-hover:opacity-75 transition duration-500",
                gradient
            )}></div>
            
            <div className="relative h-full flex flex-col items-center text-center p-8 bg-slate-900 rounded-[1.8rem] border border-white/10 hover:border-white/20 transition-all duration-300 transform group-hover:-translate-y-2 overflow-hidden">
                {/* Dekoratif Arka Plan Deseni */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
                <div className={cn("absolute top-0 w-full h-1/2 opacity-10 bg-gradient-to-b", gradient, "to-transparent")} />

                {/* İkon */}
                <div className={cn(
                    "h-20 w-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 border border-white/10",
                    colorClass
                )}>
                    {React.cloneElement(icon as React.ReactElement, { className: "h-10 w-10 text-white" })}
                </div>

                {/* Başlık */}
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all">
                    {title}
                </h3>

                {/* Açıklama */}
                <p className="text-slate-400 font-medium leading-relaxed group-hover:text-slate-300 transition-colors">
                    {description}
                </p>

                {/* Buton Görünümü */}
                <div className={cn(
                    "mt-8 px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wider bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors flex items-center gap-2",
                    "text-white"
                )}>
                    Oyna <Gamepad2 className="h-4 w-4" />
                </div>
            </div>
        </Link>
    );
};

export default function CompetitionsPage() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden flex flex-col">
      
      {/* Arka Plan Efektleri */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[150px]" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-900/20 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10 flex-grow flex flex-col">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 py-6 border-b border-white/5">
            <div className="text-center md:text-left">
                <div className="inline-flex items-center justify-center p-3 bg-slate-900 border border-white/10 rounded-xl shadow-lg mb-3">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow-xl">
                    Çok Oyunculu <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Arena</span>
                </h1>
                <p className="text-slate-400 mt-2 text-lg font-medium">Arkadaşlarınla yarışmak için bir oyun modu seç.</p>
            </div>
            
            <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900/50 backdrop-blur-md h-12 px-6 rounded-xl">
                <Link href="/student">
                    <Home className="mr-2 h-5 w-5" /> Panele Dön
                </Link>
            </Button>
        </div>

        {/* Oyun Modları Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch mb-12">
            
            {/* Bireysel Yarışma */}
            <CompetitionCard 
                href="/student/yarismalar/bireysel"
                title="Bireysel Yarışma"
                description="Herkesin tek başına olduğu klasik mod. En hızlı ve en doğru cevaplayan kazanır."
                icon={<User />}
                colorClass="bg-cyan-600 shadow-cyan-900/50"
                gradient="from-cyan-500 via-blue-500 to-indigo-500"
            />

            {/* Takım Yarışması */}
            <CompetitionCard 
                href="/student/yarismalar/takim"
                title="Takım Savaşı"
                description="Güçlerinizi birleştirin! Takımınızla birlikte strateji kurun ve diğer grupları yenin."
                icon={<Users />}
                colorClass="bg-violet-600 shadow-violet-900/50"
                gradient="from-violet-500 via-purple-500 to-fuchsia-500"
            />

            {/* Düello */}
            <CompetitionCard 
                href="/student/yarismalar/duello"
                title="Düello"
                description="Teke tek mücadele. Rakibini seç ve bilgi gücünle onu alt et."
                icon={<Swords />}
                colorClass="bg-rose-600 shadow-rose-900/50"
                gradient="from-rose-500 via-red-500 to-orange-500"
            />
        </div>

        {/* Alt Footer / Ayarlar */}
        <div className="mt-auto flex justify-center pb-8">
            <Button asChild variant="ghost" className="text-slate-500 hover:text-white hover:bg-white/5 transition-all group">
                <Link href="/student/yarismalar/ayarlar" className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-slate-800 group-hover:bg-slate-700 transition-colors">
                        <Settings className="h-4 w-4" />
                    </div>
                    <span className="font-semibold tracking-wide">Misafir Oyuncuları Yönet</span>
                </Link>
            </Button>
        </div>

      </div>
    </div>
  );
}