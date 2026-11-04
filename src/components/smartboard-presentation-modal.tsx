'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { NOTEBOOK_SHEET_CSS } from '@/lib/notebook-sheet-template';
import { 
    X, Maximize2, Minimize2, ZoomIn, ZoomOut, 
    ChevronLeft, ChevronRight, RotateCcw, Sparkles 
} from 'lucide-react';

export interface SmartboardSectionItem {
    index: number;
    title: string;
    colorClass: string;
    html: string;
}

interface SmartboardPresentationModalProps {
    isOpen: boolean;
    onClose: () => void;
    sections: SmartboardSectionItem[];
    initialIndex?: number;
}

export function SmartboardPresentationModal({
    isOpen,
    onClose,
    sections,
    initialIndex = 0
}: SmartboardPresentationModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1.35);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex >= 0 && initialIndex < sections.length ? initialIndex : 0);
            setScale(1.35);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, initialIndex, sections.length]);

    // Track fullscreen status
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
            document.exitFullscreen?.().catch(() => {});
        }
    }, []);

    const handleNext = useCallback(() => {
        if (currentIndex < sections.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentIndex, sections.length]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex]);

    const handleZoomIn = useCallback(() => {
        setScale(prev => Math.min(2.5, +(prev + 0.15).toFixed(2)));
    }, []);

    const handleZoomOut = useCallback(() => {
        setScale(prev => Math.max(0.85, +(prev - 0.15).toFixed(2)));
    }, []);

    const handleZoomReset = useCallback(() => {
        setScale(1.0);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                handleZoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                handleZoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                handleZoomReset();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleNext, handlePrev, handleZoomIn, handleZoomOut, handleZoomReset, onClose]);

    if (!isOpen || !sections || sections.length === 0) return null;

    const currentSection = sections[currentIndex] || sections[0];

    return (
        <div 
            className="fixed inset-0 z-[9999999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-stretch p-2 sm:p-3 overflow-hidden select-text"
            style={{ fontFamily: "'Patrick Hand', 'Neucha', cursive, sans-serif" }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Load Google Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Patrick+Hand&display=swap" rel="stylesheet" />

            {/* Injected CSS for notebook sheet components */}
            <style dangerouslySetInnerHTML={{ __html: NOTEBOOK_SHEET_CSS }} />

            {/* Scoped CSS overrides to guarantee zero overlap and correct 2-column row flow on Smartboard presentation */}
            <style dangerouslySetInnerHTML={{ __html: `
                .smartboard-card-wrap .concepts-grid {
                    display: grid !important;
                    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                    grid-auto-rows: minmax(min-content, max-content) !important;
                    grid-template-rows: auto !important;
                    gap: calc(18px * var(--sb-scale, 1.3)) !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: min-content !important;
                    align-content: start !important;
                    align-items: stretch !important;
                    margin-bottom: 30px !important;
                }
                @media (max-width: 900px) {
                    .smartboard-card-wrap .concepts-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                }
                @media (max-width: 600px) {
                    .smartboard-card-wrap .concepts-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
                .smartboard-card-wrap .concept-card,
                .smartboard-card-wrap .concept-item {
                    padding: calc(14px * var(--sb-scale, 1.3)) calc(18px * var(--sb-scale, 1.3)) !important;
                    height: auto !important;
                    min-height: fit-content !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-start !important;
                    align-items: flex-start !important;
                    gap: calc(8px * var(--sb-scale, 1.3)) !important;
                    border-radius: 16px !important;
                    border: 2px solid rgba(0,0,0,0.12) !important;
                    background: rgba(255,255,255,0.95) !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.04) !important;
                    box-sizing: border-box !important;
                    overflow: visible !important;
                }
                .smartboard-card-wrap .concept-badge,
                .smartboard-card-wrap .c-tag {
                    font-size: calc(20px * var(--sb-scale, 1.3)) !important;
                    padding: calc(4px * var(--sb-scale, 1.3)) calc(14px * var(--sb-scale, 1.3)) !important;
                    border-radius: 14px !important;
                    display: inline-block !important;
                    width: fit-content !important;
                    max-width: 100% !important;
                    font-weight: bold !important;
                    margin-bottom: calc(6px * var(--sb-scale, 1.3)) !important;
                    flex-shrink: 0 !important;
                    white-space: normal !important;
                }
                .smartboard-card-wrap .concept-card p,
                .smartboard-card-wrap .concept-card .concept-desc,
                .smartboard-card-wrap .concept-card .concept-text,
                .smartboard-card-wrap .concept-item p,
                .smartboard-card-wrap .concept-item .concept-desc {
                    font-size: calc(18px * var(--sb-scale, 1.3)) !important;
                    line-height: 1.5 !important;
                    color: #1e293b !important;
                    margin: 0 !important;
                    flex: 1 1 auto !important;
                    width: 100% !important;
                    word-break: normal !important;
                    overflow-wrap: break-word !important;
                }
                .smartboard-card-wrap .columns-2,
                .smartboard-card-wrap .grid-2 {
                    display: grid !important;
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    grid-auto-flow: row !important;
                    columns: auto !important;
                    column-count: auto !important;
                    grid-template-rows: auto !important;
                    grid-auto-rows: minmax(min-content, max-content) !important;
                    gap: calc(20px * var(--sb-scale, 1.3)) !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: min-content !important;
                    box-sizing: border-box !important;
                    margin-bottom: 24px !important;
                }
                @media (max-width: 768px) {
                    .smartboard-card-wrap .columns-2,
                    .smartboard-card-wrap .grid-2 {
                        grid-template-columns: 1fr !important;
                    }
                }
                .smartboard-card-wrap .list-item {
                    font-size: calc(20px * var(--sb-scale, 1.3)) !important;
                    margin-bottom: calc(14px * var(--sb-scale, 1.3)) !important;
                    gap: calc(14px * var(--sb-scale, 1.3)) !important;
                    line-height: 1.55 !important;
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: flex-start !important;
                    height: auto !important;
                    padding: 6px 8px !important;
                    box-sizing: border-box !important;
                }
                .smartboard-card-wrap .bullet-num {
                    width: calc(36px * var(--sb-scale, 1.3)) !important;
                    height: calc(36px * var(--sb-scale, 1.3)) !important;
                    min-width: calc(36px * var(--sb-scale, 1.3)) !important;
                    font-size: calc(19px * var(--sb-scale, 1.3)) !important;
                    flex-shrink: 0 !important;
                }
            ` }} />

            {/* Floating Top Presentation Toolbar - 100% Screen Width */}
            <header 
                className="w-full bg-slate-900 border-2 border-slate-700/80 rounded-2xl px-5 py-2 flex items-center justify-between gap-3 shadow-2xl text-white flex-wrap sticky top-0 z-30 mb-2 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Section Info */}
                <div className="flex items-center gap-3">
                    <span className="bg-sky-600 text-white font-bold text-xs px-2.5 py-1 rounded-xl border border-sky-400/50 flex items-center gap-1.5 shadow-sm">
                        <span>🕌</span>
                        <span>DinDersi Atölyesi</span>
                    </span>
                    <span className="bg-yellow-400 text-slate-900 font-black text-sm px-3.5 py-1 rounded-xl border border-slate-900 flex items-center gap-1.5 shadow-sm">
                        <span>📌</span>
                        <span>{currentIndex + 1} / {sections.length}</span>
                    </span>
                    <strong className="text-xl md:text-3xl text-cyan-400 tracking-wide font-normal truncate max-w-[260px] md:max-w-xl" style={{ fontFamily: "'Caveat', cursive" }}>
                        {currentSection.title?.replace(/sınavda kesin çıkar!?\s*🎯?/gi, '').replace(/sınav\w*/gi, '').trim() || `Bölüm ${currentIndex + 1}`}
                    </strong>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Font Size Adjuster */}
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1">
                        <span className="text-xs text-slate-400 font-sans mr-1 hidden sm:inline">Yazı Boyutu:</span>
                        <button
                            type="button"
                            onClick={handleZoomOut}
                            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-1 text-sm font-bold transition-all cursor-pointer active:scale-95"
                            title="Yazıyı Küçült (-)"
                        >
                            A-
                        </button>
                        <span className="text-xs font-mono font-bold text-yellow-400 min-w-[46px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={handleZoomIn}
                            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-1 text-sm font-bold transition-all cursor-pointer active:scale-95"
                            title="Yazıyı Büyüt (+)"
                        >
                            A+
                        </button>
                        <button
                            type="button"
                            onClick={handleZoomReset}
                            className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-all cursor-pointer"
                            title="Varsayılan Boyut (%100)"
                        >
                            %100
                        </button>
                    </div>

                    {/* Section Navigation Buttons */}
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
                        <button
                            type="button"
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className="bg-slate-800 hover:bg-cyan-600 disabled:opacity-40 disabled:hover:bg-slate-800 text-white border border-slate-600 rounded-lg px-3.5 py-1 text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                            title="Önceki Bölüm (Sol Ok)"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Önceki</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={currentIndex === sections.length - 1}
                            className="bg-slate-800 hover:bg-cyan-600 disabled:opacity-40 disabled:hover:bg-slate-800 text-white border border-slate-600 rounded-lg px-3.5 py-1 text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                            title="Sonraki Bölüm (Sağ Ok)"
                        >
                            <span className="hidden sm:inline">Sonraki</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Fullscreen & Close */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 rounded-xl px-3.5 py-1.5 text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                            title="Ekranı Kapla"
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            <span className="hidden md:inline">{isFullscreen ? 'Normal Boyut' : 'Tam Ekran'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 rounded-xl px-3.5 py-1.5 text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                            title="Kapat (ESC)"
                        >
                            <X className="w-4 h-4" />
                            <span>Kapat</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Stage Card Presentation Wrap - 100% Screen Width and full height */}
            <main 
                className="w-full flex-1 min-h-0 flex flex-col items-stretch justify-stretch pb-1 overflow-hidden"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div 
                    className={`smartboard-card-wrap w-full flex-1 min-h-0 flex flex-col justify-start bg-white rounded-2xl border-4 border-slate-900 shadow-2xl p-6 md:p-8 text-slate-900 relative transition-all duration-150 overflow-y-auto ${currentSection.colorClass || 'box-cyan'}`}
                    style={{
                        ['--sb-scale' as any]: scale,
                        boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div 
                        className="w-full flex-shrink-0 flex flex-col"
                        style={{ minHeight: '100%', height: 'auto' }}
                        dangerouslySetInnerHTML={{ __html: currentSection.html }} 
                    />
                </div>
            </main>
        </div>
    );
}
