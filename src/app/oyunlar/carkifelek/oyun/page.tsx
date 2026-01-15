'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { getCarkifelekQuestions, submitCarkifelekScoreAction } from '../actions';
import type { Question } from "@/lib/types";
import { Loader2, ArrowLeft, Trophy, Zap, CheckCircle2, X, Sparkles, Flame, Skull, Gift, CircleOff, Users, Clock, Timer, Crown, PartyPopper, Home } from "lucide-react";
import { Button } from '@/components/ui/button';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import Confetti from 'react-dom-confetti';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
`;

export function CarkifelekGameClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [score, setScore] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'setup' | 'idle' | 'spinning' | 'result' | 'question' | 'feedback' | 'finished'>('loading');
    
    // Oyun Verileri
    const [questionsEasy, setQuestionsEasy] = useState<Question[]>([]);
    const [questionsHard, setQuestionsHard] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [currentSlice, setCurrentSlice] = useState<WheelSlice | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
    
    // Takım Modu State'leri
    const [gameMode, setGameMode] = useState<'single' | 'team'>('single');
    const [teamCount, setTeamCount] = useState<number>(2);
    const [teamScores, setTeamScores] = useState<number[]>([0, 0, 0, 0, 0]);
    const [currentTeamTurn, setCurrentTeamTurn] = useState<number>(0);

    // Diğer State'ler
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

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
        setTimeout(() => {
            setFeedback(null);
            setGameState('idle');
            // Sırayı değiştir (Takım moduysa)
            if (gameMode === 'team') {
                setCurrentTeamTurn((prev) => (prev + 1) % teamCount);
            }
        }, 2500);
    };

    const handleStartGame = (mode: 'single' | 'team', count: number = 2) => {
        setGameMode(mode);
        setTeamCount(count);
        setTeamScores(new Array(count).fill(0));
        setCurrentTeamTurn(0);
        setScore(0);
        setGameState('idle');
    };

    const spinWheel = () => {
        if (gameState !== 'idle') return;
        setGameState('spinning');
        playSound('coin-flip'); 

        const winningIndex = Math.floor(Math.random() * TOTAL_SLICES);
        const winningSlice = SLICES[winningIndex];
        
        const sliceCenterAngle = (winningIndex * SLICE_DEGREE) + (SLICE_DEGREE / 2);
        const currentFullRotations = Math.floor(rotation / 360);
        const targetRotation = ((currentFullRotations + 5) * 360) - sliceCenterAngle;
        
        // Rastgelelik ekle (hep aynı yerde durmasın)
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
        // Pas veya İflas durumunda sıra değişmeli
        const nextTurn = () => {
            if (gameMode === 'team') {
                setCurrentTeamTurn((prev) => (prev + 1) % teamCount);
            }
            setGameState('idle');
        };

        if (slice.type === 'pass') {
            setGameState('result');
            setTimeout(nextTurn, 2500);
        } else if (slice.type === 'bankrupt') {
            playSound('lose');
            if (gameMode === 'single') {
                setScore(0);
            } else {
                // Takım modunda sadece o takımın puanını sıfırla
                const newScores = [...teamScores];
                newScores[currentTeamTurn] = 0;
                setTeamScores(newScores);
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
                // Jokerde sıra değişmez, tekrar çevirir (opsiyonel, burada sıra değişiyor yapalım)
                nextTurn();
            }, 3000);
        } else {
            // Soru sorma aşaması
            const pool = slice.type === 'easy' ? questionsEasy : questionsHard;
            const finalPool = slice.type === '2x' ? questionsHard : pool;
            
            if (finalPool.length === 0) {
                // Soru kalmadıysa puan verip geç
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
        
        const isCorrect = option === currentQuestion.correctAnswer;
        
        if (isCorrect) {
            playSound('correct');
            setFeedback('correct');
            
            let pointsToAdd = currentSlice.points;
            if (currentSlice.type === '2x') pointsToAdd = 40; 
            
            if (gameMode === 'single') {
                setScore(prev => prev + pointsToAdd);
            } else {
                const newScores = [...teamScores];
                newScores[currentTeamTurn] += pointsToAdd;
                setTeamScores(newScores);
            }
            setShowConfetti(true);
        } else {
            playSound('incorrect');
            setFeedback('wrong');
        }

        setTimeout(() => {
            setFeedback(null);
            setShowConfetti(false);
            setGameState('idle');
            // Her cevap sonrası sıra değişir
            if (gameMode === 'team') {
                setCurrentTeamTurn((prev) => (prev + 1) % teamCount);
            }
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

    // --- SETUP EKRANI ---
    if (gameState === 'setup') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
                {/* Arka Plan Efektleri */}
                <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-600/30 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[100px]" />

                <Card className="w-full max-w-lg bg-slate-900/90 border-slate-800 text-white shadow-2xl relative z-10 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Çarkıfelek</CardTitle>
                        <CardDescription className="text-slate-400 text-lg">Oyun modunu seçerek başla!</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6 p-8">
                        {gameMode === 'single' ? (
                            <div className="grid grid-cols-1 gap-4">
                                <Button 
                                    onClick={() => handleStartGame('single')} 
                                    className="h-24 text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg hover:shadow-blue-500/25 rounded-2xl transition-all hover:scale-[1.02] border border-white/10"
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="flex items-center gap-3"><Users className="h-8 w-8" /> Tek Kişilik</span>
                                        <span className="text-sm font-normal opacity-80 text-blue-100">Puanın kaydedilir</span>
                                    </div>
                                </Button>
                                <Button 
                                    onClick={() => setGameMode('team')} 
                                    variant="outline"
                                    className="h-24 text-2xl font-black border-2 border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl transition-all hover:scale-[1.02]"
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="flex items-center gap-3"><Users className="h-8 w-8" /> Takım Oyunu</span>
                                        <span className="text-sm font-normal opacity-60">Sınıf içi etkinlik</span>
                                    </div>
                                </Button>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-right fade-in duration-300">
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-white mb-2">Kaç Takım Yarışacak?</h3>
                                    <p className="text-slate-400 text-sm">Takım sayısını belirleyin</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    {[2, 3, 4, 5].map(num => (
                                        <Button
                                            key={num}
                                            onClick={() => handleStartGame('team', num)}
                                            className={cn(
                                                "h-20 text-3xl font-black border-b-4 active:border-b-0 active:translate-y-1 transition-all rounded-xl",
                                                "bg-slate-800 border-slate-950 text-white hover:bg-indigo-600 hover:border-indigo-800"
                                            )}
                                        >
                                            {num}
                                        </Button>
                                    ))}
                                </div>
                                <Button onClick={() => setGameMode('single')} variant="ghost" className="w-full text-slate-400 hover:text-white hover:bg-white/5">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (gameState === 'finished') {
        // --- BİTİŞ EKRANI (Tekli ve Takımlı Ayrımı) ---
         return (
             <div className="h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-950 text-white gap-8 relative overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-80" />
                 <PartyPopper className="h-24 w-24 text-yellow-500 animate-bounce relative z-10" />
                 
                 <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 relative z-10 drop-shadow-lg text-center">
                     {gameMode === 'single' ? "Oyun Bitti!" : "Kazanan Belli Oldu!"}
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
                            
                            {/* Giriş yapmışsa Kaydet, yapmamışsa Ana Sayfa */}
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
                                     {/* Kazananı Bul */}
                                     {(() => {
                                         const maxScore = Math.max(...teamScores);
                                         const winners = teamScores.map((s, i) => s === maxScore ? i + 1 : null).filter(Boolean);
                                         
                                         return (
                                             <div className="p-6 md:p-8 text-center bg-gradient-to-b from-slate-800/50 to-transparent flex-shrink-0">
                                                 <h2 className="text-2xl md:text-4xl font-black text-yellow-400 mb-2 drop-shadow-md leading-tight">
                                                     {winners.length > 1 ? "Berabere!" : `TEBRİKLER ${winners[0]}. TAKIM!`}
                                                 </h2>
                                                 <p className="text-slate-400 text-sm md:text-base">Harika bir yarışmaydı!</p>
                                             </div>
                                         )
                                     })()}

                                     <div className="grid gap-2 p-4 md:p-6">
                                        {teamScores.map((score, index) => {
                                            const isWinner = score === Math.max(...teamScores) && score > 0;
                                            return (
                                                <div key={index} className={cn(
                                                    "flex justify-between items-center p-3 md:p-4 rounded-xl font-bold text-lg transition-all",
                                                    isWinner 
                                                        ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 text-yellow-200 scale-[1.02] shadow-lg" 
                                                        : "bg-slate-800/50 border border-slate-700/50 text-slate-400"
                                                )}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm", isWinner ? "bg-yellow-500 text-black" : "bg-slate-700 text-white")}>
                                                            {index + 1}
                                                        </span>
                                                        <span>{index + 1}. Takım</span>
                                                    </div>
                                                    <span className="font-mono text-xl">{score} P</span>
                                                </div>
                                            );
                                        })}
                                     </div>
                                 </div>
                             </CardContent>
                         </Card>
                         <div className="mt-4 md:mt-8 flex flex-col gap-3 justify-center flex-shrink-0 pb-4 w-full max-w-sm mx-auto">
                            <Button onClick={() => window.location.reload()} className="h-12 md:h-14 px-8 md:px-10 text-lg md:text-xl font-bold rounded-full bg-white text-slate-900 hover:bg-slate-200 shadow-xl w-full">
                                Yeni Oyun Başlat
                            </Button>
                            
                            {user ? (
                                <Button onClick={() => router.push(backUrl)} variant="outline" className="h-12 md:h-14 px-8 text-lg font-bold border-slate-700 text-slate-300 hover:bg-slate-800 w-full">
                                    <ArrowLeft className="mr-2 h-5 w-5" /> Oyun Menüsüne Dön
                                </Button>
                            ) : (
                                <Button onClick={() => router.push('/')} variant="ghost" className="text-slate-400 hover:text-white w-full">
                                    <Home className="mr-2 h-5 w-5" /> Ana Sayfa
                                </Button>
                            )}
                         </div>
                     </div>
                 )}
             </div>
         )
    }

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
            {/* Mobilde Column (Üst alta), Masaüstünde Row (Sağ Sol) ve Aralıklı */}
            <div className="relative z-20 p-2 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center max-w-[95%] mx-auto w-full gap-2 pointer-events-none">
                
                {/* Sol Üst: Çıkış Butonu */}
                <div className="pointer-events-auto flex items-center justify-between w-full md:w-auto">
                    <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setGameState('finished')}>
                        <ArrowLeft className="mr-2 h-5 w-5" /> <span className="hidden md:inline">Bitir</span>
                    </Button>
                    
                    {/* Mobilde Tekli Mod Skoru */}
                    {gameMode === 'single' && (
                        <div className="md:hidden bg-slate-900/80 border border-white/10 px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2 backdrop-blur-md">
                            <Trophy className="h-4 w-4 text-yellow-400" />
                            <span className="text-lg font-mono font-black text-white">{score}</span>
                        </div>
                    )}
                </div>

                {/* --- SKORBOARD (SAĞ TARAFA YASLI & DİKEY - MASAÜSTÜ) --- */}
                {gameMode === 'team' && (
                    <div className="pointer-events-auto w-full md:w-auto md:fixed md:right-6 md:top-1/2 md:transform md:-translate-y-1/2 z-30 transition-all duration-500">
                        {/* Mobilde Yatay Scroll, Masaüstünde Dikey Liste */}
                        <div className={cn(
                            "bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-2",
                            "flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible no-scrollbar"
                        )}>
                            {/* Başlık (Sadece Masaüstü) */}
                            <div className="hidden md:flex items-center justify-center p-2 border-b border-white/5 mb-2">
                                <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">SKORLAR</span>
                            </div>

                            {teamScores.slice(0, teamCount).map((s, i) => {
                                const isCurrentTurn = currentTeamTurn === i;
                                const isLeader = s === Math.max(...teamScores) && s > 0;

                                return (
                                    <div key={i} className={cn(
                                        "flex flex-col items-center justify-center rounded-xl transition-all duration-500 relative min-w-[70px] md:min-w-[100px]",
                                        isCurrentTurn 
                                            ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg scale-105 md:scale-110 z-10 py-3 md:py-4 border border-indigo-400/50" 
                                            : "bg-slate-800/40 text-slate-400 border border-transparent py-2 md:py-3 hover:bg-slate-800/60"
                                    )}>
                                        {/* Lider Tacı */}
                                        {isLeader && (
                                            <div className="absolute -top-3 md:-top-4 -right-1 md:-right-2 animate-bounce z-20">
                                                <Crown className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className={cn("w-2 h-2 rounded-full", isCurrentTurn ? "bg-green-400 animate-pulse" : "bg-slate-600")}></span>
                                            <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-wider", isCurrentTurn ? "text-indigo-100" : "text-slate-500")}>
                                                TAKIM {i + 1}
                                            </span>
                                        </div>
                                        
                                        <span className={cn("font-mono font-black leading-none", isCurrentTurn ? "text-2xl md:text-4xl drop-shadow-md" : "text-lg md:text-2xl")}>
                                            {s}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- TEKLİ MOD SKORU (Masaüstü) --- */}
                {gameMode === 'single' && (
                    <div className="hidden md:block pointer-events-auto">
                        <div className="bg-slate-900/80 border border-white/10 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 backdrop-blur-md">
                            <Trophy className="h-6 w-6 text-yellow-400" />
                            <span className="text-2xl font-mono font-black text-white tracking-widest">{score}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* --- OYUN ALANI --- */}
            <div className="flex-grow flex flex-col items-center justify-center relative z-10 p-2 overflow-hidden min-h-[500px]">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <Confetti active={showConfetti} config={{ elementCount: 150, spread: 360, startVelocity: 30 }} />
                </div>

                {/* SIRA GÖSTERGESİ (Takım Modu - Çark Üstü) */}
                {gameMode === 'team' && gameState === 'idle' && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-top-4 fade-in w-full text-center">
                        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full shadow-2xl">
                            <span className="text-slate-300 text-sm font-bold uppercase tracking-wider">Sıra:</span>
                            <span className="text-xl font-black text-white flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                                {currentTeamTurn + 1}. TAKIM
                            </span>
                        </div>
                    </div>
                )}

                {/* --- ÇARK --- */}
                <div className={cn("transition-all duration-700 transform origin-center mt-8 md:mt-0", gameState === 'question' || gameState === 'feedback' ? "scale-0 opacity-0" : "scale-100 opacity-100")}>
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
                                {gameMode === 'team' ? `${currentTeamTurn + 1}. TAKIM ÇEVİR!` : "ÇEVİR!"} <Zap className="w-5 h-5 md:w-6 md:h-6 fill-white" />
                            </span>
                        </button>
                    </div>
                )}

                {/* --- SONUÇ MESAJI (Pas, İflas, Joker) --- */}
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
                                {currentSlice.type === 'bankrupt' && "Eyvah! Puanlar gitti."}
                                {currentSlice.type === 'joker' && "Şanslısın! +50 Puan kazandın."}
                            </p>
                        </div>
                    </div>
                )}

                {/* --- SORU MODALI --- */}
                {(gameState === 'question' || gameState === 'feedback') && currentQuestion && currentSlice && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                        {/* fixed ve yüksek z-index ile ekranı kaplar */}
                        <div className={cn(
                            "bg-slate-900 border border-white/10 rounded-[2rem] p-6 md:p-10 w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col transition-all max-h-[85dvh]", // Mobilde taşmayı önlemek için max-h ve dvh
                            feedback === 'correct' && "border-green-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]",
                            feedback === 'wrong' && "border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
                        )}>
                            
                            {/* Header: Kategori, Puan, Timer */}
                            <div className="flex justify-between items-center mb-6 md:mb-8 flex-shrink-0">
                                <div className="flex gap-2">
                                    <span className="text-xs font-bold px-3 py-1.5 rounded-full uppercase text-white shadow-md flex items-center gap-2" style={{ backgroundColor: currentSlice.color }}>
                                        <currentSlice.icon className="w-3 h-3" /> {currentSlice.label}
                                    </span>
                                    <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-full text-xs font-bold">
                                        +{currentSlice.type === '2x' ? 40 : currentSlice.points} P
                                    </span>
                                </div>

                                {/* Timer */}
                                {timeLeft !== null && (
                                    <div className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full font-black text-xl transition-all shadow-lg",
                                        timeLeft <= 5 ? "bg-red-600 text-white animate-pulse" : "bg-slate-800 text-white border border-slate-700"
                                    )}>
                                        <Clock className="w-5 h-5" />
                                        {timeLeft}
                                    </div>
                                )}
                            </div>
                            
                            {/* Scrollable Content Container */}
                            <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2">
                                {/* Soru Metni */}
                                <div className="mb-8 md:mb-10 text-center">
                                    <h3 className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 leading-tight drop-shadow-sm">
                                        {currentQuestion.text}
                                    </h3>
                                </div>

                                {/* Süre Doldu Mesajı */}
                                {feedback === 'timeout' && (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm animate-in fade-in">
                                        <div className="text-center">
                                            <TimerIcon className="w-20 h-20 text-red-500 mx-auto mb-4 animate-bounce" />
                                            <h2 className="text-4xl font-black text-white">SÜRE DOLDU!</h2>
                                        </div>
                                    </div>
                                )}

                                {/* Seçenekler */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-16">
                                    {currentQuestion.options?.map((opt, idx) => {
                                        let btnStyle = "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"; // Varsayılan
                                        
                                        // Cevap Verildiğinde Renkler
                                        if (feedback) {
                                            if (opt === currentQuestion.correctAnswer) {
                                                btnStyle = "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02] z-10";
                                            } else if (feedback === 'wrong' && opt !== currentQuestion.correctAnswer) {
                                                btnStyle = "bg-slate-800/50 text-slate-600 border-transparent opacity-50";
                                            }
                                        } else {
                                            // Hover Efekti (Cevap verilmediyse)
                                            btnStyle += " hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1";
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                disabled={feedback !== null}
                                                onClick={() => handleAnswer(opt)}
                                                className={cn(
                                                    "relative overflow-hidden py-4 px-5 md:py-5 md:px-6 rounded-2xl font-bold text-base md:text-xl border-2 transition-all duration-300 group text-left",
                                                    btnStyle
                                                )}
                                            >
                                                <div className="relative z-10 flex items-center gap-4">
                                                    <span className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black border flex-shrink-0",
                                                        feedback && opt === currentQuestion.correctAnswer 
                                                            ? "bg-white text-emerald-600 border-white" 
                                                            : "bg-slate-700 text-slate-400 border-slate-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500"
                                                    )}>
                                                        {String.fromCharCode(65 + idx)}
                                                    </span>
                                                    <span className="leading-snug">{opt}</span>
                                                </div>
                                                
                                                {/* Arkaplan Gradyan Efekti */}
                                                {!feedback && <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-indigo-600/0 to-indigo-600/0 group-hover:from-indigo-600/10 group-hover:via-purple-600/10 group-hover:to-blue-600/10 transition-all duration-500" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Geri Bildirim */}
                            {feedback && feedback !== 'timeout' && (
                                <div className={cn(
                                    "absolute bottom-0 left-0 right-0 p-4 text-center border-t border-white/10 animate-in slide-in-from-bottom-full duration-300",
                                    feedback === 'correct' ? "bg-emerald-900/90" : "bg-red-900/90"
                                )}>
                                    <span className="text-lg md:text-xl font-black text-white flex items-center justify-center gap-3">
                                        {feedback === 'correct' ? <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" /> : <X className="w-6 h-6 md:w-8 md:h-8" />}
                                        {feedback === 'correct' ? 'HARİKA, DOĞRU CEVAP!' : 'MAALESEF YANLIŞ!'}
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