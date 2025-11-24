
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Loader2, ArrowLeft, Home, PartyPopper, Repeat } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import type { ConceptQuizConcept } from "./actions";

export function KavramYarismaClientPage({ initialConcepts, initialError }: { initialConcepts: ConceptQuizConcept[] | null, initialError?: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState('start');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [wrongGuesses, setWrongGuesses] = useState(0);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [disabledCards, setDisabledCards] = useState<string[]>([]);
    const [correctCard, setCorrectCard] = useState<string | null>(null);
    const [isRoundOver, setIsRoundOver] = useState(false);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [questions, setQuestions] = useState<ConceptQuizConcept[]>(initialConcepts || []);
    const [error, setError] = useState<string | null>(initialError || null);
    
    const gameContext = `Kavram Yarışması - ${searchParams.get('topicName') || 'Genel'}`;

    const startGame = useCallback(() => {
        if (questions.length === 0) {
            setError("Oyun için soru yüklenemedi veya bulunamadı.");
            setGameState('error');
            return;
        }
        setCurrentQIndex(0);
        setScore(0);
        setGameState('playing');
        resetTurn();
    }, [questions]);

    useEffect(() => {
        if (initialError) {
            setError(initialError);
            setGameState('error');
        } else if (initialConcepts) {
            setQuestions(initialConcepts);
            setGameState('start');
        }
    }, [initialConcepts, initialError]);
    
     const resetTurn = useCallback(() => {
        setTimeLeft(15);
        setWrongGuesses(0);
        setFeedbackMsg('');
        setDisabledCards([]);
        setCorrectCard(null);
        setIsRoundOver(false);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if(timerRef.current) clearInterval(timerRef.current);
                    // handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const handleCardClick = (concept: string) => {
        if (disabledCards.includes(concept) || correctCard || isRoundOver) return;

        const currentQ = questions[currentQIndex];
        if (!currentQ) return;

        if (concept === currentQ.name) {
            if (timerRef.current) clearInterval(timerRef.current);
            setScore(prev => prev + (20 - (wrongGuesses * 10)));
            setCorrectCard(concept);
            setFeedbackMsg('Harika! Doğru Cevap.');
            setIsRoundOver(true);
        } else {
            const newWrongGuesses = wrongGuesses + 1;
            setWrongGuesses(newWrongGuesses);
            setDisabledCards(prev => [...prev, concept]);
            
            if (newWrongGuesses >= 2) {
                if (timerRef.current) clearInterval(timerRef.current);
                setFeedbackMsg('Hakkın Kalmadı!');
                setCorrectCard(currentQ.name);
                setIsRoundOver(true);
            } else {
                setFeedbackMsg('Yanlış! 1 Hakkın daha var.');
            }
        }
    };
    
    const nextQuestion = () => {
        if (currentQIndex + 1 < questions.length) {
            setCurrentQIndex(prev => prev + 1);
            resetTurn();
        } else {
            endGame();
        }
    };
    
    const endGame = () => {
        if(timerRef.current) clearInterval(timerRef.current);
        setGameState('end');
    };

    const restartGame = () => {
        setScore(0);
        setGameState('start');
    };

    if (error) {
         return (
             <div className="flex h-screen items-center justify-center p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                    <strong className="font-bold">Hata! </strong>
                    <span className="block sm:inline">{error}</span>
                     <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/teacher/smartboard/kavram-yarismasi"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                        </Button>
                    </div>
                </div>
            </div>
         )
    }

    if (gameState === 'start') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-10 rounded-3xl shadow-xl text-center">
                    <div className="text-6xl mb-4">🧩</div>
                    <h2 className="text-3xl font-bold text-indigo-800 mb-4 header-font">Kavram Avcısı</h2>
                    <ul className="text-left text-gray-600 mb-8 space-y-2 bg-blue-50 p-6 rounded-xl">
                        <li>⏱️ Her soru için <strong>15 Saniye</strong> süren var.</li>
                        <li>❤️ Her soruda <strong>2 Cevap Hakkın</strong> var.</li>
                        <li>🎯 Doğru kavramı bul, puanları topla!</li>
                    </ul>
                    <button 
                        onClick={startGame}
                        className="w-full py-4 bg-indigo-600 text-white text-xl font-bold rounded-xl hover:bg-indigo-700 transition-transform hover:scale-105 shadow-lg"
                    >
                        OYUNA BAŞLA
                    </button>
                </div>
            </div>
        );
    }
    
     if (gameState === 'end') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-10 rounded-3xl shadow-xl text-center">
                    <div className="text-6xl mb-4">🏁</div>
                    <h2 className="text-3xl font-bold text-indigo-800 mb-2">Yarışma Bitti!</h2>
                    <p className="text-gray-500 mb-8">Tüm kavramları tamamladın.</p>
                    
                    <div className="bg-indigo-50 p-6 rounded-2xl mb-8 inline-block w-full">
                        <p className="text-sm text-indigo-400 font-bold tracking-widest uppercase">TOPLAM SKOR</p>
                        <p className="text-5xl font-black text-indigo-600 header-font mt-2">{score}</p>
                    </div>
                     <div className="space-y-2">
                        <Button onClick={restartGame} className="w-full py-4 text-xl" variant="secondary">
                            TEKRAR OYNA
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/teacher/smartboard">Ana Menü</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex flex-col items-center p-4 pb-24">
            
            <style jsx global>{`
                .header-font { font-family: 'Fredoka', sans-serif; }
            `}</style>

            <div className="w-full max-w-3xl flex justify-between items-center bg-white p-4 rounded-xl shadow-md mb-6">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <div>
                        <p className="text-xs text-gray-500 font-bold">PUAN</p>
                        <p className="text-2xl font-bold text-indigo-600 header-font">{score}</p>
                    </div>
                </div>
                <div><h1 className="text-xl font-bold text-gray-700 hidden md:block header-font">Kavram Avcısı</h1></div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 font-bold">SORU</p>
                    <p className="text-xl font-bold text-gray-700">
                        {gameState === 'playing' ? `${currentQIndex + 1}/${questions.length}` : '-/-'}
                    </p>
                </div>
            </div>

            {/* MAIN GAME AREA */}
            <div className="w-full max-w-3xl relative">
                
                {gameState === 'playing' && questions.length > 0 && (
                    <div>
                        <div className="w-full bg-gray-200 rounded-full h-4 mb-6 overflow-hidden border border-gray-300 relative">
                            <div 
                                className={`h-full timer-bar transition-all duration-1000 linear ${timeLeft > 10 ? 'bg-green-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${(timeLeft / 15) * 100}%` }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-600">
                                {timeLeft} sn
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-lg mb-6 min-h-[160px] flex flex-col justify-center items-center text-center relative border-l-8 border-indigo-500">
                            
                            <div className="absolute top-3 right-3 flex gap-1">
                                {[0, 1].map(i => (
                                    <span key={i} className={`text-xl ${i < (2 - wrongGuesses) ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                        ❤️
                                    </span>
                                ))}
                            </div>

                            <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed">
                                {questions[currentQIndex]?.question}
                            </h3>
                            
                            {feedbackMsg && (
                                <div className={`mt-4 font-bold py-1 px-4 rounded-full animate-pulse ${feedbackMsg.includes('Doğru') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {feedbackMsg}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {questions[currentQIndex]?.options.map((option, index) => {
                                let btnStyle = "py-8 rounded-xl font-bold text-xl shadow-md transition-all transform active:scale-95 border-b-4 ";
                                
                                if (correctCard === option) {
                                    btnStyle += "bg-green-500 border-green-700 text-white scale-105 ring-4 ring-green-200";
                                } else if (disabledCards.includes(option)) {
                                    btnStyle += "bg-red-100 border-red-200 text-red-300 cursor-not-allowed";
                                } else {
                                    btnStyle += "bg-white border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:-translate-y-1";
                                }

                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleCardClick(option)}
                                        className={btnStyle}
                                        disabled={disabledCards.includes(option) || correctCard !== null || isRoundOver}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>

                        {isRoundOver && (
                            <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 animate-bounce-in">
                                <button
                                    onClick={nextQuestion}
                                    className="px-10 py-4 bg-green-500 text-white text-xl font-bold rounded-full shadow-2xl hover:bg-green-600 transform hover:scale-110 transition-all border-4 border-green-200 flex items-center gap-2"
                                >
                                    {currentQIndex + 1 < questions.length ? 'SIRADAKİ SORU ➔' : 'BİTİR'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="mt-10 text-center opacity-40 text-xs text-gray-500">
                {searchParams.get('courseName')} - {searchParams.get('topicName')}
            </div>
        </div>
    );
}
