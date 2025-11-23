
'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lightbulb, RefreshCw, ChevronRight, Star, BookOpen, Loader2, AlertTriangle, Home, PartyPopper, Repeat, ArrowLeft } from 'lucide-react';
import { getIlimHazinesiAction, submitIlimHazinesiScoreAction, type IlimHazinesiLevel } from '../actions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

function GameComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [levels, setLevels] = useState<IlimHazinesiLevel[]>([]);
  const [levelIndex, setLevelIndex] = useState(0);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [currentSelection, setCurrentSelection] = useState<number[]>([]); // Şu an seçili harf indeksleri
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
    const letters = current.letters;
    // Harfleri karıştır (Fisher-Yates)
    const mixed = [...letters].sort(() => Math.random() - 0.5);
    setShuffledLetters(mixed);
    setFoundWords([]);
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
  };

  const useHint = () => {
    if (!currentLevel || foundWords.includes(currentLevel.mainWord)) return;
    if (score >= 50) {
        setScore(s => s - 50);
        toast({ title: 'İpucu', description: `Ana kelime '${currentLevel.mainWord[0]}' harfi ile başlıyor.` });
    } else {
        toast({ title: 'Yetersiz Puan', description: 'İpucu için en az 50 puan gerekli!', variant: 'destructive' });
    }
  };

  const getLetterPosition = (index: number, total: number) => {
    const radius = 80;
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
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isTouching) return;
    e.preventDefault();

    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const element = document.elementFromPoint(clientX, clientY);
    if (element && (element as HTMLElement).dataset.index) {
      const index = parseInt((element as HTMLElement).dataset.index as string);
      if (!currentSelection.includes(index)) {
        setCurrentSelection(prev => [...prev, index]);
      } else {
        if (currentSelection.length > 1 && currentSelection[currentSelection.length - 2] === index) {
            setCurrentSelection(prev => prev.slice(0, -1));
        }
      }
    }
    
    if (wheelRef.current) {
        const rect = wheelRef.current.getBoundingClientRect();
        setMousePos({
            x: clientX - rect.left - rect.width / 2,
            y: clientY - rect.top - rect.height / 2
        });
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
    
    if (currentLevel.words.includes(formedWord) && !foundWords.includes(formedWord)) {
      setFoundWords(prev => [...prev, formedWord]);
      setScore(score + (formedWord.length * 10));
      
      if (formedWord === currentLevel.mainWord) {
          setTimeout(() => setShowInfo(true), 1000);
      }
    }
  };
  
  const handleSaveAndExit = async () => {
    if (!user || score === 0 || isSaving) {
        router.push('/student/activities');
        return;
    }
    setIsSaving(true);
    const result = await submitIlimHazinesiScoreAction(user.uid, score, gameContext);
    if (result.success) {
        toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
        router.push('/student/activities');
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
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
        <div className="flex h-screen w-full items-center justify-center p-4">
             <Alert variant="destructive" className="max-w-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Oyun Yüklenemedi</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                 <div className="mt-4">
                    <Button asChild variant="secondary">
                        <Link href="/student/ilim-hazinesi">Geri Dön</Link>
                    </Button>
                </div>
            </Alert>
        </div>
    );
  }
  
  if (isFinished) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <PartyPopper className="h-16 w-16 text-amber-400 mx-auto"/>
                    <CardTitle>Tebrikler!</CardTitle>
                    <CardDescription>İlim Hazinesi etkinliğini tamamladınız.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold text-primary">{score}</p>
                    <p className="text-muted-foreground">Toplam Puan</p>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button onClick={handleSaveAndExit} className="w-full" disabled={isSaving || score === 0}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Puanı Kaydet ve Çık
                    </Button>
                    <Button onClick={() => window.location.reload()} className="w-full" variant="secondary">
                        <Repeat className="mr-2 h-4 w-4"/>Tekrar Oyna
                    </Button>
                </CardFooter>
            </Card>
        </div>
      )
  }
  
  if (!currentLevel) {
      return <div className="flex h-screen items-center justify-center"><p>Seviye yükleniyor...</p></div>
  }

  return (
    <div 
        className="min-h-screen bg-gradient-to-b from-violet-900 to-fuchsia-900 flex flex-col items-center overflow-hidden font-sans text-white select-none"
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
    >
      
      <div className="w-full max-w-md p-4 flex justify-between items-center z-10">
        <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
          <Link href="/student/ilim-hazinesi">
            <ArrowLeft className="mr-2 h-4 w-4"/> Geri
          </Link>
        </Button>
        <div className="flex flex-col text-center">
            <span className="text-xs text-violet-300 font-bold">SEVİYE {levelIndex + 1}/{levels.length}</span>
            <h1 className="text-xl font-bold text-fuchsia-200 header-font">İlim Hazinesi</h1>
        </div>
        <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full flex items-center gap-2 border border-white/30">
            <Star size={16} className="text-yellow-400 fill-current" />
            <span className="font-bold">{score}</span>
        </div>
      </div>
      
       <div className="h-12 flex items-center justify-center mb-4">
        <span className="text-3xl font-black tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            {currentWordString}
        </span>
      </div>

       <div className="relative pb-12 flex-grow flex flex-col justify-center">
        
        <div 
            ref={wheelRef}
            className="relative w-64 h-64 bg-black/20 backdrop-blur-md rounded-full border-4 border-white/10 shadow-2xl flex items-center justify-center"
        >
          <div className="absolute -top-16 left-0 right-0 flex justify-between px-8 w-full max-w-[300px] mx-auto z-20">
              <button onClick={shuffleCurrent} className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur shadow transition-transform hover:rotate-180">
                  <RefreshCw size={20} />
              </button>
              <button onClick={useHint} className="p-3 rounded-full bg-white/10 hover:bg-yellow-500/50 hover:text-yellow-200 backdrop-blur shadow transition-colors">
                  <Lightbulb size={20} />
              </button>
          </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                {currentSelection.length > 0 && isTouching && (
                    <path 
                        d={`M ${currentSelection.map((idx) => {
                            const pos = getLetterPosition(idx, shuffledLetters.length);
                            return `${128 + pos.x} ${128 + pos.y}`;
                        }).join(' L ')}`}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.5)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
            </svg>

            {shuffledLetters.map((char, i) => {
                const pos = getLetterPosition(i, shuffledLetters.length);
                const isSelected = currentSelection.includes(i);
                
                return (
                    <div
                        key={i}
                        data-index={i}
                        onMouseDown={(e) => handleStart(i, e)}
                        onTouchStart={(e) => handleStart(i, e)}
                        className={cn(`absolute w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold cursor-pointer shadow-lg transition-all duration-200 z-10 select-none`,
                        isSelected 
                            ? 'bg-fuchsia-500 text-white scale-110 ring-4 ring-fuchsia-300' 
                            : 'bg-white text-violet-900 hover:bg-fuchsia-100')}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white text-slate-900 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-pop-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                    <BookOpen size={32} />
                </div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">Kavram Öğrenildi!</h2>
                <h3 className="text-3xl font-black text-slate-800 mb-4">{currentLevel.mainWord}</h3>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                    {currentLevel.info}
                </p>
                <button 
                    onClick={nextLevel}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xl flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105"
                >
                    Sıradaki Kelime <ChevronRight />
                </button>
            </div>
        </div>
      )}

      <style>{`
        @keyframes popIn {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default function IlimHazinesiPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <GameComponent />
        </Suspense>
    )
}

    