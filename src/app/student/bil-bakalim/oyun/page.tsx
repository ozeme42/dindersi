
'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function GuessItGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();

    // Game Data
    const [allConcepts, setAllConcepts] = useState<Question[]>([]);
    const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
    const [solvedIds, setSolvedIds] = useState<string[]>([]);
    
    // Game State
    const [gameState, setGameState] = useState<'loading' | 'start' | 'playing' | 'won'>('loading');
    const [mistakeCount, setMistakeCount] = useState(0);
    const [score, setScore] = useState(0);
    
    // UI State
    const [isCorrectAnim, setIsCorrectAnim] = useState(false);
    const [wrongFeedbackId, setWrongFeedbackId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = useMemo(() => `Bil Bakalım - ${searchParams.get('topicName')}`, [searchParams]);
    
    const fetchQuestions = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getBilBakalimAction(params);
        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu konu için uygun soru bulunamadı.");
            setGameState('error');
        } else {
            setAllConcepts(result.questions);
            setGameState('start');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    const startGame = useCallback(() => {
        const shuffled = [...allConcepts].sort(() => Math.random() - 0.5);
        setQuestionQueue(shuffled);
        setSolvedIds([]);
        setMistakeCount(0);
        setScore(0);
        setGameState('playing');
    }, [allConcepts]);

    const handleAnswer = (selectedAnswer: string) => {
        if (isCorrectAnim || wrongFeedbackId) return;

        const currentQ = questionQueue[0];
        if (!currentQ) return;

        if (selectedAnswer === currentQ.correctAnswer) {
            // CORRECT
            setIsCorrectAnim(true);
            setSolvedIds(prev => [...prev, currentQ.id]);
            setScore(prev => prev + 15);

            setTimeout(() => {
                setQuestionQueue(prev => prev.slice(1));
                setIsCorrectAnim(false);
            }, 600);
        } else {
            // INCORRECT
            const wrongItem = allConcepts.find(c => c.correctAnswer === selectedAnswer);
            if (wrongItem) setWrongFeedbackId(wrongItem.id);
            
            setMistakeCount(prev => prev + 1);
            setScore(prev => Math.max(0, prev - 5));

            setTimeout(() => {
                setQuestionQueue(prev => {
                    const wrongQuestion = prev[0];
                    const remaining = prev.slice(1);
                    return [...remaining, wrongQuestion];
                });
                setWrongFeedbackId(null);
            }, 600);
        }
    };
    
    useEffect(() => {
        if (gameState === 'playing' && questionQueue.length === 0 && allConcepts.length > 0) {
            setGameState('won');
        }
    }, [questionQueue, gameState, allConcepts.length]);
    
    useEffect(() => {
        if (gameState === 'won' && !isSaving && user && score > 0 && !isStatic) {
            const saveScore = async () => {
                setIsSaving(true);
                const result = await submitBilBakalimScoreAction(user.uid, score, gameContext);
                if (result.success) {
                    toast({ title: 'Başarılı!', description: 'Puanın kaydedildi.' });
                } else {
                    toast({ title: 'Hata', description: result.error, variant: 'destructive' });
                }
                setIsSaving(false);
            }
            saveScore();
        }
    }, [gameState, isSaving, user, score, gameContext, isStatic, toast]);


    const backUrl = isStatic ? '/statik' : '/teacher/activities';
    const currentQuestion = questionQueue.length > 0 ? questionQueue[0] : null;

    if (gameState === 'loading') {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (gameState === 'error') {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                 <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Oyun Yüklenemedi</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                     <div className="mt-4">
                        <Button asChild variant="secondary">
                            <Link href="/student/bil-bakalim">Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen flex flex-col items-center justify-start py-6 px-4 max-w-3xl mx-auto">
            <div className="w-full flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-rose-600 header-font">Bil Bakalım?</h1>
                <div className="flex items-center gap-4">
                    <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 border border-rose-100">
                        Puan: <span className="text-rose-600 text-lg">{score}</span>
                    </div>
                     <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 border border-rose-100">
                        Kalan: <span className="text-rose-600 text-lg">{questionQueue.length}</span>
                    </div>
                </div>
            </div>

            {gameState === 'playing' && currentQuestion && (
                <>
                    <div className={cn(
                        "w-full bg-white p-8 rounded-3xl shadow-lg border-b-8 border-rose-200 mb-8 text-center min-h-[180px] flex flex-col justify-center items-center relative overflow-hidden transition-colors duration-300",
                        isCorrectAnim ? 'bg-green-50 border-green-200' : '',
                        wrongFeedbackId ? 'bg-red-50 border-red-200 animate-shake' : 'animate-slide'
                    )}>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Soru</div>
                        <h2 className={cn("text-xl md:text-2xl font-bold leading-relaxed transition-colors", wrongFeedbackId ? 'text-red-600' : 'text-gray-800')}>
                            {currentQuestion.text}
                        </h2>
                        {wrongFeedbackId && <div className="absolute bottom-2 text-red-500 font-bold text-sm">Yanlış! Bu soru sona atıldı.</div>}
                        {isCorrectAnim && <div className="absolute bottom-2 text-green-600 font-bold text-sm animate-pop">Harika! Doğru Cevap.</div>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
                        {allConcepts.sort((a, b) => a.id.localeCompare(b.id)).map((item) => {
                            const isCurrentCorrect = isCorrectAnim && currentQuestion && item.id === currentQuestion.id;
                            const isWrong = wrongFeedbackId === item.id;
                            let btnClass = "concept-btn py-4 rounded-xl font-bold text-sm md:text-base border-b-4 transition-all ";
                            
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
                                    onClick={() => handleAnswer(item.correctAnswer!)}
                                    disabled={isCorrectAnim || !!wrongFeedbackId}
                                    className={btnClass}
                                >
                                    {item.correctAnswer}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {gameState === 'start' && (
                <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md border-4 border-rose-100 mt-10">
                    <div className="text-6xl mb-4">🤔</div>
                    <h1 className="text-3xl font-bold text-rose-600 mb-4 header-font">Hazır mısın?</h1>
                    <p className="text-gray-600 mb-8 text-lg">
                        Yukarıda soru çıkacak, aşağıdan cevabı bul.
                        <span className="text-rose-500 font-bold text-sm block mt-2">Yanlış bildiğin sorular sona eklenecek!</span>
                    </p>
                    <button onClick={startGame} className="px-10 py-4 bg-rose-500 text-white font-bold rounded-full shadow-lg hover:bg-rose-600 hover:scale-105 transition-all text-xl">BAŞLA</button>
                </div>
            )}

            {gameState === 'won' && (
                <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md border-4 border-green-100 mt-10 animate-pop">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-3xl font-bold text-green-600 mb-2 header-font">Tebrikler!</h1>
                    <p className="text-gray-600 mb-6">Tüm kavramları başarıyla öğrendin.</p>
                    <div className="bg-gray-50 p-4 rounded-xl mb-8">
                        <p className="text-sm text-gray-500">Yapılan Hata/Tekrar Sayısı</p>
                        <p className="text-2xl font-bold text-rose-500">{mistakeCount}</p>
                    </div>
                     <div className="bg-green-50 p-4 rounded-xl mb-8">
                        <p className="text-sm text-green-600 font-bold">KAZANILAN PUAN</p>
                        <p className="text-4xl font-bold text-green-700">{score}</p>
                    </div>
                    <Button onClick={startGame} className="w-full">TEKRAR OYNA</Button>
                </div>
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
