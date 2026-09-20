'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getConceptHuntAction, submitConceptHuntScoreAction } from '../actions';
import type { Anagram } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Loader2, ArrowLeft, Trophy, Zap, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';
import { getGameBackUrl } from '@/lib/game-navigation';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';

interface KavramAviBoardProps {
    currentQuestion: Anagram | undefined;
    currentQuestionIndex: number;
    totalQuestions: number;
    userAnswer: { char: string; id: number; colorClass: string }[];
    poolLetters: { char: string; id: number; colorClass: string }[];
    handleUndo: () => void;
    handlePoolClick: (item: any) => void;
    isCorrect: boolean;
    nextLevel: () => void;
    shakeId: number | null;
}

function KavramAviBoard({
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    userAnswer,
    poolLetters,
    handleUndo,
    handlePoolClick,
    isCorrect,
    nextLevel,
    shakeId,
}: KavramAviBoardProps) {
    const { theme } = useWordwall();

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-between gap-4 sm:gap-6 my-auto p-2">
            {/* Tanım / İpucu Kartı */}
            <div className={cn(
                "w-full text-center p-4 sm:p-7 rounded-2xl sm:rounded-3xl border-2 backdrop-blur-xl shadow-xl relative transition-all duration-300 flex flex-col items-center gap-2",
                theme.cardBg,
                theme.cardBorder,
                theme.cardShadow
            )}>
                <div className={cn(
                    "px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5",
                    theme.badgeCounter
                )}>
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Soru {currentQuestionIndex + 1} / {totalQuestions}</span>
                </div>
                <p className={cn("text-base sm:text-2xl md:text-3xl font-black leading-relaxed mt-1", theme.cardText)}>
                    "{currentQuestion?.definition}"
                </p>
            </div>

            {/* Harf Yuvaları (Cevap Alanı) */}
            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2.5 min-h-[3.5rem] sm:min-h-[4.5rem]">
                {Array.from({ length: currentQuestion?.correctAnswer.length || 0 }).map((_, index) => {
                    const letterObj = userAnswer[index];
                    return (
                        <div 
                            key={index}
                            onClick={letterObj ? handleUndo : undefined} 
                            className={cn(
                                "w-9 h-12 sm:w-13 sm:h-16 rounded-xl border-2 flex items-center justify-center text-xl sm:text-3xl font-black transition-all duration-200 select-none",
                                letterObj 
                                    ? cn(theme.buttonSelected, "shadow-md cursor-pointer active:scale-95 animate-in zoom-in-75")
                                    : cn("border-dashed opacity-40", theme.subPanelBg, theme.cardBorder)
                            )}
                        >
                            {letterObj?.char}
                        </div>
                    );
                })}
            </div>

            {/* Harf Bankası / Butonlar */}
            {!isCorrect ? (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-2xl">
                    {poolLetters.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => handlePoolClick(item)}
                            className={cn(
                                "w-11 h-13 sm:w-14 sm:h-16 rounded-xl text-lg sm:text-2xl font-black shadow-md border-2 active:scale-95 transition-all touch-manipulation cursor-pointer",
                                theme.buttonIdle,
                                shakeId === item.id && "animate-shake bg-rose-600 border-rose-400 text-white"
                            )}
                        >
                            {item.char}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="h-16 sm:h-20 flex items-center justify-center animate-in zoom-in duration-200">
                    <button 
                        type="button"
                        onClick={nextLevel} 
                        className={cn(
                            "px-8 sm:px-12 py-3.5 sm:py-4 text-base sm:text-xl font-black rounded-2xl border-2 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2",
                            theme.buttonSelected
                        )}
                    >
                        <span>{currentQuestionIndex === totalQuestions - 1 ? 'SONUÇLARI GÖR' : 'SONRAKİ KAVRAM'}</span>
                        <Zap className="w-5 h-5 fill-current" />
                    </button>
                </div>
            )}
        </div>
    );
}

function KavramAviGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Anagram[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [userAnswer, setUserAnswer] = useState<{ char: string; id: number, colorClass: string }[]>([]);
    const [poolLetters, setPoolLetters] = useState<{ char: string; id: number, colorClass: string }[]>([]);
    
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [isCorrect, setIsCorrect] = useState(false);
    const [shakeId, setShakeId] = useState<number | null>(null);
    const [gameShake, setGameShake] = useState(false);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

    const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Kavram Avı';
    const gameContext = `Kavram Avı - ${searchParams.get('courseName') || 'Genel'} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/kavram-avi' });

    useEffect(() => {
        const fetchGameData = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getConceptHuntAction(params);
            if (result.error || !result.questions || result.questions.length === 0) {
                setError(result.error || "Bu konu için uygun veri bulunamadı.");
            } else {
                setQuestions(result.questions);
                setGameState('playing');
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams]);

    const currentQuestion = questions[currentQuestionIndex];

    const setupQuestion = useCallback((q: Anagram) => {
        setUserAnswer([]);
        setIsCorrect(false);
        const letters = (q.scrambledWord || q.correctAnswer).split('').map((char: string, index: number) => ({
            char,
            id: index,
            colorClass: ""
        }));
        setPoolLetters(letters);
    }, []);

    useEffect(() => {
        if (currentQuestion) {
            setupQuestion(currentQuestion);
        }
    }, [currentQuestion, setupQuestion]);

    const handlePoolClick = (letterObj: { char: string; id: number, colorClass: string }) => {
        if (!currentQuestion || isCorrect) return;

        const currentWordAttempt = userAnswer.map(a => a.char).join('') + letterObj.char;
        const targetPrefix = currentQuestion.correctAnswer.slice(0, currentWordAttempt.length);

        if (currentWordAttempt === targetPrefix) {
            playSound('click');
            setUserAnswer(prev => [...prev, letterObj]);
            setPoolLetters(prev => prev.filter(item => item.id !== letterObj.id));

            if (currentWordAttempt.length === currentQuestion.correctAnswer.length) {
                playSound('correct');
                setIsCorrect(true);
                setScore(s => s + 20);
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 2000);
            }
        } else {
            playSound('incorrect');
            setShakeId(letterObj.id);
            setGameShake(true);
            setTimeout(() => {
                setShakeId(null);
                setGameShake(false);
            }, 500);
        }
    };

    const handleUndo = () => {
        if (userAnswer.length === 0 || isCorrect) return;
        playSound('pop');
        const lastLetter = userAnswer[userAnswer.length - 1];
        setUserAnswer(prev => prev.slice(0, -1));
        setPoolLetters(prev => [...prev, lastLetter]);
    };

    const nextLevel = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            playSound('win');
            setGameState('finished');
        }
    };

    const isAllConceptsFound = questions.length > 0 && currentQuestionIndex === questions.length - 1 && isCorrect;

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
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
                    gameType: 'kavram-avi',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllConceptsFound
                });

                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(score)
                });

                await batch.commit();

                if (isAllConceptsFound) {
                    toast({ title: "Görev Başarılı!", description: "Tüm kavramları buldun ve puanın eklendi.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi", description: "Ancak görev tamamlanmadı.", className: "bg-yellow-600 text-white" });
                }
            } else {
                const result = await submitConceptHuntScoreAction(user.uid, score, gameContext);
                if (result.success) {
                    toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
                } else {
                    toast({ title: "Hata", description: result.error, variant: "destructive" });
                }
            }
            setIsScoreSaved(true);
        } catch (e) {
            console.error(e);
            toast({ title: "Hata", description: "Puan kaydedilemedi.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
                <span className="text-slate-300 font-bold">Kavramlar Yükleniyor...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
                <Alert variant="destructive" className="max-w-md bg-slate-900 border-red-500/40 text-red-200">
                    <AlertTitle className="text-red-400">Oyun Başlatılamadı</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <Button asChild variant="outline" className="mt-4 border-slate-700">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                    </Button>
                </Alert>
            </div>
        );
    }

    return (
        <WordwallShell
            title="Kavram Avı"
            subtitle={topicName}
            currentQuestionIndex={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            score={score}
            backUrl={backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName={cn("w-full h-full min-h-0 overflow-hidden p-2 sm:p-4 flex flex-col justify-center items-center relative", gameShake && "animate-shake")}
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 150, spread: 360 }} />
            </div>

            {gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={score} 
                        onSave={user ? handleSaveAndExit : undefined} 
                        isSaving={isSaving} 
                        scoreSaved={isScoreSaved} 
                        onRestart={() => window.location.reload()} 
                        backUrl={backUrl} 
                        isSuccess={isAllConceptsFound}
                        isMission={isMission}
                        customMessage={
                            isMission 
                                ? (isAllConceptsFound 
                                    ? "Tebrikler! Tüm kavramları doğru bularak görevi başarıyla tamamladın." 
                                    : "Maalesef tüm kavramları bulamadın. Görevi geçmek için tüm kavramları tamamlamalısın.")
                                : undefined
                        }
                    />
                </div>
            ) : (
                <KavramAviBoard
                    currentQuestion={currentQuestion}
                    currentQuestionIndex={currentQuestionIndex}
                    totalQuestions={questions.length}
                    userAnswer={userAnswer}
                    poolLetters={poolLetters}
                    handleUndo={handleUndo}
                    handlePoolClick={handlePoolClick}
                    isCorrect={isCorrect}
                    nextLevel={nextLevel}
                    shakeId={shakeId}
                />
            )}
        </WordwallShell>
    );
}

export default function KavramAviOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-teal-500" /></div>}>
            <KavramAviGame />
        </Suspense>
    );
}