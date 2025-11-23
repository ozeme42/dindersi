
'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBalloonPoppingAction, submitBalloonPoppingScoreAction, type BalloonPoppingRound } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, XCircle, AlertTriangle, PartyPopper, Repeat, Home } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound, stopSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';

type BalloonInfo = {
    id: number;
    text: string;
    isCorrect: boolean;
    x: number;
    y: number;
    isPopped: boolean;
    vy: number; // Vertical velocity
};

function BalloonPoppingGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const gameAreaRef = useRef<HTMLDivElement>(null);
    
    const [rounds, setRounds] = useState<BalloonPoppingRound[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
    const [balloons, setBalloons] = useState<BalloonInfo[]>([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isPaused, setIsPaused] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    
    const gameContext = `Balon Patlatma - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

    const generateBalloons = useCallback((round: BalloonPoppingRound) => {
        if (!round) return;
        
        const gameAreaSize = gameAreaRef.current ? gameAreaRef.current.getBoundingClientRect() : { width: 500, height: 400 };

        setBalloons(round.words.map((word, i) => ({
            id: i,
            text: word,
            isCorrect: word === round.target,
            x: Math.random() * (gameAreaSize.width - 80),
            y: gameAreaSize.height + 50 + Math.random() * 100, // Start below screen
            isPopped: false,
            vy: -(2 + Math.random() * 2), // Upward velocity
        })));
    }, []);
    
    useEffect(() => {
        const gameLoop = setInterval(() => {
            if (isPaused || isFinished) return;

            setBalloons(prevBalloons => 
                prevBalloons.map(b => {
                    if (b.isPopped) return b;
                    let newY = b.y + b.vy;
                    if (newY < -100) { // Reset when it goes off-screen
                        newY = gameAreaRef.current ? gameAreaRef.current.offsetHeight + 50 : 450;
                    }
                    return { ...b, y: newY };
                })
            );
        }, 1000 / 60); // 60 FPS

        return () => clearInterval(gameLoop);
    }, [isPaused, isFinished]);


    useEffect(() => {
        const fetchGameData = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getBalloonPoppingAction(params);
            if (result.error || !result.data || result.data.length === 0) {
                setError(result.error || "Bu konu için uygun oyun verisi bulunamadı.");
            } else {
                setRounds(result.data);
                generateBalloons(result.data[0]);
                setIsPaused(false);
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams, generateBalloons]);

    const handleNextQuestion = useCallback((wasCorrect: boolean) => {
        setIsPaused(true);
        if (wasCorrect) setScore(prev => prev + 15);

        setTimeout(() => {
            if (currentRoundIndex < rounds.length - 1) {
                const nextIndex = currentRoundIndex + 1;
                setCurrentRoundIndex(nextIndex);
                generateBalloons(rounds[nextIndex]);
                setTimeLeft(30);
                setIsPaused(false);
            } else {
                if (user && score > 0) {
                    submitBalloonPoppingScoreAction(user.uid, score, gameContext);
                 }
                setIsFinished(true);
            }
        }, 1000);
    }, [currentRoundIndex, rounds, generateBalloons, score, user, gameContext]);
    
    useEffect(() => {
        if (isPaused || isFinished) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    stopSound('timer');
                    handleNextQuestion(false);
                    return 0;
                }
                 const newTime = prev - 1;
                 if (newTime <= 5 && newTime > 0) playSound('timer');
                return newTime;
            });
        }, 1000);
        return () => {
            clearInterval(timer);
            stopSound('timer');
        };
    }, [isPaused, isFinished, handleNextQuestion]);
    
    const handleBalloonPop = (balloon: BalloonInfo) => {
        if (balloon.isPopped) return;

        const newBalloons = balloons.map(t => t.id === balloon.id ? { ...t, isPopped: true } : t);
        setBalloons(newBalloons);

        if (balloon.isCorrect) {
            playSound('correct');
            handleNextQuestion(true);
        } else {
            playSound('incorrect');
            handleNextQuestion(false);
        }
    };


    const backUrl = '/student/balon-patlatma';

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    if (error) return (
        <div className="flex h-screen w-full items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Oyun Yüklenemedi</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <div className="mt-4"><Button asChild variant="secondary"><Link href={backUrl}>Geri Dön</Link></Button></div>
            </Alert>
        </div>
    );
    
    if (isFinished) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardHeader><CardTitle>Oyun Bitti!</CardTitle><CardDescription>Balon Patlatma oyununu tamamladınız.</CardDescription></CardHeader>
                    <CardContent><p className="text-4xl font-bold text-primary">{score}</p><p className="text-muted-foreground">Toplam Puan</p></CardContent>
                    <CardFooter className="flex-col gap-2"><Button onClick={() => window.location.reload()} className="w-full">Tekrar Oyna</Button><Button variant="outline" asChild className="w-full"><Link href={backUrl}>Etkinlik Merkezine Dön</Link></Button></CardFooter>
                </Card>
            </div>
        );
    }

    const currentRound = rounds[currentRoundIndex];
    
    const balloonColors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-400', 'bg-purple-500', 'bg-pink-500'];

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-4 bg-sky-100 dark:bg-sky-900/50">
            <Card className="w-full max-w-4xl text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline">Balon Patlatma</CardTitle>
                    <div className="flex justify-between items-center text-lg mt-2">
                        <div className="font-bold text-primary">Puan: {score}</div>
                        <div className="text-muted-foreground">Kalan Süre: {timeLeft}s</div>
                    </div>
                     <p className="text-xl font-semibold pt-4">{currentRound?.definition}</p>
                </CardHeader>
                <CardContent>
                    <div ref={gameAreaRef} className="relative w-full h-[400px] bg-sky-200 dark:bg-sky-800 rounded-lg overflow-hidden border-2 border-sky-300 dark:border-sky-700">
                         {balloons.map((balloon, index) => (
                            <button
                                key={balloon.id}
                                disabled={balloon.isPopped}
                                className={cn(
                                    "absolute flex items-center justify-center rounded-full text-white font-bold p-2 text-center transition-opacity duration-300",
                                    "h-20 w-20 sm:h-24 sm:w-24",
                                    balloonColors[index % balloonColors.length],
                                    balloon.isPopped && 'opacity-0 scale-150',
                                )}
                                style={{ top: balloon.y, left: balloon.x, transition: 'top 1s linear' }}
                                onClick={() => handleBalloonPop(balloon)}
                            >
                                {balloon.text}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function BalloonPoppingPage() {
    return <Suspense><BalloonPoppingGame /></Suspense>;
}
