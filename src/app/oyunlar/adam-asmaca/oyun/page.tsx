'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAdamAsmacaAction, submitAdamAsmacaScoreAction, type HangmanData } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Skull, Trophy, Lightbulb, Ghost, XOctagon, ArrowLeft, RotateCcw, CheckCircle, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { GameEndScreen } from '@/components/game-end-screen';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';

const HANGMAN_STAGES = 6;
const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');

// --- ORTAK ARKA PLAN ---
const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse-slow mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[120px] animate-pulse-slow delay-700 mix-blend-multiply" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[100px] animate-pulse-slow delay-1000 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"></div>
    </div>
);

// --- DRAWING COMPONENT ---
const SketchHangman = ({ mistakes, status }: { mistakes: number, status: 'playing' | 'won' | 'lost' | 'finished' }) => {
    const baseStroke = "stroke-slate-800 stroke-[6px] [stroke-linecap:round] [stroke-linejoin:round]";
    const bodyStroke = "stroke-rose-500 stroke-[5px] [stroke-linecap:round] [stroke-linejoin:round] fill-transparent transition-all duration-500 ease-out";
    
    return (
        <div className="relative w-full h-64 lg:h-96 flex items-center justify-center">
            <div className="absolute inset-2 bg-white/60 rounded-[2rem] border-4 border-slate-100 shadow-inner backdrop-blur-sm" />
            <svg viewBox="0 0 200 250" className="w-auto h-full overflow-visible relative z-10 drop-shadow-xl">
                <g className={baseStroke}>
                    <line x1="20" y1="240" x2="180" y2="240" className="opacity-80" />
                    <line x1="60" y1="240" x2="60" y2="20" />
                    <line x1="60" y1="20" x2="140" y2="20" />
                    <line x1="140" y1="20" x2="140" y2="50" className="stroke-slate-400" />
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

function HangmanGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const mainContentRef = useRef<HTMLDivElement>(null);

    const [gameData, setGameData] = useState<HangmanData[] | null>(null);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
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
    const isMission = mode === 'mission';
    const gameContext = `Adam Asmaca - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    const backUrl = '/oyunlar/adam-asmaca';

    const fetchWords = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getAdamAsmacaAction(params);
        if (result.data) setGameData(result.data);
        else setError(result.error || "Hata oluştu.");
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => { fetchWords(); }, [fetchWords]);

    const currentWordObj = useMemo(() => gameData?.[currentWordIndex], [gameData, currentWordIndex]);
    const isLastQuestion = gameData && currentWordIndex === gameData.length - 1;

    const handleGuess = (letter: string) => {
        if (gameState !== 'playing' || guessedLetters.has(letter) || !currentWordObj) return;
        setGuessedLetters(prev => new Set(prev).add(letter));

        if (!currentWordObj.word.includes(letter)) {
            setWrongGuesses(prev => prev + 1);
            playSound('incorrect');
            setGameShake(true);
            setTimeout(() => setGameShake(false), 500);
        } else {
            playSound('correct');
            // --- PUANLAMA: Her doğru harf 3 Puan ---
            setTotalScore(prev => prev + 3);
        }
    };

    useEffect(() => {
        if (!currentWordObj || gameState !== 'playing') return;
        const isWon = currentWordObj.word.split('').every(l => guessedLetters.has(l));
        if (isWon) {
            setGameState('won');
            // BONUS PUAN KALDIRILDI
            // setTotalScore(prev => prev + 50); 
            setCorrectCount(prev => prev + 1); 
            playSound('correct');
        } else if (wrongGuesses >= HANGMAN_STAGES) {
            setGameState('lost');
            playSound('incorrect');
        }
    }, [guessedLetters, wrongGuesses]);

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

    // --- BAŞARI KONTROLÜ ---
    // Soruların en az yarısını doğru bilmek gerekir.
    const isThresholdPassed = gameData ? correctCount >= Math.ceil(gameData.length / 2) : false;

    const handleFinishAndSave = async () => {
        if (!user || isSaving || isScoreSaved) {
            router.push(isMission ? '/student/gorevler' : backUrl);
            return;
        }
        setIsSaving(true);
        try {
            if (isMission && topicId) {
                // --- GÖREV MODU KAYDI ---
                await addDoc(collection(db, 'scoreEvents'), {
                    userId: user.uid,
                    points: totalScore,
                    context: topicId,
                    gameType: 'adam-asmaca',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isThresholdPassed // Yarısından fazlası doğruysa TRUE
                });

                if (isThresholdPassed) {
                    toast({ title: "Görev Başarılı!", description: "Tebrikler, görevi tamamladın.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Görev Tamamlanamadı", description: "Soruların en az yarısını doğru bilmelisin.", variant: "destructive" });
                }
            } else {
                // --- NORMAL MOD KAYDI ---
                await submitAdamAsmacaScoreAction(user.uid, totalScore, gameContext);
                toast({ title: "Başarılı", description: "Puanınız kaydedildi." });
            }
            setIsScoreSaved(true);
        } catch (e) {
            toast({ title: "Hata", variant: "destructive" });
        } finally { setIsSaving(false); }
    };

    if (isLoading) return <div className="h-screen bg-slate-50 flex items-center justify-center"><MagnificentLightBackground /><Loader2 className="animate-spin h-10 w-10 text-rose-600" /></div>;

    if (gameState === 'finished') {
        return (
            <div className="relative flex items-center justify-center h-screen bg-slate-900">
                <Confetti active={showConfetti} config={{ spread: 360 }} />
                {isMission ? (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white -z-10"></div>
                            
                            <div className="mb-6 flex justify-center">
                                {isThresholdPassed ? <Trophy className="h-16 w-16 text-green-600 animate-bounce" /> : <XOctagon className="h-16 w-16 text-red-500" />}
                            </div>
                            
                            <h2 className="text-3xl font-black text-slate-800 mb-2">{isThresholdPassed ? "GÖREV BAŞARILI!" : "BAŞARISIZ"}</h2>
                            <p className="text-slate-500 mb-6">
                                {isThresholdPassed 
                                    ? `Tebrikler! ${correctCount}/${gameData?.length} doğru ile geçtin.` 
                                    : `Maalesef ${correctCount}/${gameData?.length} doğru yaptın. En az yarısını bilmelisin.`}
                            </p>
                            
                            <div className="space-y-3">
                                {/* PUAN VARSA KAYDET BUTONU GÖRÜNÜR */}
                                {!isScoreSaved && totalScore > 0 && (
                                    <Button onClick={handleFinishAndSave} disabled={isSaving} className={cn("w-full h-12 text-lg font-bold shadow-lg", isThresholdPassed ? "bg-indigo-600 hover:bg-indigo-700" : "bg-amber-600 hover:bg-amber-700")}>
                                        {isSaving ? "Kaydediliyor..." : (isThresholdPassed ? "Kaydet ve Devam Et" : "Puanı Al ve Çık")}
                                    </Button>
                                )}
                                
                                {isScoreSaved && isThresholdPassed && <Button onClick={() => router.push('/student/gorevler')} className="w-full h-12 bg-green-600 font-bold">Görevlere Dön</Button>}
                                
                                {(!isThresholdPassed || isScoreSaved) && <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12 font-bold">Tekrar Dene</Button>}
                                
                                <Button onClick={() => router.push('/student')} variant="ghost" className="w-full text-slate-400">Ana Menü</Button>
                            </div>
                        </div>
                    </div>
                ) : <GameEndScreen score={totalScore} onSave={handleFinishAndSave} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={() => window.location.reload()} backUrl={backUrl} />}
            </div>
        );
    }

    return (
        <div ref={mainContentRef} className={cn("min-h-screen bg-slate-50 relative flex flex-col p-4 md:p-8 transition-all", gameShake && "animate-shake")}>
            <MagnificentLightBackground />
            
            {/* HUD */}
            <div className="max-w-6xl mx-auto w-full flex justify-between items-center mb-8 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl z-20">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puan</span>
                    <span className="text-2xl font-black text-amber-500">{totalScore}</span>
                </div>
                
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Soru</span>
                    <span className="text-lg font-bold">{currentWordIndex + 1}/{gameData?.length}</span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doğru</span>
                        <span className="text-lg font-bold text-green-600">{correctCount}</span>
                    </div>
                    <FullscreenToggle elementRef={mainContentRef} className="bg-slate-100 border-transparent text-slate-600 h-10 w-10 rounded-xl" />
                    <Button onClick={() => setGameState('finished')} variant="ghost" className="text-red-500 hover:bg-red-50 h-10 w-10 p-0 rounded-xl border border-red-100"><XOctagon className="h-5 w-5" /></Button>
                </div>
            </div>

            <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 z-10 flex-grow items-center">
                <SketchHangman mistakes={wrongGuesses} status={gameState} />

                <div className="flex flex-col gap-6">
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[2rem] border border-white shadow-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-2 text-amber-600 font-bold text-xs uppercase tracking-widest">
                            <Lightbulb className="h-4 w-4" /> İpucu
                        </div>
                        <p className="text-xl font-bold text-slate-800 leading-relaxed">{currentWordObj?.hint}</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 lg:gap-3 py-4">
                        {currentWordObj?.word.split('').map((letter, i) => (
                            <div key={i} className={cn(
                                "w-10 h-14 md:w-14 md:h-20 rounded-xl lg:rounded-2xl flex items-center justify-center text-3xl font-black border-2 transition-all duration-300",
                                guessedLetters.has(letter) ? "bg-white border-indigo-200 text-indigo-600 shadow-md transform -translate-y-1" : "bg-slate-100/50 border-dashed border-slate-300 text-transparent"
                            )}>
                                {guessedLetters.has(letter) || gameState === 'lost' ? letter : ''}
                            </div>
                        ))}
                    </div>

                    {gameState !== 'playing' ? (
                        <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4">
                            <h3 className={cn("text-2xl font-black uppercase tracking-tighter", gameState === 'won' ? "text-emerald-500" : "text-rose-500")}>
                                {gameState === 'won' ? 'Harika! Doğru' : 'Olmadı! Kelime: ' + currentWordObj?.word}
                            </h3>
                            <Button onClick={handleNext} className="h-16 px-12 text-xl font-black rounded-2xl bg-slate-900 text-white shadow-2xl hover:scale-[1.02] transition-all w-full">
                                {isLastQuestion ? 'BÖLÜMÜ BİTİR' : 'SIRADAKİ KELİME'} <ArrowLeft className="ml-2 h-6 w-6 rotate-180" />
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 p-4 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-white shadow-inner">
                            {ALPHABET.map(letter => {
                                const isGuessed = guessedLetters.has(letter);
                                return (
                                    <button 
                                        key={letter} 
                                        onClick={() => handleGuess(letter)}
                                        disabled={isGuessed}
                                        className={cn(
                                            "aspect-[3/4] rounded-lg sm:rounded-xl font-bold text-lg transition-all",
                                            !isGuessed ? "bg-white text-slate-700 shadow-sm border-b-4 border-slate-200 hover:bg-slate-50 active:border-0 active:translate-y-1" : "bg-slate-100 text-slate-300 border-0 opacity-40"
                                        )}
                                    >
                                        {letter}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

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
                    20% { transform: translateX(-10px); }
                    40% { transform: translateX(10px); }
                    60% { transform: translateX(-10px); }
                    80% { transform: translateX(10px); }
                }
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
}

export default function HangmanPage() {
    return <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50 font-black text-slate-400 animate-pulse uppercase tracking-widest">Yükleniyor...</div>}><HangmanGame /></Suspense>;
}