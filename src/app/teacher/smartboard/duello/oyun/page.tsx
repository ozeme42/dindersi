
'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserMinus, ArrowLeft, Crown, AlertTriangle, Loader2, Repeat, Home, Check, Trophy, PartyPopper, Award, Swords, Target, Timer, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { getQuestionsFromBank, type GetQuizOutput } from "@/lib/quiz-actions";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QuestionDialog } from "@/components/question-dialog";
import { Badge } from "@/components/ui/badge";
import { updateMultipleStudentScores } from "../../../../teacher/smartboard/actions";
import type { UserProfile, GetQuizInput, GetQuizOutput, Question } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, getDoc } from 'firebase/firestore';
import { playSound, stopSound } from "@/lib/audio-service";
import Confetti from 'react-dom-confetti';

type GameQuestion = GetQuizOutput['questions'][0] & {text: string};
type Player = { id: string; name: string; isGuest: boolean; };

function CompetitionLoadingSkeleton() {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
      </div>
    );
}

function ClimbingDuelGame() {
    const searchParams = useSearchParams();
    const [gameState, setGameState] = useState<'home' | 'game' | 'win'>('home');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    
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

    const startGame = useCallback(() => {
        if (questions.length < 2) return;
        setScores({ p1: 0, p2: 0 });
        askQuestion(1);
        askQuestion(2);
        setGameState('game');
    }, [questions]);
    
    useEffect(() => {
        if (gameState === 'home' && !isLoading && questions.length > 0) {
            startGame();
        }
    }, [gameState, isLoading, questions, startGame]);
    
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
    
    const nav = (targetId: 'home' | 'game' | 'win') => {
        if (targetId === 'home') {
            resetGameVisuals();
            fetchQuestions(); // Refetch questions for a new game
        }
        setGameState(targetId);
    }
    
    const resetGameVisuals = () => {
        setSunRotation(-90);
        setContainerClass('sky_morning');
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#263238]"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>
    if (error) return <div className="flex h-screen items-center justify-center bg-[#263238] text-red-400 p-8">{error}</div>

    return (
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

                {gameState === 'game' && (
                    <div id="p_game" className="sp11_screen sp11_active" style={{background:'transparent', backdropFilter:'none', padding:0, overflow:'hidden'}}>
                        <div id="sp11_play_area">
                            <div className="sp11_col">
                                <div className="sp11_ctrl">
                                    <div className="head_p1"><div id="q1" className="sp11_q">{p1Question?.text}</div></div>
                                    <div className="sp11_options">
                                        {(p1Question?.options || []).map((opt, i) => (<button key={i} className="option_btn" onClick={() => checkAnswer(1, opt)}>{opt}</button>))}
                                    </div>
                                </div>
                            </div>
                            <div id="sp11_stage">
                                <div className="sp11_lane"><div className="sp11_flag">🚩</div><div className="sp11_rope"></div><div id="c1" className="sp11_char" style={{ bottom: `${scores.p1 * 0.9}%`, transform: scores.p1 > 0 ? 'translateX(-50%)' : 'translateX(0)', left: scores.p1 > 0 ? '50%' : '-60px' }}><svg viewBox="0 0 100 130"><g className="view_front"><path d="M10 55 L 30 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M90 55 L 70 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M35 100 L 35 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><path d="M65 100 L 65 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><rect x="25" y="45" width="50" height="55" rx="8" fill="#0097a7" /><rect x="25" y="90" width="50" height="15" fill="#37474f" /><circle cx="50" cy="25" r="20" fill="#ffcc80" /><path d="M30 15 Q 50 5 70 15" fill="#3e2723" stroke="#3e2723" strokeWidth="5" strokeLinecap="round"/><circle cx="42" cy="25" r="2" fill="#333"/> <circle cx="58" cy="25" r="2" fill="#333"/><path d="M45 35 Q 50 40 55 35" stroke="#333" strokeWidth="2" fill="none"/></g></svg></div></div>
                                <div className="sp11_lane"><div className="sp11_flag">🚩</div><div className="sp11_rope"></div><div id="c2" className="sp11_char" style={{ bottom: `${scores.p2 * 0.9}%`, transform: scores.p2 > 0 ? 'translateX(-50%)' : 'translateX(0)', left: scores.p2 > 0 ? '50%' : '-60px' }}><svg viewBox="0 0 100 130"><g className="view_front"><path d="M10 55 L 30 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M90 55 L 70 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" /><path d="M35 100 L 35 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><path d="M65 100 L 65 125" stroke="#333" strokeWidth="10" strokeLinecap="round" /><rect x="25" y="45" width="50" height="55" rx="8" fill="#e53935" /><rect x="25" y="90" width="50" height="15" fill="#37474f" /><circle cx="50" cy="25" r="20" fill="#ffcc80" /><path d="M30 15 Q 50 5 70 15" fill="#3e2723" stroke="#3e2723" strokeWidth="5" strokeLinecap="round"/><circle cx="42" cy="25" r="2" fill="#333"/> <circle cx="58" cy="25" r="2" fill="#333"/><path d="M45 35 Q 50 40 55 35" stroke="#333" strokeWidth="2" fill="none"/></g></svg></div></div>
                            </div>
                            <div className="sp11_col">
                                <div className="sp11_ctrl">
                                    <div className="head_p2"><div id="q2" className="sp11_q">{p2Question?.text}</div></div>
                                    <div className="sp11_options">
                                        {(p2Question?.options || []).map((opt, i) => (<button key={i} className="option_btn" onClick={() => checkAnswer(2, opt)}>{opt}</button>))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'win' && (
                    <div id="p_win" className="sp11_screen sp11_active">
                        <div className="result_card">
                            <h2 style={{color:'#FF9800', margin:0}}>YARIŞ BİTTİ</h2>
                            <h3 id="wtxt" style={{color:'#333', margin:'5px 0 15px 0'}}>{winnerText} Kazandı!</h3>
                            <div style={{fontSize:'50px'}}>🏆</div>
                            <button className="sp11_btn bg_blue" onClick={() => nav('home')} style={{width:'200px', margin: '0 auto 20px auto'}}>Tekrar Oyna</button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

export default function SmartboardClimbingDuelPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#263238]"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>}>
            <ClimbingDuelGame />
        </Suspense>
    );
}
