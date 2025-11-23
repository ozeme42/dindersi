
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Phone, Users, X, Loader2, Star, LifeBuoy, Heart } from 'lucide-react';
import { playSound, stopSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import Confetti from 'react-dom-confetti';
import { submitMilyonerScoreAction } from './actions';
import type { Question } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const MONEY_LEVELS = [
    "500", "1.000", "2.000", "3.000", "5.000",
    "7.500", "15.000", "30.000", "60.000", "125.000",
    "250.000", "1.000.000"
];

const confettiConfig = {
  angle: 90,
  spread: 360,
  startVelocity: 40,
  elementCount: 70,
  dragFriction: 0.12,
  duration: 3000,
  stagger: 3,
  width: "10px",
  height: "10px",
  perspective: "500px",
  colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
};

export function MilyonerClientPage({ initialQuestions, initialError }: { initialQuestions: Question[] | null, initialError?: string }) {
    const { user } = useAuth();
    const router = useRouter();
    
    const [qIndex, setQIndex] = useState(0);
    const [gameState, setGameState] = useState('intro'); // intro, playing, won, lost, withdraw
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [revealState, setRevealState] = useState('none'); // none, selected, revealed
    const [lifelines, setLifelines] = useState({ fifty: true, phone: true, audience: true });
    const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
    const [modalContent, setModalContent] = useState<any>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [guaranteedMoney, setGuaranteedMoney] = useState("0");

    const [questions, setQuestions] = useState<Question[]>(initialQuestions || []);
    const [error, setError] = useState<string | null>(initialError || null);

    const gameContext = "Milyoner Yarışması";

    const startGame = () => {
        if (!initialQuestions || initialQuestions.length < 12) {
             setError("Bu yarışma için yeterli soru bulunamadı (En az 12 soru gereklidir).");
             setGameState('error');
             return;
        }
        setQuestions(initialQuestions);
        setQIndex(0);
        setGameState('playing');
        setLifelines({ fifty: true, phone: true, audience: true });
        setGuaranteedMoney("0");
        resetQuestion();
    };
    
    const resetQuestion = useCallback(() => {
        setSelectedOption(null);
        setRevealState('none');
        setEliminatedOptions([]);
        setModalContent(null);
    }, []);

    const handleEndGame = useCallback(async (endState: 'lost' | 'withdraw', prize: number) => {
        setGameState(endState);
        if (user && prize > 0) {
          await submitMilyonerScoreAction(user.uid, prize, gameContext);
        }
    }, [user, gameContext]);

    const checkAnswer = useCallback((index: number) => {
        const correctIndex = questions[qIndex].options?.indexOf(questions[qIndex].correctAnswer!);

        if (index === correctIndex) {
            playSound('correct');
            setTimeout(async () => {
                if (qIndex < questions.length - 1) {
                    setQIndex(prev => prev + 1);
                    resetQuestion();
                } else {
                    setGameState('won');
                    setShowConfetti(true);
                    if (user) {
                        const finalPrize = 1000;
                        await submitMilyonerScoreAction(user.uid, finalPrize, gameContext);
                    }
                }
            }, 2000);
        } else {
            playSound('incorrect');
            setTimeout(() => {
                const prize = parseInt(guaranteedMoney.replace(/\./g, ''));
                handleEndGame('lost', prize);
            }, 2000);
        }
    }, [qIndex, resetQuestion, questions, user, handleEndGame, guaranteedMoney, gameContext]);

    const handleOptionSelect = useCallback((index: number) => {
        if (revealState !== 'none' || eliminatedOptions.includes(index)) return;
        
        setSelectedOption(index);
        setRevealState('selected');
        playSound('timer');
        
        setTimeout(() => {
            stopSound('timer');
            setRevealState('revealed');
            checkAnswer(index);
        }, 3000);
    }, [revealState, eliminatedOptions, checkAnswer]);
    
    const withdraw = useCallback(() => {
        const currentPrize = qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0;
        handleEndGame('withdraw', currentPrize);
    }, [qIndex, handleEndGame]);

    const useFiftyFifty = () => {
        if (!lifelines.fifty) return;
        
        const correct = questions[qIndex].options?.indexOf(questions[qIndex].correctAnswer!);
        let wrongs = [0, 1, 2, 3].filter(i => i !== correct);
        
        wrongs = wrongs.sort(() => Math.random() - 0.5).slice(0, 2);
        
        setEliminatedOptions(wrongs);
        setLifelines(prev => ({ ...prev, fifty: false }));
    };

    const usePhone = () => {
        if (!lifelines.phone) return;
        const correct = questions[qIndex].options?.indexOf(questions[qIndex].correctAnswer!);
        const correctLetter = ["A", "B", "C", "D"][correct!];
        const suggestion = Math.random() < 0.8 ? correctLetter : ["A", "B", "C", "D"][Math.floor(Math.random() * 4)];
        setModalContent({
            title: "📞 Telefon Jokeri",
            text: `Arkadaşın Abdullah düşünüyor...\n\n"Bence cevap %90 ${suggestion} şıkkı dostum. Ama son karar senin."`
        });
        setLifelines(prev => ({ ...prev, phone: false }));
    };

    const useAudience = () => {
        if (!lifelines.audience) return;
        const correct = questions[qIndex].options?.indexOf(questions[qIndex].correctAnswer!);
        const percentages = [0, 0, 0, 0];
        let remaining = 100;
        percentages[correct!] = Math.floor(Math.random() * 30) + 40;
        remaining -= percentages[correct!];
        const wrongOptions = [0,1,2,3].filter(i => i !== correct);
        const firstWrongShare = Math.floor(Math.random() * remaining);
        percentages[wrongOptions[0]] = firstWrongShare;
        remaining -= firstWrongShare;
        const secondWrongShare = Math.floor(Math.random() * remaining);
        percentages[wrongOptions[1]] = secondWrongShare;
        remaining -= secondWrongShare;
        percentages[wrongOptions[2]] = remaining;
        setModalContent({ title: "👥 Seyirci Jokeri", chart: percentages });
        setLifelines(prev => ({ ...prev, audience: false }));
    };
    
    const goHome = () => router.push('/');

     if (gameState === 'error' || error) {
        return (
             <div className="flex h-screen items-center justify-center p-4 bg-milyoner">
                <Alert variant="destructive" className="max-w-lg bg-card/70 backdrop-blur-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Oyun Hatası!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/student/milyoner-yarismasi"><ArrowLeft className="mr-2 h-4 w-4" /> Kuruluma Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        )
    }

    if (gameState === 'intro') {
        return (
            <div className="min-h-screen bg-milyoner flex flex-col items-center justify-center text-center p-4">
                <div className="w-48 h-48 rounded-full border-4 border-yellow-600 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(212,175,55,0.5)] bg-gradient-to-br from-blue-900 to-black">
                    <span className="text-6xl">🏆</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 header-font drop-shadow-lg">
                    MİLYONER YARIŞMASI
                </h1>
                <p className="text-gray-300 mb-8 text-lg">Bilgilerini Test Et, Büyük Ödülü Kazan!</p>
                <button onClick={startGame} className="px-12 py-4 bg-gradient-to-r from-blue-800 to-blue-600 border-2 border-gray-400 rounded-full text-xl font-bold hover:border-yellow-500 hover:text-yellow-400 hover:scale-105 transition-all shadow-lg">
                    YARIŞMAYA BAŞLA
                </button>
            </div>
        );
    }
    
    if (gameState === 'won' || gameState === 'lost' || gameState === 'withdraw') {
        let prize = "0";
        if (gameState === 'won') prize = MONEY_LEVELS[MONEY_LEVELS.length - 1];
        else if (gameState === 'withdraw') prize = qIndex > 0 ? MONEY_LEVELS[qIndex - 1] : "0";
        else prize = guaranteedMoney;

        return (
            <div className="min-h-screen bg-milyoner flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-4xl font-bold mb-4 text-yellow-500">
                    {gameState === 'won' ? 'MİLYONER OLDUNUZ! 🏆' : (gameState === 'withdraw' ? 'ÇEKİLDİNİZ' : 'ELENDİNİZ')}
                </h1>
                <div className="bg-blue-900/50 p-8 rounded-2xl border border-blue-500 mb-8">
                    <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Kazanılan Ödül</p>
                    <p className="text-5xl font-black text-white header-font">{prize} Puan</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={startGame} className="px-10 py-3 bg-blue-700 rounded-full font-bold hover:bg-blue-600 transition-colors border border-gray-400">
                        TEKRAR OYNA
                    </button>
                    <button onClick={goHome} className="px-10 py-3 bg-gray-700 text-white rounded-full font-bold hover:bg-gray-600 transition-colors border border-gray-500">
                      ANA SAYFA
                    </button>
                </div>
            </div>
        );
    }
    
    if (!questions || questions.length === 0) {
      return <div className="flex h-screen items-center justify-center bg-[#000022]"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>;
    }

    const currentQ = questions[qIndex];
    if (!currentQ) {
        setError("Soru verisi yüklenemedi.");
        setGameState('error');
        return null;
    }

    const correctIndex = currentQ.options?.indexOf(currentQ.correctAnswer!);

    return (
        <div className="min-h-screen bg-milyoner flex flex-col md:flex-row text-white overflow-hidden font-sans relative">
            <style jsx global>{`
                .header-font { font-family: 'Roboto', sans-serif; font-weight: 900; }
                .hex-box { clip-path: polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%); }
                .hex-box::before { content: ''; position: absolute; top: 2px; left: 2px; right: 2px; bottom: 2px; background: #000033; clip-path: polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%); z-index: -1; }
                .answer-btn.correct { animation: blink-correct 0.5s 3; }
                .answer-btn.selected { background: #d97706; border-color: white; color: white; animation: blink-selected 1s infinite; }
                @keyframes blink-correct { 0%, 100% { background-color: #059669; } 50% { background-color: #34d399; } }
                @keyframes blink-selected { 0%, 100% { background-color: #d97706; } 50% { background-color: #f59e0b; } }
            `}</style>
            
            <div className="flex-1 flex flex-col justify-between p-4 md:p-8 relative z-10">
                <div className="flex justify-between items-start mb-8">
                    {revealState === 'none' && <Button onClick={withdraw} variant="destructive">ÇEKİL</Button>}
                    <div className="flex gap-4">
                        <button onClick={useFiftyFifty} disabled={!lifelines.fifty} className="lifeline-btn"><span className="text-sm">50:50</span>{!lifelines.fifty && <X className="absolute text-red-600 w-full h-full" />}</button>
                        <button onClick={usePhone} disabled={!lifelines.phone} className="lifeline-btn">📞</button>
                        <button onClick={useAudience} disabled={!lifelines.audience} className="lifeline-btn">👥</button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="hex-box w-full min-h-[120px] px-12 py-6 mb-8 bg-gradient-to-b from-[#1e3c72] to-[#2a5298] border-2 border-[#d4af37] flex items-center justify-center text-center shadow-[0_0_15px_rgba(212,175,55,0.3)] relative z-10">
                        <h2 className="text-lg md:text-2xl font-bold text-white leading-relaxed z-20">{currentQ.text}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full">
                    {currentQ.options?.map((opt, idx) => {
                        let statusClass = "";
                        if (revealState === 'selected' && selectedOption === idx) statusClass = "selected";
                        if (revealState === 'revealed') {
                            if (idx === correctIndex) statusClass = "correct";
                            else if (idx === selectedOption) statusClass = "wrong";
                        }
                        if (eliminatedOptions.includes(idx)) return <div key={idx} className="h-[52px] md:h-[60px]"></div>;
                        return (
                            <button key={idx} onClick={() => handleOptionSelect(idx)} disabled={revealState !== 'none'} className={`answer-btn py-3 px-6 text-left flex items-center ${statusClass} h-auto justify-start`}>
                                <span className="text-[#d4af37] font-bold mr-3 w-6 text-lg">{['A','B','C','D'][idx]}:</span>
                                <span className="flex-1 font-semibold">{opt}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="w-full md:w-64 bg-blue-900/30 border-l-0 md:border-l border-blue-800 p-4 flex flex-col justify-center order-first md:order-last">
                <div className="flex flex-col-reverse gap-1">
                    {MONEY_LEVELS.map((money, idx) => (
                        <div key={idx} className={cn("flex justify-between px-3 py-1 text-sm font-mono", idx === qIndex ? 'active text-black font-bold' : 'money-item', (idx === 1 || idx === 6) ? 'guaranteed' : '')}>
                            <span className="mr-2">{idx + 1}</span>
                            <span>{money} Puan</span>
                        </div>
                    ))}
                </div>
            </div>

            {modalContent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setModalContent(null)}>
                    <div className="bg-[#000033] border-2 border-[#d4af37] p-6 rounded-xl max-w-sm w-full shadow-[0_0_20px_rgba(212,175,55,0.5)]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-[#d4af37] mb-4 border-b border-[#d4af37] pb-2">{modalContent.title}</h3>
                        {modalContent.text && <p className="text-white whitespace-pre-line text-lg leading-relaxed">{modalContent.text}</p>}
                        {modalContent.chart && (
                            <div className="flex justify-around items-end h-40 gap-2 pt-4 bg-blue-900/30 rounded-lg p-4">
                                {modalContent.chart.map((val: number, i: number) => (
                                    <div key={i} className="flex flex-col items-center w-1/4 h-full justify-end group">
                                        <div className="text-xs text-yellow-300 mb-1 font-bold">{val}%</div>
                                        <div className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t transition-all duration-500" style={{ height: `${val}%` }}></div>
                                        <div className="text-sm font-bold mt-2 text-yellow-500">{['A','B','C','D'][i]}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={() => setModalContent(null)} className="mt-6 w-full py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-bold transition-colors">TAMAM</button>
                    </div>
                </div>
            )}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <Confetti active={showConfetti} config={confettiConfig} />
             </div>
        </div>
    );
}
