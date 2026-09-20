'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, TerminalSquare, ShieldAlert, Cpu, Unlock, Play } from "lucide-react";
import { getSiberSifreKiriciAction, submitSiberSifreKiriciScoreAction } from '../actions';
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { GameEndScreen } from "@/components/game-end-screen";
import { useToast } from "@/hooks/use-toast";
import { getGameBackUrl } from "@/lib/game-navigation";
import { WordwallShell, useWordwall } from "@/components/wordwall/wordwall-shell";

interface Question {
    id: string;
    text?: string;
    type: 'Çoktan Seçmeli' | 'Doğru/Yanlış' | 'Boşluk Doldurma' | string;
    options?: string[];
    correctAnswer?: string;
    isTrue?: boolean;
}

const FALLBACK_WORDS = ['TEVHID', 'IHLAS', 'MELEK', 'ZEKAT', 'ORUC', 'SÜNNET', 'FARZ', 'VACIP', 'AHLAK', 'SADAKA', 'TEVEKKUL'];

function SiberBoard({
    gameState,
    startGame,
    secretWord,
    revealedIndices,
    hackedText,
    currentQ,
    options,
    handleAnswer,
    glitch,
}: {
    gameState: 'home' | 'playing';
    startGame: () => void;
    secretWord: string;
    revealedIndices: Set<number>;
    hackedText: string[];
    currentQ: Question | undefined;
    options: string[];
    handleAnswer: (answer: string) => void;
    glitch: boolean;
}) {
    const { theme } = useWordwall();

    if (gameState === 'home') {
        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                <div className={cn("w-full max-w-lg p-6 sm:p-8 rounded-2xl border-2 shadow-2xl backdrop-blur-xl text-center", theme.cardBg, theme.cardBorder, theme.cardText)}>
                    <div className="mx-auto w-16 h-16 rounded-full border-2 flex items-center justify-center mb-4 bg-emerald-500/10 border-emerald-500/30">
                        <TerminalSquare className="w-8 h-8 text-emerald-400 animate-pulse" />
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black mb-2 tracking-tight">SİBER ŞİFRE KIRICI</h1>
                    <p className={cn("text-sm sm:text-base font-medium mb-6 leading-relaxed", theme.subText)}>
                        Hedef sunucuya sızmak için soruları yanıtla, harfleri deşifre et ve güvenlik duvarı süresi bitmeden gizli kelimeyi çöz!
                    </p>
                    
                    <Button 
                        onClick={startGame} 
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-xl shadow-lg transition-transform active:scale-95 gap-2"
                    >
                        <Play className="h-5 w-5 fill-current" /> SİSTEME SIZ &gt; BAŞLA
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("w-full h-full flex flex-col min-h-0 overflow-hidden relative select-none p-2 sm:p-4 gap-4", glitch && "animate-pulse")}>
            {/* ŞİFRE KUTULARI (HEDEF KELİME) */}
            <div className={cn("flex-shrink-0 py-4 sm:py-6 px-4 rounded-2xl border-2 shadow-md flex flex-col items-center justify-center text-center", theme.cardBg, theme.cardBorder)}>
                <span className={cn("text-xs font-bold uppercase tracking-widest mb-3", theme.subText)}>
                    &gt; HEDEF DEŞİFRE MATRİKSİ ({revealedIndices.size} / {secretWord.length} Harf)
                </span>
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                    {secretWord.split('').map((char, idx) => {
                        const isRevealed = revealedIndices.has(idx);
                        return (
                            <div 
                                key={idx} 
                                className={cn(
                                    "w-10 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 flex items-center justify-center rounded-xl border-2 text-2xl sm:text-4xl md:text-5xl font-black transition-all duration-300 shadow-md",
                                    isRevealed 
                                        ? "border-emerald-400 bg-emerald-950/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-105" 
                                        : cn(theme.subPanelBg, theme.cardBorder, "opacity-50")
                                )}
                            >
                                {isRevealed ? char : '?'}
                            </div>
                        );
                    })}
                </div>
                {revealedIndices.size === secretWord.length && (
                    <div className="mt-3 flex items-center gap-2 text-emerald-400 font-bold animate-bounce text-sm">
                        <Unlock className="w-4 h-4" /> ERİŞİM SAĞLANDI!
                    </div>
                )}
            </div>

            {/* HACKİNG TERMİNALİ (Soru ve Seçenekler) */}
            <div className={cn("flex-1 min-h-0 rounded-2xl border-2 shadow-xl flex overflow-hidden", theme.cardBg, theme.cardBorder)}>
                {/* Sol Panel: Terminal logları (Görsel estetik) */}
                <div className={cn("w-1/3 border-r hidden md:flex flex-col text-[11px] font-mono leading-relaxed p-3 overflow-hidden break-all opacity-60", theme.subPanelBg, theme.cardBorder)}>
                    {hackedText.map((txt, i) => (
                        <div key={i} className="truncate">{txt}</div>
                    ))}
                </div>

                {/* Sağ Panel: Aktif Soru & Seçenekler */}
                <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto">
                    <div className="flex items-start gap-3 mb-4">
                        <span className="text-emerald-400 font-bold text-lg">&gt;</span>
                        <p className={cn("text-base sm:text-xl font-bold leading-relaxed", theme.cardText)}>
                            {currentQ?.text}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mt-auto">
                        {options.map((opt, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleAnswer(opt)}
                                className={cn(
                                    "text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all flex items-center gap-3 font-bold text-sm sm:text-base group cursor-pointer shadow-sm active:translate-y-1 hover:scale-[1.02]",
                                    theme.buttonIdle,
                                    theme.cardText,
                                    theme.cardBorder
                                )}
                            >
                                <span className="opacity-60 text-xs font-mono">[{idx + 1}]</span>
                                <span className="flex-1 leading-snug">{opt}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SiberSifreKiriciContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/siber-sifre-kirici' });
    const topicName = searchParams.get('topicName') || searchParams.get('title') || undefined;
    const gameContext = `Siber Şifre Kırıcı - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

    // --- STATE ---
    const [gameState, setGameState] = useState<'loading' | 'error' | 'home' | 'playing' | 'gameover'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    
    // Siber State
    const [secretWord, setSecretWord] = useState('');
    const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
    const [timeLeft, setTimeLeft] = useState(90);
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    
    // UI Effects
    const [glitch, setGlitch] = useState(false);
    const [hackedText, setHackedText] = useState<string[]>([]);

    // --- DATA FETCHING ---
    const fetchGameData = useCallback(async () => {
        try {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                isStatic: searchParams.get('isStatic') === 'true',
            };
            const result = await getSiberSifreKiriciAction(params);
            
            if (result.error || result.questions.length === 0) {
                setError(result.error || "Bu konu için soru bulunamadı.");
                setGameState('error');
            } else {
                setQuestions(result.questions);
                setGameState('home');
            }
        } catch (err: any) {
            setError(err.message || "Veri yüklenemedi.");
            setGameState('error');
        }
    }, [searchParams]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);

    // Timer Effect
    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (gameState === 'playing' && timeLeft <= 0) {
            setGameState('gameover');
        }
    }, [gameState, timeLeft]);

    // Background Matrix Text effect
    useEffect(() => {
        if (gameState !== 'playing') return;
        const matrixLines = [
            'CONNECTING TO SECURE SERVER...',
            'BYPASSING FIREWALL...',
            'DECRYPTING PACKETS: ' + Math.random().toString(36).substring(2, 8),
            'ACCESS GRANTED.',
            'SYSTEM BREACH DETECTED!',
            'DOWNLOADING ENCRYPTED HASH...',
            '0x' + Math.floor(Math.random()*16777215).toString(16),
            'INITIALIZING BRUTE FORCE SCRIPT...'
        ];
        
        const interval = setInterval(() => {
            setHackedText(prev => {
                const newLines = [...prev, matrixLines[Math.floor(Math.random() * matrixLines.length)]];
                return newLines.slice(-15);
            });
        }, 1500);
        return () => clearInterval(interval);
    }, [gameState]);

    // --- GAME LOGIC ---
    const startGame = () => {
        let chosenWord = FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
        
        const possibleWords = questions
            .filter(q => q.type === 'Çoktan Seçmeli')
            .map(q => q.correctAnswer)
            .filter((ans): ans is string => Boolean(ans && !ans.includes(' ') && ans.length >= 4 && ans.length <= 10));
            
        if (possibleWords.length > 0) {
            const randWord = possibleWords[Math.floor(Math.random() * possibleWords.length)];
            if (randWord) {
                const w = randWord.toLocaleUpperCase('tr-TR');
                chosenWord = w.replace(/[^A-ZÇĞİÖŞÜ]/g, '');
            }
        }

        setSecretWord(chosenWord);
        setRevealedIndices(new Set());
        setScore(0);
        setTimeLeft(90);
        setCurrentQIndex(0);
        setIsSaving(false);
        setIsScoreSaved(false);
        setHackedText(['> INIT ROOT...']);
        setGameState('playing');
    };

    const triggerGlitch = () => {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 300);
    };

    const handleAnswer = (answer: string) => {
        const q = questions[currentQIndex];
        const isCorrect = q.type === 'Doğru/Yanlış' 
            ? ((answer === "Doğru" && q.isTrue) || (answer === "Yanlış" && !q.isTrue) || (answer === q.correctAnswer))
            : (answer === q.correctAnswer);

        if (isCorrect) {
            const unrevealed = Array.from({ length: secretWord.length }, (_, i) => i).filter(i => !revealedIndices.has(i));
            if (unrevealed.length > 0) {
                const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                setRevealedIndices(prev => {
                    const next = new Set(prev);
                    next.add(randomIdx);
                    return next;
                });
                
                setScore(s => s + 5);
                setHackedText(prev => [...prev, `> DECRYPTED SECTOR ${randomIdx} [OK]`].slice(-15));
                
                if (unrevealed.length === 1) {
                    const timeBonus = timeLeft * 5;
                    setScore(s => s + 5 + timeBonus);
                    setHackedText(prev => [...prev, `> TIME BONUS: +${timeBonus}`].slice(-15));
                    setTimeout(() => setGameState('gameover'), 500);
                    return;
                }
            }
        } else {
            triggerGlitch();
            setTimeLeft(t => Math.max(0, t - 10));
            setHackedText(prev => [...prev, `> ERROR: INTRUSION DETECTED! TRACE RUNNING...`].slice(-15));
        }

        setCurrentQIndex(prev => (prev + 1) % questions.length);
    };

    const handleSaveAndExit = async () => {
        if (!user || isSaving || isScoreSaved || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitSiberSifreKiriciScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: "Başarılı!", description: "Skor sisteme kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const currentQ = questions[currentQIndex];
    const options = useMemo(() => {
        if (!currentQ) return [];
        if (currentQ.type === 'Doğru/Yanlış') return ['Doğru', 'Yanlış'];
        return [...(currentQ.options || [])].sort(() => 0.5 - Math.random());
    }, [currentQIndex, questions]);

    if (gameState === 'loading') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 font-mono">
                <div className="text-emerald-400 flex flex-col items-center">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p>{"> SİSTEME BAĞLANILIYOR..."}</p>
                </div>
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 font-mono p-4">
                <div className="text-rose-400 flex flex-col items-center max-w-md text-center">
                    <ShieldAlert className="w-12 h-12 mb-4" />
                    <p className="mb-4">{error}</p>
                    <Button onClick={() => router.push(backUrl)} className="bg-rose-900 hover:bg-rose-800 text-white">Geri Dön</Button>
                </div>
            </div>
        );
    }

    const isFinished = gameState === 'gameover';

    return (
        <WordwallShell
            title="Siber Şifre Kırıcı"
            subtitle={topicName || "Şifre Çözücü Terminal"}
            score={score}
            timeLeft={timeLeft}
            maxTime={90}
            backUrl={backUrl}
            isFinished={isFinished}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden relative flex flex-col p-2 sm:p-4"
        >
            {isFinished ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen
                        score={score}
                        onSave={handleSaveAndExit}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={startGame}
                        backUrl={backUrl}
                    />
                </div>
            ) : (
                <SiberBoard
                    gameState={gameState === 'playing' ? 'playing' : 'home'}
                    startGame={startGame}
                    secretWord={secretWord}
                    revealedIndices={revealedIndices}
                    hackedText={hackedText}
                    currentQ={currentQ}
                    options={options}
                    handleAnswer={handleAnswer}
                    glitch={glitch}
                />
            )}
        </WordwallShell>
    );
}

export default function SiberSifreKiriciPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-slate-950 flex items-center justify-center"><Loader2 className="w-12 h-12 text-emerald-400 animate-spin" /></div>}>
            <SiberSifreKiriciContent />
        </Suspense>
    );
}
