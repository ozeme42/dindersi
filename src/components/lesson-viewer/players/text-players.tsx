'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    HelpCircle, Lightbulb, MessageCircle, CheckCircle2, Sparkles, BookOpen, 
    Pencil, Copy, Check, Plus, Minus, Layers, ListChecks, ArrowRight, ArrowLeft,
    Clock, Target, ChevronRight, ChevronLeft, Grid3X3, Table, CheckSquare, Square, 
    Maximize2, Minimize2, LayoutList, Play, Pause, Flame, Zap, RotateCcw, Compass, FileText, 
    Star, Bookmark, Award, CheckCircle, ChevronDown, Trophy, Volume2, VolumeX, Eye,
    X, MessageSquare, Sun, Moon, Pin, ZoomIn
} from 'lucide-react';
import { SKETCHNOTE_PALETTE, HighlightedText } from '@/components/sketchnote-notes-viewer';
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));
    const [showThoughtStarter, setShowThoughtStarter] = useState(false);
    const [hasTriggeredDiscussion, setHasTriggeredDiscussion] = useState(false);

    // ☀️ Açık Tema (Varsayılan) / 🌙 Koyu Tema
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
    const isLight = themeMode === 'light';

    const questionText = step.question || '';
    const qLen = questionText.length;

    // Canlı Font Büyütme/Küçültme Seviyesi (0: Normal, 1: Büyük, 2: Çok Büyük [Varsayılan], 3: Dev Tahta)
    const initialLevel = fontSizeScale === 'huge' ? 3 :
                         fontSizeScale === 'sm' ? 1 : 2;
    const [fontLevel, setFontLevel] = useState<number>(initialLevel);

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
        import('canvas-confetti').then(m => {
            m.default({
                particleCount: 80,
                spread: 80,
                origin: { y: 0.6 }
            });
        }).catch(() => {});
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
                    <div className="absolute bottom-0 left-0 h-1.5 w-full bg-slate-200/60 dark:bg-slate-800">
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

                        {/* Sağ: Tema, Font Büyütücü ve Tam Ekran Kontrolleri */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            
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
// 📝 1. DEFTERİMİZE YAZALIM (SKETCHNOTE / RENKLİ DEFTER PANOSU) BİLEŞENİ
// ═══════════════════════════════════════════════════════════════════════════

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

    // Varsayılan görünüm modu: hem kavram hem not varsa yan yana, tek biri varsa tam ekran
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

    // Ana sayfadaki SketchnoteNotesViewer ile uyumlu dinamik punto boyutu
    const getScaleFontSize = (scale: string) => (
        scale === 'huge' || scale === 'xl' ? 1.55 :
        scale === 'lg' ? 1.4 :
        scale === 'xs' ? 1.05 : 1.25
    );
    const [baseFontSize, setBaseFontSize] = useState<number>(() => getScaleFontSize(fontSizeScale));

    useEffect(() => {
        setBaseFontSize(getScaleFontSize(fontSizeScale));
    }, [fontSizeScale]);

    const increaseFontSize = () => {
        playSound('pop');
        setBaseFontSize(fs => Math.min(Number((fs + 0.1).toFixed(2)), 2.5));
    };
    const decreaseFontSize = () => {
        playSound('pop');
        setBaseFontSize(fs => Math.max(Number((fs - 0.1).toFixed(2)), 0.85));
    };

    // Canlı Yazma Sayacı
    const initialSeconds = (step.suggestedMinutes || 3) * 60;
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerDone, setTimerDone] = useState(false);
    const [checkedItems, setCheckedItems] = useState<{ [index: number]: boolean }>({});

    // Akıllı Tahta Bölüm Odaklama & Tek Kart Büyütme Modu (Ana sayfadaki SketchnoteNotesViewer ile birebir)
    const [focusState, setFocusState] = useState<{
        type: 'concept' | 'note';
        index: number;
    } | null>(null);
    const [focusScale, setFocusScale] = useState<number>(1.25);

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

    // Odak Modalı Klavye Kısayolları (Yakalanan olaylar sunum slaytlarını değiştirmez)
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

    const headerPillLabel = courseName
        ? `${courseName}${unitName ? ` / ${unitName}` : ''}`
        : (unitName || step.noteTitle || 'Defter Notu & Kavram Panosu');
    const mainHeadline = step.title || topicTitle || 'Defterimize Yazalım';

    if (!hasConcepts && !hasNotes) {
        return (
            <div
                className="w-full h-full sketchnote-paper flex flex-col items-center justify-center p-6 text-center select-none"
                data-presentation-font="sketchnote"
            >
                <div className="py-12 px-8 bg-white/85 rounded-3xl border-[2.5px] border-dashed border-slate-300 shadow-sm max-w-lg">
                    <Pencil className="w-12 h-12 text-[#0284c7] mx-auto mb-3 animate-bounce" />
                    <h3 className="font-caveat font-bold text-3xl text-slate-800 mb-1">
                        {mainHeadline}
                    </h3>
                    <p className="font-handwriting text-slate-500 text-base">
                        Bu adım için henüz kayıtlı kavram veya defter notu bulunmuyor.
                    </p>
                </div>
            </div>
        );
    }

    const renderConceptGrid = (isSplit: boolean) => (
        <section className="space-y-4">
            {/* Bölüm Başlık Şeridi + Bölümü Büyüt / Odaklan Butonu */}
            <div className="flex items-center justify-between flex-wrap gap-2.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#e0f2fe] border-[2px] border-[#0284c7] shadow-[2.5px_2.5px_0_#0284c7] transform -rotate-0.5">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#0284c7]" />
                    <h2 className="font-caveat font-extrabold text-xl sm:text-2xl md:text-3xl text-[#0f172a] tracking-tight">
                        Dini Kavramlar ve Tanımları
                    </h2>
                    <span className="font-handwriting font-bold px-2 py-0.5 rounded-full bg-[#0284c7] text-white text-xs">
                        {conceptDefs.length} Kavram
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => { playSound('pop'); setFocusState({ type: 'concept', index: 0 }); }}
                    className="font-caveat font-bold text-sm sm:text-base text-[#0284c7] hover:text-white bg-white hover:bg-[#0284c7] border-[2px] border-[#0284c7] px-3 py-1 rounded-xl shadow-[2.5px_2.5px_0_#0284c7] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Akıllı Tahtada Kavramları Sunum Modunda Aç"
                >
                    <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Bölümü Büyüt / Odaklan</span>
                </button>
            </div>

            {/* Kavram Kartları Grid */}
            <div className={cn(
                "grid gap-3.5 items-stretch",
                isSplit
                    ? "grid-cols-1 xl:grid-cols-2"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}>
                {conceptDefs.map((item, index) => {
                    const pal = SKETCHNOTE_PALETTE[index % SKETCHNOTE_PALETTE.length];

                    if (item.concept === '[BAŞLIK]') {
                        return (
                            <div key={`c-${index}`} className="col-span-full my-2 flex items-center gap-3">
                                <div className="h-[2px] border-b-2 border-dashed border-[#94a3b8] flex-1" />
                                <h3 className="font-caveat font-bold text-xl sm:text-2xl text-[#0369a1] px-4 py-1 rounded-xl bg-white border-2 border-[#0284c7] shadow-[2px_2px_0_#0284c7]">
                                    {item.definition}
                                </h3>
                                <div className="h-[2px] border-b-2 border-dashed border-[#94a3b8] flex-1" />
                            </div>
                        );
                    }

                    return (
                        <div
                            key={`c-${index}`}
                            onClick={() => { playSound('pop'); setFocusState({ type: 'concept', index }); }}
                            className={cn(
                                "sketchnote-box p-4 sm:p-5 flex flex-col justify-between group cursor-pointer transition-all duration-300 relative",
                                pal.bg,
                                pal.border,
                                pal.shadow
                            )}
                        >
                            {/* Washi Bant */}
                            <div className={pal.tape} />

                            <div>
                                <div className="flex items-center justify-between mb-2.5 gap-2">
                                    <div className="inline-flex items-center gap-1.5 flex-1 min-w-0">
                                        <span className={cn(
                                            "font-caveat font-extrabold text-xl sm:text-2xl px-2.5 py-0.5 rounded-lg border uppercase tracking-wide shadow-xs transform -rotate-1 transition-transform group-hover:rotate-0 truncate",
                                            pal.tagBg,
                                            pal.tagText,
                                            pal.tagBorder
                                        )}>
                                            {item.concept}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playSound('pop');
                                                setFocusState({ type: 'concept', index });
                                            }}
                                            className="p-1.5 rounded-lg bg-white/90 hover:bg-[#0284c7] text-[#0284c7] hover:text-white border border-[#0284c7]/50 shadow-xs transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
                                            title="Akıllı Tahtada Bu Kavramı Büyüt / Odaklan"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </button>
                                        <div className={cn(
                                            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-caveat font-bold text-sm sm:text-base text-white shadow-xs border-2 border-white/70",
                                            pal.numBg
                                        )}>
                                            {index + 1}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2 text-slate-800 font-handwriting leading-relaxed text-justify select-text">
                                    <p style={{ fontSize: `${baseFontSize}rem`, lineHeight: '1.45' }}>
                                        <HighlightedText
                                            text={item.definition}
                                            highlightTerm={item.concept}
                                            color={pal.highlightColor}
                                        />
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 mt-2 border-t border-black/5 text-[11px] font-handwriting text-slate-400">
                                <span className="flex items-center gap-1">
                                    <Sparkles className={cn("w-3.5 h-3.5", pal.iconColor)} />
                                    Anahtar Kavram
                                </span>
                                <span className="font-caveat font-bold text-xs opacity-60">Dokun: Büyüt 🔍</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );

    const renderNotesGrid = (isSplit: boolean) => (
        <section className="space-y-4">
            {/* Bölüm Başlık Şeridi + Bölümü Büyüt / Odaklan Butonu */}
            <div className="flex items-center justify-between flex-wrap gap-2.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#fef08a] border-[2px] border-[#eab308] shadow-[2.5px_2.5px_0_#ca8a04] transform rotate-0.5">
                    <Pencil className="w-4 h-4 sm:w-5 sm:h-5 text-[#854d0e]" />
                    <h2 className="font-caveat font-extrabold text-xl sm:text-2xl md:text-3xl text-[#0f172a] tracking-tight">
                        Önemli Notlar (Defterimize Yazalım)
                    </h2>
                    <span className="font-handwriting font-bold px-2 py-0.5 rounded-full bg-[#ca8a04] text-white text-xs">
                        {noteItems.length} Madde
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => { playSound('pop'); setFocusState({ type: 'note', index: 0 }); }}
                    className="font-caveat font-bold text-sm sm:text-base text-[#854d0e] hover:text-white bg-white hover:bg-[#ca8a04] border-[2px] border-[#eab308] px-3 py-1 rounded-xl shadow-[2.5px_2.5px_0_#ca8a04] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Akıllı Tahtada Notları Sunum Modunda Aç"
                >
                    <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Bölümü Büyüt / Odaklan</span>
                </button>
            </div>

            {/* Notlar Kartları */}
            <div className={cn(
                "grid gap-3.5 items-stretch",
                isSplit ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )}>
                {noteItems.map((note, index) => {
                    const isChecked = checkedItems[index] || false;
                    const pal = SKETCHNOTE_PALETTE[index % SKETCHNOTE_PALETTE.length];

                    if (note.startsWith('[BAŞLIK]')) {
                        const sectionHeading = note.replace('[BAŞLIK]', '').trim();
                        return (
                            <div key={`n-${index}`} className="col-span-full my-2 flex items-center gap-3">
                                <div className="h-[2px] border-b-2 border-dashed border-[#eab308] flex-1" />
                                <h3 className="font-caveat font-bold text-xl sm:text-2xl text-[#854d0e] px-4 py-1 rounded-xl bg-[#fefce8] border-2 border-[#eab308] shadow-[2px_2px_0_#ca8a04]">
                                    {sectionHeading}
                                </h3>
                                <div className="h-[2px] border-b-2 border-dashed border-[#eab308] flex-1" />
                            </div>
                        );
                    }

                    const rotations = ['-rotate-[0.4deg]', 'rotate-[0.5deg]', '-rotate-[0.6deg]', 'rotate-[0.4deg]'];
                    const cardRotation = rotations[index % rotations.length];

                    return (
                        <div
                            key={`n-${index}`}
                            onClick={() => toggleCheckItem(index)}
                            className={cn(
                                "sketchnote-box p-4 sm:p-5 flex items-start gap-3.5 group cursor-pointer transition-all duration-300 relative",
                                pal.bg,
                                pal.border,
                                pal.shadow,
                                cardRotation,
                                isChecked ? "opacity-65 line-through bg-slate-100/90 border-slate-400 shadow-[1px_1px_0_#94a3b8]" : ""
                            )}
                        >
                            {/* Raptiye */}
                            <div className="absolute -top-3 left-6 text-sm select-none pointer-events-none drop-shadow-xs">
                                📌
                            </div>

                            {/* Sol: Numara Rozeti */}
                            <div className={cn(
                                "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-caveat font-black text-lg sm:text-xl text-white shadow-xs border-2 border-white/70 flex-shrink-0 mt-0.5 transition-transform group-hover:scale-105",
                                isChecked ? "bg-slate-500" : pal.numBg
                            )}>
                                {isChecked ? <Check className="w-5 h-5 stroke-[3]" /> : index + 1}
                            </div>

                            {/* Orta: Not Metni */}
                            <div className="flex-1 min-w-0 select-text">
                                <p
                                    className={cn(
                                        "font-handwriting font-semibold leading-relaxed text-justify",
                                        isChecked ? "text-slate-500" : "text-slate-900"
                                    )}
                                    style={{ fontSize: `${baseFontSize}rem`, lineHeight: '1.45' }}
                                >
                                    <HighlightedText
                                        text={note}
                                        color={pal.highlightColor}
                                    />
                                </p>
                            </div>

                            {/* Sağ: Büyüt Butonu + Tamamlama Onayı */}
                            <div className="flex-shrink-0 flex items-center gap-1.5 pt-0.5">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playSound('pop');
                                        setFocusState({ type: 'note', index });
                                    }}
                                    className="p-1.5 rounded-lg bg-white/90 hover:bg-[#ca8a04] text-[#854d0e] hover:text-white border border-[#eab308]/60 shadow-xs transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
                                    title="Akıllı Tahtada Bu Notu Büyüt / Odaklan"
                                >
                                    <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>

                                <div
                                    className={cn(
                                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                        isChecked
                                            ? "bg-emerald-500 border-emerald-600 text-white"
                                            : "border-slate-300 bg-white/80 group-hover:border-slate-400"
                                    )}
                                    title={isChecked ? "Tamamlandı" : "Yazıldı Olarak İşaretle"}
                                >
                                    {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );

    return (
        <div
            className="w-full h-full sketchnote-paper text-[#1e293b] relative select-none overflow-y-auto pt-3 sm:pt-5 pb-28 sm:pb-32 px-3 sm:px-6"
            data-presentation-font="sketchnote"
        >
            <div className="max-w-7xl mx-auto relative z-10 space-y-6">
                {/* ══ 1. ÜST NOT DEFTERİ BAŞLIĞI (ANA SAYFA SKETCHNOTE TASARIMI) ══ */}
                <div className="flex flex-col items-center justify-center text-center space-y-2.5 pb-4 border-b-[2.5px] border-dashed border-[#94a3b8] relative">
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#fde047] border-[2px] border-[#1e293b] text-[#1e293b] font-handwriting font-bold text-xs sm:text-sm shadow-[2px_2px_0_#1e293b] transform -rotate-1 max-w-full">
                        <Pin className="w-3.5 h-3.5 fill-[#1e293b] flex-shrink-0" />
                        <span className="truncate">{headerPillLabel}</span>
                    </div>

                    <div className="relative inline-block max-w-4xl">
                        <div className="washi-tape" />
                        <h1 className="font-caveat font-extrabold text-2xl sm:text-4xl md:text-5xl text-[#0f172a] bg-[#e0f2fe] border-[2.5px] border-[#0284c7] px-5 sm:px-10 py-1.5 sm:py-2.5 rounded-2xl shadow-[3.5px_3.5px_0_#0284c7] leading-tight tracking-tight">
                            ✏️ {mainHeadline}
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-0.5">
                        <span className="font-caveat font-bold text-sm sm:text-base bg-[#fbcfe8] text-[#9d174d] border-[1.5px] border-[#db2777] px-3.5 py-0.5 rounded-full shadow-[2px_2px_0_#db2777] transform rotate-0.5">
                            ✨ El Yazısı & Kavram Panosu
                        </span>
                        <span className="font-handwriting font-semibold text-xs sm:text-sm text-slate-500">
                            • Kartlara dokunup akıllı tahtada büyütebilir, notları işaretleyebilirsiniz
                        </span>
                    </div>
                </div>

                {/* ══ 2. SKETCHNOTE SINIF KONTROL ÇUBUĞU (GÖRÜNÜM / PUNTO / SAYAÇ) ══ */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 sm:px-3.5 sm:py-2 rounded-2xl bg-white/95 border-[2px] border-[#1e293b] shadow-[3px_3px_0_#1e293b]">
                    {/* Görünüm Sekmeleri */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {hasConcepts && hasNotes && (
                            <button
                                type="button"
                                onClick={() => { playSound('pop'); setViewMode('split'); }}
                                className={cn(
                                    "px-3 py-1 rounded-xl font-handwriting font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 border-[1.5px]",
                                    viewMode === 'split'
                                        ? "bg-[#e0f2fe] border-[#0284c7] text-[#0369a1] shadow-[2px_2px_0_#0284c7]"
                                        : "bg-[#f8fafc] border-transparent text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <span>🔲 Yan Yana (Tümü)</span>
                            </button>
                        )}
                        {hasConcepts && (
                            <button
                                type="button"
                                onClick={() => { playSound('pop'); setViewMode('concepts'); }}
                                className={cn(
                                    "px-3 py-1 rounded-xl font-handwriting font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 border-[1.5px]",
                                    viewMode === 'concepts'
                                        ? "bg-[#bae6fd] border-[#0284c7] text-[#075985] shadow-[2px_2px_0_#0284c7]"
                                        : "bg-[#f8fafc] border-transparent text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <span>📖 Kavramlar</span>
                                <span className="px-1.5 py-0.2 rounded-full bg-[#0284c7] text-white text-[11px]">{conceptDefs.length}</span>
                            </button>
                        )}
                        {hasNotes && (
                            <button
                                type="button"
                                onClick={() => { playSound('pop'); setViewMode('notes'); }}
                                className={cn(
                                    "px-3 py-1 rounded-xl font-handwriting font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 border-[1.5px]",
                                    viewMode === 'notes'
                                        ? "bg-[#fde047] border-[#ca8a04] text-[#854d0e] shadow-[2px_2px_0_#ca8a04]"
                                        : "bg-[#f8fafc] border-transparent text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <span>✏️ Defter Notları</span>
                                <span className="px-1.5 py-0.2 rounded-full bg-[#ca8a04] text-white text-[11px]">{noteItems.length}</span>
                            </button>
                        )}
                    </div>

                    {/* Sağ: Yazı Boyutu & Canlı Sayaç */}
                    <div className="flex flex-wrap items-center gap-2 ml-auto">
                        {/* Punto Ayarı */}
                        <div className="flex items-center gap-1 bg-[#f8fafc] rounded-xl p-0.5 border-[1.5px] border-[#cbd5e1]">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={decreaseFontSize}
                                className="h-7 w-7 text-slate-700 hover:text-[#0284c7] hover:bg-[#e0f2fe] rounded-lg cursor-pointer"
                                title="Yazı Boyutunu Küçült"
                            >
                                <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
                            </Button>
                            <span className="font-caveat font-bold text-xs text-[#0369a1] w-10 text-center uppercase">
                                YAZI
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={increaseFontSize}
                                className="h-7 w-7 text-slate-700 hover:text-[#0284c7] hover:bg-[#e0f2fe] rounded-lg cursor-pointer"
                                title="Yazı Boyutunu Büyüt"
                            >
                                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            </Button>
                        </div>

                        {/* Yazma Süresi Sayacı */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#fefce8] border-[1.5px] border-[#eab308] shadow-[1.5px_1.5px_0_#ca8a04]">
                            <Clock className={cn("w-3.5 h-3.5", isTimerRunning ? "text-[#16a34a] animate-spin" : "text-[#854d0e]")} />
                            <span className="font-handwriting font-bold text-sm sm:text-base text-[#0f172a] tabular-nums min-w-[38px] text-center">
                                {formatTime(timeLeft)}
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                onClick={toggleTimer}
                                className={cn(
                                    "h-6 px-2 text-xs font-handwriting font-bold rounded-lg transition-all cursor-pointer",
                                    isTimerRunning
                                        ? "bg-[#ea580c] hover:bg-[#c2410c] text-white"
                                        : "bg-[#16a34a] hover:bg-[#15803d] text-white"
                                )}
                            >
                                {isTimerRunning ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                                {isTimerRunning ? "Durdur" : (timerDone ? "Yeniden" : "Başlat")}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={addExtraMinute}
                                title="+1 Dakika Ekle"
                                className="h-6 px-1.5 text-xs font-handwriting font-bold text-[#854d0e] hover:bg-[#fde047] rounded-lg cursor-pointer"
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
                                    className="h-6 px-1 text-[#854d0e] hover:bg-[#fde047] rounded-lg cursor-pointer"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══ 3. ANA İÇERİK (YAN YANA VEYA TAM EKRAN) ══ */}
                {viewMode === 'split' && hasConcepts && hasNotes ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-6">{renderConceptGrid(true)}</div>
                        <div className="lg:col-span-6">{renderNotesGrid(true)}</div>
                    </div>
                ) : viewMode === 'concepts' && hasConcepts ? (
                    renderConceptGrid(false)
                ) : hasNotes ? (
                    renderNotesGrid(false)
                ) : null}
            </div>

            {/* ══ 4. AKILLI TAHTA BÖLÜM BÜYÜTME & ODAKLANMA MODALI (ANA SAYFA İLE BİREBİR) ══ */}
            {focusState && (() => {
                const isConcept = focusState.type === 'concept';
                const totalItems = isConcept ? conceptDefs.length : noteItems.length;
                const currentIndex = focusState.index;
                const pal = SKETCHNOTE_PALETTE[currentIndex % SKETCHNOTE_PALETTE.length];

                const currentConcept = isConcept ? conceptDefs[currentIndex] : null;
                const currentNote = !isConcept ? noteItems[currentIndex] : '';

                return (
                    <div
                        className="fixed inset-0 z-[200] bg-slate-950/96 backdrop-blur-2xl flex flex-col p-3 sm:p-5 text-white select-none overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setFocusState(null);
                        }}
                    >
                        {/* ÜST ARAÇ ÇUBUĞU */}
                        <div className="w-full bg-[#0f172a] border-2 border-[#334155] rounded-2xl p-2.5 sm:px-5 sm:py-2.5 flex items-center justify-between gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex-shrink-0 flex-wrap">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                <span className="bg-[#0284c7] text-white font-bold text-xs sm:text-sm px-3 py-1 rounded-xl border border-[#38bdf8] flex items-center gap-1.5 flex-shrink-0">
                                    🕌 DinDersi Atölyesi
                                </span>

                                <span className="bg-[#fde047] text-[#1e293b] font-bold text-xs sm:text-sm px-3 py-1 rounded-xl border-[1.5px] border-[#1e293b] flex-shrink-0">
                                    📌 {currentIndex + 1} / {totalItems}
                                </span>

                                <span className="font-caveat font-extrabold text-xl sm:text-2xl text-[#38bdf8] truncate hidden md:inline">
                                    {isConcept ? currentConcept?.concept : 'Önemli Ders Notu'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Punto Kontrolü */}
                                <div className="hidden sm:flex items-center gap-1 bg-white/5 px-2 py-1 rounded-xl border border-white/10 text-xs">
                                    <span className="text-slate-400 mr-1 font-semibold">🔍 Boyut:</span>
                                    <button
                                        type="button"
                                        onClick={() => setFocusScale(s => Math.max(0.85, Number((s - 0.15).toFixed(2))))}
                                        className="h-7 px-2 rounded-lg bg-slate-800 hover:bg-[#0284c7] text-white font-bold transition-colors cursor-pointer"
                                        title="Yazıyı Küçült"
                                    >
                                        A-
                                    </button>
                                    <span className="font-mono font-bold text-[#fde047] w-12 text-center text-xs">
                                        {Math.round(focusScale * 100)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setFocusScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
                                        className="h-7 px-2 rounded-lg bg-slate-800 hover:bg-[#0284c7] text-white font-bold transition-colors cursor-pointer"
                                        title="Yazıyı Büyüt"
                                    >
                                        A+
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFocusScale(1.25)}
                                        className="h-7 px-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-[11px] cursor-pointer"
                                        title="Sıfırla"
                                    >
                                        100%
                                    </button>
                                </div>

                                {/* Önceki / Sonraki */}
                                <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-xl border border-white/10">
                                    <button
                                        type="button"
                                        disabled={currentIndex === 0}
                                        onClick={() => setFocusState(prev => prev ? { ...prev, index: Math.max(0, prev.index - 1) } : null)}
                                        className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-[#0284c7] disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-handwriting font-bold text-xs sm:text-sm transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Önceki (Sol Ok)"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span className="hidden sm:inline">Önceki</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={currentIndex === totalItems - 1}
                                        onClick={() => setFocusState(prev => prev ? { ...prev, index: Math.min(totalItems - 1, prev.index + 1) } : null)}
                                        className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-[#0284c7] disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-handwriting font-bold text-xs sm:text-sm transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Sonraki (Sağ Ok veya Boşluk)"
                                    >
                                        <span className="hidden sm:inline">Sonraki</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Kapat */}
                                <button
                                    type="button"
                                    onClick={() => setFocusState(null)}
                                    className="h-8 px-3 rounded-xl bg-[#991b1b] hover:bg-[#b91c1c] text-white font-handwriting font-bold text-xs sm:text-sm transition-all border border-[#ef4444] flex items-center gap-1 cursor-pointer shadow-sm"
                                    title="Kapat (ESC)"
                                >
                                    <X className="w-4 h-4 stroke-[3]" />
                                    <span>Kapat</span>
                                </button>
                            </div>
                        </div>

                        {/* MERKEZ SAHNE */}
                        <div className="flex-1 w-full flex items-center justify-center p-2 sm:p-6 overflow-y-auto min-h-0">
                            <div
                                className={cn(
                                    "w-full max-w-4xl my-auto p-6 sm:p-10 rounded-[30px] border-[3.5px] relative transition-all duration-300",
                                    pal.bg,
                                    pal.border
                                )}
                                style={{
                                    boxShadow: `0 20px 60px rgba(0,0,0,0.4), 6px 6px 0 ${pal.borderHex}`
                                }}
                            >
                                <div className={pal.tape} style={{ width: '100px', height: '24px', top: '-12px' }} />

                                <div className="flex items-center justify-between gap-4 border-b-2 border-dashed border-black/15 pb-4 mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center font-caveat font-black text-2xl text-white shadow-md border-2 border-white/80",
                                            pal.numBg
                                        )}>
                                            {currentIndex + 1}
                                        </div>
                                        <div>
                                            <span className="font-handwriting text-xs sm:text-sm text-slate-500 font-bold block">
                                                {isConcept ? 'DİNİ KAVRAM' : 'ÖNEMLİ DERS NOTU'}
                                            </span>
                                            <h3
                                                className="font-caveat font-extrabold text-[#0f172a] tracking-tight leading-none"
                                                style={{ fontSize: `calc(32px * ${focusScale})` }}
                                            >
                                                {isConcept ? currentConcept?.concept : `Not #${currentIndex + 1}`}
                                            </h3>
                                        </div>
                                    </div>

                                    <span className={cn(
                                        "font-caveat font-bold text-base sm:text-lg px-4 py-1 rounded-xl border shadow-xs transform rotate-1 hidden sm:inline-block",
                                        pal.tagBg,
                                        pal.tagText,
                                        pal.tagBorder
                                    )}>
                                        {isConcept ? '✨ Temel Tanım' : '✏️ Defter Notu'}
                                    </span>
                                </div>

                                <div className="py-2">
                                    {isConcept && currentConcept && (
                                        <div className="space-y-4">
                                            <div className="inline-block mb-1">
                                                <span
                                                    className={cn(
                                                        "font-caveat font-extrabold px-4 py-1 rounded-xl border uppercase tracking-wide shadow-sm inline-block transform -rotate-0.5",
                                                        pal.tagBg,
                                                        pal.tagText,
                                                        pal.tagBorder
                                                    )}
                                                    style={{ fontSize: `calc(26px * ${focusScale})` }}
                                                >
                                                    {currentConcept.concept}
                                                </span>
                                            </div>

                                            <p
                                                className="font-handwriting font-medium text-slate-900 leading-relaxed text-justify"
                                                style={{
                                                    fontSize: `calc(22px * ${focusScale})`,
                                                    lineHeight: '1.55'
                                                }}
                                            >
                                                <HighlightedText
                                                    text={currentConcept.definition}
                                                    highlightTerm={currentConcept.concept}
                                                    color={pal.highlightColor}
                                                />
                                            </p>
                                        </div>
                                    )}

                                    {!isConcept && (
                                        <p
                                            className="font-handwriting font-semibold text-slate-900 leading-relaxed text-justify"
                                            style={{
                                                fontSize: `calc(22px * ${focusScale})`,
                                                lineHeight: '1.55'
                                            }}
                                        >
                                            <HighlightedText
                                                text={currentNote}
                                                color={pal.highlightColor}
                                            />
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-6 mt-4 border-t border-black/10 gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {Array.from({ length: totalItems }).map((_, dotIdx) => (
                                            <button
                                                key={dotIdx}
                                                type="button"
                                                onClick={() => setFocusState(prev => prev ? { ...prev, index: dotIdx } : null)}
                                                className={cn(
                                                    "w-7 h-7 rounded-lg font-caveat font-bold text-xs flex items-center justify-center transition-all cursor-pointer",
                                                    dotIdx === currentIndex
                                                        ? cn("text-white shadow-sm scale-110", pal.numBg)
                                                        : "bg-black/5 hover:bg-black/10 text-slate-600"
                                                )}
                                                title={`Adım ${dotIdx + 1}'e Git`}
                                            >
                                                {dotIdx + 1}
                                            </button>
                                        ))}
                                    </div>

                                    <span className="font-handwriting text-xs text-slate-400 hidden sm:inline">
                                        İpucu: Sonraki için Boşluk veya Sağ Ok tuşuna basın
                                    </span>
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
            {isSketchnote ? (
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#fefce8] border-[2.5px] border-[#1e293b] text-[#1e293b] text-base md:text-lg font-['Caveat',cursive] font-bold shadow-[3px_3px_0_#1e293b] mb-4">
                    <Compass className="w-5 h-5 text-amber-600 animate-spin" />
                    <span>🪜 {step.title || 'Adım Adım Yol Haritası & Süreç'}</span>
                </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 border-2 border-blue-400/40 text-blue-700 dark:text-blue-300 text-xs md:text-sm font-black uppercase tracking-wider mb-4 md:mb-6 shadow-sm backdrop-blur-xl"
                >
                    <Compass className="w-4 h-4 text-blue-500 animate-spin" />
                    <span>{step.title || '🪜 Adım Adım Yol Haritası & Süreç'}</span>
                    <Compass className="w-4 h-4 text-blue-500 animate-spin" />
                </motion.div>
            )}

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
                                    isSketchnote
                                        ? (isCurrent
                                            ? "bg-[#e0f2fe] border-[2.5px] border-[#0284c7] text-[#0369a1] shadow-[3px_3px_0_#0284c7] scale-105 font-['Patrick_Hand',cursive] font-bold"
                                            : isPassed
                                                ? "bg-[#f0fdf4] border-[2px] border-[#16a34a] text-[#15803d] font-['Patrick_Hand',cursive]"
                                                : "bg-white border-[2px] border-slate-300 text-slate-600 hover:border-slate-800 font-['Patrick_Hand',cursive]")
                                        : (isCurrent
                                            ? `bg-gradient-to-r ${style.active} scale-105 shadow-lg`
                                            : isPassed
                                                ? "bg-slate-800/80 border-emerald-500/40 text-emerald-300 hover:bg-slate-800"
                                                : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-400")
                                )}
                            >
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center font-black text-xs",
                                    isSketchnote ? "bg-black/10 text-slate-900" : "bg-black/20"
                                )}>
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
                    className={cn(
                        "relative w-full rounded-3xl p-6 sm:p-8 md:p-10 text-left overflow-hidden min-h-[220px] flex flex-col justify-between",
                        isSketchnote
                            ? "border-[3px] border-[#1e293b] bg-white shadow-[6px_6px_0_#1e293b]"
                            : "border-2 border-blue-200/90 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl"
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
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-300 text-xs font-black uppercase tracking-wider mb-4">
                                <span>ADIM {activeStepIndex + 1} / {stepsList.length}</span>
                            </div>
                        )}

                        <h3 className={cn(
                            "text-2xl md:text-3xl font-black mb-3",
                            isSketchnote ? "font-['Caveat',cursive] text-[#0f172a] text-3xl md:text-4xl" : "text-slate-900 dark:text-white"
                        )}>
                            {stepsList[activeStepIndex].title}
                        </h3>

                        <p className={cn(
                            "font-bold leading-relaxed",
                            isSketchnote 
                                ? "font-['Patrick_Hand',cursive] text-slate-800 text-xl md:text-2xl [&_mark]:bg-[#fef08a] [&_mark]:px-1.5 [&_mark]:py-0.5 [&_mark]:rounded-sm [&_mark]:font-black" 
                                : cn("text-slate-700 dark:text-slate-200", getDescFontSize())
                        )}>
                            {stepsList[activeStepIndex].description}
                        </p>
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

    const QUADRANT_STYLES = [
        {
            border: 'border-sky-400/50 hover:border-sky-400',
            bg: 'bg-sky-500/10 hover:bg-sky-500/15',
            badge: 'bg-sky-500 text-white',
            text: 'text-sky-950 dark:text-sky-100',
            titleText: 'text-sky-700 dark:text-sky-300',
            shadow: ''
        },
        {
            border: 'border-emerald-400/50 hover:border-emerald-400',
            bg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
            badge: 'bg-emerald-500 text-white',
            text: 'text-emerald-950 dark:text-emerald-100',
            titleText: 'text-emerald-700 dark:text-emerald-300',
            shadow: ''
        },
        {
            border: 'border-amber-400/50 hover:border-amber-400',
            bg: 'bg-amber-500/10 hover:bg-amber-500/15',
            badge: 'bg-amber-500 text-slate-950',
            text: 'text-amber-950 dark:text-amber-100',
            titleText: 'text-amber-700 dark:text-amber-300',
            shadow: ''
        },
        {
            border: 'border-purple-400/50 hover:border-purple-400',
            bg: 'bg-purple-500/10 hover:bg-purple-500/15',
            badge: 'bg-purple-500 text-white',
            text: 'text-purple-950 dark:text-purple-100',
            titleText: 'text-purple-700 dark:text-purple-300',
            shadow: ''
        }
    ];

    const quadrants = step.quadrants || [];

    return (
        <div className={cn(
            "w-full h-full flex flex-col items-center justify-start p-3 md:p-6 select-none max-w-5xl mx-auto overflow-y-auto",
            isFullscreen ? "py-6" : "py-3"
        )}>
            {/* ══ BAŞLIK ══ */}
            {isSketchnote ? (
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#fefce8] border-[2.5px] border-[#1e293b] text-[#1e293b] text-base md:text-lg font-['Caveat',cursive] font-bold shadow-[3px_3px_0_#1e293b] mb-4 md:mb-6">
                    <Layers className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span>🔲 {step.title || '4 Boyutta Konu Analizi'}</span>
                    {step.topicName && <span className="opacity-80">({step.topicName})</span>}
                </div>
            ) : (
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
            )}

            {/* ══ 2x2 MATRİS IZGARASI ══ */}
            <div className={cn("grid gap-4 md:gap-5 w-full", isTeacher ? "grid-cols-2 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2")}>
                {quadrants.map((quad, idx) => {
                    const style = isSketchnote ? SKETCHNOTE_QUADRANTS[idx % SKETCHNOTE_QUADRANTS.length] : QUADRANT_STYLES[idx % QUADRANT_STYLES.length];
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
                                "rounded-3xl p-5 md:p-6 transition-all cursor-pointer relative flex flex-col justify-between min-h-[160px] md:min-h-[180px]",
                                isSketchnote ? "border-[2.5px]" : "border-2 backdrop-blur-xl",
                                style.border,
                                style.bg,
                                style.shadow,
                                isFocused && (isSketchnote ? "ring-4 ring-[#1e293b] scale-[1.02]" : "ring-4 ring-indigo-400/60 scale-[1.02]")
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className={cn(
                                        "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm",
                                        isSketchnote ? "font-['Patrick_Hand',cursive] font-bold text-sm rounded-full" : "",
                                        style.badge
                                    )}>
                                        {quad.label}
                                    </span>
                                    <span className={cn("text-xs font-bold", isSketchnote ? "text-slate-600 font-['Patrick_Hand',cursive]" : "text-slate-400")}>
                                        {isFocused ? "Odaktan Çık ✕" : "Büyüt 🔍"}
                                    </span>
                                </div>
                                <p className={cn(
                                    "font-bold leading-relaxed tracking-wide",
                                    style.text,
                                    !isSketchnote && getContentFontSize()
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
        <div className={cn("w-full h-full flex flex-col justify-start p-2 md:p-3.5 select-none overflow-y-auto", isSketchnote ? "bg-transparent text-[#1e293b]" : "bg-slate-950 text-white")}>
            
            {/* ══ ÜST KONTROL & BAŞLIK ÇUBUĞU ══ */}
            <div className={cn(
                "flex-shrink-0 w-full flex flex-wrap items-center justify-between gap-2 mb-2.5 p-2 md:p-2.5 rounded-2xl shadow-xl",
                isSketchnote 
                    ? "bg-white border-[2.5px] border-[#1e293b] shadow-[3px_3px_0_#1e293b] text-[#1e293b]" 
                    : "bg-slate-900/95 border border-white/20 backdrop-blur-xl text-white"
            )}>
                
                {/* BAŞLIK */}
                <div className="flex-1 flex items-center justify-center gap-2.5 text-center">
                    <div className={cn(
                        "w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center font-black shadow-md flex-shrink-0",
                        isSketchnote ? "bg-[#fefce8] border-2 border-[#ca8a04] text-[#854d0e]" : "bg-gradient-to-br from-indigo-500 to-cyan-600 text-white"
                    )}>
                        <Layers className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    {isSketchnote ? (
                        <div className="text-center">
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
                    )}
                </div>

                {/* SAĞ: PUNTO BOYUT KONTROLLERİ */}
                <div className="flex items-center gap-2">
                    <div className={cn("flex items-center rounded-xl p-0.5 border", isSketchnote ? "bg-slate-100 border-slate-300" : "bg-slate-950/90 border-white/15")}>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={decreaseFontSize} 
                            className={cn("h-7 w-7 rounded-lg", isSketchnote ? "text-slate-700 hover:text-black hover:bg-slate-200" : "text-slate-300 hover:text-white hover:bg-white/10")}
                            title="Yazı Boyutunu Küçült"
                        >
                            <Minus className="h-3.5 w-3.5"/>
                        </Button>
                        <span className={cn("text-[10px] font-black w-8 text-center uppercase", isSketchnote ? "text-slate-700" : "text-slate-300")}>Boyut</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={increaseFontSize} 
                            className={cn("h-7 w-7 rounded-lg", isSketchnote ? "text-slate-700 hover:text-black hover:bg-slate-200" : "text-slate-300 hover:text-white hover:bg-white/10")}
                            title="Yazı Boyutunu Büyüt"
                        >
                            <Plus className="h-3.5 w-3.5"/>
                        </Button>
                    </div>

                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-xl border hidden md:inline-block", isSketchnote ? "bg-[#fefce8] text-[#854d0e] border-[#ca8a04]" : "text-slate-400 bg-slate-900 border-white/10")}>
                        {categories.length} Kategori
                    </span>
                </div>
            </div>

            {/* ══ SÜTUNLU KATEGORİ IZGARASI ══ */}
            <div className={cn("grid gap-3 w-full flex-grow items-stretch", getColumnGridClass())}>
                {categories.map((cat, catIdx) => {
                    const colorKey = cat.color || defaultColors[catIdx % defaultColors.length];
                    const theme = isSketchnote 
                        ? (SKETCHNOTE_CATEGORY_MAP[colorKey] || SKETCHNOTE_CATEGORY_MAP.emerald)
                        : (CATEGORY_COLOR_MAP[colorKey] || CATEGORY_COLOR_MAP.emerald);
                    const items = cat.items || [];

                    return (
                        <div
                            key={`cat-${catIdx}`}
                            className={cn(
                                "relative overflow-hidden rounded-3xl p-3.5 sm:p-4 md:p-5 flex flex-col justify-between transition-all duration-300",
                                isSketchnote ? "" : "backdrop-blur-xl",
                                theme.card
                            )}
                        >
                            {/* Numara Filigranı */}
                            <div className={cn("absolute top-0 right-0 font-black text-6xl p-1.5 leading-none pointer-events-none select-none rounded-bl-2xl", isSketchnote ? "text-black/10 font-['Caveat',cursive]" : "bg-black/40 text-white/30 opacity-25")}>
                                {catIdx + 1}
                            </div>

                            <div className="z-10 relative flex flex-col h-full space-y-3">
                                {/* Kategori Başlığı ve Rozeti */}
                                <div className={cn("space-y-1.5 border-b pb-3", isSketchnote ? "border-black/15" : "border-white/20")}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={cn("px-2.5 py-0.5 rounded-full font-bold text-[11px] border tracking-wide", isSketchnote && "font-['Patrick_Hand',cursive]", theme.badge)}>
                                            {cat.badge || `Grup ${catIdx + 1}`}
                                        </span>
                                        <span className={cn("text-[11px] font-bold", isSketchnote ? "text-slate-600 font-['Patrick_Hand',cursive]" : "text-white/70")}>
                                            {items.length} Örnek
                                        </span>
                                    </div>
                                    <h3 
                                        className={cn(
                                            "uppercase tracking-tight leading-tight",
                                            isSketchnote ? "font-['Caveat',cursive] font-bold text-slate-900" : "font-black text-white drop-shadow-md"
                                        )}
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
                                                        "font-bold leading-snug flex-1 select-text",
                                                        isSketchnote 
                                                            ? (isChecked ? "line-through opacity-75 text-slate-500 font-['Patrick_Hand',cursive]" : "text-slate-800 font-['Patrick_Hand',cursive] [&_mark]:bg-[#fef08a]")
                                                            : (isChecked ? "line-through opacity-85 text-white drop-shadow" : "text-white drop-shadow")
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
                {isSketchnote ? (
                    <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-[#fefce8] border-[2.5px] border-[#1e293b] text-[#1e293b] font-['Caveat',cursive] text-2xl font-bold shadow-[3px_3px_0_#1e293b]">
                        <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                        <span>{step.title || '📑 Konu Başlıkları'}</span>
                        <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border-2 border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-black uppercase tracking-wider shadow-sm backdrop-blur-md"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                        <span>{step.title || '📑 Konu Başlıkları'}</span>
                    </motion.div>
                )}

                {step.description && (
                    <p className={cn(
                        "text-xs sm:text-sm md:text-base font-semibold max-w-3xl text-center mt-1.5 line-clamp-1 sm:line-clamp-2",
                        isSketchnote ? "font-['Patrick_Hand',cursive] text-slate-700 text-base" : "text-slate-600 dark:text-slate-300"
                    )}>
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
                                        "group relative flex flex-col justify-between rounded-t-[32px] rounded-b-2xl border-4 border-b-[10px] md:border-b-[14px] transition-all duration-200 cursor-pointer overflow-hidden hover:scale-105 active:scale-95 active:border-b-4",
                                        isMultiRow ? "p-4 sm:p-5" : "p-6 sm:p-7",
                                        getCardWidthClass()
                                    )}
                                    style={{
                                        background: game3dTheme.bg,
                                        borderColor: game3dTheme.border,
                                        borderBottomColor: game3dTheme.borderDark,
                                        boxShadow: `0 12px 25px rgba(0,0,0,0.7), 0 0 25px ${game3dTheme.glow}, inset 0 2px 4px rgba(255,255,255,0.35)`,
                                    }}
                                >
                                    {/* 3D Üst Kemer ve Madalya Rozeti */}
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

                                    {/* Orta: 3D Kabartmalı Başlık */}
                                    <div className="my-3 flex-1 flex flex-col justify-center">
                                        <h3
                                            className={cn(
                                                "font-black text-white text-left leading-snug tracking-wide filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:text-amber-200 transition-colors",
                                                getTitleFontSize()
                                            )}
                                        >
                                            {title}
                                        </h3>
                                    </div>

                                    {/* Alt: 3D Başla Buton Şeridi */}
                                    <div className="w-full flex items-center justify-between mt-auto pt-2 border-t border-white/20">
                                        <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-amber-400" />
                                            <span>Derse Katıl</span>
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
                                        : cn(
                                            "rounded-2xl sm:rounded-3xl border-[2.5px] sm:border-[3px] border-slate-950 dark:border-white/30 bg-white dark:bg-slate-900",
                                            isMultiRow 
                                                ? "shadow-[5px_5px_0px_#2563eb] sm:shadow-[6px_6px_0px_#2563eb] dark:shadow-[6px_6px_0px_#3b82f6]" 
                                                : "shadow-[6px_6px_0px_#2563eb] sm:shadow-[8px_8px_0px_#2563eb] lg:shadow-[10px_10px_0px_#2563eb] dark:shadow-[8px_8px_0px_#3b82f6]",
                                            "hover:shadow-[10px_10px_0px_#1d4ed8] sm:hover:shadow-[14px_14px_0px_#1d4ed8] hover:-translate-y-1.5 hover:-translate-x-1",
                                            "active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_#2563eb]"
                                        ),
                                    isMultiRow ? "p-4 sm:p-5 md:p-6" : "p-6 sm:p-8 md:p-9",
                                    getCardWidthClass()
                                )}
                            >
                                {/* Sol Üst: Numaralandırma & Sağ Üst: Yönlendirme İkonu */}
                                <div className="flex items-start justify-between w-full shrink-0">
                                    <span className={cn(
                                        "leading-none select-none tracking-tight",
                                        isSketchnote 
                                            ? cn("font-['Caveat',cursive] font-bold text-3xl sm:text-4xl", sketchnoteTheme.num) 
                                            : cn("font-extrabold text-blue-600 dark:text-blue-400", getNumberFontSize())
                                    )}>
                                        {itemNum}
                                    </span>

                                    <div className={cn(
                                        "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl",
                                        isSketchnote ? "bg-black/10 text-slate-800" : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                                    )}>
                                        <ArrowRight className={cn(isMultiRow ? "w-4 h-4" : "w-5 h-5")} />
                                    </div>
                                </div>

                                {/* Orta: Başlık Metni - Rahat satır aralığı (leading-normal / 1.4) ile alt satıra düşüşlerde tertemiz okuma */}
                                <div className="my-2 sm:my-3.5 flex-1 flex flex-col justify-start">
                                    <h3 className={cn(
                                        "leading-[1.35] sm:leading-[1.45] tracking-normal break-words text-left transition-colors",
                                        isSketchnote 
                                            ? "font-['Caveat',cursive] font-bold text-2xl sm:text-3xl text-slate-900 group-hover:text-blue-700" 
                                            : cn("font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300", getTitleFontSize())
                                    )}>
                                        {title}
                                    </h3>
                                </div>

                                {/* Sağ Alt: Vurgu Noktası (Referans Görseldeki Birebir Detay) */}
                                <div className="w-full flex justify-end mt-auto pt-2 shrink-0">
                                    <div className={cn(
                                        "rounded-full border-[2px] shrink-0 group-hover:scale-125 transition-transform shadow-xs",
                                        isSketchnote ? cn(sketchnoteTheme.dot, "border-black/20") : "bg-blue-600 dark:bg-blue-400 border-slate-950 dark:border-white",
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
