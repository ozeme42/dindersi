
      
'use client';

import Link from 'next/link';
import React, { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MonitorPlay, Sun, User, Users, Swords, ArrowRight, BrainCircuit, Settings, Trophy, GitBranch, Columns, LayoutTemplate, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Yeni, daha büyük ve okunaklı kart bileşeni
const SmartboardCard = ({ href, title, description, icon, colorClass, isExternal }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string, isExternal?: boolean }) => {
    const linkContent = (
        <div className={cn(
            "h-full w-full rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform border-b-8 group-hover:border-b-0 group-hover:translate-y-2 relative overflow-hidden group",
            colorClass
        )}>
            {/* Arka Plan Işık Efekti */}
            <div className={cn("absolute inset-0 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity", colorClass.includes('bg-') ? colorClass.replace('bg-', 'bg-') : 'bg-primary')}></div>
            
            {/* İkon */}
            <div className="p-6 rounded-3xl bg-white/10 mb-6 border border-white/20 relative z-10 group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm">
                {React.cloneElement(icon as React.ReactElement, { className: "h-16 w-16 text-white" })}
            </div>
            
            {/* Başlık */}
            <h3 className="font-black text-3xl md:text-4xl mt-2 text-white drop-shadow-md relative z-10 uppercase tracking-tight leading-tight">{title}</h3>
            
            {/* Açıklama */}
            <p className="mt-3 text-white/80 text-lg font-medium relative z-10 leading-snug">{description}</p>
            
            <div className="flex-grow" />
            
            {/* Detay Butonu/İkonu */}
            <div className="mt-8 flex items-center text-xl font-bold text-white relative z-10 bg-black/20 px-6 py-2 rounded-full border border-white/10 group-hover:bg-white/20 transition-colors">
                BAŞLAT <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </div>
        </div>
    );
    
    if (isExternal) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="block group h-full">{linkContent}</a>
    }

    return (
        <Link href={href} className="block group h-full">
            {linkContent}
        </Link>
    )
};


export default function SmartboardPage() {
  
    // Yarışma Modları
    const yarışmalar = [
        {
            key: 'smartboard_bireysel',
            href: "/teacher/smartboard/bireysel",
            title: "Bireysel Yarışma",
            description: "Her öğrencinin kendi başına yarıştığı klasik, hızlı mod.",
            icon: <User />,
            colorClass: "bg-indigo-600 border-indigo-800 hover:bg-indigo-500",
        },
        {
            key: 'smartboard_takim',
            href: "/teacher/smartboard/takim",
            title: "Takım Yarışması",
            description: "Öğrencileri gruplandırıp takım ruhuyla rekabeti artırın.",
            icon: <Users />,
            colorClass: "bg-teal-600 border-teal-800 hover:bg-teal-500",
        },
        {
            key: 'smartboard_duello',
            href: "/teacher/smartboard/duello",
            title: "Düello",
            description: "İki öğrenciyi veya takımı doğrudan karşı karşıya getirin.",
            icon: <Swords />,
            colorClass: "bg-red-600 border-red-800 hover:bg-red-500",
        },
        {
            key: 'kavram_duellosu',
            href: "/teacher/smartboard/kavram-duellosu",
            title: "Kavram Düellosu",
            description: "İki oyuncu için hızlı tempolu bilgi ve refleks yarışması.",
            icon: <BrainCircuit />,
            colorClass: "bg-fuchsia-600 border-fuchsia-800 hover:bg-fuchsia-500",
        },
        {
            key: 'fetih_oyunu',
            href: "/teacher/smartboard/fetih-oyunu",
            title: "Fetih Oyunu",
            description: "Sorularla haritada ilerle, kaleyi fethet ve bölgeleri ele geçir.",
            icon: <GitBranch />,
            colorClass: "bg-emerald-600 border-emerald-800 hover:bg-emerald-500",
        },
        {
            key: 'tornado',
            href: "/teacher/smartboard/tornado",
            title: "Tornado",
            description: "Rastgele puanlar ve sürpriz sorularla şans faktörünü kullan.",
            icon: <Wind />,
            colorClass: "bg-cyan-600 border-cyan-800 hover:bg-cyan-500",
        },
        {
            key: 'kutu_ac',
            href: "/teacher/smartboard/kutu-ac",
            title: "Kutu Aç",
            description: "Kutuları açarak puan tablosunu doldur ve lider ol.",
            icon: <Package />,
            colorClass: "bg-purple-600 border-purple-800 hover:bg-purple-500",
        },
    ];
    
    // Sunum & Araç Modları
    const sunumlar = [
        {
            key: 'ozetler',
            href: "/teacher/smartboard/ozetler",
            title: "Özetler ve İçerikler",
            description: "Konu özetlerini ve interaktif HTML içerikleri tam ekran sun.",
            icon: <LayoutTemplate />,
            colorClass: "bg-rose-600 border-rose-800 hover:bg-rose-500",
        },
        {
            key: 'yazilacaklar',
            href: "/teacher/smartboard/yazilacaklar",
            title: "Kavram & Not Panosu",
            description: "Kavramlar ve önemli notları sütunlara ayırarak net göster.",
            icon: <Columns />,
            colorClass: "bg-amber-600 border-amber-800 hover:bg-amber-500",
        },
        {
             key: 'sanal-tahta',
             href: "/teacher/smartboard/sanal-tahta",
             title: "Sanal Tahta",
             description: "Ders anlatımı için temel dijital beyaz tahta modülü.",
             icon: <Lightbulb />,
             colorClass: "bg-blue-600 border-blue-800 hover:bg-blue-500",
        },
        {
             key: 'anlik-geri-bildirim',
             href: "/teacher/smartboard/anlik-geri-bildirim",
             title: "Anlık Geri Bildirim",
             description: "Sınıfın nabzını anında ölçmek için hızlı soru/anket.",
             icon: <Zap />,
             colorClass: "bg-slate-700 border-slate-900 hover:bg-slate-600",
        },
        {
            key: 'carkifelek',
            href: "/teacher/smartboard/carkifelek",
            title: "Çarkıfelek",
            description: "Sınıftan rastgele bir öğrenci seçmek için çarkı çevirin.",
            icon: <Trophy />,
            colorClass: "bg-yellow-600 border-yellow-800 hover:bg-yellow-500",
        },
    ];

    return (
        <div className="flex flex-col items-center p-6 sm:p-10 md:p-16 space-y-16 min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
            
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
            </div>

            {/* Ana Başlık */}
            <div className="text-center relative z-10 space-y-6">
                <div className="inline-flex items-center justify-center p-5 bg-white/5 rounded-full mb-2 border border-white/10 shadow-2xl backdrop-blur-md">
                    <MonitorPlay className="h-12 w-12 text-cyan-400"/>
                </div>
                <h1 className="font-black text-6xl md:text-8xl tracking-tight text-white drop-shadow-2xl">AKILLI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TAHTA</span></h1>
                <p className="text-slate-400 text-2xl md:text-3xl font-medium max-w-3xl mx-auto">Sınıf içi etkileşimi en üst seviyeye çıkarmak için bir mod seçin.</p>
            </div>
            
            <div className="w-full max-w-[1600px] space-y-16 relative z-10">
                
                {/* Yarışmalar Bölümü */}
                <section>
                    <h2 className="text-4xl font-black text-center mb-10 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-indigo-500"></div>
                        <span className="bg-indigo-500/10 px-6 py-2 rounded-xl border border-indigo-500/30 text-indigo-300 uppercase tracking-widest flex items-center gap-3">
                           <Trophy className="h-8 w-8" /> Yarışma Modları
                        </span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-indigo-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {yarışmalar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[380px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sunumlar ve Araçlar Bölümü */}
                <section>
                    <h2 className="text-4xl font-black text-center mb-10 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-rose-500"></div>
                        <span className="bg-rose-500/10 px-6 py-2 rounded-xl border border-rose-500/30 text-rose-300 uppercase tracking-widest flex items-center gap-3">
                           <MonitorPlay className="h-8 w-8" /> Sunumlar ve Araçlar
                        </span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-rose-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {sunumlar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[380px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>
                
            </div>

            {/* Yönetim Butonları */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl relative z-10 p-8 rounded-[2.5rem] bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xl font-bold shadow-lg shadow-amber-900/40 h-16 px-10 rounded-2xl transition-all border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 w-full md:w-auto">
                    <Link href="/teacher/smartboard/leaderboard">
                        <Trophy className="mr-3 h-7 w-7" />
                        Turnuva Liderliği
                    </Link>
                </Button>
                <div className="h-px w-full md:w-px md:h-12 bg-white/10"></div>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 text-lg font-bold h-14 px-8 rounded-xl w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/guest-students">
                        <UserCog className="mr-3 h-6 w-6 text-cyan-400" />
                        Sanal Öğrencileri Yönet
                    </Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-lg font-bold h-14 px-8 rounded-xl w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/game-settings">
                        <Settings className="mr-3 h-6 w-6 text-purple-400" />
                        Oyun Ayarlarını Yönet
                    </Link>
                </Button>
            </div>
            
        </div>
    );
}

    