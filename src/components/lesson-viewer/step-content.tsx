'use client';

import React from 'react';
import { 
    Lock, ArrowRight, Gamepad2, HelpCircle, 
    CheckCircle2, XCircle, CheckCircle, Sparkles, AlertTriangle 
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
    ConceptMatrixStep, CategoryTableStep, TopicOutlineStep
} from '@/lib/types';

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
    presentationTheme = 'clean-light',
    presentationFont = 'playfair',
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
                    />
                );
            case 'hookQuestion':
                return <HookQuestionPlayer step={step as HookQuestionStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} />;
            case 'notebookNote':
                return <NotebookNotePlayer step={step as NotebookNoteStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} />;
            case 'processFlow':
                return <ProcessFlowPlayer step={step as ProcessFlowStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} />;
            case 'conceptMatrix':
                return <ConceptMatrixPlayer step={step as ConceptMatrixStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} />;
            case 'categoryTable':
                return <CategoryTablePlayer step={step as CategoryTableStep} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} />;
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
                 return <HtmlSlidePlayer step={step} onSlideScrolledToEnd={onSlideScrolledToEnd} />

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
                const params = new URLSearchParams({
                    courseId: activityStep.courseId || courseId || '',
                    unitId: activityStep.unitId || unitId || '',
                    topicId: activityStep.topicId || topic?.id || '',
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
                return <FlashcardPlayer step={step as FlashcardStep} flippedCards={flippedCards} onCardFlip={onCardFlip} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} isTeacher={isTeacher} />;
            case 'anagramFlashcard':
                return <AnagramFlashcardPlayer step={step as AnagramFlashcardStep} flippedCards={flippedAnagramCards} onCardFlip={onCardFlip} isFullscreen={isFullscreen} fontSizeScale={fontSizeScale} />;
            case 'trueFalseList':
                 return <InteractiveTrueFalseList step={step as TrueFalseListStep} isFullscreen={isFullscreen || false} answers={stepAnswers || {}} onAnswer={onMultiAnswer} onAllAnswered={onAllTfAnswered} fontSizeScale={fontSizeScale} isTeacher={isTeacher} />;
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
                         {videoStep.description && <p className={cn("mt-6 text-center text-slate-400 font-medium max-w-5xl", isTeacher ? "text-3xl text-slate-600" : "text-base sm:text-lg")}>{videoStep.description}</p>}
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
                const studentOptionThemes = [
                    { border: 'border-sky-500/30 hover:border-sky-400/60', bg: 'bg-sky-950/40 hover:bg-sky-900/50', badge: 'bg-sky-500/20 border-sky-400/40 text-sky-300' },
                    { border: 'border-violet-500/30 hover:border-violet-400/60', bg: 'bg-violet-950/40 hover:bg-violet-900/50', badge: 'bg-violet-500/20 border-violet-400/40 text-violet-300' },
                    { border: 'border-amber-500/30 hover:border-amber-400/60', bg: 'bg-amber-950/40 hover:bg-amber-900/50', badge: 'bg-amber-500/20 border-amber-400/40 text-amber-300' },
                    { border: 'border-rose-500/30 hover:border-rose-400/60', bg: 'bg-rose-950/40 hover:bg-rose-900/50', badge: 'bg-rose-500/20 border-rose-400/40 text-rose-300' },
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

                return (
                    <div className={cn(
                        "w-full mx-auto flex flex-col justify-center p-2 sm:p-4",
                        isTeacher ? "max-w-[96%] w-full pt-4 md:pt-8 min-h-[65vh]" : "max-w-2xl py-2"
                    )}>
                        {/* Soru Kutusu */}
                        <div className={cn(
                            "relative rounded-3xl border transition-all text-center overflow-hidden shadow-xl",
                            isTeacher 
                                ? "border-2 border-indigo-200 bg-white/95 backdrop-blur-2xl mb-4 md:mb-6 p-6 sm:p-8 md:p-12 shadow-indigo-100/60" 
                                : "border-white/10 bg-slate-900/60 backdrop-blur-xl mb-3 sm:mb-5 p-4 sm:p-6 shadow-black/40"
                        )}>
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                            {!isTeacher && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-wider mb-2.5">
                                    <HelpCircle className="w-3.5 h-3.5" /> Çoktan Seçmeli Soru
                                </div>
                            )}
                            <h3 className={cn(
                                "font-black leading-relaxed tracking-tight",
                                isTeacher ? "text-slate-900" : "text-white",
                                getMcqQuestionFont()
                            )}>{mcqStep.question}</h3>
                        </div>
                        {/* Şıklar */}
                        <div className={cn("grid gap-2.5 sm:gap-4 md:gap-6", isTeacher ? "grid-cols-2 md:grid-cols-2" : "grid-cols-1")}>
                            {mcqStep.options.map((option, index) => {
                                const isCorrect = option === mcqStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                const colorClass = optionColors[index % optionColors.length];
                                const badgeClass = badgeColors[index % badgeColors.length];
                                const stTheme = studentOptionThemes[index % studentOptionThemes.length];

                                return (
                                    <motion.div
                                        key={index}
                                        whileHover={!answer ? { scale: 1.01, y: -1 } : {}}
                                        whileTap={!answer ? { scale: 0.985 } : {}}
                                        className={cn("w-full h-full", answer && isSelected && !isCorrect && "animate-shake")}
                                    >
                                        <Button
                                            variant="default"
                                            className={cn(
                                                "w-full h-auto justify-start text-left whitespace-normal rounded-2xl md:rounded-3xl border-2 transition-all duration-300 backdrop-blur-md shadow-md font-bold",
                                                getMcqOptionFont(),
                                                !answer ? (isTeacher ? colorClass : `${stTheme.bg} ${stTheme.border} text-slate-100 hover:shadow-lg cursor-pointer`) : "",
                                                answer && isCorrect ? "bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-500/30" : "",
                                                answer && isSelected && !isCorrect ? "bg-rose-500 border-rose-400 text-white shadow-xl shadow-rose-500/30" : "",
                                                answer && !isSelected && !isCorrect ? (isTeacher ? "bg-slate-100 border-slate-200 text-slate-400 opacity-40" : "bg-white/5 border-white/5 text-slate-500 opacity-30") : ""
                                            )}
                                            onClick={() => onAnswer(option)}
                                            disabled={!!answer}
                                        >
                                            <span className={cn(
                                                "flex shrink-0 items-center justify-center rounded-xl md:rounded-2xl font-black border shadow-sm",
                                                getMcqBadgeSize(),
                                                !answer ? (isTeacher ? badgeClass : stTheme.badge) : "bg-white/20 text-white border-white/40"
                                            )}>
                                                {String.fromCharCode(65 + index)}
                                            </span>
                                            <span className="flex-1 leading-snug">{option}</span>
                                            {answer && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0 ml-2" />}
                                            {answer && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-300 flex-shrink-0 ml-2" />}
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
                        return "h-44 sm:h-52 md:h-64 w-64 sm:w-80 md:w-[28rem] text-4xl sm:text-5xl md:text-6xl border-b-[8px] md:border-b-[12px] rounded-3xl";
                    }
                    if (fontSizeScale === 'lg') {
                        return "h-40 sm:h-48 md:h-56 w-56 sm:w-72 md:w-96 text-3xl sm:text-4xl md:text-5xl border-b-[6px] md:border-b-[10px] rounded-3xl";
                    }
                    if (fontSizeScale === 'xs') {
                        return "h-28 w-44 text-2xl border-b-[4px] rounded-2xl";
                    }
                    return "h-36 sm:h-44 md:h-52 w-52 sm:w-64 md:w-80 text-3xl sm:text-4xl md:text-4xl border-b-[6px] md:border-b-[8px] rounded-3xl";
                };

                const getTfIconSize = () => {
                    if (!isTeacher) return "h-5 w-5 sm:h-6 sm:w-6";
                    if (fontSizeScale === 'xl' || fontSizeScale === 'huge') return "h-16 w-16 md:h-24 md:w-24";
                    if (fontSizeScale === 'lg') return "h-14 w-14 md:h-20 md:w-20";
                    if (fontSizeScale === 'xs') return "h-10 w-10";
                    return "h-12 w-12 md:h-16 md:w-16";
                };

                return (
                    <div className={cn(
                        "w-full mx-auto flex flex-col justify-center p-2 sm:p-4 text-center",
                        isTeacher ? "max-w-[96%] w-full pt-4 md:pt-8 min-h-[65vh]" : "max-w-2xl py-2"
                    )}>
                        {/* İfade Kutusu */}
                        <div className={cn(
                            "relative rounded-3xl border transition-all text-center overflow-hidden shadow-xl",
                            isTeacher 
                                ? "border-2 border-purple-200 bg-white/95 backdrop-blur-2xl mb-6 md:mb-10 p-6 sm:p-8 md:p-14 shadow-purple-100/60" 
                                : "border-white/10 bg-slate-900/60 backdrop-blur-xl mb-4 sm:mb-6 p-5 sm:p-7 shadow-black/40"
                        )}>
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
                            {!isTeacher && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-wider mb-2.5">
                                    <CheckCircle className="w-3.5 h-3.5" /> Doğru mu? Yanlış mı?
                                </div>
                            )}
                            <h3 className={cn(
                                "font-black leading-relaxed tracking-tight",
                                isTeacher ? "text-slate-900" : "text-white",
                                getTfQuestionFont()
                            )}>{tfStep.statement}</h3>
                        </div>
                        <div className="flex gap-3 sm:gap-6 justify-center flex-wrap">
                            {["Doğru", "Yanlış"].map((option) => {
                                const isSelected = answer?.answer === option;
                                const isCorrect = option === correctOption;
                                const isTrue = option === "Doğru";
                                return (
                                    <motion.div
                                        key={option}
                                        whileHover={!answer ? { scale: 1.04, y: -2 } : {}}
                                        whileTap={!answer ? { scale: 0.95 } : {}}
                                        className={cn(answer && isSelected && !isCorrect && "animate-shake")}
                                    >
                                        <Button
                                            className={cn(
                                                "font-black transition-all duration-300 active:border-b-0 active:translate-y-1 shadow-2xl",
                                                getTfButtonSize(),
                                                !answer && isTrue && (isTeacher ? "bg-emerald-500 hover:bg-emerald-600 border-2 border-emerald-400 border-b-emerald-700 text-white shadow-lg shadow-emerald-500/25" : "bg-emerald-950/60 border-2 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]"),
                                                !answer && !isTrue && (isTeacher ? "bg-rose-500 hover:bg-rose-600 border-2 border-rose-400 border-b-rose-700 text-white shadow-lg shadow-rose-500/25" : "bg-rose-950/60 border-2 border-rose-500/50 text-rose-300 hover:bg-rose-900/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]"),
                                                answer && isCorrect && "bg-emerald-500 border-2 border-emerald-400 text-white shadow-[0_0_35px_rgba(16,185,129,0.7)]",
                                                answer && isSelected && !isCorrect && "bg-rose-500 border-2 border-rose-400 text-white shadow-[0_0_30px_rgba(244,63,94,0.6)]",
                                                answer && !isSelected && !isCorrect && "opacity-20 grayscale border-slate-200"
                                            )}
                                            onClick={() => onAnswer(option)}
                                            disabled={!!answer}
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
                const studentFitbThemes = [
                    { border: 'border-cyan-500/30 hover:border-cyan-400/60', bg: 'bg-cyan-950/40 hover:bg-cyan-900/50', badge: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300' },
                    { border: 'border-purple-500/30 hover:border-purple-400/60', bg: 'bg-purple-950/40 hover:bg-purple-900/50', badge: 'bg-purple-500/20 border-purple-400/40 text-purple-300' },
                    { border: 'border-amber-500/30 hover:border-amber-400/60', bg: 'bg-amber-950/40 hover:bg-amber-900/50', badge: 'bg-amber-500/20 border-amber-400/40 text-amber-300' },
                    { border: 'border-rose-500/30 hover:border-rose-400/60', bg: 'bg-rose-950/40 hover:bg-rose-900/50', badge: 'bg-rose-500/20 border-rose-400/40 text-rose-300' },
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

                return (
                    <div className={cn(
                        "w-full mx-auto flex flex-col justify-center p-2 sm:p-4 text-center",
                        isTeacher ? "max-w-[96%] w-full pt-4 md:pt-8 min-h-[65vh]" : "max-w-2xl py-2"
                    )}>
                        <div className={cn(
                            "relative rounded-3xl border transition-all text-center overflow-hidden shadow-xl",
                            isTeacher 
                                ? "border-2 border-amber-200 bg-white/95 backdrop-blur-2xl mb-6 md:mb-8 p-6 sm:p-8 md:p-12 shadow-amber-100/60" 
                                : "border-white/10 bg-slate-900/60 backdrop-blur-xl mb-3 sm:mb-5 p-4 sm:p-6 shadow-black/40"
                        )}>
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                            {!isTeacher && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Boşluk Doldurma
                                </div>
                            )}
                            <h3 className={cn(
                                "font-black leading-relaxed tracking-wide",
                                isTeacher ? "text-slate-900" : "text-white",
                                getFitbSentenceFont()
                            )}>
                                {fitbStep.sentenceWithBlank?.replace('___', '________')}
                            </h3>
                        </div>
                        <div className={cn("grid gap-2.5 sm:gap-4 md:gap-6", isTeacher ? "grid-cols-2 md:grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
                            {(fitbStep.options || []).map((option, index) => {
                                const isCorrect = option === fitbStep.correctAnswer;
                                const isSelected = answer?.answer === option;
                                const colorClass = optionColors[index % optionColors.length];
                                const badgeClass = badgeColors[index % badgeColors.length];
                                const stTheme = studentFitbThemes[index % studentFitbThemes.length];
                                
                                return (
                                    <motion.div
                                        key={index}
                                        whileHover={!answer ? { scale: 1.01, y: -1 } : {}}
                                        whileTap={!answer ? { scale: 0.985 } : {}}
                                        className={cn("w-full h-full", answer && isSelected && !isCorrect && "animate-shake")}
                                    >
                                        <Button
                                            variant="default"
                                            className={cn(
                                                "w-full h-auto justify-start text-left whitespace-normal rounded-2xl md:rounded-3xl border-2 transition-all duration-300 backdrop-blur-md shadow-md font-bold",
                                                getFitbOptionFont(),
                                                !answer ? (isTeacher ? colorClass : `${stTheme.bg} ${stTheme.border} text-slate-100 hover:shadow-lg cursor-pointer`) : "",
                                                answer && isCorrect ? "bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-500/30" : "",
                                                answer && isSelected && !isCorrect ? "bg-rose-500 border-rose-400 text-white shadow-xl shadow-rose-500/30" : "",
                                                answer && !isSelected && !isCorrect ? (isTeacher ? "bg-slate-100 border-slate-200 text-slate-400 opacity-40" : "bg-white/5 border-white/5 text-slate-500 opacity-30") : ""
                                            )}
                                            onClick={() => onAnswer(option)}
                                            disabled={!!answer}
                                        >
                                            <span className={cn(
                                                "flex shrink-0 items-center justify-center rounded-xl md:rounded-2xl font-black border shadow-sm",
                                                getFitbBadgeSize(),
                                                !answer ? (isTeacher ? badgeClass : stTheme.badge) : "bg-white/20 text-white border-white/40"
                                            )}>
                                                {String.fromCharCode(65 + index)}
                                            </span>
                                            <span className="flex-1 leading-snug">{option}</span>
                                            {answer && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0 ml-2" />}
                                            {answer && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-300 flex-shrink-0 ml-2" />}
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
                return <SentenceScrambleGame step={step as SentenceScrambleStep} onAnswer={onAnswer} onCorrectAndNext={onCorrectAndNext} answer={answer} isAnswerRevealed={!!answer} fontSizeScale={fontSizeScale} isFullscreen={isFullscreen} />;
            
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

    const isStepFullHeight = isTeacher || ['visual', 'htmlSlide', 'pdfSlide', 'iframe', 'activityLink', 'video', 'topicOutline', 'summaryOverview', 'categoryTable', 'hookQuestion'].includes(step?.type || '');

    return (
        <div className={cn("relative w-full", isStepFullHeight ? "h-full" : "min-h-full flex flex-col justify-start")}>
            {renderContent()}
        </div>
    );
}
