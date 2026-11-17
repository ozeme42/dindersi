'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Lightbulb, CheckCircle2, 
    Timer, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, 
    Eye, EyeOff, Trophy, Maximize2, Minimize2, Award, MessageSquare
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
                            m.default({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
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

    const progressPercentage = ((activeIdx + 1) / questions.length) * 100;

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative flex flex-col w-full overflow-hidden select-none transition-all duration-300 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white",
                isFullscreen 
                    ? "fixed inset-0 z-[100] p-3 sm:p-6 w-full h-full" 
                    : "w-full h-full rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl p-3 sm:p-5"
            )}
        >
            {/* Arkaplan Parıltı Efektleri (Oyunlar Sayfası Stili) */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-25">
                <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 flex flex-col w-full h-full gap-3 sm:gap-4 justify-between">
                
                {/* ══ 1. HUD / BAŞLIK KONTROL BARI (Oyunlar Sayfası Stili) ══ */}
                <div className="bg-slate-900/70 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden shrink-0">
                    {/* Altta İlerleme Çizgisi */}
                    <div className="absolute bottom-0 left-0 h-1.5 bg-slate-800 w-full">
                        <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-700" 
                            style={{ width: `${progressPercentage}%` }} 
                        />
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        {/* Sol: İkon & Başlık */}
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                            <div className="bg-cyan-500/20 p-2 sm:p-2.5 rounded-2xl shrink-0 border border-cyan-500/30">
                                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-xl md:text-2xl font-black text-white truncate">
                                    {step.title || 'Düşün, Tartış, Keşfet!'}
                                </h1>
                                <p className="text-slate-400 text-xs md:text-sm hidden sm:block truncate">
                                    Soruyu sınıfta tartışın, ipuçlarını açın ve model cevabı keşfedin!
                                </p>
                            </div>
                        </div>

                        {/* Orta: Soru Seçim Sekmeleri (WordButton Tarzı 3D Butonlar) */}
                        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/70 p-1 rounded-2xl border border-white/10">
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
                                            "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer border-b-4",
                                            isActive
                                                ? "bg-amber-400 border-amber-600 text-slate-950 shadow-md scale-105"
                                                : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                                        )}
                                    >
                                        <span>{idx + 1}. Soru</span>
                                        <span className={cn(
                                            "text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-bold border hidden sm:inline-block",
                                            isActive ? "bg-black/20 text-slate-950 border-black/10" : badgeInfo.bg
                                        )}>
                                            {badgeInfo.short}
                                        </span>
                                        {hasOpenedAnswer && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Sağ: Sayaç, Kupa ve Tam Ekran Butonları */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

                            {/* Kupa & Sayaç */}
                            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-yellow-500/30">
                                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                                <span className="font-black text-sm sm:text-base text-yellow-400 tabular-nums">
                                    {activeIdx + 1}/{questions.length}
                                </span>
                            </div>

                            {/* Tam Ekran Butonu */}
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

                {/* ══ 2. ORTA ALAN: AKTİF SORU KARTI ARENASI ══ */}
                <div className="flex-1 min-h-[180px] bg-slate-900/50 backdrop-blur-sm rounded-3xl border-4 border-dashed border-slate-700 p-5 sm:p-8 md:p-10 flex flex-col justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 gap-4 shadow-inner">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIdx}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2 }}
                            className="w-full flex-1 flex flex-col justify-center items-center text-center gap-3 sm:gap-4 my-auto"
                        >
                            {/* Rozet */}
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-xs sm:text-sm font-black px-3.5 py-1 rounded-full border shadow-xs",
                                    getDiffBadge(activeQuestion.difficulty, activeIdx).bg
                                )}>
                                    {getDiffBadge(activeQuestion.difficulty, activeIdx).label}
                                </span>
                                <span className="text-xs sm:text-sm text-slate-400 font-bold hidden sm:inline">
                                    • {activeIdx + 1}. Düşünme Sorusu
                                </span>
                            </div>

                            {/* Dev Soru Metni */}
                            <h2 className={cn(
                                "font-black leading-snug tracking-tight max-w-5xl",
                                fontSizeScale === 'huge' || fontSizeScale === 'xl' ? "text-2xl sm:text-4xl md:text-5xl lg:text-6xl" :
                                fontSizeScale === 'lg' ? "text-xl sm:text-3xl md:text-4xl lg:text-5xl" :
                                "text-lg sm:text-2xl md:text-3xl lg:text-4xl",
                                "text-white drop-shadow-lg"
                            )}>
                                {activeQuestion.question}
                            </h2>

                            {/* Anahtar Kelimeler */}
                            {Array.isArray(activeQuestion.keywords) && activeQuestion.keywords.length > 0 && (
                                <div className="flex flex-wrap items-center justify-center gap-2 mt-2 pt-3 border-t border-white/10 w-full max-w-3xl">
                                    <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5" /> Anahtar Terimler:
                                    </span>
                                    {activeQuestion.keywords.map((kw, kwIdx) => (
                                        <span
                                            key={kwIdx}
                                            className="text-xs sm:text-sm font-extrabold px-3 py-1 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/40"
                                        >
                                            #{kw}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Açılır İpucu ve Örnek Cevap Kutuları */}
                            <div className="w-full max-w-4xl flex flex-col gap-3 mt-3">
                                {showHint[activeIdx] && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-4 sm:p-5 rounded-2xl bg-amber-500/15 border-2 border-amber-400/50 text-amber-200 backdrop-blur-xl shadow-lg text-left"
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

                                {showAnswer[activeIdx] && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-4 sm:p-6 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/60 text-emerald-100 backdrop-blur-xl shadow-xl text-left"
                                    >
                                        <div className="flex items-center justify-between gap-2 font-black text-sm sm:text-base text-emerald-300 mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <Award className="w-5 h-5 text-emerald-400 animate-pulse" />
                                                <span>Öğretmen & Kitap Örnek Çözümü:</span>
                                            </div>
                                            <span className="text-xs text-emerald-300 font-bold bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                                                Model Çözüm
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-base md:text-lg font-bold leading-relaxed text-white">
                                            {activeQuestion.modelAnswer || 'Öğrenciler farklı ifadelerle konunun ana fikrini ifade edebilir.'}
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* ══ 3. ALT AKSİYON BARI (WordButton Stili 3D Butonlar) ══ */}
                <div className="shrink-0 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/10 p-3 sm:p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3">
                    {/* Sol Eylemler: İpucu ve Cevap Aç */}
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => toggleHint(activeIdx)}
                            className={cn(
                                "px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs sm:text-sm md:text-base transition-all border-b-[6px] active:border-b-0 active:translate-y-1.5 outline-none cursor-pointer flex items-center gap-2 shadow-lg",
                                showHint[activeIdx]
                                    ? "bg-amber-400 border-amber-600 text-slate-950"
                                    : "bg-slate-900 border-slate-700 text-amber-300 hover:text-white hover:bg-slate-850"
                            )}
                        >
                            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                            <span>{showHint[activeIdx] ? 'İpucunu Kapat' : 'İpucu Göster'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => toggleAnswer(activeIdx)}
                            className={cn(
                                "px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs sm:text-sm md:text-base transition-all border-b-[6px] active:border-b-0 active:translate-y-1.5 outline-none cursor-pointer flex items-center gap-2 shadow-lg",
                                showAnswer[activeIdx]
                                    ? "bg-emerald-500 border-emerald-700 text-white"
                                    : "bg-gradient-to-r from-emerald-600 to-teal-600 border-b-emerald-800 text-white hover:opacity-95"
                            )}
                        >
                            {showAnswer[activeIdx] ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                            <span>{showAnswer[activeIdx] ? 'Çözümü Gizle' : 'Örnek Çözümü Aç'}</span>
                        </button>
                    </div>

                    {/* Sağ Eylemler: Önceki & Sonraki Soru Butonları */}
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            disabled={activeIdx === 0}
                            onClick={() => {
                                playSound('pop');
                                setActiveIdx(prev => Math.max(0, prev - 1));
                            }}
                            className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm border-b-[6px] border-slate-700 bg-slate-900 text-slate-300 hover:text-white active:translate-y-1.5 active:border-b-0 disabled:opacity-30 cursor-pointer shadow-md flex items-center gap-1.5"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Önceki Soru</span>
                        </button>

                        <button
                            type="button"
                            disabled={activeIdx >= questions.length - 1}
                            onClick={() => {
                                playSound('pop');
                                setActiveIdx(prev => Math.min(questions.length - 1, prev + 1));
                            }}
                            className="px-5 py-2.5 sm:px-7 sm:py-3 rounded-2xl font-black text-xs sm:text-base bg-cyan-500 border-b-[6px] border-cyan-700 text-slate-900 hover:bg-cyan-400 active:translate-y-1.5 active:border-b-0 disabled:opacity-30 cursor-pointer shadow-lg flex items-center gap-1.5"
                        >
                            <span>Sonraki Soru</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
