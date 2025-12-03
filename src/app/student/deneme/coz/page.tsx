

'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDenemeQuestionsAction, submitDenemeScoreAction } from '../actions';
import type { Question, Assignment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, ClipboardCheck, PartyPopper, Repeat, CheckCircle2, Home, Bug, Timer, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { ErrorReportDialog } from '@/components/error-report-dialog';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isFuture } from 'date-fns';

function DenemeGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | boolean | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const duration = parseInt(searchParams.get('duration') || '0') * 60; // in seconds
    const [timeLeft, setTimeLeft] = useState(duration);
    const timerRef = useRef<NodeJS.Timeout>();

    const [isFullscreen, setIsFullscreen] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);

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

    const fetchQuest = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        const assignmentId = searchParams.get('assignmentId');
        const questionIdsParam = searchParams.get('questionIds');
        const questionIds = questionIdsParam ? questionIdsParam.split(',') : [];

        if (!assignmentId || questionIds.length === 0) {
             setError("Bu deneme için soru veya ödev bilgisi bulunamadı.");
             setIsLoading(false);
             return;
        }

        try {
            // Fetch assignment details to check start date
            const assignmentRef = doc(db, 'assignments', assignmentId);
            const assignmentSnap = await getDoc(assignmentRef);
            if (!assignmentSnap.exists()) {
                 setError("Atama bulunamadı.");
                 setIsLoading(false);
                 return;
            }
            const assignmentData = assignmentSnap.data() as Assignment;
            if (assignmentData.startDate && isFuture(new Date(assignmentData.startDate))) {
                setError("Bu deneme henüz başlamadı.");
                toast({ title: "Henüz Değil!", description: "Bu denemenin başlangıç tarihi henüz gelmedi.", variant: "destructive" });
                router.push('/student/deneme');
                return;
            }

            // If start date is valid, fetch questions
            const result = await getDenemeQuestionsAction({ questionIds });
            if (result.error || result.questions.length === 0) {
                setError(result.error || "Bu konu için soru bulunamadı.");
            } else {
                setQuestions(result.questions);
                setAnswers(new Array(result.questions.length).fill(null));
            }
        } catch(e) {
            setError("Veri alınırken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }

    }, [searchParams, router, toast]);

    useEffect(() => {
        fetchQuest();
    }, [fetchQuest]);

     useEffect(() => {
        if (!isLoading && questions.length > 0 && !isFinished && duration > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        setIsFinished(true); // Finish exam when time is up
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isLoading, questions, isFinished, duration]);
    
    const handleAnswer = (answer: string | boolean) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answer;
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setIsFinished(true);
        }
    };
    
    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };


    const handleSaveAndExit = async () => {
        if (isSubmitting) return;

        if (user?.role !== 'student') {
            router.push('/student/deneme');
            return;
        }

        let correctCount = 0;
        answers.forEach((answer, index) => {
            const question = questions[index];
            if (!question) return;
            
            let isCorrect = false;
            if (question.type === 'Doğru/Yanlış') {
                isCorrect = answer === (question.isTrue ?? (question.correctAnswer === 'Doğru'));
            } else {
                isCorrect = answer === question.correctAnswer;
            }
            if (isCorrect) {
                correctCount++;
            }
        });
        const finalScore = correctCount * 10;

        setIsSubmitting(true);
        const assignmentId = searchParams.get('assignmentId');
        if (!assignmentId) {
            toast({ title: "Hata", description: "Ödev kimliği bulunamadı, skor kaydedilemedi.", variant: "destructive"});
            setIsSubmitting(false);
            return;
        }

        const context = `Deneme ID: ${assignmentId}`;
        const result = await submitDenemeScoreAction(user.uid, finalScore, context, answers);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Denemen kaydedildi. Sonuçlarını görüntüleyebilirsin." });
            router.push('/student/deneme');
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
            setIsSubmitting(false);
        }
    };
    
    useEffect(() => {
        if (isFinished) {
            handleSaveAndExit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFinished]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Deneme Sınavı Yükleniyor...</span></div>;
    }
    
    if (error) {
        return (
            <div className={cn("w-full h-full min-h-screen flex items-center justify-center", !isFullscreen && "p-4")}>
                <Alert variant="destructive" className="max-w-lg"><AlertTriangle className="h-4 w-4 mr-2" /><AlertTitle>Hata!</AlertTitle><AlertDescription>{error}</AlertDescription><div className="mt-4"><Button asChild variant="outline"><Link href="/student/deneme"><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button></div></Alert>
            </div>
        );
    }
    
    if (isFinished) {
        return (
             <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4")}>
                <Card className={cn("w-full text-center", isFullscreen ? "h-screen rounded-none border-none flex flex-col justify-center" : "max-w-md")}>
                    <CardHeader>
                        <div className="mx-auto bg-amber-100 rounded-full p-3 w-fit"><PartyPopper className={cn("h-10 w-10 text-amber-500", isFullscreen && "h-16 w-16")}/></div>
                        <CardTitle className={cn("font-headline text-2xl md:text-3xl mt-4", isFullscreen && "text-5xl")}>Deneme Bitti!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>Sonuçların kaydediliyor, yönlendiriliyorsun...</p>
                        <Loader2 className="h-8 w-8 animate-spin mx-auto"/>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return <div className="text-center p-8">Soru yüklenemedi.</div>;

    const currentAnswer = answers[currentQuestionIndex];

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };
    
    return (
        <>
            <div ref={mainContentRef} className={cn("w-full h-full min-h-screen flex items-center justify-center p-2", isFullscreen ? "" : "md:pb-2")}>
                <Card className={cn("w-full bg-card/70 backdrop-blur-sm", isFullscreen ? "h-screen rounded-none border-none flex flex-col" : "max-w-2xl")}>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className={cn("flex items-center gap-2 font-headline text-2xl md:text-3xl", isFullscreen && "text-5xl")}><ClipboardCheck className={cn("text-indigo-500 h-7 w-7 md:h-8 md:w-8", isFullscreen && "h-12 w-12")}/> Deneme Sınavı</CardTitle>
                            <div className="flex items-center gap-2">
                                {duration > 0 && <Badge variant="outline" className="text-lg">
                                    <Timer className="mr-2 h-5 w-5"/>
                                    {formatTime(timeLeft)}
                                </Badge>}
                                <FullscreenToggle elementRef={mainContentRef} />
                            </div>
                        </div>
                        <CardDescription>{searchParams.get('assignmentTitle')}</CardDescription>
                        <div className="flex items-center gap-4 pt-2">
                            <span className={cn("text-xs md:text-sm text-muted-foreground", isFullscreen && "text-base")}>Soru {currentQuestionIndex + 1} / {questions.length}</span>
                            <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full" />
                        </div>
                    </CardHeader>
                    <CardContent className={cn("py-4 md:py-6 flex-grow flex flex-col justify-center", isFullscreen ? "" : "min-h-[250px]")}>
                        <div className="text-center bg-background/50 border-2 border-primary/20 p-6 rounded-lg shadow-inner">
                            <p className={cn("font-semibold", isFullscreen ? "text-3xl" : "text-xl")}>{currentQuestion.text}</p>
                        </div>
                        <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6", isFullscreen && "gap-6 mt-12")}>
                            {currentQuestion.type === 'Doğru/Yanlış' ? (
                                ["Doğru", "Yanlış"].map(option => {
                                    const answerValue = option === 'Doğru';
                                    return (
                                        <Button key={option} variant={currentAnswer === answerValue ? "default" : "outline"} className={cn("h-auto py-3 text-base md:py-4 md:text-lg whitespace-normal justify-center")} onClick={() => handleAnswer(answerValue)}>
                                            {option}
                                        </Button>
                                    )
                                })
                            ) : (currentQuestion.options || []).map(option => (
                                <Button key={option} variant={currentAnswer === option ? "default" : "outline"} className="h-auto py-3 text-base md:py-4 md:text-lg whitespace-normal justify-center" onClick={() => handleAnswer(option)}>
                                    {option}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Önceki Soru
                        </Button>
                         <div className="hidden md:block">
                            <Button variant="link" size="sm" onClick={() => handleReportQuestion(currentQuestion)}>
                                <Bug className="mr-2 h-4 w-4"/> Bu soruda hata olduğunu düşünüyorum
                            </Button>
                        </div>
                        <Button onClick={handleNext}>
                            {currentQuestionIndex === questions.length - 1 ? 'Denemeyi Bitir' : 'Sonraki Soru'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            <ErrorReportDialog 
                isOpen={isReportDialogOpen} 
                onOpenChange={setIsReportDialogOpen} 
                itemToReport={questionToReport} 
            />
        </>
    );
}

export default function DenemeOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <DenemeGame />
        </Suspense>
    )
}
