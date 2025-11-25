
'use client';

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getBalloonHuntQuestions, submitBalloonHuntScore } from '../actions';
import type { BalloonHuntLevel } from '../actions';
import { Loader2 } from 'lucide-react';

function BalloonHuntGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [levels, setLevels] = useState<BalloonHuntLevel[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const topicName = useMemo(() => searchParams.get('topicName') || 'Genel', [searchParams]);

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
        
        // Safely serialize the levels data to be injected into the script.
        const serializedLevels = JSON.stringify(levels);

        return `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>Balon Avcısı</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Nunito:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Nunito', sans-serif;
                        color: white;
                        overflow: hidden;
                        touch-action: none;
                        user-select: none;
                        margin: 0;
                        padding: 0;
                    }
                    .header-font { font-family: 'Fredoka', sans-serif; }
                    #game-container {
                        width: 100vw;
                        height: 100vh;
                        position: relative;
                        background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%);
                        cursor: crosshair;
                    }
                    .cloud { position: absolute; background: white; border-radius: 50%; opacity: 0.8; animation: floatCloud linear infinite; }
                    .cloud::after, .cloud::before { content: ''; position: absolute; background: white; border-radius: 50%; }
                    @keyframes floatCloud { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }
                    .balloon { position: absolute; width: 80px; height: 100px; font-weight: bold; font-size: 0.85rem; line-height: 1; z-index: 10; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; text-align: center; }
                    .shooter { position: absolute; bottom: 20px; left: 50%; transform-origin: center bottom; width: 6px; height: 60px; background: #475569; z-index: 20; border-radius: 3px; }
                    .shooter-base { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 30px; background: #1e293b; border-radius: 30px 30px 0 0; z-index: 19; }
                    .projectile { position: absolute; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; z-index: 15; box-shadow: 0 0 5px #ef4444; }
                    .pop-effect { position: absolute; font-size: 2rem; font-weight: bold; animation: popAnim 0.4s ease-out forwards; z-index: 30; pointer-events: none; }
                    @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
                    .game-screen { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 50; backdrop-filter: blur(4px); background: rgba(14, 165, 233, 0.8); }
                    .dialog-box { background: white; color: #0f172a; padding: 2rem; border-radius: 1.5rem; text-align: center; max-width: 90%; width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border-bottom: 8px solid #cbd5e1; }
                    .start-button { padding: 1rem 2.5rem; background-color: #facc15; color: #78350f; font-weight: 900; border-radius: 9999px; font-size: 1.25rem; transition: transform 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .start-button:hover { transform: scale(1.05); }
                    .header { position: absolute; top: 1rem; left: 1rem; right: 1rem; display: flex; justify-content: space-between; align-items: center; z-index: 40; }
                    .header-box { background: rgba(255, 255, 255, 0.9); color: #0ea5e9; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid white; }
                    .question-panel { position: absolute; bottom: 20px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: center; z-index: 50; }
                    .question-box { background: white; color: #0f172a; padding: 15px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: bold; font-size: 1.2rem; text-align: center; border-bottom: 6px solid #cbd5e1; pointer-events: auto; max-width: 90%; animation: bounce 2s infinite; }
                    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-5px); } }
                    .shake-anim { animation: shake 0.3s ease-out; }
                </style>
            </head>
            <body>
                <div id="game-container"></div>
                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        const gameContainer = document.getElementById('game-container');
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
                        const shooterBase = document.createElement('div');
                        const shooterBarrel = document.createElement('div');

                        // Inject data from React
                        const LEVELS = ${serializedLevels};
                        const TOPIC_NAME = "${topicName}";

                        function updateUI() {
                            gameContainer.innerHTML = '';
                            if (gameState === 'start' || gameState === 'gameover') {
                                const screen = document.createElement('div');
                                screen.className = 'game-screen';
                                const dialog = document.createElement('div');
                                dialog.className = 'dialog-box';
                                if (gameState === 'start') {
                                    dialog.innerHTML = '<h1 class="text-4xl font-bold text-sky-600 mb-4 header-font">Balon Avcısı</h1><p class="text-gray-600 mb-8 text-lg">Aşağıdaki soruyu oku.<br/>Doğru cevabı taşıyan balonu vur!</p>';
                                    const startButton = document.createElement('button');
                                    startButton.textContent = 'BAŞLA';
                                    startButton.className = 'start-button';
                                    startButton.onclick = startGame;
                                    dialog.appendChild(startButton);
                                } else { // gameover
                                    dialog.innerHTML = '<h1 class="text-3xl font-bold text-red-600 mb-4 header-font">Oyun Bitti!</h1><p class="text-gray-600 mb-2 text-xl">Puanın: <strong class="text-sky-700">' + score + '</strong></p>';
                                    const buttonContainer = document.createElement('div');
                                    buttonContainer.className = 'flex flex-col gap-2 mt-6';
                                    const restartButton = document.createElement('button');
                                    restartButton.textContent = 'Tekrar Oyna';
                                    restartButton.className = 'start-button bg-sky-500 text-white';
                                    restartButton.onclick = startGame;
                                    const exitButton = document.createElement('button');
                                    exitButton.textContent = 'Çık';
                                    exitButton.className = 'start-button bg-gray-400 text-gray-800';
                                    exitButton.onclick = withdrawAndSave;
                                    buttonContainer.appendChild(restartButton);
                                    buttonContainer.appendChild(exitButton);
                                    dialog.appendChild(buttonContainer);
                                }
                                screen.appendChild(dialog);
                                gameContainer.appendChild(screen);
                            } else if (gameState === 'playing') {
                                // Add header
                                const header = document.createElement('div');
                                header.className = 'header';
                                const scoreDisplay = document.createElement('div');
                                scoreDisplay.id = 'score-display';
                                scoreDisplay.className = 'header-box';
                                const livesDisplay = document.createElement('div');
                                livesDisplay.id = 'lives-display';
                                livesDisplay.className = 'header-box flex gap-1';
                                header.appendChild(livesDisplay);
                                header.appendChild(scoreDisplay);
                                
                                // Add question panel
                                const questionPanel = document.createElement('div');
                                questionPanel.className = 'question-panel';
                                const questionBox = document.createElement('div');
                                questionBox.id = 'question-box';
                                questionBox.className = 'question-box';
                                questionPanel.appendChild(questionBox);

                                gameContainer.appendChild(header);
                                gameContainer.appendChild(questionPanel);

                                // Add clouds
                                ['10%', '20%', '5%'].forEach((top, i) => {
                                    const cloud = document.createElement('div');
                                    cloud.className = 'cloud';
                                    cloud.style.top = top;
                                    cloud.style.left = (i * 40) + '%';
                                    cloud.style.width = (100 + i*20) + 'px';
                                    cloud.style.height = (40 + i*10) + 'px';
                                    cloud.style.animationDuration = (15 + i*10) + 's';
                                    gameContainer.appendChild(cloud);
                                });

                                // Add shooter
                                shooterBase.className = 'shooter-base';
                                shooterBarrel.className = 'shooter';
                                shooterBarrel.innerHTML = '<div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>';
                                gameContainer.appendChild(shooterBase);
                                gameContainer.appendChild(shooterBarrel);
                            }
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
                            animationFrameId = requestAnimationFrame(gameLoop);
                        }

                        function handleCorrectHit(balloon) {
                            score += 10;
                            addEffect(balloon.x, balloon.y, "+10", "#22c55e");
                            setTimeout(() => {
                                levelIndex = (levelIndex + 1) % LEVELS.length;
                                balloons = balloons.filter(b => !b.isCorrect); 
                            }, 500);
                        }

                        function handleWrongHit(balloon) {
                            lives -= 1;
                            addEffect(balloon.x, balloon.y, "-1 Can", "#ef4444");
                            if (lives <= 0) {
                                gameState = 'gameover';
                                withdrawAndSave();
                                updateUI();
                            }
                        }
                        
                        function addEffect(x, y, text, color) {
                            const id = Date.now() + Math.random();
                            effects.push({ id, x, y, text, color });
                            setTimeout(() => effects = effects.filter(e => e.id !== id), 500);
                        }

                        function handleInput(e) {
                            if (gameState !== 'playing') return;
                            e.preventDefault();
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
                            angle = clampedAngle;
                            if (shooterBarrel) shooterBarrel.style.transform = 'translateX(-50%) rotate(' + angle + 'deg)';
                            if (e.type === 'mousedown' || e.type === 'touchstart') {
                                shoot(clampedAngle);
                            }
                        }

                        function shoot(fireAngle) {
                            const radian = fireAngle * Math.PI / 180;
                            const startX = window.innerWidth / 2 + Math.sin(radian) * 60;
                            const startY = window.innerHeight - 20 - Math.cos(radian) * 60;
                            projectiles.push({ id: Date.now(), x: startX, y: startY, angle: fireAngle });
                        }

                        function createBalloon() {
                            const currentLevel = LEVELS[levelIndex % LEVELS.length];
                            const isCorrect = Math.random() > 0.6;
                            const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                            balloons.push({
                                id: Date.now(),
                                x: Math.random() * (window.innerWidth - 80) + 40,
                                y: window.innerHeight + 50,
                                text: text,
                                speed: Math.random() * 1 + 1.5,
                                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                                isCorrect: text === currentLevel.a
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
                            projectiles = projectiles.map(p => ({
                                ...p,
                                x: p.x + Math.sin(p.angle * Math.PI / 180) * 10,
                                y: p.y - Math.cos(p.angle * Math.PI / 180) * 10
                            })).filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0);
                            
                            let hitDetected = false;
                            const newProjectiles = [];
                            const newBalloons = [];
                            for(const p of projectiles) {
                                let p_hit = false;
                                for(const b of balloons) {
                                    const dx = p.x - b.x;
                                    const dy = p.y - b.y;
                                    const dist = Math.sqrt(dx*dx + dy*dy);
                                    if(dist < 50) {
                                        p_hit = true;
                                        b.hit = true;
                                        if (b.isCorrect) handleCorrectHit(b); else handleWrongHit(b);
                                        break;
                                    }
                                }
                                if(!p_hit) newProjectiles.push(p);
                            }
                            balloons.forEach(b => { if(!b.hit) newBalloons.push(b) });
                            projectiles = newProjectiles;
                            balloons = newBalloons;

                            renderAll();
                            animationFrameId = requestAnimationFrame(gameLoop);
                        }

                        function renderAll() {
                            renderBalloons();
                            renderProjectiles();
                            renderEffects();
                            renderScore();
                            renderLives();
                            renderQuestion();
                        }
                        
                        function renderBalloons() {
                            gameContainer.querySelectorAll('.balloon').forEach(el => el.remove());
                            balloons.forEach(balloon => {
                                const el = document.createElement('div');
                                el.className = 'balloon';
                                el.style.left = (balloon.x - 40) + 'px';
                                el.style.top = (balloon.y - 50) + 'px';
                                el.style.background = 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), ' + balloon.color + ')';
                                el.style.filter = 'drop-shadow(2px 4px 6px black)';
                                el.innerHTML = '<span>' + balloon.text + '</span>';
                                gameContainer.appendChild(el);
                            });
                        }

                        function renderProjectiles() {
                            gameContainer.querySelectorAll('.projectile').forEach(el => el.remove());
                            projectiles.forEach(p => {
                                const el = document.createElement('div');
                                el.className = 'projectile';
                                el.style.left = p.x - 5 + 'px';
                                el.style.top = p.y - 5 + 'px';
                                gameContainer.appendChild(el);
                            });
                        }
                        
                        function renderEffects() {
                            gameContainer.querySelectorAll('.pop-effect').forEach(el => el.remove());
                            effects.forEach(effect => {
                                const el = document.createElement('div');
                                el.className = 'pop-effect';
                                el.style.left = effect.x + 'px';
                                el.style.top = effect.y + 'px';
                                el.style.color = effect.color;
                                el.textContent = effect.text;
                                gameContainer.appendChild(el);
                            });
                        }

                        function renderScore() {
                            const scoreEl = document.getElementById('score-display');
                            if(scoreEl) scoreEl.textContent = 'Puan: ' + score;
                        }

                        function renderLives() {
                            const livesContainer = document.getElementById('lives-display');
                            if (!livesContainer) return;
                            livesContainer.innerHTML = '';
                            for (let i = 0; i < 3; i++) {
                                const heartDiv = document.createElement('div');
                                heartDiv.innerHTML = '❤️';
                                heartDiv.className = 'h-6 w-6 transition-all ' + (i < lives ? 'text-red-500 fill-red-500' : 'text-gray-300');
                                livesContainer.appendChild(heartDiv);
                            }
                        }

                        function renderQuestion() {
                            const questionEl = document.getElementById('question-box');
                            if(questionEl) questionEl.innerHTML = '<span class="text-sky-600 text-sm block opacity-70 uppercase tracking-widest">HEDEF</span>' + LEVELS[levelIndex % LEVELS.length].q;
                        }
                        
                        function withdrawAndSave() {
                            const payload = { score, gameType: 'Balon Avcısı', context: 'Konu: ' + TOPIC_NAME };
                            window.parent.postMessage(payload, '*');
                        }

                        // Initial setup
                        updateUI();
                    });
                </script>
            </body>
            </html>
        `;
    }, [levels, topicName]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && typeof event.data.score !== 'undefined') {
                if(user && event.data.score > 0) {
                    submitBalloonHuntScore(user.uid, event.data.score, event.data.context);
                }
                router.push('/student/activities');
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user, router]);
    
    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="flex h-screen w-full items-center justify-center p-4 text-center text-red-500">{error}</div>;
    }

    return (
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            <iframe
                srcDoc={gameHtml}
                style={{ border: 'none', width: '100%', height: '100%' }}
                title="Balon Avcısı Oyunu"
                sandbox="allow-scripts allow-same-origin"
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
