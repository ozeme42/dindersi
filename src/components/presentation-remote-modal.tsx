'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { 
    Smartphone, X, Check, Copy, ExternalLink, RefreshCw, 
    Wifi, Moon, ChevronRight, MousePointer2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { 
    doc, onSnapshot, setDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface PresentationRemoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseTitle?: string;
    unitTitle?: string;
    topicTitle?: string;
    currentStepIndex: number;
    totalStepsCount: number;
    currentStepTitle?: string;
    steps?: { title?: string; type?: string }[];
    onNext: () => void;
    onPrev: () => void;
    onJump: (index: number) => void;
    isBlackout: boolean;
    onToggleBlackout: () => void;
    onToggleMenu?: () => void;
    onStartTimer?: (seconds: number) => void;
}

function generateSessionCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export function PresentationRemoteModal({
    isOpen,
    onClose,
    courseTitle = '',
    unitTitle = '',
    topicTitle = '',
    currentStepIndex,
    totalStepsCount,
    currentStepTitle = '',
    steps = [],
    onNext,
    onPrev,
    onJump,
    isBlackout,
    onToggleBlackout,
    onToggleMenu,
    onStartTimer
}: PresentationRemoteModalProps) {
    const { toast } = useToast();
    const [sessionCode, setSessionCode] = useState<string>('');
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [remoteUrl, setRemoteUrl] = useState<string>('');
    const [isPhoneConnected, setIsPhoneConnected] = useState<boolean>(false);
    const [lastActionName, setLastActionName] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);

    // ══ SANAL FARE İMLECİ & TIKLAMA STATE'LERİ ══
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
    const [isCursorVisible, setIsCursorVisible] = useState<boolean>(false);
    const [clickRipplePos, setClickRipplePos] = useState<{ x: number; y: number } | null>(null);
    const [fullscreenElement, setFullscreenElement] = useState<Element | null>(null);
    const cursorHideTimerRef = useRef<NodeJS.Timeout | null>(null);

    const lastCommandIdRef = useRef<string | number | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Tam ekran element takibi (Fullscreen esnasında imlecin görünür kalması için portal)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setFullscreenElement(document.fullscreenElement);
        };
        handleFullscreenChange();
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // 1. Oturum Kodunu Başlat / Yükle (Bileşen mount olduğunda arka planda daima çalışır)
    useEffect(() => {
        let code = '';
        try {
            const saved = sessionStorage.getItem('dindersi_remote_session');
            if (saved && saved.length === 6) {
                code = saved;
            }
        } catch {}

        if (!code) {
            code = generateSessionCode();
            try {
                sessionStorage.setItem('dindersi_remote_session', code);
            } catch {}
        }

        setSessionCode(code);

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${origin}/remote?code=${code}`;
        setRemoteUrl(url);

        // QR Kodu Oluştur
        QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
        }).then(dataUri => {
            setQrDataUrl(dataUri);
        }).catch(err => {
            console.error('QR code generation error:', err);
        });

    }, []);

    // 2. Firestore'da Oturumu Oluştur & Güncelle
    useEffect(() => {
        if (!sessionCode) return;

        const docRef = doc(db, 'presentationSessions', sessionCode);

        const sessionPayload = {
            sessionCode,
            status: 'active',
            courseTitle,
            unitTitle,
            topicTitle,
            currentStepIndex,
            totalStepsCount,
            currentStepTitle,
            steps: steps.map((s, idx) => ({
                index: idx,
                title: s.title || `Adım ${idx + 1}`,
                type: s.type || ''
            })),
            isBlackout,
            phoneConnected: isPhoneConnected,
            lastBoardUpdate: serverTimestamp()
        };

        setDoc(docRef, sessionPayload, { merge: true }).catch(err => {
            console.error('Failed to create remote session in Firestore:', err);
        });

    }, [sessionCode, courseTitle, unitTitle, topicTitle, steps]);

    // 3. Sunum durumu değiştikçe Firestore'a senkronize et
    useEffect(() => {
        if (!sessionCode) return;

        const docRef = doc(db, 'presentationSessions', sessionCode);
        updateDoc(docRef, {
            currentStepIndex,
            totalStepsCount,
            currentStepTitle,
            isBlackout,
            lastBoardUpdate: serverTimestamp()
        }).catch(() => {});
    }, [sessionCode, currentStepIndex, totalStepsCount, currentStepTitle, isBlackout]);

    // 4. Gerçek Tıklama Simülasyonu
    const simulateClick = useCallback((xPercent: number, yPercent: number) => {
        const pxX = (window.innerWidth * xPercent) / 100;
        const pxY = (window.innerHeight * yPercent) / 100;

        // Tıklama dalgası efektini göster
        setClickRipplePos({ x: pxX, y: pxY });
        setTimeout(() => setClickRipplePos(null), 500);

        // İmleci anlık gizle ki elementFromPoint kendi imlecimize çarpmasın
        const cursorEl = document.getElementById('remote-board-cursor');
        if (cursorEl) cursorEl.style.visibility = 'hidden';

        const element = document.elementFromPoint(pxX, pxY);

        if (cursorEl) cursorEl.style.visibility = 'visible';

        if (element && element instanceof HTMLElement) {
            const eventConfig = { 
                view: window, 
                bubbles: true, 
                cancelable: true, 
                clientX: pxX, 
                clientY: pxY 
            };

            element.dispatchEvent(new PointerEvent('pointerdown', eventConfig));
            element.dispatchEvent(new MouseEvent('mousedown', eventConfig));
            element.dispatchEvent(new PointerEvent('pointerup', eventConfig));
            element.dispatchEvent(new MouseEvent('mouseup', eventConfig));
            element.dispatchEvent(new MouseEvent('click', eventConfig));

            // Doğrudan tıklama tetikleyicisi
            try {
                element.click();
            } catch {}
        }
    }, []);

    // 5. Telefondan gelen komutları ve fare hareketlerini dinle
    useEffect(() => {
        if (!sessionCode) return;

        const docRef = doc(db, 'presentationSessions', sessionCode);

        const unsub = onSnapshot(docRef, (snapshot) => {
            if (!snapshot.exists()) return;

            const data = snapshot.data();

            // Telefon bağlantı durumu
            if (data.phoneConnected !== undefined) {
                setIsPhoneConnected(Boolean(data.phoneConnected));
            }

            // Fare İmleci Pozisyonu
            if (data.cursor && typeof data.cursor.x === 'number' && typeof data.cursor.y === 'number') {
                setCursorPos({ x: data.cursor.x, y: data.cursor.y });
                setIsCursorVisible(true);

                // 8 saniye boyunca hareket olmazsa imleci gizle
                if (cursorHideTimerRef.current) clearTimeout(cursorHideTimerRef.current);
                cursorHideTimerRef.current = setTimeout(() => {
                    setIsCursorVisible(false);
                }, 8000);
            }

            // Komut yürütme
            const cmd = data.command;
            if (cmd && cmd.id && cmd.id !== lastCommandIdRef.current) {
                lastCommandIdRef.current = cmd.id;

                switch (cmd.action) {
                    case 'click':
                        simulateClick(
                            typeof cmd.x === 'number' ? cmd.x : cursorPos.x, 
                            typeof cmd.y === 'number' ? cmd.y : cursorPos.y
                        );
                        setLastActionName('Tıklandı 🔘');
                        break;
                    case 'next':
                        onNext();
                        setLastActionName('Sonraki Adım');
                        break;
                    case 'prev':
                        onPrev();
                        setLastActionName('Önceki Adım');
                        break;
                    case 'jump':
                        if (typeof cmd.stepIndex === 'number') {
                            onJump(cmd.stepIndex);
                            setLastActionName(`Adım ${cmd.stepIndex + 1}'e Atlandı`);
                        }
                        break;
                    case 'blackout':
                        onToggleBlackout();
                        setLastActionName(isBlackout ? 'Ekran Açıldı' : 'Tahta Karartıldı');
                        break;
                    case 'toggleMenu':
                        onToggleMenu?.();
                        setLastActionName('Alt Menü Geçişi');
                        break;
                    case 'timer':
                        if (typeof cmd.seconds === 'number') {
                            onStartTimer?.(cmd.seconds);
                            setLastActionName(`Sayaç (${cmd.seconds}s)`);
                        }
                        break;
                    default:
                        break;
                }

                setTimeout(() => setLastActionName(''), 2500);
            }
        }, (error) => {
            console.error('Remote session listener error:', error);
        });

        unsubscribeRef.current = unsub;

        return () => {
            unsub();
            if (cursorHideTimerRef.current) clearTimeout(cursorHideTimerRef.current);
        };
    }, [sessionCode, onNext, onPrev, onJump, onToggleBlackout, onToggleMenu, onStartTimer, isBlackout, simulateClick, cursorPos]);

    const handleCopyLink = async () => {
        if (!remoteUrl) return;
        try {
            await navigator.clipboard.writeText(remoteUrl);
            setCopied(true);
            toast({ title: "Kopyalandı", description: "Kumanda bağlantı linki panoya kopyalandı." });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({ title: "Hata", description: "Bağlantı kopyalanamadı.", variant: "destructive" });
        }
    };

    const handleRegenerateCode = () => {
        const newCode = generateSessionCode();
        try {
            sessionStorage.setItem('dindersi_remote_session', newCode);
        } catch {}
        setSessionCode(newCode);
        setIsPhoneConnected(false);
        toast({ title: "Yenilendi", description: "Yeni kumanda kodu oluşturuldu." });
    };

    // ══ SANAL FARE İMLECİ & LAZER GÖRÜNÜMÜ ══
    const cursorElement = isCursorVisible && (
        <div
            id="remote-board-cursor"
            className="fixed pointer-events-none z-[9999] transition-transform duration-75 ease-out select-none"
            style={{
                left: `${cursorPos.x}%`,
                top: `${cursorPos.y}%`,
                transform: 'translate(-4px, -2px)'
            }}
        >
            <div className="relative">
                {/* Şık SVG İmleç Oku */}
                <svg width="34" height="34" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))' }}>
                    <path 
                        d="M4.5 2.5 L4.5 21 L10 15 L14.5 23 L18 21 L13.5 13 L21 13 Z" 
                        fill="#4f46e5" 
                        stroke="#ffffff" 
                        strokeWidth="1.75" 
                        strokeLinejoin="round"
                    />
                </svg>

                {/* İmleç Ucundaki Kırmızı Lazer Noktası */}
                <div className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-[0_0_12px_rgba(244,63,94,1)] animate-pulse" />
            </div>
        </div>
    );

    // Tıklama Dalgası (Click Ripple)
    const clickRippleElement = clickRipplePos && (
        <div
            className="fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-4 border-rose-500 bg-rose-500/25 animate-out zoom-out-150 fade-out duration-500 select-none"
            style={{
                left: clickRipplePos.x,
                top: clickRipplePos.y
            }}
        />
    );

    // Tam ekrandayken imleci tam ekran elementine portal et
    const renderCursorAndRipple = (
        <>
            {fullscreenElement ? createPortal(cursorElement, fullscreenElement) : cursorElement}
            {fullscreenElement ? createPortal(clickRippleElement, fullscreenElement) : clickRippleElement}
        </>
    );

    return (
        <>
            {renderCursorAndRipple}

            {/* QR Kod Modalı (Sadece isOpen true iken görünür) */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
                    onClick={onClose}
                >
                    <div 
                        className="relative w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Üst Işıltı Efekti */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-500" />

                        {/* Başlık ve Kapat Butonu */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                                        Mobil Kumanda & Fare
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-400/40">
                                            Canlı
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-400">Telefondan sunumu ve fareyi uzaktan yönetin</p>
                                </div>
                            </div>

                            <button 
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Kapat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Bağlantı Durumu Rozeti */}
                        <div className="mb-6">
                            {isPhoneConnected ? (
                                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                    <div className="flex items-center gap-2.5">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-sm font-bold">Telefon Bağlandı! Kumanda & Fare Aktif</span>
                                    </div>
                                    {lastActionName && (
                                        <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-md font-mono font-bold text-emerald-200">
                                            {lastActionName}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-300">
                                    <div className="flex items-center gap-2.5">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                        </span>
                                        <span className="text-xs sm:text-sm font-semibold">Telefon Bekleniyor... QR kodu okutun</span>
                                    </div>
                                    <button
                                        onClick={handleRegenerateCode}
                                        className="text-xs text-amber-400/80 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                                        title="Yeni Kod Üret"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Yenile</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* QR Kod & Kod Alanı */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-950/60 p-5 rounded-2xl border border-white/10 mb-6">
                            {/* QR Kod Kutusu */}
                            <div className="relative p-2.5 bg-white rounded-2xl shadow-xl flex-shrink-0 flex items-center justify-center">
                                {qrDataUrl ? (
                                    <img 
                                        src={qrDataUrl} 
                                        alt="Kumanda QR Kodu" 
                                        className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
                                    />
                                ) : (
                                    <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-slate-400 text-xs">
                                        QR Kod Hazırlanıyor...
                                    </div>
                                )}
                            </div>

                            {/* Sağ Taraf: Açıklama ve Kod */}
                            <div className="flex-1 flex flex-col gap-3 text-center sm:text-left w-full">
                                <div>
                                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Oturum Kodu</span>
                                    <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
                                        <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-rose-300 to-amber-300">
                                            {sessionCode}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Telefonunuzun kamerasını QR koda tutarak anında bağlanabilirsiniz. Slayt geçişi ve dokunmatik fare modu kullanıma hazır olacaktır.
                                </p>

                                <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopyLink}
                                        className="h-8 px-3 rounded-xl border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-bold gap-1.5 cursor-pointer"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? 'Kopyalandı' : 'Linki Kopyala'}
                                    </Button>

                                    <a
                                        href={remoteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-8 px-3 rounded-xl border border-indigo-500/40 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Bu Cihazda Kumandayı Test Et"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Test Et</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Özellikler Özeti */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                                <ChevronRight className="w-4 h-4 text-indigo-400" />
                                <span className="text-[11px] font-bold text-slate-200">Slayt Kumandası</span>
                                <span className="text-[9px] text-slate-400">Büyük İleri / Geri tuşları</span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                                <MousePointer2 className="w-4 h-4 text-rose-400" />
                                <span className="text-[11px] font-bold text-slate-200">Dokunmatik Fare</span>
                                <span className="text-[9px] text-slate-400">Touchpad & Tıklama</span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                                <Moon className="w-4 h-4 text-amber-400" />
                                <span className="text-[11px] font-bold text-slate-200">Tahtayı Karart</span>
                                <span className="text-[9px] text-slate-400">Dikkat çekme modu</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
