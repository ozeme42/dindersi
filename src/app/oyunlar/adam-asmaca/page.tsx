
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAdamAsmacaAction, submitAdamAsmacaScoreAction, type HangmanData } from './actions';
import { Button } from '@/components/ui/button';
import { Loader2, Skull, Save, Trophy, Lightbulb, Ghost, Home, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GameEndScreen } from '@/components/game-end-screen';


const HANGMAN_STAGES = 6;
const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-rose-900/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-violet-900/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-pink-500/10 rounded-full blur-[100px]" />
    </div>
);

const NeonHangman = ({ mistakes, status }: { mistakes: number, status: 'playing' | 'won' | 'lost' }) => {
    const strokeStyle = "stroke-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] transition-all duration-500";
    
    return (
        <div className="relative w-48 h-56 lg:w-64 lg:h-80 mx-auto transition-transform hover:scale-105 duration-500">
            <svg viewBox="0 0 200 250" className="w-full h-full overflow-visible">
                <g className="stroke-[6px] [stroke-linecap:round]">
                    <line x1="20" y1="240" x2="180" y2="240" className="stroke-slate-800" />
                    <line x1="60" y1="240" x2="60" y2="20" className="stroke-slate-700" />
                    <line x1="60" y1="20" x2="140" y2="20" className="stroke-slate-700" />
                    <line x1="140" y1="20" x2="140" y2="50" className="stroke-slate-700" />
                </g>
                <g className={cn("stroke-[5px] fill-transparent [stroke-linecap:round]", status === 'lost' && "swing-animation")}>
                    {mistakes >= 1 && <circle cx="140" cy="80" r="20" className={cn(strokeStyle, "head-draw")} />}
                    {mistakes >= 2 && <line x1="140" y1="100" x2="140" y2="170" className={cn(strokeStyle, "limb-draw")} />}
                    {mistakes >= 3 && <line x1="140" y1="120" x2="110" y2="150" className={cn(strokeStyle, "limb-draw")} />}
                    {mistakes >= 4 && <line x1="140" y1="120" x2="170" y2="150" className={cn(strokeStyle, "limb-draw")} />}
                    {mistakes >= 5 && <line x1="140" y1="170" x2="110" y2="210" className={cn(strokeStyle, "limb-draw")} />}
                    {mistakes >= 6 && <line x1="140" y1="170" x2="170" y2="210" className={cn(strokeStyle, "limb-draw")} />}
                    {status === 'lost' && (
                        <g className="animate-in fade-in zoom-in duration-1000 delay-500 fill-rose-500 stroke-none">
                            <text x="132" y="86" fontSize="14" fontWeight="bold">X</text>
                            <text x="142" y="86" fontSize="14" fontWeight="bold">X</text>
                        </g>
                    )}
                </g>
            </svg>
        </div>
    );
};

const GameHUD = ({ score, current, total, onFinishAndSave }: { score: number, current: number, total: number, onFinishAndSave: () => void }) => {
    const progress = total > 0 ? ((current + 1) / total) * 100 : 0;
    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6">
            <div className="max-w-5xl mx-auto flex items-center gap-4">
                <div className="flex-grow h-4 lg:h-6 bg-slate-900/50 backdrop-blur-md rounded-full border border-white/10 relative overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-500 to-pink-600 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(244,63,94,0.5)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-rose-500/30 px-4 py-2 rounded-full shadow-lg shadow-rose-500/10 min-w-[120px] justify-center">
                    <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-rose-400 fill-rose-400 animate-bounce" />
                    <span className="text-xl lg:text-2xl font-black text-rose-100 font-mono tracking-widest">
                        {score}
                    </span>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="rounded-full font-bold">Bitir ve Çık</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Emin misin?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Oyundan çıkmak istediğinizden emin misiniz? Mevcut puanınız kaydedilecektir.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={onFinishAndSave}>Evet, Bitir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
};

// --- ANA OYUN MANTIĞI ---

function HangmanGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    // Parametreler
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    const courseName = searchParams.get('courseName');
    const topicName = searchParams.get('topicName');

    const [gameData, setGameData] = useState<HangmanData[] | null>(null);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
    const [wrongGuesses, setWrongGuesses] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'won' | 'lost' | 'finished'>('playing');
    const [totalScore, setTotalScore] = useState(0);
    const [gameShake, setGameShake] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    // Kilit mekanizması (Bitirme işlemi bir kez çalışsın diye)
    const transitionLockRef = useRef(false);

    const gameContext = `Adam Asmaca - ${courseName} > ${topicName}`;

    // Veri Çekme
    const fetchWords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        transitionLockRef.current = false;
        try {
            const params = {
                courseId: courseId || undefined,
                unitId: unitId || undefined,
                topicId: topicId || undefined,
            };
            const result = await getAdamAsmacaAction(params);
            
            if (result.error || !result.data || result.data.length === 0) {
                setError(result.error || 'Bu konu için oyun verisi bulunamadı.');
            } else {
                setGameData(result.data);
            }
        } catch (e) {
            setError("Kelimeler getirilirken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    }, [courseId, unitId, topicId]);
    
    useEffect(() => {
        fetchWords();
    }, [fetchWords]);

    const currentWordObj = useMemo(() => gameData?.[currentWordIndex], [gameData, currentWordIndex]);
    const isLastQuestion = gameData && currentWordIndex === gameData.length - 1;
    
    // Tahmin
    const handleGuess = (letter: string) => {
        if (gameState !== 'playing' || guessedLetters.has(letter) || !currentWordObj) return;

        const newGuessedLetters = new Set(guessedLetters).add(letter);
        setGuessedLetters(newGuessedLetters);

        if (!currentWordObj.word.includes(letter)) {
            setWrongGuesses(prev => prev + 1);
            playSound('incorrect');
            setGameShake(true);
            setTimeout(() => setGameShake(false), 500);
        } else {
            playSound('correct');
        }
    };

    // Kazanma/Kaybetme Kontrolü
    useEffect(() => {
        if (!currentWordObj || gameState !== 'playing') return;

        const allLettersGuessed = currentWordObj.word.split('').every(letter => guessedLetters.has(letter));
        
        if (allLettersGuessed) {
            setGameState('won');
            playSound('correct');
        } else if (wrongGuesses >= HANGMAN_STAGES) {
            setGameState('lost');
            playSound('incorrect');
        }
    }, [currentWordObj, guessedLetters, wrongGuesses, gameState]);

    // İlerleme Mantığı (Butona basınca)
    const handleNext = () => {
        if (gameData && !isLastQuestion) {
            // Ara soru ise sonrakine geç
            if (gameState === 'won') setTotalScore(prev => prev + 50);
            setCurrentWordIndex(prev => prev + 1);
            setGuessedLetters(new Set());
            setWrongGuesses(0);
            setGameState('playing');
        } else if (isLastQuestion) {
             // Son soru ise bitir
             let finalScore = totalScore;
             if (gameState === 'won') finalScore += 50;
             setTotalScore(finalScore);
             setGameState('finished');
        }
    };
    
    // Oyunu sıfırla
    const handleRestart = () => {
        setGameData(gameData ? [...gameData].sort(() => 0.5 - Math.random()) : null); // Re-shuffle
        setCurrentWordIndex(0);
        setGuessedLetters(new Set());
        setWrongGuesses(0);
        setTotalScore(0);
        setGameState('playing');
        setIsScoreSaved(false);
        transitionLockRef.current = false;
    };


    // Kaydetme İşlemi (Bitiş ekranındaki butona basınca)
    const handleFinishAndSave = async () => {
        if (!user || isSaving || isScoreSaved) {
            router.push('/student'); 
            return;
        }

        setIsSaving(true);
        try {
            const result = await submitAdamAsmacaScoreAction(user.uid, totalScore, gameContext);
            if (result.success) {
                toast({ title: "Başarılı", description: "Puanınız başarıyla kaydedildi." });
                setIsScoreSaved(true);
            } else {
                toast({ title: "Hata", description: result.error, variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Hata", description: "Bir bağlantı hatası oluştu.", variant: "destructive" });
        } finally {
             setIsSaving(false);
        }
    };
    
    // --- RENDER ---

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-rose-950/50 p-6 rounded-3xl border border-rose-500/30">
                    <Ghost className="h-16 w-16 text-rose-500 mx-auto" />
                    <h3 className="text-xl font-bold text-rose-100">Oyun Başlatılamadı</h3>
                    <p className="text-rose-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/oyunlar/adam-asmaca">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    // --- BİTİŞ EKRANI (GameEndScreen Bileşeni) ---
    if (gameState === 'finished') {
        return (
            <GameEndScreen 
                score={totalScore}
                onSave={handleFinishAndSave}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={handleRestart}
                backUrl="/oyunlar/adam-asmaca"
            />
        );
    }

    return (
        <div className={cn("min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col", gameShake && "animate-shake")}>
            <GameBackground />
            <GameHUD score={totalScore} current={currentWordIndex} total={gameData?.length || 0} onFinishAndSave={() => setGameState('finished')} />

            <main className="flex-grow flex flex-col items-center justify-center p-2 lg:p-8 relative z-10 mt-20 lg:mt-10">
                <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
                    
                    {/* SOL TARAF */}
                    <div className="lg:col-span-5 flex flex-col items-center gap-6 order-1">
                        <div className="relative transform scale-75 lg:scale-100">
                            <div className="absolute inset-0 bg-rose-500/5 rounded-full blur-3xl" />
                            <NeonHangman mistakes={wrongGuesses} status={gameState} />
                        </div>

                        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 lg:p-6 w-full max-w-md text-center shadow-xl">
                            <div className="flex items-center justify-center gap-2 mb-2 text-yellow-400 font-bold tracking-widest text-xs lg:text-sm uppercase">
                                <Lightbulb className="w-4 h-4" /> İpucu
                            </div>
                            <p className="text-slate-200 text-base lg:text-xl font-medium leading-relaxed">
                                {currentWordObj?.hint}
                            </p>
                        </div>
                    </div>

                    {/* SAĞ TARAF */}
                    <div className="lg:col-span-7 flex flex-col gap-6 w-full order-2">
                        
                        {/* Kelime Alanı */}
                        <div className="flex flex-wrap justify-center gap-2 lg:gap-3 px-2 min-h-[4rem]">
                            {currentWordObj?.word.split('').map((letter, i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "w-9 h-12 sm:w-12 sm:h-16 lg:w-16 lg:h-20 rounded-lg lg:rounded-xl border-b-4 lg:border-b-8 flex items-center justify-center text-2xl sm:text-4xl lg:text-5xl font-black transition-all duration-300 select-none",
                                        guessedLetters.has(letter) 
                                            ? "bg-slate-800 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-in zoom-in-50"
                                            : "bg-slate-900/50 border-slate-700 text-transparent",
                                        gameState === 'lost' && !guessedLetters.has(letter) && "text-rose-700 border-rose-900 opacity-50"
                                    )}
                                >
                                    {guessedLetters.has(letter) || gameState === 'lost' ? letter : ''}
                                </div>
                            ))}
                        </div>

                        {/* Oyun Durum Mesajı */}
                        {gameState !== 'playing' && (
                            <div className="text-center animate-in fade-in slide-in-from-bottom-4 py-4">
                                <h3 className={cn("text-4xl lg:text-5xl font-black mb-4", gameState === 'won' ? "text-green-400 drop-shadow-lg" : "text-red-500")}>
                                    {gameState === 'won' ? 'HARİKA!' : 'KAYBETTİN'}
                                </h3>
                                <Button onClick={handleNext} size="lg" className="h-14 lg:h-16 px-8 text-xl rounded-full bg-slate-100 text-slate-900 hover:bg-white hover:scale-105 transition-all font-bold shadow-xl">
                                    {isLastQuestion ? 'Oyunu Bitir' : 'Sıradaki Kelime'}
                                </Button>
                            </div>
                        )}

                        {/* KLAVYE */}
                        <div className={cn(
                            "flex flex-wrap justify-center gap-1.5 sm:gap-2 p-2 select-none transition-opacity duration-300",
                            gameState !== 'playing' && "opacity-50 pointer-events-none blur-[2px]"
                        )}>
                            {ALPHABET.map(letter => {
                                const isGuessed = guessedLetters.has(letter);
                                const isCorrect = currentWordObj?.word.includes(letter);
                                return (
                                    <button
                                        key={letter}
                                        onClick={() => handleGuess(letter)}
                                        disabled={isGuessed || gameState !== 'playing'}
                                        className={cn(
                                            "w-9 h-11 sm:w-11 sm:h-14 lg:w-14 lg:h-16 rounded-md sm:rounded-lg lg:rounded-xl text-lg sm:text-xl lg:text-2xl font-bold transition-all duration-150 touch-manipulation",
                                            !isGuessed && "bg-slate-800 hover:bg-slate-700 border-b-[3px] border-slate-950 text-slate-200 active:border-b-0 active:translate-y-[3px]",
                                            isGuessed && isCorrect && "bg-green-600/20 border border-green-500 text-green-500 scale-95",
                                            isGuessed && !isCorrect && "bg-slate-800/50 text-slate-600 border border-transparent scale-95 opacity-40"
                                        )}
                                    >
                                        {letter}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function HangmanPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-rose-500" /></div>}>
            <HangmanGame />
        </Suspense>
    );
}
