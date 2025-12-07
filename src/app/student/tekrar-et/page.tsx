

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { getReviewQuestions, removeQuestionFromReviewList } from './actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Repeat, Check, Home, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useAuth } from '@/context/auth-context';

function ReviewQuiz() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    
    const [correctCount, setCorrectCount] = useState(0);
    
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchQuest = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);
        setQuestions([]);
        const result = await getReviewQuestions(user.uid);
        if (result.error) {
            setError(result.error);
        } else {
            setQuestions(result.questions || []);
        }
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        fetchQuest();
    }, [fetchQuest]);
    
    const handleAnswer = (answer: string) => {
        if (answers[currentQuestionIndex] !== undefined && answers[currentQuestionIndex] !== null) return;
        if (!user) return;

        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answer;
        setAnswers(newAnswers);

        const question = questions[currentQuestionIndex];
        const isCorrect = answer === question.correctAnswer;

        if(isCorrect) {
            playSound('correct');
            setCorrectCount(c => c + 1);
            removeQuestionFromReviewList(user.uid, question.id).catch(err => {
                console.error("Failed to remove question from review list", err);
                toast({ title: "Hata", description: "Soru tekrar listesinden kaldırılamadı.", variant: "destructive" });
            });
        } else {
            playSound('incorrect');
        }

        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
            } else {
                setIsFinished(true);
            }
        }, 1000);
    };
    
    const handleRestart = () => {
        setIsFinished(false);
        setCurrentQuestionIndex(0);
        setCorrectCount(0);
        setAnswers([]);
        fetchQuest();
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Tekrar Testi Yükleniyor...</span></div>;
    }
    
    if (error) {
        return (
            <div className={cn("w-full h-full min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-950 dark:to-teal-950", !isFullscreen && "p-4")}>
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    if (questions.length === 0) {
        return (
             <div className={cn("w-full h-full min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-950 dark:to-teal-950", !isFullscreen && "p-4")}>
                <Card className={cn("w-full text-center", isFullscreen ? "h-screen rounded-none border-none flex flex-col justify-center" : "max-w-md")}>
                    <CardHeader>
                        <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full p-3 w-fit"><Check className="h-10 w-10 text-green-600"/></div>
                        <CardTitle className={cn("font-headline text-2xl md:text-3xl mt-4", isFullscreen && "text-5xl")}>Harika!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={cn("text-lg", isFullscreen && "text-2xl")}>Tekrar edilecek hiç sorun kalmadı.</p>
                    </CardContent>
                    <CardFooter>
                         <Button asChild size="lg" className="w-full">
                            <Link href="/student"><Home className="mr-2 h-4 w-4"/> Panele Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if(isFinished) {
        return (
             <div className={cn(
                "w-full h-full min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-950 dark:to-teal-950",
                !isFullscreen && "p-4"
             )}>
                <Card className={cn(
                    "w-full text-center",
                    isFullscreen ? "h-screen rounded-none border-none flex flex-col justify-center" : "max-w-md"
                )}>
                    <CardHeader>
                        <div className="mx-auto bg-amber-100 rounded-full p-3 w-fit"><PartyPopper className={cn("h-10 w-10 text-amber-500", isFullscreen && "h-16 w-16")}/></div>
                        <CardTitle className={cn("font-headline text-2xl md:text-3xl mt-4", isFullscreen && "text-5xl")}>Tekrar Tamamlandı!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className={cn("text-lg md:text-xl", isFullscreen && "text-3xl")}>Sonucun:</p>
                        <p className={cn("text-4xl md:text-5xl font-bold text-primary", isFullscreen && "text-7xl")}>{correctCount} / {questions.length}</p>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row gap-2">
                        <Button onClick={handleRestart} className="w-full">
                           <Repeat className="mr-2 h-4 w-4" /> Tekrar Başla
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                             <Link href="/student"><Home className="mr-2 h-4 w-4"/> Panele Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestionIndex];

    return (
        <div className={cn(
            "w-full h-full min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-950 dark:to-teal-950",
            !isFullscreen && "p-4 sm:p-6 md:p-8",
            "pb-24 md:pb-8"
        )}>
            <Card className={cn(
                "w-full",
                isFullscreen ? "h-screen rounded-none border-none flex flex-col" : "max-w-2xl"
            )}>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2 font-headline text-3xl"><Repeat/> Tekrar Testi</CardTitle>
                        <FullscreenToggle />
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                        <span className="text-sm text-muted-foreground">Soru {currentQuestionIndex + 1} / {questions.length}</span>
                        <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full" />
                    </div>
                </CardHeader>
                <CardContent className="py-6 flex-grow flex flex-col justify-center">
                    <div className="text-center bg-background/50 border-2 border-primary/20 p-6 rounded-lg shadow-inner">
                        <p className="text-xl font-semibold">{currentQuestion.text}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                    {currentQuestion.type === 'Çoktan Seçmeli' && currentQuestion.options?.map(option => {
                        const isSelected = currentAnswer === option;
                        const isCorrect = currentQuestion.correctAnswer === option;
                        return (
                            <Button key={option} variant="outline" className={cn("h-auto py-4 whitespace-normal justify-start text-left", currentAnswer && isCorrect && "bg-green-100 border-green-500 text-green-800", currentAnswer && isSelected && !isCorrect && "bg-red-100 border-red-500 text-red-800" )} onClick={() => handleAnswer(option)} disabled={!!currentAnswer}>
                                {option}
                            </Button>
                        );
                    })}
                    {currentQuestion.type === 'Doğru/Yanlış' && ["Doğru", "Yanlış"].map(option => {
                        const isSelected = currentAnswer === option;
                        const isCorrect = currentQuestion.correctAnswer === option;
                        return (
                            <Button key={option} variant="outline" className={cn("h-auto py-4 text-lg", currentAnswer && isCorrect && "bg-green-100 border-green-500 text-green-800", currentAnswer && isSelected && !isCorrect && "bg-red-100 border-red-500 text-red-800")} onClick={() => handleAnswer(option)} disabled={!!currentAnswer}>
                                {option}
                            </Button>
                        );
                    })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


export default function TekrarEtPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ReviewQuiz />
        </Suspense>
    )
}
