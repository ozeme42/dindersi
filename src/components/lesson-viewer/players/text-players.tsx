'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    HelpCircle, Lightbulb, MessageCircle, CheckCircle2, Sparkles, BookOpen, 
    Pencil, Copy, Check, Plus, Minus, Layers, ListChecks, ArrowRight, ArrowLeft,
    Clock, Target, ChevronRight, ChevronLeft, Grid3X3, Table, CheckSquare, Square, 
    Maximize2, Minimize2, LayoutList, Play, Pause, Flame, Zap, RotateCcw, Compass, FileText, 
    Star, Bookmark, Award, CheckCircle, ChevronDown, Trophy, Volume2, VolumeX, Eye,
    X, MessageSquare, Sun, Moon
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

export const SKETCHNOTE_TEXT_PALETTE = [
    {
        bg: 'bg-[#fefce8]',
        border: 'border-[#eab308]',
        shadow: 'shadow-[3px_3px_0_#eab308]',
        numBg: 'bg-[#ca8a04]',
        badgeBg: 'bg-[#fde047]',
        badgeText: 'text-[#854d0e]',
        badgeBorder: 'border-[#ca8a04]'
    },
    {
        bg: 'bg-[#fdf2f8]',
        border: 'border-[#ec4899]',
        shadow: 'shadow-[3px_3px_0_#ec4899]',
        numBg: 'bg-[#db2777]',
        badgeBg: 'bg-[#fbcfe8]',
        badgeText: 'text-[#9d174d]',
        badgeBorder: 'border-[#db2777]'
    },
    {
        bg: 'bg-[#f0f9ff]',
        border: 'border-[#0284c7]',
        shadow: 'shadow-[3px_3px_0_#0284c7]',
        numBg: 'bg-[#0284c7]',
        badgeBg: 'bg-[#bae6fd]',
        badgeText: 'text-[#075985]',
        badgeBorder: 'border-[#0284c7]'
    },
    {
        bg: 'bg-[#f0fdf4]',
        border: 'border-[#16a34a]',
        shadow: 'shadow-[3px_3px_0_#16a34a]',
        numBg: 'bg-[#16a34a]',
        badgeBg: 'bg-[#bbf7d0]',
        badgeText: 'text-[#166534]',
        badgeBorder: 'border-[#16a34a]'
    },
    {
        bg: 'bg-[#fff7ed]',
        border: 'border-[#ea580c]',
        shadow: 'shadow-[3px_3px_0_#ea580c]',
        numBg: 'bg-[#ea580c]',
        badgeBg: 'bg-[#fed7aa]',
        badgeText: 'text-[#9a3412]',
        badgeBorder: 'border-[#ea580c]'
    },
    {
        bg: 'bg-[#faf5ff]',
        border: 'border-[#9333ea]',
        shadow: 'shadow-[3px_3px_0_#9333ea]',
        numBg: 'bg-[#9333ea]',
        badgeBg: 'bg-[#e9d5ff]',
        badgeText: 'text-[#6b21a8]',
        badgeBorder: 'border-[#9333ea]'
    }
];

export function HookQuestionPlayer({ 
    step, 
    isFullscreen: propIsFullscreen, 
    fontSizeScale = 'normal',
    presentationTheme = 'clean-light',
    presentationFont = 'playfair'
}: { 
    step: HookQuestionStep; 
    isFullscreen?: boolean; 
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';
    const isLightPresTheme = presentationTheme === 'clean-light' || isSketchnote;
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));
    const [showThoughtStarter, setShowThoughtStarter] = useState(false);
    const [hasTriggeredDiscussion, setHasTriggeredDiscussion] = useState(false);
    const [thinkSeconds, setThinkSeconds] = useState<number>(30);
    const [isThinkRunning, setIsThinkRunning] = useState<boolean>(false);

    // ☀️ Açık / 🌙 Koyu Tema (Sunum temasına uyumlu başlangıç + öğretmen geçişi)
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>(isLightPresTheme ? 'light' : 'dark');
    const isLight = themeMode === 'light';

    useEffect(() => {
        setThemeMode(isLightPresTheme ? 'light' : 'dark');
    }, [isLightPresTheme]);

    const questionText = step.question || '';
    const qLen = questionText.length;

    // Canlı Font Büyütme/Küçültme Seviyesi (0: Normal, 1: Büyük, 2: Çok Büyük [Varsayılan], 3: Dev Tahta)
    const calcLevelFromScale = (scale?: string) =>
        scale === 'huge' || scale === 'xl' ? 3 : scale === 'lg' ? 2 : scale === 'xs' || scale === 'sm' ? 1 : 2;
    const [fontLevel, setFontLevel] = useState<number>(calcLevelFromScale(fontSizeScale));

    useEffect(() => {
        setFontLevel(calcLevelFromScale(fontSizeScale));
    }, [fontSizeScale]);

    useEffect(() => {
        setShowThoughtStarter(false);
        setHasTriggeredDiscussion(false);
        setIsThinkRunning(false);
        setThinkSeconds(30);
    }, [step]);

    useEffect(() => {
        if (!isThinkRunning || thinkSeconds <= 0) return;
        const timer = setInterval(() => {
            setThinkSeconds(prev => {
                if (prev <= 1) {
                    setIsThinkRunning(false);
                    playSound('pop');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isThinkRunning, thinkSeconds]);

    // Ekrana tam sığacak ve taşma yapmadan belirgin ve büyük görünecek akıllı tipografi
    const getHookQuestionFontClass = () => {
        if (qLen > 120) {
            // Çok uzun sorular (120+ karakter)
            switch (fontLevel) {
                case 0: return "text-xl sm:text-2xl md:text-3xl lg:text-4xl";
                case 1: return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
                case 2: return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";
                case 3: return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
                default: return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";
            }
        } else if (qLen > 60) {
            // Standart / Orta sorular (60-120 karakter)
            switch (fontLevel) {
                case 0: return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
                case 1: return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
                case 2: return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
                case 3: return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl";
                default: return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
            }
        } else {
            // Kısa ve çarpıcı sorular (< 60 karakter)
            switch (fontLevel) {
                case 0: return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
                case 1: return "text-3xl sm:text-5xl md:text-6xl lg:text-7xl";
                case 2: return "text-4xl sm:text-6xl md:text-7xl lg:text-8xl";
                case 3: return "text-5xl sm:text-7xl md:text-8xl lg:text-9xl";
                default: return "text-4xl sm:text-6xl md:text-7xl lg:text-8xl";
            }
        }
    };

    useEffect(() => {
        if (typeof propIsFullscreen === 'boolean') {
            setIsFullscreen(propIsFullscreen);
        }
    }, [propIsFullscreen]);

    const toggleFullscreen = async () => {
        try {
            if (!isFullscreen) {
                if (containerRef.current?.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                }
                setIsFullscreen(true);
            } else {
                if (document.fullscreenElement && document.exitFullscreen) {
                    await document.exitFullscreen();
                }
                setIsFullscreen(false);
            }
        } catch (err) {
            console.error('Tam ekran hatası:', err);
            setIsFullscreen(!isFullscreen);
        }
    };

    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const handleStartDiscussion = () => {
        playSound('pop');
        setHasTriggeredDiscussion(true);
    };

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative flex flex-col w-full overflow-hidden select-none transition-all duration-300 font-sans",
                isLight 
                    ? "bg-gradient-to-br from-[#FFFDF9] via-[#FFF9EE] to-[#FEF3C7] text-slate-900 border-2 border-amber-200/90 shadow-xl"
                    : "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white border border-white/10 shadow-2xl",
                isFullscreen 
                    ? "fixed inset-0 z-[100] p-3 sm:p-6 w-full h-full" 
                    : "w-full h-full rounded-2xl md:rounded-3xl p-3 sm:p-5"
            )}
        >
            {/* Arkaplan Işık Efektleri */}
            {isLight ? (
                <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
                    <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-amber-300/30 rounded-full blur-[110px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-300/25 rounded-full blur-[110px]" />
                </div>
            ) : (
                <div className="absolute inset-0 pointer-events-none z-0 opacity-25">
                    <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
                </div>
            )}

            <div className="relative z-10 flex flex-col w-full h-full gap-2 sm:gap-3 justify-between min-h-0 overflow-hidden">
                
                {/* ══ 1. HUD / BAŞLIK BARI ══ */}
                <div className={cn(
                    "p-3 sm:p-4 rounded-3xl border shadow-md relative overflow-hidden shrink-0 transition-all",
                    isLight 
                        ? "bg-white/95 backdrop-blur-md border-amber-200/90 text-slate-900" 
                        : "bg-slate-900/70 backdrop-blur-md border-white/10 text-white"
                )}>
                    {/* Alt İlerleme Çizgisi */}
                    <div className={cn("absolute bottom-0 left-0 h-1.5 w-full", isLight ? "bg-slate-200/70" : "bg-slate-800")}>
                        <div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-400 w-full" />
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        {/* Sol: İkon & Başlık */}
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                            <div className={cn(
                                "p-2 sm:p-2.5 rounded-2xl shrink-0 border",
                                isLight 
                                    ? "bg-amber-100 border-amber-300 text-amber-700 shadow-xs" 
                                    : "bg-amber-500/20 border-amber-500/30 text-amber-400"
                            )}>
                                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <div className="min-w-0">
                                <h1 className={cn(
                                    "text-base sm:text-xl md:text-2xl font-black truncate",
                                    isLight ? "text-slate-900" : "text-white"
                                )}>
                                    {step.tag || step.title || 'Derse Başlarken: Merak Edelim & Düşünelim!'}
                                </h1>
                                <p className={cn(
                                    "text-xs md:text-sm hidden sm:block truncate font-bold",
                                    isLight ? "text-amber-800/80" : "text-slate-400"
                                )}>
                                    Düşün, tartış ve fikirlerini sınıfla paylaş!
                                </p>
                            </div>
                        </div>

                        {/* Sağ: Düşünme Sayacı, Tema, Font Büyütücü ve Tam Ekran Kontrolleri */}
                        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0">
                            {/* Sessiz Düşünme Sayacı (30sn) */}
                            <div className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-xl border text-xs font-black transition-all",
                                isThinkRunning
                                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-700"
                                    : thinkSeconds === 0
                                        ? "bg-amber-500/20 border-amber-400 text-amber-700"
                                        : isLight ? "bg-slate-100 border-slate-300 text-slate-800" : "bg-slate-900/90 border-white/15 text-slate-200"
                            )}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        playSound('pop');
                                        if (thinkSeconds === 0) setThinkSeconds(30);
                                        setIsThinkRunning(prev => !prev);
                                    }}
                                    className="flex items-center gap-1.5 px-1.5 py-0.5 cursor-pointer"
                                    title="Öğrencilere sessiz düşünme süresi tanıyın"
                                >
                                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="10" x2="14" y1="2" y2="2" />
                                        <line x1="12" x2="15" y1="14" y2="11" />
                                        <circle cx="12" cy="14" r="8" />
                                    </svg>
                                    <span className="font-mono">{thinkSeconds === 0 ? "Süre Doldu!" : `${thinkSeconds}sn`}</span>
                                </button>
                                {(isThinkRunning || thinkSeconds < 30) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsThinkRunning(false);
                                            setThinkSeconds(30);
                                        }}
                                        className="px-1 opacity-70 hover:opacity-100 cursor-pointer text-[11px]"
                                        title="Süreyi Sıfırla"
                                    >
                                        ↺
                                    </button>
                                )}
                            </div>
                            
                            {/* ☀️ / 🌙 Tema Toggle Butonu */}
                            <div className={cn(
                                "flex items-center p-0.5 rounded-xl border text-xs font-bold",
                                isLight ? "bg-amber-100/70 border-amber-200" : "bg-black/40 border-white/10"
                            )}>
                                <button
                                    type="button"
                                    onClick={() => { playSound('pop'); setThemeMode('light'); }}
                                    className={cn(
                                        "px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                                        isLight ? "bg-white text-amber-900 font-black shadow-xs" : "text-slate-400 hover:text-white"
                                    )}
                                    title="Açık Tema"
                                >
                                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="hidden md:inline">Açık</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { playSound('pop'); setThemeMode('dark'); }}
                                    className={cn(
                                        "px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                                        !isLight ? "bg-slate-800 text-white font-black shadow-xs" : "text-slate-600 hover:text-slate-900"
                                    )}
                                    title="Koyu Tema"
                                >
                                    <Moon className="w-3.5 h-3.5" />
                                    <span className="hidden md:inline">Koyu</span>
                                </button>
                            </div>

                            {/* Canlı Font Ölçekleyici (A- / A+) */}
                            <div className={cn(
                                "flex items-center px-2 py-1 rounded-xl border gap-1 shrink-0 shadow-inner",
                                isLight ? "bg-amber-50 border-amber-200" : "bg-slate-950/80 border-white/10"
                            )}>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setFontLevel(prev => Math.max(0, prev - 1))}
                                    disabled={fontLevel <= 0}
                                    className={cn(
                                        "h-7 w-7 p-0 font-black disabled:opacity-30",
                                        isLight ? "text-slate-700 hover:text-slate-950 hover:bg-amber-100" : "text-slate-300 hover:text-white hover:bg-white/10"
                                    )}
                                    title="Yazıyı Küçült (A-)"
                                >
                                    A-
                                </Button>
                                <span className={cn(
                                    "text-[11px] font-mono font-bold min-w-[20px] text-center select-none",
                                    isLight ? "text-amber-800" : "text-amber-300"
                                )}>
                                    {fontLevel === 0 ? 'N' : fontLevel === 1 ? 'L' : fontLevel === 2 ? 'XL' : 'XXL'}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setFontLevel(prev => Math.min(3, prev + 1))}
                                    disabled={fontLevel >= 3}
                                    className={cn(
                                        "h-7 w-7 p-0 font-black disabled:opacity-30",
                                        isLight ? "text-amber-700 hover:text-amber-950 hover:bg-amber-100" : "text-amber-400 hover:text-white hover:bg-white/10"
                                    )}
                                    title="Yazıyı Büyüt (A+)"
                                >
                                    A+
                                </Button>
                            </div>

                            {/* Tam Ekran Butonu */}
                            <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={toggleFullscreen}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl h-9 px-3 sm:px-4 gap-1.5 text-xs sm:text-sm shadow-md cursor-pointer shrink-0"
                                title={isFullscreen ? 'Tam Ekrandan Çık (Esc)' : 'Akıllı Tahta Tam Ekran'}
                            >
                                {isFullscreen ? (
                                    <>
                                        <Minimize2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Küçült</span>
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Tam Ekran</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ══ 2. ANA SORU KARTI ARENASI ══ */}
                <div className={cn(
                    "flex-1 min-h-0 rounded-3xl border-3 sm:border-4 border-dashed p-3 sm:p-5 md:p-6 lg:p-8 flex flex-col justify-center items-center overflow-y-auto scrollbar-thin gap-3 sm:gap-4 my-auto relative transition-all w-full max-w-7xl mx-auto",
                    isLight 
                        ? "bg-white/95 border-amber-300 shadow-[0_10px_35px_rgba(245,158,11,0.1)] scrollbar-thumb-amber-200" 
                        : "bg-slate-900/50 backdrop-blur-sm border-slate-700 shadow-inner scrollbar-thumb-white/20"
                )}>
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-8 lg:gap-12 w-full my-auto">
                        
                        {/* Sol: Kullanıcının Yüklediği Düşünen Çocuk Görseli */}
                        <div className="shrink-0 flex items-center justify-center my-auto">
                            <div className="relative group">
                                <div className={cn(
                                    "absolute inset-0 rounded-full blur-2xl opacity-40 pointer-events-none transition-all",
                                    isLight ? "bg-amber-300" : "bg-cyan-500/30"
                                )} />
                                <img 
                                    src="/images/thinking-boy.png" 
                                    alt="Düşünen Çocuk" 
                                    className="relative z-10 w-auto h-[26vh] sm:h-[34vh] md:h-[40vh] lg:h-[48vh] max-h-[440px] min-h-[160px] object-contain drop-shadow-xl select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
                                />
                            </div>
                        </div>

                        {/* Sağ: Soru Alanı, Rozet ve İpucu Alanı */}
                        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-3 sm:gap-5 min-w-0 max-w-5xl w-full my-auto">
                            {/* Üst Rozet */}
                            <div className={cn(
                                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm md:text-base font-black tracking-wide border shadow-xs shrink-0",
                                isLight ? "bg-amber-100/90 border-amber-300 text-amber-900" : "bg-amber-500/20 border-amber-400/40 text-amber-300"
                            )}>
                                <span className="text-base sm:text-lg">🤔</span>
                                <span>Merak & Düşünce Sorusu</span>
                            </div>

                            {/* Büyük Soru Başlığı (Büyük, Okunaklı & Taşma Yapmayan) */}
                            <h2 className={cn(
                                "font-black leading-tight sm:leading-snug tracking-tight transition-all select-text break-words w-full",
                                isLight ? "text-slate-900 drop-shadow-xs" : "text-white drop-shadow-lg",
                                getHookQuestionFontClass(),
                                isSketchnote && "font-['Caveat',cursive] text-amber-950 font-bold"
                            )}>
                                "{questionText}"
                            </h2>

                            {/* İpucu Paneli */}
                            {step.thoughtStarter && showThoughtStarter && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={cn(
                                        "p-3.5 sm:p-5 rounded-2xl border-2 text-left shadow-lg max-w-4xl w-full flex items-start gap-3 mt-1",
                                        isLight 
                                            ? "bg-[#FEF9C3] border-[#EAB308] text-[#713F12] shadow-amber-200/50" 
                                            : "bg-amber-500/15 border-amber-400/50 text-amber-100 shadow-amber-950/40"
                                    )}
                                >
                                    <Lightbulb className={cn("w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-0.5", isLight ? "text-amber-600" : "text-amber-400")} />
                                    <div className="flex-1 min-w-0">
                                        <span className={cn(
                                            "text-xs font-black uppercase tracking-wider block mb-0.5",
                                            isLight ? "text-amber-900" : "text-amber-300"
                                        )}>
                                            💡 Sınıfça Düşünelim & Tartışalım:
                                        </span>
                                        <p className={cn(
                                            "text-sm sm:text-base md:text-lg font-bold leading-relaxed",
                                            isLight ? "text-amber-950" : "text-slate-100"
                                        )}>
                                            {step.thoughtStarter}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowThoughtStarter(false)}
                                        className={cn(
                                            "p-1 rounded-lg transition-colors cursor-pointer shrink-0",
                                            isLight ? "text-amber-800 hover:text-amber-950 hover:bg-amber-200/60" : "text-slate-400 hover:text-white hover:bg-white/10"
                                        )}
                                        title="Kapat"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══ 3. ALT AKSİYON BARI (3D Butonlar) ══ */}
                <div className={cn(
                    "shrink-0 rounded-2xl sm:rounded-3xl border p-2 sm:p-3 shadow-xl flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 transition-all",
                    isLight 
                        ? "bg-white/95 backdrop-blur-md border-amber-200/90" 
                        : "bg-slate-900/80 backdrop-blur-md border-white/10"
                )}>
                    {step.thoughtStarter && (
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setShowThoughtStarter(!showThoughtStarter); }}
                            className={cn(
                                "px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm md:text-base transition-all border-b-[5px] active:border-b-0 active:translate-y-1 outline-none cursor-pointer flex items-center gap-2 shadow-md",
                                isLight 
                                    ? (showThoughtStarter ? "bg-amber-400 border-amber-600 text-slate-950 shadow-amber-300/40" : "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950")
                                    : (showThoughtStarter ? "bg-amber-400 border-amber-600 text-slate-950" : "bg-slate-900 border-slate-700 text-amber-300 hover:text-white hover:bg-slate-850")
                            )}
                        >
                            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
                            <span>{showThoughtStarter ? 'İpucunu Kapat' : '💡 Düşünme & Tartışma İpucu'}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleStartDiscussion}
                        className={cn(
                            "px-6 sm:px-7 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm md:text-base transition-all border-b-[5px] active:border-b-0 active:translate-y-1 outline-none cursor-pointer flex items-center gap-2 shadow-md",
                            hasTriggeredDiscussion
                                ? "bg-emerald-500 border-emerald-700 text-white shadow-emerald-200/50"
                                : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-orange-700 text-white shadow-orange-200/50"
                        )}
                    >
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>{hasTriggeredDiscussion ? "✓ Fikirleri Dinliyoruz..." : "🎤 Söz Hakkı & Fikirleri Paylaş"}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📝 1. DEFTERİMİZE YAZALIM (AKILLI TAHTA KAVRAMLAR & NOTLAR PANOSU)
// ═══════════════════════════════════════════════════════════════════════════

function SmartboardRichText({ text }: { text: string }) {
    if (!text) return null;

    // HTML vurguları (<mark>, <strong>, <b>) varsa koyu akıllı tahta paletiyle render et
    if (/<[a-z][\s\S]*>/i.test(text)) {
        return <span dangerouslySetInnerHTML={{ __html: text }} />;
    }

    // Baştaki "📌 [Başlık]:" veya "Başlık:" etiketini parlak amber olarak vurgula
    const labelMatch = text.match(/^((?:📌\s*)?\[[^\]]+\]\s*:|(?:📌\s*)?[^:\n]{2,38}:)\s*([\s\S]*)$/);
    if (labelMatch) {
        return (
            <>
                <span className="text-amber-300 font-black mr-1 text-[1.06em]">{labelMatch[1]}</span>
                <span>{labelMatch[2]}</span>
            </>
        );
    }

    return <>{text}</>;
}

const SMARTBOARD_CARD_COLORS = [
    'bg-indigo-900/45 border-indigo-500/60 text-indigo-50 hover:bg-indigo-900/60',
    'bg-emerald-900/45 border-emerald-500/60 text-emerald-50 hover:bg-emerald-900/60',
    'bg-rose-900/45 border-rose-500/60 text-rose-50 hover:bg-rose-900/60',
    'bg-amber-900/45 border-amber-500/60 text-amber-50 hover:bg-amber-900/60',
    'bg-cyan-900/45 border-cyan-500/60 text-cyan-50 hover:bg-cyan-900/60',
    'bg-fuchsia-900/45 border-fuchsia-500/60 text-fuchsia-50 hover:bg-fuchsia-900/60',
];

const FOCUS_CARD_BORDERS = [
    'bg-indigo-950/95 border-indigo-400',
    'bg-emerald-950/95 border-emerald-400',
    'bg-rose-950/95 border-rose-400',
    'bg-amber-950/95 border-amber-400',
    'bg-cyan-950/95 border-cyan-400',
    'bg-fuchsia-950/95 border-fuchsia-400',
];

const NOTE_BADGE_COLORS = [
    'from-indigo-500 to-blue-600 border-indigo-300/40',
    'from-emerald-500 to-teal-600 border-emerald-300/40',
    'from-rose-500 to-pink-600 border-rose-300/40',
    'from-amber-500 to-orange-600 border-amber-300/40',
    'from-cyan-500 to-sky-600 border-cyan-300/40',
    'from-fuchsia-500 to-purple-600 border-fuchsia-300/40',
];

export function NotebookNotePlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal',
    presentationTheme = 'sketchnote',
    presentationFont = 'sketchnote',
    courseName,
    unitName,
    topicTitle
}: {
    step: NotebookNoteStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
    courseName?: string;
    unitName?: string;
    topicTitle?: string;
}) {
    const conceptDefs = step.conceptDefinitions || [];
    const noteItems = step.notes || [];
    const hasConcepts = conceptDefs.length > 0;
    const hasNotes = noteItems.length > 0;

    // smartboard/yazilacaklar/oyun gibi varsayılan olarak KAVRAMLAR sekmesi açılır
    const [viewMode, setViewMode] = useState<'concepts' | 'notes' | 'split'>(
        hasConcepts ? 'concepts' : 'notes'
    );

    // Kullanıcı manuel punto ayarı yapmadıysa kart sayısına göre ekrana sığacak optimum puntoyu otomatik belirle
    const [manualFontSize, setManualFontSize] = useState<number | null>(null);

    useEffect(() => {
        const cExist = (step.conceptDefinitions && step.conceptDefinitions.length > 0);
        setViewMode(cExist ? 'concepts' : 'notes');
        setManualFontSize(null);
    }, [step]);

    useEffect(() => {
        setManualFontSize(null);
    }, [fontSizeScale]);

    const getAutoFontSize = (mode: 'concepts' | 'notes' | 'split', scale: string) => {
        const mult =
            scale === 'huge' || scale === 'xl' ? 1.25 :
            scale === 'lg' ? 1.12 :
            scale === 'xs' ? 0.85 : 1.0;

        let base = 1.05;
        if (mode === 'concepts') {
            const c = conceptDefs.length;
            base = c <= 3 ? 1.38 : c <= 6 ? 1.22 : c <= 9 ? 1.12 : c <= 12 ? 1.05 : 0.98;
        } else if (mode === 'notes') {
            const n = noteItems.length;
            base = n <= 4 ? 1.3 : n <= 8 ? 1.15 : n <= 12 ? 1.05 : 0.98;
        } else {
            base = 0.98;
        }
        return Number((base * mult).toFixed(2));
    };

    const effectiveFontSize = manualFontSize ?? getAutoFontSize(viewMode, fontSizeScale);

    const increaseFontSize = () => {
        playSound('pop');
        setManualFontSize(prev => Math.min(Number(((prev ?? effectiveFontSize) + 0.1).toFixed(2)), 3.0));
    };
    const decreaseFontSize = () => {
        playSound('pop');
        setManualFontSize(prev => Math.max(Number(((prev ?? effectiveFontSize) - 0.1).toFixed(2)), 0.65));
    };

    // Canlı Yazma Sayacı
    const initialSeconds = (step.suggestedMinutes || 3) * 60;
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerDone, setTimerDone] = useState(false);
    const [checkedItems, setCheckedItems] = useState<{ [index: number]: boolean }>({});

    // Tek Kart Odak / Büyütme Modalı
    const [focusState, setFocusState] = useState<{
        type: 'concept' | 'note';
        index: number;
    } | null>(null);
    const [focusScale, setFocusScale] = useState<number>(1.3);

    useEffect(() => {
        const s = (step.suggestedMinutes || 3) * 60;
        setTimeLeft(s);
        setIsTimerRunning(false);
        setTimerDone(false);
        setCheckedItems({});
        setFocusState(null);
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

    // Odak modalı klavye kısayolları (üst sunum slaytlarını değiştirmez)
    useEffect(() => {
        if (!focusState) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                setFocusState(null);
            } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const maxIdx = focusState.type === 'concept' ? conceptDefs.length - 1 : noteItems.length - 1;
                setFocusState(prev => prev ? { ...prev, index: Math.min(maxIdx, prev.index + 1) } : null);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                setFocusState(prev => prev ? { ...prev, index: Math.max(0, prev.index - 1) } : null);
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                e.stopPropagation();
                setFocusScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))));
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                e.stopPropagation();
                setFocusScale(s => Math.max(0.85, Number((s - 0.15).toFixed(2))));
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [focusState, conceptDefs.length, noteItems.length]);

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

    // Akıllı tahta ekranını boşluksuz dolduran sütun hesaplayıcısı
    const getConceptGridColsClass = (count: number, isSplit: boolean) => {
        if (isSplit) return "grid-cols-1 sm:grid-cols-2";
        if (count <= 1) return "grid-cols-1 max-w-2xl mx-auto";
        if (count === 2) return "grid-cols-1 sm:grid-cols-2";
        if (count === 3) return "grid-cols-1 sm:grid-cols-3";
        if (count === 4) return "grid-cols-2 lg:grid-cols-4";
        if (count <= 6) return "grid-cols-2 md:grid-cols-3";
        if (count <= 8) return "grid-cols-2 md:grid-cols-4";
        if (count <= 10) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
        if (count <= 12) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
        return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
    };

    const getNotesGridColsClass = (count: number, isSplit: boolean) => {
        if (isSplit) return "grid-cols-1";
        if (count <= 1) return "grid-cols-1 max-w-4xl mx-auto";
        if (count <= 6) return "grid-cols-1 md:grid-cols-2";
        return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
    };

    if (!hasConcepts && !hasNotes) {
        return (
            <div className="w-full h-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center smartboard-clean-font">
                <div className="p-8 rounded-3xl bg-slate-900/90 border border-white/15 max-w-lg shadow-2xl">
                    <Pencil className="w-12 h-12 text-amber-400 mx-auto mb-3 animate-bounce" />
                    <h3 className="text-2xl font-black text-white mb-2">{step.title || topicTitle || 'Defterimize Yazalım'}</h3>
                    <p className="text-slate-300 font-medium">Bu adım için henüz kayıtlı kavram veya defter notu bulunmuyor.</p>
                </div>
            </div>
        );
    }

    const renderConceptCards = (isSplit: boolean) => (
        <div className={cn("grid gap-1.5 sm:gap-2 w-full", getConceptGridColsClass(conceptDefs.length, isSplit))}>
            {conceptDefs.map((item, index) => {
                if (item.concept === '[BAŞLIK]') {
                    return (
                        <div key={`c-${index}`} className="col-span-full my-1 flex items-center gap-2">
                            <div className="h-px bg-cyan-500/30 flex-1" />
                            <span
                                className="font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-3 py-0.5 rounded-full"
                                style={{ fontSize: `${Math.max(effectiveFontSize * 0.92, 0.85)}rem` }}
                            >
                                {item.definition}
                            </span>
                            <div className="h-px bg-cyan-500/30 flex-1" />
                        </div>
                    );
                }

                return (
                    <div
                        key={`c-${index}`}
                        onClick={() => { playSound('pop'); setFocusState({ type: 'concept', index }); }}
                        className={cn(
                            "relative overflow-hidden rounded-xl border-[1.5px] transition-all duration-200 shadow-lg flex flex-col justify-between p-2.5 sm:p-3 cursor-pointer group",
                            SMARTBOARD_CARD_COLORS[index % SMARTBOARD_CARD_COLORS.length]
                        )}
                    >
                        {/* Arkaplan Numara Filigranı */}
                        <div className="absolute -top-1 right-1.5 text-white/15 font-black text-3xl sm:text-4xl leading-none pointer-events-none select-none">
                            {index + 1}
                        </div>

                        <div className="flex flex-col h-full z-10 relative">
                            <div className="flex items-start justify-between gap-1 mb-1 border-b border-white/15 pb-1 pr-5">
                                <h3
                                    className="font-black text-white uppercase tracking-tight leading-tight"
                                    style={{ fontSize: `${Number((effectiveFontSize * 1.15).toFixed(2))}rem` }}
                                >
                                    {item.concept}
                                </h3>
                            </div>
                            <p
                                className="font-medium text-white/95 leading-snug select-text flex-grow"
                                style={{ fontSize: `${effectiveFontSize}rem` }}
                            >
                                <SmartboardRichText text={item.definition} />
                            </p>
                        </div>

                        <span className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-75 transition-opacity text-white/80 pointer-events-none">
                            <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                    </div>
                );
            })}
        </div>
    );

    const renderNoteCards = (isSplit: boolean) => (
        <div className={cn("grid gap-1.5 sm:gap-2 w-full", getNotesGridColsClass(noteItems.length, isSplit))}>
            {noteItems.map((note, index) => {
                if (note.startsWith('[BAŞLIK]')) {
                    const headingText = note.replace('[BAŞLIK]', '').trim();
                    return (
                        <div key={`n-${index}`} className="col-span-full my-1 flex items-center gap-2">
                            <div className="h-px bg-amber-500/30 flex-1" />
                            <span
                                className="font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 border border-amber-500/40 px-3 py-0.5 rounded-full"
                                style={{ fontSize: `${Math.max(effectiveFontSize * 0.92, 0.85)}rem` }}
                            >
                                {headingText}
                            </span>
                            <div className="h-px bg-amber-500/30 flex-1" />
                        </div>
                    );
                }

                const isChecked = checkedItems[index] || false;

                return (
                    <div
                        key={`n-${index}`}
                        onClick={() => toggleCheckItem(index)}
                        className={cn(
                            "flex items-start gap-2.5 p-2 sm:p-2.5 rounded-xl border-[1.5px] shadow-lg transition-all cursor-pointer group relative overflow-hidden",
                            SMARTBOARD_CARD_COLORS[index % SMARTBOARD_CARD_COLORS.length],
                            isChecked ? "opacity-50 border-dashed" : ""
                        )}
                    >
                        <div
                            className={cn(
                                "flex-shrink-0 flex items-center justify-center rounded-lg font-black shadow border mt-0.5 transition-colors relative z-10",
                                isChecked
                                    ? "bg-emerald-600 border-emerald-400/50 text-white"
                                    : cn("bg-gradient-to-br text-white", NOTE_BADGE_COLORS[index % NOTE_BADGE_COLORS.length])
                            )}
                            style={{
                                width: `${Math.max(effectiveFontSize * 1.9, 1.75)}rem`,
                                height: `${Math.max(effectiveFontSize * 1.9, 1.75)}rem`,
                                fontSize: `${Math.max(effectiveFontSize * 0.95, 0.9)}rem`
                            }}
                        >
                            {isChecked ? <Check className="w-4 h-4 stroke-[3]" /> : index + 1}
                        </div>

                        <p
                            className={cn(
                                "font-medium leading-snug select-text flex-1 pr-5 relative z-10",
                                isChecked ? "line-through text-white/65" : "text-white/95"
                            )}
                            style={{ fontSize: `${effectiveFontSize}rem` }}
                        >
                            <SmartboardRichText text={note} />
                        </p>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                playSound('pop');
                                setFocusState({ type: 'note', index });
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md text-white/70 hover:text-white hover:bg-white/15 opacity-45 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                            title="Bu Notu Akıllı Tahtada Büyüt"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );

    const compactHeaderLabel = topicTitle || step.noteTitle || step.title || 'Defterimize Yazalım';

    return (
        <div className="w-full h-full bg-slate-950 text-white flex flex-col overflow-hidden relative select-none smartboard-clean-font">
            {/* Ambient Glow */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] bg-blue-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-purple-900/20 rounded-full blur-[120px]" />
            </div>

            {/* ══ ULTRA-KOMPAKT ÜST KONTROL & SEKME BARI (SIFIR BOŞLUK) ══ */}
            <div className="flex-shrink-0 z-20 px-2 sm:px-3 py-1.5 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
                {/* Sol: Kompakt Başlık */}
                <div className="hidden lg:flex items-center gap-2 min-w-0 max-w-md">
                    <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-bold text-cyan-300 truncate leading-tight"
                        style={{ fontSize: `${Math.min(Math.max(effectiveFontSize * 0.85, 0.85), 1.45)}rem` }}
                    >
                        <span>✏️</span>
                        <span className="truncate">{compactHeaderLabel}</span>
                    </span>
                </div>

                {/* Orta: KAVRAMLAR / ÖNEMLİ NOTLAR Sekmeleri (smartboard/yazilacaklar/oyun birebir) */}
                <div className="inline-flex items-center bg-slate-950/90 border border-white/20 p-0.5 sm:p-1 rounded-full shadow-xl gap-1 mx-auto">
                    {hasConcepts && (
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setViewMode('concepts'); }}
                            className={cn(
                                "px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide transition-all cursor-pointer",
                                viewMode === 'concepts'
                                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/60"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            KAVRAMLAR ({conceptDefs.length})
                        </button>
                    )}
                    {hasNotes && (
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setViewMode('notes'); }}
                            className={cn(
                                "px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide transition-all cursor-pointer",
                                viewMode === 'notes'
                                    ? "bg-amber-600 text-white shadow-md shadow-amber-950/60"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            ÖNEMLİ NOTLAR ({noteItems.length})
                        </button>
                    )}
                    {hasConcepts && hasNotes && (
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setViewMode('split'); }}
                            className={cn(
                                "px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide transition-all cursor-pointer hidden xl:inline-flex items-center",
                                viewMode === 'split'
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/60"
                                    : "text-slate-400 hover:text-white"
                            )}
                            title="Kavramları ve Notları Yan Yana Göster"
                        >
                            YAN YANA
                        </button>
                    )}
                </div>

                {/* Sağ: Punto & Canlı Yazma Sayacı */}
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto lg:ml-0">
                    <div className="flex items-center bg-slate-950/90 rounded-xl p-0.5 border border-white/15">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={decreaseFontSize}
                            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                            title="Yazı Boyutunu Küçült"
                        >
                            <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[10px] font-black text-slate-400 px-1.5 uppercase select-none">Boyut</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={increaseFontSize}
                            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                            title="Yazı Boyutunu Büyüt"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-slate-950/90 border border-white/15">
                        <Clock className={cn("w-3.5 h-3.5", isTimerRunning ? "text-emerald-400 animate-spin" : "text-slate-400")} />
                        <span className="font-mono font-black text-xs text-white tabular-nums min-w-[36px] text-center">
                            {formatTime(timeLeft)}
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            onClick={toggleTimer}
                            className={cn(
                                "h-6 px-2 text-[11px] font-black rounded-lg transition-all cursor-pointer",
                                isTimerRunning
                                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            )}
                        >
                            {isTimerRunning ? <Pause className="w-3 h-3 mr-0.5" /> : <Play className="w-3 h-3 mr-0.5" />}
                            {isTimerRunning ? "Durdur" : (timerDone ? "Yeniden" : "Başlat")}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={addExtraMinute}
                            title="+1 Dakika Ekle"
                            className="h-6 px-1.5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                        >
                            +1dk
                        </Button>
                        {timeLeft !== initialSeconds && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={resetTimer}
                                title="Süreyi Sıfırla"
                                className="h-6 px-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                            >
                                <RotateCcw className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ KENARSIZ TAM EKRAN İÇERİK ALANI (SAĞDA SOLDA BOŞLUK YOK) ══ */}
            <div className="flex-1 min-h-0 overflow-y-auto relative z-10 w-full px-1.5 py-1.5 sm:px-2 sm:py-2 pb-16 sm:pb-20">
                {viewMode === 'split' && hasConcepts && hasNotes ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start w-full">
                        <div className="lg:col-span-6">{renderConceptCards(true)}</div>
                        <div className="lg:col-span-6">{renderNoteCards(true)}</div>
                    </div>
                ) : viewMode === 'concepts' && hasConcepts ? (
                    renderConceptCards(false)
                ) : hasNotes ? (
                    renderNoteCards(false)
                ) : null}
            </div>

            {/* ══ TEK KART ODAKLANMA / BÜYÜTME MODALI ══ */}
            {focusState && (() => {
                const isConcept = focusState.type === 'concept';
                const totalItems = isConcept ? conceptDefs.length : noteItems.length;
                const currentIndex = focusState.index;
                const currentConcept = isConcept ? conceptDefs[currentIndex] : null;
                const currentNote = !isConcept ? noteItems[currentIndex] : '';

                return (
                    <div
                        className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col p-3 sm:p-5 text-white select-none overflow-hidden animate-in fade-in zoom-in-95 duration-200 smartboard-clean-font"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setFocusState(null);
                        }}
                    >
                        {/* Modal Üst Çubuk */}
                        <div className="w-full bg-slate-900 border border-white/15 rounded-2xl px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0 flex-wrap shadow-2xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className={cn(
                                    "px-3 py-1 rounded-xl text-xs sm:text-sm font-black text-white",
                                    isConcept ? "bg-cyan-600" : "bg-amber-600"
                                )}>
                                    {isConcept ? 'KAVRAM' : 'ÖNEMLİ NOT'} • {currentIndex + 1} / {totalItems}
                                </span>
                                <span className="font-bold text-slate-200 text-sm sm:text-base truncate hidden sm:inline">
                                    {isConcept ? currentConcept?.concept : (topicTitle || 'Defterimize Yazalım')}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="hidden sm:flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-white/10 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setFocusScale(s => Math.max(0.85, Number((s - 0.15).toFixed(2))))}
                                        className="h-7 px-2 rounded-lg bg-slate-800 hover:bg-cyan-600 text-white font-bold cursor-pointer"
                                    >
                                        A-
                                    </button>
                                    <span className="font-mono font-bold text-amber-300 w-12 text-center">
                                        {Math.round(focusScale * 100)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setFocusScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
                                        className="h-7 px-2 rounded-lg bg-slate-800 hover:bg-cyan-600 text-white font-bold cursor-pointer"
                                    >
                                        A+
                                    </button>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={currentIndex === 0}
                                        onClick={() => setFocusState(prev => prev ? { ...prev, index: Math.max(0, prev.index - 1) } : null)}
                                        className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-cyan-600 disabled:opacity-30 text-white font-bold text-xs sm:text-sm flex items-center gap-1 cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span className="hidden sm:inline">Önceki</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={currentIndex === totalItems - 1}
                                        onClick={() => setFocusState(prev => prev ? { ...prev, index: Math.min(totalItems - 1, prev.index + 1) } : null)}
                                        className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-cyan-600 disabled:opacity-30 text-white font-bold text-xs sm:text-sm flex items-center gap-1 cursor-pointer"
                                    >
                                        <span className="hidden sm:inline">Sonraki</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setFocusState(null)}
                                    className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1 cursor-pointer"
                                >
                                    <X className="w-4 h-4 stroke-[3]" />
                                    <span>Kapat</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Merkez Kart */}
                        <div className="flex-1 w-full flex items-center justify-center p-2 sm:p-6 overflow-y-auto min-h-0">
                            <div
                                className={cn(
                                    "w-full max-w-4xl my-auto p-6 sm:p-10 rounded-3xl border-2 shadow-2xl relative",
                                    FOCUS_CARD_BORDERS[currentIndex % FOCUS_CARD_BORDERS.length]
                                )}
                            >
                                <div className="absolute top-3 right-5 text-white/10 font-black text-7xl leading-none pointer-events-none select-none">
                                    {currentIndex + 1}
                                </div>

                                {isConcept && currentConcept && (
                                    <div className="space-y-4 relative z-10">
                                        <h3
                                            className="font-black text-white uppercase tracking-tight border-b border-white/15 pb-3"
                                            style={{ fontSize: `calc(30px * ${focusScale})` }}
                                        >
                                            {currentConcept.concept}
                                        </h3>
                                        <p
                                            className="font-medium text-slate-100 leading-relaxed select-text"
                                            style={{ fontSize: `calc(22px * ${focusScale})` }}
                                        >
                                            <SmartboardRichText text={currentConcept.definition} />
                                        </p>
                                    </div>
                                )}

                                {!isConcept && (
                                    <div className="flex items-start gap-5 relative z-10">
                                        <div className={cn(
                                            "flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br text-white font-black text-2xl shadow-lg border",
                                            NOTE_BADGE_COLORS[currentIndex % NOTE_BADGE_COLORS.length]
                                        )}>
                                            {currentIndex + 1}
                                        </div>
                                        <p
                                            className="font-medium text-slate-100 leading-relaxed select-text flex-1"
                                            style={{ fontSize: `calc(22px * ${focusScale})` }}
                                        >
                                            <SmartboardRichText text={currentNote} />
                                        </p>
                                    </div>
                                )}

                                {/* Hızlı Geçiş Noktaları */}
                                <div className="flex items-center gap-1.5 flex-wrap pt-6 mt-6 border-t border-white/10">
                                    {Array.from({ length: totalItems }).map((_, dotIdx) => (
                                        <button
                                            key={dotIdx}
                                            type="button"
                                            onClick={() => setFocusState(prev => prev ? { ...prev, index: dotIdx } : null)}
                                            className={cn(
                                                "w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer",
                                                dotIdx === currentIndex
                                                    ? (isConcept ? "bg-cyan-500 text-white scale-110" : "bg-amber-500 text-white scale-110")
                                                    : "bg-white/10 hover:bg-white/20 text-slate-300"
                                            )}
                                        >
                                            {dotIdx + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🪜 2. ADIM ADIM YOL HARİTASI & SÜREÇ BİLEŞENİ (ProcessFlowPlayer)
// ═══════════════════════════════════════════════════════════════════════════

export function ProcessFlowPlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal',
    presentationTheme,
    presentationFont
}: {
    step: ProcessFlowStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';
    const isLightTheme = presentationTheme === 'clean-light';
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [sequentialLock, setSequentialLock] = useState(false);
    const [highestUnlockedIdx, setHighestUnlockedIdx] = useState(0);

    useEffect(() => {
        setActiveStepIndex(0);
        setSequentialLock(false);
        setHighestUnlockedIdx(0);
    }, [step]);

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
        if (sequentialLock && idx > highestUnlockedIdx + 1) return;
        if (idx > highestUnlockedIdx) setHighestUnlockedIdx(idx);
        setActiveStepIndex(idx);
    };

    const handleNextStep = () => {
        playSound('pop');
        setActiveStepIndex(prev => {
            const next = Math.min((step.steps || []).length - 1, prev + 1);
            setHighestUnlockedIdx(curr => Math.max(curr, next));
            return next;
        });
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
            "w-full h-full flex flex-col items-center justify-start p-3 md:p-6 pb-20 select-none max-w-5xl mx-auto overflow-y-auto",
            isFullscreen ? "py-6 pb-20" : "py-3 pb-20"
        )}>
            {/* ══ BAŞLIK ROZETİ VE SIRALI TAHMİN KONTROLÜ ══ */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-4 md:mb-6">
                {isSketchnote ? (
                    <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#fefce8] border-[2.5px] border-[#1e293b] text-[#1e293b] text-base md:text-lg font-['Caveat',cursive] font-bold shadow-[3px_3px_0_#1e293b]">
                        <Compass className="w-5 h-5 text-amber-600" />
                        <span>🪜 {step.title || 'Adım Adım Yol Haritası & Süreç'}</span>
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: -15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 text-xs md:text-sm font-black uppercase tracking-wider shadow-sm backdrop-blur-xl",
                            isLightTheme
                                ? "bg-blue-50 border-blue-300 text-blue-800"
                                : "bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 border-blue-400/40 text-blue-200"
                        )}
                    >
                        <Compass className={cn("w-4 h-4", isLightTheme ? "text-blue-600" : "text-blue-300")} />
                        <span>{step.title || '🪜 Adım Adım Yol Haritası & Süreç'}</span>
                    </motion.div>
                )}

                {stepsList.length > 1 && (
                    <button
                        type="button"
                        onClick={() => {
                            playSound('pop');
                            setSequentialLock(prev => {
                                const next = !prev;
                                if (next) setHighestUnlockedIdx(activeStepIndex);
                                return next;
                            });
                        }}
                        className={cn(
                            "px-3.5 py-1.5 rounded-full text-xs font-black border transition-all cursor-pointer",
                            sequentialLock
                                ? "bg-amber-400 text-slate-950 border-amber-500 shadow"
                                : isSketchnote
                                    ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-400 font-['Patrick_Hand',cursive] text-sm"
                                    : isLightTheme
                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                                        : "bg-white/10 hover:bg-white/20 text-slate-200 border-white/20"
                        )}
                        title="Sonraki adım başlıklarını gizleyip sınıfa tahmin ettirin"
                    >
                        {sequentialLock ? "🔒 Sıralı Tahmin Aktif (Hepsini Aç)" : "👀 Sonraki Adımları Gizle"}
                    </button>
                )}
            </div>

            {/* ══ STEPPER ÜST SEÇİCİ (Yatay Adım Çizgisi) ══ */}
            <div className="w-full flex items-center justify-between gap-2 overflow-x-auto pb-3 mb-4">
                {stepsList.map((item, idx) => {
                    const isCurrent = idx === activeStepIndex;
                    const isPassed = idx < activeStepIndex;
                    const isLockedFuture = sequentialLock && idx > highestUnlockedIdx;
                    const isUnlockableNext = sequentialLock && idx === highestUnlockedIdx + 1;
                    const style = STEP_GRADIENTS[idx % STEP_GRADIENTS.length];
                    return (
                        <div key={idx} className="flex-1 min-w-[120px] flex flex-col items-center">
                            <button
                                onClick={() => handleSelectStep(idx)}
                                className={cn(
                                    "w-full p-2.5 sm:p-3.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 shadow-md",
                                    (isLockedFuture && !isUnlockableNext) ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                                    isSketchnote
                                        ? (isCurrent
                                            ? "bg-[#e0f2fe] border-[2.5px] border-[#0284c7] text-[#0369a1] shadow-[3px_3px_0_#0284c7] scale-105 font-['Patrick_Hand',cursive] font-bold"
                                            : isPassed
                                                ? "bg-[#f0fdf4] border-[2px] border-[#16a34a] text-[#15803d] font-['Patrick_Hand',cursive]"
                                                : "bg-white border-[2px] border-slate-300 text-slate-700 hover:border-slate-800 font-['Patrick_Hand',cursive]")
                                        : (isCurrent
                                            ? `bg-gradient-to-r ${style.active} scale-105 shadow-lg`
                                            : isPassed
                                                ? (isLightTheme
                                                    ? "bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100"
                                                    : "bg-slate-800/80 border-emerald-500/40 text-emerald-300 hover:bg-slate-800")
                                                : isLightTheme
                                                    ? "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                                                    : "bg-slate-900/85 border-white/15 text-slate-300 hover:border-white/40")
                                )}
                            >
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0",
                                    isSketchnote ? "bg-black/10 text-slate-900" : isLightTheme && !isCurrent ? "bg-slate-200 text-slate-800" : "bg-black/25 text-white"
                                )}>
                                    {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                </span>
                                <span className="font-bold text-xs truncate">
                                    {isLockedFuture ? `Adım ${idx + 1} (?)` : item.title}
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
                    className={cn(
                        "relative w-full rounded-3xl p-6 sm:p-8 md:p-10 text-left overflow-hidden min-h-[220px] flex flex-col justify-between",
                        isSketchnote
                            ? "border-[3px] border-[#1e293b] bg-white shadow-[6px_6px_0_#1e293b]"
                            : isLightTheme
                                ? "border-2 border-blue-200 bg-white shadow-xl"
                                : "border-2 border-white/15 bg-slate-900/95 shadow-2xl backdrop-blur-2xl"
                    )}
                >
                    {!isSketchnote && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    )}
                    
                    <div>
                        {isSketchnote ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#fefce8] border-2 border-[#ca8a04] text-[#854d0e] font-['Patrick_Hand',cursive] text-sm font-bold shadow-[2px_2px_0_#ca8a04] mb-3">
                                <span>📍 Adım {activeStepIndex + 1} / {stepsList.length}</span>
                            </div>
                        ) : (
                            <div className={cn(
                                "inline-flex items-center gap-2 px-3.5 py-1 rounded-xl border text-xs font-black uppercase tracking-wider mb-4",
                                isLightTheme
                                    ? "bg-blue-50 border-blue-200 text-blue-700"
                                    : "bg-blue-500/20 border-blue-400/35 text-blue-300"
                            )}>
                                <span>ADIM {activeStepIndex + 1} / {stepsList.length}</span>
                            </div>
                        )}

                        <h3 className={cn(
                            "text-2xl md:text-3xl font-black mb-3",
                            isSketchnote ? "font-['Caveat',cursive] text-[#0f172a] text-3xl md:text-4xl" :
                            isLightTheme ? "text-slate-900" : "text-white"
                        )}>
                            {stepsList[activeStepIndex].title}
                        </h3>

                        <div
                            className={cn(
                                "font-bold leading-relaxed [&_mark]:px-1.5 [&_mark]:py-0.5 [&_mark]:rounded-sm",
                                isSketchnote 
                                    ? "font-['Patrick_Hand',cursive] text-slate-800 text-xl md:text-2xl [&_mark]:bg-[#fef08a] [&_mark]:text-[#854d0e]" 
                                    : isLightTheme
                                        ? cn("text-slate-700 [&_mark]:bg-amber-200 [&_mark]:text-slate-900", getDescFontSize())
                                        : cn("text-slate-100 [&_mark]:bg-amber-400 [&_mark]:text-slate-950 [&_strong]:text-amber-300", getDescFontSize())
                            )}
                            dangerouslySetInnerHTML={{ __html: stepsList[activeStepIndex].description || '' }}
                        />
                    </div>

                    {/* Gezinme Butonları */}
                    {isSketchnote ? (
                        <div className="flex items-center justify-between border-t-2 border-slate-200 pt-4 mt-6">
                            <Button
                                variant="outline"
                                onClick={handlePrevStep}
                                disabled={activeStepIndex === 0}
                                className="rounded-xl font-['Patrick_Hand',cursive] font-bold text-base border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] bg-white hover:bg-slate-100 text-[#1e293b]"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Önceki Adım
                            </Button>
                            <Button
                                onClick={handleNextStep}
                                disabled={activeStepIndex === stepsList.length - 1}
                                className="rounded-xl font-['Patrick_Hand',cursive] font-bold text-base border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1]"
                            >
                                Sıradaki Adım <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    ) : (
                        <div className={cn("flex items-center justify-between border-t pt-4 mt-6", isLightTheme ? "border-slate-200" : "border-white/10")}>
                            <Button
                                variant="outline"
                                onClick={handlePrevStep}
                                disabled={activeStepIndex === 0}
                                className={cn(
                                    "rounded-xl font-bold",
                                    !isLightTheme && "bg-white/10 border-white/20 text-white hover:bg-white/20"
                                )}
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
                    )}
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
    fontSizeScale = 'normal',
    presentationTheme,
    presentationFont
}: {
    step: ConceptMatrixStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';
    const isLightTheme = presentationTheme === 'clean-light';
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [hideContents, setHideContents] = useState<boolean>(false);
    const [revealedQuads, setRevealedQuads] = useState<Record<number, boolean>>({});

    useEffect(() => {
        setFocusedIndex(null);
        setHideContents(false);
        setRevealedQuads({});
    }, [step]);

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

    const SKETCHNOTE_QUADRANTS = [
        {
            border: 'border-[#ca8a04]',
            bg: 'bg-[#fefce8]',
            badge: 'bg-[#fef08a] text-[#854d0e] border border-[#ca8a04]',
            text: 'text-slate-800 font-[\'Patrick_Hand\',cursive] [&_mark]:bg-[#fef08a] text-lg sm:text-xl',
            shadow: 'shadow-[4px_4px_0_#ca8a04]'
        },
        {
            border: 'border-[#0284c7]',
            bg: 'bg-[#e0f2fe]',
            badge: 'bg-[#bae6fd] text-[#0369a1] border border-[#0284c7]',
            text: 'text-slate-800 font-[\'Patrick_Hand\',cursive] [&_mark]:bg-[#fef08a] text-lg sm:text-xl',
            shadow: 'shadow-[4px_4px_0_#0284c7]'
        },
        {
            border: 'border-[#db2777]',
            bg: 'bg-[#fdf2f8]',
            badge: 'bg-[#fbcfe8] text-[#9d174d] border border-[#db2777]',
            text: 'text-slate-800 font-[\'Patrick_Hand\',cursive] [&_mark]:bg-[#fef08a] text-lg sm:text-xl',
            shadow: 'shadow-[4px_4px_0_#db2777]'
        },
        {
            border: 'border-[#16a34a]',
            bg: 'bg-[#f0fdf4]',
            badge: 'bg-[#bbf7d0] text-[#15803d] border border-[#16a34a]',
            text: 'text-slate-800 font-[\'Patrick_Hand\',cursive] [&_mark]:bg-[#fef08a] text-lg sm:text-xl',
            shadow: 'shadow-[4px_4px_0_#16a34a]'
        }
    ];

    const QUADRANT_STYLES = isLightTheme ? [
        { border: 'border-sky-300 hover:border-sky-500', bg: 'bg-sky-50 hover:bg-sky-100/80', badge: 'bg-sky-600 text-white', text: 'text-sky-950 [&_strong]:text-sky-800', shadow: 'shadow-md' },
        { border: 'border-emerald-300 hover:border-emerald-500', bg: 'bg-emerald-50 hover:bg-emerald-100/80', badge: 'bg-emerald-600 text-white', text: 'text-emerald-950 [&_strong]:text-emerald-800', shadow: 'shadow-md' },
        { border: 'border-amber-300 hover:border-amber-500', bg: 'bg-amber-50 hover:bg-amber-100/80', badge: 'bg-amber-500 text-slate-950', text: 'text-amber-950 [&_strong]:text-amber-900', shadow: 'shadow-md' },
        { border: 'border-purple-300 hover:border-purple-500', bg: 'bg-purple-50 hover:bg-purple-100/80', badge: 'bg-purple-600 text-white', text: 'text-purple-950 [&_strong]:text-purple-800', shadow: 'shadow-md' },
    ] : [
        { border: 'border-sky-400/55 hover:border-sky-400', bg: 'bg-sky-950/60 hover:bg-sky-900/70', badge: 'bg-sky-500 text-white', text: 'text-sky-50 [&_strong]:text-amber-300', shadow: 'shadow-lg' },
        { border: 'border-emerald-400/55 hover:border-emerald-400', bg: 'bg-emerald-950/60 hover:bg-emerald-900/70', badge: 'bg-emerald-500 text-white', text: 'text-emerald-50 [&_strong]:text-amber-300', shadow: 'shadow-lg' },
        { border: 'border-amber-400/55 hover:border-amber-400', bg: 'bg-amber-950/55 hover:bg-amber-900/65', badge: 'bg-amber-400 text-slate-950', text: 'text-amber-50 [&_strong]:text-amber-300', shadow: 'shadow-lg' },
        { border: 'border-purple-400/55 hover:border-purple-400', bg: 'bg-purple-950/60 hover:bg-purple-900/70', badge: 'bg-purple-500 text-white', text: 'text-purple-50 [&_strong]:text-amber-300', shadow: 'shadow-lg' },
    ];

    const quadrants = step.quadrants || [];

    useEffect(() => {
        if (focusedIndex === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setFocusedIndex(null);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                if (quadrants.length < 2) return;
                e.preventDefault();
                e.stopPropagation();
                setFocusedIndex(prev => prev === null ? 0 : e.key === 'ArrowRight' ? (prev + 1) % quadrants.length : (prev - 1 + quadrants.length) % quadrants.length);
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [focusedIndex, quadrants.length]);

    const focusedQuad = focusedIndex !== null ? quadrants[focusedIndex] : null;
    const focusedStyle = focusedIndex !== null
        ? (isSketchnote ? SKETCHNOTE_QUADRANTS[focusedIndex % SKETCHNOTE_QUADRANTS.length] : QUADRANT_STYLES[focusedIndex % QUADRANT_STYLES.length])
        : null;

    return (
        <div className={cn(
            "w-full h-full flex flex-col items-center justify-start p-3 md:p-6 pb-20 select-none max-w-5xl mx-auto overflow-y-auto",
            isFullscreen ? "py-6 pb-20" : "py-3 pb-20"
        )}>
            {/* ══ GERÇEK ODAK BÜYÜTME MODALI ══ */}
            {focusedQuad && focusedStyle && focusedIndex !== null && (
                <div
                    className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 sm:p-6"
                    onClick={() => setFocusedIndex(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "relative w-full max-w-4xl rounded-[2rem] p-6 sm:p-10 md:p-12 shadow-2xl flex flex-col gap-5",
                            isSketchnote
                                ? cn("border-[3px] border-[#1e293b] shadow-[8px_8px_0_#1e293b]", focusedStyle.bg)
                                : isLightTheme
                                    ? "bg-white border-2 border-indigo-200 text-slate-900"
                                    : "bg-slate-900/95 border-2 border-white/25 text-white"
                        )}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className={cn(
                                "px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider shadow-sm",
                                focusedStyle.badge
                            )}>
                                {focusedQuad.label}
                            </span>
                            <button
                                type="button"
                                onClick={() => setFocusedIndex(null)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black border cursor-pointer transition-all",
                                    (isSketchnote || isLightTheme)
                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                                        : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                                )}
                            >
                                Kapat (ESC)
                            </button>
                        </div>

                        {hideContents && !revealedQuads[focusedIndex] ? (
                            <button
                                type="button"
                                onClick={() => setRevealedQuads(prev => ({ ...prev, [focusedIndex]: true }))}
                                className="py-10 px-6 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-500/15 hover:bg-amber-500/25 font-black text-xl sm:text-2xl text-amber-400 cursor-pointer"
                            >
                                Sınıfça Tahmin Edin • İçeriği Açmak İçin Dokunun
                            </button>
                        ) : (
                            <div
                                className={cn(
                                    "text-2xl sm:text-3xl md:text-4xl font-bold leading-relaxed max-h-[55vh] overflow-y-auto [&_mark]:bg-amber-300 [&_mark]:text-slate-950 [&_mark]:px-1.5 [&_mark]:rounded",
                                    isSketchnote ? "font-['Patrick_Hand',cursive] text-slate-900" : isLightTheme ? "text-slate-900" : "text-slate-100"
                                )}
                                dangerouslySetInnerHTML={{ __html: focusedQuad.content || '' }}
                            />
                        )}

                        {quadrants.length > 1 && (
                            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setFocusedIndex((focusedIndex - 1 + quadrants.length) % quadrants.length)}
                                    className="px-4 py-2 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 border border-white/15 cursor-pointer"
                                >
                                    ← Önceki Boyut
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFocusedIndex((focusedIndex + 1) % quadrants.length)}
                                    className="px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                                >
                                    Sonraki Boyut →
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {/* ══ BAŞLIK VE TAHMİN KONTROLÜ ══ */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-4 md:mb-6">
                {isSketchnote ? (
                    <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#fefce8] border-[2.5px] border-[#1e293b] text-[#1e293b] text-base md:text-lg font-['Caveat',cursive] font-bold shadow-[3px_3px_0_#1e293b]">
                        <Layers className="w-5 h-5 text-amber-600" />
                        <span>🔲 {step.title || '4 Boyutta Konu Analizi'}</span>
                        {step.topicName && <span className="opacity-80">({step.topicName})</span>}
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: -15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 text-xs md:text-sm font-black uppercase tracking-wider shadow-sm backdrop-blur-xl",
                            isLightTheme
                                ? "bg-purple-50 border-purple-300 text-purple-800"
                                : "bg-gradient-to-r from-purple-500/20 via-sky-500/20 to-emerald-500/20 border-purple-400/40 text-purple-200"
                        )}
                    >
                        <Layers className={cn("w-4 h-4", isLightTheme ? "text-purple-600" : "text-purple-300")} />
                        <span>{step.title || '🔲 4 Boyutta Konu Analizi'}</span>
                        {step.topicName && <span className="opacity-75">({step.topicName})</span>}
                    </motion.div>
                )}

                {quadrants.length > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                            playSound('pop');
                            setHideContents(prev => !prev);
                            setRevealedQuads({});
                        }}
                        className={cn(
                            "px-3.5 py-1.5 rounded-full text-xs font-black border transition-all cursor-pointer",
                            hideContents
                                ? "bg-amber-400 text-slate-950 border-amber-500 shadow"
                                : isSketchnote
                                    ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-400 font-['Patrick_Hand',cursive] text-sm"
                                    : isLightTheme
                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                                        : "bg-white/10 hover:bg-white/20 text-slate-200 border-white/20"
                        )}
                    >
                        {hideContents ? "Tüm İçerikleri Aç" : "İçerikleri Gizle (Tahmin)"}
                    </button>
                )}
            </div>

            {/* ══ 2x2 MATRİS IZGARASI ══ */}
            <div className={cn("grid gap-4 md:gap-5 w-full", isTeacher ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 md:grid-cols-2")}>
                {quadrants.map((quad, idx) => {
                    const style = isSketchnote ? SKETCHNOTE_QUADRANTS[idx % SKETCHNOTE_QUADRANTS.length] : QUADRANT_STYLES[idx % QUADRANT_STYLES.length];
                    const isHidden = hideContents && !revealedQuads[idx];
                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.08 }}
                            onClick={() => {
                                playSound('pop');
                                if (isHidden) {
                                    setRevealedQuads(prev => ({ ...prev, [idx]: true }));
                                } else {
                                    setFocusedIndex(idx);
                                }
                            }}
                            className={cn(
                                "rounded-3xl p-5 md:p-6 transition-all cursor-pointer relative flex flex-col justify-between min-h-[160px] md:min-h-[180px]",
                                isSketchnote ? "border-[2.5px]" : "border-2 backdrop-blur-xl",
                                style.border,
                                style.bg,
                                style.shadow,
                                "hover:scale-[1.01]"
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3 gap-2">
                                    <span className={cn(
                                        "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm",
                                        isSketchnote ? "font-['Patrick_Hand',cursive] font-bold text-sm rounded-full" : "",
                                        style.badge
                                    )}>
                                        {quad.label}
                                    </span>
                                    <span className={cn(
                                        "text-xs font-bold shrink-0",
                                        isSketchnote ? "text-slate-600 font-['Patrick_Hand',cursive]" : isLightTheme ? "text-slate-600" : "text-slate-300"
                                    )}>
                                        {isHidden ? "Açmak İçin Dokun 👁️" : "Büyüt 🔍"}
                                    </span>
                                </div>

                                {isHidden ? (
                                    <div className={cn(
                                        "py-6 px-4 rounded-2xl border-2 border-dashed text-center font-bold text-sm sm:text-base",
                                        (isSketchnote || isLightTheme)
                                            ? "border-amber-400 bg-white/80 text-amber-900"
                                            : "border-amber-400/50 bg-black/30 text-amber-200"
                                    )}>
                                        Tahmin Et • Görmek İçin Dokun
                                    </div>
                                ) : (
                                    <div
                                        className={cn(
                                            "font-bold leading-relaxed tracking-wide [&_mark]:bg-amber-300 [&_mark]:text-slate-950 [&_mark]:px-1 [&_mark]:rounded",
                                            style.text,
                                            !isSketchnote && getContentFontSize()
                                        )}
                                        dangerouslySetInnerHTML={{ __html: quad.content || '' }}
                                    />
                                )}
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
    fontSizeScale = 'normal',
    presentationTheme,
    presentationFont
}: {
    step: CategoryTableStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';
    const isLightTheme = presentationTheme === 'clean-light';
    const categories = step.categories || [];
    const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
    const [hideExamples, setHideExamples] = useState<boolean>(false);
    const [revealedItems, setRevealedItems] = useState<{ [key: string]: boolean }>({});
    
    const calcScaleSize = (scale?: string) =>
        scale === 'huge' || scale === 'xl' ? 1.4 :
        scale === 'lg' ? 1.25 :
        scale === 'xs' ? 0.95 : 1.15;

    // Punto Ayarı
    const [baseFontSize, setBaseFontSize] = useState<number>(calcScaleSize(fontSizeScale));

    useEffect(() => {
        setBaseFontSize(calcScaleSize(fontSizeScale));
    }, [fontSizeScale]);

    useEffect(() => {
        setCheckedItems({});
        setHideExamples(false);
        setRevealedItems({});
    }, [step]);

    const increaseFontSize = () => setBaseFontSize(fs => Math.min(Number((fs + 0.15).toFixed(2)), 2.5));
    const decreaseFontSize = () => setBaseFontSize(fs => Math.max(Number((fs - 0.15).toFixed(2)), 0.85));

    const toggleItem = (catIdx: number, itemIdx: number) => {
        playSound('pop');
        const key = `${catIdx}-${itemIdx}`;
        if (hideExamples && !revealedItems[key]) {
            setRevealedItems(prev => ({ ...prev, [key]: true }));
            return;
        }
        setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const SKETCHNOTE_CATEGORY_MAP: Record<string, {
        card: string;
        badge: string;
        item: string;
        itemChecked: string;
        num: string;
        numChecked: string;
    }> = {
        emerald: {
            card: 'bg-[#f0fdf4] border-[2.5px] border-[#16a34a] shadow-[4px_4px_0_#16a34a] text-slate-900',
            badge: 'bg-[#dcfce7] text-[#15803d] border border-[#16a34a]',
            item: 'bg-white border-2 border-[#16a34a] hover:bg-[#dcfce7]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#bbf7d0]/40 border-2 border-[#15803d] text-slate-500 line-through',
            num: 'bg-[#16a34a] text-white font-bold',
            numChecked: 'bg-[#15803d] text-white'
        },
        amber: {
            card: 'bg-[#fefce8] border-[2.5px] border-[#ca8a04] shadow-[4px_4px_0_#ca8a04] text-slate-900',
            badge: 'bg-[#fef08a] text-[#854d0e] border border-[#ca8a04]',
            item: 'bg-white border-2 border-[#ca8a04] hover:bg-[#fef08a]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#fef08a]/40 border-2 border-[#854d0e] text-slate-500 line-through',
            num: 'bg-[#ca8a04] text-white font-bold',
            numChecked: 'bg-[#854d0e] text-white'
        },
        indigo: {
            card: 'bg-[#eff6ff] border-[2.5px] border-[#2563eb] shadow-[4px_4px_0_#2563eb] text-slate-900',
            badge: 'bg-[#dbeafe] text-[#1d4ed8] border border-[#2563eb]',
            item: 'bg-white border-2 border-[#2563eb] hover:bg-[#dbeafe]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#bfdbfe]/40 border-2 border-[#1d4ed8] text-slate-500 line-through',
            num: 'bg-[#2563eb] text-white font-bold',
            numChecked: 'bg-[#1d4ed8] text-white'
        },
        rose: {
            card: 'bg-[#fff1f2] border-[2.5px] border-[#e11d48] shadow-[4px_4px_0_#e11d48] text-slate-900',
            badge: 'bg-[#ffe4e6] text-[#be123c] border border-[#e11d48]',
            item: 'bg-white border-2 border-[#e11d48] hover:bg-[#ffe4e6]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#fecdd3]/40 border-2 border-[#be123c] text-slate-500 line-through',
            num: 'bg-[#e11d48] text-white font-bold',
            numChecked: 'bg-[#be123c] text-white'
        },
        cyan: {
            card: 'bg-[#ecfeff] border-[2.5px] border-[#0891b2] shadow-[4px_4px_0_#0891b2] text-slate-900',
            badge: 'bg-[#cffafe] text-[#0e7490] border border-[#0891b2]',
            item: 'bg-white border-2 border-[#0891b2] hover:bg-[#cffafe]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#a5f3fc]/40 border-2 border-[#0e7490] text-slate-500 line-through',
            num: 'bg-[#0891b2] text-white font-bold',
            numChecked: 'bg-[#0e7490] text-white'
        },
        fuchsia: {
            card: 'bg-[#fdf4ff] border-[2.5px] border-[#c026d3] shadow-[4px_4px_0_#c026d3] text-slate-900',
            badge: 'bg-[#fae8ff] text-[#a21caf] border border-[#c026d3]',
            item: 'bg-white border-2 border-[#c026d3] hover:bg-[#fae8ff]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#f5d0fe]/40 border-2 border-[#a21caf] text-slate-500 line-through',
            num: 'bg-[#c026d3] text-white font-bold',
            numChecked: 'bg-[#a21caf] text-white'
        },
    };

    const LIGHT_CATEGORY_MAP: Record<string, {
        card: string;
        badge: string;
        item: string;
        itemChecked: string;
        num: string;
        numChecked: string;
    }> = {
        emerald: { card: 'bg-emerald-50/90 border-2 border-emerald-400 text-slate-900 shadow-md', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', item: 'bg-white border-emerald-200 hover:bg-emerald-50 text-slate-900', itemChecked: 'bg-emerald-100 border-emerald-500 text-emerald-950', num: 'bg-emerald-600 text-white font-black', numChecked: 'bg-emerald-700 text-white' },
        amber: { card: 'bg-amber-50/90 border-2 border-amber-400 text-slate-900 shadow-md', badge: 'bg-amber-100 text-amber-900 border-amber-300', item: 'bg-white border-amber-200 hover:bg-amber-50 text-slate-900', itemChecked: 'bg-amber-100 border-amber-500 text-amber-950', num: 'bg-amber-500 text-slate-950 font-black', numChecked: 'bg-amber-600 text-white' },
        indigo: { card: 'bg-indigo-50/90 border-2 border-indigo-400 text-slate-900 shadow-md', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', item: 'bg-white border-indigo-200 hover:bg-indigo-50 text-slate-900', itemChecked: 'bg-indigo-100 border-indigo-500 text-indigo-950', num: 'bg-indigo-600 text-white font-black', numChecked: 'bg-indigo-700 text-white' },
        rose: { card: 'bg-rose-50/90 border-2 border-rose-400 text-slate-900 shadow-md', badge: 'bg-rose-100 text-rose-800 border-rose-300', item: 'bg-white border-rose-200 hover:bg-rose-50 text-slate-900', itemChecked: 'bg-rose-100 border-rose-500 text-rose-950', num: 'bg-rose-600 text-white font-black', numChecked: 'bg-rose-700 text-white' },
        cyan: { card: 'bg-cyan-50/90 border-2 border-cyan-400 text-slate-900 shadow-md', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300', item: 'bg-white border-cyan-200 hover:bg-cyan-50 text-slate-900', itemChecked: 'bg-cyan-100 border-cyan-500 text-cyan-950', num: 'bg-cyan-600 text-white font-black', numChecked: 'bg-cyan-700 text-white' },
        fuchsia: { card: 'bg-fuchsia-50/90 border-2 border-fuchsia-400 text-slate-900 shadow-md', badge: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300', item: 'bg-white border-fuchsia-200 hover:bg-fuchsia-50 text-slate-900', itemChecked: 'bg-fuchsia-100 border-fuchsia-500 text-fuchsia-950', num: 'bg-fuchsia-600 text-white font-black', numChecked: 'bg-fuchsia-700 text-white' },
    };

    // Canlı, Doygun ve Yüksek Kontrastlı Koyu Kategori Kart Stilleri
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
        if (count === 2) return isTeacher ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 md:grid-cols-2';
        if (count === 3) return isTeacher ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
        return isTeacher ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    };

    return (
        <div className={cn(
            "w-full h-full flex flex-col justify-start p-2 md:p-3.5 pb-24 select-none overflow-y-auto",
            isSketchnote ? "bg-transparent text-[#1e293b]" :
            isLightTheme ? "bg-transparent text-slate-900" :
            "bg-slate-950/90 text-white rounded-3xl"
        )}>
            
            {/* ══ ÜST KONTROL & BAŞLIK ÇUBUĞU ══ */}
            <div className={cn(
                "flex-shrink-0 w-full flex flex-wrap items-center justify-between gap-2 mb-2.5 p-2 md:p-2.5 rounded-2xl shadow-xl",
                isSketchnote 
                    ? "bg-white border-[2.5px] border-[#1e293b] shadow-[3px_3px_0_#1e293b] text-[#1e293b]" 
                    : isLightTheme
                        ? "bg-white border-2 border-indigo-200 text-slate-900 shadow-md"
                        : "bg-slate-900/95 border border-white/20 backdrop-blur-xl text-white"
            )}>
                
                {/* BAŞLIK */}
                <div className="flex-1 flex items-center justify-center sm:justify-start gap-2.5 text-center sm:text-left">
                    <div className={cn(
                        "w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center font-black shadow-md flex-shrink-0",
                        isSketchnote ? "bg-[#fefce8] border-2 border-[#ca8a04] text-[#854d0e]" : "bg-gradient-to-br from-indigo-500 to-cyan-600 text-white"
                    )}>
                        <Layers className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    {isSketchnote ? (
                        <div>
                            <h2 className="font-['Caveat',cursive] text-2xl md:text-3xl font-bold bg-[#e0f2fe] text-[#0f172a] border-[2px] border-[#0284c7] px-3.5 py-0.5 rounded-xl shadow-[2px_2px_0_#0284c7] leading-tight inline-flex items-center gap-2">
                                <span>{step.title || step.tableTitle || '📊 Konu Sınıflandırma Tablosu'}</span>
                            </h2>
                            {step.description && (
                                <p className="font-['Patrick_Hand',cursive] text-xs text-[#854d0e] font-bold hidden sm:block leading-none mt-1">
                                    {step.description}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h2 className={cn(
                                "font-black text-sm sm:text-base md:text-lg tracking-tight leading-tight flex items-center gap-2",
                                isLightTheme ? "text-slate-900" : "text-white"
                            )}>
                                <span>{step.title || step.tableTitle || '📊 Konu Sınıflandırma Tablosu'}</span>
                            </h2>
                            {step.description && (
                                <p className={cn(
                                    "text-[11px] font-semibold hidden sm:block leading-none mt-0.5",
                                    isLightTheme ? "text-indigo-700" : "text-amber-300"
                                )}>
                                    {step.description}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* SAĞ: TAHMİN MODU VE PUNTO KONTROLLERİ */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            playSound('pop');
                            setHideExamples(prev => !prev);
                            setRevealedItems({});
                        }}
                        className={cn(
                            "px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer",
                            hideExamples
                                ? "bg-amber-400 text-slate-950 border-amber-500 shadow"
                                : isSketchnote
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-400 font-['Patrick_Hand',cursive] text-sm"
                                    : isLightTheme
                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                                        : "bg-white/10 hover:bg-white/20 text-slate-200 border-white/20"
                        )}
                    >
                        {hideExamples ? "Tüm Örnekleri Aç" : "Örnekleri Gizle (Tahmin)"}
                    </button>

                    <div className={cn(
                        "flex items-center rounded-xl p-0.5 border",
                        (isSketchnote || isLightTheme) ? "bg-slate-100 border-slate-300" : "bg-slate-950/90 border-white/15"
                    )}>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={decreaseFontSize} 
                            className={cn("h-7 w-7 rounded-lg", (isSketchnote || isLightTheme) ? "text-slate-700 hover:text-black hover:bg-slate-200" : "text-slate-300 hover:text-white hover:bg-white/10")}
                            title="Yazı Boyutunu Küçült"
                        >
                            <Minus className="h-3.5 w-3.5"/>
                        </Button>
                        <span className={cn("text-[10px] font-black w-8 text-center uppercase", (isSketchnote || isLightTheme) ? "text-slate-700" : "text-slate-300")}>Boyut</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={increaseFontSize} 
                            className={cn("h-7 w-7 rounded-lg", (isSketchnote || isLightTheme) ? "text-slate-700 hover:text-black hover:bg-slate-200" : "text-slate-300 hover:text-white hover:bg-white/10")}
                            title="Yazı Boyutunu Büyüt"
                        >
                            <Plus className="h-3.5 w-3.5"/>
                        </Button>
                    </div>

                    <span className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-xl border hidden md:inline-block",
                        isSketchnote ? "bg-[#fefce8] text-[#854d0e] border-[#ca8a04]" :
                        isLightTheme ? "bg-indigo-50 text-indigo-800 border-indigo-200" :
                        "text-slate-300 bg-slate-900 border-white/15"
                    )}>
                        {categories.length} Kategori
                    </span>
                </div>
            </div>

            {/* ══ SÜTUNLU KATEGORİ IZGARASI ══ */}
            <div className={cn("grid gap-3 w-full flex-grow items-stretch pb-6", getColumnGridClass())}>
                {categories.map((cat, catIdx) => {
                    const colorKey = cat.color || defaultColors[catIdx % defaultColors.length];
                    const theme = isSketchnote 
                        ? (SKETCHNOTE_CATEGORY_MAP[colorKey] || SKETCHNOTE_CATEGORY_MAP.emerald)
                        : isLightTheme
                            ? (LIGHT_CATEGORY_MAP[colorKey] || LIGHT_CATEGORY_MAP.emerald)
                            : (CATEGORY_COLOR_MAP[colorKey] || CATEGORY_COLOR_MAP.emerald);
                    const items = cat.items || [];

                    return (
                        <div
                            key={`cat-${catIdx}`}
                            className={cn(
                                "relative overflow-hidden rounded-3xl p-3.5 sm:p-4 md:p-5 flex flex-col justify-between transition-all duration-300",
                                (isSketchnote || isLightTheme) ? "" : "backdrop-blur-xl",
                                theme.card
                            )}
                        >
                            {/* Numara Filigranı (Sağ alt arka planda, rozetle çakışmaz) */}
                            <div className={cn(
                                "absolute bottom-1 right-3 font-black text-5xl leading-none pointer-events-none select-none z-0",
                                (isSketchnote || isLightTheme) ? "text-black/10 font-['Caveat',cursive]" : "text-white/15"
                            )}>
                                {catIdx + 1}
                            </div>

                            <div className="z-10 relative flex flex-col h-full space-y-3">
                                {/* Kategori Başlığı ve Rozeti */}
                                <div className={cn("space-y-1.5 border-b pb-3", (isSketchnote || isLightTheme) ? "border-black/15" : "border-white/20")}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={cn("px-2.5 py-0.5 rounded-full font-bold text-[11px] border tracking-wide", isSketchnote && "font-['Patrick_Hand',cursive]", theme.badge)}>
                                            {cat.badge || `Grup ${catIdx + 1}`}
                                        </span>
                                        <span className={cn("text-[11px] font-bold", (isSketchnote || isLightTheme) ? "text-slate-600" : "text-white/80", isSketchnote && "font-['Patrick_Hand',cursive]")}>
                                            {items.length} Örnek
                                        </span>
                                    </div>
                                    <h3 
                                        className={cn(
                                            "uppercase tracking-tight leading-tight",
                                            isSketchnote ? "font-['Caveat',cursive] font-bold text-slate-900" :
                                            isLightTheme ? "font-black text-slate-900" :
                                            "font-black text-white drop-shadow-md"
                                        )}
                                        style={{ fontSize: `${baseFontSize * 1.2}rem` }}
                                    >
                                        {cat.name}
                                    </h3>
                                </div>

                                {/* Kategori Altındaki Maddeler / Örnekler */}
                                <div className="flex flex-col gap-2 flex-grow">
                                    {items.map((item, itemIdx) => {
                                        const key = `${catIdx}-${itemIdx}`;
                                        const isChecked = checkedItems[key] || false;
                                        const isHidden = hideExamples && !revealedItems[key];
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
                                                {isHidden ? (
                                                    <span className={cn(
                                                        "flex-1 font-bold text-sm py-0.5 italic",
                                                        (isSketchnote || isLightTheme) ? "text-amber-700" : "text-amber-300"
                                                    )}>
                                                        Tahmin Et • Görmek için dokun...
                                                    </span>
                                                ) : (
                                                    <p
                                                        className={cn(
                                                            "font-bold leading-snug flex-1 select-text [&_mark]:bg-[#fef08a] [&_mark]:text-slate-900 [&_mark]:px-1 [&_mark]:rounded",
                                                            isSketchnote 
                                                                ? (isChecked ? "line-through opacity-75 text-slate-500 font-['Patrick_Hand',cursive]" : "text-slate-800 font-['Patrick_Hand',cursive]")
                                                                : isLightTheme
                                                                    ? (isChecked ? "line-through opacity-70 text-slate-500" : "text-slate-900")
                                                                    : (isChecked ? "line-through opacity-85 text-white drop-shadow" : "text-white drop-shadow")
                                                        )}
                                                        style={{ fontSize: `${baseFontSize * 0.95}rem` }}
                                                        dangerouslySetInnerHTML={{ __html: item }}
                                                    />
                                                )}
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
    onNextStep,
    presentationTheme,
    presentationFont
}: {
    step: TopicOutlineStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    currentStepIndex?: number;
    allSteps?: LessonStep[];
    onJumpToStep?: (index: number) => void;
    onNextStep?: () => void;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';
    const isGame3D = presentationTheme === 'game-3d';
    const isLightTheme = presentationTheme === 'clean-light';

    const GAME_3D_OUTLINE_THEMES = [
        { bg: 'linear-gradient(180deg, #1e40af 0%, #1e3a8a 50%, #0f172a 100%)', border: '#38bdf8', borderDark: '#0369a1', glow: 'rgba(56, 189, 248, 0.45)', badgeBg: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', icon: '🌙' },
        { bg: 'linear-gradient(180deg, #b45309 0%, #78350f 50%, #451a03 100%)', border: '#fbbf24', borderDark: '#92400e', glow: 'rgba(245, 158, 11, 0.5)', badgeBg: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', icon: '📜' },
        { bg: 'linear-gradient(180deg, #047857 0%, #064e3b 50%, #022c22 100%)', border: '#34d399', borderDark: '#065f46', glow: 'rgba(16, 185, 129, 0.45)', badgeBg: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', icon: '🌴' },
        { bg: 'linear-gradient(180deg, #6d28d9 0%, #4c1d95 50%, #2e1065 100%)', border: '#c084fc', borderDark: '#5b21b6', glow: 'rgba(192, 132, 252, 0.45)', badgeBg: 'linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)', icon: '✨' },
        { bg: 'linear-gradient(180deg, #be123c 0%, #881337 50%, #4c0519 100%)', border: '#fb7185', borderDark: '#9f1239', glow: 'rgba(251, 113, 133, 0.45)', badgeBg: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)', icon: '🌅' },
        { bg: 'linear-gradient(180deg, #d97706 0%, #92400e 50%, #1e1b4b 100%)', border: '#fde047', borderDark: '#854d0e', glow: 'rgba(253, 224, 71, 0.5)', badgeBg: 'linear-gradient(135deg, #fde047 0%, #ca8a04 100%)', icon: '🏆' }
    ];

    const SKETCHNOTE_OUTLINE_THEMES = [
        { bg: 'bg-[#fefce8]', border: 'border-[#ca8a04]', num: 'text-[#ca8a04]', shadow: 'shadow-[5px_5px_0_#ca8a04] hover:shadow-[7px_7px_0_#a16207]', dot: 'bg-[#ca8a04]' },
        { bg: 'bg-[#e0f2fe]', border: 'border-[#0284c7]', num: 'text-[#0284c7]', shadow: 'shadow-[5px_5px_0_#0284c7] hover:shadow-[7px_7px_0_#0369a1]', dot: 'bg-[#0284c7]' },
        { bg: 'bg-[#fdf2f8]', border: 'border-[#db2777]', num: 'text-[#db2777]', shadow: 'shadow-[5px_5px_0_#db2777] hover:shadow-[7px_7px_0_#be185d]', dot: 'bg-[#db2777]' },
        { bg: 'bg-[#f0fdf4]', border: 'border-[#16a34a]', num: 'text-[#16a34a]', shadow: 'shadow-[5px_5px_0_#16a34a] hover:shadow-[7px_7px_0_#15803d]', dot: 'bg-[#16a34a]' },
        { bg: 'bg-[#fff7ed]', border: 'border-[#ea580c]', num: 'text-[#ea580c]', shadow: 'shadow-[5px_5px_0_#ea580c] hover:shadow-[7px_7px_0_#c2410c]', dot: 'bg-[#ea580c]' },
        { bg: 'bg-[#faf5ff]', border: 'border-[#9333ea]', num: 'text-[#9333ea]', shadow: 'shadow-[5px_5px_0_#9333ea] hover:shadow-[7px_7px_0_#7e22ce]', dot: 'bg-[#9333ea]' }
    ];

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

    const getGridClass = () => {
        if (count <= 1) return "grid-cols-1 max-w-2xl mx-auto";
        if (count === 2) return "grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto";
        if (count === 3) return "grid-cols-1 sm:grid-cols-3";
        if (count === 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
        if (count <= 6) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    };

    const getTargetStepIndex = (itemTitle: string, itemIndex: number) => {
        if (!allSteps || allSteps.length === 0) return null;
        const cleanTitle = itemTitle.toLowerCase().replace(/^[0-9]+[.)\-]\s*/, '').trim();

        const findBestMatch = (from: number, to: number) => {
            for (let i = from; i < to; i++) {
                const st = allSteps[i];
                if (st && st.type !== 'topicOutline' && st.title) {
                    const stTitle = st.title.toLowerCase().replace(/^[0-9]+[.)\-]\s*/, '').trim();
                    if (stTitle && (stTitle.includes(cleanTitle) || cleanTitle.includes(stTitle))) {
                        return i;
                    }
                }
            }
            return null;
        };

        // 1. Önce mevcut slayttan sonraki adımlarda ara, bulunamazsa önceki bölümlerde ara
        const startIdx = typeof currentStepIndex === 'number' ? currentStepIndex + 1 : 0;
        const forwardMatch = findBestMatch(startIdx, allSteps.length);
        if (forwardMatch !== null) return forwardMatch;

        const backwardMatch = findBestMatch(0, startIdx);
        if (backwardMatch !== null) return backwardMatch;

        // 2. Eşleşme yoksa sıradaki slayt indeksi geçerliyse öner
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
            "w-full h-full flex flex-col items-center justify-start px-4 sm:px-8 lg:px-12 py-3 sm:py-5 pb-24 select-none overflow-y-auto",
            isFullscreen ? "py-5 sm:py-6 pb-24" : "py-3 sm:py-4 pb-24"
        )}>
            {/* ══ ÜST: BAŞLIK & ROZET (shrink-0) ══ */}
            <div className="shrink-0 flex flex-col items-center text-center mb-3 sm:mb-4">
                {isSketchnote ? (
                    <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-[#fefce8] border-[2.5px] border-[#1e293b] text-[#1e293b] font-['Caveat',cursive] text-2xl font-bold shadow-[3px_3px_0_#1e293b]">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <span>{step.title || '📑 Konu Başlıkları'}</span>
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 text-xs sm:text-sm font-black uppercase tracking-wider shadow-sm backdrop-blur-md",
                            isLightTheme
                                ? "bg-blue-50 border-blue-300 text-blue-800"
                                : "bg-blue-500/15 border-blue-400/35 text-blue-200"
                        )}
                    >
                        <Sparkles className={cn("w-3.5 h-3.5", isLightTheme ? "text-blue-600" : "text-blue-300")} />
                        <span>{step.title || '📑 Konu Başlıkları'}</span>
                    </motion.div>
                )}

                {step.description && (
                    <p className={cn(
                        "text-xs sm:text-sm md:text-base font-semibold max-w-3xl text-center mt-1.5 line-clamp-2",
                        isSketchnote ? "font-['Patrick_Hand',cursive] text-slate-700 text-base" :
                        isLightTheme ? "text-slate-600" : "text-slate-300"
                    )}>
                        {step.description}
                    </p>
                )}
            </div>

            {/* ══ ORTA: RESPONSIVE HARİTA IZGARASI ══ */}
            <div className="w-full max-w-6xl mx-auto my-auto py-2">
                <div className={cn("w-full grid gap-4 sm:gap-5 lg:gap-6 items-stretch", getGridClass())}>
                    {items.map((item, index) => {
                        const title = typeof item === 'string' ? item : item.title;
                        const description = typeof item === 'object' ? item.description : '';
                        const itemNum = (typeof item === 'object' && item.number) ? item.number : index + 1;
                        const targetIdx = getTargetStepIndex(title, index);
                        const sketchnoteTheme = SKETCHNOTE_OUTLINE_THEMES[index % SKETCHNOTE_OUTLINE_THEMES.length];
                        const game3dTheme = GAME_3D_OUTLINE_THEMES[index % GAME_3D_OUTLINE_THEMES.length];

                        if (isGame3D) {
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: index * 0.06, duration: 0.3 }}
                                    onClick={() => handleCardClick(title, index)}
                                    title={targetIdx !== null ? `Bölüme Başla: ${title}` : title}
                                    className={cn(
                                        "group relative flex flex-col justify-between rounded-t-[32px] rounded-b-2xl border-4 border-b-[10px] md:border-b-[14px] transition-all duration-200 cursor-pointer overflow-hidden hover:scale-[1.03] active:scale-95 active:border-b-4",
                                        isMultiRow ? "p-4 sm:p-5 min-h-[160px]" : "p-6 sm:p-7 min-h-[210px]"
                                    )}
                                    style={{
                                        background: game3dTheme.bg,
                                        borderColor: game3dTheme.border,
                                        borderBottomColor: game3dTheme.borderDark,
                                        boxShadow: `0 12px 25px rgba(0,0,0,0.7), 0 0 25px ${game3dTheme.glow}, inset 0 2px 4px rgba(255,255,255,0.35)`,
                                    }}
                                >
                                    <div className="flex items-center justify-between w-full shrink-0">
                                        <div
                                            className="px-3 py-1 rounded-full border-2 border-white/40 shadow-md flex items-center gap-1.5 text-xs font-black text-white"
                                            style={{ background: game3dTheme.badgeBg }}
                                        >
                                            <span className="text-base">{game3dTheme.icon}</span>
                                            <span>Bölüm {itemNum}</span>
                                        </div>

                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-amber-950 transition-all shadow">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>

                                    <div className="my-3 flex-1 flex flex-col justify-center gap-1.5">
                                        <h3 className={cn(
                                            "font-black text-white text-left leading-snug tracking-wide filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:text-amber-200 transition-colors",
                                            getTitleFontSize()
                                        )}>
                                            {title}
                                        </h3>
                                        {description && (
                                            <p className="text-xs sm:text-sm font-semibold text-white/80 line-clamp-2 text-left leading-snug">
                                                {description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="w-full flex items-center justify-between mt-auto pt-2 border-t border-white/20">
                                        <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-amber-400" />
                                            <span>{targetIdx !== null ? 'Bölüme Git' : 'Derse Katıl'}</span>
                                        </span>
                                        <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-white shadow-[0_0_8px_#fde047]" />
                                    </div>
                                </motion.div>
                            );
                        }

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: index * 0.05, duration: 0.28, ease: "easeOut" }}
                                onClick={() => handleCardClick(title, index)}
                                title={targetIdx !== null ? `Slayta Git: ${title}` : title}
                                className={cn(
                                    "group relative flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden",
                                    isSketchnote
                                        ? cn(
                                            "rounded-3xl border-[2.5px]",
                                            sketchnoteTheme.bg,
                                            sketchnoteTheme.border,
                                            sketchnoteTheme.shadow,
                                            "hover:-translate-y-1 hover:-translate-x-0.5"
                                        )
                                        : isLightTheme
                                            ? cn(
                                                "rounded-2xl sm:rounded-3xl border-[2.5px] sm:border-[3px] border-slate-900 bg-white",
                                                isMultiRow ? "shadow-[5px_5px_0px_#2563eb]" : "shadow-[8px_8px_0px_#2563eb]",
                                                "hover:shadow-[12px_12px_0px_#1d4ed8] hover:-translate-y-1 hover:-translate-x-0.5"
                                            )
                                            : cn(
                                                "rounded-2xl sm:rounded-3xl border-2 border-white/25 bg-slate-900/95",
                                                isMultiRow ? "shadow-[5px_5px_0px_#3b82f6]" : "shadow-[8px_8px_0px_#3b82f6]",
                                                "hover:shadow-[12px_12px_0px_#60a5fa] hover:-translate-y-1 hover:-translate-x-0.5"
                                            ),
                                    isMultiRow ? "p-4 sm:p-5 md:p-6 min-h-[155px]" : "p-6 sm:p-8 min-h-[195px]"
                                )}
                            >
                                <div className="flex items-start justify-between w-full shrink-0">
                                    <span className={cn(
                                        "leading-none select-none tracking-tight",
                                        isSketchnote 
                                            ? cn("font-['Caveat',cursive] font-bold text-3xl sm:text-4xl", sketchnoteTheme.num) 
                                            : isLightTheme
                                                ? cn("font-extrabold text-blue-600", getNumberFontSize())
                                                : cn("font-extrabold text-blue-400", getNumberFontSize())
                                    )}>
                                        {itemNum}
                                    </span>

                                    <div className={cn(
                                        "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl",
                                        isSketchnote ? "bg-black/10 text-slate-800" :
                                        isLightTheme ? "bg-blue-50 text-blue-600" :
                                        "bg-blue-950/70 text-blue-300"
                                    )}>
                                        <ArrowRight className={cn(isMultiRow ? "w-4 h-4" : "w-5 h-5")} />
                                    </div>
                                </div>

                                <div className="my-2 sm:my-3 flex-1 flex flex-col justify-start gap-1.5">
                                    <h3 className={cn(
                                        "leading-[1.35] sm:leading-[1.45] tracking-normal break-words text-left transition-colors",
                                        isSketchnote 
                                            ? "font-['Caveat',cursive] font-bold text-2xl sm:text-3xl text-slate-900 group-hover:text-blue-700" 
                                            : isLightTheme
                                                ? cn("font-extrabold text-slate-900 group-hover:text-blue-600", getTitleFontSize())
                                                : cn("font-extrabold text-white group-hover:text-blue-300", getTitleFontSize())
                                    )}>
                                        {title}
                                    </h3>
                                    {description && (
                                        <p className={cn(
                                            "text-xs sm:text-sm font-medium line-clamp-2 text-left leading-snug",
                                            isSketchnote ? "font-['Patrick_Hand',cursive] text-slate-600 text-sm sm:text-base" :
                                            isLightTheme ? "text-slate-600" : "text-slate-300"
                                        )}>
                                            {description}
                                        </p>
                                    )}
                                </div>

                                <div className="w-full flex justify-between items-center mt-auto pt-2 shrink-0">
                                    <span className={cn(
                                        "text-[11px] font-bold opacity-75",
                                        isSketchnote ? "font-['Patrick_Hand',cursive] text-slate-700" :
                                        isLightTheme ? "text-blue-700" : "text-blue-300"
                                    )}>
                                        {targetIdx !== null ? 'Bölüme Git →' : ''}
                                    </span>
                                    <div className={cn(
                                        "rounded-full border-[2px] shrink-0 group-hover:scale-125 transition-transform shadow-xs",
                                        isSketchnote ? cn(sketchnoteTheme.dot, "border-black/20") :
                                        isLightTheme ? "bg-blue-600 border-slate-950" :
                                        "bg-blue-400 border-white",
                                        isMultiRow ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-4 h-4 sm:w-5 sm:h-5"
                                    )} />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ══ ALT: İPUCU BİLGİSİ (shrink-0) ══ */}
            <div className={cn(
                "shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border shadow-sm text-[11px] sm:text-xs font-semibold text-center mt-3",
                isSketchnote
                    ? "bg-white/95 border-[#1e293b]/40 text-slate-700"
                    : isLightTheme
                        ? "bg-white/90 border-slate-200 text-slate-600"
                        : "bg-slate-900/90 border-white/15 text-slate-300"
            )}>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>İpucu: Başlıklara tıklayarak doğrudan o konuya geçebilir veya <strong>Boşluk / İleri (→)</strong> ile sırayla ilerleyebilirsiniz.</span>
            </div>
        </div>
    );
}
