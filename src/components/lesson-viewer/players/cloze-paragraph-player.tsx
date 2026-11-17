'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, CheckCircle2, XCircle, RotateCcw, 
    Lightbulb, Eye, Check, X, Award, HelpCircle,
    Maximize2, Minimize2, CheckCheck, GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

// 🎨 Oyun Atölyesi 3D Canlı Kelime Taşları Renkleri
const TILE_COLORS = [
    'bg-sky-500 hover:bg-sky-400 text-white border-sky-300 shadow-[0_5px_0_#0284c7]',
    'bg-purple-500 hover:bg-purple-400 text-white border-purple-300 shadow-[0_5px_0_#7e22ce]',
    'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-[0_5px_0_#b45309] font-black',
    'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-300 shadow-[0_5px_0_#047857]',
    'bg-rose-500 hover:bg-rose-400 text-white border-rose-300 shadow-[0_5px_0_#be123c]',
    'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-200 shadow-[0_5px_0_#0e7490] font-black',
    'bg-indigo-500 hover:bg-indigo-400 text-white border-indigo-300 shadow-[0_5px_0_#3730a3]',
    'bg-orange-500 hover:bg-orange-400 text-white border-orange-300 shadow-[0_5px_0_#c2410c]',
];

export function ClozeParagraphPlayer({
    step,
    isFullscreen: propIsFullscreen,
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
    const containerRef = useRef<HTMLDivElement>(null);

    // Bağımsız Tam Ekran State'i
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));

    useEffect(() => {
        if (typeof propIsFullscreen === 'boolean') {
            setIsFullscreen(propIsFullscreen);
        }
    }, [propIsFullscreen]);

    // Tarayıcı Tam Ekran Toggle
    const toggleFullscreen = async () => {
        try {
            if (!isFullscreen) {
                if (containerRef.current?.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                }
                setIsFullscreen(true);
            } else {
                if (document.fullscreenElement && document.exitFullscreen) {
                    await document.exitFullscreen();
                }
                setIsFullscreen(false);
            }
        } catch (err) {
            console.error('Tam ekran hatası:', err);
            setIsFullscreen(!isFullscreen);
        }
    };

    // Fullscreen change listener
    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

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
    const [placements, setPlacements] = useState<{ [slotId: string]: WordTile | null }>({});
    const [isChecked, setIsChecked] = useState(false);
    const [showHints, setShowHints] = useState(false);
    const [mistakenSlotId, setMistakenSlotId] = useState<string | null>(null);
    const [isAllCorrect, setIsAllCorrect] = useState(false);

    // Yeni adıma geçildiğinde sıfırla
    useEffect(() => {
        setPlacements({});
        setSelectedTileId(null);
        setSelectedSlotId(null);
        setIsChecked(false);
        setIsAllCorrect(false);
    }, [step]);

    // Kullanılmayan taşlar
    const availableTiles = useMemo(() => {
        const usedTileIds = new Set(
            Object.values(placements)
                .filter((t): t is WordTile => Boolean(t))
                .map(t => t.id)
        );
        return initialPool.filter(t => !usedTileIds.has(t.id));
    }, [initialPool, placements]);

    // Boşluğa kelime yerleştir
    const placeWordInSlot = (slotId: string, tile: WordTile) => {
        playSound('pop');
        setPlacements(prev => ({
            ...prev,
            [slotId]: tile
        }));
        setSelectedTileId(null);
        setSelectedSlotId(null);
        setIsChecked(false);
    };

    // Boşluktaki kelimeyi kaldır (havuza iade et)
    const removeWordFromSlot = (slotId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        playSound('pop');
        setPlacements(prev => {
            const next = { ...prev };
            delete next[slotId];
            return next;
        });
        setIsChecked(false);
        setIsAllCorrect(false);
    };

    // Kelime taşına tıklandığında
    const handleTileClick = (tile: WordTile) => {
        playSound('pop');
        if (selectedSlotId) {
            placeWordInSlot(selectedSlotId, tile);
        } else {
            setSelectedTileId(prev => (prev === tile.id ? null : tile.id));
        }
    };

    // Paragraftaki bir boşluğa tıklandığında
    const handleSlotClick = (slotId: string) => {
        playSound('pop');
        if (placements[slotId]) {
            removeWordFromSlot(slotId);
            return;
        }

        if (selectedTileId) {
            const tile = initialPool.find(t => t.id === selectedTileId);
            if (tile) {
                placeWordInSlot(slotId, tile);
            }
        } else {
            setSelectedSlotId(prev => (prev === slotId ? null : slotId));
        }
    };

    // Cevapları Kontrol Et
    const handleCheckAnswers = () => {
        let allFilled = true;
        let allMatch = true;

        blanks.forEach(blank => {
            const placed = placements[blank.id];
            if (!placed) {
                allFilled = false;
                allMatch = false;
            } else {
                if (placed.word.trim().toLowerCase() !== blank.targetWord.trim().toLowerCase()) {
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
                    particleCount: 120,
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
                    colorClass: 'bg-emerald-500 text-white border-emerald-300 shadow-[0_5px_0_#047857]'
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

    // Paragrafı parçala ve render et
    const renderParagraphWithSlots = () => {
        const parts = paragraphText.split(/(\[\d+\])/g);

        return (
            <div className={cn(
                "leading-relaxed font-bold tracking-normal transition-all",
                fontSizeScale === 'huge' || fontSizeScale === 'xl' ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-loose" :
                fontSizeScale === 'lg' ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-relaxed" :
                "text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed",
                isSketchnote ? "font-['Caveat',cursive] text-2xl sm:text-3xl md:text-4xl text-[#0f172a]" : "text-white"
            )}>
                {parts.map((part, index) => {
                    const match = part.match(/\[(\d+)\]/);
                    if (!match) {
                        return <span key={index}>{part}</span>;
                    }

                    const slotId = match[1];
                    const blankItem = blanks.find(b => b.id === slotId);
                    const placedTile = placements[slotId];
                    const isTargetSlot = selectedSlotId === slotId;
                    const isTargetTileReady = Boolean(selectedTileId);

                    const isTargetWordCorrect = placedTile && blankItem &&
                        placedTile.word.trim().toLowerCase() === blankItem.targetWord.trim().toLowerCase();

                    return (
                        <span
                            key={index}
                            onClick={() => handleSlotClick(slotId)}
                            className={cn(
                                "inline-flex items-center align-middle mx-1.5 my-1 transition-all duration-200 cursor-pointer select-none",
                                !placedTile && "relative"
                            )}
                        >
                            {placedTile ? (
                                <motion.span
                                    layout
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border-2 font-black shadow-md",
                                        placedTile.colorClass,
                                        isChecked && isTargetWordCorrect && "bg-emerald-600 text-white border-emerald-300 shadow-[0_5px_0_#065f46]",
                                        isChecked && !isTargetWordCorrect && "bg-rose-600 text-white border-rose-300 shadow-[0_5px_0_#9f1239] animate-shake",
                                        isSketchnote && "border-2 border-[#1e293b] shadow-[3px_3px_0_#1e293b]"
                                    )}
                                >
                                    <span>{placedTile.word}</span>
                                    {isChecked && (
                                        isTargetWordCorrect ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-200 inline-block" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-rose-200 inline-block" />
                                        )
                                    )}
                                    <span 
                                        onClick={(e) => removeWordFromSlot(slotId, e)}
                                        className="ml-1 text-xs opacity-75 hover:opacity-100 p-0.5 rounded-full hover:bg-black/20"
                                        title="Kaldır"
                                    >
                                        ✕
                                    </span>
                                </motion.span>
                            ) : (
                                <span
                                    className={cn(
                                        "inline-flex items-center justify-center min-w-[90px] sm:min-w-[130px] px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border-2 border-dashed font-black text-center transition-all",
                                        isTargetSlot
                                            ? "border-amber-400 bg-amber-400/20 text-amber-200 ring-4 ring-amber-400/40 animate-pulse scale-105"
                                            : isTargetTileReady
                                                ? "border-indigo-400 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25 animate-pulse"
                                                : "border-white/30 bg-slate-900/60 text-slate-400 hover:border-white/50 hover:bg-slate-800/60",
                                        isSketchnote && "border-[#1e293b] bg-amber-50/50 text-[#1e293b]"
                                    )}
                                >
                                    <span className="text-xs sm:text-sm md:text-base opacity-75 font-mono">
                                        [{slotId}] Boşluk
                                    </span>
                                    {showHints && blankItem?.hint && (
                                        <span 
                                            className="ml-1 text-xs text-amber-300 font-normal" 
                                            title={blankItem.hint}
                                        >
                                            💡
                                        </span>
                                    )}
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative flex flex-col w-full overflow-hidden select-none transition-all duration-300",
                isFullscreen 
                    ? "fixed inset-0 z-[100] bg-slate-950 p-2 sm:p-4 md:p-6 w-full h-full" 
                    : "w-full h-full rounded-2xl md:rounded-3xl border-2 border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-xl"
            )}
        >
            {/* ══ OYUN ATÖLYESİ ÜST BAŞLIK & KONTROL ÇUBUĞU ══ */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 border-b border-white/10">
                {/* Sol: Oyun Bilgisi & İkon */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500/30 via-teal-500/20 to-sky-500/30 border border-emerald-400/40 text-2xl shadow-inner">
                        🧩
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-white text-base sm:text-lg md:text-xl tracking-wide">
                                {step.title || 'Paragraf Boşluk Doldurma'}
                            </span>
                            <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-300 border-emerald-400/40 font-black">
                                {filledCount} / {totalBlanks} Yerleşti
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-400 hidden sm:block">
                            Aşağıdaki kelime taşlarını paragraftaki doğru boşluklara yerleştirin.
                        </p>
                    </div>
                </div>

                {/* Sağ: Kontrol Eylemleri & Tam Ekran */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* İpuçları */}
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            playSound('pop');
                            setShowHints(!showHints);
                        }}
                        className={cn(
                            "rounded-xl text-xs sm:text-sm font-bold gap-1.5 h-9 px-2.5 sm:px-3.5 transition-all cursor-pointer border",
                            showHints 
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm" 
                                : "text-slate-300 hover:text-white hover:bg-white/10 border-white/10"
                        )}
                        title="Boşlukların ipuçlarını göster"
                    >
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span className="hidden sm:inline">{showHints ? 'İpuçlarını Gizle' : 'İpucu'}</span>
                    </Button>

                    {/* Çözümü Göster (Öğretmen) */}
                    {isTeacher && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleRevealSolution}
                            className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 h-9 px-2.5 sm:px-3.5 text-cyan-300 hover:text-white hover:bg-white/10 border border-cyan-500/30 cursor-pointer"
                            title="Öğretmen Modu: Tüm boşlukları doğru kelimelerle doldur"
                        >
                            <Eye className="w-4 h-4 text-cyan-400" />
                            <span className="hidden sm:inline">Çözüm</span>
                        </Button>
                    )}

                    {/* Sıfırla */}
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleReset}
                        className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 h-9 px-2.5 sm:px-3.5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 cursor-pointer"
                        title="Tüm kelimeleri havuza geri al"
                    >
                        <RotateCcw className="w-4 h-4 text-cyan-400" />
                        <span className="hidden sm:inline">Sıfırla</span>
                    </Button>

                    {/* ══ OYUN ATÖLYESİ TAM EKRAN BUTONU ══ */}
                    <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={toggleFullscreen}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl h-9 px-3 sm:px-4 gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-lg shadow-emerald-900/30 cursor-pointer"
                        title={isFullscreen ? 'Tam Ekrandan Çık (Esc)' : 'Akıllı Tahta Tam Ekran'}
                    >
                        {isFullscreen ? (
                            <>
                                <Minimize2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Küçült</span>
                            </>
                        ) : (
                            <>
                                <Maximize2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Tam Ekran Yap</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* ══ ORTA OYUN ALANI: PARAGRAF VE KELİME TAŞLARI HAVUZU ══ */}
            <div className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-4 overflow-hidden gap-3 sm:gap-4">
                
                {/* ══ 1. PARAGRAF METNİ VE BOŞLUKLAR (ÜST ALAN) ══ */}
                <div className={cn(
                    "flex-1 min-h-[180px] p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border-2 sm:border-3 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/80 border-white/15 shadow-2xl backdrop-blur-xl overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 flex flex-col justify-center",
                    isSketchnote && "bg-[#fefce8] border-[3px] border-[#1e293b] shadow-[6px_6px_0_#1e293b]"
                )}>
                    {renderParagraphWithSlots()}
                </div>

                {/* ══ 2. KELİME TAŞLARI DESTESİ (ALT ALAN) ══ */}
                <div className="shrink-0 bg-gradient-to-r from-slate-900/95 via-slate-850/95 to-slate-900/95 rounded-2xl sm:rounded-3xl border-2 border-white/10 p-3 sm:p-4 shadow-2xl flex flex-col gap-2.5">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg">🔤</span>
                            <span className="text-xs sm:text-sm font-black text-white">
                                {availableTiles.length > 0 
                                    ? `Kullanılabilir Kelime Taşları (${availableTiles.length})` 
                                    : '🎉 Tüm kelimeler boşluklara yerleştirildi!'}
                            </span>
                        </div>
                        <span className="text-[11px] sm:text-xs text-amber-300 font-bold hidden sm:inline">
                            {selectedTileId 
                                ? '👉 Şimdi kelimeyi yerleştirmek istediğiniz boşluğa [?] dokunun!' 
                                : '👆 Kelimeye dokunup ardından yukarıdaki boşluğa basın.'}
                        </span>
                    </div>

                    {/* Kelime Taşları Izgarası */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 max-h-[140px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/20">
                        <AnimatePresence>
                            {availableTiles.map(tile => {
                                const isSelected = selectedTileId === tile.id;
                                return (
                                    <motion.button
                                        key={tile.id}
                                        layout
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => handleTileClick(tile)}
                                        className={cn(
                                            "relative flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base md:text-lg transition-all cursor-pointer select-none border-2",
                                            tile.colorClass,
                                            isSelected && "ring-4 ring-amber-400 -translate-y-1 scale-105",
                                            isSketchnote && "border-2 border-[#1e293b] shadow-[3px_3px_0_#1e293b]"
                                        )}
                                    >
                                        <GripVertical className="w-4 h-4 opacity-75 shrink-0" />
                                        <span>{tile.word}</span>
                                    </motion.button>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* ══ 3. KONTROL ET & SONUÇ ALANI ══ */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                            {isChecked && (
                                isAllCorrect ? (
                                    <span className="flex items-center gap-1.5 text-emerald-400 font-black text-sm sm:text-base animate-bounce">
                                        <Award className="w-5 h-5" /> Harika! Tüm boşluklar doğru dolduruldu! 🏆 (+300 XP)
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-rose-400 font-black text-xs sm:text-sm">
                                        <XCircle className="w-4 h-4" /> Kırmızı işaretlenen kelimeler yanlış yerde. Tekrar deneyin!
                                    </span>
                                )
                            )}
                        </div>

                        {/* Büyük 3D Kontrol Butonu */}
                        <Button
                            type="button"
                            onClick={handleCheckAnswers}
                            disabled={filledCount === 0}
                            className={cn(
                                "h-11 sm:h-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-xs sm:text-base font-black transition-all cursor-pointer shadow-lg",
                                isAllCorrect
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_5px_0_#065f46]"
                                    : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-[0_5px_0_#b45309] active:translate-y-1 active:shadow-[0_1px_0_#b45309]"
                            )}
                        >
                            <CheckCheck className="w-5 h-5 mr-1.5 stroke-[2.5]" />
                            <span>{isChecked ? 'Tekrar Kontrol Et' : 'Cevapları Kontrol Et'}</span>
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
}
