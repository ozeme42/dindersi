'use client';

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, ArrowLeft, PartyPopper, Repeat, Home, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getBalloonPoppingAction, submitBalloonScoreAction } from '../actions';
import type { BalloonPoppingRound } from '../actions';

// Game component
function BalloonPoppingGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [gameState, setGameState] = useState('loading'); // loading, start, playing, gameover
    const [score, setScore] = useState(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [rounds, setRounds] = useState<BalloonPoppingRound[]>([]);
    const [balloons, setBalloons] = useState<any[]>([]);
    const [projectiles, setProjectiles] = useState<any[]>([]);
    const [effects, setEffects] = useState<any[]>([]);
    const [angle, setAngle] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const gameContext = `Balon Patlatma - ${searchParams.get('topicName') || 'Genel'}`;

    const requestRef = useRef<number>();
    const lastSpawnTime = useRef(0);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    const startGame = () => {
        setScore(0);
        setLevelIndex(0);
        setBalloons([]);
        setProjectiles([]);
        setEffects([]);
        setGameState('playing');
        lastSpawnTime.current = 0;
    };
    
    const restartGame = () => {
        startGame();
    };

    const updateGame = useCallback((time: number) => {
        if (gameState !== 'playing' || rounds.length === 0) return;

        const currentRound = rounds[levelIndex % rounds.length];

        // 1. Spawn Balloons
        if (time - lastSpawnTime.current > 1200) { // Spawn rate
            const isCorrect = Math.random() > 0.6; // 40% chance for correct answer
            const text = isCorrect ? currentRound.target : currentRound.words[Math.floor(Math.random() * currentRound.words.length)];
            
            const newBalloon = {
                id: Date.now() + Math.random(),
                x: Math.random() * (window.innerWidth - 100) + 50,
                y: window.innerHeight + 100,
                text: text,
                speed: Math.random() * 1.5 + 1, // Speed
                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                isCorrect: text === currentRound.target
            };
            setBalloons(prev => [...prev, newBalloon]);
            lastSpawnTime.current = time;
        }

        // 2. Move objects
        setBalloons(prev => prev
            .map(b => ({ ...b, y: b.y - b.speed }))
            .filter(b => b.y > -150)
        );

        setProjectiles(prev => prev
            .map(p => ({
                ...p,
                x: p.x + Math.sin(p.angle * Math.PI / 180) * 12,
                y: p.y - Math.cos(p.angle * Math.PI / 180) * 12
            }))
            .filter(p => p.x > -20 && p.x < window.innerWidth + 20 && p.y > -20 && p.y < window.innerHeight + 20)
        );

        // 3. Collision Detection
        let newProjectiles = [...projectiles];
        let newBalloons = [...balloons];
        let scoreToAdd = 0;

        for (let pIdx = newProjectiles.length - 1; pIdx >= 0; pIdx--) {
            const p = newProjectiles[pIdx];
            let projectileHit = false;

            for (let bIdx = newBalloons.length - 1; bIdx >= 0; bIdx--) {
                const b = newBalloons[bIdx];
                const dx = p.x - b.x;
                const dy = p.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 50) { // Collision radius
                    projectileHit = true;
                    if (b.isCorrect) {
                        scoreToAdd += 10;
                        addEffect(b.x, b.y, "+10", "#22c55e");
                    } else {
                        scoreToAdd -= 5;
                        addEffect(b.x, b.y, "-5", "#ef4444");
                    }
                    newBalloons.splice(bIdx, 1);
                    break;
                }
            }
            if (projectileHit) {
                newProjectiles.splice(pIdx, 1);
            }
        }
        
        if(scoreToAdd !== 0) {
            setScore(s => Math.max(0, s + scoreToAdd));
        }
        setBalloons(newBalloons);
        setProjectiles(newProjectiles);
        
        if(currentRound && newBalloons.filter(b => b.isCorrect).length === 0 && Math.random() < 0.02) {
             const correctBalloonExists = newBalloons.some(b => b.isCorrect);
             if (!correctBalloonExists) {
                const newCorrectBalloon = {
                    id: Date.now(),
                    x: Math.random() * (window.innerWidth - 80) + 40,
                    y: window.innerHeight + 100,
                    text: currentRound.target,
                    speed: Math.random() * 1.5 + 2,
                    color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                    isCorrect: true,
                };
                setBalloons(prev => [...prev, newCorrectBalloon]);
             }
        }

        requestRef.current = requestAnimationFrame(updateGame);
    }, [gameState, projectiles, balloons, rounds, levelIndex]);

    const addEffect = (x: number, y: number, text: string, color: string) => {
        const id = Date.now() + Math.random();
        setEffects(prev => [...prev, { id, x, y, text, color }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
    };

    const handleInput = (e: React.MouseEvent | React.TouchEvent) => {
        if (gameState !== 'playing') return;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight;
        const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
        const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const rad = Math.atan2(dx, -dy);
        const deg = rad * (180 / Math.PI);
        const clampedAngle = Math.max(-75, Math.min(75, deg));
        setAngle(clampedAngle);
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
        if (!user || score === 0) {
            setGameState('finished');
            return;
        }
        setIsSaving(true);
        const result = await submitBalloonScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: 'Başarılı!', description: `${score} puan kazandın ve profiline eklendi.` });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
        setGameState('finished');
    };

    useEffect(() => {
        const fetchGameData = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getBalloonPoppingAction(params);
            if (result.error || !result.data || result.data.length === 0) {
                setError(result.error || "Bu konu için uygun oyun verisi bulunamadı.");
            } else {
                setRounds(result.data);
                setGameState('start');
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updateGame);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [updateGame]);
    
    useEffect(() => {
        if (score >= 100) { // Win condition
            setGameState('finished');
        }
    }, [score]);

    const currentRound = rounds[levelIndex % rounds.length];

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;

    if (error) return (
         <div className="flex h-screen items-center justify-center p-4">
             <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Oyun Yüklenemedi!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <div className="mt-4">
                    <Button asChild variant="secondary">
                       <Link href="/student/balon-patlatma">Geri Dön</Link>
                   </Button>
                </div>
            </Alert>
        </div>
    );
    
    return (
        <>
            <div 
                ref={gameAreaRef}
                id="game-canvas"
                onMouseMove={handleInput}
                onMouseDown={handleInput}
                onTouchMove={handleInput}
                onTouchStart={handleInput}
                className="w-screen h-screen relative bg-gradient-to-b from-sky-300 to-sky-500 cursor-crosshair overflow-hidden"
            >
                <Clouds />
                <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">Puan: {score}</div>
                
                {balloons.map(b => <Balloon key={b.id} {...b} />)}
                {projectiles.map(p => <Projectile key={p.id} {...p} />)}
                {effects.map(e => <PopEffect key={e.id} {...e} />)}
                
                <Shooter angle={angle} />

                {gameState === 'playing' && currentRound && (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50">
                        <div className="bg-white/80 backdrop-blur-sm text-slate-800 p-4 rounded-2xl shadow-lg font-bold text-center border-2 border-white">
                            <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                            <span className="text-xl">{currentRound.q}</span>
                        </div>
                    </div>
                )}
            </div>
            
            <AlertDialog open={gameState === 'start' || gameState === 'finished'}>
                {gameState === 'start' && (
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600 mb-8 text-lg">
                                Aşağıdaki tanımı oku.<br/>Doğru kavramı taşıyan balonu vur!
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <Button onClick={startGame} className="w-full text-xl py-6">BAŞLA</Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                )}
                {gameState === 'finished' && (
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-3xl font-bold text-primary mb-2">Oyun Bitti!</AlertDialogTitle>
                            <AlertDialogDescription className="text-lg">Tebrikler, harika bir iş çıkardın.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="text-center my-4">
                            <p className="text-muted-foreground">Toplam Puanın</p>
                            <p className="text-6xl font-bold text-primary">{score}</p>
                        </div>
                        <AlertDialogFooter>
                            <Button onClick={restartGame}><Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna</Button>
                            <Button onClick={withdrawAndSave} disabled={isSaving}><Home className="mr-2 h-4 w-4"/>Kaydet ve Çık</Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                )}
            </AlertDialog>
        </>
    );
}

const Balloon = React.memo(({ id, x, y, text, color }: any) => (
    <div className="balloon absolute w-[70px] h-[85px] rounded-t-full rounded-b-full flex items-center justify-center text-center font-bold text-sm text-white shadow-inner" style={{ left: x, top: y, backgroundColor: color }}>
        <div className="p-1 leading-tight break-words">{text}</div>
        <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
        <div className="absolute bottom-[-12px] left-1/2 -translate-x-px w-px h-10 bg-slate-500/50" />
    </div>
));
Balloon.displayName = 'Balloon';

const Projectile = React.memo(({ x, y }: any) => (
    <div className="projectile absolute w-3 h-3 bg-red-500 rounded-full" style={{ left: x, top: y }} />
));
Projectile.displayName = 'Projectile';

const PopEffect = React.memo(({ x, y, text, color }: any) => (
    <div className="pop-effect absolute text-2xl font-bold" style={{ left: x, top: y, color: color, animation: 'popAnim 0.4s ease-out forwards' }}>
        {text}
    </div>
));
PopEffect.displayName = 'PopEffect';

const Shooter = React.memo(({ angle }: { angle: number }) => (
    <>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-10 bg-slate-800 rounded-t-full z-10" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-40 origin-bottom-center z-20" style={{ transform: `rotate(${angle}deg)` }}>
            <div className="w-full h-full bg-slate-600 rounded-t-md relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-400 rounded-full" />
            </div>
        </div>
    </>
));
Shooter.displayName = 'Shooter';

const Clouds = React.memo(() => (
    <>
        <div className="absolute top-[10%] -left-48 w-48 h-16 bg-white/80 rounded-full opacity-50 animate-[floatCloud_40s_linear_infinite]" />
        <div className="absolute top-[20%] -left-52 w-64 h-20 bg-white/80 rounded-full opacity-40 animate-[floatCloud_55s_linear_infinite_5s]" />
        <div className="absolute top-[5%] -left-32 w-40 h-12 bg-white/80 rounded-full opacity-60 animate-[floatCloud_30s_linear_infinite_10s]" />
    </>
));
Clouds.displayName = 'Clouds';


const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

// Wrapper component
function BalloonPoppingGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <BalloonPoppingGame />
        </Suspense>
    );
}

export default BalloonPoppingGamePage;
