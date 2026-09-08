'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
    Smartphone, X, Check, Copy, ExternalLink, RefreshCw, 
    Wifi, Moon, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { 
    doc, onSnapshot, setDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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

    const lastCommandIdRef = useRef<string | number | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Oturum Kodunu Başlat / Yükle
    useEffect(() => {
        if (!isOpen) return;

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

    }, [isOpen]);

    // Firestore'da Oturumu Oluştur & Güncelle
    useEffect(() => {
        if (!sessionCode) return;

        const docRef = doc(db, 'presentationSessions', sessionCode);

        // İlk oturum dokümanını yaz
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

    // Sunum durumu (adım, karartma vb.) değiştikçe Firestore'a senkronize et
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

    // Telefondan gelen komutları dinle
    useEffect(() => {
        if (!sessionCode) return;

        const docRef = doc(db, 'presentationSessions', sessionCode);

        const unsub = onSnapshot(docRef, (snapshot) => {
            if (!snapshot.exists()) return;

            const data = snapshot.data();

            // Telefon bağlantı durumu kontrolü
            if (data.phoneConnected !== undefined) {
                setIsPhoneConnected(Boolean(data.phoneConnected));
            }

            // Komut yürütme
            const cmd = data.command;
            if (cmd && cmd.id && cmd.id !== lastCommandIdRef.current) {
                lastCommandIdRef.current = cmd.id;

                switch (cmd.action) {
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
        };
    }, [sessionCode, onNext, onPrev, onJump, onToggleBlackout, onToggleMenu, onStartTimer, isBlackout]);

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

    if (!isOpen) return null;

    return (
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
                                Mobil Kumanda
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-400/40">
                                    Canlı
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400">Telefondan sunumu ve slaytları yönetin</p>
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
                                <span className="text-sm font-bold">Telefon Bağlandı & Kumanda Aktif!</span>
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
                            Telefonunuzun kamerasını QR koda tutarak anında kumandayı açabilirsiniz. Şifre veya uygulama gerekmez.
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
                        <span className="text-[11px] font-bold text-slate-200">İleri / Geri</span>
                        <span className="text-[9px] text-slate-400">Tek tıkla slayt geçişi</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                        <Moon className="w-4 h-4 text-amber-400" />
                        <span className="text-[11px] font-bold text-slate-200">Tahtayı Karart</span>
                        <span className="text-[9px] text-slate-400">Dikkat çekme modu</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                        <Wifi className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] font-bold text-slate-200">Mobil Veri Uyumlu</span>
                        <span className="text-[9px] text-slate-400">MEB ağına bağımsız</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
