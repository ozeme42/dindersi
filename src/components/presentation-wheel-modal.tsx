'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    X, Users, Sparkles, RotateCcw, UserMinus, Trophy, 
    Settings, PartyPopper, Check, ChevronDown, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { SchoolClass, UserProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/user-avatar';
import { playSound } from '@/lib/audio-service';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const WHEEL_COLORS = [
    '#4f46e5', '#db2777', '#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
    '#14b8a6', '#64748b', '#ec4899', '#0ea5e9', '#f97316', '#06b6d4', '#84cc16'
];

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

    // Mode: 'registered' (Kayıtlı Öğrenciler) | 'custom' (Özel İsim Listesi)
    const [pickerSource, setPickerSource] = useState<'registered' | 'custom'>('registered');
    const [customNamesText, setCustomNamesText] = useState('Ahmet\nMehmet\nAyşe\nFatma\nAli\nZeynep\nMustafa\nElif');

    // Wheel States
    const [isRolling, setIsRolling] = useState(false);
    const [winner, setWinner] = useState<{ id: string; name: string; avatarUrl?: string; className?: string } | null>(null);
    const [removedStudentIds, setRemovedStudentIds] = useState<Set<string>>(new Set());
    const [rotation, setRotation] = useState(0);
    const [tickerShake, setTickerShake] = useState(false);

    // Animation Refs
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const totalRotationRef = useRef<number>(0);

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

    // --- FİZİK TABANLI DÖNÜŞ MANTIĞI ---
    const spinWheel = () => {
        if (totalSlices < 2) {
            alert("Çarkı çevirmek için en az 2 öğrenci veya isim gereklidir.");
            return;
        }
        if (isRolling) return;

        setIsRolling(true);
        setWinner(null);

        const duration = 6500 + Math.random() * 3000;
        const initialSpeed = 45 + Math.random() * 20;

        startTimeRef.current = performance.now();
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

        const animate = (time: number) => {
            const elapsedTime = time - (startTimeRef.current || 0);
            const progress = Math.min(elapsedTime / duration, 1);
            const ease = easeOut(progress);
            const remaining = 1 - ease;
            const currentSpeed = initialSpeed * remaining;

            totalRotationRef.current += currentSpeed;
            setRotation(totalRotationRef.current);

            const currentAngle = totalRotationRef.current % 360;
            const currentSliceIndex = Math.floor(currentAngle / sliceAngle);
            const prevAngle = (totalRotationRef.current - currentSpeed) % 360;
            const prevSliceIndex = Math.floor(prevAngle / sliceAngle);

            if (currentSliceIndex !== prevSliceIndex) {
                setTickerShake(true);
                setTimeout(() => setTickerShake(false), 50);
            }

            if (progress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            } else {
                setIsRolling(false);
                determineWinner(totalRotationRef.current);
            }
        };

        requestRef.current = requestAnimationFrame(animate);
    };

    const determineWinner = (finalRotation: number) => {
        const normalizedRotation = finalRotation % 360;
        let winningIndex = Math.floor((360 - normalizedRotation) / sliceAngle);

        if (winningIndex < 0) winningIndex = totalSlices + winningIndex;
        winningIndex = winningIndex % totalSlices;

        const winnerItem = wheelItems[winningIndex];
        if (winnerItem) {
            setWinner(winnerItem);
            try {
                playSound('win');
            } catch (e) {}
            try {
                confetti({
                    particleCount: 120,
                    spread: 80,
                    origin: { y: 0.6 }
                });
            } catch (e) {}
        }
    };

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

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-3 sm:p-6 select-none"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", duration: 0.3 }}
                    onClick={e => e.stopPropagation()}
                    className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[2.5rem] bg-slate-900 border-2 border-indigo-500/40 shadow-2xl text-white overflow-hidden shadow-indigo-950/50"
                >
                    {/* Üst Başlık & Kapat Butonu */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300">
                                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                    Şanslı Kura Çarkı
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">
                                    Kayıtlı öğrenciler veya özel liste arasından rastgele kura çekin.
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Ana Gövde (Sol: Ayarlar/Liste, Sağ: Dönen Çark) */}
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 md:p-6 gap-6 min-h-0">
                        {/* SOL: Kontrol & Sınıf / Şube Filtresi */}
                        <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto pr-1 flex-shrink-0">
                            {/* Kaynak Seçimi (Kayıtlı vs Özel Liste) */}
                            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950/60 border border-white/10">
                                <button
                                    onClick={() => { setPickerSource('registered'); resetStudentList(); }}
                                    className={cn(
                                        "py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                                        pickerSource === 'registered'
                                            ? "bg-indigo-600 text-white shadow-md"
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
                                            ? "bg-indigo-600 text-white shadow-md"
                                            : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Özel Liste
                                </button>
                            </div>

                            {/* Kayıtlı Öğrenciler Filtreleri */}
                            {pickerSource === 'registered' ? (
                                <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-300">Sınıf Seçimi</Label>
                                        <Select 
                                            value={classFilter} 
                                            onValueChange={val => { setClassFilter(val); setBranchFilter('all'); resetStudentList(); }}
                                            disabled={isRolling || isLoadingData}
                                        >
                                            <SelectTrigger className="bg-slate-950/70 border-white/10 h-10 text-xs text-white rounded-xl">
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
                                            <SelectTrigger className="bg-slate-950/70 border-white/10 h-10 text-xs text-white rounded-xl">
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
                                <div className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 flex-1 flex flex-col">
                                    <Label className="text-xs font-bold text-slate-300">İsimler (Her Satıra Bir İsim)</Label>
                                    <textarea
                                        rows={6}
                                        value={customNamesText}
                                        onChange={e => { setCustomNamesText(e.target.value); resetStudentList(); }}
                                        disabled={isRolling}
                                        className="w-full flex-1 p-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-white resize-none font-medium focus:outline-none focus:border-indigo-500"
                                        placeholder="İsim 1&#10;İsim 2&#10;İsim 3..."
                                    />
                                </div>
                            )}

                            {/* İstatistik & Sıfırla */}
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-slate-400">
                                <div className="flex items-center gap-2 font-bold">
                                    <Users className="w-4 h-4 text-sky-400" />
                                    <span>Çarktaki Kişi: <strong className="text-white font-black">{totalSlices}</strong></span>
                                </div>
                                {removedStudentIds.size > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetStudentList}
                                        disabled={isRolling}
                                        className="h-7 px-2 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
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
                                className="w-full h-14 text-lg font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white shadow-xl shadow-indigo-950/40 rounded-2xl transition-all active:scale-95 disabled:opacity-40 cursor-pointer mt-auto"
                            >
                                <Sparkles className={cn("w-5 h-5 mr-1.5", isRolling && "animate-spin")} />
                                {isRolling ? "Çark Dönüyor..." : "ÇARKIK ÇEVİR"}
                            </Button>
                        </div>

                        {/* SAĞ: Dönen Çark SVG & Gösterge İbresi */}
                        <div className="flex-1 flex items-center justify-center relative p-2 min-h-[300px] md:min-h-[420px] bg-slate-950/40 rounded-3xl border border-white/10 overflow-hidden">
                            {/* Gösterge İbresi (Ticker Needle) */}
                            <div className={cn(
                                "absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 filter drop-shadow-2xl transition-transform origin-right pointer-events-none",
                                tickerShake ? "rotate-[-16deg]" : "rotate-0"
                            )}>
                                <div className="relative">
                                    <div className="w-0 h-0 border-t-[18px] border-t-transparent border-r-[45px] border-r-amber-400 border-b-[18px] border-b-transparent drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                                    <div className="absolute top-1/2 right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-inner" />
                                </div>
                            </div>

                            {/* Çark Dairesi */}
                            <div className="relative aspect-square w-full max-w-[360px] md:max-w-[420px] flex items-center justify-center">
                                <div 
                                    className="w-full h-full rounded-full border-[10px] border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden bg-slate-900"
                                    style={{
                                        transform: `rotate(${rotation}deg)`,
                                        transition: 'none'
                                    }}
                                >
                                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_30px_rgba(0,0,0,0.6)] z-10 pointer-events-none border-[2px] border-white/10" />

                                    <svg viewBox="-1 -1 2 2" className="w-full h-full" style={{ transform: 'rotate(0deg)' }}>
                                        {wheelItems.map((item, index) => {
                                            const startPercent = index / totalSlices;
                                            const endPercent = (index + 1) / totalSlices;

                                            const [startX, startY] = getCoordinatesForPercent(startPercent);
                                            const [endX, endY] = getCoordinatesForPercent(endPercent);
                                            const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;
                                            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                                            const color = WHEEL_COLORS[index % WHEEL_COLORS.length];

                                            const midAngle = (startPercent + endPercent) * Math.PI;
                                            const textRadius = 0.65;
                                            const textX = Math.cos(midAngle) * textRadius;
                                            const textY = Math.sin(midAngle) * textRadius;
                                            const rotationDeg = (midAngle * 180) / Math.PI;
                                            const fontSize = Math.max(0.04, Math.min(0.075, 0.45 / (totalSlices > 0 ? totalSlices : 1)));

                                            const displayName = item.name.split(' ')[0].toUpperCase();

                                            return (
                                                <g key={item.id}>
                                                    <path d={pathData} fill={color} stroke="#0f172a" strokeWidth="0.008" />
                                                    <text
                                                        x={textX}
                                                        y={textY}
                                                        fill="white"
                                                        fontSize={fontSize}
                                                        fontWeight="900"
                                                        fontFamily="Arial Black, system-ui, sans-serif"
                                                        textAnchor="middle"
                                                        alignmentBaseline="middle"
                                                        transform={`rotate(${rotationDeg}, ${textX}, ${textY})`}
                                                        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}
                                                    >
                                                        {displayName}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>

                                {/* Merkez Çevir Düğmesi */}
                                <div 
                                    onClick={spinWheel}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full border-[6px] border-slate-800 shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center z-20 cursor-pointer hover:scale-105 active:scale-95 transition-transform group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-100 to-slate-300 rounded-full" />
                                    <span className="relative text-slate-900 font-black text-sm tracking-tight group-hover:text-indigo-600 transition-colors">
                                        ÇEVİR
                                    </span>
                                </div>
                            </div>

                            {/* ══ KAZANAN ÖĞRENCİ MODAL / SPOTLIGHT ══ */}
                            {winner && !isRolling && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
                                >
                                    <div className="relative text-center p-6 md:p-8 bg-slate-900 border-2 border-amber-400 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.5)] max-w-sm w-full">
                                        <div className="w-14 h-14 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center mx-auto mb-3">
                                            <Trophy className="w-8 h-8" />
                                        </div>

                                        <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest">
                                            Seçilen Öğrenci
                                        </span>

                                        <h3 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 my-2">
                                            {winner.name}
                                        </h3>
                                        <p className="text-sm text-slate-400 font-semibold mb-6">
                                            {winner.className || "Öğrenci"}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                onClick={removeCurrentStudent}
                                                variant="destructive"
                                                className="h-11 text-xs font-bold rounded-xl border border-red-500/40 cursor-pointer"
                                            >
                                                <UserMinus className="w-3.5 h-3.5 mr-1" /> Listeden Çıkar
                                            </Button>
                                            <Button
                                                onClick={() => setWinner(null)}
                                                className="h-11 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-950/40 cursor-pointer"
                                            >
                                                <Check className="w-4 h-4 mr-1" /> Devam Et
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
