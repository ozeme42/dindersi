'use client';

import { useState, useEffect, Suspense, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Maximize2, Home, RefreshCw, Rocket, Heart, Crosshair, Users, User, Star } from "lucide-react";
import { getSpaceDefenseQuestions } from '../actions';
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface Question {
    id: string;
    text: string;
    type: 'Çoktan Seçmeli' | 'Doğru/Yanlış';
    options?: string[];
    correctAnswer: string;
    isTrue?: boolean;
}

interface Meteor {
    id: string;
    x: number;
    y: number;
    option: string;
    isCorrect: boolean;
    speed: number;
}

interface Explosion {
    id: string;
    x: number;
    y: number;
}

const GAME_STYLES = `
  #space_container {
    width: 100%; height: 95vh; min-height: 600px;
    background: radial-gradient(circle at bottom, #1B2735 0%, #090A0F 100%);
    position: relative; overflow: hidden;
    color: white; font-family: 'Segoe UI', Roboto, Helvetica, sans-serif;
    border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.6);
  }
  
  /* YILDIZLAR */
  .stars { position: absolute; width: 2px; height: 2px; background: transparent; box-shadow: 174px 123px #FFF, 800px 300px #FFF, 200px 800px #FFF, 600px 900px #FFF, 400px 100px #FFF, 1000px 500px #FFF, 1200px 200px #FFF, 100px 500px #FFF; animation: animStar 50s linear infinite; }
  .stars:after { content: " "; position: absolute; top: 2000px; width: 2px; height: 2px; background: transparent; box-shadow: inherit; }
  @keyframes animStar { from { transform: translateY(0px) } to { transform: translateY(-2000px) } }
  
  /* METEORLAR */
  .meteor {
    position: absolute; width: 140px; height: 140px;
    display: flex; align-items: center; justify-content: center;
    cursor: crosshair; transition: transform 0.1s;
    filter: drop-shadow(0 0 10px rgba(255,100,0,0.4));
    transform: translateX(-50%);
  }
  .meteor:hover { transform: translateX(-50%) scale(1.05); filter: drop-shadow(0 0 15px rgba(255,100,0,0.8)); }
  .meteor_svg { position: absolute; width: 100%; height: 100%; z-index: 1; animation: spin 10s linear infinite; }
  .meteor_text {
    position: relative; z-index: 2;
    font-weight: 900; font-size: 15px; text-align: center; color: white;
    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    pointer-events: none; padding: 6px; background: rgba(0,0,0,0.7); border-radius: 8px;
    max-width: 90%; word-wrap: break-word; line-height: 1.1;
  }
  @keyframes spin { 100% { transform: rotate(360deg); } }
  
  /* LAZER */
  .laser {
    position: absolute; width: 4px; background: #00ffff;
    box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff; border-radius: 2px;
    transform-origin: bottom center; z-index: 50;
    animation: laserShoot 0.3s ease-out forwards;
  }
  @keyframes laserShoot { 0% { opacity: 1; } 100% { opacity: 0; } }
  
  /* PATLAMA */
  .explosion {
    position: absolute; width: 150px; height: 150px;
    background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,153,0,1) 30%, rgba(255,0,0,0) 70%);
    border-radius: 50%; opacity: 0; transform: translate(-50%, -50%) scale(0.5); z-index: 60; pointer-events: none;
    animation: explodeAnim 0.5s ease-out forwards;
  }
  @keyframes explodeAnim { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }

  .screen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 100; animation: fadeIn 0.3s; }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

  .p_zone { position: relative; height: 100%; display: flex; flex-direction: column; }
  .p_zone_1 { flex: 1; border-right: 2px dashed rgba(255,255,255,0.2); }
  .p_zone_2 { flex: 1; }
  .turret { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); width: 60px; height: 80px; z-index: 30; }
  .question_box { position: absolute; bottom: 120px; left: 5%; right: 5%; background: rgba(0, 50, 100, 0.8); border: 2px solid #00d4ff; border-radius: 12px; padding: 15px; text-align: center; box-shadow: 0 0 20px rgba(0, 212, 255, 0.5); font-size: 1.2rem; font-weight: bold; z-index: 20; backdrop-filter: blur(4px); }
  .hud { position: absolute; top: 20px; left: 20px; right: 20px; display: flex; justify-content: space-between; z-index: 40; pointer-events: none; }
`;

function SpaceDefenseGameContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();

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
    
    // --- STATE ---
    const [gameState, setGameState] = useState<'loading' | 'home' | 'playing' | 'win' | 'lose'>('loading');
    const [gameMode, setGameMode] = useState<'solo' | 'duel'>('solo');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string|null>(null);

    // Player States
    const [p1Scores, setP1Scores] = useState(0);
    const [p2Scores, setP2Scores] = useState(0);
    const [p1Lives, setP1Lives] = useState(3);
    const [p2Lives, setP2Lives] = useState(3);
    const [p1ActiveQ, setP1ActiveQ] = useState<Question | null>(null);
    const [p2ActiveQ, setP2ActiveQ] = useState<Question | null>(null);

    // Entities
    const [meteorsP1, setMeteorsP1] = useState<Meteor[]>([]);
    const [meteorsP2, setMeteorsP2] = useState<Meteor[]>([]);
    const [explosions, setExplosions] = useState<Explosion[]>([]);
    const [lasers, setLasers] = useState<{id: string, x: number, y: number, height: number, deg: number}[]>([]);

    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

    // --- DATA FETCHING ---
    const fetchGameData = useCallback(async () => {
        try {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                isStatic: searchParams.get('isStatic') === 'true',
                questionCount: 50
            };
            const result = await getSpaceDefenseQuestions(params);
            if (result.error) throw new Error(result.error);
            const resultQuestions = result.questions || [];
            
            if (resultQuestions.length < 5) {
                setError("Bu oyun için en az 5 soru gerekli.");
                setGameState('loading');
            } else {
                setQuestions(resultQuestions);
                setGameState('home');
            }
        } catch (err: any) {
            setError(err.message || "Veri yüklenemedi.");
        }
    }, [searchParams]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);

    // --- GAME LOGIC ---
    const getRandomOptions = (q: Question) => {
        const options = q.type === 'Doğru/Yanlış' ? ['Doğru', 'Yanlış'] : (q.options || []);
        return [...options].sort(() => 0.5 - Math.random());
    };

    const spawnMeteors = (player: 1 | 2, q: Question) => {
        const options = getRandomOptions(q);
        const newMeteors: Meteor[] = options.map((opt, i) => ({
            id: Math.random().toString(36).substr(2, 9),
            x: 20 + (60 / Math.max(1, options.length - 1)) * i, // Percentage
            y: -10 - (Math.random() * 20), // Start above screen
            option: opt,
            isCorrect: q.type === 'Doğru/Yanlış' ? 
                ((opt === "Doğru" && (q.isTrue === true || q.correctAnswer === "Doğru")) || (opt === "Yanlış" && (q.isTrue === false || q.correctAnswer === "Yanlış"))) : 
                (opt === q.correctAnswer),
            speed: 0.2 + (Math.random() * 0.1) // Base speed
        }));

        if (player === 1) { setP1ActiveQ(q); setMeteorsP1(newMeteors); }
        else { setP2ActiveQ(q); setMeteorsP2(newMeteors); }
    };

    const nextQuestion = (player: 1 | 2) => {
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        spawnMeteors(player, randomQ);
    };

    const startGame = (mode: 'solo' | 'duel') => {
        setGameMode(mode);
        setP1Scores(0); setP2Scores(0);
        setP1Lives(mode === 'solo' ? 5 : 3);
        setP2Lives(3);
        setExplosions([]); setLasers([]);
        setGameState('playing');
        
        nextQuestion(1);
        if (mode === 'duel') nextQuestion(2);

        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        gameLoopRef.current = setInterval(gameLoop, 30);
    };

    const endGame = () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        setGameState(p1Lives <= 0 && gameMode === 'solo' ? 'lose' : 'win');
    };

    useEffect(() => {
        if (gameState === 'playing') {
            if (gameMode === 'solo' && p1Lives <= 0) endGame();
            if (gameMode === 'duel' && (p1Lives <= 0 || p2Lives <= 0)) endGame();
        }
    }, [p1Lives, p2Lives]);

    const handleExitClick = () => {
        if (gameState === 'playing') {
            endGame();
        } else {
            router.push(backUrl);
        }
    };

    const gameLoop = () => {
        setMeteorsP1(prev => {
            let missedCorrect = false;
            const updated = prev.map(m => {
                const nextY = m.y + m.speed;
                if (nextY > 100 && m.isCorrect) missedCorrect = true;
                return { ...m, y: nextY };
            }).filter(m => m.y <= 100);

            if (missedCorrect) {
                setP1Lives(l => l - 1);
                // Clear and next question inside setMeteors is tricky, we use useEffect to watch changes normally, but here we can just empty it.
                // If a correct is missed, wipe them out so next cycle spawns new.
                return []; 
            }
            return updated;
        });

        setMeteorsP2(prev => {
            if (prev.length === 0) return prev;
            let missedCorrect = false;
            const updated = prev.map(m => {
                const nextY = m.y + m.speed;
                if (nextY > 100 && m.isCorrect) missedCorrect = true;
                return { ...m, y: nextY };
            }).filter(m => m.y <= 100);

            if (missedCorrect) {
                setP2Lives(l => l - 1);
                return [];
            }
            return updated;
        });
    };

    // Watch for empty meteors and spawn next
    useEffect(() => {
        if (gameState !== 'playing') return;
        if (meteorsP1.length === 0) nextQuestion(1);
    }, [meteorsP1]);

    useEffect(() => {
        if (gameState !== 'playing' || gameMode !== 'duel') return;
        if (meteorsP2.length === 0) nextQuestion(2);
    }, [meteorsP2]);


    const handleMeteorClick = (player: 1 | 2, meteor: Meteor) => {
        if (gameState !== 'playing') return;

        // Visual Effects
        const exps = [...explosions, { id: Math.random().toString(), x: meteor.x, y: meteor.y }];
        setExplosions(exps);
        setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== exps[exps.length-1].id)), 500);

        if (meteor.isCorrect) {
            // Correct
            if (player === 1) {
                setP1Scores(s => s + 10);
                setMeteorsP1([]); // Clears screen, triggers next question
            } else {
                setP2Scores(s => s + 10);
                setMeteorsP2([]);
            }
        } else {
            // Wrong
            if (player === 1) {
                setP1Lives(l => l - 1);
                setMeteorsP1(prev => prev.filter(m => m.id !== meteor.id));
            } else {
                setP2Lives(l => l - 1);
                setMeteorsP2(prev => prev.filter(m => m.id !== meteor.id));
            }
        }
    };

    const toggleFS = () => {
        const elem = document.getElementById('space_container');
        if (!elem) return;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) elem.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    // Rendering Helpers
    const renderMeteors = (player: 1 | 2, meteors: Meteor[]) => {
        return meteors.map(m => (
            <div 
                key={m.id} 
                className="meteor" 
                style={{ top: `${m.y}%`, left: `${m.x}%` }}
                onMouseDown={() => handleMeteorClick(player, m)}
                onTouchStart={() => handleMeteorClick(player, m)}
            >
                <svg className="meteor_svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 10 Q 70 20 80 50 Q 70 80 50 90 Q 30 80 20 50 Q 30 20 50 10" fill="#8d6e63"/>
                    <circle cx="40" cy="40" r="8" fill="#5d4037"/>
                    <circle cx="65" cy="60" r="12" fill="#5d4037"/>
                    <path d="M20 20 L30 30 M80 20 L70 30 M20 80 L30 70 M80 80 L70 70" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                </svg>
                <div className="meteor_text">{m.option}</div>
            </div>
        ));
    };

    if (error) return <div className="h-screen w-full flex items-center justify-center p-8 bg-red-950 text-red-200 text-center flex-col gap-4"><div>{error}</div><Button onClick={() => window.location.reload()} variant="outline" className="text-black"><RefreshCw className="mr-2 h-4 w-4"/> Yenile</Button></div>;

    return (
        <div id="sp_wrapper" className="w-full max-w-[1400px] mx-auto">
            <style jsx global>{GAME_STYLES}</style>
            
            <div id="space_container">
                <div className="stars"></div>
                
                {/* ÜST BUTONLAR */}
                <div className="absolute top-3 right-3 z-[150] flex gap-2">
                    <button className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 hover:bg-rose-500 hover:border-rose-400 transition" onClick={handleExitClick}>
                        <Home size={14}/> Çıkış
                    </button>
                    <button className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white/30 transition" onClick={toggleFS}>
                        <Maximize2 size={14}/> Tam Ekran
                    </button>
                </div>

                {gameState === 'loading' && (
                    <div className="screen"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>
                )}

                {gameState === 'home' && (
                    <div className="screen">
                        <Rocket className="w-24 h-24 text-cyan-400 mb-6 animate-pulse" />
                        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 text-center">UZAY SAVUNMASI</h1>
                        <p className="text-slate-300 mb-10 text-lg max-w-lg text-center">Gökyüzünden düşen meteorlardan sadece doğru cevabı barındıranı vur! Yanlış olanı vurursan veya doğru olan yere çarparsa can kaybedersin.</p>
                        
                        <div className="flex gap-6 flex-col sm:flex-row">
                            <Card className="bg-slate-900/60 border-cyan-500/30 p-6 flex flex-col items-center gap-4 hover:border-cyan-400 transition cursor-pointer backdrop-blur-md" onClick={() => startGame('solo')}>
                                <User className="w-12 h-12 text-cyan-400" />
                                <h3 className="text-xl font-bold text-white">Bireysel Görev</h3>
                                <p className="text-sm text-slate-400 text-center">Tek başına hayatta kal<br/>5 Can</p>
                                <Button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">Seç</Button>
                            </Card>
                            <Card className="bg-slate-900/60 border-rose-500/30 p-6 flex flex-col items-center gap-4 hover:border-rose-400 transition cursor-pointer backdrop-blur-md" onClick={() => startGame('duel')}>
                                <Users className="w-12 h-12 text-rose-400" />
                                <h3 className="text-xl font-bold text-white">Düello Modu</h3>
                                <p className="text-sm text-slate-400 text-center">Sınıf içi takım savaşı<br/>3 Can</p>
                                <Button className="w-full bg-rose-600 hover:bg-rose-500 text-white">Seç</Button>
                            </Card>
                        </div>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="flex w-full h-full">
                        {/* PLAYER 1 ZONE */}
                        <div className={cn("p_zone", gameMode === 'duel' ? "p_zone_1" : "flex-1")}>
                            <div className="hud">
                                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full text-cyan-400 font-bold border border-cyan-500/30"><Star size={16}/> {p1Scores}</div>
                                <div className="flex items-center gap-1">
                                    {Array.from({length: p1Lives}).map((_,i) => <Heart key={i} size={20} className="text-rose-500 fill-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]"/>)}
                                </div>
                            </div>
                            
                            {renderMeteors(1, meteorsP1)}

                            {p1ActiveQ && (
                                <div className="question_box">{p1ActiveQ.text}</div>
                            )}

                            <div className="turret text-cyan-400 flex flex-col items-center">
                                <Crosshair size={40} className="mb-2 opacity-50"/>
                                <Rocket size={50} className="drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
                            </div>
                        </div>

                        {/* PLAYER 2 ZONE (DUEL ONLY) */}
                        {gameMode === 'duel' && (
                            <div className="p_zone p_zone_2">
                                <div className="hud">
                                    <div className="flex items-center gap-1">
                                        {Array.from({length: p2Lives}).map((_,i) => <Heart key={i} size={20} className="text-rose-500 fill-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]"/>)}
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full text-amber-400 font-bold border border-amber-500/30">{p2Scores} <Star size={16}/></div>
                                </div>

                                {renderMeteors(2, meteorsP2)}

                                {p2ActiveQ && (
                                    <div className="question_box" style={{borderColor: '#ffb74d', boxShadow: '0 0 20px rgba(255,183,77,0.5)'}}>{p2ActiveQ.text}</div>
                                )}

                                <div className="turret text-amber-400 flex flex-col items-center">
                                    <Crosshair size={40} className="mb-2 opacity-50"/>
                                    <Rocket size={50} className="drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
                                </div>
                            </div>
                        )}
                        
                        {/* EXPLOSIONS */}
                        {explosions.map(e => (
                            <div key={e.id} className="explosion active" style={{ top: `${e.y}%`, left: `${gameMode === 'duel' && e.x > 50 ? e.x/2 + 50 : (gameMode === 'duel' ? e.x/2 : e.x)}%` }} />
                        ))}
                    </div>
                )}

                {(gameState === 'win' || gameState === 'lose') && (
                    <div className="screen">
                        {gameMode === 'solo' ? (
                            <div className="text-center">
                                <h2 className="text-6xl font-black text-white mb-4">{gameState === 'win' ? 'Tebrikler!' : 'Oyun Bitti!'}</h2>
                                <p className="text-2xl text-cyan-400 mb-8">Skorun: {p1Scores}</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <h2 className="text-6xl font-black text-white mb-4">SAVAŞ BİTTİ</h2>
                                <div className="flex gap-12 text-2xl mb-8 justify-center">
                                    <div className={cn("flex flex-col items-center", p1Lives > 0 ? "text-cyan-400 font-bold scale-110" : "text-slate-500")}>
                                        <span>Takım 1</span><span>{p1Scores} Puan</span>
                                        {p1Lives > 0 && <span className="text-sm bg-cyan-600 text-white px-2 rounded mt-2">KAZANDI</span>}
                                    </div>
                                    <div className={cn("flex flex-col items-center", p2Lives > 0 ? "text-amber-400 font-bold scale-110" : "text-slate-500")}>
                                        <span>Takım 2</span><span>{p2Scores} Puan</span>
                                        {p2Lives > 0 && <span className="text-sm bg-amber-600 text-white px-2 rounded mt-2">KAZANDI</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                        <Button className="bg-white text-black hover:bg-slate-200 text-xl px-8 py-6 rounded-full" onClick={() => setGameState('home')}>
                            <RefreshCw className="mr-2" /> Yeniden Oyna
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SpaceDefenseGame() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-[#090A0F]"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>}>
            <SpaceDefenseGameContent />
        </Suspense>
    );
}
