'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCumleOlusturmaAction, submitCumleOlusturmaScoreAction, type ScrambledSentenceData } from '@/app/oyunlar/cumle-olusturma/actions';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Trophy, Sparkles, RefreshCcw, MousePointerClick, XOctagon, CheckCircle, RotateCcw, Home, Save } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { getGameBackUrl } from '@/lib/game-navigation';

// Kelime Kartı Bileşeni
const WordButton = ({ 
    word, 
    onClick, 
    colorClass, 
    disabled, 
    isShaking 
}: { 
    word: string, 
    onClick?: () => void, 
    colorClass: string, 
    disabled?: boolean,
    isShaking?: boolean
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "relative group px-6 py-4 md:px-8 md:py-5 rounded-2xl font-black text-xl md:text-3xl transition-all duration-200 border-b-[6px] md:border-b-[8px] active:border-b-0 active:translate-y-2 outline-none select-none touch-manipulation",
                isShaking && "animate-shake bg-red-500 border-red-700 !text-white",
                !isShaking && colorClass,
                disabled && "opacity-0 pointer-events-none scale-0 overflow-hidden w-0 h-0 p-0 m-0 border-0"
            )}
        >
            <span className="relative z-10 drop-shadow-md">{word}</span>
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
};

const WORD_COLORS = [
    'bg-indigo-500 border-indigo-700 text-white',
    'bg-pink-500 border-pink-700 text-white',
    'bg-cyan-500 border-cyan-700 text-slate-900',
    'bg-emerald-500 border-emerald-700 text-white',
    'bg-amber-400 border-amber-600 text-slate-900',
    'bg-violet-500 border-violet-700 text-white',
    'bg-rose-500 border-rose-700 text-white',
    'bg-lime-500 border-lime-700 text-slate-900',
];

function shuffleArray(array: { id: string, word: string }[]) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

interface SentenceGameBoardProps {
    isLevelComplete: boolean;
    placedWords: string[];
    poolWords: { id: string; word: string; color: string }[];
    shakingWordId: string | null;
    currentSentenceIndex: number;
    totalSentences: number;
    handleWordClick: (id: string, word: string) => void;
    handleRestartCurrent: () => void;
    nextSentence: () => void;
}

function SentenceGameBoard({
    isLevelComplete,
    placedWords,
    poolWords,
    shakingWordId,
    currentSentenceIndex,
    totalSentences,
    handleWordClick,
    handleRestartCurrent,
    nextSentence,
}: SentenceGameBoardProps) {
    const { theme } = useWordwall();

    return (
        <div className="w-full h-full min-h-0 flex flex-col justify-between items-center gap-3 sm:gap-5 overflow-hidden max-w-5xl mx-auto">
            {/* HEDEF CÜMLE ALANI */}
            <div className={cn(
                "relative w-full min-h-[100px] sm:min-h-[140px] md:min-h-[180px] rounded-2xl sm:rounded-3xl border-2 sm:border-3 border-dashed transition-all duration-300 p-3 sm:p-6 flex flex-wrap gap-2 sm:gap-3 items-center justify-center content-center shadow-inner",
                theme.subPanelBg,
                isLevelComplete 
                    ? "border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]" 
                    : theme.cardBorder
            )}>
                {placedWords.length === 0 && (
                    <div className={cn("absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-pulse", theme.subText)}>
                        <MousePointerClick className="h-7 w-7 sm:h-10 sm:w-10 mb-1 opacity-60" />
                        <p className="text-xs sm:text-base md:text-lg font-bold uppercase tracking-widest opacity-80">Kelimelere Dokunarak Cümleyi Kur</p>
                    </div>
                )}

                {placedWords.map((word, index) => (
                    <div key={index} className={cn(
                        "px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl font-black text-sm sm:text-xl md:text-2xl shadow-md animate-in zoom-in duration-200 border-2",
                        theme.buttonSelected
                    )}>
                        {word}
                    </div>
                ))}
            </div>

            {/* TEBRİK VEYA KELİME HAVUZU */}
            {isLevelComplete ? (
                <div className={cn(
                    "animate-in slide-in-from-bottom-4 zoom-in duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 shadow-2xl w-full max-w-xl my-auto",
                    theme.cardBg,
                    theme.cardBorder,
                    theme.cardShadow
                )}>
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/20 p-2 sm:p-2.5 rounded-full text-emerald-400">
                            <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10" />
                        </div>
                        <div>
                            <p className="text-lg sm:text-2xl font-black text-emerald-500">Harika!</p>
                            <p className={cn("text-xs sm:text-sm font-bold", theme.subText)}>Doğru sıralama yapıldı.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={nextSentence}
                        className="w-full sm:w-auto h-11 sm:h-13 px-6 sm:px-8 text-base sm:text-lg font-black rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg border-2 border-emerald-400 border-b-[5px] border-b-emerald-950 active:translate-y-1 active:border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <span>{currentSentenceIndex === totalSentences - 1 ? "Bölümü Bitir" : "Sıradaki Cümle"}</span>
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </div>
            ) : (
                <div className={cn(
                    "w-full p-3 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border-2 backdrop-blur-xl transition-all flex flex-col justify-between",
                    theme.cardBg,
                    theme.cardBorder,
                    theme.cardShadow
                )}>
                    <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 justify-center items-center">
                        {poolWords.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleWordClick(item.id, item.word)}
                                className={cn(
                                    "relative px-4 py-2 sm:px-6 sm:py-3.5 md:px-7 md:py-4 rounded-xl sm:rounded-2xl font-black text-sm sm:text-lg md:text-xl transition-all duration-200 border-2 border-b-[5px] sm:border-b-[6px] active:border-b-2 active:translate-y-1 select-none cursor-pointer shadow-md",
                                    shakingWordId === item.id 
                                        ? "animate-shake bg-rose-600 border-rose-800 text-white"
                                        : cn(theme.buttonIdle, "hover:-translate-y-0.5 hover:shadow-xl hover:brightness-105")
                                )}
                            >
                                <span className={cn("relative z-10", theme.isDark && "drop-shadow")}>{item.word}</span>
                            </button>
                        ))}
                    </div>
                    
                    {placedWords.length > 0 && (
                        <div className="mt-3 sm:mt-5 flex justify-center">
                            <button
                                type="button"
                                onClick={handleRestartCurrent}
                                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer", theme.themePillIdle)}
                            >
                                <RefreshCcw className="h-3.5 w-3.5" /> Cümleyi Sıfırla
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SentenceClickGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [sentences, setSentences] = useState<ScrambledSentenceData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [targetWords, setTargetWords] = useState<string[]>([]); 
    const [placedWords, setPlacedWords] = useState<string[]>([]);
    const [poolWords, setPoolWords] = useState<{ id: string, word: string, color: string }[]>([]); 
    const [originalPoolBackup, setOriginalPoolBackup] = useState<{ id: string, word: string, color: string }[]>([]);
    
    const [shakingWordId, setShakingWordId] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [isLevelComplete, setIsLevelComplete] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // GÖREV MODU PARAMETRELERİ
    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Cümle Oluşturma';
    const isMission = mode === 'mission';

    const gameContext = `Cümle Kurma - ${searchParams.get('courseName') || 'Genel'} > ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/cumle-olusturma' });

    const fetchSentences = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getCumleOlusturmaAction(params);
        if (result.error || !result.data || result.data.length === 0) {
            setError(result.error || 'Uygun cümle bulunamadı.');
        } else {
            setSentences(result.data);
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchSentences();
    }, [fetchSentences]);

    useEffect(() => {
        if (sentences.length > 0) {
            const sentence = sentences[currentSentenceIndex].correctSentence;
            const splitWords = sentence.split(' ').filter(w => w.trim() !== '');
            
            setTargetWords(splitWords);
            setPlacedWords([]);
            setIsLevelComplete(false);

            const wordsWithIds = splitWords.map((word, index) => ({
                id: `${word}-${index}`,
                word: word
            }));
            
            const shuffled = shuffleArray(wordsWithIds);
            
            const coloredPool = shuffled.map((item, index) => ({
                ...item,
                color: WORD_COLORS[index % WORD_COLORS.length]
            }));

            setPoolWords(coloredPool);
            setOriginalPoolBackup(coloredPool);
        }
    }, [sentences, currentSentenceIndex]);

    const handleWordClick = (id: string, clickedWord: string) => {
        if (isLevelComplete) return;

        const nextWordIndex = placedWords.length;
        const expectedWord = targetWords[nextWordIndex];

        if (clickedWord === expectedWord) {
            playSound('pop');
            setPlacedWords(prev => [...prev, clickedWord]);
            setPoolWords(prev => prev.filter(w => w.id !== id));
            
            // HER KELİME 10 PUAN
            setScore(prev => prev + 10);

            if (nextWordIndex + 1 === targetWords.length) {
                setTimeout(() => {
                    setIsLevelComplete(true);
                    playSound('correct');
                }, 300);
            }
        } else {
            playSound('incorrect');
            setShakingWordId(id);
            setTimeout(() => setShakingWordId(null), 500); 
        }
    };

    const handleRestartCurrent = () => {
        setPlacedWords([]);
        setPoolWords(originalPoolBackup);
        setScore(prev => Math.max(0, prev - 10)); // Hata cezası
    };

    const nextSentence = () => {
        if (currentSentenceIndex < sentences.length - 1) {
            setCurrentSentenceIndex(prev => prev + 1);
        } else {
            setGameState('finished');
            setShowConfetti(true);
        }
    };

    // --- BAŞARI KONTROLÜ ---
    // Görevin "Tamamlandı" sayılması için tüm cümlelerin bitmesi gerek.
    const isAllSentencesCompleted = gameState === 'finished' && isLevelComplete && currentSentenceIndex === sentences.length - 1;

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user) {
            router.push(backUrl);
            return;
        }
        
        setIsSaving(true);
        try {
            if (isMission && topicId) {
                // --- GÖREV MODU KAYDI (LİDERLİK TABLOSU DÜZELTİLDİ) ---
                const batch = writeBatch(db);

                // 1. Etkinlik Kaydı (scoreEvents)
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: score, // Kazanılan puanı kaydediyoruz (başarısız olsa bile)
                    context: topicId,
                    gameType: 'cumle-olusturma',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllSentencesCompleted // Sadece hepsi bittiyse TRUE
                });

                // 2. Kullanıcı Profilini Güncelleme (users -> score)
                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(score)
                });

                // Batch İşlemini Uygula
                await batch.commit();

                if (isAllSentencesCompleted) {
                    toast({ title: "Görev Başarılı!", description: "Harika iş çıkardın ve puanın kaydedildi!", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi", description: "Ancak görev tamamlanmadı.", className: "bg-yellow-600 text-white" });
                }
            } else {
                // --- NORMAL MOD KAYDI ---
                await submitCumleOlusturmaScoreAction(user.uid, score, gameContext);
                toast({ title: 'Kaydedildi!', description: 'Puanın başarıyla işlendi.' });
            }
            
            setIsScoreSaved(true);
        } catch (e) {
            console.error(e);
            toast({ title: 'Hata', description: "Puan kaydedilemedi.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }

    const handleGameRestart = () => {
        setCurrentSentenceIndex(0);
        setScore(0);
        setGameState('playing');
        setIsLevelComplete(false);
        setIsScoreSaved(false);
        setShowConfetti(false);
        setSentences(prev => [...prev].sort(() => Math.random() - 0.5));
    }

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-400" /><span className="ml-4 text-xl text-white font-bold animate-pulse">Hazırlanıyor...</span></div>;
    
    if (error) return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-red-400 p-8 text-center">
            <div>
                <h2 className="text-2xl font-bold mb-4">Hata</h2>
                <p>{error}</p>
                <Button asChild className="mt-4" variant="secondary"><Link href={backUrl}>Geri Dön</Link></Button>
            </div>
        </div>
    );

    return (
        <WordwallShell
            title="Cümle Oluşturma"
            subtitle={topicName}
            currentQuestionIndex={currentSentenceIndex}
            totalQuestions={sentences.length}
            score={score}
            backUrl={backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-2 sm:p-4"
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 140, spread: 120 }} />
            </div>

            {gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={score} 
                        onSave={user ? handleSaveAndExit : undefined} 
                        isSaving={isSaving} 
                        scoreSaved={isScoreSaved} 
                        onRestart={handleGameRestart} 
                        backUrl={backUrl} 
                        isSuccess={isAllSentencesCompleted}
                        isMission={isMission}
                        customMessage={
                            isMission 
                                ? (isAllSentencesCompleted 
                                    ? `Tebrikler! Tüm cümleleri doğru oluşturarak görevi başarıyla tamamladın.` 
                                    : `Maalesef tüm cümleleri bitiremedin. Görevi geçmek için tüm cümleleri tamamlamalısın.`)
                                : undefined
                        }
                    />
                </div>
            ) : (
                <SentenceGameBoard
                    isLevelComplete={isLevelComplete}
                    placedWords={placedWords}
                    poolWords={poolWords}
                    shakingWordId={shakingWordId}
                    currentSentenceIndex={currentSentenceIndex}
                    totalSentences={sentences.length}
                    handleWordClick={handleWordClick}
                    handleRestartCurrent={handleRestartCurrent}
                    nextSentence={nextSentence}
                />
            )}

            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                .animate-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </WordwallShell>
    );
}

export default function Page() {
    return <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-16 w-16 animate-spin text-white" /></div>}><SentenceClickGame /></Suspense>;
}