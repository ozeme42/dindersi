'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    X, Users, RotateCcw, UserMinus, Trophy,
    Check, Maximize2, Minimize2, Volume2, VolumeX, Flame,
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

// ══ WHEEL OF NAMES (frz-hcm) PASTEL-CANLI ÇARK PALETİ ══
interface WheelSliceColor {
    bg: string;
    bevelTop: string;
    bevelDark: string;
    text: string;
}

const SLICE_COLORS: WheelSliceColor[] = [
    { bg: '#63B3ED', bevelTop: '#90CCF6', bevelDark: '#3582C4', text: '#111827' }, // Gök Mavisi
    { bg: '#74E09F', bevelTop: '#A4EFC2', bevelDark: '#3EB46F', text: '#111827' }, // Nane Yeşili
    { bg: '#F7E06D', bevelTop: '#FBEB9E', bevelDark: '#CFAF2E', text: '#111827' }, // Pastel Sarı
    { bg: '#B47EC8', bevelTop: '#D0A6E0', bevelDark: '#854E9B', text: '#111827' }, // Lavanta Moru
];

const EXTRA_NON_ADJACENT_COLOR: WheelSliceColor = {
    bg: '#F48FB1',
    bevelTop: '#F9BCD2',
    bevelDark: '#C25B7E',
    text: '#111827',
};

function getSliceColor(index: number, totalSlices: number): WheelSliceColor {
    if (totalSlices > 1 && totalSlices % SLICE_COLORS.length === 1 && index === totalSlices - 1) {
        return EXTRA_NON_ADJACENT_COLOR;
    }
    return SLICE_COLORS[index % SLICE_COLORS.length];
}

type SpinDurationMode = 'fast' | 'normal' | 'dramatic';
const DURATION_SECONDS: Record<SpinDurationMode, number> = {
    fast: 4.5,
    normal: 7.5,
    dramatic: 10.5,
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
 * Wheel of Names tarzı C1-sürekli fiziksel hızlanma + uzun ipeksi süzülme/yavaşlama eğrisi.
 * Anlık açısal hız hızlıca tepeye çıkıp, sonda geriye sekme yapmadan sıfıra pürüzsüz sönümlenir.
 */
const WHEEL_CURVE_SAMPLES = 256;
const WHEEL_CURVE_LUT: number[] = (() => {
    const lut = new Array<number>(WHEEL_CURVE_SAMPLES + 1).fill(0);
    let acc = 0;
    for (let i = 1; i <= WHEEL_CURVE_SAMPLES; i++) {
        const uPrev = (i - 1) / WHEEL_CURVE_SAMPLES;
        const uCurr = i / WHEEL_CURVE_SAMPLES;
        const uMid = (uPrev + uCurr) * 0.5;
        // Yumuşak başlangıç rampası (t≈0.06'da tepe) * uzun sönümleme (son dilimler nefes kesici yavaşlıkta)
        const vMid = (0.12 + 0.88 * (1 - Math.exp(-uMid / 0.032))) * Math.pow(1 - uMid, 3.25);
        acc += vMid;
        lut[i] = acc;
    }
    const total = acc || 1;
    for (let i = 0; i <= WHEEL_CURVE_SAMPLES; i++) {
        lut[i] /= total;
    }
    lut[WHEEL_CURVE_SAMPLES] = 1;
    return lut;
})();

function evaluateRealisticWheelCurve(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const scaled = t * WHEEL_CURVE_SAMPLES;
    const idx = Math.floor(scaled);
    const frac = scaled - idx;
    const a = WHEEL_CURVE_LUT[idx];
    const b = WHEEL_CURVE_LUT[Math.min(WHEEL_CURVE_SAMPLES, idx + 1)];
    return a + (b - a) * frac;
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
    const [winnerColor, setWinnerColor] = useState<WheelSliceColor | null>(null);
    const [removedStudentIds, setRemovedStudentIds] = useState<Set<string>>(() => new Set(lastRemovedStudentIds));
    const [recentWinners, setRecentWinners] = useState<WheelCandidate[]>([]);

    // 60fps Animasyon & DOM Referansları
    const wheelContainerRef = useRef<HTMLDivElement | null>(null);
    const needleRef = useRef<HTMLDivElement | null>(null);
    const pointerTopPolyRef = useRef<SVGPolygonElement | null>(null);
    const pointerBottomPolyRef = useRef<SVGPolygonElement | null>(null);
    const currentRotationRef = useRef<number>(0);
    const isRollingRef = useRef<boolean>(false);
    const rafIdRef = useRef<number | null>(null);
    const idleRafIdRef = useRef<number | null>(null);

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

    const syncPointerColor = useCallback((rotDeg: number) => {
        if (totalSlices < 1) return;
        const localDeg = ((-rotDeg % 360) + 360) % 360;
        const idx = Math.floor(localDeg / sliceAngle) % totalSlices;
        const c = getSliceColor(idx, totalSlices);
        if (pointerTopPolyRef.current) pointerTopPolyRef.current.setAttribute('fill', c.bevelTop);
        if (pointerBottomPolyRef.current) pointerBottomPolyRef.current.setAttribute('fill', c.bevelDark);
    }, [totalSlices, sliceAngle]);

    // Temizleme
    useEffect(() => {
        if (!isOpen) {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            if (idleRafIdRef.current) {
                cancelAnimationFrame(idleRafIdRef.current);
                idleRafIdRef.current = null;
            }
            isRollingRef.current = false;
            setIsRolling(false);
        }
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            if (idleRafIdRef.current) cancelAnimationFrame(idleRafIdRef.current);
            isRollingRef.current = false;
        };
    }, [isOpen]);

    // Başlangıç açısını ve ibre rengini DOM'a yansıt
    useEffect(() => {
        if (wheelContainerRef.current && !isRollingRef.current) {
            wheelContainerRef.current.style.transform = `rotate(${currentRotationRef.current}deg)`;
            syncPointerColor(currentRotationRef.current);
        }
    }, [isOpen, wheelItems.length, isWheelFullscreen, syncPointerColor]);

    // Wheel of Names tarzı bekleme (idle) halinde saat yönünde yavaş sürekli dönüş ve sessiz ibre esnemesi
    useEffect(() => {
        if (!isOpen || isRolling || winner || totalSlices < 2) {
            if (idleRafIdRef.current) {
                cancelAnimationFrame(idleRafIdRef.current);
                idleRafIdRef.current = null;
            }
            return;
        }

        let lastTime = performance.now();
        let lastPegStep = Math.floor(currentRotationRef.current / sliceAngle);
        let needleAngle = 0;
        let needleVel = 0;

        const tickIdle = (now: number) => {
            if (isRollingRef.current || !wheelContainerRef.current) return;
            const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
            lastTime = now;

            const nextRot = currentRotationRef.current + 13.5 * dt;
            currentRotationRef.current = nextRot;
            wheelContainerRef.current.style.transform = `rotate(${nextRot}deg)`;
            syncPointerColor(nextRot);

            const pegStep = Math.floor(nextRot / sliceAngle);
            if (pegStep > lastPegStep) {
                lastPegStep = pegStep;
                needleAngle = Math.min(needleAngle, -7.5);
                needleVel = -45;
            }

            const accel = -280 * needleAngle - 18 * needleVel;
            needleVel += accel * dt;
            needleAngle += needleVel * dt;
            needleAngle = Math.max(-14, Math.min(4, needleAngle));

            if (needleRef.current) {
                needleRef.current.style.transform = `rotate(${needleAngle.toFixed(2)}deg)`;
            }

            idleRafIdRef.current = requestAnimationFrame(tickIdle);
        };

        idleRafIdRef.current = requestAnimationFrame(tickIdle);
        return () => {
            if (idleRafIdRef.current) {
                cancelAnimationFrame(idleRafIdRef.current);
                idleRafIdRef.current = null;
            }
        };
    }, [isOpen, isRolling, winner, totalSlices, sliceAngle, syncPointerColor]);

    // ══ WHEEL OF NAMES 60FPS FİZİK, RENK UYUMLU İBRE VE SES MOTORU ══
    const spinWheel = useCallback(() => {
        if (totalSlices < 2 || !wheelContainerRef.current) return;
        if (isRollingRef.current) return;

        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        if (idleRafIdRef.current) {
            cancelAnimationFrame(idleRafIdRef.current);
            idleRafIdRef.current = null;
        }

        isRollingRef.current = true;
        setIsRolling(true);
        setWinner(null);
        setWinnerColor(null);
        audioEngine.playSpinLaunch();

        const winningIndex = Math.floor(Math.random() * totalSlices);
        // Güvenli iç bölge (0.16..0.84) ile çizgi üstü tereddüt olmaz
        const offsetInSlice = (0.16 + Math.random() * 0.68) * sliceAngle;
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
            const baseRot = startRot + totalDelta * progress;

            currentRotationRef.current = baseRot;
            wheelContainerRef.current.style.transform = `rotate(${baseRot}deg)`;
            syncPointerColor(baseRot);

            const degPerSec = Math.max(0, (baseRot - lastRot) / dt);
            lastRot = baseRot;
            const speedNorm = Math.max(0, Math.min(1, degPerSec / 950));

            const pegStep = Math.floor(baseRot / sliceAngle);
            if (pegStep > lastPegStep) {
                lastPegStep = pegStep;
                audioEngine.playPegTick(speedNorm);
                const kick = -(13 + speedNorm * 24);
                needleAngle = Math.min(needleAngle, kick);
                needleVel = -145 - speedNorm * 95;
            }

            // Yay-sönümlemeli pürüzsüz mekanik ibre
            const springK = 360;
            const damping = 18.5;
            const accel = -springK * needleAngle - damping * needleVel;
            needleVel += accel * dt;
            needleAngle += needleVel * dt;
            needleAngle = Math.max(-40, Math.min(10, needleAngle));

            if (needleRef.current) {
                needleRef.current.style.transform = `rotate(${needleAngle.toFixed(2)}deg)`;
            }

            if (t < 1) {
                rafIdRef.current = requestAnimationFrame(stepFrame);
            } else {
                const exactFinal = startRot + totalDelta;
                currentRotationRef.current = exactFinal;
                wheelContainerRef.current.style.transform = `rotate(${exactFinal}deg)`;
                syncPointerColor(exactFinal);
                if (needleRef.current) needleRef.current.style.transform = 'rotate(0deg)';

                isRollingRef.current = false;
                setIsRolling(false);
                rafIdRef.current = null;

                const chosen = wheelItems[winningIndex];
                if (chosen) {
                    setWinner(chosen);
                    setWinnerColor(getSliceColor(winningIndex, totalSlices));
                    setRecentWinners(prev => [chosen, ...prev.filter(w => w.id !== chosen.id)].slice(0, 6));
                }

                audioEngine.playVictoryFanfare();
                try {
                    confetti({
                        particleCount: 160,
                        spread: 95,
                        origin: { y: 0.5 },
                        colors: ['#63B3ED', '#74E09F', '#F7E06D', '#B47EC8', '#F48FB1']
                    });
                } catch {}
            }
        };

        rafIdRef.current = requestAnimationFrame(stepFrame);
    }, [totalSlices, sliceAngle, spinMode, wheelItems, syncPointerColor]);

    // Boşluk (Space) veya Ctrl+Enter ile çevir
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
            if ((e.code === 'Space' || isCtrlEnter) && !winner && !isRollingRef.current && totalSlices >= 2) {
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

                        {/* SAĞ / TAM EKRAN SAHNE: WHEEL OF NAMES TARZI STÜDYO ÇARKI */}
                        <div
                            className={cn(
                                'flex-1 flex flex-col items-center justify-center relative overflow-hidden',
                                isWheelFullscreen
                                    ? 'w-full h-full p-2 sm:p-4'
                                    : 'rounded-3xl border border-white/10 p-3 sm:p-5 min-h-[380px]'
                            )}
                            style={{
                                background: 'radial-gradient(circle at 18% 12%, rgba(28, 72, 86, 0.42) 0%, transparent 48%), radial-gradient(circle at 86% 18%, rgba(74, 34, 72, 0.38) 0%, transparent 45%), #0c0e14',
                            }}
                        >
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
                                            : 'w-full max-w-[390px] sm:max-w-[460px] md:max-w-[500px]'
                                    )}
                                >
                                    {/* DÖNEN WHEEL OF NAMES SVG ÇARK (60FPS Pürüzsüz Fizik & Yavaş Bekleme Dönüşü) */}
                                    <div
                                        ref={wheelContainerRef}
                                        onClick={spinWheel}
                                        className="w-full h-full rounded-full relative overflow-hidden shadow-[0_18px_55px_rgba(0,0,0,0.65)] will-change-transform z-10 cursor-pointer"
                                        style={{ transform: 'rotate(0deg)' }}
                                        title={isRolling ? 'Dönüyor...' : 'Çevirmek için tıklayın (Boşluk veya Ctrl+Enter)'}
                                    >
                                        <svg viewBox="-1 -1 2 2" className="w-full h-full block">
                                            <defs>
                                                <radialGradient id="wheelEdgeVignette" cx="50%" cy="50%" r="50%">
                                                    <stop offset="86%" stopColor="rgba(0,0,0,0)" />
                                                    <stop offset="97%" stopColor="rgba(0,0,0,0.08)" />
                                                    <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
                                                </radialGradient>
                                            </defs>

                                            {wheelItems.map((item, index) => {
                                                const startPercent = index / totalSlices;
                                                const endPercent = (index + 1) / totalSlices;

                                                const [startX, startY] = getCoordinatesForPercent(startPercent);
                                                const [endX, endY] = getCoordinatesForPercent(endPercent);
                                                const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;
                                                const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                                                const theme = getSliceColor(index, totalSlices);
                                                const midAngle = (startPercent + endPercent) * Math.PI;
                                                const textRadius = totalSlices > 16 ? 0.65 : 0.60;
                                                const textX = Math.cos(midAngle) * textRadius;
                                                const textY = Math.sin(midAngle) * textRadius;
                                                const rotationDeg = (midAngle * 180) / Math.PI;

                                                const fontSize = Math.max(0.045, Math.min(0.115, 0.72 / Math.max(5, totalSlices)));
                                                const displayName = formatSliceLabel(item.name);

                                                return (
                                                    <g key={item.id}>
                                                        <path
                                                            d={pathData}
                                                            fill={theme.bg}
                                                            stroke="rgba(17,24,39,0.16)"
                                                            strokeWidth="0.003"
                                                        />
                                                        <text
                                                            x={textX}
                                                            y={textY}
                                                            fill={theme.text}
                                                            fontSize={fontSize}
                                                            fontWeight="600"
                                                            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
                                                            textAnchor="middle"
                                                            dominantBaseline="central"
                                                            transform={`rotate(${rotationDeg}, ${textX}, ${textY})`}
                                                        >
                                                            {displayName}
                                                        </text>
                                                    </g>
                                                );
                                            })}

                                            {/* Yumuşak Dış Kenar Derinlik Gölgesi */}
                                            <circle cx="0" cy="0" r="1" fill="url(#wheelEdgeVignette)" pointerEvents="none" />
                                        </svg>
                                    </div>

                                    {/* SABİT KAVİSLİ REHBER YAZI (Yalnızca Dönüş Başlamadan Önce Görünür) */}
                                    <svg
                                        viewBox="-1 -1 2 2"
                                        className={cn(
                                            'w-full h-full absolute inset-0 pointer-events-none z-20 transition-opacity duration-200',
                                            !isRolling && !winner && totalSlices >= 2 ? 'opacity-100' : 'opacity-0'
                                        )}
                                    >
                                        <defs>
                                            <path
                                                id="wheelTopHintArc"
                                                d="M -0.502 -0.290 A 0.58 0.58 0 0 1 0.502 -0.290"
                                            />
                                            <path
                                                id="wheelBottomHintArc"
                                                d="M -0.616 0.287 A 0.68 0.68 0 0 0 0.616 0.287"
                                            />
                                            <filter id="wheelHintShadow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feDropShadow dx="0" dy="0.014" stdDeviation="0.018" floodColor="#000000" floodOpacity="0.82" />
                                            </filter>
                                        </defs>
                                        <text
                                            fill="#ffffff"
                                            fontSize="0.112"
                                            fontWeight="800"
                                            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
                                            filter="url(#wheelHintShadow)"
                                        >
                                            <textPath href="#wheelTopHintArc" startOffset="50%" textAnchor="middle">
                                                Çevirmek için tıkla
                                            </textPath>
                                        </text>
                                        <text
                                            fill="#ffffff"
                                            fontSize="0.088"
                                            fontWeight="800"
                                            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
                                            filter="url(#wheelHintShadow)"
                                        >
                                            <textPath href="#wheelBottomHintArc" startOffset="50%" textAnchor="middle">
                                                veya Boşluk / Ctrl+Enter
                                            </textPath>
                                        </text>
                                    </svg>

                                    {/* 3 O'CLOCK CANLI RENK UYUMLU 3D EĞİMLİ İBRE (SAĞ KONUM) */}
                                    <div
                                        ref={needleRef}
                                        className={cn(
                                            'absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none',
                                            isWheelFullscreen ? 'right-[-22px] sm:right-[-28px]' : 'right-[-16px] sm:right-[-20px]'
                                        )}
                                        style={{ transformOrigin: '86% 50%' }}
                                    >
                                        <svg
                                            width={isWheelFullscreen ? '64' : '48'}
                                            height={isWheelFullscreen ? '48' : '36'}
                                            viewBox="0 0 64 48"
                                            className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]"
                                        >
                                            <polygon
                                                ref={pointerTopPolyRef}
                                                points="2,24 58,5 58,24"
                                                fill={getSliceColor(0, totalSlices).bevelTop}
                                            />
                                            <polygon
                                                ref={pointerBottomPolyRef}
                                                points="2,24 58,24 58,43"
                                                fill={getSliceColor(0, totalSlices).bevelDark}
                                            />
                                        </svg>
                                    </div>

                                    {/* MERKEZ SAF BEYAZ DAİRE GÖBEK (Wheel of Names Tarzı Tıklanabilir) */}
                                    <button
                                        type="button"
                                        onClick={spinWheel}
                                        disabled={isRolling || totalSlices < 2}
                                        aria-label={isRolling ? 'Çark dönüyor' : 'Çarkı çevir'}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[21%] h-[21%] rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] z-20 cursor-pointer hover:scale-[1.03] active:scale-95 transition-transform disabled:cursor-not-allowed"
                                    />
                                </div>
                            )}

                            {/* ══ KAZANAN EKRANI (Wheel of Names Tarzı Renkli Başlık Penceresi) ══ */}
                            {winner && !isRolling && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.78, y: 18 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.78, y: 18 }}
                                    transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                                    className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4"
                                >
                                    <div
                                        className={cn(
                                            'relative bg-slate-900 border border-white/15 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.75)] w-full overflow-hidden',
                                            isWheelFullscreen ? 'max-w-lg' : 'max-w-md'
                                        )}
                                    >
                                        {/* Üst Renkli Başlık Şeridi (Kazanan Dilimin Rengi) */}
                                        <div
                                            className="px-6 py-4 flex items-center justify-between"
                                            style={{ backgroundColor: winnerColor?.bg || '#63B3ED' }}
                                        >
                                            <div className="flex items-center gap-2 text-slate-950 font-black text-base sm:text-lg">
                                                <Trophy className="w-5 h-5" />
                                                <span>Kazanan Seçildi!</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-950/80 bg-white/45 px-2.5 py-0.5 rounded-full">
                                                #{recentWinners.length}
                                            </span>
                                        </div>

                                        <div className={cn('text-center', isWheelFullscreen ? 'p-7 sm:p-9' : 'p-6')}>
                                            <h3
                                                className={cn(
                                                    'font-black text-white mb-1.5 tracking-tight leading-tight break-words',
                                                    isWheelFullscreen ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
                                                )}
                                            >
                                                {winner.name}
                                            </h3>

                                            <p className="text-sm text-slate-400 font-semibold mb-6">
                                                {winner.className || 'Öğrenci'}
                                            </p>

                                            <div className="flex flex-col gap-2 w-full">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        onClick={() => handleAfterWinAction('remove-close')}
                                                        className="h-11 text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl cursor-pointer"
                                                    >
                                                        <UserMinus className="w-4 h-4 mr-1.5" /> Çıkar & Sunuma Dön
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleAfterWinAction('stay-close')}
                                                        className="h-11 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl cursor-pointer"
                                                    >
                                                        <Check className="w-4 h-4 mr-1.5" /> Sunuma Dön
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <Button
                                                        onClick={() => {
                                                            try { playSound('applause'); } catch {}
                                                            try {
                                                                confetti({
                                                                    particleCount: 90,
                                                                    spread: 80,
                                                                    origin: { y: 0.6 },
                                                                    colors: ['#63B3ED', '#74E09F', '#F7E06D', '#B47EC8', '#F48FB1']
                                                                });
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
                                                        <UserMinus className="w-3.5 h-3.5 mr-1" /> Kaldır
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleAfterWinAction('respin')}
                                                        variant="outline"
                                                        className="h-9 text-xs font-bold border-white/20 text-slate-200 hover:bg-white/10 rounded-xl cursor-pointer"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Kapat
                                                    </Button>
                                                </div>
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
