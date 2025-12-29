
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { submitConceptQuizScoreAction, getConceptQuizAction } from '../actions';
import type { ConceptQuizQuestion } from '../actions';
import { Loader2, ArrowLeft, Timer, Zap, XCircle, Play, Swords } from "lucide-react";
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
    
    // --- OYUN DURUMLARI ---
    const [scoreLeft, setScoreLeft] = useState(0);
    const [scoreRight, setScoreRight] = useState(0);
    const [leftLocked, setLeftLocked] = useState(false);
    const [rightLocked, setRightLocked] = useState(false);

    const [timeLeft, setTimeLeft] = useState(15);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    
    const [leftSelection, setLeftSelection] = useState<string | null>(null);
    const [rightSelection, setRightSelection] = useState<string | null>(null);

    const [correctCard, setCorrectCard] = useState<string | null>(null);
    const [isRoundOver, setIsRoundOver] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [questions, setQuestions] = useState<ConceptQuizQuestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const gameContext = `Kavram Yarışması (VS) - ${searchParams.get('topicName') || 'Genel'}`;

    // --- VERİ ÇEKME ---
    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };

        if (!params.topicId) {
             setError("Geçerli bir konu ID'si gerekli.");
             setGameState('error');
             return;
        }

        const { questions: fetchedQuestions, error: fetchError } = await getConceptQuizAction(params);
        
        if (fetchError || !fetchedQuestions || fetchedQuestions.length === 0) {
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

    // --- OYUN AKIŞI ---
    const startGame = useCallback(() => {
        if (questions.length === 0) {
            setError("Oyun için soru yüklenemedi veya bulunamadı.");
            setGameState('error');
            return;
        }
        setCurrentQIndex(0);
        setScoreLeft(0);
        setScoreRight(0);
        setScoreSaved(false);
        setGameState('playing');
        resetTurn();
    }, [questions]);

    const resetTurn = useCallback(() => {
        setTimeLeft(15);
        setFeedbackMsg('');
        setLeftLocked(false);
        setRightLocked(false);
        setLeftSelection(null);
        setRightSelection(null);
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

        setLeftLocked(true);
        setRightLocked(true);
        setIsRoundOver(true);
    }, [currentQIndex, questions, isRoundOver]);


    const handleCardClick = (side: 'left' | 'right', concept: string) => {
        if (isRoundOver || correctCard) return;
        if (side === 'left' && leftLocked) return;
        if (side === 'right' && rightLocked) return;

        const currentQ = questions[currentQIndex];
        if (!currentQ) return;

        if (side === 'left') setLeftSelection(concept);
        else setRightSelection(concept);

        if (concept === currentQ.correctAnswer) {
            if (timerRef.current) clearInterval(timerRef.current);
            stopSound('timer');
            playSound('correct');
            
            const points = Math.max(10, timeLeft * 2); 
            if (side === 'left') setScoreLeft(prev => prev + points);
            else setScoreRight(prev => prev + points);

            setCorrectCard(concept);
            setFeedbackMsg(side === 'left' ? 'Mavi Taraf Kazandı!' : 'Turuncu Taraf Kazandı!');
            setIsRoundOver(true);
        } else {
            playSound('incorrect');
            if (side === 'left') {
                setLeftLocked(true);
                if (rightLocked) finalizeRoundFail(currentQ.correctAnswer);
            } else {
                setRightLocked(true);
                if (leftLocked) finalizeRoundFail(currentQ.correctAnswer);
            }
        }
    };
    
    const finalizeRoundFail = (answer: string) => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
        setFeedbackMsg('Kimse Bilemedi!');
        setCorrectCard(answer);
        setIsRoundOver(true);
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
        const totalScore = scoreLeft + scoreRight;
        if (!user || totalScore === 0 || scoreSaved || isSaving) {
            router.push('/oyunlar/kavram-yarismasi');
            return;
        }
        setIsSaving(true);
        const result = await submitConceptQuizScoreAction(user.uid, totalScore, gameContext);
        if (result.success) {
            setScoreSaved(true);
            toast({ title: "Başarılı!", description: `Toplam ${totalScore} puan profiline eklendi.` });
            router.push('/oyunlar/kavram-yarismasi');
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const restartGame = () => {
        setIsSaving(false);
        startGame();
    };
    
    // --- RENDER ---

    if (gameState === 'loading') {
        return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-16 w-16 animate-spin text-emerald-500"/></div>
    }

    if (error) {
        return (
             <div className="flex h-screen items-center justify-center p-4 bg-slate-50">
                <div className="bg-white border border-red-200 text-slate-800 px-8 py-6 rounded-3xl relative max-w-md text-center shadow-xl">
                    <Zap className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Hata Oluştu</h3>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-white h-12 rounded-xl">
                        <Link href="/oyunlar/kavram-yarismasi"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        )
    }

    if (gameState === 'start') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-2 opacity-30 pointer-events-none">
                    <div className="bg-gradient-to-br from-blue-100 to-transparent"></div>
                    <div className="bg-gradient-to-bl from-orange-100 to-transparent"></div>
                </div>
                
                <div className="relative z-10 w-full max-w-lg text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                        <Swords className="w-32 h-32 text-slate-800 mx-auto drop-shadow-md" />
                    </div>
                    
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 mb-2">KAVRAM DÜELLOSU</h1>
                        <p className="text-slate-500 text-lg">Arkadaşınla veya kendinle yarış!</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl text-left space-y-4">
                        <div className="flex items-center gap-4 text-slate-600">
                            <Swords className="w-6 h-6 text-indigo-500 shrink-0" />
                            <span>Ekran ikiye bölünür: <strong>Mavi</strong> ve <strong>Turuncu</strong> taraf.</span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-600">
                            <Zap className="w-6 h-6 text-yellow-500 shrink-0" />
                            <span>Doğru cevabı <strong>ilk bilen</strong> puanı kapar!</span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-600">
                            <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                            <span>Yanlış yapan o tur için <strong>kilitlenir</strong>.</span>
                        </div>
                    </div>

                    <Button 
                        onClick={startGame}
                        className="w-full h-16 text-xl font-bold rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
                    >
                        DÜELLOYU BAŞLAT <Play className="ml-3 h-6 w-6 fill-current" />
                    </Button>
                </div>
            </div>
        );
    }
    
     if (gameState === 'end') {
        return (
            <GameEndScreen 
                score={scoreLeft + scoreRight}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={scoreSaved}
                onRestart={restartGame}
                backUrl="/oyunlar/kavram-yarismasi"
            />
        );
    }

    const currentQ = questions[currentQIndex];

    return (
        <div 
            ref={mainContentRef}
            className="h-screen bg-slate-50 text-slate-900 flex flex-col items-center relative overflow-hidden select-none"
        >
            {/* --- ÜST KISIM --- */}
            <div className="w-full bg-white shadow-sm border-b border-slate-200 z-30 flex flex-col shrink-0">
                <div className="w-full max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-800" asChild>
                            <Link href="/oyunlar/kavram-yarismasi"><ArrowLeft className="w-5 h-5"/></Link>
                        </Button>
                        <span className="font-bold text-slate-700 hidden sm:inline">Kavram Düellosu</span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 px-4 py-1 rounded-full border border-slate-200">
                        <Timer className={cn("w-5 h-5", timeLeft < 5 ? "text-red-500 animate-pulse" : "text-slate-500")} />
                        <span className={cn("font-mono font-bold text-xl", timeLeft < 5 ? "text-red-600" : "text-slate-700")}>
                            {timeLeft}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                         <Button onClick={endGame} variant="ghost" className="text-red-400 hover:bg-red-50 hover:text-red-600 text-xs font-bold h-8">
                            Bitir
                        </Button>
                        <FullscreenToggle elementRef={mainContentRef} className="text-slate-400 hover:text-slate-800 h-8 w-8" />
                    </div>
                </div>

                <div className="w-full max-w-4xl mx-auto p-2 pb-4 text-center">
                    <h2 className="text-xl md:text-3xl font-bold text-slate-800 leading-tight">
                        {currentQ.definition}
                    </h2>
                     {feedbackMsg && (
                        <div className={cn(
                            "mt-1 inline-block px-4 py-0.5 rounded-full text-sm font-bold animate-in zoom-in",
                            feedbackMsg.includes('Kazandı') ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                            {feedbackMsg}
                        </div>
                    )}
                </div>
                
                 <div className="w-full h-1 bg-slate-100">
                    <div 
                        className="h-full bg-slate-800 transition-all duration-300"
                        style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* --- OYUN ALANI (Split Screen) --- */}
            <div className="flex-grow w-full relative grid grid-cols-2 h-full overflow-hidden">
                
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-20 -translate-x-1/2 flex items-center justify-center pointer-events-none">
                    <div className="bg-white border border-slate-300 rounded-full p-1.5 shadow-sm">
                        <Swords className="w-4 h-4 text-slate-400" />
                    </div>
                </div>

                {/* SOL TARAF */}
                <div className={cn(
                    "relative w-full h-full flex flex-col p-2 md:p-4 transition-colors",
                    leftLocked ? "bg-slate-100 grayscale opacity-70 cursor-not-allowed" : "bg-blue-50/40"
                )}>
                    <div className="flex justify-between items-center mb-2 px-1 shrink-0">
                        <span className="text-blue-600 font-bold text-xs md:text-sm tracking-widest">MAVİ</span>
                        <div className="bg-white px-3 py-1 rounded-lg shadow-sm border border-blue-100 font-mono font-bold text-blue-600">
                            {scoreLeft}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-2 md:gap-4 w-full justify-center">
                        {currentQ.options.map((option) => {
                             let stateClass = "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50 shadow-sm";
                             if (leftSelection === option) {
                                 if (correctCard === option) stateClass = "bg-emerald-500 text-white border-emerald-500 shadow-lg scale-[1.02] z-10";
                                 else stateClass = "bg-red-500 text-white border-red-500";
                             } else if (correctCard === option) {
                                 stateClass = "bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200";
                             }

                             return (
                                <button
                                    key={`left-${option}`}
                                    onClick={() => handleCardClick('left', option)}
                                    disabled={leftLocked || isRoundOver}
                                    className={cn(
                                        "w-full h-full flex items-center justify-center text-center p-2 text-lg md:text-2xl font-bold rounded-2xl border-2 transition-all active:scale-95 leading-tight break-words",
                                        stateClass,
                                        leftLocked && "opacity-50 cursor-not-allowed hover:bg-white hover:border-slate-200"
                                    )}
                                >
                                   <span className="line-clamp-4">{option}</span>
                                </button>
                             )
                        })}
                    </div>
                </div>

                {/* SAĞ TARAF */}
                <div className={cn(
                    "relative w-full h-full flex flex-col p-2 md:p-4 transition-colors",
                    rightLocked ? "bg-slate-100 grayscale opacity-70 cursor-not-allowed" : "bg-orange-50/40"
                )}>
                    <div className="flex justify-between items-center mb-2 px-1 shrink-0">
                        <div className="bg-white px-3 py-1 rounded-lg shadow-sm border border-orange-100 font-mono font-bold text-orange-600">
                            {scoreRight}
                        </div>
                        <span className="text-orange-600 font-bold text-xs md:text-sm tracking-widest">TURUNCU</span>
                    </div>

                    <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-2 md:gap-4 w-full justify-center">
                         {currentQ.options.map((option) => {
                             let stateClass = "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:bg-orange-50 shadow-sm";
                             if (rightSelection === option) {
                                 if (correctCard === option) stateClass = "bg-emerald-500 text-white border-emerald-500 shadow-lg scale-[1.02] z-10";
                                 else stateClass = "bg-red-500 text-white border-red-500";
                             } else if (correctCard === option) {
                                 stateClass = "bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200";
                             }

                             return (
                                <button
                                    key={`right-${option}`}
                                    onClick={() => handleCardClick('right', option)}
                                    disabled={rightLocked || isRoundOver}
                                    className={cn(
                                        "w-full h-full flex items-center justify-center text-center p-2 text-lg md:text-2xl font-bold rounded-2xl border-2 transition-all active:scale-95 leading-tight break-words",
                                        stateClass,
                                        rightLocked && "opacity-50 cursor-not-allowed hover:bg-white hover:border-slate-200"
                                    )}
                                >
                                   <span className="line-clamp-4">{option}</span>
                                </button>
                             )
                        })}
                    </div>
                </div>
            </div>

            {/* FOOTER BUTON */}
            {isRoundOver && (
                <div className="absolute bottom-12 md:bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
                    <Button
                        onClick={nextQuestion}
                        className="px-12 py-8 text-xl font-bold rounded-full bg-slate-900 text-white shadow-2xl hover:bg-slate-800 hover:scale-110 transition-all border-4 border-white/20"
                    >
                        {currentQIndex + 1 < questions.length ? 'Sıradaki Soru' : 'Sonuçları Gör'} 
                        <ArrowLeft className="ml-3 h-6 w-6 rotate-180" />
                    </Button>
                </div>
            )}
        </div>
    );
}


export default function Page() {
     return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-16 w-16 animate-spin text-slate-400"/></div>}>
            <KavramYarismaGame />
        </Suspense>
    )
}
