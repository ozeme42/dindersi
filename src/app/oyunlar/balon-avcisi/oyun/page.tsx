
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    Play, Zap, ArrowLeft, Loader2, Target, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { GameEndScreen } from '@/components/game-end-screen';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getBalloonHunterDataAction, submitBalloonHunterScoreAction, type BalloonHunterQuestion } from '../actions';
import { playSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';

const BALLOON_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899'  // Pink
];

const Game = () => {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState('loading'); // loading, start, playing, gameover
    const [levels, setLevels] = useState<BalloonHunterQuestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [score, setScore] = useState(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [balloons, setBalloons] = useState<any[]>([]); 
    const [projectiles, setProjectiles] = useState<any[]>([]);
    const [effects, setEffects] = useState<any[]>([]); 
    const [angle, setAngle] = useState(0); 

    const requestRef = useRef<number>();
    const lastSpawnTime = useRef(0);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    const gameContext = `Balon Avcısı - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    const backUrl = '/oyunlar/balon-avcisi';

    // Fetch data on load
    useEffect(() => {
        const fetchGameData = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getBalloonHunterDataAction(params);
            if (result.error || result.questions.length === 0) {
                setError(result.error || "Bu konu için uygun veri bulunamadı.");
                setGameState('error');
            } else {
                setLevels(result.questions);
                setGameState('start');
            }
        };
        fetchGameData();
    }, [searchParams]);

    // Handle game area resizing
    useEffect(() => {
        const updateDimensions = () => {
            if (gameAreaRef.current) {
                setDimensions({
                    width: gameAreaRef.current.offsetWidth,
                    height: gameAreaRef.current.offsetHeight
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [gameState]);

    const startGame = () => {
        setScore(0);
        setLevelIndex(0);
        setBalloons([]);
        setProjectiles([]);
        setEffects([]);
        setAngle(0);
        setGameState('playing');
        lastSpawnTime.current = 0;
        setIsSaving(false);
        setIsScoreSaved(false);
    };

    const updateGame = useCallback((time: number) => {
        if (gameState !== 'playing' || !dimensions.width) return;

        const currentLevel = levels[levelIndex % levels.length];
        if (!currentLevel) {
            setGameState('gameover');
            return;
        }

        // Spawn balloons
        if (time - lastSpawnTime.current > 1500) {
            const isCorrect = Math.random() > 0.6;
            const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
            
            const newBalloon = {
                id: Date.now(),
                x: Math.random() * (dimensions.width - 80) + 40,
                y: dimensions.height + 50,
                text: text,
                speed: Math.random() * 0.5 + 0.8,
                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                isCorrect: text === currentLevel.a,
            };
            setBalloons(prev => [...prev, newBalloon]);
            lastSpawnTime.current = time;
        }

        // Move balloons & projectiles
        setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -100));
        setProjectiles(prev => prev.map(p => ({
            ...p,
            x: p.x + Math.sin(p.angle * Math.PI / 180) * 12,
            y: p.y - Math.cos(p.angle * Math.PI / 180) * 12,
        })).filter(p => p.x > -10 && p.x < dimensions.width + 10 && p.y > -10));

        // Collision detection
        setProjectiles(currentProjectiles => {
            const nextProjectiles = [...currentProjectiles];
            setBalloons(currentBalloons => {
                let nextBalloons = [...currentBalloons];
                for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                    const p = nextProjectiles[pIdx];
                    for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                        const b = nextBalloons[bIdx];
                        const dx = p.x - b.x; const dy = p.y - b.y;
                        if (Math.sqrt(dx * dx + dy * dy) < 45) { // Collision radius
                            nextProjectiles.splice(pIdx, 1);
                            nextBalloons.splice(bIdx, 1);
                            if (b.isCorrect) handleCorrectHit(b.x, b.y); else handleWrongHit(b.x, b.y);
                            break;
                        }
                    }
                }
                return nextBalloons;
            });
            return nextProjectiles;
        });

        requestRef.current = requestAnimationFrame(updateGame);
    }, [gameState, levelIndex, levels, dimensions]);

    useEffect(() => {
        if (gameState === 'playing') {
            requestRef.current = requestAnimationFrame(updateGame);
        }
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [gameState, updateGame]);
    
    const handleCorrectHit = (x: number, y: number) => {
        playSound('correct');
        setScore(s => s + 10);
        addEffect(x, y, "+10", "#22c55e");
        setTimeout(() => {
            setLevelIndex(prev => {
                const next = prev + 1;
                if (next >= levels.length) {
                    setGameState('gameover');
                }
                return next;
            });
            setBalloons(prev => prev.filter(b => !b.isCorrect));
        }, 300);
    };

    const handleWrongHit = (x: number, y: number) => {
        playSound('incorrect');
        setScore(s => Math.max(0, s - 5));
        addEffect(x, y, "-5", "#ef4444");
    };

    const addEffect = (x: number, y: number, text: string, color: string) => {
        const id = Date.now() + Math.random();
        setEffects(prev => [...prev, { id, x, y, text, color }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 600);
    };

    const handleInput = (e: React.MouseEvent | React.TouchEvent) => {
        if (gameState !== 'playing' || !dimensions.width) return;
        const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
        const rect = gameAreaRef.current?.getBoundingClientRect();
        if (!rect) return;
        const targetX = clientX - rect.left;
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height - 20;
        const dx = targetX - centerX;
        const dy = (e.clientY || e.touches[0].clientY) - rect.top - centerY;
        const deg = Math.atan2(dx, -dy) * (180 / Math.PI);
        const clampedAngle = Math.max(-70, Math.min(70, deg));
        setAngle(clampedAngle);
        if (e.type === 'mousedown' || e.type === 'touchstart') shoot(clampedAngle);
    };

    const shoot = (fireAngle: number) => {
        playSound('pop');
        const radian = fireAngle * Math.PI / 180;
        setProjectiles(prev => [...prev, {
            id: Date.now(),
            x: dimensions.width / 2 + Math.sin(radian) * 60,
            y: dimensions.height - 20 - Math.cos(radian) * 60,
            angle: fireAngle
        }]);
    };
    
    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) { router.push(backUrl); return; }
        setIsSaving(true);
        const result = await submitBalloonHunterScoreAction(user.uid, score, gameContext);
        if (result.success) { setIsScoreSaved(true); toast({ title: "Başarılı!", description: "Puanınız kaydedildi." }); } 
        else { toast({ title: "Hata", description: result.error, variant: "destructive" }); }
        setIsSaving(false);
    };

    if (gameState === 'loading') return <div className="flex items-center justify-center h-screen bg-sky-600"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>;
    if (gameState === 'error') return (
        <div className="flex items-center justify-center h-screen bg-sky-800 text-white text-center p-4">
            <div>
                <AlertTriangle className="mx-auto h-12 w-12 text-yellow-300 mb-4"/>
                <h2 className="text-xl font-bold text-red-300 mb-4">Oyun Başlatılamadı</h2>
                <p>{error}</p>
                <Button asChild className="mt-6"><Link href={backUrl}>Geri Dön</Link></Button>
            </div>
        </div>
    );
     if (gameState === 'gameover') return <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={startGame} backUrl={backUrl} />;

    const currentLevel = levels[levelIndex % levels.length];

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-sky-500 overflow-hidden font-sans select-none relative touch-none">
            <div 
                ref={gameAreaRef}
                className="w-full h-full absolute inset-0 bg-gradient-to-b from-sky-300 to-sky-500 cursor-crosshair"
                onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}
            >
                <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200 flex items-center gap-2">
                    <Zap size={18} className="fill-yellow-400 text-yellow-500" /> {score}
                </div>
                
                {balloons.map(b => <div key={b.id} className="balloon" style={{ left: b.x, top: b.y, backgroundColor: b.color, transform: 'translate(-50%, -50%)' }}>{b.text}</div>)}
                {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}></div>)}
                {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color, transform: 'translate(-50%, -50%)' }}>{e.text}</div>)}

                <div className="shooter-base" style={{bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)'}} />
                <div className="shooter" style={{ transform: `translateX(-50%) rotate(${angle}deg)`, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }} >
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                </div>

                {gameState === 'playing' && currentLevel && (
                    <div className="question-panel" style={{bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)'}}>
                        <div className="question-box animate-[bounce_2s_infinite]">
                            <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                            {currentLevel.q}
                        </div>
                    </div>
                )}
            </div>

            {gameState === 'start' && (
                <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-sky-500">
                        <Target className="h-16 w-16 text-sky-600 mx-auto mb-4" />
                        <h1 className="text-4xl font-black text-sky-600 mb-4">Balon Avcısı</h1>
                        <p className="text-gray-600 mb-8 text-lg">Aşağıdaki tanıma uygun kavramı taşıyan balonu vur!</p>
                        <button onClick={startGame} className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg">
                            BAŞLA
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function BalonAvcisiGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-sky-600"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <Game />
        </Suspense>
    );
}

