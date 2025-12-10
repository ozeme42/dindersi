'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
    ArrowLeft, ArrowRight, PartyPopper, Repeat, BookOpen, Gamepad2, Lightbulb, 
    CheckCircle2, XCircle, LayersIcon, X, FilePenLine, Link as LinkIcon, Layers, Star, 
    Check, Target, Zap, Sparkles, Feather, Leaf, Sun, Moon, Puzzle, Skull, Crosshair, 
    Shuffle, FolderKanban, MousePointerClick, Trophy, BrainCircuit, Video, Loader2, 
    CheckCircle, ArrowDownUp, Search, Coins, ClipboardCheck, Minus, Plus 
} from 'lucide-react';
import type { 
    LessonStep, AnagramStep, SentenceScrambleStep, FitbStep, AccordionStep, IframeStep, 
    Topic, ActivityLinkStep, VisualStep, McqStep, TfStep, FlashcardStep, TrueFalseListStep, 
    HtmlSlideStep, ContentStep, ConceptMapStep, ConceptMapData, AnagramFlashcardStep, 
    ConceptExplanationStep, ObjectiveListStep, VideoStep, Question 
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from 'next/link';
import Image from "next/image";
import { playSound } from "@/lib/audio-service";
import { useAuth } from "@/context/auth-context";

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
};

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

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

// --- ALT BİLEŞENLER ---

function InteractiveTrueFalseList({ step, isFullscreen, answers, onAnswer, onAllAnswered }: { step: TrueFalseListStep, isFullscreen: boolean, answers: any, onAnswer: (index: number, val: boolean) => void, onAllAnswered: () => void }) {
    const isTeacher = useTeacherMode();
    const allAnswered = step.questions.every((_, index) => answers && answers[index] !== undefined);

    useEffect(() => {
        if (allAnswered) {
            onAllAnswered();
        }
    }, [allAnswered, onAllAnswered]);

    // GÜNCELLEME: Renk Temaları (Hem kart stili hem numara rengi)
    const colorThemes = [
        { card: 'border-cyan-500/50 bg-cyan-500/5 hover:bg-cyan-500/10', number: 'text-cyan-400' },
        { card: 'border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10', number: 'text-purple-400' },
        { card: 'border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10', number: 'text-amber-400' },
        { card: 'border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10', number: 'text-rose-400' },
        { card: 'border-lime-500/50 bg-lime-500/5 hover:bg-lime-500/10', number: 'text-lime-400' },
        { card: 'border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10', number: 'text-indigo-400' },
    ];

    return (
        <div className={cn("w-full h-full flex flex-col items-center justify-start p-2", isTeacher ? "max-w-full" : "max-w-4xl mx-auto")}>
             <div className={cn(
                "p-4 rounded-3xl shadow-lg bg-slate-900/90 backdrop-blur-xl border border-white/20 flex-shrink-0 w-full text-center", 
                isTeacher ? "py-4 mb-6 mt-2" : "p-3 md:p-6 mb-4"
            )}>
                <h2 className={cn("font-black text-white drop-shadow-lg", 
                    isTeacher ? "text-4xl md:text-5xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-3xl")
                )}>{step.title}</h2>
            </div>

            <div className={cn("w-full grid gap-4 pb-24", isTeacher ? "grid-cols-1 md:grid-cols-2 gap-8" : "grid-cols-1")}>
                {step.questions.map((q, index) => {
                    const userAnswer = answers && answers[index];
                    const isAnswered = userAnswer !== undefined;
                    const isCorrect = isAnswered && userAnswer.isCorrect;
                    
                    // Temayı seç
                    const theme = colorThemes[index % colorThemes.length];

                    return (
                        <div key={index} className={cn(
                            "rounded-3xl border-4 shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-md",
                            isTeacher ? "p-6 min-h-[16rem]" : "p-4 min-h-[10rem]",
                            // Eğer cevaplanmamışsa tema rengini kullan, cevaplanmışsa Yeşil/Kırmızı yap
                            isAnswered 
                                ? (isCorrect ? "border-emerald-500 bg-emerald-500/10" : "border-red-500 bg-red-500/10") 
                                : `border-white/10 ${theme.card}`
                        )}>
                            <div className="flex gap-4 mb-6">
                                {/* Numara rengini temadan al */}
                                <span className={cn("font-black", isTeacher ? "text-3xl" : "text-xl", isAnswered ? "text-white" : theme.number)}>
                                    {index + 1}.
                                </span>
                                <p className={cn("font-bold text-white leading-relaxed", isTeacher ? "text-3xl" : "text-lg")}>
                                    {q.statement}
                                </p>
                            </div>

                            <div className="flex gap-4 mt-auto">
                                <Button
                                    onClick={() => !isAnswered && onAnswer(index, true)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "flex-1 font-bold rounded-xl transition-all",
                                        isTeacher ? "h-20 text-2xl" : "h-12 text-lg",
                                        isAnswered && userAnswer.answer === true 
                                            ? (userAnswer.isCorrect ? "bg-emerald-600 hover:bg-emerald-600 opacity-100" : "bg-red-600 hover:bg-red-600 opacity-100")
                                            : "bg-slate-700 hover:bg-slate-600 text-white",
                                        isAnswered && userAnswer.answer !== true && "opacity-30"
                                    )}
                                >
                                    <CheckCircle className={cn("mr-2", isTeacher ? "h-8 w-8" : "h-5 w-5")} /> Doğru
                                </Button>
                                <Button
                                    onClick={() => !isAnswered && onAnswer(index, false)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "flex-1 font-bold rounded-xl transition-all",
                                        isTeacher ? "h-20 text-2xl" : "h-12 text-lg",
                                        isAnswered && userAnswer.answer === false 
                                            ? (userAnswer.isCorrect ? "bg-emerald-600 hover:bg-emerald-600 opacity-100" : "bg-red-600 hover:bg-red-600 opacity-100")
                                            : "bg-slate-700 hover:bg-slate-600 text-white",
                                        isAnswered && userAnswer.answer !== false && "opacity-30"
                                    )}
                                >
                                    <XCircle className={cn("mr-2", isTeacher ? "h-8 w-8" : "h-5 w-5")} /> Yanlış
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

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
    const summaryIcons = [Star, CheckCircle, Target, Zap, Sparkles, Feather, Leaf, Sun, Moon];
    const summaryColorClasses = [
        'bg-blue-600/20 border-blue-500/50 text-blue-100', 
        'bg-emerald-600/20 border-emerald-500/50 text-emerald-100', 
        'bg-purple-600/20 border-purple-500/50 text-purple-100', 
        'bg-rose-600/20 border-rose-500/50 text-rose-100', 
        'bg-amber-600/20 border-amber-500/50 text-amber-100', 
        'bg-indigo-600/20 border-indigo-500/50 text-indigo-100', 
        'bg-teal-600/20 border-teal-500/50 text-teal-100'
    ];

    useEffect(() => {
        if (isTeacher && visibleSentences.length > 0) {
            onAnimationStart?.();
        }
    }, [visibleSentences.length, isTeacher, onAnimationStart]);

    return (
        <div className={cn("w-full h-full flex flex-col gap-6 items-center justify-start p-2", isTeacher ? "max-w-[95%] mx-auto" : "max-w-4xl mx-auto")}>
            <div className={cn(
                "p-4 rounded-3xl shadow-lg bg-slate-900/90 backdrop-blur-xl border border-white/20 flex-shrink-0 w-full text-center", 
                isTeacher ? "py-4 mb-4 mt-2" : "p-3 md:p-6"
            )}>
                <h2 className={cn("font-black text-white drop-shadow-lg", 
                    isTeacher ? "text-4xl md:text-5xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-3xl")
                )}>{step.title}</h2>
            </div>
              
             <div className={cn(
                 "w-full gap-6 md:gap-8", 
                 isTeacher 
                    ? "grid grid-cols-2 auto-rows-min content-start pb-32" 
                    : "grid grid-cols-1 pb-16 md:pb-0"
             )}>
                {visibleSentences.map((sentence, index) => {
                    const Icon = summaryIcons[index % summaryIcons.length];
                    const colorClass = summaryColorClasses[index % summaryColorClasses.length];
                    
                    const shouldAnimate = isTeacher && index === visibleSentences.length - 1; 

                    return (
                        <div key={index} className={cn(
                            "rounded-3xl border-4 shadow-xl transition-all duration-500 flex items-center gap-6", 
                            colorClass,
                            isTeacher ? "p-8 animate-in zoom-in slide-in-from-bottom-4" : "p-4 animate-in slide-in-from-bottom-2"
                        )}>
                            <div className={cn("p-4 bg-white/10 rounded-2xl shadow-inner flex-shrink-0")}>
                                <Icon className={cn("text-white", isTeacher ? "h-12 w-12" : (isFullscreen ? "h-6 w-6 md:h-8 md:w-8" : "h-5 w-5 md:h-6 md:w-6"))} />
                            </div>
                            <div className={cn("flex-1 break-words leading-relaxed", isTeacher ? "text-3xl font-medium" : (isFullscreen ? "text-lg md:text-xl font-bold" : "text-sm md:text-lg font-bold"))}>
                                {shouldAnimate ? (
                                    <TypewriterText 
                                        content={sentence} 
                                        onComplete={() => onAnimationEnd?.()} 
                                        speed={40} 
                                    />
                                ) : (
                                    <div dangerouslySetInnerHTML={{ __html: sentence }} />
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

function ConceptExplanationPlayer({ items, isFullscreen, title }: { items: { concept: string, definition: string }[], isFullscreen: boolean, title: string }) {
    if (!items || items.length === 0) return null;
    const isTeacher = useTeacherMode();
      
    return (
        <div className={cn('flex flex-col h-full w-full items-center justify-start p-2', isTeacher ? "max-w-[98%] mx-auto pt-4" : "max-w-6xl mx-auto justify-center")}>
            <div className={cn("p-4 rounded-3xl shadow-lg bg-slate-900/90 backdrop-blur-xl border border-white/20 flex-shrink-0 mb-8 w-full text-center")}>
                <h2 className={cn("font-black text-white", isTeacher ? "text-4xl md:text-5xl" : (isFullscreen ? "text-2xl md:text-4xl" : "text-xl md:text-3xl"))}>{title}</h2>
            </div>
            
            <div className={cn(
                "w-full flex-grow grid gap-6", 
                isTeacher 
                    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 content-start" 
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
                {items.map((item, index) => (
                    <Card key={index} className={cn("bg-slate-800/80 backdrop-blur-md border-2 border-white/10 hover:border-cyan-400 hover:bg-slate-800 transition-all duration-300 group shadow-2xl hover:scale-105", isTeacher ? 'min-h-[220px]' : (isFullscreen ? 'min-h-[220px]' : 'min-h-[140px]'))}>
                        <CardHeader className={cn("border-b-2 border-white/10", isTeacher ? "p-6" : "p-3 md:p-6 pb-2 md:pb-4")}>
                            <CardTitle className={cn("font-black text-cyan-300 group-hover:text-cyan-100 transition-colors uppercase tracking-wider", isTeacher ? "text-3xl" : (isFullscreen ? "text-xl md:text-2xl" : "text-lg md:text-xl"))}>{item.concept}</CardTitle>
                        </CardHeader>
                        <CardContent className={cn("text-slate-100 font-medium leading-relaxed", isTeacher ? "text-2xl p-6 pt-6" : "pt-3 md:pt-6 p-3 md:p-6 text-sm md:text-base")}>
                            {item.definition}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function AnagramFlashcardPlayer({ step, flippedCards, onCardFlip, isFullscreen }: { 
    step: AnagramFlashcardStep, 
    flippedCards: Set<number>, 
    onCardFlip: (cardIndex: number, type: 'anagramFlashcard') => void,
    isFullscreen: boolean 
}) {
    const isTeacher = useTeacherMode();
    const cardColors = [
        'bg-rose-600 border-rose-800 text-white', 
        'bg-fuchsia-600 border-fuchsia-800 text-white', 
        'bg-cyan-600 border-cyan-800 text-white', 
        'bg-teal-600 border-teal-800 text-white', 
        'bg-lime-600 border-lime-800 text-white', 
        'bg-orange-600 border-orange-800 text-white'
    ];

    const getDynamicFontSize = (text: string) => {
        const baseSize = isTeacher ? 3.5 : (isFullscreen ? 2.5 : 1.75); 
        const maxLength = 8;
        if (text.length > maxLength) {
            const reductionFactor = Math.min(1.5, (text.length - maxLength) / 3);
            return `${Math.max(1.5, baseSize - reductionFactor)}rem`;
        }
        return `${baseSize}rem`;
    };

    return (
        <div className={cn("w-full p-4 flex flex-col justify-start", isTeacher ? "max-w-full pt-6" : "max-w-6xl mx-auto justify-center")}>
             <div className={cn("text-center mb-8", isTeacher ? "py-4" : "mb-8")}>
                 <h2 className={cn("font-black text-white drop-shadow-lg tracking-wide uppercase", isTeacher ? "text-5xl" : (isFullscreen ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"))}>{step.title}</h2>
             </div>
            <div className={cn("grid gap-6 pb-32", isTeacher ? "grid-cols-3 lg:grid-cols-4 gap-8" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5")}>
                {step.cards.map((card, index) => (
                    <div
                        key={index}
                        className={cn(
                            "rounded-3xl [perspective:1000px] cursor-pointer group hover:scale-105 transition-transform duration-300",
                            isTeacher ? "min-h-[16rem]" : (isFullscreen ? "min-h-[14rem]" : "min-h-[10rem]")
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
                            <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-3xl shadow-xl border-b-8 flex flex-wrap items-center justify-center p-4 backdrop-blur-md", cardColors[index % cardColors.length])}>
                                <h3 
                                    className="font-black tracking-widest break-all drop-shadow-md uppercase"
                                    style={{ fontSize: getDynamicFontSize(card.scrambledWord) }}
                                >
                                    {card.scrambledWord}
                                </h3>
                            </div>

                            {/* Back */}
                            <div className={cn(
                                "absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl shadow-xl border-b-8 border-emerald-800 flex flex-wrap items-center justify-center p-4 bg-emerald-600 text-white break-words overflow-hidden"
                            )}>
                                <h3 
                                    className="font-black break-all drop-shadow-md uppercase"
                                    style={{ fontSize: getDynamicFontSize(card.correctAnswer) }}
                                >
                                    {card.correctAnswer}
                                </h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function FlashcardPlayer({ step, flippedCards, onCardFlip, isFullscreen }: { 
    step: FlashcardStep, 
    flippedCards: Set<number>, 
    onCardFlip: (cardIndex: number, type: 'flashcard') => void,
    isFullscreen: boolean 
}) {
    const isTeacher = useTeacherMode();
    const cardColors = [
        'bg-indigo-600 border-indigo-800 text-white', 
        'bg-violet-600 border-violet-800 text-white', 
        'bg-blue-600 border-blue-800 text-white'
    ];

    return (
        <div className={cn("w-full p-4 flex flex-col justify-start", isTeacher ? "max-w-full pt-6" : "max-w-6xl mx-auto justify-center")}>
            <div className={cn("text-center mb-8", isTeacher ? "py-4" : "mb-8")}>
                <h2 className={cn("font-black text-center text-white drop-shadow-lg uppercase tracking-wider", isTeacher ? "text-5xl" : (isFullscreen ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"))}>{step.title}</h2>
            </div>
            <div className={cn("grid gap-8 pb-32", isTeacher ? "grid-cols-2 lg:grid-cols-3" : (isFullscreen ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"))}>
                {step.cards.map((card, index) => (
                    <FlashcardItem
                        key={index}
                        term={card.term}
                        definition={card.definition}
                        isFlipped={flippedCards.has(index)}
                        onFlip={() => onCardFlip(index, 'flashcard')}
                        colorClass={cardColors[index % cardColors.length]}
                        isFullscreen={isFullscreen}
                        isTeacher={isTeacher}
                    />
                ))}
            </div>
        </div>
    );
}

const FlashcardItem = ({ term, definition, isFlipped, onFlip, colorClass, isFullscreen, isTeacher }: { term: string, definition: string, isFlipped: boolean, onFlip: () => void, colorClass: string, isFullscreen?: boolean, isTeacher?: boolean }) => {
    return (
        <div
            className={cn(
                "rounded-3xl [perspective:1000px] cursor-pointer group hover:scale-105 transition-transform duration-300",
                isTeacher ? "min-h-[22rem]" : "min-h-[14rem]"
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
                <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-3xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] border-b-8 flex flex-col items-center justify-center p-6 backdrop-blur-md transition-all", colorClass)}>
                    <h3 className={cn("font-black uppercase drop-shadow-lg", isTeacher ? "text-5xl" : (isFullscreen ? "text-3xl" : "text-2xl"))}>{term}</h3>
                    {!isTeacher && <p className="mt-4 text-[10px] md:text-sm opacity-80 uppercase tracking-widest font-bold border-t border-white/30 pt-2 w-full">Çevir</p>}
                </div>

                {/* Back */}
                <div className={cn(
                    "absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] border-b-8 flex flex-col items-center justify-center p-6",
                    colorClass 
                )}>
                    <p className={cn("font-bold leading-relaxed", isTeacher ? "text-3xl" : (isFullscreen ? "text-xl" : "text-base md:text-lg"))}>{definition}</p>
                </div>
            </div>
        </div>
    );
};

// Interactive Anagram Component
function AnagramGame({ step, onAnswer, answer, isAnswerRevealed }: { step: AnagramStep, onAnswer: (answer: string) => void, answer: { answer: string, isCorrect: boolean } | null, isAnswerRevealed: boolean }) {
    const isTeacher = useTeacherMode();
    const initialLetters = useMemo(() => step.scrambledWord.toLocaleUpperCase('tr-TR').split('').map((letter, index) => ({ id: index, letter })), [step.scrambledWord]);
    const [bankLetters, setBankLetters] = useState(initialLetters);
    const [constructedLetters, setConstructedLetters] = useState<(typeof initialLetters[0])[]>([]);
    const [isWrong, setIsWrong] = useState(false);

    useEffect(() => {
        setBankLetters(step.scrambledWord.toLocaleUpperCase('tr-TR').split('').map((letter, index) => ({ id: index, letter })));
        setConstructedLetters([]);
        setIsWrong(false);
    }, [step]);
      
    const handleLetterClick = (clickedLetter: typeof initialLetters[0]) => {
        if (isAnswerRevealed) return;
        setConstructedLetters(prev => [...prev, clickedLetter]);
        setBankLetters(prev => prev.filter(l => l.id !== clickedLetter.id));
    };

    const handleConstructedClick = (clickedLetter: typeof initialLetters[0]) => {
        if (isAnswerRevealed) return;
        setConstructedLetters(prev => prev.filter(l => l.id !== clickedLetter.id));
        setBankLetters(prev => [...prev, clickedLetter].sort((a,b) => a.id - b.id));
    };

    const checkAnswer = useCallback(() => {
        const userAnswer = constructedLetters.map(l => l.letter).join('');
        onAnswer(userAnswer);
    }, [constructedLetters, onAnswer]);

    useEffect(() => {
        if (!isAnswerRevealed && constructedLetters.length === step.correctAnswer.length) {
            checkAnswer();
        }
    }, [constructedLetters, step.correctAnswer.length, checkAnswer, isAnswerRevealed]);
      
    return (
        <div className={cn("text-center space-y-8 flex flex-col items-center mx-auto p-4", isTeacher ? "max-w-full justify-start pt-10" : "max-w-4xl justify-center")}>
            <div className="bg-slate-800/50 p-6 md:p-10 rounded-3xl border-2 border-white/10 backdrop-blur-md w-full max-w-5xl">
                 <p className={cn("font-bold italic text-cyan-100", isTeacher ? "text-4xl leading-snug" : "text-lg md:text-3xl")}>"{step.definition}"</p>
            </div>
            
            <div className={cn("flex justify-center flex-wrap gap-4 p-8 rounded-3xl bg-slate-900/50 border-2 border-white/5 items-center w-full max-w-6xl", isTeacher ? "min-h-[12rem]" : "min-h-[6rem] md:min-h-[10rem]", isWrong && "animate-shake")}>
                {Array.from({ length: step.correctAnswer.length }).map((_, index) => {
                    const letterObj = constructedLetters[index];
                    return (
                        <div key={index} onClick={() => letterObj && !isAnswerRevealed && handleConstructedClick(letterObj)} className={cn(
                            "rounded-2xl flex items-center justify-center font-black cursor-pointer shadow-xl transition-all",
                            isTeacher ? "h-24 w-20 text-5xl border-b-8" : "h-14 w-10 text-2xl md:h-20 md:w-16 md:text-4xl md:rounded-2xl border-b-4 md:border-b-8",
                            isAnswerRevealed 
                                ? (answer?.isCorrect ? 'bg-emerald-500 text-white border-emerald-700' : 'bg-red-500 text-white border-red-700')
                                : letterObj 
                                    ? "bg-indigo-600 text-white border-indigo-800 active:border-b-0 active:translate-y-2"
                                    : "bg-slate-800/50 border-2 md:border-4 border-dashed border-slate-600 text-transparent"
                        )}>
                            {isAnswerRevealed ? step.correctAnswer.toLocaleUpperCase('tr-TR')[index] : letterObj?.letter}
                        </div>
                    );
                })}
            </div>
            {!isAnswerRevealed && (
                <div className="flex flex-wrap justify-center gap-4 p-4">
                    {bankLetters.map((item) => (
                        <Button 
                            key={item.id} 
                            onClick={() => handleLetterClick(item)} 
                            className={cn(
                                "font-black bg-slate-800 hover:bg-slate-700 text-white border-b-8 border-slate-950 active:border-b-0 active:translate-y-2",
                                isTeacher ? "h-24 w-20 text-5xl rounded-2xl" : "h-14 w-12 text-2xl md:h-16 md:w-14 md:text-3xl md:border-b-8"
                            )}
                        >
                            {item.letter}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Interactive Sentence Scramble Component
function SentenceScrambleGame({ step, onAnswer, onCorrectAndNext, answer, isAnswerRevealed }: { step: SentenceScrambleStep, onAnswer: (answer: string) => void, onCorrectAndNext: () => void, answer?: { answer: string, isCorrect: boolean } | null, isAnswerRevealed: boolean }) {
    const isTeacher = useTeacherMode();
    const initialWords = useMemo(() => step.scrambledSentence.split(' ').map((word, index) => ({ id: index, word })), [step.scrambledSentence]);
    const [bankWords, setBankWords] = useState(initialWords);
    const [constructedWords, setConstructedWords] = useState<(typeof initialWords[0])[]>([]);
    const [mistakenWordId, setMistakenWordId] = useState<number | null>(null);

    const wordColors = [
        'bg-gradient-to-br from-rose-500 to-pink-600 border-pink-800 shadow-pink-500/30',
        'bg-gradient-to-br from-indigo-500 to-blue-600 border-blue-800 shadow-blue-500/30',
        'bg-gradient-to-br from-emerald-500 to-green-600 border-green-800 shadow-green-500/30',
        'bg-gradient-to-br from-amber-500 to-orange-600 border-orange-800 shadow-orange-500/30',
        'bg-gradient-to-br from-cyan-500 to-sky-600 border-sky-800 shadow-sky-500/30',
        'bg-gradient-to-br from-fuchsia-500 to-purple-600 border-purple-800 shadow-purple-500/30',
        'bg-gradient-to-br from-lime-500 to-green-500 border-green-700 shadow-lime-500/30',
        'bg-gradient-to-br from-violet-500 to-indigo-500 border-indigo-700 shadow-violet-500/30'
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
            const timeoutId = setTimeout(() => { onCorrectAndNext(); }, 1200);
            return () => clearTimeout(timeoutId);
        }
    }, [answer, onCorrectAndNext]);

    return (
        <div className={cn("space-y-8 text-center mx-auto p-4", isTeacher ? "max-w-full justify-start pt-10" : "max-w-4xl justify-center")}>
            <p className={cn("text-slate-400 font-medium", isTeacher ? "text-3xl" : "text-lg md:text-xl")}>Kelimeleri doğru sıraya dizerek cümleyi oluşturun.</p>
             
             <div className={cn("flex flex-wrap justify-center items-center gap-4 bg-slate-900/50 border-2 border-white/10 p-8 rounded-3xl", isTeacher ? "min-h-[12rem]" : "min-h-[6rem] md:min-h-[10rem]")}>
                {constructedWords.map((wordObj, i) => (
                    <div 
                        key={wordObj.id} 
                        className={cn(
                            "rounded-xl font-bold shadow-lg animate-in zoom-in duration-300 text-white border-b-4",
                            wordColors[wordObj.id % wordColors.length], 
                            isTeacher ? "text-3xl px-8 py-4 rounded-2xl border-b-8" : "px-4 py-2 md:px-8 md:py-4 md:text-lg md:rounded-2xl md:border-b-4 text-sm"
                        )}
                    >
                        {wordObj.word}
                    </div>
                ))}
                {constructedWords.length === 0 && <span className={cn("text-slate-600 italic", isTeacher ? "text-2xl" : "text-sm md:text-base")}>Cümleniz burada görünecek...</span>}
            </div>

            {isAnswerRevealed ? (
                 <div className="text-center mt-10 animate-in slide-in-from-bottom-4">
                    <div className={cn("inline-flex items-center gap-4 bg-emerald-500/20 text-emerald-400 rounded-full border-2 border-emerald-500/50", isTeacher ? "px-10 py-6" : "px-6 py-3 md:px-10 md:py-5")}>
                        <CheckCircle2 className={cn(isTeacher ? "h-12 w-12" : "h-6 w-6")}/>
                        <span className={cn("font-bold", isTeacher ? "text-3xl" : "text-lg")}>Harika, doğru cümle!</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap justify-center gap-4 p-2">
                    {bankWords.map((item, index) => (
                        <div
                            key={item.id}
                            onClick={() => handleWordClick(item)}
                            className={cn(
                                "font-bold rounded-2xl transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-2 text-white shadow-xl cursor-pointer flex items-center justify-center",
                                wordColors[item.id % wordColors.length],
                                isTeacher ? "text-3xl h-20 px-8 border-b-8" : "text-sm h-12 px-4 md:text-lg md:h-16 md:px-6 md:rounded-2xl md:border-b-8",
                                mistakenWordId === item.id && "animate-shake bg-red-600 border-red-800 hover:bg-red-600 !bg-none"
                            )}
                        >
                            {mistakenWordId === item.id && <X className="h-4 w-4 md:h-8 md:w-8 mr-1 md:mr-2" />}
                            {item.word}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function HtmlSlidePlayer({ step, isFullscreen, onSlideScrolledToEnd }: { step: HtmlSlideStep, isFullscreen: boolean, onSlideScrolledToEnd: () => void }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
     useEffect(() => {
        const iframe = iframeRef.current;
        const handleIframeScroll = () => {
            if (iframe?.contentWindow) {
                const { scrollTop, scrollHeight, clientHeight } = iframe.contentWindow.document.documentElement;
                if (scrollHeight - scrollTop - clientHeight < 5) onSlideScrolledToEnd();
            }
        };
        const handleLoad = () => {
            const contentWindow = iframe?.contentWindow;
            if (contentWindow) {
                const checkScrollability = () => {
                    const { scrollHeight, clientHeight } = contentWindow.document.documentElement;
                    if (scrollHeight <= clientHeight + 5) onSlideScrolledToEnd();
                };
                checkScrollability();
                setTimeout(checkScrollability, 200);
                contentWindow.addEventListener('scroll', handleIframeScroll);
            }
        };
        if (iframe) iframe.addEventListener('load', handleLoad);
        return () => {
            if (iframe?.contentWindow) iframe.contentWindow.removeEventListener('scroll', handleIframeScroll);
             if (iframe) iframe.removeEventListener('load', handleLoad);
        };
    }, [onSlideScrolledToEnd, step]);

    return (
        <div className={cn("w-full h-full bg-white rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden", isFullscreen && "h-full")}>
            <iframe ref={iframeRef} srcDoc={step.htmlContent} className="w-full h-full border-0" title={step.title} sandbox="allow-scripts allow-same-origin" />
        </div>
    );
}

// --- ANA BİLEŞEN: StepContent ---

export function StepContent({ 
    step, answer, onAnswer, onCorrectAndNext, stepAnswers, topic, courseId, unitId, courseTitle, unitTitle, isFullscreen, 
    revealedSentencesCount, flippedCards, flippedAnagramCards, onCardFlip, onSlideScrolledToEnd, onMultiAnswer, onAllTfAnswered,
    onAnimationStart, onAnimationEnd 
}: any) {
    const isTeacher = useTeacherMode();

    const renderContent = () => {
        switch (step.type) {
            case 'content':
            case 'objectiveList':
                 return <ContentListPlayer step={step} revealedSentencesCount={revealedSentencesCount} isFullscreen={isFullscreen} onAnimationStart={onAnimationStart} onAnimationEnd={onAnimationEnd} />
            case 'conceptExplanation': {
                return <ConceptExplanationPlayer items={step.items} isFullscreen={isFullscreen} title={step.title} />
            }
             case 'accordion': {
                return <ContentListPlayer step={step} revealedSentencesCount={revealedSentencesCount} isFullscreen={isFullscreen} onAnimationStart={onAnimationStart} onAnimationEnd={onAnimationEnd} />
            }
            case 'visual':
                return (
                    <div className="flex justify-center items-center h-full p-4">
                         <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-black">
                             <Image src={(step as VisualStep).imageUrl} alt={step.title} width={1000} height={800} className="max-w-full max-h-[75vh] object-contain" />
                         </div>
                    </div>
                );
            case 'iframe':
                 return <div className="h-full p-4"><iframe src={(step as IframeStep).url} title={step.title} className={cn("w-full border-0 rounded-3xl shadow-2xl bg-white", "h-full")} allowFullScreen></iframe></div>
            case 'htmlSlide':
                 return <HtmlSlidePlayer step={step} isFullscreen={isFullscreen} onSlideScrolledToEnd={onSlideScrolledToEnd} />
            case 'activityLink':
                    const activityStep = step as ActivityLinkStep;
                    const activityIcons: Record<string, React.ElementType> = {
                        'bil-bakalim': Lightbulb, 'eslestirme': Puzzle, 'hafiza-kartlari': Layers, 'adam-asmaca': Skull,
                        'kavram-avi': Crosshair, 'kelime-avi': Search, 'hedefi-vur': MousePointerClick,
                        'cumle-olusturma': Shuffle, 'kategorilere-ayir': FolderKanban, 'milyoner-yarismasi': Trophy, 'soru-coz': BrainCircuit,
                        'dogru-yanlis-zinciri': LinkIcon, 'ben-kimim': BrainCircuit, 'acik-uclu-cevapla': FilePenLine, 'yazi-tura': Coins, 'deneme': ClipboardCheck, 'olay-siralama': ArrowDownUp
                    };
                    const Icon = activityIcons[activityStep.activityType.split('/').pop() || ''] || Gamepad2;
                    return (
                         <div className="flex flex-col items-center justify-center h-full p-8 text-white">
                             <div className={cn("bg-slate-800/50 rounded-full mb-8 border-4 border-slate-700 shadow-2xl animate-bounce-slow", isTeacher ? "p-12" : "p-10")}>
                                 <Icon className={cn("text-cyan-400", isTeacher ? "h-32 w-32" : "h-32 w-32")} />
                             </div>
                             <h3 className={cn("font-black mb-4", isTeacher ? "text-6xl" : "text-4xl")}>{activityStep.activityLabel}</h3>
                             <p className={cn("text-slate-400 mb-10 max-w-3xl text-center", isTeacher ? "text-2xl" : "text-lg")}>Bu etkinliği tamamlayarak bilgini test et!</p>
                             <Button asChild size={isTeacher ? "lg" : "lg"} className={cn("font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl shadow-xl hover:scale-105 transition-transform", isTeacher ? "h-24 px-16 text-3xl" : "h-16 px-10 text-xl")}>
                                 <Link href={`${activityStep.activityType}?courseId=${courseId}&unitId=${unitId}&topicId=${topic.id}&courseName=${encodeURIComponent(courseTitle)}&unitName=${encodeURIComponent(unitTitle)}&topicName=${encodeURIComponent(topic.title)}`}>
                                     <Gamepad2 className={cn("mr-4", isTeacher ? "h-8 w-8" : "h-5 w-5")}/> Etkinliğe Başla
                                 </Link>
                             </Button>
                        </div>
                    )
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
                        <div className={cn("w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-black", isTeacher ? "max-w-5xl" : "max-w-6xl")}>
                            <iframe
                                src={embedUrl}
                                title={videoStep.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        </div>
                         {videoStep.description && <p className={cn("mt-6 text-center text-slate-400 font-medium max-w-5xl", isTeacher ? "text-3xl" : "text-lg")}>{videoStep.description}</p>}
                    </div>
                );
            }
            case 'mcq': {
                const mcqStep = step as McqStep;
                
                const optionColors = [
                    'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-100',
                    'border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-100',
                    'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100',
                    'border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-100',
                ];

                return (
                    <div className={cn("w-full mx-auto flex flex-col justify-start min-h-[60vh] p-4", isTeacher ? "max-w-full pt-8" : "max-w-3xl justify-center")}>
                        <div className={cn("rounded-3xl shadow-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 mb-8 text-center relative overflow-hidden", isTeacher ? "p-8" : "p-10")}>
                           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-blue-500" />
                          <h3 className={cn("font-bold text-white leading-relaxed", isTeacher ? "text-4xl" : (isFullscreen ? "text-3xl" : "text-2xl"))}>{mcqStep.question}</h3>
                        </div>
                        <div className={cn("grid gap-6", isTeacher ? "grid-cols-2" : "grid-cols-1")}>
                            {mcqStep.options.map((option, index) => {
                                const isCorrect = option === mcqStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                const colorClass = optionColors[index % optionColors.length];

                                return (
                                    <Button
                                        key={index}
                                        variant="default"
                                        className={cn(
                                            "h-auto justify-start text-left whitespace-normal rounded-2xl border-2 transition-all duration-300 transform",
                                            "font-medium",
                                            isTeacher ? "text-3xl p-8" : (isFullscreen ? "p-6 text-xl" : "p-6 text-lg"),
                                            
                                            !answer ? colorClass : "",
                                            !answer && "hover:scale-[1.01] hover:shadow-lg",
                                            
                                            answer && isCorrect ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02] z-10" : "",
                                            answer && isSelected && !isCorrect ? "bg-red-600 border-red-400 text-white animate-shake" : "",
                                            answer && !isSelected && !isCorrect ? "bg-slate-900/50 border-transparent text-slate-600 opacity-30" : ""
                                        )}
                                        onClick={() => onAnswer(option)}
                                        disabled={!!answer}
                                    >
                                        <span className={cn(
                                            "flex shrink-0 items-center justify-center rounded-xl font-bold border", 
                                            isTeacher ? "h-14 w-14 text-2xl mr-6" : "h-8 w-8 text-sm mr-4",
                                            !answer ? "bg-black/20 border-white/20" : "bg-black/20 border-white/20"
                                        )}>
                                            {String.fromCharCode(65 + index)}
                                        </span>
                                        <span className="flex-1">{option}</span>
                                    </Button>
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
                         <div className={cn("rounded-3xl shadow-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 mb-10 relative overflow-hidden", isTeacher ? "p-10" : "p-10")}>
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500" />
                            <h3 className={cn("font-bold text-white leading-relaxed", isTeacher ? "text-5xl" : (isFullscreen ? "text-3xl" : "text-2xl"))}>{tfStep.statement}</h3>
                        </div>
                        <div className="flex gap-8 justify-center">
                            {["Doğru", "Yanlış"].map((option) => {
                                const isSelected = answer?.answer === option;
                                const isCorrect = option === correctOption;
                                return (
                                    <Button
                                        key={option}
                                        className={cn(
                                            "font-bold rounded-[2rem] transition-all duration-300 transform shadow-xl border-b-8 active:border-b-0 active:translate-y-2",
                                            isTeacher ? "h-40 w-64 text-4xl" : "h-32 w-48 text-2xl border-b-8",
                                            !answer && (option === "Doğru" ? "bg-slate-800 border-slate-950 text-green-400 hover:bg-slate-700" : "bg-slate-800 border-slate-950 text-red-400 hover:bg-slate-700"),
                                            answer && isCorrect && "bg-green-500 border-green-700 text-white scale-105 z-10 shadow-[0_0_30px_rgba(34,197,94,0.4)]",
                                            answer && isSelected && !isCorrect && "bg-red-500 border-red-700 text-white animate-shake",
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
                                );
                            })}
                        </div>
                    </div>
                );
            }
            case 'fitb': {
                const fitbStep = step as FitbStep;
                
                const optionColors = [
                    'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-100',
                    'border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-100',
                    'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100',
                    'border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-100',
                ];

                return (
                    <div className={cn("w-full mx-auto flex flex-col justify-start min-h-[60vh] p-4 text-center", isTeacher ? "max-w-6xl pt-10" : "max-w-5xl justify-center")}>
                        <div className={cn("rounded-3xl shadow-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 mb-10 relative overflow-hidden", isTeacher ? "p-10" : "p-10")}>
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
                          <h3 className={cn("font-bold text-white leading-relaxed tracking-wide", isTeacher ? "text-5xl" : (isFullscreen ? "text-4xl" : "text-2xl md:text-3xl"))}>
                              {fitbStep.sentenceWithBlank?.replace('___', '________')}
                          </h3>
                        </div>
                        <div className={cn("grid gap-6", isTeacher ? "grid-cols-2 gap-8" : "grid-cols-1 sm:grid-cols-2 gap-6")}>
                            {(fitbStep.options || []).map((option, index) => {
                                const isCorrect = option === fitbStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                const colorClass = optionColors[index % optionColors.length];

                                return (
                                    <Button
                                        key={index}
                                        variant="default"
                                        className={cn(
                                            "font-bold rounded-2xl border-2 active:border-b-0 active:translate-y-1 transition-all duration-200 transform",
                                            isTeacher ? "h-24 text-3xl" : "h-20 text-xl",
                                            
                                            !answer ? colorClass : "",
                                            !answer && "hover:scale-[1.01] hover:shadow-lg",

                                            answer && isCorrect ? "bg-emerald-600 border-emerald-800 text-white shadow-lg scale-[1.01] z-10" : "",
                                            answer && isSelected && !isCorrect ? "bg-red-600 border-red-800 text-white animate-shake" : "",
                                            answer && !isSelected && !isCorrect ? "bg-slate-900/50 border-transparent text-slate-600 opacity-30" : ""
                                        )}
                                        onClick={() => onAnswer(option)}
                                        disabled={!!answer}
                                    >
                                        <span className={cn(
                                            "flex shrink-0 items-center justify-center rounded-xl font-bold border mr-4", 
                                            isTeacher ? "h-12 w-12 text-xl" : "h-8 w-8 text-sm",
                                            !answer ? "bg-black/20 border-white/20" : "bg-black/20 border-white/20"
                                        )}>
                                            {String.fromCharCode(65 + index)}
                                        </span>
                                        {option}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                );
            }
            case 'anagram':
                return <AnagramGame step={step as AnagramStep} onAnswer={onAnswer} answer={answer} isAnswerRevealed={!!answer}/>;
            case 'sentenceScramble':
                return <SentenceScrambleGame step={step as SentenceScrambleStep} onAnswer={onAnswer} onCorrectAndNext={onCorrectAndNext} answer={answer} isAnswerRevealed={!!answer} />;
            
            default:
                 return <div className="text-center p-8 text-white">İçerik yüklenemedi.</div>;
        }
    }

    return (
        <div className="relative w-full h-full">
            {renderContent()}
        </div>
    );
}

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
}: LessonContentViewerProps & { onMultiAnswer?: any, onAllTfAnswered?: any }) {
    const { user } = useAuth();
    const isTeacher = useTeacherMode();
    
    const [isAnimating, setIsAnimating] = useState(false);
    const [revealedSentencesCount, setRevealedSentencesCount] = useState(1);
    const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
    const [flippedAnagramCards, setFlippedAnagramCards] = useState<Set<number>>(new Set());
    const [internalProgress, setInternalProgress] = useState<LocalProgress>(
        () => ({ answers: {}, score: 0 })
    );
    const steps = useMemo(() => topic?.steps || [], [topic]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        if (topic) {
            setInternalProgress({ answers: {}, score: 0 });
            setCurrentStepIndex(0);
            setIsFinished(false);
            setRevealedSentencesCount(1);
            setFlippedCards(new Set());
            setFlippedAnagramCards(new Set());
            setIsAnimating(false);
        }
    }, [topic]);

    useEffect(() => {
        if (topic) {
            onProgressUpdate(topic.id, internalProgress);
        }
    }, [internalProgress, onProgressUpdate, topic]);

    const currentStep = useMemo(() => steps[currentStepIndex], [steps, currentStepIndex]);
    
    const handleNext = useCallback(() => {
        if (!currentStep) return;
        if (['visual', 'iframe', 'activityLink', 'conceptMap', 'video', 'conceptExplanation'].includes(currentStep.type)) {
            if (internalProgress.answers[currentStepIndex] === undefined) {
                const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { completed: true } };
                setInternalProgress({ ...internalProgress, answers: newAnswers });
            }
        }
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
            setRevealedSentencesCount(1);
            setFlippedCards(new Set());
            setFlippedAnagramCards(new Set());
            setIsAnimating(false); 
        } else {
            setIsFinished(true);
            playSound('win');
            onTopicComplete(topic!.id, internalProgress.score);
        }
    }, [currentStep, currentStepIndex, steps.length, internalProgress, onTopicComplete, topic]);

    const handleAnswer = (answer: string | boolean) => {
        if (internalProgress.answers[currentStepIndex] !== undefined) return;
        let isCorrect = false;
        let points = 0;
        if (currentStep.type === 'mcq' || currentStep.type === 'fitb') {
            isCorrect = answer === (currentStep as McqStep).correctAnswer;
            points = isCorrect ? 40 : 0;
        } else if (currentStep.type === 'tf') {
            isCorrect = (answer === "Doğru") === (currentStep as TfStep).isTrue;
            points = isCorrect ? 20 : 0;
        } else if (currentStep.type === 'anagram') {
            isCorrect = (answer as string).toLocaleUpperCase('tr-TR') === (currentStep as AnagramStep).correctAnswer.toLocaleUpperCase('tr-TR');
            points = isCorrect ? 50 : 0;
        } else if (currentStep.type === 'sentenceScramble') {
             isCorrect = (answer as string) === (currentStep as SentenceScrambleStep).correctSentence;
             points = isCorrect ? 50 : 0;
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
    
    const onCorrectAndNext = useCallback(() => {
        const timeoutId = setTimeout(() => { handleNext(); }, 1200);
        return () => clearTimeout(timeoutId);
    }, [handleNext]);

    const handleSlideScrolledToEnd = useCallback(() => {
        if (internalProgress.answers && internalProgress.answers[currentStepIndex] === undefined) {
            const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { completed: true } };
            setInternalProgress(prev => ({ ...prev, answers: newAnswers }));
        }
    }, [currentStepIndex, internalProgress]);

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
            setRevealedSentencesCount(1);
            setFlippedCards(new Set());
            setFlippedAnagramCards(new Set());
            setIsAnimating(false);
        }
    }
    
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
        const points = correctCount * 20;
        const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { ...answersForStep, completed: true } };
        setInternalProgress(prev => ({ ...prev, score: prev.score + points, answers: newAnswers }));
    }

     const isNextButtonEnabled = useMemo(() => {
        if (!currentStep) return false;
        
        if (isTeacher) return true;

        const isPassiveStep = ['visual', 'iframe', 'activityLink', 'conceptMap', 'video', 'conceptExplanation'].includes(currentStep.type);
        if (isPassiveStep) return true;

        if (['content', 'objectiveList', 'accordion'].includes(currentStep.type)) {
             return true;
        }

        const isCardStep = ['flashcard', 'anagramFlashcard'].includes(currentStep.type);
        if (isCardStep) {
            const cards = (currentStep as FlashcardStep | AnagramFlashcardStep).cards;
            const cardSet = currentStep.type === 'flashcard' ? flippedCards : flippedAnagramCards;
            return cardSet.size === cards.length;
        }
        
        const answer = internalProgress.answers[currentStepIndex];
        if (currentStep.type === 'trueFalseList') return !!answer?.completed;
        
        return answer !== undefined && answer !== null;
    }, [currentStep, internalProgress.answers, currentStepIndex, flippedCards, flippedAnagramCards, isTeacher]);

    const handleContinueOrNext = () => {
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
            
            if (isListFullyRevealed) {
                handleNext();
            } else {
                setRevealedSentencesCount(prev => prev + 1);
            }
        } else {
            handleNext();
        }
    };

    const renderNavigation = () => {
        if (!currentStep) return null;
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
             <div className={cn("flex-shrink-0 flex justify-between items-center border-t border-white/5 bg-slate-900/80 backdrop-blur-md absolute bottom-0 w-full z-20", isTeacher ? "h-20 px-8 py-4" : "h-12 p-4")}>
                 <div className="flex gap-2">
                    {user?.role !== 'student' && <Button variant="secondary" size={isTeacher ? 'lg' : (isFullscreen ? 'lg' : 'default')} onClick={handleNext} className={isTeacher ? "text-xl h-14" : ""}>Atla</Button>}
                 </div>
                <div className="flex gap-4 md:gap-6">
                    <Button 
                        variant="outline" 
                        size={isTeacher ? 'lg' : (isFullscreen ? 'lg' : 'sm')} 
                        onClick={handlePrev} 
                        disabled={currentStepIndex === 0} 
                        className={cn("border-white/10 hover:bg-white/5 text-slate-300 hover:text-white", isTeacher ? "text-xl px-8 h-14" : "text-xs px-3 h-8")}
                    >
                        <ArrowLeft className={cn("mr-2", isTeacher ? "h-6 w-6" : "h-3 w-3")} />
                        Geri
                    </Button>
                    <Button 
                        size={isTeacher ? 'lg' : (isFullscreen ? 'lg' : 'sm')} 
                        onClick={handleContinueOrNext} 
                        disabled={!isNextButtonEnabled} 
                        className={cn(
                            "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30 transition-all",
                            showContinueButton ? "px-6 md:px-8" : "px-4 md:px-6",
                            isTeacher ? "text-xl px-10 h-14" : "text-xs h-8"
                        )}
                    >
                        {showContinueButton ? "Devam Et" : (currentStepIndex === steps.length - 1 ? (completeButtonText || "Konuyu Bitir") : "İleri")}
                        <ArrowRight className={cn("ml-2", isTeacher ? "h-6 w-6" : "h-3 w-3")} />
                    </Button>
                </div>
            </div>
        )
    };
    
    if (isFinished) {
         return (
            <div className="h-full flex items-center justify-center p-4 bg-slate-950">
                 <Card className={cn("w-full max-w-lg bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl text-center overflow-hidden animate-in zoom-in-95 duration-500", isTeacher ? "max-w-3xl" : "max-w-lg")}>
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-purple-500" />
                    <CardHeader className={isTeacher ? "pb-4 pt-10" : ""}>
                        <div className={cn("mx-auto bg-slate-800 rounded-full mb-2 shadow-lg ring-4 ring-slate-800/50", isTeacher ? "p-6" : "p-4")}>
                             <PartyPopper className={cn("text-yellow-400 animate-bounce", isTeacher ? "h-20 w-20" : "h-12 w-12")} />
                        </div>
                        <CardTitle className={cn("font-black text-white mt-4", isTeacher ? "text-5xl" : "text-3xl")}>Tebrikler!</CardTitle>
                        <CardDescription className={cn("text-slate-400", isTeacher ? "text-2xl" : "text-lg")}>Konuyu başarıyla tamamladın.</CardDescription>
                    </CardHeader>
                    <CardContent className={isTeacher ? "py-8" : "py-6"}>
                        <div className={cn("bg-slate-950/50 rounded-2xl border border-white/5", isTeacher ? "p-8" : "p-6")}>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-2">Kazanılan Puan</p>
                            <p className={cn("font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]", isTeacher ? "text-8xl" : "text-6xl")}>{internalProgress.score}</p>
                        </div>
                    </CardContent>
                    <CardFooter className={cn("flex-col gap-4 px-8", isTeacher ? "pb-10" : "pb-8")}>
                        <Button onClick={() => onTopicComplete(topic!.id, internalProgress.score)} className={cn("w-full font-bold rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-xl", isTeacher ? "h-20 text-3xl" : "h-14 text-lg")}>
                            {completeButtonText || "Ders Haritasına Dön"}
                        </Button>
                        <Button variant="ghost" onClick={() => { setIsFinished(false); setCurrentStepIndex(0); setInternalProgress({ answers: {}, score: 0 }); }} className={cn("text-slate-400 hover:text-white", isTeacher ? "text-xl h-14" : "")}>
                            <Repeat className="mr-2 h-4 w-4" /> Tekrar Et
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (!currentStep) {
        return (
            <div className="flex justify-center items-center h-full text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin mr-3 text-cyan-500" />
                <span className="text-lg font-medium">İçerik yükleniyor...</span>
            </div>
        );
    }

    return (
      <div className="h-full w-full flex flex-col relative overflow-hidden bg-slate-950">
        
        {/* HUD (Üst Bar) - Sadece tam ekran DEĞİLSE göster */}
        {!isFullscreen && (
            <div className={cn(
                "flex-shrink-0 border-b border-white/5 bg-slate-900/80 backdrop-blur-md z-20 flex justify-between items-center",
                isTeacher ? "px-6 py-2 h-16" : "px-3 py-2 h-12" 
            )}>
                 <div className="flex items-center gap-2 md:gap-4 flex-1">
                     <div className={cn("w-full bg-slate-800 rounded-full overflow-hidden border border-white/5", isTeacher ? "h-4 max-w-md" : "h-1.5 md:h-2.5 max-w-[100px] md:max-w-xs")}>
                        <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                        />
                     </div>
                     <span className={cn("font-bold text-slate-400 whitespace-nowrap", isTeacher ? "text-lg" : "text-[10px] md:text-xs")}>{currentStepIndex + 1} / {steps.length}</span>
                 </div>
                 <div className={cn("flex items-center gap-1.5 md:gap-2 bg-slate-800 rounded-xl border border-white/5", isTeacher ? "px-4 py-2" : "px-2 md:px-3 py-1 md:py-1.5")}>
                     <Star className={cn("text-yellow-400 fill-yellow-400", isTeacher ? "h-6 w-6" : "h-3 w-3 md:h-4 md:w-4")} />
                     <span className={cn("font-mono font-bold text-white", isTeacher ? "text-xl" : "text-xs md:text-sm")}>{internalProgress.score}</span>
                 </div>
            </div>
        )}

        <div className={cn(
          "flex-grow relative overflow-y-auto pb-24 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent bg-slate-950"
        )}>
             {/* İçerik Alanı Arka Plan Efektleri */}
             <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                 <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]" />
                 <div className="absolute bottom-[20%] right-[20%] w-64 h-64 bg-purple-500/5 rounded-full blur-[80px]" />
             </div>

           <div className="relative z-10 min-h-full flex flex-col justify-start py-4 md:py-8 px-4">
              <StepContent 
                step={currentStep}
                answer={internalProgress.answers[currentStepIndex]}
                onAnswer={handleAnswer}
                onCorrectAndNext={onCorrectAndNext}
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
              />
           </div>
        </div>
        
        {renderNavigation()}
        
      </div>
    );
}