
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAssignmentDetails } from "@/app/teacher/assignments/[assignmentId]/actions";
import type { ExamResultDetails, Question, ScoreEvent } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, BookCopy, BarChart3, Clock, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

function IncorrectAnswersDialog({ 
    isOpen, 
    onOpenChange, 
    questions, 
    studentAnswers 
}: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void; 
    questions: Question[]; 
    studentAnswers: (string | boolean | null)[]; 
}) {
    const incorrectQuestions = questions.map((q, index) => {
        const studentAnswer = studentAnswers[index];
        let isCorrect = false;
        if (q.type === 'Doğru/Yanlış') {
            const correctAnswerBool = q.isTrue ?? (q.correctAnswer === 'Doğru');
            isCorrect = studentAnswer === correctAnswerBool;
        } else {
            isCorrect = studentAnswer === q.correctAnswer;
        }
        return { question: q, studentAnswer, isCorrect, originalIndex: index };
    }).filter(item => !item.isCorrect);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Yanlış Cevaplar</DialogTitle>
                    <DialogDescription>
                        Yanlış cevapladığın soruları ve doğru cevaplarını aşağıda görebilirsin.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow pr-6">
                    <div className="space-y-4">
                        {incorrectQuestions.length > 0 ? incorrectQuestions.map(({ question, studentAnswer, originalIndex }) => (
                            <ResultCard key={originalIndex} question={question} studentAnswer={studentAnswer} index={originalIndex} />
                        )) : (
                            <p className="text-center text-muted-foreground py-8">Tebrikler, hiç yanlışın yok!</p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}


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
        if (answer === null || answer === undefined) return 'Boş';
        if (typeof answer === 'boolean') {
            return answer ? 'Doğru' : 'Yanlış';
        }
        return answer;
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
    const { toast } = useToast();

    const assignmentId = params.assignmentId as string;
    
    const [details, setDetails] = useState<ExamResultDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isIncorrectAnswersOpen, setIsIncorrectAnswersOpen] = useState(false);


    const fetchResults = useCallback(async () => {
        if (!user || !assignmentId) return;

        setIsLoading(true);
        const result = await getAssignmentDetails(assignmentId, user.uid);
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

    const incorrectCount = questions.length - correctCount;
    
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
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-blue-600">{scoreEvent.points}</span>
                        <span className="text-sm text-muted-foreground mt-1">Puan</span>
                    </div>
                     <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-green-600">{correctCount}</span>
                        <span className="text-sm text-muted-foreground mt-1">Doğru</span>
                    </div>
                     <div className="p-4 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100" onClick={() => setIsIncorrectAnswersOpen(true)}>
                        <span className="text-3xl font-bold text-red-600">{incorrectCount}</span>
                        <span className="text-sm text-muted-foreground mt-1">Yanlış</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{questions.length}</span>
                        <span className="text-sm text-muted-foreground mt-1">Toplam Soru</span>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Tüm Sorular ve Cevapların</h2>
                {questions.map((q, index) => (
                    <ResultCard key={q.id || index} question={q} studentAnswer={studentAnswers[index]} index={index} />
                ))}
            </div>

             <IncorrectAnswersDialog
                isOpen={isIncorrectAnswersOpen}
                onOpenChange={setIsIncorrectAnswersOpen}
                questions={questions}
                studentAnswers={studentAnswers}
            />
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
