
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Loader2, Repeat, Home, AlertTriangle, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getBalloonPoppingAction, submitBalloonPoppingScoreAction } from '../actions';
import type { BalloonPoppingRound } from '../actions';
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";

const Balloon = React.memo(({ id, x, y, text, color, onClick }: any) => (
    <button
        onClick={onClick}
        className="balloon absolute w-[70px] h-[85px] rounded-t-full rounded-b-full flex items-center justify-center text-center font-bold text-sm text-white shadow-inner transition-transform duration-100 hover:scale-110"
        style={{ left: x, top: y, backgroundColor: color }}
    >
        <div className="p-1 leading-tight break-words">{text}</div>
        {/* Balloon tie */}
        <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
        <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-px h-20 bg-gray-400" />
    </button>
));
Balloon.displayName = 'Balloon';


const PopEffect = React.memo(({ id, x, y, text, color }: any) => (
    <div
        className="pop-effect absolute font-bold text-2xl"
        style={{ left: x, top: y, color: color, animation: 'popAnim 0.4s ease-out forwards' }}
    >
        {text}
    </div>
));
PopEffect.displayName = 'PopEffect';

function BalloonPoppingGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState('start');
    const [score, setScore] = useState(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [balloons, setBalloons] = useState<any[]>([]);
    const [effects, setEffects] = useState<any[]>([]);
    const [rounds, setRounds] = useState<BalloonPoppingRound[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const gameContext = `Balon Patlatma - ${searchParams.get('topicName') || 'Genel'}`;

    const startGame = () => {
        setScore(0);
        setLevelIndex(0);
        setBalloons([]);
        setEffects([]);
        setGameState('playing');
    };
    
    const restartGame = () => {
        startGame();
    };

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
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
        } catch (err: any) {
            setError("Oyun verileri yüklenirken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const handleBalloonPop = (balloon: any) => {
        if (gameState !== 'playing') return;

        // Remove balloon
        setBalloons(prev => prev.filter(b => b.id !== balloon.id));

        if (balloon.isCorrect) {
            setScore(prev => prev + 10);
            addEffect(balloon.x, balloon.y, "+10", "#22c55e");
            
            // Move to next level after a short delay
            setTimeout(() => {
                if (levelIndex < rounds.length - 1) {
                    setLevelIndex(prev => prev + 1);
                } else {
                    setGameState('gameover');
                }
            }, 500);
        } else {
            setScore(prev => Math.max(0, prev - 5));
            addEffect(balloon.x, balloon.y, "-5", "#ef4444");
        }
    };
    
    const addEffect = (x: number, y: number, text: string, color: string) => {
        const id = Date.now() + Math.random();
        setEffects(prev => [...prev, { id, x, y, text, color }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 400);
    };
    
     const withdrawAndSave = async () => {
        if (!user || score <= 0) {
            router.push('/student/balon-patlatma');
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
        router.push('/student/balon-patlatma');
    };


    // Game Loop for spawning and moving balloons
    useEffect(() => {
        if (gameState !== 'playing') return;

        const spawnInterval = setInterval(() => {
            const currentRound = rounds[levelIndex];
            if (!currentRound) return;

            const allWords = [currentRound.answer, ...currentRound.decoys];
            const word = allWords[Math.floor(Math.random() * allWords.length)];

            const newBalloon = {
                id: Date.now() + Math.random(),
                x: Math.random() * (window.innerWidth - 80),
                y: window.innerHeight,
                text: word,
                speed: Math.random() * 1.5 + 1,
                color: `hsl(${Math.random() * 360}, 70%, 60%)`,
                isCorrect: word === currentRound.answer
            };
            setBalloons(prev => [...prev, newBalloon]);
        }, 1200);

        const moveInterval = setInterval(() => {
            setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -100));
        }, 16); // ~60fps

        return () => {
            clearInterval(spawnInterval);
            clearInterval(moveInterval);
        };
    }, [gameState, levelIndex, rounds]);

    const currentRound = rounds[levelIndex % rounds.length];

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;

    if (error) return (
         <div className="flex h-screen items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Oyun Yüklenemedi</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                 <div className="mt-4">
                    <Button asChild variant="outline">
                        <Link href="/student/balon-patlatma"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );
    
    if (gameState === 'gameover') {
         return (
             <AlertDialog open={true}>
                 <AlertDialogContent>
                     <AlertDialogHeader>
                         <AlertDialogTitle className="text-4xl font-bold text-sky-600 mb-4 header-font">Oyun Bitti!</AlertDialogTitle>
                         <AlertDialogDescription className="text-gray-600 mb-8 text-lg">
                            Harika iş! Toplamda <span className="font-bold">{score}</span> puan kazandın.
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <Button onClick={restartGame}><Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna</Button>
                         <Button onClick={withdrawAndSave} disabled={isSaving}><Home className="mr-2 h-4 w-4"/>Kaydet ve Çık</Button>
                     </AlertDialogFooter>
                 </AlertDialogContent>
            </AlertDialog>
         );
    }
    
    if (gameState === 'start' || !currentRound) {
        return (
             <AlertDialog open={true}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 mb-8 text-lg">
                            Aşağıdaki tanımı oku.<br/>Doğru kavramı taşıyan balonu vur!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button onClick={startGame} className="w-full">BAŞLA</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    return (
        <div id="game-canvas" className="w-screen h-screen relative bg-gradient-to-b from-sky-300 to-sky-100 cursor-crosshair overflow-hidden">
            {/* Clouds */}
            <div className="cloud absolute bg-white rounded-full opacity-80" style={{ top: '10%', width: '100px', height: '40px', animation: 'floatCloud 20s linear infinite' }}></div>
            <div className="cloud absolute bg-white rounded-full opacity-80" style={{ top: '20%', left: '60%', width: '120px', height: '50px', animation: 'floatCloud 15s linear infinite' }}></div>
            <div className="cloud absolute bg-white rounded-full opacity-80" style={{ top: '5%', left: '80%', width: '80px', height: '30px', animation: 'floatCloud 25s linear infinite' }}></div>
            
            <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                Puan: {score}
            </div>

            {balloons.map(b => <Balloon key={b.id} {...b} onClick={() => handleBalloonPop(b)} />)}
            {effects.map(e => <PopEffect key={e.id} {...e} />)}

            <div className="question-panel absolute bottom-5 left-5 right-5 flex justify-center z-50 pointer-events-none">
                <div className="question-box bg-white text-slate-800 p-4 rounded-xl shadow-lg font-bold text-lg text-center max-w-2xl pointer-events-auto">
                    <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                    {currentRound.definition}
                </div>
            </div>
            
            <style jsx global>{`
                @keyframes floatCloud {
                    from { transform: translateX(-200px); }
                    to { transform: translateX(100vw); }
                }
                @keyframes popAnim {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

// Wrapper component to use Suspense
export default function BalloonPoppingGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <BalloonPoppingGame />
        </Suspense>
    );
}
