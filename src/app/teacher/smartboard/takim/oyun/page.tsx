
"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Users, AlertTriangle, Loader2, Check, Repeat, UserCheck, Award, PartyPopper, Shuffle, Crown, Home } from "lucide-react";
import Link from "next/link";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { getQuestionsFromBank, type GetQuizOutput } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { UserProfile, Question } from "@/lib/types";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { updateMultipleStudentScores } from '@/app/teacher/smartboard/actions';
import { QuestionDialog } from "@/components/question-dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type GameQuestion = GetQuizOutput['questions'][0];
type Player = { uid: string; displayName: string; isGuest: boolean; avatar?: string };
type Team = { id: number; name: string; players: Player[]; score: number; activePlayerIndex: number; };
type TeamForUrl = { id: number; name: string; playerUids: string[] };

function CompetitionLoadingSkeleton() {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
            <Skeleton className="h-24 w-72" />
            <Skeleton className="h-24 w-72" />
        </div>
        <div className="aspect-video w-full max-w-4xl mx-auto grid gap-1 bg-gray-300 dark:bg-gray-700 p-1">
            {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-full" />
            ))}
        </div>
      </div>
    );
}

const TeamScoreCard = ({ team, isActive, colorClass, rank, isFullscreen, nextPlayerName }: { team: Team, isActive: boolean, colorClass: string, rank: number, isFullscreen: boolean, nextPlayerName?: string }) => {
    return (
        <Card 
            className={cn(
                'relative group transition-all text-white border-transparent shadow-lg flex flex-col',
                colorClass,
                isActive && `ring-4 ring-offset-background ring-offset-2 ring-white/80 scale-105`,
                isFullscreen ? "w-96" : "w-72"
            )}
        >
            <CardHeader className="pb-2">
                <CardTitle className="font-headline font-bold flex items-center gap-2 text-2xl">
                    <Users /> {team.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-grow flex flex-col items-center justify-center text-center gap-3">
                <div className="text-8xl font-bold">{team.score}</div>
                {isActive && nextPlayerName && (
                    <Badge variant="secondary" className="text-base font-semibold">
                       Sıradaki: {nextPlayerName}
                    </Badge>
                )}
            </CardContent>
            <CardFooter className="p-2 justify-center">
                {rank === 0 && <Crown className="h-8 w-8 text-yellow-300"/>}
                {rank === 1 && <Award className="h-8 w-8 text-gray-300"/>}
                {rank === 2 && <Award className="h-8 w-8 text-orange-400"/>}
            </CardFooter>
        </Card>
    );
};


function CompetitionComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSubmittingScores, setIsSubmittingScores] = useState(false);
    const [scoresHaveBeenSaved, setScoresHaveBeenSaved] = useState(false);
    
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
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

    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [winner, setWinner] = useState<Team | 'draw' | null>(null);

    const colorClasses = [
        "bg-chart-1 text-primary-foreground hover:bg-chart-1/90",
        "bg-chart-2 text-primary-foreground hover:bg-chart-2/90",
        "bg-chart-3 text-primary-foreground hover:bg-chart-3/90",
        "bg-chart-4 text-primary-foreground hover:bg-chart-4/90",
        "bg-chart-5 text-primary-foreground hover:bg-chart-5/90",
        "bg-accent text-accent-foreground hover:bg-accent/90",
    ];

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        try {
            const teamsParam = searchParams.get('teams');
            if (!teamsParam) {
                setError("Takım bilgileri bulunamadı.");
                return;
            }
            
            const teamsFromUrl: TeamForUrl[] = JSON.parse(teamsParam);
            const studentUids = teamsFromUrl.flatMap(t => t.playerUids);
            
            const studentDocs = studentUids.length > 0 ? await Promise.all(studentUids.map(id => getDoc(doc(db, "users", id)))) : [];
            const studentsMap = new Map(studentDocs.map(docSnap => [docSnap.id, { uid: docSnap.id, ...docSnap.data() } as UserProfile]));

            const initialTeams: Team[] = teamsFromUrl.map(tUrl => ({
                id: tUrl.id,
                name: tUrl.name,
                score: 0,
                students: tUrl.playerUids.map(uid => studentsMap.get(uid)).filter(Boolean) as Player[],
                activePlayerIndex: 0, // Initialize active player index
            }));

            setTeams(initialTeams);
            setActiveTeamId(initialTeams[0]?.id || null);

            const params: GetQuizInput = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: parseInt(searchParams.get('questionCount') || '40'),
                difficulty: ['Kolay', 'Orta', 'Zor'],
                questionTypes: ['mcq', 'tf', 'fitb'],
            };
            const result = await getQuestionsFromBank(params as any);
            if ('error' in result) setError(result.error);
            else if (result.questions) setQuestions(result.questions as GameQuestion[]);
            else setError("Uygun soru bulunamadı.");
        } catch (e: any) {
            setError("Oyun verileri yüklenirken bir hata oluştu: " + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);
  
    const handleSaveScores = useCallback(async (andFinish: boolean = false) => {
        const allCompetitors = teams.flatMap(t => t.students);
        if (scoresHaveBeenSaved || allCompetitors.length === 0) {
            if (andFinish && gameState !== 'finished') setGameState('finished');
            return;
        }

        setIsSubmittingScores(true);
        
        const scoreUpdates = allCompetitors.map(c => {
            const team = teams.find(t => t.students.some(s => s.uid === c.uid));
            return { 
                userId: c.uid, 
                points: team ? Math.round(team.score / team.students.length) : 0,
                gameType: 'smartboard_takim' as const,
                context: `${searchParams.get('courseName') || 'Genel'} - ${searchParams.get('topicName') || 'Genel'}`
            }
        }).filter(update => update.points > 0);

        if (scoreUpdates.length === 0) {
             toast({ title: "Skor Yok", description: "Kaydedilecek puan bulunmuyor." + (andFinish ? " Yarışma sonlandırılıyor." : "") });
        } else {
            const result = await updateMultipleStudentScores(scoreUpdates);
            if (result.success) {
                toast({ title: "Skorlar Kaydedildi", description: "Takım skorları oyuncu profillerine eklendi." });
                setScoresHaveBeenSaved(true);
            } else {
                toast({ title: "Hata", description: result.error, variant: "destructive" });
                setIsSubmittingScores(false);
                return;
            }
        }
        
        if (andFinish) {
            const finalSorted = [...teams].sort((a,b) => b.score - a.score);
            if (finalSorted.length > 0) {
                setWinner(finalSorted[0]);
            }
            setGameState('finished');
        }
        setIsSubmittingScores(false);
    }, [scoresHaveBeenSaved, searchParams, toast, gameState, teams]);


    useEffect(() => {
        if (gameState === 'playing' && questions.length > 0 && answeredQuestions.length === questions.length) {
            handleSaveScores(true);
        }
    }, [gameState, answeredQuestions.length, questions.length, handleSaveScores]);
    
    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        if (!activeTeamId || gameState !== 'finished') return;
        const finishScore = parseInt(searchParams.get('finishScore') || '0');
        
        let winnerFound: Team | null = null;
        
        const updatedTeams = teams.map(t => {
            if (t.id === activeTeamId) {
                const newScore = Math.max(0, t.score + scoreChange);
                const updatedTeam = { 
                    ...t, 
                    score: newScore,
                    activePlayerIndex: (t.activePlayerIndex + 1) % t.players.length // Move to next player in team
                };
                if (finishScore > 0 && newScore >= finishScore) {
                    winnerFound = updatedTeam;
                }
                return updatedTeam;
            }
            return t;
        });

        setTeams(updatedTeams);
        setAnsweredQuestions([...answeredQuestions, questionNumber]);
        setOpenedQuestion(null);
        
        if (winnerFound) {
            setWinner(winnerFound);
            setGameState('finished');
        } else {
          const currentTeamIndex = teams.findIndex(t => t.id === activeTeamId);
          if (currentTeamIndex === -1) return;
          const nextTeamIndex = (currentTeamIndex + 1) % teams.length;
          setActiveTeamId(teams[nextTeamIndex]?.id);
        }
    };
    
    const handleSelectRandomQuestion = () => {
        if (!activeTeamId) {
            toast({ title: 'Hata', description: 'Lütfen bir takım seçin!', variant: 'destructive'});
            return;
        }
        const unanswered = questions.map((_, i) => i + 1).filter(qNum => !answeredQuestions.includes(qNum));
        if (unanswered.length === 0) {
            toast({ title: 'Tüm sorular cevaplandı!', variant: 'default'});
            return;
        }
        const randomQNum = unanswered[Math.floor(Math.random() * unanswered.length)];
        setOpenedQuestion({ number: randomQNum, question: questions[randomQNum - 1] });
    };

    const startNewGame = () => window.location.reload();

    const sortedTeams = useMemo(() => [...teams].sort((a,b) => b.score - a.score), [teams]);

    if (isLoading) {
        return <CompetitionLoadingSkeleton />;
    }
    
    if (error) {
        return (
            <div className="container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[calc(100vh-theme(height.16))]">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/teacher/smartboard/takim"><ArrowLeft className="mr-2 h-4 w-4" /> Kuruluma Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }
    
     if (gameState === 'finished') {
        return (
            <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Yarışma Bitti!</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        {winner === 'draw' ? <><Award className="h-24 w-24 text-muted-foreground"/><p className="text-2xl font-bold">Berabere!</p></>
                        : winner ? <><Award className="h-24 w-24 text-amber-400"/><p className="text-2xl font-bold">Kazanan: {winner.name}</p><p className="text-xl text-muted-foreground">Skor: {winner.score}</p></>
                        : <p>Sonuçlar hesaplanıyor...</p> }

                        <div className="w-full mt-4 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sıra</TableHead>
                                        <TableHead>Takım</TableHead>
                                        <TableHead className="text-right">Puan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedTeams.map((team, index) => (
                                        <TableRow key={team.id}>
                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                            <TableCell>{team.name}</TableCell>
                                            <TableCell className="text-right font-bold">{team.score}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4">
                       <Button onClick={() => handleSaveScores(false)} disabled={isSubmittingScores || scoresHaveBeenSaved}>
                          {isSubmittingScores ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : scoresHaveBeenSaved ? <Check className="mr-2 h-4 w-4"/> : <PartyPopper className="mr-2 h-4 w-4" />}
                          {scoresHaveBeenSaved ? 'Puanlar Kaydedildi' : 'Puanları Kaydet'}
                      </Button>
                      <Button size="lg" onClick={startNewGame} variant="secondary"><Repeat className="mr-2 h-5 w-5"/> Tekrar Oyna</Button>
                      <Button asChild variant="outline"><Link href="/teacher/smartboard"><Home className="mr-2 h-5 w-5"/> Ana Menü</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const activeTeam = teams.find(t => t.id === activeTeamId);
    const nextPlayerName = activeTeam && activeTeam.players.length > 0 ? activeTeam.players[activeTeam.activePlayerIndex]?.displayName : undefined;

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-headline">Takım Yarışması</h1>
                <div className="flex items-center gap-2">
                    <FullscreenToggle />
                    <Button asChild variant="outline"><Link href="/teacher/smartboard/takim"><ArrowLeft className="mr-2 h-4 w-4" /> Kurulumu Değiştir</Link></Button>
                </div>
            </div>
            <div className="space-y-8">
                <div className="flex flex-wrap justify-center items-center gap-6 mb-8">
                    {teams.map((team, index) => (
                         <TeamScoreCard 
                            key={team.id} 
                            team={team} 
                            isActive={team.id === activeTeamId} 
                            colorClass={colorClasses[index % colorClasses.length]} 
                            rank={sortedTeams.findIndex(t => t.id === team.id)} 
                            isFullscreen={isFullscreen} 
                            nextPlayerName={team.id === activeTeamId ? nextPlayerName : undefined}
                         />
                    ))}
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={!activeTeamId}>
                                    <Shuffle className="mr-2 h-4 w-4" /> Rastgele Seç
                                </Button>
                                {activeTeamId && <Badge variant="secondary">Sıradaki Takım: {teams.find(t=>t.id===activeTeamId)?.name}</Badge>}
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                        {questions.map((q, i) => {
                            const questionNumber = i + 1;
                            const isQuestionAnswered = answeredQuestions.includes(questionNumber);
                            return <Button key={i} className={cn("aspect-square h-auto w-auto text-2xl font-bold", isQuestionAnswered ? "bg-muted text-muted-foreground" : "bg-primary")} disabled={isQuestionAnswered || !activeTeamId} onClick={() => !isQuestionAnswered && setOpenedQuestion({ number: questionNumber, question: q as Question })}>
                                {isQuestionAnswered ? <Check/> : questionNumber}
                            </Button>
                        })}
                    </CardContent>
                </Card>
            </div>
            {openedQuestion && (
                <QuestionDialog
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={questionTimer}
                    pointsConfig={pointsConfig}
                    penaltyConfig={penaltyConfig}
                    isFullscreen={isFullscreen}
                />
            )}
        </div>
    );
}

export default function SmartboardTakimOyunPage() {
  return (
    <Suspense fallback={<CompetitionLoadingSkeleton />}>
        <TeamCompetitionComponent />
    </Suspense>
  )
}

    