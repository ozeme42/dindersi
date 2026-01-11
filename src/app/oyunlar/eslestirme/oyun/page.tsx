'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getEslestirmeAction, submitEslestirmeScoreAction, type MatchingPair } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Ghost, CheckCircle, RotateCcw, Home, Trophy, XOctagon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import Confetti from 'react-dom-confetti';
import { db } from '@/lib/firebase'; // Veritabanı
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'; // Firestore metodları

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

    // GÖREV MODU PARAMETRELERİ
    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

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
                setSelected(null);
            } else if (selected.pairId === card.pairId) {
                playSound('correct');
                setScore(prev => prev + 25);
                setMatchedIds(prev => new Set(prev).add(selected.id).add(card.id));
                setSelected(null);
            } else {
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

    // GÖREV BAŞARILI MI? (Tüm çiftler eşleşti mi?)
    const isAllMatched = pairs.length > 0 && matchedIds.size === pairs.length;

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            // Görev modundaysak ve kaydedilmediyse kaydetmeyi dene
            if(isMission && isAllMatched && !isScoreSaved) {
                 // devam et
            } else {
                router.push(isMission ? '/student/gorevler' : backUrl);
                return;
            }
        }
        
        setIsSaving(true);

        try {
            if (isMission && topicId) {
                // --- GÖREV MODU KAYDI ---
                await addDoc(collection(db, 'scoreEvents'), {
                    userId: user.uid,
                    points: score,
                    context: topicId,
                    gameType: 'eslestirme', // GÖREV TİPİ
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllMatched
                });

                if (isAllMatched) {
                    toast({ title: "Görev Başarılı!", description: "Tebrikler, eşleşmeleri tamamladın.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Görev Tamamlanamadı", description: "Tüm kartları eşleştirmelisin.", variant: "destructive" });
                }
            } else {
                // --- NORMAL MOD KAYDI ---
                const result = await submitEslestirmeScoreAction(user.uid, score, gameContext);
                if (result.success) {
                    toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
                } else {
                    toast({ title: 'Hata', description: result.error, variant: 'destructive' });
                }
            }
            
            setIsScoreSaved(true);
        } catch (error) {
            console.error(error);
            toast({ title: 'Hata', description: "Puan kaydedilemedi.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestart = () => {
        setScore(0);
        setMatchedIds(new Set());
        setSelected(null);
        setIncorrectSelection(null);
        setIsScoreSaved(false);
        setShowConfetti(false);
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
                        <Link href={isMission ? '/student/gorevler' : backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    // --- BİTİŞ EKRANI ---
    if (gameState === 'finished') {
        return (
            <div className="relative flex items-center justify-center h-screen bg-slate-900">
                <Confetti active={showConfetti} config={{ angle: 90, spread: 360, startVelocity: 40, elementCount: 100, decay: 0.9 }} />
                
                {isMission ? (
                    // --- GÖREV MODU İÇİN ÖZEL BİTİŞ EKRANI ---
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-white/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white -z-10"></div>
                            
                            <div className="mb-6 flex justify-center">
                                {isAllMatched ? (
                                    <div className="p-4 bg-green-100 rounded-full border-4 border-green-200 shadow-xl animate-bounce">
                                        <Trophy className="h-16 w-16 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="p-4 bg-red-100 rounded-full border-4 border-red-200 shadow-xl">
                                        <XOctagon className="h-16 w-16 text-red-500" />
                                    </div>
                                )}
                            </div>

                            <h2 className="text-3xl font-black text-slate-800 mb-2">
                                {isAllMatched ? "GÖREV BAŞARILI!" : "GÖREV BAŞARISIZ"}
                            </h2>
                            
                            <p className="text-slate-500 mb-6 font-medium">
                                {isAllMatched 
                                    ? `Harika! Tüm eşleştirmeleri tamamladın.` 
                                    : `Tüm kartları eşleştiremedin.`}
                            </p>

                            <div className="space-y-3">
                                {!isScoreSaved && isAllMatched && (
                                    <Button onClick={handleSaveAndExit} disabled={isSaving} className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : "Kaydet ve Devam Et"}
                                    </Button>
                                )}
                                
                                {isScoreSaved && isAllMatched && (
                                    <Button onClick={() => router.push('/student/gorevler')} className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                                        <CheckCircle className="mr-2 h-5 w-5"/> Görevlere Dön
                                    </Button>
                                )}

                                {(!isAllMatched || isScoreSaved) && (
                                    <Button onClick={handleRestart} variant="outline" className="w-full h-12 text-lg font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50">
                                        <RotateCcw className="mr-2 h-5 w-5"/> Tekrar Dene
                                    </Button>
                                )}
                                
                                <Button onClick={() => router.push('/student')} variant="ghost" className="w-full text-slate-400 hover:text-slate-600">
                                    <Home className="mr-2 h-4 w-4"/> Ana Menü
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // NORMAL MOD
                    <GameEndScreen 
                        score={score}
                        onSave={handleSaveAndExit}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={handleRestart}
                        backUrl={backUrl}
                    />
                )}
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
                     {isMission && <span className="px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300 text-xs font-bold border border-indigo-700">GÖREV MODU</span>}
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