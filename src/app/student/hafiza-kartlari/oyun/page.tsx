'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMemoryGameAction, submitMemoryGameScoreAction, type MemoryCardPair } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Trophy, Brain, Sparkles, CheckCircle2, XCircle, Ghost, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';

type CardItem = {
    id: number;
    pairId: number;
    type: 'concept' | 'definition';
    text: string;
};

const shuffleArray = <T,>(array: T[]): T[] => {
    return array.slice().sort(() => Math.random() - 0.5);
};

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-rose-900/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-violet-900/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] bg-pink-500/10 rounded-full blur-[100px]" />
    </div>
);

const GameHUD = ({ score, matched, total }: { score: number, matched: number, total: number }) => {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6">
            <div className="max-w-6xl mx-auto flex justify-between items-start">
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-rose-500/30 px-4 py-2 rounded-full shadow-lg shadow-rose-500/10">
                    <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-rose-400 animate-bounce" />
                    <span className="text-xl lg:text-2xl font-black text-rose-100 font-mono">
                        {score}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-full">
                    <Brain className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
                    <span className="text-sm lg:text-base text-slate-400 font-bold uppercase tracking-wider">Eşleşen:</span>
                    <span className="text-xl lg:text-2xl font-black text-white font-mono">
                        {matched}/{total}
                    </span>
                </div>
            </div>
        </div>
    );
};

// --- ANA OYUN ---

const MemoryGame = () => {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    // State
    const [cards, setCards] = useState<CardItem[]>([]);
    const [choiceOne, setChoiceOne] = useState<CardItem | null>(null);
    const [choiceTwo, setChoiceTwo] = useState<CardItem | null>(null);
    const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
    const [disabled, setDisabled] = useState(false);
    
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    // Hata animasyonu için
    const [shakeIds, setShakeIds] = useState<number[]>([]);
    
    const gameContext = `Hafıza Kartları - ${searchParams.get('topicName')}`;

    const resetTurn = useCallback(() => {
        setChoiceOne(null);
        setChoiceTwo(null);
        setDisabled(false);
        setShakeIds([]);
    }, []);

    const initializeGame = useCallback((items: MemoryCardPair[]) => {
        const gameCards: CardItem[] = [];
        items.forEach((pair, index) => {
            gameCards.push({ id: index * 2, text: pair.concept, pairId: index, type: 'concept' });
            gameCards.push({ id: index * 2 + 1, text: pair.definition, pairId: index, type: 'definition' });
        });
        setCards(shuffleArray(gameCards));
        setChoiceOne(null);
        setChoiceTwo(null);
        setMatchedPairIds([]);
        setDisabled(false);
        setScore(0);
        setGameState('playing');
    }, []);

    useEffect(() => {
        const fetchGameData = async () => {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const { items, error } = await getMemoryGameAction(params);

            if (error || !items || items.length === 0) {
                setError(error || "Bu konu için uygun veri bulunamadı.");
                setGameState('error');
                return;
            }
            
            initializeGame(items);
        };

        fetchGameData();
    }, [searchParams, initializeGame]);

    // Kart Seçimi
    const handleChoice = (card: CardItem) => {
        if (disabled || matchedPairIds.includes(card.pairId) || card.id === choiceOne?.id) return;
        
        playSound('pop');
        choiceOne ? setChoiceTwo(card) : setChoiceOne(card);
    };

    // Eşleşme Kontrolü
    useEffect(() => {
        if (choiceOne && choiceTwo) {
            setDisabled(true);
            if (choiceOne.pairId === choiceTwo.pairId) {
                // DOĞRU
                playSound('correct');
                setScore(prev => prev + 25);
                setMatchedPairIds(prev => [...prev, choiceOne.pairId]);
                setTimeout(resetTurn, 800);
            } else {
                // YANLIŞ
                playSound('incorrect');
                setShakeIds([choiceOne.id, choiceTwo.id]);
                setTimeout(resetTurn, 1000);
            }
        }
    }, [choiceOne, choiceTwo, resetTurn]);

    // Bitiş Kontrolü
    useEffect(() => {
        if (gameState === 'playing' && cards.length > 0 && matchedPairIds.length === cards.length / 2) {
            setTimeout(() => {
                setGameState('finished');
                playSound('win');
            }, 800);
        }
    }, [matchedPairIds, cards, gameState]);

    // Kaydet ve Çık
    const handleSaveAndExit = async () => {
        if (isSaving || !user || score <= 0) {
             router.push('/student/activities');
             return;
        };

        setIsSaving(true);
        const result = await submitMemoryGameScoreAction(user.uid, score, gameContext);
        
        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Puanın başarıyla kaydedildi.' });
            router.push('/student/activities');
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
            setIsSaving(false);
        }
    };

    // --- RENDER ---

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
            </div>
        );
    }

    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-rose-950/50 p-6 rounded-3xl border border-rose-500/30">
                    <Ghost className="h-16 w-16 text-rose-500 mx-auto" />
                    <h3 className="text-xl font-bold text-rose-100">Oyun Başlatılamadı</h3>
                    <p className="text-rose-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/student/hafiza-kartlari">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <GameBackground />
                <div className="relative z-10 w-full max-w-md text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-2xl animate-pulse" />
                        <Trophy className="w-32 h-32 text-rose-400 mx-auto drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">HARİKA HAFIZA!</h1>
                        <p className="text-slate-400 text-lg">Toplam Skorun</p>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                        <div className="text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-600">
                            {score}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Button 
                            onClick={handleSaveAndExit} 
                            size="lg" 
                            disabled={isSaving}
                            className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-xl shadow-rose-500/20 transition-all hover:scale-105"
                        >
                            {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-3 h-6 w-6" />}
                            PUANI KAYDET VE ÇIK
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col">
            <GameBackground />
            <GameHUD score={score} matched={matchedPairIds.length} total={cards.length / 2} />

            <main className="flex-grow flex flex-col items-center justify-center p-4 relative z-10 mt-16">
                <div className="w-full max-w-5xl">
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 justify-items-center">
                        {cards.map((card) => {
                            const isFlipped = matchedPairIds.includes(card.pairId) || choiceOne?.id === card.id || choiceTwo?.id === card.id;
                            const isMatched = matchedPairIds.includes(card.pairId);
                            const isShaking = shakeIds.includes(card.id);

                            return (
                                <div 
                                    key={card.id} 
                                    className={cn(
                                        "group w-full aspect-[3/4] [perspective:1000px] cursor-pointer touch-manipulation",
                                        isShaking && "animate-shake"
                                    )}
                                    onClick={() => handleChoice(card)}
                                >
                                    <div className={cn(
                                        "relative w-full h-full text-center transition-all duration-500 [transform-style:preserve-3d]",
                                        isFlipped && "[transform:rotateY(180deg)]"
                                    )}>
                                        
                                        {/* KART ARKASI (KAPALI) */}
                                        <div className={cn(
                                            "absolute w-full h-full [backface-visibility:hidden] rounded-xl flex items-center justify-center shadow-lg transition-all border-2",
                                            "bg-slate-900 border-rose-900/50 hover:border-rose-500 hover:shadow-rose-500/20 group-hover:scale-105"
                                        )}>
                                            <Brain className="text-rose-500/50 w-8 h-8 lg:w-10 lg:h-10 animate-pulse" />
                                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>

                                        {/* KART ÖNÜ (AÇIK) */}
                                        <div className={cn(
                                            "absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl flex items-center justify-center p-2 text-center shadow-xl border-2 overflow-hidden",
                                            isMatched 
                                                ? "bg-green-900/80 border-green-500 text-green-100 shadow-green-500/30" 
                                                : "bg-slate-800 border-rose-400 text-white"
                                        )}>
                                            <p className="text-xs sm:text-sm md:text-base font-bold select-none leading-tight">
                                                {card.text}
                                            </p>
                                            
                                            {isMatched && (
                                                <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-green-400 opacity-80" />
                                            )}
                                            {!isMatched && (
                                                <Zap className="absolute top-1 right-1 w-3 h-3 text-rose-400 opacity-50" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
};

// --- WRAPPER ---
export default function MemoryGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-rose-500" /></div>}>
            <MemoryGame />
        </Suspense>
    );
};