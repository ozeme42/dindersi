'use client';

import React from 'react';
import { 
    Trophy, Timer, Maximize2, Minimize, Volume2, VolumeX, 
    Sparkles, LogOut, Flame, RotateCcw 
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
        <header className="w-full relative z-30 pt-1.5 pb-2 px-3 md:px-6 select-none pointer-events-auto">
            <div className="max-w-[1800px] mx-auto flex items-start justify-between gap-2 md:gap-4 relative">
                
                {/* ═════════ SOL: 3D GAMIFICATION KAPSÜLLERİ (PUAN & SEVİYE) ═════════ */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0 pt-2">
                    {/* 1. Yıldızlı Puan Kapsülü (3D Parlak Mavi & Altın Çerçeveli) */}
                    <div 
                        className="flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full border-3 shadow-2xl relative"
                        style={{
                            background: 'linear-gradient(180deg, #1e40af 0%, #1e1b4b 100%)',
                            borderColor: '#38bdf8',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.65), inset 0 2px 4px rgba(255,255,255,0.4)',
                        }}
                    >
                        {/* 3D Kabartmalı Altın Yıldız */}
                        <div 
                            className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 border-2 border-yellow-200"
                            style={{
                                background: 'radial-gradient(circle at 35% 35%, #fef08a 0%, #f59e0b 65%, #b45309 100%)',
                                boxShadow: '0 4px 10px rgba(245, 158, 11, 0.6), inset 0 2px 3px rgba(255,255,255,0.6)',
                            }}
                        >
                            <span className="text-base md:text-lg filter drop-shadow">⭐</span>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-sm md:text-lg font-black text-white tracking-tight drop-shadow">
                                {score}
                            </span>
                            <span className="text-[10px] font-extrabold text-sky-200 uppercase tracking-wider">
                                Puan
                            </span>
                        </div>
                    </div>

                    {/* 2. Seviye Madalyası Kapsülü */}
                    <div 
                        className="hidden sm:flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full border-3 shadow-2xl relative"
                        style={{
                            background: 'linear-gradient(180deg, #1e40af 0%, #1e1b4b 100%)',
                            borderColor: '#fbbf24',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.65), inset 0 2px 4px rgba(255,255,255,0.4)',
                        }}
                    >
                        {/* 3D Altın Madalya */}
                        <div 
                            className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 border-2 border-amber-200"
                            style={{
                                background: 'radial-gradient(circle at 35% 35%, #fef08a 0%, #d97706 70%, #78350f 100%)',
                                boxShadow: '0 4px 10px rgba(217, 119, 6, 0.6), inset 0 2px 3px rgba(255,255,255,0.6)',
                            }}
                        >
                            <Trophy size={16} className="text-amber-950 fill-amber-300" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xs md:text-sm font-black text-amber-200 uppercase tracking-wide">
                                Seviye {currentStep + 1}/{totalSteps}
                            </span>
                            <span className="text-[10px] font-bold text-amber-400/80">
                                Adım {currentStep + 1}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ═════════ ORTA: ASIL 3D AHŞAP ASMA TABELA & PARŞÖMEN KURDELE ═════════ */}
                <div className="flex-1 flex flex-col items-center max-w-xl md:max-w-2xl px-2">
                    
                    {/* Tabela Asma Halatları (Ropes/Chains) */}
                    <div className="w-full flex justify-between px-12 md:px-24 -mb-1 z-10 pointer-events-none">
                        <div className="w-2 md:w-2.5 h-3 md:h-4 bg-gradient-to-b from-amber-950 via-amber-700 to-amber-900 rounded-t border-x border-amber-500 shadow-md" />
                        <div className="w-2 md:w-2.5 h-3 md:h-4 bg-gradient-to-b from-amber-950 via-amber-700 to-amber-900 rounded-t border-x border-amber-500 shadow-md" />
                    </div>

                    {/* 3D Oymalı Ahşap Tabela Ana Gövde */}
                    <div 
                        className="relative w-full px-5 md:px-8 py-2 md:py-3 rounded-2xl md:rounded-3xl border-4 text-center shadow-2xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(180deg, #92400e 0%, #78350f 35%, #451a03 85%, #290e02 100%)',
                            borderColor: '#b45309',
                            boxShadow: '0 12px 35px rgba(0,0,0,0.85), inset 0 3px 5px rgba(255,255,255,0.35), inset 0 -3px 5px rgba(0,0,0,0.6)',
                        }}
                    >
                        {/* Ahşap Çivi / Vida Detayları (Köşelerde) */}
                        <div className="absolute top-2 left-3 w-2 h-2 rounded-full bg-amber-400 border border-amber-950 shadow-inner opacity-80" />
                        <div className="absolute top-2 right-3 w-2 h-2 rounded-full bg-amber-400 border border-amber-950 shadow-inner opacity-80" />
                        <div className="absolute bottom-2 left-3 w-2 h-2 rounded-full bg-amber-400 border border-amber-950 shadow-inner opacity-80" />
                        <div className="absolute bottom-2 right-3 w-2 h-2 rounded-full bg-amber-400 border border-amber-950 shadow-inner opacity-80" />

                        {/* Ahşap Doku Çizgileri */}
                        <div 
                            className="absolute inset-0 opacity-15 pointer-events-none"
                            style={{
                                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(0,0,0,0.35) 18px, rgba(0,0,0,0.35) 20px)',
                            }}
                        />

                        {/* 3D Kabartmalı Altın / Sarı Başlık Yazısı */}
                        <h1 
                            className="relative z-10 text-base sm:text-xl md:text-2xl lg:text-3xl font-black tracking-tight leading-tight uppercase font-outfit"
                            style={{
                                color: '#fef08a',
                                textShadow: '0 2px 0 #ca8a04, 0 4px 0 #854d0e, 0 6px 1px #451a03, 0 8px 12px rgba(0,0,0,0.85)',
                            }}
                        >
                            {title || 'Ders Sunumu'}
                        </h1>
                    </div>

                    {/* 3D Alt Parşömen Kurdele (Ribbon Banner) */}
                    {subtitle && (
                        <div className="relative -mt-2 z-20 flex items-center justify-center max-w-[90%]">
                            {/* Sol Kurdele Ucu */}
                            <div 
                                className="w-4 h-6 -mr-1 hidden sm:block border-y-2 border-l-2"
                                style={{
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                    borderColor: '#d97706',
                                    clipPath: 'polygon(100% 0%, 0% 50%, 100% 100%)',
                                }}
                            />

                            {/* Parşömen Orta Gövde */}
                            <div 
                                className="px-4 md:px-6 py-1 rounded-xl border-2 shadow-lg backdrop-blur-md text-center"
                                style={{
                                    background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 60%, #fde68a 100%)',
                                    borderColor: '#d97706',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.8)',
                                }}
                            >
                                <p className="text-[11px] sm:text-xs md:text-sm font-black text-amber-950 truncate max-w-md">
                                    {subtitle}
                                </p>
                            </div>

                            {/* Sağ Kurdele Ucu */}
                            <div 
                                className="w-4 h-6 -ml-1 hidden sm:block border-y-2 border-r-2"
                                style={{
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                    borderColor: '#d97706',
                                    clipPath: 'polygon(0% 0%, 100% 50%, 0% 100%)',
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* ═════════ SAĞ: 3D OYUN KONTROL BUTONLARI (KRONOMETRE, TAM EKRAN, SES, ÇIKIŞ) ═════════ */}
                <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0 pt-2">
                    
                    {/* 1. 3D Altın Çerçeveli Kronometre Saati */}
                    <div 
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border-3 shadow-2xl"
                        style={{
                            background: 'linear-gradient(180deg, #1e40af 0%, #1e1b4b 100%)',
                            borderColor: '#38bdf8',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.65), inset 0 2px 4px rgba(255,255,255,0.3)',
                        }}
                    >
                        {/* 3D Saat İkonu */}
                        <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-yellow-200"
                            style={{
                                background: 'radial-gradient(circle at 35% 35%, #fef08a 0%, #f59e0b 80%, #b45309 100%)',
                            }}
                        >
                            <Timer size={14} className="text-amber-950 stroke-[2.5]" />
                        </div>
                        <div className="flex flex-col leading-none pr-1">
                            <span className="font-mono text-xs md:text-sm font-black text-white drop-shadow">
                                {fmtTime(elapsedTime)}
                            </span>
                            <span className="text-[9px] font-bold text-sky-200">
                                Süre
                            </span>
                        </div>
                    </div>

                    {/* 2. Öğrenci Çark Butonu */}
                    {showWheelButton && onOpenWheel && (
                        <button
                            onClick={onOpenWheel}
                            className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-amber-300 border-b-[4px] border-b-amber-800 flex items-center justify-center text-amber-950 shadow-xl active:border-b-0 active:translate-y-1 transition-all cursor-pointer hover:brightness-110"
                            style={{
                                background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 60%, #d97706 100%)',
                                boxShadow: '0 6px 16px rgba(245, 158, 11, 0.45), inset 0 2px 3px rgba(255,255,255,0.6)',
                            }}
                            title="Öğrenci Kura Çarkı (R)"
                        >
                            <span className="text-lg">🎡</span>
                        </button>
                    )}

                    {/* 3. Tam Ekran 3D Yuvarlak Buton */}
                    <button
                        onClick={onToggleFullscreen}
                        className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-amber-300 border-b-[4px] border-b-amber-800 flex items-center justify-center text-amber-950 shadow-xl active:border-b-0 active:translate-y-1 transition-all cursor-pointer hover:brightness-110"
                        style={{
                            background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 60%, #d97706 100%)',
                            boxShadow: '0 6px 16px rgba(245, 158, 11, 0.45), inset 0 2px 3px rgba(255,255,255,0.6)',
                        }}
                        title={isFullscreen ? 'Tam Ekrandan Çık (F)' : 'Tam Ekran Yap (F)'}
                    >
                        {isFullscreen ? <Minimize size={18} className="stroke-[3]" /> : <Maximize2 size={18} className="stroke-[3]" />}
                    </button>

                    {/* 4. Ses Aç / Kapa Butonu */}
                    {onToggleMute && (
                        <button
                            onClick={onToggleMute}
                            className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-sky-300 border-b-[4px] border-b-blue-900 flex items-center justify-center text-white shadow-xl active:border-b-0 active:translate-y-1 transition-all cursor-pointer hover:brightness-110"
                            style={{
                                background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 60%, #0369a1 100%)',
                                boxShadow: '0 6px 16px rgba(2, 132, 199, 0.45), inset 0 2px 3px rgba(255,255,255,0.5)',
                            }}
                            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
                        >
                            {isMuted ? <VolumeX size={18} className="stroke-[2.5]" /> : <Volume2 size={18} className="stroke-[2.5]" />}
                        </button>
                    )}

                    {/* 5. Araçlar Butonu */}
                    {onOpenTools && (
                        <button
                            onClick={onOpenTools}
                            className="hidden md:flex w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-purple-300 border-b-[4px] border-b-purple-950 items-center justify-center text-white shadow-xl active:border-b-0 active:translate-y-1 transition-all cursor-pointer hover:brightness-110"
                            style={{
                                background: 'linear-gradient(180deg, #c084fc 0%, #9333ea 60%, #7e22ce 100%)',
                                boxShadow: '0 6px 16px rgba(147, 51, 234, 0.45), inset 0 2px 3px rgba(255,255,255,0.5)',
                            }}
                            title="Sunum Araçları & Ayarlar"
                        >
                            <Sparkles size={18} className="stroke-[2.5]" />
                        </button>
                    )}

                    {/* 6. Çıkış Butonu */}
                    <button
                        onClick={onExit}
                        className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-rose-300 border-b-[4px] border-b-rose-950 flex items-center justify-center text-white shadow-xl active:border-b-0 active:translate-y-1 transition-all cursor-pointer hover:brightness-110"
                        style={{
                            background: 'linear-gradient(180deg, #fb7185 0%, #e11d48 60%, #be123c 100%)',
                            boxShadow: '0 6px 16px rgba(225, 29, 72, 0.45), inset 0 2px 3px rgba(255,255,255,0.5)',
                        }}
                        title="Ders Akışından Çık"
                    >
                        <LogOut size={16} className="stroke-[3]" />
                    </button>
                </div>
            </div>
        </header>
    );
}
