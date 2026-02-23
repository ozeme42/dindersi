'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lightbulb, RefreshCw, ChevronRight, Loader2, AlertTriangle, ArrowLeft, Sparkles, Trophy, XOctagon, CheckCircle, RotateCcw, Home, Save } from 'lucide-react';
import { getIlimHazinesiAction, submitIlimHazinesiScoreAction, type IlimHazinesiLevel } from '../actions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';

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
    
    const [hintIndex, setHintIndex] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

    const wheelRef = useRef<HTMLDivElement>(null);
    
    const currentLevel = levels[levelIndex];
    const gameContext = `İlim Hazinesi - ${searchParams.get('topicName') || 'Genel'}`;

    const backUrl = useMemo(() => {
        const { courseId, unitId, topicId, courseName, unitName, topicName } = Object.fromEntries(searchParams.entries());
        if (courseId && unitId && topicId) {
             const params = new URLSearchParams({
                courseName: courseName || '',
                unitName: unitName || '',
                topicName: topicName || '',
            });
            return `/konu/${courseId}/${unitId}/${topicId}?${params.toString()}`;
        }
        return '/oyunlar/ilim-hazinesi';
    }, [searchParams]);

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
        setScore(prev => prev - 5);
        toast({ 
            title: `İpucu (${hintIndex + 1}. Harf)`, 
            description: <div className="text-2xl font-black text-center mt-2">{nextChar}</div> 
        });
        setHintIndex(prev => prev + 1);
        playSound('hint'); 
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
            // Her harf 5 puan
            const wordScore = targetWord.length * 5;
            setScore(prev => prev + wordScore);
            setTimeout(() => setShowInfo(true), 300);
        } else {
            if (formedWord.length > 1) {
                playSound('incorrect');
            }
        }
    };
    
    // TÜM BÖLÜMLER BİTTİ Mİ?
    // Başarılı sayılması için levelIndex'in sona gelmiş olması gerekir.
    const isSuccess = levelIndex === levels.length - 1 && showInfo; 

    const handleSaveAndExit = async () => {
        if (!user || isSaving || isScoreSaved) {
            // Misafir veya çıkış -> Yönlendir
            router.push(isMission ? '/student/gorevler' : backUrl);
            return;
        }
        
        setIsSaving(true);
        try {
            if (isMission && topicId) {
                // --- GÖREV MODU KAYDI (LİDERLİK TABLOSU İÇİN GÜNCELLENDİ) ---
                const batch = writeBatch(db);

                // 1. Etkinlik Kaydı (scoreEvents)
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

                // 2. Kullanıcı Profilini Güncelleme (users -> score)
                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(score)
                });

                // İşlemleri Kaydet
                await batch.commit();

                if (isSuccess) {
                    toast({ title: "Görev Başarılı!", description: "Tebrikler, tüm hazineleri topladın ve puanın kaydedildi.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi", description: "Ancak görev tamamlanmadı.", className: "bg-yellow-600 text-white" });
                }
            } else {
                // --- NORMAL MOD KAYDI ---
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
    }

    const nextLevel = () => {
        if (levelIndex < levels.length - 1) {
            setLevelIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
            setShowConfetti(true);
            playSound('win');
        }
    };

    const handleRestart = () => {
        setLevelIndex(0);
        setScore(0);
        setIsFinished(false);
        setIsScoreSaved(false);
        setIsSaving(false);
        setShowConfetti(false);
        setLevels(prev => [...prev].sort(() => Math.random() - 0.5));
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
                        <Link href={isMission ? '/student/gorevler' : backUrl}>Geri Dön</Link>
                    </Button>
                </Alert>
            </div>
        );
    }
    
    if (isFinished) {
        // GÖREV MODU BİTİŞ EKRANI (Özel Durum)
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
                                {isSuccess ? "GÖREV BAŞARILI!" : "GÖREV TAMAMLANMADI"}
                            </h2>
                            
                            <p className="text-slate-500 mb-2 font-medium">
                                {isSuccess ? "Tebrikler! Tüm hazineleri topladın." : "Tüm hazineleri toplamadan çıkış yaptın."}
                            </p>
                            <p className="text-2xl font-black text-emerald-600 mb-6">{score} PUAN</p>

                            <div className="space-y-3">
                                {/* Puan varsa ve kaydedilmemişse Kaydet Butonu */}
                                {!isScoreSaved && score > 0 && (
                                    <Button onClick={handleSaveAndExit} disabled={isSaving} className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : "Kaydet ve Devam Et"}
                                    </Button>
                                )}
                                
                                {/* Kaydedildiyse Görevlere Dön */}
                                {isScoreSaved && isSuccess && (
                                    <Button onClick={() => router.push('/student/gorevler')} className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                                        <CheckCircle className="mr-2 h-5 w-5"/> Görevlere Dön
                                    </Button>
                                )}
                                
                                {/* Tekrar Dene */}
                                {(!isSuccess || isScoreSaved) && (
                                    <Button onClick={handleRestart} variant="outline" className="w-full h-12 font-bold">
                                        <RotateCcw className="mr-2 h-4 w-4"/> Tekrar Dene
                                    </Button>
                                )}

                                <Button onClick={() => router.push(user ? '/student' : '/')} variant="ghost" className="w-full text-slate-400 hover:text-slate-600">
                                    <Home className="mr-2 h-4 w-4"/> Ana Menü
                                </Button>
                            </div>
                        </div>
                    </div>
            );
        }

        // NORMAL MOD BİTİŞ EKRANI (Bileşeni Kullanıyoruz)
        return (
            <GameEndScreen 
                score={score}
                onSave={user ? handleSaveAndExit : undefined}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={handleRestart}
                backUrl={user ? backUrl : '/'}
            />
        )
    }
    
    if (!currentLevel) return null;

    const targetWords = currentLevel.mainWord.split(' ');

    return (
        <div 
            ref={mainContentRef}
            className="h-[100dvh] bg-slate-950 text-white flex flex-col items-center overflow-hidden relative select-none touch-none"
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* --- HUD (Üst Bar) --- */}
            <div className="w-full flex-none relative z-20 bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-4 py-2">
                <div className="max-w-4xl mx-auto flex justify-between items-center h-12">
                    <div className="flex items-center gap-2">
                        {/* ÇIKIŞ BUTONU */}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsFinished(true)}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="font-bold text-sm md:text-base text-white leading-tight">İlim Hazinesi</h1>
                            <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider block">SEVİYE {levelIndex + 1}/{levels.length}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-950/50 border border-yellow-500/20 px-2.5 py-1 rounded-lg">
                            <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                            <span className="font-mono font-bold text-white text-sm">{score}</span>
                        </div>
                        <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 border-white/10 text-slate-300 hover:text-white h-8 w-8 rounded-lg" />
                        
                        {/* --- BİTİR TUŞU (Herkes için görünür) --- */}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsFinished(true)}
                            className="h-8 w-8 text-red-400 hover:text-red-200 hover:bg-red-500/10 rounded-lg border border-red-500/20"
                            title="Oyunu Bitir"
                        >
                            <XOctagon className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
            
            {/* --- OYUN ALANI --- */}
            <div className="flex-1 w-full max-w-4xl z-10 flex flex-col justify-between items-center pb-8 pt-4 px-2">
                <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 overflow-y-auto">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 px-1 w-full">
                        {targetWords.map((word, wordIndex) => (
                            <div key={wordIndex} className="flex flex-wrap justify-center gap-1">
                                {word.split('').map((char, charIndex) => {
                                    const overallIndex = targetWords.slice(0, wordIndex).join('').length + charIndex;
                                    const isHintRevealed = overallIndex < hintIndex;
                                    const userInputChar = currentWordString.length > overallIndex ? currentWordString[overallIndex] : '';

                                    return (
                                        <div 
                                            key={`${wordIndex}-${charIndex}`}
                                            className={cn(
                                                "w-9 h-11 sm:w-12 sm:h-14 md:w-16 md:h-20 rounded-md md:rounded-xl flex items-center justify-center text-xl sm:text-3xl md:text-5xl font-black transition-all duration-200",
                                                (userInputChar || isHintRevealed) 
                                                    ? "bg-gradient-to-b from-slate-800 to-slate-900 border-b-2 md:border-b-4 border-fuchsia-600/50 text-transparent bg-clip-text bg-gradient-to-r from-white to-fuchsia-200 shadow-[0_4px_12px_rgba(192,38,211,0.2)]" 
                                                    : "bg-slate-800/50 border border-slate-700/50 text-slate-700"
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

                <div className="flex items-center justify-center gap-8 w-full py-4 shrink-0 z-30">
                    <button onClick={shuffleCurrent} className="group flex flex-col items-center gap-2">
                        <div className="p-3 md:p-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 group-hover:text-white group-hover:bg-fuchsia-600 group-hover:border-fuchsia-500 transition-all duration-300 shadow-lg active:scale-95">
                            <RefreshCw className="h-5 w-5 md:h-6 md:w-6 group-hover:rotate-180 transition-transform duration-500" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-fuchsia-400 transition-colors">Karıştır</span>
                    </button>

                    <button onClick={useHint} className="group flex flex-col items-center gap-2">
                        <div className="p-3 md:p-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 group-hover:text-yellow-900 group-hover:bg-yellow-400 group-hover:border-yellow-300 transition-all duration-300 shadow-lg active:scale-95">
                            <Lightbulb className="h-5 w-5 md:h-6 md:w-6 group-hover:animate-pulse" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-yellow-400 transition-colors">İpucu (-5)</span>
                    </button>
                </div>

                <div 
                    ref={wheelRef}
                    className="relative w-[300px] h-[300px] md:w-[360px] md:h-[360px] bg-slate-900/40 backdrop-blur-sm rounded-full border border-white/5 shadow-[0_0_60px_rgba(192,132,252,0.1)] flex items-center justify-center shrink-0 mb-4"
                >
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible filter drop-shadow-[0_0_10px_rgba(217,70,239,0.8)]">
                        {currentSelection.length > 0 && isTouching && (
                            <path 
                                d={`M ${currentSelection.map((idx) => {
                                    const pos = getLetterPosition(idx, shuffledLetters.length);
                                    const center = (wheelRef.current?.offsetWidth || 300) / 2;
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
                                    `absolute w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl font-black cursor-pointer shadow-xl transition-all duration-150 z-10 select-none border-b-[4px] md:border-b-[6px] active:border-b-0 active:translate-y-2`,
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
    );
}