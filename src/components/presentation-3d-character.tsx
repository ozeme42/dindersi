'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Volume2 } from 'lucide-react';
import { playSound } from '@/lib/audio-service';

interface Presentation3DCharacterProps {
    stepIndex: number;
    totalSteps: number;
    stepTitle?: string;
    stepType?: string;
    className?: string;
}

const STEP_TIPS = [
    "Haydi bakalım! Bu konudaki önemli bilgileri birlikte keşfedelim! 🌟",
    "Dikkatle oku şampiyon, her yeni bilgi bir hazine değerindedir! 📜",
    "Harika gidiyorsun! Bilgileri aklında tut, puanları topla! 🪙",
    "Maşallah, akıllı tahtada yıldız gibi parlıyorsun! ✨",
    "Tefekkür etmek ve öğrenmek en güzel ibadettir! 🌿",
    "Tebrikler! Bir sonraki göreve geçmek için hazır mısın? 🚀",
];

export function Presentation3DCharacter({
    stepIndex,
    totalSteps,
    stepTitle,
    stepType,
    className = '',
}: Presentation3DCharacterProps) {
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [isBubbleOpen, setIsBubbleOpen] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        setQuoteIndex(stepIndex % STEP_TIPS.length);
        setIsBubbleOpen(true);
    }, [stepIndex]);

    const handleNextTip = () => {
        playSound('pop');
        setQuoteIndex((prev) => (prev + 1) % STEP_TIPS.length);
        setIsBubbleOpen(true);
    };

    if (isMinimized) {
        return (
            <div className={`fixed bottom-24 left-4 z-40 ${className}`}>
                <button
                    onClick={() => {
                        playSound('pop');
                        setIsMinimized(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border-3 border-amber-300 shadow-2xl text-amber-950 font-black text-xs cursor-pointer hover:scale-105 active:scale-95 transition-all"
                    style={{
                        background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 100%)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
                    }}
                    title="Sevimli Rehberi Aç"
                >
                    <span className="text-xl">🧒</span>
                    <span>Rehber Ali</span>
                </button>
            </div>
        );
    }

    return (
        <div className={`relative flex flex-col items-center select-none pointer-events-auto ${className}`}>
            <style jsx>{`
                @keyframes boyFloat {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-6px) rotate(1deg); }
                }
                @keyframes lanternGlow {
                    0%, 100% { filter: drop-shadow(0 0 16px rgba(245, 158, 11, 0.7)); }
                    50% { filter: drop-shadow(0 0 28px rgba(251, 191, 36, 0.95)); }
                }
                @keyframes bubblePulse {
                    0% { transform: scale(0.95); opacity: 0; }
                    60% { transform: scale(1.02); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .boy-character {
                    animation: boyFloat 4s ease-in-out infinite;
                }
                .lantern-glow {
                    animation: lanternGlow 2.5s ease-in-out infinite;
                }
                .speech-bubble {
                    animation: bubblePulse 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
            `}</style>

            {/* 💬 1. BÜYÜK 3D OYUN KONUŞMA BALONCUĞU */}
            {isBubbleOpen && (
                <div 
                    className="speech-bubble relative mb-2 p-3.5 md:p-4 rounded-3xl border-3 max-w-[240px] md:max-w-[270px] cursor-pointer shadow-2xl backdrop-blur-md"
                    style={{
                        background: 'linear-gradient(180deg, #ffffff 0%, #fef3c7 65%, #fde68a 100%)',
                        borderColor: '#f59e0b',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.65), inset 0 2px 4px rgba(255,255,255,0.9)',
                    }}
                    onClick={handleNextTip}
                    title="Yeni tavsiye dinlemek için tıkla"
                >
                    {/* Kapat Tuşu */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsBubbleOpen(false);
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-950 text-amber-200 border border-amber-400 flex items-center justify-center text-[10px] hover:scale-110 active:scale-90 transition-transform"
                        title="Baloncuğu Kapat"
                    >
                        <X size={12} />
                    </button>

                    {/* Balon Başlığı */}
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-black uppercase tracking-wider text-amber-900">
                        <Sparkles size={13} className="text-amber-600 animate-spin duration-1000" />
                        <span>Rehber Ali • Görev</span>
                    </div>

                    {/* Mesaj İçeriği */}
                    <p className="text-xs md:text-sm font-black text-amber-950 leading-snug">
                        {STEP_TIPS[quoteIndex]}
                    </p>

                    {/* Alt Bilgi */}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-amber-800/80 font-bold border-t border-amber-300/60 pt-1">
                        <span>Adım {stepIndex + 1}/{totalSteps}</span>
                        <span className="text-amber-700 font-black">Dokun ↻</span>
                    </div>

                    {/* Konuşma Oku (Aşağı Karakterin Ağzına Doğru) */}
                    <div 
                        className="absolute -bottom-3 left-10 w-4 h-4 transform rotate-45 border-r-3 border-b-3"
                        style={{
                            background: '#fde68a',
                            borderColor: '#f59e0b',
                        }}
                    />
                </div>
            )}

            {/* 🧒 2. CANLI 3D ÇOCUK KARAKTER (ALİ) & ALTIN FENER */}
            <div className="flex items-end gap-2">
                
                {/* 3D Çocuk Karakter (Ali) SVG */}
                <div 
                    className="boy-character relative w-28 md:w-36 lg:w-40 h-40 md:h-52 cursor-pointer group"
                    onClick={handleNextTip}
                    title="Ali'ye tıkla"
                >
                    <svg viewBox="0 0 160 220" className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]">
                        <defs>
                            {/* Ten Rengi Gradyanı */}
                            <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ffedd5" />
                                <stop offset="100%" stopColor="#fed7aa" />
                            </linearGradient>
                            {/* Takke Beyaz / Gümüş Gradyanı */}
                            <linearGradient id="takkeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ffffff" />
                                <stop offset="60%" stopColor="#f1f5f9" />
                                <stop offset="100%" stopColor="#cbd5e1" />
                            </linearGradient>
                            {/* Entari Beyaz / Gölgeli Kumaş */}
                            <linearGradient id="thobeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ffffff" />
                                <stop offset="50%" stopColor="#f8fafc" />
                                <stop offset="100%" stopColor="#e2e8f0" />
                            </linearGradient>
                            {/* Altın Nakış Süsleri */}
                            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#fef08a" />
                                <stop offset="50%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#b45309" />
                            </linearGradient>
                        </defs>

                        {/* 1. Gövde / Beyaz İslami Kandura (Thobe) */}
                        <path 
                            d="M 50 115 L 110 115 L 125 210 L 35 210 Z" 
                            fill="url(#thobeGrad)" 
                            stroke="#94a3b8" 
                            strokeWidth="2.5" 
                        />
                        {/* Yakadaki Altın Düğmeler / Nakış */}
                        <line x1="80" y1="115" x2="80" y2="175" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4,3" />
                        <circle cx="80" cy="125" r="2.5" fill="#f59e0b" />
                        <circle cx="80" cy="140" r="2.5" fill="#f59e0b" />
                        <circle cx="80" cy="155" r="2.5" fill="#f59e0b" />

                        {/* 2. Sol Kol (Gövdede Sakin Duruş) */}
                        <path 
                            d="M 52 120 Q 38 145 42 165" 
                            fill="none" 
                            stroke="url(#thobeGrad)" 
                            strokeWidth="14" 
                            strokeLinecap="round" 
                        />

                        {/* 3. Sağ Kol (YUKARI KALKMIŞ VE İÇERİĞİ İŞARET EDEN EL) */}
                        <path 
                            d="M 108 120 Q 130 115 145 95" 
                            fill="none" 
                            stroke="url(#thobeGrad)" 
                            strokeWidth="14" 
                            strokeLinecap="round" 
                        />
                        {/* İşaret Eden 3D El & Parmak */}
                        <circle cx="145" cy="95" r="8" fill="url(#skinGrad)" stroke="#ea580c" strokeWidth="1.2" />
                        <path d="M 145 95 L 158 85" stroke="url(#skinGrad)" strokeWidth="5" strokeLinecap="round" />

                        {/* 4. Boyun */}
                        <rect x="73" y="98" width="14" height="20" rx="4" fill="url(#skinGrad)" />

                        {/* 5. Sevimli Yuvarlak Kafa */}
                        <ellipse cx="80" cy="72" rx="34" ry="32" fill="url(#skinGrad)" stroke="#f97316" strokeWidth="1" />

                        {/* Kahverengi Saç Uçları (Alttan Görünen) */}
                        <path d="M 46 68 Q 45 80 50 88" stroke="#78350f" strokeWidth="4" strokeLinecap="round" fill="none" />
                        <path d="M 114 68 Q 115 80 110 88" stroke="#78350f" strokeWidth="4" strokeLinecap="round" fill="none" />

                        {/* 6. Beyaz İslami Namaz Takkesi (Kabartmalı Kubbe) */}
                        <path 
                            d="M 46 64 C 46 36, 114 36, 114 64 Z" 
                            fill="url(#takkeGrad)" 
                            stroke="#94a3b8" 
                            strokeWidth="2" 
                        />
                        {/* Takke Geometrik Nakış Şeridi */}
                        <path d="M 46 60 Q 80 64 114 60" stroke="#f59e0b" strokeWidth="3" fill="none" />

                        {/* 7. Sevimli İri Gözler (Parlayan Anime / Karikatür Gözler) */}
                        {/* Sol Göz */}
                        <ellipse cx="68" cy="72" rx="6" ry="8" fill="#1e293b" />
                        <circle cx="66" cy="69" r="2.5" fill="#ffffff" />
                        <circle cx="70" cy="74" r="1.2" fill="#ffffff" />

                        {/* Sağ Göz */}
                        <ellipse cx="92" cy="72" rx="6" ry="8" fill="#1e293b" />
                        <circle cx="90" cy="69" r="2.5" fill="#ffffff" />
                        <circle cx="94" cy="74" r="1.2" fill="#ffffff" />

                        {/* Sevimli Kaşlar */}
                        <path d="M 62 60 Q 68 56 74 61" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        <path d="M 86 61 Q 92 56 98 60" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                        {/* Gülümseyen Ağız & Pembe Yanaklar */}
                        <path d="M 72 84 Q 80 92 88 84" stroke="#c2410c" strokeWidth="3" strokeLinecap="round" fill="none" />
                        <ellipse cx="60" cy="79" rx="5" ry="3" fill="#f43f5e" opacity="0.4" />
                        <ellipse cx="100" cy="79" rx="5" ry="3" fill="#f43f5e" opacity="0.4" />
                    </svg>
                </div>

                {/* 🏮 3. YERDE DURAN IŞIKLI ALTIN RAMAZAN / KANDİL FENERİ */}
                <div 
                    className="lantern-glow mb-1 shrink-0 w-11 h-16 md:w-14 md:h-20"
                    title="Bereket Kandili"
                >
                    <svg viewBox="0 0 60 90" className="w-full h-full">
                        {/* Üst Asma Halkası */}
                        <circle cx="30" cy="12" r="7" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
                        
                        {/* Kubbe Başlık */}
                        <path d="M 18 24 Q 30 16 42 24 L 46 32 L 14 32 Z" fill="url(#goldGrad)" stroke="#78350f" strokeWidth="1.5" />
                        
                        {/* Cam Gövde (İçinde Yanan Sıcak Işık) */}
                        <polygon points="15,32 45,32 40,68 20,68" fill="#fef08a" opacity="0.9" />
                        <line x1="30" y1="32" x2="30" y2="68" stroke="#b45309" strokeWidth="1.5" />
                        
                        {/* İçteki Mum / Kandil Alevi */}
                        <ellipse cx="30" cy="50" rx="4" ry="7" fill="#f97316" />
                        <ellipse cx="30" cy="51" rx="2.5" ry="4" fill="#ffffff" />

                        {/* Alt Ayak */}
                        <rect x="16" y="68" width="28" height="6" rx="2" fill="url(#goldGrad)" stroke="#78350f" strokeWidth="1.5" />
                    </svg>
                </div>
            </div>

            {/* Küçültme Tuşu */}
            <button
                onClick={() => setIsMinimized(true)}
                className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-900/85 border border-amber-400/40 text-[9px] font-bold text-amber-200 hover:bg-slate-800 transition cursor-pointer"
                title="Rehberi simge durumuna küçült"
            >
                Gizle
            </button>
        </div>
    );
}
