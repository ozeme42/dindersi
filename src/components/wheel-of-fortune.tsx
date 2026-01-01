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
  spinDuration = 8,
}: WheelOfFortuneProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  // Önceki kazananı hatırlamak için (aynı sonucun tekrar gelmemesi için)
  const lastWinnerIndex = useRef<number | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const numSegments = segments.length;
  const sliceAngle = 360 / numSegments;

  // --- RENK GRADYANI ---
  const conicGradient = useMemo(() => {
    // "from 0deg": Gradyanı tam tepe noktasından (Saat 12) başlatır.
    let gradientString = 'conic-gradient(from 0deg, ';
    
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

    let newWinnerIndex;
    
    // --- GELİŞMİŞ RASTGELE SEÇİM ---
    // Eğer dilim sayısı 1'den fazlaysa, bir öncekiyle aynı gelmemesini garanti et.
    if (numSegments > 1) {
        do {
            newWinnerIndex = Math.floor(Math.random() * numSegments);
        } while (newWinnerIndex === lastWinnerIndex.current);
    } else {
        newWinnerIndex = 0;
    }

    lastWinnerIndex.current = newWinnerIndex;

    // --- DÖNÜŞ HESAPLAMASI ---
    const spinRounds = 5 + Math.floor(Math.random() * 5); // 5 ila 10 tur
    const extraDegrees = 360 * spinRounds;
    
    // Kazanan dilimin ortası
    const winnerCenterAngle = (newWinnerIndex * sliceAngle) + (sliceAngle / 2);

    // İBRE SAĞDA (90 derecede değil, CSS transform mantığında 0 derece sağdadır).
    // Ancak Gradyan 0'ı TEPE (12) kabul ettiğimiz için bir dönüşüm yapmamız gerekir.
    // İbremiz görsel olarak sağda (Saat 3). Gradyanımız tepeden (Saat 12) başlıyor.
    // Bu yüzden ibre aslında gradyanın 90. derecesinde duruyor.
    
    const pointerOffset = 90; // İbre sağda olduğu için 90 derecelik ofset
    const targetRotation = extraDegrees + (360 - winnerCenterAngle) + pointerOffset;

    const currentRotation = rotation;
    const finalRotation = currentRotation + (targetRotation - (currentRotation % 360));
    
    // Geri sarmaması için kontrol
    const adjustedRotation = finalRotation < currentRotation ? finalRotation + 360 : finalRotation;

    setRotation(adjustedRotation);

    setTimeout(() => {
      setIsSpinning(false);
      if (onSpinEnd) {
        onSpinEnd(segments[newWinnerIndex]);
      }
    }, spinDuration * 1000);
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full max-w-[500px] max-h-[500px] mx-auto aspect-square p-4">
      
      {/* İBRE (OK) - SAĞ TARAFTA */}
      <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 z-30 flex items-center filter drop-shadow-xl transform rotate-180">
        <div 
            className="w-0 h-0 border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent border-l-[35px] border-l-white"
        ></div>
      </div>

      {/* GÖLGE */}
      <div className="absolute inset-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] z-0"></div>

      {/* DÖNEN ÇARK */}
      <div
        ref={wheelRef}
        className="w-full h-full rounded-full relative z-10 overflow-hidden border-[6px] border-slate-900"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: `transform ${spinDuration}s cubic-bezier(0.15, 0, 0.10, 1)`,
          backgroundImage: conicGradient, 
        }}
      >
        {segments.map((segment, index) => {
          // --- KRİTİK DÜZELTME ---
          // Dilimin matematiksel orta noktası
          const angleOffset = sliceAngle / 2;
          
          // CSS 'justify-end' yazıyı SAĞA (Saat 3 yönüne / 90 dereceye) yaslar.
          // Ancak bizim dilimlerimiz TEPEDEN (Saat 12 / 0 derece) başlar.
          // Aradaki 90 derecelik farkı kapatmak için '-90' yapıyoruz.
          const rotateValue = (index * sliceAngle) + angleOffset - 90;

          return (
            <div
              key={index}
              className="absolute top-0 left-0 w-full h-full flex items-center justify-end pr-10" // pr-10: Yazıyı kenardan içeri iter
              style={{
                  transform: `rotate(${rotateValue}deg)`,
                  transformOrigin: 'center', 
              }}
            >
                <span className="text-white font-bold text-lg sm:text-xl md:text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] select-none">
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
          "w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-100 border-4 border-slate-300 shadow-[0_0_15px_rgba(0,0,0,0.3)]",
          "flex items-center justify-center font-black text-slate-800 tracking-wider text-lg",
          "transition-all active:scale-95 hover:scale-105 hover:bg-white",
          isSpinning && "opacity-90 cursor-not-allowed scale-100"
        )}
      >
        {isSpinning ? <Loader2 className="animate-spin h-8 w-8 text-slate-500"/> : "ÇEVİR"}
      </button>
    </div>
  );
}