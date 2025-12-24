
'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDenemeQuestionsAction, submitDenemeScoreAction } from '../actions';
import type { Question, Assignment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, ClipboardCheck, PartyPopper, CheckCircle2, Bug, Timer, AlertTriangle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
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
    
    const durationParam = parseInt(searchParams.get('duration') || '0');
    // Eğer süre 0 ise (süre yoksa) çok uzun bir süre verelim (örn: 5 saat) ya da sayacı gizleyelim.
    // Şimdilik 0 ise sayacı gizleme mantığı UI'da yapılacak, buraya dummy süre atıyoruz.
    const duration = durationParam > 0 ? durationParam * 60 : 0; 

    const [timeLeft, setTimeLeft] = useState(duration);
    const timerRef = useRef<NodeJS.Timeout>();

    const [isFullscreen, setIsFullscreen] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

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
            const assignmentRef = doc(db, 'assignments', assignmentId);
            const assignmentSnap = await getDoc(assignmentRef);
            if (!assignmentSnap.exists()) {
                 setError("Atama bulunamadı.");
                 setIsLoading(false);
                 return;
            }
            const assignmentData = assignmentSnap.data() as Assignment;
            if (assignmentData.startDate && isFuture(new Date(assignmentData.startDate))) {
                setError("Bu deneme henüz başlamadı.");
                toast({ title: "Henüz Değil!", description: "Bu denemenin başlangıç tarihi henüz gelmedi.", variant: "destructive" });
                router.push('/student/deneme');
                return;
            }

            const result = await getDenemeQuestionsAction({ questionIds });
            if (result.error || result.questions.length === 0) {
                setError(result.error || "Bu konu için soru bulunamadı.");
            } else {
                setQuestions(result.questions);
                setAnswers(new Array(result.questions.length).fill(null));
            }
        } catch(e) {
            setError("Veri alınırken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }

    }, [searchParams, router, toast]);

    useEffect(() => {
        fetchQuest();
    }, [fetchQuest]);

     useEffect(() => {
        // Süre varsa sayacı başlat
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
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isLoading, questions, isFinished, duration]);
    
    const handleAnswer = (answer: string | boolean) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answer;
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setIsFinished(true);
        }
    };
    
    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };


    const handleSaveAndExit = async () => {
        if (isSubmitting) return;

        if (user?.role !== 'student') {
            router.push('/student/deneme');
            return;
        }

        let correctCount = 0;
        answers.forEach((answer, index) => {
            const question = questions[index];
            if (!question) return;
            
            let isCorrect = false;
            if (question.type === 'Doğru/Yanlış') {
                isCorrect = answer === (question.isTrue ?? (question.correctAnswer === 'Doğru'));
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
        const result = await submitDenemeScoreAction(user.uid, finalScore, context, answers);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Denemen kaydedildi. Sonuçlarını görüntüleyebilirsin." });
            router.push('/student/deneme');
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
            setIsSubmitting(false);
        }
    };
    
    useEffect(() => {
        if (isFinished) {
            handleSaveAndExit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFinished]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    // --- YÜKLENİYOR ---
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-500" /> 
                <span className="text-slate-400 font-medium animate-pulse">Sınav Ortamı Hazırlanıyor...</span>
            </div>
        );
    }
    
    // --- HATA ---
    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
                    <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Bir Sorun Oluştu</h3>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <Button asChild className="w-full bg-slate-800 text-white hover:bg-slate-700">
                        <Link href="/student/deneme"><ArrowLeft className="mr-2 h-4 w-4"/>Listeye Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    // --- BİTİŞ EKRANI ---
    if (isFinished) {
        return (
             <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                {/* Arka Plan Efekti */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />
                
                <div className="relative z-10 w-full max-w-md text-center bg-slate-900/80 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl">
                    <div className="mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-1 w-24 h-24 mb-6 shadow-lg shadow-amber-500/20 animate-in zoom-in duration-500">
                        <div className="bg-slate-900 w-full h-full rounded-full flex items-center justify-center">
                            <PartyPopper className="h-12 w-12 text-amber-500"/>
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">SINAV TAMAMLANDI!</h2>
                    <p className="text-slate-400 mb-8">Sonuçların sunucuya iletiliyor, lütfen bekle...</p>
                    
                    <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-500"/>
                    </div>
                </div>
            </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return <div className="text-center p-8 text-white">Soru verisi bozuk.</div>;

    const currentAnswer = answers[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    
    // Süre azaldığında (60 saniye altı) kırmızı uyarı
    const isLowTime = duration > 0 && timeLeft < 60;

    return (
        <div 
            ref={mainContentRef} 
            className={cn(
                "w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden selection:bg-cyan-500/30",
                !isFullscreen && "md:pb-12"
            )}
        >
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px]" />
            </div>

            {/* --- HEADER (HUD) --- */}
            <div className="relative z-20 w-full bg-slate-900/80 backdrop-blur-md border-b border-white/5 shadow-lg">
                <div className="container mx-auto px-4 py-3 md:py-4">
                    <div className="flex justify-between items-center gap-4">
                        
                        {/* Sol: Başlık ve İlerleme */}
                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                <ClipboardCheck className="text-indigo-400 h-5 w-5 md:h-6 md:w-6" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-sm md:text-lg font-bold text-white truncate">
                                    {searchParams.get('assignmentTitle') || 'Deneme Sınavı'}
                                </h1>
                                <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400 font-mono">
                                    <span>SORU {String(currentQuestionIndex + 1).padStart(2, '0')}</span>
                                    <span className="text-slate-600">/</span>
                                    <span>{String(questions.length).padStart(2, '0')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sağ: Sayaç ve Kontroller */}
                        <div className="flex items-center gap-2 md:gap-4">
                            {duration > 0 && (
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border font-mono font-bold text-sm md:text-lg transition-colors shadow-[0_0_15px_rgba(0,0,0,0.3)]",
                                    isLowTime 
                                        ? "bg-red-500/10 border-red-500/50 text-red-500 animate-pulse" 
                                        : "bg-slate-950/50 border-white/10 text-cyan-400"
                                )}>
                                    <Timer className="h-4 w-4 md:h-5 md:w-5" />
                                    {formatTime(timeLeft)}
                                </div>
                            )}
                            <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 border-white/10 text-slate-300 hover:text-white h-9 w-9 md:h-11 md:w-11 rounded-xl" />
                        </div>
                    </div>
                </div>
                
                {/* İlerleme Çubuğu (Header Altı) */}
                <div className="w-full h-1 bg-slate-800">
                    <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-500 ease-out"
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* --- SORU ALANI --- */}
            <div className={cn(
                "flex-grow flex flex-col items-center justify-center p-4 relative z-10",
                isFullscreen ? "h-full" : "container mx-auto max-w-4xl"
            )}>
                <div className="w-full space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${100}ms` }}>
                    
                    {/* Soru Metni */}
                    <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                        <p className={cn(
                            "font-medium text-white leading-relaxed",
                            currentQuestion.text.length > 100 ? "text-lg md:text-xl" : "text-xl md:text-2xl text-center"
                        )}>
                            {currentQuestion.text}
                        </p>
                    </div>

                    {/* Seçenekler */}
                    <div className={cn(
                        "grid gap-3 md:gap-4",
                        currentQuestion.options && currentQuestion.options.length > 4 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                    )}>
                        {currentQuestion.type === 'Doğru/Yanlış' ? (
                            ["Doğru", "Yanlış"].map((option) => {
                                const answerValue = option === 'Doğru';
                                const isSelected = currentAnswer === answerValue;
                                return (
                                    <Button
                                        key={option}
                                        onClick={() => handleAnswer(answerValue)}
                                        className={cn(
                                            "h-auto py-4 md:py-6 px-6 text-lg rounded-2xl border-2 transition-all duration-200 justify-start relative overflow-hidden group",
                                            isSelected 
                                                ? "bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] transform scale-[1.01]" 
                                                : "bg-slate-900/50 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-white/20 hover:text-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors",
                                            isSelected ? "border-white bg-white/20" : "border-slate-500 group-hover:border-slate-300"
                                        )}>
                                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                        </div>
                                        <span className="font-semibold">{option}</span>
                                    </Button>
                                )
                            })
                        ) : (currentQuestion.options || []).map((option, idx) => {
                            const isSelected = currentAnswer === option;
                            const labels = ['A', 'B', 'C', 'D', 'E'];
                            return (
                                <Button
                                    key={idx}
                                    onClick={() => handleAnswer(option)}
                                    className={cn(
                                        "h-auto py-4 md:py-5 px-6 text-base md:text-lg rounded-2xl border-2 transition-all duration-200 justify-start relative overflow-hidden group whitespace-normal text-left",
                                        isSelected 
                                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] transform scale-[1.01] z-10" 
                                            : "bg-slate-900/50 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-white/20 hover:text-white"
                                    )}
                                >
                                    <span className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-4 shrink-0 transition-colors",
                                        isSelected ? "bg-white text-indigo-600" : "bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300"
                                    )}>
                                        {labels[idx]}
                                    </span>
                                    <span className="leading-snug">{option}</span>
                                </Button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* --- ALT BAR (FOOTER) --- */}
            <div className="relative z-20 w-full bg-slate-900/90 backdrop-blur-xl border-t border-white/5 p-4 md:p-6 mt-auto">
                <div className={cn("container mx-auto flex items-center justify-between gap-4", isFullscreen ? "max-w-full" : "max-w-4xl")}>
                    
                    {/* Önceki Soru Butonu */}
                    <Button 
                        variant="ghost" 
                        onClick={handlePrev} 
                        disabled={currentQuestionIndex === 0}
                        className="text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                        <span className="hidden md:inline">Önceki</span>
                    </Button>
                    
                    {/* Sonraki / Bitir Butonu */}
                    <Button 
                        onClick={handleNext}
                        className={cn(
                            "px-6 md:px-8 py-6 font-bold text-base md:text-lg rounded-xl shadow-lg transition-all",
                            isLastQuestion 
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20" 
                                : "bg-white text-slate-900 hover:bg-cyan-50 shadow-white/10"
                        )}
                    >
                        {isLastQuestion ? (
                            <>Sınavı Tamamla <CheckCircle2 className="ml-2 h-5 w-5" /></>
                        ) : (
                            <>Sonraki <ArrowRight className="ml-2 h-5 w-5" /></>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function DenemeOyunPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>}>
            <DenemeGame />
        </Suspense>
    )
}
