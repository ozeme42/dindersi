'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { submitConceptQuizScoreAction, getConceptQuizAction } from '../actions';
import type { ConceptQuizQuestion } from '../actions';
import { Loader2, ArrowLeft, Timer, Zap, XCircle, Play, Swords, User, Users, Trophy } from "lucide-react";
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
    const [gameMode, setGameMode] = useState<'single' | 'team' | null>(null);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    
    // Puanlar
    const [scoreLeft, setScoreLeft] = useState(0);
    const [scoreRight, setScoreRight] = useState(0);
    
    // Kilitler
    const [leftLocked, setLeftLocked] = useState(false);
    const [rightLocked, setRightLocked] = useState(false);

    const [timeLeft, setTimeLeft] = useState(15);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    
    // Seçimler
    const [leftSelection, setLeftSelection] = useState<string | null>(null);
    const [rightSelection, setRightSelection] = useState<string | null>(null);

    const [correctCard, setCorrectCard] = useState<string | null>(null);
    const [isRoundOver, setIsRoundOver] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [questions, setQuestions] = useState<ConceptQuizQuestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const gameContext = `Kavram Yarışması (${gameMode === 'team' ? 'VS' : 'Tekli'}) - ${searchParams.get('topicName') || 'Genel'}`;

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
            setGameState('mode-select'); 
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    // --- OYUN AKIŞI ---
    const startGame = useCallback((mode: 'single' | 'team') => {
        if (questions.length === 0) {
            setError("Oyun için soru yüklenemedi veya bulunamadı.");
            setGameState('error');
            return;
        }
        setGameMode(mode);
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

    const handleTimeUp = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
        playSound('incorrect');
        setFeedbackMsg('Süre Bitti!');
        setLeftLocked(true);
        setRightLocked(true);
        setIsRoundOver(true);
    };

    useEffect(() => {
        if (isRoundOver && questions.length > 0) {
             const q = questions[currentQIndex];
             if(q) setCorrectCard(q.correctAnswer);
        }
    }, [isRoundOver, currentQIndex, questions]);


    const handleCardClick = (side: 'left' | 'right' | 'single', concept: string) => {
        if (isRoundOver || correctCard) return;
        
        if (side === 'left' && leftLocked) return;
        if (side === 'right' && rightLocked) return;
        if (side === 'single' && leftLocked) return;

        const currentQ = questions[currentQIndex];
        if (!currentQ) return;

        if (side === 'left' || side === 'single') setLeftSelection(concept);
        else setRightSelection(concept);

        if (concept === currentQ.correctAnswer) {
            if (timerRef.current) clearInterval(timerRef.current);
            stopSound('timer');
            playSound('correct');
            
            const points = Math.max(10, timeLeft * 2); 
            
            if (side === 'left' || side === 'single') {
                setScoreLeft(prev => prev + points);
                setFeedbackMsg(side === 'single' ? 'Doğru Cevap!' : 'Mavi Taraf Kazandı!');
            } else {
                setScoreRight(prev => prev + points);
                setFeedbackMsg('Turuncu Taraf Kazandı!');
            }

            setCorrectCard(concept);
            setIsRoundOver(true);
        } else {
            playSound('incorrect');
            
            if (side === 'single') {
                setLeftLocked(true);
                setFeedbackMsg('Yanlış Cevap!');
                finalizeRoundFail(currentQ.correctAnswer);
            } 
            else if (side === 'left') {
                setLeftLocked(true);
                if (rightLocked) finalizeRoundFail(currentQ.correctAnswer);
            } 
            else { 
                setRightLocked(true);
                if (leftLocked) finalizeRoundFail(currentQ.correctAnswer);
            }
        }
    };
    
    const finalizeRoundFail = (answer: string) => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
        if (!feedbackMsg) setFeedbackMsg('Kimse Bilemedi!');
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
        if (gameMode === 'team') {
            router.push('/oyunlar/kavram-yarismasi');
            return;
        }

        const totalScore = scoreLeft;
        if (!user || totalScore === 0 || scoreSaved || isSaving) {
            router.push('/oyunlar/kavram-yarismasi');
            return;
        }
        
        setIsSaving(true);
        const result = await submitConceptQuizScoreAction(user.uid, totalScore, gameContext);
        if (result.success) {
            setScoreSaved(true);
            toast({ title: 'Başarılı!', description: `${totalScore} puan profiline eklendi.` });
            router.push('/oyunlar/kavram-yarismasi');
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const restartGame = () => {
        setIsSaving(false);
        setGameState('mode-select');
    };
    
    // --- 1. MOD SEÇİM EKRANI ---
    if (gameState === 'mode-select') {
        return (
            <div className="h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-2 opacity-30 pointer-events-none">
                    <div className="bg-gradient-to-br from-emerald-100 to-transparent"></div>
                    <div className="bg-gradient-to-bl from-blue-100 to-transparent"></div>
                </div>

                <div className="relative z-10 w-full max-w-2xl text-center space-y-4 md:space-y-8 animate-in zoom-in-95 duration-500">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800">Oyun Modunu Seç</h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <button 
                            onClick={() => startGame('single')}
                            className="group relative bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-3xl p-6 md:p-8 transition-all hover:shadow-xl hover:-translate-y-1"
                        >
                            <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                                Puanlı
                            </div>
                            <div className="bg-emerald-50 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                                <User className="w-8 h-8 md:w-10 md:h-10 text-emerald-600" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">Tek Kişilik</h3>
                            <p className="text-slate-500 text-sm">Kendini test et, puanlarını profiline kaydet.</p>
                        </button>

                        <button 
                            onClick={() => startGame('team')}
                            className="group relative bg-white border-2 border-slate-200 hover:border-blue-500 rounded-3xl p-6 md:p-8 transition-all hover:shadow-xl hover:-translate-y-1"
                        >
                             <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">
                                Eğlence
                            </div>
                            <div className="bg-blue-50 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                                <Users className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">Takımlı VS</h3>
                            <p className="text-slate-500 text-sm">Arkadaşınla aynı ekranda yarış. Puan yok.</p>
                        </button>
                    </div>
                    
                    <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                    </Button>
                </div>
            </div>
        )
    }

    if (gameState === 'loading') return <div className="flex h-[100dvh] items-center justify-center bg-slate-50"><Loader2 className="h-16 w-16 animate-spin text-emerald-500"/></div>
    if (error) return <div className="flex h-[100dvh] items-center justify-center p-4 bg-slate-50 text-center"><p className="text-red-500 font-bold">{error}</p></div>

    if (gameState === 'end') {
        let endTitle = "Oyun Bitti!";
        let endDesc = "";
        
        if (gameMode === 'team') {
            if (scoreLeft > scoreRight) {
                endTitle = "Mavi Taraf Kazandı! 🏆";
                endDesc = "Tebrikler Mavi Takım! Harika bir yarıştı.";
            } else if (scoreRight > scoreLeft) {
                endTitle = "Turuncu Taraf Kazandı! 🏆";
                endDesc = "Tebrikler Turuncu Takım! Harika bir yarıştı.";
            } else {
                endTitle = "Berabere! 🤝";
                endDesc = "Dostluk kazandı.";
            }
        }

        return (
            <GameEndScreen 
                score={gameMode === 'team' ? 0 : scoreLeft} 
                title={endTitle}
                description={endDesc}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={scoreSaved}
                onRestart={restartGame}
                backUrl="/oyunlar/kavram-yarismasi"
                hideSaveButton={gameMode === 'team'}
            />
        );
    }

    const currentQ = questions[currentQIndex];
    if (!currentQ) return <div className="flex h-[100dvh] items-center justify-center">Soru yüklenemedi...</div>;

    // --- GRID RENDER FONKSİYONU ---
    const renderOptionsGrid = (side: 'left' | 'right' | 'single') => {
        const selection = (side === 'left' || side === 'single') ? leftSelection : rightSelection;
        const locked = (side === 'left' || side === 'single') ? leftLocked : rightLocked;

        const row1 = currentQ.options.slice(0, 2);
        const row2 = currentQ.options.slice(2, 4);

        const renderBtn = (option: string) => {
            let stateClass = "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50 shadow-sm";
            
            if (side === 'right') {
                stateClass = "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:bg-orange-50 shadow-sm";
            }
            if (side === 'single') {
                stateClass = "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 shadow-sm";
            }

            if (selection === option) {
                if (correctCard === option) stateClass = "bg-emerald-500 text-white border-emerald-500 shadow-lg scale-[0.98] z-10";
                else stateClass = "bg-red-500 text-white border-red-500";
            } else if (correctCard === option) {
                stateClass = "bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200";
            }

            return (
                <button
                    key={`${side}-${option}`}
                    onClick={() => handleCardClick(side, option)}
                    disabled={locked || isRoundOver}
                    className={cn(
                        "w-1/2 h-full flex items-center justify-center text-center p-2 rounded-xl md:rounded-2xl border-2 transition-all active:scale-[0.95] select-none overflow-hidden",
                        "text-sm md:text-lg lg:text-xl font-bold leading-tight break-words",
                        stateClass,
                        locked && "opacity-50 cursor-not-allowed hover:bg-white hover:border-slate-200"
                    )}
                >
                   <span className="line-clamp-4">{option}</span>
                </button>
            );
        };

        return (
            <div className="flex flex-col w-full h-full gap-2 md:gap-3 p-2 md:p-3 pb-8 md:pb-3"> {/* MOBİL İÇİN pb-8 EKLENDİ */}
                <div className="flex w-full h-1/2 gap-2 md:gap-3">
                    {row1.map(opt => renderBtn(opt))}
                </div>
                <div className="flex w-full h-1/2 gap-2 md:gap-3">
                    {row2.map(opt => renderBtn(opt))}
                </div>
            </div>
        );
    };

    // --- 2. OYUN EKRANI ---
    return (
        <div 
            ref={mainContentRef}
            // h-screen yerine h-[100dvh] kullanıldı. Bu mobil tarayıcı adres çubuğunu hesaba katar.
            className="h-[100dvh] bg-slate-50 text-slate-900 flex flex-col items-center relative overflow-hidden select-none"
        >
            {/* HEADER */}
            <div className="w-full bg-white shadow-sm border-b border-slate-200 z-30 flex flex-col shrink-0 h-[25dvh]">
                <div className="w-full max-w-7xl mx-auto px-4 py-2 flex justify-between items-center h-12">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-800" asChild>
                            <Link href="/oyunlar/kavram-yarismasi"><ArrowLeft className="w-5 h-5"/></Link>
                        </Button>
                        <span className="font-bold text-slate-700 hidden sm:inline">
                            {gameMode === 'single' ? 'Tekli Yarış' : 'VS Modu'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 px-4 py-1 rounded-full border border-slate-200">
                        <Timer className={cn("w-5 h-5", timeLeft < 5 ? "text-red-500 animate-pulse" : "text-slate-500")} />
                        <span className={cn("font-mono font-bold text-xl", timeLeft < 5 ? "text-red-600" : "text-slate-700")}>
                            {timeLeft}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {gameMode === 'single' && (
                             <Button onClick={endGame} variant="ghost" className="text-red-400 hover:bg-red-50 hover:text-red-600 text-xs font-bold h-8">
                                Bitir
                            </Button>
                        )}
                        <FullscreenToggle elementRef={mainContentRef} className="text-slate-400 hover:text-slate-800 h-8 w-8" />
                    </div>
                </div>

                <div className="w-full max-w-4xl mx-auto p-4 text-center flex-grow flex flex-col justify-center items-center overflow-hidden">
                    <h2 className="text-lg md:text-2xl lg:text-3xl font-bold text-slate-800 leading-snug line-clamp-4">
                        {currentQ.definition}
                    </h2>
                     {feedbackMsg && (
                        <div className={cn(
                            "mt-2 inline-block px-4 py-1 rounded-full text-sm font-bold animate-in zoom-in",
                            (feedbackMsg.includes('Kazandı') || feedbackMsg.includes('Doğru')) ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                            {feedbackMsg}
                        </div>
                    )}
                </div>
                
                 <div className="w-full h-1.5 bg-slate-100 mt-auto">
                    <div 
                        className="h-full bg-slate-800 transition-all duration-300"
                        style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* OYUN ALANI */}
            {/* h-[75vh] yerine h-[75dvh] ve safe area için alt padding eklendi */}
            <div className="flex-grow w-full relative h-[75dvh] overflow-hidden pb-safe">
                
                {/* --- TEK KİŞİLİK MOD --- */}
                {gameMode === 'single' && (
                    <div className="w-full h-full max-w-2xl mx-auto flex flex-col p-4 pb-8 md:pb-4">
                        <div className="flex justify-center mb-2 md:mb-4">
                             <div className="bg-white px-6 py-2 rounded-full shadow-sm border border-slate-200 font-mono font-bold text-emerald-600 flex items-center gap-2 text-xl">
                                <Trophy className="w-6 h-6" />
                                {scoreLeft}
                            </div>
                        </div>
                        <div className="flex-grow h-full overflow-hidden border-2 border-slate-100 rounded-3xl bg-white/50 p-2">
                             {renderOptionsGrid('single')}
                        </div>
                    </div>
                )}

                {/* --- TAKIMLI MOD --- */}
                {gameMode === 'team' && (
                    <div className="w-full h-full grid grid-cols-2 relative pb-8 md:pb-0">
                         <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-20 -translate-x-1/2 flex items-center justify-center pointer-events-none">
                            <div className="bg-white border border-slate-300 rounded-full p-1.5 shadow-sm">
                                <Swords className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>

                        {/* SOL */}
                        <div className={cn(
                            "relative w-full h-full flex flex-col border-r border-slate-200 transition-colors",
                            leftLocked ? "bg-slate-100 grayscale opacity-70 cursor-not-allowed" : "bg-blue-50/40"
                        )}>
                            <div className="flex justify-between items-center p-3 bg-white/60 border-b border-blue-100 h-12 shrink-0">
                                <span className="text-blue-600 font-bold text-xs md:text-sm tracking-widest">MAVİ</span>
                                <div className="bg-white px-3 py-0.5 rounded-lg shadow-sm border border-blue-100 font-mono font-bold text-blue-600">
                                    {scoreLeft}
                                </div>
                            </div>
                            <div className="flex-grow h-full overflow-hidden">
                                {renderOptionsGrid('left')}
                            </div>
                        </div>

                        {/* SAĞ */}
                        <div className={cn(
                            "relative w-full h-full flex flex-col transition-colors",
                            rightLocked ? "bg-slate-100 grayscale opacity-70 cursor-not-allowed" : "bg-orange-50/40"
                        )}>
                            <div className="flex justify-between items-center p-3 bg-white/60 border-b border-orange-100 h-12 shrink-0">
                                <div className="bg-white px-3 py-0.5 rounded-lg shadow-sm border border-orange-100 font-mono font-bold text-orange-600">
                                    {scoreRight}
                                </div>
                                <span className="text-orange-600 font-bold text-xs md:text-sm tracking-widest">TURUNCU</span>
                            </div>
                            <div className="flex-grow h-full overflow-hidden">
                                {renderOptionsGrid('right')}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SONRAKİ BUTONU */}
            {isRoundOver && (
                <div className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 w-full flex justify-center px-4">
                    <Button
                        onClick={nextQuestion}
                        className="w-full max-w-xs md:w-auto px-12 py-8 text-xl font-bold rounded-full bg-slate-900 text-white shadow-2xl hover:bg-slate-800 hover:scale-105 transition-all border-4 border-white/20"
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