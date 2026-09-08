'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Smartphone, ChevronRight, ChevronLeft, Moon, Sun, 
    Eye, EyeOff, Timer, ListFilter, Wifi, WifiOff, 
    RefreshCw, Sparkles, Check, ArrowRight, ArrowLeft,
    Sliders, LogOut, CheckCircle2, AlertCircle, Layers,
    MousePointer2, Touchpad, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { 
    doc, onSnapshot, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function RemotePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
        }>
            <RemoteControlContent />
        </Suspense>
    );
}

function RemoteControlContent() {
    const searchParams = useSearchParams();
    const initialCode = (searchParams.get('code') || searchParams.get('session') || '').toUpperCase().trim();

    const [inputCode, setInputCode] = useState(initialCode);
    const [sessionCode, setSessionCode] = useState(initialCode);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(Boolean(initialCode));
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Aktif Mod: 'slides' (Büyük İleri/Geri tuşları) veya 'touchpad' (Fare & Tıklama)
    const [activeMode, setActiveMode] = useState<'slides' | 'touchpad'>('slides');

    // Oturum Verileri
    const [sessionData, setSessionData] = useState<{
        courseTitle: string;
        unitTitle: string;
        topicTitle: string;
        currentStepIndex: number;
        totalStepsCount: number;
        currentStepTitle: string;
        isBlackout: boolean;
        steps: { index: number; title: string; type: string }[];
    }>({
        courseTitle: '',
        unitTitle: '',
        topicTitle: '',
        currentStepIndex: 0,
        totalStepsCount: 0,
        currentStepTitle: '',
        isBlackout: false,
        steps: []
    });

    const [isStepDrawerOpen, setIsStepDrawerOpen] = useState(false);
    const [wakeLockActive, setWakeLockActive] = useState(false);
    const wakeLockRef = useRef<any>(null);

    // ══ TOUCHPAD / FARE STATE & REF'LERİ ══
    const [mouseSensitivity, setMouseSensitivity] = useState<number>(1.6);
    const cursorPosRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
    const lastTouchRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const touchStartTimeRef = useRef<number>(0);
    const touchTotalDistanceRef = useRef<number>(0);
    const lastSyncTimeRef = useRef<number>(0);
    const requestSyncRef = useRef<number | null>(null);

    // 1. Ekranın Kapanmasını Engelle (WakeLock API)
    useEffect(() => {
        if (!isConnected) return;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                    setWakeLockActive(true);
                }
            } catch (err) {
                console.log('WakeLock error:', err);
            }
        };

        requestWakeLock();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {});
            }
        };
    }, [isConnected]);

    // 2. Firestore Oturumunu Dinle & Bağlan
    useEffect(() => {
        if (!sessionCode || sessionCode.length < 4) {
            setIsConnected(false);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);

        const docRef = doc(db, 'presentationSessions', sessionCode);

        const unsub = onSnapshot(docRef, (snapshot) => {
            setIsLoading(false);

            if (!snapshot.exists()) {
                setIsConnected(false);
                setErrorMsg('Bu kodla aktif bir sunum oturumu bulunamadı. Akıllı tahtadaki kodu kontrol edin.');
                return;
            }

            const data = snapshot.data();

            if (data.status === 'closed') {
                setIsConnected(false);
                setErrorMsg('Bu sunum oturumu kapatıldı.');
                return;
            }

            setIsConnected(true);
            setErrorMsg(null);

            setSessionData({
                courseTitle: data.courseTitle || '',
                unitTitle: data.unitTitle || '',
                topicTitle: data.topicTitle || '',
                currentStepIndex: data.currentStepIndex || 0,
                totalStepsCount: data.totalStepsCount || 0,
                currentStepTitle: data.currentStepTitle || '',
                isBlackout: Boolean(data.isBlackout),
                steps: data.steps || []
            });

            // Telefonun bağlı olduğunu tahtaya bildir
            if (!data.phoneConnected) {
                updateDoc(docRef, {
                    phoneConnected: true,
                    lastPhoneSeen: serverTimestamp()
                }).catch(() => {});
            }
        }, (err) => {
            setIsLoading(false);
            setIsConnected(false);
            setErrorMsg('Bağlantı hatası: ' + err.message);
        });

        const heartbeatInterval = setInterval(() => {
            if (sessionCode) {
                updateDoc(doc(db, 'presentationSessions', sessionCode), {
                    phoneConnected: true,
                    lastPhoneSeen: serverTimestamp()
                }).catch(() => {});
            }
        }, 20000);

        return () => {
            unsub();
            clearInterval(heartbeatInterval);
        };
    }, [sessionCode]);

    // 3. Genel Komut Gönder
    const sendCommand = async (action: string, extra: Record<string, any> = {}) => {
        if (!sessionCode) return;

        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(35);
        }

        try {
            const docRef = doc(db, 'presentationSessions', sessionCode);
            await updateDoc(docRef, {
                command: {
                    id: Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
                    action,
                    ...extra,
                    timestamp: Date.now()
                },
                phoneConnected: true,
                lastPhoneSeen: serverTimestamp()
            });
        } catch (err) {
            console.error('Komut gönderilemedi:', err);
        }
    };

    // 4. Fare İmleci Pozisyonunu Firestore'a Senkronize Et (Throttled)
    const syncCursorToFirestore = useCallback(() => {
        if (!sessionCode) return;

        const now = Date.now();
        if (now - lastSyncTimeRef.current < 40) return; // 40ms throttle (~25 fps)
        lastSyncTimeRef.current = now;

        const docRef = doc(db, 'presentationSessions', sessionCode);
        updateDoc(docRef, {
            cursor: {
                x: cursorPosRef.current.x,
                y: cursorPosRef.current.y,
                lastMoved: now
            }
        }).catch(() => {});
    }, [sessionCode]);

    // Touchpad Dokunma Başladı
    const handleTouchpadStart = (e: React.TouchEvent | React.MouseEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        lastTouchRef.current = { x: clientX, y: clientY };
        touchStartTimeRef.current = Date.now();
        touchTotalDistanceRef.current = 0;
    };

    // Touchpad Parmak Kayıyor
    const handleTouchpadMove = (e: React.TouchEvent | React.MouseEvent) => {
        if ('cancelable' in e && e.cancelable) e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const dx = clientX - lastTouchRef.current.x;
        const dy = clientY - lastTouchRef.current.y;

        touchTotalDistanceRef.current += Math.hypot(dx, dy);
        lastTouchRef.current = { x: clientX, y: clientY };

        // Ekran boyutuna oranla yüzdeye çevir
        const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
        const winH = typeof window !== 'undefined' ? window.innerHeight : 640;

        let nextX = cursorPosRef.current.x + (dx / winW) * 100 * mouseSensitivity;
        let nextY = cursorPosRef.current.y + (dy / winH) * 100 * mouseSensitivity;

        nextX = Math.max(1, Math.min(99, Number(nextX.toFixed(2))));
        nextY = Math.max(1, Math.min(99, Number(nextY.toFixed(2))));

        cursorPosRef.current = { x: nextX, y: nextY };

        if (requestSyncRef.current) cancelAnimationFrame(requestSyncRef.current);
        requestSyncRef.current = requestAnimationFrame(syncCursorToFirestore);
    };

    // Touchpad Dokunma Bitti (Hızlı Dokunma = Tıklama)
    const handleTouchpadEnd = () => {
        const duration = Date.now() - touchStartTimeRef.current;
        // Eğer 250ms'den kısa sürdüyse ve parmak 12px'den az hareket ettiyse TIKLAMA say
        if (duration < 250 && touchTotalDistanceRef.current < 12) {
            handlePerformClick();
        }
    };

    // Tıklama Gerçekleştir
    const handlePerformClick = () => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(45);
        }
        sendCommand('click', {
            x: cursorPosRef.current.x,
            y: cursorPosRef.current.y
        });
    };

    const handleConnectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = inputCode.trim().toUpperCase();
        if (clean.length >= 4) {
            setSessionCode(clean);
        }
    };

    const handleDisconnect = () => {
        if (sessionCode) {
            updateDoc(doc(db, 'presentationSessions', sessionCode), {
                phoneConnected: false
            }).catch(() => {});
        }
        setSessionCode('');
        setIsConnected(false);
    };

    const progressPercent = sessionData.totalStepsCount > 0 
        ? Math.round(((sessionData.currentStepIndex + 1) / sessionData.totalStepsCount) * 100) 
        : 0;

    // ══════════════════════════════════════════════════════════════
    // EKRAN 1: KOD GİRİŞ EKRANI
    // ══════════════════════════════════════════════════════════════
    if (!isConnected) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 select-none font-sans">
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-base font-black tracking-tight text-white">Akıllı Kumanda & Fare</h1>
                            <p className="text-[11px] text-slate-400">Din Dersi Atölyesi</p>
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-sm mx-auto my-auto py-6">
                    <div className="bg-slate-900/80 border border-white/15 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-rose-500 mx-auto mb-4 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                                <Smartphone className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-xl font-black text-white">Tahtaya Bağlan</h2>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                Akıllı tahtadaki sunum ekranında <strong className="text-indigo-300">Kumanda (Q)</strong> butonuna tıklayıp 6 haneli oturum kodunu girin.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
                                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleConnectSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                                    Oturum Kodu (6 Hane)
                                </label>
                                <input
                                    type="text"
                                    maxLength={8}
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                    placeholder="Örn: 8K2N9F"
                                    className="w-full h-14 rounded-2xl bg-black/50 border-2 border-white/20 text-center font-mono text-2xl font-black tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                    autoCapitalize="characters"
                                    autoCorrect="off"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading || inputCode.trim().length < 4}
                                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-base shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Bağlanıyor...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span>Bağlan</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </div>
                </div>

                <div className="text-center text-[11px] text-slate-500 pb-2">
                    Kamera ile QR kodu okutursanız şifresiz anında bağlanabilirsiniz.
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════
    // EKRAN 2: AKTİF KUMANDA VE FARE EKRANI
    // ══════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-4 select-none font-sans touch-manipulation overflow-hidden">
            
            {/* ══ 1. ÜST BAŞLIK, MOD SEÇİCİ & DURUM BARI ══ */}
            <div className="flex-shrink-0 space-y-2.5">
                {/* Durum & Bilgi Kartı */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-xs font-black text-white truncate">
                                {sessionData.topicTitle || sessionData.courseTitle || 'Sunum'}
                            </h2>
                            <p className="text-[10px] text-slate-400 truncate">
                                Adım {sessionData.currentStepIndex + 1} / {sessionData.totalStepsCount || 1}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            onClick={() => sendCommand('blackout')}
                            className={cn(
                                "h-8 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-90 cursor-pointer",
                                sessionData.isBlackout
                                    ? "bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/40"
                                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                            )}
                            title="Tahtayı Karart"
                        >
                            <Moon className="w-3.5 h-3.5" />
                            <span className="text-[10px]">{sessionData.isBlackout ? 'Aç' : 'Karart'}</span>
                        </button>

                        <button
                            onClick={handleDisconnect}
                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                            title="Bağlantıyı Kes"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* MOD SEÇİCİ SEKMELER: Slayt Kumandası vs Dokunmatik Fare */}
                <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-white/10 shadow-inner">
                    <button
                        onClick={() => setActiveMode('slides')}
                        className={cn(
                            "h-10 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer",
                            activeMode === 'slides'
                                ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30"
                                : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Smartphone className="w-4 h-4" />
                        <span>Slayt Kumandası</span>
                    </button>

                    <button
                        onClick={() => setActiveMode('touchpad')}
                        className={cn(
                            "h-10 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer",
                            activeMode === 'touchpad'
                                ? "bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-md shadow-rose-600/30"
                                : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Touchpad className="w-4 h-4" />
                        <span>Dokunmatik Fare</span>
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* GÖRÜNÜM A: SLAYT KUMANDASI MODU (BÜYÜK TUŞLAR)             */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeMode === 'slides' && (
                <>
                    {/* Orta Alan: Aktif Adım Bilgisi */}
                    <div className="flex-shrink-0 my-auto py-2 text-center">
                        <button
                            onClick={() => setIsStepDrawerOpen(true)}
                            className="w-full p-4 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/40 transition-all text-center group cursor-pointer active:scale-98"
                        >
                            <span className="inline-block text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 mb-2">
                                Tahtada Gösterilen Adım
                            </span>
                            <h3 className="text-base sm:text-lg font-black text-white leading-snug line-clamp-2">
                                {sessionData.currentStepTitle || `Adım ${sessionData.currentStepIndex + 1}`}
                            </h3>
                            <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-400 group-hover:text-indigo-300 transition-colors">
                                <Layers className="w-3.5 h-3.5" />
                                <span>Tüm adımları açmak için dokunun (%{progressPercent})</span>
                            </div>
                        </button>
                    </div>

                    {/* Ana Kumanda Butonları: İleri & Geri */}
                    <div className="flex-1 flex flex-col justify-end gap-3 pb-2">
                        {/* DEV SONRAKİ BUTONU */}
                        <button
                            onClick={() => sendCommand('next')}
                            className="w-full h-32 sm:h-36 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-black text-2xl shadow-[0_10px_35px_rgba(79,70,229,0.4)] border-2 border-indigo-300/30 flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition-all cursor-pointer select-none ring-4 ring-indigo-500/20"
                        >
                            <div className="flex items-center gap-3">
                                <span className="tracking-wide">SONRAKİ</span>
                                <ChevronRight className="w-8 h-8 stroke-[3]" />
                            </div>
                            <span className="text-xs font-bold text-indigo-100 opacity-80">
                                {sessionData.currentStepIndex + 1 < sessionData.totalStepsCount ? 'Bir sonraki adıma geç' : 'Son adım'}
                            </span>
                        </button>

                        {/* ÖNCEKİ BUTONU */}
                        <button
                            onClick={() => sendCommand('prev')}
                            disabled={sessionData.currentStepIndex <= 0}
                            className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-200 hover:text-white font-bold text-base border border-white/15 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer select-none"
                        >
                            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                            <span>Önceki Adım</span>
                        </button>
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* GÖRÜNÜM B: DOKUNMATİK FARE MODU (TOUCHPAD & TIKLAMA)      */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeMode === 'touchpad' && (
                <div className="flex-1 flex flex-col justify-between my-2 gap-2 min-h-0">
                    
                    {/* TOUCHPAD YÜZEYİ */}
                    <div
                        onTouchStart={handleTouchpadStart}
                        onTouchMove={handleTouchpadMove}
                        onTouchEnd={handleTouchpadEnd}
                        onMouseDown={handleTouchpadStart}
                        onMouseMove={handleTouchpadMove}
                        onMouseUp={handleTouchpadEnd}
                        style={{ touchAction: 'none' }}
                        className="flex-1 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-indigo-500/40 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center touch-none select-none shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] active:border-rose-500 transition-colors cursor-crosshair min-h-[220px]"
                    >
                        {/* Arka Plan Izgara Çizgileri */}
                        <div 
                            className="absolute inset-0 opacity-10 pointer-events-none" 
                            style={{ 
                                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', 
                                backgroundSize: '24px 24px' 
                            }} 
                        />

                        {/* Ortadaki Yönlendirme İkonu */}
                        <div className="flex flex-col items-center gap-2 pointer-events-none opacity-40">
                            <Touchpad className="w-12 h-12 text-indigo-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                                Dokunmatik Touchpad Alanı
                            </span>
                            <span className="text-[10px] text-slate-400 text-center px-6">
                                Parmağınızı kaydırarak tahtadaki fareyi hareket ettirin. Dokunarak veya alttaki butondan tıklayın.
                            </span>
                        </div>
                    </div>

                    {/* BÜYÜK SOL TIKLA BUTONU */}
                    <div className="flex-shrink-0 flex gap-2">
                        <button
                            onClick={handlePerformClick}
                            className="flex-1 h-20 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black text-xl border-b-4 border-rose-800 active:border-b-0 active:translate-y-1 transition-all shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer select-none"
                        >
                            <MousePointer2 className="w-6 h-6 fill-white stroke-slate-950" />
                            <span>SOL TIKLA 🔘</span>
                        </button>

                        {/* Hızlı İleri/Geri Mini Tuşları (Touchpad modundayken de slayt değiştirebilmek için) */}
                        <div className="flex flex-col gap-1 w-28">
                            <button
                                onClick={() => sendCommand('next')}
                                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-1 active:scale-95"
                            >
                                <span>İleri</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => sendCommand('prev')}
                                disabled={sessionData.currentStepIndex <= 0}
                                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-white/15 text-xs font-bold text-slate-300 flex items-center justify-center gap-1 active:scale-95"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                <span>Geri</span>
                            </button>
                        </div>
                    </div>

                    {/* Hassasiyet Ayarı */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-[11px]">
                        <span className="text-slate-400 font-bold">Fare Hızı:</span>
                        <div className="flex items-center gap-1">
                            {[1.2, 1.6, 2.2].map((sens) => (
                                <button
                                    key={sens}
                                    onClick={() => setMouseSensitivity(sens)}
                                    className={cn(
                                        "px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer",
                                        mouseSensitivity === sens 
                                            ? "bg-indigo-600 text-white" 
                                            : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    {sens === 1.2 ? 'Yavaş' : sens === 1.6 ? 'Normal' : 'Hızlı'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ ALT HIZLI ARAÇLAR DOCK'U ══ */}
            <div className="flex-shrink-0 pt-2 border-t border-white/10">
                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={() => sendCommand('blackout')}
                        className={cn(
                            "h-11 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer",
                            sessionData.isBlackout
                                ? "bg-amber-500/30 border-amber-400 text-amber-200"
                                : "bg-slate-900/90 border-white/10 text-slate-300 hover:text-white"
                        )}
                        title="Tahtayı Karart"
                    >
                        <Moon className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold">Karart</span>
                    </button>

                    <button
                        onClick={() => sendCommand('toggleMenu')}
                        className="h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer"
                        title="Alt Menüyü Gizle / Aç"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold">Menü</span>
                    </button>

                    <button
                        onClick={() => sendCommand('timer', { seconds: 60 })}
                        className="h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer"
                        title="1 Dakikalık Sayaç Başlat"
                    >
                        <Timer className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[9px] font-bold">1 Dk Sayaç</span>
                    </button>

                    <button
                        onClick={() => setIsStepDrawerOpen(true)}
                        className="h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer"
                        title="Slayt Listesini Aç"
                    >
                        <ListFilter className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[9px] font-bold">Adımlar</span>
                    </button>
                </div>
            </div>

            {/* ══ TÜM ADIMLAR / SLAYTLAR ÇEKMECESİ ══ */}
            {isStepDrawerOpen && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end p-3 animate-in fade-in duration-200"
                    onClick={() => setIsStepDrawerOpen(false)}
                >
                    <div 
                        className="w-full max-h-[80vh] bg-slate-900 border border-white/20 rounded-3xl p-5 flex flex-col shadow-2xl animate-in slide-in-from-bottom-5 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                            <div>
                                <h3 className="text-base font-black text-white">Sunum Adımları</h3>
                                <p className="text-[11px] text-slate-400">Doğrudan geçmek istediğiniz adıma dokunun</p>
                            </div>
                            <button
                                onClick={() => setIsStepDrawerOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                            {sessionData.steps && sessionData.steps.length > 0 ? (
                                sessionData.steps.map((s, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            sendCommand('jump', { stepIndex: idx });
                                            setIsStepDrawerOpen(false);
                                        }}
                                        className={cn(
                                            "w-full p-3 rounded-2xl text-left flex items-center justify-between transition-all border cursor-pointer",
                                            idx === sessionData.currentStepIndex
                                                ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30"
                                                : "bg-white/5 border-white/5 hover:bg-white/10 text-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className={cn(
                                                "w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-black",
                                                idx === sessionData.currentStepIndex ? "bg-white/20 text-white" : "bg-black/30 text-slate-400"
                                            )}>
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-bold truncate">
                                                {s.title}
                                            </span>
                                        </div>
                                        {idx === sessionData.currentStepIndex && (
                                            <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full">
                                                Aktif
                                            </span>
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-8 text-xs text-slate-400">
                                    Adım listesi yükleniyor...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
