
"use client";

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, Brain, Repeat, Home, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function GuessItGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [questionQueue, setQuestionQueue] = useState<Partial<Question>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentQuestion, setCurrentQuestion] = useState<Partial<Question> | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);

    const [isSaving, setIsSaving] = useState(false);

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Bil Bakalım - ${searchParams.get('topicName')}`;

    useEffect(() => {
        const fetchQuestions = async () => {
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
                setQuestionQueue(result.questions);
                setCurrentQuestion(result.questions[0]);
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic]);
    
     useEffect(() => {
        if (!isLoading && !error && questions.length > 0 && questionQueue.length === 0 && !isFinished) {
            // All questions have been answered correctly
            const handleFinish = async () => {
                 if (user && score > 0 && !isStatic) {
                    setIsSaving(true);
                    const result = await submitBilBakalimScoreAction(user.uid, score, gameContext);
                    if (result.success) {
                        toast({ title: 'Başarılı!', description: 'Puanın kaydedildi.' });
                    } else {
                        toast({ title: 'Hata', description: result.error, variant: 'destructive' });
                    }
                    setIsSaving(false);
                 }
                setIsFinished(true);
            }
            handleFinish();
        }
    }, [questionQueue, questions, isLoading, isFinished, user, score, isStatic, gameContext, toast, error]);

    const handleAnswer = (answer: string) => {
        if (!currentQuestion || isAnswered) return;

        const isCorrectAnswer = answer.trim().toLocaleLowerCase('tr-TR') === (currentQuestion.correctAnswer || '').trim().toLocaleLowerCase('tr-TR');
        setIsCorrect(isCorrectAnswer);
        setIsAnswered(true);

        if (isCorrectAnswer) {
            playSound('correct');
            setScore(prev => prev + 15);
            setTimeout(() => {
                const newQueue = questionQueue.filter(q => q.id !== currentQuestion.id);
                setQuestionQueue(newQueue);
                setCurrentQuestion(newQueue[0] || null);
                setIsAnswered(false);
                setIsCorrect(null);
            }, 1200);
        } else {
            playSound('incorrect');
            setScore(prev => Math.max(0, prev - 5));
            setTimeout(() => {
                const newQueue = [...questionQueue.slice(1), currentQuestion];
                setQuestionQueue(newQueue);
                setCurrentQuestion(newQueue[0]);
                setIsAnswered(false);
                setIsCorrect(null);
            }, 1200);
        }
    };
    
    const restartGame = () => {
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        setQuestionQueue(shuffled);
        setCurrentQuestion(shuffled[0]);
        setScore(0);
        setIsFinished(false);
        setIsAnswered(false);
        setIsCorrect(null);
    }
    
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
            <div className="flex h-screen w-full items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <PartyPopper className="h-16 w-16 mx-auto text-amber-500"/>
                        <CardTitle className="text-2xl font-bold">Harika İş!</CardTitle>
                        <CardDescription>Tüm kavramları öğrendin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">{score}</p>
                        <p className="text-muted-foreground">Toplam Puan</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        {isSaving ? <Loader2 className="h-6 w-6 animate-spin"/> :
                            <>
                                <Button onClick={restartGame} className="w-full">Tekrar Oyna</Button>
                                <Button variant="outline" asChild className="w-full">
                                <Link href={backUrl}>Etkinlik Merkezine Dön</Link>
                                </Button>
                            </>
                        }
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (!currentQuestion) return null;

    return (
        <div className="flex h-screen w-full items-center justify-center p-4 bg-teal-50 dark:bg-teal-900/50">
            <Card className="w-full max-w-xl text-center">
                 <CardHeader>
                     <Progress value={( (questions.length - questionQueue.length) / questions.length) * 100} className="mb-4" />
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">Kalan Soru: {questionQueue.length}</CardTitle>
                        <div className="text-lg font-bold text-primary">Puan: {score}</div>
                    </div>
                    <CardDescription className="text-lg pt-4 min-h-[80px]">
                        <Brain className="inline-block mr-2 h-5 w-5 text-pink-400" />
                        {currentQuestion.text}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {questions.map((q) => {
                        const answer = q.correctAnswer;
                        if (!answer) return null;

                        const isTheCorrectAnswer = answer === currentQuestion.correctAnswer;
                        const isSelected = answer === userAnswer;
                        let buttonClass = '';

                        if (isAnswered) {
                            if (isTheCorrectAnswer) {
                                buttonClass = 'bg-green-500 hover:bg-green-600 animate-tada';
                            } else if (isSelected) {
                                buttonClass = 'bg-red-500 hover:bg-red-600 animate-shake';
                            } else {
                                buttonClass = 'opacity-50 pointer-events-none';
                            }
                        }

                        return (
                            <Button 
                                key={q.id}
                                variant={isAnswered ? 'default' : 'outline'}
                                className={cn('w-full justify-start text-left h-auto py-3', buttonClass)}
                                onClick={() => handleAnswer(answer)}
                                disabled={isAnswered}
                            >
                                {isAnswered && isTheCorrectAnswer && <CheckCircle2 className="mr-2 h-5 w-5"/>}
                                {isAnswered && isSelected && !isTheCorrectAnswer && <XCircle className="mr-2 h-5 w-5"/>}
                                {answer}
                            </Button>
                        )
                    })}
                </CardContent>
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
