

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDailyQuestAction, submitDailyQuestAction } from './actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, Sun, PartyPopper, Repeat, CheckCircle2, Home, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { ErrorReportDialog } from '@/components/error-report-dialog';
import { addQuestionToReviewList } from '@/app/student/tekrar-et/actions';

export default function DailyQuestPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);

    const [isFullscreen, setIsFullscreen] = useState(false);

    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [questionToReport, setQuestionToReport] = useState<Question | null>(null);

    const handleReportQuestion = (question: Question) => {
        setQuestionToReport(question);
        setIsReportDialogOpen(true);
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        async function fetchQuest() {
            if (!user) {
                setIsLoading(false);
                setError("Görevi görüntülemek için giriş yapmalısınız.");
                return;
            }
            const result = await getDailyQuestAction(user.uid);
            if (result.error) {
                setError(result.error);
            } else {
                setIsCompleted(result.completed);
                setQuestions(result.questions);
            }
            setIsLoading(false);
        }
        fetchQuest();
    }, [user]);
    
    const handleAnswer = (answer: string) => {
        if (answers[currentQuestionIndex] !== undefined && answers[currentQuestionIndex] !== null) return;

        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answer;
        setAnswers(newAnswers);

        const question = questions[currentQuestionIndex];
        const isCorrect = answer === question.correctAnswer;

        if(isCorrect) {
            playSound('correct');
            setScore(s => s + 10); // 10 points per correct answer
            setCorrectCount(c => c + 1);
        } else {
            playSound('incorrect');
            if (user) {
                addQuestionToReviewList(user.uid, question);
            }
        }

        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
            } else {
                setIsFinished(true);
            }
        }, 1000);
    };
    
    const handleSaveAndExit = async () => {
        if (isSubmitting) return;
        if (!user || user.role !== 'student') {
            router.push('/student');
            return;
        }

        setIsSubmitting(true);
        const result = await submitDailyQuestAction(user.uid, score, correctCount);
        if (!result.success) {
            toast({ title: "Hata", description: result.error, variant: 'destructive'});
            setIsSubmitting(false); // Allow retry
        } else {
            toast({ title: "Kaydedildi!", description: "Günün görevi puanın başarıyla kaydedildi." });
            router.push('/student');
        }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    
    if (isCompleted) {
        return (
            <div className={cn(
                "w-full h-full min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 dark:from-slate-800 dark:to-purple-950",
                !isFullscreen && "p-4 sm:p-6 md:p-8"
            )}>
                <Card className={cn(
                    "w-full text-center",
                     isFullscreen ? "h-screen rounded-none border-none flex flex-col justify-center" : "max-w-md"
                )}>
                    <CardHeader>
                        <div className="mx-auto bg-green-100 rounded-full p-3 w-fit"><CheckCircle2 className={cn("h-10 w-10 text-green-600", isFullscreen && "h-16 w-16")}/></div>
                        <CardTitle className={cn("font-headline text-3xl mt-4", isFullscreen && "text-5xl")}>Bugünkü Görev Tamamlandı!</CardTitle>
                        <CardDescription className={cn(isFullscreen && "text-lg")}>Harikasın! Yarın yeni bir görev için tekrar gelmeyi unutma.</CardDescription>
                    </CardHeader>
                    <CardFooter className={cn(isFullscreen && "p-6")}>
                         <Button asChild size={isFullscreen ? "lg" : "default"} className="w-full">
                            <Link href="/student"><Home className="mr-2 h-4 w-4"/> Panele Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("w-full h-full min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 dark:from-slate-800 dark:to-purple-950", !isFullscreen && "p-4 sm:p-6 md:p-8")}>
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if(isFinished) {
        const bonus = correctCount === 5 ? 50 : 0;
        return (
             <div className={cn(
                "w-full h-full min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 dark:from-slate-800 dark:to-purple-950",
                !isFullscreen && "p-4 sm:p-6 md:p-8"
             )}>
                <Card className={cn(
                    "w-full text-center",
                    isFullscreen ? "h-screen rounded-none border-none flex flex-col justify-center" : "max-w-md"
                )}>
                    <CardHeader>
                        <div className="mx-auto bg-amber-100 rounded-full p-3 w-fit"><PartyPopper className={cn("h-10 w-10 text-amber-500", isFullscreen && "h-16 w-16")}/></div>
                        <CardTitle className={cn("font-headline text-3xl mt-4", isFullscreen && "text-5xl")}>Görev Bitti!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className={cn("text-xl", isFullscreen && "text-3xl")}>Sonucun:</p>
                        <p className={cn("text-5xl font-bold text-primary", isFullscreen && "text-7xl")}>{correctCount} / {questions.length}</p>
                        <p className={cn("text-lg", isFullscreen && "text-2xl")}>Kazandığın Puan: <span className="font-bold">{score}</span></p>
                        {bonus > 0 && <p className={cn("text-lg text-green-600 font-semibold", isFullscreen && "text-2xl")}>Tüm soruları doğru bildiğin için +{bonus} bonus puan kazandın!</p>}
                    </CardContent>
                    <CardFooter className={cn("p-6")}>
                        <Button onClick={handleSaveAndExit} size={isFullscreen ? "lg" : "default"} className="w-full" disabled={isSubmitting}>
                           {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Home className="mr-2 h-4 w-4"/>}
                           {isSubmitting ? "Kaydediliyor..." : "Puanları Kaydet ve Çık"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestionIndex];

    return (
        <>
        <div className={cn(
            "w-full h-full min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 dark:from-slate-800 dark:to-purple-950",
            !isFullscreen && "p-4 sm:p-6 md:p-8"
        )}>
            <Card className={cn(
                "w-full",
                isFullscreen ? "h-screen rounded-none border-none flex flex-col" : "max-w-2xl"
            )}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className={cn("flex items-center gap-2 font-headline text-3xl", isFullscreen && "text-5xl")}><Sun className={cn("text-amber-500", isFullscreen && "h-12 w-12")}/> Günün Görevi</CardTitle>
                        <FullscreenToggle />
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                        <span className={cn("text-sm text-muted-foreground", isFullscreen && "text-base")}>Soru {currentQuestionIndex + 1} / {questions.length}</span>
                        <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full" />
                    </div>
                </CardHeader>
                <CardContent className={cn("py-6", isFullscreen ? "flex-grow flex flex-col justify-center" : "min-h-[250px]")}>
                    <div className="text-center bg-background/50 border-2 border-primary/20 p-6 rounded-lg shadow-inner">
                        <p className={cn("text-xl font-semibold", isFullscreen && "text-3xl")}>{currentQuestion.text}</p>
                    </div>
                    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6", isFullscreen && "gap-6 mt-12")}>
                    {(currentQuestion.type === 'Çoktan Seçmeli' || currentQuestion.type === 'Boşluk Doldurma') && currentQuestion.options?.map(option => {
                        const isSelected = currentAnswer === option;
                        const isCorrect = currentQuestion.correctAnswer === option;
                        return (
                            <Button key={option} variant="outline" className={cn("h-auto py-4 whitespace-normal justify-start text-left", isFullscreen && "text-2xl py-8", currentAnswer && isCorrect && "bg-green-100 border-green-500 text-green-800", currentAnswer && isSelected && !isCorrect && "bg-red-100 border-red-500 text-red-800" )} onClick={() => handleAnswer(option)} disabled={!!currentAnswer}>
                                {option}
                            </Button>
                        );
                    })}
                    {currentQuestion.type === 'Doğru/Yanlış' && ["Doğru", "Yanlış"].map(option => {
                        const isSelected = currentAnswer === option;
                        const isCorrect = currentQuestion.correctAnswer === option;
                        return (
                            <Button key={option} variant="outline" className={cn("h-auto py-4 text-lg", isFullscreen && "text-2xl py-8", currentAnswer && isCorrect && "bg-green-100 border-green-500 text-green-800", currentAnswer && isSelected && !isCorrect && "bg-red-100 border-red-500 text-red-800")} onClick={() => handleAnswer(option)} disabled={!!currentAnswer}>
                                {option}
                            </Button>
                        );
                    })}
                    </div>
                    {currentAnswer && (
                        <div className="text-center mt-4">
                            <Button variant="link" size="sm" onClick={() => handleReportQuestion(currentQuestion)}>
                                <Bug className="mr-2 h-4 w-4"/> Bu soruda bir hata olduğunu düşünüyorum
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <ErrorReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} itemToReport={questionToReport} />
        </>
    );
}
