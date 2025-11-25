
'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { submitBalloonHuntScore } from './actions';
import { useToast } from '@/hooks/use-toast';

function BalloonHuntGame() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();
    
    // The entire game logic will be inside an iframe for isolation
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
        .cloud::after, .cloud::before { content: ''; position: absolute; background: white; border-radius: 50%; }
        @keyframes floatCloud { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }
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
        .balloon::after { content: ''; position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); width: 2px; height: 20px; background: rgba(0,0,0,0.3); }
        .balloon::before { content: ''; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 6px; height: 4px; background: inherit; border-radius: 2px; }
        .shooter { position: absolute; bottom: 80px; left: 50%; transform-origin: center bottom; width: 6px; height: 60px; background: #475569; z-index: 20; border-radius: 3px; }
        .shooter-base { position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); width: 60px; height: 30px; background: #1e293b; border-radius: 30px 30px 0 0; z-index: 19; }
        .projectile { position: absolute; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; z-index: 15; box-shadow: 0 0 5px #ef4444; }
        .pop-effect { position: absolute; font-size: 2rem; font-weight: bold; animation: popAnim 0.4s ease-out forwards; z-index: 30; pointer-events: none; }
        @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        .question-panel { position: absolute; bottom: 85px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: center; z-index: 50; }
        .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.2rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; }
        .game-over-screen { animation: gameOverAnim 0.5s ease-out; }
        @keyframes gameOverAnim { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useRef, useCallback } = React;

        const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
        let scoreToSubmit = 0;

        function App() {
            const [gameState, setGameState] = useState('loading'); // loading, start, playing, gameover
            const [score, setScore] = useState(0);
            const [lives, setLives] = useState(3);
            const [currentQuestion, setCurrentQuestion] = useState(null);
            const [balloons, setBalloons] = useState([]);
            const [projectiles, setProjectiles] = useState([]);
            const [effects, setEffects] = useState([]);
            const [angle, setAngle] = useState(0);
            
            const [levels, setLevels] = useState([]);

            const requestRef = useRef();
            const lastSpawnTime = useRef(0);

            // Fetch questions from the API
            useEffect(() => {
                const queryParams = new URLSearchParams(window.location.search);
                const topicId = queryParams.get('topicId');
                
                async function fetchQuestions() {
                    const response = await fetch('/api/get-balloon-questions?topicId=' + (topicId || ''));
                    const data = await response.json();
                    if (data.error || data.questions.length === 0) {
                        console.error(data.error || "No questions found");
                        setGameState('error');
                    } else {
                        setLevels(data.questions);
                        setGameState('start');
                    }
                }

                fetchQuestions();
            }, []);

            const startGame = () => {
                setScore(0);
                setLives(3);
                setCurrentQuestion(levels[0]);
                setBalloons([]);
                setProjectiles([]);
                setEffects([]);
                setGameState('playing');
                lastSpawnTime.current = 0;
            };

            const updateGame = useCallback((time) => {
                if (gameState !== 'playing') return;

                if (!currentQuestion) {
                     requestRef.current = requestAnimationFrame(updateGame);
                    return;
                }
                
                if (balloons.length < 5 && time - lastSpawnTime.current > 1200) {
                    const allAnswers = [currentQuestion.a, ...currentQuestion.wrongs];
                    const text = allAnswers[Math.floor(Math.random() * allAnswers.length)];
                    
                    const newBalloon = {
                        id: Date.now() + Math.random(),
                        x: Math.random() * (window.innerWidth - 80) + 40,
                        y: window.innerHeight + 50,
                        text: text,
                        speed: Math.random() * 1.5 + 1,
                        color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                        isCorrect: text === currentQuestion.a
                    };
                    setBalloons(prev => [...prev, newBalloon]);
                    lastSpawnTime.current = time;
                }

                setBalloons(prev => prev
                    .map(b => ({ ...b, y: b.y - b.speed }))
                    .filter(b => {
                        if (b.y < -100) {
                            if (b.isCorrect) {
                                setLives(l => Math.max(0, l - 1));
                            }
                            return false;
                        }
                        return true;
                    })
                );

                setProjectiles(prev => prev
                    .map(p => ({
                        ...p,
                        x: p.x + Math.sin(p.angle * Math.PI / 180) * 10,
                        y: p.y - Math.cos(p.angle * Math.PI / 180) * 10
                    }))
                    .filter(p => p.y > 0)
                );

                let nextBalloons = [...balloons];
                let nextProjectiles = [...projectiles];

                for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                    const p = nextProjectiles[pIdx];
                    for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                        const b = nextBalloons[bIdx];
                        const dx = p.x - b.x;
                        const dy = p.y - b.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 40) {
                            nextProjectiles.splice(pIdx, 1);
                            nextBalloons.splice(bIdx, 1);
                            
                            if (b.isCorrect) {
                                handleCorrectHit(b.x, b.y);
                            } else {
                                handleWrongHit(b.x, b.y);
                            }
                            break;
                        }
                    }
                }

                setBalloons(nextBalloons);
                setProjectiles(nextProjectiles);

                requestRef.current = requestAnimationFrame(updateGame);
            }, [gameState, currentQuestion, balloons, projectiles]);

            useEffect(() => {
                if (lives <= 0) {
                    setGameState('gameover');
                    scoreToSubmit = score;
                    window.parent.postMessage({ type: 'SAVE_SCORE', score: score }, '*');
                }
            }, [lives, score]);

            useEffect(() => {
                if (gameState === 'playing') {
                    requestRef.current = requestAnimationFrame(updateGame);
                    return () => cancelAnimationFrame(requestRef.current);
                }
            }, [gameState, updateGame]);

            const handleCorrectHit = (x, y) => {
                setScore(s => s + 10);
                addEffect(x, y, "+10", "#22c55e");
                
                setTimeout(() => {
                     const newIndex = (levels.findIndex(l => l.q === currentQuestion.q) + 1) % levels.length;
                     setCurrentQuestion(levels[newIndex]);
                     setBalloons(prev => prev.filter(b => !b.isCorrect));
                }, 500);
            };

            const handleWrongHit = (x, y) => {
                setLives(l => Math.max(0, l - 1));
                addEffect(x, y, "-1 Can", "#ef4444");
            };

            const addEffect = (x, y, text, color) => {
                const id = Date.now() + Math.random();
                setEffects(prev => [...prev, { id, x, y, text, color }]);
                setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
            };
            
            const handleInput = (e) => {
                if (gameState !== 'playing') return;
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                if (!clientX) return;
                
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight - 80;
                const dx = clientX - centerX;
                const dy = clientY - centerY;
                
                const rad = Math.atan2(dx, -dy);
                const deg = rad * (180 / Math.PI);
                setAngle(Math.max(-70, Math.min(70, deg)));

                if (e.type === 'mousedown' || e.type === 'touchstart') {
                    shoot(Math.max(-70, Math.min(70, deg)));
                }
            };
            
            const shoot = (fireAngle) => {
                const radian = fireAngle * Math.PI / 180;
                const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
                const startY = window.innerHeight - 80 - Math.cos(radian) * 60;
                setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
            };
            
            const handleRestart = () => {
                window.location.reload();
            };

            if (gameState === 'loading') {
                return <div className="absolute inset-0 flex items-center justify-center">Yükleniyor...</div>;
            }
            if (gameState === 'error') {
                 return <div className="absolute inset-0 flex items-center justify-center text-red-500">Oyun yüklenemedi.</div>;
            }

            return (
                <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
                    {gameState === 'playing' && (
                        <>
                            <div className="cloud" style={{ top: '10%', width: '100px', height: '40px', animationDuration: '20s' }}></div>
                            <div className="cloud" style={{ top: '20%', left: '60%', width: '120px', height: '50px', animationDuration: '15s' }}></div>
                            <div className="cloud" style={{ top: '5%', left: '80%', width: '80px', height: '30px', animationDuration: '25s' }}></div>
                            <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                                Puan: {score}
                            </div>
                            <div className="absolute top-4 left-4 flex items-center gap-2 z-50">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <span key={i} className={'text-4xl transition-all duration-300 ' + (i < lives ? 'text-red-500' : 'text-gray-400 opacity-50')}>♥</span>
                                ))}
                            </div>
                            {balloons.map(b => <div key={b.id} className="balloon" style={{ left: b.x, top: b.y, backgroundColor: b.color, borderColor: b.color }}>{b.text}</div>)}
                            {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}
                            {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}
                            <div className="shooter-base"></div>
                            <div className="shooter" style={{ transform: 'translateX(-50%) rotate(' + angle + 'deg)' }}><div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div></div>
                            <div className="question-panel">
                                <div className="question-box animate-[bounce_2s_infinite]">
                                    <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                                    {currentQuestion?.q}
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
                                     <a href="/student/activities" className="flex-1 px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-full text-lg transition-transform hover:scale-105 shadow-lg no-underline">Ana Menü</a>
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
    
    useEffect(() => {
        if (gameStateRef.current === 'gameover' && scoreRef.current > 0) {
            const topicId = searchParams.get('topicId');
            submitBalloonHuntScore(user?.uid || null, scoreRef.current, `Balon Avcısı - Konu: ${topicId}`);
            scoreRef.current = 0; // Prevent resubmitting
        }
    }, [gameStateRef, scoreRef, user, searchParams]);

    // This ref handling is to communicate from iframe to parent
    const gameStateRef = useRef<string>();
    const scoreRef = useRef<number>(0);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'SAVE_SCORE') {
                gameStateRef.current = 'gameover';
                scoreRef.current = event.data.score;
                // Trigger the save effect
                if (user?.uid) {
                     const topicId = searchParams.get('topicId');
                     submitBalloonHuntScore(user.uid, event.data.score, `Balon Avcısı - Konu: ${topicId}`);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user, searchParams]);

    return (
        <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
            <iframe
                srcDoc={gameHtml}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Balon Avcısı Oyunu"
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
