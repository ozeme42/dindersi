'use client';

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
    ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, 
    Check, Trash2, Users, Shuffle, PartyPopper, 
    Trophy, MonitorPlay, Save, Plus, Award,
    UserPlus, X, User, Settings2, Sparkles, Flag, Lock, Medal
} from "lucide-react";
import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import { QuestionDialog } from "@/components/question-dialog";
import { addStudentToClass } from "@/app/teacher/students/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SUMMER_SCHOOL_CLASS_NAME = "Yaz Okulu Havuzu";

// Renk Paleti - Daha belirgin renkler
const PLAYER_COLORS = [
    { bg: "bg-blue-500/20 hover:bg-blue-500/30", border: "border-blue-500", text: "text-blue-100", score: "text-blue-400" },
    { bg: "bg-red-500/20 hover:bg-red-500/30", border: "border-red-500", text: "text-red-100", score: "text-red-400" },
    { bg: "bg-green-500/20 hover:bg-green-500/30", border: "border-green-500", text: "text-green-100", score: "text-green-400" },
    { bg: "bg-yellow-500/20 hover:bg-yellow-500/30", border: "border-yellow-500", text: "text-yellow-100", score: "text-yellow-400" },
    { bg: "bg-purple-500/20 hover:bg-purple-500/30", border: "border-purple-500", text: "text-purple-100", score: "text-purple-400" },
    { bg: "bg-orange-500/20 hover:bg-orange-500/30", border: "border-orange-500", text: "text-orange-100", score: "text-orange-400" },
    { bg: "bg-pink-500/20 hover:bg-pink-500/30", border: "border-pink-500", text: "text-pink-100", score: "text-pink-400" },
    { bg: "bg-teal-500/20 hover:bg-teal-500/30", border: "border-teal-500", text: "text-teal-100", score: "text-teal-400" },
];

type GameQuestion = GetQuizOutput['questions'][0];
type GameCompetitor = UserProfile & { score: number; colorIndex: number };

// --- BİLEŞENLER ---

// Liderlik Tablosu Kartı (Kompakt ve Bilgilendirici)
const LeaderboardCard = ({ competitor, rank, onClick }: { competitor: GameCompetitor, rank: number, onClick: () => void }) => {
    const color = PLAYER_COLORS[competitor.colorIndex % PLAYER_COLORS.length];
    const getInitials = (name?: string) => name ? name.trim().charAt(0).toLocaleUpperCase('tr-TR') : '?';

    return (
        <div 
            onClick={onClick}
            className={cn(
                "relative group cursor-pointer transition-all duration-300 transform rounded-lg border-l-4 flex items-center p-3 h-20 shadow-md hover:shadow-xl hover:translate-x-1 active:scale-95 bg-slate-900/50",
                color.border, color.bg
            )}
        >
            {/* Sol: Sıralama */}
            <div className="w-12 shrink-0 flex flex-col items-center justify-center border-r border-white/10 pr-3 mr-3">
                {rank === 0 ? <Crown className="h-8 w-8 text-yellow-400 animate-pulse drop-shadow-md"/> : 
                 rank === 1 ? <Medal className="h-7 w-7 text-slate-300"/> :
                 rank === 2 ? <Medal className="h-7 w-7 text-amber-700"/> : 
                 <span className="text-2xl font-black text-slate-500/50">#{rank + 1}</span>}
            </div>

            {/* Orta: İsim ve Avatar */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className={cn("h-10 w-10 border-2", color.border)}>
                    <AvatarImage src={competitor.avatar || ''} />
                    <AvatarFallback className="bg-slate-950 font-bold text-white text-xs">{getInitials(competitor.displayName)}</AvatarFallback>
                </Avatar>
                <div className="truncate">
                    <h3 className={cn("font-bold text-base md:text-lg truncate leading-tight", color.text)}>
                        {competitor.displayName}
                    </h3>
                </div>
            </div>

            {/* Sağ: Puan */}
            <div className="shrink-0 pl-3">
                <div className={cn("text-3xl font-black tabular-nums tracking-tighter drop-shadow-sm", color.score)}>
                    {competitor.score}
                </div>
            </div>
        </div>
    );
};

// Kurulum Listesindeki Öğrenci
const SetupStudentItem = ({ student, isSelected, onClick }: { student: UserProfile, isSelected: boolean, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer select-none",
            isSelected 
                ? "bg-slate-900/50 border-transparent opacity-40 grayscale" 
                : "bg-slate-800/50 border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10"
        )}
    >
        <Avatar className="h-8 w-8 border border-white/10"><AvatarImage src={student.avatar} /><AvatarFallback className="text-[10px] bg-slate-900">{student.displayName?.charAt(0)}</AvatarFallback></Avatar>
        <span className="text-sm font-medium truncate flex-1">{student.displayName}</span>
        {isSelected && <Check className="h-4 w-4 text-emerald-500" />}
        {!isSelected && <Plus className="h-4 w-4 text-cyan-500 opacity-0 group-hover:opacity-100" />}
    </div>
);

// Yeni Öğrenci Ekleme Dialogu
function AddStudentDialog({ isOpen, onOpenChange, onAdd, isSaving }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onAdd: (name: string) => void, isSaving: boolean }) {
    const [displayName, setDisplayName] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onAdd(displayName); setDisplayName(''); }
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

function IndividualCompetitionComponent() {
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
    const [currentClass, setCurrentClass] = useState<SchoolClass | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    
    // Game Phase
    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [competitors, setCompetitors] = useState<GameCompetitor[]>([]);
    const [activeCompetitorId, setActiveCompetitorId] = useState<string | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
    const [winner, setWinner] = useState<GameCompetitor | null>(null);

    // Dialogs
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false);

    // Configs
    const questionTimer = parseInt(searchParams.get('questionTimer') || '30');
    const finishScore = parseInt(searchParams.get('finishScore') || '100');
    
    useEffect(() => {
        const initData = async () => {
            setIsLoading(true);
            try {
                // 1. Soruları Getir
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
                
                // 2. Sınıf ve Havuzu Getir
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

    // --- SETUP FONKSİYONLARI ---

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

    const handleAddGuest = async (name: string) => {
        if (!name.trim()) return;
        setIsAddingStudent(true);
        const className = currentClass ? `${currentClass.name} - ${selectedBranch === 'all' ? 'A' : selectedBranch} (Havuz)` : SUMMER_SCHOOL_CLASS_NAME;
        const res = await addStudentToClass(name, className);
        if (res.success && res.newUser) {
            setStudentPool(prev => [...prev, res.newUser!]);
            addToSelection(res.newUser!);
            setIsAddStudentOpen(false);
            toast({ title: "Eklendi", description: `${name} havuza eklendi.` });
        }
        setIsAddingStudent(false);
    };

    const startGame = () => {
        if (selectedStudents.length === 0) {
            toast({ title: "Uyarı", description: "En az 1 yarışmacı seçmelisiniz.", variant: "destructive" });
            return;
        }
        // Yarışmacıları oluştur (Puanları 0 başlar, renkler atanır)
        const gameComps: GameCompetitor[] = selectedStudents.map((s, idx) => ({ 
            ...s, 
            score: 0,
            colorIndex: idx // Herkese unique renk indexi ver
        }));
        setCompetitors(gameComps);
        setGamePhase('playing');
        playSound('start');
    };

    // --- GAMEPLAY FONKSİYONLARI ---

    // Skor Tablosu (Puan sırasına göre)
    const sortedCompetitors = useMemo(() => [...competitors].sort((a,b) => b.score - a.score), [competitors]);
    
    // Aktif Öğrenci Bilgisi
    const activeCompetitor = useMemo(() => competitors.find(c => c.uid === activeCompetitorId), [competitors, activeCompetitorId]);

    const handleRandomStudent = () => {
        if (competitors.length === 0) return;
        const random = competitors[Math.floor(Math.random() * competitors.length)];
        setActiveCompetitorId(random.uid);
        toast({ title: "Seçildi", description: `Sıra: ${random.displayName}` });
    };

    const handleAnswer = (qNum: number, isCorrect: boolean, scoreChange: number) => {
        if (!activeCompetitorId) return;

        let winnerFound: GameCompetitor | null = null;
        const newCompetitors = competitors.map(c => {
            if (c.uid === activeCompetitorId) {
                const newScore = Math.max(0, c.score + scoreChange);
                if (finishScore > 0 && newScore >= finishScore) winnerFound = { ...c, score: newScore };
                return { ...c, score: newScore };
            }
            return c;
        });

        setCompetitors(newCompetitors);
        setAnsweredQuestions([...answeredQuestions, qNum]);
        setOpenedQuestion(null);
        setActiveCompetitorId(null); // Cevaptan sonra seçimi kaldır ve soru ekranını kapat

        if (winnerFound) {
            setWinner(winnerFound);
            setGamePhase('finished');
            playSound('win');
        }
    };

    const handleFinish = () => {
        const sorted = [...competitors].sort((a,b) => b.score - a.score);
        setWinner(sorted[0]);
        setGamePhase('finished');
        playSound('win');
    };

    useEffect(() => {
        if (gamePhase === 'playing' && questions.length > 0 && answeredQuestions.length === questions.length) {
            handleFinish();
        }
    }, [answeredQuestions, questions, gamePhase]);


    if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /></div>;
    if (error) return <div className="h-screen flex items-center justify-center text-red-400 bg-slate-950">{error}</div>;

    // --- 1. EKRAN: KURULUM ---
    if (gamePhase === 'setup') {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
                <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <Settings2 className="h-8 w-8 text-cyan-400" /> BİREYSEL YARIŞMA
                        </h1>
                        <p className="text-slate-400 mt-1">Sınıftan öğrencileri seç ve bireysel yarıştır.</p>
                    </div>
                    <Button asChild variant="outline" className="border-white/10 text-slate-300">
                        <Link href="/teacher/smartboard/bireysel"><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                    </Button>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
                    
                    {/* SOL: HAVUZ */}
                    <Card className="bg-slate-900/50 border-white/10 flex flex-col overflow-hidden">
                        <CardHeader className="pb-3 border-b border-white/5 bg-slate-900">
                            <CardTitle className="text-lg flex justify-between items-center">
                                <span>Sınıf Listesi</span>
                                <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-1 rounded">{filteredPool.length} Öğrenci</span>
                            </CardTitle>
                            <div className="flex gap-2 mt-2">
                                {currentClass && (
                                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                        <SelectTrigger className="h-9 bg-slate-950 border-white/10 text-xs w-28"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            <SelectItem value="all">Tüm</SelectItem>
                                            {currentClass.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                                <Button size="sm" variant="secondary" className="h-9 text-xs flex-1" onClick={addAllFiltered} disabled={filteredPool.length === 0}>
                                    <Users className="mr-2 h-3 w-3" /> Tümünü Ekle
                                </Button>
                                <Button size="icon" className="h-9 w-9 bg-cyan-600 hover:bg-cyan-500" onClick={() => setIsAddStudentOpen(true)}>
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-2 flex-1 overflow-hidden">
                            <ScrollArea className="h-full pr-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {filteredPool.map(s => {
                                        const isSelected = selectedStudents.some(ss => ss.uid === s.uid);
                                        return <SetupStudentItem key={s.uid} student={s} isSelected={isSelected} onClick={() => !isSelected && addToSelection(s)} />
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* SAĞ: SEÇİLENLER */}
                    <Card className="bg-slate-900/50 border-white/10 flex flex-col overflow-hidden shadow-2xl">
                        <CardHeader className="pb-3 border-b border-white/5 bg-slate-900">
                            <CardTitle className="text-lg flex justify-between items-center text-cyan-300">
                                <span>Yarışacaklar</span>
                                <span className="bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded text-xs">{selectedStudents.length}</span>
                            </CardTitle>
                            <div className="flex justify-end mt-2">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedStudents([])} disabled={selectedStudents.length === 0} className="h-8 text-xs text-red-400 hover:bg-red-950/30">
                                    <Trash2 className="mr-2 h-3 w-3" /> Temizle
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-2 flex-1 overflow-hidden bg-cyan-900/5">
                            <ScrollArea className="h-full pr-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {selectedStudents.length > 0 ? selectedStudents.map(s => (
                                        <div key={s.uid} className="flex items-center justify-between p-2 rounded-lg bg-slate-800 border border-cyan-500/20 group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8"><AvatarImage src={s.avatar} /><AvatarFallback className="text-[10px] bg-slate-900">{s.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                                <span className="text-sm font-bold text-white truncate max-w-[120px]">{s.displayName}</span>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-red-400" onClick={() => removeFromSelection(s.uid)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )) : (
                                        <div className="col-span-2 h-40 flex flex-col items-center justify-center text-slate-500 text-sm">
                                            <UserPlus className="h-8 w-8 mb-2 opacity-50" />
                                            Soldan öğrenci seçin.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="bg-slate-900 p-4 border-t border-white/5">
                            <Button 
                                size="lg" 
                                className="w-full h-14 text-xl font-black bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 rounded-xl"
                                disabled={selectedStudents.length === 0}
                                onClick={startGame}
                            >
                                <Sparkles className="mr-2 h-6 w-6" /> OYUNU BAŞLAT
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <AddStudentDialog 
                    isOpen={isAddStudentOpen} 
                    onOpenChange={setIsAddStudentOpen} 
                    onAdd={handleAddGuest} 
                    isSaving={isAddingStudent} 
                />
            </div>
        );
    }

    // --- 2. EKRAN: OYUN ---
    if (gamePhase === 'playing') {
        return (
            <div className={cn("min-h-screen bg-slate-950 text-white p-4 flex flex-col overflow-hidden font-sans", isFullscreen ? "p-0" : "")}>
                {/* Üst Bar */}
                <header className="shrink-0 h-16 flex items-center justify-between bg-slate-900/80 backdrop-blur border-b border-white/10 px-6 rounded-2xl shadow-lg mb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-cyan-600 rounded-lg"><User className="text-white h-5 w-5" /></div>
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-tight">Bireysel Yarışma</h1>
                            <p className="text-[10px] text-slate-400">{searchParams.get('courseName')} • {searchParams.get('topicName')}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={handleRandomStudent} className="bg-slate-800 text-cyan-400 hover:bg-slate-700">
                            <Shuffle className="mr-2 h-4 w-4" /> Rastgele
                        </Button>
                        <Button size="sm" onClick={handleFinish} className="bg-white text-slate-900 hover:bg-slate-200 font-bold">
                            <Flag className="mr-2 h-4 w-4"/> Bitir
                        </Button>
                        <FullscreenToggle className="bg-slate-800 text-white border-0" />
                    </div>
                </header>

                {/* Ana İçerik: Liderlik Tablosu Grid */}
                <div className="flex-1 bg-slate-900/30 rounded-2xl border border-white/5 p-4 overflow-y-auto custom-scrollbar min-h-0 relative">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {sortedCompetitors.map((comp, idx) => (
                            <LeaderboardCard 
                                key={comp.uid} 
                                competitor={comp} 
                                rank={idx} 
                                onClick={() => setActiveCompetitorId(comp.uid)}
                            />
                        ))}
                    </div>
                </div>

                {/* Soru Seçim Modalı (Öğrenci Seçildiğinde Açılır) */}
                <Dialog open={!!activeCompetitorId && !openedQuestion} onOpenChange={(open) => !open && setActiveCompetitorId(null)}>
                    <DialogContent className="bg-slate-900 border-white/10 text-white max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden">
                        
                        <div className="p-6 border-b border-white/10 bg-slate-950 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {activeCompetitor && (
                                    <Avatar className={cn("h-12 w-12 border-2", PLAYER_COLORS[activeCompetitor.colorIndex % PLAYER_COLORS.length].border)}>
                                        <AvatarImage src={activeCompetitor.avatar} />
                                        <AvatarFallback className="bg-slate-800 font-bold">{activeCompetitor.displayName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        {activeCompetitor?.displayName}
                                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-normal">Soru Seçiyor</span>
                                    </h2>
                                </div>
                            </div>
                            <Button variant="ghost" onClick={() => setActiveCompetitorId(null)} className="text-slate-400 hover:text-white"><X className="h-6 w-6"/></Button>
                        </div>

                        <ScrollArea className="flex-1 p-6 bg-slate-900/50">
                            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
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
                                                    ? "bg-slate-800 text-slate-600 border-slate-800 cursor-not-allowed opacity-50" 
                                                    : "bg-slate-700 text-white border-slate-900 hover:bg-cyan-600 hover:border-cyan-800"
                                            )}
                                        >
                                            {isAnswered ? <Check className="opacity-20"/> : qNum}
                                            {!isAnswered && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>

                {/* Soru Ekranı (Modal) */}
                {openedQuestion && (
                    <QuestionDialog
                        isOpen={!!openedQuestion}
                        onClose={() => { setOpenedQuestion(null); setActiveCompetitorId(null); }} // Soru bitince her şeyi kapat
                        questionData={openedQuestion}
                        onAnswer={handleAnswer}
                        timerDuration={questionTimer}
                        pointsConfig={{ mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 } }} 
                        penaltyConfig={{ mcq: { Kolay: 5, Orta: 5, Zor: 5 }, tf: { Kolay: 10, Orta: 10, Zor: 10 }, fitb: { Kolay: 5, Orta: 5, Zor: 5 } }}
                        isFullscreen={isFullscreen}
                        activeStudentName={activeCompetitor?.displayName}
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
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2" />
                    <CardHeader className="pt-12 pb-6">
                        <Trophy className="h-24 w-24 mx-auto text-yellow-400 mb-6 animate-bounce" />
                        <CardTitle className="text-5xl font-black text-white uppercase">KAZANAN</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-12">
                        {winner ? (
                            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-8 inline-block">
                                <Avatar className="h-20 w-20 mx-auto mb-4 border-2 border-cyan-400">
                                    <AvatarImage src={winner.avatar} />
                                    <AvatarFallback className="text-xl bg-slate-900">{winner.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h2 className="text-4xl font-black text-cyan-400 mb-2">{winner.displayName}</h2>
                                <p className="text-2xl text-white font-bold">{winner.score} PUAN</p>
                            </div>
                        ) : (
                            <h2 className="text-4xl font-black text-slate-300">OYUN BİTTİ!</h2>
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

export default function SmartboardBireyselOyunPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /></div>}>
        <IndividualCompetitionComponent />
    </Suspense>
  )
}