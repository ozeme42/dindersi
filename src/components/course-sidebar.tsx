'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Course, Topic, Unit } from '@/lib/types';
import { Lock, Check, Play, Workflow, ArrowLeft } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CourseSidebarProps {
    course: Course;
    activeTopic: Topic | null;
    onSelectTopic: (topic: Topic) => void;
    onSelectUnitFlow?: (unit: Unit) => void;
    isTopicUnlocked: (topicId: string) => boolean;
    isTopicCompleted: (topicId: string) => boolean;
    topicProgress?: { [topicId: string]: any }; 
    testCounts?: { [topicId: string]: { easy: number, medium: number, hard: number } | null };
}

export function CourseSidebar({
    course,
    activeTopic,
    onSelectTopic,
    onSelectUnitFlow,
    isTopicUnlocked,
    isTopicCompleted,
    testCounts,
}: CourseSidebarProps) {
    
    const activeRef = useRef<HTMLDivElement>(null);

    // Aktif konu değiştiğinde scrol'u oraya kaydır
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeTopic]);

    // 1. Üniteleri Numarasına Göre Sırala (Görüntü İçin)
    const sortedUnits = React.useMemo(() => {
        if (!course?.units) return [];
        return [...course.units].sort((a, b) => 
            (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })
        );
    }, [course]);

    return (
        <div className="h-full flex flex-col bg-slate-950 border-r border-white/5 select-none">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Ders İçeriği</h3>
                    <h2 className="font-bold text-white text-lg leading-tight line-clamp-1">{course.title}</h2>
                </div>
                 <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl flex-shrink-0">
                    <Link href="/student/soru-bankasi"><ArrowLeft className="h-5 w-5"/></Link>
                </Button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-grow custom-scrollbar">
                <div className="p-4 pb-20">
                    <Accordion type="multiple" defaultValue={sortedUnits.map(u => u.id)} className="space-y-6">
                        {sortedUnits.map((unit, unitIndex) => {
                             
                             // 2. Konuları Numarasına Göre Sırala (Görüntü İçin)
                             const sortedTopics = (unit.topics || []).sort((a, b) => 
                                (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })
                            );

                            return (
                            <AccordionItem key={unit.id} value={unit.id} className="border-none">
                                
                                <AccordionTrigger className="py-3 px-4 mb-4 bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-white/5 text-slate-200 hover:text-white transition-all hover:no-underline group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:border-indigo-500/50 transition-colors">
                                            <span className="text-xs font-bold text-indigo-400">{unitIndex + 1}</span>
                                        </div>
                                        <span className="font-semibold text-sm text-left">{unit.title}</span>
                                    </div>
                                </AccordionTrigger>

                                <AccordionContent className="pt-0 pb-2 pl-2">
                                    {(onSelectUnitFlow && (unit as any).hasFlowContent) && (
                                        <div className="relative pl-6 pb-2 mb-2">
                                             <div className="absolute left-[-5px] top-0 bottom-0 w-2.5 flex items-center">
                                                <div className="w-2.5 h-full border-l-2 border-slate-800 -translate-x-px" />
                                            </div>
                                            <button 
                                                onClick={() => onSelectUnitFlow(unit)}
                                                className="w-full text-left p-3 rounded-xl border transition-all duration-300 flex items-center justify-between group/card relative overflow-hidden bg-purple-900/20 border-purple-500/50 hover:bg-purple-800/40 hover:border-purple-400/80"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="shrink-0 text-purple-400">
                                                        <Workflow className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-bold truncate text-white">
                                                        Ünite Akışını Başlat
                                                    </span>
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    <div className="relative border-l-2 border-slate-800 ml-4 space-y-1">
                                            {sortedTopics.map((topic) => {
                                                const isUnlocked = isTopicUnlocked(topic.id);
                                                const isCompleted = isTopicCompleted(topic.id);
                                                
                                                // Konu erişilebilir mi? (Kilidi açıksa VEYA zaten bitmişse)
                                                const isAccessible = isUnlocked || isCompleted;

                                                const isActive = activeTopic?.id === topic.id;
                                                
                                                const topicTestCounts = testCounts ? testCounts[topic.id] : null;
                                                const hasTests = topicTestCounts ? (topicTestCounts.easy > 0 || topicTestCounts.medium > 0 || topicTestCounts.hard > 0) : true;

                                                return (
                                                    <div 
                                                        key={topic.id} 
                                                        ref={isActive ? activeRef : null}
                                                        className="relative pl-6 py-2 group/topic"
                                                    >
                                                        {/* Sol Taraftaki Bağlantı Çizgisi ve Nokta */}
                                                        <div className={cn(
                                                            "absolute left-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 z-10 box-content",
                                                            isActive 
                                                                ? "bg-cyan-500 border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)] scale-125" 
                                                                : isCompleted 
                                                                    ? "bg-slate-900 border-emerald-500" 
                                                                    : isAccessible 
                                                                        ? "bg-slate-900 border-slate-500 group-hover/topic:border-white" // Sıradaki ama seçili değil
                                                                        : "bg-slate-900 border-slate-700" // Kilitli
                                                        )}>
                                                                {isCompleted && !isActive && (
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                                                    </div>
                                                                )}
                                                        </div>

                                                        {/* Konu Butonu */}
                                                        <button
                                                            onClick={() => isAccessible && onSelectTopic(topic)}
                                                            disabled={!isAccessible || !hasTests}
                                                            className={cn(
                                                                "w-full text-left p-3 rounded-xl border transition-all duration-300 flex items-center justify-between group/card relative overflow-hidden",
                                                                isActive 
                                                                    ? "bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_15px_rgba(8,145,178,0.1)]" 
                                                                    : isCompleted
                                                                        ? "bg-emerald-950/10 border-emerald-500/20 hover:bg-emerald-900/20 hover:border-emerald-500/40" // Biten konular yeşilimsi
                                                                        : !isAccessible || !hasTests
                                                                            ? "bg-transparent border-transparent opacity-50 cursor-not-allowed" 
                                                                            : "bg-slate-900/20 border-white/5 hover:bg-slate-800 hover:border-white/10"
                                                            )}
                                                        >
                                                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />}

                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={cn(
                                                                    "shrink-0 transition-colors",
                                                                    isActive ? "text-cyan-400" : isCompleted ? "text-emerald-500" : !isAccessible ? "text-slate-600" : "text-slate-400"
                                                                )}>
                                                                    {!isAccessible ? <Lock className="w-4 h-4" /> : isCompleted ? <Check className="w-4 w-4" /> : <Play className="w-4 w-4 fill-current" />}
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className={cn(
                                                                        "text-sm font-medium truncate pr-2 transition-colors",
                                                                        isActive ? "text-white" : isCompleted ? "text-emerald-100/80" : !isAccessible ? "text-slate-500" : "text-slate-300 group-hover/card:text-white"
                                                                    )}>
                                                                        {topic.title}
                                                                    </span>
                                                                    {!hasTests && isAccessible && (
                                                                         <span className="text-[10px] text-red-500 font-bold">Soru Yok</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )})}
                    </Accordion>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-slate-900/80 backdrop-blur-md text-[10px] text-slate-500 flex justify-between items-center">
                <span>İlerleme: %{calculateTotalProgress(course, isTopicCompleted)}</span>
                <div className="flex gap-3">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> Aktif</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Bitti</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div> Kilitli</span>
                </div>
            </div>
        </div>
    );
}

function calculateTotalProgress(course: Course, isTopicCompleted: (id: string) => boolean) {
    const allTopics = course.units?.flatMap(u => u.topics || []) || [];
    if (allTopics.length === 0) return 0;
    const completedCount = allTopics.filter(t => isTopicCompleted(t.id)).length;
    return Math.round((completedCount / allTopics.length) * 100);
}
