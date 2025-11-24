
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const SUMMER_SCHOOL_CLASS_NAME = "Yaz Okulu Havuzu";

type GameQuestion = GetQuizOutput['questions'][0];

type GameCompetitor = {
    uid: string;
    displayName: string;
    avatar?: string;
    score: number;
};

type Team = {
    id: number;
    name: string;
    color: string;
    students: UserProfile[];
    score: number;
    currentPlayerIndex: number;
};

type TeamForUrl = {
    id: number;
    name: string;
    color: string;
    playerUids: string[];
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
    
    const pointsConfig = useMemo(() => {
        const param = searchParams.get('points');
        try { return param ? JSON.parse(param) : { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }}; }
        catch { return { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }}; }
    }, [searchParams]);

    const penaltyConfig = useMemo(() => {
        const param = searchParams.get('penalty');
        try { return param ? JSON.parse(param) : { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }}; }
        catch { return { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }}; }
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

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        try {
            const teamsParam = searchParams.get('teams');
            if (!teamsParam) throw new Error("Takım bilgileri eksik.");
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
                currentPlayerIndex: 0,
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
            else if (result.questions) setQuestions(result.questions);
            else setError("Uygun soru bulunamadı.");
        } catch (e: any) { setError("Oyun verileri yüklenirken bir hata oluştu: " + e.message); }
        finally { setIsLoading(false); }
    }, [searchParams]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);

    const handleSaveScores = async (andFinish: boolean = false) => {
        if (scoresHaveBeenSaved || teams.flatMap(t => t.students).length === 0) {
            if (andFinish && gameState !== 'finished') setGameState('finished');
            return;
        }

        setIsSubmittingScores(true);
        
        const scoreUpdates = teams.flatMap(team => team.students.map(student => ({
            userId: student.uid,
            points: Math.round(team.score / team.students.length) || 0,
            gameType: 'smartboard_takim' as const,
            context: `${searchParams.get('courseName') || 'Genel'} - ${searchParams.get('topicName') || 'Genel'}`
        }))).filter(update => update.points > 0);

        if (scoreUpdates.length === 0) {
             toast({ title: "Skor Yok", description: "Kaydedilecek puan bulunmuyor." + (andFinish ? " Yarışma sonlandırılıyor." : "") });
        } else {
            const result = await updateMultipleStudentScores(scoreUpdates);
            if (result.success) {
                toast({ title: "Skorlar Kaydedildi", description: "Takım skorları oyuncu profillerine eklendi." });
            } else {
                toast({ title: "Hata", description: result.error, variant: "destructive" });
            }
        }
        
        setScoresHaveBeenSaved(true);
        if (andFinish) {
            setGameState('finished');
        }
        setIsSubmittingScores(false);
    };

    useEffect(() => {
        if (gameState !== 'playing' || !questions.length || answeredQuestions.length === 0) return;
        if (answeredQuestions.length === questions.length) {
            const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
            if (sortedTeams.length > 0 && sortedTeams[0].score > (sortedTeams[1]?.score ?? -Infinity)) {
                 setWinner(sortedTeams[0]);
            } else {
                setWinner('draw');
            }
            handleSaveScores(true);
        }
    }, [gameState, teams, answeredQuestions.length, questions.length, handleSaveScores]);

    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
      if (!activeTeamId || gameState !== 'playing') return;
      const finishScore = parseInt(searchParams.get('finishScore') || '0');
      
      let winnerFound: Team | null = null;
      
      setTeams(prevTeams => prevTeams.map(t => {
          if (t.id === activeTeamId) {
              const newScore = Math.max(0, t.score + scoreChange);
              const updatedTeam = { ...t, score: newScore, currentPlayerIndex: (t.currentPlayerIndex + 1) % t.students.length };
              if (finishScore > 0 && newScore >= finishScore) {
                  winnerFound = updatedTeam;
              }
              return updatedTeam;
          }
          return t;
      }));
      
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
    
    if (isLoading) return <CompetitionLoadingSkeleton />;
    
    return (
        <div className={cn("p-4 sm:p-6 md:p-8", isFullscreen ? "h-screen w-screen m-0 flex flex-col" : "container mx-auto")}>
             {/* Component implementation... */}
        </div>
    )
}


function TeamScoreCard({ team, isActive, colorIndex, rank, isFullscreen, activePlayerName }: { team: Team, isActive: boolean, colorIndex: number, rank: number, isFullscreen: boolean, activePlayerName?: string }) {
    const colorClasses = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
    const ringClasses = ['ring-chart-1', 'ring-chart-2', 'ring-chart-3', 'ring-chart-4', 'ring-chart-5'];
    const bgColor = colorClasses[colorIndex % colorClasses.length];
    const ringColor = ringClasses[colorIndex % ringClasses.length];
    
    const getInitials = (name?: string): string => {
        if (!name) return '?';
        return name.trim().charAt(0).toLocaleUpperCase('tr-TR');
    };

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
            <div className="mt-auto text-center">
                {isActive && activePlayerName && (
                    <p className="text-sm font-semibold animate-pulse">Sıradaki Oyuncu: {activePlayerName}</p>
                )}
            </div>
        </div>
    );
}

export default function SmartboardTakimOyunPage() {
    return <Suspense fallback={<div>Yükleniyor...</div>}><CompetitionComponent /></Suspense>
}

    