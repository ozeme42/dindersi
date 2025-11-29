
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAdamAsmacaAction, submitAdamAsmacaScoreAction, type HangmanData } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Skull, Heart, AlertTriangle, Save, Home, Repeat, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';

const HANGMAN_STAGES = 6;
const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');

const HangmanDrawing = ({ mistakes, status }: { mistakes: number, status: 'playing' | 'won' | 'lost' }) => {
    const parts = [
        <circle key="head" cx="140" cy="70" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="head-draw" />,
        <line key="body" x1="140" y1="90" x2="140" y2="150" stroke="currentColor" strokeWidth="4" className="limb-draw" />,
        <line key="armL" x1="140" y1="100" x2="110" y2="130" stroke="currentColor" strokeWidth="4" className="limb-draw" />,
        <line key="armR" x1="140" y1="100" x2="170" y2="130" stroke="currentColor" strokeWidth="4" className="limb-draw" />,
        <line key="legL" x1="140" y1="150" x2="110" y2="190" stroke="currentColor" strokeWidth="4" className="limb-draw" />,
        <line key="legR" x1="140" y1="150" x2="170" y2="190" stroke="currentColor" strokeWidth="4" className="limb-draw" />,
    ];

    const deadEyes = status === 'lost' ? (
        <g className="opacity-0 animate-[fadeIn_0.5s_forwards]">
            <text x="132" y="76" fontSize="12" fill="currentColor">X</text>
            <text x="142" y="76" fontSize="12" fill="currentColor">X</text>
        </g>
    ) : null;

    return (
        <svg height="250" width="200" className="mx-auto overflow-visible text-foreground">
            <g className="path-draw stroke-muted-foreground stroke-[5px] [stroke-linecap:round]">
                <line x1="10" y1="240" x2="150" y2="240" />
                <line x1="80" y1="240" x2="80" y2="20" />
                <line x1="80" y1="20" x2="140" y2="20" />
            </g>
            <g className={cn(status === 'lost' && "swing-animation")}>
                <line x1="140" y1="20" x2="140" y2="50" className="path-draw stroke-muted-foreground" strokeWidth="3" />
                {parts.slice(0, mistakes)}
                {deadEyes}
            </g>
        </svg>
    );
};

const Confetti = () => {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
    const newParticles = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div 
          key={p.id}
          className="confetti"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}
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
    const [isSaving, setIsSaving] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false);

    const gameContext = `Adam Asmaca - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

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
    
    const handleGuess = (letter: string) => {
        if (gameState !== 'playing' || guessedLetters.has(letter) || !currentWordObj) return;

        const newGuessedLetters = new Set(guessedLetters).add(letter);
        setGuessedLetters(newGuessedLetters);

        if (!currentWordObj.word.includes(letter)) {
            setWrongGuesses(prev => prev + 1);
            playSound('incorrect');
        } else {
            playSound('correct');
        }
    };
    
    const checkGameState = useCallback(() => {
        if (!currentWordObj) return;

        const allLettersGuessed = currentWordObj.word.split('').every(letter => guessedLetters.has(letter));
        if (allLettersGuessed) {
            setGameState('won');
            playSound('correct');
        } else if (wrongGuesses >= HANGMAN_STAGES) {
            setGameState('lost');
            playSound('incorrect');
        }
    }, [currentWordObj, guessedLetters, wrongGuesses]);
    
    useEffect(() => {
        checkGameState();
    }, [checkGameState]);

    const resetForNextWord = () => {
        setGameState('playing');
        if (gameData && currentWordIndex < gameData.length - 1) {
            if (gameState === 'won') {
                setTotalScore(prev => prev + 50);
            }
            setCurrentWordIndex(prev => prev + 1);
            setGuessedLetters(new Set());
            setWrongGuesses(0);
        } else {
            if (gameState === 'won') {
                setTotalScore(prev => prev + 50);
            }
            setGameState('finished');
        }
    };
    
    const handleSaveAndExit = async () => {
        if (!user || totalScore === 0 || isSaving || scoreSaved) {
            router.push('/student/adam-asmaca');
            return;
        }
        setIsSaving(true);
        const result = await submitAdamAsmacaScoreAction(user.uid, totalScore, gameContext);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
            setScoreSaved(true);
            router.push('/student/adam-asmaca');
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    }
    
    const restartGame = () => {
        setCurrentWordIndex(0);
        setTotalScore(0);
        setGuessedLetters(new Set());
        setWrongGuesses(0);
        setGameState('playing');
        setScoreSaved(false);
        fetchWords();
    };

    const backUrl = '/student/adam-asmaca';

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    if (error) return (
         <div className="flex h-screen w-full items-center justify-center p-4">
             <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Oyun Yüklenemedi</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                 <div className="mt-4">
                    <Button asChild variant="secondary">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );
    
    if (gameState === 'finished') {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Tebrikler!</CardTitle>
                        <CardDescription>Adam Asmaca etkinliğini tamamladınız.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">{totalScore}</p>
                        <p className="text-muted-foreground">Toplam Puan</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={handleSaveAndExit} className="w-full" disabled={isSaving || scoreSaved}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : scoreSaved ? <CheckCircle2 className="mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                            {scoreSaved ? "Kaydedildi" : "Puanı Kaydet ve Çık"}
                        </Button>
                        <Button onClick={restartGame} className="w-full" variant="secondary">
                            <Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className={cn("flex h-screen w-full flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-900 transition-colors duration-500", gameState === 'lost' && 'animate-shake bg-red-100 dark:bg-red-900/50')}>
             {gameState === 'won' && <Confetti />}
            <Card className="w-full max-w-4xl text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline">Adam Asmaca</CardTitle>
                    <div className="flex justify-between items-center text-sm pt-2">
                         <span className="font-semibold">Toplam Puan: {totalScore}</span>
                         <span className="font-semibold">Kelime: {currentWordIndex + 1}/{gameData?.length}</span>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="w-full md:w-auto flex-shrink-0">
                         <HangmanDrawing mistakes={wrongGuesses} status={gameState} />
                    </div>

                    <div className="flex-grow flex flex-col items-center w-full space-y-6">
                        <p className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-yellow-200">
                             💡 İPUCU: {currentWordObj?.hint}
                        </p>
                        <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
                            {currentWordObj?.word.split('').map((letter, i) => (
                                <div key={i} className={cn(
                                    "h-12 w-10 md:h-16 md:w-12 bg-muted rounded-md flex items-center justify-center text-2xl md:text-3xl font-bold border-b-4 border-muted-foreground",
                                    guessedLetters.has(letter) && "bg-white text-primary border-primary/50",
                                    gameState === 'lost' && !guessedLetters.has(letter) && "text-red-500"
                                )}>
                                    {(guessedLetters.has(letter) || gameState === 'lost') ? letter : ''}
                                </div>
                            ))}
                        </div>

                        {gameState === 'playing' ? (
                            <div className="flex justify-center gap-1 md:gap-2 flex-wrap max-w-xl mx-auto">
                                {ALPHABET.map(letter => {
                                    const isGuessed = guessedLetters.has(letter);
                                    const isCorrect = currentWordObj?.word.includes(letter);
                                    let btnStyle = "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-50 hover:border-primary/50 dark:hover:bg-slate-600";
                                    if (isGuessed) {
                                        btnStyle = isCorrect ? "bg-green-500 border-green-700 text-white transform scale-95" : "bg-slate-300 dark:bg-slate-800 border-slate-400 text-slate-500 opacity-60 transform scale-95";
                                    }

                                    return (
                                        <Button
                                            key={letter}
                                            variant="outline"
                                            size="icon"
                                            className={cn("key-btn h-10 w-10 md:h-12 md:w-12 text-lg border-b-4", btnStyle)}
                                            onClick={() => handleGuess(letter)}
                                            disabled={isGuessed}
                                        >
                                            {letter}
                                        </Button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 rounded-md min-h-[14rem] flex flex-col justify-center">
                                <p className={cn("text-2xl font-bold", gameState === 'won' ? 'text-green-600' : 'text-red-600')}>
                                    {gameState === 'won' ? 'Kazandın!' : 'Kaybettin!'}
                                </p>
                                {gameState === 'lost' && <p className="text-muted-foreground">Doğru kelime: <span className="font-bold">{currentWordObj?.word}</span></p>}
                            </div>
                        )}
                    </div>
                </CardContent>
                 <CardFooter className="flex-col gap-2">
                    {gameState !== 'playing' && (
                        <Button onClick={resetForNextWord} className="w-full max-w-sm">
                            {currentWordIndex < (gameData?.length || 0) - 1 ? 'Sıradaki Kelime' : 'Sonuçları Gör'}
                        </Button>
                    )}
                    <Button variant="outline" asChild className="w-full max-w-sm">
                       <Link href={backUrl}>Etkinlik Merkezine Dön</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function HangmanPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <HangmanGame />
        </Suspense>
    );
}
