'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '@/app/oyunlar/bil-bakalim/actions';
import type { Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Ghost, CheckCircle2, Flame, Trophy, XOctagon, BrainCircuit, Lightbulb, RotateCcw, Home, CheckCircle, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { getGameBackUrl } from '@/lib/game-navigation';

// --- RENK PALETİ ---
const BORDER_COLORS = [
    'border-b-rose-500',
    'border-b-amber-500',
    'border-b-emerald-500',
    'border-b-sky-500',
    'border-b-indigo-500',
    'border-b-violet-500',
    'border-b-fuchsia-500',
    'border-b-orange-500',
    'border-b-cyan-500',
    'border-b-lime-500'
];

interface BilBakalimBoardProps {
    currentQuestion?: Partial<Question> | null;
    feedbackState: 'idle' | 'correct' | 'wrong';
    allTerms: string[];
    activeTermId: string | null;
    handleAnswer: (term: string) => void;
}

function BilBakalimBoard({
    currentQuestion,
    feedbackState,
    allTerms,
    activeTermId,
    handleAnswer,
}: BilBakalimBoardProps) {
    const { theme } = useWordwall();

    return (
        <div className="w-full h-full min-h-0 flex flex-col justify-between items-center gap-3 sm:gap-4 overflow-hidden max-w-6xl mx-auto">
            {/* İPUCU / SORU KARTI */}
            <div className={cn(
                "w-full p-3 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border-2 backdrop-blur-xl transition-all text-center flex-shrink-0",
                theme.cardBg,
                theme.cardBorder,
                theme.cardShadow,
                feedbackState === 'correct' && "border-emerald-500/80 bg-emerald-950/30",
                feedbackState === 'wrong' && "border-rose-500/80 bg-rose-950/30"
            )}>
                <div className={cn("inline-flex items-center justify-center gap-1.5 mb-1 sm:mb-1.5 px-3 py-0.5 rounded-full border text-xs font-black uppercase tracking-widest", theme.badgeCounter)}>
                    <Lightbulb className="w-3.5 h-3.5" /> İpucu
                </div>
                <h2 className={cn(
                    "text-sm sm:text-lg md:text-xl lg:text-2xl font-black leading-snug",
                    feedbackState === 'correct' ? "text-emerald-500" : feedbackState === 'wrong' ? "text-rose-500" : theme.cardText
                )}>
                    {currentQuestion?.text}
                </h2>
            </div>

            {/* KAVRAM BUTONLARI MATRİSİ */}
            <div className="w-full flex-1 min-h-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 overflow-y-auto no-scrollbar p-1">
                {allTerms.map((term) => {
                    const isActive = activeTermId === term;
                    const isWrong = isActive && feedbackState === 'wrong';
                    const isCorrect = isActive && feedbackState === 'correct';

                    return (
                        <button
                            key={term}
                            type="button"
                            onClick={() => handleAnswer(term)}
                            disabled={feedbackState !== 'idle'}
                            className={cn(
                                "relative rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm md:text-base transition-all duration-200 select-none cursor-pointer flex items-center justify-center p-2.5 sm:p-3.5 text-center leading-tight border-2 border-b-[5px] sm:border-b-[6px] active:translate-y-1 active:border-b-2 shadow-md",
                                !isActive && cn(theme.buttonIdle, "hover:-translate-y-0.5 hover:shadow-xl hover:brightness-105"),
                                isCorrect && "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-105 z-10",
                                isWrong && "bg-rose-600 border-rose-400 text-white animate-shake shadow-[0_0_25px_rgba(244,63,94,0.5)] z-10",
                                feedbackState !== 'idle' && !isActive && "opacity-30 grayscale scale-95"
                            )}
                        >
                            <span className={cn("line-clamp-3 break-words", theme.isDark && "drop-shadow")}>{term}</span>
                            {isCorrect && (
                                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg animate-bounce">
                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function BilBakalimGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const [queue, setQueue] = useState<Partial<Question>[]>([]); 
    const [allTerms, setAllTerms] = useState<string[]>([]);
    
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'won' | 'error' | 'finished'>('loading');
    
    const [score, setScore] = useState(0);
    const [correctStreak, setCorrectStreak] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [shakeScreen, setShakeScreen] = useState(false);
    const [activeTermId, setActiveTermId] = useState<string | null>(null); 

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

    const gameContext = `Bil Bakalım - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/bil-bakalim' });
    
    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            topicId: searchParams.get('topicId') || undefined,
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
        };
        const result = await getBilBakalimAction(params);
        
        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu konu için uygun soru bulunamadı.");
            setGameState('error');
        } else {
            const shuffled = [...result.questions].sort(() => Math.random() - 0.5);
            const terms = [...new Set(result.questions.map(q => q.correctAnswer))].sort((a, b) => (a||"").localeCompare(b||"", 'tr')) as string[];
            setQueue(shuffled);
            setAllTerms(terms);
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);

    const currentQuestion = queue.length > 0 ? queue[0] : null;

    const handleAnswer = (selectedTerm: string) => {
        if (feedbackState !== 'idle' || !currentQuestion) return;
        setActiveTermId(selectedTerm);

        if (selectedTerm === currentQuestion.correctAnswer) {
            // DOĞRU CEVAP: +5 Puan
            const newStreak = correctStreak + 1;
            setCorrectStreak(newStreak);
            setScore(prev => prev + 5); 
            setFeedbackState('correct');
            playSound('correct');

            setTimeout(() => {
                const updatedQueue = queue.slice(1);
                setQueue(updatedQueue);
                setFeedbackState('idle');
                setActiveTermId(null);
                if (updatedQueue.length === 0) {
                    setGameState('won'); // Oyun bitti (kazandı)
                    setShowConfetti(true);
                    playSound('win');
                }
            }, 800);
        } else {
            // YANLIŞ CEVAP: -2 Puan (Ceza)
            setCorrectStreak(0);
            setScore(prev => Math.max(0, prev - 2));
            setFeedbackState('wrong');
            playSound('incorrect');
            setShakeScreen(true);

            setTimeout(() => {
                setShakeScreen(false);
                setQueue(prev => {
                    if (!prev[0]) return prev;
                    // Yanlış bilinen soruyu sona at
                    const [wrongQ, ...rest] = prev;
                    return [...rest, wrongQ];
                });
                setFeedbackState('idle');
                setActiveTermId(null);
            }, 800);
        }
    };

    // GÖREV BAŞARILI MI?
    // Oyun "won" durumuna geldiyse tüm sorular bilinmiştir.
    const isAllSolved = gameState === 'won';

    const handleSaveAndExit = async () => {
        if (!user || isSaving || isScoreSaved) {
            // Puanı yoksa veya kaydedildiyse çık
            if(score <= 0 && !isScoreSaved) {
                 router.push(backUrl);
                 return;
            }
        }
        
        // Puan varsa kaydetmeye çalış (Görev başarısız olsa bile puanı alabilir)
        if (score > 0 && !isScoreSaved && user) {
            setIsSaving(true);
            try {
                if (isMission && topicId) {
                    // --- GÖREV MODU KAYDI (LİDERLİK TABLOSU GÜNCELLENDİ) ---
                    const batch = writeBatch(db);

                    // 1. Etkinlik Kaydı (scoreEvents)
                    const eventRef = doc(collection(db, 'scoreEvents'));
                    batch.set(eventRef, {
                        userId: user.uid,
                        points: score,
                        context: topicId,
                        gameType: 'bil-bakalim',
                        timestamp: serverTimestamp(),
                        isMission: true,
                        completed: isAllSolved
                    });

                    // 2. Kullanıcı Profilini Güncelleme (users -> score)
                    const userRef = doc(db, 'users', user.uid);
                    batch.update(userRef, {
                        score: increment(score)
                    });

                    // İşlemleri Kaydet
                    await batch.commit();

                    if (isAllSolved) {
                        toast({ title: "Görev Başarılı!", description: "Tüm kavramları bildin ve puanın kaydedildi.", className: "bg-green-600 text-white" });
                    } else {
                        toast({ title: "Puan Kaydedildi", description: "Ancak tüm soruları bitirmedin.", className: "bg-yellow-600 text-white" });
                    }
                } else {
                    // --- NORMAL MOD KAYDI ---
                    const result = await submitBilBakalimScoreAction(user.uid, score, gameContext);
                    if(result.success) {
                        toast({ title: "Başarılı", description: "Puanın kaydedildi." });
                    } else {
                        toast({ title: "Hata", description: result.error, variant: "destructive" });
                    }
                }
                setIsScoreSaved(true);
            } catch (error) {
                console.error(error);
                toast({ title: "Hata", description: "Puan kaydedilemedi.", variant: "destructive" });
            } finally {
                setIsSaving(false);
            }
        } else {
             // Puan yoksa direkt çık
             router.push(backUrl);
        }
    };
    
    const handleRestart = () => {
        setScore(0);
        setCorrectStreak(0);
        setIsScoreSaved(false);
        setGameState('loading');
        setShowConfetti(false);
        fetchGameData();
    };

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (gameState === 'error') {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-50">
                 <div className="text-center space-y-4 max-w-md bg-white p-8 rounded-[2rem] border border-red-100 shadow-xl">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Ghost className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Oyun Başlatılamadı</h3>
                    <p className="text-slate-500 mb-6 font-medium">{error}</p>
                    <Button asChild className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    const currentQIndex = allTerms.length - queue.length;
    const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Bil Bakalım';

    return (
        <WordwallShell
            title="Bil Bakalım"
            subtitle={topicName}
            currentQuestionIndex={currentQIndex}
            totalQuestions={allTerms.length}
            score={score}
            backUrl={backUrl}
            isFinished={gameState === 'won' || gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-2 sm:p-4"
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 140, spread: 120 }} />
            </div>

            {gameState === 'won' || gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={score}
                        onSave={user ? handleSaveAndExit : undefined}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={handleRestart}
                        backUrl={backUrl}
                        isSuccess={isAllSolved}
                        isMission={isMission}
                        customMessage={
                            isMission 
                                ? (isAllSolved 
                                    ? "Tebrikler! Tüm kavramları bilerek görevi başarıyla tamamladın." 
                                    : "Maalesef tüm kavramları bilemedin. Görevi geçmek için tüm soruları doğru tamamlamalısın.")
                                : undefined
                        }
                    />
                </div>
            ) : (
                <div className={cn("w-full h-full min-h-0 overflow-hidden", shakeScreen && "animate-shake")}>
                    <BilBakalimBoard
                        currentQuestion={currentQuestion}
                        feedbackState={feedbackState}
                        allTerms={allTerms}
                        activeTermId={activeTermId}
                        handleAnswer={handleAnswer}
                    />
                </div>
            )}
        </WordwallShell>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <BilBakalimGame />
        </Suspense>
    );
}