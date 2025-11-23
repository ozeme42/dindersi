
"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Check, X, AlertTriangle, Link2, Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { updateScore } from '../../actions';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';

function TrueFalseChainGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const isStatic = searchParams.get('static') === 'true';

    useEffect(() => {
        const fetchQuestions = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: parseInt(searchParams.get('questionCount') || '15'),
                questionTypes: ['tf'],
                isStatic,
            };
            const result = await getQuestionsFromBank(params);
            if (result.error) {
                setError(result.error);
            } else if (result.questions && result.questions.length > 0) {
                setQuestions(result.questions);
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic]);
    
    const currentQuestion = questions[currentQuestionIndex];

    const handleAnswer = useCallback(async (userAnswer: boolean) => {
        if (answerFeedback) return; // Prevent multiple answers

        const correctAnswer = (currentQuestion as Question)?.isTrue;
        
        if (userAnswer === correctAnswer) {
            playSound('correct');
            setAnswerFeedback('correct');
            const pointsEarned = 10 + (streak * 2);
            setScore(prev => prev + pointsEarned);
            setStreak(prev => prev + 1);
        } else {
            playSound('incorrect');
            setAnswerFeedback('incorrect');
            setStreak(0);
        }

        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setAnswerFeedback(null);
            } else {
                setIsFinished(true);
            }
        }, 1200);
    }, [answerFeedback, currentQuestion, currentQuestionIndex, questions.length, streak]);

    useEffect(() => {
        const handleFinish = async () => {
             if (user && score > 0 && !isStatic) {
                await updateScore(user.uid, score, "dy-zinciri", `Konu: ${searchParams.get('topicName')}`);
             }
        }
        if (isFinished) {
            handleFinish();
        }
    }, [isFinished, user, score, searchParams, isStatic]);
    
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
                        <CardDescription>Doğru/Yanlış Zinciri etkinliğini tamamladınız.</CardDescription>
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
    
    if (!currentQuestion) return null;

    return (
        <div className="flex h-screen w-full items-center justify-center p-4 bg-green-50 dark:bg-green-900/50">
            <Card className="w-full max-w-2xl">
                 <CardHeader>
                    <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mb-4" />
                    <div className="flex justify-between items-center text-lg">
                        <div className="font-bold text-primary">Puan: {score}</div>
                         <div className="flex items-center gap-1 font-bold text-amber-500">
                            <Star className="h-5 w-5 fill-current" />
                            Seri: {streak}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                    <div className="min-h-[120px] p-6 rounded-lg bg-muted flex items-center justify-center">
                        <p className="text-2xl font-semibold">{currentQuestion.text}</p>
                    </div>
                    {answerFeedback && (
                        <div className={`p-3 rounded-md text-xl font-bold ${answerFeedback === 'correct' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                            {answerFeedback === 'correct' ? 'Doğru!' : 'Yanlış!'}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-4 mt-6">
                    <Button 
                        className="h-24 text-2xl font-bold bg-green-600 hover:bg-green-700" 
                        onClick={() => handleAnswer(true)} 
                        disabled={!!answerFeedback}
                    >
                        <Check className="mr-3 h-8 w-8" /> Doğru
                    </Button>
                    <Button 
                        className="h-24 text-2xl font-bold bg-red-600 hover:bg-red-700" 
                        onClick={() => handleAnswer(false)} 
                        disabled={!!answerFeedback}
                    >
                        <X className="mr-3 h-8 w-8" /> Yanlış
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function TrueFalseChainPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <TrueFalseChainGame />
        </Suspense>
    );
}
