
'use client';

import { Suspense, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from 'next/navigation';

function BalloonHuntGame() {
    const searchParams = useSearchParams();
    const topicId = searchParams.get('topicId');
    const [htmlContent, setHtmlContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Since we cannot use server-side actions in a static HTML file,
        // we'll keep the static questions for now as per the user's provided code.
        // A more advanced implementation would involve fetching questions via an API route.
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
                <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Nunito:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Nunito', sans-serif;
                        background-color: #0ea5e9;
                        color: white;
                        overflow: hidden;
                        touch-action: none;
                        user-select: none;
                        margin: 0;
                        padding: 0;
                    }
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
                    .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.2rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; animation: bounce_2s_infinite 2s infinite; }
                    @keyframes bounce_2s_infinite { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                    .game-over-screen { backdrop-filter: blur(4px); }
                </style>
            </head>
            <body>
                <div id="root"></div>

                <script type="text/babel">
                    const { useState, useEffect, useRef, useCallback } = React;
                    const LEVELS = [
                        { q: "Hz. Musa'nın Kitabı?", a: "Tevrat", wrongs: ["İncil", "Zebur", "Kur'an", "Suhuf"] },
                        { q: "Hz. İsa'nın Kitabı?", a: "İncil", wrongs: ["Tevrat", "Zebur", "Kur'an", "Hadis"] },
                        { q: "Hz. Davud'un Kitabı?", a: "Zebur", wrongs: ["Tevrat", "İncil", "Kur'an", "Siyer"] },
                        { q: "Son İlahi Kitap?", a: "Kur'an", wrongs: ["İncil", "Tevrat", "Zebur", "Suhuf"] },
                        { q: "Güvenilir Olmak?", a: "Emanet", wrongs: ["Sıdk", "İsmet", "Fetanet", "Tebliğ"] },
                        { q: "Doğru Sözlü Olmak?", a: "Sıdk", wrongs: ["Emanet", "İsmet", "Fetanet", "Tebyin"] },
                        { q: "Akıllı Olmak?", a: "Fetanet", wrongs: ["İsmet", "Emanet", "Sıdk", "Temsil"] },
                        { q: "Günahsız Olmak?", a: "İsmet", wrongs: ["Sıdk", "Fetanet", "Emanet", "Tebliğ"] },
                        { q: "Vahyi İletmek?", a: "Tebliğ", wrongs: ["Tebyin", "Temsil", "Tezkiye", "İnzar"] },
                        { q: "İlk Peygamber?", a: "Hz. Adem", wrongs: ["Hz. Nuh", "Hz. İbrahim", "Hz. Musa", "Hz. İsa"] }
                    ];

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

                        const handleRestart = () => {
                            startGame();
                        };

                        const updateGame = useCallback((time) => {
                            if (gameState !== 'playing') return;

                            if (lives <= 0) {
                                setGameState('gameover');
                                return;
                            }
                            
                            const currentLevel = LEVELS[levelIndex % LEVELS.length];

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

                            setBalloons(prev => prev
                                .map(b => ({ ...b, y: b.y - b.speed }))
                                .filter(b => {
                                    if (b.y < -150) {
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
                                .filter(p => p.x > -10 && p.x < window.innerWidth + 10 && p.y > -10 && p.y < window.innerHeight + 10)
                            );

                            const newBalloons = [...balloons];
                            const newProjectiles = [...projectiles];
                            const newEffects = [];

                            for (let pIdx = newProjectiles.length - 1; pIdx >= 0; pIdx--) {
                                let projectileHit = false;
                                const p = newProjectiles[pIdx];
                                for (let bIdx = newBalloons.length - 1; bIdx >= 0; bIdx--) {
                                    const b = newBalloons[bIdx];
                                    const dx = p.x - b.x;
                                    const dy = p.y - b.y;
                                    if (Math.sqrt(dx * dx + dy * dy) < 45) {
                                        if (b.isCorrect) {
                                            setScore(s => s + 10);
                                            newEffects.push({ id: Date.now() + Math.random(), x: b.x, y: b.y, text: "+10", color: "#22c55e" });
                                            setTimeout(() => {
                                                setLevelIndex(prev => (prev + 1) % LEVELS.length);
                                                setBalloons(prevBalloons => prevBalloons.filter(bal => !bal.isCorrect)); 
                                            }, 500);
                                        } else {
                                            setScore(s => Math.max(0, s - 5));
                                            setLives(l => Math.max(0, l - 1));
                                            newEffects.push({ id: Date.now() + Math.random(), x: b.x, y: b.y, text: "-5", color: "#ef4444" });
                                        }
                                        newBalloons.splice(bIdx, 1);
                                        projectileHit = true;
                                        break; 
                                    }
                                }
                                if(projectileHit) {
                                    newProjectiles.splice(pIdx, 1);
                                }
                            }
                            
                            if (newBalloons.length !== balloons.length || newProjectiles.length !== projectiles.length) {
                                setBalloons(newBalloons);
                                setProjectiles(newProjectiles);
                            }
                            if(newEffects.length > 0) {
                                setEffects(prev => [...prev, ...newEffects]);
                                newEffects.forEach(eff => setTimeout(() => setEffects(prevE => prevE.filter(e => e.id !== eff.id)), 500));
                            }
                            
                            requestRef.current = requestAnimationFrame(updateGame);
                        }, [gameState, levelIndex, balloons, projectiles, lives]);

                        useEffect(() => {
                            if (gameState === 'playing') {
                                requestRef.current = requestAnimationFrame(updateGame);
                            }
                            return () => cancelAnimationFrame(requestRef.current);
                        }, [gameState, updateGame]);

                        const handleInput = useCallback((e) => {
                            if (gameState !== 'playing') return;
                            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                            if (!clientX) return;

                            const centerX = window.innerWidth / 2;
                            const centerY = window.innerHeight - 80;
                            const rad = Math.atan2(clientX - centerX, -(clientY - centerY));
                            const deg = rad * (180 / Math.PI);
                            setAngle(Math.max(-70, Math.min(70, deg)));

                            if (e.type === 'mousedown' || e.type === 'touchstart') {
                                shoot(Math.max(-70, Math.min(70, deg)));
                            }
                        }, [gameState]);

                        const shoot = (fireAngle) => {
                            const radian = fireAngle * Math.PI / 180;
                            const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
                            const startY = window.innerHeight - 80 - Math.cos(radian) * 60;
                            setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
                        };

                        return (
                            <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
                                {gameState !== 'start' && (
                                    <>
                                        <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                                            Puan: {score}
                                        </div>
                                        <div className="absolute top-4 left-4 flex items-center gap-2 z-50">
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <span key={i} className={"text-4xl transition-all duration-300 " + (i < lives ? 'text-red-500' : 'text-gray-400 opacity-50')}>♥</span>
                                            ))}
                                        </div>
                                        {balloons.map(b => <div key={b.id} className="balloon" style={{ left: b.x, top: b.y, backgroundColor: b.color, borderColor: b.color }}>{b.text}</div>)}
                                        {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}
                                        {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}
                                        <div className="shooter-base"></div>
                                        <div className="shooter" style={{ transform: \`translateX(-50%) rotate(\${angle}deg)\` }}><div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div></div>
                                        <div className="question-panel">
                                            <div className="question-box">
                                                <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                                                {LEVELS[levelIndex % LEVELS.length].q}
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
                                                <a href="/student/activities" className="flex-1 px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-full text-lg transition-transform hover:scale-105 shadow-lg flex items-center justify-center">Ana Menü</a>
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

        setHtmlContent(gameHtml);
        setIsLoading(false);
    }, [searchParams]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
            <iframe
                srcDoc={htmlContent}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Balon Avcısı Oyunu"
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
