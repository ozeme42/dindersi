'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDogruYanlisZinciriAction, submitDogruYanlisZinciriScoreAction } from '@/app/oyunlar/dogru-yanlis-zinciri/actions';
import type { Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
    Loader2, Ghost, PlusCircle, MinusCircle, CheckCircle, RotateCcw, 
    XCircle, Sparkles, HelpCircle, Flame, Trophy, Zap, AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { getGameBackUrl } from '@/lib/game-navigation';

const INITIAL_TIME = 20;

function getStreakMultiplier(streak: number): number {
    if (streak >= 8) return 3;
    if (streak >= 5) return 2;
    if (streak >= 3) return 1.5;
    return 1;
}

function getTimeBonus(streak: number): number {
    if (streak >= 8) return 6;
    if (streak >= 5) return 5;
    if (streak >= 3) return 4;
    return 3;
}

function TrueFalseStage({
    question,
    feedback,
    streak,
    maxStreak,
    lastPointsEarned,
    lastTimeBonus,
    onAnswer,
}: {
    question: Question;
    feedback: 'correct' | 'wrong' | null;
    streak: number;
    maxStreak: number;
    lastPointsEarned: number;
    lastTimeBonus: number;
    onAnswer: (answer: boolean) => void;
}) {
    const { theme, soundEnabled } = useWordwall();
    const multiplier = getStreakMultiplier(streak);

    return (
        <div className="w-full h-full min-h-0 min-w-0 max-w-4xl mx-auto flex flex-col justify-between overflow-hidden gap-2 sm:gap-3">
            
            {/* ÜST BİLGİ KOKPİTİ: CANLI SERİ & KOMBO ROZETLERİ */}
            <div className="flex items-center justify-between gap-2 px-1 flex-shrink-0">
                {/* Sol: Seri Sayacı & Çarpan */}
                <div className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm border transition-all duration-300 shadow-md",
                    streak >= 8
                        ? "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-pulse"
                        : streak >= 5
                        ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white border-amber-300 shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse"
                        : streak >= 3
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                        : streak > 0
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-white/5 text-slate-400 border-white/10"
                )}>
                    <Flame className={cn("w-4 h-4", streak >= 3 ? "animate-bounce text-amber-300" : "text-slate-400")} />
                    <span>{streak > 0 ? `${streak}x SERİ!` : "Seri Başlat"}</span>
                    {multiplier > 1 && (
                        <span className="bg-black/40 text-yellow-300 px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-black ml-0.5">
                            {multiplier}x Puan
                        </span>
                    )}
                </div>

                {/* Orta: Seri İlerleme Halkaları */}
                <div className="hidden sm:flex items-center gap-1 bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/10">
                    {[1, 2, 3, 4, 5].map((lvl) => {
                        const isActive = streak >= lvl;
                        return (
                            <div
                                key={lvl}
                                className={cn(
                                    "w-3 h-3 rounded-full transition-all duration-300 flex items-center justify-center text-[8px] font-black",
                                    isActive
                                        ? "bg-amber-400 text-amber-950 shadow-[0_0_8px_rgba(251,191,36,0.8)] scale-110"
                                        : "bg-white/10 text-white/40"
                                )}
                            >
                                •
                            </div>
                        );
                    })}
                </div>

                {/* Sağ: Rekor Seri */}
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl sm:rounded-2xl border border-white/10 shadow-sm">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    <span>En İyi Seri: <b className="text-white font-mono text-xs sm:text-sm">{maxStreak}</b></span>
                </div>
            </div>

            {/* SORU METNİ KARTI (WORDWALL 3D THEMED CARD) */}
            <div className={cn(
                "w-full flex-1 min-h-0 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border-2 backdrop-blur-xl shadow-2xl transition-all relative flex flex-col items-center justify-center text-center overflow-hidden",
                theme.cardBg,
                theme.cardBorder,
                theme.cardShadow
            )}>
                {/* Süre & Puan Değişim Bildirimi */}
                {feedback === 'correct' && (
                    <div className="absolute top-2 sm:top-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black px-4 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/40 animate-in zoom-in-75 duration-200 z-20">
                        <PlusCircle className="w-4 h-4" />
                        <span>+{lastPointsEarned} Puan!</span>
                        <span className="text-emerald-200">+{lastTimeBonus}s Süre</span>
                    </div>
                )}
                {feedback === 'wrong' && (
                    <div className="absolute top-2 sm:top-3 bg-gradient-to-r from-rose-600 to-red-700 text-white font-black px-4 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-rose-500/40 animate-in zoom-in-75 duration-200 z-20">
                        <MinusCircle className="w-4 h-4" />
                        <span>💔 Seri Kırıldı! -5s Cezası</span>
                    </div>
                )}

                <div className={cn(
                    "flex-shrink-0 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2",
                    theme.subText
                )}>
                    <Zap className={cn("w-4 h-4", theme.accentText)} />
                    <span>Hızlı Karar Ver: Bu İfade Doğru mu, Yanlış mı?</span>
                </div>

                <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto px-2">
                    <p 
                        style={{ fontSize: 'clamp(18px, 2.4vw, 36px)', lineHeight: 1.35 }}
                        className={cn(
                            "font-black leading-relaxed max-w-3xl text-center select-none",
                            theme.questionText
                        )}
                    >
                        {question.text}
                    </p>
                </div>
            </div>

            {/* DEVA 3D DOĞRU / YANLIŞ BUTONLARI (SERİ TEMPOSU) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-5 w-full flex-shrink-0 h-20 sm:h-28 md:h-32">
                {/* DOĞRU BUTONU */}
                <button
                    type="button"
                    disabled={!!feedback}
                    onClick={() => {
                        if (!feedback) {
                            if (soundEnabled) playSound('pop');
                            onAnswer(true);
                        }
                    }}
                    className={cn(
                        "group relative h-full flex items-center justify-center gap-2 sm:gap-4 px-3 sm:px-6 rounded-xl sm:rounded-2xl md:rounded-3xl font-black text-lg sm:text-2xl md:text-3xl text-white transition-all select-none cursor-pointer",
                        "bg-gradient-to-b from-emerald-500 to-emerald-700 border-2 border-emerald-400 border-b-[6px] sm:border-b-[8px] border-b-emerald-900 shadow-xl shadow-emerald-950/50",
                        "hover:-translate-y-1 hover:brightness-110 active:translate-y-2 active:border-b-2",
                        feedback && "opacity-75 cursor-default"
                    )}
                >
                    <CheckCircle className="w-6 h-6 sm:w-9 sm:h-9 text-emerald-200 drop-shadow group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span className="tracking-wide">DOĞRU</span>
                    <span className="hidden sm:inline-block ml-auto text-xs px-2 py-0.5 rounded-lg bg-black/20 border border-white/20 opacity-70 font-mono">
                        [D]
                    </span>
                </button>

                {/* YANLIŞ BUTONU */}
                <button
                    type="button"
                    disabled={!!feedback}
                    onClick={() => {
                        if (!feedback) {
                            if (soundEnabled) playSound('pop');
                            onAnswer(false);
                        }
                    }}
                    className={cn(
                        "group relative h-full flex items-center justify-center gap-2 sm:gap-4 px-3 sm:px-6 rounded-xl sm:rounded-2xl md:rounded-3xl font-black text-lg sm:text-2xl md:text-3xl text-white transition-all select-none cursor-pointer",
                        "bg-gradient-to-b from-rose-500 to-rose-700 border-2 border-rose-400 border-b-[6px] sm:border-b-[8px] border-b-rose-950 shadow-xl shadow-rose-950/50",
                        "hover:-translate-y-1 hover:brightness-110 active:translate-y-2 active:border-b-2",
                        feedback && "opacity-75 cursor-default"
                    )}
                >
                    <XCircle className="w-6 h-6 sm:w-9 sm:h-9 text-rose-200 drop-shadow group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span className="tracking-wide">YANLIŞ</span>
                    <span className="hidden sm:inline-block ml-auto text-xs px-2 py-0.5 rounded-lg bg-black/20 border border-white/20 opacity-70 font-mono">
                        [Y]
                    </span>
                </button>
            </div>
        </div>
    );
}

function TrueFalseChainGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'error'>('loading');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [lastPointsEarned, setLastPointsEarned] = useState(10);
    const [lastTimeBonus, setLastTimeBonus] = useState(3);
    const [showConfetti, setShowConfetti] = useState(false);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const topicName = searchParams.get('topicName') || 'Seri (Doğru/Yanlış)';
    const isMission = mode === 'mission';
    const gameContext = `Seri - ${searchParams.get('courseName') || 'Ders'} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: isMission ? '/student/gorevler' : '/oyunlar/dogru-yanlis-zinciri' });

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getDogruYanlisZinciriAction(params);

        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu konu için uygun Doğru/Yanlış sorusu bulunamadı.");
            setGameState('error');
        } else {
            setQuestions(result.questions);
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    // Geri Sayım Zamanlayıcısı
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
        } else if (timeLeft <= 0 && gameState === 'playing') {
            playSound('timeUp');
            setGameState('finished');
        }
        return () => clearTimeout(timer);
    }, [timeLeft, gameState]);

    const handleAnswer = useCallback((answer: boolean) => {
        if (gameState !== 'playing' || feedback || !questions[currentQuestionIndex]) return;

        const currentQuestion = questions[currentQuestionIndex];
        const isCorrect = answer === (currentQuestion.isTrue ?? currentQuestion.correctAnswer === 'Doğru');

        if (isCorrect) {
            const nextStreak = streak + 1;
            const multiplier = getStreakMultiplier(nextStreak);
            const timeBonus = getTimeBonus(nextStreak);
            const earnedPoints = Math.round(10 * multiplier);

            setStreak(nextStreak);
            setMaxStreak((prev) => Math.max(prev, nextStreak));
            setCorrectCount((prev) => prev + 1);
            setScore((prev) => prev + earnedPoints);
            setTimeLeft((prev) => prev + timeBonus);
            setLastPointsEarned(earnedPoints);
            setLastTimeBonus(timeBonus);
            setFeedback('correct');

            if (nextStreak >= 5) {
                playSound('win');
            } else {
                playSound('correct');
            }
        } else {
            playSound('incorrect');
            setStreak(0);
            setTimeLeft((prev) => Math.max(0, prev - 5));
            setFeedback('wrong');
        }

        // Seri oyununda hızlı ve akıcı geçiş (350ms)
        setTimeout(() => {
            setFeedback(null);
            if (currentQuestionIndex + 1 < questions.length) {
                setCurrentQuestionIndex((prev) => prev + 1);
            } else {
                setShowConfetti(true);
                playSound('win');
                setGameState('finished');
            }
        }, 350);
    }, [gameState, feedback, questions, currentQuestionIndex, streak]);

    // Klavye Kısayolları (D veya 1 veya Sol Ok = Doğru; Y veya 2 veya Sağ Ok = Yanlış)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'playing' || feedback) return;
            const key = e.key.toLowerCase();
            if (key === 'd' || key === '1' || key === 'arrowleft') {
                e.preventDefault();
                handleAnswer(true);
            } else if (key === 'y' || key === '2' || key === 'arrowright') {
                e.preventDefault();
                handleAnswer(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, feedback, handleAnswer]);

    const minRequiredCorrect = Math.ceil(questions.length * 0.7);
    const isThresholdPassed = correctCount >= minRequiredCorrect;

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user) {
            router.push(isMission ? '/student/gorevler' : backUrl);
            return;
        }

        setIsSaving(true);
        try {
            if (isMission && topicId) {
                const batch = writeBatch(db);
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: score,
                    context: topicId,
                    gameType: 'dogru-yanlis-zinciri',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isThresholdPassed,
                });

                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(score),
                });

                await batch.commit();

                if (isThresholdPassed) {
                    toast({ title: "Görev Başarılı!", description: `Tebrikler! ${maxStreak} seri ve %70 barajını (${correctCount}/${questions.length} doğru) geçtin, ${score} puan kazandın.`, className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi (Görev Tamamlanmadı)", description: `Görevi geçmek için en az ${minRequiredCorrect} doğru cevap vermelisin.`, variant: "destructive" });
                }
            } else {
                const result = await submitDogruYanlisZinciriScoreAction(user.uid, score, gameContext);
                if (result.success) {
                    toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
                } else {
                    toast({ title: 'Hata', description: result.error, variant: 'destructive' });
                }
            }

            setIsScoreSaved(true);
        } catch (err) {
            console.error(err);
            toast({ title: 'Hata', description: "Puan kaydedilemedi.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestart = () => {
        setScore(0);
        setCorrectCount(0);
        setStreak(0);
        setMaxStreak(0);
        setCurrentQuestionIndex(0);
        setTimeLeft(INITIAL_TIME);
        setGameState('loading');
        setIsScoreSaved(false);
        setShowConfetti(false);
        fetchGameData();
    };

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                <div className="text-center space-y-4 max-w-md bg-slate-900/90 p-8 rounded-3xl border border-white/10 shadow-2xl">
                    <Ghost className="h-16 w-16 text-rose-500 mx-auto" />
                    <h3 className="text-2xl font-black text-white">Oyun Başlatılamadı</h3>
                    <p className="text-slate-400 text-sm">{error}</p>
                    <div className="flex gap-3 pt-2">
                        <Button onClick={handleRestart} variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">
                            <RotateCcw className="mr-2 h-4 w-4" /> Tekrar Dene
                        </Button>
                        <Button asChild className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                            <Link href={isMission ? '/student/gorevler' : backUrl}>Geri Dön</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <WordwallShell
            title="Seri (Doğru / Yanlış)"
            subtitle={topicName}
            currentQuestionIndex={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            score={score}
            timeLeft={timeLeft}
            backUrl={isMission ? '/student/gorevler' : backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-1.5 sm:p-2.5 md:p-3"
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 120, spread: 90 }} />
            </div>

            {gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen
                        score={score}
                        onSave={user ? handleSaveAndExit : undefined}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={handleRestart}
                        backUrl={isMission ? '/student/gorevler' : backUrl}
                        isSuccess={isThresholdPassed}
                        successThreshold={70}
                        isMission={isMission}
                        customMessage={`🔥 En Uzun Seri: ${maxStreak}x | Doğru: ${correctCount}/${questions.length} (${Math.round((correctCount / (questions.length || 1)) * 100)}%)`}
                    />
                </div>
            ) : currentQuestion ? (
                <TrueFalseStage
                    question={currentQuestion}
                    feedback={feedback}
                    streak={streak}
                    maxStreak={maxStreak}
                    lastPointsEarned={lastPointsEarned}
                    lastTimeBonus={lastTimeBonus}
                    onAnswer={handleAnswer}
                />
            ) : null}
        </WordwallShell>
    );
}

export default function Page() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
            </div>
        }>
            <TrueFalseChainGame />
        </Suspense>
    );
}