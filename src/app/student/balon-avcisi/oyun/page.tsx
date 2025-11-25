'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBalloonHuntQuestions, submitBalloonHuntScore } from '../actions';
import type { BalloonHuntLevel } from '../actions';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

function BalloonHuntGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [levels, setLevels] = useState<BalloonHuntLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const handleGameEnd = useCallback(async (score: number) => {
        if (score > 0 && user) {
            await submitBalloonHuntScore(user.uid, score, `Balon Avcısı - ${searchParams.get('topicName') || 'Genel'}`);
        }
        router.push('/student/activities');
    }, [user, router, searchParams]);

    const gameHtml = useMemo(() => {
        if (levels.length === 0) return '';
        const topicName = searchParams.get('topicName') || 'Genel';
        
        const gameLogicScript = `
            const { useState, useEffect, useRef, useCallback } = React;

            const LEVELS = ${JSON.stringify(levels)};
            const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

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
                
                const postScoreAndExit = () => {
                    window.parent.postMessage({ type: 'GAME_END', score: score }, '*');
                };

                const startGame = () => {
                    setScore(0);
                    setLives(3);
                    setLevelIndex(0);
                    setBalloons([]);
                    setProjectiles([]);
                    setEffects([]);
                    setGameState('playing');
                    lastSpawnTime.current = 0;
                };

                const updateGame = useCallback((time) => {
                    if (gameState !== 'playing') return;

                    const currentLevel = LEVELS[levelIndex % LEVELS.length];

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

                    setBalloons(prev => prev
                        .map(b => ({ ...b, y: b.y - b.speed }))
                        .filter(b => b.y > -150)
                    );

                    setProjectiles(prev => prev
                        .map(p => ({
                            ...p,
                            x: p.x + Math.sin(p.angle * Math.PI / 180) * 10,
                            y: p.y - Math.cos(p.angle * Math.PI / 180) * 10
                        }))
                        .filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0)
                    );

                    let newProjectiles = [...projectiles];
                    let newBalloons = [...balloons];
                    let newEffects = [...effects];
                    let scoreChange = 0;
                    let livesChange = 0;

                    for (let pIdx = newProjectiles.length - 1; pIdx >= 0; pIdx--) {
                        const p = newProjectiles[pIdx];
                        let projectileHit = false;
                        for (let bIdx = newBalloons.length - 1; bIdx >= 0; bIdx--) {
                            const b = newBalloons[bIdx];
                            const dx = p.x - b.x;
                            const dy = p.y - b.y;
                            if (Math.sqrt(dx * dx + dy * dy) < 45) {
                                projectileHit = true;
                                if (b.isCorrect) {
                                    scoreChange += 10;
                                    newEffects.push({ id: Date.now() + Math.random(), x: b.x, y: b.y, text: "+10", color: "#22c55e" });
                                } else {
                                    livesChange -= 1;
                                    newEffects.push({ id: Date.now() + Math.random(), x: b.x, y: b.y, text: "X", color: "#ef4444" });
                                }
                                newBalloons.splice(bIdx, 1);
                                break;
                            }
                        }
                        if (projectileHit) {
                            newProjectiles.splice(pIdx, 1);
                        }
                    }

                    if (scoreChange !== 0) setScore(s => s + scoreChange);
                    if (livesChange !== 0) setLives(l => l + livesChange);
                    setProjectiles(newProjectiles);
                    setBalloons(newBalloons);
                    setEffects(newEffects);

                    requestRef.current = requestAnimationFrame(updateGame);
                }, [gameState, levelIndex, balloons, projectiles, effects]);

                useEffect(() => {
                    if (gameState === 'playing') {
                        requestRef.current = requestAnimationFrame(updateGame);
                        return () => cancelAnimationFrame(requestRef.current);
                    }
                }, [gameState, updateGame]);
                
                useEffect(() => {
                    if (lives <= 0) {
                        setGameState('gameover');
                    }
                }, [lives]);

                const addEffect = (x, y, text, color) => {
                    const id = Date.now() + Math.random();
                    setEffects(prev => [...prev, { id, x, y, text, color }]);
                    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
                };

                const handleInput = (e) => {
                    if (gameState !== 'playing') return;
                    e.preventDefault();
                    const centerX = window.innerWidth / 2;
                    const centerY = window.innerHeight - 20;
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

                const shoot = (fireAngle) => {
                    const radian = fireAngle * Math.PI / 180;
                    const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
                    const startY = window.innerHeight - 20 - Math.cos(radian) * 60;
                    setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
                };

                const currentLevelData = LEVELS[levelIndex % LEVELS.length];

                return (
                    <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
                        {/* UI */}
                        <div className="absolute top-4 left-4 flex gap-2 z-50">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className={'h-6 w-6 transition-all ' + (i < lives ? 'text-red-500' : 'text-gray-300')}>❤️</div>
                            ))}
                        </div>
                        <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                            Puan: {score}
                        </div>
                        
                        {/* Scenery */}
                        <div className="cloud" style={{ top: '10%', width: '100px', height: '40px', animationDuration: '20s' }}></div>
                        <div className="cloud" style={{ top: '20%', left: '60%', width: '120px', height: '50px', animationDuration: '15s' }}></div>

                        {/* Game Objects */}
                        {balloons.map(b => (
                            <div key={b.id} className="balloon" style={{ left: b.x, top: b.y, backgroundColor: b.color, borderColor: b.color }}>
                                {b.text}
                            </div>
                        ))}
                        {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}
                        {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}
                        
                        {/* Player */}
                        <div className="shooter-base"></div>
                        <div className="shooter" style={{ transform: 'translateX(-50%) rotate('+angle+'deg)' }}>
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                        </div>

                        {/* Panels */}
                        {gameState === 'playing' && (
                            <div className="question-panel">
                                <div className="question-box">
                                    <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                                    {currentLevelData.q}
                                </div>
                            </div>
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
                             <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center z-50 backdrop-blur-sm">
                                <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-red-500">
                                    <h1 className="text-4xl font-bold text-red-600 mb-4 header-font">Oyun Bitti!</h1>
                                    <p className="text-gray-600 mb-2 text-xl">Toplam Puanın:</p>
                                    <p className="text-5xl font-bold text-gray-800 mb-8">{score}</p>
                                    <div className="flex gap-4">
                                        <button onClick={startGame} className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full text-lg transition-transform hover:scale-105 shadow-lg">Tekrar Oyna</button>
                                        <button onClick={postScoreAndExit} className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-full text-lg transition-transform hover:scale-105 shadow-lg">Puanı Kaydet ve Çık</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<App />);
        `;

        return `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>Balon Avcısı: ${topicName}</title>
                <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
                <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
                <script src="https://cdn.tailwindcss.com"><\/script>
                <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Nunito:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body, html { margin: 0; padding: 0; overflow: hidden; height: 100%; }
                    .header-font { font-family: 'Fredoka', sans-serif; }
                    #game-canvas { width: 100vw; height: 100vh; position: relative; background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%); cursor: crosshair; }
                    .cloud { position: absolute; background: white; border-radius: 50%; opacity: 0.8; animation: floatCloud linear infinite; }
                    .cloud::after, .cloud::before { content: ''; position: absolute; background: white; border-radius: 50%; }
                    @keyframes floatCloud { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }
                    .balloon { position: absolute; width: 80px; height: 95px; border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; font-size: 1rem; line-height: 1; box-shadow: inset -5px -5px 10px rgba(0,0,0,0.1); transition: transform 0.1s; z-index: 10; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); padding: 5px; }
                    .balloon::after { content: ''; position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); width: 2px; height: 20px; background: rgba(0,0,0,0.3); }
                    .balloon::before { content: ''; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 6px; height: 4px; background: inherit; border-radius: 2px; }
                    .shooter { position: absolute; bottom: 20px; left: 50%; transform-origin: center bottom; width: 8px; height: 70px; background: #475569; z-index: 20; border-radius: 4px; }
                    .shooter-base { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 80px; height: 40px; background: #1e293b; border-radius: 40px 40px 0 0; z-index: 19; }
                    .projectile { position: absolute; width: 12px; height: 12px; background: #ef4444; border-radius: 50%; z-index: 15; box-shadow: 0 0 8px #ef4444; }
                    .pop-effect { position: absolute; font-size: 2.5rem; font-weight: bold; animation: popAnim 0.4s ease-out forwards; z-index: 30; pointer-events: none; }
                    @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
                    .question-panel { position: absolute; bottom: 20px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: center; z-index: 50; }
                    .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.5rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; }
                </style>
            </head>
            <body><div id="root"></div><script type="text/babel">${gameLogicScript}<\/script></body>
            </html>
        `;
    }, [levels, handleGameEnd, searchParams]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'GAME_END') {
                handleGameEnd(event.data.score);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleGameEnd]);
    
    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="flex h-screen w-full items-center justify-center text-red-500">{error}</div>;
    }

    return (
          <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <iframe
                srcDoc={gameHtml}
                style={{ border: 'none', width: '100%', height: '100%' }}
                title="Balon Avcısı Oyunu"
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
