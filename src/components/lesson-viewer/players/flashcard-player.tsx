'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, RotateCw, CheckCircle, Layers, Puzzle, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import type { FlashcardStep, AnagramFlashcardStep } from '@/lib/types';
import { motion } from 'framer-motion';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

export const FLASHCARD_THEMES = [
    { 
        id: 'sky',
        card: 'bg-gradient-to-br from-sky-500 via-sky-600 to-blue-600 border-2 border-sky-300 border-b-[8px] border-b-blue-800 text-white shadow-2xl shadow-sky-500/30', 
        front: 'bg-gradient-to-br from-sky-500 via-sky-600 to-blue-600 border-2 border-sky-300 border-b-[8px] border-b-blue-800 text-white shadow-2xl shadow-sky-500/30', 
        back: 'bg-gradient-to-br from-sky-500 via-sky-600 to-blue-600 border-2 border-sky-300 border-b-[8px] border-b-blue-800 text-white shadow-2xl shadow-sky-500/30',
        badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
        btn: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md',
    },
    { 
        id: 'purple',
        card: 'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 border-2 border-purple-300 border-b-[8px] border-b-indigo-800 text-white shadow-2xl shadow-purple-500/30', 
        front: 'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 border-2 border-purple-300 border-b-[8px] border-b-indigo-800 text-white shadow-2xl shadow-purple-500/30', 
        back: 'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 border-2 border-purple-300 border-b-[8px] border-b-indigo-800 text-white shadow-2xl shadow-purple-500/30',
        badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
        btn: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md',
    },
    { 
        id: 'emerald',
        card: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 border-2 border-emerald-300 border-b-[8px] border-b-teal-800 text-white shadow-2xl shadow-emerald-500/30', 
        front: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 border-2 border-emerald-300 border-b-[8px] border-b-teal-800 text-white shadow-2xl shadow-emerald-500/30', 
        back: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 border-2 border-emerald-300 border-b-[8px] border-b-teal-800 text-white shadow-2xl shadow-emerald-500/30',
        badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
        btn: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md',
    },
    { 
        id: 'amber',
        card: 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 border-2 border-amber-300 border-b-[8px] border-b-orange-800 text-white shadow-2xl shadow-amber-500/30', 
        front: 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 border-2 border-amber-300 border-b-[8px] border-b-orange-800 text-white shadow-2xl shadow-amber-500/30', 
        back: 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 border-2 border-amber-300 border-b-[8px] border-b-orange-800 text-white shadow-2xl shadow-amber-500/30',
        badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
        btn: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md',
    },
    { 
        id: 'rose',
        card: 'bg-gradient-to-br from-rose-500 via-pink-600 to-red-600 border-2 border-rose-300 border-b-[8px] border-b-rose-800 text-white shadow-2xl shadow-rose-500/30', 
        front: 'bg-gradient-to-br from-rose-500 via-pink-600 to-red-600 border-2 border-rose-300 border-b-[8px] border-b-rose-800 text-white shadow-2xl shadow-rose-500/30', 
        back: 'bg-gradient-to-br from-rose-500 via-pink-600 to-red-600 border-2 border-rose-300 border-b-[8px] border-b-rose-800 text-white shadow-2xl shadow-rose-500/30',
        badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
        btn: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md',
    },
    { 
        id: 'cyan',
        card: 'bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 border-2 border-cyan-300 border-b-[8px] border-b-cyan-800 text-white shadow-2xl shadow-cyan-500/30', 
        front: 'bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 border-2 border-cyan-300 border-b-[8px] border-b-cyan-800 text-white shadow-2xl shadow-cyan-500/30', 
        back: 'bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 border-2 border-cyan-300 border-b-[8px] border-b-cyan-800 text-white shadow-2xl shadow-cyan-500/30',
        badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
        btn: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md',
    },
    { 
        id: 'indigo',
        card: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 border-2 border-indigo-300 border-b-[8px] border-b-indigo-900 text-white shadow-2xl shadow-indigo-500/30', 
        front: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 border-2 border-indigo-300 border-b-[8px] border-b-indigo-900 text-white shadow-2xl shadow-indigo-500/30', 
        back: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 border-2 border-indigo-300 border-b-[8px] border-b-indigo-900 text-white shadow-2xl shadow-indigo-500/30',
        badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
        btn: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md',
    },
    { 
        id: 'orange',
        card: 'bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 border-2 border-orange-300 border-b-[8px] border-b-orange-800 text-white shadow-2xl shadow-orange-500/30', 
        front: 'bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 border-2 border-orange-300 border-b-[8px] border-b-orange-800 text-white shadow-2xl shadow-orange-500/30', 
        back: 'bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 border-2 border-orange-300 border-b-[8px] border-b-orange-800 text-white shadow-2xl shadow-orange-500/30',
        badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
        btn: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md',
    },
];

export const SKETCHNOTE_FLASHCARD_THEMES = [
    {
        id: 'yellow',
        card: 'bg-[#fefce8] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        front: 'bg-[#fefce8] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        back: 'bg-[#fffbeb] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        badge: 'bg-[#fde047] text-[#854d0e] border-2 border-[#1e293b] font-bold shadow-[2px_2px_0_#1e293b]',
        btn: 'bg-white hover:bg-yellow-50 text-slate-800 border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-bold',
    },
    {
        id: 'cyan',
        card: 'bg-[#f0f9ff] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        front: 'bg-[#f0f9ff] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        back: 'bg-[#e0f2fe] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        badge: 'bg-[#38bdf8] text-[#0369a1] border-2 border-[#1e293b] font-bold shadow-[2px_2px_0_#1e293b]',
        btn: 'bg-white hover:bg-sky-50 text-slate-800 border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-bold',
    },
    {
        id: 'pink',
        card: 'bg-[#fdf2f8] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        front: 'bg-[#fdf2f8] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        back: 'bg-[#fce7f3] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        badge: 'bg-[#f472b6] text-[#9d174d] border-2 border-[#1e293b] font-bold shadow-[2px_2px_0_#1e293b]',
        btn: 'bg-white hover:bg-pink-50 text-slate-800 border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-bold',
    },
    {
        id: 'green',
        card: 'bg-[#f0fdf4] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        front: 'bg-[#f0fdf4] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        back: 'bg-[#dcfce7] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        badge: 'bg-[#4ade80] text-[#15803d] border-2 border-[#1e293b] font-bold shadow-[2px_2px_0_#1e293b]',
        btn: 'bg-white hover:bg-emerald-50 text-slate-800 border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-bold',
    },
    {
        id: 'orange',
        card: 'bg-[#fff7ed] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        front: 'bg-[#fff7ed] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        back: 'bg-[#ffedd5] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        badge: 'bg-[#fb923c] text-[#9a3412] border-2 border-[#1e293b] font-bold shadow-[2px_2px_0_#1e293b]',
        btn: 'bg-white hover:bg-orange-50 text-slate-800 border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-bold',
    },
    {
        id: 'purple',
        card: 'bg-[#faf5ff] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        front: 'bg-[#faf5ff] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        back: 'bg-[#f3e8ff] border-[3px] border-[#1e293b] text-[#1e293b] shadow-[6px_6px_0_#1e293b]',
        badge: 'bg-[#c084fc] text-[#6b21a8] border-2 border-[#1e293b] font-bold shadow-[2px_2px_0_#1e293b]',
        btn: 'bg-white hover:bg-purple-50 text-slate-800 border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-bold',
    },
];

export const FlashcardItem = ({ 
    index = 0,
    term, 
    definition, 
    isFlipped, 
    onFlip, 
    theme, 
    isFullscreen, 
    isTeacher,
    cardScale = 'sm',
    presentationTheme = 'sketchnote',
    presentationFont = 'sketchnote'
}: { 
    index?: number;
    term: string; 
    definition: string; 
    isFlipped: boolean; 
    onFlip: () => void; 
    theme: any; 
    isFullscreen?: boolean; 
    isTeacher?: boolean;
    cardScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    presentationTheme?: string;
    presentationFont?: string;
}) => {
    const isSketchnote = presentationTheme === 'sketchnote';
    const activeTheme = isSketchnote 
        ? SKETCHNOTE_FLASHCARD_THEMES[index % SKETCHNOTE_FLASHCARD_THEMES.length] 
        : theme;
    const termContainerRef = useRef<HTMLDivElement>(null);
    const termTextRef = useRef<HTMLHeadingElement>(null);
    const defContainerRef = useRef<HTMLDivElement>(null);
    const defTextRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const container = termContainerRef.current;
        const text = termTextRef.current;
        if (!container || !text) return;

        text.style.fontSize = '';
        let fs = parseFloat(window.getComputedStyle(text).fontSize);
        const minFs = 10;
        let iterations = 0;

        while ((text.scrollHeight > container.clientHeight + 2 || text.scrollWidth > container.clientWidth + 2) && fs > minFs && iterations < 80) {
            fs -= 0.5;
            text.style.fontSize = `${fs}px`;
            iterations++;
        }
    }, [term, cardScale, isFlipped]);

    useEffect(() => {
        const container = defContainerRef.current;
        const text = defTextRef.current;
        if (!container || !text) return;

        text.style.fontSize = '';
        let fs = parseFloat(window.getComputedStyle(text).fontSize);
        const minFs = 7;
        let iterations = 0;

        while ((text.scrollHeight > container.clientHeight + 2 || text.scrollWidth > container.clientWidth + 2) && fs > minFs && iterations < 80) {
            fs -= 0.5;
            text.style.fontSize = `${fs}px`;
            iterations++;
        }
    }, [definition, cardScale, isFlipped]);

    const getTermFontSize = (termText: string) => {
        const words = (termText || '').trim().split(/\s+/).filter(Boolean);
        const maxWordLen = words.length > 0 ? Math.max(...words.map(w => w.length)) : 0;
        const totalLen = (termText || '').length;

        if (isTeacher) {
            if (cardScale === 'xl') {
                if (maxWordLen > 13 || totalLen > 24) return "text-2xl sm:text-3xl md:text-4xl";
                if (maxWordLen > 9 || totalLen > 16) return "text-3xl sm:text-4xl md:text-5xl";
                if (maxWordLen > 5 || totalLen > 10) return "text-4xl sm:text-5xl md:text-6xl";
                return "text-5xl sm:text-6xl md:text-7xl";
            }
            if (cardScale === 'lg') {
                if (maxWordLen > 13 || totalLen > 24) return "text-xl sm:text-2xl md:text-3xl";
                if (maxWordLen > 9 || totalLen > 16) return "text-2xl sm:text-3xl md:text-4xl";
                if (maxWordLen > 5 || totalLen > 10) return "text-3xl sm:text-4xl md:text-5xl";
                return "text-4xl sm:text-5xl md:text-6xl";
            }
            if (cardScale === 'md') {
                if (maxWordLen > 13 || totalLen > 24) return "text-lg sm:text-xl md:text-2xl";
                if (maxWordLen > 9 || totalLen > 16) return "text-xl sm:text-2xl md:text-3xl";
                if (maxWordLen > 5 || totalLen > 10) return "text-2xl sm:text-3xl md:text-4xl";
                return "text-3xl sm:text-4xl md:text-5xl";
            }
            if (cardScale === 'xs') {
                if (maxWordLen > 13 || totalLen > 24) return "text-xs sm:text-sm md:text-base";
                if (maxWordLen > 9 || totalLen > 16) return "text-sm sm:text-base md:text-lg";
                if (maxWordLen > 5 || totalLen > 10) return "text-base sm:text-lg md:text-xl";
                return "text-lg sm:text-xl md:text-2xl";
            }
            if (maxWordLen > 13 || totalLen > 24) return "text-base sm:text-lg md:text-xl";
            if (maxWordLen > 9 || totalLen > 16) return "text-lg sm:text-xl md:text-2xl";
            if (maxWordLen > 5 || totalLen > 10) return "text-xl sm:text-2xl md:text-3xl";
            return "text-2xl sm:text-3xl md:text-3xl";
        }

        if (maxWordLen > 14 || totalLen > 24) return "text-xs xs:text-sm sm:text-base md:text-lg";
        if (maxWordLen > 9 || totalLen > 16) return "text-sm xs:text-base sm:text-lg md:text-xl";
        if (maxWordLen > 5 || totalLen > 10) return "text-base xs:text-lg sm:text-xl md:text-2xl";
        return "text-lg xs:text-xl sm:text-2xl md:text-3xl";
    };

    const getDefFontSize = (defText: string) => {
        const len = (defText || '').length;

        if (isTeacher) {
            if (cardScale === 'xl') {
                if (len > 300) return "text-base sm:text-lg md:text-xl leading-snug";
                if (len > 180) return "text-lg sm:text-xl md:text-2xl leading-snug";
                if (len > 100) return "text-xl sm:text-2xl md:text-3xl leading-snug";
                if (len > 50) return "text-2xl sm:text-3xl md:text-4xl leading-relaxed";
                return "text-3xl sm:text-4xl md:text-5xl leading-relaxed";
            }
            if (cardScale === 'lg') {
                if (len > 300) return "text-sm sm:text-base md:text-lg leading-snug";
                if (len > 180) return "text-base sm:text-lg md:text-xl leading-snug";
                if (len > 100) return "text-lg sm:text-xl md:text-2xl leading-snug";
                if (len > 50) return "text-xl sm:text-2xl md:text-3xl leading-relaxed";
                return "text-2xl sm:text-3xl md:text-4xl leading-relaxed";
            }
            if (cardScale === 'md') {
                if (len > 300) return "text-xs sm:text-sm md:text-base leading-snug";
                if (len > 180) return "text-sm sm:text-base md:text-lg leading-snug";
                if (len > 100) return "text-base sm:text-lg md:text-xl leading-snug";
                if (len > 50) return "text-lg sm:text-xl md:text-2xl leading-relaxed";
                return "text-xl sm:text-2xl md:text-3xl leading-relaxed";
            }
            if (len > 300) return "text-xs sm:text-sm md:text-base leading-snug";
            if (len > 180) return "text-sm sm:text-base md:text-lg leading-snug";
            if (len > 100) return "text-base sm:text-lg md:text-xl leading-snug";
            if (len > 50) return "text-lg sm:text-xl md:text-2xl leading-relaxed";
            return "text-xl sm:text-2xl md:text-3xl leading-relaxed";
        }

        if (len > 500) return "text-[7px] xs:text-[7.5px] sm:text-[8.5px] md:text-[9.5px] leading-tight";
        if (len > 350) return "text-[8px] xs:text-[8.5px] sm:text-[10px] md:text-[11px] leading-tight sm:leading-snug";
        if (len > 220) return "text-[9px] xs:text-[10px] sm:text-[11px] md:text-xs leading-tight sm:leading-snug";
        if (len > 130) return "text-[10.5px] xs:text-[11px] sm:text-xs md:text-sm leading-tight sm:leading-snug";
        if (len > 70) return "text-xs xs:text-sm sm:text-base md:text-lg leading-snug";
        return "text-sm xs:text-base sm:text-lg md:text-xl leading-relaxed";
    };

    const scaleStyles = {
        xs: { 
            height: isTeacher ? "h-[11rem] sm:h-[12rem]" : "h-[9.5rem] sm:h-[10.5rem] md:h-[11.5rem]",
            minHeight: isTeacher ? "min-h-[10.5rem] sm:min-h-[11.5rem]" : "min-h-[7.5rem] sm:min-h-[8.5rem] md:min-h-[9.5rem]",
            padding: isTeacher ? "p-3 sm:p-4" : "p-2 sm:p-3"
        },
        sm: { 
            height: isTeacher ? "h-[13.5rem] sm:h-[15rem]" : "h-[11.5rem] sm:h-[13rem] md:h-[14.5rem]",
            minHeight: isTeacher ? "min-h-[13rem] sm:min-h-[14rem]" : "min-h-[8.5rem] sm:min-h-[10rem] md:min-h-[11.5rem]",
            padding: isTeacher ? "p-4 sm:p-5" : "p-2.5 sm:p-3.5"
        },
        md: { 
            height: isTeacher ? "h-[18rem] sm:h-[20rem]" : "h-[14rem] sm:h-[15.5rem] md:h-[17.5rem]",
            minHeight: isTeacher ? "min-h-[17.5rem] sm:min-h-[19.5rem]" : "min-h-[11rem] sm:min-h-[12.5rem] md:min-h-[14.5rem]",
            padding: isTeacher ? "p-5 sm:p-6" : "p-3 sm:p-4"
        },
        lg: { 
            height: isTeacher ? "h-[22rem] sm:h-[24rem]" : "h-[16.5rem] sm:h-[18.5rem] md:h-[20.5rem]",
            minHeight: isTeacher ? "min-h-[22rem] sm:min-h-[24rem]" : "min-h-[13.5rem] sm:min-h-[15.5rem] md:min-h-[17.5rem]",
            padding: isTeacher ? "p-6 sm:p-8" : "p-4 sm:p-5"
        },
        xl: { 
            height: isTeacher ? "h-[27rem] sm:h-[29rem]" : "h-[19rem] sm:h-[21.5rem] md:h-[23.5rem]",
            minHeight: isTeacher ? "min-h-[27rem] sm:min-h-[29rem]" : "min-h-[16.5rem] sm:min-h-[19rem] md:min-h-[21rem]",
            padding: isTeacher ? "p-8 sm:p-10" : "p-5 sm:p-6"
        },
    }[cardScale];

    return (
        <div
            className={cn(
                "w-full rounded-2xl sm:rounded-[2rem] [perspective:1200px] cursor-pointer group transition-all duration-300 select-none",
                scaleStyles.height,
                scaleStyles.minHeight
            )}
            onClick={onFlip}
        >
            <motion.div
                className="relative w-full h-full [transform-style:preserve-3d] transition-all"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 220, damping: 20 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <div className={cn(
                    "absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] rounded-2xl sm:rounded-[2rem] flex flex-col justify-between overflow-hidden",
                    scaleStyles.padding,
                    activeTheme.front
                )}>
                    {!isSketchnote && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent" />}
                    
                    <div className="flex items-center justify-between w-full flex-shrink-0 mb-0.5">
                        <span className={cn(
                            "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black",
                            isSketchnote ? activeTheme.badge : "bg-white/20 text-white border border-white/30 backdrop-blur-md"
                        )}>
                            #{index + 1}
                        </span>
                        <div className={cn(
                            "flex items-center gap-1 text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-full",
                            isSketchnote ? activeTheme.badge : "text-white bg-white/20 px-2 py-0.5 sm:px-3 sm:py-1 border border-white/30 backdrop-blur-md"
                        )}>
                            <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-500" />
                            <span className="hidden xs:inline">Kavram</span>
                        </div>
                    </div>

                    <div ref={termContainerRef} className="my-auto py-1 px-1 sm:px-2 text-center w-full flex-1 flex items-center justify-center overflow-hidden">
                        <h3 ref={termTextRef} className={cn(
                            "tracking-normal sm:tracking-wide uppercase leading-tight break-words whitespace-normal [overflow-wrap:anywhere] [word-break:normal] max-w-full px-0.5 text-center my-auto",
                            isSketchnote ? "font-['Caveat',cursive] font-black text-slate-900 drop-shadow-none" : "font-black text-white drop-shadow-lg",
                            getTermFontSize(term)
                        )}>
                            {term}
                        </h3>
                    </div>

                    <div className="flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className={cn(
                            "flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                            isSketchnote ? activeTheme.btn : "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md shadow-sm"
                        )}>
                            <RotateCw className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                            <span>Çevir</span>
                        </div>
                    </div>
                </div>

                <div 
                    className={cn(
                        "absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] rounded-2xl sm:rounded-[2rem] flex flex-col justify-between overflow-hidden",
                        scaleStyles.padding,
                        activeTheme.back
                    )} 
                    style={{ transform: "rotateY(180deg)" }}
                >
                    {!isSketchnote && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent" />}
                    
                    <div className="flex items-center justify-between w-full flex-shrink-0 mb-0.5">
                        <span className={cn(
                            "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black",
                            isSketchnote ? activeTheme.badge : "bg-white/20 text-white border border-white/30 backdrop-blur-md"
                        )}>
                            #{index + 1}
                        </span>
                        <div className={cn(
                            "flex items-center gap-1 text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-full",
                            isSketchnote ? activeTheme.badge : "text-white bg-white/20 px-2 py-0.5 sm:px-3 sm:py-1 border border-white/30 backdrop-blur-md"
                        )}>
                            <CheckCircle className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                            <span className="hidden xs:inline">Tanım</span>
                        </div>
                    </div>

                    <div ref={defContainerRef} className="my-auto py-1 px-0.5 sm:px-2 text-center w-full flex-1 flex items-center justify-center overflow-hidden">
                        <p ref={defTextRef} className={cn(
                            "tracking-normal sm:tracking-wide break-words whitespace-normal [overflow-wrap:anywhere] [word-break:normal] max-w-full text-center my-auto",
                            isSketchnote ? "font-['Patrick_Hand',cursive] font-bold text-slate-900 drop-shadow-none" : "font-bold text-white drop-shadow-md",
                            getDefFontSize(definition)
                        )}>
                            {definition}
                        </p>
                    </div>

                    <div className="flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className={cn(
                            "flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                            isSketchnote ? activeTheme.btn : "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md shadow-sm"
                        )}>
                            <RotateCw className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                            <span>Çevir</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export function FlashcardPlayer({ 
    step, 
    flippedCards, 
    onCardFlip, 
    isFullscreen, 
    fontSizeScale = 'normal', 
    isTeacher: propIsTeacher,
    presentationTheme = 'sketchnote',
    presentationFont = 'sketchnote'
}: { 
    step: FlashcardStep; 
    flippedCards: Set<number>; 
    onCardFlip: (cardIndex: number, type: 'flashcard') => void; 
    isFullscreen: boolean; 
    fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge'; 
    isTeacher?: boolean;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const authIsTeacher = useTeacherMode();
    const isTeacher = typeof propIsTeacher === 'boolean' ? propIsTeacher : authIsTeacher;
    const isSketchnote = presentationTheme === 'sketchnote';

    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'xs' ? 'xs' : 'sm';

    const totalCards = step.cards?.length || 0;
    const flippedCount = Array.from(flippedCards).filter(i => i < totalCards).length;
    const allFlipped = totalCards > 0 && flippedCount === totalCards;

    if (totalCards === 0) {
        return (
            <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-slate-900/60 border border-white/10 text-center text-slate-300">
                <Layers className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                <h3 className="text-lg font-black text-white mb-2">{step.title || 'Bilgi Kartları'}</h3>
                <p className="text-xs text-slate-400">Bu adımda henüz gösterilecek kart bulunmuyor.</p>
            </div>
        );
    }

    const handleToggleFlipAll = () => {
        if (allFlipped) {
            step.cards.forEach((_, idx) => {
                if (flippedCards.has(idx)) onCardFlip(idx, 'flashcard');
            });
        } else {
            step.cards.forEach((_, idx) => {
                if (!flippedCards.has(idx)) onCardFlip(idx, 'flashcard');
            });
        }
    };

    const getGridClass = () => {
        if (!isTeacher) {
            if (totalCards <= 1) return "grid-cols-1 max-w-md mx-auto w-full";
            if (totalCards === 2) return "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto w-full";
            if (totalCards === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full";
            if (totalCards === 4) return "grid-cols-2 md:grid-cols-4 w-full";
            if (totalCards === 5 || totalCards === 6) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 w-full";
            if (totalCards >= 7 && totalCards <= 8) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full";
            return "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
        }

        if (totalCards <= 1) return "grid-cols-1 max-w-md mx-auto w-full";
        if (totalCards === 2) return "grid-cols-2 max-w-4xl mx-auto w-full";
        if (totalCards === 3) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 max-w-6xl mx-auto w-full";
        if (totalCards === 4) {
            if (cardScale === 'xl') return "grid-cols-2 max-w-4xl mx-auto w-full";
            return "grid-cols-2 lg:grid-cols-4 max-w-[98%] mx-auto w-full";
        }
        if (totalCards === 5 || totalCards === 6) {
            if (cardScale === 'xl') return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 w-full";
            return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 w-full";
        }
        if (totalCards >= 7 && totalCards <= 8) {
            if (cardScale === 'xl') return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full";
            return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full";
        }
        if (cardScale === 'xl') return "grid-cols-2 md:grid-cols-2 lg:grid-cols-3";
        if (cardScale === 'lg') return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
        if (cardScale === 'md') return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
        if (cardScale === 'xs') return "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6";
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
    };

    return (
        <div className={cn("w-full p-1.5 sm:p-3 md:p-4 flex flex-col justify-start mx-auto", isTeacher ? "max-w-full" : "max-w-7xl")}>
            <div className={cn(
                "relative flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-5 p-3 sm:p-4 rounded-2xl sm:rounded-3xl backdrop-blur-xl border-2 shadow-sm",
                isSketchnote 
                    ? "bg-[#fefce8] border-[3px] border-[#1e293b] shadow-[4px_4px_0_#1e293b]" 
                    : "bg-white/80 dark:bg-slate-900/80 border-indigo-100 dark:border-white/10"
            )}>
                <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 text-center min-w-0">
                    <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-black shadow-md shrink-0",
                        isSketchnote ? "bg-[#fde047] text-slate-900 border-2 border-[#1e293b]" : "bg-indigo-500 text-white shadow-indigo-200"
                    )}>
                        <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex items-center gap-2 text-center">
                        <h2 className={cn(
                            "text-sm sm:text-lg md:text-2xl drop-shadow-sm tracking-tight text-center",
                            isSketchnote ? "font-['Caveat',cursive] font-black text-slate-900 text-xl sm:text-2xl md:text-3xl" : "font-black text-slate-800 dark:text-white"
                        )}>{step.title}</h2>
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span>•</span>
                            <span className={cn(flippedCount > 0 ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "")}>{flippedCount} / {totalCards} Çevrildi</span>
                        </div>
                    </div>
                </div>

                {isTeacher ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToggleFlipAll}
                        className={cn(
                            "h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl border-2 font-bold text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer",
                            isSketchnote 
                                ? "bg-white hover:bg-slate-50 text-slate-800 border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-['Patrick_Hand',cursive] text-sm" 
                                : "border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900"
                        )}
                    >
                        <RotateCw className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", allFlipped && "rotate-180")} />
                        <span>{allFlipped ? "Tümünü Kapat" : "Tümünü Çevir"}</span>
                    </Button>
                ) : (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
                            <span>Kart İlerlemesi:</span>
                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{flippedCount} / {totalCards}</span>
                            {allFlipped && (
                                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Tamamlandı
                                </span>
                            )}
                        </div>
                        <div className="w-28 sm:w-36 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                                style={{ width: `${totalCards > 0 ? (flippedCount / totalCards) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className={cn("grid gap-2.5 sm:gap-4 md:gap-6 pb-28 transition-all duration-300", getGridClass())}>
                {step.cards.map((card, index) => {
                    const isFlipped = flippedCards.has(index);
                    const theme = FLASHCARD_THEMES[index % FLASHCARD_THEMES.length];

                    return (
                        <FlashcardItem
                            key={index}
                            index={index}
                            term={card.term}
                            definition={card.definition}
                            isFlipped={isFlipped}
                            onFlip={() => onCardFlip(index, 'flashcard')}
                            theme={theme}
                            isFullscreen={isFullscreen}
                            isTeacher={isTeacher}
                            cardScale={cardScale}
                            presentationTheme={presentationTheme}
                            presentationFont={presentationFont}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export function AnagramFlashcardPlayer({ 
    step, 
    flippedCards, 
    onCardFlip, 
    isFullscreen, 
    fontSizeScale = 'normal',
    presentationTheme = 'sketchnote',
    presentationFont = 'sketchnote'
}: { 
    step: AnagramFlashcardStep; 
    flippedCards: Set<number>; 
    onCardFlip: (cardIndex: number, type: 'anagramFlashcard') => void; 
    isFullscreen: boolean; 
    fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge';
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const isSketchnote = presentationTheme === 'sketchnote';

    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'xs' ? 'xs' : 'sm';

    const totalCards = step.cards?.length || 0;
    const flippedCount = Array.from(flippedCards).filter(i => i < totalCards).length;
    const allFlipped = totalCards > 0 && flippedCount === totalCards;

    if (totalCards === 0) {
        return (
            <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-slate-900/60 border border-white/10 text-center text-slate-300">
                <Puzzle className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                <h3 className="text-lg font-black text-white mb-2">{step.title || 'Kelime Avı'}</h3>
                <p className="text-xs text-slate-400">Bu adımda henüz gösterilecek kart bulunmuyor.</p>
            </div>
        );
    }

    const handleToggleFlipAll = () => {
        if (allFlipped) {
            step.cards.forEach((_, idx) => {
                if (flippedCards.has(idx)) onCardFlip(idx, 'anagramFlashcard');
            });
        } else {
            step.cards.forEach((_, idx) => {
                if (!flippedCards.has(idx)) onCardFlip(idx, 'anagramFlashcard');
            });
        }
    };

    const getAnagramFontSize = (wordText: string) => {
        const words = (wordText || '').trim().split(/\s+/).filter(Boolean);
        const maxWordLen = words.length > 0 ? Math.max(...words.map(w => w.length)) : 0;
        const totalLen = (wordText || '').replace(/\s+/g, '').length;

        if (isTeacher) {
            if (cardScale === 'xl') {
                if (maxWordLen > 11 || totalLen > 18) return "text-2xl sm:text-3xl md:text-4xl";
                if (maxWordLen > 8 || totalLen > 13) return "text-3xl sm:text-4xl md:text-5xl";
                if (maxWordLen > 5 || totalLen > 8) return "text-4xl sm:text-5xl md:text-6xl";
                return "text-5xl sm:text-6xl md:text-7xl";
            }
            if (cardScale === 'lg') {
                if (maxWordLen > 11 || totalLen > 18) return "text-xl sm:text-2xl md:text-3xl";
                if (maxWordLen > 8 || totalLen > 13) return "text-2xl sm:text-3xl md:text-4xl";
                if (maxWordLen > 5 || totalLen > 8) return "text-3xl sm:text-4xl md:text-5xl";
                return "text-4xl sm:text-5xl md:text-6xl";
            }
            if (cardScale === 'md') {
                if (maxWordLen > 11 || totalLen > 18) return "text-lg sm:text-xl md:text-2xl";
                if (maxWordLen > 8 || totalLen > 13) return "text-xl sm:text-2xl md:text-3xl";
                if (maxWordLen > 5 || totalLen > 8) return "text-2xl sm:text-3xl md:text-4xl";
                return "text-3xl sm:text-4xl md:text-5xl";
            }
            if (cardScale === 'xs') {
                if (maxWordLen > 11 || totalLen > 18) return "text-xs sm:text-sm md:text-base";
                if (maxWordLen > 8 || totalLen > 13) return "text-sm sm:text-base md:text-lg";
                if (maxWordLen > 5 || totalLen > 8) return "text-base sm:text-lg md:text-xl";
                return "text-lg sm:text-xl md:text-2xl";
            }
            if (maxWordLen > 11 || totalLen > 18) return "text-base sm:text-lg md:text-xl";
            if (maxWordLen > 8 || totalLen > 13) return "text-lg sm:text-xl md:text-2xl";
            if (maxWordLen > 5 || totalLen > 8) return "text-xl sm:text-2xl md:text-3xl";
            return "text-2xl sm:text-3xl md:text-4xl";
        }

        if (maxWordLen > 11 || totalLen > 18) return "text-xs xs:text-sm sm:text-base md:text-lg";
        if (maxWordLen > 8 || totalLen > 13) return "text-sm xs:text-base sm:text-lg md:text-xl";
        if (maxWordLen > 5 || totalLen > 8) return "text-base xs:text-lg sm:text-xl md:text-2xl";
        return "text-lg xs:text-xl sm:text-2xl md:text-3xl";
    };

    const scaleStyles = {
        xs: { 
            height: isTeacher ? "h-[9.5rem] sm:h-[10.5rem]" : "h-[8rem] sm:h-[9.5rem] md:h-[10.5rem]",
            minHeight: isTeacher ? "min-h-[8.5rem] sm:min-h-[9.5rem]" : "min-h-[7.5rem] sm:min-h-[8.5rem] md:min-h-[9.5rem]",
            padding: isTeacher ? "p-2.5 sm:p-3" : "p-2 sm:p-3" 
        },
        sm: { 
            height: isTeacher ? "h-[12rem] sm:h-[13.5rem]" : "h-[9.5rem] sm:h-[11rem] md:h-[12.5rem]",
            minHeight: isTeacher ? "min-h-[11rem] sm:min-h-[12rem]" : "min-h-[8.5rem] sm:min-h-[10rem] md:min-h-[11.5rem]",
            padding: isTeacher ? "p-3.5 sm:p-4" : "p-2.5 sm:p-3.5" 
        },
        md: { 
            height: isTeacher ? "h-[16rem] sm:h-[18rem]" : "h-[12rem] sm:h-[13.5rem] md:h-[15.5rem]",
            minHeight: isTeacher ? "min-h-[15rem] sm:min-h-[16.5rem]" : "min-h-[11rem] sm:min-h-[12.5rem] md:min-h-[14.5rem]",
            padding: isTeacher ? "p-4 sm:p-5" : "p-3 sm:p-4" 
        },
        lg: { 
            height: isTeacher ? "h-[20.5rem] sm:h-[22.5rem]" : "h-[14.5rem] sm:h-[16.5rem] md:h-[18.5rem]",
            minHeight: isTeacher ? "min-h-[19.5rem] sm:min-h-[21.5rem]" : "min-h-[13.5rem] sm:min-h-[15.5rem] md:min-h-[17.5rem]",
            padding: isTeacher ? "p-5 sm:p-6" : "p-4 sm:p-5" 
        },
        xl: { 
            height: isTeacher ? "h-[26rem] sm:h-[28rem]" : "h-[17.5rem] sm:h-[20rem] md:h-[22rem]",
            minHeight: isTeacher ? "min-h-[25rem] sm:min-h-[27rem]" : "min-h-[16.5rem] sm:min-h-[19rem] md:min-h-[21rem]",
            padding: isTeacher ? "p-6 sm:p-7" : "p-5 sm:p-6" 
        },
    }[cardScale];

    const getGridClass = () => {
        if (!isTeacher) {
            if (totalCards <= 1) return "grid-cols-1 max-w-md mx-auto w-full";
            if (totalCards === 2) return "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto w-full";
            if (totalCards === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full";
            if (totalCards === 4) return "grid-cols-2 md:grid-cols-4 w-full";
            if (totalCards === 5 || totalCards === 6) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 w-full";
            if (totalCards >= 7 && totalCards <= 8) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full";
            return "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
        }

        if (totalCards <= 1) return "grid-cols-1 max-w-md mx-auto w-full";
        if (totalCards === 2) return "grid-cols-2 max-w-4xl mx-auto w-full";
        if (totalCards === 3) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 max-w-6xl mx-auto w-full";
        if (totalCards === 4) {
            if (cardScale === 'xl') return "grid-cols-2 max-w-4xl mx-auto w-full";
            return "grid-cols-2 lg:grid-cols-4 max-w-[98%] mx-auto w-full";
        }
        if (totalCards === 5 || totalCards === 6) {
            if (cardScale === 'xl') return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 w-full";
            return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 w-full";
        }
        if (totalCards >= 7 && totalCards <= 8) {
            if (cardScale === 'xl') return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full";
            return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full";
        }
        if (cardScale === 'xl') return "grid-cols-2 md:grid-cols-2 lg:grid-cols-3";
        if (cardScale === 'lg') return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
        if (cardScale === 'md') return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
        if (cardScale === 'xs') return "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6";
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
    };

    return (
        <div className={cn("w-full p-1.5 sm:p-3 md:p-4 flex flex-col justify-start mx-auto", isTeacher ? "max-w-full" : "max-w-7xl")}>
            <div className={cn(
                "relative flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-5 p-3 sm:p-4 rounded-2xl sm:rounded-3xl backdrop-blur-xl border-2 shadow-sm",
                isSketchnote
                    ? "bg-[#fefce8] border-[3px] border-[#1e293b] shadow-[4px_4px_0_#1e293b]"
                    : "bg-white/80 dark:bg-slate-900/80 border-indigo-100 dark:border-white/10"
            )}>
                <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 text-center min-w-0">
                    <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-black shadow-md shrink-0",
                        isSketchnote ? "bg-[#fde047] text-slate-900 border-2 border-[#1e293b]" : "bg-indigo-500 text-white shadow-indigo-200"
                    )}>
                        <Puzzle className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex items-center gap-2 text-center">
                        <h2 className={cn(
                            "text-sm sm:text-lg md:text-2xl drop-shadow-sm tracking-tight text-center",
                            isSketchnote ? "font-['Caveat',cursive] font-black text-slate-900 text-xl sm:text-2xl md:text-3xl" : "font-black text-slate-800 dark:text-white"
                        )}>{step.title}</h2>
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span>•</span>
                            <span className={cn(flippedCount > 0 ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "")}>{flippedCount} / {totalCards} Çözüldü</span>
                        </div>
                    </div>
                </div>

                {isTeacher ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToggleFlipAll}
                        className={cn(
                            "h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl border-2 font-bold text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer",
                            isSketchnote 
                                ? "bg-white hover:bg-slate-50 text-slate-800 border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b] font-['Patrick_Hand',cursive] text-sm" 
                                : "border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900"
                        )}
                    >
                        <RotateCw className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", allFlipped && "rotate-180")} />
                        <span>{allFlipped ? "Tümünü Kapat" : "Tümünü Çevir"}</span>
                    </Button>
                ) : (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
                            <span>Kart İlerlemesi:</span>
                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{flippedCount} / {totalCards}</span>
                            {allFlipped && (
                                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Tamamlandı
                                </span>
                            )}
                        </div>
                        <div className="w-28 sm:w-36 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                                style={{ width: `${totalCards > 0 ? (flippedCount / totalCards) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className={cn("grid gap-2.5 sm:gap-4 md:gap-6 pb-28 transition-all duration-300", getGridClass())}>
                {step.cards.map((card, index) => {
                    const isFlipped = flippedCards.has(index);
                    const theme = isSketchnote 
                        ? SKETCHNOTE_FLASHCARD_THEMES[index % SKETCHNOTE_FLASHCARD_THEMES.length]
                        : FLASHCARD_THEMES[index % FLASHCARD_THEMES.length];

                    return (
                        <div
                            key={index}
                            className={cn(
                                "w-full rounded-2xl sm:rounded-[2rem] [perspective:1200px] cursor-pointer group transition-all duration-300 select-none",
                                scaleStyles.height,
                                scaleStyles.minHeight
                            )}
                            onClick={() => onCardFlip(index, 'anagramFlashcard')}
                        >
                            <motion.div
                                className="relative w-full h-full [transform-style:preserve-3d] transition-all"
                                initial={false}
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                transition={{ duration: 0.6, type: "spring", stiffness: 220, damping: 20 }}
                                whileHover={{ y: -4, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className={cn(
                                    "absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] rounded-2xl sm:rounded-[2rem] flex flex-col justify-between overflow-hidden",
                                    scaleStyles.padding,
                                    theme.front
                                )}>
                                    {!isSketchnote && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent" />}
                                    
                                    <div className="flex items-center justify-between w-full flex-shrink-0 mb-0.5">
                                        <span className={cn(
                                            "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black",
                                            isSketchnote ? theme.badge : "bg-white/20 text-white border border-white/30 backdrop-blur-md"
                                        )}>
                                            #{index + 1}
                                        </span>
                                        <div className={cn(
                                            "flex items-center gap-1 text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-full",
                                            isSketchnote ? theme.badge : "text-white bg-white/20 px-2 py-0.5 sm:px-3 sm:py-1 border border-white/30 backdrop-blur-md"
                                        )}>
                                            <Puzzle className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                                            <span className="hidden xs:inline">Anagram</span>
                                        </div>
                                    </div>

                                    <div className="my-auto py-1 px-1 sm:px-2 text-center w-full flex items-center justify-center">
                                        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 sm:gap-x-3 sm:gap-y-1 max-w-full text-center">
                                            {(card.scrambledWord || '').trim().split(/\s+/).filter(Boolean).map((word, wIdx) => (
                                                <span
                                                    key={wIdx}
                                                    className={cn(
                                                        "tracking-normal sm:tracking-wide uppercase leading-tight inline-block break-words [overflow-wrap:anywhere]",
                                                        isSketchnote ? "font-['Caveat',cursive] font-black text-slate-900 drop-shadow-none" : "font-black text-white drop-shadow-lg",
                                                        getAnagramFontSize(card.scrambledWord)
                                                    )}
                                                >
                                                    {word}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <div className={cn(
                                            "flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                                            isSketchnote ? theme.btn : "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md shadow-sm"
                                        )}>
                                            <RotateCw className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                                            <span>Çözümü Gör</span>
                                        </div>
                                    </div>
                                </div>

                                <div 
                                    className={cn(
                                        "absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] rounded-2xl sm:rounded-[2rem] flex flex-col justify-between overflow-hidden",
                                        scaleStyles.padding,
                                        theme.back
                                    )} 
                                    style={{ transform: "rotateY(180deg)" }}
                                >
                                    {!isSketchnote && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent" />}
                                    
                                    <div className="flex items-center justify-between w-full flex-shrink-0 mb-0.5">
                                        <span className={cn(
                                            "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black",
                                            isSketchnote ? theme.badge : "bg-white/20 text-white border border-white/30 backdrop-blur-md"
                                        )}>
                                            #{index + 1}
                                        </span>
                                        <div className={cn(
                                            "flex items-center gap-1 text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-full",
                                            isSketchnote ? theme.badge : "text-white bg-white/20 px-2 py-0.5 sm:px-3 sm:py-1 border border-white/30 backdrop-blur-md"
                                        )}>
                                            <CheckCircle className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                                            <span className="hidden xs:inline">Çözüm</span>
                                        </div>
                                    </div>

                                    <div className="my-auto py-1 px-1 sm:px-2 text-center w-full flex items-center justify-center">
                                        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 sm:gap-x-3 sm:gap-y-1 max-w-full text-center">
                                            {(card.correctAnswer || '').trim().split(/\s+/).filter(Boolean).map((word, wIdx) => (
                                                <span
                                                    key={wIdx}
                                                    className={cn(
                                                        "tracking-normal sm:tracking-wide uppercase leading-tight inline-block break-words [overflow-wrap:anywhere]",
                                                        isSketchnote ? "font-['Caveat',cursive] font-black text-slate-900 drop-shadow-none" : "font-black text-white drop-shadow-lg",
                                                        getAnagramFontSize(card.correctAnswer)
                                                    )}
                                                >
                                                    {word}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <div className={cn(
                                            "flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                                            isSketchnote ? theme.btn : "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md shadow-sm"
                                        )}>
                                            <RotateCw className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                                            <span>Çevir</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
