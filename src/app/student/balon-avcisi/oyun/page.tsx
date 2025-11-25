
'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getBalloonHuntQuestions } from './actions';
import { useAuth } from '@/context/auth-context';
import { submitBalloonHuntScore } from './actions';

type Level = {
    q: string;
    a: string;
    wrongs: string[];
};

function BalloonHuntGame() {
    const { user } = useAuth();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState('start'); // start, playing, gameover
    const [score, setScore] = useState(0);
    const scoreRef = useRef(0);
    const [levelIndex, setLevelIndex] = useState(0);
    const [balloons, setBalloons] = useState<any[]>([]);
    const [projectiles, setProjectiles] = useState<any[]>([]);
    const [effects, setEffects] = useState<any[]>([]);
    const [angle, setAngle] = useState(0);
    const [levels, setLevels] = useState<Level[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cloudStyles, setCloudStyles] = useState<React.CSSProperties[]>([]);

    const requestRef = useRef<number>();
    const lastSpawnTime = useRef(0);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const gameStateRef = useRef(gameState);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);
    
    useEffect(() => {
        scoreRef.current = score;
    }, [score]);

    useEffect(() => {
        const styles = [...Array(5)].map((_, i) => ({
            top: `${10 + i * 18}%`,
            width: `${80 + i * 15}px`,
            height: `${30 + i * 8}px`,
            animationDuration: `${15 + i * 5}s`,
            animationDelay: `-${i * 5}s`,
            opacity: Math.random() * 0.3 + 0.3,
            left: `${Math.random() * 100}vw`
        }));
        setCloudStyles(styles);
    }, []);

    useEffect(() => {
        async function fetchQuestions() {
            setIsLoading(true);
            const topicId = searchParams.get('topicId');
            // The action now returns { questions, error }
            const result = await getBalloonHuntQuestions({ topicId: topicId || undefined });
            if (result.error) {
                setError(result.error);
            } else {
                // Ensure the data matches the Level format. The action is now responsible for this.
                setLevels(result.questions as Level[]);
            }
            setIsLoading(false);
        }
        fetchQuestions();
    }, [searchParams]);

     // This effect runs when the game ends to save the score.
    useEffect(() => {
        return () => {
            if (gameStateRef.current === 'gameover' && scoreRef.current > 0 && user) {
                const topicName = searchParams.get('topicName') || 'Genel';
                submitBalloonHuntScore(user.uid, scoreRef.current, `Balon Avcısı - ${topicName}`);
                scoreRef.current = 0; // Prevent resubmitting
            }
        }
    }, [user, searchParams]);


    const startGame = () => {
        if (levels.length === 0) {
            setError("Oyun için hiç soru bulunamadı. Lütfen farklı bir konu seçin.");
            return;
        }
        setScore(0);
        setLevelIndex(0);
        setBalloons([]);
        setProjectiles([]);
        setEffects([]);
        setGameState('playing');
        lastSpawnTime.current = 0;
    };

    const handleRestart = () => {
        startGame();
    };

    const handleCorrectHit = (x: number, y: number) => {
        setScore(s => s + 10);
        addEffect(x, y, "+10", "#22c55e");
        setTimeout(() => {
            if (gameStateRef.current !== 'playing') return;
            setLevelIndex(prev => {
                const nextIndex = prev + 1;
                if (nextIndex >= levels.length) {
                    setGameState('gameover');
                    return prev;
                }
                return nextIndex;
            });
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

    const shoot = (fireAngle: number) => {
        const radian = fireAngle * Math.PI / 180;
        const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
        const startY = window.innerHeight - 80 - Math.cos(radian) * 60;
        setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
    };

    const handleInput = (e: any) => {
        if (gameState !== 'playing') return;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight - 80;
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
    
    const updateGame = useCallback((time: number) => {
        if (gameStateRef.current !== 'playing') {
            requestRef.current = requestAnimationFrame(updateGame);
            return;
        };

        const currentLevel = levels[levelIndex % levels.length];
        if (!currentLevel) {
            requestRef.current = requestAnimationFrame(updateGame);
            return;
        }

        if (time - lastSpawnTime.current > 1500) {
            const isCorrect = Math.random() > 0.6;
            const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
            const newBalloon = {
                id: Date.now() + Math.random(),
                x: Math.random() * (window.innerWidth - 80) + 40,
                y: window.innerHeight + 50,
                text: text,
                speed: Math.random() * 1 + 1,
                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                isCorrect: text === currentLevel.a
            };
            setBalloons(prev => [...prev, newBalloon]);
            lastSpawnTime.current = time;
        }

        setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150));

        setProjectiles(prev => prev.map(p => ({
            ...p,
            x: p.x + Math.sin(p.angle * Math.PI / 180) * 10,
            y: p.y - Math.cos(p.angle * Math.PI / 180) * 10
        })).filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0 && p.y < window.innerHeight));

        setProjectiles(currentProjectiles => {
            let nextProjectiles = [...currentProjectiles];
            setBalloons(currentBalloons => {
                let nextBalloons = [...currentBalloons];
                for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                    const p = nextProjectiles[pIdx];
                    let hit = false;
                    for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                        const b = nextBalloons[bIdx];
                        const dx = p.x - b.x;
                        const dy = p.y - b.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 40) {
                            nextBalloons.splice(bIdx, 1);
                            if (b.isCorrect) handleCorrectHit(b.x, b.y);
                            else handleWrongHit(b.x, b.y);
                            hit = true;
                            break;
                        }
                    }
                    if (hit) {
                        nextProjectiles.splice(pIdx, 1);
                    }
                }
                return nextBalloons;
            });
            return nextProjectiles;
        });

        requestRef.current = requestAnimationFrame(updateGame);
    }, [levelIndex, levels]);
    
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


    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <p className="text-red-500">{error}</p>
                 <Button asChild variant="outline" className="ml-4">
                    <Link href="/student/balon-avcisi">Geri Dön</Link>
                </Button>
            </div>
        );
    }
    
    const htmlContent = `
    <!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Balon Avcısı</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Nunito:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Nunito', sans-serif; background-color: #0ea5e9; color: white; overflow: hidden; touch-action: none; user-select: none; }
        .header-font { font-family: 'Fredoka', sans-serif; }
        #game-canvas { width: 100vw; height: 100vh; position: relative; background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%); cursor: crosshair; }
        .cloud { position: absolute; background: white; border-radius: 50%; opacity: 0.8; animation: floatCloud linear infinite; }
        .cloud::after, .cloud::before { content: ''; position: absolute; background: white; border-radius: 50%; }
        @keyframes floatCloud { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }
        .balloon { position: absolute; width: 70px; height: 85px; border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; font-size: 0.85rem; line-height: 1; box-shadow: inset -5px -5px 10px rgba(0,0,0,0.1); transition: transform 0.1s; z-index: 10; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
        .balloon::after { content: ''; position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); width: 2px; height: 20px; background: rgba(0,0,0,0.3); }
        .balloon::before { content: ''; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 6px; height: 4px; background: inherit; border-radius: 2px; }
        .shooter { position: absolute; bottom: 80px; left: 50%; transform-origin: center bottom; width: 6px; height: 60px; background: #475569; z-index: 20; border-radius: 3px; }
        .shooter-base { position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); width: 60px; height: 30px; background: #1e293b; border-radius: 30px 30px 0 0; z-index: 19; }
        .projectile { position: absolute; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; z-index: 15; box-shadow: 0 0 5px #ef4444; }
        .pop-effect { position: absolute; font-size: 2rem; font-weight: bold; animation: popAnim 0.4s ease-out forwards; z-index: 30; pointer-events: none; }
        @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        .question-panel { position: absolute; bottom: 85px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: center; z-index: 50; }
        .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.2rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; }
        .game-over-screen a, .game-over-screen button { text-decoration: none; display: inline-block; text-align: center; }
    </style>
</head>
<body><div id="root"></div>
<script type="text/babel">
    const { useState, useEffect, useRef, useCallback } = React;
    const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

    function App() {
        const [gameState, setGameState] = useState('start');
        const [score, setScore] = useState(0);
        const [levelIndex, setLevelIndex] = useState(0);
        const [balloons, setBalloons] = useState([]);
        const [projectiles, setProjectiles] = useState([]);
        const [effects, setEffects] = useState([]);
        const [angle, setAngle] = useState(0);
        const [cloudStyles, setCloudStyles] = useState([]);

        const requestRef = useRef();
        const lastSpawnTime = useRef(0);
        const gameAreaRef = useRef();

        const LEVELS = JSON.parse('${JSON.stringify(levels)}');
        
        useEffect(() => {
            const styles = [...Array(5)].map((_, i) => ({
                top: `${10 + i * 18}%`,
                width: `${80 + i * 15}px`,
                height: `${30 + i * 8}px`,
                animationDuration: `${15 + i * 5}s`,
                animationDelay: `-${i * 5}s`,
                opacity: Math.random() * 0.3 + 0.3,
                left: `${Math.random() * 100}vw`
            }));
            setCloudStyles(styles);
        }, []);

        const startGame = () => {
            setScore(0); setLevelIndex(0); setBalloons([]); setProjectiles([]); setEffects([]);
            setGameState('playing');
            lastSpawnTime.current = 0;
            window.parent.postMessage({ type: 'GAME_STATE_CHANGE', payload: { gameState: 'playing', score: 0 } }, '*');
        };

        const handleRestart = () => {
            setGameState('start');
        }

        const addEffect = (x, y, text, color) => {
            const id = Date.now() + Math.random();
            setEffects(prev => [...prev, { id, x, y, text, color }]);
            setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
        };
        
        const handleCorrectHit = (x, y) => {
            setScore(s => s + 10);
            addEffect(x, y, "+10", "#22c55e");
            setTimeout(() => {
                setLevelIndex(prev => {
                    const nextIndex = prev + 1;
                    if (nextIndex >= LEVELS.length) {
                        setGameState('gameover');
                        return prev;
                    }
                    return nextIndex;
                });
                setBalloons(prev => prev.filter(b => !b.isCorrect));
            }, 500);
        };

        const handleWrongHit = (x, y) => {
            setScore(s => Math.max(0, s - 5));
            addEffect(x, y, "-5", "#ef4444");
        };

        const updateGame = useCallback((time) => {
            if (gameStateRef.current !== 'playing') {
                requestRef.current = requestAnimationFrame(updateGame);
                return;
            }
            
            const currentLevel = LEVELS[levelIndex];
            if (!currentLevel) {
                 if (levelIndex > 0) { // If we've completed at least one level
                     setGameState('gameover');
                 }
                 requestRef.current = requestAnimationFrame(updateGame);
                 return;
            }

            if (time - lastSpawnTime.current > 1500) {
                const isCorrect = Math.random() > 0.6;
                const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                const newBalloon = { id: Date.now() + Math.random(), x: Math.random() * (window.innerWidth - 80) + 40, y: window.innerHeight + 50, text: text, speed: Math.random() * 1 + 1, color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)], isCorrect: text === currentLevel.a };
                setBalloons(prev => [...prev, newBalloon]);
                lastSpawnTime.current = time;
            }

            setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150));
            setProjectiles(prev => prev.map(p => ({ ...p, x: p.x + Math.sin(p.angle * Math.PI / 180) * 10, y: p.y - Math.cos(p.angle * Math.PI / 180) * 10 })).filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0 && p.y < window.innerHeight));

            setProjectiles(currentProjectiles => {
                let nextProjectiles = [...currentProjectiles];
                setBalloons(currentBalloons => {
                    let nextBalloons = [...currentBalloons];
                    for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                        const p = nextProjectiles[pIdx];
                        let hit = false;
                        for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                            const b = nextBalloons[bIdx];
                            const dx = p.x - b.x; const dy = p.y - b.y; const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < 40) {
                                nextBalloons.splice(bIdx, 1);
                                if (b.isCorrect) handleCorrectHit(b.x, b.y);
                                else handleWrongHit(b.x, b.y);
                                hit = true;
                                break;
                            }
                        }
                        if (hit) nextProjectiles.splice(pIdx, 1);
                    }
                    return nextBalloons;
                });
                return nextProjectiles;
            });
            requestRef.current = requestAnimationFrame(updateGame);
        }, [levelIndex, LEVELS]);
        
        const gameStateRef = useRef();
        useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

         useEffect(() => {
            if (gameState === 'playing') {
                requestRef.current = requestAnimationFrame(updateGame);
            }
             return () => {
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                if (gameState === 'playing' || gameState === 'gameover') {
                    window.parent.postMessage({ type: 'GAME_STATE_CHANGE', payload: { gameState: 'gameover', score } }, '*');
                }
            };
        }, [gameState, updateGame, score]);

        const handleInput = (e) => {
            if (gameState !== 'playing') return;
            const centerX = window.innerWidth / 2; const centerY = window.innerHeight - 80;
            const clientX = e.clientX || (e.touches && e.touches[0].clientX); const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            if (!clientX) return;
            const dx = clientX - centerX; const dy = clientY - centerY; const rad = Math.atan2(dx, -dy); const deg = rad * (180 / Math.PI);
            const clampedAngle = Math.max(-70, Math.min(70, deg));
            setAngle(clampedAngle);
            if (e.type === 'mousedown' || e.type === 'touchstart') shoot(clampedAngle);
        };
        const shoot = (fireAngle) => {
            const radian = fireAngle * Math.PI / 180;
            const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
            const startY = window.innerHeight - 80 - Math.cos(radian) * 60;
            setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
        };

        return (
            <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
                {cloudStyles.map((style, i) => <div key={i} className="cloud" style={style} />)}
                <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">Puan: {score}</div>
                {gameState === 'playing' && (
                    <>
                        {balloons.map(b => <div key={b.id} className="balloon" style={{ left: b.x, top: b.y, backgroundColor: b.color, borderColor: b.color }}>{b.text}</div>)}
                        {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}
                        {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}
                        <div className="shooter-base"></div>
                        <div className="shooter" style={{ transform: 'translateX(-50%) rotate(' + angle + 'deg)' }}><div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div></div>
                        <div className="question-panel">
                            <div className="question-box animate-[bounce_2s_infinite]">
                                <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                                {LEVELS[levelIndex % LEVELS.length]?.q}
                            </div>
                        </div>
                    </>
                )}
                {gameState === 'start' && (
                    <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-sky-500">
                            <h1 className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</h1>
                            <p className="text-gray-600 mb-8 text-lg">Aşağıdaki soruyu oku.<br/>Doğru cevabı taşıyan balonu vur!</p>
                            <button onClick={startGame} className="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg">BAŞLA</button>
                        </div>
                    </div>
                )}
                {gameState === 'gameover' && (
                     <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm game-over-screen">
                        <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-red-500">
                            <h1 className="text-4xl font-bold text-red-600 mb-2 header-font">Oyun Bitti!</h1>
                            <p className="text-gray-600 mb-6 text-lg">Toplam Puanın: <strong className="text-2xl text-red-700">{score}</strong></p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                 <button onClick={handleRestart} className="flex-1 px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-full text-lg transition-transform hover:scale-105 shadow-lg">Tekrar Oyna</button>
                                 <a href="/student/activities" className="flex-1 px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-full text-lg transition-transform hover:scale-105 shadow-lg">Ana Menü</a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
</script>
</body>
</html>
    `;

    return (
        <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
            <iframe
                srcDoc={htmlContent}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Balon Avcısı"
                sandbox="allow-scripts allow-same-origin"
            />
        </div>
    );
}

export default function BalonAvcisiPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <BalloonHuntGame />
        </Suspense>
    );
}
