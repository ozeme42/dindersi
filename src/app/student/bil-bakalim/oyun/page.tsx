
"use client";

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, Repeat, Home } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

function GuessItGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [questionQueue, setQuestionQueue] = useState<Partial<Question>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentQuestion, setCurrentQuestion] = useState<Partial<Question> | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mistakeCount, setMistakeCount] = useState(0);

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Bil Bakalım - ${searchParams.get('courseName') || ''} > ${searchParams.get('topicName') || ''}`;

    useEffect(() => {
        const fetchQuestions = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getBilBakalimAction(params);
            if (result.error || !result.questions || result.questions.length === 0) {
                setError(result.error || "Bu konu için uygun soru bulunamadı.");
            } else {
                const allQuestions = result.questions.sort(() => 0.5 - Math.random());
                setQuestions(allQuestions);
                setQuestionQueue(allQuestions);
                setCurrentQuestion(allQuestions[0]);
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic]);
    
    const handleAnswer = (answer: string) => {
        if (isAnswered) return;

        const isCorrect = answer === currentQuestion?.correctAnswer;
        setSelectedAnswer(answer);
        setIsAnswered(true);

        if (isCorrect) {
            playSound('correct');
            setScore(prev => prev + 15);
             setTimeout(() => {
                const newQueue = questionQueue.slice(1);
                setQuestionQueue(newQueue);
                if (newQueue.length > 0) {
                    setCurrentQuestion(newQueue[0]);
                    setIsAnswered(false);
                    setSelectedAnswer(null);
                }
            }, 1200);
        } else {
            playSound('incorrect');
            setMistakeCount(prev => prev + 1);
            setScore(prev => Math.max(0, prev - 5));
            setTimeout(() => {
                const failedQuestion = questionQueue[0];
                const newQueue = [...questionQueue.slice(1), failedQuestion];
                setQuestionQueue(newQueue);
                setCurrentQuestion(newQueue[0]);
                setIsAnswered(false);
                setSelectedAnswer(null);
            }, 1200);
        }
    };
    
    useEffect(() => {
        if (!isLoading && user && questionQueue.length === 0 && questions.length > 0) {
            setIsFinished(true);
            if (score > 0 && !isStatic) {
                submitBilBakalimScoreAction(user.uid, score, gameContext);
            }
        }
    }, [questionQueue, questions, isLoading, user, score, isStatic, gameContext]);
    
    const backUrl = isStatic ? '/statik' : '/teacher/activities';
    
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
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-4xl font-bold text-primary">{score}</p>
                            <p className="text-muted-foreground">Toplam Puan</p>
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-red-500">{mistakeCount}</p>
                            <p className="text-xs text-muted-foreground">Yapılan Hata</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={() => window.location.reload()} className="w-full">Tekrar Oyna</Button>
                        <Button variant="outline" asChild className="w-full">
                           <Link href="/student/bil-bakalim">Etkinlik Merkezine Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (!currentQuestion) return null;

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-4 bg-teal-50 dark:bg-teal-900/50">
            <div className="w-full max-w-5xl">
                <div className="flex justify-between items-center mb-4">
                     <div className="w-24">
                        <Link href="/student/bil-bakalim">
                            <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4"/>Çık</Button>
                        </Link>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-lg font-bold text-primary">Puan: {score}</p>
                        <p className="text-sm text-muted-foreground">Kalan: {questionQueue.length}/{questions.length}</p>
                    </div>
                    <div className="w-24"/>
                </div>

                <div className="text-center bg-background/50 border-2 border-primary/20 p-6 rounded-lg shadow-lg relative mt-2">
                    <p className="text-xl sm:text-2xl font-semibold italic">"{currentQuestion.text}"</p>
                </div>
                
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full mt-6">
                    {questions.map((q) => {
                        const answer = q.correctAnswer;
                        if (!answer) return null;

                        const isAnsweredForThisQ = questionQueue.find(qu => qu.id === q.id) === undefined;
                        const isTheCorrectAnswer = answer === currentQuestion.correctAnswer;
                        const isSelected = answer === selectedAnswer;

                        let buttonClass = 'bg-white hover:bg-gray-100 text-gray-800';

                        if (isAnswered) {
                            if (isSelected) {
                                buttonClass = isTheCorrectAnswer ? 'bg-green-500 animate-tada' : 'bg-red-500 animate-shake';
                            } else if(isTheCorrectAnswer) {
                                buttonClass = 'bg-green-500 animate-tada';
                            } else {
                                buttonClass = 'opacity-50 bg-gray-300';
                            }
                        }

                        return (
                            <Button
                                key={q.id}
                                variant="outline"
                                className={`h-24 text-lg font-bold transition-all duration-300 ${buttonClass}`}
                                onClick={() => handleAnswer(answer)}
                                disabled={isAnswered || isAnsweredForThisQ}
                            >
                                {answer}
                            </Button>
                        );
                    })}
                </div>
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

