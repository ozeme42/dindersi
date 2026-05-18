'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom'; // YENİ: Işınlanma özelliği için eklendi
import { Button } from '@/components/ui/button';
import { Zap, X, Touchpad } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export function RemoteCursor() {
    const { user } = useAuth();
    const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
    const [isController, setIsController] = useState(false);
    const [clickRipple, setClickRipple] = useState(false);
    
    // YENİ: Tam ekran olan elementi takip edecek state
    const [fullscreenElement, setFullscreenElement] = useState<Element | null>(null);
    
    const deviceIdRef = useRef(typeof window !== 'undefined' ? Math.random().toString(36).substring(2, 10) : 'server');
    
    const currentPosRef = useRef({ x: 50, y: 50 });
    const lastTouchRef = useRef({ x: 0, y: 0 });
    const lastSendTimeRef = useRef(0);
    const requestRef = useRef<number>();
    
    const lastProcessedClickRef = useRef<number>(0);

    const SENSITIVITY = 1.5; 

    // YENİ: Tam ekran değişikliklerini dinle
    useEffect(() => {
        const handleFullscreenChange = () => {
            // Eğer bir element tam ekrana girdiyse onu kaydet, çıkıldıysa null yap
            setFullscreenElement(document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        // Bazı eski tarayıcılar için alternatif prefixler
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    useEffect(() => {
        if (!user) return;

        const unsub = onSnapshot(doc(db, 'settings', 'remote_cursor'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                if (data.x !== undefined && data.y !== undefined) {
                    setCursorPos({ x: data.x, y: data.y });
                    currentPosRef.current = { x: data.x, y: data.y };
                }

                if (data.clickTrigger && data.clickTrigger > lastProcessedClickRef.current && data.senderId !== deviceIdRef.current) {
                    lastProcessedClickRef.current = data.clickTrigger;
                    simulateClick(data.x, data.y);
                }
            }
        });
        return () => unsub();
    }, [user]);

    const simulateClick = (xPercent: number, yPercent: number) => {
        const x = (window.innerWidth * xPercent) / 100;
        const y = (window.innerHeight * yPercent) / 100;
        
        const cursorDiv = document.getElementById('remote-mouse-cursor');
        if (cursorDiv) cursorDiv.style.visibility = 'hidden'; 

        const element = document.elementFromPoint(x, y);

        if (cursorDiv) cursorDiv.style.visibility = 'visible'; 

        if (element && element instanceof HTMLElement) {
            const eventConfig = { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y };

            element.dispatchEvent(new MouseEvent('pointerdown', eventConfig));
            element.dispatchEvent(new MouseEvent('mousedown', eventConfig));
            element.dispatchEvent(new MouseEvent('pointerup', eventConfig));
            element.dispatchEvent(new MouseEvent('mouseup', eventConfig));
            element.dispatchEvent(new MouseEvent('click', eventConfig));

            element.click();
            
            setClickRipple(true);
            setTimeout(() => setClickRipple(false), 400);
        }
    };

    const syncToFirebase = useCallback((forceClick = false) => {
        if (user?.role !== 'superadmin') return; 

        const now = Date.now();
        if (now - lastSendTimeRef.current > 50 || forceClick) {
            const payload: any = {
                x: currentPosRef.current.x,
                y: currentPosRef.current.y,
                updatedAt: serverTimestamp(),
                uid: user.uid,
                senderId: deviceIdRef.current 
            };

            if (forceClick) {
                payload.clickTrigger = now; 
            } else {
                payload.clickTrigger = null; 
            }

            setDoc(doc(db, 'settings', 'remote_cursor'), payload, { merge: true });
            lastSendTimeRef.current = now;
        }
    }, [user]);

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isController || user?.role !== 'superadmin') return;
        if (e.cancelable) e.preventDefault(); 
        
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        lastTouchRef.current = { x: clientX, y: clientY };
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isController || user?.role !== 'superadmin') return;
        if (e.cancelable) e.preventDefault(); 
        
        if ('buttons' in e && e.buttons !== 1 && e.type === 'mousemove') return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const dx = clientX - lastTouchRef.current.x;
        const dy = clientY - lastTouchRef.current.y;

        lastTouchRef.current = { x: clientX, y: clientY };

        let newX = currentPosRef.current.x + (dx / window.innerWidth) * 100 * SENSITIVITY;
        let newY = currentPosRef.current.y + (dy / window.innerHeight) * 100 * SENSITIVITY;

        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));

        currentPosRef.current = { x: newX, y: newY };
        setCursorPos({ x: newX, y: newY });
        
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(() => syncToFirebase(false));
    };

    const handleExplicitClick = (e: React.PointerEvent) => {
        e.preventDefault(); 
        if (!isController || user?.role !== 'superadmin') return;
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50); 
        }
        syncToFirebase(true); 
    };

    if (!user) return null;

    const isSuperAdmin = user.role === 'superadmin';

    const showCursor = cursorPos.x >= 0 && cursorPos.x <= 100 && cursorPos.y >= 0 && cursorPos.y <= 100;

    const cursorElement = showCursor && (
        <div 
            id="remote-mouse-cursor"
            className="fixed pointer-events-none z-[9999] transition-transform duration-75 ease-out"
            style={{ 
                left: `${cursorPos.x}%`, 
                top: `${cursorPos.y}%`,
                transform: 'translate(-4.5px, -2.5px)' 
            }}
        >
            <div className="relative">
                <svg width="32" height="32" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(2px 3px 3px rgba(0,0,0,0.4))' }}>
                    <path d="M4.5 2.5 L4.5 21 L10 15 L14.5 23 L18 21 L13.5 13 L21 13 Z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                
                {clickRipple && (
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-black/30 rounded-full animate-out zoom-out-150 fade-out duration-300" 
                         style={{ transform: 'translate(-25%, -25%)'}} />
                )}
            </div>
        </div>
    );

    // YENİ: Eğer sistemde tam ekran olan bir bileşen varsa, imleci o bileşenin İÇİNE ışınla. Yoksa normal yerine koy.
    const renderCursor = fullscreenElement 
        ? createPortal(cursorElement, fullscreenElement) 
        : cursorElement;

    return (
        <>
            {renderCursor} 
            
            {isSuperAdmin && (
                <>
                    <div className="fixed bottom-6 right-6 z-[100] print-hide">
                        <Button 
                            size="icon" 
                            onClick={() => setIsController(!isController)}
                            className={cn(
                                "h-14 w-14 rounded-2xl shadow-2xl transition-all duration-300 border-2 active:scale-95",
                                isController 
                                    ? "bg-indigo-600 border-indigo-400 scale-110 shadow-indigo-500/50" 
                                    : "bg-slate-900 border-slate-700 hover:border-slate-600"
                            )}
                        >
                            <Zap className={cn("h-7 w-7", isController ? "text-white fill-white" : "text-slate-400")} />
                        </Button>
                    </div>

                    {isController && (
                        <div className="fixed inset-0 z-[90] bg-slate-950/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-4 pt-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Touchpad className="w-6 h-6 text-indigo-400" />
                                        Sanal Kumanda (Super Admin)
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">Hareketi yukarıdan, tıklamayı alttan yapın</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsController(false)} className="h-10 w-10 text-slate-400 bg-slate-800 rounded-full">
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>

                            <div 
                                className="flex-1 bg-slate-900 border-2 border-indigo-500/30 rounded-3xl overflow-hidden relative active:border-indigo-500/80 transition-colors touch-none shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onMouseDown={handleTouchStart}
                                onMouseMove={handleTouchMove}
                                style={{ touchAction: 'none' }}
                            >
                                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                                    <svg width="48" height="48" viewBox="0 0 24 24" className="mb-4 text-indigo-400"><path d="M4.5 2.5 L4.5 21 L10 15 L14.5 23 L18 21 L13.5 13 L21 13 Z" fill="currentColor" /></svg>
                                    <span className="font-bold tracking-widest uppercase text-sm">Haraket Alanı</span>
                                </div>
                            </div>

                            <div className="h-32 mt-4 mb-4">
                                <Button 
                                    onPointerDown={handleExplicitClick} 
                                    className="w-full h-full rounded-3xl text-3xl font-black tracking-wider bg-indigo-600 hover:bg-indigo-500 border-b-8 border-indigo-800 active:border-b-0 active:translate-y-2 transition-all shadow-[0_15px_30px_rgba(79,70,229,0.3)] flex flex-col gap-2 select-none"
                                    style={{ touchAction: 'none' }}
                                >
                                    <span>🔘</span>
                                    SOL TIKLA
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
}