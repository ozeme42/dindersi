
"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { submitYaziTuraScoreAction } from '../actions';
import type { YaziTuraQuestions, Question } from "@/lib/types";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


const GameScreen = ({ gameState, children }: { gameState: string, children: React.ReactNode }) => {
    const isVisible = gameState === 'start' || gameState === 'flipping' || gameState === 'result';
    if (!isVisible) return null;
    return (
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center relative overflow-hidden">
            {children}
        </div>
    );
};

const QuestionScreen = ({ gameState, children }: { gameState: string, children: React.ReactNode }) => {
    const isVisible = gameState === 'question' || gameState === 'feedback';
    if (!isVisible) return null;
    return (
         <div className="bg-white rounded-3xl shadow-xl p-8 border-t-8 border-indigo-500 relative">
            {children}
         </div>
    );
}

export function YaziTuraClientPage({ initialQuestions, initialError }: { initialQuestions: YaziTuraQuestions | null, initialError?: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('start'); 
    const [coinSide, setCoinSide] = useState<string | null>(null); 
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [rotation, setRotation] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [questionsYazi, setQuestionsYazi] = useState<Question[]>([]);
    const [questionsTura, setQuestionsTura] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(initialError || null);

    const gameContext = `Yazı Tura - ${searchParams.get('topicName') || 'Genel'}`;
    const topicName = searchParams.get('topicName') || 'Yazı Tura';

    useEffect(() => {
        if (initialQuestions) {
            setQuestionsYazi(initialQuestions.easy || []);
            setQuestionsTura(initialQuestions.hard || []);
            setGameState('start');
        } else if (initialError) {
            setError(initialError);
            setGameState('error');
        }
    }, [initialQuestions, initialError]);


    const flipCoin = () => {
        setGameState('flipping');
        setSelectedOption(null);
        
        const isYazi = Math.random() < 0.5;
        const result = isYazi ? 'yazi' : 'tura';
        
        const baseRotation = 1800;
        const targetRotation = isYazi ? baseRotation : baseRotation + 180;
        
        setRotation(prev => prev + targetRotation);

        setTimeout(() => {
            setCoinSide(result);
            setGameState('result');
            pickQuestion(result);
        }, 2500);
    };

    const pickQuestion = (side: string) => {
        const questionPool = side === 'yazi' ? questionsYazi : questionsTura;
        const availableQuestions = questionPool.filter(q => q.id !== currentQuestion?.id);
        
        if(availableQuestions.length === 0) {
            toast({title: "Soru Kalmadı!", description: `Bu zorlukta başka soru bulunamadı.`, variant: "destructive"});
            setGameState('start');
            return;
        }
        const randomQ = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        setCurrentQuestion(randomQ);
    };

    const handleOptionClick = (option: string) => {
        if (!currentQuestion) return;
        setSelectedOption(option);
        setGameState('feedback');
        
        const isCorrectCheck = option === currentQuestion.correctAnswer;
        setIsCorrect(isCorrectCheck);

        if (isCorrectCheck) {
            const points = coinSide === 'yazi' ? 10 : 20;
            setScore(score + points);
        }
    };

    const nextTurn = () => {
        setGameState('start');
    };

    const withdrawAndSave = async () => {
        if (!user || score === 0) {
            setGameState('finished');
            return;
        }
        setIsSaving(true);
        const result = await submitYaziTuraScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: 'Başarılı!', description: `${score} puan kazandın ve profiline eklendi.` });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
        setGameState('finished');
    };

    const restartGame = () => {
        setScore(0);
        setGameState('start');
        setRotation(0);
        setCoinSide(null);
        setIsSaving(false);
    };
    
    if (error) {
         return (
             <div className="flex h-screen items-center justify-center p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                    <strong className="font-bold">Hata! </strong>
                    <span className="block sm:inline ml-2">{error}</span>
                     <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/student/yazi-tura"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                        </Button>
                    </div>
                </div>
            </div>
         );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-purple-100 font-body">
             <style jsx global>{`
                .header-font { font-family: 'Fredoka', sans-serif; }
                .coin-container { perspective: 1000px; width: 150px; height: 150px; margin: 0 auto; cursor: pointer; }
                .coin { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 3s ease-out; }
                .coin.flipping { animation: flipCoin 2s infinite linear; }
                .coin-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 8px solid #FCD34D; }
                .coin-front { background-color: #4F46E5; /* Indigo */ color: white; transform: rotateY(0deg); }
                .coin-back { background-color: #EC4899; /* Pink */ color: white; transform: rotateY(180deg); }
                .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            
            <div className="w-full max-w-2xl flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-lg">
                <Button asChild variant="outline" size="sm">
                    <Link href="/student/yazi-tura"><ArrowLeft className="mr-2 h-4 w-4"/> Kuruluma Geri Dön</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-indigo-800 header-font">{topicName}</h1>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">PUANIN</p>
                    <p className="text-4xl font-bold text-indigo-600 header-font">{score}</p>
                </div>
            </div>

            <div className="w-full max-w-md">
                
                <GameScreen gameState={gameState}>
                    <div className="mb-8 mt-4">
                        <div className="coin-container">
                            <div className="coin" style={{ transform: `rotateY(${rotation}deg)` }}>
                                <div className="coin-face coin-front">
                                    <div>
                                        <div>YAZI</div>
                                        <div className="text-xs opacity-75">10 Puan</div>
                                    </div>
                                </div>
                                <div className="coin-face coin-back">
                                    <div>
                                        <div>TURA</div>
                                        <div className="text-xs opacity-75">20 Puan</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {gameState === 'start' && (
                        <div className="space-y-4">
                            <button onClick={flipCoin} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xl transition-all transform hover:scale-105 shadow-lg">
                                PARAYI AT
                            </button>
                            {score > 0 && (
                                <button onClick={withdrawAndSave} disabled={isSaving} className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto"/> : 'Oyunu Bitir ve Puanı Kaydet'}
                                </button>
                            )}
                        </div>
                    )}

                    {gameState === 'flipping' && <p className="text-indigo-400 font-semibold animate-pulse">Para dönüyor...</p>}

                    {gameState === 'result' && (
                        <div className="animate-bounce">
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                {coinSide === 'yazi' ? 'YAZI GELDİ!' : 'TURA GELDİ!'}
                            </h2>
                            <p className="text-gray-500 mb-4">
                                {coinSide === 'yazi' ? 'Kolay Soru (10 Puan)' : 'Zor Soru (20 Puan)'}
                            </p>
                            <button onClick={() => setGameState('question')} className="px-8 py-2 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition-colors">
                                Soruyu Gör
                            </button>
                        </div>
                    )}
                </GameScreen>

                <QuestionScreen gameState={gameState}>
                    {currentQuestion && (
                        <>
                            {gameState === 'question' && (
                                <button onClick={withdrawAndSave} disabled={isSaving} className="absolute top-2 right-2 bg-red-100 hover:bg-red-200 text-red-600 text-xs px-3 py-1 rounded-full font-bold transition-colors flex items-center gap-1" title="Oyunu bitir ve puanı kaydet">
                                    <span>✖</span> Çekil
                                </button>
                            )}

                            <div className="mb-4 flex justify-center mt-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${coinSide === 'yazi' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                    {coinSide === 'yazi' ? '10 PUANLIK SORU' : '20 PUANLIK SORU'}
                                </span>
                            </div>
                            
                            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center min-h-[60px] flex items-center justify-center">
                                {currentQuestion.text}
                            </h3>

                            <div className="space-y-3">
                                {currentQuestion.options?.map((option, index) => {
                                    let btnClass = "w-full py-3 px-4 rounded-xl font-semibold text-left transition-all border-2 ";
                                    
                                    if (gameState === 'question') {
                                        btnClass += "bg-white border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50";
                                    } else if (gameState === 'feedback') {
                                        if (option === currentQuestion.correctAnswer) {
                                            btnClass += "bg-green-100 border-green-500 text-green-800";
                                        } else if (option === selectedOption) {
                                            btnClass += "bg-red-100 border-red-500 text-red-800";
                                        } else {
                                            btnClass += "bg-gray-50 border-gray-100 text-gray-400 opacity-60";
                                        }
                                    }

                                    return (
                                        <button 
                                            key={index}
                                            onClick={() => gameState === 'question' && handleOptionClick(option)}
                                            disabled={gameState === 'feedback'}
                                            className={btnClass}
                                        >
                                            {['A', 'B', 'C', 'D'][index] ? `${['A', 'B', 'C', 'D'][index]}) ` : ''} {option}
                                        </button>
                                    );
                                })}
                            </div>

                            {gameState === 'feedback' && (
                                <div className="mt-6 text-center animate-fade-in">
                                    <p className={`text-lg font-bold mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                        {isCorrect ? 'Tebrikler! Doğru Cevap.' : 'Maalesef Yanlış.'}
                                    </p>
                                    <button 
                                        onClick={nextTurn}
                                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-transform hover:scale-105"
                                    >
                                        Sıradaki Tur
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </QuestionScreen>

                {gameState === 'finished' && (
                    <div className="bg-white rounded-3xl shadow-xl p-8 text-center animate-fade-in">
                        <div className="mb-6 text-6xl">🏆</div>
                        <h2 className="text-3xl font-bold text-indigo-800 mb-2">Oyun Bitti!</h2>
                        <p className="text-gray-500 mb-6">Tebrikler, harika bir yarışma çıkardın.</p>
                        
                        <div className="bg-indigo-50 rounded-xl p-6 mb-8">
                            <p className="text-sm text-indigo-400 font-bold uppercase tracking-wider">Toplam Skorun</p>
                            <p className="text-5xl font-black text-indigo-600 header-font">{score}</p>
                        </div>

                        <button 
                            onClick={restartGame}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-transform hover:scale-105"
                        >
                            YENİDEN OYNA
                        </button>
                    </div>
                )}

            </div>
            
            <div className="mt-8 text-center opacity-50 text-xs">
                <p>© 2025 Din Kültürü ve Ahlak Bilgisi Etkinlik Oyunu</p>
            </div>
        </div>
    );

    
}
