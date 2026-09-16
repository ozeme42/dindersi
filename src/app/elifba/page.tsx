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
    FastForward,
    Sun,
    Moon,
    ZoomIn,
    ZoomOut
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 8 Canlı Renk Teması Paleti (Fiziksel Kart / Tahta Uyumlu)
const CARD_COLOR_THEMES = [
    {
        id: 'emerald',
        name: 'Zümrüt',
        border: 'border-emerald-400 hover:border-emerald-500',
        activeRing: 'ring-4 ring-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.55)] border-emerald-500',
        headerGradient: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white',
        footerBg: 'bg-emerald-50/90 border-emerald-100 text-emerald-950',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        accentText: 'text-emerald-600 dark:text-emerald-400',
        btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30',
        glow: 'shadow-emerald-500/15'
    },
    {
        id: 'cyan',
        name: 'Safir',
        border: 'border-cyan-400 hover:border-cyan-500',
        activeRing: 'ring-4 ring-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.55)] border-cyan-500',
        headerGradient: 'bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-500 text-white',
        footerBg: 'bg-cyan-50/90 border-cyan-100 text-cyan-950',
        badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        accentText: 'text-cyan-600 dark:text-cyan-400',
        btnBg: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30',
        glow: 'shadow-cyan-500/15'
    },
    {
        id: 'amber',
        name: 'Altın',
        border: 'border-amber-400 hover:border-amber-500',
        activeRing: 'ring-4 ring-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border-amber-500',
        headerGradient: 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white',
        footerBg: 'bg-amber-50/90 border-amber-100 text-amber-950',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        accentText: 'text-amber-600 dark:text-amber-400',
        btnBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30',
        glow: 'shadow-amber-500/15'
    },
    {
        id: 'violet',
        name: 'Ametist',
        border: 'border-violet-400 hover:border-violet-500',
        activeRing: 'ring-4 ring-violet-400 shadow-[0_0_35px_rgba(139,92,246,0.55)] border-violet-500',
        headerGradient: 'bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 text-white',
        footerBg: 'bg-violet-50/90 border-violet-100 text-violet-950',
        badge: 'bg-violet-100 text-violet-800 border-violet-300',
        accentText: 'text-violet-600 dark:text-violet-400',
        btnBg: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/30',
        glow: 'shadow-violet-500/15'
    },
    {
        id: 'rose',
        name: 'Yakut',
        border: 'border-rose-400 hover:border-rose-500',
        activeRing: 'ring-4 ring-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.55)] border-rose-500',
        headerGradient: 'bg-gradient-to-r from-rose-600 via-pink-500 to-red-500 text-white',
        footerBg: 'bg-rose-50/90 border-rose-100 text-rose-950',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        accentText: 'text-rose-600 dark:text-rose-400',
        btnBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30',
        glow: 'shadow-rose-500/15'
    },
    {
        id: 'indigo',
        name: 'Gece Mavisi',
        border: 'border-indigo-400 hover:border-indigo-500',
        activeRing: 'ring-4 ring-indigo-400 shadow-[0_0_35px_rgba(99,102,241,0.55)] border-indigo-500',
        headerGradient: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white',
        footerBg: 'bg-indigo-50/90 border-indigo-100 text-indigo-950',
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        accentText: 'text-indigo-600 dark:text-indigo-400',
        btnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30',
        glow: 'shadow-indigo-500/15'
    },
    {
        id: 'teal',
        name: 'Turkuaz',
        border: 'border-teal-400 hover:border-teal-500',
        activeRing: 'ring-4 ring-teal-400 shadow-[0_0_35px_rgba(20,184,166,0.55)] border-teal-500',
        headerGradient: 'bg-gradient-to-r from-teal-600 via-emerald-500 to-green-500 text-white',
        footerBg: 'bg-teal-50/90 border-teal-100 text-teal-950',
        badge: 'bg-teal-100 text-teal-800 border-teal-300',
        accentText: 'text-teal-600 dark:text-teal-400',
        btnBg: 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/30',
        glow: 'shadow-teal-500/15'
    },
    {
        id: 'orange',
        name: 'Mercan',
        border: 'border-orange-400 hover:border-orange-500',
        activeRing: 'ring-4 ring-orange-400 shadow-[0_0_35px_rgba(249,115,22,0.55)] border-orange-500',
        headerGradient: 'bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 text-white',
        footerBg: 'bg-orange-50/90 border-orange-100 text-orange-950',
        badge: 'bg-orange-100 text-orange-800 border-orange-300',
        accentText: 'text-orange-600 dark:text-orange-400',
        btnBg: 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/30',
        glow: 'shadow-orange-500/15'
    }
];


// 1. Ders: 29 Harfin Otantik İsimleri, Arapça Karakterleri ve Mahreçleri
const CUZ1_LETTER_META: Record<number, { name: string; arabic: string; desc: string }> = {
    1: { name: 'Elif', arabic: 'ا', desc: 'Boğaz sonu - "E" sesi gibidir' },
    2: { name: 'Be', arabic: 'ب', desc: 'Alt ve üst dudak - "B" sesi gibidir' },
    3: { name: 'Te', arabic: 'ت', desc: 'Dil ucu ile ön diş dipleri - "T" sesi gibidir' },
    4: { name: 'Se (Peltek)', arabic: 'ث', desc: 'Dil ucu ile ön diş uçları - Peltek "S"' },
    5: { name: 'Cim', arabic: 'ج', desc: 'Dil ortası ve üst damak - "C" sesi' },
    6: { name: 'Ha', arabic: 'ح', desc: 'Boğaz ortası - Hırıltısız temiz "H"' },
    7: { name: 'Hı', arabic: 'خ', desc: 'Boğazın ağza en yakın kısmı - Hırıltılı "H"' },
    8: { name: 'Dal', arabic: 'د', desc: 'Dil ucu ile üst ön diş dipleri - "D" sesi' },
    9: { name: 'Zel (Peltek)', arabic: 'ذ', desc: 'Dil ucu ile ön diş uçları - Peltek "Z"' },
    10: { name: 'Ra', arabic: 'ر', desc: 'Dil ucu ile ön damak - "R" sesi' },
    11: { name: 'Ze', arabic: 'ز', desc: 'Dil ucu ile alt dişler - Keskin "Z" sesi' },
    12: { name: 'Sin', arabic: 'س', desc: 'Dil ucu ile alt dişler - Keskin "S" sesi' },
    13: { name: 'Şın', arabic: 'ش', desc: 'Dil ortası ve üst damak - Yumuşak "Ş" sesi' },
    14: { name: 'Sad', arabic: 'ص', desc: 'Dil ucu ile alt ön dişler - Kalın "S" sesi (Sa)' },
    15: { name: 'Dad', arabic: 'ض', desc: 'Dil kenarı ve üst azı dişler - Kalın harf' },
    16: { name: 'Tı', arabic: 'ط', desc: 'Dil ucu ile üst diş dipleri - Kalın "T" sesi (Ta)' },
    17: { name: 'Zı (Peltek)', arabic: 'ظ', desc: 'Dil ucu ve ön diş uçları - Kalın Peltek "Z"' },
    18: { name: 'Ayn', arabic: 'ع', desc: 'Boğaz ortası sıkılarak çıkarılan boğaz harfi' },
    19: { name: 'Gayn', arabic: 'غ', desc: 'Boğazın ağza en yakın kısmı - Yumuşak "G"' },
    20: { name: 'Fe', arabic: 'ف', desc: 'Üst ön dişler ve alt dudak - "F" sesi' },
    21: { name: 'Kaf', arabic: 'ق', desc: 'Dil kökü ve küçük dil - Kalın "K" sesi (Ka)' },
    22: { name: 'Kef', arabic: 'ك', desc: 'Dil kökü önü - İnce "K" sesi (Ke)' },
    23: { name: 'Lam', arabic: 'ل', desc: 'Dil ucu ve üst damak - "L" sesi' },
    24: { name: 'Mim', arabic: 'م', desc: 'Alt ve üst dudak kapanarak - "M" sesi' },
    25: { name: 'Nun', arabic: 'ن', desc: 'Dil ucu ve iki üst ön diş eti - "N" sesi' },
    26: { name: 'Vav', arabic: 'و', desc: 'Dudaklar ileri uzatılarak - "V" sesi' },
    27: { name: 'He', arabic: 'ه', desc: 'Boğaz sonu / Göğüs - Hafif "H" sesi' },
    28: { name: 'Lamelif', arabic: 'لا', desc: 'Lam (ل) ve Elif (ا) harflerinin birleşimi' },
    29: { name: 'Ye', arabic: 'ى', desc: 'Dil ortası ve üst damak - "Y" sesi' },
};

export default function ElifbaPortalPage() {
    // Aktif Sekme: 'cuz' (28 Ders), 'dua' (8 Dua), 'classic' (Orijinal HTML)
    const [activeTab, setActiveTab] = useState<'cuz' | 'dua' | 'classic'>('cuz');
    
    // Görünüm Modu: 'grid' (Tüm Liste) veya 'single' (Tek Tek Sırayla Okuma)
    const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
    
    // Tekli Mod Harf Boyutu: 'normal' | 'large' | 'huge' | 'max'
    // Büyük (%210) kullanıcının tam ekranda en beğendiği, taşmayan ideal boyuttur.
    const [sizePreset, setSizePreset] = useState<'normal' | 'large' | 'huge' | 'max'>('large');
    const [fineTune, setFineTune] = useState<number>(0); // -2 ile +2 arası ince ayar adımı
    
    // Arka Plan Teması: 'dark' (Akıllı Tahta / Koyu Stüdyo) veya 'light' (Aydınlık Ferah Sınıf)
    const [ambianceTheme, setAmbianceTheme] = useState<'dark' | 'light'>('dark');
    
    // Seçili Ders / Dua
    const [selectedUnitId, setSelectedUnitId] = useState<string>('cuz1');
    const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
    
    // Filtre
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    
    // Ses ve Oynatma Durumu
    const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
    const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState<string | null>(null);
    const [isAutoAdvance, setIsAutoAdvance] = useState<boolean>(false);
    const [autoDelay, setAutoDelay] = useState<number>(1800);
    
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

    // Tekli harf (cuz1) ve Kelimeler (cuz2+) için ekrandan ASLA taşmayan, görüntüyü bozmayan güvenli çarpan
    const isSingleLetter = currentUnit.id === 'cuz1';
    const effectiveScale = useMemo(() => {
        if (isFullscreen) {
            // TAM EKRAN MODU:
            // Ekran alanı tüm monitörü kapladığı için görsel tuvali zaten geniştir (~880px yükseklik).
            // Kullanıcı uyarısı: "bozulacaksa çok büyütmeye gerek yok, tam ekranda harf bozuluyor/taşıyor".
            // Bu nedenle aşırı büyütüp pikselleştirmek yerine net, berrak, tüm noktaları ve kuyrukları ekranda tam görünen güvenli oranlar:
            if (isSingleLetter) {
                const base = {
                    normal: 0.98, // Standart berrak ve rahat nefes alan görünüm (%98)
                    large: 1.10,  // Kullanıcı için ideal büyük, net ve zarif boyut (%110)
                    huge: 1.18,   // Devasa tahta sunum boyutu (%118 - sıfır taşma)
                    max: 1.25,    // Maksimum güvenli sınır (%125 - tüm harf noktaları ve kuyrukları içeride)
                }[sizePreset];
                const tuned = base + fineTune * 0.04;
                return Math.min(Math.max(tuned, 0.85), 1.26);
            } else {
                const base = {
                    normal: 0.82,
                    large: 0.92,
                    huge: 1.02,
                    max: 1.12,
                }[sizePreset];
                const tuned = base + fineTune * 0.03;
                return Math.min(Math.max(tuned, 0.70), 1.15);
            }
        } else {
            // NORMAL / PENCERE MODU:
            // Kullanıcının "diğeri iyi" diyerek beğendiği mevcut ölçekler eksiksiz korunur:
            if (isSingleLetter) {
                const base = {
                    normal: 1.70, // Standart rahat okuma
                    large: 2.10,  // Kullanıcının pencere modunda beğendiği ideal boyut
                    huge: 2.30,   // Devasa boyut
                    max: 2.45,    // Ekranı dolduran maksimum sınır
                }[sizePreset];
                const tuned = base + fineTune * 0.08;
                return Math.min(Math.max(tuned, 1.30), 2.48);
            } else {
                const base = {
                    normal: 0.95,
                    large: 1.10,
                    huge: 1.22,
                    max: 1.35,
                }[sizePreset];
                const tuned = base + fineTune * 0.05;
                return Math.min(Math.max(tuned, 0.80), 1.40);
            }
        }
    }, [isFullscreen, isSingleLetter, sizePreset, fineTune]);

    // Tema rengi
    const getItemTheme = useCallback((index: number) => {
        return CARD_COLOR_THEMES[index % CARD_COLOR_THEMES.length];
    }, []);

    // Sekme değişimi
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

    // Otomatik İlerleme
    useEffect(() => {
        if (!isAutoAdvance || viewMode !== 'single') {
            if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
            return;
        }

        if (!currentItem) return;

        playAudio(currentItem.audio, selectedItemIndex, () => {
            if (!isAutoAdvance) return;
            autoTimerRef.current = setTimeout(() => {
                if (selectedItemIndex < currentUnit.items.length - 1) {
                    setSelectedItemIndex(prev => prev + 1);
                } else {
                    setIsAutoAdvance(false);
                }
            }, autoDelay);
        });

        return () => {
            if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        };
    }, [isAutoAdvance, viewMode, selectedItemIndex, currentUnit.items.length, autoDelay]);

    // Izgara Modu Otomatik Çalma
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
            const isDocFs = !!document.fullscreenElement;
            const isWinFs = typeof window !== 'undefined' && (
                window.innerHeight === window.screen.height && window.innerWidth === window.screen.width
            );
            setIsFullscreen(isDocFs || isWinFs);
            setFineTune(0);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('resize', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('resize', handleFullscreenChange);
        };
    }, []);

    // Klavye Kısayolları
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

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
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                setFineTune(prev => Math.min(prev + 1, 2));
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                setFineTune(prev => Math.max(prev - 1, -2));
            } else if (e.key === '0') {
                e.preventDefault();
                setSizePreset('large');
                setFineTune(0);
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
        <div className={cn(
            "min-h-screen flex flex-col transition-colors duration-300",
            ambianceTheme === 'dark' 
                ? "bg-gradient-to-b from-[#0b1220] via-[#101b30] to-[#090e18] text-slate-100" 
                : "bg-gradient-to-b from-slate-100 via-amber-50/40 to-sky-50/50 text-slate-800"
        )}>
            
            {/* ÜST BAŞLIK BAR */}
            <header className={cn(
                "sticky top-0 z-40 backdrop-blur-xl border-b px-4 sm:px-8 py-3 transition-colors",
                ambianceTheme === 'dark' 
                    ? "bg-[#0b1220]/90 border-white/10" 
                    : "bg-white/90 border-slate-200 shadow-sm"
            )}>
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                    
                    {/* Sol: Geri & Başlık */}
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className={cn(
                                "h-9 w-9 rounded-xl border transition-colors",
                                ambianceTheme === 'dark' ? "border-white/10 hover:bg-white/10 text-slate-300" : "border-slate-300 hover:bg-slate-100 text-slate-700"
                            )}>
                                <Home className="w-4 h-4" />
                            </Button>
                        </Link>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "font-black text-lg md:text-xl tracking-tight text-transparent bg-clip-text",
                                    ambianceTheme === 'dark'
                                        ? "bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-400"
                                        : "bg-gradient-to-r from-teal-700 via-emerald-600 to-blue-700"
                                )}>
                                    İnteraktif Elifba & Dualar
                                </span>
                                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-black px-2 py-0.5">
                                    36 Ünite
                                </Badge>
                            </div>
                            <span className="text-xs text-slate-400 dark:text-slate-400">
                                Akıllı Tahta Uyumlu • Renkli Sesli Kur'an Öğrenimi
                            </span>
                        </div>
                    </div>

                    {/* Orta: Ana Sekmeler */}
                    <div className={cn(
                        "flex items-center p-1 rounded-2xl border shadow-inner transition-colors",
                        ambianceTheme === 'dark' ? "bg-slate-900/90 border-white/10" : "bg-slate-200/80 border-slate-300"
                    )}>
                        <button
                            type="button"
                            onClick={() => handleTabChange('cuz')}
                            className={cn(
                                "px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                                activeTab === 'cuz'
                                    ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-emerald-950/40"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                                    ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-950/40"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950/40"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            )}
                            title="Orijinal Web Sürümü"
                        >
                            <ExternalLink className="w-3 h-3" /> Klasik Sürüm
                        </button>
                    </div>

                    {/* Sağ: Tema Değiştirici & Öğretmen Takip */}
                    <div className="flex items-center gap-2">
                        {/* Aydınlık / Koyu Zemin Ambiansı */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAmbianceTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                            className={cn(
                                "h-9 w-9 rounded-xl border transition-colors",
                                ambianceTheme === 'dark' ? "border-white/10 hover:bg-white/10 text-amber-300" : "border-slate-300 hover:bg-slate-200 text-slate-700"
                            )}
                            title={ambianceTheme === 'dark' ? "Aydınlık Sınıf Temasına Geç" : "Koyu Akıllı Tahta Temasına Geç"}
                        >
                            {ambianceTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </Button>

                        <Link href="/teacher/quran-tracker">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-3.5 rounded-xl text-xs shadow-md">
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
                    <div className={cn(
                        "p-3 rounded-2xl border flex items-center justify-between mb-4",
                        ambianceTheme === 'dark' ? "bg-slate-900/80 border-white/10" : "bg-white border-slate-300"
                    )}>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                            <Info className="w-4 h-4 text-cyan-500" />
                            <span>Orijinal web yazılımı yükleniyor. Tüm ses ve harfler orijinal formatında sunulmaktadır.</span>
                        </div>
                        <a 
                            href="/elifba/elifba.htm" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                        >
                            Yeni Sekmede Aç <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                    <div className="flex-1 rounded-3xl overflow-hidden border border-slate-300 dark:border-white/10 shadow-2xl bg-white min-h-[75vh]">
                        <iframe 
                            src="/elifba/elifba.htm" 
                            title="Orijinal Elifba Web Uygulaması"
                            className="w-full h-full border-none min-h-[75vh]"
                        />
                    </div>
                </div>
            ) : (
                /* MODERN İNTERAKTİF ELİFBA & DUALAR PORTALI */
                <main className={cn(
                    "flex-1 flex flex-col max-w-[1750px] mx-auto w-full transition-all",
                    viewMode === 'single'
                        ? "p-2 sm:p-3 h-[calc(100vh-4.25rem)] min-h-[500px] overflow-hidden justify-between"
                        : "p-3 sm:p-6 gap-5"
                )}>
                    
                    {/* ÜNİTE LİSTESİ VE KATEGORİ FİLTRESİ (YALNIZCA IZGARA MODUNDA GÖSTERİLİR) */}
                    {viewMode === 'grid' && (
                    <div className={cn(
                        "p-3 rounded-2xl border shadow-lg flex flex-col gap-2.5 backdrop-blur-md transition-colors",
                        ambianceTheme === 'dark' ? "bg-slate-900/70 border-white/10" : "bg-white/80 border-slate-200"
                    )}>
                        
                        {/* Kategori Butonları (Yalnızca Cüz Derslerinde) */}
                        {activeTab === 'cuz' && (
                            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
                                <span className="font-bold text-[11px] shrink-0 mr-1 flex items-center gap-1 text-slate-400">
                                    <ListFilter className="w-3 h-3 text-amber-500" /> Konular:
                                </span>
                                <button
                                    onClick={() => setCategoryFilter('all')}
                                    className={cn(
                                        "px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                        categoryFilter === 'all' 
                                            ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40" 
                                            : ambianceTheme === 'dark'
                                                ? "bg-slate-950 border border-white/10 text-slate-400 hover:text-white"
                                                : "bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900"
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
                                            categoryFilter === cat 
                                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40" 
                                                : ambianceTheme === 'dark'
                                                    ? "bg-slate-950 border border-white/10 text-slate-400 hover:text-white"
                                                    : "bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900"
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
                                            "px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-black transition-all relative shrink-0 border cursor-pointer select-none",
                                            isCurrent
                                                ? activeTab === 'dua'
                                                    ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-400 shadow-lg scale-105 z-10"
                                                    : "bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-300 shadow-lg scale-105 z-10"
                                                : ambianceTheme === 'dark'
                                                    ? "bg-slate-950/80 border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
                                                    : "bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900"
                                        )}
                                    >
                                        <span className="font-mono text-[10px] opacity-80">#{u.number}</span>
                                        <span className="truncate max-w-[170px]">{u.title.replace(/^Ders \d+:\s*/, '')}</span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/30 bg-black/10">
                                            {u.itemCount}
                                        </Badge>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    )}

                    {/* AKTİF DERS OYNATICI SAHNESİ (AKILLI TAHTA ÇALIŞMA MASASI) */}
                    <div 
                        ref={playerContainerRef}
                        className={cn(
                            "transition-all duration-300 backdrop-blur-xl relative flex flex-col justify-between",
                            viewMode === 'single'
                                ? "flex-1 min-h-0 h-full p-2 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 shadow-2xl overflow-hidden gap-2"
                                : "rounded-[2.5rem] border p-4 sm:p-6 shadow-2xl gap-4 border-b-8",
                            ambianceTheme === 'dark' 
                                ? (isFullscreen ? "bg-[#0f172a] border-white/15" : "bg-[#0f172a]/95 border-white/15 border-b-amber-900/60 shadow-black/60")
                                : (isFullscreen ? "bg-slate-100 border-slate-300" : "bg-white/95 border-slate-300 border-b-amber-600/40 shadow-slate-400/30"),
                            isFullscreen && "fixed inset-0 z-50 rounded-none max-w-none max-h-none h-screen w-screen p-2 sm:p-4 overflow-hidden"
                        )}
                    >
                        {/* 1. IZGARA MODU ÜST BAŞLIĞI VE KONTROLLERİ */}
                        {viewMode === 'grid' && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3 shrink-0">
                                {/* Sol: Ders Başlığı ve Gezinme */}
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrevUnit}
                                        disabled={currentUnitIndex <= 0}
                                        className={cn(
                                            "h-8 px-2.5 rounded-xl border text-xs font-bold disabled:opacity-30",
                                            ambianceTheme === 'dark' ? "border-white/15 bg-white/5 text-slate-200" : "border-slate-300 bg-slate-50 text-slate-700"
                                        )}
                                        title="Önceki Ders"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Önceki Ders
                                    </Button>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className={cn(
                                                "text-base sm:text-xl font-black",
                                                ambianceTheme === 'dark' ? "text-white" : "text-slate-900"
                                            )}>
                                                {currentUnit.title}
                                            </h2>
                                            <Badge className={cn("text-[10px] font-black px-2 py-0.5", currentUnit.type === 'dua' ? "bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30")}>
                                                {currentUnit.itemCount} Öğe
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-2xl font-medium">
                                            {currentUnit.description}
                                        </p>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleNextUnit}
                                        disabled={currentUnitIndex >= (activeTab === 'dua' ? NAMAZ_DUALARI.length - 1 : CUZ_LESSONS.length - 1)}
                                        className={cn(
                                            "h-8 px-2.5 rounded-xl border text-xs font-bold disabled:opacity-30",
                                            ambianceTheme === 'dark' ? "border-white/15 bg-white/5 text-slate-200" : "border-slate-300 bg-slate-50 text-slate-700"
                                        )}
                                        title="Sonraki Ders"
                                    >
                                        Sonraki Ders <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>

                                {/* Sağ: Görünüm Modu Seçici & Kontroller */}
                                <div className="flex items-center flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewMode('single');
                                            setIsPlayingAll(false);
                                            if (currentItem) playAudio(currentItem.audio, selectedItemIndex);
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-950/40 hover:scale-105"
                                        title="Harfleri Tek Tek Ekranda Sırayla Oku [M]"
                                    >
                                        <SquareChevronRight className="w-3.5 h-3.5" /> Tek Tek Sırayla Oku
                                    </button>

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

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleFullscreen}
                                        className={cn(
                                            "h-9 w-9 rounded-xl border transition-colors",
                                            ambianceTheme === 'dark' ? "border-white/10 hover:bg-white/10 text-slate-300" : "border-slate-300 hover:bg-slate-100 text-slate-700"
                                        )}
                                        title="Tam Ekran / Akıllı Tahta Modu [F]"
                                    >
                                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* DUA ÖZEL BÖLÜMÜ: OKUNUŞ VE ANLAM KARTLARI (YALNIZCA IZGARADA GÖSTERİLİR) */}
                        {viewMode === 'grid' && currentUnit.type === 'dua' && (currentUnit.meaning || currentUnit.pronunciation) && (
                            <div className={cn(
                                "grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-3xl border shadow-inner transition-colors",
                                ambianceTheme === 'dark' ? "bg-slate-950/80 border-white/10" : "bg-amber-50/70 border-amber-200"
                            )}>
                                {currentUnit.pronunciation && (
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3 text-rose-500" /> Türkçe Okunuşu:
                                        </span>
                                        <p className="text-xs sm:text-sm font-semibold leading-relaxed italic p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                            {currentUnit.pronunciation}
                                        </p>
                                    </div>
                                )}
                                {currentUnit.meaning && (
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Türkçe Anlamı:
                                        </span>
                                        <p className="text-xs sm:text-sm leading-relaxed p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300">
                                            {currentUnit.meaning}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────── */}
                        {/* 1. TEK TEK SIRAYLA OKUMA MODU (DEV ODAK HARF SAHNESİ) */}
                        {/* ──────────────────────────────────────────────────────────── */}
                        {/* ──────────────────────────────────────────────────────────── */}
                        {viewMode === 'single' && currentItem && (
                            <div className="flex-1 min-h-0 w-full flex flex-col justify-between gap-2 select-none">
                                
                                {/* TEKLİ MOD KOMPAKT ÜST KONTROL ÇUBUĞU (TEK SIRADA HER ŞEY) */}
                                <div className={cn(
                                    "w-full max-w-5xl xl:max-w-6xl mx-auto px-3 py-1.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-sm",
                                    ambianceTheme === 'dark' ? "bg-slate-900/90 border-white/10" : "bg-white border-slate-200"
                                )}>
                                    {/* Sol: Ders Seçici & Harf Sayacı */}
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePrevUnit}
                                            disabled={currentUnitIndex <= 0}
                                            className="h-7 px-2 rounded-lg text-xs font-bold border-slate-300 dark:border-white/15"
                                            title="Önceki Ders"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </Button>

                                        <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[220px]">
                                            {currentUnit.shortTitle || currentUnit.title}
                                        </span>

                                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-mono font-black px-2 py-0">
                                            {selectedItemIndex + 1} / {currentUnit.items.length}
                                        </Badge>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleNextUnit}
                                            disabled={currentUnitIndex >= (activeTab === 'dua' ? NAMAZ_DUALARI.length - 1 : CUZ_LESSONS.length - 1)}
                                            className="h-7 px-2 rounded-lg text-xs font-bold border-slate-300 dark:border-white/15"
                                            title="Sonraki Ders"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>

                                    {/* Orta: Kompakt Harf Boyutu & Zoom */}
                                    <div className="flex items-center gap-1 bg-black/10 dark:bg-white/10 p-0.5 rounded-xl border border-slate-300 dark:border-white/10 text-[11px]">
                                        <span className="text-slate-400 px-1 font-bold hidden md:inline text-[10px]">Boyut:</span>
                                        <button
                                            type="button"
                                            onClick={() => { setSizePreset('normal'); setFineTune(0); }}
                                            className={cn(
                                                "px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer text-xs",
                                                sizePreset === 'normal' && fineTune === 0 ? "bg-amber-500 text-slate-900 shadow-sm" : "hover:text-white text-slate-400"
                                            )}
                                            title="Normal Boyut"
                                        >
                                            Normal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setSizePreset('large'); setFineTune(0); }}
                                            className={cn(
                                                "px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer text-xs",
                                                sizePreset === 'large' && fineTune === 0 ? "bg-amber-500 text-slate-900 shadow-sm" : "hover:text-white text-slate-400"
                                            )}
                                            title="Büyük Boyut (Tam Ekrana İdeal)"
                                        >
                                            Büyük
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setSizePreset('huge'); setFineTune(0); }}
                                            className={cn(
                                                "px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer text-xs",
                                                sizePreset === 'huge' && fineTune === 0 ? "bg-emerald-500 text-white shadow-sm" : "hover:text-white text-slate-400"
                                            )}
                                            title="Devasa Boyut (Taşmaz)"
                                        >
                                            Devasa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setSizePreset('max'); setFineTune(0); }}
                                            className={cn(
                                                "px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer text-xs",
                                                sizePreset === 'max' && fineTune === 0 ? "bg-rose-500 text-white shadow-sm" : "hover:text-white text-slate-400"
                                            )}
                                            title="Maksimum (Ekranı Doldurur, Sıfır Taşma)"
                                        >
                                            Maksimum
                                        </button>

                                        {/* +/- İnce Ayar */}
                                        <div className="flex items-center border-l border-slate-300 dark:border-white/20 pl-1 ml-0.5 gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setFineTune(prev => Math.max(prev - 1, -2))}
                                                className="p-1 rounded hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                                title="Küçült [-]"
                                            >
                                                <ZoomOut className="w-3 h-3" />
                                            </button>
                                            <span className="font-mono text-[10px] font-black text-amber-500 dark:text-amber-400 min-w-[34px] text-center">
                                                %{Math.round(effectiveScale * 100)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setFineTune(prev => Math.min(prev + 1, 2))}
                                                className="p-1 rounded hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                                title="Büyüt [+]"
                                            >
                                                <ZoomIn className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sağ: Otomatik Oku, Izgaraya Dön & Tam Ekran */}
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            size="sm"
                                            onClick={() => setIsAutoAdvance(prev => !prev)}
                                            className={cn(
                                                "h-7 px-2.5 rounded-lg font-bold text-xs transition-all shadow-sm cursor-pointer",
                                                isAutoAdvance
                                                    ? "bg-amber-500 hover:bg-amber-400 text-black animate-pulse"
                                                    : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10"
                                            )}
                                            title="Ses bittiğinde otomatik sonraki harfe geçer [O]"
                                        >
                                            <FastForward className="w-3 h-3 mr-1" />
                                            {isAutoAdvance ? "Oto: Açık" : "Oto Oku"}
                                        </Button>

                                        <Button
                                            size="sm"
                                            onClick={() => setViewMode('grid')}
                                            className="h-7 px-2.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm cursor-pointer"
                                            title="Tüm Harfleri Izgara Modunda Gör [M]"
                                        >
                                            <LayoutGrid className="w-3 h-3 mr-1" /> Izgara
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={toggleFullscreen}
                                            className={cn(
                                                "h-7 w-7 rounded-lg border transition-colors",
                                                ambianceTheme === 'dark' ? "border-white/10 text-slate-300 hover:bg-white/10" : "border-slate-300 text-slate-700 hover:bg-slate-100"
                                            )}
                                            title="Tam Ekran / Akıllı Tahta [F]"
                                        >
                                            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* MERKEZ DEVASA HARF KARTI (TÜM DERİNLİĞİ KULLANIR, EKRANA TAM SIĞAR) */}
                                <div 
                                    onClick={() => playAudio(currentItem.audio, selectedItemIndex)}
                                    className={cn(
                                        "flex-1 min-h-0 w-full max-w-5xl xl:max-w-6xl mx-auto rounded-2xl sm:rounded-3xl border-2 flex flex-col justify-between transition-all duration-200 shadow-xl relative select-none cursor-pointer bg-white border-b-6",
                                        currentSingleTheme.border,
                                        currentlyPlayingAudio === currentItem.audio
                                            ? currentSingleTheme.activeRing
                                            : `shadow-lg ${currentSingleTheme.glow}`
                                    )}
                                >
                                    {/* Kart Üst İnce Şerit (28px - Sıfır İsraf) */}
                                    <div className={cn(
                                        "w-full h-7 sm:h-8 px-4 flex items-center justify-between shadow-sm shrink-0",
                                        currentSingleTheme.headerGradient
                                    )}>
                                        <span className="text-xs font-black tracking-wide">
                                            #{currentItem.index} • {(() => {
                                                const cuz1Meta = currentUnit.id === 'cuz1' ? CUZ1_LETTER_META[currentItem.index] : null;
                                                return cuz1Meta ? `${cuz1Meta.name} (${cuz1Meta.arabic})` : (currentItem.alt || `Harf ${currentItem.index}`);
                                            })()}
                                        </span>

                                        {currentlyPlayingAudio === currentItem.audio ? (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/25 text-white font-black text-[11px] animate-pulse">
                                                <div className="flex items-end gap-0.5 h-3">
                                                    <span className="w-0.5 bg-white rounded-full animate-bounce h-1.5" />
                                                    <span className="w-0.5 bg-white rounded-full animate-bounce h-3" />
                                                    <span className="w-0.5 bg-white rounded-full animate-bounce h-2" />
                                                </div>
                                                <span>Dinleniyor...</span>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] font-bold text-white/90 group-hover:text-white flex items-center gap-1">
                                                <Volume2 className="w-3.5 h-3.5" /> Dokun & Dinle
                                            </span>
                                        )}
                                    </div>

                                    {/* ORTA HARF TUVALİ: TÜM EKRAN YÜKSEKLİĞİNİ DOLDURAN HARF ALANI */}
                                    <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1 sm:p-3 relative overflow-hidden bg-white">
                                        
                                        {/* Sol Floating Önceki Harf Butonu */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePrevItem();
                                            }}
                                            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-14 sm:w-11 sm:h-20 rounded-2xl bg-black/10 hover:bg-black/25 active:scale-95 text-slate-800 flex items-center justify-center backdrop-blur-md border border-black/10 shadow-md transition-all cursor-pointer group"
                                            title="Önceki Harf [←]"
                                        >
                                            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 group-hover:scale-110 transition-transform" />
                                        </button>

                                        {/* Arka plandaki yumuşak radial ışık */}
                                        <div className="absolute inset-0 bg-radial from-amber-100/30 via-transparent to-transparent pointer-events-none" />

                                        {/* DEVASA ARAPÇA HAT ÇİZİMİ */}
                                        <img
                                            src={currentItem.img}
                                            alt={currentItem.alt}
                                            style={{
                                                transform: `scale(${effectiveScale})`,
                                                transformOrigin: 'center center',
                                                filter: isFullscreen 
                                                    ? 'contrast(1.10) brightness(0.98)' 
                                                    : 'contrast(1.15) brightness(0.96)',
                                                imageRendering: isFullscreen ? 'auto' : '-webkit-optimize-contrast'
                                            }}
                                            className="h-full max-h-full w-auto max-w-full object-contain pointer-events-none transition-transform duration-200 drop-shadow-sm select-none"
                                        />

                                        {/* Sağ Floating Sonraki Harf Butonu */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNextItem();
                                            }}
                                            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-14 sm:w-11 sm:h-20 rounded-2xl bg-black/10 hover:bg-black/25 active:scale-95 text-slate-800 flex items-center justify-center backdrop-blur-md border border-black/10 shadow-md transition-all cursor-pointer group"
                                            title="Sonraki Harf [→]"
                                        >
                                            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>

                                    {/* Kart Alt İnce Şerit (Mahreç Açıklaması & Ses Çalma) */}
                                    <div className={cn(
                                        "w-full h-10 sm:h-12 px-4 sm:px-6 flex items-center justify-between shrink-0 border-t border-slate-200 shadow-inner",
                                        currentSingleTheme.footerBg
                                    )}>
                                        {(() => {
                                            const cuz1Meta = currentUnit.id === 'cuz1' ? CUZ1_LETTER_META[currentItem.index] : null;
                                            return (
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-[11px] text-slate-500 font-bold uppercase hidden sm:inline">Mahreç:</span>
                                                    <span className="text-base sm:text-xl font-black text-slate-900 tracking-wide">
                                                        {cuz1Meta ? cuz1Meta.name : (currentItem.alt || `Harf ${currentItem.index}`)}
                                                    </span>
                                                    {cuz1Meta && (
                                                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-[200px] sm:max-w-md">
                                                            {cuz1Meta.arabic} • {cuz1Meta.desc}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playAudio(currentItem.audio, selectedItemIndex);
                                            }}
                                            className={cn(
                                                "h-7 sm:h-8 px-3 rounded-xl font-black text-xs transition-all shadow flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 shrink-0",
                                                currentSingleTheme.btnBg
                                            )}
                                        >
                                            <Volume2 className="w-3.5 h-3.5" />
                                            <span>Sesi Çal [Boşluk]</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* KOMPAKT HIZLI ATLAMA ŞERİDİ (MINI CAROUSEL - YALNIZCA 32px) */}
                                <div className={cn(
                                    "w-full max-w-5xl xl:max-w-6xl mx-auto h-8 sm:h-9 px-2 rounded-xl border overflow-x-auto custom-scrollbar flex items-center gap-1.5 shadow-inner shrink-0",
                                    ambianceTheme === 'dark' ? "bg-black/40 border-white/10" : "bg-slate-200/70 border-slate-300"
                                )}>
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                                        <ListFilter className="w-3 h-3 text-amber-500" /> Hızlı:
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
                                                    "h-6 min-w-[34px] px-1.5 rounded-lg flex items-center justify-center border transition-all text-[11px] font-bold shrink-0 cursor-pointer",
                                                    isCurrent
                                                        ? `${theme.activeRing} bg-white text-slate-900 font-black shadow-sm scale-105`
                                                        : ambianceTheme === 'dark'
                                                            ? "bg-white/10 border-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
                                                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                                                )}
                                                title={it.alt}
                                            >
                                                #{it.index}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* EN ALT TEK SATIR KISAYOL REHBERİ (YALNIZCA 18px) */}
                                <div className="w-full max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between text-[10px] text-slate-400 shrink-0 px-1 font-medium">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <span>[Boşluk]: Çal</span>
                                        <span>•</span>
                                        <span>[←/→]: Geçiş</span>
                                        <span>•</span>
                                        <span>[+/-]: Boyut</span>
                                        <span>•</span>
                                        <span>[0]: Sıfırla</span>
                                        <span>•</span>
                                        <span>[M]: Izgara</span>
                                        <span>•</span>
                                        <span>[F]: Tam Ekran</span>
                                    </div>
                                    <span className="hidden sm:inline">Ders {currentUnit.number}: {currentUnit.title} ({currentUnit.itemCount} içerik)</span>
                                </div>

                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────── */}
                        {/* 2. CANLI & RENKLİ IZGARA MODU (FİZİKSEL RENKLİ ÇALIŞMA KARTLARI) */}
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
                                                "border-2 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 select-none hover:scale-[1.05] active:scale-95 shadow-md hover:shadow-xl group cursor-pointer bg-white border-b-4",
                                                isFullscreen
                                                    ? "min-h-[190px] sm:min-h-[230px] md:min-h-[260px]"
                                                    : "min-h-[145px] sm:min-h-[175px]",
                                                theme.border,
                                                isCurrentAudio
                                                    ? `${theme.activeRing} scale-105 z-10 animate-pulse`
                                                    : isSelected
                                                    ? "border-slate-800 ring-2 ring-slate-800/40 shadow-xl"
                                                    : theme.glow
                                            )}
                                        >
                                            {/* Kart Üst Şeridi (Canlı Gradyan) */}
                                            <div className={cn(
                                                "w-full px-3 py-1 flex items-center justify-between text-[11px] font-black shadow-sm",
                                                theme.headerGradient
                                            )}>
                                                <span className="font-mono">#{item.index}</span>
                                                {isCurrentAudio ? (
                                                    <span className="flex items-center gap-1 text-[10px] animate-pulse">
                                                        <Volume2 className="w-3 h-3" /> Çalıyor
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] opacity-75 group-hover:opacity-100">
                                                        {currentUnit.type === 'dua' ? 'Dua' : 'Harf'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* GÖRSEL ALANI (KART BEYAZI İLE BÜTÜNLEŞİK, KESİK KUTU YOK, BÜYÜK VE NET) */}
                                            <div className={cn(
                                                "w-full flex items-center justify-center p-3 my-auto min-h-0 bg-white transition-transform group-hover:scale-110",
                                                isFullscreen ? "h-28 sm:h-36 md:h-44" : "h-18 sm:h-24"
                                            )}>
                                                <img
                                                    src={item.img}
                                                    alt={item.alt}
                                                    className={cn(
                                                        "max-h-full max-w-full object-contain pointer-events-none drop-shadow-sm",
                                                        currentUnit.id === 'cuz1' ? "scale-115 sm:scale-125" : "scale-100 sm:scale-105"
                                                    )}
                                                />
                                            </div>

                                            {/* Kart Alt Şeridi: Okunuş & Ses Rozeti */}
                                            <div className={cn(
                                                "w-full px-2.5 py-1.5 flex items-center justify-between border-t border-slate-100 text-[10px] font-bold",
                                                theme.footerBg
                                            )}>
                                                {(() => {
                                                    const m = currentUnit.id === 'cuz1' ? CUZ1_LETTER_META[item.index] : null;
                                                    return (
                                                        <span className="truncate max-w-[100px] font-black text-slate-800">
                                                            {m ? `${m.name} (${m.arabic})` : (item.alt || `Öğe ${item.index}`)}
                                                        </span>
                                                    );
                                                })()}
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedItemIndex(idx);
                                                            setViewMode('single');
                                                            playAudio(item.audio, idx);
                                                        }}
                                                        className="p-1 rounded-md bg-white hover:bg-slate-200 text-slate-600 transition-colors shadow-sm"
                                                        title="Büyüt ve Tekli Okumaya Geç"
                                                    >
                                                        <Maximize2 className="w-3 h-3" />
                                                    </button>
                                                    <span className={cn(
                                                        "p-1 rounded-md transition-colors shadow-sm",
                                                        isCurrentAudio ? "bg-slate-900 text-white font-bold" : "bg-white text-slate-700"
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
                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-black/10 dark:border-white/10 pt-2 shrink-0 gap-2 font-medium">
                            <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-[11px] sm:text-xs">
                                <span>[Boşluk]: Sesi Çal</span>
                                <span>•</span>
                                <span>[←/→]: Önceki/Sonraki</span>
                                <span>•</span>
                                <span>[+/-]: Harfi Büyüt/Küçült (%160-%750)</span>
                                <span>•</span>
                                <span>[0]: Boyutu Sıfırla</span>
                                <span>•</span>
                                <span>[M]: Mod Değiştir</span>
                                <span>•</span>
                                <span>[O]: Otomatik İlerleme</span>
                                <span>•</span>
                                <span>[F]: Tam Ekran</span>
                            </div>

                            <div className="text-[11px]">
                                Toplam {currentUnit.itemCount} içerik • İstediğiniz harfe tıklayın veya Tek Tek Sırayla Okuma moduna geçin
                            </div>
                        </div>

                    </div>

                    {/* DERS AÇIKLAMA VE KAİDELER KARTLARI (YALNIZCA IZGARA MODUNDA) */}
                    {viewMode === 'grid' && currentUnit.notes && currentUnit.notes.length > 0 && (
                        <div className={cn(
                            "p-5 rounded-3xl border shadow-lg space-y-3 backdrop-blur-md transition-colors",
                            ambianceTheme === 'dark' ? "bg-slate-900/70 border-white/10" : "bg-white/80 border-slate-200"
                        )}>
                            <div className="flex items-center gap-2 text-sm font-black text-amber-600 dark:text-amber-300 border-b border-black/10 dark:border-white/10 pb-2">
                                <Info className="w-4 h-4 text-amber-500" />
                                <span>{currentUnit.title} - Açıklamalar ve Kaideler</span>
                            </div>
                            <div className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                {currentUnit.notes.map((note, idx) => (
                                    <p key={idx} className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-black/5 dark:border-white/5">
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
