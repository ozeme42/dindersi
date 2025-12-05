'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import { submitScore } from '../../actions'; // Puan kaydetme aksiyonu (Genel isim kullandım, projenizdeki path'i kontrol edin)
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Trophy, Flame, Zap, Save, Home, Repeat, Ghost } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = ({ streak }: { streak: number }) => {
    // Streak arttıkça arkaplanın rengi ve yoğunluğu değişir
    const intensity = Math.min(streak * 10, 100); 
    
    return (
        <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden transition-all duration-1000">
            <div className={cn(
                "absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[120px] animate-pulse transition-colors duration-1000",
                streak > 5 ? "bg-orange-600/20" : "bg-blue-600/20"
            )} />
            <div className={cn(
                "absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[120px] animate-pulse transition-colors duration-1000",
                streak > 5 ? "bg-red-600/20" : "bg-cyan-600/20"
            )} style={{ animationDelay: '1s' }} />
            
            {/* Hızlı Streak Efekti */}
            {streak > 2 && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-10 animate-pulse" />
            )}
        </div>
    );
};

const GameHUD = ({ score, current, total, streak }: { score: number, current: number, total: number, streak: number }) => {
    const progress = total > 0 ? ((current + 1) / total) * 100 : 0;
    
    // Streak Rengi
    let streakColor = "text-blue-400";
    if (streak > 2) streakColor = "text-yellow-400";
    if (streak > 5) streakColor = "text-orange-500";
    if (streak > 9) streakColor = "text-red-500";

    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                
                {/* Sol: Skor */}
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-xl font-black text-white font-mono">{score}</span>
                </div>

                {/* Orta: Progress (Mobilde gizlenebilir veya küçültülebilir) */}
                <div className="hidden sm:block flex-grow max-w-md h-3 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Sağ: Streak (Zincir) */}
                <div className={cn(
                    "flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border px-4 py-2 rounded-full shadow-lg transition-all duration-300",
                    streak > 0 ? "border-orange-500/50 shadow-orange-500/20 scale-110" : "border-white/10"
                )}>
                    <Flame className={cn("w-5 h-5 transition-all duration-300", streakColor, streak > 4 && "animate-bounce")} />
                    <span className={cn("text-xl font-black font-mono", streakColor)}>x{streak}</span>
                </div>
            </div>
        </div>
    );
};

// --- ANA OYUN ---

function TrueFalseChainGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    
    // State
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [shakeScreen, setShakeScreen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const isStatic = searchParams.get('static') === 'true';
    // Not: submitScore fonksiyonunuzun imzasını projenize göre güncelleyin. 
    // Burada önceki oyunlardaki "context" yapısını varsayıyorum.
    const gameContext = `D/Y Zinciri - ${searchParams.get('topicName') || 'Genel'}`;

    // Veri Çekme
    useEffect(() => {
        const fetchQuestions = async () => {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: 15, // Sabit 15 soru
                questionTypes: ['tf'], // Sadece Doğru/Yanlış
                isStatic,
            };
            
            const result = await getQuestionsFromBank(params);
            
            if (result.error) {
                setError(result.error);
            } else if (result.questions && result.questions.length > 0) {
                setQuestions(result.questions);
                setGameState('playing');
            } else {
                setError("Bu kriterlere uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic]);

    const currentQuestion = questions[currentQuestionIndex];

    // Cevap Verme
    const handleAnswer = useCallback((userAnswer: boolean) => {
        if (feedbackState !== 'idle' || !currentQuestion) return;

        const correctAnswer = (currentQuestion as Question)?.isTrue;
        const isCorrect = userAnswer === correctAnswer;

        if (isCorrect) {
            // DOĞRU
            playSound('correct');
            setFeedbackState('correct');
            
            // Puanlama: Baz puan (10) + Streak bonusu (her streak için +2)
            const bonus = streak * 2;
            setScore(prev => prev + 10 + bonus);
            setStreak(prev => prev + 1);
        } else {
            // YANLIŞ
            playSound('incorrect');
            setFeedbackState('wrong');
            setShakeScreen(true);
            setTimeout(() => setShakeScreen(false), 500);
            setStreak(0); // Zincir kırıldı!
        }

        // Sonraki Soruya Geçiş (Otomatik)
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setFeedbackState('idle');
            } else {
                setGameState('finished');
            }
        }, 1000); // 1 saniye geri bildirim göster

    }, [currentQuestion, currentQuestionIndex, questions.length, streak, feedbackState]);

    // Kaydet ve Çık
    // Not: Burada `submitAdamAsmacaScoreAction` benzeri genel bir aksiyon kullanmalısınız.
    // Ben `submitScore` olarak varsaydım, projenizdeki import'u kontrol edin.
    // Eğer `updateScore` kullanıyorsanız (eski kodunuzdaki gibi), onu buraya uyarlayın.
    const handleSaveAndExit = async () => {
        if (!user || score === 0 || isSaving) {
            router.push('/student/activities');
            return;
        }
        setIsSaving(true);
        try {
            // ! BURAYI KENDİ BACKEND AKSİYONUNUZA GÖRE GÜNCELLEYİN
            // Örnek: await updateScore(user.uid, score, "dy-zinciri", `Konu: ...`);
            // Aşağıdaki kod simülasyondur:
            
            // Eğer "updateScore" server action ise:
            // await updateScore(user.uid, score, "dy-zinciri", gameContext); 
            
            // Eğer "submitAdamAsmacaScoreAction" gibi generic bir yapı yaptıysanız:
            // await submitGenericScoreAction(user.uid, score, "Doğru/Yanlış", gameContext);

            // Eski kodunuzdaki yapıya sadık kalalım (Client side'dan server action çağırma):
             // @ts-ignore - updateScore import edildiği varsayılıyor
             if (typeof updateScore === 'function') {
                 await updateScore(user.uid, score, "dy-zinciri", gameContext);
             }

            toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
            router.push('/student/activities');
        } catch (err) {
            toast({ title: "Hata", description: "Puan kaydedilemedi.", variant: "destructive" });
            setIsSaving(false);
        }
    };

    // --- RENDER ---

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-cyan-500" />
            </div>
        );
    }

    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-slate-900 p-6 rounded-3xl border border-red-500/30">
                    <Ghost className="h-16 w-16 text-red-500 mx-auto" />
                    <h3 className="text-xl font-bold text-red-100">Oyun Başlatılamadı</h3>
                    <p className="text-red-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/student/dogru-yanlis-zinciri">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Bitiş Ekranı
    if (gameState === 'finished') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <GameBackground streak={streak} />
                <div className="relative z-10 w-full max-w-md text-center space-y-8 animate-in zoom-in-95 duration-500">
                    
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                        <Trophy className="w-32 h-32 text-blue-400 mx-auto drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
                    </div>

                    <div>
                        <h1 className="text-4xl lg:text-6xl font-black text-white mb-2 tracking-tight">ZİNCİR TAMAM!</h1>
                        <p className="text-slate-400 text-lg">Toplam Puanın</p>
                    </div>

                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                        <div className="text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                            {score}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Button 
                            onClick={handleSaveAndExit} 
                            size="lg" 
                            disabled={isSaving}
                            className="w-full h-20 text-xl lg:text-2xl font-black rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-xl shadow-blue-500/25 transition-all"
                        >
                            {isSaving ? <Loader2 className="mr-3 h-8 w-8 animate-spin" /> : <Save className="mr-3 h-8 w-8" />}
                            PUANI KAYDET VE ÇIK
                        </Button>
                        <Button 
                            onClick={() => window.location.reload()} 
                            variant="ghost"
                            className="text-slate-400 hover:text-white"
                        >
                            <Repeat className="mr-2 h-4 w-4" /> Kaydetmeden Tekrar Oyna
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col", shakeScreen && "animate-shake")}>
            <GameBackground streak={streak} />
            <GameHUD score={score} current={currentQuestionIndex} total={questions.length} streak={streak} />

            <main className="flex-grow flex flex-col items-center justify-center p-4 lg:p-8 relative z-10">
                <div className="w-full max-w-4xl space-y-8 lg:space-y-12 mt-16">
                    
                    {/* Soru Kartı */}
                    <div className={cn(
                        "relative bg-slate-900/60 backdrop-blur-xl border-2 rounded-[2.5rem] p-8 lg:p-16 text-center shadow-2xl transition-all duration-300 min-h-[300px] flex flex-col justify-center items-center",
                        feedbackState === 'correct' ? "border-green-500/50 bg-green-900/20 scale-105" :
                        feedbackState === 'wrong' ? "border-red-500/50 bg-red-900/20 scale-95" :
                        "border-white/10"
                    )}>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 px-6 py-2 rounded-full border border-white/10 text-cyan-400 font-bold tracking-widest text-sm uppercase shadow-lg">
                            Soru {currentQuestionIndex + 1}
                        </div>

                        <h2 className={cn(
                            "text-3xl md:text-5xl lg:text-7xl font-bold leading-tight transition-colors duration-300",
                            feedbackState === 'correct' ? "text-green-400" :
                            feedbackState === 'wrong' ? "text-red-400" :
                            "text-white"
                        )}>
                            {currentQuestion?.text}
                        </h2>

                        {/* Geri Bildirim Mesajı */}
                        {feedbackState !== 'idle' && (
                            <div className={cn(
                                "absolute bottom-8 left-0 right-0 font-black text-xl lg:text-3xl tracking-widest uppercase animate-in fade-in slide-in-from-bottom-4",
                                feedbackState === 'correct' ? "text-green-500" : "text-red-500"
                            )}>
                                {feedbackState === 'correct' ? 'DOĞRU!' : 'YANLIŞ!'}
                            </div>
                        )}
                    </div>

                    {/* Kontrol Butonları (Split Screen) */}
                    <div className="grid grid-cols-2 gap-4 lg:gap-8 h-32 lg:h-48">
                        <button
                            onClick={() => handleAnswer(true)}
                            disabled={feedbackState !== 'idle'}
                            className="group relative rounded-3xl overflow-hidden bg-green-600 hover:bg-green-500 active:scale-95 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex flex-col items-center justify-center gap-2 h-full">
                                <Check className="w-12 h-12 lg:w-20 lg:h-20 text-white drop-shadow-md" strokeWidth={4} />
                                <span className="text-xl lg:text-4xl font-black text-white tracking-widest uppercase drop-shadow-md">Doğru</span>
                            </div>
                        </button>

                        <button
                            onClick={() => handleAnswer(false)}
                            disabled={feedbackState !== 'idle'}
                            className="group relative rounded-3xl overflow-hidden bg-red-600 hover:bg-red-500 active:scale-95 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex flex-col items-center justify-center gap-2 h-full">
                                <X className="w-12 h-12 lg:w-20 lg:h-20 text-white drop-shadow-md" strokeWidth={4} />
                                <span className="text-xl lg:text-4xl font-black text-white tracking-widest uppercase drop-shadow-md">Yanlış</span>
                            </div>
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
}

// --- WRAPPER ---
export default function TrueFalseChainPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /></div>}>
            <TrueFalseChainGame />
        </Suspense>
    );
}