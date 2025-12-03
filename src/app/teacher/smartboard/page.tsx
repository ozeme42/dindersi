"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MonitorPlay, Sun, User, Users, Swords, ArrowRight, BrainCircuit, Settings, Trophy, GitBranch, Columns, LayoutTemplate, Package, Wind, Gamepad2, UserCog } from 'lucide-react';
import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const FeatureButton = ({ href, title, description, icon, colorClass, isExternal }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string, isExternal?: boolean }) => {
    const linkContent = (
        <div className={cn(
            "h-full w-full rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-lg hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300",
            colorClass
        )}>
            {React.cloneElement(icon as React.ReactElement, { className: "h-16 w-16 opacity-90" })}
            <h3 className="font-headline text-3xl mt-4">{title}</h3>
            <p className="mt-2 opacity-80 text-sm max-w-xs">{description}</p>
            <div className="flex-grow" />
            <ArrowRight className="mt-4 h-6 w-6 group-hover:translate-x-1 transition-transform" />
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
  const yarışmalar = [
    {
      href: "/teacher/smartboard/bireysel",
      title: "Bireysel Yarışma",
      description: "Her öğrencinin kendi başına yarıştığı klasik mod.",
      icon: <User />,
      colorClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
      href: "/teacher/smartboard/takim",
      title: "Takım Yarışması",
      description: "Öğrencileri takımlara ayırarak rekabeti artırın.",
      icon: <Users />,
      colorClass: "bg-cyan-600 text-cyan-50 hover:bg-cyan-700",
    },
    {
      href: "/teacher/smartboard/duello",
      title: "Düello",
      description: "İki öğrenciyi veya takımı karşı karşıya getirin.",
      icon: <Swords />,
      colorClass: "bg-fuchsia-600 text-fuchsia-50 hover:bg-fuchsia-700",
    },
    {
      href: "/teacher/smartboard/kavram-duellosu",
      title: "Kavram Düellosu",
      description: "Tanımı verilen kavramı bularak rakibini alt et.",
      icon: <BrainCircuit />,
      colorClass: "bg-orange-500 text-orange-50 hover:bg-orange-600",
    },
     {
      href: "/teacher/smartboard/fetih-oyunu",
      title: "Fetih Oyunu",
      description: "Soruları doğru cevaplayarak harita üzerinde ilerleyin ve rakip kaleyi fethedin.",
      icon: <GitBranch />,
      colorClass: "bg-emerald-600 text-emerald-50 hover:bg-emerald-700",
    },
    {
      href: "/teacher/smartboard/tornado",
      title: "Tornado",
      description: "Rastgele kutuları açarak sürpriz sorular ve puanlarla karşılaşın.",
      icon: <Wind />,
      colorClass: "bg-blue-600 text-blue-50 hover:bg-blue-700",
    },
    {
      href: "/teacher/smartboard/kutu-ac",
      title: "Kutu Aç",
      description: "Kutuları açarak soruları cevaplayın ve puanları toplayın.",
      icon: <Package />,
      colorClass: "bg-indigo-500 text-indigo-50 hover:bg-indigo-600",
    },
  ];
  
   const sunumlar = [
     {
      href: "/teacher/smartboard/ozetler",
      title: "Özetler",
      description: "Konu özetlerini ve interaktif HTML içeriklerini tahtada gösterin.",
      icon: <LayoutTemplate />,
      colorClass: "bg-rose-500 text-rose-50 hover:bg-rose-600",
    },
     {
      href: "/teacher/smartboard/yazilacaklar",
      title: "Yazılacaklar",
      description: "Konu özetlerini, kavramları ve notları tahtada gösterin.",
      icon: <Columns />,
      colorClass: "bg-teal-500 text-teal-50 hover:bg-teal-600",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 space-y-12 min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center animate-fade-in-up">
            <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary">Akıllı Tahta</h1>
            <p className="text-muted-foreground mt-4 text-xl md:text-2xl">Sınıfınız için bir yarışma veya sunum türü seçin.</p>
        </div>
        
        <div className="w-full max-w-screen-2xl">
          <h2 className="text-3xl font-bold font-headline mb-6 text-center">Yarışmalar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {yarışmalar.map((buttonProps, index) => <div key={index} className="h-80"><FeatureButton {...buttonProps} /></div>)}
          </div>
        </div>

        <div className="w-full max-w-screen-2xl">
          <h2 className="text-3xl font-bold font-headline mb-6 text-center">Sunumlar ve Araçlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {sunumlar.map((buttonProps, index) => <div key={index} className="h-80"><FeatureButton {...buttonProps} /></div>)}
          </div>
        </div>

        <div className="flex items-center gap-6 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <Button asChild variant="default" size="lg">
                <Link href="/teacher/smartboard/leaderboard">
                    <Trophy className="mr-2 h-5 w-5" />
                    Turnuva Liderliği
                </Link>
            </Button>
            <Button asChild variant="link" className="text-muted-foreground">
                <Link href="/teacher/guest-students">
                    <UserCog className="mr-2 h-4 w-4" />
                    Sanal Öğrencileri Yönet
                </Link>
            </Button>
             <Button asChild variant="link" className="text-muted-foreground">
                <Link href="/teacher/game-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Oyun Ayarlarını Yönet
                </Link>
            </Button>
        </div>
    </div>
  );
}
