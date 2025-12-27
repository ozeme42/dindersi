
'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getClimbingDuelQuestions } from '../actions';
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";

function ClimbingDuelGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Game State
    const [gameState, setGameState] = useState<'loading' | 'home' | 'playing' | 'win'>('loading');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string|null>(null);

    // Player & Game Logic State
    const [scores, setScores] = useState({ p1: 0, p2: 0 });
    const [p1Question, setP1Question] = useState<Question | null>(null);
    const [p2Question, setP2Question] = useState<Question | null>(null);
    const [winnerText, setWinnerText] = useState('');
    const [soundOn, setSoundOn] = useState(true);

    // Animation & Visuals State
    const [sunRotation, setSunRotation] = useState(-90);
    const [containerClass, setContainerClass] = useState('sky_morning');
    const [sunClass, setSunClass] = useState('');
    
    const audioCtxRef = useRef<AudioContext | null>(null);

    const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
        if(!soundOn || !audioCtxRef.current) return;
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = type; osc.frequency.value = freq;
        osc.connect(gain); gain.connect(audioCtxRef.current.destination);
        osc.start();
        gain.gain.setValueAtTime(vol, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration);
        osc.stop(audioCtxRef.current.currentTime + duration);
    };

    const sfxCorrect = () => { if(soundOn) { playTone(600, 'sine', 0.6, 0.2); setTimeout(() => playTone(900, 'sine', 0.8, 0.1), 100); }};
    const sfxWrong = () => { if(soundOn) playTone(150, 'triangle', 0.3, 0.2); };
    const sfxWin = () => { if(soundOn) { let notes = [523, 659, 783, 1046]; notes.forEach((n, i) => setTimeout(() => playTone(n, 'sine', 0.4, 0.2), i * 150)); }};

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
            questionCount: 50,
            questionTypes: ['Çoktan Seçmeli', 'Doğru/Yanlış']
        };
        const result = await getClimbingDuelQuestions(params);
        if (result.error || result.questions.length < 5) {
            setError(result.error || "Bu oyun için en az 5 soru gerekli.");
            setGameState('error');
        } else {
            setQuestions(result.questions);
            setGameState('home');
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const askQuestion = (player: 1 | 2) => {
        if (questions.length === 0) return;
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        const questionWithOptions = {
            ...randomQ,
            options: [...(randomQ.options || [])].sort(() => 0.5 - 0.5)
        };
        if (player === 1) setP1Question(questionWithOptions);
        else setP2Question(questionWithOptions);
    };

    const startGame = useCallback(() => {
        if (questions.length < 2) return;
        setScores({ p1: 0, p2: 0 });
        setGameState('playing');
        askQuestion(1);
        askQuestion(2);
        updateSun(0);
    }, [questions]);
    
    useEffect(() => {
        if(gameState === 'home' && !isLoading && questions.length > 0) {
            // Automatically start after a brief moment on the home screen
             setTimeout(() => {
                startGame();
            }, 1000); // 1 saniye sonra oyunu başlat
        }
    }, [gameState, isLoading, questions.length, startGame]);

    const checkAnswer = (player: 1 | 2, choice: string) => {
        const question = player === 1 ? p1Question : p2Question;
        if (!question) return;

        let isCorrect = false;
        if (question.type === 'Doğru/Yanlış') {
            isCorrect = (choice === 'Doğru') === (question.isTrue ?? question.correctAnswer === 'Doğru');
        } else {
            isCorrect = choice === question.correctAnswer;
        }

        let newScores = { ...scores };
        if (isCorrect) {
            sfxCorrect();
            const newScore = Math.min(100, scores[player === 1 ? 'p1' : 'p2'] + 10);
            newScores = { ...scores, [player === 1 ? 'p1' : 'p2']: newScore };
            if (newScore >= 100) {
                celebrateWin(player);
                return;
            } else {
                setTimeout(() => askQuestion(player), 300);
            }
        } else {
            sfxWrong();
            const newScore = Math.max(0, scores[player === 1 ? 'p1' : 'p2'] - 10);
            newScores = { ...scores, [player === 1 ? 'p1' : 'p2']: newScore };
        }
        setScores(newScores);
        updateSun(Math.max(newScores.p1, newScores.p2));
    };

    const celebrateWin = (player: 1 | 2) => {
        sfxWin();
        setWinnerText(player === 1 ? "Mavi Takım" : "Kırmızı Takım");
        setGameState('win');
    };
    
    const updateSun = (maxScore: number) => {
        const rotation = (maxScore * 1.8) - 90;
        setSunRotation(rotation);

        if (maxScore < 30) { setContainerClass('sky_morning'); setSunClass(''); }
        else if (maxScore < 70) { setContainerClass('sky_noon'); setSunClass('sun_hot'); }
        else if (maxScore < 90) { setContainerClass('sky_afternoon'); setSunClass('sun_hot'); }
        else { setContainerClass('sky_sunset'); setSunClass('sun_setting'); }
    };
    
    const resetGameVisuals = () => {
        setSunRotation(-90);
        setContainerClass('sky_morning');
    };

    const toggleSound = () => {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        setSoundOn(!soundOn);
    };

    const toggleFS = () => {
        const elem = document.getElementById('sp11_container');
        if (!elem) return;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) elem.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };
    
    if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>;
    if (error) return <div className="h-screen w-full flex items-center justify-center p-8 bg-red-950 text-red-200 text-center text-xl">{error}</div>;

    const renderOptions = (player: 1 | 2) => {
        const question = player === 1 ? p1Question : p2Question;
        if (!question) return null;
        const options = question.type === 'Doğru/Yanlış' ? ['Doğru', 'Yanlış'] : question.options;
        return options?.map(opt => (
            <button key={`${player}-${opt}`} className="option_btn" onClick={() => checkAnswer(player, opt)}>{opt}</button>
        ));
    };

    return (
        <div id="sp11_wrapper">
            <div id="sp11_container" className={containerClass}>
                <div id="confetti_layer"></div>
                <div className="top_btn_grp">
                    <button className="top_btn" onClick={toggleSound}>{soundOn ? "🔊 Ses: Açık" : "🔇 Ses: Kapalı"}</button>
                    <button className="top_btn" onClick={toggleFS}>&#9974; Tam Ekran</button>
                </div>

                <div id="sun_pivot" style={{ transform: `rotate(${sunRotation}deg)` }}>
                    <div id="theSun" className={cn("sp11_sun", sunClass)}></div>
                </div>
                <div className="sp11_bird bird1"></div><div className="sp11_bird bird2"></div>
                <div className="sp11_cloud" style={{width:'80px', height:'80px', top:'10%', left:'-10%', borderRadius:'50%'}}></div>
                <div className="sp11_cloud" style={{width:'100px', height:'60px', top:'20%', left:'-20%', animationDuration:'45s', borderRadius:'40%'}}></div>
                <div className="sp11_sea"><div className="wave"></div><div className="wave"></div></div>

                {gameState === 'home' && (
                    <div id="p_home" className="sp11_screen sp11_active">
                        <div className="home_layout">
                            <div className="home_right">
                                <h1 style={{color:'#009688', margin: '5px 0'}}>Tırmanma Yarışı</h1>
                                <div style={{fontSize:'30px', marginBottom:'10px'}}>🏁</div>
                                <ul className="rules_list">
                                    <li>İki takım aynı anda yarışır.</li>
                                    <li>Doğru cevaplar sizi zirveye taşır.</li>
                                    <li>Yanlış cevaplar 1 adım geri götürür!</li>
                                    <li>Zirveye ilk ulaşan kazanır!</li>
                                </ul>
                                <Button className="sp11_btn bg_orange" onClick={startGame}>YARIŞA BAŞLA</Button>
                            </div>
                        </div>
                    </div>
                )}
                
                {gameState === 'playing' && (
                    <div id="p_game" className="sp11_screen sp11_active" style={{background:'transparent', backdropFilter:'none', padding:0, overflow:'hidden'}}>
                        <div id="sp11_play_area">
                            <div className="sp11_col">
                                <div className="sp11_ctrl">
                                    <div className="head_p1"><div className="sp11_q">{p1Question?.text}</div></div>
                                    <div className="sp11_options">{renderOptions(1)}</div>
                                </div>
                            </div>
                            <div id="sp11_stage">
                                <div className="sp11_lane"><div className="sp11_flag">🚩</div><div className="sp11_rope"></div><div id="c1" className="sp11_char" style={{ bottom: `${scores.p1 * 0.9}%`, transform: scores.p1 > 0 ? 'translateX(-50%)' : 'translateX(0)', left: scores.p1 > 0 ? '50%' : '-60px' }}><svg viewBox="0 0 100 130"><g className="view_front"><path d="M10 55 L 30 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M90 55 L 70 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M35 100 L 35 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><path d="M65 100 L 65 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><rect x="25" y="45" width="50" height="55" rx="8" fill="#0097a7" /><rect x="25" y="90" width="50" height="15" fill="#37474f" /><circle cx="50" cy="25" r="20" fill="#ffcc80" /><path d="M30 15 Q 50 5 70 15" fill="#3e2723" stroke="#3e2723" strokeWidth="5" strokeLinecap="round"/><circle cx="42" cy="25" r="2" fill="#333"/> <circle cx="58" cy="25" r="2" fill="#333"/><path d="M45 35 Q 50 40 55 35" stroke="#333" strokeWidth="2" fill="none"/></g><g className="view_back"><path d="M30 50 L 50 20" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M70 50 L 50 30" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M35 100 L 45 115" stroke="#333" strokeWidth="10" strokeLinecap="round" /><path d="M65 100 L 55 115" stroke="#333" strokeWidth="10" strokeLinecap="round" /><rect x="25" y="45" width="50" height="55" rx="8" fill="#0097a7" /><rect x="25" y="90" width="50" height="15" fill="#37474f" /><circle cx="50" cy="25" r="20" fill="#ffcc80" /><circle cx="50" cy="22" r="20" fill="#3e2723" /></g></svg></div></div>
                                <div className="sp11_lane"><div className="sp11_flag">🚩</div><div className="sp11_rope"></div><div id="c2" className="sp11_char" style={{ bottom: `${scores.p2 * 0.9}%`, transform: scores.p2 > 0 ? 'translateX(-50%)' : 'translateX(0)', left: scores.p2 > 0 ? '50%' : '-60px' }}><svg viewBox="0 0 100 130"><g className="view_front"><path d="M10 55 L 30 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M90 55 L 70 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M35 100 L 35 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><path d="M65 100 L 65 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><rect x="25" y="45" width="50" height="55" rx="8" fill="#e53935" /><rect x="25" y="90" width="50" height="15" fill="#37474f" /><circle cx="50" cy="25" r="20" fill="#ffcc80" /><path d="M30 15 Q 50 5 70 15" fill="#3e2723" stroke="#3e2723" strokeWidth="5" strokeLinecap="round"/><circle cx="42" cy="25" r="2" fill="#333"/> <circle cx="58" cy="25" r="2" fill="#333"/><path d="M45 35 Q 50 40 55 35" stroke="#333" strokeWidth="2" fill="none"/></g><g className="view_back"><path d="M30 50 L 50 20" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M70 50 L 50 30" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M35 100 L 45 115" stroke="#333" strokeWidth="10" strokeLinecap="round" /><path d="M65 100 L 55 115" stroke="#333" strokeWidth="10" strokeLinecap="round" /><rect x="25" y="45" width="50" height="55" rx="8" fill="#e53935" /><rect x="25" y="90" width="50" height="15" fill="#37474f" /><circle cx="50" cy="25" r="20" fill="#ffcc80" /><circle cx="50"cy="22" r="20" fill="#3e2723" /></g></svg></div></div>
                            </div>
                            <div className="sp11_col">
                                <div className="sp11_ctrl">
                                    <div className="head_p2"><div className="sp11_q">{p2Question?.text}</div></div>
                                    <div className="sp11_options">{renderOptions(2)}</div>
                                </div>
                            </div>
                        </div>
                        <Button onClick={() => { setGameState('home'); resetGameVisuals(); }} className="absolute bottom-4 left-4 z-50">Menü</Button>
                    </div>
                )}
                
                {gameState === 'win' && (
                    <div id="p_win" className="sp11_screen sp11_active">
                        <div className="result_card">
                            <h2 style={{color:'#FF9800', margin:0}}>YARIŞ BİTTİ</h2>
                            <h3 style={{color:'#333', margin:'5px 0 15px 0'}}>{winnerText} Kazandı!</h3>
                            <div style={{fontSize:'50px'}}>🏆</div>
                            <Button className="sp11_btn bg_blue" onClick={() => {setGameState('home'); resetGameVisuals();}} style={{width:'200px', margin: '0 auto 20px auto'}}>Tekrar Oyna</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SmartboardClimbingDuelPage() {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>}>
            <ClimbingDuelGame />
        </Suspense>
    );
}
