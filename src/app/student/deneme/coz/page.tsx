
'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDenemeQuestionsAction, submitDenemeScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

function DenemeGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | boolean | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [screen, setScreen] = useState('exam');

    const fetchQuest = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        const assignmentId = searchParams.get('assignmentId');
        const questionIdsParam = searchParams.get('questionIds');
        const questionIds = questionIdsParam ? questionIdsParam.split(',') : [];

        if (!assignmentId || questionIds.length === 0) {
             setError("Bu deneme için soru veya ödev bilgisi bulunamadı.");
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

    const handleOptionSelect = (optionIndex: string | boolean) => {
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
        if (isSubmitting) return;
        if (!user) {
            toast({ title: "Hata", description: "Skor kaydedilemedi, kullanıcı girişi yapılmamış.", variant: "destructive"});
            return;
        }

        let correctCount = 0;
        userAnswers.forEach((answer, index) => {
            const question = questions[index];
            if (!question || answer === null) return;
            
            let isCorrect = false;
            if (question.type === 'Doğru/Yanlış') {
                const correctAnswerBool = question.isTrue ?? (question.correctAnswer === 'Doğru');
                isCorrect = answer === correctAnswerBool;
            } else {
                isCorrect = answer === question.correctAnswer;
            }

            if (isCorrect) {
                correctCount++;
            }
        });
        const finalScore = correctCount * 10;

        setIsSubmitting(true);
        const assignmentId = searchParams.get('assignmentId');
        if (!assignmentId) {
            toast({ title: "Hata", description: "Ödev kimliği bulunamadı, skor kaydedilemedi.", variant: "destructive"});
            setIsSubmitting(false);
            return;
        }

        const context = `Deneme ID: ${assignmentId}`;
        const result = await submitDenemeScoreAction(user.uid, finalScore, context, userAnswers);

        if (result.success) {
            toast({ title: "Başarılı!", description: "Denemen kaydedildi. Sonuçlar sayfasına yönlendiriliyorsun." });
            router.push(`/student/deneme/sonuc/${assignmentId}`);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Deneme Sınavı Yükleniyor...</span></div>;
    }
    
    if (error) {
        // Handle error display
        return <div className="text-center p-8 text-red-500">{error}</div>;
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
                        {question?.text}
                    </h2>
                </div>

                <div className="p-8 md:p-12 flex-1 bg-white">
                    <div className="grid gap-4">
                        {(question.type === 'Doğru/Yanlış' ? ["Doğru", "Yanlış"] : question?.options)?.map((opt, idx) => {
                            const answerValue = question.type === 'Doğru/Yanlış' ? opt === 'Doğru' : opt;
                            const isSelected = userAnswers[currentQIndex] === answerValue;
                            return (
                                <Button
                                    key={idx}
                                    onClick={() => handleOptionSelect(answerValue)}
                                    variant={isSelected ? "default" : "outline"}
                                    className={`
                                        w-full text-left p-5 rounded-xl border-2 transition-all flex items-center gap-4 group
                                        h-auto text-lg whitespace-normal justify-start
                                        ${isSelected 
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-inner' 
                                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'}
                                    `}
                                >
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-colors flex-shrink-0
                                        ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-400 group-hover:border-indigo-400 group-hover:text-indigo-500'}
                                    `}>
                                        {['A', 'B', 'C', 'D'][idx]}
                                    </div>
                                    <span className="font-medium">{opt}</span>
                                </Button>
                            );
                        })}
                    </div>
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                    <Button 
                        onClick={prevQuestion}
                        disabled={currentQIndex === 0}
                        variant="ghost"
                        className={`px-6 py-3 rounded-lg font-bold text-gray-600 transition-colors ${currentQIndex === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-gray-200'}`}
                    >
                        Önceki Soru
                    </Button>
                    {isLastQuestion ? (
                        <Button 
                            onClick={finishExam}
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-green-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <>SINAVI BİTİR <CheckCircle size={20}/></>}
                        </Button>
                    ) : (
                        <Button 
                            onClick={nextQuestion}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
                        >
                            Sonraki Soru <ArrowRight size={20}/>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DenemeCozPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <DenemeGame />
        </Suspense>
    )
}
