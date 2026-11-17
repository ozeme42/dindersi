'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, CheckCircle2, XCircle, RotateCcw, 
    Lightbulb, Eye, Check, X, Award, HelpCircle, GripVertical, 
    Layers, Maximize2, Minimize2, ArrowDown, CheckCheck,
    Volume2, VolumeX, Shuffle, HelpCircle as QuestionIcon
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

// 🎨 Oyun Atölyesi 3D Canlı Kategori Temaları (Akıllı Tahta Canlı Renkleri)
const CATEGORY_THEMES: Record<string, {
    container: string;
    header: string;
    badge: string;
    basket: string;
    placedCard: string;
    placedCardWrong: string;
    placedCardCorrect: string;
    ring: string;
    shadow3D: string;
}> = {
    emerald: {
        container: 'bg-gradient-to-b from-emerald-950/70 via-emerald-900/40 to-slate-950/80 border-emerald-500/60 shadow-emerald-950/50',
        header: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-[0_4px_0_#065f46]',
        badge: 'bg-emerald-400 text-slate-950 border-emerald-300 font-black',
        basket: 'bg-emerald-950/30 border-emerald-500/30 shadow-inner',
        placedCard: 'bg-emerald-500 text-white border-emerald-300 shadow-[0_4px_0_#047857]',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-[0_4px_0_#9f1239] animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-300 shadow-[0_4px_0_#065f46]',
        ring: 'ring-emerald-400 border-emerald-400',
        shadow3D: 'shadow-[0_8px_0_#064e3b]'
    },
    amber: {
        container: 'bg-gradient-to-b from-amber-950/70 via-amber-900/40 to-slate-950/80 border-amber-500/60 shadow-amber-950/50',
        header: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-slate-950 shadow-[0_4px_0_#b45309]',
        badge: 'bg-amber-300 text-slate-950 border-amber-200 font-black',
        basket: 'bg-amber-950/30 border-amber-500/30 shadow-inner',
        placedCard: 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_4px_0_#b45309] font-black',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-[0_4px_0_#9f1239] animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-300 shadow-[0_4px_0_#065f46]',
        ring: 'ring-amber-400 border-amber-400',
        shadow3D: 'shadow-[0_8px_0_#78350f]'
    },
    indigo: {
        container: 'bg-gradient-to-b from-indigo-950/70 via-indigo-900/40 to-slate-950/80 border-indigo-500/60 shadow-indigo-950/50',
        header: 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-[0_4px_0_#3730a3]',
        badge: 'bg-indigo-300 text-slate-950 border-indigo-200 font-black',
        basket: 'bg-indigo-950/30 border-indigo-500/30 shadow-inner',
        placedCard: 'bg-indigo-600 text-white border-indigo-300 shadow-[0_4px_0_#3730a3]',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-[0_4px_0_#9f1239] animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-300 shadow-[0_4px_0_#065f46]',
        ring: 'ring-indigo-400 border-indigo-400',
        shadow3D: 'shadow-[0_8px_0_#312e81]'
    },
    rose: {
        container: 'bg-gradient-to-b from-rose-950/70 via-rose-900/40 to-slate-950/80 border-rose-500/60 shadow-rose-950/50',
        header: 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 text-white shadow-[0_4px_0_#9f1239]',
        badge: 'bg-rose-300 text-slate-950 border-rose-200 font-black',
        basket: 'bg-rose-950/30 border-rose-500/30 shadow-inner',
        placedCard: 'bg-rose-600 text-white border-rose-300 shadow-[0_4px_0_#9f1239]',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-[0_4px_0_#9f1239] animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-300 shadow-[0_4px_0_#065f46]',
        ring: 'ring-rose-400 border-rose-400',
        shadow3D: 'shadow-[0_8px_0_#881337]'
    },
    cyan: {
        container: 'bg-gradient-to-b from-cyan-950/70 via-cyan-900/40 to-slate-950/80 border-cyan-500/60 shadow-cyan-950/50',
        header: 'bg-gradient-to-r from-cyan-500 via-teal-500 to-sky-500 text-slate-950 shadow-[0_4px_0_#0e7490]',
        badge: 'bg-cyan-300 text-slate-950 border-cyan-200 font-black',
        basket: 'bg-cyan-950/30 border-cyan-500/30 shadow-inner',
        placedCard: 'bg-cyan-500 text-slate-950 border-cyan-200 shadow-[0_4px_0_#0e7490] font-black',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-[0_4px_0_#9f1239] animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-300 shadow-[0_4px_0_#065f46]',
        ring: 'ring-cyan-400 border-cyan-400',
        shadow3D: 'shadow-[0_8px_0_#155e75]'
    },
    purple: {
        container: 'bg-gradient-to-b from-purple-950/70 via-purple-900/40 to-slate-950/80 border-purple-500/60 shadow-purple-950/50',
        header: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white shadow-[0_4px_0_#6b21a8]',
        badge: 'bg-purple-300 text-slate-950 border-purple-200 font-black',
        basket: 'bg-purple-950/30 border-purple-500/30 shadow-inner',
        placedCard: 'bg-purple-600 text-white border-purple-300 shadow-[0_4px_0_#6b21a8]',
        placedCardWrong: 'bg-rose-600 text-white border-rose-400 shadow-[0_4px_0_#9f1239] animate-shake',
        placedCardCorrect: 'bg-emerald-600 text-white border-emerald-300 shadow-[0_4px_0_#065f46]',
        ring: 'ring-purple-400 border-purple-400',
        shadow3D: 'shadow-[0_8px_0_#581c87]'
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
    const [poolItems, setPoolItems] = useState<CategorySortItem[]>([]);

    useEffect(() => {
        setPoolItems([...rawItems].sort(() => Math.random() - 0.5));
    }, [rawItems]);

    // State'ler
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

    // Kategori kutusuna tıklandığında
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
                    particleCount: 140,
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
        setPoolItems([...rawItems].sort(() => Math.random() - 0.5));
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
        if (categories.length === 2) return "grid-cols-1 md:grid-cols-2";
        if (categories.length === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    }, [categories.length]);

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
                    <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-purple-500/30 via-indigo-500/20 to-pink-500/30 border border-purple-400/40 text-2xl shadow-inner">
                        📁
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-white text-base sm:text-lg md:text-xl tracking-wide">
                                {step.title || 'Kategorilere Yerleştirme Oyunu'}
                            </span>
                            <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-300 border-purple-400/40 font-black">
                                {placedCount} / {totalCount} Yerleşti
                            </Badge>
                            <Badge variant="outline" className="hidden sm:flex text-xs bg-amber-500/20 text-amber-300 border-amber-400/40 font-bold">
                                {categories.length} Kategori
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-400 hidden sm:block">
                            Kartları ilgili kategori sepetine sürükleyin veya dokunarak yerleştirin.
                        </p>
                    </div>
                </div>

                {/* Sağ: Oyun Kontrol Eylemleri & Tam Ekran */}
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
                        title="Maddelerin ipuçlarını göster"
                    >
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span className="hidden sm:inline">{showHints ? 'İpuçlarını Gizle' : 'İpucu'}</span>
                    </Button>

                    {/* Çözümü Göster (Öğretmen Modu) */}
                    {isTeacher && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleRevealSolution}
                            className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 h-9 px-2.5 sm:px-3.5 text-cyan-300 hover:text-white hover:bg-white/10 border border-cyan-500/30 cursor-pointer"
                            title="Öğretmen Modu: Tüm maddeleri doğru kategorilere yerleştir"
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
                        title="Tüm maddeleri havuza geri al"
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

            {/* ══ ORTA OYUN ALANI: KATEGORİ SEPETLERİ VE KART DESTESİ ══ */}
            <div className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-4 overflow-hidden gap-3 sm:gap-4">
                
                {/* ══ 1. KATEGORİ SANDIKLARI / SEPETLERİ (ÜST ALAN) ══ */}
                <div className={cn(
                    "flex-1 min-h-[180px] grid gap-2.5 sm:gap-3.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 p-1",
                    gridColsClass
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
                                    "flex flex-col rounded-2xl sm:rounded-3xl border-2 sm:border-3 transition-all duration-200 overflow-hidden relative shadow-xl min-h-[170px]",
                                    theme.container,
                                    theme.shadow3D,
                                    isDropTargetReady && cn("cursor-pointer ring-4 animate-pulse scale-[1.01]", theme.ring),
                                    isSketchnote && "bg-white border-[3px] border-[#1e293b] shadow-[6px_6px_0_#1e293b]"
                                )}
                            >
                                {/* Kategori 3D Başlık Şeridi */}
                                <div className={cn(
                                    "shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 transition-all",
                                    theme.header
                                )}>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="font-black text-sm sm:text-base md:text-xl lg:text-2xl tracking-tight truncate drop-shadow-sm">
                                            {cat.name}
                                        </h3>
                                        {cat.description && (
                                            <p className="text-[11px] sm:text-xs opacity-90 truncate font-semibold">
                                                {cat.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1.5">
                                        {cat.badge && (
                                            <span className={cn(
                                                "text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border shadow-xs hidden md:inline-block",
                                                theme.badge
                                            )}>
                                                {cat.badge}
                                            </span>
                                        )}
                                        <span className="text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full bg-black/25 text-white border border-white/20">
                                            {placedInThisCat.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Kategori İçi Sepet Yuvası */}
                                <div className={cn(
                                    "flex-1 p-2 sm:p-3 overflow-y-auto flex flex-col gap-2 relative",
                                    theme.basket
                                )}>
                                    {placedInThisCat.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-white/15 rounded-2xl">
                                            <span className="text-xl sm:text-2xl mb-1 opacity-70">📥</span>
                                            <span className="text-xs sm:text-sm font-bold text-slate-300">
                                                {isDropTargetReady ? 'Seçili Kartı Buraya Bırak' : 'Bu kategoriye kart ekleyin'}
                                            </span>
                                        </div>
                                    ) : (
                                        placedInThisCat.map(item => {
                                            const isTargetCat = categories.find(c => c.id === item.categoryId || c.name.toLowerCase() === item.categoryId.toLowerCase())?.id === cat.id;
                                            const isItemCorrect = isChecked && isTargetCat;
                                            const isItemWrong = isChecked && !isTargetCat;

                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    layout
                                                    initial={{ scale: 0.85, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.8, opacity: 0 }}
                                                    className={cn(
                                                        "group relative flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 font-black transition-all shadow-md",
                                                        !isChecked && theme.placedCard,
                                                        isItemCorrect && theme.placedCardCorrect,
                                                        isItemWrong && theme.placedCardWrong,
                                                        isSketchnote && "bg-white text-slate-900 border-2 border-[#1e293b] shadow-[3px_3px_0_#1e293b]"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {isChecked && (
                                                            isItemCorrect ? (
                                                                <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                                                            ) : (
                                                                <XCircle className="w-5 h-5 text-rose-200 flex-shrink-0" />
                                                            )
                                                        )}
                                                        <span className={cn(
                                                            "text-xs sm:text-sm md:text-base font-black leading-snug drop-shadow-xs",
                                                            isSketchnote && "text-slate-900"
                                                        )}>
                                                            {item.text}
                                                        </span>
                                                    </div>

                                                    {/* Geri Çıkarma Butonu */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => removeItemFromCategory(item.id, e)}
                                                        className="w-7 h-7 rounded-xl bg-black/25 hover:bg-black/50 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20 active:scale-90"
                                                        title="Bu kartı geri al"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ══ 2. MADDE HAVUZU / KART DESTE TEPSİSİ (ALT ALAN) ══ */}
                <div className="shrink-0 bg-gradient-to-r from-slate-900/95 via-slate-850/95 to-slate-900/95 rounded-2xl sm:rounded-3xl border-2 border-white/10 p-3 sm:p-4 shadow-2xl flex flex-col gap-2.5">
                    
                    {/* Havuz Bilgi Başlığı */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg">🎴</span>
                            <span className="text-xs sm:text-sm font-black text-white">
                                {unplacedItems.length > 0 
                                    ? `Yerleştirilecek Kartlar (${unplacedItems.length})` 
                                    : '🎉 Tüm kartlar kategorilere yerleştirildi!'}
                            </span>
                        </div>
                        <span className="text-[11px] sm:text-xs text-amber-300 font-bold hidden sm:inline">
                            {selectedItemId 
                                ? '👉 Şimdi kartı koymak istediğiniz kategori sepetine tıklayın!' 
                                : '👆 Karta dokunup ardından yukarıdaki ilgili sepete basın.'}
                        </span>
                    </div>

                    {/* Havuzdaki Kartlar Izgarası */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 max-h-[150px] sm:max-h-[180px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/20">
                        <AnimatePresence>
                            {unplacedItems.map(item => {
                                const isSelected = selectedItemId === item.id;

                                return (
                                    <motion.button
                                        key={item.id}
                                        layout
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => handleItemClick(item.id)}
                                        className={cn(
                                            "relative flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm md:text-base transition-all cursor-pointer select-none",
                                            "bg-white text-slate-900 shadow-[0_5px_0_#94a3b8] active:translate-y-1 active:shadow-[0_1px_0_#94a3b8]",
                                            isSelected && "ring-4 ring-amber-400 bg-amber-100 text-slate-950 shadow-[0_6px_0_#b45309] -translate-y-1 scale-105",
                                            isSketchnote && "border-2 border-[#1e293b] shadow-[3px_3px_0_#1e293b]"
                                        )}
                                    >
                                        <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="tracking-tight">{item.text}</span>
                                        {showHints && item.hint && (
                                            <span 
                                                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 font-bold ml-1"
                                                title={item.hint}
                                            >
                                                💡
                                            </span>
                                        )}
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
                                        <Award className="w-5 h-5" /> Harika! Tüm kategoriler doğru eşleşti! 🏆 (+300 XP)
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-rose-400 font-black text-xs sm:text-sm">
                                        <XCircle className="w-4 h-4" /> Kırmızı olan kartlar yanlış kategoride. Tekrar deneyin!
                                    </span>
                                )
                            )}
                        </div>

                        {/* Büyük 3D Kontrol Butonu */}
                        <Button
                            type="button"
                            onClick={handleCheckAnswers}
                            disabled={placedCount === 0}
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
