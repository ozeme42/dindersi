'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, CheckCircle2, XCircle, RotateCcw, 
    Lightbulb, Eye, EyeOff, Check, X, Award, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import type { ClozeParagraphStep, ClozeBlankItem } from '@/lib/types';
import { useAuth } from '@/context/auth-context';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

type WordTile = {
    id: string;
    word: string;
    isDistractor?: boolean;
    colorClass: string;
};

const TILE_COLORS = [
    'bg-sky-500 hover:bg-sky-400 text-white border-sky-400 shadow-sky-500/25',
    'bg-purple-500 hover:bg-purple-400 text-white border-purple-400 shadow-purple-500/25',
    'bg-amber-500 hover:bg-amber-400 text-white border-amber-400 shadow-amber-500/25',
    'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400 shadow-emerald-500/25',
    'bg-rose-500 hover:bg-rose-400 text-white border-rose-400 shadow-rose-500/25',
    'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-300 shadow-cyan-500/25',
    'bg-indigo-500 hover:bg-indigo-400 text-white border-indigo-400 shadow-indigo-500/25',
    'bg-orange-500 hover:bg-orange-400 text-white border-orange-400 shadow-orange-500/25',
];

export function ClozeParagraphPlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal',
    presentationTheme = 'clean-light',
}: {
    step: ClozeParagraphStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';

    const blanks: ClozeBlankItem[] = useMemo(() => {
        if (Array.isArray(step.blanks) && step.blanks.length > 0) {
            return step.blanks;
        }
        return [
            { id: '1', targetWord: 'zekât', hint: 'İslamın 5 temel şartından biri' },
            { id: '2', targetWord: 'farz', hint: 'Kesin hüküm' },
            { id: '3', targetWord: 'nisap', hint: 'Zenginlik ölçüsü' },
        ];
    }, [step.blanks]);

    const distractors: string[] = useMemo(() => {
        return Array.isArray(step.distractors) ? step.distractors : ['sadaka', 'vacip'];
    }, [step.distractors]);

    const paragraphText = step.paragraphWithBlanks || 
        'İslam dininde [1], zengin Müslümanların yılda bir kez yerine getirmesi gereken [2] bir ibadettir. Bu ibadeti yerine getirmek için kişinin [3] miktarı mala sahip olması şarttır.';

    // Kelime havuzunu karıştır ve renklendir
    const initialPool: WordTile[] = useMemo(() => {
        const list: { word: string; isDistractor?: boolean }[] = [];
        blanks.forEach(b => list.push({ word: b.targetWord, isDistractor: false }));
        distractors.forEach(d => list.push({ word: d, isDistractor: true }));

        // Karıştır
        const shuffled = [...list].sort(() => Math.random() - 0.5);

        return shuffled.map((item, idx) => ({
            id: `tile-${idx}-${item.word}`,
            word: item.word,
            isDistractor: item.isDistractor,
            colorClass: TILE_COLORS[idx % TILE_COLORS.length],
        }));
    }, [blanks, distractors]);

    // State'ler
    const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
    // slotId -> WordTile
    const [placements, setPlacements] = useState<{ [slotId: string]: WordTile | null }>({});
    const [isChecked, setIsChecked] = useState(false);
    const [showHints, setShowHints] = useState(false);
    const [mistakenSlotId, setMistakenSlotId] = useState<string | null>(null);
    const [isAllCorrect, setIsAllCorrect] = useState(false);

    // Yeni adıma veya adıma geçildiğinde sıfırla
    useEffect(() => {
        setPlacements({});
        setSelectedTileId(null);
        setSelectedSlotId(null);
        setIsChecked(false);
        setIsAllCorrect(false);
    }, [step]);

    // Hangi kelime çipleri boşluklara yerleştirilmiş durumda?
    const usedTileIds = useMemo(() => {
        const ids = new Set<string>();
        Object.values(placements).forEach(t => {
            if (t) ids.add(t.id);
        });
        return ids;
    }, [placements]);

    // Paragrafı metin parçalarına ve boşluklara ayır
    // Örnek regex: \[([0-9a-zA-Z_-]+)\]
    const parsedSegments = useMemo(() => {
        const regex = /\[([0-9a-zA-Z_-]+)\]/g;
        const segments: { type: 'text' | 'blank'; content: string; blankId?: string }[] = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(paragraphText)) !== null) {
            const matchIndex = match.index;
            if (matchIndex > lastIndex) {
                segments.push({
                    type: 'text',
                    content: paragraphText.slice(lastIndex, matchIndex)
                });
            }
            segments.push({
                type: 'blank',
                content: match[0],
                blankId: match[1]
            });
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < paragraphText.length) {
            segments.push({
                type: 'text',
                content: paragraphText.slice(lastIndex)
            });
        }

        return segments;
    }, [paragraphText]);

    // Bir kelimeyi boşluğa yerleştir
    const placeWordIntoSlot = (tile: WordTile, slotId: string) => {
        playSound('pop');
        setPlacements(prev => {
            const next = { ...prev };
            // Eğer bu tile başka bir boşluktaysa oradan kaldır
            Object.keys(next).forEach(sId => {
                if (next[sId]?.id === tile.id) {
                    next[sId] = null;
                }
            });
            next[slotId] = tile;
            return next;
        });
        setSelectedTileId(null);
        setSelectedSlotId(null);
        setIsChecked(false);
    };

    // Boşluktan kelimeyi kaldır (geri al)
    const removeWordFromSlot = (slotId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        playSound('pop');
        setPlacements(prev => ({
            ...prev,
            [slotId]: null,
        }));
        setIsChecked(false);
        setIsAllCorrect(false);
    };

    // Kelime çipine tıklandığında
    const handleTileClick = (tile: WordTile) => {
        if (usedTileIds.has(tile.id)) return; // zaten yerleştirilmiş

        // Eğer önceden bir boşluk seçilmişse doğrudan oraya yerleştir!
        if (selectedSlotId) {
            placeWordIntoSlot(tile, selectedSlotId);
            return;
        }

        // Değilse bu kelimeyi seç
        playSound('pop');
        if (selectedTileId === tile.id) {
            setSelectedTileId(null);
        } else {
            setSelectedTileId(tile.id);
        }
    };

    // Boşluğa tıklandığında
    const handleSlotClick = (slotId: string) => {
        const currentPlacement = placements[slotId];

        // Eğer boşluk doluysa ve bir kelime seçili değilse: kelimeyi çıkar
        if (currentPlacement && !selectedTileId) {
            removeWordFromSlot(slotId);
            return;
        }

        // Eğer alttan bir kelime seçilmişse: buraya bırak
        if (selectedTileId) {
            const tile = initialPool.find(t => t.id === selectedTileId);
            if (tile) {
                placeWordIntoSlot(tile, slotId);
            }
            return;
        }

        // Eğer boşluk boşsa ve kelime seçili değilse: bu boşluğu seç (öğrenci önce boşluğa bastı)
        playSound('pop');
        if (selectedSlotId === slotId) {
            setSelectedSlotId(null);
        } else {
            setSelectedSlotId(slotId);
        }
    };

    // Kontrol Et
    const handleCheckAnswers = () => {
        let allFilled = true;
        let allMatch = true;

        blanks.forEach(b => {
            const placed = placements[b.id];
            if (!placed) {
                allFilled = false;
                allMatch = false;
            } else {
                const isMatch = placed.word.trim().toLowerCase() === b.targetWord.trim().toLowerCase();
                if (!isMatch) {
                    allMatch = false;
                }
            }
        });

        setIsChecked(true);

        if (allMatch && allFilled) {
            setIsAllCorrect(true);
            playSound('win');
            import('canvas-confetti').then(m => {
                m.default({
                    particleCount: 110,
                    spread: 85,
                    origin: { y: 0.6 }
                });
            }).catch(() => {});
        } else {
            playSound('incorrect');
            setMistakenSlotId('check-failed');
            setTimeout(() => setMistakenSlotId(null), 900);
        }
    };

    // Sıfırla
    const handleReset = () => {
        playSound('pop');
        setPlacements({});
        setSelectedTileId(null);
        setSelectedSlotId(null);
        setIsChecked(false);
        setIsAllCorrect(false);
    };

    // Çözümü Göster (Öğretmen Modu)
    const handleRevealSolution = () => {
        playSound('pop');
        const solvedPlacements: { [slotId: string]: WordTile } = {};
        blanks.forEach(b => {
            const foundTile = initialPool.find(t => t.word.toLowerCase() === b.targetWord.toLowerCase());
            if (foundTile) {
                solvedPlacements[b.id] = foundTile;
            } else {
                solvedPlacements[b.id] = {
                    id: `solved-${b.id}`,
                    word: b.targetWord,
                    colorClass: 'bg-emerald-600 text-white border-emerald-400'
                };
            }
        });
        setPlacements(solvedPlacements);
        setIsChecked(true);
        setIsAllCorrect(true);
    };

    // Doluluk oranı
    const totalBlanks = blanks.length;
    const filledCount = blanks.filter(b => Boolean(placements[b.id])).length;

    return (
        <div className={cn(
            "w-full h-full max-h-full flex flex-col items-center justify-between select-none mx-auto overflow-hidden",
            isTeacher ? "max-w-7xl px-3 sm:px-6 py-2 sm:py-3" : "max-w-5xl px-3 py-2",
            isFullscreen && "py-3 sm:py-5"
        )}>
            {/* ══ 1. ÜST PANEL: ROZET VE AKSİYONLAR ══ */}
            <div className="w-full shrink-0 flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3">
                {/* Başlık / Rozet */}
                <div className={cn(
                    "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider backdrop-blur-xl",
                    isSketchnote
                        ? "bg-[#fde047] text-[#1e293b] border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-['Caveat',cursive] text-lg sm:text-xl normal-case"
                        : "bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-sky-500/20 border border-emerald-400/40 text-emerald-300 shadow-md"
                )}>
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>{step.title || '🧩 Paragraf Boşluk Doldurma'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                        {filledCount} / {totalBlanks} Yerleşti
                    </span>
                </div>

                {/* Sağ Aksiyon Butonları */}
                <div className="flex items-center gap-1.5">
                    {/* İpuçları Butonu */}
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            playSound('pop');
                            setShowHints(!showHints);
                        }}
                        className={cn(
                            "rounded-xl text-xs font-bold gap-1.5 h-8 px-2.5 transition-all cursor-pointer border",
                            showHints 
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                                : "text-slate-300 hover:text-white hover:bg-white/10 border-white/10"
                        )}
                        title="Boşlukların ipuçlarını göster"
                    >
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">{showHints ? 'İpuçlarını Gizle' : 'İpuçları'}</span>
                    </Button>

                    {/* Çözümü Göster (Öğretmen) */}
                    {isTeacher && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleRevealSolution}
                            className="rounded-xl text-xs font-bold gap-1.5 h-8 px-2.5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 cursor-pointer"
                            title="Öğretmen Modu: Tüm boşlukları doğru şekilde doldur"
                        >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="hidden sm:inline">Çözümü Göster</span>
                        </Button>
                    )}

                    {/* Sıfırla */}
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleReset}
                        className="rounded-xl text-xs font-bold gap-1.5 h-8 px-2.5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 cursor-pointer"
                        title="Tüm kelimeleri havuza geri al"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sıfırla</span>
                    </Button>
                </div>
            </div>

            {/* ══ 2. ORTA PANEL: ANA PARAGRAF KARTI (BOŞLUKLU) ══ */}
            <div className="relative w-full flex-1 min-h-0 flex flex-col overflow-hidden mb-3">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                        "w-full h-full flex flex-col justify-between rounded-3xl p-4 sm:p-6 md:p-8 overflow-y-auto border-2 shadow-2xl backdrop-blur-xl scrollbar-thin scrollbar-thumb-white/20",
                        isSketchnote
                            ? "bg-[#fefce8] border-[3px] border-[#1e293b] shadow-[5px_5px_0_#1e293b] text-[#1e293b]"
                            : "bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-900/95 border-emerald-500/30 text-white"
                    )}
                >
                    {/* Yönerge Çubuğu */}
                    <div className="shrink-0 flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                <HelpCircle className="w-4 h-4" />
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-300">
                                {step.description || 'Boşluklara tıklayarak veya alttan kelime seçerek paragrafı tamamlayın:'}
                            </span>
                        </div>
                        {selectedTileId && (
                            <span className="text-[11px] font-bold text-amber-300 animate-pulse bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                                👆 Uygun bir boşluğa dokunun
                            </span>
                        )}
                        {selectedSlotId && (
                            <span className="text-[11px] font-bold text-cyan-300 animate-pulse bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
                                👇 Alttan kelimeye dokunun
                            </span>
                        )}
                    </div>

                    {/* ══ PARAGRAF AKIŞI & İNTERAKTİF BOŞLUKLAR ══ */}
                    <div className="my-auto py-4 px-2 sm:px-4">
                        <div className={cn(
                            "leading-loose tracking-normal text-balance",
                            fontSizeScale === 'huge' || fontSizeScale === 'xl' 
                                ? "text-xl sm:text-2xl md:text-3xl"
                                : fontSizeScale === 'lg'
                                ? "text-lg sm:text-xl md:text-2xl"
                                : "text-base sm:text-lg md:text-xl",
                            isSketchnote ? "font-['Caveat',cursive] text-2xl sm:text-3xl text-[#0f172a]" : "text-slate-100"
                        )}>
                            {parsedSegments.map((seg, idx) => {
                                if (seg.type === 'text') {
                                    return <span key={idx}>{seg.content}</span>;
                                }

                                const slotId = seg.blankId || '1';
                                const placedTile = placements[slotId];
                                const blankMeta = blanks.find(b => b.id === slotId);
                                const isTargetCorrect = placedTile && blankMeta && (placedTile.word.trim().toLowerCase() === blankMeta.targetWord.trim().toLowerCase());
                                const isTargetWrong = placedTile && blankMeta && !isTargetCorrect;
                                const isSelectedSlot = selectedSlotId === slotId;
                                const isReadyToDrop = selectedTileId && !placedTile;

                                return (
                                    <span
                                        key={idx}
                                        onClick={() => handleSlotClick(slotId)}
                                        className={cn(
                                            "inline-flex items-center align-middle mx-1.5 my-1 transition-all cursor-pointer rounded-2xl select-none relative group",
                                            // Boş durum
                                            !placedTile && cn(
                                                "min-w-[110px] sm:min-w-[130px] px-3 py-1 sm:py-1.5 border-2 border-dashed text-center justify-center font-black text-xs sm:text-sm",
                                                isSelectedSlot 
                                                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/50 scale-105"
                                                    : isReadyToDrop
                                                    ? "bg-amber-500/20 border-amber-400 text-amber-200 animate-pulse scale-105"
                                                    : "bg-slate-800/80 hover:bg-slate-800 border-white/20 text-slate-400 hover:border-emerald-400"
                                            ),
                                            // Dolu durum
                                            placedTile && cn(
                                                "px-3.5 py-1 sm:py-1.5 border-2 text-center justify-center font-black text-xs sm:text-sm shadow-md",
                                                isChecked && isTargetCorrect && "bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/30",
                                                isChecked && isTargetWrong && "bg-rose-600 border-rose-400 text-white animate-shake",
                                                !isChecked && cn(placedTile.colorClass, "hover:opacity-90")
                                            )
                                        )}
                                    >
                                        {!placedTile ? (
                                            <span className="flex items-center gap-1 opacity-80">
                                                <span>[{slotId}]</span>
                                                <span className="text-[11px] font-semibold">Boşluk</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5">
                                                <span>{placedTile.word}</span>
                                                {isChecked && isTargetCorrect && (
                                                    <Check className="w-3.5 h-3.5 text-white" />
                                                )}
                                                {isChecked && isTargetWrong && (
                                                    <X className="w-3.5 h-3.5 text-white" />
                                                )}
                                                {!isChecked && (
                                                    <span 
                                                        onClick={(e) => removeWordFromSlot(slotId, e)}
                                                        className="w-4 h-4 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center text-[10px] ml-0.5 cursor-pointer"
                                                        title="Kaldır"
                                                    >
                                                        ✕
                                                    </span>
                                                )}
                                            </span>
                                        )}

                                        {/* İpucu Rozeti (Açıkken) */}
                                        {showHints && blankMeta?.hint && !placedTile && (
                                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-950/90 text-amber-200 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-lg z-20">
                                                💡 {blankMeta.hint}
                                            </span>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* ══ TEBRİK / BAŞARI BANNERI ══ */}
                    {isAllCorrect && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="shrink-0 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-900/90 to-emerald-950/90 border-2 border-emerald-400/60 text-white flex items-center justify-between shadow-2xl"
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="p-1.5 bg-emerald-500/30 rounded-xl text-emerald-300">
                                    <Award className="w-5 h-5" />
                                </span>
                                <div>
                                    <span className="text-xs sm:text-sm font-black text-emerald-200 block">
                                        🎉 Harika! Tüm Kilit Kavramları Doğru Yerleştirdiniz!
                                    </span>
                                    <span className="text-[11px] text-emerald-300/80 font-medium">
                                        Konu özetini eksiksiz olarak tamamladınız.
                                    </span>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleReset}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl h-8 px-3 cursor-pointer shadow-md"
                            >
                                Tekrar Çöz
                            </Button>
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* ══ 3. ALT PANEL: KELİME BANKASI / ÇİP HAVUZU & KONTROL BUTONU ══ */}
            <div className="w-full shrink-0 p-3 sm:p-4 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Kelime Havuzu ({initialPool.length} Kavram)
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                        Kelimeye dokunup boşluğa yerleştirin
                    </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Kelime Çipleri */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        {initialPool.map(tile => {
                            const isUsed = usedTileIds.has(tile.id);
                            const isSelected = selectedTileId === tile.id;

                            return (
                                <button
                                    key={tile.id}
                                    type="button"
                                    disabled={isUsed}
                                    onClick={() => handleTileClick(tile)}
                                    className={cn(
                                        "px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer border-2 shadow-md select-none",
                                        isUsed && "opacity-25 pointer-events-none scale-95 border-dashed border-white/20 bg-slate-800 text-slate-500",
                                        !isUsed && !isSelected && cn(tile.colorClass, "hover:scale-105 active:scale-95"),
                                        !isUsed && isSelected && "bg-white text-slate-950 border-amber-400 ring-4 ring-amber-400/50 scale-110 shadow-xl"
                                    )}
                                >
                                    <span>{tile.word}</span>
                                    {isUsed && <span className="ml-1 text-[10px]">✓</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Kontrol Et Butonu */}
                    <div className="shrink-0">
                        <Button
                            type="button"
                            size="sm"
                            disabled={filledCount === 0 || isAllCorrect}
                            onClick={handleCheckAnswers}
                            className={cn(
                                "h-10 px-5 rounded-2xl font-black text-xs sm:text-sm gap-2 shadow-lg transition-all cursor-pointer",
                                filledCount === totalBlanks
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/30 scale-105 animate-pulse"
                                    : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
                            )}
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Cevapları Kontrol Et</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
