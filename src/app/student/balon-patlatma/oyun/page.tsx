'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBalloonPoppingAction, submitBalloonPoppingScoreAction } from '../actions';
import type { BalloonPoppingRound } from '../actions';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Loader2, ArrowLeft, X, Check, PartyPopper, Repeat, Home, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

const BALLOON_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899'  // Pink
];

function BalloonPoppingGame({ initialRounds, initialError }: { initialRounds: BalloonPoppingRound[], initialError?: string }) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [gameState, setGameState] = useState('start'); // start, playing, gameover
    const [score, setScore] = useState(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [rounds, setRounds] = useState(initialRounds || []);
    const [error, setError] = useState<string | null>(initialError || null);
    const [isLoading, setIsLoading] = useState(initialRounds ? false : true);
    
    const [balloons, setBalloons] = useState<any[]>([]); // {id, x, y, text, speed, color, isCorrect}
    const [projectiles, setProjectiles] = useState<any[]>([]); // {id, x, y, angle}
    const [effects, setEffects] = useState<any[]>([]); // {id, x, y, text, color}
    const [shooterAngle, setShooterAngle] = useState(0);

    const requestRef = useRef<number>();
    const lastSpawnTime = useRef(0);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const gameContext = `Balon Patlatma - ${searchParams.get('topicName') || 'Genel'}`;

    const startGame = () => {
        setScore(0);
        setLevelIndex(0);
        setBalloons([]);
        setProjectiles([]);
        setEffects([]);
        setGameState('playing');
        lastSpawnTime.current = 0;
    };
    
    const handleCorrectHit = useCallback((x: number, y: number) => {
        setScore(s => s + 10);
        addEffect(x, y, "+10", "#22c55e");
        
        setTimeout(() => {
            setLevelIndex(prev => (prev + 1) % rounds.length);
            setBalloons(prev => prev.filter(b => !b.isCorrect)); 
        }, 500);
    }, [rounds.length]);

    const handleWrongHit = useCallback((x: number, y: number) => {
        setScore(s => Math.max(0, s - 5));
        addEffect(x, y, "-5", "#ef4444");
    }, []);

    const addEffect = (x: number, y: number, text: string, color: string) => {
        const id = Date.now() + Math.random();
        setEffects(prev => [...prev, { id, x, y, text, color }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
    };

    const updateGame = useCallback((time: number) => {
        if (gameState !== 'playing') {
            cancelAnimationFrame(requestRef.current!);
            return;
        }

        const currentRound = rounds[levelIndex % rounds.length];
        if (!currentRound) {
            setError("Seviye verisi bulunamadı.");
            setGameState('gameover');
            return;
        }

        // 1. Spawn Balloons
        if (time - lastSpawnTime.current > 1500) {
            const isCorrect = Math.random() > 0.6;
            const text = isCorrect ? currentRound.target : currentRound.words[Math.floor(Math.random() * currentRound.words.length)];
            
            const newBalloon = {
                id: Date.now() + Math.random(),
                x: Math.random() * (window.innerWidth - 80) + 40,
                y: window.innerHeight + 50,
                text: text,
                speed: Math.random() * 1 + 1,
                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                isCorrect: text === currentRound.target,
            };
            setBalloons(prev => [...prev, newBalloon]);
            lastSpawnTime.current = time;
        }

        // 2. Move Entities
        setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150));
        setProjectiles(prev => prev.map(p => ({ ...p, x: p.x + Math.sin(p.angle * Math.PI / 180) * 10, y: p.y - Math.cos(p.angle * Math.PI / 180) * 10 })).filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0));
        
        // 3. Collision Detection
        let remainingProjectiles = [...projectiles];
        let remainingBalloons = [...balloons];
        
        for (let pIdx = remainingProjectiles.length - 1; pIdx >= 0; pIdx--) {
            const p = remainingProjectiles[pIdx];
            let projectileHit = false;
            for (let bIdx = remainingBalloons.length - 1; bIdx >= 0; bIdx--) {
                const b = remainingBalloons[bIdx];
                const dx = p.x - b.x;
                const dy = p.y - b.y;
                if (Math.sqrt(dx*dx + dy*dy) < 40) {
                    if (b.isCorrect) handleCorrectHit(b.x, b.y);
                    else handleWrongHit(b.x, b.y);
                    remainingBalloons.splice(bIdx, 1);
                    remainingProjectiles.splice(pIdx, 1);
                    projectileHit = true;
                    break;
                }
            }
        }
        setBalloons(remainingBalloons);
        setProjectiles(remainingProjectiles);

        requestRef.current = requestAnimationFrame(updateGame);
    }, [gameState, levelIndex, rounds, handleCorrectHit, handleWrongHit, projectiles, balloons]);
    
    useEffect(() => {
        if (gameState === 'playing') {
            requestRef.current = requestAnimationFrame(updateGame);
        }
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [gameState, updateGame]);

    const handleInput = (e: React.MouseEvent | React.TouchEvent) => {
        if (gameState !== 'playing') return;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight - 20;

        const clientX = 'clientX' in e ? e.clientX : (e.touches && e.touches[0].clientX);
        const clientY = 'clientY' in e ? e.clientY : (e.touches && e.touches[0].clientY);
        
        if (!clientX || !clientY) return;

        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const rad = Math.atan2(dx, -dy);
        const deg = rad * (180 / Math.PI);
        const clampedAngle = Math.max(-70, Math.min(70, deg));
        setShooterAngle(clampedAngle);

        if (e.type === 'mousedown' || e.type === 'touchstart') {
            shoot(clampedAngle);
        }
    };

    const shoot = (fireAngle: number) => {
        const radian = fireAngle * Math.PI / 180;
        const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
        const startY = window.innerHeight - 20 - Math.cos(radian) * 60;
        setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
    };

    const withdrawAndSave = async () => {
        setGameState('gameover');
        if (!user || score === 0) return;
        setIsSaving(true);
        const result = await submitBalloonPoppingScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: 'Başarılı!', description: `${score} puan kazandın ve profiline eklendi.` });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };
    
    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;

    if (error) return (
         <div className="flex h-screen items-center justify-center p-4">
            <AlertDialog open={true}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hata!</AlertDialogTitle>
                        <AlertDialogDescription>{error}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction asChild>
                            <Link href="/student/balon-patlatma">Kuruluma Dön</Link>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
    
    const currentRound = rounds[levelIndex % rounds.length];

    return (
        <>
            <style jsx global>{` body { overflow: hidden; } `}</style>
            <div 
                ref={gameAreaRef}
                className="w-screen h-screen relative bg-gradient-to-b from-sky-300 to-sky-100 cursor-crosshair"
                onMouseMove={handleInput}
                onMouseDown={handleInput}
                onTouchMove={handleInput}
                onTouchStart={handleInput}
            >
                <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                    Puan: {score}
                </div>

                {balloons.map(b => <div key={b.id} className="absolute w-[70px] h-[85px] rounded-[50%_50%_50%_50%_/_40%_40%_60%_60%] flex items-center justify-center text-center font-bold text-sm leading-tight shadow-inner text-white" style={{ left: b.x, top: b.y, backgroundColor: b.color }}>{b.text}</div>)}
                {projectiles.map(p => <div key={p.id} className="absolute w-2.5 h-2.5 bg-red-500 rounded-full z-10 shadow-[0_0_5px_#ef4444]" style={{ left: p.x, top: p.y }}></div>)}
                {effects.map(e => <div key={e.id} className="absolute text-2xl font-bold z-30 pointer-events-none animate-[popAnim_0.4s_ease-out_forwards]" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}

                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60px] h-[30px] bg-slate-800 rounded-t-[30px] z-20"></div>
                <div className="absolute bottom-5 left-1/2 w-1.5 h-16 bg-slate-600 z-20 rounded origin-bottom" style={{ transform: `translateX(-50%) rotate(${shooterAngle}deg)` }}></div>

                {gameState === 'playing' && currentRound && (
                    <div className="absolute bottom-5 left-5 right-5 flex justify-center z-50 pointer-events-none">
                        <div className="bg-white text-slate-900 py-4 px-8 rounded-2xl shadow-lg font-bold text-xl text-center pointer-events-auto max-w-lg animate-bounce">
                            <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                            {currentRound.definition}
                        </div>
                    </div>
                )}

                {gameState === 'start' && (
                    <AlertDialog open={true}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-600 mb-8 text-lg">
                                    Aşağıdaki tanımı oku.<br/>Doğru kavramı taşıyan balonu vur!
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogAction onClick={startGame}>Başla</AlertDialogAction>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {gameState === 'gameover' && (
                     <AlertDialog open={true}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-3xl font-bold">Oyun Bitti!</AlertDialogTitle>
                                <AlertDialogDescription className="text-lg">Toplam Puan: <span className="font-bold text-primary">{score}</span></AlertDialogDescription>
                            </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogAction asChild><Button onClick={startGame}><Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna</Button></AlertDialogAction>
                                <AlertDialogAction asChild><Link href="/student/balon-patlatma">Kuruluma Dön</Link></AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </>
    );
}

export default function BalloonPoppingGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <ClientWrapper />
        </Suspense>
    );
}

function ClientWrapper() {
    const searchParams = useSearchParams();
    const [initialData, setInitialData] = useState<{ rounds: BalloonPoppingRound[], error?: string} | null>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getBalloonPoppingAction(params);
            if (result.error || !result.data || result.data.length === 0) {
                setInitialData({ rounds: [], error: result.error || "Bu konu için uygun oyun verisi bulunamadı." });
            } else {
                setInitialData({ rounds: result.data });
            }
        };
        fetchInitialData();
    }, [searchParams]);

    if (!initialData) {
         return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
    }
    
    return <BalloonPoppingGame initialRounds={initialData.rounds} initialError={initialData.error} />
}
