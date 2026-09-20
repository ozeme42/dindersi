'use client';

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Eye, Trophy, ArrowLeft, Wand2, AlertTriangle, Play, Sparkles, CheckCircle2 } from "lucide-react";
import { getAnagramWallWords } from '../actions'; 
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/audio-service";
import Confetti from 'react-dom-confetti';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { GameEndScreen } from "@/components/game-end-screen";
import { useAuth } from "@/context/auth-context";
import { getGameBackUrl } from "@/lib/game-navigation";

type AnagramCard = {
    id: string;
    original: string;
    scrambled: string;
    isSolved: boolean;
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

function AnagramWallBoard({
    cards,
    onCardClick,
}: {
    cards: AnagramCard[];
    onCardClick: (id: string) => void;
}) {
    const { theme, soundEnabled } = useWordwall();
    const solvedCount = cards.filter(c => c.isSolved).length;
    const totalCards = cards.length;
    const [isLandscape, setIsLandscape] = useState(true);

    useEffect(() => {
        const updateOrientation = () => {
            if (typeof window !== 'undefined') {
                setIsLandscape(window.innerWidth >= 640 || window.innerWidth > window.innerHeight);
            }
        };
        updateOrientation();
        window.addEventListener('resize', updateOrientation);
        return () => window.removeEventListener('resize', updateOrientation);
    }, []);

    // Akıllı tahta ve mobilde ekranı TAM DOLDURACAK ve ASLA taşmayacak satır/sütun hesabı
    const getGridDimensions = () => {
        if (isLandscape) {
            if (totalCards <= 6) return { cols: 3, rows: 2 };
            if (totalCards <= 8) return { cols: 4, rows: 2 };
            if (totalCards <= 10) return { cols: 5, rows: 2 };
            if (totalCards <= 12) return { cols: 4, rows: 3 };
            if (totalCards <= 15) return { cols: 5, rows: 3 };
            if (totalCards <= 16) return { cols: 4, rows: 4 };
            return { cols: 5, rows: Math.ceil(totalCards / 5) };
        } else {
            if (totalCards <= 4) return { cols: 2, rows: 2 };
            if (totalCards <= 6) return { cols: 2, rows: 3 };
            if (totalCards <= 8) return { cols: 2, rows: 4 };
            if (totalCards <= 10) return { cols: 2, rows: 5 };
            if (totalCards <= 12) return { cols: 3, rows: 4 };
            return { cols: 3, rows: Math.ceil(totalCards / 3) };
        }
    };

    const { cols, rows } = getGridDimensions();

    const gridInlineStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        gap: isLandscape ? 'clamp(6px, 1vw, 14px)' : '6px',
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
    };

    return (
        <div className="w-full h-full min-h-0 min-w-0 flex-1 flex flex-col justify-between overflow-hidden">
            {/* ANAGRAM DUVARI PANOSU (TAM EKRAN - SIFIR KAYDIRMA) */}
            <div className={cn(
                "w-full h-full min-h-0 min-w-0 rounded-2xl sm:rounded-3xl p-2 sm:p-3 md:p-4 border-2 backdrop-blur-xl shadow-2xl transition-all flex flex-col justify-between overflow-hidden",
                theme.cardBg,
                theme.cardBorder,
                theme.cardShadow
            )}>
                {/* Durum Göstergesi (Kompakt) */}
                <div className={cn("flex-shrink-0 flex items-center justify-between pb-1.5 sm:pb-2.5 mb-1.5 sm:mb-2 border-b text-xs sm:text-sm md:text-base font-black", theme.cardDivider)}>
                    <span className={cn("flex items-center gap-1.5 sm:gap-2", theme.accentText)}>
                        <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
                        <span className="truncate">Karta Dokunarak Gizli Kavramı Çöz</span>
                    </span>
                    <span className={cn("px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl border text-[11px] sm:text-xs md:text-sm font-mono flex-shrink-0", theme.badgeCounter)}>
                        {solvedCount} / {cards.length} Çözüldü
                    </span>
                </div>

                <div style={gridInlineStyle}>
                    {cards.map((card, idx) => {
                        return (
                            <button
                                key={card.id}
                                type="button"
                                onClick={() => {
                                    if (soundEnabled && !card.isSolved) playSound('pop');
                                    onCardClick(card.id);
                                }}
                                className={cn(
                                    "relative w-full h-full min-h-0 min-w-0 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-2 sm:p-3 text-center transition-all duration-200 select-none cursor-pointer overflow-hidden",
                                    "border-2 border-b-[5px] sm:border-b-[7px] active:translate-y-1 active:border-b-2 shadow-lg",
                                    card.isSolved
                                        ? "bg-gradient-to-b from-emerald-800 to-emerald-950 border-emerald-400 border-b-emerald-950 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                        : cn(theme.buttonIdle, "hover:-translate-y-0.5 hover:shadow-xl hover:brightness-105")
                                )}
                            >
                                {/* Sıra Numarası Rozeti */}
                                <div className={cn(
                                    "absolute top-1 left-1.5 sm:top-2 sm:left-2 w-5 h-5 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-mono font-black text-[10px] sm:text-xs border",
                                    card.isSolved
                                        ? "bg-black/30 border-emerald-500/40 text-emerald-300"
                                        : theme.buttonBadgeIdle
                                )}>
                                    {idx + 1}
                                </div>

                                {/* Çözüldü İkonu */}
                                {card.isSolved && (
                                    <div className="absolute top-1 right-1.5 sm:top-2 sm:right-2 text-emerald-300 animate-in zoom-in duration-300">
                                        <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
                                    </div>
                                )}

                                {/* Kelime Metni */}
                                <span 
                                    style={{
                                        fontSize: card.original.length > 9 
                                            ? 'clamp(14px, 1.8vw, 28px)' 
                                             : 'clamp(16px, 2.5vw, 38px)',
                                        lineHeight: 1.2
                                    }}
                                    className={cn("font-black tracking-widest break-all leading-tight px-1", theme.isDark && "drop-shadow")}
                                >
                                    {card.isSolved ? card.original : card.scrambled}
                                </span>

                                {!card.isSolved && (
                                    <span className={cn("text-[9px] sm:text-[11px] font-bold uppercase tracking-wider mt-1", theme.subText)}>
                                        Çözmek için dokun
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function AnagramToolbarExtra({ onReset, onReveal }: { onReset: () => void; onReveal: () => void }) {
    const { theme } = useWordwall();
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={onReset}
                title="Yeniden Karıştır"
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all border-2 active:scale-95 cursor-pointer",
                    theme.themePillIdle
                )}
            >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Karıştır</span>
            </button>
            <button
                type="button"
                onClick={onReveal}
                title="Tümünü Çöz (Öğretmen)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all border-2 bg-purple-950/60 border-purple-500/40 hover:bg-purple-900/60 active:scale-95 text-purple-200 cursor-pointer"
            >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tümünü Çöz</span>
            </button>
        </div>
    );
}

function AnagramWallComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    
    const [gameState, setGameState] = useState<'loading' | 'error' | 'intro' | 'playing' | 'finished'>('loading');
    const [cards, setCards] = useState<AnagramCard[]>([]);
    const [score, setScore] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const topicName = searchParams.get('topicName') || 'Anagram Duvarı';
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/anagram-duvari' });

    const fetchWords = useCallback(async () => {
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
                setError("Bu konuya ait kavram bulunamadı. Lütfen başka bir konu seçiniz.");
                setGameState('error');
            } else {
                const gameCards: AnagramCard[] = result.words.map((word, index) => ({
                    id: `word-${index}`,
                    original: word.toUpperCase(),
                    scrambled: scrambleWord(word.toUpperCase()),
                    isSolved: false,
                    colorIndex: index % 6,
                }));
                setCards(gameCards.sort(() => Math.random() - 0.5));
                setGameState('playing');
                setElapsedSeconds(0);
                setScore(0);
            }
        } catch (err) {
            setError("Beklenmedik bir hata oluştu.");
            setGameState('error');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchWords();
    }, [fetchWords]);

    // Kronometre
    useEffect(() => {
        if (gameState !== 'playing') return;
        const timer = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    // Bitiş Kontrolü
    useEffect(() => {
        if (gameState === 'playing' && cards.length > 0 && cards.every((c) => c.isSolved)) {
            setShowConfetti(true);
            playSound('win');
            const timer = setTimeout(() => {
                setGameState('finished');
            }, 900);
            return () => clearTimeout(timer);
        }
    }, [cards, gameState]);

    const handleCardClick = (id: string) => {
        const card = cards.find((c) => c.id === id);
        if (!card || card.isSolved) return;
        playSound('correct');
        setScore((prev) => prev + 10);
        setCards((prev) => prev.map((c) => (c.id === id ? { ...c, isSolved: true } : c)));
    };

    const revealAll = () => {
        playSound('pop');
        setCards((prev) => prev.map((c) => ({ ...c, isSolved: true })));
    };

    const resetGame = () => {
        playSound('start');
        setShowConfetti(false);
        setElapsedSeconds(0);
        setScore(0);
        setCards((prev) =>
            prev
                .map((c) => ({
                    ...c,
                    isSolved: false,
                    scrambled: scrambleWord(c.original),
                }))
                .sort(() => Math.random() - 0.5)
        );
        setGameState('playing');
    };

    if (gameState === 'loading') {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="w-14 h-14 animate-spin text-purple-500" />
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-slate-900/90 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md">
                    <div className="bg-red-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5 text-red-500">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Hata Oluştu</h2>
                    <p className="text-slate-400 text-sm mb-6">{error}</p>
                    <Button size="lg" variant="outline" className="w-full border-white/10 text-white hover:bg-white/5" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 w-5 h-5" /> Geri Dön
                    </Button>
                </div>
            </div>
        );
    }

    const solvedCount = cards.filter((c) => c.isSolved).length;

    return (
        <WordwallShell
            title="Anagram Duvarı"
            subtitle={topicName}
            currentQuestionIndex={solvedCount}
            totalQuestions={cards.length}
            score={score}
            timeLeft={elapsedSeconds}
            backUrl={backUrl}
            isFinished={gameState === 'finished'}
            toolbarExtra={<AnagramToolbarExtra onReset={resetGame} onReveal={revealAll} />}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-1.5 sm:p-2.5 md:p-3"
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 140, spread: 120 }} />
            </div>

            {gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen
                        score={score}
                        onRestart={resetGame}
                        backUrl={backUrl}
                        isSuccess={solvedCount === cards.length}
                    />
                </div>
            ) : (
                <AnagramWallBoard
                    cards={cards}
                    onCardClick={handleCardClick}
                />
            )}
        </WordwallShell>
    );
}

export default function AnagramGamePage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="w-14 h-14 animate-spin text-purple-500" />
            </div>
        }>
            <AnagramWallComponent />
        </Suspense>
    );
}