'use client';

import Link from 'next/link';
import React, { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MonitorPlay, Sun, User, Users, Swords, ArrowRight, BrainCircuit, Settings, Trophy, GitBranch, Columns, LayoutTemplate, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// GÜNCELLEME: Daha kompakt kart bileşeni
const SmartboardCard = ({ href, title, description, icon, colorClass, isExternal }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string, isExternal?: boolean }) => {
    const linkContent = (
        <div className={cn(
            // GÜNCELLEME: rounded değeri, padding (p-8 -> p-5) azaltıldı
            "h-full w-full rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform border-b-[6px] group-hover:border-b-0 group-hover:translate-y-2 relative overflow-hidden group",
            colorClass
        )}>
            {/* Arka Plan Işık Efekti */}
            <div className={cn("absolute inset-0 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity", colorClass.includes('bg-') ? colorClass.replace('bg-', 'bg-') : 'bg-primary')}></div>
            
            {/* İkon */}
            {/* GÜNCELLEME: İkon kapsayıcı ve margin küçültüldü */}
            <div className="p-4 rounded-2xl bg-white/10 mb-4 border border-white/20 relative z-10 group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm">
                {/* GÜNCELLEME: İkon boyutu h-16 -> h-8 olarak küçültüldü */}
                {React.cloneElement(icon as React.ReactElement, { className: "h-8 w-8 text-white" })}
            </div>
            
            {/* Başlık */}
            {/* GÜNCELLEME: Text boyutu text-4xl -> text-2xl olarak küçültüldü */}
            <h3 className="font-black text-xl md:text-2xl mt-1 text-white drop-shadow-md relative z-10 uppercase tracking-tight leading-tight">{title}</h3>
            
            {/* Açıklama */}
            {/* GÜNCELLEME: Text boyutu text-lg -> text-sm olarak küçültüldü */}
            <p className="mt-2 text-white/80 text-sm font-medium relative z-10 leading-snug line-clamp-3">{description}</p>
            
            <div className="flex-grow" />
            
            {/* Detay Butonu/İkonu */}
            {/* GÜNCELLEME: Buton boyutu ve margin küçültüldü */}
            <div className="mt-4 flex items-center text-sm font-bold text-white relative z-10 bg-black/20 px-4 py-1.5 rounded-full border border-white/10 group-hover:bg-white/20 transition-colors">
                BAŞLAT <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
            description: "Her öğrencinin kendi başına yarıştığı klasik mod.",
            icon: <User />,
            colorClass: "bg-indigo-600 border-indigo-800 hover:bg-indigo-500",
        },
        {
            key: 'smartboard_takim',
            href: "/teacher/smartboard/takim",
            title: "Takım Yarışması",
            description: "Öğrencileri gruplandırıp takım ruhuyla yarıştırın.",
            icon: <Users />,
            colorClass: "bg-teal-600 border-teal-800 hover:bg-teal-500",
        },
        {
            key: 'smartboard_duello',
            href: "/teacher/smartboard/duello",
            title: "Düello",
            description: "İki öğrenciyi veya takımı doğrudan karşılaştırın.",
            icon: <Swords />,
            colorClass: "bg-red-600 border-red-800 hover:bg-red-500",
        },
        {
            key: 'kavram_duellosu',
            href: "/teacher/smartboard/kavram-duellosu",
            title: "Kavram Düellosu",
            description: "Hızlı tempolu bilgi ve refleks yarışması.",
            icon: <BrainCircuit />,
            colorClass: "bg-fuchsia-600 border-fuchsia-800 hover:bg-fuchsia-500",
        },
        {
            key: 'fetih_oyunu',
            href: "/teacher/smartboard/fetih-oyunu",
            title: "Fetih Oyunu",
            description: "Sorularla haritada ilerle, kaleyi fethet.",
            icon: <GitBranch />,
            colorClass: "bg-emerald-600 border-emerald-800 hover:bg-emerald-500",
        },
        {
            key: 'tornado',
            href: "/teacher/smartboard/tornado",
            title: "Tornado",
            description: "Rastgele puanlar ve sürpriz sorular.",
            icon: <Wind />,
            colorClass: "bg-cyan-600 border-cyan-800 hover:bg-cyan-500",
        },
        {
            key: 'kutu_ac',
            href: "/teacher/smartboard/kutu-ac",
            title: "Kutu Aç",
            description: "Kutuları açarak puan topla ve lider ol.",
            icon: <Package />,
            colorClass: "bg-purple-600 border-purple-800 hover:bg-purple-500",
        },
    ];
    
    // Sunum & Araç Modları
    const sunumlar = [
        {
            key: 'ozetler',
            href: "/teacher/smartboard/ozetler",
            title: "Özetler & İçerik",
            description: "Konu özetlerini ve HTML içerikleri sun.",
            icon: <LayoutTemplate />,
            colorClass: "bg-rose-600 border-rose-800 hover:bg-rose-500",
        },
        {
            key: 'yazilacaklar',
            href: "/teacher/smartboard/yazilacaklar",
            title: "Kavram Panosu",
            description: "Kavramlar ve notları sütunlara ayırarak göster.",
            icon: <Columns />,
            colorClass: "bg-amber-600 border-amber-800 hover:bg-amber-500",
        },
        {
             key: 'sanal-tahta',
             href: "/teacher/smartboard/sanal-tahta",
             title: "Sanal Tahta",
             description: "Ders anlatımı için dijital beyaz tahta.",
             icon: <Lightbulb />,
             colorClass: "bg-blue-600 border-blue-800 hover:bg-blue-500",
        },
        {
             key: 'anlik-geri-bildirim',
             href: "/teacher/smartboard/anlik-geri-bildirim",
             title: "Anlık Geri Bildirim",
             description: "Sınıfın nabzını ölçmek için hızlı anket.",
             icon: <Zap />,
             colorClass: "bg-slate-700 border-slate-900 hover:bg-slate-600",
        },
        {
            key: 'carkifelek',
            href: "/teacher/smartboard/carkifelek",
            title: "Çarkıfelek",
            description: "Rastgele bir öğrenci seçmek için çarkı çevir.",
            icon: <Trophy />,
            colorClass: "bg-yellow-600 border-yellow-800 hover:bg-yellow-500",
        },
    ];

    return (
        <div className="flex flex-col items-center p-6 sm:p-8 space-y-12 min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
            
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px]" />
            </div>

            {/* Ana Başlık */}
            <div className="text-center relative z-10 space-y-4 pt-4">
                <Link href="/teacher" className="inline-block">
                    {/* GÜNCELLEME: Logo boyutu küçültüldü */}
                    <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-full mb-2 border border-white/10 shadow-2xl backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors">
                        <MonitorPlay className="h-8 w-8 text-cyan-400"/>
                    </div>
                </Link>
                {/* GÜNCELLEME: Başlık boyutu text-8xl -> text-5xl/6xl */}
                <h1 className="font-black text-4xl md:text-6xl tracking-tight text-white drop-shadow-2xl">AKILLI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TAHTA</span></h1>
                <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">Sınıf içi etkileşimi artırmak için bir mod seçin.</p>
            </div>
            
            <div className="w-full max-w-[1400px] space-y-10 relative z-10">
                
                {/* Yarışmalar Bölümü */}
                <section>
                    {/* GÜNCELLEME: Kategori başlıkları küçültüldü */}
                    <h2 className="text-2xl font-black text-center mb-6 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-indigo-500"></div>
                        <span className="bg-indigo-500/10 px-4 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-300 uppercase tracking-widest text-sm flex items-center gap-2">
                           <Trophy className="h-5 w-5" /> Yarışma Modları
                        </span>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-indigo-500"></div>
                    </h2>
                    {/* GÜNCELLEME: Grid gap azaltıldı (gap-8 -> gap-5) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {yarışmalar.map(({ key, ...buttonProps }) => (
                            // GÜNCELLEME: Min yükseklik 380px -> 240px'e düşürüldü
                            <div key={key} className="aspect-[4/5] min-h-[240px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sunumlar ve Araçlar Bölümü */}
                <section>
                    <h2 className="text-2xl font-black text-center mb-6 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-rose-500"></div>
                        <span className="bg-rose-500/10 px-4 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 uppercase tracking-widest text-sm flex items-center gap-2">
                           <MonitorPlay className="h-5 w-5" /> Sunumlar ve Araçlar
                        </span>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-rose-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {sunumlar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[240px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>
                
            </div>

            {/* Yönetim Butonları */}
            {/* GÜNCELLEME: Container padding azaltıldı, butonlar küçültüldü */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full max-w-4xl relative z-10 p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                {/* GÜNCELLEME: Buton h-16 -> h-12, font-xl -> font-base */}
                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-base font-bold shadow-lg shadow-amber-900/40 h-12 px-6 rounded-xl transition-all border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 w-full md:w-auto">
                    <Link href="/teacher/smartboard/leaderboard">
                        <Trophy className="mr-2 h-5 w-5" />
                        Turnuva Liderliği
                    </Link>
                </Button>
                <div className="h-px w-full md:w-px md:h-8 bg-white/10"></div>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 text-base font-bold h-12 px-5 rounded-lg w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/guest-students">
                        <UserCog className="mr-2 h-5 w-5 text-cyan-400" />
                        Sanal Öğrenciler
                    </Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-base font-bold h-12 px-5 rounded-lg w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/game-settings">
                        <Settings className="mr-2 h-5 w-5 text-purple-400" />
                        Oyun Ayarları
                    </Link>
                </Button>
            </div>
            
        </div>
    );
}