
'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Phone, Users, X, Loader2, Star, LifeBuoy, Heart, Trophy } from 'lucide-react';
import { playSound, stopSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import Confetti from 'react-dom-confetti';
import { addScore, checkAndAwardMillionaireBadge } from '../actions';
import { getMilyonerQuestionsAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';

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

function MilyonerClientPage({ initialQuestions, initialError }: { initialQuestions: Question[] | null, initialError?: string }) {
    const router = useRouter();
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
    const [guaranteedMoney, setGuaranteedMoney] = useState(0);


    const resetQuestion = useCallback(() => {
        setSelectedOption(null);
        setRevealState('none');
        setEliminatedOptions([]);
        setModalContent(null);
    }, []);

    const handleEndGame = useCallback(async (endState: 'lost' | 'withdraw', prize: number) => {
        setGameState(endState);
        if (user && prize > 0) {
          await addScore(user.uid, prize, "Milyoner Yarışması");
        }
      }, [user]);

    const checkAnswer = useCallback((index: number) => {
        const correctIndex = questions[qIndex].options?.indexOf(questions[qIndex].correctAnswer!);

        if (index === correctIndex) {
            playSound('correct');
            setTimeout(async () => {
                const currentPrize = parseInt(MONEY_LEVELS[qIndex].replace(/\./g, ''));
                if (qIndex === 4) setGuaranteedMoney(currentPrize); // 5. soru
                if (qIndex === 9) setGuaranteedMoney(currentPrize); // 10. soru

                if (qIndex < questions.length - 1) {
                    setQIndex(prev => prev + 1);
                    resetQuestion();
                } else {
                    setGameState('won');
                    setShowConfetti(true);
                    if (user) {
                        await addScore(user.uid, 1000, "Milyoner Yarışmasını Kazandı");
                        await checkAndAwardMillionaireBadge(user.uid);
                    }
                }
            }, 2000);
        } else {
            playSound('incorrect');
            setTimeout(() => {
                handleEndGame('lost', guaranteedMoney);
            }, 2000);
        }
    }, [qIndex, questions, resetQuestion, user, handleEndGame, guaranteedMoney]);
    
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
        
        const correctIndex = questions[qIndex].options?.indexOf(questions[qIndex].correctAnswer!);
        let wrongs = [0, 1, 2, 3].filter(i => i !== correctIndex);
        
        wrongs = wrongs.sort(() => Math.random() - 0.5).slice(0, 2);
        
        setEliminatedOptions(wrongs);
        setLifelines(prev => ({ ...prev, fifty: false }));
    };

    const usePhone = () => {
        if (!lifelines.phone) return;
        
        const correctIndex = questions[qIndex].options?.indexOf(questions[qIndex].correctAnswer!);
        const correctLetter = ["A", "B", "C", "D"][correctIndex!];
        
        const suggestion = Math.random() < 0.8 ? correctLetter : ["A", "B", "C", "D"][Math.floor(Math.random() * 4)];

        setModalContent({
            title: "📞 Telefon Jokeri",
            text: `Arkadaşın Abdullah düşünüyor...\n\n"Bence cevap %90 ${suggestion} şıkkı dostum. Ama son karar senin."`
        });
        setLifelines(prev => ({ ...prev, phone: false }));
    };

    const useAudience = () => {
        if (!lifelines.audience) return;
        
        const correctIndex = questions[qIndex].options?.indexOf(questions[qIndex].correctAnswer!);
        const percentages = [0, 0, 0, 0];
        let remaining = 100;
        
        percentages[correctIndex!] = Math.floor(Math.random() * 30) + 40;
        remaining -= percentages[correctIndex!];
        
        const wrongOptions = [0,1,2,3].filter(i => i !== correctIndex);
        const firstWrongShare = Math.floor(Math.random() * remaining);
        percentages[wrongOptions[0]] = firstWrongShare;
        remaining -= firstWrongShare;
        
        const secondWrongShare = Math.floor(Math.random() * remaining);
        percentages[wrongOptions[1]] = secondWrongShare;
        remaining -= secondWrongShare;
        
        percentages[wrongOptions[2]] = remaining;

        setModalContent({
            title: "👥 Seyirci Jokeri",
            chart: percentages
        });
        setLifelines(prev => ({ ...prev, audience: false }));
    };

    const goHome = () => router.push('/');

    if (userLoading) {
        return <div className="flex h-screen items-center justify-center bg-[#000022]"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>;
    }
    
    if (error) {
        return (
             <div className="flex h-screen items-center justify-center p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                    <strong className="font-bold">Hata! </strong>
                    <span className="block sm:inline">{error}</span>
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
            <div className="min-h-screen bg-[#000022] flex flex-col items-center justify-center text-center p-4">
                <div className="w-48 h-48 rounded-full border-4 border-yellow-600 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(212,175,55,0.5)] bg-gradient-to-br from-blue-900 to-black">
                    <span className="text-6xl">🏆</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 drop-shadow-lg">
                    MİLYONER
                </h1>
                <p className="text-gray-300 mb-8 text-lg font-medium">Bilgilerini Test Et, 1000 Puanı Kazan!</p>
                <button 
                    onClick={() => setGameState('playing')}
                    className="px-12 py-4 bg-gradient-to-r from-blue-800 to-blue-600 border-2 border-gray-400 rounded-full text-xl font-bold hover:border-yellow-500 hover:text-yellow-400 hover:scale-105 transition-all shadow-lg"
                >
                    YARIŞMAYA BAŞLA
                </button>
            </div>
        );
    }
    
    const endGameScreen = (title: string, prize: number) => (
        <div className="min-h-screen bg-[#000022] flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-4xl font-bold mb-4 text-yellow-500">{title}</h1>
            <div className="bg-blue-900/50 p-8 rounded-2xl border border-blue-500 mb-8">
                <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Kazanılan Ödül</p>
                <p className="text-5xl font-black text-white">{prize} Puan</p>
            </div>
            <div className="flex gap-4">
                <Button onClick={() => window.location.reload()} className="px-10 py-3">TEKRAR OYNA</Button>
                <Button onClick={goHome} variant="secondary" className="px-10 py-3">ANA SAYFA</Button>
            </div>
        </div>
    );
    
    if (gameState === 'won') return endGameScreen('TEBRİKLER! BÜYÜK ÖDÜLÜ KAZANDIN! 🏆', 1000);
    if (gameState === 'lost') return endGameScreen('ELENDİNİZ', guaranteedMoney);
    if (gameState === 'withdraw') return endGameScreen('YARIŞMADAN ÇEKİLDİN', qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0);

    const currentQ = questions[qIndex];
     if (!currentQ) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#000022]">
                <Loader2 className="h-12 w-12 animate-spin text-white"/>
                <p className="ml-4 text-white">Soru yükleniyor...</p>
            </div>
        );
    }


    const correctIndex = currentQ.options?.indexOf(currentQ.correctAnswer!);

    return (
        <div className="min-h-screen flex flex-col md:flex-row text-white overflow-hidden bg-[#000022] font-sans relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a5c_0%,_#000022_100%)] -z-10"></div>
            
            <div className="flex-1 flex flex-col justify-between p-4 md:p-8 relative z-10 md:order-last">
                <div className="flex justify-between items-start mb-8">
                    {revealState === 'none' && (
                        <Button onClick={withdraw} variant="destructive" className="px-4 py-2 text-sm font-bold">ÇEKİL</Button>
                    )}
                    <div className="flex gap-4">
                        <Button onClick={useFiftyFifty} disabled={!lifelines.fifty} className="lifeline-btn" title="%50">50:50</Button>
                        <Button onClick={usePhone} disabled={!lifelines.phone} className="lifeline-btn" title="Telefon"><Phone size={20} /></Button>
                        <Button onClick={useAudience} disabled={!lifelines.audience} className="lifeline-btn" title="Seyirci"><Users size={20} /></Button>
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
                            <Button key={idx} onClick={() => handleOptionSelect(idx)} disabled={revealState !== 'none'} className={`answer-btn py-3 px-6 text-left flex items-center h-auto justify-start ${statusClass}`}>
                                <span className="text-[#d4af37] font-bold mr-3 w-6 text-lg">{['A','B','C','D'][idx]}:</span>
                                <span className="flex-1 font-semibold">{opt}</span>
                            </Button>
                        );
                    })}
                </div>
            </div>

            <div className="w-full md:w-64 bg-blue-900/30 border-l-0 md:border-l-2 border-blue-800 p-4 flex flex-col justify-center order-first md:order-last">
                <div className="grid grid-cols-5 md:flex md:flex-col-reverse gap-2">
                    {MONEY_LEVELS.map((money, idx) => (
                        <div key={idx} className={cn(
                            "flex justify-center items-center px-3 py-1 text-sm font-mono rounded-md text-center",
                            idx === qIndex ? 'bg-yellow-500 text-black font-bold scale-105 shadow-lg' : 'text-yellow-400',
                            idx === 4 || idx === 9 ? 'text-white font-bold' : ''
                        )}>
                            <span className="mr-2 text-right w-6">{idx + 1}</span>
                            <span>{money}</span>
                        </div>
                    ))}
                </div>
            </div>

            {modalContent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setModalContent(null)}>
                    <div className="bg-[#000033] border-2 border-[#d4af37] p-6 rounded-xl max-w-sm w-full shadow-[0_0_20px_rgba(212,175,55,0.5)]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-[#d4af37] mb-4 border-b border-[#d4af37] pb-2 flex items-center gap-2">{modalContent.icon} {modalContent.title}</h3>
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
                        <Button onClick={() => setModalContent(null)} className="mt-6 w-full py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-bold transition-colors">TAMAM</Button>
                    </div>
                </div>
            )}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <Confetti active={showConfetti} config={confettiConfig} />
            </div>
        </div>
    );
}

// This is the main server component for the page
export default function MilyonerOyunPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const RenderPage = async () => {
        const params = {
            courseId: typeof searchParams.courseId === 'string' ? searchParams.courseId : undefined,
            unitId: typeof searchParams.unitId === 'string' ? searchParams.unitId : undefined,
            topicId: typeof searchParams.topicId === 'string' ? searchParams.topicId : undefined,
        };
        const questionData = await getMilyonerQuestionsAction(params);
        return <MilyonerClientPage initialQuestions={questionData.questions} initialError={questionData.error} />
    }

    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#000022]"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>}>
          <RenderPage />
        </Suspense>
    );
}
