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
    PenTool, Eraser, Highlighter, Undo, Trash2, ChevronUp, ChevronDown, Minimize2, Palette
} from 'lucide-react';
import type { 
    LessonStep, AnagramStep, SentenceScrambleStep, FitbStep, AccordionStep, IframeStep, 
    Topic, ActivityLinkStep, VisualStep, McqStep, TfStep, FlashcardStep, TrueFalseListStep, 
    HtmlSlideStep, ContentStep, ConceptMapStep, ConceptMapData, AnagramFlashcardStep, 
    ConceptExplanationStep, ObjectiveListStep, VideoStep, Question, AnagramGameStep 
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from 'next/link';
import { playSound } from "@/lib/audio-service";
import { useAuth } from "@/context/auth-context";
import { motion, AnimatePresence } from "framer-motion";

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
      
    useEffect(() => {
        setDisplayedContent('');
        setIsCompleted(false);
    }, [content]);

    useEffect(() => {
        if (isCompleted) return;

        let currentIndex = 0;
        if (displayedContent === content) {
            setIsCompleted(true);
            if (onComplete) onComplete();
            return;
        }

        const intervalId = setInterval(() => {
            if (currentIndex >= content.length) {
                clearInterval(intervalId);
                setIsCompleted(true);
                if (onComplete) onComplete();
                return;
            }
            let char = content.charAt(currentIndex);
            let nextChunk = char;
            if (char === '<') {
                const closingIndex = content.indexOf('>', currentIndex);
                if (closingIndex !== -1) {
                    nextChunk = content.substring(currentIndex, closingIndex + 1);
                    currentIndex = closingIndex;
                }
            }
            setDisplayedContent((prev) => prev + nextChunk);
            currentIndex++;
        }, speed);

        return () => clearInterval(intervalId);
    }, [content, speed, onComplete, isCompleted]); 

    if (isCompleted) {
        return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
    return <div dangerouslySetInnerHTML={{ __html: displayedContent }} />;
};

// --- ORTAK RENK TEMALARI ---
const FLASHCARD_THEMES = [
    { front: 'bg-rose-50 border-rose-200 text-rose-900', back: 'bg-rose-500 border-rose-600 text-white' },
    { front: 'bg-blue-50 border-blue-200 text-blue-900', back: 'bg-blue-500 border-blue-600 text-white' },
    { front: 'bg-emerald-50 border-emerald-200 text-emerald-900', back: 'bg-emerald-500 border-emerald-600 text-white' },
    { front: 'bg-amber-50 border-amber-200 text-amber-900', back: 'bg-amber-500 border-amber-600 text-white' },
    { front: 'bg-purple-50 border-purple-200 text-purple-900', back: 'bg-purple-500 border-purple-600 text-white' },
    { front: 'bg-cyan-50 border-cyan-200 text-cyan-900', back: 'bg-cyan-500 border-cyan-600 text-white' },
    { front: 'bg-indigo-50 border-indigo-200 text-indigo-900', back: 'bg-indigo-500 border-indigo-600 text-white' },
    { front: 'bg-orange-50 border-orange-200 text-orange-900', back: 'bg-orange-500 border-orange-600 text-white' },
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
        <motion.div 
            layout
            className={cn(
                "relative flex flex-col items-center justify-center bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 transition-all duration-500 ease-in-out",
                isMaximized 
                    ? "fixed inset-0 z-[40] w-screen h-screen rounded-none border-0 bg-black" 
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
        </motion.div>
    );
}

// --- 2. InteractiveTrueFalseList ---
function InteractiveTrueFalseList({ step, isFullscreen, answers, onAnswer, onAllAnswered }: { step: TrueFalseListStep, isFullscreen: boolean, answers: any, onAnswer: (index: number, val: boolean) => void, onAllAnswered: () => void }) {
    const isTeacher = useTeacherMode();
    const allAnswered = step.questions.every((_, index) => answers && answers[index] !== undefined);
    
    const isCompleted = answers?.completed;

    useEffect(() => {
        if (allAnswered && !isCompleted) {
            onAllAnswered();
        }
    }, [allAnswered, isCompleted, onAllAnswered]);

    const colorThemes = [
        { card: 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100', number: 'text-cyan-600' },
        { card: 'border-purple-200 bg-purple-50 hover:bg-purple-100', number: 'text-purple-600' },
        { card: 'border-amber-200 bg-amber-50 hover:bg-amber-100', number: 'text-amber-600' },
        { card: 'border-rose-200 bg-rose-50 hover:bg-rose-100', number: 'text-rose-600' },
        { card: 'border-lime-200 bg-lime-50 hover:bg-lime-100', number: 'text-lime-600' },
        { card: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100', number: 'text-indigo-600' },
    ];

    return (
        <div className={cn("w-full h-full flex flex-col items-center justify-start p-2", isTeacher ? "max-w-full" : "max-w-4xl mx-auto")}>
             <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn(
                "p-4 rounded-3xl shadow-xl bg-white/80 backdrop-blur-xl border border-slate-200 flex-shrink-0 w-full text-center", 
                isTeacher ? "py-4 mb-6 mt-2" : "p-3 md:p-6 mb-4"
            )}>
                <h2 className={cn("font-black text-slate-800", 
                    isTeacher ? "text-3xl md:text-4xl" : (isFullscreen ? "text-xl md:text-3xl" : "text-lg md:text-2xl")
                )}>{step.title}</h2>
            </motion.div>

            <div className={cn("w-full grid gap-4 pb-24", isTeacher ? "grid-cols-1 md:grid-cols-2 gap-8" : "grid-cols-1")}>
                {step.questions.map((q, index) => {
                    const userAnswer = answers && answers[index];
                    const isAnswered = userAnswer !== undefined;
                    const isCorrect = isAnswered && userAnswer.isCorrect;
                    
                    const theme = colorThemes[index % colorThemes.length];

                    return (
                        <motion.div 
                            key={index} 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: isAnswered ? 1 : 1.02 }}
                            className={cn(
                            "rounded-3xl border-2 shadow-lg flex flex-col justify-between overflow-hidden backdrop-blur-md",
                            isTeacher ? "p-6 min-h-[14rem]" : "p-4 min-h-[10rem]",
                            isAnswered 
                                ? (isCorrect ? "border-emerald-400 bg-emerald-50" : "border-red-400 bg-red-50") 
                                : `border-slate-100 ${theme.card}`
                        )}>
                            <div className="flex gap-4 mb-6">
                                <span className={cn("font-black", isTeacher ? "text-2xl" : "text-xl", isAnswered ? "text-slate-800" : theme.number)}>
                                    {index + 1}.
                                </span>
                                <p className={cn("font-bold text-slate-700 leading-relaxed", isTeacher ? "text-2xl" : "text-base")}>
                                    {q.statement}
                                </p>
                            </div>

                            <div className="flex gap-4 mt-auto">
                                <motion.div whileTap={{ scale: 0.95 }} className="flex-1 flex">
                                    <Button
                                        onClick={() => !isAnswered && onAnswer(index, true)}
                                        disabled={isAnswered}
                                        className={cn(
                                            "w-full font-bold rounded-xl transition-all shadow-sm",
                                            isTeacher ? "h-16 text-xl" : "h-10 text-base",
                                            isAnswered && userAnswer.answer === true 
                                                ? (userAnswer.isCorrect ? "bg-emerald-500 hover:bg-emerald-600 opacity-100 text-white" : "bg-red-500 hover:bg-red-600 opacity-100 text-white")
                                                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
                                            isAnswered && userAnswer.answer !== true && "opacity-30 grayscale"
                                        )}
                                    >
                                        <CheckCircle className={cn("mr-2", isTeacher ? "h-6 w-6" : "h-4 w-4")} /> Doğru
                                    </Button>
                                </motion.div>
                                <motion.div whileTap={{ scale: 0.95 }} className="flex-1 flex">
                                    <Button
                                        onClick={() => !isAnswered && onAnswer(index, false)}
                                        disabled={isAnswered}
                                        className={cn(
                                            "w-full font-bold rounded-xl transition-all shadow-sm",
                                            isTeacher ? "h-16 text-xl" : "h-10 text-base",
                                            isAnswered && userAnswer.answer === false 
                                                ? (userAnswer.isCorrect ? "bg-emerald-500 hover:bg-emerald-600 opacity-100 text-white" : "bg-red-500 hover:bg-red-600 opacity-100 text-white")
                                                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
                                            isAnswered && userAnswer.answer !== false && "opacity-30 grayscale"
                                        )}
                                    >
                                        <XCircle className={cn("mr-2", isTeacher ? "h-6 w-6" : "h-4 w-4")} /> Yanlış
                                    </Button>
                                </motion.div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    )
}

// 3. ContentListPlayer
function ContentListPlayer({ 
    step, 
    revealedSentencesCount, 
    isFullscreen, 
    onAnimationStart, 
    onAnimationEnd 
}: { 
    step: ContentStep | ObjectiveListStep | AccordionStep, 
    revealedSentencesCount: number, 
    isFullscreen?: boolean, 
    onAnimationStart?: () => void, 
    onAnimationEnd?: () => void
}) {
    const isTeacher = useTeacherMode();
    const scrollRef = useRef<HTMLDivElement>(null);
      
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
    
    const decoIcons = [
        { left: Sparkles, right: Sparkles }, { left: Star, right: Star }, { left: Zap, right: Zap },
        { left: Crown, right: Crown }, { left: Gem, right: Gem }, { left: Flame, right: Flame },
        { left: Feather, right: Feather }, { left: Quote, right: Quote }
    ];

    const styles = [
        { bg: 'bg-blue-50/90', border: 'border-blue-100', circleBorder: 'border-blue-400', numberColor: 'text-blue-600', textColor: 'text-blue-700', iconColor: 'text-blue-400' },
        { bg: 'bg-rose-50/90', border: 'border-rose-100', circleBorder: 'border-rose-400', numberColor: 'text-rose-600', textColor: 'text-rose-700', iconColor: 'text-rose-400' },
        { bg: 'bg-amber-50/90', border: 'border-amber-100', circleBorder: 'border-amber-400', numberColor: 'text-amber-600', textColor: 'text-amber-700', iconColor: 'text-amber-400' },
        { bg: 'bg-emerald-50/90', border: 'border-emerald-100', circleBorder: 'border-emerald-400', numberColor: 'text-emerald-600', textColor: 'text-emerald-700', iconColor: 'text-emerald-400' },
        { bg: 'bg-purple-50/90', border: 'border-purple-100', circleBorder: 'border-purple-400', numberColor: 'text-purple-600', textColor: 'text-purple-700', iconColor: 'text-purple-400' },
        { bg: 'bg-cyan-50/90', border: 'border-cyan-100', circleBorder: 'border-cyan-400', numberColor: 'text-cyan-600', textColor: 'text-cyan-700', iconColor: 'text-cyan-400' },
        { bg: 'bg-indigo-50/90', border: 'border-indigo-100', circleBorder: 'border-indigo-400', numberColor: 'text-indigo-600', textColor: 'text-indigo-700', iconColor: 'text-indigo-400' },
        { bg: 'bg-orange-50/90', border: 'border-orange-100', circleBorder: 'border-orange-400', numberColor: 'text-orange-600', textColor: 'text-orange-700', iconColor: 'text-orange-400' },
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

    return (
        <div className={cn("w-full h-full flex flex-col items-center justify-start p-2", isTeacher ? "max-w-full" : "max-w-7xl mx-auto")}>
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                "relative z-20 p-6 rounded-3xl shadow-lg bg-white border border-slate-100 flex-shrink-0 w-full max-w-4xl text-center mb-8 overflow-hidden", 
                isTeacher ? "py-6 mt-2" : "p-4 md:p-8"
            )}>
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"></div>
                 <div className="flex items-center justify-center gap-4">
                    <Sparkles className="text-yellow-400 h-6 w-6 md:h-8 md:w-8 animate-pulse" />
                    <h2 className={cn("font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600", 
                        isTeacher ? "text-4xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-2xl")
                    )}>{step.title}</h2>
                    <Sparkles className="text-yellow-400 h-6 w-6 md:h-8 md:w-8 animate-pulse" />
                </div>
                <div className="absolute left-6 md:left-1/2 bottom-[-10px] w-4 h-4 bg-slate-300 rounded-full md:-translate-x-1/2 border-2 border-white z-20"></div>
            </motion.div>
              
             <div className={cn(
                 "relative w-full pb-24", 
                 isTeacher ? "pb-32" : "pb-16"
             )}>
                <div className="absolute left-[29px] md:left-1/2 -top-6 bottom-0 w-1.5 bg-gradient-to-b from-slate-300 via-slate-300 to-transparent md:-translate-x-1/2 z-0 rounded-full" />

                <div className={cn(
                    "grid gap-8",
                    "grid-cols-1 md:grid-cols-2"
                )}>
                    {visibleSentences.map((sentence, index) => {
                        const style = styles[index % styles.length]; 
                        const icons = decoIcons[index % decoIcons.length];
                        const LeftIcon = icons.left;
                        const RightIcon = icons.right;

                        const shouldAnimate = isTeacher && index === visibleSentences.length - 1; 
                        const isLeft = index % 2 === 0;
                        const isLastItem = index === visibleSentences.length - 1;

                        return (
                            <motion.div 
                                initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                key={index} 
                                ref={isLastItem ? scrollRef : null}
                                className={cn(
                                "relative flex items-center w-full group",
                                isLeft ? "md:flex-row md:justify-end" : "md:flex-row-reverse md:justify-end",
                                "flex-row justify-start" 
                            )}>
                                <div className={cn(
                                    "absolute h-1 bg-slate-300 z-0 hidden md:block",
                                    isLeft ? "right-[-20px] w-12" : "left-[-20px] w-12"
                                )}></div>

                                <div className={cn(
                                    "flex-shrink-0 flex items-center justify-center rounded-full bg-white border-[4px] shadow-sm z-20 w-14 h-14 md:w-16 md:h-16 transition-transform duration-300 group-hover:scale-110 relative",
                                    style.circleBorder, 
                                    "mr-4",
                                    !isTeacher && (isLeft 
                                        ? "md:mr-[-32px] md:translate-x-[50%]" 
                                        : "md:ml-[-32px] md:translate-x-[-50%]" 
                                    )
                                )}>
                                    <span className={cn("font-black text-xl md:text-2xl", style.numberColor)}>
                                        {index + 1}
                                    </span>
                                </div>

                                <div className={cn(
                                    "relative flex-1 p-5 md:p-6 rounded-3xl border shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex items-center",
                                    style.bg, style.border,
                                    !isTeacher && (isLeft ? "md:mr-12" : "md:ml-12")
                                )}>
                                    <div className={cn(
                                        "absolute top-1/2 -translate-y-1/2 w-5 h-5 rotate-45 border-b border-l",
                                        style.bg, style.border,
                                        "left-[-10px] border-r-0 border-t-0",
                                        !isTeacher && (isLeft 
                                            ? "md:left-auto md:right-[-10px] md:border-l-0 md:border-b-0 md:border-r md:border-t"
                                            : "md:left-[-10px] md:border-r-0 md:border-t-0"
                                        )
                                    )}></div>

                                    <div className={cn(
                                        "leading-relaxed font-black break-words w-full flex items-center gap-3", 
                                        style.textColor, 
                                        isTeacher ? "text-3xl" : "text-base md:text-lg lg:text-xl" 
                                    )}>
                                        <LeftIcon className={cn("w-5 h-5 md:w-6 md:h-6 flex-shrink-0 opacity-60", style.iconColor)} />
                                        
                                        <span className="flex-1">
                                            {shouldAnimate ? (
                                                <TypewriterText 
                                                    content={sentence} 
                                                    onComplete={() => onAnimationEnd?.()} 
                                                    speed={40} 
                                                />
                                            ) : (
                                                <div dangerouslySetInnerHTML={{ __html: sentence }} />
                                            )}
                                        </span>

                                        <RightIcon className={cn("w-5 h-5 md:w-6 md:h-6 flex-shrink-0 opacity-60", style.iconColor)} />
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

// 4. ConceptExplanationPlayer
function ConceptExplanationPlayer({ items, isFullscreen, title }: { items: { concept: string, definition: string }[], isFullscreen: boolean, title: string }) {
    if (!items || items.length === 0) return null;
    const isTeacher = useTeacherMode();
    
    const cardStyles = [
        { bg: 'bg-white hover:bg-blue-50', border: 'border-blue-100', title: 'text-blue-600', hoverBorder: 'hover:border-blue-300' },
        { bg: 'bg-white hover:bg-rose-50', border: 'border-rose-100', title: 'text-rose-600', hoverBorder: 'hover:border-rose-300' },
        { bg: 'bg-white hover:bg-amber-50', border: 'border-amber-100', title: 'text-amber-600', hoverBorder: 'hover:border-amber-300' },
        { bg: 'bg-white hover:bg-emerald-50', border: 'border-emerald-100', title: 'text-emerald-600', hoverBorder: 'hover:border-emerald-300' },
        { bg: 'bg-white hover:bg-purple-50', border: 'border-purple-100', title: 'text-purple-600', hoverBorder: 'hover:border-purple-300' },
        { bg: 'bg-white hover:bg-cyan-50', border: 'border-cyan-100', title: 'text-cyan-600', hoverBorder: 'hover:border-cyan-300' },
    ];

    return (
        <div className={cn('flex flex-col h-full w-full items-center justify-start p-2', isTeacher ? "max-w-[98%] mx-auto pt-4" : "max-w-6xl mx-auto justify-center")}>
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn("p-4 rounded-3xl shadow-xl bg-white/80 backdrop-blur-xl border border-slate-200 flex-shrink-0 mb-8 w-full text-center")}>
                <h2 className={cn("font-black text-slate-800", isTeacher ? "text-3xl md:text-4xl" : (isFullscreen ? "text-xl md:text-3xl" : "text-lg md:text-2xl"))}>{title}</h2>
            </motion.div>
             
            <div className={cn(
                "w-full flex-grow grid gap-6", 
                isTeacher 
                    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 content-start" 
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
                {items.map((item, index) => {
                    const style = cardStyles[index % cardStyles.length];
                    return (
                        <motion.div 
                            key={index}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className={cn(
                                "border-2 transition-all duration-300 group shadow-lg hover:shadow-xl hover:scale-105", 
                                style.bg,
                                style.border,
                                style.hoverBorder,
                                isTeacher ? 'min-h-[180px]' : (isFullscreen ? 'min-h-[180px]' : 'min-h-[120px]')
                            )}>
                                <CardHeader className={cn("border-b", style.border, isTeacher ? "p-4" : "p-3 md:p-4 pb-2 md:pb-3")}>
                                    <CardTitle className={cn("font-black uppercase tracking-wider transition-colors", style.title, isTeacher ? "text-2xl" : (isFullscreen ? "text-lg md:text-xl" : "text-base md:text-lg"))}>{item.concept}</CardTitle>
                                </CardHeader>
                                <CardContent className={cn("text-slate-700 font-bold leading-relaxed", isTeacher ? "text-xl p-4 pt-4" : "pt-3 md:pt-4 p-3 md:p-4 text-sm md:text-base")}>
                                    {item.definition}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )
                })}
            </div>
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
             <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn("text-center mb-8", isTeacher ? "py-4" : "mb-8")}>
                 <h2 className={cn("font-black text-center text-slate-800 drop-shadow-sm uppercase tracking-wide", isTeacher ? "text-4xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"))}>{step.title}</h2>
             </motion.div>
            <div className={cn("grid gap-6 pb-32", isTeacher ? "grid-cols-3 lg:grid-cols-4 gap-8" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5")}>
                {step.cards.map((card, index) => {
                    const theme = FLASHCARD_THEMES[index % FLASHCARD_THEMES.length];
                    return (
                        <motion.div
                            key={index}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                                "rounded-3xl [perspective:1000px] cursor-pointer group transition-transform duration-300",
                                isTeacher ? "min-h-[14rem]" : (isFullscreen ? "min-h-[12rem]" : "min-h-[9rem]")
                            )}
                            onClick={() => onCardFlip(index, 'anagramFlashcard')}
                        >
                            <div
                                className={cn(
                                    "relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d]",
                                    flippedCards.has(index) && "[transform:rotateY(180deg)]"
                                )}
                            >
                                {/* Front */}
                                <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-3xl shadow-xl border-b-8 flex flex-wrap items-center justify-center p-4 backdrop-blur-md", theme.front)}>
                                    <h3 
                                        className="font-black tracking-widest break-all drop-shadow-sm uppercase text-slate-700"
                                        style={{ fontSize: getDynamicFontSize(card.scrambledWord) }}
                                    >
                                        {card.scrambledWord}
                                    </h3>
                                </div>

                                {/* Back */}
                                <div className={cn(
                                    "absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl shadow-xl border-b-8 flex flex-wrap items-center justify-center p-4 break-words overflow-hidden",
                                    theme.back
                                )}>
                                    <h3 
                                        className="font-black break-all drop-shadow-md uppercase"
                                        style={{ fontSize: getDynamicFontSize(card.correctAnswer) }}
                                    >
                                        {card.correctAnswer}
                                    </h3>
                                </div>
                            </div>
                        </motion.div>
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
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn("text-center mb-8", isTeacher ? "py-4" : "mb-8")}>
                <h2 className={cn("font-black text-center text-slate-800 drop-shadow-sm uppercase tracking-wider", isTeacher ? "text-4xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"))}>{step.title}</h2>
            </motion.div>
            <div className={cn("grid gap-8 pb-32", isTeacher ? "grid-cols-2 lg:grid-cols-3" : (isFullscreen ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"))}>
                {step.cards.map((card, index) => (
                    <motion.div
                        key={index}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <FlashcardItem
                            term={card.term}
                            definition={card.definition}
                            isFlipped={flippedCards.has(index)}
                            onFlip={() => onCardFlip(index, 'flashcard')}
                            theme={FLASHCARD_THEMES[index % FLASHCARD_THEMES.length]}
                            isFullscreen={isFullscreen}
                            isTeacher={isTeacher}
                        />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

const FlashcardItem = ({ term, definition, isFlipped, onFlip, theme, isFullscreen, isTeacher }: { term: string, definition: string, isFlipped: boolean, onFlip: () => void, theme: any, isFullscreen?: boolean, isTeacher?: boolean }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                "rounded-3xl [perspective:1000px] cursor-pointer group transition-transform duration-300",
                isTeacher ? "min-h-[20rem]" : "min-h-[12rem]"
            )}
            onClick={onFlip}
        >
            <div
                className={cn(
                    "relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d]",
                    isFlipped && "[transform:rotateY(180deg)]"
                )}
            >
                {/* Front */}
                <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-3xl shadow-xl border-b-8 flex flex-col items-center justify-center p-6 backdrop-blur-md transition-all", theme.front)}>
                    <h3 className={cn("font-black uppercase", isTeacher ? "text-4xl" : (isFullscreen ? "text-2xl" : "text-xl"))}>{term}</h3>
                    {!isTeacher && <p className="mt-4 text-[10px] md:text-xs opacity-60 uppercase tracking-widest font-bold border-t border-current pt-2 w-full">Çevir</p>}
                </div>

                {/* Back */}
                <div className={cn(
                    "absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl shadow-xl border-b-8 flex flex-col items-center justify-center p-6",
                    theme.back 
                )}>
                    <p className={cn("font-bold leading-relaxed", isTeacher ? "text-2xl" : (isFullscreen ? "text-lg" : "text-sm md:text-base"))}>{definition}</p>
                </div>
            </div>
        </motion.div>
    );
};

// 7. AnagramGame
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
        "bg-white text-rose-600 border-rose-200 hover:border-rose-400",
        "bg-white text-orange-600 border-orange-200 hover:border-orange-400",
        "bg-white text-amber-600 border-amber-200 hover:border-amber-400",
        "bg-white text-emerald-600 border-emerald-200 hover:border-emerald-400",
        "bg-white text-cyan-600 border-cyan-200 hover:border-cyan-400",
        "bg-white text-blue-600 border-blue-200 hover:border-blue-400",
        "bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400",
        "bg-white text-purple-600 border-purple-200 hover:border-purple-400",
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
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/80 p-4 md:p-10 rounded-3xl border border-white shadow-xl backdrop-blur-xl w-full max-w-5xl text-center">
                 <p className={cn("font-bold italic text-slate-700", isTeacher ? "text-3xl leading-snug" : "text-lg md:text-2xl")}>"{step.definition}"</p>
            </motion.div>
             
            {/* CEVAP ALANI */}
            <div className={cn(
                "flex flex-wrap justify-center items-center gap-x-4 gap-y-2 md:gap-x-8 md:gap-y-4 p-4 md:p-8 rounded-3xl bg-white/60 backdrop-blur-md border border-white/50 shadow-inner w-full max-w-6xl", 
                isTeacher ? "min-h-[12rem]" : "min-h-[8rem]"
            )}>
                {targetWords.map((word, wordIndex) => (
                    <div key={wordIndex} className="flex flex-nowrap gap-1 md:gap-2">
                        {word.split('').map((char, charIndex) => {
                            const letterObj = constructedLetters[globalCharIndex];
                            globalCharIndex++;

                            const showCard = letterObj || isAnswerRevealed;

                            return (
                                <motion.div 
                                    layout
                                    key={`${wordIndex}-${charIndex}`} 
                                    onClick={() => letterObj && !isAnswerRevealed && handleConstructedClick(letterObj)} 
                                    className={cn(
                                        "rounded-lg md:rounded-xl flex items-center justify-center font-black cursor-pointer shadow-md transition-all border-b-2 md:border-b-4",
                                        isTeacher ? "h-20 w-16 text-4xl border-b-8" : "h-10 w-8 text-lg md:h-14 md:w-10 md:text-2xl md:border-b-4 text-sm",
                                        showCard
                                            ? cn(
                                                "bg-white active:translate-y-1 active:border-b-0",
                                                isAnswerRevealed 
                                                    ? "bg-emerald-100 text-emerald-600 border-emerald-300" 
                                                    : "text-indigo-600 border-indigo-200"
                                              )
                                            : "bg-slate-200/50 border-slate-300 text-transparent border-dashed border-2"
                                    )}
                                >
                                    {letterObj ? letterObj.letter : (isAnswerRevealed ? char : '')}
                                </motion.div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* BANKA */}
            {!isAnswerRevealed ? (
                <motion.div layout className="flex flex-wrap justify-center gap-2 md:gap-3 p-2 md:p-4">
                    <AnimatePresence>
                    {bankLetters.map((item, index) => {
                        const colorClass = letterColors[index % letterColors.length];
                        return (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1, x: shakingLetterId === item.id ? [-10, 10, -10, 10, 0] : 0 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                                <Button 
                                    onClick={() => handleLetterClick(item)} 
                                    className={cn(
                                        "font-black border-b-4 active:border-b-0 active:translate-y-1 transition-all duration-100 shadow-lg",
                                        colorClass,
                                        isTeacher ? "h-20 w-16 text-4xl rounded-2xl border-b-8" : "h-12 w-10 text-xl md:h-16 md:w-14 md:text-3xl md:border-b-8",
                                        shakingLetterId === item.id && "bg-red-500 border-red-700 text-white hover:bg-red-600 !bg-none"
                                    )}
                                >
                                    {item.letter}
                                </Button>
                            </motion.div>
                        )
                    })}
                    </AnimatePresence>
                </motion.div>
            ) : (
                 <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mt-6">
                    <Button onClick={onCorrectAndNext} className={cn("font-bold text-white transition-all transform hover:scale-105 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200/50 shadow-lg", isTeacher ? "h-16 px-10 text-xl rounded-2xl" : "h-12 px-6 text-lg rounded-xl")}>
                        Harika! Sonraki <ArrowRight className="ml-3 h-5 w-5"/>
                    </Button>
                 </motion.div>
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
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center text-slate-800">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4"/>
                <h3 className="text-2xl font-bold">Tüm kelimeler tamamlandı!</h3>
            </motion.div>
        );
    }
    
    if (!currentCard) return null;

    return (
        <div className="w-full h-full flex flex-col justify-center relative">
             <div className="flex justify-between items-center px-4 mb-2 md:mb-4">
                 <div className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm bg-white/50 px-3 py-1 rounded-full shadow-sm">
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
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentCardIndex}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    <AnagramGame 
                        step={{...currentCard, title: step.title}} 
                        onAnswer={handleAnswer}
                        answer={answerState[currentCardIndex]}
                        isAnswerRevealed={!!answerState[currentCardIndex]}
                        onCorrectAndNext={handleNext} 
                        isTeacher={isTeacher}
                        isFullscreen={isFullscreen}
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

// 8. SentenceScrambleGame
function SentenceScrambleGame({ step, onAnswer, onCorrectAndNext, answer, isAnswerRevealed }: { step: SentenceScrambleStep, onAnswer: (answer: string) => void, onCorrectAndNext: () => void, answer?: { answer: string, isCorrect: boolean } | null, isAnswerRevealed: boolean }) {
    const isTeacher = useTeacherMode();
    const initialWords = useMemo(() => step.scrambledSentence.split(' ').map((word, index) => ({ id: index, word })), [step.scrambledSentence]);
    const [bankWords, setBankWords] = useState(initialWords);
    const [constructedWords, setConstructedWords] = useState<(typeof initialWords[0])[]>([]);
    const [mistakenWordId, setMistakenWordId] = useState<number | null>(null);

    const wordColors = [
        'bg-white text-rose-600 border-rose-200',
        'bg-white text-blue-600 border-blue-200',
        'bg-white text-green-600 border-green-200',
        'bg-white text-orange-600 border-orange-200',
        'bg-white text-sky-600 border-sky-200',
        'bg-white text-purple-600 border-purple-200',
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
            const timeoutId = setTimeout(() => { onCorrectAndNext(); }, 1500);
            return () => clearTimeout(timeoutId);
        }
    }, [answer, onCorrectAndNext]);

    return (
        <div className={cn("space-y-8 text-center mx-auto p-4", isTeacher ? "max-w-full justify-start pt-10" : "max-w-4xl justify-center")}>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("text-slate-600 font-bold drop-shadow-sm", isTeacher ? "text-3xl" : "text-xl md:text-2xl")}>Kelimeleri doğru sıraya dizerek cümleyi oluşturun.</motion.p>
             
             <div className={cn("flex flex-wrap justify-center items-center gap-4 bg-white/70 backdrop-blur-xl border border-white shadow-inner p-8 rounded-3xl", isTeacher ? "min-h-[12rem]" : "min-h-[6rem] md:min-h-[10rem]")}>
                <AnimatePresence>
                {constructedWords.map((wordObj, i) => (
                    <motion.div 
                        layout
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={wordObj.id} 
                        className={cn(
                            "rounded-xl font-bold shadow-md border-b-4",
                            wordColors[wordObj.id % wordColors.length], 
                            isTeacher ? "text-2xl px-6 py-3 rounded-2xl border-b-8" : "px-4 py-2 md:px-6 md:py-3 md:text-lg md:rounded-2xl md:border-b-4 text-sm"
                        )}
                    >
                        {wordObj.word}
                    </motion.div>
                ))}
                </AnimatePresence>
                {constructedWords.length === 0 && <span className={cn("text-slate-400 italic", isTeacher ? "text-xl" : "text-sm md:text-base")}>Cümleniz burada görünecek...</span>}
            </div>

            {isAnswerRevealed ? (
                 <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mt-10">
                    <div className={cn("inline-flex items-center gap-4 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]", isTeacher ? "px-8 py-4" : "px-6 py-3 md:px-8 md:py-4")}>
                        <CheckCircle2 className={cn(isTeacher ? "h-10 w-10" : "h-6 w-6")}/>
                        <span className={cn("font-bold", isTeacher ? "text-2xl" : "text-lg")}>Harika, doğru cümle!</span>
                    </div>
                </motion.div>
            ) : (
                <motion.div layout className="flex flex-wrap justify-center gap-4 p-2">
                    <AnimatePresence>
                    {bankWords.map((item, index) => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, x: mistakenWordId === item.id ? [-10, 10, -10, 10, 0] : 0 }}
                            exit={{ scale: 0, opacity: 0 }}
                            onClick={() => handleWordClick(item)}
                            className={cn(
                                "font-bold rounded-2xl transition-all duration-200 border-b-8 active:border-b-0 active:translate-y-2 shadow-lg cursor-pointer flex items-center justify-center hover:-translate-y-1",
                                wordColors[item.id % wordColors.length],
                                isTeacher ? "text-2xl h-20 px-6" : "text-lg h-16 px-6 md:text-xl md:h-16 md:px-8",
                                mistakenWordId === item.id && "bg-red-500 border-red-700 text-white hover:bg-red-600 !bg-none"
                            )}
                        >
                            {mistakenWordId === item.id && <X className="h-8 w-8 mr-2" />}
                            {item.word}
                        </motion.div>
                    ))}
                    </AnimatePresence>
                </motion.div>
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

// 10. DrawingCanvas (Aynı bırakılmıştır, Teacher modu odaklı olduğu için dokunmadım)
function DrawingCanvas({ stepIndex }: { stepIndex: number }) {
    const isTeacher = useTeacherMode();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPenMode, setIsPenMode] = useState(false);
    const [isPaletteVisible, setIsPaletteVisible] = useState(true); 
    
    const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
    const [color, setColor] = useState('#facc15');
    const [lineWidth, setLineWidth] = useState(4);
    const [history, setHistory] = useState<ImageData[]>([]);
    
    const savedDrawings = useRef<{ [key: number]: ImageData }>({});
    const prevStepIndexRef = useRef(stepIndex);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPos = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        if (isPenMode) setIsPaletteVisible(true);
    }, [isPenMode]);

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                let savedData = null;
                if(context) {
                    try { savedData = context.getImageData(0,0, canvas.width, canvas.height); } catch(e){}
                }

                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;

                if (savedData && context) {
                    context.putImageData(savedData, 0, 0);
                }
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            savedDrawings.current[prevStepIndexRef.current] = ctx.getImageData(0, 0, canvas.width, canvas.height);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHistory([]); 
            if (savedDrawings.current[stepIndex]) {
                ctx.putImageData(savedDrawings.current[stepIndex], 0, 0);
                setHistory([savedDrawings.current[stepIndex]]);
            }
            prevStepIndexRef.current = stepIndex;
        }
    }, [stepIndex]);


    const saveHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (history.length > 10) {
            setHistory(prev => [...prev.slice(1), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        } else {
            setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        }
    };

    const handleUndo = () => {
        const canvas = canvasRef.current;
        if (!canvas || history.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const previousState = history[history.length - 1];
        ctx.putImageData(previousState, 0, 0);
        setHistory(prev => prev.slice(0, -1));
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            saveHistory(); 
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else {
            return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isPenMode) return;
        
        saveHistory();

        const { x, y } = getCoords(e);
        setIsDrawing(true);
        lastPos.current = { x, y };

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.beginPath();
            ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2);
            
            if (tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = 'rgba(0,0,0,1)';
                ctx.globalAlpha = 1.0;
            } else if (tool === 'highlighter') {
                ctx.globalCompositeOperation = 'multiply'; 
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.5; 
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = color;
                ctx.globalAlpha = 1.0;
            }
            
            ctx.fill();
            ctx.closePath();
            
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !isPenMode || !lastPos.current || !canvasRef.current) return;
        e.preventDefault(); 
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoords(e);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lineWidth;

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.globalAlpha = 1.0;
        } else if (tool === 'highlighter') {
            ctx.globalCompositeOperation = 'multiply'; 
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.5; 
            ctx.lineWidth = lineWidth * 3; 
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = color;
            ctx.globalAlpha = 1.0;
        }

        ctx.lineTo(x, y);
        ctx.stroke();

        lastPos.current = { x, y };
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPos.current = null;
        const ctx = canvasRef.current?.getContext('2d');
        if(ctx) {
             ctx.globalCompositeOperation = 'source-over'; 
             ctx.globalAlpha = 1.0; 
             ctx.closePath();
        }
    };

    if (!isTeacher) return null;

    return (
        <>
            <canvas
                ref={canvasRef}
                className={cn(
                    "fixed inset-0 z-[100] touch-none",
                    isPenMode ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
                )}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />

            <div className="fixed bottom-32 right-4 z-[101] flex flex-col items-end gap-3">
                
                {isPenMode && (
                    <>
                        {isPaletteVisible ? (
                            <div className="flex flex-col items-center gap-2 bg-white/95 p-2 rounded-xl border border-slate-200 shadow-xl animate-in slide-in-from-bottom-5 fade-in zoom-in backdrop-blur-sm w-44">
                                
                                <div className="w-full flex justify-between items-center border-b border-slate-200 pb-2 mb-1 px-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Araçlar</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-slate-100 text-slate-400" onClick={() => setIsPaletteVisible(false)}>
                                        <Minimize2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg mb-1 w-full">
                                    {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#facc15', '#a855f7'].map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => { setColor(c); setTool('pen'); }}
                                            className={cn(
                                                "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 mx-auto",
                                                color === c && tool !== 'eraser' ? "ring-2 ring-offset-1 ring-slate-400 scale-110 border-white" : "border-transparent"
                                            )}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>

                                <div className="flex gap-2 items-center justify-center w-full pb-2 border-b border-slate-200">
                                     <button onClick={() => setLineWidth(4)} className={cn("w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-700 transition-colors flex items-center justify-center", lineWidth === 4 && "bg-slate-700")}>
                                        <div className="w-1 h-1 bg-white rounded-full" />
                                     </button>
                                     <button onClick={() => setLineWidth(8)} className={cn("w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-700 transition-colors flex items-center justify-center", lineWidth === 8 && "bg-slate-700")}>
                                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                                     </button>
                                     <button onClick={() => setLineWidth(16)} className={cn("w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-700 transition-colors flex items-center justify-center", lineWidth === 16 && "bg-slate-700")}>
                                        <div className="w-4 h-4 bg-white rounded-full" />
                                     </button>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                     <Button 
                                        variant={tool === 'pen' ? 'default' : 'ghost'} 
                                        size="sm" 
                                        onClick={() => setTool('pen')}
                                        className="w-full justify-start h-8 text-xs"
                                    >
                                        <PenTool className="w-3 h-3 mr-2" /> Kalem
                                     </Button>
                                     <Button 
                                        variant={tool === 'highlighter' ? 'default' : 'ghost'} 
                                        size="sm" 
                                        onClick={() => setTool('highlighter')}
                                        className={cn("w-full justify-start h-8 text-xs", tool === 'highlighter' && "bg-yellow-100 text-yellow-800 hover:bg-yellow-200")}
                                    >
                                        <Highlighter className="w-3 h-3 mr-2" /> Fosforlu
                                     </Button>
                                     <Button 
                                        variant={tool === 'eraser' ? 'default' : 'ghost'} 
                                        size="sm" 
                                        onClick={() => setTool('eraser')}
                                        className="w-full justify-start h-8 text-xs"
                                    >
                                        <Eraser className="w-3 h-3 mr-2" /> Silgi
                                     </Button>
                                </div>

                                <div className="h-[1px] w-full bg-slate-200"></div>

                                <div className="flex gap-2 w-full justify-between px-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleUndo} title="Geri Al" disabled={history.length === 0}>
                                        <Undo className="w-3 h-3" />
                                    </Button>
                                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={clearCanvas} title="Temizle">
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in zoom-in slide-in-from-bottom-5 pb-2">
                                <Button 
                                    onClick={() => setIsPaletteVisible(true)}
                                    className="w-10 h-10 rounded-full bg-white text-slate-600 border border-slate-200 shadow-lg hover:bg-slate-50 flex items-center justify-center"
                                    size="icon"
                                    title="Araçları Göster"
                                >
                                    <Palette className="w-5 h-5" />
                                </Button>
                            </div>
                        )}
                    </>
                )}

                <Button
                    onClick={() => setIsPenMode(!isPenMode)}
                    className={cn(
                        "w-12 h-12 rounded-full shadow-lg border-2 transition-all hover:scale-105 flex items-center justify-center",
                        isPenMode 
                            ? "bg-rose-500 text-white border-rose-200 hover:bg-rose-600" 
                            : "bg-slate-800 text-white border-slate-600 hover:bg-slate-700"
                    )}
                >
                    {isPenMode ? <X className="w-6 h-6" /> : <PenTool className="w-6 h-6" />}
                </Button>
            </div>
        </>
    );
}

// --- ANA BİLEŞEN: StepContent ---

export function StepContent({ 
    step, answer, onAnswer, onCorrectAndNext, stepAnswers, topic, courseId, unitId, courseTitle, unitTitle, isFullscreen, 
    revealedSentencesCount, flippedCards, flippedAnagramCards, onCardFlip, onSlideScrolledToEnd, onMultiAnswer, onAllTfAnswered,
    onAnimationStart, onAnimationEnd,
    isVisualMaximized,
    onToggleVisualMaximize
}: any) {
    const isTeacher = useTeacherMode();

    const renderContent = () => {
        if(step.isPublished === false && !isTeacher) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50 text-slate-800">
                    <Lock className="h-16 w-16 text-slate-400 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Bu İçerik Henüz Aktif Değil</h2>
                    <p className="text-slate-500">Bu adım henüz öğretmeniniz tarafından yayınlanmadı.</p>
                </div>
            );
        }
        
        switch (step.type) {
            case 'content':
            case 'objectiveList':
            case 'accordion':
                 return <ContentListPlayer step={step} revealedSentencesCount={revealedSentencesCount} isFullscreen={isFullscreen} onAnimationStart={onAnimationStart} onAnimationEnd={onAnimationEnd} />
            case 'conceptExplanation': {
                return <ConceptExplanationPlayer items={step.items} isFullscreen={isFullscreen} title={step.title} />
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
                 return <InteractiveTrueFalseList step={step as TrueFalseListStep} isFullscreen={isFullscreen || false} answers={stepAnswers || {}} onAnswer={onMultiAnswer} onAllAnswered={onAllTfAnswered} />;
            case 'conceptMap':
                 return <div className="text-center p-8 text-slate-500 text-lg">Kavram haritası bu görünümde desteklenmiyor.</div>; 
            case 'video': {
                const videoStep = step as VideoStep;
                const embedUrl = getEmbedUrl(videoStep.url);
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black", isTeacher ? "max-w-5xl" : "max-w-6xl")}>
                            <iframe 
                                src={embedUrl} 
                                title={videoStep.title} 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen 
                                className="w-full h-full"
                            ></iframe>
                        </motion.div>
                         {videoStep.description && <p className={cn("mt-6 text-center text-slate-600 font-medium max-w-5xl", isTeacher ? "text-3xl" : "text-lg")}>{videoStep.description}</p>}
                    </div>
                );
            }
            case 'mcq': {
                const mcqStep = step as McqStep;
                const optionColors = [
                    'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-700', 
                    'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700', 
                    'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700', 
                    'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700'
                ];
                return (
                    <div className={cn("w-full mx-auto flex flex-col justify-start min-h-[60vh] p-4", isTeacher ? "max-w-full pt-8" : "max-w-3xl justify-center")}>
                        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn("rounded-3xl shadow-xl bg-white/80 backdrop-blur-xl border border-slate-200 mb-8 text-center relative overflow-hidden", isTeacher ? "p-8" : "p-10")}>
                           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-500" />
                          <h3 className={cn("font-bold text-slate-800 leading-relaxed drop-shadow-sm", isTeacher ? "text-4xl" : (isFullscreen ? "text-3xl" : "text-2xl"))}>{mcqStep.question}</h3>
                        </motion.div>
                        <div className={cn("grid gap-6", isTeacher ? "grid-cols-2" : "grid-cols-1")}>
                            {mcqStep.options.map((option, index) => {
                                const isCorrect = option === mcqStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                const colorClass = optionColors[index % optionColors.length];

                                return (
                                    <motion.div
                                        key={index}
                                        whileHover={!answer ? { scale: 1.02 } : {}}
                                        whileTap={!answer ? { scale: 0.98 } : {}}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Button
                                            variant="default"
                                            className={cn(
                                                "w-full h-auto justify-start text-left whitespace-normal rounded-2xl border-2 transition-all duration-300",
                                                "font-medium shadow-sm",
                                                isTeacher ? "text-3xl p-8" : (isFullscreen ? "p-6 text-xl" : "p-6 text-lg"),
                                                !answer ? colorClass : "",
                                                answer && isCorrect ? "bg-emerald-500 border-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02] z-10" : "",
                                                answer && isSelected && !isCorrect ? "bg-red-500 border-red-600 text-white" : "",
                                                answer && !isSelected && !isCorrect ? "bg-slate-50 border-transparent text-slate-400 opacity-50" : ""
                                            )}
                                            onClick={() => onAnswer(option)}
                                            disabled={!!answer}
                                        >
                                                <span className={cn(
                                                    "flex shrink-0 items-center justify-center rounded-xl font-bold border mr-4", 
                                                    isTeacher ? "h-14 w-14 text-2xl" : "h-8 w-8 text-sm",
                                                    !answer ? "bg-white/50 border-black/5" : "bg-white/20 border-white/20"
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
                    <div className={cn("w-full mx-auto flex flex-col justify-start min-h-[60vh] p-4 text-center", isTeacher ? "max-w-5xl pt-10" : "max-w-4xl justify-center")}>
                          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn(
                             "rounded-3xl shadow-xl backdrop-blur-xl mb-10 relative overflow-hidden transition-all duration-500",
                             "bg-white border-2 border-slate-100",
                             "shadow-[0_0_30px_rgba(168,85,247,0.1)]",
                             isTeacher ? "p-10" : "p-10"
                           )}>
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-400 to-pink-500" />
                             <h3 className={cn("font-bold text-slate-800 leading-relaxed drop-shadow-sm", isTeacher ? "text-5xl" : (isFullscreen ? "text-3xl" : "text-2xl"))}>{tfStep.statement}</h3>
                        </motion.div>
                        <div className="flex gap-8 justify-center">
                            {["Doğru", "Yanlış"].map((option, index) => {
                                const isSelected = answer?.answer === option;
                                const isCorrect = option === correctOption;
                                return (
                                    <motion.div
                                        key={option}
                                        whileHover={!answer ? { scale: 1.05 } : {}}
                                        whileTap={!answer ? { scale: 0.95 } : {}}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.2 }}
                                    >
                                        <Button
                                            className={cn(
                                                "font-bold rounded-[2rem] transition-all duration-300 shadow-xl border-b-8 active:border-b-0 active:translate-y-2",
                                                isTeacher ? "h-40 w-64 text-4xl" : "h-32 w-48 text-2xl border-b-8",
                                                !answer && (option === "Doğru" ? "bg-white border-slate-200 text-green-600 hover:bg-green-50" : "bg-white border-slate-200 text-red-600 hover:bg-red-50"),
                                                answer && isCorrect && "bg-green-500 border-green-700 text-white scale-105 z-10 shadow-[0_0_30px_rgba(34,197,94,0.4)]",
                                                answer && isSelected && !isCorrect && "bg-red-500 border-red-700 text-white",
                                                answer && !isSelected && !isCorrect && "opacity-30 grayscale scale-95"
                                            )}
                                            onClick={() => onAnswer(option)}
                                            disabled={!!answer}
                                        >
                                                <div className="flex flex-col items-center gap-4">
                                                    {option === "Doğru" ? <CheckCircle className={cn(isTeacher ? "h-12 w-12" : "h-8 w-8")}/> : <XCircle className={cn(isTeacher ? "h-12 w-12" : "h-8 w-8")}/>}
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
                    'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-700', 
                    'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700', 
                    'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700', 
                    'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700'
                ];
                return (
                    <div className={cn("w-full mx-auto flex flex-col justify-start min-h-[60vh] p-4 text-center", isTeacher ? "max-w-6xl pt-10" : "max-w-5xl justify-center")}>
                        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn("rounded-3xl shadow-xl bg-white/80 backdrop-blur-xl border border-slate-200 mb-10 relative overflow-hidden", isTeacher ? "p-10" : "p-10")}>
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
                          <h3 className={cn("font-bold text-slate-800 leading-relaxed tracking-wide", isTeacher ? "text-5xl" : (isFullscreen ? "text-4xl" : "text-2xl md:text-3xl"))}>{fitbStep.sentenceWithBlank?.replace('___', '________')}</h3>
                        </motion.div>
                        <div className={cn("grid gap-6", isTeacher ? "grid-cols-2 gap-8" : "grid-cols-1 sm:grid-cols-2 gap-6")}>
                            {(fitbStep.options || []).map((option, index) => {
                                const isCorrect = option === fitbStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                const colorClass = optionColors[index % optionColors.length];
                                return (
                                    <motion.div
                                        key={index}
                                        whileHover={!answer ? { scale: 1.02 } : {}}
                                        whileTap={!answer ? { scale: 0.98 } : {}}
                                        initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Button 
                                            variant="default" 
                                            className={cn("w-full font-bold rounded-2xl border-2 active:border-b-0 active:translate-y-1 transition-all duration-200 shadow-sm", isTeacher ? "h-24 text-3xl" : "h-20 text-xl", !answer ? colorClass : "", answer && isCorrect ? "bg-emerald-500 border-emerald-700 text-white shadow-lg scale-[1.01] z-10" : "", answer && isSelected && !isCorrect ? "bg-red-500 border-red-700 text-white" : "", answer && !isSelected && !isCorrect ? "bg-slate-100 border-transparent text-slate-400 opacity-50" : "")} 
                                            onClick={() => onAnswer(option)} 
                                            disabled={!!answer}
                                        >
                                            <span className={cn("flex shrink-0 items-center justify-center rounded-xl font-bold border mr-4", isTeacher ? "h-12 w-12 text-xl" : "h-8 w-8 text-sm", !answer ? "bg-white/50 border-black/5" : "bg-white/20 border-white/20")}>{String.fromCharCode(65 + index)}</span>
                                            {option}
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
    onAllTfAnswered
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
    const [isFinished, setIsFinished] = useState(false);
    
    const [isVisualMaximized, setIsVisualMaximized] = useState(false);
      
    const [showResumeDialog, setShowResumeDialog] = useState(false);
    const [savedStepIndex, setSavedStepIndex] = useState<number | null>(null);
    const [hideUI, setHideUI] = useState(false); 

    const steps = useMemo(() => {
        if (!topic) return [];
        return topic.steps?.filter(s => (s.isPublished ?? true) || isTeacher) || [];
    }, [topic, isTeacher]);

    const currentStep = useMemo(() => steps[currentStepIndex], [steps, currentStepIndex]);

    const isImmersiveStep = ['visual', 'htmlSlide'].includes(currentStep?.type || '');
    const isHtmlSlideStep = currentStep?.type === 'htmlSlide';

    useEffect(() => {
        if (currentStep?.type === 'visual') {
            setIsVisualMaximized(true);
        } else if (isVisualMaximized) {
            setIsVisualMaximized(false);
        }
    }, [currentStep, isVisualMaximized]);

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
                        setInternalProgress(prev => ({ score: prev.score + (score > 0 ? score : 100), answers: newAnswers }));
                        toast({ title: "Tebrikler!", description: `Puanın: ${score}`, className: "bg-green-500 border-none text-white" });
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
            setCurrentStepIndex(currentStepIndex + 1);
            setRevealedSentencesCount(1);
            setFlippedCards(new Set());
            setFlippedAnagramCards(new Set());
            setIsAnimating(false);
            setIsVisualMaximized(false); 
        } else {
            setIsFinished(true);
            playSound('win');
            onTopicComplete(topic!.id, internalProgress.score);
        }
    }, [currentStep, currentStepIndex, steps.length, internalProgress, onTopicComplete, topic, user?.uid]);

    const handleAnswer = (answer: string | boolean) => {
        if (internalProgress.answers[currentStepIndex] !== undefined) return;
        let isCorrect = false;
        let points = 0;
        
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
        if (isCorrect) playSound('correct'); else playSound('incorrect');
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

    const handlePrev = () => { if(currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1); };

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
    }

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
             <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }} className="h-full flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-800 gap-6">
                 <PartyPopper className="h-24 w-24 text-yellow-500" />
                 <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">Ders Tamamlandı!</h1>
                 <p className="text-3xl text-cyan-600 font-bold bg-white/50 px-8 py-4 rounded-3xl shadow-sm border border-cyan-100">Toplam Puan: {internalProgress.score}</p>
                 <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={() => onTopicComplete(topic!.id, internalProgress.score)} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-2xl px-12 py-8 rounded-3xl shadow-xl shadow-cyan-500/30">
                        {completeButtonText || 'Bitir ve Çık'}
                    </Button>
                 </motion.div>
             </motion.div>
         )
    }
      
    if (!currentStep) return <div className="text-slate-500 flex justify-center items-center h-full"><Loader2 className="animate-spin mr-2 w-8 h-8"/> Yükleniyor...</div>;

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

    return (
      <div className="h-full w-full flex flex-col overflow-hidden relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-purple-50">
        
        <DrawingCanvas stepIndex={currentStepIndex} />

        {showResumeDialog && (
            <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Card className="w-full max-w-sm bg-white border-none text-slate-800 shadow-2xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="flex items-center gap-3 text-xl"><History className="h-7 w-7 text-indigo-500" />Kaldığın Yerden Devam Et</CardTitle>
                            <CardDescription className="text-base mt-2">Daha önce bu konuda <strong className="text-indigo-600">{savedStepIndex! + 1}. adıma</strong> kadar gelmişsin.</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex flex-col gap-3 p-6">
                            <Button onClick={handleResume} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-lg py-6 rounded-xl shadow-md">Evet, Devam Et</Button>
                            <Button onClick={handleRestart} variant="ghost" className="w-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl py-6">Hayır, Baştan Başla</Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        )}

        {/* --- İÇERİK ALANI --- */}
        <div className={cn("flex-1 relative w-full", isFullWidthStep ? "overflow-hidden" : `overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent ${isTeacher && isFullscreen && !isImmersiveStep ? 'pb-32' : 'pb-24'}`)}>
             {!isFullWidthStep && (
                 <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                     <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] bg-cyan-300/20 rounded-full blur-[100px]" />
                     <div className="absolute bottom-[10%] right-[10%] w-[30rem] h-[30rem] bg-purple-300/20 rounded-full blur-[100px]" />
                 </div>
             )}

           <div className={cn("relative z-10 w-full h-full flex flex-col justify-start", !isFullWidthStep && "py-4 md:py-8 px-4")}>
              <AnimatePresence mode="wait">
                  <motion.div
                      key={currentStepIndex}
                      initial={{ opacity: 0, x: 50, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                      className="w-full h-full"
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
                      />
                  </motion.div>
              </AnimatePresence>
           </div>
        </div>
        
        {/* AÇMA TUŞU */}
        {isTeacher && hideUI && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-5 fade-in">
                 <Button 
                    onClick={(e) => {
                         e.stopPropagation();
                         setHideUI(false);
                    }}
                    size="icon"
                    className="rounded-full w-12 h-12 bg-white shadow-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 hover:scale-110 transition-all"
                 >
                    <ChevronUp className="w-6 h-6" />
                 </Button>
            </div>
        )}

        {/* ALT BAR (YÜZEN DİNAMİK ADA TASARIMI) */}
        <div className={cn(
            "fixed z-50 transition-all duration-500 ease-in-out flex items-center justify-between",
            hideUI ? "bottom-[-100px] opacity-0 pointer-events-none" : "bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 opacity-100",
            "bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_10px_40px_-10px_rgba(79,70,229,0.15)]",
            "rounded-[2rem] px-4 md:px-6 py-3 min-w-[320px] md:min-w-[400px] max-w-[90vw]"
        )} onClick={(e) => e.stopPropagation()}>
            
            {/* GİZLEME BUTONU */}
            {isTeacher && !hideUI && (
                <div className="absolute -top-4 right-6 z-40">
                    <Button 
                        onClick={() => setHideUI(true)}
                        size="sm"
                        className="h-6 w-10 rounded-t-lg rounded-b-none bg-white/90 border-t border-x border-slate-200 hover:bg-white shadow-sm"
                    >
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                    </Button>
                </div>
            )}

            {/* SOL: Geri Butonu + İlerleme */}
            <div className="flex items-center gap-3">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handlePrev} 
                    disabled={currentStepIndex === 0} 
                    className="rounded-full h-10 w-10 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors border-0"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <div className="hidden sm:flex flex-col gap-1 w-24 md:w-32">
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out" style={{width: `${((currentStepIndex+1)/steps.length)*100}%`}}></div>
                    </div>
                    <span className="text-slate-400 text-[10px] font-bold text-center uppercase tracking-wider">{currentStepIndex + 1} / {steps.length} Adım</span>
                </div>
            </div>

            {/* ORTA: Dinamik Puan Rozeti */}
            <div className="flex-1 flex justify-center mx-4">
                <motion.div 
                    key={internalProgress.score}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 text-amber-700 rounded-full shadow-inner"
                >
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-sm md:text-base font-black tracking-tight">{internalProgress.score}</span>
                </motion.div>
            </div>

            {/* SAĞ: Aksiyonlar */}
            <div className="flex gap-3 justify-end items-center">
                {isTeacher && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleNext} 
                        className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors h-10 rounded-full text-sm font-medium hidden sm:flex"
                        title="Bu adımı zorla geç"
                    >
                        Atla
                    </Button>
                )}

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                        size="sm" 
                        onClick={handleContinueOrNext} 
                        disabled={!isNextButtonEnabled || (isAnimating && !isTeacher)}
                        className={cn(
                            "bg-slate-900 hover:bg-slate-800 text-white shadow-lg transition-all h-10 rounded-full", 
                            showContinueButton ? "px-6" : "px-6",
                            "text-sm font-bold tracking-wide"
                        )}
                    >
                        {showContinueButton ? "Devam" : (currentStepIndex === steps.length - 1 ? (completeButtonText || "Bitir") : "İleri")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </motion.div>
            </div>
        </div>
      </div>
    );
}