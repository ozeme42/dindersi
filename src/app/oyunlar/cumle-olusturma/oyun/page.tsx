'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCumleOlusturmaAction, submitCumleOlusturmaScoreAction, type ScrambledSentenceData } from '@/app/oyunlar/cumle-olusturma/actions';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, CheckCircle2, Trophy, Sparkles, RefreshCcw, MousePointerClick, XOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

// Kelime Kartı Bileşeni
const WordButton = ({ 
    word, 
    onClick, 
    colorClass, 
    disabled, 
    isShaking 
}: { 
    word: string, 
    onClick?: () => void, 
    colorClass: string, 
    disabled?: boolean,
    isShaking?: boolean
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "relative group px-6 py-4 md:px-8 md:py-5 rounded-2xl font-black text-xl md:text-3xl transition-all duration-200 border-b-[6px] md:border-b-[8px] active:border-b-0 active:translate-y-2 outline-none select-none touch-manipulation",
                // Titreme Animasyonu (Hata durumunda)
                isShaking && "animate-shake bg-red-500 border-red-700 !text-white",
                // Normal Durum
                !isShaking && colorClass,
                // Devre Dışı (Yerleştirilmiş)
                disabled && "opacity-0 pointer-events-none scale-0 overflow-hidden w-0 h-0 p-0 m-0 border-0"
            )}
        >
            <span className="relative z-10 drop-shadow-md">{word}</span>
            {/* Parlama Efekti */}
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
};

// Renk Paleti
const WORD_COLORS = [
    'bg-indigo-500 border-indigo-700 text-white',
    'bg-pink-500 border-pink-700 text-white',
    'bg-cyan-500 border-cyan-700 text-slate-900',
    'bg-emerald-500 border-emerald-700 text-white',
    'bg-amber-400 border-amber-600 text-slate-900',
    'bg-violet-500 border-violet-700 text-white',
    'bg-rose-500 border-rose-700 text-white',
    'bg-lime-500 border-lime-700 text-slate-900',
];

function shuffleArray(array: { id: string, word: string }[]) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function SentenceClickGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const mainContentRef = useRef<HTMLDivElement>(null);

    const [sentences, setSentences] = useState<ScrambledSentenceData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [targetWords, setTargetWords] = useState<string[]>([]); 
    const [placedWords, setPlacedWords] = useState<string[]>([]);
    const [poolWords, setPoolWords] = useState<{ id: string, word: string, color: string }[]>([]); 
    const [originalPoolBackup, setOriginalPoolBackup] = useState<{ id: string, word: string, color: string }[]>([]);
    
    const [shakingWordId, setShakingWordId] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [isLevelComplete, setIsLevelComplete] = useState(false);

    const gameContext = `Cümle Kurma - ${searchParams.get('courseName') || 'Genel'} > ${searchParams.get('topicName') || 'Genel'}`;

    const fetchSentences = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getCumleOlusturmaAction(params);
        if (result.error || !result.data || result.data.length === 0) {
            setError(result.error || 'Uygun cümle bulunamadı.');
        } else {
            setSentences(result.data);
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchSentences();
    }, [fetchSentences]);

    useEffect(() => {
        if (sentences.length > 0) {
            const sentence = sentences[currentSentenceIndex].correctSentence;
            const splitWords = sentence.split(' ').filter(w => w.trim() !== '');
            
            setTargetWords(splitWords);
            setPlacedWords([]);
            setIsLevelComplete(false);

            const wordsWithIds = splitWords.map((word, index) => ({
                id: `${word}-${index}`,
                word: word
            }));
            
            const shuffled = shuffleArray(wordsWithIds);
            
            const coloredPool = shuffled.map((item, index) => ({
                ...item,
                color: WORD_COLORS[index % WORD_COLORS.length]
            }));

            setPoolWords(coloredPool);
            setOriginalPoolBackup(coloredPool);
        }
    }, [sentences, currentSentenceIndex]);

    const handleWordClick = (id: string, clickedWord: string) => {
        if (isLevelComplete) return;

        const nextWordIndex = placedWords.length;
        const expectedWord = targetWords[nextWordIndex];

        if (clickedWord === expectedWord) {
            playSound('pop');
            setPlacedWords(prev => [...prev, clickedWord]);
            setPoolWords(prev => prev.filter(w => w.id !== id));
            
            if (nextWordIndex + 1 === targetWords.length) {
                setTimeout(() => {
                    setIsLevelComplete(true);
                    playSound('correct');
                    setScore(prev => prev + 50);
                }, 300);
            }
        } else {
            playSound('incorrect');
            setShakingWordId(id);
            setTimeout(() => setShakingWordId(null), 500); 
        }
    };

    const handleRestartCurrent = () => {
        setPlacedWords([]);
        setPoolWords(originalPoolBackup);
        setScore(prev => Math.max(0, prev - 10)); 
    };

    const nextSentence = () => {
        if (currentSentenceIndex < sentences.length - 1) {
            setCurrentSentenceIndex(prev => prev + 1);
        } else {
            setGameState('finished');
        }
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user) {
            router.push('/oyunlar/cumle-olusturma');
            return;
        }
        setIsSaving(true);
        const result = await submitCumleOlusturmaScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Kaydedildi!', description: 'Puanın başarıyla işlendi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    }

    const handleGameRestart = () => {
        setCurrentSentenceIndex(0);
        setScore(0);
        setGameState('playing');
        setIsLevelComplete(false);
        setIsScoreSaved(false);
        setSentences(prev => [...prev].sort(() => Math.random() - 0.5));
    }

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-400" /><span className="ml-4 text-xl text-white font-bold animate-pulse">Hazırlanıyor...</span></div>;
    if (error) return <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-red-400 p-8 text-2xl font-bold">{error}</div>;

    if (gameState === 'finished') {
        return <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={handleGameRestart} backUrl="/oyunlar/cumle-olusturma" />;
    }

    const progressPercentage = ((currentSentenceIndex) / sentences.length) * 100;

    return (
        <div ref={mainContentRef} className="flex flex-col min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white p-4 md:p-6 overflow-hidden relative selection:bg-cyan-500/30">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="w-full max-w-6xl mx-auto z-10 flex flex-col gap-6 h-full">
                
                {/* --- HUD (Üst Panel) --- */}
                <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden shrink-0">
                    <div className="absolute bottom-0 left-0 h-1.5 bg-slate-800 w-full">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000" style={{ width: `${progressPercentage}%` }} />
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="bg-cyan-500/20 p-2.5 rounded-xl hidden md:block shrink-0">
                                <Sparkles className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg md:text-2xl font-black text-white truncate">Cümle Kurma</h1>
                                <p className="text-slate-400 text-xs md:text-sm hidden md:block truncate">Kelimeye tıkla, yerine yerleşsin!</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 shrink-0">
                            
                            {/* --- BİTİR TUŞU --- */}
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
                            <div className="text-lg font-bold bg-slate-800/80 px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 hidden sm:block">
                                {currentSentenceIndex + 1}/{sentences.length}
                            </div>
                            <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 border-white/10 text-slate-300 hover:text-white h-10 w-10 rounded-xl" />
                        </div>
                    </div>
                </div>

                {/* --- OYUN ALANI --- */}
                <div className="flex-grow flex flex-col gap-6 md:gap-8 justify-center pb-24 md:pb-8">
                    
                    {/* 1. Cümle Yerleştirme Alanı (Hedef) */}
                    <div className={cn(
                        "relative w-full min-h-[140px] md:min-h-[220px] bg-slate-900/50 backdrop-blur-sm rounded-3xl border-4 border-dashed transition-all duration-500 p-6 md:p-10 flex flex-wrap gap-3 md:gap-4 items-center justify-center content-center shadow-inner",
                        isLevelComplete 
                            ? "border-green-500/50 bg-green-950/20 shadow-[0_0_50px_rgba(34,197,94,0.1)]" 
                            : "border-slate-700 hover:border-cyan-500/30"
                    )}>
                        {placedWords.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 pointer-events-none animate-pulse">
                                <MousePointerClick className="h-12 w-12 md:h-16 md:w-16 mb-2 opacity-50" />
                                <p className="text-lg md:text-2xl font-bold uppercase tracking-widest opacity-50">Kelimelere Tıkla</p>
                            </div>
                        )}

                        {placedWords.map((word, index) => (
                            <div 
                                key={index} 
                                className="px-4 py-2 md:px-6 md:py-3 bg-white text-slate-900 rounded-xl font-bold text-xl md:text-3xl shadow-lg animate-in zoom-in duration-300 border-b-4 border-slate-300"
                            >
                                {word}
                            </div>
                        ))}
                    </div>

                    {/* Ara Mesaj / Kontroller */}
                    {isLevelComplete && (
                        <div className="animate-in slide-in-from-bottom-4 zoom-in duration-300 flex justify-center">
                            <div className="bg-slate-900/90 border border-green-500/30 p-4 md:p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-500/20 p-2 rounded-full">
                                        <CheckCircle2 className="h-10 w-10 text-green-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-2xl font-black text-green-400">Harika!</p>
                                        <p className="text-slate-400 text-sm">Doğru sıralama.</p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={nextSentence} 
                                    className="w-full md:w-auto h-12 md:h-14 text-lg font-bold px-8 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/40"
                                >
                                    {currentSentenceIndex === sentences.length - 1 ? "Sonuçlar" : "Devam Et"} <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 2. Kelime Havuzu (Kaynak) */}
                    {!isLevelComplete && (
                        <div className="bg-slate-950/40 p-4 md:p-8 rounded-3xl border border-white/5">
                            <div className="flex flex-wrap gap-3 md:gap-5 justify-center">
                                {poolWords.map((item) => (
                                    <WordButton 
                                        key={item.id}
                                        word={item.word}
                                        colorClass={item.color}
                                        isShaking={shakingWordId === item.id}
                                        onClick={() => handleWordClick(item.id, item.word)}
                                    />
                                ))}
                            </div>
                            
                            {/* Sıfırla Butonu (Hata yapılırsa) */}
                            {placedWords.length > 0 && (
                                <div className="mt-8 flex justify-center">
                                    <Button 
                                        variant="ghost" 
                                        onClick={handleRestartCurrent}
                                        className="text-slate-500 hover:text-white hover:bg-white/10 gap-2"
                                    >
                                        <RefreshCcw className="h-4 w-4" /> Cümleyi Sıfırla
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* CSS Animation for Shake */}
            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                .animate-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-16 w-16 animate-spin text-white" /></div>}>
            <SentenceClickGame />
        </Suspense>
    );
}
