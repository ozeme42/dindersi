
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
import { updateScore } from '../../actions';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';

function GuessItGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

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
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic]);
    
    const currentQuestion = questions[currentQuestionIndex];

    const handleFlip = () => {
        setIsFlipped(true);
        playSound('correct'); // Simple sound for reveal
    };

    const handleNext = async (knewIt: boolean) => {
        const points = knewIt ? 10 : 0;
        const newTotalScore = score + points;
        setScore(newTotalScore);

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setIsFlipped(false);
        } else {
            if (user && newTotalScore > 0 && !isStatic) {
                await submitBilBakalimScoreAction(user.uid, newTotalScore, gameContext);
            }
            setIsFinished(true);
        }
    };

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
        <div className="flex h-screen w-full items-center justify-center p-4 bg-teal-50 dark:bg-teal-900/50">
            <Card className="w-full max-w-xl text-center">
                 <CardHeader>
                    <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mb-4" />
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">Kart {currentQuestionIndex + 1}/{questions.length}</CardTitle>
                        <div className="text-lg font-bold text-primary">Puan: {score}</div>
                    </div>
                </CardHeader>
                <CardContent 
                    className="h-64 w-full rounded-lg text-white flex items-center justify-center p-6 cursor-pointer [perspective:1000px]"
                    onClick={!isFlipped ? handleFlip : undefined}
                >
                    <div className={`relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                         {/* Front */}
                        <div className="absolute w-full h-full [backface-visibility:hidden] rounded-lg bg-teal-600 flex flex-col items-center justify-center p-4">
                            <Brain className="h-8 w-8 mb-2" />
                            <p className="text-xl font-semibold">{currentQuestion.text?.replace('___', '...')}</p>
                        </div>
                        {/* Back */}
                        <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-lg bg-green-600 flex flex-col items-center justify-center p-4">
                             <p className="text-3xl font-bold">{currentQuestion.correctAnswer}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center gap-4 mt-6">
                    {isFlipped ? (
                        <>
                            <Button onClick={() => handleNext(false)} variant="destructive" className="w-32">
                                <XCircle className="mr-2 h-5 w-5"/> Bilemedim
                            </Button>
                             <Button onClick={() => handleNext(true)} className="w-32 bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="mr-2 h-5 w-5"/> Bildim
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleFlip}>
                           Cevabı Göster
                        </Button>
                    )}
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
