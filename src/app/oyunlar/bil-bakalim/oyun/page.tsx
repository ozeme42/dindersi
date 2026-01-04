'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '@/app/oyunlar/bil-bakalim/actions';
import type { Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Ghost, CheckCircle2, Flame, Trophy, XOctagon, BrainCircuit, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

// --- RENK PALETİ (Alt kenarlıklar için) ---
const BORDER_COLORS = [
    'border-b-rose-500',
    'border-b-amber-500',
    'border-b-emerald-500',
    'border-b-sky-500',
    'border-b-indigo-500',
    'border-b-violet-500',
    'border-b-fuchsia-500',
    'border-b-orange-500',
    'border-b-cyan-500',
    'border-b-lime-500'
];

// --- ORTAK ARKA PLAN ---
const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse-slow mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[120px] animate-pulse-slow delay-700 mix-blend-multiply" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[100px] animate-pulse-slow delay-1000 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"></div>
    </div>
);

function BilBakalimGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const [queue, setQueue] = useState<Partial<Question>[]>([]); 
    const [allTerms, setAllTerms] = useState<string[]>([]);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'won' | 'error' | 'finished'>('loading');
    const [score, setScore] = useState(0);
    const [correctStreak, setCorrectStreak] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    
    const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [shakeScreen, setShakeScreen] = useState(false);
    const [activeTermId, setActiveTermId] = useState<string | null>(null); 

    const gameContext = `Bil Bakalım - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    
    const backUrl = useMemo(() => {
        const { courseId, unitId, topicId, courseName, unitName, topicName } = Object.fromEntries(searchParams.entries());
        if (courseId && unitId && topicId) {
            return `/konu/${courseId}/${unitId}/${topicId}/oyunlar?courseName=${encodeURIComponent(courseName || '')}&unitName=${encodeURIComponent(unitName || '')}&topicName=${encodeURIComponent(topicName || '')}`;
        }
        return '/oyunlar/bil-bakalim';
    }, [searchParams]);
    
    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            topicId: searchParams.get('topicId') || undefined,
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
        };
        const result = await getBilBakalimAction(params);
        
        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu konu için uygun soru bulunamadı.");
            setGameState('error');
        } else {
            const shuffled = [...result.questions].sort(() => Math.random() - 0.5);
            const terms = [...new Set(result.questions.map(q => q.correctAnswer))].sort((a, b) => (a||"").localeCompare(b||"", 'tr')) as string[];
            setQueue(shuffled);
            setAllTerms(terms);
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);

    const currentQuestion = queue.length > 0 ? queue[0] : null;

    const handleAnswer = (selectedTerm: string) => {
        if (feedbackState !== 'idle' || !currentQuestion) return;
        setActiveTermId(selectedTerm);

        if (selectedTerm === currentQuestion.correctAnswer) {
            const newStreak = correctStreak + 1;
            const pointsToAdd = 10 + (newStreak * 10);
            setCorrectStreak(newStreak);
            setScore(prev => prev + pointsToAdd);
            setFeedbackState('correct');
            playSound('correct');

            setTimeout(() => {
                const updatedQueue = queue.slice(1);
                setQueue(updatedQueue);
                setFeedbackState('idle');
                setActiveTermId(null);
                if (updatedQueue.length === 0) setGameState('won');
            }, 800);
        } else {
            setCorrectStreak(0);
            setScore(prev => Math.max(0, prev - 10));
            setFeedbackState('wrong');
            playSound('incorrect');
            setShakeScreen(true);

            setTimeout(() => {
                setShakeScreen(false);
                setQueue(prev => {
                    if (!prev[0]) return prev;
                    const [wrongQ, ...rest] = prev;
                    return [...rest, wrongQ];
                });
                setFeedbackState('idle');
                setActiveTermId(null);
            }, 800);
        }
    };

    const handleSaveAndExit = async () => {
        if (!user || score <= 0 || isSaving || isScoreSaved) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitBilBakalimScoreAction(user.uid, score, gameContext);
        if(result.success) {
            setIsScoreSaved(true);
            toast({ title: "Başarılı", description: "Puanın kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
            setIsSaving(false);
        }
    };
    
    const handleRestart = () => {
        setScore(0);
        setCorrectStreak(0);
        setIsScoreSaved(false);
        setGameState('loading');
        fetchGameData();
    };

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (gameState === 'error') {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-50">
                 <div className="text-center space-y-4 max-w-md bg-white p-8 rounded-[2rem] border border-red-100 shadow-xl">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Ghost className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Oyun Başlatılamadı</h3>
                    <p className="text-slate-500 mb-6 font-medium">{error}</p>
                    <Button asChild className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    if (gameState === 'won' || gameState === 'finished') {
        return (
            <GameEndScreen 
                score={score}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={handleRestart}
                backUrl={backUrl}
            />
        );
    }

    return (
        <div 
            ref={mainContentRef}
            className={cn(
                "h-screen bg-slate-50 text-slate-900 relative overflow-hidden flex flex-col transition-all",
                shakeScreen && "animate-shake"
            )}
        >
            <MagnificentLightBackground />
            
            {/* HUD */}
            <div className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-sm flex-shrink-0">
                <div className="container mx-auto px-4 py-2 md:py-3">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                             <div className="h-9 w-9 md:h-11 md:w-11 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 shadow-sm">
                                <BrainCircuit className="h-5 w-5 md:h-6 md:w-6" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-xs md:text-base font-black text-slate-800 truncate tracking-tight uppercase">Bil Bakalım</h1>
                                <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-500 font-bold">
                                    <span>SORU {allTerms.length - queue.length + 1}/{allTerms.length}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {correctStreak > 1 && (
                                <div className="hidden sm:flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl text-rose-600 font-bold text-sm">
                                    <Flame className="w-4 h-4 fill-current"/>
                                    <span>x{correctStreak}</span>
                                </div>
                            )}
                            <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
                                <Trophy className="h-4 w-4 text-amber-500" />
                                <span className="font-black text-slate-800 text-sm md:text-base">{score}</span>
                            </div>
                            <Button onClick={() => setGameState('finished')} variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-50 rounded-xl border border-red-100 bg-white shadow-sm">
                                <XOctagon className="h-4 w-4" />
                            </Button>
                            <FullscreenToggle elementRef={mainContentRef} className="bg-white border border-slate-200 text-slate-600 h-9 w-9 rounded-xl shadow-sm" />
                        </div>
                    </div>
                </div>
                <div className="w-full h-1 bg-slate-100">
                     <div 
                        className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${((allTerms.length - queue.length + 1) / allTerms.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* OYUN ALANI - Kaydırma özelliği eklendi */}
            <main className="flex-grow flex flex-col items-center justify-start p-4 lg:p-6 relative z-10 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div className="max-w-7xl w-full mx-auto flex flex-col items-center">
                    
                    {/* SORU KARTI */}
                    <div className="w-full max-w-5xl mb-6 lg:mb-8 mt-2">
                         <div className={cn(
                            "relative bg-white/95 backdrop-blur-xl border-2 rounded-[1.5rem] lg:rounded-[3rem] p-5 lg:p-10 text-center shadow-xl transition-all duration-300 transform ring-1 ring-slate-900/5",
                            feedbackState === 'correct' ? "border-emerald-200 bg-emerald-50/50" :
                            feedbackState === 'wrong' ? "border-red-200 bg-red-50/50" : "border-white/60"
                          )}>
                              <div className="relative z-10">
                                <div className="inline-flex items-center justify-center gap-2 mb-3 lg:mb-5 bg-amber-50 px-4 py-1 rounded-full border border-amber-100 text-amber-600 font-bold text-[10px] lg:text-xs uppercase shadow-sm tracking-[0.2em]">
                                    <Lightbulb className="w-3 h-3 lg:w-4 lg:h-4" /> İPUCU
                                </div>
                                <h2 className={cn(
                                    "text-xl md:text-3xl lg:text-4xl font-black leading-snug lg:leading-tight",
                                    feedbackState === 'correct' ? "text-emerald-600" : feedbackState === 'wrong' ? "text-red-600" : "text-slate-800"
                                )}>
                                    {currentQuestion?.text}
                                </h2>
                              </div>
                         </div>
                    </div>

                    {/* CEVAP GRİDİ - Farklı alt renkler ve büyük fontlar */}
                    <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6 pb-20">
                        {allTerms.map((term, index) => {
                            const isActive = activeTermId === term;
                            const isWrong = isActive && feedbackState === 'wrong';
                            const isCorrect = isActive && feedbackState === 'correct';
                            
                            // Her seçenek için sabit ama farklı bir renk ata
                            const borderStyle = BORDER_COLORS[index % BORDER_COLORS.length];
                            
                            return (
                                <button
                                    key={term}
                                    onClick={() => handleAnswer(term)}
                                    disabled={feedbackState !== 'idle'}
                                    className={cn(
                                        "relative h-24 lg:h-32 rounded-2xl lg:rounded-[2rem] font-black text-base sm:text-xl lg:text-2xl transition-all duration-200 select-none touch-manipulation active:scale-95 shadow-lg flex items-center justify-center p-4 text-center leading-tight border-b-8",
                                        !isActive && `bg-white hover:bg-slate-50 text-slate-800 border-slate-100 ${borderStyle} active:border-b-0 active:translate-y-2`,
                                        isCorrect && "bg-emerald-100 border-emerald-300 text-emerald-700 z-20 scale-105 shadow-emerald-200/50 shadow-2xl",
                                        isWrong && "bg-red-100 border-red-300 text-red-700 z-20 animate-shake shadow-red-200/50 shadow-2xl",
                                        feedbackState !== 'idle' && !isActive && "opacity-30 grayscale scale-95"
                                    )}
                                >
                                    <span className="line-clamp-3 break-words">{term}</span>
                                    {isCorrect && (
                                        <div className="absolute -top-3 -right-3 bg-emerald-500 text-white rounded-full p-1 shadow-lg animate-bounce">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <BilBakalimGame />
        </Suspense>
    );
}