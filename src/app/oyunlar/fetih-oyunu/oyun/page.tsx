'use client';

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Swords, Repeat, Trophy, Castle, ShieldAlert, Skull, Home, Map } from "lucide-react";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/audio-service";
import { QuestionDialog } from "@/components/question-dialog";
import { getGameBackUrl, getTeacherActivitiesUrl } from "@/lib/game-navigation";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";
import type { GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WordwallShell, useWordwall } from "@/components/wordwall/wordwall-shell";

// --- OYUN AYARLARI ---
const GRID_COLS = 6;
const GRID_ROWS = 5;
const TOTAL_TERRITORIES = GRID_COLS * GRID_ROWS;

type Team = { id: number; name: string; color: string; playerUids: string[]; score: number };
type TeamForUrl = { id: number; name: string; color: string; playerUids: string[] };

type Territory = {
  id: number;
  question: any;
  ownerId: number | null;
  isBase: boolean;
};

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
    const { theme } = useWordwall();
    const ownerTeam = teams.find(t => t.id === territory.ownerId);
    
    // Renk sınıfları
    const baseColor = ownerTeam 
        ? (ownerTeam.color === 'blue' 
            ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
            : 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]')
        : cn("border-2", theme.cardBg, theme.cardBorder, theme.cardText);

    const activeState = canAttack 
        ? "cursor-pointer ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 animate-pulse scale-105 z-10" 
        : "cursor-default";

    return (
        <TooltipProvider>
            <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        disabled={!canAttack}
                        className={cn(
                            "relative w-full h-full min-h-[3.5rem] md:min-h-[4.2rem] rounded-xl border-2 transition-all duration-300 flex items-center justify-center group overflow-hidden shadow-sm",
                            baseColor,
                            activeState,
                            territory.isBase && "border-4"
                        )}
                    >
                        {/* İkonlar */}
                        {territory.isBase ? (
                            <Castle className={cn("w-7 h-7 md:w-9 md:h-9 z-10 drop-shadow-md", ownerTeam ? "text-white" : "opacity-40")} />
                        ) : territory.ownerId ? (
                            <ShieldAlert className="w-5 h-5 md:w-7 md:h-7 z-10 text-white/90" />
                        ) : (
                            <span className={cn("font-black text-xs md:text-sm transition-colors", canAttack ? "text-amber-400" : "opacity-60")}>
                                {territory.id + 1}
                            </span>
                        )}

                        {/* Saldırı Efekti (Hover) */}
                        {canAttack && (
                            <div className="absolute inset-0 bg-amber-400/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Swords className="w-6 h-6 text-amber-300 animate-bounce" />
                            </div>
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-slate-700 text-white text-xs">
                    {territory.isBase ? "Ana Üs" : ownerTeam ? `${ownerTeam.name} Bölgesi` : canAttack ? "Fethetmek için tıkla!" : "Komşu değil"}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

// Takım Skor Kartı (HUD)
const TeamHUD = ({ team, isActive }: { team: Team, isActive: boolean }) => {
    const { theme } = useWordwall();
    const isBlue = team.color === 'blue';
    return (
        <div className={cn(
            "flex items-center gap-3 px-4 py-2 sm:px-6 sm:py-2.5 rounded-2xl border-2 transition-all duration-300 shadow-md",
            isActive 
                ? (isBlue ? "bg-blue-950/80 border-blue-500 ring-2 ring-blue-400 scale-105" : "bg-red-950/80 border-red-500 ring-2 ring-red-400 scale-105")
                : cn(theme.subPanelBg, theme.cardBorder, "opacity-75")
        )}>
            <div className={cn(
                "w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 shadow-sm",
                isBlue ? "bg-blue-600 border-blue-300" : "bg-red-600 border-red-300"
            )}>
                {team.id === 1 ? <Swords className="text-white w-5 h-5" /> : <Skull className="text-white w-5 h-5" />}
            </div>
            <div>
                <h3 className={cn("font-black uppercase tracking-wider text-xs sm:text-sm", isBlue ? "text-blue-400" : "text-red-400")}>
                    {team.name}
                </h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black">{team.score}</span>
                    <span className={cn("text-[10px] sm:text-xs font-bold", theme.subText)}>BÖLGE</span>
                </div>
            </div>
            {isActive && (
                <div className="ml-1 sm:ml-2 animate-ping">
                    <div className={cn("w-2.5 h-2.5 rounded-full", isBlue ? "bg-blue-400" : "bg-red-400")} />
                </div>
            )}
        </div>
    );
};

function FetihGameBoard({
    teams,
    activeTeamId,
    territories,
    isAdjacent,
    setOpenedQuestion,
    winner,
    gameState,
    backUrl,
}: {
    teams: Team[];
    activeTeamId: number | null;
    territories: Territory[];
    isAdjacent: (territoryId: number, teamId: number) => boolean;
    setOpenedQuestion: (q: { territoryId: number, question: any } | null) => void;
    winner: Team | null;
    gameState: 'loading' | 'playing' | 'finished';
    backUrl: string;
}) {
    const { theme } = useWordwall();
    const router = useRouter();

    if (gameState === 'finished' && winner) {
        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                <div className={cn("w-full max-w-lg p-6 sm:p-8 rounded-2xl border-2 shadow-2xl backdrop-blur-xl text-center", theme.cardBg, theme.cardBorder, theme.cardText)}>
                    <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-3 animate-bounce" />
                    <h2 className="text-3xl font-black uppercase tracking-wider mb-2">FETİH TAMAMLANDI!</h2>
                    <p className={cn("text-base font-medium mb-6", theme.subText)}>Haritanın tek hakimi belli oldu.</p>
                    
                    <div className={cn(
                        "text-3xl sm:text-4xl font-black uppercase tracking-wider py-4 px-6 rounded-2xl border-2 shadow-lg mb-8",
                        winner.color === 'blue' ? "text-blue-400 border-blue-500 bg-blue-950/60" : "text-red-400 border-red-500 bg-red-950/60"
                    )}>
                        {winner.name} Kazandı!
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <Button 
                            onClick={() => window.location.reload()} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl flex-1 shadow-md"
                        >
                            <Repeat className="mr-2 h-5 w-5"/> Yeni Savaş
                        </Button>
                        <Button 
                            variant="outline" 
                            className={cn("h-12 rounded-xl font-bold border flex-1", theme.cardBorder, theme.cardText)}
                            onClick={() => router.push(backUrl)}
                        >
                            <Home className="mr-2 h-5 w-5"/> Çıkış
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const activeTeam = teams.find(t => t.id === activeTeamId);

    return (
        <div className="w-full h-full flex flex-col min-h-0 overflow-hidden relative select-none">
            {/* Üst HUD */}
            <div className="shrink-0 mb-3 flex items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-3 sm:gap-6">
                    {teams.map(team => (
                        <TeamHUD key={team.id} team={team} isActive={activeTeamId === team.id} />
                    ))}
                </div>

                <div className={cn("hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold", theme.subPanelBg, theme.cardBorder)}>
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Sıra:</span>
                    <span className={cn("uppercase tracking-wider font-black", activeTeam?.color === 'blue' ? "text-blue-400" : "text-red-400")}>
                        {activeTeam?.name}
                    </span>
                </div>
            </div>

            {/* Harita Grid */}
            <div className={cn("flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 rounded-2xl border-2 shadow-inner flex items-center justify-center", theme.cardBg, theme.cardBorder)}>
                <div 
                    className="w-full h-full max-w-5xl max-h-full grid gap-2 sm:gap-3"
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
            </div>
        </div>
    );
}

function FetihGameComponent() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/teacher/smartboard/fetih-oyunu' });
    const topicName = searchParams.get('topicName') || searchParams.get('title') || undefined;
    const { toast } = useToast();

    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Oyun Verileri
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [territories, setTerritories] = useState<Territory[]>([]);
    
    // Soru & Modal
    const [openedQuestion, setOpenedQuestion] = useState<{ territoryId: number, question: any } | null>(null);
    const [winner, setWinner] = useState<Team | null>(null);

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

            const initialTeams: Team[] = teamsFromUrl.map((t) => ({
                id: t.id,
                name: t.name,
                color: t.color,
                playerUids: t.playerUids,
                score: 1
            }));

            setTeams(initialTeams);
            setActiveTeamId(initialTeams[0].id);

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
            if (!result.questions || result.questions.length < 5) {
                throw new Error(`Yeterli soru yok. En az 5 soru gerekli.`);
            }

            const questions = result.questions || [];

            // Haritayı Oluştur (soru sayısı azsa döngüsel doldur)
            const gameTerritories: Territory[] = Array.from({ length: TOTAL_TERRITORIES }).map((_, i) => ({
                id: i,
                question: questions[i % questions.length],
                ownerId: null,
                isBase: false
            }));

            // Üsleri Ata: Sol Üst (0) ve Sağ Alt (Son index)
            gameTerritories[0].ownerId = initialTeams[0].id;
            gameTerritories[0].isBase = true;

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

    // Komşuluk Kontrolü
    const isAdjacent = (territoryId: number, teamId: number) => {
        const row = Math.floor(territoryId / GRID_COLS);
        const col = territoryId % GRID_COLS;

        const directions = [
            { r: -1, c: 0 }, { r: 1, c: 0 }, 
            { r: 0, c: -1 }, { r: 0, c: 1 }
        ];

        for (const dir of directions) {
            const newRow = row + dir.r;
            const newCol = col + dir.c;
            
            if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
                const neighborIndex = newRow * GRID_COLS + newCol;
                if (territories[neighborIndex]?.ownerId === teamId) return true;
            }
        }
        return false;
    };

    // Soru Cevaplandığında
    const handleAnswer = (isCorrect: boolean) => {
        if (!openedQuestion || activeTeamId === null) return;

        if (isCorrect) {
            playSound('win');
            
            const newTerritories = [...territories];
            const targetTerritory = newTerritories.find(t => t.id === openedQuestion.territoryId);
            
            if (targetTerritory) {
                const opponentTeam = teams.find(t => t.id !== activeTeamId);
                if (targetTerritory.isBase && targetTerritory.ownerId === opponentTeam?.id) {
                     targetTerritory.ownerId = activeTeamId;
                     setWinner(teams.find(t => t.id === activeTeamId) || null);
                     setGameState('finished');
                     return;
                }

                targetTerritory.ownerId = activeTeamId;
                setTerritories(newTerritories);
                setTeams(prev => prev.map(t => t.id === activeTeamId ? { ...t, score: t.score + 1 } : t));
            }
        } else {
            playSound('error');
            toast({ title: "Saldırı Başarısız!", description: "Yanlış cevap verdiniz, sıra rakip takıma geçiyor.", variant: "destructive" });
        }

        setOpenedQuestion(null);
        
        const currentIdx = teams.findIndex(t => t.id === activeTeamId);
        const nextIdx = (currentIdx + 1) % teams.length;
        setActiveTeamId(teams[nextIdx].id);
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full bg-slate-950 flex flex-col p-6 gap-4 items-center justify-center">
                <Loader2 className="w-14 h-14 text-emerald-500 animate-spin" />
                <p className="text-emerald-400 font-bold animate-pulse">Fetih Alanı Hazırlanıyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 p-4">
                <Alert variant="destructive" className="max-w-md bg-red-950/50 border-red-900 text-white">
                    <AlertTitle>Hata Oluştu</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <Button asChild variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10">
                        <Link href={backUrl}><Home className="mr-2 h-4 w-4"/> Geri Dön</Link>
                    </Button>
                </Alert>
            </div>
        );
    }

    const currentScore = Math.max(0, ...teams.map(t => t.score));

    return (
        <WordwallShell
            title="Fetih Oyunu"
            subtitle={topicName || "Bölge Hakimiyeti ve Strateji"}
            score={currentScore}
            backUrl={backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden relative flex flex-col p-2 sm:p-4"
        >
            <FetihGameBoard
                teams={teams}
                activeTeamId={activeTeamId}
                territories={territories}
                isAdjacent={isAdjacent}
                setOpenedQuestion={setOpenedQuestion}
                winner={winner}
                gameState={gameState}
                backUrl={backUrl}
            />

            {/* Soru Modalı */}
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={false}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={{ number: openedQuestion.territoryId + 1, question: openedQuestion.question }}
                    onAnswer={(_, isCorrect) => handleAnswer(isCorrect)}
                    timerDuration={30}
                    pointsConfig={{ 'default': { points: 1 } }}
                    penaltyConfig={{ 'default': { penalty: 0 } }}
                />
            )}
        </WordwallShell>
    );
}

export default function FetihOyunPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-slate-950 flex items-center justify-center"><Loader2 className="w-14 h-14 text-emerald-500 animate-spin" /></div>}>
            <FetihGameComponent />
        </Suspense>
    );
}