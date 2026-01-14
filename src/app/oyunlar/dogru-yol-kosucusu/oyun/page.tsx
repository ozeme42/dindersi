'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { Play, RefreshCw, Heart, Zap, Loader2, Home, ArrowLeft } from 'lucide-react';
import { getDogruYolKosucusuAction, submitDogruYolKosucusuScoreAction, type DogruYolQuestion } from '../actions';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { GameEndScreen } from '@/components/game-end-screen';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const LANE_WIDTH = 50; // % olarak şerit genişliği

function Game() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [gameState, setGameState] = useState('start'); // start, playing, gameover
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [playerLane, setPlayerLane] = useState(0); // 0: Sol, 1: Sağ
  const [obstacles, setObstacles] = useState<any[]>([]); 
  const [speed, setSpeed] = useState(0.5); // Başlangıç hızı
  const [lastFeedback, setLastFeedback] = useState<{ text: string, type: 'good' | 'bad' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DogruYolQuestion[]>([]);
  const [correctStreak, setCorrectStreak] = useState(0);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isScoreSaved, setIsScoreSaved] = useState(false);

  const requestRef = useRef<number>();
  const lastSpawnTime = useRef(0);
  const scoreRef = useRef(0);

  const gameContext = `Doğru Yol Koşucusu - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
  const backUrl = useMemo(() => {
    const { courseId, unitId, topicId, courseName, unitName, topicName } = Object.fromEntries(searchParams.entries());
    if (courseId && unitId && topicId) {
        return `/konu/${courseId}/${unitId}/${topicId}/oyunlar?courseName=${encodeURIComponent(courseName || '')}&unitName=${encodeURIComponent(unitName || '')}&topicName=${encodeURIComponent(topicName || '')}`;
    }
    return '/oyunlar/dogru-yol-kosucusu';
  }, [searchParams]);
  
  useEffect(() => {
      const fetchQuestions = async () => {
          setIsLoading(true);
          const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
          };
          const result = await getDogruYolKosucusuAction(params);
          if (result.error || result.questions.length === 0) {
              setError(result.error || "Bu konu için uygun soru bulunamadı.");
              setGameState('error');
          } else {
              setQuestions(result.questions);
          }
          setIsLoading(false);
      }
      fetchQuestions();
  }, [searchParams]);

  // --- OYUN KONTROLLERİ ---
  
  const startGame = () => {
    if(questions.length === 0) {
        setError("Oyun başlatılamıyor: Soru yok.");
        setGameState('error');
        return;
    }
    setGameState('playing');
    setScore(0);
    scoreRef.current = 0;
    setLives(3);
    setObstacles([]);
    setSpeed(0.5);
    setLastFeedback(null);
    setPlayerLane(0);
    lastSpawnTime.current = 0;
    setCorrectStreak(0);
    setIsSaving(false);
    setIsScoreSaved(false);
  };

  const switchLane = () => {
    setPlayerLane(prev => (prev === 0 ? 1 : 0));
  };

  // Klavye Kontrolü
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft') setPlayerLane(0);
      if (e.key === 'ArrowRight') setPlayerLane(1);
      if (e.key === ' ' || e.key === 'ArrowUp') switchLane();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // --- OYUN DÖNGÜSÜ ---

  const spawnObstacle = useCallback(() => {
    if (questions.length === 0) return;
    const qData = questions[Math.floor(Math.random() * questions.length)];
    const correctLane = Math.random() > 0.5 ? 1 : 0; // 0: Sol, 1: Sağ
    
    const newObstacle = {
      id: Date.now(),
      y: -20, // Ekranın üstünden başla (% olarak)
      question: qData.q,
      leftAns: correctLane === 0 ? qData.correct : qData.wrong,
      rightAns: correctLane === 1 ? qData.correct : qData.wrong,
      correctLane: correctLane,
      passed: false
    };
    
    setObstacles(prev => [...prev, newObstacle]);
  }, [questions]);

  const updateGame = useCallback((time: number) => {
    if (gameState !== 'playing') return;

    // Zorluk Artışı (Puan 5 olduğu için eşikleri düşürdük: 125, 250, 500)
    if (scoreRef.current > 125) setSpeed(0.7);
    if (scoreRef.current > 250) setSpeed(0.9);
    if (scoreRef.current > 500) setSpeed(1.1);

    // Engel Üretme (Hıza bağlı sıklık)
    const spawnRate = 2500 / speed; // Hız arttıkça süre azalır
    if (time - lastSpawnTime.current > spawnRate) {
      spawnObstacle();
      lastSpawnTime.current = time;
    }

    setObstacles(prev => {
      const nextObstacles: any[] = [];
      
      prev.forEach(obs => {
        const newY = obs.y + speed;

        // Çarpışma Kontrolü (Oyuncu Y: 80-90 arası varsayalım)
        if (newY > 75 && newY < 90 && !obs.passed) {
          if (playerLane === obs.correctLane) {
            
            // --- GÜNCELLEME BURADA: 5 PUAN ---
            const pointsToAdd = 5; 
            
            setScore(s => {
                scoreRef.current = s + pointsToAdd;
                return s + pointsToAdd;
            });
            setLastFeedback({ text: `DOĞRU! +${pointsToAdd}`, type: "good" });
            obs.passed = true;
          } else {
            setCorrectStreak(0);
            setLives(l => {
                const newLives = l - 1;
                if (newLives <= 0) setGameState('gameover');
                return newLives;
            });
            setLastFeedback({ text: "YANLIŞ!", type: "bad" });
            obs.passed = true;
          }
          setTimeout(() => setLastFeedback(null), 800);
        }

        if (newY < 120) {
          nextObstacles.push({ ...obs, y: newY });
        }
      });

      return nextObstacles;
    });

    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameState, playerLane, speed, spawnObstacle, correctStreak]);

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameState, updateGame]);
  
  const handleSaveAndExit = async () => {
    if (!user || isSaving || isScoreSaved || score <= 0) {
      router.push(backUrl);
      return;
    }
    setIsSaving(true);
    const result = await submitDogruYolKosucusuScoreAction(user.uid, score, gameContext);
    if (result.success) {
      setIsScoreSaved(true);
      toast({ title: "Başarılı!", description: "Puanınız kaydedildi." });
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsSaving(false);
  };


  // --- RENDER ---
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900"><Loader2 className="h-12 w-12 animate-spin text-cyan-400" /></div>;
  }
  
  if (error) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white text-center p-4">
            <div>
                <h2 className="text-xl font-bold text-red-500 mb-4">Hata</h2>
                <p>{error}</p>
                 <Button asChild className="mt-4"><Link href={backUrl}>Geri Dön</Link></Button>
            </div>
        </div>
    );
  }

   if (gameState === 'gameover') {
        return (
            <GameEndScreen
                score={score}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={startGame}
                backUrl={backUrl}
            />
        );
    }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 overflow-hidden font-sans select-none relative touch-none">
      
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="w-full h-full bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,.3)_25%,rgba(255,255,255,.3)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.3)_75%,rgba(255,255,255,.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(255,255,255,.3)_25%,rgba(255,255,255,.3)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.3)_75%,rgba(255,255,255,.3)_76%,transparent_77%,transparent)] bg-[length:50px_50px] animate-[moveBackground_1s_linear_infinite]" style={{animationDuration: `${2/speed}s`}}></div>
      </div>
      
      <style>{`
        @keyframes moveBackground {
          from { background-position: 0 0; }
          to { background-position: 0 50px; }
        }
      `}</style>

      <div className="relative w-full max-w-md h-[100vh] md:h-[600px] bg-slate-800 border-x-4 border-slate-700 shadow-2xl overflow-hidden">
        
        <div className="absolute top-0 bottom-0 left-1/2 w-2 bg-dashed border-l-2 border-slate-500 -translate-x-1/2 opacity-50"></div>
        
        <div className="absolute top-4 left-4 right-4 flex justify-between z-30">
            <Button asChild variant="ghost" className="bg-black/10 hover:bg-black/20 text-white rounded-full h-10 w-10 p-0">
               <Link href={backUrl}><ArrowLeft className="h-5 w-5"/></Link>
            </Button>
            <div className="bg-slate-900/80 text-yellow-400 px-4 py-2 rounded-full font-bold border border-yellow-500 flex items-center gap-2">
                <Zap size={18} className="fill-current" /> {score}
            </div>
            <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                    <Heart key={i} size={28} className={`${i < lives ? 'text-red-500 fill-current' : 'text-gray-600'} drop-shadow-md`} />
                ))}
            </div>
        </div>

        {lastFeedback && (
            <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 z-40 text-3xl font-black transform -rotate-6 animate-bounce ${lastFeedback.type === 'good' ? 'text-green-400' : 'text-red-500'}`} style={{textShadow: '2px 2px 0 #000'}}>
                {lastFeedback.text}
            </div>
        )}

        {obstacles.map(obs => (
            <div key={obs.id} className="absolute w-full flex flex-col items-center transition-all duration-100" style={{ top: `${obs.y}%`, opacity: obs.passed ? 0.5 : 1 }}>
                
                <div className="bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-sm md:text-base text-center mb-2 shadow-lg max-w-[80%] border-2 border-blue-400 relative z-20">
                    {obs.question}
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-blue-400 transform rotate-45"></div>
                </div>

                <div className="flex w-full px-2">
                    <div className={`flex-1 h-16 md:h-20 mx-1 rounded-lg flex items-center justify-center text-center font-bold text-white shadow-md border-b-4 transition-colors ${obs.passed && playerLane === 0 ? (playerLane === obs.correctLane ? 'bg-green-500 border-green-700' : 'bg-red-500 border-red-700') : 'bg-blue-600 border-blue-800'}`}>
                        {obs.leftAns}
                    </div>
                    
                    <div className={`flex-1 h-16 md:h-20 mx-1 rounded-lg flex items-center justify-center text-center font-bold text-white shadow-md border-b-4 transition-colors ${obs.passed && playerLane === 1 ? (playerLane === obs.correctLane ? 'bg-green-500 border-green-700' : 'bg-red-500 border-red-700') : 'bg-blue-600 border-blue-800'}`}>
                        {obs.rightAns}
                    </div>
                </div>
            </div>
        ))}

        <div 
            className="absolute bottom-24 w-16 h-16 bg-yellow-400 rounded-full border-4 border-orange-500 flex items-center justify-center text-3xl shadow-xl transition-all duration-200 z-20"
            style={{ 
                left: playerLane === 0 ? '25%' : '75%', 
                transform: 'translateX(-50%)' 
            }}
        >
            🏃
        </div>

        <div className="absolute inset-0 flex z-10">
            <div className="flex-1 active:bg-white/5 transition-colors" onClick={() => setPlayerLane(0)}></div>
            <div className="flex-1 active:bg-white/5 transition-colors" onClick={() => setPlayerLane(1)}></div>
        </div>

      </div>

      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white text-slate-900 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border-b-8 border-blue-600">
            <h1 className="text-3xl font-black text-blue-600 mb-4">DOĞRU YOL KOŞUCUSU</h1>
            <p className="text-gray-600 mb-6 text-lg font-medium">
              Yukarıdaki soruya bak.<br/>
              Doğru cevabın olduğu şeride geç!
            </p>
            <div className="flex justify-center gap-4 text-sm text-gray-400 mb-8">
               <span>⬅️ Sol Tık / Sol Ok</span>
               <span>Sağ Tık / Sağ Ok ➡️</span>
            </div>
            <button onClick={startGame} className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 active:scale-95 transition-all shadow-lg text-xl flex items-center justify-center gap-2">
              <Play fill="currentColor" /> KOŞUYA BAŞLA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function DogruYolKosucusuPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>}>
            <Game />
        </Suspense>
    );
}