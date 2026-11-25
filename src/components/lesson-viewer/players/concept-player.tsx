'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    Sparkles, Crown, Zap, Flame, Star, Gem, Feather, Volume2, VolumeX,
    Maximize2, X, ChevronLeft, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { motion } from 'framer-motion';
import { prepareTurkishSpeech, getBestTurkishVoice, getTurkishSpeechParams } from '../tts-helper';

function parseConceptHtmlItem(rawHtml: string): { concept: string; definition?: string } {
    const plain = rawHtml.replace(/<[^>]*>/g, '').trim();
    const colonIdx = plain.indexOf(':');
    const dashIdx = plain.indexOf(' - ');
    const splitAtColon = colonIdx > 0 && colonIdx < 45;
    const splitAtDash = !splitAtColon && dashIdx > 0 && dashIdx < 45;

    if (!splitAtColon && !splitAtDash) {
        return { concept: plain, definition: '' };
    }

    const conceptPlain = splitAtColon
        ? plain.slice(0, colonIdx).trim()
        : plain.slice(0, dashIdx).trim();

    // Preserve inline HTML in definition part safely by walking outside tags
    let inTag = false;
    let inEntity = false;
    let plainCharsSeen = 0;
    const targetPlainLen = splitAtColon ? colonIdx + 1 : dashIdx + 3;
    let htmlCutIdx = rawHtml.length;

    for (let i = 0; i < rawHtml.length; i++) {
        const ch = rawHtml[i];
        if (ch === '<') { inTag = true; continue; }
        if (ch === '>') { inTag = false; continue; }
        if (!inTag) {
            if (ch === '&') inEntity = true;
            if (!inEntity || ch === ';') {
                if (inEntity && ch === ';') {
                    inEntity = false;
                    plainCharsSeen++;
                } else if (!inEntity) {
                    plainCharsSeen++;
                }
                if (plainCharsSeen >= targetPlainLen) {
                    htmlCutIdx = i + 1;
                    break;
                }
            }
        }
    }

    const defHtml = rawHtml
        .slice(htmlCutIdx)
        .replace(/^(\s*<\/(strong|b|em|i|mark|span)\s*>)+/gi, '')
        .trim();

    return {
        concept: conceptPlain,
        definition: defHtml || (splitAtColon ? plain.slice(colonIdx + 1).trim() : plain.slice(dashIdx + 3).trim()),
    };
}

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

export const SKETCHNOTE_CONCEPT_THEMES = [
    {
        id: 'yellow',
        cardBorder: 'border-[#fde047]',
        shadow: 'shadow-[3px_3px_0_#fde047]',
        badgeClass: 'badge-c-yellow',
        numBg: 'bg-[#ca8a04]'
    },
    {
        id: 'green',
        cardBorder: 'border-[#86efac]',
        shadow: 'shadow-[3px_3px_0_#86efac]',
        badgeClass: 'badge-c-green',
        numBg: 'bg-[#16a34a]'
    },
    {
        id: 'cyan',
        cardBorder: 'border-[#7dd3fc]',
        shadow: 'shadow-[3px_3px_0_#7dd3fc]',
        badgeClass: 'badge-c-cyan',
        numBg: 'bg-[#0284c7]'
    },
    {
        id: 'pink',
        cardBorder: 'border-[#f472b6]',
        shadow: 'shadow-[3px_3px_0_#f472b6]',
        badgeClass: 'badge-c-pink',
        numBg: 'bg-[#db2777]'
    },
    {
        id: 'purple',
        cardBorder: 'border-[#c084fc]',
        shadow: 'shadow-[3px_3px_0_#c084fc]',
        badgeClass: 'badge-c-purple',
        numBg: 'bg-[#9333ea]'
    },
    {
        id: 'orange',
        cardBorder: 'border-[#fdba74]',
        shadow: 'shadow-[3px_3px_0_#fdba74]',
        badgeClass: 'badge-c-orange',
        numBg: 'bg-[#ea580c]'
    }
];

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

export const GAME3D_CONCEPT_THEMES = [
    {
        border: 'border-sky-400/80',
        borderBottom: 'border-b-[6px] sm:border-b-[8px] border-b-sky-800',
        bg: 'linear-gradient(180deg, rgba(8, 47, 73, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
        glow: 'rgba(56, 189, 248, 0.35)',
        badgeBg: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
        badgeBorder: 'border-sky-300',
        titleColor: 'text-sky-300',
    },
    {
        border: 'border-amber-400/80',
        borderBottom: 'border-b-[6px] sm:border-b-[8px] border-b-amber-800',
        bg: 'linear-gradient(180deg, rgba(69, 26, 3, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
        glow: 'rgba(245, 158, 11, 0.35)',
        badgeBg: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 60%, #d97706 100%)',
        badgeBorder: 'border-amber-300',
        titleColor: 'text-amber-300',
    },
    {
        border: 'border-emerald-400/80',
        borderBottom: 'border-b-[6px] sm:border-b-[8px] border-b-emerald-800',
        bg: 'linear-gradient(180deg, rgba(2, 44, 34, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
        glow: 'rgba(16, 185, 129, 0.35)',
        badgeBg: 'linear-gradient(180deg, #34d399 0%, #059669 100%)',
        badgeBorder: 'border-emerald-300',
        titleColor: 'text-emerald-300',
    },
    {
        border: 'border-purple-400/80',
        borderBottom: 'border-b-[6px] sm:border-b-[8px] border-b-purple-800',
        bg: 'linear-gradient(180deg, rgba(30, 11, 54, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
        glow: 'rgba(192, 132, 252, 0.35)',
        badgeBg: 'linear-gradient(180deg, #c084fc 0%, #7c3aed 100%)',
        badgeBorder: 'border-purple-300',
        titleColor: 'text-purple-300',
    },
    {
        border: 'border-rose-400/80',
        borderBottom: 'border-b-[6px] sm:border-b-[8px] border-b-rose-800',
        bg: 'linear-gradient(180deg, rgba(76, 5, 25, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
        glow: 'rgba(251, 113, 133, 0.35)',
        badgeBg: 'linear-gradient(180deg, #fb7185 0%, #e11d48 100%)',
        badgeBorder: 'border-rose-300',
        titleColor: 'text-rose-300',
    },
    {
        border: 'border-teal-400/80',
        borderBottom: 'border-b-[6px] sm:border-b-[8px] border-b-teal-800',
        bg: 'linear-gradient(180deg, rgba(4, 47, 46, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
        glow: 'rgba(45, 212, 191, 0.35)',
        badgeBg: 'linear-gradient(180deg, #2dd4bf 0%, #0d9488 100%)',
        badgeBorder: 'border-teal-300',
        titleColor: 'text-teal-300',
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
    const isDenseRow = totalConceptCards >= 6;
    const isMultiColumn = totalConceptCards >= 4;

    if (hasDefinition) {
        if (isDenseRow) {
            if (maxWordLen > 10 || totalLen > 18) return isTeacher ? "text-xs sm:text-sm md:text-base font-bold" : "text-xs sm:text-sm";
            return isTeacher ? "text-sm sm:text-base md:text-lg font-bold" : "text-xs sm:text-sm md:text-base";
        }
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

    if (isDenseRow) {
        if (maxWordLen > 10 || totalLen > 18) return isTeacher ? "text-sm sm:text-base md:text-lg" : "text-xs sm:text-sm md:text-base";
        if (maxWordLen > 6 || totalLen > 12) return isTeacher ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base md:text-lg";
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
    isSpeaking,
    isSketchnote,
    sketchnoteTheme,
    isGame3D,
    isDefHidden,
    onRevealDef,
    onZoom,
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
    isSketchnote?: boolean;
    sketchnoteTheme?: any;
    isGame3D?: boolean;
    isDefHidden?: boolean;
    onRevealDef?: () => void;
    onZoom?: () => void;
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
        const minFs = hasDefinition ? 13 : 15;
        let iterations = 0;

        while ((text.scrollHeight > container.clientHeight + 2 || text.scrollWidth > container.clientWidth + 2) && fs > minFs && iterations < 80) {
            fs -= 0.5;
            text.style.fontSize = `${fs}px`;
            iterations++;
        }
    }, [item.concept, cardScale, hasDefinition, totalConceptCards]);

    useEffect(() => {
        if (!hasDefinition || isDefHidden) return;
        const container = defContainerRef.current;
        const text = defTextRef.current;
        if (!container || !text) return;

        text.style.fontSize = '';
        let fs = parseFloat(window.getComputedStyle(text).fontSize);
        const minFs = isTeacher ? 13 : 11;
        let iterations = 0;

        while ((text.scrollHeight > container.clientHeight + 2 || text.scrollWidth > container.clientWidth + 2) && fs > minFs && iterations < 80) {
            fs -= 0.5;
            text.style.fontSize = `${fs}px`;
            iterations++;
        }
    }, [item.definition, cardScale, hasDefinition, totalConceptCards, isDefHidden, isTeacher]);

    const sketchnoteTitleSize =
        cardScale === 'xl' ? "text-3xl sm:text-4xl md:text-5xl" :
        cardScale === 'lg' ? "text-2xl sm:text-3xl md:text-4xl" :
        cardScale === 'md' ? "text-2xl sm:text-3xl" :
        cardScale === 'xs' ? "text-lg sm:text-xl" :
        "text-xl sm:text-2xl md:text-3xl";

    const sketchnoteDefSize =
        cardScale === 'xl' ? "text-xl sm:text-2xl md:text-3xl" :
        cardScale === 'lg' ? "text-lg sm:text-xl md:text-2xl" :
        cardScale === 'md' ? "text-base sm:text-lg md:text-xl" :
        cardScale === 'xs' ? "text-sm sm:text-base" :
        "text-base sm:text-lg md:text-xl";

    if (isSketchnote) {
        return (
            <motion.div
                ref={scrollRef}
                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={onZoom}
                className={cn(
                    "relative rounded-3xl overflow-hidden flex flex-col justify-between select-none transition-all duration-300 bg-white border-[2.5px] h-full shadow-[3px_3px_0_rgba(0,0,0,0.08)]",
                    onZoom && "cursor-pointer",
                    sketchnoteTheme?.cardBorder || 'border-[#fde047]',
                    sketchnoteTheme?.shadow || 'shadow-[3px_3px_0_#fde047]',
                    showNewBadge ? "ring-2 ring-amber-400" : "",
                    totalConceptCards >= 5 ? "p-3.5 sm:p-4" : "p-4 sm:p-5"
                )}
            >
                {/* Üst Bar: Numara + Ses + Büyüt + Tür */}
                <div className="flex items-center justify-between w-full relative z-10 flex-shrink-0 mb-2">
                    <div className="flex items-center gap-1.5">
                        <span className={cn("bullet-num w-7 h-7 text-xs font-bold shrink-0", sketchnoteTheme?.numBg || 'bg-[#ca8a04]')}>
                            #{currentNum}
                        </span>
                        {onSpeak && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onSpeak(); }}
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border",
                                    isSpeaking 
                                        ? "bg-amber-400 text-amber-950 border-amber-500 shadow-md ring-2 ring-amber-300" 
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                                )}
                                title={isSpeaking ? "Durdur" : "Seslendir"}
                            >
                                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        )}
                        {onZoom && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onZoom(); }}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                                title="Büyüt (Odak Modu)"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {showNewBadge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 border border-amber-300 shadow-xs">
                                YENİ
                            </span>
                        )}
                        <span className="font-['Patrick_Hand',cursive] text-xs font-bold text-slate-600">
                            {hasDefinition ? 'Tanım Kartı' : 'Kavram'}
                        </span>
                    </div>
                </div>

                {/* Orta Alan: Kavram Rozeti ve Açıklaması */}
                <div className="my-auto py-2 text-center w-full flex-1 flex flex-col items-center justify-center relative z-10 gap-3 min-h-0">
                    {/* KAVRAM ROZETİ (Örn: Tevhit, Rahman & Rahim) */}
                    <div className="flex items-center justify-center">
                        <span className={cn(
                            "font-['Caveat',cursive] font-bold px-4 py-1 rounded-2xl border-[2px] leading-tight text-center shadow-xs",
                            sketchnoteTitleSize,
                            sketchnoteTheme?.badgeClass || 'badge-c-yellow'
                        )}>
                            {item.concept}
                        </span>
                    </div>

                    {/* TANIM METNİ (Fosforlu İfadelerle veya Tahmin Perdesi) */}
                    {hasDefinition && (
                        isDefHidden ? (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onRevealDef?.(); }}
                                className="w-full py-4 px-3 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/90 hover:bg-amber-100 text-amber-900 font-['Patrick_Hand',cursive] text-base sm:text-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                            >
                                <Eye className="w-4 h-4 shrink-0" />
                                <span>Tahmin Et • Tanımı Açmak İçin Dokun</span>
                            </button>
                        ) : (
                            <div className="w-full text-center px-1">
                                <p 
                                    className={cn(
                                        "font-['Patrick_Hand',cursive] font-medium text-slate-800 leading-relaxed text-center [&_mark]:bg-[#fef08a] [&_mark]:text-[#854d0e] [&_mark]:px-1 [&_mark]:rounded [&_strong]:bg-[#fef08a] [&_strong]:text-[#854d0e] [&_strong]:px-1.5 [&_strong]:rounded-[4px] [&_b]:bg-[#fef08a] [&_b]:text-[#854d0e] [&_b]:px-1.5 [&_b]:rounded-[4px]",
                                        sketchnoteDefSize
                                    )}
                                    dangerouslySetInnerHTML={{ __html: item.definition || '' }}
                                />
                            </div>
                        )
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            ref={scrollRef}
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6, scale: 1.02 }}
            onClick={onZoom}
            className={cn(
                "relative rounded-3xl md:rounded-[2.2rem] overflow-hidden flex flex-col justify-between select-none transition-all duration-300 backdrop-blur-xl group h-full",
                onZoom && "cursor-pointer",
                theme.card,
                isGame3D ? "border-3 sm:border-4 border-b-[8px] sm:border-b-[10px] border-b-black/50 shadow-[0_12px_35px_rgba(0,0,0,0.85)] ring-1 ring-white/20" : "",
                showNewBadge ? "ring-2 ring-white/50" : "",
                hasDefinition 
                    ? (cardScale === 'xl' ? "min-h-[260px] md:min-h-[300px]" : cardScale === 'lg' ? "min-h-[220px] md:min-h-[250px]" : "min-h-[170px] md:min-h-[200px]") 
                    : scaleStyles.minHeight,
                totalConceptCards >= 5 ? "p-3 sm:p-3.5 md:p-4" : scaleStyles.padding
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
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border",
                                isSpeaking 
                                    ? "bg-amber-400 text-amber-950 border-amber-300 shadow-md ring-2 ring-amber-300" 
                                    : "bg-white/20 hover:bg-white/35 text-white border-white/30"
                            )}
                            title={isSpeaking ? "Durdur" : "Seslendir"}
                        >
                            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                    )}
                    {onZoom && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onZoom(); }}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border bg-white/20 hover:bg-white/35 text-white border-white/30"
                            title="Büyüt (Odak Modu)"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-1.5">
                    {showNewBadge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 border border-amber-300 shadow-sm">
                            YENİ
                        </span>
                    )}
                    <div className={cn("flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full backdrop-blur-md", theme.typeBadge)}>
                        <theme.icon className={cn("w-3.5 h-3.5", theme.iconColor)} /> 
                        <span>{hasDefinition ? (totalConceptCards >= 5 ? 'Tanım' : 'Tanım Kartı') : 'Kavram'}</span>
                    </div>
                </div>
            </div>

            <div className="my-auto py-2 px-1 text-center w-full flex-1 flex flex-col items-center justify-center relative z-10 gap-1.5 min-h-0">
                <div ref={titleContainerRef} className="w-full flex items-center justify-center overflow-hidden py-0.5 max-w-full">
                    <h3
                        ref={titleTextRef}
                        className={cn(
                            "font-black tracking-normal sm:tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] uppercase leading-tight break-words whitespace-normal [overflow-wrap:anywhere] [word-break:normal] max-w-full text-center px-1 transition-transform group-hover:scale-[1.01] my-auto",
                            isGame3D ? "text-amber-200" : "text-white",
                            getConceptCardFontSize(item.concept, hasDefinition, cardScale, isTeacher, totalConceptCards)
                        )}
                    >
                        {item.concept}
                    </h3>
                </div>

                {hasDefinition && (
                    isDefHidden ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRevealDef?.(); }}
                            className="w-full max-w-xl mx-auto mt-2 py-4 px-4 rounded-2xl border-2 border-dashed border-amber-300/60 bg-black/35 hover:bg-black/50 text-amber-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors cursor-pointer backdrop-blur-md"
                        >
                            <Eye className="w-4 h-4 shrink-0" />
                            <span>Tahmin Et • Tanımı Açmak İçin Dokun</span>
                        </button>
                    ) : (
                        <div 
                            ref={defContainerRef}
                            className={cn(
                                "w-full max-w-xl mx-auto rounded-2xl md:rounded-3xl backdrop-blur-md transition-colors overflow-hidden max-h-56 overflow-y-auto scrollbar-thin",
                                totalConceptCards >= 5 ? "mt-1.5 p-2 sm:p-2.5 md:p-3" : "mt-2 p-3 sm:p-4",
                                isGame3D ? "bg-black/55 border border-amber-300/30 text-white shadow-inner font-semibold" : theme.defBox
                            )}
                        >
                            <p 
                                ref={defTextRef}
                                className={cn(
                                    "font-semibold leading-relaxed tracking-normal break-words whitespace-normal [overflow-wrap:anywhere] [word-break:normal] text-center my-auto [&_strong]:text-amber-200 [&_b]:text-amber-200 [&_mark]:bg-amber-300 [&_mark]:text-slate-950 [&_mark]:px-1 [&_mark]:rounded",
                                    totalConceptCards >= 6 ? (isTeacher ? "text-xs sm:text-sm font-semibold" : "text-[11px] sm:text-xs") :
                                    totalConceptCards >= 5 ? (isTeacher ? "text-xs sm:text-sm md:text-base font-semibold" : "text-xs sm:text-sm") :
                                    cardScale === 'xl' ? (isTeacher ? "text-xl md:text-2xl font-bold" : "text-base md:text-lg") :
                                    cardScale === 'lg' ? (isTeacher ? "text-lg md:text-xl font-bold" : "text-sm md:text-base") :
                                    cardScale === 'md' ? (isTeacher ? "text-base md:text-lg font-bold" : "text-xs md:text-sm") :
                                    cardScale === 'xs' ? (isTeacher ? "text-xs sm:text-sm" : "text-[11px]") :
                                    (isTeacher ? "text-sm md:text-base font-bold" : "text-xs md:text-sm")
                                )}
                                dangerouslySetInnerHTML={{ __html: item.definition || '' }}
                            />
                        </div>
                    )
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
    presentationFont = 'playfair',
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
    presentationTheme?: 'game-3d' | 'sketchnote' | 'cosmic-dark' | 'vibrant-studio' | 'clean-light';
    presentationFont?: 'sketchnote' | 'outfit' | 'poppins' | 'jakarta' | 'playfair';
    isAutoReadEnabled?: boolean;
}) {
    const authIsTeacher = useTeacherMode();
    const isTeacher = typeof propIsTeacher === 'boolean' ? propIsTeacher : authIsTeacher;
    const isGame3D = presentationTheme === 'game-3d';
    const isSketchnote = presentationTheme === 'sketchnote';
    const scrollRef = useRef<HTMLDivElement>(null);

    // Kilitlenmeyi önleyen güvenli ses referansları
    const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const autoReadTimerRef = useRef<NodeJS.Timeout | null>(null);
    const prevCountRef = useRef<number>(0);
    const prevStepKeyRef = useRef<string>('');
    const prevAutoReadRef = useRef<boolean>(isAutoReadEnabled);
    const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
    const [hideDefinitions, setHideDefinitions] = useState<boolean>(false);
    const [revealedDefs, setRevealedDefs] = useState<Record<number, boolean>>({});
    const [focusedConceptIdx, setFocusedConceptIdx] = useState<number | null>(null);
    const [singleFocusIdx, setSingleFocusIdx] = useState<number | null>(null);

    const revealSingleDef = useCallback((idx: number) => {
        setRevealedDefs(prev => ({ ...prev, [idx]: true }));
    }, []);

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
            const pItems = doc.querySelectorAll('p');

            const parseItemHtml = (rawHtml: string) => parseConceptHtmlItem(rawHtml);

            if (listItems.length > 0) {
                list = Array.from(listItems).map(li => parseItemHtml(li.innerHTML || li.textContent || '')).filter(it => it.concept.length > 0);
            } else if (pItems.length > 0) {
                list = Array.from(pItems).map(p => parseItemHtml(p.innerHTML || p.textContent || '')).filter(it => it.concept.length > 0);
            } else {
                list = step.content.split('\n')
                    .map((s: string) => parseItemHtml(s))
                    .filter((it: any) => it.concept.length > 0);
            }
        }
        return list;
    }, [items, step]);

    // Slayt değiştiğinde sayaç, odak ve sesi sıfırla
    const currentStepKey = (step as any)?.id || (step as any)?.title || '';
    useEffect(() => {
        if (prevStepKeyRef.current !== currentStepKey) {
            prevStepKeyRef.current = currentStepKey;
            prevCountRef.current = 0;
            setHideDefinitions(false);
            setRevealedDefs({});
            setFocusedConceptIdx(null);
            setSingleFocusIdx(null);
        }
        return () => {
            stopSpeech();
        };
    }, [currentStepKey, stopSpeech]);

    useEffect(() => {
        setSingleFocusIdx(null);
    }, [revealedSentencesCount]);

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
    const hasAnyDefinition = validConcepts.some(c => c.concept !== '[BAŞLIK]' && !!(c.definition && c.definition.trim().length > 0));

    // Seçili (tek kart veya zoom) gezinme için başlık-dışı visible indeksler
    const navigableVisibleEntries = visibleConcepts
        .map((item, origIdx) => ({ item, origIdx }))
        .filter(e => e.item.concept !== '[BAŞLIK]');

    const latestNonTitleOrigIdx = navigableVisibleEntries.length > 0
        ? navigableVisibleEntries[navigableVisibleEntries.length - 1].origIdx
        : 0;
    const activeSingleOrigIdx = singleFocusIdx !== null && visibleConcepts[singleFocusIdx] && visibleConcepts[singleFocusIdx].concept !== '[BAŞLIK]'
        ? singleFocusIdx
        : latestNonTitleOrigIdx;

    // Zoom modal klavye kısayolları
    useEffect(() => {
        if (focusedConceptIdx === null) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                stopSpeech();
                setFocusedConceptIdx(null);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const pos = navigableVisibleEntries.findIndex(entry => entry.origIdx === focusedConceptIdx);
                if (pos === -1) return;
                e.preventDefault();
                e.stopPropagation();
                const nextPos = e.key === 'ArrowRight'
                    ? (pos + 1) % navigableVisibleEntries.length
                    : (pos - 1 + navigableVisibleEntries.length) % navigableVisibleEntries.length;
                stopSpeech();
                setFocusedConceptIdx(navigableVisibleEntries[nextPos].origIdx);
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [focusedConceptIdx, navigableVisibleEntries, stopSpeech]);

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
        if (isSingleCardMode) {
            return "grid-cols-1 max-w-3xl mx-auto w-full";
        }

        switch (totalConceptCards) {
            case 0:
            case 1:
                return "grid-cols-1 max-w-2xl mx-auto w-full";
            case 2:
                return "grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto w-full";
            case 3:
                return "grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 max-w-7xl mx-auto w-full";
            case 4:
                return "grid-cols-2 sm:grid-cols-2 md:grid-cols-4 w-full";
            case 5:
                return "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 w-full";
            case 6:
                return "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 w-full";
            case 7:
                return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-7 w-full";
            case 8:
                return "grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 2xl:grid-cols-8 w-full";
            default:
                // 9 veya daha fazla kart: Ekrana sığabildiği kadar yan yana dizilsin
                return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 w-full";
        }
    };

    const getGapClass = () => {
        if (totalConceptCards <= 2) return "gap-4 md:gap-6";
        if (totalConceptCards <= 4) return "gap-3 sm:gap-4 md:gap-5";
        if (totalConceptCards <= 6) return "gap-2.5 sm:gap-3 md:gap-4";
        return "gap-2 sm:gap-2.5 md:gap-3";
    };

    const focusedEntry = focusedConceptIdx !== null && validConcepts[focusedConceptIdx]
        ? { item: validConcepts[focusedConceptIdx], origIdx: focusedConceptIdx }
        : null;
    const focusedCardNum = focusedEntry
        ? validConcepts.slice(0, focusedEntry.origIdx + 1).filter(c => c.concept !== '[BAŞLIK]').length
        : 1;
    const focusedNavPos = focusedEntry
        ? navigableVisibleEntries.findIndex(e => e.origIdx === focusedEntry.origIdx)
        : -1;
    const isFocusedDefHidden = focusedEntry
        ? (hideDefinitions && !revealedDefs[focusedEntry.origIdx] && !!(focusedEntry.item.definition && focusedEntry.item.definition.trim()))
        : false;

    return (
        <div className="w-full mx-auto p-2 md:p-4 animate-in fade-in duration-500 max-w-[98%]">
            {/* ══ KAVRAM ODAK / BÜYÜTME MODALI ══ */}
            {focusedEntry && focusedEntry.item.concept !== '[BAŞLIK]' && (
                <div
                    className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 sm:p-6"
                    onClick={() => {
                        stopSpeech();
                        setFocusedConceptIdx(null);
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "relative w-full max-w-4xl rounded-[2rem] p-6 sm:p-10 md:p-12 shadow-2xl flex flex-col items-center text-center overflow-hidden",
                            isSketchnote
                                ? "bg-[#fffdf7] text-[#1e293b] border-[3px] border-[#1e293b] shadow-[8px_8px_0_#1e293b]"
                                : presentationTheme === 'clean-light'
                                    ? "bg-white text-slate-900 border-2 border-indigo-200 shadow-2xl"
                                    : "bg-slate-900/95 text-white border-2 border-amber-400/50 shadow-[0_0_90px_rgba(245,158,11,0.28)]"
                        )}
                    >
                        <div className="w-full flex items-center justify-between gap-3 mb-6">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-3.5 py-1 rounded-full text-sm font-black",
                                    isSketchnote
                                        ? "bg-[#fefce8] text-[#854d0e] border-2 border-[#eab308]"
                                        : presentationTheme === 'clean-light'
                                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                            : "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                                )}>
                                    #{focusedCardNum} / {totalCards}
                                </span>
                                {hideDefinitions && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-400/40">
                                        Tahmin Modu
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleSpeakConcept(focusedEntry.item, focusedEntry.origIdx)}
                                    className={cn(
                                        "w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer border",
                                        speakingIndex === focusedEntry.origIdx
                                            ? "bg-emerald-500 text-white border-emerald-400 shadow-md"
                                            : (isSketchnote || presentationTheme === 'clean-light')
                                                ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                                                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                                    )}
                                    title={speakingIndex === focusedEntry.origIdx ? "Durdur" : "Seslendir"}
                                >
                                    {speakingIndex === focusedEntry.origIdx ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        stopSpeech();
                                        setFocusedConceptIdx(null);
                                    }}
                                    className={cn(
                                        "w-11 h-11 rounded-2xl flex items-center justify-center transition-colors cursor-pointer border",
                                        (isSketchnote || presentationTheme === 'clean-light')
                                            ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                                            : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                                    )}
                                    title="Kapat (ESC)"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <h2 className={cn(
                            "font-black uppercase tracking-wide leading-tight mb-6 max-w-full break-words",
                            isSketchnote ? "font-['Caveat',cursive] text-4xl sm:text-5xl md:text-6xl text-[#0f172a]" :
                            presentationTheme === 'clean-light' ? "text-3xl sm:text-4xl md:text-5xl text-indigo-950" :
                            "text-3xl sm:text-4xl md:text-5xl text-amber-300"
                        )}>
                            {focusedEntry.item.concept}
                        </h2>

                        {focusedEntry.item.definition && focusedEntry.item.definition.trim() && (
                            isFocusedDefHidden ? (
                                <button
                                    type="button"
                                    onClick={() => revealSingleDef(focusedEntry.origIdx)}
                                    className={cn(
                                        "w-full max-w-2xl py-8 px-6 rounded-3xl border-2 border-dashed font-bold text-xl sm:text-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                                        (isSketchnote || presentationTheme === 'clean-light')
                                            ? "border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-900"
                                            : "border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200"
                                    )}
                                >
                                    <Eye className="w-8 h-8" />
                                    <span>Sınıfça Tahmin Edin • Tanımı Açmak İçin Tıklayın</span>
                                </button>
                            ) : (
                                <div className={cn(
                                    "w-full max-w-3xl max-h-[45vh] overflow-y-auto rounded-3xl p-6 sm:p-8 text-xl sm:text-2xl md:text-3xl leading-relaxed font-semibold",
                                    isSketchnote
                                        ? "bg-[#fefce8] border-2 border-[#eab308] text-slate-900 font-['Patrick_Hand',cursive]"
                                        : presentationTheme === 'clean-light'
                                            ? "bg-indigo-50/70 border border-indigo-200 text-slate-800"
                                            : "bg-black/45 border border-white/15 text-slate-100"
                                )}>
                                    <p
                                        className="[&_strong]:text-amber-300 [&_b]:text-amber-300 [&_mark]:bg-amber-300 [&_mark]:text-slate-950 [&_mark]:px-1 [&_mark]:rounded data-[light=true]:[&_strong]:bg-[#fef08a] data-[light=true]:[&_strong]:text-[#854d0e] data-[light=true]:[&_strong]:px-1.5 data-[light=true]:[&_strong]:rounded"
                                        data-light={isSketchnote || presentationTheme === 'clean-light'}
                                        dangerouslySetInnerHTML={{ __html: focusedEntry.item.definition }}
                                    />
                                </div>
                            )
                        )}

                        {navigableVisibleEntries.length > 1 && focusedNavPos !== -1 && (
                            <div className="mt-8 flex items-center justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        stopSpeech();
                                        const prevPos = (focusedNavPos - 1 + navigableVisibleEntries.length) % navigableVisibleEntries.length;
                                        setFocusedConceptIdx(navigableVisibleEntries[prevPos].origIdx);
                                    }}
                                    className={cn(
                                        "px-5 py-3 rounded-2xl font-bold flex items-center gap-2 border cursor-pointer transition-all",
                                        (isSketchnote || presentationTheme === 'clean-light')
                                            ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                                            : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                                    )}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    <span>Önceki</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        stopSpeech();
                                        const nextPos = (focusedNavPos + 1) % navigableVisibleEntries.length;
                                        setFocusedConceptIdx(navigableVisibleEntries[nextPos].origIdx);
                                    }}
                                    className="px-6 py-3 rounded-2xl font-bold flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer transition-all shadow-lg"
                                >
                                    <span>Sonraki Kavram</span>
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {isSketchnote ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 p-4 sm:p-5 rounded-3xl border-[2.5px] border-[#1e293b] bg-white shadow-[4px_4px_0_#1e293b] relative overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                        <span className="text-3xl">⭐</span>
                        <h2 className="font-['Caveat',cursive] text-2xl sm:text-3xl md:text-4xl font-bold text-[#a16207]">
                            {title || 'KAVRAMLAR KUTUSU'}
                        </h2>
                        <span className="font-['Patrick_Hand',cursive] text-xs sm:text-sm font-bold px-3.5 py-1 rounded-full bg-[#ef4444] text-white shadow-[1.5px_1.5px_0_#991b1b]">
                            Önemli Kavram! 🎯
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-center">
                        {hasAnyDefinition && (
                            <button
                                type="button"
                                onClick={() => {
                                    setHideDefinitions(prev => !prev);
                                    setRevealedDefs({});
                                }}
                                className={cn(
                                    "font-['Patrick_Hand',cursive] text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full border-[2px] flex items-center gap-1.5 transition-all cursor-pointer",
                                    hideDefinitions
                                        ? "bg-[#fef08a] text-[#854d0e] border-[#ca8a04] shadow-[2px_2px_0_#ca8a04]"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-400"
                                )}
                                title="Kavramların tanımlarını gizleyip öğrencilerden tahmin etmelerini isteyin"
                            >
                                {hideDefinitions ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                <span>{hideDefinitions ? "Tüm Tanımları Aç" : "Tanımları Gizle (Tahmin)"}</span>
                            </button>
                        )}
                        <span className="font-['Patrick_Hand',cursive] text-sm font-bold px-3.5 py-1 rounded-full bg-[#fefce8] text-[#854d0e] border-[1.5px] border-[#ca8a04] shadow-[1.5px_1.5px_0_#ca8a04]">
                            {visibleCount} / {totalCards} Açıldı
                        </span>
                    </div>
                </div>
            ) : !isGame3D ? (
                <div className={cn(
                    "flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 p-4 sm:p-5 rounded-3xl border shadow-2xl relative overflow-hidden backdrop-blur-xl transition-colors",
                    presentationTheme === 'clean-light'
                        ? "bg-white/95 border-2 border-indigo-200/90 text-slate-900 shadow-xl shadow-indigo-100/60"
                        : "bg-slate-900/90 border-white/10 text-white shadow-2xl"
                )}>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-950/80 border border-white/20 shrink-0">
                            <Sparkles className="w-5 h-5 text-amber-300" />
                        </div>
                        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                            <h2 className={cn(
                                "font-black text-lg md:text-2xl drop-shadow-sm tracking-tight",
                                presentationTheme === 'clean-light' ? "text-slate-950" : "text-white"
                            )}>{title || 'Anahtar Kavramlar'}</h2>
                            <p className={cn("text-xs font-medium", presentationTheme === 'clean-light' ? "text-slate-500" : "text-slate-400")}>
                                Büyütmek için herhangi bir kavram kartına tıklayabilirsiniz.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
                        {hasAnyDefinition && (
                            <button
                                type="button"
                                onClick={() => {
                                    setHideDefinitions(prev => !prev);
                                    setRevealedDefs({});
                                }}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-full text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer",
                                    hideDefinitions
                                        ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md"
                                        : presentationTheme === 'clean-light'
                                            ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                                            : "bg-white/10 hover:bg-white/20 text-slate-200 border-white/20"
                                )}
                                title="Kavramların tanımlarını gizleyip öğrencilerden tahmin etmelerini isteyin"
                            >
                                {hideDefinitions ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                <span>{hideDefinitions ? "Tüm Tanımları Aç" : "Tanımları Gizle (Tahmin)"}</span>
                            </button>
                        )}
                        <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-extrabold border transition-colors",
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
            ) : null}

            {/* ══ 3D OYUN MODU: SABİT ZEMİN PANOSU (EKRANI KAPLAR, 2-3-4 SÜTUNLU KAVRAM DÜZENİ) ══ */}
            {isGame3D ? (
                <div className="w-full flex-1 h-full flex flex-col items-center justify-center py-2 px-1 sm:px-3">
                    {/* SABİT BOYUTLU GENİŞ ZEMİN (EKRANI KAPLAR, YAZILAR GELDİKÇE BOYUT ATLAMAZ) */}
                    <div 
                        className="w-full max-w-[97vw] xl:max-w-[1750px] 2xl:max-w-[1850px] h-[78vh] md:h-[82vh] max-h-[920px] flex flex-col mx-auto rounded-3xl md:rounded-[2.5rem] border-3 sm:border-4 border-amber-400/80 border-b-[8px] md:border-b-[10px] border-b-amber-800 p-4 sm:p-6 md:p-8 shadow-2xl relative select-none overflow-hidden"
                        style={{
                            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(10, 15, 30, 0.97) 60%, rgba(5, 8, 20, 0.99) 100%)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.9), inset 0 2px 4px rgba(255,255,255,0.25), 0 0 35px rgba(245, 158, 11, 0.25)',
                        }}
                    >
                        {/* Üst Işık Yansıması */}
                        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-3xl" />

                        {/* İslami Geometrik Arka Plan Deseni */}
                        <div 
                            className="absolute inset-0 opacity-[0.05] pointer-events-none"
                            style={{
                                backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 1px, transparent 1px),
                                                  linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.15) 75%)`,
                                backgroundSize: '28px 28px',
                            }}
                        />

                        {/* Köşe Altın Vida Detayları */}
                        <div className="absolute top-3 left-4 w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-950 shadow-inner opacity-80" />
                        <div className="absolute top-3 right-4 w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-950 shadow-inner opacity-80" />
                        <div className="absolute bottom-3 left-4 w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-950 shadow-inner opacity-80" />
                        <div className="absolute bottom-3 right-4 w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-950 shadow-inner opacity-80" />

                        {/* Üst Kontrol Şeridi (Başlık + Tahmin Modu + Sayaç) */}
                        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-amber-400/20 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
                                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-amber-200 truncate">
                                    {title || 'Anahtar Kavramlar'}
                                </h2>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {isSingleCardMode && navigableVisibleEntries.length > 1 && (
                                    <div className="flex items-center gap-1 mr-1">
                                        {navigableVisibleEntries.map((entry, idx) => (
                                            <button
                                                key={entry.origIdx}
                                                type="button"
                                                onClick={() => setSingleFocusIdx(entry.origIdx)}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg font-black text-xs border transition-all cursor-pointer",
                                                    activeSingleOrigIdx === entry.origIdx
                                                        ? "bg-amber-400 text-amber-950 border-amber-200 shadow"
                                                        : "bg-white/10 text-white/75 border-white/15 hover:bg-white/20"
                                                )}
                                            >
                                                {idx + 1}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {hasAnyDefinition && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHideDefinitions(prev => !prev);
                                            setRevealedDefs({});
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer",
                                            hideDefinitions
                                                ? "bg-amber-400 text-amber-950 border-amber-200 shadow-md"
                                                : "bg-white/10 hover:bg-white/20 text-amber-100 border-white/20"
                                        )}
                                    >
                                        {hideDefinitions ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        <span>{hideDefinitions ? "Tüm Tanımları Aç" : "Tanımları Gizle (Tahmin)"}</span>
                                    </button>
                                )}
                                <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-400/20 text-amber-200 border border-amber-300/35">
                                    {visibleCount} / {totalCards}
                                </span>
                            </div>
                        </div>

                        {/* KAVRAMLAR 2, 3 VEYA 4 SÜTUNLU DİNAMİK IZGARA İLE GELİR (EKRAN DIŞINA TAŞMAZ!) */}
                        <div className="relative z-10 flex-1 overflow-y-auto custom-scroll pr-1.5 flex flex-col justify-start">
                            <div className={cn(
                                "w-full grid gap-4 sm:gap-5 md:gap-6 items-stretch",
                                isSingleCardMode ? "grid-cols-1 max-w-4xl mx-auto my-auto" : cn(
                                    totalCards === 1 && "grid-cols-1 max-w-4xl mx-auto",
                                    totalCards === 2 && "grid-cols-1 sm:grid-cols-2",
                                    totalCards === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                                    totalCards === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
                                    (totalCards === 5 || totalCards === 6) && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                                    totalCards > 6 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                )
                            )}>
                                {(() => {
                                    let cardNumCounter = 0;
                                    return visibleConcepts.map((item, origIdx) => {
                                        if (item.concept === '[BAŞLIK]') {
                                            if (isSingleCardMode) return null;
                                            return (
                                                <div key={origIdx} className="col-span-full flex items-center gap-3 py-1">
                                                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                                                    <span className="text-sm sm:text-base font-black text-amber-300 tracking-widest uppercase px-3">
                                                        {item.definition}
                                                    </span>
                                                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                                                </div>
                                            );
                                        }

                                        const cardNum = ++cardNumCounter;
                                        if (isSingleCardMode && origIdx !== activeSingleOrigIdx) return null;

                                        const isSpeaking = speakingIndex === origIdx;
                                        const theme = GAME3D_CONCEPT_THEMES[(cardNum - 1) % GAME3D_CONCEPT_THEMES.length];
                                        const isDefHidden = hideDefinitions && !revealedDefs[origIdx];

                                        return (
                                            <motion.div
                                                key={origIdx}
                                                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.28 }}
                                                onClick={() => setFocusedConceptIdx(origIdx)}
                                                className={cn(
                                                    "rounded-2xl sm:rounded-3xl border-2 sm:border-3 p-4 sm:p-5 md:p-6 flex flex-col justify-between transition-all duration-200 shadow-xl overflow-hidden relative cursor-pointer",
                                                    theme.border,
                                                    theme.borderBottom,
                                                    (totalCards === 1 || isSingleCardMode) ? "w-full max-w-4xl mx-auto min-h-[240px]" : "h-full min-h-[160px]"
                                                )}
                                                style={{
                                                    background: theme.bg,
                                                    boxShadow: `0 10px 25px rgba(0,0,0,0.6), 0 0 20px ${theme.glow}, inset 0 2px 4px rgba(255,255,255,0.15)`,
                                                }}
                                            >
                                                {/* Üst Satır: Numara Rozeti, Ses ve Büyüt Butonları */}
                                                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                                                    <div 
                                                        className={cn(
                                                            "w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-md",
                                                            theme.badgeBorder
                                                        )}
                                                        style={{
                                                            background: theme.badgeBg,
                                                            boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                                                        }}
                                                    >
                                                        <span className="text-sm sm:text-base font-black text-amber-950 font-mono">
                                                            #{cardNum}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFocusedConceptIdx(origIdx);
                                                            }}
                                                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer border bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-white/20"
                                                            title="Büyüt (Odak Modu)"
                                                        >
                                                            <Maximize2 size={17} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSpeakConcept(item, origIdx);
                                                            }}
                                                            className={cn(
                                                                "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer border",
                                                                isSpeaking
                                                                    ? "bg-amber-400 text-amber-950 border-amber-300 shadow-md ring-2 ring-amber-200"
                                                                    : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-white/20"
                                                            )}
                                                            title={isSpeaking ? "Durdur" : "Seslendir"}
                                                        >
                                                            {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Kavram Adı (Başlık) */}
                                                <h3 className={cn(
                                                    "font-black uppercase tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-2",
                                                    theme.titleColor,
                                                    (totalCards <= 2 || isSingleCardMode)
                                                        ? (fontSizeScale === 'huge' ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl md:text-3xl")
                                                        : totalCards === 3
                                                        ? (fontSizeScale === 'huge' ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl")
                                                        : (fontSizeScale === 'huge' ? "text-lg sm:text-xl md:text-2xl" : "text-base sm:text-lg md:text-xl")
                                                )}>
                                                    {item.concept}
                                                </h3>

                                                {/* İnce Altın/Işık Çizgisi */}
                                                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent my-2.5 sm:my-3" />

                                                {/* Kavram Tanımı (Açıklama veya Tahmin Perdesi) */}
                                                {item.definition && item.definition.trim() && (
                                                    isDefHidden ? (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                revealSingleDef(origIdx);
                                                            }}
                                                            className="w-full py-4 px-3 rounded-2xl border-2 border-dashed border-amber-300/60 bg-black/35 hover:bg-black/55 text-amber-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                                        >
                                                            <Eye className="w-4 h-4 shrink-0" />
                                                            <span>Tahmin Et • Tanımı Açmak İçin Dokun</span>
                                                        </button>
                                                    ) : (
                                                        <div className="flex-1 overflow-y-auto custom-scroll pr-1 min-h-[60px]">
                                                            <p
                                                                className={cn(
                                                                    "font-bold text-slate-100 leading-relaxed tracking-normal select-text drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] [&_strong]:text-amber-200 [&_b]:text-amber-200 [&_mark]:bg-amber-300 [&_mark]:text-slate-950 [&_mark]:px-1 [&_mark]:rounded",
                                                                    (totalCards <= 2 || isSingleCardMode)
                                                                        ? (fontSizeScale === 'huge' ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl")
                                                                        : totalCards === 3
                                                                        ? (fontSizeScale === 'huge' ? "text-lg sm:text-xl md:text-2xl" : "text-base sm:text-lg md:text-xl")
                                                                        : (fontSizeScale === 'huge' ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base md:text-lg")
                                                                )}
                                                                dangerouslySetInnerHTML={{ __html: item.definition }}
                                                            />
                                                        </div>
                                                    )
                                                )}
                                            </motion.div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ══ DİĞER TEMALAR İÇİN STANDART KART IZGARASI (VEYA TEK KART ODAK SAHNESİ) ══ */
                <div className="flex flex-col w-full">
                    {isSingleCardMode && navigableVisibleEntries.length > 1 && (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
                            {navigableVisibleEntries.map((entry, idx) => (
                                <button
                                    key={entry.origIdx}
                                    type="button"
                                    onClick={() => setSingleFocusIdx(entry.origIdx)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer",
                                        activeSingleOrigIdx === entry.origIdx
                                            ? isSketchnote
                                                ? "bg-[#fef08a] text-[#854d0e] border-[#ca8a04] shadow-[2px_2px_0_#ca8a04]"
                                                : "bg-indigo-600 text-white border-indigo-400 shadow-md"
                                            : (isSketchnote || presentationTheme === 'clean-light')
                                                ? "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                                : "bg-white/10 text-slate-300 border-white/15 hover:bg-white/20"
                                    )}
                                >
                                    #{idx + 1} {entry.item.concept}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className={cn("grid pb-20 transition-all duration-300 items-stretch", getGapClass(), getGridClass())}>
                    {(() => {
                        let conceptCount = 0;
                        return visibleConcepts.map((item, index) => {
                            if (item.concept === '[BAŞLIK]') {
                                if (isSingleCardMode) return null;
                                return (
                                    <div key={index} className="col-span-full mt-4 mb-2 flex items-center gap-4 w-full">
                                        <div className={cn("h-[2px] flex-1 bg-gradient-to-r from-transparent to-transparent", isSketchnote ? "via-[#ca8a04]/70" : "via-indigo-500/70")} />
                                        <h3 className={cn(
                                            "tracking-widest uppercase text-center px-4 font-black",
                                            isSketchnote
                                                ? "font-['Caveat',cursive] text-2xl md:text-3xl text-[#1e293b] bg-[#fefce8] border-2 border-[#eab308] rounded-xl py-1 shadow-[2px_2px_0_#eab308]"
                                                : presentationTheme === 'clean-light'
                                                    ? "text-xl md:text-2xl text-indigo-800"
                                                    : "text-xl md:text-2xl text-indigo-300 drop-shadow-sm"
                                        )}>{item.definition}</h3>
                                        <div className={cn("h-[2px] flex-1 bg-gradient-to-r from-transparent to-transparent", isSketchnote ? "via-[#ca8a04]/70" : "via-indigo-500/70")} />
                                    </div>
                                );
                            }

                            const currentNum = ++conceptCount;
                            if (isSingleCardMode && index !== activeSingleOrigIdx) return null;

                            const theme = CONCEPT_THEMES[(currentNum - 1) % CONCEPT_THEMES.length];
                            const sketchnoteTheme = SKETCHNOTE_CONCEPT_THEMES[(currentNum - 1) % SKETCHNOTE_CONCEPT_THEMES.length];
                            const isLatest = index === visibleConcepts.length - 1;
                            const hasDefinition = !!(item.definition && item.definition.trim().length > 0);
                            const showNewBadge = isLatest && visibleConcepts.length > 1;
                            const isDefHidden = hideDefinitions && !revealedDefs[index];

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
                                    totalConceptCards={isSingleCardMode ? 1 : totalConceptCards}
                                    scrollRef={isLatest ? scrollRef : null}
                                    onSpeak={() => handleSpeakConcept(item, index)}
                                    isSpeaking={speakingIndex === index}
                                    isSketchnote={isSketchnote}
                                    sketchnoteTheme={sketchnoteTheme}
                                    isGame3D={isGame3D}
                                    isDefHidden={isDefHidden}
                                    onRevealDef={() => revealSingleDef(index)}
                                    onZoom={() => setFocusedConceptIdx(index)}
                                />
                            );
                        });
                    })()}
                    </div>
                </div>
            )}
        </div>
    );
}
