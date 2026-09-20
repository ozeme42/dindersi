'use client';

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Phone, Users, X, Loader2, Star, Trophy, ArrowLeft, AlertTriangle } from 'lucide-react';
import { playSound, stopSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import Confetti from 'react-dom-confetti';
import { checkAndAwardMillionaireBadge, getMillionaireQuestions, checkGamePlayLimitAction, addScore } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import { GameEndScreen } from '@/components/game-end-screen';
import { useToast } from '@/hooks/use-toast';
import { getGameBackUrl } from '@/lib/game-navigation';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';

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

interface MilyonerBoardProps {
    questions: Question[];
    qIndex: number;
    revealState: string;
    selectedOption: string | null;
    eliminatedOptions: string[];
    lifelines: { fifty: boolean; phone: boolean; audience: boolean };
    handleOptionSelect: (option: string) => void;
    withdraw: () => void;
    useFiftyFifty: () => void;
    usePhone: () => void;
    useAudience: () => void;
    isMission: boolean;
}

function MilyonerBoard({
    questions,
    qIndex,
    revealState,
    selectedOption,
    eliminatedOptions,
    lifelines,
    handleOptionSelect,
    withdraw,
    useFiftyFifty,
    usePhone,
    useAudience,
    isMission,
}: MilyonerBoardProps) {
    const { theme } = useWordwall();
    const currentQ = questions[qIndex];

    if (!currentQ) return null;

    return (
        <div className="w-full h-full min-h-0 flex flex-col lg:flex-row gap-2 sm:gap-3 overflow-hidden">
            {/* SOL / ANA ALAN (Jokerler + Soru + Seçenekler) */}
            <div className="flex-1 flex flex-col justify-between h-full min-h-0 overflow-hidden">
                
                {/* ÜST BAR: Jokerler & Çekil */}
                <div className="flex items-center justify-between gap-2 p-1 sm:p-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        {revealState === 'none' && (
                            <button 
                                type="button"
                                onClick={withdraw} 
                                className={cn(
                                    "px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all border shadow-sm active:scale-95 cursor-pointer",
                                    "border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                )}
                            >
                                ÇEKİL
                            </button>
                        )}
                        {isMission && (
                            <span className={cn(
                                "px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider",
                                theme.badgeCounter
                            )}>
                                GÖREV MODU
                            </span>
                        )}
                    </div>

                    {/* Joker Butonları */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button 
                            type="button"
                            onClick={useFiftyFifty} 
                            disabled={!lifelines.fifty} 
                            className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center font-black transition-all relative shadow-md cursor-pointer",
                                lifelines.fifty 
                                    ? "bg-amber-400/20 border-amber-400/60 text-amber-300 hover:bg-amber-400/30 hover:scale-105 active:scale-95" 
                                    : "opacity-30 cursor-not-allowed border-slate-600 bg-slate-800 text-slate-500"
                            )} 
                            title="%50 Jokeri"
                        >
                            <span className="text-xs sm:text-sm">%50</span>
                            {!lifelines.fifty && <X className="absolute text-rose-500 w-6 h-6 sm:w-7 sm:h-7" />}
                        </button>
                        <button 
                            type="button"
                            onClick={usePhone} 
                            disabled={!lifelines.phone} 
                            className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center font-black transition-all relative shadow-md cursor-pointer",
                                lifelines.phone 
                                    ? "bg-cyan-400/20 border-cyan-400/60 text-cyan-300 hover:bg-cyan-400/30 hover:scale-105 active:scale-95" 
                                    : "opacity-30 cursor-not-allowed border-slate-600 bg-slate-800 text-slate-500"
                            )} 
                            title="Telefon Jokeri"
                        >
                            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                            {!lifelines.phone && <X className="absolute text-rose-500 w-6 h-6 sm:w-7 sm:h-7" />}
                        </button>
                        <button 
                            type="button"
                            onClick={useAudience} 
                            disabled={!lifelines.audience} 
                            className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center font-black transition-all relative shadow-md cursor-pointer",
                                lifelines.audience 
                                    ? "bg-fuchsia-400/20 border-fuchsia-400/60 text-fuchsia-300 hover:bg-fuchsia-400/30 hover:scale-105 active:scale-95" 
                                    : "opacity-30 cursor-not-allowed border-slate-600 bg-slate-800 text-slate-500"
                            )} 
                            title="Seyirci Jokeri"
                        >
                            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                            {!lifelines.audience && <X className="absolute text-rose-500 w-6 h-6 sm:w-7 sm:h-7" />}
                        </button>
                    </div>
                </div>

                {/* ORTA: SORU KARTI */}
                <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0 overflow-hidden">
                    <div className={cn(
                        "w-full h-full max-h-[260px] p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border-2 backdrop-blur-xl flex flex-col items-center justify-center text-center relative transition-all duration-300 shadow-xl overflow-y-auto custom-scrollbar",
                        theme.cardBg,
                        theme.cardBorder,
                        theme.cardShadow
                    )}>
                        <div className={cn(
                            "absolute top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider",
                            theme.badgeCounter
                        )}>
                            Soru {qIndex + 1} / {questions.length}
                        </div>
                        <h2 className={cn("text-base sm:text-xl md:text-2xl lg:text-3xl font-black leading-snug mt-3", theme.cardText)}>
                            {currentQ.text}
                        </h2>
                    </div>
                </div>

                {/* ALT: CEVAP SEÇENEKLERİ (2x2 Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-1 sm:p-2 flex-shrink-0">
                    {(currentQ.options || []).map((opt, idx) => {
                        const isEliminated = eliminatedOptions.includes(opt);
                        if (isEliminated) {
                            return <div key={idx} className="h-12 sm:h-14 md:h-16 rounded-xl border border-transparent opacity-0 pointer-events-none" />;
                        }

                        let statusStyle = theme.buttonIdle;
                        let letterBadgeStyle = theme.badgeCounter;

                        if (revealState === 'selected' && selectedOption === opt) {
                            statusStyle = "bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-[1.02]";
                            letterBadgeStyle = "bg-slate-900 text-amber-400";
                        } else if (revealState === 'revealed') {
                            if (opt === currentQ.correctAnswer) {
                                statusStyle = "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.6)] animate-pulse scale-[1.02]";
                                letterBadgeStyle = "bg-white text-emerald-800";
                            } else if (opt === selectedOption) {
                                statusStyle = "bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)]";
                                letterBadgeStyle = "bg-white text-rose-800";
                            }
                        }

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleOptionSelect(opt)}
                                disabled={revealState !== 'none'}
                                className={cn(
                                    "px-3 py-3 sm:px-4 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl border-2 font-bold text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 outline-none shadow-md cursor-pointer",
                                    revealState === 'none' && "hover:scale-[1.01] active:scale-95",
                                    statusStyle
                                )}
                            >
                                <div className={cn(
                                    "flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-xs sm:text-sm md:text-base transition-colors",
                                    letterBadgeStyle
                                )}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <span className="flex-1 text-xs sm:text-sm md:text-base leading-tight font-black break-words line-clamp-2">
                                    {opt}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SAĞ: ÖDÜL MERDİVENİ */}
            <div className={cn(
                "w-full lg:w-56 flex-shrink-0 rounded-2xl border-2 p-2 sm:p-3 backdrop-blur-xl flex flex-col justify-center shadow-xl",
                theme.subPanelBg,
                theme.cardBorder
            )}>
                <div className="flex lg:flex-col-reverse gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 custom-scrollbar">
                    {MONEY_LEVELS.slice(0, questions.length).map((money, idx) => {
                        const isCurrent = idx === qIndex;
                        const isPassed = idx < qIndex;
                        const isMilestone = (idx + 1) === 5 || (idx + 1) === 10;

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "flex-shrink-0 flex items-center justify-between px-2.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all border",
                                    isCurrent 
                                        ? cn(theme.buttonSelected, "scale-105 shadow-md")
                                        : isPassed
                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                            : cn("border-transparent opacity-50", theme.subText)
                                )}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="opacity-60">{idx + 1}.</span>
                                    <span>{money} XP</span>
                                </div>
                                {isMilestone && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function MilyonerGame() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: userLoading } = useAuth();
    const { toast } = useToast(); 
    
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [qIndex, setQIndex] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'won' | 'lost' | 'withdraw'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [revealState, setRevealState] = useState('none');
    const [lifelines, setLifelines] = useState({ fifty: true, phone: true, audience: true });
    const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
    const [modalContent, setModalContent] = useState<any>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    
    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

    const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Genel';
    const gameContext = `Kim 1000 Puan İster? - ${searchParams.get('courseName') || 'Genel'} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/milyoner-yarismasi' });

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
        setIsScoreSaved(false);
        fetchGameData();
    }, [fetchGameData]);

    const resetQuestion = useCallback(() => {
        setSelectedOption(null);
        setRevealState('none');
        setEliminatedOptions([]);
        setModalContent(null);
    }, []);

    const handleEndGame = useCallback(async (endState: 'lost' | 'withdraw' | 'won', _prize: number) => {
        setGameState(endState);
        if (endState === 'won') setShowConfetti(true);
    }, []);

    const handleSaveAndExit = async () => {
        let prize = 0;
        if (gameState === 'won') prize = 1000;
        else if (gameState === 'withdraw') prize = qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0;
        else prize = 0;

        const isSuccess = gameState === 'won' && prize === 1000;

        if (!user || isSaving || isScoreSaved) {
            router.push(backUrl);
            return;
        }

        if (prize <= 0 && !isMission) {
            router.push(backUrl);
            return;
        }

        setIsSaving(true);
        try {
            let finalPrize = prize;
            if (!isMission) {
                const canEarnPoints = await checkGamePlayLimitAction(user.uid, gameContext);
                if (!canEarnPoints) {
                    finalPrize = 0;
                    toast({ title: "Bilgi", description: "Bu konudan daha fazla puan kazanamazsınız (Max 2 kez).", variant: "default" });
                }
            }

            if (isMission && topicId) {
                const batch = writeBatch(db);
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: finalPrize,
                    context: topicId,
                    gameType: 'milyoner-yarismasi',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isSuccess
                });

                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(finalPrize)
                });

                await batch.commit();

                if (isSuccess) {
                    toast({ title: "Görev Başarılı!", description: `Tebrikler! Konuyu tamamladın ve ${finalPrize} puan eklendi.`, className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi (Görev Tamamlanmadı)", description: "Büyük ödülü (1.000 puan) kazanmalısın.", variant: "destructive" });
                }
            } else {
                if (finalPrize > 0) {
                    const result = await addScore(user.uid, finalPrize, gameContext);
                    if (result.success) {
                        toast({ title: 'Başarılı!', description: `Kazanılan: ${finalPrize} Puan.` });
                        if (isSuccess) await checkAndAwardMillionaireBadge(user.uid);
                    } else {
                        toast({ title: 'Hata', description: "Puan kaydedilemedi.", variant: 'destructive' });
                    }
                }
            }
            setIsScoreSaved(true);
        } catch (e) {
            console.error(e);
            toast({ title: 'Hata', description: "Bir hata oluştu.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

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
                    const finalPrize = 1000;
                    handleEndGame('won', finalPrize);
                }
            }, 2000);
        } else {
            playSound('incorrect');
            setTimeout(() => {
                const prize = 0; 
                handleEndGame('lost', prize);
            }, 2000);
        }
    }, [qIndex, questions, resetQuestion, handleEndGame]);

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
            icon: <Phone size={32} className="text-amber-400" />,
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
            icon: <Users size={32} className="text-amber-400" />,
            chartData: options.map(opt => ({ name: opt, value: percentages[opt] || 0 }))
        });
        setLifelines(prev => ({ ...prev, audience: false }));
    };

    if (isLoading || userLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950 text-white">
                <div className="text-center space-y-4 max-w-md bg-slate-900 p-8 rounded-3xl border border-red-500/30">
                    <AlertTriangle className="h-14 w-14 text-red-400 mx-auto" />
                    <h3 className="text-xl font-bold">Oyun Başlatılamadı</h3>
                    <p className="text-slate-400 text-sm">{error}</p>
                    <Button asChild variant="secondary" className="w-full">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Puan hesaplama
    let currentPrize = 0;
    if (gameState === 'won') currentPrize = 1000;
    else if (gameState === 'withdraw') currentPrize = qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0;
    else if (gameState === 'lost') currentPrize = 0;
    else currentPrize = qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0;

    const isSuccess = gameState === 'won' && currentPrize === 1000;

    return (
        <WordwallShell
            title="Kim 1000 Puan İster?"
            subtitle={topicName}
            currentQuestionIndex={qIndex + 1}
            totalQuestions={questions.length}
            score={currentPrize}
            backUrl={backUrl}
            isFinished={gameState !== 'playing'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-1.5 sm:p-3 flex flex-col"
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={confettiConfig} />
            </div>

            {gameState !== 'playing' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={currentPrize} 
                        onSave={user ? handleSaveAndExit : undefined} 
                        isSaving={isSaving} 
                        scoreSaved={isScoreSaved} 
                        onRestart={resetGame} 
                        backUrl={backUrl} 
                        isSuccess={isSuccess}
                        successThreshold={1000}
                        isMission={isMission}
                        customMessage={
                            isMission 
                                ? (isSuccess 
                                    ? "Tebrikler! 1.000 XP barajını aşarak Milyoner görevini başarıyla tamamladın." 
                                    : `Maalesef ${currentPrize} XP aldın. Görevi tamamlamak için 1.000 XP barajına (büyük ödüle) ulaşmalısın.`)
                                : undefined
                        }
                    />
                </div>
            ) : (
                <MilyonerBoard
                    questions={questions}
                    qIndex={qIndex}
                    revealState={revealState}
                    selectedOption={selectedOption}
                    eliminatedOptions={eliminatedOptions}
                    lifelines={lifelines}
                    handleOptionSelect={handleOptionSelect}
                    withdraw={withdraw}
                    useFiftyFifty={useFiftyFifty}
                    usePhone={usePhone}
                    useAudience={useAudience}
                    isMission={isMission}
                />
            )}

            {/* JOKER MODALLARI */}
            {modalContent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={() => setModalContent(null)}>
                    <div className="bg-slate-900 border-2 border-indigo-500/50 p-6 rounded-3xl max-w-sm w-full shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/10">
                            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                                {modalContent.icon}
                            </div>
                            <h3 className="text-xl font-black text-white">{modalContent.title}</h3>
                        </div>
                        {modalContent.text && <p className="text-slate-200 whitespace-pre-line text-base leading-relaxed font-bold">{modalContent.text}</p>}
                        {modalContent.chartData && (
                            <div className="flex justify-around items-end h-44 gap-3 pt-4 bg-black/40 rounded-2xl p-4 border border-white/5">
                                {modalContent.chartData.map((data: {name: string, value: number}, i: number) => (
                                    <div key={i} className="flex flex-col items-center w-1/4 h-full justify-end">
                                        <div className="text-xs text-amber-400 mb-1.5 font-black">{data.value}%</div>
                                        <div className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-xl transition-all duration-700 ease-out" style={{ height: `${Math.max(10, data.value)}%` }}></div>
                                        <div className="text-xs font-black mt-2 text-white truncate w-full text-center">{String.fromCharCode(65 + i)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button 
                            type="button"
                            onClick={() => setModalContent(null)} 
                            className="mt-6 w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base font-black transition-all active:scale-95 shadow-lg shadow-indigo-600/30 cursor-pointer"
                        >
                            TAMAM
                        </button>
                    </div>
                </div>
            )}
        </WordwallShell>
    );
}

function MilyonerOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-indigo-400"/></div>}>
            <MilyonerGame />
        </Suspense>
    );
}

export default MilyonerOyunPage;