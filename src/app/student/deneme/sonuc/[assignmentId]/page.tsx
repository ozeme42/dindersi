'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getExamResultDetails, submitDenemeScoreAction } from '../../actions';
import type { ExamResultDetails, Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, BookCopy, BarChart3, Clock, Trophy, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function ResultCard({ question, studentAnswer, index }: { question: Question, studentAnswer: string | boolean | null, index: number }) {
    let isCorrect = false;
    let correctAnswerText = '';

    if (question.type === 'Doğru/Yanlış') {
        const correctAnswerBool = question.isTrue ?? (question.correctAnswer === 'Doğru');
        isCorrect = studentAnswer === correctAnswerBool;
        correctAnswerText = correctAnswerBool ? 'Doğru' : 'Yanlış';
    } else {
        isCorrect = studentAnswer === question.correctAnswer;
        correctAnswerText = question.correctAnswer || '';
    }

    const getAnswerText = (answer: any) => {
        if (typeof answer === 'boolean') {
            return answer ? 'Doğru' : 'Yanlış';
        }
        return answer || 'Boş';
    };

    return (
        <Card className={cn("w-full", isCorrect ? 'border-green-300 dark:border-green-800' : 'border-red-300 dark:border-red-800')}>
            <CardHeader>
                <CardTitle className="text-base flex items-start gap-3">
                    <span className="font-bold text-primary">{index + 1}.</span>
                    <span className="flex-1">{question.text}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className={cn("p-2 rounded-md", isCorrect ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30")}>
                    <p className="text-xs font-semibold">Senin Cevabın:</p>
                    <div className="flex items-center gap-2 mt-1">
                        {isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                        <p className="font-medium">{getAnswerText(studentAnswer)}</p>
                    </div>
                </div>
                 {!isCorrect && (
                    <div className="p-2 rounded-md bg-muted">
                        <p className="text-xs font-semibold">Doğru Cevap:</p>
                        <p className="font-medium mt-1">{getAnswerText(correctAnswerText)}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


function ExamResultsPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const assignmentId = params.assignmentId as string;
    
    const [details, setDetails] = useState<ExamResultDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchResults = useCallback(async () => {
        if (!user || !assignmentId) return;

        setIsLoading(true);
        const result = await getExamResultDetails(assignmentId, user.uid);
        if (result.success && result.data) {
            setDetails(result.data);
        } else {
            setError(result.error || "Sonuçlar getirilemedi.");
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsLoading(false);
    }, [assignmentId, user, toast]);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);
    
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Yükleniyor...</div>;
    }
    
    if (error || !details) {
        return (
            <div className="flex h-screen items-center justify-center text-center p-4">
                <div>
                     <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-xl font-semibold">Sonuçlar Yüklenemedi</h2>
                    <p className="text-muted-foreground">{error || "Bir hata oluştu."}</p>
                     <Button asChild variant="outline" className="mt-4">
                        <Link href="/student/deneme">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Deneme Sınavlarıma Dön
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    const { assignment, questions, studentAnswers, scoreEvent } = details;
    const correctCount = questions.reduce((count, question, index) => {
        const studentAnswer = studentAnswers[index];
        let isCorrect = false;
        if (question.type === 'Doğru/Yanlış') {
            const correctAnswerBool = question.isTrue ?? (question.correctAnswer === 'Doğru');
            isCorrect = studentAnswer === correctAnswerBool;
        } else {
            isCorrect = studentAnswer === question.correctAnswer;
        }
        return count + (isCorrect ? 1 : 0);
    }, 0);
    
    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="mb-6">
                <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/student/deneme">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Deneme Sınavlarıma Dön
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline">{assignment.title}</h1>
                <p className="text-muted-foreground">Sınav Sonuç Detayları</p>
            </div>
            
            <Card className="mb-6 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Genel Sonuç</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                        <span className="text-3xl font-bold text-primary">{scoreEvent.points}</span>
                        <span className="text-sm text-muted-foreground">Puan</span>
                    </div>
                     <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                        <span className="text-3xl font-bold text-green-600">{correctCount}</span>
                        <span className="text-sm text-muted-foreground">Doğru</span>
                    </div>
                     <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                        <span className="text-3xl font-bold text-red-600">{questions.length - correctCount}</span>
                        <span className="text-sm text-muted-foreground">Yanlış</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                        <span className="text-3xl font-bold">{questions.length}</span>
                        <span className="text-sm text-muted-foreground">Toplam Soru</span>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {questions.map((q, index) => (
                    <ResultCard key={q.id} question={q} studentAnswer={studentAnswers[index]} index={index} />
                ))}
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <ExamResultsPage />
        </Suspense>
    );
}
