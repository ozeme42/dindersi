
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getHafizaKartlariAction, submitHafizaKartlariScoreAction, type MatchingPair } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Ghost, Layers } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import Confetti from 'react-dom-confetti';

function MemoryGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

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

    const gameContext = `Hafıza Kartları - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

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
            const timer = setTimeout(() => setGameState('finished'), 1000);
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
                playSound('incorrect');
                setScore(prev => Math.max(0, prev - 10));
                setTimeout(() => {
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
        setFlippedIndices(prev => [...prev, index]);
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push('/oyunlar/hafiza-kartlari');
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
        setGameState('loading');
        fetchGameData();
    };

    if (gameState === 'loading') {
        return <div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-rose-400" /></div>;
    }

    if (gameState === 'error') {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-rose-950/50 p-6 rounded-3xl border border-rose-500/30">
                    <Ghost className="h-16 w-16 text-rose-500 mx-auto" />
                    <h3 className="text-xl font-bold text-rose-100">Oyun Başlatılamadı</h3>
                    <p className="text-rose-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/oyunlar/hafiza-kartlari">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    if (gameState === 'finished') {
        return (
            <div className="relative flex items-center justify-center h-screen">
                <Confetti active={showConfetti} config={{
                    angle: 90,
                    spread: 360,
                    startVelocity: 40,
                    elementCount: 100,
                    decay: 0.9,
                }} />
                <GameEndScreen 
                    score={score}
                    onSave={handleSaveAndExit}
                    isSaving={isSaving}
                    scoreSaved={isScoreSaved}
                    onRestart={handleRestart}
                    backUrl="/oyunlar/hafiza-kartlari"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-8 flex flex-col">
            <div className="w-full max-w-6xl mx-auto flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                     <h1 className="text-3xl font-bold text-rose-300">Hafıza Kartları</h1>
                </div>
                <div className="text-2xl font-bold text-white">Puan: <span className="text-amber-400 font-mono">{score}</span></div>
            </div>

            <div className="w-full max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 flex-grow">
                {pairs.map((card, index) => {
                    const isFlipped = flippedIndices.includes(index) || matchedIds.has(card.id);
                    const isMatched = matchedIds.has(card.id);

                    return (
                        <div
                            key={card.id}
                            onClick={() => handleCardClick(index)}
                            className={cn(
                                "rounded-2xl [perspective:1000px] cursor-pointer",
                                isMatched && 'opacity-50 cursor-default'
                            )}
                        >
                            <div className={cn(
                                "relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]",
                                isFlipped && "[transform:rotateY(180deg)]"
                            )}>
                                {/* Card Back */}
                                <div className="absolute w-full h-full [backface-visibility:hidden] rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                                    <Layers className="h-1/2 w-1/2 text-white/50"/>
                                </div>
                                
                                {/* Card Front */}
                                <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl bg-slate-800 flex items-center justify-center p-4 text-white font-semibold text-center text-sm md:text-base border-2 border-rose-400 shadow-xl shadow-rose-500/30">
                                    {card.content}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <MemoryGame />
        </Suspense>
    );
}
