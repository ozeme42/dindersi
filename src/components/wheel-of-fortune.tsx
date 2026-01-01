
'use client';

import React, { useState, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Segment {
  value: number;
  label: string;
  color: string;
}

interface WheelOfFortuneProps {
  segments: Segment[];
  onSpinStart?: () => void;
  onSpinEnd?: (winner: Segment) => void;
  spinDuration?: number; // Saniye
}

export function WheelOfFortune({
  segments,
  onSpinStart,
  onSpinEnd,
  spinDuration = 10,
}: WheelOfFortuneProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const numSegments = segments.length;
  const sliceAngle = 360 / numSegments;

  // --- RENK GRADYANI (DÜZELTİLMİŞ) ---
  const conicGradient = useMemo(() => {
    // from -90deg: Gradyanı saat 12 yerine saat 3 yönünden (Sağdan) başlatır.
    // Böylece CSS transform rotate(0deg) ile tam eşleşir.
    let gradientString = 'conic-gradient(from -90deg, ';
    
    segments.forEach((segment, index) => {
        const startAngle = index * sliceAngle;
        const endAngle = (index + 1) * sliceAngle;
        gradientString += `${segment.color} ${startAngle}deg ${endAngle}deg, `;
    });

    return gradientString.slice(0, -2) + ')';
  }, [segments, sliceAngle]);


  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    if (onSpinStart) onSpinStart();

    const newWinnerIndex = Math.floor(Math.random() * numSegments);
    
    // --- DÖNÜŞ HESAPLAMASI (ORTALAMA DÜZELTİLDİ) ---
    const spinRounds = 5 + Math.floor(Math.random() * 3);
    const extraDegrees = 360 * spinRounds;
    
    // Kazanan dilimin tam ORTA noktası
    const winnerCenterAngle = (newWinnerIndex * sliceAngle) + (sliceAngle / 2);

    // İbre Sağda (0 derecede).
    // Hedef: (360 - Kazananın Ortası). 
    // Bu işlem kazanan dilimin ortasını tam 0 noktasına (sağa) getirir.
    const targetRotation = extraDegrees + (360 - winnerCenterAngle);

    const currentRotation = rotation % 360;
    const finalRotation = rotation + (targetRotation - currentRotation) + 360;

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      if (onSpinEnd) {
        onSpinEnd(segments[newWinnerIndex]);
      }
    }, spinDuration * 1000);
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      
      {/* İBRE (OK) - SAĞ TARAFTA */}
      <div className="absolute right-[-15px] top-1/2 -translate-y-1/2 z-30 flex items-center filter drop-shadow-lg">
        <div 
            className="w-0 h-0 border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent border-r-[30px] border-r-white"
        ></div>
      </div>

      {/* DIŞ ÇEMBER GÖLGESİ */}
      <div className="absolute inset-0 rounded-full shadow-2xl z-0"></div>

      {/* DÖNEN ÇARK KONTEYNERİ */}
      <div
        ref={wheelRef}
        className="w-full h-full rounded-full relative z-10 overflow-hidden border-8 border-slate-800/80"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: `transform ${spinDuration}s cubic-bezier(0.2, 0, 0.1, 1)`, 
          backgroundImage: conicGradient, 
        }}
      >
        {/* METİNLER */}
        {segments.map((segment, index) => {
          // DÜZELTME: Dilimin başlangıcına değil, ORTASINA hizala
          const centerRotate = (index * sliceAngle) + (sliceAngle / 2);
          
          return (
            <div
              key={index}
              className="absolute top-0 left-0 w-full h-full flex items-center justify-end pr-10"
              style={{
                  // Metni dilimin tam ortasına döndür
                  transform: `rotate(${centerRotate}deg)`,
              }}
            >
               <span className="text-white font-black text-lg sm:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none origin-center z-20">
                  {segment.label}
               </span>
            </div>
          );
        })}
      </div>

      {/* ORTA BUTON */}
      <button
        onClick={handleSpin}
        disabled={isSpinning}
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40",
          "w-24 h-24 rounded-full bg-gradient-to-br from-white to-slate-200 border-4 border-slate-300 shadow-[0_0_30px_rgba(255,255,255,0.3)]",
          "flex items-center justify-center font-black text-slate-900 tracking-wider text-xl",
          "transition-all active:scale-95 hover:scale-105 hover:shadow-[0_0_50px_rgba(255,255,255,0.5)]",
          isSpinning && "opacity-90 cursor-not-allowed scale-100"
        )}
      >
        {isSpinning ? <Loader2 className="animate-spin h-8 w-8 text-slate-500"/> : "ÇEVİR"}
      </button>
    </div>
  );
}
