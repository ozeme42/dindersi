'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquare, Sparkles, Lightbulb, CheckCircle2, 
    Timer, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, 
    Eye, EyeOff, BookOpen, PenLine, Award, Users, Maximize2, Minimize2
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
    const isSketchnote = presentationTheme === 'sketchnote';
    const containerRef = useRef<HTMLDivElement>(null);

    // Bağımsız Tam Ekran State'i
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));

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

    // Fullscreen change listener
    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const questions: OpenEndedQuestionItem[] = Array.isArray(step.questions) && step.questions.length > 0
        ? step.questions
        : [
            {
                question: 'Bu konuyla ilgili sizce en kritik ders veya mesaj nedir? Açıklayınız.',
                hint: 'Konunun günlük hayatımıza bakan yönünü ve ahlaki sonuçlarını düşünün.',
                modelAnswer: 'Bu ders bize sorumluluk bilincini, adaletli davranmayı ve çevremizle uyum içinde yaşamayı öğretir.',
                keywords: ['Sorumluluk', 'Adalet', 'Ahlak'],
                difficulty: 'orta'
            }
        ];

    const [activeIdx, setActiveIdx] = useState(0);
    const [showHint, setShowHint] = useState<{ [idx: number]: boolean }>({});
    const [showAnswer, setShowAnswer] = useState<{ [idx: number]: boolean }>({});
    const [studentNotes, setStudentNotes] = useState<{ [idx: number]: string }>({});
    const [isWritingOpen, setIsWritingOpen] = useState(false);

    // Timer State
    const defaultDuration = step.timerSeconds && step.timerSeconds > 0 ? step.timerSeconds : 60;
    const [timeLeft, setTimeLeft] = useState(defaultDuration);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Soru değiştiğinde sayacı sıfırla
    useEffect(() => {
        setTimeLeft(defaultDuration);
        setIsTimerRunning(false);
    }, [activeIdx, defaultDuration]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsTimerRunning(false);
                        playSound('win');
                        import('canvas-confetti').then(m => {
                            m.default({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
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

    const activeQuestion = questions[activeIdx] || questions[0];

    const toggleHint = (idx: number) => {
        playSound('pop');
        setShowHint(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const toggleAnswer = (idx: number) => {
        playSound('pop');
        setShowAnswer(prev => {
            const nextState = !prev[idx];
            if (nextState) {
                import('canvas-confetti').then(m => {
                    m.default({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
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

    const getDiffBadge = (diff?: string, idx?: number) => {
        const d = diff ? diff.toLowerCase() : (idx === 0 ? 'kolay' : idx === 1 ? 'orta' : 'zor');
        if (d === 'kolay') {
            return {
                label: '🟢 Kolay Soru',
                short: 'Kolay',
                bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
            };
        }
        if (d === 'zor') {
            return {
                label: '🔴 Biraz Zor',
                short: 'Biraz Zor',
                bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
            };
        }
        return {
            label: '🟡 Orta Soru',
            short: 'Orta',
            bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
    };

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative flex flex-col w-full overflow-hidden select-none transition-all duration-300",
                isFullscreen 
                    ? "fixed inset-0 z-[100] bg-slate-950 p-2 sm:p-4 md:p-6 w-full h-full" 
                    : "w-full h-full rounded-2xl md:rounded-3xl border-2 border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-xl"
            )}
        >
            {/* ══ OYUN ATÖLYESİ ÜST BAŞLIK & KONTROL ÇUBUĞU ══ */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 border-b border-white/10">
                {/* Sol: İkon & Başlık */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500/30 via-orange-500/20 to-purple-500/30 border border-amber-400/40 text-2xl shadow-inner">
                        💭
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-white text-base sm:text-lg md:text-xl tracking-wide">
                                {step.title || 'Düşün, Tartış, Keşfet!'}
                            </span>
                            <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-300 border-amber-400/40 font-black">
                                {questions.length} Soru
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-400 hidden sm:block">
                            Öğrencilerle birlikte soruyu inceleyin, fikirleri tartışın ve ipuçlarını keşfedin.
                        </p>
                    </div>
                </div>

                {/* Orta: Soru Sekmeleri (1. Soru, 2. Soru, 3. Soru) */}
                <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/80 p-1 rounded-xl sm:rounded-2xl border border-white/10">
                    {questions.map((q, idx) => {
                        const isActive = idx === activeIdx;
                        const hasOpenedAnswer = !!showAnswer[idx];
                        const badgeInfo = getDiffBadge(q.difficulty, idx);
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    playSound('pop');
                                    setActiveIdx(idx);
                                }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer",
                                    isActive
                                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 scale-105"
                                        : "text-slate-300 hover:text-white hover:bg-white/10"
                                )}
                            >
                                <span>{idx + 1}. Soru</span>
                                <span className={cn(
                                    "text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-bold border hidden sm:inline-block",
                                    isActive ? "bg-black/30 text-white border-white/20" : badgeInfo.bg
                                )}>
                                    {badgeInfo.short}
                                </span>
                                {hasOpenedAnswer && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Sağ: Sayaç & Tam Ekran */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Süre Sayacı */}
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs sm:text-sm font-black",
                        timeLeft <= 10 && timeLeft > 0
                            ? "bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse"
                            : "bg-slate-950/80 border-white/15 text-amber-300"
                    )}>
                        <Timer className="w-4 h-4 text-amber-400" />
                        <span className="font-mono text-sm sm:text-base">{formatTime(timeLeft)}</span>
                        <button
                            type="button"
                            onClick={handleTimerToggle}
                            className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer ml-1"
                            title={isTimerRunning ? 'Duraklat' : 'Başlat'}
                        >
                            {isTimerRunning ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                        <button
                            type="button"
                            onClick={handleTimerReset}
                            className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                            title="Süreyi Sıfırla"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    </div>

                    {/* ══ OYUN ATÖLYESİ TAM EKRAN BUTONU ══ */}
                    <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={toggleFullscreen}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl h-9 px-3 sm:px-4 gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-lg shadow-emerald-900/30 cursor-pointer"
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
                                <span className="hidden sm:inline">Tam Ekran Yap</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* ══ ORTA ALAN: AKTİF SORU KARTI (ANİMASYONLU) ══ */}
            <div className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-4 md:p-6 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIdx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25 }}
                        className="w-full h-full flex flex-col justify-between gap-3 sm:gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 p-1"
                    >
                        {/* 1. Soru Metni Kutusu (Akıllı Tahta Dev Tipografi) */}
                        <div className={cn(
                            "relative w-full rounded-2xl sm:rounded-3xl border-2 sm:border-3 p-5 sm:p-7 md:p-10 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center text-center transition-all",
                            isSketchnote
                                ? "bg-[#fffbeb] border-[#1e293b] text-slate-900 shadow-[6px_6px_0_#1e293b]"
                                : "bg-gradient-to-b from-slate-900/95 via-slate-850/95 to-slate-900/95 border-amber-400/40 text-white shadow-amber-950/40"
                        )}>
                            {/* Üst Rozet Satırı */}
                            <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                <span className={cn(
                                    "text-xs sm:text-sm md:text-base font-black px-3.5 py-1 rounded-full border shadow-xs",
                                    getDiffBadge(activeQuestion.difficulty, activeIdx).bg
                                )}>
                                    {getDiffBadge(activeQuestion.difficulty, activeIdx).label}
                                </span>
                                <span className="text-xs sm:text-sm text-slate-400 font-bold hidden sm:inline">
                                    • Soru {activeIdx + 1} / {questions.length}
                                </span>
                            </div>

                            {/* Dev Soru Metni */}
                            <h2 className={cn(
                                "font-black leading-snug tracking-tight max-w-5xl",
                                fontSizeScale === 'huge' || fontSizeScale === 'xl' ? "text-2xl sm:text-4xl md:text-5xl lg:text-6xl" :
                                fontSizeScale === 'lg' ? "text-xl sm:text-3xl md:text-4xl lg:text-5xl" :
                                "text-lg sm:text-2xl md:text-3xl lg:text-4xl",
                                isSketchnote ? "font-['Caveat',cursive] text-slate-900" : "text-white drop-shadow-md"
                            )}>
                                {activeQuestion.question}
                            </h2>

                            {/* Anahtar Kelimeler (Varsa) */}
                            {Array.isArray(activeQuestion.keywords) && activeQuestion.keywords.length > 0 && (
                                <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-4 border-t border-white/10 w-full max-w-3xl">
                                    <span className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5" /> Anahtar Kavramlar:
                                    </span>
                                    {activeQuestion.keywords.map((kw, kwIdx) => (
                                        <Badge
                                            key={kwIdx}
                                            variant="secondary"
                                            className="text-xs sm:text-sm md:text-base font-extrabold px-3 py-1 bg-amber-500/20 text-amber-200 border border-amber-400/40"
                                        >
                                            #{kw}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. İpucu & Model Cevap Açılır Kutuları */}
                        <div className="w-full flex flex-col gap-2.5">
                            {/* İpucu Paneli */}
                            {showHint[activeIdx] && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-2 border-amber-400/40 text-amber-200 backdrop-blur-xl shadow-lg"
                                >
                                    <div className="flex items-center gap-2 font-black text-sm sm:text-base text-amber-300 mb-1">
                                        <Lightbulb className="w-5 h-5 text-amber-400 animate-bounce" />
                                        <span>Düşünme İpucu:</span>
                                    </div>
                                    <p className="text-xs sm:text-base md:text-lg font-bold leading-relaxed text-slate-200">
                                        {activeQuestion.hint || 'Konunun temel ilkelerini ve günlük yaşamdaki karşılığını göz önünde bulundurun.'}
                                    </p>
                                </motion.div>
                            )}

                            {/* Örnek / Model Cevap Paneli */}
                            {showAnswer[activeIdx] && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border-2 border-emerald-400/50 text-emerald-100 backdrop-blur-xl shadow-xl"
                                >
                                    <div className="flex items-center justify-between gap-2 font-black text-sm sm:text-base text-emerald-300 mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <Award className="w-5 h-5 text-emerald-400 animate-pulse" />
                                            <span>Öğretmen & Kitap Örnek Cevabı:</span>
                                        </div>
                                        <span className="text-xs text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                                            Model Çözüm
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-base md:text-lg font-bold leading-relaxed text-white">
                                        {activeQuestion.modelAnswer || 'Öğrenciler farklı ifadelerle konunun ana fikrini ifade edebilir.'}
                                    </p>
                                </motion.div>
                            )}
                        </div>

                        {/* 3. Alt Eylem Butonları (İpucu Aç, Cevabı Göster, Sonraki Soru) */}
                        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/10">
                            <div className="flex items-center gap-2">
                                {/* İpucu Butonu */}
                                <Button
                                    type="button"
                                    onClick={() => toggleHint(activeIdx)}
                                    className={cn(
                                        "h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base gap-2 transition-all cursor-pointer shadow-md",
                                        showHint[activeIdx]
                                            ? "bg-amber-500 text-slate-950 shadow-[0_4px_0_#b45309]"
                                            : "bg-slate-900 hover:bg-slate-800 text-amber-300 border-2 border-amber-500/40"
                                    )}
                                >
                                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                                    <span>{showHint[activeIdx] ? 'İpucunu Kapat' : 'İpucu Göster'}</span>
                                </Button>

                                {/* Cevabı Aç / Kapat (Öğretmen Modu veya Birlikte İnceleme) */}
                                <Button
                                    type="button"
                                    onClick={() => toggleAnswer(activeIdx)}
                                    className={cn(
                                        "h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base gap-2 transition-all cursor-pointer shadow-md",
                                        showAnswer[activeIdx]
                                            ? "bg-emerald-600 text-white shadow-[0_4px_0_#065f46]"
                                            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_4px_0_#064e3b] active:translate-y-1"
                                    )}
                                >
                                    {showAnswer[activeIdx] ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    <span>{showAnswer[activeIdx] ? 'Cevabı Gizle' : 'Örnek Cevabı Aç'}</span>
                                </Button>
                            </div>

                            {/* Soru Gezinme Butonları (Önceki / Sonraki Soru) */}
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={activeIdx === 0}
                                    onClick={() => {
                                        playSound('pop');
                                        setActiveIdx(prev => Math.max(0, prev - 1));
                                    }}
                                    className="h-10 sm:h-12 px-3 sm:px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold border-white/20 text-slate-300 hover:text-white cursor-pointer disabled:opacity-30"
                                >
                                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                                    <span>Önceki Soru</span>
                                </Button>

                                <Button
                                    type="button"
                                    disabled={activeIdx >= questions.length - 1}
                                    onClick={() => {
                                        playSound('pop');
                                        setActiveIdx(prev => Math.min(questions.length - 1, prev + 1));
                                    }}
                                    className="h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-xs sm:text-base font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-[0_4px_0_#b45309] active:translate-y-1 cursor-pointer disabled:opacity-30"
                                >
                                    <span>Sonraki Soru</span>
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
                                </Button>
                            </div>
                        </div>

                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
