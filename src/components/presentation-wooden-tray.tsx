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
        <footer className="w-full relative z-30 pb-3 pt-1 px-3 md:px-6 select-none pointer-events-auto">
            {/* ═════════ 3D OYMALI AHŞAP VE ALTIN RAF (WOODEN CONSOLE TRAY) ═════════ */}
            <div 
                className="max-w-6xl mx-auto rounded-3xl md:rounded-[2rem] border-4 p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-2xl relative overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg, #78350f 0%, #451a03 40%, #1f0b02 100%)',
                    borderColor: '#f59e0b',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.85), inset 0 3px 5px rgba(255,255,255,0.35), inset 0 -3px 5px rgba(0,0,0,0.7)',
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
                <div className="relative z-10 flex items-center gap-2">
                    
                    {/* 1. 3D Mor Yeniden Başla / Başa Sar Butonu */}
                    {onRestart && (
                        <button
                            onClick={onRestart}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 border-purple-300 border-b-[5px] border-b-purple-950 text-white font-black text-xs shadow-xl active:border-b-0 active:translate-y-1 transition-all cursor-pointer hover:brightness-110"
                            style={{
                                background: 'linear-gradient(180deg, #a855f7 0%, #7e22ce 60%, #581c87 100%)',
                                boxShadow: '0 6px 18px rgba(126, 34, 206, 0.45), inset 0 2px 3px rgba(255,255,255,0.5)',
                            }}
                            title="Bu adımı baştan başlat"
                        >
                            <RotateCcw size={15} />
                            <span>Yeniden</span>
                        </button>
                    )}

                    {/* 2. 3D Önceki Sayfa Butonu */}
                    <button
                        onClick={onPrev}
                        disabled={currentStepIndex === 0}
                        className={cn(
                            "px-4 py-2.5 rounded-2xl border-2 border-amber-300 border-b-[5px] border-b-amber-950 flex items-center gap-1.5 text-xs md:text-sm font-black shadow-xl active:border-b-0 active:translate-y-1 transition-all cursor-pointer text-amber-950",
                            currentStepIndex === 0 && "opacity-35 cursor-not-allowed border-slate-600"
                        )}
                        style={{
                            background: currentStepIndex === 0 
                                ? '#475569' 
                                : 'linear-gradient(180deg, #fef08a 0%, #f59e0b 60%, #d97706 100%)',
                            boxShadow: '0 6px 18px rgba(245, 158, 11, 0.4), inset 0 2px 3px rgba(255,255,255,0.6)',
                        }}
                        title="Önceki Sayfaya Dön (Sol Ok)"
                    >
                        <ArrowLeft size={18} className="stroke-[3]" />
                        <span className="hidden sm:inline">Önceki</span>
                    </button>
                </div>

                {/* ═════════ ORTA: 3D ADIM CEVAHİRLERİ (STEP GEMS) & İLERLEME ═════════ */}
                <div className="relative z-10 flex-1 flex flex-col items-center max-w-sm mx-2">
                    {/* Adım Taşları */}
                    <div className="flex items-center gap-1.5 overflow-hidden py-1">
                        {Array.from({ length: Math.min(totalSteps, 12) }).map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "rounded-full transition-all duration-300 shadow-md",
                                    idx === currentStepIndex
                                        ? "w-6 h-3 bg-gradient-to-r from-yellow-300 to-amber-400 border-2 border-white shadow-[0_0_12px_#fde047]"
                                        : idx < currentStepIndex
                                        ? "w-3 h-3 bg-emerald-400 border border-emerald-200"
                                        : "w-2.5 h-2.5 bg-black/40 border border-white/20"
                                )}
                            />
                        ))}
                    </div>

                    {/* Adım Rozeti */}
                    <div className="px-3 py-0.5 rounded-full bg-black/50 border border-amber-400/40 text-[10px] md:text-xs font-black text-amber-200">
                        Adım {currentStepIndex + 1} / {totalSteps}
                    </div>
                </div>

                {/* ═════════ SAĞ: 3D ALTIN HAZİNE SANDIĞI & DEV 3D İLERİ BUTONU ═════════ */}
                <div className="relative z-10 flex items-center gap-2 md:gap-3">
                    
                    {/* 1. Atla Butonu */}
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="hidden sm:inline-block px-3 py-1.5 rounded-xl text-xs font-bold text-amber-200/70 hover:text-white transition-colors cursor-pointer"
                            title="Bu adımı geç"
                        >
                            Atla
                        </button>
                    )}

                    {/* 2. 3D Parlayan Altın Hazine Sandığı Rozeti */}
                    <div 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-amber-300 shadow-xl"
                        style={{
                            background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4), inset 0 1px 2px rgba(255,255,255,0.4)',
                        }}
                    >
                        {/* Sandık İkonu */}
                        <span className="text-xl md:text-2xl filter drop-shadow animate-bounce duration-1000">
                            🎁
                        </span>
                        <div className="flex flex-col leading-none pr-0.5">
                            <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider">
                                Başarı
                            </span>
                            <span className="text-xs md:text-sm font-black text-white">
                                %{progressPct}
                            </span>
                        </div>
                    </div>

                    {/* 3. DEV 3D KABARTMALI İLERİ / BİTİR BUTONU */}
                    <button
                        onClick={onNext}
                        disabled={!isNextButtonEnabled}
                        className={cn(
                            "px-5 sm:px-7 py-2.5 sm:py-3 rounded-2xl md:rounded-3xl border-3 border-amber-200 border-b-[6px] md:border-b-[8px] flex items-center gap-2 text-sm sm:text-base md:text-lg font-black text-amber-950 shadow-2xl active:border-b-2 active:translate-y-1.5 transition-all cursor-pointer hover:brightness-105 hover:scale-[1.02]",
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
                            boxShadow: '0 8px 30px rgba(245, 158, 11, 0.6), inset 0 2px 4px rgba(255,255,255,0.7)',
                        }}
                        title={isLastStep ? 'Dersi Bitir' : 'Sonraki Sayfaya Geç (Sağ Ok)'}
                    >
                        {!isNextButtonEnabled ? (
                            <>
                                <span>Kilitli</span>
                                <Lock size={18} />
                            </>
                        ) : hasUnrevealedItems ? (
                            <>
                                <span>Keşfet ({currentRevealCount}/{totalRevealCount})</span>
                                <Sparkles size={18} className="text-amber-800 animate-spin" />
                            </>
                        ) : isLastStep ? (
                            <>
                                <span>{completeButtonText}</span>
                                <PartyPopper size={20} />
                            </>
                        ) : (
                            <>
                                <span>İleri</span>
                                <ArrowRight size={20} className="stroke-[3]" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </footer>
    );
}
