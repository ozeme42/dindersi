'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Maximize, Minimize, ChevronLeft, ChevronRight, Eye, PartyPopper, 
    Sparkles, HelpCircle, Trophy, RotateCcw, Timer, Play, Pause,
    Check, X, Zap, Brain, Flame
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

type SymbolItem = {
    id: string;
    emoji: string;
    name: string;
    color: string;
    bg: string;
};

const SYMBOL_POOL: SymbolItem[] = [
    { id: 'hilal', emoji: '🌙', name: 'Hilal', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/40' },
    { id: 'mushaf', emoji: '📖', name: 'Kur\'an-ı Kerim', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
    { id: 'terazi', emoji: '⚖️', name: 'Adalet Terazisi', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-950/40' },
    { id: 'kandil', emoji: '🕯️', name: 'Kandil Işığı', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-950/40' },
    { id: 'mescid', emoji: '🕌', name: 'Mescid', color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-950/40' },
    { id: 'gemi', emoji: '🚢', name: 'Nuh\'un Gemisi', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-950/40' },
    { id: 'zemzem', emoji: '💧', name: 'Zemzem Damlası', color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-950/40' },
    { id: 'dua', emoji: '🤲', name: 'Dua Elleri', color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-950/40' },
    { id: 'guvercin', emoji: '🕊️', name: 'Hicret Güvercini', color: 'text-sky-500', bg: 'bg-sky-100 dark:bg-sky-950/40' },
    { id: 'kalp', emoji: '❤️', name: 'İhlas ve Sevgi', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-950/40' },
    { id: 'yildiz', emoji: '⭐', name: 'Sabah Yıldızı', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-950/40' },
    { id: 'hurma', emoji: '🌴', name: 'Medine Hurması', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950/40' }
];

type Level = 'easy' | 'medium' | 'hard';

const LEVEL_CONFIG = {
    easy: { name: 'Kolay', count: 4, gridClass: 'grid-cols-2 max-w-md', memorizeTime: 4 },
    medium: { name: 'Orta', count: 6, gridClass: 'grid-cols-3 max-w-xl', memorizeTime: 5 },
    hard: { name: 'Usta', count: 9, gridClass: 'grid-cols-3 max-w-xl', memorizeTime: 6 },
};

type CardState = {
    index: number;
    symbol: SymbolItem;
};

export function MemoryFlashGame() {
    const [level, setLevel] = useState<Level>('medium');
    const [cards, setCards] = useState<CardState[]>([]);
    const [targetSymbol, setTargetSymbol] = useState<SymbolItem | null>(null);
    
    // Oyun Aşaması: 'memorize' (ezberleme) | 'guess' (tahmin) | 'result' (sonuç)
    const [phase, setPhase] = useState<'memorize' | 'guess' | 'result'>('memorize');
    const [countdown, setCountdown] = useState<number>(5);
    const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    // Skor ve Seri
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

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

    // Yeni tur başlat
    const startNewRound = useCallback((currentLevel: Level = level) => {
        if (timerRef.current) clearInterval(timerRef.current);

        const config = LEVEL_CONFIG[currentLevel];
        // Sembol havuzundan rastgele N tane seç
        const shuffledSymbols = [...SYMBOL_POOL].sort(() => Math.random() - 0.5).slice(0, config.count);
        
        const newCards: CardState[] = shuffledSymbols.map((sym, idx) => ({
            index: idx,
            symbol: sym
        }));

        // Rastgele bir tanesini hedef seç
        const chosenTarget = shuffledSymbols[Math.floor(Math.random() * shuffledSymbols.length)];

        setCards(newCards);
        setTargetSymbol(chosenTarget);
        setSelectedCardIdx(null);
        setIsCorrect(null);
        setPhase('memorize');
        setCountdown(config.memorizeTime);

        // Geri sayım başlat
        let timeLeft = config.memorizeTime;
        timerRef.current = setInterval(() => {
            timeLeft -= 1;
            setCountdown(timeLeft);
            if (timeLeft <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                setPhase('guess');
            }
        }, 1000);
    }, [level]);

    useEffect(() => {
        startNewRound(level);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [level, startNewRound]);

    const handleCardClick = (idx: number) => {
        if (phase !== 'guess') return;

        setSelectedCardIdx(idx);
        const clickedCard = cards[idx];
        const correct = clickedCard.symbol.id === targetSymbol?.id;
        setIsCorrect(correct);
        setPhase('result');

        if (correct) {
            setScore(s => s + (level === 'easy' ? 10 : level === 'medium' ? 20 : 30));
            setStreak(st => st + 1);
            playSuccess();
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } else {
            setStreak(0);
            playError();
        }
    };

    const handleLevelChange = (lvl: Level) => {
        setLevel(lvl);
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
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
                                <Zap className="h-7 w-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                        Hafıza Matrisi
                                    </CardTitle>
                                    <Badge className="bg-amber-100 text-amber-800 border-none font-black text-xs px-2.5 py-0.5">
                                        Memory Flash
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                    Sembollerin yerini ezberleyin, kartlar kapanınca doğru kutuyu bulun!
                                </CardDescription>
                            </div>
                        </div>

                        {/* Skor & Seviye Seçici */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                {(['easy', 'medium', 'hard'] as Level[]).map((lvl) => (
                                    <button
                                        key={lvl}
                                        onClick={() => handleLevelChange(lvl)}
                                        className={cn(
                                            "px-3 py-1 rounded-lg text-xs font-black uppercase transition-all",
                                            level === lvl 
                                                ? "bg-amber-500 text-white shadow-sm" 
                                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                        )}
                                    >
                                        {LEVEL_CONFIG[lvl].name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300 font-black text-xs">
                                <span>Puan: {score}</span>
                                {streak > 1 && (
                                    <Badge className="bg-rose-500 text-white text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                                        <Flame className="w-3 h-3" /> {streak}x
                                    </Badge>
                                )}
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
                <CardContent className="flex-1 p-6 md:p-8 flex flex-col justify-between items-center space-y-6 overflow-y-auto">
                    
                    {/* BİLGİ VE YÖNERGE BANNER'I */}
                    <div className="w-full max-w-2xl text-center">
                        {phase === 'memorize' && (
                            <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 p-4 rounded-2xl flex items-center justify-center gap-3 animate-in zoom-in-95 duration-300">
                                <Timer className="w-6 h-6 text-amber-600 animate-spin" style={{ animationDuration: '3000ms' }} />
                                <span className="font-black text-lg md:text-xl text-amber-900 dark:text-amber-200">
                                    Hafızana Kaydet! Kapanıyor:
                                </span>
                                <Badge className="bg-amber-500 text-white font-black text-xl px-3.5 py-1 rounded-xl shadow-md">
                                    {countdown}s
                                </Badge>
                            </div>
                        )}

                        {phase === 'guess' && targetSymbol && (
                            <div className="bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-300 dark:border-indigo-700 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-3 animate-in bounce-in duration-500 shadow-md">
                                <span className="text-3xl">{targetSymbol.emoji}</span>
                                <div className="text-center sm:text-left">
                                    <p className="text-xs font-black uppercase tracking-widest text-indigo-500">
                                        Hedef Sembolü Bulun
                                    </p>
                                    <h3 className="text-xl md:text-2xl font-black text-indigo-950 dark:text-indigo-200">
                                        "{targetSymbol.name}" hangi kutudaydı?
                                    </h3>
                                </div>
                            </div>
                        )}

                        {phase === 'result' && (
                            <div className={cn(
                                "p-4 rounded-2xl border-2 flex items-center justify-center gap-3 animate-in zoom-in-95 duration-300",
                                isCorrect 
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-200" 
                                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-800 dark:text-rose-200"
                            )}>
                                {isCorrect ? (
                                    <>
                                        <Check className="w-6 h-6 text-emerald-600" />
                                        <span className="font-black text-lg md:text-xl">
                                            Tebrikler! Mükemmel Görsel Odaklanma! (+{level === 'easy' ? 10 : level === 'medium' ? 20 : 30} P)
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <X className="w-6 h-6 text-rose-600" />
                                        <span className="font-black text-lg md:text-xl">
                                            Yanlış Kutu! Doğru yer yeşil renkle gösterildi.
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* MATRİS KARTLARI */}
                    <div className={cn(
                        "grid gap-4 w-full mx-auto my-auto transition-all duration-500",
                        LEVEL_CONFIG[level].gridClass
                    )}>
                        {cards.map((card, idx) => {
                            const isSelected = selectedCardIdx === idx;
                            const isTarget = card.symbol.id === targetSymbol?.id;
                            
                            // Görünüm Durumu:
                            // memorize: Açık
                            // guess: Kapalı (Numara yazar)
                            // result: Seçilen ve hedeflenen açılır
                            const showContent = phase === 'memorize' || (phase === 'result' && (isSelected || isTarget));

                            let cardStyle = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400";
                            if (phase === 'result') {
                                if (isTarget) {
                                    cardStyle = "bg-emerald-500 border-emerald-600 text-white shadow-xl shadow-emerald-500/30 scale-105";
                                } else if (isSelected && !isCorrect) {
                                    cardStyle = "bg-rose-500 border-rose-600 text-white shadow-xl shadow-rose-500/30";
                                }
                            }

                            return (
                                <button
                                    key={card.index}
                                    disabled={phase !== 'guess'}
                                    onClick={() => handleCardClick(idx)}
                                    className={cn(
                                        "h-32 sm:h-36 md:h-44 rounded-3xl border-3 flex flex-col items-center justify-center p-3 shadow-lg transition-all duration-300 relative group select-none",
                                        phase === 'guess' ? "hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-dashed border-slate-300 dark:border-slate-600" : "",
                                        cardStyle
                                    )}
                                >
                                    {showContent ? (
                                        <div className="flex flex-col items-center justify-center space-y-2 animate-in zoom-in-75 duration-300">
                                            <span className="text-4xl sm:text-5xl md:text-6xl filter drop-shadow-sm">
                                                {card.symbol.emoji}
                                            </span>
                                            <span className={cn(
                                                "font-black text-xs md:text-sm tracking-tight text-center leading-tight",
                                                phase === 'result' && (isTarget || (isSelected && !isCorrect)) ? "text-white" : "text-slate-700 dark:text-slate-300"
                                            )}>
                                                {card.symbol.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center space-y-1">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">
                                                {idx + 1}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Dokun
                                            </span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* YENİ TUR BUTONU (Sonuç ekranında) */}
                    {phase === 'result' && (
                        <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Button
                                size="lg"
                                onClick={() => startNewRound(level)}
                                className="h-14 px-10 bg-amber-500 hover:bg-amber-600 text-white font-black text-lg uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/30 hover:scale-105 transition-all"
                            >
                                Sıradaki Tur <ChevronRight className="w-5 h-5 ml-1" />
                            </Button>
                        </div>
                    )}

                </CardContent>

                {/* FOOTER */}
                <CardFooter className={cn(
                    "p-4 md:p-6 border-t flex justify-between items-center flex-shrink-0 z-20",
                    isFullscreen ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                )}>
                    <Button 
                        onClick={() => startNewRound(level)}
                        variant="outline"
                        className="h-11 px-5 font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 text-xs"
                    >
                        <RotateCcw className="w-4 h-4 mr-1.5" /> Turu Yenile
                    </Button>

                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        {LEVEL_CONFIG[level].name} Mod • {LEVEL_CONFIG[level].count} Kutu
                    </div>

                    <Button 
                        onClick={() => startNewRound(level)}
                        className="h-11 px-6 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white font-black rounded-xl text-xs"
                    >
                        Hızlı Başlat <Play className="w-3.5 h-3.5 ml-1" />
                    </Button>
                </CardFooter>

            </Card>
        </div>
    );
}

function playSuccess() {
    if (typeof window === 'undefined') return;
    try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch {}
}

function playError() {
    if (typeof window === 'undefined') return;
    try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch {}
}
