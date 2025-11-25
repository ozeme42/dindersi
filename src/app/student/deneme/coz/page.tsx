
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDenemeQuestionsAction, submitDenemeScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

function ExamScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);

    const assignmentId = searchParams.get('assignmentId');

    useEffect(() => {
        const fetchQuest = async () => {
            setIsLoading(true);
            setError(null);
            
            const questionIdsParam = searchParams.get('questionIds');
            if (!questionIdsParam) {
                setError("Sınav soruları bulunamadı.");
                setIsLoading(false);
                return;
            }

            const questionIds = questionIdsParam.split(',');
            const result = await getDenemeQuestionsAction({ questionIds });

            if (result.error || result.questions.length === 0) {
                setError(result.error || "Bu deneme için soru bulunamadı.");
            } else {
                setQuestions(result.questions);
                setUserAnswers(Array(result.questions.length).fill(null));
            }
            setIsLoading(false);
        };
        fetchQuest();
    }, [searchParams]);

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

    const finishExam = async () => {
        if (!user || !assignmentId) {
             toast({ title: 'Hata', description: 'Oturum bilgileri eksik, sonuçlar kaydedilemedi.', variant: 'destructive'});
             router.push(`/student/deneme/sonuc/${assignmentId}`);
             return;
        }

        let correctCount = 0;
        const studentAnswersForDb = userAnswers.map((ansIndex, idx) => {
            const question = questions[idx];
            if (ansIndex === null) return null;
            const selectedOption = question.options?.[ansIndex];
            if (selectedOption === question.correctAnswer) {
                correctCount++;
            }
            return selectedOption;
        });

        const score = correctCount * 10;
        const context = `Deneme ID: ${assignmentId}`;
        const result = await submitDenemeScoreAction(user.uid, score, context, studentAnswersForDb);

        if (result.success) {
            toast({ title: 'Sınav Tamamlandı!', description: 'Sonuçların başarıyla kaydedildi.'});
        } else {
             toast({ title: 'Kayıt Hatası', description: 'Sonuçlar kaydedilirken bir hata oluştu: ' + result.error, variant: 'destructive' });
        }
        
        router.push(`/student/deneme/sonuc/${assignmentId}`);
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Sınav Yükleniyor...</span></div>;
    }
    
    if (error) {
        return <div>Hata: {error}</div>
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
                                    className={`
                                        w-full text-left p-5 rounded-xl border-2 transition-all flex items-center gap-4 group
                                        ${isSelected 
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-inner' 
                                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-colors
                                        ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-400 group-hover:border-indigo-400 group-hover:text-indigo-500'}
                                    `}>
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
                            onClick={finishExam}
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
