'use client';

import React from 'react';
import { 
    ArrowLeft, ArrowRight, Sparkles, Trophy, RotateCcw, 
    PartyPopper, Lock 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PresentationWoodenTrayProps {
    currentStepIndex: number;
    totalSteps: number;
    score: number;
    onPrev: () => void;
    onNext: () => void;
    onSkip?: () => void;
    onRestart?: () => void;
    isNextButtonEnabled?: boolean;
    hasUnrevealedItems?: boolean;
    currentRevealCount?: number;
    totalRevealCount?: number;
    completeButtonText?: string;
}

export function PresentationWoodenTray({
    currentStepIndex,
    totalSteps,
    score,
    onPrev,
    onNext,
    onSkip,
    onRestart,
    isNextButtonEnabled = true,
    hasUnrevealedItems = false,
    currentRevealCount = 1,
    totalRevealCount = 1,
    completeButtonText = 'Dersi Tamamla',
}: PresentationWoodenTrayProps) {
    const isLastStep = currentStepIndex === totalSteps - 1;
    const progressPct = totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 100;

    return (
        <footer className="w-full relative z-30 pb-1 pt-0.5 px-2 md:px-4 select-none pointer-events-auto">
            {/* ═════════ 3D OYMALI AHŞAP VE ALTIN RAF (WOODEN CONSOLE TRAY) ═════════ */}
            <div 
                className="max-w-5xl mx-auto rounded-2xl border-2 sm:border-3 p-1.5 sm:p-2 flex items-center justify-between gap-2 sm:gap-3 shadow-xl relative overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg, #78350f 0%, #451a03 40%, #1f0b02 100%)',
                    borderColor: '#f59e0b',
                    boxShadow: '0 -6px 25px rgba(0,0,0,0.8), inset 0 2px 3px rgba(255,255,255,0.35), inset 0 -2px 3px rgba(0,0,0,0.6)',
                }}
            >
                {/* Ahşap Doku Çizgileri */}
                <div 
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(0,0,0,0.4) 24px, rgba(0,0,0,0.4) 26px)',
                    }}
                />

                {/* ═════════ SOL: 3D YUVARLAK YENİDEN BAŞLA & ÖNCEKİ SAYFA BUTONLARI ═════════ */}
                <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                    
                    {/* 1. 3D Mor Yeniden Başla / Başa Sar Butonu */}
                    {onRestart && (
                        <button
                            onClick={onRestart}
                            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 border-purple-300 border-b-[3px] border-b-purple-950 text-white font-black text-xs shadow-md active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer hover:brightness-110"
                            style={{
                                background: 'linear-gradient(180deg, #a855f7 0%, #7e22ce 60%, #581c87 100%)',
                                boxShadow: '0 4px 12px rgba(126, 34, 206, 0.4), inset 0 1px 2px rgba(255,255,255,0.5)',
                            }}
                            title="Bu adımı baştan başlat"
                        >
                            <RotateCcw size={14} />
                            <span>Yeniden</span>
                        </button>
                    )}

                    {/* 2. 3D Önceki Sayfa Butonu */}
                    <button
                        onClick={onPrev}
                        disabled={currentStepIndex === 0}
                        className={cn(
                            "px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border-2 border-amber-300 border-b-[3px] border-b-amber-950 flex items-center gap-1 text-xs sm:text-sm font-black shadow-md active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer text-amber-950",
                            currentStepIndex === 0 && "opacity-35 cursor-not-allowed border-slate-600"
                        )}
                        style={{
                            background: currentStepIndex === 0 
                                ? '#475569' 
                                : 'linear-gradient(180deg, #fef08a 0%, #f59e0b 60%, #d97706 100%)',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35), inset 0 1px 2px rgba(255,255,255,0.6)',
                        }}
                        title="Önceki Sayfaya Dön (Sol Ok)"
                    >
                        <ArrowLeft size={16} className="stroke-[3]" />
                        <span className="hidden sm:inline">Önceki</span>
                    </button>
                </div>

                {/* ═════════ ORTA: 3D ADIM CEVAHİRLERİ (STEP GEMS) & İLERLEME ═════════ */}
                <div className="relative z-10 flex-1 flex flex-col items-center max-w-xs mx-2">
                    {/* Adım Taşları */}
                    <div className="flex items-center gap-1.5 overflow-hidden py-0.5">
                        {Array.from({ length: Math.min(totalSteps, 12) }).map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "rounded-full transition-all duration-300 shadow-sm",
                                    idx === currentStepIndex
                                        ? "w-5 h-2.5 bg-gradient-to-r from-yellow-300 to-amber-400 border border-white shadow-[0_0_10px_#fde047]"
                                        : idx < currentStepIndex
                                        ? "w-2.5 h-2.5 bg-emerald-400 border border-emerald-200"
                                        : "w-2 h-2 bg-black/40 border border-white/20"
                                )}
                            />
                        ))}
                    </div>

                    {/* Adım Rozeti */}
                    <div className="px-2.5 py-0.5 rounded-full bg-black/50 border border-amber-400/40 text-[9px] md:text-[10px] font-black text-amber-200">
                        Adım {currentStepIndex + 1} / {totalSteps}
                    </div>
                </div>

                {/* ═════════ SAĞ: 3D ALTIN HAZİNE SANDIĞI & DEV 3D İLERİ BUTONU ═════════ */}
                <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                    
                    {/* 1. Atla Butonu */}
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="hidden sm:inline-block px-2.5 py-1 rounded-lg text-xs font-bold text-amber-200/70 hover:text-white transition-colors cursor-pointer"
                            title="Bu adımı geç"
                        >
                            Atla
                        </button>
                    )}

                    {/* 2. 3D Parlayan Altın Hazine Sandığı Rozeti */}
                    <div 
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl border-2 border-amber-300 shadow-md"
                        style={{
                            background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
                            boxShadow: '0 3px 10px rgba(245, 158, 11, 0.35)',
                        }}
                    >
                        <span className="text-base md:text-lg filter drop-shadow">
                            🎁
                        </span>
                        <div className="flex flex-col leading-none pr-0.5">
                            <span className="text-[8px] font-black text-amber-300 uppercase tracking-wider">
                                Başarı
                            </span>
                            <span className="text-[11px] md:text-xs font-black text-white">
                                %{progressPct}
                            </span>
                        </div>
                    </div>

                    {/* 3. 3D KABARTMALI İLERİ / BİTİR BUTONU */}
                    <button
                        onClick={onNext}
                        disabled={!isNextButtonEnabled}
                        className={cn(
                            "px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border-2 sm:border-3 border-amber-200 border-b-[4px] sm:border-b-[5px] flex items-center gap-1.5 text-xs sm:text-sm md:text-base font-black text-amber-950 shadow-xl active:border-b-2 active:translate-y-1 transition-all cursor-pointer hover:brightness-105 hover:scale-[1.01]",
                            !isNextButtonEnabled && "opacity-40 cursor-not-allowed border-slate-500"
                        )}
                        style={{
                            background: !isNextButtonEnabled
                                ? '#64748b'
                                : isLastStep
                                ? 'linear-gradient(180deg, #a7f3d0 0%, #10b981 50%, #047857 100%)'
                                : hasUnrevealedItems
                                ? 'linear-gradient(180deg, #fef08a 0%, #f59e0b 50%, #d97706 100%)'
                                : 'linear-gradient(180deg, #fef08a 0%, #f59e0b 50%, #ca8a04 100%)',
                            borderBottomColor: !isNextButtonEnabled
                                ? '#334155'
                                : isLastStep
                                ? '#064e3b'
                                : '#78350f',
                            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.5), inset 0 2px 3px rgba(255,255,255,0.7)',
                        }}
                        title={isLastStep ? 'Dersi Bitir' : 'Sonraki Sayfaya Geç (Sağ Ok)'}
                    >
                        {!isNextButtonEnabled ? (
                            <>
                                <span>Kilitli</span>
                                <Lock size={15} />
                            </>
                        ) : hasUnrevealedItems ? (
                            <>
                                <span>Keşfet ({currentRevealCount}/{totalRevealCount})</span>
                                <Sparkles size={16} className="text-amber-800 animate-spin" />
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
            </div>
        </footer>
    );
}
