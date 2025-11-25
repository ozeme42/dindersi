
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, PartyPopper, Repeat, Brain, BookOpen, Gamepad2, Lightbulb, CheckCircle2, XCircle, LayersIcon, X, FilePenLine, Link as LinkIcon, Layers, Star, Check, Target, Zap, Sparkles, Feather, Leaf, Sun, Moon, Puzzle, Skull, Crosshair, Shuffle, FolderKanban, MousePointerClick, Trophy, BrainCircuit, Bug, Video, Loader2, CheckCircle } from 'lucide-react';
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
    const summaryColorClasses = [
      'from-slate-800 to-slate-700',
      'from-emerald-800 to-emerald-700',
      'from-sky-800 to-sky-700',
      'from-rose-800 to-rose-700',
      'from-amber-800 to-amber-700',
      'from-indigo-800 to-indigo-700',
    ];

    return (
        <div className="w-full h-full flex flex-col gap-6 items-center">
            <div className="p-4 rounded-lg shadow-md bg-primary flex-shrink-0">
                <h2 className={cn("font-bold text-center text-primary-foreground", isFullscreen ? "text-4xl" : "text-3xl")}>{step.title}</h2>
            </div>
            
             <div className="w-full grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
                {visibleSentences.map((sentence, index) => {
                    const Icon = summaryIcons[index % summaryIcons.length];
                    const colorClass = summaryColorClasses[index % summaryColorClasses.length];
                    return (
                        <div key={index} className={cn("p-4 rounded-xl shadow-xl flex items-start gap-4 text-white animate-fadeAndScaleIn bg-gradient-to-br border border-white/20", colorClass)}>
                            <div className="p-2 bg-white/10 rounded-full flex-shrink-0 mt-1">
                                <Icon className={cn(isFullscreen ? "h-8 w-8" : "h-6 w-6")} />
                            </div>
                             <div className={cn("flex-1 break-words not-prose text-justify font-bold drop-shadow-sm", isFullscreen ? "text-2xl md:text-3xl" : "text-lg md:text-2xl")} dangerouslySetInnerHTML={sentence} />
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
        <div className='flex flex-col h-full w-full items-center'>
            <div className="p-4 rounded-lg shadow-md bg-primary flex-shrink-0 mb-4">
                <h2 className={cn("font-bold text-center text-primary-foreground", isFullscreen ? "text-4xl" : "text-3xl")}>{title}</h2>
            </div>
            <div className="w-full flex-grow grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 md:gap-6 p-2">
                {items.map((item, index) => (
                    <Card key={index} className={cn("shadow-2xl bg-white/20 backdrop-blur-md border-white/30 text-white flex flex-col", isFullscreen ? 'min-h-[200px]' : 'min-h-[150px]')}>
                        <CardHeader className="p-3 bg-white/30">
                            <CardTitle className={cn("font-bold", isFullscreen ? "text-2xl" : "text-xl")}>{item.concept}</CardTitle>
                        </CardHeader>
                        <CardContent className={cn("p-3 flex-grow", isFullscreen ? "text-base" : "text-sm")}>
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
    const cardColors = ['bg-rose-600/80', 'bg-fuchsia-600/80', 'bg-cyan-600/80', 'bg-teal-600/80', 'bg-lime-600/80', 'bg-orange-600/80'];

    const getDynamicFontSize = (text: string) => {
        const baseSize = isFullscreen ? 2.5 : 1.75; // base size in rem
        const maxLength = 8;
        if (text.length > maxLength) {
            const reductionFactor = Math.min(1.2, (text.length - maxLength) / 4);
            return `${baseSize - reductionFactor}rem`;
        }
        return `${baseSize}rem`;
    };

    return (
        <div className="w-full">
            <h2 className={cn("text-3xl font-bold text-center text-foreground dark:text-white mb-6", isFullscreen && "text-4xl")}>{step.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {step.cards.map((card, index) => (
                    <div
                        key={index}
                        className={cn(
                            "rounded-lg [perspective:1000px] cursor-pointer",
                            isFullscreen ? "min-h-[12rem]" : "min-h-[8rem]"
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
                            <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-lg shadow-lg border-2 border-white/50 flex flex-wrap items-center justify-center p-4 text-primary-foreground break-words overflow-wrap-break-word", cardColors[index % cardColors.length])}>
                                <h3 
                                    className="font-bold tracking-[.2em] break-all"
                                    style={{ fontSize: getDynamicFontSize(card.scrambledWord) }}
                                >
                                    {card.scrambledWord}
                                </h3>
                            </div>

                            {/* Back of the card */}
                            <div className={cn(
                                "absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-lg shadow-lg border-2 border-white/50 flex flex-wrap items-center justify-center p-4 bg-green-600 text-primary-foreground break-words overflow-hidden"
                            )}>
                                <h3 
                                    className="font-bold break-all"
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
    const cardColors = ['bg-blue-600/80', 'bg-emerald-600/80', 'bg-purple-600/80', 'bg-rose-600/80', 'bg-amber-600/80', 'bg-indigo-600/80'];

    return (
        <div className="w-full">
            <h2 className={cn("text-3xl font-bold text-center text-foreground dark:text-white mb-6", isFullscreen && "text-4xl")}>{step.title}</h2>
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
        <div className={cn("w-full h-full bg-white rounded-lg border", isFullscreen && "overflow-y-auto h-full")}>
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

// Sub-component for Flashcard
const FlashcardItem = ({ term, definition, isFlipped, onFlip, colorClass, isFullscreen }: { term: string, definition: string, isFlipped: boolean, onFlip: () => void, colorClass: string, isFullscreen?: boolean }) => {
    return (
        <div
            className={cn(
                "rounded-lg [perspective:1000px] cursor-pointer",
                "min-h-[8rem]"
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
                <div className={cn("absolute w-full h-full [backface-visibility:hidden] rounded-lg shadow-lg border-2 border-white/50 flex flex-col items-center justify-center p-4 text-primary-foreground", colorClass)}>
                    <h3 className={cn("font-bold", isFullscreen ? "text-2xl" : "text-lg")}>{term}</h3>
                </div>

                {/* Back of the card */}
                <div className={cn(
                    "absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-lg shadow-lg border-2 border-white/50 flex flex-col items-center justify-center p-4 text-primary-foreground",
                    colorClass 
                )}>
                    <p className={cn("font-medium", isFullscreen ? "text-lg" : "text-base")}>{definition}</p>
                </div>
            </div>
        </div>
    );
};

// Interactive Anagram Component
function AnagramGame({ step, onAnswer, answer, isAnswerRevealed }: { step: AnagramStep, onAnswer: (answer: string) => void, answer: { answer: string, isCorrect: boolean } | null, isAnswerRevealed: boolean }) {
    const initialLetters = useMemo(() => step.scrambledWord.toLocaleUpperCase('tr-TR').split('').map((letter, index) => ({ id: index, letter })), [step.scrambledWord]);
    const [bankLetters, setBankLetters] = useState(initialLetters);
    const [constructedLetters, setConstructedLetters] = useState<(typeof initialLetters[0])[]>([]);
    const [isWrong, setIsWrong] = useState(false);

    useEffect(() => {
        // Reset state when the step changes
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
        <div className="text-center space-y-6 flex flex-col items-center">
            <p className="text-2xl font-semibold italic text-foreground dark:text-primary-foreground">"{step.definition}"</p>
            <div className={cn("flex justify-center flex-wrap gap-2 p-4 rounded-lg min-h-[5rem] items-center", isWrong && "animate-shake")}>
                {Array.from({ length: step.correctAnswer.length }).map((_, index) => {
                    const letterObj = constructedLetters[index];
                    return (
                        <div key={index} onClick={() => letterObj && !isAnswerRevealed && handleConstructedClick(letterObj)} className={cn("h-16 w-12 bg-background/20 backdrop-blur-sm border-2 border-dashed border-border rounded flex items-center justify-center text-3xl font-bold cursor-pointer text-foreground", isAnswerRevealed && (answer?.isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'))}>
                            {isAnswerRevealed ? step.correctAnswer.toLocaleUpperCase('tr-TR')[index] : letterObj?.letter}
                        </div>
                    );
                })}
            </div>
            {!isAnswerRevealed && (
                <div className="flex flex-wrap justify-center gap-2 p-4 rounded-lg min-h-[5rem] items-center">
                    {bankLetters.map((item) => (
                        <Button key={item.id} onClick={() => handleLetterClick(item)} variant="outline" className="h-14 w-11 text-2xl font-bold">{item.letter}</Button>
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
    const bankColorClasses = [
        "bg-chart-1 hover:bg-chart-1/90 text-primary-foreground",
        "bg-chart-2 hover:bg-chart-2/90 text-primary-foreground",
        "bg-chart-3 hover:bg-chart-3/90 text-primary-foreground",
        "bg-chart-4 hover:bg-chart-4/90 text-primary-foreground",
        "bg-chart-5 hover:bg-chart-5/90 text-primary-foreground",
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
        <div className="space-y-4 text-center">
            <p className="text-lg italic text-muted-foreground">"Kelimeleri doğru sıraya dizin."</p>
             <div className="flex flex-wrap justify-center items-center gap-3 bg-muted p-4 rounded-lg min-h-[5rem]">
                {constructedWords.map((wordObj) => (
                    <Button 
                        key={wordObj.id} 
                        className={cn("text-lg h-auto py-2", bankColorClasses[wordObj.id % bankColorClasses.length])}
                        disabled={true} 
                    >
                        {wordObj.word}
                    </Button>
                ))}
                {constructedWords.length === 0 && <span className="text-muted-foreground">Cümleniz burada görünecek...</span>}
            </div>
            {isAnswerRevealed ? (
                 <div className="text-center mt-2 space-y-2 animate-fade-in-up">
                    <p className="font-semibold text-green-600 text-lg">Harika, doğru cümle!</p>
                </div>
            ) : (
                <div className="flex flex-wrap justify-center gap-2 bg-background/50 p-4 rounded-lg min-h-[5rem] items-center">
                    {bankWords.map((item, index) => (
                        <Button
                            key={item.id}
                            variant="default"
                            onClick={() => handleWordClick(item)}
                            className={cn(
                                "text-lg h-auto py-2 font-medium transition-all duration-200 cursor-pointer select-none shadow text-primary-foreground flex items-center gap-2",
                                bankColorClasses[index % bankColorClasses.length],
                                mistakenWordId === item.id && "animate-shake bg-destructive"
                            )}
                        >
                            {mistakenWordId === item.id && <X className="h-5 w-5" />}
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
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-[80vh]">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
                </filter>
            </defs>

            <g className="stroke-white/50 stroke-2">
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
                        <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`} style={{ filter: 'url(#shadow)' }}>
                            <rect
                                x="-70"
                                y={-rectHeight/2}
                                width="140"
                                height={rectHeight}
                                rx="10"
                                ry="10"
                                className={isCentral ? "fill-primary" : "fill-white/30"}
                            />
                             <text
                                x="0"
                                y={- (lines.length - 1) * 12 / 2}
                                textAnchor="middle"
                                className={cn("font-bold text-sm", isCentral ? "fill-primary-foreground" : "fill-white")}
                            >
                                {lines.map((line, i) => (
                                    <tspan key={i} x="0" dy={i === 0 ? 0 : "1.2em"}>{line}</tspan>
                                ))}
                            </text>
                        </g>
                    )
                })}
            </g>
        </svg>
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
        <div className="w-full h-full flex flex-col bg-background rounded-lg">
            <h2 className={cn(
                "text-2xl font-bold text-center text-foreground p-4 flex-shrink-0 border-b",
                isFullscreen && "text-4xl"
            )}>
                {step.title}
            </h2>
            <ScrollArea className="flex-grow">
                <div className="space-y-4 p-4 md:p-6">
                    {step.questions.map((q, index) => {
                        const answer = answers?.[index];
                        const isAnswered = !!answer;
                        const isQuestionCorrect = q.isTrue;
                        
                        return (
                            <Card key={index} className="p-4 bg-muted/50">
                                <p className={cn("flex-1 font-medium text-foreground mb-3", isFullscreen ? "text-2xl" : "text-lg md:text-xl")}>{index + 1}. {q.statement}</p>
                                <div className="flex gap-3 justify-end">
                                    <Button
                                        onClick={() => !isAnswered && onAnswer(index, true)}
                                        disabled={isAnswered}
                                        className={cn(
                                            "w-28 text-base font-bold",
                                            isAnswered && !isQuestionCorrect && "opacity-50 bg-secondary",
                                            isAnswered && isQuestionCorrect && "bg-green-600 hover:bg-green-700 ring-2 ring-primary"
                                        )}
                                    >
                                        {isAnswered && isQuestionCorrect ? <CheckCircle2 className="h-6 w-6"/> : 'Doğru'}
                                    </Button>
                                    <Button
                                        onClick={() => !isAnswered && onAnswer(index, false)}
                                        disabled={isAnswered}
                                        className={cn(
                                            "w-28 text-base font-bold",
                                            isAnswered && isQuestionCorrect && "opacity-50 bg-secondary",
                                            isAnswered && !isQuestionCorrect && "bg-red-600 hover:bg-red-700 ring-2 ring-primary"
                                        )}
                                    >
                                       {isAnswered && !isQuestionCorrect ? <CheckCircle2 className="h-6 w-6"/> : 'Yanlış'}
                                    </Button>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </ScrollArea>
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
        return url; // Return original URL if parsing fails
    }
    return url; // Return original URL if no match
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
    const noOp = () => {};

    const renderContent = () => {
        const buttonColorClasses = [
            "bg-chart-1 hover:bg-chart-1/90",
            "bg-chart-2 hover:bg-chart-2/90",
            "bg-chart-3 hover:bg-chart-3/90",
            "bg-chart-4 hover:bg-chart-4/90",
        ];
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
                    <div className="flex justify-center">
                         <Image src={(step as VisualStep).imageUrl} alt={step.title} width={800} height={600} className="max-w-full max-h-[60vh] rounded-lg shadow-lg" data-ai-hint="lesson visual" />
                    </div>
                );
            case 'iframe':
                const iframeStep = step as IframeStep;
                return <iframe src={iframeStep.url} title={step.title} className={cn("w-full border-0 rounded-lg shadow-lg", isFullscreen ? "h-full" : "h-[70vh]")} allowFullScreen></iframe>
            case 'htmlSlide':
                 return <HtmlSlidePlayer step={step as HtmlSlideStep} isFullscreen={isFullscreen} onSlideScrolledToEnd={onSlideScrolledToEnd} />
            case 'activityLink':
                    const activityStep = step as ActivityLinkStep;
                    const activityIcons: Record<string, React.ElementType> = {
                        'bil-bakalim': Lightbulb, 'eslestirme': Puzzle, 'hafiza-kartlari': Layers, 'adam-asmaca': Skull,
                        'kavram-avi': Crosshair, 'kelime-avi': Search, 'hedefi-vur': MousePointerClick,
                        'cumle-olusturma': Shuffle, 'kategorilere-ayir': FolderKanban, 'milyoner-yarismasi': Trophy, 'soru-coz': BrainCircuit,
                        'dogru-yanlis-zinciri': LinkIcon, 'ben-kimim': BrainCircuit, 'acik-uclu-cevapla': Pencil, 'yazi-tura': Coins, 'deneme': ClipboardCheck, 'olay-siralama': ArrowDownUp
                    };
                    const Icon = activityIcons[activityStep.activityType.split('/').pop() || ''] || Gamepad2;
                    return (
                         <div className="text-center p-8 text-foreground dark:text-primary-foreground">
                             <Icon className="h-16 w-16 text-primary mx-auto mb-4" />
                             <h3 className="text-2xl font-bold">{activityStep.activityLabel}</h3>
                             <p className="text-muted-foreground mt-2">Bu etkinliği tamamlayarak bilgini test etmeye hazır mısın?</p>
                             <Button asChild size="lg" className="mt-6">
                                 <Link href={`${activityStep.activityType}?courseId=${courseId}&unitId=${unitId}&topicId=${topic.id}&courseName=${encodeURIComponent(courseTitle)}&unitName=${encodeURIComponent(unitTitle)}&topicName=${encodeURIComponent(topic.title)}`}>
                                    <Gamepad2 className="mr-2 h-5 w-5"/> Etkinliğe Başla
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
                    <div className="w-full max-w-4xl mx-auto aspect-video">
                        <iframe
                            src={embedUrl}
                            title={videoStep.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full rounded-lg shadow-2xl"
                        ></iframe>
                         {videoStep.description && <p className="mt-4 text-center text-muted-foreground">{videoStep.description}</p>}
                    </div>
                );
            }
            case 'mcq': {
                const mcqStep = step as McqStep;
                return (
                    <div className="w-full max-w-4xl mx-auto text-center">
                        <div className="p-6 md:p-8 rounded-lg shadow-lg bg-slate-800 border-2 border-slate-700 mb-8">
                          <h3 className={cn("font-semibold text-white", isFullscreen ? "text-4xl" : "text-2xl md:text-3xl")}>{mcqStep.question}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {mcqStep.options.map((option, index) => {
                                const isCorrect = option === mcqStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                return (
                                    <Button
                                        key={index}
                                        variant="default"
                                        className={cn(
                                            "h-auto justify-start text-left whitespace-normal",
                                            "p-3 text-base md:p-4 md:text-lg",
                                            isFullscreen ? "p-6 text-2xl" : "",
                                            "font-bold transition-all duration-300 transform hover:scale-105 shadow-lg text-primary-foreground border-2 border-transparent",
                                            !answer && buttonColorClasses[index % buttonColorClasses.length],
                                            answer && isCorrect && "bg-green-600 hover:bg-green-700 border-white animate-tada ring-4 ring-offset-2 ring-white scale-105",
                                            answer && isSelected && !isCorrect && "bg-red-600 hover:bg-red-700 border-white animate-shake",
                                            answer && !isSelected && !isCorrect && "opacity-40"
                                        )}
                                        onClick={() => onAnswer(option)}
                                        disabled={!!answer}
                                    >
                                        <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span> 
                                        <span>{option}</span>
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
                    <div className="w-full max-w-2xl mx-auto text-center text-foreground">
                         <div className="p-6 md:p-8 rounded-lg shadow-lg bg-slate-800 border-2 border-slate-700 mb-8">
                            <h3 className={cn("font-semibold text-white", isFullscreen ? "text-4xl" : "text-2xl md:text-3xl")}>{tfStep.statement}</h3>
                        </div>
                        <div className="flex justify-center gap-4">
                            {["Doğru", "Yanlış"].map((option) => {
                                const isSelected = answer?.answer === option;
                                const isCorrect = option === correctOption;
                                return (
                                    <Button
                                        key={option}
                                        className={cn(
                                            "h-24 w-52 text-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg text-white border-2 border-transparent",
                                            !answer && (option === "Doğru" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"),
                                            answer && isCorrect && "bg-green-600 scale-110 animate-tada ring-4 ring-white",
                                            answer && isSelected && !isCorrect && "bg-red-600 animate-shake",
                                            answer && !isSelected && !isCorrect && "opacity-40"
                                        )}
                                        onClick={() => onAnswer(option)}
                                        disabled={!!answer}
                                    >
                                        {answer && isCorrect && <CheckCircle2 className="mr-2 h-8 w-8"/>}
                                        {answer && isSelected && !isCorrect && <XCircle className="mr-2 h-8 w-8"/>}
                                        {option}
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
                    <div className="w-full max-w-4xl mx-auto text-center text-foreground">
                        <div className="p-6 md:p-8 rounded-lg shadow-lg bg-slate-800 border-2 border-slate-700 mb-8">
                          <h3 className={cn("font-semibold text-white", isFullscreen ? "text-4xl" : "text-2xl md:text-3xl")}>
                              {fitbStep.sentenceWithBlank?.replace('___', '______')}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(fitbStep.options || []).map((option, index) => {
                                const isCorrect = option === fitbStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                return (
                                    <Button
                                        key={index}
                                        variant="default"
                                        className={cn(
                                            "h-auto justify-center text-lg md:text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg text-white border-2 border-transparent",
                                            isFullscreen ? "py-8" : "py-6",
                                            !answer && buttonColorClasses[index % buttonColorClasses.length],
                                            answer && isCorrect && "bg-green-500 border-white animate-tada ring-4 ring-offset-2 ring-white scale-105",
                                            answer && isSelected && !isCorrect && "bg-red-600 border-white animate-shake",
                                            answer && !isSelected && !isCorrect && "opacity-40"
                                        )}
                                        onClick={() => onAnswer(option)}
                                        disabled={!!answer}
                                    >
                                         {answer && isCorrect && <CheckCircle2 className="mr-2 h-6 w-6"/>}
                                         {answer && isSelected && !isCorrect && <XCircle className="mr-2 h-6 w-6"/>}
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
                     <div className="text-center p-8 text-foreground">
                         <p className="text-xl font-semibold">Bu adım türü için interaktif bir görünüm bulunmuyor.</p>
                         <p className="text-muted-foreground mt-2">Adım Tipi: {step.type}</p>
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
        playSound('correct'); 
        
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
             <div className="flex-shrink-0 flex justify-between items-center p-4 border-t bg-background/50 backdrop-blur-sm md:pb-4 pb-20">
                 <div className="flex gap-2">
                    {user?.role === 'student' && (
                        <Button variant="outline" size="icon" onClick={() => setIsReportDialogOpen(true)} title="Hata Bildir">
                            <Bug className="h-4 w-4" />
                        </Button>
                    )}
                    {user?.role !== 'student' && <Button variant="secondary" size={isFullscreen ? 'lg' : 'default'} onClick={handleNext}>Adımı Atla</Button>}
                 </div>
                <div className="flex gap-2">
                    <Button variant="outline" size={isFullscreen ? 'lg' : 'default'} onClick={handlePrev} disabled={currentStepIndex === 0}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Geri
                    </Button>
                    <Button size={isFullscreen ? 'lg' : 'default'} onClick={handleContinueOrNext} disabled={!isNextButtonEnabled}>
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
            <Card className="h-full flex flex-col items-center justify-center text-center">
                <CardHeader>
                    <PartyPopper className="h-16 w-16 text-primary mx-auto" />
                    <CardTitle className="text-3xl">Tebrikler, Konuyu Tamamladın!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Bu konudan kazandığın puan:</p>
                    <p className="text-4xl font-bold text-primary">{internalProgress.score}</p>
                </CardContent>
                <CardFooter className="gap-2">
                    <Button variant="outline" onClick={() => { setIsFinished(false); setCurrentStepIndex(0); setInternalProgress({ answers: {}, score: 0 }); }}>
                        <Repeat className="mr-2 h-4 w-4" /> Tekrar Et
                    </Button>
                    <Button onClick={() => onTopicComplete(topic!.id, internalProgress.score)}>
                        Ders Haritasına Dön
                    </Button>
                </CardFooter>
            </Card>
        );
    }
    
    if (!currentStep) {
        return (
            <div className="flex justify-center items-center h-full text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Ders içeriği yükleniyor...
            </div>
        );
    }

    const getBackgroundClass = () => {
        switch(currentStep.type) {
            case 'content':
            case 'objectiveList':
            case 'accordion':
                 return "from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-950";
            case 'conceptExplanation':
                return "from-indigo-200 to-purple-300 dark:from-indigo-900 dark:to-purple-950";
            case 'mcq':
            case 'tf':
            case 'fitb':
            case 'anagram':
            case 'sentenceScramble':
            case 'trueFalseList':
                 return "from-slate-800 to-slate-900"; // Specific for question types
            case 'flashcard':
            case 'anagramFlashcard':
                 return "from-rose-100 to-pink-200 dark:from-rose-900 dark:to-pink-950";
            case 'visual':
                 return "from-gray-300 to-gray-400 dark:from-gray-800 dark:to-gray-900";
            case 'iframe':
            case 'htmlSlide':
                 return "from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900";
             case 'conceptMap':
                return "from-sky-900 to-indigo-950";
            case 'video':
                 return "from-gray-800 to-gray-900";
            default:
                 return "bg-background";
        }
    }

    return (
      <div className="h-full w-full flex flex-col">
        <div className={cn(
          "w-full flex-1 flex flex-col overflow-hidden", // Added overflow-hidden
           `bg-gradient-to-br ${getBackgroundClass()}`
        )}>
           <div className="flex-shrink-0 p-4 border-b bg-background/50 backdrop-blur-sm">
                <Progress value={(currentStepIndex + 1) / steps.length * 100} />
                 <div className="flex justify-between items-center text-xs text-foreground/80 pt-1">
                    <span>Adım {currentStepIndex + 1}/{steps.length}</span>
                    <span className="font-bold">Puan: {internalProgress.score}</span>
                 </div>
           </div>
           <div className="flex-grow flex items-center justify-center relative p-2 sm:p-4 overflow-y-auto">
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
           {renderNavigation()}
        </div>
        <ErrorReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} itemToReport={currentStep} />
      </div>
    );
}
