
'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, PartyPopper, Repeat, Home } from 'lucide-react';
import { getBalloonPoppingAction, submitBalloonPoppingScore } from '../actions';
import type { HitTheTargetRound } from '../actions';
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';

function BalloonPoppingGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <BalloonPoppingGame />
        </Suspense>
    )
}

const Balloon = React.memo(({ id, x, y, text, color }: any) => (
    <div className="balloon absolute w-[70px] h-[85px] rounded-t-full rounded-b-full flex items-center justify-center text-center font-bold text-sm text-white shadow-inner" style={{ left: x, top: y, backgroundColor: color }}>
        <div className="p-1 leading-tight break-words">{text}</div>
        <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
        <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-px h-5 bg-black/30"/>
    </div>
));
Balloon.displayName = 'Balloon';

function BalloonPoppingGame() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    
    const [gameState, setGameState] = useState('loading'); // loading, start, playing, gameover
    const [score, setScore] = useState(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [rounds, setRounds] = useState<HitTheTargetRound[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [balloons, setBalloons] = useState<any[]>([]);
    const [projectiles, setProjectiles] = useState<any[]>([]);
    const [effects, setEffects] = useState<any[]>([]);
    const [angle, setAngle] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
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
    
    const restartGame = () => {
        startGame();
    };

    const requestRef = useRef<number>();
    const lastSpawnTime = useRef(0);

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
                setGameState('start');
            }
            setIsLoading(false);
        };

        fetchGameData();
    }, [searchParams]);

    const updateGame = useCallback((time: number) => {
        if (gameState !== 'playing') return;

        const currentRound = rounds[levelIndex % rounds.length];

        // 1. SPAWN BALLOONS
        if (time - lastSpawnTime.current > 1500) { // Every 1.5 seconds
            if (!currentRound) return;

            const correctAnswer = currentRound.target;
            // The `words` array contains the target AND the decoys.
            const decoys = currentRound.words.filter(w => w !== correctAnswer);
            const allWords = [correctAnswer, ...decoys];
            const word = allWords[Math.floor(Math.random() * allWords.length)];
            
            const newBalloon = {
                id: Date.now() + Math.random(),
                x: Math.random() * (window.innerWidth - 80) + 40,
                y: window.innerHeight + 50,
                text: word,
                speed: Math.random() * 1 + 1,
                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                isCorrect: word === correctAnswer
            };

            setBalloons(prev => [...prev, newBalloon]);
            lastSpawnTime.current = time;
        }

        // 2. MOVE THINGS
        setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150));
        setProjectiles(prev => prev.map(p => ({
            ...p,
            x: p.x + Math.sin(p.angle * Math.PI / 180) * 15,
            y: p.y - Math.cos(p.angle * Math.PI / 180) * 15
        })).filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0 && p.y < window.innerHeight));

        // 3. COLLISION DETECTION
        setProjectiles(currentProjectiles => {
            let nextProjectiles = [...currentProjectiles];
            let hitDetected = false;

            setBalloons(currentBalloons => {
                let nextBalloons = [...currentBalloons];

                for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                    const p = nextProjectiles[pIdx];
                    if (!p) continue;

                    for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                        const b = nextBalloons[bIdx];
                        if (!b) continue;

                        const dx = p.x - b.x - 35; // apx center of balloon
                        const dy = p.y - b.y - 42.5;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 40) { // Collision
                            nextProjectiles.splice(pIdx, 1);
                            nextBalloons.splice(bIdx, 1);
                            
                            if (b.isCorrect) handleCorrectHit(b.x, b.y);
                            else handleWrongHit(b.x, b.y);
                            
                            hitDetected = true;
                            break; 
                        }
                    }
                     if (hitDetected) break;
                }
                return nextBalloons;
            });
            return nextProjectiles;
        });

        requestRef.current = requestAnimationFrame(updateGame);
    }, [gameState, levelIndex, rounds]);

    useEffect(() => {
        if(gameState === 'playing'){
            requestRef.current = requestAnimationFrame(updateGame);
            return () => {
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
            };
        }
    }, [gameState, updateGame]);


    const handleCorrectHit = (x:number, y:number) => {
        setScore(s => s + 10);
        addEffect(x, y, "+10", "#22c55e");
        setTimeout(() => {
            setLevelIndex(prev => (prev + 1));
            setBalloons(prev => prev.filter(b => !b.isCorrect));
            if(levelIndex + 1 >= rounds.length) {
                setGameState('gameover');
            }
        }, 500);
    };

    const handleWrongHit = (x:number, y:number) => {
        setScore(s => Math.max(0, s - 5));
        addEffect(x, y, "-5", "#ef4444");
    };

    const addEffect = (x:number, y:number, text:string, color:string) => {
        const id = Date.now() + Math.random();
        setEffects(prev => [...prev, { id, x, y, text, color }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
    };

    const handleInput = (e: any) => {
        if (gameState !== 'playing') return;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
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
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight - 30;
        setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
    };
    
    const withdrawAndSave = async () => {
        if (!user || score === 0) {
            router.push('/student');
            return;
        }
        setIsSaving(true);
        const result = await submitBalloonPoppingScore(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
        router.push('/student');
    };

    const currentRound = rounds[levelIndex % rounds.length];

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;

    if (error) return (
         <div className="flex h-screen items-center justify-center p-4">
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                <strong className="font-bold">Hata! </strong>
                <span className="block sm:inline">{error}</span>
                <div className="mt-4">
                    <Button asChild variant="outline"><Link href="/student/balon-patlatma"><ArrowLeft className="mr-2 h-4 w-4"/>Geri</Link></Button>
                </div>
            </div>
        </div>
    );
    
     if (gameState === 'gameover') {
        return (
            <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                <Card className="text-center">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Oyun Bitti!</CardTitle>
                        <CardDescription>Tebrikler, tüm soruları tamamladın.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Toplam Puanın</p>
                        <p className="text-5xl font-bold text-primary">{score}</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={restartGame}><Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna</Button>
                        <Button onClick={withdrawAndSave} disabled={isSaving}><Home className="mr-2 h-4 w-4"/>Kaydet ve Çık</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div id="game-canvas" className="w-screen h-screen relative bg-gradient-to-b from-sky-300 to-sky-100 overflow-hidden cursor-crosshair" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
             {/* Game Start Dialog */}
            <AlertDialog open={gameState === 'start'}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 mb-8 text-lg">
                            Aşağıdaki tanımı oku.<br/>Doğru kavramı taşıyan balonu vur!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button onClick={startGame}><PartyPopper className="mr-2 h-4 w-4"/>Oyuna Başla</Button>
                        <Button onClick={withdrawAndSave} disabled={isSaving}><Home className="mr-2 h-4 w-4"/>Kaydet ve Çık</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                Puan: {score}
            </div>

            {balloons.map(b => <Balloon key={b.id} {...b} />)}
            {projectiles.map(p => <div key={p.id} className="projectile absolute w-2.5 h-2.5 bg-red-500 rounded-full z-[15] shadow-md" style={{ left: p.x, top: p.y }} />)}
            {effects.map(e => <div key={e.id} className="pop-effect absolute text-2xl font-bold z-30" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}
            
            <div className="shooter-base absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-8 bg-slate-800 rounded-t-full z-20"/>
            <div className="shooter absolute bottom-0 left-1/2 w-1.5 h-16 bg-slate-600 z-20 rounded-sm origin-bottom" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}/>

            {gameState === 'playing' && currentRound && (
                <div className="question-panel absolute bottom-5 left-5 right-5 flex justify-center z-50 pointer-events-none">
                    <div className="question-box bg-white text-slate-800 py-4 px-8 rounded-2xl shadow-lg font-bold text-xl text-center border-b-8 border-slate-200 pointer-events-auto max-w-full md:max-w-2xl">
                        <span className="text-sky-600 text-sm block uppercase tracking-widest font-semibold">HEDEF</span>
                        {currentRound.definition}
                    </div>
                </div>
            )}
        </div>
    );
}

const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

export default BalloonPoppingGamePage;

