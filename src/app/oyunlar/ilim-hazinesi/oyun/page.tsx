
'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
// EKLENDİ: XOctagon ikonu import edildi
import { Lightbulb, RefreshCw, ChevronRight, Star, BookOpen, Loader2, AlertTriangle, Home, PartyPopper, Repeat, ArrowLeft, Hexagon, Sparkles, Trophy, XOctagon } from 'lucide-react';
import { getIlimHazinesiAction, submitIlimHazinesiScoreAction, type IlimHazinesiLevel } from '../actions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { playSound } from '@/lib/audio-service';

// Harf Renk Paleti
const LETTER_COLORS = [
    'bg-indigo-500 border-indigo-700 text-white hover:bg-indigo-400',
    'bg-rose-500 border-rose-700 text-white hover:bg-rose-400',
    'bg-cyan-500 border-cyan-700 text-slate-900 hover:bg-cyan-400',
    'bg-amber-500 border-amber-700 text-slate-900 hover:bg-amber-400',
    'bg-emerald-500 border-emerald-700 text-white hover:bg-emerald-400',
    'bg-purple-500 border-purple-700 text-white hover:bg-purple-400',
    'bg-pink-500 border-pink-700 text-white hover:bg-pink-400',
    'bg-lime-500 border-lime-700 text-slate-900 hover:bg-lime-400',
];

function GameComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const mainContentRef = useRef<HTMLDivElement>(null);

    const [levels, setLevels] = useState<IlimHazinesiLevel[]>([]);
    const [levelIndex, setLevelIndex] = useState(0);
    
    const [currentSelection, setCurrentSelection] = useState<number[]>([]); 
    const [isTouching, setIsTouching] = useState(false);
    const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
    const [score, setScore] = useState(0);
    const [showInfo, setShowInfo] = useState(false);
    
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const wheelRef = useRef<HTMLDivElement>(null);
    
    const currentLevel = levels[levelIndex];
    const gameContext = `İlim Hazinesi - ${searchParams.get('topicName') || 'Genel'}`;

    const initLevel = useCallback(() => {
        if (!levels || levels.length === 0 || levelIndex >= levels.length) return;
        
        const current = levels[levelIndex];
        const letters = current.mainWord.replace(/\s/g, '').split('');
        const mixed = [...letters].sort(() => Math.random() - 0.5);
        
        setShuffledLetters(mixed);
        setCurrentSelection([]);
        setShowInfo(false);
    }, [levelIndex, levels]);
    
    useEffect(() => {
        const fetchGameData = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getIlimHazinesiAction(params);
            if (result.error || !result.levels || result.levels.length === 0) {
                setError(result.error || "Bu konu için uygun oyun verisi bulunamadı.");
            } else {
                setLevels(result.levels);
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams]);

    useEffect(() => {
        if (levels.length > 0) {
            initLevel();
        }
    }, [levelIndex, levels, initLevel]);

    const shuffleCurrent = () => {
        setShuffledLetters(prev => [...prev].sort(() => Math.random() - 0.5));
        playSound('pop');
    };

    const useHint = () => {
        if (!currentLevel) return;
        if (score >= 50) {
            setScore(s => s - 50);
            toast({ title: 'İpucu', description: `Kelimenin ilk harfi: ${currentLevel.mainWord.replace(/\s/g, '')[0]}` });
        } else {
            toast({ title: 'Yetersiz Puan', description: 'İpucu için 50 puan gerekli.', variant: "destructive" });
        }
    };

    const getLetterPosition = (index: number, total: number) => {
        const radius = 120; 
        const angle = (index * (360 / total)) - 90;
        const radian = (angle * Math.PI) / 180;
        const x = radius * Math.cos(radian);
        const y = radius * Math.sin(radian);
        return { x, y };
    };

    const handleStart = (index: number, e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsTouching(true);
        if (!currentSelection.includes(index)) {
            setCurrentSelection([index]);
            playSound('pop');
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isTouching) return;
        
        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
        
        const element = document.elementFromPoint(clientX, clientY);
        if (element && (element as HTMLElement).dataset.index) {
            const index = parseInt((element as HTMLElement).dataset.index as string);
            
            if (!currentSelection.includes(index)) {
                setCurrentSelection(prev => [...prev, index]);
                playSound('pop');
            } 
            else if (currentSelection.length > 1 && currentSelection[currentSelection.length - 2] === index) {
                setCurrentSelection(prev => prev.slice(0, -1));
            }
        }
    };

    const handleEnd = () => {
        setIsTouching(false);
        checkWord();
        setCurrentSelection([]);
    };

    const checkWord = () => {
        if (!currentLevel || currentSelection.length === 0) return;
        
        const formedWord = currentSelection.map(idx => shuffledLetters[idx]).join("");
        const targetWord = currentLevel.mainWord.replace(/\s/g, '');

        if (formedWord === targetWord) {
            playSound('correct');
            setScore(prev => prev + 100);
            setTimeout(() => setShowInfo(true), 300);
        } else {
            if (formedWord.length > 1) {
                playSound('incorrect');
            }
        }
    };
    
    const handleSaveAndExit = async () => {
        if (!user || score === 0 || isSaving) {
            router.push('/oyunlar/ilim-hazinesi');
            return;
        }
        setIsSaving(true);
        const result = await submitIlimHazinesiScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
            router.push('/oyunlar/ilim-hazinesi');
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    }

    const nextLevel = () => {
        if (levelIndex < levels.length - 1) {
            setLevelIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    };

    const currentWordString = currentSelection.map(idx => shuffledLetters[idx]).join("");
    
    // --- RENDER ---

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-fuchsia-500" /></div>;

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <Alert variant="destructive" className="max-w-lg bg-slate-900 border-red-500/30 text-center">
                    <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <AlertTitle className="text-xl text-white font-bold mb-2">Hata</AlertTitle>
                    <AlertDescription className="text-slate-400 mb-6">{error}</AlertDescription>
                     <Button asChild variant="secondary" className="w-full bg-slate-800 text-white hover:bg-slate-700 border-white/10">
                        <Link href="/oyunlar/ilim-hazinesi">Geri Dön</Link>
                    </Button>
                </Alert>
            </div>
        );
    }
    
    if (isFinished) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden pb-24 md:pb-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-slate-950 to-slate-950" />
                <div className="relative z-10 w-full max-w-md text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
                        <PartyPopper className="w-32 h-32 text-amber-400 mx-auto drop-shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-bounce" />
                    </div>
                    
                    <div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2">TEBRİKLER!</h1>
                        <p className="text-slate-400 text-lg">İlim Hazinesini Tamamladın</p>
                    </div>

                    <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">TOPLAM PUAN</span>
                        <div className="text-7xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                            {score}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Button onClick={handleSaveAndExit} size="lg" disabled={isSaving || score === 0} className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 shadow-lg transition-all hover:scale-[1.02]">
                            {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin"/> : <Star className="mr-2 h-6 w-6 fill-current"/>} 
                            KAYDET VE ÇIK
                        </Button>
                        <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-14 border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-2xl">
                            <Repeat className="mr-2 h-5 w-5"/> Tekrar Oyna
                        </Button>
                    </div>
                </div>
            </div>
        )
    }
    
    if (!currentLevel) return null;

    const targetWords = currentLevel.mainWord.split(' ');

    return (
        <div 
            ref={mainContentRef}
            className="min-h-screen bg-slate-950 text-white flex flex-col items-center overflow-hidden relative select-none touch-none"
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* --- HUD --- */}
            <div className="w-full relative z-20 bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                            <Link href="/oyunlar/ilim-hazinesi"><ArrowLeft className="h-6 w-6" /></Link>
                        </Button>
                        <div>
                            <h1 className="font-bold text-lg text-white leading-tight">İlim Hazinesi</h1>
                            <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-wider">SEVİYE {levelIndex + 1}/{levels.length}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <Button 
                            onClick={() => setIsFinished(true)}
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
            <div className="relative flex-grow flex flex-col justify-center items-center w-full max-w-4xl z-10 pb-12">
                
                <div className="h-24 flex items-center justify-center gap-4 mb-8">
                    {targetWords.map((word, wordIndex) => (
                        <div key={wordIndex} className="flex gap-2">
                            {word.split('').map((char, charIndex) => {
                                const overallIndex = targetWords.slice(0, wordIndex).join('').length + charIndex;
                                const letterObj = constructedLetters[overallIndex];
                                return (
                                    <div 
                                        key={`${wordIndex}-${charIndex}`}
                                        className={cn(
                                            "w-16 h-20 md:w-20 md:h-24 rounded-xl flex items-center justify-center text-4xl md:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-fuchsia-200 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all duration-150",
                                            currentWordString.length > overallIndex ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4"
                                        )}
                                    >
                                        {currentWordString.length > overallIndex ? currentWordString[overallIndex] : ''}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div 
                    ref={wheelRef}
                    className="relative w-[340px] h-[340px] md:w-[400px] md:h-[400px] bg-slate-900/40 backdrop-blur-sm rounded-full border border-white/10 shadow-[0_0_60px_rgba(192,132,252,0.15)] flex items-center justify-center"
                >
                    <div className="absolute -top-24 left-0 right-0 flex justify-center gap-16 w-full z-20 pointer-events-auto">
                        <button onClick={shuffleCurrent} className="group p-4 rounded-full bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white hover:bg-fuchsia-500 hover:border-fuchsia-400 transition-all duration-300 shadow-lg">
                            <RefreshCw className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                        <button onClick={useHint} className="group p-4 rounded-full bg-slate-800/80 border border-white/10 text-slate-300 hover:text-yellow-900 hover:bg-yellow-400 hover:border-yellow-300 transition-all duration-300 shadow-lg">
                            <Lightbulb className="h-6 w-6 group-hover:animate-pulse" />
                        </button>
                    </div>

                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible filter drop-shadow-[0_0_10px_rgba(217,70,239,0.8)]">
                        {currentSelection.length > 0 && isTouching && (
                            <path 
                                d={`M ${currentSelection.map((idx) => {
                                    const pos = getLetterPosition(idx, shuffledLetters.length);
                                    const center = (wheelRef.current?.offsetWidth || 340) / 2;
                                    return `${center + pos.x} ${center + pos.y}`;
                                }).join(' L ')}`}
                                fill="none"
                                stroke="#d946ef" 
                                strokeWidth="10" 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="animate-pulse"
                            />
                        )}
                    </svg>

                    {shuffledLetters.map((char, i) => {
                        const pos = getLetterPosition(i, shuffledLetters.length);
                        const isSelected = currentSelection.includes(i);
                        const colorClass = LETTER_COLORS[i % LETTER_COLORS.length];
                        
                        return (
                            <div
                                key={i}
                                data-index={i}
                                onMouseDown={(e) => handleStart(i, e)}
                                onTouchStart={(e) => handleStart(i, e)}
                                className={cn(
                                    `absolute w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl font-black cursor-pointer shadow-xl transition-all duration-150 z-10 select-none border-b-[6px] active:border-b-0 active:translate-y-2`,
                                    isSelected 
                                        ? 'bg-fuchsia-500 border-fuchsia-700 text-white scale-110 shadow-[0_0_30px_rgba(217,70,239,0.8)] z-20' 
                                        : colorClass 
                                )}
                                style={{ 
                                    left: '50%', 
                                    top: '50%', 
                                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` 
                                }}
                            >
                                {char}
                            </div>
                        );
                    })}
                </div>
            </div>

            {showInfo && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative bg-slate-900 border-2 border-emerald-500/50 p-8 md:p-10 rounded-[2rem] max-w-lg w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
                        
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/20 rounded-full blur-[80px]" />

                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-4 ring-emerald-500/10">
                                <Sparkles className="w-12 h-12 text-emerald-400" />
                            </div>
                            
                            <h2 className="text-lg font-bold text-emerald-400 mb-2 uppercase tracking-widest">DOĞRU BİLDİNİZ!</h2>
                            <h3 className="text-4xl md:text-5xl font-black text-white mb-8 drop-shadow-lg">{currentLevel.mainWord}</h3>
                            
                            <div className="bg-black/40 p-6 rounded-2xl border border-white/10 mb-8 text-slate-200 text-lg md:text-xl leading-relaxed font-medium">
                                {currentLevel.info}
                            </div>
                            
                            <button 
                                onClick={nextLevel}
                                className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/30 transition-all transform hover:scale-[1.02] active:scale-95"
                            >
                                Sıradaki Kavram <ChevronRight className="stroke-[3px] w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function IlimHazinesiPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-fuchsia-500" /></div>}>
            <GameComponent />
        </Suspense>
    )
}
