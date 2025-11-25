
'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBalloonHuntQuestions, submitBalloonHuntScore } from '../actions';
import type { BalloonHuntLevel } from '../actions';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Home, Repeat } from 'lucide-react';

function BalloonHuntGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [levels, setLevels] = useState<BalloonHuntLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                <style>
                    body { font-family: 'Nunito', sans-serif; background-color: #0ea5e9; color: white; margin: 0; overflow: hidden; touch-action: none; user-select: none; }
                    #game-container { width: 100vw; height: 100vh; position: relative; background: linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 100%); cursor: crosshair; overflow: hidden; }
                    .header-font { font-family: 'Fredoka', sans-serif; }
                    .cloud { position: absolute; background: white; border-radius: 50%; opacity: 0.8; animation: floatCloud linear infinite; }
                    .cloud::after, .cloud::before { content: ''; position: absolute; background: white; border-radius: 50%; }
                    @keyframes floatCloud { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }
                    .balloon { position: absolute; width: 80px; height: 100px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; font-size: 0.9rem; line-height: 1.1; transition: transform 0.1s; z-index: 10; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.4); }
                    .pop-effect { position: absolute; font-size: 2rem; font-weight: bold; animation: popAnim 0.4s ease-out forwards; z-index: 30; pointer-events: none; }
                    @keyframes popAnim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
                    .ui-panel { position: absolute; top: 1rem; left: 1rem; right: 1rem; display: flex; justify-content: space-between; align-items: center; z-index: 50; }
                    .game-dialog { position: absolute; inset: 0; background: rgba(14, 165, 233, 0.8); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
                    .dialog-box { background: white; color: #0f172a; padding: 2rem; border-radius: 1.5rem; text-align: center; max-width: 90%; width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border-bottom: 8px solid #38bdf8; }
                    .dialog-box h1 { font-family: 'Fredoka', sans-serif; font-size: 2.5rem; font-weight: 600; color: #0284c7; margin-bottom: 1rem; }
                    .dialog-box p { color: #475569; margin-bottom: 2rem; font-size: 1.125rem; }
                    .dialog-button { cursor: pointer; padding: 1rem 2rem; border: none; border-radius: 9999px; font-weight: 900; font-size: 1.25rem; transition: transform 0.1s; }
                    .start-button { background-color: #facc15; color: #ca8a04; } .start-button:hover { transform: scale(1.05); }
                    .restart-button { background-color: #3b82f6; color: white; }
                    .exit-button { background-color: #64748b; color: white; margin-top: 0.5rem; font-size: 1rem; padding: 0.75rem 1.5rem; }
                </style>
            </head>
            <body>
                <div id="game-container">
                    <div class="cloud" style="top: 10%; width: 120px; height: 40px; animation-duration: 40s;"></div>
                    <div class="cloud" style="top: 20%; left: 60%; width: 150px; height: 50px; animation-duration: 25s;"></div>
                    <div class="cloud" style="top: 5%; left: 80%; width: 100px; height: 30px; animation-duration: 55s;"></div>
                </div>

                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        const gameContainer = document.getElementById('game-container');
                        const levels = ${JSON.stringify(levels)};
                        const topicName = "${topicName}";

                        let score = 0;
                        let lives = 3;
                        let levelIndex = 0;
                        let gameState = 'start'; // start, playing, gameover
                        let balloons = [];
                        let effects = [];
                        let lastSpawnTime = 0;
                        let animationFrameId;

                        function updateUI() {
                            let uiPanel = document.getElementById('ui-panel');
                            if (!uiPanel) {
                                uiPanel = document.createElement('div');
                                uiPanel.id = 'ui-panel';
                                uiPanel.className = 'ui-panel';
                                gameContainer.appendChild(uiPanel);
                            }
                            uiPanel.innerHTML =
                                '<div id="lives-container" class="flex gap-1">' +
                                Array.from({ length: 3 }).map((_, i) =>
                                    '<div class="h-6 w-6 transition-all ' + (i < lives ? 'text-red-500 fill-red-500' : 'text-gray-300') + '">❤️</div>'
                                ).join('') +
                                '</div>' +
                                '<div class="bg-white text-sky-600 px-4 py-2 rounded-full font-bold shadow-lg border-2 border-sky-200">Puan: ' + score + '</div>';
                        }
                        
                        function showDialog(type) {
                            let dialog = document.querySelector('.game-dialog');
                            if (dialog) dialog.remove();

                            dialog = document.createElement('div');
                            dialog.className = 'game-dialog';
                            
                            if (type === 'start') {
                                dialog.innerHTML =
                                    '<div class="dialog-box">' +
                                    '<h1>Balon Avcısı 🏹</h1>' +
                                    '<p>Aşağıdaki soruyu oku.<br/>Doğru cevabı taşıyan balonu vur!</p>' +
                                    '<button id="start-button" class="dialog-button start-button">BAŞLA</button>' +
                                    '</div>';
                                gameContainer.appendChild(dialog);
                                document.getElementById('start-button').onclick = startGame;
                            } else if (type === 'gameover') {
                                dialog.innerHTML =
                                    '<div class="dialog-box">' +
                                    '<h1>Oyun Bitti!</h1>' +
                                    '<p>Toplam Puanın: <span class="font-black text-2xl">' + score + '</span></p>' +
                                    '<div style="display: flex; gap: 1rem; justify-content: center;">' +
                                    '<button id="restart-button" class="dialog-button restart-button">Tekrar Oyna</button>' +
                                    '<button id="exit-button" class="dialog-button exit-button">Çık</button>' +
                                    '</div>' +
                                    '</div>';
                                gameContainer.appendChild(dialog);
                                document.getElementById('restart-button').onclick = startGame;
                                document.getElementById('exit-button').onclick = withdrawAndSave;
                            }
                        }

                        function withdrawAndSave() {
                            const payload = { score, gameType: 'Balon Avcısı', context: 'Konu: ' + topicName };
                            window.parent.postMessage({ type: 'SAVE_SCORE_AND_EXIT', payload: payload }, '*');
                        }

                        function startGame() {
                            score = 0;
                            lives = 3;
                            levelIndex = 0;
                            balloons = [];
                            effects = [];
                            gameState = 'playing';
                            lastSpawnTime = 0;
                            updateUI();
                            showDialog(null);
                            gameLoop(0);
                        }

                        function createBalloon(time) {
                            if (balloons.length > 10) return;
                            const currentLevel = levels[levelIndex % levels.length];
                            const isCorrect = Math.random() > 0.6;
                            const text = isCorrect ? currentLevel.a : currentLevel.wrongs[Math.floor(Math.random() * currentLevel.wrongs.length)];
                            
                            balloons.push({
                                id: time + Math.random(),
                                x: Math.random() * (window.innerWidth - 80) + 40,
                                y: window.innerHeight + 100, // Start below screen
                                text: text,
                                speed: Math.random() * 1.5 + 1.5, // Speed between 1.5 and 3
                                color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'][Math.floor(Math.random() * 7)],
                                isCorrect: text === currentLevel.a
                            });
                            lastSpawnTime = time;
                        }

                        function handleBalloonClick(balloon) {
                            if (gameState !== 'playing') return;

                            balloons = balloons.filter(b => b.id !== balloon.id);

                            if (balloon.isCorrect) {
                                score += 10;
                                setEffects([...effects, { id: Date.now(), x: balloon.x, y: balloon.y, text: "+10", color: "#22c55e" }]);
                                setTimeout(() => setLevelIndex(prev => prev + 1), 500);
                            } else {
                                lives -= 1;
                                setEffects([...effects, { id: Date.now(), x: balloon.x, y: balloon.y, text: "-1 Can", color: "#ef4444" }]);
                                if (lives <= 0) {
                                    gameState = 'gameover';
                                }
                            }
                            updateUI();
                        }
                        
                        function renderBalloons() {
                            gameContainer.querySelectorAll('.balloon').forEach(el => el.remove());
                            balloons.forEach(balloon => {
                                const el = document.createElement('div');
                                el.className = 'balloon';
                                el.style.left = balloon.x - 40 + 'px'; // Center balloon
                                el.style.top = balloon.y - 50 + 'px';
                                el.style.backgroundColor = balloon.color;
                                el.innerHTML = '<span>' + balloon.text + '</span>';
                                el.onclick = () => handleBalloonClick(balloon);
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
                        
                        function gameLoop(time) {
                            if (gameState !== 'playing') {
                                cancelAnimationFrame(animationFrameId);
                                if(gameState === 'gameover') showDialog('gameover');
                                return;
                            }
                            
                            if (time - lastSpawnTime > 1500) {
                                createBalloon(time);
                            }
                            
                            balloons.forEach(b => { b.y -= b.speed; });
                            balloons = balloons.filter(b => b.y > -150);

                            renderBalloons();
                            renderEffects();
                            
                            animationFrameId = requestAnimationFrame(gameLoop);
                        }
                        
                        showDialog('start');
                        updateUI();
                    });
                </script>
            </body>
            </html>
        `;
    }, [levels, searchParams]);

    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data.type === 'SAVE_SCORE_AND_EXIT' && user) {
                const { score, gameType, context } = event.data.payload;
                await submitBalloonHuntScore(user.uid, score, context);
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
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
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
