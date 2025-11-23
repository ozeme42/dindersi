
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBalloonPoppingAction, submitBalloonPoppingScoreAction, type BalloonPoppingRound } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Home, Repeat, Save, AlertTriangle, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const BALLOON_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'
];

type BalloonState = {
    id: number;
    x: number;
    y: number;
    text: string;
    speed: number;
    color: string;
    isCorrect: boolean;
};

const Balloon = React.memo(({ id, x, y, text, color }: Omit<BalloonState, 'speed' | 'isCorrect'>) => (
    <div className="balloon absolute w-[70px] h-[85px] rounded-t-full rounded-b-full flex items-center justify-center text-center font-bold text-sm text-white shadow-inner" style={{ left: x, top: y, backgroundColor: color }}>
        <div className="p-1 leading-tight break-words">{text}</div>
        {/* Balloon Knot */}
        <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
    </div>
));
Balloon.displayName = 'Balloon';

const Projectile = ({ x, y }: { x: number; y: number }) => (
    <div className="projectile absolute w-2.5 h-2.5 bg-red-500 rounded-full z-10 shadow-[0_0_5px_#ef4444]" style={{ left: x, top: y }} />
);

const PopEffect = ({ x, y, text, color }: { x: number, y: number, text: string, color: string }) => (
    <div className="pop-effect absolute text-2xl font-bold z-20 pointer-events-none" style={{ left: x, top: y, color: color }}>
        {text}
    </div>
);

function BalloonPoppingGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [rounds, setRounds] = useState<BalloonPoppingRound[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [gameState, setGameState] = useState('start');
    const [score, setScore] = useState(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [balloons, setBalloons] = useState<BalloonState[]>([]);
    const [projectiles, setProjectiles] = useState<{ id: number; x: number; y: number; angle: number }[]>([]);
    const [effects, setEffects] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);
    const [angle, setAngle] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const requestRef = useRef<number>();
    const lastSpawnTime = useRef(0);

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

    const addEffect = useCallback((x: number, y: number, text: string, color: string) => {
        const id = Date.now() + Math.random();
        setEffects(prev => [...prev, { id, x, y, text, color }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
    }, []);

    const handleCorrectHit = useCallback((x: number, y: number) => {
        setScore(s => s + 10);
        addEffect(x, y, "+10", "#22c55e");
        setTimeout(() => {
            setLevelIndex(prev => (prev + 1) % rounds.length);
            setBalloons(prev => prev.filter(b => !b.isCorrect));
        }, 500);
    }, [addEffect, rounds.length]);

    const handleWrongHit = useCallback((x: number, y: number) => {
        setScore(s => Math.max(0, s - 5));
        addEffect(x, y, "-5", "#ef4444");
    }, [addEffect]);

    const updateGame = useCallback((time: number) => {
        if (gameState !== 'playing') return;

        const currentRound = rounds[levelIndex];
        if (!currentRound) return;

        // Spawn balloons
        if (time - lastSpawnTime.current > 1500) {
            const allWords = [currentRound.answer, ...currentRound.decoys];
            const word = allWords[Math.floor(Math.random() * allWords.length)];

            const newBalloon: BalloonState = {
                id: Date.now(),
                x: Math.random() * (window.innerWidth - 80) + 40,
                y: window.innerHeight + 50,
                text: word,
                speed: Math.random() * 1 + 1,
                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                isCorrect: word === currentRound.answer
            };
            setBalloons(prev => [...prev, newBalloon]);
            lastSpawnTime.current = time;
        }

        // Move balloons
        setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150));

        // Move projectiles
        setProjectiles(prev => prev.map(p => ({
            ...p,
            x: p.x + Math.sin(p.angle * Math.PI / 180) * 10,
            y: p.y - Math.cos(p.angle * Math.PI / 180) * 10
        })).filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0));

        // Collision detection
        setProjectiles(currentProjectiles => {
            let nextProjectiles = [...currentProjectiles];
            
            setBalloons(currentBalloons => {
                let nextBalloons = [...currentBalloons];

                for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                    const p = nextProjectiles[pIdx];
                    let projectileHit = false;

                    for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                        const b = nextBalloons[bIdx];
                        const dx = p.x - (b.x + 35);
                        const dy = p.y - (b.y + 42.5);
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 40) {
                            nextProjectiles.splice(pIdx, 1);
                            nextBalloons.splice(bIdx, 1);
                            
                            if (b.isCorrect) handleCorrectHit(b.x, b.y);
                            else handleWrongHit(b.x, b.y);
                            
                            projectileHit = true;
                            break;
                        }
                    }
                    if (projectileHit) break;
                }
                return nextBalloons;
            });
            return nextProjectiles;
        });

        requestRef.current = requestAnimationFrame(updateGame);
    }, [gameState, rounds, levelIndex, handleCorrectHit, handleWrongHit]);
    
     useEffect(() => {
        const fetchData = async () => {
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

        fetchData();
    }, [searchParams]);

    useEffect(() => {
        if (gameState === 'playing') {
            requestRef.current = requestAnimationFrame(updateGame);
            return () => {
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
            };
        }
    }, [gameState, updateGame]);

    const handleInput = (e: React.MouseEvent | React.TouchEvent) => {
        if (gameState !== 'playing') return;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight - 20;

        const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
        const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;

        if (!clientX) return;

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

        setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
    };
    
    const withdrawAndSave = async () => {
        if (!user || score <= 0 || isSaving) {
            router.push('/student/balon-patlatma');
            return;
        }
        setGameState('saving');
        setIsSaving(true);
        const result = await submitBalloonPoppingScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
        router.push('/student/balon-patlatma');
    };
    
    const restartGame = () => {
        setGameState('start');
    };

    const currentRound = rounds[levelIndex % rounds.length];

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;

    if (error) return (
         <div className="flex h-screen items-center justify-center p-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                <strong className="font-bold">Hata! </strong>
                <span className="block sm:inline">{error}</span>
                 <div className="mt-4">
                    <Button asChild variant="outline">
                        <Link href="/student/balon-patlatma"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
    
     if (gameState === 'saving') {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/> <p className="ml-4 text-lg">Puan kaydediliyor...</p></div>;
    }


    return (
        <div id="game-canvas" className="w-screen h-screen relative bg-gradient-to-b from-sky-300 to-sky-100 cursor-crosshair overflow-hidden"
            onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
             <style jsx global>{`
                .pop-effect { animation: popAnim 0.4s ease-out forwards; }
                @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
            `}</style>
            
            <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                Puan: {score}
            </div>

            {balloons.map(b => <Balloon key={b.id} {...b} />)}
            {projectiles.map(p => <Projectile key={p.id} {...p} />)}
            {effects.map(e => <PopEffect key={e.id} {...e} />)}

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-8 bg-slate-800 rounded-t-full z-20"/>
            <div className="shooter absolute bottom-5 left-1/2 w-4 h-16 bg-slate-700 z-10 rounded-sm origin-bottom" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}>
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-slate-500 rounded-full" />
            </div>

            {gameState === 'playing' && currentRound && (
                <div className="question-panel absolute bottom-5 left-5 right-5 flex justify-center z-30 pointer-events-none">
                    <div className="question-box bg-white text-slate-800 px-8 py-4 rounded-2xl shadow-lg font-bold text-xl text-center border-b-4 border-slate-300 pointer-events-auto max-w-2xl animate-pulse">
                        <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                        {currentRound.question}
                    </div>
                </div>
            )}
            
            <AlertDialog open={gameState === 'start' || gameState === 'gameover'}>
                 <AlertDialogContent>
                    {gameState === 'start' && (
                        <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600 mb-8 text-lg">
                                Aşağıdaki tanımı oku.<br/>Doğru kavramı taşıyan balonu vur!
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <Button onClick={startGame} className="w-full text-xl py-6">BAŞLA</Button>
                        </AlertDialogFooter>
                        </>
                    )}
                    {gameState === 'gameover' && (
                         <>
                         <AlertDialogHeader>
                             <AlertDialogTitle className="text-4xl font-bold text-sky-600 mb-4 header-font">Oyun Bitti!</AlertDialogTitle>
                             <AlertDialogDescription className="text-gray-600 mb-2 text-lg">
                               Tebrikler! Kazandığın Puan:
                             </AlertDialogDescription>
                             <p className="text-5xl font-bold text-center text-primary">{score}</p>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                             <Button onClick={restartGame}><Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna</Button>
                             <Button onClick={withdrawAndSave} disabled={isSaving}><Save className="mr-2 h-4 w-4"/>Kaydet ve Çık</Button>
                         </AlertDialogFooter>
                         </>
                    )}
                 </AlertDialogContent>
            </AlertDialog>
            {gameState === 'playing' && (
                 <Button className="absolute top-4 left-4 z-50" size="sm" variant="destructive" onClick={() => setGameState('gameover')}>
                    Oyunu Bitir
                </Button>
            )}
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

