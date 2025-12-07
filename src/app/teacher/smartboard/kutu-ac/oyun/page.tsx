'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKutuAcQuestionsAction } from '@/app/oyunlar/kutu-ac/actions';
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
import { GameEndScreen } from '@/components/game-end-screen';

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
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const backUrl = '/oyunlar/kutu-ac';
    const gameContext = `Kutu Aç - ${searchParams.get('topicName') || 'Genel'}`;

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
        // Teachers do not save scores
        router.push('/teacher/smartboard');
    };

    const handleRestart = () => {
        setIsFinished(false);
        setScore(0);
        setOpenedBoxes(new Set());
        setOpenedQuestion(null);
        setIsScoreSaved(false);
        fetchQuestions();
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Oyun Yükleniyor...</span></div>;
    }

    if (error) {
        return (
            <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4")}>
                <Alert variant="destructive" className="max-w-lg"><AlertTitle>Hata!</AlertTitle><AlertDescription>{error}</AlertDescription><div className="mt-4"><Button asChild variant="outline"><Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button></div></Alert>
            </div>
        );
    }
    
    if (isFinished) {
        return (
            <GameEndScreen
                score={score}
                onSave={handleSaveAndExit}
                isSaving={isSubmitting}
                scoreSaved={true} // For teacher mode, assume it's "saved" to just exit
                onRestart={handleRestart}
                backUrl={'/teacher/smartboard'}
            />
        )
    }

    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;

    return (
        <div className={cn("w-full h-full min-h-screen flex flex-col items-center justify-center pb-24 md:pb-8", isFullscreen ? "" : "md:p-8")}>
            <div className="w-full max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Package/> Kutu Aç</h1>
                    <div className="flex items-center gap-2">
                         <span className="font-bold text-xl text-primary">Puan: {score}</span>
                        <Button variant="destructive" size="sm" onClick={() => setIsFinished(true)}>Bitir</Button>
                        <FullscreenToggle />
                    </div>
                </div>
                <div className="text-sm text-muted-foreground mb-2">{openedBoxes.size} / {questions.length} kutu açıldı.</div>
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
            </div>
             {openedQuestion && (
                <QuestionDialog
                    isFullscreen={isFullscreen}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={timerDuration}
                    pointsConfig={{ default: { points: 10 }}}
                    showCorrectAnswerOnWrong={true}
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
