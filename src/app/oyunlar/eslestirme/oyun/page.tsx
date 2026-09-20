'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getEslestirmeAction, submitEslestirmeScoreAction, type MatchingPair } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, XOctagon, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import Confetti from 'react-dom-confetti';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
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

function MatchingGameBoard({
    pairs,
    selected,
    matchedIds,
    incorrectSelection,
    onCardClick,
}: {
    pairs: MatchingPair[];
    selected: MatchingPair | null;
    matchedIds: Set<string>;
    incorrectSelection: string | null;
    onCardClick: (card: MatchingPair) => void;
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
            {/* EŞLEŞTİRME KARTLARI KUTUSU (TAM EKRAN - SIFIR KAYDIRMA) */}
            <div className={cn(
                "w-full h-full min-h-0 min-w-0 rounded-2xl sm:rounded-3xl p-2 sm:p-3 md:p-4 border-2 backdrop-blur-xl shadow-2xl transition-all flex flex-col justify-between overflow-hidden",
                theme.cardBg,
                theme.cardBorder,
                theme.cardShadow
            )}>
                {/* Üst Bilgi Barı (Kompakt) */}
                <div className={cn("flex-shrink-0 flex items-center justify-between pb-1.5 sm:pb-2.5 mb-1.5 sm:mb-2 border-b text-xs sm:text-sm md:text-base font-black", theme.cardDivider)}>
                    <span className={cn("flex items-center gap-1.5 sm:gap-2", theme.accentText)}>
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
                        <span className="truncate">Kavramları ve Tanımları Eşleştir</span>
                    </span>
                    <span className={cn("px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl border text-[11px] sm:text-xs md:text-sm font-mono flex-shrink-0", theme.badgeCounter)}>
                        {matchedIds.size / 2} / {pairs.length / 2} Çift Eşleşti
                    </span>
                </div>

                {/* DİNAMİK EKRANI DOLDURAN IZGARA */}
                <div style={gridInlineStyle}>
                    {pairs.map((card) => {
                        const isSelected = selected?.id === card.id;
                        const isMatched = matchedIds.has(card.id);
                        const isIncorrect = incorrectSelection === card.id || (isSelected && !!incorrectSelection);
                        const textLength = card.content.length;

                        // Çifte ait özel renk ve numara bilgisi
                        const pairIdx = pairIndexMap.get(card.pairId) ?? 0;
                        const pairNumber = pairIdx + 1;
                        const palette = PAIR_PALETTES[pairIdx % PAIR_PALETTES.length];

                        // Akıllı Tahtada Uzaktan Net Okunan Dev Font (Clamp ile dinamik ölçekleme)
                        const fontSizeStyle = textLength > 60
                            ? 'clamp(11px, 1.1vw, 18px)'
                            : textLength > 30
                                ? 'clamp(13px, 1.4vw, 24px)'
                                : 'clamp(15px, 2vw, 34px)';

                        return (
                            <button
                                key={card.id}
                                type="button"
                                disabled={isMatched}
                                onClick={() => {
                                    if (!isMatched) {
                                        if (soundEnabled && !selected) playSound('pop');
                                        onCardClick(card);
                                    }
                                }}
                                className={cn(
                                    "relative w-full h-full min-h-0 min-w-0 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl transition-all duration-200 select-none cursor-pointer text-center overflow-hidden",
                                    "border-2 border-b-[5px] sm:border-b-[7px] active:translate-y-1 active:border-b-2 shadow-lg",
                                    isMatched
                                        ? cn(
                                            palette.bg,
                                            palette.border,
                                            palette.borderBottom,
                                            palette.text,
                                            palette.glow,
                                            "cursor-default border-b-[4px] sm:border-b-[6px] scale-[0.98] ring-1 ring-white/20"
                                        )
                                        : isIncorrect
                                            ? "bg-rose-950 border-rose-500 text-rose-200 animate-shake shadow-[0_0_30px_rgba(244,63,94,0.7)] z-30"
                                            : isSelected
                                                ? "bg-indigo-600 border-indigo-300 text-white scale-[1.03] shadow-[0_0_30px_rgba(99,102,241,0.7)] ring-4 ring-indigo-400/50 z-20"
                                                : cn(theme.buttonIdle, "hover:-translate-y-0.5 hover:shadow-xl hover:brightness-105")
                                )}
                            >
                                {/* Eşleşen kartlarda Kavram / Tanım Etiketi ve Çift Numarası */}
                                {isMatched && (
                                    <>
                                        <span className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-black/60 text-white/90 border border-white/15 backdrop-blur-sm z-10 pointer-events-none">
                                            {card.type === 'term' ? 'Kavram' : 'Tanım'}
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
                                        "z-10 font-black tracking-tight break-words max-w-full text-center overflow-hidden line-clamp-3 sm:line-clamp-4",
                                        theme.isDark && "drop-shadow-md",
                                        isMatched && "pt-3 sm:pt-4"
                                    )}
                                >
                                    {card.content}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function MatchingGame() {
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

    const [selected, setSelected] = useState<MatchingPair | null>(null);
    const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
    const [incorrectSelection, setIncorrectSelection] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const topicName = searchParams.get('topicName') || 'Eşleştirme';
    const isMission = mode === 'mission';
    const gameContext = `Eşleştirme - ${searchParams.get('courseName') || 'Ders'} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: isMission ? '/student/gorevler' : '/oyunlar/eslestirme' });

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getEslestirmeAction(params);

        if (result.error || !result.pairs || result.pairs.length === 0) {
            setError(result.error || "Bu konu için henüz eşleştirilebilir kavram veya tanım verisi eklenmemiş.");
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
            const timer = setTimeout(() => setGameState('finished'), 900);
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
                setScore((prev) => prev + 10);
                setMatchedIds((prev) => new Set(prev).add(selected.id).add(card.id));
                setSelected(null);
            } else {
                playSound('incorrect');
                setIncorrectSelection(card.id);
                setTimeout(() => {
                    setIncorrectSelection(null);
                    setSelected(null);
                }, 750);
            }
        }
    };

    const isAllMatched = pairs.length > 0 && matchedIds.size === pairs.length;

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(isMission ? '/student/gorevler' : backUrl);
            return;
        }
        setIsSaving(true);
        try {
            if (isMission && topicId) {
                const batch = writeBatch(db);
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: score,
                    context: topicId,
                    gameType: 'eslestirme',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllMatched,
                });
                if (score > 0) {
                    const userRef = doc(db, 'users', user.uid);
                    batch.update(userRef, { score: increment(score) });
                }
                await batch.commit();
                if (isAllMatched) {
                    toast({ title: "Görev Başarılı!", description: "Tebrikler, tüm eşleşmeleri tamamladın.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi", description: "Ancak görev tamamlanmadı.", className: "bg-yellow-600 text-white" });
                }
            } else {
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
        setScore(0);
        setMatchedIds(new Set());
        setSelected(null);
        setIncorrectSelection(null);
        setIsScoreSaved(false);
        setShowConfetti(false);
        setElapsedSeconds(0);
        setGameState('loading');
        fetchGameData();
    };

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-center">
                <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl space-y-5 backdrop-blur-xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                        <XOctagon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-white">Eşleştirme Verisi Bulunamadı</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        {error}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button onClick={handleRestart} variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">
                            <RotateCcw className="mr-2 h-4 w-4" /> Tekrar Dene
                        </Button>
                        <Button onClick={() => router.push(isMission ? '/student/gorevler' : backUrl)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                            Geri Dön
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <WordwallShell
            title="Eşleştirme"
            subtitle={topicName}
            currentQuestionIndex={matchedIds.size / 2}
            totalQuestions={pairs.length / 2}
            score={score}
            timeLeft={elapsedSeconds}
            backUrl={isMission ? '/student/gorevler' : backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-1.5 sm:p-2.5 md:p-3"
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 120, spread: 90 }} />
            </div>

            {gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen
                        score={score}
                        onSave={user ? handleSaveAndExit : undefined}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={handleRestart}
                        backUrl={isMission ? '/student/gorevler' : backUrl}
                        isSuccess={isAllMatched}
                        isMission={isMission}
                        customMessage={
                            isMission
                                ? (isAllMatched
                                    ? "Tebrikler! Tüm eşleştirmeleri doğru yaparak görevi başarıyla tamamladın."
                                    : "Maalesef tüm kartları eşleştiremedin. Görevi geçmek için tüm eşleştirmeleri tamamlamalısın.")
                                : undefined
                        }
                    />
                </div>
            ) : (
                <MatchingGameBoard
                    pairs={pairs}
                    selected={selected}
                    matchedIds={matchedIds}
                    incorrectSelection={incorrectSelection}
                    onCardClick={handleCardClick}
                />
            )}
        </WordwallShell>
    );
}

export default function MatchingGamePage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
            </div>
        }>
            <MatchingGame />
        </Suspense>
    );
}