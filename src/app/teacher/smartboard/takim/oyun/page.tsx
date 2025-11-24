
"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, AlertTriangle, Loader2, Check, Repeat, UserCheck, Award, PartyPopper, Shuffle, Crown, Home, Trophy, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getQuestionsFromBank, type GetQuizOutput } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { playSound, stopSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { QuestionDialog } from "@/components/question-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateMultipleStudentScores } from '@/app/teacher/smartboard/actions';
import type { UserProfile, GetQuizInput, GetQuizOutput, Question } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, getDoc } from 'firebase/firestore';


const CompetitionLoadingSkeleton = () => (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-64 bg-muted rounded-md animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
        </div>
        <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
            <div className="h-24 w-72 bg-muted rounded-lg animate-pulse" />
            <div className="h-24 w-72 bg-muted rounded-lg animate-pulse" />
        </div>
        <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="h-6 w-32 bg-muted rounded-md animate-pulse" />
                <div className="h-10 w-24 bg-muted rounded-md animate-pulse" />
            </div>
            <div className="h-4 w-full bg-muted rounded-full animate-pulse mb-8" />
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-muted rounded-md animate-pulse" />
                ))}
            </div>
        </Card>
    </div>
);


type GameQuestion = GetQuizOutput['questions'][0];
type TeamStudent = { uid: string; displayName: string; avatar?: string };
type Team = { id: number; name: string; students: TeamStudent[]; score: number };
type TeamForUrl = { id: number; name: string; playerUids: string[] };

const TeamScoreCard = ({ team, isActive, colorIndex, rank, isFullscreen, activePlayer }: { 
    team: Team, 
    isActive: boolean, 
    colorIndex: number, 
    rank: number, 
    isFullscreen: boolean,
    activePlayer?: TeamStudent | null
}) => {
    const colorClasses = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
    const ringClasses = ['ring-chart-1', 'ring-chart-2', 'ring-chart-3', 'ring-chart-4', 'ring-chart-5'];
    const bgColor = colorClasses[colorIndex % colorClasses.length];
    const ringColor = ringClasses[colorIndex % ringClasses.length];
    
    return (
        <div className={cn(
            "rounded-lg text-white p-4 transition-all duration-300 shadow-xl flex flex-col",
            bgColor,
            isActive ? `ring-4 ${ringColor} scale-105` : "scale-100",
            isFullscreen ? "w-96" : "w-72"
        )}>
            <div className="flex justify-between items-start">
                <h3 className={cn("font-headline font-bold flex items-center gap-2", isFullscreen ? "text-4xl" : "text-2xl")}>
                    <Users /> {team.name}
                </h3>
                {rank === 0 && <Crown className={cn("text-yellow-300", isFullscreen ? "h-10 w-10" : "h-7 w-7")} />}
            </div>
            <div className={cn("font-bold text-center my-4", isFullscreen ? "text-8xl" : "text-6xl")}>
                {team.score}
            </div>
            <div className="mt-auto text-center h-10 flex items-center justify-center">
                {isActive && activePlayer ? (
                    <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
                        <UserAvatar user={activePlayer} className="w-8 h-8"/>
                        <span className="font-semibold text-lg">{activePlayer.displayName}</span>
                    </div>
                ) : (
                    <div className="h-10"/> // Placeholder to keep height consistent
                )}
            </div>
        </div>
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
  
  const pointsConfig = useMemo(() => {
    const param = searchParams.get('points');
    try {
        return param ? JSON.parse(param) : { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }};
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
  const [teamPlayerIndex, setTeamPlayerIndex] = useState<Record<number, number>>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: Question } | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
  const [winner, setWinner] = useState<Team | 'draw' | null>(null);
  
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
                students: tUrl.playerUids.map(uid => studentsMap.get(uid)).filter(Boolean) as UserProfile[],
            }));

            setTeams(initialTeams);
            setActiveTeamId(initialTeams[0]?.id || null);
            setTeamPlayerIndex(initialTeams.reduce((acc, team) => ({...acc, [team.id]: 0}), {}));

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
  
  const handleSaveScores = async (andFinish: boolean = false) => {
    const inGameCompetitors = teams.flatMap(t => t.students);
    if (scoresHaveBeenSaved || inGameCompetitors.length === 0) {
        if (andFinish && gameState !== 'finished') setGameState('finished');
        return;
    }

    setIsSubmittingScores(true);
    
    const scoreUpdates = inGameCompetitors.map(c => {
        const team = teams.find(t => t.students.some(s => s.uid === c.uid));
        return { 
            userId: c.uid, 
            points: team ? Math.round(team.score / team.students.length) : 0, // Distribute team score to members
            gameType: 'smartboard_takim' as const,
            context: `${searchParams.get('courseName') || 'Genel'} - ${searchParams.get('topicName') || 'Genel'}`
        }
    }).filter(update => update.points > 0);

    if (scoreUpdates.length === 0) {
         toast({ title: "Skor Yok", description: "Kaydedilecek puan bulunmuyor." + (andFinish ? " Yarışma sonlandırılıyor." : "") });
    } else {
        const result = await updateMultipleStudentScores(scoreUpdates);
        if (result.success) {
            toast({ title: "Skorlar Kaydedildi", description: "Takım skorları öğrenci profillerine eklendi." });
            setScoresHaveBeenSaved(true);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
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
  };


  useEffect(() => {
    if (gameState !== 'playing' || !questions.length || answeredQuestions.length === 0) return;
    if (answeredQuestions.length === questions.length) {
        setGameState('finished');
        const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
        if (sortedTeams.length > 0 && sortedTeams[0].score > (sortedTeams[1]?.score ?? -Infinity)) {
             setWinner(sortedTeams[0]);
        } else {
            setWinner('draw');
        }
    }
  }, [gameState, teams, answeredQuestions.length, questions.length]);

  const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
      if (!activeTeamId || gameState !== 'playing') return;
      const finishScore = parseInt(searchParams.get('finishScore') || '0');
      
      let winnerFound: Team | null = null;
      
      const updatedTeams = teams.map(t => {
          if (t.id === activeTeamId) {
              const newScore = Math.max(0, t.score + scoreChange);
              const updatedTeam = { ...t, score: newScore };
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
        const currentTeam = teams.find(t => t.id === activeTeamId);
        if(currentTeam && currentTeam.students.length > 0) {
            setTeamPlayerIndex(prev => ({
                ...prev,
                [activeTeamId]: (prev[activeTeamId] + 1) % currentTeam.students.length
            }));
        }

        const currentTeamIndex = teams.findIndex(t => t.id === activeTeamId);
        if (currentTeamIndex === -1) return; // Should not happen
        const nextTeamIndex = (currentTeamIndex + 1) % teams.length;
        setActiveTeamId(teams[nextTeamIndex]?.id);
      }
  };

  const handleSelectRandomQuestion = () => {
    if (!activeTeamId) {
        toast({ title: 'Hata', description: 'Lütfen bir takım seçin!', variant: 'destructive'});
        return;
    }
    const unansweredIndices = questions
        .map((_, i) => i)
        .filter(i => !answeredQuestions.includes(i + 1));
    
    if (unansweredIndices.length === 0) {
        toast({ title: 'Tüm sorular cevaplandı!', variant: 'default'});
        return;
    }

    const randomIndex =
        unansweredIndices[Math.floor(Math.random() * unansweredIndices.length)];
    const questionNumber = randomIndex + 1;
    const question = questions[randomIndex];
    setOpenedQuestion({ number: questionNumber, question });
  };

  const startNewGame = () => window.location.reload();
  
  const sortedTeams = useMemo(() => [...teams].sort((a,b) => b.score - a.score), [teams]);
  
  const activeTeam = useMemo(() => teams.find(t => t.id === activeTeamId), [teams, activeTeamId]);
  const activePlayer = useMemo(() => {
    if (!activeTeam || !teamPlayerIndex) return null;
    return activeTeam.students[teamPlayerIndex[activeTeam.id]];
  }, [activeTeam, teamPlayerIndex]);

  if (isLoading) return <CompetitionLoadingSkeleton />;
  if (error) return (
    <div className="w-full h-full min-h-screen p-4 flex items-center justify-center bg-gradient-to-br from-indigo-300 via-purple-400 to-pink-500 dark:from-indigo-800 dark:via-purple-900 dark:to-pink-950">
        <Alert variant="destructive" className="max-w-lg bg-card/70 backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4" /> <AlertTitle>Hata!</AlertTitle> <AlertDescription>{error}</AlertDescription>
          <div className="mt-4"><Button asChild variant="outline"><Link href="/teacher/smartboard/takim"><ArrowLeft className="mr-2 h-4 w-4"/> Kuruluma Geri Dön</Link></Button></div>
        </Alert>
    </div>
  );

  if (gameState === 'finished') {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-xl text-center">
            <CardHeader><CardTitle className="font-headline text-3xl">Yarışma Bitti!</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                {winner === 'draw' ? <><Award className="h-24 w-24 text-muted-foreground"/><p className="text-2xl font-bold">Berabere!</p></>
                : winner ? <><Users className="h-24 w-24 text-amber-400"/><p className="text-2xl font-bold">Kazanan: {winner.name}</p><p className="text-xl text-muted-foreground">Skor: {winner.score}</p></>
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
    );
  }

  return (
    <div className={cn("p-4 sm:p-6 md:p-8", isFullscreen ? "h-screen w-screen m-0 flex flex-col" : "container mx-auto")}>
        <div className={cn("flex justify-between items-center mb-6", isFullscreen && "flex-shrink-0")}>
            <h1 className="text-3xl font-bold font-headline">Takım Yarışması</h1>
            <div className="flex items-center gap-2">
                <FullscreenToggle />
                <Button asChild variant="outline"><Link href="/teacher/smartboard/takim"><ArrowLeft className="mr-2 h-4 w-4" /> Kurulumu Değiştir</Link></Button>
            </div>
        </div>

        <Tabs defaultValue="leaderboard" value={currentView} onValueChange={(value) => setCurrentView(value as 'leaderboard' | 'questions')} className={cn("h-full", isFullscreen ? "flex-grow flex flex-col" : "")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leaderboard">Liderlik Tablosu</TabsTrigger>
            <TabsTrigger value="questions">Sorular</TabsTrigger>
          </TabsList>
          <TabsContent value="leaderboard" className={cn("mt-6", isFullscreen ? "flex-grow flex flex-col overflow-hidden" : "")}>
                 <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", isFullscreen && "lg:grid-cols-4")}>
                    {sortedTeams.map((team, index) => <TeamScoreCard key={team.id} team={team} isActive={team.id === activeTeamId} colorIndex={index} rank={index} isFullscreen={isFullscreen} activePlayer={team.id === activeTeamId ? activePlayer : null} />)}
                </div>
                <div className="pt-6 mt-auto">
                {teams.length > 0 && (
                        activeTeamId !== null ? (
                            <Button size="lg" className="w-full" onClick={() => setCurrentView('questions')}>
                                <BrainCircuit className="mr-2 h-5 w-5"/>
                                Sıradaki Yarışmacı ({activePlayer?.displayName}) İçin Soru Seç
                            </Button>
                        ) : (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Devam Etmek İçin Bir Takım Seçin</AlertTitle>
                                <AlertDescription>
                                  Liderlik tablosundan sıradaki takımı seçerek devam edin.
                                </AlertDescription>
                            </Alert>
                        )
                )}
                </div>
          </TabsContent>
          <TabsContent value="questions" className={cn("mt-6", isFullscreen ? "flex-grow flex flex-col" : "")}>
             <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "flex-grow flex flex-col")}>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={!activeTeamId}>
                                <Shuffle className="mr-2 h-4 w-4" /> Rastgele Seç
                            </Button>
                        </div>
                    </CardTitle>
                    <CardDescription>Sıradaki: {activeTeam?.name} - {activePlayer?.displayName}</CardDescription>
                </CardHeader>
                <CardContent className={cn("grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2", isFullscreen && "grid-cols-8 flex-grow gap-4")}>
                    {questions.map((q, i) => {
                         const questionNumber = i + 1;
                         const isQuestionAnswered = answeredQuestions.includes(questionNumber);
                         return (
                            <Button
                                key={i}
                                className={cn(
                                    "aspect-square h-auto w-auto font-bold transition-transform hover:scale-105",
                                    isFullscreen ? "text-xl" : "text-base",
                                    isQuestionAnswered 
                                        ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed" 
                                        : colorClasses[i % colorClasses.length]
                                )}
                                disabled={isQuestionAnswered || !activeTeamId}
                                onClick={() => !isQuestionAnswered && setOpenedQuestion({ number: questionNumber, question: q })}
                                title={!activeTeamId ? "Soruyu açmak için bir takım seçin" : `Soru ${questionNumber}`}
                            >
                                {isQuestionAnswered ? <Check className="h-6 w-6 text-green-500" /> : questionNumber}
                            </Button>
                        )
                    })}
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {openedQuestion && <QuestionDialog 
            isOpen={!!openedQuestion} 
            onClose={() => setOpenedQuestion(null)} 
            questionData={openedQuestion} 
            onAnswer={handleAnswerQuestion}
            timerDuration={questionTimer}
            pointsConfig={pointsConfig}
            penaltyConfig={penaltyConfig}
            isFullscreen={isFullscreen}
        />}
    </div>
  )
}


export default function SmartboardTakimOyunPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
        <CompetitionComponent />
    </Suspense>
  )
}
