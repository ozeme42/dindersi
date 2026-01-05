'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import { submitSoruBankasiScore } from '@/app/student/soru-bankasi/actions';
import type { Question, GetQuizInput } from '@/lib/types'; // GetQuizOutput gerekmiyorsa sildim
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, BrainCircuit, PartyPopper, Repeat, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { addQuestionToReviewList } from '@/app/student/tekrar-et/actions';
import { useAuth } from '@/context/auth-context';

function QuizGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Parametreleri al
    const courseId = searchParams.get('courseId');
    const topicId = searchParams.get('topicId');
    const difficulty = searchParams.get('difficulty')?.split(',');

    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | boolean | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);

    const fetchQuestions = useCallback(async () => {
        if (!topicId || !difficulty) {
            setError("Geçersiz test parametreleri.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        setQuestions([]);
        const params: GetQuizInput = {
            courseId: courseId || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: topicId || undefined,
            questionCount: parseInt(searchParams.get('questionCount') || '10'),
            difficulty: difficulty,
            questionTypes: searchParams.get('questionTypes')?.split(','),
        };
        const result = await getQuestionsFromBank(params as any);
        if (result.error) {
            setError(result.error);
        } else {
            setQuestions(result.questions as Question[]);
        }
        setIsLoading(false);
    }, [searchParams, difficulty, topicId, courseId]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);
    
    const handleAnswer = (answer: string | boolean) => {
        if (answers[currentQuestionIndex] !== undefined && answers[currentQuestionIndex] !== null) return;

        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answer;
        setAnswers(newAnswers);

        const question = questions[currentQuestionIndex];
        const isCorrect = answer === question.correctAnswer || (question.type === 'Doğru/Yanlış' && (answer ? "Doğru" : "Yanlış") === question.correctAnswer);

        if(isCorrect) {
            playSound('correct');
            setScore(s => s + 10);
            setCorrectCount(c => c + 1);
        } else {
            playSound('incorrect');
            if (user?.role === 'student' && question) {
                addQuestionToReviewList(user.uid, question as Question);
            }
        }
    };
    
    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setIsFinished(true);
        }
    }
    
    // Geri Dönüş Linki Oluşturma (Topic filtresinden kurtulmak için)
    const getBackLink = () => {
        return courseId ? `/student/soru-bankasi/${courseId}` : '/student/soru-bankasi';
    };

    const handleSaveAndExit = async () => {
        // Eğer kullanıcı öğrenci değilse veya puanı yoksa direkt çık
        if (!user || user.role !== 'student' || score <= 0 || isSubmitting) {
            router.push(getBackLink());
            return;
        }

        setIsSubmitting(true);
        const context = `${searchParams.get('courseName') || ''} - ${searchParams.get('topicName') || ''}`;
        const result = await submitSoruBankasiScore(user.uid, score, context);
        
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanların kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSubmitting(false);
        
        // Buradaki yönlendirme artık temiz bir URL'e gidiyor (query params olmadan)
        router.push(getBackLink());
    };

    const handleRestart = () => {
        setIsFinished(false);
        setCurrentQuestionIndex(0);
        setScore(0);
        setCorrectCount(0);
        setAnswers([]);
        fetchQuestions();
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Sorular Yükleniyor...</span></div>;
    }
    
    if (error) {
        return (
            <div className="w-full h-full min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                     <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href={getBackLink()}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }
    
    if (questions.length === 0) {
        return (
             <div className="w-full h-full min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
                <Alert className="max-w-lg">
                    <AlertTitle>Soru Bulunamadı</AlertTitle>
                    <AlertDescription>Bu kriterlere uygun soru bulunamadı. Lütfen filtrelerinizi değiştirerek tekrar deneyin.</AlertDescription>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href={getBackLink()}><ArrowLeft className="mr-2 h-4 w-4"/>Listeye Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        )
    }

    if(isFinished) {
        return (
             <div className="w-full h-full min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
                <Card className="w-full text-center max-w-md">
                    <CardHeader>
                        <div className="mx-auto bg-amber-100 rounded-full p-3 w-fit"><PartyPopper className="h-10 w-10 text-amber-500"/></div>
                        <CardTitle className="font-headline text-2xl md:text-3xl mt-4">Alıştırma Bitti!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-lg md:text-xl">Sonucun:</p>
                        <p className="text-4xl md:text-5xl font-bold text-primary">{correctCount} / {questions.length}</p>
                        <p className="text-base md:text-lg">Kazandığın Puan: <span className="font-bold">{score}</span></p>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row gap-2">
                        <Button onClick={handleRestart} className="w-full">
                           <Repeat className="mr-2 h-4 w-4" /> Tekrar Çöz
                        </Button>
                        <Button onClick={handleSaveAndExit} className="w-full" variant="outline" disabled={isSubmitting}>
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Home className="mr-2 h-4 w-4"/>}
                             {isSubmitting ? "Kaydediliyor..." : "Kaydet ve Listeye Dön"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestionIndex];

    return (
        <div className="w-full h-full min-h-screen flex items-center justify-center p-2 sm:p-6 md:p-8 pb-24 md:pb-8">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2 font-headline text-2xl md:text-3xl"><BrainCircuit className="text-blue-500 h-7 w-7 md:h-8 md:w-8"/> Soru Çöz</CardTitle>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                        <span className="text-xs md:text-sm text-muted-foreground">Soru {currentQuestionIndex + 1} / {questions.length}</span>
                        <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full" />
                         {user?.role === 'student' && <span className="text-xs md:text-sm font-semibold text-primary">Puan: {score}</span>}
                    </div>
                </CardHeader>
                <CardContent className="py-6 space-y-8">
                    <div className="text-center bg-background/50 border-2 border-primary/20 p-4 md:p-6 rounded-lg shadow-inner">
                        <p className="text-lg md:text-xl font-semibold">{currentQuestion.text}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                    {currentQuestion.type === 'Çoktan Seçmeli' && (currentQuestion.options || []).map(option => {
                        const isSelected = currentAnswer === option;
                        const isCorrect = currentQuestion.correctAnswer === option;
                        return (
                            <Button key={option} variant="outline" className={cn("h-auto py-3 text-base md:py-4 md:text-lg whitespace-normal justify-center", currentAnswer && isCorrect && "bg-green-100 border-green-500 text-green-800", currentAnswer && isSelected && !isCorrect && "bg-red-100 border-red-500 text-red-800" )} onClick={() => handleAnswer(option)} disabled={!!currentAnswer}>
                                {option}
                            </Button>
                        );
                    })}
                     {currentQuestion.type === 'Doğru/Yanlış' && ["Doğru", "Yanlış"].map(option => {
                        const answerValue = option === 'Doğru';
                        const isSelected = currentAnswer === answerValue;
                        // HATA DÜZELTİLDİ: 'question' yerine 'currentQuestion' kullanıldı
                        const isCorrect = (currentQuestion.isTrue ?? (currentQuestion.correctAnswer === 'Doğru')) === answerValue;
                        
                        return (
                            <Button key={option} variant="outline" className={cn("h-auto py-3 text-base md:py-4 md:text-lg whitespace-normal justify-center", currentAnswer && isCorrect && "bg-green-100 border-green-500 text-green-800", currentAnswer && isSelected && !isCorrect && "bg-red-100 border-red-500 text-red-800" )} onClick={() => handleAnswer(answerValue)} disabled={!!currentAnswer}>
                                {option}
                            </Button>
                        );
                    })}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleNext} disabled={!currentAnswer}>
                        {currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sonraki Soru'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function SoruCozOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <QuizGame />
        </Suspense>
    )
}