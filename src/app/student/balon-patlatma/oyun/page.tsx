<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Balon Avcısı: Peygamberler</title>
    {/* React ve ReactDOM */}
    <script crossOrigin="true" src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossOrigin="true" src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Nunito:wght@400;700&display=swap" rel="stylesheet" />
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

        /* Oyun Alanı */
        #game-canvas {
            width: 100vw;
            height: 100vh;
            position: relative;
            background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%);
            cursor: crosshair;
        }

        /* Bulutlar */
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

        /* Balon Stili */
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
        /* Balon İpi */
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
        /* Balon Düğümü */
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

        /* Oyuncu (Yay/Top) */
        .shooter {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform-origin: center bottom; /* Dönme noktası alt orta */
            width: 6px;
            height: 60px;
            background: #475569;
            z-index: 20;
            border-radius: 3px;
        }
        .shooter-base {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 30px;
            background: #1e293b;
            border-radius: 30px 30px 0 0;
            z-index: 19;
        }

        /* Ok/Mermi */
        .projectile {
            position: absolute;
            width: 10px;
            height: 10px;
            background: #ef4444;
            border-radius: 50%;
            z-index: 15;
            box-shadow: 0 0 5px #ef4444;
        }

        /* Patlama Efekti */
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

        /* Soru Paneli */
        .question-panel {
            position: absolute;
            bottom: 20px;
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
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useRef, useCallback } = React;

        const useQuery = () => new URLSearchParams(window.location.search);

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

        const BALLOON_COLORS = [
            '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'
        ];

        function App() {
            const query = useQuery();
            const [gameState, setGameState] = useState('start');
            const [score, setScore] = useState(0);
            const [levelIndex, setLevelIndex] = useState(0);
            const [balloons, setBalloons] = useState([]);
            const [projectiles, setProjectiles] = useState([]);
            const [effects, setEffects] = useState([]);
            const [angle, setAngle] = useState(0);
            const [isSaving, setIsSaving] = useState(false);
            const [scoreSaved, setScoreSaved] = useState(false);

            const requestRef = useRef();
            const lastSpawnTime = useRef(0);

            const startGame = () => {
                setScore(0);
                setLevelIndex(0);
                setBalloons([]);
                setProjectiles([]);
                setEffects([]);
                setGameState('playing');
                setScoreSaved(false);
                lastSpawnTime.current = 0;
            };

            const endGame = () => {
                setGameState('gameover');
            };

            const handleSaveAndExit = async () => {
                if (score === 0 || isSaving || scoreSaved) {
                    window.location.href = '/student/activities';
                    return;
                }
                setIsSaving(true);
                // This would be a server action call in a real Next.js app
                // For this standalone file, we simulate it
                console.log(`Saving score: ${score}`);
                // In a real app, you would get userId from context.
                // const result = await submitBalloonPoppingScoreAction(userId, score, "Balon Patlatma");
                setTimeout(() => { // Simulate network delay
                    setScoreSaved(true);
                    setIsSaving(false);
                    alert(`${score} puan kaydedildi!`);
                    window.location.href = '/student/activities';
                }, 1000);
            };

            const updateGame = useCallback((time) => {
                if (gameState !== 'playing') return;

                const currentLevel = LEVELS[levelIndex % LEVELS.length];

                if (time - lastSpawnTime.current > 1500) {
                    const isCorrect = Math.random() > 0.6;
                    const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                    const newBalloon = {
                        id: Date.now(),
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
                setProjectiles(prev => prev.map(p => ({ ...p, x: p.x + Math.sin(p.angle * Math.PI / 180) * 10, y: p.y - Math.cos(p.angle * Math.PI / 180) * 10 })).filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0));

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
                                const dist = Math.sqrt(dx*dx + dy*dy);

                                if (dist < 40) {
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
            }, [gameState, levelIndex]);

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
                setScore(s => Math.max(0, s - 5));
                addEffect(x, y, "-5", "#ef4444");
                // End game on wrong hit
                endGame();
            };

            const addEffect = (x, y, text, color) => {
                const id = Date.now() + Math.random();
                setEffects(prev => [...prev, { id, x, y, text, color }]);
                setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
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
                if (e.type === 'mousedown' || e.type === 'touchstart') shoot(clampedAngle);
            };

            const shoot = (fireAngle) => {
                const radian = fireAngle * Math.PI / 180;
                const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
                const startY = window.innerHeight - 20 - Math.cos(radian) * 60;
                setProjectiles(prev => [...prev, { id: Date.now(), x: startX, y: startY, angle: fireAngle }]);
            };

            return (
                <div id="game-canvas" onMouseMove={handleInput} onMouseDown={handleInput} onTouchMove={handleInput} onTouchStart={handleInput}>
                    <div className="cloud" style={{ top: '10%', width: '100px', height: '40px' }}></div>
                    <div className="cloud" style={{ top: '20%', left: '60%', width: '120px', height: '50px', animationDuration: '15s' }}></div>
                    <div className="cloud" style={{ top: '5%', left: '80%', width: '80px', height: '30px', animationDuration: '25s' }}></div>
                    <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">Puan: {score}</div>
                    
                    {balloons.map(b => (<div key={b.id} className="balloon" style={{ left: b.x, top: b.y, backgroundColor: b.color, borderColor: b.color }}>{b.text}</div>))}
                    {projectiles.map(p => (<div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>))}
                    {effects.map(e => (<div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>))}

                    <div className="shooter-base"></div>
                    <div className="shooter" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}>
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                    </div>
                    
                    {gameState === 'playing' && (<div className="question-panel"><div className="question-box animate-[bounce_2s_infinite]"><span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>{LEVELS[levelIndex % LEVELS.length].q}</div></div>)}
                    
                    {(gameState === 'start' || gameState === 'gameover') && (
                        <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-sky-500">
                                {gameState === 'start' ? (
                                    <>
                                        <h1 className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</h1>
                                        <p className="text-gray-600 mb-8 text-lg">Aşağıdaki soruyu oku.<br/>Doğru cevabı taşıyan balonu vur!</p>
                                        <button onClick={startGame} className="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg">BAŞLA</button>
                                    </>
                                ) : (
                                    <>
                                        <h1 className="text-4xl font-bold text-red-600 mb-4 header-font">Oyun Bitti!</h1>
                                        <p className="text-gray-600 mb-2 text-lg">Yanlış balonu vurdun.</p>
                                        <p className="text-gray-800 font-bold text-2xl mb-8">Skorun: {score}</p>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={startGame} className="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg">TEKRAR OYNA</button>
                                            <button onClick={handleSaveAndExit} disabled={isSaving || score === 0 || scoreSaved} className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                                {isSaving ? 'Kaydediliyor...' : (scoreSaved ? 'Puan Kaydedildi' : 'Puanı Kaydet ve Çık')}
                                            </button>
                                        </div>
                                    </>
                                )}
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
