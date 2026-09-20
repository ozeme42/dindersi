'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lightbulb, RefreshCw, ChevronRight, Loader2, AlertTriangle, Sparkles, ChevronLeft } from 'lucide-react';
import { getIlimHazinesiAction, submitIlimHazinesiScoreAction, type IlimHazinesiLevel } from '../actions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import { getGameBackUrl } from '@/lib/game-navigation';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';

const LETTER_COLORS = [
    'bg-indigo-600 border-indigo-400 text-white',
    'bg-rose-600 border-rose-400 text-white',
    'bg-sky-600 border-sky-400 text-white',
    'bg-amber-600 border-amber-400 text-white',
    'bg-emerald-600 border-emerald-400 text-white',
    'bg-purple-600 border-purple-400 text-white',
    'bg-pink-600 border-pink-400 text-white',
    'bg-teal-600 border-teal-400 text-white',
];

function IlimHazinesiBoard({
    currentLevel,
    targetWords,
    shuffledLetters,
    currentSelection,
    isTouching,
    handleStart,
    handleMove,
    handleEnd,
    shuffleCurrent,
    useHint,
    hintIndex,
    currentWordString,
    showInfo,
    nextLevel,
}: {
    currentLevel: IlimHazinesiLevel;
    targetWords: string[];
    shuffledLetters: string[];
    currentSelection: number[];
    isTouching: boolean;
    handleStart: (index: number, e: React.MouseEvent | React.TouchEvent) => void;
    handleMove: (e: React.MouseEvent | React.TouchEvent) => void;
    handleEnd: () => void;
    shuffleCurrent: () => void;
    useHint: () => void;
    hintIndex: number;
    currentWordString: string;
    showInfo: boolean;
    nextLevel: () => void;
}) {
    const { theme } = useWordwall();
    const wheelRef = useRef<HTMLDivElement>(null);

    const getLetterPosition = (index: number, total: number) => {
        const radius = 110; 
        const angle = (index * (360 / total)) - 90;
        const radian = (angle * Math.PI) / 180;
        const x = radius * Math.cos(radian);
        const y = radius * Math.sin(radian);
        return { x, y };
    };

    return (
        <div 
            className="w-full h-full flex flex-col items-center justify-between min-h-0 overflow-hidden relative select-none touch-none p-2 sm:p-4"
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            {/* HEDEF HARF KUTULARI */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 overflow-y-auto py-2">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 px-2 w-full max-w-2xl">
                    {targetWords.map((word, wordIndex) => (
                        <div key={wordIndex} className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                            {word.split('').map((char, charIndex) => {
                                const overallIndex = targetWords.slice(0, wordIndex).join('').length + charIndex;
                                const isHintRevealed = overallIndex < hintIndex;
                                const userInputChar = currentWordString.length > overallIndex ? currentWordString[overallIndex] : '';

                                return (
                                    <div 
                                        key={`${wordIndex}-${charIndex}`}
                                        className={cn(
                                            "w-10 h-12 sm:w-14 sm:h-16 md:w-16 md:h-20 rounded-xl border-2 flex items-center justify-center text-xl sm:text-3xl md:text-4xl font-black transition-all duration-200 shadow-md",
                                            (userInputChar || isHintRevealed) 
                                                ? cn(theme.buttonSelected, "scale-105") 
                                                : cn(theme.cardBg, theme.cardBorder, "opacity-40 text-transparent")
                                        )}
                                    >
                                        {isHintRevealed ? char : userInputChar}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* KONTROL BUTONLARI: KARIŞTIR & İPUCU */}
            <div className="flex items-center justify-center gap-8 w-full py-2 shrink-0 z-30">
                <button 
                    onClick={shuffleCurrent} 
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 hover:scale-105",
                        theme.buttonIdle,
                        theme.cardText,
                        theme.cardBorder
                    )}
                >
                    <RefreshCw className="h-4 w-4" />
                    <span>Karıştır</span>
                </button>

                <button 
                    onClick={useHint} 
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 hover:scale-105",
                        theme.buttonIdle,
                        theme.cardText,
                        theme.cardBorder
                    )}
                >
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    <span>İpucu (-5)</span>
                </button>
            </div>

            {/* HARF ÇARKI (DİREKSİYON) */}
            <div 
                ref={wheelRef}
                className={cn(
                    "relative w-[270px] h-[270px] sm:w-[320px] sm:h-[320px] rounded-full border-2 shadow-2xl flex items-center justify-center shrink-0 mb-2",
                    theme.cardBg,
                    theme.cardBorder
                )}
            >
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible filter drop-shadow-md">
                    {currentSelection.length > 0 && isTouching && (
                        <path 
                            d={`M ${currentSelection.map((idx) => {
                                const pos = getLetterPosition(idx, shuffledLetters.length);
                                const center = (wheelRef.current?.offsetWidth || 270) / 2;
                                return `${center + pos.x} ${center + pos.y}`;
                            }).join(' L ')}`}
                            fill="none"
                            stroke="#f59e0b" 
                            strokeWidth="8" 
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
                                "absolute w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl font-black cursor-pointer shadow-lg transition-all duration-150 z-10 select-none border-2 active:scale-95",
                                isSelected 
                                    ? "bg-amber-500 border-amber-300 text-slate-950 scale-110 shadow-amber-500/50 z-20" 
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

            {/* DOĞRU BİLDİNİZ MODALI */}
            {showInfo && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className={cn("relative p-6 sm:p-8 rounded-2xl border-2 shadow-2xl max-w-lg w-full text-center animate-in zoom-in-95 duration-200", theme.cardBg, theme.cardBorder, theme.cardText)}>
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/40">
                            <Sparkles className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-1">DOĞRU BİLDİNİZ!</h2>
                        <h3 className="text-2xl sm:text-4xl font-black mb-4">{currentLevel.mainWord}</h3>
                        <div className={cn("p-4 rounded-xl border mb-6 text-sm sm:text-base leading-relaxed text-left", theme.subPanelBg, theme.cardBorder)}>
                            {currentLevel.info}
                        </div>
                        <Button 
                            onClick={nextLevel}
                            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                        >
                            Sıradaki Kavram <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function GameComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();

    const [levels, setLevels] = useState<IlimHazinesiLevel[]>([]);
    const [levelIndex, setLevelIndex] = useState(0);
    
    const [currentSelection, setCurrentSelection] = useState<number[]>([]); 
    const [isTouching, setIsTouching] = useState(false);
    const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
    const [score, setScore] = useState(0); 
    const [showInfo, setShowInfo] = useState(false);
    
    const [hintIndex, setHintIndex] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const topicName = searchParams.get('topicName') || searchParams.get('title') || undefined;
    const isMission = mode === 'mission';
    
    const currentLevel = levels[levelIndex];
    const gameContext = `İlim Hazinesi - ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/ilim-hazinesi' });

    const initLevel = useCallback(() => {
        if (!levels || levels.length === 0 || levelIndex >= levels.length) return;
        
        const current = levels[levelIndex];
        const letters = current.mainWord.replace(/\s/g, '').split('');
        const mixed = [...letters].sort(() => Math.random() - 0.5);
        
        setShuffledLetters(mixed);
        setCurrentSelection([]);
        setShowInfo(false);
        setHintIndex(0); 
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
        const targetWord = currentLevel.mainWord.replace(/\s/g, '');
        if (hintIndex >= targetWord.length) {
            toast({ title: "Bilgi", description: "Tüm harfler zaten açık." });
            return;
        }
        const nextChar = targetWord[hintIndex];
        setScore(prev => Math.max(0, prev - 5));
        toast({ 
            title: `İpucu (${hintIndex + 1}. Harf)`, 
            description: <div className="text-2xl font-black text-center mt-2">{nextChar}</div> 
        });
        setHintIndex(prev => prev + 1);
        playSound('hint'); 
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
            const wordScore = targetWord.length * 5;
            setScore(prev => prev + wordScore);
            setTimeout(() => setShowInfo(true), 300);
        } else {
            if (formedWord.length > 1) {
                playSound('incorrect');
            }
        }
    };
    
    const isSuccess = levelIndex === levels.length - 1 && showInfo; 

    const handleSaveAndExit = async () => {
        if (!user || isSaving || isScoreSaved) {
            router.push(backUrl);
            return;
        }
        
        setIsSaving(true);
        try {
            if (isMission && topicId) {
                const batch = writeBatch(db);

                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: score,
                    context: topicId,
                    gameType: 'ilim-hazinesi',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isSuccess
                });

                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(score)
                });

                await batch.commit();

                if (isSuccess) {
                    toast({ title: "Görev Başarılı!", description: "Tebrikler, tüm hazineleri topladın ve puanın kaydedildi." });
                } else {
                    toast({ title: "Puan Kaydedildi", description: "Ancak görev tamamlanmadı." });
                }
            } else {
                const result = await submitIlimHazinesiScoreAction(user.uid, score, gameContext);
                if (result.success) {
                    toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
                } else {
                    toast({ title: "Hata", description: result.error, variant: "destructive" });
                }
            }
            setIsScoreSaved(true);
        } catch (err) {
            console.error(err);
            toast({ title: "Hata", description: "Bir bağlantı hatası oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const nextLevel = () => {
        if (levelIndex < levels.length - 1) {
            setLevelIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
            playSound('win');
        }
    };

    const handleRestart = () => {
        setLevelIndex(0);
        setScore(0);
        setIsFinished(false);
        setIsScoreSaved(false);
        setIsSaving(false);
        setLevels(prev => [...prev].sort(() => Math.random() - 0.5));
    };

    const currentWordString = currentSelection.map(idx => shuffledLetters[idx]).join("");

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-14 w-14 animate-spin text-fuchsia-500" /></div>;

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <Alert variant="destructive" className="max-w-lg bg-slate-900 border-red-500/30 text-center">
                    <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <AlertTitle className="text-xl text-white font-bold mb-2">Hata</AlertTitle>
                    <AlertDescription className="text-slate-400 mb-6">{error}</AlertDescription>
                    <Button asChild variant="secondary" className="w-full bg-slate-800 text-white hover:bg-slate-700 border-white/10">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </Alert>
            </div>
        );
    }

    const targetWords = currentLevel ? currentLevel.mainWord.split(' ') : [];

    return (
        <WordwallShell
            title="İlim Hazinesi"
            subtitle={topicName || "Kelimeleri Birleştir, Hazineleri Aç"}
            score={score}
            currentQuestionIndex={levelIndex + 1}
            totalQuestions={levels.length}
            backUrl={backUrl}
            isFinished={isFinished}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden relative flex flex-col p-2 sm:p-4"
        >
            {isFinished ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={score}
                        onSave={user ? handleSaveAndExit : undefined}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={handleRestart}
                        backUrl={backUrl}
                        isSuccess={isSuccess}
                        isMission={isMission}
                        customMessage={
                            isMission 
                                ? (isSuccess 
                                    ? "Tebrikler! Tüm hazineleri toplayarak görevi başarıyla tamamladın." 
                                    : "Maalesef tüm sandıkları açamadın. Görevi geçmek için tüm sandıkları açmalısın.")
                                : undefined
                        }
                    />
                </div>
            ) : currentLevel ? (
                <IlimHazinesiBoard
                    currentLevel={currentLevel}
                    targetWords={targetWords}
                    shuffledLetters={shuffledLetters}
                    currentSelection={currentSelection}
                    isTouching={isTouching}
                    handleStart={handleStart}
                    handleMove={handleMove}
                    handleEnd={handleEnd}
                    shuffleCurrent={shuffleCurrent}
                    useHint={useHint}
                    hintIndex={hintIndex}
                    currentWordString={currentWordString}
                    showInfo={showInfo}
                    nextLevel={nextLevel}
                />
            ) : null}
        </WordwallShell>
    );
}

export default function IlimHazinesiPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-14 w-14 animate-spin text-fuchsia-500" /></div>}>
            <GameComponent />
        </Suspense>
    );
}