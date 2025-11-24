
"use client";

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, Lightbulb, PartyPopper, Repeat } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';

function GuessItGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [questionQueue, setQuestionQueue] = useState<Partial<Question>[]>([]);
    const [solvedAnswers, setSolvedAnswers] = useState<string[]>([]);
    
    const [wrongFeedbackId, setWrongFeedbackId] = useState<string | null>(null);
    const [isCorrectAnim, setIsCorrectAnim] = useState(false);
    const [gameState, setGameState] = useState<'start' | 'playing' | 'won'>('start');
    const [mistakeCount, setMistakeCount] = useState(0);
    const [score, setScore] = useState(0);
    const [scoreSaved, setScoreSaved] = useState(false);

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = useMemo(() => `Bil Bakalım - ${searchParams.get('topicName')}`, [searchParams]);

    const startGame = useCallback(() => {
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        setQuestionQueue(shuffled);
        setSolvedAnswers([]);
        setMistakeCount(0);
        setScore(0);
        setScoreSaved(false);
        setGameState('playing');
    }, [questions]);
    
    const handleAnswer = useCallback((selectedAnswer: string) => {
        if (isCorrectAnim || wrongFeedbackId !== null) return;

        const currentQ = questionQueue[0];
        if (!currentQ) return;

        if (selectedAnswer === currentQ.correctAnswer) {
            playSound('correct');
            setIsCorrectAnim(true);
            setScore(prev => prev + 15);
            setSolvedAnswers(prev => [...prev, selectedAnswer]);
            setTimeout(() => {
                setQuestionQueue(prev => prev.slice(1));
                setIsCorrectAnim(false);
            }, 600);
        } else {
            playSound('incorrect');
            setWrongFeedbackId(selectedAnswer);
            setScore(prev => Math.max(0, prev - 5));
            setMistakeCount(prev => prev + 1);
            setTimeout(() => {
                setQuestionQueue(prev => {
                    const wrongQ = prev[0];
                    const remaining = prev.slice(1);
                    return [...remaining, wrongQ];
                });
                setWrongFeedbackId(null);
            }, 600);
        }
    }, [isCorrectAnim, wrongFeedbackId, questionQueue]);
    
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
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams]);

    useEffect(() => {
        if (gameState === 'playing' && questions.length > 0 && questionQueue.length === 0 && solvedAnswers.length === questions.length) {
            setGameState('won');
        }
    }, [questionQueue, questions, solvedAnswers, gameState]);

    useEffect(() => {
        const saveScore = async () => {
             if (gameState === 'won' && user && score > 0 && !isStatic && !scoreSaved) {
                setScoreSaved(true); // Prevent multiple saves
                await submitBilBakalimScoreAction(user.uid, score, gameContext);
             }
        }
        if(gameState === 'won') {
            saveScore();
        }
    }, [gameState, user, score, isStatic, gameContext, scoreSaved]);
    
    const backUrl = isStatic ? '/statik' : '/teacher/activities';
    
    const currentQuestion = questionQueue.length > 0 ? questionQueue[0] : null;

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

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-rose-50 dark:bg-rose-900/50">
            <div className="w-full max-w-7xl mx-auto">
                <div className="w-full flex justify-between items-center mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-rose-600 header-font">Bil Bakalım?</h1>
                    <div className="text-right">
                        <div className="bg-white px-3 py-1 rounded-full shadow-sm text-sm font-bold text-gray-600 border border-rose-100">
                            Puan: <span className="text-rose-600 text-base">{score}</span>
                        </div>
                         <div className="text-xs text-muted-foreground mt-1">
                            Kalan Soru: {questionQueue.length}
                        </div>
                    </div>
                </div>

                {gameState === 'playing' && currentQuestion && (
                    <>
                        <div className={cn(
                            "w-full bg-white p-4 sm:p-8 rounded-3xl shadow-lg border-b-8 border-rose-200 mb-6 text-center min-h-[140px] sm:min-h-[180px] flex flex-col justify-center items-center relative overflow-hidden transition-colors duration-300",
                            isCorrectAnim && 'bg-green-50 border-green-200',
                            wrongFeedbackId && 'bg-red-50 border-red-200 animate-shake',
                            !wrongFeedbackId && 'animate-slide'
                        )}>
                            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Soru</div>
                            <h2 className={cn(
                                "text-lg sm:text-xl md:text-2xl font-bold leading-relaxed transition-colors",
                                wrongFeedbackId ? 'text-red-600' : 'text-gray-800'
                            )}>
                                {currentQuestion.text}
                            </h2>

                            {wrongFeedbackId && (
                                <div className="absolute bottom-2 text-red-500 font-bold text-sm">
                                    Yanlış! Bu soru sona atıldı.
                                </div>
                            )}
                            {isCorrectAnim && (
                                <div className="absolute bottom-2 text-green-600 font-bold text-sm animate-pop">
                                    Harika! Doğru Cevap.
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 w-full">
                            {questions.sort((a,b) => (a.correctAnswer || "").localeCompare(b.correctAnswer || "")).map((item) => {
                                const answer = item.correctAnswer || '';
                                const isCurrentCorrect = isCorrectAnim && currentQuestion && answer === currentQuestion.correctAnswer;
                                const isWrong = wrongFeedbackId === answer;

                                let btnClass = "concept-btn py-4 rounded-xl font-bold border-b-4 transition-all ";
                                
                                if (isCurrentCorrect) {
                                    btnClass += "bg-green-500 border-green-700 text-white transform scale-105 shadow-lg z-10";
                                } else if (isWrong) {
                                    btnClass += "bg-red-500 border-red-700 text-white animate-shake";
                                } else {
                                    btnClass += "bg-white border-rose-200 text-gray-700 hover:bg-rose-50 hover:border-rose-300 hover:-translate-y-1";
                                }

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleAnswer(answer)}
                                        disabled={isCorrectAnim || wrongFeedbackId !== null}
                                        className={cn("h-20 text-base", btnClass)}
                                    >
                                        {answer}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {gameState === 'start' && (
                    <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md border-4 border-rose-100 mt-10 mx-auto">
                        <div className="text-6xl mb-4">🤔</div>
                        <h1 className="text-3xl font-bold text-rose-600 mb-4 header-font">Hazır mısın?</h1>
                        <p className="text-gray-600 mb-8 text-lg">
                            Yukarıda soru çıkacak, aşağıdan cevabı bul. Yanlış cevaplanan sorular sona eklenecek.
                        </p>
                        <button 
                            onClick={startGame}
                            className="px-10 py-4 bg-rose-500 text-white font-bold rounded-full shadow-lg hover:bg-rose-600 hover:scale-105 transition-all text-xl"
                        >
                            BAŞLA
                        </button>
                    </div>
                )}

                {gameState === 'won' && (
                    <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md border-4 border-green-100 mt-10 mx-auto animate-pop">
                        <div className="text-6xl mb-4">🎉</div>
                        <h1 className="text-3xl font-bold text-green-600 mb-2 header-font">Tebrikler!</h1>
                        <p className="text-gray-600 mb-6">Tüm kavramları başarıyla öğrendin.</p>
                        
                         <div className="grid grid-cols-2 gap-4 mb-8">
                             <div className="bg-gray-50 p-4 rounded-xl">
                                <p className="text-sm text-gray-500">Toplam Puan</p>
                                <p className="text-2xl font-bold text-rose-500">{score}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <p className="text-sm text-gray-500">Yapılan Hata</p>
                                <p className="text-2xl font-bold text-rose-500">{mistakeCount}</p>
                            </div>
                        </div>

                        <button 
                            onClick={startGame}
                            className="w-full py-4 bg-rose-500 text-white font-bold rounded-full shadow-lg hover:bg-rose-600 transition-all"
                        >
                            TEKRAR OYNA
                        </button>
                    </div>
                )}
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

    