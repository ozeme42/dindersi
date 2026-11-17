'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquare, Sparkles, Lightbulb, CheckCircle2, 
    Timer, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, 
    Eye, EyeOff, BookOpen, PenLine, Award, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    isFullscreen,
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
    const questions: OpenEndedQuestionItem[] = Array.isArray(step.questions) && step.questions.length > 0
        ? step.questions
        : [
            {
                question: 'Bu konuyla ilgili sizce en kritik ders veya mesaj nedir? Açıklayınız.',
                hint: 'Konunun günlük hayatımıza bakan yönünü ve ahlaki sonuçlarını düşünün.',
                modelAnswer: 'Bu ders bize sorumluluk bilincini, adaletli davranmayı ve çevremizle uyum içinde yaşamayı öğretir.',
                keywords: ['Sorumluluk', 'Adalet', 'Ahlak']
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
                // Cevap ilk kez açıldığında minik konfeti
                import('canvas-confetti').then(m => {
                    m.default({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
                }).catch(() => {});
            }
            return { ...prev, [idx]: nextState };
        });
    };

    const handleNext = () => {
        if (activeIdx < questions.length - 1) {
            playSound('pop');
            setActiveIdx(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (activeIdx > 0) {
            playSound('pop');
            setActiveIdx(prev => prev - 1);
        }
    };

    const formatTimer = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Dinamik font boyutlandırma (Akıllı Tahta için dev puntolar)
    const qLen = activeQuestion?.question?.length || 0;
    const getQuestionTextSize = () => {
        if (qLen < 60) return "text-2xl sm:text-4xl md:text-5xl lg:text-6xl";
        if (qLen < 120) return "text-xl sm:text-3xl md:text-4xl lg:text-5xl";
        return "text-lg sm:text-2xl md:text-3xl lg:text-4xl";
    };

    const getDiffBadge = (diff?: string, idx?: number) => {
        const d = diff || (idx === 0 ? 'kolay' : idx === 1 ? 'orta' : 'zor');
        if (d === 'kolay') {
            return {
                label: '🟢 Kolay',
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
            label: '🟡 Orta',
            short: 'Orta',
            bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
    };

    return (
        <div className={cn(
            "w-full h-full max-h-full flex flex-col items-center justify-between select-none mx-auto overflow-hidden",
            isTeacher ? "max-w-7xl px-3 sm:px-6 py-2 sm:py-3" : "max-w-5xl px-3 py-2",
            isFullscreen && "py-3 sm:py-5"
        )}>
            {/* ══ ÜST PANEL: ROZET VE SORU SEKMELERİ ══ */}
            <div className="w-full shrink-0 flex flex-wrap items-center justify-between gap-3 mb-2 sm:mb-4">
                {/* Sol: Başlık / Rozet */}
                <div className={cn(
                    "inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm sm:text-base md:text-lg font-black uppercase tracking-wider backdrop-blur-xl",
                    isSketchnote
                        ? "bg-[#fde047] text-[#1e293b] border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-['Caveat',cursive] text-xl sm:text-2xl normal-case"
                        : "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-purple-500/20 border border-amber-400/40 text-amber-300 shadow-md"
                )}>
                    <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                    <span>{step.title || '💭 Düşün, Tartış, Keşfet!'}</span>
                    <span className="text-xs sm:text-sm px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/30 font-bold">
                        {questions.length} Soru
                    </span>
                </div>

                {/* Sağ: Soru Sekmeleri (1. Soru, 2. Soru, 3. Soru - Büyük Butonlar) */}
                <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 shadow-lg">
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
                                    "flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base md:text-lg font-black transition-all cursor-pointer",
                                    isActive
                                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 scale-105"
                                        : "text-slate-300 hover:text-white hover:bg-white/10",
                                    hasOpenedAnswer && !isActive && "text-emerald-400"
                                )}
                            >
                                <span>{idx + 1}. Soru</span>
                                <span className={cn(
                                    "text-xs sm:text-sm px-2 py-0.5 rounded-md font-bold border",
                                    isActive ? "bg-black/30 text-white border-white/20" : badgeInfo.bg
                                )}>
                                    {badgeInfo.short}
                                </span>
                                {hasOpenedAnswer && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ══ ORTA ALAN: AKTİF SORU KARTI (ANİMASYONLU) ══ */}
            <div className="relative w-full flex-1 min-h-0 flex flex-col overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIdx}
                        initial={{ opacity: 0, x: 25 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -25 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                            "w-full h-full flex flex-col justify-between rounded-3xl p-4 sm:p-6 md:p-8 overflow-y-auto border-2 shadow-2xl backdrop-blur-xl scrollbar-thin scrollbar-thumb-white/20",
                            isSketchnote
                                ? "bg-[#fefce8] border-[3px] border-[#1e293b] shadow-[5px_5px_0_#1e293b] text-[#1e293b]"
                                : "bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-900/95 border-amber-500/30 text-white"
                        )}
                    >
                        {/* Kart Üst Başlık & Zamanlayıcı Çubuğu */}
                        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                                <span className={cn(
                                    "flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl font-black text-base sm:text-xl",
                                    isSketchnote 
                                        ? "bg-[#fde047] text-[#1e293b] border-2 border-[#1e293b]" 
                                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                )}>
                                    {activeIdx + 1}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-xs sm:text-base font-black px-3 py-1 rounded-full border shadow-sm",
                                        getDiffBadge(activeQuestion.difficulty, activeIdx).bg
                                    )}>
                                        {getDiffBadge(activeQuestion.difficulty, activeIdx).label}
                                    </span>
                                    <span className="text-xs sm:text-base font-semibold text-slate-300 hidden sm:inline">
                                        • Açık Uçlu Soru & Düşünme
                                    </span>
                                </div>
                            </div>

                            {/* ⏱️ Tartışma Sayacı */}
                            <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-white/10 shadow-inner">
                                <Timer className={cn(
                                    "w-5 h-5",
                                    isTimerRunning ? "text-amber-400 animate-spin" : timeLeft === 0 ? "text-rose-400" : "text-slate-400"
                                )} />
                                <span className={cn(
                                    "font-mono font-black text-base sm:text-xl md:text-2xl",
                                    timeLeft === 0 ? "text-rose-400 animate-pulse" : isTimerRunning ? "text-amber-300" : "text-slate-300"
                                )}>
                                    {formatTimer(timeLeft)}
                                </span>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        playSound('pop');
                                        setIsTimerRunning(!isTimerRunning);
                                    }}
                                    className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl text-slate-300 hover:text-white hover:bg-white/10"
                                    title={isTimerRunning ? "Duraklat" : "Tartışma Sayacını Başlat"}
                                >
                                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        playSound('pop');
                                        setIsTimerRunning(false);
                                        setTimeLeft(defaultDuration);
                                    }}
                                    className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
                                    title="Sayacı Sıfırla"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* ══ SORU METNİ (BÜYÜK & MERKEZİ AKILLI TAHTA) ══ */}
                        <div className="my-auto py-6 text-center space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs sm:text-base font-black mb-1">
                                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Sınıfça Düşünelim & Fikir Yürütelim</span>
                            </div>
                            <h2 className={cn(
                                "font-black leading-snug sm:leading-relaxed tracking-tight text-balance px-2 sm:px-6",
                                getQuestionTextSize(),
                                isSketchnote ? "font-['Caveat',cursive] text-3xl sm:text-4xl md:text-5xl text-[#0f172a]" : "text-white drop-shadow-md"
                            )}>
                                "{activeQuestion.question}"
                            </h2>
                        </div>

                        {/* ══ AÇILIR BÖLÜMLER: İPUCU & MODEL CEVAP & ÖĞRENCİ NOTU ══ */}
                        <div className="shrink-0 space-y-3 pt-2">
                            {/* İpucu Kartı (Açılmışsa) */}
                            {showHint[activeIdx] && activeQuestion.hint && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: 10, height: 0 }}
                                    className="p-4 sm:p-5 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-sm sm:text-lg md:text-xl flex items-start gap-3 shadow-xl"
                                >
                                    <span className="p-1.5 bg-amber-500/20 rounded-xl text-amber-300 shrink-0">
                                        <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </span>
                                    <div>
                                        <span className="font-black text-amber-300 block mb-1">Düşünme İpucu:</span>
                                        <p className="text-amber-100 font-medium leading-relaxed">{activeQuestion.hint}</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Model Cevap & Kilit Kavramlar (Açılmışsa) */}
                            {showAnswer[activeIdx] && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98, height: 0 }}
                                    animate={{ opacity: 1, scale: 1, height: 'auto' }}
                                    exit={{ opacity: 0, scale: 0.98, height: 0 }}
                                    className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border-2 border-emerald-500/50 text-white space-y-3.5 shadow-2xl"
                                >
                                    <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-1.5 bg-emerald-500/20 rounded-xl text-emerald-400">
                                                <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </span>
                                            <span className="text-sm sm:text-base md:text-lg font-black text-emerald-300 uppercase tracking-wider">
                                                🌟 Model Açıklama & Beklenen Cevap
                                            </span>
                                        </div>
                                        <span className="text-xs sm:text-sm font-bold text-emerald-400/90 bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/30">
                                            MEB Kazanım Odaklı
                                        </span>
                                    </div>

                                    <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-medium text-slate-100 leading-relaxed sm:leading-loose">
                                        {activeQuestion.modelAnswer || 'Bu soru, öğrencilerin konuyu içselleştirmesini ve kendi hayatlarıyla bağ kurmasını hedefler.'}
                                    </p>

                                    {/* Kilit Kavramlar Rozetleri */}
                                    {Array.isArray(activeQuestion.keywords) && activeQuestion.keywords.length > 0 && (
                                        <div className="pt-2 flex flex-wrap items-center gap-2.5">
                                            <span className="text-xs sm:text-base font-black text-amber-300 flex items-center gap-1.5">
                                                <Sparkles className="w-4 h-4" /> Cevapta Aranan Kilit Kavramlar:
                                            </span>
                                            {activeQuestion.keywords.map((kw, kwIdx) => (
                                                <span
                                                    key={kwIdx}
                                                    className="inline-flex items-center px-3.5 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs sm:text-base md:text-lg font-black shadow-md"
                                                >
                                                    ✓ {kw}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Öğrenci / Tahta Fikir Notu Alanı (İsteğe Bağlı) */}
                            {isWritingOpen && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 bg-slate-950/80 rounded-2xl border border-white/10 space-y-2.5"
                                >
                                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300 font-bold">
                                        <span className="flex items-center gap-2 text-cyan-300">
                                            <PenLine className="w-4 h-4" /> Tahta Notu / Sınıfın Fikri:
                                        </span>
                                        <span className="text-xs text-slate-400">Akıllı tahta klavyesiyle yazabilirsiniz</span>
                                    </div>
                                    <textarea
                                        value={studentNotes[activeIdx] || ''}
                                        onChange={(e) => setStudentNotes(prev => ({ ...prev, [activeIdx]: e.target.value }))}
                                        placeholder="Sınıftan çıkan ortak fikri veya öğrencinin cevabını buraya not edin..."
                                        rows={2}
                                        className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm sm:text-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                                    />
                                </motion.div>
                            )}

                            {/* ══ ALT ETKİLEŞİM BUTONLARI (AKILLI TAHTA DEV BUTONLAR) ══ */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {/* İpucu Butonu */}
                                    {activeQuestion.hint && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => toggleHint(activeIdx)}
                                            className={cn(
                                                "rounded-2xl text-xs sm:text-base font-black gap-2 h-11 sm:h-13 px-4 sm:px-5 cursor-pointer shadow-lg transition-all",
                                                showHint[activeIdx]
                                                    ? "bg-amber-600 text-white"
                                                    : "bg-amber-950/60 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60"
                                            )}
                                        >
                                            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                                            <span>{showHint[activeIdx] ? 'İpucunu Gizle' : '💡 İpucu Ver'}</span>
                                        </Button>
                                    )}

                                    {/* Model Cevap Butonu */}
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => toggleAnswer(activeIdx)}
                                        className={cn(
                                            "rounded-2xl text-xs sm:text-base font-black gap-2 h-11 sm:h-13 px-5 sm:px-6 cursor-pointer shadow-lg transition-all",
                                            showAnswer[activeIdx]
                                                ? "bg-emerald-600 text-white"
                                                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50"
                                        )}
                                    >
                                        {showAnswer[activeIdx] ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                                        <span>{showAnswer[activeIdx] ? 'Model Cevabı Kapat' : '🌟 Model Cevabı Göster'}</span>
                                    </Button>

                                    {/* Not Alanı Butonu */}
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            playSound('pop');
                                            setIsWritingOpen(!isWritingOpen);
                                        }}
                                        className="rounded-2xl text-xs sm:text-base font-semibold gap-2 h-11 sm:h-13 px-4 text-slate-200 hover:text-white hover:bg-white/10 border border-white/15"
                                    >
                                        <PenLine className="w-4 h-4 text-cyan-400" />
                                        <span>{isWritingOpen ? 'Notu Gizle' : 'Tahtaya Yaz'}</span>
                                    </Button>
                                </div>

                                {/* Sorular Arası Geçiş Butonları */}
                                <div className="flex items-center gap-2 ml-auto">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={activeIdx === 0}
                                        onClick={handlePrev}
                                        className="h-11 sm:h-13 px-4 sm:px-5 rounded-2xl border-white/20 text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer text-xs sm:text-base font-black gap-1.5"
                                    >
                                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span>Önceki Soru</span>
                                    </Button>

                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={activeIdx === questions.length - 1}
                                        onClick={handleNext}
                                        className="h-11 sm:h-13 px-5 sm:px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-base gap-1.5 disabled:opacity-30 cursor-pointer shadow-lg"
                                    >
                                        <span>Sonraki Soru</span>
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
