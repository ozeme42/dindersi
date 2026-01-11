'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
    ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, 
    Check, Trash2, Users, Shuffle, PartyPopper, 
    Trophy, MonitorPlay, Plus, Award,
    ChevronDown, ChevronUp, Settings2, UserPlus, X, Flag
} from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getQuestionsFromBank, type GetQuizOutput } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { SchoolClass, UserProfile, GetQuizInput } from "@/lib/types";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// updateMultipleStudentScores IMPORTU KALDIRILDI
import { QuestionDialog } from "@/components/question-dialog";
import { addStudentToClass } from "@/app/teacher/students/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";

const SUMMER_SCHOOL_CLASS_NAME = "Yaz Okulu Havuzu";

type GameQuestion = GetQuizOutput['questions'][0];
type Team = { id: number; name: string; students: UserProfile[]; score: number };

// --- RENK TEMALARI ---
const CARD_THEMES = [
    { name: 'Mavi', border: 'border-blue-500', bg: 'bg-blue-950/80', text: 'text-blue-400', line: 'bg-blue-500', scoreBg: 'bg-blue-900' },
    { name: 'Kırmızı', border: 'border-red-500', bg: 'bg-red-950/80', text: 'text-red-400', line: 'bg-red-500', scoreBg: 'bg-red-900' },
    { name: 'Yeşil', border: 'border-green-500', bg: 'bg-green-950/80', text: 'text-green-400', line: 'bg-green-500', scoreBg: 'bg-green-900' },
    { name: 'Sarı', border: 'border-yellow-500', bg: 'bg-yellow-950/80', text: 'text-yellow-400', line: 'bg-yellow-500', scoreBg: 'bg-yellow-900' },
    { name: 'Mor', border: 'border-purple-500', bg: 'bg-purple-950/80', text: 'text-purple-400', line: 'bg-purple-500', scoreBg: 'bg-purple-900' },
    { name: 'Turuncu', border: 'border-orange-500', bg: 'bg-orange-950/80', text: 'text-orange-400', line: 'bg-orange-500', scoreBg: 'bg-orange-900' },
    { name: 'Pembe', border: 'border-pink-500', bg: 'bg-pink-950/80', text: 'text-pink-400', line: 'bg-pink-500', scoreBg: 'bg-pink-900' },
];

// --- YARDIMCI BİLEŞENLER ---

const RankIcon = ({ rank }: { rank: number }) => {
    if (rank === 0) return <Crown className="h-8 w-8 text-yellow-400 fill-yellow-400/20 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-pulse" />;
    if (rank === 1) return <Award className="h-7 w-7 text-slate-300 fill-slate-300/20" />;
    if (rank === 2) return <Award className="h-7 w-7 text-amber-600 fill-amber-600/20" />;
    return <span className="text-xl font-black text-slate-600">#{rank + 1}</span>;
};

// Takım Kartı
const TeamScoreCard = ({ team, isActive, rank, colorIndex, suggestedPlayer, onClick, onRemoveStudent }: { team: Team, isActive: boolean, rank: number, colorIndex: number, suggestedPlayer?: string | null, onClick: () => void, onRemoveStudent: (studentId: string) => void }) => {
    const [isListOpen, setIsListOpen] = useState(false);
    const theme = CARD_THEMES[colorIndex % CARD_THEMES.length];

    const getInitials = (name?: string): string => {
        if (!name) return '?';
        return name.trim().charAt(0).toLocaleUpperCase('tr-TR');
    };

    return (
        <div 
            onClick={onClick}
            className={cn(
                "relative transition-all duration-300 transform rounded-xl overflow-hidden flex flex-col cursor-pointer border-t-4 h-fit",
                theme.bg, theme.border, 
                isActive 
                    ? `scale-105 z-20 shadow-[0_0_60px_rgba(0,0,0,0.6)] ring-2 ${theme.border.replace('border-', 'ring-')} ring-offset-4 ring-offset-slate-950 translate-y-[-5px]` 
                    : "opacity-90 scale-100 hover:scale-[1.02] hover:opacity-100 hover:shadow-2xl border-t-transparent hover:border-t-4"
            )}
        >
            {/* Header */}
            <div className={cn("px-4 py-2 flex justify-between items-center bg-black/40 backdrop-blur-sm shrink-0")}>
                <h3 className={cn("font-black uppercase tracking-tight text-white text-lg flex items-center gap-2")}>
                    {team.name}
                </h3>
                <RankIcon rank={rank} />
            </div>

            {/* Score */}
            <div className="flex-1 flex flex-col items-center justify-center py-4 relative bg-gradient-to-b from-transparent to-black/20 min-h-[120px]">
                <div className={cn(
                    "font-black tabular-nums tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] transition-all duration-300 leading-none", 
                    theme.text,
                    "text-6xl md:text-8xl"
                )}>
                    {team.score}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 mt-2">PUAN</div>
                {isActive && <div className="absolute inset-0 border-2 border-white/10 rounded-xl animate-pulse pointer-events-none" />}
            </div>

            {/* Oyuncu Listesi (Açılır/Kapanır) */}
            <div className="bg-black/30 border-t border-white/5 backdrop-blur-md transition-all duration-300 flex flex-col">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsListOpen(!isListOpen); }}
                    className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors bg-black/20"
                >
                    <span className="flex items-center gap-2"><Users className="w-3 h-3"/> {team.students.length} Oyuncu</span>
                    {isListOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isListOpen ? "max-h-[300px] border-t border-white/5" : "max-h-0"
                )}>
                    <ScrollArea className="h-40 w-full">
                        <div className="p-2 space-y-1">
                            {team.students.length > 0 ? (
                                team.students.map(student => (
                                    <div key={student.uid} className={cn(
                                        "flex items-center gap-3 p-2 rounded-md transition-colors border border-transparent group relative",
                                        isActive && suggestedPlayer === student.displayName 
                                            ? "bg-white/10 border-white/30 animate-pulse" 
                                            : "hover:bg-white/5 hover:border-white/5"
                                    )}>
                                        <Avatar className="h-6 w-6 border border-white/20">
                                            <AvatarImage src={student.avatar || ''} />
                                            <AvatarFallback className={cn("text-[8px] font-bold text-white", theme.bg.replace('/80', ''))}>{getInitials(student.displayName)}</AvatarFallback>
                                        </Avatar>
                                        <span className={cn(
                                            "text-xs font-bold truncate flex-1",
                                            isActive && suggestedPlayer === student.displayName ? "text-white" : "text-slate-300"
                                        )}>
                                            {student.displayName}
                                        </span>
                                        
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400 ml-auto"
                                            onClick={(e) => { e.stopPropagation(); onRemoveStudent(student.uid); }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>

                                        {isActive && suggestedPlayer === student.displayName && (
                                            <Badge variant="secondary" className="text-[8px] h-3 px-1 bg-yellow-500 text-black border-none font-bold ml-1">SEÇ</Badge>
                                        )}
                                    </div>
                                ))
                            ) : <p className="text-[10px] text-white/30 italic p-4 text-center">Oyuncu eklemek için aşağıdan seçin.</p>}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};

// Dialog
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

function TeamCompetitionComponent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    // --- STATE ---
    const [gamePhase, setGamePhase] = useState<'setup' | 'playing' | 'finished'>('setup');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Setup Phase
    const [studentPool, setStudentPool] = useState<UserProfile[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<UserProfile[]>([]);
    const [teamCount, setTeamCount] = useState<number>(2);
    const [currentClass, setCurrentClass] = useState<SchoolClass | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    
    // Game Phase
    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
    const [winner, setWinner] = useState<Team | 'draw' | null>(null);
    const [suggestedPlayer, setSuggestedPlayer] = useState<string | null>(null);

    // Dialogs
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [newGuestName, setNewGuestName] = useState("");
    const [isAddingStudent, setIsAddingStudent] = useState(false);

    // Configs
    const questionTimer = parseInt(searchParams.get('questionTimer') || '30');
    const finishScore = parseInt(searchParams.get('finishScore') || '100');
    
    useEffect(() => {
        const initData = async () => {
            setIsLoading(true);
            try {
                // Sorular (Sayıyı yüksek tuttuk)
                const params: GetQuizInput = {
                    courseId: searchParams.get('courseId') || undefined,
                    unitId: searchParams.get('unitId') || undefined,
                    topicId: searchParams.get('topicId') || undefined,
                    questionCount: 100, 
                    difficulty: ['Kolay', 'Orta', 'Zor'],
                    questionTypes: ['mcq', 'tf', 'fitb'],
                };
                const qResult = await getQuestionsFromBank(params);
                if (qResult.questions) setQuestions(qResult.questions as GameQuestion[]);
                
                // Havuz
                const classId = searchParams.get('classId');
                if (classId) {
                    const classDoc = await getDoc(doc(db, "classes", classId));
                    if (classDoc.exists()) {
                        const cData = { id: classDoc.id, ...classDoc.data() } as SchoolClass;
                        setCurrentClass(cData);
                        const sQuery = query(collection(db, "users"), where("class", ">=", cData.name), where("class", "<", cData.name + '\uf8ff'), where("role", "==", "guest"));
                        const sSnap = await getDocs(sQuery);
                        const students = sSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
                        setStudentPool(students);
                    }
                } else {
                    const sQuery = query(collection(db, "users"), where("class", "==", SUMMER_SCHOOL_CLASS_NAME), where("role", "==", "guest"));
                    const sSnap = await getDocs(sQuery);
                    setStudentPool(sSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
                }
            } catch (err: any) {
                setError("Veriler yüklenirken hata oluştu.");
            } finally {
                setIsLoading(false);
            }
        };
        initData();
        
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [searchParams]);

    // Şube Filtresi
    const filteredPool = useMemo(() => {
        if (!currentClass) return studentPool;
        if (selectedBranch === 'all') return studentPool;
        const target = `${currentClass.name} - ${selectedBranch}`;
        return studentPool.filter(s => s.class === target || s.class?.startsWith(target + " ("));
    }, [studentPool, currentClass, selectedBranch]);

    const addToSelection = (student: UserProfile) => {
        if (!selectedStudents.find(s => s.uid === student.uid)) {
            setSelectedStudents(prev => [...prev, student]);
        }
    };

    const addAllFiltered = () => {
        const newStudents = filteredPool.filter(fp => !selectedStudents.some(ss => ss.uid === fp.uid));
        setSelectedStudents(prev => [...prev, ...newStudents]);
    };

    const removeFromSelection = (uid: string) => {
        setSelectedStudents(prev => prev.filter(s => s.uid !== uid));
    };

    const handleAddGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGuestName.trim()) return;
        setIsAddingStudent(true);
        const className = currentClass ? `${currentClass.name} - ${selectedBranch === 'all' ? 'A' : selectedBranch} (Havuz)` : SUMMER_SCHOOL_CLASS_NAME;
        const res = await addStudentToClass(newGuestName, className);
        if (res.success && res.newUser) {
            setStudentPool(prev => [...prev, res.newUser!]);
            addToSelection(res.newUser!);
            setNewGuestName("");
            setIsAddStudentOpen(false);
            toast({ title: "Eklendi", description: `${newGuestName} listeye eklendi.` });
        }
        setIsAddingStudent(false);
    };

    const distributeAndStart = () => {
        if (selectedStudents.length < teamCount) {
            toast({ title: "Yetersiz Oyuncu", description: `En az ${teamCount} oyuncu seçmelisiniz.`, variant: "destructive" });
            return;
        }

        const shuffled = [...selectedStudents].sort(() => Math.random() - 0.5);
        
        const newTeams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
            id: i + 1,
            name: `${CARD_THEMES[i % CARD_THEMES.length].name} Takım`,
            score: 0,
            students: []
        }));

        shuffled.forEach((student, index) => {
            newTeams[index % teamCount].students.push(student);
        });

        setTeams(newTeams);
        setActiveTeamId(newTeams[0].id);
        suggestPlayerForTeam(newTeams[0]);
        setGamePhase('playing');
        
        playSound('start');
    };

    const suggestPlayerForTeam = (team: Team) => {
        if (team.students.length > 0) {
            const random = team.students[Math.floor(Math.random() * team.students.length)];
            setSuggestedPlayer(random.displayName);
        } else setSuggestedPlayer(null);
    };

    const handleAnswer = (qNum: number, isCorrect: boolean, scoreChange: number) => {
        if (!activeTeamId) return;
        
        let winnerFound: Team | null = null;
        const nextTeams = teams.map(t => {
            if (t.id === activeTeamId) {
                const newScore = Math.max(0, t.score + scoreChange);
                if (finishScore > 0 && newScore >= finishScore) winnerFound = { ...t, score: newScore };
                return { ...t, score: newScore };
            }
            return t;
        });

        setTeams(nextTeams);
        setAnsweredQuestions([...answeredQuestions, qNum]);
        setOpenedQuestion(null);

        if (winnerFound) {
            setWinner(winnerFound);
            setGamePhase('finished');
            playSound('win');
        } else {
            const currIdx = teams.findIndex(t => t.id === activeTeamId);
            const nextTeam = teams[(currIdx + 1) % teams.length];
            setActiveTeamId(nextTeam.id);
            suggestPlayerForTeam(nextTeam);
        }
    };

    const handleRandomQuestion = () => {
        const available = questions.map((q, i) => ({ q, i: i + 1 })).filter(item => !answeredQuestions.includes(item.i));
        if (available.length === 0) return;
        const random = available[Math.floor(Math.random() * available.length)];
        setOpenedQuestion({ number: random.i, question: random.q });
    };

    // --- YENİ BİTİRME FONKSİYONU (KAYIT YOK) ---
    const handleFinish = () => {
        const sorted = [...teams].sort((a,b) => b.score - a.score);
        if (sorted.length > 1 && sorted[0].score === sorted[1].score && sorted[0].score > 0) {
            setWinner('draw');
        } else {
            setWinner(sorted[0]);
        }
        setGamePhase('finished');
        playSound('win');
    };

    // Tüm sorular bittiğinde otomatik bitir
    useEffect(() => {
        if (gamePhase === 'playing' && questions.length > 0 && answeredQuestions.length === questions.length) {
            handleFinish();
        }
    }, [answeredQuestions, questions, gamePhase]);


    if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-purple-500" /></div>;
    if (error) return <div className="h-screen flex items-center justify-center text-red-400 bg-slate-950">{error}</div>;

    // --- 1. EKRAN: SETUP (LOBİ) ---
    if (gamePhase === 'setup') {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
                <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <Settings2 className="h-8 w-8 text-purple-400" /> YARIŞMA KURULUMU
                        </h1>
                        <p className="text-slate-400 mt-1">Sınıftan öğrencileri seç ve takımlara dağıt.</p>
                    </div>
                    <Button asChild variant="outline" className="border-white/10 text-slate-300">
                        <Link href="/teacher/smartboard/takim"><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                    </Button>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
                    
                    {/* SOL PANEL */}
                    <Card className="lg:col-span-4 bg-slate-900/50 border-white/10 flex flex-col overflow-hidden">
                        <CardHeader className="pb-3 border-b border-white/5 bg-slate-900">
                            <CardTitle className="text-lg flex justify-between items-center">
                                <span>Sınıf Listesi</span>
                                <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-1 rounded">{filteredPool.length} Öğrenci</span>
                            </CardTitle>
                            <div className="flex gap-2 mt-2">
                                {currentClass && (
                                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                        <SelectTrigger className="h-8 bg-slate-950 border-white/10 text-xs w-24"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            <SelectItem value="all">Tüm</SelectItem>
                                            {currentClass.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                                <Button size="sm" variant="secondary" className="h-8 text-xs flex-1" onClick={addAllFiltered} disabled={filteredPool.length === 0}>
                                    <Users className="mr-2 h-3 w-3" /> Tümünü Ekle
                                </Button>
                                <Button size="icon" className="h-8 w-8 bg-purple-600 hover:bg-purple-500" onClick={() => setIsAddStudentOpen(true)}>
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-2 flex-1 overflow-hidden">
                            <ScrollArea className="h-full pr-2">
                                <div className="grid grid-cols-1 gap-1">
                                    {filteredPool.map(s => {
                                        const isSelected = selectedStudents.some(ss => ss.uid === s.uid);
                                        return (
                                            <div 
                                                key={s.uid} 
                                                onClick={() => !isSelected && addToSelection(s)}
                                                className={cn(
                                                    "flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer",
                                                    isSelected 
                                                        ? "bg-slate-900/50 border-transparent opacity-50 grayscale" 
                                                        : "bg-slate-800/50 border-white/5 hover:border-purple-500/50 hover:bg-purple-500/10"
                                                )}
                                            >
                                                <Avatar className="h-8 w-8 border border-white/10"><AvatarImage src={s.avatar} /><AvatarFallback className="text-[10px] bg-slate-900">{s.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                                <span className="text-sm font-medium truncate">{s.displayName}</span>
                                                {isSelected && <Check className="ml-auto h-4 w-4 text-green-500" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* ORTA PANEL */}
                    <Card className="lg:col-span-4 bg-slate-900/50 border-white/10 flex flex-col overflow-hidden">
                        <CardHeader className="pb-3 border-b border-white/5 bg-slate-900">
                            <CardTitle className="text-lg flex justify-between items-center text-purple-300">
                                <span>Yarışacaklar</span>
                                <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs">{selectedStudents.length}</span>
                            </CardTitle>
                            <div className="flex justify-end mt-2">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedStudents([])} disabled={selectedStudents.length === 0} className="h-8 text-xs text-red-400 hover:bg-red-950/30">
                                    <Trash2 className="mr-2 h-3 w-3" /> Temizle
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-2 flex-1 overflow-hidden bg-purple-900/5">
                            <ScrollArea className="h-full pr-2">
                                <div className="grid grid-cols-1 gap-1">
                                    {selectedStudents.length > 0 ? selectedStudents.map(s => (
                                        <div key={s.uid} className="flex items-center justify-between p-2 rounded-lg bg-slate-800 border border-purple-500/20 group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8"><AvatarImage src={s.avatar} /><AvatarFallback className="text-[10px] bg-slate-900">{s.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                                <span className="text-sm font-bold text-white">{s.displayName}</span>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-red-400" onClick={() => removeFromSelection(s.uid)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )) : (
                                        <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-sm">
                                            <UserPlus className="h-8 w-8 mb-2 opacity-50" />
                                            Soldan öğrenci seçin.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* SAĞ PANEL */}
                    <Card className="lg:col-span-4 bg-gradient-to-b from-slate-900 to-slate-950 border-white/10 flex flex-col shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-white">Takım Ayarları</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 flex-1">
                            <div className="space-y-4">
                                <Label className="text-slate-300">Takım Sayısı</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[2, 3, 4, 5, 6, 7].map(num => (
                                        <button 
                                            key={num}
                                            onClick={() => setTeamCount(num)}
                                            className={cn(
                                                "h-12 rounded-xl border-2 font-black text-lg transition-all",
                                                teamCount === num 
                                                    ? "border-purple-500 bg-purple-500/20 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]" 
                                                    : "border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-600"
                                            )}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex justify-between text-sm text-slate-400">
                                    <span>Toplam Oyuncu:</span>
                                    <span className="text-white font-bold">{selectedStudents.length}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-400">
                                    <span>Takım Başına:</span>
                                    <span className="text-white font-bold">~{Math.ceil(selectedStudents.length / teamCount)}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-3 pb-8">
                            <Button 
                                size="lg" 
                                className="w-full h-16 text-xl font-black bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 rounded-xl"
                                disabled={selectedStudents.length < teamCount}
                                onClick={distributeAndStart}
                            >
                                <Shuffle className="mr-3 h-6 w-6" /> DAĞIT VE BAŞLAT
                            </Button>
                            {selectedStudents.length < teamCount && (
                                <p className="text-xs text-red-400 text-center">En az {teamCount} oyuncu seçmelisiniz.</p>
                            )}
                        </CardFooter>
                    </Card>
                </div>

                <AddStudentDialog 
                    isOpen={isAddStudentOpen} 
                    onOpenChange={setIsAddStudentOpen} 
                    onAdd={(name) => { setNewGuestName(name); handleAddGuest({ preventDefault: () => {} } as any); }} 
                    isSaving={isAddingStudent} 
                    poolClassName=""
                />
            </div>
        );
    }

    // --- 2. EKRAN: OYUN ---
    if (gamePhase === 'playing') {
        const activeTeam = teams.find(t => t.id === activeTeamId);
        
        return (
            <div className={cn("min-h-screen bg-slate-950 text-white p-4 flex flex-col overflow-hidden font-sans", isFullscreen ? "p-0" : "")}>
                <header className="h-20 shrink-0 flex items-center justify-between bg-slate-900/80 backdrop-blur border-b border-white/10 px-6 rounded-2xl mb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-600 rounded-lg"><MonitorPlay className="text-white h-6 w-6" /></div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tight">Takım Yarışması</h1>
                            <p className="text-xs text-slate-400">{searchParams.get('courseName')} • {searchParams.get('topicName')}</p>
                        </div>
                    </div>
                    
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950 border border-white/10 px-6 py-2 rounded-full shadow-xl">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">SIRA:</span>
                        <span className={cn("text-xl font-black", 
                            activeTeam?.id === 1 ? "text-blue-400" : 
                            activeTeam?.id === 2 ? "text-red-400" : 
                            activeTeam?.id === 3 ? "text-green-400" : 
                            activeTeam?.id === 4 ? "text-yellow-400" :
                            activeTeam?.id === 5 ? "text-purple-400" : 
                            activeTeam?.id === 6 ? "text-orange-400" : "text-pink-400"
                        )}>
                            {activeTeam?.name}
                        </span>
                        {suggestedPlayer && (
                            <>
                                <div className="w-px h-4 bg-white/20 mx-2"></div>
                                <span className="text-sm text-yellow-400 font-bold flex items-center gap-2">
                                    <Users className="h-3 w-3"/> {suggestedPlayer}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleRandomQuestion} className="border-white/10 text-slate-300">
                            <Shuffle className="mr-2 h-4 w-4" /> Soru Seç
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={() => handleFinish()} 
                            className="bg-white text-slate-900 hover:bg-slate-200 font-bold"
                        >
                            <Flag className="mr-2 h-4 w-4"/> Bitir
                        </Button>
                        <FullscreenToggle className="bg-slate-800 text-white border-0" />
                    </div>
                </header>

                <div className="flex-1 grid grid-rows-[auto_1fr] gap-4 min-h-0">
                    <div className="grid gap-4 px-4" style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}>
                        {[...teams].sort((a,b) => b.score - a.score).map((team, idx) => (
                            <TeamScoreCard 
                                key={team.id} 
                                team={team} 
                                isActive={team.id === activeTeamId} 
                                colorIndex={team.id - 1} 
                                rank={idx}
                                suggestedPlayer={team.id === activeTeamId ? suggestedPlayer : null}
                                onClick={() => { setActiveTeamId(team.id); suggestPlayerForTeam(team); }}
                                onRemoveStudent={() => {}}
                            />
                        ))}
                    </div>

                    <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                            {questions.map((q, i) => {
                                const qNum = i + 1;
                                const isAnswered = answeredQuestions.includes(qNum);
                                return (
                                    <button
                                        key={qNum}
                                        disabled={isAnswered}
                                        onClick={() => setOpenedQuestion({ number: qNum, question: q })}
                                        className={cn(
                                            "aspect-square rounded-xl flex items-center justify-center text-xl font-bold shadow-lg transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-1 relative group overflow-hidden",
                                            isAnswered 
                                                ? "bg-slate-800 text-slate-600 border-slate-800 cursor-not-allowed" 
                                                : "bg-slate-700 text-white border-slate-900 hover:bg-indigo-600 hover:border-indigo-800"
                                        )}
                                    >
                                        {isAnswered ? <Check className="opacity-20"/> : qNum}
                                        {!isAnswered && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {openedQuestion && (
                    <QuestionDialog
                        isOpen={!!openedQuestion}
                        onClose={() => setOpenedQuestion(null)}
                        questionData={openedQuestion}
                        onAnswer={handleAnswer}
                        timerDuration={questionTimer}
                        pointsConfig={{ mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 } }} 
                        penaltyConfig={{ mcq: { Kolay: 5, Orta: 5, Zor: 5 }, tf: { Kolay: 10, Orta: 10, Zor: 10 }, fitb: { Kolay: 5, Orta: 5, Zor: 5 } }}
                        isFullscreen={isFullscreen}
                    />
                )}
            </div>
        );
    }

    // --- 3. EKRAN: BİTİŞ ---
    if (gamePhase === 'finished') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                <Card className="max-w-2xl w-full bg-slate-900 border-white/10 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2" />
                    <CardHeader className="pt-12 pb-6">
                        <Trophy className="h-24 w-24 mx-auto text-yellow-400 mb-6 animate-bounce" />
                        <CardTitle className="text-5xl font-black text-white uppercase">KAZANAN</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-12">
                        {winner && winner !== 'draw' ? (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-8 inline-block">
                                <h2 className="text-4xl font-black text-yellow-400 mb-2">{winner.name}</h2>
                                <p className="text-2xl text-white font-bold">{winner.score} PUAN</p>
                            </div>
                        ) : (
                            <h2 className="text-4xl font-black text-slate-300">DOSTLUK KAZANDI!</h2>
                        )}
                        <p className="mt-8 text-slate-400">Tüm sorular cevaplandı.</p>
                    </CardContent>
                    <CardFooter className="bg-slate-950 p-8 flex justify-center gap-4">
                        <Button size="lg" className="h-14 px-8 text-lg font-bold bg-white text-slate-900 hover:bg-slate-200" onClick={() => window.location.reload()}>
                            <Repeat className="mr-2 h-5 w-5"/> Tekrar Oyna
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg border-white/10 text-slate-300 hover:text-white">
                            <Link href="/teacher/smartboard"><Home className="mr-2 h-5 w-5"/> Çıkış</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return null;
}

export default function SmartboardTakimOyunPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-purple-500" /></div>}>
        <TeamCompetitionComponent />
    </Suspense>
  )
}