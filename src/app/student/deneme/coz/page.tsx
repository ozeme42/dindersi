'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDenemeQuestionsAction, submitDenemeScoreAction } from '../actions'; 
import type { Question, Assignment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, ClipboardCheck, PartyPopper, CheckCircle2, Timer, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isFuture } from 'date-fns';

function DenemeGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | boolean | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const assignmentId = searchParams.get('assignmentId');
    const durationParam = parseInt(searchParams.get('duration') || '0');
    const duration = durationParam > 0 ? durationParam * 60 : 0; 

    const [timeLeft, setTimeLeft] = useState(duration);
    const timerRef = useRef<NodeJS.Timeout>();

    const [isFullscreen, setIsFullscreen] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchQuest = useCallback(async () => {
        setIsLoading(true);
        const questionIdsParam = searchParams.get('questionIds');
        const questionIds = questionIdsParam ? questionIdsParam.split(',') : [];

        if (!assignmentId || questionIds.length === 0) {
             setError("Soru bilgisi bulunamadı.");
             setIsLoading(false);
             return;
        }

        try {
            const assignmentRef = doc(db, 'assignments', assignmentId);
            const assignmentSnap = await getDoc(assignmentRef);
            if (!assignmentSnap.exists()) {
                 setError("Atama bulunamadı.");
                 setIsLoading(false);
                 return;
            }
            const result = await getDenemeQuestionsAction({ questionIds });
            if (result.error) {
                setError(result.error);
            } else {
                setQuestions(result.questions);
                setAnswers(new Array(result.questions.length).fill(null));
            }
        } catch(e) {
            setError("Veri alınırken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    }, [assignmentId, searchParams]);

    useEffect(() => { fetchQuest(); }, [fetchQuest]);

    useEffect(() => {
        if (!isLoading && questions.length > 0 && !isFinished && duration > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        setIsFinished(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [isLoading, questions, isFinished, duration]);
    
    const handleAnswer = (answer: string | boolean) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answer;
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setIsFinished(true);
        }
    };
    
    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSaveAndExit = async () => {
        if (isSubmitting || !user || !assignmentId) return;
        setIsSubmitting(true);

        let correctCount = 0;
        answers.forEach((answer, index) => {
            const q = questions[index];
            if (q.type === 'Doğru/Yanlış' ? answer === (q.isTrue ?? (q.correctAnswer === 'Doğru')) : answer === q.correctAnswer) {
                correctCount++;
            }
        });

        try {
            const result = await submitDenemeScoreAction(user.uid, correctCount * 100, `Deneme ID: ${assignmentId}`, answers, correctCount, questions.length);
            if (result.success) {
                toast({ title: "Sınav Başarıyla Kaydedildi!" });
                router.push('/student/deneme');
            }
        } catch (err) {
            toast({ title: "Hata oluştu", variant: "destructive" });
            setIsSubmitting(false);
        }
    };
    
    useEffect(() => { if (isFinished) handleSaveAndExit(); }, [isFinished]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    if (isLoading) return <div className="h-[100dvh] bg-slate-950 flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-cyan-500" /></div>;

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
        /* 100dvh kullanarak tam ekran yüksekliğini mobil araç çubuklarına göre ayarlar */
        <div ref={mainContentRef} className="flex flex-col min-h-[100dvh] bg-slate-950 text-white overflow-x-hidden">
            
            {/* ÜST HUD */}
            <header className="sticky top-0 z-50 w-full bg-slate-900/95 backdrop-blur-md border-b border-white/10 px-4 py-3 shrink-0">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Soru {currentQuestionIndex + 1} / {questions.length}</p>
                        <h2 className="text-xs font-bold text-indigo-400 truncate max-w-[120px] sm:max-w-xs uppercase">
                            {searchParams.get('assignmentTitle') || 'Deneme'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {duration > 0 && (
                            <div className={cn("px-2 py-1 rounded-md border font-mono text-xs font-bold", timeLeft < 60 ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse" : "bg-slate-950 border-white/10 text-cyan-400")}>
                                <Timer className="inline h-3 w-3 mr-1" /> {formatTime(timeLeft)}
                            </div>
                        )}
                        <FullscreenToggle elementRef={mainContentRef} className="h-8 w-8" />
                    </div>
                </div>
            </header>

            {/* ANA İÇERİK - Flex-grow ile alanı doldurur */}
            <main className="flex-grow container mx-auto max-w-2xl p-4 pt-6 flex flex-col justify-start">
                <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl mb-6 shadow-inner">
                    <p className="text-base md:text-xl font-medium leading-relaxed text-slate-100">{currentQuestion?.text}</p>
                </div>

                <div className="grid gap-3 mb-10">
                    {currentQuestion?.type === 'Doğru/Yanlış' ? (
                        ["Doğru", "Yanlış"].map((opt) => (
                            <Button key={opt} onClick={() => handleAnswer(opt === 'Doğru')} className={cn("h-16 text-lg rounded-xl border-2 transition-all font-bold", answers[currentQuestionIndex] === (opt === 'Doğru') ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-900/50 border-white/5 text-slate-400 hover:text-white")}>
                                {opt}
                            </Button>
                        ))
                    ) : (
                        currentQuestion?.options?.map((opt, i) => (
                            <Button key={i} onClick={() => handleAnswer(opt)} className={cn("h-auto py-4 px-5 text-left justify-start rounded-xl border-2 transition-all whitespace-normal leading-tight", answers[currentQuestionIndex] === opt ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-900/50 border-white/5 text-slate-400 hover:text-white")}>
                                <span className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0 mr-3 text-xs font-black", answers[currentQuestionIndex] === opt ? "bg-white text-indigo-600" : "bg-slate-800 text-slate-500")}>{['A','B','C','D','E'][i]}</span> 
                                <span className="text-sm md:text-base">{opt}</span>
                            </Button>
                        ))
                    )}
                </div>
            </main>

            {/* ALT NAVIGASYON - STICKY VE DVH UYUMLU */}
            <footer className="sticky bottom-0 z-50 w-full bg-slate-900/98 backdrop-blur-xl border-t border-white/10 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {/* pb-safe ve padding-bottom: calc(env(safe-area-inset-bottom) + 1rem) çakışmayı önler */}
                <div className="container mx-auto flex items-center justify-between gap-4 max-w-2xl">
                    <Button 
                        variant="ghost" 
                        onClick={handlePrev} 
                        disabled={currentQuestionIndex === 0}
                        className="text-slate-500 hover:text-white h-12 px-4 rounded-xl"
                    >
                        <ArrowLeft className="h-5 w-5 mr-1" />
                        <span className="text-sm font-bold">Geri</span>
                    </Button>

                    <Button 
                        onClick={handleNext}
                        disabled={answers[currentQuestionIndex] === null}
                        className={cn(
                            "flex-1 h-14 font-black text-base rounded-xl transition-all shadow-xl active:scale-95",
                            isLastQuestion 
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20" 
                                : "bg-white text-slate-950 hover:bg-indigo-50 shadow-white/10"
                        )}
                    >
                        {isLastQuestion ? (
                            <span className="flex items-center justify-center gap-2">SINAVI BİTİR <CheckCircle2 className="h-5 w-5" /></span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">SONRAKİ SORU <ArrowRight className="h-5 w-5" /></span>
                        )}
                    </Button>
                </div>
            </footer>

            <style jsx>{`
                /* Mobil alt menü (home bar) için güvenli alan ayarı */
                .pb-safe {
                    padding-bottom: calc(env(safe-area-inset-bottom, 16px) + 12px);
                }
                /* Sayfa kaydırma sırasında adres çubuğu değişse bile butonları yerinde tutar */
                main {
                    min-height: calc(100dvh - 140px);
                }
            `}</style>
        </div>
    );
}

export default function DenemeOyunPage() {
    return (
        <Suspense fallback={<div className="h-[100dvh] bg-slate-950 flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-cyan-500" /></div>}>
            <DenemeGame />
        </Suspense>
    )
}