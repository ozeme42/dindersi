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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import Link from 'next/link';
import { playSound } from "@/lib/audio-service";
import { useAuth } from "@/context/auth-context";

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
const FLASHCARD_THEMES = [
    { front: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-300 text-rose-950', back: 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-700 text-white shadow-[0_0_25px_rgba(225,29,72,0.4)]' },
    { front: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300 text-blue-950', back: 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)]' },
    { front: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-300 text-emerald-950', back: 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-700 text-white shadow-[0_0_25px_rgba(5,150,105,0.4)]' },
    { front: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-300 text-amber-950', back: 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-700 text-white shadow-[0_0_25px_rgba(217,119,6,0.4)]' },
    { front: 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-300 text-purple-950', back: 'bg-gradient-to-br from-purple-500 to-purple-600 border-purple-700 text-white shadow-[0_0_25px_rgba(147,51,234,0.4)]' },
    { front: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-300 text-cyan-950', back: 'bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-700 text-white shadow-[0_0_25px_rgba(8,145,178,0.4)]' },
    { front: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-300 text-indigo-950', back: 'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-700 text-white shadow-[0_0_25px_rgba(79,70,229,0.4)]' },
    { front: 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-300 text-orange-950', back: 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-700 text-white shadow-[0_0_25px_rgba(234,88,12,0.4)]' },
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
        </div>
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
             <div className={cn(
                "p-4 rounded-3xl shadow-xl bg-white/80 backdrop-blur-xl border border-slate-200 flex-shrink-0 w-full text-center", 
                isTeacher ? "py-4 mb-6 mt-2" : "p-3 md:p-6 mb-4"
            )}>
                <h2 className={cn("font-black text-slate-800", 
                    isTeacher ? "text-3xl md:text-4xl" : (isFullscreen ? "text-xl md:text-3xl" : "text-lg md:text-2xl")
                )}>{step.title}</h2>
            </div>

            <div className={cn("w-full grid gap-4 pb-24", isTeacher ? "grid-cols-1 md:grid-cols-2 gap-8" : "grid-cols-1")}>
                {step.questions.map((q, index) => {
                    const userAnswer = answers && answers[index];
                    const isAnswered = userAnswer !== undefined;
                    const isCorrect = isAnswered && userAnswer.isCorrect;
                    
                    const theme = colorThemes[index % colorThemes.length];

                    return (
                        <div key={index} className={cn(
                            "rounded-3xl border-2 shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-md",
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
                                <Button
                                    onClick={() => !isAnswered && onAnswer(index, true)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "flex-1 font-bold rounded-xl transition-all shadow-sm",
                                        isTeacher ? "h-16 text-xl" : "h-10 text-base",
                                        isAnswered && userAnswer.answer === true 
                                            ? (userAnswer.isCorrect ? "bg-emerald-500 hover:bg-emerald-600 opacity-100 text-white" : "bg-red-500 hover:bg-red-600 opacity-100 text-white")
                                            : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
                                        isAnswered && userAnswer.answer !== true && "opacity-30 grayscale"
                                    )}
                                >
                                    <CheckCircle className={cn("mr-2", isTeacher ? "h-6 w-6" : "h-4 w-4")} /> Doğru
                                </Button>
                                <Button
                                    onClick={() => !isAnswered && onAnswer(index, false)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "flex-1 font-bold rounded-xl transition-all shadow-sm",
                                        isTeacher ? "h-16 text-xl" : "h-10 text-base",
                                        isAnswered && userAnswer.answer === false 
                                            ? (userAnswer.isCorrect ? "bg-emerald-500 hover:bg-emerald-600 opacity-100 text-white" : "bg-red-500 hover:bg-red-600 opacity-100 text-white")
                                            : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
                                        isAnswered && userAnswer.answer !== false && "opacity-30 grayscale"
                                    )}
                                >
                                    <XCircle className={cn("mr-2", isTeacher ? "h-6 w-6" : "h-4 w-4")} /> Yanlış
                                </Button>
                            </div>
                        </div>
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
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [prevCount, setPrevCount] = useState(0);

    useEffect(() => {
        if (isTeacher && revealedSentencesCount > prevCount && revealedSentencesCount > 0) {
            setIsModalOpen(true);
        }
        setPrevCount(revealedSentencesCount);
    }, [revealedSentencesCount, prevCount, isTeacher]);
      
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

    // Renk Temaları
    const styles = [
        { bg: 'bg-gradient-to-br from-blue-50/95 to-white/90', border: 'border-blue-200', circleBorder: 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]', numberColor: 'text-blue-600', textColor: 'text-blue-800', iconColor: 'text-blue-500' },
        { bg: 'bg-gradient-to-br from-rose-50/95 to-white/90', border: 'border-rose-200', circleBorder: 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]', numberColor: 'text-rose-600', textColor: 'text-rose-800', iconColor: 'text-rose-500' },
        { bg: 'bg-gradient-to-br from-amber-50/95 to-white/90', border: 'border-amber-200', circleBorder: 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]', numberColor: 'text-amber-600', textColor: 'text-amber-800', iconColor: 'text-amber-500' },
        { bg: 'bg-gradient-to-br from-emerald-50/95 to-white/90', border: 'border-emerald-200', circleBorder: 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]', numberColor: 'text-emerald-600', textColor: 'text-emerald-800', iconColor: 'text-emerald-500' },
        { bg: 'bg-gradient-to-br from-purple-50/95 to-white/90', border: 'border-purple-200', circleBorder: 'border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]', numberColor: 'text-purple-600', textColor: 'text-purple-800', iconColor: 'text-purple-500' },
        { bg: 'bg-gradient-to-br from-cyan-50/95 to-white/90', border: 'border-cyan-200', circleBorder: 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]', numberColor: 'text-cyan-600', textColor: 'text-cyan-800', iconColor: 'text-cyan-500' },
        { bg: 'bg-gradient-to-br from-indigo-50/95 to-white/90', border: 'border-indigo-200', circleBorder: 'border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]', numberColor: 'text-indigo-600', textColor: 'text-indigo-800', iconColor: 'text-indigo-500' },
        { bg: 'bg-gradient-to-br from-orange-50/95 to-white/90', border: 'border-orange-200', circleBorder: 'border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]', numberColor: 'text-orange-600', textColor: 'text-orange-800', iconColor: 'text-orange-500' },
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in duration-500" onClick={() => setIsModalOpen(false)}>
                    <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 w-full max-w-5xl p-8 md:p-16 rounded-[3rem] shadow-[0_0_80px_rgba(168,85,247,0.4)] flex flex-col items-center text-center transform transition-all border-4 border-white/20" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
                            <X className="h-8 w-8" />
                        </button>
                        
                        <div className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight py-12 max-h-[70vh] overflow-y-auto drop-shadow-xl">
                             <TypewriterText 
                                content={latestSentence} 
                                onComplete={() => onAnimationEnd?.()} 
                                speed={150} 
                             />
                        </div>
                        
                        <Button size="lg" onClick={() => setIsModalOpen(false)} className="mt-8 h-16 px-12 text-2xl font-black rounded-2xl bg-white text-purple-700 hover:bg-slate-100 shadow-2xl transform transition-transform hover:scale-110 active:scale-95">
                            Devam Et
                        </Button>
                    </div>
                </div>
            )}
            
            {/* BAŞLIK */}
            <div className={cn(
                "relative z-20 p-6 rounded-3xl shadow-lg bg-white border border-slate-100 flex-shrink-0 w-full max-w-full text-center mb-8 overflow-hidden", 
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
            </div>
              
             <div className={cn(
                 "relative w-full pb-24 flex flex-col items-center", 
                 isTeacher ? "mt-4" : "mt-2"
             )}>
                <div className={cn(
                    "grid grid-cols-1 lg:grid-cols-2 w-full max-w-full px-2 md:px-4 gap-4 md:gap-6 pt-2 items-stretch"
                )}>
                    {visibleSentences.map((sentence, index) => {
                        const style = styles[index % styles.length]; 
                        const icons = decoIcons[index % decoIcons.length];

                        const shouldAnimate = isTeacher && index === visibleSentences.length - 1; 
                        const isLastItem = index === visibleSentences.length - 1;

                        return (
                            <div 
                                key={index} 
                                ref={isLastItem ? scrollRef : null}
                                className={cn(
                                    "relative w-full flex-shrink-0 z-10",
                                    isTeacher ? "animate-in slide-in-from-bottom-8 duration-500" : "animate-in slide-in-from-bottom-4 duration-500"
                                )}>
                                
                                <div className={cn(
                                    "relative w-full h-full py-4 px-6 md:py-6 md:px-8 rounded-2xl border-2 border-b-[6px] border-r-[4px] shadow-sm hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 flex flex-col md:flex-row justify-start items-center text-left backdrop-blur-xl gap-4",
                                    style.bg, style.border
                                )}>
                                    {/* Dairesel Sıra Numarası (Sol Tarafta Sabit) */}
                                    <div className={cn(
                                        "flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center bg-white/90 backdrop-blur-md border-2 shadow-sm",
                                        style.circleBorder
                                    )}>
                                        <span className={cn("font-black text-lg md:text-xl", style.numberColor)}>{index + 1}</span>
                                    </div>

                                    <div className={cn(
                                        "leading-relaxed font-black break-words flex-1 drop-shadow-sm z-10 relative", 
                                        style.textColor, 
                                        isTeacher ? "text-2xl md:text-3xl tracking-wide" : "text-xl md:text-2xl lg:text-3xl tracking-wide" 
                                    )}>
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
            <div className={cn("p-4 rounded-3xl shadow-xl bg-white/80 backdrop-blur-xl border border-slate-200 flex-shrink-0 mb-8 w-full text-center")}>
                <h2 className={cn("font-black text-slate-800", isTeacher ? "text-3xl md:text-4xl" : (isFullscreen ? "text-xl md:text-3xl" : "text-lg md:text-2xl"))}>{title}</h2>
            </div>
             
            <div className={cn(
                "w-full flex-grow grid gap-4 md:gap-6", 
                isTeacher 
                    ? "grid-cols-2 content-start" 
                    : "grid-cols-2"
            )}>
                {items.map((item, index) => {
                    const style = cardStyles[index % cardStyles.length];
                    return (
                        <Card key={index} className={cn(
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
             <div className={cn("text-center mb-8", isTeacher ? "py-4" : "mb-8")}>
                 <h2 className={cn("font-black text-center text-slate-800 drop-shadow-sm uppercase tracking-wide", isTeacher ? "text-4xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"))}>{step.title}</h2>
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
                                <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-t border-l border-white/60 border-b-8 flex flex-wrap items-center justify-center p-4 backdrop-blur-xl", theme.front)}>
                                    <h3 
                                        className="font-black tracking-[0.2em] break-all drop-shadow-sm uppercase mix-blend-color-burn opacity-80"
                                        style={{ fontSize: getDynamicFontSize(card.scrambledWord) }}
                                    >
                                        {card.scrambledWord}
                                    </h3>
                                    {!isTeacher && (
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center bg-white/40 px-3 py-1 rounded-full shadow-sm border border-white/50 backdrop-blur-md">
                                            <span className="text-[8px] opacity-75 uppercase tracking-[0.2em] font-extrabold mix-blend-multiply">Çevir</span>
                                        </div>
                                    )}
                                </div>

                                {/* Back */}
                                <div className={cn(
                                    "absolute w-full h-full [backface-visibility:hidden] rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-t border-l border-white/30 border-b-8 flex flex-wrap items-center justify-center p-4 break-words overflow-hidden backdrop-blur-xl",
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
                <h2 className={cn("font-black text-center text-slate-800 drop-shadow-sm uppercase tracking-wider", isTeacher ? "text-4xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"))}>{step.title}</h2>
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

const FlashcardItem = ({ term, definition, isFlipped, onFlip, theme, isFullscreen, isTeacher }: { term: string, definition: string, isFlipped: boolean, onFlip: () => void, theme: any, isFullscreen?: boolean, isTeacher?: boolean }) => {
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
                <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-t border-l border-white/60 border-b-8 flex flex-col items-center justify-center p-6 backdrop-blur-xl transition-all", theme.front)}>
                    <h3 className={cn("font-black uppercase tracking-wider drop-shadow-sm", isTeacher ? "text-5xl" : (isFullscreen ? "text-3xl" : "text-2xl md:text-3xl"))}>{term}</h3>
                    {!isTeacher && (
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-center bg-white/40 px-5 py-1.5 rounded-full shadow-sm border border-white/50 backdrop-blur-md">
                            <span className="text-[9px] md:text-[11px] opacity-75 uppercase tracking-[0.3em] font-extrabold mix-blend-multiply">Dokun & Çevir</span>
                        </div>
                    )}
                </div>

                {/* Back */}
                <div className={cn(
                    "absolute w-full h-full [backface-visibility:hidden] rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-t border-l border-white/30 border-b-8 flex flex-col items-center justify-center p-8 backdrop-blur-xl",
                    theme.back 
                )} style={{ transform: "rotateY(180deg)" }}>
                    <p className={cn("font-semibold leading-relaxed tracking-wide drop-shadow-md", isTeacher ? "text-3xl" : (isFullscreen ? "text-xl" : "text-base md:text-lg"))}>{definition}</p>
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
            <div className="bg-white/60 p-4 md:p-10 rounded-3xl border border-white shadow-xl backdrop-blur-md w-full max-w-5xl text-center">
                 <p className={cn("font-bold italic text-slate-700", isTeacher ? "text-3xl leading-snug" : "text-lg md:text-2xl")}>"{step.definition}"</p>
            </div>
             
            {/* CEVAP ALANI */}
            <div className={cn(
                "flex flex-wrap justify-center items-center gap-x-4 gap-y-2 md:gap-x-8 md:gap-y-4 p-4 md:p-8 rounded-3xl bg-white/40 border border-white/50 shadow-inner w-full max-w-6xl", 
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
                                                "bg-white active:translate-y-1 active:border-b-0",
                                                // Cevap açıldıysa YEŞİL, değilse İNDİGO
                                                isAnswerRevealed 
                                                    ? "bg-emerald-100 text-emerald-600 border-emerald-300" 
                                                    : "text-indigo-600 border-indigo-200"
                                              )
                                            : "bg-slate-200/50 border-slate-300 text-transparent border-dashed border-2"
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
                                    shakingLetterId === item.id && "animate-shake bg-red-500 border-red-700 text-white hover:bg-red-600 !bg-none"
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
                 <div className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm bg-white/50 px-3 py-1 rounded-full">
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
            const timeoutId = setTimeout(() => { onCorrectAndNext(); }, 1500); // Süre biraz uzatıldı
            return () => clearTimeout(timeoutId);
        }
    }, [answer, onCorrectAndNext]);

    return (
        <div className={cn("space-y-8 text-center mx-auto p-4", isTeacher ? "max-w-full justify-start pt-10" : "max-w-4xl justify-center")}>
            <p className={cn("text-slate-500 font-medium", isTeacher ? "text-2xl" : "text-lg md:text-xl")}>Kelimeleri doğru sıraya dizerek cümleyi oluşturun.</p>
             
             <div className={cn("flex flex-wrap justify-center items-center gap-4 bg-white/50 border border-white shadow-inner p-8 rounded-3xl", isTeacher ? "min-h-[12rem]" : "min-h-[6rem] md:min-h-[10rem]")}>
                {constructedWords.map((wordObj, i) => (
                    <div 
                        key={wordObj.id} 
                        className={cn(
                            "rounded-xl font-bold shadow-md animate-in zoom-in duration-300 border-b-4",
                            wordColors[wordObj.id % wordColors.length], 
                            isTeacher ? "text-2xl px-6 py-3 rounded-2xl border-b-8" : "px-4 py-2 md:px-6 md:py-3 md:text-lg md:rounded-2xl md:border-b-4 text-sm"
                        )}
                    >
                        {wordObj.word}
                    </div>
                ))}
                {constructedWords.length === 0 && <span className={cn("text-slate-400 italic", isTeacher ? "text-xl" : "text-sm md:text-base")}>Cümleniz burada görünecek...</span>}
            </div>

            {isAnswerRevealed ? (
                 <div className="text-center mt-10 animate-in slide-in-from-bottom-4">
                    <div className={cn("inline-flex items-center gap-4 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200", isTeacher ? "px-8 py-4" : "px-6 py-3 md:px-8 md:py-4")}>
                        <CheckCircle2 className={cn(isTeacher ? "h-10 w-10" : "h-6 w-6")}/>
                        <span className={cn("font-bold", isTeacher ? "text-2xl" : "text-lg")}>Harika, doğru cümle!</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap justify-center gap-4 p-2">
                    {bankWords.map((item, index) => (
                        <div
                            key={item.id}
                            onClick={() => handleWordClick(item)}
                            className={cn(
                                "font-bold rounded-2xl transition-all duration-200 border-b-8 active:border-b-0 active:translate-y-2 shadow-lg cursor-pointer flex items-center justify-center hover:-translate-y-1",
                                wordColors[item.id % wordColors.length],
                                isTeacher ? "text-2xl h-20 px-6" : "text-lg h-16 px-6 md:text-xl md:h-16 md:px-8",
                                mistakenWordId === item.id && "animate-shake bg-red-500 border-red-700 text-white hover:bg-red-600 !bg-none"
                            )}
                        >
                            {mistakenWordId === item.id && <X className="h-8 w-8 mr-2" />}
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

// 10. DrawingCanvas (GELİŞMİŞ - TEK TANIM)
function DrawingCanvas({ stepIndex }: { stepIndex: number }) {
    const isTeacher = useTeacherMode();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPenMode, setIsPenMode] = useState(false);
    const [isPaletteVisible, setIsPaletteVisible] = useState(true); // YENİ: Palet görünürlük kontrolü
    
    // Araçlar: 'pen', 'highlighter', 'eraser'
    const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
    const [color, setColor] = useState('#facc15'); // Varsayılan Kırmızı
    const [lineWidth, setLineWidth] = useState(4); // Varsayılan orta kalınlık
    const [history, setHistory] = useState<ImageData[]>([]);
    
    // Sayfa bazlı hafıza
    const savedDrawings = useRef<{ [key: number]: ImageData }>({});
    const prevStepIndexRef = useRef(stepIndex);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const pointsRef = useRef<{ x: number, y: number }[]>([]);

    // Palet görünürlüğünü resetle
    useEffect(() => {
        if (isPenMode) setIsPaletteVisible(true);
    }, [isPenMode]);

    // Canvas Boyutlandırma (High DPI desteği)
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                let savedData = null;
                if(context) {
                    try { savedData = context.getImageData(0,0, canvas.width, canvas.height); } catch(e){}
                }

                const dpr = window.devicePixelRatio || 1;
                canvas.style.width = window.innerWidth + 'px';
                canvas.style.height = window.innerHeight + 'px';
                
                canvas.width = window.innerWidth * dpr;
                canvas.height = window.innerHeight * dpr;

                if (context) {
                    context.scale(dpr, dpr);
                    if (savedData) {
                        context.putImageData(savedData, 0, 0);
                    }
                }
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sayfa Değişimi Yönetimi
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            const dpr = window.devicePixelRatio || 1;
            savedDrawings.current[prevStepIndexRef.current] = ctx.getImageData(0, 0, canvas.width, canvas.height);
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
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

        // Maksimum 10 adım geri alma
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
            saveHistory(); // Temizlemeden önce kaydet
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            ctx?.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        }
    };

    // --- GELİŞMİŞ ÇİZİM MANTIĞI ---

    const getCoords = (e: React.PointerEvent) => {
        return { x: e.clientX, y: e.clientY };
    };

    const applyToolSettings = (ctx: CanvasRenderingContext2D, pressure: number) => {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        let dynamicWidth = lineWidth;
        // Basınç duyarlılığı (tablet/kalem için), mouse pressure genelde 0.5'tir
        if (pressure && pressure !== 0.5) {
             dynamicWidth = lineWidth * (pressure * 2.5);
        }

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = dynamicWidth * 3;
            ctx.globalAlpha = 1.0;
        } else if (tool === 'highlighter') {
            ctx.globalCompositeOperation = 'multiply';
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = dynamicWidth * 4;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = dynamicWidth;
        }
    };

    const startDrawing = (e: React.PointerEvent) => {
        if (!isPenMode) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        saveHistory();
        
        const { x, y } = getCoords(e);
        setIsDrawing(true);
        pointsRef.current = [{ x, y }];

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            applyToolSettings(ctx, e.pressure);
            
            // Nokta koyma efekti
            ctx.beginPath();
            ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.PointerEvent) => {
        if (!isDrawing || !isPenMode || !canvasRef.current) return;
        
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoords(e);
        pointsRef.current.push({ x, y });
        const pts = pointsRef.current;

        applyToolSettings(ctx, e.pressure);

        if (pts.length >= 3) {
            const last2 = pts[pts.length - 2];
            const last1 = pts[pts.length - 1];
            // Kavisli pürüzsüz çizim (Quadratic Curve)
            const xc = (last2.x + last1.x) / 2;
            const yc = (last2.y + last1.y) / 2;

            ctx.quadraticCurveTo(last2.x, last2.y, xc, yc);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(xc, yc);
        } else {
             // Sadece iki nokta varken düz çizgi
             ctx.lineTo(x, y);
             ctx.stroke();
             ctx.beginPath();
             ctx.moveTo(x, y);
        }
    };

    const stopDrawing = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        setIsDrawing(false);
        pointsRef.current = [];
        const ctx = canvasRef.current?.getContext('2d');
        if(ctx) {
             ctx.closePath();
             ctx.globalCompositeOperation = 'source-over';
             ctx.globalAlpha = 1.0;
        }
    };

    if (!isTeacher) return null;

    return (
        <>
            {/* Canvas Katmanı */}
            <canvas
                ref={canvasRef}
                className={cn(
                    "fixed inset-0 z-[100]",
                    isPenMode ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
                )}
                style={{ touchAction: 'none' }}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
            />

            {/* Araç Çubuğu - YUKARI TAŞINDI VE KÜÇÜLTÜLDÜ */}
            <div className="fixed bottom-32 right-4 z-[101] flex flex-col items-end gap-3">
                
                {isPenMode && (
                    <>
                        {isPaletteVisible ? (
                            <div className="flex flex-col items-center gap-2 bg-white/95 p-2 rounded-xl border border-slate-200 shadow-xl animate-in slide-in-from-bottom-5 fade-in zoom-in backdrop-blur-sm w-44">
                                
                                {/* Header - Küçültme Butonu */}
                                <div className="w-full flex justify-between items-center border-b border-slate-200 pb-2 mb-1 px-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Araçlar</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-slate-100 text-slate-400" onClick={() => setIsPaletteVisible(false)}>
                                        <Minimize2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                {/* Renk Seçimi */}
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

                                {/* Kalınlık Ayarı */}
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

                                {/* Araçlar */}
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

                                {/* Aksiyonlar */}
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

                {/* Ana Toggle Butonu - KÜÇÜLTÜLDÜ */}
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
                                    "pointer-events-auto cursor-grab flex items-center justify-center text-center p-4 md:p-5 rounded-[2rem] border-2 backdrop-blur-xl transition-colors select-none",
                                    isCenter 
                                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-purple-300 text-white shadow-[0_10px_30px_rgba(168,85,247,0.5)] min-w-[150px] min-h-[70px] z-20 border-b-[8px]" 
                                        : "bg-white/95 border-slate-200 text-slate-800 shadow-[0_10px_20px_rgba(0,0,0,0.08)] min-w-[120px] min-h-[60px] hover:border-indigo-300 hover:shadow-[0_15px_30px_rgba(99,102,241,0.3)] z-10 border-b-[6px]"
                                )}
                            >
                                <motion.div
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <span className={cn("font-black tracking-wider break-words", isCenter ? "text-xl drop-shadow-md" : "text-sm md:text-base")}>
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
                    'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-700', 
                    'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700', 
                    'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700', 
                    'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700'
                ];
                return (
                    <div className={cn("w-full mx-auto flex flex-col justify-start min-h-[60vh] p-4", isTeacher ? "max-w-full pt-8" : "max-w-3xl justify-center")}>
                        <div className={cn("rounded-3xl shadow-xl bg-white/80 backdrop-blur-xl border border-slate-200 mb-8 text-center relative overflow-hidden", isTeacher ? "p-8" : "p-10")}>
                           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-500" />
                          <h3 className={cn("font-bold text-slate-800 leading-relaxed drop-shadow-sm", isTeacher ? "text-4xl" : (isFullscreen ? "text-3xl" : "text-2xl"))}>{mcqStep.question}</h3>
                        </div>
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
                                        className={cn(
                                            "w-full h-full",
                                            answer && isSelected && !isCorrect && "animate-shake"
                                        )}
                                    >
                                        <Button
                                            variant="default"
                                            className={cn(
                                                "w-full h-auto justify-start text-left whitespace-normal rounded-2xl border-2 transition-all duration-300 transform",
                                                "font-medium shadow-sm",
                                                isTeacher ? "text-3xl p-8" : (isFullscreen ? "p-6 text-xl" : "p-6 text-lg"),
                                                !answer ? colorClass : "",
                                                !answer && "hover:shadow-lg",
                                                answer && isCorrect ? "bg-emerald-500 border-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.8)] z-10" : "",
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
                          <div className={cn(
                             "rounded-3xl shadow-xl backdrop-blur-xl mb-10 relative overflow-hidden transition-all duration-500",
                             "bg-white border-2 border-slate-100",
                             "shadow-[0_0_30px_rgba(168,85,247,0.1)]",
                             isTeacher ? "p-10" : "p-10"
                           )}>
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-400 to-pink-500" />
                             <h3 className={cn("font-bold text-slate-800 leading-relaxed drop-shadow-sm", isTeacher ? "text-5xl" : (isFullscreen ? "text-3xl" : "text-2xl"))}>{tfStep.statement}</h3>
                        </div>
                        <div className="flex gap-8 justify-center">
                            {["Doğru", "Yanlış"].map((option) => {
                                const isSelected = answer?.answer === option;
                                const isCorrect = option === correctOption;
                                return (
                                    <motion.div 
                                        key={option}
                                        whileHover={!answer ? { scale: 1.05 } : {}}
                                        whileTap={!answer ? { scale: 0.95 } : {}}
                                        className={cn(answer && isSelected && !isCorrect && "animate-shake")}
                                    >
                                        <Button
                                            className={cn(
                                                "font-bold rounded-[2rem] transition-all duration-300 transform shadow-lg border-b-8 active:border-b-0 active:translate-y-2",
                                                isTeacher ? "h-40 w-64 text-4xl" : "h-32 w-48 text-2xl border-b-8",
                                                !answer && (option === "Doğru" ? "bg-white border-slate-200 text-green-600 hover:bg-green-50" : "bg-white border-slate-200 text-red-600 hover:bg-red-50"),
                                                answer && isCorrect && "bg-green-500 border-green-700 text-white shadow-[0_0_30px_rgba(34,197,94,0.6)] z-10",
                                                answer && isSelected && !isCorrect && "bg-red-500 border-red-700 text-white",
                                                answer && !isSelected && !isCorrect && "opacity-30 grayscale"
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
                        <div className={cn("rounded-3xl shadow-xl bg-white/80 backdrop-blur-xl border border-slate-200 mb-10 relative overflow-hidden", isTeacher ? "p-10" : "p-10")}>
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
                          <h3 className={cn("font-bold text-slate-800 leading-relaxed tracking-wide", isTeacher ? "text-5xl" : (isFullscreen ? "text-4xl" : "text-2xl md:text-3xl"))}>{fitbStep.sentenceWithBlank?.replace('___', '________')}</h3>
                        </div>
                        <div className={cn("grid gap-6", isTeacher ? "grid-cols-2 gap-8" : "grid-cols-1 sm:grid-cols-2 gap-6")}>
                            {(fitbStep.options || []).map((option, index) => {
                                const isCorrect = option === fitbStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                const colorClass = optionColors[index % optionColors.length];
                                return (
                                    <Button key={index} variant="default" className={cn("font-bold rounded-2xl border-2 active:border-b-0 active:translate-y-1 transition-all duration-200 transform shadow-sm", isTeacher ? "h-24 text-3xl" : "h-20 text-xl", !answer ? colorClass : "", !answer && "hover:scale-[1.01] hover:shadow-lg", answer && isCorrect ? "bg-emerald-500 border-emerald-700 text-white shadow-lg scale-[1.01] z-10" : "", answer && isSelected && !isCorrect ? "bg-red-500 border-red-700 text-white animate-shake" : "", answer && !isSelected && !isCorrect ? "bg-slate-100 border-transparent text-slate-400 opacity-50" : "")} onClick={() => onAnswer(option)} disabled={!!answer}>
                                            <span className={cn("flex shrink-0 items-center justify-center rounded-xl font-bold border mr-4", isTeacher ? "h-12 w-12 text-xl" : "h-8 w-8 text-sm", !answer ? "bg-white/50 border-black/5" : "bg-white/20 border-white/20")}>{String.fromCharCode(65 + index)}</span>
                                            {option}
                                    </Button>
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
            setIsFinished(true);
            playSound('win');
            onTopicComplete(topic!.id, internalProgress.score);
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
        // BURADA DEĞİŞİKLİK YAPILDI: Her doğru cevap için 20 yerine 100 puan
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
             <div className="h-full flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-800 gap-6">
                 <PartyPopper className="h-20 w-20 text-yellow-500 animate-bounce" />
                 <h1 className="text-4xl font-black">Ders Tamamlandı!</h1>
                 <p className="text-2xl text-cyan-600 font-bold">Toplam Puan: {internalProgress.score}</p>
                 <Button onClick={() => onTopicComplete(topic!.id, internalProgress.score)} className="bg-cyan-600 hover:bg-cyan-500 text-white text-xl px-10 py-6 rounded-2xl shadow-lg">
                     {completeButtonText || 'Bitir'}
                 </Button>
             </div>
         )
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
      <div className="h-full w-full flex flex-col bg-slate-50 overflow-hidden relative">
        
        <DrawingCanvas stepIndex={currentStepIndex} />

        {showResumeDialog && (
            <div className="absolute inset-0 z-[60] bg-white/60 backdrop-blur-md flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                <Card className="w-full max-w-sm bg-white border-slate-200 text-slate-800 shadow-2xl animate-in zoom-in-95">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl"><History className="h-6 w-6 text-cyan-500" />Kaldığın Yerden Devam Et</CardTitle>
                        <CardDescription>Daha önce bu konuda <strong>{savedStepIndex! + 1}. adıma</strong> kadar gelmişsin.</CardDescription>
                    </CardHeader>
                    <CardFooter className="flex flex-col gap-3">
                        <Button onClick={handleResume} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white text-lg py-6 rounded-xl shadow-md">Evet, Devam Et</Button>
                        <Button onClick={handleRestart} variant="ghost" className="w-full text-slate-500 hover:text-slate-800 hover:bg-slate-100">Hayır, Baştan Başla</Button>
                    </CardFooter>
                </Card>
            </div>
        )}

        {/* --- İÇERİK ALANI --- */}
        <div className={cn("flex-1 relative w-full", isFullWidthStep ? "overflow-hidden" : `overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent ${isTeacher && isFullscreen && !isImmersiveStep ? 'pb-32' : 'pb-24'}`)}>
             {!isFullWidthStep && (
                 <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                     <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-blue-300/30 rounded-full blur-[80px]" />
                     <div className="absolute bottom-[20%] right-[20%] w-64 h-64 bg-purple-300/30 rounded-full blur-[80px]" />
                 </div>
             )}

           <div className={cn("relative z-10 w-full h-full flex flex-col justify-start", !isFullWidthStep && "py-4 md:py-8 px-4 lg:px-8")}>
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
                    className="rounded-full w-12 h-12 bg-white/90 shadow-xl border border-slate-200 hover:bg-white text-slate-700 hover:scale-110 transition-all"
                 >
                    <ChevronUp className="w-6 h-6" />
                 </Button>
            </div>
        )}

        {/* ALT BAR */}
        <div className={cn(
            "flex-shrink-0 flex justify-between items-center z-30 transition-all duration-300 ease-in-out",
            hideUI ? "h-0 p-0 overflow-hidden border-0 opacity-0 pointer-events-none" : "h-10 px-3 opacity-100",
            !hideUI && "bg-white/90 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]",
            "relative"
        )} onClick={(e) => e.stopPropagation()}>
            
            {/* GİZLEME BUTONU (Sadece Öğretmen & Bar Açıkken) */}
            {isTeacher && !hideUI && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40">
                    <Button 
                        onClick={() => setHideUI(true)}
                        size="sm"
                        className="h-5 w-8 rounded-t-md rounded-b-none bg-white/90 border-t border-x border-slate-200 hover:bg-white shadow-sm"
                    >
                        <ChevronDown className="h-3 w-3 text-slate-500" />
                    </Button>
                </div>
            )}

            <div className="flex gap-2">
                 <Button variant="ghost" size="icon" onClick={handlePrev} disabled={currentStepIndex === 0} className="rounded-full w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100"><ArrowLeft className="w-4 h-4"/></Button>
                 {isTeacher && (
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="h-8 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-full border-slate-200">
                        <Repeat className="w-3 h-3 mr-1"/> Yenile
                    </Button>
                 )}
            </div>

            <div className="flex items-center justify-center gap-3 bg-slate-100/50 px-3 py-1.5 rounded-full">
                <Select value={currentStepIndex.toString()} onValueChange={(val) => {
                     const targetIndex = parseInt(val, 10);
                     if (!isNaN(targetIndex)) setCurrentStepIndex(targetIndex);
                }}>
                    <SelectTrigger className="h-6 px-2 py-0 bg-transparent border-0 shadow-none text-[11px] font-bold text-slate-500 hover:text-slate-800 focus:ring-0 focus:ring-offset-0 w-auto gap-1">
                        <SelectValue placeholder={`${currentStepIndex + 1} / ${steps.length}`} />
                    </SelectTrigger>
                    <SelectContent>
                        {steps.map((s, i) => (
                            <SelectItem key={i} value={i.toString()}>
                                Sayfa {i + 1}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                    {steps.map((_, idx) => (
                        <div key={idx} className={cn("h-1 rounded-full transition-all duration-500", idx === currentStepIndex ? "w-5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" : (internalProgress.answers[idx]?.completed ? "w-1.5 bg-emerald-400" : "w-1 bg-slate-200"))} />
                    ))}
                </div>
            </div>

            <div className="flex gap-1.5 items-center">
                 {/* Puan Rozeti */}
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 text-amber-700 rounded-full shadow-sm mr-2">
                     <Trophy className="w-3.5 h-3.5 text-amber-500" />
                     <div className="relative h-4 w-6 overflow-hidden">
                         <AnimatePresence mode="popLayout">
                             <motion.span
                                 key={internalProgress.score}
                                 initial={{ y: 20, opacity: 0 }}
                                 animate={{ y: 0, opacity: 1 }}
                                 exit={{ y: -20, opacity: 0 }}
                                 transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                 className="absolute inset-0 text-xs font-black tracking-tight text-center"
                             >
                                 {internalProgress.score}
                             </motion.span>
                         </AnimatePresence>
                     </div>
                 </div>

                 {isTeacher && (
                     <Button variant="ghost" size="sm" onClick={handleNext} className="h-8 px-3 text-xs font-bold text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors">
                         Atla
                     </Button>
                 )}
                 <Button onClick={handleContinueOrNext} disabled={!isNextButtonEnabled || currentStepIndex === steps.length - 1 && isFinished} className={cn("h-8 px-5 rounded-full text-xs font-bold shadow-sm transition-all duration-300", isNextButtonEnabled ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5" : "bg-slate-100 text-slate-400")}>
                      {currentStepIndex === steps.length - 1 ? (completeButtonText || 'Bitir') : 'Devam Et'}
                 </Button>
            </div>
        </div>
      </div>
    );
}