
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';

type Segment = {
  value: number;
  label: string;
  color: string;
};

type WheelOfFortuneProps = {
  segments: Segment[];
  onSpinStart: () => void;
  onSpinEnd: (prize: Segment) => void;
};

export function WheelOfFortune({ segments, onSpinStart, onSpinEnd }: WheelOfFortuneProps) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    const numSegments = segments.length;
    const anglePerSegment = 360 / numSegments;

    const spin = () => {
        if (isSpinning) return;
        
        onSpinStart();
        setIsSpinning(true);
        playSound('correct'); 

        const randomSpins = Math.floor(Math.random() * 5) + 8; // 8-12 arası tam tur
        const randomStopIndex = Math.floor(Math.random() * numSegments);
        const stopAngle = randomStopIndex * anglePerSegment;
        
        const targetRotation = (rotation + (360 * randomSpins) + stopAngle) - (anglePerSegment / 2) + (Math.random() * anglePerSegment * 0.8 - anglePerSegment * 0.4);
        
        setRotation(targetRotation);
        
        setTimeout(() => {
            const finalAngle = targetRotation % 360;
            let winningSlice = Math.floor((360 - finalAngle + anglePerSegment / 2) / anglePerSegment) % numSegments;
            if(winningSlice < 0) winningSlice += numSegments;

            setIsSpinning(false);
            onSpinEnd(segments[winningSlice]);
        }, 7000); 
    };

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            
            <div className="absolute inset-0 bg-slate-900 rounded-full shadow-[0_0_100px_rgba(109,40,217,0.4)] border-8 border-slate-800" />
            <div className="absolute inset-6 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-full shadow-inner" />

            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20" style={{ transform: 'translateX(-50%)' }}>
                 <div className="w-0 h-0 border-x-[20px] border-x-transparent border-b-[35px] border-b-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" />
                 <div className="absolute top-[28px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-900 border-2 border-yellow-400" />
            </div>

            <div 
                className="relative w-full h-full rounded-full transition-transform duration-[7000ms] ease-[cubic-bezier(0.25,0.1,0.25,1.275)]"
                style={{ transform: `rotate(${rotation}deg)` }}
            >
                <div className="absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] z-10 pointer-events-none border-[4px] border-white/5" />
                
                <svg viewBox="-1 -1 2 2" className="w-full h-full" style={{ transform: 'rotate(90deg)' }}>
                    {segments.map((segment, index) => {
                        const startPercent = index / numSegments;
                        const endPercent = (index + 1) / numSegments;
                        
                        const [startX, startY] = getCoordinatesForPercent(startPercent);
                        const [endX, endY] = getCoordinatesForPercent(endPercent);
                        const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;
                        const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
                        
                        const midAngle = (startPercent + endPercent) * Math.PI; 
                        const textRadius = 0.65;
                        const textX = Math.cos(midAngle) * textRadius;
                        const textY = Math.sin(midAngle) * textRadius;
                        const rotationDeg = (midAngle * 180) / Math.PI - 90;
                        
                        const fontSize = Math.max(0.04, Math.min(0.08, 0.5 / (numSegments > 0 ? numSegments : 1)));

                        return (
                            <g key={index}>
                                <path d={pathData} fill={segment.color} stroke="#1e293b" strokeWidth="0.008" />
                                <text 
                                    x={textX} 
                                    y={textY} 
                                    fill="white" 
                                    fontSize={fontSize}
                                    fontWeight="900"
                                    textAnchor="middle" 
                                    alignmentBaseline="middle"
                                    transform={`rotate(${rotationDeg}, ${textX}, ${textY})`}
                                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                                >
                                    {segment.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            <div className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 p-2 shadow-2xl border-4 border-slate-600">
                <Button 
                    onClick={spin}
                    disabled={isSpinning}
                    className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-2xl uppercase tracking-wider shadow-inner active:scale-95 transition-all"
                >
                    {isSpinning ? <Loader2 className="animate-spin h-8 w-8" /> : <Gift className="h-8 w-8 animate-bounce" />}
                </Button>
            </div>
        </div>
    );
}
