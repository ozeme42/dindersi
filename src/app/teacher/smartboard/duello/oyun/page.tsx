"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Swords, Repeat, UserCheck, Award, PartyPopper } from "lucide-react";
import Link from "next/link";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { playSound, stopSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { QuestionDialog } from "@/components/question-dialog";
import { Loader2 } from "lucide-react";
import { Home } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { UserProfile, GetQuizInput, GetQuizOutput, Question } from "@/lib/types";
import { updateMultipleStudentScores } from "../../actions";

type GameQuestion = Question;
type Player = { id: string; name: string; isGuest: boolean; };

function DuelGameComponent() {
    const searchParams = useSearchParams();
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    
    const [duelists, setDuelists] = useState<{ p1: Player, p2: Player } | null>(null);
    const [activePlayer, setActivePlayer] = useState<Player | null>(null);
    const [tugProgress, setTugProgress] = useState(0); // -100 (p2 wins) to 100 (p1 wins)

    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [winner, setWinner] = useState<Player | 'draw' | null>(null);

    const questionTimer = parseInt(searchParams.get('questionTimer') || '0');
    const pullStrengthConfig = useMemo(() => {
        const param = searchParams.get('pullStrength');
        try {
            return param ? JSON.parse(param) : { Kolay: 10, Orta: 15, Zor: 20 };
        } catch { return { Kolay: 10, Orta: 15, Zor: 20 }; }
    }, [searchParams]);

    const fetchGameData = useCallback(async () => {
        const p1Id = searchParams.get('p1');
        const p2Id = searchParams.get('p2');
        
        if (!p1Id || !p2Id) {
            setError("Savaşçı bilgileri eksik. Lütfen kurulum ekranına geri dönün.");
            setIsLoading(false);
            return;
        }

        try {
            const [p1Doc, p2Doc] = await Promise.all([ getDoc(doc(db, "users", p1Id)), getDoc(doc(db, "users", p2Id)) ]);
            
            if (!p1Doc.exists() || !p2Doc.exists()) throw new Error("Savaşçılar bulunamadı.");

            const player1Data = p1Doc.data();
            const player2Data = p2Doc.data();
            const p1IsGuest = player1Data.role === 'guest';
            const p2IsGuest = player2Data.role === 'guest';
            
            const p1 = { id: p1Doc.id, name: player1Data.displayName, isGuest: p1IsGuest };
            const p2 = { id: p2Doc.id, name: player2Data.displayName, isGuest: p2IsGuest };

            setDuelists({ p1, p2 });
            setActivePlayer(p1);

            // Fetch questions
            const params: GetQuizInput = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: parseInt(searchParams.get('questionCount') || '20'),
                difficulty: searchParams.get('difficulty')?.split(','),
                questionTypes: searchParams.get('questionTypes')?.split(','),
            };
            const questionResult = await getQuestionsFromBank(params as any);
            if (questionResult.error) throw new Error(questionResult.error);
            if (!questionResult.questions || questionResult.questions.length === 0) throw new Error("Soru bulunamadı.");
            
            const formattedQuestions = questionResult.questions.map(q => ({
                ...q,
                text: q.text || (q as any).question || (q as any).statement || (q as any).sentenceWithBlank || '',
            })) as GameQuestion[];
            
            setQuestions(formattedQuestions);
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

    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        if (gameState !== 'playing' || !activePlayer || !duelists) return;
        
        let newTugProgress = tugProgress + (activePlayer.id === duelists.p1.id ? scoreChange : -scoreChange);
        newTugProgress = Math.max(-100, Math.min(100, newTugProgress));
        
        setTugProgress(newTugProgress);
        setAnsweredQuestions(prev => [...prev, questionNumber]);
        setOpenedQuestion(null);

        if (newTugProgress >= 100) { setWinner(duelists.p1); setGameState('finished'); }
        else if (newTugProgress <= -100) { setWinner(duelists.p2); setGameState('finished'); }
        else if (answeredQuestions.length + 1 === questions.length) {
            if (newTugProgress > 0) setWinner(duelists.p1);
            else if (newTugProgress < 0) setWinner(duelists.p2);
            else setWinner('draw');
            setGameState('finished');
        } else {
            setActivePlayer(activePlayer.id === duelists.p1.id ? duelists.p2 : duelists.p1);
        }
    };
    
    useEffect(() => {
        if (gameState === 'finished' && winner && winner !== 'draw' && duelists) {
            const winnerId = winner.id;
            const loserId = winnerId === duelists.p1.id ? duelists.p2.id : duelists.p1.id;

            const scoreUpdates = [
                { userId: winnerId, points: 50, gameType: 'smartboard_duello' as const, context: 'Düello Galibiyeti' },
                { userId: loserId, points: 10, gameType: 'smartboard_duello' as const, context: 'Düello Katılımı' },
            ].filter(update => !duelists.p1.isGuest && !duelists.p2.isGuest);
            
            if(scoreUpdates.length > 0) {
                updateMultipleStudentScores(scoreUpdates);
            }
        }
    }, [gameState, winner, duelists]);
    
    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin"/></div>
    if (error) return <div className="text-red-500">{error}</div>

    if (gameState === 'finished') {
         return (
             <div className="w-full h-full min-h-screen p-4 flex items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardHeader><CardTitle className="font-headline text-3xl">Düello Bitti!</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        {winner === 'draw' ? <p>Berabere!</p> : <><Award className="h-24 w-24 text-amber-400"/><p className="text-2xl font-bold">Kazanan: {winner?.name}</p></>}
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button size="lg" onClick={() => window.location.reload()}><Repeat className="mr-2 h-5 w-5"/> Rövanş</Button>
                        <Button asChild variant="outline"><Link href="/teacher/smartboard"><Home className="mr-2 h-5 w-5"/> Ana Menü</Link></Button>
                    </CardFooter>
                </Card>
             </div>
         )
    }

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-red-400 to-yellow-500 p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-headline text-white drop-shadow-lg">Düello</h1>
            </div>
            {duelists && 
            <div className="my-8 space-y-2">
                <div className="flex justify-between items-center px-2 text-white drop-shadow-md">
                    <p className={cn("font-bold text-lg", activePlayer?.id === duelists.p1.id && "ring-2 ring-white p-1 rounded")}>{duelists.p1.name}</p>
                    <p className={cn("font-bold text-lg", activePlayer?.id === duelists.p2.id && "ring-2 ring-white p-1 rounded")}>{duelists.p2.name}</p>
                </div>
                <div className="flex h-10 w-full bg-muted rounded-full overflow-hidden border-2 relative items-center shadow-inner">
                    <div className="bg-primary h-full transition-all duration-500" style={{ width: `${50 + tugProgress / 2}%` }} />
                    <div className="bg-destructive h-full transition-all duration-500" style={{ width: `${50 - tugProgress / 2}%` }}/>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-card flex items-center justify-center border-4 shadow-lg"><Swords className="h-6 w-6 text-destructive"/></div>
                    </div>
                </div>
                <p className="text-center text-white drop-shadow-sm text-sm">Sıra: <span className="font-bold">{activePlayer?.name}</span></p>
            </div>
            }
            <Card>
                <CardHeader><CardTitle>Sorular</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {questions.map((q, i) => {
                        const qNum = i + 1;
                        const isAnswered = answeredQuestions.includes(qNum);
                        return <Button key={i} className={cn("aspect-square h-auto w-auto", isAnswered ? "bg-muted" : "bg-primary")} disabled={isAnswered} onClick={() => setOpenedQuestion({ number: qNum, question: q as GameQuestion })}>{qNum}</Button>
                    })}
                </CardContent>
            </Card>
            {openedQuestion && <QuestionDialog isFullscreen={false} isOpen={!!openedQuestion} onClose={() => setOpenedQuestion(null)} questionData={openedQuestion} onAnswer={handleAnswerQuestion} timerDuration={questionTimer} pullStrengthConfig={pullStrengthConfig} />}
        </div>
    )
}

export default function SmartboardDuelloOyunPage() {
    return <Suspense fallback={<div>Yükleniyor...</div>}><DuelGameComponent /></Suspense>
}
