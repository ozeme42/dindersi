
'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, PartyPopper, Repeat, Home, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { cn } from "@/lib/utils";

function GuessItGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Game State
    const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
    const [solvedIds, setSolvedIds] = useState<string[]>([]);
    const [wrongFeedbackId, setWrongFeedbackId] = useState<string | null>(null);
    const [isCorrectAnim, setIsCorrectAnim] = useState(false);
    const [gameState, setGameState] = useState('start'); // start, playing, won
    const [mistakeCount, setMistakeCount] = useState(0);
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false); // New state to prevent multiple saves

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = useMemo(() => `Bil Bakalım - ${searchParams.get('courseName') || ''} > ${searchParams.get('topicName') || ''}`, [searchParams]);

    const startGame = useCallback(() => {
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        setQuestionQueue(shuffled);
        setSolvedIds([]);
        setMistakeCount(0);
        setScore(0);
        setGameState('playing');
        setScoreSaved(false);
    }, [questions]);
    
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
                setQuestions(result.questions);
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams]);

    const handleAnswer = (selectedId: string) => {
        if (isCorrectAnim || wrongFeedbackId !== null) return;

        const currentQ = questionQueue[0];
        if (!currentQ) return;

        if (selectedId === currentQ.id) {
            // CORRECT
            playSound('correct');
            setIsCorrectAnim(true);
            setSolvedIds(prev => [...prev, selectedId]);
            setScore(prev => prev + 15);
            
            setTimeout(() => {
                setQuestionQueue(prevQueue => prevQueue.slice(1));
                setIsCorrectAnim(false);
            }, 600);

        } else {
            // INCORRECT
            playSound('incorrect');
            setWrongFeedbackId(selectedId);
            setMistakeCount(prev => prev + 1);
            setScore(prev => Math.max(0, prev - 5));

            setTimeout(() => {
                setQuestionQueue(prevQueue => {
                    const wrongQuestion = prevQueue[0];
                    const remaining = prevQueue.slice(1);
                    return [...remaining, wrongQuestion];
                });
                setWrongFeedbackId(null);
            }, 600);
        }
    };
    
    useEffect(() => {
        if (gameState === 'playing' && !isLoading && questions.length > 0 && questionQueue.length === 0) {
            setGameState('won');
        }
    }, [questionQueue, questions, gameState, isLoading]);

    useEffect(() => {
        const saveScore = async () => {
            if (gameState === 'won' && user && score > 0 && !isStatic && !scoreSaved) {
                setIsSaving(true);
                setScoreSaved(true); // Prevent future saves
                const result = await submitBilBakalimScoreAction(user.uid, score, gameContext);
                if (!result.success) {
                    toast({ title: 'Hata', description: result.error, variant: 'destructive' });
                    setScoreSaved(false); // Allow retry on failure
                } else {
                     toast({ title: 'Başarılı!', description: `Puanınız kaydedildi.` });
                }
                setIsSaving(false);
            }
        };
        saveScore();
    }, [gameState, user, score, isStatic, gameContext, scoreSaved, toast]);

    const backUrl = isStatic ? '/statik' : '/teacher/activities';
    
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                 <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Oyun Yüklenemedi</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4">
                        <Button asChild variant="secondary">
                            <Link href="/student/bil-bakalim">Konu Seçimine Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }
    
    const currentQuestion = questionQueue.length > 0 ? questionQueue[0] : null;

    if (gameState === 'start') {
        return (
             <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-4">
                <Card className="max-w-md text-center border-4 border-rose-100">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold text-rose-600 header-font">Hazır mısın?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600 mb-8 text-lg">
                            Yukarıda soru çıkacak, aşağıdan cevabı bul.<br/>
                            <span className="text-rose-500 font-bold text-sm">Dikkat: Yanlış cevaplanan sorular sona eklenir!</span>
                        </p>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={startGame} className="w-full text-xl h-14 bg-rose-500 hover:bg-rose-600">BAŞLA</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (gameState === 'won') {
        return (
            <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
                <Card className="max-w-md text-center border-4 border-green-100 animate-pop">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold text-green-600 header-font">🎉 Tebrikler! 🎉</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600 mb-6">Tüm kavramları başarıyla öğrendin.</p>
                        <div className="bg-gray-50 p-4 rounded-xl mb-4">
                             <p className="text-sm text-gray-500">Kazandığın Puan</p>
                             <p className="text-4xl font-bold text-primary">{score}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-sm text-gray-500">Yapılan Hata/Tekrar Sayısı</p>
                            <p className="text-2xl font-bold text-rose-500">{mistakeCount}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={startGame} className="w-full">
                            <Repeat className="mr-2 h-4 w-4"/> TEKRAR OYNA
                        </Button>
                        <Button onClick={() => router.push('/student')} className="w-full" variant="outline">
                            <Home className="mr-2 h-4 w-4"/> Panele Dön
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-start py-6 px-4 max-w-3xl mx-auto">
             <div className="w-full flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-rose-600 header-font">Bil Bakalım?</h1>
                 <div className="flex gap-4">
                    <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 border border-rose-100">
                        Puan: <span className="text-rose-600 text-lg">{score}</span>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 border border-rose-100">
                        Kalan: <span className="text-rose-600 text-lg">{questionQueue.length}</span>
                    </div>
                </div>
            </div>

            {currentQuestion && (
                <>
                    <Card className={cn(
                        "w-full p-8 rounded-3xl shadow-lg border-b-8 border-rose-200 mb-8 text-center min-h-[180px] flex flex-col justify-center items-center relative overflow-hidden transition-colors duration-300",
                        isCorrectAnim && 'bg-green-50 border-green-200',
                        wrongFeedbackId && 'bg-red-50 border-red-200 animate-shake'
                    )}>
                        <CardDescription className="uppercase tracking-widest mb-2">Soru</CardDescription>
                        <CardTitle className={cn("text-xl md:text-2xl font-bold leading-relaxed transition-colors", wrongFeedbackId ? 'text-red-600' : 'text-gray-800')}>
                            {currentQuestion.text}
                        </CardTitle>
                        {wrongFeedbackId && <div className="absolute bottom-2 text-red-500 font-bold text-sm">Yanlış! Bu soru sona atıldı.</div>}
                        {isCorrectAnim && <div className="absolute bottom-2 text-green-600 font-bold text-sm animate-pop">Harika! Doğru Cevap.</div>}
                    </Card>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
                        {questions.sort((a,b) => (a.id > b.id ? 1 : -1)).map(q => {
                            const isCurrentCorrect = isCorrectAnim && currentQuestion && q.id === currentQuestion.id;
                            const isWrong = wrongFeedbackId === q.id;
                            let buttonClass = "concept-btn py-4 rounded-xl font-bold text-sm md:text-base border-b-4 transition-all ";
                             if (isCurrentCorrect) {
                                buttonClass += "bg-green-500 border-green-700 text-white transform scale-105 shadow-lg z-10";
                            } else if (isWrong) {
                                buttonClass += "bg-red-500 border-red-700 text-white animate-shake";
                            } else {
                                buttonClass += "bg-white border-rose-200 text-gray-700 hover:bg-rose-50 hover:border-rose-300 hover:-translate-y-1";
                            }
                            return (
                                <Button 
                                    key={q.id} 
                                    className={buttonClass}
                                    onClick={() => handleAnswer(q.id)}
                                    disabled={isCorrectAnim || wrongFeedbackId !== null}
                                >
                                    {q.correctAnswer}
                                </Button>
                            )
                        })}
                    </div>
                </>
            )}
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
