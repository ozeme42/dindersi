
"use client";

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, Lightbulb, Repeat, Home } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { cn } from "@/lib/utils";

function GuessItGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
    const [allAnswers, setAllAnswers] = useState<string[]>([]);
    const [solvedQuestions, setSolvedQuestions] = useState<string[]>([]);

    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [mistakeCount, setMistakeCount] = useState(0);
    const [score, setScore] = useState(0);
    const [scoreSaved, setScoreSaved] = useState(false);

    const [isFinished, setIsFinished] = useState(false);
    
    const isStatic = searchParams.get('static') === 'true';
    const gameContext = useMemo(() => `Bil Bakalım - ${searchParams.get('topicName')}`, [searchParams]);

    const startGame = useCallback((questionsToPlay: Question[]) => {
        const shuffled = [...questionsToPlay].sort(() => 0.5 - Math.random());
        setQuestionQueue(shuffled);
        
        const allPossibleAnswers = Array.from(new Set(questionsToPlay.map(q => q.correctAnswer!)));
        setAllAnswers(allPossibleAnswers.sort(() => 0.5 - Math.random()));
        
        setSolvedQuestions([]);
        setScore(0);
        setMistakeCount(0);
        setIsFinished(false);
        setIsAnswered(false);
        setSelectedOption(null);
        setIsCorrect(null);
        setScoreSaved(false);
    }, []);

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
                startGame(result.questions);
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, startGame]);
    
    const currentQuestion = questionQueue.length > 0 ? questionQueue[0] : null;

    const handleAnswer = (selectedAnswer: string) => {
        if (!currentQuestion || isAnswered) return;
        
        const correct = selectedAnswer === currentQuestion.correctAnswer;
        setSelectedOption(selectedAnswer);
        setIsAnswered(true);
        setIsCorrect(correct);

        if (correct) {
            playSound('correct');
            setScore(prev => prev + 15);
            setSolvedQuestions(prev => [...prev, currentQuestion.id]);

            setTimeout(() => {
                setQuestionQueue(prev => prev.slice(1));
                setIsAnswered(false);
                setSelectedOption(null);
                setIsCorrect(null);
            }, 1200);

        } else {
            playSound('incorrect');
            setScore(prev => Math.max(0, prev - 5));
            setMistakeCount(prev => prev + 1);
            
            setTimeout(() => {
                setQuestionQueue(prev => {
                    const wrongQ = prev[0];
                    const remaining = prev.slice(1);
                    return [...remaining, wrongQ];
                });
                setIsAnswered(false);
                setSelectedOption(null);
                setIsCorrect(null);
            }, 1200);
        }
    };
    
    useEffect(() => {
        const finishGame = async () => {
             if (user && score > 0 && !isStatic && !scoreSaved) {
                await submitBilBakalimScoreAction(user.uid, score, gameContext);
                setScoreSaved(true);
             }
        }

        if (!isLoading && questionQueue.length === 0 && questions.length > 0) {
            setIsFinished(true);
            finishGame();
        }
    }, [questionQueue, questions, isLoading, user, score, isStatic, gameContext, scoreSaved]);
    
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
            <div className="flex h-screen w-full items-center justify-center p-4 sm:p-6">
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
                        <Button onClick={() => startGame(questions)} className="w-full">Tekrar Oyna</Button>
                        <Button variant="outline" asChild className="w-full">
                           <Link href={backUrl}>Etkinlik Merkezine Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (!currentQuestion) return <div className="flex h-screen w-full items-center justify-center">Yükleniyor...</div>;

    return (
        <div className="min-h-screen flex flex-col items-center justify-start py-6 px-4 max-w-3xl mx-auto">
             <div className="w-full flex justify-between items-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-rose-600 header-font">Bil Bakalım?</h1>
                <div className="flex items-center gap-4">
                    <div className="bg-white px-3 py-1 rounded-full shadow-sm text-sm font-bold text-gray-600 border border-rose-100">
                        Puan: <span className="text-rose-600 text-base">{score}</span>
                    </div>
                     <div className="bg-white px-3 py-1 rounded-full shadow-sm text-sm font-bold text-gray-600 border border-rose-100">
                        Kalan: <span className="text-rose-600 text-base">{questionQueue.length}</span>
                    </div>
                </div>
            </div>

            <div className={cn("w-full bg-white p-4 sm:p-8 rounded-3xl shadow-lg border-b-8 border-rose-200 mb-8 text-center min-h-[140px] sm:min-h-[180px] flex flex-col justify-center items-center relative overflow-hidden transition-colors duration-300", 
                isAnswered && isCorrect && 'bg-green-50 border-green-200',
                isAnswered && !isCorrect && 'bg-red-50 border-red-200 animate-shake'
            )}>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Soru</div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold leading-relaxed text-gray-800">
                    {currentQuestion.text}
                </h2>
                {isAnswered && (
                     <div className="absolute bottom-2 text-sm font-bold">
                        {isCorrect ? <p className="text-green-600 animate-pop">Doğru!</p> : <p className="text-red-600">Yanlış! Soru sona eklendi.</p>}
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
                {allAnswers.map((answer, index) => {
                    const isCorrectAnswer = answer === currentQuestion.correctAnswer;
                    const isSelected = answer === selectedOption;
                    let buttonClass = '';

                    if (isAnswered) {
                        if (isCorrectAnswer) {
                            buttonClass = "bg-green-500 border-green-700 text-white transform scale-105 shadow-lg z-10";
                        } else if (isSelected) {
                            buttonClass = "bg-red-500 border-red-700 text-white animate-shake";
                        } else {
                            buttonClass = "bg-white border-rose-200 text-gray-400 opacity-50";
                        }
                    } else {
                        buttonClass = "bg-white border-rose-200 text-gray-700 hover:bg-rose-50 hover:border-rose-300 hover:-translate-y-1";
                    }

                    return (
                        <Button 
                            key={`${answer}-${index}`} 
                            className={cn("h-16 text-sm sm:h-20 sm:text-base", buttonClass)}
                            onClick={() => handleAnswer(answer)}
                            disabled={isAnswered}
                        >
                            {answer}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}

function GuessItPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <GuessItGame />
    </Suspense>
  );
}

export default GuessItPage;

    