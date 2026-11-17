'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, CheckCircle2, XCircle, RotateCcw, 
    Lightbulb, Eye, Check, X, Award, HelpCircle, GripVertical, 
    Layers, Maximize2, Minimize2, CheckCheck, AlertCircle,
    PartyPopper, Trophy
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

// 🎨 Oyun Atölyesi 3D Canlı Kategori Sandıkları
const CATEGORY_THEMES: Record<string, {
    container: string;
    header: string;
    badge: string;
    basket: string;
    placedCard: string;
    ring: string;
    shadow3D: string;
    activeGlow: string;
}> = {
    emerald: {
        container: 'bg-gradient-to-b from-emerald-950/80 via-emerald-900/50 to-slate-950 border-4 border-emerald-400 shadow-[0_8px_0_#064e3b]',
        header: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-[0_4px_0_#065f46]',
        badge: 'bg-emerald-300 text-slate-950 border border-emerald-200 font-black',
        basket: 'bg-emerald-950/40 border-2 border-emerald-500/30 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-2 border-emerald-400 shadow-[0_4px_0_#059669]',
        ring: 'ring-4 ring-emerald-400 border-emerald-300',
        shadow3D: 'shadow-[0_8px_0_#064e3b]',
        activeGlow: 'shadow-[0_0_30px_rgba(16,185,129,0.5)]'
    },
    amber: {
        container: 'bg-gradient-to-b from-amber-950/80 via-amber-900/50 to-slate-950 border-4 border-amber-400 shadow-[0_8px_0_#78350f]',
        header: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-slate-950 shadow-[0_4px_0_#b45309]',
        badge: 'bg-amber-300 text-slate-950 border border-amber-200 font-black',
        basket: 'bg-amber-950/40 border-2 border-amber-500/30 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-2 border-amber-400 shadow-[0_4px_0_#d97706]',
        ring: 'ring-4 ring-amber-400 border-amber-300',
        shadow3D: 'shadow-[0_8px_0_#78350f]',
        activeGlow: 'shadow-[0_0_30px_rgba(245,158,11,0.5)]'
    },
    indigo: {
        container: 'bg-gradient-to-b from-indigo-950/80 via-indigo-900/50 to-slate-950 border-4 border-indigo-400 shadow-[0_8px_0_#312e81]',
        header: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 text-white shadow-[0_4px_0_#3730a3]',
        badge: 'bg-indigo-300 text-slate-950 border border-indigo-200 font-black',
        basket: 'bg-indigo-950/40 border-2 border-indigo-500/30 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-2 border-indigo-400 shadow-[0_4px_0_#4f46e5]',
        ring: 'ring-4 ring-indigo-400 border-indigo-300',
        shadow3D: 'shadow-[0_8px_0_#312e81]',
        activeGlow: 'shadow-[0_0_30px_rgba(99,102,241,0.5)]'
    },
    rose: {
        container: 'bg-gradient-to-b from-rose-950/80 via-rose-900/50 to-slate-950 border-4 border-rose-400 shadow-[0_8px_0_#881337]',
        header: 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 text-white shadow-[0_4px_0_#9f1239]',
        badge: 'bg-rose-300 text-slate-950 border border-rose-200 font-black',
        basket: 'bg-rose-950/40 border-2 border-rose-500/30 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-2 border-rose-400 shadow-[0_4px_0_#e11d48]',
        ring: 'ring-4 ring-rose-400 border-rose-300',
        shadow3D: 'shadow-[0_8px_0_#881337]',
        activeGlow: 'shadow-[0_0_30px_rgba(244,63,94,0.5)]'
    },
    cyan: {
        container: 'bg-gradient-to-b from-cyan-950/80 via-cyan-900/50 to-slate-950 border-4 border-cyan-400 shadow-[0_8px_0_#155e75]',
        header: 'bg-gradient-to-r from-cyan-500 via-teal-500 to-sky-500 text-slate-950 shadow-[0_4px_0_#0e7490]',
        badge: 'bg-cyan-300 text-slate-950 border border-cyan-200 font-black',
        basket: 'bg-cyan-950/40 border-2 border-cyan-500/30 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-2 border-cyan-400 shadow-[0_4px_0_#0891b2]',
        ring: 'ring-4 ring-cyan-400 border-cyan-300',
        shadow3D: 'shadow-[0_8px_0_#155e75]',
        activeGlow: 'shadow-[0_0_30px_rgba(6,182,212,0.5)]'
    },
    purple: {
        container: 'bg-gradient-to-b from-purple-950/80 via-purple-900/50 to-slate-950 border-4 border-purple-400 shadow-[0_8px_0_#581c87]',
        header: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white shadow-[0_4px_0_#6b21a8]',
        badge: 'bg-purple-300 text-slate-950 border border-purple-200 font-black',
        basket: 'bg-purple-950/40 border-2 border-purple-500/30 shadow-inner',
        placedCard: 'bg-white text-slate-900 border-2 border-purple-400 shadow-[0_4px_0_#9333ea]',
        ring: 'ring-4 ring-purple-400 border-purple-300',
        shadow3D: 'shadow-[0_8px_0_#581c87]',
        activeGlow: 'shadow-[0_0_30px_rgba(168,85,247,0.5)]'
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
    const [showHints, setShowHints] = useState(false);
    const [wrongAttemptInfo, setWrongAttemptInfo] = useState<{ itemId: string; categoryId: string } | null>(null);
    const [successCelebration, setSuccessCelebration] = useState(false);

    // Adım değiştiğinde sıfırla
    useEffect(() => {
        setPlacements({});
        setSelectedItemId(null);
        setWrongAttemptInfo(null);
        setSuccessCelebration(false);
    }, [step]);

    // Henüz yerleştirilmemiş havuzdaki maddeler
    const unplacedItems = useMemo(() => {
        return poolItems.filter(item => !placements[item.id]);
    }, [poolItems, placements]);

    // Bir maddenin doğru kategorisini bul
    const isItemBelongsToCategory = (item: CategorySortItem, cat: CategorySortCategory) => {
        return item.categoryId === cat.id || item.categoryId?.toLowerCase() === cat.name.toLowerCase();
    };

    // 🎯 OYUN ATÖLYESİ KURALI: DOĞRU OLMAYAN KATEGORİYE YERLEŞMESİN!
    const tryPlaceItemIntoCategory = (itemId: string, categoryId: string) => {
        const item = rawItems.find(i => i.id === itemId);
        const cat = categories.find(c => c.id === categoryId);

        if (!item || !cat) return;

        const isMatch = isItemBelongsToCategory(item, cat);

        if (isMatch) {
            // ✅ DOĞRU: Kategoriye yerleşir, başarı sesi çalar
            playSound('pop');
            const newPlacements = {
                ...placements,
                [itemId]: categoryId
            };
            setPlacements(newPlacements);
            setSelectedItemId(null);
            setWrongAttemptInfo(null);

            // Tüm kartlar yerleşti mi?
            if (Object.keys(newPlacements).length >= rawItems.length) {
                setSuccessCelebration(true);
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
            // ❌ YANLIŞ: Kategoriye YERLEŞMEZ! Kırmızı sarsıntı ve hata sesi
            playSound('incorrect');
            setWrongAttemptInfo({ itemId, categoryId });
            setTimeout(() => {
                setWrongAttemptInfo(null);
            }, 800);
        }
    };

    // Madde kartına tıklandığında (seçme)
    const handleItemClick = (itemId: string) => {
        playSound('pop');
        setWrongAttemptInfo(null);
        if (selectedItemId === itemId) {
            setSelectedItemId(null);
        } else {
            setSelectedItemId(itemId);
        }
    };

    // Kategori kutusuna tıklandığında
    const handleCategoryClick = (categoryId: string) => {
        if (selectedItemId) {
            tryPlaceItemIntoCategory(selectedItemId, categoryId);
        }
    };

    // Sıfırla
    const handleReset = () => {
        playSound('pop');
        setPlacements({});
        setSelectedItemId(null);
        setWrongAttemptInfo(null);
        setSuccessCelebration(false);
        setPoolItems([...rawItems].sort(() => Math.random() - 0.5));
    };

    // Çözümü Göster (Öğretmen Modu - Hepsini Doğru Yerleştir)
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
        setSuccessCelebration(true);
    };

    const totalCount = rawItems.length;
    const placedCount = Object.keys(placements).length;
    const isCompleted = placedCount >= totalCount && totalCount > 0;

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
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 border-b border-white/10">
                {/* Sol: Squircle İkon & Oyun Adı */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500/30 via-orange-500/20 to-purple-500/30 border-2 border-amber-400/50 text-2xl shadow-lg">
                        📁
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-white text-base sm:text-lg md:text-xl tracking-wide">
                                {step.title || 'Kategorilere Yerleştirme Oyunu'}
                            </span>
                            <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-300 border-amber-400/40 font-black">
                                {placedCount} / {totalCount} Doğru Yerleşti
                            </Badge>
                            <Badge variant="outline" className="hidden sm:flex text-xs bg-purple-500/20 text-purple-300 border-purple-400/40 font-bold">
                                {categories.length} Sandık
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-400 hidden sm:block">
                            💡 Kavram kartını seçip ait olduğu kategori sandığına dokunun. Yanlış kategori kabul edilmez!
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
                        title="Kartların ipuçlarını göster"
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
                            title="Öğretmen Modu: Tüm kartları ait oldukları sandıklara otomatik yerleştir"
                        >
                            <Eye className="w-4 h-4 text-cyan-400" />
                            <span className="hidden sm:inline">Çözümü Aç</span>
                        </Button>
                    )}

                    {/* Yeniden Başlat */}
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleReset}
                        className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 h-9 px-2.5 sm:px-3.5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 cursor-pointer"
                        title="Oyunu Sıfırla / Yeniden Başlat"
                    >
                        <RotateCcw className="w-4 h-4 text-cyan-400" />
                        <span className="hidden sm:inline">Yeniden Başlat</span>
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

            {/* ══ OYUN ALANI: KATEGORİ SANDIKLARI VE KAVRAM KARTLARI DESTESİ ══ */}
            <div className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-4 overflow-hidden gap-3 sm:gap-4">
                
                {/* ══ 1. KATEGORİ SANDIKLARI (ÜST ALAN) ══ */}
                <div className={cn(
                    "flex-1 min-h-[200px] grid gap-3 sm:gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 p-1",
                    gridColsClass
                )}>
                    {categories.map((cat, catIdx) => {
                        const themeKey = cat.color || DEFAULT_COLOR_ORDER[catIdx % DEFAULT_COLOR_ORDER.length];
                        const theme = CATEGORY_THEMES[themeKey] || CATEGORY_THEMES.emerald;
                        
                        // Bu kategoriye başarıyla yerleşen maddeler
                        const placedInThisCat = rawItems.filter(item => placements[item.id] === cat.id);
                        const isDropTargetReady = Boolean(selectedItemId);
                        const isWrongTarget = wrongAttemptInfo?.categoryId === cat.id;

                        return (
                            <div
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className={cn(
                                    "flex flex-col rounded-2xl sm:rounded-3xl transition-all duration-200 overflow-hidden relative min-h-[180px]",
                                    theme.container,
                                    theme.shadow3D,
                                    isDropTargetReady && !isWrongTarget && cn("cursor-pointer ring-4 animate-pulse scale-[1.01]", theme.ring, theme.activeGlow),
                                    isWrongTarget && "ring-4 ring-rose-500 border-rose-500 animate-shake shadow-[0_0_25px_rgba(244,63,94,0.6)]",
                                    isSketchnote && "bg-white border-[3px] border-[#1e293b] shadow-[6px_6px_0_#1e293b]"
                                )}
                            >
                                {/* Sandık Başlık Şeridi (3D Arcade) */}
                                <div className={cn(
                                    "shrink-0 flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 transition-all",
                                    theme.header
                                )}>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="font-black text-base sm:text-lg md:text-xl lg:text-2xl tracking-tight truncate drop-shadow-md">
                                            {cat.name}
                                        </h3>
                                        {cat.description && (
                                            <p className="text-[11px] sm:text-xs opacity-90 truncate font-bold">
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
                                        <span className="text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full bg-black/30 text-white border border-white/25 shadow-inner">
                                            {placedInThisCat.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Sandığın İçi (Kavram Yuvası) */}
                                <div className={cn(
                                    "flex-1 p-2.5 sm:p-3 overflow-y-auto flex flex-col gap-2 relative",
                                    theme.basket
                                )}>
                                    {placedInThisCat.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-white/20 rounded-2xl">
                                            <span className="text-2xl sm:text-3xl mb-1 opacity-70">📥</span>
                                            <span className="text-xs sm:text-sm font-black text-slate-300">
                                                {isDropTargetReady ? '👉 Seçili Kartı Buraya Bırak' : 'Bu kategoriye ait kartları seçin'}
                                            </span>
                                        </div>
                                    ) : (
                                        placedInThisCat.map(item => (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ scale: 0.8, y: -10, opacity: 0 }}
                                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                className={cn(
                                                    "relative flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl font-black transition-all shadow-md",
                                                    theme.placedCard,
                                                    isSketchnote && "border-2 border-[#1e293b] shadow-[3px_3px_0_#1e293b]"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                    <span className="text-xs sm:text-sm md:text-base font-black leading-snug tracking-tight text-slate-900">
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

                {/* ══ 2. KAVRAM KARTLARI DESTESİ (ALT ALAN) ══ */}
                <div className="shrink-0 bg-gradient-to-r from-slate-900/95 via-indigo-950/60 to-slate-900/95 rounded-2xl sm:rounded-3xl border-3 border-indigo-500/40 p-3 sm:p-4 shadow-2xl flex flex-col gap-2.5">
                    
                    {/* Havuz Durum Bilgisi */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg">🎴</span>
                            <span className="text-xs sm:text-sm font-black text-white">
                                {unplacedItems.length > 0 
                                    ? `Yerleştirilecek Kartlar (${unplacedItems.length})` 
                                    : '🎉 Harika! Tüm kavramlar doğru sandıklarına yerleştirildi!'}
                            </span>
                        </div>
                        
                        {wrongAttemptInfo ? (
                            <span className="text-xs font-black text-rose-400 animate-shake flex items-center gap-1">
                                <XCircle className="w-4 h-4" /> Yanlış Sandık! Bu kavram oraya ait değil.
                            </span>
                        ) : selectedItemId ? (
                            <span className="text-xs font-black text-amber-300 animate-pulse hidden sm:inline">
                                👉 Şimdi bu kavramın ait olduğu kategori sandığına dokunun!
                            </span>
                        ) : (
                            <span className="text-[11px] sm:text-xs text-slate-400 font-bold hidden sm:inline">
                                👆 Önce bir kavrama dokunun, ardından doğru sandığa basın.
                            </span>
                        )}
                    </div>

                    {/* Havuzdaki Taşlar (3D Butonlar) */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 max-h-[160px] sm:max-h-[190px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/20">
                        <AnimatePresence>
                            {unplacedItems.map(item => {
                                const isSelected = selectedItemId === item.id;
                                const isWrongThis = wrongAttemptInfo?.itemId === item.id;

                                return (
                                    <motion.button
                                        key={item.id}
                                        layout
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => handleItemClick(item.id)}
                                        className={cn(
                                            "relative flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base md:text-lg transition-all cursor-pointer select-none",
                                            "bg-white text-slate-900 shadow-[0_6px_0_#94a3b8] active:translate-y-1 active:shadow-[0_2px_0_#94a3b8]",
                                            isSelected && !isWrongThis && "ring-4 ring-amber-400 bg-amber-100 text-slate-950 shadow-[0_8px_0_#b45309] -translate-y-1.5 scale-105",
                                            isWrongThis && "ring-4 ring-rose-500 bg-rose-100 text-rose-950 shadow-[0_6px_0_#be123c] animate-shake",
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

                    {/* Zafer Tamamlanma Banner'ı */}
                    {isCompleted && (
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border-2 border-emerald-400/50 text-emerald-200 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-2.5">
                                <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
                                <span className="font-black text-sm sm:text-base text-white">
                                    Tebrikler! Tüm kavramları doğru kategorilere başarıyla yerleştirdin! (+350 XP) 🏆
                                </span>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleReset}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl h-8 px-3 text-xs shadow-md cursor-pointer"
                            >
                                Yeniden Oyna
                            </Button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
