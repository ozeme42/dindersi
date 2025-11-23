
'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBalloonPoppingAction, submitBalloonPoppingScoreAction } from '../actions';
import type { BalloonPoppingRound } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Home, PartyPopper, Repeat, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';


const BALLOON_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#3b82f6', '#a855f7', '#ec4899'
];

function Balloon({ balloon, onClick }: { balloon: any, onClick: () => void }) {
    return (
        <div
            className="balloon absolute transition-all duration-1000 linear"
            style={{
                left: `${balloon.x}px`,
                top: `${balloon.y}px`,
                transform: 'scale(0)',
                animation: 'balloon-appear 0.5s ease-out forwards, balloon-float 15s linear infinite',
                '--float-x': `${Math.random() * 60 - 30}px`
            } as React.CSSProperties}
            onClick={onClick}
        >
            <div 
                className="balloon-body" 
                style={{ backgroundColor: balloon.color }}
            >
                {balloon.text}
            </div>
            <div className="balloon-knot" style={{ backgroundColor: balloon.color }}></div>
            <div className="balloon-string"></div>
        </div>
    )
}

function PopEffect({ effect }: { effect: any }) {
    return (
        <div 
            className="pop-effect absolute text-2xl font-bold"
            style={{ left: effect.x, top: effect.y, color: effect.color }}
        >
            {effect.text}
        </div>
    )
}

function BalloonPoppingGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState<'loading' | 'start' | 'playing' | 'gameover'>('loading');
    const [rounds, setRounds] = useState<BalloonPoppingRound[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [balloons, setBalloons] = useState<any[]>([]);
    const [effects, setEffects] = useState<any[]>([]);
    
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const spawnIntervalRef = useRef<NodeJS.Timeout>();

    const gameContext = `Balon Patlatma - ${searchParams.get('topicName') || 'Genel'}`;

    const resetGame = useCallback(() => {
        setScore(0);
        setLevelIndex(0);
        setBalloons([]);
        setEffects([]);
        setGameState('playing');
    }, []);

    const startGame = useCallback(() => {
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
                setRounds(result.data);
                resetGame();
            }
        };

        fetchGameData();
    }, [searchParams, resetGame]);

    useEffect(() => {
        startGame(); // Initial fetch
    }, [startGame]);
    

    const spawnBalloon = useCallback(() => {
        if (gameState !== 'playing' || !gameAreaRef.current) return;

        const currentRound = rounds[levelIndex % rounds.length];
        if (!currentRound) return;

        const isCorrect = Math.random() > 0.6; // 40% chance of correct answer
        const text = isCorrect ? currentRound.target : currentRound.words[Math.floor(Math.random() * currentRound.words.length)];
        
        const newBalloon = {
            id: Date.now() + Math.random(),
            x: Math.random() * (gameAreaRef.current.offsetWidth - 80),
            y: gameAreaRef.current.offsetHeight,
            text: text,
            speed: Math.random() * 1.5 + 1,
            color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
            isCorrect: text === currentRound.target,
        };

        setBalloons(prev => [...prev, newBalloon]);
    }, [gameState, rounds, levelIndex]);

    useEffect(() => {
        if (gameState === 'playing') {
            spawnIntervalRef.current = setInterval(spawnBalloon, 1200);
            return () => clearInterval(spawnIntervalRef.current);
        }
    }, [gameState, spawnBalloon]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const moveBalloons = () => {
            setBalloons(prev => {
                const newBalloons = prev
                    .map(b => ({ ...b, y: b.y - b.speed }))
                    .filter(b => b.y > -100);
                
                const poppedOffScreen = prev.length > newBalloons.length;
                if (poppedOffScreen && prev.some(b => b.y <= 0 && b.isCorrect)) {
                     // Correct balloon went off screen, penalty could be added here if desired
                }
                return newBalloons;
            });
        };

        const interval = setInterval(moveBalloons, 50);
        return () => clearInterval(interval);
    }, [gameState]);
    
    const addEffect = (x: number, y: number, text: string, color: string) => {
        const id = Date.now() + Math.random();
        setEffects(prev => [...prev, { id, x, y, text, color }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 800);
    };

    const handleBalloonClick = (balloonId: number) => {
        const balloon = balloons.find(b => b.id === balloonId);
        if (!balloon) return;

        setBalloons(prev => prev.filter(b => b.id !== balloonId));

        if (balloon.isCorrect) {
            setScore(s => s + 10);
            addEffect(balloon.x, balloon.y, "+10", "#22c55e");
            
            setTimeout(() => {
                setLevelIndex(prev => (prev + 1) % rounds.length);
                setBalloons(prev => prev.filter(b => !b.isCorrect));
            }, 500);

        } else {
            setScore(s => Math.max(0, s - 5));
            addEffect(balloon.x, balloon.y, "-5", "#ef4444");
        }
    };

    const handleWithdraw = async () => {
        if (user && score > 0) {
            const result = await submitBalloonPoppingScoreAction(user.uid, score, gameContext);
            if (result.success) {
                toast({ title: 'Skor Kaydedildi', description: `${score} puan kazandınız.` });
            } else {
                toast({ title: 'Hata', description: result.error, variant: 'destructive' });
            }
        }
        setGameState('gameover');
    };

    const currentRound = rounds[levelIndex % rounds.length];

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;

    if (error) return (
         <div className="flex h-screen items-center justify-center p-4">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Hata!</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
                <div className="mt-4">
                    <Button asChild variant="outline">
                        <Link href="/student/balon-patlatma"><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );
    
    if (gameState === 'gameover') {
         return (
            <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm">
                <Card className="text-center max-w-sm">
                    <CardHeader>
                        <CardTitle className="text-4xl font-bold text-sky-600 header-font">Oyun Bitti</CardTitle>
                        <CardDescription>Harika bir iş çıkardın!</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Toplam Puanın:</p>
                        <p className="text-6xl font-bold text-primary">{score}</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={startGame} size="lg" className="w-full"><Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna</Button>
                        <Button asChild variant="outline" className="w-full"><Link href="/student/balon-patlatma"><Home className="mr-2 h-4 w-4"/>Ana Menü</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="w-screen h-screen overflow-hidden">
            <style jsx global>{`
                .balloon { animation: balloon-float 15s linear infinite; }
                @keyframes balloon-float {
                    0% { transform: translateY(0) translateX(0) rotate(0deg); }
                    25% { transform: translateY(-20px) translateX(var(--float-x, 20px)) rotate(-5deg); }
                    50% { transform: translateY(-10px) translateX(0) rotate(5deg); }
                    75% { transform: translateY(-30px) translateX(calc(var(--float-x, 20px) * -1)) rotate(-3deg); }
                    100% { transform: translateY(0) translateX(0) rotate(0deg); }
                }
                @keyframes popAnim {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>
            
            <div ref={gameAreaRef} id="game-canvas" className="w-full h-full relative overflow-hidden bg-gradient-to-b from-sky-300 to-sky-500 cursor-crosshair">
                
                {balloons.map(b => <Balloon key={b.id} balloon={b} onClick={() => handleBalloonClick(b.id)} />)}
                {effects.map(e => <PopEffect key={e.id} effect={e} />)}

                <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                    Puan: {score}
                </div>

                {gameState === 'playing' && currentRound && (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50">
                        <div className="bg-white/90 backdrop-blur-sm text-slate-800 p-4 rounded-xl shadow-2xl text-center border-b-4 border-slate-300">
                            <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                            <p className="text-xl font-bold">{currentRound.definition}</p>
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
                        <div className="flex justify-center">
                            <Button onClick={startGame} size="lg" className="h-14 text-xl">BAŞLA</Button>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}


function BalloonPoppingGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <BalloonPoppingGame />
        </Suspense>
    );
}

export default BalloonPoppingGamePage;
