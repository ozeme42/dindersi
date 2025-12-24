
'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getConceptQuizAction, submitConceptQuizScoreAction } from '@/app/oyunlar/kavram-yarismasi/actions';
import type { ConceptQuizQuestion } from '@/app/oyunlar/kavram-yarismasi/actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Home, Repeat, PartyPopper, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';

const colorClasses = [
    'from-blue-500 to-cyan-500 border-cyan-400',
    'from-indigo-500 to-purple-500 border-purple-400',
    'from-emerald-500 to-teal-500 border-teal-400',
    'from-rose-500 to-pink-500 border-pink-400',
];

function ConceptQuizGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [questions, setQuestions] = useState<ConceptQuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');

    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    const gameContext = `Kavram Yarışması - ${searchParams.get('courseName') || 'Genel'} > ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = '/oyunlar/kavram-yarismasi';

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        const topicId = searchParams.get('topicId');
        
        if (!topicId) {
            setError("Geçerli bir konu ID'si gerekli.");
            setIsLoading(false);
            return;
        }

        const result = await getConceptQuizAction({ topicId });

        if (result.error || !result.questions) {
            setError(result.error || "Sorular yüklenemedi.");
        } else {
            setQuestions(result.questions);
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);
    
    const currentQuestion = questions[currentQuestionIndex];

    const handleAnswer = (answer: string) => {
        if (isRevealed) return;

        setSelectedAnswer(answer);
        setIsRevealed(true);
        
        const isCorrect = answer === currentQuestion.correctAnswer;
        if (isCorrect) {
            playSound('correct');
            setScore(prev => prev + 10);
        } else {
            playSound('incorrect');
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsRevealed(false);
        } else {
            setGameState('finished');
            playSound('win');
        }
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitConceptQuizScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: "Başarılı!", description: "Puanınız kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleRestart = () => {
        setScore(0);
        setCurrentQuestionIndex(0);
        setIsRevealed(false);
        setSelectedAnswer(null);
        setGameState('playing');
        setIsScoreSaved(false);
        setQuestions(prev => [...prev].sort(() => Math.random() - 0.5)); // Re-shuffle
    };

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-pink-500" /></div>;
    }
    
    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Oyun Yüklenemedi</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                     <Button asChild className="mt-4"><Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button>
                </Alert>
            </div>
        );
    }
    
    if (gameState === 'finished') {
        return <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={handleRestart} backUrl={backUrl} />;
    }
    
    if (!currentQuestion) {
        return <div className="text-white">Soru yüklenemedi.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl bg-slate-900/50 border-white/10 shadow-2xl backdrop-blur-md">
                <CardHeader className="text-center border-b border-white/5 pb-4">
                    <CardTitle className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-fuchsia-500">
                        Kavram Yarışması
                    </CardTitle>
                    <div className="flex justify-between items-center text-sm font-medium text-slate-400 pt-2">
                        <span>Soru: {currentQuestionIndex + 1} / {questions.length}</span>
                        <span>Puan: <span className="font-bold text-yellow-400">{score}</span></span>
                    </div>
                </CardHeader>
                <CardContent className="p-6 md:p-10 text-center space-y-8">
                     <p className="text-xl md:text-2xl font-semibold leading-relaxed min-h-[6rem] flex items-center justify-center bg-slate-800/50 p-6 rounded-2xl border border-white/10 shadow-inner">
                        {currentQuestion.q}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.options.map((option, i) => {
                            const isCorrect = option === currentQuestion.correctAnswer;
                            const isSelected = option === selectedAnswer;
                            return (
                                <Button
                                    key={i}
                                    onClick={() => handleAnswer(option)}
                                    disabled={isRevealed}
                                    className={cn(
                                        "h-auto py-5 text-lg justify-start rounded-xl font-bold border-2 transition-all duration-300 transform",
                                        !isRevealed && `hover:scale-105 hover:shadow-lg ${colorClasses[i % colorClasses.length]}`,
                                        isRevealed && isCorrect && 'bg-green-600 border-green-400 text-white shadow-lg ring-4 ring-green-500/50',
                                        isRevealed && isSelected && !isCorrect && 'bg-red-600 border-red-400 text-white animate-shake',
                                        isRevealed && !isSelected && !isCorrect && 'bg-slate-800 border-slate-700 text-slate-500 opacity-50'
                                    )}
                                >
                                     <span className={cn("mr-4 flex h-8 w-8 items-center justify-center rounded-lg border bg-black/20 font-bold", isRevealed && isCorrect ? "border-white/50" : "border-white/20")}>
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className="flex-1 text-left">{option}</span>
                                    {isRevealed && isCorrect && <CheckCircle2 className="h-6 w-6 ml-2" />}
                                    {isRevealed && isSelected && !isCorrect && <XCircle className="h-6 w-6 ml-2" />}
                                </Button>
                            )
                        })}
                    </div>
                </CardContent>
                 <CardFooter className="justify-end border-t border-white/5 pt-4">
                    {isRevealed && (
                        <Button onClick={handleNext} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg">
                            {currentQuestionIndex === questions.length - 1 ? 'Bitir' : 'Sonraki Soru'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                 </CardFooter>
            </Card>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-pink-500" /></div>}>
            <ConceptQuizGame />
        </Suspense>
    );
}
