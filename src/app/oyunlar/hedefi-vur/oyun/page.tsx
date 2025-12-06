'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getHitTheTargetAction, submitHitTheTargetScoreAction, type HitTheTargetRound } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MousePointerClick, Trophy, Home, Repeat, Save, Timer, Target, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound, stopSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';

// --- TİPLER ---
type TargetInfo = {
    id: number;
    text: string;
    isCorrect: boolean;
    x: number;
    y: number;
    isHit: boolean;
    vx: number; // Yatay hız
    vy: number; // Dikey hız
    colorClass: string;
};

const TARGET_COLORS = [
    "bg-sky-500 border-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.5)]",
    "bg-cyan-500 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]",
    "bg-blue-500 border-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
    "bg-indigo-500 border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.5)]",
];

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-sky-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        {/* Izgara Efekti (Retro Grid) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
);

const GameHUD = ({ score, time, round, totalRounds }: { score: number, time: number, round: number, totalRounds: number }) => {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none">
            <div className="max-w-6xl mx-auto flex justify-between items-start pointer-events-auto">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-sky-500/30 px-4 py-2 rounded-full shadow-lg shadow-sky-500/10">
                        <Trophy className="w-5 h-5 text-sky-400" />
                        <span className="text-xl font-black text-sky-100 font-mono">{score}</span>
                    </div>
                    <div className={cn(
                        "flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border px-4 py-2 rounded-full transition-all duration-300",
                        time <= 5 ? "border-red-500/50 shadow-red-500/20 animate-pulse" : "border-slate-700"
                    )}>
                        <Timer className={cn("w-5 h-5", time <= 5 ? "text-red-400" : "text-slate-400")} />
                        <span className={cn("text-xl font-black font-mono", time <= 5 ? "text-red-400" : "text-white")}>{time}s</span>
                    </div>
                </div>
                
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-full">
                    <span className="text-sm text-slate-400 font-bold uppercase tracking-wider mr-2">Tur</span>
                    <span className="text-xl font-black text-white font-mono">{round}/{totalRounds}</span>
                </div>
            </div>
        </div>
    );
};

// --- ANA OYUN ---

function HitTheTargetGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>();
    
    // State
    const [rounds, setRounds] = useState<HitTheTargetRound[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
    const [targets, setTargets] = useState<TargetInfo[]>([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'round_end' | 'finished'>('loading');
    const [isPaused, setIsPaused] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [clickEffect, setClickEffect] = useState<{x: number, y: number, id: number} | null>(null);

    const gameContext = `Hedefi Vur - ${searchParams.get('topicName')}`;

    // Hedefleri Oluştur
    const generateTargets = useCallback((round: HitTheTargetRound) => {
        if (!round || !gameAreaRef.current) return;
        
        const area = gameAreaRef.current.getBoundingClientRect();
        // Alanın %10 - %90 arasına yerleştir (kenarlara yapışmasın)
        const safeWidth = area.width * 0.8;
        const safeHeight = area.height * 0.8;
        const offsetX = area.width * 0.1;
        const offsetY = area.height * 0.1;

        const newTargets = round.words.map((word, i) => ({
            id: i,
            text: word,
            isCorrect: word === round.target,
            x: Math.random() * safeWidth + offsetX,
            y: Math.random() * safeHeight + offsetY,
            vx: (Math.random() - 0.5) * 1.5, // Yavaş yatay hareket
            vy: (Math.random() - 0.5) * 1.5, // Yavaş dikey hareket
            isHit: false,
            colorClass: TARGET_COLORS[i % TARGET_COLORS.length]
        }));
        setTargets(newTargets);
    }, []);

    // Veri Çekme
    useEffect(() => {
        const fetchGameData = async () => {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getHitTheTargetAction(params);
            
            if (result.error || !result.data || result.data.length === 0) {
                setError(result.error || "Bu konu için uygun oyun verisi bulunamadı.");
            } else {
                setRounds(result.data);
                setGameState('playing');
                // İlk turu başlatmak için useEffect dışında tetikleme yapacağız
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams]);

    // Oyun Döngüsü (Hareket ve Zamanlayıcı)
    const handleRoundEnd = useCallback((success: boolean) => {
        setIsPaused(true);
        setGameState('round_end'); // Ara durum (Animasyon veya mesaj için)

        setTimeout(() => {
            if (currentRoundIndex < rounds.length - 1) {
                // Sonraki Tur
                const nextIndex = currentRoundIndex + 1;
                setCurrentRoundIndex(nextIndex);
                generateTargets(rounds[nextIndex]);
                setTimeLeft(30);
                setGameState('playing');
                setIsPaused(false);
            } else {
                // Oyun Bitti
                setGameState('finished');
                playSound('win');
            }
        }, 1500);
    }, [currentRoundIndex, rounds, generateTargets]);
    
    useEffect(() => {
        if (gameState !== 'playing' || isPaused) return;

        // Zamanlayıcı
        const timerInterval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleRoundEnd(false);
                    return 0;
                }
                if (prev <= 6) playSound('timer'); // Son 5 saniye uyarısı
                return prev - 1;
            });
        }, 1000);

        // Hedef Hareketi (Animation Frame)
        const animate = () => {
            setTargets(prev => prev.map(t => {
                if (t.isHit) return t;

                let newX = t.x + t.vx;
                let newY = t.y + t.vy;
                let newVx = t.vx;
                let newVy = t.vy;

                // Kenarlardan sekme
                const bounds = { w: 800, h: 500 }; 
                if (gameAreaRef.current) {
                    bounds.w = gameAreaRef.current.clientWidth;
                    bounds.h = gameAreaRef.current.clientHeight;
                }

                if (newX < 40 || newX > bounds.w - 40) newVx *= -1;
                if (newY < 40 || newY > bounds.h - 40) newVy *= -1;

                return { ...t, x: newX, y: newY, vx: newVx, vy: newVy };
            }));
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);

        return () => {
            clearInterval(timerInterval);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            stopSound('timer');
        };
    }, [gameState, isPaused, handleRoundEnd]);

    // İlk Tur Başlatma (Refs yüklendikten sonra)
    useEffect(() => {
        if (gameState === 'playing' && rounds.length > 0 && targets.length === 0 && gameAreaRef.current) {
            generateTargets(rounds[0]);
            setIsPaused(false);
        }
    }, [gameState, rounds, targets.length, generateTargets]);

    // Hedef Vurma
    const handleHit = (target: TargetInfo, e: React.MouseEvent | React.TouchEvent) => {
        if (target.isHit || isPaused) return;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const rect = gameAreaRef.current?.getBoundingClientRect();
        if (rect) {
            setClickEffect({ 
                x: clientX - rect.left, 
                y: clientY - rect.top, 
                id: Date.now() 
            });
            setTimeout(() => setClickEffect(null), 500);
        }

        setTargets(prev => prev.map(t => t.id === target.id ? { ...t, isHit: true } : t));

        if (target.isCorrect) {
            playSound('correct'); 
            setScore(prev => prev + 20 + Math.ceil(timeLeft / 2)); 
            handleRoundEnd(true);
        } else {
            playSound('incorrect'); 
            setScore(prev => Math.max(0, prev - 10)); 
        }
    };

    // Kaydet ve Çık
    const handleSaveAndExit = async () => {
        if (!user || score <= 0 || isSaving) {
            router.push('/oyunlar/hedefi-vur');
            return;
        }
        setIsSaving(true);
        const result = await submitHitTheTargetScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Skorun başarıyla kaydedildi.' });
            router.push('/oyunlar/hedefi-vur');
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
            setIsSaving(false);
        }
    };

    // --- RENDER ---

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-sky-500" />
            </div>
        );
    }

    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-sky-950/50 p-6 rounded-3xl border border-sky-500/30">
                    <Target className="h-16 w-16 text-sky-500 mx-auto" />
                    <h3 className="text-xl font-bold text-sky-100">Oyun Başlatılamadı</h3>
                    <p className="text-sky-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/oyunlar/hedefi-vur">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Bitiş Ekranı
    if (gameState === 'finished') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <GameBackground />
                <div className="relative z-10 w-full max-w-md text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-sky-500/20 rounded-full blur-2xl animate-pulse" />
                        <Trophy className="w-32 h-32 text-sky-400 mx-auto drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">GÖREV TAMAMLANDI!</h1>
                        <p className="text-slate-400 text-lg">Toplam Skorun</p>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                        <div className="text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-600">
                            {score}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Button 
                            onClick={handleSaveAndExit} 
                            size="lg" 
                            disabled={isSaving}
                            className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-xl shadow-sky-500/20 transition-all hover:scale-105"
                        >
                            {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-3 h-6 w-6" />}
                            PUANI KAYDET VE ÇIK
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                            <Button onClick={() => window.location.reload()} variant="secondary" className="h-14 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-2xl border border-white/5">
                                <Repeat className="mr-2 h-5 w-5" /> Tekrar
                            </Button>
                            <Button asChild variant="secondary" className="h-14 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-2xl border border-white/5">
                                <Link href="/oyunlar/hedefi-vur"><Home className="mr-2 h-5 w-5" /> Menü</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentRound = rounds[currentRoundIndex];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col select-none touch-none">
            <GameBackground />
            <GameHUD score={score} time={timeLeft} round={currentRoundIndex + 1} totalRounds={rounds.length} />

            <main className="flex-grow flex flex-col items-center justify-center p-4 relative z-10 mt-16">
                
                {/* Soru / Hedef Tanımı */}
                <div className="mb-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl text-center max-w-2xl shadow-2xl animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-center gap-2 mb-2 text-sky-400 font-bold tracking-widest text-xs uppercase">
                        <Target className="w-4 h-4" /> HEDEFİ BUL
                    </div>
                    <p className="text-xl lg:text-3xl font-bold text-white leading-tight">
                        {currentRound?.definition}
                    </p>
                </div>

                {/* Oyun Alanı */}
                <div ref={gameAreaRef} className="relative w-full max-w-5xl flex-grow bg-slate-900/30 border-2 border-white/5 rounded-3xl overflow-hidden shadow-inner backdrop-blur-sm">
                    {/* Crosshair (Sadece masaüstünde görsel amaçlı, mobilde dokunmatik) */}
                    <div className="absolute inset-0 pointer-events-none hidden lg:block opacity-20">
                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white" />
                        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-white" />
                    </div>

                    {targets.map(target => (
                        !target.isHit && (
                            <div 
                                key={target.id}
                                className={cn(
                                    "absolute flex items-center justify-center rounded-full transition-transform cursor-pointer text-white font-bold p-1 text-center select-none active:scale-90",
                                    "w-24 h-24 lg:w-32 lg:h-32 border-4 text-sm lg:text-lg leading-tight break-words",
                                    target.colorClass
                                )}
                                style={{ 
                                    transform: `translate(${target.x}px, ${target.y}px)`,
                                    boxShadow: `0 0 20px currentColor`
                                }}
                                onClick={(e) => handleHit(target, e)}
                            >
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                                <span className="relative z-10 drop-shadow-md px-2">{target.text}</span>
                            </div>
                        )
                    ))}

                    {/* Tıklama / Patlama Efekti */}
                    {clickEffect && (
                        <div 
                            className="absolute pointer-events-none"
                            style={{ left: clickEffect.x, top: clickEffect.y }}
                        >
                            <div className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full animate-ping opacity-50" />
                            <Zap className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-yellow-400 animate-bounce" />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// --- WRAPPER ---
export default function HitTheTargetPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-sky-500" /></div>}>
            <HitTheTargetGame />
        </Suspense>
    );
}
