
'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDenemeQuestionsAction, submitDenemeScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, Home, Bug, Timer, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { ErrorReportDialog } from '@/components/error-report-dialog';

function ExamScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | number | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    
    const duration = parseInt(searchParams.get('duration') || '0') * 60; // in seconds
    const [timeLeft, setTimeLeft] = useState(duration);
    const timerRef = useRef<NodeJS.Timeout>();

    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [questionToReport, setQuestionToReport] = useState<Question | null>(null);

    const handleReportQuestion = (question: Question) => {
        setQuestionToReport(question);
        setIsReportDialogOpen(true);
    };

    const fetchQuest = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        const questionIdsParam = searchParams.get('questionIds');
        const questionIds = questionIdsParam ? questionIdsParam.split(',') : [];

        if (questionIds.length === 0) {
             setError("Bu deneme için soru bulunamadı.");
             setIsLoading(false);
             return;
        }

        try {
            const result = await getDenemeQuestionsAction({ questionIds });
            if (result.error || result.questions.length === 0) {
                setError(result.error || "Bu konu için soru bulunamadı.");
            } else {
                setQuestions(result.questions);
                setUserAnswers(new Array(result.questions.length).fill(null));
            }
        } catch(e) {
            setError("Veri alınırken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchQuest();
    }, [fetchQuest]);

    const finishAndSubmit = useCallback(async () => {
        if (!user) return;
        setIsFinished(true); // Mark as finished to stop timers and UI updates
        
        // This will now redirect to the results page where submission will happen.
        const assignmentId = searchParams.get('assignmentId');
        if (!assignmentId) {
            toast({ title: "Hata", description: "Ödev kimliği bulunamadı.", variant: "destructive"});
            return;
        }

        // We store the answers in localStorage to pass them to the result page.
        // This is a workaround for the single-page app structure provided.
        try {
            localStorage.setItem(`exam_answers_${assignmentId}`, JSON.stringify(userAnswers));
        } catch (e) {
            console.error("Could not save answers to local storage", e);
        }

        router.push(`/student/deneme/sonuc/${assignmentId}`);
    }, [user, userAnswers, searchParams, router, toast]);

     useEffect(() => {
        if (!isLoading && questions.length > 0 && !isFinished && duration > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        finishAndSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isLoading, questions, isFinished, duration, finishAndSubmit]);
    
    const handleOptionSelect = (optionIndex: number) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQIndex] = optionIndex;
        setUserAnswers(newAnswers);
    };

    const nextQuestion = () => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(prev => prev + 1);
      }
    };

    const prevQuestion = () => {
      if (currentQIndex > 0) {
        setCurrentQIndex(prev => prev - 1);
      }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Deneme Sınavı Yükleniyor...</span></div>;
    }
    
    if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-lg"><AlertTriangle className="h-4 w-4 mr-2" /><AlertTitle>Hata!</AlertTitle><AlertDescription>{error}</AlertDescription><div className="mt-4"><Button asChild variant="outline"><Link href="/student/deneme"><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button></div></Alert>
            </div>
        );
    }
    
    const question = questions[currentQIndex];
    const progress = ((currentQIndex + 1) / questions.length) * 100;
    const isLastQuestion = currentQIndex === questions.length - 1;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8 font-sans">
        <div className="w-full max-w-3xl mb-8">
          <div className="flex justify-between text-sm font-bold text-gray-500 mb-2">
            <span>Soru {currentQIndex + 1} / {questions.length}</span>
            <span>%{Math.round(progress)}</span>
          </div>
          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex-1 flex flex-col">
          <div className="p-8 md:p-12 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed">
              <span className="text-indigo-500 mr-2">{currentQIndex + 1}.</span>
              {question.text}
            </h2>
          </div>

          <div className="p-8 md:p-12 flex-1 bg-white">
            <div className="grid gap-4">
              {question.options?.map((opt, idx) => {
                const isSelected = userAnswers[currentQIndex] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all flex items-center gap-4 group ${isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-inner' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-400 group-hover:border-indigo-400 group-hover:text-indigo-500'}`}>
                      {['A', 'B', 'C', 'D'][idx]}
                    </div>
                    <span className="font-medium text-lg">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <button 
              onClick={prevQuestion}
              disabled={currentQIndex === 0}
              className={`px-6 py-3 rounded-lg font-bold text-gray-600 transition-colors ${currentQIndex === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-gray-200'}`}
            >
              Önceki Soru
            </button>

            {isLastQuestion ? (
              <button 
                onClick={finishAndSubmit}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-green-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
              >
                SINAVI BİTİR <CheckCircle size={20}/>
              </button>
            ) : (
              <button 
                onClick={nextQuestion}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
              >
                Sonraki Soru <ArrowRight size={20}/>
              </button>
            )}
          </div>
        </div>
        <ErrorReportDialog 
            isOpen={isReportDialogOpen} 
            onOpenChange={setIsReportDialogOpen} 
            itemToReport={questionToReport} 
        />
      </div>
    );
}

export default function DenemeOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ExamScreen />
        </Suspense>
    )
}
