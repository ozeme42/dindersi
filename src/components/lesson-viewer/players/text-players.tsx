'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    HelpCircle, Lightbulb, MessageCircle, CheckCircle2, Sparkles, BookOpen, 
    Pencil, Copy, Check, Plus, Minus, Layers, ListChecks, ArrowRight, ArrowLeft,
    Clock, Target, ChevronRight, Grid3X3, Table, CheckSquare, Square, 
    Maximize2, LayoutList, Play, Pause, Flame, Zap, RotateCcw, Compass, FileText, 
    Star, Bookmark, Award, CheckCircle, ChevronDown, Trophy, Volume2, VolumeX, Eye,
    X, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import type { 
    HookQuestionStep, NotebookNoteStep, ProcessFlowStep, 
    ConceptMatrixStep, CategoryTableStep, TopicOutlineStep, LessonStep 
} from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playSound } from '@/lib/audio-service';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 DİKKAT ÇEKME & MERAK UYANDIRMA GİRİŞ SORUSU BİLEŞENİ (HookQuestionPlayer)
// ═══════════════════════════════════════════════════════════════════════════

export function HookQuestionPlayer({ 
    step, 
    isFullscreen, 
    fontSizeScale = 'normal' 
}: { 
    step: HookQuestionStep; 
    isFullscreen?: boolean; 
    fontSizeScale?: string;
}) {
    const isTeacher = useTeacherMode();
    const [showThoughtStarter, setShowThoughtStarter] = useState(false);
    const [hasTriggeredDiscussion, setHasTriggeredDiscussion] = useState(false);

    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'sm' ? 'sm' :
        fontSizeScale === 'xs' ? 'xs' : 'md';

    const getDynamicQuestionFontSize = () => {
        const qLen = step.question?.length || 0;

        if (!isTeacher) {
            if (qLen < 45) return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
            if (qLen <= 90) return "text-xl sm:text-2xl md:text-3xl lg:text-4xl";
            if (qLen <= 150) return "text-lg sm:text-xl md:text-2xl lg:text-3xl";
            return "text-base sm:text-lg md:text-xl lg:text-2xl";
        }

        if (qLen < 45) {
            switch (cardScale) {
                case 'xs': return "text-2xl sm:text-3xl md:text-4xl";
                case 'sm': return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
                case 'md': return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl";
                case 'lg': return "text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl";
                case 'xl': return "text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem]";
                default: return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl";
            }
        } else if (qLen <= 90) {
            switch (cardScale) {
                case 'xs': return "text-xl sm:text-2xl md:text-3xl";
                case 'sm': return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
                case 'md': return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
                case 'lg': return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl";
                case 'xl': return "text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl";
                default: return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
            }
        } else if (qLen <= 150) {
            switch (cardScale) {
                case 'xs': return "text-lg sm:text-xl md:text-2xl";
                case 'sm': return "text-xl sm:text-2xl md:text-3xl lg:text-4xl";
                case 'md': return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";
                case 'lg': return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
                case 'xl': return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl";
                default: return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";
            }
        } else {
            switch (cardScale) {
                case 'xs': return "text-base sm:text-lg md:text-xl";
                case 'sm': return "text-lg sm:text-xl md:text-2xl lg:text-3xl";
                case 'md': return "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl";
                case 'lg': return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";
                case 'xl': return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
                default: return "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl";
            }
        }
    };

    const handleStartDiscussion = () => {
        playSound('pop');
        setHasTriggeredDiscussion(true);
        import('canvas-confetti').then(m => {
            m.default({
                particleCount: 70,
                spread: 70,
                origin: { y: 0.6 }
            });
        }).catch(() => {});
    };

    return (
        <div className={cn(
            "w-full h-full max-h-full flex flex-col items-center justify-between select-none mx-auto overflow-hidden",
            isTeacher ? "max-w-7xl px-3 sm:px-6 py-2 sm:py-4" : "max-w-5xl px-3 py-2",
            isFullscreen && "py-3 sm:py-5"
        )}>
            {/* ══ ÜST ROZET / ETİKET ══ */}
            <motion.div 
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border-2 border-amber-400/40 text-amber-700 dark:text-amber-300 text-xs sm:text-sm md:text-base font-black uppercase tracking-wider mb-2 sm:mb-3 shadow-[0_0_20px_rgba(245,158,11,0.25)] backdrop-blur-xl"
            >
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>{step.tag || step.title || '🤔 Derse Başlarken: Bir Düşünelim!'}</span>
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
            </motion.div>

            {/* ══ ANA SORU KARTI (DİNAMİK TAM EKRAN ÇERÇEVE) ══ */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative w-full flex-1 min-h-0 rounded-3xl md:rounded-[2.5rem] border-2 md:border-3 border-indigo-200/90 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl text-center flex flex-col items-center justify-between overflow-hidden p-4 sm:p-6 md:p-8 lg:p-10"
            >
                {/* Parlayan Üst Işık Çizgisi */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 shrink-0" />
                
                {/* Soru / Dikkat İkonu */}
                <div className="shrink-0 w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-500 flex items-center justify-center shadow-md mb-2 sm:mb-4">
                    <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 animate-pulse" />
                </div>

                {/* Soru Metni (Ekrana Dinamik Sığan Ana Gövde) */}
                <div className="flex-1 min-h-0 w-full flex items-center justify-center px-2 sm:px-6 md:px-10 my-auto overflow-y-auto scrollbar-none">
                    <h2 className={cn(
                        "font-black text-slate-900 dark:text-white leading-[1.2] tracking-tight max-w-5xl xl:max-w-6xl",
                        getDynamicQuestionFontSize()
                    )}>
                        "{step.question}"
                    </h2>
                </div>

                {/* ══ ALT PANEL: DÜŞÜNME İPUCU & ETKİLEŞİM BUTONU ══ */}
                <div className="shrink-0 w-full flex flex-col items-center gap-2 sm:gap-3 mt-2 sm:mt-4">
                    {/* Düşünme / Tartışma İpucu Paneli */}
                    {step.thoughtStarter && (
                        <div className="w-full max-w-3xl">
                            {!showThoughtStarter ? (
                                <button
                                    onClick={() => { playSound('pop'); setShowThoughtStarter(true); }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border-2 border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs sm:text-sm md:text-base font-bold transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                                >
                                    <Lightbulb className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500 animate-bounce" />
                                    <span>💡 Düşünme & Tartışma İpucunu Aç</span>
                                </button>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400/40 text-amber-950 dark:text-amber-200 text-left shadow-inner flex items-start gap-3 relative max-h-32 sm:max-h-40 overflow-y-auto scrollbar-thin"
                                >
                                    <Lightbulb className="w-5 h-5 md:w-7 md:h-7 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                                            💡 Sınıfça Düşünelim & Tartışalım:
                                        </span>
                                        <p className="text-sm sm:text-base md:text-lg font-bold leading-relaxed">
                                            {step.thoughtStarter}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowThoughtStarter(false)}
                                        className="text-amber-600/60 hover:text-amber-800 dark:hover:text-white p-1"
                                        title="Gizle"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Söz Hakkı & Etkileşim Butonu */}
                    <Button
                        onClick={handleStartDiscussion}
                        className={cn(
                            "rounded-2xl font-black transition-all active:scale-95 shadow-lg h-11 sm:h-13 px-5 sm:px-8 text-sm sm:text-base md:text-lg",
                            hasTriggeredDiscussion
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30"
                                : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 shadow-orange-500/30"
                        )}
                    >
                        <MessageSquare className="w-4.5 h-4.5 mr-2" />
                        {hasTriggeredDiscussion ? "✓ Fikirleri Dinliyoruz..." : "🎤 Söz Hakkı & Fikirleri Paylaş"}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📝 1. DEFTERİMİZE YAZALIM (ÖZET DEFTER NOTU) BİLEŞENİ (NotebookNotePlayer)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 📝 1. DEFTERİMİZE YAZALIM (ÖZET DEFTER NOTU & KAVRAMLAR) BİLEŞENİ (NotebookNotePlayer)
// ═══════════════════════════════════════════════════════════════════════════

export function NotebookNotePlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal'
}: {
    step: NotebookNoteStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
}) {
    const isTeacher = useTeacherMode();
    const conceptDefs = step.conceptDefinitions || [];
    const noteItems = step.notes || [];
    const hasConcepts = conceptDefs.length > 0;
    const hasNotes = noteItems.length > 0;

    // Varsayılan görünüm modu
    const [viewMode, setViewMode] = useState<'split' | 'concepts' | 'notes'>(
        hasConcepts && hasNotes ? 'split' : (hasConcepts ? 'concepts' : 'notes')
    );

    useEffect(() => {
        const cExist = (step.conceptDefinitions && step.conceptDefinitions.length > 0);
        const nExist = (step.notes && step.notes.length > 0);
        if (cExist && nExist) {
            setViewMode('split');
        } else if (cExist) {
            setViewMode('concepts');
        } else {
            setViewMode('notes');
        }
    }, [step]);

    // Dinamik Punto Boyutu (Akıllı Tahta Ayarı)
    const [baseFontSize, setBaseFontSize] = useState<number>(
        fontSizeScale === 'huge' || fontSizeScale === 'xl' ? 1.65 :
        fontSizeScale === 'lg' ? 1.5 :
        fontSizeScale === 'xs' ? 1.1 : 1.35
    );

    const increaseFontSize = () => setBaseFontSize(fs => Math.min(Number((fs + 0.15).toFixed(2)), 2.6));
    const decreaseFontSize = () => setBaseFontSize(fs => Math.max(Number((fs - 0.15).toFixed(2)), 0.85));

    // Canlı Sayaç
    const initialSeconds = (step.suggestedMinutes || 3) * 60;
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerDone, setTimerDone] = useState(false);
    const [checkedItems, setCheckedItems] = useState<{ [index: number]: boolean }>({});

    useEffect(() => {
        const s = (step.suggestedMinutes || 3) * 60;
        setTimeLeft(s);
        setIsTimerRunning(false);
        setTimerDone(false);
        setCheckedItems({});
    }, [step]);

    useEffect(() => {
        let interval: any = null;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsTimerRunning(false);
                        setTimerDone(true);
                        playSound('win');
                        import('canvas-confetti').then(m => {
                            m.default({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
                        }).catch(() => {});
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const toggleTimer = () => {
        playSound('pop');
        if (timeLeft === 0) {
            setTimeLeft(initialSeconds);
            setTimerDone(false);
        }
        setIsTimerRunning(prev => !prev);
    };

    const resetTimer = () => {
        playSound('pop');
        setIsTimerRunning(false);
        setTimeLeft(initialSeconds);
        setTimerDone(false);
    };

    const addExtraMinute = () => {
        playSound('pop');
        setTimeLeft(prev => prev + 60);
    };

    const toggleCheckItem = (index: number) => {
        playSound('pop');
        setCheckedItems(prev => ({ ...prev, [index]: !prev[index] }));
    };

    // Canlı, Doygun ve Yüksek Kontrastlı 6 Renk Teması (Yazılacaklar Modülü Birebir)
    const vividColorClasses = [
        'bg-indigo-900/60 border-2 border-indigo-400/80 text-white shadow-[0_4px_24px_rgba(99,102,241,0.35)]', 
        'bg-emerald-900/60 border-2 border-emerald-400/80 text-white shadow-[0_4px_24px_rgba(16,185,129,0.35)]', 
        'bg-rose-900/60 border-2 border-rose-400/80 text-white shadow-[0_4px_24px_rgba(244,63,94,0.35)]', 
        'bg-amber-900/60 border-2 border-amber-400/80 text-white shadow-[0_4px_24px_rgba(245,158,11,0.35)]', 
        'bg-cyan-900/60 border-2 border-cyan-400/80 text-white shadow-[0_4px_24px_rgba(6,182,212,0.35)]',
        'bg-fuchsia-900/60 border-2 border-fuchsia-400/80 text-white shadow-[0_4px_24px_rgba(217,70,239,0.35)]'
    ];

    if (!hasConcepts && !hasNotes) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <div className="p-8 rounded-3xl bg-slate-900/95 border-2 border-white/20 text-slate-200 max-w-lg shadow-2xl backdrop-blur-xl">
                    <Pencil className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
                    <h3 className="text-2xl font-black text-white mb-2">{step.title || 'Defterimize Yazalım'}</h3>
                    <p className="text-slate-300 font-medium">Bu adım için henüz kayıtlı kavram veya defter notu bulunmuyor.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col justify-start p-2 md:p-3.5 select-none overflow-y-auto bg-slate-950 text-white">
            
            {/* ══ ULTRA-KOMPAKT ÜST KONTROL ÇUBUĞU (SIFIR BOŞLUK) ══ */}
            <div className="flex-shrink-0 w-full flex flex-wrap items-center justify-between gap-2 mb-2.5 p-2 md:p-2.5 rounded-2xl bg-slate-900/95 border border-white/20 backdrop-blur-xl shadow-xl">
                
                {/* BAŞLIK */}
                <div className="flex items-center justify-center gap-2.5 text-center">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black shadow-md flex-shrink-0">
                        <Pencil className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                        <h2 className="font-black text-white text-sm sm:text-base md:text-lg tracking-tight leading-tight flex items-center justify-center gap-2 text-center">
                            <span>{step.title || '✏️ Defterimize Yazalım'}</span>
                        </h2>
                        {step.noteTitle && (
                            <p className="text-[11px] text-amber-300 font-bold hidden sm:block leading-none mt-0.5 text-center">
                                {step.noteTitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* ORTA: GÖRÜNÜM MODLARI (SEKMELER) */}
                <div className="flex items-center p-0.5 bg-slate-950/90 border border-white/15 rounded-xl shadow-inner">
                    {hasConcepts && hasNotes && (
                        <button
                            onClick={() => { playSound('pop'); setViewMode('split'); }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5",
                                viewMode === 'split'
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <span>🔲 Yan Yana (Tümü)</span>
                        </button>
                    )}
                    {hasConcepts && (
                        <button
                            onClick={() => { playSound('pop'); setViewMode('concepts'); }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5",
                                viewMode === 'concepts'
                                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-900"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <span>📖 Kavramlar</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{conceptDefs.length}</span>
                        </button>
                    )}
                    {hasNotes && (
                        <button
                            onClick={() => { playSound('pop'); setViewMode('notes'); }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5",
                                viewMode === 'notes'
                                    ? "bg-amber-600 text-white shadow-md shadow-amber-900"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <span>✏️ Defter Notları</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{noteItems.length}</span>
                        </button>
                    )}
                </div>

                {/* SAĞ: PUNTOLAR VE CANLI SAYAÇ */}
                <div className="flex items-center gap-2">
                    {/* Punto Ayarı */}
                    <div className="flex items-center bg-slate-950/90 rounded-xl p-0.5 border border-white/15">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={decreaseFontSize} 
                            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                            title="Yazı Boyutunu Küçült"
                        >
                            <Minus className="h-3.5 w-3.5"/>
                        </Button>
                        <span className="text-[10px] font-black text-slate-300 w-8 text-center uppercase">Boyut</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={increaseFontSize} 
                            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                            title="Yazı Boyutunu Büyüt"
                        >
                            <Plus className="h-3.5 w-3.5"/>
                        </Button>
                    </div>

                    {/* Sayaç */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-white/15 shadow-sm">
                        <Clock className={cn("w-3.5 h-3.5", isTimerRunning ? "text-emerald-400 animate-spin" : "text-slate-400")} />
                        <span className="font-mono font-black text-xs md:text-sm text-white">
                            {formatTime(timeLeft)}
                        </span>
                        <Button
                            size="sm"
                            onClick={toggleTimer}
                            className={cn(
                                "h-6 px-2 text-[11px] font-black rounded-lg transition-all",
                                isTimerRunning 
                                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950" 
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            )}
                        >
                            {isTimerRunning ? <Pause className="w-3 h-3 mr-0.5" /> : <Play className="w-3 h-3 mr-0.5" />}
                            {isTimerRunning ? "Durdur" : (timerDone ? "Yeniden" : "Başlat")}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={addExtraMinute}
                            title="+1 Dakika Ekle"
                            className="h-6 px-1.5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                        >
                            +1dk
                        </Button>
                        {timeLeft !== initialSeconds && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={resetTimer}
                                className="h-6 px-1 text-slate-400 hover:text-slate-200"
                            >
                                <RotateCcw className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ 1. YAN YANA GÖRÜNÜM (SPLIT VIEW - EKRANI 100% DOLDURAN) ══ */}
            {viewMode === 'split' && hasConcepts && hasNotes && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full flex-grow items-start">
                    
                    {/* SOL PANEL: KAVRAM KARTLARI (6 SÜTUN) */}
                    <div className="lg:col-span-6 flex flex-col space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                                📖 Anahtar Kavramlar ({conceptDefs.length})
                            </span>
                        </div>
                        <div className={cn("grid gap-2.5 w-full", isTeacher ? "grid-cols-2 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
                            {conceptDefs.map((item, index) => (
                                <div
                                    key={`split-c-${index}`}
                                    className={cn(
                                        "relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between",
                                        vividColorClasses[index % vividColorClasses.length]
                                    )}
                                >
                                    {/* Numara Filigranı */}
                                    <div className="absolute top-0 right-0 bg-black/40 text-white/40 font-black text-5xl p-1 leading-none pointer-events-none select-none rounded-bl-xl opacity-35">
                                        {index + 1}
                                    </div>
                                    <div className="p-3 md:p-4 flex flex-col h-full z-10 relative">
                                        <h3 
                                            className="font-black text-white mb-1.5 border-b border-white/20 pb-1 uppercase tracking-tight leading-tight drop-shadow-md"
                                            style={{ fontSize: `${baseFontSize * 1.15}rem` }}
                                        >
                                            {item.concept}
                                        </h3>
                                        <p 
                                            className="font-bold text-white leading-snug drop-shadow"
                                            style={{ fontSize: `${baseFontSize * 0.95}rem` }}
                                        >
                                            {item.definition}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SAĞ PANEL: DEFTER NOTLARI (6 SÜTUN) */}
                    <div className="lg:col-span-6 flex flex-col space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                                ✏️ Deftere Yazılacaklar ({noteItems.length})
                            </span>
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                            {noteItems.map((note, idx) => {
                                const isChecked = checkedItems[idx] || false;
                                return (
                                    <div
                                        key={`split-n-${idx}`}
                                        onClick={() => toggleCheckItem(idx)}
                                        className={cn(
                                            "flex items-start gap-3 p-3 md:p-3.5 rounded-2xl border-2 shadow-xl backdrop-blur-md transition-all cursor-pointer",
                                            isChecked 
                                                ? "bg-emerald-950/80 border-emerald-400 text-emerald-100" 
                                                : "bg-slate-900/95 border-amber-500/60 hover:bg-slate-800 text-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "flex-shrink-0 flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl font-black text-lg md:text-xl shadow-md border mt-0.5",
                                            isChecked
                                                ? "bg-emerald-500 border-emerald-300 text-white"
                                                : "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300/40 text-white"
                                        )}>
                                            {isChecked ? <Check className="w-5 h-5" /> : idx + 1}
                                        </div>
                                        <p 
                                            className={cn(
                                                "font-bold leading-snug flex-1 select-text pt-0.5 drop-shadow",
                                                isChecked ? "line-through opacity-75 text-emerald-200" : "text-white"
                                            )}
                                            style={{ fontSize: `${baseFontSize}rem` }}
                                        >
                                            {note}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}

            {/* ══ 2. TAM EKRAN KAVRAMLAR IZGARASI (AUTO-FIT GRID) ══ */}
            {viewMode === 'concepts' && hasConcepts && (
                <div className="w-full flex flex-col space-y-2 flex-grow">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-base md:text-xl font-black text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                            <span>📖 {step.noteTitle || 'Anahtar Kavramlar'}</span>
                        </h3>
                        <span className="text-xs text-slate-300 font-bold">Toplam {conceptDefs.length} Kavram</span>
                    </div>
                    <div className={cn("grid gap-2.5 md:gap-3.5 w-full", isTeacher ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4")}>
                        {conceptDefs.map((item, index) => (
                            <div
                                key={`full-c-${index}`}
                                className={cn(
                                    "relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between",
                                    vividColorClasses[index % vividColorClasses.length]
                                )}
                            >
                                <div className="absolute top-0 right-0 bg-black/40 text-white/40 font-black text-6xl p-1.5 leading-none pointer-events-none select-none rounded-bl-2xl opacity-35">
                                    {index + 1}
                                </div>
                                <div className="p-3.5 md:p-4 flex flex-col h-full z-10 relative">
                                    <h3 
                                        className="font-black text-white mb-2 border-b border-white/20 pb-1.5 uppercase tracking-tight leading-tight drop-shadow-md"
                                        style={{ fontSize: `${baseFontSize * 1.2}rem` }}
                                    >
                                        {item.concept}
                                    </h3>
                                    <div className="flex-grow">
                                        <p 
                                            className="font-bold text-white leading-snug drop-shadow"
                                            style={{ fontSize: `${baseFontSize}rem` }}
                                        >
                                            {item.definition}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ══ 3. TAM EKRAN DEFTER NOTLARI IZGARASI ══ */}
            {viewMode === 'notes' && hasNotes && (
                <div className="w-full flex flex-col space-y-2 flex-grow">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-base md:text-xl font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
                            <span>✏️ {step.noteTitle || 'Önemli Notlar'}</span>
                        </h3>
                        <span className="text-xs text-slate-300 font-bold">Toplam {noteItems.length} Madde</span>
                    </div>
                    <div className={cn("grid gap-2.5 md:gap-3.5 w-full", isTeacher ? "grid-cols-2 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}>
                        {noteItems.map((note, idx) => {
                            const isChecked = checkedItems[idx] || false;
                            return (
                                <div
                                    key={`full-n-${idx}`}
                                    onClick={() => toggleCheckItem(idx)}
                                    className={cn(
                                        "flex items-start gap-3.5 p-4 md:p-5 rounded-2xl border-2 shadow-xl backdrop-blur-md transition-all cursor-pointer",
                                        isChecked 
                                            ? "bg-emerald-950/80 border-emerald-400 text-emerald-100" 
                                            : "bg-slate-900/95 border-amber-500/60 hover:bg-slate-800 text-white"
                                    )}
                                >
                                    <div className={cn(
                                        "flex-shrink-0 flex items-center justify-center w-11 h-11 md:w-13 md:h-13 rounded-2xl font-black text-xl md:text-2xl shadow-md border mt-0.5",
                                        isChecked
                                            ? "bg-emerald-500 border-emerald-300 text-white"
                                            : "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300/40 text-white"
                                    )}>
                                        {isChecked ? <Check className="w-6 h-6" /> : idx + 1}
                                    </div>
                                    <p 
                                        className={cn(
                                            "font-bold leading-snug flex-1 select-text pt-1 drop-shadow",
                                            isChecked ? "line-through opacity-75 text-emerald-200" : "text-white"
                                        )}
                                        style={{ fontSize: `${baseFontSize}rem` }}
                                    >
                                        {note}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🪜 2. ADIM ADIM YOL HARİTASI & SÜREÇ BİLEŞENİ (ProcessFlowPlayer)
// ═══════════════════════════════════════════════════════════════════════════

export function ProcessFlowPlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal'
}: {
    step: ProcessFlowStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
}) {
    const isTeacher = useTeacherMode();
    const [activeStepIndex, setActiveStepIndex] = useState(0);

    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'xs' ? 'xs' : 'sm';

    const getDescFontSize = () => {
        switch (cardScale) {
            case 'xs': return isTeacher ? "text-base md:text-lg" : "text-xs md:text-sm";
            case 'sm': return isTeacher ? "text-lg md:text-xl" : "text-sm md:text-base";
            case 'md': return isTeacher ? "text-xl md:text-2xl" : "text-base md:text-lg";
            case 'lg': return isTeacher ? "text-2xl md:text-3xl" : "text-lg md:text-xl";
            case 'xl': return isTeacher ? "text-3xl md:text-4xl" : "text-xl md:text-2xl";
            default: return isTeacher ? "text-xl md:text-2xl" : "text-base md:text-lg";
        }
    };

    const handleSelectStep = (idx: number) => {
        playSound('pop');
        setActiveStepIndex(idx);
    };

    const handleNextStep = () => {
        playSound('pop');
        setActiveStepIndex(prev => Math.min((step.steps || []).length - 1, prev + 1));
    };

    const handlePrevStep = () => {
        playSound('pop');
        setActiveStepIndex(prev => Math.max(0, prev - 1));
    };

    const stepsList = step.steps || [];

    const STEP_GRADIENTS = [
        { active: 'from-blue-600 to-indigo-600 border-blue-400 text-white shadow-blue-500/40', badge: 'bg-blue-500/20 text-blue-300 border-blue-400/40' },
        { active: 'from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
        { active: 'from-amber-600 to-orange-600 border-amber-400 text-white shadow-amber-500/40', badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40' },
        { active: 'from-purple-600 to-pink-600 border-purple-400 text-white shadow-purple-500/40', badge: 'bg-purple-500/20 text-purple-300 border-purple-400/40' },
        { active: 'from-rose-600 to-red-600 border-rose-400 text-white shadow-rose-500/40', badge: 'bg-rose-500/20 text-rose-300 border-rose-400/40' },
    ];

    return (
        <div className={cn(
            "w-full h-full flex flex-col items-center justify-start p-3 md:p-6 select-none max-w-5xl mx-auto overflow-y-auto",
            isFullscreen ? "py-6" : "py-3"
        )}>
            {/* ══ BAŞLIK ROZETİ ══ */}
            <motion.div 
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 border-2 border-blue-400/40 text-blue-700 dark:text-blue-300 text-xs md:text-sm font-black uppercase tracking-wider mb-4 md:mb-6 shadow-sm backdrop-blur-xl"
            >
                <Compass className="w-4 h-4 text-blue-500 animate-spin" />
                <span>{step.title || '🪜 Adım Adım Yol Haritası & Süreç'}</span>
                <Compass className="w-4 h-4 text-blue-500 animate-spin" />
            </motion.div>

            {/* ══ STEPPER ÜST SEÇİCİ (Yatay Adım Çizgisi) ══ */}
            <div className="w-full flex items-center justify-between gap-2 overflow-x-auto pb-3 mb-4">
                {stepsList.map((item, idx) => {
                    const isCurrent = idx === activeStepIndex;
                    const isPassed = idx < activeStepIndex;
                    const style = STEP_GRADIENTS[idx % STEP_GRADIENTS.length];
                    return (
                        <div key={idx} className="flex-1 min-w-[120px] flex flex-col items-center">
                            <button
                                onClick={() => handleSelectStep(idx)}
                                className={cn(
                                    "w-full p-2.5 sm:p-3.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer",
                                    isCurrent
                                        ? `bg-gradient-to-r ${style.active} scale-105 shadow-lg`
                                        : isPassed
                                            ? "bg-slate-800/80 border-emerald-500/40 text-emerald-300 hover:bg-slate-800"
                                            : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                                )}
                            >
                                <span className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center font-black text-xs">
                                    {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                </span>
                                <span className="font-bold text-xs truncate">
                                    {item.title}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ══ AKTİF ADIM DETAY KARTI ══ */}
            {stepsList[activeStepIndex] && (
                <motion.div
                    key={activeStepIndex}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="relative w-full rounded-3xl p-6 sm:p-8 md:p-10 border-2 border-blue-200/90 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl text-left overflow-hidden min-h-[220px] flex flex-col justify-between"
                >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    
                    <div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-300 text-xs font-black uppercase tracking-wider mb-4">
                            <span>ADIM {activeStepIndex + 1} / {stepsList.length}</span>
                        </div>

                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3">
                            {stepsList[activeStepIndex].title}
                        </h3>

                        <p className={cn(
                            "font-bold text-slate-700 dark:text-slate-200 leading-relaxed",
                            getDescFontSize()
                        )}>
                            {stepsList[activeStepIndex].description}
                        </p>
                    </div>

                    {/* Gezinme Butonları */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4 mt-6">
                        <Button
                            variant="outline"
                            onClick={handlePrevStep}
                            disabled={activeStepIndex === 0}
                            className="rounded-xl font-bold"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Önceki Adım
                        </Button>
                        <Button
                            onClick={handleNextStep}
                            disabled={activeStepIndex === stepsList.length - 1}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                        >
                            Sıradaki Adım <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔲 3. 4 BOYUTTA KONU MATRİSİ BİLEŞENİ (ConceptMatrixPlayer)
// ═══════════════════════════════════════════════════════════════════════════

export function ConceptMatrixPlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal'
}: {
    step: ConceptMatrixStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
}) {
    const isTeacher = useTeacherMode();
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'xs' ? 'xs' : 'sm';

    const getContentFontSize = () => {
        switch (cardScale) {
            case 'xs': return isTeacher ? "text-sm md:text-base" : "text-xs md:text-sm";
            case 'sm': return isTeacher ? "text-base md:text-lg" : "text-sm md:text-base";
            case 'md': return isTeacher ? "text-lg md:text-xl" : "text-base md:text-lg";
            case 'lg': return isTeacher ? "text-xl md:text-2xl" : "text-lg md:text-xl";
            case 'xl': return isTeacher ? "text-2xl md:text-3xl" : "text-xl md:text-2xl";
            default: return isTeacher ? "text-lg md:text-xl" : "text-base md:text-lg";
        }
    };

    const QUADRANT_STYLES = [
        {
            border: 'border-sky-400/50 hover:border-sky-400',
            bg: 'bg-sky-500/10 hover:bg-sky-500/15',
            badge: 'bg-sky-500 text-white',
            text: 'text-sky-950 dark:text-sky-100',
            titleText: 'text-sky-700 dark:text-sky-300'
        },
        {
            border: 'border-emerald-400/50 hover:border-emerald-400',
            bg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
            badge: 'bg-emerald-500 text-white',
            text: 'text-emerald-950 dark:text-emerald-100',
            titleText: 'text-emerald-700 dark:text-emerald-300'
        },
        {
            border: 'border-amber-400/50 hover:border-amber-400',
            bg: 'bg-amber-500/10 hover:bg-amber-500/15',
            badge: 'bg-amber-500 text-slate-950',
            text: 'text-amber-950 dark:text-amber-100',
            titleText: 'text-amber-700 dark:text-amber-300'
        },
        {
            border: 'border-purple-400/50 hover:border-purple-400',
            bg: 'bg-purple-500/10 hover:bg-purple-500/15',
            badge: 'bg-purple-500 text-white',
            text: 'text-purple-950 dark:text-purple-100',
            titleText: 'text-purple-700 dark:text-purple-300'
        }
    ];

    const quadrants = step.quadrants || [];

    return (
        <div className={cn(
            "w-full h-full flex flex-col items-center justify-start p-3 md:p-6 select-none max-w-5xl mx-auto overflow-y-auto",
            isFullscreen ? "py-6" : "py-3"
        )}>
            {/* ══ BAŞLIK ══ */}
            <motion.div 
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 via-sky-500/20 to-emerald-500/20 border-2 border-purple-400/40 text-purple-700 dark:text-purple-300 text-xs md:text-sm font-black uppercase tracking-wider mb-4 md:mb-6 shadow-sm backdrop-blur-xl"
            >
                <Layers className="w-4 h-4 text-purple-500 animate-pulse" />
                <span>{step.title || '🔲 4 Boyutta Konu Analizi'}</span>
                {step.topicName && <span className="opacity-70">({step.topicName})</span>}
                <Layers className="w-4 h-4 text-purple-500 animate-pulse" />
            </motion.div>

            {/* ══ 2x2 MATRİS IZGARASI ══ */}
            <div className={cn("grid gap-4 md:gap-5 w-full", isTeacher ? "grid-cols-2 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2")}>
                {quadrants.map((quad, idx) => {
                    const style = QUADRANT_STYLES[idx % QUADRANT_STYLES.length];
                    const isFocused = focusedIndex === idx;
                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.08 }}
                            onClick={() => {
                                playSound('pop');
                                setFocusedIndex(focusedIndex === idx ? null : idx);
                            }}
                            className={cn(
                                "rounded-3xl p-5 md:p-6 border-2 transition-all cursor-pointer relative shadow-md backdrop-blur-xl flex flex-col justify-between min-h-[160px] md:min-h-[180px]",
                                style.border,
                                style.bg,
                                isFocused && "ring-4 ring-indigo-400/60 scale-[1.02]"
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className={cn("px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm", style.badge)}>
                                        {quad.label}
                                    </span>
                                    <span className="text-xs text-slate-400 font-bold">
                                        {isFocused ? "Odaktan Çık ✕" : "Büyüt 🔍"}
                                    </span>
                                </div>
                                <p className={cn(
                                    "font-bold leading-relaxed tracking-wide",
                                    style.text,
                                    getContentFontSize()
                                )}>
                                    {quad.content}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 4. KATEGORİ & SINIFLANDIRMA TABLOSU BİLEŞENİ (CategoryTablePlayer)
// ═══════════════════════════════════════════════════════════════════════════

export function CategoryTablePlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal'
}: {
    step: CategoryTableStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
}) {
    const isTeacher = useTeacherMode();
    const categories = step.categories || [];
    const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
    
    // Punto Ayarı
    const [baseFontSize, setBaseFontSize] = useState<number>(
        fontSizeScale === 'huge' || fontSizeScale === 'xl' ? 1.4 :
        fontSizeScale === 'lg' ? 1.25 :
        fontSizeScale === 'xs' ? 0.95 : 1.15
    );

    const increaseFontSize = () => setBaseFontSize(fs => Math.min(Number((fs + 0.15).toFixed(2)), 2.5));
    const decreaseFontSize = () => setBaseFontSize(fs => Math.max(Number((fs - 0.15).toFixed(2)), 0.85));

    const toggleItem = (catIdx: number, itemIdx: number) => {
        playSound('pop');
        const key = `${catIdx}-${itemIdx}`;
        setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Canlı, Doygun ve Yüksek Kontrastlı Kategori Kart Stilleri
    const CATEGORY_COLOR_MAP: Record<string, {
        card: string;
        header: string;
        badge: string;
        item: string;
        itemChecked: string;
        num: string;
        numChecked: string;
    }> = {
        emerald: {
            card: 'bg-emerald-950/70 border-2 border-emerald-400 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)]',
            header: 'from-emerald-500 to-teal-600 text-white',
            badge: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50',
            item: 'bg-slate-900/90 border-emerald-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-emerald-900/60 border-emerald-300 text-emerald-100 shadow-md',
            num: 'bg-emerald-500 text-slate-950 font-black',
            numChecked: 'bg-emerald-400 text-slate-950'
        },
        amber: {
            card: 'bg-amber-950/70 border-2 border-amber-400 text-white shadow-[0_8px_30px_rgba(245,158,11,0.3)]',
            header: 'from-amber-500 to-orange-600 text-white',
            badge: 'bg-amber-500/30 text-amber-200 border-amber-400/50',
            item: 'bg-slate-900/90 border-amber-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-amber-900/60 border-amber-300 text-amber-100 shadow-md',
            num: 'bg-amber-500 text-slate-950 font-black',
            numChecked: 'bg-amber-400 text-slate-950'
        },
        indigo: {
            card: 'bg-indigo-950/70 border-2 border-indigo-400 text-white shadow-[0_8px_30px_rgba(99,102,241,0.3)]',
            header: 'from-indigo-500 to-blue-600 text-white',
            badge: 'bg-indigo-500/30 text-indigo-200 border-indigo-400/50',
            item: 'bg-slate-900/90 border-indigo-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-indigo-900/60 border-indigo-300 text-indigo-100 shadow-md',
            num: 'bg-indigo-500 text-white font-black',
            numChecked: 'bg-indigo-400 text-slate-950'
        },
        rose: {
            card: 'bg-rose-950/70 border-2 border-rose-400 text-white shadow-[0_8px_30px_rgba(244,63,94,0.3)]',
            header: 'from-rose-500 to-red-600 text-white',
            badge: 'bg-rose-500/30 text-rose-200 border-rose-400/50',
            item: 'bg-slate-900/90 border-rose-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-rose-900/60 border-rose-300 text-rose-100 shadow-md',
            num: 'bg-rose-500 text-white font-black',
            numChecked: 'bg-rose-400 text-slate-950'
        },
        cyan: {
            card: 'bg-cyan-950/70 border-2 border-cyan-400 text-white shadow-[0_8px_30px_rgba(6,182,212,0.3)]',
            header: 'from-cyan-500 to-teal-600 text-white',
            badge: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50',
            item: 'bg-slate-900/90 border-cyan-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-cyan-900/60 border-cyan-300 text-cyan-100 shadow-md',
            num: 'bg-cyan-500 text-slate-950 font-black',
            numChecked: 'bg-cyan-400 text-slate-950'
        },
        fuchsia: {
            card: 'bg-fuchsia-950/70 border-2 border-fuchsia-400 text-white shadow-[0_8px_30px_rgba(217,70,239,0.3)]',
            header: 'from-fuchsia-500 to-purple-600 text-white',
            badge: 'bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-400/50',
            item: 'bg-slate-900/90 border-fuchsia-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-fuchsia-900/60 border-fuchsia-300 text-fuchsia-100 shadow-md',
            num: 'bg-fuchsia-500 text-white font-black',
            numChecked: 'bg-fuchsia-400 text-slate-950'
        },
    };

    const defaultColors = ['emerald', 'amber', 'indigo', 'rose', 'cyan', 'fuchsia'];

    const getColumnGridClass = () => {
        const count = categories.length;
        if (count === 1) return 'grid-cols-1 max-w-2xl mx-auto';
        if (count === 2) return isTeacher ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2';
        if (count === 3) return isTeacher ? 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
        return isTeacher ? 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    };

    return (
        <div className="w-full h-full flex flex-col justify-start p-2 md:p-3.5 select-none overflow-y-auto bg-slate-950 text-white">
            
            {/* ══ ÜST KONTROL & BAŞLIK ÇUBUĞU ══ */}
            <div className="flex-shrink-0 w-full flex flex-wrap items-center justify-between gap-2 mb-2.5 p-2 md:p-2.5 rounded-2xl bg-slate-900/95 border border-white/20 backdrop-blur-xl shadow-xl">
                
                {/* BAŞLIK */}
                <div className="flex-1 flex items-center justify-center gap-2.5 text-center">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 text-white flex items-center justify-center font-black shadow-md flex-shrink-0">
                        <Layers className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="text-center">
                        <h2 className="font-black text-white text-sm sm:text-base md:text-lg tracking-tight leading-tight flex items-center justify-center gap-2 text-center">
                            <span>{step.title || step.tableTitle || '📊 Konu Sınıflandırma Tablosu'}</span>
                        </h2>
                        {step.description && (
                            <p className="text-[11px] text-amber-300 font-semibold hidden sm:block leading-none mt-0.5 text-center">
                                {step.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* SAĞ: PUNTO BOYUT KONTROLLERİ */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-950/90 rounded-xl p-0.5 border border-white/15">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={decreaseFontSize} 
                            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                            title="Yazı Boyutunu Küçült"
                        >
                            <Minus className="h-3.5 w-3.5"/>
                        </Button>
                        <span className="text-[10px] font-black text-slate-300 w-8 text-center uppercase">Boyut</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={increaseFontSize} 
                            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                            title="Yazı Boyutunu Büyüt"
                        >
                            <Plus className="h-3.5 w-3.5"/>
                        </Button>
                    </div>

                    <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-xl border border-white/10 hidden md:inline-block">
                        {categories.length} Kategori
                    </span>
                </div>
            </div>

            {/* ══ SÜTUNLU KATEGORİ IZGARASI ══ */}
            <div className={cn("grid gap-3 w-full flex-grow items-stretch", getColumnGridClass())}>
                {categories.map((cat, catIdx) => {
                    const colorKey = cat.color || defaultColors[catIdx % defaultColors.length];
                    const theme = CATEGORY_COLOR_MAP[colorKey] || CATEGORY_COLOR_MAP.emerald;
                    const items = cat.items || [];

                    return (
                        <div
                            key={`cat-${catIdx}`}
                            className={cn(
                                "relative overflow-hidden rounded-3xl p-3.5 sm:p-4 md:p-5 flex flex-col justify-between backdrop-blur-xl transition-all duration-300",
                                theme.card
                            )}
                        >
                            {/* Numara Filigranı */}
                            <div className="absolute top-0 right-0 bg-black/40 text-white/30 font-black text-6xl p-1.5 leading-none pointer-events-none select-none rounded-bl-2xl opacity-25">
                                {catIdx + 1}
                            </div>

                            <div className="z-10 relative flex flex-col h-full space-y-3">
                                {/* Kategori Başlığı ve Rozeti */}
                                <div className="space-y-1.5 border-b border-white/20 pb-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={cn("px-2.5 py-0.5 rounded-full font-bold text-[11px] border tracking-wide", theme.badge)}>
                                            {cat.badge || `Grup ${catIdx + 1}`}
                                        </span>
                                        <span className="text-[11px] font-bold text-white/70">
                                            {items.length} Örnek
                                        </span>
                                    </div>
                                    <h3 
                                        className="font-black text-white uppercase tracking-tight leading-tight drop-shadow-md"
                                        style={{ fontSize: `${baseFontSize * 1.2}rem` }}
                                    >
                                        {cat.name}
                                    </h3>
                                </div>

                                {/* Kategori Altındaki Maddeler / Örnekler */}
                                <div className="flex flex-col gap-2 flex-grow">
                                    {items.map((item, itemIdx) => {
                                        const isChecked = checkedItems[`${catIdx}-${itemIdx}`] || false;
                                        return (
                                            <div
                                                key={`item-${catIdx}-${itemIdx}`}
                                                onClick={() => toggleItem(catIdx, itemIdx)}
                                                className={cn(
                                                    "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-2.5",
                                                    isChecked ? theme.itemChecked : theme.item
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5 shadow-sm",
                                                    isChecked ? theme.numChecked : theme.num
                                                )}>
                                                    {isChecked ? <Check className="w-3.5 h-3.5" /> : itemIdx + 1}
                                                </div>
                                                <p
                                                    className={cn(
                                                        "font-bold leading-snug flex-1 select-text drop-shadow",
                                                        isChecked ? "line-through opacity-85 text-white" : "text-white"
                                                    )}
                                                    style={{ fontSize: `${baseFontSize * 0.95}rem` }}
                                                >
                                                    {item}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📑 12. KONU ÖZETİ BAŞLIKLARI (TopicOutlinePlayer - Neo-Brutalist Pop Kart Tasarımı)
// ═══════════════════════════════════════════════════════════════════════════

export function TopicOutlinePlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal',
    currentStepIndex,
    allSteps = [],
    onJumpToStep,
    onNextStep
}: {
    step: TopicOutlineStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    currentStepIndex?: number;
    allSteps?: LessonStep[];
    onJumpToStep?: (index: number) => void;
    onNextStep?: () => void;
}) {
    const isTeacher = useTeacherMode();

    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'xs' ? 'xs' : 'sm';

    const items = step.items || [];
    const count = items.length;
    const isMultiRow = count > 4;

    const getTitleFontSize = () => {
        if (isMultiRow) {
            switch (cardScale) {
                case 'xs': return "text-sm sm:text-base";
                case 'sm': return "text-base sm:text-lg";
                case 'md': return "text-base sm:text-lg md:text-xl";
                case 'lg': return "text-lg sm:text-xl md:text-2xl";
                case 'xl': return "text-xl sm:text-2xl md:text-3xl";
                default: return "text-base sm:text-lg md:text-xl";
            }
        }
        switch (cardScale) {
            case 'xs': return "text-base sm:text-lg";
            case 'sm': return "text-lg sm:text-xl md:text-2xl";
            case 'md': return "text-xl sm:text-2xl md:text-3xl";
            case 'lg': return "text-2xl sm:text-3xl md:text-4xl";
            case 'xl': return "text-3xl sm:text-4xl md:text-5xl";
            default: return "text-xl sm:text-2xl md:text-3xl";
        }
    };

    const getNumberFontSize = () => {
        if (isMultiRow) {
            switch (cardScale) {
                case 'xs': return "text-xl sm:text-2xl";
                case 'sm': return "text-2xl sm:text-3xl";
                case 'md': return "text-3xl sm:text-4xl";
                case 'lg': return "text-4xl sm:text-5xl";
                case 'xl': return "text-5xl sm:text-6xl";
                default: return "text-3xl sm:text-4xl";
            }
        }
        switch (cardScale) {
            case 'xs': return "text-2xl sm:text-3xl";
            case 'sm': return "text-3xl sm:text-4xl";
            case 'md': return "text-4xl sm:text-5xl";
            case 'lg': return "text-5xl sm:text-6xl";
            case 'xl': return "text-6xl sm:text-7xl";
            default: return "text-4xl sm:text-5xl";
        }
    };

    const getCardWidthClass = () => {
        if (count <= 4) {
            return "flex-1 min-w-0 h-full"; // Sağa ve sola tam yaslanır, ekran genişliğini doldurur
        }
        if (count === 5 || count === 6) {
            return "w-[calc(33.333%-1rem)] sm:w-[calc(33.333%-1.5rem)] lg:w-[calc(33.333%-2rem)] h-[calc(50%-0.6rem)] sm:h-[calc(50%-0.85rem)]";
        }
        if (count === 7 || count === 8) {
            return "w-[calc(25%-1rem)] sm:w-[calc(25%-1.5rem)] lg:w-[calc(25%-2rem)] h-[calc(50%-0.6rem)] sm:h-[calc(50%-0.85rem)]";
        }
        return "w-[calc(20%-0.8rem)] sm:w-[calc(20%-1.2rem)] h-[calc(50%-0.6rem)] sm:h-[calc(50%-0.85rem)]";
    };

    const getContainerMaxClass = () => {
        if (count <= 4) return "w-full max-h-[400px] sm:max-h-[460px] lg:max-h-[520px]";
        return "w-full max-h-[460px] sm:max-h-[520px] lg:max-h-[580px]";
    };

    const getTargetStepIndex = (itemTitle: string, itemIndex: number) => {
        if (!allSteps || allSteps.length === 0) return null;
        const cleanTitle = itemTitle.toLowerCase().replace(/^[0-9]+[.)\-]\s*/, '').trim();

        // 1. Mevcut slayttan sonra bu başlığı içeren bir content slaytı ara
        const startIdx = typeof currentStepIndex === 'number' ? currentStepIndex + 1 : 0;
        for (let i = startIdx; i < allSteps.length; i++) {
            const st = allSteps[i];
            if (st && st.title) {
                const stTitle = st.title.toLowerCase().replace(/^[0-9]+[.)\-]\s*/, '').trim();
                if (stTitle.includes(cleanTitle) || cleanTitle.includes(stTitle)) {
                    return i;
                }
            }
        }

        // 2. Bulunamazsa sıradaki indeksleri kullan
        if (typeof currentStepIndex === 'number' && currentStepIndex + 1 + itemIndex < allSteps.length) {
            return currentStepIndex + 1 + itemIndex;
        }
        return null;
    };

    const handleCardClick = (itemTitle: string, itemIndex: number) => {
        playSound('pop');
        const targetIdx = getTargetStepIndex(itemTitle, itemIndex);
        if (targetIdx !== null && onJumpToStep) {
            onJumpToStep(targetIdx);
        } else if (onNextStep) {
            onNextStep();
        }
    };

    return (
        <div className={cn(
            "w-full h-full flex flex-col items-center justify-between px-4 sm:px-8 lg:px-12 py-3 sm:py-5 select-none overflow-hidden",
            isFullscreen ? "py-5 sm:py-6" : "py-3 sm:py-4"
        )}>
            {/* ══ ÜST: BAŞLIK & ROZET (shrink-0) ══ */}
            <div className="shrink-0 flex flex-col items-center text-center">
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border-2 border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-black uppercase tracking-wider shadow-sm backdrop-blur-md"
                >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    <span>{step.title || '📑 Konu Başlıkları'}</span>
                </motion.div>

                {step.description && (
                    <p className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 dark:text-slate-300 max-w-3xl text-center mt-1.5 line-clamp-1 sm:line-clamp-2">
                        {step.description}
                    </p>
                )}
            </div>

            {/* ══ ORTA: KARTLAR ALANI (flex-1 min-h-0, SAĞA VE SOLA TAM YASLANIR) ══ */}
            <div className="flex-1 w-full min-h-0 flex items-center justify-center my-2 sm:my-3">
                <div className={cn(
                    "w-full h-full flex items-stretch justify-center content-center gap-4 sm:gap-6 lg:gap-8",
                    isMultiRow ? "flex-wrap" : "flex-row",
                    getContainerMaxClass()
                )}>
                    {items.map((item, index) => {
                        const title = typeof item === 'string' ? item : item.title;
                        const itemNum = (typeof item === 'object' && item.number) ? item.number : index + 1;
                        const targetIdx = getTargetStepIndex(title, index);

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: index * 0.05, duration: 0.28, ease: "easeOut" }}
                                onClick={() => handleCardClick(title, index)}
                                title={targetIdx !== null ? `Slayta Git: ${title}` : title}
                                className={cn(
                                    "group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border-[2.5px] sm:border-[3px] border-slate-950 dark:border-white/30 bg-white dark:bg-slate-900 transition-all duration-200 cursor-pointer overflow-hidden",
                                    isMultiRow ? "p-4 sm:p-5 md:p-6" : "p-6 sm:p-8 md:p-9",
                                    isMultiRow 
                                        ? "shadow-[5px_5px_0px_#2563eb] sm:shadow-[6px_6px_0px_#2563eb] dark:shadow-[6px_6px_0px_#3b82f6]" 
                                        : "shadow-[6px_6px_0px_#2563eb] sm:shadow-[8px_8px_0px_#2563eb] lg:shadow-[10px_10px_0px_#2563eb] dark:shadow-[8px_8px_0px_#3b82f6]",
                                    "hover:shadow-[10px_10px_0px_#1d4ed8] sm:hover:shadow-[14px_14px_0px_#1d4ed8] hover:-translate-y-1.5 hover:-translate-x-1",
                                    "active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_#2563eb]",
                                    getCardWidthClass()
                                )}
                            >
                                {/* Sol Üst: Numaralandırma & Sağ Üst: Yönlendirme İkonu */}
                                <div className="flex items-start justify-between w-full shrink-0">
                                    <span className={cn(
                                        "font-extrabold text-blue-600 dark:text-blue-400 leading-none select-none tracking-tight",
                                        getNumberFontSize()
                                    )}>
                                        {itemNum}
                                    </span>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                                        <ArrowRight className={cn(isMultiRow ? "w-4 h-4" : "w-5 h-5")} />
                                    </div>
                                </div>

                                {/* Orta: Başlık Metni - Rahat satır aralığı (leading-normal / 1.4) ile alt satıra düşüşlerde tertemiz okuma */}
                                <div className="my-2 sm:my-3.5 flex-1 flex flex-col justify-start">
                                    <h3 className={cn(
                                        "font-extrabold text-slate-900 dark:text-white leading-[1.35] sm:leading-[1.45] tracking-normal break-words text-left group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors",
                                        getTitleFontSize()
                                    )}>
                                        {title}
                                    </h3>
                                </div>

                                {/* Sağ Alt: Mavi Vurgu Noktası (Referans Görseldeki Birebir Detay) */}
                                <div className="w-full flex justify-end mt-auto pt-2 shrink-0">
                                    <div className={cn(
                                        "rounded-full bg-blue-600 dark:bg-blue-400 border-[2px] border-slate-950 dark:border-white shrink-0 group-hover:scale-125 transition-transform shadow-sm",
                                        isMultiRow ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-4 h-4 sm:w-5 sm:h-5"
                                    )} />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ══ ALT: İPUCU BİLGİSİ (shrink-0) ══ */}
            <div className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold text-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>İpucu: Başlıklara tıklayarak doğrudan o konuya geçebilir veya <strong>Boşluk / İleri (→)</strong> ile sırayla ilerleyebilirsiniz.</span>
            </div>
        </div>
    );
}
