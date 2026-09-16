'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
    ELIFBA_UNITS, 
    CUZ_LESSONS, 
    NAMAZ_DUALARI, 
    ELIFBA_CATEGORY_META, 
    ElifbaUnit 
} from '@/lib/elifba-data';
import { 
    BookOpen, 
    Volume2, 
    Play, 
    Pause, 
    ChevronLeft, 
    ChevronRight, 
    Maximize2, 
    Minimize2, 
    Sparkles, 
    ExternalLink, 
    Info, 
    ListFilter, 
    CheckCircle2, 
    GraduationCap,
    Home,
    LayoutGrid,
    SquareChevronRight,
    RotateCcw,
    FastForward,
    Palette
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 8'li Canlı & Neşeli Renk Teması Paleti (Siyah-Beyaz Yerine Canlı Görünüm)
const CARD_COLOR_THEMES = [
    {
        id: 'emerald',
        name: 'Zümrüt Yeşili',
        bg: 'bg-gradient-to-br from-emerald-950/80 via-emerald-900/35 to-slate-900/90',
        border: 'border-emerald-500/40 hover:border-emerald-400',
        activeBorder: 'border-emerald-400 ring-4 ring-emerald-400/50 shadow-[0_0_35px_rgba(16,185,129,0.5)]',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        text: 'text-emerald-300',
        numberBg: 'bg-emerald-900/60 text-emerald-200 border-emerald-500/30',
        glow: 'shadow-[0_4px_25px_rgba(16,185,129,0.2)]',
        btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
    },
    {
        id: 'cyan',
        name: 'Turkuaz Safir',
        bg: 'bg-gradient-to-br from-cyan-950/80 via-sky-900/35 to-slate-900/90',
        border: 'border-cyan-500/40 hover:border-cyan-400',
        activeBorder: 'border-cyan-400 ring-4 ring-cyan-400/50 shadow-[0_0_35px_rgba(6,182,212,0.5)]',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        text: 'text-cyan-300',
        numberBg: 'bg-cyan-900/60 text-cyan-200 border-cyan-500/30',
        glow: 'shadow-[0_4px_25px_rgba(6,182,212,0.2)]',
        btnBg: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50'
    },
    {
        id: 'amber',
        name: 'Kehribar Altın',
        bg: 'bg-gradient-to-br from-amber-950/80 via-orange-900/35 to-slate-900/90',
        border: 'border-amber-500/40 hover:border-amber-400',
        activeBorder: 'border-amber-400 ring-4 ring-amber-400/50 shadow-[0_0_35px_rgba(245,158,11,0.5)]',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        text: 'text-amber-300',
        numberBg: 'bg-amber-900/60 text-amber-200 border-amber-500/30',
        glow: 'shadow-[0_4px_25px_rgba(245,158,11,0.2)]',
        btnBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50'
    },
    {
        id: 'violet',
        name: 'Ametist Moru',
        bg: 'bg-gradient-to-br from-violet-950/80 via-purple-900/35 to-slate-900/90',
        border: 'border-violet-500/40 hover:border-violet-400',
        activeBorder: 'border-violet-400 ring-4 ring-violet-400/50 shadow-[0_0_35px_rgba(139,92,246,0.5)]',
        badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
        text: 'text-violet-300',
        numberBg: 'bg-violet-900/60 text-violet-200 border-violet-500/30',
        glow: 'shadow-[0_4px_25px_rgba(139,92,246,0.2)]',
        btnBg: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-950/50'
    },
    {
        id: 'rose',
        name: 'Yakut Pembesi',
        bg: 'bg-gradient-to-br from-rose-950/80 via-pink-900/35 to-slate-900/90',
        border: 'border-rose-500/40 hover:border-rose-400',
        activeBorder: 'border-rose-400 ring-4 ring-rose-400/50 shadow-[0_0_35px_rgba(244,63,94,0.5)]',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        text: 'text-rose-300',
        numberBg: 'bg-rose-900/60 text-rose-200 border-rose-500/30',
        glow: 'shadow-[0_4px_25px_rgba(244,63,94,0.2)]',
        btnBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
    },
    {
        id: 'indigo',
        name: 'Gece Mavisi',
        bg: 'bg-gradient-to-br from-indigo-950/80 via-blue-900/35 to-slate-900/90',
        border: 'border-indigo-500/40 hover:border-indigo-400',
        activeBorder: 'border-indigo-400 ring-4 ring-indigo-400/50 shadow-[0_0_35px_rgba(99,102,241,0.5)]',
        badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        text: 'text-indigo-300',
        numberBg: 'bg-indigo-900/60 text-indigo-200 border-indigo-500/30',
        glow: 'shadow-[0_4px_25px_rgba(99,102,241,0.2)]',
        btnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50'
    },
    {
        id: 'teal',
        name: 'Deniz Yeşili',
        bg: 'bg-gradient-to-br from-teal-950/80 via-emerald-900/35 to-slate-900/90',
        border: 'border-teal-500/40 hover:border-teal-400',
        activeBorder: 'border-teal-400 ring-4 ring-teal-400/50 shadow-[0_0_35px_rgba(20,184,166,0.5)]',
        badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        text: 'text-teal-300',
        numberBg: 'bg-teal-900/60 text-teal-200 border-teal-500/30',
        glow: 'shadow-[0_4px_25px_rgba(20,184,166,0.2)]',
        btnBg: 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-950/50'
    },
    {
        id: 'orange',
        name: 'Alev Turuncusu',
        bg: 'bg-gradient-to-br from-orange-950/80 via-amber-900/35 to-slate-900/90',
        border: 'border-orange-500/40 hover:border-orange-400',
        activeBorder: 'border-orange-400 ring-4 ring-orange-400/50 shadow-[0_0_35px_rgba(249,115,22,0.5)]',
        badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        text: 'text-orange-300',
        numberBg: 'bg-orange-900/60 text-orange-200 border-orange-500/30',
        glow: 'shadow-[0_4px_25px_rgba(249,115,22,0.2)]',
        btnBg: 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-950/50'
    }
];

export default function ElifbaPortalPage() {
    // Aktif Sekme: 'cuz' (28 Ders), 'dua' (8 Dua), 'classic' (Orijinal HTML)
    const [activeTab, setActiveTab] = useState<'cuz' | 'dua' | 'classic'>('cuz');
    
    // Görünüm Modu: 'grid' (Tüm Liste) veya 'single' (Tek Tek Sırayla Okuma)
    const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
    
    // Seçili Ders / Dua
    const [selectedUnitId, setSelectedUnitId] = useState<string>('cuz1');
    const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
    
    // Filtre
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    
    // Ses ve Oynatma Durumu
    const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
    const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState<string | null>(null);
    const [isAutoAdvance, setIsAutoAdvance] = useState<boolean>(false);
    const [autoDelay, setAutoDelay] = useState<number>(1800); // 1.8 sn bekleme
    
    // Tam Ekran Durumu
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const playerContainerRef = useRef<HTMLDivElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Mevcut Ünite
    const currentUnit: ElifbaUnit = useMemo(() => {
        return ELIFBA_UNITS.find(u => u.id === selectedUnitId) || CUZ_LESSONS[0];
    }, [selectedUnitId]);

    // Filtrelenmiş Üniteler
    const filteredUnits = useMemo(() => {
        const pool = activeTab === 'dua' ? NAMAZ_DUALARI : CUZ_LESSONS;
        if (categoryFilter === 'all') return pool;
        return pool.filter(u => u.category === categoryFilter);
    }, [activeTab, categoryFilter]);

    // Geçerli aktif öğe
    const currentItem = useMemo(() => {
        if (!currentUnit.items || currentUnit.items.length === 0) return null;
        const idx = Math.min(Math.max(0, selectedItemIndex), currentUnit.items.length - 1);
        return currentUnit.items[idx];
    }, [currentUnit, selectedItemIndex]);

    // Tema rengini belirleme (Döngüsel veya derse özel)
    const getItemTheme = useCallback((index: number) => {
        return CARD_COLOR_THEMES[index % CARD_COLOR_THEMES.length];
    }, []);

    // Sekme değiştiğinde ilk üniteye geç
    const handleTabChange = (tab: 'cuz' | 'dua' | 'classic') => {
        setActiveTab(tab);
        setCategoryFilter('all');
        setIsPlayingAll(false);
        setIsAutoAdvance(false);
        if (tab === 'cuz') {
            setSelectedUnitId('cuz1');
            setSelectedItemIndex(0);
        } else if (tab === 'dua') {
            setSelectedUnitId('dua1');
            setSelectedItemIndex(0);
        }
    };

    // Ses Çalma Fonksiyonu
    const playAudio = useCallback((audioUrl: string, itemIdx?: number, onEndCallback?: () => void) => {
        if (!audioUrl) return;

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setCurrentlyPlayingAudio(audioUrl);
        if (itemIdx !== undefined) {
            setSelectedItemIndex(itemIdx);
        }

        audio.play().catch(e => {
            console.warn("Ses çalma hatası:", e);
        });

        audio.onended = () => {
            setCurrentlyPlayingAudio(null);
            if (onEndCallback) {
                onEndCallback();
            }
        };
    }, []);

    // Tek Tek Okuma Modunda Önceki / Sonraki Harfe Geçiş
    const handleNextItem = useCallback(() => {
        if (!currentUnit.items.length) return;
        const nextIdx = (selectedItemIndex + 1) % currentUnit.items.length;
        setSelectedItemIndex(nextIdx);
        const nextItem = currentUnit.items[nextIdx];
        if (nextItem) playAudio(nextItem.audio, nextIdx);
    }, [currentUnit.items, selectedItemIndex, playAudio]);

    const handlePrevItem = useCallback(() => {
        if (!currentUnit.items.length) return;
        const prevIdx = (selectedItemIndex - 1 + currentUnit.items.length) % currentUnit.items.length;
        setSelectedItemIndex(prevIdx);
        const prevItem = currentUnit.items[prevIdx];
        if (prevItem) playAudio(prevItem.audio, prevIdx);
    }, [currentUnit.items, selectedItemIndex, playAudio]);

    // Tek Tek Okuma Modunda Otomatik İlerleme (Auto-Advance) Mantığı
    useEffect(() => {
        if (!isAutoAdvance || viewMode !== 'single') {
            if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
            return;
        }

        if (!currentItem) return;

        // O anki harfin sesini çal, bitince gecikme süresi kadar bekle ve sonrakine geç
        playAudio(currentItem.audio, selectedItemIndex, () => {
            if (!isAutoAdvance) return;
            autoTimerRef.current = setTimeout(() => {
                if (selectedItemIndex < currentUnit.items.length - 1) {
                    setSelectedItemIndex(prev => prev + 1);
                } else {
                    // Ders bittiğinde durdur
                    setIsAutoAdvance(false);
                }
            }, autoDelay);
        });

        return () => {
            if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        };
    }, [isAutoAdvance, viewMode, selectedItemIndex, currentUnit.items.length, autoDelay]);

    // Izgara Modunda Sırayla Tümünü Oynat (Autoplay)
    useEffect(() => {
        if (!isPlayingAll || viewMode === 'single') {
            return;
        }

        let isCancelled = false;
        let currentIndex = selectedItemIndex;

        const playNext = () => {
            if (isCancelled || !isPlayingAll) return;
            if (currentIndex >= currentUnit.items.length) {
                setIsPlayingAll(false);
                setCurrentlyPlayingAudio(null);
                return;
            }

            const item = currentUnit.items[currentIndex];
            setSelectedItemIndex(currentIndex);
            setCurrentlyPlayingAudio(item.audio);

            const audio = new Audio(item.audio);
            audioRef.current = audio;

            audio.play().catch(() => {
                if (!isCancelled) {
                    currentIndex++;
                    setTimeout(playNext, 400);
                }
            });

            audio.onended = () => {
                if (!isCancelled && isPlayingAll) {
                    currentIndex++;
                    setTimeout(playNext, 350);
                }
            };
        };

        playNext();

        return () => {
            isCancelled = true;
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, [isPlayingAll, viewMode, currentUnit]);

    // Tam Ekran Aç / Kapa
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            playerContainerRef.current?.requestFullscreen?.().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Klavye Kısayolları
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                const item = currentUnit.items[selectedItemIndex];
                if (item) playAudio(item.audio, selectedItemIndex);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNextItem();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevItem();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                setViewMode(prev => prev === 'grid' ? 'single' : 'grid');
            } else if (e.key === 'o' || e.key === 'O' || e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                if (viewMode === 'single') {
                    setIsAutoAdvance(prev => !prev);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentUnit, selectedItemIndex, playAudio, toggleFullscreen, handleNextItem, handlePrevItem, viewMode]);

    // Sonraki / Önceki Ders
    const currentUnitIndex = useMemo(() => {
        const list = activeTab === 'dua' ? NAMAZ_DUALARI : CUZ_LESSONS;
        return list.findIndex(u => u.id === currentUnit.id);
    }, [activeTab, currentUnit.id]);

    const handlePrevUnit = () => {
        const list = activeTab === 'dua' ? NAMAZ_DUALARI : CUZ_LESSONS;
        if (currentUnitIndex > 0) {
            setSelectedUnitId(list[currentUnitIndex - 1].id);
            setSelectedItemIndex(0);
            setIsPlayingAll(false);
            setIsAutoAdvance(false);
        }
    };

    const handleNextUnit = () => {
        const list = activeTab === 'dua' ? NAMAZ_DUALARI : CUZ_LESSONS;
        if (currentUnitIndex < list.length - 1) {
            setSelectedUnitId(list[currentUnitIndex + 1].id);
            setSelectedItemIndex(0);
            setIsPlayingAll(false);
            setIsAutoAdvance(false);
        }
    };

    const currentSingleTheme = getItemTheme(selectedItemIndex);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a1122] to-[#070b16] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
            
            {/* ÜST BAŞLIK BAR */}
            <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                    
                    {/* Sol: Geri & Başlık */}
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300">
                                <Home className="w-4 h-4" />
                            </Button>
                        </Link>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-lg md:text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-400">
                                    İnteraktif Elifba & Dualar
                                </span>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                                    36 Kapsamlı Ünite
                                </Badge>
                            </div>
                            <span className="text-xs text-slate-400">
                                Akıllı Tahta Uyumlu • Renkli Sesli Kur'an Öğrenimi
                            </span>
                        </div>
                    </div>

                    {/* Orta: Ana Sekmeler */}
                    <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-white/10 shadow-inner">
                        <button
                            type="button"
                            onClick={() => handleTabChange('cuz')}
                            className={cn(
                                "px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                                activeTab === 'cuz'
                                    ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <BookOpen className="w-3.5 h-3.5" /> Elifba Cüzü (28 Ders)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabChange('dua')}
                            className={cn(
                                "px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                                activeTab === 'dua'
                                    ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-950/50"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Namaz Duaları (8 Dua)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabChange('classic')}
                            className={cn(
                                "px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                activeTab === 'classic'
                                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950/50"
                                    : "text-slate-400 hover:text-white"
                            )}
                            title="Orijinal Web Sürümü"
                        >
                            <ExternalLink className="w-3 h-3" /> Klasik Sürüm
                        </button>
                    </div>

                    {/* Sağ: Öğretmen Takip Butonu */}
                    <div className="flex items-center gap-2">
                        <Link href="/teacher/quran-tracker">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-3.5 rounded-xl text-xs shadow-lg shadow-emerald-950/40">
                                <GraduationCap className="w-4 h-4 mr-1.5" />
                                Öğretmen Takip Tablosu
                            </Button>
                        </Link>
                    </div>

                </div>
            </header>

            {/* KLASİK SÜRÜM MODU (IFRAME İLE ORİJİNAL WEB UYGULAMASI) */}
            {activeTab === 'classic' ? (
                <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full">
                    <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10 flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Info className="w-4 h-4 text-cyan-400" />
                            <span>Orijinal web yazılımı yükleniyor. Tüm ses ve harfler orijinal formatında sunulmaktadır.</span>
                        </div>
                        <a 
                            href="/elifba/elifba.htm" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                            Yeni Sekmede Aç <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                    <div className="flex-1 rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-white min-h-[75vh]">
                        <iframe 
                            src="/elifba/elifba.htm" 
                            title="Orijinal Elifba Web Uygulaması"
                            className="w-full h-full border-none min-h-[75vh]"
                        />
                    </div>
                </div>
            ) : (
                /* MODERN İNTERAKTİF ELİFBA & DUALAR PORTALI */
                <main className="flex-1 flex flex-col p-3 sm:p-6 max-w-[1700px] mx-auto w-full gap-5">
                    
                    {/* ÜNİTE LİSTESİ VE KATEGORİ FİLTRESİ */}
                    <div className="bg-slate-900/70 p-3 rounded-2xl border border-white/10 shadow-lg flex flex-col gap-2.5 backdrop-blur-md">
                        
                        {/* Kategori Butonları (Yalnızca Cüz Derslerinde) */}
                        {activeTab === 'cuz' && (
                            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
                                <span className="text-slate-400 font-bold text-[11px] shrink-0 mr-1 flex items-center gap-1">
                                    <ListFilter className="w-3 h-3 text-cyan-400" /> Konular:
                                </span>
                                <button
                                    onClick={() => setCategoryFilter('all')}
                                    className={cn(
                                        "px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                        categoryFilter === 'all' ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40" : "bg-slate-950 border border-white/10 text-slate-400 hover:text-white"
                                    )}
                                >
                                    Tümü (28)
                                </button>
                                {Object.entries(ELIFBA_CATEGORY_META).filter(([cat]) => cat !== 'dualar').map(([cat, meta]) => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategoryFilter(cat)}
                                        className={cn(
                                            "px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                            categoryFilter === cat ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40" : "bg-slate-950 border border-white/10 text-slate-400 hover:text-white"
                                        )}
                                    >
                                        {meta.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Yatay Ünite Şeridi */}
                        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                            {filteredUnits.map((u) => {
                                const isCurrent = u.id === currentUnit.id;
                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedUnitId(u.id);
                                            setSelectedItemIndex(0);
                                            setIsPlayingAll(false);
                                            setIsAutoAdvance(false);
                                        }}
                                        className={cn(
                                            "px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all relative shrink-0 border cursor-pointer select-none",
                                            isCurrent
                                                ? activeTab === 'dua'
                                                    ? "bg-gradient-to-r from-rose-900/90 to-pink-900/90 border-rose-400 text-white shadow-lg shadow-rose-950/60 scale-105 z-10"
                                                    : "bg-gradient-to-r from-teal-900/90 to-cyan-900/90 border-teal-400 text-white shadow-lg shadow-teal-950/60 scale-105 z-10"
                                                : "bg-slate-950/80 border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
                                        )}
                                    >
                                        <span className="font-mono text-[10px] opacity-80">#{u.number}</span>
                                        <span className="truncate max-w-[170px]">{u.title.replace(/^Ders \d+:\s*/, '')}</span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/20 bg-black/20">
                                            {u.itemCount}
                                        </Badge>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* AKTİF DERS OYNATICI SAHNESİ */}
                    <div 
                        ref={playerContainerRef}
                        className={cn(
                            "bg-slate-900/80 rounded-[2.5rem] border border-white/15 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 relative transition-all duration-300 backdrop-blur-xl",
                            isFullscreen && "fixed inset-0 z-50 rounded-none max-w-none max-h-none h-screen w-screen p-4 sm:p-8 bg-slate-950 overflow-y-auto"
                        )}
                    >
                        {/* Sahne Başlığı ve Kontroller */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 shrink-0">
                            
                            {/* Sol: Ders Başlığı ve Gezinme */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrevUnit}
                                    disabled={currentUnitIndex <= 0}
                                    className="h-8 px-2.5 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 disabled:opacity-30"
                                    title="Önceki Ders"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Önceki Ders
                                </Button>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-xl font-black text-white">
                                            {currentUnit.title}
                                        </h2>
                                        <Badge className={cn("text-[10px] font-bold px-2 py-0.5", currentUnit.type === 'dua' ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30")}>
                                            {currentUnit.itemCount} Öğe
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-300/80 mt-0.5 line-clamp-1 max-w-2xl">
                                        {currentUnit.description}
                                    </p>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNextUnit}
                                    disabled={currentUnitIndex >= (activeTab === 'dua' ? NAMAZ_DUALARI.length - 1 : CUZ_LESSONS.length - 1)}
                                    className="h-8 px-2.5 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 disabled:opacity-30"
                                    title="Sonraki Ders"
                                >
                                    Sonraki Ders <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>

                            {/* Orta & Sağ: Görünüm Modu Seçici & Kontroller */}
                            <div className="flex items-center flex-wrap gap-2">
                                
                                {/* MOD SEÇİCİ: Izgara vs Tek Tek Sırayla Okuma */}
                                <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/15 shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewMode('grid');
                                            setIsAutoAdvance(false);
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                                            viewMode === 'grid'
                                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/40"
                                                : "text-slate-400 hover:text-white"
                                        )}
                                        title="Tüm Harfleri Izgarada Göster [M]"
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" /> Izgara (Tümü)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewMode('single');
                                            setIsPlayingAll(false);
                                            // Tekli moda geçince seçili öğenin sesini çal
                                            if (currentItem) playAudio(currentItem.audio, selectedItemIndex);
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                                            viewMode === 'single'
                                                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-950/40 animate-pulse"
                                                : "text-slate-400 hover:text-white"
                                        )}
                                        title="Harfleri Tek Tek Ekranda Sırayla Oku [M]"
                                    >
                                        <SquareChevronRight className="w-3.5 h-3.5" /> Tek Tek Sırayla Oku
                                    </button>
                                </div>

                                {/* Izgara Modu Oynatma Butonu */}
                                {viewMode === 'grid' && (
                                    <Button
                                        size="sm"
                                        onClick={() => setIsPlayingAll(prev => !prev)}
                                        className={cn(
                                            "h-9 px-4 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer",
                                            isPlayingAll
                                                ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-950/50 animate-pulse"
                                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
                                        )}
                                    >
                                        {isPlayingAll ? (
                                            <>
                                                <Pause className="w-3.5 h-3.5 mr-1.5" /> Durdur
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Sırayla Dinle (Tümü)
                                            </>
                                        )}
                                    </Button>
                                )}

                                {/* Tam Ekran / Akıllı Tahta */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleFullscreen}
                                    className="h-9 w-9 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300"
                                    title="Tam Ekran / Akıllı Tahta Modu [F]"
                                >
                                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* DUA ÖZEL BÖLÜMÜ: OKUNUŞ VE ANLAM KARTLARI */}
                        {currentUnit.type === 'dua' && (currentUnit.meaning || currentUnit.pronunciation) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-3xl border border-white/10 shadow-inner">
                                {currentUnit.pronunciation && (
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3 text-rose-400" /> Türkçe Okunuşu:
                                        </span>
                                        <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed italic bg-white/5 p-3 rounded-2xl border border-white/5">
                                            {currentUnit.pronunciation}
                                        </p>
                                    </div>
                                )}
                                {currentUnit.meaning && (
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Türkçe Anlamı:
                                        </span>
                                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/5">
                                            {currentUnit.meaning}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────── */}
                        {/* 1. TEK TEK SIRAYLA OKUMA MODU (FOCUSED SINGLE-CARD MODE) */}
                        {/* ──────────────────────────────────────────────────────────── */}
                        {viewMode === 'single' && currentItem && (
                            <div className="flex-1 flex flex-col items-center justify-between gap-6 py-2 w-full max-w-5xl mx-auto">
                                
                                {/* Üst İlerleme ve Bilgi Çubuğu */}
                                <div className="w-full flex items-center justify-between px-2 text-xs font-bold text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-xl bg-white/10 text-white font-mono text-xs">
                                            Öğe {selectedItemIndex + 1} / {currentUnit.items.length}
                                        </span>
                                        <span className="text-slate-400 font-medium hidden sm:inline">
                                            {currentItem.alt || `Öğe ${currentItem.index}`}
                                        </span>
                                    </div>

                                    {/* Otomatik İlerleme Kontrolü */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => setIsAutoAdvance(prev => !prev)}
                                            className={cn(
                                                "h-8 px-3 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer",
                                                isAutoAdvance
                                                    ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-950/40 animate-pulse"
                                                    : "bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10"
                                            )}
                                            title="Ses bittiğinde otomatik bir sonraki harfe geçer [O]"
                                        >
                                            <FastForward className="w-3.5 h-3.5 mr-1" />
                                            {isAutoAdvance ? "Otomatik İlerleme: Açık" : "Otomatik Sırayla Oku"}
                                        </Button>

                                        {isAutoAdvance && (
                                            <select
                                                value={autoDelay}
                                                onChange={(e) => setAutoDelay(Number(e.target.value))}
                                                className="bg-slate-900 border border-white/10 text-xs rounded-xl px-2 py-1 text-slate-300 outline-none"
                                            >
                                                <option value={1200}>1.2 sn</option>
                                                <option value={1800}>1.8 sn</option>
                                                <option value={2500}>2.5 sn</option>
                                                <option value={3500}>3.5 sn</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* İlerleme Çubuğu */}
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                                    <div 
                                        className="bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 h-full transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                                        style={{ width: `${((selectedItemIndex + 1) / currentUnit.items.length) * 100}%` }}
                                    />
                                </div>

                                {/* ORTA DEV ODAK KARTI & YAN GEÇİŞ BUTONLARI */}
                                <div className="w-full flex items-center justify-center gap-3 sm:gap-6 my-auto">
                                    
                                    {/* Önceki Harf Butonu */}
                                    <Button
                                        variant="outline"
                                        onClick={handlePrevItem}
                                        className="h-16 w-12 sm:h-24 sm:w-16 rounded-2xl sm:rounded-3xl border-2 border-white/15 bg-white/5 hover:bg-white/15 text-white flex flex-col items-center justify-center gap-1 shadow-xl hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                                        title="Önceki Harf [←]"
                                    >
                                        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-amber-300" />
                                        <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">Önceki</span>
                                    </Button>

                                    {/* DEV MERKEZ KART (RENKLİ ÇERÇEVE & KRİSTAL NETLİKTE HAT) */}
                                    <div 
                                        onClick={() => playAudio(currentItem.audio, selectedItemIndex)}
                                        className={cn(
                                            "flex-1 max-w-2xl rounded-[2.5rem] border-3 p-5 sm:p-8 flex flex-col items-center justify-between gap-5 transition-all duration-300 shadow-2xl relative select-none cursor-pointer group hover:scale-[1.01] backdrop-blur-xl",
                                            currentSingleTheme.bg,
                                            currentlyPlayingAudio === currentItem.audio
                                                ? currentSingleTheme.activeBorder
                                                : `${currentSingleTheme.border} ${currentSingleTheme.glow}`
                                        )}
                                    >
                                        {/* Kart Başlık Şeridi */}
                                        <div className="w-full flex items-center justify-between">
                                            <Badge className={cn("text-xs font-black px-3 py-1 border shadow-md", currentSingleTheme.badge)}>
                                                #{currentItem.index} • {currentUnit.title.replace(/^Ders \d+:\s*/, '')}
                                            </Badge>

                                            {currentlyPlayingAudio === currentItem.audio ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-black animate-pulse">
                                                    <Volume2 className="w-4 h-4" />
                                                    <span>Ses Çalınıyor...</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 font-bold group-hover:text-white transition-colors">
                                                    Dokun ve Dinle
                                                </span>
                                            )}
                                        </div>

                                        {/* BÜYÜK ARAPÇA GÖRSEL ALANI (KREM/BEYAZ KART ÜZERİNDE DOĞAL VE NET) */}
                                        <div className={cn(
                                            "w-full rounded-3xl bg-gradient-to-b from-white via-white to-amber-50/50 p-6 sm:p-10 shadow-2xl border-2 border-white/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
                                            isFullscreen ? "min-h-[260px] sm:min-h-[360px] md:min-h-[420px]" : "min-h-[200px] sm:min-h-[280px]"
                                        )}>
                                            <img
                                                src={currentItem.img}
                                                alt={currentItem.alt}
                                                className={cn(
                                                    "max-w-full object-contain pointer-events-none drop-shadow-md",
                                                    isFullscreen ? "max-h-[240px] sm:max-h-[320px] md:max-h-[380px]" : "max-h-[170px] sm:max-h-[240px]"
                                                )}
                                            />
                                        </div>

                                        {/* Kart Alt Açıklaması ve Büyük Ses Butonu */}
                                        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
                                            <div className="text-center sm:text-left">
                                                <span className="text-xs text-slate-400 block font-medium">Okunuş / Açıklama:</span>
                                                <span className="text-sm sm:text-base font-black text-white">
                                                    {currentItem.alt || `Harf ${currentItem.index}`}
                                                </span>
                                            </div>

                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    playAudio(currentItem.audio, selectedItemIndex);
                                                }}
                                                className={cn(
                                                    "px-5 py-2.5 h-auto rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95",
                                                    currentSingleTheme.btnBg
                                                )}
                                            >
                                                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                Sesi Dinle / Tekrar Et [Boşluk]
                                            </Button>
                                        </div>

                                    </div>

                                    {/* Sonraki Harf Butonu */}
                                    <Button
                                        variant="outline"
                                        onClick={handleNextItem}
                                        className="h-16 w-12 sm:h-24 sm:w-16 rounded-2xl sm:rounded-3xl border-2 border-white/15 bg-white/5 hover:bg-white/15 text-white flex flex-col items-center justify-center gap-1 shadow-xl hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                                        title="Sonraki Harf [→]"
                                    >
                                        <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-300" />
                                        <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">Sonraki</span>
                                    </Button>

                                </div>

                                {/* ALT HIZLI ATLAMA ŞERİDİ (MINI THUMBNAILS CAROUSEL) */}
                                <div className="w-full bg-black/40 p-2.5 rounded-2xl border border-white/10 overflow-x-auto custom-scrollbar flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-400 shrink-0 px-2 flex items-center gap-1">
                                        <ListFilter className="w-3.5 h-3.5 text-amber-400" /> Hızlı Geçiş:
                                    </span>
                                    {currentUnit.items.map((it, idx) => {
                                        const isCurrent = selectedItemIndex === idx;
                                        const theme = getItemTheme(idx);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedItemIndex(idx);
                                                    playAudio(it.audio, idx);
                                                }}
                                                className={cn(
                                                    "h-11 min-w-[50px] px-2 rounded-xl flex items-center justify-center gap-1 border transition-all text-xs font-black shrink-0 cursor-pointer relative",
                                                    isCurrent
                                                        ? `${theme.activeBorder} ${theme.bg} text-white scale-110 z-10`
                                                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/30"
                                                )}
                                                title={it.alt}
                                            >
                                                <span>#{it.index}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────── */}
                        {/* 2. CANLI & RENKLİ IZGARA MODU (GRID VIEW) */}
                        {/* ──────────────────────────────────────────────────────────── */}
                        {viewMode === 'grid' && (
                            <div className={cn(
                                "grid gap-3 sm:gap-4 overflow-y-auto custom-scrollbar flex-1 w-full p-1",
                                currentUnit.type === 'dua'
                                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
                            )}>
                                {currentUnit.items.map((item, idx) => {
                                    const isSelected = selectedItemIndex === idx;
                                    const isCurrentAudio = currentlyPlayingAudio === item.audio;
                                    const theme = getItemTheme(idx);

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => playAudio(item.audio, idx)}
                                            onDoubleClick={() => {
                                                setSelectedItemIndex(idx);
                                                setViewMode('single');
                                            }}
                                            className={cn(
                                                "border-2 transition-all duration-200 flex flex-col items-center justify-between relative select-none hover:scale-[1.04] active:scale-95 shadow-xl group cursor-pointer backdrop-blur-xl",
                                                isFullscreen
                                                    ? "p-4 sm:p-5 rounded-3xl min-h-[180px] sm:min-h-[220px] md:min-h-[250px]"
                                                    : "p-3 sm:p-4 rounded-2xl min-h-[140px] sm:min-h-[170px]",
                                                theme.bg,
                                                isCurrentAudio
                                                    ? `${theme.activeBorder} scale-105 z-10 animate-pulse`
                                                    : isSelected
                                                    ? "border-white/60 ring-2 ring-white/40 shadow-lg"
                                                    : `${theme.border} ${theme.glow}`
                                            )}
                                        >
                                            {/* Kart Üst Başlığı: Sıra ve Çalma İndikatörü */}
                                            <div className="w-full flex items-center justify-between text-[11px]">
                                                <span className={cn("font-mono font-black px-2 py-0.5 rounded-lg border", theme.numberBg)}>
                                                    #{item.index}
                                                </span>
                                                {isCurrentAudio && (
                                                    <span className={cn("font-black flex items-center gap-1 animate-pulse text-[10px]", theme.text)}>
                                                        <Volume2 className="w-3.5 h-3.5" /> Dinleniyor
                                                    </span>
                                                )}
                                            </div>

                                            {/* GÖRSEL ALANI (KREM/BEYAZ ZEMİN ÜZERİNDE ORİJİNAL ARAPÇA HAT) */}
                                            <div className={cn(
                                                "w-full flex items-center justify-center p-2 my-auto min-h-0 rounded-2xl bg-gradient-to-b from-white via-white to-amber-50/40 shadow-inner border border-white/60 transition-transform group-hover:scale-105",
                                                isFullscreen ? "h-26 sm:h-34 md:h-42" : "h-16 sm:h-22"
                                            )}>
                                                <img
                                                    src={item.img}
                                                    alt={item.alt}
                                                    className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-sm"
                                                />
                                            </div>

                                            {/* Kart Alt Çubuğu: Açıklama ve Ses Rozeti */}
                                            <div className="w-full flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px]">
                                                <span className="text-slate-300 truncate max-w-[110px] font-bold">
                                                    {item.alt || `Öğe ${item.index}`}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedItemIndex(idx);
                                                            setViewMode('single');
                                                            playAudio(item.audio, idx);
                                                        }}
                                                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                                                        title="Tek Tek Sırayla Okuma Moduna Geç"
                                                    >
                                                        <Maximize2 className="w-3 h-3" />
                                                    </button>
                                                    <span className={cn(
                                                        "p-1 rounded-lg transition-colors",
                                                        isCurrentAudio ? "bg-white text-slate-900 font-bold shadow-md" : "bg-white/10 text-slate-300 group-hover:text-white"
                                                    )}>
                                                        <Volume2 className="w-3 h-3" />
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ALT KLAVYE VE KULLANIM REHBERİ */}
                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-2 shrink-0 gap-2">
                            <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-[11px] sm:text-xs">
                                <span>[Boşluk]: Sesi Tekrar Dinle</span>
                                <span>•</span>
                                <span>[←/→]: Önceki/Sonraki</span>
                                <span>•</span>
                                <span>[M]: Görünüm Modu Değiştir</span>
                                <span>•</span>
                                <span>[O]: Otomatik İlerleme</span>
                                <span>•</span>
                                <span>[F]: Tam Ekran</span>
                            </div>

                            <div className="text-slate-400 text-[11px] font-medium">
                                Toplam {currentUnit.itemCount} içerik • İstediğiniz harfe tıklayın veya Tek Tek Sırayla Okuma moduna geçin
                            </div>
                        </div>

                    </div>

                    {/* DERS AÇIKLAMA VE KAİDELER KARTLARI (VARSA) */}
                    {currentUnit.notes && currentUnit.notes.length > 0 && (
                        <div className="bg-slate-900/70 p-5 rounded-3xl border border-white/10 shadow-lg space-y-3 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-sm font-black text-amber-300 border-b border-white/10 pb-2">
                                <Info className="w-4 h-4 text-amber-400" />
                                <span>{currentUnit.title} - Açıklamalar ve Kaideler</span>
                            </div>
                            <div className="space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                                {currentUnit.notes.map((note, idx) => (
                                    <p key={idx} className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                        {note}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                </main>
            )}

        </div>
    );
}
