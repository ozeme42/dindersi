
'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Swords, Repeat, Award, PartyPopper, Check, Home, MonitorPlay, Zap, Shield, Crown } from "lucide-react";
import Link from "next/link";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { QuestionDialog } from "@/components/question-dialog";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { UserProfile, GetQuizInput, GetQuizOutput, Question } from "@/lib/types";
import { updateMultipleStudentScores } from '@/app/teacher/smartboard/actions';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type GameQuestion = GetQuizOutput['questions'][0];
type Player = { id: string; name: string; isGuest: boolean; };

function DuelGameComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
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
        // Düelloda puan yerine çekme gücü kullanılıyor ama QuestionDialog için gerekli olabilir.
        // Burada dummy bir config veriyoruz veya pullStrength'i points olarak geçiyoruz.
        return { 
            default: { points: 0 }, // Specific types will override
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
            
            const p1 = { id: p1Doc.id, name: player1Data.displayName, isGuest: player1Data.role === 'guest' };
            const p2 = { id: p2Doc.id, name: player2Data.displayName, isGuest: player2Data.role === 'guest' };

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
            const questionResult = await getQuestionsFromBank(params as any);
            
            if ('error' in questionResult) throw new Error(questionResult.error);
            if (!questionResult.questions || questionResult.questions.length === 0) throw new Error("Soru bulunamadı.");
            
            const formattedQuestions = questionResult.questions.map(q => ({
                ...q,
                text: q.text || (q as any).question || (q as any).statement || (q as any).sentenceWithBlank || '',
            })) as GameQuestion[];
            
            setQuestions(formattedQuestions);
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
        
        // scoreChange burada çekme gücü (pullStrength) olarak geliyor
        // P1 için pozitif, P2 için negatif etki yapmalı
        const direction = activePlayer.id === duelists.p1.id ? 1 : -1;
        const impact = isCorrect ? scoreChange : -scoreChange; // Yanlışsa geri teper (opsiyonel, şimdilik sadece doğru sayalım veya geri tepme ekleyelim)
        
        // Basit mod: Sadece doğru cevapta çeksin, yanlışta nötr kalsın veya hafif geri kaysın
        // Şu anki QuestionDialog mantığı: Doğruysa +Puan, Yanlışsa -Ceza döndürüyor.
        // Biz burada gelen değeri direkt kullanıyoruz.
        
        let newTugProgress = tugProgress + (direction * impact);
        newTugProgress = Math.max(-100, Math.min(100, newTugProgress));
        
        setTugProgress(newTugProgress);
        setAnsweredQuestions(prev => [...prev, questionNumber]);
        setOpenedQuestion(null);

        if (newTugProgress >= 100) { 
            setWinner(duelists.p1); 
            setGameState('finished'); 
            playSound('win');
        } else if (newTugProgress <= -100) { 
            setWinner(duelists.p2); 
            setGameState('finished'); 
            playSound('win');
        } else if (answeredQuestions.length + 1 === questions.length) {
            // Sorular bitti, kim öndeyse o kazanır
            if (newTugProgress > 0) setWinner(duelists.p1);
            else if (newTugProgress < 0) setWinner(duelists.p2);
            else setWinner('draw');
            setGameState('finished');
        } else {
            // Sıra diğer oyuncuya geçer
            setActivePlayer(activePlayer.id === duelists.p1.id ? duelists.p2 : duelists.p1);
        }
    };
    
    // Oyun bittiğinde skorları kaydet (Opsiyonel)
    useEffect(() => {
        if (gameState === 'finished' && winner && winner !== 'draw' && duelists) {
            const winnerId = winner.id;
            const loserId = winnerId === duelists.p1.id ? duelists.p2.id : duelists.p1.id;

            const scoreUpdates = [
                { userId: winnerId, points: 50, gameType: 'smartboard_duello' as const, context: 'Düello Galibiyeti' },
                { userId: loserId, points: 10, gameType: 'smartboard_duello' as const, context: 'Düello Katılımı' },
            ].filter(update => !duelists.p1.isGuest && !duelists.p2.isGuest); // Misafirler kaydedilmez
            
            if(scoreUpdates.length > 0) {
                updateMultipleStudentScores(scoreUpdates);
            }
        }
    }, [gameState, winner, duelists]);
    
    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-red-500"/></div>
    if (error) return (
        <div className="flex h-screen items-center justify-center bg-slate-950">
            <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-900 text-red-200">
                <AlertTitle>Hata!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <Button asChild variant="outline" className="mt-4 border-red-800 text-red-300 hover:bg-red-900/50">
                    <Link href="/teacher/smartboard/duello"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
            </Alert>
        </div>
    );

    if (gameState === 'finished' && duelists) {
         return (
              <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-red-600/10 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]" />
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
                </div>

                <Card className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative z-10 overflow-hidden">
                     {/* Confetti Effect (Static representation) */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />

                    <CardHeader className="text-center pb-2">
                        <CardTitle className="font-black text-4xl text-white uppercase tracking-wider flex flex-col items-center gap-4">
                             <div className="p-4 bg-yellow-500/20 rounded-full border border-yellow-500/30 shadow-lg shadow-yellow-500/20 animate-bounce">
                                <Trophy className="h-16 w-16 text-yellow-400 drop-shadow-md"/>
                             </div>
                             Düello Bitti!
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-lg">Mücadele sona erdi.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                            {winner === 'draw' ? (
                                <p className="text-3xl font-black text-slate-300">BERABERE!</p>
                            ) : winner ? (
                                <>
                                    <p className="text-lg text-slate-300 font-medium uppercase tracking-widest">KAZANAN SAVAŞÇI</p>
                                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">{winner?.name}</p>
                                    <div className="px-6 py-2 bg-yellow-500/10 rounded-full border border-yellow-500/30 text-yellow-400 font-bold text-xl mt-2">
                                        Zafer!
                                    </div>
                                </>
                            ) : <p className="text-slate-400">Sonuçlar hesaplanıyor...</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4 bg-black/20 p-6 border-t border-white/5">
                         <Button onClick={() => window.location.reload()} size="lg" className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-900/20">
                             <Repeat className="mr-2 h-5 w-5" /> Rövanş
                         </Button>
                         <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent">
                             <Link href="/teacher/smartboard"><Home className="mr-2 h-5 w-5" /> Ana Menü</Link>
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
            <header className={cn("flex-shrink-0 flex items-center justify-between z-20 mb-6 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 shadow-lg", isFullscreen && "rounded-none border-x-0 border-t-0 mb-0")}>
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl shadow-lg"><Swords className="h-6 w-6 text-white"/></div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-white uppercase leading-none">Düello</h1>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{searchParams.get('courseName')} • {searchParams.get('topicName')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <FullscreenToggle className="bg-slate-800 text-slate-300 hover:text-white border-0 h-10 w-10 rounded-lg" />
                    {!isFullscreen && <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"><Link href="/teacher/smartboard/duello"><ArrowLeft className="h-5 w-5" /></Link></Button>}
                </div>
            </header>

            {/* Ana İçerik */}
            <main className="flex-1 flex flex-col gap-6 overflow-hidden relative z-10 h-full">
                
                {/* 1. ÜST: SAVAŞ ALANI (TUG OF WAR) */}
                {duelists && (
                    <div className="flex-shrink-0 flex flex-col gap-6 justify-center min-h-[250px] relative">
                        {/* Oyuncular */}
                        <div className="flex justify-between items-center w-full px-4 md:px-12 relative z-10">
                             <div className={cn("flex flex-col items-center gap-2 transition-all duration-300 transform", activePlayer?.id === duelists.p1.id ? "scale-110 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]" : "opacity-70 scale-95")}>
                                <div className={cn("p-1 rounded-full", activePlayer?.id === duelists.p1.id ? "bg-blue-500 animate-pulse" : "bg-slate-700")}>
                                    <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-slate-900">
                                        <AvatarFallback className="bg-blue-600 text-white font-black text-2xl">{duelists.p1.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className={cn("px-4 py-1 rounded-lg font-black text-lg uppercase tracking-wider", activePlayer?.id === duelists.p1.id ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400")}>{duelists.p1.name}</div>
                            </div>
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                <div className="w-16 h-16 bg-slate-950 border-4 border-white/10 rounded-full flex items-center justify-center shadow-2xl"><span className="font-black text-2xl text-slate-500 italic">VS</span></div>
                            </div>
                             <div className={cn("flex flex-col items-center gap-2 transition-all duration-300 transform", activePlayer?.id === duelists.p2.id ? "scale-110 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]" : "opacity-70 scale-95")}>
                                <div className={cn("p-1 rounded-full", activePlayer?.id === duelists.p2.id ? "bg-red-500 animate-pulse" : "bg-slate-700")}>
                                    <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-slate-900">
                                        <AvatarFallback className="bg-red-600 text-white font-black text-2xl">{duelists.p2.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className={cn("px-4 py-1 rounded-lg font-black text-lg uppercase tracking-wider", activePlayer?.id === duelists.p2.id ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400")}>{duelists.p2.name}</div>
                            </div>
                        </div>

                        {/* Halat */}
                        <div className="w-full px-8 relative">
                             <div className="h-8 w-full bg-slate-800 rounded-full overflow-hidden border-4 border-slate-700 shadow-inner relative">
                                 <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />
                                 <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-blue-600/30" />
                                 <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-red-600/30" />
                                 <div 
                                    className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-700 ease-out"
                                    style={{ left: `${50 + tugProgress / 2}%`, transform: 'translate(-50%, -50%)' }}
                                 >
                                     <div className="w-12 h-12 bg-white rounded-full border-4 border-slate-900 shadow-xl flex items-center justify-center">
                                         <Swords className={cn("h-6 w-6", tugProgress > 0 ? "text-blue-600" : tugProgress < 0 ? "text-red-600" : "text-slate-400")} />
                                     </div>
                                 </div>
                             </div>
                        </div>
                        
                        <div className="text-center">
                             <p className="text-slate-400 text-sm font-bold uppercase tracking-widest animate-pulse">
                                 Sıra: <span className={cn("text-lg", activePlayer?.id === duelists.p1.id ? "text-blue-400" : "text-red-400")}>{activePlayer?.name}</span>
                             </p>
                        </div>
                    </div>
                )}
                 {/* 2. ALT: SORU PANELİ */}
                <div className="flex-1 min-h-0 pb-2">
                     <div className="h-full w-full bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-6 shadow-inner overflow-hidden flex flex-col">
                        
                        {/* Panel Header */}
                        <div className="flex flex-col md:flex-row items-center justify-between mb-6 shrink-0 border-b border-white/5 pb-4 gap-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <span className="bg-red-500/20 text-red-400 p-1.5 rounded-lg border border-red-500/30"><ShieldAlert className="h-5 w-5"/></span>
                                Soru Alanı
                            </h2>
                            <Button 
                                variant="outline" 
                                className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-10 px-6 rounded-xl text-base font-bold ml-auto"
                                onClick={handleSelectRandomQuestion} 
                                disabled={!activePlayer}
                            >
                                <Shuffle className="mr-2 h-4 w-4" /> Rastgele Seç
                            </Button>
                        </div>
                        
                        {/* Soru Grid */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            <div className={cn(
                                "grid gap-3",
                                isFullscreen ? "grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14" : "grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
                            )}>
                                {questions.map((q, i) => {
                                    const questionNumber = i + 1;
                                    const isAnswered = answeredQuestions.includes(questionNumber);
                                    
                                    return (
                                        <button
                                            key={i}
                                            disabled={isAnswered || !activePlayer}
                                            onClick={() => !isAnswered && setOpenedQuestion({ number: questionNumber, question: q })}
                                            className={cn(
                                                "aspect-square rounded-xl flex items-center justify-center text-2xl font-black transition-all duration-300 relative overflow-hidden group border-b-4 active:border-b-0 active:translate-y-1 h-full w-full min-h-[3rem]",
                                                isAnswered 
                                                    ? "bg-slate-800/40 text-slate-700 border-slate-800/50 cursor-not-allowed grayscale border-b-0" 
                                                    : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-900 text-white shadow-lg hover:-translate-y-1 hover:border-b-[6px] hover:shadow-cyan-500/20"
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

            </main>

            {/* Modal */}
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={isFullscreen}
                    isOpen={!!openedQuestion}
                    onClose={() => { setOpenedQuestion(null); setActivePlayer(prev => prev?.id === duelists?.p1.id ? duelists?.p2 : duelists?.p1 || null); }}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={questionTimer}
                    pointsConfig={pointsConfig}
                    pullStrengthConfig={pullStrengthConfig} // Pass pull strength config
                    penaltyConfig={{}} // No penalty in duel, just no pull
                />
            )}
        </div>
    );
}

export default function SmartboardDuelloOyunPage() {
  return <Suspense fallback={<CompetitionLoadingSkeleton />}><DuelGameComponent /></Suspense>
}
```