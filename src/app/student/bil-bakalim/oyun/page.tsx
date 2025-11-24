
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, Lightbulb, Repeat, Home } from 'lucide-react';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';


function GuessItGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [questionQueue, setQuestionQueue] = useState<Partial<Question>[]>([]);
    const [solvedQuestions, setSolvedQuestions] = useState<Partial<Question>[]>([]);

    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [mistakeCount, setMistakeCount] = useState(0);
    
    const isStatic = searchParams.get('static') === 'true';
    const gameContext = useMemo(() => `Bil Bakalım - ${searchParams.get('courseName') || 'Genel'} > ${searchParams.get('topicName') || 'Genel'}`, [searchParams]);

    const startGame = useCallback(() => {
        setQuestionQueue(questions.sort(() => 0.5 - Math.random()));
        setSolvedQuestions([]);
        setScore(0);
        setMistakeCount(0);
        setIsFinished(false);
        setIsAnswered(false);
        setSelectedAnswer(null);
    }, [questions]);
    
    useEffect(() => {
        const fetchQuestions = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getBilBakalimAction(params);
            if (result.error) {
                setError(result.error);
            } else if (result.questions && result.questions.length > 0) {
                setQuestions(result.questions);
                setQuestionQueue(result.questions.sort(() => 0.5 - Math.random()));
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams]);

    useEffect(() => {
        if (!isLoading && !error && questionQueue.length === 0 && questions.length > 0 && !isFinished) {
            setIsFinished(true);
            if (user && score > 0 && !isStatic) {
                submitBilBakalimScoreAction(user.uid, score, gameContext);
            }
        }
    }, [questionQueue, questions, isLoading, isFinished, user, score, isStatic, gameContext, error]);
    
    const handleAnswer = (answer: string) => {
        if (isAnswered) return;
        
        const currentQuestion = questionQueue[0];
        if (!currentQuestion) return;

        const isCorrect = answer === currentQuestion.correctAnswer;
        setSelectedAnswer(answer);
        setIsAnswered(true);

        if (isCorrect) {
            playSound('correct');
            setScore(prev => prev + 15);
            setSolvedQuestions(prev => [...prev, currentQuestion]);
            setTimeout(() => {
                setQuestionQueue(prev => prev.slice(1));
                setIsAnswered(false);
                setSelectedAnswer(null);
            }, 1200);
        } else {
            playSound('incorrect');
            setScore(prev => Math.max(0, prev - 5));
            setMistakeCount(prev => prev + 1);
            setTimeout(() => {
                setQuestionQueue(prev => {
                    const incorrectQuestion = prev[0];
                    const remaining = prev.slice(1);
                    return [...remaining, incorrectQuestion];
                });
                setIsAnswered(false);
                setSelectedAnswer(null);
            }, 1200);
        }
    };
    
    const backUrl = '/student/bil-bakalim';

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    if (error) return (
        <div className="flex h-screen w-full items-center justify-center p-4">
             <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Oyun Yüklenemedi</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <div className="mt-4">
                    <Button asChild variant="secondary">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );

    if (isFinished) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Tebrikler!</CardTitle>
                        <CardDescription>Bil Bakalım etkinliğini tamamladınız.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-4xl font-bold text-primary">{score}</p>
                        <p className="text-muted-foreground">Toplam Puan</p>
                        <p className="text-sm text-red-500">{mistakeCount} hata yapıldı.</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={startGame} className="w-full">Tekrar Oyna</Button>
                        <Button variant="outline" asChild className="w-full">
                           <Link href={backUrl}>Etkinlik Merkezine Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    const currentQuestion = questionQueue[0];
    if (!currentQuestion) {
         return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-yellow-50 dark:bg-yellow-900/50 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
            <Card className="w-full max-w-2xl text-center">
                 <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xl sm:text-2xl">Soru {solvedQuestions.length + 1}/{questions.length}</CardTitle>
                        <div className="text-lg font-bold text-primary">Puan: {score}</div>
                    </div>
                </CardHeader>
                <CardContent 
                    className="h-64 w-full rounded-lg text-foreground flex items-center justify-center p-6 text-center"
                >
                    <h2 className="text-xl sm:text-2xl font-semibold">{currentQuestion.text}</h2>
                </CardContent>
                <CardFooter className="flex-col justify-center gap-4 mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                         {currentQuestion.options?.map((answer, index) => {
                            const isTheCorrectAnswer = answer === currentQuestion.correctAnswer;
                            const isSelected = answer === selectedAnswer;
                            let buttonClass = '';

                            if (isAnswered) {
                                if (isTheCorrectAnswer) {
                                    buttonClass = 'bg-green-600 hover:bg-green-700 text-white animate-tada';
                                } else if (isSelected) {
                                    buttonClass = 'bg-red-600 hover:bg-red-600 text-white animate-shake';
                                } else {
                                    buttonClass = 'bg-muted text-muted-foreground opacity-50';
                                }
                            } else {
                                buttonClass = 'bg-primary hover:bg-primary/90 text-primary-foreground';
                            }
                            
                            return (
                                <Button 
                                    key={`${currentQuestion.id}-${index}`} 
                                    className={cn("h-16 text-lg", buttonClass)}
                                    onClick={() => handleAnswer(answer)}
                                    disabled={isAnswered}
                                >
                                    {answer}
                                </Button>
                            );
                         })}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function GuessItPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <GuessItGame />
        </Suspense>
    );
}
