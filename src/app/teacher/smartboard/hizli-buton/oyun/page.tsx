'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Repeat, Home, CheckCircle2, XCircle, User, ArrowRight, ArrowLeft, Trophy, Timer, Hand } from "lucide-react";
import Link from "next/link";
import { getHizliButonQuestions } from '../actions';
import type { HizliButonQuestion } from '../actions';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { playSound, stopSound } from "@/lib/audio-service";
import Confetti from 'react-dom-confetti';

type GameQuestion = HizliButonQuestion;

function SpeedBuzzerGameComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    
    const [state, setState] = useState({
        p1Score: 0,
        p2Score: 0,
        currentQIndex: 0,
        showNextButton: false, // Sonraki soruya geçme butonu
        roundEnded: false, // Tur bitti mi (cevap gösteriliyor mu)
        winner: null as 'p1' | 'p2' | null, // Oyunun kazananı
        buzzerOwner: null as 'p1' | 'p2' | null, // O an butona basan kişi
        gameState: 'loading' as 'loading' | 'playing' | 'finished',
    });

    const [p1Lock, setP1Lock] = useState(false);
    const [p2Lock, setP2Lock] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [timeLeft, setTimeLeft] = useState(20); // Sözlü cevap için süreyi biraz artırabiliriz
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const questionResult = await getHizliButonQuestions(params);
        
        if (questionResult.error) {
            setError(questionResult.error);
        } else if (questionResult.questions && questionResult.questions.length > 0) {
            // Soruları karıştır
            const processedQuestions = questionResult.questions.sort(() => Math.random() - 0.5);
            setQuestions(processedQuestions);
            setState(s => ({ ...s, gameState: 'playing' }));
        } else {
            setError("Uygun soru bulunamadı.");
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
            roundEnded: false,
            buzzerOwner: null,
            winner: null,
        }));
        setP1Lock(false);
        setP2Lock(false);
        setTimeLeft(20);

    }, [currentQ, state.currentQIndex, questions.length]);
    
    useEffect(() => {
        if (!isLoading && questions.length > 0 && state.gameState === 'playing') {
            loadQuestion();
        }
    }, [isLoading, questions, state.currentQIndex, loadQuestion, state.gameState]);
    
    // Timer Logic
    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
    };

    const handleTimeUp = useCallback(() => {
        stopTimer();
        if (state.roundEnded) return;
        
        playSound('timeUp');
        // Süre bitti, kimse bilemedi
        setP1Lock(true);
        setP2Lock(true);
        setState(s => ({ ...s, roundEnded: true, showNextButton: true, correctAnswer: currentQ?.a || null }));
    }, [currentQ, state.roundEnded]);
    
    useEffect(() => {
        if (state.gameState === 'playing' && !state.roundEnded && !state.buzzerOwner) {
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
            stopTimer();
        }
        return () => stopTimer();
    }, [state.gameState, state.roundEnded, state.buzzerOwner, handleTimeUp]);

    const handleBuzzerPress = (player: 'p1' | 'p2') => {
        if (state.roundEnded || state.buzzerOwner) return;
        
        const isP1 = player === 'p1';
        if ((isP1 && p1Lock) || (!isP1 && p2Lock)) return;

        playSound('timeUp');
        setState(s => ({ ...s, buzzerOwner: player }));
    };

    const handleVerdict = (isCorrect: boolean) => {
        const player = state.buzzerOwner;
        if (!player) return;

        const isP1 = player === 'p1';

        if (isCorrect) {
            playSound('correct');
            setState(prevState => ({
                ...prevState,
                p1Score: isP1 ? prevState.p1Score + 10 : prevState.p1Score,
                p2Score: !isP1 ? prevState.p2Score + 10 : prevState.p2Score,
                roundEnded: true,
                showNextButton: true,
                winner: player,
                buzzerOwner: null 
            }));
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2000);
        } else {
            playSound('incorrect');
            if (isP1) setP1Lock(true);
            else setP2Lock(true);

            setState(s => ({ ...s, buzzerOwner: null }));
            
            if ((isP1 && p2Lock) || (!isP1 && p1Lock)) {
                 setState(s => ({ ...s, roundEnded: true, showNextButton: true, correctAnswer: currentQ?.a || null }));
            }
        }
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
            roundEnded: false,
            winner: null,
            buzzerOwner: null,
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
        let winnerText = "DOSTLUK KAZANDI!";
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
    
    return (
        <div className="h-screen w-screen bg-slate-900 text-white flex overflow-hidden">
             <style jsx global>{`
                body { touch-action: manipulation; user-select: none; overflow: hidden; font-family: 'Segoe UI', sans-serif; }
                .player-zone { transition: all 0.3s; }
                .locked-zone { filter: grayscale(1); opacity: 0.5; pointer-events: none; }
                .active-buzzer { transform: scale(0.95); box-shadow: 0 0 30px rgba(255,255,255,0.5); }
                .buzzer-btn { 
                    transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 0 rgba(0,0,0,0.3), 0 15px 20px rgba(0,0,0,0.2);
                }
                .buzzer-btn:active {
                    transform: translateY(10px);
                    box-shadow: 0 0px 0 rgba(0,0,0,0.3), 0 5px 10px rgba(0,0,0,0.2);
                }
                .animate-pop { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes popIn { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
                .shake { animation: shake 0.5s; }
                @keyframes shake {
                0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); }
            }
            `}</style>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]">
                <Confetti active={showConfetti} config={{ particleCount: 200, spread: 90, origin: { x: state.winner === 'p1' ? 0.25 : 0.75, y: 0.6 } }} />
            </div>

            {/* MAVİ */}
            <div id="p1-zone" className={cn("player-zone flex-1 bg-blue-900/40 border-r-4 border-white/10 flex flex-col relative", p1Lock && "locked-zone")}>
                <div className="p-4 bg-blue-800 flex justify-between items-center shadow-lg z-10">
                    <div className="flex items-center gap-2"><User className="w-6 h-6 text-blue-200" /><span className="text-2xl font-bold text-blue-200">MAVİ TAKIM</span></div>
                    <span id="p1-score" className="text-5xl font-black text-white drop-shadow-lg">{state.p1Score}</span>
                </div>
                <div className="flex-1 flex justify-center items-center p-8"><button onClick={() => handleBuzzerPress('p1')} disabled={p1Lock || state.buzzerOwner !== null} className={cn("buzzer-btn w-64 h-64 rounded-full bg-blue-500 border-8 border-blue-600 flex flex-col items-center justify-center gap-2 outline-none group", "hover:bg-blue-400 active:bg-blue-600")}><Hand className="w-20 h-20 text-white drop-shadow-md group-hover:scale-110 transition-transform" /><span className="text-3xl font-black text-white uppercase tracking-wider">BAS</span></button></div>
                {p1Lock && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><XCircle className="w-48 h-48 text-red-500/50" /></div>}
            </div>

            {/* KIRMIZI */}
            <div id="p2-zone" className={cn("player-zone flex-1 bg-red-900/40 flex flex-col relative", p2Lock && "locked-zone")}>
                <div className="p-4 bg-red-800 flex justify-between items-center shadow-lg z-10">
                    <div className="flex items-center gap-2"><User className="w-6 h-6 text-red-200" /><span className="text-2xl font-bold text-red-200">KIRMIZI TAKIM</span></div>
                    <span id="p2-score" className="text-5xl font-black text-white drop-shadow-lg">{state.p2Score}</span>
                </div>
                <div className="flex-1 flex justify-center items-center p-8"><button onClick={() => handleBuzzerPress('p2')} disabled={p2Lock || state.buzzerOwner !== null} className={cn("buzzer-btn w-64 h-64 rounded-full bg-red-500 border-8 border-red-600 flex flex-col items-center justify-center gap-2 outline-none group", "hover:bg-red-400 active:bg-red-600")}><Hand className="w-20 h-20 text-white drop-shadow-md group-hover:scale-110 transition-transform" /><span className="text-3xl font-black text-white uppercase tracking-wider">BAS</span></button></div>
                {p2Lock && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><XCircle className="w-48 h-48 text-red-500/50" /></div>}
            </div>

            {/* ORTA EKRAN */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] flex flex-col items-center justify-center gap-6 w-full pointer-events-none">
                {state.buzzerOwner ? (
                    <div className="bg-slate-900/95 border-2 border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-pop pointer-events-auto backdrop-blur-xl min-w-[500px]">
                        <div className={`text-3xl font-bold ${state.buzzerOwner === 'p1' ? 'text-blue-400' : 'text-red-400'}`}>
                            {state.buzzerOwner === 'p1' ? 'MAVİ TAKIM' : 'KIRMIZI TAKIM'} CEVAPLIYOR...
                        </div>
                        <div className="h-px w-full bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-slate-400 text-sm mb-2">DOĞRU CEVAP:</p>
                            <p className="text-2xl text-white font-bold">{currentQ.a}</p>
                        </div>
                        <div className="flex gap-4 w-full">
                            <Button onClick={() => handleVerdict(true)} className="flex-1 h-16 bg-green-600 hover:bg-green-500 text-xl font-bold"><CheckCircle2 className="mr-2 h-6 w-6"/> DOĞRU</Button>
                            <Button onClick={() => handleVerdict(false)} className="flex-1 h-16 bg-red-600 hover:bg-red-500 text-xl font-bold"><XCircle className="mr-2 h-6 w-6"/> YANLIŞ</Button>
                        </div>
                    </div>
                ) : state.roundEnded ? (
                     <div className="flex flex-col items-center gap-6 animate-pop pointer-events-auto">
                        <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 text-center shadow-2xl">
                            <p className="text-slate-400 mb-1">DOĞRU CEVAP</p>
                            <p className="text-3xl font-bold text-green-400">{currentQ.a}</p>
                        </div>
                        <Button onClick={nextQuestion} className="h-20 px-12 text-2xl font-black bg-white text-slate-900 hover:bg-slate-200 shadow-xl">
                            SONRAKİ <ArrowRight className="ml-3 h-8 w-8" />
                        </Button>
                    </div>
                ) : (
                    <div className="w-full max-w-xl mx-auto">
                         <div className="bg-white/5 p-6 rounded-2xl min-h-[120px] flex items-center justify-center backdrop-blur-sm border border-white/5 shadow-xl">
                            <p className="text-3xl font-semibold text-center text-white leading-relaxed">{currentQ.q}</p>
                        </div>
                    </div>
                )}
            </div>
            
            <Link href="/teacher/smartboard/hizli-buton" className="absolute top-6 left-6 z-50 pointer-events-auto">
                 <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 text-white border border-white/10">
                    <ArrowLeft className="w-8 h-8" />
                 </Button>
            </Link>
        </div>
    );
}

export default function HizliButonOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-rose-500" /></div>}>
            <SpeedBuzzerGameComponent />
        </Suspense>
    )
}
