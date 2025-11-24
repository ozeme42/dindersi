
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
import { doc, getDoc, collection, query, where } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
                 <AvatarImage src={student.avatar || ''} alt={student.displayName} />
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
                        <DialogTitle>Yaz Okulu Havuzuna Yeni Öğrenci Ekle</DialogTitle>
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

function CompetitionComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSubmittingScores, setIsSubmittingScores] = useState(false);
    const [scoresHaveBeenSaved, setScoresHaveBeenSaved] = useState(false);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const router = useRouter();


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
    
    const [inGameCompetitors, setInGameCompetitors] = useState<GameCompetitor[]>([]);

    const [activeCompetitorId, setActiveCompetitorId] = useState<string | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);

    const [currentView, setCurrentView] = useState<'leaderboard' | 'questions'>('leaderboard');
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [winner, setWinner] = useState<GameCompetitor | null>(null);
    
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
            const params: GetQuizInput = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: parseInt(searchParams.get('questionCount') || '20'),
                difficulty: searchParams.get('difficulty')?.split(','),
                questionTypes: searchParams.get('questionTypes')?.split(','),
            };
            const questionResult = await getQuestionsFromBank(params as any);

            if ('error' in questionResult) {
                setError(questionResult.error);
            } else if (questionResult.questions) {
                setQuestions(questionResult.questions);
            } else {
                setError("Uygun soru bulunamadı.");
            }

            const classId = searchParams.get('classId');
            if (classId) {
                const classDoc = await getDoc(doc(db, "classes", classId));
                if (classDoc.exists()) {
                    const classData = { id: classDoc.id, ...classDoc.data() } as SchoolClass;
                    setCurrentClass(classData);
                    const studentsQuery = query(collection(db, "users"), where("class", ">=", classData.name), where("class", "<", classData.name + '\uf8ff'));
                    const studentsSnapshot = await getDocs(studentsQuery);
                    setStudentPool(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
                } else {
                    setError("Sınıf bilgisi bulunamadı.");
                }
            } else {
                // Handle cases without a classId if needed, e.g., summer school
                 const studentsQuery = query(collection(db, "users"), where("class", "==", SUMMER_SCHOOL_CLASS_NAME));
                 const studentsSnapshot = await getDocs(studentsQuery);
                 setStudentPool(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
            }

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
        if (scoresHaveBeenSaved || inGameCompetitors.length === 0) {
            if (andFinish && gameState !== 'finished') setGameState('finished');
            return;
        }

        setIsSubmittingScores(true);
        
        const scoreUpdates = inGameCompetitors.map(c => ({ 
            userId: c.uid, 
            points: c.score,
            gameType: 'smartboard_bireysel' as const,
            context: `${searchParams.get('courseName') || 'Genel'} - ${searchParams.get('topicName') || 'Genel'}`
        }));

        if (scoreUpdates.every(u => u.points === 0) && andFinish) {
             toast({ title: "Skor Yok", description: "Kaydedilecek puan bulunmuyor." + (andFinish ? " Yarışma sonlandırılıyor." : "") });
        } else {
            const result = await updateMultipleStudentScores(scoreUpdates);
            if (result.success) {
                toast({ title: "Skorlar Kaydedildi", description: "Yarışma skorları öğrenci profillerine eklendi." });
                setScoresHaveBeenSaved(true);
            } else {
                toast({ title: "Hata", description: result.error, variant: "destructive" });
                setIsSubmittingScores(false);
                return; // Stop if saving fails
            }
        }
        
        if (andFinish) {
            const finalSorted = [...inGameCompetitors].sort((a,b) => b.score - a.score);
            if (finalSorted.length > 0) {
                setWinner(finalSorted[0]);
            }
            setGameState('finished');
        }
        setIsSubmittingScores(false);
    }, [scoresHaveBeenSaved, inGameCompetitors, searchParams, toast, gameState]);

    const handleAddStudent = async (displayName: string, className: string) => {
        if (!displayName.trim()) return;
        setIsAddingStudent(true);
        const result = await addStudentToClass(displayName, className);
        if (result.success && result.newUser) {
            toast({ title: "Başarılı", description: `${displayName} havuza eklendi.` });
            setStudentPool(prev => [...prev, result.newUser!]);
            setIsAddStudentOpen(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsAddingStudent(false);
    };

    const studentsInBranch = useMemo(() => {
        if (!currentClass) {
            return studentPool; // For summer school scenario or if class fails to load
        }
        if (selectedBranch === 'all') {
            return studentPool.filter(s => s.class?.startsWith(currentClass.name));
        }

        const branchClassName = `${currentClass.name} - ${selectedBranch}`;
        const poolClassName = `${branchClassName} (Havuz)`;
        return studentPool.filter(s => s.class === branchClassName || s.class === poolClassName);
    }, [studentPool, currentClass, selectedBranch]);


    const addCompetitorToGame = (competitor: UserProfile) => {
        if(inGameCompetitors.some(c => c.uid === competitor.uid)) return;
        const newCompetitor: GameCompetitor = { uid: competitor.uid, displayName: competitor.displayName, avatar: competitor.avatar, score: 0 };
        setInGameCompetitors(prev => [...prev, newCompetitor]);
    };

    const removeCompetitorFromGame = (competitorId: string) => {
        setInGameCompetitors(prev => prev.filter(c => c.uid !== competitorId));
        if (activeCompetitorId === competitorId) {
            setActiveCompetitorId(null);
        }
    };
    
    const addAllFromPoolToGame = () => {
        const newCompetitors = studentsInBranch
            .filter(p => !inGameCompetitors.some(igc => igc.uid === p.uid))
            .map(p => ({ uid: p.uid, displayName: p.displayName, avatar: p.avatar, score: 0 }));

        setInGameCompetitors(prev => [...prev, ...newCompetitors]);
    };

    const removeAllFromGame = () => {
        setInGameCompetitors([]);
        setActiveCompetitorId(null);
    };
    
    const handleBranchSelect = (branch: string) => {
        setSelectedBranch(branch);
        // Do not reset competitors when changing branch, just filter the pool
    };

    const handleOpenQuestion = (number: number, question: GameQuestion) => {
        if (!activeCompetitorId) {
            toast({ title: 'Hata', description: 'Lütfen bir yarışmacı seçin!', variant: 'destructive'});
            return;
        }
        setOpenedQuestion({ number, question });
    };

    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        if (!activeCompetitorId || gameState === 'finished') return;
        
        let winnerFound: GameCompetitor | null = null;

        const updatedCompetitors = inGameCompetitors.map(c => {
            if (c.uid === activeCompetitorId) {
                const newScore = Math.max(0, c.score + scoreChange);
                const updatedCompetitor = { ...c, score: newScore };
                if (finishScore > 0 && newScore >= finishScore) {
                    winnerFound = updatedCompetitor;
                }
                return updatedCompetitor;
            }
            return c;
        });

        setInGameCompetitors(updatedCompetitors);
        setAnsweredQuestions([...answeredQuestions, questionNumber]);
        setOpenedQuestion(null);
        setCurrentView('leaderboard');

        if (winnerFound) {
            setWinner(winnerFound);
            setGameState('finished');
        }
    };
    
    useEffect(() => {
        if (gameState === 'playing' && questions.length > 0 && answeredQuestions.length === questions.length) {
            handleSaveScores(true);
        }
    }, [gameState, answeredQuestions.length, questions.length, handleSaveScores]);

    const startNewGame = () => {
        window.location.reload();
    };

    const handleSelectRandomQuestion = () => {
        if (!activeCompetitorId) {
            toast({ title: 'Hata', description: 'Lütfen bir yarışmacı seçin!', variant: 'destructive'});
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

    const sortedCompetitors = useMemo(() =>
        [...inGameCompetitors].sort((a, b) => b.score - a.score),
    [inGameCompetitors]);

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
                            <Link href="/teacher/smartboard/bireysel"><ArrowLeft className="mr-2 h-4 w-4" /> Kuruluma Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <div className={cn("p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-screen", isFullscreen ? "h-screen w-screen m-0" : "container mx-auto")}>
                <Card className={cn("w-full max-w-xl text-center bg-card/70 backdrop-blur-sm", isFullscreen && "h-full w-full max-w-none flex flex-col justify-center")}>
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Yarışma Tamamlandı!</CardTitle>
                        <CardDescription>Harika iş çıkardın!</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Award className="h-24 w-24 text-amber-400" />
                         {winner && <p className="text-2xl">
                            Kazanan: <span className="font-bold text-primary">{winner.displayName}</span>
                        </p>}
                        
                        <div className="w-full mt-4 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sıra</TableHead>
                                        <TableHead>Öğrenci</TableHead>
                                        <TableHead className="text-right">Puan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedCompetitors.map((player, index) => (
                                        <TableRow key={player.uid}>
                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                            <TableCell>{player.displayName}</TableCell>
                                            <TableCell className="text-right font-bold">{player.score}</TableCell>
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
                         <Button asChild variant="outline">
                           <Link href="/teacher/smartboard/leaderboard">
                                <Trophy className="mr-2 h-4 w-4" /> Turnuva Liderliği
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/teacher/smartboard">
                                <Home className="mr-2 h-4 w-4" /> Panele Dön
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className={cn("p-4 sm:p-6 md:p-8", isFullscreen ? "h-screen w-screen m-0 flex flex-col" : "container mx-auto")}>
             <div className={cn("flex justify-between items-center mb-6", isFullscreen && "flex-shrink-0")}>
                <h1 className="text-3xl font-bold font-headline">Bireysel Yarışma</h1>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="destructive" 
                        onClick={() => handleSaveScores(true)} 
                        disabled={isSubmittingScores || scoresHaveBeenSaved || inGameCompetitors.length === 0}
                    >
                        {isSubmittingScores ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PartyPopper className="mr-2 h-4 w-4"/>}
                        {scoresHaveBeenSaved ? "Kaydedildi" : "Bitir ve Kaydet"}
                    </Button>
                    <FullscreenToggle />
                    <Button asChild variant="outline">
                        <Link href="/teacher/smartboard/bireysel"><ArrowLeft className="mr-2 h-4 w-4" /> Kurulumu Değiştir</Link>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="leaderboard" value={currentView} onValueChange={(value) => setCurrentView(value as 'leaderboard' | 'questions')} className={cn("space-y-4", isFullscreen ? "flex-grow flex flex-col overflow-hidden" : "")}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="leaderboard">Liderlik Tablosu</TabsTrigger>
                    <TabsTrigger value="questions">Sorular</TabsTrigger>
                </TabsList>
                <TabsContent value="leaderboard" className={cn(isFullscreen && "flex-grow min-h-0")}>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                        <div className={cn("space-y-4", isFullscreen && "h-full flex flex-col")}>
                             <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "flex-grow flex flex-col")}>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="flex items-center gap-2"><Crown className="text-yellow-500"/> Liderlik Tablosu</CardTitle>
                                        <Button variant="outline" size="sm" onClick={removeAllFromGame} disabled={inGameCompetitors.length === 0}>
                                            <UserMinus className="mr-2 h-4 w-4"/> Tüm Yarışmacıları Çıkar
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className={cn("flex flex-col", isFullscreen && "flex-grow min-h-0")}>
                                    <div className={cn("flex-1", isFullscreen && "overflow-hidden")}>
                                        <ScrollArea className={cn(isFullscreen ? "h-full" : "h-[50vh]")}>
                                            {sortedCompetitors.length > 0 ? (
                                                <div className="space-y-2">
                                                    {sortedCompetitors.map((player, index) => {
                                                        const isActive = activeCompetitorId === player.uid;
                                                        return (
                                                            <div 
                                                                key={player.uid} 
                                                                onClick={() => setActiveCompetitorId(player.uid)}
                                                                className={cn(
                                                                    'relative group cursor-pointer transition-all text-white border-transparent p-2 rounded-lg flex items-center justify-between gap-3',
                                                                    isActive ? `ring-4 ring-offset-background ring-offset-2 ring-white/80 scale-105 bg-black/20` : "scale-100",
                                                                )}
                                                            >
                                                                 <div className="flex items-center gap-3 overflow-hidden">
                                                                     <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-white/50 bg-white/20 font-bold text-lg">
                                                                         {index === 0 && <Crown className="h-6 w-6 text-yellow-400" />}
                                                                         {index === 1 && <Award className="h-6 w-6 text-gray-400" />}
                                                                         {index === 2 && <Award className="h-6 w-6 text-orange-400" />}
                                                                         {index > 2 && (index + 1)}
                                                                     </div>
                                                                     <div className="truncate">
                                                                        <p className="font-bold text-lg truncate text-slate-800 dark:text-white">{player.displayName}</p>
                                                                    </div>
                                                                 </div>
                                                                 <p className="text-2xl font-bold text-slate-800 dark:text-white">{player.score}</p>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-muted-foreground flex-grow flex items-center justify-center">
                                                    <p>Yarışmaya başlamak için aşağıdaki havuzdan yarışmacı ekleyin.</p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                    <div className="pt-6">
                                    {inGameCompetitors.length > 0 && (
                                            activeCompetitorId !== null ? (
                                                <Button size="lg" className="w-full" onClick={() => setCurrentView('questions')}>
                                                    <BrainCircuit className="mr-2 h-5 w-5"/>
                                                    Sıradaki Yarışmacı ({inGameCompetitors.find(c=>c.uid === activeCompetitorId)?.displayName}) İçin Soru Seç
                                                </Button>
                                            ) : (
                                                <Alert variant="destructive">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <AlertTitle>Devam Etmek İçin Bir Yarışmacı Seçin</AlertTitle>
                                                    <AlertDescription>
                                                      Liderlik tablosundan sıradaki yarışmacıyı seçerek devam edin.
                                                    </AlertDescription>
                                                </Alert>
                                            )
                                    )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        
                        {!isFullscreen && (
                            <div>
                                <Card className="bg-card/70 backdrop-blur-sm mt-8">
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-center">
                                            <span>Öğrenci Havuzu</span>
                                            <Button size="sm" variant="outline" onClick={() => setIsAddStudentOpen(true)}>
                                                <UserPlus className="mr-2 h-4 w-4" /> Yeni Sanal Öğrenci
                                            </Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-2 mb-2">
                                            {currentClass && 
                                                <Select value={selectedBranch} onValueChange={handleBranchSelect}>
                                                    <SelectTrigger><SelectValue placeholder="Şube Seçin..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Tüm Şubeler</SelectItem>
                                                        {currentClass.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            }
                                            <Button className="w-full" onClick={addAllFromPoolToGame} disabled={studentsInBranch.every(s => inGameCompetitors.some(c => c.uid === s.uid)) || studentsInBranch.length === 0}>Tümünü Ekle</Button>
                                        </div>
                                         <ScrollArea className="h-80">
                                            {isPoolLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div> :
                                            studentsInBranch.length > 0 ? studentsInBranch.map(s => <StudentListItem key={s.uid} student={s} onAddToGame={addCompetitorToGame} isAdded={inGameCompetitors.some(c => c.uid === s.uid)} />) :
                                            <p className="text-center text-sm text-muted-foreground p-4">Havuzda öğrenci yok.</p>}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                     </div>
                </TabsContent>
                <TabsContent value="questions" className={cn(isFullscreen && "flex-grow min-h-0")}>
                    <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "h-full flex flex-col")}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={!activeCompetitorId}><Shuffle className="mr-2 h-4 w-4" /> Rastgele Seç</Button>
                                    {activeCompetitorId && <Badge variant="secondary">Sıra: {inGameCompetitors.find(c=>c.uid === activeCompetitorId)?.displayName}</Badge>}
                                </div>
                            </CardTitle>
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
                                            isQuestionAnswered ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed" : colorClasses[i % colorClasses.length]
                                        )}
                                        disabled={isQuestionAnswered || !activeCompetitorId}
                                        onClick={() => !isQuestionAnswered && handleOpenQuestion(questionNumber, q)}
                                        title={!activeCompetitorId ? "Soruyu açmak için bir yarışmacı seçin" : `Soru ${questionNumber}`}
                                    >
                                        {isQuestionAnswered ? <Check className="h-6 w-6 text-white" /> : questionNumber}
                                    </Button>
                                )
                            })}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
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
            <AddStudentDialog
                isOpen={isAddStudentOpen}
                onOpenChange={setIsAddStudentOpen}
                onAdd={handleAddStudent}
                isSaving={isAddingStudent}
                poolClassName={SUMMER_SCHOOL_CLASS_NAME}
            />
        </div>
    )
}

export default function SmartboardBireyselOyunPage() {
    return (
        <Suspense fallback={<CompetitionLoadingSkeleton />}>
            <CompetitionComponent />
        </Suspense>
    )
}

    
```
- src/download_unzipped.zip_unzipped/src/app/teacher/summer-school/smartboard/page.tsx:
```tsx

"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MonitorPlay, Sun, User, Users, Swords, ArrowRight, BrainCircuit, Settings, Trophy, GitBranch, Columns, LayoutTemplate, Package, Wind, Gamepad2, Brain } from 'lucide-react';
import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const FeatureButton = ({ href, title, description, icon, colorClass }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string }) => {
    return (
        <Link href={href} className="block group h-full">
            <div className={cn(
                "h-full w-full rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-lg hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300",
                colorClass
            )}>
                {React.cloneElement(icon as React.ReactElement, { className: "h-16 w-16 opacity-90" })}
                <h3 className="font-headline text-3xl mt-4">{title}</h3>
                <p className="mt-2 opacity-80 text-sm max-w-xs">{description}</p>
                <div className="flex-grow" />
                <ArrowRight className="mt-4 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </div>
        </Link>
    )
};


export default function SmartboardPage() {
  const yarışmalar = [
    {
      href: "/teacher/summer-school/smartboard/bireysel",
      title: "Bireysel Yarışma",
      description: "Her öğrencinin kendi başına yarıştığı klasik mod.",
      icon: <User />,
      colorClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
      href: "/teacher/summer-school/smartboard/takim",
      title: "Takım Yarışması",
      description: "Öğrencileri takımlara ayırarak rekabeti artırın.",
      icon: <Users />,
      colorClass: "bg-cyan-600 text-cyan-50 hover:bg-cyan-700",
    },
    {
      href: "/teacher/summer-school/smartboard/duello",
      title: "Düello",
      description: "İki öğrenciyi veya takımı karşı karşıya getirin.",
      icon: <Swords />,
      colorClass: "bg-fuchsia-600 text-fuchsia-50 hover:bg-fuchsia-700",
    },
    {
      href: "/teacher/smartboard/kavram-yarismasi",
      title: "Kavram Yarışması",
      description: "Tanımı verilen kavramı en hızlı bulan kazanır.",
      icon: <BrainCircuit />,
      colorClass: "bg-orange-500 text-orange-50 hover:bg-orange-600",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 space-y-12 min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center animate-fade-in-up">
            <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary">Yaz Kursu Yarışmaları</h1>
            <p className="text-muted-foreground mt-4 text-xl md:text-2xl">Yaz kursu öğrencileriniz için bir yarışma türü seçin.</p>
        </div>
        
        <div className="w-full max-w-screen-xl">
          <h2 className="text-3xl font-bold font-headline mb-6 text-center">Yarışmalar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {yarışmalar.map((buttonProps, index) => <div key={index} className="h-80"><FeatureButton {...buttonProps} /></div>)}
          </div>
        </div>

        <div className="flex items-center gap-6 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <Button asChild variant="default" size="lg">
                <Link href="/teacher/smartboard/leaderboard">
                    <Trophy className="mr-2 h-5 w-5" />
                    Turnuva Liderliği
                </Link>
            </Button>
            <Button asChild variant="link" className="text-muted-foreground">
                <Link href="/teacher/game-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Oyun Ayarlarını Yönet
                </Link>
            </Button>
        </div>
    </div>
  );
}

```
- src/download_unzipped.zip_unzipped/src/app/teacher/summer-school/smartboard/takim/page.tsx:
```tsx

import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { TakimYarismaSetupClientPage } from "./client-page";

export const dynamic = 'force-dynamic';

export default async function Page() {
    const settings = await getGameSettings();
    return <TakimYarismaSetupClientPage gameConfig={settings.teacherTakim} />;
}

```
- src/download_unzipped.zip_unzipped/src/app/teacher/summer-school/students/actions.ts:
```tsx

'use server';

import { db, firebaseConfig } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, updateProfile } from "firebase/auth"
import { normalizeNameToEmailLocalPart } from "@/lib/utils";


export async function addStudentToClass(displayName: string, className: string): Promise<{ success: boolean; error?: string; newUser?: UserProfile }> {
    const finalDisplayName = displayName.trim();
    if (!finalDisplayName) {
        return { success: false, error: "Öğrenci adı boş olamaz." };
    }

    if (!firebaseConfig.apiKey) {
        console.error("Firebase config is missing.");
        return { success: false, error: "Sunucu yapılandırma hatası." };
    }

    const password = "123456"; // Default password
    const appName = 'student-creation-' + Date.now() + Math.random();
    let secondaryApp;

    try {
        secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);

        const baseLocalPart = normalizeNameToEmailLocalPart(finalDisplayName);
        let finalEmail = `yaz.${baseLocalPart}@degerleroyunu.app`;
        let attempts = 0;
        
        while (true) {
            const methods = await fetchSignInMethodsForEmail(secondaryAuth, finalEmail);
            if (methods.length === 0) break;
            attempts++;
            finalEmail = `yaz.${baseLocalPart}${attempts}@degerleroyunu.app`;
            if (attempts > 100) {
                 throw new Error("Bu isimle çok fazla kullanıcı mevcut, lütfen farklı bir isim deneyin.");
            }
        }
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: finalDisplayName });

        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: finalEmail,
            role: 'guest',
            class: className,
            score: 0,
            createdAt: serverTimestamp(),
        };

        // Use the primary admin-authenticated db instance to write to Firestore
        await setDoc(doc(db, "users", user.uid), newUserProfile);
        
        const serializableNewUser: UserProfile = {
            ...newUserProfile,
            uid: user.uid,
            createdAt: new Date().toISOString(), // for immediate client-side update
        };
        
        return { success: true, newUser: serializableNewUser };

    } catch (error: any) {
        console.error("Error creating new student:", error);
        return { success: false, error: `Öğrenci oluşturulurken hata: ${error.message}` };
    } finally {
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
}

```
- src/download_unzipped.zip_unzipped/src/app/teacher/summer-school/students/page.tsx:
```tsx

"use client"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link"

// UI Imports
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FilePenLine, Trash2, Loader2, UserPlus, MoreHorizontal, Users, Shield, Upload, AlertTriangle, ArrowDownAZ, CalendarClock, DollarSign, Send, UserCog, Sun } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


// Firebase and Actions
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, query, where, orderBy, deleteDoc, writeBatch } from "firebase/firestore"
import { updateUser, createNewUser, deleteUserFromFirestore, resetAllGeneralScores, getAllUsers } from '@/app/teacher/superadmin/actions';
import { addStudentToClass, bulkAddGuestStudents } from "../../../teacher/guest-students/actions";


// Types
import type { UserProfile, SchoolClass } from "@/lib/types"
import { UserAvatar } from "@/components/user-avatar"
import { UserEditorDialog } from "@/components/user-editor-dialog"


const SUMMER_SCHOOL_CLASS_NAME = "Yaz Okulu Havuzu";

function StudentRow({ student, onEdit, onDelete }: { student: UserProfile, onEdit: (student: UserProfile) => void, onDelete: (studentId: string) => void}) {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <UserAvatar user={student} />
                    <span className="font-medium">{student.displayName}</span>
                </div>
            </TableCell>
            <TableCell>{student.class}</TableCell>
            <TableCell className="text-right font-bold text-primary">{student.score?.toLocaleString()}</TableCell>
            <TableCell className="text-right">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menüyü aç</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Eylemler</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                           <Link href={`/teacher/students/${student.uid}`}>
                                <Users className="mr-2 h-4 w-4" /> Profili Görüntüle
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(student)}><FilePenLine className="mr-2 h-4 w-4" /> Düzenle</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="w-full text-left relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" /> Sil
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Bu işlem geri alınamaz. "{student.displayName}" adlı öğrencinin tüm verileri (giriş bilgileri, puanları, ilerlemesi) sistemden kalıcı olarak silinecektir.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(student.uid)} className="bg-destructive hover:bg-destructive/90">
                                        Evet, Sil
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    )
}

const UserEditorSchema = z.object({
  uid: z.string().optional(),
  displayName: z.string().min(3, "Ad Soyad en az 3 karakter olmalıdır."),
  email: z.string().email("Geçersiz e-posta adresi."),
  role: z.enum(['student', 'teacher', 'superadmin', 'guest']),
  password: z.string().optional(),
  classId: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  score: z.coerce.number().optional().default(0),
}).refine(data => {
    if (!data.uid && (!data.password || data.password.length < 6)) {
      return false;
    }
    if (data.uid && data.password && data.password.length > 0 && data.password.length < 6) {
      return false;
    }
    return true;
}, {
    message: "Yeni kullanıcı için şifre zorunludur ve en az 6 karakter olmalıdır. Düzenleme yaparken ise şifre alanı boş bırakılabilir veya en az 6 karakter olmalıdır.",
    path: ["password"],
});


export default function SummerStudentManagementPage() {
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dialogState, setDialogState] = useState<{isOpen: boolean; user: Partial<UserProfile> | null}>({isOpen: false, user: null});
  const [isSaving, setIsSaving] = useState(false);
  
  const [newStudentName, setNewStudentName] = useState("");
  const [bulkStudentNames, setBulkStudentNames] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "users"), where("class", "==", SUMMER_SCHOOL_CLASS_NAME));
      const studentsSnapshot = await getDocs(q);
      const studentsData = studentsSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
      setAllStudents(studentsData);
    } catch (error) {
      console.error("Error fetching summer students:", error);
      toast({ title: "Hata", description: "Veri alınırken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);
  
  const handleOpenDialog = (user: Partial<UserProfile> | null = null) => {
    setDialogState({ isOpen: true, user });
  };
  
  const handleSaveUser = async (data: z.infer<typeof UserEditorSchema>) => {
    setIsSaving(true);
    const result = data.uid
      ? await updateUser(data as UserProfile)
      : await createNewUser(data as any);
      
    if (result.success) {
      toast({ title: "Başarılı", description: `Kullanıcı ${data.uid ? 'güncellendi' : 'oluşturuldu'}.` });
      await fetchAllData();
      setDialogState({ isOpen: false, user: null });
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsSaving(false);
  };
  
  const handleDeleteUser = async (userId: string) => {
    const result = await deleteUserFromFirestore(userId);
    if (result.success) {
        toast({ title: "Başarılı", description: "Öğrenci sistemden tamamen silindi." });
        await fetchAllData();
    } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
  }
  
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
        toast({title: "Eksik Bilgi", description: "Lütfen bir öğrenci adı girin.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    const result = await addStudentToClass(newStudentName, SUMMER_SCHOOL_CLASS_NAME);
    if (result.success) {
        toast({title: "Başarılı", description: `${newStudentName} eklendi.`});
        setNewStudentName("");
        await fetchAllData();
    } else {
        toast({title: "Hata", description: result.error, variant: "destructive"});
    }
    setIsSaving(false);
  }

  const handleBulkAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!bulkStudentNames.trim()) {
        toast({title: "Eksik Bilgi", description: "Lütfen öğrenci adları girin.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    const names = bulkStudentNames.split('\n').map(name => name.trim()).filter(Boolean);
    const result = await bulkAddStudentsToClass(names, SUMMER_SCHOOL_CLASS_NAME);

    if (result.success) {
        toast({title: "Başarılı", description: `${result.successCount} öğrenci eklendi.`});
        setBulkStudentNames("");
        await fetchAllData();
    } else {
        toast({title: "Hata", description: result.error, variant: "destructive"});
    }
    setIsSaving(false);
  }
  
  const filteredStudents = useMemo(() => {
    let list = allStudents;
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        list = list.filter(s => 
            (s.displayName && s.displayName.toLowerCase().includes(lowercasedTerm))
        );
    }
    list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'tr'));
    return list;
  }, [allStudents, searchTerm]);
  
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold font-headline">Yaz Kursu Öğrenci Yönetimi</h1>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Havuzdaki Öğrenciler</TabsTrigger>
            <TabsTrigger value="add">Yeni Öğrenci Ekle</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
             <Card>
                <CardHeader>
                    <CardTitle>Öğrenci Listesi</CardTitle>
                    <CardDescription>Yaz kursu yarışmalarında kullanılacak öğrencileri yönetin.</CardDescription>
                     <div className="pt-4">
                         <Input placeholder="Öğrenci ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Öğrenci</TableHead>
                                    <TableHead>Sınıf</TableHead>
                                    <TableHead className="text-right">Puan</TableHead>
                                    <TableHead className="text-right">Eylemler</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                    <TableRow key={student.uid}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={student} />
                                                <span className="font-medium">{student.displayName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{student.class}</TableCell>
                                        <TableCell className="text-right font-bold text-primary">{student.score?.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menüyü aç</span></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Eylemler</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleOpenDialog(student)}><FilePenLine className="mr-2 h-4 w-4" /> Düzenle</DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <button className="w-full text-left relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive hover:bg-destructive/10">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                                                            </button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Bu işlem geri alınamaz. "{student.displayName}" adlı öğrenci kalıcı olarak silinecektir.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteUser(student.uid)} className="bg-destructive hover:bg-destructive/90">
                                                                    Evet, Sil
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">Yaz okulu havuzunda öğrenci bulunmuyor.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="add">
              <Card>
                <CardHeader>
                    <CardTitle>Yeni Öğrenci Ekle</CardTitle>
                    <CardDescription>Oluşturulan öğrenciler otomatik olarak "Yaz Okulu Havuzu"na atanacaktır.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="single">
                      <TabsList>
                        <TabsTrigger value="single">Tek Tek Ekle</TabsTrigger>
                        <TabsTrigger value="bulk">Toplu Ekle</TabsTrigger>
                      </TabsList>
                      <TabsContent value="single" className="pt-4">
                        <form onSubmit={handleAddSingleStudent} className="flex gap-2">
                          <Input placeholder="Öğrenci Adı Soyadı" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} />
                          <Button type="submit" disabled={isSaving}><UserPlus className="mr-2 h-4 w-4"/> Ekle</Button>
                        </form>
                      </TabsContent>
                      <TabsContent value="bulk" className="pt-4">
                        <form onSubmit={handleBulkAdd} className="space-y-4">
                            <Textarea placeholder="Her satıra bir öğrenci adı yazın..." className="min-h-48" value={bulkStudentNames} onChange={e => setBulkStudentNames(e.target.value)} />
                            <Button type="submit" disabled={isSaving}><Users className="mr-2 h-4 w-4"/> Toplu Ekle</Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      </div>

       {dialogState.isOpen && (
           <UserEditorDialog 
                isOpen={dialogState.isOpen}
                onOpenChange={(isOpen) => setDialogState({ isOpen, user: null })}
                user={dialogState.user}
                onSave={handleSaveUser}
                isSaving={isSaving}
                classes={[]} // No regular classes for summer school students
           />
      )}
    </div>
  );
}

```
- tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/duello/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/takim/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/kavram-duellosu/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/kavram-yarismasi/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/kavram-yarismasi/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/kavram-yarismasi/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/kutu-ac/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/takim/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/takim/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/duello/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/duello/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/bireysel/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/bireysel/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/content-creation/edit/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/content-creation/edit/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/students/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/students/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/questions/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/layout.tsx", "src/download_unzipped.zip_unzipped/src/teacher/superadmin/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/superadmin/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/score-events/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/score-events/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/stats/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/stats/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/scales/[scaleId]/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/scales/[scaleId]/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/scales/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/scales/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/questions/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/questions/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/layout.tsx", "src/download_unzipped.zip_unzipped/src/teacher/exams/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/exams/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/exams/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/error-reports/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/error-reports/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/content-creation/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/content-creation/edit/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/content-creation/edit/library-actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/content-creation/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/assignments/[assignmentId]/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/assignments/[assignmentId]/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/assignments/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/activity-data/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/activity-data/actions.ts", "src/download_unzipped.zip_unzipped/src/student/yazilacaklar/[...slug]/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yazilacaklar/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yazilacaklar/actions.ts", "src/download_unzipped.zip_unzipped/src/student/yazi-tura/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yazi-tura/oyun/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/yazi-tura/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/yazi-tura/actions.ts", "src/download_unzipped.zip_unzipped/src/student/yazi-tura/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/takim/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/takim/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/duello/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/duello/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/duello/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/bireysel/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/bireysel/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/bireysel/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/bireysel/actions.ts", "src/download_unzipped.zip_unzipped/src/student/yarismalar/ayarlar/page.tsx", "src/download_unzipped.zip_unzipped/src/student/tornado/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/tornado/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/tornado/page.tsx", "src/download_unzipped.zip_unzipped/src/student/tornado/actions.ts", "src/download_unzipped.zip_unzipped/src/student/tekrar-et/page.tsx", "src/download_unzipped.zip_unzipped/src/student/tekrar-et/actions.ts", "src/download_unzipped.zip_unzipped/src/student/soru-coz/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/soru-coz/page.tsx", "src/download_unzipped.zip_unzipped/src/student/soru-coz/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/soru-coz/actions.ts", "src/download_unzipped.zip_unzipped/src/student/soru-bankasi/[courseId]/page.tsx", "src/download_unzipped.zip_unzipped/src/student/soru-bankasi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/soru-bankasi/actions.ts", "src/download_unzipped.zip_unzipped/src/student/soru-bankasi/coz/page.tsx", "src/download_unzipped.zip_unzipped/src/student/shop/page.tsx", "src/download_unzipped.zip_unzipped/src/student/shop/actions.ts", "src/download_unzipped.zip_unzipped/src/student/profile/page.tsx", "src/download_unzipped.zip_unzipped/src/student/profile/actions.ts", "src/download_unzipped.zip_unzipped/src/student/page.tsx", "src/download_unzipped.zip_unzipped/src/student/ozetler/[...slug]/page.tsx", "src/download_unzipped.zip_unzipped/src/student/ozetler/page.tsx", "src/download_unzipped.zip_unzipped/src/student/ozetler/actions.ts", "src/download_unzipped.zip_unzipped/src/student/olay-siralama/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/olay-siralama/page.tsx", "src/download_unzipped.zip_unzipped/src/student/olay-siralama/actions.ts", "src/download_unzipped.zip_unzipped/src/student/milyoner-yarismasi/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/milyoner-yarismasi/oyun/actions.ts", "src/download_unzipped.zip_unzipped/src/student/milyoner-yarismasi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/milyoner-yarismasi/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/layout.tsx", "src/download_unzipped.zip_unzipped/src/student/labirent/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/labirent/page.tsx", "src/download_unzipped.zip_unzipped/src/student/labirent/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/labirent/actions.ts", "src/download_unzipped.zip_unzipped/src/student/kutu-ac/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kutu-ac/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kutu-ac/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/kutu-ac/actions.ts", "src/download_unzipped.zip_unzipped/src/student/kavram-yarismasi/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-yarismasi/oyun/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-yarismasi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-yarismasi/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-yarismasi/actions.ts", "src/download_unzipped.zip_unzipped/src/student/kavram-avi/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-avi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-avi/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-avi/actions.ts", "src/download_unzipped.zip_unzipped/src/student/kelime-avi/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kelime-avi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kelime-avi/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/kelime-avi/actions.ts", "src/download_unzipped.zip_unzipped/src/student/hafiza-kartlari/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/hafiza-kartlari/page.tsx", "src/download_unzipped.zip_unzipped/src/student/hafiza-kartlari/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/hafiza-kartlari/actions.ts", "src/download_unzipped.zip_unzipped/src/student/hedefi-vur/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/hedefi-vur/page.tsx", "src/download_unzipped.zip_unzipped/src/student/hedefi-vur/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/hedefi-vur/actions.ts", "src/download_unzipped.zip_unzipped/src/student/gunun-gorevi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/gunun-gorevi/actions.ts", "src/download_unzipped.zip_unzipped/src/student/eslestirme/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/eslestirme/page.tsx", "src/download_unzipped.zip_unzipped/src/student/eslestirme/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/eslestirme/actions.ts", "src/download_unzipped.zip_unzipped/src/student/dogru-yanlis-zinciri/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/dogru-yanlis-zinciri/page.tsx", "src/download_unzipped.zip_unzipped/src/student/dogru-yanlis-zinciri/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/dogru-yanlis-zinciri/actions.ts", "src/download_unzipped.zip_unzipped/src/student/ders/[ders-adi]/page.tsx", "src/download_unzipped.zip_unzipped/src/student/deneme/sonuc/[assignmentId]/page.tsx", "src/download_unzipped.zip_unzipped/src/student/deneme/sonuc/[assignmentId]/actions.ts", "src/download_unzipped.zip_unzipped/src/student/deneme/page.tsx", "src/download_unzipped.zip_unzipped/src/student/deneme/coz/page.tsx", "src/download_unzipped.zip_unzipped/src/student/deneme/actions.ts", "src/download_unzipped.zip_unzipped/src/student/cumle-olusturma/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/cumle-olusturma/page.tsx", "src/download_unzipped.zip_unzipped/src/student/cumle-olusturma/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/cumle-olusturma/actions.ts", "src/download_unzipped.zip_unzipped/src/student/bil-bakalim/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/bil-bakalim/page.tsx", "src/download_unzipped.zip_unzipped/src/student/bil-bakalim/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/bil-bakalim/actions.ts", "src/download_unzipped.zip_unzipped/src/student/ben-kimim/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/ben-kimim/page.tsx", "src/download_unzipped.zip_unzipped/src/student/ben-kimim/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/ben-kimim/actions.ts", "src/download_unzipped.zip_unzipped/src/student/adam-asmaca/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/adam-asmaca/page.tsx", "src/download_unzipped.zip_unzipped/src/student/adam-asmaca/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/adam-asmaca/actions.ts", "src/download_unzipped.zip_unzipped/src/student/acik-uclu-cevapla/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/acik-uclu-cevapla/page.tsx", "src/download_unzipped.zip_unzipped/src/student/acik-uclu-cevapla/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/acik-uclu-cevapla/actions.ts", "src/download_unzipped.zip_unzipped/src/student/activities/page.tsx", "src/download_unzipped.zip_unzipped/src/student/actions.ts", "src/download_unzipped.zip_unzipped/src/register/page.tsx", "src/download_unzipped.zip_unzipped/src/page.tsx", "src/download_unzipped.zip_unzipped/src/page-content.tsx", "src/download_unzipped.zip_unzipped/src/login/page.tsx", "src/download_unzipped.zip_unzipped/src/leaderboard/page.tsx", "src/download_unzipped.zip_unzipped/src/leaderboard/actions.ts", "src/download_unzipped.zip_unzipped/src/layout.tsx", "src/download_unzipped.zip_unzipped/src/globals.css", "src/download_unzipped.zip_unzipped/src/firestore.indexes.json", "src/download_unzipped.zip_unzipped/src/ai/genkit.ts", "src/download_unzipped.zip_unzipped/src/ai/flows/update-user-password-flow.ts", "src/download_unzipped.zip_unzipped/src/ai/flows/text-to-speech-flow.ts", "src/download_unzipped.zip_unzipped/src/ai/flows/generate-topic-summary-flow.ts", "src/download_unzipped.zip_unzipped/src/ai/flows/generate-questions-flow.ts", "src/download_unzipped.zip_unzipped/src/ai/flows/generate-lesson-content.ts", "src/download_unzipped.zip_unzipped/src/ai/flows/generate-infographic-flow.ts", "src/download_unzipped.zip_unzipped/src/ai/flows/generate-html-slide-flow.ts", "src/download_unzipped.zip_unzipped/src/ai/flows/generate-concept-map-flow.ts", "src/download_unzipped.zip_unzipped/src/ai/flows/generate-activity-data-flow.ts", "src/download_unzipped.zip_unzipped/src/ai/flows/delete-user-flow.ts", "src/download_unzipped.zip_unzipped/src/ai/dev.ts", "src/download_unzipped.zip_unzipped/src/actions/report-error.ts", "src/download_unzipped.zip_unzipped/src/actions/getPublicCurriculum.ts", "src/download_unzipped.zip_unzipped/src/.env"],
  "exclude": ["node_modules", "src/download_unzipped.zip_unzipped", "src/app/download_unzipped.zip_unzipped"]
}
```
- tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/duello/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/takim/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/kavram-duellosu/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/kavram-yarismasi/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/kavram-yarismasi/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/kavram-yarismasi/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/kutu-ac/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/takim/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/takim/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/duello/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/duello/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/bireysel/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/bireysel/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/content-creation/edit/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/content-creation/edit/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/students/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/students/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/questions/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/summer-school/layout.tsx", "src/download_unzipped.zip_unzipped/src/teacher/superadmin/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/superadmin/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/score-events/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/score-events/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/stats/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/stats/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/scales/[scaleId]/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/scales/[scaleId]/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/scales/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/scales/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/questions/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/questions/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/layout.tsx", "src/download_unzipped.zip_unzipped/src/teacher/exams/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/exams/client-page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/exams/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/error-reports/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/error-reports/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/content-creation/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/content-creation/edit/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/content-creation/edit/library-actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/content-creation/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/assignments/[assignmentId]/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/assignments/[assignmentId]/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/assignments/actions.ts", "src/download_unzipped.zip_unzipped/src/teacher/activity-data/page.tsx", "src/download_unzipped.zip_unzipped/src/teacher/activity-data/actions.ts", "src/download_unzipped.zip_unzipped/src/student/yazilacaklar/[...slug]/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yazilacaklar/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yazilacaklar/actions.ts", "src/download_unzipped.zip_unzipped/src/student/yazi-tura/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yazi-tura/oyun/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/yazi-tura/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/yazi-tura/actions.ts", "src/download_unzipped.zip_unzipped/src/student/yazi-tura/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/takim/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/takim/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/duello/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/duello/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/duello/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/bireysel/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/bireysel/page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/bireysel/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/yarismalar/bireysel/actions.ts", "src/download_unzipped.zip_unzipped/src/student/yarismalar/ayarlar/page.tsx", "src/download_unzipped.zip_unzipped/src/student/tornado/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/tornado/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/tornado/page.tsx", "src/download_unzipped.zip_unzipped/src/student/tornado/actions.ts", "src/download_unzipped.zip_unzipped/src/student/tekrar-et/page.tsx", "src/download_unzipped.zip_unzipped/src/student/tekrar-et/actions.ts", "src/download_unzipped.zip_unzipped/src/student/soru-coz/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/soru-coz/page.tsx", "src/download_unzipped.zip_unzipped/src/student/soru-coz/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/soru-coz/actions.ts", "src/download_unzipped.zip_unzipped/src/student/soru-bankasi/[courseId]/page.tsx", "src/download_unzipped.zip_unzipped/src/student/soru-bankasi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/soru-bankasi/actions.ts", "src/download_unzipped.zip_unzipped/src/student/soru-bankasi/coz/page.tsx", "src/download_unzipped.zip_unzipped/src/student/shop/page.tsx", "src/download_unzipped.zip_unzipped/src/student/shop/actions.ts", "src/download_unzipped.zip_unzipped/src/student/profile/page.tsx", "src/download_unzipped.zip_unzipped/src/student/profile/actions.ts", "src/download_unzipped.zip_unzipped/src/student/page.tsx", "src/download_unzipped.zip_unzipped/src/student/ozetler/[...slug]/page.tsx", "src/download_unzipped.zip_unzipped/src/student/ozetler/page.tsx", "src/download_unzipped.zip_unzipped/src/student/ozetler/actions.ts", "src/download_unzipped.zip_unzipped/src/student/olay-siralama/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/olay-siralama/page.tsx", "src/download_unzipped.zip_unzipped/src/student/olay-siralama/actions.ts", "src/download_unzipped.zip_unzipped/src/student/milyoner-yarismasi/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/milyoner-yarismasi/oyun/actions.ts", "src/download_unzipped.zip_unzipped/src/student/milyoner-yarismasi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/milyoner-yarismasi/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/layout.tsx", "src/download_unzipped.zip_unzipped/src/student/labirent/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/labirent/page.tsx", "src/download_unzipped.zip_unzipped/src/student/labirent/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/labirent/actions.ts", "src/download_unzipped.zip_unzipped/src/student/kutu-ac/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kutu-ac/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kutu-ac/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/kutu-ac/actions.ts", "src/download_unzipped.zip_unzipped/src/student/kavram-yarismasi/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-yarismasi/oyun/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-yarismasi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-yarismasi/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-yarismasi/actions.ts", "src/download_unzipped.zip_unzipped/src/student/kavram-avi/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-avi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-avi/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/kavram-avi/actions.ts", "src/download_unzipped.zip_unzipped/src/student/kelime-avi/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kelime-avi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/kelime-avi/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/kelime-avi/actions.ts", "src/download_unzipped.zip_unzipped/src/student/hafiza-kartlari/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/hafiza-kartlari/page.tsx", "src/download_unzipped.zip_unzipped/src/student/hafiza-kartlari/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/hafiza-kartlari/actions.ts", "src/download_unzipped.zip_unzipped/src/student/hedefi-vur/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/hedefi-vur/page.tsx", "src/download_unzipped.zip_unzipped/src/student/hedefi-vur/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/hedefi-vur/actions.ts", "src/download_unzipped.zip_unzipped/src/student/gunun-gorevi/page.tsx", "src/download_unzipped.zip_unzipped/src/student/gunun-gorevi/actions.ts", "src/download_unzipped.zip_unzipped/src/student/eslestirme/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/eslestirme/page.tsx", "src/download_unzipped.zip_unzipped/src/student/eslestirme/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/eslestirme/actions.ts", "src/download_unzipped.zip_unzipped/src/student/dogru-yanlis-zinciri/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/dogru-yanlis-zinciri/page.tsx", "src/download_unzipped.zip_unzipped/src/student/dogru-yanlis-zinciri/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/dogru-yanlis-zinciri/actions.ts", "src/download_unzipped.zip_unzipped/src/student/ders/[ders-adi]/page.tsx", "src/download_unzipped.zip_unzipped/src/student/deneme/sonuc/[assignmentId]/page.tsx", "src/download_unzipped.zip_unzipped/src/student/deneme/sonuc/[assignmentId]/actions.ts", "src/download_unzipped.zip_unzipped/src/student/deneme/page.tsx", "src/download_unzipped.zip_unzipped/src/student/deneme/coz/page.tsx", "src/download_unzipped.zip_unzipped/src/student/deneme/actions.ts", "src/download_unzipped.zip_unzipped/src/student/cumle-olusturma/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/cumle-olusturma/page.tsx", "src/download_unzipped.zip_unzipped/src/student/cumle-olusturma/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/cumle-olusturma/actions.ts", "src/download_unzipped.zip_unzipped/src/student/bil-bakalim/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/bil-bakalim/page.tsx", "src/download_unzipped.zip_unzipped/src/student/bil-bakalim/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/bil-bakalim/actions.ts", "src/download_unzipped.zip_unzipped/src/student/ben-kimim/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/ben-kimim/page.tsx", "src/download_unzipped.zip_unzipped/src/student/ben-kimim/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/ben-kimim/actions.ts", "src/download_unzipped.zip_unzipped/src/student/adam-asmaca/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/adam-asmaca/page.tsx", "src/download_unzipped.zip_unzipped/src/student/adam-asmaca/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/adam-asmaca/actions.ts", "src/download_unzipped.zip_unzipped/src/student/acik-uclu-cevapla/oyun/page.tsx", "src/download_unzipped.zip_unzipped/src/student/acik-uclu-cevapla/page.tsx", "src/download_unzipped.zip_unzipped/src/student/acik-uclu-cevapla/client-page.tsx", "src/download_unzipped.zip_unzipped/src/student/acik-uclu-cevapla/actions.ts", "src/download_unzipped.zip_unzipped/src/student/activities/page.tsx", "src/download_unzipped.zip_unzipped/src/student/actions.ts", "src/download_unzipped.zip_unzipped/src/register/page.tsx", "src/download_unzipped.zip_unzipped/src/page.tsx", "src/download_unzipped.zip_unzipped/src/page-content.tsx", "src/download_unzipped.zip_unzipped/src/login/page.tsx", "src/download_unzipped.zip_unzipped/src/leaderboard/page.tsx", "src/download_unzipped.zip_unzipped/src/leaderboard/actions.ts", "src/download_unzipped.zip_unzipped/src/layout.tsx", "src/download_unzipped.zip_unzipped/src/globals.css", "src/download_unzipped.zip_unzipped/src/firestore.indexes.json", "src/download_unzipped.zip_unzipped/src/context/theme-provider.tsx", "src/download_unzipped.zip_unzipped/src/context/auth-context.tsx", "src/download_unzipped.zip_unzipped/src/components/user-editor-dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/user-avatar.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/tooltip.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/toaster.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/toast.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/textarea.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/tabs.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/table.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/switch.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/slider.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/skeleton.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/sheet.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/separator.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/select.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/scroll-area.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/radio-group.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/progress.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/popover.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/menubar.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/label.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/input.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/form.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/dropdown-menu.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/checkbox.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/chart.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/card.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/calendar.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/button.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/badge.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/avatar.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/alert.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/alert-dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/ui/accordion.tsx", "src/download_unzipped.zip_unzipped/src/components/theme-switcher.tsx", "src/download_unzipped.zip_unzipped/src/components/student-activity-dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/selection-grid.tsx", "src/download_unzipped.zip_unzipped/src/components/question-editor-dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/question-dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/providers.tsx", "src/download_unzipped.zip_unzipped/src/components/lesson-preview-dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/lesson-content-viewer.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/zodiac-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/tesbih-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/telescope-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/spy-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/snowflake-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/shield-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/star-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/police-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/pixel-heart-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/pencil-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/music-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/lightbulb-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-z-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-y-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-v-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-uu-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-u-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-t-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-ss-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-s-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-r-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-p-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-oo-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-o-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-n-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-m-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-l-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-k-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-j-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-ii-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-i-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-h-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-gg-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-g-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-f-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-e-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-d-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-cc-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-c-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-b-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/letter-a-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/kabe-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/infinity-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/hilal-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/heart-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/gs-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/graduation-cap-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/gamepad-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/football-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/flame-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/fb-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/doctor-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/dj-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/crown-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/compass-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/chef-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/cami-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/brain-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/book-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/bolt-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/bjk-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/basketball-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/atom-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/astronaut-badge.tsx", "src/download_unzipped.zip_unzipped/src/components/icons/index.ts", "src/download_unzipped.zip_unzipped/src/components/fullscreen-toggle.tsx", "src/download_unzipped.zip_unzipped/src/components/error-report-dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/course-sidebar.tsx", "src/download_unzipped.zip_unzipped/src/components/bulk-step-import-dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/bulk-activity-import-dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/bottom-nav-bar.tsx", "src/download_unzipped.zip_unzipped/src/components/auth-guard.tsx", "src/download_unzipped.zip_unzipped/src/components/app-header.tsx", "src/download_unzipped.zip_unzipped/src/components/ai-lesson-step-generation-dialog.tsx", "src/download_unzipped.zip_unzipped/src/components/ai-activity-generation-panel.tsx", "src/download_unzipped.zip_unzipped/src/lib/utils.ts", "src/download_unzipped.zip_unzipped/src/lib/types.ts", "src/download_unzipped.zip_unzipped/src/lib/shop-config.ts", "src/download_unzipped.zip_unzipped/src/lib/quiz-actions.ts", "src/download_unzipped.zip_unzipped/src/lib/game-config.ts", "src/download_unzipped.zip_unzipped/src/lib/generic-words.ts", "src/download_unzipped.zip_unzipped/src/lib/firebase.ts", "src/download_unzipped.zip_unzipped/src/lib/firebase-admin.ts", "src/download_unzipped.zip_unzipped/src/lib/audio-service.ts", "src/download_unzipped.zip_unzipped/src/hooks/use-toast.ts", "src/download_unzipped.zip_unzipped/src/hooks/use-auth.ts"],
  "exclude": ["node_modules", "src/download_unzipped.zip_unzipped", "src/app/download_unzipped.zip_unzipped"]
}
```

- I will remove the ```` from `src/app/teacher/smartboard/takim/oyun/page.tsx`
- I will also fix `tsconfig.json`. The `include` section has a lot of files from `src/download_unzipped.zip_unzipped`. I will remove them.Tamamdır, bu `Unexpected eof` hatası can sıkıcı bir hal aldı. Tekrar tekrar aynı hatayı aldığınız için üzgünüm. `src/app/teacher/smartboard/takim/oyun/page.tsx` dosyasının sonunda kalan gereksiz karakterleri temizlerken bir hata yapmışım.

Bu sorunu kesin olarak çözmek için, `src/app/teacher/smartboard/takim/oyun/page.tsx` dosyasını dikkatlice tekrar düzenliyor ve sonundaki tüm fazladan karakterleri temizleyerek dosyanın doğru bir şekilde bitmesini sağlıyorum.

Ek olarak, `tsconfig.json` dosyasındaki `include` bölümüne yanlışlıkla eklenmiş olan geçici dosya yollarını da temizleyerek projenizin yapılandırmasını düzeltiyorum.

<changes>
  <description>Takım yarışması oyun sayfasındaki beklenmedik dosya sonu (EOF) hatasını düzeltmek için dosyanın sonundaki geçersiz karakterler temizlendi ve tsconfig.json dosyasındaki gereksiz yollar kaldırıldı.</description>
  <change>
    <file>/home/user/studio/src/app/teacher/smartboard/takim/oyun/page.tsx</file>
    <content><![CDATA[
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
import { doc, getDoc, collection, query, where } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
                        <DialogTitle>Yaz Okulu Havuzuna Yeni Öğrenci Ekle</DialogTitle>
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

function CompetitionComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSubmittingScores, setIsSubmittingScores] = useState(false);
    const [scoresHaveBeenSaved, setScoresHaveBeenSaved] = useState(false);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const router = useRouter();


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
    
    const [inGameCompetitors, setInGameCompetitors] = useState<GameCompetitor[]>([]);

    const [activeCompetitorId, setActiveCompetitorId] = useState<string | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);

    const [currentView, setCurrentView] = useState<'leaderboard' | 'questions'>('leaderboard');
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [winner, setWinner] = useState<GameCompetitor | null>(null);
    
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
            const params: GetQuizInput = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: parseInt(searchParams.get('questionCount') || '20'),
                difficulty: searchParams.get('difficulty')?.split(','),
                questionTypes: searchParams.get('questionTypes')?.split(','),
            };
            const questionResult = await getQuestionsFromBank(params as any);

            if ('error' in questionResult) {
                setError(questionResult.error);
            } else if (questionResult.questions) {
                setQuestions(questionResult.questions);
            } else {
                setError("Uygun soru bulunamadı.");
            }

            const classId = searchParams.get('classId');
            if (classId) {
                const classDoc = await getDoc(doc(db, "classes", classId));
                if (classDoc.exists()) {
                    const classData = { id: classDoc.id, ...classDoc.data() } as SchoolClass;
                    setCurrentClass(classData);
                    const studentsQuery = query(collection(db, "users"), where("class", ">=", classData.name), where("class", "<", classData.name + '\uf8ff'));
                    const studentsSnapshot = await getDocs(studentsQuery);
                    setStudentPool(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
                } else {
                    setError("Sınıf bilgisi bulunamadı.");
                }
            } else {
                // Handle cases without a classId if needed, e.g., summer school
                 const studentsQuery = query(collection(db, "users"), where("class", "==", SUMMER_SCHOOL_CLASS_NAME));
                 const studentsSnapshot = await getDocs(studentsQuery);
                 setStudentPool(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
            }

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
        if (scoresHaveBeenSaved || inGameCompetitors.length === 0) {
            if (andFinish && gameState !== 'finished') setGameState('finished');
            return;
        }

        setIsSubmittingScores(true);
        
        const scoreUpdates = inGameCompetitors.map(c => ({ 
            userId: c.uid, 
            points: c.score,
            gameType: 'smartboard_bireysel' as const,
            context: `${searchParams.get('courseName') || 'Genel'} - ${searchParams.get('topicName') || 'Genel'}`
        }));

        if (scoreUpdates.every(u => u.points === 0) && andFinish) {
             toast({ title: "Skor Yok", description: "Kaydedilecek puan bulunmuyor." + (andFinish ? " Yarışma sonlandırılıyor." : "") });
        } else {
            const result = await updateMultipleStudentScores(scoreUpdates);
            if (result.success) {
                toast({ title: "Skorlar Kaydedildi", description: "Yarışma skorları öğrenci profillerine eklendi." });
                setScoresHaveBeenSaved(true);
            } else {
                toast({ title: "Hata", description: result.error, variant: "destructive" });
                setIsSubmittingScores(false);
                return; // Stop if saving fails
            }
        }
        
        if (andFinish) {
            const finalSorted = [...inGameCompetitors].sort((a,b) => b.score - a.score);
            if (finalSorted.length > 0) {
                setWinner(finalSorted[0]);
            }
            setGameState('finished');
        }
        setIsSubmittingScores(false);
    }, [scoresHaveBeenSaved, inGameCompetitors, searchParams, toast, gameState]);

    const handleAddStudent = async (displayName: string, className: string) => {
        if (!displayName.trim()) return;
        setIsAddingStudent(true);
        const result = await addStudentToClass(displayName, className);
        if (result.success && result.newUser) {
            toast({ title: "Başarılı", description: `${displayName} havuza eklendi.` });
            setStudentPool(prev => [...prev, result.newUser!]);
            setIsAddStudentOpen(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsAddingStudent(false);
    };

    const studentsInBranch = useMemo(() => {
        if (!currentClass) {
            return studentPool; // For summer school scenario or if class fails to load
        }
        if (selectedBranch === 'all') {
            return studentPool.filter(s => s.class?.startsWith(currentClass.name));
        }

        const branchClassName = `${currentClass.name} - ${selectedBranch}`;
        const poolClassName = `${branchClassName} (Havuz)`;
        return studentPool.filter(s => s.class === branchClassName || s.class === poolClassName);
    }, [studentPool, currentClass, selectedBranch]);


    const addCompetitorToGame = (competitor: UserProfile) => {
        if(inGameCompetitors.some(c => c.uid === competitor.uid)) return;
        const newCompetitor: GameCompetitor = { uid: competitor.uid, displayName: competitor.displayName, avatar: competitor.avatar, score: 0 };
        setInGameCompetitors(prev => [...prev, newCompetitor]);
    };

    const removeCompetitorFromGame = (competitorId: string) => {
        setInGameCompetitors(prev => prev.filter(c => c.uid !== competitorId));
        if (activeCompetitorId === competitorId) {
            setActiveCompetitorId(null);
        }
    };
    
    const addAllFromPoolToGame = () => {
        const newCompetitors = studentsInBranch
            .filter(p => !inGameCompetitors.some(igc => igc.uid === p.uid))
            .map(p => ({ uid: p.uid, displayName: p.displayName, avatar: p.avatar, score: 0 }));

        setInGameCompetitors(prev => [...prev, ...newCompetitors]);
    };

    const removeAllFromGame = () => {
        setInGameCompetitors([]);
        setActiveCompetitorId(null);
    };
    
    const handleBranchSelect = (branch: string) => {
        setSelectedBranch(branch);
        // Do not reset competitors when changing branch, just filter the pool
    };

    const handleOpenQuestion = (number: number, question: GameQuestion) => {
        if (!activeCompetitorId) {
            toast({ title: 'Hata', description: 'Lütfen bir yarışmacı seçin!', variant: 'destructive'});
            return;
        }
        setOpenedQuestion({ number, question });
    };

    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        if (!activeCompetitorId || gameState === 'finished') return;
        
        let winnerFound: GameCompetitor | null = null;

        const updatedCompetitors = inGameCompetitors.map(c => {
            if (c.uid === activeCompetitorId) {
                const newScore = Math.max(0, c.score + scoreChange);
                const updatedCompetitor = { ...c, score: newScore };
                if (finishScore > 0 && newScore >= finishScore) {
                    winnerFound = updatedCompetitor;
                }
                return updatedCompetitor;
            }
            return c;
        });

        setInGameCompetitors(updatedCompetitors);
        setAnsweredQuestions([...answeredQuestions, questionNumber]);
        setOpenedQuestion(null);
        setCurrentView('leaderboard');

        if (winnerFound) {
            setWinner(winnerFound);
            setGameState('finished');
        }
    };
    
    useEffect(() => {
        if (gameState === 'playing' && questions.length > 0 && answeredQuestions.length === questions.length) {
            handleSaveScores(true);
        }
    }, [gameState, answeredQuestions.length, questions.length, handleSaveScores]);

    const startNewGame = () => {
        window.location.reload();
    };

    const handleSelectRandomQuestion = () => {
        if (!activeCompetitorId) {
            toast({ title: 'Hata', description: 'Lütfen bir yarışmacı seçin!', variant: 'destructive'});
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

    const sortedCompetitors = useMemo(() =>
        [...inGameCompetitors].sort((a, b) => b.score - a.score),
    [inGameCompetitors]);

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
                            <Link href="/teacher/smartboard/bireysel"><ArrowLeft className="mr-2 h-4 w-4" /> Kuruluma Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <div className={cn("p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-screen", isFullscreen ? "h-screen w-screen m-0" : "container mx-auto")}>
                <Card className={cn("w-full max-w-xl text-center bg-card/70 backdrop-blur-sm", isFullscreen && "h-full w-full max-w-none flex flex-col justify-center")}>
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Yarışma Tamamlandı!</CardTitle>
                        <CardDescription>Harika iş çıkardın!</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Award className="h-24 w-24 text-amber-400" />
                         {winner && <p className="text-2xl">
                            Kazanan: <span className="font-bold text-primary">{winner.displayName}</span>
                        </p>}
                        
                        <div className="w-full mt-4 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sıra</TableHead>
                                        <TableHead>Öğrenci</TableHead>
                                        <TableHead className="text-right">Puan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedCompetitors.map((player, index) => (
                                        <TableRow key={player.uid}>
                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                            <TableCell>{player.displayName}</TableCell>
                                            <TableCell className="text-right font-bold">{player.score}</TableCell>
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
                         <Button asChild variant="outline">
                           <Link href="/teacher/smartboard/leaderboard">
                                <Trophy className="mr-2 h-4 w-4" /> Turnuva Liderliği
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/teacher/smartboard">
                                <Home className="mr-2 h-4 w-4" /> Panele Dön
                            </Link>
                        </Button>
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
                    <Button 
                        variant="destructive" 
                        onClick={() => handleSaveScores(true)} 
                        disabled={isSubmittingScores || scoresHaveBeenSaved || inGameCompetitors.length === 0}
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

            <Tabs defaultValue="leaderboard" value={currentView} onValueChange={(value) => setCurrentView(value as 'leaderboard' | 'questions')} className={cn("space-y-4", isFullscreen ? "flex-grow flex flex-col overflow-hidden" : "")}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="leaderboard">Liderlik Tablosu</TabsTrigger>
                    <TabsTrigger value="questions">Sorular</TabsTrigger>
                </TabsList>
                <TabsContent value="leaderboard" className={cn(isFullscreen && "flex-grow min-h-0")}>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                        <div className={cn("lg:col-span-2 space-y-4", isFullscreen && "h-full flex flex-col")}>
                             <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "flex-grow flex flex-col")}>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="flex items-center gap-2"><Crown className="text-yellow-500"/> Liderlik Tablosu</CardTitle>
                                        <Button variant="outline" size="sm" onClick={removeAllFromGame} disabled={inGameCompetitors.length === 0}>
                                            <UserMinus className="mr-2 h-4 w-4"/> Tüm Yarışmacıları Çıkar
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className={cn("flex flex-col", isFullscreen && "flex-grow min-h-0")}>
                                    <div className={cn("flex-1", isFullscreen && "overflow-hidden")}>
                                        <ScrollArea className={cn(isFullscreen ? "h-full" : "h-[50vh]")}>
                                            {sortedCompetitors.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                    {sortedCompetitors.map((player, index) => {
                                                        const teamIndex = teams.findIndex(t => t.students.some(s => s.uid === player.uid));
                                                        const team = teams[teamIndex];
                                                        const colorClass = bgColors[teamIndex % bgColors.length];
                                                        const hoverColorClass = hoverBgColors[teamIndex % hoverBgColors.length];
                                                        const isActive = activeTeamId !== null && teams[activeTeamId]?.students.some(s => s.uid === player.uid);
                                                        return (
                                                            <Card 
                                                                key={player.uid} 
                                                                className={cn(
                                                                    'relative group cursor-pointer transition-all text-white border-transparent p-2',
                                                                    colorClass,
                                                                    hoverColorClass,
                                                                    isActive && `ring-4 ring-offset-background ring-offset-2 ring-white/80`
                                                                )}
                                                            >
                                                                 <div className="flex items-center justify-between">
                                                                    <span className="font-bold text-lg">{player.displayName}</span>
                                                                    <span className="text-3xl font-bold">{player.score}</span>
                                                                 </div>
                                                            </Card>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-muted-foreground flex-grow flex items-center justify-center">
                                                    <p>Yarışmaya başlamak için aşağıdaki havuzdan yarışmacı ekleyin.</p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        
                        {!isFullscreen && (
                            <div className="lg:col-span-1">
                                <Card className="bg-card/70 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-center">
                                            <span>Öğrenci Havuzu</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Button size="sm" className="w-full mb-2" onClick={addAllFromPoolToGame} disabled={filteredStudents.every(s => inGameCompetitors.some(c => c.uid === s.uid)) || filteredStudents.length === 0}>Tümünü Ekle</Button>
                                         <ScrollArea className="h-80">
                                            {isPoolLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div> :
                                            filteredStudents.length > 0 ? filteredStudents.map(s => <StudentListItem key={s.uid} student={s} onAddToGame={addCompetitorToGame} isAdded={inGameCompetitors.some(c => c.uid === s.uid)} />) :
                                            <p className="text-center text-sm text-muted-foreground p-4">Havuzda öğrenci yok.</p>}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                     </div>
                </TabsContent>
                <TabsContent value="questions" className={cn(isFullscreen && "flex-grow min-h-0")}>
                    <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "h-full flex flex-col")}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={activeTeamId === null}><Shuffle className="mr-2 h-4 w-4" /> Rastgele Seç</Button>
                                    {activeTeamId !== null && <Badge variant="secondary">Sıra: {teams.find(t=>t.id===activeTeamId)?.name}</Badge>}
                                </div>
                            </CardTitle>
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
                                            isQuestionAnswered ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed" : colorClasses[i % colorClasses.length]
                                        )}
                                        disabled={isQuestionAnswered || activeTeamId === null}
                                        onClick={() => !isQuestionAnswered && setOpenedQuestion({ number: questionNumber, question: q })}
                                        title={activeTeamId === null ? "Soruyu açmak için bir yarışmacı seçin" : `Soru ${questionNumber}`}
                                    >
                                        {isQuestionAnswered ? <Check className="h-6 w-6 text-white" /> : questionNumber}
                                    </Button>
                                )
                            })}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
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
