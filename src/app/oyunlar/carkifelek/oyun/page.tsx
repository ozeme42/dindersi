'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { getCarkifelekQuestions, submitCarkifelekScoreAction } from '../actions';
import type { Question } from "@/lib/types";
import { Loader2, ArrowLeft, Trophy, Zap, CheckCircle2, X, Sparkles, Flame, Skull, Gift, CircleOff } from "lucide-react";
import { Button } from '@/components/ui/button';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import Confetti from 'react-dom-confetti';

// --- DİLİM AYARLARI ---
type SliceType = 'easy' | 'hard' | '2x' | 'pass' | 'bankrupt' | 'joker';

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
    { label: 'PAS', type: 'pass', color: '#64748B', textColor: 'white', points: 0, icon: CircleOff },         
    { label: 'KOLAY', type: 'easy', color: '#0EA5E9', textColor: 'white', points: 10, icon: Sparkles }, 
    { label: 'İFLAS', type: 'bankrupt', color: '#EF4444', textColor: 'white', points: 0, icon: Skull },   
    { label: 'ZOR', type: 'hard', color: '#8B5CF6', textColor: 'white', points: 20, icon: Flame },   
    { label: 'JOKER', type: 'joker', color: '#10B981', textColor: 'white', points: 50, icon: Gift },     
];

const TOTAL_SLICES = SLICES.length;
const SLICE_DEGREE = 360 / TOTAL_SLICES;

// --- CSS STYLES (MOBİL UYUMLU) ---
const wheelStyles = `
  .wheel-wrapper {
    position: relative;
    /* MOBİL: Ekran genişliğinin %85'i kadar, maks 320px */
    width: 85vw; 
    height: 85vw;
    max-width: 320px;
    max-height: 320px;
    
    border-radius: 50%;
    background: #1e293b;
    padding: 8px;
    box-shadow: 0 0 30px rgba(79, 70, 229, 0.4), inset 0 0 20px rgba(0,0,0,0.5);
    border: 4px solid #475569;
    margin: 0 auto; /* Ortala */
  }
  
  .wheel-container { 
    width: 100%; height: 100%; 
    border-radius: 50%; 
    position: relative;
    overflow: hidden;
    transition: transform 4s cubic-bezier(0.15, 0.85, 0.35, 1.05); 
    border: 2px solid white;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
    background: conic-gradient(
      from 0deg,
      #3B82F6 0deg 45deg,
      #EC4899 45deg 90deg,
      #F59E0B 90deg 135deg,
      #64748B 135deg 180deg,
      #0EA5E9 180deg 225deg,
      #EF4444 225deg 270deg,
      #8B5CF6 270deg 315deg,
      #10B981 315deg 360deg
    );
  }

  /* MASAÜSTÜ İÇİN AYARLAR */
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
  
  /* Yazıların Konumu ve Boyutu */
  .slice-text {
    position: absolute;
    left: -40px; bottom: 0;
    width: 80px;
    height: 140px; /* Mobilde yarıçap yaklaşık bu kadar */
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
`;

export function CarkifelekGameClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [score, setScore] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'idle' | 'spinning' | 'result' | 'question' | 'feedback' | 'finished'>('loading');
    
    const [questionsEasy, setQuestionsEasy] = useState<Question[]>([]);
    const [questionsHard, setQuestionsHard] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    
    const [currentSlice, setCurrentSlice] = useState<WheelSlice | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const gameContext = `Çarkıfelek - ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = '/oyunlar/carkifelek';

    useEffect(() => {
        const fetchQuestions = async () => {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const { questions, error } = await getCarkifelekQuestions(params);
            if (error || !questions) {
                setError(error || "Sorular yüklenemedi.");
                setGameState('finished');
            } else {
                setQuestionsEasy(questions.easy);
                setQuestionsHard(questions.hard);
                setGameState('idle');
            }
        };
        fetchQuestions();
    }, [searchParams]);

    const spinWheel = () => {
        if (gameState !== 'idle') return;
        setGameState('spinning');
        playSound('coin-flip'); 

        const winningIndex = Math.floor(Math.random() * TOTAL_SLICES);
        const winningSlice = SLICES[winningIndex];
        
        const sliceCenterAngle = (winningIndex * SLICE_DEGREE) + (SLICE_DEGREE / 2);
        const currentFullRotations = Math.floor(rotation / 360);
        const targetRotation = ((currentFullRotations + 5) * 360) - sliceCenterAngle;
        
        const jitter = Math.floor(Math.random() * 20) - 10;
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
            setGameState('result');
            setTimeout(() => setGameState('idle'), 2500);
        } else if (slice.type === 'bankrupt') {
            playSound('lose');
            setScore(0);
            setGameState('result');
            setTimeout(() => setGameState('idle'), 3000);
        } else if (slice.type === 'joker') {
            playSound('win');
            setScore(s => s + slice.points);
            setShowConfetti(true);
            setGameState('result');
            setTimeout(() => { setShowConfetti(false); setGameState('idle'); }, 3000);
        } else {
            const pool = slice.type === 'easy' ? questionsEasy : questionsHard;
            const finalPool = slice.type === '2x' ? questionsHard : pool;
            
            if (finalPool.length === 0) {
                setScore(s => s + slice.points);
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
        
        const isCorrect = option === currentQuestion.correctAnswer;
        
        if (isCorrect) {
            playSound('correct');
            setFeedback('correct');
            
            let pointsToAdd = currentSlice.points;
            if (currentSlice.type === '2x') pointsToAdd = 40; 
            
            setScore(prev => prev + pointsToAdd);
            setShowConfetti(true);
        } else {
            playSound('incorrect');
            setFeedback('wrong');
        }

        setTimeout(() => {
            setFeedback(null);
            setShowConfetti(false);
            setGameState('idle');
        }, 2000);
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
    if (gameState === 'finished') return <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={() => window.location.reload()} backUrl={backUrl} />;

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col relative font-sans select-none pb-20 md:pb-0">
            <style jsx global>{wheelStyles}</style>

            {/* --- ARKA PLAN --- */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black" />
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[80px] animate-pulse" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[80px] animate-pulse delay-700" />
            </div>

            {/* --- HUD --- */}
            <div className="relative z-20 p-4 flex justify-between items-center max-w-6xl mx-auto w-full">
                <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setGameState('finished')}>
                    <ArrowLeft className="mr-2" /> Bitir
                </Button>
                
                <div className="bg-slate-900 border border-white/10 px-4 md:px-6 py-2 rounded-2xl shadow-xl flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    <span className="text-xl md:text-2xl font-mono font-black text-white">{score}</span>
                </div>
            </div>

            {/* --- OYUN ALANI --- */}
            <div className="flex-grow flex flex-col items-center justify-center relative z-10 p-2 overflow-hidden min-h-[500px]">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <Confetti active={showConfetti} config={{ elementCount: 150, spread: 360, startVelocity: 30 }} />
                </div>

                {/* --- ÇARK --- */}
                <div className={cn("transition-all duration-700 transform origin-center", gameState === 'question' ? "scale-0 opacity-0" : "scale-100 opacity-100")}>
                    <div className="wheel-wrapper">
                        <div className="pointer"></div>

                        <div className="wheel-container" style={{ transform: `rotate(${rotation}deg)` }}>
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
                    <div className="mt-8 md:mt-12 animate-in slide-in-from-bottom-8 fade-in duration-500 z-30">
                        <button 
                            onClick={spinWheel}
                            className="group relative px-10 md:px-16 py-4 md:py-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-black text-lg md:text-2xl text-white shadow-[0_0_50px_rgba(124,58,237,0.5)] hover:scale-105 transition-transform active:scale-95 border-4 border-white/20"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                ÇEVİR! <Zap className="w-5 h-5 md:w-6 md:h-6 fill-white" />
                            </span>
                        </button>
                    </div>
                )}

                {/* --- SONUÇ MESAJI --- */}
                {gameState === 'result' && currentSlice && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 px-4">
                        <div className="bg-slate-900/95 border border-white/20 p-8 md:p-10 rounded-[2rem] shadow-2xl backdrop-blur-xl w-full max-w-sm text-center animate-in zoom-in duration-300">
                            <div className="mb-4 flex justify-center">
                                <div className="p-4 rounded-full bg-white/10">
                                    <currentSlice.icon className="w-12 h-12 md:w-16 md:h-16" style={{ color: currentSlice.color }} />
                                </div>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black mb-4 uppercase tracking-tighter" style={{ color: currentSlice.color }}>
                                {currentSlice.label}
                            </h2>
                            <p className="text-slate-300 text-base md:text-lg font-medium">
                                {currentSlice.type === 'pass' && "Bu turu pas geçiyorsun."}
                                {currentSlice.type === 'bankrupt' && "Eyvah! Puanların sıfırlandı."}
                                {currentSlice.type === 'joker' && "Şanslısın! +50 Puan kazandın."}
                            </p>
                        </div>
                    </div>
                )}

                {/* --- SORU MODALI (Düzeltilmiş) --- */}
                {(gameState === 'question' || gameState === 'feedback') && currentQuestion && currentSlice && (
                    <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-slate-900 border border-indigo-500/30 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                            
                            {/* Scroll Area for long questions */}
                            <div className="overflow-y-auto custom-scrollbar flex-1 pb-20">
                                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                                    <span className="text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full uppercase text-white shadow-lg tracking-wider flex items-center gap-2" style={{ backgroundColor: currentSlice.color }}>
                                        <currentSlice.icon className="w-3 h-3 md:w-4 md:h-4" /> {currentSlice.label}
                                    </span>
                                    <span className="text-indigo-300 text-[10px] md:text-sm font-bold bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20 whitespace-nowrap">
                                        Ödül: +{currentSlice.type === '2x' ? 40 : currentSlice.points} Puan
                                    </span>
                                </div>
                                
                                <h3 className="text-lg md:text-2xl font-bold text-white mb-8 text-center leading-relaxed drop-shadow-md">
                                    {currentQuestion.text}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    {currentQuestion.options?.map((opt, idx) => {
                                        let btnStyle = "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-indigo-500";
                                        if (feedback) {
                                            if (opt === currentQuestion.correctAnswer) btnStyle = "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]";
                                            else btnStyle = "bg-slate-800/30 border-transparent text-slate-600 opacity-40";
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                disabled={feedback !== null}
                                                onClick={() => handleAnswer(opt)}
                                                className={cn(
                                                    "py-3 px-4 md:py-5 md:px-6 rounded-xl md:rounded-2xl font-bold text-sm md:text-lg border-2 transition-all relative overflow-hidden transform active:scale-95 duration-200 text-left md:text-center",
                                                    btnStyle
                                                )}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {feedback && (
                                <div className="absolute bottom-0 left-0 right-0 text-center animate-in slide-in-from-bottom-10 fade-in duration-500 p-4 bg-slate-900/90 border-t border-white/10">
                                    <span className={cn("text-lg md:text-2xl font-black px-6 py-2 rounded-full shadow-2xl inline-flex items-center gap-2 md:gap-3 border-2 border-white/10", feedback === 'correct' ? "bg-emerald-600 text-white" : "bg-red-600 text-white")}>
                                        {feedback === 'correct' ? <CheckCircle2 className="w-5 h-5 md:w-8 md:h-8" /> : <X className="w-5 h-5 md:w-8 md:h-8" />}
                                        {feedback === 'correct' ? 'MÜKEMMEL!' : 'YANLIŞ!'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default function CarkifelekPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-purple-500" /></div>}>
            <CarkifelekGameClient/>
        </Suspense>
    )
}