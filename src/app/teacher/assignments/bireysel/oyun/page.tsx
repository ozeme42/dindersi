
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, BrainCircuit, Check } from "lucide-react";
import Link from "next/link";
import { getQuestionsFromBank, type GetQuizOutput } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { playSound, stopSound } from "@/lib/audio-service";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type GameQuestion = GetQuizOutput['questions'][0];

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
            else if (questionResult.questions) setQuestions(questionResult.questions);
            else setError("Uygun soru bulunamadı.");
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams]);
    
    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean) => {
        if (gameState === 'finished') return;
        
        const question = questions[questionNumber - 1];
        if (!question) return;
        
        const scoreChange = isCorrect ? (pointsConfig[question.type as keyof typeof pointsConfig]?.[question.difficulty as keyof typeof pointsConfig.mcq] || 10) : 0;
        
        setCompetitors(prev => prev.map((c, index) => index === activeCompetitorIndex ? { ...c, score: c.score + scoreChange } : c));
        
        setAnsweredQuestions(prev => [...prev, questionNumber]);
        setOpenedQuestion(null);
        
        if (answeredQuestions.length + 1 === questions.length) {
            setGameState('finished');
        } else {
            setActiveCompetitorIndex(prev => (prev + 1) % competitors.length);
        }
    };
    
    const sortedCompetitors = useMemo(() => [...competitors].sort((a, b) => b.score - a.score), [competitors]);

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
        return (
             <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Yarışma Bitti!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center gap-4">
                            <Crown className="h-24 w-24 text-amber-400"/>
                            <p className="text-2xl">Kazanan: <span className="font-bold text-primary">{sortedCompetitors[0]?.name || ''}</span></p>
                            <p className="text-lg">Skor: <span className="font-bold">{sortedCompetitors[0]?.score || 0}</span></p>
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-4">
                     <Card>
                        <CardHeader><CardTitle>Skor Tablosu</CardTitle></CardHeader>
                        <CardContent>
                            {sortedCompetitors.map((c, i) => (
                                <div key={c.name} className={cn("flex justify-between p-2 rounded-md", i === activeCompetitorIndex && "bg-primary/10")}>
                                    <span className="font-medium">{c.name}</span>
                                    <span className="font-semibold">{c.score}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-3">
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
                                    <Button key={i} className={cn("aspect-square h-auto w-auto text-2xl font-bold", isAnswered ? "bg-muted text-muted-foreground" : "bg-primary")} disabled={isAnswered} onClick={() => setOpenedQuestion({ number: qNum, question: q })}>
                                        {isAnswered ? <Check/> : qNum}
                                    </Button>
                                )
                             })}
                        </CardContent>
                    </Card>
                </div>
            </div>
             {openedQuestion && (
                <QuestionDialog
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={questionTimer}
                    pointsConfig={pointsConfig}
                />
            )}
        </div>
    );
}

function QuestionDialog({ isOpen, onClose, questionData, onAnswer, timerDuration, pointsConfig }: any) {
    const { number, question } = questionData;
    const [userAnswer, setUserAnswer] = useState<string | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [timeLeft, setTimeLeft] = useState(timerDuration);
    
    useEffect(() => {
        if (!isOpen) return;
        setIsRevealed(false);
        setUserAnswer(null);
        setTimeLeft(timerDuration);

        if (timerDuration > 0) {
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleAnswerClick(""); // Timeout
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isOpen, questionData, timerDuration]);
    
    const handleAnswerClick = (selectedOption: string) => {
        if (isRevealed) return;
        let isCorrect = (question.type === 'tf')
            ? (selectedOption === 'Doğru') === (question.correctAnswer === 'Doğru')
            : selectedOption.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        
        playSound(isCorrect ? 'correct' : 'incorrect');
        setIsRevealed(true);
        setUserAnswer(selectedOption);
        
        setTimeout(() => {
            onAnswer(number, isCorrect);
            onClose();
        }, 1500);
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Soru {number}</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="space-y-6">
                    <p className="text-xl font-semibold text-center p-4 bg-muted rounded-md">{question.question}</p>
                    {/* ... Answer options ... */}
                    {question.type === 'mcq' && (
                         <div className="grid grid-cols-2 gap-4">
                            {question.options.map((opt: string) => <Button key={opt} variant="outline" className="h-20 text-lg" onClick={() => handleAnswerClick(opt)} disabled={isRevealed}>{opt}</Button>)}
                         </div>
                    )}
                     {question.type === 'tf' && (
                         <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-20 text-lg" onClick={() => handleAnswerClick("Doğru")} disabled={isRevealed}>Doğru</Button>
                            <Button variant="outline" className="h-20 text-lg" onClick={() => handleAnswerClick("Yanlış")} disabled={isRevealed}>Yanlış</Button>
                         </div>
                    )}
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function StudentBireyselOyunPage() {
    return <Suspense fallback={<CompetitionLoadingSkeleton />}><CompetitionComponent /></Suspense>
}
