
'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';

function GuessItGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [questionQueue, setQuestionQueue] = useState<Partial<Question>[]>([]);
    const [allAnswers, setAllAnswers] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    
    const [score, setScore] = useState(0);
    const [mistakeCount, setMistakeCount] = useState(0);
    
    const [wrongFeedbackId, setWrongFeedbackId] = useState<string | null>(null);
    const [isCorrectAnim, setIsCorrectAnim] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false);
    
    const isStatic = searchParams.get('static') === 'true';
    const gameContext = useMemo(() => `Bil Bakalım - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`, [searchParams]);


    const startGame = useCallback(() => {
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        setQuestionQueue(shuffled);
        setIsFinished(false);
        setScore(0);
        setMistakeCount(0);
        setIsCorrectAnim(false);
        setWrongFeedbackId(null);
        setScoreSaved(false);
    }, [questions]);
    
    useEffect(() => {
        const fetchQuestions = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getBilBakalimAction(params);
            if (result.error) {
                setError(result.error);
            } else if (result.questions && result.questions.length > 0) {
                setQuestions(result.questions);
                setAllAnswers(result.questions.map(q => q.correctAnswer || ''));
                const shuffled = [...result.questions].sort(() => Math.random() - 0.5);
                setQuestionQueue(shuffled);
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic]);
    
    useEffect(() => {
        if (!isLoading && !isFinished && questionQueue.length === 0 && questions.length > 0) {
            setIsFinished(true);
        }
    }, [questionQueue, questions, isFinished, isLoading]);

    useEffect(() => {
        const handleFinish = async () => {
             if (user && score > 0 && !isStatic && !scoreSaved) {
                setIsSaving(true);
                const result = await submitBilBakalimScoreAction(user.uid, score, gameContext);
                if (result.success) {
                    toast({ title: 'Başarılı!', description: 'Puanın kaydedildi.' });
                    setScoreSaved(true);
                } else {
                    toast({ title: 'Hata!', description: result.error, variant: 'destructive' });
                }
                setIsSaving(false);
             }
        }
        if (isFinished) {
            handleFinish();
        }
    }, [isFinished, user, score, isStatic, gameContext, scoreSaved, toast]);
    
    const handleAnswer = (selectedAnswer: string) => {
        if (isCorrectAnim || wrongFeedbackId !== null) return;
        
        const currentQuestion = questionQueue[0];
        if (!currentQuestion) return;

        if (selectedAnswer === currentQuestion.correctAnswer) {
            playSound('correct');
            setIsCorrectAnim(true);
            setScore(prev => prev + 15);
            setTimeout(() => {
                setQuestionQueue(prev => prev.slice(1));
                setIsCorrectAnim(false);
            }, 600);
        } else {
            playSound('incorrect');
            setWrongFeedbackId(selectedAnswer);
            setScore(prev => Math.max(0, prev - 5));
            setMistakeCount(prev => prev + 1);
            setTimeout(() => {
                setQuestionQueue(prev => {
                    const wrongQ = prev[0];
                    const remaining = prev.slice(1);
                    return [...remaining, wrongQ];
                });
                setWrongFeedbackId(null);
            }, 600);
        }
    };
    
    const backUrl = isStatic ? '/statik' : '/student/bil-bakalim';

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
            <div className="flex min-h-screen w-full items-center justify-center p-4">
                <Card className="w-full max-w-md text-center animate-pop">
                    <CardHeader>
                        <CardTitle>Tebrikler!</CardTitle>
                        <CardDescription>Bil Bakalım etkinliğini tamamladınız.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">{score}</p>
                        <p className="text-muted-foreground">Toplam Puan</p>
                        <p className="text-sm text-red-500 mt-2">Yapılan Hata: {mistakeCount}</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={startGame} className="w-full">Tekrar Oyna</Button>
                        <Button variant="outline" asChild className="w-full">
                           <Link href={backUrl}>Etkinlik Merkezine Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    const currentQuestion = questionQueue[0];

    return (
        <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-teal-50 dark:bg-teal-900/50">
            <div className="w-full max-w-3xl">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold header-font text-teal-700 dark:text-teal-200">Bil Bakalım?</h1>
                     <div className="flex gap-4 items-center">
                        <div className="bg-white px-3 py-1 rounded-full shadow text-sm font-bold text-gray-600">Kalan: <span className="text-teal-600 text-lg">{questionQueue.length}</span></div>
                        <div className="bg-white px-3 py-1 rounded-full shadow text-sm font-bold text-gray-600">Puan: <span className="text-teal-600 text-lg">{score}</span></div>
                     </div>
                </div>

                {currentQuestion && (
                    <>
                        <div className={cn('w-full bg-white p-6 sm:p-8 rounded-2xl shadow-lg border-b-8 border-teal-200 mb-6 text-center min-h-[160px] flex flex-col justify-center items-center relative overflow-hidden transition-colors duration-300 animate-slide',
                            isCorrectAnim ? 'bg-green-50 border-green-200' : '',
                            wrongFeedbackId ? 'bg-red-50 border-red-200 animate-shake' : ''
                        )}>
                            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Soru</div>
                            <h2 className={cn("text-xl sm:text-2xl font-bold leading-relaxed transition-colors", wrongFeedbackId ? 'text-red-600' : 'text-gray-800')}>
                                {currentQuestion.text}
                            </h2>
                            {wrongFeedbackId && <div className="absolute bottom-2 text-red-500 font-bold text-sm">Yanlış! Bu soru sona atıldı.</div>}
                            {isCorrectAnim && <div className="absolute bottom-2 text-green-600 font-bold text-sm animate-pop">Harika! Doğru Cevap.</div>}
                        </div>

                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
                            {allAnswers.map((answer, index) => {
                                const isCorrectAnswer = answer === currentQuestion.correctAnswer;
                                const isSelected = answer === selectedAnswer;
                                
                                let buttonClass = '';

                                if (isCorrectAnim && isCorrectAnswer) {
                                    buttonClass = "bg-green-500 border-green-700 text-white transform scale-105 shadow-lg z-10 animate-pop";
                                } else if (wrongFeedbackId === answer) {
                                    buttonClass = "bg-red-500 border-red-700 text-white animate-shake";
                                } else {
                                    buttonClass = "bg-white border-teal-200 text-gray-700 hover:bg-teal-50 hover:border-teal-300 hover:-translate-y-1";
                                }
                                
                                return (
                                <Button 
                                    key={`${currentQuestion.id}-${index}`} 
                                    className={cn("h-20 text-base md:text-lg", buttonClass)}
                                    onClick={() => handleAnswer(answer)}
                                    disabled={isCorrectAnim || wrongFeedbackId !== null}
                                >
                                    {answer}
                                </Button>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function GuessItPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
        <GuessItGame />
    </Suspense>
  );
}

export default GuessItPage;
