
'use client';

import React, { useState, useEffect } from 'react';
import { 
    Loader2, BookOpen, Star, ChevronRight, FileText, Columns, Library, Gamepad2, 
    ArrowRight, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, Layers, Target 
} from 'lucide-react';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Topic = { id: string; title: string; hasYazilacaklarContent: boolean; hasOzetContent: boolean; hasUnitOzet?: boolean; };
type Unit = { id: string; title: string; hasUnitOzet: boolean; topics: Topic[] };
type Course = { id: string; title: string; units: Unit[] };
type ClassGroup = { name: string; courses: Course[] };

const getGradient = (index: number) => {
    const gradients = [
        'from-purple-500 to-indigo-600',
        'from-pink-500 to-rose-600',
        'from-emerald-400 to-teal-600',
        'from-amber-400 to-orange-600',
        'from-cyan-400 to-blue-600'
    ];
    return gradients[index % gradients.length];
};

const popularGames = [
  { href: '/oyunlar/kavram-avi', label: 'Kavram Avı', icon: Crosshair },
  { href: '/oyunlar/cumle-olusturma', label: 'Cümle Ustası', icon: Shuffle },
  { href: '/oyunlar/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb },
  { href: '/oyunlar/eslestirme', label: 'Eşleştirme', icon: Puzzle },
  { href: '/oyunlar/adam-asmaca', label: 'Adam Asmaca', icon: Skull },
  { href: '/oyunlar/hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers },
  { href: '/oyunlar/balon-avcisi', label: 'Balon Avcısı', icon: Target },
];

export default function PublicCurriculumPage() {
    const [data, setData] = useState<{ classGroups: ClassGroup[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchManifest = async () => {
            try {
                const res = await fetch('/curriculum/manifest.json');
                if (!res.ok) {
                    throw new Error('Müfredat manifestosu yüklenemedi.');
                }
                const manifestData = await res.json();
                setData(manifestData);
            } catch (error) {
                console.error("Error fetching manifest:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchManifest();
    }, []);

    const formatGroupName = (name: string) => {
        if (!isNaN(parseInt(name))) {
            return `${name}. Sınıf`;
        }
        return name;
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-cyan-500" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8 pb-20">
            <div className="text-center mb-12">
                <BookOpen className="mx-auto h-16 w-16 text-cyan-400 mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter">
                    Genel Müfredat
                </h1>
                <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
                    Ders içeriklerini, özetleri, önemli notları ve eğlenceli etkinlikleri keşfedin.
                </p>
            </div>

            <div className="space-y-12 max-w-6xl mx-auto">
                 {/* OYUNLAR BÖLÜMÜ */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                    <h2 className={cn(
                        "px-8 py-6 text-3xl font-black text-white bg-gradient-to-r from-rose-500 to-pink-600 flex items-center gap-3"
                    )}>
                        <Gamepad2 className="h-8 w-8 drop-shadow-md flex-shrink-0" />
                        Etkinlikler ve Oyunlar
                    </h2>
                    <div className="p-4 md:p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {popularGames.map((game) => {
                                const Icon = game.icon;
                                return (
                                <Link key={game.href} href={game.href} className="group">
                                    <div className="relative overflow-hidden rounded-xl p-4 h-28 flex flex-col items-center justify-center text-center transition-all duration-300 border bg-gradient-to-br from-slate-800 to-slate-900 border-white/10 hover:border-rose-500/50 hover:bg-slate-800/50 hover:scale-105 shadow-lg hover:shadow-rose-500/20">
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <Icon className="h-8 w-8 mb-2 text-rose-400 transition-colors group-hover:text-rose-300"/>
                                        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{game.label}</span>
                                    </div>
                                </Link>
                            )})}
                             <Link href="/oyunlar" className="group">
                                <div className="relative overflow-hidden rounded-xl p-4 h-28 flex flex-col items-center justify-center text-center transition-all duration-300 border-2 border-dashed bg-transparent border-white/10 hover:border-white/20 hover:bg-white/5">
                                    <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">Tüm Oyunlar</span>
                                    <ArrowRight className="h-5 w-5 mt-2 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-transform"/>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

                {(!data || !data.classGroups || data.classGroups.length === 0) ? (
                     <div className="text-center py-10 bg-slate-900/50 backdrop-blur-md border border-dashed border-white/10 rounded-3xl">
                        <p className="text-xl text-slate-400">Görüntülenecek ders içeriği bulunamadı.</p>
                    </div>
                ) : data.classGroups.map((group, groupIndex) => (
                    <div key={group.name} className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                        <h2 className={cn(
                            "px-8 py-6 text-3xl font-black text-white bg-gradient-to-r",
                            getGradient(groupIndex)
                        )}>
                            <div className="flex items-center gap-3">
                                <Star className="h-8 w-8 text-yellow-300 fill-yellow-300 drop-shadow-md flex-shrink-0" />
                                {formatGroupName(group.name)}
                            </div>
                        </h2>
                        
                        <div className="p-4 md:p-6">
                            <Accordion type="multiple" className="w-full space-y-4">
                                {group.courses.map((course) => (
                                    <AccordionItem key={course.id} value={course.id} className="border-none bg-slate-800/40 rounded-2xl overflow-hidden border border-white/5 hover:bg-slate-800/60 transition-colors">
                                        <AccordionTrigger className="px-6 py-4 hover:no-underline text-xl font-bold text-slate-200 group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-slate-900 border border-white/10 rounded-lg group-hover:scale-110 transition-transform">
                                                    <Library className="h-6 w-6 text-cyan-400" />
                                                </div>
                                                {course.title}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 pt-2">
                                            <Accordion type="multiple" className="w-full space-y-2">
                                                {course.units.map(unit => (
                                                     <AccordionItem key={unit.id} value={unit.id} className="border-none bg-slate-900/50 rounded-xl overflow-hidden">
                                                        <AccordionTrigger className="px-4 py-3 hover:no-underline text-slate-300 font-semibold group/unit">
                                                             <div className="flex items-center gap-3 w-full">
                                                                <ChevronRight className="h-4 w-4 text-slate-600 transition-transform duration-200 group-data-[state=open]/unit:rotate-90"/>
                                                                <span className="flex-1 text-left">{unit.title}</span>
                                                                {unit.hasUnitOzet && (
                                                                     <Link href={`/ozetler/${unit.id}`} onClick={(e) => e.stopPropagation()}>
                                                                        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-6 px-2 bg-amber-900/50 hover:bg-amber-600 border border-amber-700 hover:border-amber-500 text-amber-200 hover:text-white">
                                                                            <BookOpen className="h-3 w-3 mr-1"/> Ünite Özeti
                                                                        </span>
                                                                    </Link>
                                                                )}
                                                             </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="p-4 bg-black/20 space-y-2">
                                                            {unit.topics.map(topic => (
                                                                <div key={topic.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors">
                                                                    <p className="font-medium text-sm text-slate-300">{topic.title}</p>
                                                                    <div className="flex gap-2">
                                                                        {topic.hasYazilacaklarContent && (
                                                                            <Link href={`/yazilacaklar/${topic.id}`}>
                                                                                <Button variant="secondary" size="sm" className="h-7 px-3 text-xs bg-sky-600 hover:bg-sky-500 text-white"><Columns className="mr-1.5 h-3 w-3"/> Notlar</Button>
                                                                            </Link>
                                                                        )}
                                                                        {topic.hasOzetContent && (
                                                                             <Link href={`/ozetler/${topic.id}`}>
                                                                                <Button variant="secondary" size="sm" className="h-7 px-3 bg-purple-600 hover:bg-purple-500 text-white"><FileText className="mr-1.5 h-3 w-3"/> Özet</Button>
                                                                            </Link>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </AccordionContent>
                                                     </AccordionItem>
                                                ))}
                                            </Accordion>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
