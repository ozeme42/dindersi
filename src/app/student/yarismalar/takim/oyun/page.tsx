'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserMinus, ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, Check, Trophy, PartyPopper, Award, Shuffle, Users, Target, Timer } from "lucide-react";
import Link from "next/link";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import type { GetQuizOutput, Question } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QuestionDialog } from "@/components/question-dialog";
import { Badge } from "@/components/ui/badge";

type GameQuestion = GetQuizOutput['questions'][0];
type Team = { id: number; name: string; players: string[]; score: number };

function CompetitionLoadingSkeleton() {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
      </div>
    );
}

const TeamScoreCard = ({ team, isActive, colorIndex, rank }: { team: Team, isActive: boolean, colorIndex: number, rank: number }) => {
     // Cyber colors mapping based on rank/index
    const teamColors = [
        "from-red-500 to-rose-600 border-red-500 shadow-red-500/20", 
        "from-blue-500 to-cyan-600 border-blue-500 shadow-blue-500/20",   
        "from-green-500 to-emerald-600 border-green-500 shadow-green-500/20",    
        "from-yellow-500 to-amber-600 border-yellow-500 shadow-yellow-500/20",   
        "from-purple-500 to-pink-600 border-purple-500 shadow-purple-500/20",
    ];

    const currentColor = teamColors[colorIndex % teamColors.length];

    return (
        <Card 
            className={cn(
                'relative group cursor-pointer transition-all duration-300 transform overflow-hidden bg-slate-900 border-2',
                isActive ? `scale-105 shadow-2xl ring-4 ring-white/20 border-white z-10` : `hover:scale-105 border-white/10 hover:border-white/30`,
            )}
        >
             {/* Background Gradient */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10", currentColor)} />
            
            {isActive && (
                <div className="absolute top-0 right-0 p-1 bg-white text-black text-[10px] font-bold rounded-bl-lg animate-pulse">
                    SIRADAKİ
                </div>
            )}

            <CardHeader className="pb-2 relative z-10 flex flex-row items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-10 w-10 flex items-center justify-center rounded-full border-2 text-lg font-black bg-slate-950 shadow-lg",
                        rank === 0 ? "text-yellow-400 border-yellow-400" : 
                        rank === 1 ? "text-slate-300 border-slate-300" : 
                        rank === 2 ? "text-orange-400 border-orange-400" : "text-white border-white/20"
                    )}>
                        {rank === 0 && <Crown className="h-5 w-5" />}
                        {rank === 1 && <Award className="h-5 w-5" />}
                        {rank === 2 && <Award className="h-5 w-5" />}
                        {rank > 2 && <span>#{rank + 1}</span>}
                    </div>
                    <CardTitle className="text-white text-lg font-bold truncate">{team.name}</CardTitle>
                 </div>
                 <span className={cn("text-3xl font-black tabular-nums tracking-tight", isActive ? "text-white scale-110" : "text-white/80")}>
                    {team.score}
                </span>
            </CardHeader>

            <CardContent className="relative z-10 pt-2">
                <div className="flex flex-wrap gap-1.5">
                    {team.players.map(p => (
                        <Badge key={p} variant="secondary" className="bg-slate-800 text-slate-300 border-white/10 text-xs">
                            {p}
                        </Badge>
                    ))}
                    {team.players.length === 0 && <span className="text-xs text-slate-500 italic">Oyuncu yok</span>}
                </div>
            </CardContent>
        </Card>
    );
};


function TeamCompetitionComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const questionTimer = parseInt(searchParams.get('questionTimer') || '0');

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
    const pointsConfig = useMemo(() => {
        const param = searchParams.get('points');
        try {
            return param ? JSON.parse(param) : { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }};
        } catch {
            return { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }};
        }
    }, [searchParams]);

    const penaltyConfig = useMemo(() => {
        const param = searchParams.get('penalty');
        try {
            return param ? JSON.parse(param) : { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }};
        } catch {
            return { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }};
        }
    }, [searchParams]);
    
    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [winner, setWinner] = useState<Team | 'draw' | null>(null);
    
    useEffect(() => {
        const teamsParam = searchParams.get('teams');
        if (!teamsParam) {
            setError("Takım bilgileri bulunamadı.");
            setIsLoading(false);
            return;
        }
        const teamsFromUrl = JSON.parse(teamsParam).map((t: any) => ({ ...t, score: 0 }));
        setTeams(teamsFromUrl);
        setActiveTeamId(teamsFromUrl[0]?.id || null);

        const fetchQuestions = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: parseInt(searchParams.get('questionCount') || '40'),
                difficulty: ['Kolay', 'Orta', 'Zor'],
                questionTypes: ['mcq', 'tf', 'fitb'],
            };
            const result = await getQuestionsFromBank(params as any);
            if ('error' in result) setError(result.error);
            else if (result.questions) setQuestions(result.questions);
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams]);
    
    const handleAnswerQuestion = (qNum: number, isCorrect: boolean, scoreChange: number) => {
        if (!activeTeamId) return;
        
        setTeams(prev => prev.map(t => t.id === activeTeamId ? { ...t, score: Math.max(0, t.score + scoreChange) } : t));
        setAnsweredQuestions(prev => [...prev, qNum]);
        setOpenedQuestion(null);
        
        const currentTeamIndex = teams.findIndex(t => t.id === activeTeamId);
        const nextTeamIndex = (currentTeamIndex + 1) % teams.length;
        setActiveTeamId(teams[nextTeamIndex]?.id);
    };

    useEffect(() => {
        if (questions.length > 0 && answeredQuestions.length === questions.length) {
            setGameState('finished');
            const sorted = [...teams].sort((a,b) => b.score - a.score);
            if (sorted.length > 0 && sorted[0].score > (sorted[1]?.score ?? -1)) {
                setWinner(sorted[0]);
            } else {
                setWinner('draw');
            }
        }
    }, [answeredQuestions, questions, teams]);
    
    const handleSelectRandomQuestion = () => {
        const unanswered = questions.map((_, i) => i + 1).filter(qNum => !answeredQuestions.includes(qNum));
        if (unanswered.length === 0) return;
        const randomQNum = unanswered[Math.floor(Math.random() * unanswered.length)];
        setOpenedQuestion({ number: randomQNum, question: questions[randomQNum - 1] });
    };
    
    const sortedTeams = useMemo(() => {
        const finalSorted = [...teams].sort((a, b) => b.score - a.score);
        return finalSorted.map((c, i) => ({...c, rank: i}));
    }, [teams]);


    if (isLoading) return <CompetitionLoadingSkeleton />;
    if (error) return (
        <div className="flex h-screen items-center justify-center bg-slate-950 p-4">
            <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-500/50 text-red-200">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <AlertTitle className="text-white">Hata!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                 <div className="mt-4">
                    <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10">
                        <Link href="/student/yarismalar/takim"><ArrowLeft className="mr-2 h-4 w-4" /> Kuruluma Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );

    if (gameState === 'finished') {
        const winner = sortedTeams[0];
        return (
             <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-600/10 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
                </div>

                <Card className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative z-10 overflow-hidden">
                     {/* Confetti Effect (Static representation) */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500" />

                    <CardHeader className="text-center pb-2">
                        <CardTitle className="font-black text-4xl text-white uppercase tracking-wider flex flex-col items-center gap-4">
                             <div className="p-4 bg-purple-500/20 rounded-full border border-purple-500/30 shadow-lg shadow-purple-500/20 animate-bounce">
                                <Trophy className="h-16 w-16 text-purple-400 drop-shadow-md"/>
                             </div>
                             Yarışma Bitti!
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-lg">Tüm sorular tamamlandı.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                         <div className="flex flex-col items-center gap-2">
                            {winner === 'draw' ? (
                                <p className="text-3xl font-black text-slate-300">BERABERE!</p>
                            ) : (
                                <>
                                    <p className="text-lg text-slate-300 font-medium uppercase tracking-widest">KAZANAN TAKIM</p>
                                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">{winner?.name}</p>
                                    <div className="px-6 py-2 bg-purple-500/10 rounded-full border border-purple-500/30 text-purple-400 font-bold text-xl">
                                        {winner?.score} Puan
                                    </div>
                                </>
                            )}
                        </div>
                        
                         <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4 max-h-60 overflow-y-auto custom-scrollbar">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Sıralama</h4>
                            <div className="space-y-2">
                                {sortedTeams.map((t, i) => (
                                    <div key={t.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-900 border border-white/5 hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "font-black text-lg w-6 text-center",
                                                i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-600"
                                            )}>{i + 1}</span>
                                            <span className="font-medium text-white">{t.name}</span>
                                        </div>
                                        <span className="font-bold text-emerald-400">{t.score}</span>
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
                             <Link href="/student/yarismalar/takim"><Home className="mr-2 h-5 w-5" /> Ana Menü</Link>
                         </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
         <div className={cn("min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden flex flex-col font-sans selection:bg-purple-500/30", isFullscreen ? "h-screen" : "")}>
            
             {/* Arka Plan */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto w-full relative z-10 flex-grow flex flex-col">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 border-b border-white/5 pb-6">
                    <div>
                         <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                            <Users className="h-8 w-8 text-purple-400" />
                            Takım Savaşı
                        </h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400 font-medium">
                            <span className="flex items-center gap-1"><Target className="h-4 w-4 text-emerald-400"/> {answeredQuestions.length} / {questions.length} Soru</span>
                            <span className="w-px h-4 bg-white/10"/>
                            <span className="flex items-center gap-1"><Timer className="h-4 w-4 text-orange-400"/> {questionTimer > 0 ? `${questionTimer}sn` : 'Süresiz'}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* FullscreenToggle bileşeni olmadığı için manuel eklendi */}
                        <Button variant="outline" size="icon" onClick={() => !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen()} className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 bg-slate-900/50 backdrop-blur-md">
                            {isFullscreen ? <ArrowLeft className="h-4 w-4"/> : <ArrowLeft className="h-4 w-4 rotate-180"/>} {/* İkon placeholder */}
                        </Button>
                        <Button asChild variant="outline" className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 bg-slate-900/50 backdrop-blur-md">
                            <Link href="/student/yarismalar/takim"><ArrowLeft className="mr-2 h-4 w-4" /> Çıkış</Link>
                        </Button>
                    </div>
                </div>
                
                {/* Takımlar Grid */}
                <div className="mb-8 overflow-x-auto pb-4 custom-scrollbar">
                     <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 min-w-max sm:min-w-0">
                        {sortedTeams.map((team) => {
                            const isActive = team.id === activeTeamId;
                            return (
                                <div key={team.id} className="w-64 sm:w-auto">
                                    <TeamScoreCard 
                                        team={team}
                                        isActive={isActive}
                                        colorIndex={team.id} // Just a stable number for color gen
                                        rank={team.rank}
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
                                <span className="bg-purple-500/20 text-purple-400 p-1.5 rounded-lg border border-purple-500/30"><Target className="h-5 w-5"/></span>
                                Soru Seçimi
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={!activeTeamId} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900">
                                    <Shuffle className="mr-2 h-4 w-4"/> Rastgele
                                </Button>
                                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 px-3 py-1 text-sm animate-pulse">
                                    Sıra: {teams.find(t => t.id === activeTeamId)?.name}
                                </Badge>
                            </div>
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
                                                : "bg-purple-600 hover:bg-purple-500 border-purple-800 text-white shadow-lg shadow-purple-900/20"
                                        )} 
                                        disabled={isAnswered || !activeTeamId} 
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
                        Soruları sırayla veya rastgele seçebilirsiniz. En çok puanı toplayan takım kazanır!
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

export default function StudentTakimOyunPage() {
    return <Suspense fallback={<CompetitionLoadingSkeleton />}><TeamCompetitionComponent /></Suspense>
}