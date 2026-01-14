'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { submitYaziTuraScoreAction, getYaziTuraQuestionsAction } from '../actions';
import type { Question } from "@/lib/types";
import { Loader2, ArrowLeft, Trophy, Target } from "lucide-react";
import { Button } from '@/components/ui/button';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import Confetti from 'react-dom-confetti';

// --- FUTBOL ANİMASYONLARI ---
const footballStyles = `
  @keyframes ball-shoot-left {
    0% { transform: translateX(-50%) translateY(0) scale(1); bottom: 15%; }
    100% { transform: translateX(-150%) translateY(-50px) scale(0.5) rotate(-360deg); bottom: 65%; left: 25%; }
  }
  @keyframes ball-shoot-right {
    0% { transform: translateX(-50%) translateY(0) scale(1); bottom: 15%; }
    100% { transform: translateX(50%) translateY(-50px) scale(0.5) rotate(360deg); bottom: 65%; left: 75%; }
  }
  @keyframes ball-shoot-center {
    0% { transform: translateX(-50%) translateY(0) scale(1); bottom: 15%; }
    100% { transform: translateX(-50%) translateY(-50px) scale(0.5) rotate(720deg); bottom: 65%; }
  }
  @keyframes keeper-dive-left {
    0% { transform: translateX(-50%) translateY(0); }
    100% { transform: translateX(-180%) translateY(30px) rotate(-75deg); }
  }
  @keyframes keeper-dive-right {
    0% { transform: translateX(-50%) translateY(0); }
    100% { transform: translateX(80%) translateY(30px) rotate(75deg); }
  }

  .ball { 
    width: 60px; height: 60px; 
    background: white; border-radius: 50%; 
    box-shadow: 0 10px 20px rgba(0,0,0,0.5); 
    background-image: radial-gradient(circle at 30% 30%, #ffffff, #d1d5db 40%, #1f2937 95%); 
    border: 2px solid #e5e7eb;
    position: absolute; 
    bottom: 15%; left: 50%; 
    transform: translateX(-50%); 
    z-index: 50;
    transition: all 0.3s ease;
  }
  
  .ball.ready { cursor: pointer; }
  .ball.ready:hover { transform: translateX(-50%) scale(1.1); box-shadow: 0 0 25px rgba(255,255,255,0.9); }
  
  .shoot-left { animation: ball-shoot-left 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards !important; }
  .shoot-right { animation: ball-shoot-right 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards !important; }
  .shoot-center { animation: ball-shoot-center 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards !important; }

  .keeper { 
    transition: all 0.3s; width: 90px; height: 130px; 
    position: absolute; bottom: 25%; left: 50%; 
    transform: translateX(-50%); z-index: 20; 
  }
  .dive-left { animation: keeper-dive-left 0.6s ease-out forwards; }
  .dive-right { animation: keeper-dive-right 0.6s ease-out forwards; }
`;

export function PenaltyGameClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [score, setScore] = useState(0);
    const [goals, setGoals] = useState(0);
    const [misses, setMisses] = useState(0);
    
    const [gameState, setGameState] = useState('loading'); 
    
    const [questionsEasy, setQuestionsEasy] = useState<Question[]>([]);
    const [questionsHard, setQuestionsHard] = useState<Question[]>([]);
    
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<'left' | 'center' | 'right' | null>(null);
    const [keeperDirection, setKeeperDirection] = useState<'left' | 'center' | 'right'>('center');
    const [shotResult, setShotResult] = useState<'goal' | 'save'>('save');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const gameContext = `Gol Kralı - ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = '/oyunlar/yazi-tura'; 

    useEffect(() => {
        const fetchQuestions = async () => {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const { questions, error } = await getYaziTuraQuestionsAction(params);
            if (error || !questions) {
                setError(error || "Sorular yüklenemedi.");
                setGameState('error');
            } else {
                setQuestionsEasy(questions.easy);
                setQuestionsHard(questions.hard);
                setGameState('aiming');
            }
        };
        fetchQuestions();
    }, [searchParams]);

    const handleAim = (direction: 'left' | 'center' | 'right') => {
        if (gameState !== 'aiming') return;
        
        setSelectedTarget(direction);
        playSound('click');
        
        const pool = Math.random() > 0.5 ? questionsEasy : questionsHard;
        const q = pool[Math.floor(Math.random() * pool.length)];
        
        setCurrentQuestion(q);
        setGameState('question');
    };

    const handleAnswer = (option: string) => {
        if (!currentQuestion || !selectedTarget) return;
        
        const isCorrect = option === currentQuestion.correctAnswer;
        const directions: ('left'|'center'|'right')[] = ['left', 'center', 'right'];
        
        if (isCorrect) {
            const safeDirections = directions.filter(d => d !== selectedTarget);
            setKeeperDirection(safeDirections[Math.floor(Math.random() * safeDirections.length)]);
            setShotResult('goal');
        } else {
            setKeeperDirection(selectedTarget);
            setShotResult('save');
        }

        setGameState('kicking'); 
        playSound('kick'); 

        setTimeout(() => {
            if (isCorrect) {
                playSound('goal'); 
                setScore(prev => prev + 10); // GOL: +10 Puan
                setGoals(prev => prev + 1);
                setShowConfetti(true);
            } else {
                playSound('miss'); 
                setMisses(prev => prev + 1);
                // --- DEĞİŞİKLİK BURADA: -5 PUAN ---
                setScore(prev => Math.max(0, prev - 5)); // Puan 0'ın altına düşmesin diye Math.max kullandım
            }
            setGameState('result');
        }, 800); 
    };

    const nextTurn = () => {
        setGameState('aiming');
        setSelectedTarget(null);
        setKeeperDirection('center');
        setShowConfetti(false);
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitYaziTuraScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Maç Bitti!', description: `${score} puan hanene yazıldı.` });
            router.push(backUrl);
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    if (gameState === 'loading') return <div className="flex h-screen items-center justify-center bg-green-900"><Loader2 className="h-20 w-20 animate-spin text-white"/></div>;
    if (error) return <div className="flex h-screen items-center justify-center bg-black text-red-500 font-bold">{error}</div>;
    if (gameState === 'finished') return <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={() => window.location.reload()} backUrl={backUrl} />;

    return (
        <div className="min-h-screen bg-green-800 relative overflow-hidden font-sans select-none flex flex-col">
            <style jsx global>{footballStyles}</style>

            {/* --- STADYUM ARKA PLANI --- */}
            <div className="absolute inset-0 z-0">
                <div className="w-full h-full bg-[repeating-linear-gradient(0deg,#2f855a,#2f855a_50px,#276749_50px,#276749_100px)] opacity-50"></div>
                <div className="absolute top-0 w-full h-1/3 bg-gradient-to-b from-slate-900 to-transparent opacity-80"></div>
                <div className="absolute bottom-[15%] left-[10%] right-[10%] h-[200px] border-x-4 border-t-4 border-white/40 skew-x-[20deg]"></div>
                <div className="absolute bottom-[15%] left-[50%] -translate-x-1/2 w-[10px] h-[10px] bg-white rounded-full"></div>
            </div>

            {/* --- SKOR TABLOSU --- */}
            <div className="relative z-20 w-full p-4">
                <div className="max-w-4xl mx-auto bg-black/80 text-white rounded-xl border-4 border-slate-700 p-4 flex justify-between items-center shadow-2xl">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setGameState('finished')}>
                            <ArrowLeft className="mr-2" /> Soyunma Odası
                        </Button>
                        <div className="flex flex-col">
                            <span className="text-xs text-green-400 font-bold uppercase tracking-widest">GOL KRALI</span>
                            <h1 className="text-2xl font-black italic">{user?.displayName || 'OYUNCU'}</h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="text-center hidden sm:block">
                            <div className="text-3xl font-black font-mono text-yellow-400">{goals}</div>
                            <div className="text-[10px] text-slate-400 uppercase">GOL</div>
                        </div>
                        <div className="text-center hidden sm:block">
                            <div className="text-3xl font-black font-mono text-red-400">{misses}</div>
                            <div className="text-[10px] text-slate-400 uppercase">KAÇAN</div>
                        </div>
                        <div className="bg-slate-800 px-6 py-2 rounded-lg border border-slate-600">
                            <span className="block text-xs text-slate-400">SKOR</span>
                            <span className="text-3xl font-mono font-black text-white">{score}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- OYUN ALANI --- */}
            <div className="flex-grow relative z-10 flex flex-col justify-end pb-10 w-full h-full min-h-[600px]">
                
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Confetti active={showConfetti} config={{ elementCount: 200, spread: 360, startVelocity: 50 }} />
                </div>

                {/* --- KALE --- */}
                <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[90%] md:w-[600px] h-[250px] border-x-[12px] border-t-[12px] border-slate-200/90 shadow-2xl perspective-1000 group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-30"></div>
                    
                    {/* HEDEF BÖLGELERİ */}
                    {gameState === 'aiming' && (
                        <>
                            <div onClick={() => handleAim('left')} className="absolute top-0 left-0 w-1/3 h-full cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-center group-hover/left">
                                <Target className="text-white/50 w-12 h-12 animate-pulse" />
                            </div>
                            <div onClick={() => handleAim('center')} className="absolute top-0 left-1/3 w-1/3 h-full cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-center">
                                <Target className="text-white/50 w-12 h-12 animate-pulse" />
                            </div>
                            <div onClick={() => handleAim('right')} className="absolute top-0 right-0 w-1/3 h-full cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-center">
                                <Target className="text-white/50 w-12 h-12 animate-pulse" />
                            </div>
                        </>
                    )}

                    {/* KALECİ */}
                    <div className={cn(
                        "keeper transition-transform duration-500",
                        gameState === 'kicking' && keeperDirection === 'left' && "dive-left",
                        gameState === 'kicking' && keeperDirection === 'right' && "dive-right",
                        gameState === 'aiming' && "animate-bounce" 
                    )}>
                        <div className="w-full h-full flex flex-col items-center">
                            <div className="w-10 h-10 bg-yellow-300 rounded-full border-2 border-black relative"></div>
                            <div className="w-16 h-20 bg-blue-600 rounded-xl border-2 border-black flex items-center justify-center">
                                <span className="text-white font-bold text-xs">1</span>
                            </div> 
                            <div className="w-full flex justify-between mt-[-5px]">
                                <div className="w-4 h-12 bg-black rounded-full"></div>
                                <div className="w-4 h-12 bg-black rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- TOP --- */}
                <div className={cn(
                    "ball",
                    gameState === 'aiming' && "ready",
                    gameState === 'kicking' && selectedTarget === 'left' && "shoot-left",
                    gameState === 'kicking' && selectedTarget === 'right' && "shoot-right",
                    gameState === 'kicking' && selectedTarget === 'center' && "shoot-center"
                )}></div>

                {/* --- MESAJ ALANI --- */}
                {gameState === 'aiming' && (
                    <div className="absolute bottom-10 left-0 right-0 text-center animate-bounce">
                        <span className="bg-black/50 text-white px-6 py-3 rounded-full text-lg font-bold border border-white/20">
                            Köşeyi Seç ve Şutunu Çek!
                        </span>
                    </div>
                )}

                {/* --- SONUÇ MODALI --- */}
                {gameState === 'result' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in duration-300">
                        <div className={cn("text-center p-8 rounded-3xl shadow-2xl border-4 transform scale-110", 
                            shotResult === 'goal' ? "bg-green-600 border-white text-white" : "bg-red-600 border-white text-white"
                        )}>
                            <h2 className="text-6xl font-black italic uppercase tracking-tighter mb-2 drop-shadow-md">
                                {shotResult === 'goal' ? 'GOOOOL!' : 'KURTARDI!'}
                            </h2>
                            <p className="text-xl font-medium opacity-90 mb-6">
                                {shotResult === 'goal' ? '+10 Puan Kazandın!' : 'Kaleci gole izin vermedi. -5 Puan.'}
                            </p>
                            <Button onClick={nextTurn} className="bg-white text-black hover:bg-slate-200 font-bold text-lg px-8 py-6 rounded-xl shadow-lg">
                                {shotResult === 'goal' ? 'Tekrar Vur' : 'Pes Etme, Tekrar Dene'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- SORU MODALI --- */}
                {gameState === 'question' && currentQuestion && (
                    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-in slide-in-from-bottom-10">
                            <div className="flex justify-between items-center mb-6">
                                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Penaltı Atışı</span>
                                <span className="text-slate-400 text-sm">Doğru cevap = GOL</span>
                            </div>
                            
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-8 text-center">
                                {currentQuestion.text}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.options?.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(opt)}
                                        className="py-4 px-6 bg-slate-800 hover:bg-blue-700 text-slate-200 hover:text-white rounded-xl font-bold text-lg transition-all border border-slate-700 hover:border-blue-500 hover:scale-[1.02] shadow-lg"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default function PenaltyGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-green-900"><Loader2 className="h-16 w-16 animate-spin text-white" /></div>}>
            <PenaltyGameClient/>
        </Suspense>
    )
}