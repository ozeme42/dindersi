
'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getConceptHuntAction, submitConceptHuntScoreAction } from '../actions';
import type { Anagram } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Loader2, ArrowLeft, PartyPopper, Repeat, Home, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';


function ConceptHuntGame() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Anagram[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    
    const [userAnswer, setUserAnswer] = useState<{ char: string; originalIndex: number }[]>([]);
    const [poolLetters, setPoolLetters] = useState<{ char: string; id: number }[]>([]);
    const [isCorrect, setIsCorrect] = useState(false);
    const [shakeId, setShakeId] = useState<number | null>(null);
    
    const [isSaving, setIsSaving] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false);

    const gameContext = useMemo(() => `Kavram Avı - ${searchParams.get('courseName') || ''} > ${searchParams.get('topicName') || ''}`, [searchParams]);

    const setupLevel = useCallback((question: Anagram) => {
        const letters = question.scrambledWord.split('').map((char, index) => ({ char, id: index }));
        setPoolLetters(letters);
        setUserAnswer([]);
        setIsCorrect(false);
        setShakeId(null);
    }, []);

    useEffect(() => {
        const fetchQuestions = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getConceptHuntAction(params);
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
    }, [searchParams, setupLevel]);

    const handlePoolClick = (letter: { char: string; id: number }) => {
        if (isCorrect) return;

        const nextCharIndex = userAnswer.length;
        const correctChar = questions[currentQuestionIndex].correctAnswer[nextCharIndex];

        if (letter.char === correctChar) {
            playSound('correct');
            setUserAnswer(prev => [...prev, letter]);
            setPoolLetters(prev => prev.filter(l => l.id !== letter.id));
        } else {
            playSound('incorrect');
            setShakeId(letter.id);
            setTimeout(() => setShakeId(null), 500);
        }
    };

    const handleAnswerClick = (index: number) => {
        if (isCorrect) return;
        const letterToReturn = userAnswer[index];
        setUserAnswer(prev => prev.filter((_, i) => i !== index));
        setPoolLetters(prev => [...prev, letterToReturn].sort((a,b) => a.id - b.id));
    };
    
    useEffect(() => {
        if (questions.length > 0 && userAnswer.length === questions[currentQuestionIndex].correctAnswer.length) {
            const currentAnswer = userAnswer.map(l => l.char).join('');
            const isAnswerCorrect = currentAnswer === questions[currentQuestionIndex].correctAnswer;
            
            if (isAnswerCorrect) {
                playSound('correct');
                setIsCorrect(true);
                setScore(prev => prev + 25);
            }
        }
    }, [userAnswer, questions, currentQuestionIndex]);

    const nextLevel = async () => {
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
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitConceptHuntScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanın başarıyla kaydedildi." });
            setScoreSaved(true);
            router.push(backUrl);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    }
    
    const restartGame = () => {
        setCurrentQuestionIndex(0);
        setScore(0);
        setIsFinished(false);
        setScoreSaved(false);
        if (questions.length > 0) {
            setupLevel(questions[0]);
        }
    };
    
    const backUrl = '/student/kavram-avi';
    const colorClasses = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'];

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
                        <CardDescription>Kavram Avı etkinliğini tamamladınız.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">{score}</p>
                        <p className="text-muted-foreground">Toplam Puan</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={handleSaveAndExit} className="w-full" disabled={isSaving || scoreSaved || score === 0}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : scoreSaved ? <CheckCircle2 className="mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                            {scoreSaved ? "Kaydedildi" : "Puanı Kaydet ve Çık"}
                        </Button>
                        <Button onClick={restartGame} className="w-full" variant="secondary">Tekrar Oyna</Button>
                        <Button variant="outline" asChild className="w-full">
                           <Link href={backUrl}>Etkinlik Merkezine Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-4 bg-cyan-50 dark:bg-cyan-900/50">
            <Card className="w-full max-w-3xl text-center">
                 <CardHeader>
                    <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mb-4" />
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">Soru {currentQuestionIndex + 1}/{questions.length}</CardTitle>
                        <div className="text-lg font-bold text-primary">Puan: {score}</div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="min-h-[80px] p-6 rounded-lg bg-muted flex items-center justify-center">
                        <p className="text-xl font-semibold italic">"{currentQuestion.definition}"</p>
                    </div>
                    <div className="flex justify-center flex-wrap gap-2 p-4 rounded-lg min-h-[5rem] items-center">
                        {Array.from({ length: currentQuestion.correctAnswer.length }).map((_, index) => {
                            const letterObj = userAnswer[index];
                            return (
                                <div key={index} onClick={() => letterObj && !isCorrect && handleAnswerClick(index)} className={cn("h-14 w-12 rounded flex items-center justify-center text-3xl font-bold cursor-pointer transition-all", isCorrect ? 'bg-green-500 text-white' : 'bg-muted border-2 border-dashed border-border')}>
                                    {letterObj?.char}
                                </div>
                            );
                        })}
                    </div>
                     {!isCorrect && (
                        <div className="flex flex-wrap justify-center gap-2 p-4 rounded-lg min-h-[5rem] items-center">
                            {poolLetters.map((item, index) => (
                                <Button 
                                    key={item.id} 
                                    onClick={() => handlePoolClick(item)} 
                                    className={cn(
                                        "h-14 w-11 text-2xl font-bold text-white shadow-md",
                                        shakeId === item.id && "animate-shake bg-red-500",
                                        colorClasses[index % colorClasses.length]
                                    )}
                                >
                                    {item.char}
                                </Button>
                            ))}
                        </div>
                     )}
                </CardContent>
                 <CardFooter className="flex justify-end">
                    {isCorrect && (
                        <Button onClick={nextLevel}>
                           {currentQuestionIndex === questions.length - 1 ? 'Bitir' : 'Sonraki'}
                        </Button>
                    )}
                 </CardFooter>
            </Card>
        </div>
    );
}

export default function ConceptHuntPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ConceptHuntGame />
        </Suspense>
    );
}
