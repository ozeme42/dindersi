'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { playSound, stopSound } from "@/lib/audio-service";
import type { Question } from "@/lib/types";
import { addQuestionToReviewList } from "@/app/student/tekrar-et/actions";

// UI Imports
import { Button } from '@/components/ui/button';
import { 
    CheckCircle2, Check, X, Zap, X as CloseIcon, User, 
    Sparkles, MessageSquareText, Eye, EyeOff, Timer as TimerIcon 
} from 'lucide-react';
import { useAuth } from "@/context/auth-context";
import confetti from 'canvas-confetti';

// --- AKILLI TAHTA TOPLU SORU 3D WORDWALL RENK PRESETLERİ ---
const OPTION_STYLES = [
    {
        bg: 'bg-[#008de4]',
        hoverBg: 'hover:bg-[#007cc9]',
        shadow: 'shadow-[0_6px_0_#0069ab] sm:shadow-[0_8px_0_#0069ab]',
        name: 'blue'
    },
    {
        bg: 'bg-[#d92231]',
        hoverBg: 'hover:bg-[#c41b29]',
        shadow: 'shadow-[0_6px_0_#9e121e] sm:shadow-[0_8px_0_#9e121e]',
        name: 'red'
    },
    {
        bg: 'bg-[#ff7b00]',
        hoverBg: 'hover:bg-[#e66f00]',
        shadow: 'shadow-[0_6px_0_#c75e00] sm:shadow-[0_8px_0_#c75e00]',
        name: 'orange'
    },
    {
        bg: 'bg-[#1ca34d]',
        hoverBg: 'hover:bg-[#189144]',
        shadow: 'shadow-[0_6px_0_#126e33] sm:shadow-[0_8px_0_#126e33]',
        name: 'green'
    },
    {
        bg: 'bg-[#8b5cf6]',
        hoverBg: 'hover:bg-[#7c3aed]',
        shadow: 'shadow-[0_6px_0_#6d28d9] sm:shadow-[0_8px_0_#6d28d9]',
        name: 'purple'
    }
];

// --- DAİRESEL ZAMANLAYICI ---
const CircularTimer = ({ timeLeft, totalTime }: { timeLeft: number, totalTime: number }) => {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    let colorClass = "stroke-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]";
    if (progress <= 50) colorClass = "stroke-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]";
    if (progress <= 20) colorClass = "stroke-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]";

    const isCritical = progress <= 20 && timeLeft > 0;

    return (
        <div className={cn("relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 shrink-0 transition-all duration-300", isCritical && "scale-110 animate-pulse")}>
            <svg className="w-full h-full -rotate-90 transform drop-shadow-lg" viewBox="0 0 54 54">
                <circle cx="27" cy="27" r={radius} fill="rgba(0,0,0,0.4)" className="stroke-white/10" strokeWidth="5" />
                <circle cx="27" cy="27" r={radius} fill="transparent" className={cn("transition-all duration-500 ease-out", colorClass)} strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-base sm:text-xl font-black font-mono drop-shadow-md", isCritical ? "text-rose-400" : "text-white")}>{timeLeft}</span>
            </div>
        </div>
    );
};

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
    isFullscreen = false,
    showCorrectAnswerOnWrong = true,
    activeStudentName
}: QuestionDialogProps) {
    const { user } = useAuth();
    const { number, question } = questionData;

    // State
    const [userAnswer, setUserAnswer] = useState<string | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [showOpenAnswer, setShowOpenAnswer] = useState(false);
    const [timeLeft, setTimeLeft] = useState(timerDuration);
    const [revealedResult, setRevealedResult] = useState<{ isCorrect: boolean, scoreChange: number } | null>(null);
    const [questionToReview, setQuestionToReview] = useState<Question | null>(null);
    const intervalRef = useRef<NodeJS.Timeout>();

    const questionText = question.text || question.question || question.statement || question.sentenceWithBlank || question.soru || '';

    const correctAnswer = useMemo(() => {
        if (question.correctAnswer) return question.correctAnswer;
        if (question.type === 'Doğru/Yanlış') return question.isTrue ? 'Doğru' : 'Yanlış';
        if (question.cevap) return question.cevap;
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
        stopSound('timer');

        let isCorrectCheck = false;
        if (!isTimeout) {
            if (isTrueFalse) {
                const correctAnswerBool = (String(correctAnswer).trim().toLowerCase() === 'doğru');
                isCorrectCheck = (answerToCheck.trim().toLowerCase() === 'doğru') === correctAnswerBool;
            } else {
                isCorrectCheck = answerToCheck.trim().toLowerCase() === (correctAnswer || '').trim().toLowerCase();
            }

            if (isCorrectCheck) {
                playSound('correct');
                try {
                    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
                } catch {}
            } else {
                playSound('incorrect');
            }
        } else {
            playSound('timeUp');
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

    }, [isRevealed, isTrueFalse, question, pullStrengthConfig, pointsValue, penaltyValue, pullStrength, user, correctAnswer]);

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
            setRevealedResult(null);
            setQuestionToReview(null);
        }
    }, [isOpen, questionData, timerDuration]);

    useEffect(() => {
        if (isOpen && !isRevealed && timerDuration > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current!);
                        stopSound('timer');
                        revealAnswer("", true);
                        return 0;
                    }
                    const newTime = prev - 1;
                    if (newTime <= 5 && newTime > 0) {
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
    }, [isOpen, isRevealed, timerDuration, revealAnswer]);

    const handleAnswerClick = (selectedOption: string) => {
        if (isRevealed) return;
        revealAnswer(selectedOption, false);
    };

    if (!isOpen) return null;

    // Uzun metin kontrolü: Eğer şıklardan birisi 25 karakterden uzunsa 2 sütunlu ferah düzen kullanılır
    const hasLongOption = options.some((opt: any) => String(opt).length > 25);

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 select-none">
            {/* OYUN PENCERESİ: Akıllı Tahta Toplu Soru Çözümü mimarisi */}
            <div className={cn(
                "relative flex flex-col w-full h-full max-h-[96dvh] max-w-6xl rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] border-2 border-white/10 transition-all",
                "bg-gradient-to-b from-slate-900 via-[#0b101b] to-slate-950 text-white"
            )}>
                {/* ─── 1. ÜST BAŞLIK BARI ─── */}
                <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 z-20 shrink-0 bg-slate-900/60 backdrop-blur-md border-b border-white/10">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {/* Soru Rozeti */}
                        <div className="bg-indigo-600/80 text-white text-xs sm:text-sm font-black px-3 py-1 rounded-full border border-indigo-400/40 shadow-sm flex items-center gap-1.5 uppercase tracking-wider">
                            <span>SORU {number}</span>
                        </div>

                        {/* Soru Tipi */}
                        <div className="hidden xs:flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10 text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>{question.type || (isOpenEnded ? 'Açık Uçlu' : 'Çoktan Seçmeli')}</span>
                        </div>

                        {/* Puan Rozeti */}
                        {pointsValue > 0 && !isRevealed && (
                            <div className="flex items-center gap-1 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-black">
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                <span>+{pointsValue}p</span>
                            </div>
                        )}

                        {/* Aktif Oyuncu / Takım */}
                        {activeStudentName && (
                            <div className="flex items-center gap-1.5 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30 text-purple-200 text-xs sm:text-sm font-bold">
                                <User className="w-3.5 h-3.5 text-purple-300" />
                                <span>{activeStudentName}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Zamanlayıcı */}
                        {!isRevealed && timerDuration > 0 && (
                            <CircularTimer timeLeft={timeLeft} totalTime={timerDuration} />
                        )}

                        {/* Kapat Butonu */}
                        {!isRevealed && (
                            <button 
                                onClick={onClose} 
                                className="bg-white/10 hover:bg-white/20 p-2 sm:p-2.5 rounded-full backdrop-blur-sm transition-all border border-white/10 text-slate-300 hover:text-white cursor-pointer active:scale-90"
                                title="Pencereyi Kapat"
                            >
                                <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        )}
                    </div>
                </header>

                {/* ─── 2. DEV SORU VE SEÇENEKLER ALANI ─── */}
                <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col justify-between items-center px-4 sm:px-8 py-4 sm:py-6 max-w-5xl mx-auto w-full">
                    {/* DEV SORU METNİ */}
                    <div className="flex-1 flex flex-col items-center justify-center w-full px-2 text-center my-auto min-h-[140px] sm:min-h-[180px]">
                        <h2 className={cn(
                            "font-black tracking-tight leading-snug select-text text-white drop-shadow-md text-balance",
                            questionText.length > 150 
                                ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl" 
                                : questionText.length > 80 
                                    ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl" 
                                    : "text-2xl sm:text-4xl md:text-5xl lg:text-6xl"
                        )}>
                            {questionText}
                        </h2>

                        {/* Çözüm Açıklaması veya İpucu (Cevap açıldığında) */}
                        {isRevealed && question.explanation && (
                            <div className="mt-4 px-6 py-2.5 rounded-2xl border flex items-center gap-3 bg-amber-950/60 border-amber-500/40 text-amber-200 animate-in fade-in slide-in-from-bottom-2 shadow-lg max-w-2xl">
                                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                                <span className="font-bold text-xs sm:text-sm text-left">
                                    {question.explanation}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ─── SEÇENEKLER (AKILLI TAHTA 4 RENKLİ 3D BUTONLAR) ─── */}
                    {isOpenEnded ? (
                        /* AÇIK UÇLU GÖSTERİMİ */
                        <div className="w-full max-w-3xl mx-auto py-4">
                            {!showOpenAnswer ? (
                                <div className="p-6 sm:p-10 rounded-3xl border-2 border-dashed border-amber-500/40 bg-amber-950/30 flex flex-col items-center justify-center text-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                                        <MessageSquareText className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-amber-400">
                                        Açık Uçlu Soru
                                    </h3>
                                    <p className="text-sm sm:text-base text-slate-300 max-w-md font-bold">
                                        ✏️ Sorunun cevabını sözlü olarak veya defterinize cevapladıktan sonra model cevabı açabilirsiniz.
                                    </p>
                                    <Button
                                        onClick={() => setShowOpenAnswer(true)}
                                        className="mt-2 rounded-xl font-black bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 h-12 shadow-lg"
                                    >
                                        <Eye className="w-4 h-4 mr-2" /> Model Cevabı Göster
                                    </Button>
                                </div>
                            ) : (
                                <div className="p-6 sm:p-8 rounded-3xl border-2 border-emerald-500/50 bg-emerald-950/50 text-white animate-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 text-emerald-400">
                                            <CheckCircle2 className="w-6 h-6" />
                                            <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider">
                                                Model Cevap
                                            </h3>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowOpenAnswer(false)}
                                            className="text-slate-400 hover:text-white"
                                        >
                                            <EyeOff className="w-4 h-4 mr-1" /> Gizle
                                        </Button>
                                    </div>
                                    <div className="text-base sm:text-xl font-bold leading-relaxed p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 text-emerald-100">
                                        {correctAnswer || 'Model cevap belirtilmemiş.'}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : isTrueFalse ? (
                        /* DOĞRU / YANLIŞ 2 DEV 3D BUTON */
                        <div className="w-full max-w-3xl mx-auto grid grid-cols-2 gap-4 sm:gap-6 py-2">
                            {['Doğru', 'Yanlış'].map((choice, idx) => {
                                const isGreen = choice === 'Doğru';
                                const themeStyle = isGreen ? OPTION_STYLES[3] : OPTION_STYLES[1]; // Green : Red
                                const isCorrectChoice = isTrueFalse 
                                    ? ((correctAnswer === 'Doğru') === (choice === 'Doğru'))
                                    : (choice === correctAnswer);
                                const isSelected = choice === userAnswer;

                                return (
                                    <button
                                        key={choice}
                                        type="button"
                                        onClick={() => handleAnswerClick(choice)}
                                        disabled={isRevealed}
                                        className={cn(
                                            "relative flex flex-col items-center justify-center text-center p-5 sm:p-8 rounded-2xl sm:rounded-3xl cursor-pointer select-none transition-all duration-150 transform",
                                            themeStyle.bg,
                                            themeStyle.hoverBg,
                                            themeStyle.shadow,
                                            "min-h-[120px] sm:min-h-[160px]",
                                            "hover:brightness-105 active:translate-y-1 active:shadow-none",
                                            isRevealed && isCorrectChoice && "ring-8 ring-emerald-400 ring-offset-4 ring-offset-slate-900 scale-105 z-10 animate-pulse",
                                            isRevealed && isSelected && !isCorrectChoice && "ring-8 ring-rose-500 ring-offset-4 ring-offset-slate-900 scale-105 z-10",
                                            isRevealed && !isCorrectChoice && !isSelected && "opacity-30 grayscale-[35%] scale-[0.98]"
                                        )}
                                    >
                                        {/* Doğru Rozeti */}
                                        {isRevealed && isCorrectChoice && (
                                            <div className="absolute -top-3 -right-3 bg-white text-emerald-600 rounded-full p-2 shadow-2xl border-2 border-emerald-500 animate-bounce">
                                                <Check className="w-6 h-6 sm:w-7 sm:h-7 stroke-[4]" />
                                            </div>
                                        )}
                                        {/* Yanlış Rozeti */}
                                        {isRevealed && isSelected && !isCorrectChoice && (
                                            <div className="absolute -top-3 -right-3 bg-white text-rose-600 rounded-full p-2 shadow-2xl border-2 border-rose-500 animate-bounce">
                                                <X className="w-6 h-6 sm:w-7 sm:h-7 stroke-[4]" />
                                            </div>
                                        )}

                                        <span className="font-black text-white text-2xl sm:text-4xl md:text-5xl uppercase tracking-wider drop-shadow-md">
                                            {choice}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* ÇOKTAN SEÇMELİ (4 RENKLİ 3D ŞIKLAR) */
                        <div className={cn(
                            "w-full max-w-5xl mx-auto grid gap-3 sm:gap-5 py-2",
                            hasLongOption || options.length <= 2 
                                ? "grid-cols-1 sm:grid-cols-2" 
                                : options.length === 3 
                                    ? "grid-cols-1 sm:grid-cols-3" 
                                    : "grid-cols-2 md:grid-cols-4"
                        )}>
                            {options.map((opt: any, idx: number) => {
                                const themeStyle = OPTION_STYLES[idx % OPTION_STYLES.length];
                                const isCorrectOption = String(opt).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
                                const isSelected = opt === userAnswer;

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleAnswerClick(opt)}
                                        disabled={isRevealed}
                                        className={cn(
                                            "relative flex items-center justify-center text-center p-4 sm:p-6 rounded-2xl sm:rounded-3xl cursor-pointer select-none transition-all duration-150 transform",
                                            themeStyle.bg,
                                            themeStyle.hoverBg,
                                            themeStyle.shadow,
                                            "min-h-[90px] sm:min-h-[120px] md:min-h-[150px]",
                                            "hover:brightness-105 active:translate-y-1 active:shadow-none",
                                            isRevealed && isCorrectOption && "ring-8 ring-emerald-400 ring-offset-4 ring-offset-slate-900 scale-105 z-10 animate-pulse",
                                            isRevealed && isSelected && !isCorrectOption && "ring-8 ring-rose-500 ring-offset-4 ring-offset-slate-900 scale-105 z-10",
                                            isRevealed && !isCorrectOption && !isSelected && "opacity-30 grayscale-[35%] scale-[0.98]"
                                        )}
                                    >
                                        {/* Şık Harfi (A, B, C, D) */}
                                        <span className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-black/25 text-white flex items-center justify-center font-black text-xs sm:text-base border border-white/20 shadow-inner">
                                            {String.fromCharCode(65 + idx)}
                                        </span>

                                        {/* Doğru Rozeti */}
                                        {isRevealed && isCorrectOption && (
                                            <div className="absolute -top-3 -right-3 bg-white text-emerald-600 rounded-full p-2 shadow-2xl border-2 border-emerald-500 animate-bounce">
                                                <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[4]" />
                                            </div>
                                        )}

                                        {/* Yanlış Rozeti */}
                                        {isRevealed && isSelected && !isCorrectOption && (
                                            <div className="absolute -top-3 -right-3 bg-white text-rose-600 rounded-full p-2 shadow-2xl border-2 border-rose-500 animate-bounce">
                                                <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[4]" />
                                            </div>
                                        )}

                                        <span className={cn(
                                            "font-black text-white leading-snug break-words hyphens-auto w-full pt-3 px-1",
                                            String(opt).length > 40 
                                                ? "text-sm sm:text-base md:text-lg" 
                                                : String(opt).length > 20 
                                                    ? "text-base sm:text-lg md:text-xl" 
                                                    : "text-lg sm:text-xl md:text-2xl lg:text-3xl"
                                        )}>
                                            {opt}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </main>

                {/* ─── 3. ALT SONUÇ & DEVAM ET ÇUBUĞU ─── */}
                {isRevealed && (
                    <footer className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-4 sm:px-8 py-3 sm:py-5 shrink-0 z-30 animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 max-w-5xl mx-auto w-full">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className={cn(
                                    "w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center font-black shadow-lg shrink-0",
                                    revealedResult?.isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                                )}>
                                    {revealedResult?.isCorrect ? <Check className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" /> : <X className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" />}
                                </div>
                                <div>
                                    <p className={cn("text-base sm:text-xl font-black", revealedResult?.isCorrect ? "text-emerald-400" : "text-rose-400")}>
                                        {revealedResult?.isCorrect ? "DOĞRU CEVAP! 🎉" : "YANLIŞ CEVAP!"}
                                    </p>
                                    {!revealedResult?.isCorrect && userAnswer !== "" && showCorrectAnswerOnWrong && (
                                        <p className="text-xs sm:text-sm text-slate-400 truncate max-w-sm sm:max-w-md">
                                            Doğru Cevap: <span className="text-white font-bold">{correctAnswer}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                {revealedResult && (
                                    <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-center min-w-[70px]">
                                        <span className={cn("block text-lg sm:text-xl font-black font-mono", revealedResult.scoreChange >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                            {revealedResult.scoreChange > 0 ? `+${revealedResult.scoreChange}` : revealedResult.scoreChange} P
                                        </span>
                                    </div>
                                )}

                                <Button 
                                    onClick={() => {
                                        if (revealedResult) {
                                            onAnswer(number, revealedResult.isCorrect, revealedResult.scoreChange);
                                            onClose();
                                        }
                                    }}
                                    className="flex-1 sm:flex-none h-11 sm:h-13 px-6 sm:px-10 text-base sm:text-lg font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl shadow-xl active:scale-95 transition-transform cursor-pointer"
                                >
                                    Devam Et
                                </Button>
                            </div>
                        </div>
                    </footer>
                )}
            </div>
        </div>
    );
}