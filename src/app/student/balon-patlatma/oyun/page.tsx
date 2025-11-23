
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBalloonPoppingAction, submitBalloonPoppingScoreAction } from '../actions';
import type { BalloonPoppingRound } from '../actions';
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Home, Repeat, PartyPopper, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import Link from 'next/link';

const BALLOON_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899'  // Pink
];

// Using React.memo for performance optimization on frequently re-rendered components
const Balloon = React.memo(({ id, x, y, text, color, onClick }: any) => (
    <div 
        className="balloon absolute w-[70px] h-[85px] rounded-t-full rounded-b-full flex items-center justify-center text-center font-bold text-sm text-white shadow-inner cursor-pointer" 
        style={{ left: x, top: y, backgroundColor: color, willChange: 'transform' }}
        onClick={() => onClick(id)}
    >
        <div className="p-1 leading-tight break-words">{text}</div>
        <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
        <div className="absolute bottom-[-22px] left-1/2 -translate-x-1/2 w-px h-[20px] bg-gray-600/50" />
    </div>
));
Balloon.displayName = 'Balloon';

const PopEffect = React.memo(({ id, x, y, text, color }: any) => (
    <div 
        className="pop-effect absolute text-2xl font-bold pointer-events-none" 
        style={{ left: x, top: y, color: color }}
    >
        {text}
    </div>
));
PopEffect.displayName = 'PopEffect';


function BalloonPoppingGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [gameState, setGameState] = useState('loading'); // loading, ready, playing, finished
    const [rounds, setRounds] = useState<BalloonPoppingRound[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [balloons, setBalloons] = useState<any[]>([]);
    const [effects, setEffects] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    const requestRef = useRef<number>();
    const lastSpawnTime = useRef(0);
    const gameContext = `Balon Patlatma - ${searchParams.get('topicName') || 'Genel'}`;

    const startGame = () => {
        setScore(0);
        setLevelIndex(0);
        setBalloons([]);
        setEffects([]);
        setGameState('playing');
        lastSpawnTime.current = 0;
    };
    
    const restartGame = () => {
        setGameState('loading');
        fetchGameData();
    }

    const withdrawAndSave = async () => {
        if (!user || score === 0) {
            setGameState('finished');
            return;
        }
        setIsSaving(true);
        const result = await submitBalloonPoppingScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: 'Başarılı!', description: `${score} puan kazandın ve profiline eklendi.` });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
        setGameState('finished');
    };

    const fetchGameData = useCallback(async () => {
        try {
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
                setRounds(result.data);
                setGameState('ready');
            }
        } catch (e: any) {
            setError("Oyun verileri yüklenirken bir hata oluştu.");
            setGameState('error');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const handleCorrectHit = useCallback((x: number, y: number) => {
        setScore(s => s + 10);
        setEffects(prev => [...prev, { id: Date.now(), x, y, text: "+10", color: "#22c55e" }]);
        setTimeout(() => setLevelIndex(prev => (prev + 1) % rounds.length), 300);
    }, [rounds.length]);

    const handleWrongHit = useCallback((x: number, y: number) => {
        setScore(s => Math.max(0, s - 5));
        setEffects(prev => [...prev, { id: Date.now(), x, y, text: "-5", color: "#ef4444" }]);
    }, []);

    const handleBalloonClick = useCallback((balloonId: number) => {
        const balloon = balloons.find(b => b.id === balloonId);
        if (!balloon) return;

        setBalloons(prev => prev.filter(b => b.id !== balloonId));
        if (balloon.isCorrect) {
            handleCorrectHit(balloon.x, balloon.y);
        } else {
            handleWrongHit(balloon.x, balloon.y);
        }
    }, [balloons, handleCorrectHit, handleWrongHit]);

    const updateGame = useCallback((time: number) => {
        if (gameState !== 'playing') {
            cancelAnimationFrame(requestRef.current!);
            return;
        }

        const currentRound = rounds[levelIndex % rounds.length];

        if (time - lastSpawnTime.current > 1200) {
            const words = [currentRound.target, ...currentRound.words].sort(() => 0.5 - Math.random());
            const newBalloon = {
                id: Date.now(),
                x: Math.random() * (window.innerWidth - 80) + 40,
                y: window.innerHeight + 50,
                text: words[0],
                speed: Math.random() * 1.5 + 1,
                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                isCorrect: words[0] === currentRound.target,
            };
            setBalloons(prev => [...prev, newBalloon]);
            lastSpawnTime.current = time;
        }

        setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150));
        setEffects(prev => prev.filter(e => e.id > Date.now() - 500));

        requestRef.current = requestAnimationFrame(updateGame);
    }, [gameState, levelIndex, rounds]);

    useEffect(() => {
        if (gameState === 'playing') {
            requestRef.current = requestAnimationFrame(updateGame);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [gameState, updateGame]);

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
    
    if (gameState === 'finished') {
        return (
            <div className="flex h-screen items-center justify-center p-4 bg-sky-100">
                <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl">
                    <PartyPopper className="h-16 w-16 text-yellow-500 mx-auto mb-4"/>
                    <h1 className="text-3xl font-bold text-sky-700 mb-2">Oyun Bitti!</h1>
                    <p className="text-gray-600 mb-6">Harika bir iş çıkardın.</p>
                    <div className="bg-sky-50 p-4 rounded-xl mb-6">
                        <p className="text-sm text-sky-500 font-bold">SKORUN</p>
                        <p className="text-5xl font-black text-sky-600">{score}</p>
                    </div>
                     <div className="flex flex-col gap-2">
                        <Button onClick={restartGame} size="lg"><Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna</Button>
                        <Button onClick={() => router.push('/student/balon-patlatma')} variant="outline" size="lg"><Home className="mr-2 h-4 w-4"/>Ana Menü</Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen w-screen bg-sky-400 overflow-hidden cursor-crosshair">
            <div id="game-canvas" className="w-full h-full relative bg-gradient-to-b from-sky-300 to-sky-500">
                {/* Clouds */}
                <div className="cloud absolute top-[10%] left-[-150px] w-[150px] h-[60px] bg-white rounded-full opacity-80 animate-[floatCloud_25s_linear_infinite]" />
                <div className="cloud absolute top-[20%] left-[-150px] w-[200px] h-[70px] bg-white rounded-full opacity-80 animate-[floatCloud_40s_linear_infinite_5s]" />
                <div className="cloud absolute top-[5%] left-[-150px] w-[100px] h-[40px] bg-white rounded-full opacity-80 animate-[floatCloud_30s_linear_infinite_10s]" />
                
                {/* Score */}
                <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                    Puan: {score}
                </div>

                {balloons.map(b => <Balloon key={b.id} {...b} onClick={handleBalloonClick} />)}
                {effects.map(e => <PopEffect key={e.id} {...e} />)}

                {/* Question Panel */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
                    <div className="bg-white text-slate-800 p-4 rounded-xl shadow-lg text-center font-bold text-lg md:text-xl">
                        <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                        {currentRound.question}
                    </div>
                </div>

                {/* Start Screen */}
                 {gameState === 'ready' && (
                    <AlertDialog open={true}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-600 mb-8 text-lg">
                                    Aşağıdaki tanımı oku.<br/>Doğru kavramı taşıyan balonu vur!
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <Button onClick={startGame} size="lg">BAŞLA</Button>
                                <Button onClick={withdrawAndSave} variant="secondary" disabled={isSaving}>Kaydet ve Çık</Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 )}
            </div>
        </div>
    );
}

// Suspense wrapper for client components using searchParams
export default function BalloonPoppingGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <BalloonPoppingGame />
        </Suspense>
    );
}
