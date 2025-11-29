'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { 
    ArrowLeft, RefreshCw, Heart, Trophy, HelpCircle, Skull, Home, Lightbulb, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useAuth } from '@/context/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import type { HangmanData } from '../actions';
import { getAdamAsmacaAction, submitAdamAsmacaScoreAction } from '../actions';
import Link from "next/link";


// --- ANIMATED HANGMAN SVG COMPONENT ---
const HangmanFigure = ({ errors }: { errors: number }) => {
    // SVG Paths for each part
    const parts = [
        <line key="base" x1="10" y1="250" x2="150" y2="250" className="animate-draw" />, // 0: Base
        <line key="pole" x1="80" y1="250" x2="80" y2="20" className="animate-draw" />,   // 1: Pole
        <line key="top" x1="80" y1="20" x2="200" y2="20" className="animate-draw" />,    // 2: Top
        <line key="rope" x1="200" y1="20" x2="200" y2="50" className="animate-draw" />,  // 3: Rope
        <circle key="head" cx="200" cy="80" r="30" className="animate-draw" />,          // 4: Head
        <line key="body" x1="200" y1="110" x2="200" y2="170" className="animate-draw" />,// 5: Body
        <line key="armL" x1="200" y1="130" x2="170" y2="160" className="animate-draw" />,// 6: Left Arm
        <line key="armR" x1="200" y1="130" x2="230" y2="160" className="animate-draw" />,// 7: Right Arm
        <line key="legL" x1="200" y1="170" x2="170" y2="210" className="animate-draw" />,// 8: Left Leg
        <line key="legR" x1="200" y1="170" x2="230" y2="210" className="animate-draw" />,// 9: Right Leg
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

// --- KEYBOARD COMPONENT ---
const KEYBOARD_LETTERS = [
    "A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H", "I", "İ", "J", 
    "K", "L", "M", "N", "O", "Ö", "P", "R", "S", "Ş", "T", "U", "Ü", 
    "V", "Y", "Z"
];

function HangmanGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Game State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gameData, setGameData] = useState<HangmanData[]>([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    
    // Round State
    const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
    const [wrongGuesses, setWrongGuesses] = useState(0);
    const [score, setScore] = useState(0);
    const [roundStatus, setRoundStatus] = useState<'playing' | 'won' | 'lost'>('playing');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Constants
    const MAX_ERRORS = 6;
    const POINTS_PER_WORD = 100;

    // Derived
    const currentData = gameData[currentWordIndex];
    const targetWord = currentData?.word || "";

    // --- INITIAL DATA FETCH ---
    useEffect(() => {
        const initGame = async () => {
            const courseId = searchParams.get('courseId');
            const unitId = searchParams.get('unitId');
            const topicId = searchParams.get('topicId');

            const res = await getAdamAsmacaAction({ courseId, unitId, topicId });

            if (res.error || !res.data || res.data.length === 0) {
                setError(res.error || "Veri bulunamadı.");
            } else {
                setGameData(res.data);
            }
            setLoading(false);
        };
        initGame();
    }, [searchParams]);

    // --- GAME LOGIC ---

    const handleGuess = useCallback((letter: string) => {
        if (roundStatus !== 'playing' || guessedLetters.has(letter)) return;

        // Vibrate on mobile
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(10); 
        }

        const newGuessed = new Set(guessedLetters).add(letter);
        setGuessedLetters(newGuessed);

        if (!targetWord.includes(letter)) {
            // Wrong Guess
            const newWrong = wrongGuesses + 1;
            setWrongGuesses(newWrong);
            if (newWrong >= MAX_ERRORS) {
                setRoundStatus('lost');
                if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 50, 100]);
            }
        } else {
            // Correct Guess
            const isWon = targetWord.split('').every(char => newGuessed.has(char));
            if (isWon) {
                setRoundStatus('won');
                setScore(s => s + POINTS_PER_WORD);
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#4f46e5', '#818cf8', '#ffffff']
                });
            }
        }
    }, [guessedLetters, roundStatus, targetWord, wrongGuesses]);

    // Keyboard Listener
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

    // --- NAVIGATION LOGIC ---

    const handleNextLevel = () => {
        if (currentWordIndex + 1 < gameData.length) {
            setRoundStatus('playing'); // Reset status BEFORE changing index
            setGuessedLetters(new Set());
            setWrongGuesses(0);
            setCurrentWordIndex(prev => prev + 1);
        } else {
            handleFinishGame();
        }
    };

    const handleFinishGame = async () => {
        setIsSubmitting(true);
        const context = `${searchParams.get('courseName') || 'Genel'} > ${searchParams.get('topicName') || 'Genel'}`;
        await submitAdamAsmacaScoreAction(user?.uid || null, score, context);
        router.push('/student/activities');
    };

    // --- RENDER HELPERS ---

    if (loading) return (
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
            <Link href="/student/adam-asmaca">
                <Button variant="outline" className="border-white/20 hover:bg-white/10 text-white">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Ayarlara Dön
                </Button>
            </Link>
        </div>
    );

    if (!currentData) return null;

    const isGameOver = roundStatus === 'won' || roundStatus === 'lost';

    return (
        <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950 via-[#2b1055] to-black text-white font-sans overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
                <Link href="/student/adam-asmaca">
                    <Button size="icon" variant="ghost" className="rounded-full text-slate-400 hover:text-white hover:bg-white/10">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                </Link>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-indigo-600/20 px-3 py-1 rounded-full border border-indigo-500/30">
                        <Trophy className="h-4 w-4 text-amber-400" />
                        <span className="font-bold text-amber-100">{score}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                        {currentWordIndex + 1} / {gameData.length}
                    </div>
                </div>
            </div>

            <div className="flex-grow flex flex-col md:flex-row max-w-6xl mx-auto w-full p-2 md:p-6 gap-6 overflow-y-auto">
                
                <div className="flex-1 flex items-center justify-center min-h-[250px] relative bg-black/20 rounded-3xl border border-white/5 shadow-inner">
                    <div className="w-64 h-64 relative">
                        <HangmanFigure errors={wrongGuesses} />
                        
                        {roundStatus === 'won' && (
                            <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-300">
                                <div className="bg-green-600/90 p-4 rounded-2xl shadow-2xl backdrop-blur-sm text-center transform rotate-[-5deg]">
                                    <Trophy className="h-12 w-12 text-yellow-300 mx-auto mb-2 animate-bounce" />
                                    <h3 className="text-2xl font-black uppercase tracking-widest text-white">Harika!</h3>
                                </div>
                            </div>
                        )}
                        {roundStatus === 'lost' && (
                            <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-300">
                                <div className="bg-red-600/90 p-4 rounded-2xl shadow-2xl backdrop-blur-sm text-center transform rotate-[5deg]">
                                    <Skull className="h-12 w-12 text-white mx-auto mb-2" />
                                    <h3 className="text-2xl font-black uppercase tracking-widest text-white">Kaybettin</h3>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="absolute top-4 left-4 flex gap-1">
                        {[...Array(MAX_ERRORS)].map((_, i) => (
                            <Heart 
                                key={i} 
                                className={cn(
                                    "h-5 w-5 transition-all duration-300",
                                    i < (MAX_ERRORS - wrongGuesses) ? "text-red-500 fill-red-500" : "text-slate-700 fill-slate-800"
                                )} 
                            />
                        ))}
                    </div>
                </div>

                <div className="flex-[1.5] flex flex-col gap-6">
                    
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 relative animate-in fade-in duration-500">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
                                <Lightbulb className="h-6 w-6 text-amber-400 fill-amber-400" />
                            </div>
                            <div className="flex-grow">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">İpucu</h4>
                                <p className="text-lg font-medium text-white leading-relaxed">
                                    {currentData.hint}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 py-4 min-h-[80px]">
                        {targetWord.split('').map((char, index) => {
                            const isRevealed = guessedLetters.has(char) || roundStatus === 'lost';
                            const isLostReveal = roundStatus === 'lost' && !guessedLetters.has(char);
                            
                            return (
                                <div 
                                    key={`${currentWordIndex}-${index}`}
                                    className={cn(
                                        "w-10 h-12 sm:w-12 sm:h-16 flex items-center justify-center text-2xl sm:text-3xl font-bold rounded-xl border-b-4 transition-all duration-500 transform perspective-1000",
                                        isRevealed 
                                            ? "bg-indigo-600 border-indigo-800 text-white rotate-x-0 opacity-100" 
                                            : "bg-white/10 border-white/20 text-transparent rotate-x-90 opacity-80",
                                        isLostReveal && "bg-red-500/50 border-red-500 text-red-100"
                                    )}
                                >
                                    {isRevealed ? char : ""}
                                </div>
                            );
                        })}
                    </div>

                    <div className={cn("grid grid-cols-7 sm:grid-cols-8 gap-1.5 sm:gap-2 transition-opacity duration-300", isGameOver && "opacity-50 pointer-events-none")}>
                        {KEYBOARD_LETTERS.map((letter) => {
                            const isGuessed = guessedLetters.has(letter);
                            const isWrong = isGuessed && !targetWord.includes(letter);
                            const isCorrect = isGuessed && targetWord.includes(letter);
                            
                            return (
                                <button
                                    key={letter}
                                    onClick={() => handleGuess(letter)}
                                    disabled={isGuessed || isGameOver}
                                    className={cn(
                                        "h-10 sm:h-12 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 shadow-sm border-b-[3px] active:border-b-0 active:translate-y-[3px]",
                                        isCorrect 
                                            ? "bg-green-600 border-green-800 text-white" 
                                            : isWrong 
                                                ? "bg-slate-700 border-slate-800 text-slate-500 opacity-50" 
                                                : "bg-white text-slate-900 border-slate-300 hover:bg-indigo-50"
                                    )}
                                >
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
                                className={cn(
                                    "w-full py-6 text-lg font-black uppercase tracking-widest rounded-xl shadow-xl transition-all",
                                    roundStatus === 'won' 
                                        ? "bg-green-500 hover:bg-green-400 text-white shadow-green-900/40" 
                                        : "bg-slate-600 hover:bg-slate-500 text-white"
                                )}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                ) : (
                                    currentWordIndex + 1 < gameData.length ? (
                                        <>
                                            Sonraki Kelime <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
                                        </>
                                    ) : (
                                        <>
                                            Oyunu Bitir & Puanı Kaydet <Trophy className="ml-2 h-5 w-5" />
                                        </>
                                    )
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
