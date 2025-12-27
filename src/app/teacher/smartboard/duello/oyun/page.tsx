'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from 'next/link';
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";

function ClimbingDuelGame() {
    const searchParams = useSearchParams();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Oyun durumu için state'ler
    const [gameState, setGameState] = useState<'home' | 'game' | 'win'>('home');
    const [scores, setScores] = useState({ p1: 0, p2: 0 });
    const [p1Question, setP1Question] = useState<Question | null>(null);
    const [p2Question, setP2Question] = useState<Question | null>(null);
    const [winnerText, setWinnerText] = useState('');
    const [sunRotation, setSunRotation] = useState(-90);
    const [containerClass, setContainerClass] = useState('sky_morning');
    const [sunClass, setSunClass] = useState('');
    const [isSoundOn, setIsSoundOn] = useState(true);

    const audioCtxRef = useRef<AudioContext | null>(null);

    const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
        if(!isSoundOn || !audioCtxRef.current) return;
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = type; osc.frequency.value = freq;
        osc.connect(gain); gain.connect(audioCtxRef.current.destination);
        osc.start();
        gain.gain.setValueAtTime(vol, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration);
        osc.stop(audioCtxRef.current.currentTime + duration);
    };

    const sfxCorrect = () => {
        if(!isSoundOn) return;
        playTone(600, 'sine', 0.6, 0.2);
        setTimeout(() => playTone(900, 'sine', 0.8, 0.1), 100);
    };

    const sfxWrong = () => {
        if(!isSoundOn) return;
        playTone(150, 'triangle', 0.3, 0.2);
    };
    
    const sfxWin = () => {
        if(!isSoundOn) return;
        let notes = [523, 659, 783, 1046];
        notes.forEach((n, i) => setTimeout(() => playTone(n, 'sine', 0.4, 0.2), i * 150));
    };

    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
            questionCount: 50,
            questionTypes: ['mcq'],
        };
        const result = await getQuestionsFromBank(params as any);
        if (result.error || result.questions.length < 5) {
            setError(result.error || "Bu oyun için yeterli soru bulunamadı.");
        } else {
            setQuestions(result.questions as Question[]);
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

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

    const startGame = () => {
        if (questions.length < 2) return;
        setScores({ p1: 0, p2: 0 });
        askQuestion(1);
        askQuestion(2);
        setGameState('game');
    };
    
    const checkAnswer = (player: 1 | 2, choice: string) => {
        const question = player === 1 ? p1Question : p2Question;
        if (!question) return;

        const isCorrect = choice === question.correctAnswer;
        
        if (isCorrect) {
            sfxCorrect();
            const newScore = (scores[player === 1 ? 'p1' : 'p2'] || 0) + 10;
            const updatedScores = { ...scores, [player === 1 ? 'p1' : 'p2']: Math.min(100, newScore) };
            setScores(updatedScores);
            
            if (newScore >= 100) {
                setWinnerText(player === 1 ? "Mavi Takım" : "Kırmızı Takım");
                sfxWin();
                setGameState('win');
            } else {
                 setTimeout(() => askQuestion(player), 500);
            }
        } else {
            sfxWrong();
            const newScore = (scores[player === 1 ? 'p1' : 'p2'] || 0) - 10;
            setScores({ ...scores, [player === 1 ? 'p1' : 'p2']: Math.max(0, newScore) });
        }
    };
    
    useEffect(() => {
        let maxScore = Math.max(scores.p1, scores.p2);
        let rotation = (maxScore * 1.8) - 90;
        setSunRotation(rotation);

        if(maxScore < 30) { setContainerClass('sky_morning'); setSunClass(''); }
        else if(maxScore < 70) { setContainerClass('sky_noon'); setSunClass('sun_hot'); }
        else if(maxScore < 90) { setContainerClass('sky_afternoon'); setSunClass('sun_hot'); }
        else { setContainerClass('sky_sunset'); setSunClass('sun_setting'); }
    }, [scores]);

    const toggleSound = () => {
      if(!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if(audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      setIsSoundOn(!isSoundOn);
    }

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#263238]"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>
    if (error) return <div className="flex h-screen items-center justify-center bg-[#263238] text-red-400 p-8">{error}</div>

    return (
      <>
        <div id="sp11_wrapper">
            <div id="sp11_container" className={containerClass}>
                <div className="top_btn_grp">
                    <button className="top_btn" id="sound_toggle" onClick={toggleSound}>
                        {isSoundOn ? "🔊 Ses: Açık" : "🔇 Ses: Kapalı"}
                    </button>
                </div>
                <div id="sun_pivot" style={{ transform: `rotate(${sunRotation}deg)` }}>
                    <div id="theSun" className={cn("sp11_sun", sunClass)}></div>
                </div>
                <div className="sp11_bird bird1"></div>
                <div className="sp11_bird bird2"></div>
                <div className="sp11_cloud" style={{width:'80px', height:'80px', top:'10%', left:'-10%', borderRadius:'50%'}}></div>
                <div className="sp11_cloud" style={{width:'100px', height:'60px', top:'20%', left:'-20%', animationDuration:'45s', borderRadius:'40%'}}></div>
                <div className="sp11_sea"><div className="wave"></div><div className="wave"></div></div>

                {gameState === 'home' && (
                    <div id="p_home" className="sp11_screen sp11_active">
                        <div className="home_layout">
                            <div className="home_right">
                                <h1 style={{color:'#009688', margin: '5px 0'}}>{searchParams.get('courseName')} - {searchParams.get('unitName')}</h1>
                                <div style={{fontSize:'30px', marginBottom:'10px'}}>🧗 Tırmanma Yarışı</div>
                                <ul className="rules_list">
                                    <li><strong>Oyun Kuralları:</strong></li>
                                    <li>Sınıf 2 takıma ayrılır (Mavi ve Kırmızı).</li>
                                    <li>Doğru bildikçe karakterler tırmanır.</li>
                                    <li><strong>Dikkat:</strong> Yanlış yapan 1 adım geri gider!</li>
                                    <li>Zirveye ilk ulaşan bayrağı kapar!</li>
                                </ul>
                                <button className="sp11_btn bg_orange" onClick={startGame}>YARIŞA BAŞLA</button>
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'game' && (
                    <div id="p_game" className="sp11_screen sp11_active">
                        <div id="sp11_play_area">
                            <div className="sp11_col"><div className="sp11_ctrl"><div className="head_p1"><div className="sp11_q">{p1Question?.text}</div></div><div className="sp11_options">{p1Question?.options?.map((opt, i) => (<button key={i} className="option_btn" onClick={() => checkAnswer(1, opt)}>{opt}</button>))}</div></div></div>
                            <div id="sp11_stage">
                                <div className="sp11_lane"><div className="sp11_flag">🚩</div><div className="sp11_rope"></div><div id="c1" className="sp11_char" style={{ bottom: `${scores.p1 * 0.9}%`, transform: scores.p1 > 0 ? 'translateX(-50%)' : 'translateX(0)', left: scores.p1 > 0 ? '50%' : '-60px' }}><svg viewBox="0 0 100 130"><g className="view_front"><path d="M10 55 L 30 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M90 55 L 70 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M35 100 L 35 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><path d="M65 100 L 65 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><rect x="25" y="45" width="50" height="55" rx="8" fill="#0097a7" /><rect x="25" y="90" width="50" height="15" fill="#37474f" /><circle cx="50" cy="25" r="20" fill="#ffcc80" /><path d="M30 15 Q 50 5 70 15" fill="#3e2723" stroke="#3e2723" strokeWidth="5" strokeLinecap="round"/><circle cx="42" cy="25" r="2" fill="#333"/> <circle cx="58" cy="25" r="2" fill="#333"/><path d="M45 35 Q 50 40 55 35" stroke="#333" strokeWidth="2" fill="none"/></g></svg></div></div>
                                <div className="sp11_lane"><div className="sp11_flag">🚩</div><div className="sp11_rope"></div><div id="c2" className="sp11_char" style={{ bottom: `${scores.p2 * 0.9}%`, transform: scores.p2 > 0 ? 'translateX(-50%)' : 'translateX(0)', left: scores.p2 > 0 ? '50%' : '-60px' }}><svg viewBox="0 0 100 130"><g className="view_front"><path d="M10 55 L 30 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M90 55 L 70 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M35 100 L 35 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><path d="M65 100 L 65 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><rect x="25" y="45" width="50" height="55" rx="8" fill="#e53935" /><rect x="25" y="90" width="50" height="15" fill="#37474f" /><circle cx="50" cy="25" r="20" fill="#ffcc80" /><path d="M30 15 Q 50 5 70 15" fill="#3e2723" stroke="#3e2723" strokeWidth="5" strokeLinecap="round"/><circle cx="42" cy="25" r="2" fill="#333"/> <circle cx="58" cy="25" r="2" fill="#333"/><path d="M45 35 Q 50 40 55 35" stroke="#333" strokeWidth="2" fill="none"/></g></svg></div></div>
                            </div>
                            <div className="sp11_col"><div className="sp11_ctrl"><div className="head_p2"><div className="sp11_q">{p2Question?.text}</div></div><div className="sp11_options">{p2Question?.options?.map((opt, i) => (<button key={i} className="option_btn" onClick={() => checkAnswer(2, opt)}>{opt}</button>))}</div></div></div>
                        </div>
                    </div>
                )}

                {gameState === 'win' && (
                    <div id="p_win" className="sp11_screen sp11_active">
                        <div className="result_card">
                            <h2 style={{color:'#FF9800', margin:0}}>YARIŞ BİTTİ</h2>
                            <h3 style={{color:'#333', margin:'5px 0 15px 0'}}>{winnerText} Kazandı!</h3>
                            <div style={{fontSize:'50px'}}>🏆</div>
                            <button className="sp11_btn bg_blue" onClick={() => setGameState('home')} style={{width:'200px', margin: '0 auto 20px auto'}}>Tekrar Oyna</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <style jsx global>{`
          /* Copied styles from user's HTML */
          body { margin: 0; padding: 0; background-color: #263238; font-family: 'Segoe UI', 'Roboto', 'Helvetica', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
          #sp11_wrapper { width: 100%; max-width: 1000px; margin: 0 auto; }
          #sp11_container { font-family: 'Segoe UI', 'Roboto', 'Helvetica', sans-serif; width: 100%; height: 95vh; max-height: 800px; min-height: 600px; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; user-select: none; -webkit-user-select: none; color: #333; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); transition: background 1.5s ease; background: #81d4fa; }
          #sp11_container * { box-sizing: border-box; touch-action: manipulation; }
          .sky_morning { background: linear-gradient(to bottom, #81d4fa 0%, #e1f5fe 100%); }
          .sky_noon { background: linear-gradient(to bottom, #29b6f6 0%, #b3e5fc 100%); }
          .sky_afternoon{ background: linear-gradient(to bottom, #ffb74d 0%, #fff9c4 100%); }
          .sky_sunset { background: linear-gradient(to bottom, #ff7043 0%, #3e2723 100%); }
          #sun_pivot { position: absolute; bottom: -20%; left: 50%; width: 10px; height: 110%; transform-origin: bottom center; transition: transform 1s cubic-bezier(0.25, 1, 0.5, 1); z-index: 1; pointer-events: none; }
          .sp11_sun { position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); width: 90px; height: 90px; background: radial-gradient(circle, #fff 20%, #ffeb3b 100%); border-radius: 50%; box-shadow: 0 0 40px #ff9800, 0 0 80px #ff5722; transition: all 0.5s; }
          .sun_hot { background: radial-gradient(circle, #fff 20%, #ffca28 100%); box-shadow: 0 0 50px #ff6f00; }
          .sun_setting { background: radial-gradient(circle, #fff 10%, #ff5722 100%); box-shadow: 0 0 30px #bf360c; transform: translate(-50%, -50%) scale(0.9); }
          .sp11_bird { position: absolute; width: 30px; height: 15px; border-top: 3px solid #333; border-right: 3px solid #333; border-radius: 50% 50% 0 0; transform: rotate(45deg); z-index: 2; opacity: 0.6; }
          .bird1 { top: 15%; left: -10%; animation: fly 25s linear infinite; }
          .bird2 { top: 25%; left: -10%; animation: fly 30s linear infinite 5s; width: 20px; height: 10px; }
          @keyframes fly { 0% { left: -10%; transform: rotate(45deg) translateY(0); } 50% { transform: rotate(45deg) translateY(-30px); } 100% { left: 110%; transform: rotate(45deg) translateY(0); } }
          .sp11_sea { position: absolute; bottom: 0; width: 100%; height: 15%; background: rgba(0, 50, 90, 0.5); z-index: 2; overflow: hidden; border-top: 1px solid rgba(255,255,255,0.3); }
          .wave { position: absolute; bottom: 0; width: 200%; height: 100%; background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg"><path d="M0,60 C300,100 600,0 1200,60 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.2)"/></svg>') repeat-x; background-size: 50% 100%; animation: wave_move 12s linear infinite; }
          .wave:nth-child(2) { bottom: 10px; opacity: 0.6; animation: wave_move 8s linear infinite reverse; }
          @keyframes wave_move { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .sp11_cloud { position: absolute; background: rgba(255,255,255,0.6); border-radius: 50%; animation: sp11_float 80s linear infinite; z-index: 1; filter: blur(3px); }
          @keyframes sp11_float { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }
          .sp11_screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 100; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(3px); overflow-y: auto; padding: 10px; }
          .sp11_active { display: flex; animation: sp11_zoom 0.3s ease-out; }
          @keyframes sp11_zoom { from { transform: scale(0.98); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .home_layout { display: flex; flex-direction: column; background: rgba(255,255,255,0.95); border-radius: 20px; box-shadow: 0 15px 40px rgba(0,0,0,0.3); padding: 25px; max-width: 900px; width: 98%; align-items: center; gap: 20px; border: 1px solid #ddd; }
          .home_right { text-align: center; }
          .rules_list { text-align: left; font-size: 1rem; color: #444; margin: 15px 0; padding: 15px; list-style-type: none; background: #e0f2f1; border-radius: 10px; border-left: 5px solid #009688; }
          .rules_list li { margin-bottom: 8px; padding-left: 20px; position: relative; }
          .rules_list li::before { content: '🕌'; position: absolute; left: 0; font-size:12px; top:3px;}
          .sp11_btn { width: 100%; padding: 15px; margin: 8px 0; border: none; border-radius: 10px; font-size: 1.2rem; font-weight: bold; color: white; cursor: pointer; box-shadow: 0 5px 0 rgba(0,0,0,0.2); transition: transform 0.1s; }
          .sp11_btn:active { transform: translateY(3px); box-shadow: none; }
          .bg_blue { background: #009688; } .bg_orange { background: #FF9800; }
          #sp11_play_area { display: flex; width: 100%; height: 100%; align-items: center; z-index: 10; overflow: hidden; }
          .sp11_col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5px; z-index: 20; height:100%; }
          .sp11_ctrl { background: transparent; border: none; box-shadow: none; padding: 0; width: 98%; max-width: 450px; display: flex; flex-direction: column; height: 95%; justify-content: center; }
          .head_p1 { background: linear-gradient(135deg, rgba(38, 198, 218, 0.95), rgba(0, 151, 167, 0.95)); color:white; padding:15px; border-radius:15px; margin-bottom:0; text-align:center; min-height: 110px; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 100%; border: 2px solid rgba(255,255,255,0.5);}
          .head_p2 { background: linear-gradient(135deg, rgba(239, 83, 80, 0.95), rgba(198, 40, 40, 0.95)); color:white; padding:15px; border-radius:15px; margin-bottom:0; text-align:center; min-height: 110px; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 100%; border: 2px solid rgba(255,255,255,0.5);}
          .sp11_q { font-size: 1.2rem; font-weight: 600; line-height: 1.3; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); }
          .sp11_options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; margin-top: 20px; margin-bottom: 20px; }
          .option_btn { background: rgba(255,255,255,0.9); backdrop-filter: blur(5px); border: 2px solid rgba(255,255,255,0.6); border-radius: 12px; width: 100%; height: 65px; font-size: 0.95rem; font-weight: bold; color: #2c3e50; cursor: pointer; transition: all 0.2s; text-align: center; box-shadow: 0 4px 0 rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; padding: 5px; word-wrap: break-word; line-height: 1.1; }
          .option_btn:active { transform: translateY(4px); box-shadow: none; }
          .option_btn:hover { background: #fff; border-color: #fff; transform: scale(1.02); }
          #sp11_stage { flex: 0.8; height: 100%; display: flex; justify-content: center; align-items: flex-end; padding-bottom: 0; padding-top: 60px; }
          .sp11_lane { position: relative; width: 80px; height: 100%; margin: 0 5px; display: flex; justify-content: center; }
          .sp11_rope { width: 12px; height: 100%; background: repeating-linear-gradient(45deg, #8d6e63, #8d6e63 6px, #5d4037 6px, #5d4037 12px); z-index: 5; box-shadow: 2px 0 5px rgba(0,0,0,0.5); position: relative; }
          .sp11_rope::before { content:''; position:absolute; top:0; left:-10px; width:32px; height:10px; background:#3e2723; border-radius:4px; }
          .sp11_flag { position: absolute; top: -40px; font-size: 30px; z-index: 1; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.3)); transition: opacity 0.3s; }
          .sp11_char { width: 60px; height: 80px; position: absolute; transition: bottom 0.5s cubic-bezier(0.25, 1, 0.5, 1), left 0.5s ease-in-out; z-index: 20; }
          .sp11_char svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 5px 5px rgba(0,0,0,0.3)); }
          .sp11_char.winner { z-index: 100; animation: char_celebrate 0.6s ease-in-out infinite alternate; }
          .sp11_char.winner::after { content: '🚩'; font-size: 40px; position: absolute; top: -25px; right: -20px; transform-origin: bottom left; animation: flag_wave 0.4s ease-in-out infinite alternate; filter: drop-shadow(0 0 10px gold); }
          @keyframes char_celebrate { from { transform: translateX(-50%) rotate(-5deg); } to { transform: translateX(-50%) rotate(5deg); } }
          @keyframes flag_wave { from { transform: rotate(-10deg); } to { transform: rotate(20deg); } }
          .result_card { background: white; padding: 20px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); text-align: center; width: 95%; max-width: 850px; max-height: 90vh; overflow-y: auto; }
          .top_btn_grp { position: absolute; top: 10px; right: 10px; z-index: 500; display:flex; gap:10px; }
          .top_btn { cursor: pointer; background: rgba(255,255,255,0.8); border: 1px solid #999; padding: 5px 12px; border-radius: 20px; font-weight: bold; color: #333; display: flex; align-items:center; gap: 5px; font-size: 0.8rem; transition: background 0.2s; }
          .top_btn:hover { background: #fff; }
          @media (max-width: 900px) { #sp11_container { height: 98vh; border-radius: 0; } .home_layout { flex-direction: column; padding: 10px; border:none; box-shadow:none; } h1 { font-size: 1.3rem !important; margin: 5px 0 !important; } #sp11_play_area { flex-direction: row; } .sp11_ctrl { width: 100%; padding: 0; background: transparent; margin: 0; border: none; box-shadow: none; } .sp11_col { padding: 2px; flex: 1.2; } #sp11_stage { flex: 0.6; padding-top: 40px; } .sp11_q { font-size: 0.85rem; } .head_p1, .head_p2 { min-height: 70px; padding: 5px; border-radius:10px; } .sp11_options { gap: 6px; margin-top: 10px; margin-bottom: 10px; } .option_btn { height: 50px; font-size: 0.8rem; padding: 2px; border-radius: 8px; background: rgba(255,255,255,0.9); } .sp11_lane { width: 40px; margin: 0; } .sp11_char { width: 35px; height: 50px; } .sp11_flag { font-size: 20px; top: -30px; } .sp11_char.winner::after { font-size: 25px; top: -15px; right: -10px; } .result_card { width: 98%; padding: 10px; } }
        `}</style>
      </>
    );
}

export default function SmartboardClimbingDuelPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#263238]"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>}>
            <ClimbingDuelGame />
        </Suspense>
    );
}
