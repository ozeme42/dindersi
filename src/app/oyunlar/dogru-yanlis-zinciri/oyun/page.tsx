
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDogruYanlisZinciriAction, submitDogruYanlisZinciriScoreAction } from '@/app/oyunlar/actions';
import type { Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Save, Home, Repeat, CheckCircle, XCircle, Link2, Ghost, XOctagon, Timer, PlusCircle, MinusCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';
import { GameEndScreen } from '@/components/game-end-screen';

const INITIAL_TIME = 15; // Başlangıç süresi
const CORRECT_BONUS = 5; // Doğru cevap bonusu (saniye)
const WRONG_PENALTY = 5; // Yanlış cevap cezası (saniye)

function TrueFalseChainGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const feedbackTimer = useRef<NodeJS.Timeout>();


    const gameContext = `Doğru/Yanlış Zinciri - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    const backUrl = '/oyunlar/dogru-yanlis-zinciri';

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getDogruYanlisZinciriAction(params);

        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu konu için uygun D/Y sorusu bulunamadı.");
            setGameState('error');
        } else {
            setQuestions(result.questions);
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);
    
    // Timer Logic
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        } else if (timeLeft <= 0 && gameState === 'playing') {
            playSound('timeUp');
            setGameState('finished');
        }
        return () => clearTimeout(timer);
    }, [timeLeft, gameState]);
    
    const handleAnswer = (answer: boolean) => {
        if (gameState !== 'playing' || feedback) return;

        const currentQuestion = questions[currentQuestionIndex];
        const isCorrect = answer === (currentQuestion.isTrue ?? currentQuestion.correctAnswer === 'Doğru');

        if (isCorrect) {
            playSound('correct');
            setScore(prev => prev + 10);
            setTimeLeft(prev => prev + CORRECT_BONUS);
            setFeedback('correct');
        } else {
            playSound('incorrect');
            setTimeLeft(prev => Math.max(0, prev - WRONG_PENALTY));
            setFeedback('wrong');
        }
        
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => {
            setFeedback(null);
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                setGameState('finished');
            }
        }, 800);
    };
    
    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitDogruYanlisZinciriScoreAction(user.uid, score, gameContext);
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
        setTimeLeft(INITIAL_TIME);
        setGameState('loading');
        setIsScoreSaved(false);
        fetchGameData();
    };

    if (gameState === 'loading') {
        return <div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-green-500" /></div>;
    }
    
    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-red-950/50 p-6 rounded-3xl border border-red-500/30">
                    <Ghost className="h-16 w-16 text-red-500 mx-auto" />
                    <h3 className="text-xl font-bold text-red-100">Oyun Başlatılamadı</h3>
                    <p className="text-red-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    if (gameState === 'finished') {
        return (
             <GameEndScreen 
                score={score}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={handleRestart}
                backUrl={backUrl}
            />
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const timeProgress = (timeLeft / 60) * 100; // Assuming max time could go up to 60 for progress bar visualization

    return (
        <div className="flex flex-col min-h-screen bg-green-950 text-white p-4 items-center justify-center relative overflow-hidden pb-24 md:pb-4">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"/>

            <div className="w-full max-w-4xl z-10 space-y-8">
                <div className="flex justify-between items-center bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <div className="text-2xl font-bold">Skor: <span className="text-green-400 font-mono">{score}</span></div>
                    
                    <div className={cn("relative text-4xl font-black text-white font-mono", feedback && 'animate-tada')}>
                        {timeLeft}s
                        {feedback === 'correct' && <div className="absolute -top-4 -right-8 text-green-400 text-lg font-bold flex items-center gap-1 animate-in slide-in-from-bottom fade-in"><PlusCircle className="h-4 w-4"/> +{CORRECT_BONUS}</div>}
                        {feedback === 'wrong' && <div className="absolute -top-4 -right-8 text-red-400 text-lg font-bold flex items-center gap-1 animate-in slide-in-from-bottom fade-in"><MinusCircle className="h-4 w-4"/> -{WRONG_PENALTY}</div>}
                    </div>

                    <div className="text-lg font-semibold">Soru: {currentQuestionIndex + 1} / {questions.length}</div>
                    <Button onClick={() => setGameState('finished')} variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/50 hover:text-red-300">
                        <XOctagon className="h-4 w-4 mr-2"/> Bitir
                    </Button>
                </div>
                <Progress value={timeProgress} className={cn("w-full h-3", timeLeft <= 10 ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500")} />
                
                <div className="bg-black/40 border-2 border-white/20 p-8 md:p-12 rounded-3xl text-center shadow-2xl min-h-[200px] flex items-center justify-center">
                    <p className="text-2xl md:text-4xl font-bold leading-tight">{currentQuestion.text}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Button onClick={() => handleAnswer(true)} disabled={!!feedback} className="h-32 md:h-48 text-3xl font-black bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900 border-b-8 border-green-800 active:border-b-0 active:translate-y-2 transition-all">
                        <CheckCircle className="mr-4 h-12 w-12"/> DOĞRU
                    </Button>
                    <Button onClick={() => handleAnswer(false)} disabled={!!feedback} className="h-32 md:h-48 text-3xl font-black bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900 border-b-8 border-red-800 active:border-b-0 active:translate-y-2 transition-all">
                        <XCircle className="mr-4 h-12 w-12"/> YANLIŞ
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <TrueFalseChainGame />
        </Suspense>
    );
}
