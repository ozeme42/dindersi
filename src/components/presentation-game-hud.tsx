'use client';

import React from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Sparkles,
    Trophy,
    Flame,
    Coins,
    Timer,
    Maximize2,
    Minimize,
    RotateCcw,
    Volume2,
    VolumeX,
    EyeOff,
    Check,
    PartyPopper,
    Lock
} from 'lucide-react';
import { getSceneForStep, type SceneConfig } from './presentation-scenes';

interface PresentationGameHudProps {
    currentStepIndex: number;
    totalSteps: number;
    score: number;
    elapsedTime?: number;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    onPrev: () => void;
    onNext: () => void;
    onSkip?: () => void;
    onRestart?: () => void;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onOpenTools?: () => void;
    onOpenWheel?: () => void;
    showWheelButton?: boolean;
    hasUnrevealedItems?: boolean;
    currentRevealCount?: number;
    totalRevealCount?: number;
    isNextButtonEnabled?: boolean;
    completeButtonText?: string;
    onHideUI?: () => void;
}

export function PresentationGameHud({
    currentStepIndex,
    totalSteps,
    score,
    elapsedTime = 0,
    isFullscreen,
    onToggleFullscreen,
    onPrev,
    onNext,
    onSkip,
    onRestart,
    isMuted = false,
    onToggleMute,
    onOpenTools,
    onOpenWheel,
    showWheelButton,
    hasUnrevealedItems = false,
    currentRevealCount = 1,
    totalRevealCount = 1,
    isNextButtonEnabled = true,
    completeButtonText = 'Bitir',
    onHideUI,
}: PresentationGameHudProps) {
    const scene: SceneConfig = getSceneForStep(currentStepIndex);
    const progressPct = totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 100;
    const currentLevel = Math.floor(currentStepIndex / 2) + 1;

    // mm:ss format
    const fmtTime = (s: number) => {
        const m = String(Math.floor(s / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        return `${m}:${sec}`;
    };

    const isLastStep = currentStepIndex === totalSteps - 1;

    return (
        <div className="w-full flex flex-col justify-between pointer-events-none select-none z-30">
            {/* ════════════ 1. ÜST 3D OYUN HUD BAR ════════════ */}
            <header className="w-full px-3 md:px-6 pt-3 pb-2 flex items-center justify-between gap-3 pointer-events-auto">
                {/* SOL: Seviye + XP + Altın */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Seviye Rozeti */}
                    <div
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border-3 shadow-xl backdrop-blur-md"
                        style={{
                            background: 'linear-gradient(180deg, #78350f 0%, #451a03 100%)',
                            borderColor: '#f59e0b',
                            boxShadow: '0 6px 18px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.25)',
                        }}
                    >
                        <Trophy size={18} className="text-amber-300 animate-pulse" />
                        <span className="text-xs md:text-sm font-black text-amber-100 uppercase tracking-wide">
                            Seviye {currentLevel}
                        </span>
                    </div>

                    {/* Altın Paralar */}
                    <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-3 shadow-xl backdrop-blur-md"
                        style={{
                            background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
                            borderColor: '#fbbf24',
                            boxShadow: '0 6px 18px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
                        }}
                    >
                        <span className="text-base">🪙</span>
                        <span className="text-xs md:text-sm font-black text-amber-100">
                            {score}
                        </span>
                    </div>

                    {/* Seri / Ateş */}
                    <div
                        className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border-2 shadow-lg"
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            borderColor: '#ef4444',
                        }}
                        title={`${currentStepIndex + 1} Adım Serisi`}
                    >
                        <Flame size={16} className="text-rose-500 animate-bounce" />
                        <span className="text-xs font-black text-rose-200">
                            {currentStepIndex + 1} Seri
                        </span>
                    </div>
                </div>

                {/* ORTA: Mevcut Sahne Rozeti + Parlayan XP Barı */}
                <div className="flex-1 max-w-md mx-2 flex flex-col items-center">
                    {/* Sahne Başlığı */}
                    <div
                        className="px-4 py-1 rounded-full border-2 text-[11px] md:text-xs font-black shadow-md flex items-center gap-1.5 mb-1 text-white"
                        style={{
                            background: 'rgba(15, 23, 42, 0.85)',
                            borderColor: scene.accentColor,
                            boxShadow: `0 0 14px ${scene.ambientGlow}`,
                        }}
                    >
                        <span>{scene.motifIcon}</span>
                        <span>{scene.realmTitle}</span>
                    </div>

                    {/* 3D Parlayan İlerleme (XP) Barı */}
                    <div className="w-full bg-slate-950/80 h-3 rounded-full border-2 border-white/20 p-0.5 shadow-inner relative overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 relative"
                            style={{
                                width: `${progressPct}%`,
                                background: 'linear-gradient(90deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)',
                                boxShadow: '0 0 12px 2px rgba(245, 158, 11, 0.7)',
                            }}
                        >
                            {/* Parlama Efekti */}
                            <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
                        </div>
                    </div>
                </div>

                {/* SAĞ: Süre + Tam Ekran + Kontroller */}
                <div className="flex items-center gap-2">
                    {/* Kronometre */}
                    <div
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 shadow-md text-sky-200 font-mono text-xs md:text-sm font-black"
                        style={{
                            background: 'rgba(12, 74, 110, 0.75)',
                            borderColor: '#38bdf8',
                        }}
                    >
                        <Timer size={16} className="text-sky-400" />
                        <span>{fmtTime(elapsedTime)}</span>
                    </div>

                    {/* Çark Butonu */}
                    {showWheelButton && onOpenWheel && (
                        <button
                            onClick={onOpenWheel}
                            className="px-3 py-1.5 rounded-2xl border-b-[4px] active:border-b-0 active:translate-y-1 transition-all flex items-center gap-1 text-xs font-black shadow-lg cursor-pointer"
                            style={{
                                background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                                borderColor: '#b45309',
                                color: '#451a03',
                            }}
                            title="Öğrenci Kura Çarkı (R)"
                        >
                            <span className="text-base">🎡</span>
                            <span className="hidden md:inline">Çark</span>
                        </button>
                    )}

                    {/* Tam Ekran Tuşu */}
                    <button
                        onClick={onToggleFullscreen}
                        className="p-2 rounded-2xl border-b-[4px] active:border-b-0 active:translate-y-1 transition-all text-amber-200 shadow-lg cursor-pointer"
                        style={{
                            background: 'linear-gradient(180deg, #78350f 0%, #451a03 100%)',
                            borderColor: '#b45309',
                        }}
                        title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
                    >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize2 size={18} />}
                    </button>

                    {/* Ses Aç / Kapa */}
                    {onToggleMute && (
                        <button
                            onClick={onToggleMute}
                            className="p-2 rounded-2xl border-b-[4px] active:border-b-0 active:translate-y-1 transition-all text-slate-200 shadow-lg cursor-pointer"
                            style={{
                                background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
                                borderColor: '#0f172a',
                            }}
                            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    )}
                </div>
            </header>

            {/* ════════════ 2. ALT 3D OYUN DOCK KONTROLLERİ ════════════ */}
            <footer className="w-full px-4 pb-3 pt-1 pointer-events-auto">
                <div
                    className="max-w-4xl mx-auto rounded-3xl border-4 p-2.5 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-2xl"
                    style={{
                        background: 'linear-gradient(180deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                        borderColor: '#f59e0b',
                        boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.25)',
                    }}
                >
                    {/* SOL: Önceki Sayfa */}
                    <button
                        onClick={onPrev}
                        disabled={currentStepIndex === 0}
                        className="px-4 py-2.5 rounded-2xl border-b-[5px] active:border-b-0 active:translate-y-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs md:text-sm font-black shadow-lg cursor-pointer text-white"
                        style={{
                            background: 'linear-gradient(180deg, #475569 0%, #1e293b 100%)',
                            borderColor: '#0f172a',
                        }}
                        title="Önceki Sayfa (Sol Ok)"
                    >
                        <ArrowLeft size={18} />
                        <span className="hidden sm:inline">Önceki</span>
                    </button>

                    {/* ORTA: Adım Sayacı ve Atla */}
                    <div className="flex items-center gap-2">
                        {onSkip && (
                            <button
                                onClick={onSkip}
                                className="px-3 py-1.5 rounded-xl border-b-[3px] active:border-b-0 active:translate-y-0.5 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                }}
                                title="Bu adımı geç"
                            >
                                Atla
                            </button>
                        )}

                        <div className="px-3.5 py-1 rounded-full bg-slate-950/80 border border-white/20 text-xs font-black text-amber-200">
                            {currentStepIndex + 1} / {totalSteps}
                        </div>
                    </div>

                    {/* SAĞ: Devam Et / İleri / Bitir (BÜYÜK 3D KABARTMALI BUTON) */}
                    <button
                        onClick={onNext}
                        disabled={!isNextButtonEnabled}
                        className="px-6 py-2.5 rounded-2xl border-b-[6px] active:border-b-0 active:translate-y-1.5 transition-all flex items-center gap-2 text-sm md:text-base font-black shadow-2xl cursor-pointer text-amber-950 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.03]"
                        style={{
                            background: !isNextButtonEnabled
                                ? '#94a3b8'
                                : hasUnrevealedItems
                                ? 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)'
                                : isLastStep
                                ? 'linear-gradient(180deg, #34d399 0%, #10b981 50%, #059669 100%)'
                                : 'linear-gradient(180deg, #fde047 0%, #eab308 50%, #ca8a04 100%)',
                            borderColor: !isNextButtonEnabled
                                ? '#64748b'
                                : hasUnrevealedItems
                                ? '#b45309'
                                : isLastStep
                                ? '#047857'
                                : '#a16207',
                            boxShadow: '0 8px 25px rgba(245, 158, 11, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.6)',
                        }}
                        title={
                            !isNextButtonEnabled
                                ? 'Bu adımı tamamlayınız'
                                : hasUnrevealedItems
                                ? 'İçeriği Keşfet'
                                : isLastStep
                                ? 'Dersi Tamamla'
                                : 'Sonraki Sayfa (Sağ Ok)'
                        }
                    >
                        {!isNextButtonEnabled ? (
                            <>
                                <span>Kilitli</span>
                                <Lock size={18} />
                            </>
                        ) : hasUnrevealedItems ? (
                            <>
                                <span>Devam Et ({currentRevealCount}/{totalRevealCount})</span>
                                <Sparkles size={18} className="text-amber-800 animate-pulse" />
                            </>
                        ) : isLastStep ? (
                            <>
                                <span>{completeButtonText}</span>
                                <PartyPopper size={18} />
                            </>
                        ) : (
                            <>
                                <span>İleri</span>
                                <ArrowRight size={18} className="stroke-[3]" />
                            </>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    );
}
