
'use client';

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { getBalloonPoppingAction, submitBalloonPoppingScoreAction } from '../actions';
import type { BalloonPoppingRound } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';


const BALLOON_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#3b82f6', '#a855f7', '#ec4899'
];

function BalloonPoppingGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState('start'); // start, playing, gameover
    const [score, setScore] = useState(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [levels, setLevels] = useState<BalloonPoppingRound[]>([]);
    const [balloons, setBalloons] = useState<any[]>([]);
    const [projectiles, setProjectiles] = useState<any[]>([]);
    const [effects, setEffects] = useState<any[]>([]);
    const [angle, setAngle] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const requestRef = useRef<number>();
    const lastSpawnTime = useRef(0);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    
    const gameContext = useMemo(() => `Balon Patlatma - ${searchParams.get('topicName') || 'Genel'}`, [searchParams]);

    // Fetch game data
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
                setGameState('error');
            } else {
                setLevels(result.data);
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams]);

    // Game handlers
    const startGame = () => {
        setScore(0);
        setLevelIndex(0);
        setBalloons([]);
        setProjectiles([]);
        setEffects([]);
        setGameState('playing');
        lastSpawnTime.current = 0;
    };

    const handleCorrectHit = (x: number, y: number) => {
        setScore(s => s + 10);
        addEffect(x, y, "+10", "#22c55e");
        setTimeout(() => {
            setLevelIndex(prev => (prev + 1) % levels.length);
            setBalloons(prev => prev.filter(b => !b.isCorrect));
        }, 500);
    };

    const handleWrongHit = (x: number, y: number) => {
        setScore(s => Math.max(0, s - 5));
        addEffect(x, y, "-5", "#ef4444");
    };

    const addEffect = (x: number, y: number, text: string, color: string) => {
        const id = Date.now() + Math.random();
        setEffects(prev => [...prev, { id, x, y, text, color }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
    };
    
    const handleSaveScore = async () => {
        if(!user || score <= 0) {
             router.push('/student/balon-patlatma');
             return;
        }
        const result = await submitBalloonPoppingScoreAction(user.uid, score, gameContext);
        if(result.success) {
            toast({ title: "Başarılı!", description: "Puanınız kaydedildi."});
        } else {
            toast({ title: "Hata", description: result.error, variant: 'destructive'});
        }
        router.push('/student/balon-patlatma');
    }

    // Game Loop
    const updateGame = useCallback((time: number) => {
        if (gameState !== 'playing' || levels.length === 0) return;

        const currentLevel = levels[levelIndex % levels.length];

        // 1. SPAWN BALLOONS
        if (time - lastSpawnTime.current > 1500) {
            const isCorrect = Math.random() > 0.6;
            const text = isCorrect ? currentLevel.target : currentLevel.words[Math.floor(Math.random() * currentLevel.words.length)];
            
            if (text) {
                const newBalloon = {
                    id: Date.now() + Math.random(),
                    x: Math.random() * (window.innerWidth - 80) + 40,
                    y: window.innerHeight + 50,
                    text: text,
                    speed: Math.random() * 1 + 1,
                    color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                    isCorrect: text === currentLevel.target
                };
                setBalloons(prev => [...prev, newBalloon]);
            }
            lastSpawnTime.current = time;
        }

        // 2. MOVE OBJECTS
        setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150));
        setProjectiles(prev => prev.map(p => ({
            ...p,
            x: p.x + Math.sin(p.angle * Math.PI / 180) * 10,
            y: p.y - Math.cos(p.angle * Math.PI / 180) * 10
        })).filter(p => p.y > 0));
        
        // 3. COLLISION DETECTION
        let nextProjectiles = [...projectiles];
        let nextBalloons = [...balloons];

        for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
            const p = nextProjectiles[pIdx];
            for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                const b = nextBalloons[bIdx];
                const dx = p.x - b.x;
                const dy = p.y - b.y;
                if (Math.sqrt(dx * dx + dy * dy) < 40) {
                    if (b.isCorrect) {
                        handleCorrectHit(b.x, b.y);
                    } else {
                        handleWrongHit(b.x, b.y);
                    }
                    nextProjectiles.splice(pIdx, 1);
                    nextBalloons.splice(bIdx, 1);
                    break;
                }
            }
        }
        
        setProjectiles(nextProjectiles);
        setBalloons(nextBalloons);

        requestRef.current = requestAnimationFrame(updateGame);
    }, [gameState, levelIndex, levels, projectiles, balloons]);


    useEffect(() => {
        if(gameState === 'playing') {
            requestRef.current = requestAnimationFrame(updateGame);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [updateGame, gameState]);

    // INPUT HANDLING
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
    
    const shoot = (fireAngle: number) => {
        const radian = fireAngle * Math.PI / 180;
        const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
        const startY = window.innerHeight - 20 - Math.cos(radian) * 60;

        setProjectiles(prev => [...prev, {
            id: Date.now(), x: startX, y: startY, angle: fireAngle
        }]);
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin"/></div>;
    }
    
    if (error) {
         return (
            <div className="w-full h-full min-h-screen p-4 flex items-center justify-center bg-gray-900">
                <Alert variant="destructive" className="max-w-lg bg-card text-card-foreground">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                     <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/student/balon-patlatma">
                                <ArrowLeft className="mr-2 h-4 w-4"/> Kurulumu Değiştir
                            </Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }
    
    return (
        <main>
            <div 
                id="game-canvas"
                ref={gameAreaRef}
                className="w-screen h-screen relative bg-gradient-to-b from-sky-300 to-sky-100 cursor-crosshair overflow-hidden"
                onMouseMove={handleInput}
                onMouseDown={handleInput}
                onTouchMove={handleInput}
                onTouchStart={handleInput}
            >
                {/* Score */}
                <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                    Puan: {score}
                </div>

                {/* Balloons */}
                {balloons.map(b => (
                    <div 
                        key={b.id}
                        className="absolute w-[70px] h-[85px] rounded-[50%_50%_50%_50%_/_40%_40%_60%_60%] flex items-center justify-center text-center font-bold text-xs leading-tight text-white [text-shadow:1px_1px_2px_rgba(0,0,0,0.3)] shadow-[inset_-5px_-5px_10px_rgba(0,0,0,0.1)] transition-transform duration-100 z-10"
                        style={{ left: b.x, top: b.y, backgroundColor: b.color }}
                    >
                        {b.text}
                         {/* Rope */}
                         <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[2px] h-[20px] bg-black/30"></div>
                         {/* Knot */}
                         <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-[6px] h-[4px] rounded-[2px]" style={{backgroundColor: 'inherit'}}></div>
                    </div>
                ))}

                {/* Projectiles */}
                {projectiles.map(p => (
                    <div key={p.id} className="absolute w-2.5 h-2.5 bg-red-500 rounded-full z-[15] shadow-[0_0_5px_#ef4444]" style={{ left: p.x, top: p.y }}/>
                ))}

                 {/* Pop Effects */}
                {effects.map(e => (
                    <div key={e.id} className="absolute text-3xl font-bold z-30 pointer-events-none animate-pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>
                        {e.text}
                    </div>
                ))}
                
                {/* Shooter */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60px] h-[30px] bg-slate-800 rounded-t-[30px] z-[19]"></div>
                <div className="absolute bottom-5 left-1/2 w-1.5 h-16 bg-slate-600 z-20 rounded-sm" style={{ transformOrigin: 'center bottom', transform: `translateX(-50%) rotate(${angle}deg)` }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                </div>

                 {/* Question Panel */}
                 {gameState === 'playing' && levels.length > 0 && (
                    <div className="absolute bottom-5 left-5 right-5 pointer-events-none flex justify-center z-50">
                        <div className="bg-white text-slate-900 py-3 px-8 rounded-2xl shadow-lg font-bold text-lg text-center border-b-4 border-slate-300 pointer-events-auto max-w-full animate-[bounce_2s_infinite]">
                            <span className="text-sky-600 text-xs block opacity-70 uppercase tracking-widest">HEDEF</span>
                            {levels[levelIndex % levels.length].definition}
                        </div>
                    </div>
                 )}
                 
                 {/* Start/End Screen */}
                <AlertDialog open={gameState === 'start'}>
                    <AlertDialogContent className="text-center">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600 mb-8 text-lg">
                                Aşağıdaki tanımı oku.<br/>Doğru kavramı taşıyan balonu vur!
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Button onClick={startGame} size="lg" className="w-full">BAŞLA</Button>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            
             <style jsx global>{`
                .header-font { font-family: 'Fredoka', sans-serif; }
                @keyframes pop-effect {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
                .animate-pop-effect { animation: pop-effect 0.4s ease-out forwards; }
            `}</style>
        </main>
    );
}

// Wrapper to use Suspense
export default function BalloonPoppingGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin"/></div>}>
            <BalloonPoppingGame />
        </Suspense>
    );
}
