'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getHitTheTargetAction, submitHitTheTargetScoreAction, type HitTheTargetRound } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Home, Repeat, Save, Timer, Target, Zap, Sparkles, Crosshair } from 'lucide-react';
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
    vx: number; 
    vy: number; 
    isHit: boolean;
    colorClass: string;
    size: number; 
};

const TARGET_COLORS = [
    "bg-sky-500/90 border-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.8)] text-white",
    "bg-fuchsia-500/90 border-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.8)] text-white",
    "bg-emerald-500/90 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.8)] text-white",
    "bg-amber-500/90 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.8)] text-white",
    "bg-rose-500/90 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.8)] text-white",
];

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-900/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-900/20 rounded-full blur-[150px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
);

const GameHUD = ({ score, time, round, totalRounds }: { score: number, time: number, round: number, totalRounds: number }) => {
    return (
        <div className="w-full z-50 p-2 md:p-4 pointer-events-none shrink-0">
            <div className="max-w-6xl mx-auto flex justify-between items-center pointer-events-auto bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 p-2 shadow-lg">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                        <span className="text-lg md:text-xl font-black text-white font-mono">{score}</span>
                    </div>
                    
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-300",
                        time <= 5 ? "bg-red-500/20 border-red-500/50 animate-pulse" : "bg-slate-800/50 border-slate-700"
                    )}>
                        <Timer className={cn("w-4 h-4 md:w-5 md:h-5", time <= 5 ? "text-red-400" : "text-sky-400")} />
                        <span className={cn("text-lg md:text-xl font-black font-mono", time <= 5 ? "text-red-400" : "text-white")}>{time}s</span>
                    </div>
                </div>
                
                <div className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase mr-1">TUR</span>
                    <span className="text-lg md:text-xl font-black text-white font-mono">{round}/{totalRounds}</span>
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
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const gameContext = `Hedefi Vur - ${searchParams.get('topicName') || 'Genel'}`;

    const generateTargets = useCallback((round: HitTheTargetRound) => {
        if (!round || !gameAreaRef.current) return;
        
        const area = gameAreaRef.current.getBoundingClientRect();
        const safeWidth = area.width * 0.8;
        const safeHeight = area.height * 0.8;
        const offsetX = area.width * 0.1;
        const offsetY = area.height * 0.1;

        let pool = [...round.words];
        if (!pool.includes(round.target)) {
            pool[0] = round.target;
        }
        pool.sort(() => Math.random() - 0.5);

        // Mobilde hedefler biraz daha küçük olsun
        const isMobile = window.innerWidth < 768;
        const baseSize = isMobile ? 80 : 110;

        const newTargets = pool.map((word, i) => ({
            id: i,
            text: word,
            isCorrect: word === round.target,
            x: Math.random() * safeWidth + offsetX,
            y: Math.random() * safeHeight + offsetY,
            vx: (Math.random() - 0.5) * (isMobile ? 1.5 : 2.5), 
            vy: (Math.random() - 0.5) * (isMobile ? 1.5 : 2.5),
            isHit: false,
            colorClass: TARGET_COLORS[i % TARGET_COLORS.length],
            size: word === round.target ? baseSize + 10 : baseSize // Doğru cevap biraz daha büyük olabilir
        }));
        
        setTargets(newTargets);
    }, []);

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
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams]);

    const handleRoundEnd = useCallback((success: boolean) => {
        setIsPaused(true);
        setGameState('round_end');

        setTimeout(() => {
            if (currentRoundIndex < rounds.length - 1) {
                const nextIndex = currentRoundIndex + 1;
                setCurrentRoundIndex(nextIndex);
                generateTargets(rounds[nextIndex]);
                setTimeLeft(30);
                setGameState('playing');
                setIsPaused(false);
            } else {
                setGameState('finished');
                playSound('win');
            }
        }, 1500);
    }, [currentRoundIndex, rounds, generateTargets]);
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if(gameAreaRef.current) {
            const rect = gameAreaRef.current.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };

    useEffect(() => {
        if (gameState !== 'playing' || isPaused) return;

        const timerInterval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleRoundEnd(false);
                    return 0;
                }
                if (prev <= 6) playSound('timer');
                return prev - 1;
            });
        }, 1000);

        const animate = () => {
            setTargets(prev => prev.map(t => {
                if (t.isHit) return t;

                let newX = t.x + t.vx;
                let newY = t.y + t.vy;
                let newVx = t.vx;
                let newVy = t.vy;

                const bounds = { w: 800, h: 500 }; 
                if (gameAreaRef.current) {
                    bounds.w = gameAreaRef.current.clientWidth;
                    bounds.h = gameAreaRef.current.clientHeight;
                }

                const radius = t.size / 2;
                if (newX < radius || newX > bounds.w - radius) newVx *= -1;
                if (newY < radius || newY > bounds.h - radius) newVy *= -1;

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

    useEffect(() => {
        if (gameState === 'playing' && rounds.length > 0 && targets.length === 0 && gameAreaRef.current) {
            generateTargets(rounds[0]);
            setIsPaused(false);
        }
    }, [gameState, rounds, targets.length, generateTargets]);

    const handleHit = (target: TargetInfo, e: React.MouseEvent | React.TouchEvent) => {
        if (target.isHit || isPaused) return;
        
        // Touch/Mouse koordinat düzeltmesi
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const parentRect = gameAreaRef.current?.getBoundingClientRect();
        
        if (parentRect) {
            setClickEffect({ 
                x: clientX - parentRect.left,
                y: clientY - parentRect.top,
                id: Date.now() 
            });
            setTimeout(() => setClickEffect(null), 600);
        }

        setTargets(prev => prev.map(t => t.id === target.id ? { ...t, isHit: true } : t));

        if (target.isCorrect) {
            playSound('correct'); 
            setScore(prev => prev + 50 + Math.ceil(timeLeft)); 
            handleRoundEnd(true);
        } else {
            playSound('incorrect'); 
            setScore(prev => Math.max(0, prev - 20)); 
        }
    };

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

    if (isLoading) return <div className="flex h-[100dvh] w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-sky-500" /></div>;
    if (error) return <div className="flex h-[100dvh] w-full items-center justify-center p-4 bg-slate-950 text-white">{error}</div>;

    if (gameState === 'finished') {
        return (
            <div className="h-[100dvh] w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <GameBackground />
                <div className="relative z-10 w-full max-w-md text-center space-y-6 animate-in zoom-in-95 duration-500">
                    <Trophy className="w-32 h-32 text-yellow-400 mx-auto drop-shadow-[0_0_25px_rgba(250,204,21,0.6)] animate-bounce" />
                    <div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-purple-400">GÖREV TAMAM!</h1>
                        <p className="text-slate-400 text-lg">Toplam Skorun</p>
                    </div>
                    <div className="text-6xl font-black text-white">{score}</div>
                    <Button onClick={handleSaveAndExit} size="lg" disabled={isSaving} className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600">
                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />} KAYDET VE ÇIK
                    </Button>
                </div>
            </div>
        );
    }

    const currentRound = rounds[currentRoundIndex];

    return (
        // DİKKAT: h-[100dvh] ile mobil tarayıcıda tam ekran yüksekliği sabitlendi.
        <div className="h-[100dvh] bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col select-none touch-none cursor-none">
            <GameBackground />
            
            {/* HUD */}
            <GameHUD score={score} time={timeLeft} round={currentRoundIndex + 1} totalRounds={rounds.length} />

            {/* Custom Crosshair */}
            <div className="fixed pointer-events-none z-[100] hidden lg:block mix-blend-difference" style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}>
                <Crosshair className="w-8 h-8 text-white opacity-80" />
            </div>

            <main className="flex-grow flex flex-col p-2 md:p-4 relative z-10 w-full h-full max-w-6xl mx-auto">
                
                {/* Soru Paneli (Daha Kompakt) */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-sky-500/30 px-4 py-3 rounded-2xl text-center shadow-lg shrink-0 mb-2">
                    <div className="flex items-center justify-center gap-2 mb-1 text-sky-400 font-bold tracking-widest text-[10px] uppercase">
                        <Target className="w-3 h-3" /> HEDEFİ BUL
                    </div>
                    <p className="text-lg md:text-3xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                        {currentRound?.definition}
                    </p>
                </div>

                {/* Oyun Alanı (Kalan tüm alanı kapla) */}
                <div 
                    ref={gameAreaRef} 
                    onMouseMove={handleMouseMove}
                    className="relative flex-grow w-full bg-slate-900/20 border-2 border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-[2px]"
                >
                    {targets.map(target => (
                        !target.isHit && (
                            <div 
                                key={target.id}
                                className={cn(
                                    "absolute flex items-center justify-center rounded-full transition-transform font-black text-center select-none active:scale-90 shadow-2xl",
                                    "border-[3px] hover:scale-110",
                                    target.colorClass
                                )}
                                style={{ 
                                    width: target.size,
                                    height: target.size,
                                    transform: `translate(${target.x}px, ${target.y}px)`,
                                    fontSize: target.size / 5 
                                }}
                                // onClick yerine onPointerDown kullanıyoruz, mobilde daha hızlı tepki için
                                onPointerDown={(e) => handleHit(target, e)}
                            >
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
                                <span className="relative z-10 drop-shadow-md px-1 leading-tight">{target.text}</span>
                            </div>
                        )
                    ))}

                    {/* Patlama Efekti */}
                    {clickEffect && (
                        <div className="absolute pointer-events-none z-50" style={{ left: clickEffect.x, top: clickEffect.y }}>
                            <div className="absolute -translate-x-1/2 -translate-y-1/2">
                                <Zap className="w-12 h-12 text-yellow-400 animate-bounce" />
                                <Sparkles className="absolute top-0 left-0 w-full h-full text-white animate-ping opacity-70" />
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function HitTheTargetPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-sky-500" /></div>}>
            <HitTheTargetGame />
        </Suspense>
    );
}