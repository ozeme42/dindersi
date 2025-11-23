
"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getHitTheTargetAction, submitHitTheTargetScoreAction, type HitTheTargetRound } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, MousePointerClick, Check, X, AlertTriangle, Target } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { updateScore } from '../../actions';
import { useAuth } from '@/context/auth-context';
import { playSound, stopSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';

type TargetInfo = {
    id: number;
    text: string;
    isCorrect: boolean;
    x: number;
    y: number;
    isHit: boolean;
};

function HitTheTargetGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const gameAreaRef = useRef<HTMLDivElement>(null);
    
    const [rounds, setRounds] = useState<HitTheTargetRound[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
    const [targets, setTargets] = useState<TargetInfo[]>([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isPaused, setIsPaused] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    
    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Hedefi Vur - ${searchParams.get('topicName')}`;

    const generateTargets = useCallback((round: HitTheTargetRound) => {
        if (!round) return;
        
        const gameAreaSize = gameAreaRef.current ? gameAreaRef.current.getBoundingClientRect() : { width: 500, height: 400 };

        setTargets(round.words.map((word, i) => ({
            id: i,
            text: word,
            isCorrect: word === round.target,
            x: Math.random() * (gameAreaSize.width - 80),
            y: Math.random() * (gameAreaSize.height - 80),
            isHit: false,
        })));
    }, []);

    useEffect(() => {
        const fetchGameData = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getHitTheTargetAction(params);
            if (result.error || !result.data || result.data.length === 0) {
                setError(result.error || "Bu konu için uygun oyun verisi bulunamadı.");
            } else {
                setRounds(result.data);
                generateTargets(result.data[0]);
                setIsPaused(false);
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams, isStatic, generateTargets]);

    useEffect(() => {
        if (isPaused || isFinished) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    stopSound('timer');
                    handleNextQuestion(false); // Move to next question on timeout
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
    }, [isPaused, isFinished]);
    
    const handleTargetHit = (target: TargetInfo) => {
        if (target.isHit) return;

        const newTargets = targets.map(t => t.id === target.id ? { ...t, isHit: true } : t);
        setTargets(newTargets);

        if (target.isCorrect) {
            playSound('correct');
            handleNextQuestion(true);
        } else {
            playSound('incorrect');
            handleNextQuestion(false);
        }
    };

    const handleNextQuestion = useCallback((wasCorrect: boolean) => {
        setIsPaused(true);
        if (wasCorrect) setScore(prev => prev + 15);

        setTimeout(() => {
            if (currentRoundIndex < rounds.length - 1) {
                const nextIndex = currentRoundIndex + 1;
                setCurrentRoundIndex(nextIndex);
                generateTargets(rounds[nextIndex]);
                setTimeLeft(30);
                setIsPaused(false);
            } else {
                if (user && score > 0 && !isStatic) {
                    submitHitTheTargetScoreAction(user.uid, score, gameContext);
                 }
                setIsFinished(true);
            }
        }, 1000);
    }, [currentRoundIndex, rounds, generateTargets, score, user, isStatic, gameContext]);

    const backUrl = isStatic ? '/statik' : '/teacher/activities';

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
                    <CardHeader><CardTitle>Oyun Bitti!</CardTitle><CardDescription>Hedefi Vurma oyununu tamamladınız.</CardDescription></CardHeader>
                    <CardContent><p className="text-4xl font-bold text-primary">{score}</p><p className="text-muted-foreground">Toplam Puan</p></CardContent>
                    <CardFooter className="flex-col gap-2"><Button onClick={() => window.location.reload()} className="w-full">Tekrar Oyna</Button><Button variant="outline" asChild className="w-full"><Link href={backUrl}>Etkinlik Merkezine Dön</Link></Button></CardFooter>
                </Card>
            </div>
        );
    }

    const currentRound = rounds[currentRoundIndex];

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-4 bg-sky-50 dark:bg-sky-900/50">
            <Card className="w-full max-w-4xl text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline">Hedefi Vur</CardTitle>
                    <div className="flex justify-between items-center text-lg mt-2">
                        <div className="font-bold text-primary">Puan: {score}</div>
                        <div className="text-muted-foreground">Kalan Süre: {timeLeft}s</div>
                    </div>
                     <p className="text-xl font-semibold pt-4">{currentRound?.definition}</p>
                </CardHeader>
                <CardContent>
                    <div ref={gameAreaRef} className="relative w-full h-[400px] bg-muted rounded-lg overflow-hidden border">
                         {targets.map(target => (
                            <div 
                                key={target.id}
                                className={cn(
                                    "absolute flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer text-white font-bold p-2 text-center",
                                    "h-20 w-20 sm:h-24 sm:w-24",
                                    target.isHit && target.isCorrect && 'bg-green-500 scale-125 opacity-0',
                                    target.isHit && !target.isCorrect && 'bg-red-500 scale-125 opacity-0',
                                    !target.isHit && 'bg-sky-600 hover:bg-sky-700'
                                )}
                                style={{ top: target.y, left: target.x }}
                                onClick={() => handleTargetHit(target)}
                            >
                                <Target className="absolute h-full w-full opacity-20"/>
                                {target.text}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function HitTheTargetPage() {
    return <Suspense><HitTheTargetGame /></Suspense>;
}
