'use client';

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Repeat, Home, CheckCircle2, XCircle, User, ArrowRight, Trophy, Timer, Play, SkipForward, ThumbsUp, Power, Users } from "lucide-react";
import Link from "next/link";
import { getAnlatBakalimWords } from '../actions';
import { cn } from "@/lib/utils";
import { playSound, stopSound } from "@/lib/audio-service";
import Confetti from 'react-dom-confetti';

// --- TAKIM AYARLARI ---
const TEAMS_CONFIG = [
    { id: 0, name: "MAVİ", color: "text-blue-400", bg: "bg-blue-900", border: "border-blue-500", iconBg: "bg-blue-500" },
    { id: 1, name: "KIRMIZI", color: "text-red-400", bg: "bg-red-900", border: "border-red-500", iconBg: "bg-red-500" },
    { id: 2, name: "YEŞİL", color: "text-green-400", bg: "bg-green-900", border: "border-green-500", iconBg: "bg-green-500" },
    { id: 3, name: "SARI", color: "text-yellow-400", bg: "bg-yellow-900", border: "border-yellow-500", iconBg: "bg-yellow-500" },
];

function MultiTeamTabooComponent() {
    const searchParams = useSearchParams();
    
    // --- STATE ---
    const [words, setWords] = useState<string[]>([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    
    // Oyun Aşamaları
    const [gameState, setGameState] = useState<'loading' | 'error' | 'team_select' | 'ready' | 'playing' | 'turn_result' | 'finished'>('loading');
    
    // Takım Yönetimi
    const [teamCount, setTeamCount] = useState<number>(2); // Varsayılan 2
    const [activeTeamIndex, setActiveTeamIndex] = useState<number>(0);
    const [scores, setScores] = useState<number[]>([0, 0, 0, 0]); // 4 takıma kadar skor tutucu
    
    // Süre
    const TURN_DURATION = 30;
    const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
    const [lastTurnResult, setLastTurnResult] = useState<'correct' | 'pass' | 'timeout' | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string|null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Veri Çekme
    useEffect(() => {
        const fetchWords = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getAnlatBakalimWords(params);
            
            if (result.error || !result.words || result.words.length === 0) {
                setError(result.error || "Bu konu için uygun kelime bulunamadı.");
                setGameState('error');
            } else {
                // Kelimeleri 3 kez çoğalt
                const baseWords = result.words;
                const tripledWords = [...baseWords, ...baseWords, ...baseWords];
                setWords(tripledWords.sort(() => Math.random() - 0.5));
                setGameState('team_select'); // Önce takım seçimine git
            }
            setIsLoading(false);
        };
        fetchWords();
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
                    if (prev <= 10) playSound('timer');
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            stopSound('timer');
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            stopSound('timer');
        };
    }, [gameState]);

    // --- OYUN MANTIĞI ---

    const handleTeamSelect = (count: number) => {
        setTeamCount(count);
        // Skorları sıfırla
        setScores(new Array(4).fill(0));
        setGameState('ready');
    };

    const handleTurnEnd = (result: 'correct' | 'pass' | 'timeout') => {
        stopSound('timer');
        
        if (result === 'correct') {
            playSound('correct');
            // Aktif takımın skorunu artır
            setScores(prev => {
                const newScores = [...prev];
                newScores[activeTeamIndex] += 1;
                return newScores;
            });
        } else if (result === 'pass') {
            playSound('incorrect');
        } else {
            playSound('timeUp');
        }

        setLastTurnResult(result);
        setGameState('turn_result');
    };

    const nextTurn = () => {
        // Kelimeler bitti mi?
        if (currentWordIndex >= words.length - 1) {
            setGameState('finished');
            return;
        }

        // Sıradaki takıma geç (Döngüsel)
        setActiveTeamIndex(prev => (prev + 1) % teamCount);
        
        // Sonraki kelime
        setCurrentWordIndex(prev => prev + 1);

        // Süreyi sıfırla
        setTimeLeft(TURN_DURATION);
        setGameState('ready');
    };

    const startGame = () => setGameState('playing');
    
    const forceFinishGame = () => {
        stopSound('timer');
        setGameState('finished');
    };

    const resetGame = () => {
        setScores([0, 0, 0, 0]);
        setActiveTeamIndex(0);
        setWords(prev => [...prev].sort(() => Math.random() - 0.5));
        setCurrentWordIndex(0);
        setTimeLeft(TURN_DURATION);
        setGameState('team_select'); // En başa dön
    };

    // --- RENDER YARDIMCILARI ---
    const currentTeam = TEAMS_CONFIG[activeTeamIndex];

    if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-orange-500" /></div>;

    if (gameState === 'error') return (
        <div className="h-screen w-screen flex items-center justify-center p-4 bg-slate-900 text-white text-center">
            <div className="bg-red-900/50 p-8 rounded-2xl border border-red-500/50">
                <h2 className="text-2xl font-bold mb-4">Hata</h2>
                <p>{error}</p>
                <Link href="/teacher/smartboard"><Button className="mt-4" variant="outline">Çıkış</Button></Link>
            </div>
        </div>
    );

    // 1. TAKIM SEÇİM EKRANI
    if (gameState === 'team_select') {
        return (
            <div className="h-screen w-screen bg-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-3xl bg-slate-800 border-slate-700 text-white shadow-2xl">
                    <CardHeader className="text-center pb-8">
                        <Users className="w-20 h-20 text-indigo-400 mx-auto mb-4" />
                        <CardTitle className="text-5xl font-black tracking-tight">RALLİ MODU</CardTitle>
                        <CardDescription className="text-slate-400 text-xl mt-4">
                            Tüm kavramlar 3 kez sorulacak.<br/>
                            Kaç takım yarışmak istiyor?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center gap-6 py-8">
                        {[2, 3, 4].map((num) => (
                            <Button
                                key={num}
                                onClick={() => handleTeamSelect(num)}
                                className="h-32 w-32 flex flex-col items-center justify-center gap-2 text-2xl font-black rounded-3xl bg-slate-700 hover:bg-indigo-600 hover:scale-105 transition-all border-2 border-slate-600"
                            >
                                <Users className="w-8 h-8" />
                                {num} TAKIM
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
            <div className={cn(
                "h-screen w-screen flex flex-col items-center justify-center p-4 transition-colors duration-500",
                currentTeam.bg
            )}>
                <div className="text-center space-y-8 animate-in zoom-in duration-300">
                    <h2 className="text-3xl text-white/80 font-light uppercase tracking-widest">SIRA SENDE</h2>
                    <h1 className={cn("text-7xl font-black text-white")}>
                        {currentTeam.name} TAKIM
                    </h1>
                    <div className="text-white/70 text-xl font-medium">Hazır olduğunuzda başlatın</div>
                    
                    <Button onClick={startGame} className="h-24 px-16 text-3xl font-bold rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)] bg-white text-slate-900 hover:bg-slate-200 hover:scale-105 transition-all">
                        KELİMEYİ GÖSTER <Play className="ml-4 w-10 h-10 fill-slate-900" />
                    </Button>
                </div>
                
                {/* Alt Skor Çubuğu */}
                <div className="absolute bottom-10 flex gap-8">
                    {TEAMS_CONFIG.slice(0, teamCount).map((t, idx) => (
                        <div key={t.id} className={cn("flex flex-col items-center px-4 py-2 rounded-xl bg-black/20", activeTeamIndex === idx ? "ring-2 ring-white scale-110" : "opacity-60")}>
                            <span className={cn("font-bold text-sm", t.color)}>{t.name}</span>
                            <span className="text-white text-2xl font-bold">{scores[idx]}</span>
                        </div>
                    ))}
                </div>

                <Button onClick={forceFinishGame} variant="ghost" className="absolute top-6 right-6 text-white/50 hover:text-white hover:bg-white/10">
                    <Power className="mr-2 w-5 h-5" /> Oyunu Bitir
                </Button>
            </div>
        );
    }

    // 3. OYUN EKRANI
    if (gameState === 'playing') {
        return (
            <div className={cn("h-screen w-screen text-white flex flex-col overflow-hidden relative", currentTeam.bg)}>
                
                {/* Üst Bar */}
                <div className="h-24 bg-black/20 flex items-center justify-between px-8 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-2xl font-bold text-white/90">
                        <User className="w-8 h-8" />
                        {currentTeam.name} TAKIM ANLATIYOR
                    </div>
                    
                    <div className={cn(
                        "flex items-center gap-4 bg-slate-950/80 px-6 py-2 rounded-xl border-2 transition-all",
                        timeLeft <= 5 ? "border-red-500 animate-pulse text-red-500" : "border-white/20 text-white"
                    )}>
                        <Timer className="w-8 h-8" />
                        <span className="text-4xl font-black font-mono w-20 text-center">{timeLeft}</span>
                    </div>

                    <Button onClick={forceFinishGame} variant="destructive" size="sm" className="ml-4 font-bold bg-red-600 hover:bg-red-500">
                        <Power className="mr-2 w-4 h-4" /> BİTİR
                    </Button>
                </div>

                {/* Kelime Alanı */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-4xl aspect-video bg-white text-slate-900 rounded-[3rem] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
                        <p className="text-xl text-slate-400 mb-4 font-semibold tracking-widest uppercase">KELİME</p>
                        <h1 className="text-[5rem] sm:text-[7rem] font-black leading-none text-center px-4 select-none break-words max-w-full">
                            {words[currentWordIndex]}
                        </h1>
                        <p className="absolute bottom-6 text-slate-300 text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">
                            {currentWordIndex + 1} / {words.length}
                        </p>
                    </div>
                </div>

                {/* Butonlar */}
                <div className="h-32 bg-black/30 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-6 px-4 pb-4 pt-4">
                    <Button onClick={() => handleTurnEnd('pass')} className="h-20 flex-1 max-w-sm bg-slate-600 hover:bg-slate-500 text-2xl font-bold rounded-2xl border-b-4 border-slate-800 active:border-b-0 active:translate-y-1 transition-all">
                        <SkipForward className="mr-3 w-8 h-8" /> PAS / BİLEMEDİ
                    </Button>
                    <Button onClick={() => handleTurnEnd('correct')} className="h-20 flex-1 max-w-md bg-green-500 hover:bg-green-400 text-slate-900 text-3xl font-black rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 shadow-lg transition-all">
                        <CheckCircle2 className="mr-3 w-10 h-10" /> BİLDİ (DOĞRU)
                    </Button>
                </div>
            </div>
        );
    }

    // 4. ARA EKRAN
    if (gameState === 'turn_result') {
        let ResultIcon = ThumbsUp;
        let resultText = "DOĞRU!";
        let resultColor = "text-green-400";
        
        if (lastTurnResult === 'pass') {
            ResultIcon = SkipForward;
            resultText = "PAS GEÇİLDİ";
            resultColor = "text-yellow-400";
        } else if (lastTurnResult === 'timeout') {
            ResultIcon = XCircle;
            resultText = "SÜRE BİTTİ";
            resultColor = "text-red-400";
        }

        return (
            <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-3xl bg-slate-800 border-white/10 text-white text-center p-8 shadow-2xl animate-in zoom-in-95">
                    
                    <div className="mb-6">
                        <ResultIcon className={cn("w-20 h-20 mx-auto mb-4", resultColor)} />
                        <h2 className={cn("text-4xl font-black uppercase", resultColor)}>{resultText}</h2>
                        <p className="text-slate-400 mt-2 text-xl">
                            <span className={cn("font-bold", currentTeam.color)}>{currentTeam.name}</span> takımın sırası bitti.
                        </p>
                    </div>

                    {/* Skor Tablosu - Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 bg-black/20 p-6 rounded-2xl">
                        {TEAMS_CONFIG.slice(0, teamCount).map((t, idx) => (
                            <div key={t.id} className={cn("text-center p-3 rounded-xl", activeTeamIndex === idx ? "bg-white/10 ring-1 ring-white/50" : "opacity-60")}>
                                <p className={cn("text-sm font-bold mb-1", t.color)}>{t.name}</p>
                                <p className="text-3xl font-bold">{scores[idx]}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-4">
                        <Button onClick={nextTurn} size="lg" className="w-full h-20 text-2xl bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl shadow-lg hover:scale-105 transition-all">
                            SIRADAKİ TAKIM GELSİN <ArrowRight className="ml-3 w-8 h-8" />
                        </Button>
                        <Button onClick={forceFinishGame} variant="ghost" className="text-slate-500 hover:text-white mt-2">
                            <Power className="mr-2 w-4 h-4" /> Oyunu Şimdi Bitir
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // 5. OYUN BİTİŞİ
    if (gameState === 'finished') {
        // Kazananı bul
        const maxScore = Math.max(...scores);
        const winners = TEAMS_CONFIG.slice(0, teamCount).filter((_, idx) => scores[idx] === maxScore);
        
        let winnerText = "BERABERE!";
        let winnerColor = "text-slate-200";
        
        if (winners.length === 1) {
            winnerText = `${winners[0].name} KAZANDI!`;
            winnerColor = winners[0].color;
        } else {
            winnerText = "DOSTLUK KAZANDI!";
            winnerColor = "text-yellow-400";
        }

        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                   <Confetti active={true} config={{ elementCount: 200, spread: 360 }} />
                </div>
                
                <Card className="w-full max-w-4xl bg-slate-900 border-slate-800 shadow-2xl z-10 text-center">
                    <CardHeader className="pt-10 pb-4">
                        <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-bounce" />
                        <CardTitle className="text-5xl font-black text-white uppercase tracking-tighter">OYUN BİTTİ</CardTitle>
                        <CardDescription className={cn("text-3xl font-bold mt-4", winnerColor)}>{winnerText}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex flex-wrap justify-center gap-6 py-10">
                        {TEAMS_CONFIG.slice(0, teamCount).map((t, idx) => (
                             <div key={t.id} className={cn("p-6 rounded-3xl border w-40 backdrop-blur-sm flex flex-col items-center", t.bg, "bg-opacity-30 border-opacity-30", t.border)}>
                                 <div className={cn("font-bold mb-2", t.color)}>{t.name}</div>
                                 <div className="text-5xl font-black text-white">{scores[idx]}</div>
                             </div>
                        ))}
                    </CardContent>
                    
                    <CardFooter className="flex justify-center gap-4 pb-10">
                        <Button onClick={resetGame} size="lg" className="h-16 px-10 text-xl bg-indigo-600 hover:bg-indigo-500">
                            <Repeat className="mr-2" /> Yeniden Oyna
                        </Button>
                        <Link href="/teacher/smartboard">
                            <Button variant="outline" size="lg" className="h-16 px-10 text-xl border-slate-700 text-slate-300 hover:bg-slate-800">
                                <Home className="mr-2" /> Ana Menü
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
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-orange-500" /></div>}>
            <MultiTeamTabooComponent />
        </Suspense>
    )
}