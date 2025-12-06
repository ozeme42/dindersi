
'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAcikUcluCevaplaAction, submitAcikUcluCevaplaScoreAction } from '../actions';
import { useAuth } from '@/context/auth-context';
import type { Question } from '@/lib/types';
import { Loader2, Repeat, ArrowLeft, Home, User, CheckCircle2, AlertTriangle, Send, XCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';

const OpenEndedGame = () => {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const isStatic = searchParams.get('static') === 'true';

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    const gameContext = useMemo(() => ({
        courseName: searchParams.get('courseName') || 'Bilinmeyen Ders',
        unitName: searchParams.get('unitName') || 'Bilinmeyen Ünite',
        topicName: searchParams.get('topicName') || 'Bilinmeyen Konu',
    }), [searchParams]);
    
    const contextString = `Açık Uçlu Cevaplama - ${gameContext.courseName} > ${gameContext.topicName}`;

    useEffect(() => {
        async function fetchQuestions() {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const { questions: fetchedQuestions, error: fetchError } = await getAcikUcluCevaplaAction(params);

            if (fetchError) {
                setError(fetchError);
            } else if (fetchedQuestions.length > 0) {
                setQuestions(fetchedQuestions as Question[]);
                setGameState('playing');
            } else {
                setError("Bu kriterlere uygun soru bulunamadı.");
            }
        }
        fetchQuestions();
    }, [searchParams]);

    const handleSubmitAnswer = () => {
        if (!userAnswer.trim() || isAnswered) return;
        
        const currentQuestion = questions[currentQuestionIndex];
        const correctAnswer = (currentQuestion.correctAnswer || '').trim().toLocaleLowerCase('tr-TR');
        const submittedAnswer = userAnswer.trim().toLocaleLowerCase('tr-TR');
        
        const correct = correctAnswer === submittedAnswer;

        setIsAnswered(true);
        setIsCorrect(correct);
        
        if (correct) {
            playSound('correct');
            setScore(prev => prev + 25);
        } else {
            playSound('incorrect');
        }
    };
    
    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setUserAnswer('');
            setIsAnswered(false);
            setIsCorrect(null);
        } else {
            if (user) {
                submitAcikUcluCevaplaScoreAction(user.uid, score, contextString);
            }
            setGameState('finished');
        }
    }

    const restartGame = () => window.location.reload();
    
    const backUrl = '/oyunlar/acik-uclu-cevapla';

    if (gameState === 'loading') {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    if (error) {
         return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                 <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Harika!</CardTitle>
                        <CardDescription>Etkinliği tamamladın.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
                        <p className="text-xl">Kazandığın Puan: <span className="font-bold text-primary">{score}</span></p>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-4">
                        <Button onClick={restartGame}><Repeat className="mr-2 h-4 w-4" /> Yeni Test</Button>
                        <Button variant="outline" asChild><Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4" /> Etkinlik Merkezine Dön</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto flex flex-col h-screen justify-center">
             <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-center">Açık Uçlu Cevaplama</h1>
                <span className="font-bold text-lg">Puan: {score}</span>
            </div>
             <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full mb-4" />
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl md:text-2xl text-center">
                        <Lightbulb className="inline-block mr-2 h-6 w-6 text-yellow-400" />
                        {currentQuestion.text}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Cevabını buraya yaz..."
                        className="min-h-[150px] text-lg text-center"
                        disabled={isAnswered}
                    />
                     {isAnswered && (
                        <div className={`mt-4 p-3 rounded-md flex items-center justify-center gap-2 text-lg font-semibold ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {isCorrect ? <CheckCircle2 className="h-6 w-6"/> : <XCircle className="h-6 w-6"/>}
                            {isCorrect ? 'Doğru!' : `Yanlış! Doğru cevap: ${currentQuestion.correctAnswer}`}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center">
                     {isAnswered ? (
                        <Button onClick={handleNextQuestion} size="lg">
                           {currentQuestionIndex === questions.length - 1 ? 'Bitir' : 'Sonraki Soru'}
                        </Button>
                    ) : (
                         <Button onClick={handleSubmitAnswer} disabled={!userAnswer.trim()} size="lg">
                            <Send className="mr-2 h-4 w-4"/> Cevabı Gönder
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

const OpenEndedGamePage = () => {
     return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <OpenEndedGame />
        </Suspense>
    );
}

export default OpenEndedGamePage;
