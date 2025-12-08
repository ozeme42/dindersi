'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, AlertTriangle, Loader2, Check, Repeat, UserCheck, Award, PartyPopper, Shuffle, Crown, Home, MonitorPlay, Zap, Megaphone, Save, ChevronDown, ChevronUp, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getQuestionsFromBank, type GetQuizOutput } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { playSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { QuestionDialog } from "@/components/question-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateMultipleStudentScores } from '@/app/teacher/smartboard/actions';
import type { UserProfile, GetQuizInput, GetQuizOutput, Question } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, getDoc } from 'firebase/firestore';

type GameQuestion = GetQuizOutput['questions'][0];
type TeamStudent = { uid: string, displayName: string, avatar?: string };
type Team = { id: number; name: string; students: TeamStudent[]; score: number };
type TeamForUrl = { id: number; name: string; studentUids: string[] };

// --- BİLEŞENLER ---

const RankIcon = ({ rank }: { rank: number }) => {
    if (rank === 0) return <Crown className="h-8 w-8 text-yellow-400 fill-yellow-400/20 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-pulse" />;
    if (rank === 1) return <Award className="h-7 w-7 text-slate-300 fill-slate-300/20" />;
    if (rank === 2) return <Award className="h-7 w-7 text-amber-600 fill-amber-600/20" />;
    return <span className="text-xl font-black text-slate-600">#{rank + 1}</span>;
};

// Takım Kartı (MAÇ SKORBORDU STİLİ + KAYDIRILABİLİR LİSTE)
const TeamScoreCard = ({ team, isActive, rank, colorIndex, suggestedPlayer, onClick }: { team: Team, isActive: boolean, rank: number, colorIndex: number, suggestedPlayer?: string | null, onClick: () => void }) => {
    const [isListOpen, setIsListOpen] = useState(false);
    
    const themes = [
        { border: 'border-blue-500', shadow: 'shadow-blue-500/40', bg: 'bg-blue-950/80', header: 'bg-blue-600', text: 'text-blue-400', ring: 'ring-blue-400', glow: 'shadow-[0_0_30px_rgba(59,130,246,0.2)]' },
        { border: 'border-red-500', shadow: 'shadow-red-500/40', bg: 'bg-red-950/80', header: 'bg-red-600', text: 'text-red-400', ring: 'ring-red-400', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]' },
        { border: 'border-green-500', shadow: 'shadow-green-500/40', bg: 'bg-green-950/80', header: 'bg-green-600', text: 'text-green-400', ring: 'ring-green-400', glow: 'shadow-[0_0_30px_rgba(34,197,94,0.2)]' },
        { border: 'border-yellow-500', shadow: 'shadow-yellow-500/40', bg: 'bg-yellow-950/80', header: 'bg-yellow-600', text: 'text-yellow-400', ring: 'ring-yellow-400', glow: 'shadow-[0_0_30px_rgba(234,179,8,0.2)]' },
    ];
    const theme = themes[colorIndex % themes.length];

    const getInitials = (name?: string): string => {
        if (!name) return '?';
        return name.trim().charAt(0).toLocaleUpperCase('tr-TR');
    };

    return (
        <div 
            onClick={onClick}
            className={cn(
                "relative transition-all duration-300 transform rounded-xl overflow-hidden flex flex-col cursor-pointer border-t-4",
                theme.bg,
                theme.border,
                theme.glow,
                isActive 
                    ? `scale-105 z-20 shadow-[0_0_60px_rgba(0,0,0,0.6)] ring-2 ${theme.ring} ring-offset-4 ring-offset-slate-950 translate-y-[-5px]` 
                    : "opacity-90 scale-100 hover:scale-[1.02] hover:opacity-100 hover:shadow-2xl border-t-transparent hover:border-t-4"
            )}
        >
            {/* Header: Takım Adı */}
            <div className={cn("px-4 py-2 flex justify-between items-center bg-black/40 backdrop-blur-sm")}>
                <h3 className={cn("font-black uppercase tracking-tight text-white text-lg flex items-center gap-2")}>
                    {team.name}
                </h3>
                <RankIcon rank={rank} />
            </div>

            {/* SCOREBOARD DISPLAY (Devasa Skor) */}
            <div className="flex-1 flex flex-col items-center justify-center py-6 relative bg-gradient-to-b from-transparent to-black/20">
                <div className={cn(
                    "font-black tabular-nums tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] transition-all duration-300 leading-none", 
                    theme.text,
                    "text-7xl md:text-8xl"
                )}>
                    {team.score}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 mt-2">PUAN</div>
                
                {/* Aktif Takım İndikatörü */}
                {isActive && (
                    <div className="absolute inset-0 border-2 border-white/10 rounded-xl animate-pulse pointer-events-none" />
                )}
            </div>

            {/* Alt Kısım: Açılır/Kapanır Oyuncu Listesi */}
            <div className="bg-black/30 border-t border-white/5 backdrop-blur-md transition-all duration-300">
                
                {/* Toggle Butonu */}
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsListOpen(!isListOpen); }}
                    className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <span className="flex items-center gap-2"><Users className="w-3 h-3"/> {team.students.length} Oyuncu</span>
                    {isListOpen ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                </button>

                {/* Liste (Animasyonlu Açılma ve Kaydırma) */}
                <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out bg-black/40",
                    isListOpen ? "max-h-60 border-t border-white/10" : "max-h-0"
                )}>
                    {/* ScrollArea için sabit yükseklik veriyoruz ki kaydırma çalışsın */}
                    <ScrollArea className="h-60 w-full">
                        <div className="p-2 space-y-1">
                            {team.students.length > 0 ? (
                                team.students.map(student => (
                                    <div key={student.uid} className={cn(
                                        "flex items-center gap-3 p-2 rounded-md transition-colors border border-transparent",
                                        isActive && suggestedPlayer === student.displayName 
                                            ? "bg-white/10 border-white/30 animate-pulse" 
                                            : "hover:bg-white/5 hover:border-white/5"
                                    )}>
                                        <Avatar className="h-7 w-7 border border-white/20">
                                            <AvatarImage src={student.avatar || ''} />
                                            <AvatarFallback className={cn("text-[10px] font-bold text-white", theme.bg.replace('/80', ''))}>{getInitials(student.displayName)}</AvatarFallback>
                                        </Avatar>
                                        <span className={cn(
                                            "text-sm font-bold truncate flex-1",
                                            isActive && suggestedPlayer === student.displayName ? "text-white" : "text-slate-300"
                                        )}>
                                            {student.displayName}
                                        </span>
                                        {isActive && suggestedPlayer === student.displayName && (
                                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-yellow-500 text-black border-none font-bold">SEÇ</Badge>
                                        )}
                                    </div>
                                ))
                            ) : <p className="text-xs text-white/30 italic p-4 text-center">Bu takımda henüz oyuncu yok.</p>}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};

function CompetitionLoadingSkeleton() {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col p-6 gap-6">
        <div className="flex justify-between items-center">
            <div className="h-10 w-64 bg-slate-800/50 rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-slate-800/50 rounded-xl animate-pulse" />
        </div>
        <div className="flex justify-center gap-8 mb-8">
             <div className="h-80 w-64 bg-slate-800/30 rounded-3xl animate-pulse" />
             <div className="h-80 w-64 bg-slate-800/30 rounded-3xl animate-pulse" />
        </div>
        <div className="flex-1 bg-slate-900/30 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
}

function TeamCompetitionComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const questionTimer = parseInt(searchParams.get('questionTimer') || '0');
    const [isSubmittingScores, setIsSubmittingScores] = useState(false);
    const [scoresHaveBeenSaved, setScoresHaveBeenSaved] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
  
    const pointsConfig = useMemo(() => {
        const param = searchParams.get('points');
        try { return param ? JSON.parse(param) : { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }}; } catch { return { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }}; }
    }, [searchParams]);
    
    const penaltyConfig = useMemo(() => {
        const penaltyParam = searchParams.get('penalty');
        try { return penaltyParam ? JSON.parse(penaltyParam) : { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }}; } catch { return { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }}; }
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
    
    const [suggestedPlayer, setSuggestedPlayer] = useState<string | null>(null);

    const suggestPlayerForTeam = (teamId: number) => {
        const team = teams.find(t => t.id === teamId);
        if (team && team.students.length > 0) {
            const randomIndex = Math.floor(Math.random() * team.students.length);
            setSuggestedPlayer(team.students[randomIndex].displayName);
        } else {
            setSuggestedPlayer(null);
        }
    };
    
    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        try {
            const teamsParam = searchParams.get('teams');
            if (!teamsParam) { setError("Takım bilgileri bulunamadı."); return; }
            
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
            const firstTeamId = initialTeams[0]?.id || null;
            setActiveTeamId(firstTeamId);
            if(firstTeamId) suggestPlayerForTeam(firstTeamId);

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
  
    const handleSaveScores = async (andFinish: boolean = false) => {
        const inGameCompetitors = teams.flatMap(t => t.students);
        if (scoresHaveBeenSaved || inGameCompetitors.length === 0) return;

        setIsSubmittingScores(true);
        
        const scoreUpdates = inGameCompetitors.map(c => {
            const team = teams.find(t => t.students.some(s => s.uid === c.uid));
            return { 
                userId: c.uid, 
                points: team ? Math.round(team.score / (team.students.length || 1)) : 0, 
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
    };

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
          
          if (winnerFound) {
              setWinner(winnerFound);
              setGameState('finished');
          } else {
            // Sıradaki takıma geç
            const currentTeamIndex = teams.findIndex(t => t.id === activeTeamId);
            if (currentTeamIndex === -1) return;
            const nextTeamIndex = (currentTeamIndex + 1) % teams.length;
            const nextTeamId = teams[nextTeamIndex]?.id;
            setActiveTeamId(nextTeamId);
            suggestPlayerForTeam(nextTeamId); 
          }
    };

    const handleSelectRandomQuestion = () => {
        if (!activeTeamId) { toast({ title: 'Hata', description: 'Lütfen bir takım seçin!', variant: 'destructive'}); return; }
        const unanswered = questions.map((_, i) => i + 1).filter(qNum => !answeredQuestions.includes(qNum));
        if (unanswered.length === 0) { toast({ title: 'Tüm sorular cevaplandı!', variant: 'default'}); return; }
        const randomQNum = unanswered[Math.floor(Math.random() * unanswered.length)];
        setOpenedQuestion({ number: randomQNum, question: questions[randomQNum - 1] });
    };

    const startNewGame = () => window.location.reload();
    const sortedTeams = useMemo(() => [...teams].sort((a,b) => b.score - a.score), [teams]);
    
    if (isLoading) return <CompetitionLoadingSkeleton />;
    if (error) return (
        <div className="w-full h-full min-h-screen p-6 flex items-center justify-center bg-slate-950">
            <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-900 text-red-200">
                <AlertTriangle className="h-5 w-5 text-red-400" /> 
                <AlertTitle>Hata!</AlertTitle> 
                <AlertDescription>{error}</AlertDescription>
                <div className="mt-4"><Button asChild variant="outline" className="border-red-800 text-red-300 hover:bg-red-900/50"><Link href="/teacher/smartboard/takim"><ArrowLeft className="mr-2 h-4 w-4"/> Kuruluma Geri Dön</Link></Button></div>
            </Alert>
        </div>
    );

    // --- BİTİŞ EKRANI (KUTLAMA) ---
    if (gameState === 'finished') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
                <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />
                <Card className="w-full max-w-4xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl relative z-10 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />
                    
                    <CardHeader className="text-center pt-12 pb-6">
                        <div className="mx-auto bg-slate-800 p-6 rounded-full mb-6 shadow-xl ring-8 ring-slate-800/50 inline-block animate-bounce">
                            <Trophy className="h-20 w-20 text-yellow-400 fill-yellow-400/20" />
                        </div>
                        <CardTitle className="text-5xl font-black text-white uppercase tracking-tight drop-shadow-lg">Yarışma Tamamlandı!</CardTitle>
                    </CardHeader>
                    
                    <CardContent className="px-8 pb-10">
                        {winner && winner !== 'draw' && (
                            <div className="flex flex-col items-center mb-10">
                                <div className="relative">
                                    <div className="absolute -top-6 -right-6 text-4xl animate-bounce delay-100">👑</div>
                                    <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-6 py-4 rounded-3xl text-4xl font-black shadow-[0_0_40px_rgba(250,204,21,0.3)]">
                                        {winner.name}
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-white mt-4 flex items-center gap-2">
                                    {winner.score} PUAN
                                </div>
                            </div>
                        )}
                        
                        {winner === 'draw' && (
                            <div className="text-center mb-10">
                                <Award className="h-32 w-32 text-slate-400 mx-auto mb-4"/>
                                <p className="text-4xl font-black text-slate-200">BERABERE!</p>
                            </div>
                        )}

                        <div className="w-full max-w-2xl border border-white/10 rounded-2xl overflow-hidden bg-black/20 mx-auto">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-slate-400 font-bold w-[80px]">Sıra</TableHead>
                                        <TableHead className="text-slate-400 font-bold">Takım</TableHead>
                                        <TableHead className="text-right text-slate-400 font-bold">Puan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedTeams.map((team, index) => (
                                        <TableRow key={team.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                            <TableCell className="font-bold text-slate-300"><RankIcon rank={index}/></TableCell>
                                            <TableCell className="text-white font-medium text-lg">{team.name}</TableCell>
                                            <TableCell className="text-right font-black text-xl text-cyan-400">{team.score}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-900 border-t border-white/5 p-8 flex justify-center gap-6">
                        <Button size="lg" onClick={() => handleSaveScores(false)} disabled={isSubmittingScores || scoresHaveBeenSaved} className="h-16 px-8 text-xl rounded-2xl bg-white text-slate-900 hover:bg-slate-200">
                             {isSubmittingScores ? <Loader2 className="mr-3 h-6 w-6 animate-spin"/> : scoresHaveBeenSaved ? <Check className="mr-3 h-6 w-6"/> : <PartyPopper className="mr-3 h-6 w-6"/>}
                             {scoresHaveBeenSaved ? 'Puanlar Kaydedildi' : 'Puanları Kaydet'}
                        </Button>
                        <Button size="lg" onClick={startNewGame} className="h-16 px-8 text-xl rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20">
                            <Repeat className="mr-3 h-6 w-6"/> Tekrar Oyna
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-16 px-8 text-xl rounded-2xl border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                            <Link href="/teacher/smartboard"><Home className="mr-3 h-6 w-6"/> Çıkış</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // --- OYUN EKRANI ---
    return (
        <div className={cn("flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative selection:bg-cyan-500/30 font-sans", isFullscreen ? "" : "p-4 md:p-6")}>
             
             {/* Arka Plan */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[150px]" />
            </div>

            {/* Üst Bar */}
            <header className={cn(
                "flex-shrink-0 flex items-center justify-between z-20 mb-6 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg",
                isFullscreen && "rounded-none border-x-0 border-t-0 mb-0"
            )}>
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                        <MonitorPlay className="h-6 w-6 text-white"/>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-white uppercase leading-none">Takım Yarışması</h1>
                        <p className="text-xs text-slate-400 font-medium mt-1">{searchParams.get('courseName')} &bull; {searchParams.get('topicName')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                     <Button 
                        size="sm"
                        className={cn("font-bold transition-all h-10 px-4 rounded-xl", scoresHaveBeenSaved ? "bg-green-600 hover:bg-green-700 text-white" : "bg-white text-slate-900 hover:bg-slate-200")}
                        onClick={() => handleSaveScores(true)} 
                        disabled={isSubmittingScores || scoresHaveBeenSaved || teams.length === 0}
                    >
                        {isSubmittingScores ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : scoresHaveBeenSaved ? <Check className="mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                        {scoresHaveBeenSaved ? "Kaydedildi" : "Bitir"}
                    </Button>
                    <FullscreenToggle className="bg-slate-800 text-slate-300 hover:text-white border-0 h-10 w-10 rounded-lg" />
                    {!isFullscreen && (
                        <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                            <Link href="/teacher/smartboard/takim"><ArrowLeft className="h-5 w-5" /></Link>
                        </Button>
                    )}
                </div>
            </header>

            {/* Ana İçerik */}
            <main className="flex-1 flex flex-col gap-6 overflow-hidden relative z-10">
                
                {/* 1. ÜST: TAKIM KARTLARI */}
                <div className="flex-shrink-0">
                    <div className={cn(
                        "grid gap-4 md:gap-6 px-4 py-2 justify-center",
                        teams.length <= 2 ? "grid-cols-2 max-w-4xl mx-auto" : 
                        teams.length === 3 ? "grid-cols-3 max-w-6xl mx-auto" : 
                        "grid-cols-2 md:grid-cols-4"
                    )}>
                        {[...teams].sort((a,b) => b.score - a.score).map((team, index) => (
                            <TeamScoreCard 
                                key={team.id} 
                                team={team} 
                                isActive={team.id === activeTeamId} 
                                colorIndex={index} 
                                rank={sortedTeams.findIndex(t => t.id === team.id)} 
                                isFullscreen={isFullscreen} 
                                suggestedPlayer={team.id === activeTeamId ? suggestedPlayer : null}
                                onClick={() => { setActiveTeamId(team.id); suggestPlayerForTeam(team.id); }}
                            />
                        ))}
                    </div>
                </div>

                {/* 2. ALT: SORU PANELİ */}
                <div className="flex-1 min-h-0 px-2 pb-2">
                     <div className="h-full w-full bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-6 shadow-inner overflow-hidden flex flex-col">
                        
                        {/* Panel Header */}
                        <div className="flex flex-col md:flex-row items-center justify-between mb-6 shrink-0 border-b border-white/5 pb-4 gap-4">
                            <div className="flex items-center gap-4">
                                <span className="bg-slate-800 text-slate-300 px-4 py-1.5 rounded-full text-sm font-bold border border-white/10 whitespace-nowrap">
                                    {questions.length - answeredQuestions.length} Soru Kaldı
                                </span>
                                
                                {activeTeamId && (
                                    <div className="flex items-center gap-3 animate-pulse bg-cyan-500/10 px-6 py-2 rounded-xl border border-cyan-500/30">
                                        <Megaphone className="h-5 w-5 text-cyan-400" />
                                        <span className="text-cyan-200 font-bold uppercase tracking-wider text-sm">SIRADAKİ:</span>
                                        <span className="text-white font-black text-xl">{teams.find(t=>t.id===activeTeamId)?.name}</span>
                                        
                                        {suggestedPlayer && (
                                            <>
                                                <div className="h-6 w-px bg-white/20 mx-2" />
                                                <span className="text-cyan-200 text-sm font-medium">Öneri:</span>
                                                <span className="text-yellow-400 font-bold text-lg">{suggestedPlayer}</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <Button 
                                variant="outline" 
                                className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-10 px-6 rounded-xl text-sm font-bold ml-auto"
                                onClick={handleSelectRandomQuestion} 
                                disabled={!activeTeamId}
                            >
                                <Shuffle className="mr-2 h-4 w-4" /> Rastgele Seç
                            </Button>
                        </div>
                        
                        {/* Soru Grid */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            <div className={cn(
                                "grid gap-3",
                                isFullscreen ? "grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14" : "grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
                            )}>
                                {questions.map((q, i) => {
                                    const questionNumber = i + 1;
                                    const isAnswered = answeredQuestions.includes(questionNumber);
                                    const index = i % 8; // Renk döngüsü için
                                    const colorClass = [
                                        "bg-blue-600 hover:bg-blue-500 border-blue-800", 
                                        "bg-emerald-600 hover:bg-emerald-500 border-emerald-800", 
                                        "bg-amber-600 hover:bg-amber-500 border-amber-800", 
                                        "bg-indigo-600 hover:bg-indigo-500 border-indigo-800", 
                                        "bg-pink-600 hover:bg-pink-500 border-pink-800", 
                                        "bg-cyan-600 hover:bg-cyan-500 border-cyan-800", 
                                        "bg-rose-600 hover:bg-rose-500 border-rose-800", 
                                        "bg-violet-600 hover:bg-violet-500 border-violet-800"
                                    ][index];

                                    return (
                                        <button
                                            key={i}
                                            disabled={isAnswered || !activeTeamId}
                                            onClick={() => !isAnswered && setOpenedQuestion({ number: questionNumber, question: q })}
                                            className={cn(
                                                "aspect-square rounded-xl flex items-center justify-center text-2xl font-black transition-all duration-300 relative overflow-hidden group border-b-4 active:border-b-0 active:translate-y-1 h-full w-full min-h-[3rem]",
                                                isFullscreen ? "text-3xl" : "text-xl",
                                                isAnswered 
                                                    ? "bg-slate-800/40 text-slate-700 border-slate-800/50 cursor-not-allowed grayscale border-b-0" 
                                                    : cn("text-white shadow-lg", colorClass)
                                            )}
                                        >
                                            {!isAnswered && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            {isAnswered ? <Check className="h-8 w-8 opacity-20" /> : <span className="drop-shadow-md z-10">{questionNumber}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                     </div>
                </div>

            </main>

            {/* Modal */}
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
        </div>
    );
}

export default function SmartboardTakimOyunPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /></div>}>
        <TeamCompetitionComponent />
    </Suspense>
  )
}