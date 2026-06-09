'use client';

import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Home, Maximize2, TerminalSquare, ShieldAlert, Cpu, Unlock, Fingerprint } from "lucide-react";
import { getSiberSifreKiriciAction, submitSiberSifreKiriciScoreAction } from '../actions';
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { GameEndScreen } from "@/components/game-end-screen";
import { useToast } from "@/hooks/use-toast";

interface Question {
    id: string;
    text: string;
    type: 'Çoktan Seçmeli' | 'Doğru/Yanlış';
    options?: string[];
    correctAnswer: string;
    isTrue?: boolean;
}

const FALLBACK_WORDS = ['TEVHID', 'IHLAS', 'MELEK', 'ZEKAT', 'ORUC', 'SÜNNET', 'FARZ', 'VACIP', 'AHLAK', 'SADAKA', 'TEVEKKUL'];

const MATRIX_CSS = `
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  .scanline {
    position: fixed; left: 0; top: 0; width: 100%; height: 20px;
    background: linear-gradient(to bottom, rgba(16,185,129,0), rgba(16,185,129,0.2) 50%, rgba(16,185,129,0));
    opacity: 0.1; animation: scanline 4s linear infinite; pointer-events: none; z-index: 50;
  }
  .crt-effect {
    position: fixed; inset: 0; pointer-events: none; z-index: 49;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
    background-size: 100% 2px, 3px 100%;
  }
  .terminal-text { font-family: 'Courier New', Courier, monospace; }
  
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  .cursor-blink { animation: blink 1s step-end infinite; }
  
  @keyframes glitch {
    0% { transform: translate(0) }
    20% { transform: translate(-2px, 2px) }
    40% { transform: translate(-2px, -2px) }
    60% { transform: translate(2px, 2px) }
    80% { transform: translate(2px, -2px) }
    100% { transform: translate(0) }
  }
  .glitch-anim { animation: glitch 0.2s cubic-bezier(.25, .46, .45, .94) both infinite; }
`;

function SiberSifreKiriciContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const backUrl = useMemo(() => {
        const { courseId, unitId, topicId, courseName, unitName, topicName } = Object.fromEntries(searchParams.entries());
        if (courseId && unitId && topicId) {
            return `/konu/${courseId}/${unitId}/${topicId}/oyunlar?courseName=${encodeURIComponent(courseName || '')}&unitName=${encodeURIComponent(unitName || '')}&topicName=${encodeURIComponent(topicName || '')}`;
        }
        if (user) {
            return user.role === 'teacher' || user.role === 'superadmin' ? '/teacher' : '/student';
        }
        return '/oyunlar';
    }, [searchParams, user]);

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
            endGame(false);
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
                return newLines.slice(-15); // Keep last 15 lines
            });
        }, 1500);
        return () => clearInterval(interval);
    }, [gameState]);

    // --- GAME LOGIC ---
    const startGame = () => {
        // Choose secret word
        let chosenWord = FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
        
        // Try to extract from correct answers (single words)
        const possibleWords = questions
            .filter(q => q.type === 'Çoktan Seçmeli')
            .map(q => q.correctAnswer)
            .filter(ans => ans && !ans.includes(' ') && ans.length >= 4 && ans.length <= 10);
            
        if (possibleWords.length > 0) {
            // Pick a random one and make uppercase, remove turkish chars for simplicity in terminal
            const w = possibleWords[Math.floor(Math.random() * possibleWords.length)].toLocaleUpperCase('tr-TR');
            // Remove spaces/special chars just in case
            chosenWord = w.replace(/[^A-ZÇĞİÖŞÜ]/g, '');
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

    const endGame = (isHacked: boolean) => {
        setGameState('gameover');
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
            // Reveal a letter
            const unrevealed = Array.from({length: secretWord.length}, (_, i) => i).filter(i => !revealedIndices.has(i));
            if (unrevealed.length > 0) {
                const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                setRevealedIndices(prev => {
                    const next = new Set(prev);
                    next.add(randomIdx);
                    return next;
                });
                
                setScore(s => s + 50); // Points per letter
                setHackedText(prev => [...prev, `> DECRYPTED SECTOR ${randomIdx} [OK]`].slice(-15));
                
                // Check win condition
                if (unrevealed.length === 1) { // 1 before adding
                    const timeBonus = timeLeft * 5;
                    setScore(s => s + 50 + timeBonus); // Points per letter + time bonus
                    setHackedText(prev => [...prev, `> TIME BONUS: +${timeBonus}`].slice(-15));
                    setTimeout(() => endGame(true), 500);
                    return;
                }
            }
        } else {
            // Wrong Answer!
            triggerGlitch();
            setTimeLeft(t => Math.max(0, t - 10)); // Penalty
            setHackedText(prev => [...prev, `> ERROR: INTRUSION DETECTED! TRACE RUNNING...`].slice(-15));
        }

        // Next Question
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

    const toggleFS = () => {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) elem.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    const currentQ = questions[currentQIndex];
    const options = useMemo(() => {
        if (!currentQ) return [];
        if (currentQ.type === 'Doğru/Yanlış') return ['Doğru', 'Yanlış'];
        return [...(currentQ.options || [])].sort(() => 0.5 - Math.random());
    }, [currentQIndex, questions]);

    // --- RENDER ---
    if (gameState === 'loading') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black terminal-text">
                <div className="text-emerald-500 flex flex-col items-center">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p>{"> CONNECTING TO MAINFRAME..."}</p>
                </div>
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black terminal-text">
                <div className="text-rose-500 flex flex-col items-center">
                    <ShieldAlert className="w-12 h-12 mb-4" />
                    <p>{error}</p>
                    <Button onClick={() => router.push(backUrl)} className="mt-4 bg-rose-900 text-rose-400">ABORT</Button>
                </div>
            </div>
        );
    }

    if (gameState === 'gameover') {
        const isHacked = revealedIndices.size === secretWord.length;
        return (
            <div className="min-h-screen bg-black">
                <GameEndScreen
                    score={score}
                    onSave={handleSaveAndExit}
                    isSaving={isSaving}
                    scoreSaved={isScoreSaved}
                    onRestart={startGame}
                    backUrl={backUrl}
                />
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen bg-[#050505] text-emerald-500 overflow-hidden relative font-mono selection:bg-emerald-900 selection:text-emerald-300", glitch && "glitch-anim")}>
            <style jsx global>{MATRIX_CSS}</style>
            <div className="scanline"></div>
            <div className="crt-effect"></div>

            {/* UPPER CONTROLS */}
            <div className="absolute top-4 right-4 z-[100] flex gap-2">
                <button className="bg-black border border-emerald-900/50 rounded-sm px-3 py-1.5 text-xs font-bold flex items-center gap-2 hover:bg-emerald-950 transition text-emerald-600 hover:text-emerald-400" onClick={() => { if(gameState==='playing') endGame(false); else router.push(backUrl); }}>
                    <Home size={14}/> ABORT
                </button>
                <button className="bg-black border border-emerald-900/50 rounded-sm px-3 py-1.5 text-xs font-bold flex items-center gap-2 hover:bg-emerald-950 transition text-emerald-600 hover:text-emerald-400" onClick={toggleFS}>
                    <Maximize2 size={14}/> FS
                </button>
            </div>

            {gameState === 'home' && (
                <div className="flex flex-col items-center justify-center h-screen px-4 text-center z-10 relative">
                    <div className="w-24 h-24 rounded-full border-2 border-emerald-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <TerminalSquare className="w-12 h-12 text-emerald-400 animate-pulse" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">SIBER_SIFRE_KIRICI</h1>
                    <p className="text-emerald-600 mb-8 max-w-md">Hedef sunucuya sızmak için soruları yanıtla, harfleri deşifre et ve güvenlik duvarı süresi bitmeden şifreyi kır.</p>
                    
                    <Button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-black font-black text-lg px-8 py-6 rounded-none border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] uppercase">
                        &gt; EXECUTE_HACK.SH
                    </Button>
                </div>
            )}

            {gameState === 'playing' && (
                <div className="flex flex-col h-screen p-4 md:p-8 pt-16 z-10 relative max-w-6xl mx-auto gap-6">
                    
                    {/* TOP BAR: FIREWALL & SCORE */}
                    <div className="flex flex-wrap items-center justify-between bg-black/80 border border-emerald-900/50 p-4 rounded-sm backdrop-blur-md gap-4">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className={cn("w-6 h-6", timeLeft < 30 ? "text-rose-500 animate-pulse" : "text-emerald-500")} />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-emerald-700 uppercase tracking-widest">FIREWALL_BYPASS_TIME</span>
                                <span className={cn("text-2xl font-black", timeLeft < 30 ? "text-rose-500" : "text-emerald-400")}>
                                    00:{timeLeft.toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-emerald-700 uppercase tracking-widest">DECRYPT_SCORE</span>
                                <span className="text-2xl font-black text-emerald-400">{score.toString().padStart(5, '0')}</span>
                            </div>
                            <Cpu className="w-6 h-6 text-emerald-500 opacity-50" />
                        </div>
                    </div>

                    {/* PASSWORD BOX */}
                    <div className="flex-1 flex flex-col items-center justify-center py-8">
                        <span className="text-xs text-emerald-700 mb-4 tracking-widest">&gt; TARGET_HASH_ENCRYPTED</span>
                        <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
                            {secretWord.split('').map((char, idx) => {
                                const isRevealed = revealedIndices.has(idx);
                                return (
                                    <div key={idx} className={cn(
                                        "w-12 h-16 md:w-16 md:h-20 flex items-center justify-center border-2 text-3xl md:text-5xl font-black transition-all duration-300",
                                        isRevealed 
                                            ? "border-emerald-400 bg-emerald-900/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                                            : "border-emerald-950 bg-black text-emerald-900"
                                    )}>
                                        {isRevealed ? char : '?'}
                                    </div>
                                );
                            })}
                        </div>
                        {revealedIndices.size === secretWord.length && (
                            <div className="mt-8 flex items-center gap-2 text-emerald-400 animate-pulse">
                                <Unlock className="w-5 h-5" /> ACCESS GRANTED
                            </div>
                        )}
                    </div>

                    {/* HACKING TERMINAL (Questions) */}
                    <div className="h-64 md:h-80 bg-black border border-emerald-800/50 flex overflow-hidden rounded-sm relative">
                        {/* Left Side: Background matrix text (aesthetic only) */}
                        <div className="w-1/3 border-r border-emerald-900/50 p-2 hidden md:flex flex-col text-[10px] leading-tight text-emerald-800/50 overflow-hidden break-all">
                            {hackedText.map((txt, i) => <div key={i}>{txt}</div>)}
                        </div>

                        {/* Right Side: Active Question */}
                        <div className="flex-1 p-4 md:p-6 flex flex-col relative z-20 bg-black/90">
                            <div className="flex items-start gap-3 mb-6">
                                <span className="text-emerald-600 mt-1">&gt;</span>
                                <p className="text-sm md:text-lg text-emerald-300 font-bold leading-relaxed">{currentQ?.text}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-auto">
                                {options.map((opt, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleAnswer(opt)}
                                        className="text-left border border-emerald-800/50 p-3 bg-emerald-950/20 hover:bg-emerald-900 hover:border-emerald-500 transition-colors flex items-center gap-3 text-sm md:text-base group"
                                    >
                                        <span className="text-emerald-700 group-hover:text-emerald-400">[{idx+1}]</span>
                                        <span className="flex-1 text-emerald-500 group-hover:text-emerald-200 truncate">{opt}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

export default function SiberSifreKiriciPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-black"></div>}>
            <SiberSifreKiriciContent />
        </Suspense>
    );
}
