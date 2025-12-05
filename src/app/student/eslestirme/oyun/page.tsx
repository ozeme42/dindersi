'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMatchingGameAction, submitMatchingGameScoreAction, type MatchItem } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Save, Home, Repeat, Trophy, Puzzle, Check, X, Link as LinkIcon, Zap, Ghost } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';

// --- RENK PALETİ ---
const PAIR_COLORS = [
    "bg-emerald-500/20 border-emerald-500 text-emerald-300",
    "bg-blue-500/20 border-blue-500 text-blue-300",
    "bg-rose-500/20 border-rose-500 text-rose-300",
    "bg-amber-500/20 border-amber-500 text-amber-300",
    "bg-violet-500/20 border-violet-500 text-violet-300",
    "bg-cyan-500/20 border-cyan-500 text-cyan-300",
    "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300",
    "bg-lime-500/20 border-lime-500 text-lime-300",
];

type CardItem = {
    id: number;
    pairId: number;
    type: 'concept' | 'definition';
    text: string;
}

const shuffleArray = <T,>(array: T[]): T[] => {
    return array.slice().sort(() => Math.random() - 0.5);
};

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-violet-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[100px]" />
    </div>
);

const GameHUD = ({ score, matched, total }: { score: number, matched: number, total: number }) => {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6 pointer-events-none">
            <div className="max-w-6xl mx-auto flex justify-between items-start pointer-events-auto">
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-indigo-500/30 px-4 py-2 rounded-full shadow-lg shadow-indigo-500/10">
                    <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-400 animate-bounce" />
                    <span className="text-xl lg:text-2xl font-black text-indigo-100 font-mono">
                        {score}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-full">
                    <Puzzle className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
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

function MatchingGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    
    // State
    const [concepts, setConcepts] = useState<CardItem[]>([]);
    const [definitions, setDefinitions] = useState<CardItem[]>([]);
    
    const [choiceOne, setChoiceOne] = useState<CardItem | null>(null);
    const [choiceTwo, setChoiceTwo] = useState<CardItem | null>(null);
    
    const [matchedPairs, setMatchedPairs] = useState<number[]>([]); 
    const [disabled, setDisabled] = useState(false);
    
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [shakeIds, setShakeIds] = useState<number[]>([]);

    const gameContext = `Eşleştirme - ${searchParams.get('topicName')}`;

    const resetTurn = useCallback(() => {
        setChoiceOne(null);
        setChoiceTwo(null);
        setDisabled(false);
        setShakeIds([]);
    }, []);

    // Veri Çekme
    useEffect(() => {
        const fetchGameData = async () => {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const { items, error } = await getMatchingGameAction(params);

            if (error || !items || items.length === 0) {
                setError(error || "Bu konu için uygun veri bulunamadı.");
                setGameState('error');
                return;
            }
            
            const conceptsData = items.map((item, i) => ({ 
                id: i, 
                pairId: i, 
                type: 'concept' as const, 
                text: item.concept,
            }));
            
            const definitionsData = shuffleArray(items.map((item, i) => ({ 
                id: i + items.length, 
                pairId: i, 
                type: 'definition' as const, 
                text: item.definition,
            })));

            setConcepts(conceptsData);
            setDefinitions(definitionsData);
            resetTurn();
            setMatchedPairs([]);
            setScore(0);
            setGameState('playing');
        };

        fetchGameData();
    }, [searchParams, resetTurn]);

    // Kart Seçimi
    const handleChoice = (card: CardItem) => {
        if (disabled || matchedPairs.includes(card.pairId)) return;
        if (choiceOne && choiceOne.id === card.id) return;
        
        playSound('pop');

        if (!choiceOne) {
            setChoiceOne(card);
        } else if (!choiceTwo) {
            setChoiceTwo(card);
        }
    };

    // Eşleşme Kontrolü
    useEffect(() => {
        if (choiceOne && choiceTwo) {
            setDisabled(true);
            
            if (choiceOne.pairId === choiceTwo.pairId) {
                playSound('correct');
                setScore(prev => prev + 25);
                setMatchedPairs(prev => [...prev, choiceOne.pairId]);
                setTimeout(() => resetTurn(), 500);
            } else {
                playSound('incorrect');
                setShakeIds([choiceOne.id, choiceTwo.id]);
                setTimeout(() => resetTurn(), 800);
            }
        }
    }, [choiceOne, choiceTwo, resetTurn]);

    // Bitiş Kontrolü
    useEffect(() => {
        if (gameState === 'playing' && concepts.length > 0 && matchedPairs.length === concepts.length) {
            setTimeout(() => {
                setGameState('finished');
                playSound('win');
            }, 500);
        }
    }, [matchedPairs, concepts, gameState]);

    // Kaydet ve Çık
    const handleSaveAndExit = async () => {
        if (!user || score <= 0 || isSaving) {
            router.push('/student/activities');
            return;
        }
        setIsSaving(true);
        const result = await submitMatchingGameScoreAction(user.uid, score, gameContext);
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
                <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-indigo-950/50 p-6 rounded-3xl border border-indigo-500/30">
                    <Ghost className="h-16 w-16 text-indigo-500 mx-auto" />
                    <h3 className="text-xl font-bold text-indigo-100">Oyun Başlatılamadı</h3>
                    <p className="text-indigo-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/student/eslestirme">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // --- BİTİŞ EKRANI ---
    if (gameState === 'finished') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <GameBackground />
                <div className="relative z-20 w-full max-w-md text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl animate-pulse" />
                        <Trophy className="w-32 h-32 text-indigo-400 mx-auto drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">TÜMÜ EŞLEŞTİ!</h1>
                        <p className="text-slate-400 text-lg">Toplam Skorun</p>
                    </div>
                    
                    {/* SKOR KARTI - Düzeltildi */}
                    <div className="bg-slate-900/80 border border-indigo-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                        <div className="text-7xl font-black text-indigo-400 drop-shadow-lg">
                            {score}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button 
                            onClick={handleSaveAndExit} 
                            size="lg" 
                            disabled={isSaving}
                            className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-500/20 transition-all hover:scale-105"
                        >
                            {isSaving ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <Save className="mr-3 h-6 w-6" />}
                            PUANI KAYDET VE ÇIK
                        </Button>
                        
                        {/* Diğer seçenekler, ana menü vb. buraya eklenebilir eğer istenirse */}
                        {/* Bu örnekte sadece tek buton istendiği varsayılmıştır ama esnektir */}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col">
            <GameBackground />
            <GameHUD score={score} matched={matchedPairs.length} total={concepts.length} />

            <main className="flex-grow flex flex-col items-center justify-center p-4 lg:p-8 relative z-10 mt-16 lg:mt-12">
                <div className="w-full max-w-7xl grid grid-cols-2 gap-4 lg:gap-12 h-full">
                    
                    {/* SOL SÜTUN: KAVRAMLAR */}
                    <div className="flex flex-col gap-3 lg:gap-4">
                        <div className="text-center mb-2">
                            <span className="text-indigo-400 font-bold tracking-widest text-xs lg:text-sm uppercase bg-slate-900/50 px-3 py-1 rounded-full border border-indigo-500/30">Kavramlar</span>
                        </div>
                        {concepts.map((item) => {
                            const isSelected = choiceOne?.id === item.id || choiceTwo?.id === item.id;
                            const isMatched = matchedPairs.includes(item.pairId);
                            const isShake = shakeIds.includes(item.id);
                            
                            const matchColor = isMatched ? PAIR_COLORS[item.pairId % PAIR_COLORS.length] : "";

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleChoice(item)}
                                    disabled={isMatched || disabled}
                                    className={cn(
                                        "relative w-full min-h-[80px] lg:min-h-[100px] p-4 rounded-xl lg:rounded-2xl border-2 transition-all duration-300 flex items-center justify-center text-center",
                                        "active:scale-95 touch-manipulation",
                                        isShake && "animate-shake border-red-500/50 bg-red-900/20 text-red-200",
                                        
                                        // Normal
                                        !isSelected && !isMatched && !isShake && "bg-slate-800/40 border-white/10 hover:bg-slate-800/60 hover:border-indigo-500/30 text-slate-300",
                                        
                                        // Seçili
                                        isSelected && !isMatched && "bg-indigo-500/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] text-indigo-100 z-10 scale-105",
                                        
                                        // Eşleşmiş
                                        isMatched && cn("opacity-80 scale-95 border-l-4 font-bold shadow-none cursor-default", matchColor)
                                    )}
                                >
                                    <span className="text-sm lg:text-xl font-bold">{item.text}</span>
                                    {isMatched && <Check className="absolute top-2 right-2 w-4 h-4 opacity-50" />}
                                    {isSelected && !isMatched && <Zap className="absolute top-2 right-2 w-4 h-4 text-indigo-400 animate-pulse" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* SAĞ SÜTUN: TANIMLAR */}
                    <div className="flex flex-col gap-3 lg:gap-4">
                        <div className="text-center mb-2">
                            <span className="text-purple-400 font-bold tracking-widest text-xs lg:text-sm uppercase bg-slate-900/50 px-3 py-1 rounded-full border border-purple-500/30">Tanımlar</span>
                        </div>
                        {definitions.map((item) => {
                            const isSelected = choiceOne?.id === item.id || choiceTwo?.id === item.id;
                            const isMatched = matchedPairs.includes(item.pairId);
                            const isShake = shakeIds.includes(item.id);
                            
                            const matchColor = isMatched ? PAIR_COLORS[item.pairId % PAIR_COLORS.length] : "";

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleChoice(item)}
                                    disabled={isMatched || disabled}
                                    className={cn(
                                        "relative w-full min-h-[80px] lg:min-h-[100px] p-4 rounded-xl lg:rounded-2xl border-2 transition-all duration-300 flex items-center justify-center text-center",
                                        "active:scale-95 touch-manipulation",
                                        isShake && "animate-shake border-red-500/50 bg-red-900/20 text-red-200",
                                        
                                        // Normal
                                        !isSelected && !isMatched && !isShake && "bg-slate-800/40 border-white/10 hover:bg-slate-800/60 hover:border-purple-500/30 text-slate-300",
                                        
                                        // Seçili
                                        isSelected && !isMatched && "bg-purple-500/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-purple-100 z-10 scale-105",
                                        
                                        // Eşleşmiş
                                        isMatched && cn("opacity-80 scale-95 border-r-4 font-bold shadow-none cursor-default", matchColor)
                                    )}
                                >
                                    <span className="text-xs lg:text-base font-medium leading-relaxed">{item.text}</span>
                                    {isMatched && <Check className="absolute top-2 left-2 w-4 h-4 opacity-50" />}
                                    {isSelected && !isMatched && <LinkIcon className="absolute top-2 left-2 w-4 h-4 text-purple-400 animate-pulse" />}
                                </button>
                            );
                        })}
                    </div>

                </div>
            </main>
        </div>
    );
}

// --- WRAPPER ---
export default function MatchingGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <MatchingGame />
        </Suspense>
    );
}