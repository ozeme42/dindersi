
'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBalloonHuntQuestions, submitBalloonHuntScore } from '../actions';
import type { BalloonHuntLevel } from '../actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Home, Repeat, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';


function BalloonHuntGame() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [levels, setLevels] = useState<BalloonHuntLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const gameHtml = useMemo(() => {
        if (levels.length === 0) return '';
        const topicName = searchParams.get('topicName') || 'Genel';
        
        // This entire HTML, CSS, and JS will be put into an iframe
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
        .balloon { position: absolute; width: 80px; height: 95px; font-weight: bold; font-size: 0.95rem; line-height: 1; display: flex; align-items: center; justify-content: center; text-align: center; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); z-index: 10; }
        .projectile { position: absolute; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; z-index: 15; box-shadow: 0 0 5px #ef4444; }
        .pop-effect { position: absolute; font-size: 2rem; font-weight: bold; animation: popAnim 0.4s ease-out forwards; z-index: 30; pointer-events: none; }
        @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        .question-panel { position: absolute; bottom: 20px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: center; z-index: 50; }
        .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.2rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect, useRef, useCallback } = React;
        const LEVELS = ${JSON.stringify(levels)};
        const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

        function App() {
            const [gameState, setGameState] = useState('start');
            const [score, setScore] = useState(0);
            const [levelIndex, setLevelIndex] = useState(0);
            const [lives, setLives] = useState(3);
            const [balloons, setBalloons] = useState([]);
            const [projectiles, setProjectiles] = useState([]);
            const [effects, setEffects] = useState([]);
            const [angle, setAngle] = useState(0);
            const requestRef = useRef();
            const lastSpawnTime = useRef(0);

            const postGameResult = (finalScore) => {
                window.parent.postMessage({ type: 'balloonHuntResult', score: finalScore }, '*');
            };

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

            const createBalloon = useCallback(() => {
                const currentLevel = LEVELS[levelIndex % LEVELS.length];
                const isCorrect = Math.random() > 0.6;
                const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                
                const newBalloon = {
                    id: Date.now() + Math.random(),
                    x: Math.random() * (window.innerWidth - 80) + 40,
                    y: window.innerHeight + 100,
                    text: text,
                    speed: Math.random() * 1.5 + 1.5,
                    color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                    isCorrect: text === currentLevel.a
                };
                setBalloons(prev => [...prev, newBalloon]);
            }, [levelIndex]);

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
                })).filter(p => p.x > -10 && p.x < window.innerWidth + 10 && p.y > -10 && p.y < window.innerHeight + 10));

                let newBalloons = [...balloons];
                let newProjectiles = [...projectiles];
                let hitOccurred = false;

                for (let i = newProjectiles.length - 1; i >= 0; i--) {
                    const p = newProjectiles[i];
                    for (let j = newBalloons.length - 1; j >= 0; j--) {
                        const b = newBalloons[j];
                        const dx = p.x - b.x;
                        const dy = p.y - b.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 50) { // Increased hit radius
                            newProjectiles.splice(i, 1);
                            newBalloons.splice(j, 1);
                            if (b.isCorrect) handleCorrectHit(b.x, b.y); else handleWrongHit(b.x, b.y);
                            hitOccurred = true;
                            break;
                        }
                    }
                    if (hitOccurred) break;
                }
                
                if(hitOccurred){
                    setBalloons(newBalloons);
                    setProjectiles(newProjectiles);
                }

                requestRef.current = requestAnimationFrame(updateGame);
            }, [gameState, balloons, projectiles]);

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
                const newLives = lives - 1;
                setLives(newLives);
                if (newLives <= 0) {
                    setGameState('gameover');
                    postGameResult(score);
                }
            };
            
            const addEffect = (x, y, text, color) => {
                const id = Date.now() + Math.random();
                setEffects(prev => [...prev, { id, x, y, text, color }]);
                setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 800);
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
                    <div className="absolute top-4 left-4 flex gap-2 z-50">
                        {Array.from({ length: 3 }).map((_, i) => (
                           <div key={i} className={'text-2xl transition-all ' + (i < lives ? 'text-red-500' : 'text-gray-300')}>❤️</div>
                        ))}
                    </div>

                    <div className="absolute top-4 right-4 bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg z-50 border-2 border-sky-200">
                        Puan: {score}
                    </div>
                    {balloons.map(b => {
                        const el = document.createElement('div');
                        el.className = 'balloon';
                        el.style.left = b.x - 40 + 'px';
                        el.style.top = b.y - 50 + 'px';
                        el.innerHTML = '<svg style="position:absolute;z-index:-1;width:100%;height:100%;" viewBox="0 0 100 125"><defs><radialGradient id="grad' + b.id + '" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="rgba(255,255,255,0.7)"/><stop offset="100%" stop-color="' + b.color + '"/></radialGradient></defs><path d="M50,0C12.5,0,0,12.5,0,50c0,12.5,12.5,25,25,25c12.5,0,25,12.5,25,25s12.5,25,25,25s25-12.5,25-25s12.5-25,25-25S100,37.5,100,25S87.5,0,50,0Z" fill="url(#grad' + b.id + ')"/></svg><span style="padding: 5px;">' + b.text + '</span>';
                        return <div key={b.id} dangerouslySetInnerHTML={{ __html: el.outerHTML }} />;
                    })}
                    
                    {projectiles.map(p => <div key={p.id} className="projectile" style={{ left: p.x, top: p.y }}></div>)}
                    {effects.map(e => <div key={e.id} className="pop-effect" style={{ left: e.x, top: e.y, color: e.color }}>{e.text}</div>)}
                    
                    <div className="shooter-base"></div>
                    <div className="shooter" style={{ transform: 'translateX(-50%) rotate(' + angle + 'deg)' }}>
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                    </div>
                    
                    {gameState === 'playing' && <div className="question-panel"><div className="question-box animate-[bounce_2s_infinite]"><span className="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>{LEVELS[levelIndex % LEVELS.length].q}</div></div>}
                    
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
                                <p className="text-gray-600 mb-2 text-xl">Toplam Puanın: <span className="font-bold">{score}</span></p>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
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
            .finally(() => setIsLoading(false));
    }, [searchParams]);
    
    const handleGameEnd = useCallback(async (event: MessageEvent) => {
        if (event.data.type === 'balloonHuntResult' && user) {
            const finalScore = event.data.score;
            if (finalScore > 0) {
                 await submitBalloonHuntScore(user.uid, finalScore, `Balon Avcısı - ${searchParams.get('topicName') || 'Genel'}`);
                 toast({ title: "Puanın Kaydedildi!", description: `${finalScore} puan kazandın.` });
            }
        }
    }, [user, searchParams, toast]);

    useEffect(() => {
        window.addEventListener('message', handleGameEnd);
        return () => {
            window.removeEventListener('message', handleGameEnd);
        };
    }, [handleGameEnd]);
    
    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md text-center" role="alert">
                    <strong className="font-bold">Hata! </strong>
                    <span className="block sm:inline ml-2">{error}</span>
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
