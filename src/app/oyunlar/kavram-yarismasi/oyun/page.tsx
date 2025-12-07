
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { submitConceptQuizScoreAction, getConceptQuizAction } from '../actions';
import type { ConceptQuizQuestion } from '../actions';
import { Loader2, ArrowLeft, Home, PartyPopper, Repeat, Trophy, Timer, Heart, Zap, CheckCircle2, XCircle, Play, XOctagon } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { playSound, stopSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

function KavramYarismaGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const mainContentRef = useRef<HTMLDivElement>(null);

    const [gameState, setGameState] = useState('loading');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [wrongGuesses, setWrongGuesses] = useState(0);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [disabledCards, setDisabledCards] = useState<string[]>([]);
    const [correctCard, setCorrectCard] = useState<string | null>(null);
    const [isRoundOver, setIsRoundOver] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [questions, setQuestions] = useState<ConceptQuizQuestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const gameContext = `Kavram Yarışması - ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = '/oyunlar/kavram-yarismasi';

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const { questions: fetchedQuestions, error: fetchError } = await getConceptQuizAction(params);
        
        if (fetchError || !fetchedQuestions) {
            setError(fetchError || "Sorular yüklenemedi.");
            setGameState('error');
        } else {
            setQuestions(fetchedQuestions);
            setGameState('start');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const startGame = useCallback(() => {
        if (questions.length === 0) {
            setError("Oyun için soru yüklenemedi veya bulunamadı.");
            setGameState('error');
            return;
        }
        setCurrentQIndex(0);
        setScore(0);
        setScoreSaved(false);
        setGameState('playing');
        resetTurn();
    }, [questions]);
    
     const resetTurn = useCallback(() => {
        setTimeLeft(15);
        setWrongGuesses(0);
        setFeedbackMsg('');
        setDisabledCards([]);
        setCorrectCard(null);
        setIsRoundOver(false);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                if (prev <= 6) playSound('timer');
                return prev - 1;
            });
        }, 1000);
    }, []);

    const handleTimeUp = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
        if (isRoundOver) return;
        
        playSound('incorrect');
        setFeedbackMsg('Süre Bitti!');
        const currentQ = questions[currentQIndex];
        if (currentQ) {
            setCorrectCard(currentQ.correctAnswer);
        }
        setDisabledCards(questions[currentQIndex]?.options.map(c => c) || []);
        setIsRoundOver(true);
    }, [currentQIndex, questions, isRoundOver]);


    const handleCardClick = (concept: string) => {
        if (disabledCards.includes(concept) || correctCard || isRoundOver) return;

        const currentQ = questions[currentQIndex];
        if (!currentQ) return;

        if (concept === currentQ.correctAnswer) {
            if (timerRef.current) clearInterval(timerRef.current);
            stopSound('timer');
            playSound('correct');
            setScore(prev => prev + Math.max(5, 20 - (wrongGuesses * 10)));
            setCorrectCard(concept);
            setFeedbackMsg('Harika! Doğru Cevap.');
            setIsRoundOver(true);
        } else {
            playSound('incorrect');
            const newWrongGuesses = wrongGuesses + 1;
            setWrongGuesses(newWrongGuesses);
            setDisabledCards(prev => [...prev, concept]);
            
            if (newWrongGuesses >= 2) {
                if (timerRef.current) clearInterval(timerRef.current);
                stopSound('timer');
                setFeedbackMsg('Hakkın Kalmadı!');
                setCorrectCard(currentQ.correctAnswer);
                setIsRoundOver(true);
            } else {
                setFeedbackMsg('Yanlış! Son hakkın.');
            }
        }
    };
    
    const nextQuestion = () => {
        if (currentQIndex + 1 < questions.length) {
            setCurrentQIndex(prev => prev + 1);
            resetTurn();
        } else {
            endGame();
        }
    };
    
    const endGame = () => {
        if(timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
        playSound('win');
        setGameState('end');
    };

    const handleSaveAndExit = async () => {
        if (!user || score === 0 || scoreSaved || isSaving) {
            router.push('/oyunlar/kavram-yarismasi');
            return;
        }
        setIsSaving(true);
        const result = await submitConceptQuizScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setScoreSaved(true);
            toast({ title: 'Başarılı!', description: `${score} puan kazandın ve profiline eklendi.` });
            router.push('/oyunlar/kavram-yarismasi');
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const restartGame = () => {
        setIsSaving(false);
        startGame();
    };
    
    // --- RENDER ---

    if (gameState === 'loading') {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-emerald-500"/></div>
    }

    if (error) {
        return (
             <div className="flex h-screen items-center justify-center p-4 bg-slate-950">
                <div className="bg-slate-900 border border-red-500/30 text-white px-8 py-6 rounded-3xl relative max-w-md text-center shadow-2xl">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Hata Oluştu</h3>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-white h-12 rounded-xl">
                        <Link href="/oyunlar/kavram-yarismasi"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        )
    }

    if (gameState === 'start') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 pb-24 md:p-8 relative overflow-y-auto">
                {/* Arka Plan */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-900/20 rounded-full blur-[120px] animate-pulse delay-1000" />
                </div>
                
                <div className="relative z-10 w-full max-w-md text-center space-y-8 animate-in zoom-in-95 duration-500 my-auto">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
                        <Zap className="w-32 h-32 text-emerald-400 mx-auto drop-shadow-[0_0_25px_rgba(52,211,153,0.6)] animate-bounce" />
                    </div>
                    
                    <div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-2">KAVRAM AVCISI</h1>
                        <p className="text-slate-400 text-lg">Bilgini test etmeye hazır mısın?</p>
                    </div>

                    <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl text-left space-y-4">
                        <div className="flex items-center gap-4 text-slate-300">
                            <Timer className="w-6 h-6 text-emerald-500 shrink-0" />
                            <span>Her soru için <strong>15 saniye</strong> süren var.</span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-300">
                            <Heart className="w-6 h-6 text-red-500 shrink-0" />
                            <span>Her soruda <strong>2 can</strong> hakkın var.</span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-300">
                            <Trophy className="w-6 h-6 text-yellow-500 shrink-0" />
                            <span>Doğru cevaplarla puanları topla!</span>
                        </div>
                    </div>

                    <Button 
                        onClick={startGame}
                        className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                    >
                        OYUNA BAŞLA <Play className="ml-3 h-6 w-6 fill-current" />
                    </Button>
                </div>
            </div>
        );
    }
    
     if (gameState === 'end') {
        return (
            <GameEndScreen 
                score={score}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={scoreSaved}
                onRestart={restartGame}
                backUrl="/oyunlar/kavram-yarismasi"
            />
        );
    }

    const currentQ = questions[currentQIndex];
    const progressPercentage = ((currentQIndex + 1) / questions.length) * 100;

    return (
        <div 
            ref={mainContentRef}
            className="min-h-screen bg-slate-950 text-white flex flex-col items-center relative overflow-hidden select-none"
        >
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* --- HUD --- */}
            <div className="w-full relative z-20 bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-xl hidden md:block">
                                <Zap className="h-6 w-6 text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Kavram Avcısı</h1>
                                <p className="text-slate-400 text-xs font-mono">SORU {currentQIndex + 1}/{questions.length}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            {/* Kalan Haklar */}
                            <div className="flex gap-1">
                                {[0, 1].map(i => (
                                    <Heart key={i} className={cn("w-5 h-5 md:w-6 md:h-6 transition-all", i < (2 - wrongGuesses) ? "text-red-500 fill-red-500" : "text-slate-700")} />
                                ))}
                            </div>

                            {/* Puan */}
                            <div className="flex items-center gap-2 bg-slate-950/50 border border-yellow-500/20 px-3 py-1.5 rounded-xl">
                                <Trophy className="h-4 w-4 text-yellow-400" />
                                <span className="font-mono font-bold text-white">{score}</span>
                            </div>
                            
                            {/* Bitir Butonu */}
                            <Button 
                                onClick={endGame}
                                variant="ghost"
                                className="h-9 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg font-bold text-xs md:text-sm transition-colors border border-red-500/10 hidden sm:flex"
                            >
                                <XOctagon className="h-4 w-4 mr-1.5" />
                                Bitir
                            </Button>

                            <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 border-white/10 text-slate-300 hover:text-white h-9 w-9 rounded-xl" />
                        </div>
                    </div>

                    {/* Süre Çubuğu */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
                        <div 
                            className={cn(
                                "h-full transition-all duration-1000 ease-linear",
                                timeLeft > 5 ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                            )}
                            style={{ width: `${(timeLeft / 15) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* --- OYUN ALANI --- */}
            <main className="relative flex-grow flex flex-col items-center justify-center p-4 w-full max-w-4xl z-10 pb-24 md:pb-8">
                
                {/* Soru Kartı */}
                <div className="w-full bg-slate-900/60 backdrop-blur-md border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl mb-6 relative group animate-in slide-in-from-bottom-4 duration-500">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-3xl" />
                    <h3 className="text-xl md:text-3xl font-bold text-white leading-relaxed text-center">
                        {currentQ.definition}
                    </h3>
                </div>

                {/* Geri Bildirim Mesajı */}
                {feedbackMsg && (
                    <div className={cn(
                        "my-2 px-6 py-2 rounded-full font-bold text-sm uppercase tracking-widest shadow-lg animate-in zoom-in duration-300 z-50",
                        feedbackMsg.includes('Doğru') ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                    )}>
                        {feedbackMsg}
                    </div>
                )}

                {/* Seçenekler */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    {currentQ.options.map((option) => {
                        let btnStyle = "h-auto py-6 text-lg md:text-xl font-bold rounded-2xl border-2 transition-all duration-200 relative overflow-hidden group ";
                        
                        if (correctCard === option) {
                            btnStyle += "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02] z-10";
                        } else if (disabledCards.includes(option)) {
                            btnStyle += "bg-slate-800 border-red-500/50 text-red-400 opacity-50 cursor-not-allowed";
                        } else {
                            btnStyle += "bg-slate-900/50 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-emerald-500/50 hover:text-white hover:shadow-lg";
                        }

                        return (
                            <button
                                key={option}
                                onClick={() => handleCardClick(option)}
                                className={btnStyle}
                                disabled={disabledCards.includes(option) || correctCard !== null || isRoundOver}
                            >
                                <span className="relative z-10">{option}</span>
                                {correctCard === option && (
                                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-emerald-200 animate-in zoom-in duration-300" />
                                )}
                                {disabledCards.includes(option) && correctCard !== option && (
                                    <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-red-400 animate-in zoom-in duration-300" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Sonraki Soru Butonu */}
                {isRoundOver && (
                    <div className="mt-8 w-full flex justify-center animate-in slide-in-from-bottom-4 duration-300">
                        <Button
                            onClick={nextQuestion}
                            className="px-10 py-6 text-xl font-bold rounded-2xl bg-white text-slate-900 hover:bg-emerald-50 shadow-lg transition-all hover:scale-105"
                        >
                            {currentQIndex + 1 < questions.length ? 'Sıradaki Soru' : 'Sonuçları Gör'} 
                            <ArrowLeft className="ml-3 h-6 w-6 rotate-180" />
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function Page() {
     return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-emerald-500"/></div>}>
            <KavramYarismaGame />
        </Suspense>
    )
}
