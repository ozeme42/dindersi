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
    }
];

export function ResfebeGame() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const [showHints, setShowHints] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const currentPuzzle = PUZZLES[currentIndex];

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
        setCurrentIndex((prev) => (prev + 1) % PUZZLES.length);
    };

    const handlePrev = () => {
        setIsRevealed(false);
        setShowHints(false);
        setCurrentIndex((prev) => (prev - 1 + PUZZLES.length) % PUZZLES.length);
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
                isFullscreen ? "h-full bg-slate-800 border-slate-700" : "h-[85vh] min-h-[600px] bg-white"
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
                                <CardTitle className={cn("text-2xl font-black uppercase tracking-tight transition-colors", isFullscreen ? "text-white" : "text-slate-800")}>
                                    İslami Resfebe
                                </CardTitle>
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
                </CardHeader>

                {/* CONTENT */}
                <CardContent className={cn(
                    "flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden",
                    isFullscreen ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-900" : "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-50 to-slate-200"
                )}>
                    
                    {/* PUZZLE DISPLAY */}
                    <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center gap-12 relative z-10">
                        
                        {/* THE RESFEBE ELEMENTS */}
                        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 min-h-[200px]">
                            {currentPuzzle.items.map((item, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && <div className={cn("text-3xl md:text-5xl font-black opacity-30", isFullscreen ? "text-slate-400" : "text-slate-400")}>+</div>}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={cn(
                                            "flex items-center justify-center rounded-3xl shadow-xl border-b-8 transition-all duration-500 transform hover:scale-105",
                                            isFullscreen ? "bg-slate-800/80 border-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm" : "bg-white border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.1)]",
                                            "w-28 h-28 md:w-48 md:h-48"
                                        )}>
                                            {item.type === 'emoji' ? (
                                                <span className="text-[4rem] md:text-[7rem] drop-shadow-md leading-none select-none">{item.value}</span>
                                            ) : (
                                                <span className={cn("text-5xl md:text-[6rem] font-black tracking-tighter select-none", isFullscreen ? "text-slate-100" : "text-slate-800")}>{item.value}</span>
                                            )}
                                        </div>
                                        
                                        {/* HINT */}
                                        <div className={cn(
                                            "h-6 transition-all duration-300",
                                            showHints ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                                        )}>
                                            <span className={cn("text-sm md:text-base font-bold uppercase tracking-widest", isFullscreen ? "text-amber-400/80" : "text-amber-600/80")}>
                                                {item.hint}
                                            </span>
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>

                        {/* REVEAL AREA */}
                        <div className="h-32 flex items-center justify-center w-full">
                            {isRevealed ? (
                                <div className="animate-in zoom-in-95 spin-in-2 duration-500 flex flex-col items-center gap-2">
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
                        {PUZZLES.map((_, idx) => (
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
                        Bulmaca {currentIndex + 1} / {PUZZLES.length}
                    </Badge>

                    <Button 
                        onClick={handleNext}
                        className="h-14 px-6 md:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-xl shadow-[0_5px_15px_rgba(79,70,229,0.3)] transition-all"
                    >
                        <span className="hidden md:inline">SONRAKİ</span> <ChevronRight className="w-6 h-6 md:ml-2" />
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
