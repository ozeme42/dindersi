"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Home, PartyPopper, Repeat } from 'lucide-react';
import Link from 'next/link';
import { getBalloonPoppingAction, submitBalloonPoppingScoreAction } from '../actions';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import type { BalloonPoppingRound } from '../actions';
import { cn } from "@/lib/utils";

const BALLOON_COLORS = [
    '#ef4444', // Red-500
    '#f97316', // Orange-500
    '#eab308', // Yellow-500
    '#22c55e', // Green-500
    '#3b82f6', // Blue-500
    '#a855f7', // Purple-500
    '#ec4899'  // Pink-500
];

function BalloonPoppingGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState('start'); // start, playing, gameover
    const [score, setScore] = useState(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [rounds, setRounds] = useState<BalloonPoppingRound[]>([]);
    const [balloons, setBalloons] = useState<any[]>([]);
    const [projectiles, setProjectiles] = useState<any[]>([]);
    const [effects, setEffects] = useState<any[]>([]);
    const [angle, setAngle] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const gameContext = `Balon Patlatma - ${searchParams.get('topicName') || 'Genel'}`;

    const requestRef = useRef<number>();
    const lastSpawnTime = useRef(0);

    const startGame = () => {
        setScore(0);
        setLevelIndex(0);
        setBalloons([]);
        setProjectiles([]);
        setEffects([]);
        setGameState('playing');
        lastSpawnTime.current = 0;
    };

    const handleCorrectHit = useCallback(() => {
        setScore(s => s + 10);
        setTimeout(() => {
            setLevelIndex(prev => (prev + 1));
            setBalloons(prev => prev.filter(b => !b.isCorrect)); 
        }, 500);
    }, []);

    const handleWrongHit = () => {
        setScore(s => Math.max(0, s - 5));
    };

    const addEffect = useCallback((x: number, y: number, text: string, color: string) => {
        const id = Date.now() + Math.random();
        setEffects(prev => [...prev, { id, x, y, text, color }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
    }, []);

    const updateGame = useCallback((time: number) => {
        if (gameState !== 'playing' || rounds.length === 0) return;

        const currentRound = rounds[levelIndex % rounds.length];
        if (!currentRound) return;

        if (time - lastSpawnTime.current > 1500) {
            const allWords = [currentRound.target, ...currentRound.words.filter(w => w !== currentRound.target)];
            const text = allWords[Math.floor(Math.random() * allWords.length)];
            
            const newBalloon = {
                id: Date.now() + Math.random(),
                x: Math.random() * (window.innerWidth - 80) + 40,
                y: window.innerHeight + 50,
                text: text,
                speed: Math.random() * 1 + 1,
                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                isCorrect: text === currentRound.target
            };
            setBalloons(prev => [...prev, newBalloon]);
            lastSpawnTime.current = time;
        }

        setBalloons(prev => prev
            .map(b => ({ ...b, y: b.y - b.speed }))
            .filter(b => b.y > -150)
        );

        setProjectiles(prev => prev
            .map(p => ({
                ...p,
                x: p.x + Math.sin(p.angle * Math.PI / 180) * 10,
                y: p.y - Math.cos(p.angle * Math.PI / 180) * 10
            }))
            .filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0)
        );

        let newBalloons = [...balloons];
        let newProjectiles = [...projectiles];

        for (let pIdx = newProjectiles.length - 1; pIdx >= 0; pIdx--) {
            const p = newProjectiles[pIdx];
            let projectileHit = false;
            for (let bIdx = newBalloons.length - 1; bIdx >= 0; bIdx--) {
                const b = newBalloons[bIdx];
                const dx = p.x - b.x;
                const dy = p.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 40) {
                    projectileHit = true;
                    if (b.isCorrect) {
                        handleCorrectHit();
                        addEffect(b.x, b.y, "+10", "#22c55e");
                    } else {
                        handleWrongHit();
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
        
        setBalloons(newBalloons);
        setProjectiles(newProjectiles);

        requestRef.current = requestAnimationFrame(updateGame);
    }, [gameState, rounds, levelIndex, balloons, projectiles, handleCorrectHit, addEffect]);

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

    const shoot = (fireAngle: number) => {
        const radian = fireAngle * Math.PI / 180;
        const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
        const startY = window.innerHeight - 20 - Math.cos(radian) * 60;

        setProjectiles(prev => [...prev, {
            id: Date.now(),
            x: startX,
            y: startY,
            angle: fireAngle
        }]);
    };

    const handleInput = (e: React.MouseEvent | React.TouchEvent) => {
        if (gameState !== 'playing') return;

        const clientX = 'clientX' in e ? e.clientX : (e.touches && e.touches[0].clientX);
        const clientY = 'clientY' in e ? e.clientY : (e.touches && e.touches[0].clientY);
        
        if (!clientX) return;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight - 20;

        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const rad = Math.atan2(dx, -dy);
        const deg = rad * (180 / Math.PI);
        
        const clampedAngle = Math.max(-70, Math.min(70, deg));
        setAngle(clampedAngle);

        if (e.type === 'mousedown' || e.type === 'touchstart') {
            shoot(clampedAngle);
        }
    };
    
     const withdrawAndSave = async () => {
        if (!user || score <= 0) {
            router.push('/student/activities');
            return;
        }
        setIsSaving(true);
        const result = await submitBalloonPoppingScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: 'Başarılı!', description: `${score} puan kazandın ve profiline eklendi.` });
            router.push('/student/activities');
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    useEffect(() => {
        const fetchGameData = async () => {
            setIsLoading(true);
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
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams]);

    const currentRound = rounds[levelIndex % rounds.length];

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;

    if (error) return (
         <div className="flex h-screen items-center justify-center p-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                <strong className="font-bold">Hata! </strong>
                <span className="block sm:inline ml-2">{error}</span>
                 <div className="mt-4">
                    <Button asChild variant="outline">
                        <Link href="/student/balon-patlatma"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div id="game-canvas" className="w-screen h-screen relative bg-gradient-to-b from-sky-300 to-sky-100 cursor-crosshair overflow-hidden"
            onMouseMove={handleInput}
            onMouseDown={handleInput}
            onTouchMove={handleInput}
            onTouchStart={handleInput}
        >
            <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                Puan: {score}
            </div>

            {balloons.map(b => (
                <div key={b.id} className="balloon absolute w-[70px] h-[85px] rounded-t-full rounded-b-[60%] flex items-center justify-center text-center font-bold text-sm text-white p-1"
                    style={{ left: b.x, top: b.y, backgroundColor: b.color, boxShadow: `inset -5px -5px 10px rgba(0,0,0,0.2)` }}>
                    {b.text}
                </div>
            ))}

            {projectiles.map(p => (
                <div key={p.id} className="projectile absolute w-2 h-4 bg-gray-700 rounded-sm z-10"
                    style={{ left: p.x, top: p.y, transform: `rotate(${p.angle}deg)` }}/>
            ))}

            {effects.map(e => (
                <div key={e.id} className="pop-effect absolute text-2xl font-bold z-30 pointer-events-none" style={{ left: e.x, top: e.y, color: e.color }}>
                    {e.text}
                </div>
            ))}

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-8 bg-slate-800 rounded-t-full z-10" />
            <div className="absolute bottom-5 left-1/2 w-2 h-16 bg-slate-700 rounded-sm origin-bottom z-20"
                style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}/>
            
            {gameState === 'playing' && currentRound && (
                <div className="absolute bottom-5 left-5 right-5 flex justify-center z-50 pointer-events-none">
                    <div className="bg-white text-slate-800 p-4 rounded-2xl shadow-lg font-bold text-lg text-center pointer-events-auto max-w-lg">
                        <span className="text-sky-600 text-xs block opacity-70 uppercase tracking-widest">HEDEF</span>
                        {currentRound.definition}
                    </div>
                </div>
            )}
            
            <AlertDialog open={gameState === 'start'}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 mb-8 text-lg">
                            Aşağıdaki tanımı oku.<br/>Doğru kavramı taşıyan balonu vur!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button onClick={startGame} className="w-full py-4 text-xl">BAŞLA</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={gameState === 'gameover'}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Oyun Bitti!</AlertDialogTitle>
                        <AlertDialogDescription>Toplam Puan: {score}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button onClick={restartGame}><Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna</Button>
                        <Button onClick={withdrawAndSave} disabled={isSaving}><Home className="mr-2 h-4 w-4"/>Kaydet ve Çık</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function BalloonPoppingGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <BalloonPoppingGame />
        </Suspense>
    );
}
