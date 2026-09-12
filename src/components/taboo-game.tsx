'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Maximize, Minimize, ChevronLeft, ChevronRight, Eye, PartyPopper, 
    Sparkles, HelpCircle, Trophy, RotateCcw, Users, Timer, Play, Pause,
    Check, X, FastForward, ShieldAlert, Volume2, VolumeX, Shuffle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

export type TabooCard = {
    id: number;
    word: string;
    forbidden: [string, string, string, string];
    category: string;
};

const TABOO_CARDS: TabooCard[] = [
    {
        id: 1,
        word: "ORUÇ",
        forbidden: ["Ramazan", "Yemek", "Açlık", "İftar"],
        category: "İbadetler"
    },
    {
        id: 2,
        word: "KÂBE",
        forbidden: ["Mekke", "Hac", "Tavaf", "Kıble"],
        category: "Mekanlar"
    },
    {
        id: 3,
        word: "SADAKA",
        forbidden: ["Zekat", "Para", "İyilik", "Yardım"],
        category: "Ahlak & İbadet"
    },
    {
        id: 4,
        word: "CEBRAİL",
        forbidden: ["Melek", "Vahiy", "Peygamber", "Dört"],
        category: "Melekler"
    },
    {
        id: 5,
        word: "MİRAÇ",
        forbidden: ["Kudüs", "Göğe Yükselme", "Mescid-i Aksa", "Gece"],
        category: "Mucizeler"
    },
    {
        id: 6,
        word: "İHLAS",
        forbidden: ["Samimiyet", "Riya", "Gösteriş", "Sure"],
        category: "Kavramlar"
    },
    {
        id: 7,
        word: "SABIR",
        forbidden: ["Zorluk", "Beklemek", "Hz. Eyyub", "İsyan"],
        category: "Ahlak"
    },
    {
        id: 8,
        word: "ZEKAT",
        forbidden: ["Zengin", "Kırkta Bir", "Mal", "Farz"],
        category: "İbadetler"
    },
    {
        id: 9,
        word: "SAHUR",
        forbidden: ["Gece", "Yemek", "Oruç", "İmsak"],
        category: "Ramazan"
    },
    {
        id: 10,
        word: "EZAN",
        forbidden: ["Namaz", "Cami", "Müezzin", "Hz. Bilal"],
        category: "İbadetler"
    },
    {
        id: 11,
        word: "ABDEST",
        forbidden: ["Su", "Namaz", "Yıkamak", "Gusül"],
        category: "Temizlik & İbadet"
    },
    {
        id: 12,
        word: "KEVSER",
        forbidden: ["Havuz", "Sure", "Kısa", "Cennet"],
        category: "Kur'an Bilgisi"
    },
    {
        id: 13,
        word: "TEVHİD",
        forbidden: ["Allah", "Bir / Tek", "Şirk", "İnanç"],
        category: "İnanç Esasları"
    },
    {
        id: 14,
        word: "KIBLE",
        forbidden: ["Kabe", "Namaz", "Yön", "Mekke"],
        category: "İbadetler"
    },
    {
        id: 15,
        word: "MİNARE",
        forbidden: ["Cami", "Ezan", "Şerefe", "Yüksek"],
        category: "Mimari"
    },
    {
        id: 16,
        word: "HUTBE",
        forbidden: ["Cuma", "Minber", "İmam", "Konuşma"],
        category: "İbadetler"
    },
    {
        id: 17,
        word: "ZEMZEM",
        forbidden: ["Su", "Mekke", "Hz. Hacer", "Hz. İsmail"],
        category: "Mübarek Değerler"
    },
    {
        id: 18,
        word: "FİTRE (Fıtır Sadakası)",
        forbidden: ["Ramazan", "Bayram", "Fakir", "Para"],
        category: "İbadetler"
    },
    {
        id: 19,
        word: "KURBAN",
        forbidden: ["Bayram", "Kesmek", "Hz. İbrahim", "Et"],
        category: "İbadetler"
    },
    {
        id: 20,
        word: "İMSAK",
        forbidden: ["Oruç", "Sabah", "Başlangıç", "Vakit"],
        category: "Ramazan"
    },
    {
        id: 21,
        word: "SECDE",
        forbidden: ["Namaz", "Alın", "Yere Koymak", "Rüku"],
        category: "İbadetler"
    },
    {
        id: 22,
        word: "MUSHAF",
        forbidden: ["Kur'an", "Kitap", "Sayfa", "Kapak"],
        category: "Kur'an Bilgisi"
    },
    {
        id: 23,
        word: "TERAVİH",
        forbidden: ["Ramazan", "Yatsı", "Yirmi Rekat", "Namaz"],
        category: "Ramazan"
    },
    {
        id: 24,
        word: "MİKÂİL",
        forbidden: ["Melek", "Yağmur", "Tabiat", "Dört"],
        category: "Melekler"
    },
    {
        id: 25,
        word: "İHRAM",
        forbidden: ["Hac", "Beyaz", "Örtü", "Umre"],
        category: "Hac"
    },
    {
        id: 26,
        word: "ARAFAT",
        forbidden: ["Hac", "Vakfe", "Dağ", "Mekke"],
        category: "Hac"
    },
    {
        id: 27,
        word: "SEVR",
        forbidden: ["Mağara", "Hicret", "Örümcek", "Hz. Ebubekir"],
        category: "Siyer"
    },
    {
        id: 28,
        word: "TEVBE",
        forbidden: ["Günah", "Pişmanlık", "Af", "Dilemek"],
        category: "Ahlak"
    },
    {
        id: 29,
        word: "CENNET",
        forbidden: ["Mükafat", "Ahiret", "Cehennem", "Ebedi"],
        category: "Ahiret"
    },
    {
        id: 30,
        word: "ŞEHİT",
        forbidden: ["Vatan", "Ölüm", "Savaş", "Cennet"],
        category: "Kavramlar"
    }
];

export function TabooGame() {
    const [deck, setDeck] = useState<TabooCard[]>(TABOO_CARDS);
    const [cardIndex, setCardIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Süre
    const [initialTime, setInitialTime] = useState(60);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Takımlar
    const [activeTeam, setActiveTeam] = useState<'A' | 'B'>('A');
    const [teamAScore, setTeamAScore] = useState(0);
    const [teamBScore, setTeamBScore] = useState(0);
    const [passCount, setPassCount] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const currentCard = deck[cardIndex] || deck[0];

    // Tam Ekran Kontrolü
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.error(err));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Timer mantığı
    useEffect(() => {
        if (isTimerRunning && timeLeft > 0) {
            timerRef.current = setTimeout(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isTimerRunning) {
            setIsTimerRunning(false);
            playBuzzer();
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isTimerRunning, timeLeft]);

    const startRound = () => {
        setTimeLeft(initialTime);
        setIsTimerRunning(true);
        setPassCount(0);
    };

    const pauseRound = () => {
        setIsTimerRunning(false);
    };

    const resumeRound = () => {
        setIsTimerRunning(true);
    };

    const nextCard = () => {
        setCardIndex(prev => (prev + 1) % deck.length);
    };

    const handleCorrect = () => {
        if (activeTeam === 'A') setTeamAScore(s => s + 1);
        else setTeamBScore(s => s + 1);

        playDing();
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
        nextCard();
    };

    const handleTabooError = () => {
        if (activeTeam === 'A') setTeamAScore(s => Math.max(0, s - 1));
        else setTeamBScore(s => Math.max(0, s - 1));

        playBuzzer();
        nextCard();
    };

    const handlePass = () => {
        setPassCount(p => p + 1);
        nextCard();
    };

    const switchTeam = () => {
        setIsTimerRunning(false);
        setTimeLeft(initialTime);
        setActiveTeam(t => (t === 'A' ? 'B' : 'A'));
        setPassCount(0);
    };

    const shuffleCards = () => {
        const shuffled = [...TABOO_CARDS].sort(() => Math.random() - 0.5);
        setDeck(shuffled);
        setCardIndex(0);
    };

    const resetGame = () => {
        setIsTimerRunning(false);
        setTimeLeft(initialTime);
        setTeamAScore(0);
        setTeamBScore(0);
        setActiveTeam('A');
        setPassCount(0);
        setCardIndex(0);
    };

    return (
        <div 
            ref={containerRef} 
            className={cn(
                "animate-in fade-in duration-700 transition-all font-sans bg-slate-50",
                isFullscreen ? "fixed inset-0 z-[99999] p-4 md:p-8 flex items-center justify-center bg-slate-950" : "w-full mx-auto"
            )}
        >
            <Card className={cn(
                "border shadow-2xl rounded-[2rem] overflow-hidden flex flex-col relative w-full max-w-5xl mx-auto transition-colors duration-500",
                isFullscreen ? "h-full bg-slate-900 border-slate-800 text-white" : "min-h-[750px] bg-white border-slate-200"
            )}>
                
                {/* HEADER */}
                <CardHeader className={cn(
                    "p-4 md:p-6 relative flex-shrink-0 z-20 border-b",
                    isFullscreen ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
                )}>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shadow-inner">
                                <ShieldAlert className="h-7 w-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                        Anlat Bakalım
                                    </CardTitle>
                                    <Badge className="bg-rose-100 text-rose-800 border-none font-black text-xs px-2.5 py-0.5">
                                        Dini Tabu
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                    Yasaklı kelimeleri kullanmadan hedeflenen kavramı anlatın!
                                </CardDescription>
                            </div>
                        </div>

                        {/* Takım Skorbordu & Araçlar */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-black">
                                <button
                                    onClick={() => setActiveTeam('A')}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all",
                                        activeTeam === 'A' ? "bg-red-500 text-white shadow-md scale-105" : "text-slate-600 dark:text-slate-300 opacity-60"
                                    )}
                                >
                                    <span>Takım A:</span>
                                    <span className="text-sm font-black">{teamAScore}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTeam('B')}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all",
                                        activeTeam === 'B' ? "bg-blue-500 text-white shadow-md scale-105" : "text-slate-600 dark:text-slate-300 opacity-60"
                                    )}
                                >
                                    <span>Takım B:</span>
                                    <span className="text-sm font-black">{teamBScore}</span>
                                </button>
                                <button 
                                    onClick={resetGame} 
                                    title="Tüm Oyunu Sıfırla" 
                                    className="p-1.5 hover:text-rose-500 transition-colors"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            </div>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={toggleFullscreen} 
                                className="rounded-xl h-10 w-10 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {/* CONTENT */}
                <CardContent className="flex-1 p-6 md:p-8 flex flex-col justify-between space-y-6 overflow-y-auto">
                    
                    {/* SÜRE & SIRA BİLGİSİ */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <Badge className={cn(
                                "text-xs font-black uppercase px-3 py-1 border-none shadow-sm",
                                activeTeam === 'A' ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                            )}>
                                Sıra: Takım {activeTeam}
                            </Badge>
                            <span className="text-xs font-bold text-slate-400">
                                Kart {cardIndex + 1} / {deck.length}
                            </span>
                        </div>

                        {/* Zaman Sayacı */}
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "flex items-center gap-2 px-4 py-1 rounded-xl font-black text-lg transition-all",
                                timeLeft <= 10 && timeLeft > 0 
                                    ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30" 
                                    : "bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600"
                            )}>
                                <Timer className="w-5 h-5" />
                                <span className="tabular-nums w-8 text-center">{timeLeft}s</span>
                            </div>

                            {!isTimerRunning ? (
                                <Button 
                                    size="sm" 
                                    onClick={startRound}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-10 px-4"
                                >
                                    <Play className="w-4 h-4 mr-1" /> {timeLeft === 0 ? "Yeni Tur Başlat" : "Başlat"}
                                </Button>
                            ) : (
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={pauseRound}
                                    className="border-slate-300 font-black rounded-xl h-10 px-4"
                                >
                                    <Pause className="w-4 h-4 mr-1" /> Duraklat
                                </Button>
                            )}

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={switchTeam}
                                className="font-bold text-xs h-10 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            >
                                Takımı Değiştir
                            </Button>
                        </div>
                    </div>

                    {/* TABU KARTI */}
                    <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-800 rounded-[2.5rem] border-4 border-slate-800 dark:border-slate-600 shadow-2xl overflow-hidden flex flex-col transform hover:scale-[1.01] transition-transform">
                        
                        {/* KART BAŞLIĞI: HEDEF KELİME */}
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-6 md:p-8 text-center relative overflow-hidden">
                            <div className="absolute top-2 right-4 text-[10px] font-black uppercase tracking-widest text-indigo-200 opacity-80">
                                {currentCard.category}
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-white tracking-wide uppercase drop-shadow-md">
                                {currentCard.word}
                            </h2>
                        </div>

                        {/* YASAKLI KELİMELER LİSTESİ */}
                        <div className="p-6 md:p-8 bg-gradient-to-b from-rose-50/50 to-white dark:from-slate-800 dark:to-slate-800/90 flex flex-col items-center space-y-3">
                            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-2">
                                <ShieldAlert className="w-4 h-4" /> Yasaklı Kelimeler
                            </div>

                            {currentCard.forbidden.map((word, idx) => (
                                <div 
                                    key={idx}
                                    className="w-full py-3 px-6 rounded-2xl bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-center font-black text-lg md:text-xl text-rose-900 dark:text-rose-200 tracking-wide"
                                >
                                    {word}
                                </div>
                            ))}
                        </div>

                    </div>

                    {/* AKILLI TAHTA OYUN BUTONLARI (Doğru, Yasak, Pas) */}
                    <div className="flex flex-wrap items-center justify-center gap-4 max-w-2xl mx-auto w-full pt-2">
                        
                        {/* HATA / YASAK KELİME BUTONU */}
                        <button
                            onClick={handleTabooError}
                            className="flex-1 min-w-[140px] h-16 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-lg md:text-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all select-none"
                        >
                            <X className="w-6 h-6 stroke-[3]" /> Yasak (-1)
                        </button>

                        {/* PAS BUTONU */}
                        <button
                            onClick={handlePass}
                            className="h-16 px-6 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-slate-800 dark:text-white font-black text-base flex items-center justify-center gap-1.5 transition-all select-none"
                        >
                            <FastForward className="w-5 h-5" /> Pas ({passCount})
                        </button>

                        {/* DOĞRU BİLDİ BUTONU */}
                        <button
                            onClick={handleCorrect}
                            className="flex-1 min-w-[140px] h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-lg md:text-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all select-none"
                        >
                            <Check className="w-6 h-6 stroke-[3]" /> Doğru (+1)
                        </button>

                    </div>

                </CardContent>

                {/* FOOTER */}
                <CardFooter className={cn(
                    "p-4 md:p-6 border-t flex justify-between items-center flex-shrink-0 z-20",
                    isFullscreen ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                )}>
                    <Button 
                        onClick={shuffleCards}
                        variant="outline"
                        className="h-11 px-5 font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 text-xs"
                    >
                        <Shuffle className="w-4 h-4 mr-1.5" /> Kartları Karıştır
                    </Button>

                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Toplam {deck.length} Kart
                    </div>

                    <Button 
                        onClick={nextCard}
                        variant="outline"
                        className="h-11 px-6 border-slate-200 text-slate-700 dark:text-slate-200 font-black rounded-xl text-xs"
                    >
                        Sıradaki Kart <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </CardFooter>

            </Card>
        </div>
    );
}

function playDing() {
    if (typeof window === 'undefined') return;
    try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch {}
}

function playBuzzer() {
    if (typeof window === 'undefined') return;
    try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch {}
}
