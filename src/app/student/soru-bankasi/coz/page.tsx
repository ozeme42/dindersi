'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import { submitSoruBankasiScore, updateTopicTestProgress } from '@/app/student/soru-bankasi/actions'; 
import type { Question, GetQuizInput } from '@/lib/types'; 
import { Button } from '@/components/ui/button';
import { 
    Loader2, ArrowRight, ArrowLeft, BrainCircuit, PartyPopper, Repeat, 
    Home, FastForward, CheckCircle2, XCircle, ChevronLeft, Zap, Target, 
    Trophy, Flame 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { addQuestionToReviewList } from '@/app/student/tekrar-et/actions';
import { useAuth } from '@/context/auth-context';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

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
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);

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

        if (isCorrect) {
            playSound('correct');
            setScore(s => s + 10);
            setCorrectCount(c => c + 1);
            const newStreak = streak + 1;
            setStreak(newStreak);
            setMaxStreak(m => Math.max(m, newStreak));
            if (question.id) {
                setCorrectQuestionIds(prev => [...prev, question.id]);
            }
        } else {
            playSound('incorrect');
            setStreak(0);
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
    };
    
    const getBackLink = () => {
        return courseId ? `/student/soru-bankasi/${courseId}` : '/student/soru-bankasi';
    };

    const saveProgressAndScore = async () => {
        if (!user) return false;
        try {
            if (courseId && topicId && difficulty) {
                const diffString = difficulty[0]?.toLowerCase() || '';
                let difficultyKey: 'easy' | 'medium' | 'hard' = 'easy';
                if (diffString === 'orta') difficultyKey = 'medium';
                if (diffString === 'zor') difficultyKey = 'hard';
                const isPassed = (correctCount / questions.length) >= 0.5;
                await updateTopicTestProgress(
                    user.uid, courseId, topicId, difficultyKey, testIndex,
                    { score, status: isPassed ? 'passed' : 'failed', correctAnswers: correctCount, totalQuestions: questions.length, date: new Date().toISOString() } as any,
                    correctQuestionIds
                );
            }
            if (score > 0) {
                const contextName = `${searchParams.get('courseName') || courseId} - ${searchParams.get('topicName') || topicId}`;
                await submitSoruBankasiScore(user.uid, score, contextName);
            }
            return true;
        } catch (err) {
            console.error("Kayıt sırasında hata:", err);
            return false;
        }
    };

    const handleSaveAndExit = async () => {
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

    const handleSaveAndContinue = async () => {
        if (!user || isSubmitting) return;
        setIsSubmitting(true);
        const success = await saveProgressAndScore();
        if (success) {
            toast({ title: "Kaydedildi!", description: `${score} puan eklendi. Sıradaki teste geçiliyor...` });
            const nextIndex = testIndex + 1;
            const currentParams = new URLSearchParams(searchParams.toString());
            currentParams.set('testIndex', nextIndex.toString());
            setIsFinished(false);
            setCurrentQuestionIndex(0);
            setScore(0);
            setCorrectCount(0);
            setCorrectQuestionIds([]);
            setAnswers([]);
            setStreak(0);
            setMaxStreak(0);
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
        setStreak(0);
        setMaxStreak(0);
        fetchQuestions();
    };

    // ── LOADING ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#09071a]">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <BrainCircuit className="absolute inset-0 m-auto w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest animate-pulse">Test Yükleniyor...</p>
            </div>
        );
    }
    
    // ── ERROR ────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#09071a]">
                <div className="w-full max-w-sm bg-rose-950/80 border border-rose-500/30 rounded-3xl p-8 text-center backdrop-blur-xl">
                    <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
                    <h2 className="text-xl font-black text-white mb-2">Bir Hata Oluştu</h2>
                    <p className="text-rose-300/80 mb-6 text-sm">{error}</p>
                    <Link href={getBackLink()} className="flex items-center justify-center gap-2 w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl transition-all active:scale-95">
                        <ArrowLeft className="w-4 h-4" /> Geri Dön
                    </Link>
                </div>
            </div>
        );
    }
    
    // ── EMPTY ────────────────────────────────────────────────────────────────
    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#09071a]">
                <div className="w-full max-w-sm bg-[#161233] border border-white/10 rounded-3xl p-8 text-center">
                    <Target className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <h2 className="text-xl font-black text-white mb-2">Soru Bulunamadı</h2>
                    <p className="text-slate-400 mb-6 text-sm">Tüm soruları çözdün veya yeterli soru yok.</p>
                    <Link href={getBackLink()} className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all active:scale-95">
                        <ArrowLeft className="w-4 h-4" /> Listeye Dön
                    </Link>
                </div>
            </div>
        );
    }

    // ── FINISHED SCREEN ──────────────────────────────────────────────────────
    if (isFinished) {
        const percentage = Math.round((correctCount / questions.length) * 100);
        const isPassed = percentage >= 50;
        const grade = percentage >= 85 ? { label: 'Mükemmel!', emoji: '🏆', color: 'from-yellow-400 to-amber-500', glow: 'shadow-[0_0_60px_rgba(251,191,36,0.3)]' }
            : percentage >= 70 ? { label: 'Harika!', emoji: '⭐', color: 'from-emerald-400 to-teal-500', glow: 'shadow-[0_0_60px_rgba(16,185,129,0.3)]' }
            : percentage >= 50 ? { label: 'İyi İş!', emoji: '👍', color: 'from-blue-400 to-indigo-500', glow: 'shadow-[0_0_60px_rgba(99,102,241,0.3)]' }
            : { label: 'Tekrar Dene', emoji: '💪', color: 'from-rose-400 to-pink-500', glow: 'shadow-[0_0_60px_rgba(244,63,94,0.2)]' };

        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#09071a] relative overflow-hidden">
                {/* BG glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className={cn("absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 bg-gradient-to-r", grade.color)} />
                </div>

                <div className="relative w-full max-w-sm flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Score Circle */}
                    <div className={cn("w-full rounded-[2rem] p-8 text-center bg-[#161233] border border-white/10 relative overflow-hidden", grade.glow)}>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r via-white/10 from-transparent to-transparent" />
                        <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", grade.color)} style={{ width: `${percentage}%` }} />
                        
                        <div className="text-6xl mb-3">{grade.emoji}</div>
                        <h2 className={cn("text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r mb-1", grade.color)}>{grade.label}</h2>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-6">Test Tamamlandı</p>
                        
                        <div className="flex items-end justify-center gap-1 mb-2">
                            <span className={cn("text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r", grade.color)}>{percentage}</span>
                            <span className="text-3xl font-black text-slate-500 mb-2">%</span>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">{correctCount} doğru / {questions.length - correctCount} yanlış</p>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#161233] border border-white/8 rounded-2xl p-4 text-center">
                            <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                            <p className="text-xl font-black text-white">+{score}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Puan</p>
                        </div>
                        <div className="bg-[#161233] border border-white/8 rounded-2xl p-4 text-center">
                            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1.5" />
                            <p className="text-xl font-black text-white">{maxStreak}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seri</p>
                        </div>
                        <div className="bg-[#161233] border border-white/8 rounded-2xl p-4 text-center">
                            <Trophy className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
                            <p className="text-xl font-black text-white">{isPassed ? '✓' : '✗'}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isPassed ? 'Geçti' : 'Kaldı'}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2.5">
                        <button
                            onClick={handleSaveAndContinue}
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl shadow-[0_8px_30px_rgba(99,102,241,0.35)] transition-all active:scale-95 disabled:opacity-50 text-sm uppercase tracking-wider"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FastForward className="w-5 h-5" />}
                            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet & Sonraki Test'}
                        </button>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={handleRestart}
                                className="flex items-center justify-center gap-2 py-3.5 bg-[#1a1638] border border-white/8 hover:bg-[#201b45] text-slate-300 font-bold rounded-2xl transition-all active:scale-95 text-sm"
                            >
                                <Repeat className="w-4 h-4" /> Tekrar
                            </button>
                            <button
                                onClick={handleSaveAndExit}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 py-3.5 bg-[#1a1638] border border-white/8 hover:bg-rose-950/40 hover:border-rose-500/30 text-slate-300 font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 text-sm"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Home className="w-4 h-4" />}
                                Çık
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── QUIZ SCREEN ──────────────────────────────────────────────────────────
    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestionIndex];
    const isAnswered = currentAnswer !== undefined && currentAnswer !== null;
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen flex flex-col bg-[#09071a] relative overflow-hidden">
            {/* Background radial glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl" />
            </div>

            {/* ── TOP BAR ── */}
            <div className="relative z-10 flex-shrink-0 px-4 pt-safe-top pt-4">
                <div className="flex items-center justify-between mb-3">
                    {/* Back + title */}
                    <Link href={getBackLink()} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-sm font-bold">Geri</span>
                    </Link>

                    {/* Score pill */}
                    <div className="flex items-center gap-2">
                        {streak >= 3 && (
                            <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1">
                                <Flame className="w-3.5 h-3.5 text-orange-400" />
                                <span className="text-xs font-black text-orange-400">{streak}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-sm font-black text-white">{score}</span>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3 mb-1">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-slate-500 tabular-nums flex-shrink-0">
                        {currentQuestionIndex + 1}/{questions.length}
                    </span>
                </div>
            </div>

            {/* ── QUESTION CARD ── */}
            <div className="relative z-10 flex-1 flex flex-col px-4 pb-6 pt-4 gap-4 overflow-y-auto">

                {/* Question number badge */}
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-black text-indigo-400">{currentQuestionIndex + 1}</span>
                    </div>
                    <div className="h-px flex-1 bg-white/5" />
                </div>

                {/* Question text */}
                <div className="bg-[#161233]/80 border border-white/8 rounded-3xl p-5 backdrop-blur-sm shadow-xl">
                    <p className="text-base md:text-xl font-bold text-white leading-relaxed">
                        {currentQuestion.text}
                    </p>
                </div>

                {/* Options */}
                <div className="flex flex-col gap-2.5">
                    {currentQuestion.type === 'Çoktan Seçmeli' && (currentQuestion.options || []).map((option, i) => {
                        const isSelected = currentAnswer === option;
                        const isCorrect = currentQuestion.correctAnswer === option;

                        let style = 'border-white/8 bg-[#161233]/60 text-slate-200 hover:bg-[#1e1a45] hover:border-indigo-500/30 active:scale-[0.98]';
                        let letterStyle = 'bg-white/5 border-white/10 text-slate-400';
                        let icon = null;

                        if (isAnswered) {
                            if (isCorrect) {
                                style = 'border-emerald-500/50 bg-emerald-950/50 text-white shadow-[0_0_25px_rgba(16,185,129,0.2)]';
                                letterStyle = 'bg-emerald-500 border-emerald-400 text-white';
                                icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
                            } else if (isSelected) {
                                style = 'border-rose-500/50 bg-rose-950/50 text-white shadow-[0_0_25px_rgba(244,63,94,0.15)]';
                                letterStyle = 'bg-rose-500 border-rose-400 text-white';
                                icon = <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />;
                            } else {
                                style = 'border-white/4 bg-white/3 text-slate-600';
                                letterStyle = 'bg-white/3 border-white/5 text-slate-600';
                            }
                        }

                        return (
                            <button
                                key={option}
                                onClick={() => handleAnswer(option)}
                                disabled={isAnswered}
                                className={cn(
                                    'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-250 font-semibold',
                                    isAnswered ? 'cursor-default' : 'cursor-pointer',
                                    style
                                )}
                            >
                                <span className={cn('flex-shrink-0 w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black transition-all', letterStyle)}>
                                    {OPTION_LETTERS[i]}
                                </span>
                                <span className="flex-1 text-sm md:text-base leading-snug">{option}</span>
                                {icon}
                            </button>
                        );
                    })}

                    {currentQuestion.type === 'Doğru/Yanlış' && (
                        <div className="grid grid-cols-2 gap-3">
                            {["Doğru", "Yanlış"].map((option) => {
                                const answerValue = option === 'Doğru';
                                const isSelected = currentAnswer === answerValue;
                                const isCorrect = (currentQuestion.isTrue ?? (currentQuestion.correctAnswer === 'Doğru')) === answerValue;

                                let style = 'border-white/8 bg-[#161233]/60 text-slate-200 hover:bg-[#1e1a45] hover:border-indigo-500/30 active:scale-[0.98]';
                                let icon = null;

                                if (isAnswered) {
                                    if (isCorrect) {
                                        style = 'border-emerald-500/50 bg-emerald-950/50 text-white shadow-[0_0_25px_rgba(16,185,129,0.2)]';
                                        icon = <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
                                    } else if (isSelected) {
                                        style = 'border-rose-500/50 bg-rose-950/50 text-white shadow-[0_0_25px_rgba(244,63,94,0.15)]';
                                        icon = <XCircle className="w-5 h-5 text-rose-400" />;
                                    } else {
                                        style = 'border-white/4 bg-white/3 text-slate-600';
                                    }
                                }

                                return (
                                    <button
                                        key={option}
                                        onClick={() => handleAnswer(answerValue)}
                                        disabled={isAnswered}
                                        className={cn(
                                            'flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 transition-all duration-250 font-bold',
                                            isAnswered ? 'cursor-default' : 'cursor-pointer',
                                            style
                                        )}
                                    >
                                        {icon}
                                        <span className="text-lg">{option}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Next button */}
                <div className="mt-auto pt-2">
                    <button
                        onClick={handleNext}
                        disabled={!isAnswered}
                        className={cn(
                            'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300',
                            isAnswered
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_8px_30px_rgba(99,102,241,0.35)] hover:shadow-[0_8px_40px_rgba(99,102,241,0.5)] active:scale-[0.98]'
                                : 'bg-white/4 border border-white/5 text-slate-600 cursor-not-allowed'
                        )}
                    >
                        {currentQuestionIndex === questions.length - 1 ? (
                            <>Testi Bitir <Trophy className="w-4 h-4" /></>
                        ) : (
                            <>Sonraki Soru <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SoruCozOyunPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-[#09071a]">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            </div>
        }>
            <QuizGame />
        </Suspense>
    );
}