
'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Swords, Repeat, Award, PartyPopper, Check, Home, Timer, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getKavramDuellosuQuestions } from '../actions';
import type { KavramDuellosuQuestion } from '../actions';
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { playSound, stopSound } from "@/lib/audio-service";
import Confetti from 'react-dom-confetti';

function CompetitionLoadingSkeleton() {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
      </div>
    );
}

function DuelGameComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [questions, setQuestions] = useState<KavramDuellosuQuestion[]>([]);
    
    const [state, setState] = useState({
        p1Score: 0,
        p2Score: 0,
        currentQIndex: 0,
        showNextButton: false,
        correctAnswer: null as string | null,
        winner: null as 'p1' | 'p2' | null,
        gameState: 'playing' as 'playing' | 'finished',
    });

    const [p1Lock, setP1Lock] = useState(false);
    const [p2Lock, setP2Lock] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [timeLeft, setTimeLeft] = useState(15);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const questionResult = await getKavramDuellosuQuestions(params);
        
        if (questionResult.error) {
            setError(questionResult.error);
        } else if (questionResult.questions && questionResult.questions.length > 0) {
            const tripleQuestions = [...questionResult.questions, ...questionResult.questions, ...questionResult.questions];
            setQuestions(tripleQuestions.sort(() => Math.random() - 0.5));
        } else {
            setError("Uygun soru bulunamadı.");
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);
    
    const currentQ = questions[state.currentQIndex];

    const loadQuestion = useCallback(() => {
        if (!currentQ) {
            if (state.currentQIndex >= questions.length && questions.length > 0) {
                 setState(s => ({...s, gameState: 'finished'}));
                 playSound('win');
            }
            return;
        }

        setState(s => ({ 
            ...s, 
            showNextButton: false,
            correctAnswer: null,
            winner: null,
        }));
        setP1Lock(false);
        setP2Lock(false);
        setTimeLeft(15);

    }, [currentQ, state.currentQIndex, questions.length]);
    
    useEffect(() => {
        if (!isLoading && questions.length > 0) {
            loadQuestion();
        }
    }, [isLoading, questions, state.currentQIndex, loadQuestion]);
    
    const handleTimeUp = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
        if (state.showNextButton) return;
        
        playSound('timeUp');
        setP1Lock(true);
        setP2Lock(true);
        setState(s => ({ ...s, showNextButton: true, correctAnswer: currentQ?.a || null }));
    }, [currentQ, state.showNextButton]);
    
    useEffect(() => {
        if (state.gameState === 'playing' && !state.showNextButton) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleTimeUp();
                        return 0;
                    }
                    if (prev <= 6 && prev > 1) {
                        playSound('timer');
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                stopSound('timer');
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            stopSound('timer');
        };
    }, [state.gameState, state.showNextButton, handleTimeUp]);

    const handleAnswer = (player: 'p1' | 'p2', answer: string) => {
        if (!currentQ || state.showNextButton) return;
        
        const isP1 = player === 'p1';
        if ((isP1 && p1Lock) || (!isP1 && p2Lock)) return;

        if (answer !== currentQ.a) { // Yanlış Cevap
            playSound('incorrect');
            const zoneId = `${player}-zone`;
            document.getElementById(zoneId)?.classList.add('shake');
            
            if (isP1) setP1Lock(true);
            else setP2Lock(true);
            
            setTimeout(() => {
                document.getElementById(zoneId)?.classList.remove('shake');
            }, 500);

            if ((isP1 && p2Lock) || (!isP1 && p1Lock)) {
                 if (timerRef.current) clearInterval(timerRef.current);
                 stopSound('timer');
                 setTimeout(() => setState(s => ({...s, showNextButton: true, correctAnswer: currentQ?.a || null})), 500);
            }
            return;
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            stopSound('timer');
        }

        playSound('correct');
        const winner = player;
        setState(prevState => ({
            ...prevState,
            p1Score: isP1 ? prevState.p1Score + 1 : prevState.p1Score,
            p2Score: !isP1 ? prevState.p2Score + 1 : prevState.p2Score,
            showNextButton: true,
            correctAnswer: currentQ.a,
            winner,
        }));
        
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
    };

    const nextQuestion = () => {
        setState(s => ({...s, currentQIndex: s.currentQIndex + 1}));
    }

    const resetGame = () => {
        setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
        setState({
            p1Score: 0,
            p2Score: 0,
            currentQIndex: 0,
            showNextButton: false,
            correctAnswer: null,
            winner: null,
            gameState: 'playing'
        });
        setP1Lock(false);
        setP2Lock(false);
    }
    
    if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>;
    if (error) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-red-400 text-2xl p-8 text-center">{error}</div>;

    if (state.gameState === 'finished') {
        const p1s = state.p1Score;
        const p2s = state.p2Score;
        let winnerText = "BERABERE!";
        if (p1s > p2s) winnerText = "MAVİ TAKIM KAZANDI!";
        if (p2s > p1s) winnerText = "KIRMIZI TAKIM KAZANDI!";
        
        return (
             <div className="flex h-screen items-center justify-center p-4 bg-slate-950">
                 <Card className="w-full max-w-lg text-center bg-slate-900 border-white/10 overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-red-600 to-blue-600 p-1"></div>
                    <CardHeader className="pb-2">
                        <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-2 drop-shadow-md"/>
                        <CardTitle className="text-2xl text-white">Yarışma Bitti!</CardTitle>
                        <CardDescription className="text-slate-400 text-lg">{winnerText}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                         <div className="flex justify-around">
                            <div className="text-center p-4 rounded-lg bg-blue-900/50 border border-blue-700 w-40">
                                <p className="text-sm font-bold text-blue-300">MAVİ TAKIM</p>
                                <p className="text-4xl font-black text-white">{p1s}</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-red-900/50 border border-red-700 w-40">
                                <p className="text-sm font-bold text-red-300">KIRMIZI TAKIM</p>
                                <p className="text-4xl font-black text-white">{p2s}</p>
                            </div>
                         </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4 p-6">
                        <Button onClick={resetGame} size="lg" className="bg-indigo-600 hover:bg-indigo-500 font-bold"><Repeat className="mr-2 h-5 w-5"/> Tekrar Oyna</Button>
                        <Button asChild variant="outline" size="lg" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent">
                            <Link href="/teacher/smartboard"><Home className="mr-2 h-5 w-5"/> Ana Menü</Link>
                        </Button>
                    </CardFooter>
                 </Card>
            </div>
        );
    }
    
    if (!currentQ) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>;
    
    const OptionButton = ({ player, option, ...props }: { player: 'p1' | 'p2', option: string, [key: string]: any }) => {
        const isP1 = player === 'p1';
        const baseClass = isP1
            ? 'bg-blue-100 text-blue-900 hover:bg-blue-50 border-b-4 border-blue-300 active:border-b-0 active:translate-y-1'
            : 'bg-red-100 text-red-900 hover:bg-red-50 border-b-4 border-red-300 active:border-b-0 active:translate-y-1';
        
        const isCorrect = state.correctAnswer === option;
        
        let dynamicClass = baseClass;
        if(state.showNextButton && isCorrect) {
            dynamicClass = 'bg-green-500 text-white border-green-700 correct-blink';
        }

        return <button onClick={() => handleAnswer(player, option)} className={`w-full h-full text-2xl font-bold rounded-xl shadow-md transition-all ${dynamicClass}`} {...props}>{option}</button>;
    }
    
    return (
        <div className="h-screen w-screen bg-slate-900 text-white flex">
             <style jsx global>{`
                body { touch-action: manipulation; user-select: none; overflow: hidden; font-family: 'Segoe UI', sans-serif; }
                .player-zone { transition: background-color 0.3s; }
                .shake { animation: shake 0.5s; }
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                .correct-blink { animation: blinkGreen 0.5s 3; }
                @keyframes blinkGreen { 50% { background-color: #4ade80; color: white; } }
                .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
            
            <div id="p1-zone" className="player-zone flex-1 bg-blue-900/50 border-r-4 border-white/10 flex flex-col relative">
                <div className="p-4 bg-blue-800 flex justify-between items-center shadow-lg z-10">
                    <div className="flex items-center gap-2">
                        <User className="w-6 h-6 text-blue-200" />
                        <span className="text-2xl font-bold text-blue-200">MAVİ TAKIM</span>
                    </div>
                    <span id="p1-score" className="text-5xl font-black text-white drop-shadow-lg">{state.p1Score}</span>
                </div>
                
                <div className="flex-1 flex flex-col justify-center p-8 gap-6 relative z-0" id="p1-controls">
                    <div className="bg-white/10 p-6 rounded-2xl mb-4 min-h-[160px] flex items-center justify-center backdrop-blur-sm border border-white/5 shadow-xl">
                        <p id="p1-question" className="text-3xl font-semibold text-center text-blue-50 leading-relaxed">{currentQ.q}</p>
                    </div>
                    <div id="p1-options" className="grid grid-cols-2 gap-4 h-64">
                        {currentQ?.options.map(opt => <OptionButton key={`p1-${opt}`} player="p1" option={opt} />)}
                    </div>
                </div>
                
                {p1Lock && <div id="p1-lock" className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in"><XCircle className="w-32 h-32 text-red-500 mb-4 animate-bounce" /><span className="text-2xl font-bold text-red-400">YANLIŞ!</span></div>}
                
                {state.winner === 'p1' && state.showNextButton &&
                    <div className="absolute inset-0 bg-green-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
                        <CheckCircle2 className="w-32 h-32 text-green-400 mb-4" />
                        <span className="text-4xl font-black text-white">DOĞRU!</span>
                    </div>
                }
            </div>

            <div id="p2-zone" className="player-zone flex-1 bg-red-900/50 flex flex-col relative">
                <div className="p-4 bg-red-800 flex justify-between items-center shadow-lg z-10">
                    <div className="flex items-center gap-2"><User className="w-6 h-6 text-red-200" /><span className="text-2xl font-bold text-red-200">KIRMIZI TAKIM</span></div>
                    <span id="p2-score" className="text-5xl font-black text-white drop-shadow-lg">{state.p2Score}</span>
                </div>

                <div className="flex-1 flex flex-col justify-center p-8 gap-6 relative z-0" id="p2-controls">
                    <div className="bg-white/10 p-6 rounded-2xl mb-4 min-h-[160px] flex items-center justify-center backdrop-blur-sm border border-white/5 shadow-xl"><p id="p2-question" className="text-3xl font-semibold text-center text-red-50 leading-relaxed">{currentQ.q}</p></div>
                    <div id="p2-options" className="grid grid-cols-2 gap-4 h-64">{currentQ?.options.map(opt => <OptionButton key={`p2-${opt}`} player="p2" option={opt} />)}</div>
                </div>
                
                {p2Lock && <div id="p2-lock" className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in"><XCircle className="w-32 h-32 text-red-500 mb-4 animate-bounce" /><span className="text-2xl font-bold text-red-400">YANLIŞ!</span></div>}
                
                {state.winner === 'p2' && state.showNextButton &&
                    <div className="absolute inset-0 bg-green-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
                        <CheckCircle2 className="w-32 h-32 text-green-400 mb-4" />
                        <span className="text-4xl font-black text-white">DOĞRU!</span>
                    </div>
                }
            </div>

             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]">
                {state.showNextButton ? (
                     <Button onClick={nextQuestion} className="h-24 px-12 text-2xl font-black bg-white text-slate-900 hover:bg-slate-200 pointer-events-auto animate-in zoom-in-50 duration-300">
                        SONRAKİ <ArrowRight className="ml-3 h-8 w-8" />
                    </Button>
                ) : (
                    <div className={cn(
                        "bg-slate-900 text-slate-100 font-black text-4xl w-24 h-24 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-2xl transform transition-all",
                        timeLeft <= 5 ? 'border-red-500 text-red-500 animate-pulse' : ''
                    )}>
                        <Timer className="h-8 w-8 mr-1" />
                        {timeLeft}
                    </div>
                )}
            </div>
            
            <Link href="/teacher/smartboard/kavram-duellosu" className="absolute top-6 left-6 z-50">
                 <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 text-white border border-white/10">
                    <ArrowLeft className="w-8 h-8" />
                 </Button>
            </Link>
             {showConfetti && <Confetti active={showConfetti} config={{ particleCount: 200, spread: 90, origin: { x: state.winner === 'p1' ? 0.25 : 0.75, y: 0.6 } }} />}
        </div>
    );
}
```
- src/app/teacher/smartboard/page.tsx:
```tsx

'use client';

import Link from 'next/link';
import React, { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MonitorPlay, User, Users, Swords, ArrowRight, BrainCircuit, Settings, Trophy, GitBranch, Columns, LayoutTemplate, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// GÜNCELLEME: Daha kompakt kart bileşeni
const SmartboardCard = ({ href, title, description, icon, colorClass, isExternal }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string, isExternal?: boolean }) => {
    const linkContent = (
        <div className={cn(
            "h-full w-full rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform border-b-[6px] group-hover:border-b-0 group-hover:translate-y-2 relative overflow-hidden group",
            colorClass
        )}>
            {/* Arka Plan Işık Efekti */}
            <div className={cn("absolute inset-0 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity", colorClass.includes('bg-') ? colorClass.replace('bg-', 'bg-') : 'bg-primary')}></div>
            
            {/* İkon */}
            <div className="p-4 rounded-2xl bg-white/10 mb-4 border border-white/20 relative z-10 group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm">
                {React.cloneElement(icon as React.ReactElement, { className: "h-8 w-8 text-white" })}
            </div>
            
            {/* Başlık */}
            <h3 className="font-black text-xl md:text-2xl mt-1 text-white drop-shadow-md relative z-10 uppercase tracking-tight leading-tight">{title}</h3>
            
            {/* Açıklama */}
            <p className="mt-2 text-white/80 text-sm font-medium relative z-10 leading-snug line-clamp-3">{description}</p>
            
            <div className="flex-grow" />
            
            {/* Detay Butonu/İkonu */}
            <div className="mt-4 flex items-center text-sm font-bold text-white relative z-10 bg-black/20 px-4 py-1.5 rounded-full border border-white/10 group-hover:bg-white/20 transition-colors">
                BAŞLAT <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
    );
    
    if (isExternal) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="block group h-full">{linkContent}</a>
    }

    return (
        <Link href={href} className="block group h-full">
            {linkContent}
        </Link>
    )
};


export default function SmartboardPage() {
  
    // Yarışma Modları
    const yarışmalar = [
        {
            key: 'smartboard_bireysel',
            href: "/teacher/smartboard/bireysel",
            title: "Bireysel Yarışma",
            description: "Herkesin kendi başına yarıştığı klasik mod.",
            icon: <User />,
            colorClass: "bg-indigo-600 border-indigo-800 hover:bg-indigo-500",
        },
        {
            key: 'smartboard_takim',
            href: "/teacher/smartboard/takim",
            title: "Takım Savaşı",
            description: "Öğrencileri gruplandırıp takım ruhuyla yarıştırın.",
            icon: <Users />,
            colorClass: "bg-teal-600 border-teal-800 hover:bg-teal-500",
        },
        {
            key: 'smartboard_duello',
            href: "/teacher/smartboard/duello",
            title: "Düello",
            description: "İki öğrenciyi veya takımı doğrudan karşılaştırın.",
            icon: <Swords />,
            colorClass: "bg-red-600 border-red-800 hover:bg-red-500",
        },
        {
            key: 'kavram_duellosu',
            href: "/teacher/smartboard/kavram-duellosu",
            title: "Kavram Düellosu",
            description: "Hızlı tempolu bilgi ve refleks yarışması.",
            icon: <BrainCircuit />,
            colorClass: "bg-fuchsia-600 border-fuchsia-800 hover:bg-fuchsia-500",
        },
        {
            key: 'fetih_oyunu',
            href: "/teacher/smartboard/fetih-oyunu",
            title: "Fetih Oyunu",
            description: "Sorularla haritada ilerle, kaleyi fethet.",
            icon: <GitBranch />,
            colorClass: "bg-emerald-600 border-emerald-800 hover:bg-emerald-500",
        },
        {
            key: 'tornado',
            href: "/teacher/smartboard/tornado",
            title: "Tornado",
            description: "Rastgele puanlar ve sürpriz sorular.",
            icon: <Wind />,
            colorClass: "bg-cyan-600 border-cyan-800 hover:bg-cyan-500",
        },
        {
            key: 'kutu_ac',
            href: "/teacher/smartboard/kutu-ac",
            title: "Kutu Aç",
            description: "Kutuları açarak puan topla ve lider ol.",
            icon: <Package />,
            colorClass: "bg-purple-600 border-purple-800 hover:bg-purple-500",
        },
    ];
    
    // Sunum & Araç Modları
    const sunumlar = [
        {
            key: 'ozetler',
            href: "/teacher/smartboard/ozetler",
            title: "Özetler & İçerik",
            description: "Konu özetlerini ve HTML içerikleri sun.",
            icon: <LayoutTemplate />,
            colorClass: "bg-rose-600 border-rose-800 hover:bg-rose-500",
        },
        {
            key: 'yazilacaklar',
            href: "/teacher/smartboard/yazilacaklar",
            title: "Kavram Panosu",
            description: "Kavramlar ve notları sütunlara ayırarak göster.",
            icon: <Columns />,
            colorClass: "bg-amber-600 border-amber-800 hover:bg-amber-500",
        },
        {
             key: 'sanal-tahta',
             href: "/teacher/smartboard/sanal-tahta",
             title: "Sanal Tahta",
             description: "Ders anlatımı için dijital beyaz tahta.",
             icon: <Lightbulb />,
             colorClass: "bg-blue-600 border-blue-800 hover:bg-blue-500",
        },
        {
             key: 'anlik-geri-bildirim',
             href: "/teacher/smartboard/anlik-geri-bildirim",
             title: "Anlık Geri Bildirim",
             description: "Sınıfın nabzını ölçmek için hızlı anket.",
             icon: <Zap />,
             colorClass: "bg-slate-700 border-slate-900 hover:bg-slate-600",
        },
        {
            key: 'carkifelek',
            href: "/teacher/smartboard/carkifelek",
            title: "Çarkıfelek",
            description: "Rastgele bir öğrenci seçmek için çarkı çevir.",
            icon: <Trophy />,
            colorClass: "bg-yellow-600 border-yellow-800 hover:bg-yellow-500",
        },
    ];

    return (
        <div className="flex flex-col items-center p-6 sm:p-8 space-y-12 min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
            
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px]" />
            </div>

            {/* Ana Başlık */}
            <div className="text-center relative z-10 space-y-4 pt-4">
                <Link href="/teacher" className="inline-block">
                    <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-full mb-2 border border-white/10 shadow-2xl backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors">
                        <MonitorPlay className="h-8 w-8 text-cyan-400"/>
                    </div>
                </Link>
                <h1 className="font-black text-4xl md:text-6xl tracking-tight text-white drop-shadow-2xl">AKILLI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TAHTA</span></h1>
                <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">Sınıf içi etkileşimi artırmak için bir mod seçin.</p>
            </div>
            
            <div className="w-full max-w-[1400px] space-y-10 relative z-10">
                
                {/* Yarışmalar Bölümü */}
                <section>
                    <h2 className="text-2xl font-black text-center mb-6 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-indigo-500"></div>
                        <span className="bg-indigo-500/10 px-4 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-300 uppercase tracking-widest text-sm flex items-center gap-2">
                           <Trophy className="h-5 w-5" /> Yarışma Modları
                        </span>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-indigo-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {yarışmalar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[240px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sunumlar ve Araçlar Bölümü */}
                <section>
                    <h2 className="text-2xl font-black text-center mb-6 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-rose-500"></div>
                        <span className="bg-rose-500/10 px-4 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 uppercase tracking-widest text-sm flex items-center gap-2">
                           <MonitorPlay className="h-5 w-5" /> Sunumlar ve Araçlar
                        </span>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-rose-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {sunumlar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[240px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>
                
            </div>

            {/* Yönetim Butonları */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full max-w-4xl relative z-10 p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-base font-bold shadow-lg shadow-amber-900/40 h-12 px-6 rounded-xl transition-all border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 w-full md:w-auto">
                    <Link href="/teacher/smartboard/leaderboard">
                        <Trophy className="mr-2 h-5 w-5" />
                        Turnuva Liderliği
                    </Link>
                </Button>
                <div className="h-px w-full md:w-px md:h-8 bg-white/10"></div>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 text-base font-bold h-12 px-5 rounded-lg w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/guest-students">
                        <UserCog className="mr-2 h-5 w-5 text-cyan-400" />
                        Sanal Öğrenciler
                    </Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-base font-bold h-12 px-5 rounded-lg w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/game-settings">
                        <Settings className="mr-2 h-5 w-5 text-purple-400" />
                        Oyun Ayarları
                    </Link>
                </Button>
            </div>
            
        </div>
    );
}
```
- src/hooks/use-local-storage.ts:
```ts
'use client'

import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
```
- src/lib/shop-items.ts:
```ts
'use client';

import { ShopItem } from "./types";
import { 
    FlameBadge, SnowflakeBadge, CrownBadge, ShieldBadge, BoltBadge, 
    StarBadge, BrainBadge, HeartBadge, BookBadge, GamepadBadge, MusicBadge, 
    AtomBadge, DjBadge, InfinityBadge, PixelHeartBadge, HilalBadge, 
    KabeBadge, CamiBadge, TesbihBadge, GraduationCapBadge, LightbulbBadge, 
    PencilBadge, TelescopeBadge, CompassBadge, ZodiacBadge, PoliceBadge, 
    DoctorBadge, ChefBadge, SpyBadge, FootballBadge, BasketballBadge, 
    AstronautBadge, GsBadge, FbBadge, BjkBadge,
    LetterABadge, LetterBBadge, LetterCBadge, LetterCcBadge, LetterDBadge, LetterEBadge,
    LetterFBadge, LetterGBadge, LetterGgBadge, LetterHBadge, LetterIBadge, LetterIiBadge,
    LetterJBadge, LetterKBadge, LetterLBadge, LetterMBadge, LetterNBadge, LetterOBadge,
    LetterOoBadge, LetterPBadge, LetterRBadge, LetterSBadge, LetterSsBadge, LetterTBadge,
    LetterUBadge, LetterUuBadge, LetterVBadge, LetterYBadge, LetterZBadge
} from '@/components/icons';

// Mevcut SHOP_ITEMS tanımınız buraya gelecek
export const SHOP_ITEMS: ShopItem[] = [
    // Frames
    {
        id: 'frame_rainbow',
        name: 'Gökkuşağı Sınırı',
        price: 1000,
        type: 'avatarFrame',
        assetUrl: 'conic-gradient(from 180deg at 50% 50%, red, yellow, lime, aqua, blue, magenta, red)',
        description: 'Profilinize renk katın.',
    },
    {
        id: 'frame_gold',
        name: 'Altın Çerçeve',
        price: 2500,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #f7971e, #ffd200)',
        description: 'Prestijinizi gösterin.',
    },
     {
        id: 'frame_fire',
        name: 'Alev Çerçevesi',
        price: 1200,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #ff416c, #ff4b2b)',
        description: 'Ateşli bir ruh için.',
    },
    {
        id: 'frame_ocean',
        name: 'Okyanus Esintisi',
        price: 750,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #136a8a, #267871)',
        description: 'Sakin ve ferahlatıcı bir dokunuş.',
    },
    {
        id: 'frame_forest',
        name: 'Orman Yeşili',
        price: 750,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #134e5e, #71b280)',
        description: 'Doğayla iç içe bir görünüm.',
    },
     {
        id: 'frame_galaxy_purple',
        name: 'Mor Galaksi',
        price: 1500,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #480048, #C04848)',
        description: 'Evrenin gizemini taşıyın.',
    },
    {
        id: 'frame_sunrise',
        name: 'Gündoğumu',
        price: 900,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #F37335, #FDC830)',
        description: 'Her güne yeni bir başlangıç.',
    },
     {
        id: 'frame_candy',
        name: 'Şeker Dükkanı',
        price: 800,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #a8ff78, #78ffd6)',
        description: 'Tatlı ve eğlenceli bir görünüm.',
    },
    {
        id: 'frame_techno',
        name: 'Tekno Devre',
        price: 1800,
        type: 'avatarFrame',
        assetUrl: 'repeating-linear-gradient(45deg, #00ffff, #00ffff 2px, transparent 2px, transparent 10px), repeating-linear-gradient(-45deg, #00ffff, #00ffff 2px, transparent 2px, transparent 10px)',
        description: 'Dijital bir dokunuş.',
    },
     {
        id: 'frame_comic',
        name: 'Çizgi Roman',
        price: 1300,
        type: 'avatarFrame',
        assetUrl: 'radial-gradient(circle, #facc15 10%, transparent 10%), radial-gradient(circle, #facc15 10%, transparent 10%) 5px 5px, linear-gradient(#ef4444 2px, transparent 2px) 0 -1px, linear-gradient(90deg, #ef4444 2px, transparent 2px) -1px 0',
        description: 'Süper kahramanlar gibi.',
    },
    {
        id: 'frame_leaves',
        name: 'Sarmaşık Yapraklar',
        price: 1100,
        type: 'avatarFrame',
        assetUrl: 'repeating-conic-gradient(#22c55e 0% 15%, #16a34a 15% 30%)',
        description: 'Doğal ve taze bir his.',
    },
    // Team Frames
    {
        id: 'frame_gs',
        name: 'Cimbom Ruhu Çerçevesi',
        price: 1905,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #FDB913 50%, #C10E21 50%)',
        description: 'Sarı kırmızı renklerle desteğini göster.',
    },
    {
        id: 'frame_fb',
        name: 'Kanarya Alevi Çerçevesi',
        price: 1907,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #003366 50%, #FBB03B 50%)',
        description: 'Sarı lacivert renklerle takımını temsil et.',
    },
    {
        id: 'frame_bjk',
        name: 'Kara Kartal Pençesi Çerçevesi',
        price: 1903,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #000000 50%, #FFFFFF 50%)',
        description: 'Siyah beyaz asaletiyle fark yarat.',
    },
    
    // Badges
    { id: 'badge_flame', name: 'Alev Rozeti', price: 500, type: 'avatarBadge', description: 'İçindeki ateşi göster.', component: FlameBadge },
    { id: 'badge_snowflake', name: 'Kar Tanesi Rozeti', price: 500, type: 'avatarBadge', description: 'Serin ve eşsiz.', component: SnowflakeBadge },
    { id: 'badge_crown', name: 'Taç Rozeti', price: 5000, type: 'avatarBadge', description: 'Krallara layık.', component: CrownBadge },
    { id: 'badge_shield', name: 'Kalkan Rozeti', price: 750, type: 'avatarBadge', description: 'Savunma ustası.', component: ShieldBadge },
    { id: 'badge_bolt', name: 'Yıldırım Rozeti', price: 800, type: 'avatarBadge', description: 'Hız ve güç.', component: BoltBadge },
    { id: 'badge_star', name: 'Yıldız Rozeti', price: 1000, type: 'avatarBadge', description: 'Her zaman parla.', component: StarBadge },
    { id: 'badge_brain', name: 'Beyin Rozeti', price: 1500, type: 'avatarBadge', description: 'Zeka ve bilgi.', component: BrainBadge },
    { id: 'badge_heart', name: 'Kalp Rozeti', price: 600, type: 'avatarBadge', description: 'Sevgi ve şefkat.', component: HeartBadge },
    { id: 'badge_book', name: 'Kitap Rozeti', price: 1100, type: 'avatarBadge', description: 'Bilgelik ve öğrenme.', component: BookBadge },
    { id: 'badge_gamepad', name: 'Oyun Kolu Rozeti', price: 900, type: 'avatarBadge', description: 'Oyun tutkunları için.', component: GamepadBadge },
    { id: 'badge_music', name: 'Müzik Notası Rozeti', price: 700, type: 'avatarBadge', description: 'Ritmi hisset.', component: MusicBadge },
    { id: 'badge_atom', name: 'Atom Rozeti', price: 1600, type: 'avatarBadge', description: 'Bilimin gücü.', component: AtomBadge },
    { id: 'badge_dj', name: 'DJ Kulaklığı Rozeti', price: 1200, type: 'avatarBadge', description: 'Müziğin kontrolü sende.', component: DjBadge },
    { id: 'badge_infinity', name: 'Sonsuzluk Rozeti', price: 3000, type: 'avatarBadge', description: 'Sınırları aş.', component: InfinityBadge },
    { id: 'badge_pixel_heart', name: 'Piksel Kalp Rozeti', price: 650, type: 'avatarBadge', description: 'Nostaljik sevgi.', component: PixelHeartBadge },
    { id: 'badge_hilal', name: 'Hilal Rozeti', price: 1500, type: 'avatarBadge', description: 'Manevi bir dokunuş.', component: HilalBadge },
    { id: 'badge_kabe', name: 'Kabe Rozeti', price: 2000, type: 'avatarBadge', description: 'Kutsal bir sembol.', component: KabeBadge },
    { id: 'badge_cami', name: 'Cami Rozeti', price: 1800, type: 'avatarBadge', description: 'İslam mimarisi.', component: CamiBadge },
    { id: 'badge_tesbih', name: 'Tesbih Rozeti', price: 900, type: 'avatarBadge', description: 'Sabır ve zikir.', component: TesbihBadge },
    { id: 'badge_graduation_cap', name: 'Mezuniyet Kep Rozeti', price: 2000, type: 'avatarBadge', description: 'Başarının sembolü.', component: GraduationCapBadge },
    { id: 'badge_lightbulb', name: 'Ampul Rozeti', price: 1300, type: 'avatarBadge', description: 'Harika bir fikir!', component: LightbulbBadge },
    { id: 'badge_pencil', name: 'Kalem Rozeti', price: 400, type: 'avatarBadge', description: 'Yaratıcılığın başlangıcı.', component: PencilBadge },
    { id: 'badge_telescope', name: 'Teleskop Rozeti', price: 1700, type: 'avatarBadge', description: 'Ufukları keşfet.', component: TelescopeBadge },
    { id: 'badge_compass', name: 'Pusula Rozeti', price: 1300, type: 'avatarBadge', description: 'Yolunu bul.', component: CompassBadge },
    { id: 'badge_zodiac', name: 'Zodyak Rozeti', price: 1400, type: 'avatarBadge', description: 'Kozmik enerji.', component: ZodiacBadge },
    { id: 'badge_police', name: 'Polis Rozeti', price: 1200, type: 'avatarBadge', description: 'Adalet ve düzen.', component: PoliceBadge },
    { id: 'badge_doctor', name: 'Doktor Rozeti', price: 1200, type: 'avatarBadge', description: 'Şifa ve sağlık.', component: DoctorBadge },
    { id: 'badge_chef', name: 'Şef Rozeti', price: 900, type: 'avatarBadge', description: 'Lezzet ustası.', component: ChefBadge },
    { id: 'badge_spy', name: 'Ajan Rozeti', price: 1600, type: 'avatarBadge', description: 'Gizem ve macera.', component: SpyBadge },
    { id: 'badge_football', name: 'Futbol Topu Rozeti', price: 700, type: 'avatarBadge', description: 'Saha hakimiyeti.', component: FootballBadge },
    { id: 'badge_basketball', name: 'Basketbol Topu Rozeti', price: 700, type: 'avatarBadge', description: 'Pota kralı.', component: BasketballBadge },
    { id: 'badge_astronaut', name: 'Astronot Rozeti', price: 1800, type: 'avatarBadge', description: 'Uzay kaşifi.', component: AstronautBadge },
    { id: 'badge_gs', name: 'Aslan Rozeti', price: 1905, type: 'avatarBadge', description: 'Galatasaray taraftarı.', component: GsBadge },
    { id: 'badge_fb', name: 'Kanarya Rozeti', price: 1907, type: 'avatarBadge', description: 'Fenerbahçe taraftarı.', component: FbBadge },
    { id: 'badge_bjk', name: 'Kara Kartal Rozeti', price: 1903, type: 'avatarBadge', description: 'Beşiktaş taraftarı.', component: BjkBadge },
    
    // Harf Rozetleri
    { id: 'badge_letter_a', name: 'Harf Rozeti - A', price: 300, type: 'avatarBadge', description: 'Profilini A harfiyle süsle.', component: LetterABadge },
    { id: 'badge_letter_b', name: 'Harf Rozeti - B', price: 300, type: 'avatarBadge', description: 'Profilini B harfiyle süsle.', component: LetterBBadge },
    { id: 'badge_letter_c', name: 'Harf Rozeti - C', price: 300, type: 'avatarBadge', description: 'Profilini C harfiyle süsle.', component: LetterCBadge },
    { id: 'badge_letter_cc', name: 'Harf Rozeti - Ç', price: 300, type: 'avatarBadge', description: 'Profilini Ç harfiyle süsle.', component: LetterCcBadge },
    { id: 'badge_letter_d', name: 'Harf Rozeti - D', price: 300, type: 'avatarBadge', description: 'Profilini D harfiyle süsle.', component: LetterDBadge },
    { id: 'badge_letter_e', name: 'Harf Rozeti - E', price: 300, type: 'avatarBadge', description: 'Profilini E harfiyle süsle.', component: LetterEBadge },
    { id: 'badge_letter_f', name: 'Harf Rozeti - F', price: 300, type: 'avatarBadge', description: 'Profilini F harfiyle süsle.', component: LetterFBadge },
    { id: 'badge_letter_g', name: 'Harf Rozeti - G', price: 300, type: 'avatarBadge', description: 'Profilini G harfiyle süsle.', component: LetterGBadge },
    { id: 'badge_letter_gg', name: 'Harf Rozeti - Ğ', price: 300, type: 'avatarBadge', description: 'Profilini Ğ harfiyle süsle.', component: LetterGgBadge },
    { id: 'badge_letter_h', name: 'Harf Rozeti - H', price: 300, type: 'avatarBadge', description: 'Profilini H harfiyle süsle.', component: LetterHBadge },
    { id: 'badge_letter_i', name: 'Harf Rozeti - I', price: 300, type: 'avatarBadge', description: 'Profilini I harfiyle süsle.', component: LetterIBadge },
    { id: 'badge_letter_ii', name: 'Harf Rozeti - İ', price: 300, type: 'avatarBadge', description: 'Profilini İ harfiyle süsle.', component: LetterIiBadge },
    { id: 'badge_letter_j', name: 'Harf Rozeti - J', price: 300, type: 'avatarBadge', description: 'Profilini J harfiyle süsle.', component: LetterJBadge },
    { id: 'badge_letter_k', name: 'Harf Rozeti - K', price: 300, type: 'avatarBadge', description: 'Profilini K harfiyle süsle.', component: LetterKBadge },
    { id: 'badge_letter_l', name: 'Harf Rozeti - L', price: 300, type: 'avatarBadge', description: 'Profilini L harfiyle süsle.', component: LetterLBadge },
    { id: 'badge_letter_m', name: 'Harf Rozeti - M', price: 300, type: 'avatarBadge', description: 'Profilini M harfiyle süsle.', component: LetterMBadge },
    { id: 'badge_letter_n', name: 'Harf Rozeti - N', price: 300, type: 'avatarBadge', description: 'Profilini N harfiyle süsle.', component: LetterNBadge },
    { id: 'badge_letter_o', name: 'Harf Rozeti - O', price: 300, type: 'avatarBadge', description: 'Profilini O harfiyle süsle.', component: LetterOBadge },
    { id: 'badge_letter_oo', name: 'Harf Rozeti - Ö', price: 300, type: 'avatarBadge', description: 'Profilini Ö harfiyle süsle.', component: LetterOoBadge },
    { id: 'badge_letter_p', name: 'Harf Rozeti - P', price: 300, type: 'avatarBadge', description: 'Profilini P harfiyle süsle.', component: LetterPBadge },
    { id: 'badge_letter_r', name: 'Harf Rozeti - R', price: 300, type: 'avatarBadge', description: 'Profilini R harfiyle süsle.', component: LetterRBadge },
    { id: 'badge_letter_s', name: 'Harf Rozeti - S', price: 300, type: 'avatarBadge', description: 'Profilini S harfiyle süsle.', component: LetterSBadge },
    { id: 'badge_letter_ss', name: 'Harf Rozeti - Ş', price: 300, type: 'avatarBadge', description: 'Profilini Ş harfiyle süsle.', component: LetterSsBadge },
    { id: 'badge_letter_t', name: 'Harf Rozeti - T', price: 300, type: 'avatarBadge', description: 'Profilini T harfiyle süsle.', component: LetterTBadge },
    { id: 'badge_letter_u', name: 'Harf Rozeti - U', price: 300, type: 'avatarBadge', description: 'Profilini U harfiyle süsle.', component: LetterUBadge },
    { id: 'badge_letter_uu', name: 'Harf Rozeti - Ü', price: 300, type: 'avatarBadge', description: 'Profilini Ü harfiyle süsle.', component: LetterUuBadge },
    { id: 'badge_letter_v', name: 'Harf Rozeti - V', price: 300, type: 'avatarBadge', description: 'Profilini V harfiyle süsle.', component: LetterVBadge },
    { id: 'badge_letter_y', name: 'Harf Rozeti - Y', price: 300, type: 'avatarBadge', description: 'Profilini Y harfiyle süsle.', component: LetterYBadge },
    { id: 'badge_letter_z', name: 'Harf Rozeti - Z', price: 300, type: 'avatarBadge', description: 'Profilini Z harfiyle süsle.', component: LetterZBadge },
];
```
- next.config.mjs:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

```
- package-lock.json:
```json
{
  "name": "next-app",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "next-app",
      "version": "0.1.0",
      "dependencies": {
        "next": "14.2.5",
        "react": "^18",
        "react-dom": "^18"
      },
      "devDependencies": {
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        "postcss": "^8",
        "tailwindcss": "^3.4.1",
        "typescript": "^5"
      }
    }
  }
}
```
