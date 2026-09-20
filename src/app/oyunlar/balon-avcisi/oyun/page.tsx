'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    Play, Zap, Loader2, Target, AlertTriangle, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { GameEndScreen } from '@/components/game-end-screen';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getBalloonHunterDataAction, submitBalloonHunterScoreAction, type BalloonHunterQuestion } from '../actions';
import { playSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import { getGameBackUrl } from '@/lib/game-navigation';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';

const BALLOON_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899'  // Pink
];

function BalloonBoard({
    gameAreaRef,
    handleInput,
    balloons,
    projectiles,
    effects,
    angle,
    gameState,
    currentLevel,
    startGame,
    backUrl,
}: any) {
    const { theme } = useWordwall();

    return (
        <div 
            ref={gameAreaRef}
            className="w-full h-full relative cursor-crosshair overflow-hidden touch-none"
            onMouseMove={handleInput} 
            onMouseDown={handleInput} 
            onTouchMove={handleInput} 
            onTouchStart={handleInput}
        >
            <style jsx global>{`
                .balloon {
                    position: absolute;
                    width: 68px;
                    height: 82px;
                    border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    font-weight: 900;
                    font-size: 0.8rem;
                    line-height: 1.1;
                    box-shadow: inset -4px -4px 10px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.3);
                    transition: transform 0.1s;
                    z-index: 10;
                    color: white;
                    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
                    padding: 4px;
                    word-break: break-word;
                }
                .balloon::after {
                    content: '';
                    position: absolute;
                    bottom: -18px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 2px;
                    height: 18px;
                    background: rgba(255,255,255,0.4);
                }
                .balloon::before {
                    content: '';
                    position: absolute;
                    bottom: -4px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 6px;
                    height: 4px;
                    background: inherit;
                    border-radius: 2px;
                }
                .projectile {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: #f59e0b;
                    border-radius: 50%;
                    z-index: 15;
                    box-shadow: 0 0 8px #f59e0b;
                }
                .pop-effect {
                    position: absolute;
                    font-size: 1.8rem;
                    font-weight: 900;
                    animation: popAnim 0.4s ease-out forwards;
                    z-index: 30;
                    pointer-events: none;
                    text-shadow: 0 2px 8px rgba(0,0,0,0.5);
                }
                @keyframes popAnim {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
                .shooter-base {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 60px;
                    height: 30px;
                    border-radius: 30px 30px 0 0;
                    z-index: 19;
                    box-shadow: 0 -4px 12px rgba(0,0,0,0.3);
                }
                .shooter {
                    position: absolute;
                    left: 50%;
                    transform-origin: center bottom;
                    width: 8px;
                    height: 55px;
                    z-index: 20;
                    border-radius: 4px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.4);
                }
                .question-panel {
                    position: absolute;
                    left: 12px;
                    right: 12px;
                    pointer-events: none; 
                    display: flex;
                    justify-content: center;
                    z-index: 40;
                }
            `}</style>

            {/* Balonlar */}
            {balloons.map((b: any) => (
                <div 
                    key={b.id} 
                    className="balloon" 
                    style={{ left: b.x, top: b.y, backgroundColor: b.color, transform: 'translate(-50%, -50%)' }}
                >
                    {b.text}
                </div>
            ))}

            {/* Mermiler */}
            {projectiles.map((p: any) => (
                <div 
                    key={p.id} 
                    className="projectile" 
                    style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }} 
                />
            ))}

            {/* Efektler */}
            {effects.map((e: any) => (
                <div 
                    key={e.id} 
                    className="pop-effect" 
                    style={{ left: e.x, top: e.y, color: e.color, transform: 'translate(-50%, -50%)' }}
                >
                    {e.text}
                </div>
            ))}

            {/* Nişancı */}
            <div 
                className={cn("shooter-base border-t-2", theme.subPanelBg, theme.cardBorder)} 
                style={{ bottom: '10px' }} 
            />
            <div 
                className={cn("shooter border", theme.cardBorder, "bg-amber-400")} 
                style={{ transform: `translateX(-50%) rotate(${angle}deg)`, bottom: '10px' }} 
            >
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-amber-300 rounded-full shadow-md" />
            </div>

            {/* Hedef Soru Paneli */}
            {gameState === 'playing' && currentLevel && (
                <div className="question-panel" style={{ bottom: '70px' }}>
                    <div className={cn(
                        "p-3 sm:p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-xl pointer-events-auto max-w-lg text-center flex flex-col items-center gap-1 animate-in zoom-in-95 duration-200",
                        theme.cardBg,
                        theme.cardBorder,
                        theme.cardShadow
                    )}>
                        <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider",
                            theme.badgeCounter
                        )}>
                            Hedef Tanım
                        </span>
                        <p className={cn("text-xs sm:text-base font-black leading-snug", theme.cardText)}>
                            {currentLevel.q}
                        </p>
                    </div>
                </div>
            )}

            {/* Başlangıç Modalı */}
            {gameState === 'start' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className={cn(
                        "p-6 sm:p-8 rounded-3xl border-2 text-center max-w-sm w-full shadow-2xl flex flex-col items-center gap-4",
                        theme.cardBg,
                        theme.cardBorder,
                        theme.cardShadow
                    )}>
                        <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                            <Target className="h-12 w-12" />
                        </div>
                        <h1 className={cn("text-2xl sm:text-3xl font-black uppercase tracking-tight", theme.cardText)}>
                            Balon Avcısı
                        </h1>
                        <p className={cn("text-xs sm:text-sm font-bold opacity-80 leading-relaxed", theme.subText)}>
                            Yukarı doğru uçan balonlardan doğru kavramı taşıyanı nişan al ve vur!
                        </p>
                        <button 
                            type="button"
                            onClick={startGame} 
                            className={cn(
                                "w-full py-3.5 rounded-xl font-black text-lg border-2 shadow-xl transition-transform active:scale-95 cursor-pointer mt-2",
                                theme.buttonSelected
                            )}
                        >
                            Oyunu Başlat
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Game() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState('loading');
    const [levels, setLevels] = useState<BalloonHunterQuestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
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

    const topicName = searchParams.get('topicName') || 'Kavram Avı';
    const gameContext = `Balon Avcısı - ${searchParams.get('courseName') || 'Genel'} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/balon-avcisi' });

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
    
    useEffect(() => {
        if (lives <= 0) {
            setGameState('gameover');
        }
    }, [lives]);

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
        setLives(3);
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
        if (gameState !== 'playing' || !dimensions.width || dimensions.height === 0) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        const currentLevel = levels[levelIndex];
        if (!currentLevel) {
            setGameState('gameover');
            return;
        }

        // Spawn balloons
        if (time - lastSpawnTime.current > 1500) {
            const isCorrect = Math.random() > 0.6;
            const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
            
            const newBalloon = {
                id: Date.now() + Math.random(),
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
                const nextBalloons = [...currentBalloons];
                for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                    const p = nextProjectiles[pIdx];
                    let hit = false;
                    for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                        const b = nextBalloons[bIdx];
                        const dx = p.x - b.x; const dy = p.y - b.y;
                        if (Math.sqrt(dx * dx + dy * dy) < 45) {
                            nextProjectiles.splice(pIdx, 1);
                            nextBalloons.splice(bIdx, 1);
                            if (b.isCorrect) handleCorrectHit(b.x, b.y); else handleWrongHit(b.x, b.y);
                            hit = true;
                            break;
                        }
                    }
                    if (hit) break;
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
        setLives(l => l - 1);
        addEffect(x, y, "-1 ❤️", "#ef4444");
    };

    const addEffect = (x: number, y: number, text: string, color: string) => {
        const id = Date.now() + Math.random();
        setEffects(prev => [...prev, { id, x, y, text, color }]);
        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 600);
    };

    const handleInput = (e: React.MouseEvent | React.TouchEvent) => {
        if (gameState !== 'playing' || !dimensions.width) return;
        const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
        const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
        const rect = gameAreaRef.current?.getBoundingClientRect();
        if (!rect) return;
        const targetX = clientX - rect.left;
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height - 40;
        const dx = targetX - centerX;
        const dy = clientY - centerY;
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
            y: dimensions.height - 40 - Math.cos(radian) * 60,
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

    if (gameState === 'loading') {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
                <Loader2 className="h-12 w-12 animate-spin text-sky-400" />
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-white text-center p-4">
                <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl max-w-sm">
                    <AlertTriangle className="mx-auto h-12 w-12 text-rose-400 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Oyun Başlatılamadı</h2>
                    <p className="text-slate-400 text-sm mb-6">{error}</p>
                    <Button asChild className="w-full"><Link href={backUrl}>Geri Dön</Link></Button>
                </div>
            </div>
        );
    }

    const currentLevel = levels[levelIndex % (levels.length || 1)];

    return (
        <WordwallShell
            title="Balon Avcısı"
            subtitle={topicName}
            currentQuestionIndex={levelIndex + 1}
            totalQuestions={levels.length}
            score={score}
            lives={lives}
            maxLives={3}
            backUrl={backUrl}
            isFinished={gameState === 'gameover'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden relative select-none touch-none p-0"
        >
            {gameState === 'gameover' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={score} 
                        onSave={handleSaveAndExit} 
                        isSaving={isSaving} 
                        scoreSaved={isScoreSaved} 
                        onRestart={startGame} 
                        backUrl={backUrl} 
                    />
                </div>
            ) : (
                <BalloonBoard
                    gameAreaRef={gameAreaRef}
                    handleInput={handleInput}
                    balloons={balloons}
                    projectiles={projectiles}
                    effects={effects}
                    angle={angle}
                    gameState={gameState}
                    currentLevel={currentLevel}
                    startGame={startGame}
                    backUrl={backUrl}
                />
            )}
        </WordwallShell>
    );
}

export default function BalonAvcisiGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-sky-400" /></div>}>
            <Game />
        </Suspense>
    );
}