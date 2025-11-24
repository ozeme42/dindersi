
"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, AlertTriangle, Loader2, Check, Repeat, UserCheck, Award, PartyPopper, Shuffle, Crown, Home, Trophy } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


type GameQuestion = GetQuizOutput['questions'][0];
type TeamStudent = { uid: string, displayName: string, avatar?: string };
type Team = { id: number; name: string; students: TeamStudent[]; score: number };
type TeamForUrl = { id: number; name: string; playerUids: string[] };

function CompetitionLoadingSkeleton() {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-64 bg-muted rounded-md animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
        </div>
        <Card className="p-6">
             <div className="flex justify-between items-center mb-4">
                <div className="h-6 w-32 bg-muted rounded-md animate-pulse" />
                <div className="h-10 w-24 bg-muted rounded-md animate-pulse" />
            </div>
             <div className="h-4 w-full bg-muted rounded-full animate-pulse mb-8" />
             <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-muted rounded-md animate-pulse" />
                ))}
             </div>
        </Card>
      </div>
    );
}

const TeamScoreCard = ({ team, isActive, colorClass, rank, currentPlayer }: { team: Team, isActive: boolean, colorClass: string, rank: number, currentPlayer: TeamStudent | undefined }) => {
    return (
        <Card 
            className={cn(
                'relative group cursor-pointer transition-all text-white border-transparent shadow-lg',
                colorClass,
                isActive && `ring-4 ring-offset-background ring-offset-2 ring-white/80`
            )}
        >
            <CardHeader className="flex-row justify-between items-start pb-2">
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                    <Users/> {team.name}
                </CardTitle>
                {rank === 0 && <Crown className="h-7 w-7 text-yellow-300" />}
            </CardHeader>
            <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="text-left">
                     <p className="text-xs opacity-80">Sıradaki Oyuncu</p>
                    <p className="font-bold text-lg truncate">{currentPlayer?.displayName || 'Yükleniyor...'}</p>
                </div>
                <div className="text-right">
                    <p className="text-5xl font-bold">{team.score}</p>
                </div>
            </CardContent>
        </Card>
    );
};


function CompetitionComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSubmittingScores, setIsSubmittingScores] = useState(false);
    const [scoresHaveBeenSaved, setScoresHaveBeenSaved] = useState(false);
    const [teamPlayerIndex, setTeamPlayerIndex] = useState<Record<number, number>>({});

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
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
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: Question } | null>(null);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [winner, setWinner] = useState<Team | 'draw' | null>(null);
    const [currentView, setCurrentView] = useState<'leaderboard' | 'questions'>('leaderboard');
    
    const colorClasses = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-accent"];

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
            
            const initialIndexes: Record<number, number> = {};
            initialTeams.forEach(t => initialIndexes[t.id] = 0);
            setTeamPlayerIndex(initialIndexes);


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
            else if (result.questions) setQuestions(result.questions);
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
  }, [scoresHaveBeenSaved, teams, searchParams, toast, gameState]);


  useEffect(() => {
    if (gameState !== 'playing' || !questions.length || answeredQuestions.length === 0) return;
    if (answeredQuestions.length === questions.length) {
        handleSaveScores(true);
    }
  }, [gameState, answeredQuestions, questions, handleSaveScores]);

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
      setCurrentView('leaderboard');

      if (winnerFound) {
          setWinner(winnerFound);
          setGameState('finished');
      } else {
        const currentTeamIndex = teams.findIndex(t => t.id === activeTeamId);
        if (currentTeamIndex === -1) return; // Should not happen
        
        // Move to next player in the current team
        setTeamPlayerIndex(prev => {
            const newIndexes = {...prev};
            const team = teams[currentTeamIndex];
            newIndexes[team.id] = (newIndexes[team.id] + 1) % team.students.length;
            return newIndexes;
        });

        // Move to the next team
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
  
  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
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
            <h1 className="text-3xl font-bold font-headline">Yaz Kursu Takım Yarışması</h1>
            <div className="flex items-center gap-2">
                <Button 
                    variant="destructive" 
                    onClick={() => handleSaveScores(true)} 
                    disabled={isSubmittingScores || scoresHaveBeenSaved || teams.length === 0}
                >
                    {isSubmittingScores ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PartyPopper className="mr-2 h-4 w-4"/>}
                    {scoresHaveBeenSaved ? "Kaydedildi" : "Bitir ve Kaydet"}
                </Button>
                <FullscreenToggle />
                <Button asChild variant="outline">
                    <Link href="/teacher/summer-school/smartboard/takim"><ArrowLeft className="mr-2 h-4 w-4" /> Kurulumu Değiştir</Link>
                </Button>
            </div>
        </div>

        <div className={cn("space-y-8", isFullscreen ? "flex-grow flex flex-col overflow-hidden" : "")}>
            <Tabs defaultValue="leaderboard" value={currentView} onValueChange={(value) => setCurrentView(value as 'leaderboard' | 'questions')} className={cn("h-full", isFullscreen ? "flex-grow flex flex-col" : "")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="leaderboard">Liderlik Tablosu</TabsTrigger>
                <TabsTrigger value="questions">Sorular</TabsTrigger>
              </TabsList>
              <TabsContent value="leaderboard" className={cn("mt-6", isFullscreen && "flex-grow min-h-0")}>
                   <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 xl:grid-cols-4", isFullscreen ? "h-full" : "")}>
                        {sortedTeams.map((team, index) => {
                            const isActive = activeTeamId === team.id;
                            const colorClass = colorClasses[index % colorClasses.length];
                            const playerIndex = teamPlayerIndex[team.id] || 0;
                            const currentPlayer = team.students[playerIndex];
                            return (
                                <TeamScoreCard 
                                    key={team.id}
                                    team={team}
                                    isActive={isActive}
                                    colorClass={colorClass}
                                    rank={index}
                                    currentPlayer={currentPlayer}
                                />
                            )
                        })}
                    </div>
              </TabsContent>
              <TabsContent value="questions" className={cn("mt-6", isFullscreen && "flex-grow flex flex-col")}>
                   <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "flex-grow flex flex-col")}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={!activeTeamId}>
                                        <Shuffle className="mr-2 h-4 w-4" /> Rastgele Seç
                                    </Button>
                                    {activeTeamId && <Badge variant="secondary">Sıra: {teams.find(t=>t.id===activeTeamId)?.name}</Badge>}
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={cn("grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2", isFullscreen && "grid-cols-8 flex-grow gap-4")}>
                            {questions.map((q, i) => {
                                const questionNumber = i + 1;
                                const isQuestionAnswered = answeredQuestions.includes(questionNumber);
                                return <Button key={i} className={cn(
                                    "aspect-square h-auto w-auto font-bold transition-transform hover:scale-105", 
                                    isFullscreen ? "text-xl" : "text-base",
                                    isQuestionAnswered ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed" : colorClasses[i % colorClasses.length]
                                    )}
                                    disabled={isQuestionAnswered || !activeTeamId} onClick={() => !isQuestionAnswered && setOpenedQuestion({ number: questionNumber, question: q })}>
                                    {isQuestionAnswered ? <Check className="h-6 w-6 text-green-500" /> : questionNumber}
                                </Button>
                            })}
                        </CardContent>
                    </Card>
              </TabsContent>
            </Tabs>
        </div>
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
  );
}

export default function SmartboardTakimOyunPage() {
  return (
    <Suspense fallback={<CompetitionLoadingSkeleton />}>
        <TeamCompetitionComponent />
    </Suspense>
  )
}
```