'use client';

// This component will render the provided HTML game content within an iframe
// to ensure it works correctly within the Next.js application structure.
export default function BalloonPoppingGameWrapper() {

    const gameHtml = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Balon Avcısı: Peygamberler</title>
        <!-- React ve ReactDOM -->
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
                /* Mobilde nişangahı engellememesi için pointer-events none olabilir ama butonlar için auto lazım */
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

            // SORULAR VE CEVAPLAR
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
                '#ef4444', // Red
                '#f97316', // Orange
                '#eab308', // Yellow
                '#22c55e', // Green
                '#3b82f6', // Blue
                '#a855f7', // Purple
                '#ec4899'  // Pink
            ];

            function App() {
                const [gameState, setGameState] = useState('start'); // start, playing, gameover
                const [score, setScore] = useState(0);
                const [levelIndex, setLevelIndex] = useState(0);
                const [balloons, setBalloons] = useState([]); // {id, x, y, text, speed, color, isCorrect}
                const [projectiles, setProjectiles] = useState([]); // {id, x, y, angle}
                const [effects, setEffects] = useState([]); // {id, x, y, text, color}
                const [angle, setAngle] = useState(0); // Atıcı açısı (derece)

                const requestRef = useRef();
                const lastSpawnTime = useRef(0);
                const gameAreaRef = useRef();

                // OYUN BAŞLATMA
                const startGame = () => {
                    setScore(0);
                    setLevelIndex(0);
                    setBalloons([]);
                    setProjectiles([]);
                    setEffects([]);
                    setGameState('playing');
                    lastSpawnTime.current = 0;
                };

                // OYUN DÖNGÜSÜ (Physics Loop)
                const updateGame = useCallback((time) => {
                    if (gameState !== 'playing') return;

                    const currentLevel = LEVELS[levelIndex % LEVELS.length];

                    // 1. BALON ÜRETİMİ (SPAWN)
                    if (time - lastSpawnTime.current > 1500) { // Her 1.5 saniyede bir
                        const isCorrect = Math.random() > 0.6; // %40 doğru cevap şansı
                        const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                        
                        const newBalloon = {
                            id: Date.now(),
                            x: Math.random() * (window.innerWidth - 80) + 40,
                            y: -100, // Yukarıdan başla (veya aşağıdan, balonlar genelde yükselir ama burada avcı yukarıda olsun)
                            // Balonlar aşağıdan yukarı çıksın (daha doğal)
                            // Y = window.innerHeight + 50
                            text: text,
                            speed: Math.random() * 1 + 1, // 1-2 px/frame
                            color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                            isCorrect: text === currentLevel.a // Metin kontrolüyle teyit
                        };
                        
                        // Balonları aşağıdan yukarı göndermek için Y'yi ayarla
                        newBalloon.y = window.innerHeight + 50; 

                        setBalloons(prev => [...prev, newBalloon]);
                        lastSpawnTime.current = time;
                    }

                    // 2. HAREKETLER
                    
                    // Balonları Yükselt
                    setBalloons(prev => prev
                        .map(b => ({ ...b, y: b.y - b.speed }))
                        .filter(b => b.y > -150) // Ekrandan çıkanları sil
                    );

                    // Mermileri İlerlet
                    setProjectiles(prev => prev
                        .map(p => ({
                            ...p,
                            x: p.x + Math.sin(p.angle * Math.PI / 180) * 10, // Hız 10
                            y: p.y - Math.cos(p.angle * Math.PI / 180) * 10
                        }))
                        .filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0 && p.y < window.innerHeight)
                    );

                    // 3. ÇARPIŞMA KONTROLÜ
                    setProjectiles(currentProjectiles => {
                        let nextProjectiles = [...currentProjectiles];
                        
                        setBalloons(currentBalloons => {
                            let nextBalloons = [...currentBalloons];
                            let hitDetected = false;

                            // Her mermi için her balonu kontrol et (Basit AABB/Circle collision)
                            // Tersten döngü silme işlemi için daha güvenli
                            for (let pIdx = nextProjectiles.length - 1; pIdx >= 0; pIdx--) {
                                const p = nextProjectiles[pIdx];
                                
                                for (let bIdx = nextBalloons.length - 1; bIdx >= 0; bIdx--) {
                                    const b = nextBalloons[bIdx];
                                    
                                    // Mesafe hesapla (Mermi yarıçapı 5, Balon ~35)
                                    const dx = p.x - b.x;
                                    const dy = p.y - b.y;
                                    const dist = Math.sqrt(dx*dx + dy*dy);

                                    if (dist < 40) { // Çarpışma!
                                        // Mermiyi sil
                                        nextProjectiles.splice(pIdx, 1);
                                        // Balonu sil
                                        nextBalloons.splice(bIdx, 1);
                                        
                                        // Efekt ve Puan
                                        if (b.isCorrect) {
                                            handleCorrectHit(b.x, b.y);
                                        } else {
                                            handleWrongHit(b.x, b.y);
                                        }
                                        
                                        hitDetected = true;
                                        break; // Bu mermi işini bitirdi
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

                // OLAYLAR
                const handleCorrectHit = (x, y) => {
                    setScore(s => s + 10);
                    addEffect(x, y, "+10", "#22c55e");
                    
                    // 5 Doğruda bir seviye atla (veya soru değiştir)
                    // Burada basitleştirmek için her doğru vuruşta soruyu değiştirelim
                    setTimeout(() => {
                        setLevelIndex(prev => (prev + 1) % LEVELS.length);
                        // Ekrandaki eski doğru cevapları temizle ki kafa karışmasın
                        setBalloons(prev => prev.filter(b => !b.isCorrect)); 
                    }, 500);
                };

                const handleWrongHit = (x, y) => {
                    setScore(s => Math.max(0, s - 5));
                    addEffect(x, y, "-5", "#ef4444");
                };

                const addEffect = (x, y, text, color) => {
                    const id = Date.now();
                    setEffects(prev => [...prev, { id, x, y, text, color }]);
                    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 500);
                };

                // NİŞAN ALMA VE ATEŞ (MOUSE/TOUCH)
                const handleInput = (e) => {
                    if (gameState !== 'playing') return;

                    // Merkez Noktası (Topun dibi)
                    const centerX = window.innerWidth / 2;
                    const centerY = window.innerHeight - 20;

                    // Tıklanan/Dokunulan Nokta
                    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                    
                    if (!clientX) return;

                    // Açı Hesapla (Atan2)
                    const dx = clientX - centerX;
                    const dy = clientY - centerY;
                    // 0 derece yukarıyı göstersin diye -90 ofset veya koordinat dönüşümü
                    // Math.atan2(dy, dx) -> Radyan. 
                    // Bizim topumuz dikey duruyor (0 deg = yukarı). 
                    // Mouse sağdaysa pozitif açı, soldaysa negatif açı olmalı.
                    
                    // Basit trigonometri:
                    // tan(a) = x / y
                    // Ancak y negatif (yukarı doğru).
                    const rad = Math.atan2(dx, -dy); // -dy çünkü ekran koordinatlarında yukarı negatiftir
                    const deg = rad * (180 / Math.PI);
                    
                    // Açıyı sınırla (-70 ile 70 derece arası)
                    const clampedAngle = Math.max(-70, Math.min(70, deg));
                    setAngle(clampedAngle);

                    // Ateş Et (Input anında ateş etsin - Tap to shoot)
                    if (e.type === 'mousedown' || e.type === 'touchstart') {
                        shoot(clampedAngle);
                    }
                };

                const shoot = (fireAngle) => {
                    const radian = fireAngle * Math.PI / 180;
                    const startX = window.innerWidth / 2 + Math.sin(radian) * 60; // Namlu ucu
                    const startY = window.innerHeight - 20 - Math.cos(radian) * 60;

                    setProjectiles(prev => [...prev, {
                        id: Date.now(),
                        x: startX,
                        y: startY,
                        angle: fireAngle
                    }]);
                };

                return (
                    <div 
                        id="game-canvas"
                        onMouseMove={handleInput}
                        onMouseDown={handleInput}
                        onTouchMove={handleInput}
                        onTouchStart={handleInput}
                    >
                        {/* Bulutlar (Süs) */}
                        <div className="cloud" style={{ top: '10%', width: '100px', height: '40px' }}></div>
                        <div className="cloud" style={{ top: '20%', left: '60%', width: '120px', height: '50px', animationDuration: '15s' }}></div>
                        <div className="cloud" style={{ top: '5%', left: '80%', width: '80px', height: '30px', animationDuration: '25s' }}></div>

                        {/* Puan */}
                        <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                            Puan: {score}
                        </div>

                        {/* Balonlar */}
                        {balloons.map(b => (
                            <div 
                                key={b.id}
                                className="balloon"
                                style={{ 
                                    left: b.x, 
                                    top: b.y, 
                                    backgroundColor: b.color,
                                    borderColor: b.color // Glow efekti için
                                }}
                            >
                                {b.text}
                            </div>
                        ))}

                        {/* Mermiler */}
                        {projectiles.map(p => (
                            <div 
                                key={p.id}
                                className="projectile"
                                style={{ left: p.x, top: p.y }}
                            ></div>
                        ))}

                        {/* Efektler (Puan yazıları) */}
                        {effects.map(e => (
                            <div 
                                key={e.id}
                                className="pop-effect"
                                style={{ left: e.x, top: e.y, color: e.color }}
                            >
                                {e.text}
                            </div>
                        ))}

                        {/* Oyuncu (Top) */}
                        <div className="shooter-base"></div>
                        <div 
                            className="shooter"
                            style={{ transform: \`translateX(-50%) rotate(\${angle}deg)\` }}
                        >
                            {/* Namlu ucu süsü */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                        </div>

                        {/* Soru Paneli (En altta sabit) */}
                        {gameState === 'playing' && (
                            <div className="question-panel">
                                <div className="question-box animate-[bounce_2s_infinite]">
                                    <span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>
                                    {LEVELS[levelIndex % LEVELS.length].q}
                                </div>
                            </div>
                        )}

                        {/* Başlangıç Ekranı */}
                        {gameState === 'start' && (
                            <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm">
                                <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-sky-500">
                                    <h1 className="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı 🏹</h1>
                                    <p className="text-gray-600 mb-8 text-lg">
                                        Aşağıdaki soruyu oku.<br/>
                                        Doğru cevabı taşıyan balonu vur!
                                    </p>
                                    <button 
                                        onClick={startGame}
                                        className="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg"
                                    >
                                        BAŞLA
                                    </button>
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

    return (
        <iframe
            srcDoc={gameHtml}
            style={{ width: '100%', height: '100vh', border: 'none' }}
            title="Balon Patlatma Oyunu"
        />
    );
}
