'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { Zap, X, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function RemoteCursor() {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isControlling, setIsControlling] = useState(false);
  const [isPointerVisible, setIsPointerVisible] = useState(false);
  const padRef = useRef<HTMLDivElement>(null);

  // --- İZLEYİCİ MODU (Akıllı Tahta tarafı) ---
  // Herkes (öğretmen dahil) Firestore'daki hareketleri dinler ve kırmızı noktayı gösterir.
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'remote_cursor'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const now = Date.now();
        const lastUpdate = data.lastUpdated?.toMillis() || 0;
        
        // Eğer veri çok eskiyse (5 saniye) gizle
        if (data.active && (now - lastUpdate < 5000)) {
          setPosition({ x: data.x, y: data.y });
          setIsPointerVisible(true);
        } else {
          setIsPointerVisible(false);
        }
      }
    });
    return () => unsub();
  }, []);

  // --- KONTROL MODU (Öğretmen tarafı) ---
  const handleMove = (clientX: number, clientY: number) => {
    if (!isControlling || !padRef.current) return;

    const rect = padRef.current.getBoundingClientRect();
    // Koordinatları 0-100 arasına normalize et (Ekran boyutundan bağımsızlık için)
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    // Firestore'u güncelle (Throttle olmadan direkt, anlık tepki için)
    setDoc(doc(db, 'settings', 'remote_cursor'), {
      x,
      y,
      active: true,
      lastUpdated: serverTimestamp(),
      teacherId: user?.uid || 'anon'
    }, { merge: true });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const stopControlling = () => {
    setIsControlling(false);
    setDoc(doc(db, 'settings', 'remote_cursor'), { active: false }, { merge: true });
  };

  // Sadece öğretmenler kontrol butonunu görebilir
  const canControl = user?.role === 'teacher' || user?.role === 'superadmin';

  return (
    <>
      {/* 1. LAZER NOKTASI (Tüm ekranlarda görünür) */}
      {isPointerVisible && (
        <div 
          className="fixed pointer-events-none z-[9999] transition-all duration-75 ease-out"
          style={{ 
            left: `${position.x}%`, 
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)' 
          }}
        >
          {/* Lazer Parlaması */}
          <div className="relative">
            <div className="absolute inset-0 w-8 h-8 bg-red-500 rounded-full blur-md opacity-60 animate-pulse" />
            <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-[0_0_10px_red]" />
          </div>
        </div>
      )}

      {/* 2. ÖĞRETMEN KONTROL PANELİ */}
      {canControl && (
        <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-3 print:hidden">
          {isControlling && (
            <div 
              ref={padRef}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              className="w-64 h-64 bg-slate-900/90 backdrop-blur-xl border-4 border-indigo-500/50 rounded-3xl shadow-2xl flex flex-col items-center justify-center cursor-none relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-grid opacity-10" />
              <Move className="w-12 h-12 text-indigo-400 opacity-20" />
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-2">Bu alanda kaydırın</p>
              
              <Button 
                size="icon" 
                variant="destructive" 
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={stopControlling}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            size="lg"
            onClick={() => setIsControlling(!isControlling)}
            className={cn(
              "h-16 w-16 rounded-2xl shadow-2xl transition-all duration-300 border-2",
              isControlling 
                ? "bg-red-600 border-red-400 rotate-90 scale-90" 
                : "bg-indigo-600 border-indigo-400 hover:scale-110 active:scale-95"
            )}
          >
            <Zap className={cn("h-8 w-8 fill-current", isControlling ? "animate-pulse" : "")} />
          </Button>
        </div>
      )}
    </>
  );
}
