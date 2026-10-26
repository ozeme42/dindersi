'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAdamAsmacaAction, submitAdamAsmacaScoreAction, type HangmanData } from '../actions';
import { Button } from '@/components/ui/button';
import { 
    Loader2, Trophy, Lightbulb, XOctagon, ArrowRight, RotateCcw, 
    CheckCircle, Heart, Sparkles, AlertCircle, Volume2, VolumeX 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { GameEndScreen } from '@/components/game-end-screen';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';
import { getGameBackUrl } from '@/lib/game-navigation';

const HANGMAN_STAGES = 6;

// Wordwall tarzı 3 satırlı Türkçe klavye
const KEYBOARD_ROWS = [
    ['A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H'],
    ['I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P'],
    ['R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'],
];
const ALPHABET = KEYBOARD_ROWS.flat();

// Türkçe karakter normalizasyonu (şapkalı harfler standart harflere)
const normalizeText = (text: string) => {
    if (!text) return '';
    return text.toLocaleUpperCase('tr-TR')
        .replace(/Â/g, 'A')
        .replace(/Î/g, 'İ')
        .replace(/Û/g, 'U')
        .replace(/Ê/g, 'E');
};

// Wordwall Tarzı Kaliteli SVG Darağacı & Karakter Çizimi
function WordwallHangmanIllustration({ 
    mistakes, 
    status 
}: { 
    mistakes: number; 
    status: 'playing' | 'won' | 'lost' | 'finished';
}) {
    const isWon = status === 'won';
    const isLost = status === 'lost';

    return (
        <div className="relative w-full h-56 sm:h-64 md:h-72 lg:h-80 flex items-center justify-center select-none overflow-hidden">
            <svg 
                viewBox="0 0 300 270" 
                className="w-full h-full max-h-full drop-shadow-lg overflow-visible"
            >
                <defs>
                    <linearGradient id="woodBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#854d0e" />
                        <stop offset="50%" stopColor="#a16207" />
                        <stop offset="100%" stopColor="#713f12" />
                    </linearGradient>
                    <linearGradient id="grassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#15803d" />
                    </linearGradient>
                    <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Arka Plan Hafif Işıma (Kazanıldığında) */}
                {isWon && (
                    <circle cx="195" cy="115" r="95" fill="url(#sunGlow)" className="animate-pulse" />
                )}

                {/* Çimenlik Zemin Tepesi */}
                <path 
                    d="M 15 255 Q 120 238 285 255 L 285 270 L 15 270 Z" 
                    fill="url(#grassGrad)" 
                    stroke="#16a34a" 
                    strokeWidth="2" 
                />

                {/* Darağacı Temel Tahtası */}
                <rect x="35" y="244" width="160" height="12" rx="4" fill="#713f12" stroke="#451a03" strokeWidth="2" />

                {/* Dikey Ahşap Direk */}
                <rect x="62" y="24" width="16" height="222" rx="3" fill="url(#woodBeam)" stroke="#451a03" strokeWidth="2" />

                {/* Üst Yatay Ahşap Kiriş */}
                <rect x="54" y="20" width="156" height="15" rx="3" fill="url(#woodBeam)" stroke="#451a03" strokeWidth="2" />

                {/* Çapraz Destek Kalası */}
                <polygon points="62,72 62,54 112,20 130,20" fill="#713f12" stroke="#451a03" strokeWidth="2" />

                {/* Ahşap Çivi / Mandal */}
                <rect x="192" y="32" width="6" height="7" rx="2" fill="#451a03" />

                {/* Asılı Urgan İp (Kazanılınca serbest kalır / kaybolur) */}
                {!isWon && (
                    <g className="transition-all duration-300">
                        <line 
                            x1="195" 
                            y1="35" 
                            x2="195" 
                            y2="66" 
                            stroke="#d97706" 
                            strokeWidth="3.5" 
                            strokeDasharray="4 2" 
                        />
                        <ellipse 
                            cx="195" 
                            cy="74" 
                            rx="7" 
                            ry="10" 
                            fill="none" 
                            stroke="#b45309" 
                            strokeWidth="3" 
                        />
                    </g>
                )}

                {/* KAZANMA DURUMU: Karakter kutlama yapıyor, iplerden kurtulmuş */}
                {isWon && (
                    <g className="animate-bounce" style={{ transformOrigin: '195px 140px' }}>
                        {/* Baş */}
                        <circle cx="195" cy="85" r="18" fill="#fde047" stroke="#ca8a04" strokeWidth="2.5" />
                        {/* Sevinçli Gözler (^ ^) */}
                        <path d="M 188 83 Q 191 79 194 83" fill="none" stroke="#713f12" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M 196 83 Q 199 79 202 83" fill="none" stroke="#713f12" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Kocaman Gülümseme */}
                        <path d="M 188 89 Q 195 98 202 89" fill="#e11d48" stroke="#be123c" strokeWidth="1.5" />
                        {/* Pembe Yanaklar */}
                        <circle cx="186" cy="88" r="3" fill="#f43f5e" opacity="0.6" />
                        <circle cx="204" cy="88" r="3" fill="#f43f5e" opacity="0.6" />
                        
                        {/* Gövde / Tişört */}
                        <path d="M 187 103 L 203 103 L 207 145 L 183 145 Z" fill="#10b981" stroke="#047857" strokeWidth="2.5" />
                        {/* Yıldız Rozeti */}
                        <polygon points="195,116 197,121 202,121 198,124 199,129 195,126 191,129 192,124 188,121 193,121" fill="#fef08a" />

                        {/* Zaferle Havaya Kalkan Kollar */}
                        <line x1="187" y1="108" x2="168" y2="82" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" />
                        <line x1="203" y1="108" x2="222" y2="82" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" />

                        {/* Bacaklar */}
                        <line x1="188" y1="145" x2="178" y2="185" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                        <ellipse cx="174" cy="188" rx="7" ry="4" fill="#0f172a" />
                        <line x1="202" y1="145" x2="212" y2="185" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                        <ellipse cx="216" cy="188" rx="7" ry="4" fill="#0f172a" />

                        {/* Zafer Parıltıları / Yıldızlar */}
                        <text x="150" y="70" fontSize="18" fill="#f59e0b">✨</text>
                        <text x="228" y="75" fontSize="20" fill="#f59e0b">⭐</text>
                        <text x="190" y="55" fontSize="16" fill="#10b981">🎉</text>
                    </g>
                )}

                {/* NORMAL & KAYBETME DURUMU: Aşamalı olarak çizilen karakter */}
                {!isWon && (
                    <g 
                        className={cn(isLost && "swing-animation")} 
                        style={{ transformOrigin: '195px 35px' }}
                    >
                        {/* 1. Aşama: Kafa */}
                        {mistakes >= 1 && (
                            <g className="animate-in zoom-in-75 duration-300">
                                <circle cx="195" cy="88" r="17" fill="#fde047" stroke="#ca8a04" strokeWidth="2.5" />
                                
                                {isLost ? (
                                    <>
                                        {/* X X Gözler (Kaybedildi) */}
                                        <line x1="187" y1="82" x2="193" y2="88" stroke="#713f12" strokeWidth="2" strokeLinecap="round" />
                                        <line x1="193" y1="82" x2="187" y2="88" stroke="#713f12" strokeWidth="2" strokeLinecap="round" />
                                        <line x1="197" y1="82" x2="203" y2="88" stroke="#713f12" strokeWidth="2" strokeLinecap="round" />
                                        <line x1="203" y1="82" x2="197" y2="88" stroke="#713f12" strokeWidth="2" strokeLinecap="round" />
                                        {/* Dil çıkarma :P */}
                                        <path d="M 191 95 Q 195 93 199 95" fill="none" stroke="#713f12" strokeWidth="2" />
                                        <ellipse cx="195" cy="98" rx="3" ry="4" fill="#f43f5e" />
                                    </>
                                ) : (
                                    <>
                                        {/* Normal / Endişeli Gözler */}
                                        <circle cx="190" cy="85" r="2.5" fill="#713f12" />
                                        <circle cx="200" cy="85" r="2.5" fill="#713f12" />
                                        {mistakes >= 4 ? (
                                            <path d="M 191 95 Q 195 91 199 95" fill="none" stroke="#713f12" strokeWidth="2" strokeLinecap="round" />
                                        ) : (
                                            <path d="M 191 93 Q 195 97 199 93" fill="none" stroke="#713f12" strokeWidth="2" strokeLinecap="round" />
                                        )}
                                    </>
                                )}
                            </g>
                        )}

                        {/* 2. Aşama: Gövde */}
                        {mistakes >= 2 && (
                            <path 
                                d="M 188 105 L 202 105 L 206 148 L 184 148 Z" 
                                fill="#3b82f6" 
                                stroke="#1d4ed8" 
                                strokeWidth="2.5"
                                className="animate-in slide-in-from-top-2 duration-300"
                            />
                        )}

                        {/* 3. Aşama: Sol Kol */}
                        {mistakes >= 3 && (
                            <line 
                                x1="188" 
                                y1="112" 
                                x2="170" 
                                y2="138" 
                                stroke="#f59e0b" 
                                strokeWidth="5" 
                                strokeLinecap="round"
                                className="animate-in slide-in-from-right-2 duration-300"
                            />
                        )}

                        {/* 4. Aşama: Sağ Kol */}
                        {mistakes >= 4 && (
                            <line 
                                x1="202" 
                                y1="112" 
                                x2="220" 
                                y2="138" 
                                stroke="#f59e0b" 
                                strokeWidth="5" 
                                strokeLinecap="round"
                                className="animate-in slide-in-from-left-2 duration-300"
                            />
                        )}

                        {/* 5. Aşama: Sol Bacak */}
                        {mistakes >= 5 && (
                            <g className="animate-in slide-in-from-top-2 duration-300">
                                <line x1="188" y1="148" x2="178" y2="190" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                                <ellipse cx="174" cy="193" rx="7" ry="4" fill="#0f172a" />
                            </g>
                        )}

                        {/* 6. Aşama: Sağ Bacak (Son hata) */}
                        {mistakes >= 6 && (
                            <g className="animate-in slide-in-from-top-2 duration-300">
                                <line x1="202" y1="148" x2="212" y2="190" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                                <ellipse cx="216" cy="193" rx="7" ry="4" fill="#0f172a" />
                            </g>
                        )}
                    </g>
                )}
            </svg>
        </div>
    );
}

function HangmanInnerGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const { theme, soundEnabled } = useWordwall();

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
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';
    const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Kelimeler';
    const gameContext = `Adam Asmaca - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: isMission ? '/student/gorevler' : '/oyunlar/adam-asmaca' });

    // Süre Sayacı (Stopwatch)
    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    // Kelimeleri Çek
    const fetchWords = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getAdamAsmacaAction(params);
        if (result.data) {
            setGameData(result.data);
        } else {
            setError(result.error || "Hata oluştu.");
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => { 
        fetchWords(); 
    }, [fetchWords]);

    const currentWordObj = useMemo(() => gameData?.[currentWordIndex], [gameData, currentWordIndex]);
    const isLastQuestion = gameData && currentWordIndex === gameData.length - 1;

    // Harf Tahmini
    const handleGuess = useCallback((letter: string) => {
        if (gameState !== 'playing' || guessedLetters.has(letter) || !currentWordObj) return;

        setGuessedLetters(prev => new Set(prev).add(letter));
        const normalizedWord = normalizeText(currentWordObj.word);

        if (!normalizedWord.includes(letter)) {
            setWrongGuesses(prev => prev + 1);
            if (soundEnabled) playSound('incorrect');
            setGameShake(true);
            setTimeout(() => setGameShake(false), 500);
        } else {
            if (soundEnabled) playSound('correct');
            // Her doğru harf için 2 puan
            setTotalScore(prev => prev + 2);
        }
    }, [gameState, guessedLetters, currentWordObj, soundEnabled]);

    // Kazanma / Kaybetme Durum Kontrolü
    useEffect(() => {
        if (!currentWordObj || gameState !== 'playing') return;
        
        const normalizedWord = normalizeText(currentWordObj.word);
        const lettersToGuess = normalizedWord.split('').filter(char => ALPHABET.includes(char));
        const isWon = lettersToGuess.length === 0 ? true : lettersToGuess.every(l => guessedLetters.has(l));

        if (isWon) {
            setGameState('won');
            setCorrectCount(prev => prev + 1);
            // Kelime bilindiğinde 10 puan + kalan her can için 2 bonus puan
            const livesBonus = (HANGMAN_STAGES - wrongGuesses) * 2;
            setTotalScore(prev => prev + 10 + Math.max(0, livesBonus));
            if (soundEnabled) playSound('win');
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2500);
        } else if (wrongGuesses >= HANGMAN_STAGES) {
            setGameState('lost');
            if (soundEnabled) playSound('incorrect');
        }
    }, [guessedLetters, wrongGuesses, currentWordObj, gameState, soundEnabled]);

    // Sıradaki Soruya Geçiş
    const handleNext = useCallback(() => {
        if (!isLastQuestion) {
            setCurrentWordIndex(prev => prev + 1);
            setGuessedLetters(new Set());
            setWrongGuesses(0);
            setGameState('playing');
        } else {
            setGameState('finished');
            if (gameData && correctCount >= Math.ceil(gameData.length / 2)) {
                setShowConfetti(true);
                if (soundEnabled) playSound('win');
            }
        }
    }, [isLastQuestion, gameData, correctCount, soundEnabled]);

    // Fiziksel klavye dinleyicisi (Harfler ve Enter tuşu)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'Enter' || e.key === ' ') {
                if (gameState === 'won' || gameState === 'lost') {
                    e.preventDefault();
                    handleNext();
                }
                return;
            }

            if (gameState === 'playing' && e.key.length === 1) {
                const upper = normalizeText(e.key);
                if (ALPHABET.includes(upper)) {
                    handleGuess(upper);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, handleGuess, handleNext]);

    const isThresholdPassed = gameData ? correctCount >= Math.ceil(gameData.length / 2) : false;

    // Skor Kaydetme
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
                    completed: isThresholdPassed
                });

                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(totalScore)
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

    // Boş içerik oto tamamlama
    const handleEmptyMissionSave = async () => {
        if (!user || isSaving) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const eventRef = doc(collection(db, 'scoreEvents'));
            batch.set(eventRef, {
                userId: user.uid,
                points: 0,
                context: topicId,
                gameType: 'adam-asmaca',
                timestamp: serverTimestamp(),
                isMission: true,
                completed: true
            });

            await batch.commit();
            toast({ title: "Görev Başarılı!", description: "İçerik bulunmadığı için görev otomatik olarak tamamlandı.", className: "bg-green-600 text-white" });
            router.push('/student/gorevler');
        } catch (e) {
            toast({ title: "Hata", variant: "destructive" });
        } finally { 
            setIsSaving(false); 
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
                <Loader2 className="animate-spin h-12 w-12 text-indigo-500" />
                <p className="text-lg font-bold tracking-wider animate-pulse">Adam Asmaca Yükleniyor...</p>
            </div>
        );
    }

    if (!gameData || gameData.length === 0) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-center p-4">
                <div className="bg-slate-900/90 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full text-white">
                    {isMission ? (
                        <>
                            <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-black mb-2">Görev Tamamlandı!</h2>
                            <p className="text-slate-400 mb-6 text-sm">Bu kategoriye ait kelime bulunmuyor. Bu yüzden görevin otomatik olarak başarılı sayıldı.</p>
                            <Button 
                                onClick={handleEmptyMissionSave} 
                                disabled={isSaving}
                                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                            >
                                {isSaving ? "Kaydediliyor..." : "Görevi Tamamla ve Dön"}
                            </Button>
                        </>
                    ) : (
                        <>
                            <XOctagon className="h-16 w-16 text-rose-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-black mb-2">Kelime Bulunamadı</h2>
                            <p className="text-slate-400 mb-6 text-sm">{error || "Bu kategori için henüz kelime eklenmemiş."}</p>
                            <Button onClick={() => router.back()} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold">
                                Geri Dön
                            </Button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Kelimenin parçalanması (birden fazla kelime varsa kelime gruplarına bölüp düzgün satır kayması sağlama)
    const normalizedTargetWord = currentWordObj ? normalizeText(currentWordObj.word) : '';
    const wordTokens = normalizedTargetWord ? normalizedTargetWord.trim().split(/\s+/) : [];
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
            backUrl={backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 flex flex-col justify-between overflow-y-auto sm:overflow-hidden p-2 sm:p-4 select-none"
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 160, spread: 130, startVelocity: 40 }} />
            </div>

            {gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={totalScore} 
                        onSave={user ? handleFinishAndSave : undefined} 
                        isSaving={isSaving} 
                        scoreSaved={isScoreSaved} 
                        onRestart={() => window.location.reload()} 
                        backUrl={backUrl} 
                        isSuccess={isThresholdPassed}
                        successThreshold={50}
                        isMission={isMission}
                        customMessage={
                            isMission 
                                ? (isThresholdPassed 
                                    ? `Tebrikler! ${correctCount}/${gameData.length} kelimeyi doğru bilerek %50 barajını geçtin.` 
                                    : `Maalesef ${correctCount}/${gameData.length} kelime bildin. Görevi geçmek için kelimelerin en az yarısını bilmelisin.`)
                                : undefined
                        }
                    />
                </div>
            ) : (
                <div className={cn(
                    "w-full h-full max-w-6xl mx-auto flex flex-col justify-between gap-3 sm:gap-4 transition-all",
                    gameShake && "animate-shake"
                )}>
                    {/* 1. ÜST İPUCU & SORU KARTI (WORDWALL BANNER) */}
                    <div className={cn(
                        "w-full rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 transition-all text-center relative shrink-0",
                        theme.cardBg,
                        theme.cardBorder,
                        theme.cardShadow
                    )}>
                        <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
                            <span className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                                theme.scoreBadge
                            )}>
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                İpucu & Tanım
                            </span>

                            <span className="text-[11px] sm:text-xs font-bold text-slate-400 tracking-wide">
                                {currentWordObj?.word.replace(/\s+/g, '').length} Harf
                                {wordTokens.length > 1 && ` • ${wordTokens.length} Kelime`}
                            </span>
                        </div>

                        <p className={cn(
                            "text-base sm:text-xl md:text-2xl font-black leading-snug drop-shadow-sm px-2",
                            theme.questionText
                        )}>
                            {currentWordObj?.hint}
                        </p>
                    </div>

                    {/* 2. ORTA OYUN ALANI (Darağacı & Harf Kutuları) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6 items-center flex-grow min-h-0">
                        {/* Sol Taraf: Çizim & Kalan Haklar (Darağacı Alanı) */}
                        <div className="md:col-span-5 flex flex-col items-center justify-center p-2 rounded-2xl bg-black/10 backdrop-blur-sm border border-white/5">
                            <WordwallHangmanIllustration 
                                mistakes={wrongGuesses} 
                                status={gameState} 
                            />

                            {/* Kalan Hak Kalpleri */}
                            <div className="flex items-center gap-1.5 mt-2 bg-black/25 px-3.5 py-1.5 rounded-full border border-white/10">
                                <span className="text-xs font-black text-slate-300 mr-1 hidden sm:inline">Kalan Hak:</span>
                                {Array.from({ length: HANGMAN_STAGES }).map((_, i) => {
                                    const isHeartActive = i < remainingLives;
                                    return (
                                        <Heart 
                                            key={i} 
                                            className={cn(
                                                "w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300",
                                                isHeartActive 
                                                    ? "text-rose-500 fill-rose-500 scale-100 animate-pulse" 
                                                    : "text-slate-600 fill-slate-800 scale-75 opacity-40"
                                            )} 
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sağ Taraf: Kelime Kutuları (Letter Tiles) */}
                        <div className="md:col-span-7 flex flex-col items-center justify-center gap-4 sm:gap-6 py-2">
                            {/* Harf Kutucukları Grubu */}
                            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 w-full max-w-full">
                                {wordTokens.map((token, tokenIdx) => (
                                    <div key={tokenIdx} className="flex flex-wrap justify-center items-center gap-1 sm:gap-1.5 md:gap-2">
                                        {token.split('').map((char, charIdx) => {
                                            const isSpecial = !ALPHABET.includes(char);
                                            const isGuessed = isSpecial || guessedLetters.has(char);
                                            const isLostState = gameState === 'lost';

                                            return (
                                                <div 
                                                    key={charIdx} 
                                                    className={cn(
                                                        "flex items-center justify-center select-none font-black transition-all duration-300",
                                                        "w-8 h-11 sm:w-10 sm:h-13 md:w-12 md:h-16 lg:w-14 lg:h-18",
                                                        "text-lg sm:text-2xl md:text-3xl lg:text-4xl rounded-xl md:rounded-2xl border-2 border-b-[5px]",
                                                        isGuessed 
                                                            ? "bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-300 border-b-emerald-950 text-white shadow-lg shadow-emerald-500/20 -translate-y-1 animate-in zoom-in-75 duration-200"
                                                            : (isLostState 
                                                                ? "bg-gradient-to-b from-rose-500 to-rose-700 border-rose-300 border-b-rose-950 text-white shadow-lg animate-pulse" 
                                                                : "bg-white/10 backdrop-blur-md border-white/20 border-b-white/40 text-transparent shadow-inner")
                                                    )}
                                                >
                                                    {isGuessed ? char : (isLostState ? char : '')}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            {/* Alt Bilgi Rozeti */}
                            <div className="text-center text-xs text-slate-400 font-semibold hidden sm:block">
                                Fiziksel klavyenizle veya ekrandaki harflere dokunarak tahmin yapabilirsiniz
                            </div>
                        </div>
                    </div>

                    {/* 3. ALT BÖLÜM: SANAL KLAVYE VEYA TUR SONU PANELİ */}
                    <div className="w-full shrink-0">
                        {gameState !== 'playing' ? (
                            /* Tur Bittiği Zaman Gösterilen Wordwall Bannerı */
                            <div className={cn(
                                "w-full rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center animate-in zoom-in-95 duration-300 border-2 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4",
                                gameState === 'won' 
                                    ? "bg-gradient-to-r from-emerald-950/90 via-emerald-900/90 to-teal-950/90 border-emerald-400/50 shadow-emerald-500/20 text-white" 
                                    : "bg-gradient-to-r from-rose-950/90 via-rose-900/90 to-red-950/90 border-rose-400/50 shadow-rose-500/20 text-white"
                            )}>
                                <div className="text-left flex items-center gap-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 border",
                                        gameState === 'won' ? "bg-emerald-500/30 border-emerald-300 text-emerald-200" : "bg-rose-500/30 border-rose-300 text-rose-200"
                                    )}>
                                        {gameState === 'won' ? '🎉' : '💀'}
                                    </div>
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-black tracking-wide">
                                            {gameState === 'won' ? 'Tebrikler! Doğru Bildin!' : 'Bu Turu Kaybettin!'}
                                        </h3>
                                        <p className="text-sm opacity-90">
                                            {gameState === 'won' 
                                                ? `+10 Puan ve ${remainingLives * 2} can bonusu kazandın!` 
                                                : `Doğru cevap: ${currentWordObj?.word}`}
                                        </p>
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleNext}
                                    size="lg"
                                    className="h-12 sm:h-14 px-6 sm:px-10 text-base sm:text-lg font-black rounded-xl sm:rounded-2xl bg-white text-slate-950 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all shadow-xl shrink-0 w-full sm:w-auto"
                                >
                                    {isLastQuestion ? 'Sonuçları Gör' : 'Sıradaki Soru (Enter)'}
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        ) : (
                            /* Wordwall Tarzı Dokunsal 3D Sanal Klavye */
                            <div className="flex flex-col gap-1.5 sm:gap-2 p-2 sm:p-3.5 bg-black/30 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl">
                                {KEYBOARD_ROWS.map((row, rowIndex) => (
                                    <div key={rowIndex} className="flex justify-center items-center gap-1 sm:gap-1.5 md:gap-2 w-full">
                                        {row.map(letter => {
                                            const isGuessed = guessedLetters.has(letter);
                                            const isCorrect = isGuessed && normalizedTargetWord.includes(letter);
                                            const isWrong = isGuessed && !normalizedTargetWord.includes(letter);

                                            return (
                                                <button 
                                                    key={letter} 
                                                    onClick={() => handleGuess(letter)}
                                                    disabled={isGuessed}
                                                    aria-label={`Harf ${letter}`}
                                                    className={cn(
                                                        "w-[calc((100%-9*0.25rem)/10)] sm:w-[calc((100%-9*0.375rem)/10)] md:w-[calc((100%-9*0.5rem)/10)]",
                                                        "h-10 sm:h-12 md:h-13 lg:h-14",
                                                        "rounded-lg sm:rounded-xl md:rounded-2xl font-black select-none flex items-center justify-center shrink-0",
                                                        "text-sm sm:text-base md:text-xl lg:text-2xl transition-all duration-150",
                                                        // 1. KULLANILMAMIŞ TUŞ (Wordwall 3D Dokunsal Buton)
                                                        !isGuessed && cn(
                                                            "border-2 border-b-4 active:border-b-2 active:translate-y-1",
                                                            theme.buttonIdle,
                                                            theme.buttonHover
                                                        ),
                                                        // 2. DOĞRU TAHMİN EDİLEN TUŞ (Yeşil & Canlı)
                                                        isCorrect && "bg-gradient-to-b from-emerald-500 to-emerald-700 border-2 border-emerald-300 border-b-4 border-b-emerald-950 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] cursor-default scale-95",
                                                        // 3. YANLIŞ TAHMİN EDİLEN TUŞ (Kırmızı, Üstü Çizili & Sönük)
                                                        isWrong && "bg-gradient-to-b from-rose-800 to-rose-950 border-2 border-rose-600/50 border-b-4 border-b-rose-950 text-rose-300/60 line-through opacity-50 cursor-not-allowed scale-90"
                                                    )}
                                                >
                                                    {letter}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Titreme ve Sallanma Animasyonu */}
            <style jsx global>{`
                @keyframes swing {
                    0% { transform: rotate(4deg); }
                    50% { transform: rotate(-4deg); }
                    100% { transform: rotate(4deg); }
                }
                .swing-animation {
                    animation: swing 2s ease-in-out infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-6px); }
                    80% { transform: translateX(6px); }
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
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
                <Loader2 className="animate-spin h-10 w-10 text-indigo-500" />
                <span className="font-bold tracking-widest text-slate-400 uppercase text-xs">Yükleniyor...</span>
            </div>
        }>
            <HangmanInnerGame />
        </Suspense>
    );
}
