
"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Lightbulb, Repeat, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';

type Question = {
    id: string;
    answer: string;
    question: string;
};

function GuessItGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const [gameState, setGameState] = useState('start'); // start, playing, won
    const [allQuestions, setAllQuestions] = useState<Question[]>([]);
    const [queue, setQueue] = useState<Question[]>([]);
    const [solvedIds, setSolvedIds] = useState<string[]>([]);
    const [mistakeCount, setMistakeCount] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [wrongFeedbackId, setWrongFeedbackId] = useState<string | null>(null);
    const [isCorrectAnim, setIsCorrectAnim] = useState(false);

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Bil Bakalım - ${searchParams.get('topicName')}`;

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
                setAllQuestions(result.questions);
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
            setGameState('start');
        };
        fetchQuestions();
    }, [searchParams]);

    const startGame = () => {
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
        setSolvedIds([]);
        setMistakeCount(0);
        setGameState('playing');
    };

    const handleAnswer = (selectedId: string) => {
        if (isCorrectAnim || wrongFeedbackId !== null) return;

        const currentQ = queue[0];

        if (selectedId === currentQ.id) {
            // CORRECT ANSWER
            playSound('correct');
            setIsCorrectAnim(true);
            setSolvedIds(prev => [...prev, selectedId]);

            setTimeout(() => {
                setQueue(prevQueue => prevQueue.slice(1));
                setIsCorrectAnim(false);
            }, 600);

        } else {
            // WRONG ANSWER
            playSound('incorrect');
            setWrongFeedbackId(selectedId);
            setMistakeCount(prev => prev + 1);
            
            setTimeout(() => {
                setQueue(prevQueue => {
                    const wrongQuestion = prevQueue[0];
                    const remaining = prevQueue.slice(1);
                    return [...remaining, wrongQuestion];
                });
                setWrongFeedbackId(null);
            }, 600);
        }
    };

    useEffect(() => {
        if (gameState === 'playing' && queue.length === 0 && solvedIds.length === allQuestions.length) {
            setGameState('won');
             if (user && mistakeCount < allQuestions.length) {
                const score = (allQuestions.length - mistakeCount) * 5;
                if (score > 0) {
                   submitBilBakalimScoreAction(user.uid, score, gameContext);
                }
            }
        }
    }, [queue, solvedIds, gameState, allQuestions.length, user, mistakeCount, gameContext]);
    
    const currentQuestion = queue.length > 0 ? queue[0] : null;
    const backUrl = isStatic ? '/statik' : '/student/bil-bakalim';

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    if (error) return (
        <div className="flex h-screen w-full items-center justify-center p-4">
             <Alert variant="destructive" className="max-w-lg">
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
        <div className="min-h-screen flex flex-col items-center justify-start py-6 px-4 max-w-3xl mx-auto">
             <style jsx global>{`
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
                .animate-shake { animation: shake 0.3s ease-in-out; }
                @keyframes pop { 0% { transform: scale(0.95); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
                .animate-pop { animation: pop 0.3s ease-out; }
                @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide { animation: slideIn 0.4s ease-out; }
            `}</style>
            
            <div className="w-full flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-rose-600 font-headline">Bil Bakalım?</h1>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 border border-rose-100">
                    Kalan Soru: <span className="text-rose-600 text-lg">{queue.length}</span>
                </div>
            </div>

            {gameState === 'playing' && currentQuestion && (
                <>
                    <div className={cn(
                        "w-full bg-white p-8 rounded-3xl shadow-lg border-b-8 border-rose-200 mb-8 text-center min-h-[180px] flex flex-col justify-center items-center relative overflow-hidden transition-colors duration-300",
                        isCorrectAnim && 'bg-green-50 border-green-200',
                        wrongFeedbackId && 'bg-red-50 border-red-200 animate-shake'
                    )}>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Soru</div>
                        <h2 className={cn("text-xl md:text-2xl font-bold leading-relaxed transition-colors", wrongFeedbackId ? 'text-red-600' : 'text-gray-800')}>
                            {currentQuestion.question}
                        </h2>

                        {wrongFeedbackId && <div className="absolute bottom-2 text-red-500 font-bold text-sm">Yanlış! Bu soru sona atıldı.</div>}
                        {isCorrectAnim && <div className="absolute bottom-2 text-green-600 font-bold text-sm animate-pop">Harika! Doğru Cevap.</div>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
                        {allQuestions.sort((a, b) => a.id.localeCompare(b.id)).map((item) => {
                            const isCurrentCorrect = isCorrectAnim && currentQuestion && item.id === currentQuestion.id;
                            const isWrong = wrongFeedbackId === item.id;

                            let btnClass = "py-4 rounded-xl font-bold text-sm md:text-base border-b-4 transition-all ";
                            
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
                                    onClick={() => handleAnswer(item.id)}
                                    disabled={isCorrectAnim || wrongFeedbackId !== null}
                                    className={btnClass}
                                >
                                    {item.answer}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {gameState === 'start' && (
                <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md border-4 border-rose-100 mt-10">
                    <div className="text-6xl mb-4">🤔</div>
                    <h1 className="text-3xl font-bold text-rose-600 mb-4 font-headline">Hazır mısın?</h1>
                    <p className="text-gray-600 mb-8 text-lg">
                        Yukarıda soru çıkacak, aşağıdan cevabı bul.<br/>
                        <span className="text-rose-500 font-bold text-sm">Yanlış cevapladığın sorular sona eklenecek!</span>
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
                <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md border-4 border-green-100 mt-10 animate-pop">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-3xl font-bold text-green-600 mb-2 font-headline">Tebrikler!</h1>
                    <p className="text-gray-600 mb-6">Tüm kavramları başarıyla öğrendin.</p>
                    
                    <div className="bg-gray-50 p-4 rounded-xl mb-8">
                        <p className="text-sm text-gray-500">Yapılan Hata Sayısı</p>
                        <p className="text-2xl font-bold text-rose-500">{mistakeCount}</p>
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
    );
}

export default function GuessItPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <GuessItGame />
        </Suspense>
    );
}
