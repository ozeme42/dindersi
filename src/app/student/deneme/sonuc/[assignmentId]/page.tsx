
'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getExamResultDetails, submitDenemeScoreAction } from '../actions';
import type { ExamResultDetails, Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, BookCopy, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';


function ResultScreen() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const assignmentId = params.assignmentId as string;
    
    const [details, setDetails] = useState<ExamResultDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!assignmentId || !user) return;

        const fetchAndSubmit = async () => {
            setIsLoading(true);

            // Retrieve answers from localStorage
            const storedAnswers = localStorage.getItem(`exam_answers_${assignmentId}`);
            if (!storedAnswers) {
                // If no answers are found, it might be a direct navigation. Try to fetch existing results.
                const result = await getExamResultDetails(assignmentId, user.uid);
                 if (result.success && result.data) {
                    setDetails(result.data);
                } else {
                    setError(result.error || "Sınav sonucu bulunamadı veya daha önce çözülmemiş.");
                }
                setIsLoading(false);
                return;
            }
            localStorage.removeItem(`exam_answers_${assignmentId}`);

            const userAnswers = JSON.parse(storedAnswers);

            // Fetch questions to calculate score
            const resultDetails = await getExamResultDetails(assignmentId, user.uid);
            if (resultDetails.error || !resultDetails.data) {
                setError(resultDetails.error || "Sınav detayları alınamadı.");
                setIsLoading(false);
                return;
            }
            
            const fetchedQuestions = resultDetails.data.questions;
            let correctCount = 0;
            userAnswers.forEach((answerIndex: number | null, index: number) => {
                if(answerIndex === null) return;
                const question = fetchedQuestions[index];
                if (!question) return;
                
                const selectedOption = question.options?.[answerIndex];
                if (selectedOption === question.correctAnswer) {
                    correctCount++;
                }
            });

            const finalScore = correctCount * 10;
            
            // Submit the score
            setIsSubmitting(true);
            const context = `Deneme ID: ${assignmentId}`;
            const submitResult = await submitDenemeScoreAction(user.uid, finalScore, context, userAnswers);
            setIsSubmitting(false);

            if (submitResult.success) {
                toast({ title: "Başarılı!", description: "Sınavınız kaydedildi. İşte sonuçlarınız." });
                // Now fetch the final data to display
                const finalResult = await getExamResultDetails(assignmentId, user.uid);
                 if (finalResult.success && finalResult.data) {
                    setDetails(finalResult.data);
                } else {
                     setError(finalResult.error || "Sonuçlar görüntülenemedi.");
                }

            } else {
                setError(submitResult.error || 'Skor kaydedilirken bir hata oluştu.');
            }

            setIsLoading(false);
        };
        
        fetchAndSubmit();

    }, [assignmentId, user, toast]);
    
    if (isLoading || isSubmitting) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> {isSubmitting ? 'Sonuçlar kaydediliyor...' : 'Sonuçlar yükleniyor...'}</div>;
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
    
    const { questions, studentAnswers, scoreEvent } = details;
    const correct = scoreEvent.points ? scoreEvent.points / 10 : 0;
    const wrong = questions.length - correct - (studentAnswers.filter(a => a === null).length);
    const empty = studentAnswers.filter(a => a === null).length;
    const score = (correct * 100) / questions.length;
    
    let message = "";
    let color = "";
    
    if (score >= 90) { message = "Mükemmel!"; color = "text-green-600"; }
    else if (score >= 70) { message = "Tebrikler!"; color = "text-blue-600"; }
    else if (score >= 50) { message = "Güzel, Ama Daha İyi Olabilir."; color = "text-yellow-600"; }
    else { message = "Biraz Daha Çalışmalısın."; color = "text-red-600"; }


    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <style>{`
            @keyframes scaleUp { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
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
          
           <Button asChild className="w-full">
            <Link href="/student/deneme">
                <ArrowLeft className="mr-2 h-4 w-4" /> Ana Ekrana Dön
            </Link>
          </Button>

        </div>
      </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <ResultScreen />
        </Suspense>
    );
}
