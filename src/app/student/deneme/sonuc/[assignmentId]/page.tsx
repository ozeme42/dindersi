'use client';

import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStudentExams, getDenemeQuestionsAction } from '../../actions';
import { submitDenemeScoreAction } from '../../actions';
import { getExamResultDetails } from './actions';
import type { ExamResultDetails, Question, Assignment, ScoreEvent } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight, ArrowLeft, ClipboardCheck, PartyPopper, Repeat, CheckCircle2, Home, Bug, Timer, AlertTriangle, Play, XCircle, Award, Calendar, Check, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ErrorReportDialog } from '@/components/error-report-dialog';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

function ResultScreen({ details }: { details: ExamResultDetails }) {
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    
    const { correct, wrong, empty, score } = useMemo(() => {
        let correct = 0;
        let empty = 0;
        
        details.studentAnswers.forEach((ans, idx) => {
            if (ans === null || ans === undefined) {
                empty++;
            } else {
                const question = details.questions[idx];
                if (!question) return;

                let isCorrect = false;
                if (question.type === 'Doğru/Yanlış') {
                    isCorrect = (ans === "Doğru") === (question.isTrue ?? question.correctAnswer === "Doğru");
                } else {
                    isCorrect = ans === question.correctAnswer;
                }
                
                if (isCorrect) correct++;
            }
        });

        const wrong = details.questions.length - correct - empty;
        return { correct, wrong, empty, score: details.scoreEvent.points };
    }, [details]);

    let message = "";
    let color = "";
    const successRate = (correct / details.questions.length) * 100;
    
    if (successRate >= 90) { message = "Mükemmel!"; color = "text-green-600"; }
    else if (successRate >= 70) { message = "Tebrikler!"; color = "text-blue-600"; }
    else if (successRate >= 50) { message = "Güzel, Ama Daha İyi Olabilir."; color = "text-yellow-600"; }
    else { message = "Biraz Daha Çalışmalısın."; color = "text-red-600"; }

    const incorrectQuestions = useMemo(() => {
        return details.questions.map((q, i) => {
            const studentAnswer = details.studentAnswers[i];
            if(studentAnswer === null || studentAnswer === undefined) return null; // Skip empty
            
            let isCorrect = false;
            if (q.type === 'Doğru/Yanlış') {
                isCorrect = (studentAnswer === 'Doğru') === (q.isTrue ?? q.correctAnswer === 'Doğru');
            } else {
                isCorrect = studentAnswer === q.correctAnswer;
            }
            
            if (!isCorrect) {
                return { question: q, studentAnswer };
            }
            return null;
        }).filter(Boolean);
    }, [details]);
    
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 text-center animate-[scaleUp_0.5s_ease-out]">
          
          <div className="mb-6 relative inline-block">
            <Award size={80} className={`mx-auto ${successRate >= 50 ? 'text-yellow-500' : 'text-gray-400'}`} />
            {successRate >= 90 && <div className="absolute -top-2 -right-2 text-4xl animate-bounce">🌟</div>}
          </div>

          <h2 className={`text-3xl font-black mb-2 ${color}`}>{message}</h2>
          <p className="text-gray-500 mb-8">"{details.assignment.title}" Sınav Sonucun</p>

          <div className="mb-8 flex justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-8 border-slate-100">
                <div className="text-center">
                    <div className="text-4xl font-black text-slate-800">{score}</div>
                    <div className="text-xs font-bold text-gray-400">PUAN</div>
                </div>
                <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle 
                        cx="50" cy="50" r="46" fill="none" stroke={successRate >= 50 ? "#4f46e5" : "#ef4444"} strokeWidth="8" 
                        strokeDasharray="289" 
                        strokeDashoffset={289 - (289 * successRate) / 100} 
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="text-green-600 font-bold text-xl">{correct}</div>
                <div className="text-xs text-green-800 font-bold uppercase">Doğru</div>
            </div>
             <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                <DialogTrigger asChild>
                    <button className="p-4 bg-red-50 rounded-xl border border-red-100 w-full h-full text-center hover:bg-red-100 transition-colors">
                        <div className="text-red-600 font-bold text-xl">{wrong}</div>
                        <div className="text-xs text-red-800 font-bold uppercase">Yanlış</div>
                    </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Yanlış Cevapların</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-96 pr-4">
                        <div className="space-y-4">
                            {incorrectQuestions.map(({ question, studentAnswer }, index) => (
                                <div key={question.id} className="p-3 border rounded-md">
                                    <p className="font-semibold">{index + 1}. {question.text}</p>
                                    <p className="text-sm mt-2">Senin Cevabın: <span className="font-bold text-destructive">{studentAnswer}</span></p>
                                    <p className="text-sm">Doğru Cevap: <span className="font-bold text-green-600">{question.correctAnswer}</span></p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-gray-600 font-bold text-xl">{empty}</div>
                <div className="text-xs text-gray-800 font-bold uppercase">Boş</div>
            </div>
          </div>

          <Button asChild className="w-full">
            <Link href="/student/deneme">
              Deneme Listesine Dön
            </Link>
          </Button>
        </div>
        <style>{`
            @keyframes scaleUp { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    );
  };

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

    return <ResultScreen details={details} />;
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ExamResultsPage />
        </Suspense>
    );
}