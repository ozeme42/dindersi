'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserMinus, ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, Check, Trophy, PartyPopper, Award, Timer, Target } from "lucide-react";
import Link from "next/link";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import type { GetQuizOutput, Question } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QuestionDialog } from "@/components/question-dialog";
import { Badge } from "@/components/ui/badge";

type GameQuestion = Question;

type GameCompetitor = {
    name: string;
    score: number;
};

function CompetitionLoadingSkeleton() {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-cyan-500" />
      </div>
    );
}

const TeamScoreCard = ({ competitor, isActive, colorClass, rank }: { competitor: GameCompetitor, isActive: boolean, colorClass: string, rank: number }) => {
    // Cyber colors mapping based on rank/index
    const rankColors = [
        "from-yellow-400 to-orange-500 border-yellow-500 shadow-yellow-500/20", // 1st
        "from-slate-300 to-slate-400 border-slate-400 shadow-slate-400/20",   // 2nd
        "from-orange-400 to-red-500 border-orange-500 shadow-orange-500/20",    // 3rd
        "from-indigo-500 to-blue-600 border-indigo-500 shadow-indigo-500/20",   // Others
        "from-purple-500 to-pink-600 border-purple-500 shadow-purple-500/20",
        "from-emerald-500 to-teal-600 border-emerald-500 shadow-emerald-500/20",
    ];

    const currentRankColor = rank < 3 ? rankColors[rank] : rankColors[3 + (rank % 3)];

    return (
        <Card 
            className={cn(
                'relative group cursor-pointer transition-all duration-300 transform overflow-hidden bg-slate-900 border-2',
                isActive ? `scale-105 shadow-2xl ring-4 ring-cyan-500/50 border-cyan-400 z-10` : `hover:scale-105 border-white/10 hover:border-white/30`,
            )}
        >
             {/* Background Gradient */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10", currentRankColor)} />
            
            {isActive && (
                <div className="absolute top-0 right-0 p-1 bg-cyan-500 text-black text-[10px] font-bold rounded-bl-lg">
                    SIRADAKİ
                </div>
            )}

            <CardContent className="p-4 flex flex-col items-center justify-center gap-2 relative z-10">
                 <div className={cn(
                    "h-12 w-12 flex items-center justify-center rounded-full border-2 text-xl font-black bg-slate-950 shadow-lg",
                    rank === 0 ? "text-yellow-400 border-yellow-400" : 
                    rank === 1 ? "text-slate-300 border-slate-300" : 
                    rank === 2 ? "text-orange-400 border-orange-400" : "text-white border-white/20"
                 )}>
                    {rank === 0 && <Crown className="h-6 w-6" />}
                    {rank === 1 && <Award className="h-6 w-6" />}
                    {rank === 2 && <Award className="h-6 w-6" />}
                    {rank > 2 && <span>#{rank + 1}</span>}
                </div>
                
                <div className="text-center w-full">
                    <p className="font-bold text-white text-lg truncate w-full">{competitor.name}</p>
                    <p className={cn("text-3xl font-black tabular-nums tracking-tight", isActive ? "text-cyan-400 scale-110" : "text-white/80")}>
                        {competitor.score}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};


function CompetitionComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [competitors, setCompetitors] = useState<GameCompetitor[]>([]);
    const [activeCompetitorIndex, setActiveCompetitorIndex] = useState(0);

    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');

    const questionTimer = parseInt(searchParams.get('questionTimer') || '0');
    const pointsConfig = useMemo(() => {
        const pointsParam = searchParams.get('points');
        try {
            return pointsParam ? JSON.parse(pointsParam) : { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }};
        } catch {
            return { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }};
        }
    }, [searchParams]);

    const penaltyConfig = useMemo(() => {
        const penaltyParam = searchParams.get('penalty');
        try {
            return penaltyParam ? JSON.parse(penaltyParam) : { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }};
        } catch {
            return { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }};
        }
    }, [searchParams]);

    useEffect(() => {
        const playerNames = searchParams.get('players')?.split(',') || ['Oyuncu 1'];
        setCompetitors(playerNames.map(name => ({ name, score: 0 })));

        const fetchQuestions = async () => {
            setIsLoading(true);
            setError(null);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: parseInt(searchParams.get('questionCount') || '20'),
                difficulty: searchParams.get('difficulty')?.split(','),
                questionTypes: searchParams.get('questionTypes')?.split(','),
            };
            const questionResult = await getQuestionsFromBank(params as any);

            if ('error' in questionResult) setError(questionResult.error);
            else if (questionResult.questions) setQuestions(questionResult.questions as GameQuestion[]);
            else setError("Uygun soru bulunamadı.");
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams]);

    useEffect(() => {
        const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        if (gameState === 'finished') return;
        
        setCompetitors(prev => prev.map((c, index) => index === activeCompetitorIndex ? { ...c, score: Math.max(0, c.score + scoreChange) } : c));
        
        setAnsweredQuestions(prev => [...prev, questionNumber]);
        setOpenedQuestion(null);
        
        if (answeredQuestions.length + 1 === questions.length) {
            setGameState('finished');
        } else {
            setActiveCompetitorIndex(prev => (prev + 1) % competitors.length);
        }
    };
    
    const sortedCompetitors = useMemo(() => {
        const finalSorted = [...competitors].sort((a, b) => b.score - a.score);
        return finalSorted.map((c, i) => ({...c, rank: i}));
    }, [competitors]);

    if (isLoading) return <CompetitionLoadingSkeleton />;
    if (error) return (
        <div className="flex h-screen items-center justify-center bg-slate-950 p-4">
            <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-500/50 text-red-200">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <AlertTitle className="text-white">Hata!</AlertTitle>
                <AlertDesc>{error}</AlertDesc>
                 <div className="mt-4">
                    <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10">
                        <Link href="/student/yarismalar/bireysel"><ArrowLeft className="mr-2 h-4 w-4" /> Kuruluma Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );

    if (gameState === 'finished') {
        const winner = sortedCompetitors[0];
        return (
             <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-yellow-600/10 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
                </div>

                <Card className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative z-10 overflow-hidden">
                     {/* Confetti Effect (Static representation) */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />

                    <CardHeader className="text-center pb-2">
                        <CardTitle className="font-black text-4xl text-white uppercase tracking-wider flex flex-col items-center gap-4">
                             <div className="p-4 bg-yellow-500/20 rounded-full border border-yellow-500/30 shadow-lg shadow-yellow-500/20 animate-bounce">
                                <Trophy className="h-16 w-16 text-yellow-400 drop-shadow-md"/>
                             </div>
                             Yarışma Bitti!
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-lg">Tüm sorular tamamlandı.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-lg text-slate-300 font-medium uppercase tracking-widest">KAZANAN</p>
                            <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">{winner?.name}</p>
                            <div className="px-6 py-2 bg-yellow-500/10 rounded-full border border-yellow-500/30 text-yellow-400 font-bold text-xl">
                                {winner?.score} Puan
                            </div>
                        </div>
                        
                         <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4 max-h-60 overflow-y-auto custom-scrollbar">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Sıralama</h4>
                            <div className="space-y-2">
                                {sortedCompetitors.map((c, i) => (
                                    <div key={c.name} className="flex justify-between items-center p-3 rounded-lg bg-slate-900 border border-white/5 hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "font-black text-lg w-6 text-center",
                                                i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-600"
                                            )}>{i + 1}</span>
                                            <span className="font-medium text-white">{c.name}</span>
                                        </div>
                                        <span className="font-bold text-emerald-400">{c.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4 bg-black/20 p-6 border-t border-white/5">
                         <Button onClick={() => window.location.reload()} size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20">
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
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden flex flex-col font-sans selection:bg-cyan-500/30">
            
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-cyan-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto w-full relative z-10 flex-grow flex flex-col">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 border-b border-white/5 pb-6">
                    <div>
                         <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                            <Gamepad2 className="h-8 w-8 text-cyan-400" />
                            Bireysel Yarışma
                        </h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400 font-medium">
                            <span className="flex items-center gap-1"><Target className="h-4 w-4 text-emerald-400"/> {answeredQuestions.length} / {questions.length} Soru</span>
                            <span className="w-px h-4 bg-white/10"/>
                            <span className="flex items-center gap-1"><Timer className="h-4 w-4 text-orange-400"/> {questionTimer > 0 ? `${questionTimer}sn` : 'Süresiz'}</span>
                        </div>
                    </div>
                    <Button asChild variant="outline" className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 bg-slate-900/50 backdrop-blur-md">
                        <Link href="/student/yarismalar/bireysel"><ArrowLeft className="mr-2 h-4 w-4" /> Çıkış</Link>
                    </Button>
                </div>
                
                {/* Oyuncular Grid (Top) */}
                <div className="mb-8 overflow-x-auto pb-4 custom-scrollbar">
                     <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 min-w-max sm:min-w-0">
                        {sortedCompetitors.map((player) => {
                            const isActive = player.name === competitors[activeCompetitorIndex]?.name;
                            return (
                                <div key={player.name} className="w-48 sm:w-auto">
                                    <TeamScoreCard 
                                        competitor={player}
                                        isActive={isActive}
                                        colorClass="" // Handled inside component
                                        rank={player.rank}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
                
                {/* Soru Izgarası */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl flex-grow flex flex-col overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl text-white font-bold flex items-center gap-2">
                                <span className="bg-cyan-500/20 text-cyan-400 p-1.5 rounded-lg border border-cyan-500/30"><Target className="h-5 w-5"/></span>
                                Soru Seçimi
                            </CardTitle>
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 px-3 py-1 text-sm animate-pulse">
                                Sıradaki: {competitors[activeCompetitorIndex]?.name}
                            </Badge>
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
                                                : "bg-cyan-600 hover:bg-cyan-500 border-cyan-800 text-white shadow-lg shadow-cyan-900/20"
                                        )} 
                                        disabled={isAnswered} 
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
                        Soruları sırayla veya rastgele seçebilirsiniz. En çok puanı toplayan kazanır!
                    </CardFooter>
                </Card>
            </div>
            
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={isFullscreen}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={questionTimer}
                    pointsConfig={pointsConfig}
                    penaltyConfig={penaltyConfig}
                />
            )}
        </div>
    );
}

export default function StudentBireyselOyunPage() {
    return <Suspense fallback={<CompetitionLoadingSkeleton />}><CompetitionComponent /></Suspense>
}