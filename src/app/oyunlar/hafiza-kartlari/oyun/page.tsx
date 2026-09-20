'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getHafizaKartlariAction, submitHafizaKartlariScoreAction, type MatchingPair } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Brain, CheckCircle2, RotateCcw, XOctagon, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import Confetti from 'react-dom-confetti';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { getGameBackUrl } from '@/lib/game-navigation';

// Eşleşen her çifte özel canlı, yüksek kontrastlı pedagojik renk paleti
const PAIR_PALETTES = [
    {
        bg: 'bg-emerald-950/90 hover:bg-emerald-950',
        border: 'border-emerald-400',
        borderBottom: 'border-b-emerald-600',
        text: 'text-emerald-100',
        badge: 'bg-emerald-500 text-slate-950',
        glow: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]',
    },
    {
        bg: 'bg-sky-950/90 hover:bg-sky-950',
        border: 'border-sky-400',
        borderBottom: 'border-b-sky-600',
        text: 'text-sky-100',
        badge: 'bg-sky-500 text-slate-950',
        glow: 'shadow-[0_0_25px_rgba(14,165,233,0.35)]',
    },
    {
        bg: 'bg-amber-950/90 hover:bg-amber-950',
        border: 'border-amber-400',
        borderBottom: 'border-b-amber-600',
        text: 'text-amber-100',
        badge: 'bg-amber-500 text-slate-950',
        glow: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]',
    },
    {
        bg: 'bg-purple-950/90 hover:bg-purple-950',
        border: 'border-purple-400',
        borderBottom: 'border-b-purple-600',
        text: 'text-purple-100',
        badge: 'bg-purple-500 text-white',
        glow: 'shadow-[0_0_25px_rgba(168,85,247,0.35)]',
    },
    {
        bg: 'bg-rose-950/90 hover:bg-rose-950',
        border: 'border-rose-400',
        borderBottom: 'border-b-rose-600',
        text: 'text-rose-100',
        badge: 'bg-rose-500 text-white',
        glow: 'shadow-[0_0_25px_rgba(244,63,94,0.35)]',
    },
    {
        bg: 'bg-orange-950/90 hover:bg-orange-950',
        border: 'border-orange-400',
        borderBottom: 'border-b-orange-600',
        text: 'text-orange-100',
        badge: 'bg-orange-500 text-slate-950',
        glow: 'shadow-[0_0_25px_rgba(249,115,22,0.35)]',
    },
    {
        bg: 'bg-teal-950/90 hover:bg-teal-950',
        border: 'border-teal-400',
        borderBottom: 'border-b-teal-600',
        text: 'text-teal-100',
        badge: 'bg-teal-500 text-slate-950',
        glow: 'shadow-[0_0_25px_rgba(20,184,166,0.35)]',
    },
    {
        bg: 'bg-indigo-950/90 hover:bg-indigo-950',
        border: 'border-indigo-400',
        borderBottom: 'border-b-indigo-600',
        text: 'text-indigo-100',
        badge: 'bg-indigo-500 text-white',
        glow: 'shadow-[0_0_25px_rgba(99,102,241,0.35)]',
    },
    {
        bg: 'bg-lime-950/90 hover:bg-lime-950',
        border: 'border-lime-400',
        borderBottom: 'border-b-lime-600',
        text: 'text-lime-100',
        badge: 'bg-lime-500 text-slate-950',
        glow: 'shadow-[0_0_25px_rgba(132,204,22,0.35)]',
    },
    {
        bg: 'bg-fuchsia-950/90 hover:bg-fuchsia-950',
        border: 'border-fuchsia-400',
        borderBottom: 'border-b-fuchsia-600',
        text: 'text-fuchsia-100',
        badge: 'bg-fuchsia-500 text-white',
        glow: 'shadow-[0_0_25px_rgba(217,70,239,0.35)]',
    },
];

function MemoryCardsBoard({
    pairs,
    flippedIndices,
    matchedIds,
    onCardClick,
}: {
    pairs: MatchingPair[];
    flippedIndices: number[];
    matchedIds: Set<string>;
    onCardClick: (index: number) => void;
}) {
    const { theme, soundEnabled } = useWordwall();
    const totalCards = pairs.length;
    const [isLandscape, setIsLandscape] = useState(true);

    // Her çifti sabit bir indeks ve renkle eşleyen harita
    const pairIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        let count = 0;
        pairs.forEach((p) => {
            if (!map.has(p.pairId)) {
                map.set(p.pairId, count++);
            }
        });
        return map;
    }, [pairs]);

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
            // Yatay Ekran / Akıllı Tahta
            if (totalCards <= 6) return { cols: 3, rows: 2 };
            if (totalCards <= 8) return { cols: 4, rows: 2 };
            if (totalCards <= 10) return { cols: 5, rows: 2 };
            if (totalCards <= 12) return { cols: 4, rows: 3 };
            if (totalCards <= 15) return { cols: 5, rows: 3 };
            if (totalCards <= 16) return { cols: 4, rows: 4 };
            if (totalCards <= 20) return { cols: 5, rows: 4 };
            return { cols: 6, rows: Math.ceil(totalCards / 6) };
        } else {
            // Dikey Ekran / Telefon
            if (totalCards <= 6) return { cols: 2, rows: 3 };
            if (totalCards <= 8) return { cols: 2, rows: 4 };
            if (totalCards <= 10) return { cols: 2, rows: 5 };
            if (totalCards <= 12) return { cols: 2, rows: 6 };
            if (totalCards <= 16) return { cols: 3, rows: Math.ceil(totalCards / 3) };
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
            {/* OYUN KUTUSU (TAM EKRAN - SIFIR KAYDIRMA) */}
            <div className={cn(
                "w-full h-full min-h-0 min-w-0 rounded-2xl sm:rounded-3xl p-2 sm:p-3 md:p-4 border-2 backdrop-blur-xl shadow-2xl transition-all flex flex-col justify-between overflow-hidden",
                theme.cardBg,
                theme.cardBorder,
                theme.cardShadow
            )}>
                {/* Üst Durum Göstergesi (Kompakt) */}
                <div className={cn("flex-shrink-0 flex items-center justify-between pb-1.5 sm:pb-2.5 mb-1.5 sm:mb-2 border-b text-xs sm:text-sm md:text-base font-black", theme.cardDivider)}>
                    <span className={cn("flex items-center gap-1.5 sm:gap-2", theme.accentText)}>
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
                        <span className="truncate">Aynı Kavram Kartlarını Bul ve Eşleştir</span>
                    </span>
                    <span className={cn("px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl border text-[11px] sm:text-xs md:text-sm font-mono flex-shrink-0", theme.badgeCounter)}>
                        {matchedIds.size / 2} / {pairs.length / 2} Çift Eşleşti
                    </span>
                </div>

                {/* DİNAMİK EKRANI DOLDURAN IZGARA */}
                <div style={gridInlineStyle}>
                    {pairs.map((card, index) => {
                        const isFlipped = flippedIndices.includes(index) || matchedIds.has(card.id);
                        const isMatched = matchedIds.has(card.id);
                        const textLength = card.content.length;

                        // Çifte ait özel renk ve numara bilgisi
                        const pairIdx = pairIndexMap.get(card.pairId) ?? 0;
                        const pairNumber = pairIdx + 1;
                        const palette = PAIR_PALETTES[pairIdx % PAIR_PALETTES.length];

                        // Akıllı Tahtada Uzaktan Net Okunan Dev Font (Kavramlar için dinamik ölçekleme)
                        const fontSizeStyle = textLength > 25
                            ? 'clamp(14px, 1.6vw, 24px)'
                            : textLength > 15
                                ? 'clamp(16px, 2.2vw, 32px)'
                                : 'clamp(18px, 2.8vw, 40px)';

                        return (
                            <div
                                key={card.id}
                                onClick={() => {
                                    if (!isMatched) {
                                        onCardClick(index);
                                    }
                                }}
                                className={cn(
                                    "relative w-full h-full min-h-0 min-w-0 group select-none [perspective:1000px]",
                                    isMatched ? "cursor-default" : "cursor-pointer"
                                )}
                            >
                                <div className={cn(
                                    "w-full h-full min-h-0 min-w-0 transition-all duration-500 [transform-style:preserve-3d]",
                                    isFlipped ? "[transform:rotateY(180deg)]" : "hover:-translate-y-0.5 hover:scale-[1.01] active:scale-95"
                                )}>
                                    {/* --- ARKA YÜZ (KAPALI - TEMA İLE UYUMLU 3D WORDWALL KART ARKALIĞI) --- */}
                                    <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                                        <div className={cn(
                                            "w-full h-full rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-2 sm:p-3 transition-all",
                                            "border-2 border-b-[5px] sm:border-b-[7px] shadow-lg",
                                            theme.buttonBase,
                                            theme.buttonIdle,
                                            "hover:brightness-105"
                                        )}>
                                            <div className={cn("w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shadow-inner", theme.buttonBadgeIdle)}>
                                                <Brain className="w-4 h-4 sm:w-6 sm:h-6 animate-pulse" />
                                            </div>
                                            <span className="text-[11px] sm:text-sm font-black uppercase tracking-widest mt-1 opacity-90">
                                                ?
                                            </span>
                                        </div>
                                    </div>

                                    {/* --- ÖN YÜZ (AÇIK - İÇERİK) --- */}
                                    <div className="absolute inset-0 w-full h-full [transform:rotateY(180deg)] [backface-visibility:hidden]">
                                        <div className={cn(
                                            "relative w-full h-full min-h-0 min-w-0 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl transition-all duration-200 select-none text-center overflow-hidden",
                                            "border-2 border-b-[5px] sm:border-b-[7px] shadow-lg",
                                            isMatched
                                                ? cn(
                                                    palette.bg,
                                                    palette.border,
                                                    palette.borderBottom,
                                                    palette.text,
                                                    palette.glow,
                                                    "border-b-[4px] sm:border-b-[6px] scale-[0.98] ring-1 ring-white/20"
                                                )
                                                : "bg-indigo-600 border-indigo-300 text-white scale-[1.03] shadow-[0_0_30px_rgba(99,102,241,0.7)] ring-4 ring-indigo-400/50"
                                        )}>
                                            {/* Eşleşen kartlarda Kavram Etiketi ve Çift Numarası */}
                                            {isMatched && (
                                                <>
                                                    <span className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-black/60 text-white/90 border border-white/15 backdrop-blur-sm z-10 pointer-events-none flex items-center gap-1">
                                                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                                                        <span>Kavram</span>
                                                    </span>
                                                    <span className={cn(
                                                        "absolute top-1 right-1 sm:top-1.5 sm:right-1.5 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-black tracking-wide flex items-center gap-1 shadow-md border border-white/20 backdrop-blur-sm z-10 pointer-events-none",
                                                        palette.badge
                                                    )}>
                                                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                        <span>Çift {pairNumber}</span>
                                                    </span>
                                                </>
                                            )}

                                            <span
                                                style={{
                                                    fontSize: fontSizeStyle,
                                                    lineHeight: 1.25,
                                                }}
                                                className={cn(
                                                    "z-10 font-black tracking-tight drop-shadow-md break-words max-w-full text-center overflow-hidden line-clamp-3 uppercase",
                                                    isMatched && "pt-3 sm:pt-4"
                                                )}
                                            >
                                                {card.content}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function MemoryGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [pairs, setPairs] = useState<MatchingPair[]>([]);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'error'>('loading');
    const [score, setScore] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
    const [isChecking, setIsChecking] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const topicName = searchParams.get('topicName') || 'Hafıza Kartları';
    const gameContext = `Hafıza Kartları - ${searchParams.get('courseName') || 'Ders'} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/hafiza-kartlari' });

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getHafizaKartlariAction(params);

        if (result.error || !result.pairs || result.pairs.length === 0) {
            setError(result.error || "Bu konu için oyun verisi bulunamadı.");
            setGameState('error');
        } else {
            setPairs(result.pairs);
            setGameState('playing');
            setElapsedSeconds(0);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

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
        if (pairs.length > 0 && matchedIds.size === pairs.length) {
            setShowConfetti(true);
            playSound('win');
            const timer = setTimeout(() => setGameState('finished'), 1000);
            return () => clearTimeout(timer);
        }
    }, [matchedIds, pairs.length]);

    // 2 Kart Açıldığında Karşılaştır
    useEffect(() => {
        if (flippedIndices.length === 2) {
            setIsChecking(true);
            const [firstIndex, secondIndex] = flippedIndices;
            const firstCard = pairs[firstIndex];
            const secondCard = pairs[secondIndex];

            if (firstCard.pairId === secondCard.pairId) {
                // DOĞRU EŞLEŞME
                playSound('correct');
                setScore((prev) => prev + 10);
                setMatchedIds((prev) => new Set(prev).add(firstCard.id).add(secondCard.id));
                setFlippedIndices([]);
                setIsChecking(false);
            } else {
                // YANLIŞ EŞLEŞME: 900ms sonra geri kapat
                setTimeout(() => {
                    playSound('flip');
                    setFlippedIndices([]);
                    setIsChecking(false);
                }, 900);
            }
        }
    }, [flippedIndices, pairs]);

    const handleCardClick = (index: number) => {
        if (isChecking || flippedIndices.includes(index) || matchedIds.has(pairs[index].id)) {
            return;
        }
        playSound('pop');
        setFlippedIndices((prev) => [...prev, index]);
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitHafizaKartlariScoreAction(user.uid, score, gameContext);
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
        setFlippedIndices([]);
        setIsScoreSaved(false);
        setIsChecking(false);
        setShowConfetti(false);
        setElapsedSeconds(0);
        setGameState('loading');
        fetchGameData();
    };

    if (gameState === 'loading') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-14 w-14 animate-spin text-rose-500" />
                <span className="text-slate-400 font-medium animate-pulse">Kartlar Dağıtılıyor...</span>
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                <div className="text-center space-y-5 max-w-md bg-slate-900/90 p-8 rounded-3xl border border-white/10 shadow-2xl">
                    <div className="bg-rose-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-rose-500">
                        <Brain className="h-10 w-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white mb-2">Hata Oluştu</h3>
                        <p className="text-slate-400 text-sm">{error}</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button onClick={handleRestart} variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">
                            <RotateCcw className="mr-2 h-4 w-4" /> Tekrar Dene
                        </Button>
                        <Button asChild className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold">
                            <Link href={backUrl}>Geri Dön</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <WordwallShell
            title="Hafıza Kartları"
            subtitle={topicName}
            currentQuestionIndex={matchedIds.size / 2}
            totalQuestions={pairs.length / 2}
            score={score}
            timeLeft={elapsedSeconds}
            backUrl={backUrl}
            isFinished={gameState === 'finished'}
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
                        onSave={user ? handleSaveAndExit : undefined}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={handleRestart}
                        backUrl={backUrl}
                        isSuccess={matchedIds.size === pairs.length}
                    />
                </div>
            ) : (
                <MemoryCardsBoard
                    pairs={pairs}
                    flippedIndices={flippedIndices}
                    matchedIds={matchedIds}
                    onCardClick={handleCardClick}
                />
            )}
        </WordwallShell>
    );
}

export default function Page() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-14 w-14 animate-spin text-rose-500" />
            </div>
        }>
            <MemoryGame />
        </Suspense>
    );
}