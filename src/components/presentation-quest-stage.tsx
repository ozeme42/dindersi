'use client';

import React from 'react';
import { Sparkles, Star, Crown, Gem, Volume2, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { playSound } from '@/lib/audio-service';

export interface QuestItem {
    id?: string;
    title?: string;
    text: string;
    icon?: string;
    badge?: string;
}

interface PresentationQuestStageProps {
    items: QuestItem[];
    revealedCount?: number;
    title?: string;
    onItemClick?: (index: number) => void;
    onSpeakItem?: (e: React.MouseEvent, text: string, index: number) => void;
    speakingIndex?: number | null;
    fontSizeScale?: string;
}

const PORTAL_COLORS = [
    // 0: Safir Mavi Portalı
    {
        bg: 'linear-gradient(180deg, #1e40af 0%, #1e3a8a 50%, #0f172a 100%)',
        border: '#38bdf8',
        shadowBorder: '#0369a1',
        glow: 'rgba(56, 189, 248, 0.45)',
        badgeBg: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
        badgeBorder: '#bae6fd',
        textColor: '#ffffff',
        icon: '🌙',
    },
    // 1: Amber Altın Portalı
    {
        bg: 'linear-gradient(180deg, #b45309 0%, #78350f 50%, #451a03 100%)',
        border: '#fbbf24',
        shadowBorder: '#92400e',
        glow: 'rgba(245, 158, 11, 0.5)',
        badgeBg: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
        badgeBorder: '#fef3c7',
        textColor: '#ffffff',
        icon: '📜',
    },
    // 2: Zümrüt Yeşil Portalı
    {
        bg: 'linear-gradient(180deg, #047857 0%, #064e3b 50%, #022c22 100%)',
        border: '#34d399',
        shadowBorder: '#065f46',
        glow: 'rgba(16, 185, 129, 0.45)',
        badgeBg: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
        badgeBorder: '#a7f3d0',
        textColor: '#ffffff',
        icon: '🌴',
    },
    // 3: Ametist Mor Portalı
    {
        bg: 'linear-gradient(180deg, #6d28d9 0%, #4c1d95 50%, #2e1065 100%)',
        border: '#c084fc',
        shadowBorder: '#5b21b6',
        glow: 'rgba(192, 132, 252, 0.45)',
        badgeBg: 'linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)',
        badgeBorder: '#f3e8ff',
        textColor: '#ffffff',
        icon: '✨',
    },
    // 4: Yakut Kırmızı Portalı
    {
        bg: 'linear-gradient(180deg, #be123c 0%, #881337 50%, #4c0519 100%)',
        border: '#fb7185',
        shadowBorder: '#9f1239',
        glow: 'rgba(251, 113, 133, 0.45)',
        badgeBg: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
        badgeBorder: '#ffe4e6',
        textColor: '#ffffff',
        icon: '🌅',
    },
    // 5: Hazine Topaz Portalı
    {
        bg: 'linear-gradient(180deg, #d97706 0%, #92400e 50%, #1e1b4b 100%)',
        border: '#fde047',
        shadowBorder: '#854d0e',
        glow: 'rgba(253, 224, 71, 0.5)',
        badgeBg: 'linear-gradient(135deg, #fde047 0%, #ca8a04 100%)',
        badgeBorder: '#fefce8',
        textColor: '#ffffff',
        icon: '🏆',
    },
];

export function PresentationQuestStage({
    items,
    revealedCount = 999,
    title,
    onItemClick,
    onSpeakItem,
    speakingIndex,
    fontSizeScale = 'normal',
}: PresentationQuestStageProps) {
    if (!items || items.length === 0) return null;

    const visibleItems = items.slice(0, revealedCount);
    const count = visibleItems.length;

    // Font boyutu hesaplama
    const getCardTextSize = () => {
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') {
            return count <= 2 ? 'text-2xl md:text-4xl' : 'text-xl md:text-3xl';
        }
        if (fontSizeScale === 'lg') {
            return count <= 2 ? 'text-xl md:text-3xl' : 'text-lg md:text-2xl';
        }
        if (fontSizeScale === 'xs') {
            return 'text-sm md:text-base';
        }
        return count <= 2 ? 'text-lg md:text-2xl' : 'text-base md:text-xl';
    };

    return (
        <div className="w-full h-full flex flex-col justify-center items-center py-2 px-3 md:px-6 relative select-none">
            {/* ═════════ 3D OYUN ALANI / İLİM PORTALLARI VE KARTLARI ═════════ */}
            <div 
                className={cn(
                    "w-full max-w-[1500px] mx-auto grid gap-3 sm:gap-4 md:gap-6 items-stretch justify-center",
                    count === 1 && "grid-cols-1 max-w-4xl",
                    count === 2 && "grid-cols-1 sm:grid-cols-2 max-w-5xl",
                    count === 3 && "grid-cols-1 sm:grid-cols-3 max-w-6xl",
                    count === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-[1550px]",
                    count > 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl"
                )}
            >
                {visibleItems.map((item, idx) => {
                    const color = PORTAL_COLORS[idx % PORTAL_COLORS.length];
                    const isSpeaking = speakingIndex === idx;

                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 25, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.35, delay: idx * 0.08 }}
                            className="w-full flex flex-col group relative cursor-pointer"
                            onClick={() => {
                                playSound('pop');
                                onItemClick?.(idx);
                            }}
                        >
                            {/* ══════ 1. KUBBE BAŞLIK (3D CAMİ / SARAY KUBBESİ MOTİFİ) ══════ */}
                            <div className="relative mx-auto -mb-1 z-10 flex items-center justify-center">
                                <div
                                    className="px-4 py-1.5 rounded-t-2xl border-t-3 border-x-3 shadow-xl flex items-center gap-1.5 transition-transform group-hover:-translate-y-1"
                                    style={{
                                        background: color.bg,
                                        borderColor: color.border,
                                        boxShadow: `0 -4px 15px ${color.glow}, inset 0 2px 3px rgba(255,255,255,0.4)`,
                                    }}
                                >
                                    <span className="text-base md:text-xl filter drop-shadow">
                                        {item.icon || color.icon}
                                    </span>
                                    <span className="text-xs md:text-sm font-black text-white uppercase tracking-wider drop-shadow">
                                        {item.title ? item.title : `Madde ${idx + 1}`}
                                    </span>
                                </div>
                            </div>

                            {/* ══════ 2. 3D KABARTMALI GÖVDE (TAVAN IŞIKLI OYUN TABLETİ) ══════ */}
                            <div
                                className={cn(
                                    "flex-1 relative rounded-3xl border-4 p-4 sm:p-6 md:p-8 flex flex-col justify-between transition-all duration-300 overflow-hidden shadow-2xl",
                                    "border-b-[10px] md:border-b-[14px] active:border-b-4 active:translate-y-1 hover:brightness-105"
                                )}
                                style={{
                                    background: color.bg,
                                    borderColor: color.border,
                                    borderBottomColor: color.shadowBorder,
                                    boxShadow: `0 14px 35px rgba(0,0,0,0.8), 0 0 25px ${color.glow}, inset 0 3px 5px rgba(255,255,255,0.4)`,
                                }}
                            >
                                {/* Üst Işık Yansıması (Specular Highlight) */}
                                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none rounded-t-2xl" />

                                {/* İslami Geometrik Desen Dokusu (Hafif Arka Plan Deseni) */}
                                <div 
                                    className="absolute inset-0 opacity-10 pointer-events-none"
                                    style={{
                                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
                                        backgroundSize: '20px 20px',
                                    }}
                                />

                                {/* Kart İçerik Yazısı (Büyük, Canlı, Okunaklı) */}
                                <div className="relative z-10 flex-1 flex items-center justify-center text-center py-2">
                                    <div 
                                        className={cn(
                                            "font-black leading-relaxed tracking-tight text-white drop-shadow-md",
                                            getCardTextSize()
                                        )}
                                        dangerouslySetInnerHTML={{ __html: item.text }}
                                    />
                                </div>

                                {/* ══════ 3. KART ALTI 3D BUTONLAR (SESLİ OKUMA & ROZET) ══════ */}
                                <div className="relative z-10 mt-3 pt-3 border-t-2 border-white/20 flex items-center justify-between">
                                    
                                    {/* Yıldızlı Numara Rozeti */}
                                    <div 
                                        className="px-2.5 py-1 rounded-full border-2 shadow-md flex items-center gap-1"
                                        style={{
                                            background: color.badgeBg,
                                            borderColor: color.badgeBorder,
                                        }}
                                    >
                                        <Star size={12} className="text-amber-200 fill-amber-200" />
                                        <span className="text-[11px] font-black text-white">
                                            #{idx + 1}
                                        </span>
                                    </div>

                                    {/* Sesli Okuma Butonu */}
                                    {onSpeakItem && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSpeakItem(e, item.text, idx);
                                            }}
                                            className={cn(
                                                "p-2 rounded-2xl border-2 border-b-[3px] shadow-lg flex items-center gap-1 text-xs font-black transition-all active:border-b-0 active:translate-y-0.5 cursor-pointer",
                                                isSpeaking 
                                                    ? "bg-amber-400 border-amber-200 border-b-amber-700 text-amber-950 animate-bounce" 
                                                    : "bg-white/15 hover:bg-white/25 border-white/40 border-b-white/20 text-white"
                                            )}
                                            title="Bu bilgiyi seslendir"
                                        >
                                            <Volume2 size={15} />
                                            <span className="hidden sm:inline">Seslendir</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
