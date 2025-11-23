
"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, AlertTriangle, Loader2, Check, Repeat, Home, Award, PartyPopper, Shuffle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getQuestionsFromBank, type GetQuizOutput } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { playSound, stopSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { QuestionDialog } from "@/components/question-dialog"; // Assuming a shared component

type GameQuestion = GetQuizOutput['questions'][0];
type Team = { id: number; name: string; players: string[]; score: number };

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
  
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
  const [winner, setWinner] = useState<Team | 'draw' | null>(null);
  
  const colorClasses = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-accent"];

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
  
  const handleAnswerQuestion = (qNum: number, isCorrect: boolean) => {
    if (!activeTeamId) return;
    const question = questions[qNum - 1];
    const scoreChange = isCorrect ? (pointsConfig[question.type as keyof typeof pointsConfig]?.[question.difficulty as keyof typeof pointsConfig.mcq] || 10) : 0;
    
    setTeams(prev => prev.map(t => t.id === activeTeamId ? { ...t, score: t.score + scoreChange } : t));
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
  
  const sortedTeams = useMemo(() => [...teams].sort((a,b) => b.score - a.score), [teams]);

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin"/></div>
  if (error) return <div className="text-red-500">{error}</div>

  if (gameState === 'finished') {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md text-center">
            <CardHeader><CardTitle className="font-headline text-3xl">Yarışma Bitti!</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                {winner === 'draw' ? <p>Berabere!</p> : <><Award className="h-24 w-24 text-amber-400"/><p className="text-2xl font-bold">Kazanan: {winner?.name}</p></>}
            </CardContent>
            <CardFooter className="flex-col gap-4">
                <Button size="lg" onClick={() => window.location.reload()}><Repeat className="mr-2 h-5 w-5"/> Tekrar Oyna</Button>
                <Button asChild variant="outline"><Link href="/student/yarismalar"><Home className="mr-2 h-5 w-5"/> Ana Menü</Link></Button>
            </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("p-4 sm:p-6 md:p-8", isFullscreen ? "h-full flex flex-col" : "container mx-auto")}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-headline">Takım Yarışması</h1>
        <div className="flex items-center gap-2">
            <FullscreenToggle />
            <Button asChild variant="outline"><Link href="/student/yarismalar/takim"><ArrowLeft className="mr-2 h-4 w-4"/> Kurulumu Değiştir</Link></Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {sortedTeams.map((team, index) => <TeamScoreCard key={team.id} team={team} isActive={team.id === activeTeamId} colorIndex={index} />)}
      </div>
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center justify-between">
                <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={!activeTeamId}><Shuffle className="mr-2 h-4 w-4"/> Rastgele Seç</Button>
                    {activeTeamId && <Badge variant="secondary">Sıra: {teams.find(t=>t.id===activeTeamId)?.name}</Badge>}
                </div>
            </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {questions.map((q, i) => {
                const qNum = i + 1;
                return <Button key={i} className={cn("aspect-square h-auto w-auto text-2xl font-bold", answeredQuestions.includes(qNum) ? "bg-muted text-muted-foreground" : "bg-primary")} disabled={answeredQuestions.includes(qNum) || !activeTeamId} onClick={() => setOpenedQuestion({ number: qNum, question: q })}>
                    {answeredQuestions.includes(qNum) ? <Check/> : qNum}
                </Button>
            })}
        </CardContent>
      </Card>
      {openedQuestion && <QuestionDialog isOpen={!!openedQuestion} onClose={() => setOpenedQuestion(null)} questionData={openedQuestion} onAnswer={handleAnswerQuestion} timerDuration={questionTimer} pointsConfig={pointsConfig}/>}
    </div>
  )
}

function TeamScoreCard({ team, isActive, colorIndex }: { team: Team, isActive: boolean, colorIndex: number }) {
    const colorClass = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3'][colorIndex % 3];
    return (
        <Card className={cn("transition-all", isActive && "ring-2 ring-primary")}>
            <CardHeader className={cn("pb-2 rounded-t-lg text-primary-foreground", colorClass)}>
                <CardTitle className="flex justify-between items-center"><span className="flex items-center gap-2"><Users/> {team.name}</span><span className="text-3xl font-bold">{team.score}</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-4"><div className="flex flex-wrap gap-2">{team.players.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}</div></CardContent>
        </Card>
    )
}

export default function StudentTakimOyunPage() {
    return <Suspense fallback={<div>Yükleniyor...</div>}><TeamCompetitionComponent /></Suspense>
}
