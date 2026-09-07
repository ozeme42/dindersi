'use client';

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Loader2, RefreshCw, Eye, Trophy, ArrowLeft, Wand2, 
  AlertTriangle, Play, Sparkles, Home, RotateCcw 
} from "lucide-react";
import Link from "next/link";
import { getAnagramWallWords } from '../actions'; 
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/audio-service";
import confetti from 'canvas-confetti';
import { FullscreenToggle } from "@/components/fullscreen-toggle";

const CARD_COLORS = [
    { bg: "bg-red-600", border: "border-red-400", shadow: "shadow-red-900/50" },
    { bg: "bg-orange-600", border: "border-orange-400", shadow: "shadow-orange-900/50" },
    { bg: "bg-amber-600", border: "border-amber-400", shadow: "shadow-amber-900/50" },
    { bg: "bg-green-600", border: "border-green-400", shadow: "shadow-green-900/50" },
    { bg: "bg-emerald-600", border: "border-emerald-400", shadow: "shadow-emerald-900/50" },
    { bg: "bg-teal-600", border: "border-teal-400", shadow: "shadow-teal-900/50" },
    { bg: "bg-cyan-600", border: "border-cyan-400", shadow: "shadow-cyan-900/50" },
    { bg: "bg-blue-600", border: "border-blue-400", shadow: "shadow-blue-900/50" },
    { bg: "bg-indigo-600", border: "border-indigo-400", shadow: "shadow-indigo-900/50" },
    { bg: "bg-violet-600", border: "border-violet-400", shadow: "shadow-violet-900/50" },
    { bg: "bg-fuchsia-600", border: "border-fuchsia-400", shadow: "shadow-fuchsia-900/50" },
    { bg: "bg-pink-600", border: "border-pink-400", shadow: "shadow-pink-900/50" },
    { bg: "bg-rose-600", border: "border-rose-400", shadow: "shadow-rose-900/50" },
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
    
    const courseName = searchParams.get('courseName') || '';
    const unitName = searchParams.get('unitName') || '';
    const topicName = searchParams.get('topicName') || '';
    const className = searchParams.get('className') || '';
    const backUrl = "/teacher/smartboard/anagram-duvari";

    const [gameState, setGameState] = useState<'loading' | 'error' | 'intro' | 'playing' | 'finished'>('loading');
    const [cards, setCards] = useState<AnagramCard[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isAllSolved, setIsAllSolved] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        setGameState('loading');
        setError(null);
        try {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };

            const result = await getAnagramWallWords(params);
            
            if (result.error && (!result.words || result.words.length === 0)) {
                setError(result.error);
                setGameState('error');
            } else {
                const selectedWords = result.words || [];
                
                const gameCards: AnagramCard[] = selectedWords.map((word, index) => ({
                    id: `word-${index}`,
                    original: word,
                    scrambled: scrambleWord(word.toLocaleUpperCase('tr-TR')),
                    isSolved: false,
                    rotation: Math.random() * 4 - 2,
                    colorIndex: index % CARD_COLORS.length
                }));
                setCards(gameCards.sort(() => Math.random() - 0.5));
                setGameState('intro');
            }
        } catch (err) {
            setError("Kavramlar yüklenirken bir hata oluştu.");
            setGameState('error');
        }
    };

    useEffect(() => {
        loadData();
    }, [searchParams]);

    useEffect(() => {
        if (gameState === 'playing' && cards.length > 0 && cards.every(c => c.isSolved)) {
            setTimeout(() => {
                setIsAllSolved(true);
                try { playSound('win'); } catch (e) {}
                try {
                    confetti({
                        particleCount: 100,
                        spread: 80,
                        origin: { y: 0.6 }
                    });
                } catch (e) {}
                setGameState('finished');
            }, 800);
        }
    }, [cards, gameState]);

    const startGame = () => {
        setGameState('playing');
        try { playSound('start'); } catch (e) {}
    };

    const handleCardClick = (id: string) => {
        const card = cards.find(c => c.id === id);
        if (!card || card.isSolved) return;
        try { playSound('correct'); } catch (e) {}
        setCards(prev => prev.map(c => c.id === id ? { ...c, isSolved: true } : c));
    };

    const revealAll = () => {
        try { playSound('pop'); } catch (e) {}
        setCards(prev => prev.map(c => ({ ...c, isSolved: true })));
    };

    const resetGame = () => {
        setIsAllSolved(false);
        setCards(prev => prev.map(c => ({
            ...c,
            isSolved: false,
            scrambled: scrambleWord(c.original)
        })).sort(() => Math.random() - 0.5));
    };

    // --- EKRAN DURUMLARI ---

    if (gameState === 'loading') {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
                <Loader2 className="w-16 h-16 animate-spin text-purple-500" />
                <span className="text-xl font-bold tracking-wide">Anagram duvarı hazırlanıyor...</span>
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-slate-900 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full space-y-4">
                    <div className="bg-rose-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-10 h-10 text-rose-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white">Hata Oluştu</h2>
                    <p className="text-slate-300 text-sm">{error}</p>
                    <div className="flex gap-3 justify-center pt-2">
                        <Button onClick={loadData} className="bg-purple-600 hover:bg-purple-500 font-bold">
                            Tekrar Dene
                        </Button>
                        <Link href={backUrl}>
                            <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/10">
                                <ArrowLeft className="mr-2 w-4 h-4" /> Geri Dön
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'intro') {
        return (
            <div ref={containerRef} className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
                {/* Glows */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

                {/* Üst Navigasyon */}
                <div className="absolute top-6 left-6 z-20">
                    <Link href={backUrl}>
                        <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Kuruluma Dön
                        </Button>
                    </Link>
                </div>

                <div className="absolute top-6 right-6 z-20">
                    <FullscreenToggle elementRef={containerRef} />
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl p-8 sm:p-12 rounded-3xl border border-white/10 text-white shadow-2xl text-center max-w-2xl w-full animate-in zoom-in-95 relative z-10">
                    {/* Üst Rozet */}
                    {(topicName || className) && (
                        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs text-slate-400">
                            {className && <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-purple-300 font-semibold">{className}</span>}
                            {topicName && <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold max-w-xs truncate">{topicName}</span>}
                        </div>
                    )}

                    <div className="w-24 h-24 bg-purple-500/20 border border-purple-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20">
                        <Wand2 className="w-12 h-12 text-purple-400" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3 uppercase">ANAGRAM DUVARI</h1>
                    <p className="text-slate-300 text-lg sm:text-xl mb-8 leading-relaxed">
                        Seçilen konuda toplam <strong className="text-purple-400">{cards.length} kavram</strong> hazırlandı.<br/>
                        Öğrenciler karışık harfleri çözmeye hazır mı?
                    </p>
                    <Button 
                        onClick={startGame} 
                        size="lg" 
                        className="h-16 sm:h-20 px-12 sm:px-16 text-2xl font-black rounded-2xl shadow-xl shadow-purple-500/30 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:scale-105 active:scale-95 transition-all"
                    >
                        DUVARI AÇ <Play className="ml-3 w-8 h-8 fill-white" />
                    </Button>
                </div>
            </div>
        );
    }

    // Oyun Ekranı
    const solvedCount = cards.filter(c => c.isSolved).length;
    const totalCount = cards.length;

    return (
        <div ref={containerRef} className="h-screen w-screen bg-slate-950 text-white flex flex-col relative overflow-hidden select-none">
            {/* Üst Bar */}
            <header className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 z-10 border-b border-white/10 bg-slate-900/80 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-400 hover:text-white hover:bg-white/10 text-xs font-bold rounded-xl"
                        onClick={() => setShowExitConfirm(true)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Çıkış
                    </Button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                            ANAGRAM DUVARI
                        </h1>
                        {topicName && <span className="text-[10px] text-slate-400 hidden sm:inline-block max-w-[200px] truncate">{topicName}</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-slate-800/80 px-4 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                        <span className="font-mono font-black text-lg sm:text-xl">
                            {solvedCount} <span className="text-slate-500 text-sm">/</span> {totalCount}
                        </span>
                    </div>

                    <Button 
                        onClick={resetGame} 
                        variant="outline" 
                        size="sm" 
                        className="border-white/10 hover:bg-white/10 text-slate-300 h-9 px-3 text-xs font-bold rounded-xl"
                        title="Yeniden Karıştır"
                    >
                        <RefreshCw className="w-4 h-4 sm:mr-1" />
                        <span className="hidden md:inline">Karıştır</span>
                    </Button>

                    <Button 
                        onClick={revealAll} 
                        variant="outline" 
                        size="sm" 
                        className="border-white/10 hover:bg-white/10 text-slate-300 h-9 px-3 text-xs font-bold rounded-xl"
                        title="Tümünü Çöz (Öğretmen)"
                    >
                        <Eye className="w-4 h-4 sm:mr-1" />
                        <span className="hidden md:inline">Tümünü Çöz</span>
                    </Button>

                    <FullscreenToggle elementRef={containerRef} />
                </div>
            </header>

            {/* Kart Alanı */}
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 pb-16">
                    {cards.map((card, idx) => {
                        const style = CARD_COLORS[card.colorIndex];
                        return (
                            <div 
                                key={card.id}
                                onClick={() => handleCardClick(card.id)}
                                className={cn(
                                    "relative h-32 sm:h-40 cursor-pointer group select-none transition-all duration-300 hover:scale-[1.03] active:scale-95",
                                    card.isSolved ? "z-10" : ""
                                )}
                                style={{ transform: `rotate(${card.isSolved ? 0 : card.rotation}deg)` }}
                            >
                                <div className={cn(
                                    "w-full h-full rounded-2xl shadow-lg border-b-4 flex items-center justify-center p-3 text-center transition-all duration-300 relative overflow-hidden",
                                    card.isSolved 
                                        ? "bg-white border-white text-slate-900 shadow-[0_0_25px_rgba(255,255,255,0.4)] ring-2 ring-emerald-400" 
                                        : `${style.bg} ${style.border} text-white ${style.shadow} hover:brightness-110`
                                )}>
                                    {/* Sıra Numarası */}
                                    <div className={cn(
                                        "absolute top-2 left-3 font-mono font-black text-sm pointer-events-none",
                                        card.isSolved ? "text-slate-400" : "text-white/60"
                                    )}>
                                        #{idx + 1}
                                    </div>

                                    <span className={cn(
                                        "font-black tracking-wider break-all leading-tight drop-shadow-md",
                                        card.original.length > 9 ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl lg:text-4xl"
                                    )}>
                                        {card.isSolved ? card.original : card.scrambled}
                                    </span>
                                    
                                    {card.isSolved && (
                                        <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md animate-in zoom-in">
                                            <Trophy className="w-3.5 h-3.5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Bitiş Ekranı */}
            {isAllSolved && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-white/10 p-8 sm:p-10 rounded-3xl text-center shadow-2xl max-w-md w-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 via-purple-500 to-indigo-500" />
                        
                        <div className="p-4 bg-yellow-500/20 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center ring-4 ring-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.4)] animate-bounce">
                            <Trophy className="w-14 h-14 text-yellow-400" />
                        </div>
                        <h2 className="text-4xl font-black text-white mb-2">TEBRİKLER!</h2>
                        <p className="text-slate-300 text-base sm:text-lg mb-8">Tüm anagram kavramları başarıyla çözüldü.</p>
                        
                        <div className="flex flex-col gap-3">
                            <Button 
                                onClick={resetGame} 
                                size="lg" 
                                className="h-14 text-lg font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg"
                            >
                                <RotateCcw className="mr-2 h-5 w-5" /> Yeniden Oyna
                            </Button>
                            <Link href={backUrl}>
                                <Button variant="outline" size="lg" className="w-full h-14 text-base font-bold border-white/10 text-slate-300 hover:bg-white/10 rounded-xl">
                                    <Home className="mr-2 h-5 w-5" /> Kuruluma Dön
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Çıkış Onay Modalı */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
                        <h3 className="text-xl font-black text-white">Oyundan Çıkılsın mı?</h3>
                        <p className="text-slate-300 text-sm">Çözülen kavramların ilerlemesi sıfırlanacaktır.</p>
                        <div className="flex gap-3 justify-center pt-2">
                            <Button variant="ghost" onClick={() => setShowExitConfirm(false)} className="text-slate-400 hover:text-white">
                                İptal
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={() => {
                                    setShowExitConfirm(false);
                                    router.push(backUrl);
                                }}
                            >
                                Evet, Çık
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AnagramGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="w-16 h-16 animate-spin text-purple-500" /></div>}>
            <AnagramWallComponent />
        </Suspense>
    )
}
