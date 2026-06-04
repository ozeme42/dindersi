'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Eye, Trophy, ArrowLeft, Wand2, AlertTriangle, Play, Maximize, Minimize } from "lucide-react";
import { getAnagramWallWords } from '../actions'; 
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/audio-service";
import Confetti from 'react-dom-confetti';

const CARD_COLORS = [
    { bg: "bg-red-500", border: "border-red-400", shadow: "shadow-red-900/50" },
    { bg: "bg-orange-500", border: "border-orange-400", shadow: "shadow-orange-900/50" },
    { bg: "bg-amber-500", border: "border-amber-400", shadow: "shadow-amber-900/50" },
    { bg: "bg-green-500", border: "border-green-400", shadow: "shadow-green-900/50" },
    { bg: "bg-emerald-500", border: "border-emerald-400", shadow: "shadow-emerald-900/50" },
    { bg: "bg-teal-500", border: "border-teal-400", shadow: "shadow-teal-900/50" },
    { bg: "bg-cyan-500", border: "border-cyan-400", shadow: "shadow-cyan-900/50" },
    { bg: "bg-blue-500", border: "border-blue-400", shadow: "shadow-blue-900/50" },
    { bg: "bg-indigo-500", border: "border-indigo-400", shadow: "shadow-indigo-900/50" },
    { bg: "bg-violet-500", border: "border-violet-400", shadow: "shadow-violet-900/50" },
    { bg: "bg-fuchsia-500", border: "border-fuchsia-400", shadow: "shadow-fuchsia-900/50" },
    { bg: "bg-pink-500", border: "border-pink-400", shadow: "shadow-pink-900/50" },
    { bg: "bg-rose-500", border: "border-rose-400", shadow: "shadow-rose-900/50" },
];

type AnagramCard = {
    id: string;
    original: string;
    scrambled: string;
    isSolved: boolean;
    rotation: number;
    colorIndex: number;
};

function scrambleWord(word: string): string {
    const arr = word.split('');
    let currentIndex = arr.length, randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
    }
    const scrambled = arr.join('');
    if (scrambled === word && word.length > 1) return scrambleWord(word);
    return scrambled;
}

function AnagramWallComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const [gameState, setGameState] = useState<'loading' | 'error' | 'intro' | 'playing' | 'finished'>('loading');
    const [cards, setCards] = useState<AnagramCard[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isAllSolved, setIsAllSolved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const fetchWords = async () => {
            setGameState('loading');
            try {
                const params = {
                    courseId: searchParams.get('courseId') || undefined,
                    unitId: searchParams.get('unitId') || undefined,
                    topicId: searchParams.get('topicId') || undefined,
                };

                const result = await getAnagramWallWords(params);
                
                if (result.error) {
                    setError(result.error);
                    setGameState('error');
                } else if (!result.words || result.words.length === 0) {
                    setError("Bu üniteye ait kavram bulunamadı. Lütfen başka bir konu seçiniz.");
                    setGameState('error');
                } else {
                    const selectedWords = result.words; // Tüm kelimeler
                    
                    const gameCards: AnagramCard[] = selectedWords.map((word, index) => ({
                        id: `word-${index}`,
                        original: word,
                        scrambled: scrambleWord(word.toUpperCase()),
                        isSolved: false,
                        rotation: Math.random() * 6 - 3,
                        colorIndex: index % CARD_COLORS.length
                    }));
                    // Kartları karıştırıyoruz ama numaralar render sırasında verilecek
                    setCards(gameCards.sort(() => Math.random() - 0.5));
                    setGameState('intro');
                }
            } catch (err) {
                setError("Beklenmedik bir hata oluştu.");
                setGameState('error');
            }
        };
        fetchWords();
    }, [searchParams]);

    useEffect(() => {
        if (gameState === 'playing' && cards.length > 0 && cards.every(c => c.isSolved)) {
            setTimeout(() => {
                setIsAllSolved(true);
                setShowConfetti(true);
                playSound('win');
                setGameState('finished');
            }, 1000);
        }
    }, [cards, gameState]);

    const startGame = () => {
        setGameState('playing');
        playSound('start');
    };

    const handleCardClick = (id: string) => {
        const card = cards.find(c => c.id === id);
        if (!card || card.isSolved) return;
        playSound('correct');
        setCards(prev => prev.map(c => c.id === id ? { ...c, isSolved: true } : c));
    };

    const revealAll = () => {
        setCards(prev => prev.map(c => ({ ...c, isSolved: true })));
    };

    const resetGame = () => {
        setIsAllSolved(false);
        setShowConfetti(false);
        setCards(prev => prev.map(c => ({
            ...c,
            isSolved: false,
            scrambled: scrambleWord(c.original)
        })).sort(() => Math.random() - 0.5));
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    // --- EKRAN DURUMLARI ---

    if (gameState === 'loading') {
        return <div className="h-screen w-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-purple-500" /></div>;
    }

    if (gameState === 'error') {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-slate-900 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md">
                    <div className="bg-red-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Hata Oluştu</h2>
                    <p className="text-slate-400 mb-8">{error}</p>
                    <Button size="lg" variant="outline" className="w-full" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 w-5 h-5" /> Geri Dön
                    </Button>
                </div>
            </div>
        );
    }

    if (gameState === 'intro') {
        return (
            <div className="h-screen w-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 p-12 rounded-3xl border border-slate-700 text-white shadow-2xl text-center max-w-2xl w-full animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Wand2 className="w-12 h-12 text-purple-400" />
                    </div>
                    <h1 className="text-5xl font-black tracking-tight mb-4">ANAGRAM DUVARI</h1>
                    <p className="text-slate-400 text-xl mb-10">
                        Seçilen konuda toplam <strong>{cards.length} kavram</strong> bulundu.<br/>
                        Öğrenciler karışık harfleri çözmeye hazır mı?
                    </p>
                    <Button onClick={startGame} size="lg" className="h-20 px-16 text-3xl font-bold rounded-full shadow-[0_0_40px_rgba(168,85,247,0.4)] bg-purple-600 hover:bg-purple-500 hover:scale-105 transition-all">
                        DUVARI AÇ <Play className="ml-4 w-10 h-10 fill-white" />
                    </Button>
                </div>
            </div>
        );
    }

    // Oyun Ekranı
    const solvedCount = cards.filter(c => c.isSolved).length;
    const totalCount = cards.length;

    return (
        <div className="min-h-screen w-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none"></div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]">
                 <Confetti active={showConfetti} config={{ elementCount: 200, spread: 360 }} />
            </div>

            {/* Üst Bar */}
            <div className="h-20 flex items-center justify-between px-6 z-10 border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => router.back()}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent hidden sm:block">
                        ANAGRAM DUVARI
                    </h1>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="bg-slate-800 px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <span className="font-mono font-bold text-xl">
                            {solvedCount} <span className="text-slate-500">/</span> {totalCount}
                        </span>
                    </div>

                    <Button onClick={toggleFullscreen} variant="outline" size="icon" title="Tam Ekran" className="bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700 hover:text-white">
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </Button>

                    <Button onClick={resetGame} variant="outline" size="icon" title="Yeniden Karıştır" className="bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700 hover:text-white">
                        <RefreshCw className="w-5 h-5" />
                    </Button>
                    <Button onClick={revealAll} variant="outline" size="icon" title="Tümünü Çöz (Öğretmen)" className="bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700 hover:text-white">
                        <Eye className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Kart Alanı */}
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-fr">
                    {cards.map((card, idx) => {
                        const style = CARD_COLORS[card.colorIndex];
                        return (
                            <div 
                                key={card.id}
                                onClick={() => handleCardClick(card.id)}
                                className={cn(
                                    "relative h-40 cursor-pointer group perspective-1000 select-none transition-transform duration-300 hover:scale-105 hover:z-20",
                                    card.isSolved ? "z-10" : ""
                                )}
                                style={{ transform: `rotate(${card.isSolved ? 0 : card.rotation}deg)` }}
                            >
                                <div className={cn(
                                    "w-full h-full rounded-2xl shadow-xl border-b-4 flex items-center justify-center p-2 text-center transition-all duration-500 relative overflow-hidden",
                                    card.isSolved 
                                        ? "bg-white border-white text-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.4)] transform scale-105" 
                                        : `${style.bg} ${style.border} text-white ${style.shadow} opacity-90 hover:opacity-100`
                                )}>
                                    {/* --- DEĞİŞİKLİK BURADA: SIRA NUMARASI (INDEX + 1) --- */}
                                    <div className={cn(
                                        "absolute top-2 left-3 font-mono font-bold text-lg pointer-events-none",
                                        card.isSolved ? "text-slate-400 opacity-60" : "text-white opacity-80 mix-blend-overlay"
                                    )}>
                                        {idx + 1}
                                    </div>

                                    <span className={cn(
                                        "font-black tracking-widest break-all leading-none drop-shadow-md",
                                        card.original.length > 10 ? "text-2xl" : "text-4xl sm:text-5xl"
                                    )}>
                                        {card.isSolved ? card.original : card.scrambled}
                                    </span>
                                    
                                    {!card.isSolved && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity">
                                            <Eye className="w-12 h-12 text-black" />
                                        </div>
                                    )}

                                    {card.isSolved && (
                                        <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-1 shadow-lg animate-in zoom-in spin-in-180">
                                            <Trophy className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bitiş Ekranı */}
            {isAllSolved && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="bg-slate-900 p-10 rounded-3xl border border-white/20 text-center shadow-2xl transform scale-110">
                        <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-6 animate-bounce" />
                        <h2 className="text-5xl font-black text-white mb-4">TEBRİKLER!</h2>
                        <p className="text-slate-300 text-xl mb-8">Tüm kelimeleri buldunuz.</p>
                        <Button onClick={resetGame} size="lg" className="h-16 px-12 text-2xl font-bold bg-purple-600 hover:bg-purple-500 rounded-full shadow-lg">
                            TEKRAR OYNA
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AnagramGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-purple-500" /></div>}>
            <AnagramWallComponent />
        </Suspense>
    )
}