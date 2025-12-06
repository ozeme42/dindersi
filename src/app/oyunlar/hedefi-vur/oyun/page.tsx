
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { submitHedefiVurScoreAction } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Crosshair, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';

const GAME_DURATION = 30; // 30 saniye
const TARGET_INTERVAL = 1000; // Her saniye yeni hedef

type Target = {
  id: number;
  x: number;
  y: number;
  size: number;
};

function TargetHitGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isSaving, setIsSaving] = useState(false);
  const [isScoreSaved, setIsScoreSaved] = useState(false);

  const gameContext = `Hedefi Vur - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setTargets([]);
    setGameState('playing');
    setIsScoreSaved(false);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      setGameState('finished');
    }
    return () => clearTimeout(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    let targetInterval: NodeJS.Timeout;
    if (gameState === 'playing') {
      targetInterval = setInterval(() => {
        const newTarget: Target = {
          id: Date.now(),
          x: Math.random() * 85 + 5, // %5-%95 arası
          y: Math.random() * 85 + 5,
          size: Math.random() * 30 + 30, // 30px-60px
        };
        setTargets(prev => [...prev.slice(-5), newTarget]); // Ekranda en fazla 6 hedef tut
      }, TARGET_INTERVAL);
    }
    return () => clearInterval(targetInterval);
  }, [gameState]);

  const handleTargetClick = (targetId: number) => {
    playSound('correct');
    setScore(prev => prev + 10);
    setTargets(prev => prev.filter(t => t.id !== targetId));
  };
  
  const handleSaveAndExit = async () => {
    if (isSaving || isScoreSaved || !user || score <= 0) {
        router.push('/oyunlar/hedefi-vur');
        return;
    }
    setIsSaving(true);
    const result = await submitHedefiVurScoreAction(user.uid, score, gameContext);
    if (result.success) {
        setIsScoreSaved(true);
        toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
    } else {
        toast({ title: 'Hata', description: result.error, variant: 'destructive' });
    }
    setIsSaving(false);
  };
  
  const handleRestart = () => {
      setGameState('ready');
  };

  if (gameState === 'finished') {
    return (
        <GameEndScreen
            score={score}
            onSave={handleSaveAndExit}
            isSaving={isSaving}
            scoreSaved={isScoreSaved}
            onRestart={handleRestart}
            backUrl="/oyunlar/hedefi-vur"
        />
    );
  }

  if (gameState === 'ready') {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
            <div className="text-center space-y-6">
                <Crosshair className="h-24 w-24 text-red-500 mx-auto animate-pulse" />
                <h1 className="text-5xl font-bold">Hedefi Vur</h1>
                <p className="text-slate-400 text-lg">Ekranda beliren hedefleri olabildiğince hızlı vur!</p>
                <Button onClick={startGame} size="lg" className="text-2xl h-16">Oyunu Başlat</Button>
            </div>
        </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-800 text-white flex flex-col overflow-hidden cursor-crosshair">
        <div className="p-4 flex justify-between items-center bg-black/30 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-400"/>
                <span className="text-2xl font-bold font-mono">{score}</span>
            </div>
             <div className="absolute left-1/2 -translate-x-1/2 text-4xl font-black text-white/50 select-none">
                {timeLeft}
            </div>
            <Button variant="ghost" onClick={() => setGameState('finished')}>Oyundan Çık</Button>
        </div>

        <div className="relative flex-grow">
            {targets.map(target => (
                <div
                    key={target.id}
                    className="absolute rounded-full bg-red-600 border-4 border-white flex items-center justify-center animate-pop-in"
                    style={{
                        left: `${target.x}%`,
                        top: `${target.y}%`,
                        width: `${target.size}px`,
                        height: `${target.size}px`,
                        transform: 'translate(-50%, -50%)',
                    }}
                    onClick={() => handleTargetClick(target.id)}
                >
                    <div className="w-1/3 h-1/3 rounded-full bg-white"/>
                </div>
            ))}
        </div>
    </div>
  );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-red-500" /></div>}>
            <TargetHitGame />
        </Suspense>
    );
}

// Custom animation in globals.css
// @keyframes popIn {
//     from { opacity: 0; transform: scale(0.8); }
//     to { opacity: 1; transform: scale(1); }
// }
// .animate-pop-in {
//     animation: popIn 0.3s ease-out;
// }
