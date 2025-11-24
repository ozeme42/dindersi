
"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Swords, Repeat, UserCheck, Award, PartyPopper, Castle, Loader2, AlertTriangle, Home, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { updateMultipleStudentScores } from '@/app/teacher/smartboard/actions';
import { QuestionDialog } from "@/components/question-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile, GetQuizInput, GetQuizOutput, Question } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where } from 'firebase/firestore';

const GRID_COLS = 6;
const GRID_ROWS = 4;
const TOTAL_TERRITORIES = GRID_COLS * GRID_ROWS;

type GameQuestion = GetQuizOutput['questions'][0];
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

const TeamScoreCard = ({ team, isActive, rank, colorClass, nextPlayerName }: { team: Team, isActive: boolean, rank: number, colorClass: string, nextPlayerName?: string }) => {
    return (
        <Card 
            className={cn(
                'relative group cursor-pointer transition-all text-white border-transparent shadow-lg w-72',
                colorClass,
                isActive && `ring-4 ring-offset-background ring-offset-2 ring-white/80 scale-105`
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
                        <p className="font-bold text-lg truncate">{team.name}</p>
                         {isActive && nextPlayerName && (
                            <p className="text-xs opacity-80 animate-pulse">Sıradaki: {nextPlayerName}</p>
                        )}
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


function CompetitionComponent() {
    const searchParams = useSearchParams();
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ territoryId: number, question: GameQuestion } | null>(null);
    const [winner, setWinner] = useState<Team | null>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // This state will track the next player index for each team
    const [nextPlayerIndex, setNextPlayerIndex] = useState<Record<number, number>>({});

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
            
            const initialPlayerIndexes: Record<number, number> = {};
            initialTeams.forEach(t => initialPlayerIndexes[t.id] = 0);
            setNextPlayerIndex(initialPlayerIndexes);


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

        if (isCorrect) {
            const newTerritories = territories.map(t => 
                t.id === territoryId ? { ...t, owner: activeTeamId } : t
            );
            setTerritories(newTerritories);
            
            const newTeams = teams.map(t => 
                t.id === activeTeamId ? {...t, score: t.score + 1} : t
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
        
        setNextPlayerIndex(prev => {
            const team = teams[currentTeamIndex];
            if (team && team.players.length > 0) {
                 const nextIndex = (prev[team.id] + 1) % team.players.length;
                 return { ...prev, [team.id]: nextIndex };
            }
            return prev;
        });

        const nextTeamIndex = (currentTeamIndex + 1) % teams.length;
        setActiveTeamId(teams[nextTeamIndex]?.id);
    };
    
     const sortedTeams = useMemo(() => {
        return [...teams].sort((a, b) => b.score - a.score);
    }, [teams]);
    
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
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Oyun Bitti!</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Trophy className="h-24 w-24 text-amber-400"/>
                        <p className="text-2xl">Kazanan: <span className="font-bold text-primary">{winner?.name || 'Belli değil'}</span></p>
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
                 {teams.map((team, index) => {
                    const activeTeam = teams.find(t => t.id === activeTeamId);
                    const nextPlayerName = activeTeam?.id === team.id ? activeTeam?.players[nextPlayerIndex[team.id]]?.displayName : undefined;

                    return (
                        <TeamScoreCard 
                            key={team.id} 
                            team={team} 
                            isActive={team.id === activeTeamId} 
                            colorClass={team.color === 'blue' ? 'bg-blue-600' : 'bg-red-600'}
                            rank={sortedTeams.findIndex(t => t.id === team.id)}
                            nextPlayerName={nextPlayerName}
                        />
                    );
                 })}
            </div>

            <div className="aspect-video w-full max-w-6xl mx-auto grid gap-1 bg-gray-300 dark:bg-gray-700 p-1" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`}}>
                {territories.map(t => {
                    const teamOwner = teams.find(team => team.id === t.owner);
                    const isAdjacentToActive = activeTeamId !== null && isAdjacent(t.id, activeTeamId);
                    const canAttack = t.owner === null && isAdjacentToActive;
                    return (
                        <Button 
                            key={t.id}
                            onClick={() => setOpenedQuestion({ territoryId: t.id, question: t.question })}
                            disabled={!canAttack}
                            className={cn(
                                "w-full h-full flex items-center justify-center rounded-sm transition-all duration-200 p-0",
                                t.owner === null ? "bg-gray-200 dark:bg-gray-800" : (teamOwner?.color === 'blue' ? 'bg-blue-500' : 'bg-red-500'),
                                canAttack && "cursor-pointer hover:scale-105 hover:z-10 ring-2 ring-offset-2 ring-yellow-400",
                                !canAttack && "cursor-not-allowed"
                            )}
                        >
                            {t.isBase && <Castle className="h-6 w-6 text-white"/>}
                        </Button>
                    )
                })}
            </div>
             {openedQuestion && (
                <QuestionDialog
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={{number: openedQuestion.territoryId, question: openedQuestion.question}}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={20}
                    pointsConfig={{ 'default': { points: 1 } }}
                    penaltyConfig={{ 'default': { penalty: 0 } }} // No penalty in Fetih
                    isFullscreen={isFullscreen}
                    showCorrectAnswerOnWrong={false} // Don't show correct answer, just fail
                />
            )}
        </div>
    );
}

export default function FetihOyunPage() {
    return <Suspense fallback={<CompetitionLoadingSkeleton />}><CompetitionComponent /></Suspense>
}

    