
"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Swords, Repeat, UserCheck, Award, PartyPopper, Castle, Loader2, AlertTriangle, Home, Fullscreen, Trophy, Users, Shuffle, Check } from "lucide-react";
import Link from "next/link";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { getQuestionsFromBank, type GetQuizOutput } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { playSound, stopSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { QuestionDialog } from "@/components/question-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateMultipleStudentScores } from '@/app/teacher/smartboard/actions';
import type { UserProfile, Question } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where } from 'firebase/firestore';
import { UserAvatar } from "@/components/user-avatar";

const GRID_COLS = 6;
const GRID_ROWS = 4;
const TOTAL_TERRITORIES = GRID_COLS * GRID_ROWS;

type GameQuestion = Question;
type Player = { uid: string; displayName: string; };
type Team = { id: number; name: string; color: string; players: Player[]; score: number };
type TeamForUrl = { id: number; name: string; color: string; playerUids: string[] };
type Territory = {
  id: number;
  question: GameQuestion;
  owner: number | null; // team id
  isBase: boolean;
};

function CompetitionLoadingSkeleton() {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
            <Skeleton className="h-24 w-72" />
            <Skeleton className="h-24 w-72" />
        </div>
        <div className="aspect-video w-full max-w-4xl mx-auto grid gap-1 bg-gray-300 dark:bg-gray-700 p-1" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`}}>
            {Array.from({ length: TOTAL_TERRITORIES }).map((_, i) => (
                <Skeleton key={i} className="w-full h-full" />
            ))}
        </div>
      </div>
    );
}

const TeamScoreCard = ({ team, isActive }: { team: Team, isActive: boolean }) => {
    return (
        <Card 
            className={cn(
                'transition-all text-white border-transparent shadow-lg w-72',
                team.color === 'blue' ? 'bg-blue-600' : 'bg-red-600',
                isActive && `ring-4 ring-offset-background ring-offset-2 ring-white/80 scale-105`
            )}
        >
            <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-white/50 bg-white/20 font-bold text-lg">
                        <Castle />
                    </div>
                    <div className="truncate">
                        <p className="font-bold text-lg truncate">{team.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-bold">{team.score}</p>
                    <p className="text-xs opacity-80">Fethedilen Kale</p>
                </div>
            </CardContent>
        </Card>
    );
};


function TeamCompetitionComponent() {
    const searchParams = useSearchParams();
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ territoryId: number, question: GameQuestion } | null>(null);
    const [winner, setWinner] = useState<Team | null>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const [answeredQuestionHistory, setAnsweredQuestionHistory] = useState<{[key: number]: {teamId: number}}>({});

     const sıradakiOyuncu = useMemo(() => {
        if (!activeTeamId) return null;
        const activeTeam = teams.find(t => t.id === activeTeamId);
        if (!activeTeam || activeTeam.players.length === 0) return null;

        const answeredByTeam = Object.values(answeredQuestionHistory).filter(h => h.teamId === activeTeamId).length;

        return activeTeam.players[answeredByTeam % activeTeam.players.length];
    }, [activeTeamId, teams, answeredQuestionHistory]);


     useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const teamsParam = searchParams.get('teams');
            if (!teamsParam) throw new Error("Takım bilgileri eksik.");
            
            const teamsFromUrl: TeamForUrl[] = JSON.parse(teamsParam);
            const playerUids = teamsFromUrl.flatMap(t => t.playerUids);
            
            const studentDocs = playerUids.length > 0 ? await Promise.all(playerUids.map(id => getDoc(doc(db, "users", id)))) : [];
            const studentsMap = new Map(studentDocs.map(docSnap => [docSnap.id, { uid: docSnap.id, ...docSnap.data() } as UserProfile]));

            const initialTeams: Team[] = teamsFromUrl.map(tUrl => ({
                id: tUrl.id,
                name: tUrl.name,
                color: tUrl.color,
                score: 1, // Start with their base castle
                players: tUrl.playerUids.map(uid => studentsMap.get(uid)).filter(Boolean) as Player[],
            }));
            
            setTeams(initialTeams);
            setActiveTeamId(initialTeams[0]?.id || null);

            const params = {
                courseId: searchParams.get('courseId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: TOTAL_TERRITORIES,
            };
            const questionResult = await getFetihGameQuestions(params);

            if (questionResult.error) throw new Error(questionResult.error);
            if (!questionResult.questions || questionResult.questions.length < TOTAL_TERRITORIES) throw new Error(`Fetih oyunu için yeterli soru bulunamadı. En az ${TOTAL_TERRITORIES} soru gereklidir.`);
            
            const gameTerritories: Territory[] = questionResult.questions.map((q, i) => ({
                id: i,
                question: q,
                owner: null,
                isBase: false,
            }));

            // Set bases
            gameTerritories[0].owner = initialTeams[0].id;
            gameTerritories[0].isBase = true;
            gameTerritories[TOTAL_TERRITORIES - 1].owner = initialTeams[1].id;
            gameTerritories[TOTAL_TERRITORIES - 1].isBase = true;

            setTerritories(gameTerritories);
            setGameState('playing');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const isAdjacent = (territoryId: number, teamId: number): boolean => {
        const row = Math.floor(territoryId / GRID_COLS);
        const col = territoryId % GRID_COLS;
    
        for (let r_off = -1; r_off <= 1; r_off++) {
            for (let c_off = -1; c_off <= 1; c_off++) {
                if (r_off === 0 && c_off === 0) continue;
                const newRow = row + r_off;
                const newCol = col + c_off;
                if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
                    const neighborId = newRow * GRID_COLS + newCol;
                    if (territories[neighborId]?.owner === teamId) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const handleAnswerQuestion = (territoryId: number, isCorrect: boolean, scoreChange: number) => {
        if (activeTeamId === null || gameState !== 'playing') return;
        
        setAnsweredQuestionHistory(prev => ({...prev, [territoryId]: { teamId: activeTeamId }}));

        if (isCorrect) {
            const newTerritories = territories.map(t => 
                t.id === territoryId ? { ...t, owner: activeTeamId } : t
            );
            setTerritories(newTerritories);
            
            const newTeams = teams.map(t => 
                t.id === activeTeamId ? {...t, score: newTerritories.filter(terr => terr.owner === t.id).length} : t
            );
            setTeams(newTeams);
            
            // Check for win condition
            const opponentBaseId = activeTeamId === teams[0].id ? TOTAL_TERRITORIES - 1 : 0;
            if (territoryId === opponentBaseId) {
                setWinner(teams.find(t => t.id === activeTeamId) || null);
                setGameState('finished');
            }
        }
        
        setOpenedQuestion(null);
        const currentTeamIndex = teams.findIndex(t => t.id === activeTeamId);
        const nextTeamIndex = (currentTeamIndex + 1) % teams.length;
        setActiveTeamId(teams[nextTeamIndex]?.id);
    };
    
    useEffect(() => {
        if (gameState === 'playing' && territories.every(t => t.owner !== null)) {
            const scores = teams.map(t => t.score);
            const maxScore = Math.max(...scores);
            const winners = teams.filter(t => t.score === maxScore);
            setWinner(winners.length === 1 ? winners[0] : null); // null for a draw
            setGameState('finished');
        }
    }, [territories, teams, gameState]);
    
    if (isLoading) return <CompetitionLoadingSkeleton />;
    if (error) return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-screen">
            <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Hata!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                 <div className="mt-4">
                    <Button asChild variant="outline">
                        <Link href="/teacher/smartboard/fetih-oyunu"><ArrowLeft className="mr-2 h-4 w-4" /> Kuruluma Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );
    
    if (gameState === 'finished') {
        return (
             <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-xl text-center">
                    <CardHeader><CardTitle className="font-headline text-3xl">Oyun Bitti!</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Trophy className="h-24 w-24 text-amber-400"/>
                        <p className="text-2xl">Kazanan: <span className="font-bold text-primary">{winner?.name || 'Berabere!'}</span></p>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4">
                         <Button onClick={() => window.location.reload()}><Repeat className="mr-2 h-4 w-4"/> Yeni Oyun</Button>
                         <Button asChild variant="outline"><Link href="/teacher/smartboard"><Home className="mr-2 h-4 w-4"/> Ana Menü</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div ref={mainContentRef} className="w-full min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold font-headline">Fetih Oyunu</h1>
                <div className="flex items-center gap-2">
                    <FullscreenToggle elementRef={mainContentRef} />
                    <Button asChild variant="outline"><Link href="/teacher/smartboard/fetih-oyunu"><ArrowLeft className="mr-2 h-4 w-4" /> Kurulumu Değiştir</Link></Button>
                </div>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
                 {teams.map((team) => <TeamScoreCard key={team.id} team={team} isActive={team.id === activeTeamId} />)}
            </div>

            <div className="aspect-video w-full max-w-6xl mx-auto grid gap-1 bg-gray-300 dark:bg-gray-700 p-1" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`}}>
                {territories.map(t => {
                    const teamOwner = teams.find(team => team.id === t.owner);
                    const isAdjacentToActive = activeTeamId !== null && isAdjacent(t.id, activeTeamId);
                    const canAttack = t.owner !== activeTeamId && isAdjacentToActive;
                    
                    return (
                        <TooltipProvider key={t.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button 
                                        onClick={() => setOpenedQuestion({ territoryId: t.id, question: t.question })}
                                        disabled={!canAttack}
                                        className={cn(
                                            "w-full h-full flex items-center justify-center rounded-sm transition-all duration-200",
                                            t.owner === null ? "bg-gray-200 dark:bg-gray-800" : (teamOwner?.color === 'blue' ? 'bg-blue-500' : 'bg-red-500'),
                                            canAttack && "cursor-pointer hover:scale-105 hover:z-10 ring-2 ring-offset-2 ring-yellow-400",
                                            !canAttack && "cursor-not-allowed"
                                        )}
                                    >
                                        {t.isBase && <Castle className="h-6 w-6 text-white"/>}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{canAttack ? "Saldırmak için tıkla" : t.owner ? `${teamOwner?.name} tarafından fethedildi` : "Ulaşılamaz"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )
                })}
            </div>

             {sıradakiOyuncu && (
                <div className="mt-4 text-center">
                    <p className="text-muted-foreground text-sm">Sıradaki Oyuncu</p>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-background shadow justify-center max-w-xs mx-auto">
                        <UserAvatar user={sıradakiOyuncu} className="w-8 h-8" />
                        <span className="font-semibold">{sıradakiOyuncu.displayName}</span>
                    </div>
                </div>
            )}
            
            {openedQuestion && (
                <QuestionDialog
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={{ number: openedQuestion.territoryId, question: openedQuestion.question }}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={20} // Standard timer for this game
                    pointsConfig={{ 'default': { points: 1 } }} // Simplified score for territory capture
                    penaltyConfig={{ 'default': { penalty: 0 } }} // No score penalty, just loss of turn
                    isFullscreen={isFullscreen}
                    showCorrectAnswerOnWrong={false} // Don't show correct answer
                />
            )}
        </div>
    );
}

export default function SmartboardTakimOyunPage() {
    return <Suspense fallback={<CompetitionLoadingSkeleton />}><TeamCompetitionComponent /></Suspense>
}
