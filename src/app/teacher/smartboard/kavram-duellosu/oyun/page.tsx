'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getConceptQuizAction, type ConceptQuizQuestion } from '@/app/oyunlar/kavram-yarismasi/actions';
import { Loader2, ArrowLeft, BrainCircuit, Repeat, Home, CheckCircle2, XCircle, Trophy, PartyPopper, Heart, Check, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { playSound, stopSound } from '@/lib/audio-service';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FullscreenToggle } from "@/components/fullscreen-toggle";

const INITIAL_PULL = 50;

function KavramDuellosuGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mainContentRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const [questions, setQuestions] = useState<ConceptQuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [gameState, setGameState] = useState<'setup' | 'playing' | 'end' | 'error'>('setup');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [pullPosition, setPullPosition] = useState(INITIAL_PULL);
    
    const [timer, setTimer] = useState(15);
    const timerRef = useRef<NodeJS.Timeout>();

    const [player1, setPlayer1] = useState<{ name: string; score: number; answered: boolean; avatar: string }>({ name: "1. Oyuncu", score: 0, answered: false, avatar: 'A' });
    const [player2, setPlayer2] = useState<{ name: string; score: number; answered: boolean; avatar: string }>({ name: "2. Oyuncu", score: 0, answered: false, avatar: 'B' });
    const [isRoundOver, setIsRoundOver] = useState(false);
    
    const backUrl = '/teacher/smartboard/kavram-duellosu';

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
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
            const p1Name = searchParams.get('p1Name') || '1. Oyuncu';
            const p2Name = searchParams.get('p2Name') || '2. Oyuncu';
            startGame(p1Name, p2Name);
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const startGame = (p1Name?: string, p2Name?: string) => {
        if (!questions || questions.length === 0) {
            setError("Oyun için soru yüklenemedi veya bulunamadı.");
            setGameState('error');
            return;
        }
        setPlayer1({ name: p1Name || "1. Oyuncu", score: 0, answered: false, avatar: p1Name?.charAt(0) || 'A' });
        setPlayer2({ name: p2Name || "2. Oyuncu", score: 0, answered: false, avatar: p2Name?.charAt(0) || 'B' });
        setCurrentQIndex(0);
        setPullPosition(INITIAL_PULL);
        setGameState('playing');
        resetTimer();
    };
    
    const resetTimer = () => {
        if(timerRef.current) clearInterval(timerRef.current);
        setTimer(15);
        timerRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleRoundEnd(true); // time up
                    return 0;
                }
                if (prev <= 6) playSound('timer');
                return prev - 1;
            });
        }, 1000);
    };

    const handleAnswer = (player: 'player1' | 'player2', answer: string) => {
        if (isRoundOver) return;

        const playerState = player === 'player1' ? player1 : player2;
        if (playerState.answered) return;

        const isCorrect = answer === questions[currentQIndex].correctAnswer;
        const scoreChange = isCorrect ? 1 : 0;
        const pullChange = isCorrect ? (player === 'player1' ? -10 : 10) : (player === 'player1' ? 5 : -5);

        if (player === 'player1') {
            setPlayer1(p => ({ ...p, score: p.score + scoreChange, answered: true }));
        } else {
            setPlayer2(p => ({ ...p, score: p.score + scoreChange, answered: true }));
        }
        
        setPullPosition(p => Math.max(0, Math.min(100, p + pullChange)));

        if (isCorrect) playSound('correct'); else playSound('incorrect');
    };
    
    const handleRoundEnd = (timedOut: boolean = false) => {
        if (isRoundOver) return;
        setIsRoundOver(true);
        if(timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');

        if (timedOut) toast({ title: "Süre Doldu!", description: "Kimse doğru cevabı veremedi." });
        
        setTimeout(() => {
            if (pullPosition <= 0 || pullPosition >= 100) {
                setGameState('end');
                playSound('win');
            } else if (currentQIndex < questions.length - 1) {
                setCurrentQIndex(prev => prev + 1);
                setPlayer1(p => ({ ...p, answered: false }));
                setPlayer2(p => ({ ...p, answered: false }));
                setIsRoundOver(false);
                resetTimer();
            } else {
                 setGameState('end');
                 playSound('win');
            }
        }, 3000);
    };

    useEffect(() => {
        if (player1.answered && player2.answered && !isRoundOver) {
            handleRoundEnd();
        }
    }, [player1.answered, player2.answered, isRoundOver, handleRoundEnd]);
    
    // FIX: router.push should be inside a useEffect
    useEffect(() => {
        if (gameState === 'setup') {
            router.push(backUrl);
        }
    }, [gameState, router, backUrl]);


    const renderWinner = () => {
        if (pullPosition <= 0) return player1.name;
        if (pullPosition >= 100) return player2.name;
        return player1.score > player2.score ? player1.name : (player2.score > player1.score ? player2.name : "Berabere");
    }

    if (isLoading || gameState === 'setup') {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>;
    }

    if (error) {
         return (
            <div className="flex h-screen items-center justify-center p-4 bg-slate-950">
                <div className="bg-slate-900 border border-red-500/30 p-8 rounded-xl max-w-md text-center">
                    <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">Hata</h3>
                    <p className="text-slate-400 mt-2 mb-6">{error}</p>
                    <Button asChild><Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button>
                </div>
            </div>
         );
    }
    
    if (gameState === 'end') {
        const winnerName = renderWinner();
        return (
             <div className="flex h-screen items-center justify-center p-4 bg-slate-950 text-white">
                <div className="text-center space-y-6 animate-in zoom-in-95">
                    <PartyPopper className="h-24 w-24 mx-auto text-amber-400" />
                    <h1 className="text-4xl font-bold">Oyun Bitti!</h1>
                    <h2 className="text-3xl font-semibold">Kazanan: <span className="text-amber-400">{winnerName}</span></h2>
                    <div className="flex gap-4">
                         <Button onClick={() => startGame(player1.name, player2.name)} size="lg"><Repeat className="mr-2 h-5 w-5"/>Tekrar Oyna</Button>
                         <Button asChild variant="outline" size="lg"><Link href={backUrl}><Home className="mr-2 h-5 w-5"/>Ana Menü</Link></Button>
                    </div>
                </div>
             </div>
        )
    }
    
    const currentQ = questions[currentQIndex];

    return (
        <div ref={mainContentRef} className="min-h-screen bg-slate-950 text-white flex flex-col p-4 md:p-6 lg:p-8 gap-4 overflow-hidden relative">
            <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-lg border border-white/10 shrink-0">
                <h1 className="text-lg font-bold">Kavram Düellosu</h1>
                <div className="flex items-center gap-4">
                    <div className={cn("px-4 py-1 rounded-md text-2xl font-bold border-2", timer <= 5 ? "border-red-500 bg-red-900/50 text-red-400 animate-pulse" : "border-slate-700 bg-slate-800")}>
                        {timer}
                    </div>
                    <FullscreenToggle elementRef={mainContentRef} />
                </div>
            </div>

            <div className="relative flex-1 flex flex-col items-center justify-center text-center">
                 <div className="text-3xl font-bold mb-8">{currentQ.definition}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 shrink-0">
                {currentQ.options.map((opt) => {
                    const isCorrect = opt === currentQ.correctAnswer;
                    
                    const p1Selected = player1.answered && isCorrect;
                    const p2Selected = player2.answered && isCorrect;

                    return (
                        <Button 
                            key={opt}
                            className={cn("h-auto py-6 text-xl", 
                                isRoundOver && isCorrect && "bg-green-600 ring-4 ring-white",
                                isRoundOver && !isCorrect && "bg-red-800 opacity-50"
                            )}
                            disabled={isRoundOver}
                        >
                            {opt}
                        </Button>
                    )
                })}
            </div>
            
            {/* Player controls */}
            <div className="fixed inset-0 flex items-end justify-between pointer-events-none p-4">
                 <PlayerControls player="player1" question={currentQ} onAnswer={handleAnswer} disabled={player1.answered || isRoundOver}/>
                 <PlayerControls player="player2" question={currentQ} onAnswer={handleAnswer} disabled={player2.answered || isRoundOver}/>
            </div>

            {/* Pull Bar */}
             <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-3/4 max-w-lg h-8 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center overflow-hidden">
                <div className="absolute inset-0 flex justify-center items-center font-bold text-slate-400 z-0">HALAT ÇEKME</div>
                <div 
                    style={{ width: `${pullPosition}%` }} 
                    className="h-full bg-gradient-to-r from-red-500 to-red-700 transition-all duration-500 ease-out z-10"
                />
                 <div 
                    style={{ width: `${100 - pullPosition}%` }} 
                    className="h-full bg-gradient-to-l from-blue-500 to-blue-700 transition-all duration-500 ease-out z-10"
                />
            </div>
        </div>
    )
}

function PlayerControls({ player, question, onAnswer, disabled }: { player: 'player1' | 'player2', question: ConceptQuizQuestion, onAnswer: (player: 'player1' | 'player2', answer: string) => void, disabled: boolean }) {
    const isPlayer1 = player === 'player1';
    const keys = isPlayer1 ? ['q', 'w'] : ['o', 'p'];
    const options = [question.options[0], question.options[1]];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (disabled) return;
            if (e.key.toLowerCase() === keys[0]) onAnswer(player, options[0]);
            if (e.key.toLowerCase() === keys[1]) onAnswer(player, options[1]);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [disabled, keys, onAnswer, options, player]);

    return (
        <div className={cn("flex gap-2 pointer-events-auto", isPlayer1 ? "flex-row" : "flex-row-reverse")}>
             <Button className="h-16 w-20 text-2xl" disabled={disabled} onClick={() => onAnswer(player, options[0])}>{keys[0].toUpperCase()}</Button>
             <Button className="h-16 w-20 text-2xl" disabled={disabled} onClick={() => onAnswer(player, options[1])}>{keys[1].toUpperCase()}</Button>
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>}>
            <KavramDuellosuGame />
        </Suspense>
    );
}

// Player controls need to be separated for key listeners to work independently
const Player1Controls = (props: any) => <PlayerControls {...props} player="player1" />
const Player2Controls = (props: any) => <PlayerControls {...props} player="player2" />
