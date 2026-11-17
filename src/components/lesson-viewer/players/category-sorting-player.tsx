'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FolderKanban, Sparkles, CheckCircle2, XCircle, RotateCcw, 
    Lightbulb, Eye, Check, X, Award, HelpCircle, GripVertical, 
    ArrowDown, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import type { CategorySortStep, CategorySortCategory, CategorySortItem } from '@/lib/types';
import { useAuth } from '@/context/auth-context';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

// Kategori Renk Temaları (Akıllı Tahta Canlı Renkleri)
const CATEGORY_THEMES: Record<string, {
    container: string;
    header: string;
    badge: string;
    slot: string;
    placedCard: string;
    placedCardWrong: string;
    placedCardCorrect: string;
    ring: string;
    glow: string;
}> = {
    emerald: {
        container: 'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400',
        header: 'bg-emerald-900/60 border-emerald-500/40 text-emerald-200',
        badge: 'bg-emerald-500/30 text-emerald-100 border-emerald-400/40',
        slot: 'bg-emerald-950/30 border-emerald-500/30',
        placedCard: 'bg-emerald-600/90 text-white border-emerald-400/60 shadow-emerald-900/40',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-rose-900/50 animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/40',
        ring: 'ring-emerald-400',
        glow: 'shadow-emerald-500/20'
    },
    amber: {
        container: 'bg-amber-950/40 border-amber-500/50 hover:border-amber-400',
        header: 'bg-amber-900/60 border-amber-500/40 text-amber-200',
        badge: 'bg-amber-500/30 text-amber-100 border-amber-400/40',
        slot: 'bg-amber-950/30 border-amber-500/30',
        placedCard: 'bg-amber-600/90 text-white border-amber-400/60 shadow-amber-900/40',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-rose-900/50 animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/40',
        ring: 'ring-amber-400',
        glow: 'shadow-amber-500/20'
    },
    indigo: {
        container: 'bg-indigo-950/40 border-indigo-500/50 hover:border-indigo-400',
        header: 'bg-indigo-900/60 border-indigo-500/40 text-indigo-200',
        badge: 'bg-indigo-500/30 text-indigo-100 border-indigo-400/40',
        slot: 'bg-indigo-950/30 border-indigo-500/30',
        placedCard: 'bg-indigo-600/90 text-white border-indigo-400/60 shadow-indigo-900/40',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-rose-900/50 animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/40',
        ring: 'ring-indigo-400',
        glow: 'shadow-indigo-500/20'
    },
    rose: {
        container: 'bg-rose-950/40 border-rose-500/50 hover:border-rose-400',
        header: 'bg-rose-900/60 border-rose-500/40 text-rose-200',
        badge: 'bg-rose-500/30 text-rose-100 border-rose-400/40',
        slot: 'bg-rose-950/30 border-rose-500/30',
        placedCard: 'bg-rose-600/90 text-white border-rose-400/60 shadow-rose-900/40',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-rose-900/50 animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/40',
        ring: 'ring-rose-400',
        glow: 'shadow-rose-500/20'
    },
    cyan: {
        container: 'bg-cyan-950/40 border-cyan-500/50 hover:border-cyan-400',
        header: 'bg-cyan-900/60 border-cyan-500/40 text-cyan-200',
        badge: 'bg-cyan-500/30 text-cyan-100 border-cyan-400/40',
        slot: 'bg-cyan-950/30 border-cyan-500/30',
        placedCard: 'bg-cyan-600/90 text-slate-950 border-cyan-300 shadow-cyan-900/40 font-black',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-rose-900/50 animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/40',
        ring: 'ring-cyan-400',
        glow: 'shadow-cyan-500/20'
    },
    purple: {
        container: 'bg-purple-950/40 border-purple-500/50 hover:border-purple-400',
        header: 'bg-purple-900/60 border-purple-500/40 text-purple-200',
        badge: 'bg-purple-500/30 text-purple-100 border-purple-400/40',
        slot: 'bg-purple-950/30 border-purple-500/30',
        placedCard: 'bg-purple-600/90 text-white border-purple-400/60 shadow-purple-900/40',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-rose-900/50 animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/40',
        ring: 'ring-purple-400',
        glow: 'shadow-purple-500/20'
    }
};

const DEFAULT_COLOR_ORDER = ['emerald', 'amber', 'indigo', 'rose', 'cyan', 'purple'];

export function CategorySortingPlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal',
    presentationTheme = 'clean-light',
}: {
    step: CategorySortStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';

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

    // Karıştırılmış maddeler havuzu
    const poolItems = useMemo(() => {
        return [...rawItems].sort(() => Math.random() - 0.5);
    }, [rawItems]);

    // State'ler
    // itemId -> categoryId
    const [placements, setPlacements] = useState<{ [itemId: string]: string }>({});
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isChecked, setIsChecked] = useState(false);
    const [showHints, setShowHints] = useState(false);
    const [isAllCorrect, setIsAllCorrect] = useState(false);

    // Adım değiştiğinde sıfırla
    useEffect(() => {
        setPlacements({});
        setSelectedItemId(null);
        setIsChecked(false);
        setIsAllCorrect(false);
    }, [step]);

    // Henüz yerleştirilmemiş havuzdaki maddeler
    const unplacedItems = useMemo(() => {
        return poolItems.filter(item => !placements[item.id]);
    }, [poolItems, placements]);

    // Bir maddeyi kategoriye yerleştir
    const placeItemIntoCategory = (itemId: string, categoryId: string) => {
        playSound('pop');
        setPlacements(prev => ({
            ...prev,
            [itemId]: categoryId
        }));
        setSelectedItemId(null);
        setIsChecked(false);
    };

    // Maddeden kategoriden geri çıkar (havuza döndür)
    const removeItemFromCategory = (itemId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        playSound('pop');
        setPlacements(prev => {
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
        setIsChecked(false);
        setIsAllCorrect(false);
    };

    // Madde kartına tıklandığında
    const handleItemClick = (itemId: string) => {
        playSound('pop');
        if (selectedItemId === itemId) {
            setSelectedItemId(null);
        } else {
            setSelectedItemId(itemId);
        }
    };

    // Kategori kutusuna tıklandığında (seçili madde varsa doğrudan yerleştir)
    const handleCategoryClick = (categoryId: string) => {
        if (selectedItemId) {
            placeItemIntoCategory(selectedItemId, categoryId);
        }
    };

    // Kontrol Et
    const handleCheckAnswers = () => {
        let allFilled = true;
        let allMatch = true;

        rawItems.forEach(item => {
            const placedCatId = placements[item.id];
            if (!placedCatId) {
                allFilled = false;
                allMatch = false;
            } else {
                // Hem ID hem Name kontrolü esnekliği
                const targetCat = categories.find(c => c.id === item.categoryId || c.name.toLowerCase() === item.categoryId.toLowerCase());
                const placedCat = categories.find(c => c.id === placedCatId);
                if (!targetCat || !placedCat || targetCat.id !== placedCat.id) {
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
                    spread: 90,
                    origin: { y: 0.6 }
                });
            }).catch(() => {});
        } else {
            playSound('incorrect');
        }
    };

    // Sıfırla
    const handleReset = () => {
        playSound('pop');
        setPlacements({});
        setSelectedItemId(null);
        setIsChecked(false);
        setIsAllCorrect(false);
    };

    // Çözümü Göster (Öğretmen Modu)
    const handleRevealSolution = () => {
        playSound('pop');
        const solvedPlacements: { [itemId: string]: string } = {};
        rawItems.forEach(item => {
            const matchedCat = categories.find(c => c.id === item.categoryId || c.name.toLowerCase() === item.categoryId.toLowerCase());
            solvedPlacements[item.id] = matchedCat ? matchedCat.id : item.categoryId;
        });
        setPlacements(solvedPlacements);
        setIsChecked(true);
        setIsAllCorrect(true);
    };

    const totalCount = rawItems.length;
    const placedCount = Object.keys(placements).length;

    // Grid kolon sayısı
    const gridColsClass = useMemo(() => {
        if (categories.length === 2) return "grid-cols-1 sm:grid-cols-2";
        if (categories.length === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    }, [categories.length]);

    return (
        <div className={cn(
            "w-full h-full max-h-full flex flex-col items-center justify-between select-none mx-auto overflow-hidden",
            isTeacher ? "max-w-7xl px-3 sm:px-6 py-2 sm:py-3" : "max-w-6xl px-3 py-2",
            isFullscreen && "py-3 sm:py-5"
        )}>
            {/* ══ 1. ÜST PANEL: ROZET VE AKSİYONLAR ══ */}
            <div className="w-full shrink-0 flex flex-wrap items-center justify-between gap-2.5 mb-2 sm:mb-3">
                {/* Sol: Başlık / Rozet */}
                <div className={cn(
                    "inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm sm:text-base md:text-lg font-black uppercase tracking-wider backdrop-blur-xl",
                    isSketchnote
                        ? "bg-[#fde047] text-[#1e293b] border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-['Caveat',cursive] text-xl sm:text-2xl normal-case"
                        : "bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-pink-500/20 border border-purple-400/40 text-purple-200 shadow-md"
                )}>
                    <Layers className="w-5 h-5 text-purple-400 animate-pulse" />
                    <span>{step.title || '📁 Kategorilere Yerleştirme Oyunu'}</span>
                    <span className="text-xs sm:text-sm px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 font-bold">
                        {placedCount} / {totalCount} Yerleşti
                    </span>
                </div>

                {/* Sağ: Aksiyon Butonları */}
                <div className="flex items-center gap-2">
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
                            "rounded-2xl text-xs sm:text-sm md:text-base font-bold gap-2 h-9 sm:h-11 px-3.5 sm:px-4 transition-all cursor-pointer border",
                            showHints 
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                                : "text-slate-300 hover:text-white hover:bg-white/10 border-white/10"
                        )}
                        title="Maddelerin ipuçlarını göster"
                    >
                        <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                        <span className="hidden sm:inline">{showHints ? 'İpuçlarını Gizle' : 'İpuçları'}</span>
                    </Button>

                    {/* Çözümü Göster (Öğretmen) */}
                    {isTeacher && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleRevealSolution}
                            className="rounded-2xl text-xs sm:text-sm md:text-base font-bold gap-2 h-9 sm:h-11 px-3.5 sm:px-4 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 cursor-pointer"
                            title="Öğretmen Modu: Tüm maddeleri doğru kategorilere yerleştir"
                        >
                            <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                            <span className="hidden sm:inline">Çözümü Göster</span>
                        </Button>
                    )}

                    {/* Sıfırla */}
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleReset}
                        className="rounded-2xl text-xs sm:text-sm md:text-base font-bold gap-2 h-9 sm:h-11 px-3.5 sm:px-4 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 cursor-pointer"
                        title="Tüm maddeleri havuza geri al"
                    >
                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Sıfırla</span>
                    </Button>
                </div>
            </div>

            {/* ══ 2. ORTA ALAN: KATEGORİ KUTULARI / SEPETLERİ ══ */}
            <div className="relative w-full flex-1 min-h-0 flex flex-col overflow-hidden mb-3">
                <div className={cn(
                    "w-full h-full grid gap-3 sm:gap-4 p-3 sm:p-4 rounded-3xl bg-slate-900/95 border-2 border-white/10 shadow-2xl backdrop-blur-xl overflow-y-auto scrollbar-thin scrollbar-thumb-white/20",
                    gridColsClass,
                    isSketchnote && "bg-[#fefce8] border-[3px] border-[#1e293b] shadow-[5px_5px_0_#1e293b]"
                )}>
                    {categories.map((cat, catIdx) => {
                        const themeKey = cat.color || DEFAULT_COLOR_ORDER[catIdx % DEFAULT_COLOR_ORDER.length];
                        const theme = CATEGORY_THEMES[themeKey] || CATEGORY_THEMES.emerald;
                        
                        // Bu kategoriye ait yerleştirilmiş maddeler
                        const placedInThisCat = rawItems.filter(item => placements[item.id] === cat.id);
                        const isDropTargetReady = Boolean(selectedItemId);

                        return (
                            <div
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className={cn(
                                    "flex flex-col rounded-3xl border-2 sm:border-3 p-3 sm:p-4 transition-all duration-200 overflow-hidden relative shadow-lg min-h-[160px]",
                                    theme.container,
                                    isDropTargetReady && cn("cursor-pointer border-dashed animate-pulse ring-2", theme.ring),
                                    isSketchnote && "bg-white border-[2.5px] border-[#1e293b] shadow-[4px_4px_0_#1e293b]"
                                )}
                            >
                                {/* Kategori Başlığı ve Rozeti */}
                                <div className="shrink-0 flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
                                    <div>
                                        <h3 className={cn(
                                            "font-black tracking-tight",
                                            fontSizeScale === 'huge' || fontSizeScale === 'xl' ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl",
                                            isSketchnote ? "font-['Caveat',cursive] text-2xl text-[#0f172a]" : "text-white"
                                        )}>
                                            {cat.name}
                                        </h3>
                                        {cat.description && (
                                            <p className="text-xs sm:text-sm text-slate-300/80 font-medium line-clamp-1 mt-0.5">
                                                {cat.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end gap-1">
                                        {cat.badge && (
                                            <span className={cn(
                                                "text-xs font-black px-2.5 py-0.5 rounded-full border shadow-sm",
                                                theme.badge
                                            )}>
                                                {cat.badge}
                                            </span>
                                        )}
                                        <span className="text-[11px] font-bold text-slate-400">
                                            {placedInThisCat.length} Madde
                                        </span>
                                    </div>
                                </div>

                                {/* İç Sepet Alanı (Yerleşen Kartlar) */}
                                <div className="flex-1 min-h-[80px] py-2 flex flex-col gap-2 overflow-y-auto scrollbar-thin">
                                    <AnimatePresence>
                                        {placedInThisCat.map(item => {
                                            const isCorrect = isChecked && (item.categoryId === cat.id || item.categoryId.toLowerCase() === cat.name.toLowerCase());
                                            const isWrong = isChecked && !isCorrect;

                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, scale: 0.85, y: -10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                                    transition={{ duration: 0.2 }}
                                                    onClick={(e) => removeItemFromCategory(item.id, e)}
                                                    className={cn(
                                                        "group flex items-center justify-between p-2.5 sm:p-3.5 rounded-2xl border-2 shadow-md cursor-pointer transition-all",
                                                        !isChecked && theme.placedCard,
                                                        isChecked && isCorrect && theme.placedCardCorrect,
                                                        isChecked && isWrong && theme.placedCardWrong,
                                                        isSketchnote && "border-2 border-[#1e293b]"
                                                    )}
                                                    title="Geri almak için dokunun"
                                                >
                                                    <span className="font-black text-sm sm:text-base md:text-lg">
                                                        {item.text}
                                                    </span>

                                                    <div className="flex items-center gap-1.5 ml-2">
                                                        {isChecked && isCorrect && (
                                                            <Check className="w-5 h-5 text-white" />
                                                        )}
                                                        {isChecked && isWrong && (
                                                            <X className="w-5 h-5 text-white" />
                                                        )}
                                                        {!isChecked && (
                                                            <span className="w-5 h-5 rounded-full bg-black/30 group-hover:bg-black/60 flex items-center justify-center text-xs font-bold transition-all">
                                                                ✕
                                                            </span>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>

                                    {placedInThisCat.length === 0 && (
                                        <div className="my-auto text-center py-4 text-xs sm:text-sm font-semibold text-slate-400/60 border-2 border-dashed border-white/10 rounded-2xl">
                                            {selectedItemId ? (
                                                <span className="text-amber-300 font-bold animate-pulse">
                                                    👆 Buraya yerleştirmek için dokunun
                                                </span>
                                            ) : (
                                                <span>Bu kategoriye madde yerleştirin</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══ 3. ALT PANEL: YERLEŞTİRİLMEYİ BEKLEYEN MADDELER HAVUZU & KONTROL ══ */}
            <div className="w-full shrink-0 p-3.5 sm:p-5 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" /> Yerleştirilmeyi Bekleyenler ({unplacedItems.length} Madde)
                    </span>
                    {selectedItemId ? (
                        <span className="text-xs sm:text-sm font-black text-amber-300 animate-pulse bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40">
                            👆 Yukarıdaki uygun kategori kutusuna dokunun
                        </span>
                    ) : (
                        <span className="text-xs sm:text-sm text-slate-400 font-semibold">
                            Maddeye dokunun, ardından yukarıdaki kategoriye dokunun
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Madde Çipleri / Kartları */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                        {unplacedItems.map(item => {
                            const isSelected = selectedItemId === item.id;

                            return (
                                <motion.button
                                    key={item.id}
                                    type="button"
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => handleItemClick(item.id)}
                                    className={cn(
                                        "px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-2xl sm:rounded-3xl text-sm sm:text-lg md:text-xl font-black transition-all cursor-pointer border-2 sm:border-3 shadow-lg select-none relative group",
                                        !isSelected && "bg-slate-800 hover:bg-slate-700 text-white border-white/20 hover:border-amber-400 shadow-slate-950/50",
                                        isSelected && "bg-white text-slate-950 border-amber-400 ring-4 ring-amber-400/50 scale-105 shadow-2xl"
                                    )}
                                >
                                    <span>{item.text}</span>

                                    {/* İpucu Rozeti (Açıkken) */}
                                    {showHints && item.hint && (
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-950/95 text-amber-200 border border-amber-500/50 text-xs font-bold px-2.5 py-0.5 rounded-lg shadow-xl z-20">
                                            💡 {item.hint}
                                        </span>
                                    )}
                                </motion.button>
                            );
                        })}

                        {unplacedItems.length === 0 && !isAllCorrect && (
                            <span className="text-sm sm:text-base font-bold text-emerald-300">
                                Tüm maddeleri yerleştirdiniz! Cevaplarınızı kontrol edin.
                            </span>
                        )}
                    </div>

                    {/* Kontrol Et Butonu */}
                    <div className="shrink-0">
                        <Button
                            type="button"
                            size="sm"
                            disabled={placedCount === 0 || isAllCorrect}
                            onClick={handleCheckAnswers}
                            className={cn(
                                "h-12 sm:h-14 px-6 sm:px-8 rounded-2xl sm:rounded-3xl font-black text-xs sm:text-base md:text-lg gap-2.5 shadow-xl transition-all cursor-pointer",
                                placedCount === totalCount
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/30 scale-105 animate-pulse"
                                    : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
                            )}
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Cevapları Kontrol Et</span>
                        </Button>
                    </div>
                </div>

                {/* Başarı Kutlaması Banner'ı */}
                {isAllCorrect && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-900/90 to-emerald-950/90 border-2 border-emerald-400/60 text-white flex items-center justify-between shadow-2xl"
                    >
                        <div className="flex items-center gap-3">
                            <span className="p-2 bg-emerald-500/30 rounded-xl text-emerald-300">
                                <Award className="w-6 h-6" />
                            </span>
                            <div>
                                <span className="text-sm sm:text-base md:text-lg font-black text-emerald-200 block">
                                    🎉 Muhteşem! Tüm Kavramları Doğru Kategorilere Yerleştirdiniz!
                                </span>
                                <span className="text-xs sm:text-sm text-emerald-300/80 font-medium">
                                    Konu sınıflandırmasını eksiksiz olarak tamamladınız.
                                </span>
                            </div>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleReset}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl h-9 px-4 cursor-pointer shadow-md"
                        >
                            Tekrar Oyna
                        </Button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
