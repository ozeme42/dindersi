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
export function InteractiveTrueFalseList({ step, isFullscreen, answers, onAnswer, onAllAnswered, fontSizeScale = 'normal', isTeacher: propIsTeacher }: { step: TrueFalseListStep, isFullscreen: boolean, answers: any, onAnswer: (index: number, val: boolean) => void, onAllAnswered: () => void, fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge', isTeacher?: boolean }) {
    const authIsTeacher = useTeacherMode();
    const isTeacher = typeof propIsTeacher === 'boolean' ? propIsTeacher : authIsTeacher;
    const allAnswered = step.questions.every((_: any, index: number) => answers && answers[index] !== undefined);
    
    const isCompleted = answers?.completed;

    useEffect(() => {
        if (allAnswered && !isCompleted) {
            onAllAnswered();
        }
    }, [allAnswered, isCompleted, onAllAnswered]);

    const colorThemes = [
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
                "relative rounded-2xl border backdrop-blur-xl flex-shrink-0 w-full text-center overflow-hidden shadow-md",
                isTeacher ? "border-2 border-indigo-200 bg-white/95 py-3 px-6 mb-4 mt-0 shadow-indigo-100/50" : "border-white/10 bg-slate-900/80 py-2.5 px-4 mb-3"
            )}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                <h2 className={cn("font-black text-transparent bg-clip-text",
                    isTeacher ? "bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-2xl md:text-4xl" : "bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 text-base sm:text-xl"
                )}>{step.title}</h2>
            </div>

            <div className={cn("w-full grid gap-3 pb-8", isTeacher ? "grid-cols-2 md:grid-cols-2 gap-3.5 sm:gap-5 md:gap-6 pb-16" : "grid-cols-1")}>
                {step.questions.map((q: any, index: number) => {
                    const userAnswer = answers && answers[index];
                    const isAnswered = userAnswer !== undefined;
                    const isCorrect = isAnswered && userAnswer.isCorrect;
                    
                    const theme = colorThemes[index % colorThemes.length];

                    return (
                        <div key={index} className={cn(
                            "rounded-2xl md:rounded-3xl border-2 shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-md",
                            isTeacher 
                                ? (fontSizeScale === 'xl' || fontSizeScale === 'huge' ? "p-6 md:p-8 min-h-[16rem]" : fontSizeScale === 'lg' ? "p-5 md:p-7 min-h-[14rem]" : "p-5 md:p-6 min-h-[12rem]")
                                : "p-3.5 sm:p-4 min-h-0",
                            isAnswered
                                ? (isCorrect 
                                    ? (isTeacher ? "border-2 border-emerald-500 bg-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.25)]" : "border-emerald-500/60 bg-emerald-950/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]") 
                                    : (isTeacher ? "border-2 border-rose-500 bg-rose-50 shadow-[0_0_20px_rgba(244,63,94,0.25)]" : "border-rose-500/60 bg-rose-950/40 shadow-[0_0_20px_rgba(244,63,94,0.2)]"))
                                : (isTeacher ? `${theme.card} border` : `${theme.card} border backdrop-blur-xl shadow-lg`)
                        )}>
                            <div className="flex gap-2.5 sm:gap-3 mb-3">
                                <span className={cn(
                                    "font-black shrink-0", 
                                    isTeacher ? (fontSizeScale === 'xl' || fontSizeScale === 'huge' ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl") : "text-base sm:text-lg", 
                                    isAnswered ? (isCorrect ? "text-emerald-400" : "text-rose-400") : theme.number
                                )}>
                                    {index + 1}.
                                </span>
                                <p className={cn(
                                    "font-bold leading-snug sm:leading-relaxed", 
                                    isTeacher ? "text-slate-800" : "text-slate-100",
                                    getTfFontSize()
                                )}>
                                    {q.statement}
                                </p>
                            </div>

                            <div className="flex gap-2 sm:gap-3 mt-auto">
                                <button
                                    onClick={() => !isAnswered && onAnswer(index, true)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "flex-1 font-black transition-all border flex items-center justify-center gap-1.5 active:scale-95",
                                        getTfBtnClass(),
                                        isAnswered && userAnswer.answer === true
                                            ? (userAnswer.isCorrect ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]")
                                            : isAnswered && userAnswer.answer !== true
                                                ? "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 opacity-40"
                                                : isTeacher
                                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 border-emerald-400"
                                                    : "bg-emerald-600/30 hover:bg-emerald-600/50 border-emerald-500/40 text-emerald-300"
                                    )}
                                >
                                    <CheckCircle className={getTfBtnIconClass()} /> Doğru
                                </button>
                                <button
                                    onClick={() => !isAnswered && onAnswer(index, false)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "flex-1 font-black transition-all border flex items-center justify-center gap-1.5 active:scale-95",
                                        getTfBtnClass(),
                                        isAnswered && userAnswer.answer === false
                                            ? (userAnswer.isCorrect ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]")
                                            : isAnswered && userAnswer.answer !== false
                                                ? "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 opacity-40"
                                                : isTeacher
                                                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/25 border-rose-400"
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
                 <div className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm bg-white shadow-sm dark:shadow-none dark:bg-white/50 px-3 py-1 rounded-full">
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
    isFullscreen = false
}: { 
    step: SentenceScrambleStep, 
    onAnswer: (answer: string) => void, 
    onCorrectAndNext: () => void, 
    answer?: { answer: string, isCorrect: boolean } | null, 
    isAnswerRevealed: boolean,
    fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge',
    isFullscreen?: boolean
}) {
    const isTeacher = useTeacherMode();

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
      
    useEffect(() => {
        if (!isAnswerRevealed && bankWords.length === 0 && constructedWords.length > 0) {
            const userAnswer = constructedWords.map(w => w.word).join(' ');
            onAnswer(userAnswer);
        }
    }, [bankWords.length, constructedWords, isAnswerRevealed, onAnswer]);

    useEffect(() => {
        if (answer?.isCorrect) {
            const timeoutId = setTimeout(() => { onCorrectAndNext(); }, 1500);
            return () => clearTimeout(timeoutId);
        }
    }, [answer, onCorrectAndNext]);

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
        <div className={cn("w-full mx-auto flex flex-col justify-center min-h-[65vh] gap-4 md:gap-6 p-2 sm:p-4 text-center", isTeacher ? "max-w-[96%] w-full pt-4 md:pt-8" : "max-w-4xl")}>
            <div className="text-center">
                <p className={cn("text-slate-800 font-black bg-white/95 backdrop-blur-md rounded-full inline-block border-2 border-indigo-200 shadow-md shadow-indigo-100/50", getInstructionClass())}>
                    Kelimeleri doğru sıraya dizerek cümleyi oluşturun.
                </p>
            </div>
             
             <div className={cn("relative flex flex-wrap justify-center content-center gap-2.5 sm:gap-4 md:gap-6 bg-white/95 backdrop-blur-xl border-2 border-indigo-200 shadow-xl shadow-indigo-100/50 p-4 sm:p-6 md:p-10 rounded-3xl", isTeacher ? "min-h-[14rem] md:min-h-[18rem]" : "min-h-[7rem] md:min-h-[12rem]")}>
                {constructedWords.map((wordObj) => (
                    <div 
                        key={wordObj.id} 
                        className={cn(
                            "font-black animate-in zoom-in duration-200 border-2",
                            wordColors[wordObj.id % wordColors.length], 
                            getConstructedWordClass()
                        )}
                    >
                        {wordObj.word}
                    </div>
                ))}
                {constructedWords.length === 0 && (
                    <span className={cn("text-slate-400 font-bold italic absolute select-none", isTeacher ? (fontSizeScale === 'xl' || fontSizeScale === 'huge' ? "text-2xl md:text-4xl" : "text-xl md:text-2xl") : "text-sm md:text-xl")}>
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
export function HtmlSlidePlayer({ step, onSlideScrolledToEnd }: { step: HtmlSlideStep, onSlideScrolledToEnd: () => void }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const fullDocument = useMemo(() => {
        let content = step.htmlContent || '';
        
        if (content.includes('<html') || content.includes('<!DOCTYPE')) {
            if (!content.includes('tailwindcss')) {
                content = content.replace('<head>', '<head><script src="https://cdn.tailwindcss.com"></script>');
            }
            return content;
        }

        return `<!DOCTYPE html>
<html lang="tr" class="dark">
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
            background-color: #020617;
            color: #f8fafc;
            margin: 0;
            padding: 16px;
            overflow-x: hidden;
        }
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #090d16;
        }
        ::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #6366f1;
        }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-2 sm:p-6">
    ${content}
</body>
</html>`;
    }, [step.htmlContent]);

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
        <div className="w-full h-full bg-slate-950 overflow-hidden">
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
export function DrawingCanvas({ stepIndex }: { stepIndex?: number }) {
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

    return (
        <>
            <PresentationDrawingBoard
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />

            {/* Sağ Altta Şık Hızlı Çizim Butonu */}
            {!isOpen && (
                <div className="fixed bottom-20 right-4 z-40">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 group backdrop-blur-xl"
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
export function ConceptMapPlayer({ step, isFullscreen }: { step: ConceptMapStep, isFullscreen: boolean }) {
    const isTeacher = useTeacherMode();
    const { nodes, edges } = step.mapData || { nodes: [], edges: [] };
    const containerRef = useRef<HTMLDivElement>(null);

    const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({});
    
    // Ağacı oluştururken merkeze alacağımız düğümü bul
    const rootNode = nodes.find(n => n.isCentral) || nodes[0];

    useEffect(() => {
        if (!rootNode) return;
        
        const newPos: Record<string, { x: number, y: number }> = {};
        const W = 800; 
        const H = 600; 
        
        newPos[rootNode.id] = { x: W / 2, y: H / 2 };

        const l1Edges = edges.filter(e => e.from === rootNode.id || e.to === rootNode.id);
        const l1Ids = l1Edges.map(e => e.from === rootNode.id ? e.to : e.from);
        
        const R1 = 180; 
        l1Ids.forEach((id, i) => {
            const angle = i * ((2 * Math.PI) / l1Ids.length);
            newPos[id] = { 
                x: (W / 2) + Math.cos(angle) * R1, 
                y: (H / 2) + Math.sin(angle) * R1 
            };
            
            const l2Edges = edges.filter(e => (e.from === id || e.to === id) && !newPos[e.from] && !newPos[e.to]);
            const l2Ids = l2Edges.map(e => e.from === id ? e.to : e.from);
            
            const R2 = 140; 
            l2Ids.forEach((l2Id, j) => {
                const spread = Math.PI / 1.5; 
                const startAngle = angle - (spread / 2);
                const stepAngle = l2Ids.length > 1 ? spread / (l2Ids.length - 1) : 0;
                const finalAngle = startAngle + (j * stepAngle);
                
                newPos[l2Id] = {
                    x: newPos[id].x + Math.cos(finalAngle) * R2,
                    y: newPos[id].y + Math.sin(finalAngle) * R2
                };
            });
        });
        
        nodes.forEach(n => {
            if (!newPos[n.id]) {
                const angle = Math.random() * 2 * Math.PI;
                newPos[n.id] = { 
                    x: (W / 2) + Math.cos(angle) * 280, 
                    y: (H / 2) + Math.sin(angle) * 280 
                };
            }
        });
        
        setPositions(newPos);
    }, [step]);

    if (!rootNode || Object.keys(positions).length === 0) return null;

    return (
        <div className={cn("w-full h-full flex flex-col items-center justify-start p-2", isTeacher ? "max-w-full" : "max-w-6xl mx-auto")}>
            <div className={cn(
                "relative z-20 p-6 rounded-[2rem] shadow-lg bg-white border border-slate-100 flex-shrink-0 w-full text-center mb-6", 
                isTeacher ? "py-6 mt-2" : "p-4 md:p-8"
            )}>
                 <h2 className={cn("font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 drop-shadow-sm", isTeacher ? "text-4xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"))}>
                     {step.title}
                 </h2>
            </div>

            <div className="w-full overflow-x-auto pb-6 px-4 custom-scrollbar flex justify-center">
                <div ref={containerRef} className="relative min-w-[800px] w-[800px] h-[600px] bg-slate-50/80 backdrop-blur-md rounded-[3rem] border-4 border-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden">
                    {/* SVG Çizgiler */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 800 600">
                        {edges.map((edge, idx) => {
                            const fromPos = positions[edge.from];
                            const toPos = positions[edge.to];
                            if (!fromPos || !toPos) return null;
                            
                            const dx = toPos.x - fromPos.x;
                            const dy = toPos.y - fromPos.y;
                            const cx = fromPos.x + dx/2 - dy/4; 
                            const cy = fromPos.y + dy/2 + dx/4;

                            return (
                                <g key={idx}>
                                    <path 
                                        d={`M ${fromPos.x} ${fromPos.y} Q ${cx} ${cy} ${toPos.x} ${toPos.y}`}
                                        fill="none"
                                        stroke="url(#edgeGradient)"
                                        strokeWidth="4"
                                        strokeDasharray="8,6"
                                        className="opacity-60 drop-shadow-sm"
                                    />
                                    {edge.label && (
                                        <g transform={`translate(${fromPos.x + dx/2}, ${fromPos.y + dy/2 - 15})`}>
                                            <rect x="-40" y="-10" width="80" height="20" rx="10" fill="white" className="drop-shadow-sm" />
                                            <text x="0" y="4" textAnchor="middle" className="fill-indigo-600 text-[10px] font-black uppercase tracking-widest">
                                                {edge.label}
                                            </text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                        <defs>
                            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#a5b4fc" />
                                <stop offset="100%" stopColor="#c084fc" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Sürüklenebilir Düğümler */}
                    {nodes.map((node, idx) => {
                        const pos = positions[node.id];
                        if (!pos) return null;
                        const isCenter = node.id === rootNode.id;
                        
                        return (
                            <motion.div
                                key={node.id}
                                drag
                                dragConstraints={containerRef}
                                dragElastic={0.1}
                                dragMomentum={false}
                                onDrag={(e, info) => {
                                    setPositions(prev => ({ 
                                        ...prev, 
                                        [node.id]: { x: prev[node.id].x + info.delta.x, y: prev[node.id].y + info.delta.y } 
                                    }));
                                }}
                                whileDrag={{ scale: 1.1, zIndex: 50, cursor: 'grabbing', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ 
                                    opacity: { duration: 0.5, delay: idx * 0.1 },
                                    scale: { duration: 0.5, delay: idx * 0.1, type: "spring", bounce: 0.4 },
                                }}
                                style={{
                                    position: 'absolute',
                                    left: pos.x,
                                    top: pos.y,
                                    x: '-50%',
                                    y: '-50%',
                                }}
                                className={cn(
                                    "pointer-events-auto cursor-grab flex items-center justify-center text-center p-4 md:p-5 rounded-[2rem] border-2 backdrop-blur-xl transition-all select-none",
                                    isCenter 
                                        ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-purple-300 text-white shadow-xl shadow-purple-500/30 min-w-[150px] min-h-[70px] z-20 border-b-[8px]" 
                                        : "bg-white/95 border-2 border-sky-400 text-sky-950 shadow-md shadow-sky-100/60 min-w-[120px] min-h-[60px] hover:border-indigo-500 hover:shadow-xl z-10 border-b-[6px]"
                                )}
                            >
                                <motion.div
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <span className={cn("font-black tracking-wider break-words", isCenter ? "text-xl drop-shadow-md text-white" : "text-sm md:text-base text-sky-950")}>
                                        {node.label}
                                    </span>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════

// ══ 11. MatchingPlayer (KAVRAM - TANIM EŞLEŞTİRME MODÜLÜ - DİNAMİK BÜYÜTME & KOZMİK TASARIM) ══
export function MatchingPlayer({ 
    step, 
    onCompleted, 
    topicId, 
    isTeacher, 
    isFullscreen,
    fontSizeScale = 'normal'
}: { 
    step: any; 
    onCompleted?: () => void; 
    topicId?: string; 
    isTeacher: boolean; 
    isFullscreen: boolean; 
    fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge';
}) {
    const [pairs, setPairs] = useState<{ id: string; concept: string; definition: string }[]>([]);
    const [shuffledDefinitions, setShuffledDefinitions] = useState<{ id: string; text: string }[]>([]);
    const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
    const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
    const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
    const [wrongPair, setWrongPair] = useState<{ conceptId: string; defId: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    // 8 Farklı Canlı ve Şık Eşleşme Renk Paleti (Eşleşen Çiftin Her İkisi de Aynı Canlı Rengi Alır)
    const MATCH_COLORS = [
        { 
            card: 'bg-emerald-600 border-2 border-emerald-400 text-white shadow-[0_6px_25px_rgba(16,185,129,0.4)]', 
            badge: 'bg-emerald-800 text-white border-transparent',
            pill: 'text-emerald-100 border-emerald-300/50 bg-emerald-800/80',
            accent: 'text-emerald-300'
        },
        { 
            card: 'bg-sky-600 border-2 border-sky-400 text-white shadow-[0_6px_25px_rgba(14,165,233,0.4)]', 
            badge: 'bg-sky-800 text-white border-transparent',
            pill: 'text-sky-100 border-sky-300/50 bg-sky-800/80',
            accent: 'text-sky-300'
        },
        { 
            card: 'bg-purple-600 border-2 border-purple-400 text-white shadow-[0_6px_25px_rgba(168,85,247,0.4)]', 
            badge: 'bg-purple-800 text-white border-transparent',
            pill: 'text-purple-100 border-purple-300/50 bg-purple-800/80',
            accent: 'text-purple-300'
        },
        { 
            card: 'bg-amber-500 border-2 border-amber-300 text-slate-950 shadow-[0_6px_25px_rgba(245,158,11,0.4)]', 
            badge: 'bg-amber-700 text-white border-transparent',
            pill: 'text-amber-950 border-amber-600/50 bg-amber-200/90 font-black',
            accent: 'text-amber-300'
        },
        { 
            card: 'bg-rose-600 border-2 border-rose-400 text-white shadow-[0_6px_25px_rgba(244,63,94,0.4)]', 
            badge: 'bg-rose-800 text-white border-transparent',
            pill: 'text-rose-100 border-rose-300/50 bg-rose-800/80',
            accent: 'text-rose-300'
        },
        { 
            card: 'bg-indigo-600 border-2 border-indigo-400 text-white shadow-[0_6px_25px_rgba(99,102,241,0.4)]', 
            badge: 'bg-indigo-800 text-white border-transparent',
            pill: 'text-indigo-100 border-indigo-300/50 bg-indigo-800/80',
            accent: 'text-indigo-300'
        },
        { 
            card: 'bg-lime-600 border-2 border-lime-400 text-white shadow-[0_6px_25px_rgba(101,163,13,0.4)]', 
            badge: 'bg-lime-800 text-white border-transparent',
            pill: 'text-lime-100 border-lime-300/50 bg-lime-800/80',
            accent: 'text-lime-300'
        },
        { 
            card: 'bg-fuchsia-600 border-2 border-fuchsia-400 text-white shadow-[0_6px_25px_rgba(217,70,239,0.4)]', 
            badge: 'bg-fuchsia-800 text-white border-transparent',
            pill: 'text-fuchsia-100 border-fuchsia-300/50 bg-fuchsia-800/80',
            accent: 'text-fuchsia-300'
        },
    ];

    const [pairColorMap, setPairColorMap] = useState<Map<string, number>>(new Map());

    // Sunum Araçlarındaki Büyütme/Küçültme (A- / A+) İle Senkronizasyon (5 Kademe)
    const cardScale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
        (fontSizeScale === 'huge' || fontSizeScale === 'xl') ? 'xl' :
        fontSizeScale === 'lg' ? 'lg' :
        fontSizeScale === 'md' ? 'md' :
        fontSizeScale === 'xs' ? 'xs' : 'sm';

    const getConceptFontSize = () => {
        switch (cardScale) {
            case 'xs': return isTeacher ? "text-base sm:text-lg md:text-xl font-black" : "text-sm sm:text-base font-bold";
            case 'sm': return isTeacher ? "text-lg sm:text-xl md:text-2xl font-black" : "text-base sm:text-lg font-black";
            case 'md': return isTeacher ? "text-xl sm:text-2xl md:text-3xl font-black" : "text-lg sm:text-xl font-black";
            case 'lg': return isTeacher ? "text-2xl sm:text-3xl md:text-4xl font-black" : "text-xl sm:text-2xl font-black";
            case 'xl': return isTeacher ? "text-3xl sm:text-4xl md:text-5xl font-black" : "text-2xl sm:text-3xl font-black";
            default: return isTeacher ? "text-xl sm:text-2xl md:text-3xl font-black" : "text-lg sm:text-xl font-black";
        }
    };

    const getDefinitionFontSize = () => {
        switch (cardScale) {
            case 'xs': return isTeacher ? "text-sm sm:text-base md:text-lg font-bold" : "text-xs sm:text-sm md:text-base font-medium";
            case 'sm': return isTeacher ? "text-base sm:text-lg md:text-xl font-bold" : "text-sm sm:text-base md:text-lg font-semibold";
            case 'md': return isTeacher ? "text-lg sm:text-xl md:text-2xl font-bold" : "text-base sm:text-lg md:text-xl font-bold";
            case 'lg': return isTeacher ? "text-xl sm:text-2xl md:text-3xl font-extrabold" : "text-lg sm:text-xl md:text-2xl font-bold";
            case 'xl': return isTeacher ? "text-2xl sm:text-3xl md:text-4xl font-black" : "text-xl sm:text-2xl md:text-3xl font-black";
            default: return isTeacher ? "text-lg sm:text-xl md:text-2xl font-bold" : "text-base sm:text-lg md:text-xl font-bold";
        }
    };

    const getCardPadding = () => {
        switch (cardScale) {
            case 'xs': return "p-2.5 sm:p-3 min-h-[44px]";
            case 'sm': return "p-3 sm:p-3.5 min-h-[52px]";
            case 'md': return "p-3.5 sm:p-4.5 min-h-[62px]";
            case 'lg': return "p-4.5 sm:p-5.5 min-h-[74px]";
            case 'xl': return "p-5 sm:p-7 min-h-[86px]";
            default: return "p-3.5 sm:p-4.5 min-h-[62px]";
        }
    };

    const getBadgeSize = () => {
        switch (cardScale) {
            case 'xs': return "h-6 w-6 text-xs";
            case 'sm': return "h-7 w-7 text-xs";
            case 'md': return "h-9 w-9 text-sm";
            case 'lg': return "h-11 w-11 text-base";
            case 'xl': return "h-13 w-13 text-lg";
            default: return "h-9 w-9 text-sm";
        }
    };

    useEffect(() => {
        const initPairs = async () => {
            let rawPairs: { concept: string; definition: string }[] = [];
            if (Array.isArray(step.pairs) && step.pairs.length > 0) {
                rawPairs = step.pairs.filter((p: any) => p.concept && p.definition);
            }

            if (rawPairs.length === 0 && topicId) {
                setIsLoading(true);
                try {
                    const res = await fetch(`/curriculum/activity-items/${topicId}.json?v=${Date.now()}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) {
                            data.forEach((item: any) => {
                                const c = item.content?.term || item.content?.text || item.concept || item.term;
                                const d = item.content?.definition || item.definition;
                                if (c && d) rawPairs.push({ concept: String(c).trim(), definition: String(d).trim() });
                            });
                        }
                    }
                } catch (e) {
                    console.warn("Could not fetch topic matching items:", e);
                } finally {
                    setIsLoading(false);
                }
            }

            if (rawPairs.length === 0) {
                rawPairs = [
                    { concept: "Adalet", definition: "Her hak sahibine hakkını vermek, eşit ve dürüst davranmak." },
                    { concept: "İhlas", definition: "İbadet ve amelleri sadece Allah rızası için samimiyetle yapmak." },
                    { concept: "Tevhid", definition: "Allah'ın bir ve tek olduğuna, eşi ve benzeri olmadığına inanmak." },
                    { concept: "Ahlak", definition: "İnsanın iyi veya kötü olarak vasıflandırılmasına yol açan manevi nitelikleri ve davranışları." },
                ];
            }

            const formatted = rawPairs.slice(0, 8).map((p, idx) => ({
                id: `pair-${idx}-${p.concept.toLowerCase().replace(/\s+/g, '-')}`,
                concept: p.concept,
                definition: p.definition
            }));

            setPairs(formatted);

            const defs = formatted.map(p => ({ id: p.id, text: p.definition }));
            setShuffledDefinitions(defs.sort(() => Math.random() - 0.5));
            setMatchedIds(new Set());
            setSelectedConceptId(null);
            setSelectedDefId(null);
            setIsFinished(false);
        };

        initPairs();
    }, [step, topicId]);

    const handleConceptClick = (id: string) => {
        if (matchedIds.has(id)) return;
        playSound('pop');
        setSelectedConceptId(id);

        if (selectedDefId) {
            checkMatch(id, selectedDefId);
        }
    };

    const handleDefinitionClick = (id: string) => {
        if (matchedIds.has(id)) return;
        playSound('pop');
        setSelectedDefId(id);

        if (selectedConceptId) {
            checkMatch(selectedConceptId, id);
        }
    };

    const checkMatch = (conceptId: string, defId: string) => {
        if (conceptId === defId) {
            playSound('correct');
            const nextMatched = new Set(matchedIds);
            nextMatched.add(conceptId);
            setMatchedIds(nextMatched);

            setPairColorMap(prev => {
                const nextMap = new Map(prev);
                const colorIdx = (nextMatched.size - 1) % MATCH_COLORS.length;
                nextMap.set(conceptId, colorIdx);
                return nextMap;
            });

            setSelectedConceptId(null);
            setSelectedDefId(null);
            setWrongPair(null);

            import('canvas-confetti').then(m => {
                m.default({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.6 }
                });
            }).catch(() => {});

            if (nextMatched.size === pairs.length) {
                setIsFinished(true);
                playSound('win');
                import('canvas-confetti').then(m => {
                    m.default({
                        particleCount: 200,
                        spread: 100,
                        origin: { y: 0.5 }
                    });
                }).catch(() => {});
                if (onCompleted) onCompleted();
            }
        } else {
            playSound('incorrect');
            setWrongPair({ conceptId, defId });
            setTimeout(() => {
                setSelectedConceptId(null);
                setSelectedDefId(null);
                setWrongPair(null);
            }, 700);
        }
    };

    const handleSolveAll = () => {
        const allIds = new Set(pairs.map(p => p.id));
        setMatchedIds(allIds);
        const map = new Map<string, number>();
        pairs.forEach((p, i) => map.set(p.id, i % MATCH_COLORS.length));
        setPairColorMap(map);
        setIsFinished(true);
        playSound('win');
        if (onCompleted) onCompleted();
    };

    const handleReset = () => {
        setMatchedIds(new Set());
        setSelectedConceptId(null);
        setSelectedDefId(null);
        setWrongPair(null);
        setIsFinished(false);
        setPairColorMap(new Map());
        const defs = pairs.map(p => ({ id: p.id, text: p.definition }));
        setShuffledDefinitions(defs.sort(() => Math.random() - 0.5));
    };

    return (
        <div className={cn(
            "w-full h-full flex flex-col items-center justify-start p-2 md:p-4 select-none",
            isTeacher ? "max-w-full" : "max-w-6xl mx-auto"
        )}>
            {/* ══ BAŞLIK KARTI (KOMPAKT & ODAKLI) ══ */}
            <div className={cn(
                "relative z-20 rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl flex-shrink-0 w-full mb-3 md:mb-4 overflow-hidden shadow-lg px-3.5 py-2 md:px-5 md:py-2.5"
            )}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 flex items-center justify-center gap-2.5 min-w-0 text-center">
                        <div className="p-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex-shrink-0">
                            <Shuffle className="w-4 h-4 animate-pulse" />
                        </div>
                        <div className="flex items-baseline gap-2 truncate text-center">
                            <h2 className="font-black text-white tracking-tight text-sm md:text-base truncate text-center">
                                {step.title || 'Kavram - Tanım Eşleştirme'}
                            </h2>
                            <span className="text-xs text-slate-400 font-medium hidden md:inline-block">
                                • Sol ve sağ kartlara dokunarak eşleştirin
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/80 border border-white/10 shadow-inner">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-black text-slate-300">
                                <span className="text-emerald-400 font-black">{matchedIds.size}</span> / {pairs.length}
                            </span>
                        </div>

                        {isTeacher && (
                            <div className="flex items-center gap-1.5">
                                <Button
                                    size="sm"
                                    onClick={handleSolveAll}
                                    className="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-bold rounded-lg h-7 px-2.5"
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> Çöz
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleReset}
                                    variant="outline"
                                    className="border-white/10 text-slate-300 hover:text-white text-xs font-bold rounded-lg h-7 px-2.5"
                                >
                                    <RotateCcw className="w-3 h-3 mr-1" /> Sıfırla
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ EŞLEŞTİRME ÇİFTLERİ TABLOSU ══ */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-16 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-3" />
                    <p className="font-bold text-sm">Kavramlar yükleniyor...</p>
                </div>
            ) : (
                <div className={cn(
                    "grid w-full flex-1",
                    isTeacher ? "grid-cols-2 md:grid-cols-2 gap-3 sm:gap-6 md:gap-8" : "grid-cols-2 gap-3 sm:gap-6 md:gap-8"
                )}>
                    {/* SOL SÜTUN: KAVRAMLAR */}
                    <div className="flex flex-col">
                        <div className="text-xs sm:text-sm font-black text-indigo-400 uppercase tracking-widest px-2 pb-2.5 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" /> Kavramlar
                        </div>
                        <div className={cn(
                            "w-full rounded-2xl sm:rounded-3xl border-2 overflow-hidden shadow-xl backdrop-blur-xl transition-all duration-300 divide-y flex flex-col",
                            isTeacher 
                                ? "bg-white/95 border-slate-200/90 divide-slate-200/90 shadow-indigo-100/40" 
                                : "bg-slate-900/80 border-white/10 divide-white/10 shadow-2xl"
                        )}>
                            {pairs.map((pair, index) => {
                                const isMatched = matchedIds.has(pair.id);
                                const isSelected = selectedConceptId === pair.id;
                                const isWrong = wrongPair?.conceptId === pair.id;
                                const colorIndex = pairColorMap.get(pair.id) ?? 0;
                                const matchedTheme = MATCH_COLORS[colorIndex % MATCH_COLORS.length];

                                return (
                                    <button
                                        key={pair.id}
                                        type="button"
                                        onClick={() => handleConceptClick(pair.id)}
                                        disabled={isMatched}
                                        className={cn(
                                            "w-full text-left transition-all duration-200 relative flex items-center justify-between gap-2 md:gap-4 overflow-hidden",
                                            getCardPadding(),
                                            isMatched
                                                ? `${matchedTheme.card} opacity-95 cursor-default`
                                                : isWrong
                                                    ? (isTeacher ? "animate-shake bg-rose-100 text-rose-900" : "animate-shake bg-rose-950/90 text-rose-200")
                                                    : isSelected
                                                        ? (isTeacher ? "bg-indigo-100/90 text-indigo-950 ring-2 ring-inset ring-indigo-500 font-bold" : "bg-indigo-950/90 text-indigo-200 ring-2 ring-inset ring-indigo-500 font-bold")
                                                        : (isTeacher ? "bg-white hover:bg-indigo-50/70 text-slate-900" : "bg-transparent hover:bg-white/5 text-white")
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 md:gap-4 flex-1 min-w-0">
                                            <span className={cn(
                                                "rounded-xl flex items-center justify-center font-black border-2 flex-shrink-0 transition-colors",
                                                getBadgeSize(),
                                                isMatched
                                                    ? `${matchedTheme.badge} border-transparent`
                                                    : isSelected
                                                        ? "bg-indigo-600 text-white border-transparent shadow-md"
                                                        : (isTeacher ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white/10 text-indigo-300 border-white/10")
                                            )}>
                                                {isMatched ? <CheckCircle2 className="w-4 h-4 text-white" /> : index + 1}
                                            </span>
                                            <span className={cn(
                                                "tracking-wide drop-shadow-sm break-words [overflow-wrap:anywhere] leading-snug font-black",
                                                getConceptFontSize()
                                            )}>
                                                {pair.concept}
                                            </span>
                                        </div>
                                        {isMatched && (
                                            <span className={cn(
                                                "text-[9px] md:text-xs font-black uppercase tracking-widest px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border backdrop-blur-md flex-shrink-0",
                                                matchedTheme.pill
                                            )}>
                                                ✓
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SAĞ SÜTUN: TANIMLAR */}
                    <div className="flex flex-col">
                        <div className="text-xs sm:text-sm font-black text-purple-400 uppercase tracking-widest px-2 pb-2.5 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]" /> Tanımlar
                        </div>
                        <div className={cn(
                            "w-full rounded-2xl sm:rounded-3xl border-2 overflow-hidden shadow-xl backdrop-blur-xl transition-all duration-300 divide-y flex flex-col",
                            isTeacher 
                                ? "bg-white/95 border-slate-200/90 divide-slate-200/90 shadow-indigo-100/40" 
                                : "bg-slate-900/80 border-white/10 divide-white/10 shadow-2xl"
                        )}>
                            {shuffledDefinitions.map((def, index) => {
                                const isMatched = matchedIds.has(def.id);
                                const isSelected = selectedDefId === def.id;
                                const isWrong = wrongPair?.defId === def.id;
                                const colorIndex = pairColorMap.get(def.id) ?? 0;
                                const matchedTheme = MATCH_COLORS[colorIndex % MATCH_COLORS.length];

                                return (
                                    <button
                                        key={`def-${def.id}`}
                                        type="button"
                                        onClick={() => handleDefinitionClick(def.id)}
                                        disabled={isMatched}
                                        className={cn(
                                            "w-full text-left transition-all duration-200 relative flex items-center justify-between gap-2 md:gap-4 overflow-hidden",
                                            getCardPadding(),
                                            isMatched
                                                ? `${matchedTheme.card} opacity-95 cursor-default`
                                                : isWrong
                                                    ? (isTeacher ? "animate-shake bg-rose-100 text-rose-900" : "animate-shake bg-rose-950/90 text-rose-200")
                                                    : isSelected
                                                        ? (isTeacher ? "bg-purple-100/90 text-purple-950 ring-2 ring-inset ring-purple-500 font-bold" : "bg-purple-950/90 text-purple-200 ring-2 ring-inset ring-purple-500 font-bold")
                                                        : (isTeacher ? "bg-white hover:bg-purple-50/70 text-slate-900" : "bg-transparent hover:bg-white/5 text-slate-100")
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 md:gap-4 flex-1 min-w-0">
                                            <span className={cn(
                                                "rounded-xl flex items-center justify-center font-black border-2 flex-shrink-0 transition-colors",
                                                getBadgeSize(),
                                                isMatched
                                                    ? `${matchedTheme.badge} border-transparent`
                                                    : isSelected
                                                        ? "bg-purple-600 text-white border-transparent shadow-md"
                                                        : (isTeacher ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-white/10 text-purple-300 border-white/10")
                                            )}>
                                                {String.fromCharCode(65 + index)}
                                            </span>
                                            <p className={cn(
                                                "leading-snug break-words [overflow-wrap:anywhere]",
                                                getDefinitionFontSize(),
                                                !isTeacher && "text-slate-100 line-clamp-3 sm:line-clamp-none"
                                            )}>
                                                {def.text}
                                            </p>
                                        </div>
                                        {isMatched && (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
