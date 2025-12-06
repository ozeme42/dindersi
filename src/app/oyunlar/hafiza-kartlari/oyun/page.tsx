'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getHafizaKartlariAction, submitHafizaKartlariScoreAction, type MatchingPair } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Brain, Sparkles, Trophy, XOctagon, CheckCircle2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import Confetti from 'react-dom-confetti';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

function MemoryGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const mainContentRef = useRef<HTMLDivElement>(null);

    const [pairs, setPairs] = useState<MatchingPair[]>([]);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'error'>('loading');
    const [score, setScore] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
    const [isChecking, setIsChecking] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const gameContext = `Hafıza Kartları - ${searchParams.get('courseName') || 'Genel'} > ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = '/oyunlar/hafiza-kartlari';

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getHafizaKartlariAction(params);
        
        if (result.error || !result.pairs) {
            setError(result.error || "Bu konu için oyun verisi bulunamadı.");
            setGameState('error');
        } else {
            setPairs(result.pairs);
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    useEffect(() => {
        if (pairs.length > 0 && matchedIds.size === pairs.length) {
            setShowConfetti(true);
            playSound('win');
            const timer = setTimeout(() => setGameState('finished'), 1500);
            return () => clearTimeout(timer);
        }
    }, [matchedIds, pairs.length]);
    
    useEffect(() => {
        if (flippedIndices.length === 2) {
            setIsChecking(true);
            const [firstIndex, secondIndex] = flippedIndices;
            const firstCard = pairs[firstIndex];
            const secondCard = pairs[secondIndex];

            if (firstCard.pairId === secondCard.pairId) {
                // Correct match
                playSound('correct');
                setScore(prev => prev + 50);
                setMatchedIds(prev => new Set(prev).add(firstCard.id).add(secondCard.id));
                setFlippedIndices([]);
                setIsChecking(false);
            } else {
                // Incorrect match
                setTimeout(() => {
                    playSound('flip'); // Flip back sound
                    setScore(prev => Math.max(0, prev - 5));
                    setFlippedIndices([]);
                    setIsChecking(false);
                }, 1000);
            }
        }
    }, [flippedIndices, pairs]);

    const handleCardClick = (index: number) => {
        if (isChecking || flippedIndices.includes(index) || matchedIds.has(pairs[index].id)) {
            return;
        }
        playSound('pop');
        setFlippedIndices(prev => [...prev, index]);
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitHafizaKartlariScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const handleRestart = () => {
        setScore(0);
        setMatchedIds(new Set());
        setFlippedIndices([]);
        setIsScoreSaved(false);
        setIsChecking(false);
        setShowConfetti(false);
        setGameState('loading');
        fetchGameData();
    };

    // --- RENDER STATES ---

    if (gameState === 'loading') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
                <span className="text-slate-400 font-medium animate-pulse">Kartlar Dağıtılıyor...</span>
            </div>
        );
    }

    if (gameState === 'error') {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-6 max-w-md bg-slate-900 p-8 rounded-3xl border border-red-500/30 shadow-2xl">
                    <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <Brain className="h-10 w-10 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-2">Hata Oluştu</h3>
                        <p className="text-slate-400">{error}</p>
                    </div>
                     <Button asChild className="w-full bg-slate-800 text-white hover:bg-slate-700 h-12 rounded-xl">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    if (gameState === 'finished') {
        return (
            <div className="relative flex items-center justify-center h-screen bg-slate-950">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Confetti active={showConfetti} config={{ elementCount: 150, spread: 360, startVelocity: 40 }} />
                </div>
                <GameEndScreen 
                    score={score}
                    onSave={handleSaveAndExit}
                    isSaving={isSaving}
                    scoreSaved={isScoreSaved}
                    onRestart={handleRestart}
                    backUrl={backUrl}
                />
            </div>
        );
    }
    
    const matchedPairs = matchedIds.size / 2;
    const totalPairs = pairs.length / 2;
    const progressPercentage = (matchedPairs / totalPairs) * 100;

    return (
        <div ref={mainContentRef} className="flex flex-col min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white p-4 md:p-6 overflow-hidden relative selection:bg-rose-500/30">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-500/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="w-full max-w-6xl mx-auto z-10 flex flex-col gap-6 h-full pb-24 md:pb-8">
                
                {/* --- HUD (Üst Panel) --- */}
                <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden shrink-0">
                    <div className="absolute bottom-0 left-0 h-1.5 bg-slate-800 w-full">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-indigo-500 transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="bg-rose-500/20 p-2.5 rounded-xl hidden md:block shrink-0">
                                <Brain className="h-6 w-6 text-rose-400" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg md:text-2xl font-black text-white truncate">Hafıza Kartları</h1>
                                <p className="text-slate-400 text-xs md:text-sm hidden md:block truncate">Eşleri bul, hafızanı test et!</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 shrink-0">
                            
                            {/* BİTİR TUŞU */}
                            <Button 
                                onClick={() => setGameState('finished')}
                                variant="ghost"
                                className="h-9 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg font-bold text-xs md:text-sm transition-colors border border-red-500/10"
                            >
                                <XOctagon className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">BİTİR</span>
                            </Button>

                            <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1.5 rounded-xl border border-yellow-500/30">
                                <Trophy className="h-5 w-5 text-yellow-400" />
                                <span className="font-black text-xl text-yellow-400">{score}</span>
                            </div>
                            
                            <div className="hidden sm:flex items-center gap-2 font-bold bg-slate-800/80 px-3 py-1.5 rounded-xl border border-white/10 text-slate-300">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                <span>{matchedPairs}/{totalPairs}</span>
                            </div>

                            <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 border-white/10 text-slate-300 hover:text-white h-10 w-10 rounded-xl" />
                        </div>
                    </div>
                </div>

                {/* --- OYUN ALANI (GRID) --- */}
                <div className="flex-grow flex items-center justify-center">
                    <div className={cn(
                        "grid gap-3 md:gap-4 w-full auto-rows-fr",
                        // Kart sayısına göre dinamik grid (Mobilde 2-3, Masaüstünde 4-6 kolon)
                        pairs.length <= 12 ? "grid-cols-3 md:grid-cols-4 max-w-4xl" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                    )}>
                        {pairs.map((card, index) => {
                            const isFlipped = flippedIndices.includes(index) || matchedIds.has(card.id);
                            const isMatched = matchedIds.has(card.id);

                            return (
                                <div
                                    key={card.id}
                                    onClick={() => handleCardClick(index)}
                                    className={cn(
                                        "relative aspect-[3/4] group cursor-pointer [perspective:1000px]",
                                        isMatched && "opacity-60 cursor-default grayscale-[0.5] hover:grayscale-0 transition-all duration-500"
                                    )}
                                >
                                    <div className={cn(
                                        "w-full h-full transition-all duration-500 [transform-style:preserve-3d]",
                                        isFlipped ? "[transform:rotateY(180deg)]" : "group-hover:scale-[1.02]"
                                    )}>
                                        
                                        {/* --- ARKA YÜZ (KAPALI) --- */}
                                        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                                            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 shadow-xl flex items-center justify-center relative overflow-hidden">
                                                {/* Cyber Desen */}
                                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')]"></div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-rose-500/10 to-transparent"></div>
                                                
                                                {/* Logo */}
                                                <div className="relative z-10 p-3 bg-slate-950/50 rounded-full border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                                                    <Brain className="h-6 w-6 md:h-8 md:w-8 text-rose-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* --- ÖN YÜZ (AÇIK) --- */}
                                        <div className="absolute inset-0 w-full h-full [transform:rotateY(180deg)] [backface-visibility:hidden]">
                                            <div className={cn(
                                                "w-full h-full rounded-2xl flex items-center justify-center p-2 text-center shadow-xl border-2 transition-all",
                                                isMatched 
                                                    ? "bg-emerald-900/80 border-emerald-500 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                                                    : "bg-slate-800 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                                            )}>
                                                {/* Metin Boyutlandırma (Uzun metinler için küçültme) */}
                                                <span className={cn(
                                                    "font-bold select-none drop-shadow-md leading-tight",
                                                    card.content.length > 20 ? "text-xs md:text-sm" : "text-sm md:text-lg"
                                                )}>
                                                    {card.content}
                                                </span>
                                                
                                                {/* Eşleşme İkonu */}
                                                {isMatched && (
                                                    <div className="absolute top-2 right-2 text-emerald-400 animate-in zoom-in duration-300">
                                                        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-16 w-16 animate-spin text-rose-500" /></div>}>
            <MemoryGame />
        </Suspense>
    );
}