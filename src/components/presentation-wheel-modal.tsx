'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    X, Users, Sparkles, RotateCcw, UserMinus, Trophy, 
    Check, Maximize2, Minimize2, Volume2, VolumeX, Flame, Zap, AlertCircle
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

// ══ ÖNBELLEK (Modal her açıldığında tekrar yüklenip donma yapmaması için) ══
let cachedClasses: SchoolClass[] | null = null;
let cachedStudents: UserProfile[] | null = null;

// ══ RENK PALETİ (Canlı & Zengin Oyun Teması) ══
const SLICE_COLORS = [
    { bg: '#2563eb', text: '#ffffff' }, // Royal Blue
    { bg: '#db2777', text: '#ffffff' }, // Magenta Pink
    { bg: '#059669', text: '#ffffff' }, // Emerald
    { bg: '#d97706', text: '#ffffff' }, // Amber
    { bg: '#7c3aed', text: '#ffffff' }, // Violet
    { bg: '#0891b2', text: '#ffffff' }, // Cyan
    { bg: '#dc2626', text: '#ffffff' }, // Red
    { bg: '#0d9488', text: '#ffffff' }, // Teal
    { bg: '#ea580c', text: '#ffffff' }, // Orange
    { bg: '#4f46e5', text: '#ffffff' }, // Indigo
    { bg: '#65a30d', text: '#ffffff' }, // Lime
    { bg: '#c026d3', text: '#ffffff' }, // Fuchsia
];

// ══ WEB AUDIO SYNTHESIZER (Gerçek Zamanlı Tıkırtı & Zafer Sesi) ══
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
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    playTick(speedFactor: number = 1) {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            const baseFreq = 350 + Math.min(speedFactor * 500, 900);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.03);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.035);
        } catch (e) {}
    }

    playVictoryFanfare() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const now = ctx.currentTime + (i * 0.07);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + (i === notes.length - 1 ? 1.0 : 0.35));

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + (i === notes.length - 1 ? 1.1 : 0.4));
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
    const [allClasses, setAllClasses] = useState<SchoolClass[]>(cachedClasses || []);
    const [allStudents, setAllStudents] = useState<UserProfile[]>(cachedStudents || []);
    const [classFilter, setClassFilter] = useState<string>('');
    const [branchFilter, setBranchFilter] = useState('all');
    const [isLoadingData, setIsLoadingData] = useState(!cachedClasses);

    // Fullscreen Mode
    const [isWheelFullscreen, setIsWheelFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Mode: 'registered' (Kayıtlı Öğrenciler) | 'custom' (Özel İsim Listesi)
    const [pickerSource, setPickerSource] = useState<'registered' | 'custom'>('registered');
    const [customNamesText, setCustomNamesText] = useState('Ahmet\nMehmet\nAyşe\nFatma\nAli\nZeynep\nMustafa\nElif\nBurak\nCeren');

    // Wheel Spinning States
    const [isRolling, setIsRolling] = useState(false);
    const [winner, setWinner] = useState<{ id: string; name: string; avatarUrl?: string; className?: string } | null>(null);
    const [removedStudentIds, setRemovedStudentIds] = useState<Set<string>>(new Set());
    const [rotation, setRotation] = useState(0);
    const [needleAngle, setNeedleAngle] = useState(0);
    const [ledActiveIndex, setLedActiveIndex] = useState(0);

    // Animation Refs
    const requestRef = useRef<number | null>(null);
    const totalRotationRef = useRef<number>(0);
    const lastTickIndexRef = useRef<number>(-1);

    // Veri Çekme (Sınıf seçilene kadar kimse gelmez)
    useEffect(() => {
        if (!isOpen) return;

        if (cachedClasses && cachedStudents) {
            setAllClasses(cachedClasses);
            setAllStudents(cachedStudents);
            setIsLoadingData(false);
            return;
        }

        const fetchInitialData = async () => {
            setIsLoadingData(true);
            try {
                const [classesSnap, studentsSnap] = await Promise.all([
                    getDocs(query(collection(db, "classes"), orderBy("name"))),
                    getDocs(query(collection(db, "users"), where("role", "==", "guest")))
                ]);

                const loadedClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
                const loadedStudents = studentsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

                cachedClasses = loadedClasses;
                cachedStudents = loadedStudents;

                setAllClasses(loadedClasses);
                setAllStudents(loadedStudents);
            } catch (error) {
                console.error("Error fetching students for wheel:", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchInitialData();
    }, [isOpen]);

    const selectedClassData = useMemo(() => allClasses.find(c => c.id === classFilter), [classFilter, allClasses]);

    // Aktif Sınıfın Öğrencileri (Maksimum 45 kişi - performans garantili)
    const wheelItems = useMemo(() => {
        if (pickerSource === 'registered') {
            if (!selectedClassData) return [];

            let list = allStudents.filter(s => s.class?.startsWith(selectedClassData.name));
            if (branchFilter !== 'all') {
                const fullClassName = `${selectedClassData.name} - ${branchFilter}`;
                list = list.filter(s => s.class === fullClassName);
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
    }, [pickerSource, allStudents, branchFilter, selectedClassData, removedStudentIds, customNamesText]);

    const totalSlices = wheelItems.length;
    const sliceAngle = 360 / (totalSlices || 1);

    // LED Işık Animasyonu (Hafif interval)
    useEffect(() => {
        const interval = setInterval(() => {
            setLedActiveIndex(prev => (prev + 1) % 24);
        }, isRolling ? 80 : 300);
        return () => clearInterval(interval);
    }, [isRolling]);

    // ══ SİNEMATİK DÖNÜŞ MOTORU ══
    const spinWheel = useCallback(() => {
        if (totalSlices < 2) {
            alert("Çarkı çevirmek için en az 2 öğrenci veya isim gereklidir.");
            return;
        }
        if (isRolling) return;

        setIsRolling(true);
        setWinner(null);

        // Rastgele kazanan belirleme & durulacak tam açı hesabı
        const winningIndex = Math.floor(Math.random() * totalSlices);
        const randomOffsetInSlice = (Math.random() * 0.7 + 0.15) * sliceAngle;
        const targetSliceAngleFromZero = (360 - (winningIndex * sliceAngle + randomOffsetInSlice)) % 360;

        // 6 ile 9 tam tur + hedefe varış açısı
        const currentRot = totalRotationRef.current % 360;
        const extraSpins = 360 * (6 + Math.floor(Math.random() * 3));
        const delta = ((targetSliceAngleFromZero - currentRot + 360) % 360) + extraSpins;
        const startRot = totalRotationRef.current;
        const targetRot = startRot + delta;

        const totalDuration = 7000 + Math.random() * 1000; // ~7.5 saniye
        const startTime = performance.now();

        // 4 Kademeli Gerilim Eğrisi
        const getProgress = (t: number): number => {
            if (t <= 0.15) {
                return Math.pow(t / 0.15, 2) * 0.18;
            } else if (t <= 0.70) {
                const subT = (t - 0.15) / (0.70 - 0.15);
                return 0.18 + (1 - Math.pow(1 - subT, 2.2)) * 0.62;
            } else {
                const subT = (t - 0.70) / (1 - 0.70);
                return 0.80 + (1 - Math.pow(1 - subT, 4.0)) * 0.20;
            }
        };

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const linearProgress = Math.min(elapsed / totalDuration, 1);
            const curvedProgress = getProgress(linearProgress);

            const currentAngle = startRot + (targetRot - startRot) * curvedProgress;
            totalRotationRef.current = currentAngle;
            setRotation(currentAngle);

            const speed = (1 - linearProgress);

            // İbre çiviye çarptığında bükülme
            const normalizedAngle = (currentAngle % 360 + 360) % 360;
            const slicePos = (normalizedAngle / sliceAngle);
            const currentSliceIdx = Math.floor(slicePos);
            const offsetInSlice = slicePos - currentSliceIdx;

            if (offsetInSlice < 0.35) {
                const bendRatio = Math.sin((offsetInSlice / 0.35) * Math.PI);
                const maxDeflection = Math.min(26, 8 + speed * 20);
                setNeedleAngle(-bendRatio * maxDeflection);
            } else {
                setNeedleAngle(0);
            }

            // Tıkırtı Sesi
            if (currentSliceIdx !== lastTickIndexRef.current) {
                lastTickIndexRef.current = currentSliceIdx;
                audioEngine.playTick(speed);
            }

            if (linearProgress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            } else {
                setNeedleAngle(0);
                setIsRolling(false);

                const chosenWinner = wheelItems[winningIndex];
                setWinner(chosenWinner);

                audioEngine.playVictoryFanfare();

                try {
                    confetti({
                        particleCount: 150,
                        spread: 90,
                        origin: { y: 0.55 },
                        colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#ffffff']
                    });
                } catch (e) {}
            }
        };

        requestRef.current = requestAnimationFrame(animate);
    }, [totalSlices, isRolling, sliceAngle, wheelItems]);

    const removeCurrentStudent = () => {
        if (winner) {
            setRemovedStudentIds(prev => new Set(prev).add(winner.id));
            setWinner(null);
        }
    };

    const resetStudentList = () => {
        setRemovedStudentIds(new Set());
        setWinner(null);
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
                    initial={{ scale: 0.92, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 280 }}
                    onClick={e => e.stopPropagation()}
                    className={cn(
                        "relative flex flex-col bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white overflow-hidden shadow-2xl transition-all duration-300",
                        isWheelFullscreen 
                            ? "w-screen h-screen max-w-none max-h-none rounded-none border-0" 
                            : "w-full max-w-5xl max-h-[94vh] rounded-[2.5rem] border-2 border-indigo-500/40 shadow-[0_0_80px_rgba(79,70,229,0.35)]"
                    )}
                >
                    {/* Üst Parlak Işık */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 via-pink-500 to-transparent z-30" />

                    {/* ══ ÜST HEADER ══ */}
                    <div className={cn(
                        "flex items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex-shrink-0 z-20",
                        isWheelFullscreen ? "py-4 px-8" : "py-3.5 px-6"
                    )}>
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 border border-white/20">
                                <Sparkles className="w-5 h-5 text-slate-950 animate-spin" style={{ animationDuration: '8s' }} />
                            </div>
                            <div>
                                <h3 className={cn("font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-400 tracking-tight flex items-center gap-2", isWheelFullscreen ? "text-2xl" : "text-lg")}>
                                    ŞANSLI KURA ÇARKI
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                                    <span className="text-amber-300 font-bold">
                                        {pickerSource === 'registered' 
                                            ? (selectedClassData ? `${selectedClassData.name} ${branchFilter !== 'all' ? `(${branchFilter})` : ''}` : 'Sınıf Seçiniz') 
                                            : 'Özel Liste'}
                                    </span>
                                    <span>•</span>
                                    <span className="text-sky-400 font-black">{totalSlices} Öğrenci</span>
                                </div>
                            </div>
                        </div>

                        {/* Sağ Aksiyon Butonları */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMute}
                                className="h-9 w-9 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                                title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                            </Button>

                            {isWheelFullscreen && (
                                <Button
                                    onClick={spinWheel}
                                    disabled={isRolling || totalSlices < 2}
                                    className="h-10 px-6 text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 rounded-xl shadow-lg shadow-amber-500/30 active:scale-95 transition-all cursor-pointer mr-1"
                                >
                                    <Flame className={cn("w-4 h-4 mr-1.5 fill-current text-amber-900", isRolling && "animate-bounce")} />
                                    {isRolling ? "Dönüyor..." : "ÇEVİR"}
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsWheelFullscreen(prev => !prev)}
                                className="h-9 px-3 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold gap-1.5 cursor-pointer"
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

                            <button 
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Kapat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ══ ANA GÖVDE ══ */}
                    <div className={cn(
                        "flex-1 flex overflow-hidden min-h-0 relative",
                        isWheelFullscreen ? "flex-col md:flex-row p-4 md:p-8 gap-8" : "flex-col md:flex-row p-4 md:p-6 gap-6"
                    )}>
                        {/* SOL: Kontroller */}
                        <div className={cn(
                            "flex flex-col gap-4 overflow-y-auto pr-1 flex-shrink-0 z-10",
                            isWheelFullscreen ? "w-full md:w-80" : "w-full md:w-80"
                        )}>
                            {/* Kaynak Seçimi */}
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

                            {/* Sınıf & Şube Seçimi */}
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
                                                {allClasses.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedClassData && selectedClassData.branches && selectedClassData.branches.length > 0 && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-300">Şube Seçimi</Label>
                                            <Select 
                                                value={branchFilter} 
                                                onValueChange={val => { setBranchFilter(val); resetStudentList(); }}
                                                disabled={isRolling}
                                            >
                                                <SelectTrigger className="bg-slate-950/80 border-white/10 h-10 text-xs text-white rounded-xl focus:ring-amber-400/40">
                                                    <SelectValue placeholder="Şube Seçin..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/15 text-white">
                                                    <SelectItem value="all">Tüm Şubeler</SelectItem>
                                                    {selectedClassData.branches.map(b => (
                                                        <SelectItem key={b} value={b}>{b}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
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

                            {/* Çevir Butonu */}
                            <Button
                                size="lg"
                                onClick={spinWheel}
                                disabled={isRolling || totalSlices < 2}
                                className={cn(
                                    "w-full text-slate-950 shadow-2xl rounded-2xl transition-all active:scale-95 disabled:opacity-40 cursor-pointer mt-auto font-black uppercase tracking-wider",
                                    isWheelFullscreen 
                                        ? "h-16 text-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-amber-500/30" 
                                        : "h-14 text-lg bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-amber-500/25"
                                )}
                            >
                                <Flame className={cn("w-6 h-6 mr-1.5 fill-current text-amber-900", isRolling && "animate-bounce")} />
                                {isRolling 
                                    ? "Çark Dönüyor..." 
                                    : (pickerSource === 'registered' && !classFilter 
                                        ? "Sınıf Seçiniz" 
                                        : (totalSlices < 2 ? "En Az 2 Kişi Gerekli" : "ÇARKI ÇEVİR"))}
                            </Button>
                        </div>

                        {/* SAĞ: HAFİF & AKICI DÖNEN ÇARK */}
                        <div className={cn(
                            "flex-1 flex items-center justify-center relative bg-slate-950/60 rounded-3xl border border-white/10 overflow-hidden transition-all shadow-inner",
                            isWheelFullscreen ? "p-4 min-h-[440px]" : "p-2 min-h-[320px] md:min-h-[440px]"
                        )}>
                            {totalSlices === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400 gap-4 max-w-md">
                                    <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-950/50">
                                        <Users className="w-8 h-8 text-amber-300 animate-pulse" />
                                    </div>
                                    <h4 className="text-xl font-black text-white">Sınıf Seçiniz</h4>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                        Kura çarkını çalıştırmak için lütfen sol taraftaki menüden bir sınıf seçin. Sadece seçtiğiniz sınıfın öğrencileri listelenecektir.
                                    </p>
                                </div>
                            ) : (
                                <div className={cn(
                                    "relative aspect-square flex items-center justify-center",
                                    isWheelFullscreen ? "w-[78vh] h-[78vh] max-w-[78vh]" : "w-full max-w-[360px] md:max-w-[440px]"
                                )}>
                                    {/* 24 LED Işık Noktası */}
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
                                                            ? "bg-amber-300 shadow-[0_0_12px_#fde047] scale-125" 
                                                            : "bg-slate-700/60 scale-90"
                                                    )}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Dönen Çark */}
                                    <div 
                                        className={cn(
                                            "w-full h-full rounded-full shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden bg-slate-950",
                                            isWheelFullscreen ? "border-[14px] border-slate-900" : "border-[10px] border-slate-900"
                                        )}
                                        style={{
                                            transform: `rotate(${rotation}deg)`,
                                            transition: 'none'
                                        }}
                                    >
                                        <svg viewBox="-1 -1 2 2" className="w-full h-full">
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

                                                const fontSize = Math.max(0.048, Math.min(0.09, 0.5 / (totalSlices > 0 ? totalSlices : 1)));
                                                const displayName = item.name.split(' ')[0].toUpperCase();

                                                const pegRadius = 0.94;
                                                const pegX = Math.cos(startPercent * 2 * Math.PI) * pegRadius;
                                                const pegY = Math.sin(startPercent * 2 * Math.PI) * pegRadius;

                                                return (
                                                    <g key={item.id}>
                                                        <path d={pathData} fill={theme.bg} stroke="#0f172a" strokeWidth="0.008" />
                                                        <circle cx={pegX} cy={pegY} r="0.022" fill="#fef08a" stroke="#78350f" strokeWidth="0.006" />
                                                        <text
                                                            x={textX}
                                                            y={textY}
                                                            fill={theme.text}
                                                            fontSize={fontSize}
                                                            fontWeight="900"
                                                            fontFamily="Arial Black, Impact, sans-serif"
                                                            textAnchor="middle"
                                                            dominantBaseline="central"
                                                            transform={`rotate(${rotationDeg}, ${textX}, ${textY})`}
                                                            stroke="#000000"
                                                            strokeWidth="0.003"
                                                            paintOrder="stroke fill"
                                                        >
                                                            {displayName}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    </div>

                                    {/* Mekanik İbre */}
                                    <div 
                                        className="absolute right-[-14px] md:right-[-20px] top-1/2 -translate-y-1/2 z-30 pointer-events-none filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.8)]"
                                        style={{
                                            transform: `translateY(-50%) rotate(${needleAngle}deg)`,
                                            transformOrigin: '95% 50%',
                                            transition: needleAngle === 0 ? 'transform 0.08s ease-out' : 'none'
                                        }}
                                    >
                                        <div className="relative flex items-center">
                                            <div className={cn(
                                                "w-0 h-0 border-t-transparent border-b-transparent",
                                                isWheelFullscreen 
                                                    ? "border-t-[26px] border-r-[68px] border-b-[26px] border-r-amber-400" 
                                                    : "border-t-[18px] border-r-[48px] border-b-[18px] border-r-amber-400"
                                            )} />
                                            <div className={cn(
                                                "absolute left-2 w-0 h-0 border-t-transparent border-b-transparent",
                                                isWheelFullscreen
                                                    ? "border-t-[13px] border-r-[36px] border-b-[13px] border-r-yellow-200"
                                                    : "border-t-[9px] border-r-[24px] border-b-[9px] border-r-yellow-200"
                                            )} />
                                            <div className={cn(
                                                "absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border-2 border-slate-950 shadow-md",
                                                isWheelFullscreen ? "w-6 h-6" : "w-4 h-4"
                                            )} />
                                        </div>
                                    </div>

                                    {/* Merkez Butonu */}
                                    <div 
                                        onClick={spinWheel}
                                        className={cn(
                                            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[7px] border-slate-900 shadow-[0_0_40px_rgba(245,158,11,0.6)] flex items-center justify-center z-20 cursor-pointer hover:scale-105 active:scale-95 transition-all group overflow-hidden",
                                            isWheelFullscreen ? "w-28 h-28" : "w-22 h-22",
                                            isRolling ? "pointer-events-none opacity-90" : "animate-pulse"
                                        )}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 rounded-full" />
                                        <span className={cn(
                                            "relative text-slate-950 font-black tracking-tighter uppercase flex flex-col items-center justify-center leading-none",
                                            isWheelFullscreen ? "text-lg" : "text-xs"
                                        )}>
                                            <Zap className={cn("w-4 h-4 mb-0.5 fill-current text-slate-950", isRolling && "animate-spin")} />
                                            {isRolling ? "DÖNÜYOR" : "ÇEVİR"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* ══ KAZANAN MODAL ══ */}
                            {winner && !isRolling && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.6, y: 30 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.6, y: 30 }}
                                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                    className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4"
                                >
                                    <div className={cn(
                                        "relative text-center bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-amber-400 rounded-[3rem] shadow-[0_0_100px_rgba(245,158,11,0.8)] w-full overflow-hidden",
                                        isWheelFullscreen ? "p-10 max-w-lg" : "p-7 max-w-md"
                                    )}>
                                        <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-amber-500/40 border-2 border-white/40 animate-bounce">
                                            <Trophy className="w-10 h-10 fill-current" />
                                        </div>

                                        <span className="text-xs font-black text-amber-300 uppercase tracking-widest bg-amber-400/15 px-3.5 py-1 rounded-full border border-amber-400/30">
                                            GÜNÜN ŞANSLISI
                                        </span>

                                        <h3 className={cn(
                                            "font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 my-3 uppercase tracking-tight",
                                            isWheelFullscreen ? "text-5xl" : "text-4xl"
                                        )}>
                                            {winner.name}
                                        </h3>

                                        <p className="text-base text-slate-300 font-bold mb-7">
                                            {winner.className || "Öğrenci"}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3.5">
                                            <Button
                                                onClick={removeCurrentStudent}
                                                variant="destructive"
                                                className="h-13 text-xs font-black rounded-2xl border border-red-500/40 cursor-pointer"
                                            >
                                                <UserMinus className="w-4 h-4 mr-1.5" /> Listeden Çıkar
                                            </Button>
                                            <Button
                                                onClick={() => setWinner(null)}
                                                className="h-13 text-xs font-black bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-2xl shadow-lg shadow-emerald-950/50 cursor-pointer"
                                            >
                                                <Check className="w-4 h-4 mr-1.5" /> Devam Et
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
