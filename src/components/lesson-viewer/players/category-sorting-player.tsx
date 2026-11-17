'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, CheckCircle2, XCircle, RotateCcw, 
    Lightbulb, Eye, Check, X, Award, HelpCircle, GripVertical, 
    Layers, Maximize2, Minimize2, Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import type { CategorySortStep, CategorySortCategory, CategorySortItem } from '@/lib/types';
import { useAuth } from '@/context/auth-context';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

// 🎨 Oyunlar Klasörü Canlı Sandık Temaları (3D Arcade)
const CATEGORY_THEMES: Record<string, {
    container: string;
    header: string;
    badge: string;
    basket: string;
    placedCard: string;
    ring: string;
    shadow3D: string;
    glow: string;
}> = {
    emerald: {
        container: 'bg-slate-900/70 border-4 border-emerald-400 border-b-[8px] border-b-emerald-600 shadow-xl',
        header: 'bg-emerald-500 text-white shadow-[0_3px_0_#047857]',
        badge: 'bg-emerald-300 text-slate-950 font-black',
        basket: 'bg-slate-950/50 border-2 border-emerald-500/20 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-b-4 border-slate-300 shadow-md',
        ring: 'ring-4 ring-emerald-400 border-emerald-400',
        shadow3D: 'shadow-[0_8px_0_#064e3b]',
        glow: 'shadow-[0_0_25px_rgba(16,185,129,0.4)]'
    },
    amber: {
        container: 'bg-slate-900/70 border-4 border-amber-400 border-b-[8px] border-b-amber-600 shadow-xl',
        header: 'bg-amber-400 text-slate-950 shadow-[0_3px_0_#b45309]',
        badge: 'bg-amber-300 text-slate-950 font-black',
        basket: 'bg-slate-950/50 border-2 border-amber-500/20 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-b-4 border-slate-300 shadow-md',
        ring: 'ring-4 ring-amber-400 border-amber-400',
        shadow3D: 'shadow-[0_8px_0_#78350f]',
        glow: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]'
    },
    indigo: {
        container: 'bg-slate-900/70 border-4 border-indigo-400 border-b-[8px] border-b-indigo-600 shadow-xl',
        header: 'bg-indigo-500 text-white shadow-[0_3px_0_#3730a3]',
        badge: 'bg-indigo-300 text-slate-950 font-black',
        basket: 'bg-slate-950/50 border-2 border-indigo-500/20 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-b-4 border-slate-300 shadow-md',
        ring: 'ring-4 ring-indigo-400 border-indigo-400',
        shadow3D: 'shadow-[0_8px_0_#312e81]',
        glow: 'shadow-[0_0_25px_rgba(99,102,241,0.4)]'
    },
    rose: {
        container: 'bg-slate-900/70 border-4 border-rose-400 border-b-[8px] border-b-rose-600 shadow-xl',
        header: 'bg-rose-500 text-white shadow-[0_3px_0_#9f1239]',
        badge: 'bg-rose-300 text-slate-950 font-black',
        basket: 'bg-slate-950/50 border-2 border-rose-500/20 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-b-4 border-slate-300 shadow-md',
        ring: 'ring-4 ring-rose-400 border-rose-400',
        shadow3D: 'shadow-[0_8px_0_#881337]',
        glow: 'shadow-[0_0_25px_rgba(244,63,94,0.4)]'
    },
    cyan: {
        container: 'bg-slate-900/70 border-4 border-cyan-400 border-b-[8px] border-b-cyan-600 shadow-xl',
        header: 'bg-cyan-500 text-slate-900 shadow-[0_3px_0_#0e7490]',
        badge: 'bg-cyan-300 text-slate-950 font-black',
        basket: 'bg-slate-950/50 border-2 border-cyan-500/20 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-b-4 border-slate-300 shadow-md',
        ring: 'ring-4 ring-cyan-400 border-cyan-400',
        shadow3D: 'shadow-[0_8px_0_#155e75]',
        glow: 'shadow-[0_0_25px_rgba(6,182,212,0.4)]'
    },
    purple: {
        container: 'bg-slate-900/70 border-4 border-purple-400 border-b-[8px] border-b-purple-600 shadow-xl',
        header: 'bg-purple-500 text-white shadow-[0_3px_0_#6b21a8]',
        badge: 'bg-purple-300 text-slate-950 font-black',
        basket: 'bg-slate-950/50 border-2 border-purple-500/20 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-b-4 border-slate-300 shadow-md',
        ring: 'ring-4 ring-purple-400 border-purple-400',
        shadow3D: 'shadow-[0_8px_0_#581c87]',
        glow: 'shadow-[0_0_25px_rgba(168,85,247,0.4)]'
    }
};

const DEFAULT_COLOR_ORDER = ['emerald', 'amber', 'indigo', 'rose', 'cyan', 'purple'];

export function CategorySortingPlayer({
    step,
    isFullscreen: propIsFullscreen,
    fontSizeScale = 'normal',
    presentationTheme = 'clean-light',
}: {
    step: CategorySortStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
}) {
    const isTeacher = useTeacherMode();
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

    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Kategoriler ve Maddeler
    const categories: CategorySortCategory[] = useMemo(() => {
        if (Array.isArray(step.categories) && step.categories.length > 0) {
            return step.categories;
        }
        return [
            { id: 'cat-1', name: 'Farz Namazlar', badge: 'Kesin Emir', description: 'Kılınması farz olan namazlar', color: 'emerald' },
            { id: 'cat-2', name: 'Vacip Namazlar', badge: 'Gerekli', description: 'Yerine getirilmesi vacip olanlar', color: 'amber' },
            { id: 'cat-3', name: 'Sünnet Namazlar', badge: 'Örnek İbadet', description: 'Peygamberimizin sünnetleri', color: 'indigo' },
        ];
    }, [step.categories]);

    const rawItems: CategorySortItem[] = useMemo(() => {
        if (Array.isArray(step.items) && step.items.length > 0) {
            return step.items;
        }
        return [
            { id: 'item-1', text: 'Sabah Namazının Farzı', categoryId: 'cat-1', hint: 'Günde 5 vakit olan temel namazlardandır.' },
            { id: 'item-2', text: 'Vitir Namazı', categoryId: 'cat-2', hint: 'Yatsıdan sonra 3 rekat kılınan vaciptir.' },
            { id: 'item-3', text: 'Teravih Namazı', categoryId: 'cat-3', hint: 'Ramazan gecelerinde kılınan sünnettir.' },
            { id: 'item-4', text: 'Cuma Namazının Farzı', categoryId: 'cat-1', hint: 'Haftada bir gün cemaatle kılınması farzdır.' },
            { id: 'item-5', text: 'Bayram Namazı', categoryId: 'cat-2', hint: 'Yılda iki kez kılınan vacip namazdır.' },
            { id: 'item-6', text: 'Kuşluk (Duha) Namazı', categoryId: 'cat-3', hint: 'Gündüz kılınan nafile bir sünnettir.' }
        ];
    }, [step.items]);

    const [poolItems, setPoolItems] = useState<CategorySortItem[]>([]);

    useEffect(() => {
        setPoolItems([...rawItems].sort(() => Math.random() - 0.5));
    }, [rawItems]);

    // State'ler
    const [placements, setPlacements] = useState<{ [itemId: string]: string }>({});
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [showHints, setShowHints] = useState(false);
    const [wrongAttemptInfo, setWrongAttemptInfo] = useState<{ itemId: string; categoryId: string } | null>(null);
    const [shakingItemId, setShakingItemId] = useState<string | null>(null);

    useEffect(() => {
        setPlacements({});
        setSelectedItemId(null);
        setWrongAttemptInfo(null);
        setShakingItemId(null);
    }, [step]);

    const unplacedItems = useMemo(() => {
        return poolItems.filter(item => !placements[item.id]);
    }, [poolItems, placements]);

    const isItemBelongsToCategory = (item: CategorySortItem, cat: CategorySortCategory) => {
        return item.categoryId === cat.id || item.categoryId?.toLowerCase() === cat.name.toLowerCase();
    };

    // 🎯 OYUN KURALI: DOĞRU OLMAYAN KATEGORİYE ASLA YERLEŞMESİN!
    const tryPlaceItemIntoCategory = (itemId: string, categoryId: string) => {
        const item = rawItems.find(i => i.id === itemId);
        const cat = categories.find(c => c.id === categoryId);

        if (!item || !cat) return;

        const isMatch = isItemBelongsToCategory(item, cat);

        if (isMatch) {
            playSound('pop');
            const newPlacements = {
                ...placements,
                [itemId]: categoryId
            };
            setPlacements(newPlacements);
            setSelectedItemId(null);
            setWrongAttemptInfo(null);
            setShakingItemId(null);

            if (Object.keys(newPlacements).length >= rawItems.length) {
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
            playSound('incorrect');
            setWrongAttemptInfo({ itemId, categoryId });
            setShakingItemId(itemId);
            setTimeout(() => {
                setWrongAttemptInfo(null);
                setShakingItemId(null);
            }, 800);
        }
    };

    const handleItemClick = (itemId: string) => {
        playSound('pop');
        setWrongAttemptInfo(null);
        setShakingItemId(null);
        if (selectedItemId === itemId) {
            setSelectedItemId(null);
        } else {
            setSelectedItemId(itemId);
        }
    };

    const handleCategoryClick = (categoryId: string) => {
        if (selectedItemId) {
            tryPlaceItemIntoCategory(selectedItemId, categoryId);
        }
    };

    const handleReset = () => {
        playSound('pop');
        setPlacements({});
        setSelectedItemId(null);
        setWrongAttemptInfo(null);
        setShakingItemId(null);
        setPoolItems([...rawItems].sort(() => Math.random() - 0.5));
    };

    const handleRevealSolution = () => {
        playSound('pop');
        const solvedPlacements: { [itemId: string]: string } = {};
        rawItems.forEach(item => {
            const matchedCat = categories.find(c => isItemBelongsToCategory(item, c));
            solvedPlacements[item.id] = matchedCat ? matchedCat.id : item.categoryId;
        });
        setPlacements(solvedPlacements);
        setSelectedItemId(null);
        setWrongAttemptInfo(null);
        setShakingItemId(null);
    };

    const totalCount = rawItems.length;
    const placedCount = Object.keys(placements).length;
    const isCompleted = placedCount >= totalCount && totalCount > 0;
    const progressPercentage = (placedCount / totalCount) * 100;

    const gridColsClass = useMemo(() => {
        if (categories.length === 2) return "grid-cols-1 md:grid-cols-2";
        if (categories.length === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    }, [categories.length]);

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
            {/* Arkaplan Parıltı Efektleri */}
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
                        {/* Sol: İkon & Başlık */}
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                            <div className="bg-cyan-500/20 p-2 sm:p-2.5 rounded-2xl shrink-0 border border-cyan-500/30">
                                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-xl md:text-2xl font-black text-white truncate">
                                    {step.title || 'Kategorilere Yerleştirme'}
                                </h1>
                                <p className="text-slate-400 text-xs md:text-sm hidden sm:block truncate">
                                    Kavrama dokun, doğru sandığa yerleşsin! Yanlış sandık kabul edilmez.
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
                                    title="Öğretmen Modu: Tüm kartları doğru sandıklara yerleştir"
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

                            {/* Kupa & Sayaç Rozeti */}
                            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-yellow-500/30">
                                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                                <span className="font-black text-sm sm:text-base text-yellow-400 tabular-nums">
                                    {placedCount}/{totalCount}
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

                {/* ══ 2. OYUN ALANI: KATEGORİ SANDIKLARI (ÜST ALAN) ══ */}
                <div className={cn(
                    "flex-1 min-h-[190px] grid gap-3 sm:gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 p-1",
                    gridColsClass
                )}>
                    {categories.map((cat, catIdx) => {
                        const themeKey = cat.color || DEFAULT_COLOR_ORDER[catIdx % DEFAULT_COLOR_ORDER.length];
                        const theme = CATEGORY_THEMES[themeKey] || CATEGORY_THEMES.emerald;
                        
                        const placedInThisCat = rawItems.filter(item => placements[item.id] === cat.id);
                        const isDropTargetReady = Boolean(selectedItemId);
                        const isWrongTarget = wrongAttemptInfo?.categoryId === cat.id;

                        return (
                            <div
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className={cn(
                                    "flex flex-col rounded-3xl transition-all duration-200 overflow-hidden relative min-h-[180px]",
                                    theme.container,
                                    isDropTargetReady && !isWrongTarget && cn("cursor-pointer ring-4 animate-pulse scale-[1.01]", theme.ring, theme.glow),
                                    isWrongTarget && "ring-4 ring-red-500 border-red-500 animate-shake shadow-[0_0_25px_rgba(239,68,68,0.6)]"
                                )}
                            >
                                {/* Sandık Başlığı */}
                                <div className={cn(
                                    "shrink-0 flex items-center justify-between px-4 py-3 transition-all",
                                    theme.header
                                )}>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="font-black text-base sm:text-lg md:text-xl lg:text-2xl tracking-tight truncate drop-shadow-md">
                                            {cat.name}
                                        </h3>
                                        {cat.description && (
                                            <p className="text-xs opacity-90 truncate font-bold">
                                                {cat.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1.5">
                                        {cat.badge && (
                                            <span className={cn(
                                                "text-xs font-black px-2.5 py-0.5 rounded-full border shadow-xs hidden md:inline-block",
                                                theme.badge
                                            )}>
                                                {cat.badge}
                                            </span>
                                        )}
                                        <span className="text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full bg-black/30 text-white border border-white/20">
                                            {placedInThisCat.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Sandık İçi (Kavram Yuvası) */}
                                <div className={cn(
                                    "flex-1 p-3 overflow-y-auto flex flex-col gap-2 relative",
                                    theme.basket
                                )}>
                                    {placedInThisCat.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-white/20 rounded-2xl">
                                            <span className="text-2xl sm:text-3xl mb-1 opacity-70">📥</span>
                                            <span className="text-xs sm:text-sm font-black text-slate-300">
                                                {isDropTargetReady ? '👉 Seçili Kavramı Buraya Bırak' : 'Bu kategoriye ait kavramları seçin'}
                                            </span>
                                        </div>
                                    ) : (
                                        placedInThisCat.map(item => (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ scale: 0.8, y: -10, opacity: 0 }}
                                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                                className={cn(
                                                    "relative flex items-center justify-between gap-2 p-3 rounded-2xl font-black transition-all",
                                                    theme.placedCard
                                                )}
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                    <span className="text-sm sm:text-base font-black leading-snug tracking-tight text-slate-900">
                                                        {item.text}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ══ 3. KAVRAM KARTLARI DESTESİ (WordButton Stili) ══ */}
                <div className="shrink-0 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/10 p-3 sm:p-5 shadow-2xl flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                            <span>🎴</span>
                            {unplacedItems.length > 0 
                                ? `Kavram Kartları (${unplacedItems.length})` 
                                : '🎉 Tüm kavramlar doğru sandıklarına yerleştirildi!'}
                        </span>
                        {wrongAttemptInfo ? (
                            <span className="text-xs sm:text-sm font-black text-red-400 animate-shake flex items-center gap-1">
                                <XCircle className="w-4 h-4" /> Yanlış Sandık! Bu kavram oraya ait değil.
                            </span>
                        ) : selectedItemId ? (
                            <span className="text-xs sm:text-sm font-black text-cyan-300 animate-pulse">
                                👉 Şimdi bu kavramın ait olduğu kategori sandığına dokunun!
                            </span>
                        ) : (
                            <span className="text-[11px] sm:text-xs text-slate-400 font-bold hidden sm:inline">
                                👆 Önce bir kavrama dokunun, ardından doğru sandığa basın.
                            </span>
                        )}
                    </div>

                    {/* 3D Taş Butonları Izgarası (WordButton) */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-h-[160px] sm:max-h-[190px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/20">
                        <AnimatePresence>
                            {unplacedItems.map(item => {
                                const isSelected = selectedItemId === item.id;
                                const isShaking = shakingItemId === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleItemClick(item.id)}
                                        className={cn(
                                            "relative group px-6 py-3.5 sm:px-8 sm:py-4 md:px-9 md:py-5 rounded-2xl font-black text-base sm:text-lg md:text-xl transition-all duration-200 border-b-[6px] sm:border-b-[8px] active:border-b-0 active:translate-y-2 outline-none select-none touch-manipulation cursor-pointer shadow-xl",
                                            "bg-white text-slate-900 border-slate-300 hover:bg-amber-50",
                                            isShaking && "animate-shake bg-red-500 border-red-700 !text-white",
                                            isSelected && !isShaking && "ring-4 ring-amber-400 bg-amber-100 -translate-y-1 scale-105 border-amber-400 shadow-[0_8px_0_#b45309]"
                                        )}
                                    >
                                        <span className="relative z-10 drop-shadow-sm">{item.text}</span>
                                        {showHints && item.hint && (
                                            <span 
                                                className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold"
                                                title={item.hint}
                                            >
                                                💡
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Tebrik Kartı */}
                    {isCompleted && (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-slate-900/90 border border-green-500/40 p-4 sm:p-5 rounded-2xl shadow-2xl flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="bg-green-500/20 p-2.5 rounded-full shrink-0">
                                    <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xl sm:text-2xl font-black text-green-400">Harika Başardın!</p>
                                    <p className="text-xs sm:text-sm text-slate-300 font-bold">Tüm kavramları doğru kategorilere başarıyla yerleştirdin. (+350 XP)</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleReset}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl h-9 px-4 text-xs shadow-md cursor-pointer"
                            >
                                Yeniden Oyna
                            </Button>
                        </motion.div>
                    )}
                </div>

            </div>
        </div>
    );
}
