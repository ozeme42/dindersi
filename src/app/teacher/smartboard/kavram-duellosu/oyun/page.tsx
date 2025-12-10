
'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Swords, Repeat, Award, PartyPopper, Check, Home, MonitorPlay, Zap, Shield, Crown } from "lucide-react";
import Link from "next/link";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { QuestionDialog } from "@/components/question-dialog";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { GetQuizInput, GetQuizOutput, Question } from "@/lib/types";
import { updateMultipleStudentScores } from '@/app/teacher/smartboard/actions';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";

type GameQuestion = GetQuizOutput['questions'][0];
type Player = { id: string; name: string; isGuest: boolean; avatar?: string; };

function CompetitionLoadingSkeleton() {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-red-500" />
      </div>
    );
}

function DuelGameComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    
    const [duelists, setDuelists] = useState<{ p1: Player, p2: Player } | null>(null);
    const [activePlayer, setActivePlayer] = useState<Player | null>(null);
    const [tugProgress, setTugProgress] = useState(0); // -100 (p2 wins) to 100 (p1 wins)

    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [winner, setWinner] = useState<Player | 'draw' | null>(null);

    const questionTimer = parseInt(searchParams.get('questionTimer') || '0');
    
    // Configs
    const pullStrengthConfig = useMemo(() => {
        const param = searchParams.get('pullStrength');
        try { return param ? JSON.parse(param) : { Kolay: 10, Orta: 15, Zor: 20 }; } catch { return { Kolay: 10, Orta: 15, Zor: 20 }; }
    }, [searchParams]);

    const pointsConfig = useMemo(() => {
        return { 
            default: { points: 0 },
            mcq: pullStrengthConfig,
            tf: pullStrengthConfig,
            fitb: pullStrengthConfig 
        };
    }, [pullStrengthConfig]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchGameData = useCallback(async () => {
        const p1Id = searchParams.get('p1');
        const p2Id = searchParams.get('p2');
        
        if (!p1Id || !p2Id) {
            setError("Savaşçı bilgileri eksik. Lütfen kurulum ekranına geri dönün.");
            setIsLoading(false);
            return;
        }

        try {
            const [p1Doc, p2Doc] = await Promise.all([ getDoc(doc(db, "users", p1Id)), getDoc(doc(db, "users", p2Id)) ]);
            
            if (!p1Doc.exists() || !p2Doc.exists()) throw new Error("Savaşçılar bulunamadı.");

            const player1Data = p1Doc.data();
            const player2Data = p2Doc.data();
            
            const p1: Player = { id: p1Doc.id, name: player1Data.displayName, isGuest: player1Data.role === 'guest', avatar: player1Data.avatar };
            const p2: Player = { id: p2Doc.id, name: player2Data.displayName, isGuest: player2Data.role === 'guest', avatar: player2Data.avatar };

            setDuelists({ p1, p2 });
            setActivePlayer(p1);

            const params: GetQuizInput = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: parseInt(searchParams.get('questionCount') || '20'),
                difficulty: ['Kolay', 'Orta', 'Zor'],
                questionTypes: ['mcq', 'tf', 'fitb'],
            };
            const questionResult = await getQuestionsFromBank(params);
            
            if ('error' in questionResult) throw new Error(questionResult.error);
            if (!questionResult.questions || questionResult.questions.length === 0) throw new Error("Soru bulunamadı.");
            
            setQuestions(questionResult.questions as GameQuestion[]);
            setGameState('playing');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        if (gameState !== 'playing' || !activePlayer || !duelists) return;
        
        const direction = activePlayer.id === duelists.p1.id ? 1 : -1;
        const impact = scoreChange; 
        
        let newTugProgress = tugProgress + (direction * impact);
        newTugProgress = Math.max(-100, Math.min(100, newTugProgress));
        
        setTugProgress(newTugProgress);
        setAnsweredQuestions(prev => [...prev, questionNumber]);
        setOpenedQuestion(null);

        if (newTugProgress >= 100) { 
            setWinner(duelists.p1); 
            setGameState('finished'); 
        } else if (newTugProgress <= -100) { 
            setWinner(duelists.p2); 
            setGameState('finished'); 
        } else if (answeredQuestions.length + 1 === questions.length) {
            if (newTugProgress > 0) setWinner(duelists.p1);
            else if (newTugProgress < 0) setWinner(duelists.p2);
            else setWinner('draw');
            setGameState('finished');
        } else {
            setActivePlayer(activePlayer.id === duelists.p1.id ? duelists.p2 : duelists.p1);
        }
    };
    
    useEffect(() => {
        if (gameState === 'finished' && winner && winner !== 'draw' && duelists) {
            if (user?.role === 'student') return; // Do not save score if a student is playing from smartboard link
            
            const winnerId = winner.id;
            const loserId = winnerId === duelists.p1.id ? duelists.p2.id : duelists.p1.id;
            
            const scoreUpdates = [];
            if(!duelists.p1.isGuest) scoreUpdates.push({ userId: duelists.p1.id, points: winnerId === duelists.p1.id ? 50 : 10, gameType: 'smartboard_duello' as const, context: 'Düello' });
            if(!duelists.p2.isGuest) scoreUpdates.push({ userId: duelists.p2.id, points: winnerId === duelists.p2.id ? 50 : 10, gameType: 'smartboard_duello' as const, context: 'Düello' });

            if(scoreUpdates.length > 0) {
                updateMultipleStudentScores(scoreUpdates);
            }
        }
    }, [gameState, winner, duelists, user]);
    
    if (isLoading) return <CompetitionLoadingSkeleton />;
    if (error) return (
        <div className="flex h-screen items-center justify-center bg-slate-950 p-4">
            <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-900 text-red-200">
                <AlertTitle>Hata!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <Button asChild variant="outline" className="mt-4 border-red-800 text-red-300 hover:bg-red-900/50">
                    <Link href="/teacher/smartboard/duello"><ArrowLeft className="mr-2 h-4 w-4" /> Kuruluma Geri Dön</Link>
                </Button>
            </Alert>
        </div>
    );

     if (gameState === 'finished') {
         return (
              <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
                <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-slate-950 to-slate-950" />
                <Card className="w-full max-w-4xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl relative z-10 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
                    
                    <CardHeader className="text-center pt-12 pb-6">
                        <div className="mx-auto bg-slate-800 p-6 rounded-full mb-6 shadow-xl ring-8 ring-slate-800/50 inline-block animate-bounce">
                             <Trophy className="h-20 w-20 text-yellow-400 fill-yellow-400/20" />
                        </div>
                        <CardTitle className="text-5xl font-black text-white uppercase tracking-tight drop-shadow-lg">Düello Bitti!</CardTitle>
                    </CardHeader>
                    
                    <CardContent className="flex flex-col items-center gap-8 pb-12">
                        {winner === 'draw' ? (
                            <div className="text-center">
                                <Award className="h-32 w-32 text-slate-400 mx-auto mb-4"/>
                                <p className="text-4xl font-black text-slate-200">BERABERE!</p>
                            </div>
                        ) : winner && duelists ? (
                            <div className="flex flex-col items-center">
                                <div className="relative mb-6">
                                    <div className="absolute -top-10 -right-10 text-6xl animate-bounce delay-100">👑</div>
                                    <div className={cn("border-4 px-12 py-8 rounded-[2rem] shadow-2xl relative overflow-hidden", winner.id === duelists.p1.id ? "bg-blue-900/40 border-blue-500" : "bg-red-900/40 border-red-500")}>
                                        <div className={cn("absolute inset-0 opacity-20", winner.id === duelists.p1.id ? "bg-blue-500" : "bg-red-500")}/>
                                        <h3 className="text-6xl font-black text-white uppercase relative z-10">{winner.name}</h3>
                                        <p className={cn("text-2xl font-bold mt-2 tracking-widest text-center relative z-10", winner.id === duelists.p1.id ? "text-blue-300" : "text-red-300")}>KAZANAN</p>
                                    </div>
                                </div>
                            </div>
                        ) : <p className="text-slate-400">Sonuçlar hesaplanıyor...</p> }
                    </CardContent>
                    <CardFooter className="bg-slate-900 border-t border-white/5 p-8 flex justify-center gap-6">
                        <Button size="lg" onClick={() => window.location.reload()} className="h-16 px-8 text-xl rounded-2xl bg-white text-slate-900 hover:bg-slate-200 font-bold shadow-lg">
                            <Repeat className="mr-3 h-6 w-6"/> Rövanş
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-16 px-8 text-xl rounded-2xl border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                            <Link href="/teacher/smartboard"><Home className="mr-3 h-6 w-6"/> Çıkış</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className={cn("flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative selection:bg-red-500/30 font-sans", isFullscreen ? "" : "p-4 md:p-6")}>
            
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-blue-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-red-900/10 rounded-full blur-[150px]" />
            </div>

            {/* Üst Bar */}
            <header className={cn("flex-shrink-0 flex items-center justify-between z-20 mb-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 shadow-lg", isFullscreen && "rounded-none border-x-0 border-t-0 mb-0")}>
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl shadow-lg"><Swords className="h-5 w-5 text-white"/></div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-white uppercase leading-none">Düello</h1>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{searchParams.get('courseName')} • {searchParams.get('topicName')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <FullscreenToggle className="bg-slate-800 text-slate-300 hover:text-white border-0 h-8 w-8 rounded-lg" />
                    {!isFullscreen && <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg h-8 w-8"><Link href="/teacher/smartboard/duello"><ArrowLeft className="h-4 w-4" /></Link></Button>}
                </div>
            </header>

            {/* Ana İçerik */}
            <main className="flex-1 flex flex-col gap-6 overflow-hidden relative z-10 h-full p-2">
                
                {/* 1. ÜST: SAVAŞ ALANI */}
                {duelists && (
                    <div className="flex-shrink-0 flex flex-col gap-6 justify-center min-h-[250px] relative">
                        <div className="flex justify-between items-center w-full px-4 md:px-12 relative z-10">
                            <div className={cn("flex flex-col items-center gap-2 transition-all duration-300 transform", activePlayer?.id === duelists.p1.id ? "scale-110 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]" : "opacity-70 scale-95")}>
                                <div className={cn("p-1 rounded-full", activePlayer?.id === duelists.p1.id ? "bg-blue-500 animate-pulse" : "bg-slate-700")}><Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-slate-900"><AvatarImage src={duelists.p1.avatar}/><AvatarFallback className="bg-blue-600 text-white font-black text-2xl">{duelists.p1.name.charAt(0)}</AvatarFallback></Avatar></div>
                                <div className={cn("px-4 py-1 rounded-lg font-black text-lg uppercase tracking-wider", activePlayer?.id === duelists.p1.id ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400")}>{duelists.p1.name}</div>
                            </div>
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"><div className="w-16 h-16 bg-slate-900 rounded-full border-4 border-white/10 flex items-center justify-center shadow-2xl"><span className="font-black text-2xl text-slate-500 italic">VS</span></div></div>
                            <div className={cn("flex flex-col items-center gap-2 transition-all duration-300 transform", activePlayer?.id === duelists.p2.id ? "scale-110 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]" : "opacity-70 scale-95")}>
                                <div className={cn("p-1 rounded-full", activePlayer?.id === duelists.p2.id ? "bg-red-500 animate-pulse" : "bg-slate-700")}><Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-slate-900"><AvatarImage src={duelists.p2.avatar}/><AvatarFallback className="bg-red-600 text-white font-black text-2xl">{duelists.p2.name.charAt(0)}</AvatarFallback></Avatar></div>
                                <div className={cn("px-4 py-1 rounded-lg font-black text-lg uppercase tracking-wider", activePlayer?.id === duelists.p2.id ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400")}>{duelists.p2.name}</div>
                            </div>
                        </div>
                        
                        <div className="w-full px-8 relative">
                             <div className="h-8 w-full bg-slate-800 rounded-full overflow-hidden border-4 border-slate-700 shadow-inner relative">
                                 <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-800 to-blue-500 transition-all duration-700 ease-in-out shadow-[0_0_20px_rgba(59,130,246,0.5)]" style={{ width: `${50 + tugProgress / 2}%` }} />
                                 <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-red-800 to-red-500 transition-all duration-700 ease-in-out shadow-[0_0_20px_rgba(239,68,68,0.5)]" style={{ width: `${50 - tugProgress / 2}%` }} />
                                 <div className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-700 ease-in-out" style={{ left: `${50 + tugProgress / 2}%`, transform: 'translate(-50%, -50%)' }}><div className="w-12 h-12 bg-white rounded-full border-4 border-slate-900 shadow-xl flex items-center justify-center"><Swords className={cn("h-6 w-6", tugProgress > 0 ? "text-blue-600" : tugProgress < 0 ? "text-red-600" : "text-slate-400")} /></div></div>
                             </div>
                             <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2 h-12 -mt-2 z-0" />
                        </div>
                        <div className="text-center"><p className="text-slate-400 text-sm font-bold uppercase tracking-widest animate-pulse">Sıra: <span className={cn("text-lg", activePlayer?.id === duelists.p1.id ? "text-blue-400" : "text-red-400")}>{activePlayer?.name}</span></p></div>
                    </div>
                )}

                {/* 2. ALT: SORU PANELİ */}
                <div className="flex-1 min-h-0 pb-2">
                     <div className="h-full w-full bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-6 shadow-inner overflow-hidden flex flex-col">
                        
                        {/* Soru Grid */}
                        <div className="flex-1 overflow-hidden relative">
                             <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-2">
                                <div className={cn(
                                    "grid gap-3",
                                    isFullscreen ? "grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14" : "grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
                                )}>
                                    {questions.map((q, i) => {
                                        const questionNumber = i + 1;
                                        const isAnswered = answeredQuestions.includes(questionNumber);
                                        const index = i % 8; 
                                        const colorClass = [
                                            "bg-blue-600 hover:bg-blue-500 border-blue-800", 
                                            "bg-red-600 hover:bg-red-500 border-red-800", 
                                            "bg-amber-600 hover:bg-amber-500 border-amber-800", 
                                            "bg-indigo-600 hover:bg-indigo-500 border-indigo-800", 
                                            "bg-pink-600 hover:bg-pink-500 border-pink-800", 
                                            "bg-cyan-600 hover:bg-cyan-500 border-cyan-800", 
                                            "bg-emerald-600 hover:bg-emerald-500 border-emerald-800", 
                                            "bg-violet-600 hover:bg-violet-500 border-violet-800"
                                        ][index];

                                        return (
                                            <button
                                                key={i}
                                                disabled={isAnswered || !activePlayer}
                                                onClick={() => !isAnswered && setOpenedQuestion({ number: questionNumber, question: q })}
                                                className={cn(
                                                    "aspect-square rounded-xl flex items-center justify-center font-black transition-all duration-300 relative overflow-hidden group border-b-4 active:border-b-0 active:translate-y-1 h-full w-full min-h-[3rem]",
                                                    isFullscreen ? "text-3xl" : "text-xl",
                                                    isAnswered 
                                                        ? "bg-slate-800/40 text-slate-700 border-slate-800/50 cursor-not-allowed grayscale border-b-0" 
                                                        : cn("text-white shadow-lg", colorClass)
                                                )}
                                            >
                                                {!isAnswered && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                {isAnswered ? <Check className="h-8 w-8 opacity-20" /> : <span className="drop-shadow-md z-10">{questionNumber}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                     </div>
                </div>

            </main>

            {/* Modal */}
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={isFullscreen}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={questionTimer}
                    pointsConfig={pointsConfig}
                />
            )}
        </div>
    );
}

// Wrapper component to handle Suspense
export default function SmartboardDuelloOyunPage() {
    return (
        <Suspense fallback={<CompetitionLoadingSkeleton />}>
            <DuelGameComponent />
        </Suspense>
    )
}
