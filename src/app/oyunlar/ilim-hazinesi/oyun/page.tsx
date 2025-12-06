
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getIlimHazinesiQuestions, submitIlimHazinesiScore } from '../actions';
import type { Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Repeat, Home, CheckCircle, XCircle, BookOpen, AlertTriangle } from 'lucide-react';
import { GameEndScreen } from '@/components/game-end-screen';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import Confetti from 'react-dom-confetti';

const GAME_TIME = 60; // 60 seconds

function IlimHazinesiGame() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_TIME);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const gameContext = `İlim Hazinesi - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getIlimHazinesiQuestions(params);

        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu konu için uygun soru bulunamadı.");
        } else {
            setQuestions(result.questions);
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
        if (timeLeft === 0 && gameState === 'playing') {
            setGameState('finished');
        }
    }, [timeLeft, gameState]);

    const handleAnswer = (answer: string) => {
        if (isAnswered) return;
        setIsAnswered(true);
        setSelectedAnswer(answer);
        
        const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;
        if(isCorrect) {
            playSound('correct');
            setScore(prev => prev + 10);
        } else {
            playSound('incorrect');
        }

        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setIsAnswered(false);
                setSelectedAnswer(null);
            } else {
                setGameState('finished');
            }
        }, 1200);
    };
    
    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push('/oyunlar/ilim-hazinesi');
            return;
        }
        setIsSaving(true);
        const result = await submitIlimHazinesiScore(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const handleRestart = () => {
        setScore(0);
        setCurrentQuestionIndex(0);
        setTimeLeft(GAME_TIME);
        setIsScoreSaved(false);
        setGameState('loading');
        fetchGameData();
    };

    if (gameState === 'loading') {
        return <div className="flex h-screen w-full items-center justify-center bg-blue-950"><Loader2 className="h-12 w-12 animate-spin text-blue-300" /></div>;
    }
    
    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-blue-950">
                 <div className="text-center space-y-4 max-w-md bg-red-950/50 p-6 rounded-3xl border border-red-500/30">
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
                    <h3 className="text-xl font-bold text-red-100">Oyun Başlatılamadı</h3>
                    <p className="text-red-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/oyunlar/ilim-hazinesi">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    if (gameState === 'finished') {
        return (
            <div className="relative flex items-center justify-center h-screen">
                 <Confetti active={score > 0} />
                 <GameEndScreen 
                    score={score}
                    onSave={handleSaveAndExit}
                    isSaving={isSaving}
                    scoreSaved={isScoreSaved}
                    onRestart={handleRestart}
                    backUrl="/oyunlar/ilim-hazinesi"
                />
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="flex flex-col min-h-screen bg-blue-950 text-white p-4 items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-10" />

            <div className="w-full max-w-4xl z-10 space-y-6 animate-in fade-in-50 duration-500">
                <div className="flex justify-between items-center bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <div className="text-2xl font-bold">Skor: <span className="text-blue-400 font-mono">{score}</span></div>
                    <div className="text-4xl font-black text-white font-mono">{timeLeft}</div>
                    <div className="text-lg font-semibold">Soru: {currentQuestionIndex + 1}</div>
                </div>
                <Progress value={(timeLeft / GAME_TIME) * 100} className="w-full h-3 [&>div]:bg-blue-500" />
                
                <div className="bg-black/40 border-2 border-white/20 p-8 md:p-12 rounded-3xl text-center shadow-2xl min-h-[150px] flex items-center justify-center">
                    <p className="text-2xl md:text-3xl font-bold leading-tight">{currentQuestion.text}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options?.map((option, index) => {
                        const isSelected = selectedAnswer === option;
                        const isCorrect = option === currentQuestion.correctAnswer;
                        return (
                            <Button 
                                key={index} 
                                onClick={() => handleAnswer(option)}
                                disabled={isAnswered}
                                className={cn(
                                    "h-auto py-5 text-xl font-bold",
                                    isAnswered && isSelected && !isCorrect && "bg-red-600 hover:bg-red-700 animate-shake",
                                    isAnswered && isCorrect && "bg-green-600 hover:bg-green-700 animate-tada",
                                    isAnswered && !isSelected && "opacity-50"
                                )}
                            >
                                {isAnswered && isCorrect ? <CheckCircle className="mr-2 h-6 w-6"/> : isAnswered && isSelected && !isCorrect ? <XCircle className="mr-2 h-6 w-6"/> : null}
                                {option}
                            </Button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-blue-950"><Loader2 className="h-12 w-12 animate-spin text-blue-300" /></div>}>
            <IlimHazinesiGame />
        </Suspense>
    );
}
