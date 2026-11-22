'use client';

import React from 'react';
import { 
    Trophy, Timer, Maximize2, Minimize, Volume2, VolumeX, 
    Sparkles, LogOut, Flame, RotateCcw, Pin, PinOff, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresentationWoodenHeaderProps {
    title: string;
    subtitle?: string;
    score: number;
    currentStep: number;
    totalSteps: number;
    elapsedTime?: number;
    isFullscreen: boolean;
    isMuted?: boolean;
    isHeaderPinned?: boolean;
    onTogglePin?: () => void;
    onHide?: () => void;
    onToggleFullscreen: () => void;
    onToggleMute?: () => void;
    onOpenTools?: () => void;
    onOpenWheel?: () => void;
    showWheelButton?: boolean;
    onExit: () => void;
    streak?: number;
}

export function PresentationWoodenHeader({
    title,
    subtitle,
    score,
    currentStep,
    totalSteps,
    elapsedTime = 0,
    isFullscreen,
    isMuted = false,
    isHeaderPinned = true,
    onTogglePin,
    onHide,
    onToggleFullscreen,
    onToggleMute,
    onOpenTools,
    onOpenWheel,
    showWheelButton = true,
    onExit,
    streak = 1,
}: PresentationWoodenHeaderProps) {
    const fmtTime = (s: number) => {
        const m = String(Math.floor(s / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        return `${m}:${sec}`;
    };

    return (
        <header className="w-full relative z-30 pt-1 pb-1 px-2 md:px-4 select-none pointer-events-auto">
            <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-2 md:gap-3 relative">
                
                {/* ═════════ SOL: 3D GAMIFICATION KAPSÜLLERİ (PUAN & SEVİYE) ═════════ */}
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    {/* 1. Yıldızlı Puan Kapsülü */}
                    <div 
                        className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border-2 shadow-lg relative"
                        style={{
                            background: 'linear-gradient(180deg, #1e40af 0%, #1e1b4b 100%)',
                            borderColor: '#38bdf8',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.4)',
                        }}
                    >
                        <div 
                            className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shrink-0 border border-yellow-200"
                            style={{
                                background: 'radial-gradient(circle at 35% 35%, #fef08a 0%, #f59e0b 65%, #b45309 100%)',
                                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.5)',
                            }}
                        >
                            <span className="text-xs md:text-sm filter drop-shadow">⭐</span>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xs md:text-sm font-black text-white tracking-tight drop-shadow">
                                {score}
                            </span>
                            <span className="text-[8px] font-extrabold text-sky-200 uppercase tracking-wider">
                                Puan
                            </span>
                        </div>
                    </div>

                    {/* 2. Seviye Madalyası Kapsülü */}
                    <div 
                        className="hidden sm:flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border-2 shadow-lg relative"
                        style={{
                            background: 'linear-gradient(180deg, #1e40af 0%, #1e1b4b 100%)',
                            borderColor: '#fbbf24',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.4)',
                        }}
                    >
                        <div 
                            className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shrink-0 border border-amber-200"
                            style={{
                                background: 'radial-gradient(circle at 35% 35%, #fef08a 0%, #d97706 70%, #78350f 100%)',
                                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.5)',
                            }}
                        >
                            <Trophy size={13} className="text-amber-950 fill-amber-300" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-[11px] md:text-xs font-black text-amber-200 uppercase tracking-wide">
                                Seviye {currentStep + 1}/{totalSteps}
                            </span>
                            <span className="text-[8px] font-bold text-amber-400/80">
                                Adım {currentStep + 1}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ═════════ ORTA: KOMPAKT 3D AHŞAP VE ALTIN TABELA ═════════ */}
                <div className="flex-1 flex flex-col items-center max-w-xl md:max-w-2xl px-2">
                    <div 
                        className="relative w-full px-4 md:px-6 py-1 md:py-1.5 rounded-xl md:rounded-2xl border-2 sm:border-3 text-center shadow-xl overflow-hidden flex flex-col items-center justify-center"
                        style={{
                            background: 'linear-gradient(180deg, #92400e 0%, #78350f 35%, #451a03 85%, #290e02 100%)',
                            borderColor: '#b45309',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* Vida Detayları */}
                        <div className="absolute top-1.5 left-2.5 w-1.5 h-1.5 rounded-full bg-amber-400 border border-amber-950 shadow-inner opacity-80" />
                        <div className="absolute top-1.5 right-2.5 w-1.5 h-1.5 rounded-full bg-amber-400 border border-amber-950 shadow-inner opacity-80" />

                        {/* Ahşap Doku Çizgileri */}
                        <div 
                            className="absolute inset-0 opacity-15 pointer-events-none"
                            style={{
                                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(0,0,0,0.35) 18px, rgba(0,0,0,0.35) 20px)',
                            }}
                        />

                        {/* Başlık Yazısı */}
                        <h1 
                            className="relative z-10 text-xs sm:text-sm md:text-base lg:text-lg font-black tracking-tight leading-snug uppercase font-outfit truncate max-w-full"
                            style={{
                                color: '#fef08a',
                                textShadow: '0 1px 0 #ca8a04, 0 2px 0 #854d0e, 0 3px 6px rgba(0,0,0,0.8)',
                            }}
                        >
                            {title || 'Ders Sunumu'}
                        </h1>

                        {/* Alt Başlık / Konu Rozeti (Kompakt ve Şık) */}
                        {subtitle && (
                            <span className="relative z-10 inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold text-amber-950 bg-amber-200/90 border border-amber-400/80 shadow-xs truncate max-w-md">
                                {subtitle}
                            </span>
                        )}
                    </div>
                </div>

                {/* ═════════ SAĞ: 3D KONTROL BUTONLARI & GİZLEME/SABİTLEME ═════════ */}
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
                    
                    {/* 1. Süre Saati */}
                    <div 
                        className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 shadow-lg"
                        style={{
                            background: 'linear-gradient(180deg, #1e40af 0%, #1e1b4b 100%)',
                            borderColor: '#38bdf8',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        }}
                    >
                        <Timer size={13} className="text-amber-300 stroke-[2.5]" />
                        <span className="font-mono text-xs font-black text-white drop-shadow">
                            {fmtTime(elapsedTime)}
                        </span>
                    </div>

                    {/* 2. Öğrenci Çark Butonu */}
                    {showWheelButton && onOpenWheel && (
                        <button
                            onClick={onOpenWheel}
                            className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl border-2 border-amber-300 border-b-[3px] border-b-amber-800 flex items-center justify-center text-amber-950 shadow-md active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer hover:brightness-110"
                            style={{
                                background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 60%, #d97706 100%)',
                            }}
                            title="Öğrenci Kura Çarkı (R)"
                        >
                            <span className="text-sm">🎡</span>
                        </button>
                    )}

                    {/* 3. Tam Ekran Butonu */}
                    <button
                        onClick={onToggleFullscreen}
                        className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl border-2 border-amber-300 border-b-[3px] border-b-amber-800 flex items-center justify-center text-amber-950 shadow-md active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer hover:brightness-110"
                        style={{
                            background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 60%, #d97706 100%)',
                        }}
                        title={isFullscreen ? 'Tam Ekrandan Çık (F)' : 'Tam Ekran Yap (F)'}
                    >
                        {isFullscreen ? <Minimize size={15} className="stroke-[3]" /> : <Maximize2 size={15} className="stroke-[3]" />}
                    </button>

                    {/* 4. Ses Aç / Kapa Butonu */}
                    {onToggleMute && (
                        <button
                            onClick={onToggleMute}
                            className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl border-2 border-sky-300 border-b-[3px] border-b-blue-900 flex items-center justify-center text-white shadow-md active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer hover:brightness-110"
                            style={{
                                background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 60%, #0369a1 100%)',
                            }}
                            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
                        >
                            {isMuted ? <VolumeX size={15} className="stroke-[2.5]" /> : <Volume2 size={15} className="stroke-[2.5]" />}
                        </button>
                    )}

                    {/* 5. Araçlar Butonu */}
                    {onOpenTools && (
                        <button
                            onClick={onOpenTools}
                            className="hidden md:flex w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl border-2 border-purple-300 border-b-[3px] border-b-purple-950 items-center justify-center text-white shadow-md active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer hover:brightness-110"
                            style={{
                                background: 'linear-gradient(180deg, #c084fc 0%, #9333ea 60%, #7e22ce 100%)',
                            }}
                            title="Sunum Araçları & Ayarlar"
                        >
                            <Sparkles size={15} className="stroke-[2.5]" />
                        </button>
                    )}

                    {/* 6. Sabitle / Otomatik Gizle Butonu (H) */}
                    {onTogglePin && (
                        <button
                            onClick={onTogglePin}
                            className={cn(
                                "w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl border-2 border-b-[3px] flex items-center justify-center transition-all cursor-pointer active:border-b-0 active:translate-y-0.5 shadow-md",
                                isHeaderPinned
                                    ? "bg-amber-400 border-amber-200 border-b-amber-700 text-amber-950"
                                    : "bg-white/20 hover:bg-white/30 border-white/40 border-b-white/20 text-white"
                            )}
                            title={isHeaderPinned ? "Üst Menüyü Otomatik Gizle (H)" : "Üst Menüyü Sabitle (H)"}
                        >
                            {isHeaderPinned ? <Pin size={14} /> : <PinOff size={14} />}
                        </button>
                    )}

                    {/* 7. Gizle (Yukarı Katla) Butonu */}
                    {onHide && (
                        <button
                            onClick={onHide}
                            className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl border-2 border-white/30 border-b-[3px] border-b-white/10 bg-white/15 hover:bg-white/25 flex items-center justify-center text-white shadow-md active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer"
                            title="Üst Menüyü Gizle (H)"
                        >
                            <ChevronUp size={16} />
                        </button>
                    )}

                    {/* 8. Çıkış Butonu */}
                    <button
                        onClick={onExit}
                        className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl border-2 border-rose-300 border-b-[3px] border-b-rose-950 flex items-center justify-center text-white shadow-md active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer hover:brightness-110"
                        style={{
                            background: 'linear-gradient(180deg, #fb7185 0%, #e11d48 60%, #be123c 100%)',
                        }}
                        title="Ders Akışından Çık"
                    >
                        <LogOut size={14} className="stroke-[3]" />
                    </button>
                </div>
            </div>
        </header>
    );
}
