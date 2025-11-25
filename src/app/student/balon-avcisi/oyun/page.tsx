
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBalloonHuntQuestions, submitBalloonHuntScore } from '../actions';
import type { BalloonHuntLevel } from '../actions';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function BalloonHuntGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const topicName = searchParams.get('topicName');

    const [levels, setLevels] = useState<BalloonHuntLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'GAME_OVER' && user && event.data.score > 0) {
                submitBalloonHuntScore(user.uid, event.data.score, `Balon Avcısı - ${topicName || 'Genel'}`)
                    .then(result => {
                        if (result.success) {
                            toast({ title: 'Skor Kaydedildi', description: `Tebrikler! ${event.data.score} puan kazandın.` });
                        } else {
                            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
                        }
                    }).finally(() => {
                        router.push('/student/activities');
                    });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user, topicName, router, toast]);

    useEffect(() => {
        getBalloonHuntQuestions({ topicId: searchParams.get('topicId') || undefined })
            .then(result => {
                if (result.error || !result.levels || result.levels.length === 0) {
                    setError(result.error || "Bu konu için oyun verisi bulunamadı.");
                } else {
                    setLevels(result.levels);
                }
            })
            .finally(() => setIsLoading(false));
    }, [searchParams]);

    const gameHtml = useMemo(() => {
        const levelsData = JSON.stringify(levels);
        
        return `
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
                    #game-canvas { position: relative; background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%); cursor: crosshair; }
                    .cloud { position: absolute; background: white; border-radius: 50%; opacity: 0.8; animation: floatCloud linear infinite; }
                    .cloud::after, .cloud::before { content: ''; position: absolute; background: white; border-radius: 50%; }
                    @keyframes floatCloud { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }
                    .balloon { position: absolute; width: 70px; height: 85px; border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; font-size: 0.85rem; line-height: 1; box-shadow: inset -5px -5px 10px rgba(0,0,0,0.1); transition: transform 0.1s; z-index: 10; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); animation: pop-in 0.3s ease-out; }
                    .balloon.popped { animation: pop-out 0.3s ease-in forwards; }
                    @keyframes pop-in { from { transform: scale(0); } to { transform: scale(1); } }
                    @keyframes pop-out { from { transform: scale(1); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }
                    .balloon::after { content: ''; position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); width: 2px; height: 20px; background: rgba(0,0,0,0.3); }
                    .balloon::before { content: ''; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 6px; height: 4px; background: inherit; border-radius: 2px; }
                    .shooter { position: absolute; bottom: 20px; left: 50%; transform-origin: center bottom; width: 6px; height: 60px; background: #475569; z-index: 20; border-radius: 3px; }
                    .shooter-base { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 30px; background: #1e293b; border-radius: 30px 30px 0 0; z-index: 19; }
                    .projectile { position: absolute; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; z-index: 15; box-shadow: 0 0 5px #ef4444; }
                    .pop-effect { position: absolute; font-size: 2rem; font-weight: bold; animation: popAnim 0.4s ease-out forwards; z-index: 30; pointer-events: none; }
                    @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
                    .question-panel { position: absolute; bottom: 20px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: center; z-index: 50; }
                    .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.2rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; }
                </style>
            </head>
            <body><div id="root"></div>
            <script type="text/babel">
                const { useState, useEffect, useRef, useCallback } = React;
                const LEVELS = ${levelsData};
                
                function App() {
                    const [gameState, setGameState] = useState('start');
                    const [score, setScore] = useState(0);
                    const [lives, setLives] = useState(3);
                    const [levelIndex, setLevelIndex] = useState(0);
                    const [balloons, setBalloons] = useState([]);
                    const [projectiles, setProjectiles] = useState([]);
                    const [effects, setEffects] = useState([]);
                    const [angle, setAngle] = useState(0);
                    const requestRef = useRef();
                    const lastSpawnTime = useRef(0);
                    
                    const setupGameArea = () => {
                        const gameCanvas = document.getElementById('game-canvas');
                        if (gameCanvas) {
                            gameCanvas.style.width = '100vw';
                            gameCanvas.style.height = window.innerHeight + 'px';
                        }
                    };
                    
                    useEffect(() => {
                        setupGameArea();
                        window.addEventListener('resize', setupGameArea);
                        return () => window.removeEventListener('resize', setupGameArea);
                    }, []);

                    const createBalloon = () => {
                        const currentLevel = LEVELS[levelIndex % LEVELS.length];
                        const isCorrect = Math.random() > 0.6;
                        const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                        
                        return {
                            id: Date.now() + Math.random(),
                            x: Math.random() * (window.innerWidth - 80) + 40,
                            y: window.innerHeight + 50,
                            text: text,
                            speed: Math.random() * 1 + 1,
                            color: '#'+(Math.random()*0xFFFFFF<<0).toString(16).padStart(6,'0'),
                            isCorrect: text === currentLevel.a,
                            popped: false
                        };
                    };
                    
                    const startGame = () => {
                        setScore(0);
                        setLives(3);
                        setLevelIndex(0);
                        setBalloons([createBalloon(), createBalloon(), createBalloon()]);
                        setProjectiles([]);
                        setEffects([]);
                        setGameState('playing');
                        lastSpawnTime.current = 0;
                    };

                    const handleEndGame = () => {
                        setGameState('gameover');
                    };
                    
                    const postScoreAndExit = () => {
                        window.parent.postMessage({ type: 'GAME_OVER', score: score }, '*');
                    };

                    const updateGame = useCallback((time) => {
                        if (gameState !== 'playing') return;

                        if (time - lastSpawnTime.current > 1500) {
                            setBalloons(prev => [...prev, createBalloon()]);
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
                                    for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                                        const b = nextBalloons[bIdx];
                                        if (b.popped) continue;
                                        const dx = p.x - b.x;
                                        const dy = p.y - b.y;
                                        if (Math.sqrt(dx*dx + dy*dy) < 45) {
                                            nextProjectiles.splice(pIdx, 1);
                                            b.popped = true;
                                            if (b.isCorrect) handleCorrectHit(b.x, b.y);
                                            else handleWrongHit(b.x, b.y);
                                            break;
                                        }
                                    }
                                }
                                return nextBalloons.filter(b => !b.popped);
                            });
                            return nextProjectiles;
                        });

                        requestRef.current = requestAnimationFrame(updateGame);
                    }, [gameState, levelIndex]);

                    useEffect(() => {
                        if (gameState === 'playing') {
                            requestRef.current = requestAnimationFrame(updateGame);
                        }
                        return () => cancelAnimationFrame(requestRef.current);
                    }, [gameState, updateGame]);

                    const handleCorrectHit = (x, y) => {
                        setScore(s => s + 10);
                        addEffect(x, y, "+10", "#22c55e");
                        setTimeout(() => {
                            setLevelIndex(prev => (prev + 1) % LEVELS.length);
                            setBalloons(prev => prev.filter(b => !b.isCorrect));
                        }, 500);
                    };

                    const handleWrongHit = (x, y) => {
                        addEffect(x, y, "-1 Can", "#ef4444");
                        setLives(l => {
                            const newLives = l - 1;
                            if (newLives <= 0) handleEndGame();
                            return newLives;
                        });
                    };

                    const addEffect = (x, y, text, color) => {
                        const id = Date.now() + Math.random();
                        setEffects(prev => [...prev, { id, x, y, text, color }]);
                        setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
                    };

                    const handleInput = (e) => {
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
                        const clampedAngle = Math.max(-80, Math.min(80, deg));
                        setAngle(clampedAngle);
                        if (e.type === 'mousedown' || e.type === 'touchstart') {
                            shoot(clampedAngle);
                        }
                    };

                    const shoot = (fireAngle) => {
                        const radian = fireAngle * Math.PI / 180;
                        const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
                        const startY = window.innerHeight - 20 - Math.cos(radian) * 60;
                        setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
                    };

                    const currentLevel = LEVELS[levelIndex % LEVELS.length];

                    return (
                        <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
                            <div className="absolute top-4 left-4 flex gap-2 z-50">{[...Array(3)].map((_, i) => <div key={i} className={\`w-8 h-8 rounded-full \${i < lives ? 'bg-red-500' : 'bg-gray-400'}\`}></div>)}</div>
                            <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">Puan: {score}</div>
                            {balloons.map(b => <div key={b.id} className={\`balloon \${b.popped ? 'popped' : ''}\`} style={{ left: b.x, top: b.y, backgroundColor: b.color, borderColor: b.color }}>{b.text}</div>)}
                            {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}
                            {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}
                            <div className="shooter-base"></div>
                            <div className="shooter" style={{ transform: \`translateX(-50%) rotate(\${angle}deg)\` }}><div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div></div>
                            {gameState === 'playing' && <div className="question-panel"><div className="question-box"><span>HEDEF: </span>{currentLevel.q}</div></div>}
                            {gameState === 'start' && <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm"><div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-sky-500"><h1 className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</h1><p className="text-gray-600 mb-8 text-lg">Aşağıdaki soruyu oku.<br/>Doğru cevabı taşıyan balonu vur!</p><button onClick={startGame} className="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg">BAŞLA</button></div></div>}
                            {gameState === 'gameover' && <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center z-50 backdrop-blur-sm"><div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-red-500"><h1 className="text-4xl font-bold text-red-600 mb-4 header-font">Oyun Bitti!</h1><p className="text-gray-600 mb-2 text-xl">Skorun: <strong className="text-2xl text-black">{score}</strong></p><div className="flex flex-col gap-2 mt-6"><button onClick={startGame} className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-lg">Tekrar Oyna</button><button onClick={postScoreAndExit} className="px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-lg text-lg">Puanı Kaydet ve Çık</button></div></div></div>}
                        </div>
                    );
                }

                const root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(<App />);
            </script>
            </body>
            </html>
        `;
    }, [levels]);

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                    <strong className="font-bold">Hata! </strong>
                    <span className="block sm:inline ml-2">{error}</span>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/student/balon-avcisi"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <iframe
            srcDoc={gameHtml}
            className="w-full h-screen border-0"
            title="Balon Avcısı Oyunu"
        />
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <BalloonHuntGame />
        </Suspense>
    );
}
