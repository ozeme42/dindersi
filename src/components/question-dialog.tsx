'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { playSound, stopSound } from "@/lib/audio-service";
import type { Question } from "@/lib/types";
import { addQuestionToReviewList } from "@/app/student/tekrar-et/actions";

// UI Imports
import { Button } from '@/components/ui/button';
import { 
    CheckCircle2, Check, X, Zap, User, 
    Sparkles, MessageSquareText, Eye, EyeOff,
    Volume2, VolumeX, Maximize, Minimize, Sun, Moon, ArrowRight
} from 'lucide-react';
import { useAuth } from "@/context/auth-context";
import confetti from 'canvas-confetti';

// --- AKILLI TAHTA TOPLU SORU ÇÖZÜMÜ BİREBİR PRESETLERİ (SmartboardTopluTestPage) ---
const OPTION_STYLES = [
    {
        bg: 'bg-[#008de4]',
        hoverBg: 'hover:bg-[#007cc9]',
        shadow: 'shadow-[0_8px_0_#0069ab]',
        name: 'blue'
    },
    {
        bg: 'bg-[#d92231]',
        hoverBg: 'hover:bg-[#c41b29]',
        shadow: 'shadow-[0_8px_0_#9e121e]',
        name: 'red'
    },
    {
        bg: 'bg-[#ff7b00]',
        hoverBg: 'hover:bg-[#e66f00]',
        shadow: 'shadow-[0_8px_0_#c75e00]',
        name: 'orange'
    },
    {
        bg: 'bg-[#1ca34d]',
        hoverBg: 'hover:bg-[#189144]',
        shadow: 'shadow-[0_8px_0_#126e33]',
        name: 'green'
    },
    {
        bg: 'bg-[#8b5cf6]',
        hoverBg: 'hover:bg-[#7c3aed]',
        shadow: 'shadow-[0_8px_0_#6d28d9]',
        name: 'purple'
    }
];

export type QuestionDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    questionData: { number: number; question: any };
    onAnswer: (questionNumber: number, isCorrect: boolean, scoreChange: number) => void;
    timerDuration?: number;
    pointsConfig?: any;
    penaltyConfig?: any;
    pullStrengthConfig?: any;
    isFullscreen?: boolean;
    showCorrectAnswerOnWrong?: boolean;
    activeStudentName?: string;
};

export function QuestionDialog({
    isOpen,
    onClose,
    questionData,
    onAnswer,
    timerDuration = 0,
    pointsConfig,
    penaltyConfig,
    pullStrengthConfig,
    isFullscreen: propIsFullscreen = false,
    showCorrectAnswerOnWrong = true,
    activeStudentName
}: QuestionDialogProps) {
    const { user } = useAuth();
    const { number, question } = questionData;

    // Presentation States
    const [presenterTheme, setPresenterTheme] = useState<'light' | 'dark'>('light');
    const [userAnswer, setUserAnswer] = useState<string | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [showOpenAnswer, setShowOpenAnswer] = useState(false);
    const [timeLeft, setTimeLeft] = useState(timerDuration);
    const [isTimerRunning, setIsTimerRunning] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(propIsFullscreen);
    const [revealedResult, setRevealedResult] = useState<{ isCorrect: boolean, scoreChange: number } | null>(null);
    const [questionToReview, setQuestionToReview] = useState<Question | null>(null);
    const intervalRef = useRef<NodeJS.Timeout>();

    const questionText = question.text || question.question || question.statement || question.sentenceWithBlank || question.soru || '';

    const correctAnswer = useMemo(() => {
        if (question.correctAnswer) return String(question.correctAnswer).trim();
        if (question.type === 'Doğru/Yanlış') return question.isTrue ? 'Doğru' : 'Yanlış';
        if (question.cevap) return String(question.cevap).trim();
        return '';
    }, [question]);

    const options = useMemo(() => {
        if (question.options && question.options.length > 0) return question.options;
        if (question.secenekler) return Object.values(question.secenekler);
        if (question.type === 'Doğru/Yanlış') return ['Doğru', 'Yanlış'];
        return [];
    }, [question]);

    const isTrueFalse = question.type === 'Doğru/Yanlış' || (options.length === 2 && options.includes('Doğru') && options.includes('Yanlış'));
    const isOpenEnded = question.type === 'Açık Uçlu' || (!options || options.length === 0);

    const typeMap: { [key in Question['type'] | string]: string } = {
        'Çoktan Seçmeli': 'mcq', 'Doğru/Yanlış': 'tf', 'Boşluk Doldurma': 'fitb',
    };

    const getScoreValues = useCallback(() => {
        const typeKey = typeMap[question.type];
        const defaultPoints = 10;
        const defaultPenalty = 0;

        if (pointsConfig?.default?.points) {
            return { points: pointsConfig.default.points, penalty: penaltyConfig?.default?.penalty ?? 0, pull: 0 };
        }

        const points = pointsConfig?.[typeKey]?.[question.difficulty] ?? defaultPoints;
        const penalty = penaltyConfig?.[typeKey]?.[question.difficulty] ?? defaultPenalty;
        const pull = pullStrengthConfig?.[question.difficulty] ?? 0;

        return { points, penalty, pull };
    }, [question.type, question.difficulty, pointsConfig, penaltyConfig, pullStrengthConfig, typeMap]);

    const { points: pointsValue, penalty: penaltyValue, pull: pullStrength } = getScoreValues();

    const revealAnswer = useCallback((answerToCheck: string, isTimeout: boolean = false) => {
        if (isRevealed) return;

        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!isMuted) stopSound('timer');

        let isCorrectCheck = false;
        if (!isTimeout) {
            if (isTrueFalse) {
                const correctAnswerBool = (correctAnswer.toLowerCase() === 'doğru');
                isCorrectCheck = (answerToCheck.trim().toLowerCase() === 'doğru') === correctAnswerBool;
            } else {
                isCorrectCheck = answerToCheck.trim().toLowerCase() === correctAnswer.toLowerCase();
            }

            if (isCorrectCheck) {
                if (!isMuted) playSound('correct');
                try {
                    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
                } catch {}
            } else {
                if (!isMuted) playSound('incorrect');
            }
        } else {
            if (!isMuted) playSound('timeUp');
        }

        if (!isCorrectCheck && user?.role === 'student' && question) {
            setQuestionToReview(question as Question);
        }

        setUserAnswer(answerToCheck);
        setIsRevealed(true);

        let finalScoreChange = 0;
        if (pullStrengthConfig) {
            finalScoreChange = isCorrectCheck ? pullStrength : -pullStrength;
        } else {
            finalScoreChange = isCorrectCheck ? pointsValue : -(penaltyValue || 0);
        }

        setRevealedResult({ isCorrect: isCorrectCheck, scoreChange: finalScoreChange });

    }, [isRevealed, isTrueFalse, isMuted, question, pullStrengthConfig, pointsValue, penaltyValue, pullStrength, user, correctAnswer]);

    useEffect(() => {
        if (questionToReview && user) {
            addQuestionToReviewList(user.uid, questionToReview).catch(err => {
                console.error("Failed to add question to review list:", err);
            });
            setQuestionToReview(null);
        }
    }, [questionToReview, user]);

    useEffect(() => {
        if (isOpen) {
            setUserAnswer(null);
            setIsRevealed(false);
            setShowOpenAnswer(false);
            setTimeLeft(timerDuration);
            setIsTimerRunning(timerDuration > 0);
            setRevealedResult(null);
            setQuestionToReview(null);
        }
    }, [isOpen, questionData, timerDuration]);

    useEffect(() => {
        if (isOpen && !isRevealed && timerDuration > 0 && isTimerRunning) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current!);
                        if (!isMuted) stopSound('timer');
                        revealAnswer("", true);
                        return 0;
                    }
                    const newTime = prev - 1;
                    if (newTime <= 5 && newTime > 0 && !isMuted) {
                        playSound('timer');
                    }
                    return newTime;
                });
            }, 1000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            stopSound('timer');
        };
    }, [isOpen, isRevealed, timerDuration, isTimerRunning, isMuted, revealAnswer]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
        }
    };

    if (!isOpen) return null;

    return (
        // ─── AKILLI TAHTA TOPLU SORU ÇÖZÜMÜ BİREBİR EKRANI (TAM EKRAN, SIFIR ÇERÇEVE) ───
        <div className={cn(
            "fixed inset-0 z-[99999] flex flex-col justify-between select-none overflow-hidden font-sans transition-colors duration-200",
            presenterTheme === 'light' ? "bg-white text-slate-900" : "bg-[#0b101b] text-white"
        )}>
            {/* ─── 1. ÜST BAR: SAYAÇ & SKOR / PUAN (SmartboardTopluTestPage) ─── */}
            <header className="px-6 py-4 flex items-center justify-between z-10 shrink-0 select-none border-b border-slate-100 dark:border-white/10">
                {/* Sol Sayaç: 0:26 veya Soru Numarası */}
                <div 
                    onClick={() => timerDuration > 0 && setIsTimerRunning(r => !r)}
                    className={cn("flex items-center gap-2 group", timerDuration > 0 && "cursor-pointer")}
                    title={timerDuration > 0 ? (isTimerRunning ? "Sayacı Duraklat" : "Sayacı Başlat") : undefined}
                >
                    {timerDuration > 0 ? (
                        <>
                            <span className={cn(
                                "text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight transition-colors",
                                presenterTheme === 'light' ? "text-slate-900 group-hover:text-indigo-600" : "text-white group-hover:text-indigo-400",
                                timeLeft <= 10 && "text-rose-600 animate-pulse"
                            )}>
                                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                            </span>
                            {!isTimerRunning && (
                                <span className="text-xs px-2 py-0.5 rounded border border-amber-400 text-amber-600 font-bold hidden sm:inline-flex">
                                    Duraklatıldı
                                </span>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-2xl sm:text-4xl md:text-5xl font-black tracking-tight",
                                presenterTheme === 'light' ? "text-slate-900" : "text-white"
                            )}>
                                SORU {number}
                            </span>
                        </div>
                    )}
                </div>

                {/* Orta Bilgi (Varsa Öğrenci / Takım) */}
                {activeStudentName && (
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full border font-black text-sm sm:text-base",
                        presenterTheme === 'light' ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-white/10 border-white/15 text-white"
                    )}>
                        <User className="w-4 h-4 text-indigo-500" />
                        <span>{activeStudentName}</span>
                    </div>
                )}

                {/* Sağ Skor: ✔ +10 Puan & Kapat Butonu */}
                <div className="flex items-center gap-3 sm:gap-6">
                    <div 
                        className={cn(
                            "flex items-center gap-1.5 text-3xl sm:text-4xl md:text-5xl font-black select-none group",
                            presenterTheme === 'light' ? "text-slate-900" : "text-white"
                        )}
                        title="Soru Puanı"
                    >
                        <span className="text-emerald-600 font-black">✔</span>
                        <span>{pointsValue > 0 ? `+${pointsValue}` : '0'}</span>
                    </div>

                    {/* Çıkış / Kapat */}
                    {!isRevealed && (
                        <button
                            onClick={onClose}
                            className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer active:scale-95",
                                presenterTheme === 'light' 
                                    ? "border-slate-200 hover:border-slate-300 text-slate-500 hover:text-black bg-white hover:bg-slate-50" 
                                    : "border-white/10 hover:border-white/20 text-slate-400 hover:text-white bg-slate-900"
                            )}
                            title="Soruyu Kapat / Geri Dön"
                        >
                            <X className="w-6 h-6 stroke-[2.5]" />
                        </button>
                    )}
                </div>
            </header>

            {/* ─── 2. ANA ALAN: DEV SORU & 4 RENKLİ 3D ŞIKLAR (BİREBİR TOPLU TEST) ─── */}
            <main className="flex-1 flex flex-col justify-between items-center px-4 sm:px-8 py-2 max-w-7xl mx-auto w-full overflow-hidden">
                <div className="w-full flex-1 flex flex-col justify-between items-center max-w-6xl mx-auto py-2">
                    {/* DEV SORU METNİ - EKRANIN ODAK NOKTASI */}
                    <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-4 text-center my-auto min-h-[160px] sm:min-h-[200px]">
                        <h2 className={cn(
                            "font-black tracking-tight leading-snug select-text",
                            presenterTheme === 'light' ? "text-slate-900" : "text-white",
                            questionText.length > 140 
                                ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl" 
                                : questionText.length > 80 
                                    ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl" 
                                    : "text-3xl sm:text-5xl md:text-6xl lg:text-7xl"
                        )}>
                            {questionText}
                        </h2>

                        {/* Çözüm Açıklaması veya İpucu (Cevap açıldığında) */}
                        {isRevealed && question.explanation && (
                            <div className={cn(
                                "mt-4 px-6 py-2.5 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2",
                                presenterTheme === 'light' 
                                    ? "bg-amber-50 border-amber-300 text-amber-900 shadow-sm" 
                                    : "bg-amber-950/50 border-amber-500/40 text-amber-200"
                            )}>
                                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                                <span className="font-bold text-sm sm:text-base text-left">
                                    {question.explanation}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* SEÇENEKLER (4 RENKLİ 3D BUTONLAR VEYA AÇIK UÇLU GÖSTERGESİ) */}
                    {isOpenEnded ? (
                        /* AÇIK UÇLU GÖSTERİMİ (SmartboardTopluTestPage birebir) */
                        <div className="w-full max-w-4xl mx-auto pb-4">
                            {!showOpenAnswer ? (
                                <div className={cn(
                                    "p-8 md:p-12 rounded-3xl border-3 border-dashed flex flex-col items-center justify-center text-center gap-4 transition-all",
                                    presenterTheme === 'light' 
                                        ? "bg-slate-50 border-slate-300 text-slate-800" 
                                        : "bg-slate-900/60 border-slate-700 text-slate-200"
                                )}>
                                    <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                                        <MessageSquareText className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-amber-600">
                                        Açık Uçlu Soru
                                    </h3>
                                    <p className={cn(
                                        "max-w-xl text-lg md:text-xl font-bold leading-relaxed",
                                        presenterTheme === 'light' ? "text-slate-700" : "text-slate-300"
                                    )}>
                                        ✏️ Bu sorunun cevabını sözlü veya defterinize yanıtladıktan sonra model cevabı tahtada açınız.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowOpenAnswer(true)}
                                        className="mt-2 rounded-xl font-black border-2 border-amber-500/40 text-amber-700 hover:bg-amber-50 h-12 px-6 text-base"
                                    >
                                        <Eye className="w-5 h-5 mr-2" /> Model Cevabı Tahtada Aç
                                    </Button>
                                </div>
                            ) : (
                                <div className={cn(
                                    "p-8 md:p-10 rounded-3xl border-3 shadow-xl animate-in fade-in duration-200",
                                    presenterTheme === 'light' 
                                        ? "bg-emerald-50 border-emerald-400 text-slate-900" 
                                        : "bg-emerald-950/60 border-emerald-500/50 text-white"
                                )}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3 text-emerald-600">
                                            <CheckCircle2 className="w-8 h-8" />
                                            <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider">
                                                Model Cevap & Değerlendirme Kriteri
                                            </h3>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowOpenAnswer(false)}
                                            className="text-slate-500 hover:text-slate-800"
                                        >
                                            <EyeOff className="w-4 h-4 mr-1" /> Gizle
                                        </Button>
                                    </div>
                                    <div className={cn(
                                        "text-xl md:text-2xl font-bold leading-relaxed whitespace-pre-line p-6 rounded-2xl border-2",
                                        presenterTheme === 'light' 
                                            ? "bg-white border-emerald-200 text-slate-900 shadow-sm" 
                                            : "bg-slate-950/80 border-emerald-500/30 text-slate-100"
                                    )}>
                                        {correctAnswer || 'Model cevap belirtilmemiş.'}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : isTrueFalse ? (
                        /* DOĞRU / YANLIŞ 2 DEV 3D BUTON (SmartboardTopluTestPage) */
                        <div className="w-full max-w-4xl mx-auto grid grid-cols-2 gap-4 sm:gap-6 pb-2">
                            {['Doğru', 'Yanlış'].map((choice, oIdx) => {
                                const isGreen = choice === 'Doğru';
                                const themeStyle = isGreen ? OPTION_STYLES[3] : OPTION_STYLES[1]; // Green : Red
                                const isCorrectChoice = isTrueFalse 
                                    ? ((correctAnswer.toLowerCase() === 'doğru') === (choice === 'Doğru'))
                                    : (choice === correctAnswer);
                                const isSelected = choice === userAnswer;

                                return (
                                    <button
                                        key={choice}
                                        onClick={() => !isRevealed && revealAnswer(choice, false)}
                                        disabled={isRevealed}
                                        className={cn(
                                            "relative flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl md:rounded-3xl cursor-pointer select-none transition-all duration-150 transform",
                                            themeStyle.bg,
                                            themeStyle.hoverBg,
                                            themeStyle.shadow,
                                            "min-h-[140px] sm:min-h-[170px] md:min-h-[200px] lg:min-h-[220px]",
                                            "hover:brightness-105 active:translate-y-1",
                                            isRevealed && isCorrectChoice && "ring-8 ring-emerald-400 ring-offset-4 ring-offset-white scale-105 z-10 animate-pulse",
                                            isRevealed && isSelected && !isCorrectChoice && "ring-8 ring-rose-500 ring-offset-4 ring-offset-white scale-105 z-10",
                                            isRevealed && !isCorrectChoice && !isSelected && "opacity-35 grayscale-[35%] scale-[0.98]"
                                        )}
                                    >
                                        {/* Doğru Cevap Rozeti */}
                                        {isRevealed && isCorrectChoice && (
                                            <div className="absolute -top-3 -right-3 bg-white text-emerald-600 rounded-full p-2 shadow-2xl border-2 border-emerald-500 animate-bounce">
                                                <Check className="w-6 h-6 stroke-[4]" />
                                            </div>
                                        )}
                                        {/* Yanlış Rozeti */}
                                        {isRevealed && isSelected && !isCorrectChoice && (
                                            <div className="absolute -top-3 -right-3 bg-white text-rose-600 rounded-full p-2 shadow-2xl border-2 border-rose-500 animate-bounce">
                                                <X className="w-6 h-6 stroke-[4]" />
                                            </div>
                                        )}

                                        <span className="font-black text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl uppercase tracking-wider">
                                            {choice}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* ÇOKTAN SEÇMELİ: 4 RENKLİ 3D ŞIKLAR (SmartboardTopluTestPage BİREBİR) */
                        <div className={cn(
                            "w-full max-w-6xl mx-auto grid gap-4 sm:gap-6 pb-2",
                            (options || []).length === 4 
                                ? "grid-cols-2 md:grid-cols-4" 
                                : (options || []).length === 3 
                                    ? "grid-cols-1 sm:grid-cols-3" 
                                    : (options || []).length === 5 
                                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5" 
                                        : "grid-cols-2"
                        )}>
                            {(options || []).map((opt: any, oIdx: number) => {
                                const themeStyle = OPTION_STYLES[oIdx % OPTION_STYLES.length];
                                const isCorrectOption = String(opt).trim().toLowerCase() === correctAnswer.toLowerCase();
                                const isSelected = opt === userAnswer;

                                return (
                                    <button
                                        key={oIdx}
                                        onClick={() => !isRevealed && revealAnswer(opt, false)}
                                        disabled={isRevealed}
                                        className={cn(
                                            "relative flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl md:rounded-3xl cursor-pointer select-none transition-all duration-150 transform",
                                            themeStyle.bg,
                                            themeStyle.hoverBg,
                                            themeStyle.shadow,
                                            "min-h-[140px] sm:min-h-[170px] md:min-h-[200px] lg:min-h-[220px]",
                                            "hover:brightness-105 active:translate-y-1",
                                            isRevealed && isCorrectOption && "ring-8 ring-emerald-400 ring-offset-4 ring-offset-white scale-105 z-10 animate-pulse",
                                            isRevealed && isSelected && !isCorrectOption && "ring-8 ring-rose-500 ring-offset-4 ring-offset-white scale-105 z-10",
                                            isRevealed && !isCorrectOption && !isSelected && "opacity-35 grayscale-[35%] scale-[0.98]"
                                        )}
                                    >
                                        {/* Doğru Cevap Rozeti */}
                                        {isRevealed && isCorrectOption && (
                                            <div className="absolute -top-3 -right-3 bg-white text-emerald-600 rounded-full p-2 shadow-2xl border-2 border-emerald-500 animate-bounce">
                                                <Check className="w-6 h-6 stroke-[4]" />
                                            </div>
                                        )}

                                        {/* Yanlış Rozeti */}
                                        {isRevealed && isSelected && !isCorrectOption && (
                                            <div className="absolute -top-3 -right-3 bg-white text-rose-600 rounded-full p-2 shadow-2xl border-2 border-rose-500 animate-bounce">
                                                <X className="w-6 h-6 stroke-[4]" />
                                            </div>
                                        )}

                                        <span className={cn(
                                            "font-black text-white leading-snug break-words hyphens-auto w-full",
                                            String(opt).length > 30 
                                                ? "text-lg sm:text-xl md:text-2xl" 
                                                : String(opt).length > 15 
                                                    ? "text-xl sm:text-2xl md:text-3xl" 
                                                    : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
                                        )}>
                                            {opt}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* ─── 3. ALT KONTROL & GEZİNTİ BARI (SmartboardTopluTestPage) ─── */}
            <footer className={cn(
                "px-6 py-4 flex items-center justify-between z-10 shrink-0 select-none border-t",
                presenterTheme === 'light' ? "border-slate-200 bg-white" : "border-slate-800 bg-[#0b101b]"
            )}>
                {/* Sol: Tema Değiştirici (Güneş / Ay) */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setPresenterTheme(presenterTheme === 'light' ? 'dark' : 'light')}
                        className={cn(
                            "w-12 h-12 md:w-14 md:h-14 rounded-2xl border-2 flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer",
                            presenterTheme === 'light'
                                ? "bg-white border-slate-300 hover:border-slate-400 text-slate-800 hover:bg-slate-50"
                                : "bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
                        )}
                        title={presenterTheme === 'light' ? "Koyu Gece Teması" : "Beyaz Tahta Teması"}
                    >
                        {presenterTheme === 'light' ? <Moon className="w-6 h-6 text-purple-600 shrink-0" /> : <Sun className="w-6 h-6 text-amber-500 shrink-0" />}
                    </button>
                </div>

                {/* Orta: Soru Numarası VEYA Devam Et Butonu */}
                <div className="flex items-center gap-4">
                    {isRevealed ? (
                        <Button
                            onClick={() => {
                                if (revealedResult) {
                                    onAnswer(number, revealedResult.isCorrect, revealedResult.scoreChange);
                                    onClose();
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl px-8 sm:px-12 h-12 sm:h-14 shadow-lg shadow-indigo-500/25 text-lg sm:text-xl active:scale-95 cursor-pointer flex items-center gap-2 animate-in zoom-in-95 duration-200"
                        >
                            <span>Devam Et</span>
                            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Button>
                    ) : (
                        <div className={cn(
                            "text-2xl sm:text-3xl md:text-4xl font-black tracking-wider select-none",
                            presenterTheme === 'light' ? "text-slate-800" : "text-white"
                        )}>
                            SORU {number}
                        </div>
                    )}
                </div>

                {/* Sağ Butonlar: Ses & Tam Ekran (SmartboardTopluTestPage) */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={cn(
                            "p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer",
                            presenterTheme === 'light' 
                                ? "text-slate-700 hover:text-black hover:bg-slate-100" 
                                : "text-slate-300 hover:text-white hover:bg-slate-800"
                        )}
                        title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
                    >
                        {isMuted ? <VolumeX className="w-7 h-7 md:w-8 md:h-8" /> : <Volume2 className="w-7 h-7 md:w-8 md:h-8" />}
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className={cn(
                            "p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer",
                            presenterTheme === 'light' 
                                ? "text-slate-700 hover:text-black hover:bg-slate-100" 
                                : "text-slate-300 hover:text-white hover:bg-slate-800"
                        )}
                        title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
                    >
                        {isFullscreen ? <Minimize className="w-7 h-7 md:w-8 md:h-8" /> : <Maximize className="w-7 h-7 md:w-8 md:h-8" />}
                    </button>
                </div>
            </footer>
        </div>
    );
}