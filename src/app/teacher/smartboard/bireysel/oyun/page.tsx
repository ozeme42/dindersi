'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    UserMinus, ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, 
    BrainCircuit, Check, Trash2, Users, Shuffle, PartyPopper, Star, 
    Award, Trophy, UserPlus, MonitorPlay, Save, LogOut 
} from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { SchoolClass, UserProfile, GetQuizInput, GetQuizOutput, Question } from "@/lib/types";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { playSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateMultipleStudentScores } from '@/app/teacher/smartboard/actions';
import { QuestionDialog } from "@/components/question-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { addStudentToClass } from "@/app/teacher/students/actions";
import { useAuth } from "@/context/auth-context";

const SUMMER_SCHOOL_CLASS_NAME = "Yaz Okulu Havuzu";

type GameQuestion = GetQuizOutput['questions'][0];

type GameCompetitor = {
    uid: string;
    displayName: string;
    avatar?: string;
    score: number;
};

// --- RENK TEMALARI ---
const CARD_THEMES = [
    { name: 'blue', border: 'border-blue-500', activeBorder: 'border-blue-300', shadow: 'shadow-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', line: 'bg-blue-500', scoreBg: 'bg-blue-950/50' },
    { name: 'emerald', border: 'border-emerald-500', activeBorder: 'border-emerald-300', shadow: 'shadow-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', line: 'bg-emerald-500', scoreBg: 'bg-emerald-950/50' },
    { name: 'violet', border: 'border-violet-500', activeBorder: 'border-violet-300', shadow: 'shadow-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-400', line: 'bg-violet-500', scoreBg: 'bg-violet-950/50' },
    { name: 'amber', border: 'border-amber-500', activeBorder: 'border-amber-300', shadow: 'shadow-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', line: 'bg-amber-500', scoreBg: 'bg-amber-950/50' },
    { name: 'rose', border: 'border-rose-500', activeBorder: 'border-rose-300', shadow: 'shadow-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-400', line: 'bg-rose-500', scoreBg: 'bg-rose-950/50' },
    { name: 'cyan', border: 'border-cyan-500', activeBorder: 'border-cyan-300', shadow: 'shadow-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-400', line: 'bg-cyan-500', scoreBg: 'bg-cyan-950/50' },
    { name: 'fuchsia', border: 'border-fuchsia-500', activeBorder: 'border-fuchsia-300', shadow: 'shadow-fuchsia-500/30', bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', line: 'bg-fuchsia-500', scoreBg: 'bg-fuchsia-950/50' },
    { name: 'lime', border: 'border-lime-500', activeBorder: 'border-lime-300', shadow: 'shadow-lime-500/30', bg: 'bg-lime-500/10', text: 'text-lime-400', line: 'bg-lime-500', scoreBg: 'bg-lime-950/50' },
];

// --- YARDIMCI BİLEŞENLER ---

const RankIcon = ({ rank }: { rank: number }) => {
    if (rank === 0) return <Crown className="h-6 w-6 text-yellow-400 fill-yellow-400/20 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] animate-pulse" />;
    if (rank === 1) return <Award className="h-6 w-6 text-slate-300 fill-slate-300/20" />;
    if (rank === 2) return <Award className="h-6 w-6 text-amber-600 fill-amber-600/20" />;
    return <span className="text-lg font-bold text-slate-500 w-6 text-center">#{rank + 1}</span>;
};

// Yarışmacı Kartı (RENKLİ & KOMPAKT & 4 SÜTUN UYUMLU)
const TeamScoreCard = ({ competitor, isActive, rank, onClick, onRemove }: { competitor: GameCompetitor, isActive: boolean, rank: number, onClick: () => void, onRemove: (e: React.MouseEvent) => void }) => {
    
    // Sıraya göre renk temasını seç
    const theme = CARD_THEMES[rank % CARD_THEMES.length];

    return (
        <div 
            onClick={onClick}
            className={cn(
                "relative group cursor-pointer transition-all duration-200 transform rounded-xl border-2 overflow-hidden h-16 flex items-center pr-3",
                // Varsayılan: Hafif renkli arka plan
                "backdrop-blur-sm shadow-sm",
                isActive 
                    ? cn("bg-slate-800 scale-[1.02] z-10 shadow-lg", theme.activeBorder, theme.shadow) 
                    : cn("bg-slate-900/60 hover:bg-slate-800 hover:-translate-y-1", theme.border.replace('border-', 'border-opacity-30 hover:border-opacity-100 border-'))
            )}
        >
            {/* Sol Kenar Çizgisi (Neon) */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-2 transition-all duration-300", 
                theme.line
            )} />

            <div className="flex items-center gap-3 pl-5 w-full">
                {/* Sıralama */}
                <div className="flex-shrink-0 flex justify-center items-center w-8">
                    <RankIcon rank={rank} />
                </div>

                {/* Avatar */}
                <Avatar className={cn("h-10 w-10 border-2 transition-colors", isActive ? theme.activeBorder : "border-slate-700")}>
                    <AvatarImage src={competitor.avatar || ''} />
                    <AvatarFallback className="bg-slate-800 text-slate-300 font-bold text-xs">{competitor.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>

                {/* İsim */}
                <div className="truncate flex-1 min-w-0">
                    <p className={cn(
                        "font-bold text-base truncate transition-colors", 
                        isActive ? "text-white" : "text-slate-200 group-hover:text-white"
                    )}>
                        {competitor.displayName}
                    </p>
                </div>

                {/* Puan */}
                <div className={cn(
                    "text-right px-3 py-1 rounded-lg min-w-[3.5rem] transition-colors", 
                    isActive ? theme.scoreBg : "bg-black/20"
                )}>
                    <span className={cn(
                        "block text-xl font-black tabular-nums", 
                        isActive ? theme.text : "text-white"
                    )}>
                        {competitor.score}
                    </span>
                </div>
            </div>

            {/* Silme Butonu (Sadece Hoverda) */}
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-1 right-1 h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                onClick={onRemove}
            >
                <Trash2 className="h-3 w-3" />
            </Button>
        </div>
    );
};

// Öğrenci Listesi Öğesi
const StudentListItem = ({ student, onAddToGame, isAdded }: { student: UserProfile, onAddToGame: (student: UserProfile) => void, isAdded: boolean }) => (
    <div className={cn(
        "flex items-center justify-between p-2 px-3 rounded-lg border transition-all duration-200 group cursor-pointer h-12", 
        isAdded 
            ? "bg-slate-900/20 border-slate-800/50 opacity-40 cursor-not-allowed grayscale" 
            : "bg-slate-900/60 border-white/5 hover:border-emerald-500/50 hover:bg-emerald-900/10 hover:shadow-emerald-900/20 hover:shadow-md"
    )} onClick={() => !isAdded && onAddToGame(student)}>
        <div className="flex items-center gap-3 overflow-hidden">
             <Avatar className="h-8 w-8 border border-slate-700 group-hover:border-emerald-400 transition-colors">
                 <AvatarImage src={student.avatar || ''} />
                <AvatarFallback className="bg-slate-800 text-slate-300 font-bold text-[10px]">{student.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className={cn("truncate font-medium text-sm", isAdded ? "text-slate-600 line-through" : "text-slate-300 group-hover:text-white")}>
                {student.displayName}
            </span>
        </div>
        {!isAdded && <UserPlus className="h-4 w-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"/>}
        {isAdded && <Check className="h-4 w-4 text-slate-600" />}
    </div>
);

// Yeni Öğrenci Ekleme Dialogu
function AddStudentDialog({ isOpen, onOpenChange, onAdd, isSaving, poolClassName }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onAdd: (name: string, className: string) => void, isSaving: boolean, poolClassName: string }) {
    const [displayName, setDisplayName] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onAdd(displayName, poolClassName); setDisplayName(''); }
    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setDisplayName('') }; onOpenChange(open); }}>
            <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
                <DialogHeader><DialogTitle>Yeni Yarışmacı Ekle</DialogTitle><DialogDescription>Havuza geçici öğrenci ekleyin.</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Ad Soyad</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} required className="bg-slate-950 border-white/10 text-white" /></div>
                    <DialogFooter><Button type="submit" disabled={isSaving || !displayName.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-white">{isSaving ? <Loader2 className="animate-spin" /> : "Ekle"}</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function CompetitionLoadingSkeleton() {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col p-6 gap-6">
        <div className="flex justify-between items-center">
            <div className="h-10 w-64 bg-slate-800/50 rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-slate-800/50 rounded-xl animate-pulse" />
        </div>
        <div className="flex-1 grid grid-cols-12 gap-6">
            <div className="col-span-12 h-2/3 bg-slate-900/30 rounded-3xl animate-pulse border border-white/5" />
            <div className="col-span-12 h-1/3 bg-slate-900/30 rounded-3xl animate-pulse border border-white/5" />
        </div>
      </div>
    );
}

// --- ANA COMPONENT ---

function CompetitionComponent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSubmittingScores, setIsSubmittingScores] = useState(false);
    const [scoresHaveBeenSaved, setScoresHaveBeenSaved] = useState(false);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => { setIsFullscreen(!!document.fullscreenElement); };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const finishScore = parseInt(searchParams.get('finishScore') || '0');
    const questionTimer = parseInt(searchParams.get('questionTimer') || '0');
    
    // Configs
    const pointsConfig = useMemo(() => { const p = searchParams.get('points'); try { return p ? JSON.parse(p) : { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }}; } catch { return { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }}; } }, [searchParams]);
    const penaltyConfig = useMemo(() => { const p = searchParams.get('penalty'); try { return p ? JSON.parse(p) : { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }}; } catch { return { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }}; } }, [searchParams]);

    // Data States
    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Student pool
    const [studentPool, setStudentPool] = useState<UserProfile[]>([]);
    const [currentClass, setCurrentClass] = useState<SchoolClass | null>(null);
    const [isPoolLoading, setIsPoolLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    
    // Game States
    const [inGameCompetitors, setInGameCompetitors] = useState<GameCompetitor[]>([]);
    const [activeCompetitorId, setActiveCompetitorId] = useState<string | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
    const [currentView, setCurrentView] = useState<'leaderboard' | 'questions'>('leaderboard');
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [winner, setWinner] = useState<GameCompetitor | null>(null);
    
    // Veri Çekme
    const fetchGameData = useCallback(async () => {
        setIsLoading(true); setIsPoolLoading(true); setError(null);
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
            const questionResult = await getQuestionsFromBank(params as any);
            if (questionResult.error) setError(questionResult.error);
            else if (questionResult.questions && questionResult.questions.length > 0) setQuestions(questionResult.questions as GameQuestion[]);
            else setError("Soru bulunamadı.");

            const classId = searchParams.get('classId');
            if (classId) {
                const classDoc = await getDoc(doc(db, "classes", classId));
                if (classDoc.exists()) {
                    const classData = { id: classDoc.id, ...classDoc.data() } as SchoolClass;
                    setCurrentClass(classData);
                    const studentsQuery = query(collection(db, "users"), where("class", ">=", classData.name), where("class", "<", classData.name + '\uf8ff'), where("role", "==", "guest"));
                    const studentsSnapshot = await getDocs(studentsQuery);
                    setStudentPool(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
                } else setError("Sınıf bilgisi bulunamadı.");
            } else {
                 const studentsQuery = query(collection(db, "users"), where("class", "==", SUMMER_SCHOOL_CLASS_NAME), where("role", "==", "guest"));
                 const studentsSnapshot = await getDocs(studentsQuery);
                 setStudentPool(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
            }
        } catch (err: any) { setError("Hata oluştu."); } finally { setIsLoading(false); setIsPoolLoading(false); }
    }, [searchParams]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);
    
    // Aksiyonlar
    const handleSaveScores = useCallback(async (andFinish: boolean = false) => {
        if (scoresHaveBeenSaved || inGameCompetitors.length === 0) { if (andFinish && gameState !== 'finished') setGameState('finished'); return; }
        setIsSubmittingScores(true);
        const scoreUpdates = inGameCompetitors.map(c => ({ userId: c.uid, points: c.score, gameType: 'smartboard_bireysel' as const, context: `${searchParams.get('courseName') || 'Genel'} - ${searchParams.get('topicName') || 'Genel'}` }));
        if (scoreUpdates.every(u => u.points === 0)) { toast({ title: "Skor Yok", description: "Kaydedilecek puan bulunmuyor." }); } 
        else { 
            const result = await updateMultipleStudentScores(scoreUpdates);
            if (result.success) { toast({ title: "Başarılı", description: "Skorlar kaydedildi." }); setScoresHaveBeenSaved(true); } 
            else { toast({ title: "Hata", description: result.error, variant: "destructive" }); setIsSubmittingScores(false); return; }
        }
        if (andFinish) {
            const finalSorted = [...inGameCompetitors].sort((a,b) => b.score - a.score);
            if (finalSorted.length > 0) setWinner(finalSorted[0]);
            setGameState('finished');
        }
        setIsSubmittingScores(false);
    }, [scoresHaveBeenSaved, inGameCompetitors, searchParams, toast, gameState]);

    const handleAddStudent = async (displayName: string, className: string) => {
        if (!displayName.trim()) return; setIsAddingStudent(true);
        const result = await addStudentToClass(displayName, className);
        if (result.success && result.newUser) { toast({ title: "Başarılı", description: `${displayName} eklendi.` }); setStudentPool(prev => [...prev, result.newUser!]); setIsAddStudentOpen(false); } 
        else { toast({ title: "Hata", description: result.error, variant: "destructive" }); }
        setIsAddingStudent(false);
    };

    const studentsInBranch = useMemo(() => {
        if (!currentClass) return studentPool;
        if (selectedBranch === 'all') return studentPool.filter(s => s.class?.startsWith(currentClass.name));
        const branchClassName = `${currentClass.name} - ${selectedBranch}`;
        const poolClassName = `${branchClassName} (Havuz)`;
        return studentPool.filter(s => s.class === branchClassName || s.class === poolClassName);
    }, [studentPool, currentClass, selectedBranch]);

    const addCompetitorToGame = (competitor: UserProfile) => { 
        if(!inGameCompetitors.some(c => c.uid === competitor.uid)) { setInGameCompetitors(prev => [...prev, { uid: competitor.uid, displayName: competitor.displayName, avatar: competitor.avatar, score: 0 }]); } 
    };
    const removeCompetitorFromGame = (competitorId: string) => { setInGameCompetitors(prev => prev.filter(c => c.uid !== competitorId)); if (activeCompetitorId === competitorId) setActiveCompetitorId(null); };
    const addAllFromPoolToGame = () => { const newC = studentsInBranch.filter(p => !inGameCompetitors.some(igc => igc.uid === p.uid)).map(p => ({ uid: p.uid, displayName: p.displayName, avatar: p.avatar, score: 0 })); setInGameCompetitors(prev => [...prev, ...newC]); };
    const removeAllFromGame = () => { setInGameCompetitors([]); setActiveCompetitorId(null); };
    const handleBranchSelect = (branch: string) => setSelectedBranch(branch);
    
    // OYUN AKIŞI YÖNETİMİ
    const handleCompetitorClick = (competitorId: string) => {
        setActiveCompetitorId(competitorId);
        setCurrentView('questions'); // Görünümü değiştir
    };

    const handleOpenQuestion = (number: number, question: GameQuestion) => { 
        if (!activeCompetitorId) { toast({ title: 'Hata', description: 'Yarışmacı seçili değil!', variant: 'destructive'}); return; } 
        setOpenedQuestion({ number, question }); 
    };

    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        if (!activeCompetitorId || gameState === 'finished') return;
        let winnerFound: GameCompetitor | null = null;
        const updatedCompetitors = inGameCompetitors.map(c => {
            if (c.uid === activeCompetitorId) {
                const newScore = Math.max(0, c.score + scoreChange);
                const updatedCompetitor = { ...c, score: newScore };
                if (finishScore > 0 && newScore >= finishScore) { winnerFound = updatedCompetitor; }
                return updatedCompetitor;
            }
            return c;
        });
        setInGameCompetitors(updatedCompetitors);
        setAnsweredQuestions([...answeredQuestions, questionNumber]);
        setOpenedQuestion(null);
        setCurrentView('leaderboard');
        setActiveCompetitorId(null);
        if (winnerFound) { setWinner(winnerFound); setGameState('finished'); }
    };
    
    useEffect(() => { if (gameState === 'playing' && questions.length > 0 && answeredQuestions.length === questions.length) { handleSaveScores(true); } }, [gameState, answeredQuestions.length, questions.length, handleSaveScores]);
    const startNewGame = () => { window.location.reload(); };
    const handleSelectRandomQuestion = () => {
        if (!activeCompetitorId) { toast({ title: 'Hata', description: 'Lütfen bir yarışmacı seçin!', variant: 'destructive'}); return; }
        const unansweredIndices = questions.map((_, i) => i).filter(i => !answeredQuestions.includes(i + 1));
        if (unansweredIndices.length === 0) { toast({ title: "Tebrikler!", description: "Tüm soruları cevapladınız." }); return; }
        const randomIndex = unansweredIndices[Math.floor(Math.random() * unansweredIndices.length)];
        const questionNumber = randomIndex + 1;
        const question = questions[randomIndex];
        setOpenedQuestion({ number: questionNumber, question });
    };

    const sortedCompetitors = useMemo(() => [...inGameCompetitors].sort((a, b) => b.score - a.score), [inGameCompetitors]);

    if (isLoading) return <CompetitionLoadingSkeleton />;

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 p-6">
                <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-900 text-red-200">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <Button asChild variant="outline" className="mt-4 border-red-800 text-red-300 hover:bg-red-900/50"><Link href="/teacher/smartboard/bireysel"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link></Button>
                </Alert>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
                <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />
                <Card className="w-full max-w-4xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl relative z-10 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />
                    <CardHeader className="text-center pt-12 pb-6"><Trophy className="h-20 w-20 text-yellow-400 mx-auto mb-4 animate-bounce" /><CardTitle className="text-5xl font-black text-white">Yarışma Tamamlandı!</CardTitle></CardHeader>
                    <CardContent className="px-8 pb-10 text-center">
                        {winner && <h3 className="text-3xl font-black text-white mb-6">Kazanan: {winner.displayName}</h3>}
                         <Button onClick={startNewGame} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-14 px-8 rounded-xl">Tekrar Oyna</Button>
                    </CardContent>
                    <CardFooter className="bg-slate-900 border-t border-white/5 p-6 flex justify-center gap-4">
                        <Button asChild size="lg" variant="outline" className="border-white/10 text-slate-300 hover:text-white h-14 px-8 rounded-xl"><Link href="/teacher/smartboard"><Home className="mr-2 h-5 w-5" /> Çıkış</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }
    
    // --- OYUN EKRANI ---
    return (
        <div className={cn("flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative selection:bg-cyan-500/30 font-sans", isFullscreen ? "" : "p-2 md:p-4")}>
             
             {/* Arka Plan */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[150px]" />
            </div>

            {/* Üst Bar */}
            <header className={cn("flex-shrink-0 flex items-center justify-between z-20 mb-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 shadow-lg", isFullscreen && "rounded-none border-x-0 border-t-0 mb-0")}>
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg"><MonitorPlay className="h-5 w-5 text-white"/></div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-white uppercase leading-none">{currentView === 'leaderboard' ? 'Bireysel Yarışma' : 'Soru Seçimi'}</h1>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{currentView === 'questions' && activeCompetitorId ? `Sıra: ${inGameCompetitors.find(c => c.uid === activeCompetitorId)?.displayName}` : `${searchParams.get('courseName')} • ${searchParams.get('topicName')}`}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                     {currentView === 'questions' && <Button variant="outline" size="sm" onClick={() => { setCurrentView('leaderboard'); setActiveCompetitorId(null); }} className="border-white/10 text-slate-300 hover:text-white h-8 text-xs"><ArrowLeft className="mr-1 h-3 w-3"/> Geri</Button>}
                     <Button size="sm" className={cn("font-bold transition-all h-8 px-3 rounded-lg text-xs", scoresHaveBeenSaved ? "bg-green-600 hover:bg-green-700" : "bg-white text-slate-900 hover:bg-slate-200")} onClick={() => handleSaveScores(true)} disabled={isSubmittingScores || scoresHaveBeenSaved || inGameCompetitors.length === 0}>
                        {isSubmittingScores ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : scoresHaveBeenSaved ? <Check className="mr-1 h-3 w-3"/> : <Save className="mr-1 h-3 w-3"/>}
                        {scoresHaveBeenSaved ? "Kaydedildi" : "Bitir"}
                    </Button>
                    <FullscreenToggle className="bg-slate-800 text-slate-300 hover:text-white border-0 h-8 w-8 rounded-lg" />
                    {!isFullscreen && <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg h-8 w-8"><Link href="/teacher/smartboard/bireysel"><ArrowLeft className="h-4 w-4" /></Link></Button>}
                </div>
            </header>

            {/* Ana İçerik */}
            <main className="flex-1 flex flex-col overflow-hidden relative z-10 h-full">
                
                {/* 1. SAHNE: LİDERLİK TABLOSU + ÖĞRENCİ HAVUZU (ALT ALTA) */}
                {currentView === 'leaderboard' && (
                    <div className="flex flex-col gap-2 h-full animate-in fade-in zoom-in-95 duration-300">
                        
                        {/* Üst Kısım: Liderlik Tablosu (Büyük Alan) */}
                        <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-1 overflow-hidden flex flex-col shadow-inner min-h-0 relative">
                             {/* Buradaki wrapper div, scroll'un çalışması için önemli */}
                             <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-2">
                                {inGameCompetitors.length > 0 ? (
                                    // YENİ GRID: Maksimum 4 sütun
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {sortedCompetitors.map((player, index) => (
                                            <TeamScoreCard 
                                                key={player.uid} 
                                                competitor={player} 
                                                isActive={false} 
                                                rank={index}
                                                onClick={() => handleCompetitorClick(player.uid)}
                                                onRemove={(e) => { e.stopPropagation(); removeCompetitorFromGame(player.uid); }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                                        <div className="bg-slate-900/50 p-6 rounded-full mb-4 border border-white/5"><Users className="h-12 w-12 opacity-30" /></div>
                                        <p className="text-lg font-medium">Henüz yarışmacı yok.</p>
                                        <p className="opacity-60 text-sm">Aşağıdaki havuzdan öğrenci seçerek başlayın.</p>
                                    </div>
                                )}
                             </div>
                        </div>

                        {/* Alt Kısım: Öğrenci Havuzu (Alt Panel - Kompakt) */}
                        <div className="h-[180px] shrink-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-30 rounded-t-2xl">
                             <div className="px-4 py-2 border-b border-white/5 bg-slate-900/50 flex items-center justify-between shrink-0 h-12">
                                 <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Users className="w-3 h-3 text-cyan-400"/> Havuz
                                    </span>
                                    {currentClass && (
                                        <Select value={selectedBranch} onValueChange={handleBranchSelect}>
                                            <SelectTrigger className="h-7 w-32 bg-slate-900 border-white/10 text-xs text-white rounded-md"><SelectValue placeholder="Şube..." /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                <SelectItem value="all">Tüm Şubeler</SelectItem>
                                                {currentClass.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                 </div>
                                 <div className="flex gap-2">
                                     <Button variant="secondary" size="sm" className="h-7 text-xs bg-slate-800 hover:bg-slate-700 text-white" onClick={addAllFromPoolToGame} disabled={studentsInBranch.every(s => inGameCompetitors.some(c => c.uid === s.uid))}>
                                        Tümünü Ekle
                                    </Button>
                                    <Button size="sm" className="h-7 px-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold" onClick={() => setIsAddStudentOpen(true)}>
                                        <UserPlus className="mr-1 h-3 w-3" /> Yeni
                                    </Button>
                                 </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-slate-900/20">
                                {isPoolLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-cyan-500"/></div> :
                                 studentsInBranch.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                                        {studentsInBranch.map(s => (
                                            <StudentListItem key={s.uid} student={s} onAddToGame={addCompetitorToGame} isAdded={inGameCompetitors.some(c => c.uid === s.uid)} />
                                        ))}
                                    </div>
                                 ) : (
                                    <p className="text-center text-xs text-slate-500 p-4 font-medium">Bu şubede görüntülenecek öğrenci bulunamadı.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. SAHNE: SORU EKRANI (TAM EKRAN) */}
                {currentView === 'questions' && activeCompetitorId && (
                     <div className="flex-1 bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 shadow-inner overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 h-full">
                        <div className="text-center mb-6 shrink-0">
                            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
                                Sıra: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">{inGameCompetitors.find(c => c.uid === activeCompetitorId)?.displayName}</span>
                            </h2>
                            <p className="text-slate-400 text-lg">Lütfen cevaplamak istediğin soruyu seç.</p>
                            
                            <div className="mt-4 flex justify-center">
                                <Button 
                                    variant="outline" 
                                    className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-10 px-6 rounded-xl text-base font-bold"
                                    onClick={handleSelectRandomQuestion} 
                                    disabled={!activeCompetitorId}
                                >
                                    <Shuffle className="mr-2 h-4 w-4" /> Rastgele Soru Seç
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                                {questions.map((q, i) => {
                                    const questionNumber = i + 1;
                                    const isAnswered = answeredQuestions.includes(questionNumber);
                                    
                                    return (
                                        <button
                                            key={i}
                                            disabled={isAnswered}
                                            onClick={() => !isAnswered && handleOpenQuestion(questionNumber, q)}
                                            className={cn(
                                                "aspect-square rounded-xl flex items-center justify-center text-2xl md:text-3xl font-black transition-all duration-300 relative overflow-hidden group border-2",
                                                isAnswered 
                                                    ? "bg-slate-800/40 text-slate-700 border-slate-800/50 cursor-not-allowed grayscale" 
                                                    : "bg-slate-800 border-slate-700 hover:bg-cyan-600 hover:border-cyan-400 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:-translate-y-1 active:scale-95"
                                            )}
                                        >
                                            {!isAnswered && <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            {isAnswered ? <Check className="h-8 w-8 opacity-20" /> : <span className="drop-shadow-md z-10">{questionNumber}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                     </div>
                )}

            </main>

            {/* Modallar */}
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={isFullscreen}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={questionTimer}
                    pointsConfig={pointsConfig}
                    penaltyConfig={penaltyConfig}
                />
            )}
            
            <AddStudentDialog
                isOpen={isAddStudentOpen}
                onOpenChange={setIsAddStudentOpen}
                onAdd={handleAddStudent}
                isSaving={isAddingStudent}
                poolClassName={currentClass?.name ? `${currentClass.name} - ${selectedBranch} (Havuz)` : SUMMER_SCHOOL_CLASS_NAME}
            />
        </div>
    );
}

export default function SmartboardBireyselOyunPage() {
    return (
        <Suspense fallback={<CompetitionLoadingSkeleton />}>
            <CompetitionComponent />
        </Suspense>
    )
}