
"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, Brain } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';

function GuessItGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [questionQueue, setQuestionQueue] = useState<Partial<Question>[]>([]);
    const [score, setScore] = useState(0);
    const [mistakeCount, setMistakeCount] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    
    const [wrongFeedbackId, setWrongFeedbackId] = useState<string | null>(null);
    const [isCorrectAnim, setIsCorrectAnim] = useState(false);

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Bil Bakalım - ${searchParams.get('topicName')}`;

    const startGame = useCallback(() => {
        setQuestionQueue(questions.sort(() => Math.random() - 0.5));
        setScore(0);
        setMistakeCount(0);
        setIsFinished(false);
    }, [questions]);

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
                setQuestionQueue(result.questions.sort(() => Math.random() - 0.5));
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic]);
    
    const currentQuestion = questionQueue.length > 0 ? questionQueue[0] : null;

    const handleAnswer = (selectedId: string) => {
        if (isCorrectAnim || wrongFeedbackId) return;

        if (selectedId === currentQuestion?.id) {
            // Correct Answer
            playSound('correct');
            setIsCorrectAnim(true);
            setScore(prev => prev + 15);
            
            setTimeout(() => {
                setQuestionQueue(prev => prev.slice(1));
                setIsCorrectAnim(false);
            }, 600);
        } else {
            // Wrong Answer
            playSound('incorrect');
            setWrongFeedbackId(selectedId);
            setScore(prev => Math.max(0, prev - 5));
            setMistakeCount(prev => prev + 1);

            setTimeout(() => {
                setQuestionQueue(prev => {
                    const wrongQ = prev[0];
                    return [...prev.slice(1), wrongQ];
                });
                setWrongFeedbackId(null);
            }, 800);
        }
    };
    
    useEffect(() => {
        if (gameState !== 'playing' && !isLoading && questions.length > 0 && questionQueue.length === 0) {
            setIsFinished(true);
            if (user && score > 0 && !isStatic) {
                submitBilBakalimScoreAction(user.uid, score, gameContext);
            }
        }
    }, [questionQueue, questions, gameState, isLoading, user, score, isStatic, gameContext]);
    
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
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">{score}</p>
                        <p className="text-muted-foreground">Toplam Puan</p>
                        <p className="text-sm text-red-500 mt-2">{mistakeCount} hata yapıldı.</p>
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
    
    if (!currentQuestion) return (
        <div className="flex h-screen w-full items-center justify-center">
             <Button onClick={startGame}>Oyuna Başla</Button>
        </div>
    );

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-4 bg-teal-50 dark:bg-teal-900/50">
            <div className="w-full max-w-4xl">
                 <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-center">Bil Bakalım</h1>
                     <div className="flex items-center gap-4">
                        <span className="font-bold text-lg">Kalan: {questionQueue.length}/{questions.length}</span>
                        <span className="font-bold text-lg text-primary">Puan: {score}</span>
                     </div>
                </div>
                <Card className={cn(isCorrectAnim ? 'bg-green-50' : wrongFeedbackId ? 'bg-red-50 animate-shake' : 'bg-white')}>
                    <CardHeader className="text-center">
                        <CardDescription className="text-lg">Bu tanım hangi kavrama aittir?</CardDescription>
                        <CardTitle className="text-2xl pt-2">{currentQuestion.text}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {questions.map((q) => (
                                <Button
                                    key={q.id}
                                    variant={isCorrectAnim && q.id === currentQuestion.id ? 'default' : 'outline'}
                                    className={cn(
                                        "h-20 text-lg",
                                        isCorrectAnim && q.id === currentQuestion.id && 'bg-green-500',
                                        wrongFeedbackId === q.id && 'bg-red-500 text-white'
                                    )}
                                    onClick={() => handleAnswer(q.id)}
                                    disabled={isCorrectAnim || !!wrongFeedbackId}
                                >
                                    {q.correctAnswer}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
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
