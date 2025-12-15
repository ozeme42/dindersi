
'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Swords, Repeat, Award, PartyPopper, Check, Home, MonitorPlay, Zap, Shield, Crown, Timer, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { getKavramDuellosuQuestions, type KavramDuellosuQuestion } from '../actions';
import { cn } from "@/lib/utils";
import { playSound, stopSound } from "@/lib/audio-service";
import Confetti from 'react-dom-confetti';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

type GameQuestion = KavramDuellosuQuestion;

function KavramDuellosuGame() {
    const searchParams = useSearchParams();
    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [state, setState] = useState({
        p1Score: 0,
        p2Score: 0,
        currentQIndex: 0,
        showNextButton: false,
        correctAnswer: null as string | null,
        winner: null as 'p1' | 'p2' | null,
        gameState: 'playing' as 'playing' | 'finished',
    });

    const [p1Lock, setP1Lock] = useState(false);
    const [p2Lock, setP2Lock] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    // ZAMANLAYICI İÇİN EKLENEN STATE VE REF
    const [timeLeft, setTimeLeft] = useState(15);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getKavramDuellosuQuestions(params);
        if (result.error || result.questions.length === 0) {
            setError(result.error || "Uygun soru bulunamadı.");
        } else {
            const tripleQuestions = [...result.questions, ...result.questions, ...result.questions];
            setQuestions(tripleQuestions.sort(() => Math.random() - 0.5));
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);
    
    const currentQ = questions[state.currentQIndex];

    const loadQuestion = useCallback(() => {
        if (!currentQ) {
            if (state.currentQIndex >= questions.length && questions.length > 0) {
                 setState(s => ({...s, gameState: 'finished'}));
                 playSound('win');
            }
            return;
        }

        setState(s => ({ 
            ...s, 
            showNextButton: false,
            correctAnswer: null,
            winner: null,
        }));
        setP1Lock(false);
        setP2Lock(false);
        setTimeLeft(15); // Zamanlayıcıyı sıfırla

    }, [currentQ, state.currentQIndex, questions.length]);
    
    useEffect(() => {
        if (!isLoading && questions.length > 0) {
            loadQuestion();
        }
    }, [isLoading, questions, state.currentQIndex, loadQuestion]);

    const handleTimeUp = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
        if (state.showNextButton) return;
        
        playSound('timeUp');
        setP1Lock(true);
        setP2Lock(true);
        setState(s => ({ ...s, showNextButton: true, correctAnswer: currentQ?.a || null }));
    }, [currentQ, state.showNextButton]);
    
     // Zamanlayıcı Mantığı
    useEffect(() => {
        if (state.gameState === 'playing' && !state.showNextButton) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleTimeUp();
                        return 0;
                    }
                    if (prev <= 6 && prev > 1) {
                        playSound('timer');
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                stopSound('timer');
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            stopSound('timer');
        };
    }, [state.gameState, state.showNextButton, handleTimeUp]);

    const handleAnswer = (player: 'p1' | 'p2', answer: string) => {
        if (!currentQ || state.showNextButton) return;
        
        const isP1 = player === 'p1';
        if ((isP1 && p1Lock) || (!isP1 && p2Lock)) return;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            stopSound('timer');
        }

        if (answer !== currentQ.a) {
            playSound('incorrect');
            const zoneId = `${player}-zone`;
            document.getElementById(zoneId)?.classList.add('shake');
            
            if (isP1) setP1Lock(true);
            else setP2Lock(true);
            
            setTimeout(() => {
                document.getElementById(zoneId)?.classList.remove('shake');
            }, 500);

            if ((isP1 && p2Lock) || (!isP1 && p1Lock)) {
                 setTimeout(() => setState(s => ({...s, showNextButton: true, correctAnswer: currentQ?.a || null})), 500);
            }
            return;
        }

        playSound('correct');
        const winner = player;
        setState(prevState => ({
            ...prevState,
            p1Score: isP1 ? prevState.p1Score + 1 : prevState.p1Score,
            p2Score: !isP1 ? prevState.p2Score + 1 : prevState.p2Score,
            showNextButton: true,
            correctAnswer: currentQ.a,
            winner,
        }));
        
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
    };

    const nextQuestion = () => {
        setState(s => ({...s, currentQIndex: s.currentQIndex + 1}));
    }

    const resetGame = () => {
        setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
        setState({
            p1Score: 0,
            p2Score: 0,
            currentQIndex: 0,
            showNextButton: false,
            correctAnswer: null,
            winner: null,
            gameState: 'playing'
        });
        setP1Lock(false);
        setP2Lock(false);
    }
    
    if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>;
    if (error) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-red-400 text-2xl p-8 text-center">{error}</div>;

    if (state.gameState === 'finished') {
        const p1s = state.p1Score;
        const p2s = state.p2Score;
        let winnerText = "BERABERE!";
        if (p1s > p2s) winnerText = "MAVİ TAKIM KAZANDI!";
        if (p2s > p1s) winnerText = "KIRMIZI TAKIM KAZANDI!";
        
        return (
             <div className="flex h-screen items-center justify-center p-4 bg-slate-950">
                 <Card className="w-full max-w-lg text-center bg-slate-900 border-white/10 overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-red-600 to-blue-600 p-1"></div>
                    <CardHeader className="pb-2">
                        <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-2 drop-shadow-md"/>
                        <CardTitle className="text-2xl text-white">Yarışma Bitti!</CardTitle>
                        <CardDescription className="text-slate-400 text-lg">{winnerText}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                         <div className="flex justify-around">
                            <div className="text-center p-4 rounded-lg bg-blue-900/50 border border-blue-700 w-40">
                                <p className="text-sm font-bold text-blue-300">MAVİ TAKIM</p>
                                <p className="text-4xl font-black text-white">{p1s}</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-red-900/50 border border-red-700 w-40">
                                <p className="text-sm font-bold text-red-300">KIRMIZI TAKIM</p>
                                <p className="text-4xl font-black text-white">{p2s}</p>
                            </div>
                         </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4 p-6">
                        <Button onClick={resetGame} size="lg" className="bg-indigo-600 hover:bg-indigo-500 font-bold"><Repeat className="mr-2 h-5 w-5"/> Tekrar Oyna</Button>
                        <Button asChild variant="outline" size="lg" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent">
                            <Link href="/teacher/smartboard"><Home className="mr-2 h-5 w-5"/> Ana Menü</Link>
                        </Button>
                    </CardFooter>
                 </Card>
            </div>
        );
    }
    
    if (!currentQ) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>;
    
    const OptionButton = ({ player, option, ...props }: { player: 'p1' | 'p2', option: string, [key: string]: any }) => {
        const isP1 = player === 'p1';
        const baseClass = isP1
            ? 'bg-blue-100 text-blue-900 hover:bg-blue-50 border-b-4 border-blue-300 active:border-b-0 active:translate-y-1'
            : 'bg-red-100 text-red-900 hover:bg-red-50 border-b-4 border-red-300 active:border-b-0 active:translate-y-1';
        
        const isCorrect = state.correctAnswer === option;
        
        let dynamicClass = baseClass;
        if(state.showNextButton && isCorrect) {
            dynamicClass = 'bg-green-500 text-white border-green-700 correct-blink';
        }

        return <button onClick={() => handleAnswer(player, option)} className={`w-full h-full text-2xl font-bold rounded-xl shadow-md transition-all ${dynamicClass}`} {...props}>{option}</button>;
    }
    
    return (
        <div className="h-screen w-screen bg-slate-900 text-white flex">
             <style jsx global>{`
                body { touch-action: manipulation; user-select: none; overflow: hidden; font-family: 'Segoe UI', sans-serif; }
                .player-zone { transition: background-color 0.3s; }
                .shake { animation: shake 0.5s; }
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                .correct-blink { animation: blinkGreen 0.5s 3; }
                @keyframes blinkGreen { 50% { background-color: #4ade80; color: white; } }
                .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
            
            <div id="p1-zone" className="player-zone flex-1 bg-blue-900/50 border-r-4 border-white/10 flex flex-col relative">
                <div className="p-4 bg-blue-800 flex justify-between items-center shadow-lg z-10">
                    <div className="flex items-center gap-2">
                        <User className="w-6 h-6 text-blue-200" />
                        <span className="text-2xl font-bold text-blue-200">MAVİ TAKIM</span>
                    </div>
                    <span id="p1-score" className="text-5xl font-black text-white drop-shadow-lg">{state.p1Score}</span>
                </div>
                
                <div className="flex-1 flex flex-col justify-center p-8 gap-6 relative z-0" id="p1-controls">
                    <div className="bg-white/10 p-6 rounded-2xl mb-4 min-h-[160px] flex items-center justify-center backdrop-blur-sm border border-white/5 shadow-xl">
                        <p id="p1-question" className="text-3xl font-semibold text-center text-blue-50 leading-relaxed">{currentQ.q}</p>
                    </div>
                    <div id="p1-options" className="grid grid-cols-2 gap-4 h-64">
                        {currentQ?.options.map(opt => <OptionButton key={`p1-${opt}`} player="p1" option={opt} />)}
                    </div>
                </div>
                
                {p1Lock && <div id="p1-lock" className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in"><Lock className="w-32 h-32 text-red-500 mb-4 animate-bounce" /><span className="text-2xl font-bold text-red-400">KİLİTLENDİ!</span></div>}
                
                {state.winner === 'p1' && state.showNextButton &&
                    <div className="absolute inset-0 bg-green-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
                        <CheckCircle2 className="w-32 h-32 text-green-400 mb-4" />
                        <span className="text-4xl font-black text-white">DOĞRU!</span>
                    </div>
                }
            </div>

            <div id="p2-zone" className="player-zone flex-1 bg-red-900/50 flex flex-col relative">
                <div className="p-4 bg-red-800 flex justify-between items-center shadow-lg z-10">
                    <div className="flex items-center gap-2"><User className="w-6 h-6 text-red-200" /><span className="text-2xl font-bold text-red-200">KIRMIZI TAKIM</span></div>
                    <span id="p2-score" className="text-5xl font-black text-white drop-shadow-lg">{state.p2Score}</span>
                </div>

                <div className="flex-1 flex flex-col justify-center p-8 gap-6 relative z-0" id="p2-controls">
                    <div className="bg-white/10 p-6 rounded-2xl mb-4 min-h-[160px] flex items-center justify-center backdrop-blur-sm border border-white/5 shadow-xl"><p id="p2-question" className="text-3xl font-semibold text-center text-red-50 leading-relaxed">{currentQ.q}</p></div>
                    <div id="p2-options" className="grid grid-cols-2 gap-4 h-64">{currentQ?.options.map(opt => <OptionButton key={`p2-${opt}`} player="p2" option={opt} />)}</div>
                </div>
                
                {p2Lock && <div id="p2-lock" className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in"><Lock className="w-32 h-32 text-red-500 mb-4 animate-bounce" /><span className="text-2xl font-bold text-red-400">KİLİTLENDİ!</span></div>}
                
                {state.winner === 'p2' && state.showNextButton &&
                    <div className="absolute inset-0 bg-green-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
                        <CheckCircle2 className="w-32 h-32 text-green-400 mb-4" />
                        <span className="text-4xl font-black text-white">DOĞRU!</span>
                    </div>
                }
            </div>

             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]">
                {state.showNextButton ? (
                     <Button onClick={nextQuestion} className="h-24 px-12 text-2xl font-black bg-white text-slate-900 hover:bg-slate-200 pointer-events-auto animate-in zoom-in-50 duration-300">
                        SONRAKİ <ArrowRight className="ml-3 h-8 w-8" />
                    </Button>
                ) : (
                    <div className={cn(
                        "bg-slate-900 text-slate-100 font-black text-4xl w-24 h-24 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-2xl transform transition-all",
                        timeLeft <= 5 ? 'border-red-500 text-red-500 animate-pulse' : ''
                    )}>
                        <Timer className="h-8 w-8 mr-1" />
                        {timeLeft}
                    </div>
                )}
            </div>
            
            <Link href="/teacher/smartboard/kavram-duellosu" className="absolute top-6 left-6 z-50">
                 <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 text-white border border-white/10">
                    <ArrowLeft className="w-8 h-8" />
                 </Button>
            </Link>
             {showConfetti && <Confetti active={showConfetti} config={{ particleCount: 200, spread: 90, origin: { x: state.winner === 'p1' ? 0.25 : 0.75, y: 0.6 } }} />}
        </div>
    );
}

