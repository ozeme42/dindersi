'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Swords, Repeat, Award, Trophy, Castle, Map, ShieldAlert, Skull, Home, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { QuestionDialog } from "@/components/question-dialog";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { UserProfile, GetQuizInput, GetQuizOutput, Question } from "@/lib/types";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- OYUN AYARLARI ---
const GRID_COLS = 6;
const GRID_ROWS = 5; // Biraz daha geniş bir harita
const TOTAL_TERRITORIES = GRID_COLS * GRID_ROWS;

type GameQuestion = Question;
type Team = { id: number; name: string; color: string; playerUids: string[]; score: number };
type TeamForUrl = { id: number; name: string; color: string; playerUids: string[] };

// Bölge Tipi
type Territory = {
  id: number;
  question: GameQuestion;
  ownerId: number | null; // Takım ID'si veya Null (Tarafsız)
  isBase: boolean; // Ana üs mü?
};

// --- BİLEŞENLER ---

// Harita Bölgesi (Hücre)
const TerritoryNode = ({ 
    territory, 
    activeTeamId, 
    teams, 
    canAttack, 
    onClick 
}: { 
    territory: Territory, 
    activeTeamId: number | null, 
    teams: Team[], 
    canAttack: boolean, 
    onClick: () => void 
}) => {
    const ownerTeam = teams.find(t => t.id === territory.ownerId);
    
    // Renk sınıfları
    const baseColor = ownerTeam 
        ? (ownerTeam.color === 'blue' ? 'bg-blue-600/90 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-red-600/90 border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]')
        : 'bg-slate-800/50 border-white/5 hover:bg-slate-700/50';

    const activeState = canAttack 
        ? "cursor-pointer ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-950 animate-pulse bg-slate-700" 
        : "cursor-default";

    return (
        <TooltipProvider>
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        disabled={!canAttack}
                        className={cn(
                            "relative w-full h-full min-h-[4rem] rounded-xl border-2 transition-all duration-300 flex items-center justify-center group overflow-hidden",
                            baseColor,
                            activeState,
                            territory.isBase && "border-4"
                        )}
                    >
                        {/* Arka Plan Deseni */}
                        <div className="absolute inset-0 opacity-20 bg-[url('/noise.png')] mix-blend-overlay" />
                        
                        {/* İkonlar */}
                        {territory.isBase ? (
                            <Castle className={cn("w-8 h-8 md:w-10 md:h-10 z-10 drop-shadow-md", ownerTeam ? "text-white" : "text-slate-500")} />
                        ) : territory.ownerId ? (
                            <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 z-10 text-white/80" />
                        ) : (
                            <span className="text-slate-600 font-bold text-xs md:text-sm group-hover:text-slate-400">
                                {territory.id + 1}
                            </span>
                        )}

                        {/* Saldırı Efekti (Hover) */}
                        {canAttack && (
                            <div className="absolute inset-0 bg-yellow-400/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Swords className="w-8 h-8 text-yellow-400 animate-bounce" />
                            </div>
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-slate-700 text-white">
                    {territory.isBase ? "Ana Üs" : ownerTeam ? `${ownerTeam.name} Bölgesi` : canAttack ? "Saldırmak için tıkla!" : "Ulaşılamaz Bölge"}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

// Takım Skor Kartı (HUD)
const TeamHUD = ({ team, isActive }: { team: Team, isActive: boolean }) => {
    const isBlue = team.color === 'blue';
    return (
        <div className={cn(
            "flex items-center gap-4 px-6 py-3 rounded-2xl border-2 transition-all duration-500",
            isActive 
                ? (isBlue ? "bg-blue-950/80 border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.4)] scale-105" : "bg-red-950/80 border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)] scale-105")
                : "bg-slate-900/50 border-white/5 opacity-70 grayscale-[0.5]"
        )}>
            <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-lg",
                isBlue ? "bg-blue-600 border-blue-300" : "bg-red-600 border-red-300"
            )}>
                {team.id === 1 ? <Swords className="text-white w-6 h-6" /> : <Skull className="text-white w-6 h-6" />}
            </div>
            <div>
                <h3 className={cn("font-black uppercase tracking-wider text-sm", isBlue ? "text-blue-400" : "text-red-400")}>
                    {team.name}
                </h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{team.score}</span>
                    <span className="text-xs text-slate-400 font-bold">BÖLGE</span>
                </div>
            </div>
            {isActive && (
                <div className="ml-2 animate-pulse">
                    <div className={cn("w-3 h-3 rounded-full", isBlue ? "bg-blue-400" : "bg-red-400")} />
                </div>
            )}
        </div>
    );
}

function CompetitionLoadingSkeleton() {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col p-6 gap-6 items-center justify-center">
         <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
         <p className="text-emerald-500 font-bold animate-pulse">Savaş Alanı Hazırlanıyor...</p>
      </div>
    );
}

function FetihGameComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Oyun Verileri
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [territories, setTerritories] = useState<Territory[]>([]);
    
    // Soru & Modal
    const [openedQuestion, setOpenedQuestion] = useState<{ territoryId: number, question: GameQuestion } | null>(null);
    const [winner, setWinner] = useState<Team | null>(null);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Verileri Çek
    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        try {
            let teamsParam = searchParams.get('teams');
            let teamsFromUrl: TeamForUrl[];
            if (!teamsParam) {
                teamsFromUrl = [
                    { id: 1, name: "Mavi Takım", color: "blue", playerUids: [] },
                    { id: 2, name: "Kırmızı Takım", color: "red", playerUids: [] }
                ];
            } else {
                teamsFromUrl = JSON.parse(teamsParam);
            }

            // Başlangıç Takımları
            const initialTeams: Team[] = teamsFromUrl.map((t, idx) => ({
                id: t.id,
                name: t.name,
                color: t.color,
                playerUids: t.playerUids,
                score: 1 // Herkes 1 ana üsle başlar
            }));

            setTeams(initialTeams);
            setActiveTeamId(initialTeams[0].id); // Mavi başlar

            // Soruları Çek
            const params: GetQuizInput = {
                courseId: searchParams.get('courseId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                questionCount: TOTAL_TERRITORIES,
                difficulty: ['Kolay', 'Orta', 'Zor'],
                questionTypes: ['mcq', 'tf', 'fitb']
            };
            
            const result = await getQuestionsFromBank(params);
            if ('error' in result) throw new Error(result.error);
            if (!result.questions || result.questions.length < TOTAL_TERRITORIES) {
                // Yeterli soru yoksa havuzdan rastgele doldur veya hata ver
                // Şimdilik hata verelim
                 throw new Error(`Yeterli soru yok. En az ${TOTAL_TERRITORIES} soru gerekli.`);
            }

            // Haritayı Oluştur
            const gameTerritories: Territory[] = result.questions.slice(0, TOTAL_TERRITORIES).map((q, i) => ({
                id: i,
                question: q,
                ownerId: null,
                isBase: false
            }));

            // Üsleri Ata (Sol Üst ve Sağ Alt)
            // Takım 1 (Mavi) -> Sol Üst (0)
            gameTerritories[0].ownerId = initialTeams[0].id;
            gameTerritories[0].isBase = true;

            // Takım 2 (Kırmızı) -> Sağ Alt (Son index)
            gameTerritories[TOTAL_TERRITORIES - 1].ownerId = initialTeams[1].id;
            gameTerritories[TOTAL_TERRITORIES - 1].isBase = true;

            setTerritories(gameTerritories);
            setGameState('playing');

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    // Komşuluk Kontrolü (Saldırı Mantığı)
    const isAdjacent = (territoryId: number, teamId: number) => {
        const row = Math.floor(territoryId / GRID_COLS);
        const col = territoryId % GRID_COLS;

        // Üst, Alt, Sol, Sağ (Diagonaller kapalı - daha stratejik)
        const directions = [
            { r: -1, c: 0 }, { r: 1, c: 0 }, 
            { r: 0, c: -1 }, { r: 0, c: 1 }
        ];

        for (const dir of directions) {
            const newRow = row + dir.r;
            const newCol = col + dir.c;
            
            if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
                const neighborIndex = newRow * GRID_COLS + newCol;
                // Eğer komşu bölge bu takıma aitse, saldırabiliriz
                if (territories[neighborIndex].ownerId === teamId) return true;
            }
        }
        return false;
    };

    // Soru Cevaplandığında
    const handleAnswer = (isCorrect: boolean) => {
        if (!openedQuestion || activeTeamId === null) return;

        if (isCorrect) {
            playSound('win');
            
            // Bölgeyi Fethet
            const newTerritories = [...territories];
            const targetTerritory = newTerritories.find(t => t.id === openedQuestion.territoryId);
            
            if (targetTerritory) {
                // Eğer rakip üs ise OYUN BİTER
                const opponentTeam = teams.find(t => t.id !== activeTeamId);
                if (targetTerritory.isBase && targetTerritory.ownerId === opponentTeam?.id) {
                     targetTerritory.ownerId = activeTeamId;
                     setWinner(teams.find(t => t.id === activeTeamId) || null);
                     setGameState('finished');
                     return;
                }

                // Normal Fetih
                targetTerritory.ownerId = activeTeamId;
                setTerritories(newTerritories);

                // Skoru Güncelle
                setTeams(prev => prev.map(t => t.id === activeTeamId ? { ...t, score: t.score + 1 } : t));
            }
        } else {
            playSound('error');
            toast({ title: "Saldırı Başarısız!", description: "Yanlış cevap verdiniz, sıra rakibe geçiyor.", variant: "destructive" });
        }

        setOpenedQuestion(null);
        
        // Sırayı Değiştir
        const currentIdx = teams.findIndex(t => t.id === activeTeamId);
        const nextIdx = (currentIdx + 1) % teams.length;
        setActiveTeamId(teams[nextIdx].id);
    };

    // Render
    if (isLoading) return <CompetitionLoadingSkeleton />;
    if (error) return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-950 p-4">
            <Alert variant="destructive" className="max-w-md bg-red-950/50 border-red-900 text-white">
                <AlertTitle>Hata Oluştu</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <Button asChild variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10">
                    <Link href="/teacher/smartboard/fetih-oyunu"><ArrowLeft className="mr-2 h-4 w-4"/> Kuruluma Dön</Link>
                </Button>
            </Alert>
        </div>
    );

    if (gameState === 'finished' && winner) {
        return (
            <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950" />
                <Card className="w-full max-w-2xl bg-slate-900/80 border-white/10 backdrop-blur-xl relative z-10">
                    <CardHeader className="text-center">
                        <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4 animate-bounce" />
                        <CardTitle className="text-5xl font-black text-white uppercase">FETİH TAMAMLANDI!</CardTitle>
                        <CardDescription className="text-xl text-slate-400">Haritanın hakimi belli oldu.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center py-8">
                        <p className="text-2xl font-bold text-white mb-2">Kazanan Takım</p>
                        <div className={cn(
                            "text-6xl font-black uppercase tracking-widest py-4 rounded-2xl border-2 shadow-[0_0_50px_rgba(0,0,0,0.5)]",
                            winner.color === 'blue' ? "text-blue-400 border-blue-500 bg-blue-950/50" : "text-red-400 border-red-500 bg-red-950/50"
                        )}>
                            {winner.name}
                        </div>
                    </CardContent>
                    <CardFooter className="justify-center gap-4">
                         <Button onClick={() => window.location.reload()} size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                             <Repeat className="mr-2 h-5 w-5"/> Yeni Savaş
                         </Button>
                         <Button asChild variant="outline" size="lg" className="border-white/10 text-slate-300">
                             <Link href="/teacher/smartboard"><Home className="mr-2 h-5 w-5"/> Ana Menü</Link>
                         </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className={cn("flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative selection:bg-emerald-500/30 font-sans", !isFullscreen && "p-4")}>
            
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-red-900/10 rounded-full blur-[150px]" />
            </div>

            {/* Üst Bar (HUD) */}
            <header className="flex-shrink-0 z-20 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white"><Link href="/teacher/smartboard/fetih-oyunu"><ArrowLeft className="h-6 w-6"/></Link></Button>
                     <h1 className="text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                         <Map className="h-6 w-6 text-emerald-500" /> Fetih Haritası
                     </h1>
                </div>
                
                {/* Skor Tablosu */}
                <div className="flex items-center gap-8">
                     {teams.map(team => (
                         <TeamHUD key={team.id} team={team} isActive={activeTeamId === team.id} />
                     ))}
                </div>

                <div className="flex items-center gap-2">
                    <FullscreenToggle className="bg-slate-800 text-slate-300 hover:text-white border-0 h-10 w-10 rounded-lg" />
                </div>
            </header>

            {/* Harita Alanı */}
            <main className="flex-1 relative z-10 flex items-center justify-center p-2 md:p-8">
                <div className="w-full max-w-7xl h-full aspect-[16/9] max-h-[85vh] bg-slate-900/50 backdrop-blur-sm border-2 border-white/5 rounded-[2rem] p-4 md:p-6 shadow-2xl relative overflow-hidden">
                    
                    {/* Harita Grid */}
                    <div 
                        className="w-full h-full grid gap-3 md:gap-4"
                        style={{ 
                            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`
                        }}
                    >
                        {territories.map((t) => (
                            <TerritoryNode 
                                key={t.id}
                                territory={t}
                                activeTeamId={activeTeamId}
                                teams={teams}
                                canAttack={t.ownerId === null && activeTeamId !== null && isAdjacent(t.id, activeTeamId)}
                                onClick={() => setOpenedQuestion({ territoryId: t.id, question: t.question })}
                            />
                        ))}
                    </div>

                    {/* Sıra Kimde İndikatörü (Alt) */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-xl pointer-events-none">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                            <ShieldAlert className="w-4 h-4 text-yellow-400" />
                            <span>Sıra:</span>
                            <span className={cn(
                                "uppercase tracking-widest", 
                                teams.find(t => t.id === activeTeamId)?.color === 'blue' ? "text-blue-400" : "text-red-400"
                            )}>
                                {teams.find(t => t.id === activeTeamId)?.name}
                            </span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Soru Modalı */}
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={isFullscreen}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={{ number: openedQuestion.territoryId + 1, question: openedQuestion.question }}
                    onAnswer={(_, isCorrect) => handleAnswer(isCorrect)}
                    timerDuration={30} // Fetih için sabit süre veya configden gelebilir
                    pointsConfig={{ 'default': { points: 1 } }}
                    penaltyConfig={{ 'default': { penalty: 0 } }}
                />
            )}
        </div>
    );
}

export default function FetihOyunPage() {
    return <Suspense fallback={<CompetitionLoadingSkeleton />}><FetihGameComponent /></Suspense>
}