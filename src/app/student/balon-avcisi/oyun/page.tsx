
'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { submitBalloonHuntScore } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

function BalloonHuntGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState('start'); // start, playing, gameover
    const [score, setScore] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // This ref handling is to communicate from iframe to parent
    const gameStateRef = useRef<string>();
    const scoreRef = useRef(0);

    // Keep refs in sync with state
    useEffect(() => {
        scoreRef.current = score;
        gameStateRef.current = gameState;
    }, [score, gameState]);

    // Save score on component unmount
    useEffect(() => {
        return () => {
            if (gameStateRef.current === 'playing' || gameStateRef.current === 'gameover') {
                const finalScore = scoreRef.current;
                if (user && finalScore > 0) {
                    const topicName = searchParams.get('topicName') || 'Genel';
                    submitBalloonHuntScore({
                        userId: user.uid,
                        score: finalScore,
                        context: `Balon Avcısı - ${topicName}`
                    }).then(result => {
                        if (!result.success) {
                            // We can't use useToast here as the component is unmounting.
                            console.error("Failed to submit score on unmount:", result.error);
                        }
                    });
                }
            }
            scoreRef.current = 0; // Prevent resubmitting
        }
    }, [user, searchParams]);

    const handleGameEnd = (finalScore: number) => {
        setGameState('gameover');
        setScore(finalScore);
    };

    const handleRestart = () => {
        // This will reload the iframe, effectively restarting the game
        const iframe = document.getElementById('game-iframe') as HTMLIFrameElement;
        if (iframe) {
            iframe.src = iframe.src;
        }
        setGameState('start');
        setScore(0);
    };
    
    const gameHtml = `
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
        body {
            font-family: 'Nunito', sans-serif;
            background-color: #0ea5e9; /* Sky Blue */
            color: white;
            overflow: hidden;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
        }
        .header-font {
            font-family: 'Fredoka', sans-serif;
        }
        #game-canvas {
            width: 100vw;
            height: 100vh;
            position: relative;
            background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%);
            cursor: crosshair;
        }
        .cloud {
            position: absolute;
            background: white;
            border-radius: 50%;
            opacity: 0.8;
            animation: floatCloud linear infinite;
        }
        .cloud::after, .cloud::before {
            content: '';
            position: absolute;
            background: white;
            border-radius: 50%;
        }
        @keyframes floatCloud {
            from { transform: translateX(-200px); }
            to { transform: translateX(120vw); }
        }
        .balloon {
            position: absolute;
            width: 70px;
            height: 85px;
            border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-weight: bold;
            font-size: 0.85rem;
            line-height: 1;
            box-shadow: inset -5px -5px 10px rgba(0,0,0,0.1);
            transition: transform 0.1s;
            z-index: 10;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        .balloon::after {
            content: '';
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            width: 2px;
            height: 20px;
            background: rgba(0,0,0,0.3);
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
        .shooter {
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform-origin: center bottom;
            width: 6px;
            height: 60px;
            background: #475569;
            z-index: 20;
            border-radius: 3px;
        }
        .shooter-base {
            position: absolute;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 30px;
            background: #1e293b;
            border-radius: 30px 30px 0 0;
            z-index: 19;
        }
        .projectile {
            position: absolute;
            width: 10px;
            height: 10px;
            background: #ef4444;
            border-radius: 50%;
            z-index: 15;
            box-shadow: 0 0 5px #ef4444;
        }
        .pop-effect {
            position: absolute;
            font-size: 2rem;
            font-weight: bold;
            animation: popAnim 0.4s ease-out forwards;
            z-index: 30;
            pointer-events: none;
        }
        @keyframes popAnim {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2); opacity: 0; }
        }
        .question-panel {
            position: absolute;
            bottom: 85px;
            left: 20px;
            right: 20px;
            pointer-events: none; 
            display: flex;
            justify-content: center;
            z-index: 50;
        }
        .question-box {
            background: white;
            color: #0f172a;
            padding: 15px 30px;
            border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            font-weight: bold;
            font-size: 1.2rem;
            text-align: center;
            border-bottom: 6px solid #cbd5e1;
            pointer-events: auto;
            max-width: 90%;
        }
        .game-over-screen {
          animation: fadeInScreen 0.5s ease-out;
        }
        @keyframes fadeInScreen {
           from { opacity: 0; transform: scale(0.9); }
           to { opacity: 1; transform: scale(1); }
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useRef, useCallback } = React;

        const BALLOON_COLORS = [
            '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'
        ];

        function App() {
            const [gameState, setGameState] = useState('loading');
            const [score, setScore] = useState(0);
            const [levelIndex, setLevelIndex] = useState(0);
            const [levels, setLevels] = useState([]);
            const [balloons, setBalloons] = useState([]);
            const [projectiles, setProjectiles] = useState([]);
            const [effects, setEffects] = useState([]);
            const [angle, setAngle] = useState(0);

            const requestRef = useRef();
            const lastSpawnTime = useRef(0);
            const gameAreaRef = useRef();

            useEffect(() => {
                const queryParams = new URLSearchParams(window.location.search);
                const topicId = queryParams.get('topicId');
                
                async function fetchQuestions() {
                    try {
                        const response = await fetch('/api/get-balloon-questions?topicId=' + (topicId || ''));
                        const data = await response.json();
                        if (data.error || data.questions.length === 0) {
                            throw new Error(data.error || "No questions found");
                        }
                        setLevels(data.questions);
                        setGameState('start');
                    } catch(err) {
                        console.error("Failed to fetch questions:", err);
                        setGameState('error');
                    }
                }
                fetchQuestions();
            }, []);
            
            const handleRestart = () => {
                setScore(0);
                setLevelIndex(0);
                setBalloons([]);
                setProjectiles([]);
                setEffects([]);
                setGameState('playing');
                lastSpawnTime.current = 0;
                 if (window.parent) {
                    window.parent.postMessage({ type: 'RESTART_GAME' }, '*');
                }
            };
            
            const handleEndGame = () => {
                if (gameState === 'playing') {
                     setGameState('gameover');
                    if (window.parent) {
                        window.parent.postMessage({ type: 'GAME_OVER', score: score }, '*');
                    }
                }
            };

            const startGame = () => {
                setScore(0);
                setLevelIndex(0);
                setBalloons([]);
                setProjectiles([]);
                setEffects([]);
                setGameState('playing');
                lastSpawnTime.current = 0;
            };

            const updateGame = useCallback((time) => {
                if (gameState !== 'playing' || levels.length === 0) {
                    if (requestRef.current) cancelAnimationFrame(requestRef.current);
                    return;
                }

                const currentLevel = levels[levelIndex % levels.length];

                if (time - lastSpawnTime.current > 1500) {
                    const isCorrect = Math.random() > 0.6;
                    const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                    const newBalloon = {
                        id: Date.now() + Math.random(),
                        x: Math.random() * (window.innerWidth - 80) + 40,
                        y: window.innerHeight + 50,
                        text: text,
                        speed: Math.random() * 1 + 1.2,
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
                })).filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0));

                setProjectiles(currentProjectiles => {
                    let nextProjectiles = [...currentProjectiles];
                    let newScore = score;
                    
                    setBalloons(currentBalloons => {
                        let nextBalloons = [...currentBalloons];
                        for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                            const p = nextProjectiles[pIdx];
                            let projectileHit = false;
                            for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                                const b = nextBalloons[bIdx];
                                const dx = p.x - b.x;
                                const dy = p.y - b.y;
                                if (Math.sqrt(dx*dx + dy*dy) < 45) {
                                    nextProjectiles.splice(pIdx, 1);
                                    nextBalloons.splice(bIdx, 1);
                                    
                                    if (b.isCorrect) {
                                        newScore += 10;
                                        addEffect(b.x, b.y, "+10", "#22c55e");
                                        setTimeout(() => {
                                            setLevelIndex(prev => (prev + 1));
                                            setBalloons(prevBalloons => prevBalloons.filter(bal => !bal.isCorrect));
                                        }, 500);
                                    } else {
                                        newScore = Math.max(0, newScore - 5);
                                        addEffect(b.x, b.y, "-5", "#ef4444");
                                    }
                                    projectileHit = true;
                                    break; 
                                }
                            }
                             if (projectileHit) break;
                        }
                        return nextBalloons;
                    });
                    
                    if (newScore !== score) {
                        setScore(newScore);
                    }
                    return nextProjectiles;
                });

                requestRef.current = requestAnimationFrame(updateGame);
            }, [gameState, levelIndex, levels, score]);

            useEffect(() => {
                requestRef.current = requestAnimationFrame(updateGame);
                return () => cancelAnimationFrame(requestRef.current);
            }, [updateGame]);

            const addEffect = (x, y, text, color) => {
                const id = Date.now() + Math.random();
                setEffects(prev => [...prev, { id, x, y, text, color }]);
                setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
            };

            const handleInput = (e) => {
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

                if ((e.type === 'mousedown' || e.type === 'touchstart') && clientY < window.innerHeight - 150) {
                    shoot(clampedAngle);
                }
            };

            const shoot = (fireAngle) => {
                const radian = fireAngle * Math.PI / 180;
                const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
                const startY = window.innerHeight - 80 - Math.cos(radian) * 60;

                setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
            };
            
            if (gameState === 'loading') return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', color: '#0f172a'}}>Yükleniyor...</div>;
            if (gameState === 'error') return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', color: 'red', padding: '20px', textAlign: 'center'}}>Oyun yüklenemedi. Bu konu için yeterli soru bulunmuyor veya bir hata oluştu.</div>;

            return (
                <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
                    {[...Array(5)].map((_, i) => <div key={i} className="cloud" style={{ top: `${10 + i * 18}%`, width: `${80 + i * 15}px`, height: `${30 + i * 8}px`, animationDuration: `${15 + i * 5}s`, animationDelay: `-${i * 5}s`, opacity: Math.random() * 0.3 + 0.3, left: `${Math.random() * 100}vw` }} />)}
                    {balloons.map(b => <div key={b.id} className="balloon" style={{ left: b.x, top: b.y, backgroundColor: b.color, borderColor: b.color }}>{b.text}</div>)}
                    {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}
                    {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}
                    
                    {gameState === 'playing' && (
                        <>
                            <div className="shooter-base"></div>
                            <div className="shooter" style={{ transform: 'translateX(-50%) rotate(' + angle + 'deg)' }}><div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div></div>
                            <div className="question-panel">
                                <div className="question-box animate-[bounce_2s_infinite]">
                                    <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                                    {levels.length > 0 && LEVELS[levelIndex % levels.length]?.q}
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
                    
                    <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                        Puan: {score}
                    </div>

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
                id="game-iframe"
                srcDoc={gameHtml}
                style={{ border: 'none', width: '100%', height: '100%' }}
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
