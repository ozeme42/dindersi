
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PenSquare, UserCog, FileCog, MonitorPlay, Sun } from 'lucide-react';
import React, { type ReactNode } from 'react';

export default function SummerSchoolDashboard() {
  const features = [
    {
      title: "İçerik Yönetimi",
      description: "Yaz kursuna özel dersleri ve konuları yönetin.",
      href: "/teacher/summer-school/content-creation",
      icon: <PenSquare className="h-10 w-10 text-primary" />,
    },
    {
      title: "Öğrenci Yönetimi",
      description: "Yaz kursu öğrenci havuzunu yönetin.",
      href: "/teacher/summer-school/students",
      icon: <UserCog className="h-10 w-10 text-primary" />,
    },
    {
      title: "Soru Bankası",
      description: "Yaz kursu için özel sorular ekleyin ve yönetin.",
      href: "/teacher/summer-school/questions",
      icon: <FileCog className="h-10 w-10 text-primary" />,
    },
    {
      title: "Akıllı Tahta Yarışmaları",
      description: "Yaz kursu öğrencileriyle yarışmalar düzenleyin.",
      href: "/teacher/summer-school/smartboard",
      icon: <MonitorPlay className="h-10 w-10 text-primary" />,
    },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="text-center mb-12">
        <div className="inline-block p-4 bg-orange-100 rounded-full mb-4">
            <Sun className="h-12 w-12 text-orange-500"/>
        </div>
        <h1 className="text-4xl font-bold font-headline text-gray-800">Yaz Kursu Paneli</h1>
        <p className="text-muted-foreground mt-2">Yaz kursuyla ilgili tüm işlemleri buradan yönetin.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature) => (
          <Link href={feature.href} key={feature.title} className="block group">
            <div className="p-6 border rounded-lg h-full flex flex-col items-center text-center hover:shadow-lg hover:-translate-y-1 transition-transform duration-200">
              <div className="mb-4">{feature.icon}</div>
              <h2 className="text-xl font-semibold mb-2">{feature.title}</h2>
              <p className="text-muted-foreground text-sm mb-4 flex-grow">{feature.description}</p>
              <Button variant="link" className="mt-auto">Panele Git</Button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
