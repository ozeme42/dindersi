
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, Brain, Repeat, Home, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';


function GuessItGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Question[]>([]);
    const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);


    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Bil Bakalım - ${searchParams.get('courseName') || 'Genel'} > ${searchParams.get('topicName') || 'Genel'}`;

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
                setQuestionQueue(result.questions.sort(() => 0.5 - Math.random()));
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic]);
    
    const currentQuestion = questionQueue.length > 0 ? questionQueue[0] : null;

    const handleAnswer = (answer: string) => {
        if (!currentQuestion || isAnswered) return;
        
        const isCorrect = answer === currentQuestion.correctAnswer;
        setSelectedAnswer(answer);
        setIsAnswered(true);

        if (isCorrect) {
            playSound('correct');
            setScore(prev => prev + 15);
            setTimeout(() => {
                const newQueue = questionQueue.slice(1);
                setQuestionQueue(newQueue);
                if (newQueue.length === 0) {
                    setIsFinished(true);
                } else {
                    setIsAnswered(false);
                    setSelectedAnswer(null);
                }
            }, 1200);
        } else {
            playSound('incorrect');
            setScore(prev => Math.max(0, prev - 5));
            setTimeout(() => {
                const wrongQuestion = questionQueue[0];
                const newQueue = [...questionQueue.slice(1), wrongQuestion];
                setQuestionQueue(newQueue);
                setIsAnswered(false);
                setSelectedAnswer(null);
            }, 1200);
        }
    };
    
    const handleSaveAndExit = useCallback(async () => {
        if (!user || score <= 0 || isSaving) {
            router.push('/student/activities');
            return;
        }

        setIsSaving(true);
        const result = await submitBilBakalimScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Puanın kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
        router.push('/student/activities');
    }, [user, score, gameContext, router, isSaving, toast]);
    
    useEffect(() => {
        if (isFinished) {
            handleSaveAndExit();
        }
    }, [isFinished, handleSaveAndExit]);

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
                        <CardTitle>Tebrikler!</CardTitle>
                        <CardDescription>Bil Bakalım etkinliğini tamamladınız.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">{score}</p>
                        <p className="text-muted-foreground">Toplam Puan</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={() => window.location.reload()} className="w-full">Tekrar Oyna</Button>
                        <Button variant="outline" asChild className="w-full">
                           <Link href={backUrl}>Etkinlik Merkezine Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (!currentQuestion) return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Sorular hazırlanıyor...</p>
        </div>
    );

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-4 bg-teal-50 dark:bg-teal-900/50">
            <Card className="w-full max-w-xl text-center">
                 <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">Soru {questions.length - questionQueue.length + 1}/{questions.length}</CardTitle>
                        <div className="text-lg font-bold text-primary">Puan: {score}</div>
                    </div>
                </CardHeader>
                <CardContent 
                    className="h-64 w-full rounded-lg bg-teal-600 text-white flex items-center justify-center p-6"
                >
                    <p className="text-2xl font-semibold">{currentQuestion.text}</p>
                </CardContent>
            </Card>
            <div className="mt-6 w-full max-w-4xl grid grid-cols-2 lg:grid-cols-4 gap-3">
                {questions.map((q) => {
                    const isTheCorrectAnswer = q.correctAnswer === currentQuestion.correctAnswer;
                    const isSelected = q.correctAnswer === selectedAnswer;

                    let buttonClass = 'bg-white hover:bg-gray-100 text-gray-800';
                    if (isAnswered) {
                        if (isTheCorrectAnswer) {
                            buttonClass = 'bg-green-500 hover:bg-green-600 text-white animate-tada';
                        } else if (isSelected) {
                            buttonClass = 'bg-red-500 hover:bg-red-600 text-white animate-shake';
                        } else {
                            buttonClass = 'bg-gray-300 text-gray-500 opacity-50';
                        }
                    }

                    return (
                        <Button
                            key={q.id}
                            onClick={() => handleAnswer(q.correctAnswer)}
                            className={cn('h-24 text-lg font-bold', buttonClass)}
                            disabled={isAnswered}
                        >
                            {q.correctAnswer}
                        </Button>
                    )
                })}
            </div>
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
