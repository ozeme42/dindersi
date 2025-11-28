'use client';

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { TermData } from '../actions';

import { Loader2, ArrowLeft, Lightbulb, Trophy, AlertTriangle, PlayCircle, Home, RotateCcw, Zap, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import Link from "next/link";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";


const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

function BilBakalimGamePage() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // --- STATE MANAGEMENT ---
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Data Pools
    const [allTerms, setAllTerms] = useState<TermData[]>([]);
    const [questionQueue, setQuestionQueue] = useState<TermData[]>([]);
    
    // Game State
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'feedback' | 'finished'>('intro');
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [feedback, setFeedback] = useState<{ status: 'correct' | 'wrong'; term: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Constants
    const CORRECT_POINTS = 20;
    const WRONG_POINTS = -10;
    const COMBO_BONUS = 5;

    // --- DATA FETCHING ---
    useEffect(() => {
        const initGame = async () => {
            const courseId = searchParams.get('courseId');
            const unitId = searchParams.get('unitId');
            const topicId = searchParams.get('topicId');

            const res = await getBilBakalimAction({ courseId, unitId, topicId });

            if (res.error || !res.data || res.data.length === 0) {
                setError(res.error || "Bu konu için oynanacak yeterli kavram bulunamadı.");
            } else {
                setAllTerms(res.data);
                setQuestionQueue(shuffleArray(res.data));
            }
            setIsLoading(false);
        };
        initGame();
    }, [searchParams]);

    // --- GAME LOGIC ---
    const startGame = () => {
        setScore(0);
        setCombo(0);
        setQuestionQueue(shuffleArray(allTerms));
        setGameState('playing');
        setFeedback(null);
    };

    const handleAnswer = (selectedTerm: string) => {
        if (gameState !== 'playing') return;

        const currentQuestion = questionQueue[0];
        const isCorrect = selectedTerm === currentQuestion.term;
        
        setGameState('feedback');

        if (isCorrect) {
            setFeedback({ status: 'correct', term: currentQuestion.term });
            setCombo(prev => prev + 1);
            setScore(prev => prev + CORRECT_POINTS + (combo >= 1 ? COMBO_BONUS : 0));
            
            if (combo > 0) {
                confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#10b981', '#34d399'] });
            }

            setTimeout(() => {
                const newQueue = questionQueue.slice(1);
                setQuestionQueue(newQueue);
                if (newQueue.length === 0) {
                    finishGame();
                } else {
                    setGameState('playing');
                    setFeedback(null);
                }
            }, 1200);

        } else {
            setFeedback({ status: 'wrong', term: selectedTerm });
            setCombo(0);
            setScore(prev => Math.max(0, prev + WRONG_POINTS));
            
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([50, 50, 50]);

            setTimeout(() => {
                setQuestionQueue(prev => {
                    const [wrongItem, ...rest] = prev;
                    return [...rest, wrongItem];
                });
                setGameState('playing');
                setFeedback(null);
            }, 1200);
        }
    };
    
    const finishGame = async () => {
        setGameState('finished');
        setIsSubmitting(true);
        const context = `${searchParams.get('courseName') || 'Genel'} > ${searchParams.get('topicName') || 'Kavramlar'}`;
        
        if(user && score > 0) {
            await submitBilBakalimScoreAction(user.uid, score, context);
        }
        
        setIsSubmitting(false);
        confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
    };

    // --- RENDER ---
    if (isLoading) return (
        <div className="min-h-screen bg-[#2b1055] flex flex-col items-center justify-center text-white gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-amber-400" />
            <p className="text-xl font-bold animate-pulse">Kavramlar Yükleniyor...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-[#2b1055] flex flex-col items-center justify-center text-white p-6 text-center">
            <AlertTriangle className="h-20 w-20 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Ops! Bir Sorun Var</h2>
            <p className="text-slate-300 mb-6">{error}</p>
            <Link href="/student/activities">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                </Button>
            </Link>
        </div>
    );

    if (gameState === 'intro') {
        return (
            <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black flex items-center justify-center p-4 font-sans text-white">
                 <Card className="bg-black/30 backdrop-blur-md border-2 border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-600"></div>
                    <CardHeader>
                        <div className="bg-cyan-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto ring-4 ring-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                            <Lightbulb className="h-12 w-12 text-cyan-400 animate-pulse" />
                        </div>
                        <CardTitle className="text-4xl font-black text-white uppercase tracking-wide drop-shadow-lg mt-4">Bil Bakalım</CardTitle>
                    </CardHeader>
                    <CardContent className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6 text-left space-y-2">
                        <p className="flex items-center gap-2 text-indigo-200 text-sm"><span className="bg-green-500/20 text-green-400 p-1 rounded">✔</span> Doğru cevapta puan kazan, soru listeden çıksın.</p>
                        <p className="flex items-center gap-2 text-indigo-200 text-sm"><span className="bg-red-500/20 text-red-400 p-1 rounded">✖</span> Yanlış cevapta puan kaybet, soru tekrar karşına çıksın.</p>
                        <p className="flex items-center gap-2 text-indigo-200 text-sm"><span className="bg-amber-500/20 text-amber-400 p-1 rounded">★</span> Kombo yap, bonus puanları topla!</p>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={startGame} className="w-full h-16 text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg rounded-2xl transition-all hover:scale-[1.02] active:scale-95 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
                            <PlayCircle className="mr-2 h-7 w-7" /> Maceraya Başla
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (gameState === 'finished') {
        return (
             <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black flex items-center justify-center p-4 font-sans text-white">
                <Card className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative animate-in zoom-in-95 duration-500">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                        <div className="bg-gradient-to-br from-yellow-300 to-amber-600 p-4 rounded-full shadow-lg border-4 border-[#2b1055]">
                            <Trophy className="h-16 w-16 text-white" />
                        </div>
                    </div>
                    <CardHeader className="mt-10">
                        <CardTitle className="text-3xl font-black text-white uppercase tracking-wider">Görev Tamamlandı!</CardTitle>
                        <CardDescription className="text-indigo-200">Tüm kavramları başarıyla bildin.</CardDescription>
                    </CardHeader>
                    <CardContent className="bg-white/5 rounded-2xl p-6 mt-2 border border-white/10">
                        <p className="text-slate-400 text-sm uppercase font-bold tracking-widest mb-1">Toplam Skor</p>
                        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-emerald-600 drop-shadow-sm">{score}</div>
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-4 mt-8">
                        <Link href="/student/activities" className="w-full">
                            <Button variant="outline" className="w-full h-12 border-white/10 hover:bg-white/5 text-white rounded-xl">
                                <Home className="mr-2 h-5 w-5" /> Çıkış
                            </Button>
                        </Link>
                        <Button onClick={startGame} className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
                            <RotateCcw className="mr-2 h-5 w-5" /> Tekrar
                        </Button>
                    </CardFooter>
                     {isSubmitting && <div className="flex items-center justify-center gap-2 mt-4 text-xs text-indigo-300 animate-pulse"><Loader2 className="h-3 w-3 animate-spin" /> Skor kaydediliyor...</div>}
                </Card>
            </div>
        );
    }
    
    const currentQuestion = questionQueue[0];
    
    return (
        <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#2b1055] to-black text-white font-sans flex flex-col overflow-hidden">
            <header className="px-4 py-3 flex items-center justify-between bg-black/20 backdrop-blur-sm border-b border-white/5 safe-area-top">
                <div className="text-left">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">SKOR</div>
                    <div className="text-2xl font-black leading-none">{score}</div>
                </div>
                <div className="flex items-center gap-2 text-center text-sm bg-black/30 px-3 py-1 rounded-full border border-white/10">
                    <span className="font-bold">{allTerms.length - questionQueue.length + 1}</span>
                    <span className="opacity-60">/</span>
                    <span className="opacity-60">{allTerms.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    {combo > 1 && <div className="bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1 rounded-lg text-xs font-bold shadow-lg animate-bounce border border-orange-400/50">{combo}x 🔥</div>}
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center p-4 gap-4 max-w-4xl w-full mx-auto">
                <div className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl min-h-[120px] flex items-center justify-center text-center">
                    <p className="text-lg md:text-xl font-bold leading-relaxed text-indigo-100 drop-shadow-md">{currentQuestion?.definition}</p>
                </div>

                <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {allTerms.map((termData, idx) => {
                        const term = termData.term;
                        let buttonClass = "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 text-indigo-100";
                        let icon = null;

                        if (feedback) {
                            if (term === feedback.term) {
                                buttonClass = feedback.status === 'correct'
                                    ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02] z-10"
                                    : "bg-red-600 border-red-400 text-white opacity-100 shake z-10";
                                icon = feedback.status === 'correct' ? <Check className="h-5 w-5 mr-2" /> : <X className="h-5 w-5 mr-2" />;
                            } else {
                                buttonClass = "bg-black/40 border-transparent text-slate-500 opacity-40 blur-[1px]";
                            }
                        }

                        return (
                            <button
                                key={termData.id}
                                onClick={() => handleAnswer(term)}
                                disabled={feedback !== null}
                                className={cn("relative w-full p-4 h-20 rounded-xl font-bold text-base transition-all duration-200 shadow-md text-left flex items-center active:scale-98", buttonClass)}
                            >
                                {icon}
                                <span className="flex-grow">{term}</span>
                            </button>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

function BilBakalimGamePageWrapper() {
     return (
        <Suspense fallback={<div className="min-h-screen bg-[#2b1055] flex flex-col items-center justify-center text-white gap-4"><Loader2 className="h-16 w-16 animate-spin text-amber-400" /></div>}>
            <BilBakalimGamePage />
        </Suspense>
    )
}

export default BilBakalimGamePageWrapper;
