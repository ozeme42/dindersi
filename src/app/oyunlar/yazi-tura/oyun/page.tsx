
'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { submitYaziTuraScoreAction, getYaziTuraQuestionsAction } from '../actions';
import type { Question } from "@/lib/types";
import { Loader2, AlertTriangle, ArrowLeft, Coins, Trophy, Save, RotateCw, CheckCircle2, XCircle, XOctagon } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

// --- BİLEŞENLER ---

const GameScreen = ({ gameState, children }: { gameState: string, children: React.ReactNode }) => {
    const isVisible = gameState === 'start' || gameState === 'flipping' || gameState === 'result';
    if (!isVisible) return null;
    return (
        <div className="w-full max-w-md mx-auto bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl p-8 text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
            {/* Arka Plan Işığı */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-[60px]" />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

const QuestionScreen = ({ gameState, children }: { gameState: string, children: React.ReactNode }) => {
    const isVisible = gameState === 'question' || gameState === 'feedback';
    if (!isVisible) return null;
    return (
         <div className="w-full max-w-2xl mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl p-6 md:p-10 relative animate-in slide-in-from-bottom-8 duration-500">
            {/* Neon Border Top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
            {children}
         </div>
    );
}

// --- ANA OYUN ---

export function YaziTuraClientPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const mainContentRef = useRef<HTMLDivElement>(null);

    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('loading'); 
    const [coinSide, setCoinSide] = useState<string | null>(null); 
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [rotation, setRotation] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    const [questionsYazi, setQuestionsYazi] = useState<Question[]>([]);
    const [questionsTura, setQuestionsTura] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const backUrl = '/oyunlar/yazi-tura';
    const gameContext = `Yazı Tura - ${searchParams.get('topicName') || 'Genel'}`;
    const topicName = searchParams.get('topicName') || 'Yazı Tura';

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
                setQuestionsYazi(questions.easy);
                setQuestionsTura(questions.hard);
                setGameState('start');
            }
        };
        fetchQuestions();
    }, [searchParams]);


    const flipCoin = () => {
        setGameState('flipping');
        setSelectedOption(null);
        playSound('coin-flip'); // Para sesi (varsa)
        
        const isYazi = Math.random() < 0.5;
        const result = isYazi ? 'yazi' : 'tura';
        
        // Çok turlu dönüş animasyonu
        const baseRotation = 1800 + (360 * 5); // En az 5 tur
        const targetRotation = isYazi ? baseRotation : baseRotation + 180;
        
        setRotation(prev => prev + targetRotation);

        setTimeout(() => {
            setCoinSide(result);
            setGameState('result');
            pickQuestion(result);
            playSound(result === 'yazi' ? 'pop' : 'pop'); 
        }, 2500);
    };

    const pickQuestion = (side: string) => {
        const questionPool = side === 'yazi' ? questionsYazi : questionsTura;
        // Basitçe rastgele seçelim, aynı soru gelebilir (daha gelişmiş mantık eklenebilir)
        const randomQ = questionPool[Math.floor(Math.random() * questionPool.length)];
        
        if(!randomQ) {
             // Soru havuzu boşsa veya hata varsa
             toast({title: "Soru Bulunamadı", description: "Yeterli soru yok.", variant: "destructive"});
             setGameState('start');
             return;
        }
        setCurrentQuestion(randomQ);
    };

    const handleOptionClick = (option: string) => {
        if (!currentQuestion) return;
        setSelectedOption(option);
        setGameState('feedback');
        
        const isCorrectCheck = option === currentQuestion.correctAnswer;
        setIsCorrect(isCorrectCheck);

        if (isCorrectCheck) {
            playSound('correct');
            const points = coinSide === 'yazi' ? 10 : 20;
            setScore(score + points);
        } else {
            playSound('incorrect');
        }
    };

    const nextTurn = () => {
        setGameState('start');
        setCoinSide(null);
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
            toast({ title: 'Başarılı!', description: `${score} puan kazandın ve profiline eklendi.` });
            router.push('/oyunlar/yazi-tura');
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const restartGame = () => {
        setScore(0);
        setGameState('start');
        setRotation(0);
        setCoinSide(null);
        setIsSaving(false);
        setIsScoreSaved(false);
    };
    
    // --- RENDER ---

    if (gameState === 'loading') {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-indigo-500"/></div>
    }

    if (error) {
         return (
             <div className="flex h-screen items-center justify-center p-4 bg-slate-950">
                <div className="bg-slate-900 border border-red-500/30 text-white px-8 py-6 rounded-3xl relative max-w-md text-center shadow-2xl">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Hata Oluştu</h3>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-white h-12 rounded-xl">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
         );
    }

    if (gameState === 'finished') {
        return (
            <GameEndScreen 
                score={score}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={restartGame}
                backUrl={backUrl}
            />
        );
    }

    return (
        <div ref={mainContentRef} className="min-h-screen flex flex-col items-center bg-slate-950 text-white relative overflow-hidden select-none pb-24 md:pb-8">
             
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* --- HUD --- */}
            <div className="w-full relative z-20 bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                            <Link href={backUrl}><ArrowLeft className="h-6 w-6" /></Link>
                        </Button>
                        <div>
                            <h1 className="font-bold text-lg text-white leading-tight">{topicName}</h1>
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Şansını Dene!</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <Button 
                            onClick={() => setGameState('finished')}
                            variant="ghost"
                            className="h-9 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg font-bold text-xs md:text-sm transition-colors border border-red-500/10 hidden sm:flex"
                        >
                            <XOctagon className="h-4 w-4 mr-1.5" />
                            Bitir
                        </Button>

                        <div className="flex items-center gap-2 bg-slate-950/50 border border-yellow-500/20 px-3 py-1.5 rounded-xl">
                            <Trophy className="h-4 w-4 text-yellow-400" />
                            <span className="font-mono font-bold text-white">{score}</span>
                        </div>
                        <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 border-white/10 text-slate-300 hover:text-white h-9 w-9 rounded-xl" />
                    </div>
                </div>
            </div>

            {/* --- OYUN ALANI --- */}
            <div className="flex-grow flex flex-col items-center justify-center p-4 w-full relative z-10">
                
                {/* CSS for 3D Coin */}
                <style jsx global>{`
                    .coin-container { perspective: 1000px; width: 180px; height: 180px; margin: 0 auto; cursor: pointer; }
                    .coin { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                    .coin-face { 
                        position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 50%; 
                        display: flex; align-items: center; justify-content: center; 
                        box-shadow: 0 0 30px rgba(234, 179, 8, 0.3), inset 0 0 20px rgba(255,255,255,0.2); 
                        border: 8px solid #FCD34D; 
                        background: radial-gradient(circle at 30% 30%, #F59E0B, #B45309);
                    }
                    .coin-front { transform: rotateY(0deg); }
                    .coin-back { transform: rotateY(180deg); }
                    .coin-text { font-weight: 900; font-size: 2rem; color: #FFFBEB; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
                    .coin-sub { font-size: 0.75rem; font-weight: bold; color: #FEF3C7; text-transform: uppercase; margin-top: 0.25rem; letter-spacing: 0.1em; }
                `}</style>

                <GameScreen gameState={gameState}>
                    <div className="mb-8 mt-2">
                        <div className="coin-container" onClick={gameState === 'start' ? flipCoin : undefined}>
                            <div className="coin" style={{ transform: `rotateY(${rotation}deg)` }}>
                                <div className="coin-face coin-front flex-col">
                                    <Coins className="h-10 w-10 text-yellow-100 mb-1 opacity-80" />
                                    <div className="coin-text">YAZI</div>
                                    <div className="coin-sub">10 Puan</div>
                                </div>
                                <div className="coin-face coin-back flex-col">
                                    <Trophy className="h-10 w-10 text-yellow-100 mb-1 opacity-80" />
                                    <div className="coin-text">TURA</div>
                                    <div className="coin-sub">20 Puan</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {gameState === 'start' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                            <p className="text-slate-400 mb-4">Parayı at, şansına gelen zorlukta soruyu bil!</p>
                            <button 
                                onClick={flipCoin} 
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold text-xl transition-all transform hover:scale-105 shadow-xl shadow-indigo-500/20 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1"
                            >
                                PARAYI AT <RotateCw className="inline-block ml-2 h-5 w-5" />
                            </button>
                        </div>
                    )}

                    {gameState === 'flipping' && <p className="text-indigo-400 font-bold text-lg animate-pulse mt-4">Şansın dönüyor...</p>}

                    {gameState === 'result' && (
                        <div className="animate-in zoom-in duration-300">
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 mb-2 drop-shadow-sm">
                                {coinSide === 'yazi' ? 'YAZI GELDİ!' : 'TURA GELDİ!'}
                            </h2>
                            <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-6 ${coinSide === 'yazi' ? 'bg-blue-500/20 text-blue-300' : 'bg-pink-500/20 text-pink-300'}`}>
                                {coinSide === 'yazi' ? 'Kolay Soru (10 Puan)' : 'Zor Soru (20 Puan)'}
                            </div>
                            
                            <button 
                                onClick={() => setGameState('question')} 
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold border border-white/10 transition-colors"
                            >
                                Soruyu Gör
                            </button>
                        </div>
                    )}
                </GameScreen>

                <QuestionScreen gameState={gameState}>
                    {currentQuestion && (
                        <>
                            <div className="mb-6 text-center">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg ${coinSide === 'yazi' ? 'bg-indigo-500' : 'bg-pink-500'}`}>
                                    {coinSide === 'yazi' ? '10 PUANLIK SORU' : '20 PUANLIK SORU'}
                                </span>
                            </div>
                            
                            <h3 className="text-xl md:text-3xl font-bold text-white mb-8 text-center leading-relaxed drop-shadow-md">
                                {currentQuestion.text}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.options?.map((option, index) => {
                                    let btnClass = "py-4 px-6 rounded-2xl font-bold text-lg transition-all border-2 relative overflow-hidden group ";
                                    
                                    if (gameState === 'question') {
                                        btnClass += "bg-slate-900/50 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-indigo-500/50 hover:text-white hover:shadow-lg";
                                    } else if (gameState === 'feedback') {
                                        if (option === currentQuestion.correctAnswer) {
                                            btnClass += "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02] z-10";
                                        } else if (option === selectedOption) {
                                            btnClass += "bg-red-900/50 border-red-500/50 text-red-400 opacity-80";
                                        } else {
                                            btnClass += "bg-slate-900/30 border-transparent text-slate-600 opacity-50";
                                        }
                                    }

                                    return (
                                        <button 
                                            key={index}
                                            onClick={() => gameState === 'question' && handleOptionClick(option)}
                                            disabled={gameState === 'feedback'}
                                            className={btnClass}
                                        >
                                            <span className="relative z-10">{option}</span>
                                            {gameState === 'feedback' && option === currentQuestion.correctAnswer && (
                                                <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-emerald-200 animate-in zoom-in" />
                                            )}
                                            {gameState === 'feedback' && option === selectedOption && option !== currentQuestion.correctAnswer && (
                                                <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-red-400 animate-in zoom-in" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {gameState === 'feedback' && (
                                <div className="mt-8 text-center animate-in slide-in-from-bottom-4 duration-300">
                                    <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-lg mb-4 ${isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                        {isCorrect ? <CheckCircle2 className="h-5 w-5"/> : <XCircle className="h-5 w-5"/>}
                                        {isCorrect ? 'Tebrikler! Doğru Cevap.' : 'Maalesef Yanlış.'}
                                    </div>
                                    <br/>
                                    <button 
                                        onClick={nextTurn}
                                        className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-indigo-50 shadow-lg shadow-white/10 transition-transform hover:scale-105"
                                    >
                                        Sıradaki Tur
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </QuestionScreen>

            </div>
        </div>
    );
}

export default function YaziTuraOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-indigo-500" /></div>}>
            <YaziTuraClientPage/>
        </Suspense>
    )
}
