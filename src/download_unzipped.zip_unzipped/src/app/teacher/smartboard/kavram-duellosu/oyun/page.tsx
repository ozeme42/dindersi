

"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getConceptQuizAction, type ConceptQuizQuestion } from '@/app/student/kavram-yarismasi/actions';
import { Loader2, ArrowLeft, BrainCircuit, Repeat, Home, CheckCircle2, XCircle, Trophy, PartyPopper, Heart, Check, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import type { UserProfile, Question } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { playSound, stopSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { updateMultipleStudentScores } from '@/app/teacher/smartboard/actions';

const QUESTION_TIME = 15;
const INITIAL_LIVES = 2;


const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

function ConceptQuizComponent() {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [questions, setQuestions] = useState<ConceptQuizQuestion[]>([]);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
    const intervalRef = useRef<NodeJS.Timeout>();

    const [isRevealed, setIsRevealed] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [lives, setLives] = useState(INITIAL_LIVES);
    const [feedback, setFeedback] = useState<{ isCorrect: boolean, correctAnswer: string } | null>(null);
    
    const [isFinished, setIsFinished] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);

    const colorClasses = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'];

     const activityCenterLink = '/teacher/smartboard/kavram-yarismasi';

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const questionResult = await getConceptQuizAction(params);
            
            if (questionResult.error || !questionResult.questions || questionResult.questions.length === 0) {
                throw new Error(questionResult.error || "Uygun soru bulunamadı.");
            }
            
            setQuestions(shuffleArray(questionResult.questions));

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);
    
    const handleAnswer = useCallback((answer: string | null) => {
        if (isRevealed) return;

        const question = questions[currentQuestionIndex];
        if (!question) return;
        
        const isCorrect = answer === question.correctAnswer;
        setSelectedAnswer(answer);
        
        if (isCorrect) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            stopSound('timer');
            playSound('correct');
            setCorrectCount(c => c + 1);
            setIsRevealed(true);
            setFeedback({ isCorrect: true, correctAnswer: question.correctAnswer });
        } else {
            playSound('incorrect');
            const newLives = lives - 1;
            setLives(newLives);
            if (newLives <= 0 || answer === null) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                stopSound('timer');
                setIsRevealed(true);
                setFeedback({ isCorrect: false, correctAnswer: question.correctAnswer });
            }
        }
    }, [isRevealed, questions, currentQuestionIndex, lives]);
    
    useEffect(() => {
        if (questions.length > 0 && !isFinished && !isRevealed) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current!);
                        stopSound('timer');
                        handleAnswer(null); // Timeout
                        return 0;
                    }
                    const newTime = prev - 1;
                    if (newTime <= 10 && newTime > 0) playSound('timer');
                    return newTime;
                });
            }, 1000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            stopSound('timer');
        };
    }, [questions.length, isFinished, isRevealed, handleAnswer, currentQuestionIndex]);

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setIsRevealed(false);
            setSelectedAnswer(null);
            setLives(INITIAL_LIVES);
            setFeedback(null);
            setTimeLeft(QUESTION_TIME);
        } else {
            setIsFinished(true);
        }
    }

    const startNewGame = () => {
        setCurrentQuestionIndex(0);
        setIsFinished(false);
        setIsRevealed(false);
        setSelectedAnswer(null);
        setCorrectCount(0);
        setLives(INITIAL_LIVES);
        setFeedback(null);
        setTimeLeft(QUESTION_TIME);
        fetchGameData();
    };


    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin"/></div>
    if (error) return (
        <div className="w-full h-full min-h-screen p-4 flex items-center justify-center">
            <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Hata!</AlertTitle>
                <AlertDesc>{error}</AlertDesc>
                 <div className="mt-4">
                    <Button asChild variant="outline"><Link href={activityCenterLink}><ArrowLeft className="mr-2 h-4 w-4"/> Kuruluma Geri Dön</Link></Button>
                </div>
            </Alert>
        </div>
    );
     if (isFinished) {
        return (
             <div className="w-full h-full min-h-screen p-4 flex items-center justify-center">
                <Card className="w-full text-center max-w-md">
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Yarışma Bitti!</CardTitle>
                        <CardDescription>Toplam {correctCount}/{questions.length} doğru cevap verdiniz.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Trophy className="h-24 w-24 text-amber-400"/>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button size="lg" onClick={startNewGame}><Repeat className="mr-2 h-5 w-5"/> Tekrar Oyna</Button>
                        <Button asChild variant="outline"><Link href="/teacher/smartboard"><Home className="mr-2 h-5 w-5"/> Ana Menü</Link></Button>
                    </CardFooter>
                </Card>
             </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return <div className="text-center p-8">Soru yükleniyor...</div>;

    return (
        <div className="w-full min-h-screen bg-pink-50 dark:bg-slate-900 p-4 flex flex-col justify-center items-center gap-6">
             <div className="w-full max-w-5xl">
                <div className="relative h-4 mb-2 bg-muted rounded-full overflow-hidden">
                    <Progress value={(timeLeft / QUESTION_TIME) * 100} className="absolute inset-0 h-full w-full"/>
                    <span className="absolute inset-0 text-center font-bold text-sm text-white">{timeLeft}s</span>
                </div>
                 <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Soru: {currentQuestionIndex + 1} / {questions.length}</span>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
                            <Heart key={i} className={cn("h-6 w-6 transition-all", lives > i ? "text-red-500 fill-red-400" : "text-gray-300 dark:text-gray-600")} />
                        ))}
                    </div>
                </div>
                <div className="text-center bg-background/50 border-2 border-primary/20 p-6 rounded-lg shadow-lg relative mt-2">
                    <p className="text-2xl font-semibold italic">"{currentQuestion.definition}"</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full max-w-6xl">
                {currentQuestion.options.map((option, index) => {
                    const isCorrectOption = option === currentQuestion.correctAnswer;
                    const isSelectedOption = option === selectedAnswer;
                    
                    let buttonClass = colorClasses[index % colorClasses.length];
                    
                    if (isRevealed) {
                        if (isCorrectOption) buttonClass = 'bg-green-500 animate-tada';
                        else buttonClass = 'bg-gray-400 opacity-50';
                    } else if (selectedAnswer && isSelectedOption) {
                        buttonClass = 'bg-red-500 animate-shake';
                    }

                    return (
                        <Button
                            key={index}
                            variant="default"
                            className={cn("h-28 text-lg whitespace-normal", buttonClass)}
                            onClick={() => handleAnswer(option)}
                            disabled={isRevealed || (selectedAnswer !== null && isSelectedOption)}
                        >
                            {option}
                        </Button>
                    );
                })}
            </div>

            {isRevealed && (
                <div className="mt-4 text-center">
                     {!feedback?.isCorrect && (
                        <p className="text-lg font-semibold text-red-600 mb-4">
                           {feedback?.correctAnswer ? `Doğru cevap: ${feedback.correctAnswer}` : "Süre doldu!"}
                        </p>
                     )}
                     <Button size="lg" onClick={handleNext}>
                        {currentQuestionIndex < questions.length - 1 ? "Sonraki Soru" : "Bitir"}
                    </Button>
                </div>
            )}
        </div>
    );
}


function ConceptTournamentPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ConceptQuizComponent />
        </Suspense>
    );
}

export default ConceptTournamentPageWrapper;


