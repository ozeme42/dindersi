
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAdamAsmacaAction, submitAdamAsmacaScoreAction, type HangmanData } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Skull, Heart, AlertTriangle, Save, Home, Repeat, CheckCircle2, Lightbulb, Trophy } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

const KEYBOARD_LETTERS = [
    "A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H", "I", "İ", "J", 
    "K", "L", "M", "N", "O", "Ö", "P", "R", "S", "Ş", "T", "U", "Ü", 
    "V", "Y", "Z"
];


const HangmanFigure = ({ errors }: { errors: number }) => {
    const parts = [
        <line key="base" x1="10" y1="250" x2="150" y2="250" className="animate-draw" />,
        <line key="pole" x1="80" y1="250" x2="80" y2="20" className="animate-draw" />,
        <line key="top" x1="80" y1="20" x2="200" y2="20" className="animate-draw" />,
        <line key="rope" x1="200" y1="20" x2="200" y2="50" className="animate-draw" />,
        <circle key="head" cx="200" cy="80" r="30" className="animate-draw" />,
        <line key="body" x1="200" y1="110" x2="200" y2="170" className="animate-draw" />,
        <line key="armL" x1="200" y1="130" x2="170" y2="160" className="animate-draw" />,
        <line key="armR" x1="200" y1="130" x2="230" y2="160" className="animate-draw" />,
        <line key="legL" x1="200" y1="170" x2="170" y2="210" className="animate-draw" />,
        <line key="legR" x1="200" y1="170" x2="230" y2="210" className="animate-draw" />,
    ];
    
    const visibleParts = [0, 1, 2, 3];
    for (let i = 0; i < errors; i++) {
        visibleParts.push(4 + i);
    }

    return (
        <svg viewBox="0 0 300 270" className="w-full h-full stroke-white stroke-[4px] fill-none stroke-linecap-round stroke-linejoin-round drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            {parts.map((part, index) => (
                <g key={index} className={cn("transition-opacity duration-500", visibleParts.includes(index) ? "opacity-100" : "opacity-0")}>
                    {part}
                </g>
            ))}
        </svg>
    );
};

function HangmanGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const [gameData, setGameData] = useState<HangmanData[] | null>(null);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
    const [wrongGuesses, setWrongGuesses] = useState(0);
    const [roundStatus, setRoundStatus] = useState<'playing' | 'won' | 'lost'>('playing');
    const [score, setScore] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false);

    const gameContext = `Adam Asmaca - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    
    const MAX_ERRORS = 6;

    const fetchWords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            
            const result = await getAdamAsmacaAction(params);
            
            if (result.error || !result.data || result.data.length === 0) {
                setError(result.error || 'Bu konu için oyun verisi bulunamadı.');
            } else {
                setGameData(result.data);
            }
        } catch (e) {
            setError("Kelimeler getirilirken bir hata oluştu.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);
    
    useEffect(() => {
        fetchWords();
    }, [fetchWords]);

    const currentWordObj = useMemo(() => gameData?.[currentWordIndex], [gameData, currentWordIndex]);
    const targetWord = currentWordObj?.word || "";
    
    const handleGuess = useCallback((letter: string) => {
        if (roundStatus !== 'playing' || guessedLetters.has(letter) || !targetWord) return;

        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(10); 
        }

        const newGuessed = new Set(guessedLetters).add(letter);
        setGuessedLetters(newGuessed);

        if (!targetWord.includes(letter)) {
            const newWrong = wrongGuesses + 1;
            setWrongGuesses(newWrong);
            if (newWrong >= MAX_ERRORS) {
                setRoundStatus('lost');
                if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 50, 100]);
            } else {
                playSound('incorrect');
            }
        } else {
            playSound('correct');
            const isWon = targetWord.split('').every(char => newGuessed.has(char));
            if (isWon) {
                setRoundStatus('won');
                setScore(s => s + 100);
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#4f46e5', '#818cf8', '#ffffff'] });
            }
        }
    }, [guessedLetters, roundStatus, targetWord, wrongGuesses, MAX_ERRORS]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const char = e.key.toLocaleUpperCase('tr-TR');
            if (KEYBOARD_LETTERS.includes(char)) {
                handleGuess(char);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleGuess]);

    const handleNextLevel = () => {
        if (currentWordIndex + 1 < (gameData?.length || 0)) {
            setRoundStatus('playing'); // Reset status BEFORE changing word
            setCurrentWordIndex(prev => prev + 1);
            setGuessedLetters(new Set());
            setWrongGuesses(0);
        } else {
            handleFinishGame();
        }
    };
    
    const handleFinishGame = async () => {
        setIsSubmitting(true);
        if (user?.uid && score > 0) {
            await submitAdamAsmacaScoreAction(user.uid, score, gameContext);
        }
        router.push('/student/activities');
    };

    const backUrl = '/student/adam-asmaca';

    if (isLoading) return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#1a0b2e] text-white space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            <p className="text-indigo-300 font-medium animate-pulse">Kelimeler Hazırlanıyor...</p>
        </div>
    );
    
    if (error) return (
         <div className="flex h-screen w-full flex-col items-center justify-center bg-[#1a0b2e] text-white p-6 text-center">
             <Skull className="h-20 w-20 text-red-500 mb-4 opacity-80" />
            <h2 className="text-2xl font-bold mb-2">Eyvah! Bir Sorun Var</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <Link href={backUrl}>
                <Button variant="outline" className="border-white/20 hover:bg-white/10 text-white">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Ayarlara Dön
                </Button>
            </Link>
        </div>
    );
    
    if (!currentWordObj) return null;
    
    const isGameOver = roundStatus === 'won' || roundStatus === 'lost';

    return (
        <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950 via-[#2b1055] to-black text-white font-sans overflow-hidden flex flex-col">
            <style jsx global>{`
              @keyframes draw { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
              .animate-draw { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: draw 1s ease-out forwards; }
              .rotate-x-90 { transform: rotateX(90deg); }
              .rotate-x-0 { transform: rotateX(0deg); }
            `}</style>
            
            <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
                <Link href={backUrl}><Button size="icon" variant="ghost" className="rounded-full text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft className="h-6 w-6" /></Button></Link>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-indigo-600/20 px-3 py-1 rounded-full border border-indigo-500/30">
                        <Trophy className="h-4 w-4 text-amber-400" />
                        <span className="font-bold text-amber-100">{score}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-400">{currentWordIndex + 1} / {gameData.length}</div>
                </div>
            </div>

            <div className="flex-grow flex flex-col md:flex-row max-w-6xl mx-auto w-full p-2 md:p-6 gap-6 overflow-y-auto">
                <div className="flex-1 flex items-center justify-center min-h-[250px] relative bg-black/20 rounded-3xl border border-white/5 shadow-inner">
                    <div className="w-64 h-64 relative">
                        <HangmanFigure errors={wrongGuesses} />
                        {roundStatus === 'won' && (
                            <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-300">
                                <div className="bg-green-600/90 p-4 rounded-2xl shadow-2xl backdrop-blur-sm text-center transform rotate-[-5deg]"><Trophy className="h-12 w-12 text-yellow-300 mx-auto mb-2 animate-bounce" /><h3 className="text-2xl font-black uppercase tracking-widest text-white">Harika!</h3></div>
                            </div>
                        )}
                        {roundStatus === 'lost' && (
                            <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-300">
                                <div className="bg-red-600/90 p-4 rounded-2xl shadow-2xl backdrop-blur-sm text-center transform rotate-[5deg]"><Skull className="h-12 w-12 text-white mx-auto mb-2" /><h3 className="text-2xl font-black uppercase tracking-widest text-white">Kaybettin</h3></div>
                            </div>
                        )}
                    </div>
                    <div className="absolute top-4 left-4 flex gap-1">
                        {[...Array(MAX_ERRORS)].map((_, i) => (
                            <Heart key={i} className={cn("h-5 w-5 transition-all duration-300", i < (MAX_ERRORS - wrongGuesses) ? "text-red-500 fill-red-500" : "text-slate-700 fill-slate-800")} />
                        ))}
                    </div>
                </div>

                <div className="flex-[1.5] flex flex-col gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0"><Lightbulb className="h-6 w-6 text-amber-400" /></div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">İpucu</h4>
                            <p className="text-lg font-medium text-white">{currentData.hint}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 py-4 min-h-[80px]">
                        {targetWord.split('').map((char, index) => {
                            const isRevealed = guessedLetters.has(char) || roundStatus === 'lost';
                            const isLostReveal = roundStatus === 'lost' && !guessedLetters.has(char);
                            return (
                                <div key={index} className={cn("w-10 h-12 sm:w-12 sm:h-16 flex items-center justify-center text-2xl sm:text-3xl font-bold rounded-xl border-b-4 transition-all duration-500",
                                    isRevealed ? "bg-indigo-600 border-indigo-800 text-white" : "bg-white/10 border-white/20",
                                    isLostReveal && "bg-red-500/50 border-red-500 text-red-100"
                                )}>{isRevealed ? char : ''}</div>
                            );
                        })}
                    </div>
                    
                    <div className={cn("grid grid-cols-7 sm:grid-cols-8 gap-1.5 sm:gap-2 transition-opacity duration-300", isGameOver && "opacity-50 pointer-events-none")}>
                        {KEYBOARD_LETTERS.map((letter) => {
                            const isGuessed = guessedLetters.has(letter);
                            const isWrong = isGuessed && !targetWord.includes(letter);
                            const isCorrect = isGuessed && targetWord.includes(letter);
                            return (
                                <button key={letter} onClick={() => handleGuess(letter)} disabled={isGuessed || isGameOver}
                                    className={cn("h-10 sm:h-12 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 shadow-sm border-b-[3px] active:border-b-0 active:translate-y-[3px]",
                                    isCorrect ? "bg-green-600 border-green-800 text-white" : isWrong ? "bg-slate-700 border-slate-800 text-slate-500 opacity-50" : "bg-white text-slate-900 border-slate-300 hover:bg-indigo-50")}>
                                    {letter}
                                </button>
                            );
                        })}
                    </div>

                    {isGameOver && (
                        <div className="mt-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
                             <Button 
                                onClick={handleNextLevel}
                                disabled={isSubmitting}
                                className={cn("w-full py-6 text-lg font-black uppercase tracking-widest rounded-xl shadow-xl transition-all",
                                roundStatus === 'won' ? "bg-green-500 hover:bg-green-400 text-white shadow-green-900/40" : "bg-slate-600 hover:bg-slate-500 text-white")}
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : currentWordIndex + 1 < gameData.length ? "Sonraki Kelime" : "Oyunu Bitir & Puanı Kaydet"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


function AdamAsmacaGamePageWrapper() {
  return (
    <Suspense fallback={
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#1a0b2e] text-white space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
        </div>
    }>
      <HangmanGame />
    </Suspense>
  );
}

export default AdamAsmacaGamePageWrapper;
