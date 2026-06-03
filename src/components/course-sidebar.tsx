'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Course, Topic, Unit } from '@/lib/types';
import { Lock, Check, Play, Workflow, ChevronRight, Sparkles, Star, ArrowLeft, BookOpen, BookText, BookCheck, GraduationCap, Library } from 'lucide-react';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeTopic]);

    const sortedUnits = React.useMemo(() => {
        if (!course?.units) return [];
        return [...course.units].sort((a, b) =>
            (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })
        );
    }, [course]);

    const totalProgress = calculateTotalProgress(course, isTopicCompleted);
    const allTopics = course.units?.flatMap(u => u.topics || []) || [];
    const completedCount = allTopics.filter(t => isTopicCompleted(t.id)).length;

    return (
        <div className="h-full flex flex-col bg-[#09071a] select-none">

            {/* ══ GERİ BUTONU + DERS BAŞLIĞI ══ */}
            <div className="relative px-4 py-3 flex items-center gap-3 border-b border-white/8 bg-[#09071a]/90 backdrop-blur-xl shrink-0">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                <Link href="/student/soru-bankasi" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0 flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1 min-w-0">
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-0.5">Ders</p>
                    <h2 className="font-black text-white text-sm truncate leading-none flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        {course.title}
                    </h2>
                </div>
            </div>

            {/* ══ İLERLEME ÖZET KARTI ══ */}
            <div className="relative px-4 pt-4 pb-3 border-b border-white/8 bg-[#09071a]/80 backdrop-blur-xl shrink-0">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

                {/* İlerleme bar */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Ders İlerlemesi</span>
                    </div>
                    <span className="text-[10px] font-black text-white tabular-nums">
                        {completedCount}<span className="text-slate-600">/{allTopics.length}</span>
                    </span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out"
                        style={{ width: `${totalProgress}%` }}
                    />
                </div>
                <div className="flex items-center gap-3 mt-2.5">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_4px_rgba(129,140,248,0.8)]" />
                        Aktif
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                        Bitti
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        Kilitli
                    </span>
                </div>
            </div>

            {/* ══ KONU LİSTESİ ══ */}
            <div className="overflow-y-auto flex-grow" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent' }}>
                <div className="p-3 pb-24 space-y-2">
                    <Accordion type="multiple" defaultValue={sortedUnits.map(u => u.id)}>
                        {sortedUnits.map((unit, unitIndex) => {
                            const sortedTopics = (unit.topics || []).sort((a, b) =>
                                (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })
                            );
                            const unitCompleted = sortedTopics.every(t => isTopicCompleted(t.id));
                            const unitStarted = sortedTopics.some(t => isTopicCompleted(t.id));

                            return (
                                <AccordionItem key={unit.id} value={unit.id} className="border-none mb-2">

                                    {/* Ünite Başlığı */}
                                    <AccordionTrigger className={cn(
                                        "py-0 px-0 hover:no-underline group/trigger"
                                    )}>
                                        <div className={cn(
                                            "w-full flex items-center gap-3 px-3 py-3 rounded-2xl border transition-all duration-300",
                                            unitCompleted
                                                ? "bg-emerald-950/30 border-emerald-500/25 hover:border-emerald-500/40"
                                                : unitStarted
                                                    ? "bg-indigo-950/30 border-indigo-500/20 hover:border-indigo-500/40"
                                                    : "bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/12"
                                        )}>
                                            {/* Numara rozeti */}
                                            <div className={cn(
                                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border font-black text-sm transition-all",
                                                unitCompleted
                                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                                    : unitStarted
                                                        ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                                                        : "bg-white/5 border-white/10 text-slate-500"
                                            )}>
                                                {unitCompleted ? <GraduationCap className="w-4 h-4 text-emerald-400" /> : unitIndex + 1}
                                            </div>
                                            <span className={cn(
                                                "font-black text-sm text-left flex-1 leading-tight",
                                                unitCompleted ? "text-emerald-200" : unitStarted ? "text-indigo-200" : "text-slate-300"
                                            )}>
                                                {unit.title}
                                            </span>
                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="pt-2 pb-0 pl-2">

                                        {/* Ünite akışı */}
                                        {(onSelectUnitFlow && (unit as any).hasFlowContent) && (
                                            <div className="mb-2 ml-2">
                                                <button
                                                    onClick={() => onSelectUnitFlow(unit)}
                                                    className="w-full text-left px-4 py-3 rounded-2xl border transition-all duration-300 flex items-center gap-3 group/flow bg-violet-950/30 border-violet-500/30 hover:bg-violet-900/40 hover:border-violet-400/50 active:scale-[0.98]"
                                                >
                                                    <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
                                                        <Library className="w-4 h-4 text-violet-300" />
                                                    </div>
                                                    <span className="text-sm font-black text-violet-200">Ünite Akışını Başlat</span>
                                                    <ChevronRight className="w-4 h-4 text-violet-400 ml-auto group-hover/flow:translate-x-0.5 transition-transform" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Konular: Dikey zincir */}
                                        <div className="relative ml-4 pl-4 border-l-2 border-white/5 space-y-1.5">
                                            {sortedTopics.map((topic, topicIndex) => {
                                                const isUnlocked = isTopicUnlocked(topic.id);
                                                const isCompleted = isTopicCompleted(topic.id);
                                                const isAccessible = isUnlocked || isCompleted;
                                                const isActive = activeTopic?.id === topic.id;
                                                const topicTestCounts = testCounts ? testCounts[topic.id] : null;
                                                const hasTests = topicTestCounts ? (topicTestCounts.easy > 0 || topicTestCounts.medium > 0 || topicTestCounts.hard > 0) : true;

                                                return (
                                                    <div
                                                        key={topic.id}
                                                        ref={isActive ? activeRef : null}
                                                        className="relative"
                                                    >
                                                        {/* Zincir noktası */}
                                                        <div className={cn(
                                                            "absolute -left-[21px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all duration-300 z-10",
                                                            isActive
                                                                ? "bg-indigo-500 border-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.9)] scale-125"
                                                                : isCompleted
                                                                    ? "bg-emerald-500 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                                                                    : isAccessible
                                                                        ? "bg-slate-800 border-slate-500"
                                                                        : "bg-slate-900 border-slate-700"
                                                        )} />

                                                        {/* Konu Butonu */}
                                                        <button
                                                            onClick={() => isAccessible && onSelectTopic(topic)}
                                                            disabled={!isAccessible || !hasTests}
                                                            className={cn(
                                                                "w-full text-left px-3 py-2.5 rounded-2xl border transition-all duration-200 flex items-center gap-3 group/card relative overflow-hidden active:scale-[0.97]",
                                                                isActive
                                                                    ? "bg-indigo-950/50 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                                                                    : isCompleted
                                                                        ? "bg-emerald-950/20 border-emerald-500/20 hover:bg-emerald-950/30 hover:border-emerald-500/35"
                                                                        : !isAccessible || !hasTests
                                                                            ? "bg-transparent border-transparent opacity-40 cursor-not-allowed"
                                                                            : "bg-white/3 border-white/6 hover:bg-white/6 hover:border-white/12"
                                                            )}
                                                        >
                                                            {/* Aktif sol çizgi */}
                                                            {isActive && (
                                                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] rounded-full" />
                                                            )}

                                                            {/* Durum ikonu */}
                                                            <div className={cn(
                                                                "w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 transition-all",
                                                                isActive
                                                                    ? "bg-indigo-500/25 border-indigo-500/50 text-indigo-300"
                                                                    : isCompleted
                                                                        ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                                                        : !isAccessible
                                                                            ? "bg-transparent border-slate-800 text-slate-600"
                                                                            : "bg-white/5 border-white/10 text-slate-400"
                                                            )}>
                                                                {!isAccessible
                                                                    ? <Lock className="w-3.5 h-3.5" />
                                                                    : isCompleted && !isActive
                                                                        ? <BookCheck className="w-3.5 h-3.5" />
                                                                        : <BookText className="w-3.5 h-3.5" />
                                                                }
                                                            </div>

                                                            {/* Başlık */}
                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                <span className={cn(
                                                                    "text-sm font-bold truncate leading-tight transition-colors",
                                                                    isActive ? "text-white" : isCompleted ? "text-emerald-100/80" : !isAccessible ? "text-slate-600" : "text-slate-300 group-hover/card:text-white"
                                                                )}>
                                                                    {topic.title}
                                                                </span>
                                                                {!hasTests && isAccessible && (
                                                                    <span className="text-[9px] text-rose-500 font-black uppercase tracking-wide">Soru Yok</span>
                                                                )}
                                                            </div>

                                                            {/* Aktif ok */}
                                                            {isActive && (
                                                                <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
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
