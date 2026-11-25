'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    X, Users, RotateCcw, UserMinus, Trophy,
    Check, Maximize2, Minimize2, Volume2, VolumeX, Flame, Zap,
    Shuffle, Clock, Award, History, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { SchoolClass, UserProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getGlobalSoundEnabled, playSound } from '@/lib/audio-service';

// ══ ÖNBELLEK VE OTURUM HAFIZASI ══
let cachedClasses: SchoolClass[] | null = null;
let cachedStudents: UserProfile[] | null = null;
let lastSelectedClassFilter: string = '';
let lastSelectedBranchFilter: string = 'all';
let lastPickerSource: 'registered' | 'custom' = 'registered';
let lastCustomNamesText: string = 'Ahmet\nMehmet\nAyşe\nFatma\nAli\nZeynep\nMustafa\nElif\nBurak\nCeren';
let lastRemovedStudentIds: Set<string> = new Set();

// ══ ZENGİN STÜDYO ÇARK RENK PALETİ ══
const SLICE_COLORS = [
    { bg: '#2563eb', dark: '#1e3a8a', text: '#ffffff' },
    { bg: '#db2777', dark: '#831843', text: '#ffffff' },
    { bg: '#059669', dark: '#064e3b', text: '#ffffff' },
    { bg: '#d97706', dark: '#78350f', text: '#ffffff' },
    { bg: '#7c3aed', dark: '#4c1d95', text: '#ffffff' },
    { bg: '#0891b2', dark: '#164e63', text: '#ffffff' },
    { bg: '#dc2626', dark: '#7f1d1d', text: '#ffffff' },
    { bg: '#0d9488', dark: '#134e4a', text: '#ffffff' },
    { bg: '#ea580c', dark: '#7c2d12', text: '#ffffff' },
    { bg: '#4f46e5', dark: '#312e81', text: '#ffffff' },
    { bg: '#65a30d', dark: '#365314', text: '#ffffff' },
    { bg: '#c026d3', dark: '#701a75', text: '#ffffff' },
];

type SpinDurationMode = 'fast' | 'normal' | 'dramatic';
const DURATION_SECONDS: Record<SpinDurationMode, number> = {
    fast: 4.6,
    normal: 7.4,
    dramatic: 10.6,
};

interface WheelCandidate {
    id: string;
    name: string;
    avatarUrl?: string;
    className?: string;
}

// ══ GERÇEKÇİ AKUSTİK ÇARK SES MOTORU (Web Audio API) ══
class WheelAudioEngine {
    private ctx: AudioContext | null = null;
    private noiseBuffer: AudioBuffer | null = null;
    public isMuted: boolean = false;

    private getContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
        if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
            return this.noiseBuffer;
        }
        const length = Math.floor(ctx.sampleRate * 0.045);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.22));
        }
        this.noiseBuffer = buffer;
        return buffer;
    }

    /** Esnek mekanik mandalın pirinç pime çarpıp kurtulma sesi (doğal organik varyasyonlu) */
    playPegTick(speedNorm: number = 0.5) {
        if (this.isMuted || !getGlobalSoundEnabled()) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const clamped = Math.max(0, Math.min(1, speedNorm));
            // Her vuruşta hafif doğal ton farkı (±%5)
            const jitter = 0.95 + Math.random() * 0.1;

            // 1. Katman: Derin ahşap/plastik vuruş gövdesi (hız düştükçe baslaşır)
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            const startFreq = (320 + clamped * 560) * jitter;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(78 * jitter, now + 0.032);

            oscGain.gain.setValueAtTime((0.2 + clamped * 0.08) * jitter, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.036);
            osc.connect(oscGain);
            oscGain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.04);

            // 2. Katman: Sert pirinç-mandal sürtünme çıt sesi
            const src = ctx.createBufferSource();
            src.buffer = this.getNoiseBuffer(ctx);
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime((1450 + clamped * 1450) * jitter, now);
            filter.Q.setValueAtTime(2.6, now);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.24 * jitter, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);

            src.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            src.start(now);
        } catch {}
    }

    /** Çarkın kolla savrulma başlangıç sesi */
    playSpinLaunch() {
        if (this.isMuted || !getGlobalSoundEnabled()) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(480, now + 0.22);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.26);
        } catch {}
    }

    /** Kazanan zafer fanfarı */
    playVictoryFanfare() {
        if (this.isMuted || !getGlobalSoundEnabled()) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
            notes.forEach((freq, i) => {
                const start = ctx.currentTime + i * 0.075;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
                osc.frequency.setValueAtTime(freq, start);

                const dur = i === notes.length - 1 ? 0.95 : 0.28;
                gain.gain.setValueAtTime(0.2, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + dur + 0.04);
            });
        } catch {}
    }
}

const audioEngine = new WheelAudioEngine();

function formatSliceLabel(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'ÖĞRENCİ';
    if (parts.length === 1) return parts[0].toUpperCase();
    return `${parts[0]} ${parts[1].charAt(0)}.`.toUpperCase();
}

/**
 * Fiziksel hızlanma -> süzülme -> mandal sürtünme direnci -> mikro yerleşme eğrisi
 */
function evaluateRealisticWheelCurve(t: number): number {
    // 1. Kısa el savurma ivmelenmesi + eksponansiyel rulman ve hava direnci yavaşlaması
    // t in [0, 1] -> p in [0, 1], türevi t=0'da yumuşak artışa, ardından uzun doğal yavaşlamaya sahip
    const ramp = t < 0.045 ? Math.pow(t / 0.045, 1.55) * 0.015 : 0.015;
    const coastT = t < 0.045 ? 0 : (t - 0.045) / 0.955;
    const expDecay = 1 - Math.exp(-5.1 * coastT);
    const expNorm = 1 - Math.exp(-5.1);
    const tailDrop = Math.pow(coastT, 5);
    const smoothCoast = ((expDecay / expNorm) * (1 - 0.025 * tailDrop) + 0.025 * tailDrop);
    // Ayrıca sonda ağır teker hissiyatı için kuartik sönümleme ile harmanla
    const quartic = 1 - Math.pow(1 - coastT, 4.4);
    const blended = smoothCoast * 0.35 + quartic * 0.65;
    return Math.min(1, ramp + blended * 0.985);
}

interface PresentationWheelModalProps {
    isOpen: boolean;
    onClose: () => void;
    presentationTheme?: string;
}

export function PresentationWheelModal({
    isOpen,
    onClose,
    presentationTheme = 'sketchnote'
}: PresentationWheelModalProps) {
    const isLightStage = presentationTheme === 'clean-light' || presentationTheme === 'sketchnote';

    // Veri durumları
    const [allClasses, setAllClasses] = useState<SchoolClass[]>(cachedClasses || []);
    const [allStudents, setAllStudents] = useState<UserProfile[]>(cachedStudents || []);
    const [classFilter, setClassFilter] = useState<string>(() => lastSelectedClassFilter);
    const [branchFilter, setBranchFilter] = useState<string>(() => lastSelectedBranchFilter);
    const [isLoadingData, setIsLoadingData] = useState(!cachedClasses);

    // Görünüm & Ayarlar
    const [isWheelFullscreen, setIsWheelFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [spinMode, setSpinMode] = useState<SpinDurationMode>('normal');
    const [autoRemoveWinner, setAutoRemoveWinner] = useState<boolean>(false);
    const [shuffleSeed, setShuffleSeed] = useState<number>(0);

    // Kaynak Modu
    const [pickerSource, setPickerSource] = useState<'registered' | 'custom'>(() => lastPickerSource);
    const [customNamesText, setCustomNamesText] = useState<string>(() => lastCustomNamesText);

    // Çark Durumları
    const [isRolling, setIsRolling] = useState(false);
    const [winner, setWinner] = useState<WheelCandidate | null>(null);
    const [removedStudentIds, setRemovedStudentIds] = useState<Set<string>>(() => new Set(lastRemovedStudentIds));
    const [recentWinners, setRecentWinners] = useState<WheelCandidate[]>([]);
    const [ledStep, setLedStep] = useState(0);

    // 60fps Animasyon & DOM Referansları
    const wheelContainerRef = useRef<HTMLDivElement | null>(null);
    const needleRef = useRef<HTMLDivElement | null>(null);
    const currentRotationRef = useRef<number>(0);
    const isRollingRef = useRef<boolean>(false);
    const rafIdRef = useRef<number | null>(null);

    // Sınıf & Öğrenci Yükle
    useEffect(() => {
        if (!isOpen) return;

        if (cachedClasses && cachedStudents) {
            setAllClasses(cachedClasses);
            setAllStudents(cachedStudents);
            if (!lastSelectedClassFilter && cachedClasses.length > 0) {
                lastSelectedClassFilter = cachedClasses[0].id;
                setClassFilter(cachedClasses[0].id);
            } else if (lastSelectedClassFilter && !classFilter) {
                setClassFilter(lastSelectedClassFilter);
            }
            setIsLoadingData(false);
            return;
        }

        const fetchInitialData = async () => {
            setIsLoadingData(true);
            try {
                const [classesSnap, studentsSnap] = await Promise.all([
                    getDocs(query(collection(db, 'classes'), orderBy('name'))),
                    getDocs(query(collection(db, 'users'), where('role', '==', 'guest')))
                ]);

                const loadedClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass));
                const loadedStudents = studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));

                cachedClasses = loadedClasses;
                cachedStudents = loadedStudents;

                setAllClasses(loadedClasses);
                setAllStudents(loadedStudents);
                if (!lastSelectedClassFilter && loadedClasses.length > 0) {
                    lastSelectedClassFilter = loadedClasses[0].id;
                    setClassFilter(loadedClasses[0].id);
                } else if (lastSelectedClassFilter) {
                    setClassFilter(lastSelectedClassFilter);
                }
            } catch (error) {
                console.error('Error fetching students for wheel:', error);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchInitialData();
    }, [isOpen]);

    const selectedClassData = useMemo(
        () => allClasses.find(c => c.id === classFilter),
        [classFilter, allClasses]
    );

    const baseItems: WheelCandidate[] = useMemo(() => {
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
                    avatarUrl: (s as any).avatarUrl || s.avatar || (s as any).photoURL,
                    className: s.class
                }));
        }

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
    }, [pickerSource, allStudents, branchFilter, selectedClassData, removedStudentIds, customNamesText]);

    const wheelItems = useMemo(() => {
        if (shuffleSeed === 0 || baseItems.length < 2) return baseItems;
        const copy = [...baseItems];
        let s = shuffleSeed * 9301 + 49297;
        for (let i = copy.length - 1; i > 0; i--) {
            s = (s * 16807) % 2147483647;
            const j = s % (i + 1);
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }, [baseItems, shuffleSeed]);

    const totalSlices = wheelItems.length;
    const sliceAngle = 360 / (totalSlices || 1);

    // Kayan marquee ampul ışıkları
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setLedStep(prev => (prev + 1) % 24);
        }, isRolling ? 55 : 260);
        return () => clearInterval(interval);
    }, [isOpen, isRolling]);

    // Temizleme
    useEffect(() => {
        if (!isOpen) {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            isRollingRef.current = false;
            setIsRolling(false);
        }
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            isRollingRef.current = false;
        };
    }, [isOpen]);

    // Başlangıç açısını DOM'a yansıt
    useEffect(() => {
        if (wheelContainerRef.current && !isRollingRef.current) {
            wheelContainerRef.current.style.transform = `rotate(${currentRotationRef.current}deg)`;
        }
    }, [isOpen, wheelItems.length, isWheelFullscreen]);

    // ══ GERÇEKÇİ 60FPS FİZİK, MANDAL DİRENCİ VE YAYLI İBRE MOTORU ══
    const spinWheel = useCallback(() => {
        if (totalSlices < 2 || !wheelContainerRef.current) return;
        if (isRollingRef.current) return;

        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

        isRollingRef.current = true;
        setIsRolling(true);
        setWinner(null);
        audioEngine.playSpinLaunch();

        const winningIndex = Math.floor(Math.random() * totalSlices);
        // Güvenli orta alan: pimlere fazla yakın durup yanılgı oluşturmaz (0.20..0.80)
        const offsetInSlice = (0.20 + Math.random() * 0.60) * sliceAngle;
        const targetNormalized = (360 - (winningIndex * sliceAngle + offsetInSlice) + 360) % 360;

        const startRot = currentRotationRef.current;
        const startMod = ((startRot % 360) + 360) % 360;
        const alignDelta = (targetNormalized - startMod + 360) % 360;

        const baseTurns = spinMode === 'fast' ? 6 : spinMode === 'dramatic' ? 11 : 8;
        const totalDelta = 360 * (baseTurns + Math.floor(Math.random() * 2)) + alignDelta;
        const durationMs = DURATION_SECONDS[spinMode] * 1000;

        const startTime = performance.now();
        let lastFrameTime = startTime;
        let lastRot = startRot;
        let lastPegStep = Math.floor(startRot / sliceAngle);
        let needleAngle = 0;
        let needleVel = 0;

        const stepFrame = (now: number) => {
            if (!isRollingRef.current || !wheelContainerRef.current) return;

            const elapsed = now - startTime;
            const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
            lastFrameTime = now;

            const t = Math.min(1, elapsed / durationMs);
            const progress = evaluateRealisticWheelCurve(t);

            // Kısa başlangıç geri gerilme hissi (0..2.2% sürede minik yaylanma) + ana dönme
            const windupOffset = t < 0.025 ? -Math.sin((t / 0.025) * Math.PI) * 3.2 : 0;
            let baseRot = startRot + totalDelta * progress + windupOffset;

            // Sona doğru pime çarpma direnci + kurtulma ivmesi ve mikro yerleşme sekmesi
            if (t > 0.68 && t < 0.975) {
                const detentFade = (t - 0.68) / (0.975 - 0.68);
                const envelope = Math.sin(detentFade * Math.PI) * 0.45;
                const phase = ((baseRot % sliceAngle) / sliceAngle) * 2 * Math.PI;
                baseRot -= Math.sin(phase) * Math.min(2.2, sliceAngle * 0.09) * envelope;
            } else if (t >= 0.975 && t < 1) {
                // Ağır çarkın yerçekimiyle iki pim arasında son hafif salınımla oturması
                const settleT = (t - 0.975) / 0.025;
                baseRot += Math.sin(settleT * Math.PI * 1.6) * (1 - settleT) * 0.95;
            }

            currentRotationRef.current = baseRot;
            wheelContainerRef.current.style.transform = `rotate(${baseRot}deg)`;

            // Anlık açısal hız (deg/sec -> 0..1 normalize)
            const degPerSec = Math.max(0, (baseRot - lastRot) / dt);
            lastRot = baseRot;
            const speedNorm = Math.max(0, Math.min(1, degPerSec / 950));

            // Gerçek pim geçişi anı: t >= 0.025 sonrası her pim çarpışında mandal sekmesi
            const pegStep = Math.floor(baseRot / sliceAngle);
            if (t > 0.025 && pegStep > lastPegStep) {
                lastPegStep = pegStep;
                audioEngine.playPegTick(speedNorm);
                const kick = -(15 + speedNorm * 23);
                needleAngle = Math.min(needleAngle, kick);
                needleVel = -140 - speedNorm * 90;
            }

            // Yay-sönümlemeli mekanik ibre hareketi
            const springK = 310;
            const damping = 17;
            const accel = -springK * needleAngle - damping * needleVel;
            needleVel += accel * dt;
            needleAngle += needleVel * dt;
            needleAngle = Math.max(-40, Math.min(12, needleAngle));

            if (needleRef.current) {
                needleRef.current.style.transform = `rotate(${needleAngle.toFixed(2)}deg)`;
            }

            if (t < 1) {
                rafIdRef.current = requestAnimationFrame(stepFrame);
            } else {
                const exactFinal = startRot + totalDelta;
                currentRotationRef.current = exactFinal;
                wheelContainerRef.current.style.transform = `rotate(${exactFinal}deg)`;
                if (needleRef.current) needleRef.current.style.transform = 'rotate(0deg)';

                isRollingRef.current = false;
                setIsRolling(false);
                rafIdRef.current = null;

                const chosen = wheelItems[winningIndex];
                if (chosen) {
                    setWinner(chosen);
                    setRecentWinners(prev => [chosen, ...prev.filter(w => w.id !== chosen.id)].slice(0, 6));
                }

                audioEngine.playVictoryFanfare();
                try {
                    confetti({
                        particleCount: 160,
                        spread: 95,
                        origin: { y: 0.5 },
                        colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#ffffff']
                    });
                } catch {}
            }
        };

        rafIdRef.current = requestAnimationFrame(stepFrame);
    }, [totalSlices, sliceAngle, spinMode, wheelItems]);

    // Boşluk (Space) tuşu ile hızlı çevir
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            if (e.code === 'Space' && !winner && !isRollingRef.current && totalSlices >= 2) {
                e.preventDefault();
                spinWheel();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, winner, totalSlices, spinWheel]);

    const removeCurrentStudent = () => {
        if (!winner) return;
        setRemovedStudentIds(prev => {
            const next = new Set(prev).add(winner.id);
            lastRemovedStudentIds = next;
            return next;
        });
        setWinner(null);
    };

    const handleAfterWinAction = (action: 'remove-close' | 'remove-stay' | 'stay-close' | 'respin') => {
        if (action === 'remove-close') {
            removeCurrentStudent();
            onClose();
            return;
        }
        if (action === 'remove-stay') {
            removeCurrentStudent();
            return;
        }
        if (action === 'stay-close') {
            if (autoRemoveWinner) removeCurrentStudent();
            else setWinner(null);
            onClose();
            return;
        }
        if (autoRemoveWinner) removeCurrentStudent();
        else setWinner(null);
    };

    const resetStudentList = () => {
        lastRemovedStudentIds = new Set();
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
                    'fixed inset-0 z-50 flex items-center justify-center select-none',
                    isWheelFullscreen
                        ? 'bg-[#040712] p-0'
                        : isLightStage
                        ? 'bg-slate-900/50 backdrop-blur-md p-3 sm:p-6'
                        : 'bg-slate-950/80 backdrop-blur-xl p-3 sm:p-6'
                )}
                onClick={isWheelFullscreen || isRolling ? undefined : onClose}
            >
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 18 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 18 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                    onClick={e => e.stopPropagation()}
                    className={cn(
                        'relative flex flex-col bg-gradient-to-b from-slate-900 via-[#090f20] to-[#040710] text-white overflow-hidden shadow-2xl transition-all duration-300',
                        isWheelFullscreen
                            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0'
                            : 'w-full max-w-6xl max-h-[94vh] rounded-[2rem] border border-amber-400/30 shadow-[0_25px_90px_rgba(2,6,23,0.75)]'
                    )}
                >
                    {/* Üst Metalik Altın Vurgu Çizgisi */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-orange-500 z-30" />

                    {/* ══ ÜST BAŞLIK BAR (Tam Ekranda İnce Minimal Kontrol Çubuğu) ══ */}
                    <div
                        className={cn(
                            'flex items-center justify-between border-b border-white/10 flex-shrink-0 z-20',
                            isWheelFullscreen
                                ? 'py-2 px-4 sm:px-6 bg-slate-950/60 backdrop-blur-md'
                                : 'py-3 px-5 bg-slate-950/85'
                        )}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                                'rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 flex items-center justify-center shadow-lg border border-white/25 shrink-0',
                                isWheelFullscreen ? 'w-8 h-8 rounded-xl' : 'w-10 h-10'
                            )}>
                                <Trophy className={cn('text-slate-950', isWheelFullscreen ? 'w-4 h-4' : 'w-5 h-5')} />
                            </div>
                            <div className="min-w-0">
                                <h3 className={cn('font-black tracking-tight text-white flex items-center gap-2 truncate', isWheelFullscreen ? 'text-sm sm:text-base' : 'text-base sm:text-lg')}>
                                    <span>Şanslı Kura Çarkı</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                                        {totalSlices} Kişi
                                    </span>
                                </h3>
                                {!isWheelFullscreen && (
                                    <p className="text-xs text-slate-400 font-semibold truncate max-w-[260px] sm:max-w-md">
                                        {pickerSource === 'registered'
                                            ? (selectedClassData ? `${selectedClassData.name}${branchFilter !== 'all' ? ` • ${branchFilter}` : ''}` : 'Sınıf Seçimi Bekleniyor')
                                            : 'Özel İsim Listesi'}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                            {isWheelFullscreen && (
                                <>
                                    <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5 mr-1">
                                        {[
                                            { id: 'fast' as SpinDurationMode, label: '4sn' },
                                            { id: 'normal' as SpinDurationMode, label: '7sn' },
                                            { id: 'dramatic' as SpinDurationMode, label: '10sn' },
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                disabled={isRolling}
                                                onClick={() => setSpinMode(m.id)}
                                                className={cn(
                                                    'px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50',
                                                    spinMode === m.id ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
                                                )}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShuffleSeed(prev => prev + 1)}
                                        disabled={isRolling || totalSlices < 2}
                                        className="h-8 w-8 rounded-xl border border-white/10 text-sky-300 hover:bg-white/10 cursor-pointer"
                                        title="Listeyi Karıştır"
                                    >
                                        <Shuffle className="w-3.5 h-3.5" />
                                    </Button>
                                </>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMute}
                                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                                title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                            </Button>

                            {isWheelFullscreen && (
                                <Button
                                    onClick={spinWheel}
                                    disabled={isRolling || totalSlices < 2}
                                    className="h-8 sm:h-9 px-4 sm:px-5 text-xs font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 hover:from-amber-200 hover:to-orange-400 text-slate-950 rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
                                >
                                    <Flame className="w-3.5 h-3.5 mr-1 fill-current text-amber-900" />
                                    {isRolling ? 'Dönüyor...' : 'ÇEVİR'}
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsWheelFullscreen(prev => !prev)}
                                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold gap-1.5 cursor-pointer"
                            >
                                {isWheelFullscreen ? (
                                    <>
                                        <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                                        <span className="hidden sm:inline">Küçült</span>
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
                                        <span className="hidden sm:inline">Tam Ekran</span>
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onClose}
                                disabled={isRolling}
                                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white text-xs font-bold cursor-pointer"
                            >
                                Sunuma Dön
                            </Button>

                            <button
                                onClick={onClose}
                                disabled={isRolling}
                                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
                                title="Kapat"
                            >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ══ ANA GÖVDE ══ */}
                    <div
                        className={cn(
                            'flex-1 flex overflow-hidden min-h-0 relative',
                            isWheelFullscreen ? 'p-1 sm:p-2' : 'flex-col md:flex-row p-4 md:p-5 gap-5'
                        )}
                    >
                        {/* SOL PANEL: Yalnızca Normal Görünümde Gösterilir (Tam Ekranda Çark Tam Ekran Olur) */}
                        {!isWheelFullscreen && (
                            <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-shrink-0 z-10 w-full md:w-80">
                                {/* Kaynak Seçimi */}
                                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-950/90 border border-white/10">
                                    <button
                                        onClick={() => { lastPickerSource = 'registered'; setPickerSource('registered'); resetStudentList(); }}
                                        disabled={isRolling}
                                        className={cn(
                                            'py-2 rounded-xl text-xs font-black transition-all cursor-pointer',
                                            pickerSource === 'registered'
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'text-slate-400 hover:text-white'
                                        )}
                                    >
                                        Kayıtlı Sınıf
                                    </button>
                                    <button
                                        onClick={() => { lastPickerSource = 'custom'; setPickerSource('custom'); resetStudentList(); }}
                                        disabled={isRolling}
                                        className={cn(
                                            'py-2 rounded-xl text-xs font-black transition-all cursor-pointer',
                                            pickerSource === 'custom'
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'text-slate-400 hover:text-white'
                                        )}
                                    >
                                        Özel Liste
                                    </button>
                                </div>

                                {/* Sınıf veya Özel Liste */}
                                {pickerSource === 'registered' ? (
                                    <div className="space-y-2.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Sınıf</Label>
                                            <Select
                                                value={classFilter}
                                                onValueChange={val => {
                                                    lastSelectedClassFilter = val;
                                                    setClassFilter(val);
                                                    lastSelectedBranchFilter = 'all';
                                                    setBranchFilter('all');
                                                    resetStudentList();
                                                }}
                                                disabled={isRolling || isLoadingData}
                                            >
                                                <SelectTrigger className="bg-slate-950/80 border-white/15 h-9 text-xs text-white rounded-xl">
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
                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Şube</Label>
                                                <Select
                                                    value={branchFilter}
                                                    onValueChange={val => {
                                                        lastSelectedBranchFilter = val;
                                                        setBranchFilter(val);
                                                        resetStudentList();
                                                    }}
                                                    disabled={isRolling}
                                                >
                                                    <SelectTrigger className="bg-slate-950/80 border-white/15 h-9 text-xs text-white rounded-xl">
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
                                    <div className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                                        <Label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">İsimler (Alt Alta)</Label>
                                        <textarea
                                            rows={4}
                                            value={customNamesText}
                                            onChange={e => {
                                                lastCustomNamesText = e.target.value;
                                                setCustomNamesText(e.target.value);
                                                resetStudentList();
                                            }}
                                            disabled={isRolling}
                                            className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-xs text-white resize-none font-medium focus:outline-none focus:border-amber-400"
                                            placeholder="İsim 1&#10;İsim 2..."
                                        />
                                    </div>
                                )}

                                {/* Dönüş Hızı / Gerilim Modu & Karıştır */}
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-amber-400" /> Gerilim Süresi
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShuffleSeed(prev => prev + 1)}
                                            disabled={isRolling || totalSlices < 2}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-sky-300 cursor-pointer disabled:opacity-40"
                                            title="Dilim sırasını karıştır"
                                        >
                                            <Shuffle className="w-3 h-3" /> Karıştır
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { id: 'fast' as SpinDurationMode, label: 'Hızlı (4sn)' },
                                            { id: 'normal' as SpinDurationMode, label: 'Normal (7sn)' },
                                            { id: 'dramatic' as SpinDurationMode, label: 'Final (10sn)' },
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                disabled={isRolling}
                                                onClick={() => setSpinMode(m.id)}
                                                className={cn(
                                                    'py-1.5 px-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50',
                                                    spinMode === m.id
                                                        ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-black'
                                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                                )}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-white/10">
                                        <span className="text-[11px] font-bold text-slate-300">Çıkanı otomatik listeden düş</span>
                                        <Switch
                                            checked={autoRemoveWinner}
                                            onCheckedChange={setAutoRemoveWinner}
                                            disabled={isRolling}
                                        />
                                    </div>
                                </div>

                                {/* İstatistik & Son Seçilenler */}
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs text-slate-300">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <Users className="w-4 h-4 text-amber-400" />
                                            <span>Aktif Aday: <strong className="text-white font-black">{totalSlices}</strong></span>
                                        </div>
                                        {removedStudentIds.size > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={resetStudentList}
                                                disabled={isRolling}
                                                className="h-7 px-2 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg cursor-pointer"
                                            >
                                                <RotateCcw className="w-3 h-3 mr-1" /> Geri Al ({removedStudentIds.size})
                                            </Button>
                                        )}
                                    </div>

                                    {recentWinners.length > 0 && (
                                        <div className="pt-2 border-t border-white/10 space-y-1">
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                <span className="flex items-center gap-1"><History className="w-3 h-3 text-emerald-400" /> Seçilenler</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setRecentWinners([])}
                                                    className="hover:text-white cursor-pointer"
                                                    title="Geçmişi Temizle"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {recentWinners.map((rw, idx) => (
                                                    <span
                                                        key={rw.id}
                                                        className={cn(
                                                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                                            idx === 0
                                                                ? 'bg-amber-400/20 border-amber-400/50 text-amber-200'
                                                                : 'bg-white/5 border-white/10 text-slate-300'
                                                        )}
                                                    >
                                                        {formatSliceLabel(rw.name)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Ana Çevir Butonu */}
                                <Button
                                    size="lg"
                                    onClick={spinWheel}
                                    disabled={isRolling || totalSlices < 2}
                                    className="w-full h-12 sm:h-14 text-base sm:text-lg text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 hover:from-amber-200 hover:to-orange-400 shadow-xl rounded-2xl transition-all active:scale-95 disabled:opacity-40 cursor-pointer mt-auto font-black uppercase tracking-wider"
                                >
                                    <Flame className="w-5 h-5 mr-1.5 fill-current text-amber-900" />
                                    {isRolling
                                        ? 'Çark Dönüyor...'
                                        : (pickerSource === 'registered' && !classFilter
                                            ? 'Sınıf Seçiniz'
                                            : (totalSlices < 2 ? 'En Az 2 Kişi Gerekli' : 'ÇARKI ÇEVİR'))}
                                </Button>
                            </div>
                        )}

                        {/* SAĞ / TAM EKRAN SAHNE: GERÇEKÇİ 60FPS METALİK STÜDYO ÇARKI (ÜSTTE İSİM YOK) */}
                        <div className={cn(
                            'flex-1 flex flex-col items-center justify-center relative overflow-hidden',
                            isWheelFullscreen
                                ? 'w-full h-full bg-radial from-slate-900/50 via-[#060b18] to-[#02040a] p-2 sm:p-4'
                                : 'bg-gradient-to-b from-slate-900/70 to-slate-950/90 rounded-3xl border border-white/10 p-3 sm:p-5 min-h-[360px]'
                        )}>
                            {totalSlices === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400 gap-4 max-w-md">
                                    <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
                                        <Users className="w-8 h-8 text-amber-300" />
                                    </div>
                                    <h4 className="text-xl font-black text-white">Sınıf veya Liste Seçiniz</h4>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                        Kura çarkını çalıştırmak için bir sınıf seçin ya da Özel Liste sekmesine geçip isim girin.
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className={cn(
                                        'relative aspect-square flex items-center justify-center my-auto',
                                        isWheelFullscreen
                                            ? 'w-[min(86vh,88vw)] h-[min(86vh,88vw)]'
                                            : 'w-full max-w-[360px] sm:max-w-[440px] md:max-w-[480px]'
                                    )}
                                >
                                    {/* Arka Sahne Hareli Derinlik Işığı */}
                                    <div className="absolute inset-[-8%] rounded-full bg-gradient-to-tr from-indigo-950/40 via-amber-500/5 to-purple-950/30 pointer-events-none" />

                                    {/* Dış Metalik Pirinç Çerçeve & 24 Stüdyo Ampulü */}
                                    <div className={cn(
                                        'absolute rounded-full bg-gradient-to-b from-slate-600 via-slate-900 to-black border-2 border-amber-400/60 shadow-2xl pointer-events-none z-0',
                                        isWheelFullscreen ? 'inset-[-20px] sm:inset-[-26px]' : 'inset-[-14px] sm:inset-[-18px]'
                                    )} />
                                    <div className={cn(
                                        'absolute rounded-full pointer-events-none z-10',
                                        isWheelFullscreen ? 'inset-[-20px] sm:inset-[-26px]' : 'inset-[-14px] sm:inset-[-18px]'
                                    )}>
                                        {Array.from({ length: 24 }).map((_, i) => {
                                            const angle = (i / 24) * 2 * Math.PI;
                                            const x = 50 + 48.3 * Math.cos(angle);
                                            const y = 50 + 48.3 * Math.sin(angle);
                                            const isActive = (i + ledStep) % 3 === 0;
                                            return (
                                                <div
                                                    key={i}
                                                    style={{ left: `${x}%`, top: `${y}%` }}
                                                    className={cn(
                                                        'absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-100',
                                                        isWheelFullscreen ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-2.5 h-2.5 sm:w-3 sm:h-3',
                                                        isActive
                                                            ? 'bg-amber-300 ring-2 ring-amber-400/60'
                                                            : 'bg-slate-700/80'
                                                    )}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* DÖNEN SVG ÇARK (60FPS Gerçek Fizik Transformu) */}
                                    <div
                                        ref={wheelContainerRef}
                                        onClick={spinWheel}
                                        className={cn(
                                            'w-full h-full rounded-full relative overflow-hidden bg-slate-950 border-slate-900 shadow-inner will-change-transform z-10 cursor-pointer',
                                            isWheelFullscreen ? 'border-[12px]' : 'border-[8px]'
                                        )}
                                        style={{ transform: 'rotate(0deg)' }}
                                        title={isRolling ? 'Dönüyor...' : 'Çevirmek için tıklayın (Boşluk)'}
                                    >
                                        <svg viewBox="-1 -1 2 2" className="w-full h-full block">
                                            <defs>
                                                <radialGradient id="brassPegGrad" cx="35%" cy="30%" r="65%">
                                                    <stop offset="0%" stopColor="#fef9c3" />
                                                    <stop offset="50%" stopColor="#f59e0b" />
                                                    <stop offset="100%" stopColor="#78350f" />
                                                </radialGradient>
                                                <radialGradient id="sliceRimDepth" cx="50%" cy="50%" r="50%">
                                                    <stop offset="55%" stopColor="rgba(0,0,0,0)" />
                                                    <stop offset="92%" stopColor="rgba(0,0,0,0.22)" />
                                                    <stop offset="100%" stopColor="rgba(0,0,0,0.42)" />
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
                                                const textRadius = totalSlices > 16 ? 0.67 : 0.62;
                                                const textX = Math.cos(midAngle) * textRadius;
                                                const textY = Math.sin(midAngle) * textRadius;
                                                const rotationDeg = (midAngle * 180) / Math.PI;

                                                const fontSize = Math.max(0.044, Math.min(0.092, 0.58 / Math.max(4, totalSlices)));
                                                const displayName = formatSliceLabel(item.name);

                                                const pegRadius = 0.942;
                                                const pegX = Math.cos(startPercent * 2 * Math.PI) * pegRadius;
                                                const pegY = Math.sin(startPercent * 2 * Math.PI) * pegRadius;

                                                return (
                                                    <g key={item.id}>
                                                        <path
                                                            d={pathData}
                                                            fill={theme.bg}
                                                            stroke="rgba(15,23,42,0.9)"
                                                            strokeWidth="0.008"
                                                        />
                                                        <text
                                                            x={textX}
                                                            y={textY}
                                                            fill={theme.text}
                                                            fontSize={fontSize}
                                                            fontWeight="900"
                                                            fontFamily="system-ui, -apple-system, sans-serif"
                                                            textAnchor="middle"
                                                            dominantBaseline="central"
                                                            transform={`rotate(${rotationDeg}, ${textX}, ${textY})`}
                                                            stroke="rgba(0,0,0,0.78)"
                                                            strokeWidth="0.0045"
                                                            paintOrder="stroke fill"
                                                        >
                                                            {displayName}
                                                        </text>
                                                        {/* Pirinç Pim */}
                                                        <circle
                                                            cx={pegX}
                                                            cy={pegY}
                                                            r="0.025"
                                                            fill="url(#brassPegGrad)"
                                                            stroke="#451a03"
                                                            strokeWidth="0.005"
                                                        />
                                                    </g>
                                                );
                                            })}

                                            {/* Kenar Gölgeli Derinlik Halkası */}
                                            <circle cx="0" cy="0" r="1" fill="url(#sliceRimDepth)" pointerEvents="none" />
                                            <circle cx="0" cy="0" r="0.985" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.012" />
                                        </svg>
                                    </div>

                                    {/* SABİT STÜDYO ÜST IŞIK YANSIMASI (Çark Altında Dönerken Işık Sabit Kalır!) */}
                                    <div
                                        className="w-full h-full rounded-full absolute inset-0 pointer-events-none z-10 overflow-hidden"
                                        style={{
                                            background: 'linear-gradient(145deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 34%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.22) 100%)',
                                        }}
                                    />

                                    {/* YAYLI MEKANİK SVG İBRE (SAAT 3 KONUMU - FİZİKSEL GERİ TEPME) */}
                                    <div
                                        ref={needleRef}
                                        className={cn(
                                            'absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none',
                                            isWheelFullscreen ? 'right-[-34px] sm:right-[-42px]' : 'right-[-22px] sm:right-[-28px]'
                                        )}
                                        style={{ transformOrigin: '78% 50%' }}
                                    >
                                        <svg
                                            width={isWheelFullscreen ? '86' : '60'}
                                            height={isWheelFullscreen ? '68' : '48'}
                                            viewBox="0 0 72 56"
                                            className="drop-shadow-xl"
                                        >
                                            <defs>
                                                <linearGradient id="needleMetal" x1="0" y1="0" x2="1" y2="1">
                                                    <stop offset="0%" stopColor="#fef08a" />
                                                    <stop offset="45%" stopColor="#f59e0b" />
                                                    <stop offset="100%" stopColor="#92400e" />
                                                </linearGradient>
                                            </defs>
                                            <path
                                                d="M 4 28 L 54 8 C 62 12 66 20 66 28 C 66 36 62 44 54 48 Z"
                                                fill="url(#needleMetal)"
                                                stroke="#0f172a"
                                                strokeWidth="3.2"
                                                strokeLinejoin="round"
                                            />
                                            <path
                                                d="M 14 28 L 48 16 L 48 40 Z"
                                                fill="#fef9c3"
                                                opacity="0.58"
                                            />
                                            <circle cx="54" cy="28" r="8" fill="#1e293b" stroke="#fde047" strokeWidth="2.5" />
                                            <circle cx="54" cy="28" r="2.8" fill="#fde047" />
                                        </svg>
                                    </div>

                                    {/* MERKEZ METALİK GÖBEK & BUTON */}
                                    <button
                                        type="button"
                                        onClick={spinWheel}
                                        disabled={isRolling || totalSlices < 2}
                                        className={cn(
                                            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-slate-900 shadow-2xl flex items-center justify-center z-20 cursor-pointer hover:scale-105 active:scale-95 transition-transform overflow-hidden disabled:cursor-not-allowed',
                                            isWheelFullscreen ? 'w-28 h-28 sm:w-32 sm:h-32 border-[8px]' : 'w-20 h-20 border-[6px]'
                                        )}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-amber-400 to-orange-600" />
                                        <div className="relative flex flex-col items-center justify-center leading-none text-slate-950 font-black">
                                            <Zap className={cn('mb-0.5 fill-current', isWheelFullscreen ? 'w-5 h-5' : 'w-4 h-4', isRolling && 'opacity-60')} />
                                            <span className={cn('tracking-tight uppercase', isWheelFullscreen ? 'text-sm sm:text-base' : 'text-[11px]')}>
                                                {isRolling ? 'DÖNÜYOR' : 'ÇEVİR'}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* ══ KAZANAN EKRANI ══ */}
                            {winner && !isRolling && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.72, y: 24 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.72, y: 24 }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                    className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/92 p-4"
                                >
                                    <div
                                        className={cn(
                                            'relative text-center bg-gradient-to-b from-slate-900 via-[#101935] to-slate-950 border-4 border-amber-400 rounded-[2.25rem] shadow-2xl w-full overflow-hidden',
                                            isWheelFullscreen ? 'p-8 sm:p-10 max-w-lg' : 'p-6 max-w-md'
                                        )}
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-lg border-2 border-white/40">
                                            <Trophy className="w-8 h-8 fill-current" />
                                        </div>

                                        <span className="text-[11px] font-black text-amber-300 uppercase tracking-widest bg-amber-400/15 px-3 py-1 rounded-full border border-amber-400/30">
                                            GÜNÜN ŞANSLISI • #{recentWinners.length}
                                        </span>

                                        <h3
                                            className={cn(
                                                'font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-400 my-3 uppercase tracking-tight leading-tight break-words',
                                                isWheelFullscreen ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
                                            )}
                                        >
                                            {winner.name}
                                        </h3>

                                        <p className="text-sm text-slate-300 font-bold mb-5">
                                            {winner.className || 'Öğrenci'}
                                        </p>

                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    onClick={() => handleAfterWinAction('remove-close')}
                                                    className="h-11 text-xs font-black bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 rounded-xl cursor-pointer"
                                                >
                                                    <UserMinus className="w-4 h-4 mr-1.5" /> Çıkar & Sunuma Dön
                                                </Button>
                                                <Button
                                                    onClick={() => handleAfterWinAction('stay-close')}
                                                    className="h-11 text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl cursor-pointer"
                                                >
                                                    <Check className="w-4 h-4 mr-1.5" /> Sunuma Dön
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Button
                                                    onClick={() => {
                                                        try { playSound('applause'); } catch {}
                                                        try {
                                                            confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
                                                        } catch {}
                                                    }}
                                                    variant="outline"
                                                    className="h-9 text-xs font-bold border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 rounded-xl cursor-pointer"
                                                >
                                                    <Award className="w-3.5 h-3.5 mr-1" /> Alkışla
                                                </Button>
                                                <Button
                                                    onClick={() => handleAfterWinAction('remove-stay')}
                                                    variant="outline"
                                                    className="h-9 text-xs font-bold border-rose-500/40 text-rose-300 hover:bg-rose-500/15 rounded-xl cursor-pointer"
                                                >
                                                    <UserMinus className="w-3.5 h-3.5 mr-1" /> Çıkar
                                                </Button>
                                                <Button
                                                    onClick={() => handleAfterWinAction('respin')}
                                                    variant="outline"
                                                    className="h-9 text-xs font-bold border-white/20 text-slate-200 hover:bg-white/10 rounded-xl cursor-pointer"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Tekrar
                                                </Button>
                                            </div>
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
