'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Course, Topic, Unit, QuestionBankProgress } from '@/lib/types';
import { Lock, Check, Play, MapPin, ChevronDown, BookOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

interface CourseSidebarProps {
    course: Course;
    activeTopic: Topic | null;
    onSelectTopic: (topic: Topic) => void;
    isTopicUnlocked: (topicIndex: number, unitIndex: number) => boolean;
    isTopicCompleted: (topicId: string) => boolean;
    // Aşağıdaki proplar opsiyoneldir, soru bankasında kullanılabilir ama ders anlatımında boş gelebilir
    topicProgress?: { [topicId: string]: any }; 
    testCounts?: { [topicId: string]: any }; 
}

export function CourseSidebar({
    course,
    activeTopic,
    onSelectTopic,
    isTopicUnlocked,
    isTopicCompleted,
}: CourseSidebarProps) {
    
    // Aktif konuyu görünür alana kaydırmak için ref
    const activeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeTopic]);

    return (
        <div className="h-full flex flex-col bg-slate-950 border-r border-white/5 select-none">
            {/* Başlık Alanı */}
            <div className="p-5 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Ders İçeriği</h3>
                <h2 className="font-bold text-white text-lg leading-tight line-clamp-1">{course.title}</h2>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 pb-20">
                    <Accordion type="multiple" defaultValue={course.units?.map(u => u.id)} className="space-y-6">
                        {course.units?.map((unit, unitIndex) => (
                            <AccordionItem key={unit.id} value={unit.id} className="border-none">
                                
                                {/* Ünite Başlığı (Modern Kart) */}
                                <AccordionTrigger className="py-3 px-4 mb-4 bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-white/5 text-slate-200 hover:text-white transition-all hover:no-underline group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:border-indigo-500/50 transition-colors">
                                            <span className="text-xs font-bold text-indigo-400">{unitIndex + 1}</span>
                                        </div>
                                        <span className="font-semibold text-sm text-left">{unit.title}</span>
                                    </div>
                                </AccordionTrigger>

                                <AccordionContent className="pt-0 pb-2 pl-2">
                                    {/* Timeline (Yol Haritası) Yapısı */}
                                    <div className="relative border-l-2 border-slate-800 ml-4 space-y-1">
                                        {unit.topics?.map((topic, topicIndex) => {
                                            const isLocked = !isTopicUnlocked(topicIndex, unitIndex);
                                            const isCompleted = isTopicCompleted(topic.id);
                                            const isActive = activeTopic?.id === topic.id;

                                            return (
                                                <div 
                                                    key={topic.id} 
                                                    ref={isActive ? activeRef : null}
                                                    className="relative pl-6 py-2 group/topic"
                                                >
                                                    {/* Bağlantı Çizgisi ve Nokta */}
                                                    <div className={cn(
                                                        "absolute left-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 z-10 box-content",
                                                        isActive 
                                                            ? "bg-cyan-500 border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)] scale-125" 
                                                            : isCompleted 
                                                                ? "bg-slate-900 border-emerald-500" 
                                                                : isLocked 
                                                                    ? "bg-slate-900 border-slate-700" 
                                                                    : "bg-slate-900 border-slate-500 group-hover/topic:border-white"
                                                    )}>
                                                        {isCompleted && !isActive && (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Konu Kartı */}
                                                    <button
                                                        onClick={() => !isLocked && onSelectTopic(topic)}
                                                        disabled={isLocked}
                                                        className={cn(
                                                            "w-full text-left p-3 rounded-xl border transition-all duration-300 flex items-center justify-between group/card relative overflow-hidden",
                                                            isActive 
                                                                ? "bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_15px_rgba(8,145,178,0.1)]" 
                                                                : isLocked 
                                                                    ? "bg-transparent border-transparent opacity-50 cursor-not-allowed" 
                                                                    : "bg-slate-900/20 border-white/5 hover:bg-slate-800 hover:border-white/10"
                                                        )}
                                                    >
                                                        {/* Aktiflik Işıltısı */}
                                                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />}

                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={cn(
                                                                "shrink-0",
                                                                isActive ? "text-cyan-400" : isLocked ? "text-slate-600" : isCompleted ? "text-emerald-500" : "text-slate-400"
                                                            )}>
                                                                {isLocked ? <Lock className="w-4 h-4" /> : isCompleted ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className={cn(
                                                                    "text-sm font-medium truncate pr-2",
                                                                    isActive ? "text-white" : isLocked ? "text-slate-500" : "text-slate-300 group-hover/card:text-white"
                                                                )}>
                                                                    {topic.title}
                                                                </span>
                                                                {isActive && (
                                                                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider animate-pulse">Şu an buradasın</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Sağ İkon (Kilit veya Ok) */}
                                                        {/* {!isLocked && !isActive && (
                                                            <ChevronDown className="w-4 h-4 text-slate-600 -rotate-90 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                                        )} */}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </ScrollArea>

            {/* Alt Bilgi */}
            <div className="p-4 border-t border-white/5 bg-slate-900/80 backdrop-blur-md text-[10px] text-slate-500 flex justify-between items-center">
                <span>İlerleme: %{calculateTotalProgress(course, isTopicCompleted)}</span>
                <div className="flex gap-2">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500"></div> Aktif</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Bitti</span>
                </div>
            </div>
        </div>
    );
}

// Yardımcı Fonksiyon: Toplam İlerlemeyi Hesapla
function calculateTotalProgress(course: Course, isTopicCompleted: (id: string) => boolean) {
    const allTopics = course.units?.flatMap(u => u.topics || []) || [];
    if (allTopics.length === 0) return 0;
    const completedCount = allTopics.filter(t => isTopicCompleted(t.id)).length;
    return Math.round((completedCount / allTopics.length) * 100);
}