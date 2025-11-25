'use client';

import { Suspense, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBalloonHuntQuestions, submitBalloonHuntScore } from '../actions';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function BalloonHuntGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [levels, setLevels] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    const gameHtml = useMemo(() => {
        if (levels.length === 0) return '';
        const topicName = searchParams.get('topicName') || 'Genel';
        
        return `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>Balon Avcısı</title>
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
                    }
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
                    .question-panel { position: absolute; bottom: 80px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: center; z-index: 50; }
                    .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.2rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; }
                    .game-ui { position: absolute; top: 1rem; left: 1rem; right: 1rem; display: flex; justify-content: space-between; align-items: center; z-index: 50; }
                    .ui-box { background: rgba(255,255,255,0.8); color: #0f172a; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); backdrop-filter: blur(5px); }
                    .lives-container { display: flex; gap: 0.5rem; }
                    .start-screen, .gameover-screen { position: absolute; inset: 0; background: rgba(14, 165, 233, 0.8); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(5px); }
                    .screen-content { background: white; padding: 2rem; border-radius: 1.5rem; text-align: center; max-width: 24rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border-bottom: 8px solid #38bdf8; }
                </style>
            </head>
            <body>
                <div id="game-canvas">
                    <div class="cloud" style="top: 10%; width: 100px; height: 40px; animation-duration: 20s;"></div>
                    <div class="cloud" style="top: 20%; left: 60%; width: 120px; height: 50px; animation-duration: 15s;"></div>
                    <div class="cloud" style="top: 5%; left: 80%; width: 80px; height: 30px; animation-duration: 25s;"></div>
                    
                    <div class="game-ui">
                        <div id="lives" class="ui-box lives-container"></div>
                        <div id="score" class="ui-box">Puan: 0</div>
                    </div>
                    <div id="game-container"></div>
                    <div class="shooter-base"></div>
                    <div id="shooter-barrel" class="shooter"></div>
                    <div class="question-panel">
                        <div id="question-box" class="question-box"></div>
                    </div>

                    <div id="start-screen" class="start-screen">
                        <div class="screen-content">
                            <h1 id="start-title" class="text-4xl font-bold text-sky-600 mb-4 header-font"></h1>
                            <p id="start-description" class="text-gray-600 mb-8 text-lg"></p>
                            <button id="start-button" class="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg"></button>
                        </div>
                    </div>

                     <div id="gameover-screen" class="gameover-screen" style="display: none;">
                        <div class="screen-content">
                             <h1 id="gameover-title" class="text-4xl font-bold text-sky-600 mb-4 header-font"></h1>
                             <p id="gameover-description" class="text-gray-600 mb-8 text-lg"></p>
                             <div class="flex flex-col gap-2">
                                <button id="restart-button" class="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg"></button>
                                <button id="exit-button" class="px-10 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-full text-base transition-colors">Çık</button>
                            </div>
                        </div>
                    </div>

                </div>

                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        const gameContainer = document.getElementById('game-container');
                        const scoreDisplay = document.getElementById('score');
                        const livesContainer = document.getElementById('lives');
                        const questionBox = document.getElementById('question-box');
                        const shooterBarrel = document.getElementById('shooter-barrel');
                        const startScreen = document.getElementById('start-screen');
                        const gameoverScreen = document.getElementById('gameover-screen');
                        const startButton = document.getElementById('start-button');
                        const restartButton = document.getElementById('restart-button');
                        const exitButton = document.getElementById('exit-button');

                        const LEVELS = ${JSON.stringify(levels)};
                        const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
                        
                        let gameState = 'start';
                        let score = 0;
                        let lives = 3;
                        let levelIndex = 0;
                        let balloons = [];
                        let projectiles = [];
                        let effects = [];
                        let angle = 0;
                        let animationFrameId;
                        let lastSpawnTime = 0;

                        function updateUI() {
                            if (gameState === 'start' || gameState === 'gameover') {
                                const isStart = gameState === 'start';
                                const screen = isStart ? startScreen : gameoverScreen;
                                const titleEl = document.getElementById(isStart ? 'start-title' : 'gameover-title');
                                const descEl = document.getElementById(isStart ? 'start-description' : 'gameover-description');
                                const buttonEl = document.getElementById(isStart ? 'start-button' : 'restart-button');

                                screen.style.display = 'flex';
                                titleEl.textContent = isStart ? 'Balon Avcısı 🏹' : 'Oyun Bitti!';
                                descEl.innerHTML = isStart ? 'Aşağıdaki soruyu oku. Doğru cevabı taşıyan balonu vur!' : 'Harika bir oyundu! Toplam puanın: ' + score;
                                buttonEl.textContent = isStart ? 'BAŞLA' : 'TEKRAR OYNA';
                            } else {
                                startScreen.style.display = 'none';
                                gameoverScreen.style.display = 'none';
                            }
                            
                            scoreDisplay.textContent = 'Puan: ' + score;
                            questionBox.textContent = LEVELS[levelIndex % LEVELS.length].q;
                            renderLives();
                        }

                        function startGame() {
                            score = 0;
                            lives = 3;
                            levelIndex = 0;
                            balloons = [];
                            projectiles = [];
                            effects = [];
                            gameState = 'playing';
                            lastSpawnTime = 0;
                            updateUI();
                            gameLoop();
                        }
                        
                        function withdrawAndSave() {
                             window.parent.postMessage({ type: 'SAVE_SCORE', payload: { score, gameType: 'Balon Avcısı', context: 'Konu: ' + '${topicName}' } }, '*');
                        }

                        function renderLives() {
                            if (!livesContainer) return;
                            livesContainer.innerHTML = '';
                            for (let i = 0; i < 3; i++) {
                                const heartDiv = document.createElement('div');
                                heartDiv.innerHTML = '❤️';
                                heartDiv.className = 'h-6 w-6 transition-all ' + (i < lives ? 'text-red-500 fill-red-500' : 'text-gray-300');
                                livesContainer.appendChild(heartDiv);
                            }
                        }

                        function handleBalloonClick(balloon) {
                            if (balloon.isCorrect) {
                                score += 10;
                                addEffect(balloon.x, balloon.y, "+10", "#22c55e");
                                setLevelIndex(prev => prev + 1);
                                balloons = balloons.filter(b => b.id !== balloon.id);
                            } else {
                                lives -= 1;
                                addEffect(balloon.x, balloon.y, "-1 Can", "#ef4444");
                                balloons = balloons.filter(b => b.id !== balloon.id);
                                if (lives <= 0) {
                                    gameState = 'gameover';
                                    updateUI();
                                }
                            }
                            updateUI();
                        }

                        function createBalloon() {
                            const currentLevel = LEVELS[levelIndex % LEVELS.length];
                            const isCorrect = Math.random() > 0.6;
                            const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                            
                            const newBalloon = {
                                id: Date.now(),
                                x: Math.random() * (window.innerWidth - 80) + 40,
                                y: window.innerHeight + 100,
                                text: text,
                                speed: Math.random() * 1.5 + 1.5,
                                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                                isCorrect: text === currentLevel.a
                            };
                            balloons.push(newBalloon);
                        }

                        function renderBalloons() {
                            if (!gameContainer) return;
                            gameContainer.innerHTML = ''; // Clear only balloons and projectiles
                            balloons.forEach(balloon => {
                                const el = document.createElement('div');
                                el.className = 'balloon';
                                el.style.left = balloon.x + 'px';
                                el.style.top = balloon.y + 'px';
                                el.innerHTML = '<svg style="position:absolute;z-index:-1;width:100%;height:100%;" viewBox="0 0 100 125"><defs><radialGradient id="grad' + balloon.id + '" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="rgba(255,255,255,0.7)"/><stop offset="100%" stop-color="' + balloon.color + '"/></radialGradient></defs><path d="M50,0C12.5,0,0,12.5,0,50c0,12.5,12.5,25,25,25c12.5,0,25,12.5,25,25s12.5,25,25,25s25-12.5,25-25s12.5-25,25-25S100,37.5,100,25S87.5,0,50,0Z" fill="url(#grad' + balloon.id + ')"/></svg><span style="padding: 5px;">' + balloon.text + '</span>';
                                el.onclick = () => handleBalloonClick(balloon);
                                gameContainer.appendChild(el);
                            });
                        }
                        
                        function gameLoop(time) {
                            if (gameState !== 'playing') {
                                cancelAnimationFrame(animationFrameId);
                                return;
                            }
                            
                            if (time - lastSpawnTime > 1500) {
                                createBalloon();
                                lastSpawnTime = time;
                            }
                            
                            balloons = balloons.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -150);
                            renderBalloons();
                            
                            animationFrameId = requestAnimationFrame(gameLoop);
                        }
                        
                        // Initial setup
                        startButton.onclick = startGame;
                        restartButton.onclick = startGame;
                        exitButton.onclick = withdrawAndSave;
                        updateUI();
                    });
                </script>
            </body>
            </html>
        `;
    }, [levels, searchParams]);

    useEffect(() => {
        if (typeof window === 'undefined' || !user) return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'SAVE_SCORE') {
                const { score, gameType, context } = event.data.payload;
                submitBalloonHuntScore(user.uid, score, context).then(result => {
                    if (result.success) {
                        router.push('/student/activities');
                    } else {
                        // Handle error if needed
                        console.error("Failed to save score");
                    }
                });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user, router]);
    

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center text-center p-4">
                <div>
                    <h2 className="text-xl font-semibold text-destructive">Hata!</h2>
                    <p className="text-muted-foreground mt-2">{error}</p>
                    <Button asChild variant="link" className="mt-4">
                         <Link href="/student/balon-avcisi">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    return (
          <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <iframe
                srcDoc={gameHtml}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Balon Avcısı Oyunu"
                sandbox="allow-scripts allow-same-origin"
            />
          </div>
    );
};

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <BalloonHuntGame />
        </Suspense>
    );
}
