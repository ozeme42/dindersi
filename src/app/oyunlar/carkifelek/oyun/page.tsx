'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { getCarkifelekQuestions, submitCarkifelekScoreAction } from '../actions';
import type { Question } from "@/lib/types";
import { Loader2, ArrowLeft, Trophy, AlertCircle, Sparkles, Skull, HelpCircle, X, CheckCircle2, Zap } from "lucide-react";
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
    points: number; // Gösterim amaçlı veya temel puan
}

const SLICES: WheelSlice[] = [
    { label: 'KOLAY SORU', type: 'easy', color: '#4F46E5', textColor: 'white', points: 10 }, // Indigo
    { label: 'ZOR SORU', type: 'hard', color: '#DB2777', textColor: 'white', points: 20 },   // Pink
    { label: '2x PUAN', type: '2x', color: '#F59E0B', textColor: 'black', points: 40 },      // Amber
    { label: 'PAS', type: 'pass', color: '#64748B', textColor: 'white', points: 0 },         // Slate
    { label: 'KOLAY SORU', type: 'easy', color: '#0EA5E9', textColor: 'white', points: 10 }, // Sky
    { label: 'İFLAS', type: 'bankrupt', color: '#DC2626', textColor: 'white', points: 0 },   // Red
    { label: 'ZOR SORU', type: 'hard', color: '#7C3AED', textColor: 'white', points: 20 },   // Violet
    { label: 'JOKER', type: 'joker', color: '#10B981', textColor: 'white', points: 50 },     // Emerald
];

const TOTAL_SLICES = SLICES.length;
const DEG_PER_SLICE = 360 / TOTAL_SLICES;

// --- CSS STYLES ---
const wheelStyles = `
  .wheel-container { 
    position: relative; 
    width: 320px; height: 320px; 
    border-radius: 50%; 
    box-shadow: 0 0 20px rgba(0,0,0,0.5), 0 0 0 10px rgba(255,255,255,0.1);
    transition: transform 4s cubic-bezier(0.1, 0.7, 0.1, 1); 
  }
  @media (min-width: 768px) {
    .wheel-container { width: 450px; height: 450px; }
  }
  .wheel-slice {
    position: absolute;
    top: 0; right: 0;
    width: 50%; height: 50%;
    transform-origin: 0% 100%;
    display: flex; align-items: center; justify-content: center;
  }
  .slice-content {
    position: absolute;
    left: -100%; width: 200%; height: 200%;
    text-align: center;
    transform: rotate(45deg); /* Dilim açısının yarısı kadar (45deg for 8 slices is wrong, calculating...) */
    /* 8 Dilim = 45 derece. İçerik ortalaması için */
    display: flex; flex-direction: column; align-items: center; padding-top: 20px;
  }
  .pointer {
    position: absolute; top: -20px; left: 50%; transform: translateX(-50%);
    width: 40px; height: 50px; 
    background: linear-gradient(to bottom, #ef4444, #991b1b);
    clip-path: polygon(100% 0, 50% 100%, 0 0);
    z-index: 50; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
  }
  .center-knob {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 60px; height: 60px; background: white; border-radius: 50%;
    z-index: 40; box-shadow: 0 0 15px rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    font-weight: 900; color: #333; border: 4px solid #e2e8f0;
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
    
    // Sorular
    const [questionsEasy, setQuestionsEasy] = useState<Question[]>([]);
    const [questionsHard, setQuestionsHard] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    
    // Oyun Durumu
    const [currentSlice, setCurrentSlice] = useState<WheelSlice | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const gameContext = `Çarkıfelek - ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = '/oyunlar/carkifelek'; 

    // --- SORULARI ÇEK ---
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
                setGameState('finished'); // Hata varsa bitir
            } else {
                setQuestionsEasy(questions.easy);
                setQuestionsHard(questions.hard);
                setGameState('idle');
            }
        };
        fetchQuestions();
    }, [searchParams]);

    // --- ÇARKI ÇEVİR ---
    const spinWheel = () => {
        if (gameState !== 'idle') return;
        setGameState('spinning');
        playSound('pop'); 

        const randomDeg = Math.floor(1800 + Math.random() * 360);
        const newRotation = rotation + randomDeg;
        setRotation(newRotation);

        setTimeout(() => {
            handleSpinEnd(newRotation);
        }, 4000); // 4 saniye dönme süresi
    };

    const handleSpinEnd = (finalRotation: number) => {
        const normalizedDeg = finalRotation % 360;
        
        let sliceIndex = (TOTAL_SLICES - Math.floor(normalizedDeg / DEG_PER_SLICE)) % TOTAL_SLICES;
        
        const winningSlice = SLICES[sliceIndex];
        setCurrentSlice(winningSlice);
        
        playSound('pop');
        processSliceResult(winningSlice);
    };

    const processSliceResult = (slice: WheelSlice) => {
        if (slice.type === 'pass') {
            setGameState('result');
            setTimeout(() => setGameState('idle'), 2000);
        } else if (slice.type === 'bankrupt') {
            playSound('incorrect');
            setScore(0);
            setGameState('result');
            setTimeout(() => setGameState('idle'), 2500);
        } else if (slice.type === 'joker') {
            playSound('win');
            setScore(s => s + slice.points);
            setShowConfetti(true);
            setGameState('result');
            setTimeout(() => { setShowConfetti(false); setGameState('idle'); }, 2500);
        } else {
            const pool = slice.type === 'easy' ? questionsEasy : questionsHard;
            const finalPool = slice.type === '2x' ? questionsHard : pool;
            
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
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col relative font-sans select-none">
            <style jsx global>{wheelStyles}</style>

            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black" />
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            <div className="relative z-20 p-4 flex justify-between items-center max-w-6xl mx-auto w-full">
                <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setGameState('finished')}>
                    <ArrowLeft className="mr-2" /> Bitir
                </Button>
                
                <div className="bg-slate-900 border border-white/10 px-6 py-2 rounded-2xl shadow-xl flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    <span className="text-2xl font-mono font-black text-white">{score}</span>
                </div>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center relative z-10 p-4 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <Confetti active={showConfetti} config={{ elementCount: 200, spread: 360, startVelocity: 40 }} />
                </div>

                <div className={cn("transition-all duration-500 transform", gameState === 'question' ? "scale-50 opacity-20 blur-sm translate-y-[-100px]" : "scale-100")}>
                    <div className="relative">
                        <div className="pointer"></div>

                        <div className="wheel-container" style={{ transform: `rotate(${rotation}deg)` }}>
                            {SLICES.map((slice, index) => {
                                const rotation = index * DEG_PER_SLICE;
                                const skew = 90 - DEG_PER_SLICE; 
                                return (
                                    <div 
                                        key={index}
                                        className="wheel-slice"
                                        style={{ 
                                            transform: `rotate(${rotation}deg) skewY(-${skew}deg)`,
                                            background: slice.color,
                                        }}
                                    >
                                        <div 
                                            className="slice-content" 
                                            style={{ 
                                                transform: `skewY(${skew}deg) rotate(${DEG_PER_SLICE / 2}deg)`,
                                                color: slice.textColor
                                            }}
                                        >
                                            <span className="font-black text-xs sm:text-sm md:text-base tracking-tighter mt-4 sm:mt-8 block max-w-[80px] leading-tight">
                                                {slice.label}
                                            </span>
                                            {slice.points > 0 && <span className="text-[10px] font-bold opacity-80">{slice.points} P</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="center-knob">
                            <Zap className="h-6 w-6 text-slate-800" />
                        </div>
                    </div>
                </div>
                {gameState === 'idle' && (
                    <div className="mt-12 animate-in slide-in-from-bottom-8 fade-in">
                        <button 
                            onClick={spinWheel}
                            className="group relative px-12 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-black text-xl text-white shadow-[0_0_40px_rgba(124,58,237,0.5)] hover:scale-105 transition-transform active:scale-95"
                        >
                            ÇARKI ÇEVİR
                        </button>
                    </div>
                )}
                {gameState === 'result' && currentSlice && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 text-center animate-in zoom-in duration-300">
                        <div className="bg-slate-900/90 border border-white/20 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
                            <h2 className="text-4xl font-black mb-2" style={{ color: currentSlice.color }}>
                                {currentSlice.label}
                            </h2>
                            <p className="text-slate-300 font-medium">
                                {currentSlice.type === 'pass' && "Bu turu pas geçiyorsun."}
                                {currentSlice.type === 'bankrupt' && "Eyvah! Puanların sıfırlandı."}
                                {currentSlice.type === 'joker' && "Şanslısın! +50 Puan kazandın."}
                            </p>
                        </div>
                    </div>
                )}

                {(gameState === 'question' || gameState === 'feedback') && currentQuestion && currentSlice && (
                    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-xs font-bold px-3 py-1 rounded-full uppercase text-white" style={{ backgroundColor: currentSlice.color }}>
                                    {currentSlice.label}
                                </span>
                                <span className="text-slate-400 text-sm">Doğru cevap: +{currentSlice.type === '2x' ? 40 : currentSlice.points} Puan</span>
                            </div>
                            
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-8 text-center leading-relaxed">
                                {currentQuestion.text}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.options?.map((opt, idx) => {
                                    let btnStyle = "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700";
                                    if (feedback) {
                                        if (opt === currentQuestion.correctAnswer) btnStyle = "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]";
                                        else btnStyle = "bg-slate-800/50 border-transparent text-slate-600 opacity-50";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            disabled={feedback !== null}
                                            onClick={() => handleAnswer(opt)}
                                            className={cn(
                                                "py-4 px-6 rounded-xl font-bold text-lg border-2 transition-all relative overflow-hidden",
                                                btnStyle
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>

                            {feedback && (
                                <div className="absolute -bottom-16 left-0 right-0 text-center animate-in slide-in-from-bottom-4">
                                    <span className={cn("text-xl font-black px-8 py-2 rounded-full shadow-lg inline-flex items-center gap-2", feedback === 'correct' ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                                        {feedback === 'correct' ? <CheckCircle2 /> : <X />}
                                        {feedback === 'correct' ? 'DOĞRU!' : 'YANLIŞ!'}
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
