'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Maximize, Minimize, ChevronLeft, ChevronRight, Eye, PartyPopper, Sparkles, Lightbulb } from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

const PUZZLES = [
    {
        id: 1,
        items: [
            { type: 'emoji', value: '🧠', hint: 'Zeka' },
            { type: 'text', value: 'T', hint: 'Harfi' }
        ],
        answer: 'ZEKAT',
        explanation: 'Zeka + T = Zekat'
    },
    {
        id: 2,
        items: [
            { type: 'emoji', value: '🌙', hint: 'Ay' },
            { type: 'emoji', value: '🥩', hint: 'Et' }
        ],
        answer: 'AYET',
        explanation: 'Ay + Et = Ayet'
    },
    {
        id: 3,
        items: [
            { type: 'emoji', value: '🪟', hint: 'Cam' },
            { type: 'text', value: 'İ', hint: 'Harfi' }
        ],
        answer: 'CAMİ',
        explanation: 'Cam + İ = Cami'
    },
    {
        id: 4,
        items: [
            { type: 'emoji', value: '💧', hint: 'Su' },
            { type: 'emoji', value: '🎵', hint: 'Re Notası' }
        ],
        answer: 'SURE',
        explanation: 'Su + Re = Sure'
    },
    {
        id: 5,
        items: [
            { type: 'text', value: 'SA', hint: 'Hecesi' },
            { type: 'emoji', value: '1️⃣', hint: 'Bir' }
        ],
        answer: 'SABIR',
        explanation: 'Sa + Bir = Sabır'
    },
    {
        id: 6,
        items: [
            { type: 'emoji', value: '🕯️', hint: 'Mum' },
            { type: 'text', value: 'İN', hint: 'Hecesi' }
        ],
        answer: 'MÜMİN',
        explanation: 'Mum + İn = Mümin'
    },
    {
        id: 7,
        items: [
            { type: 'text', value: 'T', hint: 'Harfi' },
            { type: 'emoji', value: '🏠', hint: 'Ev' },
            { type: 'text', value: 'BE', hint: 'Hecesi' }
        ],
        answer: 'TÖVBE',
        explanation: 'T + Ev + Be = Tövbe'
    },
    {
        id: 8,
        items: [
            { type: 'text', value: 'H', hint: 'Harfi' },
            { type: 'emoji', value: '🔓', hint: 'Açık Kilit (Aç)' }
        ],
        answer: 'HAC',
        explanation: 'H + Aç = Hac'
    },
    {
        id: 9,
        items: [
            { type: 'emoji', value: '☀️', hint: 'Gün' },
            { type: 'text', value: 'AH', hint: 'Hecesi' }
        ],
        answer: 'GÜNAH',
        explanation: 'Gün + Ah = Günah'
    },
    {
        id: 10,
        items: [
            { type: 'text', value: 'M', hint: 'Harfi' },
            { type: 'emoji', value: '🧺', hint: 'Elek' }
        ],
        answer: 'MELEK',
        explanation: 'M + Elek = Melek'
    },
    {
        id: 11,
        items: [
            { type: 'text', value: 'K', hint: 'Harfi' },
            { type: 'emoji', value: '🏠', hint: 'Ev' },
            { type: 'text', value: 'SER', hint: 'Hecesi' }
        ],
        answer: 'KEVSER',
        explanation: 'K + Ev + Ser = Kevser'
    },
    {
        id: 12,
        items: [
            { type: 'emoji', value: '🎀', hint: 'Kurdele (Kur)' },
            { type: 'emoji', value: '⌚', hint: 'Saat (An)' }
        ],
        answer: 'KURAN',
        explanation: 'Kur + An = Kuran'
    },
    {
        id: 13,
        items: [
            { type: 'text', value: 'HA', hint: 'Hecesi' },
            { type: 'emoji', value: '🦷', hint: 'Diş' }
        ],
        answer: 'HADİS',
        explanation: 'Ha + Diş = Hadis'
    },
    {
        id: 14,
        items: [
            { type: 'text', value: 'BER', hint: 'Hecesi' },
            { type: 'emoji', value: '🐎', hint: 'At' }
        ],
        answer: 'BERAT',
        explanation: 'Ber + At = Berat'
    },
    {
        id: 15,
        items: [
            { type: 'emoji', value: '🤫', hint: 'Sır' },
            { type: 'emoji', value: '🐎', hint: 'At' }
        ],
        answer: 'SIRAT',
        explanation: 'Sır + At = Sırat'
    },
    {
        id: 16,
        items: [
            { type: 'text', value: 'ŞEY', hint: 'Kelimesi' },
            { type: 'emoji', value: '🌅', hint: 'Tan Vakti (Tan)' }
        ],
        answer: 'ŞEYTAN',
        explanation: 'Şey + Tan = Şeytan'
    },
    {
        id: 17,
        items: [
            { type: 'emoji', value: '🗺️', hint: 'İl Haritası (İl)' },
            { type: 'text', value: 'AHİ', hint: 'Hecesi' }
        ],
        answer: 'İLAHİ',
        explanation: 'İl + Ahi = İlahi'
    },
    {
        id: 18,
        items: [
            { type: 'text', value: 'SA', hint: 'Hecesi' },
            { type: 'emoji', value: '🗻', hint: 'Dağ (Da)' },
            { type: 'text', value: 'KA', hint: 'Hecesi' }
        ],
        answer: 'SADAKA',
        explanation: 'Sa + Da + Ka = Sadaka'
    },
    {
        id: 19,
        items: [
            { type: 'text', value: 'RAHM', hint: 'Hecesi' },
            { type: 'emoji', value: '🥩', hint: 'Et' }
        ],
        answer: 'RAHMET',
        explanation: 'Rahm + Et = Rahmet'
    },
    {
        id: 20,
        items: [
            { type: 'text', value: 'S', hint: 'Harfi' },
            { type: 'emoji', value: '👑', hint: 'Kraliçe (Ece)' },
            { type: 'text', value: 'DE', hint: 'Hecesi' }
        ],
        answer: 'SECDE',
        explanation: 'S + Ece + De = Secde'
    },
    {
        id: 21,
        items: [
            { type: 'text', value: 'NE', hint: 'Hecesi' },
            { type: 'emoji', value: '1️⃣', hint: 'Bir (Bi)' }
        ],
        answer: 'NEBİ',
        explanation: 'Ne + Bi = Nebi'
    },
    {
        id: 22,
        items: [
            { type: 'text', value: 'MİR', hint: 'Hecesi' },
            { type: 'emoji', value: '🔓', hint: 'Açık Kilit (Aç)' }
        ],
        answer: 'MİRAÇ',
        explanation: 'Mir + Aç = Miraç'
    },
    {
        id: 23,
        items: [
            { type: 'text', value: 'İH', hint: 'Hecesi' },
            { type: 'emoji', value: '🛞', hint: 'Araba Lastiği (Las)' }
        ],
        answer: 'İHLAS',
        explanation: 'İh + Las = İhlas'
    },
    {
        id: 24,
        items: [
            { type: 'emoji', value: '👨‍🍳', hint: 'Aşçı (Şef)' },
            { type: 'text', value: 'A', hint: 'Harfi' },
            { type: 'emoji', value: '🐎', hint: 'At' }
        ],
        answer: 'ŞEFAAT',
        explanation: 'Şef + A + At = Şefaat'
    },
    {
        id: 25,
        items: [
            { type: 'text', value: 'Z', hint: 'Harfi' },
            { type: 'emoji', value: '💡', hint: 'Fikir (İkir)' }
        ],
        answer: 'ZİKİR',
        explanation: 'Z + İkir = Zikir'
    },
    {
        id: 26,
        items: [
            { type: 'emoji', value: '❤️', hint: 'Sevgi (Sev)' },
            { type: 'text', value: 'AP', hint: 'Hecesi' }
        ],
        answer: 'SEVAP',
        explanation: 'Sev + Ap = Sevap'
    },
    {
        id: 27,
        items: [
            { type: 'text', value: 'KIYAM', hint: 'Kelimesi' },
            { type: 'emoji', value: '🥩', hint: 'Et' }
        ],
        answer: 'KIYAMET',
        explanation: 'Kıyam + Et = Kıyamet'
    },
    {
        id: 28,
        items: [
            { type: 'text', value: 'CEM', hint: 'Hecesi' },
            { type: 'text', value: 'A', hint: 'Harfi' },
            { type: 'emoji', value: '🐎', hint: 'At' }
        ],
        answer: 'CEMAAT',
        explanation: 'Cem + A + At = Cemaat'
    },
    {
        id: 29,
        items: [
            { type: 'text', value: 'SOHB', hint: 'Hecesi' },
            { type: 'emoji', value: '🥩', hint: 'Et' }
        ],
        answer: 'SOHBET',
        explanation: 'Sohb + Et = Sohbet'
    },
    {
        id: 30,
        items: [
            { type: 'text', value: 'HEL', hint: 'Hecesi' },
            { type: 'text', value: 'AL', hint: 'Al (Kırmızı)' }
        ],
        answer: 'HELAL',
        explanation: 'Hel + Al = Helal'
    },
    {
        id: 31,
        items: [
            { type: 'emoji', value: '🍳', hint: 'Tava' },
            { type: 'text', value: 'F', hint: 'Harfi' }
        ],
        answer: 'TAVAF',
        explanation: 'Tava + F = Tavaf'
    },
    {
        id: 32,
        items: [
            { type: 'emoji', value: '🎵', hint: 'Mi Notası' },
            { type: 'text', value: 'NA', hint: 'Hecesi' },
            { type: 'emoji', value: '🎵', hint: 'Re Notası' }
        ],
        answer: 'MİNARE',
        explanation: 'Mi + Na + Re = Minare'
    },
    {
        id: 33,
        items: [
            { type: 'text', value: 'Z', hint: 'Harfi' },
            { type: 'emoji', value: '🍼', hint: 'Bebek Emziği (Em)' },
            { type: 'text', value: 'Z', hint: 'Harfi' },
            { type: 'emoji', value: '🍼', hint: 'Bebek Emziği (Em)' }
        ],
        answer: 'ZEMZEM',
        explanation: 'Z + Em + Z + Em = Zemzem'
    },
    {
        id: 34,
        items: [
            { type: 'text', value: 'İF', hint: 'Hecesi' },
            { type: 'emoji', value: '🪮', hint: 'Tarak (Tar)' }
        ],
        answer: 'İFTAR',
        explanation: 'İf + Tar = İftar'
    },
    {
        id: 35,
        items: [
            { type: 'text', value: 'SÜN', hint: 'Hecesi' },
            { type: 'emoji', value: '🌐', hint: 'İnternet / Ağ (Net)' }
        ],
        answer: 'SÜNNET',
        explanation: 'Sün + Net = Sünnet'
    },
    {
        id: 36,
        items: [
            { type: 'text', value: 'F', hint: 'Harfi' },
            { type: 'emoji', value: '🥩', hint: 'Et' },
            { type: 'text', value: 'VA', hint: 'Hecesi' }
        ],
        answer: 'FETVA',
        explanation: 'F + Et + Va = Fetva'
    },
    {
        id: 37,
        items: [
            { type: 'text', value: 'C', hint: 'Harfi' },
            { type: 'emoji', value: '🍇', hint: 'Üzüm (Üz)' }
        ],
        answer: 'CÜZ',
        explanation: 'C + Üz = Cüz'
    },
    {
        id: 38,
        items: [
            { type: 'text', value: 'İH', hint: 'Hecesi' },
            { type: 'emoji', value: '👤', hint: 'İnsan (San)' }
        ],
        answer: 'İHSAN',
        explanation: 'İh + San = İhsan'
    },
    {
        id: 39,
        items: [
            { type: 'emoji', value: '🪖', hint: 'Cenk/Savaş (Cen)' },
            { type: 'emoji', value: '🌐', hint: 'Ağ/İnternet (Net)' }
        ],
        answer: 'CENNET',
        explanation: 'Cen + Net = Cennet'
    },
    {
        id: 40,
        items: [
            { type: 'text', value: 'İBA', hint: 'Hecesi' },
            { type: 'emoji', value: '🥩', hint: 'Et' }
        ],
        answer: 'İBADET',
        explanation: 'İba + Et = İbadet'
    }
];

export const RESFEBE_EPISODES = [
    {
        id: 1,
        title: "1. Bölüm",
        name: "Başlangıç Seviyesi",
        badge: "Kolay",
        badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        puzzles: PUZZLES.slice(0, 10)
    },
    {
        id: 2,
        title: "2. Bölüm",
        name: "Keşif Seviyesi",
        badge: "Orta",
        badgeBg: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
        puzzles: PUZZLES.slice(10, 20)
    },
    {
        id: 3,
        title: "3. Bölüm",
        name: "Zihin Avcısı",
        badge: "İleri",
        badgeBg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
        puzzles: PUZZLES.slice(20, 30)
    },
    {
        id: 4,
        title: "4. Bölüm",
        name: "Usta Seviye",
        badge: "Zor",
        badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        puzzles: PUZZLES.slice(30, 40)
    }
];

export function ResfebeGame() {
    const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const [showHints, setShowHints] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const currentEpisode = RESFEBE_EPISODES[selectedEpisodeIdx];
    const episodePuzzles = currentEpisode.puzzles;
    const currentPuzzle = episodePuzzles[currentIndex] || episodePuzzles[0];

    // Tam Ekran Kontrolü
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.error(err));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleNext = () => {
        setIsRevealed(false);
        setShowHints(false);
        if (currentIndex < episodePuzzles.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Bölüm tamamlandı, bir sonraki bölüme geç veya başa dön
            if (selectedEpisodeIdx < RESFEBE_EPISODES.length - 1) {
                setSelectedEpisodeIdx(prev => prev + 1);
                setCurrentIndex(0);
            } else {
                setCurrentIndex(0);
            }
        }
    };

    const handlePrev = () => {
        setIsRevealed(false);
        setShowHints(false);
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            if (selectedEpisodeIdx > 0) {
                setSelectedEpisodeIdx(prev => prev - 1);
                setCurrentIndex(RESFEBE_EPISODES[selectedEpisodeIdx - 1].puzzles.length - 1);
            } else {
                setCurrentIndex(episodePuzzles.length - 1);
            }
        }
    };

    const handleSelectEpisode = (epIdx: number) => {
        setSelectedEpisodeIdx(epIdx);
        setCurrentIndex(0);
        setIsRevealed(false);
        setShowHints(false);
    };

    const handleReveal = () => {
        setIsRevealed(true);
        playSound('win');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    };

    const toggleHints = () => {
        setShowHints(!showHints);
    };

    return (
        <div 
            ref={containerRef} 
            className={cn(
                "animate-in fade-in duration-700 transition-all font-sans bg-slate-50",
                isFullscreen ? "fixed inset-0 z-[99999] p-4 md:p-8 flex items-center justify-center bg-slate-900" : "w-full mx-auto"
            )}
        >
            <Card className={cn(
                "border border-slate-200 shadow-2xl rounded-[2rem] overflow-hidden flex flex-col relative w-full max-w-5xl mx-auto transition-colors duration-500",
                isFullscreen ? "h-full bg-slate-800 border-slate-700" : "min-h-[720px] bg-white"
            )}>
                
                {/* HEADER */}
                <CardHeader className={cn(
                    "p-4 md:p-6 relative flex-shrink-0 z-20 border-b transition-colors duration-500",
                    isFullscreen ? "bg-slate-900/80 border-slate-700 text-white" : "bg-slate-100 border-slate-200"
                )}>
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                                isFullscreen ? "bg-amber-900/50 text-amber-400" : "bg-amber-100 text-amber-600"
                            )}>
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className={cn("text-2xl font-black uppercase tracking-tight transition-colors", isFullscreen ? "text-white" : "text-slate-800")}>
                                        İslami Resfebe
                                    </CardTitle>
                                    <Badge className={cn("font-black text-xs px-2.5 py-0.5 border-none", currentEpisode.badgeBg)}>
                                        {currentEpisode.title} • {currentEpisode.badge}
                                    </Badge>
                                </div>
                                <CardDescription className={cn(isFullscreen ? "text-slate-400" : "text-slate-500")}>
                                    Görselleri birleştir, gizli kelimeyi bul.
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                onClick={toggleHints}
                                className={cn("h-10 rounded-xl transition-colors hidden md:flex", isFullscreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600")}
                            >
                                <Lightbulb className={cn("w-4 h-4 mr-2", showHints ? "text-amber-500 fill-amber-500" : "")} /> 
                                {showHints ? "İpuçlarını Gizle" : "İpucu Göster"}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className={cn("rounded-xl transition-colors", isFullscreen ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100")}>
                                {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                            </Button>
                        </div>
                    </div>

                    {/* BÖLÜM SEÇİCİ SEKMELER */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                        {RESFEBE_EPISODES.map((ep, idx) => (
                            <button
                                key={ep.id}
                                onClick={() => handleSelectEpisode(idx)}
                                className={cn(
                                    "px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-between border transition-all",
                                    selectedEpisodeIdx === idx
                                        ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 scale-[1.02]"
                                        : (isFullscreen ? "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")
                                )}
                            >
                                <span>{ep.title}</span>
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-md",
                                    selectedEpisodeIdx === idx ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                                )}>
                                    {ep.badge}
                                </span>
                            </button>
                        ))}
                    </div>
                </CardHeader>

                {/* CONTENT */}
                <CardContent className={cn(
                    "flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden",
                    isFullscreen ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-900" : "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-50 to-slate-200"
                )}>
                    
                    <div className="flex flex-col items-center justify-center w-full max-w-4xl space-y-8 my-auto z-10">
                        
                        {/* RESFEBE İÇERİĞİ (Görseller ve Kutular) */}
                        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
                            {currentPuzzle.items.map((item, index) => (
                                <div key={index} className="flex flex-col items-center space-y-2">
                                    <div className={cn(
                                        "w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-3xl border-2 flex items-center justify-center shadow-xl transition-all duration-300 relative group",
                                        isFullscreen ? "bg-slate-800/90 border-slate-600 hover:border-amber-400" : "bg-white border-slate-200 hover:border-amber-400"
                                    )}>
                                        {item.type === 'emoji' ? (
                                            <span className="text-5xl sm:text-6xl md:text-7xl select-none filter drop-shadow-md group-hover:scale-110 transition-transform">
                                                {item.value}
                                            </span>
                                        ) : (
                                            <span className={cn(
                                                "font-black select-none tracking-wider group-hover:scale-110 transition-transform",
                                                item.value.length > 2 ? "text-3xl sm:text-4xl md:text-5xl" : "text-5xl sm:text-6xl md:text-7xl",
                                                isFullscreen ? "text-amber-400" : "text-amber-600"
                                            )}>
                                                {item.value}
                                            </span>
                                        )}
                                    </div>

                                    {/* İPUCU ETİKETİ */}
                                    {showHints && (
                                        <Badge variant="secondary" className={cn("text-xs font-bold animate-in fade-in duration-300", isFullscreen ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-700")}>
                                            {item.hint}
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* CEVAP GÖSTERİMİ */}
                        <div className="min-h-[100px] flex items-center justify-center w-full">
                            {isRevealed ? (
                                <div className="animate-in zoom-in-75 duration-500 text-center space-y-2">
                                    <div className="text-5xl md:text-7xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                        {currentPuzzle.answer}
                                    </div>
                                    <div className={cn("text-lg md:text-2xl font-bold opacity-80", isFullscreen ? "text-slate-300" : "text-slate-600")}>
                                        {currentPuzzle.explanation}
                                    </div>
                                </div>
                            ) : (
                                <Button 
                                    onClick={handleReveal}
                                    className="h-16 px-10 bg-amber-500 hover:bg-amber-600 text-white font-black text-xl uppercase tracking-widest rounded-full shadow-[0_5px_20px_rgba(245,158,11,0.4)] hover:scale-105 transition-all"
                                >
                                    <Eye className="w-6 h-6 mr-2" /> CEVABI GÖSTER
                                </Button>
                            )}
                        </div>

                    </div>

                    {/* Progress Dots */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                        {episodePuzzles.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={cn(
                                    "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                    currentIndex === idx 
                                        ? "w-8 bg-amber-500" 
                                        : (isFullscreen ? "bg-slate-700" : "bg-slate-300")
                                )}
                            />
                        ))}
                    </div>

                </CardContent>

                {/* FOOTER (Navigasyon) */}
                <CardFooter className={cn(
                    "p-4 md:p-6 border-t flex justify-between items-center flex-shrink-0 z-20",
                    isFullscreen ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                )}>
                    <Button 
                        onClick={handlePrev}
                        variant="outline"
                        className={cn("h-14 px-6 md:px-8 font-black text-lg rounded-xl transition-all", isFullscreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-600")}
                    >
                        <ChevronLeft className="w-6 h-6 md:mr-2" /> <span className="hidden md:inline">ÖNCEKİ</span>
                    </Button>
                    
                    <Badge variant="outline" className={cn("hidden sm:flex text-sm uppercase font-bold px-4 h-10 items-center border", isFullscreen ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-400")}>
                        {currentEpisode.title} • Bulmaca {currentIndex + 1} / {episodePuzzles.length}
                    </Badge>

                    <Button 
                        onClick={handleNext}
                        className="h-14 px-6 md:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-xl shadow-[0_5px_15px_rgba(79,70,229,0.3)] transition-all"
                    >
                        <span className="hidden md:inline">
                            {currentIndex === episodePuzzles.length - 1 && selectedEpisodeIdx < RESFEBE_EPISODES.length - 1 ? "SONRAKİ BÖLÜM" : "SONRAKİ"}
                        </span> 
                        <ChevronRight className="w-6 h-6 md:ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

function playSound(type: 'win') {
    if (typeof window === 'undefined') return;
    try {
        const audio = new Audio();
        if (type === 'win') { audio.src = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"; audio.volume = 0.5; }
        audio.play().catch(() => {});
    } catch (e) {
        console.warn("Ses çalınamadı:", e);
    }
}
