
"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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


type GameQuestion = GetQuizOutput['questions'][0];
type TeamStudent = { uid: string; displayName: string; avatar?: string };
type Team = { id: number; name: string; students: TeamStudent[]; score: number; rank?: number; activePlayerIndex?: number; };
type TeamForUrl = { id: number; name: string; studentUids: string[] };

const colorClasses = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-accent"];
const hoverBgColors = ['hover:bg-chart-1/90', 'hover:bg-chart-2/90', 'hover:bg-chart-3/90', 'hover:bg-chart-4/90', 'hover:bg-chart-5/90', 'hover:bg-accent/90'];


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

function TeamScoreCard({ team, isActive, colorClass, rank, isFullscreen, activePlayerUid }: { team: Team, isActive: boolean, colorClass: string, rank: number, isFullscreen: boolean, activePlayerUid: string | null }) {
    
    const getInitials = (name?: string): string => {
        if (!name) return '?';
        return name.trim().charAt(0).toLocaleUpperCase('tr-TR');
    };

    const activePlayer = team.students.find(s => s.uid === activePlayerUid);

    return (
        <div className={cn(
            "rounded-lg text-white p-4 transition-all duration-300 shadow-xl flex flex-col",
            colorClass,
            isActive ? `ring-4 ring-white/80 scale-105` : "scale-100",
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
            <div className="flex flex-col items-center justify-center mt-auto min-h-[50px]">
                {isActive && activePlayer ? (
                    <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                         <Avatar className={cn(isFullscreen ? "h-8 w-8 text-sm" : "h-6 w-6 text-xs")}>
                            <AvatarImage src={activePlayer.avatar || ''} data-ai-hint="profile picture" />
                            <AvatarFallback>{getInitials(activePlayer.displayName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-sm">{activePlayer.displayName}</span>
                    </div>
                ): <div className="h-9"/> }
            </div>
        </div>
    );
}

function CompetitionComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSubmittingScores, setIsSubmittingScores] = useState(false);
    const [scoresHaveBeenSaved, setScoresHaveBeenSaved] = useState(false);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false);


    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
    // Get setup parameters from URL
    const finishScore = parseInt(searchParams.get('finishScore') || '0');
    const questionTimer = parseInt(searchParams.get('questionTimer') || '0');

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

    // State for the component
    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: Question } | null>(null);

    const [currentView, setCurrentView] = useState<'leaderboard' | 'questions'>('leaderboard');
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
                color: tUrl.color,
                score: 0,
                students: tUrl.playerUids.map(uid => studentsMap.get(uid)).filter(Boolean) as UserProfile[],
                activePlayerIndex: 0,
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
            const result = await getQuestionsFromBank(params);
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
        const inGamePlayers = teams.flatMap(t => t.students);
        if (scoresHaveBeenSaved || inGamePlayers.length === 0) {
            if(andFinish && gameState !== 'finished') setGameState('finished');
            return;
        };

        setIsSubmittingScores(true);
        
        const scoreUpdates = inGamePlayers.map(c => {
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

    const activePlayerUid = useMemo(() => {
        if (!activeTeamId) return null;
        const activeTeam = teams.find(t => t.id === activeTeamId);
        if (!activeTeam || activeTeam.students.length === 0) return null;
        return activeTeam.students[activeTeam.activePlayerIndex! % activeTeam.students.length].uid;
    }, [activeTeamId, teams]);

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
        
        let winnerFound: Team | null = null;
        
        const updatedTeams = teams.map(t => {
            if (t.id === activeTeamId) {
                const newScore = Math.max(0, t.score + scoreChange);
                const nextPlayerIndex = (t.activePlayerIndex! + 1) % t.students.length;
                const updatedTeam = { ...t, score: newScore, activePlayerIndex: nextPlayerIndex };
                
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
        <div className="w-full min-h-screen bg-gradient-to-br from-indigo-300 via-purple-400 to-pink-500 dark:from-indigo-800 dark:via-purple-900 dark:to-pink-950">
            <div className={cn("p-4 sm:p-6 md:p-8", isFullscreen ? "h-full flex flex-col" : "container mx-auto")}>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold font-headline text-white drop-shadow-lg">Takım Yarışması</h1>
                    <div className="flex items-center gap-2">
                         <Button variant="destructive" onClick={() => handleSaveScores(true)} disabled={isSubmittingScores || scoresHaveBeenSaved || teams.length === 0}><PartyPopper className="mr-2 h-4 w-4"/> Bitir ve Kaydet</Button>
                        <FullscreenToggle />
                        <Button asChild variant="outline" className="bg-card/70 backdrop-blur-sm hover:bg-card/90">
                            <Link href="/teacher/smartboard/takim"><ArrowLeft className="mr-2 h-4 w-4" /> Kurulumu Değiştir</Link>
                        </Button>
                    </div>
                </div>
                <div className="space-y-8">
                     <div className="flex flex-wrap justify-center items-center gap-6 mb-8">
                        {teams.map((team, index) => <TeamScoreCard key={team.id} team={team} isActive={team.id === activeTeamId} colorIndex={index} rank={sortedTeams.findIndex(t => t.id === team.id)} isFullscreen={isFullscreen} activePlayerUid={activePlayerUid} />)}
                    </div>
                    <Card className="bg-card/70 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={!activeTeamId}><Shuffle className="mr-2 h-4 w-4"/> Rastgele Seç</Button>
                                    {activeTeamId && <Badge variant="secondary">Sıradaki Takım: {teams.find(t=>t.id===activeTeamId)?.name}</Badge>}
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={cn("grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2", isFullscreen && "grid-cols-15 gap-1")}>
                            {questions.map((q, i) => {
                                const questionNumber = i + 1;
                                const isQuestionAnswered = answeredQuestions.includes(questionNumber);
                                return <Button key={i} className={cn(
                                    "aspect-square h-auto w-auto font-bold transition-transform hover:scale-105", 
                                    isFullscreen ? "text-lg" : "text-2xl",
                                    isQuestionAnswered ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed" : colorClasses[i % colorClasses.length]
                                    )}
                                    disabled={isQuestionAnswered || !activeTeamId} onClick={() => !isQuestionAnswered && setOpenedQuestion({ number: questionNumber, question: q })}>
                                    {isQuestionAnswered ? <Check className="h-6 w-6 text-green-500" /> : questionNumber}
                                </Button>
                            })}
                        </CardContent>
                    </Card>
                </div>
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
    )
}

export default function SmartboardTakimOyunPage() {
    return (
        <Suspense fallback={<CompetitionLoadingSkeleton />}>
            <TeamCompetitionComponent />
        </Suspense>
    )
}
