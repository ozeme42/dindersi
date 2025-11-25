
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getExamResultDetails } from './actions';
import type { ExamResultDetails, Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, BookCopy, Award } from 'lucide-react';
import Link from 'next/link';

function ExamResultsPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();

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
        }
        setIsLoading(false);
    }, [assignmentId, user]);

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
    
    const calculateResults = () => {
        let correct = 0;
        let wrong = 0;
        let empty = 0;

        studentAnswers.forEach((ans, idx) => {
            const question = questions[idx];
            if (!question) return;

            if (ans === null || ans === undefined) {
                empty++;
            } else {
                 let isCorrect = false;
                if (question.type === 'Doğru/Yanlış') {
                    const correctAnswerBool = question.isTrue ?? (question.correctAnswer === 'Doğru');
                    isCorrect = ans === correctAnswerBool;
                } else {
                    isCorrect = ans === question.correctAnswer;
                }

                if (isCorrect) correct++;
                else wrong++;
            }
        });

        const score = (correct * 100) / questions.length;
        return { correct, wrong, empty, score };
    };

    const { correct, wrong, empty, score } = calculateResults();
    
    let message = "";
    let color = "";
    
    if (score >= 90) { message = "Mükemmel!"; color = "text-green-600"; }
    else if (score >= 70) { message = "Tebrikler!"; color = "text-blue-600"; }
    else if (score >= 50) { message = "Güzel, Ama Daha İyi Olabilir."; color = "text-yellow-600"; }
    else { message = "Biraz Daha Çalışmalısın."; color = "text-red-600"; }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 text-center animate-[scaleUp_0.5s_ease-out]">
          
          <div className="mb-6 relative inline-block">
            <Award size={80} className={`mx-auto ${score >= 50 ? 'text-yellow-500' : 'text-gray-400'}`} />
            {score >= 90 && <div className="absolute -top-2 -right-2 text-4xl animate-bounce">🌟</div>}
          </div>

          <h2 className={`text-3xl font-black mb-2 ${color}`}>{message}</h2>
          <p className="text-gray-500 mb-8">Sınav Sonucunuz</p>

          <div className="mb-8 flex justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-8 border-slate-100">
                <div className="text-center">
                    <div className="text-4xl font-black text-slate-800">{score.toFixed(0)}</div>
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
                <div className="text-green-600 font-bold text-xl">{correct}</div>
                <div className="text-xs text-green-800 font-bold uppercase">Doğru</div>
            </div>
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="text-red-600 font-bold text-xl">{wrong}</div>
                <div className="text-xs text-red-800 font-bold uppercase">Yanlış</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-gray-600 font-bold text-xl">{empty}</div>
                <div className="text-xs text-gray-800 font-bold uppercase">Boş</div>
            </div>
          </div>
          
           <Button asChild variant="outline" className="w-full">
               <Link href="/student/deneme">
                   <ArrowLeft className="mr-2 h-4 w-4" /> Deneme Sınavlarıma Dön
               </Link>
           </Button>

        </div>
        <style>{`
            @keyframes scaleUp {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `}</style>
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
