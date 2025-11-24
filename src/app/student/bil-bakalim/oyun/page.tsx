'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, ArrowLeft, PartyPopper, Repeat, Home } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function GuessItGame() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrectAnim, setIsCorrectAnim] = useState(false);
  const [wrongFeedbackId, setWrongFeedbackId] = useState<string | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);

  const isStatic = searchParams.get('static') === 'true';

  const gameContext = useMemo(
    () =>
      `Bil Bakalım - ${searchParams.get('courseName')} > ${searchParams.get(
        'topicName'
      )}`,
    [searchParams]
  );

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
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
      setQuestionQueue(
        [...result.questions].sort(() => Math.random() - 0.5)
      );
    } else {
      setError('Bu konu için uygun soru bulunamadı.');
    }
    setIsLoading(false);
  }, [searchParams]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const startGame = useCallback(() => {
    setQuestionQueue([...questions].sort(() => Math.random() - 0.5));
    setScore(0);
    setMistakeCount(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setWrongFeedbackId(null);
    setIsCorrectAnim(false);
    setScoreSaved(false);
  }, [questions]);

  const handleAnswer = (selectedId: string) => {
    if (isCorrectAnim || wrongFeedbackId !== null) return;

    const currentQ = questionQueue[0];
    const correctAnswerId = currentQ.id;

    if (selectedId === correctAnswerId) {
      // Correct Answer
      playSound('correct');
      setIsCorrectAnim(true);
      setScore((prev) => prev + 15);
      setTimeout(() => {
        setQuestionQueue((prev) => prev.slice(1));
        setIsCorrectAnim(false);
      }, 600);
    } else {
      // Wrong Answer
      playSound('incorrect');
      setWrongFeedbackId(selectedId);
      setMistakeCount((prev) => prev + 1);
      setScore((prev) => Math.max(0, prev - 5));
      setTimeout(() => {
        setQuestionQueue((prev) => {
          const wrongQuestion = prev[0];
          const remaining = prev.slice(1);
          return [...remaining, wrongQuestion];
        });
        setWrongFeedbackId(null);
      }, 600);
    }
  };

  const handleSaveAndExit = useCallback(async () => {
    if (scoreSaved || !user || score <= 0 || isStatic) {
      setIsFinished(true);
      return;
    }
    const result = await submitBilBakalimScoreAction(user.uid, score, gameContext);
    if (result.success) {
      toast({ title: 'Başarılı!', description: 'Puanın kaydedildi.' });
      setScoreSaved(true);
    } else {
      toast({ title: 'Hata', description: result.error, variant: 'destructive' });
    }
    setIsFinished(true);
  }, [score, user, gameContext, isStatic, scoreSaved, toast]);

  useEffect(() => {
    if (!isLoading && questionQueue.length === 0 && questions.length > 0) {
      handleSaveAndExit();
    }
  }, [questionQueue, questions, isLoading, handleSaveAndExit]);

  const backUrl = isStatic ? '/statik' : '/teacher/activities';

  if (isLoading)
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  if (error)
    return (
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
            <CardDescription>
              Bil Bakalım etkinliğini tamamladınız.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{score}</p>
            <p className="text-muted-foreground">Toplam Puan</p>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button onClick={startGame} className="w-full">
              Tekrar Oyna
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href={backUrl}>Etkinlik Merkezine Dön</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const currentQuestion = questionQueue[0];
  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-teal-50 dark:bg-teal-900/50">
      <div className="w-full max-w-4xl">
        <Card className="w-full text-center">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl sm:text-2xl">
                Kalan Soru: {questionQueue.length}
              </CardTitle>
              <div className="text-lg font-bold text-primary">Puan: {score}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={cn(
                'min-h-[120px] p-6 rounded-lg bg-muted flex items-center justify-center transition-colors duration-300',
                isCorrectAnim ? 'bg-green-100' : '',
                wrongFeedbackId ? 'bg-red-100 animate-shake' : ''
              )}
            >
              <p className="text-xl sm:text-2xl font-semibold">
                {currentQuestion.text}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {questions
                .sort((a, b) =>
                  a.correctAnswer.localeCompare(b.correctAnswer)
                )
                .map((q) => {
                  const isWrong = wrongFeedbackId === q.id;
                  const isTheCorrectAnswer = isCorrectAnim && q.id === currentQuestion.id;
                  
                  let buttonClass =
                    'h-20 text-base md:text-lg bg-background hover:bg-muted/80';
                  if (isTheCorrectAnswer) {
                    buttonClass =
                      'bg-green-500 hover:bg-green-600 text-white animate-pop';
                  } else if (isWrong) {
                    buttonClass =
                      'bg-red-500 hover:bg-red-600 text-white animate-shake';
                  }

                  return (
                    <Button
                      key={q.id}
                      className={cn(buttonClass)}
                      onClick={() => handleAnswer(q.id)}
                      disabled={isCorrectAnim || wrongFeedbackId !== null}
                    >
                      {q.correctAnswer}
                    </Button>
                  );
                })}
            </div>
          </CardContent>
        </Card>
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
