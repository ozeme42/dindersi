'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    Sparkles, Crown, Zap, Flame, Star, Gem, Feather, Volume2, VolumeX 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { motion } from 'framer-motion';
import { prepareTurkishSpeech, getBestTurkishVoice, getTurkishSpeechParams } from '../tts-helper';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

export const CONCEPT_THEMES = [
    { 
        id: 'sky',
        card: 'bg-gradient-to-br from-sky-600/95 via-blue-700/90 to-indigo-950/95 border-2 border-sky-300/70 shadow-[0_12px_40px_-6px_rgba(14,165,233,0.5)] hover:shadow-[0_16px_50px_-4px_rgba(14,165,233,0.7)] text-white',
        topLine: 'from-transparent via-sky-200 to-transparent',
        numBadge: 'bg-white/20 text-white border border-white/40 shadow-sm',
        typeBadge: 'bg-sky-400/25 text-sky-100 border border-sky-300/40',
        defBox: 'bg-black/40 border border-white/20 text-sky-50 shadow-inner',
        icon: Sparkles,
        iconColor: 'text-amber-300'
    },
    { 
        id: 'purple',
        card: 'bg-gradient-to-br from-purple-600/95 via-violet-700/90 to-indigo-950/95 border-2 border-purple-300/70 shadow-[0_12px_40px_-6px_rgba(168,85,247,0.5)] hover:shadow-[0_16px_50px_-4px_rgba(168,85,247,0.7)] text-white',
        topLine: 'from-transparent via-purple-200 to-transparent',
        numBadge: 'bg-white/20 text-white border border-white/40 shadow-sm',
        typeBadge: 'bg-purple-400/25 text-purple-100 border border-purple-300/40',
        defBox: 'bg-black/40 border border-white/20 text-purple-50 shadow-inner',
        icon: Crown,
        iconColor: 'text-amber-300'
    },
    { 
        id: 'emerald',
        card: 'bg-gradient-to-br from-emerald-600/95 via-teal-700/90 to-green-950/95 border-2 border-emerald-300/70 shadow-[0_12px_40px_-6px_rgba(16,185,129,0.5)] hover:shadow-[0_16px_50px_-4px_rgba(16,185,129,0.7)] text-white',
        topLine: 'from-transparent via-emerald-200 to-transparent',
        numBadge: 'bg-white/20 text-white border border-white/40 shadow-sm',
        typeBadge: 'bg-emerald-400/25 text-emerald-100 border border-emerald-300/40',
        defBox: 'bg-black/40 border border-white/20 text-emerald-50 shadow-inner',
        icon: Zap,
        iconColor: 'text-emerald-300'
    },
    { 
        id: 'amber',
        card: 'bg-gradient-to-br from-amber-500/95 via-orange-600/90 to-red-950/95 border-2 border-amber-300/70 shadow-[0_12px_40px_-6px_rgba(245,158,11,0.5)] hover:shadow-[0_16px_50px_-4px_rgba(245,158,11,0.7)] text-white',
        topLine: 'from-transparent via-amber-200 to-transparent',
        numBadge: 'bg-white/20 text-white border border-white/40 shadow-sm',
        typeBadge: 'bg-amber-400/25 text-amber-100 border border-amber-300/40',
        defBox: 'bg-black/40 border border-white/20 text-amber-50 shadow-inner',
        icon: Flame,
        iconColor: 'text-amber-200'
    },
    { 
        id: 'rose',
        card: 'bg-gradient-to-br from-rose-600/95 via-pink-700/90 to-rose-950/95 border-2 border-rose-300/70 shadow-[0_12px_40px_-6px_rgba(244,63,94,0.5)] hover:shadow-[0_16px_50px_-4px_rgba(244,63,94,0.7)] text-white',
        topLine: 'from-transparent via-rose-200 to-transparent',
        numBadge: 'bg-white/20 text-white border border-white/40 shadow-sm',
        typeBadge: 'bg-rose-400/25 text-rose-100 border border-rose-300/40',
        defBox: 'bg-black/40 border border-white/20 text-rose-50 shadow-inner',
        icon: Star,
        iconColor: 'text-amber-300'
    },
    { 
        id: 'cyan',
        card: 'bg-gradient-to-br from-cyan-600/95 via-teal-700/90 to-blue-950/95 border-2 border-cyan-300/70 shadow-[0_12px_40px_-6px_rgba(6,182,212,0.5)] hover:shadow-[0_16px_50px_-4px_rgba(6,182,212,0.7)] text-white',
        topLine: 'from-transparent via-cyan-200 to-transparent',
        numBadge: 'bg-white/20 text-white border border-white/40 shadow-sm',
        typeBadge: 'bg-cyan-400/25 text-cyan-100 border border-cyan-300/40',
        defBox: 'bg-black/40 border border-white/20 text-cyan-50 shadow-inner',
        icon: Gem,
        iconColor: 'text-cyan-300'
    },
    { 
        id: 'indigo',
        card: 'bg-gradient-to-br from-indigo-600/95 via-blue-700/90 to-slate-950/95 border-2 border-indigo-300/70 shadow-[0_12px_40px_-6px_rgba(99,102,241,0.5)] hover:shadow-[0_16px_50px_-4px_rgba(99,102,241,0.7)] text-white',
        topLine: 'from-transparent via-indigo-200 to-transparent',
        numBadge: 'bg-white/20 text-white border border-white/40 shadow-sm',
        typeBadge: 'bg-indigo-400/25 text-indigo-100 border border-indigo-300/40',
        defBox: 'bg-black/40 border border-white/20 text-indigo-50 shadow-inner',
        icon: Feather,
        iconColor: 'text-indigo-300'
    },
    { 
        id: 'orange',
        card: 'bg-gradient-to-br from-orange-600/95 via-red-600/90 to-amber-950/95 border-2 border-orange-300/70 shadow-[0_12px_40px_-6px_rgba(249,115,22,0.5)] hover:shadow-[0_16px_50px_-4px_rgba(249,115,22,0.7)] text-white',
        topLine: 'from-transparent via-orange-200 to-transparent',
        numBadge: 'bg-white/20 text-white border border-white/40 shadow-sm',
        typeBadge: 'bg-orange-400/25 text-orange-100 border border-orange-300/40',
        defBox: 'bg-black/40 border border-white/20 text-orange-50 shadow-inner',
        icon: Sparkles,
        iconColor: 'text-amber-300'
    },
];

export function getConceptCardFontSize(
    conceptText: string, 
    hasDefinition: boolean = false, 
    cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'sm', 
    isTeacher: boolean = false, 
    totalConceptCards: number = 1
) {
    const words = (conceptText || '').trim().split(/\s+/).filter(Boolean);
    const maxWordLen = words.length > 0 ? Math.max(...words.map(w => w.length)) : 0;
    const totalLen = (conceptText || '').length;
    const isMultiColumn = totalConceptCards >= 4;

    if (hasDefinition) {
        if (cardScale === 'xl') {
            if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl";
            if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl md:text-3xl";
            return isTeacher ? "text-3xl sm:text-4xl md:text-5xl" : "text-2xl sm:text-3xl md:text-4xl";
        }
        if (cardScale === 'lg') {
            if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-lg sm:text-xl md:text-2xl" : "text-base sm:text-lg md:text-xl";
            if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl";
            return isTeacher ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl md:text-3xl";
        }
        if (cardScale === 'md') {
            if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base md:text-lg";
            if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-lg sm:text-xl md:text-2xl" : "text-base sm:text-lg md:text-xl";
            return isTeacher ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl";
        }
        if (cardScale === 'xs') {
            if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-xs sm:text-sm" : "text-xs";
            if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-sm sm:text-base" : "text-xs sm:text-sm";
            return isTeacher ? "text-base sm:text-lg" : "text-sm sm:text-base";
        }
        if (isMultiColumn) {
            if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-xs sm:text-sm md:text-base" : "text-xs sm:text-sm";
            if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-sm sm:text-base md:text-lg" : "text-xs sm:text-sm md:text-base";
            return isTeacher ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base md:text-lg";
        }
        if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-sm sm:text-base md:text-lg" : "text-xs sm:text-sm md:text-base";
        if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base md:text-lg";
        return isTeacher ? "text-lg sm:text-xl md:text-2xl" : "text-base sm:text-lg md:text-xl";
    }

    if (cardScale === 'xl') {
        if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl md:text-3xl";
        if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-3xl sm:text-4xl md:text-5xl" : "text-2xl sm:text-3xl md:text-4xl";
        if (maxWordLen > 5 || totalLen > 10) return isTeacher ? "text-4xl sm:text-5xl md:text-6xl" : "text-3xl sm:text-4xl md:text-5xl";
        return isTeacher ? "text-5xl sm:text-6xl md:text-7xl" : "text-4xl sm:text-5xl md:text-6xl";
    }
    if (cardScale === 'lg') {
        if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl";
        if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl md:text-3xl";
        if (maxWordLen > 5 || totalLen > 10) return isTeacher ? "text-3xl sm:text-4xl md:text-5xl" : "text-2xl sm:text-3xl md:text-4xl";
        return isTeacher ? "text-4xl sm:text-5xl md:text-6xl" : "text-3xl sm:text-4xl md:text-5xl";
    }
    if (cardScale === 'md') {
        if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-lg sm:text-xl md:text-2xl" : "text-base sm:text-lg md:text-xl";
        if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl";
        if (maxWordLen > 5 || totalLen > 10) return isTeacher ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl md:text-3xl";
        return isTeacher ? "text-3xl sm:text-4xl md:text-5xl" : "text-2xl sm:text-3xl md:text-4xl";
    }
    if (cardScale === 'xs') {
        if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-xs sm:text-sm" : "text-xs";
        if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-sm sm:text-base" : "text-xs sm:text-sm";
        if (maxWordLen > 5 || totalLen > 10) return isTeacher ? "text-base sm:text-lg" : "text-sm sm:text-base";
        return isTeacher ? "text-lg sm:text-xl" : "text-base sm:text-lg";
    }
    if (isMultiColumn) {
        if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-sm sm:text-base md:text-lg" : "text-xs sm:text-sm md:text-base";
        if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base md:text-lg";
        if (maxWordLen > 5 || totalLen > 10) return isTeacher ? "text-lg sm:text-xl md:text-2xl" : "text-base sm:text-lg md:text-xl";
        return isTeacher ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl";
    }
    if (maxWordLen > 13 || totalLen > 24) return isTeacher ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base md:text-lg";
    if (maxWordLen > 9 || totalLen > 16) return isTeacher ? "text-lg sm:text-xl md:text-2xl" : "text-base sm:text-lg md:text-xl";
    if (maxWordLen > 5 || totalLen > 10) return isTeacher ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl";
    return isTeacher ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl md:text-3xl";
}

export function ConceptCardItem({
    item,
    currentNum,
    theme,
    isLatest,
    showNewBadge,
    hasDefinition,
    cardScale,
    scaleStyles,
    isTeacher,
    totalConceptCards,
    scrollRef,
    onSpeak,
    isSpeaking
}: {
    item: { concept: string; definition?: string };
    currentNum: number;
    theme: any;
    isLatest: boolean;
    showNewBadge: boolean;
    hasDefinition: boolean;
    cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    scaleStyles: { minHeight: string; padding: string };
    isTeacher: boolean;
    totalConceptCards: number;
    scrollRef: any;
    onSpeak?: () => void;
    isSpeaking?: boolean;
}) {
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleTextRef = useRef<HTMLHeadingElement>(null);
    const defContainerRef = useRef<HTMLDivElement>(null);
    const defTextRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const container = titleContainerRef.current;
        const text = titleTextRef.current;
        if (!container || !text) return;

        text.style.fontSize = '';
        let fs = parseFloat(window.getComputedStyle(text).fontSize);
        const minFs = hasDefinition ? 11 : 12;
        let iterations = 0;

        while ((text.scrollHeight > container.clientHeight + 2 || text.scrollWidth > container.clientWidth + 2) && fs > minFs && iterations < 80) {
            fs -= 0.5;
            text.style.fontSize = `${fs}px`;
            iterations++;
        }
    }, [item.concept, cardScale, hasDefinition]);

    useEffect(() => {
        if (!hasDefinition) return;
        const container = defContainerRef.current;
        const text = defTextRef.current;
        if (!container || !text) return;

        text.style.fontSize = '';
        let fs = parseFloat(window.getComputedStyle(text).fontSize);
        const minFs = 9;
        let iterations = 0;

        while ((text.scrollHeight > container.clientHeight + 2 || text.scrollWidth > container.clientWidth + 2) && fs > minFs && iterations < 80) {
            fs -= 0.5;
            text.style.fontSize = `${fs}px`;
            iterations++;
        }
    }, [item.definition, cardScale, hasDefinition]);

    return (
        <motion.div
            ref={scrollRef}
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6, scale: 1.02 }}
            className={cn(
                "relative rounded-3xl md:rounded-[2.2rem] overflow-hidden flex flex-col justify-between select-none transition-all duration-300 backdrop-blur-xl group",
                theme.card,
                showNewBadge ? "ring-2 ring-white/50" : "",
                hasDefinition 
                    ? (cardScale === 'xl' ? "min-h-[260px] md:min-h-[300px]" : cardScale === 'lg' ? "min-h-[220px] md:min-h-[250px]" : "min-h-[170px] md:min-h-[200px]") 
                    : scaleStyles.minHeight,
                scaleStyles.padding
            )}
        >
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r", theme.topLine)} />

            <div className="absolute -bottom-6 -right-6 opacity-10 pointer-events-none select-none text-white transition-transform group-hover:scale-110 duration-500">
                <theme.icon className="w-36 h-36" />
            </div>

            <div className="flex items-center justify-between w-full relative z-10 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-black backdrop-blur-md", theme.numBadge)}>
                        #{currentNum}
                    </span>
                    {onSpeak && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onSpeak(); }}
                            className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border",
                                isSpeaking 
                                    ? "bg-amber-400 text-amber-950 border-amber-300 shadow-md scale-110" 
                                    : "bg-white/20 hover:bg-white/35 text-white border-white/30"
                            )}
                            title={isSpeaking ? "Durdur" : "Seslendir"}
                        >
                            {isSpeaking ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-1.5">
                    {showNewBadge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 border border-amber-300 shadow-sm animate-pulse">
                            YENİ
                        </span>
                    )}
                    <div className={cn("flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full backdrop-blur-md", theme.typeBadge)}>
                        <theme.icon className={cn("w-3.5 h-3.5", theme.iconColor)} /> 
                        <span>{hasDefinition ? 'Tanım Kartı' : 'Kavram'}</span>
                    </div>
                </div>
            </div>

            <div className="my-auto py-2.5 px-1 text-center w-full flex-1 flex flex-col items-center justify-center relative z-10 gap-2 min-h-0">
                <div ref={titleContainerRef} className="w-full flex items-center justify-center overflow-hidden py-0.5 max-w-full">
                    <h3
                        ref={titleTextRef}
                        className={cn(
                            "font-black tracking-normal sm:tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] uppercase leading-tight break-words whitespace-normal [overflow-wrap:anywhere] [word-break:normal] max-w-full text-center px-1 transition-transform group-hover:scale-[1.01] my-auto",
                            getConceptCardFontSize(item.concept, hasDefinition, cardScale, isTeacher, totalConceptCards)
                        )}
                    >
                        {item.concept}
                    </h3>
                </div>

                {hasDefinition && (
                    <div 
                        ref={defContainerRef}
                        className={cn(
                            "w-full max-w-xl mx-auto mt-2 p-3 sm:p-4 rounded-2xl md:rounded-3xl backdrop-blur-md transition-colors overflow-hidden max-h-56 overflow-y-auto scrollbar-thin",
                            theme.defBox
                        )}
                    >
                        <p 
                            ref={defTextRef}
                            className={cn(
                                "font-semibold leading-relaxed tracking-normal break-words whitespace-normal [overflow-wrap:anywhere] [word-break:normal] text-center my-auto",
                                cardScale === 'xl' ? (isTeacher ? "text-xl md:text-2xl font-bold" : "text-base md:text-lg") :
                                cardScale === 'lg' ? (isTeacher ? "text-lg md:text-xl font-bold" : "text-sm md:text-base") :
                                cardScale === 'md' ? (isTeacher ? "text-base md:text-lg font-bold" : "text-xs md:text-sm") :
                                cardScale === 'xs' ? (isTeacher ? "text-xs sm:text-sm" : "text-[11px]") :
                                (isTeacher ? "text-sm md:text-base font-bold" : "text-xs md:text-sm")
                            )}
                        >
                            {item.definition}
                        </p>
                    </div>
                )}
            </div>

            <div className="w-full flex items-center justify-center relative z-10 pt-1 flex-shrink-0">
                <div className="h-1 w-14 rounded-full bg-white/40 backdrop-blur-md shadow-sm" />
            </div>
        </motion.div>
    );
}

export function ConceptExplanationPlayer({ 
    items, 
    step, 
    revealedSentencesCount, 
    isFullscreen, 
    title, 
    isSingleCardMode, 
    fontSizeScale = 'normal',
    isTeacher: propIsTeacher,
    presentationTheme = 'clean-light',
    isAutoReadEnabled = false
}: { 
    items?: any[]; 
    step?: any; 
    revealedSentencesCount?: number; 
    isFullscreen: boolean; 
    title?: string; 
    isSingleCardMode?: boolean; 
    fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge'; 
    isTeacher?: boolean; 
    presentationTheme?: 'cosmic-dark' | 'vibrant-studio' | 'clean-light';
    isAutoReadEnabled?: boolean;
}) {
    const authIsTeacher = useTeacherMode();
    const isTeacher = typeof propIsTeacher === 'boolean' ? propIsTeacher : authIsTeacher;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Kilitlenmeyi önleyen güvenli ses referansları
    const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const autoReadTimerRef = useRef<NodeJS.Timeout | null>(null);
    const prevCountRef = useRef<number>(0);
    const prevStepKeyRef = useRef<string>('');
    const prevAutoReadRef = useRef<boolean>(isAutoReadEnabled);
    const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

    const stopSpeech = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }
                window.speechSynthesis.cancel();
            } catch (_) {}
            if ((window as any).__activeSpeechUtterance) {
                (window as any).__activeSpeechUtterance = null;
            }
        }
        if (autoReadTimerRef.current) {
            clearTimeout(autoReadTimerRef.current);
            autoReadTimerRef.current = null;
        }
        activeUtteranceRef.current = null;
        setSpeakingIndex(null);
    }, []);

    const handleSpeakConcept = useCallback((conceptItem: { concept: string; definition?: string }, idx: number) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        if (speakingIndex === idx) {
            stopSpeech();
            return;
        }

        stopSpeech();

        const fullText = `${conceptItem.concept}${conceptItem.definition ? ': ' + conceptItem.definition : ''}`;
        const { spokenText } = prepareTurkishSpeech(fullText);
        if (!spokenText.trim()) return;

        const utterance = new SpeechSynthesisUtterance(spokenText);
        activeUtteranceRef.current = utterance;
        if (typeof window !== 'undefined') {
            (window as any).__activeSpeechUtterance = utterance;
        }

        const bestVoice = getBestTurkishVoice();
        if (bestVoice) {
            utterance.voice = bestVoice;
            utterance.lang = bestVoice.lang;
        } else {
            utterance.lang = 'tr-TR';
        }

        const { rate, pitch } = getTurkishSpeechParams(bestVoice);
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onstart = () => {
            setSpeakingIndex(idx);
        };

        utterance.onend = () => {
            if (activeUtteranceRef.current === utterance) {
                activeUtteranceRef.current = null;
            }
            if (typeof window !== 'undefined' && (window as any).__activeSpeechUtterance === utterance) {
                (window as any).__activeSpeechUtterance = null;
            }
            setSpeakingIndex(null);
        };

        utterance.onerror = () => {
            if (activeUtteranceRef.current === utterance) {
                activeUtteranceRef.current = null;
            }
            if (typeof window !== 'undefined' && (window as any).__activeSpeechUtterance === utterance) {
                (window as any).__activeSpeechUtterance = null;
            }
            setSpeakingIndex(null);
        };

        setTimeout(() => {
            try {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }
                setSpeakingIndex(idx);
                window.speechSynthesis.speak(utterance);
            } catch (_) {}
        }, 80);
    }, [speakingIndex, stopSpeech]);

    const speakConceptRef = useRef(handleSpeakConcept);
    useEffect(() => {
        speakConceptRef.current = handleSpeakConcept;
    }, [handleSpeakConcept]);

    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'xs' ? 'xs' : 'sm';

    useEffect(() => {
        if (revealedSentencesCount && revealedSentencesCount > 1 && scrollRef.current) {
            const el = scrollRef.current;
            const rect = el.getBoundingClientRect();
            if (rect.bottom > (window.innerHeight - 80) || rect.top < 60) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }, 100);
            }
        }
    }, [revealedSentencesCount]);

    const validConcepts = useMemo(() => {
        const raw = items || step?.items || step?.cards || [];
        let list: { concept: string; definition?: string }[] = [];
        if (Array.isArray(raw) && raw.length > 0) {
            list = raw.map((it: any) => {
                if (typeof it === 'string') {
                    const clean = it.replace(/<[^>]*>/g, '').trim();
                    return { concept: clean, definition: '' };
                }
                const term = (it.concept || it.term || it.title || it.word || it.name || '').replace(/<[^>]*>/g, '').trim();
                return { concept: term, definition: it.definition || it.content || '' };
            }).filter(it => it.concept.length > 0);
        } else if (typeof step?.content === 'string') {
            const doc = new DOMParser().parseFromString(`<div>${step.content}</div>`, 'text/html');
            const listItems = doc.querySelectorAll('li');
            if (listItems.length > 0) {
                list = Array.from(listItems).map(li => ({ concept: (li.textContent || '').trim(), definition: '' })).filter(it => it.concept.length > 0);
            } else {
                list = (step.content.match(/[^.!?,\n]+[.!?,\n]*/g) || [step.content])
                    .map((s: string) => ({ concept: s.replace(/<[^>]*>/g, '').trim(), definition: '' }))
                    .filter((it: any) => it.concept.length > 0);
            }
        }
        return list;
    }, [items, step]);

    // Slayt değiştiğinde sayaç ve sesi sıfırla
    const currentStepKey = (step as any)?.id || (step as any)?.title || '';
    useEffect(() => {
        if (prevStepKeyRef.current !== currentStepKey) {
            prevStepKeyRef.current = currentStepKey;
            prevCountRef.current = 0;
        }
        return () => {
            stopSpeech();
        };
    }, [currentStepKey, stopSpeech]);

    // Kart açıldığında çalışan otomatik okuma (1. kart dahil)
    useEffect(() => {
        if (!isTeacher) return;

        const count = revealedSentencesCount || 1;
        const prev = prevCountRef.current;
        prevCountRef.current = count;

        if (count > prev) {
            const newIdx = count - 1;
            const newConcept = validConcepts[newIdx];

            if (isAutoReadEnabled && newConcept && newConcept.concept !== '[BAŞLIK]') {
                if (autoReadTimerRef.current) {
                    clearTimeout(autoReadTimerRef.current);
                }
                const delay = prev === 0 ? 380 : 220;
                autoReadTimerRef.current = setTimeout(() => {
                    speakConceptRef.current(newConcept, newIdx);
                }, delay);
            }
        }
    }, [revealedSentencesCount, isTeacher, validConcepts, isAutoReadEnabled]);

    // Menüden açıldığında aktif kartı hemen oku
    useEffect(() => {
        if (!isTeacher) return;
        const wasOff = !prevAutoReadRef.current && isAutoReadEnabled;
        prevAutoReadRef.current = !!isAutoReadEnabled;

        const count = revealedSentencesCount || 1;
        const activeIdx = count - 1;
        if (wasOff && activeIdx >= 0 && validConcepts[activeIdx] && validConcepts[activeIdx].concept !== '[BAŞLIK]') {
            if (autoReadTimerRef.current) clearTimeout(autoReadTimerRef.current);
            autoReadTimerRef.current = setTimeout(() => {
                speakConceptRef.current(validConcepts[activeIdx], activeIdx);
            }, 180);
        }
    }, [isAutoReadEnabled, isTeacher, revealedSentencesCount, validConcepts]);

    if (!validConcepts || validConcepts.length === 0) {
        return (
            <div className="w-full max-w-2xl mx-auto p-4 sm:p-8 flex flex-col items-center justify-center text-center">
                <div className="w-full p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col items-center gap-3">
                    <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
                    <h2 className="text-xl sm:text-2xl font-black text-white">{title || step?.title || 'Anahtar Kavramlar'}</h2>
                    {step?.content && (
                        <div className="text-slate-300 text-sm sm:text-base leading-relaxed mt-2" dangerouslySetInnerHTML={{ __html: step.content }} />
                    )}
                    <p className="text-xs text-slate-400 mt-1">Bu sayfada incelenecek kavramlar hazırlanıyor.</p>
                </div>
            </div>
        );
    }
    const totalCards = validConcepts.filter(it => it.concept !== '[BAŞLIK]').length;
    const visibleConcepts = (typeof revealedSentencesCount === 'number' && revealedSentencesCount > 0)
        ? validConcepts.slice(0, revealedSentencesCount)
        : validConcepts;
    const visibleCount = visibleConcepts.filter(it => it.concept !== '[BAŞLIK]').length;

    const scaleStyles = {
        xs: {
            minHeight: isTeacher ? "min-h-[85px] md:min-h-[105px]" : "min-h-[75px] md:min-h-[90px]",
            padding: "p-3 md:p-4",
        },
        sm: {
            minHeight: isTeacher ? "min-h-[110px] md:min-h-[130px]" : "min-h-[95px] md:min-h-[115px]",
            padding: "p-4 md:p-5",
        },
        md: {
            minHeight: isTeacher ? "min-h-[155px] md:min-h-[180px]" : "min-h-[135px] md:min-h-[155px]",
            padding: "p-5 md:p-6",
        },
        lg: {
            minHeight: isTeacher ? "min-h-[210px] md:min-h-[250px]" : "min-h-[180px] md:min-h-[210px]",
            padding: "p-6 md:p-8",
        },
        xl: {
            minHeight: isTeacher ? "min-h-[280px] md:min-h-[320px]" : "min-h-[240px] md:min-h-[280px]",
            padding: "p-8 md:p-10",
        },
    }[cardScale];

    const nonTitleConcepts = visibleConcepts.filter(item => item.concept !== '[BAŞLIK]');
    const totalConceptCards = nonTitleConcepts.length;

    const getGridClass = () => {
        if (!isTeacher) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full";
        if (isSingleCardMode || totalConceptCards <= 1) return "grid-cols-1 max-w-3xl mx-auto w-full";
        if (totalConceptCards === 2) return "grid-cols-2 max-w-5xl mx-auto w-full";
        if (totalConceptCards === 3) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 max-w-7xl mx-auto w-full";
        if (totalConceptCards === 4) {
            return cardScale === 'xl' 
                ? "grid-cols-2 max-w-5xl mx-auto w-full"
                : "grid-cols-2 lg:grid-cols-4 w-full";
        }
        if (totalConceptCards === 5 || totalConceptCards === 6) {
            return cardScale === 'xl'
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 w-full"
                : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 w-full";
        }
        if (totalConceptCards === 7 || totalConceptCards === 8) {
            return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full";
        }
        return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full";
    };

    return (
        <div className={cn("w-full mx-auto p-2 md:p-4 animate-in fade-in duration-500", isTeacher ? "max-w-[98%]" : "max-w-7xl")}>
            <div className={cn(
                "flex items-center justify-center gap-3 mb-6 p-4 sm:p-5 rounded-3xl border shadow-2xl relative overflow-hidden text-center backdrop-blur-xl transition-colors",
                presentationTheme === 'clean-light'
                    ? "bg-white/95 border-2 border-indigo-200/90 text-slate-900 shadow-xl shadow-indigo-100/60"
                    : "bg-slate-900/90 border-white/10 text-white shadow-2xl"
            )}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-950/80 border border-white/20 shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                        <h2 className={cn(
                            "font-black text-lg md:text-2xl drop-shadow-sm tracking-tight text-center",
                            presentationTheme === 'clean-light' ? "text-slate-950" : "text-white"
                        )}>{title || 'Anahtar Kavramlar'}</h2>
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 mt-0.5">
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full font-extrabold border transition-colors",
                                presentationTheme === 'clean-light'
                                    ? (visibleCount === totalCards ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-indigo-100 text-indigo-800 border-indigo-300")
                                    : (visibleCount === totalCards 
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
                                        : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30")
                            )}>
                                {visibleCount} / {totalCards} Açıldı
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={cn("grid gap-4 md:gap-6 pb-20 transition-all duration-300", getGridClass())}>
                {(() => {
                    let conceptCount = 0;
                    return visibleConcepts.map((item, index) => {
                        if (item.concept === '[BAŞLIK]') {
                            return (
                                <div key={index} className="col-span-full mt-4 mb-2 flex items-center gap-4 w-full">
                                    <div className="h-[2px] bg-gradient-to-r from-transparent via-indigo-500/70 to-transparent flex-1" />
                                    <h3 className="text-xl md:text-2xl font-black text-indigo-400 tracking-widest uppercase drop-shadow-sm text-center px-4">{item.definition}</h3>
                                    <div className="h-[2px] bg-gradient-to-r from-transparent via-indigo-500/70 to-transparent flex-1" />
                                </div>
                            );
                        }

                        const currentNum = ++conceptCount;
                        const theme = CONCEPT_THEMES[(currentNum - 1) % CONCEPT_THEMES.length];
                        const isLatest = index === visibleConcepts.length - 1;
                        const hasDefinition = !!(item.definition && item.definition.trim().length > 0);
                        const showNewBadge = isLatest && visibleConcepts.length > 1;

                        return (
                            <ConceptCardItem
                                key={index}
                                item={item}
                                currentNum={currentNum}
                                theme={theme}
                                isLatest={isLatest}
                                showNewBadge={showNewBadge}
                                hasDefinition={hasDefinition}
                                cardScale={cardScale}
                                scaleStyles={scaleStyles}
                                isTeacher={isTeacher}
                                totalConceptCards={totalConceptCards}
                                scrollRef={isLatest ? scrollRef : null}
                                onSpeak={() => handleSpeakConcept(item, index)}
                                isSpeaking={speakingIndex === index}
                            />
                        );
                    });
                })()}
            </div>
        </div>
    );
}
