'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    X, Users, Sparkles, RotateCcw, UserMinus, Trophy, 
    Settings, Check, Maximize2, Minimize2, Volume2, VolumeX, Flame, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { SchoolClass, UserProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// ══ RENK PALETİ (Canlı & Zengin Oyun Teması) ══
const SLICE_COLORS = [
    { bg: '#3b82f6', text: '#ffffff', border: '#60a5fa' }, // Blue
    { bg: '#ec4899', text: '#ffffff', border: '#f472b6' }, // Pink
    { bg: '#10b981', text: '#ffffff', border: '#34d399' }, // Emerald
    { bg: '#f59e0b', text: '#ffffff', border: '#fbbf24' }, // Amber
    { bg: '#8b5cf6', text: '#ffffff', border: '#a78bfa' }, // Purple
    { bg: '#06b6d4', text: '#ffffff', border: '#22d3ee' }, // Cyan
    { bg: '#ef4444', text: '#ffffff', border: '#f87171' }, // Red
    { bg: '#14b8a6', text: '#ffffff', border: '#2dd4bf' }, // Teal
    { bg: '#f97316', text: '#ffffff', border: '#fb923c' }, // Orange
    { bg: '#6366f1', text: '#ffffff', border: '#818cf8' }, // Indigo
    { bg: '#84cc16', text: '#ffffff', border: '#a3e635' }, // Lime
    { bg: '#d946ef', text: '#ffffff', border: '#e879f9' }, // Fuchsia
];

// ══ WEB AUDIO SYNTHESIZER (Gerçek Zamanlı Fiziksel Tıkırtı & Fanfar Sesleri) ══
class WheelAudioEngine {
    private ctx: AudioContext | null = null;
    public isMuted: boolean = false;

    private getContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    // İbre çiviye çarptığında çıkan mekanik çıt sesi
    playTick(speedFactor: number = 1) {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            // Hıza göre tonlama: hızlıyken daha tiz, yavaşlarken daha tok ve tok ses
            const baseFreq = 400 + Math.min(speedFactor * 600, 1200);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(baseFreq * 1.5, now);
            filter.Q.setValueAtTime(3, now);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.04);
        } catch (e) {}
    }

    // Son saniyelerdeki heyecan yükseliş efekti (gerilim kalbi)
    playSuspenseTension() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(300, now + 0.3);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    // Kazanan belirlendiğinde çalan görkemli fanfar / alkış tınısı
    playVictoryFanfare() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Do Majör Akor
            notes.forEach((freq, i) => {
                const now = ctx.currentTime + (i * 0.08);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + (i === notes.length - 1 ? 1.2 : 0.4));

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + (i === notes.length - 1 ? 1.3 : 0.45));
            });
        } catch (e) {}
    }
}

const audioEngine = new WheelAudioEngine();

interface PresentationWheelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PresentationWheelModal({ isOpen, onClose }: PresentationWheelModalProps) {
    // Data States
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [classFilter, setClassFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Fullscreen Mode
    const [isWheelFullscreen, setIsWheelFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Mode: 'registered' (Kayıtlı Öğrenciler) | 'custom' (Özel İsim Listesi)
    const [pickerSource, setPickerSource] = useState<'registered' | 'custom'>('registered');
    const [customNamesText, setCustomNamesText] = useState('Ahmet\nMehmet\nAyşe\nFatma\nAli\nZeynep\nMustafa\nElif\nBurak\nCeren');

    // Wheel Spinning States
    const [isRolling, setIsRolling] = useState(false);
    const [spinPhase, setSpinPhase] = useState<'idle' | 'accel' | 'spinning' | 'tension' | 'winner'>('idle');
    const [winner, setWinner] = useState<{ id: string; name: string; avatarUrl?: string; className?: string } | null>(null);
    const [removedStudentIds, setRemovedStudentIds] = useState<Set<string>>(new Set());
    const [rotation, setRotation] = useState(0);
    const [needleAngle, setNeedleAngle] = useState(0);
    const [ledActiveIndex, setLedActiveIndex] = useState(0);

    // Animation Refs
    const requestRef = useRef<number | null>(null);
    const totalRotationRef = useRef<number>(0);
    const lastTickIndexRef = useRef<number>(-1);

    // Veri Çekme
    useEffect(() => {
        if (!isOpen) return;
        const fetchInitialData = async () => {
            setIsLoadingData(true);
            try {
                const [classesSnap, studentsSnap] = await Promise.all([
                    getDocs(query(collection(db, "classes"), orderBy("name"))),
                    getDocs(query(collection(db, "users"), where("role", "==", "guest")))
                ]);
                setAllClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass)));
                setAllStudents(studentsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
            } catch (error) {
                console.error("Error fetching students for wheel:", error);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchInitialData();
    }, [isOpen]);

    const selectedClassData = useMemo(() => allClasses.find(c => c.id === classFilter), [classFilter, allClasses]);

    // Aktif Dilimler Listesi
    const wheelItems = useMemo(() => {
        if (pickerSource === 'registered') {
            let list = allStudents;
            if (classFilter !== 'all' && selectedClassData) {
                if (branchFilter === 'all') {
                    list = list.filter(s => s.class?.startsWith(selectedClassData.name));
                } else {
                    const fullClassName = `${selectedClassData.name} - ${branchFilter}`;
                    list = list.filter(s => s.class === fullClassName);
                }
            }
            return list
                .filter(s => !removedStudentIds.has(s.uid))
                .map(s => ({
                    id: s.uid,
                    name: s.displayName || 'Öğrenci',
                    avatarUrl: s.avatarUrl,
                    className: s.class
                }));
        } else {
            const rawNames = customNamesText
                .split('\n')
                .map(n => n.trim())
                .filter(n => n.length > 0);
            return rawNames
                .map((name, idx) => ({
                    id: `custom-${idx}-${name}`,
                    name,
                    avatarUrl: undefined,
                    className: 'Özel Liste'
                }))
                .filter(it => !removedStudentIds.has(it.id));
        }
    }, [pickerSource, allStudents, classFilter, branchFilter, selectedClassData, removedStudentIds, customNamesText]);

    const totalSlices = wheelItems.length;
    const sliceAngle = 360 / (totalSlices || 1);

    // LED Işık Animasyonu Efekti
    useEffect(() => {
        const interval = setInterval(() => {
            setLedActiveIndex(prev => (prev + 1) % 24);
        }, isRolling ? 60 : 250);
        return () => clearInterval(interval);
    }, [isRolling]);

    // ══ SİNEMATİK & HEYECAN DOLU ÇARK FİZİĞİ DÖNÜŞ MOTORU ══
    const spinWheel = useCallback(() => {
        if (totalSlices < 2) {
            alert("Çarkı çevirmek için en az 2 öğrenci veya isim gereklidir.");
            return;
        }
        if (isRolling) return;

        setIsRolling(true);
        setWinner(null);
        setSpinPhase('accel');

        // Rastgele kazanan belirleme & durulacak tam açı hesabı
        const winningIndex = Math.floor(Math.random() * totalSlices);
        const randomOffsetInSlice = (Math.random() * 0.7 + 0.15) * sliceAngle; // Dilimin tam ortasına yakın dur
        const targetSliceAngleFromZero = (360 - (winningIndex * sliceAngle + randomOffsetInSlice)) % 360;

        // En az 7 tam tur + hedefe varış açısı
        const currentRot = totalRotationRef.current % 360;
        const extraSpins = 360 * (7 + Math.floor(Math.random() * 3));
        const delta = ((targetSliceAngleFromZero - currentRot + 360) % 360) + extraSpins;
        const startRot = totalRotationRef.current;
        const targetRot = startRot + delta;

        const totalDuration = 7800 + Math.random() * 1200; // ~8.5 saniyelik film tadında heyecan
        const startTime = performance.now();

        // Özel 4 Kademeli Gerilim Eğrisi (Exponential Tension Deceleration Curve)
        const getProgress = (t: number): number => {
            if (t <= 0.12) {
                // 1. Hızlı İvmelenme (Gaza basma)
                return Math.pow(t / 0.12, 2) * 0.15;
            } else if (t <= 0.70) {
                // 2. Yüksek Hızlı Dönüş ve Kademeli Yavaşlama
                const subT = (t - 0.12) / (0.70 - 0.12);
                return 0.15 + (1 - Math.pow(1 - subT, 2.5)) * 0.65;
            } else {
                // 3. Son 2 saniye: Heyecan Zirvesi (Tension Crawl / Kalp Atışı Yavaşlaması)
                const subT = (t - 0.70) / (1 - 0.70);
                // Ultra pürüzsüz ama sürünerek duran eğri
                return 0.80 + (1 - Math.pow(1 - subT, 4.5)) * 0.20;
            }
        };

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const linearProgress = Math.min(elapsed / totalDuration, 1);
            const curvedProgress = getProgress(linearProgress);

            const currentAngle = startRot + (targetRot - startRot) * curvedProgress;
            totalRotationRef.current = currentAngle;
            setRotation(currentAngle);

            // Anlık Hız (Dilim/Saniye)
            const speed = (1 - linearProgress);

            // Faz güncellemesi (Görsel efektler için)
            if (linearProgress < 0.15) {
                setSpinPhase('accel');
            } else if (linearProgress < 0.72) {
                setSpinPhase('spinning');
            } else {
                setSpinPhase('tension');
            }

            // İbre ve Çivi Çarpışma Mekaniği (Physical Peg Contact Simulation)
            const normalizedAngle = (currentAngle % 360 + 360) % 360;
            const slicePos = (normalizedAngle / sliceAngle);
            const currentSliceIdx = Math.floor(slicePos);
            const offsetInSlice = slicePos - currentSliceIdx;

            // İbre çivinin üzerinden geçerken eğilip sertçe geri atsın
            if (offsetInSlice < 0.35) {
                const bendRatio = Math.sin((offsetInSlice / 0.35) * Math.PI);
                const maxDeflection = Math.min(28, 10 + speed * 22);
                setNeedleAngle(-bendRatio * maxDeflection);
            } else {
                setNeedleAngle(0);
            }

            // Tıkırtı Sesi (Her dilim geçişinde)
            if (currentSliceIdx !== lastTickIndexRef.current) {
                lastTickIndexRef.current = currentSliceIdx;
                audioEngine.playTick(speed);
                if (linearProgress > 0.82 && Math.random() < 0.4) {
                    audioEngine.playSuspenseTension();
                }
            }

            if (linearProgress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            } else {
                // Çark Durdu! Minik geri sekme efekti ve Zafer Patlaması!
                setNeedleAngle(0);
                setIsRolling(false);
                setSpinPhase('winner');

                const chosenWinner = wheelItems[winningIndex];
                setWinner(chosenWinner);

                // Zafer Sesi & Konfeti Şöleni
                audioEngine.playVictoryFanfare();
                
                // Çok Katmanlı Havai Fişek & Konfeti Patlaması
                confetti({
                    particleCount: 180,
                    spread: 100,
                    origin: { y: 0.5 },
                    colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#ffffff', '#8b5cf6'],
                    scalar: 1.2
                });
                setTimeout(() => {
                    confetti({
                        particleCount: 100,
                        angle: 60,
                        spread: 70,
                        origin: { x: 0.1, y: 0.7 }
                    });
                    confetti({
                        particleCount: 100,
                        angle: 120,
                        spread: 70,
                        origin: { x: 0.9, y: 0.7 }
                    });
                }, 250);
            }
        };

        requestRef.current = requestAnimationFrame(animate);
    }, [totalSlices, isRolling, sliceAngle, wheelItems]);

    const removeCurrentStudent = () => {
        if (winner) {
            setRemovedStudentIds(prev => new Set(prev).add(winner.id));
            setWinner(null);
            setSpinPhase('idle');
        }
    };

    const resetStudentList = () => {
        setRemovedStudentIds(new Set());
        setWinner(null);
        setSpinPhase('idle');
    };

    const toggleMute = () => {
        const next = !isMuted;
        setIsMuted(next);
        audioEngine.isMuted = next;
    };

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div 
                className={cn(
                    "fixed inset-0 z-50 flex items-center justify-center select-none",
                    isWheelFullscreen ? "bg-slate-950 p-0" : "bg-slate-950/80 backdrop-blur-xl p-3 sm:p-6"
                )}
                onClick={isWheelFullscreen ? undefined : onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 30 }}
                    transition={{ type: "spring", damping: 25, stiffness: 260 }}
                    onClick={e => e.stopPropagation()}
                    className={cn(
                        "relative flex flex-col bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white overflow-hidden shadow-2xl transition-all duration-300",
                        isWheelFullscreen 
                            ? "w-screen h-screen max-w-none max-h-none rounded-none border-0" 
                            : "w-full max-w-5xl max-h-[94vh] rounded-[2.5rem] border-2 border-indigo-500/40 shadow-[0_0_80px_rgba(79,70,229,0.35)]"
                    )}
                >
                    {/* Parlak Üst Işık Çizgisi */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 via-pink-500 to-transparent z-30" />

                    {/* ══ ÜST HEADER BAR ══ */}
                    <div className={cn(
                        "flex items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex-shrink-0 z-20",
                        isWheelFullscreen ? "py-4 px-8" : "py-3.5 px-6"
                    )}>
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 border border-white/20">
                                <Sparkles className="w-5 h-5 text-slate-950 animate-spin" style={{ animationDuration: '6s' }} />
                            </div>
                            <div>
                                <h3 className={cn("font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-400 tracking-tight flex items-center gap-2", isWheelFullscreen ? "text-2xl" : "text-lg")}>
                                    ŞANSLI KURA ÇARKI
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                                    <span className="text-amber-300 font-bold">
                                        {pickerSource === 'registered' ? (selectedClassData ? `${selectedClassData.name} ${branchFilter !== 'all' ? `(${branchFilter})` : ''}` : 'Tüm Kayıtlı Sınıflar') : 'Özel Liste'}
                                    </span>
                                    <span>•</span>
                                    <span className="text-sky-400 font-black">{totalSlices} Kişi Hazır</span>
                                </div>
                            </div>
                        </div>

                        {/* Aksiyon Butonları */}
                        <div className="flex items-center gap-2">
                            {/* Ses Aç / Kapa */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMute}
                                className="h-9 w-9 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                                title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                            </Button>

                            {/* Tam Ekran Çevir Butonu */}
                            {isWheelFullscreen && (
                                <Button
                                    onClick={spinWheel}
                                    disabled={isRolling || totalSlices < 2}
                                    className="h-10 px-6 text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 rounded-xl shadow-lg shadow-amber-500/30 active:scale-95 transition-all cursor-pointer mr-1 animate-pulse"
                                >
                                    <Flame className="w-4 h-4 mr-1.5 fill-current text-amber-900" />
                                    {isRolling ? "Çark Dönüyor..." : "ÇEVİR"}
                                </Button>
                            )}

                            {/* Tam Ekran / Küçült Toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsWheelFullscreen(prev => !prev)}
                                className="h-9 px-3 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold gap-1.5 cursor-pointer"
                                title={isWheelFullscreen ? "Normal Görünüm" : "Tam Ekran Yap"}
                            >
                                {isWheelFullscreen ? (
                                    <>
                                        <Minimize2 className="w-4 h-4 text-rose-400" />
                                        <span className="hidden sm:inline">Küçült</span>
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 className="w-4 h-4 text-sky-400" />
                                        <span className="hidden sm:inline">Tam Ekran</span>
                                    </>
                                )}
                            </Button>

                            {/* Kapat */}
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Kapat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ══ ANA GÖVDE (Sol: Kontrol/Filtre, Sağ: Çark) ══ */}
                    <div className={cn(
                        "flex-1 flex overflow-hidden min-h-0 relative",
                        isWheelFullscreen ? "flex-col md:flex-row p-4 md:p-8 gap-8" : "flex-col md:flex-row p-4 md:p-6 gap-6"
                    )}>
                        {/* Arka Plan Atmosferik Parlamalar */}
                        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
                        <div className="absolute bottom-10 right-10 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

                        {/* SOL: Kontrol & Sınıf Seçimi */}
                        <div className={cn(
                            "flex flex-col gap-4 overflow-y-auto pr-1 flex-shrink-0 z-10",
                            isWheelFullscreen ? "w-full md:w-80" : "w-full md:w-80"
                        )}>
                            {/* Kaynak Seçimi (Kayıtlı vs Özel Liste) */}
                            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-white/10">
                                <button
                                    onClick={() => { setPickerSource('registered'); resetStudentList(); }}
                                    className={cn(
                                        "py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                                        pickerSource === 'registered'
                                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-900/50"
                                            : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Kayıtlı Öğrenciler
                                </button>
                                <button
                                    onClick={() => { setPickerSource('custom'); resetStudentList(); }}
                                    className={cn(
                                        "py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                                        pickerSource === 'custom'
                                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-900/50"
                                            : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Özel Liste
                                </button>
                            </div>

                            {/* Kayıtlı Öğrenci Sınıf Filtreleri */}
                            {pickerSource === 'registered' ? (
                                <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-300">Sınıf Seçimi</Label>
                                        <Select 
                                            value={classFilter} 
                                            onValueChange={val => { setClassFilter(val); setBranchFilter('all'); resetStudentList(); }}
                                            disabled={isRolling || isLoadingData}
                                        >
                                            <SelectTrigger className="bg-slate-950/80 border-white/10 h-10 text-xs text-white rounded-xl focus:ring-amber-400/40">
                                                <SelectValue placeholder="Sınıf Seçin..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/15 text-white">
                                                <SelectItem value="all">Tüm Öğrenciler ({allStudents.length})</SelectItem>
                                                {allClasses.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-300">Şube Seçimi</Label>
                                        <Select 
                                            value={branchFilter} 
                                            onValueChange={val => { setBranchFilter(val); resetStudentList(); }}
                                            disabled={!selectedClassData || isRolling}
                                        >
                                            <SelectTrigger className="bg-slate-950/80 border-white/10 h-10 text-xs text-white rounded-xl focus:ring-amber-400/40">
                                                <SelectValue placeholder="Şube Seçin..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/15 text-white">
                                                <SelectItem value="all">Tüm Şubeler</SelectItem>
                                                {selectedClassData?.branches?.map(b => (
                                                    <SelectItem key={b} value={b}>{b}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 flex-1 flex flex-col shadow-lg">
                                    <Label className="text-xs font-bold text-slate-300">İsim Listesi (Her Satıra Bir İsim)</Label>
                                    <textarea
                                        rows={isWheelFullscreen ? 8 : 5}
                                        value={customNamesText}
                                        onChange={e => { setCustomNamesText(e.target.value); resetStudentList(); }}
                                        disabled={isRolling}
                                        className="w-full flex-1 p-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white resize-none font-medium focus:outline-none focus:border-amber-400"
                                        placeholder="İsim 1&#10;İsim 2&#10;İsim 3..."
                                    />
                                </div>
                            )}

                            {/* İstatistik & Sıfırla */}
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-slate-400">
                                <div className="flex items-center gap-2 font-bold">
                                    <Users className="w-4 h-4 text-amber-400" />
                                    <span>Çarktaki Kişi: <strong className="text-white font-black">{totalSlices}</strong></span>
                                </div>
                                {removedStudentIds.size > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetStudentList}
                                        disabled={isRolling}
                                        className="h-7 px-2.5 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3 mr-1" /> Sıfırla ({removedStudentIds.size})
                                    </Button>
                                )}
                            </div>

                            {/* Büyük Çevir Butonu */}
                            <Button
                                size="lg"
                                onClick={spinWheel}
                                disabled={isRolling || totalSlices < 2}
                                className={cn(
                                    "w-full text-slate-950 shadow-2xl rounded-2xl transition-all active:scale-95 disabled:opacity-40 cursor-pointer mt-auto font-black uppercase tracking-wider relative overflow-hidden group",
                                    isWheelFullscreen 
                                        ? "h-16 text-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-amber-500/30" 
                                        : "h-14 text-lg bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-amber-500/25"
                                )}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                                <span className="relative flex items-center justify-center gap-2">
                                    <Flame className={cn("w-6 h-6 fill-current text-amber-900", isRolling && "animate-bounce")} />
                                    {isRolling ? "Çark Dönüyor..." : "ÇARKI ÇEVİR"}
                                </span>
                            </Button>
                        </div>

                        {/* SAĞ: SİNEMATİK DÖNEN ÇARK (LED IŞIKLAR, ÇİVİLER VE MEKANİK İBRE) */}
                        <div className={cn(
                            "flex-1 flex items-center justify-center relative bg-slate-950/60 rounded-3xl border border-white/10 overflow-hidden transition-all shadow-inner",
                            isWheelFullscreen ? "p-4 min-h-[440px]" : "p-2 min-h-[320px] md:min-h-[440px]"
                        )}>
                            {/* ══ 1. DIŞ LED IŞIK HALKASI (Chasing Arcade Lights) ══ */}
                            <div className={cn(
                                "relative aspect-square flex items-center justify-center",
                                isWheelFullscreen ? "w-[80vh] h-[80vh] max-w-[80vh]" : "w-full max-w-[380px] md:max-w-[460px]"
                            )}>
                                {/* LED Işık Noktaları */}
                                <div className="absolute inset-[-14px] md:inset-[-18px] rounded-full pointer-events-none z-10">
                                    {Array.from({ length: 24 }).map((_, i) => {
                                        const angle = (i / 24) * 2 * Math.PI;
                                        const x = 50 + 49 * Math.cos(angle);
                                        const y = 50 + 49 * Math.sin(angle);
                                        const isActive = (i + ledActiveIndex) % 3 === 0;
                                        return (
                                            <div 
                                                key={i}
                                                style={{ left: `${x}%`, top: `${y}%` }}
                                                className={cn(
                                                    "absolute w-2.5 h-2.5 md:w-3.5 md:h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150",
                                                    isActive 
                                                        ? "bg-amber-300 shadow-[0_0_12px_#fde047,0_0_20px_#f59e0b] scale-125" 
                                                        : "bg-slate-700/80 shadow-none scale-90"
                                                )}
                                            />
                                        );
                                    })}
                                </div>

                                {/* ══ 2. DÖNEN ANA ÇARK (SVG + DİLİMLER + ÇİVİLER) ══ */}
                                <div 
                                    className={cn(
                                        "w-full h-full rounded-full shadow-[0_0_100px_rgba(0,0,0,0.9)] relative overflow-hidden bg-slate-950 transition-none",
                                        isWheelFullscreen ? "border-[16px] border-slate-900" : "border-[12px] border-slate-900"
                                    )}
                                    style={{
                                        transform: `rotate(${rotation}deg)`,
                                        transition: 'none'
                                    }}
                                >
                                    {/* İç Gölgelendirme */}
                                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] z-10 pointer-events-none border-[4px] border-amber-400/40" />

                                    <svg viewBox="-1 -1 2 2" className="w-full h-full" style={{ transform: 'rotate(0deg)' }}>
                                        <defs>
                                            {/* Parlama Filtresi */}
                                            <radialGradient id="sliceGlow" cx="0" cy="0" r="1" fx="0" fy="0">
                                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                                                <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
                                                <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
                                            </radialGradient>
                                        </defs>

                                        {wheelItems.map((item, index) => {
                                            const startPercent = index / totalSlices;
                                            const endPercent = (index + 1) / totalSlices;

                                            const [startX, startY] = getCoordinatesForPercent(startPercent);
                                            const [endX, endY] = getCoordinatesForPercent(endPercent);
                                            const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;
                                            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                                            const theme = SLICE_COLORS[index % SLICE_COLORS.length];

                                            const midAngle = (startPercent + endPercent) * Math.PI;
                                            const textRadius = 0.65;
                                            const textX = Math.cos(midAngle) * textRadius;
                                            const textY = Math.sin(midAngle) * textRadius;
                                            const rotationDeg = (midAngle * 180) / Math.PI;

                                            // Dinamik Font Ölçeklendirme (Sınıfın arkasından okunacak netlik)
                                            const fontSize = Math.max(0.048, Math.min(0.092, 0.52 / (totalSlices > 0 ? totalSlices : 1)));
                                            const displayName = item.name.split(' ')[0].toUpperCase();

                                            // Dış Çember Çivisi (Peg)
                                            const pegRadius = 0.94;
                                            const pegX = Math.cos(startPercent * 2 * Math.PI) * pegRadius;
                                            const pegY = Math.sin(startPercent * 2 * Math.PI) * pegRadius;

                                            return (
                                                <g key={item.id}>
                                                    {/* Dilim Rengi */}
                                                    <path d={pathData} fill={theme.bg} stroke="#0f172a" strokeWidth="0.01" />
                                                    
                                                    {/* Dilim Üstü Parlama */}
                                                    <path d={pathData} fill="url(#sliceGlow)" />

                                                    {/* Çivi (Peg) */}
                                                    <circle 
                                                        cx={pegX} 
                                                        cy={pegY} 
                                                        r="0.024" 
                                                        fill="#fef08a" 
                                                        stroke="#78350f" 
                                                        strokeWidth="0.008" 
                                                    />

                                                    {/* Öğrenci Adı (Ultra Kontrastlı & Gölgeli) */}
                                                    <text
                                                        x={textX}
                                                        y={textY}
                                                        fill={theme.text}
                                                        fontSize={fontSize}
                                                        fontWeight="900"
                                                        fontFamily="'Arial Black', Impact, sans-serif"
                                                        textAnchor="middle"
                                                        alignmentBaseline="middle"
                                                        transform={`rotate(${rotationDeg}, ${textX}, ${textY})`}
                                                        style={{ 
                                                            filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 4px rgba(0,0,0,0.8))',
                                                            letterSpacing: '0.04em'
                                                        }}
                                                    >
                                                        {displayName}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>

                                {/* ══ 3. MEKANİK İBRE (Gerçekçi Tıklayan & Bükülen Altın İbre) ══ */}
                                <div 
                                    className="absolute right-[-14px] md:right-[-22px] top-1/2 -translate-y-1/2 z-30 pointer-events-none filter drop-shadow-[0_4px_16px_rgba(245,158,11,0.8)]"
                                    style={{
                                        transform: `translateY(-50%) rotate(${needleAngle}deg)`,
                                        transformOrigin: '95% 50%',
                                        transition: needleAngle === 0 ? 'transform 0.08s ease-out' : 'none'
                                    }}
                                >
                                    <div className="relative flex items-center">
                                        {/* İbre Gövdesi (Ok) */}
                                        <div className={cn(
                                            "w-0 h-0 border-t-transparent border-b-transparent",
                                            isWheelFullscreen 
                                                ? "border-t-[28px] border-r-[72px] border-b-[28px] border-r-amber-400" 
                                                : "border-t-[20px] border-r-[52px] border-b-[20px] border-r-amber-400"
                                        )} />
                                        
                                        {/* İbre İç Şerit (3D Vurgu) */}
                                        <div className={cn(
                                            "absolute left-2 w-0 h-0 border-t-transparent border-b-transparent",
                                            isWheelFullscreen
                                                ? "border-t-[14px] border-r-[38px] border-b-[14px] border-r-yellow-200"
                                                : "border-t-[10px] border-r-[26px] border-b-[10px] border-r-yellow-200"
                                        )} />

                                        {/* İbre Montaj Düğmesi */}
                                        <div className={cn(
                                            "absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border-2 border-slate-950 shadow-md",
                                            isWheelFullscreen ? "w-6 h-6" : "w-4 h-4"
                                        )} />
                                    </div>
                                </div>

                                {/* ══ 4. MERKEZ ÇEVİR DÜĞMESİ (3D Glowing Gold Arcade Button) ══ */}
                                <div 
                                    onClick={spinWheel}
                                    className={cn(
                                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[8px] border-slate-900 shadow-[0_0_50px_rgba(245,158,11,0.6)] flex items-center justify-center z-20 cursor-pointer hover:scale-105 active:scale-95 transition-all group overflow-hidden",
                                        isWheelFullscreen ? "w-32 h-32" : "w-24 h-24",
                                        isRolling ? "pointer-events-none opacity-90" : "animate-pulse"
                                    )}
                                >
                                    {/* Düğme Gradyan Yüzeyi */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 rounded-full" />
                                    <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                                    
                                    {/* Buton Yazısı */}
                                    <span className={cn(
                                        "relative text-slate-950 font-black tracking-tighter uppercase drop-shadow-sm flex flex-col items-center justify-center leading-none",
                                        isWheelFullscreen ? "text-xl" : "text-sm"
                                    )}>
                                        <Zap className={cn("w-4 h-4 mb-0.5 fill-current text-slate-950", isRolling && "animate-spin")} />
                                        {isRolling ? "DÖNÜYOR" : "ÇEVİR"}
                                    </span>
                                </div>
                            </div>

                            {/* ══ 5. KAZANAN ÖĞRENCİ BÜYÜK KUPA SAHNESİ (GRAND WINNER SPOTLIGHT) ══ */}
                            {winner && !isRolling && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.6, y: 40 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.6, y: 40 }}
                                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                    className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4"
                                >
                                    <div className={cn(
                                        "relative text-center bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-amber-400 rounded-[3rem] shadow-[0_0_120px_rgba(245,158,11,0.8)] w-full overflow-hidden",
                                        isWheelFullscreen ? "p-10 max-w-lg" : "p-7 max-w-md"
                                    )}>
                                        {/* Arka Plan Altın Işık */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-400/25 blur-3xl pointer-events-none" />

                                        {/* Kupa İkonu */}
                                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/40 border-2 border-white/40 animate-bounce">
                                            <Trophy className="w-11 h-11 fill-current" />
                                        </div>

                                        <div className="inline-block px-4 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 mb-2">
                                            <span className="text-xs font-black text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5" /> GÜNÜN ŞANSLISI <Sparkles className="w-3.5 h-3.5" />
                                            </span>
                                        </div>

                                        {/* Kazanan Öğrenci İsmi */}
                                        <h3 className={cn(
                                            "font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 my-3 uppercase tracking-tight drop-shadow-md",
                                            isWheelFullscreen ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl"
                                        )}>
                                            {winner.name}
                                        </h3>

                                        <p className="text-base text-slate-300 font-bold mb-8">
                                            {winner.className || "Öğrenci"}
                                        </p>

                                        {/* Aksiyon Butonları */}
                                        <div className="grid grid-cols-2 gap-3.5">
                                            <Button
                                                onClick={removeCurrentStudent}
                                                variant="destructive"
                                                className="h-14 text-sm font-black rounded-2xl border border-red-500/40 shadow-lg shadow-red-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                            >
                                                <UserMinus className="w-4 h-4 mr-1.5" /> Listeden Çıkar
                                            </Button>
                                            <Button
                                                onClick={() => { setWinner(null); setSpinPhase('idle'); }}
                                                className="h-14 text-sm font-black bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-2xl shadow-lg shadow-emerald-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                            >
                                                <Check className="w-5 h-5 mr-1.5" /> Devam Et
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
