'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, X, MousePointer2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export function RemoteCursor() {
    const { user } = useAuth();
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
    const [isController, setIsController] = useState(false);
    const touchpadRef = useRef<HTMLDivElement>(null);

    // Lazer pozisyonunu tüm cihazlarda dinle (Akıllı tahtada görünmesi için)
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'remote_cursor'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCursorPos({ x: data.x, y: data.y });
            }
        });
        return () => unsub();
    }, []);

    // Koordinatları Firestore'a gönder
    const updateCursor = (clientX: number, clientY: number) => {
        const rect = touchpadRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Göreceli pozisyon hesapla (0-100 arası)
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        setDoc(doc(db, 'settings', 'remote_cursor'), {
            x, y,
            updatedAt: serverTimestamp(),
            uid: user?.uid
        });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isController) return;
        const touch = e.touches[0];
        updateCursor(touch.clientX, touch.clientY);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isController) return;
        if (e.buttons !== 1) return; // Sadece basılı tutarken hareket ettir
        updateCursor(e.clientX, e.clientY);
    };

    const showLaser = cursorPos.x >= 0 && cursorPos.x <= 100 && cursorPos.y >= 0 && cursorPos.y <= 100;

    const laserElement = showLaser && (
        <div 
            className="fixed pointer-events-none z-[9999] transition-all duration-75 ease-out"
            style={{ 
                left: `${cursorPos.x}%`, 
                top: `${cursorPos.y}%`,
                transform: 'translate(-50%, -50%)'
            }}
        >
            <div className="relative">
                <div className="w-5 h-5 bg-red-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(220,38,38,1)] animate-pulse" />
                <div className="absolute inset-0 w-5 h-5 bg-red-500 rounded-full animate-ping opacity-30" />
            </div>
        </div>
    );

    // Öğretmen veya admin değilse sadece lazeri göster (Akıllı tahta modu)
    if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
        return laserElement;
    }

    // Öğretmen/Admin Görünümü: Kontrol Paneli + Lazer
    return (
        <>
            {laserElement}
            
            <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-3 print-hide">
                {isController && (
                    <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-indigo-500/50 rounded-2xl p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Tahta Kontrolü</span>
                            <Button variant="ghost" size="icon" onClick={() => {
                                setIsController(false);
                                setDoc(doc(db, 'settings', 'remote_cursor'), { x: -100, y: -100 });
                            }} className="h-6 w-6 text-red-500 hover:bg-red-500/10">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div 
                            ref={touchpadRef}
                            className="w-48 h-48 bg-slate-950 border border-white/10 rounded-xl cursor-none relative overflow-hidden active:border-indigo-500/50 transition-colors"
                            onTouchMove={handleTouchMove}
                            onMouseMove={handleMouseMove}
                            onMouseDown={(e) => updateCursor(e.clientX, e.clientY)}
                        >
                            <div className="absolute inset-0 bg-grid opacity-5" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <MousePointer2 className="w-8 h-8 text-indigo-500/10" />
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-2 text-center">Parmağını kutu içinde gezdir</p>
                    </div>
                )}

                <Button 
                    size="icon" 
                    onClick={() => setIsController(!isController)}
                    className={cn(
                        "h-12 w-12 rounded-xl shadow-xl transition-all duration-300 border-2 active:scale-95",
                        isController 
                            ? "bg-indigo-600 border-indigo-400 scale-110 shadow-indigo-500/40" 
                            : "bg-slate-900 border-white/10 hover:border-white/20"
                    )}
                >
                    <Zap className={cn("h-6 w-6", isController ? "text-white fill-white" : "text-slate-400")} />
                </Button>
            </div>
        </>
    );
}
