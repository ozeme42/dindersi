'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, CheckCircle2, XCircle, RotateCcw, 
    Lightbulb, Eye, Trophy, Maximize2, Minimize2, 
    MousePointerClick, Check, X, Award
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

// 🎨 Cümle Oluşturma Oyunundaki Canlı Renk Paleti (WordButton)
const WORD_COLORS = [
    'bg-indigo-500 hover:bg-indigo-400 border-indigo-700 text-white',
    'bg-pink-500 hover:bg-pink-400 border-pink-700 text-white',
    'bg-cyan-500 hover:bg-cyan-400 border-cyan-700 text-slate-900',
    'bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white',
    'bg-amber-400 hover:bg-amber-300 border-amber-600 text-slate-900',
    'bg-violet-500 hover:bg-violet-400 border-violet-700 text-white',
    'bg-rose-500 hover:bg-rose-400 border-rose-700 text-white',
    'bg-lime-500 hover:bg-lime-400 border-lime-700 text-slate-900',
];

type WordTile = {
    id: string;
    word: string;
    isDistractor?: boolean;
    colorClass: string;
};

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
    const containerRef = useRef<HTMLDivElement>(null);

    // Bağımsız Tam Ekran State'i
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));

    // Canlı Font Büyütme/Küçültme Seviyesi (0: Normal, 1: Büyük, 2: Çok Büyük, 3: Dev Tahta)
    const initialLevel = fontSizeScale === 'huge' || fontSizeScale === 'xl' ? 3 :
                         fontSizeScale === 'lg' ? 2 : 1;
    const [fontLevel, setFontLevel] = useState<number>(initialLevel);

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
            colorClass: WORD_COLORS[idx % WORD_COLORS.length],
        }));
    }, [blanks, distractors]);

    // State'ler
    const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
    const [placements, setPlacements] = useState<{ [slotId: string]: WordTile | null }>({});
    const [showHints, setShowHints] = useState(false);
    const [wrongAttemptSlotId, setWrongAttemptSlotId] = useState<string | null>(null);
    const [shakingTileId, setShakingTileId] = useState<string | null>(null);

    // Yeni adıma geçildiğinde sıfırla
    useEffect(() => {
        setPlacements({});
        setSelectedTileId(null);
        setSelectedSlotId(null);
        setWrongAttemptSlotId(null);
        setShakingTileId(null);
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

    // 🎯 OYUN ATÖLYESİ KURALI: DOĞRU OLMAYAN KELİME BOŞLUĞA YERLEŞMESİN!
    const tryPlaceWordInSlot = (slotId: string, tile: WordTile) => {
        const blank = blanks.find(b => b.id === slotId);
        if (!blank) return;

        const isMatch = tile.word.trim().toLowerCase() === blank.targetWord.trim().toLowerCase();

        if (isMatch) {
            // ✅ DOĞRU: Boşluğa yerleşir, başarı sesi
            playSound('pop');
            const newPlacements = {
                ...placements,
                [slotId]: tile
            };
            setPlacements(newPlacements);
            setSelectedTileId(null);
            setSelectedSlotId(null);
            setWrongAttemptSlotId(null);
            setShakingTileId(null);

            // Tüm boşluklar doldu mu?
            if (Object.keys(newPlacements).length >= blanks.length) {
                playSound('win');
                import('canvas-confetti').then(m => {
                    m.default({
                        particleCount: 150,
                        spread: 100,
                        origin: { y: 0.6 }
                    });
                }).catch(() => {});
            }
        } else {
            // ❌ YANLIŞ: Boşluğa YERLEŞMEZ! Hata sesi ve kırmızı sarsıntı
            playSound('incorrect');
            setWrongAttemptSlotId(slotId);
            setShakingTileId(tile.id);
            setTimeout(() => {
                setWrongAttemptSlotId(null);
                setShakingTileId(null);
            }, 800);
        }
    };

    // Kelime taşına tıklandığında
    const handleTileClick = (tile: WordTile) => {
        playSound('pop');
        setWrongAttemptSlotId(null);
        setShakingTileId(null);

        if (selectedSlotId) {
            // Önceden seçilmiş bir boşluk varsa doğrudan oraya dene
            tryPlaceWordInSlot(selectedSlotId, tile);
        } else {
            // Taşı seç veya seçimi kaldır
            setSelectedTileId(prev => (prev === tile.id ? null : tile.id));
        }
    };

    // Paragraftaki bir boşluğa tıklandığında
    const handleSlotClick = (slotId: string) => {
        playSound('pop');
        if (placements[slotId]) {
            return; // Doğru yerleşmiş kelime sabit kalır
        }

        if (selectedTileId) {
            const tile = initialPool.find(t => t.id === selectedTileId);
            if (tile) {
                tryPlaceWordInSlot(slotId, tile);
            }
        } else {
            setSelectedSlotId(prev => (prev === slotId ? null : slotId));
        }
    };

    // Sıfırla
    const handleReset = () => {
        playSound('pop');
        setPlacements({});
        setSelectedTileId(null);
        setSelectedSlotId(null);
        setWrongAttemptSlotId(null);
        setShakingTileId(null);
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
                    colorClass: 'bg-emerald-500 border-emerald-700 text-white'
                };
            }
        });
        setPlacements(solvedPlacements);
        setSelectedTileId(null);
        setSelectedSlotId(null);
        setWrongAttemptSlotId(null);
        setShakingTileId(null);
    };

    const totalBlanks = blanks.length;
    const filledCount = blanks.filter(b => Boolean(placements[b.id])).length;
    const isCompleted = filledCount >= totalBlanks && totalBlanks > 0;
    const progressPercentage = (filledCount / totalBlanks) * 100;

    // Dinamik Font Boyutu Hesaplayıcıları
    const getParagraphTextClass = () => {
        switch (fontLevel) {
            case 0: return "text-base sm:text-xl md:text-2xl leading-relaxed";
            case 1: return "text-lg sm:text-2xl md:text-3xl lg:text-4xl leading-relaxed";
            case 2: return "text-xl sm:text-3xl md:text-4xl lg:text-5xl leading-loose";
            case 3: return "text-2xl sm:text-4xl md:text-5xl lg:text-6xl leading-loose";
            default: return "text-lg sm:text-2xl md:text-3xl lg:text-4xl leading-relaxed";
        }
    };

    const getPlacedWordTextClass = () => {
        switch (fontLevel) {
            case 0: return "text-base sm:text-lg md:text-xl px-4 py-2";
            case 1: return "text-lg sm:text-2xl md:text-3xl px-5 py-2.5 sm:px-7 sm:py-3.5";
            case 2: return "text-xl sm:text-3xl md:text-4xl px-6 py-3 sm:px-8 sm:py-4";
            case 3: return "text-2xl sm:text-4xl md:text-5xl px-7 py-3.5 sm:px-9 sm:py-4.5";
            default: return "text-lg sm:text-2xl md:text-3xl px-5 py-2.5 sm:px-7 sm:py-3.5";
        }
    };

    const getAvailableTileClass = () => {
        switch (fontLevel) {
            case 0: return "px-4 py-2 sm:px-6 sm:py-3 text-base sm:text-lg";
            case 1: return "px-6 py-3.5 sm:px-8 sm:py-4 md:px-10 md:py-5 text-lg sm:text-xl md:text-2xl";
            case 2: return "px-7 py-4 sm:px-9 sm:py-5 md:px-12 md:py-6 text-xl sm:text-2xl md:text-3xl";
            case 3: return "px-8 py-4.5 sm:px-10 sm:py-6 md:px-14 md:py-7 text-2xl sm:text-3xl md:text-4xl";
            default: return "px-6 py-3.5 sm:px-8 sm:py-4 md:px-10 md:py-5 text-lg sm:text-xl md:text-2xl";
        }
    };

    // Paragrafı render et
    const renderParagraphWithSlots = () => {
        const parts = paragraphText.split(/(\[\d+\])/g);

        return (
            <div className={cn(
                "font-black tracking-normal transition-all text-center text-white drop-shadow-md",
                getParagraphTextClass()
            )}>
                {parts.map((part, index) => {
                    const match = part.match(/\[(\d+)\]/);
                    if (!match) {
                        return <span key={index} className="mx-1">{part}</span>;
                    }

                    const slotId = match[1];
                    const blankItem = blanks.find(b => b.id === slotId);
                    const placedTile = placements[slotId];
                    const isTargetSlot = selectedSlotId === slotId;
                    const isTargetTileReady = Boolean(selectedTileId);
                    const isWrongAttempt = wrongAttemptSlotId === slotId;

                    return (
                        <span
                            key={index}
                            onClick={() => handleSlotClick(slotId)}
                            className="inline-flex items-center align-middle mx-2 my-2 cursor-pointer select-none"
                        >
                            {placedTile ? (
                                <motion.span
                                    layout
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    className={cn(
                                        "bg-white text-slate-900 rounded-2xl font-black shadow-xl border-b-[6px] border-slate-300 inline-flex items-center gap-2 animate-in zoom-in duration-200",
                                        getPlacedWordTextClass()
                                    )}
                                >
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 inline-block" />
                                    <span>{placedTile.word}</span>
                                </motion.span>
                            ) : (
                                <span
                                    className={cn(
                                        "inline-flex items-center justify-center min-w-[120px] sm:min-w-[160px] h-12 sm:h-16 px-4 py-2 rounded-2xl border-4 border-dashed font-black text-center transition-all",
                                        isWrongAttempt && "border-red-500 bg-red-500/20 text-red-300 ring-4 ring-red-500 animate-shake",
                                        !isWrongAttempt && isTargetSlot && "border-amber-400 bg-amber-400/20 text-amber-200 ring-4 ring-amber-400/40 animate-pulse scale-105",
                                        !isWrongAttempt && !isTargetSlot && isTargetTileReady && "border-cyan-400 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50 animate-pulse",
                                        !isWrongAttempt && !isTargetSlot && !isTargetTileReady && "border-slate-600 bg-slate-900/80 text-slate-400 hover:border-slate-400 hover:bg-slate-850"
                                    )}
                                >
                                    <span className="text-sm sm:text-base md:text-xl opacity-90 font-mono">
                                        [{slotId}] Boşluk
                                    </span>
                                    {showHints && blankItem?.hint && (
                                        <span 
                                            className="ml-1.5 text-sm text-amber-300 font-normal" 
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
                "relative flex flex-col w-full overflow-hidden select-none transition-all duration-300 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white",
                isFullscreen 
                    ? "fixed inset-0 z-[100] p-3 sm:p-6 w-full h-full" 
                    : "w-full h-full rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl p-3 sm:p-5"
            )}
        >
            {/* Arkaplan Parıltı Efektleri (Oyunlar Klasöründeki Gibi) */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-25">
                <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 flex flex-col w-full h-full gap-3 sm:gap-4 justify-between">
                
                {/* ══ 1. HUD / BAŞLIK KONTROL BARI (Oyunlar Sayfası Stili) ══ */}
                <div className="bg-slate-900/70 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden shrink-0">
                    {/* Altta İlerleme Çizgisi */}
                    <div className="absolute bottom-0 left-0 h-1.5 bg-slate-800 w-full">
                        <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-700" 
                            style={{ width: `${progressPercentage}%` }} 
                        />
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        {/* Sol: İkon & Oyun Adı */}
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                            <div className="bg-cyan-500/20 p-2 sm:p-2.5 rounded-2xl shrink-0 border border-cyan-500/30">
                                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-xl md:text-2xl font-black text-white truncate">
                                    {step.title || 'Boşluk Doldurma'}
                                </h1>
                                <p className="text-slate-400 text-xs md:text-sm hidden sm:block truncate">
                                    Kelimeye tıkla, doğru boşluğa yerleşsin! Yanlış kelime oturmaz.
                                </p>
                            </div>
                        </div>

                        {/* Sağ: İpuçları, Çözüm, Sayaç ve Tam Ekran Butonları */}
                        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                            {/* İpucu */}
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    playSound('pop');
                                    setShowHints(!showHints);
                                }}
                                className={cn(
                                    "rounded-xl text-xs sm:text-sm font-bold gap-1 h-9 px-2.5 sm:px-3 text-amber-300 hover:text-white hover:bg-white/10 border border-amber-500/30",
                                    showHints && "bg-amber-500/20 border-amber-400 text-amber-200"
                                )}
                                title="İpuçlarını Göster"
                            >
                                <Lightbulb className="w-4 h-4 text-amber-400" />
                                <span className="hidden md:inline">{showHints ? 'İpuçları Açık' : 'İpucu'}</span>
                            </Button>

                            {/* Çözümü Göster (Öğretmen) */}
                            {isTeacher && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleRevealSolution}
                                    className="rounded-xl text-xs sm:text-sm font-bold gap-1 h-9 px-2.5 sm:px-3 text-cyan-300 hover:text-white hover:bg-white/10 border border-cyan-500/30 cursor-pointer"
                                    title="Öğretmen Modu: Tüm boşlukları doldur"
                                >
                                    <Eye className="w-4 h-4 text-cyan-400" />
                                    <span className="hidden md:inline">Çözüm</span>
                                </Button>
                            )}

                            {/* Sıfırla */}
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={handleReset}
                                className="rounded-xl text-xs sm:text-sm font-bold gap-1 h-9 px-2.5 sm:px-3 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 cursor-pointer"
                                title="Yeniden Başlat"
                            >
                                <RotateCcw className="w-4 h-4 text-cyan-400" />
                                <span className="hidden md:inline">Sıfırla</span>
                            </Button>

                            {/* Canlı Font Ölçekleyici (A- / A+) */}
                            <div className="flex items-center bg-slate-950/80 px-2 py-1 rounded-xl border border-white/10 gap-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setFontLevel(prev => Math.max(0, prev - 1))}
                                    disabled={fontLevel <= 0}
                                    className="h-7 w-7 p-0 text-slate-300 hover:text-white font-black hover:bg-white/10 disabled:opacity-30"
                                    title="Yazıyı Küçült (A-)"
                                >
                                    A-
                                </Button>
                                <span className="text-[11px] font-mono font-bold text-amber-300 min-w-[20px] text-center select-none">
                                    {fontLevel === 0 ? 'N' : fontLevel === 1 ? 'L' : fontLevel === 2 ? 'XL' : 'XXL'}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setFontLevel(prev => Math.min(3, prev + 1))}
                                    disabled={fontLevel >= 3}
                                    className="h-7 w-7 p-0 text-amber-400 hover:text-white font-black hover:bg-white/10 disabled:opacity-30"
                                    title="Yazıyı Büyüt (A+)"
                                >
                                    A+
                                </Button>
                            </div>

                            {/* Kupa & Sayaç Rozeti */}
                            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-yellow-500/30">
                                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                                <span className="font-black text-sm sm:text-base text-yellow-400 tabular-nums">
                                    {filledCount}/{totalBlanks}
                                </span>
                            </div>

                            {/* Tam Ekran Butonu */}
                            <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={toggleFullscreen}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl h-9 px-3 sm:px-4 gap-1.5 text-xs sm:text-sm shadow-lg shadow-emerald-900/30 cursor-pointer"
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
                                        <span className="hidden sm:inline">Tam Ekran</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ══ 2. OYUN ALANI: PARAGRAF VE BOŞLUKLAR (Cumle-Olusturma Kutusu) ══ */}
                <div className={cn(
                    "flex-1 min-h-[160px] bg-slate-900/50 backdrop-blur-sm rounded-3xl border-4 border-dashed transition-all duration-500 p-5 sm:p-8 md:p-10 flex flex-col items-center justify-center content-center shadow-inner overflow-y-auto scrollbar-thin scrollbar-thumb-white/20",
                    isCompleted 
                        ? "border-green-500/50 bg-green-950/20 shadow-[0_0_50px_rgba(34,197,94,0.15)]" 
                        : "border-slate-700 hover:border-cyan-500/30"
                )}>
                    {renderParagraphWithSlots()}

                    {/* Tebrik Kartı (Oyunlar Sayfası Tarzı) */}
                    {isCompleted && (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mt-6 bg-slate-900/90 border border-green-500/40 p-4 sm:p-6 rounded-2xl shadow-2xl flex items-center gap-4 sm:gap-6"
                        >
                            <div className="bg-green-500/20 p-2.5 rounded-full shrink-0">
                                <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-xl sm:text-2xl font-black text-green-400">Harika Başardın!</p>
                                <p className="text-xs sm:text-sm text-slate-300 font-bold">Metindeki tüm boşlukları doğru kelimelerle tamamladın. (+300 XP)</p>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* ══ 3. KELİME KARTLARI DESTESİ (WordButton Stili) ══ */}
                <div className="shrink-0 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/10 p-3 sm:p-5 shadow-2xl flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                            <span>🔤</span>
                            {availableTiles.length > 0 
                                ? `Kullanılabilir Kelimeler (${availableTiles.length})` 
                                : '🎉 Tüm kelimeler doğru yerleştirildi!'}
                        </span>
                        {wrongAttemptSlotId ? (
                            <span className="text-xs sm:text-sm font-black text-red-400 animate-shake flex items-center gap-1">
                                <XCircle className="w-4 h-4" /> Yanlış Kelime! O boşluğa uymaz.
                            </span>
                        ) : selectedTileId ? (
                            <span className="text-xs sm:text-sm font-black text-cyan-300 animate-pulse">
                                👉 Şimdi kelimenin gideceği [?] boşluğuna dokun!
                            </span>
                        ) : (
                            <span className="text-[11px] sm:text-xs text-slate-400 font-bold hidden sm:inline">
                                👆 Önce kelimeye tıkla, sonra yukarıdaki boşluğa dokun.
                            </span>
                        )}
                    </div>

                    {/* WordButton Butonları Izgarası */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-h-[160px] sm:max-h-[190px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/20">
                        <AnimatePresence>
                            {availableTiles.map(tile => {
                                const isSelected = selectedTileId === tile.id;
                                const isShaking = shakingTileId === tile.id;

                                return (
                                    <button
                                        key={tile.id}
                                        type="button"
                                        onClick={() => handleTileClick(tile)}
                                        className={cn(
                                            "relative group rounded-2xl font-black transition-all duration-200 border-b-[6px] sm:border-b-[8px] active:border-b-0 active:translate-y-2 outline-none select-none touch-manipulation cursor-pointer shadow-xl",
                                            getAvailableTileClass(),
                                            isShaking && "animate-shake bg-red-500 border-red-700 !text-white",
                                            !isShaking && tile.colorClass,
                                            isSelected && !isShaking && "ring-4 ring-amber-400 -translate-y-1 scale-105"
                                        )}
                                    >
                                        <span className="relative z-10 drop-shadow-md">{tile.word}</span>
                                        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </div>
    );
}
