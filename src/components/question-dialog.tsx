
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from "@/context/auth-context";

// This is a more robust type to handle all variations of questions coming from different parts of the app
type GameQuestion = Partial<Question> & {
    id: string; // Ensure id is always present
    text?: string;
    type: 'Çoktan Seçmeli' | 'Doğru/Yanlış' | 'Boşluk Doldurma';
    difficulty: 'Kolay' | 'Orta' | 'Zor';
    question?: string; // For MCQ from student-side
    statement?: string; // for TF from student-side
    isTrue?: boolean; // for TF from student-side
    sentenceWithBlank?: string; // for FITB from student-side
    soru?: string; // For Tornado 'soru'
    secenekler?: Record<string, string>; // For Tornado 'secenekler'
    cevap?: string; // For Tornado 'cevap'
};


export type QuestionDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    questionData: { number: number; question: GameQuestion };
    onAnswer: (questionNumber: number, isCorrect: boolean, scoreChange: number) => void;
    timerDuration?: number;
    pointsConfig?: any;
    penaltyConfig?: any;
    pullStrengthConfig?: any; // For duel mode
    isFullscreen: boolean;
    showCorrectAnswerOnWrong?: boolean;
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
    isFullscreen,
    showCorrectAnswerOnWrong = true
}: QuestionDialogProps) {
    const { user } = useAuth();
    const { number, question } = questionData;
    const [userAnswer, setUserAnswer] = useState<string | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [timeLeft, setTimeLeft] = useState(timerDuration);
    const [revealedResult, setRevealedResult] = useState<{isCorrect: boolean, scoreChange: number} | null>(null);
    const [questionToReview, setQuestionToReview] = useState<Question | null>(null);
    const intervalRef = useRef<NodeJS.Timeout>();
    
    // Universal text and answer accessors
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
        'Çoktan Seçmeli': 'mcq',
        'Doğru/Yanlış': 'tf',
        'Boşluk Doldurma': 'fitb',
    };

    const getScoreValues = useCallback(() => {
        const typeKey = typeMap[question.type];
        
        // Default points if no config is provided (e.g., for Kutu Aç)
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
                    if (newTime <= 10 && newTime > 0) {
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
        "bg-blue-600 hover:bg-blue-700 text-white",
        "bg-green-600 hover:bg-green-700 text-white",
        "bg-amber-500 hover:bg-amber-600 text-white",
        "bg-red-600 hover:bg-red-700 text-white",
    ];

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => { if(!open) onClose() }}>
            <AlertDialogContent className={cn(
                "flex flex-col p-0 border-4 border-slate-900/50",
                isFullscreen 
                    ? "w-screen h-screen max-w-none rounded-none justify-center"
                    : "max-w-none w-[95vw] md:w-[90vw] lg:w-[80vw] xl:w-[70vw] h-[95vh] md:h-[90vh]"
            )}>
                <AlertDialogHeader className="p-4 md:p-6 pb-4 border-b">
                     <div className="flex justify-between items-center">
                        <AlertDialogTitle className={cn("text-lg md:text-2xl", isFullscreen && "text-4xl")}>Soru {number}</AlertDialogTitle>
                         <div className="flex items-center gap-2">
                            {!isRevealed && pullStrength > 0 && <Badge variant="destructive">+{pullStrength} Çekme Gücü</Badge>}
                            {!isRevealed && !pullStrengthConfig && pointsValue > 0 && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">+{pointsValue} Puan</Badge>
                                    {penaltyValue > 0 && <Badge variant="destructive">-{penaltyValue} Puan</Badge>}
                                </div>
                            )}
                        </div>
                        <div className="w-24 md:w-32 text-right">
                            {!isRevealed && timerDuration > 0 && (
                                <p className={cn("font-bold", isFullscreen ? "text-2xl" : "text-base md:text-lg")}>{timeLeft}s</p>
                            )}
                        </div>
                    </div>
                    {!isRevealed && timerDuration > 0 && <Progress value={(timeLeft / timerDuration) * 100} className="w-full mt-2" />}
                </AlertDialogHeader>
                <div className="overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 flex flex-col justify-center flex-grow">
                     <div className={cn(
                         "text-center bg-primary text-primary-foreground p-4 md:p-6 rounded-lg shadow-lg flex items-center justify-center min-h-[100px] border-4 border-slate-900/50",
                         isFullscreen ? "min-h-[150px] md:min-h-[200px]" : "md:min-h-[120px]"
                     )}>
                       <p className={cn("font-bold break-words", isFullscreen ? "text-4xl" : "text-lg md:text-2xl")}>{questionText}</p>
                     </div>
                     
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {options.map((option, i) => {
                            const isCorrectOption = option === correctAnswer;
                            const isSelectedOption = option === userAnswer;
                            return (
                                <Button 
                                    key={i} 
                                    onClick={() => handleAnswerClick(option)} 
                                    disabled={isRevealed}
                                    className={cn(
                                        "h-auto justify-start text-left whitespace-normal",
                                        "p-3 text-base md:p-4 md:text-lg",
                                        isFullscreen ? "p-6 text-2xl" : "",
                                        "font-bold transition-all duration-300 transform hover:scale-105 shadow-lg text-primary-foreground border-2 border-transparent",
                                        !isRevealed && buttonColorClasses[i % buttonColorClasses.length],
                                        isRevealed && showCorrectAnswerOnWrong && isCorrectOption && "bg-green-600 hover:bg-green-700 border-white animate-tada ring-4 ring-offset-2 ring-white scale-105",
                                        isRevealed && isSelectedOption && !isCorrectOption && "bg-red-600 hover:bg-red-700 border-white animate-shake",
                                        isRevealed && !isSelectedOption && !isCorrectOption && "opacity-40"
                                    )}
                                >
                                     <span className="font-bold mr-3">{String.fromCharCode(65 + i)}.</span> 
                                     <span>{option}</span>
                                </Button>
                            );
                        })}
                    </div>
                   </div>
                <AlertDialogFooter className="p-4 md:p-6 pt-4 border-t bg-background mt-auto">
                    {isRevealed && revealedResult && (
                        <div className="w-full flex flex-col items-center gap-4">
                            <div className={cn(
                                "p-2 md:p-4 rounded-md text-center font-semibold flex flex-col items-center justify-center gap-1 w-full",
                                isFullscreen ? "text-2xl" : "text-sm md:text-base",
                                revealedResult.isCorrect ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                            )}>
                                <div className="flex items-center gap-2">
                                    {revealedResult.isCorrect ? <CheckCircle2 className="h-6 w-6"/> : <XCircle className="h-6 w-6"/>}
                                    <span>
                                        {userAnswer === "" ? "Süre Doldu!" : (revealedResult.isCorrect ? "Doğru!" : "Yanlış!")}
                                    </span>
                                </div>
                                {!revealedResult.isCorrect && userAnswer !== "" && showCorrectAnswerOnWrong && (
                                    <p className="text-sm font-normal">Doğru Cevap: <span className="font-bold">{correctAnswer}</span></p>
                                )}
                            </div>
                             <Button 
                                size={isFullscreen ? "lg" : "default"}
                                onClick={() => {
                                    onAnswer(number, revealedResult.isCorrect, revealedResult.scoreChange);
                                    onClose();
                                }}
                            >
                                Devam Et
                            </Button>
                        </div>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
