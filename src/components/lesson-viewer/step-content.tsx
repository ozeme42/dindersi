'use client';

import React from 'react';
import { 
    Lock, ArrowRight, Gamepad2, HelpCircle, 
    CheckCircle2, XCircle, CheckCircle, Sparkles, AlertTriangle,
    RotateCcw, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import type { 
    VisualStep, IframeStep, HtmlSlideStep, PdfSlideStep, ActivityLinkStep, 
    FlashcardStep, AnagramFlashcardStep, TrueFalseListStep, ConceptMapStep, 
    VideoStep, McqStep, TfStep, FitbStep, AnagramStep, AnagramGameStep, 
    SentenceScrambleStep, HookQuestionStep, NotebookNoteStep, ProcessFlowStep, 
    ConceptMatrixStep, CategoryTableStep, TopicOutlineStep, MiniGameStep,
    OpenEndedQuestionsStep, ClozeParagraphStep, CategorySortStep
} from '@/lib/types';

import { MiniGamePlayer } from './players/mini-game-player';
import { OpenEndedQuestionsPlayer } from './players/open-ended-player';
import { ClozeParagraphPlayer } from './players/cloze-paragraph-player';
import { CategorySortingPlayer } from './players/category-sorting-player';
import { ContentListPlayer } from './players/content-list-player';
import { ConceptExplanationPlayer } from './players/concept-player';
import { FlashcardPlayer, AnagramFlashcardPlayer } from './players/flashcard-player';
import { 
    VisualPlayer, 
    HtmlSlidePlayer, 
    InteractiveTrueFalseList, 
    ConceptMapPlayer, 
    AnagramGame, 
    AnagramGamePlayer, 
    SentenceScrambleGame, 
    MatchingPlayer 
} from './players/interactive-players';
import { 
    HookQuestionPlayer, 
    NotebookNotePlayer, 
    ProcessFlowPlayer, 
    ConceptMatrixPlayer, 
    CategoryTablePlayer, 
    TopicOutlinePlayer 
} from './players/text-players';
import { PdfSlidePlayer } from '@/components/pdf-slide-player';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

function McqStepView({
    step,
    onAnswer,
    answer,
    isTeacher,
    isFullscreen,
    fontSizeScale,
    presentationTheme,
}: {
    step: McqStep;
    onAnswer: (answer: any) => void;
    answer: any;
    isTeacher: boolean;
    isFullscreen: boolean;
    fontSizeScale: string;
    presentationTheme?: string;
}) {
    const isGame3D = presentationTheme === 'game-3d';
    const isSketchnote = presentationTheme === 'sketchnote';
    const isDarkTheme = presentationTheme === 'cosmic-dark' || presentationTheme === 'vibrant-studio';

    const [classVoteMode, setClassVoteMode] = React.useState<boolean>(isTeacher);
    const [pendingChoice, setPendingChoice] = React.useState<string | null>(null);
    const [localRetry, setLocalRetry] = React.useState<boolean>(false);

    React.useEffect(() => {
        setPendingChoice(null);
        setLocalRetry(false);
    }, [step]);

    const isRevealed = Boolean(answer) && !localRetry;

    const game3DOptions = [
        { card: 'bg-gradient-to-b from-sky-500 via-sky-600 to-blue-700 hover:from-sky-400 hover:to-blue-600 border-2 border-sky-300 border-b-[6px] border-b-blue-950 text-white shadow-xl shadow-sky-500/25 active:border-b-2 active:translate-y-1', badge: 'bg-white/25 text-white border-2 border-white/50' },
        { card: 'bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 border-2 border-emerald-300 border-b-[6px] border-b-emerald-950 text-white shadow-xl shadow-emerald-500/25 active:border-b-2 active:translate-y-1', badge: 'bg-white/25 text-white border-2 border-white/50' },
        { card: 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 border-2 border-amber-200 border-b-[6px] border-b-amber-950 text-amber-950 shadow-xl shadow-amber-500/25 active:border-b-2 active:translate-y-1', badge: 'bg-white/35 text-amber-950 border-2 border-amber-900/30' },
        { card: 'bg-gradient-to-b from-rose-500 via-rose-600 to-red-700 hover:from-rose-400 hover:to-red-600 border-2 border-rose-300 border-b-[6px] border-b-rose-950 text-white shadow-xl shadow-rose-500/25 active:border-b-2 active:translate-y-1', badge: 'bg-white/25 text-white border-2 border-white/50' },
    ];
    const sketchnoteOptions = [
        { card: 'bg-[#f0f9ff] hover:bg-[#e0f2fe] border-[2.5px] border-[#1e293b] text-slate-900 shadow-[4px_4px_0_#1e293b]', badge: 'bg-[#38bdf8] text-[#0369a1] border-2 border-[#1e293b]' },
        { card: 'bg-[#fdf2f8] hover:bg-[#fce7f3] border-[2.5px] border-[#1e293b] text-slate-900 shadow-[4px_4px_0_#1e293b]', badge: 'bg-[#f472b6] text-[#9d174d] border-2 border-[#1e293b]' },
        { card: 'bg-[#fefce8] hover:bg-[#fef08a] border-[2.5px] border-[#1e293b] text-slate-900 shadow-[4px_4px_0_#1e293b]', badge: 'bg-[#fde047] text-[#854d0e] border-2 border-[#1e293b]' },
        { card: 'bg-[#f0fdf4] hover:bg-[#dcfce7] border-[2.5px] border-[#1e293b] text-slate-900 shadow-[4px_4px_0_#1e293b]', badge: 'bg-[#4ade80] text-[#15803d] border-2 border-[#1e293b]' },
    ];
    const optionColors = [
        'border-2 border-sky-300 bg-sky-50/95 hover:bg-sky-100 text-sky-950 shadow-md shadow-sky-100/50',
        'border-2 border-purple-300 bg-purple-50/95 hover:bg-purple-100 text-purple-950 shadow-md shadow-purple-100/50',
        'border-2 border-amber-300 bg-amber-50/95 hover:bg-amber-100 text-amber-950 shadow-md shadow-amber-100/50',
        'border-2 border-rose-300 bg-rose-50/95 hover:bg-rose-100 text-rose-950 shadow-md shadow-rose-100/50'
    ];
    const badgeColors = [
        'bg-sky-500 text-white',
        'bg-purple-500 text-white',
        'bg-amber-500 text-white',
        'bg-rose-500 text-white'
    ];
    const darkOptionThemes = [
        { border: 'border-sky-400/50 hover:border-sky-300', bg: 'bg-sky-950/75 hover:bg-sky-900/80 text-white', badge: 'bg-sky-500/30 border-sky-300/50 text-sky-100' },
        { border: 'border-violet-400/50 hover:border-violet-300', bg: 'bg-violet-950/75 hover:bg-violet-900/80 text-white', badge: 'bg-violet-500/30 border-violet-300/50 text-violet-100' },
        { border: 'border-amber-400/50 hover:border-amber-300', bg: 'bg-amber-950/70 hover:bg-amber-900/80 text-white', badge: 'bg-amber-500/30 border-amber-300/50 text-amber-100' },
        { border: 'border-rose-400/50 hover:border-rose-300', bg: 'bg-rose-950/75 hover:bg-rose-900/80 text-white', badge: 'bg-rose-500/30 border-rose-300/50 text-rose-100' },
    ];

    const getMcqQuestionFont = () => {
        if (!isTeacher) return isFullscreen ? "text-lg md:text-2xl" : "text-base md:text-xl";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl";
        if (fontSizeScale === 'lg') return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
        if (fontSizeScale === 'xs') return "text-2xl md:text-3xl";
        return "text-3xl sm:text-4xl md:text-5xl";
    };

    const getMcqOptionFont = () => {
        if (!isTeacher) return "p-3 sm:p-4 text-sm sm:text-base";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl p-6 sm:p-8 md:p-10 min-h-[5.5rem] md:min-h-[7rem]";
        if (fontSizeScale === 'lg') return "text-xl sm:text-2xl md:text-3xl lg:text-4xl p-5 sm:p-7 md:p-8 min-h-[5rem] md:min-h-[6.5rem]";
        if (fontSizeScale === 'xs') return "text-lg md:text-xl p-4 min-h-[3.5rem]";
        return "text-xl sm:text-2xl md:text-3xl lg:text-4xl p-5 sm:p-6 md:p-7 min-h-[4.5rem] md:min-h-[5.5rem]";
    };

    const getMcqBadgeSize = () => {
        if (!isTeacher) return "h-7 w-7 text-xs sm:h-8 sm:w-8 sm:text-sm mr-3";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 text-2xl sm:text-3xl md:text-4xl mr-4 md:mr-6";
        if (fontSizeScale === 'lg') return "h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-xl sm:text-2xl md:text-3xl mr-4 md:mr-5";
        if (fontSizeScale === 'xs') return "h-10 w-10 text-lg mr-3";
        return "h-12 w-12 sm:h-14 sm:w-14 text-xl sm:text-2xl mr-4";
    };

    const handleOptionClick = (option: string) => {
        if (isRevealed) return;
        if (isTeacher && classVoteMode) {
            setPendingChoice(prev => prev === option ? null : option);
            return;
        }
        setLocalRetry(false);
        onAnswer(option);
    };

    const handleRevealAnswer = () => {
        setLocalRetry(false);
        onAnswer(pendingChoice ?? step.correctAnswer);
    };

    const handleResetQuestion = () => {
        setPendingChoice(null);
        setLocalRetry(true);
    };

    const selectedDisplayOption = isRevealed ? answer?.answer : pendingChoice;

    return (
        <div className={cn(
            "w-full mx-auto flex flex-col justify-center p-2 sm:p-4 pb-20",
            isTeacher ? "max-w-[96%] w-full pt-4 md:pt-6 min-h-[65vh]" : "max-w-2xl py-2"
        )}>
            {/* Soru Kutusu */}
            <div className={cn(
                "relative rounded-3xl border transition-all text-center overflow-hidden shadow-xl",
                isTeacher 
                    ? (isGame3D
                        ? "border-4 border-amber-400 bg-gradient-to-b from-slate-900/95 via-indigo-950/95 to-slate-950/98 text-white shadow-[0_12px_45px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.25)] mb-4 md:mb-6 p-6 sm:p-8 md:p-10"
                        : isSketchnote
                        ? "border-[3.5px] border-[#1e293b] bg-[#fefce8] text-slate-900 shadow-[6px_6px_0_#1e293b] mb-4 md:mb-6 p-6 sm:p-8 md:p-10"
                        : isDarkTheme
                        ? "border-2 border-white/15 bg-slate-900/90 text-white backdrop-blur-2xl mb-4 md:mb-6 p-6 sm:p-8 md:p-10"
                        : "border-2 border-indigo-200 bg-white/95 backdrop-blur-2xl mb-4 md:mb-6 p-6 sm:p-8 md:p-10 shadow-indigo-100/60") 
                    : "border-white/10 bg-slate-900/80 backdrop-blur-xl mb-3 sm:mb-5 p-4 sm:p-6 shadow-black/40"
            )}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
                {isTeacher && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        {isGame3D ? (
                            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 border-2 border-amber-200 text-amber-950 text-xs font-black uppercase tracking-wider shadow-lg">
                                <span>🕌</span>
                                <span>3D Soru Arenası</span>
                            </div>
                        ) : isSketchnote ? (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#fde047] border-2 border-[#1e293b] text-slate-900 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#1e293b]">
                                <span>🕌</span>
                                <span>DinDersi Atölyesi • Soru</span>
                            </div>
                        ) : (
                            <div className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider",
                                isDarkTheme ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200" : "bg-indigo-50 border-indigo-200 text-indigo-700"
                            )}>
                                <HelpCircle className="w-3.5 h-3.5" /> Çoktan Seçmeli
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setClassVoteMode(prev => !prev)}
                                className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer",
                                    classVoteMode
                                        ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                                        : (isGame3D || isDarkTheme)
                                            ? "bg-white/10 text-slate-200 border-white/20 hover:bg-white/20"
                                            : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                                )}
                                title="Sınıf Oyu modunda şık işaretlenir ama hemen açıklanmaz"
                            >
                                {classVoteMode ? "🗳️ Sınıf Oyu Modu Açık" : "⚡ Anlık Kontrol"}
                            </button>
                            {isRevealed ? (
                                <button
                                    type="button"
                                    onClick={handleResetQuestion}
                                    className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" /> Tekrar Sor
                                </button>
                            ) : classVoteMode && (
                                <button
                                    type="button"
                                    onClick={handleRevealAnswer}
                                    className="px-3.5 py-1 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-white flex items-center gap-1.5 shadow cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" /> {pendingChoice ? "Seçimi Kontrol Et & Aç" : "Cevabı Aç"}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {!isTeacher && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-wider mb-2.5">
                        <HelpCircle className="w-3.5 h-3.5" /> Çoktan Seçmeli Soru
                    </div>
                )}
                <h3 className={cn(
                    "font-black leading-relaxed tracking-tight",
                    isTeacher ? ((isGame3D || isDarkTheme) ? "text-white" : "text-slate-900") : "text-white",
                    isSketchnote && "font-['Caveat',cursive]",
                    getMcqQuestionFont()
                )}>{step.question}</h3>
            </div>

            {/* Şıklar */}
            <div className={cn("grid gap-2.5 sm:gap-4 md:gap-5", isTeacher ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                {step.options.map((option, index) => {
                    const isCorrect = option === step.correctAnswer;
                    const isSelected = selectedDisplayOption === option;
                    const isVoted = !isRevealed && pendingChoice === option;
                    const skTheme = sketchnoteOptions[index % sketchnoteOptions.length];
                    const gTheme = game3DOptions[index % game3DOptions.length];
                    const dTheme = darkOptionThemes[index % darkOptionThemes.length];
                    const colorClass = isGame3D
                        ? gTheme.card
                        : isSketchnote
                            ? skTheme.card
                            : isDarkTheme
                                ? `${dTheme.bg} ${dTheme.border}`
                                : optionColors[index % optionColors.length];
                    const badgeClass = isGame3D
                        ? gTheme.badge
                        : isSketchnote
                            ? skTheme.badge
                            : isDarkTheme
                                ? dTheme.badge
                                : badgeColors[index % badgeColors.length];

                    return (
                        <motion.div
                            key={index}
                            whileHover={!isRevealed ? { scale: 1.01, y: -1 } : {}}
                            whileTap={!isRevealed ? { scale: 0.985 } : {}}
                            className={cn("w-full h-full", isRevealed && isSelected && !isCorrect && "animate-shake")}
                        >
                            <Button
                                variant="default"
                                className={cn(
                                    "w-full h-auto justify-start text-left whitespace-normal rounded-2xl md:rounded-3xl border-2 transition-all duration-300 backdrop-blur-md shadow-md font-bold cursor-pointer",
                                    getMcqOptionFont(),
                                    !isRevealed && (isTeacher ? colorClass : `${dTheme.bg} ${dTheme.border} text-slate-100 hover:shadow-lg`),
                                    isVoted && "ring-4 ring-amber-400 scale-[1.01]",
                                    isRevealed && isCorrect ? (isGame3D ? "bg-emerald-500 border-2 border-emerald-300 border-b-[6px] border-b-emerald-950 text-white shadow-2xl shadow-emerald-500/50" : isSketchnote ? "bg-[#4ade80] border-[2.5px] border-[#15803d] text-emerald-950 shadow-[4px_4px_0_#15803d]" : "bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-500/30") : "",
                                    isRevealed && isSelected && !isCorrect ? (isGame3D ? "bg-rose-500 border-2 border-rose-300 border-b-[6px] border-b-rose-950 text-white shadow-2xl shadow-rose-500/50" : isSketchnote ? "bg-[#f87171] border-[2.5px] border-[#991b1b] text-rose-950 shadow-[4px_4px_0_#991b1b]" : "bg-rose-500 border-rose-400 text-white shadow-xl shadow-rose-500/30") : "",
                                    isRevealed && !isSelected && !isCorrect ? ((isTeacher && !isDarkTheme && !isGame3D) ? "bg-slate-100 border-slate-200 text-slate-400 opacity-45 shadow-none" : "bg-white/5 border-white/10 text-slate-400 opacity-35") : ""
                                )}
                                onClick={() => handleOptionClick(option)}
                                disabled={isRevealed}
                            >
                                <span className={cn(
                                    "flex shrink-0 items-center justify-center rounded-xl md:rounded-2xl font-black border shadow-sm",
                                    getMcqBadgeSize(),
                                    !isRevealed ? (isTeacher ? badgeClass : dTheme.badge) : "bg-white/20 text-white border-white/40"
                                )}>
                                    {String.fromCharCode(65 + index)}
                                </span>
                                <span className={cn("flex-1 leading-snug", isSketchnote && "font-['Patrick_Hand',cursive] font-bold text-slate-900")}>{option}</span>
                                {isVoted && <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 ml-2 shrink-0">Seçim</span>}
                                {isRevealed && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-200 flex-shrink-0 ml-2" />}
                                {isRevealed && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-rose-200 flex-shrink-0 ml-2" />}
                            </Button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Açıklama Kutusu (Cevap Açıldığında) */}
            {isRevealed && step.explanation && (
                <div className={cn(
                    "mt-4 md:mt-6 p-4 sm:p-5 rounded-2xl border-2 text-left animate-in fade-in slide-in-from-bottom-2 duration-300",
                    isSketchnote
                        ? "bg-[#fefce8] border-[#ca8a04] text-slate-900 font-['Patrick_Hand',cursive] text-lg shadow-[4px_4px_0_#ca8a04]"
                        : (isGame3D || isDarkTheme || !isTeacher)
                            ? "bg-emerald-950/60 border-emerald-400/50 text-emerald-50"
                            : "bg-emerald-50 border-emerald-300 text-emerald-950"
                )}>
                    <p className="text-xs font-black uppercase tracking-wider opacity-75 mb-1">💡 Açıklama</p>
                    <p className="text-sm sm:text-base md:text-lg font-bold leading-relaxed">{step.explanation}</p>
                </div>
            )}
        </div>
    );
}

function TfStepView({
    step,
    onAnswer,
    answer,
    isTeacher,
    isFullscreen,
    fontSizeScale,
    presentationTheme,
}: {
    step: TfStep;
    onAnswer: (answer: any) => void;
    answer: any;
    isTeacher: boolean;
    isFullscreen: boolean;
    fontSizeScale: string;
    presentationTheme?: string;
}) {
    const correctOption = step.isTrue ? "Doğru" : "Yanlış";
    const isGame3D = presentationTheme === 'game-3d';
    const isSketchnote = presentationTheme === 'sketchnote';
    const isDarkTheme = presentationTheme === 'cosmic-dark' || presentationTheme === 'vibrant-studio';

    const [classVoteMode, setClassVoteMode] = React.useState<boolean>(isTeacher);
    const [pendingChoice, setPendingChoice] = React.useState<string | null>(null);
    const [localRetry, setLocalRetry] = React.useState<boolean>(false);

    React.useEffect(() => {
        setPendingChoice(null);
        setLocalRetry(false);
    }, [step]);

    const isRevealed = Boolean(answer) && !localRetry;
    const selectedDisplayOption = isRevealed ? answer?.answer : pendingChoice;

    const getTfQuestionFont = () => {
        if (!isTeacher) return isFullscreen ? "text-lg md:text-2xl" : "text-base md:text-xl";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl";
        if (fontSizeScale === 'lg') return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
        if (fontSizeScale === 'xs') return "text-2xl md:text-3xl";
        return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
    };

    const getTfButtonSize = () => {
        if (!isTeacher) return "h-14 sm:h-16 w-36 sm:w-48 text-base sm:text-lg rounded-2xl";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') {
            return "h-44 sm:h-52 md:h-60 w-64 sm:w-80 md:w-[28rem] text-4xl sm:text-5xl md:text-6xl border-b-[8px] md:border-b-[12px] rounded-3xl";
        }
        if (fontSizeScale === 'lg') {
            return "h-40 sm:h-48 md:h-52 w-56 sm:w-72 md:w-96 text-3xl sm:text-4xl md:text-5xl border-b-[6px] md:border-b-[10px] rounded-3xl";
        }
        if (fontSizeScale === 'xs') {
            return "h-28 w-44 text-2xl border-b-[4px] rounded-2xl";
        }
        return "h-36 sm:h-44 md:h-48 w-52 sm:w-64 md:w-80 text-3xl sm:text-4xl border-b-[6px] md:border-b-[8px] rounded-3xl";
    };

    const getTfIconSize = () => {
        if (!isTeacher) return "h-5 w-5 sm:h-6 sm:w-6";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "h-16 w-16 md:h-24 md:w-24";
        if (fontSizeScale === 'lg') return "h-14 w-14 md:h-20 md:w-20";
        if (fontSizeScale === 'xs') return "h-10 w-10";
        return "h-12 w-12 md:h-16 md:w-16";
    };

    const handleChoice = (option: string) => {
        if (isRevealed) return;
        if (isTeacher && classVoteMode) {
            setPendingChoice(prev => prev === option ? null : option);
            return;
        }
        setLocalRetry(false);
        onAnswer(option);
    };

    return (
        <div className={cn(
            "w-full mx-auto flex flex-col justify-center p-2 sm:p-4 text-center pb-20",
            isTeacher ? "max-w-[96%] w-full pt-4 md:pt-6 min-h-[65vh]" : "max-w-2xl py-2"
        )}>
            {/* İfade Kutusu */}
            <div className={cn(
                "relative rounded-3xl border transition-all text-center overflow-hidden shadow-xl",
                isTeacher 
                    ? (isGame3D
                        ? "border-4 border-amber-400 bg-gradient-to-b from-slate-900/95 via-indigo-950/95 to-slate-950/98 text-white shadow-[0_12px_45px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.25)] mb-6 md:mb-8 p-6 sm:p-8 md:p-12"
                        : isSketchnote
                        ? "border-[3.5px] border-[#1e293b] bg-[#fff7ed] text-slate-900 shadow-[6px_6px_0_#1e293b] mb-6 md:mb-8 p-6 sm:p-8 md:p-12"
                        : isDarkTheme
                        ? "border-2 border-white/15 bg-slate-900/90 text-white backdrop-blur-2xl mb-6 md:mb-8 p-6 sm:p-8 md:p-12"
                        : "border-2 border-purple-200 bg-white/95 backdrop-blur-2xl mb-6 md:mb-8 p-6 sm:p-8 md:p-12 shadow-purple-100/60") 
                    : "border-white/10 bg-slate-900/80 backdrop-blur-xl mb-4 sm:mb-6 p-5 sm:p-7 shadow-black/40"
            )}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
                {isTeacher && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        {isGame3D ? (
                            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 border-2 border-amber-200 text-amber-950 text-xs font-black uppercase tracking-wider shadow-lg">
                                <span>⚖️</span>
                                <span>3D Hikmet Terazisi</span>
                            </div>
                        ) : isSketchnote ? (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#fb923c] border-2 border-[#1e293b] text-slate-900 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#1e293b]">
                                <span>🕌</span>
                                <span>DinDersi Atölyesi • Doğru / Yanlış</span>
                            </div>
                        ) : (
                            <div className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider",
                                isDarkTheme ? "bg-purple-500/20 border-purple-400/40 text-purple-200" : "bg-purple-50 border-purple-200 text-purple-700"
                            )}>
                                <CheckCircle className="w-3.5 h-3.5" /> Doğru mu? Yanlış mı?
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setClassVoteMode(prev => !prev)}
                                className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer",
                                    classVoteMode
                                        ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                                        : (isGame3D || isDarkTheme)
                                            ? "bg-white/10 text-slate-200 border-white/20 hover:bg-white/20"
                                            : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                                )}
                            >
                                {classVoteMode ? "🗳️ Sınıf Oyu Modu Açık" : "⚡ Anlık Kontrol"}
                            </button>
                            {isRevealed ? (
                                <button
                                    type="button"
                                    onClick={() => { setPendingChoice(null); setLocalRetry(true); }}
                                    className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" /> Tekrar Sor
                                </button>
                            ) : classVoteMode && (
                                <button
                                    type="button"
                                    onClick={() => { setLocalRetry(false); onAnswer(pendingChoice ?? correctOption); }}
                                    className="px-3.5 py-1 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-white flex items-center gap-1.5 shadow cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" /> {pendingChoice ? "Seçimi Kontrol Et & Aç" : "Cevabı Aç"}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {!isTeacher && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-wider mb-2.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Doğru mu? Yanlış mı?
                    </div>
                )}
                <h3 className={cn(
                    "font-black leading-relaxed tracking-tight",
                    isTeacher ? ((isGame3D || isDarkTheme) ? "text-white" : "text-slate-900") : "text-white",
                    isSketchnote && "font-['Caveat',cursive]",
                    getTfQuestionFont()
                )}>{step.statement}</h3>
            </div>

            <div className="flex gap-3 sm:gap-6 justify-center flex-wrap">
                {["Doğru", "Yanlış"].map((option) => {
                    const isSelected = selectedDisplayOption === option;
                    const isCorrect = option === correctOption;
                    const isTrue = option === "Doğru";
                    const isVoted = !isRevealed && pendingChoice === option;
                    return (
                        <motion.div
                            key={option}
                            whileHover={!isRevealed ? { scale: 1.04, y: -2 } : {}}
                            whileTap={!isRevealed ? { scale: 0.95 } : {}}
                            className={cn(isRevealed && isSelected && !isCorrect && "animate-shake")}
                        >
                            <Button
                                className={cn(
                                    "font-black transition-all duration-300 active:border-b-0 active:translate-y-1 shadow-2xl cursor-pointer",
                                    isSketchnote && "font-['Patrick_Hand',cursive] text-2xl md:text-3xl",
                                    getTfButtonSize(),
                                    isVoted && "ring-4 ring-amber-400 scale-[1.03]",
                                    !isRevealed && isTrue && (isTeacher ? (isGame3D ? "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 hover:brightness-110 border-4 border-emerald-200 border-b-[8px] md:border-b-[12px] border-b-emerald-900 text-white shadow-[0_15px_40px_rgba(16,185,129,0.55)]" : isSketchnote ? "bg-[#22c55e] hover:bg-[#16a34a] border-[3px] border-[#1e293b] text-white shadow-[5px_5px_0_#1e293b]" : "bg-emerald-500 hover:bg-emerald-600 border-2 border-emerald-400 border-b-emerald-700 text-white shadow-lg shadow-emerald-500/25") : "bg-emerald-950/60 border-2 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]"),
                                    !isRevealed && !isTrue && (isTeacher ? (isGame3D ? "bg-gradient-to-b from-rose-400 via-rose-500 to-rose-600 hover:brightness-110 border-4 border-rose-200 border-b-[8px] md:border-b-[12px] border-b-rose-900 text-white shadow-[0_15px_40px_rgba(244,63,94,0.55)]" : isSketchnote ? "bg-[#ef4444] hover:bg-[#dc2626] border-[3px] border-[#1e293b] text-white shadow-[5px_5px_0_#1e293b]" : "bg-rose-500 hover:bg-rose-600 border-2 border-rose-400 border-b-rose-700 text-white shadow-lg shadow-rose-500/25") : "bg-rose-950/60 border-2 border-rose-500/50 text-rose-300 hover:bg-rose-900/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]"),
                                    isRevealed && isCorrect && (isGame3D ? "bg-emerald-500 border-4 border-emerald-300 text-white shadow-[0_0_40px_rgba(16,185,129,0.8)]" : isSketchnote ? "bg-[#22c55e] border-[3px] border-[#15803d] text-white shadow-[5px_5px_0_#15803d]" : "bg-emerald-500 border-2 border-emerald-400 text-white shadow-[0_0_35px_rgba(16,185,129,0.7)]"),
                                    isRevealed && isSelected && !isCorrect && (isGame3D ? "bg-rose-500 border-4 border-rose-300 text-white shadow-[0_0_40px_rgba(244,63,94,0.8)]" : isSketchnote ? "bg-[#ef4444] border-[3px] border-[#991b1b] text-white shadow-[5px_5px_0_#991b1b]" : "bg-rose-500 border-2 border-rose-400 text-white shadow-[0_0_30px_rgba(244,63,94,0.6)]"),
                                    isRevealed && !isSelected && !isCorrect && "opacity-25 grayscale border-slate-300"
                                )}
                                onClick={() => handleChoice(option)}
                                disabled={isRevealed}
                            >
                                <div className="flex sm:flex-col items-center gap-2 sm:gap-3">
                                    {option === "Doğru" ? <CheckCircle className={getTfIconSize()}/> : <XCircle className={getTfIconSize()}/>}
                                    <span>{option}</span>
                                </div>
                            </Button>
                        </motion.div>
                    );
                })}
            </div>

            {isRevealed && step.explanation && (
                <div className={cn(
                    "mt-5 md:mt-6 p-4 sm:p-5 rounded-2xl border-2 text-left max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                    isSketchnote
                        ? "bg-[#fefce8] border-[#ca8a04] text-slate-900 font-['Patrick_Hand',cursive] text-lg shadow-[4px_4px_0_#ca8a04]"
                        : (isGame3D || isDarkTheme || !isTeacher)
                            ? "bg-emerald-950/60 border-emerald-400/50 text-emerald-50"
                            : "bg-emerald-50 border-emerald-300 text-emerald-950"
                )}>
                    <p className="text-xs font-black uppercase tracking-wider opacity-75 mb-1">💡 Açıklama</p>
                    <p className="text-sm sm:text-base md:text-lg font-bold leading-relaxed">{step.explanation}</p>
                </div>
            )}
        </div>
    );
}

function FitbStepView({
    step,
    onAnswer,
    answer,
    isTeacher,
    isFullscreen,
    fontSizeScale,
    presentationTheme,
}: {
    step: FitbStep;
    onAnswer: (answer: any) => void;
    answer: any;
    isTeacher: boolean;
    isFullscreen: boolean;
    fontSizeScale: string;
    presentationTheme?: string;
}) {
    const isGame3D = presentationTheme === 'game-3d';
    const isSketchnote = presentationTheme === 'sketchnote';
    const isDarkTheme = presentationTheme === 'cosmic-dark' || presentationTheme === 'vibrant-studio';

    const [classVoteMode, setClassVoteMode] = React.useState<boolean>(isTeacher);
    const [pendingChoice, setPendingChoice] = React.useState<string | null>(null);
    const [localRetry, setLocalRetry] = React.useState<boolean>(false);

    React.useEffect(() => {
        setPendingChoice(null);
        setLocalRetry(false);
    }, [step]);

    const isRevealed = Boolean(answer) && !localRetry;
    const selectedDisplayOption = isRevealed ? answer?.answer : pendingChoice;

    const sketchnoteFitbOptions = [
        { card: 'bg-[#f0f9ff] hover:bg-[#e0f2fe] border-[2.5px] border-[#1e293b] text-slate-900 shadow-[4px_4px_0_#1e293b]', badge: 'bg-[#38bdf8] text-[#0369a1] border-2 border-[#1e293b]' },
        { card: 'bg-[#fdf2f8] hover:bg-[#fce7f3] border-[2.5px] border-[#1e293b] text-slate-900 shadow-[4px_4px_0_#1e293b]', badge: 'bg-[#f472b6] text-[#9d174d] border-2 border-[#1e293b]' },
        { card: 'bg-[#fefce8] hover:bg-[#fef08a] border-[2.5px] border-[#1e293b] text-slate-900 shadow-[4px_4px_0_#1e293b]', badge: 'bg-[#fde047] text-[#854d0e] border-2 border-[#1e293b]' },
        { card: 'bg-[#f0fdf4] hover:bg-[#dcfce7] border-[2.5px] border-[#1e293b] text-slate-900 shadow-[4px_4px_0_#1e293b]', badge: 'bg-[#4ade80] text-[#15803d] border-2 border-[#1e293b]' },
    ];
    const optionColors = [
        'border-2 border-cyan-300 bg-cyan-50/95 hover:bg-cyan-100 text-cyan-950 shadow-md shadow-cyan-100/50',
        'border-2 border-purple-300 bg-purple-50/95 hover:bg-purple-100 text-purple-950 shadow-md shadow-purple-100/50',
        'border-2 border-amber-300 bg-amber-50/95 hover:bg-amber-100 text-amber-950 shadow-md shadow-amber-100/50',
        'border-2 border-rose-300 bg-rose-50/95 hover:bg-rose-100 text-rose-950 shadow-md shadow-rose-100/50'
    ];
    const badgeColors = [
        'bg-cyan-500 text-white',
        'bg-purple-500 text-white',
        'bg-amber-500 text-white',
        'bg-rose-500 text-white'
    ];
    const darkFitbThemes = [
        { border: 'border-cyan-400/50 hover:border-cyan-300', bg: 'bg-cyan-950/75 hover:bg-cyan-900/80 text-white', badge: 'bg-cyan-500/30 border-cyan-300/50 text-cyan-100' },
        { border: 'border-purple-400/50 hover:border-purple-300', bg: 'bg-purple-950/75 hover:bg-purple-900/80 text-white', badge: 'bg-purple-500/30 border-purple-300/50 text-purple-100' },
        { border: 'border-amber-400/50 hover:border-amber-300', bg: 'bg-amber-950/70 hover:bg-amber-900/80 text-white', badge: 'bg-amber-500/30 border-amber-300/50 text-amber-100' },
        { border: 'border-rose-400/50 hover:border-rose-300', bg: 'bg-rose-950/75 hover:bg-rose-900/80 text-white', badge: 'bg-rose-500/30 border-rose-300/50 text-rose-100' },
    ];

    const getFitbSentenceFont = () => {
        if (!isTeacher) return isFullscreen ? "text-xl md:text-2xl" : "text-base md:text-xl";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl";
        if (fontSizeScale === 'lg') return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
        if (fontSizeScale === 'xs') return "text-2xl md:text-3xl";
        return "text-3xl sm:text-4xl md:text-5xl";
    };

    const getFitbOptionFont = () => {
        if (!isTeacher) return "p-3 sm:p-4 text-sm sm:text-base";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl p-6 sm:p-8 md:p-10 min-h-[5.5rem] md:min-h-[7rem]";
        if (fontSizeScale === 'lg') return "text-xl sm:text-2xl md:text-3xl lg:text-4xl p-5 sm:p-7 md:p-8 min-h-[5rem] md:min-h-[6.5rem]";
        if (fontSizeScale === 'xs') return "text-lg md:text-xl p-4 min-h-[3.5rem]";
        return "text-xl sm:text-2xl md:text-3xl lg:text-4xl p-5 sm:p-6 md:p-7 min-h-[4.5rem] md:min-h-[5.5rem]";
    };

    const getFitbBadgeSize = () => {
        if (!isTeacher) return "h-7 w-7 text-xs sm:h-8 sm:w-8 sm:text-sm mr-3";
        if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 text-2xl sm:text-3xl md:text-4xl mr-4 md:mr-6";
        if (fontSizeScale === 'lg') return "h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-xl sm:text-2xl md:text-3xl mr-4 md:mr-5";
        if (fontSizeScale === 'xs') return "h-10 w-10 text-lg mr-3";
        return "h-12 w-12 sm:h-14 sm:w-14 text-xl sm:text-2xl mr-4";
    };

    const handleOptionClick = (option: string) => {
        if (isRevealed) return;
        if (isTeacher && classVoteMode) {
            setPendingChoice(prev => prev === option ? null : option);
            return;
        }
        setLocalRetry(false);
        onAnswer(option);
    };

    return (
        <div className={cn(
            "w-full mx-auto flex flex-col justify-center p-2 sm:p-4 text-center pb-20",
            isTeacher ? "max-w-[96%] w-full pt-4 md:pt-6 min-h-[65vh]" : "max-w-2xl py-2"
        )}>
            <div className={cn(
                "relative rounded-3xl border transition-all text-center overflow-hidden shadow-xl",
                isTeacher 
                    ? (isGame3D
                        ? "border-4 border-amber-400 bg-gradient-to-b from-slate-900/95 via-indigo-950/95 to-slate-950/98 text-white shadow-[0_12px_45px_rgba(0,0,0,0.85)] mb-6 md:mb-8 p-6 sm:p-8 md:p-10"
                        : isSketchnote
                        ? "border-[3.5px] border-[#1e293b] bg-[#fefce8] text-slate-900 shadow-[6px_6px_0_#1e293b] mb-6 md:mb-8 p-6 sm:p-8 md:p-10"
                        : isDarkTheme
                        ? "border-2 border-white/15 bg-slate-900/90 text-white backdrop-blur-2xl mb-6 md:mb-8 p-6 sm:p-8 md:p-10"
                        : "border-2 border-amber-200 bg-white/95 backdrop-blur-2xl mb-6 md:mb-8 p-6 sm:p-8 md:p-10 shadow-amber-100/60")
                    : "border-white/10 bg-slate-900/80 backdrop-blur-xl mb-3 sm:mb-5 p-4 sm:p-6 shadow-black/40"
            )}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                {isTeacher && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        {isSketchnote ? (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#fde047] border-2 border-[#1e293b] text-slate-900 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#1e293b]">
                                <span>🕌</span>
                                <span>DinDersi Atölyesi • Boşluk Doldurma</span>
                            </div>
                        ) : (
                            <div className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider",
                                (isGame3D || isDarkTheme) ? "bg-amber-500/20 border-amber-400/40 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-800"
                            )}>
                                <Sparkles className="w-3.5 h-3.5" /> Boşluk Doldurma
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setClassVoteMode(prev => !prev)}
                                className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer",
                                    classVoteMode
                                        ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                                        : (isGame3D || isDarkTheme)
                                            ? "bg-white/10 text-slate-200 border-white/20 hover:bg-white/20"
                                            : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                                )}
                            >
                                {classVoteMode ? "🗳️ Sınıf Oyu Modu Açık" : "⚡ Anlık Kontrol"}
                            </button>
                            {isRevealed ? (
                                <button
                                    type="button"
                                    onClick={() => { setPendingChoice(null); setLocalRetry(true); }}
                                    className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" /> Tekrar Sor
                                </button>
                            ) : classVoteMode && (
                                <button
                                    type="button"
                                    onClick={() => { setLocalRetry(false); onAnswer(pendingChoice ?? step.correctAnswer); }}
                                    className="px-3.5 py-1 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-white flex items-center gap-1.5 shadow cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" /> {pendingChoice ? "Seçimi Kontrol Et & Aç" : "Cevabı Aç"}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {!isTeacher && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2.5">
                        <Sparkles className="w-3.5 h-3.5" /> Boşluk Doldurma
                    </div>
                )}
                <h3 className={cn(
                    "font-black leading-relaxed tracking-wide",
                    isTeacher ? ((isGame3D || isDarkTheme) ? "text-white" : "text-slate-900") : "text-white",
                    isSketchnote && "font-['Caveat',cursive]",
                    getFitbSentenceFont()
                )}>
                    {isRevealed
                        ? step.sentenceWithBlank?.replace('___', ` [ ${step.correctAnswer} ] `)
                        : selectedDisplayOption
                            ? step.sentenceWithBlank?.replace('___', ` [ ${selectedDisplayOption} ] `)
                            : step.sentenceWithBlank?.replace('___', '________')}
                </h3>
            </div>
            <div className={cn("grid gap-2.5 sm:gap-4 md:gap-6", isTeacher ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
                {(step.options || []).map((option, index) => {
                    const isCorrect = option === step.correctAnswer;
                    const isSelected = selectedDisplayOption === option;
                    const isVoted = !isRevealed && pendingChoice === option;
                    const skTheme = sketchnoteFitbOptions[index % sketchnoteFitbOptions.length];
                    const dTheme = darkFitbThemes[index % darkFitbThemes.length];
                    const colorClass = isSketchnote
                        ? skTheme.card
                        : (isGame3D || isDarkTheme)
                            ? `${dTheme.bg} ${dTheme.border}`
                            : optionColors[index % optionColors.length];
                    const badgeClass = isSketchnote
                        ? skTheme.badge
                        : (isGame3D || isDarkTheme)
                            ? dTheme.badge
                            : badgeColors[index % badgeColors.length];
                    
                    return (
                        <motion.div
                            key={index}
                            whileHover={!isRevealed ? { scale: 1.01, y: -1 } : {}}
                            whileTap={!isRevealed ? { scale: 0.985 } : {}}
                            className={cn("w-full h-full", isRevealed && isSelected && !isCorrect && "animate-shake")}
                        >
                            <Button
                                variant="default"
                                className={cn(
                                    "w-full h-auto justify-start text-left whitespace-normal rounded-2xl md:rounded-3xl border-2 transition-all duration-300 backdrop-blur-md shadow-md font-bold cursor-pointer",
                                    getFitbOptionFont(),
                                    !isRevealed && (isTeacher ? colorClass : `${dTheme.bg} ${dTheme.border} text-slate-100 hover:shadow-lg`),
                                    isVoted && "ring-4 ring-amber-400 scale-[1.01]",
                                    isRevealed && isCorrect ? (isSketchnote ? "bg-[#4ade80] border-[2.5px] border-[#15803d] text-emerald-950 shadow-[4px_4px_0_#15803d]" : "bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-500/30") : "",
                                    isRevealed && isSelected && !isCorrect ? (isSketchnote ? "bg-[#f87171] border-[2.5px] border-[#991b1b] text-rose-950 shadow-[4px_4px_0_#991b1b]" : "bg-rose-500 border-rose-400 text-white shadow-xl shadow-rose-500/30") : "",
                                    isRevealed && !isSelected && !isCorrect ? ((isTeacher && !isDarkTheme && !isGame3D) ? "bg-slate-100 border-slate-200 text-slate-400 opacity-45 shadow-none" : "bg-white/5 border-white/10 text-slate-400 opacity-35") : ""
                                )}
                                onClick={() => handleOptionClick(option)}
                                disabled={isRevealed}
                            >
                                <span className={cn(
                                    "flex shrink-0 items-center justify-center rounded-xl md:rounded-2xl font-black border shadow-sm",
                                    getFitbBadgeSize(),
                                    !isRevealed ? (isTeacher ? badgeClass : dTheme.badge) : "bg-white/20 text-white border-white/40"
                                )}>
                                    {String.fromCharCode(65 + index)}
                                </span>
                                <span className={cn("flex-1 leading-snug", isSketchnote && "font-['Patrick_Hand',cursive]")}>{option}</span>
                                {isVoted && <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 ml-2 shrink-0">Seçim</span>}
                                {isRevealed && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-200 flex-shrink-0 ml-2" />}
                                {isRevealed && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-rose-200 flex-shrink-0 ml-2" />}
                            </Button>
                        </motion.div>
                    );
                })}
            </div>

            {isRevealed && step.explanation && (
                <div className={cn(
                    "mt-4 md:mt-6 p-4 sm:p-5 rounded-2xl border-2 text-left animate-in fade-in slide-in-from-bottom-2 duration-300",
                    isSketchnote
                        ? "bg-[#fefce8] border-[#ca8a04] text-slate-900 font-['Patrick_Hand',cursive] text-lg shadow-[4px_4px_0_#ca8a04]"
                        : (isGame3D || isDarkTheme || !isTeacher)
                            ? "bg-emerald-950/60 border-emerald-400/50 text-emerald-50"
                            : "bg-emerald-50 border-emerald-300 text-emerald-950"
                )}>
                    <p className="text-xs font-black uppercase tracking-wider opacity-75 mb-1">💡 Açıklama</p>
                    <p className="text-sm sm:text-base md:text-lg font-bold leading-relaxed">{step.explanation}</p>
                </div>
            )}
        </div>
    );
}

export function getEmbedUrl(url: string): string {
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

export function StepContent({ 
    step, answer, onAnswer, onCorrectAndNext, stepAnswers, topic, courseId, unitId, courseTitle, unitTitle, isFullscreen, 
    revealedSentencesCount, flippedCards, flippedAnagramCards, onCardFlip, onSlideScrolledToEnd, onMultiAnswer, onAllTfAnswered,
    onAnimationStart, onAnimationEnd,
    isVisualMaximized,
    onToggleVisualMaximize,
    isSingleCardMode,
    animationSpeed = 'off',
    fontSizeScale = 'normal',
    hideUI = false,
    onNextStep,
    onPrevStep,
    onJumpToStep,
    currentStepIndex,
    isTeacher: propIsTeacher,
    presentationTheme = 'sketchnote',
    presentationFont = 'sketchnote',
    isAutoReadEnabled = false
}: any) {
    const authIsTeacher = useTeacherMode();
    const isTeacher = typeof propIsTeacher === 'boolean' ? propIsTeacher : authIsTeacher;

    const renderContent = () => {
        if(step.isPublished === false && !isTeacher) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-900/60 border border-white/10 rounded-3xl text-white backdrop-blur-xl">
                    <Lock className="h-16 w-16 text-slate-400 mb-4 animate-pulse" />
                    <h2 className="text-2xl font-black mb-2">Bu İçerik Henüz Aktif Değil</h2>
                    <p className="text-slate-400 text-sm mb-6">Bu adım henüz öğretmeniniz tarafından yayınlanmadı.</p>
                    {onNextStep && (
                        <button
                            type="button"
                            onClick={onNextStep}
                            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 active:scale-95 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                        >
                            <span>Sonraki Adıma Geç</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </button>
                    )}
                </div>
            );
        }

        switch (step.type) {
            case 'topicOutline':
            case 'summaryOverview':
                return (
                    <TopicOutlinePlayer 
                        step={step as TopicOutlineStep} 
                        isFullscreen={isFullscreen} 
                        fontSizeScale={fontSizeScale}
                        currentStepIndex={currentStepIndex}
                        allSteps={topic?.steps || []}
                        onJumpToStep={onJumpToStep}
                        onNextStep={onNextStep}
                        presentationTheme={presentationTheme}
                        presentationFont={presentationFont}
                    />
                );
            case 'hookQuestion':
                return <HookQuestionPlayer step={step as HookQuestionStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} presentationTheme={presentationTheme} presentationFont={presentationFont} />;
            case 'openEndedQuestions':
                return <OpenEndedQuestionsPlayer step={step as OpenEndedQuestionsStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} presentationTheme={presentationTheme} presentationFont={presentationFont} />;
            case 'clozeParagraph':
                return <ClozeParagraphPlayer step={step as ClozeParagraphStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} presentationTheme={presentationTheme} />;
            case 'categorySort':
                return (
                    <CategorySortingPlayer 
                        step={step as CategorySortStep} 
                        isFullscreen={isFullscreen} 
                        fontSizeScale={fontSizeScale} 
                        presentationTheme={presentationTheme} 
                        courseId={courseId}
                        unitId={unitId}
                        topicId={topic?.id}
                    />
                );
            case 'notebookNote':
                return (
                    <NotebookNotePlayer
                        step={step as NotebookNoteStep}
                        isFullscreen={isFullscreen}
                        fontSizeScale={fontSizeScale}
                        presentationTheme={presentationTheme}
                        presentationFont={presentationFont}
                        courseName={courseTitle}
                        unitName={unitTitle}
                        topicTitle={topic?.title}
                    />
                );
            case 'processFlow':
                return <ProcessFlowPlayer step={step as ProcessFlowStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} presentationTheme={presentationTheme} presentationFont={presentationFont} />;
            case 'conceptMatrix':
                return <ConceptMatrixPlayer step={step as ConceptMatrixStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} presentationTheme={presentationTheme} presentationFont={presentationFont} />;
            case 'categoryTable':
                return <CategoryTablePlayer step={step as CategoryTableStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} presentationTheme={presentationTheme} presentationFont={presentationFont} />;
            case 'conceptExplanation':
                return (
                    <ConceptExplanationPlayer 
                        items={step.items || step.cards} 
                        step={step} 
                        revealedSentencesCount={revealedSentencesCount}
                        isFullscreen={isFullscreen} 
                        title={step.title} 
                        isSingleCardMode={isSingleCardMode} 
                        fontSizeScale={fontSizeScale} 
                        isTeacher={isTeacher}
                        presentationTheme={presentationTheme}
                        presentationFont={presentationFont}
                        isAutoReadEnabled={isAutoReadEnabled}
                    />
                );
            case 'content':
            case 'objectiveList':
            case 'accordion': {
                // Başlıkta kavram veya anahtar geçiyorsa (örneğin "Anahtar Kavramlar (Veri Bankası)"), items, cards veya content doluysa ConceptExplanationPlayer kullanılır
                const isConceptStep = typeof step.title === 'string' && 
                    /kavram|anahtar/i.test(step.title) && 
                    !/hedef|kazan/i.test(step.title) &&
                    step.type !== 'anagramFlashcard' && 
                    step.type !== 'conceptMap' &&
                    ((step.items && step.items.length > 0) || (step.cards && step.cards.length > 0) || (typeof step.content === 'string' && step.content.trim().length > 0));

                if (isConceptStep) {
                    return (
                        <ConceptExplanationPlayer 
                            items={step.items || step.cards} 
                            step={step} 
                            revealedSentencesCount={revealedSentencesCount}
                            isFullscreen={isFullscreen} 
                            title={step.title} 
                            isSingleCardMode={isSingleCardMode} 
                            fontSizeScale={fontSizeScale} 
                            isTeacher={isTeacher}
                            presentationTheme={presentationTheme}
                            presentationFont={presentationFont}
                            isAutoReadEnabled={isAutoReadEnabled}
                        />
                    );
                }
                return <ContentListPlayer step={step} revealedSentencesCount={revealedSentencesCount} isFullscreen={isFullscreen} onAnimationStart={onAnimationStart} onAnimationEnd={onAnimationEnd} isSingleCardMode={isSingleCardMode} animationSpeed={animationSpeed} fontSizeScale={fontSizeScale} isTeacher={isTeacher} presentationTheme={presentationTheme} presentationFont={presentationFont} isAutoReadEnabled={isAutoReadEnabled} />;
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
                 return <HtmlSlidePlayer step={step} onSlideScrolledToEnd={onSlideScrolledToEnd} presentationTheme={presentationTheme} />

            case 'pdfSlide':
                 return <PdfSlidePlayer 
                     step={step as PdfSlideStep} 
                     isFullscreen={isFullscreen} 
                     isTeacher={isTeacher} 
                     hasBottomDock={Boolean(!hideUI)} 
                     onNextStep={onNextStep}
                     onPrevStep={onPrevStep}
                 />
            
            case 'activityLink':
                const activityStep = step as ActivityLinkStep;
                const effectiveUnitId = activityStep.unitId || unitId || '';
                const rawTopicId = activityStep.topicId || topic?.id || '';
                const cleanTopicId = (rawTopicId && rawTopicId !== effectiveUnitId && rawTopicId !== 'preview-topic' && rawTopicId !== 'unit-flow')
                    ? rawTopicId 
                    : '';

                const params = new URLSearchParams({
                    courseId: activityStep.courseId || courseId || '',
                    unitId: effectiveUnitId,
                    topicId: cleanTopicId,
                    courseName: courseTitle || '',
                    unitName: unitTitle || '',
                    topicName: topic?.title || '',
                    embedded: 'true', 
                    autoStart: 'true'
                });
                const activityUrl = `${activityStep.activityType}?${params.toString()}`;
                return (
                    <div className="absolute inset-0 w-full h-full z-40 bg-slate-950 flex flex-col">
                        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-900/95 border-b border-white/10 backdrop-blur-md z-50">
                            <div className="flex-1 flex items-center justify-center gap-2 text-center">
                                <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                    <Gamepad2 className="w-4 h-4" />
                                </span>
                                <span className="font-bold text-xs sm:text-sm text-white text-center">
                                    {activityStep.activityLabel || activityStep.title}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[11px] text-slate-400 hidden sm:inline">
                                    Etkinlik bittiğinde veya devam etmek için sonraki adıma geçebilirsiniz.
                                </span>
                                <button
                                    type="button"
                                    onClick={onNextStep}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                                    title="Sonraki Adıma Geç"
                                >
                                    <span>Sonraki Adım</span>
                                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                            </div>
                        </div>
                        <iframe
                             src={activityUrl}
                             title={activityStep.activityLabel || activityStep.title}
                             className="w-full flex-1 border-0 bg-white"
                             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                             allowFullScreen
                             loading="lazy"
                        />
                    </div>
                );

            case 'flashcard':
                return <FlashcardPlayer step={step as FlashcardStep} flippedCards={flippedCards} onCardFlip={onCardFlip} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} isTeacher={isTeacher} presentationTheme={presentationTheme} presentationFont={presentationFont} />;
            case 'anagramFlashcard':
                return <AnagramFlashcardPlayer step={step as AnagramFlashcardStep} flippedCards={flippedAnagramCards} onCardFlip={onCardFlip} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} presentationTheme={presentationTheme} presentationFont={presentationFont} />;
            case 'trueFalseList':
                 return <InteractiveTrueFalseList step={step as TrueFalseListStep} isFullscreen={isFullscreen || false} answers={stepAnswers || {}} onAnswer={onMultiAnswer} onAllAnswered={onAllTfAnswered} fontSizeScale={fontSizeScale} isTeacher={isTeacher} presentationTheme={presentationTheme} presentationFont={presentationFont} />;
            case 'conceptMap':
                 return <ConceptMapPlayer step={step as ConceptMapStep} isFullscreen={isFullscreen} presentationTheme={presentationTheme} />; 
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
                         {videoStep.description && <p className={cn("mt-6 text-center text-slate-400 font-medium max-w-5xl", isTeacher ? "text-3xl text-slate-600" : "text-base sm:text-lg")}>{videoStep.description}</p>}
                    </div>
                );
            }
            case 'mcq':
                return (
                    <McqStepView
                        step={step as McqStep}
                        onAnswer={onAnswer}
                        answer={answer}
                        isTeacher={isTeacher}
                        isFullscreen={isFullscreen}
                        fontSizeScale={fontSizeScale}
                        presentationTheme={presentationTheme}
                    />
                );
            case 'tf':
                return (
                    <TfStepView
                        step={step as TfStep}
                        onAnswer={onAnswer}
                        answer={answer}
                        isTeacher={isTeacher}
                        isFullscreen={isFullscreen}
                        fontSizeScale={fontSizeScale}
                        presentationTheme={presentationTheme}
                    />
                );
            case 'fitb':
                return (
                    <FitbStepView
                        step={step as FitbStep}
                        onAnswer={onAnswer}
                        answer={answer}
                        isTeacher={isTeacher}
                        isFullscreen={isFullscreen}
                        fontSizeScale={fontSizeScale}
                        presentationTheme={presentationTheme}
                    />
                );
            case 'anagram': 
                return <AnagramGame step={step as AnagramStep} onAnswer={onAnswer} answer={answer} isAnswerRevealed={!!answer} onCorrectAndNext={isTeacher ? () => {} : onCorrectAndNext} isTeacher={isTeacher} isFullscreen={isFullscreen} />;
            
            case 'anagramGame': 
            case 'kelimeDahasi': 
                 return (
                     <AnagramGamePlayer 
                         step={step as AnagramGameStep} 
                         onAnswered={() => {
                             if (onAnswer) onAnswer("completed");
                             if (onCorrectAndNext) setTimeout(onCorrectAndNext, 600);
                         }} 
                         isTeacher={isTeacher} 
                         isFullscreen={isFullscreen} 
                     />
                 );

            case 'sentenceScramble': 
                return <SentenceScrambleGame step={step as SentenceScrambleStep} onAnswer={onAnswer} onCorrectAndNext={onCorrectAndNext} answer={answer} isAnswerRevealed={!!answer} fontSizeScale={fontSizeScale} isFullscreen={isFullscreen} presentationTheme={presentationTheme} />;
            
            case 'matching':
            case 'conceptMatching':
                return (
                    <MatchingPlayer 
                        step={step} 
                        onCompleted={() => {
                            if (onAnswer) onAnswer("completed");
                            if (onCorrectAndNext) setTimeout(onCorrectAndNext, 1200);
                        }} 
                        topicId={topic?.id}
                        isTeacher={isTeacher} 
                        isFullscreen={isFullscreen} 
                        fontSizeScale={fontSizeScale} 
                        presentationTheme={presentationTheme}
                        presentationFont={presentationFont}
                    />
                );

            case 'miniGame':
                return (
                    <MiniGamePlayer 
                        step={step as MiniGameStep} 
                        isSmartboard={isFullscreen} 
                        courseId={courseId}
                        unitId={unitId}
                        topicId={topic?.id}
                        presentationTheme={presentationTheme}
                    />
                );
            
            default: 
                // Bilinmeyen tip gelirse beyaz ekran yerine uyarı basar
                return (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-900/60 border border-white/10 rounded-3xl text-white">
                        <AlertTriangle className="h-16 w-16 text-amber-400 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">İçerik Tipi Tanınamadı</h2>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 font-mono text-sm text-slate-300 shadow-sm">
                             Gelen Tip: <span className="text-rose-400 font-bold">"{step.type}"</span>
                        </div>
                    </div>
                );
        }
    }

    const isStepFullHeight = isTeacher || ['visual', 'htmlSlide', 'pdfSlide', 'iframe', 'activityLink', 'video', 'topicOutline', 'summaryOverview', 'categoryTable', 'hookQuestion', 'notebookNote', 'miniGame', 'categorySort', 'clozeParagraph', 'openEndedQuestions'].includes(step?.type || '');

    return (
        <div className={cn("relative w-full", isStepFullHeight ? "h-full" : "min-h-full flex flex-col justify-start")}>
            {renderContent()}
        </div>
    );
}
