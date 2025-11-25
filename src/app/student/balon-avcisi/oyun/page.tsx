
'use client';

import { Suspense, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getBalloonHuntQuestions, submitBalloonHuntScore } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

function BalloonHuntGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const topicId = searchParams.get('topicId');
    const topicName = searchParams.get('topicName') || 'Genel'; // Fix: Define topicName

    const gameHtml = useMemo(() => {
        // This function will be stringified and injected into the iframe.
        // It cannot use any external scope variables directly except for what's passed in.
        const gameLogic = (LEVELS, BALLOON_COLORS, postMessage) => {
            const { useState, useEffect, useRef, useCallback } = React;

            function App() {
                const [gameState, setGameState] = useState('start'); // start, playing, gameover
                const [score, setScore] = useState(0);
                const [lives, setLives] = useState(3);
                const [levelIndex, setLevelIndex] = useState(0);
                const [balloons, setBalloons] = useState([]);
                const [projectiles, setProjectiles] = useState([]);
                const [effects, setEffects] = useState([]);
                const [angle, setAngle] = useState(0);

                const requestRef = useRef();
                const lastSpawnTime = useRef(0);

                const startGame = () => {
                    setScore(0);
                    setLevelIndex(0);
                    setLives(3);
                    setBalloons([]);
                    setProjectiles([]);
                    setEffects([]);
                    setGameState('playing');
                    lastSpawnTime.current = 0;
                };
                
                const endGame = () => {
                    setGameState('gameover');
                };

                const createBalloon = () => {
                    const currentLevel = LEVELS[levelIndex % LEVELS.length];
                    const isCorrect = Math.random() > 0.6;
                    const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                    
                    return {
                        id: Date.now() + Math.random(),
                        x: Math.random() * (window.innerWidth - 80) + 40,
                        y: window.innerHeight + 100,
                        text: text,
                        speed: Math.random() * 1 + 1.5,
                        color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                        isCorrect: text === currentLevel.a
                    };
                };

                const handleCorrectHit = (x, y) => {
                    setScore(s => s + 10);
                    addEffect(x, y, "+10", "#22c55e");
                    setTimeout(() => {
                        setLevelIndex(prev => (prev + 1));
                        setBalloons(prev => prev.filter(b => !b.isCorrect)); 
                    }, 500);
                };

                const handleWrongHit = (x, y) => {
                    addEffect(x, y, "❤️ -1", "#ef4444");
                    setLives(l => {
                        const newLives = l - 1;
                        if (newLives <= 0) {
                            setTimeout(endGame, 1000);
                        }
                        return newLives;
                    });
                };
                
                const addEffect = (x, y, text, color) => {
                    const id = Date.now() + Math.random();
                    setEffects(prev => [...prev, { id, x, y, text, color }]);
                    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 600);
                };


                const updateGame = useCallback((time) => {
                    if (gameState !== 'playing') return;

                    if (time - lastSpawnTime.current > 1200) {
                        setBalloons(prev => [...prev, createBalloon()]);
                        lastSpawnTime.current = time;
                    }

                    setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150));
                    setProjectiles(prev => prev.map(p => ({
                        ...p,
                        x: p.x + Math.sin(p.angle * Math.PI / 180) * 12,
                        y: p.y - Math.cos(p.angle * Math.PI / 180) * 12
                    })).filter(p => p.x > -10 && p.x < window.innerWidth + 10 && p.y > -10 && p.y < window.innerHeight + 10));

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
                                    if (Math.sqrt(dx * dx + dy * dy) < 45) {
                                        nextProjectiles.splice(pIdx, 1);
                                        nextBalloons.splice(bIdx, 1);
                                        if (b.isCorrect) handleCorrectHit(b.x, b.y);
                                        else handleWrongHit(b.x, b.y);
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
                }, [gameState, levelIndex, handleCorrectHit, handleWrongHit]);

                 useEffect(() => {
                    if (gameState === 'playing') {
                        requestRef.current = requestAnimationFrame(updateGame);
                        return () => cancelAnimationFrame(requestRef.current);
                    }
                }, [gameState, updateGame]);

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
                    const startY = window.innerHeight - Math.cos(radian) * 60;
                    setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
                };

                return (
                    <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
                        {/* UI Elements */}
                         <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/50 px-3 py-1 rounded-full z-50">
                            {[...Array(3)].map((_, i) => (
                                <span key={i} className={`text-2xl transition-opacity ${i < lives ? 'opacity-100' : 'opacity-20'}`}>❤️</span>
                            ))}
                        </div>
                        <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                            Puan: {score}
                        </div>

                        {/* Game Objects */}
                        {balloons.map(b => <div key={b.id} className="balloon" style={{ left: b.x, top: b.y, backgroundColor: b.color, borderColor: b.color }}>{b.text}</div>)}
                        {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}
                        {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}

                        {/* Shooter */}
                        <div className="shooter-base"></div>
                        <div className="shooter" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}>
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                        </div>

                        {/* Question Panel */}
                        {gameState === 'playing' && (
                            <div className="question-panel">
                                <div className="question-box animate-[bounce_2s_infinite]">
                                    <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                                    {LEVELS[levelIndex % LEVELS.length].q}
                                </div>
                            </div>
                        )}
                        
                        {/* Start Screen */}
                        {gameState === 'start' && (
                             <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm">
                                <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-sky-500">
                                    <h1 className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</h1>
                                    <p className="text-gray-600 mb-8 text-lg">
                                        Aşağıdaki soruyu oku.<br/>
                                        Doğru cevabı taşıyan balonu vur! Yanlışlar can götürür.
                                    </p>
                                    <button onClick={startGame} className="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg">BAŞLA</button>
                                </div>
                            </div>
                        )}

                        {/* Game Over Screen */}
                        {gameState === 'gameover' && (
                            <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center z-50 backdrop-blur-sm">
                                <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-red-500">
                                    <h1 className="text-4xl font-bold text-red-600 mb-2 header-font">Oyun Bitti!</h1>
                                    <p className="text-gray-700 text-2xl font-bold">Puan: {score}</p>
                                    <div className="mt-8 flex justify-center gap-4">
                                        <button onClick={startGame} className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600">Tekrar Oyna</button>
                                        <button onClick={() => postMessage({ type: 'GAME_OVER', payload: { score } })} className="px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300">Çıkış</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<App />);
        };

        const levelsData = JSON.stringify(LEVELS);
        const colorsData = JSON.stringify(BALLOON_COLORS);

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
                <style>
                    body { font-family: sans-serif; overflow: hidden; margin: 0; padding: 0; background-color: #e0f2fe; touch-action: none; user-select: none; }
                    #game-canvas { width: 100vw; height: 100vh; position: relative; background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%); cursor: crosshair; }
                    .cloud { position: absolute; background: white; border-radius: 50%; opacity: 0.8; animation: floatCloud linear infinite; }
                    @keyframes floatCloud { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }
                    .balloon { position: absolute; width: 70px; height: 85px; border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; font-size: 0.85rem; line-height: 1; box-shadow: inset -5px -5px 10px rgba(0,0,0,0.1); transition: transform 0.1s; z-index: 10; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
                    .balloon::after { content: ''; position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); width: 2px; height: 20px; background: rgba(0,0,0,0.3); }
                    .balloon::before { content: ''; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 6px; height: 4px; border-radius: 2px; }
                    .shooter { position: absolute; bottom: 20px; left: 50%; transform-origin: center bottom; width: 6px; height: 60px; background: #475569; z-index: 20; border-radius: 3px; }
                    .shooter-base { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 30px; background: #1e293b; border-radius: 30px 30px 0 0; z-index: 19; }
                    .projectile { position: absolute; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; z-index: 15; box-shadow: 0 0 5px #ef4444; }
                    .pop-effect { position: absolute; font-size: 2rem; font-weight: bold; animation: popAnim 0.6s ease-out forwards; z-index: 30; pointer-events: none; }
                    @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
                    .question-panel { position: absolute; bottom: 20px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: center; z-index: 50; }
                    .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.2rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; animation: bounce_2s_infinite 2s infinite; }
                    @keyframes bounce_2s_infinite { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script type="text/babel">
                    (${gameLogic.toString()})(${levelsData}, ${colorsData}, window.parent.postMessage);
                </script>
            </body>
            </html>
        `;
    }, []);

    const [iframeKey, setIframeKey] = useState(Date.now());
    
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data.type === 'GAME_OVER') {
                const { score } = event.data.payload;
                if (user && score > 0) {
                    submitBalloonHuntScore(user.uid, score, `Balon Avcısı - ${topicName}`)
                        .then(result => {
                            if (result.success) {
                                toast({ title: "Puanın Kaydedildi!", description: `${score} puan kazandın.` });
                            } else {
                                toast({ title: "Hata", description: result.error, variant: 'destructive' });
                            }
                        });
                }
                router.push('/student/balon-avcisi');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user, topicName, router, toast]);

    const handleRestart = () => {
        setIframeKey(Date.now());
    };

    return (
        <div className="w-screen h-screen">
             <iframe
                key={iframeKey}
                srcDoc={gameHtml}
                title="Balon Avcısı Oyunu"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
            />
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <BalloonHuntGame />
        </Suspense>
    );
}

    