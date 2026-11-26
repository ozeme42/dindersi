'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { 
    Maximize2, Minimize2, Maximize, Minimize, ImageOff, ArrowRight, RotateCw, RotateCcw, CheckCircle2, 
    Sparkles, RefreshCw, Eye, EyeOff, AlertCircle, Shuffle, Check, 
    Pencil, Undo, Trash2, X, Move, ChevronRight, Puzzle, CheckCircle, Volume2,
    AlertTriangle, ExternalLink, XCircle, FastForward, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, transformGoogleDriveImageUrl } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { PresentationDrawingBoard } from '@/components/presentation-drawing-board';
import type { 
    VisualStep, AnagramStep, AnagramGameStep, 
    SentenceScrambleStep, HtmlSlideStep, ConceptMapStep, TrueFalseListStep 
} from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playSound } from '@/lib/audio-service';
import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};


// --- 1. VisualPlayer ---
export function VisualPlayer({ step, isMaximized, onToggleMaximize }: { step: VisualStep, isMaximized: boolean, onToggleMaximize: () => void }) {
    const [hasError, setHasError] = useState(false);
    const directImageUrl = useMemo(() => transformGoogleDriveImageUrl(step.imageUrl), [step.imageUrl]);

    useEffect(() => {
        setHasError(false);
    }, [step.imageUrl]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isMaximized) {
                onToggleMaximize();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMaximized, onToggleMaximize]);

    return (
        <div 
            className={cn(
                "relative flex flex-col items-center justify-center bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 transition-all duration-500 ease-in-out",
                isMaximized 
                    ? "fixed inset-0 z-[40] w-screen h-screen rounded-none border-0 bg-black dark:bg-black" 
                    : "w-full h-full min-h-[300px] sm:min-h-[420px]"
            )}
        >
            <div className="absolute top-4 right-4 z-50">
                <Button
                    onClick={(e) => {
                        e.stopPropagation(); 
                        onToggleMaximize();
                    }}
                    variant="secondary"
                    size="icon"
                    className="bg-white/80 hover:bg-white text-slate-800 backdrop-blur-md border border-slate-200 rounded-full w-12 h-12 shadow-lg transition-transform hover:scale-110 cursor-pointer"
                    title={isMaximized ? "Küçült" : "Tam Ekran Yap"}
                >
                    {isMaximized ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                </Button>
            </div>

            <div className="relative w-full h-full flex items-center justify-center">
                {hasError ? (
                    <div className="p-8 max-w-md text-center flex flex-col items-center gap-3 bg-slate-900/90 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl z-10 m-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 text-amber-400" />
                        </div>
                        <h4 className="text-lg font-black text-white">Görsel Yüklenemedi</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Bu görsel Google Drive veya harici bağlantıdan yüklenemedi. Google Drive bağlantısı kullanıyorsanız, dosya paylaşım ayarının <strong>"Bağlantıya sahip olan herkes görüntüleyebilir"</strong> olarak ayarlandığından emin olun.
                        </p>
                        {step.imageUrl && (
                            <a
                                href={step.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md mt-2"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> Görseli Yeni Sekmede Aç
                            </a>
                        )}
                    </div>
                ) : (
                    <Image 
                        src={directImageUrl} 
                        alt={step.title || 'Görsel'} 
                        fill
                        unoptimized
                        onError={() => setHasError(true)}
                        className={cn(
                            "transition-all duration-500",
                            isMaximized ? "object-contain p-4" : "object-contain"
                        )}
                        priority
                    />
                )}
            </div>

            {step.caption && !isMaximized && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[90%] bg-slate-950/85 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full text-xs text-slate-200 font-medium text-center z-30 shadow-lg">
                    {step.caption}
                </div>
            )}
        </div>
    );
}

// --- 2. InteractiveTrueFalseList ---
export function InteractiveTrueFalseList({ 
    step, 
    isFullscreen, 
    answers, 
    onAnswer, 
    onAllAnswered, 
    fontSizeScale = 'normal', 
    isTeacher: propIsTeacher,
    presentationTheme = 'sketchnote',
    presentationFont = 'sketchnote'
}: { 
    step: TrueFalseListStep; 
    isFullscreen: boolean; 
    answers: any; 
    onAnswer: (index: number, val: boolean) => void; 
    onAllAnswered: () => void; 
    fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge'; 
    isTeacher?: boolean;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const authIsTeacher = useTeacherMode();
    const isTeacher = typeof propIsTeacher === 'boolean' ? propIsTeacher : authIsTeacher;
    const isSketchnote = presentationTheme === 'sketchnote';
    const isDarkTheme = presentationTheme === 'cosmic-dark' || presentationTheme === 'vibrant-studio' || presentationTheme === 'game-3d';

    const [classVoteMode, setClassVoteMode] = useState<boolean>(false);
    const [pendingVotes, setPendingVotes] = useState<Record<number, boolean>>({});
    const [localRetry, setLocalRetry] = useState<boolean>(false);

    useEffect(() => {
        setPendingVotes({});
        setLocalRetry(false);
    }, [step]);

    const allAnswered = step.questions.every((_: any, index: number) => answers && answers[index] !== undefined);
    const isCompleted = answers?.completed;

    useEffect(() => {
        if (allAnswered && !isCompleted) {
            onAllAnswered();
        }
    }, [allAnswered, isCompleted, onAllAnswered]);

    const handleCardVoteOrAnswer = (index: number, val: boolean) => {
        if (classVoteMode) {
            playSound('pop');
            setPendingVotes(prev => {
                if (prev[index] === val) {
                    const copy = { ...prev };
                    delete copy[index];
                    return copy;
                }
                return { ...prev, [index]: val };
            });
            return;
        }
        setLocalRetry(false);
        onAnswer(index, val);
    };

    const handleRevealAllVotes = () => {
        setLocalRetry(false);
        step.questions.forEach((q, idx) => {
            if (!answers || answers[idx] === undefined || localRetry) {
                const chosen = pendingVotes[idx] !== undefined ? pendingVotes[idx] : q.isTrue;
                onAnswer(idx, chosen);
            }
        });
    };

    const sketchnoteThemes = [
        { card: 'bg-[#fefce8] border-[2.5px] border-[#1e293b] shadow-[4px_4px_0_#1e293b]', numBg: 'bg-[#fde047] text-slate-900 border border-slate-900' },
        { card: 'bg-[#f0f9ff] border-[2.5px] border-[#1e293b] shadow-[4px_4px_0_#1e293b]', numBg: 'bg-[#38bdf8] text-slate-900 border border-slate-900' },
        { card: 'bg-[#fdf2f8] border-[2.5px] border-[#1e293b] shadow-[4px_4px_0_#1e293b]', numBg: 'bg-[#f472b6] text-slate-900 border border-slate-900' },
        { card: 'bg-[#f0fdf4] border-[2.5px] border-[#1e293b] shadow-[4px_4px_0_#1e293b]', numBg: 'bg-[#4ade80] text-slate-900 border border-slate-900' },
        { card: 'bg-[#fff7ed] border-[2.5px] border-[#1e293b] shadow-[4px_4px_0_#1e293b]', numBg: 'bg-[#fb923c] text-slate-900 border border-slate-900' },
        { card: 'bg-[#faf5ff] border-[2.5px] border-[#1e293b] shadow-[4px_4px_0_#1e293b]', numBg: 'bg-[#c084fc] text-slate-900 border border-slate-900' },
    ];

    const colorThemes = isDarkTheme ? [
        { card: 'border-2 border-cyan-400/50 bg-slate-900/90 hover:bg-slate-900 text-white shadow-lg', number: 'text-cyan-300' },
        { card: 'border-2 border-purple-400/50 bg-slate-900/90 hover:bg-slate-900 text-white shadow-lg', number: 'text-purple-300' },
        { card: 'border-2 border-amber-400/50 bg-slate-900/90 hover:bg-slate-900 text-white shadow-lg', number: 'text-amber-300' },
        { card: 'border-2 border-rose-400/50 bg-slate-900/90 hover:bg-slate-900 text-white shadow-lg', number: 'text-rose-300' },
        { card: 'border-2 border-emerald-400/50 bg-slate-900/90 hover:bg-slate-900 text-white shadow-lg', number: 'text-emerald-300' },
        { card: 'border-2 border-indigo-400/50 bg-slate-900/90 hover:bg-slate-900 text-white shadow-lg', number: 'text-indigo-300' },
    ] : [
        { card: 'border-2 border-cyan-300 bg-white/95 hover:bg-cyan-50/60 shadow-md shadow-cyan-100/50', number: 'text-cyan-600' },
        { card: 'border-2 border-purple-300 bg-white/95 hover:bg-purple-50/60 shadow-md shadow-purple-100/50', number: 'text-purple-600' },
        { card: 'border-2 border-amber-300 bg-white/95 hover:bg-amber-50/60 shadow-md shadow-amber-100/50', number: 'text-amber-600' },
        { card: 'border-2 border-rose-300 bg-white/95 hover:bg-rose-50/60 shadow-md shadow-rose-100/50', number: 'text-rose-600' },
        { card: 'border-2 border-emerald-300 bg-white/95 hover:bg-emerald-50/60 shadow-md shadow-emerald-100/50', number: 'text-emerald-600' },
        { card: 'border-2 border-indigo-300 bg-white/95 hover:bg-indigo-50/60 shadow-md shadow-indigo-100/50', number: 'text-indigo-600' },
    ];

    const getTfFontSize = () => {
        if (!isTeacher) {
            if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "text-base md:text-xl";
            if (fontSizeScale === 'lg') return "text-sm md:text-lg";
            if (fontSizeScale === 'xs') return "text-xs md:text-sm";
            return "text-sm md:text-base";
        }
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "text-3xl md:text-4xl lg:text-5xl";
        if (fontSizeScale === 'lg') return "text-2xl md:text-3xl lg:text-4xl";
        if (fontSizeScale === 'md') return "text-xl md:text-2xl lg:text-3xl";
        if (fontSizeScale === 'xs') return "text-base md:text-lg";
        // sm / normal (varsayılan öğretmen modu - akıllı tahta için rahatça okunabilir)
        return "text-xl md:text-2xl lg:text-3xl";
    };

    const getTfBtnClass = () => {
        if (!isTeacher) return "h-11 text-xs sm:text-sm rounded-xl";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "h-20 text-2xl md:text-3xl rounded-2xl";
        if (fontSizeScale === 'lg') return "h-18 text-xl md:text-2xl rounded-2xl";
        if (fontSizeScale === 'xs') return "h-12 text-base rounded-xl";
        return "h-16 text-lg md:text-xl rounded-xl";
    };

    const getTfBtnIconClass = () => {
        if (!isTeacher) return "h-4 w-4";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "h-8 w-8 md:h-9 md:w-9";
        if (fontSizeScale === 'lg') return "h-7 w-7 md:h-8 md:w-8";
        if (fontSizeScale === 'xs') return "h-5 w-5";
        return "h-6 w-6";
    };

    return (
        <div className={cn("w-full flex flex-col items-center justify-start p-1 sm:p-2", isTeacher ? "h-full max-w-[96%] mx-auto" : "max-w-3xl mx-auto pb-8")}>
             <div className={cn(
                "relative rounded-2xl border backdrop-blur-xl flex-shrink-0 w-full overflow-hidden transition-colors",
                isTeacher 
                    ? (isSketchnote 
                        ? "border-[2.5px] border-[#1e293b] bg-[#fefce8] py-2.5 px-5 mb-3 mt-0 shadow-[4px_4px_0_#1e293b]" 
                        : isDarkTheme
                            ? "border border-white/15 bg-slate-900/90 py-2.5 px-5 mb-3 mt-0 text-white shadow-lg"
                            : "border border-slate-200/90 bg-white py-2.5 px-5 mb-3 mt-0 shadow-md") 
                    : (isSketchnote
                        ? "border-2 border-[#1e293b] bg-[#fefce8] py-2.5 px-4 mb-2.5 shadow-[3px_3px_0_#1e293b]"
                        : isDarkTheme
                            ? "border-white/10 bg-slate-900/85 py-2.5 px-4 mb-2.5 text-white"
                            : "border-slate-200/90 bg-white py-2.5 px-4 mb-2.5 shadow-sm")
            )}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                    <h2 className={cn(
                        "font-black tracking-tight",
                        isSketchnote 
                            ? "font-['Caveat',cursive] text-slate-900 text-3xl md:text-5xl" 
                            : (isTeacher && !isDarkTheme ? "bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-2xl md:text-4xl" : "bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 text-lg sm:text-2xl")
                    )}>{step.title}</h2>

                    {isTeacher && (
                        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    playSound('pop');
                                    setClassVoteMode(prev => !prev);
                                    setPendingVotes({});
                                }}
                                className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer",
                                    classVoteMode
                                        ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                                        : isDarkTheme
                                            ? "bg-white/10 text-slate-200 border-white/20 hover:bg-white/20"
                                            : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                                )}
                            >
                                {classVoteMode ? "🗳️ Önce İşaretle (Açık)" : "⚡ Anlık Kontrol"}
                            </button>
                            {classVoteMode && (
                                <button
                                    type="button"
                                    onClick={handleRevealAllVotes}
                                    className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-white shadow cursor-pointer"
                                >
                                    Cevapları Aç
                                </button>
                            )}
                            {allAnswered && !localRetry && (
                                <button
                                    type="button"
                                    onClick={() => { setPendingVotes({}); setLocalRetry(true); }}
                                    className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow cursor-pointer"
                                >
                                    Tekrar Sor
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className={cn("w-full grid gap-3 pb-20", isTeacher ? "grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5 md:gap-6" : "grid-cols-1")}>
                {step.questions.map((q: any, index: number) => {
                    const userAnswer = !localRetry && answers ? answers[index] : undefined;
                    const isAnswered = userAnswer !== undefined;
                    const isCorrect = isAnswered && userAnswer.isCorrect;
                    const votedVal = !isAnswered ? pendingVotes[index] : undefined;
                    
                    const theme = colorThemes[index % colorThemes.length];
                    const skTheme = sketchnoteThemes[index % sketchnoteThemes.length];

                    return (
                        <div key={index} className={cn(
                            "rounded-2xl md:rounded-3xl border-2 shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-md",
                            isTeacher 
                                ? (fontSizeScale === 'xl' || fontSizeScale === 'huge' ? "p-6 md:p-8 min-h-[16rem]" : fontSizeScale === 'lg' ? "p-5 md:p-7 min-h-[14rem]" : "p-5 md:p-6 min-h-[12rem]")
                                : "p-3.5 sm:p-4 min-h-0",
                            isAnswered
                                ? (isCorrect 
                                    ? (isSketchnote 
                                        ? "border-[3px] border-[#15803d] bg-[#dcfce7] shadow-[4px_4px_0_#15803d]" 
                                        : (isTeacher && !isDarkTheme ? "border-2 border-emerald-500 bg-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.25)]" : "border-emerald-500/60 bg-emerald-950/60 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]")) 
                                    : (isSketchnote 
                                        ? "border-[3px] border-[#991b1b] bg-[#fee2e2] shadow-[4px_4px_0_#991b1b]" 
                                        : (isTeacher && !isDarkTheme ? "border-2 border-rose-500 bg-rose-50 shadow-[0_0_20px_rgba(244,63,94,0.25)]" : "border-rose-500/60 bg-rose-950/60 text-white shadow-[0_0_20px_rgba(244,63,94,0.2)]")))
                                : (isSketchnote 
                                    ? skTheme.card 
                                    : `${theme.card} border`)
                        )}>
                            <div className="flex gap-2.5 sm:gap-3 mb-3">
                                <span className={cn(
                                    "font-black shrink-0", 
                                    isSketchnote 
                                        ? `w-8 h-8 md:w-9 md:h-9 rounded-full ${skTheme.numBg} flex items-center justify-center text-sm md:text-base shadow-[1px_1px_0_#1e293b]` 
                                        : (isTeacher ? (fontSizeScale === 'xl' || fontSizeScale === 'huge' ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl") : "text-base sm:text-lg"), 
                                    !isSketchnote && (isAnswered ? (isCorrect ? "text-emerald-400" : "text-rose-400") : theme.number)
                                )}>
                                    {index + 1}
                                </span>
                                <p className={cn(
                                    "font-bold leading-snug sm:leading-relaxed", 
                                    isSketchnote ? "font-['Patrick_Hand',cursive] text-slate-900" : (isTeacher && !isDarkTheme ? "text-slate-800" : "text-slate-100"),
                                    getTfFontSize()
                                )}>
                                    {q.statement}
                                </p>
                            </div>

                            {isAnswered && q.explanation && (
                                <div className={cn(
                                    "mb-3 px-3.5 py-2 rounded-xl border text-left text-xs sm:text-sm md:text-base font-semibold leading-snug",
                                    isSketchnote
                                        ? "bg-white/90 border-[#1e293b]/30 text-slate-800 font-['Patrick_Hand',cursive]"
                                        : isDarkTheme || !isTeacher
                                            ? "bg-black/35 border-white/15 text-slate-100"
                                            : "bg-white/85 border-slate-300 text-slate-800"
                                )}>
                                    <span className="font-black mr-1">💡 Açıklama:</span>
                                    {q.explanation}
                                </div>
                            )}

                            <div className="flex gap-2 sm:gap-3 mt-auto">
                                <button
                                    onClick={() => !isAnswered && handleCardVoteOrAnswer(index, true)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "flex-1 font-black transition-all border flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer",
                                        isSketchnote && "font-['Patrick_Hand',cursive] text-lg md:text-xl",
                                        getTfBtnClass(),
                                        votedVal === true && "ring-4 ring-amber-400 scale-[1.02]",
                                        isAnswered && userAnswer.answer === true
                                            ? (userAnswer.isCorrect 
                                                ? (isSketchnote ? "bg-[#22c55e] border-[2.5px] border-[#15803d] text-white shadow-[3px_3px_0_#15803d]" : "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]") 
                                                : (isSketchnote ? "bg-[#ef4444] border-[2.5px] border-[#991b1b] text-white shadow-[3px_3px_0_#991b1b]" : "bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"))
                                            : isAnswered && userAnswer.answer !== true
                                                ? (isDarkTheme || !isTeacher ? "bg-white/5 border-white/10 text-slate-400 opacity-40 shadow-none" : "bg-slate-100 border-slate-200 text-slate-400 opacity-40 shadow-none")
                                                : isTeacher
                                                    ? (isSketchnote 
                                                        ? "bg-[#22c55e] hover:bg-[#16a34a] text-white border-[2.5px] border-[#1e293b] shadow-[3px_3px_0_#1e293b]" 
                                                        : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 border-emerald-400")
                                                    : "bg-emerald-600/30 hover:bg-emerald-600/50 border-emerald-500/40 text-emerald-300"
                                    )}
                                >
                                    <CheckCircle className={getTfBtnIconClass()} /> Doğru
                                </button>
                                <button
                                    onClick={() => !isAnswered && handleCardVoteOrAnswer(index, false)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "flex-1 font-black transition-all border flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer",
                                        isSketchnote && "font-['Patrick_Hand',cursive] text-lg md:text-xl",
                                        getTfBtnClass(),
                                        votedVal === false && "ring-4 ring-amber-400 scale-[1.02]",
                                        isAnswered && userAnswer.answer === false
                                            ? (userAnswer.isCorrect 
                                                ? (isSketchnote ? "bg-[#22c55e] border-[2.5px] border-[#15803d] text-white shadow-[3px_3px_0_#15803d]" : "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]") 
                                                : (isSketchnote ? "bg-[#ef4444] border-[2.5px] border-[#991b1b] text-white shadow-[3px_3px_0_#991b1b]" : "bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"))
                                            : isAnswered && userAnswer.answer !== false
                                                ? (isDarkTheme || !isTeacher ? "bg-white/5 border-white/10 text-slate-400 opacity-40 shadow-none" : "bg-slate-100 border-slate-200 text-slate-400 opacity-40 shadow-none")
                                                : isTeacher
                                                    ? (isSketchnote 
                                                        ? "bg-[#ef4444] hover:bg-[#dc2626] text-white border-[2.5px] border-[#1e293b] shadow-[3px_3px_0_#1e293b]" 
                                                        : "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/25 border-rose-400")
                                                    : "bg-rose-600/30 hover:bg-rose-600/50 border-rose-500/40 text-rose-300"
                                    )}
                                >
                                    <XCircle className={getTfBtnIconClass()} /> Yanlış
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


// 7. GÜNCELLENMİŞ AnagramGame
export function AnagramGame({ step, onAnswer, answer, isAnswerRevealed, onCorrectAndNext, isTeacher, isFullscreen }: { step: AnagramStep, onAnswer: (answer: string) => void, answer: { answer: string, isCorrect: boolean } | null, isAnswerRevealed: boolean, onCorrectAndNext: () => void, isTeacher?: boolean, isFullscreen?: boolean }) {
    
    const targetWords = useMemo(() => (step.correctAnswer || '').trim().split(/\s+/).filter(Boolean), [step.correctAnswer]);
    const targetStringClean = useMemo(() => (step.correctAnswer || '').replace(/\s+/g, '').toLocaleUpperCase('tr-TR'), [step.correctAnswer]);

    type AnagramLetterItem = { id: number; letter: string };

    const getLettersFromStep = useCallback((): AnagramLetterItem[] => {
        const raw = (step.scrambledWord || (step as any).word || step.correctAnswer || '').trim();
        return raw ? raw.toLocaleUpperCase('tr-TR').split('').map((letter: string, index: number) => ({ id: index, letter })) : [];
    }, [step.scrambledWord, (step as any).word, step.correctAnswer]);

    const initialLetters = useMemo<AnagramLetterItem[]>(() => getLettersFromStep(), [getLettersFromStep]);

    const [bankLetters, setBankLetters] = useState<AnagramLetterItem[]>(initialLetters);
    const [constructedLetters, setConstructedLetters] = useState<AnagramLetterItem[]>([]);
    const [shakingLetterId, setShakingLetterId] = useState<number | null>(null);

    const letterColors = [
        "bg-white text-rose-600 border-2 border-rose-300 hover:bg-rose-50 shadow-md",
        "bg-white text-orange-600 border-2 border-orange-300 hover:bg-orange-50 shadow-md",
        "bg-white text-amber-600 border-2 border-amber-300 hover:bg-amber-50 shadow-md",
        "bg-white text-emerald-600 border-2 border-emerald-300 hover:bg-emerald-50 shadow-md",
        "bg-white text-cyan-600 border-2 border-cyan-300 hover:bg-cyan-50 shadow-md",
        "bg-white text-blue-600 border-2 border-blue-300 hover:bg-blue-50 shadow-md",
        "bg-white text-indigo-600 border-2 border-indigo-300 hover:bg-indigo-50 shadow-md",
        "bg-white text-purple-600 border-2 border-purple-300 hover:bg-purple-50 shadow-md",
    ];

    useEffect(() => {
        setBankLetters(getLettersFromStep());
        setConstructedLetters([]);
        setShakingLetterId(null);
    }, [step, getLettersFromStep]);
      
    const handleLetterClick = (clickedLetter: typeof initialLetters[0]) => {
        if (isAnswerRevealed) return;

        const currentIndex = constructedLetters.length;
        const targetChar = targetStringClean[currentIndex];

        if (clickedLetter.letter === targetChar) {
            playSound('correct');
            setConstructedLetters(prev => [...prev, clickedLetter]);
            setBankLetters(prev => prev.filter(l => l.id !== clickedLetter.id));
        } else {
            playSound('incorrect');
            setShakingLetterId(clickedLetter.id);
            setTimeout(() => setShakingLetterId(null), 500);
        }
    };

    const handleConstructedClick = (clickedLetter: typeof initialLetters[0]) => {
        if (isAnswerRevealed) return;
        setConstructedLetters(prev => prev.filter(l => l.id !== clickedLetter.id));
        setBankLetters(prev => [...prev, clickedLetter].sort((a,b) => a.id - b.id));
    };

    useEffect(() => {
        if (!isAnswerRevealed && constructedLetters.length === targetStringClean.length) {
            onAnswer(step.correctAnswer); 
        }
    }, [constructedLetters, targetStringClean.length, isAnswerRevealed, onAnswer, step.correctAnswer]);
      
    let globalCharIndex = 0;

    return (
        <div className={cn(
            "space-y-4 md:space-y-8 flex flex-col items-center mx-auto p-4 w-full",
            isTeacher ? "max-w-full justify-center" : "max-w-5xl justify-center"
        )}>
            <div className="bg-white/95 p-5 md:p-8 rounded-3xl border-2 border-indigo-200 shadow-xl shadow-indigo-100/50 backdrop-blur-md w-full max-w-6xl text-center">
                 <p className={cn("font-black italic text-slate-900", isTeacher ? "text-3xl sm:text-4xl md:text-5xl leading-snug tracking-tight" : "text-xl md:text-3xl")}>"{step.definition}"</p>
            </div>
             
            {/* CEVAP ALANI */}
            <div className={cn(
                "flex flex-wrap justify-center items-center gap-x-4 gap-y-2 md:gap-x-8 md:gap-y-4 p-4 md:p-8 rounded-3xl bg-white/95 border-2 border-indigo-200 shadow-xl shadow-indigo-100/50 w-full max-w-6xl", 
                isTeacher ? "min-h-[12rem]" : "min-h-[8rem]"
            )}>
                {targetWords.map((word, wordIndex) => (
                    <div key={wordIndex} className="flex flex-nowrap gap-1 md:gap-2">
                        {word.split('').map((char, charIndex) => {
                            const letterObj = constructedLetters[globalCharIndex];
                            globalCharIndex++;

                            const showCard = letterObj || isAnswerRevealed;

                            return (
                                <div 
                                    key={`${wordIndex}-${charIndex}`} 
                                    onClick={() => letterObj && !isAnswerRevealed && handleConstructedClick(letterObj)} 
                                    className={cn(
                                        "rounded-lg md:rounded-xl flex items-center justify-center font-black cursor-pointer shadow-md transition-all border-b-2 md:border-b-4",
                                        isTeacher ? "h-20 w-16 text-4xl border-b-8" : "h-10 w-8 text-lg md:h-14 md:w-10 md:text-2xl md:border-b-4 text-sm",
                                        showCard
                                            ? cn(
                                                "bg-white active:translate-y-1 active:border-b-0",
                                                isAnswerRevealed 
                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-400" 
                                                    : "text-indigo-700 border-indigo-300"
                                              )
                                            : "bg-slate-100 border-slate-300 text-transparent border-dashed border-2"
                                    )}
                                >
                                    {letterObj ? letterObj.letter : (isAnswerRevealed ? char : '')}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* BANKA */}
            {!isAnswerRevealed ? (
                <div className="flex flex-wrap justify-center gap-2 md:gap-3 p-2 md:p-4">
                    {bankLetters.map((item, index) => {
                        const colorClass = letterColors[index % letterColors.length];
                        return (
                            <Button 
                                key={item.id} 
                                onClick={() => handleLetterClick(item)} 
                                className={cn(
                                    "font-black border-b-4 active:border-b-0 active:translate-y-1 transition-all duration-100 shadow-md",
                                    colorClass,
                                    isTeacher ? "h-20 w-16 text-4xl rounded-2xl border-b-8" : "h-12 w-10 text-xl md:h-16 md:w-14 md:text-3xl md:border-b-8",
                                    shakingLetterId === item.id && "!bg-red-500 !border-red-700 !text-white animate-shake"
                                )}
                            >
                                {item.letter}
                            </Button>
                        )
                    })}
                </div>
            ) : (
                 <div className="text-center mt-6 animate-in slide-in-from-bottom-4">
                    <Button onClick={onCorrectAndNext} className={cn("font-bold text-white transition-all transform hover:scale-105 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200/50 shadow-lg", isTeacher ? "h-16 px-10 text-xl rounded-2xl" : "h-12 px-6 text-lg rounded-xl")}>
                        Harika! Sonraki <ArrowRight className="ml-3 h-5 w-5"/>
                    </Button>
                 </div>
            )}
        </div>
    );
};

// 7.1 AnagramGamePlayer
export function AnagramGamePlayer({ step, onAnswered, isTeacher, isFullscreen }: { step: AnagramGameStep, onAnswered: () => void, isTeacher: boolean, isFullscreen: boolean }) {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [answerState, setAnswerState] = useState<{ [cardIndex: number]: { answer: string; isCorrect: boolean } }>({});
    
    if (!step.cards || step.cards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="bg-red-50 border-2 border-red-200 text-red-600 p-8 rounded-3xl backdrop-blur-md">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                    <h3 className="text-2xl font-bold mb-2">Veri Hatası</h3>
                    <p className="text-lg">Bu adım için kelime kartları bulunamadı.</p>
                </div>
            </div>
        );
    }

    const isFinished = currentCardIndex >= step.cards.length;
    const currentCard = step.cards[currentCardIndex];

    const handleAnswer = (userAnswer: string) => {
        setAnswerState(prev => ({ ...prev, [currentCardIndex]: { answer: userAnswer, isCorrect: true } }));
    };

    const handleNext = () => {
        if (currentCardIndex < step.cards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
        } else {
            onAnswered();
        }
    };

    const handleSkip = () => {
        handleAnswer(currentCard.correctAnswer); 
        setTimeout(handleNext, 300);
    };

    if (isFinished) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-800">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4"/>
                <h3 className="text-2xl font-bold">Tüm kelimeler tamamlandı!</h3>
            </div>
        );
    }
    
    if (!currentCard) return null;

    return (
        <div className="w-full h-full flex flex-col justify-center relative">
             <div className="flex justify-between items-center px-4 mb-2 md:mb-4">
                 <div className="text-slate-600 font-bold uppercase tracking-widest text-xs md:text-sm bg-white shadow-sm border border-slate-200 px-3 py-1 rounded-full">
                    Kelime {currentCardIndex + 1} / {step.cards.length}
                </div>
                {isTeacher && !answerState[currentCardIndex] && (
                    <Button 
                        onClick={handleSkip} 
                        variant="ghost" 
                        size="sm" 
                        className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                    >
                        <FastForward className="w-4 h-4 mr-2" /> Atla
                    </Button>
                )}
             </div>
            
            <AnagramGame 
                step={{...currentCard, title: step.title, type: 'anagram'}} 
                onAnswer={handleAnswer}
                answer={answerState[currentCardIndex]}
                isAnswerRevealed={!!answerState[currentCardIndex]}
                onCorrectAndNext={handleNext} 
                isTeacher={isTeacher}
                isFullscreen={isFullscreen}
            />
        </div>
    )
}

// 8. SentenceScrambleGame (GÜNCELLENDİ: BİTİŞ KONTROLÜ & AKILLI TAHTA ÖLÇEKLENDİRME)
export function SentenceScrambleGame({ 
    step, 
    onAnswer, 
    onCorrectAndNext, 
    answer, 
    isAnswerRevealed,
    fontSizeScale = 'normal',
    isFullscreen = false,
    presentationTheme
}: { 
    step: SentenceScrambleStep, 
    onAnswer: (answer: string) => void, 
    onCorrectAndNext: () => void, 
    answer?: { answer: string, isCorrect: boolean } | null, 
    isAnswerRevealed: boolean,
    fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge',
    isFullscreen?: boolean,
    presentationTheme?: string
}) {
    const isTeacher = useTeacherMode();
    const isDarkTheme = presentationTheme === 'cosmic-dark' || presentationTheme === 'vibrant-studio' || presentationTheme === 'game-3d';

    type ScrambleWordItem = { id: number; word: string };

    const getWordsFromStep = useCallback((): ScrambleWordItem[] => {
        let text = (step.scrambledSentence || (step as any).sentence || (step as any).scrambled || '').trim();
        if (!text && step.correctSentence) {
            const words = step.correctSentence.trim().split(/\s+/).filter(Boolean);
            if (words.length > 1) {
                text = [...words].sort(() => Math.random() - 0.5).join(' ');
            } else {
                text = step.correctSentence.trim();
            }
        }
        if (!text) return [];
        return text.split(/\s+/).filter(Boolean).map((word: string, index: number) => ({ id: index, word }));
    }, [step.scrambledSentence, (step as any).sentence, (step as any).scrambled, step.correctSentence]);

    const initialWords = useMemo<ScrambleWordItem[]>(() => getWordsFromStep(), [getWordsFromStep]);
    const [bankWords, setBankWords] = useState<ScrambleWordItem[]>(initialWords);
    const [constructedWords, setConstructedWords] = useState<ScrambleWordItem[]>([]);
    const [mistakenWordId, setMistakenWordId] = useState<number | null>(null);

    const wordColors = [
        'bg-sky-500 hover:bg-sky-600 text-white border-2 border-sky-400 border-b-4 md:border-b-8 border-b-sky-700 shadow-lg shadow-sky-500/25',
        'bg-purple-500 hover:bg-purple-600 text-white border-2 border-purple-400 border-b-4 md:border-b-8 border-b-purple-700 shadow-lg shadow-purple-500/25',
        'bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-400 border-b-4 md:border-b-8 border-b-amber-700 shadow-lg shadow-amber-500/25',
        'bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-emerald-400 border-b-4 md:border-b-8 border-b-emerald-700 shadow-lg shadow-emerald-500/25',
        'bg-rose-500 hover:bg-rose-600 text-white border-2 border-rose-400 border-b-4 md:border-b-8 border-b-rose-700 shadow-lg shadow-rose-500/25',
        'bg-cyan-500 hover:bg-cyan-600 text-slate-900 border-2 border-cyan-400 border-b-4 md:border-b-8 border-b-cyan-700 shadow-lg shadow-cyan-500/25',
        'bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-indigo-400 border-b-4 md:border-b-8 border-b-indigo-700 shadow-lg shadow-indigo-500/25',
        'bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-400 border-b-4 md:border-b-8 border-b-orange-700 shadow-lg shadow-orange-500/25',
    ];

    useEffect(() => {
        setBankWords(getWordsFromStep());
        setConstructedWords([]);
        setMistakenWordId(null);
    }, [step, getWordsFromStep]);

    const handleWordClick = (clickedWord: typeof initialWords[0]) => {
        if (isAnswerRevealed || mistakenWordId !== null) return;
        const correctText = (step.correctSentence || step.scrambledSentence || (step as any).sentence || '').trim();
        const correctWordArray = correctText ? correctText.split(/\s+/).filter(Boolean) : [];
        const nextCorrectWord = correctWordArray[constructedWords.length];
        if (clickedWord.word === nextCorrectWord) {
            playSound('correct');
            setConstructedWords(prev => [...prev, clickedWord]);
            setBankWords(prev => prev.filter(w => w.id !== clickedWord.id));
            setMistakenWordId(null);
        } else {
            playSound('incorrect');
            setMistakenWordId(clickedWord.id);
            setTimeout(() => { setMistakenWordId(null); }, 820);
        }
    };
      
    const handleRemoveFromConstructed = (wordIndex: number) => {
        if (isAnswerRevealed) return;
        playSound('pop');
        const removed = constructedWords.slice(wordIndex);
        setConstructedWords(prev => prev.slice(0, wordIndex));
        setBankWords(prev => [...prev, ...removed].sort((a, b) => a.id - b.id));
    };

    const handleResetScramble = () => {
        playSound('pop');
        setBankWords(getWordsFromStep());
        setConstructedWords([]);
        setMistakenWordId(null);
    };

    useEffect(() => {
        if (!isAnswerRevealed && bankWords.length === 0 && constructedWords.length > 0) {
            const userAnswer = constructedWords.map(w => w.word).join(' ');
            onAnswer(userAnswer);
        }
    }, [bankWords.length, constructedWords, isAnswerRevealed, onAnswer]);

    useEffect(() => {
        if (answer?.isCorrect && !isTeacher) {
            const timeoutId = setTimeout(() => { onCorrectAndNext(); }, 1500);
            return () => clearTimeout(timeoutId);
        }
    }, [answer, onCorrectAndNext, isTeacher]);

    const getInstructionClass = () => {
        if (!isTeacher) return "text-sm md:text-base";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "text-2xl md:text-4xl py-3 px-8";
        if (fontSizeScale === 'lg') return "text-xl md:text-3xl py-2.5 px-7";
        if (fontSizeScale === 'xs') return "text-base md:text-lg py-2 px-5";
        return "text-xl md:text-2xl py-2.5 px-6";
    };

    const getConstructedWordClass = () => {
        if (!isTeacher) return "px-3 py-1.5 md:px-8 md:py-4 md:text-2xl text-sm border-b-[4px] md:border-b-[6px]";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') {
            return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl px-6 sm:px-8 md:px-12 py-3.5 sm:py-5 md:py-7 rounded-2xl md:rounded-3xl border-b-[6px] md:border-b-[10px]";
        }
        if (fontSizeScale === 'lg') {
            return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl px-5 sm:px-7 md:px-10 py-3 sm:py-4 md:py-6 rounded-2xl border-b-[5px] md:border-b-[8px]";
        }
        if (fontSizeScale === 'xs') {
            return "text-lg md:text-xl px-4 py-2 rounded-xl border-b-[4px]";
        }
        // normal / sm / md
        return "text-2xl sm:text-3xl md:text-4xl px-5 sm:px-7 md:px-9 py-3 sm:py-4 md:py-5 rounded-2xl border-b-[4px] md:border-b-[6px]";
    };

    const getBankWordClass = () => {
        if (!isTeacher) return "text-sm h-10 px-4 md:text-3xl md:h-20 md:px-10";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') {
            return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl min-h-[5.5rem] md:min-h-[7rem] px-8 sm:px-10 md:px-14 rounded-2xl md:rounded-3xl border-b-[6px] md:border-b-[10px]";
        }
        if (fontSizeScale === 'lg') {
            return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl min-h-[4.75rem] md:min-h-[6rem] px-7 sm:px-8 md:px-12 rounded-2xl border-b-[5px] md:border-b-[8px]";
        }
        if (fontSizeScale === 'xs') {
            return "text-lg md:text-xl min-h-[3.5rem] px-5 rounded-xl border-b-[4px]";
        }
        // normal / sm / md
        return "text-2xl sm:text-3xl md:text-4xl min-h-[4.25rem] md:min-h-[5.25rem] px-6 sm:px-8 md:px-10 rounded-2xl border-b-[4px] md:border-b-[7px]";
    };

    return (
        <div className={cn("w-full mx-auto flex flex-col justify-center min-h-[65vh] gap-4 md:gap-6 p-2 sm:p-4 pb-20 text-center", isTeacher ? "max-w-[96%] w-full pt-4 md:pt-8" : "max-w-4xl")}>
            <div className="flex flex-wrap items-center justify-center gap-3">
                <p className={cn(
                    "font-black rounded-full inline-block border-2 shadow-md",
                    isDarkTheme
                        ? "bg-slate-900/90 text-white border-white/20"
                        : "text-slate-800 bg-white/95 backdrop-blur-md border-indigo-200 shadow-indigo-100/50",
                    getInstructionClass()
                )}>
                    Kelimeleri doğru sıraya dizerek cümleyi oluşturun.
                </p>
                {!isAnswerRevealed && constructedWords.length > 0 && (
                    <button
                        type="button"
                        onClick={handleResetScramble}
                        className="px-4 py-2 rounded-full text-xs sm:text-sm font-black bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-500 shadow flex items-center gap-1.5 cursor-pointer"
                        title="Cümleyi sıfırla"
                    >
                        <RotateCcw className="w-4 h-4" /> Sıfırla
                    </button>
                )}
            </div>
             
             <div className={cn(
                 "relative flex flex-wrap justify-center content-center gap-2.5 sm:gap-4 md:gap-6 backdrop-blur-xl border-2 shadow-xl p-4 sm:p-6 md:p-10 rounded-3xl",
                 isDarkTheme
                    ? "bg-slate-900/85 border-white/15"
                    : "bg-white/95 border-indigo-200 shadow-indigo-100/50",
                 isTeacher ? "min-h-[14rem] md:min-h-[18rem]" : "min-h-[7rem] md:min-h-[12rem]"
             )}>
                {constructedWords.map((wordObj, idx) => (
                    <div 
                        key={wordObj.id} 
                        onClick={() => handleRemoveFromConstructed(idx)}
                        title={!isAnswerRevealed ? "Geri almak için tıklayın" : undefined}
                        className={cn(
                            "font-black animate-in zoom-in duration-200 border-2",
                            !isAnswerRevealed && "cursor-pointer hover:opacity-90",
                            wordColors[wordObj.id % wordColors.length], 
                            getConstructedWordClass()
                        )}
                    >
                        {wordObj.word}
                    </div>
                ))}
                {constructedWords.length === 0 && (
                    <span className={cn("font-bold italic absolute select-none", isDarkTheme ? "text-slate-400" : "text-slate-400", isTeacher ? (fontSizeScale === 'xl' || fontSizeScale === 'huge' ? "text-2xl md:text-4xl" : "text-xl md:text-2xl") : "text-sm md:text-xl")}>
                        Cümleniz burada görünecek...
                    </span>
                )}
            </div>

            {isAnswerRevealed ? (
                 <div className="text-center mt-6 md:mt-10 animate-in slide-in-from-bottom-4">
                    <div className={cn("inline-flex items-center gap-3 md:gap-4 bg-emerald-500 text-white rounded-full border-2 border-emerald-400 shadow-xl shadow-emerald-500/30", isTeacher ? "px-8 md:px-12 py-4 md:py-6" : "px-6 py-2.5 md:px-8 md:py-4")}>
                        <CheckCircle2 className={cn(isTeacher ? "h-10 w-10 md:h-12 md:w-12" : "h-5 w-5 md:h-6 w-6")}/>
                        <span className={cn("font-black", isTeacher ? (fontSizeScale === 'xl' || fontSizeScale === 'huge' ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl") : "text-sm md:text-lg")}>Harika, doğru cümle!</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap justify-center gap-2.5 sm:gap-4 md:gap-6 mt-2">
                    {bankWords.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleWordClick(item)}
                            className={cn(
                                "font-black transition-all duration-200 active:border-b-0 active:translate-y-1 md:active:translate-y-2 cursor-pointer flex items-center justify-center hover:-translate-y-0.5 md:hover:-translate-y-1 select-none",
                                wordColors[item.id % wordColors.length],
                                getBankWordClass(),
                                mistakenWordId === item.id && "!bg-rose-600 !border-rose-800 !text-white animate-shake shadow-none"
                            )}
                        >
                            {mistakenWordId === item.id && <X className={cn("mr-2", isTeacher ? "h-8 w-8 md:h-10 md:w-10" : "h-4 w-4 md:h-6 md:w-6")} />}
                            {item.word}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// 9. HtmlSlidePlayer
export function HtmlSlidePlayer({ step, onSlideScrolledToEnd, presentationTheme }: { step: HtmlSlideStep, onSlideScrolledToEnd: () => void, presentationTheme?: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const isLightSlide = presentationTheme === 'clean-light' || presentationTheme === 'sketchnote';

    const fullDocument = useMemo(() => {
        let content = step.htmlContent || '';
        
        if (content.includes('<html') || content.includes('<!DOCTYPE')) {
            if (!content.includes('tailwindcss')) {
                content = content.replace('<head>', '<head><script src="https://cdn.tailwindcss.com"></script>');
            }
            return content;
        }

        return `<!DOCTYPE html>
<html lang="tr" class="${isLightSlide ? '' : 'dark'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            500: '#6366f1',
                        }
                    },
                    keyframes: {
                        float: {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-8px)' },
                        },
                        shimmer: {
                            '0%': { backgroundPosition: '-200% 0' },
                            '100%': { backgroundPosition: '200% 0' },
                        }
                    },
                    animation: {
                        float: 'float 3.5s ease-in-out infinite',
                        shimmer: 'shimmer 2.5s linear infinite',
                    }
                }
            }
        }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            background-color: ${isLightSlide ? '#fffdf9' : '#020617'};
            color: ${isLightSlide ? '#0f172a' : '#f8fafc'};
            margin: 0;
            padding: 16px;
            overflow-x: hidden;
        }
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: ${isLightSlide ? '#f1f5f9' : '#090d16'};
        }
        ::-webkit-scrollbar-thumb {
            background: ${isLightSlide ? '#cbd5e1' : '#334155'};
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #6366f1;
        }
    </style>
</head>
<body class="${isLightSlide ? 'bg-[#fffdf9] text-slate-900' : 'bg-slate-950 text-slate-100'} min-h-screen flex items-center justify-center p-2 sm:p-6">
    ${content}
</body>
</html>`;
    }, [step.htmlContent, isLightSlide]);

    useEffect(() => {
        const iframe = iframeRef.current;
        const handleScroll = () => {
            if (iframe?.contentWindow) {
                const { scrollTop, scrollHeight, clientHeight } = iframe.contentWindow.document.documentElement;
                if (scrollHeight - scrollTop - clientHeight < 10) onSlideScrolledToEnd();
            }
        };
        const handleLoad = () => {
            const contentWindow = iframe?.contentWindow;
            if (contentWindow) {
                const checkScrollability = () => {
                    const { scrollHeight, clientHeight } = contentWindow.document.documentElement;
                    if (scrollHeight <= clientHeight + 10) onSlideScrolledToEnd();
                };
                checkScrollability();
                setTimeout(checkScrollability, 500); 
                contentWindow.addEventListener('scroll', handleScroll);
                contentWindow.addEventListener('touchmove', handleScroll);
            }
        };
        
        if (iframe) {
            iframe.addEventListener('load', handleLoad);
        }
        
        return () => {
            if (iframe?.contentWindow) {
                iframe.contentWindow.removeEventListener('scroll', handleScroll);
                iframe.contentWindow.removeEventListener('touchmove', handleScroll);
            }
            if (iframe) iframe.removeEventListener('load', handleLoad);
        };
    }, [step, onSlideScrolledToEnd]);

    return (
        <div className={cn("w-full h-full overflow-hidden transition-colors", isLightSlide ? "bg-[#fffdf9]" : "bg-slate-950")}>
            <iframe 
                ref={iframeRef} 
                srcDoc={fullDocument} 
                className="w-full h-full border-0" 
                title={step.title} 
                sandbox="allow-scripts allow-same-origin"
                style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
            />
        </div>
    );
}

// 10. DrawingCanvas (YENİ NESİL ÇİZİM & AKILLI TAHTA ARACI)
export function DrawingCanvas({ stepIndex, presentationTheme = 'sketchnote' }: { stepIndex?: number; presentationTheme?: string }) {
    const isTeacher = useTeacherMode();
    const [isOpen, setIsOpen] = useState(false);

    // Klavye kısayolu 'D'
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isTeacher) return null;

    const isLightBoard = presentationTheme === 'clean-light';
    const isSketchnote = presentationTheme === 'sketchnote';
    const isGame3D = presentationTheme === 'game-3d';

    return (
        <>
            <PresentationDrawingBoard
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                isDarkMode={!isSketchnote && !isLightBoard}
            />

            {/* Sağ Altta Şık Hızlı Çizim Butonu */}
            {!isOpen && (
                <div className="fixed bottom-20 right-4 z-40">
                    <button
                        onClick={() => setIsOpen(true)}
                        className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 group backdrop-blur-xl",
                            isSketchnote
                                ? "bg-[#fefce8] hover:bg-[#fef08a] text-[#1e293b] border-2 border-[#1e293b] shadow-[3px_3px_0_#1e293b]"
                                : isLightBoard
                                ? "bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 shadow-lg shadow-slate-900/10"
                                : isGame3D
                                ? "bg-slate-900/95 hover:bg-slate-800 text-amber-300 border-2 border-amber-400/60 border-b-4 border-b-amber-600 shadow-xl"
                                : "bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                        )}
                        title="Canlı Çizim & Tahta (D)"
                    >
                        <Pencil className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
            )}
        </>
    );
}

// --- 11. ConceptMapPlayer (Dallanmış Ağaç) ---
export function ConceptMapPlayer({ step, isFullscreen, presentationTheme = 'sketchnote' }: { step: ConceptMapStep, isFullscreen: boolean, presentationTheme?: string }) {
    const isTeacher = useTeacherMode();
    const { nodes, edges } = step.mapData || { nodes: [], edges: [] };
    const containerRef = useRef<HTMLDivElement>(null);

    const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({});
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    const isSketchnote = presentationTheme === 'sketchnote';
    const isLightTheme = presentationTheme === 'clean-light';
    const isGame3D = presentationTheme === 'game-3d';
    const isLightCanvas = isSketchnote || isLightTheme;
    
    // Ağacı oluştururken merkeze alacağımız düğümü bul
    const rootNode = nodes.find(n => n.isCentral) || nodes[0];

    useEffect(() => {
        if (!rootNode) return;
        setFocusedNodeId(null);
        
        const newPos: Record<string, { x: number, y: number }> = {};
        const W = 800; 
        const H = 600; 
        
        newPos[rootNode.id] = { x: W / 2, y: H / 2 };

        const l1Edges = edges.filter(e => e.from === rootNode.id || e.to === rootNode.id);
        const l1Ids = l1Edges.map(e => e.from === rootNode.id ? e.to : e.from);
        
        const R1 = 175; 
        l1Ids.forEach((id, i) => {
            const angle = i * ((2 * Math.PI) / l1Ids.length);
            newPos[id] = { 
                x: (W / 2) + Math.cos(angle) * R1, 
                y: (H / 2) + Math.sin(angle) * R1 
            };
            
            const l2Edges = edges.filter(e => (e.from === id || e.to === id) && !newPos[e.from] && !newPos[e.to]);
            const l2Ids = l2Edges.map(e => e.from === id ? e.to : e.from);
            
            const R2 = 135; 
            l2Ids.forEach((l2Id, j) => {
                const spread = Math.PI / 1.5; 
                const startAngle = angle - (spread / 2);
                const stepAngle = l2Ids.length > 1 ? spread / (l2Ids.length - 1) : 0;
                const finalAngle = startAngle + (j * stepAngle);
                
                newPos[l2Id] = {
                    x: Math.max(75, Math.min(W - 75, newPos[id].x + Math.cos(finalAngle) * R2)),
                    y: Math.max(55, Math.min(H - 55, newPos[id].y + Math.sin(finalAngle) * R2))
                };
            });
        });
        
        nodes.forEach((n, idx) => {
            if (!newPos[n.id]) {
                const angle = (idx / Math.max(1, nodes.length)) * 2 * Math.PI;
                newPos[n.id] = { 
                    x: (W / 2) + Math.cos(angle) * 260, 
                    y: (H / 2) + Math.sin(angle) * 220 
                };
            }
        });
        
        setPositions(newPos);
    }, [step]);

    if (!rootNode || Object.keys(positions).length === 0) return null;

    const connectedToFocused = new Set<string>();
    if (focusedNodeId) {
        connectedToFocused.add(focusedNodeId);
        edges.forEach(e => {
            if (e.from === focusedNodeId) connectedToFocused.add(e.to);
            if (e.to === focusedNodeId) connectedToFocused.add(e.from);
        });
    }

    return (
        <div className={cn("w-full h-full flex flex-col items-center justify-start p-2", isTeacher ? "max-w-full" : "max-w-6xl mx-auto")}>
            <div className={cn(
                "relative z-20 px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl flex-shrink-0 w-full flex flex-wrap items-center justify-between gap-2 mb-3 transition-colors",
                isSketchnote
                    ? "bg-[#fefce8] border-[2.5px] border-[#1e293b] shadow-[4px_4px_0_#1e293b]"
                    : isLightTheme
                    ? "bg-white border border-slate-200/90 shadow-md"
                    : isGame3D
                    ? "bg-slate-900/90 border-2 border-indigo-400/50 border-b-4 border-b-indigo-700 shadow-lg"
                    : "bg-slate-900/80 border border-white/15 backdrop-blur-xl shadow-lg"
            )}>
                <h2 className={cn(
                    "font-black tracking-tight",
                    isSketchnote
                        ? "font-['Caveat',cursive] text-slate-900 text-2xl sm:text-3xl"
                        : isLightTheme
                        ? "text-slate-900 text-lg sm:text-2xl"
                        : "text-white text-lg sm:text-2xl"
                )}>
                    {step.title}
                </h2>
                <span className={cn(
                    "text-[11px] font-bold px-2.5 py-1 rounded-full border",
                    isSketchnote
                        ? "bg-white border-[#1e293b]/30 text-slate-700 font-['Patrick_Hand',cursive] text-xs"
                        : isLightCanvas
                        ? "bg-slate-100 border-slate-200 text-slate-600"
                        : "bg-white/10 border-white/15 text-slate-300"
                )}>
                    {focusedNodeId ? "Vurgulanan dal (temizlemek için boşluğa tıkla)" : "Düğüme tıkla vurgula • Sürükle düzenle"}
                </span>
            </div>

            <div className="w-full flex-1 flex items-center justify-center pb-2 px-1 sm:px-3 min-h-0">
                <div
                    ref={containerRef}
                    onClick={() => setFocusedNodeId(null)}
                    className={cn(
                        "relative w-full max-w-5xl aspect-[4/3] max-h-[68vh] min-h-[360px] rounded-3xl overflow-hidden transition-colors",
                        isSketchnote
                            ? "bg-[#fffdf9] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] border-[3px] border-[#1e293b] shadow-[6px_6px_0_#1e293b]"
                            : isLightTheme
                            ? "bg-white border border-slate-200 shadow-xl"
                            : isGame3D
                            ? "bg-slate-900/85 border-2 border-indigo-400/50 border-b-[6px] border-b-indigo-800 shadow-2xl"
                            : "bg-slate-900/75 backdrop-blur-xl border border-white/15 shadow-2xl"
                    )}
                >
                    {/* SVG Çizgiler */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 800 600" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="edgeGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#4f46e5" />
                                <stop offset="100%" stopColor="#9333ea" />
                            </linearGradient>
                            <linearGradient id="edgeGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#38bdf8" />
                                <stop offset="100%" stopColor="#a78bfa" />
                            </linearGradient>
                        </defs>
                        {edges.map((edge, idx) => {
                            const fromPos = positions[edge.from];
                            const toPos = positions[edge.to];
                            if (!fromPos || !toPos) return null;
                            
                            const dx = toPos.x - fromPos.x;
                            const dy = toPos.y - fromPos.y;
                            const cx = fromPos.x + dx/2 - dy/5; 
                            const cy = fromPos.y + dy/2 + dx/5;
                            const isEdgeFocused = !focusedNodeId || edge.from === focusedNodeId || edge.to === focusedNodeId;

                            return (
                                <g key={idx} className="transition-opacity duration-200" style={{ opacity: isEdgeFocused ? 1 : 0.18 }}>
                                    <path 
                                        d={`M ${fromPos.x} ${fromPos.y} Q ${cx} ${cy} ${toPos.x} ${toPos.y}`}
                                        fill="none"
                                        stroke={isSketchnote ? "#1e293b" : isLightTheme ? "url(#edgeGradientLight)" : "url(#edgeGradientDark)"}
                                        strokeWidth={isEdgeFocused && focusedNodeId ? "4" : "3"}
                                        strokeDasharray={isSketchnote ? "6,5" : "7,5"}
                                        strokeLinecap="round"
                                        className="opacity-75"
                                    />
                                    {edge.label && (
                                        <g transform={`translate(${fromPos.x + dx/2}, ${fromPos.y + dy/2 - 12})`}>
                                            <rect
                                                x="-46"
                                                y="-10"
                                                width="92"
                                                height="20"
                                                rx="10"
                                                fill={isSketchnote ? "#fefce8" : isLightTheme ? "#ffffff" : "#0f172a"}
                                                stroke={isSketchnote ? "#1e293b" : isLightTheme ? "#cbd5e1" : "rgba(255,255,255,0.25)"}
                                                strokeWidth="1.2"
                                            />
                                            <text
                                                x="0"
                                                y="3.5"
                                                textAnchor="middle"
                                                fill={isSketchnote ? "#0f172a" : isLightTheme ? "#4338ca" : "#e2e8f0"}
                                                className="text-[10px] font-black uppercase tracking-wider"
                                            >
                                                {edge.label}
                                            </text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {/* Sürüklenebilir & Odaklanabilir Düğümler */}
                    {nodes.map((node) => {
                        const pos = positions[node.id];
                        if (!pos) return null;
                        const isCenter = node.id === rootNode.id;
                        const isDimmed = !!focusedNodeId && !connectedToFocused.has(node.id);
                        const isSelected = focusedNodeId === node.id;
                        
                        return (
                            <motion.div
                                key={node.id}
                                drag
                                dragConstraints={containerRef}
                                dragElastic={0.05}
                                dragMomentum={false}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFocusedNodeId(prev => prev === node.id ? null : node.id);
                                }}
                                onDrag={(_, info) => {
                                    const rectWidth = containerRef.current?.clientWidth || 800;
                                    const rectHeight = containerRef.current?.clientHeight || 600;
                                    const dx = (info.delta.x / rectWidth) * 800;
                                    const dy = (info.delta.y / rectHeight) * 600;
                                    setPositions(prev => ({ 
                                        ...prev, 
                                        [node.id]: {
                                            x: Math.max(60, Math.min(740, prev[node.id].x + dx)),
                                            y: Math.max(45, Math.min(555, prev[node.id].y + dy))
                                        }
                                    }));
                                }}
                                whileDrag={{ scale: 1.07, zIndex: 50, cursor: 'grabbing' }}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: isDimmed ? 0.3 : 1, scale: isSelected ? 1.05 : 1 }}
                                transition={{ opacity: { duration: 0.2 }, scale: { duration: 0.25 } }}
                                style={{
                                    position: 'absolute',
                                    left: `${(pos.x / 800) * 100}%`,
                                    top: `${(pos.y / 600) * 100}%`,
                                    x: '-50%',
                                    y: '-50%',
                                }}
                                className={cn(
                                    "pointer-events-auto cursor-grab flex items-center justify-center text-center px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl transition-colors select-none max-w-[210px]",
                                    isCenter
                                        ? isSketchnote
                                            ? "bg-[#fef08a] border-[2.5px] border-[#1e293b] text-slate-900 shadow-[4px_4px_0_#1e293b] min-w-[140px] z-20"
                                            : isLightTheme
                                            ? "bg-gradient-to-br from-indigo-600 to-violet-600 border-2 border-indigo-300 text-white shadow-xl shadow-indigo-500/25 min-w-[140px] z-20"
                                            : "bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 border-2 border-indigo-300/60 border-b-4 border-b-indigo-900 text-white shadow-xl min-w-[140px] z-20"
                                        : isSketchnote
                                        ? "bg-white border-2 border-[#1e293b] text-slate-900 shadow-[3px_3px_0_#1e293b] hover:bg-sky-50 min-w-[110px] z-10"
                                        : isLightTheme
                                        ? "bg-slate-50 border border-slate-300 text-slate-800 shadow-md hover:border-indigo-400 hover:bg-white min-w-[110px] z-10"
                                        : "bg-slate-800/95 border-2 border-sky-400/50 border-b-4 border-b-sky-700 text-white shadow-lg hover:border-cyan-300 min-w-[110px] z-10",
                                    isSelected && "ring-2 ring-amber-400 ring-offset-2"
                                )}
                            >
                                <span
                                    className={cn(
                                        "tracking-wide break-words leading-snug",
                                        isSketchnote
                                            ? (isCenter ? "font-['Caveat',cursive] font-black text-xl sm:text-2xl text-slate-900" : "font-['Patrick_Hand',cursive] font-bold text-base sm:text-lg text-slate-800")
                                            : (isCenter ? "font-black text-sm sm:text-lg" : "font-bold text-xs sm:text-sm")
                                    )}
                                >
                                    {node.label}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════

// ══ 11. MatchingPlayer (WORDWALL MİMARİLİ AKILLI TAHTA TAM EKRAN EŞLEŞTİRME MOTORU) ══
export function MatchingPlayer({ 
    step, 
    onCompleted, 
    topicId, 
    isTeacher, 
    isFullscreen,
    fontSizeScale = 'normal',
    presentationTheme,
    presentationFont
}: { 
    step: any; 
    onCompleted?: () => void; 
    topicId?: string; 
    isTeacher: boolean; 
    isFullscreen: boolean; 
    fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge';
    presentationTheme?: 'game-3d' | 'sketchnote' | 'cosmic-dark' | 'vibrant-studio' | 'clean-light' | string;
    presentationFont?: 'sketchnote' | 'outfit' | 'poppins' | 'jakarta' | 'playfair';
}) {
    const isSketchnote = presentationTheme === 'sketchnote';
    
    // Tüm kavram çiftleri
    const [allPairs, setAllPairs] = useState<{ id: string; concept: string; definition: string }[]>([]);
    const [roundIndex, setRoundIndex] = useState(0);
    const [pageSize, setPageSize] = useState<number>(4); // Wordwall standardı 4'lü tur
    const [isLoading, setIsLoading] = useState(false);

    // Aktif turdaki eşleşmeler
    const [shuffledDefs, setShuffledDefs] = useState<{ id: string; text: string }[]>([]);
    const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
    const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
    const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
    const [wrongPair, setWrongPair] = useState<{ conceptId: string; defId: string } | null>(null);
    const [isRoundFinished, setIsRoundFinished] = useState(false);
    const [isAllFinished, setIsAllFinished] = useState(false);

    // Canlı Eşleşme Renkleri
    const MATCH_COLORS = [
        { 
            card: 'bg-emerald-500 border-[3.5px] border-emerald-700 text-white shadow-[0_5px_0_#047857]', 
            badge: 'bg-emerald-700 text-white border-white/50',
            pill: 'text-emerald-100 border-emerald-300/60 bg-emerald-800/80',
            accent: 'text-emerald-100'
        },
        { 
            card: 'bg-sky-500 border-[3.5px] border-sky-700 text-white shadow-[0_5px_0_#0369a1]', 
            badge: 'bg-sky-700 text-white border-white/50',
            pill: 'text-sky-100 border-sky-300/60 bg-sky-800/80',
            accent: 'text-sky-100'
        },
        { 
            card: 'bg-purple-500 border-[3.5px] border-purple-700 text-white shadow-[0_5px_0_#7e22ce]', 
            badge: 'bg-purple-700 text-white border-white/50',
            pill: 'text-purple-100 border-purple-300/60 bg-purple-800/80',
            accent: 'text-purple-100'
        },
        { 
            card: 'bg-amber-500 border-[3.5px] border-amber-700 text-slate-950 shadow-[0_5px_0_#b45309]', 
            badge: 'bg-amber-700 text-white border-white/50',
            pill: 'text-amber-950 border-amber-800/60 bg-amber-200/90 font-black',
            accent: 'text-amber-950'
        },
        { 
            card: 'bg-rose-500 border-[3.5px] border-rose-700 text-white shadow-[0_5px_0_#be123c]', 
            badge: 'bg-rose-700 text-white border-white/50',
            pill: 'text-rose-100 border-rose-300/60 bg-rose-800/80',
            accent: 'text-rose-100'
        },
        { 
            card: 'bg-indigo-500 border-[3.5px] border-indigo-700 text-white shadow-[0_5px_0_#4338ca]', 
            badge: 'bg-indigo-700 text-white border-white/50',
            pill: 'text-indigo-100 border-indigo-300/60 bg-indigo-800/80',
            accent: 'text-indigo-100'
        },
    ];

    const [pairColorMap, setPairColorMap] = useState<Map<string, number>>(new Map());

    // 1. Veri Yükleme
    useEffect(() => {
        const initData = async () => {
            let rawPairs: { concept: string; definition: string }[] = [];
            if (Array.isArray(step.pairs) && step.pairs.length > 0) {
                rawPairs = step.pairs.filter((p: any) => p.concept && p.definition);
            }

            if (rawPairs.length === 0 && topicId) {
                setIsLoading(true);
                try {
                    const studio = await getRegisteredStudioItemsForGame({ topicId });
                    if (studio.conceptDefinitions && studio.conceptDefinitions.length > 0) {
                        studio.conceptDefinitions.forEach((item) => {
                            if (item.term && item.definition) {
                                rawPairs.push({
                                    concept: item.term.trim(),
                                    definition: item.definition.trim(),
                                });
                            }
                        });
                    }

                    if (rawPairs.length === 0) {
                        const [yazRes, actRes] = await Promise.all([
                            fetch(`/curriculum/yazilacaklar/${topicId}.json?v=${Date.now()}`).catch(() => null),
                            fetch(`/curriculum/activities/${topicId}.json?v=${Date.now()}`).catch(() => null),
                        ]);
                        const seen = new Set<string>();
                        if (yazRes && yazRes.ok) {
                            const yData = await yazRes.json();
                            if (Array.isArray(yData?.conceptDefinitions)) {
                                yData.conceptDefinitions.forEach((item: any) => {
                                    const c = String(item?.concept || '').trim();
                                    const d = String(item?.definition || '').trim();
                                    if (c && d && !seen.has(c.toLocaleLowerCase('tr-TR'))) {
                                        seen.add(c.toLocaleLowerCase('tr-TR'));
                                        rawPairs.push({ concept: c, definition: d });
                                    }
                                });
                            }
                        }
                        if (actRes && actRes.ok) {
                            const aData = await actRes.json();
                            if (Array.isArray(aData)) {
                                aData.forEach((item: any) => {
                                    const c = String(item?.content?.term || item?.concept || item?.term || '').trim();
                                    const d = String(item?.content?.definition || item?.definition || '').trim();
                                    if (item?.type === 'definition' && c && d && !seen.has(c.toLocaleLowerCase('tr-TR'))) {
                                        seen.add(c.toLocaleLowerCase('tr-TR'));
                                        rawPairs.push({ concept: c, definition: d });
                                    }
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Could not fetch topic matching items:", e);
                } finally {
                    setIsLoading(false);
                }
            }

            const formatted = rawPairs.map((p, idx) => ({
                id: `pair-${idx}-${p.concept.toLowerCase().replace(/\s+/g, '-')}`,
                concept: p.concept,
                definition: p.definition
            }));

            setAllPairs(formatted);
            setRoundIndex(0);
        };

        initData();
    }, [step, topicId]);

    // Toplam Tur Hesabı
    const totalRounds = Math.max(1, Math.ceil(allPairs.length / pageSize));
    
    // Aktif Turdaki Çiftler (En fazla pageSize kadar, örn: 4)
    const currentRoundPairs = useMemo(() => {
        const start = roundIndex * pageSize;
        return allPairs.slice(start, start + pageSize);
    }, [allPairs, roundIndex, pageSize]);

    // Tur değiştiğinde tanımları karıştır ve state'i sıfırla
    useEffect(() => {
        if (currentRoundPairs.length === 0) return;
        const defs = currentRoundPairs.map(p => ({ id: p.id, text: p.definition }));
        setShuffledDefs([...defs].sort(() => Math.random() - 0.5));
        setMatchedIds(new Set());
        setSelectedConceptId(null);
        setSelectedDefId(null);
        setWrongPair(null);
        setIsRoundFinished(false);
        setPairColorMap(new Map());
    }, [currentRoundPairs]);

    // Tıklama Yöneticileri
    const handleConceptClick = (id: string) => {
        if (matchedIds.has(id)) return;
        playSound('pop');
        setSelectedConceptId(id);
        if (selectedDefId) {
            checkMatch(id, selectedDefId);
        }
    };

    const handleDefClick = (id: string) => {
        if (matchedIds.has(id)) return;
        playSound('pop');
        setSelectedDefId(id);
        if (selectedConceptId) {
            checkMatch(selectedConceptId, id);
        }
    };

    const checkMatch = (cId: string, dId: string) => {
        if (cId === dId) {
            playSound('correct');
            const nextMatched = new Set(matchedIds);
            nextMatched.add(cId);
            setMatchedIds(nextMatched);

            setPairColorMap(prev => {
                const nextMap = new Map(prev);
                const colorIdx = (nextMatched.size - 1) % MATCH_COLORS.length;
                nextMap.set(cId, colorIdx);
                return nextMap;
            });

            setSelectedConceptId(null);
            setSelectedDefId(null);
            setWrongPair(null);

            // Tur bitti mi?
            if (nextMatched.size === currentRoundPairs.length) {
                setIsRoundFinished(true);
                playSound('win');

                import('canvas-confetti').then(m => {
                    m.default({
                        particleCount: 150,
                        spread: 90,
                        origin: { y: 0.5 }
                    });
                }).catch(() => {});

                // Son tur mu?
                if (roundIndex >= totalRounds - 1) {
                    setIsAllFinished(true);
                    if (onCompleted) onCompleted();
                }
            }
        } else {
            playSound('incorrect');
            setWrongPair({ conceptId: cId, defId: dId });
            setTimeout(() => {
                setSelectedConceptId(null);
                setSelectedDefId(null);
                setWrongPair(null);
            }, 600);
        }
    };

    const handleNextRound = () => {
        if (roundIndex < totalRounds - 1) {
            setRoundIndex(prev => prev + 1);
        }
    };

    const handlePrevRound = () => {
        if (roundIndex > 0) {
            setRoundIndex(prev => prev - 1);
        }
    };

    const handleSolveAll = () => {
        const allIds = new Set(currentRoundPairs.map(p => p.id));
        setMatchedIds(allIds);
        const map = new Map<string, number>();
        currentRoundPairs.forEach((p, i) => map.set(p.id, i % MATCH_COLORS.length));
        setPairColorMap(map);
        setIsRoundFinished(true);
        playSound('win');
        if (roundIndex >= totalRounds - 1) {
            setIsAllFinished(true);
            if (onCompleted) onCompleted();
        }
    };

    const handleReset = () => {
        setMatchedIds(new Set());
        setSelectedConceptId(null);
        setSelectedDefId(null);
        setWrongPair(null);
        setIsRoundFinished(false);
        setPairColorMap(new Map());
        const defs = currentRoundPairs.map(p => ({ id: p.id, text: p.definition }));
        setShuffledDefs([...defs].sort(() => Math.random() - 0.5));
    };

    return (
        <div className="w-full h-full flex flex-col justify-between overflow-hidden p-2 sm:p-3 md:p-4 select-none">
            {/* ══ 1. ÜST BİLGİ & KONTROL ÇUBUĞU (KOMPAKT SABİT BAR) ══ */}
            <div className={cn(
                "w-full h-12 md:h-14 flex-shrink-0 flex items-center justify-between gap-3 px-3 sm:px-4 rounded-2xl border mb-2 md:mb-3 shadow-md",
                isSketchnote 
                    ? "bg-[#fefce8] border-[2.5px] border-[#1e293b] shadow-[3px_3px_0_#1e293b]" 
                    : presentationTheme === 'clean-light'
                        ? "bg-white/95 border-indigo-200 text-slate-900"
                        : "bg-slate-900/90 border-white/10 text-white"
            )}>
                {/* Sol: Tur & Skor Rozeti */}
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-sm",
                        isSketchnote ? "bg-[#fde047] text-slate-900 border-2 border-[#1e293b]" : "bg-indigo-600 text-white"
                    )}>
                        <span>🎯</span>
                        <span>Tur: {roundIndex + 1} / {totalRounds}</span>
                    </span>

                    <span className={cn(
                        "px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5",
                        isSketchnote ? "bg-white text-slate-800 border-2 border-[#1e293b]" : "bg-slate-800 text-slate-200 border border-white/10"
                    )}>
                        <span>⭐</span>
                        <strong className="text-emerald-600 font-black">{matchedIds.size}</strong>
                        <span>/ {currentRoundPairs.length} Eşleşti</span>
                    </span>
                </div>

                {/* Orta: Başlık */}
                <div className="hidden md:flex items-center gap-2">
                    <span className="text-lg">🕌</span>
                    <h2 className={cn(
                        "text-base md:text-lg font-bold tracking-tight",
                        isSketchnote ? "font-['Caveat',cursive] text-2xl text-slate-900 font-extrabold" : "text-white"
                    )}>
                        {step.title || 'Kavram - Tanım Eşleştirme'}
                    </h2>
                </div>

                {/* Sağ: Öğretmen Kontrolleri */}
                <div className="flex items-center gap-2">
                    {totalRounds > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handlePrevRound}
                                disabled={roundIndex === 0}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-30 cursor-pointer",
                                    isSketchnote ? "bg-white border-2 border-[#1e293b] hover:bg-slate-100" : "bg-slate-800 hover:bg-slate-700 text-white"
                                )}
                                title="Önceki Tur"
                            >
                                ◀ Önceki
                            </button>
                            <button
                                type="button"
                                onClick={handleNextRound}
                                disabled={roundIndex >= totalRounds - 1}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-30 cursor-pointer",
                                    isSketchnote ? "bg-white border-2 border-[#1e293b] hover:bg-slate-100" : "bg-slate-800 hover:bg-slate-700 text-white"
                                )}
                                title="Sonraki Tur"
                            >
                                Sonraki ▶
                            </button>
                        </div>
                    )}

                    {isTeacher && (
                        <>
                            <button
                                type="button"
                                onClick={handleSolveAll}
                                className={cn(
                                    "px-3 py-1 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer",
                                    isSketchnote 
                                        ? "bg-[#22c55e] hover:bg-[#16a34a] text-white border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b]" 
                                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                )}
                                title="Mevcut Turu Çöz"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Çöz</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className={cn(
                                    "px-3 py-1 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer",
                                    isSketchnote 
                                        ? "bg-white hover:bg-slate-100 text-slate-800 border-2 border-[#1e293b] shadow-[2px_2px_0_#1e293b]" 
                                        : "bg-slate-800 hover:bg-slate-700 text-white border border-white/20"
                                )}
                                title="Turu Sıfırla"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Sıfırla</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ══ 2. WORDWALL TAM EKRAN SAHNESİ (ZERO SCROLL / %100 YÜKSEKLİK VE FERAH KAROLAR) ══ */}
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-3" />
                    <p className="font-bold text-sm">Kavramlar yükleniyor...</p>
                </div>
            ) : currentRoundPairs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 text-slate-400">
                    <p className="font-bold text-base mb-1">Kayıtlı Kavram Bulunamadı</p>
                    <p className="text-xs opacity-80">Bu konu için Kavram ve Notlar Stüdyosu&apos;na kavram ve tanım eklendiğinde burada görünecektir.</p>
                </div>
            ) : (
                <div className="flex-1 w-full min-h-0 grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 relative">
                    {/* SOL SÜTUN: KAVRAMLAR */}
                    <div className="flex flex-col h-full gap-2 sm:gap-3 min-h-0">
                        {currentRoundPairs.map((pair, index) => {
                            const isMatched = matchedIds.has(pair.id);
                            const isSelected = selectedConceptId === pair.id;
                            const isWrong = wrongPair?.conceptId === pair.id;
                            const colorIdx = pairColorMap.get(pair.id) ?? index;
                            const matchedTheme = MATCH_COLORS[colorIdx % MATCH_COLORS.length];

                            return (
                                <button
                                    key={pair.id}
                                    type="button"
                                    onClick={() => handleConceptClick(pair.id)}
                                    disabled={isMatched}
                                    className={cn(
                                        "flex-1 min-h-0 w-full rounded-2xl md:rounded-3xl border-[3px] md:border-[3.5px] p-3 sm:p-4 md:p-5 flex items-center justify-between gap-3 text-left transition-all duration-150 cursor-pointer overflow-hidden",
                                        isMatched
                                            ? `${matchedTheme.card} cursor-default opacity-95`
                                            : isWrong
                                                ? "animate-shake bg-rose-200 border-rose-600 text-rose-950 shadow-[0_5px_0_#991b1b]"
                                                : isSelected
                                                    ? (isSketchnote 
                                                        ? "bg-[#fde047] border-[#1e293b] ring-4 ring-amber-400 shadow-[0_7px_0_#ca8a04] scale-[1.015]" 
                                                        : "bg-indigo-900 border-cyan-400 text-cyan-200 ring-4 ring-cyan-400/50 scale-[1.015]")
                                                    : (isSketchnote 
                                                        ? "bg-[#fefce8] hover:bg-[#fef08a]/90 text-slate-900 border-[#1e293b] shadow-[0_5px_0_#1e293b] active:translate-y-1 active:shadow-[0_1px_0_#1e293b]" 
                                                        : "bg-slate-900/90 hover:bg-slate-800 text-white border-indigo-500/30 shadow-[0_5px_0_#1e1b4b] active:translate-y-1 active:shadow-none")
                                    )}
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 md:gap-5 flex-1 min-w-0">
                                        {/* Numara Rozeti */}
                                        <span className={cn(
                                            "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl md:text-2xl shrink-0 border-2 transition-all shadow-sm",
                                            isMatched
                                                ? `${matchedTheme.badge} border-white/60 text-white`
                                                : isSelected
                                                    ? (isSketchnote ? "bg-[#ca8a04] text-white border-[#1e293b]" : "bg-cyan-500 text-slate-950 border-white")
                                                    : (isSketchnote ? "bg-[#fde047] text-slate-900 border-[#1e293b]" : "bg-indigo-950 text-indigo-300 border-indigo-400/40")
                                        )}>
                                            {isMatched ? "✓" : index + 1}
                                        </span>

                                        {/* Kavram Metni (Dev & Okunabilir) */}
                                        <span 
                                            className={cn(
                                                "leading-tight font-black tracking-tight select-none break-words line-clamp-2",
                                                isSketchnote ? "font-['Caveat',cursive] font-extrabold text-slate-900" : "text-white"
                                            )}
                                            style={{ fontSize: 'clamp(1.4rem, 3.2vh, 2.75rem)' }}
                                        >
                                            {pair.concept}
                                        </span>
                                    </div>

                                    {isMatched && (
                                        <span className={cn(
                                            "text-xs md:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm shrink-0",
                                            matchedTheme.pill
                                        )}>
                                            ✓ Eşleşti
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* SAĞ SÜTUN: TANIMLAR */}
                    <div className="flex flex-col h-full gap-2 sm:gap-3 min-h-0">
                        {shuffledDefs.map((def, index) => {
                            const isMatched = matchedIds.has(def.id);
                            const isSelected = selectedDefId === def.id;
                            const isWrong = wrongPair?.defId === def.id;
                            const colorIdx = pairColorMap.get(def.id) ?? index;
                            const matchedTheme = MATCH_COLORS[colorIdx % MATCH_COLORS.length];

                            return (
                                <button
                                    key={`def-${def.id}`}
                                    type="button"
                                    onClick={() => handleDefClick(def.id)}
                                    disabled={isMatched}
                                    className={cn(
                                        "flex-1 min-h-0 w-full rounded-2xl md:rounded-3xl border-[3px] md:border-[3.5px] p-3 sm:p-4 md:p-5 flex items-center justify-between gap-3 text-left transition-all duration-150 cursor-pointer overflow-hidden",
                                        isMatched
                                            ? `${matchedTheme.card} cursor-default opacity-95`
                                            : isWrong
                                                ? "animate-shake bg-rose-200 border-rose-600 text-rose-950 shadow-[0_5px_0_#991b1b]"
                                                : isSelected
                                                    ? (isSketchnote 
                                                        ? "bg-[#38bdf8] border-[#1e293b] text-white ring-4 ring-sky-400 shadow-[0_7px_0_#0284c7] scale-[1.015]" 
                                                        : "bg-purple-900 border-pink-400 text-pink-200 ring-4 ring-pink-400/50 scale-[1.015]")
                                                    : (isSketchnote 
                                                        ? "bg-[#f0f9ff] hover:bg-[#e0f2fe] text-slate-900 border-[#1e293b] shadow-[0_5px_0_#1e293b] active:translate-y-1 active:shadow-[0_1px_0_#1e293b]" 
                                                        : "bg-slate-900/90 hover:bg-slate-800 text-white border-purple-500/30 shadow-[0_5px_0_#1e1b4b] active:translate-y-1 active:shadow-none")
                                    )}
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 md:gap-5 flex-1 min-w-0">
                                        {/* Harf Rozeti */}
                                        <span className={cn(
                                            "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl md:text-2xl shrink-0 border-2 transition-all shadow-sm",
                                            isMatched
                                                ? `${matchedTheme.badge} border-white/60 text-white`
                                                : isSelected
                                                    ? (isSketchnote ? "bg-[#0284c7] text-white border-[#1e293b]" : "bg-pink-500 text-white border-white")
                                                    : (isSketchnote ? "bg-[#bae6fd] text-sky-950 border-[#1e293b]" : "bg-purple-950 text-purple-300 border-purple-400/40")
                                        )}>
                                            {isMatched ? "✓" : String.fromCharCode(65 + index)}
                                        </span>

                                        {/* Tanım Metni (Ferah, Akıllı Tahta İçin Okunabilir) */}
                                        <p 
                                            className={cn(
                                                "leading-snug select-none break-words line-clamp-3 md:line-clamp-4",
                                                isSketchnote ? "font-['Patrick_Hand',cursive] font-bold text-slate-800" : "font-semibold text-slate-100"
                                            )}
                                            style={{ fontSize: 'clamp(1.05rem, 2.3vh, 1.85rem)' }}
                                        >
                                            {def.text}
                                        </p>
                                    </div>

                                    {isMatched && (
                                        <span className={cn(
                                            "text-xs md:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm shrink-0",
                                            matchedTheme.pill
                                        )}>
                                            ✓ Eşleşti
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ══ TUR TAMAMLANDI POPUP / OVERLAY ══ */}
                    {isRoundFinished && (
                        <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                            <div className={cn(
                                "p-6 sm:p-8 rounded-3xl border-[3.5px] max-w-lg w-full flex flex-col items-center text-center shadow-2xl",
                                isSketchnote 
                                    ? "bg-[#fefce8] border-[#1e293b] text-slate-900 shadow-[6px_6px_0_#1e293b]" 
                                    : "bg-slate-900 border-emerald-400 text-white"
                            )}>
                                <div className="text-5xl sm:text-6xl mb-3">
                                    {isAllFinished ? "🏆" : "🎉"}
                                </div>
                                <h3 className={cn(
                                    "text-2xl sm:text-3xl font-black mb-2",
                                    isSketchnote && "font-['Caveat',cursive] text-4xl"
                                )}>
                                    {isAllFinished ? "Tüm Eşleştirmeler Tamamlandı!" : `${roundIndex + 1}. Tur Harika Tamamlandı!`}
                                </h3>
                                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-6 font-medium">
                                    {isAllFinished 
                                        ? "Tüm kavramları doğru eşleştirdiniz. Tebrikler!" 
                                        : `Sırada ${roundIndex + 2}. Tur (${pageSize} Yeni Kavram) var.`}
                                </p>

                                <div className="flex items-center gap-3">
                                    {!isAllFinished && (
                                        <button
                                            type="button"
                                            onClick={handleNextRound}
                                            className={cn(
                                                "px-6 py-3 rounded-2xl font-black text-base sm:text-lg transition-all active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer",
                                                isSketchnote 
                                                    ? "bg-[#22c55e] hover:bg-[#16a34a] text-white border-[2.5px] border-[#1e293b] shadow-[3px_3px_0_#1e293b]" 
                                                : "bg-emerald-500 hover:bg-emerald-400 text-white"
                                            )}
                                        >
                                            <span>Sonraki Tura Geç ({roundIndex + 2}/{totalRounds})</span>
                                            <span>➔</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className={cn(
                                            "px-5 py-3 rounded-2xl font-bold text-sm sm:text-base transition-all active:scale-95 cursor-pointer",
                                            isSketchnote 
                                                ? "bg-white hover:bg-slate-100 text-slate-800 border-[2.5px] border-[#1e293b] shadow-[2px_2px_0_#1e293b]" 
                                                : "bg-slate-800 hover:bg-slate-700 text-white border border-white/20"
                                        )}
                                    >
                                        <span>Tekrar Oyna</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
