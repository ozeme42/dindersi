'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Award, TrendingUp, Repeat, Home } from 'lucide-react';
import Confetti from 'react-dom-confetti';

type GameEndScreenProps = {
  isWinner: boolean;
  score: number;
  onRestart: () => void;
  onExit: () => void;
};

export function GameEndScreen({ isWinner, score, onRestart, onExit }: GameEndScreenProps) {
  const [isConfettiActive, setIsConfettiActive] = React.useState(false);

  React.useEffect(() => {
    if (isWinner) {
      const timer = setTimeout(() => setIsConfettiActive(true), 200);
      return () => clearTimeout(timer);
    }
  }, [isWinner]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Confetti active={isConfettiActive} config={{
            angle: 90,
            spread: 360,
            startVelocity: 40,
            elementCount: 100,
            dragFriction: 0.12,
            duration: 3000,
            stagger: 3,
            width: "10px",
            height: "10px",
            colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
          }} />
        </div>
        <Card className="w-full max-w-md text-center shadow-2xl animate-in zoom-in-95 duration-300">
          <CardHeader>
            {isWinner ? (
              <Trophy className="mx-auto h-16 w-16 text-yellow-400" />
            ) : (
              <Award className="mx-auto h-16 w-16 text-slate-400" />
            )}
            <CardTitle className="text-3xl font-bold">
              {isWinner ? 'Tebrikler, Kazandın!' : 'Oyun Bitti!'}
            </CardTitle>
            <CardDescription>
              {isWinner ? 'Harika bir iş çıkardın!' : 'Bir dahaki sefere daha iyi olacak!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg text-muted-foreground">Kazandığın Puan</div>
            <div className="flex items-center justify-center gap-2 text-6xl font-black text-primary">
              <TrendingUp className="h-12 w-12" />
              <span>{score}</span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onRestart} className="w-full" size="lg">
              <Repeat className="mr-2 h-4 w-4" />
              Yeniden Oyna
            </Button>
            <Button onClick={onExit} variant="outline" className="w-full" size="lg">
              <Home className="mr-2 h-4 w-4" />
              Çıkış
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
