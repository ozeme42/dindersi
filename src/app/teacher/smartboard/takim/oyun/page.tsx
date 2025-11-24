
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

const TeamScoreCard = ({ competitor, isActive, colorClass, rank }: { competitor: GameCompetitor, isActive: boolean, colorClass: string, rank: number }) => {
    return (
        <Card 
            className={cn(
                'relative group cursor-pointer transition-all text-white border-transparent',
                colorClass,
                isActive && `ring-4 ring-offset-background ring-offset-2 ring-white/80`
            )}
        >
            <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-white/50 bg-white/20 font-bold text-lg">
                        {rank === 0 && <Crown className="h-6 w-6 text-yellow-400" />}
                        {rank === 1 && <Award className="h-6 w-6 text-gray-400" />}
                        {rank === 2 && <Award className="h-6 w-6 text-orange-400" />}
                        {rank > 2 && (rank + 1)}
                    </div>
                    <div className="truncate">
                        <p className="font-bold text-lg truncate">{competitor.displayName}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-bold">{competitor.score}</p>
                </div>
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


    useEffect(() => {
        const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Get setup parameters from URL
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


    // State for the component
    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Student and class management states
    const [studentPool, setStudentPool] = useState<UserProfile[]>([]);
    const [currentClass, setCurrentClass] = useState<SchoolClass | null>(null);
    const [isPoolLoading, setIsPoolLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [playerTurnIndex, setPlayerTurnIndex] = useState<Record<number, number>>({});
    
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);

    const [currentView, setCurrentView] = useState<'leaderboard' | 'questions'>('leaderboard');
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [winner, setWinner] = useState<Team | null>(null);
    
    const colorClasses = [
        "bg-chart-1 text-primary-foreground hover:bg-chart-1/90",
        "bg-chart-2 text-primary-foreground hover:bg-chart-2/90",
        "bg-chart-3 text-primary-foreground hover:bg-chart-3/90",
        "bg-chart-4 text-primary-foreground hover:bg-chart-4/90",
        "bg-chart-5 text-primary-foreground hover:bg-chart-5/90",
        "bg-accent text-accent-foreground hover:bg-accent/90",
    ];

    const bgColors = [
        'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 'bg-pink-500', 'bg-sky-500', 'bg-rose-500',
        'bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'
    ];
     const hoverBgColors = [
        'hover:bg-blue-600', 'hover:bg-emerald-600', 'hover:bg-amber-600', 'hover:bg-indigo-600', 'hover:bg-pink-600', 'hover:bg-sky-600', 'hover:bg-rose-600',
        'hover:bg-chart-1/90', 'hover:bg-chart-2/90', 'hover:bg-chart-3/90', 'hover:bg-chart-4/90', 'hover:bg-chart-5/90'
    ];

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        setIsPoolLoading(true);
        setError(null);

        try {
            const teamsParam = searchParams.get('teams');
            if (!teamsParam) throw new Error("Takım bilgileri alınamadı.");
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
            }));

            setTeams(initialTeams);
            setActiveTeamId(initialTeams[0]?.id || null);
            setPlayerTurnIndex(initialTeams.reduce((acc, team) => ({ ...acc, [team.id]: 0 }), {}));

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
            console.error("Error fetching data:", err);
            setError("Veriler yüklenirken bir hata oluştu.");
        } finally {
            setIsLoading(false);
            setIsPoolLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);
    
    const handleSaveScores = useCallback(async (andFinish: boolean = false) => {
        const inGameStudents = teams.flatMap(t => t.students);
        if (scoresHaveBeenSaved || inGameStudents.length === 0) {
            if (andFinish && gameState !== 'finished') setGameState('finished');
            return;
        }

        setIsSubmittingScores(true);
        
        const scoreUpdates = inGameStudents.map(c => {
            const team = teams.find(t => t.students.some(s => s.uid === c.uid));
            return { 
                userId: c.uid, 
                points: team ? Math.round(team.score / team.students.length) : 0, // Distribute team score
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
            if (finalSorted.length > 0 && (finalSorted.length === 1 || finalSorted[0].score > finalSorted[1].score)) {
                setWinner(finalSorted[0]);
            } else {
                setWinner('draw');
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
        if (!activeTeamId || gameState === 'finished') return;
        
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
            const currentTeam = teams.find(t => t.id === activeTeamId);
            if (currentTeam && currentTeam.students.length > 0) {
                 setPlayerTurnIndex(prev => ({
                    ...prev,
                    [activeTeamId]: (prev[activeTeamId] + 1) % currentTeam.students.length
                }));
            }
            const currentTeamIndex = teams.findIndex(t => t.id === activeTeamId);
            const nextTeamIndex = (currentTeamIndex + 1) % teams.length;
            setActiveTeamId(teams[nextTeamIndex]?.id);
        }
    };
    
    const handleSelectRandomQuestion = () => {
        if (!activeTeamId) {
            toast({ title: 'Hata', description: 'Lütfen sıradaki takımı belirleyin!', variant: 'destructive'});
            return;
        }
        const unansweredIndices = questions.map((_, i) => i).filter(i => !answeredQuestions.includes(i + 1));
        
        if (unansweredIndices.length === 0) {
            toast({ title: "Tüm sorular cevaplandı!", variant: 'default'});
            return;
        }

        const randomIndex = unansweredIndices[Math.floor(Math.random() * unansweredIndices.length)];
        const questionNumber = randomIndex + 1;
        const question = questions[randomIndex];
        setOpenedQuestion({ number: questionNumber, question });
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
            <div className={cn("p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[calc(100vh-theme(height.16))]", isFullscreen ? "h-screen w-screen m-0" : "container mx-auto")}>
                <Card className={cn("w-full max-w-xl text-center bg-card/70 backdrop-blur-sm", isFullscreen && "h-full w-full max-w-none flex flex-col justify-center")}>
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Yarışma Tamamlandı!</CardTitle>
                        <CardDescription>Harika bir mücadeleydi!</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Trophy className="h-24 w-24 text-amber-400" />
                         {winner === 'draw' ? <p className="text-2xl font-bold">Berabere!</p> :
                         winner && <p className="text-2xl">Kazanan: <span className="font-bold text-primary">{winner.name}</span></p>}
                        
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
                    <CardFooter className="flex-col sm:flex-row flex-wrap justify-center gap-4">
                        <Button onClick={() => handleSaveScores(false)} disabled={isSubmittingScores || scoresHaveBeenSaved}>
                            {isSubmittingScores ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : scoresHaveBeenSaved ? <Check className="mr-2 h-4 w-4"/> : <PartyPopper className="mr-2 h-4 w-4" />}
                            {scoresHaveBeenSaved ? 'Puanlar Kaydedildi' : 'Puanları Kaydet'}
                        </Button>
                        <Button onClick={startNewGame} variant="secondary">
                            <Repeat className="mr-2 h-4 w-4" /> Tekrar Oyna
                        </Button>
                        <Button asChild variant="outline"><Link href="/teacher/smartboard/leaderboard"><Trophy className="mr-2 h-4 w-4"/> Turnuva Liderliği</Link></Button>
                        <Button asChild variant="outline"><Link href="/teacher/smartboard"><Home className="mr-2 h-4 w-4"/> Panele Dön</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const activeTeam = teams.find(t => t.id === activeTeamId);
    const activePlayer = activeTeam?.students[playerTurnIndex[activeTeamId] || 0];

    return (
        <div className={cn("p-4 sm:p-6 md:p-8", isFullscreen ? "h-screen w-screen m-0 flex flex-col" : "container mx-auto")}>
             <div className={cn("flex justify-between items-center mb-6", isFullscreen && "flex-shrink-0")}>
                <h1 className="text-3xl font-bold font-headline">Takım Yarışması</h1>
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
                        <Link href="/teacher/smartboard/takim"><ArrowLeft className="mr-2 h-4 w-4" /> Kurulumu Değiştir</Link>
                    </Button>
                </div>
            </div>
            <div className={cn("space-y-8", isFullscreen ? "flex-grow flex flex-col overflow-hidden" : "")}>
                <div className="flex flex-wrap justify-center items-center gap-6 mb-8">
                    {sortedTeams.map((team, index) => {
                         const isActive = team.id === activeTeamId;
                         const colorClass = colorClasses[index % colorClasses.length];
                         const activePlayerInTeam = team.id === activeTeamId ? team.students[playerTurnIndex[team.id] || 0] : null;
                         
                         return (
                            <Card key={team.id} className={cn("transition-all text-white border-transparent shadow-xl w-72", colorClass, isActive && `ring-4 ring-offset-background ring-offset-2 ring-white/80 scale-105`)}>
                                <CardContent className="p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-headline font-bold text-2xl flex items-center gap-2"><Users /> {team.name}</h3>
                                        {index === 0 && <Crown className="h-7 w-7 text-yellow-300" />}
                                    </div>
                                    <div className="text-center font-bold text-6xl">{team.score}</div>
                                    {isActive && activePlayerInTeam && (
                                        <div className="text-center bg-black/20 p-2 rounded-md">
                                            <p className="text-xs opacity-80">Sıradaki Oyuncu</p>
                                            <p className="font-semibold">{activePlayerInTeam.displayName}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                         )
                    })}
                </div>
                <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "flex-grow flex flex-col")}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={!activeTeamId}><Shuffle className="mr-2 h-4 w-4"/> Rastgele Seç</Button>
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