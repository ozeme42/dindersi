'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, PartyPopper, Repeat, Brain, BookOpen, Gamepad2, Lightbulb, CheckCircle2, XCircle, LayersIcon, X, FilePenLine, Link as LinkIcon, Layers, Star, Check, Target, Zap, Sparkles, Feather, Leaf, Sun, Moon, Puzzle, Skull, Crosshair, Shuffle, FolderKanban, MousePointerClick, Trophy, BrainCircuit, Bug, Video, Loader2, CheckCircle, ArrowDownUp, Search, Coins, ClipboardCheck, Play } from 'lucide-react';
import type { LessonStep, AnagramStep, SentenceScrambleStep, FitbStep, AccordionStep, IframeStep, Topic, ActivityLinkStep, VisualStep, McqStep, TfStep, FlashcardStep, TrueFalseListStep, HtmlSlideStep, ContentStep, ConceptMapStep, ConceptMapData, AnagramFlashcardStep, ConceptExplanationStep, ObjectiveListStep, VideoStep } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from 'next/link';
import { playSound } from "@/lib/audio-service";
import { addQuestionToReviewList } from "@/app/student/tekrar-et/actions";
import type { Question } from '@/lib/types';
import Image from "next/image";
import { ErrorReportDialog } from "./error-report-dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
};

// --- GÖRSELLEŞTİRME BİLEŞENLERİ ---

function ContentListPlayer({ step, revealedSentencesCount, isFullscreen }: { step: ContentStep | ObjectiveListStep | AccordionStep, revealedSentencesCount: number, isFullscreen?: boolean }) {
    const sentences = useMemo(() => {
        let items: ({ __html: string } | string)[] = [];
        if (step.type === 'content') {
            if (typeof step.content !== 'string') return [];
            const doc = new DOMParser().parseFromString(`<div>${step.content}</div>`, 'text/html');
            const listItems = doc.querySelectorAll('li');
            if (listItems.length > 0) {
                items = Array.from(listItems).map(li => ({ __html: li.innerHTML }));
            } else {
                items = step.content.match(/[^.!?]+[.!?]+/g)?.map(s => ({ __html: s.trim() })) || [{ __html: step.content }];
            }
        } else if (step.type === 'objectiveList') {
            items = (step as ObjectiveListStep).items.map(item => ({ __html: item }));
        } else if (step.type === 'accordion') {
             items = (step as AccordionStep).items.map(item => `<strong>${item.title}:</strong> ${item.content}`);
        }
        return items.map(item => {
            if (typeof item === 'string') return { __html: item };
            return item;
        });
    }, [step]);
    
    const visibleSentences = sentences.slice(0, revealedSentencesCount);
    const summaryIcons = [Star, CheckCircle, Target, Zap, Sparkles, Feather, Leaf, Sun, Moon];
    // Modern Neon Renkler
    const summaryColorClasses = [
        'bg-blue-500/10 border-blue-500/30 text-blue-100', 
        'bg-emerald-500/10 border-emerald-500/30 text-emerald-100', 
        'bg-purple-500/10 border-purple-500/30 text-purple-100', 
        'bg-rose-500/10 border-rose-500/30 text-rose-100', 
        'bg-amber-500/10 border-amber-500/30 text-amber-100', 
        'bg-indigo-500/10 border-indigo-500/30 text-indigo-100', 
        'bg-teal-500/10 border-teal-500/30 text-teal-100'
    ];

    return (
        <div className="w-full h-full flex flex-col gap-6 items-center max-w-4xl mx-auto p-4">
            <div className="p-6 rounded-2xl shadow-lg bg-slate-900/80 backdrop-blur-md border border-white/10 flex-shrink-0 w-full text-center">
                <h2 className={cn("font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400", isFullscreen ? "text-4xl" : "text-3xl")}>{step.title}</h2>
            </div>
            
             <div className="w-full grid grid-cols-1 gap-4">
                {visibleSentences.map((sentence, index) => {
                    const Icon = summaryIcons[index % summaryIcons.length];
                    const colorClass = summaryColorClasses[index % summaryColorClasses.length];
                    return (
                        <div key={index} className={cn("p-5 rounded-2xl border flex items-start gap-4 shadow-lg animate-in slide-in-from-bottom-4 duration-500", colorClass)}>
                            <div className="p-2 bg-white/10 rounded-xl">
                                <Icon className={cn("flex-shrink-0", isFullscreen ? "h-8 w-8" : "h-6 w-6")} />
                            </div>
                            <div className={cn("flex-1 break-words leading-relaxed font-medium", isFullscreen ? "text-xl" : "text-lg")} dangerouslySetInnerHTML={sentence} />
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

function ConceptExplanationPlayer({ items, isFullscreen, title }: { items: { concept: string, definition: string }[], isFullscreen: boolean, title: string }) {
    if (!items || items.length === 0) return null;
    
    return (
        <div className='flex flex-col h-full w-full items-center max-w-6xl mx-auto p-4'>
            <div className="p-6 rounded-2xl shadow-lg bg-slate-900/80 backdrop-blur-md border border-white/10 flex-shrink-0 mb-8 w-full text-center">
                <h2 className={cn("font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500", isFullscreen ? "text-4xl" : "text-3xl")}>{title}</h2>
            </div>
            <div className="w-full flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item, index) => (
                    <Card key={index} className={cn("bg-slate-800/50 backdrop-blur-sm border-white/5 hover:border-cyan-500/30 hover:bg-slate-800/80 transition-all duration-300 group shadow-xl", isFullscreen ? 'min-h-[220px]' : 'min-h-[180px]')}>
                        <CardHeader className="pb-2">
                            <CardTitle className={cn("font-bold text-cyan-300 group-hover:text-cyan-200 transition-colors", isFullscreen ? "text-2xl" : "text-xl")}>{item.concept}</CardTitle>
                        </CardHeader>
                        <CardContent className={cn("text-slate-300 group-hover:text-slate-200 transition-colors", isFullscreen ? "text-lg" : "text-base")}>
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
    const cardColors = [
        'bg-rose-500/20 border-rose-500/40 text-rose-100 hover:bg-rose-500/30', 
        'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-100 hover:bg-fuchsia-500/30', 
        'bg-cyan-500/20 border-cyan-500/40 text-cyan-100 hover:bg-cyan-500/30', 
        'bg-teal-500/20 border-teal-500/40 text-teal-100 hover:bg-teal-500/30', 
        'bg-lime-500/20 border-lime-500/40 text-lime-100 hover:bg-lime-500/30', 
        'bg-orange-500/20 border-orange-500/40 text-orange-100 hover:bg-orange-500/30'
    ];

    const getDynamicFontSize = (text: string) => {
        const baseSize = isFullscreen ? 2.5 : 1.75; 
        const maxLength = 8;
        if (text.length > maxLength) {
            const reductionFactor = Math.min(1.2, (text.length - maxLength) / 4);
            return `${baseSize - reductionFactor}rem`;
        }
        return `${baseSize}rem`;
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4">
            <h2 className={cn("text-3xl font-black text-center text-white mb-8 drop-shadow-md", isFullscreen && "text-5xl")}>{step.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {step.cards.map((card, index) => (
                    <div
                        key={index}
                        className={cn(
                            "rounded-2xl [perspective:1000px] cursor-pointer group",
                            isFullscreen ? "min-h-[14rem]" : "min-h-[10rem]"
                        )}
                        onClick={() => onCardFlip(index, 'anagramFlashcard')}
                        title="Kartı çevirmek için tıkla"
                    >
                        <div
                            className={cn(
                                "relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d]",
                                flippedCards.has(index) && "[transform:rotateY(180deg)]"
                            )}
                        >
                            {/* Front of the card */}
                            <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-2xl shadow-xl border-2 flex flex-wrap items-center justify-center p-4 backdrop-blur-sm transition-all", cardColors[index % cardColors.length])}>
                                <h3 
                                    className="font-black tracking-[.2em] break-all drop-shadow-sm"
                                    style={{ fontSize: getDynamicFontSize(card.scrambledWord) }}
                                >
                                    {card.scrambledWord}
                                </h3>
                            </div>

                            {/* Back of the card */}
                            <div className={cn(
                                "absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-xl border-2 border-emerald-500/50 flex flex-wrap items-center justify-center p-4 bg-emerald-600 text-white break-words overflow-hidden"
                            )}>
                                <h3 
                                    className="font-black break-all drop-shadow-sm"
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
    const cardColors = [
        'bg-indigo-500/20 border-indigo-500/40 text-indigo-100 hover:bg-indigo-500/30', 
        'bg-violet-500/20 border-violet-500/40 text-violet-100 hover:bg-violet-500/30', 
        'bg-blue-500/20 border-blue-500/40 text-blue-100 hover:bg-blue-500/30'
    ];

    return (
        <div className="w-full max-w-6xl mx-auto p-4">
            <h2 className={cn("text-3xl font-black text-center text-white mb-8 drop-shadow-md", isFullscreen && "text-5xl")}>{step.title}</h2>
            <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", isFullscreen && "lg:grid-cols-4")}>
                {step.cards.map((card, index) => (
                    <FlashcardItem
                        key={index}
                        term={card.term}
                        definition={card.definition}
                        isFlipped={flippedCards.has(index)}
                        onFlip={() => onCardFlip(index, 'flashcard')}
                        colorClass={cardColors[index % cardColors.length]}
                        isFullscreen={isFullscreen}
                    />
                ))}
            </div>
        </div>
    );
}

const FlashcardItem = ({ term, definition, isFlipped, onFlip, colorClass, isFullscreen }: { term: string, definition: string, isFlipped: boolean, onFlip: () => void, colorClass: string, isFullscreen?: boolean }) => {
    return (
        <div
            className={cn(
                "rounded-2xl [perspective:1000px] cursor-pointer group",
                "min-h-[12rem]"
            )}
            onClick={onFlip}
            title="Kartı çevirmek için tıkla"
        >
            <div
                className={cn(
                    "relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d]",
                    isFlipped && "[transform:rotateY(180deg)]"
                )}
            >
                {/* Front of the card */}
                <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-2xl shadow-xl border-2 flex flex-col items-center justify-center p-6 backdrop-blur-sm transition-all", colorClass)}>
                    <h3 className={cn("font-bold", isFullscreen ? "text-3xl" : "text-2xl")}>{term}</h3>
                    <p className="mt-2 text-xs opacity-70 uppercase tracking-widest">Çevirmek için tıkla</p>
                </div>

                {/* Back of the card */}
                <div className={cn(
                    "absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-xl border-2 flex flex-col items-center justify-center p-6",
                    colorClass // Aynı rengi arka yüzde de kullanabiliriz veya farklı bir renk
                )}>
                    <p className={cn("font-medium leading-relaxed", isFullscreen ? "text-xl" : "text-lg")}>{definition}</p>
                </div>
            </div>
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
                if (scrollHeight - scrollTop - clientHeight < 5) {
                    onSlideScrolledToEnd();
                }
            }
        };

        const handleLoad = () => {
            const contentWindow = iframe?.contentWindow;
            if (contentWindow) {
                const checkScrollability = () => {
                    const { scrollHeight, clientHeight } = contentWindow.document.documentElement;
                    if (scrollHeight <= clientHeight + 5) {
                        onSlideScrolledToEnd();
                    }
                };
                checkScrollability();
                setTimeout(checkScrollability, 200);
                
                contentWindow.addEventListener('scroll', handleIframeScroll);
            }
        };

        if (iframe) {
            iframe.addEventListener('load', handleLoad);
        }

        return () => {
            if (iframe?.contentWindow) {
                iframe.contentWindow.removeEventListener('scroll', handleIframeScroll);
            }
             if (iframe) {
                iframe.removeEventListener('load', handleLoad);
            }
        };
    }, [onSlideScrolledToEnd, step]);

    return (
        <div className={cn("w-full h-full bg-white rounded-2xl border-4 border-slate-800 shadow-2xl overflow-hidden", isFullscreen && "h-full")}>
            <iframe
                ref={iframeRef}
                srcDoc={step.htmlContent}
                className="w-full h-full border-0"
                title={step.title}
                sandbox="allow-scripts allow-same-origin"
            />
        </div>
    );
}

// Interactive Anagram Component
function AnagramGame({ step, onAnswer, answer, isAnswerRevealed }: { step: AnagramStep, onAnswer: (answer: string) => void, answer: { answer: string, isCorrect: boolean } | null, isAnswerRevealed: boolean }) {
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
        <div className="text-center space-y-8 flex flex-col items-center max-w-4xl mx-auto p-4">
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                 <p className="text-2xl md:text-3xl font-semibold italic text-cyan-100">"{step.definition}"</p>
            </div>
           
            <div className={cn("flex justify-center flex-wrap gap-3 p-6 rounded-2xl bg-slate-900/50 border border-white/5 min-h-[8rem] items-center w-full", isWrong && "animate-shake")}>
                {Array.from({ length: step.correctAnswer.length }).map((_, index) => {
                    const letterObj = constructedLetters[index];
                    return (
                        <div key={index} onClick={() => letterObj && !isAnswerRevealed && handleConstructedClick(letterObj)} className={cn(
                            "h-20 w-16 rounded-xl flex items-center justify-center text-4xl font-black cursor-pointer shadow-lg transition-all",
                            isAnswerRevealed 
                                ? (answer?.isCorrect ? 'bg-emerald-500 text-white border-b-4 border-emerald-700' : 'bg-red-500 text-white border-b-4 border-red-700')
                                : letterObj 
                                    ? "bg-indigo-600 text-white border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1"
                                    : "bg-slate-800/50 border-2 border-dashed border-slate-600 text-transparent"
                        )}>
                            {isAnswerRevealed ? step.correctAnswer.toLocaleUpperCase('tr-TR')[index] : letterObj?.letter}
                        </div>
                    );
                })}
            </div>
            {!isAnswerRevealed && (
                <div className="flex flex-wrap justify-center gap-3 p-4">
                    {bankLetters.map((item) => (
                        <Button 
                            key={item.id} 
                            onClick={() => handleLetterClick(item)} 
                            className="h-16 w-14 text-3xl font-bold bg-slate-800 hover:bg-slate-700 text-white border-b-4 border-slate-950 active:border-b-0 active:translate-y-1"
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
    const initialWords = useMemo(() => step.scrambledSentence.split(' ').map((word, index) => ({ id: index, word })), [step.scrambledSentence]);
    const [bankWords, setBankWords] = useState(initialWords);
    const [constructedWords, setConstructedWords] = useState<(typeof initialWords[0])[]>([]);
    const [mistakenWordId, setMistakenWordId] = useState<number | null>(null);

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
            setTimeout(() => {
                setMistakenWordId(null);
            }, 820);
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
            const timeoutId = setTimeout(() => {
                onCorrectAndNext();
            }, 1200);
            return () => clearTimeout(timeoutId);
        }
    }, [answer, onCorrectAndNext]);

    return (
        <div className="space-y-8 text-center max-w-4xl mx-auto p-4">
            <p className="text-xl text-slate-400 font-medium">Kelimeleri doğru sıraya dizerek cümleyi oluşturun.</p>
            
             <div className="flex flex-wrap justify-center items-center gap-3 bg-slate-900/50 border border-white/10 p-6 rounded-2xl min-h-[6rem]">
                {constructedWords.map((wordObj, i) => (
                    <div 
                        key={wordObj.id} 
                        className={cn(
                            "px-4 py-2 rounded-xl text-lg font-bold shadow-lg animate-in zoom-in duration-300",
                            "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border border-white/20"
                        )}
                    >
                        {wordObj.word}
                    </div>
                ))}
                {constructedWords.length === 0 && <span className="text-slate-600 italic">Cümleniz burada görünecek...</span>}
            </div>

            {isAnswerRevealed ? (
                 <div className="text-center mt-4 animate-in slide-in-from-bottom-4">
                    <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-6 py-3 rounded-full border border-green-500/50">
                        <CheckCircle2 className="h-6 w-6"/>
                        <span className="font-bold text-lg">Harika, doğru cümle!</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap justify-center gap-3 p-4">
                    {bankWords.map((item, index) => (
                        <Button
                            key={item.id}
                            variant="secondary"
                            onClick={() => handleWordClick(item)}
                            className={cn(
                                "text-lg h-14 px-6 font-bold rounded-xl transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-1",
                                "bg-slate-800 text-slate-200 border-slate-950 hover:bg-slate-700 hover:text-white",
                                mistakenWordId === item.id && "animate-shake bg-red-600 border-red-800 hover:bg-red-600"
                            )}
                        >
                            {mistakenWordId === item.id && <X className="h-5 w-5 mr-2" />}
                            {item.word}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};

// SVG-based ConceptMapViewer
function ConceptMapViewer({ mapData }: { mapData: ConceptMapData }) {
    const width = 800;
    const height = 600;
    const centralNode = mapData.nodes.find(n => n.isCentral) || mapData.nodes[0];
    const otherNodes = mapData.nodes.filter(n => n.id !== centralNode?.id);
    const nodeCount = otherNodes.length;
    const angleStep = (2 * Math.PI) / (nodeCount > 0 ? nodeCount : 1);
    
    const centralPos = { x: width / 2, y: height / 2 };

    if (!centralNode) {
        return <p className="text-white">Harita verisi boş.</p>;
    }

    const nodePositions: { [key: string]: { x: number, y: number } } = {
        [centralNode.id]: centralPos
    };

    otherNodes.forEach((node, index) => {
        const radiusX = width * 0.35;
        const radiusY = height * 0.35;
        const angle = angleStep * index;
        nodePositions[node.id] = {
            x: centralPos.x + radiusX * Math.cos(angle),
            y: centralPos.y + radiusY * Math.sin(angle),
        };
    });
    
    const wrapText = (text: string, maxWidth: number) => {
        const words = text.split(/\s+/);
        let lines: string[] = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
            let word = words[i];
            if ((currentLine.length + word.length + 1) * 8 < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    return (
        <div className="w-full h-full flex items-center justify-center p-4">
             <div className="w-full max-w-4xl bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                    <defs>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <g className="stroke-cyan-500/30 stroke-2">
                        {mapData.edges.map((edge, i) => {
                            const fromPos = nodePositions[edge.from];
                            const toPos = nodePositions[edge.to];
                            if (!fromPos || !toPos) return null;
                            return <line key={i} x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y} />;
                        })}
                    </g>

                    <g>
                        {mapData.nodes.map(node => {
                            const pos = nodePositions[node.id];
                            if (!pos) return null;
                            const isCentral = node.isCentral || node.id === centralNode.id;
                            const lines = wrapText(node.label, 110);
                            const rectHeight = 25 * lines.length + 20;

                            return (
                                <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`} className="cursor-pointer hover:scale-105 transition-transform duration-300">
                                    <rect
                                        x="-70"
                                        y={-rectHeight/2}
                                        width="140"
                                        height={rectHeight}
                                        rx="12"
                                        ry="12"
                                        className={cn(
                                            "stroke-2",
                                            isCentral ? "fill-indigo-600 stroke-indigo-400" : "fill-slate-800 stroke-slate-600 hover:stroke-cyan-400 hover:fill-slate-700"
                                        )}
                                        style={{ filter: isCentral ? 'url(#glow)' : '' }}
                                    />
                                    <text
                                        x="0"
                                        y={- (lines.length - 1) * 12 / 2}
                                        textAnchor="middle"
                                        className={cn("font-bold text-sm pointer-events-none", isCentral ? "fill-white" : "fill-slate-200")}
                                        dominantBaseline="middle"
                                    >
                                        {lines.map((line, i) => (
                                            <tspan key={i} x="0" dy={i === 0 ? "0.3em" : "1.2em"}>{line}</tspan>
                                        ))}
                                    </text>
                                </g>
                            )
                        })}
                    </g>
                </svg>
            </div>
        </div>
    )
}

// Interactive True/False List
function InteractiveTrueFalseList({ step, isFullscreen, onAnswer, onAllAnswered, answers }: { 
    step: TrueFalseListStep, 
    isFullscreen: boolean,
    onAnswer: (questionIndex: number, selectedAnswer: boolean) => void;
    onAllAnswered: () => void;
    answers: { [key: number]: { answer: boolean; isCorrect: boolean } };
 }) {
    
    useEffect(() => {
        if (!step) return;
        if (Object.keys(answers || {}).length === step.questions.length) {
            onAllAnswered();
        }
    }, [answers, step, onAllAnswered]);

    return (
        <div className="w-full h-full flex flex-col items-center max-w-4xl mx-auto p-4">
            <div className="p-6 rounded-2xl shadow-lg bg-slate-900/80 backdrop-blur-md border border-white/10 flex-shrink-0 w-full text-center mb-6">
                <h2 className={cn("font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600", isFullscreen ? "text-4xl" : "text-3xl")}>{step.title}</h2>
            </div>
            
            <div className="w-full space-y-4 pb-20">
                {step.questions.map((q, index) => {
                    const answer = answers?.[index];
                    const isAnswered = !!answer;
                    const isQuestionCorrect = q.isTrue;
                    
                    return (
                        <div key={index} className="p-5 rounded-2xl bg-slate-800/50 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
                            <div className="flex-1">
                                <span className="text-slate-500 font-bold mr-2 text-lg">#{index + 1}</span>
                                <span className={cn("font-medium text-slate-200", isFullscreen ? "text-xl" : "text-lg")}>{q.statement}</span>
                            </div>
                            <div className="flex gap-3 shrink-0">
                                <Button
                                    onClick={() => !isAnswered && onAnswer(index, true)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "w-24 h-12 text-lg font-bold rounded-xl transition-all",
                                        !isAnswered && "bg-slate-700 hover:bg-slate-600 text-white",
                                        isAnswered && isQuestionCorrect && "bg-emerald-600 text-white opacity-100 ring-2 ring-emerald-400",
                                        isAnswered && !isQuestionCorrect && "bg-slate-800 text-slate-500 opacity-50"
                                    )}
                                >
                                    {isAnswered && isQuestionCorrect ? <CheckCircle2 className="h-6 w-6"/> : 'Doğru'}
                                </Button>
                                <Button
                                    onClick={() => !isAnswered && onAnswer(index, false)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "w-24 h-12 text-lg font-bold rounded-xl transition-all",
                                        !isAnswered && "bg-slate-700 hover:bg-slate-600 text-white",
                                        isAnswered && !isQuestionCorrect && "bg-red-600 text-white opacity-100 ring-2 ring-red-400",
                                        isAnswered && isQuestionCorrect && "bg-slate-800 text-slate-500 opacity-50"
                                    )}
                                >
                                   {isAnswered && !isQuestionCorrect ? <CheckCircle2 className="h-6 w-6"/> : 'Yanlış'}
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function getEmbedUrl(url: string): string {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        // YouTube
        if (urlObj.hostname.includes('youtube.com')) {
            const videoId = urlObj.searchParams.get('v');
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }
        if (urlObj.hostname.includes('youtu.be')) {
            const videoId = urlObj.pathname.slice(1);
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }
        // Vimeo
        if (urlObj.hostname.includes('vimeo.com')) {
            const videoId = urlObj.pathname.split('/').pop();
            if (videoId && !isNaN(parseInt(videoId))) {
                return `https://player.vimeo.com/video/${videoId}`;
            }
        }
    } catch (e) {
        console.error("Invalid URL for embedding:", url, e);
        return url; 
    }
    return url; 
}


function StepContent({ 
    step, 
    answer, 
    onAnswer, 
    onCorrectAndNext,
    stepAnswers, 
    topic, 
    courseId, 
    unitId, 
    courseTitle, 
    unitTitle, 
    isFullscreen, 
    revealedSentencesCount, 
    flippedCards, 
    flippedAnagramCards, 
    onCardFlip, 
    onSlideScrolledToEnd,
    onMultiAnswer,
    onAllTfAnswered
}: { 
    step: LessonStep, 
    answer?: any, 
    onAnswer: (answer: any) => void,
    onCorrectAndNext: () => void,
    stepAnswers: any,
    topic: Topic, 
    courseId: string, 
    unitId: string, 
    courseTitle: string, 
    unitTitle: string, 
    isFullscreen: boolean,
    revealedSentencesCount: number,
    flippedCards: Set<number>,
    flippedAnagramCards: Set<number>,
    onCardFlip: (cardIndex: number, type: 'flashcard' | 'anagramFlashcard') => void;
    onSlideScrolledToEnd: () => void;
    onMultiAnswer: (questionIndex: number, selectedAnswer: boolean) => void;
    onAllTfAnswered: () => void;
}) {

    const renderContent = () => {
        switch (step.type) {
            case 'content':
            case 'objectiveList':
                 return <ContentListPlayer step={step as ContentStep | ObjectiveListStep} revealedSentencesCount={revealedSentencesCount} isFullscreen={isFullscreen} />
            case 'conceptExplanation': {
                const ceStep = step as ConceptExplanationStep;
                return <ConceptExplanationPlayer items={ceStep.items} isFullscreen={isFullscreen} title={ceStep.title} />
            }
             case 'accordion': {
                return <ContentListPlayer step={step as AccordionStep} revealedSentencesCount={revealedSentencesCount} isFullscreen={isFullscreen} />
            }
            case 'visual':
                return (
                    <div className="flex justify-center items-center h-full p-4">
                         <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800">
                             <Image src={(step as VisualStep).imageUrl} alt={step.title} width={1000} height={800} className="max-w-full max-h-[70vh] object-contain" data-ai-hint="lesson visual" />
                         </div>
                    </div>
                );
            case 'iframe':
                const iframeStep = step as IframeStep;
                return <iframe src={iframeStep.url} title={step.title} className={cn("w-full border-0 rounded-2xl shadow-2xl bg-white", isFullscreen ? "h-full" : "h-[70vh]")} allowFullScreen></iframe>
            case 'htmlSlide':
                 return <HtmlSlidePlayer step={step as HtmlSlideStep} isFullscreen={isFullscreen} onSlideScrolledToEnd={onSlideScrolledToEnd} />
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
                             <div className="p-8 bg-slate-800/50 rounded-full mb-6 border-4 border-slate-700 shadow-2xl animate-bounce-slow">
                                 <Icon className="h-24 w-24 text-cyan-400" />
                             </div>
                             <h3 className="text-4xl font-black mb-4">{activityStep.activityLabel}</h3>
                             <p className="text-slate-400 text-lg mb-8 max-w-md text-center">Bu etkinliği tamamlayarak puan kazan ve sıralamada yüksel!</p>
                             <Button asChild size="lg" className="h-16 px-10 text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl shadow-lg shadow-indigo-900/30 transition-transform hover:scale-105">
                                 <Link href={`${activityStep.activityType}?courseId=${courseId}&unitId=${unitId}&topicId=${topic.id}&courseName=${encodeURIComponent(courseTitle)}&unitName=${encodeURIComponent(unitTitle)}&topicName=${encodeURIComponent(topic.title)}`}>
                                    <Gamepad2 className="mr-3 h-6 w-6"/> Etkinliğe Başla
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
                const mapStep = step as ConceptMapStep;
                return <ConceptMapViewer mapData={mapStep.mapData} />;
            case 'video': {
                const videoStep = step as VideoStep;
                const embedUrl = getEmbedUrl(videoStep.url);
                return (
                    <div className="w-full max-w-5xl mx-auto flex flex-col items-center p-4">
                        <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-black">
                            <iframe
                                src={embedUrl}
                                title={videoStep.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        </div>
                         {videoStep.description && <p className="mt-6 text-center text-slate-400 text-lg font-medium max-w-3xl">{videoStep.description}</p>}
                    </div>
                );
            }
            case 'mcq': {
                const mcqStep = step as McqStep;
                return (
                    <div className="w-full max-w-3xl mx-auto flex flex-col justify-center min-h-[60vh] p-4">
                        <div className="p-8 rounded-3xl shadow-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 mb-8 text-center relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                          <h3 className={cn("font-bold text-white leading-relaxed", isFullscreen ? "text-3xl" : "text-2xl")}>{mcqStep.question}</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {mcqStep.options.map((option, index) => {
                                const isCorrect = option === mcqStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                return (
                                    <Button
                                        key={index}
                                        variant="default"
                                        className={cn(
                                            "h-auto justify-start text-left whitespace-normal rounded-xl border-2 transition-all duration-300 transform",
                                            "p-5 text-lg font-medium",
                                            isFullscreen ? "p-6 text-xl" : "",
                                            !answer ? "bg-slate-800 border-white/5 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-white/20 hover:scale-[1.01]" : "",
                                            answer && isCorrect ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-[1.02] z-10" : "",
                                            answer && isSelected && !isCorrect ? "bg-red-600 border-red-400 text-white animate-shake" : "",
                                            answer && !isSelected && !isCorrect ? "bg-slate-900/50 border-transparent text-slate-600 opacity-50" : ""
                                        )}
                                        onClick={() => onAnswer(option)}
                                        disabled={!!answer}
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/20 text-sm font-bold mr-4 border border-white/10">
                                            {String.fromCharCode(65 + index)}
                                        </span>
                                        <span className="flex-1">{option}</span>
                                        {answer && isCorrect && <CheckCircle2 className="h-6 w-6 ml-2 text-white animate-in zoom-in"/>}
                                        {answer && isSelected && !isCorrect && <XCircle className="h-6 w-6 ml-2 text-white animate-in zoom-in"/>}
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
                    <div className="w-full max-w-2xl mx-auto flex flex-col justify-center min-h-[60vh] p-4 text-center">
                         <div className="p-8 rounded-3xl shadow-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 mb-10 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                            <h3 className={cn("font-bold text-white leading-relaxed", isFullscreen ? "text-3xl" : "text-2xl")}>{tfStep.statement}</h3>
                        </div>
                        <div className="flex gap-6 justify-center">
                            {["Doğru", "Yanlış"].map((option) => {
                                const isSelected = answer?.answer === option;
                                const isCorrect = option === correctOption;
                                return (
                                    <Button
                                        key={option}
                                        className={cn(
                                            "h-32 w-48 text-2xl font-black rounded-3xl transition-all duration-300 transform shadow-xl border-4",
                                            !answer && (option === "Doğru" ? "bg-slate-800 border-slate-700 text-green-400 hover:bg-green-500/20 hover:border-green-500" : "bg-slate-800 border-slate-700 text-red-400 hover:bg-red-500/20 hover:border-red-500"),
                                            answer && isCorrect && "bg-green-500 border-green-400 text-white scale-110 shadow-[0_0_30px_rgba(34,197,94,0.4)] z-10",
                                            answer && isSelected && !isCorrect && "bg-red-500 border-red-400 text-white animate-shake",
                                            answer && !isSelected && !isCorrect && "opacity-30 grayscale scale-90"
                                        )}
                                        onClick={() => onAnswer(option)}
                                        disabled={!!answer}
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            {option === "Doğru" ? <CheckCircle className="h-8 w-8"/> : <XCircle className="h-8 w-8"/>}
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
                return (
                    <div className="w-full max-w-3xl mx-auto flex flex-col justify-center min-h-[60vh] p-4 text-center">
                        <div className="p-8 rounded-3xl shadow-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 mb-10 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                          <h3 className={cn("font-bold text-white leading-relaxed tracking-wide", isFullscreen ? "text-4xl" : "text-2xl md:text-3xl")}>
                              {fitbStep.sentenceWithBlank?.replace('___', '________')}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(fitbStep.options || []).map((option, index) => {
                                const isCorrect = option === fitbStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                return (
                                    <Button
                                        key={index}
                                        variant="default"
                                        className={cn(
                                            "h-20 text-xl font-bold rounded-2xl border-2 transition-all duration-300 transform",
                                            !answer ? "bg-slate-800 border-white/5 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-white/20 hover:scale-[1.02]" : "",
                                            answer && isCorrect && "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02] z-10",
                                            answer && isSelected && !isCorrect && "bg-red-600 border-red-400 text-white animate-shake",
                                            answer && !isSelected && !isCorrect && "bg-slate-900/50 border-transparent text-slate-600 opacity-50"
                                        )}
                                        onClick={() => onAnswer(option)}
                                        disabled={!!answer}
                                    >
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
                 return (
                     <div className="flex flex-col items-center justify-center h-full text-slate-500">
                         <Bug className="h-12 w-12 mb-4 opacity-50"/>
                         <p className="text-xl font-semibold">Bu içerik tipi görüntülenemiyor.</p>
                         <p className="text-sm mt-2 font-mono">Type: {step.type}</p>
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

// ... (Geriye kalan `LessonContentViewer` ana mantığı, `CoursePageContent` ve `Page` bileşenleri aynı kalır. Sadece stil güncellemeleri içerir)

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
}: LessonContentViewerProps & { onMultiAnswer?: any, onAllTfAnswered?: any }) {
    const { user } = useAuth();
    
    // For ContentListPlayer
    const [revealedSentencesCount, setRevealedSentencesCount] = useState(1);
    const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
    const [flippedAnagramCards, setFlippedAnagramCards] = useState<Set<number>>(new Set());
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    
    const [internalProgress, setInternalProgress] = useState<LocalProgress>(
        () => ({ answers: {}, score: 0 })
    );

    const steps = useMemo(() => topic?.steps || [], [topic]);
    
    useEffect(() => {
        if (topic) {
            setInternalProgress({ answers: {}, score: 0 });
            setCurrentStepIndex(0);
            setIsFinished(false);
            setRevealedSentencesCount(1);
            setFlippedCards(new Set());
            setFlippedAnagramCards(new Set());
        }
    }, [topic]);
    
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const [isFinished, setIsFinished] = useState(false);
    
    
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
        } else {
            setIsFinished(true);
            playSound('win');
            onTopicComplete(topic!.id, internalProgress.score);
        }
    }, [currentStep, currentStepIndex, steps.length, internalProgress, onTopicComplete, topic]);
    
    const handleLocalMultiAnswer = (questionIndex: number, selectedAnswer: boolean) => {
        if (!currentStep || currentStep.type !== 'trueFalseList') return;
        
        const existingAnswers = internalProgress.answers[currentStepIndex] || {};
        if (existingAnswers[questionIndex] !== undefined) return;

        const question = currentStep.questions[questionIndex];
        const isCorrect = selectedAnswer === question.isTrue;
        
        if (isCorrect) playSound('correct'); else playSound('incorrect');
        
        const newAnswersForStep = {
            ...existingAnswers,
            [questionIndex]: { answer: selectedAnswer, isCorrect }
        };
        
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
        
        if (currentStep.type === 'trueFalseList') {
             return !!answer?.completed;
        }
        
        return answer !== undefined && answer !== null;
    }, [currentStep, internalProgress.answers, currentStepIndex, flippedCards, flippedAnagramCards]);

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

        if (isCorrect) {
            playSound('correct');
        } else {
            playSound('incorrect');
            if (user?.role === 'student' && currentStep && (currentStep.type === 'mcq' || currentStep.type === 'tf' || currentStep.type === 'fitb')) {
                 addQuestionToReviewList(user.uid, currentStep as unknown as Question);
            }
        }

        const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { answer, isCorrect } };
        const newScore = internalProgress.score + points;
        setInternalProgress({ answers: newAnswers, score: newScore });
    };
    
    const onCorrectAndNext = useCallback(() => {
        const timeoutId = setTimeout(() => {
            handleNext();
        }, 1200);
        return () => clearTimeout(timeoutId);
    }, [handleNext]);
    

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
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
            setRevealedSentencesCount(1);
            setFlippedCards(new Set());
            setFlippedAnagramCards(new Set());
        }
    }

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
             <div className="flex-shrink-0 flex justify-between items-center p-4 border-t border-white/5 bg-slate-900/80 backdrop-blur-md pb-6 md:pb-4 absolute bottom-0 w-full z-20">
                 <div className="flex gap-2">
                    {user?.role === 'student' && (
                        <Button variant="ghost" size="icon" onClick={() => setIsReportDialogOpen(true)} title="Hata Bildir" className="text-slate-400 hover:text-white">
                            <Bug className="h-5 w-5" />
                        </Button>
                    )}
                    {user?.role !== 'student' && <Button variant="secondary" size={isFullscreen ? 'lg' : 'default'} onClick={handleNext}>Atla</Button>}
                 </div>
                <div className="flex gap-3">
                    <Button variant="outline" size={isFullscreen ? 'lg' : 'default'} onClick={handlePrev} disabled={currentStepIndex === 0} className="border-white/10 hover:bg-white/5 text-slate-300 hover:text-white">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Geri
                    </Button>
                    <Button 
                        size={isFullscreen ? 'lg' : 'default'} 
                        onClick={handleContinueOrNext} 
                        disabled={!isNextButtonEnabled}
                        className={cn(
                            "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30 transition-all",
                            showContinueButton ? "px-8" : "px-6"
                        )}
                    >
                        {showContinueButton ? "Devam Et" : (currentStepIndex === steps.length - 1 ? "Konuyu Bitir" : "İleri")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        )
    };

    if (!topic) {
        return (
            <div className='flex h-full w-full items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin' />
            </div>
        )
    }

    if (isFinished) {
        return (
            <div className="h-full flex items-center justify-center p-4 bg-slate-950">
                 <Card className="w-full max-w-lg bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl text-center overflow-hidden animate-in zoom-in-95 duration-500">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-purple-500" />
                    <CardHeader>
                        <div className="mx-auto bg-slate-800 p-4 rounded-full mb-2 shadow-lg ring-4 ring-slate-800/50">
                             <PartyPopper className="h-12 w-12 text-yellow-400 animate-bounce" />
                        </div>
                        <CardTitle className="text-3xl font-black text-white mt-4">Tebrikler!</CardTitle>
                        <CardDescription className="text-slate-400 text-lg">Konuyu başarıyla tamamladın.</CardDescription>
                    </CardHeader>
                    <CardContent className="py-6">
                        <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5">
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-2">Kazanılan Puan</p>
                            <p className="text-6xl font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">{internalProgress.score}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-3 pb-8 px-8">
                        <Button onClick={() => onTopicComplete(topic!.id, internalProgress.score)} className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20">
                            Ders Haritasına Dön
                        </Button>
                        <Button variant="ghost" onClick={() => { setIsFinished(false); setCurrentStepIndex(0); setInternalProgress({ answers: {}, score: 0 }); }} className="text-slate-400 hover:text-white">
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

    const getBackgroundClass = () => {
         // Daha genel ve koyu temalı arka planlar
        return "bg-slate-950";
    }

    return (
      <div className="h-full w-full flex flex-col relative overflow-hidden bg-slate-950">
        
        {/* HUD (Üst Bar) */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-white/5 bg-slate-900/80 backdrop-blur-md z-20 flex justify-between items-center">
             <div className="flex items-center gap-4 flex-1">
                 <div className="w-full max-w-xs h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                        style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                    />
                 </div>
                 <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{currentStepIndex + 1} / {steps.length}</span>
             </div>
             <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                 <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                 <span className="font-mono font-bold text-white">{internalProgress.score}</span>
             </div>
        </div>

        <div className={cn(
          "flex-grow relative overflow-y-auto pb-24 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent",
           getBackgroundClass()
        )}>
             {/* İçerik Alanı Arka Plan Efektleri */}
             <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                 <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]" />
                 <div className="absolute bottom-[20%] right-[20%] w-64 h-64 bg-purple-500/5 rounded-full blur-[80px]" />
             </div>

           <div className="relative z-10 min-h-full flex flex-col justify-center py-8">
              <StepContent
                 step={currentStep}
                 answer={internalProgress.answers?.[currentStepIndex]}
                 onAnswer={handleAnswer}
                 onCorrectAndNext={onCorrectAndNext}
                 onMultiAnswer={handleLocalMultiAnswer}
                 onAllTfAnswered={handleLocalAllTfAnswered}
                 stepAnswers={internalProgress.answers[currentStepIndex]}
                 topic={topic}
                 courseId={courseId}
                 unitId={unitId!}
                 courseTitle={courseTitle}
                 unitTitle={unitTitle}
                 isFullscreen={isFullscreen}
                 revealedSentencesCount={revealedSentencesCount}
                 flippedCards={flippedCards}
                 flippedAnagramCards={flippedAnagramCards}
                 onCardFlip={handleCardFlip}
                 onSlideScrolledToEnd={handleSlideScrolledToEnd}
               />
           </div>
        </div>
        
        {renderNavigation()}
        
        <ErrorReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} itemToReport={currentStep} />
      </div>
    );
}