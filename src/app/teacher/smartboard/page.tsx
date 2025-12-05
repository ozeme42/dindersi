
'use client';

import React, { Suspense } from 'react';
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { AuthGuard } from '@/components/auth-guard';
import { Gamepad2, BrainCircuit, Users, MonitorPlay, Search, Crosshair, Puzzle, Shuffle, Skull, Layers, FolderKanban, MousePointerClick, Trophy, ArrowDownUp, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const GameButton = ({ href, title, description, icon, colorClass, comingSoon }: { href: string; title: string; description: string; icon: React.ReactNode; colorClass: string; comingSoon?: boolean }) => {
    const content = (
        <div className={cn(
            "relative group h-full w-full rounded-2xl p-6 flex flex-col text-white transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1",
            colorClass,
            comingSoon && "grayscale opacity-60 cursor-not-allowed"
        )}>
             {comingSoon && <div className="absolute top-2 right-2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-full">YAKINDA</div>}
            <div className="flex-shrink-0">{React.cloneElement(icon as React.ReactElement, { className: "h-12 w-12 opacity-80" })}</div>
            <div className="flex-grow mt-4">
                <h3 className="text-2xl font-bold">{title}</h3>
                <p className="mt-1 text-sm opacity-90">{description}</p>
            </div>
            {!comingSoon && <div className="mt-4 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">Oyunu Başlat &rarr;</div>}
        </div>
    );
    
    if (comingSoon) {
        return <div className="h-full">{content}</div>
    }

    return <Link href={href} className="block h-full">{content}</Link>;
};

function SmartboardClientPage() {

    const gameButtons = [
        { href: '/teacher/smartboard/takim-yarismasi', title: 'Takım Yarışması', description: 'İki takım arasında bilgi ve hız dolu bir mücadele.', icon: <Users />, colorClass: "bg-gradient-to-br from-purple-500 to-indigo-600"},
        { href: '/teacher/smartboard/duello', title: 'Düello', description: 'İki öğrenci arasındaki kıyasıya rekabet.', icon: <Gamepad2 />, colorClass: "bg-gradient-to-br from-red-500 to-orange-600"},
        { href: '/teacher/smartboard/kelime-avi', title: 'Kelime Avı', description: 'Harflerin arasında gizlenmiş kelimeleri bulun.', icon: <Search />, colorClass: "bg-gradient-to-br from-teal-500 to-cyan-600"},
        { href: '/teacher/smartboard/kavram-avi', title: 'Kavram Avı', description: 'Uçuşan kavramları doğru tanımlarıyla vurun.', icon: <Crosshair />, colorClass: "bg-gradient-to-br from-sky-500 to-blue-600" },
        { href: '/teacher/smartboard/eslestirme', title: 'Eşleştirme', description: 'Birbiriyle ilişkili kartları bulun ve eşleştirin.', icon: <Puzzle />, colorClass: "bg-gradient-to-br from-indigo-500 to-violet-600" },
        { href: '/teacher/smartboard/cumle-olusturma', title: 'Cümle Oluşturma', description: 'Karışık kelimelerden anlamlı cümleler kurun.', icon: <Shuffle />, colorClass: "bg-gradient-to-br from-orange-500 to-amber-600" },
        { href: '/teacher/smartboard/adam-asmaca', title: 'Adam Asmaca', description: 'Klasik kelime tahmin oyunu, zamana karşı!', icon: <Skull />, colorClass: "bg-gradient-to-br from-slate-600 to-gray-800" },
        { href: '/teacher/smartboard/hafiza-kartlari', title: 'Hafıza Kartları', description: 'Görsel veya metinsel eşleri bulun.', icon: <Layers />, colorClass: "bg-gradient-to-br from-rose-500 to-pink-600" },
        { href: '/teacher/smartboard/kategorilere-ayir', title: 'Kategorize Et', description: 'Öğeleri doğru gruplara sürükleyin.', icon: <FolderKanban />, colorClass: "bg-gradient-to-br from-lime-500 to-green-600" },
        { href: '/teacher/smartboard/hedefi-vur', title: 'Hedefi Vur', description: 'Doğru cevapları hızla hedef alarak vurun.', icon: <MousePointerClick />, colorClass: "bg-gradient-to-br from-red-600 to-rose-700" },
        { href: '/teacher/smartboard/milyoner-yarismasi', title: 'Milyoner', description: 'Kim bir sonraki milyoner olmak ister?', icon: <Trophy />, colorClass: "bg-gradient-to-br from-purple-600 to-indigo-700" },
        { href: '/teacher/smartboard/olay-siralama', title: 'Olay Sıralama', description: 'Olayları kronolojik olarak doğru sıraya koyun.', icon: <ArrowDownUp />, colorClass: "bg-gradient-to-br from-sky-600 to-cyan-700" },
        { href: '/teacher/smartboard/dogru-yanlis-zinciri', title: 'D/Y Zinciri', description: 'Doğru veya yanlış cevaplarla en uzun zinciri oluşturun.', icon: <Link2 />, colorClass: "bg-gradient-to-br from-green-600 to-teal-700" },
    ];
    
    return (
         <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-slate-900">
            <AppHeader />
            <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8">

                 <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white flex items-center justify-center gap-3">
                        <MonitorPlay className="h-10 w-10 text-primary" />
                        Akıllı Tahta Oyunları
                    </h1>
                    <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                        Sınıfınızla birlikte oynayabileceğiniz, rekabet dolu ve öğretici oyunlar.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {gameButtons.map((game, index) => (
                        <div key={index} className="h-64">
                            <GameButton {...game} />
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}


export default function SmartboardPage() {
    return (
        <AuthGuard role="teacher">
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
                <SmartboardClientPage />
            </Suspense>
        </AuthGuard>
    );
}

