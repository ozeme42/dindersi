'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAssignmentDetails } from '@/app/teacher/assignments/[assignmentId]/actions';
import type { ExamResultDetails, Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

function ResultCard({ question, studentAnswer, index }: { question: Question, studentAnswer: string | boolean | null, index: number }) {
    let isCorrect = false;
    // Handle both boolean for T/F and string for MCQ/FITB
    if (question.type === 'Doğru/Yanlış') {
        const correctAnswerBool = question.correctAnswer === 'Doğru';
        isCorrect = studentAnswer === correctAnswerBool;
    } else {
        isCorrect = studentAnswer === question.correctAnswer;
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
                        <p className="font-medium mt-1">{getAnswerText(question.correctAnswer)}</p>
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
        const result = await getAssignmentDetails(assignmentId);
        if (result.success && result.data) {
            // Only get details for the current student
            const studentProgress = result.data.studentProgress.find(p => p.student.uid === user.uid);
            if (studentProgress && studentProgress.scoreEvent) {
                setDetails({
                    assignment: result.data.assignment,
                    questions: [], // We'll fetch questions separately if needed
                    studentAnswers: studentProgress.scoreEvent.answers || [],
                    scoreEvent: studentProgress.scoreEvent
                });
                
                // Now fetch the actual questions
                const questionIds = result.data.assignment.questionIds || [];
                const questionDocs = await Promise.all(
                    questionIds.map(id => getDoc(doc(db, 'examQuestions', id)))
                );
                 const questions = questionDocs
                    .map(docSnap => docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Question) : null)
                    .filter((q): q is Question => q !== null);
                
                const questionsMap = new Map(questions.map(q => [q.id, q]));
                const orderedQuestions = questionIds.map(id => questionsMap.get(id)).filter(Boolean) as Question[];

                setDetails(prev => prev ? ({ ...prev, questions: orderedQuestions }) : null);

            } else {
                setError('Bu deneme için bir sonuç kaydı bulunamadı veya deneme size atanmamış.');
            }
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

    const { assignment, questions = [], studentAnswers, scoreEvent } = details;
    const correctCount = questions.reduce((count, question, index) => {
        const studentAnswer = studentAnswers[index];
        let isCorrect = false;
        if (question?.type === 'Doğru/Yanlış') {
            const correctAnswerBool = question.correctAnswer === 'Doğru';
            isCorrect = studentAnswer === correctAnswerBool;
        } else {
            isCorrect = studentAnswer === question?.correctAnswer;
        }
        return count + (isCorrect ? 1 : 0);
    }, 0);
    
    const incorrectQuestions = questions.map((q, i) => ({ question: q, studentAnswer: studentAnswers[i] })).filter((item, index) => {
         let isCorrect = false;
         if (item.question?.type === 'Doğru/Yanlış') {
            const correctAnswerBool = item.question.correctAnswer === 'Doğru';
            isCorrect = item.studentAnswer === correctAnswerBool;
        } else {
            isCorrect = item.studentAnswer === item.question?.correctAnswer;
        }
        return !isCorrect;
    });

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
            
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Genel Sonuç</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <Star className="h-6 w-6 text-amber-500 mb-1"/>
                        <p className="text-sm text-amber-500">Puan</p>
                        <p className="text-2xl font-bold text-amber-600">{scoreEvent?.points || 0}</p>
                    </div>
                     <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <CheckCircle2 className="h-6 w-6 text-green-600 mb-1"/>
                        <p className="text-sm text-green-600">Doğru</p>
                        <p className="text-2xl font-bold text-green-700">{correctCount}</p>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                             <div className="p-4 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100">
                                <XCircle className="h-6 w-6 text-red-600 mb-1"/>
                                <p className="text-sm text-red-600">Yanlış</p>
                                <p className="text-2xl font-bold text-red-700">{questions.length - correctCount}</p>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                             <DialogHeader>
                                <DialogTitle>Yanlış Cevapların</DialogTitle>
                             </DialogHeader>
                             <ScrollArea className="h-[60vh] -mx-6">
                                <div className="px-6 space-y-4">
                                {incorrectQuestions.length > 0 ? (
                                    incorrectQuestions.map((item, index) => (
                                        item.question && <ResultCard key={index} question={item.question} studentAnswer={item.studentAnswer} index={questions.findIndex(q => q.id === item.question.id)} />
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">Hiç yanlış cevabın yok, tebrikler!</p>
                                )}
                                </div>
                             </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-500">Toplam Soru</p>
                        <p className="text-2xl font-bold text-gray-700">{questions.length}</p>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Tüm Cevapların</h3>
                {questions.length > 0 ? (
                    questions.map((q, index) => (
                        <ResultCard key={q.id || index} question={q} studentAnswer={studentAnswers[index]} index={index} />
                    ))
                ) : (
                    <p className="text-muted-foreground">Analiz edilecek soru bulunamadı.</p>
                )}
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ExamResultsPage />
        </Suspense>
    );
}
