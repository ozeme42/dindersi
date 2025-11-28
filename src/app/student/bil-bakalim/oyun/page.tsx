
'use client';

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Zap, Trophy, Lightbulb, AlertTriangle, Loader2, PlayCircle, Home, RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { TermData } from '@/lib/types';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import Link from 'next/link';

// --- YARDIMCI FONKSİYONLAR ---
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// --- OYUN SAYFASI ---
export default function BilBakalimGamePage() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // --- STATE YÖNETİMİ ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Veri Havuzları
    const [allTerms, setAllTerms] = useState<TermData[]>([]); // Tüm kavramlar (Çeldirici havuzu için)
    const [questionQueue, setQuestionQueue] = useState<TermData[]>([]); // Soru kuyruğu (Yanlışlar sona eklenir)
    
    // Oyun Durumu
    const [currentOptions, setCurrentOptions] = useState<string[]>([]); // Şu anki şıklar
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'feedback' | 'finished'>('intro');
    const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'wrong' | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sabitler
    const CORRECT_POINTS = 20;
    const WRONG_POINTS = -10; // Yanlış cevap için ceza puanı

    // --- BAŞLANGIÇ VERİSİ ---
    useEffect(() => {
        const initGame = async () => {
            const courseId = searchParams.get('courseId');
            const unitId = searchParams.get('unitId');
            const topicId = searchParams.get('topicId');

            const res = await getBilBakalimAction({ 
                courseId: courseId || undefined, 
                unitId: unitId || undefined, 
                topicId: topicId || undefined 
            });

            if (res.error || !res.data) {
                setError(res.error || "Veri bulunamadı.");
            } else {
                setAllTerms(res.data);
                setQuestionQueue(shuffleArray(res.data));
            }
            setLoading(false);
        };
        initGame();
    }, [searchParams]);

    // --- SORU OLUŞTURMA MANTIĞI ---
    const prepareNextQuestion = useCallback(() => {
        if (questionQueue.length === 0) {
            finishGame();
            return;
        }

        const currentQuestion = questionQueue[0];
        
        // Çeldiricileri seç (Doğru cevap hariç diğer tüm terimlerden rastgele)
        const options = allTerms.map(t => t.term);
        
        setCurrentOptions(shuffleArray(options));
        setGameState('playing');
        setFeedbackStatus(null);
        setSelectedOption(null);
    }, [questionQueue, allTerms]);

    // Oyunu başlatma veya devam ettirme
    useEffect(() => {
        if (gameState === 'playing' && currentOptions.length === 0 && allTerms.length > 0) {
            prepareNextQuestion();
        }
    }, [gameState, prepareNextQuestion, currentOptions.length, allTerms.length]);

    const startGame = () => {
        setScore(0);
        setCombo(0);
        if (questionQueue.length === 0 && allTerms.length > 0) {
            setQuestionQueue(shuffleArray(allTerms));
        }
        setGameState('playing');
    };

    // --- CEVAP KONTROL MANTIĞI ---
    const handleAnswer = (answer: string) => {
        if (gameState !== 'playing' || !questionQueue[0]) return;

        const currentQuestion = questionQueue[0];
        const isCorrect = answer === currentQuestion.term;
        
        setSelectedOption(answer);
        setGameState('feedback');

        if (isCorrect) {
            setFeedbackStatus('correct');
            setCombo(prev => prev + 1);
            setScore(prev => prev + CORRECT_POINTS + (combo > 1 ? 5 : 0));
            
            if (combo > 1) {
                confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.8 },
                    colors: ['#10b981', '#34d399']
                });
            }

            setTimeout(() => {
                setQuestionQueue(prev => prev.slice(1));
            }, 1000);
        } else {
            setFeedbackStatus('wrong');
            setCombo(0);
            setScore(prev => Math.max(0, prev + WRONG_POINTS));
            
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([50, 50, 50]);

            setTimeout(() => {
                setQuestionQueue(prev => {
                    const [wrongItem, ...rest] = prev;
                    return [...rest, wrongItem];
                });
            }, 1000);
        }

        setTimeout(() => {
            if (isCorrect && questionQueue.length === 1) {
                finishGame();
            } else {
                setGameState('playing'); 
            }
        }, 1200);
    };

    useEffect(() => {
        if (gameState === 'playing' && feedbackStatus === null) {
             prepareNextQuestion();
        }
    }, [questionQueue, gameState, feedbackStatus, prepareNextQuestion]);


    const finishGame = async () => {
        setGameState('finished');
        setIsSubmitting(true);
        const context = `${searchParams.get('courseName') || 'Genel'} > ${searchParams.get('topicName') || 'Kavramlar'}`;
        
        await submitBilBakalimScoreAction(user?.uid || null, score, context);
        
        setIsSubmitting(false);
        confetti({
            particleCount: 200,
            spread: 120,
            origin: { y: 0.6 }
        });
    };

    if (loading) return (
        <div className="min-h-screen bg-[#2b1055] flex flex-col items-center justify-center text-white gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-amber-400" />
            <p className="text-xl font-bold animate-pulse">Kavramlar Yükleniyor...</p>
        </div>
    );

    if (error || allTerms.length === 0) return (
        <div className="min-h-screen bg-[#2b1055] flex flex-col items-center justify-center text-white p-6 text-center">
            <AlertTriangle className="h-20 w-20 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Ops! Bir Sorun Var</h2>
            <p className="text-slate-300 mb-6">{error || "Veri bulunamadı."}</p>
            <Link href="/student/activities">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                </Button>
            </Link>
        </div>
    );

    const currentQuestion = questionQueue[0];

    if (gameState === 'intro') {
        return (
            <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black flex items-center justify-center p-4 font-sans text-white">
                <div className="bg-black/30 backdrop-blur-md border-2 border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-600"></div>
                    
                    <div className="bg-cyan-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                        <Lightbulb className="h-12 w-12 text-cyan-400 animate-pulse" />
                    </div>
                    
                    <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-wide drop-shadow-lg">Bil Bakalım</h1>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6 text-left space-y-2">
                        <p className="flex items-center gap-2 text-indigo-200 text-sm">
                            <span className="bg-green-500/20 text-green-400 p-1 rounded">✔</span> 
                            Doğru cevaplar elenir (+{CORRECT_POINTS} Puan)
                        </p>
                        <p className="flex items-center gap-2 text-indigo-200 text-sm">
                            <span className="bg-red-500/20 text-red-400 p-1 rounded">✖</span> 
                            Yanlışlar sona atılır ({WRONG_POINTS} Puan)
                        </p>
                        <p className="flex items-center gap-2 text-indigo-200 text-sm">
                            <span className="bg-amber-500/20 text-amber-400 p-1 rounded">★</span> 
                            Tüm kavramları bitirene kadar devam!
                        </p>
                    </div>

                    <Button 
                        onClick={startGame}
                        className="w-full h-16 text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg rounded-2xl transition-all hover:scale-[1.02] active:scale-95 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                    >
                        <PlayCircle className="mr-2 h-7 w-7" /> Maceraya Başla
                    </Button>
                </div>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black flex items-center justify-center p-4 font-sans text-white">
                <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative animate-in zoom-in-95 duration-500">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                        <div className="bg-gradient-to-br from-yellow-300 to-amber-600 p-4 rounded-full shadow-lg border-4 border-[#2b1055]">
                            <Trophy className="h-16 w-16 text-white" />
                        </div>
                    </div>

                    <div className="mt-10 space-y-2">
                        <h2 className="text-3xl font-black text-white uppercase tracking-wider">Görev Tamamlandı!</h2>
                        <p className="text-indigo-200">Tüm kavramları başarıyla bildin.</p>
                        
                        <div className="bg-white/5 rounded-2xl p-6 mt-6 border border-white/10">
                            <p className="text-slate-400 text-sm uppercase font-bold tracking-widest mb-1">Toplam Skor</p>
                            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-emerald-600 drop-shadow-sm">
                                {score}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <Link href="/student/activities" className="w-full">
                            <Button variant="outline" className="w-full h-12 border-white/10 hover:bg-white/5 text-white rounded-xl">
                                <Home className="mr-2 h-5 w-5" /> Çıkış
                            </Button>
                        </Link>
                        <Button 
                            onClick={() => window.location.reload()} 
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
                        >
                            <RotateCcw className="mr-2 h-5 w-5" /> Tekrar
                        </Button>
                    </div>
                    
                    {isSubmitting && (
                        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-indigo-300 animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" /> Skor kaydediliyor...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#2b1055] to-black text-white font-sans flex flex-col overflow-hidden">
            <div className="px-4 py-4 flex items-center justify-between bg-black/20 backdrop-blur-sm border-b border-white/5 safe-area-top">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 flex items-center justify-center bg-indigo-900/50">
                            <span className="font-black text-lg">{questionQueue.length}</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            KALAN
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Skor</div>
                        <div className="text-2xl font-black leading-none">{score}</div>
                    </div>
                    {combo > 1 && (
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1 rounded-lg text-xs font-bold shadow-lg animate-bounce border border-orange-400/50">
                            {combo}x 🔥
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full h-1.5 bg-white/5">
                <div 
                    className="h-full bg-cyan-500 transition-all duration-500 shadow-[0_0_10px_#06b6d4]" 
                    style={{ width: `${((allTerms.length - questionQueue.length) / allTerms.length) * 100}%` }}
                />
            </div>

            <div className="flex-grow flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full gap-6">
                
                <div className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 md:p-10 shadow-2xl relative min-h-[180px] flex flex-col items-center justify-center text-center group transition-all hover:bg-white/10">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg border-4 border-[#2b1055]">
                        <Lightbulb className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-indigo-300 uppercase text-xs font-bold tracking-widest mb-4 mt-2">Bu kavram nedir?</h3>
                    <p className="text-lg md:text-2xl font-bold leading-relaxed text-white drop-shadow-md">
                        {currentQuestion?.definition}
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                    {currentOptions.map((term, idx) => {
                        let buttonClass = "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 text-indigo-100";
                        if (feedbackStatus && currentQuestion) {
                            if (term === currentQuestion.term) {
                                buttonClass = "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02] z-10";
                            } else if (term === selectedOption && feedbackStatus === 'wrong') {
                                buttonClass = "bg-red-600 border-red-400 text-white opacity-100 shake z-10";
                            } else {
                                buttonClass = "bg-black/40 border-transparent text-slate-500 opacity-40 blur-[1px]";
                            }
                        }

                        return (
                            <button
                                key={`${term}-${idx}`}
                                onClick={() => handleAnswer(term)}
                                disabled={feedbackStatus !== null}
                                className={cn("relative w-full p-4 h-24 rounded-xl border-2 font-bold text-base md:text-lg transition-all duration-200 shadow-md text-center flex items-center justify-center active:scale-98", buttonClass)}
                            >
                                {term}
                            </button>
                        );
                    })}
                </div>
                
                {feedbackStatus === 'wrong' && (
                    <div className="text-center animate-in slide-in-from-bottom-2 fade-in text-red-300 text-sm font-medium bg-red-900/30 px-4 py-2 rounded-lg border border-red-500/30">
                        Bu kavram kuyruğun sonuna eklendi. Tekrar sorulacak!
                    </div>
                )}
            </div>
        </div>
    );
}
```