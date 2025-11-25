
'use client';

import { Suspense, useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBalloonHuntQuestions, submitBalloonHuntScore } from '../actions';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

type Level = {
    q: string;
    a: string;
    wrongs: string[];
};

function BalloonHuntGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [levels, setLevels] = useState<Level[]>([]);
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
                <script src="https://cdn.tailwindcss.com"><\/script>
                <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Nunito:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; font-family: 'Nunito', sans-serif; background-color: #0ea5e9; color: white; touch-action: none; user-select: none; }
                    .header-font { font-family: 'Fredoka', sans-serif; }
                    #game-container { width: 100%; height: 100%; position: relative; background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%); cursor: crosshair; }
                    .balloon { position: absolute; width: 80px; height: 100px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; font-size: 0.9rem; line-height: 1.1; z-index: 10; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.4); transform: translate(-50%, -50%); }
                    .projectile { position: absolute; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; z-index: 15; box-shadow: 0 0 5px #ef4444; transform: translate(-50%, -50%);}
                    .pop-effect { position: absolute; font-size: 1.5rem; font-weight: bold; animation: popAnim 0.4s ease-out forwards; z-index: 30; pointer-events: none; transform: translate(-50%,-50%); }
                    @keyframes popAnim { 0% { transform: translate(-50%,-50%) scale(0.5); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(2); opacity: 0; } }
                    .shooter-base { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 30px; background: #1e293b; border-radius: 30px 30px 0 0; z-index: 19; }
                    .shooter-barrel { position: absolute; bottom: 20px; left: 50%; transform-origin: center bottom; width: 6px; height: 60px; background: #475569; z-index: 20; border-radius: 3px; }
                </style>
            </head>
            <body>
                <div id="game-container">
                    <div id="ui-container" class="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">
                        <div id="lives-container" class="flex gap-1"></div>
                        <div id="score-display" class="bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg border-2 border-sky-200">Puan: 0</div>
                    </div>
                    <div id="question-panel" class="absolute bottom-4 left-4 right-4 text-center pointer-events-none z-40">
                         <div id="question-box" class="bg-white text-slate-800 p-4 rounded-2xl shadow-lg inline-block max-w-full pointer-events-auto">
                            <span id="question-title" class="text-sky-600 text-sm block uppercase tracking-widest font-bold">HEDEF</span>
                            <span id="question-text" class="text-xl font-bold"></span>
                        </div>
                    </div>
                    <div class="shooter-base"></div>
                    <div id="shooter-barrel" class="shooter-barrel" style="transform: translateX(-50%) rotate(0deg);"><div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 rounded-full"></div></div>
                    <div id="modal-overlay" class="hidden absolute inset-0 bg-sky-900/80 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div class="bg-white p-8 rounded-3xl text-center max-w-sm shadow-2xl border-b-8 border-sky-500">
                             <h1 id="modal-title" class="text-4xl font-bold text-sky-600 mb-4 header-font"></h1>
                             <p id="modal-text" class="text-gray-600 mb-8 text-lg"></p>
                             <button id="modal-button" class="px-10 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-full text-xl transition-transform hover:scale-105 shadow-lg"></button>
                             <button id="exit-button" class="hidden w-full mt-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Çık</button>
                        </div>
                    </div>
                </div>

                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        const gameContainer = document.getElementById('game-container');
                        const scoreDisplay = document.getElementById('score-display');
                        const livesContainer = document.getElementById('lives-container');
                        const questionText = document.getElementById('question-text');
                        const barrel = document.getElementById('shooter-barrel');
                        const modalOverlay = document.getElementById('modal-overlay');
                        const modalTitle = document.getElementById('modal-title');
                        const modalText = document.getElementById('modal-text');
                        const modalButton = document.getElementById('modal-button');
                        const exitButton = document.getElementById('exit-button');

                        let gameState = 'start';
                        let score = 0;
                        let lives = 3;
                        let levelIndex = 0;
                        let balloons = [];
                        let projectiles = [];
                        let effects = [];
                        let angle = 0;
                        let lastSpawnTime = 0;
                        let animationFrameId;
                        const LEVELS = ${JSON.stringify(levels)};
                        const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

                        function updateUI() {
                            if (gameState === 'start' || gameState === 'gameover') {
                                modalOverlay.classList.remove('hidden');
                                modalTitle.textContent = gameState === 'start' ? 'Balon Avcısı 🏹' : 'Oyun Bitti!';
                                modalText.innerHTML = gameState === 'start' ? 'Aşağıdaki soruyu oku. Doğru cevabı taşıyan balonu vur!' : 'Harika bir oyundu! Toplam puanın: <span class="font-bold text-2xl text-sky-600">' + score + '</span>';
                                modalButton.textContent = gameState === 'start' ? 'BAŞLA' : 'TEKRAR OYNA';
                                exitButton.style.display = gameState === 'gameover' ? 'block' : 'none';
                            } else {
                                modalOverlay.classList.add('hidden');
                            }
                            questionText.textContent = LEVELS[levelIndex % LEVELS.length].q;
                            scoreDisplay.textContent = 'Puan: ' + score;
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
                            gameLoop(0);
                        }
                        
                        function withdrawAndSave() {
                            const topicName = "${topicName || 'Genel'}";
                            const payload = { score: score, gameType: 'Balon Avcısı', context: 'Konu: ' + topicName };
                            window.parent.postMessage({ type: 'SAVE_SCORE_AND_EXIT', payload }, '*');
                        };

                        function createBalloon() {
                            const currentLevel = LEVELS[levelIndex % LEVELS.length];
                            const isCorrect = Math.random() > 0.6;
                            const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                            balloons.push({
                                id: Date.now() + Math.random(),
                                x: Math.random() * (window.innerWidth - 80) + 40,
                                y: window.innerHeight + 50,
                                text: text,
                                speed: Math.random() * 1 + 1,
                                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                                isCorrect: text === currentLevel.a
                            });
                        }
                        
                        function renderBalloons() {
                            gameContainer.querySelectorAll('.balloon').forEach(el => el.remove());
                            balloons.forEach(balloon => {
                                const el = document.createElement('div');
                                el.className = 'balloon';
                                el.style.left = balloon.x + 'px';
                                el.style.top = balloon.y + 'px';
                                el.style.backgroundColor = balloon.color;
                                el.textContent = balloon.text;
                                gameContainer.appendChild(el);
                            });
                        }

                        function renderProjectiles() {
                            gameContainer.querySelectorAll('.projectile').forEach(el => el.remove());
                            projectiles.forEach(p => {
                                const el = document.createElement('div');
                                el.className = 'projectile';
                                el.style.left = p.x + 'px';
                                el.style.top = p.y + 'px';
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
                            projectiles = projectiles.map(p => ({ ...p, x: p.x + Math.sin(p.angle * Math.PI / 180) * 10, y: p.y - Math.cos(p.angle * Math.PI / 180) * 10 })).filter(p => p.x > -10 && p.x < window.innerWidth + 10 && p.y > -10 && p.y < window.innerHeight + 10);
                            
                            let projectilesToRemove = new Set();
                            let balloonsToRemove = new Set();
                            
                            projectiles.forEach(p => {
                                balloons.forEach(b => {
                                    if (projectilesToRemove.has(p.id) || balloonsToRemove.has(b.id)) return;
                                    const dx = p.x - b.x;
                                    const dy = p.y - b.y;
                                    if (Math.sqrt(dx*dx + dy*dy) < 40) {
                                        projectilesToRemove.add(p.id);
                                        balloonsToRemove.add(b.id);
                                        if (b.isCorrect) {
                                            handleCorrectHit(b.x, b.y);
                                        } else {
                                            handleWrongHit(b.x, b.y);
                                        }
                                    }
                                });
                            });
                            
                            if (projectilesToRemove.size > 0 || balloonsToRemove.size > 0) {
                                projectiles = projectiles.filter(p => !projectilesToRemove.has(p.id));
                                balloons = balloons.filter(b => !balloonsToRemove.has(b.id));
                            }
                            
                            renderBalloons();
                            renderProjectiles();
                            renderEffects();
                            animationFrameId = requestAnimationFrame(gameLoop);
                        }

                        function handleCorrectHit(x, y) {
                            score += 10;
                            addEffect(x, y, "+10", "#22c55e");
                            setTimeout(() => {
                                levelIndex = (levelIndex + 1) % LEVELS.length;
                                balloons = balloons.filter(b => !b.isCorrect); 
                                updateUI();
                            }, 500);
                        }

                        function handleWrongHit(x, y) {
                            score = Math.max(0, score - 5);
                            lives--;
                            addEffect(x, y, "-5", "#ef4444");
                            updateUI();
                            if (lives <= 0) {
                                gameState = 'gameover';
                                withdrawAndSave(); // Automatically save score on game over
                                updateUI();
                            }
                        }

                        function addEffect(x, y, text, color) {
                            const id = Date.now() + Math.random();
                            effects.push({ id, x, y, text, color });
                            setTimeout(() => { effects = effects.filter(e => e.id !== id) }, 500);
                        }

                        function handleInput(e) {
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
                            angle = clampedAngle;
                            barrel.style.transform = 'translateX(-50%) rotate(' + angle + 'deg)';
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

                        modalButton.onclick = startGame;
                        exitButton.onclick = withdrawAndSave;
                        window.addEventListener('mousemove', handleInput);
                        window.addEventListener('mousedown', handleInput);
                        window.addEventListener('touchmove', handleInput, { passive: false });
                        window.addEventListener('touchstart', handleInput, { passive: false });

                        updateUI();
                    });
                </script>
            </body>
            </html>
        `;
    }, [levels, searchParams]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'SAVE_SCORE_AND_EXIT' && user) {
                const { score, gameType, context } = event.data.payload;
                submitBalloonHuntScore(user.uid, score, context).then(result => {
                    if (result.success) {
                        // Redirect or show message after saving
                    }
                });
                window.location.href = '/student/activities';
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [user]);

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (error) {
        return <div className="flex h-screen w-full items-center justify-center p-4 text-red-500">{error}</div>;
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
};
