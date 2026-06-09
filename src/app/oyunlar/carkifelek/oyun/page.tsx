'use client';

import { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { getCarkifelekQuestions, submitCarkifelekScoreAction } from '../actions';
import type { Question } from "@/lib/types";
import { Loader2, ArrowLeft, Trophy, Zap, CheckCircle2, X, Sparkles, Flame, Skull, Gift, CircleOff, Users, User, Target, Clock, Timer as TimerIcon, Crown, PartyPopper, Home, Bomb, Ghost, Swords } from "lucide-react";
import { Button } from '@/components/ui/button';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import Confetti from 'react-dom-confetti';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// --- DİLİM AYARLARI ---
type SliceType = 'easy' | 'hard' | '2x' | 'pass' | 'bankrupt' | 'joker' | 'sabotage' | 'steal';

interface WheelSlice {
    label: string;
    type: SliceType;
    color: string;
    textColor: string;
    points: number;
    icon: any;
}

const SLICES: WheelSlice[] = [
    { label: 'KOLAY', type: 'easy', color: '#3B82F6', textColor: 'white', points: 10, icon: Sparkles }, 
    { label: 'ZOR', type: 'hard', color: '#EC4899', textColor: 'white', points: 20, icon: Flame },   
    { label: '2x PUAN', type: '2x', color: '#F59E0B', textColor: 'white', points: 40, icon: Zap },      
    { label: 'BOMBA', type: 'sabotage', color: '#9333EA', textColor: 'white', points: 0, icon: Bomb },        
    { label: 'HIRSIZ', type: 'steal', color: '#14B8A6', textColor: 'white', points: 0, icon: Ghost }, 
    { label: 'İFLAS', type: 'bankrupt', color: '#EF4444', textColor: 'white', points: 0, icon: Skull },   
    { label: 'KOLAY', type: 'easy', color: '#0EA5E9', textColor: 'white', points: 10, icon: Sparkles }, 
    { label: 'PAS', type: 'pass', color: '#64748B', textColor: 'white', points: 0, icon: CircleOff },        
    { label: 'ZOR', type: 'hard', color: '#F43F5E', textColor: 'white', points: 20, icon: Flame },        
    { label: 'JOKER', type: 'joker', color: '#10B981', textColor: 'white', points: 50, icon: Gift },     
];

const TOTAL_SLICES = SLICES.length;
const SLICE_DEGREE = 360 / TOTAL_SLICES;

// --- CSS STYLES (MOBİL UYUMLU) ---
const wheelStyles = `
  .wheel-wrapper {
    position: relative;
    width: 85vw; 
    height: 85vw;
    max-width: 320px;
    max-height: 320px;
    
    border-radius: 50%;
    background: #1e293b;
    padding: 8px;
    box-shadow: 0 0 30px rgba(79, 70, 229, 0.4), inset 0 0 20px rgba(0,0,0,0.5);
    border: 4px solid #475569;
    margin: 0 auto; 
  }
  
  .wheel-container { 
    width: 100%; height: 100%; 
    border-radius: 50%; 
    position: relative;
    overflow: hidden;
    transition: transform 4s cubic-bezier(0.15, 0.85, 0.35, 1.05); 
    border: 2px solid white;
  }

  @media (min-width: 768px) {
    .wheel-wrapper { 
        width: 480px; 
        height: 480px; 
        max-width: none; 
        max-height: none;
        padding: 15px; 
        border-width: 8px; 
    }
    .wheel-container { border-width: 6px; }
  }

  .slice-text-container {
    position: absolute;
    top: 50%; left: 50%;
    width: 0; height: 0;
  }
  
  .slice-text {
    position: absolute;
    left: -40px; bottom: 0;
    width: 80px;
    height: 140px;
    transform-origin: bottom center;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding-top: 15px;
    text-align: center;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    pointer-events: none;
  }

  @media (min-width: 768px) {
    .slice-text { 
        left: -50px;
        width: 100px;
        height: 220px; 
        padding-top: 35px; 
    }
  }

  .pointer {
    position: absolute; 
    top: -20px; left: 50%; 
    transform: translateX(-50%);
    width: 40px; height: 50px; 
    background: radial-gradient(circle at 30% 30%, #ef4444, #991b1b);
    clip-path: polygon(100% 0, 50% 100%, 0 0);
    z-index: 50; 
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
  }

  @media (min-width: 768px) {
    .pointer { width: 50px; height: 60px; top: -25px; }
  }

  .center-knob {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 50px; height: 50px; 
    background: radial-gradient(circle at 30% 30%, #f8fafc, #cbd5e1);
    border-radius: 50%;
    z-index: 40; 
    box-shadow: 0 0 15px rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    border: 4px solid #475569;
  }

  @media (min-width: 768px) {
    .center-knob { width: 70px; height: 70px; border-width: 6px; }
  }

  .shake-animation {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  }

  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }
`;

export function CarkifelekGameClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [score, setScore] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'setup' | 'idle' | 'spinning' | 'result' | 'question' | 'feedback' | 'finished' | 'sabotage_select'>('loading');
    
    // Oyun Verileri
    const [questionsEasy, setQuestionsEasy] = useState<Question[]>([]);
    const [questionsHard, setQuestionsHard] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [currentSlice, setCurrentSlice] = useState<WheelSlice | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
    
    // Rekabetçi Mod State'leri
    const [gameMode, setGameMode] = useState<'single' | 'team'>('single');
    const [teamCount, setTeamCount] = useState<number>(2);
    const [teamScores, setTeamScores] = useState<number[]>([0, 0, 0, 0, 0]);
    const [currentTeamTurn, setCurrentTeamTurn] = useState<number>(0);
    const [streak, setStreak] = useState<number[]>([0, 0, 0, 0, 0]); // Kombo için
    
    const [sabotageTarget, setSabotageTarget] = useState<number | null>(null);
    const [stealInfo, setStealInfo] = useState<{from: number, amount: number} | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    // Diğer State'ler
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const gameContext = `Çarkıfelek - ${searchParams.get('topicName') || 'Genel'}`;
    
    const backUrl = useMemo(() => {
        const { courseId, unitId, topicId, courseName, unitName, topicName } = Object.fromEntries(searchParams.entries());
        if (courseId && unitId && topicId) {
            return `/konu/${courseId}/${unitId}/${topicId}/oyunlar?courseName=${encodeURIComponent(courseName || '')}&unitName=${encodeURIComponent(unitName || '')}&topicName=${encodeURIComponent(topicName || '')}`;
        }
        if (user) {
            return user.role === 'teacher' || user.role === 'superadmin' ? '/teacher' : '/student';
        }
        return '/oyunlar/carkifelek';
    }, [searchParams, user]);

    const wheelGradientStops = SLICES.map((slice, i) => {
        const start = i * SLICE_DEGREE;
        const end = start + SLICE_DEGREE;
        return `${slice.color} ${start}deg ${end}deg`;
    }).join(', ');

    useEffect(() => {
        const fetchQuestions = async () => {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                isStatic: searchParams.get('isStatic') === 'true',
            };
            const { questions, error } = await getCarkifelekQuestions(params);
            if (error || !questions) {
                setError(error || "Sorular yüklenemedi.");
                setGameState('finished');
            } else {
                setQuestionsEasy(questions.easy);
                setQuestionsHard(questions.hard);
                setGameState('setup'); // Önce mod seçimi
            }
        };
        fetchQuestions();
    }, [searchParams]);

    // Timer Logic
    useEffect(() => {
        if (gameState !== 'question' || !currentQuestion) return;

        let initialTime = 30; // Varsayılan
        if (currentQuestion.type === 'tf') initialTime = 15; // Doğru/Yanlış için 15sn

        setTimeLeft(initialTime);

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 0) {
                    clearInterval(timer);
                    handleTimeout(); // Süre bitince tetikle
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState, currentQuestion]);

    const handleTimeout = () => {
        playSound('incorrect');
        setFeedback('timeout');
        
        // Timeout penalty for Sabotage
        if (currentSlice?.type === 'sabotage' && sabotageTarget !== null) {
            const newScores = [...teamScores];
            newScores[sabotageTarget] = Math.max(0, newScores[sabotageTarget] - 30);
            setTeamScores(newScores);
        }

        setTimeout(() => {
            setFeedback(null);
            nextTurn();
        }, 2500);
    };

    const handleStartGame = (mode: 'single' | 'team', count: number = 2) => {
        setGameMode(mode);
        setTeamCount(count);
        setTeamScores(new Array(count).fill(0));
        setStreak(new Array(count).fill(0));
        setCurrentTeamTurn(0);
        setScore(0);
        setGameState('idle');
    };

    const nextTurn = () => {
        setSabotageTarget(null);
        setStealInfo(null);
        setSelectedOption(null);
        if (gameMode === 'team') {
            setCurrentTeamTurn((prev) => (prev + 1) % teamCount);
        }
        setGameState('idle');
    };

    const spinWheel = () => {
        if (gameState !== 'idle') return;
        setGameState('spinning');
        playSound('coin-flip'); 

        const winningIndex = Math.floor(Math.random() * TOTAL_SLICES);
        const winningSlice = activeSlices[winningIndex];
        
        const sliceCenterAngle = (winningIndex * SLICE_DEGREE) + (SLICE_DEGREE / 2);
        const currentFullRotations = Math.floor(rotation / 360);
        
        const spins = 5 + Math.floor(Math.random() * 6);
        const targetRotation = ((currentFullRotations + spins) * 360) - sliceCenterAngle;
        
        const jitter = Math.floor(Math.random() * 34) - 17;
        const finalRotation = targetRotation + jitter;

        setRotation(finalRotation);

        setTimeout(() => {
            setCurrentSlice(winningSlice);
            playSound('pop');
            processSliceResult(winningSlice);
        }, 4000); 
    };

    const processSliceResult = (slice: WheelSlice) => {
        if (slice.type === 'pass') {
            playSound('lose');
            setGameState('result');
            setTimeout(nextTurn, 2500);
        } else if (slice.type === 'bankrupt') {
            playSound('lose'); // TODO: Add dramatic shatter sound
            if (gameMode === 'single') {
                setScore(0);
            } else {
                const newScores = [...teamScores];
                newScores[currentTeamTurn] = 0;
                setTeamScores(newScores);
                // Reset streak
                const newStreaks = [...streak];
                newStreaks[currentTeamTurn] = 0;
                setStreak(newStreaks);
            }
            setGameState('result');
            setTimeout(nextTurn, 3000);
        } else if (slice.type === 'joker') {
            playSound('win');
            if (gameMode === 'single') {
                setScore(s => s + slice.points);
            } else {
                const newScores = [...teamScores];
                newScores[currentTeamTurn] += slice.points;
                setTeamScores(newScores);
            }
            setShowConfetti(true);
            setGameState('result');
            setTimeout(() => { 
                setShowConfetti(false); 
                nextTurn();
            }, 3000);
        } else if (slice.type === 'steal') {
            playSound('win'); 
            if (gameMode === 'team') {
                // Lideri bul (kendisi hariç)
                let highestScore = -1;
                let targetIdx = -1;
                teamScores.forEach((s, idx) => {
                    if (idx !== currentTeamTurn && s > highestScore) {
                        highestScore = s;
                        targetIdx = idx;
                    }
                });
                
                if (targetIdx !== -1 && highestScore > 0) {
                    const amount = Math.min(30, highestScore);
                    const newScores = [...teamScores];
                    newScores[targetIdx] -= amount;
                    newScores[currentTeamTurn] += amount;
                    setTeamScores(newScores);
                    setStealInfo({ from: targetIdx, amount });
                } else {
                    setStealInfo(null); // Çalınacak puan yok
                }
            } else {
                setScore(s => s + 30); // Teklide bedava 30 puan
            }
            setGameState('result');
            setTimeout(nextTurn, 4000);
            
        } else if (slice.type === 'sabotage') {
            if (gameMode === 'team') {
                setGameState('sabotage_select');
            } else {
                setGameState('result'); // Teklide pas gibi davranır
                setTimeout(nextTurn, 2500);
            }
        } else {
            // Soru sorma aşaması (KOLAY, ZOR, 2x)
            const pool = slice.type === 'easy' ? questionsEasy : questionsHard;
            const finalPool = slice.type === '2x' ? questionsHard : pool;
            
            if (finalPool.length === 0) {
                // Soru kalmadıysa bedava puan ver
                if (gameMode === 'single') setScore(s => s + slice.points);
                else {
                    const newScores = [...teamScores];
                    newScores[currentTeamTurn] += slice.points;
                    setTeamScores(newScores);
                }
                setGameState('idle');
                return;
            }

            const q = finalPool[Math.floor(Math.random() * finalPool.length)];
            setCurrentQuestion(q);
            setGameState('question');
        }
    };

    const handleAnswer = (option: string) => {
        if (!currentQuestion || !currentSlice) return;
        
        setSelectedOption(option);
        const isCorrect = option === currentQuestion.correctAnswer;
        
        if (isCorrect) {
            playSound('correct');
            setFeedback('correct');
            
            if (currentSlice.type === 'sabotage' && sabotageTarget !== null) {
                const newScores = [...teamScores];
                newScores[sabotageTarget] += 30; // Hedef kurtuldu ve puanı aldı
                setTeamScores(newScores);
            } else {
                let pointsToAdd = currentSlice.points;
                if (currentSlice.type === '2x') pointsToAdd = 40; 
                
                if (gameMode === 'single') {
                    setScore(prev => prev + pointsToAdd);
                } else {
                    const newScores = [...teamScores];
                    const newStreaks = [...streak];
                    
                    // Streak (Kombo) kontrolü
                    const isCombo = newStreaks[currentTeamTurn] >= 2; // 3. cevapta x1.5
                    const multiplier = isCombo ? 1.5 : 1;
                    
                    newScores[currentTeamTurn] += Math.floor(pointsToAdd * multiplier);
                    newStreaks[currentTeamTurn] += 1;
                    
                    setTeamScores(newScores);
                    setStreak(newStreaks);
                }
            }
            setShowConfetti(true);
        } else {
            playSound('incorrect');
            setFeedback('wrong');
            
            if (currentSlice.type === 'sabotage' && sabotageTarget !== null) {
                const newScores = [...teamScores];
                newScores[sabotageTarget] = Math.max(0, newScores[sabotageTarget] - 30); // Hedef patladı
                setTeamScores(newScores);
            } else {
                if (gameMode === 'team') {
                    const newStreaks = [...streak];
                    newStreaks[currentTeamTurn] = 0; // Kombo sıfırlandı
                    setStreak(newStreaks);
                }
            }
        }

        setTimeout(() => {
            setFeedback(null);
            setSelectedOption(null);
            setShowConfetti(false);
            nextTurn();
        }, 4000);
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitCarkifelekScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Tebrikler!', description: `${score} puan kazandın!` });
            router.push(backUrl);
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    if (gameState === 'loading') return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-purple-500"/></div>;

    // --- SETUP EKRANI ---
    if (gameState === 'setup') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-4 md:p-8 relative overflow-hidden font-sans">
                {/* Background FX */}
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

                <div className="relative z-10 w-full max-w-sm md:max-w-md flex flex-col items-center gap-8">
                    {/* Game Title Logo Style */}
                    <div className="text-center mb-6">
                        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] tracking-tighter uppercase italic transform -rotate-2 leading-none">
                            Kaos<br/><span className="text-transparent bg-clip-text bg-gradient-to-b from-rose-400 to-rose-600">Çarkı</span>
                        </h1>
                    </div>

                    {gameMode === 'single' ? (
                        <div className="flex flex-col gap-5 w-full">
                            <button 
                                onClick={() => handleStartGame('single')} 
                                className="group relative w-full bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 border-b-[8px] border-blue-900 rounded-[2rem] p-5 md:p-6 transition-all active:border-b-[2px] active:translate-y-[6px] shadow-2xl flex items-center gap-5"
                            >
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                    <User className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-md" />
                                </div>
                                <div className="text-left flex-1">
                                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wide drop-shadow-md mb-1 leading-none">Tek Kişilik</h2>
                                    <p className="text-blue-200 text-xs md:text-sm font-bold opacity-90 uppercase tracking-wider">Kendi rekorunu kır</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => setGameMode('team')} 
                                className="group relative w-full bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 border-b-[8px] border-rose-900 rounded-[2rem] p-5 md:p-6 transition-all active:border-b-[2px] active:translate-y-[6px] shadow-2xl flex items-center gap-5"
                            >
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                    <Users className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-md" />
                                </div>
                                <div className="text-left flex-1">
                                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wide drop-shadow-md mb-1 leading-none">Takım Savaşı</h2>
                                    <p className="text-rose-200 text-xs md:text-sm font-bold opacity-90 uppercase tracking-wider">Sınıfı birbirine kat!</p>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col gap-6 animate-in slide-in-from-right fade-in duration-300">
                            <div className="text-center">
                                <h2 className="text-3xl md:text-4xl font-black text-white uppercase drop-shadow-md tracking-widest">Kaç Takım?</h2>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 md:gap-5">
                                {[2, 3, 4, 5].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handleStartGame('team', num)}
                                        className="relative bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 border-b-[8px] border-purple-900 rounded-3xl h-24 md:h-32 flex items-center justify-center text-5xl md:text-6xl font-black text-white transition-all active:border-b-[2px] active:translate-y-[6px] shadow-xl group"
                                    >
                                        <span className="drop-shadow-lg group-hover:scale-110 transition-transform">{num}</span>
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={() => setGameMode('single')} 
                                className="mt-2 flex items-center justify-center gap-2 text-slate-400 hover:text-white font-bold uppercase tracking-widest text-sm py-4 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" /> GERİ DÖN
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (gameState === 'finished') {
         return (
             <div className="h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-950 text-white gap-8 relative overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-80" />
                 <PartyPopper className="h-24 w-24 text-yellow-500 animate-bounce relative z-10" />
                 
                 <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 relative z-10 drop-shadow-lg text-center">
                     {gameMode === 'single' ? "Oyun Bitti!" : "Büyük Savaş Sona Erdi!"}
                 </h1>
                 
                 {gameMode === 'single' ? (
                     <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm">
                        <div className="bg-slate-900/80 border border-white/10 p-8 rounded-3xl backdrop-blur-md text-center shadow-2xl w-full">
                            <p className="text-slate-400 text-lg mb-2">Toplam Skorun</p>
                            <p className="text-6xl font-black text-emerald-400">{score}</p>
                        </div>
                        <div className="flex flex-col gap-3 w-full">
                            <Button onClick={() => window.location.reload()} variant="outline" className="h-14 px-8 text-lg border-slate-700 text-slate-300 hover:bg-slate-800 w-full">
                                Tekrar Oyna
                            </Button>
                            {user ? (
                                <Button onClick={handleSaveAndExit} disabled={isSaving || isScoreSaved} className="h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 w-full">
                                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : "Kaydet ve Çık"}
                                </Button>
                            ) : (
                                <Button onClick={() => router.push('/')} className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg w-full">
                                    <Home className="mr-2 h-5 w-5" /> Ana Sayfa
                                </Button>
                            )}
                        </div>
                     </div>
                 ) : (
                     <div className="w-full max-w-2xl relative z-10 flex flex-col max-h-[80vh]">
                         <Card className="bg-slate-900/90 border-slate-800 text-white shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden">
                             <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-800 p-4 md:p-6 text-center flex-shrink-0">
                                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-3">
                                    <Trophy className="h-8 w-8 text-yellow-500" /> Skor Tablosu
                                </CardTitle>
                             </CardHeader>
                             <CardContent className="p-0 overflow-y-auto custom-scrollbar">
                                 <div className="flex flex-col">
                                     {(() => {
                                         const maxScore = Math.max(...teamScores);
                                         const winners = teamScores.map((s, i) => s === maxScore ? i + 1 : null).filter(Boolean);
                                         
                                         return (
                                             <div className="p-6 md:p-8 text-center bg-gradient-to-b from-slate-800/50 to-transparent flex-shrink-0">
                                                 <h2 className="text-3xl md:text-5xl font-black text-yellow-400 mb-2 drop-shadow-md leading-tight italic">
                                                     {winners.length > 1 ? "BERABERLİK!" : `TEBRİKLER ${winners[0]}. TAKIM!`}
                                                 </h2>
                                                 <p className="text-slate-400 text-sm md:text-lg">Kıyasıya bir rekabet oldu!</p>
                                             </div>
                                         )
                                     })()}

                                     <div className="grid gap-2 p-4 md:p-6">
                                        {teamScores.map((score, index) => {
                                            const isWinner = score === Math.max(...teamScores) && score > 0;
                                            return (
                                                <div key={index} className={cn(
                                                    "flex justify-between items-center p-4 md:p-5 rounded-2xl font-bold text-lg transition-all",
                                                    isWinner 
                                                        ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 text-yellow-200 scale-[1.02] shadow-[0_0_30px_rgba(234,179,8,0.2)]" 
                                                        : "bg-slate-800/50 border border-slate-700/50 text-slate-400"
                                                )}>
                                                    <div className="flex items-center gap-4">
                                                        <span className={cn("w-10 h-10 rounded-full flex items-center justify-center text-lg font-black", isWinner ? "bg-yellow-500 text-black shadow-lg" : "bg-slate-700 text-white")}>
                                                            {index + 1}
                                                        </span>
                                                        <span className="text-xl">{index + 1}. Takım</span>
                                                    </div>
                                                    <span className="font-black text-2xl md:text-3xl">{score} P</span>
                                                </div>
                                            );
                                        })}
                                     </div>
                                 </div>
                             </CardContent>
                         </Card>
                         <div className="mt-4 md:mt-8 flex flex-col md:flex-row gap-4 justify-center flex-shrink-0 pb-4 w-full max-w-lg mx-auto">
                            <Button onClick={() => window.location.reload()} className="flex-1 h-14 text-xl font-black rounded-xl bg-white text-slate-900 hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                Rövanş Maçı
                            </Button>
                            
                            <Button onClick={() => router.push(backUrl)} variant="outline" className="flex-1 h-14 text-lg font-bold border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl">
                                Ana Menüye Dön
                            </Button>
                         </div>
                     </div>
                 )}
             </div>
         )
    }

    const currentStreakValue = gameMode === 'team' ? streak[currentTeamTurn] : 0;
    const isComboActive = currentStreakValue >= 2;

    return (
        <div className={cn("min-h-screen text-white overflow-hidden flex flex-col relative font-sans select-none pb-20 md:pb-0 transition-colors duration-500",
            currentSlice?.type === 'bankrupt' && gameState === 'result' ? "bg-red-950 shake-animation" : "bg-slate-950"
        )}>
            <style jsx global>{wheelStyles}</style>

            {/* --- ARKA PLAN --- */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black" />
                <div className={cn("absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] transition-colors duration-1000", isComboActive ? "bg-orange-600/40 animate-pulse" : "bg-purple-600/20")} />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            {/* --- SABOTAJ SEÇİM EKRANI --- */}
            {gameState === 'sabotage_select' && (
                <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 animate-in zoom-in-95 duration-300">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent pointer-events-none" />
                    <Bomb className="w-24 h-24 text-purple-500 animate-pulse mb-6 drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]" />
                    <h2 className="text-4xl md:text-6xl font-black text-purple-400 mb-4 uppercase tracking-tighter drop-shadow-lg text-center italic">HEDEFİNİ SEÇ!</h2>
                    <p className="text-slate-300 mb-10 text-xl md:text-2xl text-center max-w-xl font-bold bg-purple-900/30 px-6 py-3 rounded-full border border-purple-500/30">
                        Zor soruyu kime kitleyeceksin? Yanlış bilirlerse <span className="text-red-400">-30 Puan</span> kaybedecekler!
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                        {teamScores.map((_, idx) => {
                            if (idx === currentTeamTurn) return null;
                            return (
                                <button 
                                    key={idx}
                                    onClick={() => {
                                        playSound('click');
                                        setSabotageTarget(idx);
                                        const pool = questionsHard;
                                        const q = pool[Math.floor(Math.random() * pool.length)] || questionsEasy[0];
                                        setCurrentQuestion(q);
                                        setGameState('question');
                                    }}
                                    className="group bg-slate-900 hover:bg-purple-600 border-2 border-purple-500/50 p-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] hover:scale-105 hover:-translate-y-2 flex items-center justify-between"
                                >
                                    <span className="text-2xl md:text-3xl font-black text-white">{idx + 1}. TAKIM</span>
                                    <Target className="w-8 h-8 text-purple-400 group-hover:text-white" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- HUD --- */}
            <div className="relative z-20 p-2 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4 pointer-events-none">
                
                <div className="pointer-events-auto flex items-center gap-4">
                    <Button variant="ghost" className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full h-12 w-12 p-0 shadow-lg backdrop-blur-md border border-white/10" onClick={() => setGameState('finished')}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                </div>

                {/* --- SKORBOARD --- */}
                {gameMode === 'team' && (
                    <div className="pointer-events-auto w-full md:w-auto z-30 transition-all duration-500 absolute top-4 right-4 md:right-8">
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-2xl p-2 md:p-3 flex gap-2">
                            {teamScores.slice(0, teamCount).map((s, i) => {
                                const isCurrentTurn = currentTeamTurn === i;
                                const isLeader = s === Math.max(...teamScores) && s > 0;

                                return (
                                    <div key={i} className={cn(
                                        "flex flex-col items-center justify-center rounded-2xl transition-all duration-500 relative min-w-[70px] md:min-w-[100px]",
                                        isCurrentTurn 
                                            ? "bg-gradient-to-b from-indigo-600 to-indigo-800 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] scale-110 z-10 py-3 md:py-4 border-2 border-indigo-400" 
                                            : "bg-slate-800/40 text-slate-400 border border-transparent py-2 md:py-3"
                                    )}>
                                        {isLeader && (
                                            <div className="absolute -top-3 md:-top-4 -right-1 md:-right-2 animate-bounce z-20">
                                                <Crown className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                                            </div>
                                        )}
                                        {isComboActive && isCurrentTurn && (
                                            <div className="absolute -bottom-3 animate-pulse z-20">
                                                <Flame className="w-6 h-6 text-orange-500 fill-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className={cn("text-[10px] md:text-xs font-black uppercase tracking-wider", isCurrentTurn ? "text-indigo-200" : "text-slate-500")}>
                                                TAKIM {i + 1}
                                            </span>
                                        </div>
                                        <span className={cn("font-black leading-none", isCurrentTurn ? "text-3xl md:text-4xl drop-shadow-md" : "text-xl md:text-2xl")}>
                                            {s}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- TEKLİ MOD SKORU --- */}
                {gameMode === 'single' && (
                    <div className="pointer-events-auto absolute top-4 right-4 md:right-8">
                        <div className="bg-slate-900/80 border border-white/10 px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 backdrop-blur-md">
                            <Trophy className="h-8 w-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                            <span className="text-3xl font-black text-white tracking-widest">{score}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* --- OYUN ALANI --- */}
            <div className="flex-grow flex flex-col items-center justify-center relative z-10 p-2 overflow-hidden min-h-[500px]">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <Confetti active={showConfetti} config={{ elementCount: 300, spread: 360, startVelocity: 40, colors: ['#facc15', '#f43f5e', '#3b82f6', '#10b981'] }} />
                </div>

                {/* SIRA GÖSTERGESİ */}
                {gameMode === 'team' && gameState === 'idle' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-top-10 fade-in duration-500 w-full text-center mt-10 md:mt-0">
                        {isComboActive ? (
                            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-600 to-red-600 border border-orange-400 px-8 py-3 rounded-full shadow-[0_0_30px_rgba(234,88,12,0.5)] animate-pulse">
                                <Flame className="w-6 h-6 text-yellow-300" />
                                <span className="text-xl md:text-2xl font-black text-white tracking-widest italic">{currentTeamTurn + 1}. TAKIM ALEV ALDI! (x1.5 Puan)</span>
                                <Flame className="w-6 h-6 text-yellow-300" />
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 px-8 py-3 rounded-full shadow-2xl">
                                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Sıra Kimde?</span>
                                <span className="text-2xl font-black text-white flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                                    {currentTeamTurn + 1}. TAKIM
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ÇARK --- */}
                <div className={cn("transition-all duration-700 transform origin-center mt-16 md:mt-0", gameState === 'question' || gameState === 'feedback' || gameState === 'sabotage_select' ? "scale-0 opacity-0" : "scale-100 opacity-100")}>
                    <div className="wheel-wrapper">
                        <div className="pointer"></div>

                        <div className="wheel-container" style={{ 
                            transform: `rotate(${rotation}deg)`,
                            background: `conic-gradient(from 0deg, ${wheelGradientStops})`
                        }}>
                            {SLICES.map((slice, index) => {
                                const angle = index * SLICE_DEGREE + (SLICE_DEGREE / 2);
                                const Icon = slice.icon;
                                
                                return (
                                    <div 
                                        key={index}
                                        className="slice-text-container"
                                        style={{ transform: `rotate(${angle}deg)` }}
                                    >
                                        <div className="slice-text">
                                            <Icon className="w-5 h-5 md:w-8 md:h-8 mb-1 md:mb-2 opacity-90 drop-shadow-md" />
                                            <span className="font-black text-[9px] md:text-sm tracking-tighter block max-w-[60px] md:max-w-[80px] leading-tight drop-shadow-md">
                                                {slice.label}
                                            </span>
                                            {slice.points > 0 && <span className="text-[8px] md:text-[10px] font-bold opacity-90 mt-0.5 drop-shadow-sm">{slice.points} P</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="center-knob">
                            <Zap className="h-6 w-6 md:h-8 md:w-8 text-slate-700 fill-current" />
                        </div>
                    </div>
                </div>

                {/* --- KONTROL BUTONU --- */}
                {gameState === 'idle' && (
                    <div className="mt-8 md:mt-16 animate-in slide-in-from-bottom-10 fade-in duration-500 z-30">
                        <button 
                            onClick={spinWheel}
                            className={cn("group relative px-12 md:px-20 py-5 md:py-8 rounded-full font-black text-xl md:text-3xl text-white shadow-[0_0_50px_rgba(124,58,237,0.5)] hover:scale-105 transition-all active:scale-95 border-4",
                                isComboActive ? "bg-gradient-to-r from-orange-500 to-red-600 border-yellow-400 shadow-[0_0_50px_rgba(249,115,22,0.8)]" : "bg-gradient-to-r from-purple-600 to-indigo-600 border-white/20"
                            )}
                        >
                            <span className="relative z-10 flex items-center gap-3 md:gap-4 drop-shadow-md">
                                {isComboActive && <Flame className="w-6 h-6 md:w-8 md:h-8 fill-yellow-300 text-yellow-300" />}
                                {gameMode === 'team' ? `${currentTeamTurn + 1}. TAKIM ÇEVİR!` : "ÇARKI ÇEVİR!"} 
                                {!isComboActive && <Zap className="w-6 h-6 md:w-8 md:h-8 fill-white" />}
                            </span>
                        </button>
                    </div>
                )}

                {/* --- SONUÇ MESAJI (Pas, İflas, Joker, Steal) --- */}
                {gameState === 'result' && currentSlice && (
                    <div className="absolute inset-0 flex items-center justify-center z-[110] px-4">
                        <div className={cn("bg-slate-900/95 border p-8 md:p-12 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] backdrop-blur-xl w-full max-w-md text-center animate-in zoom-in-75 duration-300",
                            currentSlice.type === 'bankrupt' ? "border-red-500/50" : "border-white/20"
                        )}>
                            <div className="mb-8 flex justify-center">
                                <div className="p-6 rounded-full bg-white/5 shadow-inner">
                                    <currentSlice.icon className={cn("w-20 h-20 md:w-24 md:h-24", currentSlice.type === 'bankrupt' && "animate-bounce")} style={{ color: currentSlice.color }} />
                                </div>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-black mb-6 uppercase tracking-tighter drop-shadow-lg italic" style={{ color: currentSlice.color }}>
                                {currentSlice.label}
                            </h2>
                            <p className="text-slate-200 text-xl md:text-2xl font-bold leading-relaxed">
                                {currentSlice.type === 'pass' && "Bu turu pas geçiyorsun. Sıra diğer takımda."}
                                {currentSlice.type === 'bankrupt' && "Eyvah! Puanlar sıfırlandı. Çok yazık!"}
                                {currentSlice.type === 'joker' && "Şanslısın! Hiçbir şey yapmadan +50 Puan kaptın!"}
                                {currentSlice.type === 'sabotage' && "Bomba patladı!"}
                                {currentSlice.type === 'steal' && stealInfo 
                                    ? `İnanılmaz! Lider olan ${stealInfo.from + 1}. Takım'dan ${stealInfo.amount} puan çaldın!` 
                                    : (currentSlice.type === 'steal' && "Çalacak puanı olan rakip yoktu...")}
                            </p>
                        </div>
                    </div>
                )}

                {/* --- NORMAL SORU MODALI --- */}
                {(gameState === 'question' || gameState === 'feedback') && currentQuestion && currentSlice && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className={cn(
                            "bg-slate-900 border-2 rounded-[3rem] p-6 md:p-12 w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col transition-all max-h-[90dvh]",
                            feedback === 'correct' ? "border-emerald-500 shadow-[0_0_100px_rgba(16,185,129,0.3)]" : 
                            feedback === 'wrong' ? "border-rose-500 shadow-[0_0_100px_rgba(244,63,94,0.3)]" : 
                            "border-white/10"
                        )}>
                            
                            {/* Header: Kategori, Puan, Timer */}
                            <div className="flex justify-between items-start md:items-center mb-8 flex-shrink-0 flex-col md:flex-row gap-4">
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-3">
                                        <span className="text-sm font-black px-4 py-2 rounded-full uppercase text-white shadow-lg flex items-center gap-2" style={{ backgroundColor: currentSlice.color }}>
                                            <currentSlice.icon className="w-4 h-4" /> {currentSlice.label}
                                        </span>
                                        {currentSlice.type !== 'sabotage' && (
                                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-full text-sm font-black flex items-center gap-1">
                                                +{currentSlice.type === '2x' ? 40 : currentSlice.points} P
                                                {isComboActive && <Flame className="w-4 h-4 text-orange-400" />}
                                            </span>
                                        )}
                                    </div>
                                    {currentSlice.type === 'sabotage' && sabotageTarget !== null && (
                                        <span className="text-sm font-black text-rose-400 bg-rose-500/20 border border-rose-500/50 px-4 py-2 rounded-full animate-pulse flex items-center gap-2">
                                            <Bomb className="w-4 h-4" /> CEVAPLAMA SIRASI: {sabotageTarget + 1}. TAKIM (Yanlış -30P)
                                        </span>
                                    )}
                                </div>

                                {/* Timer */}
                                {timeLeft !== null && feedback === null && (
                                    <div className={cn(
                                        "flex items-center gap-3 px-6 py-3 rounded-full font-black text-3xl transition-all shadow-xl self-end md:self-auto",
                                        timeLeft <= 5 ? "bg-red-600 text-white animate-pulse" : "bg-slate-800 text-white border-2 border-slate-700"
                                    )}>
                                        <TimerIcon className="w-6 h-6" />
                                        {timeLeft}
                                    </div>
                                )}
                            </div>
                            
                            {/* Scrollable Content Container */}
                            <div className="overflow-y-auto custom-scrollbar flex-1 -mr-4 pr-4">
                                {/* Soru Metni */}
                                <div className="mb-10 md:mb-12 text-center">
                                    <h3 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 leading-snug drop-shadow-md">
                                        {currentQuestion.text}
                                    </h3>
                                </div>

                                {/* Süre Doldu Mesajı */}
                                {feedback === 'timeout' && (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in zoom-in">
                                        <div className="text-center">
                                            <TimerIcon className="w-24 h-24 text-red-500 mx-auto mb-6 animate-bounce" />
                                            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter">SÜRE DOLDU!</h2>
                                        </div>
                                    </div>
                                )}

                                {/* Geri Bildirim Banner'ı (Doğru/Yanlış) */}
                                {feedback && feedback !== 'timeout' && (
                                    <div className="absolute top-0 left-0 w-full z-50 flex flex-col items-center justify-center p-4 animate-in slide-in-from-top-10 duration-300">
                                        {feedback === 'correct' ? (
                                            <div className="bg-emerald-500/90 text-white px-8 py-3 rounded-full font-black text-2xl md:text-3xl shadow-[0_10px_40px_rgba(16,185,129,0.5)] flex items-center gap-3 backdrop-blur-md">
                                                <CheckCircle2 className="w-8 h-8" /> DOĞRU CEVAP!
                                            </div>
                                        ) : (
                                            <div className="bg-rose-500/90 text-white px-8 py-3 rounded-full font-black text-2xl md:text-3xl shadow-[0_10px_40px_rgba(244,63,94,0.5)] flex items-center gap-3 backdrop-blur-md">
                                                <X className="w-8 h-8" /> YANLIŞ CEVAP!
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Seçenekler */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-6 mt-8 relative z-10">
                                    {currentQuestion.options?.map((opt, idx) => {
                                        const isSelected = selectedOption === opt;
                                        const isCorrect = opt === currentQuestion.correctAnswer;
                                        let btnClass = "bg-slate-800/80 border-slate-700 text-slate-200 hover:border-indigo-500 hover:bg-slate-800";
                                        
                                        if (feedback !== null) {
                                            if (isCorrect) {
                                                btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)] transform scale-[1.02] z-10";
                                            } else if (isSelected) {
                                                btnClass = "bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.4)]";
                                            } else {
                                                btnClass = "bg-slate-900 border-slate-800 text-slate-600 opacity-50";
                                            }
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(opt)}
                                                disabled={feedback !== null}
                                                className={cn(
                                                    "group relative overflow-hidden py-6 px-8 rounded-2xl font-bold text-lg md:text-xl transition-all duration-300 border-2 text-left flex items-center",
                                                    feedback === null && "shadow-lg hover:shadow-xl hover:scale-[1.02]",
                                                    btnClass,
                                                    feedback !== null && !isCorrect && !isSelected && "cursor-not-allowed transform-none"
                                                )}
                                            >
                                                <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center mr-6 font-black shrink-0 border transition-colors",
                                                    feedback !== null ? (isCorrect ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : isSelected ? "bg-rose-500 text-white border-rose-400" : "bg-black/20 text-slate-600 border-white/5") : "bg-black/40 text-indigo-400 group-hover:text-indigo-300 border-white/5"
                                                )}>
                                                    {String.fromCharCode(65 + idx)}
                                                </span>
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CarkifelekGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-purple-500" /></div>}>
            <CarkifelekGameClient/>
        </Suspense>
    )
}