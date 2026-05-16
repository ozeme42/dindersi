'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Maximize, Minimize, Sparkles, PartyPopper, Eye, KeyRound, 
    RotateCcw, ZoomIn, ZoomOut, Hash, Smile, Type
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

// --- İÇERİKLER ---
const PHRASES = [
    { text: "TEMİZLİK İMANIN YARISIDIR", category: "Hadis-i Şerif" },
    { text: "KOLAYLAŞTIRIN ZORLAŞTIRMAYIN", category: "Hadis-i Şerif" },
    { text: "İSLAM GÜZEL AHLAKTIR", category: "Hadis-i Şerif" },
    { text: "CENNET ANNELERİN AYAKLARI ALTINDADIR", category: "Hadis-i Şerif" },
    { text: "BİLMEYENLER BİLENLERE SORSUN", category: "Ayet-i Kerime" },
    { text: "SABIR İMANIN YARISIDIR", category: "Özlü Söz" },
    { text: "HAYASIZLIKTAN VE KÖTÜLÜKTEN ALIKOYAR", category: "Ayet-i Kerime" }
];

const TURKISH_ALPHABET = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split('');

const CIPHER_SETS = {
    antik: ['α','β','γ','δ','ε','ζ','η','θ','λ','μ','π','ρ','σ','τ','φ','ω','∆','Ω','∞','§','¶','¥','£','★','♠','♣','♥','♦','☀'],
    sayilar: Array.from({length: 80}, (_, i) => (i + 10).toString()), // 10-89 arası sayılar
    emojiler: ['😀','🚀','🐱','🍕','🎸','⚽','🚗','⭐','🍎','🎈','🌈','🌞','🌙','🔥','💧','⚡','❄','👑','💎','🔔','💡','📚','🎨','🎭','🧩','🎲','🎯','🏆','🥇']
};

type CipherType = 'antik' | 'sayilar' | 'emojiler';
type CipherMap = Record<string, string>;

export function CryptoGame() {
    const [currentPhrase, setCurrentPhrase] = useState(PHRASES[0]);
    const [cipherType, setCipherType] = useState<CipherType>('antik');
    const [cipherMap, setCipherMap] = useState<CipherMap>({});
    
    const [isRevealed, setIsRevealed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0); 

    const containerRef = useRef<HTMLDivElement>(null);

    // Tam Ekran Kontrolü
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch((err) => {
                console.error("Tam ekran hatası:", err);
            });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const initGame = useCallback(() => {
        const randomPhrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
        setCurrentPhrase(randomPhrase);

        const symbolsToUse = [...CIPHER_SETS[cipherType]].sort(() => Math.random() - 0.5);
        const newCipherMap: CipherMap = {};
        
        TURKISH_ALPHABET.forEach((letter, index) => {
            newCipherMap[letter] = symbolsToUse[index];
        });

        setCipherMap(newCipherMap);
        setIsRevealed(false);
        setZoomLevel(1.0);
    }, [cipherType]);

    useEffect(() => {
        initGame();
    }, [initGame]);

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2.5)); 
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5)); 
    const handleZoomReset = () => setZoomLevel(1.0);

    const handleZoomWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            if (e.deltaY < 0) handleZoomIn();
            else handleZoomOut();
        }
    };

    const handleReveal = () => {
        setIsRevealed(true);
        playSound('win');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    };

    const words = currentPhrase.text.split(' ');

    if (Object.keys(cipherMap).length === 0) return null;

    return (
        <div 
            ref={containerRef} 
            className={cn(
                "animate-in fade-in duration-700 transition-all font-sans bg-slate-50",
                isFullscreen ? "fixed inset-0 z-[99999] p-4 md:p-8 flex items-center justify-center" : "w-full mx-auto h-[85vh] min-h-[600px]"
            )}
        >
            <Card className={cn(
                "bg-slate-50 border border-slate-200 shadow-2xl rounded-[2rem] overflow-hidden flex flex-col relative w-full h-full"
            )}>
                
                <CardHeader className="bg-indigo-900 p-3 md:p-5 text-white relative flex-shrink-0 z-20 border-b border-indigo-700">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <KeyRound className="h-5 w-5 text-indigo-300" />
                            </div>
                            <div className="hidden md:block">
                                <CardTitle className="text-xl font-black uppercase tracking-tight text-white">Akıllı Şifre</CardTitle>
                                <CardDescription className="text-indigo-200 text-xs">Sembolleri harflerle eşleştir.</CardDescription>
                            </div>
                        </div>

                        <div className="flex items-center bg-indigo-950/50 p-1 rounded-xl border border-indigo-800/50">
                            {[
                                { id: 'antik', label: 'Antik', icon: Type },
                                { id: 'sayilar', label: 'Sayılar', icon: Hash },
                                { id: 'emojiler', label: 'Emoji', icon: Smile }
                            ].map((type) => {
                                const Icon = type.icon;
                                const isActive = cipherType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => { setCipherType(type.id as CipherType); }}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                            isActive ? "bg-indigo-500 text-white shadow-sm" : "text-indigo-300 hover:text-white hover:bg-indigo-800/50"
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline uppercase tracking-wider">{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-indigo-950/50 rounded-xl border border-indigo-800/50 overflow-hidden">
                                <button onClick={handleZoomOut} className="p-2 text-indigo-300 hover:text-white hover:bg-indigo-500/30 transition-colors" title="Harfleri Küçült"><ZoomOut className="w-4 h-4" /></button>
                                <button onClick={handleZoomReset} className="px-2 text-xs font-black text-indigo-200 hover:text-white w-12 text-center" title="Sıfırla">%{(zoomLevel * 100).toFixed(0)}</button>
                                <button onClick={handleZoomIn} className="p-2 text-indigo-300 hover:text-white hover:bg-indigo-500/30 transition-colors" title="Harfleri Büyüt"><ZoomIn className="w-4 h-4" /></button>
                            </div>

                            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl">
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent 
                    className="flex-1 flex flex-col bg-slate-900 min-h-0 relative overflow-y-auto overflow-x-hidden p-4 md:p-6" 
                    onWheel={handleZoomWheel}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/80 to-slate-950 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col w-full h-full">
                        
                        {/* 1. ŞİFRE ANAHTARI PANELİ (Boyutları Büyütüldü) */}
                        <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl flex-shrink-0 mb-6 p-4">
                            <div className="flex flex-wrap justify-center" style={{ gap: `${0.6 * zoomLevel}rem` }}>
                                {TURKISH_ALPHABET.map((letter) => (
                                    <div 
                                        key={letter} 
                                        className="flex flex-col items-center justify-center bg-slate-100 rounded-xl shadow-sm border border-slate-200"
                                        style={{ padding: `${0.5 * zoomLevel}rem ${0.8 * zoomLevel}rem` }}
                                    >
                                        <span 
                                            className="font-black text-slate-800 border-b-2 border-slate-300 w-full text-center leading-tight mb-1.5"
                                            style={{ fontSize: `${1.2 * zoomLevel}rem` }}
                                        >
                                            {letter}
                                        </span>
                                        <span 
                                            className={cn("font-black leading-tight", cipherType === 'sayilar' ? "text-indigo-600" : cipherType === 'emojiler' ? "" : "text-rose-600")}
                                            style={{ fontSize: cipherType === 'sayilar' ? `${1.4 * zoomLevel}rem` : `${1.8 * zoomLevel}rem` }}
                                        >
                                            {cipherMap[letter]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. GİZLİ METİN ALANI (Ayet/Hadis - Boyutları Hafifçe Küçültüldü) */}
                        <div className="flex-1 flex items-center justify-center w-full mt-2 pb-12">
                            <div className="flex flex-wrap justify-center" style={{ gap: `${1.5 * zoomLevel}rem` }}>
                                {words.map((word, wordIdx) => (
                                    <div key={wordIdx} className="flex" style={{ gap: `${0.4 * zoomLevel}rem` }}>
                                        {word.split('').map((char, charIdx) => {
                                            const isLetter = TURKISH_ALPHABET.includes(char);
                                            const symbol = isLetter ? cipherMap[char] : char;

                                            if (!isLetter) {
                                                return (
                                                    <div 
                                                        key={charIdx} 
                                                        className="font-black text-slate-500 flex items-end justify-center"
                                                        style={{ width: `${1.0 * zoomLevel}rem`, fontSize: `${2.0 * zoomLevel}rem`, paddingBottom: `${0.5 * zoomLevel}rem` }}
                                                    >
                                                        {char}
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={charIdx}
                                                    className={cn(
                                                        "rounded-xl flex items-center justify-center transition-all duration-[800ms] relative shadow-lg",
                                                        isRevealed ? "bg-emerald-500 border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-slate-800 border-b-4 border-slate-700"
                                                    )}
                                                    style={{ 
                                                        width: `${3.0 * zoomLevel}rem`, 
                                                        height: `${4.0 * zoomLevel}rem`,
                                                        transformStyle: 'preserve-3d', 
                                                        perspective: '1000px' 
                                                    }}
                                                >
                                                    <div className={cn(
                                                        "absolute inset-0 flex items-center justify-center font-black transition-all duration-[800ms] backface-hidden",
                                                        cipherType === 'antik' ? "text-rose-400" : cipherType === 'sayilar' ? "text-indigo-300" : "text-white",
                                                        isRevealed ? "opacity-0 [transform:rotateY(180deg)]" : "opacity-100 [transform:rotateY(0deg)]"
                                                    )}
                                                    style={{ fontSize: cipherType === 'sayilar' ? `${1.3 * zoomLevel}rem` : `${1.8 * zoomLevel}rem` }}>
                                                        {symbol}
                                                    </div>

                                                    <div className={cn(
                                                        "absolute inset-0 flex items-center justify-center font-black transition-all duration-[800ms] backface-hidden",
                                                        isRevealed ? "opacity-100 [transform:rotateY(0deg)]" : "opacity-0 [transform:rotateY(-180deg)]"
                                                    )}
                                                    style={{ fontSize: `${2.0 * zoomLevel}rem` }}>
                                                        <span className="text-white drop-shadow-md">{char}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </CardContent>

                <CardFooter className="bg-white p-3 md:p-4 flex justify-between items-center border-t border-slate-200 flex-shrink-0 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                    <Button 
                        onClick={initGame}
                        variant="outline"
                        className="h-12 px-6 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl border-slate-200 transition-colors"
                    >
                        <RotateCcw className="w-5 h-5 md:mr-2" /> <span className="hidden md:inline">Yeni Şifre</span>
                    </Button>
                    
                    <div className="flex-1 flex justify-center px-4">
                        {!isRevealed ? (
                            <Button 
                                onClick={handleReveal}
                                className="h-14 px-8 md:px-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base md:text-xl uppercase tracking-widest rounded-full shadow-[0_5px_20px_rgba(16,185,129,0.4)] hover:scale-105 transition-all"
                            >
                                <Eye className="w-5 h-5 mr-2" /> CEVABI GÖSTER
                            </Button>
                        ) : (
                            <div className="h-14 px-8 md:px-16 bg-emerald-100 text-emerald-800 font-black text-base md:text-xl uppercase tracking-widest rounded-full flex items-center shadow-inner">
                                <PartyPopper className="w-5 h-5 mr-2 text-emerald-600" /> ŞİFRE ÇÖZÜLDÜ
                            </div>
                        )}
                    </div>

                    <Badge variant="outline" className="hidden sm:flex text-[10px] uppercase font-bold text-slate-400 bg-slate-50 h-8 items-center border-slate-200">
                        {currentPhrase.category}
                    </Badge>
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