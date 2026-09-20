'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAdamAsmacaAction, submitAdamAsmacaScoreAction, type HangmanData } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb, Ghost, XOctagon, ArrowLeft, RotateCcw, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { GameEndScreen } from '@/components/game-end-screen';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { getGameBackUrl } from '@/lib/game-navigation';

const HANGMAN_STAGES = 6;
const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');

const normalizeText = (text: string) => {
    if (!text) return '';
    return text.toLocaleUpperCase('tr-TR')
        .replace(/Â/g, 'A')
        .replace(/Î/g, 'İ')
        .replace(/Û/g, 'U')
        .replace(/Ê/g, 'E');
};

const SketchHangman = ({ mistakes, status, isDark = true }: { mistakes: number, status: 'playing' | 'won' | 'lost' | 'finished', isDark?: boolean }) => {
    const baseStroke = cn("stroke-[5px] [stroke-linecap:round] [stroke-linejoin:round]", isDark ? "stroke-slate-300" : "stroke-slate-700");
    const ropeStroke = isDark ? "stroke-slate-500" : "stroke-amber-700";
    const bodyStroke = "stroke-rose-400 stroke-[5px] [stroke-linecap:round] [stroke-linejoin:round] fill-transparent transition-all duration-300 ease-out";
    
    return (
        <div className="relative w-full h-32 sm:h-44 md:h-52 max-h-[28vh] flex items-center justify-center">
            <svg viewBox="0 0 200 250" className="w-auto h-full overflow-visible relative z-10 drop-shadow-xl">
                <g className={baseStroke}>
                    <line x1="20" y1="240" x2="180" y2="240" className="opacity-60" />
                    <line x1="60" y1="240" x2="60" y2="20" />
                    <line x1="60" y1="20" x2="140" y2="20" />
                    <line x1="140" y1="20" x2="140" y2="50" className={ropeStroke} />
                </g>
                <g className={cn(status === 'lost' && "swing-animation origin-top")}>
                    {mistakes >= 1 && <circle cx="140" cy="80" r="20" className={cn(bodyStroke, "animate-in zoom-in duration-300")} />}
                    {mistakes >= 2 && <line x1="140" y1="100" x2="140" y2="170" className={cn(bodyStroke, "animate-in slide-in-from-top-4 duration-300")} />}
                    {mistakes >= 3 && <line x1="140" y1="120" x2="110" y2="150" className={cn(bodyStroke, "animate-in slide-in-from-right-4 duration-300")} />}
                    {mistakes >= 4 && <line x1="140" y1="120" x2="170" y2="150" className={cn(bodyStroke, "animate-in slide-in-from-left-4 duration-300")} />}
                    {mistakes >= 5 && <line x1="140" y1="170" x2="110" y2="210" className={cn(bodyStroke, "animate-in slide-in-from-right-4 duration-300")} />}
                    {mistakes >= 6 && <line x1="140" y1="170" x2="170" y2="210" className={cn(bodyStroke, "animate-in slide-in-from-left-4 duration-300")} />}
                </g>
            </svg>
        </div>
    );
};

interface HangmanBoardProps {
    gameState: 'playing' | 'won' | 'lost';
    gameShake: boolean;
    wrongGuesses: number;
    currentWordObj?: HangmanData | null;
    guessedLetters: Set<string>;
    isLastQuestion: boolean;
    handleGuess: (letter: string) => void;
    handleNext: () => void;
}

function HangmanBoard({
    gameState,
    gameShake,
    wrongGuesses,
    currentWordObj,
    guessedLetters,
    isLastQuestion,
    handleGuess,
    handleNext,
}: HangmanBoardProps) {
    const { theme } = useWordwall();

    return (
        <div className={cn("w-full h-full min-h-0 flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6 overflow-hidden", gameShake && "animate-shake")}>
            {/* SOL PANEL: ÇİZİM & İPUCU */}
            <div className={cn(
                "w-full md:w-5/12 max-w-sm flex-shrink-0 flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border-2 backdrop-blur-xl transition-all",
                theme.cardBg,
                theme.cardBorder,
                theme.cardShadow
            )}>
                <SketchHangman mistakes={wrongGuesses} status={gameState} isDark={theme.isDark} />
                
                {/* İPUCU KUTUSU */}
                <div className={cn("w-full mt-2 sm:mt-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all", theme.subPanelBg, theme.cardBorder)}>
                    <div className={cn("flex items-center justify-center gap-1.5 mb-0.5 sm:mb-1 font-bold text-xs uppercase tracking-widest", theme.accentText)}>
                        <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> İpucu
                    </div>
                    <p className={cn("text-xs sm:text-sm md:text-base font-bold leading-snug line-clamp-3", theme.cardText)}>
                        {currentWordObj?.hint}
                    </p>
                </div>
            </div>

            {/* SAĞ PANEL: HARF KUTULARI & 3D KLAVYE */}
            <div className="w-full md:w-7/12 flex-1 min-h-0 flex flex-col justify-center gap-2 sm:gap-3.5">
                {/* GİZLİ KELİME KUTULARI */}
                <div className={cn(
                    "flex flex-wrap justify-center gap-1 sm:gap-2 p-2 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 backdrop-blur-xl min-h-[56px] sm:min-h-[70px] items-center transition-all",
                    theme.cardBg,
                    theme.cardBorder,
                    theme.cardShadow
                )}>
                    {currentWordObj?.word && normalizeText(currentWordObj.word).split('').map((normalizedChar, i) => {
                        const originalChar = currentWordObj.word[i];
                        const isSpecialChar = !ALPHABET.includes(normalizedChar);
                        const isGuessed = isSpecialChar || guessedLetters.has(normalizedChar);

                        if (normalizedChar === ' ') {
                            return <div key={i} className="w-2 sm:w-4" />;
                        }

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "w-8 h-10 sm:w-11 sm:h-14 md:w-13 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-2xl md:text-3xl font-black border-2 transition-all duration-300",
                                    isSpecialChar
                                        ? cn("bg-transparent border-transparent shadow-none", theme.cardText)
                                        : isGuessed
                                            ? cn(theme.buttonSelected, "transform -translate-y-0.5 sm:-translate-y-1")
                                            : gameState === 'lost'
                                                ? "bg-rose-500/20 border-rose-500 text-rose-500"
                                                : theme.isDark
                                                    ? "bg-white/5 border-dashed border-white/20 text-transparent"
                                                    : "bg-slate-100 border-dashed border-slate-300 text-transparent"
                                )}
                            >
                                {isGuessed || gameState === 'lost' ? (isSpecialChar ? originalChar : normalizedChar) : ''}
                            </div>
                        );
                    })}
                </div>

                {/* DURUM BİLDİRİMİ VEYA 3D KLAVYE */}
                {gameState !== 'playing' ? (
                    <div className={cn(
                        "flex flex-col items-center gap-3 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-300 text-center transition-all",
                        theme.cardBg,
                        theme.cardBorder,
                        theme.cardShadow
                    )}>
                        <h3 className={cn(
                            "text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight",
                            gameState === 'won' ? "text-emerald-500" : "text-rose-500"
                        )}>
                            {gameState === 'won' ? 'Harika Bildin!' : `Bilemedin! Doğru Kelime: ${currentWordObj?.word}`}
                        </h3>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="h-12 sm:h-14 md:h-16 px-6 sm:px-10 text-base sm:text-lg md:text-xl font-black rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-xl shadow-emerald-900/40 border-2 border-emerald-400 border-b-[5px] border-b-emerald-950 active:translate-y-1 active:border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer w-full max-w-md mx-auto"
                        >
                            <span>{isLastQuestion ? 'BÖLÜMÜ BİTİR' : 'SIRADAKİ KELİME'}</span>
                            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                ) : (
                    /* 3D WORDWALL TÜRKÇE KLAVYE */
                    <div className={cn(
                        "grid grid-cols-7 sm:grid-cols-9 md:grid-cols-10 gap-1 sm:gap-1.5 p-2 sm:p-3 md:p-4 rounded-2xl sm:rounded-3xl border-2 backdrop-blur-xl transition-all",
                        theme.cardBg,
                        theme.cardBorder,
                        theme.cardShadow
                    )}>
                        {ALPHABET.map((letter) => {
                            const isGuessed = guessedLetters.has(letter);
                            const targetWordNormalized = currentWordObj ? normalizeText(currentWordObj.word) : '';
                            const isCorrectLetter = isGuessed && targetWordNormalized.includes(letter);
                            const isWrongLetter = isGuessed && !targetWordNormalized.includes(letter);

                            return (
                                <button
                                    key={letter}
                                    type="button"
                                    onClick={() => handleGuess(letter)}
                                    disabled={isGuessed}
                                    className={cn(
                                        "h-8 sm:h-10 md:h-11 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm md:text-base transition-all select-none flex items-center justify-center",
                                        !isGuessed
                                            ? cn(theme.buttonIdle, "cursor-pointer active:translate-y-0.5 shadow-md hover:scale-105")
                                            : isCorrectLetter
                                                ? "bg-emerald-600/80 border-emerald-400 text-white opacity-80 scale-95 border-b-0 cursor-default"
                                                : theme.buttonDisabled
                                    )}
                                >
                                    {letter}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function HangmanGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const [gameData, setGameData] = useState<HangmanData[] | null>(null);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
    const [wrongGuesses, setWrongGuesses] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'won' | 'lost' | 'finished'>('playing');
    const [totalScore, setTotalScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [gameShake, setGameShake] = useState(false);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const topicName = searchParams.get('topicName') || 'Adam Asmaca';
    const isMission = mode === 'mission';
    const gameContext = `Adam Asmaca - ${searchParams.get('courseName') || 'Ders'} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: isMission ? '/student/gorevler' : '/oyunlar/adam-asmaca' });

    const fetchWords = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getAdamAsmacaAction(params);
        if (result.error || !result.data || result.data.length === 0) {
            setError(result.error || "Bu konu için henüz kelime verisi bulunamadı.");
        } else {
            setGameData(result.data);
            setGameState('playing');
            setElapsedSeconds(0);
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchWords();
    }, [fetchWords]);

    // Kronometre
    useEffect(() => {
        if (gameState !== 'playing') return;
        const timer = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    const currentWordObj = useMemo(() => {
        if (!gameData || gameData.length === 0) return null;
        return gameData[currentWordIndex];
    }, [gameData, currentWordIndex]);

    const isLastQuestion = gameData ? currentWordIndex === gameData.length - 1 : false;

    const handleGuess = useCallback((letter: string) => {
        if (gameState !== 'playing' || guessedLetters.has(letter) || !currentWordObj) return;

        const updatedGuessed = new Set(guessedLetters);
        updatedGuessed.add(letter);
        setGuessedLetters(updatedGuessed);

        const targetWordNormalized = normalizeText(currentWordObj.word);

        if (targetWordNormalized.includes(letter)) {
            playSound('correct');
            // Kelime tamamlandı mı?
            const isWordComplete = targetWordNormalized.split('').every(char => {
                if (char === ' ' || !ALPHABET.includes(char)) return true;
                return updatedGuessed.has(char);
            });

            if (isWordComplete) {
                setGameState('won');
                playSound('win');
                setTotalScore(prev => prev + 20);
                setCorrectCount(prev => prev + 1);
            }
        } else {
            playSound('incorrect');
            const newWrong = wrongGuesses + 1;
            setWrongGuesses(newWrong);
            setGameShake(true);
            setTimeout(() => setGameShake(false), 500);

            if (newWrong >= HANGMAN_STAGES) {
                setGameState('lost');
                playSound('incorrect');
            }
        }
    }, [gameState, guessedLetters, currentWordObj, wrongGuesses]);

    // Klavye kısayolları (fiziksel klavyeden harf basma)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'playing') return;
            const letter = e.key.toLocaleUpperCase('tr-TR');
            if (ALPHABET.includes(letter)) {
                e.preventDefault();
                handleGuess(letter);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, handleGuess]);

    const handleNext = () => {
        if (!isLastQuestion) {
            setCurrentWordIndex(prev => prev + 1);
            setGuessedLetters(new Set());
            setWrongGuesses(0);
            setGameState('playing');
        } else {
            setGameState('finished');
            if (gameData && correctCount >= Math.ceil(gameData.length / 2)) {
                setShowConfetti(true);
            }
        }
    };

    const isThresholdPassed = gameData ? correctCount >= Math.ceil(gameData.length / 2) : false;

    const handleFinishAndSave = async () => {
        if (!user || isSaving || isScoreSaved) {
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
                    points: totalScore,
                    context: topicId,
                    gameType: 'adam-asmaca',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isThresholdPassed,
                });

                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(totalScore),
                });

                await batch.commit();

                if (isThresholdPassed) {
                    toast({ title: "Görev Başarılı!", description: "Tebrikler, görevi tamamladın ve puanın eklendi.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi (Görev Tamamlanmadı)", description: "Soruların en az yarısını bilmelisin.", variant: "destructive" });
                }
            } else {
                await submitAdamAsmacaScoreAction(user.uid, totalScore, gameContext);
                toast({ title: "Başarılı", description: "Puanınız kaydedildi." });
            }
            setIsScoreSaved(true);
        } catch (e) {
            toast({ title: "Hata", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="animate-spin h-12 w-12 text-rose-500" />
            </div>
        );
    }

    if (!gameData || gameData.length === 0 || error) {
        return (
            <div className="h-screen bg-slate-950 flex items-center justify-center text-center p-4">
                <div className="bg-slate-900/90 backdrop-blur-sm p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full">
                    <XOctagon className="h-16 w-16 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-white mb-2">Kelime Bulunamadı</h2>
                    <p className="text-slate-400 text-sm mb-6">{error || "Bu kategori için henüz kelime eklenmemiş."}</p>
                    <Button onClick={() => router.back()} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold">
                        Geri Dön
                    </Button>
                </div>
            </div>
        );
    }

    const remainingLives = Math.max(0, HANGMAN_STAGES - wrongGuesses);

    return (
        <WordwallShell
            title="Adam Asmaca"
            subtitle={topicName}
            currentQuestionIndex={currentWordIndex + 1}
            totalQuestions={gameData.length}
            score={totalScore}
            lives={remainingLives}
            maxLives={HANGMAN_STAGES}
            timeLeft={elapsedSeconds}
            backUrl={isMission ? '/student/gorevler' : backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-1.5 sm:p-2.5 md:p-3"
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 150, spread: 120 }} />
            </div>

            {gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen
                        score={totalScore}
                        onSave={user ? handleFinishAndSave : undefined}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={() => window.location.reload()}
                        backUrl={isMission ? '/student/gorevler' : backUrl}
                        isSuccess={isThresholdPassed}
                        successThreshold={50}
                        isMission={isMission}
                        customMessage={
                            isMission
                                ? (isThresholdPassed
                                    ? `Tebrikler! ${correctCount}/${gameData?.length} kelimeyi doğru bilerek görevi geçtin.`
                                    : `Maalesef ${correctCount}/${gameData?.length} kelime bildin. Görevi geçmek için kelimelerin en az yarısını bilmelisin.`)
                                : undefined
                        }
                    />
                </div>
            ) : (
                <HangmanBoard
                    gameState={gameState}
                    gameShake={gameShake}
                    wrongGuesses={wrongGuesses}
                    currentWordObj={currentWordObj}
                    guessedLetters={guessedLetters}
                    isLastQuestion={isLastQuestion}
                    handleGuess={handleGuess}
                    handleNext={handleNext}
                />
            )}

            <style jsx global>{`
                @keyframes swing {
                    0% { transform: rotate(3deg); }
                    50% { transform: rotate(-3deg); }
                    100% { transform: rotate(3deg); }
                }
                .swing-animation {
                    animation: swing 2s ease-in-out infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-8px); }
                    80% { transform: translateX(8px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </WordwallShell>
    );
}

export default function HangmanPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-slate-950 font-black text-slate-400 animate-pulse uppercase tracking-widest">
                <Loader2 className="h-12 w-12 animate-spin text-rose-500 mr-3" />
                Yükleniyor...
            </div>
        }>
            <HangmanGame />
        </Suspense>
    );
}