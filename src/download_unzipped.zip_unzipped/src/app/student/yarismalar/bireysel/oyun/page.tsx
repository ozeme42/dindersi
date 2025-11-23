
"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserMinus, ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, Check, Trophy, PartyPopper, Award } from "lucide-react";
import Link from "next/link";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import type { GetQuizOutput, Question } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QuestionDialog } from "@/components/question-dialog";
import { Badge } from "@/components/ui/badge";


type GameQuestion = Question;

type GameCompetitor = {
    name: string;
    score: number;
};

function CompetitionLoadingSkeleton() {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-64 bg-muted rounded-md animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
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

const TeamScoreCard = ({ competitor, isActive, colorClass, rank }: { competitor: GameCompetitor, isActive: boolean, colorClass: string, rank: number }) => {
    return (
        <Card 
            className={cn(
                'relative group cursor-pointer transition-all text-white border-transparent',
                colorClass,
                isActive && `ring-4 ring-offset-background ring-offset-2 ring-white/80`
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
                        <p className="font-bold text-lg truncate">{competitor.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-bold">{competitor.score}</p>
                </div>
            </CardContent>
        </Card>
    );
};


function CompetitionComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [competitors, setCompetitors] = useState<GameCompetitor[]>([]);
    const [activeCompetitorIndex, setActiveCompetitorIndex] = useState(0);

    const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: GameQuestion } | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');

    const questionTimer = parseInt(searchParams.get('questionTimer') || '0');
    const pointsConfig = useMemo(() => {
        const pointsParam = searchParams.get('points');
        try {
            return pointsParam ? JSON.parse(pointsParam) : { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }};
        } catch {
            return { mcq: { Kolay: 10, Orta: 15, Zor: 20 }, tf: { Kolay: 5, Orta: 10, Zor: 15 }, fitb: { Kolay: 10, Orta: 15, Zor: 20 }};
        }
    }, [searchParams]);

    const penaltyConfig = useMemo(() => {
        const penaltyParam = searchParams.get('penalty');
        try {
            return penaltyParam ? JSON.parse(penaltyParam) : { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }};
        } catch {
            return { mcq: { Kolay: 5, Orta: 8, Zor: 10 }, tf: { Kolay: 3, Orta: 5, Zor: 8 }, fitb: { Kolay: 5, Orta: 8, Zor: 10 }};
        }
    }, [searchParams]);

     const colorClasses = [
        "bg-chart-1 text-primary-foreground hover:bg-chart-1/90",
        "bg-chart-2 text-primary-foreground hover:bg-chart-2/90",
        "bg-chart-3 text-primary-foreground hover:bg-chart-3/90",
        "bg-chart-4 text-primary-foreground hover:bg-chart-4/90",
        "bg-chart-5 text-primary-foreground hover:bg-chart-5/90",
        "bg-primary text-primary-foreground hover:bg-primary/90",
    ];

    useEffect(() => {
        const playerNames = searchParams.get('players')?.split(',') || ['Oyuncu 1'];
        setCompetitors(playerNames.map(name => ({ name, score: 0 })));

        const fetchQuestions = async () => {
            setIsLoading(true);
            setError(null);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: parseInt(searchParams.get('questionCount') || '20'),
                difficulty: searchParams.get('difficulty')?.split(','),
                questionTypes: searchParams.get('questionTypes')?.split(','),
            };
            const questionResult = await getQuestionsFromBank(params as any);

            if ('error' in questionResult) setError(questionResult.error);
            else if (questionResult.questions) setQuestions(questionResult.questions as GameQuestion[]);
            else setError("Uygun soru bulunamadı.");
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams]);

    useEffect(() => {
        const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        if (gameState === 'finished') return;
        
        setCompetitors(prev => prev.map((c, index) => index === activeCompetitorIndex ? { ...c, score: Math.max(0, c.score + scoreChange) } : c));
        
        setAnsweredQuestions(prev => [...prev, questionNumber]);
        setOpenedQuestion(null);
        
        if (answeredQuestions.length + 1 === questions.length) {
            setGameState('finished');
        } else {
            setActiveCompetitorIndex(prev => (prev + 1) % competitors.length);
        }
    };
    
    const sortedCompetitors = useMemo(() => {
        const finalSorted = [...competitors].sort((a, b) => b.score - a.score);
        return finalSorted.map((c, i) => ({...c, rank: i}));
    }, [competitors]);

    if (isLoading) return <CompetitionLoadingSkeleton />;
    if (error) return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-screen">
            <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Hata!</AlertTitle>
                <AlertDesc>{error}</AlertDesc>
                 <div className="mt-4">
                    <Button asChild variant="outline">
                        <Link href="/student/yarismalar/bireysel"><ArrowLeft className="mr-2 h-4 w-4" /> Kuruluma Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );

    if (gameState === 'finished') {
        const winner = sortedCompetitors[0];
        return (
             <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Yarışma Bitti!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center gap-4">
                            <Trophy className="h-24 w-24 text-amber-400"/>
                            <p className="text-2xl">Kazanan: <span className="font-bold text-primary">{winner?.name || ''}</span></p>
                            <p className="text-lg">Skor: <span className="font-bold">{winner?.score || 0}</span></p>
                            <div className="w-full mt-4">
                                {sortedCompetitors.map((c, i) => (
                                    <div key={c.name} className="flex justify-between p-2 rounded-md bg-muted/50">
                                        <span>{i + 1}. {c.name}</span>
                                        <span className="font-semibold">{c.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4">
                         <Button onClick={() => window.location.reload()}><Repeat className="mr-2 h-4 w-4" /> Tekrar Oyna</Button>
                         <Button asChild variant="outline"><Link href="/student/yarismalar"><Home className="mr-2 h-4 w-4" /> Ana Menü</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-headline">Bireysel Yarışma</h1>
                <Button asChild variant="outline"><Link href="/student/yarismalar/bireysel"><ArrowLeft className="mr-2 h-4 w-4" /> Kurulumu Değiştir</Link></Button>
            </div>
             <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedCompetitors.map((player) => {
                    const isActive = player.name === competitors[activeCompetitorIndex]?.name;
                    const colorClass = colorClasses[player.rank % colorClasses.length];
                    return (
                        <TeamScoreCard 
                            key={player.name}
                            competitor={player}
                            isActive={isActive}
                            colorClass={colorClass}
                            rank={player.rank}
                        />
                    )
                })}
            </div>
            
            <Card>
                <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Sorular ({questions.length - answeredQuestions.length} kaldı)</span>
                            <Badge variant="secondary">Sıradaki: {competitors[activeCompetitorIndex]?.name}</Badge>
                        </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {questions.map((q, i) => {
                        const qNum = i + 1;
                        const isAnswered = answeredQuestions.includes(qNum);
                        return (
                            <Button key={i} className={cn("aspect-square h-auto w-auto text-lg md:text-2xl font-bold", isAnswered ? "bg-muted text-muted-foreground" : "bg-primary")} disabled={isAnswered} onClick={() => setOpenedQuestion({ number: qNum, question: q })}>
                                {isAnswered ? <Check/> : qNum}
                            </Button>
                        )
                    })}
                </CardContent>
            </Card>
            
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

export default function StudentBireyselOyunPage() {
    return <Suspense fallback={<CompetitionLoadingSkeleton />}><CompetitionComponent /></Suspense>
}

    