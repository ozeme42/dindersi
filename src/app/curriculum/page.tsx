
// @/app/curriculum/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, Star, ChevronRight, FileText, Columns, Library } from 'lucide-react';
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

export default function PublicCurriculumPage() {
    const [data, setData] = useState<{ classGroups: ClassGroup[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchManifest = async () => {
            try {
                // public/curriculum/manifest.json dosyasını çek
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

    if (!data || !data.classGroups || data.classGroups.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-center">
                <p className="text-xl text-slate-400">Görüntülenecek herkese açık müfredat bulunamadı.</p>
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
                    Mevcut ders içeriklerini, özetleri ve önemli notları keşfedin.
                </p>
            </div>

            <div className="space-y-8 max-w-6xl mx-auto">
                {data.classGroups.map((group, groupIndex) => (
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
                                                                    <Link href={`/ozetler/${unit.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-6 px-2 bg-amber-900/50 hover:bg-amber-600 border border-amber-700 hover:border-amber-500 text-amber-200 hover:text-white">
                                                                        <BookOpen className="h-3 w-3 mr-1"/> Ünite Özeti
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
