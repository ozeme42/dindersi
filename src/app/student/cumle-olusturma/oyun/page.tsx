
"use client"

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSentenceScrambleAction, submitSentenceScrambleScoreAction } from '../actions';
import type { SentenceScramble } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Shuffle, CheckCircle2, XCircle, AlertTriangle, Save, Home, Repeat, Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

function SentenceScrambleGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<SentenceScramble[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [shuffledWords, setShuffledWords] = useState<{ id: number, word: string }[]>([]);
    const [constructedSentence, setConstructedSentence] = useState<{ id: number, word: string }[]>([]);
    const [mistakenWordId, setMistakenWordId] = useState<number | null>(null);
    
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false);

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Cümle Ustası - ${searchParams.get('topicName')}`;
    
    const setupLevel = useCallback((question: SentenceScramble) => {
        const words = question.scrambledSentence.split(' ').map((word, index) => ({ id: index, word }));
        setShuffledWords(words);
        setConstructedSentence([]);
        setIsAnswered(false);
        setIsCorrect(null);
        setMistakenWordId(null);
    }, []);

    useEffect(() => {
        const fetchQuestions = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getSentenceScrambleAction(params);
            if (result.error) {
                setError(result.error);
            } else if (result.questions && result.questions.length > 0) {
                setQuestions(result.questions);
                setupLevel(result.questions[0]);
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic, setupLevel]);
    
    const currentQuestion = questions[currentQuestionIndex];

    const handleWordClick = (wordObj: { id: number, word: string }) => {
        if (isAnswered) return;

        const correctWordArray = currentQuestion.correctSentence.split(' ');
        const nextCorrectWord = correctWordArray[constructedSentence.length];
        
        if (wordObj.word === nextCorrectWord) {
            playSound('correct');
            setConstructedSentence(prev => [...prev, wordObj]);
            setShuffledWords(prev => prev.filter(w => w.id !== wordObj.id));
            setMistakenWordId(null);
        } else {
            playSound('incorrect');
            setMistakenWordId(wordObj.id);
            setTimeout(() => setMistakenWordId(null), 500); // Shake animation duration
        }
    };
    
    const handleUndo = () => {
        if (isAnswered || constructedSentence.length === 0) return;
        const lastWord = constructedSentence[constructedSentence.length - 1];
        setConstructedSentence(prev => prev.slice(0, -1));
        setShuffledWords(prev => [...prev, lastWord].sort((a, b) => a.id - b.id));
    };

    const checkAnswer = () => {
        if (shuffledWords.length > 0) return;
        const userAnswer = constructedSentence.map(w => w.word).join(' ');
        const correct = userAnswer === currentQuestion.correctSentence;
        
        setIsCorrect(correct);
        setIsAnswered(true);

        if (correct) {
            playSound('correct');
            setScore(prev => prev + 20);
        } else {
            playSound('incorrect');
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            setupLevel(questions[nextIndex]);
        } else {
            setIsFinished(true);
        }
    };
    
    const handleSaveAndExit = async () => {
        if (!user || score === 0 || isSaving || scoreSaved) {
            router.push('/student/activities');
            return;
        }
        setIsSaving(true);
        const result = await submitSentenceScrambleScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
            setScoreSaved(true);
            router.push('/student/activities');
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    }
    
    const backUrl = '/student/cumle-olusturma';

    const colorClasses = [
        'bg-blue-500 hover:bg-blue-600',
        'bg-green-500 hover:bg-green-600',
        'bg-purple-500 hover:bg-purple-600',
        'bg-red-500 hover:bg-red-600',
        'bg-yellow-500 hover:bg-yellow-600 text-black',
        'bg-indigo-500 hover:bg-indigo-600',
        'bg-pink-500 hover:bg-pink-600',
        'bg-teal-500 hover:bg-teal-600',
        'bg-orange-500 hover:bg-orange-600',
        'bg-cyan-500 hover:bg-cyan-600',
    ];
    
    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    if (error) return (
        <div className="flex h-screen w-full items-center justify-center p-4">
             <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Oyun Yüklenemedi</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                 <div className="mt-4">
                    <Button asChild variant="secondary">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );

    if (isFinished) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Tebrikler!</CardTitle>
                        <CardDescription>Cümle Ustası etkinliğini tamamladınız.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">{score}</p>
                        <p className="text-muted-foreground">Toplam Puan</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={handleSaveAndExit} className="w-full" disabled={isSaving || scoreSaved}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : scoreSaved ? <CheckCircle2 className="mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                            {scoreSaved ? "Kaydedildi" : "Puanı Kaydet ve Çık"}
                        </Button>
                        <Button onClick={() => window.location.reload()} className="w-full" variant="secondary">
                            <Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (!currentQuestion) return null;

    return (
        <div className="flex h-screen w-full items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/50">
            <Card className="w-full max-w-3xl">
                 <CardHeader>
                    <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mb-4" />
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">Cümle {currentQuestionIndex + 1}/{questions.length}</CardTitle>
                        <div className="text-lg font-bold text-primary">Puan: {score}</div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="min-h-[8rem] bg-background shadow-inner border-2 border-dashed border-border p-4 rounded-lg flex flex-wrap items-center justify-center gap-3">
                        {constructedSentence.length > 0 
                            ? constructedSentence.map((wordObj, i) => (
                                <div key={i} className={cn("px-4 py-2 rounded-lg font-semibold text-white", isAnswered && (isCorrect ? 'bg-green-500' : 'bg-red-500'), colorClasses[wordObj.id % colorClasses.length])}>
                                    <span className="text-xl md:text-2xl">{wordObj.word}</span>
                                </div>
                            ))
                            : <span className="text-muted-foreground">Cümleniz burada görünecek...</span>
                        }
                    </div>
                    {!isAnswered && (
                        <div className="min-h-[6rem] flex flex-wrap items-center justify-center gap-2">
                            {shuffledWords.map((wordObj, index) => (
                                 <Button 
                                    key={wordObj.id} 
                                    className={cn(
                                        "text-lg h-auto py-2 text-white font-semibold", 
                                        colorClasses[wordObj.id % colorClasses.length],
                                        mistakenWordId === wordObj.id && "animate-shake bg-destructive"
                                    )} 
                                    onClick={() => handleWordClick(wordObj)} 
                                    disabled={isAnswered}
                                >
                                    {wordObj.word}
                                </Button>
                            ))}
                        </div>
                    )}
                    {isAnswered && (
                         <div className={cn('mt-4 p-4 rounded-md flex flex-col items-center gap-2 text-center', isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                            {isCorrect ? (
                                <CheckCircle2 className="h-5 w-5" />
                            ) : (
                                <XCircle className="h-5 w-5" />
                            )}
                            <p className="font-medium">
                                {isCorrect ? 'Doğru!' : `Yanlış! Doğru cümle: ${currentQuestion.correctSentence}`}
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={handleUndo} disabled={isAnswered || constructedSentence.length === 0}>Geri Al</Button>
                    {isAnswered ? (
                        <Button onClick={handleNext}>
                           {currentQuestionIndex === questions.length - 1 ? 'Bitir' : 'Sonraki'}
                        </Button>
                    ) : (
                         <Button onClick={checkAnswer} disabled={shuffledWords.length > 0}>
                            Kontrol Et
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

export default function SentenceScramblePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <SentenceScrambleGame />
        </Suspense>
    );
}
