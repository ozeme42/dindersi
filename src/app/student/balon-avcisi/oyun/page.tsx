"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getBalloonHuntQuestionsAction, submitBalloonHuntScoreAction, type BalloonHuntQuestion } from '../actions';
import { useAuth } from "@/context/auth-context";
import { Loader2, ArrowLeft, PartyPopper, Repeat, Home, AlertTriangle, CheckCircle2, XCircle, Crosshair, Heart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/audio-service";
import { useToast } from "@/hooks/use-toast";

type Balloon = {
    id: number;
    word: string;
    x: number;
    y: number;
    speed: number;
    isCorrect: boolean;
    isPopped: boolean;
};

const colors = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', 
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', 
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
];

function BalloonHuntGame() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [questions, setQuestions] = useState<BalloonHuntQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [balloons, setBalloons] = useState<Balloon[]>([]);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const gameContext = `Balon Avcısı - ${searchParams.get('topicName') || 'Genel'}`;

    useEffect(() => {
        const fetchQuestions = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getBalloonHuntQuestionsAction(params);
            if (result.error || result.questions.length === 0) {
                setError(result.error || "Bu konu için uygun soru bulunamadı.");
            } else {
                setQuestions(result.questions);
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams]);
    
    const setupLevel = useCallback(() => {
        if (questions.length === 0) return;
        
        const currentQuestion = questions[currentQuestionIndex];
        const newBalloons: Balloon[] = currentQuestion.options.map((word, i) => ({
            id: i,
            word: word,
            x: Math.random() * 90 + 5,
            y: 110 + Math.random() * 20,
            speed: Math.random() * 0.5 + 0.3,
            isCorrect: word === currentQuestion.correctAnswer,
            isPopped: false,
        }));
        setBalloons(newBalloons);

    }, [currentQuestionIndex, questions]);

    useEffect(() => {
        setupLevel();
    }, [setupLevel]);
    
    useEffect(() => {
        if (isFinished || lives <= 0) return;

        const animationFrame = requestAnimationFrame(moveBalloons);
        return () => cancelAnimationFrame(animationFrame);
    }, [balloons, isFinished, lives]);
    
     const moveBalloons = () => {
        setBalloons(prevBalloons => {
            const newBalloons = prevBalloons.map(balloon => {
                if (balloon.isPopped) return balloon;
                const newY = balloon.y - balloon.speed;
                if (newY < -20) { // Off-screen
                    if (balloon.isCorrect) {
                        setLives(l => l - 1);
                        playSound('incorrect');
                    }
                    return { ...balloon, y: 110 + Math.random() * 20, x: Math.random() * 90 + 5 }; // Reset
                }
                return { ...balloon, y: newY };
            });
            return newBalloons;
        });
    };
    
    const handleBalloonClick = (balloon: Balloon) => {
        if (balloon.isPopped || isFinished) return;

        setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, isPopped: true } : b));
        
        if (balloon.isCorrect) {
            playSound('correct');
            setScore(s => s + 20);
            setTimeout(nextQuestion, 1000);
        } else {
            playSound('incorrect');
            setLives(l => l - 1);
        }
    };
    
    const nextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    }
    
    useEffect(() => {
        if (lives <= 0) {
            setIsFinished(true);
        }
    }, [lives]);

    const handleSaveScore = async () => {
        if (!user || score <= 0 || isSubmitting) return;
        setIsSubmitting(true);
        const result = await submitBalloonHuntScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: 'Kaydedildi!', description: 'Puanın başarıyla kaydedildi.'});
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive'});
        }
        setIsSubmitting(false);
        router.push('/student/activities');
    };
    
    const handleRestart = () => {
        setScore(0);
        setLives(3);
        setCurrentQuestionIndex(0);
        setIsFinished(false);
        setupLevel();
    };

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
    if (error) return (
        <div className="flex h-screen w-full items-center justify-center p-4">
             <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Oyun Yüklenemedi</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                 <div className="mt-4">
                    <Button asChild variant="secondary">
                        <Link href="/student/balon-avcisi">Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );
    
    const currentQuestion = questions[currentQuestionIndex];
    
     if (isFinished) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sky-100 dark:bg-sky-900 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">{lives > 0 ? "Harika!" : "Oyun Bitti"}</CardTitle>
                        <CardDescription>Balon Avcısı oyununu tamamladın.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {lives > 0 ? <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" /> : <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />}
                        <p className="text-xl">Kazandığın Puan: <span className="font-bold text-primary">{score}</span></p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button className="w-full" onClick={handleSaveScore} disabled={isSubmitting || score <= 0}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Puanı Kaydet ve Çık
                        </Button>
                        <Button className="w-full" variant="secondary" onClick={handleRestart}><Repeat className="mr-2 h-4 w-4" /> Tekrar Oyna</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="w-full h-screen bg-sky-200 dark:bg-sky-900 overflow-hidden flex flex-col">
            <div className="p-4 bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-md z-10 flex-shrink-0">
                 <div className="flex justify-between items-center">
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">SORU</p>
                        <p className="text-xl font-bold">{currentQuestionIndex + 1} / {questions.length}</p>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-center px-4">{currentQuestion?.question}</h2>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">PUAN</p>
                        <p className="text-xl font-bold">{score}</p>
                    </div>
                </div>
                 <div className="flex items-center justify-center gap-2 mt-2">
                    {Array.from({ length: 3 }).map((_, i) => <Heart key={i} className={cn("h-6 w-6 text-red-500 transition-all", i < lives ? 'fill-red-500' : 'fill-none opacity-50')} />)}
                </div>
            </div>
             <div className="flex-grow flex flex-col relative" id="game-area">
                {balloons.map((balloon) => (
                    <div
                        key={balloon.id}
                        className={cn(
                            "absolute flex items-center justify-center font-bold text-white rounded-full cursor-pointer transition-transform duration-200",
                             "w-24 h-24 sm:w-32 sm:h-32 text-base sm:text-lg",
                             balloon.isPopped && "scale-150 opacity-0"
                        )}
                        style={{
                            left: `${balloon.x}%`,
                            top: `${balloon.y}%`,
                            backgroundColor: colors[balloon.id % colors.length]
                        }}
                        onClick={() => handleBalloonClick(balloon)}
                    >
                        <Crosshair className="absolute h-full w-full text-white/20"/>
                        <span className="z-10">{balloon.word}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function BalloonHuntPage() {
     return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <BalloonHuntGame />
        </Suspense>
    );
}
