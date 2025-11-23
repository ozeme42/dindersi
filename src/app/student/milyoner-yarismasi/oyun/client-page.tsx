
'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Phone, Users, X, Loader2, Star, LifeBuoy, Heart, ArrowLeft, Home, Repeat, PartyPopper } from 'lucide-react';
import { playSound, stopSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import Confetti from 'react-dom-confetti';
import { addScore, checkAndAwardMillionaireBadge } from './actions';
import type { Question } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Puanlama ve soru seviyeleri
const MONEY_LEVELS = [
  "100", "200", "300", "400", "500", 
  "600", "700", "800", "900", "1.000"
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useAuth();
  
  const [questions, setQuestions] = useState<Question[]>(initialQuestions || []);
  const [error, setError] = useState<string | null>(initialError || null);

  const [qIndex, setQIndex] = useState(0);
  const [gameState, setGameState] = useState('intro'); // intro, playing, won, lost, withdraw
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealState, setRevealState] = useState('none'); // none, selected, revealed
  const [lifelines, setLifelines] = useState({ fifty: true, phone: true, audience: true });
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [modalContent, setModalContent] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const resetGame = useCallback(() => {
    setQIndex(0);
    setGameState('playing');
    resetQuestion();
    setLifelines({ fifty: true, phone: true, audience: true });
    setShowConfetti(false);
  }, []);

  const startGame = useCallback(() => {
    if (error || questions.length === 0) {
      setGameState('error');
      return;
    }
    resetGame();
  }, [error, questions, resetGame]);

  const resetQuestion = useCallback(() => {
    setSelectedOption(null);
    setRevealState('none');
    setEliminatedOptions([]);
    setModalContent(null);
  }, []);

  const handleEndGame = useCallback(async (endState: 'lost' | 'withdraw', prize: number, context: string) => {
    setGameState(endState);
    if (user && prize > 0) {
      await addScore(user.uid, prize, context);
    }
  }, [user]);

  const checkAnswer = useCallback((index: number) => {
    const currentQ = questions[qIndex];
    if (!currentQ) return;
    
    const correctIndex = currentQ.options?.indexOf(currentQ.correctAnswer!);

    if (index === correctIndex) {
      playSound('correct');
      setTimeout(async () => {
        if (qIndex < MONEY_LEVELS.length - 1) {
          setQIndex(prev => prev + 1);
          resetQuestion();
        } else {
          setGameState('won');
          setShowConfetti(true);
          if (user) {
            const finalPrize = parseInt(MONEY_LEVELS[qIndex].replace(/\./g, ''));
            await addScore(user.uid, finalPrize, "Milyoner Yarışmasını Kazandı");
            await checkAndAwardMillionaireBadge(user.uid);
          }
        }
      }, 2000);
    } else {
      playSound('incorrect');
      setTimeout(() => {
        const prize = 0; // No lifeline system for now, resets on wrong answer.
        handleEndGame('lost', prize, "Milyoner Yarışmasında Elendi");
      }, 2000);
    }
  }, [qIndex, questions, resetQuestion, user, handleEndGame]);

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
    handleEndGame('withdraw', currentPrize, "Milyoner Yarışması'ndan Çekildi");
  }, [qIndex, handleEndGame]);
  
  // JOKERS
  const useFiftyFifty = () => {
    if (!lifelines.fifty) return;
    const currentQ = questions[qIndex];
    if (!currentQ) return;

    const correct = currentQ.options?.indexOf(currentQ.correctAnswer!);
    let wrongs = [0, 1, 2, 3].filter(i => i !== correct);
    
    wrongs = wrongs.sort(() => Math.random() - 0.5).slice(0, 2);
    
    setEliminatedOptions(wrongs);
    setLifelines(prev => ({ ...prev, fifty: false }));
  };

  const usePhone = () => {
    if (!lifelines.phone) return;
    const currentQ = questions[qIndex];
    if (!currentQ) return;
    
    const correct = currentQ.options?.indexOf(currentQ.correctAnswer!);
    const correctLetter = ["A", "B", "C", "D"][correct!];
    
    const suggestion = Math.random() < 0.8 ? correctLetter : ["A", "B", "C", "D"][Math.floor(Math.random() * 4)];

    setModalContent({
      title: "Telefon Jokeri",
      icon: <Phone size={32} className="text-yellow-500" />,
      text: `Arkadaşın Abdullah düşünüyor...\n\n"Bence cevap %90 ${suggestion} şıkkı dostum. Ama son karar senin."`
    });
    setLifelines(prev => ({ ...prev, phone: false }));
  };

  const useAudience = () => {
    if (!lifelines.audience) return;
    const currentQ = questions[qIndex];
    if (!currentQ) return;

    const correct = currentQ.options?.indexOf(currentQ.correctAnswer!);
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

    setModalContent({
      title: "Seyirci Jokeri",
      icon: <Users size={32} className="text-yellow-500" />,
      chart: percentages
    });
    setLifelines(prev => ({ ...prev, audience: false }));
  };
  
  const goHome = () => router.push('/');
  const backToSetup = () => router.push('/student/milyoner-yarismasi');

  if (userLoading || isLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#000022]"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>;
  }
  
  if (error || questions.length === 0) {
    return (
       <div className="flex h-screen items-center justify-center p-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                <strong className="font-bold">Hata! </strong>
                <span className="block sm:inline ml-2">{error || "Sorular yüklenemedi."}</span>
                  <div className="mt-4">
                    <Button asChild variant="outline">
                        <Link href="/student/milyoner-yarismasi"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
  }

  if (gameState === 'intro') {
     return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 font-sans relative overflow-hidden bg-[#000022]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a5c_0%,_#000022_100%)] -z-10"></div>
        
        <div className="w-48 h-48 rounded-full border-4 border-yellow-600 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(212,175,55,0.5)] bg-gradient-to-br from-blue-900 to-black animate-pulse">
          <span className="text-6xl">🏆</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 drop-shadow-lg">
          KİM 1000 PUAN İSTER?
        </h1>
        <p className="text-gray-300 mb-8 text-lg font-medium">Bilgilerini Test Et, Büyük Ödülü Kazan!</p>
        <button 
          onClick={startGame}
          className="px-12 py-4 bg-gradient-to-r from-blue-800 to-blue-600 border-2 border-gray-400 rounded-full text-white text-xl font-bold hover:border-yellow-500 hover:text-yellow-400 hover:scale-105 transition-all shadow-lg"
        >
          YARIŞMAYA BAŞLA
        </button>
      </div>
    );
  }
  
  if (gameState === 'won' || gameState === 'lost' || gameState === 'withdraw') {
    let prize = 0;
    if (gameState === 'won') prize = parseInt(MONEY_LEVELS[MONEY_LEVELS.length - 1].replace(/\./g, ''));
    else if (gameState === 'withdraw') prize = qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0;
    else prize = 0;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-[#000022] relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a5c_0%,_#000022_100%)] -z-10"></div>
        
        <h1 className={`text-4xl font-bold mb-4 ${gameState === 'won' ? 'text-green-500' : 'text-yellow-500'}`}>
          {gameState === 'won' ? 'TEBRİKLER! BÜYÜK ÖDÜLÜ KAZANDIN! 🏆' : (gameState === 'withdraw' ? 'YARIŞMADAN ÇEKİLDİN' : 'ELENDİNİZ')}
        </h1>
        <div className="bg-blue-900/50 p-8 rounded-2xl border-2 border-blue-500 mb-8 shadow-2xl backdrop-blur-sm">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Kazanılan Ödül</p>
          <p className="text-6xl font-black text-white drop-shadow-md">{prize.toLocaleString()} Puan</p>
        </div>
        <div className="flex gap-4">
            <Button onClick={startGame} size="lg">
              TEKRAR OYNA
            </Button>
             <Button onClick={backToSetup} size="lg" variant="outline">
              ANA SAYFA
            </Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[qIndex];

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-white overflow-hidden bg-[#000022] font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a5c_0%,_#000022_100%)] -z-10"></div>
      
      <style>{`
        .hex-box { clip-path: polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%); }
        .hex-box::before { content: ''; position: absolute; top: 2px; left: 2px; right: 2px; bottom: 2px; background: #000033; clip-path: polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%); z-index: -1; }
        .answer-correct { animation: blink-correct 0.5s 3; }
        .answer-wrong { animation: blink-wrong 0.5s 3; }
        @keyframes blink-correct { 0%, 100% { background-color: #059669; } 50% { background-color: #34d399; } }
        @keyframes blink-wrong { 0%, 100% { background-color: #dc2626; } 50% { background-color: #f87171; } }
      `}</style>
      
      <div className="flex-1 flex flex-col justify-between p-4 md:p-8 relative z-10 order-2 md:order-1">
        
        <div className="flex justify-between items-start mb-8">
          {revealState === 'none' && (
              <Button onClick={withdraw} variant="outline" className="border-red-500 text-red-400 bg-red-900/20 hover:bg-red-900/50">
                  ÇEKİL
              </Button>
          )}
          <div className="flex gap-4 ml-auto">
            <Button onClick={useFiftyFifty} disabled={!lifelines.fifty} className="w-[60px] h-[40px] rounded-[50%] border-2 border-[#d4af37] flex items-center justify-center font-bold bg-[#000033] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#000033] disabled:opacity-30 disabled:cursor-not-allowed transition-colors relative" title="%50">
                <span className="text-sm">50:50</span>
                {!lifelines.fifty && <X className="absolute text-red-600 w-full h-full" />}
            </Button>
            <Button onClick={usePhone} disabled={!lifelines.phone} className="w-[60px] h-[40px] rounded-[50%] border-2 border-[#d4af37] flex items-center justify-center font-bold bg-[#000033] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#000033] disabled:opacity-30 disabled:cursor-not-allowed transition-colors relative" title="Telefon">
                <Phone size={20} />
                {!lifelines.phone && <X className="absolute text-red-600 w-full h-full" />}
            </Button>
            <Button onClick={useAudience} disabled={!lifelines.audience} className="w-[60px] h-[40px] rounded-[50%] border-2 border-[#d4af37] flex items-center justify-center font-bold bg-[#000033] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#000033] disabled:opacity-30 disabled:cursor-not-allowed transition-colors relative" title="Seyirci">
                <Users size={20} />
                {!lifelines.audience && <X className="absolute text-red-600 w-full h-full" />}
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
            <div className="hex-box w-full min-h-[120px] px-12 py-6 mb-8 bg-gradient-to-b from-[#1e3c72] to-[#2a5298] border-2 border-[#d4af37] flex items-center justify-center text-center shadow-[0_0_15px_rgba(212,175,55,0.3)] relative z-10">
                <h2 className="text-lg md:text-2xl font-bold text-white leading-relaxed z-20">
                    {currentQ.text}
                </h2>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full">
            {(currentQ.options || []).map((opt, idx) => {
                let bgClass = "bg-gradient-to-r from-[#000044] via-[#1e3c72] to-[#000044]";
                let borderClass = "border-gray-500";
                let textClass = "text-white";
                if (revealState === 'selected' && selectedOption === idx) { bgClass = "bg-[#d97706]"; borderClass = "border-white"; }
                if (revealState === 'revealed') {
                    const correctIndex = currentQ.options?.indexOf(currentQ.correctAnswer!);
                    if (idx === correctIndex) { bgClass = "bg-[#059669] answer-correct"; borderClass = "border-[#34d399]"; } 
                    else if (idx === selectedOption) { bgClass = "bg-[#dc2626] answer-wrong"; borderClass = "border-[#f87171]"; }
                }

                if (eliminatedOptions.includes(idx)) { return <div key={idx} className="h-[52px] md:h-[60px]"></div>; }
                return (
                    <Button key={idx} onClick={() => handleOptionSelect(idx)} disabled={revealState !== 'none'} className={cn(`py-3 px-6 text-left flex items-center rounded-full border hover:border-white hover:text-yellow-300 transition-all h-auto justify-start`, bgClass, borderClass, textClass)}>
                        <span className="text-[#d4af37] font-bold mr-3 w-6 text-lg">{['A','B','C','D'][idx]}:</span>
                        <span className="flex-1 font-semibold">{opt}</span>
                    </Button>
                );
            })}
        </div>
      </div>

      <div className="w-full md:w-64 bg-blue-900/30 border-l-0 md:border-l-2 border-blue-800 p-4 flex flex-col justify-center order-1 md:order-2">
        <div className="grid grid-cols-5 md:flex md:flex-col-reverse gap-2">
            {MONEY_LEVELS.map((money, idx) => (
                <div key={idx} className={cn(
                    "flex justify-center items-center px-3 py-1 text-sm font-mono rounded-md text-center",
                    idx === qIndex ? 'bg-[#d4af37] text-[#000033] font-bold scale-105 shadow-lg text-base' : 'text-[#d4af37]',
                    "border border-transparent",
                    idx === qIndex && "border-white"
                )}>
                    <span>{qIndex > idx ? '✓' : idx + 1}</span>
                    <span className="flex-1 text-right">{money}</span>
                </div>
            ))}
        </div>
      </div>

      {modalContent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setModalContent(null)}>
            <div className="bg-[#000033] border-2 border-[#d4af37] p-6 rounded-xl max-w-sm w-full shadow-[0_0_20px_rgba(212,175,55,0.5)]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4 border-b border-[#d4af37] pb-2">
                    {modalContent.icon}
                    <h3 className="text-xl font-bold text-[#d4af37]">{modalContent.title}</h3>
                </div>
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
                <Button onClick={() => setModalContent(null)} className="mt-6 w-full py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-bold transition-colors">
                    TAMAM
                </Button>
            </div>
        </div>
      )}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <Confetti active={showConfetti} config={confettiConfig} />
       </div>
    </div>
  );
}
