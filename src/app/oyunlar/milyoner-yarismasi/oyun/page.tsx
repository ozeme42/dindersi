
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Phone, Users, X, Loader2, Star, LifeBuoy, Heart, Ghost, Trophy } from 'lucide-react';
import { playSound, stopSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import Confetti from 'react-dom-confetti';
import { addScore, checkAndAwardMillionaireBadge, getMillionaireQuestions } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const MONEY_LEVELS = [
  "100", "200", "300", "400", "500", "600", "700", "800", "900", "1.000"
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

function MilyonerGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useAuth();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  const [qIndex, setQIndex] = useState(0);
  const [gameState, setGameState] = useState('playing');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealState, setRevealState] = useState('none');
  const [lifelines, setLifelines] = useState({ fifty: true, phone: true, audience: true });
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [modalContent, setModalContent] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const gameContext = `Kim 1000 Puan İster? - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

  const fetchGameData = useCallback(async () => {
    setIsLoading(true);
    const params = {
        courseId: searchParams.get('courseId') || undefined,
        unitId: searchParams.get('unitId') || undefined,
        topicId: searchParams.get('topicId') || undefined,
    };
    const result = await getMillionaireQuestions(params);
    if (result.error || result.questions.length === 0) {
        setError(result.error || "Bu konu için oyun verisi bulunamadı.");
    } else {
        const shuffledQuestions = result.questions
            .map(q => ({
                ...q,
                options: q.options ? [...q.options].sort(() => Math.random() - 0.5) : []
            }))
            .slice(0, 10);
        setQuestions(shuffledQuestions);
    }
    setIsLoading(false);
  }, [searchParams]);

  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  const resetGame = useCallback(() => {
      setQIndex(0);
      setGameState('playing');
      setSelectedOption(null);
      setRevealState('none');
      setEliminatedOptions([]);
      setModalContent(null);
      setLifelines({ fifty: true, phone: true, audience: true });
      setShowConfetti(false);
      fetchGameData();
  }, [fetchGameData]);

  const resetQuestion = useCallback(() => {
    setSelectedOption(null);
    setRevealState('none');
    setEliminatedOptions([]);
    setModalContent(null);
  }, []);

  const handleEndGame = useCallback(async (endState: 'lost' | 'withdraw', prize: number) => {
    setGameState(endState);
    if (user && prize > 0) {
      await addScore(user.uid, prize, gameContext);
    }
  }, [user, gameContext]);

  const checkAnswer = useCallback((answer: string) => {
    const currentQ = questions[qIndex];
    if (!currentQ) return;
    
    if (answer === currentQ.correctAnswer) {
      playSound('correct');
      setTimeout(async () => {
        if (qIndex < questions.length - 1) {
          setQIndex(prev => prev + 1);
          resetQuestion();
        } else {
          setGameState('won');
          setShowConfetti(true);
          if (user) {
            const finalPrize = parseInt(MONEY_LEVELS[qIndex].replace(/\./g, ''));
            await addScore(user.uid, finalPrize, gameContext);
            await checkAndAwardMillionaireBadge(user.uid);
          }
        }
      }, 2000);
    } else {
      playSound('incorrect');
      setTimeout(() => {
        const prize = 0; // Baraj sistemi şimdilik yok
        handleEndGame('lost', prize);
      }, 2000);
    }
  }, [qIndex, questions, resetQuestion, user, handleEndGame, gameContext]);

  const handleOptionSelect = useCallback((option: string) => {
    if (revealState !== 'none' || eliminatedOptions.includes(option)) return;
    
    setSelectedOption(option);
    setRevealState('selected');
    playSound('timer');
    
    setTimeout(() => {
      stopSound('timer');
      setRevealState('revealed');
      checkAnswer(option);
    }, 3000);
  }, [revealState, eliminatedOptions, checkAnswer]);
  
  const withdraw = useCallback(() => {
    const currentPrize = qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0;
    handleEndGame('withdraw', currentPrize);
  }, [qIndex, handleEndGame]);

  const useFiftyFifty = () => {
    if (!lifelines.fifty || !questions[qIndex]) return;
    
    const currentQ = questions[qIndex];
    let wrongOptions = (currentQ.options || []).filter(opt => opt !== currentQ.correctAnswer);
    
    wrongOptions = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 2);
    
    setEliminatedOptions(wrongOptions);
    setLifelines(prev => ({ ...prev, fifty: false }));
  };

  const usePhone = () => {
    if (!lifelines.phone || !questions[qIndex]) return;
    const currentQ = questions[qIndex];
    const suggestion = Math.random() < 0.8 ? currentQ.correctAnswer : currentQ.options?.[Math.floor(Math.random() * 4)];

    setModalContent({
      title: "Telefon Jokeri",
      icon: <Phone size={32} className="text-yellow-500" />,
      text: `Arkadaşın Abdullah düşünüyor...\n\n"Bence cevap kesinlikle ${suggestion}. Ama son karar senin."`
    });
    setLifelines(prev => ({ ...prev, phone: false }));
  };

  const useAudience = () => {
    if (!lifelines.audience || !questions[qIndex]) return;
    const currentQ = questions[qIndex];
    const correct = currentQ.correctAnswer;
    const options = currentQ.options || [];
    const percentages: { [key: string]: number } = {};
    let remaining = 100;
    
    percentages[correct!] = Math.floor(Math.random() * 30) + 40;
    remaining -= percentages[correct!];
    
    const wrongOptions = options.filter(opt => opt !== correct);
    const firstWrongShare = Math.floor(Math.random() * remaining);
    percentages[wrongOptions[0]] = firstWrongShare;
    remaining -= firstWrongShare;
    
    const secondWrongShare = Math.floor(Math.random() * remaining);
    percentages[wrongOptions[1]] = secondWrongShare;
    remaining -= secondWrongShare;
    
    if (wrongOptions[2]) {
      percentages[wrongOptions[2]] = remaining;
    }

    setModalContent({
      title: "Seyirci Jokeri",
      icon: <Users size={32} className="text-yellow-500" />,
      chartData: options.map(opt => ({ name: opt, value: percentages[opt] || 0 }))
    });
    setLifelines(prev => ({ ...prev, audience: false }));
  };
  
   const goHome = () => router.push('/student');

  if (isLoading || userLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#000022]"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>;
  }
  
  if (error) {
    return (
        <div className="flex h-screen w-full items-center justify-center p-4 bg-[#000022]">
             <div className="text-center space-y-4 max-w-md bg-red-950/50 p-6 rounded-3xl border border-red-500/30">
                <Ghost className="h-16 w-16 text-red-500 mx-auto" />
                <h3 className="text-xl font-bold text-red-100">Oyun Başlatılamadı</h3>
                <p className="text-red-200/70">{error}</p>
                 <Button asChild variant="secondary" className="w-full">
                    <Link href="/oyunlar/milyoner-yarismasi">Geri Dön</Link>
                </Button>
            </div>
        </div>
    );
  }

  if (gameState === 'won' || gameState === 'lost' || gameState === 'withdraw') {
    let prize = 0;
    if (gameState === 'won') prize = 1000;
    else if (gameState === 'withdraw') prize = qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0;
    else prize = 0; 

    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-[#000022] relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a5c_0%,_#000022_100%)] -z-10"></div>
        <Confetti active={gameState === 'won'} config={confettiConfig} />
        
        <h1 className={`text-4xl font-bold mb-4 ${gameState === 'won' ? 'text-green-500' : 'text-yellow-500'}`}>
          {gameState === 'won' ? 'TEBRİKLER! BÜYÜK ÖDÜLÜ KAZANDIN! 🏆' : (gameState === 'withdraw' ? 'YARIŞMADAN ÇEKİLDİN' : 'ELENDİNİZ')}
        </h1>
        <div className="bg-blue-900/50 p-8 rounded-2xl border-2 border-blue-500 mb-8 shadow-2xl backdrop-blur-sm">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Kazanılan Ödül</p>
          <p className="text-6xl font-black text-white drop-shadow-md">{prize.toLocaleString()} Puan</p>
        </div>
        <div className="flex gap-4">
            <button 
              onClick={resetGame}
              className="px-10 py-3 bg-blue-700 text-white rounded-full font-bold hover:bg-blue-600 transition-colors border border-gray-400 hover:border-white"
            >
              TEKRAR OYNA
            </button>
             <button 
              onClick={goHome}
              className="px-10 py-3 bg-gray-700 text-white rounded-full font-bold hover:bg-gray-600 transition-colors border border-gray-500"
            >
              ANA SAYFA
            </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[qIndex];
  if (!currentQ) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#000022]">
          <p className="text-white">Sorular yükleniyor veya bulunamadı...</p>
        </div>
      );
  }


  return (
    <div className="min-h-screen flex flex-col md:flex-row text-white overflow-hidden bg-[#000022] font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a5c_0%,_#000022_100%)] -z-10"></div>
      
      <style>{`
        .hex-box { clip-path: polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%); }
        .hex-box::before { content: ''; position: absolute; top: 2px; left: 2px; right: 2px; bottom: 2px; background: #000033; clip-path: polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%); z-index: -1; }
        .answer-correct { animation: blink 0.5s 3; }
        @keyframes blink { 0%, 100% { background-color: #059669; } 50% { background-color: #34d399; } }
      `}</style>
      
      <div className="flex-1 flex flex-col justify-between p-4 md:p-8 relative z-10 flex-grow overflow-y-auto">
        
        <div className="flex justify-between items-start mb-8">
          {revealState === 'none' && (
              <button onClick={withdraw} className="px-4 py-2 border border-red-500 text-red-400 rounded hover:bg-red-900/50 transition-colors text-sm font-bold">
                  ÇEKİL
              </button>
          )}
          <div className="flex gap-4">
            <button onClick={useFiftyFifty} disabled={!lifelines.fifty} className="w-[60px] h-[40px] rounded-[50%] border-2 border-[#d4af37] flex items-center justify-center font-bold bg-[#000033] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#000033] disabled:opacity-30 disabled:cursor-not-allowed transition-colors relative" title="%50">
                <span className="text-sm">50:50</span>
                {!lifelines.fifty && <X className="absolute text-red-600 w-full h-full" />}
            </button>
            <button onClick={usePhone} disabled={!lifelines.phone} className="w-[60px] h-[40px] rounded-[50%] border-2 border-[#d4af37] flex items-center justify-center font-bold bg-[#000033] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#000033] disabled:opacity-30 disabled:cursor-not-allowed transition-colors relative" title="Telefon">
                <Phone size={20} />
                {!lifelines.phone && <X className="absolute text-red-600 w-full h-full" />}
            </button>
            <button onClick={useAudience} disabled={!lifelines.audience} className="w-[60px] h-[40px] rounded-[50%] border-2 border-[#d4af37] flex items-center justify-center font-bold bg-[#000033] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#000033] disabled:opacity-30 disabled:cursor-not-allowed transition-colors relative" title="Seyirci">
                <Users size={20} />
                {!lifelines.audience && <X className="absolute text-red-600 w-full h-full" />}
            </button>
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
                if (revealState === 'selected' && selectedOption === opt) { bgClass = "bg-[#d97706]"; borderClass = "border-white"; }
                if (revealState === 'revealed') {
                    if (opt === currentQ.correctAnswer) { bgClass = "bg-[#059669] answer-correct"; borderClass = "border-[#34d399]"; } 
                    else if (opt === selectedOption) { bgClass = "bg-[#dc2626]"; borderClass = "border-[#f87171]"; }
                }

                if (eliminatedOptions.includes(opt)) { return <div key={idx} className="h-[52px] md:h-[60px]"></div>; }
                return (
                    <button key={idx} onClick={() => handleOptionSelect(opt)} disabled={revealState !== 'none'} className={`py-3 px-6 text-left flex items-center rounded-full border hover:border-white hover:text-yellow-300 transition-all ${bgClass} ${borderClass} ${textClass} h-auto justify-start`}>
                        <span className="text-[#d4af37] font-bold mr-3 w-6 text-lg">{String.fromCharCode(65 + idx)}:</span>
                        <span className="flex-1 font-semibold">{opt}</span>
                    </button>
                );
            })}
        </div>
      </div>

      <div className="w-full md:w-64 bg-blue-900/30 border-l-0 md:border-l border-blue-800 p-4 flex flex-col justify-center order-last md:order-last">
        <div className="grid grid-cols-5 md:flex md:flex-col-reverse gap-2">
            {MONEY_LEVELS.slice(0, questions.length).map((money, idx) => (
                <div key={idx} className={cn(
                    "flex justify-center items-center px-3 py-1 text-sm font-mono rounded-md text-center",
                    idx === qIndex ? 'bg-[#d4af37] text-[#000033] font-bold scale-105 shadow-lg text-base' : 'text-[#d4af37]',
                    "border border-transparent",
                    idx === qIndex && "border-white"
                )}>
                    <span>{money}</span>
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
                {modalContent.chartData && (
                    <div className="flex justify-around items-end h-40 gap-2 pt-4 bg-blue-900/30 rounded-lg p-4">
                        {modalContent.chartData.map((data: {name: string, value: number}, i: number) => (
                            <div key={i} className="flex flex-col items-center w-1/4 h-full justify-end group">
                                <div className="text-xs text-yellow-300 mb-1 font-bold">{data.value}%</div>
                                <div className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t transition-all duration-500" style={{ height: `${data.value}%` }}></div>
                                <div className="text-sm font-bold mt-2 text-yellow-500">{data.name}</div>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={() => setModalContent(null)} className="mt-6 w-full py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-bold transition-colors">
                    TAMAM
                </button>
            </div>
        </div>
      )}
    </div>
  );
}

// This is a wrapper to use Suspense
function MilyonerOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#000022]"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>}>
            <MilyonerGame />
        </Suspense>
    )
}

// We are now exporting the wrapped component as the default.
export default MilyonerOyunPage;

    