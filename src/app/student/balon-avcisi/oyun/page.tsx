

'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBalloonHuntQuestionsAction, submitBalloonHuntScoreAction } from '../actions';
import { useAuth } from '@/context/auth-context';
import type { Question } from '@/lib/types';
import { Loader2, Repeat, ArrowLeft, Home, PartyPopper, AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type Balloon = {
    id: number;
    text: string;
    isCorrect: boolean;
    x: number;
    y: number;
    speed: number;
    isPopped: boolean;
};

function BalloonHuntGame() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [balloons, setBalloons] = useState<Balloon[]>([]);
    const [gameState, setGameState] = useState<'playing' | 'roundOver' | 'finished'>('playing');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const gameContext = `Balon Avcısı - ${searchParams.get('topicName')}`;

    const setupRound = useCallback((question: Question) => {
        const gameAreaSize = gameAreaRef.current ? gameAreaRef.current.getBoundingClientRect() : { width: 500 };
        const newBalloons: Balloon[] = question.options!.map((opt, i) => ({
            id: i,
            text: opt,
            isCorrect: opt === question.correctAnswer,
            x: Math.random() * (gameAreaSize.width - 80),
            y: 500, // Start below the screen
            speed: 1 + Math.random() * 1.5,
            isPopped: false,
        }));
        setBalloons(shuffleArray(newBalloons));
    }, []);

    useEffect(() => {
        async function fetchQuestions() {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const { questions: fetchedQuestions, error: fetchError } = await getBalloonHuntQuestionsAction(params);

            if (fetchError) {
                setError(fetchError);
            } else if (fetchedQuestions.length > 0) {
                setQuestions(fetchedQuestions);
                setupRound(fetchedQuestions[0]);
            } else {
                setError("Bu kriterlere uygun soru bulunamadı.");
            }
            setIsLoading(false);
        }
        fetchQuestions();
    }, [searchParams, setupRound]);
    
    // Animation loop for balloons
    useEffect(() => {
        if (gameState !== 'playing' || balloons.length === 0) return;

        let animationFrameId: number;

        const animate = () => {
            setBalloons(prevBalloons => {
                const updatedBalloons = prevBalloons.map(b => {
                    if (b.isPopped) return b;
                    const newY = b.y - b.speed;
                    if (newY < -100) { // Balloon has gone off-screen
                        if (b.isCorrect) {
                            handleBalloonMiss();
                        }
                        return null; // Remove the balloon
                    }
                    return { ...b, y: newY };
                }).filter((b): b is Balloon => b !== null);
                
                if (updatedBalloons.filter(b => b.isCorrect && !b.isPopped).length === 0) {
                    // This will be caught by handleBalloonMiss if it was missed, or handled by handlePop if it was popped.
                }
                
                return updatedBalloons;
            });
            animationFrameId = requestAnimationFrame(animate);
        };
        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [gameState, balloons.length]);


    const handleBalloonPop = (balloon: Balloon) => {
        if (balloon.isPopped || gameState !== 'playing') return;
        
        setBalloons(prev => prev.map(b => b.id === balloon.id ? {...b, isPopped: true} : b));

        if (balloon.isCorrect) {
            playSound('correct');
            setScore(s => s + 50);
            setGameState('roundOver');
        } else {
            playSound('incorrect');
            setLives(l => l - 1);
            if (lives - 1 <= 0) {
                setGameState('finished');
            }
        }
    };
    
    const handleBalloonMiss = () => {
        if (gameState !== 'playing') return;
        playSound('incorrect');
        setLives(l => l - 1);
        setGameState('roundOver');
        if (lives - 1 <= 0) {
            setGameState('finished');
        }
    }

    const nextQuestion = () => {
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < questions.length) {
            setCurrentQuestionIndex(nextIndex);
            setupRound(questions[nextIndex]);
            setGameState('playing');
        } else {
            setGameState('finished');
        }
    };
    
    const handleSaveAndExit = async () => {
        if (!user || score <= 0 || isSubmitting) {
             router.push('/student/balon-avcisi');
             return;
        };
        setIsSubmitting(true);
        const result = await submitBalloonHuntScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Puanın başarıyla kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
        router.push('/student/balon-avcisi');
    };
    
    const restartGame = () => {
        setCurrentQuestionIndex(0);
        setScore(0);
        setLives(3);
        setIsSubmitting(false);
        setGameState('playing');
        setupRound(questions[0]);
    };
    
    const backUrl = '/student/balon-avcisi';

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    if (error) return (
        <div className="flex h-screen w-full items-center justify-center p-4">
             <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Hata!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <div className="mt-4"><Button asChild variant="outline"><Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link></Button></div>
            </Alert>
        </div>
    );
     if (gameState === 'finished') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Oyun Bitti!</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <p className="text-xl">Kazandığın Puan: <span className="font-bold text-primary">{score}</span></p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button className="w-full" onClick={handleSaveAndExit} disabled={isSubmitting || score <= 0}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Puanı Kaydet ve Çık
                        </Button>
                        <Button className="w-full" variant="secondary" onClick={restartGame}><Repeat className="mr-2 h-4 w-4"/> Tekrar Oyna</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return <div className="text-center p-8">Soru yükleniyor...</div>;

    return (
        <div className="h-screen w-screen flex flex-col bg-sky-200 dark:bg-sky-900 overflow-hidden">
            <div className="p-4 flex justify-between items-center text-sky-800 dark:text-sky-200 bg-sky-300/50 dark:bg-sky-800/50 backdrop-blur-sm">
                <p className="text-xl font-bold">Puan: {score}</p>
                <div className="flex items-center gap-2">
                    {Array.from({ length: 3 }).map((_, i) => <Heart key={i} className={cn("h-6 w-6 text-red-500 transition-all", i < lives ? 'fill-red-500' : 'fill-none opacity-50')} />)}
                </div>
            </div>
             <div className="flex-grow flex flex-col">
                <div ref={gameAreaRef} className="relative w-full flex-1">
                    {balloons.map(balloon => (
                        <div
                            key={balloon.id}
                            className={cn(
                                "absolute text-white font-bold flex items-center justify-center rounded-full cursor-pointer transition-transform duration-200",
                                "w-20 h-24 sm:w-24 sm:h-28",
                                balloon.isCorrect ? 'bg-green-500' : 'bg-red-500',
                                balloon.isPopped && 'opacity-0 scale-150'
                            )}
                            style={{ left: balloon.x, top: balloon.y, transition: 'top 0.1s linear' }}
                            onClick={() => handleBalloonPop(balloon)}
                        >
                            <span className="text-xs sm:text-sm text-center p-1 break-words">{balloon.text}</span>
                        </div>
                    ))}
                </div>
                 <div className="w-full p-4 bg-background/80 backdrop-blur-md text-center">
                    <p className="text-lg sm:text-xl font-semibold">{currentQuestion.text}</p>
                </div>
             </div>
             {gameState === 'roundOver' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                    <Card className="text-center p-8">
                        <Button onClick={nextQuestion}>Sonraki Soru <ArrowRight className="ml-2 h-4 w-4"/></Button>
                    </Card>
                </div>
             )}
        </div>
    );
};

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const BalloonHuntPage = () => {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <BalloonHuntGame />
        </Suspense>
    );
};

export default BalloonHuntPage;
