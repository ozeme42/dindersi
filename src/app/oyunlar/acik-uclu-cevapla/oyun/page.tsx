
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
import { GameEndScreen } from '@/components/game-end-screen';
import { useToast } from '@/hooks/use-toast';

const OpenEndedGame = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
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
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);


    const gameContext = useMemo(() => ({
        courseName: searchParams.get('courseName') || 'Bilinmeyen Ders',
        unitName: searchParams.get('unitName') || 'Bilinmeyen Ünite',
        topicName: searchParams.get('topicName') || 'Bilinmeyen Konu',
    }), [searchParams]);
    
    const contextString = `Açık Uçlu Cevaplama - ${gameContext.courseName} > ${gameContext.topicName}`;
    const backUrl = '/oyunlar/acik-uclu-cevapla';

    const fetchQuestions = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const { questions: fetchedQuestions, error: fetchError } = await getAcikUcluCevaplaAction(params);

        if (fetchError) {
            setError(fetchError);
             setGameState('error');
        } else if (fetchedQuestions.length > 0) {
            setQuestions(fetchedQuestions as Question[]);
            setGameState('playing');
        } else {
            setError("Bu kriterlere uygun soru bulunamadı.");
            setGameState('error');
        }
    }, [searchParams]);


    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

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
            setGameState('finished');
        }
    }

    const restartGame = () => {
        setScore(0);
        setCurrentQuestionIndex(0);
        setIsScoreSaved(false);
        setGameState('loading');
        setUserAnswer('');
        setIsAnswered(false);
        setIsCorrect(null);
        fetchQuestions();
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitAcikUcluCevaplaScoreAction(user.uid, score, contextString);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    
    if (gameState === 'loading') {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    if (gameState === 'error') {
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
             <GameEndScreen 
                score={score}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={restartGame}
                backUrl={backUrl}
            />
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto flex flex-col h-screen justify-center pb-24 md:pb-8">
             <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl md:text-3xl font-bold text-center">Açık Uçlu Cevaplama</h1>
                <div className="flex items-center gap-4">
                    <span className="font-bold text-lg">Puan: {score}</span>
                     <Button variant="outline" size="sm" onClick={() => setGameState('finished')}>Bitir</Button>
                </div>
            </div>
            <div className="text-center text-sm text-muted-foreground mb-2">Soru {currentQuestionIndex + 1} / {questions.length}</div>
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
