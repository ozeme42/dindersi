'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Repeat, Home, CheckCircle2, XCircle, User, ArrowRight, Trophy, Timer, Play, Pause, SkipForward } from "lucide-react";
import Link from "next/link";
import { getAnlatBakalimWords } from '../actions';
import type { AnlatBakalimWord } from '../actions';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { playSound, stopSound } from "@/lib/audio-service";
import Confetti from 'react-dom-confetti';

function AnlatBakalimGameComponent() {
    // --- STATE YÖNETİMİ ---
    const [words, setWords] = useState<string[]>([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [gameState, setGameState] = useState<'loading' | 'error' | 'ready' | 'playing' | 'round_summary' | 'finished'>('loading');
    const [activeTeam, setActiveTeam] = useState<'A' | 'B'>('A'); // A: Mavi, B: Kırmızı
    
    const [scores, setScores] = useState({ A: 0, B: 0 });
    const [roundScore, setRoundScore] = useState(0); // O anki turun skoru
    const [timeLeft, setTimeLeft] = useState(60); // Tur süresi (saniye)
    const [error, setError] = useState<string|null>(null);
    
    const [showConfetti, setShowConfetti] = useState(false);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Oyunu Başlatma / Kelimeleri Karıştırma
    useEffect(() => {
        const fetchWords = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getAnlatBakalimWords(params);
            if (result.error || result.words.length === 0) {
                setError(result.error || "Bu konu için uygun kelime bulunamadı.");
                setGameState('error');
            } else {
                setWords([...result.words].sort(() => Math.random() - 0.5));
                setGameState('ready');
            }
            setIsLoading(false);
        };
        fetchWords();
    }, [searchParams]);

    // --- ZAMANLAYICI MANTIĞI ---
    useEffect(() => {
        if (gameState === 'playing') {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        endRound();
                        return 0;
                    }
                    if (prev <= 10) playSound('timer'); // Son 10 saniye sesi
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

    // Turu Bitir
    const endRound = () => {
        playSound('timeUp');
        setGameState('round_summary');
        // Skoru ana skora işle
        setScores(prev => ({
            ...prev,
            [activeTeam]: prev[activeTeam] + roundScore
        }));
    };

    // Yeni Tura Hazırlık
    const startNextRound = () => {
        // Takım değiştir
        const nextTeam = activeTeam === 'A' ? 'B' : 'A';
        setActiveTeam(nextTeam);
        
        // State sıfırla
        setRoundScore(0);
        setTimeLeft(60);
        
        // Kelimeleri yeniden karıştır (veya kaldığı yerden devam ettir)
        setWords(prev => [...prev].sort(() => Math.random() - 0.5));
        setCurrentWordIndex(0);
        
        setGameState('ready');
    };

    // Oyunu Başlat (Geri Sayım Sonrası)
    const startGame = () => {
        playSound('correct');
        setGameState('playing');
    };

    // --- OYUN İÇİ AKSİYONLAR ---

    const handleCorrect = () => {
        playSound('correct');
        setRoundScore(prev => prev + 1);
        nextWord();
    };

    const handlePass = () => {
        playSound('incorrect');
        nextWord();
    };

    const nextWord = () => {
        if (currentWordIndex >= words.length - 1) {
            setWords(prev => [...prev].sort(() => Math.random() - 0.5));
            setCurrentWordIndex(0);
        } else {
            setCurrentWordIndex(prev => prev + 1);
        }
    };

    const resetGame = () => {
        setScores({ A: 0, B: 0 });
        setRoundScore(0);
        setActiveTeam('A');
        setGameState('ready');
        setTimeLeft(60);
    };

    if (isLoading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-orange-500" /></div>;
    }

    if (error) {
         return (
            <div className="h-screen w-screen flex items-center justify-center p-4 bg-slate-900 text-center">
                <div className="bg-red-900/50 p-8 rounded-2xl border border-red-500/50">
                    <h2 className="text-2xl text-red-400 font-bold mb-4">Oyun Başlatılamadı</h2>
                    <p className="text-red-200">{error}</p>
                    <Link href="/teacher/smartboard/anlat-bakalim">
                        <Button className="mt-6" variant="outline">Kuruluma Geri Dön</Button>
                    </Link>
                </div>
            </div>
        );
    }
    
    // 2. READY EKRANI (Takım Hazırlığı)
    if (gameState === 'ready') {
        const isBlue = activeTeam === 'A';
        return (
            <div className={cn(
                "h-screen w-screen flex flex-col items-center justify-center p-4 transition-colors duration-500",
                isBlue ? "bg-blue-950" : "bg-red-950"
            )}>
                <div className="text-center space-y-8 animate-in zoom-in duration-300">
                    <h2 className="text-3xl text-white/80 font-light uppercase tracking-widest">SIRADAKİ TAKIM</h2>
                    <h1 className={cn("text-7xl font-black", isBlue ? "text-blue-400" : "text-red-400")}>
                        {isBlue ? "MAVİ TAKIM" : "KIRMIZI TAKIM"}
                    </h1>
                    <div className="text-white text-xl max-w-lg mx-auto leading-relaxed opacity-80">
                        Tahtaya bir kişi çıksın ve sınıfa arkasını dönsün. Sınıf kelimeyi görecek ve anlatacak.
                    </div>
                    <Button onClick={startGame} className="h-24 px-16 text-3xl font-bold rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)] bg-white text-slate-900 hover:bg-slate-200 hover:scale-105 transition-all">
                        SÜREYİ BAŞLAT <Play className="ml-4 w-10 h-10 fill-slate-900" />
                    </Button>
                </div>
                
                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-12 text-white/50 text-2xl font-bold">
                    <span>Mavi: {scores.A}</span>
                    <span>Kırmızı: {scores.B}</span>
                </div>
            </div>
        );
    }

    // 3. OYUN EKRANI (Aktif)
    if (gameState === 'playing') {
        const isBlue = activeTeam === 'A';
        return (
            <div className="h-screen w-screen bg-slate-900 text-white flex flex-col overflow-hidden relative">
                <div className="h-24 bg-slate-800 flex items-center justify-between px-8 border-b border-white/10">
                    <div className={cn("flex items-center gap-3 text-2xl font-bold", isBlue ? "text-blue-400" : "text-red-400")}>
                        <User className="w-8 h-8" />
                        {isBlue ? "MAVİ TAKIM" : "KIRMIZI TAKIM"}
                    </div>
                    
                    <div className={cn(
                        "flex items-center gap-4 bg-slate-950 px-6 py-2 rounded-xl border-2 transition-all",
                        timeLeft <= 10 ? "border-red-500 animate-pulse text-red-500" : "border-slate-700 text-white"
                    )}>
                        <Timer className="w-8 h-8" />
                        <span className="text-4xl font-black font-mono w-20 text-center">{timeLeft}</span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-sm text-slate-400 uppercase">Şu Anki Puan</span>
                        <span className="text-4xl font-black text-yellow-400">{roundScore}</span>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50 pointer-events-none" />
                    
                    <div className="w-full max-w-4xl aspect-video bg-white text-slate-900 rounded-[3rem] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300" key={currentWordIndex}>
                        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
                        
                        <p className="text-xl text-slate-400 mb-4 font-semibold tracking-widest uppercase">ANLATILACAK KELİME</p>
                        <h1 className="text-[6rem] sm:text-[8rem] font-black leading-none text-center px-4 drop-shadow-sm select-none">
                            {words[currentWordIndex]}
                        </h1>
                    </div>
                </div>

                <div className="h-32 bg-slate-800 border-t border-white/10 flex items-center justify-center gap-6 px-4 pb-4">
                    <Button 
                        onClick={handlePass} 
                        className="h-20 flex-1 max-w-sm bg-slate-600 hover:bg-slate-500 text-2xl font-bold rounded-2xl border-b-4 border-slate-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        <SkipForward className="mr-3 w-8 h-8" /> PAS GEÇ
                    </Button>
                    
                    <Button 
                        onClick={handleCorrect} 
                        className="h-20 flex-1 max-w-md bg-green-500 hover:bg-green-400 text-slate-900 text-3xl font-black rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all"
                    >
                        <CheckCircle2 className="mr-3 w-10 h-10" /> DOĞRU
                    </Button>
                </div>
            </div>
        );
    }

    // 4. TUR SONUCU VE ARA EKRAN
    if (gameState === 'round_summary') {
        const isBlue = activeTeam === 'A';
        return (
            <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-lg bg-slate-800 border-white/10 text-white text-center p-8 shadow-2xl animate-in zoom-in-95">
                    <div className="mb-6 flex justify-center">
                        <div className={cn("p-4 rounded-full bg-opacity-20", isBlue ? "bg-blue-500 text-blue-400" : "bg-red-500 text-red-400")}>
                            <Timer className="w-16 h-16" />
                        </div>
                    </div>
                    <h2 className="text-4xl font-bold mb-2">SÜRE BİTTİ!</h2>
                    <p className="text-xl text-slate-400 mb-8">{isBlue ? "Mavi" : "Kırmızı"} Takım bu turu tamamladı.</p>

                    <div className="bg-slate-900/50 rounded-2xl p-8 mb-8 border border-white/5">
                        <span className="block text-sm text-slate-500 uppercase font-bold mb-2">BU TUR KAZANILAN PUAN</span>
                        <span className="text-8xl font-black text-yellow-400">{roundScore}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center mb-8 bg-black/20 p-4 rounded-xl">
                        <div>
                            <p className="text-blue-400 text-sm font-bold">TOPLAM MAVİ</p>
                            <p className="text-3xl font-bold">{scores.A}</p>
                        </div>
                        <div>
                            <p className="text-red-400 text-sm font-bold">TOPLAM KIRMIZI</p>
                            <p className="text-3xl font-bold">{scores.B}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button onClick={startNextRound} size="lg" className="w-full h-16 text-xl bg-white text-slate-900 hover:bg-slate-200 font-bold">
                            SIRADAKİ TAKIMA GEÇ <ArrowRight className="ml-2" />
                        </Button>
                        <Button onClick={() => setGameState('finished')} variant="ghost" className="text-slate-400 hover:text-white">
                            Oyunu Bitir
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // 5. OYUN BİTİŞİ (Final Skor)
    if (gameState === 'finished') {
        let winnerText = "BERABERE!";
        let winnerColor = "text-yellow-400";
        if (scores.A > scores.B) {
            winnerText = "MAVİ TAKIM KAZANDI!";
            winnerColor = "text-blue-400";
        } else if (scores.B > scores.A) {
            winnerText = "KIRMIZI TAKIM KAZANDI!";
            winnerColor = "text-red-400";
        }

        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                   <Confetti active={true} config={{ elementCount: 200, spread: 360 }} />
                </div>
                
                <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl z-10 text-center">
                    <CardHeader className="pt-10 pb-4">
                        <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-bounce" />
                        <CardTitle className="text-5xl font-black text-white uppercase tracking-tighter">OYUN BİTTİ</CardTitle>
                        <CardDescription className={cn("text-3xl font-bold mt-4", winnerColor)}>{winnerText}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex justify-center items-center gap-8 py-10">
                        <div className="bg-blue-900/30 p-8 rounded-3xl border border-blue-500/30 w-48 backdrop-blur-sm">
                             <div className="text-blue-400 font-bold mb-2">MAVİ</div>
                             <div className="text-6xl font-black text-white">{scores.A}</div>
                        </div>
                        <div className="text-slate-600 font-black text-4xl">-</div>
                        <div className="bg-red-900/30 p-8 rounded-3xl border border-red-500/30 w-48 backdrop-blur-sm">
                             <div className="text-red-400 font-bold mb-2">KIRMIZI</div>
                             <div className="text-6xl font-black text-white">{scores.B}</div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-center gap-4 pb-10">
                        <Button onClick={resetGame} size="lg" className="h-16 px-10 text-xl bg-indigo-600 hover:bg-indigo-500">
                            <Repeat className="mr-2" /> Yeniden Oyna
                        </Button>
                        <Button asChild variant="outline" size="lg" className="h-16 px-10 text-xl border-slate-700 text-slate-300">
                            <Link href="/teacher/smartboard"><Home className="mr-2" /> Ana Menü</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return null;
}

export default function AnlatBakalimPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-orange-500" /></div>}>
            <AnlatBakalimGameComponent />
        </Suspense>
    )
}
