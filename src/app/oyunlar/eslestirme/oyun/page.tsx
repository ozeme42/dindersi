
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getEslestirmeAction, submitEslestirmeScoreAction, type MatchingPair } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Ghost } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import Confetti from 'react-dom-confetti';

function MatchingGame() {
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
    
    const [selected, setSelected] = useState<MatchingPair | null>(null);
    const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
    const [incorrectSelection, setIncorrectSelection] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const gameContext = `Eşleştirme - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    const backUrl = '/oyunlar/eslestirme';

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getEslestirmeAction(params);
        
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

    const handleCardClick = (card: MatchingPair) => {
        if (matchedIds.has(card.id) || incorrectSelection) return;

        if (!selected) {
            setSelected(card);
        } else {
            if (selected.id === card.id) {
                // Deselect if same card is clicked again
                setSelected(null);
            } else if (selected.pairId === card.pairId) {
                // Correct match
                playSound('correct');
                setScore(prev => prev + 25);
                setMatchedIds(prev => new Set(prev).add(selected.id).add(card.id));
                setSelected(null);
            } else {
                // Incorrect match
                playSound('incorrect');
                setScore(prev => Math.max(0, prev - 5));
                setIncorrectSelection(card.id);
                setTimeout(() => {
                    setIncorrectSelection(null);
                    setSelected(null);
                }, 800);
            }
        }
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitEslestirmeScoreAction(user.uid, score, gameContext);
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
        setSelected(null);
        setIncorrectSelection(null);
        setIsScoreSaved(false);
        setGameState('loading');
        fetchGameData();
    };
    
    const cardColorClasses = [
        "from-blue-500 to-cyan-500", "from-indigo-500 to-purple-500", "from-emerald-500 to-teal-500",
        "from-rose-500 to-pink-500", "from-amber-500 to-orange-500", "from-sky-400 to-blue-600",
        "from-fuchsia-500 to-purple-600", "from-lime-400 to-green-600"
    ];

    if (gameState === 'loading') {
        return <div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-indigo-400" /></div>;
    }

    if (gameState === 'error') {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-indigo-950/50 p-6 rounded-3xl border border-indigo-500/30">
                    <Ghost className="h-16 w-16 text-indigo-500 mx-auto" />
                    <h3 className="text-xl font-bold text-indigo-100">Oyun Başlatılamadı</h3>
                    <p className="text-indigo-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href={backUrl}>Geri Dön</Link>
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
                    backUrl={backUrl}
                />
            </div>
        );
    }

    const matchedPairs = matchedIds.size / 2;
    const totalPairs = pairs.length / 2;

    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-8 flex flex-col pb-24 md:pb-8">
            <div className="w-full max-w-6xl mx-auto flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                     <h1 className="text-3xl font-bold text-indigo-300">Eşleştirme</h1>
                     <span className="font-mono text-slate-400 text-sm">Eşleşen: {matchedPairs} / {totalPairs}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-white">Puan: <span className="text-amber-400 font-mono">{score}</span></div>
                    <Button variant="destructive" size="sm" onClick={() => setGameState('finished')}>Bitir</Button>
                </div>
            </div>

            <div className="w-full max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 flex-grow">
                {pairs.map((card, index) => {
                    const isSelected = selected?.id === card.id;
                    const isMatched = matchedIds.has(card.id);
                    const isIncorrect = incorrectSelection === card.id || (isSelected && !!incorrectSelection);

                    return (
                        <button
                            key={card.id}
                            onClick={() => handleCardClick(card)}
                            disabled={isMatched}
                            className={cn(
                                "h-full w-full rounded-2xl p-4 text-center flex items-center justify-center text-white font-semibold transition-all duration-300 select-none touch-manipulation transform active:scale-95 shadow-lg",
                                "text-sm md:text-base",
                                isMatched 
                                    ? "bg-green-600/50 opacity-50 scale-95 border-2 border-green-400" 
                                    : "bg-gradient-to-br border-2 border-transparent",
                                !isMatched && cardColorClasses[index % cardColorClasses.length],
                                isSelected && "ring-4 ring-offset-2 ring-offset-slate-900 ring-white scale-105",
                                isIncorrect && "animate-shake bg-red-600 ring-4 ring-red-400"
                            )}
                        >
                           {card.content}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <MatchingGame />
        </Suspense>
    );
}
