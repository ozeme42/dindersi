
"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, MonitorPlay, Workflow, Gamepad2 } from 'lucide-react';
import { cn } from "@/lib/utils";

const FeatureButton = ({ href, title, description, icon, colorClass }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string }) => {
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

export function TeacherMainButtons() {
  const mainButtons = [
    {
      key: 'smartboard',
      href: '/teacher/smartboard',
      title: 'Akıllı Tahta',
      description: 'Sınıfınızla etkileşimli yarışmalar düzenleyin.',
      icon: <MonitorPlay />,
      colorClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
    },
    {
      key: 'dersAkisi',
      href: '/teacher/ders-akisi',
      title: 'Ders Akışı Yönetimi',
      description: 'Derslerin ve konuların akışını görselleştirin ve yönetin.',
      icon: <Workflow />,
      colorClass: 'bg-cyan-600 text-cyan-50 hover:bg-cyan-700',
    },
    {
      key: 'activityCenterTeacher',
      href: '/teacher/activities',
      title: 'Etkinlik Merkezi',
      description: 'Tüm öğrenci etkinliklerini buradan test edin.',
      icon: <Gamepad2 />,
      colorClass: 'bg-fuchsia-600 text-fuchsia-50 hover:bg-fuchsia-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {mainButtons.map(({ key, ...buttonProps }) => 
            <div key={key} className="h-80">
                 <FeatureButton {...buttonProps} />
            </div>
        )}
    </div>
  );
}
