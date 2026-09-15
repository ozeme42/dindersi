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
    Home
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ElifbaPortalPage() {
    // Aktif Sekme: 'cuz' (28 Ders), 'dua' (8 Dua), 'classic' (Orijinal HTML)
    const [activeTab, setActiveTab] = useState<'cuz' | 'dua' | 'classic'>('cuz');
    
    // Seçili Ders / Dua
    const [selectedUnitId, setSelectedUnitId] = useState<string>('cuz1');
    const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
    
    // Filtre
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    
    // Ses ve Oynatma Durumu
    const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
    const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState<string | null>(null);
    const [cardTheme, setCardTheme] = useState<'dark' | 'light'>('dark');
    
    // Tam Ekran Durumu
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const playerContainerRef = useRef<HTMLDivElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

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

    // Sekme değiştiğinde ilk üniteye geç
    const handleTabChange = (tab: 'cuz' | 'dua' | 'classic') => {
        setActiveTab(tab);
        setCategoryFilter('all');
        setIsPlayingAll(false);
        if (tab === 'cuz') {
            setSelectedUnitId('cuz1');
            setSelectedItemIndex(0);
        } else if (tab === 'dua') {
            setSelectedUnitId('dua1');
            setSelectedItemIndex(0);
        }
    };

    // Ses Çalma Fonksiyonu
    const playAudio = useCallback((audioUrl: string, itemIdx?: number) => {
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
        };
    }, []);

    // Sırayla Tümünü Oynat (Autoplay)
    useEffect(() => {
        if (!isPlayingAll) {
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
    }, [isPlayingAll, currentUnit]);

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
                const nextIdx = (selectedItemIndex + 1) % currentUnit.items.length;
                const nextItem = currentUnit.items[nextIdx];
                if (nextItem) playAudio(nextItem.audio, nextIdx);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevIdx = (selectedItemIndex - 1 + currentUnit.items.length) % currentUnit.items.length;
                const prevItem = currentUnit.items[prevIdx];
                if (prevItem) playAudio(prevItem.audio, prevIdx);
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                setCardTheme(prev => prev === 'dark' ? 'light' : 'dark');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentUnit, selectedItemIndex, playAudio, toggleFullscreen]);

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
        }
    };

    const handleNextUnit = () => {
        const list = activeTab === 'dua' ? NAMAZ_DUALARI : CUZ_LESSONS;
        if (currentUnitIndex < list.length - 1) {
            setSelectedUnitId(list[currentUnitIndex + 1].id);
            setSelectedItemIndex(0);
            setIsPlayingAll(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
            
            {/* ÜST BAŞLIK BAR */}
            <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3">
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
                                <span className="font-black text-lg md:text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                                    İnteraktif Elifba & Namaz Duaları
                                </span>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                                    36 Kapsamlı Ünite
                                </Badge>
                            </div>
                            <span className="text-xs text-slate-400">
                                Akıllı Tahta Uyumlu • Sesli ve Görsel Kur'an Öğrenimi
                            </span>
                        </div>
                    </div>

                    {/* Orta: Ana Sekmeler */}
                    <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-white/10 shadow-inner">
                        <button
                            type="button"
                            onClick={() => handleTabChange('cuz')}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                                activeTab === 'cuz'
                                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <BookOpen className="w-3.5 h-3.5" /> Elifba Cüzü (28 Ders)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabChange('dua')}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
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
                                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
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
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 rounded-xl text-xs shadow-lg shadow-emerald-950/40">
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
                    <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/10 shadow-lg flex flex-col gap-2.5">
                        
                        {/* Kategori Butonları (Yalnızca Cüz Derslerinde) */}
                        {activeTab === 'cuz' && (
                            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
                                <span className="text-slate-500 font-bold text-[11px] shrink-0 mr-1 flex items-center gap-1">
                                    <ListFilter className="w-3 h-3" /> Konular:
                                </span>
                                <button
                                    onClick={() => setCategoryFilter('all')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                        categoryFilter === 'all' ? "bg-cyan-600 text-white shadow-sm" : "bg-slate-950 border border-white/10 text-slate-400 hover:text-white"
                                    )}
                                >
                                    Tümü (28)
                                </button>
                                {Object.entries(ELIFBA_CATEGORY_META).filter(([cat]) => cat !== 'dualar').map(([cat, meta]) => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategoryFilter(cat)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                            categoryFilter === cat ? "bg-cyan-600 text-white shadow-sm" : "bg-slate-950 border border-white/10 text-slate-400 hover:text-white"
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
                                        }}
                                        className={cn(
                                            "px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all relative shrink-0 border cursor-pointer select-none",
                                            isCurrent
                                                ? activeTab === 'dua'
                                                    ? "bg-rose-950/80 border-rose-400 text-white shadow-lg shadow-rose-950/50 scale-105 z-10"
                                                    : "bg-cyan-950/80 border-cyan-400 text-white shadow-lg shadow-cyan-950/50 scale-105 z-10"
                                                : "bg-slate-950 border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                                        )}
                                    >
                                        <span className="font-mono text-[10px] opacity-70">#{u.number}</span>
                                        <span className="truncate max-w-[170px]">{u.title.replace(/^Ders \d+:\s*/, '')}</span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/10">
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
                            "bg-slate-900/90 rounded-[2.5rem] border border-white/10 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 relative transition-all duration-300",
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
                                    className="h-8 px-2.5 rounded-xl border-white/10 text-slate-300 disabled:opacity-30"
                                    title="Önceki Ders"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
                                </Button>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-xl font-black text-white">
                                            {currentUnit.title}
                                        </h2>
                                        <Badge className={cn("text-[10px] font-bold px-2 py-0.5", currentUnit.type === 'dua' ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30")}>
                                            {currentUnit.itemCount} Öğe
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-2xl">
                                        {currentUnit.description}
                                    </p>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNextUnit}
                                    disabled={currentUnitIndex >= (activeTab === 'dua' ? NAMAZ_DUALARI.length - 1 : CUZ_LESSONS.length - 1)}
                                    className="h-8 px-2.5 rounded-xl border-white/10 text-slate-300 disabled:opacity-30"
                                    title="Sonraki Ders"
                                >
                                    Sonraki <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>

                            {/* Sağ: Çalma Kontrolleri & Araçlar */}
                            <div className="flex items-center gap-2">
                                
                                {/* Sırayla Tümünü Oynat */}
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
                                            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Sırayla Çal (Tümü)
                                        </>
                                    )}
                                </Button>

                                {/* Kart Tema Seçici (Koyu / Aydınlık) */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCardTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                                    className={cn(
                                        "h-9 px-3 rounded-xl border text-xs font-bold transition-all",
                                        cardTheme === 'dark'
                                            ? "bg-slate-800 text-cyan-300 border-white/10"
                                            : "bg-white text-slate-900 border-slate-300"
                                    )}
                                    title="Kart Arka Plan Rengini Değiştir [T]"
                                >
                                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                                    {cardTheme === 'dark' ? 'Koyu Kart' : 'Açık Kart'}
                                </Button>

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

                        {/* HARF / KELİME KARTLARI IZGARASI (TAM EKRANDA DEV VE KENARLARA YASLI) */}
                        <div className={cn(
                            "grid gap-3 sm:gap-4 overflow-y-auto custom-scrollbar flex-1 w-full p-1",
                            currentUnit.type === 'dua'
                                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
                        )}>
                            {currentUnit.items.map((item, idx) => {
                                const isSelected = selectedItemIndex === idx;
                                const isCurrentAudio = currentlyPlayingAudio === item.audio;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => playAudio(item.audio, idx)}
                                        className={cn(
                                            "border-2 transition-all flex flex-col items-center justify-between relative select-none hover:scale-[1.03] active:scale-95 shadow-xl group cursor-pointer backdrop-blur-xl",
                                            isFullscreen
                                                ? "p-4 sm:p-6 rounded-3xl min-h-[170px] sm:min-h-[210px] md:min-h-[240px]"
                                                : "p-3 sm:p-4 rounded-2xl min-h-[130px] sm:min-h-[160px]",
                                            isCurrentAudio
                                                ? "bg-gradient-to-br from-cyan-950 via-teal-900/60 to-slate-950 border-cyan-400 ring-4 ring-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.4)] scale-105 z-10"
                                                : isSelected
                                                ? "bg-slate-800/90 border-indigo-400/60 ring-2 ring-indigo-400/30"
                                                : cardTheme === 'dark'
                                                ? "bg-slate-900/90 border-white/10 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-850"
                                                : "bg-white border-slate-200 text-slate-800 hover:border-cyan-500/50 shadow-md"
                                        )}
                                    >
                                        {/* Kart Üst Başlığı: Sıra ve Çalma İndikatörü */}
                                        <div className="w-full flex items-center justify-between text-[11px] opacity-75">
                                            <span className="font-mono font-bold">#{item.index}</span>
                                            {isCurrentAudio && (
                                                <span className="font-black text-cyan-300 flex items-center gap-1 animate-pulse">
                                                    <Volume2 className="w-3.5 h-3.5" /> Dinleniyor
                                                </span>
                                            )}
                                        </div>

                                        {/* Görsel Alanı */}
                                        <div className={cn(
                                            "w-full flex items-center justify-center p-1 my-auto min-h-0",
                                            isFullscreen ? "h-24 sm:h-32 md:h-40" : "h-16 sm:h-22"
                                        )}>
                                            <img
                                                src={item.img}
                                                alt={item.alt}
                                                className="max-h-full max-w-full object-contain pointer-events-none transition-transform group-hover:scale-110"
                                                style={{
                                                    filter: cardTheme === 'dark'
                                                        ? 'invert(1) hue-rotate(180deg) brightness(1.25) contrast(1.15) drop-shadow(0 0 12px rgba(255,255,255,0.35))'
                                                        : 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))'
                                                }}
                                            />
                                        </div>

                                        {/* Kart Alt Çubuğu: Ses Çalma Rozeti */}
                                        <div className="w-full flex items-center justify-between pt-1.5 border-t border-white/5 text-[10px]">
                                            <span className="text-slate-400 truncate max-w-[120px] font-medium">
                                                {item.alt || `Öğe ${item.index}`}
                                            </span>
                                            <span className={cn(
                                                "p-1 rounded-lg transition-colors",
                                                isCurrentAudio ? "bg-cyan-500 text-black font-bold" : "bg-white/5 text-slate-400 group-hover:text-white"
                                            )}>
                                                <Volume2 className="w-3 h-3" />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ALT KLAVYE VE KULLANIM REHBERİ */}
                        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-2 shrink-0">
                            <div className="flex items-center gap-3">
                                <span>[Boşluk]: Sesi Tekrar Dinle</span>
                                <span>•</span>
                                <span>[←/→]: Önceki/Sonraki Harf</span>
                                <span>•</span>
                                <span>[T]: Tema Değiştir</span>
                                <span>•</span>
                                <span>[F]: Tam Ekran (Akıllı Tahta)</span>
                            </div>

                            <div className="text-slate-500 text-[11px]">
                                Toplam {currentUnit.itemCount} içerik • İstediğiniz harfin/cümlenin üzerine tıklayın
                            </div>
                        </div>

                    </div>

                    {/* DERS AÇIKLAMA VE KAİDELER KARTLARI (VARSA) */}
                    {currentUnit.notes && currentUnit.notes.length > 0 && (
                        <div className="bg-slate-900/60 p-5 rounded-3xl border border-white/10 shadow-lg space-y-3">
                            <div className="flex items-center gap-2 text-sm font-black text-cyan-300 border-b border-white/10 pb-2">
                                <Info className="w-4 h-4 text-cyan-400" />
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
