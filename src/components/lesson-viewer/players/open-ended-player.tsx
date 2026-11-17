'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Lightbulb, CheckCircle2, 
    Timer, Play, Pause, RotateCcw, 
    Eye, EyeOff, Trophy, Maximize2, Minimize2, Award, 
    HelpCircle, X, Check, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import type { OpenEndedQuestionsStep, OpenEndedQuestionItem } from '@/lib/types';
import { useAuth } from '@/context/auth-context';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

// 🎨 3 Soru İçin Özel 3D Arcade Kart Temaları
const QUESTION_CARD_THEMES = [
    {
        container: 'bg-slate-900/75 border-4 border-emerald-400 border-b-[8px] border-b-emerald-600 shadow-[0_8px_25px_rgba(16,185,129,0.25)]',
        header: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_3px_0_#065f46]',
        badge: 'bg-emerald-300 text-slate-950 border border-emerald-200 font-black',
        label: '1. Soru • Kolay',
        hintBox: 'bg-amber-500/15 border-2 border-amber-400/50 text-amber-200',
        answerBox: 'bg-emerald-500/20 border-2 border-emerald-400/60 text-emerald-100',
        activeGlow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'
    },
    {
        container: 'bg-slate-900/75 border-4 border-amber-400 border-b-[8px] border-b-amber-600 shadow-[0_8px_25px_rgba(245,158,11,0.25)]',
        header: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-[0_3px_0_#b45309]',
        badge: 'bg-amber-300 text-slate-950 border border-amber-200 font-black',
        label: '2. Soru • Orta',
        hintBox: 'bg-amber-500/15 border-2 border-amber-400/50 text-amber-200',
        answerBox: 'bg-amber-500/20 border-2 border-amber-400/60 text-amber-100',
        activeGlow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]'
    },
    {
        container: 'bg-slate-900/75 border-4 border-rose-400 border-b-[8px] border-b-rose-600 shadow-[0_8px_25px_rgba(244,63,94,0.25)]',
        header: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-[0_3px_0_#9f1239]',
        badge: 'bg-rose-300 text-slate-950 border border-rose-200 font-black',
        label: '3. Soru • Biraz Zor',
        hintBox: 'bg-amber-500/15 border-2 border-amber-400/50 text-amber-200',
        answerBox: 'bg-rose-500/20 border-2 border-rose-400/60 text-rose-100',
        activeGlow: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.4)]'
    }
];

export function OpenEndedQuestionsPlayer({
    step,
    isFullscreen: propIsFullscreen,
    fontSizeScale = 'normal',
    presentationTheme = 'clean-light',
    presentationFont = 'playfair'
}: {
    step: OpenEndedQuestionsStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const containerRef = useRef<HTMLDivElement>(null);

    // Bağımsız Tam Ekran State'i
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));

    // Canlı Font Büyütme/Küçültme Seviyesi (0: Normal, 1: Büyük, 2: Çok Büyük, 3: Dev Tahta)
    const initialLevel = fontSizeScale === 'huge' || fontSizeScale === 'xl' ? 3 :
                         fontSizeScale === 'lg' ? 2 : 1;
    const [fontLevel, setFontLevel] = useState<number>(initialLevel);

    useEffect(() => {
        if (typeof propIsFullscreen === 'boolean') {
            setIsFullscreen(propIsFullscreen);
        }
    }, [propIsFullscreen]);

    // Tarayıcı Tam Ekran Toggle
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

    // Sorular (En az 3 soru garantisi)
    const questions: OpenEndedQuestionItem[] = useMemo(() => {
        if (Array.isArray(step.questions) && step.questions.length > 0) {
            return step.questions;
        }
        return [
            {
                question: 'Bu konuyla ilgili sizce en kritik ders veya temel mesaj nedir? Günlük hayatla bağdaştırınız.',
                hint: 'Konunun günlük yaşamımıza bakan ahlaki ve insani yönünü düşünün.',
                modelAnswer: 'Bu ders bize sorumluluk bilincini, adaletli davranmayı ve çevremizle uyum içinde yaşamayı öğretir.',
                keywords: ['Sorumluluk', 'Ahlak', 'İbadet'],
                difficulty: 'kolay'
            },
            {
                question: 'Konuda geçen kavramların toplum hayatına ve insan ilişkilerine sağladığı faydalar nelerdir?',
                hint: 'Birliktelik, yardımlaşma, güven ve toplumsal dayanışma ilkelerini hatırlayın.',
                modelAnswer: 'İnsanlar arasındaki güven bağını güçlendirir, haksızlıkları önler ve huzurlu bir toplum ortamı sağlar.',
                keywords: ['Toplum', 'Birlik', 'Huzur'],
                difficulty: 'orta'
            },
            {
                question: 'Bir kimse bu ilkeleri hayatına uygulamazsa ne gibi bireysel veya toplumsal sorunlar yaşanabilir?',
                hint: 'Güvensizlik, adaletsizlik ve manevi huzursuzluk gibi sonuçları değerlendirin.',
                modelAnswer: 'Bireysel düzeyde manevi boşluk ve huzursuzluk; toplumsal düzeyde ise güven bunalımı ve çözülme yaşanır.',
                keywords: ['Muhasebe', 'Adalet', 'Sonuç'],
                difficulty: 'zor'
            }
        ];
    }, [step.questions]);

    // Her soru için ayrı açık/kapalı state'leri
    const [showHints, setShowHints] = useState<{ [idx: number]: boolean }>({});
    const [showAnswers, setShowAnswers] = useState<{ [idx: number]: boolean }>({});

    // Timer State
    const defaultDuration = step.timerSeconds && step.timerSeconds > 0 ? step.timerSeconds : 90;
    const [timeLeft, setTimeLeft] = useState(defaultDuration);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsTimerRunning(false);
                        playSound('win');
                        import('canvas-confetti').then(m => {
                            m.default({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
                        }).catch(() => {});
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning, timeLeft]);

    const toggleHint = (idx: number) => {
        playSound('pop');
        setShowHints(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const toggleAnswer = (idx: number) => {
        playSound('pop');
        setShowAnswers(prev => {
            const nextState = !prev[idx];
            if (nextState) {
                import('canvas-confetti').then(m => {
                    m.default({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
                }).catch(() => {});
            }
            return { ...prev, [idx]: nextState };
        });
    };

    const handleTimerToggle = () => {
        playSound('pop');
        setIsTimerRunning(!isTimerRunning);
    };

    const handleTimerReset = () => {
        playSound('pop');
        setIsTimerRunning(false);
        setTimeLeft(defaultDuration);
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Tüm İpuçlarını Aç/Kapat
    const toggleAllHints = () => {
        playSound('pop');
        const anyClosed = questions.some((_, i) => !showHints[i]);
        const newState: { [k: number]: boolean } = {};
        questions.forEach((_, i) => { newState[i] = anyClosed; });
        setShowHints(newState);
    };

    // Tüm Çözümleri Aç/Kapat
    const toggleAllAnswers = () => {
        playSound('pop');
        const anyClosed = questions.some((_, i) => !showAnswers[i]);
        const newState: { [k: number]: boolean } = {};
        questions.forEach((_, i) => { newState[i] = anyClosed; });
        setShowAnswers(newState);
        if (anyClosed) {
            import('canvas-confetti').then(m => {
                m.default({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
            }).catch(() => {});
        }
    };

    // Grid kolon sayısı
    const gridColsClass = useMemo(() => {
        if (questions.length === 1) return "grid-cols-1 max-w-4xl mx-auto";
        if (questions.length === 2) return "grid-cols-1 md:grid-cols-2";
        return "grid-cols-1 md:grid-cols-3";
    }, [questions.length]);

    // Dinamik Font Boyutu Hesaplayıcı
    const getQuestionTextClass = () => {
        switch (fontLevel) {
            case 0: return "text-sm sm:text-base md:text-lg leading-snug";
            case 1: return "text-base sm:text-lg md:text-xl lg:text-2xl leading-snug";
            case 2: return "text-lg sm:text-xl md:text-2xl lg:text-3xl leading-snug";
            case 3: return "text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-tight";
            default: return "text-base sm:text-lg md:text-xl lg:text-2xl leading-snug";
        }
    };

    const getDetailTextClass = () => {
        switch (fontLevel) {
            case 0: return "text-xs sm:text-xs";
            case 1: return "text-xs sm:text-sm";
            case 2: return "text-sm sm:text-base";
            case 3: return "text-base sm:text-lg";
            default: return "text-xs sm:text-sm";
        }
    };

    const fontLevelLabel = fontLevel === 0 ? 'Normal' :
                           fontLevel === 1 ? 'Büyük' :
                           fontLevel === 2 ? 'Çok Büyük' : 'Dev Tahta';

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative flex flex-col w-full overflow-hidden select-none transition-all duration-300 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white",
                isFullscreen 
                    ? "fixed inset-0 z-[100] p-3 sm:p-5 w-full h-full" 
                    : "w-full h-full rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl p-3 sm:p-5"
            )}
        >
            {/* Arkaplan Neon Parıltı Efektleri */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-25">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[110px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[110px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 flex flex-col w-full h-full gap-3 sm:gap-4 justify-between">
                
                {/* ══ 1. HUD / BAŞLIK KONTROL BARI (Oyunlar Sayfası Stili) ══ */}
                <div className="bg-slate-900/75 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden shrink-0">
                    {/* Altta Canlı Renkli İlerleme Çizgisi */}
                    <div className="absolute bottom-0 left-0 h-1.5 bg-slate-800 w-full">
                        <div className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 w-full" />
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        {/* Sol: İkon & Başlık */}
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                            <div className="bg-gradient-to-tr from-cyan-500/30 via-indigo-500/20 to-purple-500/30 p-2 sm:p-2.5 rounded-2xl shrink-0 border border-cyan-500/40 shadow-inner">
                                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-300" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-xl md:text-2xl font-black text-white truncate">
                                    {step.title || 'Düşün, Tartış, Keşfet!'}
                                </h1>
                                <p className="text-slate-400 text-xs md:text-sm hidden sm:block truncate">
                                    3 Kritik Soru: Sınıfça tartışın, ipuçlarını açın ve örnek çözümleri keşfedin!
                                </p>
                            </div>
                        </div>

                        {/* Sağ: Yazı Boyutu, Hızlı Toplu Eylemler, Sayaç ve Tam Ekran */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            
                            {/* 🔍 YAZI BOYUTU (A- / A+) CANLI BÜYÜTÜCÜ 🔍 */}
                            <div className="flex items-center bg-slate-950/80 px-1 py-0.5 rounded-xl border border-white/15 text-xs font-black shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => { playSound('pop'); setFontLevel(prev => Math.max(0, prev - 1)); }}
                                    disabled={fontLevel === 0}
                                    className="px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-25 cursor-pointer font-bold active:scale-95"
                                    title="Yazı Boyutunu Küçült"
                                >
                                    A-
                                </button>
                                <span className="px-1.5 sm:px-2 text-[10px] sm:text-xs text-amber-300 whitespace-nowrap font-black">
                                    {fontLevelLabel}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { playSound('pop'); setFontLevel(prev => Math.min(3, prev + 1)); }}
                                    disabled={fontLevel === 3}
                                    className="px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-25 cursor-pointer font-black active:scale-95"
                                    title="Yazı Boyutunu Büyüt (Akıllı Tahta Dev Font)"
                                >
                                    A+
                                </button>
                            </div>

                            {/* Toplu İpucu Aç/Kapat */}
                            {isTeacher && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={toggleAllHints}
                                    className="rounded-xl text-xs sm:text-sm font-bold gap-1 h-9 px-2.5 sm:px-3 text-amber-300 hover:text-white hover:bg-white/10 border border-amber-500/30 hidden lg:flex"
                                    title="Tüm İpuçlarını Aç / Gizle"
                                >
                                    <Lightbulb className="w-4 h-4 text-amber-400" />
                                    <span>Tüm İpuçları</span>
                                </Button>
                            )}

                            {/* Toplu Çözüm Aç/Kapat */}
                            {isTeacher && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={toggleAllAnswers}
                                    className="rounded-xl text-xs sm:text-sm font-bold gap-1 h-9 px-2.5 sm:px-3 text-cyan-300 hover:text-white hover:bg-white/10 border border-cyan-500/30 cursor-pointer hidden lg:flex"
                                    title="Tüm Çözümleri Aç / Gizle"
                                >
                                    <Eye className="w-4 h-4 text-cyan-400" />
                                    <span>Tüm Çözümler</span>
                                </Button>
                            )}

                            {/* Süre Sayacı */}
                            <div className={cn(
                                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black",
                                timeLeft <= 10 && timeLeft > 0
                                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse"
                                    : "bg-slate-950/60 border-white/15 text-amber-300"
                            )}>
                                <Timer className="w-4 h-4 text-amber-400" />
                                <span className="font-mono text-xs sm:text-sm">{formatTime(timeLeft)}</span>
                                <button
                                    type="button"
                                    onClick={handleTimerToggle}
                                    className="p-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer ml-1"
                                    title={isTimerRunning ? 'Duraklat' : 'Başlat'}
                                >
                                    {isTimerRunning ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleTimerReset}
                                    className="p-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                                    title="Sıfırla"
                                >
                                    <RotateCcw className="w-3 h-3 text-slate-400" />
                                </button>
                            </div>

                            {/* Kupa & Soru Sayısı */}
                            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-yellow-500/30">
                                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                                <span className="font-black text-sm sm:text-base text-yellow-400 tabular-nums">
                                    {questions.length} Soru
                                </span>
                            </div>

                            {/* ══ TAM EKRAN BUTONU ══ */}
                            <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={toggleFullscreen}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl h-9 px-3 sm:px-4 gap-1.5 text-xs sm:text-sm shadow-lg shadow-emerald-900/30 cursor-pointer"
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

                {/* ══ 2. ORTA ALAN: 3 SORUNUN YAN YANA DİZİLDİĞİ 3D ARCADE KARTLARI ══ */}
                <div className={cn(
                    "flex-1 min-h-[220px] grid gap-3 sm:gap-4 lg:gap-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 p-1 items-stretch",
                    gridColsClass
                )}>
                    {questions.map((q, idx) => {
                        const theme = QUESTION_CARD_THEMES[idx % QUESTION_CARD_THEMES.length];
                        const isHintOpen = Boolean(showHints[idx]);
                        const isAnswerOpen = Boolean(showAnswers[idx]);

                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: idx * 0.08 }}
                                className={cn(
                                    "flex flex-col rounded-3xl transition-all duration-300 overflow-hidden relative justify-between",
                                    theme.container,
                                    theme.activeGlow
                                )}
                            >
                                {/* Kart 3D Başlık Şeridi */}
                                <div className={cn(
                                    "shrink-0 flex items-center justify-between px-4 py-3 transition-all",
                                    theme.header
                                )}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base sm:text-lg">🎯</span>
                                        <h3 className="font-black text-sm sm:text-base md:text-lg lg:text-xl tracking-tight drop-shadow-md">
                                            {idx + 1}. Soru
                                        </h3>
                                    </div>
                                    <span className={cn(
                                        "text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs",
                                        theme.badge
                                    )}>
                                        {q.difficulty?.toUpperCase() || (idx === 0 ? 'KOLAY' : idx === 1 ? 'ORTA' : 'ZOR')}
                                    </span>
                                </div>

                                {/* Kart İç Gövdesi (Soru Metni & İpuçları) */}
                                <div className="flex-1 p-4 sm:p-5 md:p-6 flex flex-col justify-between gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
                                    
                                    {/* Soru Metni (Dinamik A- / A+ Font Ölçekli) */}
                                    <div className="my-auto">
                                        <h2 className={cn(
                                            "font-black tracking-tight text-white drop-shadow-md transition-all duration-200",
                                            getQuestionTextClass()
                                        )}>
                                            "{q.question}"
                                        </h2>

                                        {/* Anahtar Terimler (Hashtag'ler) */}
                                        {Array.isArray(q.keywords) && q.keywords.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-white/10">
                                                {q.keywords.map((kw, kwIdx) => (
                                                    <span
                                                        key={kwIdx}
                                                        className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-lg bg-black/30 text-amber-300 border border-amber-400/30"
                                                    >
                                                        #{kw}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Açılır İpucu ve Örnek Çözüm Kutuları */}
                                    <div className="flex flex-col gap-2 mt-2 shrink-0">
                                        {/* İpucu Paneli */}
                                        <AnimatePresence>
                                            {isHintOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className={cn(
                                                        "p-3 sm:p-4 rounded-2xl font-bold leading-relaxed shadow-md transition-all",
                                                        theme.hintBox,
                                                        getDetailTextClass()
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1.5 text-amber-300 font-black mb-1">
                                                        <Lightbulb className="w-4 h-4 text-amber-400 animate-bounce" />
                                                        <span>Düşünme İpucu:</span>
                                                    </div>
                                                    <p className="text-slate-200">
                                                        {q.hint || 'Konunun günlük hayattaki ahlaki ilkelerini düşünün.'}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Örnek Model Çözüm Paneli */}
                                        <AnimatePresence>
                                            {isAnswerOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className={cn(
                                                        "p-3 sm:p-4 rounded-2xl font-bold leading-relaxed shadow-lg transition-all",
                                                        theme.answerBox,
                                                        getDetailTextClass()
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-1 text-emerald-300 font-black mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Award className="w-4 h-4 text-emerald-400 animate-pulse" />
                                                            <span>Model Çözüm:</span>
                                                        </div>
                                                        <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                                                            Kitap & Öğretmen
                                                        </span>
                                                    </div>
                                                    <p className="text-white">
                                                        {q.modelAnswer || 'Öğrenciler kendi cümleleriyle doğru ana fikri ifade edebilir.'}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Kart 3D Aksiyon Butonları (WordButton Stili) */}
                                <div className="shrink-0 p-3 sm:p-4 bg-slate-950/60 border-t border-white/10 flex items-center justify-between gap-2">
                                    {/* İpucu Butonu */}
                                    <button
                                        type="button"
                                        onClick={() => toggleHint(idx)}
                                        className={cn(
                                            "flex-1 py-2 sm:py-2.5 px-2 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all border-b-[5px] active:border-b-0 active:translate-y-1 outline-none cursor-pointer flex items-center justify-center gap-1.5 shadow-md",
                                            isHintOpen
                                                ? "bg-amber-400 border-amber-600 text-slate-950"
                                                : "bg-slate-900 border-slate-700 text-amber-300 hover:text-white hover:bg-slate-800"
                                        )}
                                    >
                                        <Lightbulb className="w-4 h-4 text-amber-400" />
                                        <span>{isHintOpen ? 'İpucu Kapat' : 'İpucu Aç'}</span>
                                    </button>

                                    {/* Çözüm Butonu */}
                                    <button
                                        type="button"
                                        onClick={() => toggleAnswer(idx)}
                                        className={cn(
                                            "flex-1 py-2 sm:py-2.5 px-2 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all border-b-[5px] active:border-b-0 active:translate-y-1 outline-none cursor-pointer flex items-center justify-center gap-1.5 shadow-md",
                                            isAnswerOpen
                                                ? "bg-emerald-500 border-emerald-700 text-white"
                                                : "bg-gradient-to-r from-emerald-600 to-teal-600 border-b-emerald-800 text-white hover:opacity-95"
                                        )}
                                    >
                                        {isAnswerOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        <span>{isAnswerOpen ? 'Çözüm Kapat' : 'Örnek Çözüm'}</span>
                                    </button>
                                </div>

                            </motion.div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}
