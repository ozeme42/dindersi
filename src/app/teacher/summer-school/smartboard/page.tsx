
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PenSquare, UserCog, FileCog, MonitorPlay, Sun, User, Users, Swords, ArrowRight } from 'lucide-react';
import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';


const FeatureButton = ({ href, title, description, icon, colorClass }: { href: string, title: string, description:string, icon: ReactNode, colorClass: string }) => {
    return (
        <Link href={href} className="block group h-full">
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
        </Link>
    )
};

export default function SummerSmartboardPage() {
  const buttons = [
    {
      href: "/teacher/summer-school/smartboard/bireysel",
      title: "Bireysel Yarışma",
      description: "Her öğrencinin kendi başına yarıştığı klasik mod.",
      icon: <User />,
      colorClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
      href: "/teacher/summer-school/smartboard/takim",
      title: "Takım Yarışması",
      description: "Öğrencileri takımlara ayırarak rekabeti artırın.",
      icon: <Users />,
      colorClass: "bg-accent text-accent-foreground hover:bg-accent/90",
    },
    {
      href: "/teacher/summer-school/smartboard/duello",
      title: "Düello",
      description: "İki öğrenciyi veya takımı karşı karşıya getirin.",
      icon: <Swords />,
      colorClass: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 space-y-12 h-full bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center animate-fade-in-up">
            <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary">Yaz Kursu Yarışmaları</h1>
            <p className="text-muted-foreground mt-4 text-xl md:text-2xl">Yaz kursu öğrencileriniz için bir yarışma türü seçin.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl h-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {buttons.map((buttonProps, index) => <div key={index} className="h-80"><FeatureButton {...buttonProps} /></div>)}
        </div>
    </div>
  );
}
