
'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, Lightbulb, PartyPopper, Repeat, Home } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';

function GuessItGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [questionQueue, setQuestionQueue] = useState<Partial<Question>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = useMemo(() => `Bil Bakalım - ${searchParams.get('topicName')}`, [searchParams]);

    const startGame = useCallback(() => {
        setQuestionQueue(questions.sort(() => 0.5 - Math.random()));
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setIsCorrect(null);
        setScore(0);
        setIsFinished(false);
        setIsSaving(false);
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
                setQuestionQueue(result.questions.sort(() => 0.5 - Math.random()));
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic]);
    
    const currentQuestion = questionQueue.length > 0 ? questionQueue[0] : null;

    const handleAnswer = useCallback((answer: string | null) => {
        if (isAnswered) return;

        const currentQ = questionQueue[0];
        if (!currentQ) return;
        
        const isCorrectGuess = answer === currentQ.correctAnswer;
        
        setIsAnswered(true);
        setIsCorrect(isCorrectGuess);
        setSelectedAnswer(answer);

        if (isCorrectGuess) {
            playSound('correct');
            setScore(prev => prev + 15);
            // Correctly answered, remove from queue
            setTimeout(() => {
                 setQuestionQueue(prev => prev.slice(1));
                 setIsAnswered(false);
                 setSelectedAnswer(null);
            }, 1000);
        } else {
            playSound('incorrect');
            setScore(prev => Math.max(0, prev - 5));
            // Incorrect, move to back of the queue
             setTimeout(() => {
                setQuestionQueue(prev => {
                    const incorrectQ = prev[0];
                    const remaining = prev.slice(1);
                    return [...remaining, incorrectQ];
                });
                setIsAnswered(false);
                setSelectedAnswer(null);
            }, 1000);
        }
    }, [isAnswered, questionQueue]);
    
    useEffect(() => {
        if (questionQueue.length === 0 && questions.length > 0 && !isLoading) {
            if (user && score > 0 && !isStatic) {
                submitBilBakalimScoreAction(user.uid, score, gameContext);
            }
            setIsFinished(true);
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
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Tebrikler!</CardTitle>
                        <CardDescription>Tüm kavramları öğrendin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PartyPopper className="h-20 w-20 text-green-500 mx-auto mb-4" />
                        <p className="text-xl">Kazandığın Puan: <span className="font-bold text-primary">{score}</span></p>
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
    
    if (!currentQuestion) {
         return (
             <div className="flex h-screen w-full items-center justify-center">
                 <p className="text-muted-foreground">Sorular hazırlanıyor...</p>
             </div>
         )
    }

    return (
        <div className="flex flex-col min-h-screen w-full items-center justify-center p-4 bg-teal-50 dark:bg-teal-900/50">
            <Card className="w-full max-w-xl text-center">
                 <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">Soru {questions.length - questionQueue.length + 1}/{questions.length}</CardTitle>
                        <div className="text-lg font-bold text-primary">Puan: {score}</div>
                    </div>
                </CardHeader>
                <CardContent className="min-h-[200px] flex items-center justify-center">
                    <h2 className="text-xl sm:text-2xl font-semibold italic">"{currentQuestion.text}"</h2>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 mt-6">
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                         {questions.map((q, index) => {
                             const answer = q.correctAnswer!;
                             const isCorrectOption = answer === currentQuestion.correctAnswer;
                             const isSelected = answer === selectedAnswer;

                             let buttonClass = 'bg-teal-600 hover:bg-teal-700';

                              if (isAnswered) {
                                if (isCorrectOption) {
                                    buttonClass = 'bg-green-500 hover:bg-green-600 animate-tada';
                                } else if (isSelected) {
                                    buttonClass = 'bg-red-500 hover:bg-red-600 animate-shake';
                                } else {
                                    buttonClass = 'bg-gray-400 opacity-50';
                                }
                            }
                             
                             return (
                                <Button 
                                    key={`${q.id}-${index}`} 
                                    className={cn("h-16 text-lg", buttonClass)}
                                    onClick={() => handleAnswer(answer)}
                                    disabled={isAnswered}
                                >
                                    {isAnswered && isCorrectOption && <CheckCircle2 className="mr-2 h-5 w-5"/>}
                                    {isAnswered && isSelected && !isCorrectOption && <XCircle className="mr-2 h-5 w-5"/>}
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
