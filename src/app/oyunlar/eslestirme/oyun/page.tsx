'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getEslestirmeAction, submitEslestirmeScoreAction, type MatchingPair } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Ghost, CheckCircle, RotateCcw, Home, Trophy, XOctagon, Maximize2, Minimize2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import Confetti from 'react-dom-confetti';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

function MatchingGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const gameContainerRef = useRef<HTMLDivElement>(null);

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
    const [isFullscreen, setIsFullscreen] = useState(false);

    // --- TAM EKRAN MANTIĞI ---
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            gameContainerRef.current?.requestFullscreen().catch((err) => {
                console.error(`Tam ekran hatası: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

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

    useEffect(() => { fetchGameData(); }, [fetchGameData]);

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
                // --- PUANLAMA DEĞİŞİKLİĞİ ---
                // Her doğru eşleşme 10 puan
                setScore(prev => prev + 10);
                setMatchedIds(prev => new Set(prev).add(selected.id).add(card.id));
                setSelected(null);
            } else {
                playSound('incorrect');
                // Yanlışta puan düşürmüyoruz, sadece sallanma efekti
                setIncorrectSelection(card.id);
                setTimeout(() => {
                    setIncorrectSelection(null);
                    setSelected(null);
                }, 800);
            }
        }
    };

    // KRİTİK: TÜM ÇİFTLER EŞLEŞTİ Mİ?
    const isAllMatched = pairs.length > 0 && matchedIds.size === pairs.length;

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(isMission ? '/student/gorevler' : backUrl);
            return;
        }
        setIsSaving(true);
        try {
            if (isMission && topicId) {
                // --- GÖREV MODU ---
                await addDoc(collection(db, 'scoreEvents'), {
                    userId: user.uid,
                    points: score, // Kazanılan puan (başarısız olsa bile)
                    context: topicId,
                    gameType: 'eslestirme',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllMatched // Sadece hepsi bittiyse TRUE
                });
                if (isAllMatched) {
                    toast({ title: "Görev Başarılı!", description: "Tebrikler, tüm eşleşmeleri tamamladın.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi", description: "Ancak görev tamamlanmadı.", className: "bg-yellow-600 text-white" });
                }
            } else {
                // --- NORMAL MOD ---
                await submitEslestirmeScoreAction(user.uid, score, gameContext);
                toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
            }
            setIsScoreSaved(true);
        } catch (error) {
            toast({ title: 'Hata', description: "Puan kaydedilemedi.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestart = () => {
        setScore(0); setMatchedIds(new Set()); setSelected(null);
        setIncorrectSelection(null); setIsScoreSaved(false); setShowConfetti(false);
        setGameState('loading'); fetchGameData();
    };
    
    const cardColorClasses = [
        "from-blue-600 to-cyan-500", "from-indigo-600 to-purple-500", "from-emerald-600 to-teal-500",
        "from-rose-600 to-pink-500", "from-amber-600 to-orange-500", "from-sky-500 to-blue-700"
    ];

    if (gameState === 'loading') return <div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-indigo-400" /></div>;

    if (gameState === 'finished') {
        return (
            <div className="relative flex items-center justify-center h-screen bg-slate-900">
                <Confetti active={showConfetti} config={{ spread: 360, elementCount: 100 }} />
                {isMission ? (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                            <div className="mb-6 flex justify-center">
                                {isAllMatched ? <Trophy className="h-16 w-16 text-green-600 animate-bounce" /> : <XOctagon className="h-16 w-16 text-red-500" />}
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2">{isAllMatched ? "GÖREV BAŞARILI!" : "GÖREV TAMAMLANMADI"}</h2>
                            <p className="text-slate-500 mb-6">{isAllMatched ? "Harika! Tüm eşleştirmeleri yaptın." : `Toplam ${score} puan topladın ama tüm eşleşmeleri bitirmedin.`}</p>
                            <div className="space-y-3">
                                {/* PUAN VARSA KAYDET BUTONU HER ZAMAN GÖRÜNÜR */}
                                {!isScoreSaved && score > 0 && (
                                    <Button onClick={handleSaveAndExit} disabled={isSaving} className={cn("w-full h-12 font-bold", isAllMatched ? "bg-indigo-600 hover:bg-indigo-700" : "bg-amber-600 hover:bg-amber-700")}>
                                        {isSaving ? "Kaydediliyor..." : (isAllMatched ? "Kaydet ve Devam Et" : "Puanı Al ve Çık")}
                                    </Button>
                                )}
                                
                                {isScoreSaved && isAllMatched && <Button onClick={() => router.push('/student/gorevler')} className="w-full h-12 bg-green-600 font-bold">Görevlere Dön</Button>}
                                
                                {(!isAllMatched || isScoreSaved) && <Button onClick={handleRestart} variant="outline" className="w-full h-12 font-bold">Tekrar Dene</Button>}
                                
                                <Button onClick={() => router.push('/student')} variant="ghost" className="w-full text-slate-400 hover:text-slate-600">
                                    <Home className="mr-2 h-4 w-4"/> Ana Menü
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={handleRestart} backUrl={backUrl} />}
            </div>
        );
    }

    return (
        <div 
            ref={gameContainerRef} 
            className={cn(
                "min-h-screen bg-slate-950 flex flex-col transition-all duration-500 overflow-y-auto",
                isFullscreen ? "p-4 md:p-8" : "p-4 md:p-6"
            )}
        >
            <div className={cn(
                "w-full mx-auto flex justify-between items-center mb-6 bg-slate-900/80 p-4 rounded-2xl border border-white/10 backdrop-blur-md sticky top-0 z-30 shadow-2xl",
                !isFullscreen && "max-w-7xl"
            )}>
                <div className="flex items-center gap-3">
                     <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter uppercase">EŞLEŞTİRME</h1>
                     {isMission && <Badge className="bg-indigo-900/50 text-indigo-300 border-indigo-500/30 hidden sm:flex">GÖREV</Badge>}
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <StarIcon className="w-4 h-4 text-amber-400" />
                        <span className="font-mono font-bold text-white text-lg">{score}</span>
                    </div>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={toggleFullscreen} 
                        className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl border border-white/5 h-10 w-10 shrink-0"
                    >
                        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:bg-red-500/10 rounded-xl border border-red-500/20 font-bold px-3 shrink-0" 
                        onClick={() => setGameState('finished')}
                    >
                        <XOctagon className="h-4 w-4 md:mr-2" /> 
                        <span className="hidden md:inline">Bitir</span>
                    </Button>
                </div>
            </div>

            <div className={cn(
                "w-full mx-auto grid gap-3 md:gap-4 items-stretch",
                !isFullscreen && "max-w-7xl",
                "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            )}>
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
                                "relative flex items-center justify-center p-4 rounded-2xl font-bold transition-all duration-300 select-none shadow-xl min-h-[120px] sm:min-h-[140px] md:min-h-[160px]",
                                "text-sm md:text-base lg:text-lg",
                                isMatched 
                                    ? "bg-emerald-500/10 opacity-20 scale-95 border-2 border-emerald-500/30 cursor-default grayscale" 
                                    : "bg-gradient-to-br border-2 border-white/10 hover:border-white/30 hover:scale-[1.03] active:scale-95",
                                !isMatched && cardColorClasses[index % cardColorClasses.length],
                                isSelected && "ring-4 ring-white ring-offset-4 ring-offset-slate-950 scale-105 z-10",
                                isIncorrect && "animate-shake bg-red-600 ring-4 ring-red-400 z-10 border-transparent"
                            )}
                        >
                           <div className="z-10 text-center break-words leading-tight drop-shadow-md text-white">{card.content}</div>
                           <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-3xl" />
                        </button>
                    )
                })}
            </div>

            <div className={cn("w-full mx-auto mt-8 mb-4 flex justify-center", !isFullscreen && "max-w-7xl")}>
                 <div className="px-8 py-3 bg-slate-900/60 rounded-full border border-white/5 text-slate-400 text-xs md:text-sm font-bold shadow-xl backdrop-blur-sm">
                    Çift: {pairs.length / 2} • Eşleşen: {matchedIds.size / 2}
                 </div>
            </div>
        </div>
    );
}

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black border tracking-widest uppercase", className)}>{children}</span>
);

const StarIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
);

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <MatchingGame />
        </Suspense>
    );
}