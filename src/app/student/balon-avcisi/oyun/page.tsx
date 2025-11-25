
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { submitBalloonHuntScore } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

function BalloonHuntGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const topicId = searchParams.get('topicId');
    const topicName = searchParams.get('topicName');

    // Bu satırı iframe'in dışında bırakarak sunucu tarafında çalışmasını engelliyoruz.
    const gameContext = `Balon Avcısı - ${topicName || 'Genel'}`;

    const iframeContent = `
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
        body, html {
            font-family: 'Nunito', sans-serif;
            background-color: #0ea5e9;
            color: white;
            overflow: hidden;
            touch-action: none;
            user-select: none;
            height: 100%;
            margin: 0;
            padding: 0;
        }
        #root, #game-canvas {
            width: 100%;
            height: 100%;
        }
        .header-font { font-family: 'Fredoka', sans-serif; }
        #game-canvas {
            position: relative;
            background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%);
            cursor: crosshair;
        }
        .cloud {
            position: absolute; background: white; border-radius: 50%;
            opacity: 0.8; animation: floatCloud linear infinite;
        }
        .cloud::after, .cloud::before {
            content: ''; position: absolute; background: white; border-radius: 50%;
        }
        @keyframes floatCloud {
            from { transform: translateX(-200px); }
            to { transform: translateX(120vw); }
        }
        .balloon {
            position: absolute; width: 80px; height: 95px;
            border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
            display: flex; align-items: center; justify-content: center;
            text-align: center; font-weight: bold; font-size: 0.9rem; line-height: 1.1;
            box-shadow: inset -5px -5px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s; will-change: transform;
            z-index: 10; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            padding: 5px;
            animation: floatUp linear;
        }
        @keyframes floatUp {
            from { transform: translateY(0); }
            to { transform: translateY(-120vh); }
        }
        .balloon.popping {
            animation: popEffect 0.3s ease-out forwards;
        }
        @keyframes popEffect {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
        }
        .balloon::after {
            content: ''; position: absolute; bottom: -20px; left: 50%;
            transform: translateX(-50%); width: 2px; height: 20px; background: rgba(0,0,0,0.3);
        }
        .balloon::before {
            content: ''; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
            width: 8px; height: 6px; background: inherit; border-radius: 3px; z-index: 2;
        }
        .shooter {
            position: absolute; bottom: 80px; left: 50%;
            transform-origin: center bottom; width: 8px; height: 70px;
            background: #475569; z-index: 20; border-radius: 4px;
        }
        .shooter-base {
            position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%);
            width: 70px; height: 40px; background: #1e293b; border-radius: 35px 35px 0 0; z-index: 19;
        }
        .projectile {
            position: absolute; width: 12px; height: 12px; background: #ef4444; border-radius: 50%;
            z-index: 15; box-shadow: 0 0 8px #ef4444, 0 0 12px #ef4444;
        }
        .question-panel {
            position: absolute; bottom: 85px; left: 20px; right: 20px;
            pointer-events: none; display: flex; justify-content: center; z-index: 50;
        }
        .question-box {
            background: white; color: #0f172a; padding: 12px 24px; border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.3rem;
            text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto;
            max-width: 90%;
        }
        .fullscreen-btn {
            position: absolute; top: 10px; right: 10px; z-index: 100;
            background: rgba(255,255,255,0.7); border: none; border-radius: 50%;
            width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
            cursor: pointer;
        }
        .lives {
            position: absolute; top: 1rem; left: 1rem; z-index: 50; display: flex; gap: 0.5rem;
        }
        .heart {
            font-size: 2.5rem; transition: all 0.3s ease-out;
        }
        .heart.lost {
            transform: scale(0); opacity: 0;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" data-presets="react,es2015">
        const { useState, useEffect, useRef, useCallback } = React;

        const FullscreenButton = () => {
            const [isFullscreen, setIsFullscreen] = useState(false);

            const toggleFullscreen = () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => console.error(err));
                } else {
                    document.exitFullscreen();
                }
            };
            
            useEffect(() => {
                const handler = () => setIsFullscreen(!!document.fullscreenElement);
                document.addEventListener('fullscreenchange', handler);
                return () => document.removeEventListener('fullscreenchange', handler);
            }, []);

            return (
                <button onClick={toggleFullscreen} className="fullscreen-btn">
                     {isFullscreen ? 
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg> :
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                     }
                </button>
            )
        }

        function App({ levels }) {
            const [gameState, setGameState] = useState('start');
            const [score, setScore] = useState(0);
            const [levelIndex, setLevelIndex] = useState(0);
            const [balloons, setBalloons] = useState([]);
            const [projectiles, setProjectiles] = useState([]);
            const [angle, setAngle] = useState(0);
            const [lives, setLives] = useState(3);
            const [poppedBalloons, setPoppedBalloons] = useState(new Set());

            const requestRef = useRef();
            const gameLoopTimeoutRef = useRef();

            const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
            
            const handleGameEnd = () => {
                setGameState('gameover');
                 if (window.parent) {
                    window.parent.postMessage({ type: 'GAME_OVER', score: score, context: gameContext }, '*');
                }
            };
            
            const startGame = () => {
                setScore(0);
                setLevelIndex(0);
                setBalloons([]);
                setProjectiles([]);
                setPoppedBalloons(new Set());
                setLives(3);
                setGameState('playing');
            };

            const handleCorrectHit = (balloon) => {
                setScore(s => s + 10);
                setPoppedBalloons(prev => new Set(prev).add(balloon.id));
                 setTimeout(() => {
                    setBalloons(prev => prev.filter(b => b.id !== balloon.id));
                }, 300);
            };

            const handleWrongHit = (balloon) => {
                setLives(l => Math.max(0, l - 1));
                setPoppedBalloons(prev => new Set(prev).add(balloon.id));
                 setTimeout(() => {
                    setBalloons(prev => prev.filter(b => b.id !== balloon.id));
                }, 300);
            };

            useEffect(() => {
                if (lives <= 0 && gameState === 'playing') {
                    handleGameEnd();
                }
            }, [lives, gameState]);
            
            const updateGame = useCallback(() => {
                if (gameState !== 'playing') return;

                const currentLevel = levels[levelIndex % levels.length];
                const allBalloonsSpawned = balloons.length >= 7;

                if (!allBalloonsSpawned) {
                     const options = [currentLevel.a, ...currentLevel.wrongs].slice(0, 4);
                     const shuffledOptions = options.sort(() => Math.random() - 0.5);

                     setBalloons(shuffledOptions.map((opt, i) => ({
                         id: Date.now() + i,
                         x: (window.innerWidth / (shuffledOptions.length + 1)) * (i + 1),
                         y: window.innerHeight + 100,
                         text: opt,
                         speed: Math.random() * 0.5 + 0.8,
                         color: BALLOON_COLORS[i % BALLOON_COLORS.length],
                         isCorrect: opt === currentLevel.a,
                         animationDuration: Math.random() * 5 + 8 // 8-13 seconds
                     })));
                }

                setBalloons(prev => prev.map(b => ({ ...b, y: b.y - b.speed })));
                setProjectiles(prev => prev
                    .map(p => ({
                        ...p,
                        x: p.x + Math.sin(p.angle * Math.PI / 180) * 12,
                        y: p.y - Math.cos(p.angle * Math.PI / 180) * 12
                    }))
                    .filter(p => p.x > -10 && p.x < window.innerWidth + 10 && p.y > -10)
                );

                setProjectiles(currentProjectiles => {
                    let nextProjectiles = [...currentProjectiles];
                    let hitOccurred = false;

                    for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                        const p = nextProjectiles[pIdx];
                        for (let bIdx = balloons.length - 1; bIdx >= 0; bIdx--) {
                            const b = balloons[bIdx];
                             if (poppedBalloons.has(b.id)) continue;

                            const dx = p.x - b.x;
                            const dy = p.y - b.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist < 50) { 
                                nextProjectiles.splice(pIdx, 1);
                                if (b.isCorrect) handleCorrectHit(b); else handleWrongHit(b);
                                hitOccurred = true;
                                break; 
                            }
                        }
                        if (hitOccurred) break;
                    }
                    return nextProjectiles;
                });
                
                const allCorrectPopped = balloons.filter(b => b.isCorrect && !poppedBalloons.has(b.id)).length === 0;
                if (balloons.length > 0 && allCorrectPopped) {
                    setTimeout(() => {
                       setLevelIndex(prev => (prev + 1));
                       setBalloons([]); 
                    }, 1000);
                }

            }, [gameState, levelIndex, balloons, poppedBalloons]);

            useEffect(() => {
                let animationFrameId;
                const gameLoop = () => {
                    updateGame();
                    animationFrameId = requestAnimationFrame(gameLoop);
                };
                if (gameState === 'playing') {
                    gameLoop();
                }
                return () => {
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                    }
                };
            }, [gameState, updateGame]);
            
            const handleInput = (e) => {
                if (gameState !== 'playing') return;
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                if (!clientX) return;

                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight;
                const dx = clientX - centerX;
                const dy = e.clientY - centerY;
                const rad = Math.atan2(dx, -dy);
                const deg = Math.max(-70, Math.min(70, rad * (180 / Math.PI)));
                setAngle(deg);

                if (e.type === 'mousedown' || e.type === 'touchstart') {
                    shoot(deg);
                }
            };
            
            const shoot = (fireAngle) => {
                setProjectiles(prev => [...prev, {
                    id: Date.now(),
                    x: window.innerWidth / 2,
                    y: window.innerHeight - 80,
                    angle: fireAngle
                }]);
            };

            const currentLevelData = levels[levelIndex % levels.length];

            return (
                <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
                     <FullscreenButton />
                    {gameState !== 'start' && (
                        <>
                            <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                                Puan: {score}
                            </div>
                            <div className="lives">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <span key={i} className={'heart ' + (i < lives ? 'text-red-500' : 'text-gray-400 opacity-50')}>♥</span>
                                ))}
                            </div>
                        </>
                    )}

                    {balloons.map(b => (
                        <div key={b.id} className={cn("balloon", poppedBalloons.has(b.id) && "popping")} style={{ left: b.x, top: b.y, backgroundColor: b.color, animationDuration: \`\${b.animationDuration}s\` }}>
                            {b.text}
                        </div>
                    ))}

                    {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}

                    <div className="shooter-base"></div>
                    <div className="shooter" style={{ transform: \`translateX(-50%) rotate(\${angle}deg)\` }} />

                    {gameState === 'playing' && currentLevelData && (
                        <div className="question-panel">
                            <div className="question-box">
                                <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                                {currentLevelData.q}
                            </div>
                        </div>
                    )}
                    
                    {gameState === 'gameover' && (
                         <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-sky-500">
                                <h1 className="text-4xl font-bold text-sky-600 mb-4 header-font">Oyun Bitti!</h1>
                                <p className="text-gray-600 mb-2 text-lg">Harika iş çıkardın!</p>
                                <p className="text-2xl font-bold text-gray-800 mb-8">Skor: <span className="text-yellow-500">{score}</span></p>
                                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                    <button onClick={startGame} className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-xl text-lg transition-transform hover:scale-105 shadow-lg">
                                        Tekrar Oyna
                                    </button>
                                    <a href="/student/activities" className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-lg transition-transform hover:scale-105 shadow-lg">
                                        Ana Menü
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {gameState === 'start' && (
                        <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-sky-500">
                                <h1 className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</h1>
                                <p className="text-gray-600 mb-8 text-lg">Aşağıdaki soruyu oku.<br/>Doğru cevabı taşıyan balonu vur!</p>
                                <button onClick={startGame} className="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg">
                                    BAŞLA
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        const renderApp = (levels) => {
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<App levels={levels} />);
        };
        
        // This will be called from the parent component
        window.startGameWithData = (levels) => {
            renderApp(levels);
        };

    </script>
</body>
</html>
    `;

    useEffect(() => {
        const iframe = document.getElementById('game-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(iframeContent);
            iframe.contentWindow.document.close();
            
            // Send questions to iframe after it has loaded
            const handleLoad = async () => {
                try {
                    // This is where you would fetch dynamic questions
                    // For now, we use the static data inside the iframe
                    if (iframe.contentWindow && 'startGameWithData' in iframe.contentWindow) {
                         // The questions are hardcoded inside the iframe's script for now
                         // In a dynamic version, you would pass fetched data here.
                         // (iframe.contentWindow as any).startGameWithData(fetchedLevels);
                    }
                } catch(e) {
                    console.error("Failed to post message to iframe", e);
                }
            };
            iframe.addEventListener('load', handleLoad);
            return () => iframe.removeEventListener('load', handleLoad);
        }
    }, [iframeContent]);


    return (
        <iframe
            id="game-iframe"
            style={{ width: '100vw', height: '100vh', border: 'none' }}
            title="Balon Avcısı Oyunu"
        />
    );
}


export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <BalloonHuntGame />
        </Suspense>
    )
}

    