
"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, MonitorPlay, Workflow, Gamepad2 } from 'lucide-react';
import { cn } from "@/lib/utils";

const FeatureButton = ({ href, title, description, icon, colorClass }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string }) => {
    return (
        <Link href={href} className="block group h-full">
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
                    BAŞLA <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </div>
            </div>
        </Link>
    )
};

export function TeacherMainButtons() {
  const mainButtons = [
    {
      key: 'smartboard',
      href: '/teacher/smartboard',
      title: 'Akıllı Tahta',
      description: 'Sınıfınızla etkileşimli yarışmalar düzenleyin.',
      icon: <MonitorPlay />,
      colorClass: 'bg-indigo-600 border-indigo-800 hover:bg-indigo-500',
    },
    {
      key: 'dersAkisi',
      href: '/teacher/ders-akisi',
      title: 'Ders Akışı Yönetimi',
      description: 'Derslerin ve konuların akışını görselleştirin ve yönetin.',
      icon: <Workflow />,
      colorClass: 'bg-teal-600 border-teal-800 hover:bg-teal-500',
    },
    {
      key: 'activityCenterTeacher',
      href: '/oyunlar',
      title: 'Etkinlik Merkezi',
      description: 'Tüm öğrenci etkinliklerini buradan test edin.',
      icon: <Gamepad2 />,
      colorClass: 'bg-fuchsia-600 border-fuchsia-800 hover:bg-fuchsia-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {mainButtons.map(({ key, ...buttonProps }) => 
            <div key={key} className="aspect-[4/5] min-h-[380px]">
                 <FeatureButton {...buttonProps} />
            </div>
        )}
    </div>
  );
}
