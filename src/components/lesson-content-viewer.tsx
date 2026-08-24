'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { 
    ArrowLeft, ArrowRight, PartyPopper, Repeat, Gamepad2, Lightbulb, 
    CheckCircle2, XCircle, Link as LinkIcon, Layers, Star, 
    Check, Target, Zap, Sparkles, Feather, Leaf, Sun, Moon, Puzzle, Skull, Crosshair, 
    Shuffle, FolderKanban, MousePointerClick, Trophy, BrainCircuit, Video, Loader2, 
    CheckCircle, ArrowDownUp, Search, Coins, ClipboardCheck, Minus, Plus, X, History,
    Maximize2, Maximize, Minimize, AlertTriangle, FastForward, Lock, Crown, Gem, Flame, Quote,
    PenTool, Eraser, Highlighter, Undo, Trash2, ChevronUp, ChevronDown, Palette, Pencil
} from 'lucide-react';
import type { 
    LessonStep, AnagramStep, SentenceScrambleStep, FitbStep, AccordionStep, IframeStep, 
    Topic, ActivityLinkStep, VisualStep, McqStep, TfStep, FlashcardStep, TrueFalseListStep, 
    HtmlSlideStep, ContentStep, ConceptMapStep, ConceptMapData, AnagramFlashcardStep, 
    ConceptExplanationStep, ObjectiveListStep, VideoStep, Question, AnagramGameStep 
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import Link from 'next/link';
import { playSound } from "@/lib/audio-service";
import { useAuth } from "@/context/auth-context";
import { PresentationDrawingBoard } from "@/components/presentation-drawing-board";

// --- TİP TANIMLAMALARI ---
type LocalProgress = {
    answers: { [stepIndex: number]: any };
    score: number;
}

export type LessonContentViewerProps = {
    topic: Topic | null;
    courseId: string;
    unitId: string;
    courseTitle: string;
    unitTitle: string;
    onTopicComplete: (topicId: string, score: number) => void;
    progress: LocalProgress | undefined;
    onProgressUpdate: (topicId: string, newProgress: LocalProgress) => void;
    isFullscreen: boolean;
    completeButtonText?: string; 
    onMultiAnswer?: (stepIndex: number, questionIndex: number, selectedAnswer: boolean) => void;
    onAllTfAnswered?: (stepIndex?: number) => void;
    isSingleCardMode?: boolean;
    animationSpeed?: 'off' | 'slow' | 'normal' | 'fast';
    fontSizeScale?: 'normal' | 'large' | 'huge';
    jumpToStep?: number | null;
    onJumpDone?: () => void;
    onStepIndexChange?: (index: number, total: number) => void;
};

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

// --- YARDIMCI FONKSİYONLAR ---

function getEmbedUrl(url: string): string {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) {
            const videoId = urlObj.searchParams.get('v');
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }
        if (urlObj.hostname.includes('youtu.be')) {
            const videoId = urlObj.pathname.slice(1);
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }
        if (urlObj.hostname.includes('vimeo.com')) {
            const videoId = urlObj.pathname.split('/').pop();
            if (videoId && !isNaN(parseInt(videoId))) {
                return `https://player.vimeo.com/video/${videoId}`;
            }
        }
    } catch (e) {
        return url; 
    }
    return url; 
}

const TypewriterText = ({ content, onComplete, speed = 40 }: { content: string, onComplete?: () => void, speed?: number }) => {
    const [displayedContent, setDisplayedContent] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const currentIndexRef = useRef(0);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
      
    useEffect(() => {
        setDisplayedContent('');
        setIsCompleted(false);
        currentIndexRef.current = 0;
    }, [content]);

    useEffect(() => {
        if (isCompleted) return;

        const intervalId = setInterval(() => {
            if (currentIndexRef.current >= content.length) {
                clearInterval(intervalId);
                setIsCompleted(true);
                if (onCompleteRef.current) onCompleteRef.current();
                return;
            }
            
            let char = content.charAt(currentIndexRef.current);
            if (char === '<') {
                const closingIndex = content.indexOf('>', currentIndexRef.current);
                if (closingIndex !== -1) {
                    currentIndexRef.current = closingIndex + 1;
                } else {
                    currentIndexRef.current++;
                }
            } else {
                currentIndexRef.current++;
            }
            
            setDisplayedContent(content.substring(0, currentIndexRef.current));
        }, speed);

        return () => clearInterval(intervalId);
    }, [content, speed, isCompleted]); 

    if (isCompleted) {
        return <div className="highlight-text" dangerouslySetInnerHTML={{ __html: content }} />;
    }
    return <div className="highlight-text" dangerouslySetInnerHTML={{ __html: displayedContent }} />;
};

// --- ORTAK RENK TEMALARI ---
export const FLASHCARD_THEMES = [
    { front: 'bg-gradient-to-br from-rose-50 to-pink-100 border-2 border-rose-300 text-rose-950 shadow-md', back: 'bg-gradient-to-br from-rose-500 to-pink-600 border-b-8 border-rose-700 text-white shadow-xl shadow-rose-500/30' },
    { front: 'bg-gradient-to-br from-sky-50 to-blue-100 border-2 border-sky-300 text-sky-950 shadow-md', back: 'bg-gradient-to-br from-sky-500 to-blue-600 border-b-8 border-blue-700 text-white shadow-xl shadow-sky-500/30' },
    { front: 'bg-gradient-to-br from-emerald-50 to-teal-100 border-2 border-emerald-300 text-emerald-950 shadow-md', back: 'bg-gradient-to-br from-emerald-500 to-teal-600 border-b-8 border-emerald-700 text-white shadow-xl shadow-emerald-500/30' },
    { front: 'bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-300 text-amber-950 shadow-md', back: 'bg-gradient-to-br from-amber-500 to-orange-600 border-b-8 border-amber-700 text-white shadow-xl shadow-amber-500/30' },
    { front: 'bg-gradient-to-br from-violet-50 to-purple-100 border-2 border-violet-300 text-violet-950 shadow-md', back: 'bg-gradient-to-br from-violet-500 to-purple-600 border-b-8 border-purple-700 text-white shadow-xl shadow-violet-500/30' },
    { front: 'bg-gradient-to-br from-cyan-50 to-teal-100 border-2 border-cyan-300 text-cyan-950 shadow-md', back: 'bg-gradient-to-br from-cyan-500 to-teal-600 border-b-8 border-cyan-700 text-white shadow-xl shadow-cyan-500/30' },
    { front: 'bg-gradient-to-br from-indigo-50 to-blue-100 border-2 border-indigo-300 text-indigo-950 shadow-md', back: 'bg-gradient-to-br from-indigo-500 to-blue-600 border-b-8 border-indigo-700 text-white shadow-xl shadow-indigo-500/30' },
    { front: 'bg-gradient-to-br from-orange-50 to-red-100 border-2 border-orange-300 text-orange-950 shadow-md', back: 'bg-gradient-to-br from-orange-500 to-red-600 border-b-8 border-orange-700 text-white shadow-xl shadow-orange-500/30' },
];

// --- 1. VisualPlayer ---
function VisualPlayer({ step, isMaximized, onToggleMaximize }: { step: VisualStep, isMaximized: boolean, onToggleMaximize: () => void }) {
    
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
                    : "w-full h-full"
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
                    className="bg-white/80 hover:bg-white text-slate-800 backdrop-blur-md border border-slate-200 rounded-full w-12 h-12 shadow-lg transition-transform hover:scale-110"
                    title={isMaximized ? "Küçült" : "Tam Ekran Yap"}
                >
                    {isMaximized ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                </Button>
            </div>

            <div className="relative w-full h-full">
                <Image 
                    src={step.imageUrl} 
                    alt={step.title || 'Görsel'} 
                    fill
                    className={cn(
                        "transition-all duration-500",
                        isMaximized ? "object-contain p-4" : "object-contain"
                    )}
                    priority
                />
            </div>
        </div>
    );
}

// --- 2. InteractiveTrueFalseList ---
function InteractiveTrueFalseList({ step, isFullscreen, answers, onAnswer, onAllAnswered, fontSizeScale = 'normal' }: { step: TrueFalseListStep, isFullscreen: boolean, answers: any, onAnswer: (index: number, val: boolean) => void, onAllAnswered: () => void, fontSizeScale?: 'normal' | 'large' | 'huge' }) {
    const isTeacher = useTeacherMode();
    const allAnswered = step.questions.every((_, index) => answers && answers[index] !== undefined);
    
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

    return (
        <div className={cn("w-full h-full flex flex-col items-center justify-start p-2", isTeacher ? "max-w-full" : "max-w-4xl mx-auto")}>
             <div className={cn(
                "relative rounded-2xl border-2 border-indigo-200 bg-white/95 backdrop-blur-xl flex-shrink-0 w-full text-center overflow-hidden shadow-md shadow-indigo-100/50",
                isTeacher ? "py-2.5 px-6 mb-3 mt-0" : "py-2 px-4 mb-2"
            )}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                <h2 className={cn("font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600",
                    isTeacher ? "text-2xl md:text-3xl" : (isFullscreen ? "text-lg md:text-2xl" : "text-base md:text-xl")
                )}>{step.title}</h2>
            </div>

            <div className={cn("w-full grid gap-3 pb-16", isTeacher ? "grid-cols-1 md:grid-cols-2 gap-4" : "grid-cols-1")}>
                {step.questions.map((q, index) => {
                    const userAnswer = answers && answers[index];
                    const isAnswered = userAnswer !== undefined;
                    const isCorrect = isAnswered && userAnswer.isCorrect;
                    
                    const theme = colorThemes[index % colorThemes.length];

                    return (
                        <div key={index} className={cn(
                            "rounded-2xl border-2 shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-md",
                            isTeacher ? "p-5 min-h-[12rem]" : "p-4 min-h-[10rem]",
                            isAnswered
                                ? (isCorrect ? "border-2 border-emerald-500 bg-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.25)]" : "border-2 border-rose-500 bg-rose-50 shadow-[0_0_20px_rgba(244,63,94,0.25)]")
                                : `${theme.card} border`
                        )}>
                            <div className="flex gap-4 mb-4">
                                <span className={cn("font-black", isTeacher ? "text-2xl" : "text-xl", isAnswered ? (isCorrect ? "text-emerald-700" : "text-rose-700") : theme.number)}>
                                    {index + 1}.
                                </span>
                                <p className={cn(
                                    "font-bold text-slate-800 leading-relaxed", 
                                    isTeacher 
                                        ? (fontSizeScale === 'huge' ? "text-2xl md:text-3xl" : (fontSizeScale === 'large' ? "text-xl md:text-2xl" : "text-lg md:text-xl"))
                                        : "text-base"
                                )}>
                                    {q.statement}
                                </p>
                            </div>

                            <div className="flex gap-3 mt-auto">
                                <button
                                    onClick={() => !isAnswered && onAnswer(index, true)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "flex-1 font-black rounded-xl transition-all border flex items-center justify-center gap-2",
                                        isTeacher ? "h-14 text-lg" : "h-11 text-sm",
                                        isAnswered && userAnswer.answer === true
                                            ? (userAnswer.isCorrect ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]")
                                            : isAnswered && userAnswer.answer !== true
                                                ? "bg-slate-100 border-slate-200 text-slate-400 opacity-40"
                                                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 border-emerald-400"
                                    )}
                                >
                                    <CheckCircle className={cn(isTeacher ? "h-5 w-5" : "h-4 w-4")} /> Doğru
                                </button>
                                <button
                                    onClick={() => !isAnswered && onAnswer(index, false)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "flex-1 font-black rounded-xl transition-all border flex items-center justify-center gap-2",
                                        isTeacher ? "h-14 text-lg" : "h-11 text-sm",
                                        isAnswered && userAnswer.answer === false
                                            ? (userAnswer.isCorrect ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]")
                                            : isAnswered && userAnswer.answer !== false
                                                ? "bg-slate-100 border-slate-200 text-slate-400 opacity-40"
                                                : "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/25 border-rose-400"
                                    )}
                                >
                                    <XCircle className={cn(isTeacher ? "h-5 w-5" : "h-3.5 w-3.5 md:h-4 md:w-4")} /> Yanlış
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

// 3. ContentListPlayer
export function ContentListPlayer({ 
    step, 
    revealedSentencesCount, 
    isFullscreen, 
    onAnimationStart, 
    onAnimationEnd,
    isSingleCardMode,
    animationSpeed = 'normal',
    fontSizeScale = 'normal'
}: { 
    step: ContentStep | ObjectiveListStep | AccordionStep, 
    revealedSentencesCount: number, 
    isFullscreen?: boolean, 
    onAnimationStart?: () => void, 
    onAnimationEnd?: () => void,
    isSingleCardMode?: boolean,
    animationSpeed?: 'off' | 'slow' | 'normal' | 'fast',
    fontSizeScale?: 'normal' | 'large' | 'huge'
}) {
    const isTeacher = useTeacherMode();
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [prevCount, setPrevCount] = useState(0);

    useEffect(() => {
        if (isTeacher && revealedSentencesCount > prevCount) {
             if (isSingleCardMode) {
                 setIsModalOpen(true);
                 onAnimationStart?.();
             }
        }
        setPrevCount(revealedSentencesCount);
    }, [revealedSentencesCount, prevCount, isTeacher, isSingleCardMode]);
      
    const sentences = useMemo(() => {
        let items: string[] = [];
        if (step.type === 'content') {
            if (typeof step.content !== 'string') return [];
            const doc = new DOMParser().parseFromString(`<div>${step.content}</div>`, 'text/html');
            const listItems = doc.querySelectorAll('li');
            if (listItems.length > 0) {
                items = Array.from(listItems).map(li => li.innerHTML);
            } else {
                items = step.content.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()) || [step.content];
            }
        } else if (step.type === 'objectiveList') {
            items = (step as ObjectiveListStep).items;
        } else if (step.type === 'accordion') {
             items = (step as AccordionStep).items.map(item => `<strong>${item.title}:</strong> ${item.content}`);
        }
        return items;
    }, [step]);
      
    const visibleSentences = sentences.slice(0, revealedSentencesCount);
    
    // Dekoratif İkonlar
    const decoIcons = [
        { left: Sparkles, right: Sparkles },
        { left: Star, right: Star },
        { left: Zap, right: Zap },
        { left: Crown, right: Crown },
        { left: Gem, right: Gem },
        { left: Flame, right: Flame },
        { left: Feather, right: Feather },
        { left: Quote, right: Quote }
    ];

    // Renk Temaları (Adaptive)
    const styles = [
        { bg: 'bg-sky-50/95 hover:bg-sky-100/90', border: 'border-2 border-sky-300 hover:border-sky-400', circleBorder: 'border-sky-400 bg-sky-500 shadow-md shadow-sky-400/40', numberColor: 'text-white', textColor: 'text-sky-950', iconColor: 'text-sky-600' },
        { bg: 'bg-rose-50/95 hover:bg-rose-100/90', border: 'border-2 border-rose-300 hover:border-rose-400', circleBorder: 'border-rose-400 bg-rose-500 shadow-md shadow-rose-400/40', numberColor: 'text-white', textColor: 'text-rose-950', iconColor: 'text-rose-600' },
        { bg: 'bg-amber-50/95 hover:bg-amber-100/90', border: 'border-2 border-amber-300 hover:border-amber-400', circleBorder: 'border-amber-400 bg-amber-500 shadow-md shadow-amber-400/40', numberColor: 'text-white', textColor: 'text-amber-950', iconColor: 'text-amber-600' },
        { bg: 'bg-emerald-50/95 hover:bg-emerald-100/90', border: 'border-2 border-emerald-300 hover:border-emerald-400', circleBorder: 'border-emerald-400 bg-emerald-500 shadow-md shadow-emerald-400/40', numberColor: 'text-white', textColor: 'text-emerald-950', iconColor: 'text-emerald-600' },
        { bg: 'bg-violet-50/95 hover:bg-violet-100/90', border: 'border-2 border-violet-300 hover:border-violet-400', circleBorder: 'border-violet-400 bg-violet-500 shadow-md shadow-violet-400/40', numberColor: 'text-white', textColor: 'text-violet-950', iconColor: 'text-violet-600' },
        { bg: 'bg-cyan-50/95 hover:bg-cyan-100/90', border: 'border-2 border-cyan-300 hover:border-cyan-400', circleBorder: 'border-cyan-400 bg-cyan-500 shadow-md shadow-cyan-400/40', numberColor: 'text-white', textColor: 'text-cyan-950', iconColor: 'text-cyan-600' },
        { bg: 'bg-indigo-50/95 hover:bg-indigo-100/90', border: 'border-2 border-indigo-300 hover:border-indigo-400', circleBorder: 'border-indigo-400 bg-indigo-500 shadow-md shadow-indigo-400/40', numberColor: 'text-white', textColor: 'text-indigo-950', iconColor: 'text-indigo-600' },
        { bg: 'bg-orange-50/95 hover:bg-orange-100/90', border: 'border-2 border-orange-300 hover:border-orange-400', circleBorder: 'border-orange-400 bg-orange-500 shadow-md shadow-orange-400/40', numberColor: 'text-white', textColor: 'text-orange-950', iconColor: 'text-orange-600' },
    ];

    useEffect(() => {
        if (isTeacher && visibleSentences.length > 0) {
            onAnimationStart?.();
        }
    }, [visibleSentences.length, isTeacher, onAnimationStart]);

    useEffect(() => {
        if (revealedSentencesCount > 1 && scrollRef.current) {
            setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
        }
    }, [revealedSentencesCount]);

    const latestSentence = sentences[revealedSentencesCount - 1];

    return (
        <div className={cn("w-full h-full flex flex-col items-center justify-start p-2", isTeacher ? "max-w-full" : "max-w-7xl mx-auto")}>
            {isModalOpen && latestSentence && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-2xl p-4" onClick={() => setIsModalOpen(false)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative w-full max-w-6xl p-8 md:p-16 rounded-[3rem] shadow-[0_0_100px_rgba(168,85,247,0.5)] flex flex-col items-center text-center border-4 border-white/30 overflow-hidden" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Animated Gradient Background */}
                        <motion.div 
                            className="absolute inset-0 z-0 opacity-90"
                            animate={{
                                background: [
                                    "linear-gradient(45deg, #4f46e5, #ec4899, #eab308)",
                                    "linear-gradient(45deg, #ec4899, #eab308, #4f46e5)",
                                    "linear-gradient(45deg, #eab308, #4f46e5, #ec4899)",
                                    "linear-gradient(45deg, #4f46e5, #ec4899, #eab308)"
                                ]
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        />
                        
                        {/* Overlay to ensure text readability */}
                        <div className="absolute inset-0 bg-black/20 z-10" />

                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-30">
                            <X className="h-8 w-8" />
                        </button>
                        
                        <div className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight py-12 max-h-[70vh] overflow-y-auto drop-shadow-2xl z-20 tracking-tight">
                            {animationSpeed !== 'off' ? (
                                <TypewriterText 
                                    content={latestSentence} 
                                    onComplete={() => onAnimationEnd?.()} 
                                    speed={animationSpeed === 'slow' ? 80 : (animationSpeed === 'fast' ? 15 : 40)} 
                                />
                            ) : (
                                <div dangerouslySetInnerHTML={{ __html: latestSentence }} />
                            )}
                        </div>
                        
                        <Button size="lg" onClick={() => setIsModalOpen(false)} className="mt-8 h-16 px-12 text-2xl font-black rounded-2xl bg-white text-purple-700 hover:bg-slate-100 shadow-2xl transform transition-transform hover:scale-110 active:scale-95 z-20">
                            Devam Et
                        </Button>
                    </motion.div>
                </div>
            )}
            
            {/* BAŞLIK */}
            <div className={cn(
                "relative z-20 rounded-2xl border-2 border-indigo-200 bg-white/95 backdrop-blur-xl flex-shrink-0 w-full max-w-full text-center overflow-hidden shadow-md shadow-indigo-100/50",
                isTeacher ? "py-2.5 px-5 mb-3 mt-0" : "p-3 md:p-4 mb-3"
            )}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                <div className="flex items-center justify-center gap-2.5">
                    <Sparkles className="text-purple-600 h-4 w-4 md:h-5 md:w-5 animate-pulse" />
                    <h2 className={cn("font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600",
                        isTeacher ? "text-2xl md:text-3xl" : (isFullscreen ? "text-xl md:text-2xl" : "text-lg md:text-xl")
                    )}>{step.title}</h2>
                    <Sparkles className="text-purple-600 h-4 w-4 md:h-5 md:w-5 animate-pulse" />
                </div>
            </div>
              
             <div className={cn(
                 "relative w-full pb-16 flex flex-col items-center", 
                 isTeacher ? "mt-1" : "mt-2"
             )}>
                <div className={cn(
                    "grid w-full max-w-full gap-2.5 md:gap-3.5 items-stretch transition-all duration-300",
                    visibleSentences.length === 1 
                        ? "grid-cols-1 max-w-4xl" 
                        : "grid-cols-1 md:grid-cols-2"
                )}>
                    {visibleSentences.map((sentence, index) => {
                        const style = styles[index % styles.length]; 
                        const shouldAnimate = isTeacher && index === visibleSentences.length - 1 && !isSingleCardMode; 
                        const isLastItem = index === visibleSentences.length - 1;
                        const isOddLast = visibleSentences.length > 2 && visibleSentences.length % 2 !== 0 && index === visibleSentences.length - 1;

                        return (
                            <div 
                                key={index} 
                                ref={isLastItem ? scrollRef : null}
                                className={cn(
                                    "relative w-full flex-shrink-0 z-10",
                                    isOddLast && "md:col-span-2 md:max-w-3xl md:mx-auto",
                                    isTeacher ? "animate-in slide-in-from-bottom-4 duration-300" : "animate-in slide-in-from-bottom-2 duration-300"
                                )}>
                                
                                <div className={cn(
                                    "relative w-full h-full py-3.5 px-4 md:py-4 md:px-5 rounded-2xl border shadow-md hover:shadow-lg transition-all duration-200 flex flex-row justify-start items-center text-left gap-3.5 backdrop-blur-xl",
                                    style.bg, style.border
                                )}>
                                    {/* Numara rozeti */}
                                    <div className={cn(
                                        "flex-shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border-2",
                                        style.circleBorder
                                    )}>
                                        <span className={cn("font-black text-base md:text-lg", style.numberColor)}>{index + 1}</span>
                                    </div>
                                    <div className={cn(
                                        "leading-relaxed font-bold break-words flex-1 z-10 relative",
                                        style.textColor,
                                        isTeacher 
                                            ? (fontSizeScale === 'huge' ? "text-2xl md:text-3xl lg:text-4xl tracking-wide" : (fontSizeScale === 'large' ? "text-xl md:text-2xl lg:text-3xl tracking-normal" : "text-lg md:text-xl lg:text-2xl tracking-normal"))
                                            : (fontSizeScale === 'huge' ? "text-lg md:text-xl" : (fontSizeScale === 'large' ? "text-base md:text-lg" : "text-sm md:text-base"))
                                    )}>
                                        <span className="flex-1">
                                            {shouldAnimate && animationSpeed !== 'off' ? (
                                                <TypewriterText content={sentence} onComplete={() => onAnimationEnd?.()} speed={animationSpeed === 'slow' ? 80 : (animationSpeed === 'fast' ? 15 : 40)} />
                                            ) : (
                                                <div dangerouslySetInnerHTML={{ __html: sentence }} />
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

// 4. ConceptExplanationPlayer
export function ConceptExplanationPlayer({ items, isFullscreen, title, isSingleCardMode, fontSizeScale = 'normal' }: { items: { concept: string, definition: string }[], isFullscreen: boolean, title: string, isSingleCardMode?: boolean, fontSizeScale?: 'normal' | 'large' | 'huge' }) {
    if (!items || items.length === 0) return null;
    const isTeacher = useTeacherMode();
    
    const cardStyles = [
        { bg: 'bg-sky-50/95 hover:bg-sky-100/90', border: 'border-2 border-sky-300', title: 'text-sky-800', hoverBorder: 'hover:border-sky-400', glow: 'shadow-md shadow-sky-100/60' },
        { bg: 'bg-rose-50/95 hover:bg-rose-100/90', border: 'border-2 border-rose-300', title: 'text-rose-800', hoverBorder: 'hover:border-rose-400', glow: 'shadow-md shadow-rose-100/60' },
        { bg: 'bg-amber-50/95 hover:bg-amber-100/90', border: 'border-2 border-amber-300', title: 'text-amber-800', hoverBorder: 'hover:border-amber-400', glow: 'shadow-md shadow-amber-100/60' },
        { bg: 'bg-emerald-50/95 hover:bg-emerald-100/90', border: 'border-2 border-emerald-300', title: 'text-emerald-800', hoverBorder: 'hover:border-emerald-400', glow: 'shadow-md shadow-emerald-100/60' },
        { bg: 'bg-violet-50/95 hover:bg-violet-100/90', border: 'border-2 border-violet-300', title: 'text-violet-800', hoverBorder: 'hover:border-violet-400', glow: 'shadow-md shadow-violet-100/60' },
        { bg: 'bg-cyan-50/95 hover:bg-cyan-100/90', border: 'border-2 border-cyan-300', title: 'text-cyan-800', hoverBorder: 'hover:border-cyan-400', glow: 'shadow-md shadow-cyan-100/60' },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } }
    };

    return (
        <div className={cn('flex flex-col h-full w-full items-center justify-start p-2', isTeacher ? "max-w-[98%] mx-auto pt-0" : "max-w-6xl mx-auto justify-center")}>
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("relative rounded-2xl border-2 border-indigo-200 bg-white/95 backdrop-blur-xl flex-shrink-0 mb-3 w-full text-center overflow-hidden shadow-md shadow-indigo-100/50", isTeacher ? "py-2.5 px-6" : "p-3")}
            >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                <h2 className={cn("font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 drop-shadow-sm", isTeacher ? "text-2xl md:text-3xl" : (isFullscreen ? "text-xl md:text-2xl" : "text-lg md:text-xl"))}>{title}</h2>
            </motion.div>
             <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className={cn(
                "w-full flex-grow grid gap-3 md:gap-4 pb-16", 
                isTeacher 
                    ? "grid-cols-1 md:grid-cols-2 content-start" 
                    : "grid-cols-1 md:grid-cols-2"
            )}>
                {(() => {
                    let conceptIndex = 1;
                    return items.map((item, index) => {
                        if (item.concept === '[BAŞLIK]') {
                            return (
                                <motion.div variants={itemVariants} key={index} className="col-span-1 md:col-span-2 mt-8 mb-2 flex items-center gap-4 w-full">
                                    <div className="h-[2px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent flex-1" />
                                    <h3 className="text-2xl md:text-3xl font-black text-cyan-600 tracking-widest uppercase drop-shadow-sm text-center px-4">{item.definition}</h3>
                                    <div className="h-[2px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent flex-1" />
                                </motion.div>
                            );
                        }
                        
                        const style = cardStyles[(conceptIndex - 1) % cardStyles.length];
                        const currentNum = conceptIndex++;
                        
                        return (
                            <motion.div variants={itemVariants} key={index} className="h-full">
                                <Card className={cn(
                                    "h-full border-2 transition-all duration-300 group shadow-md hover:shadow-xl hover:-translate-y-1 backdrop-blur-xl",
                                    style.bg,
                                    style.border,
                                    style.hoverBorder,
                                    style.glow,
                                    isTeacher ? 'min-h-[160px]' : (isFullscreen ? 'min-h-[180px]' : 'min-h-[120px]')
                                )}>
                                    <CardHeader className={cn("border-b", style.border, isTeacher ? "p-4 pb-2" : "p-3 md:p-4 pb-2 md:pb-3")}>
                                        <CardTitle className={cn(
                                            "font-black uppercase tracking-wider transition-colors drop-shadow-sm", 
                                            style.title, 
                                            isTeacher 
                                                ? (fontSizeScale === 'huge' ? "text-2xl md:text-3xl" : (fontSizeScale === 'large' ? "text-xl md:text-2xl" : "text-lg md:text-xl"))
                                                : (isFullscreen ? "text-lg md:text-xl" : "text-base md:text-lg")
                                        )}>{currentNum}. {item.concept}</CardTitle>
                                    </CardHeader>
                                    <CardContent className={cn(
                                        "text-slate-800 font-semibold leading-relaxed tracking-wide", 
                                        isTeacher 
                                            ? (fontSizeScale === 'huge' ? "text-2xl md:text-3xl p-5 pt-3" : (fontSizeScale === 'large' ? "text-xl md:text-2xl p-4 pt-3" : "text-lg md:text-xl p-4 pt-3"))
                                            : "p-3 md:p-4 text-sm md:text-base"
                                    )}>
                                        <div dangerouslySetInnerHTML={{ __html: item.definition }} />
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    });
                })()}
            </motion.div>
        </div>
    );
}

// 5. AnagramFlashcardPlayer
function AnagramFlashcardPlayer({ step, flippedCards, onCardFlip, isFullscreen }: { 
    step: AnagramFlashcardStep, 
    flippedCards: Set<number>, 
    onCardFlip: (cardIndex: number, type: 'anagramFlashcard') => void,
    isFullscreen: boolean 
}) {
    const isTeacher = useTeacherMode();
    const getDynamicFontSize = (text: string) => {
        const baseSize = isTeacher ? 3.0 : (isFullscreen ? 2.0 : 1.5); 
        const maxLength = 8;
        if (text.length > maxLength) {
            const reductionFactor = Math.min(1.5, (text.length - maxLength) / 3);
            return `${Math.max(1.2, baseSize - reductionFactor)}rem`;
        }
        return `${baseSize}rem`;
    };

    return (
        <div className={cn("w-full p-4 flex flex-col justify-start", isTeacher ? "max-w-full pt-6" : "max-w-6xl mx-auto justify-center")}>
             <div className={cn("text-center mb-8", isTeacher ? "py-4" : "mb-8")}>
                 <h2 className={cn("font-black text-center text-slate-800 dark:text-white drop-shadow-sm uppercase tracking-wide", isTeacher ? "text-4xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"))}>{step.title}</h2>
             </div>
            <div className={cn("grid gap-6 pb-32", isTeacher ? "grid-cols-3 lg:grid-cols-4 gap-8" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5")}>
                {step.cards.map((card, index) => {
                    const theme = FLASHCARD_THEMES[index % FLASHCARD_THEMES.length];
                    return (
                        <div
                            key={index}
                            className={cn(
                                "rounded-3xl [perspective:1000px] cursor-pointer group hover:scale-105 transition-transform duration-300",
                                isTeacher ? "min-h-[14rem]" : (isFullscreen ? "min-h-[12rem]" : "min-h-[9rem]")
                            )}
                            onClick={() => onCardFlip(index, 'anagramFlashcard')}
                        >
                            <motion.div
                                className={cn(
                                    "relative w-full h-full text-center [transform-style:preserve-3d]"
                                )}
                                initial={false}
                                animate={{ rotateY: flippedCards.has(index) ? 180 : 0 }}
                                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                            >
                                {/* Front */}
                                <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-b-8 flex flex-wrap items-center justify-center p-4", theme.front)}>
                                    <h3 
                                        className="font-black tracking-[0.2em] break-all drop-shadow-md uppercase text-slate-900 dark:text-white"
                                        style={{ fontSize: getDynamicFontSize(card.scrambledWord) }}
                                    >
                                        {card.scrambledWord}
                                    </h3>
                                    {!isTeacher && (
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center bg-white/30 px-3 py-1 rounded-full shadow-sm border border-white/50 backdrop-blur-md">
                                            <span className="text-[8px] text-slate-900 dark:text-white uppercase tracking-[0.2em] font-extrabold">Çevir</span>
                                        </div>
                                    )}
                                </div>

                                {/* Back */}
                                <div className={cn(
                                    "absolute w-full h-full [backface-visibility:hidden] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-b-8 flex flex-wrap items-center justify-center p-4 break-words overflow-hidden",
                                    theme.back
                                )} style={{ transform: "rotateY(180deg)" }}>
                                    <h3 
                                        className="font-black break-all drop-shadow-lg uppercase tracking-wider text-white"
                                        style={{ fontSize: getDynamicFontSize(card.correctAnswer) }}
                                    >
                                        {card.correctAnswer}
                                    </h3>
                                </div>
                            </motion.div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// 6. FlashcardPlayer
function FlashcardPlayer({ step, flippedCards, onCardFlip, isFullscreen }: { 
    step: FlashcardStep, 
    flippedCards: Set<number>, 
    onCardFlip: (cardIndex: number, type: 'flashcard') => void,
    isFullscreen: boolean 
}) {
    const isTeacher = useTeacherMode();

    return (
        <div className={cn("w-full p-4 flex flex-col justify-start", isTeacher ? "max-w-full pt-6" : "max-w-6xl mx-auto justify-center")}>
            <div className={cn("text-center mb-8", isTeacher ? "py-4" : "mb-8")}>
                <h2 className={cn("font-black text-center text-slate-800 dark:text-white drop-shadow-sm uppercase tracking-wider", isTeacher ? "text-4xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"))}>{step.title}</h2>
            </div>
            <div className={cn("grid gap-8 pb-32", isTeacher ? "grid-cols-2 lg:grid-cols-3" : (isFullscreen ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"))}>
                {step.cards.map((card, index) => (
                    <FlashcardItem
                        key={index}
                        term={card.term}
                        definition={card.definition}
                        isFlipped={flippedCards.has(index)}
                        onFlip={() => onCardFlip(index, 'flashcard')}
                        theme={FLASHCARD_THEMES[index % FLASHCARD_THEMES.length]}
                        isFullscreen={isFullscreen}
                        isTeacher={isTeacher}
                    />
                ))}
            </div>
        </div>
    );
}

export const FlashcardItem = ({ term, definition, isFlipped, onFlip, theme, isFullscreen, isTeacher }: { term: string, definition: string, isFlipped: boolean, onFlip: () => void, theme: any, isFullscreen?: boolean, isTeacher?: boolean }) => {
    return (
        <div
            className={cn(
                "rounded-3xl [perspective:1000px] cursor-pointer group hover:scale-105 transition-transform duration-300",
                isTeacher ? "min-h-[20rem]" : "min-h-[12rem]"
            )}
            onClick={onFlip}
        >
            <motion.div
                className={cn(
                    "relative w-full h-full text-center [transform-style:preserve-3d]"
                )}
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            >
                {/* Front */}
                <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-3xl border shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-b-8 flex flex-col items-center justify-center p-6 transition-all", theme.front)}>
                    <h3 className={cn("font-black uppercase tracking-wider drop-shadow-md", isTeacher ? "text-5xl" : (isFullscreen ? "text-3xl" : "text-2xl md:text-3xl"))}>{term}</h3>
                    {!isTeacher && (
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-center bg-black/5 dark:bg-black/20 px-5 py-1.5 rounded-full border border-black/10 dark:border-white/20 backdrop-blur-md">
                            <span className="text-[9px] md:text-[11px] text-slate-500 dark:text-white/60 uppercase tracking-[0.3em] font-black">Dokun & Çevir</span>
                        </div>
                    )}
                </div>

                {/* Back */}
                <div className={cn(
                    "absolute w-full h-full [backface-visibility:hidden] rounded-3xl border shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-b-8 flex flex-col items-center justify-center p-8",
                    theme.back
                )} style={{ transform: "rotateY(180deg)" }}>
                    <p className={cn("font-bold leading-relaxed tracking-wide drop-shadow-md text-white", isTeacher ? "text-3xl" : (isFullscreen ? "text-xl" : "text-base md:text-lg"))}>{definition}</p>
                </div>
            </motion.div>
        </div>
    );
};

// 7. GÜNCELLENMİŞ AnagramGame
function AnagramGame({ step, onAnswer, answer, isAnswerRevealed, onCorrectAndNext, isTeacher, isFullscreen }: { step: AnagramStep, onAnswer: (answer: string) => void, answer: { answer: string, isCorrect: boolean } | null, isAnswerRevealed: boolean, onCorrectAndNext: () => void, isTeacher?: boolean, isFullscreen?: boolean }) {
    
    const targetWords = useMemo(() => step.correctAnswer.split(' '), [step.correctAnswer]);
    const targetStringClean = useMemo(() => step.correctAnswer.replace(/\s+/g, '').toLocaleUpperCase('tr-TR'), [step.correctAnswer]);

    const initialLetters = useMemo(() => 
        step.scrambledWord.toLocaleUpperCase('tr-TR').split('').map((letter, index) => ({ id: index, letter }))
    , [step.scrambledWord]);

    const [bankLetters, setBankLetters] = useState(initialLetters);
    const [constructedLetters, setConstructedLetters] = useState<(typeof initialLetters[0])[]>([]);
    const [shakingLetterId, setShakingLetterId] = useState<number | null>(null);

    const letterColors = [
        "bg-white dark:bg-white/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 hover:border-rose-400 dark:hover:border-rose-400/60",
        "bg-white dark:bg-white/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30 hover:border-orange-400 dark:hover:border-orange-400/60",
        "bg-white dark:bg-white/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 hover:border-amber-400 dark:hover:border-amber-400/60",
        "bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-400 dark:hover:border-emerald-400/60",
        "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 hover:border-cyan-400 dark:hover:border-cyan-400/60",
        "bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 hover:border-blue-400 dark:hover:border-blue-400/60",
        "bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-400 dark:hover:border-indigo-400/60",
        "bg-white dark:bg-white/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 hover:border-purple-400 dark:hover:border-purple-400/60",
    ];

    useEffect(() => {
        setBankLetters(step.scrambledWord.toLocaleUpperCase('tr-TR').split('').map((letter, index) => ({ id: index, letter })));
        setConstructedLetters([]);
        setShakingLetterId(null);
    }, [step]);
      
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
            <div className="bg-white/60 dark:bg-white/5 p-4 md:p-10 rounded-3xl border border-white dark:border-white/10 shadow-xl backdrop-blur-md w-full max-w-5xl text-center">
                 <p className={cn("font-bold italic text-slate-700 dark:text-slate-200", isTeacher ? "text-3xl leading-snug" : "text-lg md:text-2xl")}>"{step.definition}"</p>
            </div>
             
            {/* CEVAP ALANI */}
            <div className={cn(
                "flex flex-wrap justify-center items-center gap-x-4 gap-y-2 md:gap-x-8 md:gap-y-4 p-4 md:p-8 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-inner w-full max-w-6xl", 
                isTeacher ? "min-h-[12rem]" : "min-h-[8rem]"
            )}>
                {targetWords.map((word, wordIndex) => (
                    <div key={wordIndex} className="flex flex-nowrap gap-1 md:gap-2">
                        {word.split('').map((char, charIndex) => {
                            const letterObj = constructedLetters[globalCharIndex];
                            globalCharIndex++;

                            // DÜZELTME: Harf varsa veya cevap gösteriliyorsa kart görünür olmalı
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
                                                "bg-white dark:bg-white/10 active:translate-y-1 active:border-b-0",
                                                // Cevap açıldıysa YEŞİL, değilse İNDİGO
                                                isAnswerRevealed 
                                                    ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30" 
                                                    : "text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30"
                                              )
                                            : "bg-slate-200/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-transparent border-dashed border-2"
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
                                    "font-black border-b-4 active:border-b-0 active:translate-y-1 transition-all duration-100 shadow-lg",
                                    colorClass,
                                    isTeacher ? "h-20 w-16 text-4xl rounded-2xl border-b-8" : "h-12 w-10 text-xl md:h-16 md:w-14 md:text-3xl md:border-b-8",
                                    shakingLetterId === item.id && "animate-shake bg-red-500 border-red-700 text-slate-900 dark:text-white hover:bg-red-600 !bg-none"
                                )}
                            >
                                {item.letter}
                            </Button>
                        )
                    })}
                </div>
            ) : (
                 <div className="text-center mt-6 animate-in slide-in-from-bottom-4">
                    <Button onClick={onCorrectAndNext} className={cn("font-bold text-slate-900 dark:text-white transition-all transform hover:scale-105 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200/50 shadow-lg", isTeacher ? "h-16 px-10 text-xl rounded-2xl" : "h-12 px-6 text-lg rounded-xl")}>
                        Harika! Sonraki <ArrowRight className="ml-3 h-5 w-5"/>
                    </Button>
                 </div>
            )}
        </div>
    );
};

// 7.1 AnagramGamePlayer
function AnagramGamePlayer({ step, onAnswered, isTeacher, isFullscreen }: { step: AnagramGameStep, onAnswered: () => void, isTeacher: boolean, isFullscreen: boolean }) {
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
                step={{...currentCard, title: step.title}} 
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

// 8. SentenceScrambleGame (GÜNCELLENDİ: BİTİŞ KONTROLÜ)
function SentenceScrambleGame({ step, onAnswer, onCorrectAndNext, answer, isAnswerRevealed }: { step: SentenceScrambleStep, onAnswer: (answer: string) => void, onCorrectAndNext: () => void, answer?: { answer: string, isCorrect: boolean } | null, isAnswerRevealed: boolean }) {
    const isTeacher = useTeacherMode();
    const initialWords = useMemo(() => step.scrambledSentence.split(' ').map((word, index) => ({ id: index, word })), [step.scrambledSentence]);
    const [bankWords, setBankWords] = useState(initialWords);
    const [constructedWords, setConstructedWords] = useState<(typeof initialWords[0])[]>([]);
    const [mistakenWordId, setMistakenWordId] = useState<number | null>(null);

    const wordColors = [
        'bg-rose-50 dark:bg-rose-950 text-rose-100 border-rose-500 shadow-md hover:bg-rose-900',
        'bg-cyan-50 dark:bg-cyan-950 text-cyan-100 border-cyan-500 shadow-md hover:bg-cyan-900',
        'bg-emerald-50 dark:bg-emerald-950 text-emerald-100 border-emerald-500 shadow-md hover:bg-emerald-900',
        'bg-amber-50 dark:bg-amber-950 text-amber-100 border-amber-500 shadow-md hover:bg-amber-900',
        'bg-violet-50 dark:bg-violet-950 text-violet-100 border-violet-500 shadow-md hover:bg-violet-900',
        'bg-sky-50 dark:bg-sky-950 text-sky-100 border-sky-500 shadow-md hover:bg-sky-900',
    ];

    useEffect(() => {
        setBankWords(step.scrambledSentence.split(' ').map((word, index) => ({ id: index, word })));
        setConstructedWords([]);
        setMistakenWordId(null);
    }, [step]);

    const handleWordClick = (clickedWord: typeof initialWords[0]) => {
        if (isAnswerRevealed || mistakenWordId !== null) return;
        const correctWordArray = step.correctSentence.split(' ');
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
            const timeoutId = setTimeout(() => { onCorrectAndNext(); }, 1500); // Süre biraz uzatıldı
            return () => clearTimeout(timeoutId);
        }
    }, [answer, onCorrectAndNext]);

    return (
        <div className={cn("w-full mx-auto flex flex-col justify-center min-h-[60vh] gap-4 md:gap-6 p-4 text-center", isTeacher ? "max-w-6xl pt-10" : "max-w-4xl")}>
            <div className="text-center">
                <p className={cn("text-slate-200 font-bold bg-[#161233] px-5 py-2 rounded-full inline-block border border-slate-200 dark:border-white/10 shadow-lg", isTeacher ? "text-2xl" : "text-sm md:text-base")}>
                    Kelimeleri doğru sıraya dizerek cümleyi oluşturun.
                </p>
            </div>
             
             <div className={cn("relative flex flex-wrap justify-center content-center gap-2 md:gap-5 bg-[#070514] border-2 border-[#2b245e] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] p-4 md:p-10 rounded-3xl", isTeacher ? "min-h-[12rem]" : "min-h-[7rem] md:min-h-[12rem]")}>
                {constructedWords.map((wordObj, i) => (
                    <div 
                        key={wordObj.id} 
                        className={cn(
                            "rounded-xl md:rounded-2xl font-black animate-in zoom-in duration-300 border-b-2 md:border-b-[6px]",
                            wordColors[wordObj.id % wordColors.length], 
                            isTeacher ? "text-2xl px-6 py-3 border-b-[6px]" : "px-3 py-1.5 md:px-8 md:py-4 md:text-2xl text-sm"
                        )}
                    >
                        {wordObj.word}
                    </div>
                ))}
                {constructedWords.length === 0 && <span className={cn("text-slate-500 font-medium italic absolute", isTeacher ? "text-xl" : "text-sm md:text-xl")}>Cümleniz burada görünecek...</span>}
            </div>

            {isAnswerRevealed ? (
                 <div className="text-center mt-6 md:mt-10 animate-in slide-in-from-bottom-4">
                    <div className={cn("inline-flex items-center gap-3 md:gap-4 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.3)]", isTeacher ? "px-8 py-4" : "px-6 py-2.5 md:px-8 md:py-4")}>
                        <CheckCircle2 className={cn(isTeacher ? "h-10 w-10" : "h-5 w-5 md:h-6 w-6")}/>
                        <span className={cn("font-black", isTeacher ? "text-2xl" : "text-sm md:text-lg")}>Harika, doğru cümle!</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-2">
                    {bankWords.map((item, index) => (
                        <div
                            key={item.id}
                            onClick={() => handleWordClick(item)}
                            className={cn(
                                "font-black rounded-xl md:rounded-[1.25rem] transition-all duration-200 border-b-[3px] md:border-b-[8px] active:border-b-0 active:translate-y-1 md:active:translate-y-2 cursor-pointer flex items-center justify-center hover:-translate-y-0.5 md:hover:-translate-y-1",
                                wordColors[item.id % wordColors.length],
                                isTeacher ? "text-2xl h-16 px-6" : "text-sm h-10 px-4 md:text-3xl md:h-20 md:px-10",
                                mistakenWordId === item.id && "animate-shake bg-rose-500 border-rose-700 text-slate-900 dark:text-white shadow-none hover:bg-rose-500 hover:border-rose-700"
                            )}
                        >
                            {mistakenWordId === item.id && <X className={cn("mr-1.5", isTeacher ? "h-8 w-8" : "h-4 w-4 md:h-6 md:w-6")} />}
                            {item.word}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// 9. HtmlSlidePlayer
function HtmlSlidePlayer({ step, onSlideScrolledToEnd }: { step: HtmlSlideStep, onSlideScrolledToEnd: () => void }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
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
        <div className="w-full h-full bg-white overflow-hidden">
            <iframe 
                ref={iframeRef} 
                srcDoc={step.htmlContent} 
                className="w-full h-full border-0" 
                title={step.title} 
                sandbox="allow-scripts allow-same-origin"
                style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
            />
        </div>
    );
}

// 10. DrawingCanvas (YENİ NESİL ÇİZİM & AKILLI TAHTA ARACI)
function DrawingCanvas({ stepIndex }: { stepIndex?: number }) {
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
function ConceptMapPlayer({ step, isFullscreen }: { step: ConceptMapStep, isFullscreen: boolean }) {
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

// --- ANA BİLEŞEN: StepContent ---

export function StepContent({ 
    step, answer, onAnswer, onCorrectAndNext, stepAnswers, topic, courseId, unitId, courseTitle, unitTitle, isFullscreen, 
    revealedSentencesCount, flippedCards, flippedAnagramCards, onCardFlip, onSlideScrolledToEnd, onMultiAnswer, onAllTfAnswered,
    onAnimationStart, onAnimationEnd,
    isVisualMaximized,
    onToggleVisualMaximize,
    isSingleCardMode,
    animationSpeed = 'normal',
    fontSizeScale = 'normal'
}: any) {
    const isTeacher = useTeacherMode();

    const renderContent = () => {
        if(step.isPublished === false && !isTeacher) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50 text-slate-800">
                    <Lock className="h-16 w-16 text-slate-600 dark:text-slate-400 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Bu İçerik Henüz Aktif Değil</h2>
                    <p className="text-slate-500">Bu adım henüz öğretmeniniz tarafından yayınlanmadı.</p>
                </div>
            );
        }
        
        switch (step.type) {
            case 'content':
            case 'objectiveList':
            case 'accordion':
                 return <ContentListPlayer step={step} revealedSentencesCount={revealedSentencesCount} isFullscreen={isFullscreen} onAnimationStart={onAnimationStart} onAnimationEnd={onAnimationEnd} isSingleCardMode={isSingleCardMode} animationSpeed={animationSpeed} fontSizeScale={fontSizeScale} />
            case 'conceptExplanation': {
                return <ConceptExplanationPlayer items={step.items} isFullscreen={isFullscreen} title={step.title} isSingleCardMode={isSingleCardMode} fontSizeScale={fontSizeScale} />
            }
            case 'visual':
                return (
                      <div className="w-full h-full p-0 md:p-2">
                        <VisualPlayer 
                            step={step as VisualStep} 
                            isMaximized={isVisualMaximized} 
                            onToggleMaximize={onToggleVisualMaximize}
                        />
                      </div>
                );
            case 'iframe':
                 return <div className="h-full p-4"><iframe src={(step as IframeStep).url} title={step.title} className={cn("w-full border-0 rounded-3xl shadow-xl bg-white border border-slate-200", "h-full")} allowFullScreen></iframe></div>
            
            case 'htmlSlide':
                 return <HtmlSlidePlayer step={step} onSlideScrolledToEnd={onSlideScrolledToEnd} />
            
            case 'activityLink':
                const activityStep = step as ActivityLinkStep;
                const params = new URLSearchParams({
                    courseId: activityStep.courseId || courseId,
                    unitId: activityStep.unitId || unitId,
                    topicId: activityStep.topicId || topic.id,
                    courseName: courseTitle,
                    unitName: unitTitle,
                    topicName: topic.title,
                    embedded: 'true', 
                    autoStart: 'true'
                });
                const activityUrl = `${activityStep.activityType}?${params.toString()}`;
                return (
                    <div className="absolute inset-0 w-full h-full z-40 bg-slate-50">
                          <iframe
                             src={activityUrl}
                             title={activityStep.activityLabel}
                             className="w-full h-full border-0 bg-white"
                             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                             allowFullScreen
                             loading="lazy"
                          />
                    </div>
                );

            case 'flashcard':
                return <FlashcardPlayer step={step as FlashcardStep} flippedCards={flippedCards} onCardFlip={onCardFlip} isFullscreen={isFullscreen} />;
            case 'anagramFlashcard':
                return <AnagramFlashcardPlayer step={step as AnagramFlashcardStep} flippedCards={flippedAnagramCards} onCardFlip={onCardFlip} isFullscreen={isFullscreen} />;
            case 'trueFalseList':
                 return <InteractiveTrueFalseList step={step as TrueFalseListStep} isFullscreen={isFullscreen || false} answers={stepAnswers || {}} onAnswer={onMultiAnswer} onAllAnswered={onAllTfAnswered} fontSizeScale={fontSizeScale} />;
            case 'conceptMap':
                 return <ConceptMapPlayer step={step as ConceptMapStep} isFullscreen={isFullscreen} />; 
            case 'video': {
                const videoStep = step as VideoStep;
                const embedUrl = getEmbedUrl(videoStep.url);
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                        <div className={cn("w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black", isTeacher ? "max-w-5xl" : "max-w-6xl")}>
                            <iframe 
                                src={embedUrl} 
                                title={videoStep.title} 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen 
                                className="w-full h-full"
                            ></iframe>
                        </div>
                         {videoStep.description && <p className={cn("mt-6 text-center text-slate-600 font-medium max-w-5xl", isTeacher ? "text-3xl" : "text-lg")}>{videoStep.description}</p>}
                    </div>
                );
            }
            case 'mcq': {
                const mcqStep = step as McqStep;
                const optionColors = [
                    'border-2 border-sky-300 bg-sky-50/90 hover:bg-sky-100 text-sky-950 shadow-md shadow-sky-100/50',
                    'border-2 border-purple-300 bg-purple-50/90 hover:bg-purple-100 text-purple-950 shadow-md shadow-purple-100/50',
                    'border-2 border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-950 shadow-md shadow-amber-100/50',
                    'border-2 border-rose-300 bg-rose-50/90 hover:bg-rose-100 text-rose-950 shadow-md shadow-rose-100/50'
                ];
                const badgeColors = [
                    'bg-sky-500 text-white',
                    'bg-purple-500 text-white',
                    'bg-amber-500 text-white',
                    'bg-rose-500 text-white'
                ];
                return (
                    <div className={cn("w-full mx-auto flex flex-col justify-center min-h-[60vh] p-4", isTeacher ? "max-w-full pt-8" : "max-w-3xl")}>
                        {/* Soru Kutusu */}
                        <div className={cn("relative rounded-3xl border-2 border-indigo-200 bg-white/95 backdrop-blur-2xl mb-4 md:mb-6 text-center overflow-hidden shadow-xl shadow-indigo-100/60", isTeacher ? "p-8" : "p-4 md:p-8")}>
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                            <h3 className={cn("font-black text-slate-900 leading-relaxed", isTeacher ? "text-4xl" : (isFullscreen ? "text-xl md:text-2xl" : "text-base md:text-2xl"))}>{mcqStep.question}</h3>
                        </div>
                        {/* Şıklar */}
                        <div className={cn("grid gap-3", isTeacher ? "grid-cols-2 gap-5" : "grid-cols-1")}>
                            {mcqStep.options.map((option, index) => {
                                const isCorrect = option === mcqStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                const colorClass = optionColors[index % optionColors.length];
                                const badgeClass = badgeColors[index % badgeColors.length];

                                return (
                                    <motion.div
                                        key={index}
                                        whileHover={!answer ? { scale: 1.02, y: -2 } : {}}
                                        whileTap={!answer ? { scale: 0.98 } : {}}
                                        className={cn("w-full h-full", answer && isSelected && !isCorrect && "animate-shake")}
                                    >
                                        <Button
                                            variant="default"
                                            className={cn(
                                                "w-full h-auto justify-start text-left whitespace-normal rounded-2xl border-2 transition-all duration-300 backdrop-blur-md shadow-md",
                                                "font-bold",
                                                isTeacher ? "text-2xl p-6" : (isFullscreen ? "p-4 text-sm md:p-5 md:text-lg" : "p-3 text-[13px] md:p-5 md:text-base"),
                                                !answer ? colorClass : "",
                                                answer && isCorrect ? "bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-500/30" : "",
                                                answer && isSelected && !isCorrect ? "bg-rose-500 border-rose-400 text-white shadow-xl shadow-rose-500/30" : "",
                                                answer && !isSelected && !isCorrect ? "bg-slate-100 border-slate-200 text-slate-400 opacity-40" : ""
                                            )}
                                            onClick={() => onAnswer(option)}
                                            disabled={!!answer}
                                        >
                                            <span className={cn(
                                                "flex shrink-0 items-center justify-center rounded-lg md:rounded-xl font-black border mr-3 md:mr-4 shadow-sm",
                                                isTeacher ? "h-12 w-12 text-xl" : "h-6 w-6 text-xs md:h-8 md:w-8 md:text-sm",
                                                !answer ? badgeClass : "bg-white/20 text-white border-white/40"
                                            )}>
                                                {String.fromCharCode(65 + index)}
                                            </span>
                                            <span className="flex-1">{option}</span>
                                        </Button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
            case 'tf': {
                const tfStep = step as TfStep;
                const correctOption = tfStep.isTrue ? "Doğru" : "Yanlış";
                return (
                    <div className={cn("w-full mx-auto flex flex-col justify-center min-h-[60vh] p-4 text-center", isTeacher ? "max-w-5xl pt-10" : "max-w-4xl")}>
                        {/* İfade Kutusu */}
                        <div className={cn(
                            "relative rounded-3xl border-2 border-purple-200 bg-white/95 backdrop-blur-2xl mb-6 md:mb-8 overflow-hidden shadow-xl shadow-purple-100/60",
                            isTeacher ? "p-10" : "p-4 md:p-10"
                        )}>
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
                            <h3 className={cn("font-black text-slate-900 leading-relaxed", isTeacher ? "text-5xl" : (isFullscreen ? "text-lg md:text-2xl" : "text-base md:text-2xl"))}>{tfStep.statement}</h3>
                        </div>
                        <div className="flex gap-5 justify-center">
                            {["Doğru", "Yanlış"].map((option) => {
                                const isSelected = answer?.answer === option;
                                const isCorrect = option === correctOption;
                                const isTrue = option === "Doğru";
                                return (
                                    <motion.div
                                        key={option}
                                        whileHover={!answer ? { scale: 1.06, y: -4 } : {}}
                                        whileTap={!answer ? { scale: 0.94 } : {}}
                                        className={cn(answer && isSelected && !isCorrect && "animate-shake")}
                                    >
                                        <Button
                                            className={cn(
                                                "font-black rounded-3xl transition-all duration-300 border-2 border-b-[6px] active:border-b-0 active:translate-y-1 shadow-xl",
                                                isTeacher ? "h-36 w-56 text-3xl" : "h-20 w-28 text-lg md:h-32 md:w-48 md:text-2xl",
                                                !answer && isTrue && "bg-emerald-500 hover:bg-emerald-600 border-emerald-400 border-b-emerald-700 text-white shadow-lg shadow-emerald-500/25",
                                                !answer && !isTrue && "bg-rose-500 hover:bg-rose-600 border-rose-400 border-b-rose-700 text-white shadow-lg shadow-rose-500/25",
                                                answer && isCorrect && "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_35px_rgba(16,185,129,0.7)]",
                                                answer && isSelected && !isCorrect && "bg-rose-500 border-rose-400 text-white shadow-[0_0_30px_rgba(244,63,94,0.6)]",
                                                answer && !isSelected && !isCorrect && "opacity-20 grayscale border-slate-200"
                                            )}
                                            onClick={() => onAnswer(option)}
                                            disabled={!!answer}
                                        >
                                                <div className="flex flex-col items-center gap-2 md:gap-4">
                                                    {option === "Doğru" ? <CheckCircle className={cn(isTeacher ? "h-12 w-12" : "h-6 w-6 md:h-8 md:w-8")}/> : <XCircle className={cn(isTeacher ? "h-12 w-12" : "h-6 w-6 md:h-8 md:w-8")}/>}
                                                    {option}
                                                </div>
                                        </Button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
            case 'fitb': {
                const fitbStep = step as FitbStep;
                const optionColors = [
                    'border-2 border-cyan-300 bg-cyan-50/90 hover:bg-cyan-100 text-cyan-950 shadow-md shadow-cyan-100/50',
                    'border-2 border-purple-300 bg-purple-50/90 hover:bg-purple-100 text-purple-950 shadow-md shadow-purple-100/50',
                    'border-2 border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-950 shadow-md shadow-amber-100/50',
                    'border-2 border-rose-300 bg-rose-50/90 hover:bg-rose-100 text-rose-950 shadow-md shadow-rose-100/50'
                ];
                const badgeColors = [
                    'bg-cyan-500 text-white',
                    'bg-purple-500 text-white',
                    'bg-amber-500 text-white',
                    'bg-rose-500 text-white'
                ];
                return (
                    <div className={cn("w-full mx-auto flex flex-col justify-center min-h-[60vh] p-4 text-center", isTeacher ? "max-w-6xl pt-10" : "max-w-5xl")}>
                        <div className={cn("relative rounded-3xl border-2 border-amber-200 bg-white/95 backdrop-blur-2xl mb-6 md:mb-8 text-center overflow-hidden shadow-xl shadow-amber-100/60", isTeacher ? "p-10" : "p-4 md:p-10")}>
                             <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                          <h3 className={cn("font-black text-slate-900 leading-relaxed tracking-wide", isTeacher ? "text-5xl" : (isFullscreen ? "text-xl md:text-2xl" : "text-base md:text-2xl"))}>{fitbStep.sentenceWithBlank?.replace('___', '________')}</h3>
                        </div>
                        <div className={cn("grid gap-3", isTeacher ? "grid-cols-2 gap-5" : "grid-cols-1 sm:grid-cols-2")}>
                            {(fitbStep.options || []).map((option, index) => {
                                const isCorrect = option === fitbStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                const colorClass = optionColors[index % optionColors.length];
                                const badgeClass = badgeColors[index % badgeColors.length];
                                
                                return (
                                    <motion.div
                                        key={index}
                                        whileHover={!answer ? { scale: 1.02, y: -2 } : {}}
                                        whileTap={!answer ? { scale: 0.98 } : {}}
                                        className={cn("w-full h-full", answer && isSelected && !isCorrect && "animate-shake")}
                                    >
                                        <Button
                                            variant="default"
                                            className={cn(
                                                "w-full h-auto justify-start text-left whitespace-normal rounded-2xl border-2 transition-all duration-300 backdrop-blur-md shadow-md",
                                                "font-bold",
                                                isTeacher ? "text-2xl p-6" : (isFullscreen ? "p-4 text-sm md:p-5 md:text-lg" : "p-3 text-[13px] md:p-5 md:text-base"),
                                                !answer ? colorClass : "",
                                                answer && isCorrect ? "bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-500/30" : "",
                                                answer && isSelected && !isCorrect ? "bg-rose-500 border-rose-400 text-white shadow-xl shadow-rose-500/30" : "",
                                                answer && !isSelected && !isCorrect ? "bg-slate-100 border-slate-200 text-slate-400 opacity-40" : ""
                                            )}
                                            onClick={() => onAnswer(option)}
                                            disabled={!!answer}
                                        >
                                            <span className={cn(
                                                "flex shrink-0 items-center justify-center rounded-lg md:rounded-xl font-black border mr-3 md:mr-4 shadow-sm",
                                                isTeacher ? "h-12 w-12 text-xl" : "h-6 w-6 text-xs md:h-8 md:w-8 md:text-sm",
                                                !answer ? badgeClass : "bg-white/20 text-white border-white/40"
                                            )}>
                                                {String.fromCharCode(65 + index)}
                                            </span>
                                            <span className="flex-1">{option}</span>
                                        </Button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
            case 'anagram': 
                return <AnagramGame step={step as AnagramStep} onAnswer={onAnswer} answer={answer} isAnswerRevealed={!!answer} onCorrectAndNext={onCorrectAndNext} isTeacher={isTeacher} isFullscreen={isFullscreen} />;
            
            case 'anagramGame': 
            case 'kelimeDahasi': 
                 return <AnagramGamePlayer step={step as AnagramGameStep} onAnswered={onCorrectAndNext} isTeacher={isTeacher} isFullscreen={isFullscreen} />;

            case 'sentenceScramble': 
                return <SentenceScrambleGame step={step as SentenceScrambleStep} onAnswer={onAnswer} onCorrectAndNext={onCorrectAndNext} answer={answer} isAnswerRevealed={!!answer} />;
            
            default: 
                // Bilinmeyen tip gelirse beyaz ekran yerine uyarı basar
                return (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50 text-slate-800">
                        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">İçerik Tipi Tanınamadı</h2>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 font-mono text-sm text-slate-600 shadow-sm">
                             Gelen Tip: <span className="text-rose-500 font-bold">"{step.type}"</span>
                        </div>
                    </div>
                );
        }
    }

    return (
        <div className="relative w-full h-full">
            {renderContent()}
        </div>
    );
}

// --- ANA EKRAN: LessonContentViewer ---

export function LessonContentViewer({
    topic,
    courseId,
    unitId,
    courseTitle,
    unitTitle,
    onTopicComplete,
    progress,
    onProgressUpdate,
    isFullscreen,
    completeButtonText, 
    onMultiAnswer,
    onAllTfAnswered,
    isSingleCardMode,
    animationSpeed = 'normal',
    fontSizeScale = 'normal',
    jumpToStep,
    onJumpDone,
    onStepIndexChange
}: LessonContentViewerProps) {
    const { user } = useAuth();
    const isTeacher = useTeacherMode();
    const { toast } = useToast();
      
    const [isAnimating, setIsAnimating] = useState(false);
    const [revealedSentencesCount, setRevealedSentencesCount] = useState(1);
    const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
    const [flippedAnagramCards, setFlippedAnagramCards] = useState<Set<number>>(new Set());
    const [internalProgress, setInternalProgress] = useState<LocalProgress>(() => ({ answers: {}, score: 0 }));
    
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const [isFinished, setIsFinished] = useState(false);
    
    const [isVisualMaximized, setIsVisualMaximized] = useState(false);
      
    const [showResumeDialog, setShowResumeDialog] = useState(false);
    const [savedStepIndex, setSavedStepIndex] = useState<number | null>(null);
    const [hideUI, setHideUI] = useState(false); // UI Gizleme State'i

    // Steps ve CurrentStep tanımları
    const steps = useMemo(() => {
        if (!topic) return [];
        return topic.steps?.filter(s => (s.isPublished ?? true) || isTeacher) || [];
    }, [topic, isTeacher]);

    const onStepIndexChangeRef = useRef(onStepIndexChange);
    useEffect(() => {
        onStepIndexChangeRef.current = onStepIndexChange;
    }, [onStepIndexChange]);

    // Jump to Step command from parent
    useEffect(() => {
        if (typeof jumpToStep === 'number' && jumpToStep >= 0 && jumpToStep < steps.length && jumpToStep !== currentStepIndex) {
            setDirection(jumpToStep > currentStepIndex ? 1 : -1);
            setCurrentStepIndex(jumpToStep);
            onJumpDone?.();
        }
    }, [jumpToStep, steps.length, currentStepIndex, onJumpDone]);

    // Notify parent only when step index or total steps count actually change
    const prevNotifiedRef = useRef<{ index: number; total: number }>({ index: -1, total: -1 });
    useEffect(() => {
        if (prevNotifiedRef.current.index !== currentStepIndex || prevNotifiedRef.current.total !== steps.length) {
            prevNotifiedRef.current = { index: currentStepIndex, total: steps.length };
            onStepIndexChangeRef.current?.(currentStepIndex, steps.length);
        }
    }, [currentStepIndex, steps.length]);

    const currentStep = useMemo(() => steps[currentStepIndex], [steps, currentStepIndex]);

    // Görsel veya HTML Slide adımı mı?
    const isImmersiveStep = ['visual', 'htmlSlide'].includes(currentStep?.type || '');
    const isHtmlSlideStep = currentStep?.type === 'htmlSlide';

    useEffect(() => {
        if (currentStep?.type === 'visual') {
            setIsVisualMaximized(true);
        } else if (isVisualMaximized) {
            setIsVisualMaximized(false);
        }
    }, [currentStep, isVisualMaximized]);

    // Resume Dialog Mantığı
    useEffect(() => {
        if (topic) {
            const storageKey = `lesson_progress_${user?.uid || 'guest'}_${topic.id}`;
            const savedData = localStorage.getItem(storageKey);
              
            if (savedData) {
                const savedIndex = parseInt(savedData);
                if (!isNaN(savedIndex) && savedIndex > 0 && savedIndex < steps.length) {
                    setSavedStepIndex(savedIndex);
                    setShowResumeDialog(true);
                } else {
                    setCurrentStepIndex(0);
                }
            } else {
                setCurrentStepIndex(0);
            }

            setInternalProgress({ answers: {}, score: 0 });
            setIsFinished(false);
            setRevealedSentencesCount(1);
            setFlippedCards(new Set());
            setFlippedAnagramCards(new Set());
            setIsAnimating(false);
            setIsVisualMaximized(false);
        }
    }, [topic, user?.uid, steps.length]);

    useEffect(() => {
        if (topic && currentStepIndex > 0) {
            const storageKey = `lesson_progress_${user?.uid || 'guest'}_${topic.id}`;
            localStorage.setItem(storageKey, currentStepIndex.toString());
        }
    }, [currentStepIndex, topic, user?.uid]);

    // UI Gizleme/Gösterme Efekti: Her adım değişiminde GÖRÜNÜR yap
    useEffect(() => {
        setHideUI(false); 
    }, [currentStepIndex]);

    const handleResume = () => {
        if (savedStepIndex !== null) {
            setCurrentStepIndex(savedStepIndex);
        }
        setShowResumeDialog(false);
    };

    const handleRestart = () => {
        setCurrentStepIndex(0);
        if (topic) {
            const storageKey = `lesson_progress_${user?.uid || 'guest'}_${topic.id}`;
            localStorage.removeItem(storageKey);
        }
        setShowResumeDialog(false);
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'ACTIVITY_COMPLETED') {
                const { score, passed } = event.data;
                if (passed) {
                    const currentAnswers = internalProgress.answers[currentStepIndex] || {};
                    if (!currentAnswers.completed) {
                        const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { completed: true, score: score } };
                        // BURADA DEĞİŞİKLİK YAPILDI: Eğer dışarıdan score gelmiyorsa varsayılan olarak 100 ekle
                        setInternalProgress(prev => ({ score: prev.score + (score > 0 ? score : 100), answers: newAnswers }));
                        toast({ title: "Tebrikler!", description: `Puanın: ${score}`, className: "bg-green-500 border-none text-slate-900 dark:text-white" });
                        playSound('win');
                    }
                } else {
                    toast({ title: "Tekrar Dene", description: `Henüz yeterli puana ulaşamadın.`, variant: "destructive" });
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [currentStepIndex, internalProgress, toast]);

    useEffect(() => { if (topic) onProgressUpdate(topic.id, internalProgress); }, [internalProgress, onProgressUpdate, topic]);

    // --- KONTROL MANTIĞI ---
    const isActivityStep = currentStep?.type === 'activityLink';
    
    const isFullWidthStep = isActivityStep || isHtmlSlideStep || (currentStep?.type === 'visual' && isVisualMaximized);
      
    const isStepCompleted = internalProgress.answers[currentStepIndex]?.completed;

    const isNextButtonEnabled = useMemo(() => {
        if (!currentStep) return false;
        
        if (isTeacher) return true;

        if (isHtmlSlideStep) return true;
        if (isActivityStep) return !!isStepCompleted;

        const isPassiveStep = ['visual', 'iframe', 'conceptMap', 'video', 'conceptExplanation'].includes(currentStep.type);
        if (isPassiveStep) return true;

        if (['content', 'objectiveList', 'accordion'].includes(currentStep.type)) return true; 

        const isCardStep = ['flashcard', 'anagramFlashcard'].includes(currentStep.type);
        if (isCardStep) {
            const cards = (currentStep as FlashcardStep | AnagramFlashcardStep).cards;
            const cardSet = currentStep.type === 'flashcard' ? flippedCards : flippedAnagramCards;
            return cardSet.size === cards.length;
        }

        const answer = internalProgress.answers[currentStepIndex];
        if (currentStep.type === 'trueFalseList') return !!answer?.completed;

        return answer !== undefined && answer !== null;

    }, [currentStep, internalProgress.answers, currentStepIndex, flippedCards, flippedAnagramCards, isTeacher, isActivityStep, isHtmlSlideStep, isStepCompleted]);

    const handleNext = useCallback(() => {
        if (!currentStep) return;
          
        if (currentStepIndex === steps.length - 1) {
             if (topic) {
                const storageKey = `lesson_progress_${user?.uid || 'guest'}_${topic.id}`;
                localStorage.removeItem(storageKey);
            }
        }

        if (['visual', 'iframe', 'conceptMap', 'video', 'conceptExplanation', 'htmlSlide'].includes(currentStep.type)) {
            if (internalProgress.answers[currentStepIndex] === undefined) {
                const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { completed: true } };
                setInternalProgress(prev => ({...prev, answers: newAnswers }));
            }
        }
        
        if (currentStepIndex < steps.length - 1) {
            setDirection(1);
            setCurrentStepIndex(currentStepIndex + 1);
            setRevealedSentencesCount(1);
            setFlippedCards(new Set());
            setFlippedAnagramCards(new Set());
            setIsAnimating(false);
            setIsVisualMaximized(false); 
        } else {
            const finalScore = internalProgress.score + 10000;
            setInternalProgress(prev => ({ ...prev, score: finalScore }));
            setIsFinished(true);
            playSound('win');
            onTopicComplete(topic!.id, finalScore);
        }
    }, [currentStep, currentStepIndex, steps.length, internalProgress, onTopicComplete, topic, user?.uid]);

    const handleAnswer = (answer: string | boolean) => {
        if (internalProgress.answers[currentStepIndex] !== undefined) return;
        let isCorrect = false;
        let points = 0;
        // BURADA DEĞİŞİKLİKLER YAPILDI: Tüm puanlar 100'e sabitlendi
        if (currentStep.type === 'mcq' || currentStep.type === 'fitb') {
            isCorrect = answer === (currentStep as McqStep).correctAnswer;
            points = isCorrect ? 100 : 0;
        } else if (currentStep.type === 'tf') {
            isCorrect = (answer === "Doğru") === (currentStep as TfStep).isTrue;
            points = isCorrect ? 100 : 0;
        } else if (currentStep.type === 'anagram') {
            isCorrect = (answer as string).toLocaleUpperCase('tr-TR') === (currentStep as AnagramStep).correctAnswer.toLocaleUpperCase('tr-TR');
            points = isCorrect ? 100 : 0;
        } else if (currentStep.type === 'sentenceScramble') {
             isCorrect = (answer as string) === (currentStep as SentenceScrambleStep).correctSentence;
             points = isCorrect ? 100 : 0;
        }
        if (isCorrect) {
            playSound('correct');
            import('canvas-confetti').then((confettiModule) => {
                const confetti = confettiModule.default;
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#10B981', '#FBBF24', '#3B82F6', '#8B5CF6'],
                    zIndex: 9999
                });
            }).catch(err => console.error("Confetti error:", err));
        } else {
            playSound('incorrect');
        }
        const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { answer, isCorrect } };
        const newScore = internalProgress.score + points;
        setInternalProgress({ answers: newAnswers, score: newScore });
    };

    const handleCardFlip = useCallback((cardIndex: number, type: 'flashcard' | 'anagramFlashcard') => {
        playSound('pop'); 
        const cardSet = type === 'flashcard' ? flippedCards : flippedAnagramCards;
        const setCardSet = type === 'flashcard' ? setFlippedCards : setFlippedAnagramCards;
        const currentStepTyped = currentStep as FlashcardStep | AnagramFlashcardStep;
        const totalCards = currentStepTyped.cards.length;
        const newSet = new Set(cardSet);
        if (newSet.has(cardIndex)) newSet.delete(cardIndex);
        else newSet.add(cardIndex);
        setCardSet(newSet);
        const isAllFlipped = newSet.size === totalCards;
        if(isAllFlipped && internalProgress.answers[currentStepIndex] === undefined) {
             const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { completed: true } };
            setInternalProgress(prev => ({ ...prev, answers: newAnswers }));
        }
    }, [currentStep, flippedCards, flippedAnagramCards, internalProgress, currentStepIndex]);

    const handleSlideScrolledToEnd = useCallback(() => {
        if (internalProgress.answers && internalProgress.answers[currentStepIndex] === undefined) {
            const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { completed: true } };
            setInternalProgress(prev => ({ ...prev, answers: newAnswers }));
        }
    }, [currentStepIndex, internalProgress]);

    const handlePrev = () => { 
        if(currentStepIndex > 0) {
            setDirection(-1);
            setCurrentStepIndex(prev => prev - 1); 
        }
    };

    const handleLocalMultiAnswer = (questionIndex: number, selectedAnswer: boolean) => {
        if (!currentStep || currentStep.type !== 'trueFalseList') return;
        const existingAnswers = internalProgress.answers[currentStepIndex] || {};
        if (existingAnswers[questionIndex] !== undefined) return;
        const question = (currentStep as any).questions[questionIndex];
        const isCorrect = selectedAnswer === question.isTrue;
        if (isCorrect) playSound('correct'); else playSound('incorrect');
        const newAnswersForStep = { ...existingAnswers, [questionIndex]: { answer: selectedAnswer, isCorrect } };
        setInternalProgress(prev => ({ ...prev, answers: { ...prev.answers, [currentStepIndex]: newAnswersForStep }}));
    };
      
    const handleLocalAllTfAnswered = () => {
        if (!currentStep || currentStep.type !== 'trueFalseList') return;
        const answersForStep = internalProgress.answers[currentStepIndex];
        const correctCount = Object.values(answersForStep || {}).filter((a: any) => a.isCorrect).length;
        const points = correctCount * 100;
        const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { ...answersForStep, completed: true } };
        setInternalProgress(prev => ({ ...prev, score: prev.score + points, answers: newAnswers }));
        if (correctCount > 0) {
            import('canvas-confetti').then(m => m.default({ particleCount: 150, spread: 80, origin: { y: 0.6 } })).catch(() => {});
            playSound('win');
        }
    };

    const handleContinueOrNext = (e: React.MouseEvent) => {
        e.stopPropagation();

          if (!currentStep) return;
        const isContentList = ['content', 'objectiveList', 'accordion'].includes(currentStep.type);
        if (isContentList) {
             let totalItems = 0;
             if (currentStep.type === 'objectiveList') totalItems = (currentStep as ObjectiveListStep).items.length;
             else if (currentStep.type === 'accordion') totalItems = (currentStep as AccordionStep).items.length;
             else if (currentStep.type === 'content') {
                 const stepContent = (currentStep as ContentStep).content || '';
                 const listItems = stepContent.match(/<li>/g) || [];
                 totalItems = listItems.length > 0 ? listItems.length : (stepContent.match(/[^.!?]+[.!?]+/g) || [stepContent]).length;
             }
            const isListFullyRevealed = revealedSentencesCount >= totalItems;
            if (isListFullyRevealed) handleNext(); else setRevealedSentencesCount(prev => prev + 1);
        } else {
            handleNext();
        }
    };

    if (isFinished) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50/80 via-purple-50/70 to-pink-50/70 text-slate-900 gap-6 relative overflow-hidden">
                {/* Arka plan efektleri */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-200/40 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-indigo-200/30 rounded-full blur-[100px]" />
                </div>
                <div className="relative flex flex-col items-center gap-6">
                    {/* Tamamlandı ikonu */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-400/30 blur-2xl rounded-full animate-pulse" />
                        <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-400 to-green-500 border-2 border-emerald-300 flex items-center justify-center shadow-xl shadow-emerald-400/30">
                            <PartyPopper className="h-14 w-14 text-white" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-emerald-600 text-xs font-black uppercase tracking-[0.3em] mb-2">Tebrikler!</p>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">Ders Tamamlandı!</h1>
                    </div>
                    {/* Puan kartı */}
                    <div className="relative rounded-2xl overflow-hidden border-2 border-amber-300 bg-white/95 shadow-xl shadow-amber-100/60">
                        <div className="relative px-10 py-5 flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                <span className="text-amber-700 text-xs font-black uppercase tracking-widest">Toplam Puan</span>
                            </div>
                            <span className="text-5xl font-black text-slate-900 tabular-nums">{internalProgress.score}</span>
                        </div>
                    </div>
                    {/* Ünite Tamamlama Ödülü */}
                    <div className="relative overflow-hidden border-2 border-emerald-300 bg-emerald-50 rounded-xl px-6 py-3 shadow-md shadow-emerald-100/50 flex items-center justify-center gap-2 mb-2 animate-bounce">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        <span className="text-emerald-800 font-black text-sm tracking-widest uppercase">Ünite Tamamlama Ödülü: +10.000 XP</span>
                    </div>
                    <Button
                        onClick={() => onTopicComplete(topic!.id, internalProgress.score)}
                        className="relative h-14 px-10 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-lg border-0 shadow-xl shadow-emerald-500/30 active:scale-[0.97] transition-all duration-200 overflow-hidden"
                    >
                        <span className="relative">{completeButtonText || 'Bitir & Devam Et'}</span>
                    </Button>
                    <a href="/student/soru-bankasi" className="mt-4 px-6 py-2 rounded-xl font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-all flex items-center justify-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Soru Bankasına Dön
                    </a>
                </div>
            </div>
        );
    }
      
    if (!currentStep) return <div className="text-slate-500 flex justify-center items-center h-full"><Loader2 className="animate-spin mr-2"/> Yükleniyor...</div>;

    const isContentList = ['content', 'objectiveList', 'accordion'].includes(currentStep.type);
    let showContinueButton = false;
    if (isContentList) {
         let totalItems = 0;
         if (currentStep.type === 'objectiveList') totalItems = (currentStep as ObjectiveListStep).items.length;
         else if (currentStep.type === 'accordion') totalItems = (currentStep as AccordionStep).items.length;
         else if (currentStep.type === 'content') {
             const stepContent = (currentStep as ContentStep).content || '';
             const listItems = stepContent.match(/<li>/g) || [];
             totalItems = listItems.length > 0 ? listItems.length : (stepContent.match(/[^.!?]+[.!?]+/g) || [stepContent]).length;
         }
        showContinueButton = revealedSentencesCount < totalItems;
    }
    
    // YÜZEN BUTON MANTIĞI KALDIRILDI

    return (
      <div className="h-full w-full flex flex-col bg-transparent text-slate-900 overflow-hidden relative">
        
        <DrawingCanvas stepIndex={currentStepIndex} />

        {showResumeDialog && (
            <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                <div className="relative w-full max-w-sm animate-in zoom-in-95 duration-300">
                    {/* Glow */}
                    <div className="absolute inset-0 bg-indigo-300/40 blur-2xl rounded-3xl" />
                    <div className="relative rounded-3xl border-2 border-indigo-200 bg-white/95 backdrop-blur-2xl overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                        <div className="p-6 flex flex-col gap-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                                    <History className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-lg leading-tight">Kaldığın Yerden Devam Et</h3>
                                    <p className="text-slate-500 text-sm mt-0.5">{savedStepIndex! + 1}. adıma kadar gelmişsin.</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={handleResume} className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black text-base shadow-md hover:opacity-90 active:scale-[0.98] transition-all">
                                    Devam Et
                                </button>
                                <button onClick={handleRestart} className="w-full h-11 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200 font-bold text-sm transition-all active:scale-[0.98]">
                                    Baştan Başla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- İÇERİK ALANI --- */}
        <div className={cn("flex-1 relative w-full", isFullWidthStep ? "overflow-hidden" : `overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent ${isTeacher && isFullscreen && !isImmersiveStep ? 'pb-20' : 'pb-24'}`)}>
             {!isFullWidthStep && (
                 <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                     <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-indigo-200/30 rounded-full blur-[100px]" />
                     <div className="absolute bottom-[10%] right-[10%] w-72 h-72 bg-violet-200/25 rounded-full blur-[100px]" />
                 </div>
             )}

           <div className={cn("relative z-10 w-full h-full flex flex-col justify-start", !isFullWidthStep && (isTeacher ? "py-2 px-3 md:px-6" : "py-4 md:py-8 px-4 lg:px-8"))}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={currentStepIndex}
                    custom={direction}
                    initial={{ opacity: 0, x: direction * 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -50 }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    className="w-full h-full flex flex-col items-center justify-start"
                >
                  <StepContent 
                    step={currentStep}
                    answer={internalProgress.answers[currentStepIndex]}
                    onAnswer={handleAnswer}
                    onCorrectAndNext={() => setTimeout(handleNext, 1000)}
                    stepAnswers={internalProgress.answers[currentStepIndex]}
                    topic={topic}
                    courseId={courseId}
                    unitId={unitId}
                    courseTitle={courseTitle}
                    unitTitle={unitTitle}
                    isFullscreen={isFullscreen}
                    revealedSentencesCount={revealedSentencesCount}
                    flippedCards={flippedCards}
                    flippedAnagramCards={flippedAnagramCards}
                    onCardFlip={handleCardFlip}
                    onSlideScrolledToEnd={handleSlideScrolledToEnd}
                    onMultiAnswer={handleLocalMultiAnswer}
                    onAllTfAnswered={handleLocalAllTfAnswered}
                    onAnimationStart={() => setIsAnimating(true)}
                    onAnimationEnd={() => setIsAnimating(false)}
                    isVisualMaximized={isVisualMaximized}
                    onToggleVisualMaximize={() => setIsVisualMaximized(prev => !prev)}
                    isSingleCardMode={isSingleCardMode}
                    animationSpeed={animationSpeed}
                    fontSizeScale={fontSizeScale}
              />
                </motion.div>
              </AnimatePresence>
           </div>
        </div>
        
        {/* AÇMA TUŞU (Bar gizliyken görünür) - isTeacher ve hideUI true ise görünür */}
        {isTeacher && hideUI && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-5 fade-in">
                 <Button 
                    onClick={(e) => {
                         e.stopPropagation();
                         setHideUI(false);
                    }}
                    size="icon"
                    className="rounded-full w-12 h-12 bg-slate-900/90 shadow-xl border border-white/15 hover:bg-slate-800 text-white hover:scale-110 transition-all backdrop-blur-xl"
                 >
                    <ChevronUp className="w-6 h-6" />
                 </Button>
            </div>
        )}

        {/* ══ ALT NAVİGASYON BARI ══ */}
        <div
            className={cn(
                "flex-shrink-0 z-30 transition-all duration-300 ease-in-out relative",
                hideUI ? "h-0 p-0 overflow-hidden opacity-0 pointer-events-none" : "opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Öğretmen gizle butonu */}
            {isTeacher && !hideUI && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-40">
                    <Button
                        onClick={() => setHideUI(true)}
                        size="sm"
                        className="h-5 w-10 rounded-t-lg rounded-b-none bg-[#09071a]/95 border-t border-x border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white shadow-sm"
                    >
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* Blur arka plan */}
            <div className="absolute inset-0 bg-white/90 backdrop-blur-2xl border-t border-indigo-100/80 shadow-lg" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

            <div className="relative flex items-center justify-between gap-3 px-4 py-3">

                {/* SOL: Geri + Yenile */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrev}
                        disabled={currentStepIndex === 0}
                        className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    {isTeacher && (
                        <>
                            <button
                                onClick={() => window.location.reload()}
                                className="h-9 px-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 shadow-sm"
                                title="Sayfayı Yenile"
                            >
                                <Repeat className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Yenile</span>
                            </button>
                            <button
                                onClick={() => {
                                    const event = new KeyboardEvent('keydown', { key: 'd', bubbles: true });
                                    window.dispatchEvent(event);
                                }}
                                className="h-9 px-3 rounded-xl bg-cyan-100/80 border border-cyan-300 text-cyan-800 hover:bg-cyan-200 flex items-center gap-1.5 text-xs font-black transition-all active:scale-95 shadow-sm"
                                title="Canlı Çizim & Not Alma (D)"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Çizim (D)</span>
                            </button>
                        </>
                    )}
                </div>

                {/* ORTA: İlerleme noktaları + sayfa seçici */}
                <div className="flex-1 flex flex-col items-center gap-1.5">
                    {/* Nokta barı */}
                    <div className="flex items-center gap-1 max-w-[200px] overflow-hidden">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "rounded-full transition-all duration-500",
                                    idx === currentStepIndex
                                        ? "h-2 w-5 bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]"
                                        : internalProgress.answers[idx]?.completed
                                            ? "h-1.5 w-1.5 bg-emerald-500"
                                            : "h-1.5 w-1.5 bg-slate-300"
                                )}
                            />
                        ))}
                    </div>
                    {/* Sayfa seçici / gösterge */}
                    {isTeacher ? (
                        <Select value={currentStepIndex.toString()} onValueChange={(val) => {
                            const targetIndex = parseInt(val, 10);
                            if (!isNaN(targetIndex)) setCurrentStepIndex(targetIndex);
                        }}>
                            <SelectTrigger className="h-5 px-2 py-0 bg-transparent border-0 shadow-none text-[10px] font-bold text-slate-700 hover:text-indigo-600 focus:ring-0 focus:ring-offset-0 w-auto gap-1">
                                <SelectValue placeholder={`${currentStepIndex + 1} / ${steps.length}`} />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 shadow-xl">
                                {steps.map((s, i) => (
                                    <SelectItem key={i} value={i.toString()} className="text-slate-700 font-semibold">
                                        Sayfa {i + 1}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="h-5 px-2 py-0 flex items-center justify-center text-[11px] font-bold text-slate-600">
                            Sayfa {currentStepIndex + 1} / {steps.length}
                        </div>
                    )}
                </div>

                {/* SAĞ: Puan + Atla + Devam */}
                <div className="flex items-center gap-2">
                    {/* Puan rozeti */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-100/90 border border-amber-300 rounded-xl shadow-sm">
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                        <div className="relative h-4 w-6 overflow-hidden">
                            <AnimatePresence mode="popLayout">
                                <motion.span
                                    key={internalProgress.score}
                                    initial={{ y: 16, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -16, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="absolute inset-0 text-xs font-black text-amber-800 text-center"
                                >
                                    {internalProgress.score}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                    </div>

                    {isTeacher && (
                        <button
                            onClick={handleNext}
                            className="h-9 px-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-amber-700 hover:bg-amber-50 text-xs font-bold transition-all active:scale-95 shadow-sm"
                        >
                            Atla
                        </button>
                    )}

                    <button
                        onClick={handleContinueOrNext}
                        disabled={!isNextButtonEnabled || (currentStepIndex === steps.length - 1 && isFinished)}
                        className={cn(
                            "h-9 px-5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 relative overflow-hidden border",
                            isNextButtonEnabled
                                ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-transparent shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35"
                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        )}
                    >
                        {isNextButtonEnabled && (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.25),transparent_60%)]" />
                        )}
                        <span className="relative">
                            {currentStepIndex === steps.length - 1 ? (completeButtonText || 'Bitir') : 'Devam Et'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
}