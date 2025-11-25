
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getExamResultDetails } from './actions';
import type { ExamResultDetails, Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, BookCopy, BarChart3, Clock, Play, Award, CalendarIcon, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

function ResultCard({ question, studentAnswer, index }: { question: Question, studentAnswer: string | boolean | null, index: number }) {
    let isCorrect = false;
    let correctAnswerText = '';

    if (question.type === 'Doğru/Yanlış') {
        const correctAnswerBool = question.isTrue ?? question.correctAnswer === 'Doğru';
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
        <div className="p-4 border-b">
            <p className="font-semibold mb-2">{index + 1}. {question.text}</p>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className={`flex-1 p-2 rounded-md ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className="text-xs font-bold">SENİN CEVABIN</p>
                    <p>{getAnswerText(studentAnswer)}</p>
                </div>
                {!isCorrect && (
                    <div className="flex-1 p-2 rounded-md bg-green-100">
                        <p className="text-xs font-bold text-green-800">DOĞRU CEVAP</p>
                        <p>{correctAnswerText}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function WrongAnswersDialog({
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
    const wrongQuestions = questions.map((q, i) => {
        let isCorrect = false;
        const studentAnswer = studentAnswers[i];
        if (q.type === 'Doğru/Yanlış') {
            const correctAnswerBool = q.isTrue ?? q.correctAnswer === 'Doğru';
            isCorrect = studentAnswer === correctAnswerBool;
        } else {
            isCorrect = studentAnswer === q.correctAnswer;
        }
        return { q, studentAnswer, isCorrect };
    }).filter(item => !item.isCorrect);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Yanlış Cevaplar ve Doğruları</DialogTitle>
                    <DialogDescription>
                        Yanlış cevapladığın veya boş bıraktığın soruların doğrularını buradan inceleyebilirsin.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full pr-6">
                        <div className="space-y-4">
                            {wrongQuestions.length > 0 ? (
                                wrongQuestions.map(({ q, studentAnswer }, index) => (
                                    <ResultCard key={q.id} question={q} studentAnswer={studentAnswer} index={questions.indexOf(q)} />
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-10">Tebrikler, hiç yanlışın yok!</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}


function ExamResultsPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();

    const assignmentId = params.assignmentId as string;
    
    const [details, setDetails] = useState<ExamResultDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isWrongAnswersOpen, setIsWrongAnswersOpen] = useState(false);
    
    useEffect(() => {
        if (!user || !assignmentId) return;

        const fetchResults = async () => {
            setIsLoading(true);
            const result = await getExamResultDetails(assignmentId, user.uid);
            if (result.success && result.data) {
                setDetails(result.data);
            } else {
                setError(result.error || "Sonuçlar getirilemedi.");
            }
            setIsLoading(false);
        };
        
        fetchResults();
    }, [assignmentId, user]);
    
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
    const totalQuestions = questions.length;
    let correctCount = 0;

    questions.forEach((question, index) => {
        const studentAnswer = studentAnswers[index];
        let isCorrect = false;
        if (question.type === 'Doğru/Yanlış') {
            const correctAnswerBool = question.isTrue ?? question.correctAnswer === 'Doğru';
            isCorrect = studentAnswer === correctAnswerBool;
        } else {
            isCorrect = studentAnswer === question.correctAnswer;
        }
        if (isCorrect) {
            correctCount++;
        }
    });

    const incorrectCount = totalQuestions - correctCount;
    const score = (correctCount / totalQuestions) * 100;

     let message = "";
    let color = "";
    
    if (score >= 90) { message = "Mükemmel!"; color = "text-green-600"; }
    else if (score >= 70) { message = "Tebrikler!"; color = "text-blue-600"; }
    else if (score >= 50) { message = "Güzel, Ama Daha İyi Olabilir."; color = "text-yellow-600"; }
    else { message = "Biraz Daha Çalışmalısın."; color = "text-red-600"; }
    
    return (
        <>
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 text-center">
                    <div className="mb-6 relative inline-block">
                        <Award size={80} className={`mx-auto ${score >= 50 ? 'text-yellow-500' : 'text-gray-400'}`} />
                        {score >= 90 && <div className="absolute -top-2 -right-2 text-4xl animate-bounce">🌟</div>}
                    </div>

                    <h2 className={`text-3xl font-black mb-2 ${color}`}>{message}</h2>
                    <p className="text-gray-500 mb-8">Sınav Sonucun</p>

                    <div className="mb-8 flex justify-center">
                        <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-8 border-slate-100">
                            <div className="text-center">
                                <div className="text-4xl font-black text-slate-800">{Math.round(score)}</div>
                                <div className="text-xs font-bold text-gray-400">PUAN</div>
                            </div>
                             <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                                <circle 
                                    cx="50" cy="50" r="46" fill="none" stroke={score >= 50 ? "#4f46e5" : "#ef4444"} strokeWidth="8" 
                                    strokeDasharray="289" 
                                    strokeDashoffset={289 - (289 * score) / 100} 
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <div className="text-green-600 font-bold text-xl">{correctCount}</div>
                            <div className="text-xs text-green-800 font-bold uppercase">Doğru</div>
                        </div>
                         <div className="p-4 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100" onClick={() => setIsWrongAnswersOpen(true)}>
                            <div className="text-red-600 font-bold text-xl">{incorrectCount}</div>
                            <div className="text-xs text-red-800 font-bold uppercase">Yanlış</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="text-gray-600 font-bold text-xl">{totalQuestions}</div>
                            <div className="text-xs text-gray-800 font-bold uppercase">Toplam Soru</div>
                        </div>
                    </div>
                    
                    <Button asChild className="w-full">
                        <Link href="/student/deneme">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Deneme Sınavlarına Dön
                        </Link>
                    </Button>
                </div>
            </div>
            <WrongAnswersDialog
                isOpen={isWrongAnswersOpen}
                onOpenChange={setIsWrongAnswersOpen}
                questions={questions}
                studentAnswers={studentAnswers}
            />
        </>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <ExamResultsPage />
        </Suspense>
    );
}

```