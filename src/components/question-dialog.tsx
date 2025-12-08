
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { playSound, stopSound } from "@/lib/audio-service";
import type { Question } from "@/lib/types";
import { addQuestionToReviewList } from "@/app/student/tekrar-et/actions";

// UI Imports
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, HelpCircle, AlertCircle, Check, X, Clock, Zap } from 'lucide-react';
import { useAuth } from "@/context/auth-context";

// --- DAİRESEL ZAMANLAYICI BİLEŞENİ ---
const CircularTimer = ({ timeLeft, totalTime }: { timeLeft: number, totalTime: number }) => {
    const radius = 24; 
    const circumference = 2 * Math.PI * radius; 
    const progress = (timeLeft / totalTime) * 100;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    let colorClass = "stroke-emerald-500 shadow-[0_0_10px_#10b981]"; 
    if (progress <= 50) colorClass = "stroke-amber-500 shadow-[0_0_10px_#f59e0b]"; 
    if (progress <= 20) colorClass = "stroke-red-500 shadow-[0_0_15px_#ef4444]"; 

    const isCritical = progress <= 20 && timeLeft > 0;

    return (
        <div className={cn("relative flex items-center justify-center w-16 h-16 transition-all duration-300", isCritical && "scale-110 animate-pulse")}>
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r={radius} fill="transparent" className="stroke-slate-800/50" strokeWidth="6" />
                <circle cx="30" cy="30" r={radius} fill="transparent" className={cn("transition-all duration-500 ease-out", colorClass)} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-xl font-black font-mono drop-shadow-md", isCritical ? "text-red-500" : "text-white")}>{timeLeft}</span>
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
    const [revealedResult, setRevealedResult] = useState<{isCorrect: boolean, scoreChange: number} | null>(null);
    const [questionToReview, setQuestionToReview] = useState<Question | null>(null);
    const intervalRef = useRef<NodeJS.Timeout>();
    
    // Soru Metni ve Cevap
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

    const themeColor = useMemo(() => {
        switch (question.type) {
            case 'Doğru/Yanlış': return 'text-sky-400 border-sky-500/30 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.3)]';
            case 'Çoktan Seçmeli': return 'text-purple-400 border-purple-500/30 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.3)]';
            case 'Boşluk Doldurma': return 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
            default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
        }
    }, [question.type]);

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

    const buttonColorClasses = [
        "bg-slate-700/50 border-slate-600/50 text-slate-100 hover:bg-slate-700 hover:border-slate-500 hover:shadow-[0_0_20px_rgba(100,116,139,0.5)]",
        "bg-sky-700/50 border-sky-600/50 text-sky-100 hover:bg-sky-700 hover:border-sky-500 hover:shadow-[0_0_20px_rgba(14,165,233,0.5)]",
        "bg-fuchsia-700/50 border-fuchsia-600/50 text-fuchsia-100 hover:bg-fuchsia-700 hover:border-fuchsia-500 hover:shadow-[0_0_20px_rgba(217,70,239,0.5)]",
        "bg-rose-700/50 border-rose-600/50 text-rose-100 hover:bg-rose-700 hover:border-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.5)]",
    ];

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => { if(!open) onClose() }}>
            <AlertDialogContent className={cn(
                "p-0 border-0 bg-transparent shadow-none flex items-center justify-center outline-none",
                isFullscreen 
                    ? "w-screen h-screen max-w-none rounded-none bg-slate-950/90 backdrop-blur-sm"
                    : "max-w-4xl w-[95vw]"
            )}>
                
                <div className="bg-slate-900/90 backdrop-blur-xl border-2 border-white/10 rounded-[2rem] w-full shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
                    
                    <AlertDialogHeader className="p-0">
                         {/* Header */}
                        <div className="bg-slate-950/50 px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0">
                            <AlertDialogTitle className="sr-only">Soru {number}</AlertDialogTitle>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm", themeColor)}>
                                        {question.type}
                                    </span>
                                    {pointsValue > 0 && !isRevealed && (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                            <Zap className="w-3 h-3 mr-1 fill-current" /> +{pointsValue}
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] ml-1">Soru {number}</span>
                            </div>
                            
                            {!isRevealed && timerDuration > 0 && (
                                <CircularTimer timeLeft={timeLeft} totalTime={timerDuration} />
                            )}
                        </div>
                    </AlertDialogHeader>

                    {/* Content */}
                    <div className="overflow-y-auto custom-scrollbar flex flex-col p-6 gap-6 relative">
                        {/* Background Grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                        {/* Soru Metni */}
                        <div className={cn(
                            "relative z-10 text-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-8 rounded-3xl border border-white/10 shadow-inner flex flex-col items-center justify-center min-h-[160px]",
                            isFullscreen && "min-h-[250px]"
                        )}>
                            <div className="bg-slate-900/50 p-3 rounded-full mb-4 border border-white/5 shadow-lg">
                                <HelpCircle className="w-8 h-8 text-indigo-400" />
                            </div>
                            <p className={cn("font-black text-white leading-relaxed drop-shadow-md", isFullscreen ? "text-4xl" : "text-xl md:text-2xl")}>
                                {questionText}
                            </p>
                        </div>
                        
                        {/* Seçenekler */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                            {options.map((option, i) => {
                                const isCorrectOption = option === correctAnswer;
                                const isSelectedOption = option === userAnswer;
                                
                                let btnStyle = buttonColorClasses[i % buttonColorClasses.length];
                                let icon = null;

                                if (isRevealed) {
                                    if (isCorrectOption) {
                                        btnStyle = "bg-emerald-600 border-emerald-400 text-white ring-4 ring-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-[1.02] z-10";
                                        icon = <Check className="w-8 h-8 text-white animate-bounce" />;
                                    } else if (isSelectedOption) {
                                        btnStyle = "bg-red-600 border-red-400 text-white opacity-90 animate-shake shadow-[0_0_30px_rgba(239,68,68,0.4)]";
                                        icon = <X className="w-8 h-8 text-white" />;
                                    } else {
                                        btnStyle = "bg-slate-800/50 border-white/5 text-slate-500 opacity-40 scale-95 grayscale";
                                    }
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleAnswerClick(option)}
                                        disabled={isRevealed}
                                        className={cn(
                                            "relative w-full p-5 rounded-2xl border-2 font-bold text-left transition-all duration-200 flex items-center justify-between group overflow-hidden",
                                            "text-lg",
                                            isFullscreen && "text-2xl p-8",
                                            btnStyle,
                                            !isRevealed && "active:scale-[0.98] border-b-4 active:border-b-2 active:translate-y-[2px]"
                                        )}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <span className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center text-lg border bg-black/20 font-black",
                                                isRevealed && isCorrectOption ? "border-white/50 text-white" : "border-white/10 text-white/70"
                                            )}>
                                                {String.fromCharCode(65 + i)}
                                            </span>
                                            <span className="leading-tight">{option}</span>
                                        </div>
                                        <div className="relative z-10">{icon}</div>
                                        {/* Hover Glow */}
                                        {!isRevealed && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <AlertDialogFooter className="p-6 border-t border-white/5 bg-slate-950/80 mt-auto backdrop-blur-md">
                        {isRevealed && revealedResult ? (
                            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-4 duration-300">
                                <div className={cn(
                                    "flex items-center gap-3 px-6 py-3 rounded-2xl border-2 w-full md:w-auto",
                                    revealedResult.isCorrect 
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                                )}>
                                    {revealedResult.isCorrect ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                                    <div>
                                        <p className="font-black text-xl leading-none">{revealedResult.isCorrect ? "MÜKEMMEL!" : "YANLIŞ CEVAP"}</p>
                                        {!revealedResult.isCorrect && userAnswer !== "" && showCorrectAnswerOnWrong && (
                                            <p className="text-sm text-slate-400 mt-1">Doğru: <span className="font-bold text-white">{correctAnswer}</span></p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-white/10 text-center min-w-[100px]">
                                        <span className={cn("block text-2xl font-black", revealedResult.scoreChange > 0 ? "text-emerald-400" : "text-red-400")}>
                                            {revealedResult.scoreChange > 0 ? '+' : ''}{revealedResult.scoreChange}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">PUAN</span>
                                    </div>
                                    <Button 
                                        size="lg"
                                        onClick={() => {
                                            onAnswer(number, revealedResult.isCorrect, revealedResult.scoreChange);
                                            onClose();
                                        }}
                                        className="flex-1 md:flex-none h-16 px-8 text-xl font-bold bg-white text-black hover:bg-slate-200 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105"
                                    >
                                        Devam Et
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full flex justify-end">
                                <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10">
                                    Pencereyi Kapat
                                </Button>
                            </div>
                        )}
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
