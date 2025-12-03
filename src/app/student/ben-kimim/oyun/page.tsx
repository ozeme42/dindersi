
"use client"

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBenKimimAction, submitBenKimimScoreAction, type BenKimimQuestion } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';

function WhoAmIGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const [questions, setQuestions] = useState<BenKimimQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const isStatic = searchParams.get('static') === 'true';

    const gameContext = `Ben Kimim? - ${searchParams.get('topicName')}`;

    useEffect(() => {
        const fetchQuestions = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };

            const result = await getBenKimimAction(params);
            if (result.error) {
                setError(result.error);
            } else if (result.questions && result.questions.length > 0) {
                setQuestions(result.questions);
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams]);
    
    const currentQuestion = questions[currentQuestionIndex];

    const handleSubmit = () => {
        if (!userAnswer.trim()) return;
        
        const isCorrect = userAnswer.trim().toLocaleLowerCase('tr-TR') === currentQuestion.correctAnswer.trim().toLocaleLowerCase('tr-TR');
        
        setIsCorrect(isCorrect);
        setIsAnswered(true);

        if (isCorrect) {
            playSound('correct');
            setScore(prev => prev + 20);
        } else {
            playSound('incorrect');
        }
    };

    const handleNext = async () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setUserAnswer('');
            setIsAnswered(false);
            setIsCorrect(null);
        } else {
            if (user && score > 0 && !isStatic) {
                await submitBenKimimScoreAction(user.uid, score, gameContext);
            }
            setIsFinished(true);
        }
    };
    
    const backUrl = isStatic ? '/statik' : '/teacher/activities';

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
                        <CardDescription>Ben Kimim? etkinliğini tamamladınız.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">{score}</p>
                        <p className="text-muted-foreground">Toplam Puan</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={() => window.location.reload()} className="w-full">Tekrar Oyna</Button>
                        <Button variant="outline" asChild className="w-full">
                           <Link href={backUrl}>Etkinlik Merkezine Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (!currentQuestion) return null;

    return (
        <div className="flex h-screen w-full items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/50">
            <Card className="w-full max-w-xl">
                 <CardHeader>
                    <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mb-4" />
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">Soru {currentQuestionIndex + 1}/{questions.length}</CardTitle>
                        <div className="text-lg font-bold text-primary">Puan: {score}</div>
                    </div>
                    <CardDescription className="text-lg pt-4 min-h-[80px]">
                        <Lightbulb className="inline-block mr-2 h-5 w-5 text-yellow-400" />
                        {currentQuestion.questionText}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Ben kimim?"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            disabled={isAnswered}
                            className="text-base"
                            onKeyDown={(e) => { if (e.key === 'Enter' && !isAnswered) handleSubmit(); }}
                        />
                        {!isAnswered && (
                            <Button onClick={handleSubmit}>
                                <Send className="mr-2 h-4 w-4"/> Cevapla
                            </Button>
                        )}
                    </div>
                    {isAnswered && (
                         <div className={`mt-4 p-4 rounded-md flex items-center gap-2 ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                            <p className="font-medium">
                                {isCorrect ? 'Doğru cevap!' : `Yanlış! Doğru cevap: ${currentQuestion.correctAnswer}`}
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end">
                    {isAnswered && (
                        <Button onClick={handleNext}>
                           {currentQuestionIndex === questions.length - 1 ? 'Bitir' : 'Sonraki Soru'}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

export default function WhoAmIPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <WhoAmIGame />
        </Suspense>
    );
}
