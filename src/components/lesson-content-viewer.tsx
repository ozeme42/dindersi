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
    PenTool, Eraser, Highlighter, Undo, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, EyeOff, Palette, Pencil,
    RotateCw, RotateCcw, ZoomIn, ZoomOut, Grid2X2, Grid3X3, HelpCircle, MessageSquare,
    Play, Pause, Timer, Clock, Compass, BookOpen, FileText, ExternalLink,
    Volume2, VolumeX
} from 'lucide-react';
import type { 
    LessonStep, AnagramStep, SentenceScrambleStep, FitbStep, AccordionStep, IframeStep, 
    Topic, ActivityLinkStep, VisualStep, McqStep, TfStep, FlashcardStep, TrueFalseListStep, 
    HtmlSlideStep, PdfSlideStep, ContentStep, ConceptMapStep, ConceptMapData, AnagramFlashcardStep, 
    ConceptExplanationStep, ObjectiveListStep, VideoStep, Question, AnagramGameStep, HookQuestionStep,
    NotebookNoteStep, ProcessFlowStep, ConceptMatrixStep, CategoryTableStep, CategoryTableColumn,
    TopicOutlineStep, TopicOutlineItem
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn, transformGoogleDriveImageUrl } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import Link from 'next/link';
import { playSound } from "@/lib/audio-service";
import { useAuth } from "@/context/auth-context";
import { PresentationDrawingBoard } from "@/components/presentation-drawing-board";
import { PdfSlidePlayer } from "@/components/pdf-slide-player";
import { isGameStep } from "@/lib/lesson-cache";

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
    fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge';
    jumpToStep?: number | null;
    onJumpDone?: () => void;
    onStepIndexChange?: (index: number, total: number) => void;
    onOpenTools?: () => void;
    onOpenWheel?: () => void;
    showWheelButton?: boolean;
    onCloseWheelButton?: () => void;
    isTeacherMode?: boolean;
    isPerfMode?: boolean;
    presentationTheme?: 'cosmic-dark' | 'vibrant-studio' | 'clean-light';
    presentationFont?: 'outfit' | 'poppins' | 'jakarta' | 'playfair';
    isAutoReadEnabled?: boolean;
};

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

// --- MODÜLER BİLEŞEN VE YARDIMCI İÇERİKLER (src/components/lesson-viewer/) ---
export * from './lesson-viewer';
import { StepContent, DrawingCanvas } from './lesson-viewer';
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
    animationSpeed = 'off',
    fontSizeScale = 'normal',
    jumpToStep,
    onJumpDone,
    onStepIndexChange,
    onOpenTools,
    onOpenWheel,
    showWheelButton,
    onCloseWheelButton,
    isTeacherMode,
    isPerfMode = (animationSpeed === 'off'),
    presentationTheme = 'clean-light',
    presentationFont = 'playfair',
    isAutoReadEnabled = false
}: LessonContentViewerProps) {
    const { user } = useAuth();
    const authIsTeacher = useTeacherMode();
    const isTeacher = typeof isTeacherMode === 'boolean' ? isTeacherMode : authIsTeacher;
    const isLightBoard = presentationTheme === 'clean-light';
    const isVibrantStudio = presentationTheme === 'vibrant-studio';
    const isCosmicDark = presentationTheme === 'cosmic-dark' || (!isLightBoard && !isVibrantStudio);
    const { toast } = useToast();
      
    const [isAnimating, setIsAnimating] = useState(false);
    const [revealedSentencesCount, setRevealedSentencesCount] = useState(1);
    const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
    const [flippedAnagramCards, setFlippedAnagramCards] = useState<Set<number>>(new Set());
    const [exploredCards, setExploredCards] = useState<Set<number>>(new Set());
    const [internalProgress, setInternalProgress] = useState<LocalProgress>(() => ({ answers: {}, score: 0 }));
    
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const [isFinished, setIsFinished] = useState(false);
    
    const [isVisualMaximized, setIsVisualMaximized] = useState(false);
      
    const [showResumeDialog, setShowResumeDialog] = useState(false);
    const [savedStepIndex, setSavedStepIndex] = useState<number | null>(null);
    const [hideUI, setHideUI] = useState(false); // UI Gizleme State'i

    // Mobil / tablet ekran tespiti (oyunlu adımları mobilde gizlemek için)
    const checkIsMobileScreen = () => {
        if (typeof window === 'undefined') return false;
        const isNarrow = window.innerWidth < 1024;
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        return isNarrow || (isMobileUA && isTouch);
    };

    const [isMobile, setIsMobile] = useState<boolean>(() => checkIsMobileScreen());

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(checkIsMobileScreen());
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Mobil dokunmatik kaydırma (swipe) referansları
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    // Tam ekran durumu takibi
    const [isDocFullscreen, setIsDocFullscreen] = useState(false);
    useEffect(() => {
        const handleFs = () => {
            setIsDocFullscreen(!!document.fullscreenElement);
        };
        handleFs();
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, []);

    const toggleDocFullscreen = () => {
        if (!document.fullscreenElement) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    };

    // Steps ve CurrentStep tanımları (öğrencilere oyunlu adımlar HİÇ GELMEZ)
    const steps = useMemo(() => {
        if (!topic?.steps) return [];
        return topic.steps.filter(s => {
            // Öğrenci modunda veya mobilde oyunlu adımlar ASLA yer almaz (sadece akıllı tahta / öğretmen modunda yer alır)
            if (!isTeacher && isGameStep(s)) return false;
            if (isMobile && isGameStep(s)) return false;
            const isPublished = (s.isPublished ?? true) || isTeacher;
            if (!isPublished) return false;
            return true;
        });
    }, [topic, isTeacher, isMobile]);

    // Adım sayısı değiştiğinde veya oyunlar filtrelendiğinde taşmayı önle
    useEffect(() => {
        if (steps.length > 0 && currentStepIndex >= steps.length) {
            setCurrentStepIndex(Math.max(0, steps.length - 1));
        }
    }, [steps.length, currentStepIndex]);

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
    const isImmersiveStep = ['visual', 'htmlSlide', 'pdfSlide'].includes(currentStep?.type || '');
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
                if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < steps.length) {
                    // Güvenlik: Eğer kayıtlı adım oyun adımıysa sıfırla
                    if (isGameStep(steps[savedIndex])) {
                        setCurrentStepIndex(0);
                        localStorage.removeItem(storageKey);
                    } else if (savedIndex > 0) {
                        setSavedStepIndex(savedIndex);
                        setShowResumeDialog(true);
                    } else {
                        setCurrentStepIndex(0);
                    }
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
    
    const isFullWidthStep = isActivityStep || isHtmlSlideStep || currentStep?.type === 'pdfSlide' || (currentStep?.type === 'visual' && isVisualMaximized) || currentStep?.type === 'notebookNote' || currentStep?.type === 'categoryTable' || currentStep?.type === 'topicOutline' || (currentStep?.type as string) === 'summaryOverview' || currentStep?.type === 'hookQuestion';
      
    const isStepCompleted = internalProgress.answers[currentStepIndex]?.completed;

    const isNextButtonEnabled = useMemo(() => {
        if (!currentStep) return false;
        
        if (isTeacher) return true;

        if (isHtmlSlideStep) return true;
        // Oyun ve etkinlik adımlarında geçiş daima serbesttir (öğrenci asla "Cevabını Seç" ile kilitlenmez)
        if (isActivityStep || isGameStep(currentStep)) return true;

        // Yayında olmayan bir adım denk gelirse geçiş asla kilitlenmez
        if (currentStep.isPublished === false) return true;

        const isPassiveStep = ['visual', 'iframe', 'conceptMap', 'video', 'conceptExplanation', 'hookQuestion', 'notebookNote', 'processFlow', 'conceptMatrix', 'categoryTable', 'topicOutline', 'summaryOverview'].includes(currentStep.type);
        if (isPassiveStep) return true;

        if (['content', 'objectiveList', 'accordion'].includes(currentStep.type)) return true; 

        const isCardStep = ['flashcard', 'anagramFlashcard'].includes(currentStep.type);
        if (isCardStep) {
            const cards = (currentStep as FlashcardStep | AnagramFlashcardStep).cards || [];
            if (cards.length === 0) return true;
            if (isTeacher) return true;
            if (internalProgress.answers[currentStepIndex]?.completed) return true;
            return exploredCards.size >= cards.length;
        }

        const answer = internalProgress.answers[currentStepIndex];

        if (currentStep.type === 'trueFalseList') {
            if (isTeacher) return true;
            const qCount = (currentStep as TrueFalseListStep).questions?.length || 0;
            if (qCount === 0) return true;
            const answersForStep = internalProgress.answers[currentStepIndex] || {};
            const answeredCount = Object.keys(answersForStep).filter(k => !isNaN(Number(k))).length;
            return !!answersForStep.completed || answeredCount >= qCount;
        }

        if (currentStep.type === 'matching' || (currentStep as any).type === 'conceptMatching') {
            if (isTeacher) return true;
            return !!answer?.completed || answer === 'completed';
        }

        if (currentStep.type === 'anagramGame' || (currentStep as any).type === 'kelimeDahasi') {
            return true;
        }

        if (currentStep.type === 'sentenceScramble') {
            if (isTeacher) return true;
            return !!answer?.completed || answer !== undefined;
        }

        const isQuizStep = ['mcq', 'fitb', 'tf'].includes(currentStep.type);
        if (isQuizStep) {
            return answer !== undefined && answer !== null;
        }

        // Soru veya özel kart/alıştırma olmayan tüm adımlarda geçiş varsayılan olarak açıktır
        return true;

    }, [currentStep, internalProgress.answers, currentStepIndex, exploredCards, isTeacher, isActivityStep, isHtmlSlideStep, isStepCompleted]);

    const handleNext = useCallback(() => {
        if (!currentStep) return;
          
        if (currentStepIndex === steps.length - 1) {
             if (topic) {
                const storageKey = `lesson_progress_${user?.uid || 'guest'}_${topic.id}`;
                localStorage.removeItem(storageKey);
            }
        }

        if (['visual', 'iframe', 'conceptMap', 'video', 'conceptExplanation', 'htmlSlide', 'pdfSlide', 'activityLink'].includes(currentStep.type) || isGameStep(currentStep)) {
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
            setExploredCards(new Set());
            setIsAnimating(false);
            setIsVisualMaximized(false); 
        } else {
            const finalScore = internalProgress.score;
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
        
        if (currentStep.type === 'mcq' || currentStep.type === 'fitb') {
            isCorrect = answer === (currentStep as McqStep).correctAnswer;
            points = isCorrect ? 250 : 0;
        } else if (currentStep.type === 'tf') {
            isCorrect = (answer === "Doğru") === (currentStep as TfStep).isTrue;
            points = isCorrect ? 250 : 0;
        } else if (currentStep.type === 'anagram') {
            isCorrect = (answer as string).toLocaleUpperCase('tr-TR') === (currentStep as AnagramStep).correctAnswer.toLocaleUpperCase('tr-TR');
            points = isCorrect ? 250 : 0;
        } else if (currentStep.type === 'anagramGame' || (currentStep as any).type === 'kelimeDahasi') {
            isCorrect = true;
            points = 250;
        } else if (currentStep.type === 'sentenceScramble') {
             isCorrect = (answer as string) === (currentStep as SentenceScrambleStep).correctSentence;
             points = isCorrect ? 250 : 0;
        } else if (currentStep.type === 'matching' || (currentStep as any).type === 'conceptMatching') {
             isCorrect = true;
             points = 250;
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
        const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { answer, isCorrect, completed: true } };
        const newScore = internalProgress.score + points;
        setInternalProgress({ answers: newAnswers, score: newScore });
    };

    const handleCardFlip = useCallback((cardIndex: number, type: 'flashcard' | 'anagramFlashcard') => {
        playSound('pop'); 
        const cardSet = type === 'flashcard' ? flippedCards : flippedAnagramCards;
        const setCardSet = type === 'flashcard' ? setFlippedCards : setFlippedAnagramCards;
        const currentStepTyped = currentStep as FlashcardStep | AnagramFlashcardStep;
        const totalCards = currentStepTyped.cards?.length || 0;
        
        const newSet = new Set(cardSet);
        if (newSet.has(cardIndex)) newSet.delete(cardIndex);
        else newSet.add(cardIndex);
        setCardSet(newSet);

        setExploredCards(prev => {
            const next = new Set(prev);
            next.add(cardIndex);
            if (next.size >= totalCards && internalProgress.answers[currentStepIndex] === undefined) {
                const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { completed: true } };
                setInternalProgress(p => ({ ...p, answers: newAnswers }));
            }
            return next;
        });
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
            setRevealedSentencesCount(1);
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
        const points = correctCount * 250;
        const newAnswers = { ...internalProgress.answers, [currentStepIndex]: { ...answersForStep, completed: true } };
        setInternalProgress(prev => ({ ...prev, score: prev.score + points, answers: newAnswers }));
        if (correctCount > 0) {
            import('canvas-confetti').then(m => m.default({ particleCount: 150, spread: 80, origin: { y: 0.6 } })).catch(() => {});
            playSound('win');
        }
    };

    // Mevcut sayfa içinde henüz açılmamış parça/cümle/kavram var mı kontrolü
    const getStepRevealStatus = useCallback(() => {
        if (!currentStep) return { hasUnrevealedItems: false, totalItems: 1, currentCount: 1 };

        // 1. Anahtar Kavramlar
        const isConcept = currentStep.type === 'conceptExplanation' || 
                          (typeof currentStep.title === 'string' && /kavram|anahtar/i.test(currentStep.title) && currentStep.type !== 'anagramFlashcard' && currentStep.type !== 'conceptMap' && !/hedef|kazan/i.test(currentStep.title) && currentStep.type !== 'objectiveList');

        if (isConcept) {
            const raw = (currentStep as any).items || (currentStep as any).cards || [];
            let totalItems = 1;
            if (Array.isArray(raw) && raw.length > 0) {
                totalItems = raw.length;
            } else if (typeof (currentStep as any).content === 'string') {
                const doc = new DOMParser().parseFromString(`<div>${(currentStep as any).content}</div>`, 'text/html');
                const listItems = doc.querySelectorAll('li');
                totalItems = listItems.length > 0 ? listItems.length : ((currentStep as any).content.match(/[^.!?,\n]+[.!?,\n]*/g) || [(currentStep as any).content]).filter((s: string) => s.trim().length > 0).length;
            }
            if (totalItems <= 0) totalItems = 1;
            return {
                hasUnrevealedItems: revealedSentencesCount < totalItems,
                totalItems,
                currentCount: Math.min(revealedSentencesCount, totalItems)
            };
        }

        // 2. Metin / Öğrenme Hedefleri / Akordeon Listesi
        const isContentList = ['content', 'objectiveList', 'accordion'].includes(currentStep.type);
        if (isContentList) {
            let totalItems = 0;
            if (currentStep.type === 'objectiveList') totalItems = (currentStep as ObjectiveListStep).items?.length || 0;
            else if (currentStep.type === 'accordion') totalItems = (currentStep as AccordionStep).items?.length || 0;
            else if (currentStep.type === 'content') {
                const stepContent = (currentStep as ContentStep).content || '';
                if (typeof window !== 'undefined') {
                    const doc = new DOMParser().parseFromString(`<div>${stepContent}</div>`, 'text/html');
                    const listItems = doc.querySelectorAll('li');
                    if (listItems.length > 0) {
                        totalItems = Array.from(listItems).map(li => li.innerHTML.trim()).filter(Boolean).length;
                    } else {
                        totalItems = (stepContent.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(Boolean) || [stepContent]).length;
                    }
                } else {
                    const listItems = stepContent.match(/<li>/g) || [];
                    totalItems = listItems.length > 0 ? listItems.length : (stepContent.match(/[^.!?]+[.!?]+/g) || [stepContent]).length;
                }
            }
            if (totalItems <= 0) totalItems = 1;
            return {
                hasUnrevealedItems: revealedSentencesCount < totalItems,
                totalItems,
                currentCount: Math.min(revealedSentencesCount, totalItems)
            };
        }

        // 3. Diğer tekil sayfalar
        return {
            hasUnrevealedItems: false,
            totalItems: 1,
            currentCount: 1
        };
    }, [currentStep, revealedSentencesCount]);

    const handleContinueOrNext = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        if (!currentStep) return;

        const { hasUnrevealedItems } = getStepRevealStatus();

        if (hasUnrevealedItems) {
            setRevealedSentencesCount(prev => prev + 1);
            playSound('pop');
        } else {
            handleNext();
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const diffX = e.changedTouches[0].clientX - touchStartX.current;
        const diffY = e.changedTouches[0].clientY - touchStartY.current;
        touchStartX.current = null;
        touchStartY.current = null;

        if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
            if (diffX < 0) {
                // Sola kaydırma -> Sonraki adım
                if (isNextButtonEnabled) {
                    handleContinueOrNext();
                }
            } else {
                // Sağa kaydırma -> Önceki adım
                handlePrev();
            }
        }
    };

    // Klavye Kısayolları ile Sunum & Ders İlerleme (Sağ/Sol Ok, Boşluk, PageUp/Down)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) return;
            if ((activeEl as HTMLElement)?.isContentEditable) return;

            if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                if (currentStep?.type === 'pdfSlide') {
                    // PDF slaytı kendi iç sayfa geçişini yönetir
                    return;
                }
                if (isNextButtonEnabled) {
                    e.preventDefault();
                    handleContinueOrNext();
                }
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                if (currentStep?.type === 'pdfSlide') {
                    // PDF slaytı kendi iç sayfa geçişini yönetir
                    return;
                }
                e.preventDefault();
                handlePrev();
            } else if (e.key === ' ' && !['BUTTON', 'A'].includes(activeEl?.tagName || '')) {
                if (currentStep?.type === 'pdfSlide') {
                    return;
                }
                if (isNextButtonEnabled) {
                    e.preventDefault();
                    handleContinueOrNext();
                }
            } else if ((e.key === 'm' || e.key === 'M') && !['INPUT', 'TEXTAREA'].includes(activeEl?.tagName || '')) {
                e.preventDefault();
                setHideUI(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isNextButtonEnabled, currentStep, getStepRevealStatus, handleNext]);

    if (isFinished) {
        return (
            <div className={cn(
                "h-full flex flex-col items-center justify-center p-6 gap-6 relative overflow-hidden",
                isTeacher 
                    ? "bg-gradient-to-br from-indigo-50/80 via-purple-50/70 to-pink-50/70 text-slate-900" 
                    : "bg-[#09071a] text-white"
            )}>
                {/* Arka plan efektleri */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
                    <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-indigo-500/15 rounded-full blur-[120px]" />
                </div>
                <div className="relative flex flex-col items-center gap-6 max-w-md w-full text-center z-10">
                    {/* Tamamlandı ikonu */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/30 blur-2xl rounded-full animate-pulse" />
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 border-2 border-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                            <PartyPopper className="h-12 w-12 sm:h-14 sm:w-14 text-white" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.3em] mb-2">Tebrikler!</p>
                        <h1 className={cn("text-3xl sm:text-4xl md:text-5xl font-black leading-tight", isTeacher ? "text-slate-900" : "text-white")}>Ders Tamamlandı!</h1>
                    </div>
                    {/* Puan kartı */}
                    <div className={cn(
                        "relative rounded-3xl overflow-hidden border-2 shadow-xl w-full",
                        isTeacher ? "border-amber-300 bg-white/95 shadow-amber-100/60" : "border-amber-500/40 bg-amber-950/20 backdrop-blur-xl shadow-black/50"
                    )}>
                        <div className="relative px-8 py-5 flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Trophy className="w-5 h-5 text-amber-400" />
                                <span className="text-amber-400 text-xs font-black uppercase tracking-widest">Toplam Puan</span>
                            </div>
                            <span className={cn("text-4xl sm:text-5xl font-black tabular-nums", isTeacher ? "text-slate-900" : "text-amber-200")}>{internalProgress.score}</span>
                        </div>
                    </div>
                    {/* Ünite Tamamlama Ödülü */}
                    <div className="relative overflow-hidden border-2 border-emerald-500/40 bg-emerald-950/30 backdrop-blur-xl rounded-2xl px-6 py-3 shadow-md flex items-center justify-center gap-2 w-full animate-bounce">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-300 font-black text-xs sm:text-sm tracking-widest uppercase">Ünite Tamamlama Ödülü: +10.000 XP</span>
                    </div>
                    <Button
                        onClick={() => onTopicComplete(topic!.id, internalProgress.score)}
                        className="w-full relative h-13 sm:h-14 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-base sm:text-lg border-0 shadow-xl shadow-emerald-500/30 active:scale-[0.97] transition-all duration-200 overflow-hidden cursor-pointer"
                    >
                        <span className="relative">{completeButtonText || 'Bitir & Devam Et'}</span>
                    </Button>
                    <a href="/student/soru-bankasi" className="px-6 py-2 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Soru Bankasına Dön
                    </a>
                </div>
            </div>
        );
    }
      
    if (steps.length === 0) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center">
                <div className="max-w-md p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-4">
                    <BookOpen className="h-16 w-16 mx-auto text-indigo-400 opacity-60" />
                    <h3 className="text-xl font-bold text-white">İçerik Hazırlanıyor</h3>
                    <p className="text-sm text-slate-400">Bu ders konusunun akış adımları yakında eklenecektir.</p>
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
      <div className={cn(
          "h-full w-full flex flex-col overflow-hidden relative select-none",
          isTeacher ? (isLightBoard ? "bg-transparent text-slate-950 presentation-mode" : "bg-transparent text-slate-100 presentation-mode") : "bg-[#09071a] text-white",
          (isPerfMode || animationSpeed === 'off') && "perf-mode"
      )}>
        
        {isTeacher && <DrawingCanvas stepIndex={currentStepIndex} />}

        {/* ══ ÖĞRENCİ MODU ÜST BARI (MODERN MOBİL İLERLEME BARI) ══ */}
        {!isTeacher && (
            <div className="w-full flex-shrink-0 z-30 px-3 py-2 sm:px-6 sm:py-2.5 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg flex-shrink-0">
                            Adım {currentStepIndex + 1} / {steps.length}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-300 truncate hidden xs:inline">
                            {currentStep?.title || topic?.title}
                        </span>
                    </div>

                    <div className="flex-1 max-w-xs mx-2">
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                            <motion.div 
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.round(((currentStepIndex + 1) / steps.length) * 100)}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span className="text-xs font-black tabular-nums">{internalProgress.score} XP</span>
                    </div>
                </div>
            </div>
        )}

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
        <div 
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={cn(
                "flex-1 relative w-full", 
                isFullWidthStep ? "overflow-hidden" : `overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent ${isTeacher && isFullscreen && !isImmersiveStep ? 'pb-20' : (isTeacher ? 'pb-24' : 'pb-16')}`
            )}
        >
             {!isTeacher && !isFullWidthStep && animationSpeed !== 'off' && !isPerfMode && (
                 <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                     <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px]" />
                     <div className="absolute bottom-[10%] right-[10%] w-72 h-72 bg-violet-500/10 rounded-full blur-[100px]" />
                 </div>
             )}

           <div className={cn(
               "relative z-10 w-full flex flex-col justify-start",
               (isTeacher || isFullWidthStep) ? "h-full" : "min-h-full",
               !isFullWidthStep && (isTeacher ? "py-2 px-3 md:px-6" : "py-3 sm:py-5 px-3 sm:px-6 md:px-8 max-w-4xl mx-auto")
           )}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={currentStepIndex}
                    custom={direction}
                    initial={animationSpeed === 'off' ? false : { opacity: 0, x: direction * 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={animationSpeed === 'off' ? undefined : { opacity: 0, x: direction * -50 }}
                    transition={animationSpeed === 'off' ? { duration: 0 } : { duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                    className={cn(
                        "w-full flex flex-col items-center justify-start relative",
                        (isTeacher || isFullWidthStep) ? "h-full" : "min-h-full flex-1"
                    )}
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
                    hideUI={hideUI}
                    onNextStep={handleNext}
                    onPrevStep={handlePrev}
                    currentStepIndex={currentStepIndex}
                    isTeacher={isTeacher}
                    presentationTheme={presentationTheme}
                    presentationFont={presentationFont}
                    isAutoReadEnabled={isAutoReadEnabled}
                    onJumpToStep={(stepIdx: number) => {
                        setDirection(stepIdx > currentStepIndex ? 1 : -1);
                        setCurrentStepIndex(stepIdx);
                    }}
                  />
                </motion.div>
              </AnimatePresence>
           </div>
        </div>
        
        {/* AÇMA TUŞU (Öğretmen modunda bar gizliyken görünür - HİÇBİR KOŞULDA KAYBOLMAZ) */}
        {isTeacher && hideUI && (
            <>
                <div 
                    onClick={() => setHideUI(false)} 
                    className={cn(
                        "absolute bottom-0 left-0 right-0 h-3 cursor-pointer z-[99] pointer-events-auto transition-colors",
                        isLightBoard ? "hover:bg-indigo-500/15" : isVibrantStudio ? "hover:bg-purple-500/25" : "hover:bg-indigo-500/20"
                    )} 
                    title="Alt Menüyü Aç"
                />
                <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-3 fade-in pointer-events-auto select-none flex items-center gap-2">
                     <button 
                        type="button"
                        onClick={(e) => {
                             e.stopPropagation();
                             setHideUI(false);
                        }}
                        className={cn(
                            "w-11 h-11 rounded-full flex items-center justify-center transition-all backdrop-blur-2xl cursor-pointer hover:scale-110 active:scale-95 group",
                            isLightBoard
                                ? "bg-white/95 hover:bg-slate-100 text-slate-950 shadow-[0_6px_25px_rgba(99,102,241,0.25)] border-2 border-slate-300 ring-2 ring-indigo-500/20"
                                : isVibrantStudio
                                    ? "bg-[#0c0f24]/95 hover:bg-[#161a38] text-white shadow-[0_6px_30px_rgba(217,70,239,0.4)] border-2 border-purple-500/50 ring-2 ring-purple-500/30"
                                    : "bg-slate-950/95 hover:bg-slate-900 text-white shadow-[0_6px_30px_rgba(0,0,0,0.85)] border-2 border-white/30 ring-2 ring-white/10"
                        )}
                        title="Alt Menüyü Aç"
                     >
                        <ChevronUp className="w-6 h-6 transition-transform group-hover:-translate-y-0.5" />
                     </button>
                     {showWheelButton && onOpenWheel && (
                          <button
                             type="button"
                             onClick={(e) => {
                                 e.stopPropagation();
                                 onOpenWheel();
                             }}
                             className={cn(
                                "h-11 px-4 rounded-full font-black text-xs flex items-center gap-1.5 transition-all backdrop-blur-2xl cursor-pointer hover:scale-105 active:scale-95 shadow-lg",
                                isLightBoard
                                    ? "bg-amber-200 hover:bg-amber-300 text-amber-950 border-2 border-amber-400 ring-2 ring-amber-400/20 shadow-amber-200/50"
                                    : isVibrantStudio
                                        ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-slate-950 border-2 border-amber-200 shadow-[0_6px_30px_rgba(245,158,11,0.6)] ring-2 ring-amber-400/30"
                                        : "bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-300 shadow-[0_6px_30px_rgba(245,158,11,0.6)] ring-2 ring-black/30"
                             )}
                             title="Öğrenci Kura Çarkı (R)"
                          >
                             <span className="text-base">🎡</span>
                             <span>Çark (R)</span>
                          </button>
                     )}
                </div>
            </>
        )}

        {/* ══ ÖĞRETMEN MODU ALT NAVİGASYON BARI (ŞEFFAF & FLOATING GLASS DOCK) ══ */}
        {isTeacher ? (() => {
            const dockBtnBaseClass = isLightBoard
                ? "bg-slate-100 hover:bg-slate-200 text-slate-950 font-black border-2 border-slate-300 shadow-xs"
                : isVibrantStudio
                    ? "bg-[#131635] hover:bg-[#1f2452] text-white font-black border border-purple-400/40 shadow-xs"
                    : "bg-slate-900/90 hover:bg-slate-800 text-white font-black border border-white/20 shadow-xs";

            return (
                <div
                    className={cn(
                        "z-30 transition-all duration-300 ease-in-out px-3 pb-2 pt-1 w-full",
                        isImmersiveStep ? "absolute bottom-0 left-0 right-0 pointer-events-none" : "flex-shrink-0 relative",
                        hideUI ? "h-0 p-0 overflow-hidden opacity-0 pointer-events-none" : "opacity-100"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Alt Menüyü Gizle Butonu */}
                    {!hideUI && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setHideUI(true);
                                }}
                                className={cn(
                                    "h-5 px-3 rounded-t-xl text-xs font-black border-t border-x shadow-md backdrop-blur-md transition-all flex items-center justify-center cursor-pointer",
                                    isLightBoard
                                        ? "bg-white hover:bg-slate-100 text-slate-950 border-slate-300 shadow-slate-200/50"
                                        : isVibrantStudio
                                            ? "bg-[#0b0e22] hover:bg-[#141836] text-white border-purple-500/40 shadow-[0_4px_15px_rgba(168,85,247,0.2)]"
                                            : "bg-slate-950 hover:bg-slate-900 text-white border-white/20 shadow-black/60"
                                )}
                                title="Alt Menüyü Gizle"
                            >
                                <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                    <div className={cn(
                        "presentation-dock w-full max-w-5xl mx-auto rounded-2xl backdrop-blur-2xl flex items-center justify-between gap-2 px-3 py-1.5 pointer-events-auto transition-all duration-300",
                        isLightBoard
                            ? "bg-white/98 border-2 border-slate-300 shadow-[0_12px_35px_rgba(15,23,42,0.12)] text-slate-950 ring-1 ring-slate-400/20"
                            : isVibrantStudio
                                ? "bg-[#090b1c]/95 border-2 border-purple-500/40 shadow-[0_14px_45px_rgba(168,85,247,0.35)] text-white ring-1 ring-purple-500/30"
                                : "bg-slate-950/90 border-2 border-white/20 shadow-[0_14px_45px_rgba(0,0,0,0.9)] text-white ring-1 ring-white/10"
                    )}>

                        {/* SOL: Geri + Tam Ekran / Küçült + Yenile */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handlePrev}
                                disabled={currentStepIndex === 0}
                                className={cn(
                                    "w-8 h-8 rounded-xl disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95 shadow-xs backdrop-blur-sm cursor-pointer",
                                    dockBtnBaseClass
                                )}
                                title="Önceki Sayfa"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>

                            {/* Sunum Araçları Butonu (Araçlar) */}
                            {onOpenTools && (
                                <button
                                    onClick={onOpenTools}
                                    className={cn(
                                        "h-8 px-3 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all active:scale-95 shadow-xs backdrop-blur-sm cursor-pointer",
                                        isLightBoard
                                            ? "border-2 border-indigo-400 bg-indigo-100 hover:bg-indigo-200 text-indigo-950 shadow-sm"
                                            : isVibrantStudio
                                                ? "border border-purple-300 bg-purple-900/80 hover:bg-purple-800 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                                : "border border-indigo-400/60 bg-indigo-950/80 hover:bg-indigo-900 text-white shadow-indigo-950/50"
                                    )}
                                    title="Sunum Araçları ve Ayarlar"
                                >
                                    <Sparkles className={cn(
                                        "w-3.5 h-3.5 animate-pulse", 
                                        isLightBoard ? "text-indigo-700" : isVibrantStudio ? "text-cyan-300" : "text-indigo-300"
                                    )} />
                                    <span>Araçlar</span>
                                </button>
                            )}

                            {/* Kolay Açma Çark Butonu (Hızlı Kura / Çark) */}
                            {showWheelButton && onOpenWheel && (
                                <div className="relative flex items-center group/wheel">
                                    <button
                                        onClick={onOpenWheel}
                                        className={cn(
                                            "h-8 px-3 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all active:scale-95 backdrop-blur-sm cursor-pointer animate-in zoom-in-95 duration-150",
                                            isLightBoard
                                                ? "border-2 border-amber-400 bg-amber-200 hover:bg-amber-300 text-amber-950 shadow-sm"
                                                : isVibrantStudio
                                                    ? "border-2 border-amber-300 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                                                    : "border-2 border-amber-300 bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                                        )}
                                        title="Öğrenci Kura Çarkı (R)"
                                    >
                                        <span className="text-sm">🎡</span>
                                        <span>Çark (R)</span>
                                    </button>
                                    {onCloseWheelButton && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCloseWheelButton();
                                            }}
                                            className={cn(
                                                "opacity-0 group-hover/wheel:opacity-100 -ml-2 -mt-3.5 z-10 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-opacity cursor-pointer shadow-sm",
                                                isLightBoard ? "bg-slate-300 text-slate-950" : "bg-slate-800 text-white"
                                            )}
                                            title="Kısayolu kaldır"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Sayfayı Yenile Butonu */}
                            <button
                                onClick={() => window.location.reload()}
                                className={cn(
                                    "h-8 px-2.5 rounded-xl flex items-center gap-1 text-xs font-black transition-all active:scale-95 shadow-xs backdrop-blur-sm cursor-pointer",
                                    dockBtnBaseClass
                                )}
                                title="Sayfayı Yenile"
                            >
                                <Repeat className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Yenile</span>
                            </button>

                            {/* Tam Ekran / Küçült Butonu */}
                            <button
                                onClick={toggleDocFullscreen}
                                className={cn(
                                    "h-8 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-black transition-all active:scale-95 shadow-xs backdrop-blur-sm cursor-pointer",
                                    isDocFullscreen
                                        ? (isLightBoard 
                                            ? "bg-rose-100 border-2 border-rose-400 text-rose-950 hover:bg-rose-200" 
                                            : isVibrantStudio 
                                                ? "bg-rose-600/40 border border-rose-400 text-white hover:bg-rose-600/60 shadow-[0_0_12px_rgba(244,63,94,0.4)]" 
                                                : "bg-rose-600/35 border border-rose-400 text-white hover:bg-rose-600/50")
                                        : dockBtnBaseClass
                                )}
                                title={isDocFullscreen ? "Tam Ekrandan Çık (F)" : "Tam Ekran Yap (F)"}
                            >
                                {isDocFullscreen ? (
                                    <>
                                        <Minimize className={cn("w-3.5 h-3.5", isLightBoard ? "text-rose-950" : "text-white")} />
                                        <span className="hidden sm:inline">Küçült</span>
                                    </>
                                ) : (
                                    <>
                                        <Maximize className={cn("w-3.5 h-3.5", isLightBoard ? "text-indigo-900" : isVibrantStudio ? "text-cyan-300" : "text-indigo-300")} />
                                        <span className="hidden sm:inline">Tam Ekran</span>
                                    </>
                                )}
                            </button>

                            {/* Alt Menüyü Gizle Butonu */}
                            <button
                                onClick={() => setHideUI(true)}
                                className={cn(
                                    "h-8 px-2 rounded-xl flex items-center gap-1 text-xs font-black transition-all active:scale-95 shadow-xs backdrop-blur-sm cursor-pointer",
                                    dockBtnBaseClass
                                )}
                                title="Alt Menüyü Gizle"
                            >
                                <EyeOff className={cn("w-3.5 h-3.5", isLightBoard ? "text-slate-950" : isVibrantStudio ? "text-purple-200" : "text-slate-200")} />
                                <span className="hidden sm:inline">Gizle</span>
                            </button>
                        </div>

                        {/* ORTA: İlerleme noktaları + sayfa seçici */}
                        <div className="flex-1 flex flex-col items-center gap-1 max-w-xs">
                            {/* Nokta barı */}
                            <div className="flex items-center gap-1 max-w-[180px] overflow-hidden py-0.5">
                                {steps.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "rounded-full transition-all duration-300",
                                            idx === currentStepIndex
                                                ? (isLightBoard 
                                                    ? "h-1.5 w-4 bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.6)]" 
                                                    : isVibrantStudio 
                                                        ? "h-1.5 w-4 bg-gradient-to-r from-fuchsia-500 to-cyan-400 shadow-[0_0_12px_rgba(217,70,239,0.8)]" 
                                                        : "h-1.5 w-4 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]")
                                                : internalProgress.answers[idx]?.completed
                                                    ? "h-1 w-1 bg-emerald-500"
                                                    : isLightBoard 
                                                        ? "h-1 w-1 bg-slate-300" 
                                                        : isVibrantStudio 
                                                            ? "h-1 w-1 bg-purple-400/30" 
                                                            : "h-1 w-1 bg-white/20"
                                        )}
                                    />
                                ))}
                            </div>
                            {/* Sayfa seçici */}
                            <Select value={currentStepIndex.toString()} onValueChange={(val) => {
                                const targetIndex = parseInt(val, 10);
                                if (!isNaN(targetIndex)) setCurrentStepIndex(targetIndex);
                            }}>
                                <SelectTrigger className={cn(
                                    "h-5 px-2 py-0 rounded-md border text-xs font-black tracking-wide focus:ring-0 focus:ring-offset-0 w-auto gap-1 cursor-pointer transition-all",
                                    isLightBoard 
                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-950 border-slate-300" 
                                        : isVibrantStudio 
                                            ? "bg-[#131635] hover:bg-[#1e2350] text-white border-purple-400/50 shadow-xs" 
                                            : "bg-slate-900/90 hover:bg-slate-800 text-white border-white/20 shadow-xs"
                                )}>
                                    <SelectValue placeholder={`Sayfa ${currentStepIndex + 1} / ${steps.length}`} />
                                </SelectTrigger>
                                <SelectContent className={cn(
                                    "backdrop-blur-xl border-2 shadow-2xl",
                                    isLightBoard 
                                        ? "bg-white border-indigo-200 text-slate-950 shadow-indigo-100/60" 
                                        : isVibrantStudio 
                                            ? "bg-[#0b0d22] border-purple-500/50 text-white shadow-purple-950/80" 
                                            : "bg-slate-950 border-white/20 text-white shadow-black/80"
                                )}>
                                    {steps.map((s, i) => (
                                        <SelectItem 
                                            key={i} 
                                            value={i.toString()} 
                                            className={cn(
                                                "text-xs font-black cursor-pointer py-1.5",
                                                isLightBoard 
                                                    ? "text-slate-950 focus:bg-indigo-100 focus:text-indigo-950" 
                                                    : isVibrantStudio 
                                                        ? "text-white focus:bg-purple-600 focus:text-white" 
                                                        : "text-white focus:bg-slate-800 focus:text-white"
                                            )}
                                        >
                                            Sayfa {i + 1} / {steps.length}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* SAĞ: Puan + Atla + Devam */}
                        <div className="flex items-center gap-1.5">
                            {/* Puan rozeti */}
                            <div className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-xl shadow-xs backdrop-blur-sm border",
                                isLightBoard
                                    ? "bg-amber-100 border-2 border-amber-400 text-amber-950"
                                    : isVibrantStudio
                                        ? "bg-amber-400 border border-amber-300 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                                        : "bg-amber-400 border border-amber-300 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                            )}>
                                <Trophy className={cn("w-3.5 h-3.5", isLightBoard ? "text-amber-950" : "text-slate-950")} />
                                <div className="relative h-3.5 min-w-[22px] overflow-hidden">
                                    <AnimatePresence mode="popLayout">
                                        <motion.span
                                            key={internalProgress.score}
                                            initial={{ y: 12, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -12, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            className={cn(
                                                "absolute inset-0 text-xs font-black text-center leading-none flex items-center justify-center",
                                                isLightBoard ? "text-amber-950" : "text-slate-950"
                                            )}
                                        >
                                            {internalProgress.score}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                            </div>

                            <button
                                onClick={handleNext}
                                className={cn(
                                    "h-8 px-2.5 rounded-xl text-xs font-black transition-all active:scale-95 shadow-xs backdrop-blur-sm cursor-pointer",
                                    dockBtnBaseClass
                                )}
                            >
                                Atla
                            </button>

                            {(() => {
                                const { hasUnrevealedItems, currentCount, totalItems } = getStepRevealStatus();
                                const isLastStep = currentStepIndex === steps.length - 1;

                                return (
                                    <button
                                        onClick={handleContinueOrNext}
                                        disabled={!isNextButtonEnabled || (isLastStep && isFinished)}
                                        className={cn(
                                            "h-8 px-3.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 relative overflow-hidden flex items-center gap-1.5 shadow-sm",
                                            !isNextButtonEnabled
                                                ? (isLightBoard 
                                                    ? "bg-slate-200 text-slate-700 border-2 border-slate-300 cursor-not-allowed font-extrabold" 
                                                    : "bg-white/10 text-slate-300 border border-white/15 cursor-not-allowed font-extrabold")
                                                : hasUnrevealedItems
                                                    ? (isLightBoard
                                                        ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border border-indigo-400/50 shadow-md shadow-indigo-300/40 hover:shadow-lg"
                                                        : isVibrantStudio
                                                            ? "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white border border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.45)] hover:shadow-[0_0_25px_rgba(217,70,239,0.65)]"
                                                            : "bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white border border-purple-400/40 shadow-sm shadow-purple-500/25 hover:shadow-md hover:shadow-purple-500/40")
                                                    : isLastStep
                                                        ? (isLightBoard
                                                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400/50 shadow-md shadow-emerald-200/50"
                                                            : isVibrantStudio
                                                                ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                                                                : "bg-gradient-to-r from-emerald-500 to-green-600 text-white border border-emerald-400/40 shadow-sm shadow-emerald-500/25 hover:shadow-md hover:shadow-emerald-500/40")
                                                        : (isLightBoard
                                                            ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border border-indigo-400/50 shadow-md shadow-indigo-200/50"
                                                            : isVibrantStudio
                                                                ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.45)]"
                                                                : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white border border-indigo-400/40 shadow-sm shadow-indigo-500/25 hover:shadow-md hover:shadow-indigo-500/40")
                                        )}
                                        title={!isNextButtonEnabled ? "Bu sayfadaki içeriği tamamlamadan sonraki adıma geçemezsin." : (hasUnrevealedItems ? "Sayfadaki sonraki içeriği göster" : (isLastStep ? "Dersi Bitir" : "Sonraki Sayfaya Geç"))}
                                    >
                                        {isNextButtonEnabled && (
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.25),transparent_60%)]" />
                                        )}
                                        <span className="relative flex items-center gap-1.5 drop-shadow-xs">
                                            {!isNextButtonEnabled ? (
                                                <>
                                                    <span>Kilitli</span>
                                                    <Lock className="w-3.5 h-3.5" />
                                                </>
                                            ) : hasUnrevealedItems ? (
                                                <>
                                                    <span>{totalItems > 1 ? `Devam Et (${currentCount}/${totalItems})` : "Devam Et"}</span>
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                                                </>
                                            ) : isLastStep ? (
                                                <>
                                                    <span>{completeButtonText || 'Bitir'}</span>
                                                    <PartyPopper className="w-3.5 h-3.5" />
                                                </>
                                            ) : (
                                                <>
                                                    <span>İleri</span>
                                                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                                                </>
                                            )}
                                        </span>
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            );
        })() : (
            /* ══ ÖĞRENCİ MODU ALT AKSİYON BARI (MOBİL UYUMLU & BAŞPARMAK DOSTU) ══ */
            <div 
                className={cn(
                    "z-30 flex-shrink-0 relative w-full backdrop-blur-2xl px-3 py-2.5 sm:px-6 sm:py-3.5 shadow-2xl transition-all",
                    isLightBoard
                        ? "bg-white/95 border-t border-slate-300 text-slate-950"
                        : isVibrantStudio
                            ? "bg-[#090b1c]/95 border-t border-purple-500/30 text-white"
                            : "bg-slate-950/90 border-t border-white/10 text-white"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="max-w-2xl mx-auto flex flex-col gap-2">
                    {/* Cevap Geri Bildirim Banner'ı */}
                    {internalProgress.answers[currentStepIndex] && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold backdrop-blur-md shadow-md",
                                internalProgress.answers[currentStepIndex].isCorrect !== false
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                    : "bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                {internalProgress.answers[currentStepIndex].isCorrect !== false ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Harika! Doğru cevap 🎉 (+250 XP)</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                        <span>Farklı bir cevap seçtin, inceleyip devam et!</span>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Butonlar Satırı */}
                    <div className="flex items-center gap-2.5 w-full">
                        {currentStepIndex > 0 && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className={cn(
                                    "h-12 w-12 sm:h-13 sm:w-13 rounded-2xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0 shadow-sm cursor-pointer",
                                    isLightBoard
                                        ? "bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-950"
                                        : isVibrantStudio
                                            ? "bg-[#131635] hover:bg-[#1e2350] border border-purple-400/40 text-white"
                                            : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white"
                                )}
                                title="Önceki Adım"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        {(() => {
                            const { hasUnrevealedItems, currentCount, totalItems } = getStepRevealStatus();
                            const isLastStep = currentStepIndex === steps.length - 1;
                            const isCardStep = ['flashcard', 'anagramFlashcard'].includes(currentStep?.type || '');
                            const isGame = isActivityStep || isGameStep(currentStep);
                            const isQuizStep = ['mcq', 'fitb', 'tf'].includes(currentStep?.type || '');

                            let buttonLabel = "Sonraki Adım";
                            let buttonIcon = <ArrowRight className="w-4 h-4 stroke-[2.5]" />;

                            if (!isNextButtonEnabled) {
                                if (isCardStep) {
                                    const totalCards = (currentStep as any)?.cards?.length || 0;
                                    buttonLabel = `Kartları İncele (${exploredCards.size}/${totalCards})`;
                                    buttonIcon = <Layers className="w-4 h-4" />;
                                } else if (currentStep?.type === 'trueFalseList') {
                                    buttonLabel = "Tüm Soruları Cevapla";
                                    buttonIcon = <HelpCircle className="w-4 h-4" />;
                                } else if (currentStep?.type === 'matching' || (currentStep as any)?.type === 'conceptMatching') {
                                    buttonLabel = "Tüm Çiftleri Eşleştir";
                                    buttonIcon = <Shuffle className="w-4 h-4" />;
                                } else if (isGame) {
                                    buttonLabel = "Sonraki Adım";
                                    buttonIcon = <ArrowRight className="w-4 h-4 stroke-[2.5]" />;
                                } else if (isQuizStep) {
                                    buttonLabel = "Cevabını Seç";
                                    buttonIcon = <Lock className="w-4 h-4" />;
                                } else {
                                    buttonLabel = "Sonraki Adım";
                                    buttonIcon = <ArrowRight className="w-4 h-4 stroke-[2.5]" />;
                                }
                            } else if (hasUnrevealedItems) {
                                buttonLabel = totalItems > 1 ? `Devam Et (${currentCount}/${totalItems})` : "Devam Et";
                                buttonIcon = <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />;
                            } else if (isLastStep) {
                                buttonLabel = completeButtonText || "Dersi Tamamla";
                                buttonIcon = <PartyPopper className="w-4 h-4" />;
                            } else if (isGame) {
                                buttonLabel = "Sonraki Adım";
                                buttonIcon = <ArrowRight className="w-4 h-4 stroke-[2.5]" />;
                            }

                            return (
                                <button
                                    type="button"
                                    onClick={handleContinueOrNext}
                                    disabled={!isNextButtonEnabled || (isLastStep && isFinished)}
                                    className={cn(
                                        "flex-1 h-12 sm:h-13 rounded-2xl font-black text-sm sm:text-base transition-all duration-200 active:scale-[0.98] relative overflow-hidden flex items-center justify-center gap-2 shadow-lg cursor-pointer",
                                        !isNextButtonEnabled
                                            ? (isLightBoard 
                                                ? "bg-slate-200 border-2 border-slate-300 text-slate-700 cursor-not-allowed font-extrabold"
                                                : isVibrantStudio
                                                    ? "bg-[#131635] border border-purple-400/20 text-slate-400 cursor-not-allowed font-extrabold"
                                                    : "bg-slate-900/80 border border-white/10 text-slate-400 cursor-not-allowed font-extrabold")
                                            : hasUnrevealedItems
                                                ? (isLightBoard
                                                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border border-indigo-400/50 shadow-indigo-300/40 hover:shadow-indigo-400/50"
                                                    : isVibrantStudio
                                                        ? "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white border border-fuchsia-400/50 shadow-purple-500/35 hover:shadow-purple-500/50"
                                                        : "bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white border border-purple-400/40 shadow-purple-500/25 hover:shadow-purple-500/40")
                                                : isLastStep
                                                    ? "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white border border-emerald-400/50 shadow-emerald-500/30 hover:shadow-emerald-500/50 animate-pulse"
                                                    : (isLightBoard
                                                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border border-indigo-400/50 shadow-indigo-300/40 hover:shadow-indigo-400/50"
                                                        : isVibrantStudio
                                                            ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white border border-purple-400/50 shadow-purple-500/35 hover:shadow-purple-500/50"
                                                            : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border border-indigo-400/40 shadow-indigo-500/25 hover:shadow-indigo-500/40")
                                    )}
                                >
                                    {isNextButtonEnabled && (
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
                                    )}
                                    <span className="relative flex items-center justify-center gap-2">
                                        <span>{buttonLabel}</span>
                                        {buttonIcon}
                                    </span>
                                </button>
                            );
                        })()}
                    </div>
                </div>
            </div>
        )}
      </div>
    );
}