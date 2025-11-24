
"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserMinus, ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, BrainCircuit, Check, Trash2, Users, Shuffle, PartyPopper, Star, Award, Trophy } from "lucide-react";
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


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
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
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
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSubmittingScores, setIsSubmittingScores] = useState(false);
    const [scoresHaveBeenSaved, setScoresHaveBeenSaved] = useState(false);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false);

    const questionTimer = parseInt(searchParams.get('questionTimer') || '0');

    useEffect(() => {
        const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Get setup parameters from URL
    const finishScore = parseInt(searchParams.get('finishScore') || '0');

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
                isStatic: searchParams.get('isStatic') === 'true'
            };
            const questionResult = await getQuestionsFromBank(params);

            if ('error' in questionResult) {
                setError(questionResult.error);
            } else if (questionResult.questions && questionResult.questions.length > 0) {
                setQuestions(questionResult.questions);
            } else {
                setError("Belirtilen kriterlere uygun soru bulunamadı.");
            }

            const classId = searchParams.get('classId');
            if (classId) {
                const classDoc = await getDoc(doc(db, "classes", classId));
                if (classDoc.exists()) {
                    const classData = { id: classDoc.id, ...classDoc.data() } as SchoolClass;
                    setCurrentClass(classData);
                    const studentsQuery = query(collection(db, "users"), where("class", ">=", classData.name), where("class", "<", classData.name + '\uf8ff'), where("role", "==", "guest"));
                    const studentsSnapshot = await getDocs(studentsQuery);
                    setStudentPool(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
                } else {
                    setError("Sınıf bilgisi bulunamadı.");
                }
            } else {
                // Handle cases without a classId if needed, e.g., summer school
                 const studentsQuery = query(collection(db, "users"), where("class", "==", SUMMER_SCHOOL_CLASS_NAME), where("role", "==", "guest"));
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

        if (scoreUpdates.every(u => u.points === 0)) {
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
                        <Link href="/teacher/summer-school/smartboard/bireysel"><ArrowLeft className="mr-2 h-4 w-4" /> Kurulumu Değiştir</Link>
                    </Button>
                </div>
            </div>

            <div className={cn("space-y-8", isFullscreen ? "flex-grow flex flex-col overflow-hidden" : "")}>
                {currentView === 'leaderboard' ? (
                     <div className="space-y-8 h-full flex flex-col">
                        <div className={cn(isFullscreen && "flex-grow min-h-0")}>
                             <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "flex-grow flex flex-col h-full")}>
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
                                        <ScrollArea className={cn(isFullscreen ? "h-full" : "h-auto")}>
                                            {sortedCompetitors.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                    {sortedCompetitors.map((player, index) => {
                                                        const colorClass = bgColors[index % bgColors.length];
                                                        const hoverColorClass = hoverBgColors[index % hoverBgColors.length];
                                                        const isActive = activeCompetitorId === player.uid;
                                                        return (
                                                             <Card 
                                                                key={player.uid} 
                                                                onClick={() => setActiveCompetitorId(player.uid)}
                                                                className={cn(
                                                                    'relative group cursor-pointer transition-all text-white border-transparent',
                                                                    colorClass,
                                                                    hoverColorClass,
                                                                    isActive && `ring-4 ring-offset-background ring-offset-2 ring-white/80`
                                                                )}
                                                            >
                                                                <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7 text-white/70 hover:bg-white/20 hover:text-white opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeCompetitorFromGame(player.uid)}} title="Yarışmadan çıkar">
                                                                    <Trash2 className="h-4 w-4"/>
                                                                </Button>
                                                                <CardContent className="p-4 flex items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-white/50 bg-white/20 font-bold text-lg">
                                                                            {index === 0 && <Crown className="h-6 w-6 text-yellow-400" />}
                                                                            {index === 1 && <Award className="h-6 w-6 text-gray-400" />}
                                                                            {index === 2 && <Award className="h-6 w-6 text-orange-400" />}
                                                                            {index > 2 && (index + 1)}
                                                                        </div>
                                                                        <div className="truncate">
                                                                            <p className="font-bold text-lg truncate">{player.displayName}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-4xl font-bold">{player.score}</p>
                                                                    </div>
                                                                </CardContent>
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
                                            <span>Yaz Okulu Öğrenci Havuzu</span>
                                            <Button size="sm" variant="outline" onClick={() => setIsAddStudentOpen(true)}>
                                                <UserPlus className="mr-2 h-4 w-4" /> Yeni Öğrenci
                                            </Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Button size="sm" className="w-full mb-2" onClick={addAllFromPoolToGame} disabled={studentPool.every(s => inGameCompetitors.some(c => c.uid === s.uid)) || studentPool.length === 0}>Tümünü Ekle</Button>
                                         <ScrollArea className="h-80">
                                            {isPoolLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div> :
                                            studentPool.length > 0 ? studentPool.map(s => <StudentListItem key={s.uid} student={s} onAddToGame={addCompetitorToGame} isAdded={inGameCompetitors.some(c => c.uid === s.uid)} />) :
                                            <p className="text-center text-sm text-muted-foreground p-4">Havuzda öğrenci yok.</p>}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="lg:col-span-3">
                         <Card className={cn("bg-card/70 backdrop-blur-sm", isFullscreen && "flex-grow flex flex-col")}>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={handleSelectRandomQuestion} disabled={!activeCompetitorId}>
                                            <Shuffle className="mr-2 h-4 w-4" /> Rastgele Seç
                                        </Button>
                                        <Button variant="outline" onClick={() => setCurrentView('leaderboard')}>
                                            <ArrowLeft className="mr-2 h-4 w-4"/> Liderlik Tablosu
                                        </Button>
                                    </div>
                                </CardTitle>
                                <CardDescription>Sıradaki: {inGameCompetitors.find(c => c.uid === activeCompetitorId)?.displayName}</CardDescription>
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
                                            disabled={isQuestionAnswered || !activeCompetitorId}
                                            onClick={() => !isQuestionAnswered && handleOpenQuestion(questionNumber, q)}
                                            title={!activeCompetitorId ? "Soruyu açmak için bir yarışmacı seçin" : `Soru ${questionNumber}`}
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
- src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/page.tsx:
```tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MonitorPlay, Sun, User, Users, Swords, ArrowRight } from 'lucide-react';
import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';


const FeatureButton = ({ href, title, description, icon, colorClass }: { href: string, title: string, description:string, icon: ReactNode, colorClass: string }) => {
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

export default function SummerSmartboardPage() {
  const buttons = [
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
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 space-y-12 h-full bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center animate-fade-in-up">
            <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary">Yaz Kursu Yarışmaları</h1>
            <p className="text-muted-foreground mt-4 text-xl md:text-2xl">Yaz kursu öğrencileriniz için bir yarışma türü seçin.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl h-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {buttons.map((buttonProps, index) => <div key={index} className="h-80"><FeatureButton {...buttonProps} /></div>)}
        </div>
    </div>
  );
}

```
- src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/takim/client-page.tsx:
```tsx
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
```
- src/download_unzipped.zip_unzipped/src/teacher/summer-school/smartboard/takim/page.tsx:
```tsx
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
```
- src/download_unzipped.zip_unzipped/src/teacher/summer-school/students/page.tsx:
```tsx
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
```
- storage.rules:
```rules
rules_version = '2';

// Craft rules based on data in your Firestore database
// allow write: if firestore.get(
//    /databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin;
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```
- tailwind.config.ts:
```ts
import type {Config} from 'tailwindcss';

const colorNames = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Creates a regex pattern like: /^(bg|text|border)-(slate|gray|...)-(50|100|...)$/
const colorPattern = new RegExp(
  `^(bg|text|border|ring|fill|stroke)-(${colorNames.join('|')})-(${shades.join('|')})$`
);


export default {
  darkMode: ['class'],
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    {
      pattern: colorPattern,
    },
    {
      pattern: /bg-chart-(1|2|3|4|5)/,
    }
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['"Inter"', 'sans-serif'],
        headline: ['"Poppins"', 'serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "shake": {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        "shake-game": {
            "0%": { transform: "translateX(0)" },
            "25%": { transform: "translateX(-5px)" },
            "50%": { transform: "translateX(5px)" },
            "75%": { transform: "translateX(-5px)" },
            "100%": { transform: "translateX(0)" },
        },
        "tada": {
          "0%": { transform: "scale(1)" },
          "10%, 20%": { transform: "scale(0.9) rotate(-3deg)" },
          "30%, 50%, 70%, 90%": { transform: "scale(1.1) rotate(3deg)" },
          "40%, 60%, 80%": { transform: "scale(1.1) rotate(-3deg)" },
          "100%": { transform: "scale(1) rotate(0)" }
        },
        "bubbleFloat": {
            "0%": { transform: "translate(0px, 0px) scale(1)", opacity: "0.9" },
            "50%": { transform: "translate(var(--translate-x), var(--translate-y)) scale(1.02)", opacity: "0.95" },
            "100%": { transform: "translate(0px, 0px) scale(1)", opacity: "0.9" },
        },
        "fadeAndScaleIn": {
            from: { opacity: "0", transform: "scale(0.9)" },
            to: { opacity: "1", transform: "scale(1)" },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "shake": "shake 0.82s cubic-bezier(.36,.07,.19,.97) both",
        "tada": "tada 1s ease-in-out",
        "shake-game": "shake-game .3s ease-out",
        "bubbleFloat": "bubbleFloat var(--animation-duration, 5s) ease-in-out var(--animation-delay, 0s) infinite alternate",
        "fadeAndScaleIn": "fadeAndScaleIn .3s ease-out",
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;
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
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```