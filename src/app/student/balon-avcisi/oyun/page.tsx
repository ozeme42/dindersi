
'use client';

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBalloonHuntQuestions, submitBalloonHuntScore } from '../actions';
import { useAuth } from '@/context/auth-context';
import type { BalloonHuntLevel } from '../actions';

function BalloonHuntGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [levels, setLevels] = useState<BalloonHuntLevel[]>([]);
    const [error, setError] = useState<string | null>(null);

    // This state will be managed inside the iframe's script
    const gameHtml = useMemo(() => {
        if (levels.length === 0) return '';
        const topicName = searchParams.get('topicName') || 'Genel';
        
        // Serialize data to be safely passed into the script tag
        const levelsJson = JSON.stringify(levels);
        const gameContext = `Balon Avcısı - ${topicName}`;

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
                    #game-canvas { width: 100vw; height: 100vh; position: relative; background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%); cursor: crosshair; }
                    .cloud { position: absolute; background: white; border-radius: 50%; opacity: 0.8; animation: floatCloud linear infinite; }
                    .cloud::after, .cloud::before { content: ''; position: absolute; background: white; border-radius: 50%; }
                    @keyframes floatCloud { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }
                    .balloon { position: absolute; width: 80px; height: 100px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; font-size: 0.85rem; line-height: 1; z-index: 10; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
                    .shooter { position: absolute; bottom: 20px; left: 50%; transform-origin: center bottom; width: 6px; height: 60px; background: #475569; z-index: 20; border-radius: 3px; }
                    .shooter-base { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 30px; background: #1e293b; border-radius: 30px 30px 0 0; z-index: 19; }
                    .projectile { position: absolute; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; z-index: 15; box-shadow: 0 0 5px #ef4444; }
                    .pop-effect { position: absolute; font-size: 2rem; font-weight: bold; animation: popAnim 0.4s ease-out forwards; z-index: 30; pointer-events: none; }
                    @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
                    .question-panel { position: absolute; bottom: 20px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: center; z-index: 50; }
                    .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.2rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; }
                    .life-heart { width: 24px; height: 24px; transition: all 0.3s; }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script type="text/babel">
                    const { useState, useEffect, useRef, useCallback } = React;

                    const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
                    const INITIAL_LIVES = 3;

                    function App() {
                        const [gameState, setGameState] = useState('start');
                        const [score, setScore] = useState(0);
                        const [lives, setLives] = useState(INITIAL_LIVES);
                        const [levelIndex, setLevelIndex] = useState(0);
                        const [balloons, setBalloons] = useState([]);
                        const [projectiles, setProjectiles] = useState([]);
                        const [effects, setEffects] = useState([]);
                        const [angle, setAngle] = useState(0);
                        const requestRef = useRef();
                        const lastSpawnTime = useRef(0);
                        const LEVELS = JSON.parse('${levelsJson}');

                        const startGame = () => {
                            setScore(0);
                            setLives(INITIAL_LIVES);
                            setLevelIndex(0);
                            setBalloons([]);
                            setProjectiles([]);
                            setEffects([]);
                            setGameState('playing');
                            lastSpawnTime.current = 0;
                        };

                        const handleCorrectHit = (x, y) => {
                            setScore(s => s + 10);
                            addEffect(x, y, "+10", "#22c55e");
                            setTimeout(() => {
                                setLevelIndex(prev => (prev + 1) % LEVELS.length);
                                setBalloons(prev => prev.filter(b => !b.isCorrect)); 
                            }, 500);
                        };

                        const handleWrongHit = (x, y) => {
                            addEffect(x, y, "💥", "#ef4444");
                            setLives(prevLives => {
                                const newLives = prevLives - 1;
                                if (newLives <= 0) {
                                    setGameState('gameover');
                                }
                                return newLives;
                            });
                        };

                        const addEffect = (x, y, text, color) => {
                            const id = Date.now() + Math.random();
                            setEffects(prev => [...prev, { id, x, y, text, color }]);
                            setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
                        };
                        
                        const createBalloon = () => {
                            const currentLevel = LEVELS[levelIndex % LEVELS.length];
                            if (!currentLevel) return;

                            const isCorrect = Math.random() > 0.6;
                            const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                            
                            const newBalloon = {
                                id: Date.now() + Math.random(),
                                x: Math.random() * (window.innerWidth - 80) + 40,
                                y: window.innerHeight + 100, // Start below screen
                                text: text,
                                speed: Math.random() * 1.5 + 1,
                                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                                isCorrect: text === currentLevel.a
                            };
                            setBalloons(prev => [...prev, newBalloon]);
                        };


                        const updateGame = useCallback((time) => {
                            if (gameState !== 'playing') return;

                            if (time - lastSpawnTime.current > 1500) {
                                createBalloon();
                                lastSpawnTime.current = time;
                            }

                            setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150));
                            setProjectiles(prev => prev.map(p => ({
                                ...p,
                                x: p.x + Math.sin(p.angle * Math.PI / 180) * 10,
                                y: p.y - Math.cos(p.angle * Math.PI / 180) * 10
                            })).filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0));

                            let newBalloons = [...balloons];
                            let newProjectiles = [...projectiles];
                            let hitOccurred = false;

                            for (let pIdx = newProjectiles.length - 1; pIdx >= 0; pIdx--) {
                                for (let bIdx = newBalloons.length - 1; bIdx >= 0; bIdx--) {
                                    const p = newProjectiles[pIdx];
                                    const b = newBalloons[bIdx];
                                    if (Math.sqrt(Math.pow(p.x - b.x, 2) + Math.pow(p.y - b.y, 2)) < 50) {
                                        if (b.isCorrect) handleCorrectHit(b.x, b.y);
                                        else handleWrongHit(b.x, b.y);
                                        
                                        newProjectiles.splice(pIdx, 1);
                                        newBalloons.splice(bIdx, 1);
                                        hitOccurred = true;
                                        break; 
                                    }
                                }
                                if(hitOccurred && newProjectiles.length <= pIdx) break; 
                            }
                            
                            if(hitOccurred) {
                                setBalloons(newBalloons);
                                setProjectiles(newProjectiles);
                            }

                            requestRef.current = requestAnimationFrame(updateGame);
                        }, [gameState, levelIndex, balloons, projectiles]);


                        useEffect(() => {
                            requestRef.current = requestAnimationFrame(updateGame);
                            return () => cancelAnimationFrame(requestRef.current);
                        }, [updateGame]);

                        const handleInput = (e) => {
                            if (gameState !== 'playing') return;
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
                        
                        const withdrawAndSave = () => {
                             window.parent.postMessage({ type: 'SAVE_SCORE', score: score, context: '${gameContext}' }, '*');
                             window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
                        }

                        return (
                            <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput} >
                                <div className="cloud" style={{ top: '10%', width: '100px', height: '40px', animationDuration: '20s' }}></div>
                                <div className="cloud" style={{ top: '20%', left: '60%', width: '120px', height: '50px', animationDuration: '15s' }}></div>
                                <div className="cloud" style={{ top: '5%', left: '80%', width: '80px', height: '30px', animationDuration: '25s' }}></div>
                                
                                <div className="absolute top-4 left-4 flex gap-2 z-50">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className={'life-heart'}>
                                            <svg viewBox="0 0 24 24" className={'w-full h-full ' + (i < lives ? 'text-red-500 fill-current' : 'text-gray-300 fill-current')}>
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">Puan: {score}</div>
                                
                                {balloons.map(b => (
                                    <div key={b.id} className="balloon" style={{ left: b.x, top: b.y }}>
                                        <svg style={{position:'absolute', zIndex:-1, width:'100%', height:'100%'}} viewBox="0 0 100 125">
                                          <defs>
                                            <radialGradient id={'grad' + b.id} cx="30%" cy="30%" r="70%">
                                              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                                              <stop offset="100%" stopColor={b.color} />
                                            </radialGradient>
                                          </defs>
                                          <path d="M50,0C12.5,0,0,12.5,0,50c0,12.5,12.5,25,25,25c12.5,0,25,12.5,25,25s12.5,25,25,25s25-12.5,25-25s12.5-25,25-25S100,37.5,100,25S87.5,0,50,0Z" fill={'url(#grad' + b.id + ')'} />
                                        </svg>
                                        <span style={{padding: '5px'}}>{b.text}</span>
                                    </div>
                                ))}
                                {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}
                                {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}
                                <div className="shooter-base"></div>
                                <div className="shooter" style={{ transform: 'translateX(-50%) rotate(' + angle + 'deg)' }}>
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                                </div>
                                {gameState === 'playing' && (
                                    <div className="question-panel">
                                        <div className="question-box animate-[bounce_2s_infinite]">
                                            <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                                            {LEVELS[levelIndex % LEVELS.length].q}
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
                                            <p className="text-gray-800 text-2xl mb-2 font-bold">Puanın: {score}</p>
                                            <p className="text-gray-600 mb-8 text-lg">Tekrar denemek ister misin?</p>
                                            <div className="flex justify-center gap-4">
                                                <button onClick={startGame} className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-full text-lg transition-transform hover:scale-105 shadow-md">Tekrar Oyna</button>
                                                <button onClick={withdrawAndSave} className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-full text-lg transition-colors shadow-md">Çık</button>
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
    }, [levels, searchParams]);

    useEffect(() => {
        getBalloonHuntQuestions({ topicId: searchParams.get('topicId') || undefined })
            .then(result => {
                if (result.error || !result.levels || result.levels.length === 0) {
                    setError(result.error || "Bu konu için oyun verisi bulunamadı.");
                } else {
                    setLevels(result.levels);
                }
            })
            .catch(err => {
                setError("Oyun verileri yüklenirken bir hata oluştu.");
                console.error(err);
            });
    }, [searchParams]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'SAVE_SCORE' && user) {
                submitBalloonHuntScore(user.uid, event.data.score, event.data.context);
            } else if (event.data.type === 'CLOSE_GAME') {
                // Navigate back or close modal, depending on implementation
                window.history.back(); // Simple back navigation
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user]);

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                 <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                    <strong className="font-bold">Hata! </strong>
                    <span className="block sm:inline">{error}</span>
                     <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/student/balon-avcisi"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    
    if (levels.length === 0) {
         return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
          <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            <iframe
                srcDoc={gameHtml}
                style={{ border: 'none', width: '100%', height: '100%' }}
                title="Balon Avcısı Oyunu"
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
