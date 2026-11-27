'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
    ADVENTURE_STAGES,
    AdventureStage,
    AdventureItem,
    AdventureMiniRound,
    playAdventureTone
} from '@/lib/elifba-adventure-data';
import {
    Volume2,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Gamepad2,
    Trophy,
    Heart,
    Flame,
    RotateCcw,
    Lightbulb,
    FastForward,
    BookOpen,
    ArrowRight,
    Lock,
    Unlock,
    Star,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// ORTAK YARDIMCI BİLEŞENLER
// ─────────────────────────────────────────────────────────────────────────────

export function StageItemMedia({
    src,
    alt,
    fallbackText,
    className,
    textClassName
}: {
    src?: string;
    alt: string;
    fallbackText?: string;
    className?: string;
    textClassName?: string;
}) {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [src]);

    if (!src || hasError) {
        return (
            <div
                className={cn(
                    'font-bold font-serif select-none flex items-center justify-center text-sky-900',
                    textClassName
                )}
                dir="rtl"
            >
                {fallbackText || alt}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className={cn('select-none pointer-events-none', className)}
        />
    );
}

function PhaseStepper({ currentPhase }: { currentPhase: 'learn' | 'reinforce' | 'exam' }) {
    const steps = [
        { id: 'learn', label: '1. Keşfet & Tekrar', icon: '📖' },
        { id: 'reinforce', label: '2. Pekiştirme', icon: '🎮' },
        { id: 'exam', label: '3. Ustalık Sınavı', icon: '🏆' }
    ] as const;

    const currentIdx = steps.findIndex(s => s.id === currentPhase);

    return (
        <div className="w-full max-w-2xl mx-auto mb-4">
            <div className="grid grid-cols-3 gap-2 bg-white/85 backdrop-blur-sm p-1.5 rounded-2xl border-2 border-slate-200/80 shadow-sm">
                {steps.map((step, idx) => {
                    const isActive = step.id === currentPhase;
                    const isPast = idx < currentIdx;

                    return (
                        <div
                            key={step.id}
                            className={cn(
                                'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs sm:text-sm font-black transition-all',
                                isActive
                                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md scale-[1.02]'
                                    : isPast
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'text-slate-400'
                            )}
                        >
                            <span>{isPast ? '✅' : step.icon}</span>
                            <span className="truncate">{step.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MiniRoundBar({
    miniRounds,
    activeRoundIndex,
    completedRounds,
    teacherFreeMode,
    onSelectRound
}: {
    miniRounds: AdventureMiniRound[];
    activeRoundIndex: number;
    completedRounds: number[];
    teacherFreeMode: boolean;
    onSelectRound?: (roundIdx: number) => void;
}) {
    if (miniRounds.length <= 1) return null;

    const maxUnlockedRound = Math.min(
        miniRounds.length,
        Math.max(1, (completedRounds.length > 0 ? Math.max(...completedRounds) : 0) + 1)
    );

    return (
        <div className="w-full max-w-2xl mx-auto mb-4 bg-white/85 backdrop-blur-sm rounded-2xl border-2 border-sky-200/80 p-2.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-black text-slate-600 mb-2 px-1">
                <span>🎯 Mini Öğrenme Turları (5&apos;li Adımlar)</span>
                <span className="text-emerald-700">
                    {completedRounds.length} / {miniRounds.length} Tur Bitti
                </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {miniRounds.map(mr => {
                    const isDone = completedRounds.includes(mr.roundIndex);
                    const isCurrent = mr.roundIndex === activeRoundIndex;
                    const isUnlocked = teacherFreeMode || isDone || mr.roundIndex <= maxUnlockedRound;

                    return (
                        <button
                            key={mr.roundIndex}
                            type="button"
                            disabled={!isUnlocked || !onSelectRound}
                            onClick={() => onSelectRound?.(mr.roundIndex)}
                            title={mr.title}
                            className={cn(
                                'px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all shrink-0 flex items-center gap-1',
                                isCurrent
                                    ? 'bg-sky-600 text-white border-sky-700 shadow-sm scale-[1.03] cursor-pointer'
                                    : isDone
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 cursor-pointer'
                                    : isUnlocked
                                    ? 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 opacity-70 cursor-not-allowed'
                            )}
                        >
                            <span>{isDone ? '✅' : isUnlocked ? '📘' : '🔒'}</span>
                            <span>Tur {mr.roundIndex}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Çeldirici havuzu oluşturucu (aynı aşamadan veya komşu aşamalardan benzersiz seçenekler)
function buildDistractorPool(
    target: AdventureItem,
    stage: AdventureStage,
    count: number = 3
): AdventureItem[] {
    let pool = stage.items.filter(
        it => it.id !== target.id && it.imgSrc !== target.imgSrc && it.name !== target.name
    );

    if (pool.length < count) {
        const sameIsland = ADVENTURE_STAGES.filter(s => s.islandId === stage.islandId);
        for (const st of sameIsland) {
            for (const it of st.items) {
                if (
                    it.id !== target.id &&
                    it.imgSrc !== target.imgSrc &&
                    !pool.some(p => p.id === it.id || p.imgSrc === it.imgSrc)
                ) {
                    pool.push(it);
                }
            }
        }
    }

    if (pool.length < count) {
        for (const st of ADVENTURE_STAGES) {
            for (const it of st.items) {
                if (
                    it.id !== target.id &&
                    it.imgSrc !== target.imgSrc &&
                    !pool.some(p => p.id === it.id || p.imgSrc === it.imgSrc)
                ) {
                    pool.push(it);
                }
            }
        }
    }

    return pool.sort(() => Math.random() - 0.5).slice(0, count);
}

// Önceki aşamalardan aralıklı tekrar (Spaced Repetition) öğeleri çek
function getReviewItems(stage: AdventureStage, maxCount: number = 2): AdventureItem[] {
    if (!stage.reviewPoolIds || stage.reviewPoolIds.length === 0) return [];
    const pool: AdventureItem[] = [];
    for (const prevId of stage.reviewPoolIds) {
        const prevStage = ADVENTURE_STAGES.find(s => s.id === prevId);
        if (prevStage) {
            pool.push(...prevStage.items);
        }
    }
    return pool.sort(() => Math.random() - 0.5).slice(0, maxCount);
}

// ─────────────────────────────────────────────────────────────────────────────
// FAZ 1: KEŞFET & BOL TEKRAR (MİNİ TUR DESTEKLİ)
// ─────────────────────────────────────────────────────────────────────────────

export function LearnPhaseView({
    stage,
    roundIndex = 1,
    completedRounds = [],
    soundEnabled,
    teacherFreeMode,
    playAudio,
    onAddXp,
    onBackToMap,
    onSelectRound,
    onCompleteLearn,
    onSkipToExam,
    onMascotMessage
}: {
    stage: AdventureStage;
    roundIndex?: number;
    completedRounds?: number[];
    soundEnabled: boolean;
    teacherFreeMode: boolean;
    playAudio: (url: string, rate?: number) => void;
    onAddXp: (amount: number) => void;
    onBackToMap: () => void;
    onSelectRound?: (r: number) => void;
    onCompleteLearn: (roundIdx: number) => void;
    onSkipToExam?: () => void;
    onMascotMessage: (msg: string) => void;
}) {
    const activeRound =
        stage.miniRounds.find(mr => mr.roundIndex === roundIndex) ||
        stage.miniRounds[0] || {
            roundIndex: 1,
            title: stage.shortTitle,
            items: stage.items
        };

    const items = activeRound.items;
    const [cardIdx, setCardIdx] = useState(0);
    const [repeats, setRepeats] = useState<Record<string, number>>({});
    const [slowRate, setSlowRate] = useState(false);

    const currentItem = items[cardIdx] || items[0];
    const reqRepeats = stage.requiredRepeats;
    const currentCount = currentItem ? repeats[currentItem.id] || 0 : 0;

    // Aşama veya mini tur değiştiğinde sıfırla
    useEffect(() => {
        setCardIdx(0);
        setRepeats({});
    }, [stage.id, activeRound.roundIndex]);

    // Kart açıldığında sesi otomatik çal
    useEffect(() => {
        if (currentItem) {
            const timer = setTimeout(() => {
                playAudio(currentItem.audSrc, slowRate ? 0.75 : 1.0);
            }, 220);
            return () => clearTimeout(timer);
        }
    }, [cardIdx, stage.id, activeRound.roundIndex, currentItem, playAudio, slowRate]);

    const completedCount = useMemo(() => {
        return items.filter(it => (repeats[it.id] || 0) >= reqRepeats).length;
    }, [items, repeats, reqRepeats]);

    const allCompleted = items.length > 0 && completedCount === items.length;
    const allRoundsDone =
        stage.miniRounds.length <= 1 || completedRounds.length >= stage.miniRounds.length;

    const handleRepeatTap = () => {
        if (!currentItem) return;
        if (soundEnabled) playAdventureTone('pop');
        playAudio(currentItem.audSrc, slowRate ? 0.75 : 1.0);

        const nextCount = currentCount + 1;
        setRepeats(prev => ({ ...prev, [currentItem.id]: nextCount }));

        if (nextCount <= reqRepeats) {
            onAddXp(5);
        }

        if (nextCount === reqRepeats) {
            if (soundEnabled) playAdventureTone('correct', 1);
            onMascotMessage(`Harika! "${currentItem.name}" için ${reqRepeats} tekrarı tamamladın! 🌟`);

            if (cardIdx < items.length - 1) {
                setTimeout(() => {
                    setCardIdx(prev => Math.min(items.length - 1, prev + 1));
                }, 600);
            } else if (completedCount + 1 === items.length) {
                confetti({ particleCount: 55, spread: 70, origin: { y: 0.65 } });
                onMascotMessage(
                    stage.miniRounds.length > 1
                        ? `Süper! ${activeRound.roundIndex}. turun kartlarını tamamladın. Şimdi mini pekiştirme oyununa geç! 🎮`
                        : 'Süper! Tüm kartları bol tekrar ile öğrendin. Şimdi Pekiştirme Oyununa geçebilirsin! 🎮'
                );
            }
        }
    };

    if (!currentItem) return null;

    return (
        <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 pb-10">
            <PhaseStepper currentPhase="learn" />

            <MiniRoundBar
                miniRounds={stage.miniRounds}
                activeRoundIndex={activeRound.roundIndex}
                completedRounds={completedRounds}
                teacherFreeMode={teacherFreeMode}
                onSelectRound={onSelectRound}
            />

            <div className="bg-white rounded-[2rem] border-4 border-sky-200 shadow-[0_12px_35px_rgba(2,132,199,0.12)] p-5 sm:p-8 relative overflow-hidden">
                {/* Üst Bilgi Satırı */}
                <div className="flex items-center justify-between gap-2 mb-5">
                    <button
                        type="button"
                        onClick={onBackToMap}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border-b-3 border-slate-300 active:border-b-0 active:translate-y-[2px] transition-all cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Harita</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-xs font-black">
                            Kart {cardIdx + 1} / {items.length}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black">
                            ✅ {completedCount}/{items.length}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            const nextSlow = !slowRate;
                            setSlowRate(nextSlow);
                            playAudio(currentItem.audSrc, nextSlow ? 0.75 : 1.0);
                        }}
                        className={cn(
                            'inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-black border-2 transition-all cursor-pointer',
                            slowRate
                                ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        )}
                        title="Harfin çıkışını tane tane dinlemek için yavaşlat"
                    >
                        <span>🐢</span>
                        <span>{slowRate ? '0.75x' : 'Normal'}</span>
                    </button>
                </div>

                {/* Başlık & Açıklama */}
                <div className="text-center mb-5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-black uppercase tracking-wider mb-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>
                            Adım {stage.id}: {stage.shortTitle}
                            {stage.miniRounds.length > 1
                                ? ` • ${activeRound.roundIndex}. Tur (${activeRound.title})`
                                : ''}
                        </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                        Dinle, Bak ve {reqRepeats} Kez Sesli Tekrar Et!
                    </h2>
                </div>

                {/* IŞILTILI KART ALANI (SAF BEYAZ ZEMİN - %100 NET KONTRAST) */}
                <div className="bg-gradient-to-b from-sky-50/70 via-white to-white rounded-3xl border-3 border-sky-200 p-5 sm:p-7 shadow-inner flex flex-col items-center relative">
                    {/* Tekrar İlerleme Küreleri */}
                    <div className="flex items-center gap-2 mb-4 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide mr-1">
                            Tekrar:
                        </span>
                        {Array.from({ length: reqRepeats }).map((_, i) => {
                            const filled = i < currentCount;
                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        'w-4 h-4 rounded-full transition-all duration-300 flex items-center justify-center text-[10px]',
                                        filled
                                            ? 'bg-gradient-to-br from-emerald-400 to-green-600 text-white scale-110 shadow-sm shadow-emerald-400/50'
                                            : 'bg-slate-200 border border-slate-300'
                                    )}
                                >
                                    {filled ? '✓' : ''}
                                </div>
                            );
                        })}
                        {currentCount >= reqRepeats && (
                            <span className="text-xs font-black text-emerald-600 ml-1">Tamam!</span>
                        )}
                    </div>

                    {/* Saf Beyaz Görsel Kutusu */}
                    <button
                        type="button"
                        onClick={() => playAudio(currentItem.audSrc, slowRate ? 0.75 : 1.0)}
                        className="w-52 h-40 sm:w-64 sm:h-44 bg-white rounded-3xl border-3 border-sky-100 shadow-md flex items-center justify-center p-4 hover:scale-[1.03] active:scale-95 transition-transform cursor-pointer group relative"
                        title="Dinlemek için karta dokun"
                    >
                        <StageItemMedia
                            src={currentItem.imgSrc}
                            alt={currentItem.name}
                            fallbackText={currentItem.arabic || currentItem.name}
                            className="max-h-full max-w-full object-contain"
                            textClassName="text-5xl sm:text-6xl"
                        />
                        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                            <Volume2 className="w-4 h-4" />
                        </div>
                    </button>

                    {/* Okunuş Adı */}
                    <div className="mt-4 text-center">
                        <div className="text-xl sm:text-2xl font-black text-sky-900 tracking-tight">
                            {currentItem.name}
                        </div>
                    </div>

                    {/* Öğrenme / Mahreç İpucu */}
                    {currentItem.tip && (
                        <div className="mt-3 w-full max-w-md bg-amber-50/90 border-2 border-amber-200 rounded-2xl px-4 py-2.5 flex items-start gap-2.5 text-left">
                            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs sm:text-sm font-bold text-amber-950 leading-snug">
                                {currentItem.tip}
                            </p>
                        </div>
                    )}

                    {/* Ses & Tekrar Butonları */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-5 w-full">
                        <button
                            type="button"
                            onClick={() => playAudio(currentItem.audSrc, slowRate ? 0.75 : 1.0)}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-sm border-b-4 border-sky-700 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-md"
                        >
                            <Volume2 className="w-5 h-5" />
                            <span>Sesi Dinle</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleRepeatTap}
                            className={cn(
                                'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-md',
                                currentCount >= reqRepeats
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-700'
                                    : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 border-orange-700 animate-pulse'
                            )}
                        >
                            <span>🗣️ Dinledim &amp; Tekrar Ettim</span>
                            <span className="bg-black/15 px-2 py-0.5 rounded-full text-xs font-black">
                                {currentCount}/{reqRepeats}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Kart Geçiş & Küçük Önizleme Çubuğu */}
                <div className="flex items-center justify-between gap-2 mt-5">
                    <button
                        type="button"
                        disabled={cardIdx === 0}
                        onClick={() => {
                            if (soundEnabled) playAdventureTone('click');
                            setCardIdx(prev => Math.max(0, prev - 1));
                        }}
                        className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 border-b-3 border-slate-300 active:border-b-0 transition-all cursor-pointer"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 max-w-full">
                        {items.map((it, idx) => {
                            const isDone = (repeats[it.id] || 0) >= reqRepeats;
                            const isActive = idx === cardIdx;
                            return (
                                <button
                                    key={it.id}
                                    type="button"
                                    onClick={() => {
                                        if (soundEnabled) playAdventureTone('click');
                                        setCardIdx(idx);
                                    }}
                                    className={cn(
                                        'min-w-[38px] h-9 px-2 rounded-xl font-black text-xs border-2 transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0',
                                        isActive
                                            ? 'bg-sky-600 text-white border-sky-700 scale-105 shadow-sm'
                                            : isDone
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    )}
                                >
                                    <span>{idx + 1}</span>
                                    {isDone && <span className="text-[10px]">✓</span>}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        disabled={cardIdx >= items.length - 1}
                        onClick={() => {
                            if (soundEnabled) playAdventureTone('click');
                            setCardIdx(prev => Math.min(items.length - 1, prev + 1));
                        }}
                        className="p-2.5 rounded-2xl bg-sky-100 hover:bg-sky-200 disabled:opacity-40 text-sky-800 border-b-3 border-sky-300 active:border-b-0 transition-all cursor-pointer"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Faz 2 Geçiş Butonu */}
                <div className="mt-6 pt-5 border-t-2 border-slate-100 space-y-2.5">
                    <button
                        type="button"
                        disabled={!allCompleted && !teacherFreeMode}
                        onClick={() => {
                            if (soundEnabled) playAdventureTone('unlock');
                            onCompleteLearn(activeRound.roundIndex);
                        }}
                        className={cn(
                            'w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 transition-all',
                            allCompleted || teacherFreeMode
                                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 cursor-pointer shadow-lg shadow-emerald-200'
                                : 'bg-slate-200 text-slate-500 border-b-4 border-slate-300 cursor-not-allowed'
                        )}
                    >
                        {allCompleted ? (
                            <>
                                <Gamepad2 className="w-6 h-6" />
                                <span>
                                    🚀 {stage.miniRounds.length > 1 ? `Tur ${activeRound.roundIndex}` : 'Harika!'} Pekiştirme Oyununa Geç
                                </span>
                            </>
                        ) : teacherFreeMode ? (
                            <>
                                <FastForward className="w-5 h-5" />
                                <span>Öğretmen Modu: Tur {activeRound.roundIndex} Pekiştirme Oyununa Geç</span>
                            </>
                        ) : (
                            <>
                                <Lock className="w-5 h-5" />
                                <span>
                                    Kilidi Açmak İçin Kalan {items.length - completedCount} Kartı Tekrar Et
                                </span>
                            </>
                        )}
                    </button>

                    {(allRoundsDone || teacherFreeMode) && onSkipToExam && (
                        <button
                            type="button"
                            onClick={() => {
                                if (soundEnabled) playAdventureTone('click');
                                onSkipToExam();
                            }}
                            className="w-full py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border-2 border-amber-300 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                            <Trophy className="w-4 h-4 text-amber-600" />
                            <span>Doğrudan Adım {stage.id} Ustalık Sınavına Geç</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAZ 2: PEKİŞTİRME MİNİ OYUNLARI (MİNİ TUR BAZLI EŞLEŞTİRME + SESLİ AV)
// ─────────────────────────────────────────────────────────────────────────────

interface PracticeDrillQuestion {
    target: AdventureItem;
    options: AdventureItem[];
    isReview: boolean;
}

export function ReinforcePhaseView({
    stage,
    roundIndex = 1,
    completedRounds = [],
    teacherFreeMode,
    soundEnabled,
    playAudio,
    onAddXp,
    onBackToMap,
    onBackToLearn,
    onSelectRound,
    onCompleteRound,
    onNextRound,
    onProceedToExam,
    onMascotMessage
}: {
    stage: AdventureStage;
    roundIndex?: number;
    completedRounds?: number[];
    teacherFreeMode: boolean;
    soundEnabled: boolean;
    playAudio: (url: string, rate?: number) => void;
    onAddXp: (amount: number) => void;
    onBackToMap: () => void;
    onBackToLearn: () => void;
    onSelectRound?: (r: number) => void;
    onCompleteRound: (roundIdx: number) => void;
    onNextRound: (nextRoundIdx: number) => void;
    onProceedToExam: () => void;
    onMascotMessage: (msg: string) => void;
}) {
    const activeRound =
        stage.miniRounds.find(mr => mr.roundIndex === roundIndex) ||
        stage.miniRounds[0] || {
            roundIndex: 1,
            title: stage.shortTitle,
            items: stage.items
        };

    const roundItems = activeRound.items;
    const hasMatchRound =
        stage.hasExactReading && stage.curriculumId !== 'dualar' && roundItems.length >= 3;

    const [subRound, setSubRound] = useState<'match' | 'audio' | 'done'>(
        hasMatchRound ? 'match' : 'audio'
    );

    // Tur 1: İkili Kart Eşleştirme State
    const matchItems = useMemo(() => {
        return [...roundItems].sort(() => Math.random() - 0.5).slice(0, 4);
    }, [stage.id, activeRound.roundIndex, roundItems]);

    const shuffledNames = useMemo(() => {
        return [...matchItems].sort(() => Math.random() - 0.5);
    }, [matchItems]);

    const [selectedImgId, setSelectedImgId] = useState<string | null>(null);
    const [selectedNameId, setSelectedNameId] = useState<string | null>(null);
    const [matchedIds, setMatchedIds] = useState<string[]>([]);
    const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
    const [matchCombo, setMatchCombo] = useState(0);

    // Tur 2: Güvenli Sesli Tanıma Oyunu State
    const drillQuestions: PracticeDrillQuestion[] = useMemo(() => {
        const list: PracticeDrillQuestion[] = [];
        const baseShuffled = [...roundItems].sort(() => Math.random() - 0.5);
        baseShuffled.forEach(item => {
            const distractors = buildDistractorPool(item, stage, 3);
            const options = [item, ...distractors].sort(() => Math.random() - 0.5);
            list.push({ target: item, options, isReview: false });
        });

        // Önceki mini turlardan veya önceki adımlardan 1 hatırlama sorusu
        if (activeRound.roundIndex > 1) {
            const prevRoundItems = stage.miniRounds
                .filter(mr => mr.roundIndex < activeRound.roundIndex)
                .flatMap(mr => mr.items);
            if (prevRoundItems.length > 0) {
                const rev = prevRoundItems[Math.floor(Math.random() * prevRoundItems.length)];
                const distractors = buildDistractorPool(rev, stage, 3);
                const options = [rev, ...distractors].sort(() => Math.random() - 0.5);
                list.push({ target: rev, options, isReview: true });
            }
        } else {
            const reviews = getReviewItems(stage, 1);
            reviews.forEach(rev => {
                const distractors = buildDistractorPool(rev, stage, 3);
                const options = [rev, ...distractors].sort(() => Math.random() - 0.5);
                list.push({ target: rev, options, isReview: true });
            });
        }

        return list;
    }, [stage, activeRound.roundIndex, roundItems]);

    const [drillIdx, setDrillIdx] = useState(0);
    const [drillWrongIds, setDrillWrongIds] = useState<string[]>([]);
    const [drillSuccessId, setDrillSuccessId] = useState<string | null>(null);
    const [drillHint, setDrillHint] = useState<string | null>(null);
    const [drillCombo, setDrillCombo] = useState(0);

    useEffect(() => {
        setSubRound(hasMatchRound ? 'match' : 'audio');
        setMatchedIds([]);
        setSelectedImgId(null);
        setSelectedNameId(null);
        setDrillIdx(0);
        setDrillWrongIds([]);
        setDrillSuccessId(null);
        setDrillHint(null);
    }, [stage.id, activeRound.roundIndex, hasMatchRound]);

    useEffect(() => {
        if (subRound === 'audio' && drillQuestions[drillIdx]) {
            const t = setTimeout(() => {
                playAudio(drillQuestions[drillIdx].target.audSrc);
            }, 250);
            return () => clearTimeout(t);
        }
    }, [subRound, drillIdx, drillQuestions, playAudio]);

    // Eşleştirme kontrolü
    useEffect(() => {
        if (!selectedImgId || !selectedNameId) return;

        if (selectedImgId === selectedNameId) {
            const nextCombo = matchCombo + 1;
            setMatchCombo(nextCombo);
            if (soundEnabled) playAdventureTone('correct', nextCombo);
            const matchedItem = matchItems.find(m => m.id === selectedImgId);
            if (matchedItem) playAudio(matchedItem.audSrc);
            onAddXp(10);

            const nextMatched = [...matchedIds, selectedImgId];
            setMatchedIds(nextMatched);
            setSelectedImgId(null);
            setSelectedNameId(null);
            onMascotMessage(`Süper eşleştirme! "${matchedItem?.name}" doğru! 🔥`);

            if (nextMatched.length === matchItems.length) {
                confetti({ particleCount: 45, spread: 60, origin: { y: 0.65 } });
                setTimeout(() => {
                    setSubRound('audio');
                    onMascotMessage('Eşleştirme tamam! Şimdi sesi dinleyip kartı yakala! 🎧');
                }, 800);
            }
        } else {
            setMatchCombo(0);
            if (soundEnabled) playAdventureTone('wrong');
            setWrongPair([selectedImgId, selectedNameId]);
            onMascotMessage('Bu ikisi eşleşmedi, şekle tekrar dikkatle bak bakalım! 🔍');
            setTimeout(() => {
                setWrongPair(null);
                setSelectedImgId(null);
                setSelectedNameId(null);
            }, 600);
        }
    }, [selectedImgId, selectedNameId, matchCombo, matchedIds, matchItems, soundEnabled, playAudio, onAddXp, onMascotMessage]);

    const currentDrill = drillQuestions[drillIdx];

    const updatedCompletedRounds = useMemo(() => {
        return Array.from(new Set([...completedRounds, activeRound.roundIndex]));
    }, [completedRounds, activeRound.roundIndex]);

    const hasMoreRounds = updatedCompletedRounds.length < stage.miniRounds.length;
    const nextUncompletedRound =
        stage.miniRounds.find(mr => !updatedCompletedRounds.includes(mr.roundIndex))?.roundIndex ||
        Math.min(stage.miniRounds.length, activeRound.roundIndex + 1);

    const handleSelectDrillOption = (opt: AdventureItem) => {
        if (!currentDrill || drillSuccessId) return;

        if (opt.id === currentDrill.target.id) {
            const nextCombo = drillCombo + 1;
            setDrillCombo(nextCombo);
            setDrillSuccessId(opt.id);
            setDrillHint(null);
            if (soundEnabled) playAdventureTone('correct', nextCombo);
            confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
            onAddXp(10);
            onMascotMessage(`Harika! "${opt.name}" doğru! ✨`);

            setTimeout(() => {
                setDrillSuccessId(null);
                setDrillWrongIds([]);
                if (drillIdx + 1 < drillQuestions.length) {
                    setDrillIdx(prev => prev + 1);
                } else {
                    if (soundEnabled) playAdventureTone('fanfare');
                    confetti({ particleCount: 85, spread: 80, origin: { y: 0.55 } });
                    onAddXp(20);
                    onCompleteRound(activeRound.roundIndex);
                    setSubRound('done');
                    const willFinishAll = updatedCompletedRounds.length >= stage.miniRounds.length;
                    onMascotMessage(
                        willFinishAll
                            ? 'Tüm mini turlar bitti! Artık Adım Ustalık Sınavına hazırsın! 🏆'
                            : `Harika! ${activeRound.roundIndex}. tur tamamlandı! Sıradaki tura geçebilirsin! 🚀`
                    );
                }
            }, 900);
        } else {
            setDrillCombo(0);
            if (soundEnabled) playAdventureTone('wrong');
            if (!drillWrongIds.includes(opt.id)) {
                setDrillWrongIds(prev => [...prev, opt.id]);
            }
            setDrillHint(`Seçtiğin kart "${opt.name}" idi. Sesi tekrar dinleyip doğrusunu bul!`);
            playAudio(opt.audSrc);
            setTimeout(() => {
                playAudio(currentDrill.target.audSrc);
            }, 900);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 pb-10">
            <PhaseStepper currentPhase="reinforce" />

            <MiniRoundBar
                miniRounds={stage.miniRounds}
                activeRoundIndex={activeRound.roundIndex}
                completedRounds={completedRounds}
                teacherFreeMode={teacherFreeMode}
                onSelectRound={onSelectRound}
            />

            <div className="bg-white rounded-[2rem] border-4 border-emerald-200 shadow-[0_12px_35px_rgba(16,185,129,0.12)] p-5 sm:p-8 relative">
                {/* Üst Bar */}
                <div className="flex items-center justify-between gap-2 mb-5">
                    <button
                        type="button"
                        onClick={onBackToMap}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border-b-3 border-slate-300 active:border-b-0 transition-all cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Harita</span>
                    </button>

                    <div className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black">
                        {subRound === 'match'
                            ? `Tur ${activeRound.roundIndex} • Eşleştirme (${matchedIds.length}/${matchItems.length})`
                            : subRound === 'audio'
                            ? `Tur ${activeRound.roundIndex} • Sesli Av (${drillIdx + 1}/${drillQuestions.length})`
                            : `Tur ${activeRound.roundIndex} Tamamlandı! 🎉`}
                    </div>

                    <button
                        type="button"
                        onClick={onBackToLearn}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-black border border-sky-200 cursor-pointer"
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Kartlara Dön</span>
                    </button>
                </div>

                {/* ── TUR 1: ŞEKİL & SES EŞLEŞTİRME ── */}
                {subRound === 'match' && (
                    <div>
                        <div className="text-center mb-5">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                                🧩 Şekli ve Okunuşunu Eşleştir!
                            </h2>
                            <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">
                                Soldan bir Arapça kart seç, sağdan onun doğru okunuşuna dokun!
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-5">
                            {/* Sol Sütun: Saf Arapça Kartlar */}
                            <div className="space-y-3">
                                <div className="text-center text-xs font-black uppercase tracking-wider text-sky-600">
                                    Arapça Şekli
                                </div>
                                {matchItems.map(item => {
                                    const isMatched = matchedIds.includes(item.id);
                                    const isSelected = selectedImgId === item.id;
                                    const isWrong = wrongPair?.[0] === item.id;

                                    return (
                                        <button
                                            key={item.id}
                                            disabled={isMatched}
                                            onClick={() => {
                                                if (soundEnabled) playAdventureTone('click');
                                                setSelectedImgId(item.id);
                                            }}
                                            className={cn(
                                                'w-full h-20 sm:h-24 rounded-2xl border-3 bg-white flex items-center justify-center p-2 transition-all cursor-pointer shadow-sm',
                                                isMatched
                                                    ? 'opacity-40 bg-emerald-50 border-emerald-300 scale-95 cursor-default'
                                                    : isWrong
                                                    ? 'border-rose-500 bg-rose-50 animate-shake'
                                                    : isSelected
                                                    ? 'border-sky-500 ring-4 ring-sky-200 scale-[1.03] shadow-md'
                                                    : 'border-slate-200 hover:border-sky-300 border-b-4'
                                            )}
                                        >
                                            <StageItemMedia
                                                src={item.imgSrc}
                                                alt={item.name}
                                                fallbackText={item.arabic || item.name}
                                                className="max-h-14 sm:max-h-16 max-w-full object-contain"
                                                textClassName="text-3xl sm:text-4xl"
                                            />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Sağ Sütun: Okunuş Adları */}
                            <div className="space-y-3">
                                <div className="text-center text-xs font-black uppercase tracking-wider text-emerald-600">
                                    Okunuşu
                                </div>
                                {shuffledNames.map(item => {
                                    const isMatched = matchedIds.includes(item.id);
                                    const isSelected = selectedNameId === item.id;
                                    const isWrong = wrongPair?.[1] === item.id;

                                    return (
                                        <button
                                            key={item.id}
                                            disabled={isMatched}
                                            onClick={() => {
                                                if (soundEnabled) playAdventureTone('click');
                                                setSelectedNameId(item.id);
                                            }}
                                            className={cn(
                                                'w-full h-20 sm:h-24 rounded-2xl border-3 flex items-center justify-center px-3 font-black text-sm sm:text-base transition-all cursor-pointer shadow-sm',
                                                isMatched
                                                    ? 'opacity-40 bg-emerald-50 border-emerald-300 text-emerald-700 scale-95 cursor-default'
                                                    : isWrong
                                                    ? 'border-rose-500 bg-rose-50 text-rose-700 animate-shake'
                                                    : isSelected
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-4 ring-emerald-200 scale-[1.03] shadow-md'
                                                    : 'bg-slate-50 border-slate-200 hover:border-emerald-300 text-slate-800 border-b-4'
                                            )}
                                        >
                                            <span className="line-clamp-2 text-center">{item.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TUR 2: GÜVENLİ SESLİ TANIMA OYUNU (KOPYASIZ KARTLAR) ── */}
                {subRound === 'audio' && currentDrill && (
                    <div className="text-center">
                        {currentDrill.isReview && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black mb-2">
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Hatırlama Tekrarı!</span>
                            </div>
                        )}

                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-3">
                            🎧 Sesi Dinle ve Doğru Kartı Yakala!
                        </h2>

                        <button
                            type="button"
                            onClick={() => playAudio(currentDrill.target.audSrc)}
                            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-base px-8 py-3.5 rounded-2xl border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-lg"
                        >
                            <Volume2 className="w-6 h-6" />
                            <span>Sesi Tekrar Dinle</span>
                        </button>

                        {drillHint && (
                            <div className="mt-4 bg-amber-50 border-2 border-amber-300 text-amber-950 rounded-2xl px-4 py-2 text-xs sm:text-sm font-extrabold animate-in fade-in">
                                💡 {drillHint}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 mt-6">
                            {currentDrill.options.map(opt => {
                                const isSuccess = drillSuccessId === opt.id;
                                const isWrong = drillWrongIds.includes(opt.id);

                                return (
                                    <button
                                        key={opt.id}
                                        disabled={Boolean(drillSuccessId)}
                                        onClick={() => handleSelectDrillOption(opt)}
                                        className={cn(
                                            'bg-white rounded-3xl border-3 p-4 sm:p-5 min-h-[135px] sm:min-h-[155px] flex flex-col items-center justify-center transition-all cursor-pointer relative shadow-sm',
                                            isSuccess
                                                ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-200 scale-[1.03]'
                                                : isWrong
                                                ? 'border-rose-400 bg-rose-50 opacity-65 animate-shake'
                                                : 'border-slate-200 hover:border-sky-400 border-b-[5px] active:border-b-2 active:translate-y-[3px]'
                                        )}
                                    >
                                        <div className="h-20 sm:h-24 flex items-center justify-center">
                                            <StageItemMedia
                                                src={opt.imgSrc}
                                                alt={opt.name}
                                                fallbackText={opt.arabic || opt.name}
                                                className="max-h-full max-w-[135px] object-contain"
                                                textClassName="text-4xl sm:text-5xl"
                                            />
                                        </div>

                                        {(isSuccess || isWrong) && (
                                            <div
                                                className={cn(
                                                    'mt-2 text-xs font-black px-2.5 py-0.5 rounded-full',
                                                    isSuccess ? 'bg-emerald-600 text-white' : 'bg-rose-200 text-rose-900'
                                                )}
                                            >
                                                {opt.name}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── TUR BİTTİ -> SONRAKİ MİNİ TUR VEYA USTALIK SINAVI ── */}
                {subRound === 'done' && (
                    <div className="text-center py-6 space-y-5">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center text-4xl shadow-lg shadow-emerald-200 animate-bounce">
                            🎯
                        </div>

                        {hasMoreRounds ? (
                            <>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-emerald-700">
                                        {activeRound.roundIndex}. Tur Başarıyla Tamamlandı!
                                    </h2>
                                    <p className="text-sm sm:text-base font-bold text-slate-600 mt-1 max-w-md mx-auto">
                                        Harikasın! Adım {stage.id} ({stage.shortTitle}) içinde{' '}
                                        <strong>
                                            {updatedCompletedRounds.length}/{stage.miniRounds.length}
                                        </strong>{' '}
                                        mini turu bitirdin. Sıradaki tura geçelim!
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 max-w-md mx-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (soundEnabled) playAdventureTone('unlock');
                                            onNextRound(nextUncompletedRound);
                                        }}
                                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-base sm:text-lg border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2"
                                    >
                                        <span>➡️ {nextUncompletedRound}. Tura Geç (Yeni Kartlar)</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </button>

                                    {teacherFreeMode && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (soundEnabled) playAdventureTone('click');
                                                onProceedToExam();
                                            }}
                                            className="w-full py-3 px-5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-black text-xs border-2 border-amber-300 cursor-pointer"
                                        >
                                            🏆 Öğretmen Modu: Ustalık Sınavına Geç
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-emerald-700">
                                        Adım {stage.id} Pekiştirmesi Tamamlandı!
                                    </h2>
                                    <p className="text-sm sm:text-base font-bold text-slate-600 mt-1 max-w-md mx-auto">
                                        Bu adımdaki tüm turları bitirdin! Şimdi sıradaki Diyanet adımının kilidini açmak için{' '}
                                        <strong>Ustalık Sınavı</strong> seni bekliyor!
                                    </p>
                                </div>

                                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 max-w-md mx-auto text-xs sm:text-sm font-extrabold text-amber-950 space-y-1">
                                    <div>
                                        🏆 Sınav Hedefi: En az <strong>%{stage.passingScorePercent}</strong> başarı
                                    </div>
                                    <div>
                                        ❤️ Hak: <strong>3 Kalp</strong>
                                    </div>
                                    <div>⭐ Ödül: Yıldızlar, Rozet ve Sıradaki Diyanet Adımı!</div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (soundEnabled) playAdventureTone('unlock');
                                        onProceedToExam();
                                    }}
                                    className="w-full max-w-md mx-auto py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-black text-base sm:text-lg border-b-4 border-rose-800 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2"
                                >
                                    <Trophy className="w-6 h-6" />
                                    <span>🏆 Faz 3: Ustalık Sınavına Başla!</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAZ 3: USTALIK SINAVI & KİLİT AÇMA GEÇİŞ TESTİ (ADIMIN TAMAMI ÜZERİNDEN)
// ─────────────────────────────────────────────────────────────────────────────

interface ExamQuestion {
    mode: 'audio_to_arabic' | 'arabic_to_name';
    target: AdventureItem;
    options: AdventureItem[];
    isReview: boolean;
}

export function ExamPhaseView({
    stage,
    hasNextStage,
    soundEnabled,
    playAudio,
    onBackToMap,
    onRetryLearn,
    onExamPassed,
    onProceedNextStage,
    onOpenCertificate,
    onMascotMessage
}: {
    stage: AdventureStage;
    hasNextStage: boolean;
    soundEnabled: boolean;
    playAudio: (url: string, rate?: number) => void;
    onBackToMap: () => void;
    onRetryLearn: () => void;
    onExamPassed: (stars: number, accuracy: number, xpEarned: number) => void;
    onProceedNextStage: () => void;
    onOpenCertificate: () => void;
    onMascotMessage: (msg: string) => void;
}) {
    const [examKey, setExamKey] = useState(0);
    const [qIdx, setQIdx] = useState(0);
    const [lives, setLives] = useState(3);
    const [correctCount, setCorrectCount] = useState(0);
    const [combo, setCombo] = useState(0);
    const [selectedOptId, setSelectedOptId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [mistakes, setMistakes] = useState<AdventureItem[]>([]);
    const [isFinished, setIsFinished] = useState(false);

    // Her mini turdan en az 1 örnek içerecek dengeli Ustalık Sınavı
    const questions: ExamQuestion[] = useMemo(() => {
        const list: ExamQuestion[] = [];
        const picked: AdventureItem[] = [];

        // Önce her mini turdan 1 temsilci seç (tüm adımı kapsaması için)
        stage.miniRounds.forEach(mr => {
            if (mr.items.length > 0) {
                const pick = mr.items[Math.floor(Math.random() * mr.items.length)];
                if (!picked.some(p => p.id === pick.id)) {
                    picked.push(pick);
                }
            }
        });

        // En az 6-8 ana soruya tamamla
        const targetMainCount = stage.isGate ? 8 : Math.max(6, picked.length);
        const remainingPool = [...stage.items]
            .filter(it => !picked.some(p => p.id === it.id))
            .sort(() => Math.random() - 0.5);
        while (picked.length < targetMainCount && remainingPool.length > 0) {
            picked.push(remainingPool.shift()!);
        }

        const allowTextNameMode = stage.hasExactReading && stage.curriculumId !== 'dualar';

        picked.forEach((target, idx) => {
            const distractors = buildDistractorPool(target, stage, 3);
            const options = [target, ...distractors].sort(() => Math.random() - 0.5);
            const useNameMode = allowTextNameMode && idx % 3 === 1;
            list.push({
                mode: useNameMode ? 'arabic_to_name' : 'audio_to_arabic',
                target,
                options,
                isReview: false
            });
        });

        // Önceki adımlardan 2 aralıklı tekrar sorusu
        const reviews = getReviewItems(stage, stage.isGate ? 2 : 1);
        reviews.forEach(rev => {
            const distractors = buildDistractorPool(rev, stage, 3);
            const options = [rev, ...distractors].sort(() => Math.random() - 0.5);
            list.push({
                mode: 'audio_to_arabic',
                target: rev,
                options,
                isReview: true
            });
        });

        return list.sort(() => Math.random() - 0.5);
    }, [stage, examKey]);

    const currentQ = questions[qIdx];

    const handleRestartExam = () => {
        setQIdx(0);
        setLives(3);
        setCorrectCount(0);
        setCombo(0);
        setSelectedOptId(null);
        setFeedback(null);
        setMistakes([]);
        setIsFinished(false);
        setExamKey(k => k + 1);
        onMascotMessage(`Adım ${stage.id}: ${stage.shortTitle} Ustalık Sınavı başladı! Başarılar! 🏆`);
    };

    useEffect(() => {
        if (!isFinished && currentQ && currentQ.mode === 'audio_to_arabic') {
            const timer = setTimeout(() => {
                playAudio(currentQ.target.audSrc);
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [qIdx, isFinished, currentQ, playAudio]);

    const finalizeExam = useCallback(
        (finalCorrect: number, finalLives: number) => {
            const accuracy = Math.round((finalCorrect / Math.max(1, questions.length)) * 100);
            const passed = finalLives > 0 && accuracy >= stage.passingScorePercent;

            setIsFinished(true);

            if (passed) {
                const stars = accuracy === 100 && finalLives === 3 ? 3 : accuracy >= 88 ? 2 : 1;
                const xpEarned = finalCorrect * 15 + stars * 20;
                if (soundEnabled) playAdventureTone('fanfare');
                confetti({ particleCount: 130, spread: 95, origin: { y: 0.5 } });
                onExamPassed(stars, accuracy, xpEarned);
                onMascotMessage(
                    `Muhteşemsin! Adım ${stage.id}'i %${accuracy} başarı ile geçtin ve sıradaki Diyanet adımını açtın! 🎉`
                );
            } else {
                if (soundEnabled) playAdventureTone('wrong');
                onMascotMessage(
                    `Az kaldı! Hedef %${stage.passingScorePercent}, sen %${accuracy} yaptın. Yanlışları dinleyip tekrar dene! 🐥`
                );
            }
        },
        [questions.length, stage.id, stage.passingScorePercent, soundEnabled, onExamPassed, onMascotMessage]
    );

    const handleSelectOption = (opt: AdventureItem) => {
        if (selectedOptId !== null || !currentQ) return;

        setSelectedOptId(opt.id);
        const isCorrect = opt.id === currentQ.target.id;

        if (isCorrect) {
            const nextCorrect = correctCount + 1;
            const nextCombo = combo + 1;
            setCorrectCount(nextCorrect);
            setCombo(nextCombo);
            setFeedback('correct');
            if (soundEnabled) playAdventureTone('correct', nextCombo);
            confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 } });
            onMascotMessage(`Doğru! "${opt.name}" 🌟`);

            setTimeout(() => {
                setSelectedOptId(null);
                setFeedback(null);
                if (qIdx + 1 < questions.length) {
                    setQIdx(prev => prev + 1);
                } else {
                    finalizeExam(nextCorrect, lives);
                }
            }, 900);
        } else {
            const nextLives = Math.max(0, lives - 1);
            setLives(nextLives);
            setCombo(0);
            setFeedback('wrong');
            if (soundEnabled) playAdventureTone('wrong');
            if (!mistakes.some(m => m.id === currentQ.target.id)) {
                setMistakes(prev => [...prev, currentQ.target]);
            }
            playAudio(currentQ.target.audSrc);
            onMascotMessage(
                `Dikkat! Doğrusu "${currentQ.target.name}" olacaktı. Bir sonraki soruda başaracaksın! 🐥`
            );

            setTimeout(() => {
                setSelectedOptId(null);
                setFeedback(null);
                if (nextLives === 0 || qIdx + 1 >= questions.length) {
                    finalizeExam(correctCount, nextLives);
                } else {
                    setQIdx(prev => prev + 1);
                }
            }, 1200);
        }
    };

    const accuracyPercent = Math.round((correctCount / Math.max(1, questions.length)) * 100);
    const didPass = lives > 0 && accuracyPercent >= stage.passingScorePercent;
    const earnedStars = accuracyPercent === 100 && lives === 3 ? 3 : accuracyPercent >= 88 ? 2 : 1;

    return (
        <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 pb-10">
            <PhaseStepper currentPhase="exam" />

            <div className="bg-white rounded-[2rem] border-4 border-amber-300 shadow-[0_14px_40px_rgba(245,158,11,0.16)] p-5 sm:p-8 relative">
                {!isFinished && currentQ ? (
                    <>
                        {/* Üst Sınav HUD */}
                        <div className="flex items-center justify-between gap-2 mb-5">
                            <button
                                type="button"
                                onClick={onBackToMap}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border-b-3 border-slate-300 active:border-b-0 transition-all cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Çık</span>
                            </button>

                            <div className="flex items-center gap-2 flex-1 max-w-xs mx-2">
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 rounded-full"
                                        style={{ width: `${((qIdx + 1) / questions.length) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs font-black text-slate-600 whitespace-nowrap">
                                    {qIdx + 1}/{questions.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {combo >= 2 && (
                                    <div className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-black flex items-center gap-0.5 animate-pulse">
                                        <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                                        <span>{combo}x</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-0.5 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Heart
                                            key={i}
                                            className={cn(
                                                'w-4 h-4 transition-all',
                                                i < lives
                                                    ? 'fill-rose-500 text-rose-500 scale-100'
                                                    : 'text-slate-300 scale-75'
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Soru Başlığı */}
                        <div className="text-center mb-5">
                            <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
                                    🏆 Adım {stage.id} Ustalık Sınavı • Baraj %{stage.passingScorePercent}
                                </span>
                                {currentQ.isReview && (
                                    <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-black">
                                        🔄 Tekrar Sorusu
                                    </span>
                                )}
                            </div>

                            {currentQ.mode === 'audio_to_arabic' ? (
                                <>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">
                                        Sesi dinle ve doğru kartı seç!
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => playAudio(currentQ.target.audSrc)}
                                        className="inline-flex items-center gap-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-base px-8 py-3.5 rounded-2xl border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-lg"
                                    >
                                        <Volume2 className="w-6 h-6" />
                                        <span>Sesi Dinle</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-3">
                                        Bu kartın okunuşu hangisidir?
                                    </h2>
                                    <div className="w-44 h-36 mx-auto bg-white rounded-3xl border-3 border-sky-200 shadow-md flex items-center justify-center p-4">
                                        <StageItemMedia
                                            src={currentQ.target.imgSrc}
                                            alt={currentQ.target.name}
                                            fallbackText={currentQ.target.arabic || currentQ.target.name}
                                            className="max-h-full max-w-full object-contain"
                                            textClassName="text-5xl"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 4 Seçenek (Sınavda kopyasız!) */}
                        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 mt-5">
                            {currentQ.options.map(opt => {
                                const isSelected = selectedOptId === opt.id;
                                const isTarget = opt.id === currentQ.target.id;

                                let stateClass =
                                    'border-slate-200 bg-white hover:border-sky-400 border-b-[5px] active:border-b-2 active:translate-y-[3px]';

                                if (selectedOptId !== null) {
                                    if (isTarget) {
                                        stateClass =
                                            'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-200 scale-[1.03]';
                                    } else if (isSelected && feedback === 'wrong') {
                                        stateClass =
                                            'border-rose-500 bg-rose-50 ring-4 ring-rose-200 animate-shake';
                                    } else {
                                        stateClass = 'border-slate-200 bg-slate-50 opacity-50';
                                    }
                                }

                                return (
                                    <button
                                        key={opt.id}
                                        disabled={selectedOptId !== null}
                                        onClick={() => handleSelectOption(opt)}
                                        className={cn(
                                            'rounded-3xl border-3 p-4 min-h-[120px] sm:min-h-[140px] flex flex-col items-center justify-center transition-all cursor-pointer relative shadow-sm',
                                            stateClass
                                        )}
                                    >
                                        {currentQ.mode === 'audio_to_arabic' ? (
                                            <>
                                                <div className="h-20 sm:h-24 flex items-center justify-center">
                                                    <StageItemMedia
                                                        src={opt.imgSrc}
                                                        alt={opt.name}
                                                        fallbackText={opt.arabic || opt.name}
                                                        className="max-h-full max-w-[130px] object-contain"
                                                        textClassName="text-4xl sm:text-5xl"
                                                    />
                                                </div>
                                                {selectedOptId !== null && (isTarget || isSelected) && (
                                                    <span
                                                        className={cn(
                                                            'mt-2 text-xs font-black px-2.5 py-0.5 rounded-full',
                                                            isTarget
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-rose-500 text-white'
                                                        )}
                                                    >
                                                        {opt.name}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-base sm:text-lg font-black text-slate-900">
                                                {opt.name}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    /* ── SINAV SONUÇ EKRANI ── */
                    <div className="text-center py-4 space-y-5">
                        {didPass ? (
                            <>
                                <div className="text-6xl animate-bounce">🏆</div>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-emerald-600">
                                        Muhteşem! Ustalık Sınavını Geçtin!
                                    </h2>
                                    <p className="text-sm font-bold text-slate-600 mt-1">
                                        Adım {stage.id}: {stage.title} basamağını başarıyla tamamladın!
                                    </p>
                                </div>

                                <div className="flex items-center justify-center gap-3 text-4xl sm:text-5xl">
                                    {[1, 2, 3].map(starNum => (
                                        <Star
                                            key={starNum}
                                            className={cn(
                                                'w-11 h-11 transition-all',
                                                starNum <= earnedStars
                                                    ? 'fill-amber-400 text-amber-500 drop-shadow-md scale-110'
                                                    : 'text-slate-200 fill-slate-100'
                                            )}
                                        />
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
                                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3">
                                        <div className="text-[11px] font-bold text-emerald-700">Başarı</div>
                                        <div className="text-xl font-black text-emerald-900">%{accuracyPercent}</div>
                                    </div>
                                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
                                        <div className="text-[11px] font-bold text-amber-700">Doğru</div>
                                        <div className="text-xl font-black text-amber-900">
                                            {correctCount}/{questions.length}
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-3">
                                        <div className="text-[11px] font-bold text-purple-700">Yeni Rozet</div>
                                        <div className="text-xl font-black">{stage.badgeIcon}</div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-3 max-w-md mx-auto text-xs sm:text-sm font-black text-purple-900 flex items-center justify-center gap-2">
                                    <Unlock className="w-4 h-4 text-emerald-600" />
                                    <span>
                                        {hasNextStage
                                            ? `Diyanet Adım ${stage.id + 1} Kilidi Açıldı & "${stage.badgeName}" Rozeti Eklendi!`
                                            : "30 Diyanet Adımı'nın Tamamı Bitti! Sertifikan Hazır! 👑"}
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
                                    {hasNextStage ? (
                                        <button
                                            type="button"
                                            onClick={onProceedNextStage}
                                            className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-base border-b-4 border-emerald-800 active:border-b-0 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <span>Adım {stage.id + 1}&apos;e Geç</span>
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={onOpenCertificate}
                                            className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-base border-b-4 border-orange-800 active:border-b-0 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <span>🎓 Sertifikamı Aç!</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={onBackToMap}
                                        className="py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm border-b-4 border-slate-300 active:border-b-0 transition-all cursor-pointer"
                                    >
                                        🗺️ Harita
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center text-4xl border-2 border-amber-300">
                                    🧭
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-amber-800">
                                        Az Kaldı! Biraz Daha Tekrar Edelim
                                    </h2>
                                    <p className="text-sm font-bold text-slate-600 mt-1 max-w-md mx-auto">
                                        Bu sınavda <strong>%{accuracyPercent}</strong> başarı sağladın. Sıradaki adımın kilidini açmak için en az{' '}
                                        <strong>%{stage.passingScorePercent}</strong> gerekiyor.
                                    </p>
                                </div>

                                {mistakes.length > 0 && (
                                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 max-w-md mx-auto text-left">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 mb-2.5">
                                            <AlertCircle className="w-4 h-4 text-amber-600" />
                                            <span>Şu harf / kelimelere dokunup sesini tekrar dinle:</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {mistakes.map(m => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => playAudio(m.audSrc)}
                                                    className="bg-white border-2 border-amber-200 hover:border-amber-400 rounded-xl p-2 flex items-center gap-2.5 cursor-pointer transition-all"
                                                >
                                                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center p-1 shrink-0">
                                                        <StageItemMedia
                                                            src={m.imgSrc}
                                                            alt={m.name}
                                                            fallbackText={m.arabic || m.name}
                                                            className="max-h-full max-w-full object-contain"
                                                            textClassName="text-xl"
                                                        />
                                                    </div>
                                                    <div className="text-left min-w-0 flex-1">
                                                        <div className="text-xs font-black text-slate-800 truncate">
                                                            {m.name}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-sky-600 flex items-center gap-1">
                                                            <Volume2 className="w-3 h-3" /> Dinle
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
                                    <button
                                        type="button"
                                        onClick={onRetryLearn}
                                        className="flex-1 py-3.5 px-5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-sm border-b-4 border-sky-700 active:border-b-0 transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        <span>📖 Bol Tekrar Et</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRestartExam}
                                        className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>🔄 Sınavı Tekrarla</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
