'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import { submitSoruBankasiScore, updateTopicTestProgress } from '@/app/student/soru-bankasi/actions'; 
import type { Question, GetQuizInput } from '@/lib/types'; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, BrainCircuit, PartyPopper, Repeat, Home, FastForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { addQuestionToReviewList } from '@/app/student/tekrar-et/actions';
import { useAuth } from '@/context/auth-context';

function QuizGame() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const courseId = searchParams.get('courseId');
    const topicId = searchParams.get('topicId');
    const difficulty = searchParams.get('difficulty')?.split(',');
    const testIndex = parseInt(searchParams.get('testIndex') || '0');

    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | boolean | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [correctQuestionIds, setCorrectQuestionIds] = useState<string[]>([]);

    const fetchQuestions = useCallback(async () => {
        if (authLoading) return;
        if (!topicId || !difficulty) {
            setError("Geçersiz test parametreleri.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        setQuestions([]);
        const params: GetQuizInput = {
            courseId: courseId || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: topicId || undefined,
            questionCount: parseInt(searchParams.get('questionCount') || '10'),
            difficulty: difficulty,
            questionTypes: searchParams.get('questionTypes')?.split(','),
            excludeSolvedByUserId: user?.uid,
            isStatic: true,
        };
        const result = await getQuestionsFromBank(params as any);
        if (result.error) {
            setError(result.error);
        } else {
            setQuestions(result.questions as Question[]);
        }
        setIsLoading(false);
    }, [searchParams, difficulty, topicId, courseId, user, authLoading]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);
    
    const handleAnswer = (answer: string | boolean) => {
        if (answers[currentQuestionIndex] !== undefined && answers[currentQuestionIndex] !== null) return;

        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answer;
        setAnswers(newAnswers);

        const question = questions[currentQuestionIndex];
        const isCorrect = answer === question.correctAnswer || (question.type === 'Doğru/Yanlış' && (answer ? "Doğru" : "Yanlış") === question.correctAnswer);

        if(isCorrect) {
            playSound('correct');
            setScore(s => s + 10);
            setCorrectCount(c => c + 1);
            if (question.id) {
                setCorrectQuestionIds(prev => [...prev, question.id]);
            }
        } else {
            playSound('incorrect');
            if (user?.role === 'student' && question) {
                addQuestionToReviewList(user.uid, question as Question);
            }
        }
    };
    
    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setIsFinished(true);
        }
    }
    
    const getBackLink = () => {
        return courseId ? `/student/soru-bankasi/${courseId}` : '/student/soru-bankasi';
    };

    // İlerleme ve Puanı Kaydeden Ortak Fonksiyon
    const saveProgressAndScore = async () => {
        if (!user) return false;
        
        try {
            // 1. İlerleme Çubukları İçin Kayıt
            if (courseId && topicId && difficulty) {
                const diffString = difficulty[0]?.toLowerCase() || '';
                let difficultyKey: 'easy' | 'medium' | 'hard' = 'easy';
                if (diffString === 'orta') difficultyKey = 'medium';
                if (diffString === 'zor') difficultyKey = 'hard';

                const isPassed = (correctCount / questions.length) >= 0.5;

                await updateTopicTestProgress(
                    user.uid,
                    courseId,
                    topicId,
                    difficultyKey,
                    testIndex,
                    {
                        score: score,
                        status: isPassed ? 'passed' : 'failed',
                        correctAnswers: correctCount,
                        totalQuestions: questions.length,
                        date: new Date().toISOString()
                    } as any,
                    correctQuestionIds
                );
            }

            // 2. Profile Puan Ekleme
            if (score > 0) {
                const contextName = `${searchParams.get('courseName') || courseId} - ${searchParams.get('topicName') || topicId}`;
                await submitSoruBankasiScore(user.uid, score, contextName);
            }
            return true;
        } catch (err) {
            console.error("Kayıt işlemi sırasında hata:", err);
            return false;
        }
    };

    // 1. BUTON: KAYDET VE LİSTEYE DÖN
    const handleSaveAndExit = async () => {
        // user.role === 'student' ŞARTINI KALDIRDIM. ARTIK HERKES TEST EDEBİLİR.
        if (!user || isSubmitting) return; 

        setIsSubmitting(true);
        const success = await saveProgressAndScore();
        
        if (success) {
            toast({ title: "Tebrikler!", description: `Sonuçlar kaydedildi. ${score} puan kazandın.` });
        } else {
            toast({ title: "Hata", description: "İşlem sırasında bir hata oluştu.", variant: "destructive" });
        }

        setIsSubmitting(false);
        router.push(getBackLink());
    };

    // 2. YENİ BUTON: KAYDET VE SONRAKİ TESTE GEÇ
    const handleSaveAndContinue = async () => {
        if (!user || isSubmitting) return;

        setIsSubmitting(true);
        const success = await saveProgressAndScore();
        
        if (success) {
            toast({ title: "Kaydedildi!", description: `${score} puan eklendi. Sıradaki teste geçiliyor...` });
            
            // Sonraki teste geçmek için URL parametrelerini güncelle
            const nextIndex = testIndex + 1;
            const currentParams = new URLSearchParams(searchParams.toString());
            currentParams.set('testIndex', nextIndex.toString());
            
            // Ekranı sıfırla
            setIsFinished(false);
            setCurrentQuestionIndex(0);
            setScore(0);
            setCorrectCount(0);
            setCorrectQuestionIds([]);
            setAnswers([]);
            
            // Yeni test verilerini çekmek için URL'i değiştir
            router.push(`?${currentParams.toString()}`);
        } else {
            toast({ title: "Hata", description: "Veriler kaydedilemedi.", variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleRestart = () => {
        setIsFinished(false);
        setCurrentQuestionIndex(0);
        setScore(0);
        setCorrectCount(0);
        setCorrectQuestionIds([]);
        setAnswers([]);
        fetchQuestions();
    };

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center bg-[#09071a] text-white"><Loader2 className="h-10 w-10 animate-spin text-cyan-500" /> <span className="ml-4 font-bold text-xl">Test Yükleniyor...</span></div>;
    }
    
    if (error) {
        return (
            <div className="w-full h-full min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#09071a]">
                <div className="max-w-lg w-full bg-rose-950 border-2 border-rose-500/50 rounded-3xl p-6 md:p-8 text-center shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                    <h2 className="text-2xl font-black text-white mb-2">Hata!</h2>
                    <p className="text-rose-200 mb-6 font-medium">{error}</p>
                    <Link href={getBackLink()} className="inline-flex items-center justify-center w-full px-6 py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl transition-all active:scale-95">
                        <ArrowLeft className="mr-2 h-5 w-5"/> Geri Dön
                    </Link>
                </div>
            </div>
        );
    }
    
    if (questions.length === 0) {
        return (
             <div className="w-full h-full min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#09071a]">
                <div className="max-w-lg w-full bg-[#161233] border-2 border-[#2b245e] rounded-3xl p-6 md:p-8 text-center shadow-xl">
                    <h2 className="text-2xl font-black text-white mb-2">Test Bulunamadı</h2>
                    <p className="text-slate-300 mb-6 font-medium">Sıradaki test için yeterli soru bulunmuyor veya testi bitirdin.</p>
                    <Link href={getBackLink()} className="inline-flex items-center justify-center w-full px-6 py-4 bg-[#2b245e] hover:bg-[#393075] text-white font-bold rounded-2xl transition-all active:scale-95">
                        <ArrowLeft className="mr-2 h-5 w-5"/> Listeye Dön
                    </Link>
                </div>
            </div>
        )
    }

    if(isFinished) {
        return (
             <div className="w-full h-full min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#09071a]">
                <div className="w-full max-w-md bg-[#161233] border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-6 md:p-8 text-center overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />
                    <div className="mx-auto bg-[#070514] border-2 border-emerald-500/30 rounded-full p-4 w-fit shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-6 mt-2">
                        <PartyPopper className="h-10 w-10 md:h-12 md:w-12 text-emerald-400"/>
                    </div>
                    <h2 className="font-black text-3xl md:text-4xl mt-4 text-white drop-shadow-md">Alıştırma Bitti!</h2>
                    
                    <div className="my-8 space-y-4 md:space-y-6 bg-[#070514] border-2 border-[#2b245e] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] rounded-3xl p-6">
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-sm">Sonucun</p>
                        <p className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{correctCount} <span className="text-2xl text-slate-500">/ {questions.length}</span></p>
                        
                        <div className="h-px bg-white/10 w-full" />
                        
                        <p className="text-base md:text-lg text-slate-300 font-medium">Kazandığın Puan: <span className="font-black text-emerald-400 text-xl ml-2">+{score}</span></p>
                    </div>

                    <div className="flex flex-col gap-3 mt-8">
                        <button onClick={handleSaveAndContinue} disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-[0_4px_20px_rgba(79,70,229,0.4)] transition-all active:scale-95 disabled:opacity-50">
                             {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin"/> : <FastForward className="h-5 w-5"/>}
                             {isSubmitting ? "KAYDEDİLİYOR..." : "KAYDET VE DEVAM ET"}
                        </button>

                        <div className="flex gap-3 w-full">
                            <button onClick={handleRestart} className="flex-1 flex items-center justify-center gap-2 bg-[#1a1638] hover:bg-[#201b45] border border-[#2b245e] text-slate-200 font-bold py-3.5 rounded-2xl transition-all active:scale-95">
                            <Repeat className="h-4 w-4" /> TEKRAR
                            </button>
                            <button onClick={handleSaveAndExit} disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 bg-[#1a1638] hover:bg-rose-950/40 border border-[#2b245e] hover:border-rose-500/50 text-slate-200 font-bold py-3.5 rounded-2xl transition-all active:scale-95 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Home className="h-4 w-4"/>}
                                ÇIK
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestionIndex];

    return (
        <div className="w-full h-full min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 pb-24 md:pb-8 bg-[#09071a]">
            <div className="w-full max-w-3xl flex flex-col gap-4">
                
                {/* Header Area */}
                <div className="flex justify-between items-center px-2">
                    <h2 className="flex items-center gap-3 font-black text-2xl md:text-3xl text-white drop-shadow-md tracking-wide">
                        <BrainCircuit className="text-cyan-400 h-8 w-8 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]"/> 
                        Test Çöz
                    </h2>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center">
                         <span className="text-sm font-bold text-emerald-300">Puan: <span className="text-white ml-1">{score}</span></span>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-[#161233] p-4 rounded-3xl border border-white/10 shadow-lg">
                    <span className="text-sm font-bold text-slate-300 whitespace-nowrap">Soru {currentQuestionIndex + 1} / {questions.length}</span>
                    <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full h-3 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-blue-500" />
                </div>

                {/* Soru Kartı */}
                <div className="w-full bg-[#161233] rounded-[2rem] p-4 md:p-8 border border-white/10 shadow-xl flex flex-col gap-6 md:gap-8">
                    {/* Soru Metni */}
                    <div className="bg-[#070514] border-2 border-[#2b245e] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] p-5 md:p-8 rounded-[1.5rem]">
                        <p className="text-lg md:text-2xl font-bold text-white leading-relaxed">{currentQuestion.text}</p>
                    </div>

                    {/* Şıklar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {currentQuestion.type === 'Çoktan Seçmeli' && (currentQuestion.options || []).map((option, i) => {
                        const isSelected = currentAnswer === option;
                        const isCorrect = currentQuestion.correctAnswer === option;
                        const isAnswered = !!currentAnswer;

                        let btnClass = "border-[#2b245e] bg-[#1a1638] text-slate-200 hover:bg-[#201b45] hover:border-indigo-500/50";
                        if (isAnswered) {
                            if (isCorrect) btnClass = "bg-emerald-950 border-emerald-500 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)]";
                            else if (isSelected) btnClass = "bg-rose-950 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)]";
                            else btnClass = "border-white/5 bg-white/5 text-slate-500 opacity-50";
                        }

                        return (
                            <button 
                                key={option} 
                                className={cn("h-auto min-h-[4rem] px-4 py-4 md:px-5 text-left font-bold rounded-2xl border-2 transition-all duration-300", 
                                    isAnswered ? "cursor-default" : "cursor-pointer active:scale-95",
                                    btnClass
                                )} 
                                onClick={() => handleAnswer(option)} 
                                disabled={isAnswered}
                            >
                                <div className="flex gap-4 items-center">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-sm border border-white/10 shadow-sm">{String.fromCharCode(65 + i)}</span>
                                    <span className="text-base md:text-lg">{option}</span>
                                </div>
                            </button>
                        );
                    })}
                     {currentQuestion.type === 'Doğru/Yanlış' && ["Doğru", "Yanlış"].map((option, i) => {
                        const answerValue = option === 'Doğru';
                        const isSelected = currentAnswer === answerValue;
                        const isCorrect = (currentQuestion.isTrue ?? (currentQuestion.correctAnswer === 'Doğru')) === answerValue;
                        const isAnswered = !!currentAnswer;
                        
                        let btnClass = "border-[#2b245e] bg-[#1a1638] text-slate-200 hover:bg-[#201b45] hover:border-indigo-500/50";
                        if (isAnswered) {
                            if (isCorrect) btnClass = "bg-emerald-950 border-emerald-500 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)]";
                            else if (isSelected) btnClass = "bg-rose-950 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)]";
                            else btnClass = "border-white/5 bg-white/5 text-slate-500 opacity-50";
                        }

                        return (
                            <button 
                                key={option} 
                                className={cn("h-auto min-h-[4rem] px-5 py-4 text-center font-bold rounded-2xl border-2 transition-all duration-300", 
                                    isAnswered ? "cursor-default" : "cursor-pointer active:scale-95",
                                    btnClass
                                )} 
                                onClick={() => handleAnswer(answerValue)} 
                                disabled={isAnswered}
                            >
                                <span className="text-lg md:text-xl">{option}</span>
                            </button>
                        );
                    })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end mt-2 w-full">
                    <button 
                        onClick={handleNext} 
                        disabled={!currentAnswer}
                        className={cn(
                            "flex w-full md:w-auto items-center justify-center gap-2 px-8 py-4 font-black rounded-2xl transition-all duration-300",
                            currentAnswer 
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_20px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95" 
                                : "bg-[#161233] border border-white/10 text-slate-500 opacity-50 cursor-not-allowed"
                        )}
                    >
                        {currentQuestionIndex === questions.length - 1 ? 'TESTİ BİTİR' : 'SONRAKİ SORU'}
                        <ArrowRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SoruCozOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <QuizGame />
        </Suspense>
    )
}