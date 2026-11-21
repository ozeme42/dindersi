'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, MessageCircle, Volume2, X, ChevronRight, Heart } from 'lucide-react';
import { playSound } from '@/lib/audio-service';

export type MascotType = 'ali' | 'zeynep' | 'kandilcan' | 'yildizcik';

interface PresentationMascotProps {
    stepIndex: number;
    totalSteps: number;
    stepTitle?: string;
    onMascotClick?: () => void;
    className?: string;
}

const MASCOT_QUOTES = [
    "Maşallah, harika gidiyorsun! 🌟",
    "Öğrenmek en büyük maceradır! 📖",
    "Dikkatle incele, altın puanları topla! 🪙",
    "Her yeni bilgi kalbimizi aydınlatır! 💡",
    "Tebrikler şampiyon! Bir sonraki adıma hazır mısın? 🚀",
    "Tefekkür etmek zihnimizi açar! 🌿",
    "Harika bir ders oluyor, devam et! 🎉",
    "Akıllı tahtada parıldıyorsun! ✨",
];

export function PresentationMascot({
    stepIndex,
    totalSteps,
    stepTitle,
    className = '',
}: PresentationMascotProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [isBubbleVisible, setIsBubbleVisible] = useState(true);

    // Adım değiştikçe maskot tipini ve sözünü dinamik belirle
    const mascotType: MascotType = useMemo(() => {
        const types: MascotType[] = ['ali', 'zeynep', 'kandilcan', 'yildizcik'];
        return types[stepIndex % types.length];
    }, [stepIndex]);

    useEffect(() => {
        setQuoteIndex(stepIndex % MASCOT_QUOTES.length);
        setIsBubbleVisible(true);
    }, [stepIndex]);

    const handleNextQuote = () => {
        playSound('pop');
        setQuoteIndex((prev) => (prev + 1) % MASCOT_QUOTES.length);
        setIsBubbleVisible(true);
    };

    if (isMinimized) {
        return (
            <div className={`fixed bottom-20 left-4 z-40 select-none ${className}`}>
                <button
                    onClick={() => {
                        playSound('pop');
                        setIsMinimized(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 font-black text-xs shadow-2xl border-2 border-amber-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="Sevimli Rehberi Aç"
                >
                    <span className="text-lg">
                        {mascotType === 'ali' ? '🧒' : mascotType === 'zeynep' ? '👧' : mascotType === 'kandilcan' ? '🏮' : '⭐'}
                    </span>
                    <span>Rehber</span>
                </button>
            </div>
        );
    }

    return (
        <div className={`fixed bottom-20 left-4 z-40 flex items-end gap-3 select-none pointer-events-auto max-w-sm ${className}`}>
            <style jsx>{`
                @keyframes mascotFloat {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-8px) rotate(1.5deg); }
                }
                @keyframes eyeBlink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                @keyframes bubblePop {
                    0% { transform: scale(0.8); opacity: 0; }
                    60% { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .mascot-avatar {
                    animation: mascotFloat 3.5s ease-in-out infinite;
                }
                .mascot-bubble {
                    animation: bubblePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
            `}</style>

            {/* 💬 Konuşma Baloncuğu */}
            {isBubbleVisible && (
                <div
                    className="mascot-bubble relative mb-3 p-3.5 rounded-2xl border-3 shadow-2xl backdrop-blur-md max-w-[240px] cursor-pointer"
                    style={{
                        background: 'linear-gradient(135deg, #fffdf8 0%, #fef3c7 60%, #fde68a 100%)',
                        borderColor: '#f59e0b',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.8)',
                    }}
                    onClick={handleNextQuote}
                    title="Tıklayarak yeni söz dinle"
                >
                    {/* Ok / Kuyruk */}
                    <div
                        className="absolute -bottom-2.5 left-6 w-4 h-4 transform rotate-45 border-r-3 border-b-3"
                        style={{
                            background: '#fde68a',
                            borderColor: '#f59e0b',
                        }}
                    />

                    {/* Kapat Butonu */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsBubbleVisible(false);
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-900 text-amber-200 border border-amber-400 flex items-center justify-center text-[10px] hover:scale-110 active:scale-90 transition-transform"
                        title="Baloncuğu Gizle"
                    >
                        <X size={12} />
                    </button>

                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-black uppercase tracking-wider text-amber-900">
                        <Sparkles size={12} className="text-amber-600 animate-pulse" />
                        <span>
                            {mascotType === 'ali'
                                ? 'Ali Rehber'
                                : mascotType === 'zeynep'
                                ? 'Zeynep Rehber'
                                : mascotType === 'kandilcan'
                                ? 'Kandilcan'
                                : 'Yıldızcık'}
                        </span>
                    </div>

                    <p className="text-xs font-bold text-amber-950 leading-snug">
                        {MASCOT_QUOTES[quoteIndex]}
                    </p>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-amber-800/80 font-semibold">
                        <span>Adım {stepIndex + 1}/{totalSteps}</span>
                        <span className="text-amber-600 font-bold">Dokun ↻</span>
                    </div>
                </div>
            )}

            {/* 🧒/👧/🏮/⭐ Canlı Maskot Karakteri */}
            <div
                className="mascot-avatar relative flex flex-col items-center cursor-pointer group"
                onClick={handleNextQuote}
            >
                {/* Karakter Gövdesi */}
                <div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-amber-400 flex items-center justify-center shadow-2xl relative overflow-hidden transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
                    style={{
                        background:
                            mascotType === 'ali'
                                ? 'radial-gradient(circle, #60a5fa 0%, #1e40af 100%)'
                                : mascotType === 'zeynep'
                                ? 'radial-gradient(circle, #34d399 0%, #065f46 100%)'
                                : mascotType === 'kandilcan'
                                ? 'radial-gradient(circle, #fbbf24 0%, #b45309 100%)'
                                : 'radial-gradient(circle, #c084fc 0%, #581c87 100%)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.65), 0 0 20px 2px rgba(245, 158, 11, 0.45)',
                    }}
                >
                    {/* Yansıma / Işıltı */}
                    <div className="absolute top-1 left-2 w-8 h-4 bg-white/40 rounded-full -rotate-12 blur-[1px]" />

                    {/* Maskot İkonu */}
                    <span className="text-4xl md:text-5xl filter drop-shadow select-none">
                        {mascotType === 'ali'
                            ? '🧒'
                            : mascotType === 'zeynep'
                            ? '👧'
                            : mascotType === 'kandilcan'
                            ? '🏮'
                            : '⭐'}
                    </span>
                </div>

                {/* Küçültme Rozeti */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMinimized(true);
                    }}
                    className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/80 border border-white/20 text-[10px] font-bold text-amber-200 hover:bg-slate-800 transition"
                    title="Küçült"
                >
                    Gizle
                </button>
            </div>
        </div>
    );
}
