'use client';

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Loader2, Repeat, Home, CheckCircle2, XCircle, User, ArrowRight, 
  Trophy, Timer, Play, SkipForward, ThumbsUp, Power, Users, ArrowLeft,
  Plus, Minus, Sparkles, Maximize2
} from "lucide-react";
import Link from "next/link";
import { getAnlatBakalimWords } from '../actions';
import { cn } from "@/lib/utils";
import { playSound, stopSound } from "@/lib/audio-service";
import confetti from 'canvas-confetti';
import { FullscreenToggle } from "@/components/fullscreen-toggle";

// --- TAKIM AYARLARI ---
const TEAMS_CONFIG = [
    { id: 0, name: "MAVİ", color: "text-blue-400", bg: "bg-blue-950", border: "border-blue-500", iconBg: "bg-blue-600", activeRing: "ring-blue-400" },
    { id: 1, name: "KIRMIZI", color: "text-red-400", bg: "bg-red-950", border: "border-red-500", iconBg: "bg-red-600", activeRing: "ring-red-400" },
    { id: 2, name: "YEŞİL", color: "text-emerald-400", bg: "bg-emerald-950", border: "border-emerald-500", iconBg: "bg-emerald-600", activeRing: "ring-emerald-400" },
    { id: 3, name: "SARI", color: "text-amber-400", bg: "bg-amber-950", border: "border-amber-500", iconBg: "bg-amber-600", activeRing: "ring-amber-400" },
];

function MultiTeamTabooComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // URL Parametreleri
    const courseName = searchParams.get('courseName') || '';
    const unitName = searchParams.get('unitName') || '';
    const topicName = searchParams.get('topicName') || '';
    const className = searchParams.get('className') || '';
    const backUrl = "/teacher/smartboard/anlat-bakalim";

    // --- STATE ---
    const [words, setWords] = useState<string[]>([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    
    // Oyun Aşamaları
    const [gameState, setGameState] = useState<'loading' | 'error' | 'team_select' | 'ready' | 'playing' | 'turn_result' | 'finished'>('loading');
    
    // Takım Yönetimi
    const [teamCount, setTeamCount] = useState<number>(2);
    const [activeTeamIndex, setActiveTeamIndex] = useState<number>(0);
    const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);
    
    // Süre
    const TURN_DURATION = 30;
    const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
    const [lastTurnResult, setLastTurnResult] = useState<'correct' | 'pass' | 'timeout' | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string|null>(null);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Veri Çekme
    const loadWords = async () => {
        setIsLoading(true);
        setError(null);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getAnlatBakalimWords(params);
        
        if (result.error && (!result.words || result.words.length === 0)) {
            setError(result.error || "Bu konu için kelime bulunamadı.");
            setGameState('error');
        } else {
            const baseWords = result.words || [];
            // Smartboard akıcılığı için kelimeleri çoğalt
            const tripledWords = [...baseWords, ...baseWords, ...baseWords];
            setWords(tripledWords.sort(() => Math.random() - 0.5));
            setGameState('team_select');
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadWords();
    }, [searchParams]);

    // Timer
    useEffect(() => {
        if (gameState === 'playing') {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleTurnEnd('timeout');
                        return 0;
                    }
                    if (prev <= 6) {
                        try { playSound('timer'); } catch (e) {}
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            try { stopSound('timer'); } catch (e) {}
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            try { stopSound('timer'); } catch (e) {}
        };
    }, [gameState]);

    // Konfeti ve bitiş sesi
    useEffect(() => {
        if (gameState === 'finished') {
            try { playSound('win'); } catch (e) {}
            try {
                confetti({
                    particleCount: 100,
                    spread: 80,
                    origin: { y: 0.6 }
                });
            } catch (e) {}
        }
    }, [gameState]);

    // --- OYUN MANTIĞI ---
    const handleTeamSelect = (count: number) => {
        setTeamCount(count);
        setScores(new Array(4).fill(0));
        setActiveTeamIndex(0);
        setCurrentWordIndex(0);
        setTimeLeft(TURN_DURATION);
        setGameState('ready');
    };

    const handleTurnEnd = (result: 'correct' | 'pass' | 'timeout') => {
        try { stopSound('timer'); } catch (e) {}
        
        if (result === 'correct') {
            try { playSound('correct'); } catch (e) {}
            setScores(prev => {
                const newScores = [...prev];
                newScores[activeTeamIndex] += 1;
                return newScores;
            });
        } else if (result === 'pass') {
            try { playSound('incorrect'); } catch (e) {}
        } else {
            try { playSound('timeUp'); } catch (e) {}
        }

        setLastTurnResult(result);
        setGameState('turn_result');
    };

    const nextTurn = () => {
        if (currentWordIndex >= words.length - 1) {
            setGameState('finished');
            return;
        }

        setActiveTeamIndex(prev => (prev + 1) % teamCount);
        setCurrentWordIndex(prev => prev + 1);
        setTimeLeft(TURN_DURATION);
        setGameState('ready');
    };

    const startGame = () => setGameState('playing');
    
    const forceFinishGame = () => {
        try { stopSound('timer'); } catch (e) {}
        setGameState('finished');
    };

    const resetGame = () => {
        setScores([0, 0, 0, 0]);
        setActiveTeamIndex(0);
        setWords(prev => [...prev].sort(() => Math.random() - 0.5));
        setCurrentWordIndex(0);
        setTimeLeft(TURN_DURATION);
        setGameState('team_select');
    };

    const adjustScore = (teamIdx: number, delta: number) => {
        setScores(prev => {
            const next = [...prev];
            next[teamIdx] = Math.max(0, next[teamIdx] + delta);
            return next;
        });
    };

    const currentTeam = TEAMS_CONFIG[activeTeamIndex];

    // Yükleniyor
    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
                <Loader2 className="w-16 h-16 animate-spin text-purple-500" />
                <span className="text-xl font-bold tracking-wide">Kelimeler hazırlanıyor...</span>
            </div>
        );
    }

    // Hata Ekranı
    if (gameState === 'error') {
        return (
            <div className="h-screen w-screen flex items-center justify-center p-4 bg-slate-950 text-white text-center">
                <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
                    <h2 className="text-2xl font-black text-rose-400">Hata Oluştu</h2>
                    <p className="text-slate-300 text-sm">{error}</p>
                    <div className="flex justify-center gap-3 pt-2">
                        <Button onClick={loadWords} className="bg-purple-600 hover:bg-purple-500 font-bold">
                            Tekrar Dene
                        </Button>
                        <Link href={backUrl}>
                            <Button variant="outline" className="border-white/10 hover:bg-white/10 text-slate-300">
                                Geri Dön
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // 1. TAKIM SEÇİM EKRANI
    if (gameState === 'team_select') {
        return (
            <div ref={containerRef} className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Glows */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

                {/* Üst Navigasyon */}
                <div className="absolute top-6 left-6 z-20">
                    <Link href={backUrl}>
                        <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Kuruluma Dön
                        </Button>
                    </Link>
                </div>

                <div className="absolute top-6 right-6 z-20">
                    <FullscreenToggle elementRef={containerRef} />
                </div>

                <Card className="w-full max-w-3xl bg-slate-900/80 backdrop-blur-xl border-white/10 text-white shadow-2xl rounded-3xl relative z-10">
                    {/* Üst Rozet */}
                    {(topicName || className) && (
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-6 text-xs text-slate-400">
                            {className && <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-purple-300 font-semibold">{className}</span>}
                            {topicName && <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold max-w-xs truncate">{topicName}</span>}
                        </div>
                    )}

                    <CardHeader className="text-center pb-6">
                        <div className="w-20 h-20 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                            <Users className="w-10 h-10 text-indigo-400" />
                        </div>
                        <CardTitle className="text-4xl sm:text-5xl font-black tracking-tight uppercase">ANLAT BAKALIM</CardTitle>
                        <CardDescription className="text-slate-400 text-lg mt-2">
                            Yarışacak takım sayısını seçin:
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center gap-4 sm:gap-6 py-6 flex-wrap">
                        {[2, 3, 4].map((num) => (
                            <Button
                                key={num}
                                onClick={() => handleTeamSelect(num)}
                                className="h-28 w-28 sm:h-36 sm:w-36 flex flex-col items-center justify-center gap-2 text-xl sm:text-2xl font-black rounded-2xl bg-slate-800/80 hover:bg-indigo-600 hover:scale-105 transition-all border-2 border-slate-700 hover:border-indigo-400 shadow-xl active:scale-95"
                            >
                                <Users className="w-8 h-8 text-indigo-300" />
                                <span>{num} TAKIM</span>
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 2. READY EKRANI
    if (gameState === 'ready') {
        return (
            <div ref={containerRef} className={cn(
                "h-screen w-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 relative select-none",
                currentTeam.bg
            )}>
                {/* Header */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                    <Button 
                        onClick={() => setShowExitConfirm(true)} 
                        variant="ghost" 
                        size="sm" 
                        className="text-white/70 hover:text-white hover:bg-white/10 text-xs font-bold rounded-xl"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Çıkış
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button onClick={forceFinishGame} variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 text-xs font-bold rounded-xl">
                            <Power className="mr-1.5 w-4 h-4" /> Oyunu Bitir
                        </Button>
                        <FullscreenToggle elementRef={containerRef} />
                    </div>
                </div>

                <div className="text-center space-y-6 animate-in zoom-in duration-300 max-w-2xl px-4">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-black uppercase tracking-widest">
                        SIRA SİZDE
                    </span>
                    <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight drop-shadow-lg">
                        {currentTeam.name} TAKIM
                    </h1>
                    <p className="text-white/80 text-lg sm:text-xl font-medium">
                        Kelimeleri anlatacak öğrenci tahtaya geçsin ve hazır olduğunuzda başlatın!
                    </p>
                    
                    <Button 
                        onClick={startGame} 
                        className="h-20 sm:h-24 px-12 sm:px-16 text-2xl sm:text-3xl font-black rounded-full shadow-[0_0_50px_rgba(255,255,255,0.3)] bg-white text-slate-950 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
                    >
                        KELİMEYİ GÖSTER <Play className="ml-3 w-8 h-8 fill-slate-950" />
                    </Button>
                </div>
                
                {/* Alt Skor Çubuğu */}
                <div className="absolute bottom-8 flex gap-3 sm:gap-6 flex-wrap justify-center px-4">
                    {TEAMS_CONFIG.slice(0, teamCount).map((t, idx) => (
                        <div key={t.id} className={cn(
                            "flex flex-col items-center px-4 py-2 rounded-2xl bg-black/40 border transition-all", 
                            activeTeamIndex === idx ? `ring-2 ${t.activeRing} border-white/30 scale-105` : "border-white/10 opacity-70"
                        )}>
                            <span className={cn("font-black text-xs sm:text-sm tracking-wider", t.color)}>{t.name}</span>
                            <span className="text-white text-2xl sm:text-3xl font-black">{scores[idx]}</span>
                        </div>
                    ))}
                </div>

                {/* Çıkış Onay Modalı */}
                {showExitConfirm && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
                            <h3 className="text-xl font-black text-white">Oyundan Çıkılsın mı?</h3>
                            <p className="text-slate-300 text-sm">Mevcut skorlar sıfırlanacaktır.</p>
                            <div className="flex gap-3 justify-center pt-2">
                                <Button variant="ghost" onClick={() => setShowExitConfirm(false)} className="text-slate-400 hover:text-white">
                                    İptal
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    onClick={() => {
                                        setShowExitConfirm(false);
                                        router.push(backUrl);
                                    }}
                                >
                                    Evet, Çık
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 3. OYUN EKRANI
    if (gameState === 'playing') {
        return (
            <div ref={containerRef} className={cn("h-screen w-screen text-white flex flex-col overflow-hidden relative select-none", currentTeam.bg)}>
                
                {/* Üst Bar */}
                <header className="h-20 bg-black/30 flex items-center justify-between px-6 sm:px-8 backdrop-blur-md border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md", currentTeam.iconBg)}>
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-lg sm:text-xl font-black text-white tracking-wide">
                                {currentTeam.name} TAKIM
                            </div>
                            <div className="text-xs text-white/60 font-semibold">Anlatıyor</div>
                        </div>
                    </div>
                    
                    {/* Büyük Dairesel/Kare Zamanlayıcı */}
                    <div className={cn(
                        "flex items-center gap-3 bg-black/50 px-6 py-2 rounded-2xl border-2 transition-all shadow-lg",
                        timeLeft <= 6 ? "border-rose-500 animate-pulse text-rose-400 bg-rose-950/60" : "border-white/20 text-white"
                    )}>
                        <Timer className="w-7 h-7" />
                        <span className="text-3xl sm:text-4xl font-black font-mono w-16 text-center">{timeLeft}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={forceFinishGame} variant="destructive" size="sm" className="font-bold bg-rose-600/80 hover:bg-rose-600 rounded-xl h-10 px-4 text-xs">
                            <Power className="mr-1.5 w-4 h-4" /> BİTİR
                        </Button>
                        <FullscreenToggle elementRef={containerRef} />
                    </div>
                </header>

                {/* Kelime Alanı */}
                <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
                    <div className="w-full max-w-4xl aspect-[16/9] bg-white text-slate-900 rounded-[2.5rem] sm:rounded-[3rem] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200 border-8 border-white/20">
                        <div className="absolute top-6 left-0 right-0 text-center">
                            <span className="text-xs sm:text-sm text-slate-400 font-black tracking-[0.2em] uppercase bg-slate-100 px-4 py-1.5 rounded-full">
                                ANLATILACAK KAVRAM
                            </span>
                        </div>
                        
                        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-tight text-center px-6 select-none break-words max-w-full text-slate-900 drop-shadow-sm">
                            {words[currentWordIndex]}
                        </h1>
                        
                        <div className="absolute bottom-6 flex items-center gap-2">
                            <span className="text-slate-400 text-xs font-bold bg-slate-100 px-3 py-1 rounded-full">
                                {currentWordIndex + 1} / {words.length}
                            </span>
                        </div>
                    </div>
                </main>

                {/* Butonlar */}
                <footer className="h-28 sm:h-32 bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-4 sm:gap-6 px-4 pb-2">
                    <Button 
                        onClick={() => handleTurnEnd('pass')} 
                        className="h-16 sm:h-20 flex-1 max-w-md bg-slate-700 hover:bg-slate-600 text-white text-xl sm:text-2xl font-black rounded-2xl border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all shadow-lg"
                    >
                        <SkipForward className="mr-2 sm:mr-3 w-7 h-7 sm:w-8 sm:h-8" /> PAS / BİLEMEDİ
                    </Button>
                    <Button 
                        onClick={() => handleTurnEnd('correct')} 
                        className="h-16 sm:h-20 flex-1 max-w-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-2xl sm:text-3xl font-black rounded-2xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 shadow-lg shadow-emerald-500/30 transition-all"
                    >
                        <CheckCircle2 className="mr-2 sm:mr-3 w-8 h-8 sm:w-10 sm:h-10" /> BİLDİ (+1 PUAN)
                    </Button>
                </footer>
            </div>
        );
    }

    // 4. ARA EKRAN
    if (gameState === 'turn_result') {
        let ResultIcon = ThumbsUp;
        let resultText = "DOĞRU BİLDİ!";
        let resultColor = "text-emerald-400";
        
        if (lastTurnResult === 'pass') {
            ResultIcon = SkipForward;
            resultText = "PAS GEÇİLDİ";
            resultColor = "text-amber-400";
        } else if (lastTurnResult === 'timeout') {
            ResultIcon = XCircle;
            resultText = "SÜRE BİTTİ";
            resultColor = "text-rose-400";
        }

        return (
            <div ref={containerRef} className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative select-none">
                <Card className="w-full max-w-3xl bg-slate-900/90 border-white/10 text-white text-center p-6 sm:p-8 rounded-3xl shadow-2xl animate-in zoom-in-95">
                    
                    <div className="mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                            <ResultIcon className={cn("w-12 h-12", resultColor)} />
                        </div>
                        <h2 className={cn("text-3xl sm:text-4xl font-black uppercase tracking-tight", resultColor)}>{resultText}</h2>
                        <p className="text-slate-400 mt-2 text-base sm:text-lg">
                            <span className={cn("font-black", currentTeam.color)}>{currentTeam.name}</span> takımının sırası tamamlandı.
                        </p>
                    </div>

                    {/* Skor Tablosu - Grid (Manuel Ayarlarla) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 bg-black/30 p-4 sm:p-6 rounded-2xl border border-white/5">
                        {TEAMS_CONFIG.slice(0, teamCount).map((t, idx) => (
                            <div key={t.id} className={cn("text-center p-3 rounded-xl border transition-all relative group", activeTeamIndex === idx ? "bg-white/10 border-white/30 ring-1 ring-white/40" : "border-white/5 opacity-70")}>
                                <p className={cn("text-xs sm:text-sm font-black mb-1", t.color)}>{t.name}</p>
                                <p className="text-3xl sm:text-4xl font-black">{scores[idx]}</p>
                                
                                {/* Manuel Puan Ayarı */}
                                <div className="flex justify-center gap-1 mt-2">
                                    <button 
                                        onClick={() => adjustScore(idx, -1)} 
                                        className="w-6 h-6 rounded bg-white/10 hover:bg-rose-600 hover:text-white flex items-center justify-center text-xs text-slate-400 font-bold"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <button 
                                        onClick={() => adjustScore(idx, 1)} 
                                        className="w-6 h-6 rounded bg-white/10 hover:bg-emerald-600 hover:text-white flex items-center justify-center text-xs text-slate-400 font-bold"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button 
                            onClick={nextTurn} 
                            size="lg" 
                            className="w-full h-16 sm:h-20 text-xl sm:text-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            SIRADAKİ TAKIM GELSİN <ArrowRight className="ml-3 w-6 h-6 sm:w-8 sm:h-8" />
                        </Button>
                        <Button onClick={forceFinishGame} variant="ghost" className="text-slate-500 hover:text-slate-300 text-sm">
                            <Power className="mr-1.5 w-4 h-4" /> Oyunu Şimdi Bitir
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // 5. OYUN BİTİŞİ
    if (gameState === 'finished') {
        const maxScore = Math.max(...scores.slice(0, teamCount));
        const winners = TEAMS_CONFIG.slice(0, teamCount).filter((_, idx) => scores[idx] === maxScore);
        
        let winnerText = "BERABERE!";
        let winnerColor = "text-slate-200";
        
        if (winners.length === 1) {
            winnerText = `${winners[0].name} TAKIM KAZANDI!`;
            winnerColor = winners[0].color;
        } else {
            winnerText = "DOSTLUK KAZANDI!";
            winnerColor = "text-yellow-400";
        }

        return (
            <div ref={containerRef} className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden select-none">
                <Card className="w-full max-w-3xl bg-slate-900 border border-white/10 shadow-2xl z-10 text-center rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 via-purple-500 to-indigo-500" />
                    
                    <CardHeader className="pt-8 pb-3">
                        <div className="p-4 bg-yellow-500/20 rounded-full w-24 h-24 mx-auto mb-3 flex items-center justify-center ring-4 ring-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.4)] animate-bounce">
                            <Trophy className="w-14 h-14 text-yellow-400" />
                        </div>
                        <CardTitle className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight">OYUN BİTTİ</CardTitle>
                        <CardDescription className={cn("text-2xl sm:text-3xl font-black mt-2", winnerColor)}>{winnerText}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex flex-wrap justify-center gap-4 py-6">
                        {TEAMS_CONFIG.slice(0, teamCount).map((t, idx) => (
                             <div key={t.id} className={cn(
                                 "p-5 rounded-2xl border w-36 sm:w-44 backdrop-blur-sm flex flex-col items-center transition-all", 
                                 t.bg, "border-white/10",
                                 scores[idx] === maxScore && maxScore > 0 && "ring-2 ring-yellow-400 scale-105 shadow-lg shadow-yellow-500/20"
                             )}>
                                 <div className={cn("font-black text-base sm:text-lg mb-1", t.color)}>{t.name} TAKIM</div>
                                 <div className="text-4xl sm:text-5xl font-black text-white">{scores[idx]}</div>
                                 {scores[idx] === maxScore && maxScore > 0 && (
                                     <span className="text-[10px] text-yellow-400 font-bold mt-1 flex items-center gap-1">
                                         <Sparkles className="w-3 h-3" /> ŞAMPİYON
                                     </span>
                                 )}
                             </div>
                        ))}
                    </CardContent>
                    
                    <CardFooter className="flex justify-center gap-4 pb-8">
                        <Button onClick={resetGame} size="lg" className="h-14 px-8 text-lg font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg hover:shadow-purple-500/30">
                            <Repeat className="mr-2 h-5 w-5" /> Yeniden Oyna
                        </Button>
                        <Link href={backUrl}>
                            <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-bold border-white/10 text-slate-300 hover:bg-white/10 rounded-xl">
                                <Home className="mr-2 h-5 w-5" /> Ana Menü
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    return null;
}

export default function MultiTeamPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="w-16 h-16 animate-spin text-purple-500" /></div>}>
            <MultiTeamTabooComponent />
        </Suspense>
    )
}
