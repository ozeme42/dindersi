'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAdamAsmacaAction, submitAdamAsmacaScoreAction, type HangmanData } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Skull, Trophy, Lightbulb, Ghost, XOctagon, ArrowLeft, RotateCcw, Keyboard as KeyboardIcon, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { GameEndScreen } from '@/components/game-end-screen';

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
const SketchHangman = ({ mistakes, status }: { mistakes: number, status: 'playing' | 'won' | 'lost' }) => {
    const baseStroke = "stroke-slate-800 stroke-[6px] [stroke-linecap:round] [stroke-linejoin:round]";
    const bodyStroke = "stroke-rose-500 stroke-[5px] [stroke-linecap:round] [stroke-linejoin:round] fill-transparent transition-all duration-500 ease-out";
    
    return (
        <div className="relative w-full h-64 lg:h-96 flex items-center justify-center">
            {/* Çizim Alanı Arka Planı */}
            <div className="absolute inset-2 bg-white/60 rounded-[2rem] border-4 border-slate-100 shadow-inner backdrop-blur-sm" />
            
            <svg viewBox="0 0 200 250" className="w-auto h-full overflow-visible relative z-10 drop-shadow-xl">
                {/* Darağacı */}
                <g className={baseStroke}>
                    <line x1="20" y1="240" x2="180" y2="240" className="opacity-80" />
                    <line x1="60" y1="240" x2="60" y2="20" />
                    <line x1="60" y1="20" x2="140" y2="20" />
                    <line x1="140" y1="20" x2="140" y2="50" className="stroke-slate-400" />
                </g>

                {/* Adam Parçaları */}
                <g className={cn(status === 'lost' && "swing-animation origin-top")}>
                    {mistakes >= 1 && <circle cx="140" cy="80" r="20" className={cn(bodyStroke, "animate-in zoom-in duration-300")} />}
                    {mistakes >= 2 && <line x1="140" y1="100" x2="140" y2="170" className={cn(bodyStroke, "animate-in slide-in-from-top-4 duration-300")} />}
                    {mistakes >= 3 && <line x1="140" y1="120" x2="110" y2="150" className={cn(bodyStroke, "animate-in slide-in-from-right-4 duration-300")} />}
                    {mistakes >= 4 && <line x1="140" y1="120" x2="170" y2="150" className={cn(bodyStroke, "animate-in slide-in-from-left-4 duration-300")} />}
                    {mistakes >= 5 && <line x1="140" y1="170" x2="110" y2="210" className={cn(bodyStroke, "animate-in slide-in-from-right-4 duration-300")} />}
                    {mistakes >= 6 && <line x1="140" y1="170" x2="170" y2="210" className={cn(bodyStroke, "animate-in slide-in-from-left-4 duration-300")} />}
                    
                    {status === 'lost' && (
                        <g className="animate-in fade-in zoom-in duration-500 delay-300">
                            <line x1="132" y1="75" x2="138" y2="81" className="stroke-rose-600 stroke-[3px]" />
                            <line x1="138" y1="75" x2="132" y2="81" className="stroke-rose-600 stroke-[3px]" />
                            <line x1="142" y1="75" x2="148" y2="81" className="stroke-rose-600 stroke-[3px]" />
                            <line x1="148" y1="75" x2="142" y2="81" className="stroke-rose-600 stroke-[3px]" />
                        </g>
                    )}
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

    // Fullscreen ref
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const transitionLockRef = useRef(false);

    const gameContext = useMemo(() => ({
        courseName: searchParams.get('courseName') || 'Bilinmeyen Ders',
        unitName: searchParams.get('unitName') || 'Bilinmeyen Ünite',
        topicName: searchParams.get('topicName') || 'Bilinmeyen Konu',
    }), [searchParams]);

    const contextString = `Adam Asmaca - ${gameContext.courseName} > ${gameContext.topicName}`;

    const backUrl = useMemo(() => {
        const courseId = searchParams.get('courseId');
        const unitId = searchParams.get('unitId');
        const topicId = searchParams.get('topicId');
        if (courseId && unitId && topicId) {
             const params = new URLSearchParams({
                courseName: gameContext.courseName,
                unitName: gameContext.unitName,
                topicName: gameContext.topicName,
            });
            return `/konu/${courseId}/${unitId}/${topicId}?${params.toString()}`;
        }
        return '/oyunlar/adam-asmaca';
    }, [searchParams, gameContext]);

    // Veri Çekme
    const fetchWords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        transitionLockRef.current = false;
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
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);
    
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

    // İlerleme Mantığı
    const handleNext = () => {
        if (gameData && !isLastQuestion) {
            if (gameState === 'won') setTotalScore(prev => prev + 50);
            setCurrentWordIndex(prev => prev + 1);
            setGuessedLetters(new Set());
            setWrongGuesses(0);
            setGameState('playing');
        } else if (isLastQuestion) {
             let finalScore = totalScore;
             if (gameState === 'won') finalScore += 50;
             setTotalScore(finalScore);
             setGameState('finished');
        }
    };
    
    // Oyunu sıfırla
    const handleRestart = () => {
        setGameData(gameData ? [...gameData].sort(() => 0.5 - Math.random()) : null);
        setCurrentWordIndex(0);
        setGuessedLetters(new Set());
        setWrongGuesses(0);
        setTotalScore(0);
        setGameState('playing');
        setIsScoreSaved(false);
        transitionLockRef.current = false;
    };

    // Kaydetme İşlemi
    const handleFinishAndSave = async () => {
        if (!user || isSaving || isScoreSaved) {
            router.push(backUrl); 
            return;
        }

        setIsSaving(true);
        try {
            const result = await submitAdamAsmacaScoreAction(user.uid, totalScore, contextString);
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
    
    // --- RENDER STATES ---

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <MagnificentLightBackground />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-rose-500 blur-xl opacity-20 animate-pulse"></div>
                        <Loader2 className="h-16 w-16 animate-spin text-rose-600 relative z-10" />
                    </div>
                    <span className="text-slate-600 font-black text-xl mt-6 animate-pulse tracking-widest uppercase">Hazırlanıyor...</span>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-50">
                 <MagnificentLightBackground />
                 <div className="text-center space-y-4 max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-red-100 shadow-2xl relative z-10">
                    <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Ghost className="h-10 w-10 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">Oyun Başlatılamadı</h3>
                    <p className="text-slate-500 font-medium">{error}</p>
                     <Button asChild className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-14 font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-5 w-5" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    if (gameState === 'finished') {
        return (
            <GameEndScreen 
                score={totalScore}
                onSave={handleFinishAndSave}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={handleRestart}
                backUrl={backUrl}
            />
        );
    }

    return (
        <div 
            ref={mainContentRef}
            className={cn(
                "min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden flex flex-col transition-all",
                gameShake && "animate-shake",
                !isFullscreen && "pb-8"
            )}
        >
            <MagnificentLightBackground />

            {/* --- HEADER (HUD) --- */}
            <div className="fixed top-0 left-0 right-0 z-50 px-4 py-4 pointer-events-none">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex justify-between items-start">
                        {/* Sol: Geri & Bilgi */}
                        <div className="flex flex-col gap-2 pointer-events-auto">
                            <Button 
                                onClick={() => setGameState('finished')}
                                variant="ghost"
                                className="h-12 w-12 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50 shadow-lg transition-all"
                            >
                                <XOctagon className="h-6 w-6" />
                            </Button>
                            
                            {/* İlerleme */}
                            <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl px-4 py-2 shadow-lg flex items-center gap-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">KELİME</span>
                                    <span className="text-xl font-black text-rose-600 leading-none">
                                        {currentWordIndex + 1}<span className="text-slate-300 text-base">/{gameData?.length}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sağ: Puan */}
                        <div className="flex flex-col gap-2 items-end pointer-events-auto">
                            <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-2 pl-4 pr-4 shadow-lg flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest">PUAN</div>
                                    <div className="text-2xl font-black text-amber-500 leading-none">{totalScore}</div>
                                </div>
                                <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                    <Trophy className="h-6 w-6" />
                                </div>
                            </div>
                            <FullscreenToggle elementRef={mainContentRef} className="bg-white/80 backdrop-blur-md border border-slate-200 text-slate-600 h-10 w-10 rounded-xl shadow-lg hover:bg-indigo-50 hover:text-indigo-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- OYUN ALANI --- */}
            <main className={cn(
                "flex-grow flex flex-col items-center justify-center p-4 relative z-10",
                isFullscreen ? "pt-20" : "pt-24 md:pt-32"
            )}>
                <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start animate-in fade-in zoom-in duration-500">
                    
                    {/* SOL TARAF: Çizim ve İpucu Kartı */}
                    <div className="lg:col-span-5 flex flex-col gap-6 order-1">
                        
                        {/* Çizim Alanı Kapsayıcısı - DÜZELTİLDİ */}
                        <div className="relative group perspective-1000">
                            <div className="absolute -inset-1 bg-gradient-to-br from-rose-400 to-orange-400 rounded-[2.5rem] opacity-20 blur-lg group-hover:opacity-30 transition duration-1000"></div>
                            
                            {/* Kart İçeriği: Flex yapısı kullanıldı, Absolute yerine */}
                            <div className="relative bg-white/80 backdrop-blur-xl border border-white p-4 rounded-[2.5rem] shadow-2xl overflow-visible flex flex-col">
                                
                                {/* HATA ROZETİ (Üstte, kesilme yok) */}
                                <div className="flex justify-between items-center px-4 pt-2 pb-0 z-20">
                                    <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-rose-100 shadow-sm">
                                        <Skull className="w-3 h-3" /> Hata: {wrongGuesses}/{HANGMAN_STAGES}
                                    </div>
                                </div>

                                {/* Çizim Alanı */}
                                <div className="-mt-4">
                                    <SketchHangman mistakes={wrongGuesses} status={gameState} />
                                </div>
                            </div>
                        </div>

                        {/* İpucu Kartı */}
                        <div className="bg-white/90 backdrop-blur-md border border-white/60 rounded-[2rem] p-6 text-center shadow-xl ring-1 ring-slate-900/5">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <div className="p-2 bg-amber-100 rounded-full shadow-inner">
                                    <Lightbulb className="w-5 h-5 text-amber-600" /> 
                                </div>
                                <span className="font-bold text-slate-400 text-xs uppercase tracking-widest">İPUCU</span>
                            </div>
                            <p className="text-slate-800 text-lg lg:text-xl font-bold leading-relaxed">
                                {currentWordObj?.hint}
                            </p>
                        </div>
                    </div>

                    {/* SAĞ TARAF: Kelime ve Klavye */}
                    <div className="lg:col-span-7 flex flex-col gap-6 w-full order-2 mt-4 lg:mt-0">
                        
                        {/* KELİME ALANI (TILES) */}
                        <div className="flex flex-wrap justify-center gap-2 lg:gap-3 min-h-[6rem] items-center content-center bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-white/50 p-6 lg:p-8 shadow-lg">
                            {currentWordObj?.word.split('').map((letter, i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "w-12 h-16 sm:w-14 sm:h-20 lg:w-16 lg:h-24 rounded-xl lg:rounded-2xl flex items-center justify-center text-3xl sm:text-4xl lg:text-5xl font-black transition-all duration-500 select-none shadow-md",
                                        // Harf Stilleri
                                        guessedLetters.has(letter) 
                                            ? "bg-gradient-to-b from-white to-slate-50 border-b-4 border-indigo-200 text-indigo-600 shadow-indigo-200/50 transform translate-y-0"
                                            : "bg-white/40 border-2 border-dashed border-slate-300 text-transparent",
                                        // Kaybedince Gösterilen Harfler
                                        gameState === 'lost' && !guessedLetters.has(letter) && "bg-rose-50 border-b-4 border-rose-200 text-rose-400 animate-pulse"
                                    )}
                                >
                                    {guessedLetters.has(letter) || gameState === 'lost' ? letter : ''}
                                </div>
                            ))}
                        </div>

                        {/* DURUM MESAJI VE BUTON (Oyun bittiğinde görünür) */}
                        {gameState !== 'playing' ? (
                            <div className="flex flex-col items-center justify-center p-8 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/60 animate-in slide-in-from-bottom-8 duration-500">
                                <h3 className={cn(
                                    "text-4xl lg:text-6xl font-black mb-2 tracking-tighter drop-shadow-sm",
                                    gameState === 'won' ? "text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500" : "text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-red-600"
                                )}>
                                    {gameState === 'won' ? 'HARİKA!' : 'ÜZGÜNÜM'}
                                </h3>
                                <p className="text-slate-500 font-bold text-lg mb-8 uppercase tracking-widest">
                                    {gameState === 'won' ? 'Kelimeyi Doğru Bildin' : 'Hakkın Doldu'}
                                </p>
                                <Button 
                                    onClick={handleNext} 
                                    className="h-16 lg:h-20 px-12 text-xl lg:text-2xl rounded-3xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-400/50 hover:scale-[1.02] active:scale-95 transition-all font-black group w-full sm:w-auto"
                                >
                                    {isLastQuestion ? 'SONUÇLARI GÖR' : 'SIRADAKİ KELİME'}
                                    <ArrowLeft className="ml-3 h-6 w-6 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        ) : (
                            /* KLAVYE */
                            <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 sm:gap-2 p-4 sm:p-6 bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-xl select-none">
                                {ALPHABET.map(letter => {
                                    const isGuessed = guessedLetters.has(letter);
                                    const isCorrect = currentWordObj?.word.includes(letter);
                                    return (
                                        <button
                                            key={letter}
                                            onClick={() => handleGuess(letter)}
                                            disabled={isGuessed || gameState !== 'playing'}
                                            className={cn(
                                                "aspect-[3/4] rounded-xl sm:rounded-2xl text-xl sm:text-2xl font-bold transition-all duration-150 touch-manipulation flex items-center justify-center shadow-sm relative overflow-hidden group",
                                                // Normal Durum
                                                !isGuessed && "bg-white border-b-4 border-slate-200 text-slate-700 hover:border-b-2 hover:translate-y-[2px] active:border-b-0 active:translate-y-[4px] hover:bg-slate-50",
                                                // Doğru Tahmin
                                                isGuessed && isCorrect && "bg-emerald-500 border-b-0 translate-y-[4px] text-white shadow-none opacity-50 cursor-not-allowed",
                                                // Yanlış Tahmin
                                                isGuessed && !isCorrect && "bg-slate-200 border-b-0 translate-y-[4px] text-slate-400 shadow-none opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <span className="relative z-10">{letter}</span>
                                            {/* Buton Parlaması */}
                                            {!isGuessed && <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function HangmanPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <HangmanGame />
        </Suspense>
    );
}