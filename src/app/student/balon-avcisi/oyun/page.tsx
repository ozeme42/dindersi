'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBalloonHuntQuestions, submitBalloonHuntScore } from '../actions';
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";
import type { BalloonLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function BalloonHuntGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [levels, setLevels] = useState<BalloonLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const topicId = searchParams.get('topicId') || undefined;

    useEffect(() => {
        getBalloonHuntQuestions({ topicId })
            .then(result => {
                if (result.error || !result.levels || result.levels.length === 0) {
                    setError(result.error || "Bu konu için oyun verisi bulunamadı.");
                } else {
                    setLevels(result.levels);
                }
            })
            .finally(() => setIsLoading(false));
    }, [topicId]);

    const gameHtml = useMemo(() => {
        if (levels.length === 0) return '';
        const topicName = searchParams.get('topicName') || 'Genel';
        
        // This function will be stringified and embedded in the iframe
        const postScoreAndExit = () => {
            const finalScore = window.gameScore || 0; // Access score from window
            if (finalScore > 0) {
                window.parent.postMessage({
                    type: 'SAVE_SCORE_AND_EXIT',
                    payload: {
                        score: finalScore,
                        context: `Balon Avcısı - ${topicName}`
                    }
                }, '*');
            } else {
                 window.parent.postMessage({ type: 'EXIT_GAME' }, '*');
            }
        };

        const html = `
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
                    .projectile { position: absolute; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; z-index: 15; box-shadow: 0 0 5px #ef4444; }
                    .pop-effect { position: absolute; font-size: 2rem; font-weight: bold; animation: popAnim 0.4s ease-out forwards; z-index: 30; pointer-events: none; }
                    @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
                    .shooter { position: absolute; bottom: 20px; left: 50%; transform-origin: center bottom; width: 6px; height: 60px; background: #475569; z-index: 20; border-radius: 3px; }
                    .shooter-base { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 30px; background: #1e293b; border-radius: 30px 30px 0 0; z-index: 19; }
                    .question-panel { position: absolute; bottom: 20px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: center; z-index: 50; }
                    .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.2rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; }
                </style>
            </head>
            <body> <div id="root"></div>
                <script type="text/babel">
                    const { useState, useEffect, useRef, useCallback } = React;
                    const LEVELS = ${JSON.stringify(levels)};
                    const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
                    
                    window.postScoreAndExit = ${postScoreAndExit.toString()};

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
                            
                            // Create Balloon
                            const createBalloon = () => {
                                const isCorrect = Math.random() > 0.7;
                                const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                                const newBalloon = {
                                    id: Date.now() + Math.random(),
                                    x: Math.random() * (window.innerWidth - 80) + 40,
                                    y: window.innerHeight + 50,
                                    text: text,
                                    speed: Math.random() * 1.5 + 1.5,
                                    color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                                    isCorrect: text === currentLevel.a
                                };
                                setBalloons(prev => [...prev, newBalloon]);
                                lastSpawnTime.current = time;
                            };
                            
                            if (time - lastSpawnTime.current > 1200) {
                                createBalloon();
                            }

                            // Update positions
                            setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150));
                            setProjectiles(prev => prev.map(p => ({ ...p, x: p.x + Math.sin(p.angle * Math.PI / 180) * 10, y: p.y - Math.cos(p.angle * Math.PI / 180) * 10 })).filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0));

                            // Collision detection
                            setProjectiles(currentProjectiles => {
                                let nextProjectiles = [...currentProjectiles];
                                setBalloons(currentBalloons => {
                                    let nextBalloons = [...currentBalloons];
                                    for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                                        const p = nextProjectiles[pIdx];
                                        for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                                            const b = nextBalloons[bIdx];
                                            const dx = p.x - b.x;
                                            const dy = p.y - b.y;
                                            if (Math.sqrt(dx * dx + dy * dy) < 45) {
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
                        }, [gameState, levelIndex, lives]);
                        
                        useEffect(() => {
                           window.gameScore = score;
                        }, [score]);
                        
                         useEffect(() => {
                            if (lives <= 0) {
                                setGameState('gameover');
                            }
                        }, [lives]);


                        useEffect(() => {
                            requestRef.current = requestAnimationFrame(updateGame);
                            return () => cancelAnimationFrame(requestRef.current);
                        }, [updateGame]);

                        const handleCorrectHit = (x, y) => {
                            setScore(s => s + 10);
                            addEffect(x, y, "+10", "#22c55e");
                            setTimeout(() => {
                                setLevelIndex(prev => (prev + 1) % LEVELS.length);
                                setBalloons(prev => prev.filter(b => !b.isCorrect));
                            }, 500);
                        };

                        const handleWrongHit = (x, y) => {
                            setLives(l => l - 1);
                            addEffect(x, y, "X", "#ef4444");
                        };

                        const addEffect = (x, y, text, color) => {
                            const id = Date.now() + Math.random();
                            setEffects(prev => [...prev, { id, x, y, text, color }]);
                            setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 600);
                        };

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
                        
                        return (
                            <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
                                {/* UI Elements */}
                                <div className="cloud" style={{ top: '10%', width: '100px', height: '40px', animationDuration: '20s' }}></div>
                                <div className="cloud" style={{ top: '20%', left: '60%', width: '120px', height: '50px', animationDuration: '15s' }}></div>
                                <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50">Puan: {score}</div>
                                <div className="absolute top-4 left-4 flex gap-2 z-50">
                                    {Array.from({length: 3}).map((_, i) => (
                                        <div key={i} className={"h-6 w-6 transition-all " + (i < lives ? 'text-red-500' : 'text-gray-300')}>❤️</div>
                                    ))}
                                </div>

                                {/* Game Objects */}
                                {balloons.map(b => (
                                    <div key={b.id} className="balloon" style={{ left: b.x, top: b.y }}>
                                        <svg style={{position:'absolute', zIndex:-1, width:'100%', height:'100%'}} viewBox="0 0 100 125"><defs><radialGradient id={'grad' + b.id} cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="rgba(255,255,255,0.7)"/><stop offset="100%" stopColor={b.color}/></radialGradient></defs><path d="M50,0C12.5,0,0,12.5,0,50c0,12.5,12.5,25,25,25c12.5,0,25,12.5,25,25s12.5,25,25,25s25-12.5,25-25s12.5-25,25-25S100,37.5,100,25S87.5,0,50,0Z" fill={'url(#grad' + b.id + ')'}/></svg>
                                        <span style={{padding: '5px'}}>{b.text}</span>
                                    </div>
                                ))}
                                {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}
                                {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}
                                
                                {/* Player */}
                                <div className="shooter-base"></div>
                                <div className="shooter" style={{ transform: 'translateX(-50%) rotate(' + angle + 'deg)' }}>
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                                </div>
                                
                                {/* Question */}
                                {gameState === 'playing' && <div className="question-panel"><div className="question-box">{LEVELS[levelIndex % LEVELS.length].q}</div></div>}
                                
                                {/* Game State Screens */}
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
                                            <p className="text-gray-600 mb-2 text-xl">Kazandığın Puan:</p>
                                            <p className="text-5xl font-black text-red-600 mb-8">{score}</p>
                                            <div className="flex flex-col gap-3">
                                                <button onClick={startGame} className="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg">TEKRAR OYNA</button>
                                                <button onClick={() => window.postScoreAndExit()} className="px-10 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-full text-lg transition-transform hover:scale-105 shadow">Puanı Kaydet ve Çık</button>
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
        return html;
    }, [levels, searchParams]);

    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data.type === 'SAVE_SCORE_AND_EXIT') {
                if (user) {
                    await submitBalloonHuntScore(user.uid, event.data.payload.score, event.data.payload.context);
                }
                router.push('/student/balon-avcisi');
            } else if (event.data.type === 'EXIT_GAME') {
                 router.push('/student/balon-avcisi');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [user, router]);
    
    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

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
    
    return (
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            <iframe
                srcDoc={gameHtml}
                style={{ border: 'none', width: '100%', height: '100%' }}
                title="Balon Avcısı Oyunu"
                sandbox="allow-scripts"
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
