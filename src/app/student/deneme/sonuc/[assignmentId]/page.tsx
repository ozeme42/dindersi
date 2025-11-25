
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getExamResultDetails } from './actions';
import type { ExamResultDetails, Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, BookCopy, BarChart3, Clock, Star, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAssignmentDetails } from '@/app/teacher/assignments/[assignmentId]/actions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


function ResultCard({ question, studentAnswer, index }: { question: Question, studentAnswer: string | boolean | null, index: number }) {
    let isCorrect = false;
    // Handle different question types
    if (question.type === 'Doğru/Yanlış') {
        const correctAnswerBool = question.isTrue ?? (question.correctAnswer === 'Doğru');
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

    const getCorrectAnswerText = () => {
        if (question.type === 'Doğru/Yanlış') {
            const correctAnswerBool = question.isTrue ?? (question.correctAnswer === 'Doğru');
            return correctAnswerBool ? 'Doğru' : 'Yanlış';
        }
        return question.correctAnswer;
    }

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
                        <p className="font-medium mt-1">{getCorrectAnswerText()}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function WrongAnswersDialog({ isOpen, onOpenChange, questions, studentAnswers }: { isOpen: boolean, onOpenChange: (open: boolean) => void, questions: Question[], studentAnswers: (string | boolean | null)[] }) {
    
    const wrongAnswers = questions.map((q, i) => ({ question: q, studentAnswer: studentAnswers[i] })).filter((item, index) => {
        const studentAnswer = studentAnswers[index];
        let isCorrect = false;
        if (item.question.type === 'Doğru/Yanlış') {
            isCorrect = studentAnswer === (item.question.isTrue ?? item.question.correctAnswer === 'Doğru');
        } else {
            isCorrect = studentAnswer === item.question.correctAnswer;
        }
        return !isCorrect;
    });

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Yanlış Cevaplar</DialogTitle>
                    <DialogDescription>
                        Yanlış yaptığın soruları ve doğru cevaplarını aşağıda görebilirsin.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow pr-6">
                     <div className="space-y-4">
                        {wrongAnswers.length > 0 ? wrongAnswers.map(({question, studentAnswer}, index) => (
                             <ResultCard 
                                key={question.id || index}
                                question={question} 
                                studentAnswer={studentAnswer} 
                                index={questions.findIndex(q => q.id === question.id)}
                            />
                        )) : (
                            <p className="text-center text-muted-foreground py-8">Hiç yanlış cevabın yok, tebrikler!</p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
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
    const [isWrongAnswersOpen, setIsWrongAnswersOpen] = useState(false);

    const fetchResults = useCallback(async () => {
        if (!user || !assignmentId) return;

        setIsLoading(true);
        const result = await getExamResultDetails(assignmentId, user.uid);
        if (result.success && result.data) {
             const questionIds = result.data.assignment.questionIds || [];
                const questionDocs = await Promise.all(
                    questionIds.map(id => getDoc(doc(db, 'examQuestions', id)))
                );
                 const questions = questionDocs
                    .map(docSnap => docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Question) : null)
                    .filter((q): q is Question => q !== null);
            
            setDetails({
                ...result.data,
                questions: questions,
            });

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
    const correctCount = questions?.reduce((count, question, index) => {
        const studentAnswer = studentAnswers[index];
        let isCorrect = false;
        if (question.type === 'Doğru/Yanlış') {
            isCorrect = studentAnswer === (question.isTrue ?? question.correctAnswer === 'Doğru');
        } else {
            isCorrect = studentAnswer === question.correctAnswer;
        }
        return count + (isCorrect ? 1 : 0);
    }, 0) || 0;
    
    const incorrectCount = (questions?.length || 0) - correctCount;

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
                     <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <CheckCircle2 className="h-6 w-6 text-green-600 mb-1"/>
                        <p className="text-sm text-green-600">Doğru</p>
                        <p className="text-2xl font-bold text-green-700">{correctCount}</p>
                    </div>
                     <div className="p-4 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100" onClick={() => setIsWrongAnswersOpen(true)}>
                        <XCircle className="h-6 w-6 text-red-600 mb-1"/>
                        <p className="text-sm text-red-600">Yanlış</p>
                        <p className="text-2xl font-bold text-red-700">{incorrectCount}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <BookCopy className="h-6 w-6 text-gray-600 mb-1"/>
                        <p className="text-sm text-gray-500">Toplam Soru</p>
                        <p className="text-2xl font-bold text-gray-700">{questions?.length || 0}</p>
                    </div>
                     <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <Star className="h-6 w-6 text-amber-500 mb-1"/>
                        <p className="text-sm text-amber-500">Puan</p>
                        <p className="text-2xl font-bold text-amber-600">{scoreEvent?.points || 0}</p>
                    </div>
                </CardContent>
            </Card>

            <h2 className="text-2xl font-bold font-headline mb-4">Sorular ve Cevapların</h2>
            <div className="space-y-4">
                {questions.map((q, index) => (
                    <ResultCard key={q.id || index} question={q} studentAnswer={studentAnswers[index]} index={index} />
                ))}
            </div>
             <WrongAnswersDialog 
                isOpen={isWrongAnswersOpen} 
                onOpenChange={setIsWrongAnswersOpen} 
                questions={questions} 
                studentAnswers={studentAnswers} 
            />
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ExamResultsPage />
        </Suspense>
    );
}
