'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserMinus, ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, Check, Trophy, PartyPopper, Award, Swords, Target, Timer } from "lucide-react";
import Link from "next/link";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import type { GetQuizOutput, Question, GetQuizInput } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QuestionDialog } from "@/components/question-dialog";
import { Badge } from "@/components/ui/badge";
import { updateMultipleStudentScores } from "../../../../teacher/smartboard/actions";

type GameQuestion = GetQuizOutput['questions'][0] & {text: string};
type Player = { id: string; name: string; isGuest: boolean; };

function CompetitionLoadingSkeleton() {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
      </div>
    );
}

function DuelGameComponent() {
    const searchParams = useSearchParams();
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    
    const [duelists, setDuelists] = useState<{ p1: Player, p2: Player } | null>(null);
    const [activePlayer, setActivePlayer] = useState<Player | null>(null);
    const [tugProgress, setTugProgress] = useState(0); // -100 (p2 wins) to 100 (p1 wins)

    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [winner, setWinner] = useState<Player | 'draw' | null>(null);

    const questionTimer = parseInt(searchParams.get('questionTimer') || '0');
    const pullStrengthConfig = useMemo(() => {
        const param = searchParams.get('pullStrength');
        try {
            return param ? JSON.parse(param) : { Kolay: 10, Orta: 15, Zor: 20 };
        } catch { return { Kolay: 10, Orta: 15, Zor: 20 }; }
    }, [searchParams]);

    useEffect(() => {
        const fetchGameData = async () => {
            const p1Id = searchParams.get('p1Id');
            const p2Id = searchParams.get('p2Id');
            const p1Name = searchParams.get('p1Name');
            const p2Name = searchParams.get('p2Name');

            if (!p1Id || !p2Id || !p1Name || !p2Name) {
                setError("Savaşçı bilgileri eksik. Lütfen kurulum ekranına geri dönün.");
                setIsLoading(false);
                return;
            }

            try {
                const p1 = { id: p1Id, name: p1Name, isGuest: p1Id === p1Name };
                const p2 = { id: p2Id, name: p2Name, isGuest: p2Id === p2Name };

                setDuelists({ p1, p2 });
                setActivePlayer(p1);

                // Fetch questions
                const params: GetQuizInput = {
                    courseId: searchParams.get('courseId') || undefined,
                    unitId: searchParams.get('unitId') || undefined,
                    topicId: searchParams.get('topicId') || undefined,
                    questionCount: parseInt(searchParams.get('questionCount') || '20'),
                    difficulty: searchParams.get('difficulty')?.split(','),
                    questionTypes: searchParams.get('questionTypes')?.split(','),
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
        };
        fetchGameData();
    }, [searchParams]);

    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        if (gameState !== 'playing' || !activePlayer || !duelists) return;
        
        // Puan değişikliği yerine çekme gücü kullanılıyor, ancak scoreChange parametresi buradan geliyor.
        // Aslında questionDialog'dan gelen scoreChange, difficulty'ye göre pullStrengthConfig'den çekilen değer olmalı.
        // Fakat burada basitleştirmek için doğrudan scoreChange kullanabiliriz veya config'e bakabiliriz.
        // scoreChange zaten QuestionDialog içinde config'den hesaplanıp gönderiliyor varsayalım.
        
        // Doğru cevapta çeken taraf kazanır, yanlış cevapta karşı taraf çeker (veya yerinde sayar, oyun mantığına göre).
        // Burada basitçe: Doğruysa aktif oyuncu kendine çeker. Yanlışsa rakip kendine çeker.
        const pullAmount = isCorrect ? scoreChange : -scoreChange;

        let newTugProgress = tugProgress + (activePlayer.id === duelists.p1.id ? pullAmount : -pullAmount);
        newTugProgress = Math.max(-100, Math.min(100, newTugProgress));
        
        setTugProgress(newTugProgress);
        setAnsweredQuestions(prev => [...prev, questionNumber]);
        setOpenedQuestion(null);

        if (newTugProgress >= 100) { setWinner(duelists.p1); setGameState('finished'); }
        else if (newTugProgress <= -100) { setWinner(duelists.p2); setGameState('finished'); }
        else if (answeredQuestions.length + 1 === questions.length) {
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
            const winnerId = winner.id;
            const loserId = winnerId === duelists.p1.id ? duelists.p2.id : duelists.p1.id;

            const scoreUpdates = [
                { userId: winnerId, points: 50, gameType: 'smartboard_duello' as const, context: 'Düello Galibiyeti' },
                { userId: loserId, points: 10, gameType: 'smartboard_duello' as const, context: 'Düello Katılımı' },
            ].filter(update => !duelists.p1.isGuest && !duelists.p2.isGuest);
            
            if(scoreUpdates.length > 0) {
                updateMultipleStudentScores(scoreUpdates);
            }
        }
    }, [gameState, winner, duelists]);
    
    if (isLoading) return <CompetitionLoadingSkeleton />;
    if (error) return (
         <div className="flex h-screen items-center justify-center bg-slate-950 p-4">
            <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-500/50 text-red-200">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <AlertTitle className="text-white">Hata!</AlertTitle>
                <AlertDesc>{error}</AlertDesc>
                 <div className="mt-4">
                    <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10">
                        <Link href="/student/yarismalar/duello"><ArrowLeft className="mr-2 h-4 w-4" /> Kuruluma Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );

    if (gameState === 'finished') {
         return (
              <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-red-600/10 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]" />
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
                </div>

                <Card className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative z-10 overflow-hidden">
                     {/* Confetti Effect (Static representation) */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500" />

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
                            ) : (
                                <>
                                    <p className="text-lg text-slate-300 font-medium uppercase tracking-widest">KAZANAN SAVAŞÇI</p>
                                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">{winner?.name}</p>
                                    <div className="px-6 py-2 bg-yellow-500/10 rounded-full border border-yellow-500/30 text-yellow-400 font-bold text-xl mt-2">
                                        Zafer!
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4 bg-black/20 p-6 border-t border-white/5">
                         <Button onClick={() => window.location.reload()} size="lg" className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-900/20">
                             <Repeat className="mr-2 h-5 w-5" /> Tekrar Oyna
                         </Button>
                         <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent">
                             <Link href="/student/yarismalar"><Home className="mr-2 h-5 w-5" /> Ana Menü</Link>
                         </Button>
                    </CardFooter>
                </Card>
            </div>
         )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden flex flex-col font-sans selection:bg-rose-500/30">
            
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-blue-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-red-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto w-full relative z-10 flex-grow flex flex-col">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 border-b border-white/5 pb-6">
                    <div>
                         <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                            <Swords className="h-8 w-8 text-rose-400" />
                            Düello
                        </h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400 font-medium">
                            <span className="flex items-center gap-1"><Target className="h-4 w-4 text-emerald-400"/> {answeredQuestions.length} / {questions.length} Soru</span>
                            <span className="w-px h-4 bg-white/10"/>
                            <span className="flex items-center gap-1"><Timer className="h-4 w-4 text-orange-400"/> {questionTimer > 0 ? `${questionTimer}sn` : 'Süresiz'}</span>
                        </div>
                    </div>
                    <Button asChild variant="outline" className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 bg-slate-900/50 backdrop-blur-md">
                        <Link href="/student/yarismalar/duello"><ArrowLeft className="mr-2 h-4 w-4" /> Çıkış</Link>
                    </Button>
                </div>

                {/* Savaş Alanı (Tug of War Bar) */}
                {duelists && 
                <div className="mb-10 space-y-4">
                    <div className="flex justify-between items-end px-2 text-white drop-shadow-md relative">
                        {/* Player 1 (Blue) */}
                        <div className={cn(
                            "flex flex-col items-start transition-all duration-300",
                            activePlayer?.id === duelists.p1.id ? "scale-110" : "opacity-70"
                        )}>
                            <div className={cn(
                                "text-2xl font-black uppercase tracking-wide",
                                activePlayer?.id === duelists.p1.id ? "text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]" : "text-slate-400"
                            )}>
                                {duelists.p1.name}
                            </div>
                            {activePlayer?.id === duelists.p1.id && <Badge className="bg-blue-600 mt-1 animate-pulse">Sıra Sende</Badge>}
                        </div>

                        {/* VS */}
                        <div className="text-slate-600 font-black text-xl italic absolute left-1/2 -translate-x-1/2 bottom-2">VS</div>

                        {/* Player 2 (Red) */}
                        <div className={cn(
                            "flex flex-col items-end transition-all duration-300",
                            activePlayer?.id === duelists.p2.id ? "scale-110" : "opacity-70"
                        )}>
                             <div className={cn(
                                "text-2xl font-black uppercase tracking-wide",
                                activePlayer?.id === duelists.p2.id ? "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]" : "text-slate-400"
                            )}>
                                {duelists.p2.name}
                            </div>
                            {activePlayer?.id === duelists.p2.id && <Badge className="bg-red-600 mt-1 animate-pulse">Sıra Sende</Badge>}
                        </div>
                    </div>
                    
                    {/* The Bar */}
                    <div className="h-8 w-full bg-slate-900 rounded-full overflow-hidden border-2 border-white/10 relative shadow-inner">
                        {/* Blue Side */}
                        <div 
                            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-700 ease-in-out shadow-[0_0_20px_rgba(34,211,238,0.3)]" 
                            style={{ width: `${50 + tugProgress / 2}%` }} 
                        />
                         {/* Red Side (Visual trick: background is black, blue covers left. Right side is handled by remaining space or separate div if needed, but here simple bar logic: left part grows/shrinks) */}
                         {/* Actually for tug of war, we need the right side to be red. Let's stack them. */}
                         <div 
                            className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-red-600 to-rose-500 transition-all duration-700 ease-in-out shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                            style={{ width: `${50 - tugProgress / 2}%` }}
                         />

                        {/* Center Marker / Rope Knot */}
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-slate-950 border-4 border-white/20 flex items-center justify-center shadow-xl z-10 transition-all duration-700 ease-in-out"
                            style={{ left: `calc(${50 + tugProgress / 2}% - 24px)` }}
                        >
                            <Swords className="h-6 w-6 text-white"/>
                        </div>
                    </div>
                </div>
                }

                {/* Soru Izgarası */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl flex-grow flex flex-col overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl text-white font-bold flex items-center gap-2">
                                <span className="bg-rose-500/20 text-rose-400 p-1.5 rounded-lg border border-rose-500/30"><Target className="h-5 w-5"/></span>
                                Soru Seçimi
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 overflow-y-auto flex-grow min-h-[300px]">
                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
                            {questions.map((q, i) => {
                                const qNum = i + 1;
                                const isAnswered = answeredQuestions.includes(qNum);
                                return (
                                    <Button 
                                        key={i} 
                                        className={cn(
                                            "aspect-square h-auto w-auto text-xl font-black rounded-xl border-b-[4px] active:border-b-0 active:translate-y-[4px] transition-all relative overflow-hidden group",
                                            isAnswered 
                                                ? "bg-slate-800 border-slate-900 text-slate-600 cursor-not-allowed opacity-50" 
                                                : "bg-rose-600 hover:bg-rose-500 border-rose-800 text-white shadow-lg shadow-rose-900/20"
                                        )} 
                                        disabled={isAnswered || !activePlayer} 
                                        onClick={() => setOpenedQuestion({ number: qNum, question: q })}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {isAnswered ? <Check className="h-6 w-6"/> : qNum}
                                    </Button>
                                )
                            })}
                        </div>
                    </CardContent>
                    <CardFooter className="bg-black/20 p-4 border-t border-white/5 text-center text-xs text-slate-500">
                        Doğru cevaplar sizi zafere yaklaştırır, yanlışlar rakibe güç verir!
                    </CardFooter>
                </Card>
            </div>
            
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={false}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={questionTimer}
                    // For duel, we might want custom points config or pass pull strength as points
                    // Here we pass pullStrengthConfig as pointsConfig so question dialog returns pull strength as score
                    pointsConfig={pullStrengthConfig as any} 
                    penaltyConfig={pullStrengthConfig as any} // Penalty is same magnitude as pull
                />
            )}
        </div>
    )
}

export default function StudentDuelloOyunPage() {
    return <Suspense fallback={<CompetitionLoadingSkeleton />}><DuelGameComponent /></Suspense>
}