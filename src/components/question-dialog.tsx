'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { playSound, stopSound } from "@/lib/audio-service";
import type { Question } from "@/lib/types";
import { addQuestionToReviewList } from "@/app/student/tekrar-et/actions";

// UI Imports
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, HelpCircle, Check, X, Zap, X as CloseIcon } from 'lucide-react';
import { useAuth } from "@/context/auth-context";

// --- DAİRESEL ZAMANLAYICI ---
const CircularTimer = ({ timeLeft, totalTime }: { timeLeft: number, totalTime: number }) => {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const progress = (timeLeft / totalTime) * 100;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    let colorClass = "stroke-white shadow-[0_0_15px_rgba(255,255,255,0.5)]";
    if (progress <= 50) colorClass = "stroke-amber-300 shadow-[0_0_15px_rgba(252,211,77,0.5)]";
    if (progress <= 20) colorClass = "stroke-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.5)]";

    const isCritical = progress <= 20 && timeLeft > 0;

    return (
        <div className={cn("relative flex items-center justify-center w-14 h-14 shrink-0 transition-all duration-300", isCritical && "scale-110 animate-pulse")}>
            <svg className="w-full h-full -rotate-90 transform drop-shadow-lg" viewBox="0 0 54 54">
                <circle cx="27" cy="27" r={radius} fill="rgba(0,0,0,0.3)" className="stroke-white/10" strokeWidth="6" />
                <circle cx="27" cy="27" r={radius} fill="transparent" className={cn("transition-all duration-500 ease-out", colorClass)} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-xl font-black font-mono drop-shadow-md text-white")}>{timeLeft}</span>
            </div>
        </div>
    );
};

// --- TİP TANIMLARI ---
type GameQuestion = Partial<Question> & {
    id: string;
    text?: string;
    type: 'Çoktan Seçmeli' | 'Doğru/Yanlış' | 'Boşluk Doldurma';
    difficulty: 'Kolay' | 'Orta' | 'Zor';
    question?: string;
    statement?: string;
    isTrue?: boolean;
    sentenceWithBlank?: string;
    soru?: string;
    secenekler?: Record<string, string>;
    cevap?: string;
};

export type QuestionDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    questionData: { number: number; question: GameQuestion };
    onAnswer: (questionNumber: number, isCorrect: boolean, scoreChange: number) => void;
    timerDuration?: number;
    pointsConfig?: any;
    penaltyConfig?: any;
    pullStrengthConfig?: any;
    isFullscreen: boolean;
    showCorrectAnswerOnWrong?: boolean;
};

// --- ANA BİLEŞEN ---
export function QuestionDialog({
    isOpen,
    onClose,
    questionData,
    onAnswer,
    timerDuration = 0,
    pointsConfig,
    penaltyConfig,
    pullStrengthConfig,
    isFullscreen,
    showCorrectAnswerOnWrong = true
}: QuestionDialogProps) {
    const { user } = useAuth();
    const { number, question } = questionData;

    // State
    const [userAnswer, setUserAnswer] = useState<string | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);
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
            if (question.type === 'Doğru/Yanlış') {
                const correctAnswerBool = (correctAnswer === 'Doğru');
                isCorrectCheck = (answerToCheck === 'Doğru') === correctAnswerBool;
            } else {
                isCorrectCheck = answerToCheck.trim().toLowerCase() === (correctAnswer || '').trim().toLowerCase();
            }
            playSound(isCorrectCheck ? 'correct' : 'incorrect');
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

    }, [isRevealed, question, pullStrengthConfig, pointsValue, penaltyValue, pullStrength, user, correctAnswer]);

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

    const optionColors = [
        { base: "bg-cyan-500", border: "border-cyan-400", lightBg: "bg-cyan-950/40", letterBg: "bg-cyan-400 text-cyan-950" },
        { base: "bg-violet-500", border: "border-violet-400", lightBg: "bg-violet-950/40", letterBg: "bg-violet-400 text-violet-950" },
        { base: "bg-orange-500", border: "border-orange-400", lightBg: "bg-orange-950/40", letterBg: "bg-orange-400 text-orange-950" },
        { base: "bg-pink-500", border: "border-pink-400", lightBg: "bg-pink-950/40", letterBg: "bg-pink-400 text-pink-950" }
    ];

    if (!isOpen) return null;

    return (
        // DIŞ KAPSAYICI: Padding (p-4 md:p-8) sayesinde tam ekranda bile kenarlara yapışmaz.
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 p-4 md:p-8">

            {/* OYUN PENCERESİ: max-h-[95dvh] ile ekran boyunu asla taşmaz */}
            <div className={cn(
                "relative flex flex-col w-full h-full md:h-auto max-h-[95dvh] md:max-h-[90vh] max-w-5xl rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all",
                "border-4 border-white/10",
                "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950"
            )}>

                {/* --- HEADER (Sabit) --- */}
                <div className="flex items-center justify-between px-5 py-4 z-20 shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-white/5">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                             <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                                <span className="text-xs font-bold text-indigo-100 tracking-wide uppercase">{question.type}</span>
                             </div>
                             {pointsValue > 0 && !isRevealed && (
                                <div className="hidden xs:flex items-center gap-1 bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-500/30">
                                    <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                                    <span className="text-xs font-bold text-emerald-300">+{pointsValue}p</span>
                                </div>
                             )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {!isRevealed && timerDuration > 0 && (
                            <CircularTimer timeLeft={timeLeft} totalTime={timerDuration} />
                        )}
                        {!isRevealed && (
                            <button onClick={onClose} className="bg-white/5 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-all border border-white/10 group">
                                <CloseIcon className="w-6 h-6 text-slate-300 group-hover:text-white" />
                            </button>
                        )}
                    </div>
                </div>

                {/* --- SCROLLABLE CONTENT AREA --- */}
                {/* min-h-0 ve overflow-y-auto, flex içinde scrollun doğru çalışmasını sağlar */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative flex flex-col p-4 md:p-8 gap-6 justify-start md:justify-center">
                    
                    {/* Soru Kartı */}
                    <div className="relative z-10 w-full shrink-0">
                        <div className={cn(
                            "relative w-full rounded-[2rem] p-6 md:p-10 shadow-xl border-t border-white/20 transition-all",
                            "bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800",
                            isRevealed && "grayscale-[0.5] opacity-80"
                        )}>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay pointer-events-none rounded-[2rem]" />
                            
                            <div className="relative z-10 flex flex-col items-center text-center gap-4">
                                <span className="inline-block px-4 py-1 rounded-full bg-black/20 text-white/80 text-xs font-bold tracking-[0.2em] backdrop-blur-md">
                                    SORU {number}
                                </span>
                                {/* Metin boyutu mobilde (text-xl) okunabilir, büyük ekranda (text-3xl) havalı */}
                                <p className="font-black text-white leading-relaxed drop-shadow-xl text-xl md:text-3xl lg:text-4xl text-balance">
                                    {questionText}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Seçenekler */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 pb-20 md:pb-0 shrink-0">
                        {options.map((option, i) => {
                            const colors = optionColors[i % optionColors.length];
                            const isCorrectOption = option === correctAnswer;
                            const isSelectedOption = option === userAnswer;
                            
                            let cardClass = cn(
                                "relative w-full p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 group cursor-pointer",
                                "min-h-[70px] md:min-h-[85px]", // Sabit minimum yükseklik
                                colors.lightBg,
                                colors.border,
                                "hover:brightness-125 hover:scale-[1.01] hover:shadow-lg active:scale-95",
                            );
                            
                            let badgeClass = cn(
                                "w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl flex items-center justify-center text-lg md:text-xl font-black shadow-inner transition-transform group-hover:rotate-6",
                                colors.letterBg
                            );

                            let textClass = "text-base md:text-lg font-bold text-slate-100 group-hover:text-white drop-shadow-sm";
                            let icon = null;

                            if (isRevealed) {
                                if (isCorrectOption) {
                                    cardClass = "bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-20";
                                    badgeClass = "bg-white text-emerald-600";
                                    textClass = "text-white text-lg md:text-xl font-black";
                                    icon = <Check className="w-6 h-6 md:w-8 md:h-8 text-white animate-bounce ml-auto shrink-0" />;
                                } else if (isSelectedOption) {
                                    cardClass = "bg-red-500 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] opacity-100";
                                    badgeClass = "bg-white text-red-600";
                                    textClass = "text-white font-bold";
                                    icon = <X className="w-6 h-6 md:w-8 md:h-8 text-white ml-auto shrink-0" />;
                                } else {
                                    cardClass = "bg-slate-800/50 border-slate-700 opacity-40 grayscale";
                                    textClass = "text-slate-400 font-medium";
                                }
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleAnswerClick(option)}
                                    disabled={isRevealed}
                                    className={cardClass}
                                >
                                    <span className={badgeClass}>
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className={cn("text-left leading-tight break-words flex-1", textClass)}>
                                        {option}
                                    </span>
                                    {icon}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- FOOTER (Sticky) --- */}
                {isRevealed && (
                    <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 shrink-0 z-30 animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            
                            <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
                                <div className={cn(
                                    "p-2 md:p-3 rounded-full shadow-lg shrink-0",
                                    revealedResult?.isCorrect ? "bg-emerald-500" : "bg-red-500"
                                )}>
                                    {revealedResult?.isCorrect ? <Check className="w-5 h-5 md:w-6 md:h-6 text-white" /> : <X className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                </div>
                                <div className="min-w-0">
                                    <p className={cn("text-lg md:text-xl font-black truncate", revealedResult?.isCorrect ? "text-emerald-400" : "text-red-400")}>
                                        {revealedResult?.isCorrect ? "DOĞRU CEVAP!" : "YANLIŞ CEVAP"}
                                    </p>
                                    {!revealedResult?.isCorrect && userAnswer !== "" && showCorrectAnswerOnWrong && (
                                        <p className="text-xs md:text-sm text-slate-400 truncate">
                                            Doğru: <span className="text-white font-bold">{correctAnswer}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="bg-slate-950/50 px-4 py-3 rounded-xl border border-white/10 text-center min-w-[70px]">
                                    <span className={cn("block text-xl md:text-2xl font-black", revealedResult && revealedResult.scoreChange > 0 ? "text-emerald-400" : "text-red-400")}>
                                        {revealedResult && revealedResult.scoreChange > 0 ? '+' : ''}{revealedResult?.scoreChange}
                                    </span>
                                </div>
                                
                                <Button 
                                    onClick={() => {
                                        if (revealedResult) {
                                            onAnswer(number, revealedResult.isCorrect, revealedResult.scoreChange);
                                            onClose();
                                        }
                                    }}
                                    className="flex-1 md:flex-none h-12 md:h-14 px-6 md:px-8 text-base md:text-lg font-bold bg-white text-slate-900 hover:bg-slate-200 rounded-xl shadow-lg active:scale-95"
                                >
                                    Devam Et
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}