
"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserMinus, ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, BrainCircuit, Check, Trash2, Users, Shuffle, PartyPopper, Star, Award, Trophy, UserPlus } from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { SchoolClass, UserProfile, GetQuizInput, GetQuizOutput, Question } from "@/lib/types";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { playSound, stopSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateMultipleStudentScores } from '@/app/teacher/smartboard/actions';
import { QuestionDialog } from "@/components/question-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { addStudentToClass } from "@/app/teacher/students/actions";

const SUMMER_SCHOOL_CLASS_NAME = "Yaz Okulu Havuzu";

type GameQuestion = GetQuizOutput['questions'][0];

type GameCompetitor = {
    uid: string;
    displayName: string;
    avatar?: string;
    score: number;
    questionIndex: number;
};

// Reusable component for displaying students in a list
const StudentListItem = ({ student, onAddToGame, isAdded }: { student: UserProfile, onAddToGame: (student: UserProfile) => void, isAdded: boolean }) => (
    <div key={student.uid} className="flex items-center justify-between p-2 hover:bg-muted rounded-md gap-1">
        <div className="flex items-center gap-2 overflow-hidden">
            <Avatar className="h-8 w-8">
                 <AvatarImage src={student.avatar || ''} alt={student.displayName} data-ai-hint="profile picture"/>
                <AvatarFallback>{student.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="truncate flex-1 font-medium">{student.displayName}</span>
        </div>
        <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={() => onAddToGame(student)} disabled={isAdded}>
            Ekle
        </Button>
    </div>
);

function AddStudentDialog({ isOpen, onOpenChange, onAdd, isSaving, poolClassName }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onAdd: (name: string, className: string) => void, isSaving: boolean, poolClassName: string }) {
    const [displayName, setDisplayName] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(displayName, poolClassName);
        setDisplayName('');
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setDisplayName('') }; onOpenChange(open); }}>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Havuzuna Yeni Öğrenci Ekle</DialogTitle>
                        <DialogDescription>Varsayılan şifre "123456" olarak atanacaktır.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="add-display-name">Ad Soyad</Label>
                            <Input id="add-display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} required/>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">İptal</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Öğrenci Oluştur
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </form>
        </Dialog>
    )
}

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

const TeamScoreCard = ({ team, isActive, colorClass, rank, currentPlayerName }: { team: Team, isActive: boolean, colorClass: string, rank: number, currentPlayerName?: string }) => {
    return (
        <Card 
            className={cn(
                'relative group cursor-pointer transition-all text-white border-transparent',
                colorClass,
                isActive && `ring-4 ring-offset-background ring-offset-2 ring-white/80`
            )}
        >
            <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-white/50 bg-white/20 font-bold text-lg">
                            {rank === 0 && <Crown className="h-6 w-6 text-yellow-400" />}
                            {rank === 1 && <Award className="h-6 w-6 text-gray-400" />}
                            {rank === 2 && <Award className="h-6 w-6 text-orange-400" />}
                            {rank > 2 && (rank + 1)}
                        </div>
                        <div className="truncate">
                            <p className="font-bold text-lg truncate">{team.name}</p>
                        </div>
                    </div>
                     <p className="text-4xl font-bold">{team.score}</p>
                </div>
                 {isActive && currentPlayerName && (
                    <div className="mt-2 text-center">
                        <Badge variant="secondary" className="bg-black/30 text-white">Sıradaki Oyuncu: {currentPlayerName}</Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


function CompetitionComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSubmittingScores, setIsSubmittingScores] = useState(false);
    const [scoresHaveBeenSaved, setScoresHaveBeenSaved] = useState(false);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false);

    const finishScore = parseInt(searchParams.get('finishScore') || '0');
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
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: Question } | null>(null);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [winner, setWinner] = useState<Team | 'draw' | null>(null);
    
    const colorClasses = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-accent"];
    const hoverColorClasses = ['hover:bg-chart-1/90', 'hover:bg-chart-2/90', 'hover:bg-chart-3/90', 'hover:bg-chart-4/90', 'hover:bg-chart-5/90', 'hover:bg-accent/90'];

    useEffect(() => {
        const teamsParam = searchParams.get('teams');
        if (!teamsParam) {
            setError("Takım bilgileri bulunamadı.");
            setIsLoading(false);
            return;
        }
        
        const teamsFromUrl: TeamForUrl[] = JSON.parse(teamsParam);
        
        const fetchGameData = async () => {
             try {
                const playerUids = teamsFromUrl.flatMap(t => t.playerUids);
                
                const studentDocs = playerUids.length > 0 ? await Promise.all(playerUids.map(id => getDoc(doc(db, "users", id)))) : [];
                const studentsMap = new Map(studentDocs.map(docSnap => [docSnap.id, { uid: docSnap.id, ...docSnap.data() } as UserProfile]));

                const initialTeams: Team[] = teamsFromUrl.map(tUrl => ({
                    id: tUrl.id,
                    name: tUrl.name,
                    color: tUrl.color,
                    score: 0,
                    students: tUrl.playerUids.map(uid => studentsMap.get(uid)).filter(Boolean) as UserProfile[],
                    currentPlayerIndex: 0
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

            } catch (err: any) {
                setError("Oyun verileri yüklenirken bir hata oluştu: " + err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGameData();
    }, [searchParams]);

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

        if (scoreUpdates.every(u => u.points === 0) && andFinish) {
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
    }, [gameState, answeredQuestions.length, questions.length, handleSaveScores]);
    
    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
      if (!activeTeamId || gameState !== 'playing') return;
      
      let winnerFound: Team | null = null;
      
      const updatedTeams = teams.map(t => {
          if (t.id === activeTeamId) {
              const newScore = Math.max(0, t.score + scoreChange);
              const updatedTeam = { ...t, score: newScore, currentPlayerIndex: (t.currentPlayerIndex + 1) % t.students.length };
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
        const unansweredIndices = questions
            .map((_, i) => i)
            .filter(i => !answeredQuestions.includes(i + 1));
        
        if (unansweredIndices.length === 0) {
            toast({ title: "Tebrikler!", description: "Tüm soruları cevapladınız." });
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
    const nextPlayerName = activeTeam && activeTeam.students.length > 0 ? activeTeam.students[activeTeam.currentPlayerIndex]?.displayName : null;

    if (isLoading) return <CompetitionLoadingSkeleton />;
    if (error) return (
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

    if (gameState === 'finished') {
        return (
             <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Yarışma Bitti!</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Award className="h-24 w-24 text-amber-400"/>
                         {winner === 'draw' ? <p className="text-2xl font-bold">Berabere!</p> : winner ? <p className="text-2xl font-bold">Kazanan: {winner.name}</p> : null}
                        
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

    return (
        <div className={cn("p-4 sm:p-6 md:p-8", isFullscreen ? "h-screen w-screen m-0 flex flex-col" : "container mx-auto")}>
             <div className={cn("flex justify-between items-center mb-6", isFullscreen && "flex-shrink-0")}>
                <h1 className="text-3xl font-bold font-headline">Takım Yarışması</h1>
                <div className="flex items-center gap-2">
                    <FullscreenToggle />
                    <Button asChild variant="outline"><Link href="/teacher/smartboard/takim"><ArrowLeft className="mr-2 h-4 w-4" /> Kurulumu Değiştir</Link></Button>
                </div>
            </div>

            <div className={cn("space-y-8", isFullscreen ? "flex-grow flex flex-col overflow-hidden" : "")}>
                {currentView === 'leaderboard' ? (
                     <div className="space-y-8 h-full flex flex-col">
                        <div className={cn(isFullscreen && "flex-grow min-h-0")}>
                             <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "flex-grow flex flex-col h-full")}>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="flex items-center gap-2"><Trophy className="text-yellow-500"/> Liderlik Tablosu</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className={cn("flex flex-col", isFullscreen && "flex-grow min-h-0")}>
                                    <div className={cn("flex-1", isFullscreen && "overflow-hidden")}>
                                        <ScrollArea className={cn(isFullscreen ? "h-full" : "h-auto")}>
                                            {sortedTeams.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                    {sortedTeams.map((team, index) => {
                                                        const colorClass = bgColors[index % bgColors.length];
                                                        const isActive = activeTeamId === team.id;
                                                        const nextPlayer = team.students[team.currentPlayerIndex]?.displayName;
                                                        return (
                                                            <TeamScoreCard 
                                                                key={team.id}
                                                                team={team}
                                                                isActive={isActive}
                                                                colorClass={colorClass}
                                                                rank={index}
                                                                currentPlayerName={nextPlayer}
                                                            />
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-muted-foreground flex-grow flex items-center justify-center">
                                                    <p>Yarışma için takım bulunamadı.</p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                    <div className="pt-6">
                                    {teams.length > 0 && (
                                            activeTeamId !== null ? (
                                                <Button size="lg" className="w-full" onClick={() => setCurrentView('questions')}>
                                                    <BrainCircuit className="mr-2 h-5 w-5"/>
                                                    Sıradaki Takım ({teams.find(c=>c.id === activeTeamId)?.name}) İçin Soru Seç
                                                </Button>
                                            ) : (
                                                <Alert variant="destructive">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <AlertTitle>Devam Etmek İçin Bir Takım Seçin</AlertTitle>
                                                </Alert>
                                            )
                                    )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="lg:col-span-3">
                         <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "flex-grow flex flex-col")}>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={!activeTeamId}>
                                            <Shuffle className="mr-2 h-4 w-4" /> Rastgele Seç
                                        </Button>
                                        <Button variant="outline" onClick={() => setCurrentView('leaderboard')}>
                                            <ArrowLeft className="mr-2 h-4 w-4"/> Liderlik Tablosu
                                        </Button>
                                    </div>
                                </CardTitle>
                                <CardDescription>Sıradaki: {teams.find(t => t.id === activeTeamId)?.name} Takımı - {nextPlayerName}</CardDescription>
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
                                            title={!activeTeamId ? "Soruyu açmak için bir takımı aktif hale getirin" : `Soru ${questionNumber}`}
                                        >
                                            {isQuestionAnswered ? <Check className="h-6 w-6 text-green-500" /> : questionNumber}
                                        </Button>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </div>
                )}
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
    )
}

export default function SmartboardTakimOyunPage() {
    return <Suspense fallback={<CompetitionLoadingSkeleton />}><CompetitionComponent /></Suspense>
}
```