'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
    Smartphone, X, Check, Copy, ExternalLink, RefreshCw, 
    Wifi, Moon, ChevronRight, ListFilter, Timer 
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
    presentationTheme?: string;
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
    onStartTimer,
    presentationTheme = 'sketchnote'
}: PresentationRemoteModalProps) {
    const isLightUi = presentationTheme === 'clean-light' || presentationTheme === 'sketchnote';
    const { toast } = useToast();
    const [sessionCode, setSessionCode] = useState<string>('');
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [remoteUrl, setRemoteUrl] = useState<string>('');
    const [isPhoneConnected, setIsPhoneConnected] = useState<boolean>(false);
    const [lastActionName, setLastActionName] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);

    // Callbacks ref'lerde saklanarak Firestore dinleyicisinin yeniden başlatılması (thrashing) engellenir
    const callbacksRef = useRef({
        onNext,
        onPrev,
        onJump,
        onToggleBlackout,
        onToggleMenu,
        onStartTimer,
        isBlackout,
        currentStepIndex
    });

    useEffect(() => {
        callbacksRef.current = {
            onNext,
            onPrev,
            onJump,
            onToggleBlackout,
            onToggleMenu,
            onStartTimer,
            isBlackout,
            currentStepIndex
        };
    });

    const lastCommandIdRef = useRef<string | number | null>(null);

    // 1. Oturum Kodunu Başlat / Yükle
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

        QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' },
            errorCorrectionLevel: 'M'
        }).then(dataUri => {
            setQrDataUrl(dataUri);
        }).catch(err => {
            console.error('QR code generation error:', err);
        });
    }, []);

    // 2. Firestore'da Oturumu Başlat (Sadece sessionCode ilk oluştuğunda tek sefer çalışır)
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
            lastBoardUpdate: serverTimestamp()
        };

        setDoc(docRef, sessionPayload, { merge: true }).catch(err => {
            console.error('Failed to create remote session:', err);
        });
    }, [sessionCode]);

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

    // 4. İleri / Geri Klavye Olayı Tetikleyici (PDF ve Tüm Slaytlarla %100 Uyumlu)
    const dispatchArrowKey = useCallback((direction: 'next' | 'prev') => {
        const key = direction === 'next' ? 'ArrowRight' : 'ArrowLeft';
        const code = direction === 'next' ? 'ArrowRight' : 'ArrowLeft';
        const keyCode = direction === 'next' ? 39 : 37;

        const eventConfig = {
            key,
            code,
            keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
        };

        const winEvt = new KeyboardEvent('keydown', eventConfig);
        const docEvt = new KeyboardEvent('keydown', eventConfig);

        window.dispatchEvent(winEvt);
        document.dispatchEvent(docEvt);

        // Eğer aktif sayfa olayı tüketmediyse yedek olarak callback'i tetikle
        if (!winEvt.defaultPrevented && !docEvt.defaultPrevented) {
            if (direction === 'next') {
                callbacksRef.current.onNext();
            } else {
                callbacksRef.current.onPrev();
            }
        }
    }, []);

    // 5. Telefondan Gelen Komutları Dinleyen Kararlı Dinleyici
    useEffect(() => {
        if (!sessionCode) return;

        const docRef = doc(db, 'presentationSessions', sessionCode);

        const unsub = onSnapshot(docRef, (snapshot) => {
            if (!snapshot.exists()) return;

            const data = snapshot.data();

            if (data.phoneConnected !== undefined) {
                setIsPhoneConnected(Boolean(data.phoneConnected));
            }

            // Komut Yürütme
            const cmd = data.command;
            if (cmd && cmd.id && cmd.id !== lastCommandIdRef.current) {
                lastCommandIdRef.current = cmd.id;

                switch (cmd.action) {
                    case 'next':
                        dispatchArrowKey('next');
                        setLastActionName('Sonraki Adım');
                        break;
                    case 'prev':
                        dispatchArrowKey('prev');
                        setLastActionName('Önceki Adım');
                        break;
                    case 'jump':
                        if (typeof cmd.stepIndex === 'number') {
                            callbacksRef.current.onJump(cmd.stepIndex);
                            setLastActionName(`Adım ${cmd.stepIndex + 1}'e Atlandı`);
                        }
                        break;
                    case 'blackout':
                        callbacksRef.current.onToggleBlackout();
                        setLastActionName(callbacksRef.current.isBlackout ? 'Ekran Açıldı' : 'Tahta Karartıldı');
                        break;
                    case 'toggleMenu':
                        callbacksRef.current.onToggleMenu?.();
                        setLastActionName('Alt Menü');
                        break;
                    case 'timer':
                        if (typeof cmd.seconds === 'number') {
                            callbacksRef.current.onStartTimer?.(cmd.seconds);
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

        return () => {
            unsub();
        };
    }, [sessionCode, dispatchArrowKey]);

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

    // Modal kapalıysa hiçbir şey çizme (arka planda listener çalışmaya devam eder)
    if (!isOpen) return null;

    return (
        <div 
            className={cn(
                "fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200",
                isLightUi ? "bg-slate-900/50 backdrop-blur-sm" : "bg-slate-950/85 backdrop-blur-md"
            )}
            onClick={onClose}
        >
            <div 
                className={cn(
                    "relative w-full max-w-lg border rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden transition-colors",
                    isLightUi
                        ? "bg-white border-slate-200 text-slate-900"
                        : "bg-slate-900 border-white/20 text-white"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-500" />

                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-11 h-11 rounded-2xl border flex items-center justify-center", isLightUi ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-indigo-500/20 border-indigo-400/30 text-indigo-400")}>
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={cn("text-lg sm:text-xl font-black flex items-center gap-2", isLightUi ? "text-slate-900" : "text-white")}>
                                Mobil Sunum Kumandası
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold border", isLightUi ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-indigo-500/30 text-indigo-300 border-indigo-400/40")}>
                                    Canlı
                                </span>
                            </h3>
                            <p className={cn("text-xs", isLightUi ? "text-slate-500" : "text-slate-400")}>
                                Telefondan sunumu uzaktan yönetin
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer", isLightUi ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white")}
                        title="Kapat"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Bağlantı Durumu ve Aktif Slayt Özeti */}
                <div className="space-y-2.5 mb-5">
                    {isPhoneConnected ? (
                        <div className={cn("flex items-center justify-between px-4 py-2.5 rounded-2xl border", isLightUi ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-950/60 border-emerald-500/40 text-emerald-300")}>
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                <span className="text-xs sm:text-sm font-bold">Telefon Bağlandı • Kumanda Aktif</span>
                            </div>
                            {lastActionName && (
                                <span className={cn("text-xs px-2 py-0.5 rounded-md font-mono font-bold", isLightUi ? "bg-emerald-200/70 text-emerald-900" : "bg-emerald-500/20 text-emerald-200")}>
                                    {lastActionName}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className={cn("flex items-center justify-between px-4 py-2.5 rounded-2xl border", isLightUi ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-amber-950/40 border-amber-500/30 text-amber-300")}>
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                                <span className="text-xs sm:text-sm font-semibold">Telefon Bekleniyor... QR kodu okutun</span>
                            </div>
                            <button
                                onClick={handleRegenerateCode}
                                className={cn("text-xs flex items-center gap-1 font-bold cursor-pointer", isLightUi ? "text-amber-700 hover:text-amber-900" : "text-amber-400 hover:text-amber-200")}
                                title="Yeni Kod Üret"
                            >
                                <RefreshCw className="w-3 h-3" />
                                <span>Yenile</span>
                            </button>
                        </div>
                    )}

                    {totalStepsCount > 0 && (
                        <div className={cn("flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs", isLightUi ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-slate-300")}>
                            <span className="truncate font-bold">
                                <strong className={isLightUi ? "text-indigo-700" : "text-indigo-300"}>Adım {currentStepIndex + 1}/{totalStepsCount}:</strong>{' '}
                                {currentStepTitle || topicTitle || 'Sunum Akışı'}
                            </span>
                            <span className="text-[10px] font-mono opacity-75 shrink-0">
                                %{Math.round(((currentStepIndex + 1) / totalStepsCount) * 100)}
                            </span>
                        </div>
                    )}
                </div>

                {/* QR Kod & Kod Alanı */}
                <div className={cn("flex flex-col sm:flex-row items-center gap-5 p-4 sm:p-5 rounded-2xl border mb-5", isLightUi ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-white/10")}>
                    <div className="relative p-2.5 bg-white rounded-2xl border border-slate-200 shadow-md flex-shrink-0 flex items-center justify-center">
                        {qrDataUrl ? (
                            <img 
                                src={qrDataUrl} 
                                alt="Kumanda QR Kodu" 
                                className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-lg"
                            />
                        ) : (
                            <div className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center text-slate-400 text-xs">
                                QR Kod Hazırlanıyor...
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col gap-2.5 text-center sm:text-left w-full">
                        <div>
                            <span className={cn("text-[11px] uppercase tracking-wider font-bold", isLightUi ? "text-slate-500" : "text-slate-400")}>Oturum Kodu</span>
                            <div className="mt-0.5 flex items-center justify-center sm:justify-start gap-2">
                                <span className={cn("font-mono text-3xl font-black tracking-widest", isLightUi ? "text-indigo-700" : "text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-rose-300 to-amber-300")}>
                                    {sessionCode}
                                </span>
                            </div>
                        </div>

                        <p className={cn("text-xs leading-relaxed", isLightUi ? "text-slate-600" : "text-slate-300")}>
                            Kamerayı QR koda tutun; slayt geçişleri, karartma ve zamanlayıcı telefonunuzda anında açılır.
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopyLink}
                                className={cn("h-8 px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer", isLightUi ? "border-slate-300 bg-white hover:bg-slate-100 text-slate-800" : "border-white/20 bg-white/5 hover:bg-white/10 text-white")}
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Kopyalandı' : 'Linki Kopyala'}
                            </Button>

                            <a
                                href={remoteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn("h-8 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer", isLightUi ? "border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700" : "border-indigo-500/40 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200")}
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
                    <div className={cn("p-2.5 rounded-xl border flex flex-col items-center gap-1", isLightUi ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5")}>
                        <ChevronRight className="w-4 h-4 text-indigo-500" />
                        <span className={cn("text-[11px] font-bold", isLightUi ? "text-slate-800" : "text-slate-200")}>Slayt Geçişi</span>
                        <span className={cn("text-[9px]", isLightUi ? "text-slate-500" : "text-slate-400")}>İleri / Geri tuşları</span>
                    </div>

                    <div className={cn("p-2.5 rounded-xl border flex flex-col items-center gap-1", isLightUi ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5")}>
                        <Moon className="w-4 h-4 text-amber-500" />
                        <span className={cn("text-[11px] font-bold", isLightUi ? "text-slate-800" : "text-slate-200")}>Tahtayı Karart</span>
                        <span className={cn("text-[9px]", isLightUi ? "text-slate-500" : "text-slate-400")}>Odak modu</span>
                    </div>

                    <div className={cn("p-2.5 rounded-xl border flex flex-col items-center gap-1", isLightUi ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5")}>
                        <ListFilter className="w-4 h-4 text-emerald-500" />
                        <span className={cn("text-[11px] font-bold", isLightUi ? "text-slate-800" : "text-slate-200")}>Adım Listesi</span>
                        <span className={cn("text-[9px]", isLightUi ? "text-slate-500" : "text-slate-400")}>Slayta atla</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
