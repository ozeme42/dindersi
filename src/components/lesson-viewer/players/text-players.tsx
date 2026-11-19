'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    HelpCircle, Lightbulb, MessageCircle, CheckCircle2, Sparkles, BookOpen, 
    Pencil, Copy, Check, Plus, Minus, Layers, ListChecks, ArrowRight, ArrowLeft,
    Clock, Target, ChevronRight, Grid3X3, Table, CheckSquare, Square, 
    Maximize2, Minimize2, LayoutList, Play, Pause, Flame, Zap, RotateCcw, Compass, FileText, 
    Star, Bookmark, Award, CheckCircle, ChevronDown, Trophy, Volume2, VolumeX, Eye,
    X, MessageSquare, Sun, Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import type { 
    HookQuestionStep, NotebookNoteStep, ProcessFlowStep, 
    ConceptMatrixStep, CategoryTableStep, TopicOutlineStep, LessonStep 
} from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playSound } from '@/lib/audio-service';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 DİKKAT ÇEKME & MERAK UYANDIRMA GİRİŞ SORUSU BİLEŞENİ (HookQuestionPlayer)
// ═══════════════════════════════════════════════════════════════════════════

export const SKETCHNOTE_TEXT_PALETTE = [
    {
        bg: 'bg-[#fefce8]',
        border: 'border-[#eab308]',
        shadow: 'shadow-[3px_3px_0_#eab308]',
        numBg: 'bg-[#ca8a04]',
        badgeBg: 'bg-[#fde047]',
        badgeText: 'text-[#854d0e]',
        badgeBorder: 'border-[#ca8a04]'
    },
    {
        bg: 'bg-[#fdf2f8]',
        border: 'border-[#ec4899]',
        shadow: 'shadow-[3px_3px_0_#ec4899]',
        numBg: 'bg-[#db2777]',
        badgeBg: 'bg-[#fbcfe8]',
        badgeText: 'text-[#9d174d]',
        badgeBorder: 'border-[#db2777]'
    },
    {
        bg: 'bg-[#f0f9ff]',
        border: 'border-[#0284c7]',
        shadow: 'shadow-[3px_3px_0_#0284c7]',
        numBg: 'bg-[#0284c7]',
        badgeBg: 'bg-[#bae6fd]',
        badgeText: 'text-[#075985]',
        badgeBorder: 'border-[#0284c7]'
    },
    {
        bg: 'bg-[#f0fdf4]',
        border: 'border-[#16a34a]',
        shadow: 'shadow-[3px_3px_0_#16a34a]',
        numBg: 'bg-[#16a34a]',
        badgeBg: 'bg-[#bbf7d0]',
        badgeText: 'text-[#166534]',
        badgeBorder: 'border-[#16a34a]'
    },
    {
        bg: 'bg-[#fff7ed]',
        border: 'border-[#ea580c]',
        shadow: 'shadow-[3px_3px_0_#ea580c]',
        numBg: 'bg-[#ea580c]',
        badgeBg: 'bg-[#fed7aa]',
        badgeText: 'text-[#9a3412]',
        badgeBorder: 'border-[#ea580c]'
    },
    {
        bg: 'bg-[#faf5ff]',
        border: 'border-[#9333ea]',
        shadow: 'shadow-[3px_3px_0_#9333ea]',
        numBg: 'bg-[#9333ea]',
        badgeBg: 'bg-[#e9d5ff]',
        badgeText: 'text-[#6b21a8]',
        badgeBorder: 'border-[#9333ea]'
    }
];

// ═══════════════════════════════════════════════════════════════════════════
// 🤔 KOCAMAN DÜŞÜNEN ÇOCUK MASKOTU (Akıllı Tahta Merak & İlham Karakteri)
// ═══════════════════════════════════════════════════════════════════════════

export function ThinkingChildMascot({
    isLight = true,
    className = ""
}: {
    isLight?: boolean;
    className?: string;
}) {
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [showQuote, setShowQuote] = useState(true);

    const THINKING_QUOTES = [
        "Hmm... Acaba cevabı ne olabilir? 🤔",
        "Sen ne düşünüyorsun? Çok merak ettim! ✨",
        "Hadi birlikte derin düşünelim! 💡",
        "Aklına harika bir fikir geldi mi? 🚀",
        "Söz hakkı alıp fikrini paylaş! 🎤"
    ];

    const handleInteract = () => {
        playSound('pop');
        setQuoteIndex(prev => (prev + 1) % THINKING_QUOTES.length);
        setShowQuote(true);
        try {
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 40,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            } else {
                import('canvas-confetti').then(m => {
                    m.default({
                        particleCount: 40,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }).catch(() => {});
            }
        } catch {}
    };

    return (
        <div className={cn("relative flex flex-col items-center select-none group", className)}>
            {/* Tıklanabilir / Etkileşimli Düşünce Balonu */}
            <AnimatePresence mode="wait">
                {showQuote && (
                    <motion.div
                        key={quoteIndex}
                        initial={{ opacity: 0, scale: 0.75, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.75, y: -10 }}
                        transition={{ type: "spring", stiffness: 350, damping: 20 }}
                        onClick={handleInteract}
                        className={cn(
                            "absolute -top-12 sm:-top-16 z-30 px-4 sm:px-5 py-2 rounded-2xl border-2 text-xs sm:text-sm md:text-base font-black whitespace-nowrap shadow-xl cursor-pointer transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5",
                            isLight
                                ? "bg-white border-amber-400 text-amber-950 shadow-amber-300/40"
                                : "bg-slate-900 border-amber-400/80 text-amber-200 shadow-amber-950/50"
                        )}
                        title="Tıkla & Yeni Fikir Gör!"
                    >
                        <span>{THINKING_QUOTES[quoteIndex]}</span>
                        {/* Balon Oku */}
                        <div className={cn(
                            "absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 border-r-2 border-b-2",
                            isLight ? "bg-white border-amber-400" : "bg-slate-900 border-amber-400/80"
                        )} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hareketli / Canlı Çocuk Maskot SVG */}
            <motion.div
                animate={{ y: [0, -10, 0], rotate: [0, 1.2, 0] }}
                transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleInteract}
                className="w-full h-full cursor-pointer relative"
                title="Düşünen Arkadaşına Tıkla! 💡"
            >
                <svg
                    viewBox="0 0 280 340"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full overflow-visible filter drop-shadow-xl"
                >
                    <defs>
                        {/* Hoodie Gradient */}
                        <linearGradient id="childHoodieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0284C7" />
                            <stop offset="100%" stopColor="#0369A1" />
                        </linearGradient>
                        {/* Yüz ve Ten Gradient */}
                        <linearGradient id="childSkinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFE0C8" />
                            <stop offset="100%" stopColor="#F9CEA8" />
                        </linearGradient>
                        {/* Saç Gradient */}
                        <linearGradient id="childHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6C3512" />
                            <stop offset="100%" stopColor="#431C05" />
                        </linearGradient>
                        {/* Ampul Işıltı Gradient */}
                        <radialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FEF08A" stopOpacity="1" />
                            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* 1. Zemin Gölgesi (Nefes Alma Animasyonlu) */}
                    <ellipse
                        cx="140"
                        cy="325"
                        rx="70"
                        ry="14"
                        fill={isLight ? "rgba(217, 119, 6, 0.2)" : "rgba(0, 0, 0, 0.45)"}
                    />

                    {/* 2. Düşünce Baloncukları ve Ampul */}
                    <g className="filter drop-shadow-md">
                        {/* Küçük Baloncuk */}
                        <circle cx="185" cy="80" r="7" fill="#FDE047" stroke="#3D2010" strokeWidth="2.5" />
                        {/* Orta Baloncuk */}
                        <circle cx="205" cy="58" r="10" fill="#FDE047" stroke="#3D2010" strokeWidth="3" />
                        {/* Büyük Düşünce Ampulü */}
                        <g transform="translate(195, 0)">
                            {/* Işık Parıltı Aurası */}
                            <circle cx="32" cy="24" r="30" fill="url(#bulbGlow)" className="animate-pulse" />
                            {/* Ampul Camı */}
                            <path
                                d="M 22 28 C 16 22, 16 12, 24 6 C 32 0, 42 2, 46 8 C 50 14, 46 22, 42 28 L 40 35 L 24 35 Z"
                                fill="#FACC15"
                                stroke="#3D2010"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            {/* Ampul Tabanı */}
                            <rect x="25" y="35" width="14" height="4" rx="2" fill="#94A3B8" stroke="#3D2010" strokeWidth="2.5" />
                            <rect x="27" y="39" width="10" height="3" rx="1.5" fill="#64748B" stroke="#3D2010" strokeWidth="2" />
                            {/* Ampul Tel Filament */}
                            <path d="M 28 20 Q 32 14 36 20" fill="none" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
                            {/* Parıltı Çizgileri */}
                            <path d="M 32 -4 L 32 -10" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 52 4 L 58 -1" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 12 4 L 6 -1" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 58 20 L 64 20" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 6 20 L 0 20" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                        </g>
                    </g>

                    {/* 3. Gövde & Hoodie */}
                    <g>
                        {/* Hoodie Ana Gövde */}
                        <path
                            d="M 75 320 
                               C 72 250, 85 205, 115 190 
                               C 125 185, 155 185, 165 190 
                               C 195 205, 208 250, 205 320 Z"
                            fill="url(#childHoodieGrad)"
                            stroke="#2B1608"
                            strokeWidth="4"
                            strokeLinejoin="round"
                        />
                        {/* Yaka / Kapüşon Kıvrımı */}
                        <path
                            d="M 115 190 C 128 210, 152 210, 165 190"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                        {/* Kapüşon Beyaz İpleri */}
                        <path d="M 128 205 L 128 235" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
                        <circle cx="128" cy="237" r="3.5" fill="#F59E0B" stroke="#2B1608" strokeWidth="2" />
                        <path d="M 152 205 L 152 235" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
                        <circle cx="152" cy="237" r="3.5" fill="#F59E0B" stroke="#2B1608" strokeWidth="2" />

                        {/* Kanguru Cep Çizgisi */}
                        <path
                            d="M 98 280 Q 140 292 182 280 L 190 315 L 90 315 Z"
                            fill="#0273AE"
                            stroke="#2B1608"
                            strokeWidth="3.5"
                            strokeLinejoin="round"
                        />
                        {/* Göğüste Sevimli Yıldız Rozeti */}
                        <g transform="translate(140, 240)">
                            <polygon
                                points="0,-8 2.5,-2.5 8,-2 4,2 5.5,7.5 0,4.5 -5.5,7.5 -4,2 -8,-2 -2.5,-2.5"
                                fill="#FACC15"
                                stroke="#2B1608"
                                strokeWidth="2"
                            />
                        </g>

                        {/* Sol Kol (Gövdenin Yanında Rahat Duruş) */}
                        <path
                            d="M 90 220 C 72 230, 68 270, 75 315"
                            fill="none"
                            stroke="#2B1608"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                    </g>

                    {/* 4. Boyun */}
                    <rect
                        x="126"
                        y="165"
                        width="28"
                        height="26"
                        rx="8"
                        fill="url(#childSkinGrad)"
                        stroke="#2B1608"
                        strokeWidth="4"
                    />

                    {/* 5. Kafa & Yüz (Hafifçe Eğik, Merak Dolu) */}
                    <g transform="rotate(-3 140 135)">
                        {/* Kulaklar */}
                        <ellipse cx="86" cy="132" rx="9" ry="14" fill="url(#childSkinGrad)" stroke="#2B1608" strokeWidth="3.5" />
                        <path d="M 86 128 Q 89 133 86 136" stroke="#D97706" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                        
                        <ellipse cx="194" cy="132" rx="9" ry="14" fill="url(#childSkinGrad)" stroke="#2B1608" strokeWidth="3.5" />
                        <path d="M 194 128 Q 191 133 194 136" stroke="#D97706" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                        {/* Yüz / Kafa Ovali */}
                        <path
                            d="M 90 130 
                               C 90 85, 102 55, 140 55 
                               C 178 55, 190 85, 190 130 
                               C 190 168, 175 182, 140 182 
                               C 105 182, 90 168, 90 130 Z"
                            fill="url(#childSkinGrad)"
                            stroke="#2B1608"
                            strokeWidth="4"
                            strokeLinejoin="round"
                        />

                        {/* Sevimli Pembe Yanaklar */}
                        <ellipse cx="108" cy="144" rx="10" ry="7" fill="#FF8BA7" opacity="0.85" />
                        <ellipse cx="172" cy="144" rx="10" ry="7" fill="#FF8BA7" opacity="0.85" />

                        {/* Sol Göz (Büyük Parlak Anime Çizgi Gözü - Yukarı Sağa Merakla Bakıyor) */}
                        <g transform="translate(106, 112)">
                            <ellipse cx="10" cy="12" rx="11" ry="15" fill="#FFFFFF" stroke="#2B1608" strokeWidth="3.5" />
                            {/* İris / Gözbebeği */}
                            <ellipse cx="13" cy="9" rx="7.5" ry="10" fill="#2B1608" />
                            <circle cx="13" cy="10" r="5.5" fill="#78350F" />
                            {/* Parlak Beyaz Işık Yansımaları */}
                            <circle cx="15.5" cy="6.5" r="3.5" fill="#FFFFFF" />
                            <circle cx="10.5" cy="13" r="1.8" fill="#FFFFFF" />
                        </g>

                        {/* Sağ Göz (Aynı Meraklı İfadeyle Bakıyor) */}
                        <g transform="translate(150, 112)">
                            <ellipse cx="10" cy="12" rx="11" ry="15" fill="#FFFFFF" stroke="#2B1608" strokeWidth="3.5" />
                            {/* İris / Gözbebeği */}
                            <ellipse cx="13" cy="9" rx="7.5" ry="10" fill="#2B1608" />
                            <circle cx="13" cy="10" r="5.5" fill="#78350F" />
                            {/* Parlak Beyaz Işık Yansımaları */}
                            <circle cx="15.5" cy="6.5" r="3.5" fill="#FFFFFF" />
                            <circle cx="10.5" cy="13" r="1.8" fill="#FFFFFF" />
                        </g>

                        {/* Kaşlar (Meraklı & Düşünceli: Sol Kaş Kalkık, Sağ Kaş Düşünceli) */}
                        <path d="M 104 102 Q 118 92 130 98" fill="none" stroke="#2B1608" strokeWidth="4" strokeLinecap="round" />
                        <path d="M 152 98 Q 164 96 176 104" fill="none" stroke="#2B1608" strokeWidth="4" strokeLinecap="round" />

                        {/* Sevimli Burun */}
                        <path d="M 139 133 Q 143 140 138 142" fill="none" stroke="#D97706" strokeWidth="3.2" strokeLinecap="round" />

                        {/* Ağız (Düşünceli "Hmm..." Şirin Kıvrımı) */}
                        <path d="M 132 158 Q 140 164 150 159" fill="none" stroke="#2B1608" strokeWidth="3.8" strokeLinecap="round" />

                        {/* Havalı, Sevimli Saçlar (Kabarık Kaküller & Üst Bukleler) */}
                        <path
                            d="M 84 108 
                               C 78 70, 95 38, 140 36 
                               C 185 38, 202 70, 196 108 
                               C 192 92, 180 82, 172 82 
                               C 162 82, 156 94, 150 94 
                               C 144 94, 138 78, 128 78 
                               C 118 78, 114 94, 106 94 
                               C 98 94, 90 98, 84 108 Z"
                            fill="url(#childHairGrad)"
                            stroke="#2B1608"
                            strokeWidth="4"
                            strokeLinejoin="round"
                        />
                        {/* Saç Işıltısı ve Detay Çizgileri */}
                        <path d="M 115 54 Q 140 46 165 54" fill="none" stroke="#9A4D1C" strokeWidth="3.5" strokeLinecap="round" />
                        <path d="M 102 78 Q 120 70 138 74" fill="none" stroke="#9A4D1C" strokeWidth="3" strokeLinecap="round" />
                    </g>

                    {/* 6. Çeneyi Tutan Düşünme Eli & Kolu (🤔 En İkonik Parça) */}
                    <g>
                        {/* Çeneye Uzanan Sağ Kol */}
                        <path
                            d="M 185 240 
                               C 210 225, 218 175, 190 155 
                               C 175 145, 162 152, 158 160"
                            fill="url(#childHoodieGrad)"
                            stroke="#2B1608"
                            strokeWidth="4"
                            strokeLinejoin="round"
                        />
                        {/* Manşet / Bileklik */}
                        <ellipse cx="160" cy="162" rx="9" ry="5" fill="#0273AE" stroke="#2B1608" strokeWidth="3" transform="rotate(-25 160 162)" />

                        {/* Çeneyi Tutan Parmaklar & Başparmak */}
                        <g transform="translate(144, 150)">
                            {/* Çeneye dayalı el ayası */}
                            <path
                                d="M 8 18 
                                   C 5 12, 7 3, 14 3 
                                   C 19 3, 21 8, 23 12 
                                   C 27 9, 31 10, 32 15 
                                   C 33 20, 28 26, 21 28 
                                   C 14 30, 8 26, 8 18 Z"
                                fill="url(#childSkinGrad)"
                                stroke="#2B1608"
                                strokeWidth="3.5"
                                strokeLinejoin="round"
                            />
                            {/* Çeneyi yukarı destekleyen sevimli başparmak */}
                            <path
                                d="M 14 3 Q 17 -6 21 0 Q 24 7 19 12"
                                fill="url(#childSkinGrad)"
                                stroke="#2B1608"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                            />
                            {/* Parmak boğumu detayları */}
                            <path d="M 15 16 L 22 16 M 15 21 L 21 21" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
                        </g>
                    </g>
                </svg>
            </motion.div>
        </div>
    );
}

export function HookQuestionPlayer({ 
    step, 
    isFullscreen: propIsFullscreen, 
    fontSizeScale = 'normal',
    presentationTheme = 'clean-light',
    presentationFont = 'playfair'
}: { 
    step: HookQuestionStep; 
    isFullscreen?: boolean; 
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));
    const [showThoughtStarter, setShowThoughtStarter] = useState(false);
    const [hasTriggeredDiscussion, setHasTriggeredDiscussion] = useState(false);

    // ☀️ Açık Tema (Varsayılan) / 🌙 Koyu Tema
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
    const isLight = themeMode === 'light';

    // Canlı Font Büyütme/Küçültme Seviyesi (0: Standart, 1: Büyük, 2: Çok Büyük, 3: Dev Akıllı Tahta)
    // Akıllı tahtalarda arkalardan da devasa ve kristal netliğinde görünmesi için varsayılan olarak Seviye 2 (XL) başlar
    const initialLevel = fontSizeScale === 'huge' ? 3 :
                         fontSizeScale === 'sm' ? 1 : 2;
    const [fontLevel, setFontLevel] = useState<number>(initialLevel);

    const getHookQuestionFontClass = () => {
        switch (fontLevel) {
            case 0: return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
            case 1: return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
            case 2: return "text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl";
            case 3: return "text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[7.5rem]";
            default: return "text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl";
        }
    };

    useEffect(() => {
        if (typeof propIsFullscreen === 'boolean') {
            setIsFullscreen(propIsFullscreen);
        }
    }, [propIsFullscreen]);

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

    const handleStartDiscussion = () => {
        playSound('pop');
        setHasTriggeredDiscussion(true);
        import('canvas-confetti').then(m => {
            m.default({
                particleCount: 80,
                spread: 80,
                origin: { y: 0.6 }
            });
        }).catch(() => {});
    };

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative flex flex-col w-full overflow-hidden select-none transition-all duration-300 font-sans",
                isLight 
                    ? "bg-gradient-to-br from-[#FFFDF9] via-[#FFF9EE] to-[#FEF3C7] text-slate-900 border-2 border-amber-200/90 shadow-xl"
                    : "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white border border-white/10 shadow-2xl",
                isFullscreen 
                    ? "fixed inset-0 z-[100] p-3 sm:p-6 w-full h-full" 
                    : "w-full h-full rounded-2xl md:rounded-3xl p-3 sm:p-5"
            )}
        >
            {/* Arkaplan Işık Efektleri */}
            {isLight ? (
                <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
                    <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-amber-300/30 rounded-full blur-[110px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-300/25 rounded-full blur-[110px]" />
                </div>
            ) : (
                <div className="absolute inset-0 pointer-events-none z-0 opacity-25">
                    <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
                </div>
            )}

            <div className="relative z-10 flex flex-col w-full h-full gap-3 sm:gap-4 justify-between">
                
                {/* ══ 1. HUD / BAŞLIK BARI ══ */}
                <div className={cn(
                    "p-3 sm:p-4 rounded-3xl border shadow-md relative overflow-hidden shrink-0 transition-all",
                    isLight 
                        ? "bg-white/95 backdrop-blur-md border-amber-200/90 text-slate-900" 
                        : "bg-slate-900/70 backdrop-blur-md border-white/10 text-white"
                )}>
                    {/* Alt İlerleme Çizgisi */}
                    <div className="absolute bottom-0 left-0 h-1.5 w-full bg-slate-200/60 dark:bg-slate-800">
                        <div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-400 w-full" />
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        {/* Sol: İkon & Başlık */}
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                            <div className={cn(
                                "p-2 sm:p-2.5 rounded-2xl shrink-0 border",
                                isLight 
                                    ? "bg-amber-100 border-amber-300 text-amber-700 shadow-xs" 
                                    : "bg-amber-500/20 border-amber-500/30 text-amber-400"
                            )}>
                                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <div className="min-w-0">
                                <h1 className={cn(
                                    "text-base sm:text-xl md:text-2xl font-black truncate",
                                    isLight ? "text-slate-900" : "text-white"
                                )}>
                                    {step.tag || step.title || 'Derse Başlarken: Merak Edelim & Düşünelim!'}
                                </h1>
                                <p className={cn(
                                    "text-xs md:text-sm hidden sm:block truncate font-bold",
                                    isLight ? "text-amber-800/80" : "text-slate-400"
                                )}>
                                    Düşün, tartış ve fikirlerini sınıfla paylaş!
                                </p>
                            </div>
                        </div>

                        {/* Sağ: Tema, Font Büyütücü ve Tam Ekran Kontrolleri */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            
                            {/* ☀️ / 🌙 Tema Toggle Butonu */}
                            <div className={cn(
                                "flex items-center p-0.5 rounded-xl border text-xs font-bold",
                                isLight ? "bg-amber-100/70 border-amber-200" : "bg-black/40 border-white/10"
                            )}>
                                <button
                                    type="button"
                                    onClick={() => { playSound('pop'); setThemeMode('light'); }}
                                    className={cn(
                                        "px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                                        isLight ? "bg-white text-amber-900 font-black shadow-xs" : "text-slate-400 hover:text-white"
                                    )}
                                    title="Açık Tema"
                                >
                                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="hidden md:inline">Açık</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { playSound('pop'); setThemeMode('dark'); }}
                                    className={cn(
                                        "px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                                        !isLight ? "bg-slate-800 text-white font-black shadow-xs" : "text-slate-600 hover:text-slate-900"
                                    )}
                                    title="Koyu Tema"
                                >
                                    <Moon className="w-3.5 h-3.5" />
                                    <span className="hidden md:inline">Koyu</span>
                                </button>
                            </div>

                            {/* Canlı Font Ölçekleyici (A- / A+) */}
                            <div className={cn(
                                "flex items-center px-2 py-1 rounded-xl border gap-1 shrink-0 shadow-inner",
                                isLight ? "bg-amber-50 border-amber-200" : "bg-slate-950/80 border-white/10"
                            )}>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setFontLevel(prev => Math.max(0, prev - 1))}
                                    disabled={fontLevel <= 0}
                                    className={cn(
                                        "h-7 w-7 p-0 font-black disabled:opacity-30",
                                        isLight ? "text-slate-700 hover:text-slate-950 hover:bg-amber-100" : "text-slate-300 hover:text-white hover:bg-white/10"
                                    )}
                                    title="Yazıyı Küçült (A-)"
                                >
                                    A-
                                </Button>
                                <span className={cn(
                                    "text-[11px] font-mono font-bold min-w-[20px] text-center select-none",
                                    isLight ? "text-amber-800" : "text-amber-300"
                                )}>
                                    {fontLevel === 0 ? 'N' : fontLevel === 1 ? 'L' : fontLevel === 2 ? 'XL' : 'XXL'}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setFontLevel(prev => Math.min(3, prev + 1))}
                                    disabled={fontLevel >= 3}
                                    className={cn(
                                        "h-7 w-7 p-0 font-black disabled:opacity-30",
                                        isLight ? "text-amber-700 hover:text-amber-950 hover:bg-amber-100" : "text-amber-400 hover:text-white hover:bg-white/10"
                                    )}
                                    title="Yazıyı Büyüt (A+)"
                                >
                                    A+
                                </Button>
                            </div>

                            {/* Tam Ekran Butonu */}
                            <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={toggleFullscreen}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl h-9 px-3 sm:px-4 gap-1.5 text-xs sm:text-sm shadow-md cursor-pointer shrink-0"
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
                                        <span className="hidden sm:inline">Tam Ekran</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ══ 2. ANA SORU KARTI ARENASI ══ */}
                <div className={cn(
                    "flex-1 min-h-[220px] rounded-3xl border-4 border-dashed p-4 sm:p-8 md:p-10 flex flex-col justify-center items-center overflow-y-auto scrollbar-thin gap-4 sm:gap-6 my-auto relative transition-all w-full max-w-7xl mx-auto",
                    isLight 
                        ? "bg-white/95 border-amber-300 shadow-[0_15px_40px_rgba(245,158,11,0.12)] scrollbar-thumb-amber-200" 
                        : "bg-slate-900/50 backdrop-blur-sm border-slate-700 shadow-inner scrollbar-thumb-white/20"
                )}>
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-10 lg:gap-14 w-full my-auto">
                        
                        {/* Sol / Üst: Kocaman Düşünen Çocuk Maskotu */}
                        <div className="shrink-0 flex flex-col items-center justify-center pt-8 sm:pt-10 lg:pt-0">
                            <ThinkingChildMascot 
                                isLight={isLight} 
                                className="w-52 h-64 sm:w-64 sm:h-76 md:w-72 md:h-84 lg:w-80 lg:h-96 xl:w-96 xl:h-[420px]" 
                            />
                        </div>

                        {/* Sağ: Soru Alanı, Rozet ve İpucu Paneli */}
                        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-4 sm:gap-6 min-w-0 max-w-5xl">
                            {/* Üst Rozet */}
                            <div className={cn(
                                "inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm md:text-base font-black tracking-wide border shadow-xs",
                                isLight ? "bg-amber-100/90 border-amber-300 text-amber-900" : "bg-amber-500/20 border-amber-400/40 text-amber-300"
                            )}>
                                <span className="text-base sm:text-xl">🤔</span>
                                <span>Merak & Düşünce Sorusu</span>
                            </div>

                            {/* Büyük Soru Başlığı */}
                            <h2 className={cn(
                                "font-black leading-snug sm:leading-tight tracking-tight transition-all select-text break-words w-full",
                                isLight ? "text-slate-900 drop-shadow-xs" : "text-white drop-shadow-lg",
                                getHookQuestionFontClass(),
                                isSketchnote && "font-['Caveat',cursive] text-amber-950 font-bold"
                            )}>
                                "{step.question}"
                            </h2>

                            {/* İpucu Paneli (Sarı Post-it Tarzı) */}
                            {step.thoughtStarter && showThoughtStarter && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={cn(
                                        "p-5 sm:p-7 md:p-8 rounded-3xl border-2 text-left shadow-2xl max-w-4xl w-full flex items-start gap-4 mt-2 sm:mt-4",
                                        isLight 
                                            ? "bg-[#FEF9C3] border-[#EAB308] text-[#713F12] shadow-amber-200/50" 
                                            : "bg-amber-500/15 border-amber-400/50 text-amber-100 shadow-amber-950/40"
                                    )}
                                >
                                    <Lightbulb className={cn("w-7 h-7 sm:w-9 sm:h-9 shrink-0 mt-0.5", isLight ? "text-amber-600" : "text-amber-400")} />
                                    <div className="flex-1">
                                        <span className={cn(
                                            "text-xs sm:text-sm md:text-base font-black uppercase tracking-wider block mb-1.5",
                                            isLight ? "text-amber-900" : "text-amber-300"
                                        )}>
                                            💡 Sınıfça Düşünelim & Tartışalım:
                                        </span>
                                        <p className={cn(
                                            "text-base sm:text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed",
                                            isLight ? "text-amber-950" : "text-slate-100"
                                        )}>
                                            {step.thoughtStarter}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowThoughtStarter(false)}
                                        className={cn(
                                            "p-1.5 rounded-xl transition-colors cursor-pointer",
                                            isLight ? "text-amber-800 hover:text-amber-950 hover:bg-amber-200/60" : "text-slate-400 hover:text-white hover:bg-white/10"
                                        )}
                                        title="Kapat"
                                    >
                                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══ 3. ALT AKSİYON BARI (3D Butonlar) ══ */}
                <div className={cn(
                    "shrink-0 rounded-3xl border p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-center gap-3 sm:gap-4 transition-all",
                    isLight 
                        ? "bg-white/95 backdrop-blur-md border-amber-200/90" 
                        : "bg-slate-900/80 backdrop-blur-md border-white/10"
                )}>
                    {step.thoughtStarter && (
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setShowThoughtStarter(!showThoughtStarter); }}
                            className={cn(
                                "px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-xs sm:text-base md:text-lg transition-all border-b-[6px] active:border-b-0 active:translate-y-1.5 outline-none cursor-pointer flex items-center gap-2.5 shadow-md",
                                isLight 
                                    ? (showThoughtStarter ? "bg-amber-400 border-amber-600 text-slate-950 shadow-amber-300/40" : "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950")
                                    : (showThoughtStarter ? "bg-amber-400 border-amber-600 text-slate-950" : "bg-slate-900 border-slate-700 text-amber-300 hover:text-white hover:bg-slate-850")
                            )}
                        >
                            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
                            <span>{showThoughtStarter ? 'İpucunu Kapat' : '💡 Düşünme & Tartışma İpucu'}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleStartDiscussion}
                        className={cn(
                            "px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl font-black text-xs sm:text-base md:text-lg transition-all border-b-[6px] active:border-b-0 active:translate-y-1.5 outline-none cursor-pointer flex items-center gap-2.5 shadow-md",
                            hasTriggeredDiscussion
                                ? "bg-emerald-500 border-emerald-700 text-white shadow-emerald-200/50"
                                : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-orange-700 text-white shadow-orange-200/50"
                        )}
                    >
                        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span>{hasTriggeredDiscussion ? "✓ Fikirleri Dinliyoruz..." : "🎤 Söz Hakkı & Fikirleri Paylaş"}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📝 1. DEFTERİMİZE YAZALIM (ÖZET DEFTER NOTU) BİLEŞENİ (NotebookNotePlayer)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 📝 1. DEFTERİMİZE YAZALIM (ÖZET DEFTER NOTU & KAVRAMLAR) BİLEŞENİ (NotebookNotePlayer)
// ═══════════════════════════════════════════════════════════════════════════

export function NotebookNotePlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal',
    presentationTheme = 'clean-light',
    presentationFont = 'playfair'
}: {
    step: NotebookNoteStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';
    const conceptDefs = step.conceptDefinitions || [];
    const noteItems = step.notes || [];
    const hasConcepts = conceptDefs.length > 0;
    const hasNotes = noteItems.length > 0;

    // Varsayılan görünüm modu
    const [viewMode, setViewMode] = useState<'split' | 'concepts' | 'notes'>(
        hasConcepts && hasNotes ? 'split' : (hasConcepts ? 'concepts' : 'notes')
    );

    useEffect(() => {
        const cExist = (step.conceptDefinitions && step.conceptDefinitions.length > 0);
        const nExist = (step.notes && step.notes.length > 0);
        if (cExist && nExist) {
            setViewMode('split');
        } else if (cExist) {
            setViewMode('concepts');
        } else {
            setViewMode('notes');
        }
    }, [step]);

    // Dinamik Punto Boyutu (Akıllı Tahta Ayarı)
    const [baseFontSize, setBaseFontSize] = useState<number>(
        fontSizeScale === 'huge' || fontSizeScale === 'xl' ? 1.65 :
        fontSizeScale === 'lg' ? 1.5 :
        fontSizeScale === 'xs' ? 1.1 : 1.35
    );

    const increaseFontSize = () => setBaseFontSize(fs => Math.min(Number((fs + 0.15).toFixed(2)), 2.6));
    const decreaseFontSize = () => setBaseFontSize(fs => Math.max(Number((fs - 0.15).toFixed(2)), 0.85));

    // Canlı Sayaç
    const initialSeconds = (step.suggestedMinutes || 3) * 60;
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerDone, setTimerDone] = useState(false);
    const [checkedItems, setCheckedItems] = useState<{ [index: number]: boolean }>({});

    useEffect(() => {
        const s = (step.suggestedMinutes || 3) * 60;
        setTimeLeft(s);
        setIsTimerRunning(false);
        setTimerDone(false);
        setCheckedItems({});
    }, [step]);

    useEffect(() => {
        let interval: any = null;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsTimerRunning(false);
                        setTimerDone(true);
                        playSound('win');
                        import('canvas-confetti').then(m => {
                            m.default({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
                        }).catch(() => {});
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const toggleTimer = () => {
        playSound('pop');
        if (timeLeft === 0) {
            setTimeLeft(initialSeconds);
            setTimerDone(false);
        }
        setIsTimerRunning(prev => !prev);
    };

    const resetTimer = () => {
        playSound('pop');
        setIsTimerRunning(false);
        setTimeLeft(initialSeconds);
        setTimerDone(false);
    };

    const addExtraMinute = () => {
        playSound('pop');
        setTimeLeft(prev => prev + 60);
    };

    const toggleCheckItem = (index: number) => {
        playSound('pop');
        setCheckedItems(prev => ({ ...prev, [index]: !prev[index] }));
    };

    // Canlı, Doygun ve Yüksek Kontrastlı 6 Renk Teması (Yazılacaklar Modülü Birebir)
    const vividColorClasses = [
        'bg-indigo-900/60 border-2 border-indigo-400/80 text-white shadow-[0_4px_24px_rgba(99,102,241,0.35)]', 
        'bg-emerald-900/60 border-2 border-emerald-400/80 text-white shadow-[0_4px_24px_rgba(16,185,129,0.35)]', 
        'bg-rose-900/60 border-2 border-rose-400/80 text-white shadow-[0_4px_24px_rgba(244,63,94,0.35)]', 
        'bg-amber-900/60 border-2 border-amber-400/80 text-white shadow-[0_4px_24px_rgba(245,158,11,0.35)]', 
        'bg-cyan-900/60 border-2 border-cyan-400/80 text-white shadow-[0_4px_24px_rgba(6,182,212,0.35)]',
        'bg-fuchsia-900/60 border-2 border-fuchsia-400/80 text-white shadow-[0_4px_24px_rgba(217,70,239,0.35)]'
    ];

    if (!hasConcepts && !hasNotes) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <div className="p-8 rounded-3xl bg-slate-900/95 border-2 border-white/20 text-slate-200 max-w-lg shadow-2xl backdrop-blur-xl">
                    <Pencil className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
                    <h3 className="text-2xl font-black text-white mb-2">{step.title || 'Defterimize Yazalım'}</h3>
                    <p className="text-slate-300 font-medium">Bu adım için henüz kayıtlı kavram veya defter notu bulunmuyor.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("w-full h-full flex flex-col justify-start p-2 md:p-3.5 select-none overflow-y-auto", isSketchnote ? "bg-transparent text-[#1e293b]" : "bg-slate-950 text-white")}>
            
            {/* ══ ULTRA-KOMPAKT ÜST KONTROL ÇUBUĞU (SIFIR BOŞLUK) ══ */}
            <div className={cn(
                "flex-shrink-0 w-full flex flex-wrap items-center justify-between gap-2 mb-2.5 p-2 md:p-2.5 rounded-2xl shadow-xl",
                isSketchnote 
                    ? "bg-white border-[2.5px] border-[#1e293b] shadow-[3px_3px_0_#1e293b] text-[#1e293b]" 
                    : "bg-slate-900/95 border border-white/20 backdrop-blur-xl text-white"
            )}>
                
                {/* BAŞLIK */}
                <div className="flex items-center justify-center gap-2.5 text-center">
                    <div className={cn(
                        "w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center font-black shadow-md flex-shrink-0",
                        isSketchnote ? "bg-[#fefce8] border-2 border-[#eab308] text-[#854d0e]" : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    )}>
                        <Pencil className="w-4 h-4" />
                    </div>
                    {isSketchnote ? (
                        <div className="flex items-center gap-2">
                            <h2 className="font-['Caveat',cursive] text-2xl sm:text-3xl font-bold bg-[#e0f2fe] text-[#0f172a] border-[2px] border-[#0284c7] px-3.5 py-0.5 rounded-xl shadow-[2px_2px_0_#0284c7] leading-tight">
                                {step.title || '✏️ Defterimize Yazalım'}
                            </h2>
                            {step.noteTitle && (
                                <span className="font-['Patrick_Hand',cursive] text-xs font-bold text-[#854d0e] bg-[#fefce8] border border-[#eab308] px-2.5 py-0.5 rounded-full shadow-xs hidden sm:inline">
                                    {step.noteTitle}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="text-center">
                            <h2 className="font-black text-white text-sm sm:text-base md:text-lg tracking-tight leading-tight flex items-center justify-center gap-2 text-center">
                                <span>{step.title || '✏️ Defterimize Yazalım'}</span>
                            </h2>
                            {step.noteTitle && (
                                <p className="text-[11px] text-amber-300 font-bold hidden sm:block leading-none mt-0.5 text-center">
                                    {step.noteTitle}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ORTA: GÖRÜNÜM MODLARI (SEKMELER) */}
                <div className="flex items-center p-0.5 bg-slate-950/90 border border-white/15 rounded-xl shadow-inner">
                    {hasConcepts && hasNotes && (
                        <button
                            onClick={() => { playSound('pop'); setViewMode('split'); }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5",
                                viewMode === 'split'
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <span>🔲 Yan Yana (Tümü)</span>
                        </button>
                    )}
                    {hasConcepts && (
                        <button
                            onClick={() => { playSound('pop'); setViewMode('concepts'); }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5",
                                viewMode === 'concepts'
                                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-900"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <span>📖 Kavramlar</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{conceptDefs.length}</span>
                        </button>
                    )}
                    {hasNotes && (
                        <button
                            onClick={() => { playSound('pop'); setViewMode('notes'); }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5",
                                viewMode === 'notes'
                                    ? "bg-amber-600 text-white shadow-md shadow-amber-900"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <span>✏️ Defter Notları</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{noteItems.length}</span>
                        </button>
                    )}
                </div>

                {/* SAĞ: PUNTOLAR VE CANLI SAYAÇ */}
                <div className="flex items-center gap-2">
                    {/* Punto Ayarı */}
                    <div className="flex items-center bg-slate-950/90 rounded-xl p-0.5 border border-white/15">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={decreaseFontSize} 
                            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                            title="Yazı Boyutunu Küçült"
                        >
                            <Minus className="h-3.5 w-3.5"/>
                        </Button>
                        <span className="text-[10px] font-black text-slate-300 w-8 text-center uppercase">Boyut</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={increaseFontSize} 
                            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                            title="Yazı Boyutunu Büyüt"
                        >
                            <Plus className="h-3.5 w-3.5"/>
                        </Button>
                    </div>

                    {/* Sayaç */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-white/15 shadow-sm">
                        <Clock className={cn("w-3.5 h-3.5", isTimerRunning ? "text-emerald-400 animate-spin" : "text-slate-400")} />
                        <span className="font-mono font-black text-xs md:text-sm text-white">
                            {formatTime(timeLeft)}
                        </span>
                        <Button
                            size="sm"
                            onClick={toggleTimer}
                            className={cn(
                                "h-6 px-2 text-[11px] font-black rounded-lg transition-all",
                                isTimerRunning 
                                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950" 
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            )}
                        >
                            {isTimerRunning ? <Pause className="w-3 h-3 mr-0.5" /> : <Play className="w-3 h-3 mr-0.5" />}
                            {isTimerRunning ? "Durdur" : (timerDone ? "Yeniden" : "Başlat")}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={addExtraMinute}
                            title="+1 Dakika Ekle"
                            className="h-6 px-1.5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                        >
                            +1dk
                        </Button>
                        {timeLeft !== initialSeconds && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={resetTimer}
                                className="h-6 px-1 text-slate-400 hover:text-slate-200"
                            >
                                <RotateCcw className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ 1. YAN YANA GÖRÜNÜM (SPLIT VIEW - EKRANI 100% DOLDURAN) ══ */}
            {viewMode === 'split' && hasConcepts && hasNotes && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full flex-grow items-start">
                    
                    {/* SOL PANEL: KAVRAM KARTLARI (6 SÜTUN) */}
                    <div className="lg:col-span-6 flex flex-col space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                                📖 Anahtar Kavramlar ({conceptDefs.length})
                            </span>
                        </div>
                        <div className={cn("grid gap-2.5 w-full", isTeacher ? "grid-cols-2 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
                            {conceptDefs.map((item, index) => (
                                <div
                                    key={`split-c-${index}`}
                                    className={cn(
                                        "relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between",
                                        vividColorClasses[index % vividColorClasses.length]
                                    )}
                                >
                                    {/* Numara Filigranı */}
                                    <div className="absolute top-0 right-0 bg-black/40 text-white/40 font-black text-5xl p-1 leading-none pointer-events-none select-none rounded-bl-xl opacity-35">
                                        {index + 1}
                                    </div>
                                    <div className="p-3 md:p-4 flex flex-col h-full z-10 relative">
                                        <h3 
                                            className="font-black text-white mb-1.5 border-b border-white/20 pb-1 uppercase tracking-tight leading-tight drop-shadow-md"
                                            style={{ fontSize: `${baseFontSize * 1.15}rem` }}
                                        >
                                            {item.concept}
                                        </h3>
                                        <p 
                                            className="font-bold text-white leading-snug drop-shadow"
                                            style={{ fontSize: `${baseFontSize * 0.95}rem` }}
                                        >
                                            {item.definition}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SAĞ PANEL: DEFTER NOTLARI (6 SÜTUN) */}
                    <div className="lg:col-span-6 flex flex-col space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className={cn(
                                "text-xs font-black uppercase tracking-widest flex items-center gap-1.5",
                                isSketchnote ? "text-amber-800 font-['Patrick_Hand',cursive] text-sm" : "text-amber-400"
                            )}>
                                <span className={cn("h-2 w-2 rounded-full", isSketchnote ? "bg-amber-500" : "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]")} />
                                ✏️ Deftere Yazılacaklar ({noteItems.length})
                            </span>
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                            {noteItems.map((note, idx) => {
                                const isChecked = checkedItems[idx] || false;
                                const skItem = SKETCHNOTE_TEXT_PALETTE[idx % SKETCHNOTE_TEXT_PALETTE.length];
                                return (
                                    <div
                                        key={`split-n-${idx}`}
                                        onClick={() => toggleCheckItem(idx)}
                                        className={cn(
                                            "flex items-start gap-3 p-3 md:p-3.5 rounded-2xl border-2 transition-all cursor-pointer",
                                            isSketchnote
                                                ? cn(
                                                    "bg-white border-[2.5px]",
                                                    skItem.border,
                                                    skItem.shadow,
                                                    isChecked ? "opacity-60 line-through bg-slate-50" : ""
                                                )
                                                : isChecked 
                                                    ? "bg-emerald-950/80 border-emerald-400 text-emerald-100 shadow-xl backdrop-blur-md" 
                                                    : "bg-slate-900/95 border-amber-500/60 hover:bg-slate-800 text-white shadow-xl backdrop-blur-md"
                                        )}
                                    >
                                        <div className={cn(
                                            "flex-shrink-0 flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl font-black text-lg md:text-xl shadow-md border mt-0.5",
                                            isSketchnote
                                                ? cn("rounded-full border-2 border-white/70 text-white shadow-[2px_2px_0_rgba(0,0,0,0.2)]", skItem.numBg)
                                                : isChecked
                                                    ? "bg-emerald-500 border-emerald-300 text-white"
                                                    : "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300/40 text-white"
                                        )}>
                                            {isChecked ? <Check className="w-5 h-5" /> : idx + 1}
                                        </div>
                                        <p 
                                            className={cn(
                                                "font-bold leading-snug flex-1 select-text pt-0.5",
                                                isSketchnote 
                                                    ? "font-['Patrick_Hand',cursive] text-slate-800 [&_mark]:bg-[#fef08a] [&_strong]:bg-[#fef08a]" 
                                                    : (isChecked ? "line-through opacity-75 text-emerald-200 drop-shadow" : "text-white drop-shadow")
                                            )}
                                            style={{ fontSize: `${baseFontSize}rem` }}
                                        >
                                            {note}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}

            {/* ══ 2. TAM EKRAN KAVRAMLAR IZGARASI (AUTO-FIT GRID) ══ */}
            {viewMode === 'concepts' && hasConcepts && (
                <div className="w-full flex flex-col space-y-2 flex-grow">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-base md:text-xl font-black text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                            <span>📖 {step.noteTitle || 'Anahtar Kavramlar'}</span>
                        </h3>
                        <span className="text-xs text-slate-300 font-bold">Toplam {conceptDefs.length} Kavram</span>
                    </div>
                    <div className={cn(
                        "grid gap-2.5 md:gap-3.5 w-full",
                        conceptDefs.length <= 1 ? "grid-cols-1 max-w-xl mx-auto" :
                        conceptDefs.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto" :
                        conceptDefs.length === 3 ? "grid-cols-1 sm:grid-cols-3" :
                        conceptDefs.length === 4 ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-4" :
                        conceptDefs.length === 5 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5" :
                        conceptDefs.length === 6 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6" :
                        conceptDefs.length === 7 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7" :
                        conceptDefs.length === 8 ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-4 xl:grid-cols-8" :
                        "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
                    )}>
                        {conceptDefs.map((item, index) => (
                            <div
                                key={`full-c-${index}`}
                                className={cn(
                                    "relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between",
                                    vividColorClasses[index % vividColorClasses.length]
                                )}
                            >
                                <div className="absolute top-0 right-0 bg-black/40 text-white/40 font-black text-6xl p-1.5 leading-none pointer-events-none select-none rounded-bl-2xl opacity-35">
                                    {index + 1}
                                </div>
                                <div className="p-3.5 md:p-4 flex flex-col h-full z-10 relative">
                                    <h3 
                                        className="font-black text-white mb-2 border-b border-white/20 pb-1.5 uppercase tracking-tight leading-tight drop-shadow-md"
                                        style={{ fontSize: `${baseFontSize * 1.2}rem` }}
                                    >
                                        {item.concept}
                                    </h3>
                                    <div className="flex-grow">
                                        <p 
                                            className="font-bold text-white leading-snug drop-shadow"
                                            style={{ fontSize: `${baseFontSize}rem` }}
                                        >
                                            {item.definition}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ══ 3. TAM EKRAN DEFTER NOTLARI IZGARASI ══ */}
            {viewMode === 'notes' && hasNotes && (
                <div className="w-full flex flex-col space-y-2 flex-grow">
                    <div className="flex items-center justify-between px-1">
                        <h3 className={cn(
                            "text-base md:text-xl font-black uppercase tracking-wide flex items-center gap-2",
                            isSketchnote ? "font-['Caveat',cursive] text-2xl text-[#0f172a]" : "text-amber-400"
                        )}>
                            <span>✏️ {step.noteTitle || 'Önemli Notlar'}</span>
                        </h3>
                        <span className={cn("text-xs font-bold", isSketchnote ? "text-slate-600 font-['Patrick_Hand',cursive]" : "text-slate-300")}>
                            Toplam {noteItems.length} Madde
                        </span>
                    </div>
                    <div className={cn("grid gap-2.5 md:gap-3.5 w-full", isTeacher ? "grid-cols-2 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}>
                        {noteItems.map((note, idx) => {
                            const isChecked = checkedItems[idx] || false;
                            const skItem = SKETCHNOTE_TEXT_PALETTE[idx % SKETCHNOTE_TEXT_PALETTE.length];
                            return (
                                <div
                                    key={`full-n-${idx}`}
                                    onClick={() => toggleCheckItem(idx)}
                                    className={cn(
                                        "flex items-start gap-3.5 p-4 md:p-5 rounded-2xl border-2 transition-all cursor-pointer",
                                        isSketchnote
                                            ? cn(
                                                "bg-white border-[2.5px]",
                                                skItem.border,
                                                skItem.shadow,
                                                isChecked ? "opacity-60 line-through bg-slate-50" : ""
                                            )
                                            : isChecked 
                                                ? "bg-emerald-950/80 border-emerald-400 text-emerald-100 shadow-xl backdrop-blur-md" 
                                                : "bg-slate-900/95 border-amber-500/60 hover:bg-slate-800 text-white shadow-xl backdrop-blur-md"
                                    )}
                                >
                                    <div className={cn(
                                        "flex-shrink-0 flex items-center justify-center w-11 h-11 md:w-13 md:h-13 rounded-2xl font-black text-xl md:text-2xl shadow-md border mt-0.5",
                                        isSketchnote
                                            ? cn("rounded-full border-2 border-white/70 text-white shadow-[2px_2px_0_rgba(0,0,0,0.2)]", skItem.numBg)
                                            : isChecked
                                                ? "bg-emerald-500 border-emerald-300 text-white"
                                                : "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300/40 text-white"
                                    )}>
                                        {isChecked ? <Check className="w-6 h-6" /> : idx + 1}
                                    </div>
                                    <p 
                                        className={cn(
                                            "font-bold leading-snug flex-1 select-text pt-1",
                                            isSketchnote
                                                ? "font-['Patrick_Hand',cursive] text-slate-800 [&_mark]:bg-[#fef08a] [&_strong]:bg-[#fef08a]"
                                                : (isChecked ? "line-through opacity-75 text-emerald-200 drop-shadow" : "text-white drop-shadow")
                                        )}
                                        style={{ fontSize: `${baseFontSize}rem` }}
                                    >
                                        {note}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🪜 2. ADIM ADIM YOL HARİTASI & SÜREÇ BİLEŞENİ (ProcessFlowPlayer)
// ═══════════════════════════════════════════════════════════════════════════

export function ProcessFlowPlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal',
    presentationTheme,
    presentationFont
}: {
    step: ProcessFlowStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';
    const [activeStepIndex, setActiveStepIndex] = useState(0);

    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'xs' ? 'xs' : 'sm';

    const getDescFontSize = () => {
        switch (cardScale) {
            case 'xs': return isTeacher ? "text-base md:text-lg" : "text-xs md:text-sm";
            case 'sm': return isTeacher ? "text-lg md:text-xl" : "text-sm md:text-base";
            case 'md': return isTeacher ? "text-xl md:text-2xl" : "text-base md:text-lg";
            case 'lg': return isTeacher ? "text-2xl md:text-3xl" : "text-lg md:text-xl";
            case 'xl': return isTeacher ? "text-3xl md:text-4xl" : "text-xl md:text-2xl";
            default: return isTeacher ? "text-xl md:text-2xl" : "text-base md:text-lg";
        }
    };

    const handleSelectStep = (idx: number) => {
        playSound('pop');
        setActiveStepIndex(idx);
    };

    const handleNextStep = () => {
        playSound('pop');
        setActiveStepIndex(prev => Math.min((step.steps || []).length - 1, prev + 1));
    };

    const handlePrevStep = () => {
        playSound('pop');
        setActiveStepIndex(prev => Math.max(0, prev - 1));
    };

    const stepsList = step.steps || [];

    const STEP_GRADIENTS = [
        { active: 'from-blue-600 to-indigo-600 border-blue-400 text-white shadow-blue-500/40', badge: 'bg-blue-500/20 text-blue-300 border-blue-400/40' },
        { active: 'from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
        { active: 'from-amber-600 to-orange-600 border-amber-400 text-white shadow-amber-500/40', badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40' },
        { active: 'from-purple-600 to-pink-600 border-purple-400 text-white shadow-purple-500/40', badge: 'bg-purple-500/20 text-purple-300 border-purple-400/40' },
        { active: 'from-rose-600 to-red-600 border-rose-400 text-white shadow-rose-500/40', badge: 'bg-rose-500/20 text-rose-300 border-rose-400/40' },
    ];

    return (
        <div className={cn(
            "w-full h-full flex flex-col items-center justify-start p-3 md:p-6 select-none max-w-5xl mx-auto overflow-y-auto",
            isFullscreen ? "py-6" : "py-3"
        )}>
            {/* ══ BAŞLIK ROZETİ ══ */}
            {isSketchnote ? (
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#fefce8] border-[2.5px] border-[#1e293b] text-[#1e293b] text-base md:text-lg font-['Caveat',cursive] font-bold shadow-[3px_3px_0_#1e293b] mb-4">
                    <Compass className="w-5 h-5 text-amber-600 animate-spin" />
                    <span>🪜 {step.title || 'Adım Adım Yol Haritası & Süreç'}</span>
                </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 border-2 border-blue-400/40 text-blue-700 dark:text-blue-300 text-xs md:text-sm font-black uppercase tracking-wider mb-4 md:mb-6 shadow-sm backdrop-blur-xl"
                >
                    <Compass className="w-4 h-4 text-blue-500 animate-spin" />
                    <span>{step.title || '🪜 Adım Adım Yol Haritası & Süreç'}</span>
                    <Compass className="w-4 h-4 text-blue-500 animate-spin" />
                </motion.div>
            )}

            {/* ══ STEPPER ÜST SEÇİCİ (Yatay Adım Çizgisi) ══ */}
            <div className="w-full flex items-center justify-between gap-2 overflow-x-auto pb-3 mb-4">
                {stepsList.map((item, idx) => {
                    const isCurrent = idx === activeStepIndex;
                    const isPassed = idx < activeStepIndex;
                    const style = STEP_GRADIENTS[idx % STEP_GRADIENTS.length];
                    return (
                        <div key={idx} className="flex-1 min-w-[120px] flex flex-col items-center">
                            <button
                                onClick={() => handleSelectStep(idx)}
                                className={cn(
                                    "w-full p-2.5 sm:p-3.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer",
                                    isSketchnote
                                        ? (isCurrent
                                            ? "bg-[#e0f2fe] border-[2.5px] border-[#0284c7] text-[#0369a1] shadow-[3px_3px_0_#0284c7] scale-105 font-['Patrick_Hand',cursive] font-bold"
                                            : isPassed
                                                ? "bg-[#f0fdf4] border-[2px] border-[#16a34a] text-[#15803d] font-['Patrick_Hand',cursive]"
                                                : "bg-white border-[2px] border-slate-300 text-slate-600 hover:border-slate-800 font-['Patrick_Hand',cursive]")
                                        : (isCurrent
                                            ? `bg-gradient-to-r ${style.active} scale-105 shadow-lg`
                                            : isPassed
                                                ? "bg-slate-800/80 border-emerald-500/40 text-emerald-300 hover:bg-slate-800"
                                                : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-400")
                                )}
                            >
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center font-black text-xs",
                                    isSketchnote ? "bg-black/10 text-slate-900" : "bg-black/20"
                                )}>
                                    {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                </span>
                                <span className="font-bold text-xs truncate">
                                    {item.title}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ══ AKTİF ADIM DETAY KARTI ══ */}
            {stepsList[activeStepIndex] && (
                <motion.div
                    key={activeStepIndex}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                        "relative w-full rounded-3xl p-6 sm:p-8 md:p-10 text-left overflow-hidden min-h-[220px] flex flex-col justify-between",
                        isSketchnote
                            ? "border-[3px] border-[#1e293b] bg-white shadow-[6px_6px_0_#1e293b]"
                            : "border-2 border-blue-200/90 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl"
                    )}
                >
                    {!isSketchnote && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    )}
                    
                    <div>
                        {isSketchnote ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#fefce8] border-2 border-[#ca8a04] text-[#854d0e] font-['Patrick_Hand',cursive] text-sm font-bold shadow-[2px_2px_0_#ca8a04] mb-3">
                                <span>📍 Adım {activeStepIndex + 1} / {stepsList.length}</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-300 text-xs font-black uppercase tracking-wider mb-4">
                                <span>ADIM {activeStepIndex + 1} / {stepsList.length}</span>
                            </div>
                        )}

                        <h3 className={cn(
                            "text-2xl md:text-3xl font-black mb-3",
                            isSketchnote ? "font-['Caveat',cursive] text-[#0f172a] text-3xl md:text-4xl" : "text-slate-900 dark:text-white"
                        )}>
                            {stepsList[activeStepIndex].title}
                        </h3>

                        <p className={cn(
                            "font-bold leading-relaxed",
                            isSketchnote 
                                ? "font-['Patrick_Hand',cursive] text-slate-800 text-xl md:text-2xl [&_mark]:bg-[#fef08a] [&_mark]:px-1.5 [&_mark]:py-0.5 [&_mark]:rounded-sm [&_mark]:font-black" 
                                : cn("text-slate-700 dark:text-slate-200", getDescFontSize())
                        )}>
                            {stepsList[activeStepIndex].description}
                        </p>
                    </div>

                    {/* Gezinme Butonları */}
                    {isSketchnote ? (
                        <div className="flex items-center justify-between border-t-2 border-slate-200 pt-4 mt-6">
                            <Button
                                variant="outline"
                                onClick={handlePrevStep}
                                disabled={activeStepIndex === 0}
                                className="rounded-xl font-['Patrick_Hand',cursive] font-bold text-base border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] bg-white hover:bg-slate-100 text-[#1e293b]"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Önceki Adım
                            </Button>
                            <Button
                                onClick={handleNextStep}
                                disabled={activeStepIndex === stepsList.length - 1}
                                className="rounded-xl font-['Patrick_Hand',cursive] font-bold text-base border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1]"
                            >
                                Sıradaki Adım <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4 mt-6">
                            <Button
                                variant="outline"
                                onClick={handlePrevStep}
                                disabled={activeStepIndex === 0}
                                className="rounded-xl font-bold"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Önceki Adım
                            </Button>
                            <Button
                                onClick={handleNextStep}
                                disabled={activeStepIndex === stepsList.length - 1}
                                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                            >
                                Sıradaki Adım <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔲 3. 4 BOYUTTA KONU MATRİSİ BİLEŞENİ (ConceptMatrixPlayer)
// ═══════════════════════════════════════════════════════════════════════════

export function ConceptMatrixPlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal',
    presentationTheme,
    presentationFont
}: {
    step: ConceptMatrixStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'xs' ? 'xs' : 'sm';

    const getContentFontSize = () => {
        switch (cardScale) {
            case 'xs': return isTeacher ? "text-sm md:text-base" : "text-xs md:text-sm";
            case 'sm': return isTeacher ? "text-base md:text-lg" : "text-sm md:text-base";
            case 'md': return isTeacher ? "text-lg md:text-xl" : "text-base md:text-lg";
            case 'lg': return isTeacher ? "text-xl md:text-2xl" : "text-lg md:text-xl";
            case 'xl': return isTeacher ? "text-2xl md:text-3xl" : "text-xl md:text-2xl";
            default: return isTeacher ? "text-lg md:text-xl" : "text-base md:text-lg";
        }
    };

    const SKETCHNOTE_QUADRANTS = [
        {
            border: 'border-[#ca8a04]',
            bg: 'bg-[#fefce8]',
            badge: 'bg-[#fef08a] text-[#854d0e] border border-[#ca8a04]',
            text: 'text-slate-800 font-[\'Patrick_Hand\',cursive] [&_mark]:bg-[#fef08a] text-lg sm:text-xl',
            shadow: 'shadow-[4px_4px_0_#ca8a04]'
        },
        {
            border: 'border-[#0284c7]',
            bg: 'bg-[#e0f2fe]',
            badge: 'bg-[#bae6fd] text-[#0369a1] border border-[#0284c7]',
            text: 'text-slate-800 font-[\'Patrick_Hand\',cursive] [&_mark]:bg-[#fef08a] text-lg sm:text-xl',
            shadow: 'shadow-[4px_4px_0_#0284c7]'
        },
        {
            border: 'border-[#db2777]',
            bg: 'bg-[#fdf2f8]',
            badge: 'bg-[#fbcfe8] text-[#9d174d] border border-[#db2777]',
            text: 'text-slate-800 font-[\'Patrick_Hand\',cursive] [&_mark]:bg-[#fef08a] text-lg sm:text-xl',
            shadow: 'shadow-[4px_4px_0_#db2777]'
        },
        {
            border: 'border-[#16a34a]',
            bg: 'bg-[#f0fdf4]',
            badge: 'bg-[#bbf7d0] text-[#15803d] border border-[#16a34a]',
            text: 'text-slate-800 font-[\'Patrick_Hand\',cursive] [&_mark]:bg-[#fef08a] text-lg sm:text-xl',
            shadow: 'shadow-[4px_4px_0_#16a34a]'
        }
    ];

    const QUADRANT_STYLES = [
        {
            border: 'border-sky-400/50 hover:border-sky-400',
            bg: 'bg-sky-500/10 hover:bg-sky-500/15',
            badge: 'bg-sky-500 text-white',
            text: 'text-sky-950 dark:text-sky-100',
            titleText: 'text-sky-700 dark:text-sky-300',
            shadow: ''
        },
        {
            border: 'border-emerald-400/50 hover:border-emerald-400',
            bg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
            badge: 'bg-emerald-500 text-white',
            text: 'text-emerald-950 dark:text-emerald-100',
            titleText: 'text-emerald-700 dark:text-emerald-300',
            shadow: ''
        },
        {
            border: 'border-amber-400/50 hover:border-amber-400',
            bg: 'bg-amber-500/10 hover:bg-amber-500/15',
            badge: 'bg-amber-500 text-slate-950',
            text: 'text-amber-950 dark:text-amber-100',
            titleText: 'text-amber-700 dark:text-amber-300',
            shadow: ''
        },
        {
            border: 'border-purple-400/50 hover:border-purple-400',
            bg: 'bg-purple-500/10 hover:bg-purple-500/15',
            badge: 'bg-purple-500 text-white',
            text: 'text-purple-950 dark:text-purple-100',
            titleText: 'text-purple-700 dark:text-purple-300',
            shadow: ''
        }
    ];

    const quadrants = step.quadrants || [];

    return (
        <div className={cn(
            "w-full h-full flex flex-col items-center justify-start p-3 md:p-6 select-none max-w-5xl mx-auto overflow-y-auto",
            isFullscreen ? "py-6" : "py-3"
        )}>
            {/* ══ BAŞLIK ══ */}
            {isSketchnote ? (
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#fefce8] border-[2.5px] border-[#1e293b] text-[#1e293b] text-base md:text-lg font-['Caveat',cursive] font-bold shadow-[3px_3px_0_#1e293b] mb-4 md:mb-6">
                    <Layers className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span>🔲 {step.title || '4 Boyutta Konu Analizi'}</span>
                    {step.topicName && <span className="opacity-80">({step.topicName})</span>}
                </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 via-sky-500/20 to-emerald-500/20 border-2 border-purple-400/40 text-purple-700 dark:text-purple-300 text-xs md:text-sm font-black uppercase tracking-wider mb-4 md:mb-6 shadow-sm backdrop-blur-xl"
                >
                    <Layers className="w-4 h-4 text-purple-500 animate-pulse" />
                    <span>{step.title || '🔲 4 Boyutta Konu Analizi'}</span>
                    {step.topicName && <span className="opacity-70">({step.topicName})</span>}
                    <Layers className="w-4 h-4 text-purple-500 animate-pulse" />
                </motion.div>
            )}

            {/* ══ 2x2 MATRİS IZGARASI ══ */}
            <div className={cn("grid gap-4 md:gap-5 w-full", isTeacher ? "grid-cols-2 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2")}>
                {quadrants.map((quad, idx) => {
                    const style = isSketchnote ? SKETCHNOTE_QUADRANTS[idx % SKETCHNOTE_QUADRANTS.length] : QUADRANT_STYLES[idx % QUADRANT_STYLES.length];
                    const isFocused = focusedIndex === idx;
                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.08 }}
                            onClick={() => {
                                playSound('pop');
                                setFocusedIndex(focusedIndex === idx ? null : idx);
                            }}
                            className={cn(
                                "rounded-3xl p-5 md:p-6 transition-all cursor-pointer relative flex flex-col justify-between min-h-[160px] md:min-h-[180px]",
                                isSketchnote ? "border-[2.5px]" : "border-2 backdrop-blur-xl",
                                style.border,
                                style.bg,
                                style.shadow,
                                isFocused && (isSketchnote ? "ring-4 ring-[#1e293b] scale-[1.02]" : "ring-4 ring-indigo-400/60 scale-[1.02]")
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className={cn(
                                        "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm",
                                        isSketchnote ? "font-['Patrick_Hand',cursive] font-bold text-sm rounded-full" : "",
                                        style.badge
                                    )}>
                                        {quad.label}
                                    </span>
                                    <span className={cn("text-xs font-bold", isSketchnote ? "text-slate-600 font-['Patrick_Hand',cursive]" : "text-slate-400")}>
                                        {isFocused ? "Odaktan Çık ✕" : "Büyüt 🔍"}
                                    </span>
                                </div>
                                <p className={cn(
                                    "font-bold leading-relaxed tracking-wide",
                                    style.text,
                                    !isSketchnote && getContentFontSize()
                                )}>
                                    {quad.content}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 4. KATEGORİ & SINIFLANDIRMA TABLOSU BİLEŞENİ (CategoryTablePlayer)
// ═══════════════════════════════════════════════════════════════════════════

export function CategoryTablePlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal',
    presentationTheme,
    presentationFont
}: {
    step: CategoryTableStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';
    const categories = step.categories || [];
    const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
    
    // Punto Ayarı
    const [baseFontSize, setBaseFontSize] = useState<number>(
        fontSizeScale === 'huge' || fontSizeScale === 'xl' ? 1.4 :
        fontSizeScale === 'lg' ? 1.25 :
        fontSizeScale === 'xs' ? 0.95 : 1.15
    );

    const increaseFontSize = () => setBaseFontSize(fs => Math.min(Number((fs + 0.15).toFixed(2)), 2.5));
    const decreaseFontSize = () => setBaseFontSize(fs => Math.max(Number((fs - 0.15).toFixed(2)), 0.85));

    const toggleItem = (catIdx: number, itemIdx: number) => {
        playSound('pop');
        const key = `${catIdx}-${itemIdx}`;
        setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const SKETCHNOTE_CATEGORY_MAP: Record<string, {
        card: string;
        badge: string;
        item: string;
        itemChecked: string;
        num: string;
        numChecked: string;
    }> = {
        emerald: {
            card: 'bg-[#f0fdf4] border-[2.5px] border-[#16a34a] shadow-[4px_4px_0_#16a34a] text-slate-900',
            badge: 'bg-[#dcfce7] text-[#15803d] border border-[#16a34a]',
            item: 'bg-white border-2 border-[#16a34a] hover:bg-[#dcfce7]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#bbf7d0]/40 border-2 border-[#15803d] text-slate-500 line-through',
            num: 'bg-[#16a34a] text-white font-bold',
            numChecked: 'bg-[#15803d] text-white'
        },
        amber: {
            card: 'bg-[#fefce8] border-[2.5px] border-[#ca8a04] shadow-[4px_4px_0_#ca8a04] text-slate-900',
            badge: 'bg-[#fef08a] text-[#854d0e] border border-[#ca8a04]',
            item: 'bg-white border-2 border-[#ca8a04] hover:bg-[#fef08a]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#fef08a]/40 border-2 border-[#854d0e] text-slate-500 line-through',
            num: 'bg-[#ca8a04] text-white font-bold',
            numChecked: 'bg-[#854d0e] text-white'
        },
        indigo: {
            card: 'bg-[#eff6ff] border-[2.5px] border-[#2563eb] shadow-[4px_4px_0_#2563eb] text-slate-900',
            badge: 'bg-[#dbeafe] text-[#1d4ed8] border border-[#2563eb]',
            item: 'bg-white border-2 border-[#2563eb] hover:bg-[#dbeafe]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#bfdbfe]/40 border-2 border-[#1d4ed8] text-slate-500 line-through',
            num: 'bg-[#2563eb] text-white font-bold',
            numChecked: 'bg-[#1d4ed8] text-white'
        },
        rose: {
            card: 'bg-[#fff1f2] border-[2.5px] border-[#e11d48] shadow-[4px_4px_0_#e11d48] text-slate-900',
            badge: 'bg-[#ffe4e6] text-[#be123c] border border-[#e11d48]',
            item: 'bg-white border-2 border-[#e11d48] hover:bg-[#ffe4e6]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#fecdd3]/40 border-2 border-[#be123c] text-slate-500 line-through',
            num: 'bg-[#e11d48] text-white font-bold',
            numChecked: 'bg-[#be123c] text-white'
        },
        cyan: {
            card: 'bg-[#ecfeff] border-[2.5px] border-[#0891b2] shadow-[4px_4px_0_#0891b2] text-slate-900',
            badge: 'bg-[#cffafe] text-[#0e7490] border border-[#0891b2]',
            item: 'bg-white border-2 border-[#0891b2] hover:bg-[#cffafe]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#a5f3fc]/40 border-2 border-[#0e7490] text-slate-500 line-through',
            num: 'bg-[#0891b2] text-white font-bold',
            numChecked: 'bg-[#0e7490] text-white'
        },
        fuchsia: {
            card: 'bg-[#fdf4ff] border-[2.5px] border-[#c026d3] shadow-[4px_4px_0_#c026d3] text-slate-900',
            badge: 'bg-[#fae8ff] text-[#a21caf] border border-[#c026d3]',
            item: 'bg-white border-2 border-[#c026d3] hover:bg-[#fae8ff]/30 text-slate-800 shadow-sm',
            itemChecked: 'bg-[#f5d0fe]/40 border-2 border-[#a21caf] text-slate-500 line-through',
            num: 'bg-[#c026d3] text-white font-bold',
            numChecked: 'bg-[#a21caf] text-white'
        },
    };

    // Canlı, Doygun ve Yüksek Kontrastlı Kategori Kart Stilleri
    const CATEGORY_COLOR_MAP: Record<string, {
        card: string;
        header: string;
        badge: string;
        item: string;
        itemChecked: string;
        num: string;
        numChecked: string;
    }> = {
        emerald: {
            card: 'bg-emerald-950/70 border-2 border-emerald-400 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)]',
            header: 'from-emerald-500 to-teal-600 text-white',
            badge: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50',
            item: 'bg-slate-900/90 border-emerald-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-emerald-900/60 border-emerald-300 text-emerald-100 shadow-md',
            num: 'bg-emerald-500 text-slate-950 font-black',
            numChecked: 'bg-emerald-400 text-slate-950'
        },
        amber: {
            card: 'bg-amber-950/70 border-2 border-amber-400 text-white shadow-[0_8px_30px_rgba(245,158,11,0.3)]',
            header: 'from-amber-500 to-orange-600 text-white',
            badge: 'bg-amber-500/30 text-amber-200 border-amber-400/50',
            item: 'bg-slate-900/90 border-amber-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-amber-900/60 border-amber-300 text-amber-100 shadow-md',
            num: 'bg-amber-500 text-slate-950 font-black',
            numChecked: 'bg-amber-400 text-slate-950'
        },
        indigo: {
            card: 'bg-indigo-950/70 border-2 border-indigo-400 text-white shadow-[0_8px_30px_rgba(99,102,241,0.3)]',
            header: 'from-indigo-500 to-blue-600 text-white',
            badge: 'bg-indigo-500/30 text-indigo-200 border-indigo-400/50',
            item: 'bg-slate-900/90 border-indigo-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-indigo-900/60 border-indigo-300 text-indigo-100 shadow-md',
            num: 'bg-indigo-500 text-white font-black',
            numChecked: 'bg-indigo-400 text-slate-950'
        },
        rose: {
            card: 'bg-rose-950/70 border-2 border-rose-400 text-white shadow-[0_8px_30px_rgba(244,63,94,0.3)]',
            header: 'from-rose-500 to-red-600 text-white',
            badge: 'bg-rose-500/30 text-rose-200 border-rose-400/50',
            item: 'bg-slate-900/90 border-rose-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-rose-900/60 border-rose-300 text-rose-100 shadow-md',
            num: 'bg-rose-500 text-white font-black',
            numChecked: 'bg-rose-400 text-slate-950'
        },
        cyan: {
            card: 'bg-cyan-950/70 border-2 border-cyan-400 text-white shadow-[0_8px_30px_rgba(6,182,212,0.3)]',
            header: 'from-cyan-500 to-teal-600 text-white',
            badge: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50',
            item: 'bg-slate-900/90 border-cyan-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-cyan-900/60 border-cyan-300 text-cyan-100 shadow-md',
            num: 'bg-cyan-500 text-slate-950 font-black',
            numChecked: 'bg-cyan-400 text-slate-950'
        },
        fuchsia: {
            card: 'bg-fuchsia-950/70 border-2 border-fuchsia-400 text-white shadow-[0_8px_30px_rgba(217,70,239,0.3)]',
            header: 'from-fuchsia-500 to-purple-600 text-white',
            badge: 'bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-400/50',
            item: 'bg-slate-900/90 border-fuchsia-500/40 hover:bg-slate-800 text-white',
            itemChecked: 'bg-fuchsia-900/60 border-fuchsia-300 text-fuchsia-100 shadow-md',
            num: 'bg-fuchsia-500 text-white font-black',
            numChecked: 'bg-fuchsia-400 text-slate-950'
        },
    };

    const defaultColors = ['emerald', 'amber', 'indigo', 'rose', 'cyan', 'fuchsia'];

    const getColumnGridClass = () => {
        const count = categories.length;
        if (count === 1) return 'grid-cols-1 max-w-2xl mx-auto';
        if (count === 2) return isTeacher ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2';
        if (count === 3) return isTeacher ? 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
        return isTeacher ? 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    };

    return (
        <div className={cn("w-full h-full flex flex-col justify-start p-2 md:p-3.5 select-none overflow-y-auto", isSketchnote ? "bg-transparent text-[#1e293b]" : "bg-slate-950 text-white")}>
            
            {/* ══ ÜST KONTROL & BAŞLIK ÇUBUĞU ══ */}
            <div className={cn(
                "flex-shrink-0 w-full flex flex-wrap items-center justify-between gap-2 mb-2.5 p-2 md:p-2.5 rounded-2xl shadow-xl",
                isSketchnote 
                    ? "bg-white border-[2.5px] border-[#1e293b] shadow-[3px_3px_0_#1e293b] text-[#1e293b]" 
                    : "bg-slate-900/95 border border-white/20 backdrop-blur-xl text-white"
            )}>
                
                {/* BAŞLIK */}
                <div className="flex-1 flex items-center justify-center gap-2.5 text-center">
                    <div className={cn(
                        "w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center font-black shadow-md flex-shrink-0",
                        isSketchnote ? "bg-[#fefce8] border-2 border-[#ca8a04] text-[#854d0e]" : "bg-gradient-to-br from-indigo-500 to-cyan-600 text-white"
                    )}>
                        <Layers className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    {isSketchnote ? (
                        <div className="text-center">
                            <h2 className="font-['Caveat',cursive] text-2xl md:text-3xl font-bold bg-[#e0f2fe] text-[#0f172a] border-[2px] border-[#0284c7] px-3.5 py-0.5 rounded-xl shadow-[2px_2px_0_#0284c7] leading-tight inline-flex items-center gap-2">
                                <span>{step.title || step.tableTitle || '📊 Konu Sınıflandırma Tablosu'}</span>
                            </h2>
                            {step.description && (
                                <p className="font-['Patrick_Hand',cursive] text-xs text-[#854d0e] font-bold hidden sm:block leading-none mt-1">
                                    {step.description}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="text-center">
                            <h2 className="font-black text-white text-sm sm:text-base md:text-lg tracking-tight leading-tight flex items-center justify-center gap-2 text-center">
                                <span>{step.title || step.tableTitle || '📊 Konu Sınıflandırma Tablosu'}</span>
                            </h2>
                            {step.description && (
                                <p className="text-[11px] text-amber-300 font-semibold hidden sm:block leading-none mt-0.5 text-center">
                                    {step.description}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* SAĞ: PUNTO BOYUT KONTROLLERİ */}
                <div className="flex items-center gap-2">
                    <div className={cn("flex items-center rounded-xl p-0.5 border", isSketchnote ? "bg-slate-100 border-slate-300" : "bg-slate-950/90 border-white/15")}>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={decreaseFontSize} 
                            className={cn("h-7 w-7 rounded-lg", isSketchnote ? "text-slate-700 hover:text-black hover:bg-slate-200" : "text-slate-300 hover:text-white hover:bg-white/10")}
                            title="Yazı Boyutunu Küçült"
                        >
                            <Minus className="h-3.5 w-3.5"/>
                        </Button>
                        <span className={cn("text-[10px] font-black w-8 text-center uppercase", isSketchnote ? "text-slate-700" : "text-slate-300")}>Boyut</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={increaseFontSize} 
                            className={cn("h-7 w-7 rounded-lg", isSketchnote ? "text-slate-700 hover:text-black hover:bg-slate-200" : "text-slate-300 hover:text-white hover:bg-white/10")}
                            title="Yazı Boyutunu Büyüt"
                        >
                            <Plus className="h-3.5 w-3.5"/>
                        </Button>
                    </div>

                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-xl border hidden md:inline-block", isSketchnote ? "bg-[#fefce8] text-[#854d0e] border-[#ca8a04]" : "text-slate-400 bg-slate-900 border-white/10")}>
                        {categories.length} Kategori
                    </span>
                </div>
            </div>

            {/* ══ SÜTUNLU KATEGORİ IZGARASI ══ */}
            <div className={cn("grid gap-3 w-full flex-grow items-stretch", getColumnGridClass())}>
                {categories.map((cat, catIdx) => {
                    const colorKey = cat.color || defaultColors[catIdx % defaultColors.length];
                    const theme = isSketchnote 
                        ? (SKETCHNOTE_CATEGORY_MAP[colorKey] || SKETCHNOTE_CATEGORY_MAP.emerald)
                        : (CATEGORY_COLOR_MAP[colorKey] || CATEGORY_COLOR_MAP.emerald);
                    const items = cat.items || [];

                    return (
                        <div
                            key={`cat-${catIdx}`}
                            className={cn(
                                "relative overflow-hidden rounded-3xl p-3.5 sm:p-4 md:p-5 flex flex-col justify-between transition-all duration-300",
                                isSketchnote ? "" : "backdrop-blur-xl",
                                theme.card
                            )}
                        >
                            {/* Numara Filigranı */}
                            <div className={cn("absolute top-0 right-0 font-black text-6xl p-1.5 leading-none pointer-events-none select-none rounded-bl-2xl", isSketchnote ? "text-black/10 font-['Caveat',cursive]" : "bg-black/40 text-white/30 opacity-25")}>
                                {catIdx + 1}
                            </div>

                            <div className="z-10 relative flex flex-col h-full space-y-3">
                                {/* Kategori Başlığı ve Rozeti */}
                                <div className={cn("space-y-1.5 border-b pb-3", isSketchnote ? "border-black/15" : "border-white/20")}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={cn("px-2.5 py-0.5 rounded-full font-bold text-[11px] border tracking-wide", isSketchnote && "font-['Patrick_Hand',cursive]", theme.badge)}>
                                            {cat.badge || `Grup ${catIdx + 1}`}
                                        </span>
                                        <span className={cn("text-[11px] font-bold", isSketchnote ? "text-slate-600 font-['Patrick_Hand',cursive]" : "text-white/70")}>
                                            {items.length} Örnek
                                        </span>
                                    </div>
                                    <h3 
                                        className={cn(
                                            "uppercase tracking-tight leading-tight",
                                            isSketchnote ? "font-['Caveat',cursive] font-bold text-slate-900" : "font-black text-white drop-shadow-md"
                                        )}
                                        style={{ fontSize: `${baseFontSize * 1.2}rem` }}
                                    >
                                        {cat.name}
                                    </h3>
                                </div>

                                {/* Kategori Altındaki Maddeler / Örnekler */}
                                <div className="flex flex-col gap-2 flex-grow">
                                    {items.map((item, itemIdx) => {
                                        const isChecked = checkedItems[`${catIdx}-${itemIdx}`] || false;
                                        return (
                                            <div
                                                key={`item-${catIdx}-${itemIdx}`}
                                                onClick={() => toggleItem(catIdx, itemIdx)}
                                                className={cn(
                                                    "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-2.5",
                                                    isChecked ? theme.itemChecked : theme.item
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5 shadow-sm",
                                                    isChecked ? theme.numChecked : theme.num
                                                )}>
                                                    {isChecked ? <Check className="w-3.5 h-3.5" /> : itemIdx + 1}
                                                </div>
                                                <p
                                                    className={cn(
                                                        "font-bold leading-snug flex-1 select-text",
                                                        isSketchnote 
                                                            ? (isChecked ? "line-through opacity-75 text-slate-500 font-['Patrick_Hand',cursive]" : "text-slate-800 font-['Patrick_Hand',cursive] [&_mark]:bg-[#fef08a]")
                                                            : (isChecked ? "line-through opacity-85 text-white drop-shadow" : "text-white drop-shadow")
                                                    )}
                                                    style={{ fontSize: `${baseFontSize * 0.95}rem` }}
                                                >
                                                    {item}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📑 12. KONU ÖZETİ BAŞLIKLARI (TopicOutlinePlayer - Neo-Brutalist Pop Kart Tasarımı)
// ═══════════════════════════════════════════════════════════════════════════

export function TopicOutlinePlayer({
    step,
    isFullscreen,
    fontSizeScale = 'normal',
    currentStepIndex,
    allSteps = [],
    onJumpToStep,
    onNextStep,
    presentationTheme,
    presentationFont
}: {
    step: TopicOutlineStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    currentStepIndex?: number;
    allSteps?: LessonStep[];
    onJumpToStep?: (index: number) => void;
    onNextStep?: () => void;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';

    const SKETCHNOTE_OUTLINE_THEMES = [
        { bg: 'bg-[#fefce8]', border: 'border-[#ca8a04]', num: 'text-[#ca8a04]', shadow: 'shadow-[5px_5px_0_#ca8a04] hover:shadow-[7px_7px_0_#a16207]', dot: 'bg-[#ca8a04]' },
        { bg: 'bg-[#e0f2fe]', border: 'border-[#0284c7]', num: 'text-[#0284c7]', shadow: 'shadow-[5px_5px_0_#0284c7] hover:shadow-[7px_7px_0_#0369a1]', dot: 'bg-[#0284c7]' },
        { bg: 'bg-[#fdf2f8]', border: 'border-[#db2777]', num: 'text-[#db2777]', shadow: 'shadow-[5px_5px_0_#db2777] hover:shadow-[7px_7px_0_#be185d]', dot: 'bg-[#db2777]' },
        { bg: 'bg-[#f0fdf4]', border: 'border-[#16a34a]', num: 'text-[#16a34a]', shadow: 'shadow-[5px_5px_0_#16a34a] hover:shadow-[7px_7px_0_#15803d]', dot: 'bg-[#16a34a]' },
        { bg: 'bg-[#fff7ed]', border: 'border-[#ea580c]', num: 'text-[#ea580c]', shadow: 'shadow-[5px_5px_0_#ea580c] hover:shadow-[7px_7px_0_#c2410c]', dot: 'bg-[#ea580c]' },
        { bg: 'bg-[#faf5ff]', border: 'border-[#9333ea]', num: 'text-[#9333ea]', shadow: 'shadow-[5px_5px_0_#9333ea] hover:shadow-[7px_7px_0_#7e22ce]', dot: 'bg-[#9333ea]' }
    ];

    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'xs' ? 'xs' : 'sm';

    const items = step.items || [];
    const count = items.length;
    const isMultiRow = count > 4;

    const getTitleFontSize = () => {
        if (isMultiRow) {
            switch (cardScale) {
                case 'xs': return "text-sm sm:text-base";
                case 'sm': return "text-base sm:text-lg";
                case 'md': return "text-base sm:text-lg md:text-xl";
                case 'lg': return "text-lg sm:text-xl md:text-2xl";
                case 'xl': return "text-xl sm:text-2xl md:text-3xl";
                default: return "text-base sm:text-lg md:text-xl";
            }
        }
        switch (cardScale) {
            case 'xs': return "text-base sm:text-lg";
            case 'sm': return "text-lg sm:text-xl md:text-2xl";
            case 'md': return "text-xl sm:text-2xl md:text-3xl";
            case 'lg': return "text-2xl sm:text-3xl md:text-4xl";
            case 'xl': return "text-3xl sm:text-4xl md:text-5xl";
            default: return "text-xl sm:text-2xl md:text-3xl";
        }
    };

    const getNumberFontSize = () => {
        if (isMultiRow) {
            switch (cardScale) {
                case 'xs': return "text-xl sm:text-2xl";
                case 'sm': return "text-2xl sm:text-3xl";
                case 'md': return "text-3xl sm:text-4xl";
                case 'lg': return "text-4xl sm:text-5xl";
                case 'xl': return "text-5xl sm:text-6xl";
                default: return "text-3xl sm:text-4xl";
            }
        }
        switch (cardScale) {
            case 'xs': return "text-2xl sm:text-3xl";
            case 'sm': return "text-3xl sm:text-4xl";
            case 'md': return "text-4xl sm:text-5xl";
            case 'lg': return "text-5xl sm:text-6xl";
            case 'xl': return "text-6xl sm:text-7xl";
            default: return "text-4xl sm:text-5xl";
        }
    };

    const getCardWidthClass = () => {
        if (count <= 4) {
            return "flex-1 min-w-0 h-full"; // Sağa ve sola tam yaslanır, ekran genişliğini doldurur
        }
        if (count === 5 || count === 6) {
            return "w-[calc(33.333%-1rem)] sm:w-[calc(33.333%-1.5rem)] lg:w-[calc(33.333%-2rem)] h-[calc(50%-0.6rem)] sm:h-[calc(50%-0.85rem)]";
        }
        if (count === 7 || count === 8) {
            return "w-[calc(25%-1rem)] sm:w-[calc(25%-1.5rem)] lg:w-[calc(25%-2rem)] h-[calc(50%-0.6rem)] sm:h-[calc(50%-0.85rem)]";
        }
        return "w-[calc(20%-0.8rem)] sm:w-[calc(20%-1.2rem)] h-[calc(50%-0.6rem)] sm:h-[calc(50%-0.85rem)]";
    };

    const getContainerMaxClass = () => {
        if (count <= 4) return "w-full max-h-[400px] sm:max-h-[460px] lg:max-h-[520px]";
        return "w-full max-h-[460px] sm:max-h-[520px] lg:max-h-[580px]";
    };

    const getTargetStepIndex = (itemTitle: string, itemIndex: number) => {
        if (!allSteps || allSteps.length === 0) return null;
        const cleanTitle = itemTitle.toLowerCase().replace(/^[0-9]+[.)\-]\s*/, '').trim();

        // 1. Mevcut slayttan sonra bu başlığı içeren bir content slaytı ara
        const startIdx = typeof currentStepIndex === 'number' ? currentStepIndex + 1 : 0;
        for (let i = startIdx; i < allSteps.length; i++) {
            const st = allSteps[i];
            if (st && st.title) {
                const stTitle = st.title.toLowerCase().replace(/^[0-9]+[.)\-]\s*/, '').trim();
                if (stTitle.includes(cleanTitle) || cleanTitle.includes(stTitle)) {
                    return i;
                }
            }
        }

        // 2. Bulunamazsa sıradaki indeksleri kullan
        if (typeof currentStepIndex === 'number' && currentStepIndex + 1 + itemIndex < allSteps.length) {
            return currentStepIndex + 1 + itemIndex;
        }
        return null;
    };

    const handleCardClick = (itemTitle: string, itemIndex: number) => {
        playSound('pop');
        const targetIdx = getTargetStepIndex(itemTitle, itemIndex);
        if (targetIdx !== null && onJumpToStep) {
            onJumpToStep(targetIdx);
        } else if (onNextStep) {
            onNextStep();
        }
    };

    return (
        <div className={cn(
            "w-full h-full flex flex-col items-center justify-between px-4 sm:px-8 lg:px-12 py-3 sm:py-5 select-none overflow-hidden",
            isFullscreen ? "py-5 sm:py-6" : "py-3 sm:py-4"
        )}>
            {/* ══ ÜST: BAŞLIK & ROZET (shrink-0) ══ */}
            <div className="shrink-0 flex flex-col items-center text-center">
                {isSketchnote ? (
                    <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-[#fefce8] border-[2.5px] border-[#1e293b] text-[#1e293b] font-['Caveat',cursive] text-2xl font-bold shadow-[3px_3px_0_#1e293b]">
                        <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                        <span>{step.title || '📑 Konu Başlıkları'}</span>
                        <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border-2 border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-black uppercase tracking-wider shadow-sm backdrop-blur-md"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                        <span>{step.title || '📑 Konu Başlıkları'}</span>
                    </motion.div>
                )}

                {step.description && (
                    <p className={cn(
                        "text-xs sm:text-sm md:text-base font-semibold max-w-3xl text-center mt-1.5 line-clamp-1 sm:line-clamp-2",
                        isSketchnote ? "font-['Patrick_Hand',cursive] text-slate-700 text-base" : "text-slate-600 dark:text-slate-300"
                    )}>
                        {step.description}
                    </p>
                )}
            </div>

            {/* ══ ORTA: KARTLAR ALANI (flex-1 min-h-0, SAĞA VE SOLA TAM YASLANIR) ══ */}
            <div className="flex-1 w-full min-h-0 flex items-center justify-center my-2 sm:my-3">
                <div className={cn(
                    "w-full h-full flex items-stretch justify-center content-center gap-4 sm:gap-6 lg:gap-8",
                    isMultiRow ? "flex-wrap" : "flex-row",
                    getContainerMaxClass()
                )}>
                    {items.map((item, index) => {
                        const title = typeof item === 'string' ? item : item.title;
                        const itemNum = (typeof item === 'object' && item.number) ? item.number : index + 1;
                        const targetIdx = getTargetStepIndex(title, index);
                        const sketchnoteTheme = SKETCHNOTE_OUTLINE_THEMES[index % SKETCHNOTE_OUTLINE_THEMES.length];

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: index * 0.05, duration: 0.28, ease: "easeOut" }}
                                onClick={() => handleCardClick(title, index)}
                                title={targetIdx !== null ? `Slayta Git: ${title}` : title}
                                className={cn(
                                    "group relative flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden",
                                    isSketchnote
                                        ? cn(
                                            "rounded-3xl border-[2.5px]",
                                            sketchnoteTheme.bg,
                                            sketchnoteTheme.border,
                                            sketchnoteTheme.shadow,
                                            "hover:-translate-y-1 hover:-translate-x-0.5"
                                        )
                                        : cn(
                                            "rounded-2xl sm:rounded-3xl border-[2.5px] sm:border-[3px] border-slate-950 dark:border-white/30 bg-white dark:bg-slate-900",
                                            isMultiRow 
                                                ? "shadow-[5px_5px_0px_#2563eb] sm:shadow-[6px_6px_0px_#2563eb] dark:shadow-[6px_6px_0px_#3b82f6]" 
                                                : "shadow-[6px_6px_0px_#2563eb] sm:shadow-[8px_8px_0px_#2563eb] lg:shadow-[10px_10px_0px_#2563eb] dark:shadow-[8px_8px_0px_#3b82f6]",
                                            "hover:shadow-[10px_10px_0px_#1d4ed8] sm:hover:shadow-[14px_14px_0px_#1d4ed8] hover:-translate-y-1.5 hover:-translate-x-1",
                                            "active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_#2563eb]"
                                        ),
                                    isMultiRow ? "p-4 sm:p-5 md:p-6" : "p-6 sm:p-8 md:p-9",
                                    getCardWidthClass()
                                )}
                            >
                                {/* Sol Üst: Numaralandırma & Sağ Üst: Yönlendirme İkonu */}
                                <div className="flex items-start justify-between w-full shrink-0">
                                    <span className={cn(
                                        "leading-none select-none tracking-tight",
                                        isSketchnote 
                                            ? cn("font-['Caveat',cursive] font-bold text-3xl sm:text-4xl", sketchnoteTheme.num) 
                                            : cn("font-extrabold text-blue-600 dark:text-blue-400", getNumberFontSize())
                                    )}>
                                        {itemNum}
                                    </span>

                                    <div className={cn(
                                        "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl",
                                        isSketchnote ? "bg-black/10 text-slate-800" : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                                    )}>
                                        <ArrowRight className={cn(isMultiRow ? "w-4 h-4" : "w-5 h-5")} />
                                    </div>
                                </div>

                                {/* Orta: Başlık Metni - Rahat satır aralığı (leading-normal / 1.4) ile alt satıra düşüşlerde tertemiz okuma */}
                                <div className="my-2 sm:my-3.5 flex-1 flex flex-col justify-start">
                                    <h3 className={cn(
                                        "leading-[1.35] sm:leading-[1.45] tracking-normal break-words text-left transition-colors",
                                        isSketchnote 
                                            ? "font-['Caveat',cursive] font-bold text-2xl sm:text-3xl text-slate-900 group-hover:text-blue-700" 
                                            : cn("font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300", getTitleFontSize())
                                    )}>
                                        {title}
                                    </h3>
                                </div>

                                {/* Sağ Alt: Vurgu Noktası (Referans Görseldeki Birebir Detay) */}
                                <div className="w-full flex justify-end mt-auto pt-2 shrink-0">
                                    <div className={cn(
                                        "rounded-full border-[2px] shrink-0 group-hover:scale-125 transition-transform shadow-xs",
                                        isSketchnote ? cn(sketchnoteTheme.dot, "border-black/20") : "bg-blue-600 dark:bg-blue-400 border-slate-950 dark:border-white",
                                        isMultiRow ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-4 h-4 sm:w-5 sm:h-5"
                                    )} />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ══ ALT: İPUCU BİLGİSİ (shrink-0) ══ */}
            <div className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold text-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>İpucu: Başlıklara tıklayarak doğrudan o konuya geçebilir veya <strong>Boşluk / İleri (→)</strong> ile sırayla ilerleyebilirsiniz.</span>
            </div>
        </div>
    );
}
