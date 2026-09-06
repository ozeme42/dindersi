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
    <div className="min-h-screen bg-[#050314] font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden flex flex-col">
      
      {/* Cosmic Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] bg-purple-600/15 rounded-full blur-[150px]" />
         <div className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] bg-cyan-600/15 rounded-full blur-[150px]" />
         <div className="absolute top-[35%] left-[25%] w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[150px]" />
         <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10 flex-grow flex flex-col">
        
        {/* HERO BANNER */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent backdrop-blur-2xl p-6 md:p-8 mb-10 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl group">
                            <Link href="/student" className="flex items-center gap-1.5 text-xs font-bold">
                                <Home className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                                Öğrenci Paneli
                            </Link>
                        </Button>
                        <span className="text-slate-600">/</span>
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Multiplayer Arena</span>
                    </div>
                    
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3.5">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
                            <Trophy className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        </div>
                        <span>Çok Oyunculu <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300">Arena</span></span>
                    </h1>
                    <p className="text-slate-300/80 text-sm md:text-base mt-2 max-w-xl leading-relaxed font-medium">
                        Sınıf arkadaşlarınla bireysel yarış, takımını kurup savaşa katıl veya teke tek heyecan dolu bilgi düellosuna meydan oku!
                    </p>
                </div>

                {/* Stat Chips */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                    <div className="flex-1 sm:flex-none bg-[#0e0c26]/90 border border-purple-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center gap-3.5 min-w-[140px]">
                        <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                            <Gamepad2 className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300/90 block">3 Oyun Modu</span>
                            <span className="text-xl md:text-2xl font-black text-white font-mono leading-none">Bireysel/Takım</span>
                        </div>
                    </div>

                    <div className="flex-1 sm:flex-none bg-[#0e0c26]/90 border border-pink-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center gap-3.5 min-w-[140px]">
                        <div className="w-11 h-11 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center shrink-0">
                            <Swords className="w-6 h-6 text-pink-400" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-pink-300/90 block">Canlı Düello</span>
                            <span className="text-xl md:text-2xl font-black text-white font-mono leading-none">1v1 Savaş</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Oyun Modları Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch mb-12">
            
            {/* Bireysel Yarışma */}
            <CompetitionCard 
                href="/student/yarismalar/bireysel"
                title="Bireysel Yarışma"
                description="Herkesin tek başına olduğu klasik mod. En hızlı ve en doğru cevaplayan zirveye çıkar."
                icon={<User />}
                colorClass="bg-cyan-600 shadow-cyan-900/50"
                gradient="from-cyan-500 via-blue-500 to-indigo-500"
            />

            {/* Takım Yarışması */}
            <CompetitionCard 
                href="/student/yarismalar/takim"
                title="Takım Savaşı"
                description="Güçlerinizi birleştirin! Takımınızla birlikte strateji kurun ve rakip grupları yenin."
                icon={<Users />}
                colorClass="bg-violet-600 shadow-violet-900/50"
                gradient="from-violet-500 via-purple-500 to-fuchsia-500"
            />

            {/* Düello */}
            <CompetitionCard 
                href="/student/yarismalar/duello"
                title="Bilgi Düellosu"
                description="Teke tek kıyasıya mücadele. Rakibini seç ve bilgi gücünle onu alt et."
                icon={<Swords />}
                colorClass="bg-rose-600 shadow-rose-900/50"
                gradient="from-rose-500 via-red-500 to-orange-500"
            />
        </div>

        {/* Alt Footer / Ayarlar */}
        <div className="mt-auto flex justify-center pb-8">
            <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 transition-all group rounded-2xl px-5 py-2.5 border border-white/5">
                <Link href="/student/yarismalar/ayarlar" className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-800/80 border border-white/10 group-hover:bg-slate-700 transition-colors">
                        <Settings className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm tracking-wide">Misafir Oyuncuları Yönet</span>
                </Link>
            </Button>
        </div>

      </div>
    </div>
  );
}