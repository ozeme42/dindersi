'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { Play, RefreshCw, Heart, Zap, Loader2, Home, ArrowLeft, Users, User, Rocket, Maximize2, Star } from 'lucide-react';
import { getDogruYolKosucusuAction, submitDogruYolKosucusuScoreAction, type DogruYolQuestion } from '../actions';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { GameEndScreen } from '@/components/game-end-screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Obstacle {
    id: string;
    y: number;
    question: string;
    leftAns: string;
    rightAns: string;
    correctLane: 0 | 1;
    passedP1: boolean;
    passedP2: boolean;
}

const GAME_STYLES = `
  #dr_wrapper {
    width: 100%; height: 95vh; min-height: 600px;
    background: #020617; /* Slate 950 */
    position: relative; overflow: hidden;
    color: white; font-family: 'Segoe UI', Roboto, Helvetica, sans-serif;
    border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.6);
  }
  
  /* GRID BACKGROUND (CYBERPUNK PERSPECTIVE) */
  .grid_bg {
    position: absolute; bottom: -20%; left: -50%; right: -50%; height: 150%;
    background-image: 
      linear-gradient(rgba(14, 165, 233, 0.3) 2px, transparent 2px),
      linear-gradient(90deg, rgba(14, 165, 233, 0.3) 2px, transparent 2px);
    background-size: 100px 100px;
    background-position: center bottom;
    transform: perspective(600px) rotateX(75deg);
    transform-origin: bottom center;
    animation: gridMove 2s linear infinite;
    z-index: 0;
  }
  .grid_bg_2 {
    background-image: 
      linear-gradient(rgba(249, 115, 22, 0.3) 2px, transparent 2px),
      linear-gradient(90deg, rgba(249, 115, 22, 0.3) 2px, transparent 2px);
  }
  @keyframes gridMove {
    0% { transform: perspective(600px) rotateX(75deg) translateY(0); }
    100% { transform: perspective(600px) rotateX(75deg) translateY(100px); }
  }

  .screen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 100; animation: fadeIn 0.3s; }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

  .p_zone { position: relative; height: 100%; display: flex; flex-direction: column; overflow: hidden; z-index: 10; }
  .p_zone_1 { flex: 1; border-right: 4px solid rgba(14,165,233,0.5); box-shadow: inset -40px 0 60px -40px rgba(14,165,233,0.4); }
  .p_zone_2 { flex: 1; box-shadow: inset 40px 0 60px -40px rgba(249,115,22,0.4); }
  
  /* ROAD */
  .road {
    position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 80%; max-width: 500px;
    background: rgba(0,0,0,0.6);
    border-left: 4px solid rgba(255,255,255,0.2);
    border-right: 4px solid rgba(255,255,255,0.2);
    z-index: 10;
  }
  .dashed_line {
    position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 8px;
    background-image: linear-gradient(to bottom, rgba(255,255,255,0.7) 50%, transparent 50%);
    background-size: 100% 120px;
    animation: dashMove 0.5s linear infinite;
  }
  @keyframes dashMove { from { background-position: 0 -120px; } to { background-position: 0 0; } }

  .hud { position: absolute; top: 20px; left: 20px; right: 20px; display: flex; justify-content: space-between; z-index: 40; pointer-events: none; }
  
  /* VEHICLE */
  .vehicle {
    position: absolute; bottom: 8%; width: 60px; height: 80px;
    transition: left 0.15s ease-out; transform: translateX(-50%); z-index: 30;
    display: flex; align-items: center; justify-content: center;
  }
  .v_glow_1 { filter: drop-shadow(0 0 20px rgba(14,165,233,1)); }
  .v_glow_2 { filter: drop-shadow(0 0 20px rgba(249,115,22,1)); }
  
  /* OBSTACLE */
  .obstacle {
    position: absolute; width: 80%; max-width: 500px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; z-index: 20;
  }
  .obs_q {
    background: rgba(15, 23, 42, 0.95); border: 2px solid #38bdf8; color: white;
    padding: 10px 20px; border-radius: 12px; font-weight: 900; font-size: 1.3rem;
    box-shadow: 0 0 25px rgba(56, 189, 248, 0.6); text-align: center;
    max-width: 90%; margin-bottom: 20px; position: relative; z-index: 22;
  }
  .obs_q_2 { border-color: #fb923c; box-shadow: 0 0 25px rgba(251, 146, 60, 0.6); }
  
  .obs_gates {
    display: flex; width: 100%; gap: 15px; padding: 0 10px;
  }
  .gate {
    flex: 1; height: 70px; display: flex; align-items: center; justify-content: center;
    background: rgba(15, 23, 42, 0.9); border-bottom: 6px solid #38bdf8; border-top: 1px solid rgba(255,255,255,0.1);
    color: white; font-weight: bold; font-size: 1.2rem; border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.7); text-align: center; padding: 0 10px;
    word-break: break-word; line-height: 1.2;
  }
  .gate_2 { border-bottom-color: #fb923c; }

  /* FEEDBACK */
  .feedback {
    position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-5deg);
    font-size: 4rem; font-weight: 900; z-index: 50; text-shadow: 4px 4px 0 #000;
    pointer-events: none; animation: popFeedback 0.8s ease-out forwards;
  }
  @keyframes popFeedback {
    0% { opacity: 0; transform: translate(-50%, -30%) rotate(-10deg) scale(0.5); }
    20% { opacity: 1; transform: translate(-50%, -50%) rotate(5deg) scale(1.2); }
    80% { opacity: 1; transform: translate(-50%, -55%) rotate(-5deg) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -70%) rotate(0deg) scale(0.8); }
  }

  .flash_red { animation: flashRed 0.5s ease-out; }
  .flash_green { animation: flashGreen 0.5s ease-out; }
  @keyframes flashRed { 0% { box-shadow: inset 0 0 100px rgba(255,0,0,0.8); } 100% { box-shadow: inset 0 0 0 transparent; } }
  @keyframes flashGreen { 0% { box-shadow: inset 0 0 100px rgba(0,255,0,0.8); } 100% { box-shadow: inset 0 0 0 transparent; } }
`;

function GameContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    // --- STATE ---
    const [gameState, setGameState] = useState<'loading' | 'home' | 'playing' | 'win' | 'lose' | 'error'>('loading');
    const [gameMode, setGameMode] = useState<'solo' | 'duel'>('solo');
    const [questions, setQuestions] = useState<DogruYolQuestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Player States
    const [p1Scores, setP1Scores] = useState(0);
    const [p2Scores, setP2Scores] = useState(0);
    const [p1Lives, setP1Lives] = useState(3);
    const [p2Lives, setP2Lives] = useState(3);
    const [p1Lane, setP1Lane] = useState<0|1>(0);
    const [p2Lane, setP2Lane] = useState<0|1>(1);

    const [p1Flash, setP1Flash] = useState<'red' | 'green' | null>(null);
    const [p2Flash, setP2Flash] = useState<'red' | 'green' | null>(null);
    const [p1Feedback, setP1Feedback] = useState<{text: string, type: 'good'|'bad'} | null>(null);
    const [p2Feedback, setP2Feedback] = useState<{text: string, type: 'good'|'bad'} | null>(null);

    // Game Entities
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [speed, setSpeed] = useState(1);
    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
    const lastSpawnTime = useRef(0);

    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    const gameContext = `Doğru Yol Koşucusu - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    const backUrl = useMemo(() => {
        const { courseId, unitId, topicId, courseName, unitName, topicName } = Object.fromEntries(searchParams.entries());
        if (courseId && unitId && topicId) {
            return `/konu/${courseId}/${unitId}/${topicId}/oyunlar?courseName=${encodeURIComponent(courseName || '')}&unitName=${encodeURIComponent(unitName || '')}&topicName=${encodeURIComponent(topicName || '')}`;
        }
        if (user) {
            return user.role === 'teacher' || user.role === 'superadmin' ? '/teacher' : '/student';
        }
        return '/oyunlar';
    }, [searchParams, user]);

    // --- DATA FETCHING ---
    const fetchGameData = useCallback(async () => {
        try {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                isStatic: searchParams.get('isStatic') === 'true',
            };
            const result = await getDogruYolKosucusuAction(params);
            if (result.error || result.questions.length === 0) {
                setError(result.error || "Bu konu için uygun soru bulunamadı.");
                setGameState('error');
            } else {
                setQuestions(result.questions);
                setGameState('home');
            }
        } catch (err: any) {
            setError(err.message || "Veri yüklenemedi.");
            setGameState('error');
        }
    }, [searchParams]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);

    // --- OYUN KONTROLLERİ ---
    const startGame = (mode: 'solo' | 'duel') => {
        setGameMode(mode);
        setP1Scores(0); setP2Scores(0);
        setP1Lives(mode === 'solo' ? 5 : 3);
        setP2Lives(3);
        setObstacles([]);
        setSpeed(0.6); // Start slower for wider screen
        setP1Lane(0); setP2Lane(1);
        lastSpawnTime.current = 0;
        setIsSaving(false); setIsScoreSaved(false);
        setGameState('playing');

        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        gameLoopRef.current = setInterval(gameLoop, 30);
    };

    const endGame = () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        setGameState(p1Lives <= 0 && gameMode === 'solo' ? 'lose' : 'win'); // For solo, we use 'lose', and GameEndScreen handles it. Duel uses 'win' to show custom screen.
        if (gameMode === 'solo') setGameState('gameover' as any); // Use old gameover state mapping for solo
    };

    useEffect(() => {
        if (gameState === 'playing') {
            if (gameMode === 'solo' && p1Lives <= 0) endGame();
            if (gameMode === 'duel' && (p1Lives <= 0 || p2Lives <= 0)) endGame();
        }
    }, [p1Lives, p2Lives, gameMode, gameState]);

    const handleExitClick = () => {
        if (gameState === 'playing') {
            endGame();
        } else {
            router.push(backUrl);
        }
    };

    // Klavye Kontrolü
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'playing') return;
            
            // Player 1 (A/D or Arrows if solo)
            if (e.key === 'a' || e.key === 'A') setP1Lane(0);
            if (e.key === 'd' || e.key === 'D') setP1Lane(1);
            if (gameMode === 'solo') {
                if (e.key === 'ArrowLeft') setP1Lane(0);
                if (e.key === 'ArrowRight') setP1Lane(1);
            }

            // Player 2 (Left/Right Arrows)
            if (gameMode === 'duel') {
                if (e.key === 'ArrowLeft') setP2Lane(0);
                if (e.key === 'ArrowRight') setP2Lane(1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, gameMode]);

    // --- OYUN DÖNGÜSÜ ---
    const spawnObstacle = useCallback(() => {
        if (questions.length === 0) return;
        const qData = questions[Math.floor(Math.random() * questions.length)];
        const correctLane = Math.random() > 0.5 ? 1 : 0; 
        
        const newObstacle: Obstacle = {
            id: Math.random().toString(36).substr(2, 9),
            y: -20,
            question: qData.q,
            leftAns: correctLane === 0 ? qData.correct : qData.wrong,
            rightAns: correctLane === 1 ? qData.correct : qData.wrong,
            correctLane: correctLane,
            passedP1: false,
            passedP2: false,
        };
        
        setObstacles(prev => [...prev, newObstacle]);
    }, [questions]);

    const gameLoop = () => {
        setObstacles(prev => {
            let p1L = p1Lives; // Local copies aren't reactive in closure, so we use setState functions for lives/score
            const nextObstacles: Obstacle[] = [];
            
            prev.forEach(obs => {
                const newY = obs.y + speed;
                
                // Collision Zone: 75% to 85%
                const inZone = newY > 75 && newY < 85;

                // Player 1 Collision
                if (inZone && !obs.passedP1) {
                    obs.passedP1 = true;
                    // React state values (p1Lane) inside setInterval closure might be stale!
                    // Let's use a functional setState or useRef for lanes.
                    // Actually, React 18 batches these. Since `p1Lane` is captured at setInterval creation, it's a BUG!
                    // Wait, gameLoop doesn't capture `p1Lane` properly if it's in setInterval!
                    // Fix: We need to use Refs for lanes to avoid closure bugs.
                }

                if (newY < 120) {
                    nextObstacles.push({ ...obs, y: newY });
                }
            });
            return nextObstacles;
        });
    };

    // To fix closure bugs, we use a different approach for the loop: requestAnimationFrame with dependencies!
    const [currentTime, setCurrentTime] = useState(0);
    useEffect(() => {
        if (gameState !== 'playing') return;
        let animationFrameId: number;
        const loop = (time: number) => {
            setCurrentTime(time);
            animationFrameId = requestAnimationFrame(loop);
        };
        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [gameState]);

    // The actual update logic runs when currentTime changes! This guarantees fresh state.
    useEffect(() => {
        if (gameState !== 'playing') return;

        // Speed Progression
        const currentTotalScore = Math.max(p1Scores, p2Scores);
        let currentSpeed = 0.6;
        if (currentTotalScore > 50) currentSpeed = 0.8;
        if (currentTotalScore > 100) currentSpeed = 1.0;
        if (currentTotalScore > 200) currentSpeed = 1.2;
        setSpeed(currentSpeed);

        // Spawn logic
        const spawnRate = 3000 / currentSpeed;
        if (currentTime - lastSpawnTime.current > spawnRate) {
            spawnObstacle();
            lastSpawnTime.current = currentTime;
        }

        // Move obstacles and check collisions
        setObstacles(prev => {
            let nextObs: Obstacle[] = [];
            prev.forEach(obs => {
                const newY = obs.y + currentSpeed;
                const inZone = newY > 75 && newY < 85;

                // Collision P1
                if (inZone && !obs.passedP1) {
                    obs.passedP1 = true;
                    if (p1Lane === obs.correctLane) {
                        setP1Scores(s => s + 10);
                        setP1Feedback({text: "+10", type: "good"});
                        setP1Flash('green');
                    } else {
                        setP1Lives(l => l - 1);
                        setP1Feedback({text: "YANLIŞ", type: "bad"});
                        setP1Flash('red');
                    }
                    setTimeout(() => { setP1Feedback(null); setP1Flash(null); }, 600);
                }

                // Collision P2 (Duel only)
                if (gameMode === 'duel' && inZone && !obs.passedP2) {
                    obs.passedP2 = true;
                    if (p2Lane === obs.correctLane) {
                        setP2Scores(s => s + 10);
                        setP2Feedback({text: "+10", type: "good"});
                        setP2Flash('green');
                    } else {
                        setP2Lives(l => l - 1);
                        setP2Feedback({text: "YANLIŞ", type: "bad"});
                        setP2Flash('red');
                    }
                    setTimeout(() => { setP2Feedback(null); setP2Flash(null); }, 600);
                }

                if (newY < 120) nextObs.push({ ...obs, y: newY });
            });
            return nextObs;
        });

    }, [currentTime]); // Runs effectively on every frame with fresh state!


    const handleSaveAndExit = async () => {
        if (!user || isSaving || isScoreSaved || p1Scores <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitDogruYolKosucusuScoreAction(user.uid, p1Scores, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: "Başarılı!", description: "Puanınız kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const toggleFS = () => {
        const elem = document.getElementById('dr_wrapper');
        if (!elem) return;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) elem.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    // --- RENDER HELPERS ---
    const renderZone = (player: 1 | 2) => {
        const lane = player === 1 ? p1Lane : p2Lane;
        const setLane = player === 1 ? setP1Lane : setP2Lane;
        const scores = player === 1 ? p1Scores : p2Scores;
        const lives = player === 1 ? p1Lives : p2Lives;
        const flash = player === 1 ? p1Flash : p2Flash;
        const feedback = player === 1 ? p1Feedback : p2Feedback;

        return (
            <div className={cn("p_zone", player === 1 ? "p_zone_1" : "p_zone_2", flash === 'red' ? 'flash_red' : (flash === 'green' ? 'flash_green' : ''))}>
                <div className={cn("grid_bg", player === 2 && "grid_bg_2")} style={{animationDuration: `${2/speed}s`}}></div>
                
                <div className="road">
                    <div className="dashed_line" style={{animationDuration: `${0.5/speed}s`}}></div>
                    
                    {/* Obstacles */}
                    {obstacles.map(obs => {
                        const passed = player === 1 ? obs.passedP1 : obs.passedP2;
                        return (
                            <div key={obs.id} className="obstacle" style={{ top: `${obs.y}%`, opacity: passed ? 0.3 : 1 }}>
                                <div className={cn("obs_q", player === 2 && "obs_q_2")}>{obs.question}</div>
                                <div className="obs_gates">
                                    <div className={cn("gate", player === 2 && "gate_2")}>{obs.leftAns}</div>
                                    <div className={cn("gate", player === 2 && "gate_2")}>{obs.rightAns}</div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Vehicle */}
                    <div className={cn("vehicle", player === 1 ? "v_glow_1" : "v_glow_2")} style={{ left: lane === 0 ? '25%' : '75%' }}>
                        <Rocket size={60} className={player === 1 ? "text-cyan-400" : "text-orange-400"} />
                    </div>

                    {/* Touch Controls Overlay */}
                    <div className="absolute inset-0 flex z-30">
                        <div className="flex-1 active:bg-white/5 transition-colors" onClick={() => setLane(0)}></div>
                        <div className="flex-1 active:bg-white/5 transition-colors" onClick={() => setLane(1)}></div>
                    </div>
                </div>

                <div className="hud">
                    <div className={cn("flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full font-bold border", player === 1 ? "text-cyan-400 border-cyan-500/30" : "text-orange-400 border-orange-500/30")}>
                        <Star size={18}/> {scores}
                    </div>
                    <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full border border-white/10">
                        {Array.from({length: Math.max(0, lives)}).map((_,i) => <Heart key={i} size={22} className="text-rose-500 fill-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]"/>)}
                    </div>
                </div>

                {feedback && (
                    <div className={cn("feedback", feedback.type === 'good' ? "text-emerald-400" : "text-rose-500")}>
                        {feedback.text}
                    </div>
                )}
            </div>
        );
    };

    if (gameState === 'loading') return <div className="h-screen w-full flex items-center justify-center bg-[#020617]"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>;
    
    if (gameState === 'error') {
        return (
            <div className="flex items-center justify-center h-screen bg-[#020617] text-white text-center p-4">
                <div>
                    <h2 className="text-xl font-bold text-rose-500 mb-4">Hata</h2>
                    <p>{error}</p>
                    <Button asChild className="mt-4"><Link href={backUrl}>Geri Dön</Link></Button>
                </div>
            </div>
        );
    }

    if (gameState === 'gameover' as any) {
        return (
            <GameEndScreen
                score={p1Scores}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={() => startGame('solo')}
                backUrl={backUrl}
            />
        );
    }

    return (
        <div id="dr_wrapper" className="w-full max-w-[1400px] mx-auto">
            <style jsx global>{GAME_STYLES}</style>
            
            {/* ÜST BUTONLAR */}
            <div className="absolute top-3 right-3 z-[150] flex gap-2">
                <button className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-rose-500 hover:border-rose-400 transition text-white" onClick={handleExitClick}>
                    <Home size={16}/> Çıkış
                </button>
                <button className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-white/30 transition text-white" onClick={toggleFS}>
                    <Maximize2 size={16}/> Tam Ekran
                </button>
            </div>

            {gameState === 'home' && (
                <div className="screen">
                    <Rocket className="w-24 h-24 text-cyan-400 mb-6 animate-pulse" />
                    <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4 text-center tracking-tight">NEON KOŞUCU</h1>
                    <p className="text-slate-300 mb-10 text-lg md:text-xl max-w-2xl text-center">Yukarıdaki soruya bak ve doğru cevabın olduğu şeride geç! Işık hızında düşün, hayatta kal.</p>
                    
                    <div className="flex gap-6 flex-col sm:flex-row w-full max-w-2xl px-4">
                        <Card className="flex-1 bg-slate-900/80 border-cyan-500/40 p-6 md:p-8 flex flex-col items-center gap-4 hover:border-cyan-400 hover:scale-105 transition cursor-pointer backdrop-blur-md" onClick={() => startGame('solo')}>
                            <User className="w-16 h-16 text-cyan-400" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider">Bireysel Görev</h3>
                            <p className="text-sm md:text-base text-slate-400 text-center">A / D tuşları ile şerit değiştir.<br/>5 Can hakkın var.</p>
                            <Button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white mt-4 text-lg h-12">SEÇ</Button>
                        </Card>
                        <Card className="flex-1 bg-slate-900/80 border-orange-500/40 p-6 md:p-8 flex flex-col items-center gap-4 hover:border-orange-400 hover:scale-105 transition cursor-pointer backdrop-blur-md" onClick={() => startGame('duel')}>
                            <Users className="w-16 h-16 text-orange-400" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider">Düello Modu</h3>
                            <p className="text-sm md:text-base text-slate-400 text-center">Ekran ikiye bölünür.<br/>Sol takım (A/D) vs Sağ takım (Oklar).</p>
                            <Button className="w-full bg-orange-600 hover:bg-orange-500 text-white mt-4 text-lg h-12">SEÇ</Button>
                        </Card>
                    </div>
                </div>
            )}

            {gameState === 'playing' && (
                <div className="flex w-full h-full">
                    {renderZone(1)}
                    {gameMode === 'duel' && renderZone(2)}
                </div>
            )}

            {gameState === 'win' && gameMode === 'duel' && (
                <div className="screen">
                    <h2 className="text-7xl font-black text-white mb-6 tracking-tighter">YARIŞ BİTTİ</h2>
                    <div className="flex gap-16 text-3xl mb-12 justify-center w-full max-w-4xl">
                        <div className={cn("flex flex-col items-center p-8 rounded-3xl border-4", p1Lives > 0 ? "text-cyan-400 border-cyan-400 bg-cyan-950/50 scale-110 shadow-[0_0_50px_rgba(34,211,238,0.5)]" : "text-slate-600 border-slate-800")}>
                            <span className="text-2xl mb-2 text-white">Sol Takım</span>
                            <span className="font-black text-5xl mb-4">{p1Scores} Puan</span>
                            {p1Lives > 0 ? <span className="bg-cyan-500 text-white px-4 py-1 rounded-full text-lg uppercase tracking-widest">Kazandı</span> : <span className="text-lg">Tükendi</span>}
                        </div>
                        <div className={cn("flex flex-col items-center p-8 rounded-3xl border-4", p2Lives > 0 ? "text-orange-400 border-orange-400 bg-orange-950/50 scale-110 shadow-[0_0_50px_rgba(249,115,22,0.5)]" : "text-slate-600 border-slate-800")}>
                            <span className="text-2xl mb-2 text-white">Sağ Takım</span>
                            <span className="font-black text-5xl mb-4">{p2Scores} Puan</span>
                            {p2Lives > 0 ? <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-lg uppercase tracking-widest">Kazandı</span> : <span className="text-lg">Tükendi</span>}
                        </div>
                    </div>
                    <Button className="bg-white text-black hover:bg-slate-200 text-2xl font-bold px-10 py-8 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-transform hover:scale-105" onClick={() => setGameState('home')}>
                        <RefreshCw className="mr-3 h-8 w-8" /> Yeniden Oyna
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function DogruYolKosucusuPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-[#020617]"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>}>
            <GameContent />
        </Suspense>
    );
}