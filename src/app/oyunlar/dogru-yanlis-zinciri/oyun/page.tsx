'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDogruYanlisZinciriAction, submitDogruYanlisZinciriScoreAction } from '@/app/oyunlar/dogru-yanlis-zinciri/actions';
import type { Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Ghost, XOctagon, PlusCircle, MinusCircle, CheckCircle, RotateCcw, Home, Trophy, Save, XCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';
import { GameEndScreen } from '@/components/game-end-screen';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';

const INITIAL_TIME = 15; 
const CORRECT_BONUS = 5; 
// Puanlama: Doğru 5, Yanlış -2
const POINTS_CORRECT = 5;
const POINTS_WRONG = 2; // Ceza puanı

function TrueFalseChainGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const feedbackTimer = useRef<NodeJS.Timeout>();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'error'>('loading');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    // GÖREV MODU PARAMETRELERİ
    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

    const gameContext = `Doğru/Yanlış Zinciri - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    const backUrl = '/oyunlar/dogru-yanlis-zinciri';

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getDogruYanlisZinciriAction(params);

        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu konu için uygun D/Y sorusu bulunamadı.");
            setGameState('error');
        } else {
            setQuestions(result.questions);
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);
    
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        } else if (timeLeft <= 0 && gameState === 'playing') {
            playSound('timeUp');
            setGameState('finished');
        }
        return () => clearTimeout(timer);
    }, [timeLeft, gameState]);
    
    const handleAnswer = (answer: boolean) => {
        if (gameState !== 'playing' || feedback) return;

        const currentQuestion = questions[currentQuestionIndex];
        const isCorrect = answer === (currentQuestion.isTrue ?? currentQuestion.correctAnswer === 'Doğru');

        if (isCorrect) {
            playSound('correct');
            setScore(prev => prev + POINTS_CORRECT); // +5 Puan
            setTimeLeft(prev => prev + CORRECT_BONUS);
            setFeedback('correct');
        } else {
            playSound('incorrect');
            setTimeLeft(prev => Math.max(0, prev - 5)); // Yanlışta süre cezası da var
            setScore(prev => Math.max(0, prev - POINTS_WRONG)); // -2 Puan (Ceza)
            setFeedback('wrong');
        }
        
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => {
            setFeedback(null);
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                setGameState('finished');
            }
        }, 800);
    };
    
    // --- BAŞARI KONTROLÜ (%70) ---
    const maxPossibleScore = questions.length * POINTS_CORRECT;
    const successThreshold = Math.ceil(maxPossibleScore * 0.7);
    const isSuccess = score >= successThreshold;

    useEffect(() => {
        if (gameState === 'finished' && isSuccess) {
            setShowConfetti(true);
            playSound('win');
        }
    }, [gameState, isSuccess]);

    const handleSaveAndExit = async () => {
        if (!user || isSaving || isScoreSaved) {
             router.push(isMission ? '/student/gorevler' : backUrl);
             return;
        }
        
        if (score <= 0) {
             router.push(isMission ? '/student/gorevler' : backUrl);
             return;
        }
        
        setIsSaving(true);

        try {
            if (isMission && topicId) {
                // --- GÖREV MODU KAYDI ---
                await addDoc(collection(db, 'scoreEvents'), {
                    userId: user.uid,
                    points: score,
                    context: topicId,
                    gameType: 'dogru-yanlis-zinciri',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isSuccess // %70 Barajı
                });

                if (isSuccess) {
                    toast({ title: "Görev Başarılı!", description: `Tebrikler! %70 barajını geçtin (${score} Puan).`, className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Görev Tamamlanamadı", description: `Başarı için en az ${successThreshold} puan gerekli.`, variant: "destructive" });
                }
            } else {
                // --- NORMAL MOD KAYDI ---
                const result = await submitDogruYanlisZinciriScoreAction(user.uid, score, gameContext);
                if (result.success) {
                    toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
                } else {
                    toast({ title: 'Hata', description: result.error, variant: 'destructive' });
                }
            }
            
            setIsScoreSaved(true);
        } catch (error) {
            console.error(error);
            toast({ title: 'Hata', description: "Puan kaydedilemedi.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestart = () => {
        setScore(0);
        setCurrentQuestionIndex(0);
        setTimeLeft(INITIAL_TIME);
        setGameState('loading');
        setIsScoreSaved(false);
        setShowConfetti(false);
        fetchGameData();
    };

    if (gameState === 'loading') {
        return <div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-green-500" /></div>;
    }
    
    if (gameState === 'error') {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-red-950/50 p-6 rounded-3xl border border-red-500/30">
                    <Ghost className="h-16 w-16 text-red-500 mx-auto" />
                    <h3 className="text-xl font-bold text-red-100">Oyun Başlatılamadı</h3>
                    <p className="text-red-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href={isMission ? '/student/gorevler' : backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    if (gameState === 'finished') {
        if(isMission) {
             return (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in">
                        <Confetti active={showConfetti} config={{ angle: 90, spread: 360, startVelocity: 40, elementCount: 100, decay: 0.9 }} />
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-white/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white -z-10"></div>
                            
                            <div className="mb-6 flex justify-center">
                                {isSuccess ? (
                                    <div className="p-4 bg-green-100 rounded-full border-4 border-green-200 shadow-xl animate-bounce">
                                        <Trophy className="h-16 w-16 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="p-4 bg-red-100 rounded-full border-4 border-red-200 shadow-xl">
                                        <XOctagon className="h-16 w-16 text-red-500" />
                                    </div>
                                )}
                            </div>

                            <h2 className="text-3xl font-black text-slate-800 mb-2">
                                {isSuccess ? "GÖREV BAŞARILI!" : "GÖREV BAŞARISIZ"}
                            </h2>
                            
                            <p className="text-slate-500 mb-6 font-medium">
                                {isSuccess 
                                    ? `Tebrikler! ${score} puanla %70 barajını geçtin.` 
                                    : `Maalesef ${score} puan aldın. Geçmek için ${successThreshold} puan gerekli.`}
                            </p>

                            <div className="space-y-3">
                                {/* Puan varsa ve kaydedilmemişse Kaydet Butonu */}
                                {!isScoreSaved && score > 0 && (
                                    <Button onClick={handleSaveAndExit} disabled={isSaving} className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : "Kaydet ve Devam Et"}
                                    </Button>
                                )}
                                
                                {isScoreSaved && (
                                    <Button onClick={() => router.push('/student/gorevler')} className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                                        <CheckCircle className="mr-2 h-5 w-5"/> Görevlere Dön
                                    </Button>
                                )}
                                
                                {(!isSuccess || isScoreSaved) && (
                                    <Button onClick={handleRestart} variant="outline" className="w-full h-12 font-bold">
                                        <RotateCcw className="mr-2 h-4 w-4"/> Tekrar Dene
                                    </Button>
                                )}

                                <Button onClick={() => router.push('/student')} variant="ghost" className="w-full text-slate-400 hover:text-slate-600">
                                    <Home className="mr-2 h-4 w-4"/> Ana Menü
                                </Button>
                            </div>
                        </div>
                    </div>
            );
        }

        return (
            <GameEndScreen 
                score={score} 
                onSave={handleSaveAndExit} 
                isSaving={isSaving} 
                scoreSaved={isScoreSaved} 
                onRestart={handleRestart} 
                backUrl={backUrl} 
            />
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const timeProgress = (timeLeft / 60) * 100;

    return (
        <div className="flex flex-col min-h-screen bg-green-950 text-white p-4 items-center justify-center relative overflow-hidden pb-24 md:pb-4">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"/>

            <div className="w-full max-w-4xl z-10 space-y-8">
                <div className="flex justify-between items-center bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <div className="text-xl md:text-2xl font-bold">Skor: <span className="text-green-400 font-mono">{score}</span></div>
                    
                    <div className={cn("relative text-3xl md:text-4xl font-black text-white font-mono", feedback && 'animate-tada')}>
                        {timeLeft}s
                        {feedback === 'correct' && <div className="absolute -top-4 -right-8 text-green-400 text-lg font-bold flex items-center gap-1 animate-in slide-in-from-bottom fade-in"><PlusCircle className="h-4 w-4"/> +{CORRECT_BONUS}</div>}
                        {feedback === 'wrong' && <div className="absolute -top-4 -right-8 text-red-400 text-lg font-bold flex items-center gap-1 animate-in slide-in-from-bottom fade-in"><MinusCircle className="h-4 w-4"/> -5</div>}
                    </div>

                    <div className="text-sm md:text-lg font-semibold">Soru: {currentQuestionIndex + 1} / {questions.length}</div>
                    <Button onClick={() => setGameState('finished')} variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/50 hover:text-red-300">
                        <XOctagon className="h-4 w-4 mr-2"/> Bitir
                    </Button>
                </div>
                <Progress value={timeProgress} className={cn("w-full h-3", timeLeft <= 10 ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500")} />
                
                <div className="bg-black/40 border-2 border-white/20 p-8 md:p-12 rounded-3xl text-center shadow-2xl min-h-[200px] flex items-center justify-center">
                    <p className="text-lg md:text-xl font-bold leading-tight">{currentQuestion.text}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <Button onClick={() => handleAnswer(true)} disabled={!!feedback} className="h-20 text-xl md:h-24 md:text-2xl font-black bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900 border-b-8 border-green-800 active:border-b-0 active:translate-y-2 transition-all">
                        <CheckCircle className="mr-2 h-6 w-6 md:mr-4 md:h-8 md:w-8"/> DOĞRU
                    </Button>
                    <Button onClick={() => handleAnswer(false)} disabled={!!feedback} className="h-20 text-xl md:h-24 md:text-2xl font-black bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900 border-b-8 border-red-800 active:border-b-0 active:translate-y-2 transition-all">
                        <XCircle className="mr-2 h-6 w-6 md:mr-4 md:h-8 md:w-8"/> YANLIŞ
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <TrueFalseChainGame />
        </Suspense>
    );
}