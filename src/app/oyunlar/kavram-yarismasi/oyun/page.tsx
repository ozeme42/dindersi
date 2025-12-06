
'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKavramYarismasiAction, submitKavramYarismasiScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, BrainCircuit, Check, X, Timer, Ghost, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';
import { GameEndScreen } from '@/components/game-end-screen';

const ROUND_TIME = 10; // Soru başına süre

function ConceptRaceGame() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(ROUND_TIME);

    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    
    const gameContext = `Kavram Yarışması - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getKavramYarismasiAction(params);
        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu konu için oyun verisi bulunamadı.");
            setGameState('error');
        } else {
            setQuestions(result.questions);
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);
    
    const resetRound = useCallback(() => {
        setUserAnswer('');
        setTimeLeft(ROUND_TIME);
        inputRef.current?.focus();
    }, []);

    const nextQuestion = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            resetRound();
        } else {
            setGameState('finished');
        }
    }, [currentQuestionIndex, questions.length, resetRound]);
    
    useEffect(() => {
        if (gameState === 'playing') {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        nextQuestion();
                        return ROUND_TIME;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState, nextQuestion]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!userAnswer.trim()) return;

        const currentQuestion = questions[currentQuestionIndex];
        const isCorrect = userAnswer.trim().toLocaleLowerCase('tr') === currentQuestion.correctAnswer?.toLocaleLowerCase('tr');

        if (isCorrect) {
            playSound('correct');
            setScore(prev => prev + (5 + timeLeft)); // Zaman bonusu
            toast({ title: "Doğru!", description: `+${5 + timeLeft} puan kazandın!`, className: "bg-green-500 text-white" });
        } else {
            playSound('incorrect');
            toast({ title: "Yanlış!", description: `Doğru cevap: ${currentQuestion.correctAnswer}`, variant: "destructive" });
        }
        nextQuestion();
    };

    const handleSave = async () => {
        if (!user || score <= 0 || isSaving || isScoreSaved) {
            router.push('/oyunlar/kavram-yarismasi');
            return;
        }
        setIsSaving(true);
        const result = await submitKavramYarismasiScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: "Kaydedildi!", description: "Puanın başarıyla kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleRestart = () => {
        setScore(0);
        setCurrentQuestionIndex(0);
        setIsScoreSaved(false);
        setGameState('loading');
        fetchGameData();
    };

    if (gameState === 'loading') return <div className="flex h-screen w-full items-center justify-center bg-pink-950"><Loader2 className="h-12 w-12 animate-spin text-pink-300" /></div>;
    if (gameState === 'error') return (
        <div className="flex h-screen w-full items-center justify-center p-4 bg-pink-950 text-white">
            <div className="text-center space-y-4 max-w-md bg-red-950/50 p-6 rounded-3xl border border-red-500/30">
                <Ghost className="h-16 w-16 text-red-500 mx-auto" />
                <h3 className="text-xl font-bold text-red-100">Oyun Başlatılamadı</h3>
                <p className="text-red-200/70">{error}</p>
                 <Button asChild variant="secondary" className="w-full">
                    <Link href="/oyunlar/kavram-yarismasi">Geri Dön</Link>
                </Button>
            </div>
        </div>
    );
    
    if (gameState === 'finished') {
        return <GameEndScreen score={score} onSave={handleSave} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={handleRestart} backUrl="/oyunlar/kavram-yarismasi" />;
    }
    
    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="flex flex-col min-h-screen bg-pink-950 text-white p-4 sm:p-8 items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"/>

            <div className="w-full max-w-3xl z-10 space-y-8 animate-in fade-in-50 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-center bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <div className="text-2xl font-bold">Skor: <span className="text-pink-400 font-mono">{score}</span></div>
                    <div className="text-5xl font-black text-white font-mono">{timeLeft}</div>
                    <div className="text-lg font-semibold">Soru: {currentQuestionIndex + 1} / {questions.length}</div>
                </div>
                 <Progress value={(timeLeft / ROUND_TIME) * 100} className="w-full h-3 [&>div]:bg-pink-500" />
                
                <div className="bg-black/40 border-2 border-white/20 p-8 md:p-12 rounded-3xl text-center shadow-2xl min-h-[200px] flex flex-col items-center justify-center">
                    <p className="text-sm uppercase tracking-widest text-pink-300 mb-2">Tanım</p>
                    <p className="text-xl md:text-2xl font-semibold leading-relaxed">{currentQuestion.text}</p>
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input 
                        ref={inputRef}
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Kavramı yaz..."
                        className="h-14 text-xl text-center bg-black/40 border-white/20 text-white placeholder:text-white/30 focus:border-pink-500"
                        autoFocus
                    />
                    <Button type="submit" className="h-14 px-6 bg-pink-600 hover:bg-pink-500">
                        <Send className="h-6 w-6"/>
                    </Button>
                </form>
            </div>
        </div>
    )
}

export default function Page() {
     return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-pink-950"><Loader2 className="h-12 w-12 animate-spin text-pink-300" /></div>}>
            <ConceptRaceGame />
        </Suspense>
    );
}

