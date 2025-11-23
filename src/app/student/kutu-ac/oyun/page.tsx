
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKutuAcQuestionsAction, submitKutuAcScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Package, PartyPopper, Repeat, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

function KutuAcGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set());
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number; question: Question } | null>(null);
    const [score, setScore] = useState(0);

    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const activityCenterLink = useMemo(() => {
        if (user?.role === 'student') return '/student';
        return '/teacher/activities';
    }, [user]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getKutuAcQuestionsAction(params);
        if (result.error || result.questions.length === 0) {
            setError(result.error || "Bu konu için soru bulunamadı.");
        } else {
            setQuestions(shuffleArray(result.questions));
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        setOpenedBoxes(prev => new Set(prev).add(questionNumber));
        if(isCorrect) {
            setScore(s => s + scoreChange);
        }
        if (openedBoxes.size + 1 >= questions.length) {
            setIsFinished(true);
        }
    };

    const handleSaveAndExit = async () => {
        if (isSubmitting) return;

        if (user?.role !== 'student' || score <= 0) {
            router.push(activityCenterLink);
            return;
        }

        setIsSubmitting(true);
        const context = `Kutu Aç - ${searchParams.get('topicName') || 'Genel'}`;
        
        const result = await submitKutuAcScoreAction(user.uid, score, context);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanların kaydedildi." });
            router.push(activityCenterLink);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
            setIsSubmitting(false); // Allow retry
        }
    };

    const handleRestart = () => {
        setIsFinished(false);
        setScore(0);
        setOpenedBoxes(new Set());
        setOpenedQuestion(null);
        fetchQuestions();
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Oyun Yükleniyor...</span></div>;
    }

    if (error) {
        return (
            <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4")}>
                <Alert variant="destructive" className="max-w-lg"><AlertTitle>Hata!</AlertTitle><AlertDescription>{error}</AlertDescription><div className="mt-4"><Button asChild variant="outline"><Link href={activityCenterLink}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button></div></Alert>
            </div>
        );
    }
    
    if (isFinished) {
        return (
             <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4")}>
                <Card className={cn("w-full text-center", isFullscreen ? "h-screen rounded-none border-none flex flex-col justify-center" : "max-w-md")}>
                    <CardHeader>
                        <div className="mx-auto bg-amber-100 rounded-full p-3 w-fit"><PartyPopper className={cn("h-10 w-10 text-amber-500", isFullscreen && "h-16 w-16")}/></div>
                        <CardTitle className={cn("font-headline text-2xl md:text-3xl mt-4", isFullscreen && "text-5xl")}>Tebrikler!</CardTitle>
                        <CardDescription>Tüm kutuları açtın.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {user?.role === 'student' && <p className={cn("text-lg md:text-xl", isFullscreen && "text-2xl")}>Toplam Puanın: <span className="font-bold text-primary">{score}</span></p>}
                    </CardContent>
                    <CardFooter className="flex-col gap-2 pt-6">
                        {user?.role === 'student' ? (
                            <Button onClick={handleSaveAndExit} className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Home className="mr-2 h-4 w-4"/>}
                                {isSubmitting ? 'Kaydediliyor...' : 'Puanı Kaydet ve Çık'}
                            </Button>
                        ) : (
                             <Button asChild className="w-full"><Link href={activityCenterLink}><Home className="mr-2 h-4 w-4"/>Etkinlik Merkezine Dön</Link></Button>
                        )}
                        <Button onClick={handleRestart} variant="secondary" className="w-full">
                           <Repeat className="mr-2 h-4 w-4" /> Tekrar Oyna
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;

    return (
        <div className={cn("w-full h-full min-h-screen flex flex-col items-center justify-center p-2", isFullscreen ? "" : "md:p-8")}>
            <div className="w-full max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Package/> Kutu Aç</h1>
                    <div className="flex items-center gap-2">
                         {user?.role === 'student' && <span className="font-bold text-xl text-primary">Puan: {score}</span>}
                        <Button asChild variant="outline" size="sm"><Link href={activityCenterLink}><ArrowLeft className="mr-2 h-4 w-4"/>Çık</Link></Button>
                        <FullscreenToggle />
                    </div>
                </div>
                 <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-4">
                    {questions.map((q, i) => {
                        const questionNumber = i + 1;
                        const isOpened = openedBoxes.has(questionNumber);
                        return (
                            <div 
                                key={i}
                                className={cn(
                                    "aspect-square rounded-lg flex items-center justify-center text-2xl md:text-4xl font-bold text-white cursor-pointer shadow-lg transition-all duration-300",
                                    "bg-gradient-to-br from-indigo-500 to-purple-600",
                                    isOpened ? "opacity-20 cursor-not-allowed" : "hover:scale-105 hover:shadow-2xl"
                                )}
                                onClick={() => !isOpened && setOpenedQuestion({ number: questionNumber, question: q })}
                            >
                                {questionNumber}
                            </div>
                        )
                    })}
                </div>
                <div className="mt-6 text-center">
                    <Button onClick={() => setIsFinished(true)} variant="secondary">
                        <PartyPopper className="mr-2 h-4 w-4" /> Bitir ve Puanı Kaydet
                    </Button>
                </div>
            </div>
             {openedQuestion && (
                <QuestionDialog
                    isFullscreen={isFullscreen}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={timerDuration}
                    pointsConfig={{ 'mcq': { 'Kolay': 10, 'Orta': 15, 'Zor': 20 }, 'tf': { 'Kolay': 10, 'Orta': 15, 'Zor': 20 }, 'fitb': { 'Kolay': 10, 'Orta': 15, 'Zor': 20 } }}
                />
            )}
        </div>
    );
}

export default function KutuAcOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <KutuAcGame />
        </Suspense>
    )
}
 
    
