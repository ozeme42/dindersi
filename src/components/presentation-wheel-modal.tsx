'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    X, Users, Sparkles, RotateCcw, UserMinus, Trophy, 
    Settings, PartyPopper, Check, ChevronDown, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { SchoolClass, UserProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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

    // Fullscreen State
    const [isWheelFullscreen, setIsWheelFullscreen] = useState(false);

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
                    particleCount: 160,
                    spread: 90,
                    origin: { y: 0.55 }
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
                className={cn(
                    "fixed inset-0 z-50 flex items-center justify-center select-none",
                    isWheelFullscreen ? "bg-slate-950 p-0" : "bg-slate-950/70 backdrop-blur-md p-3 sm:p-6"
                )}
                onClick={isWheelFullscreen ? undefined : onClose}
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.3 }}
                    onClick={e => e.stopPropagation()}
                    className={cn(
                        "relative flex flex-col bg-slate-900 text-white overflow-hidden shadow-2xl transition-all duration-300",
                        isWheelFullscreen 
                            ? "w-screen h-screen max-w-none max-h-none rounded-none border-0" 
                            : "w-full max-w-5xl max-h-[92vh] rounded-[2.5rem] border-2 border-indigo-500/40 shadow-indigo-950/60"
                    )}
                >
                    {/* Üst Başlık, Sınıf Bilgisi & Kontroller */}
                    <div className={cn(
                        "flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-slate-950/60 flex-shrink-0 z-20",
                        isWheelFullscreen ? "py-4 px-8" : "py-3.5 px-6"
                    )}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300">
                                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                            </div>
                            <div>
                                <h3 className={cn("font-black text-white tracking-tight flex items-center gap-2", isWheelFullscreen ? "text-2xl" : "text-lg")}>
                                    Şanslı Kura Çarkı
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                    <span>{pickerSource === 'registered' ? (selectedClassData ? `${selectedClassData.name} ${branchFilter !== 'all' ? `(${branchFilter})` : ''}` : 'Tüm Sınıflar') : 'Özel Liste'}</span>
                                    <span>•</span>
                                    <span className="text-sky-400 font-bold">{totalSlices} Öğrenci</span>
                                </div>
                            </div>
                        </div>

                        {/* Sağ Aksiyon Butonları */}
                        <div className="flex items-center gap-2">
                            {/* Tam Ekran Modunda Hızlı Çevir */}
                            {isWheelFullscreen && (
                                <Button
                                    onClick={spinWheel}
                                    disabled={isRolling || totalSlices < 2}
                                    className="h-10 px-5 text-sm font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer mr-2"
                                >
                                    <Sparkles className={cn("w-4 h-4 mr-1", isRolling && "animate-spin")} />
                                    {isRolling ? "Dönüyor..." : "ÇEVİR"}
                                </Button>
                            )}

                            {/* Tam Ekran / Küçült Toggle Butonu */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsWheelFullscreen(prev => !prev)}
                                className="h-9 px-3 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold gap-1.5 cursor-pointer"
                                title={isWheelFullscreen ? "Normal Görünüme Dön" : "Tam Ekranda Büyüt"}
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

                            {/* Kapat Butonu */}
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Kapat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Ana Gövde (Sol: Ayarlar/Liste, Sağ: Dönen Çark) */}
                    <div className={cn(
                        "flex-1 flex overflow-hidden min-h-0",
                        isWheelFullscreen ? "flex-col md:flex-row p-4 md:p-8 gap-6" : "flex-col md:flex-row p-4 md:p-6 gap-6"
                    )}>
                        {/* SOL: Kontrol & Sınıf / Şube Filtresi (Tam ekranda kompakt veya gizlenebilir) */}
                        <div className={cn(
                            "flex flex-col gap-4 overflow-y-auto pr-1 flex-shrink-0 transition-all",
                            isWheelFullscreen ? "w-full md:w-80" : "w-full md:w-80"
                        )}>
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
                                        rows={isWheelFullscreen ? 8 : 5}
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
                                className={cn(
                                    "w-full text-white shadow-xl shadow-indigo-950/40 rounded-2xl transition-all active:scale-95 disabled:opacity-40 cursor-pointer mt-auto font-black",
                                    isWheelFullscreen 
                                        ? "h-16 text-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:from-amber-400 hover:to-pink-400" 
                                        : "h-14 text-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400"
                                )}
                            >
                                <Sparkles className={cn("w-5 h-5 mr-1.5", isRolling && "animate-spin")} />
                                {isRolling ? "Çark Dönüyor..." : "ÇARKIK ÇEVİR"}
                            </Button>
                        </div>

                        {/* SAĞ: Dönen Çark SVG & Gösterge İbresi (Tam Ekranda Devasa Boyut) */}
                        <div className={cn(
                            "flex-1 flex items-center justify-center relative bg-slate-950/40 rounded-3xl border border-white/10 overflow-hidden transition-all",
                            isWheelFullscreen ? "p-4 min-h-[400px]" : "p-2 min-h-[300px] md:min-h-[420px]"
                        )}>
                            {/* Gösterge İbresi (Ticker Needle) */}
                            <div className={cn(
                                "absolute z-30 filter drop-shadow-2xl transition-transform origin-right pointer-events-none",
                                isWheelFullscreen 
                                    ? "right-4 sm:right-12 top-1/2 -translate-y-1/2" 
                                    : "right-2 sm:right-6 top-1/2 -translate-y-1/2",
                                tickerShake ? "rotate-[-18deg]" : "rotate-0"
                            )}>
                                <div className="relative">
                                    <div className={cn(
                                        "w-0 h-0 border-t-transparent border-r-amber-400 border-b-transparent drop-shadow-[0_0_15px_rgba(245,158,11,0.9)]",
                                        isWheelFullscreen 
                                            ? "border-t-[26px] border-r-[65px] border-b-[26px]" 
                                            : "border-t-[18px] border-r-[45px] border-b-[18px]"
                                    )} />
                                    <div className={cn(
                                        "absolute top-1/2 right-1.5 -translate-y-1/2 bg-white rounded-full shadow-inner",
                                        isWheelFullscreen ? "w-5 h-5" : "w-3.5 h-3.5"
                                    )} />
                                </div>
                            </div>

                            {/* Çark Dairesi */}
                            <div className={cn(
                                "relative aspect-square w-full flex items-center justify-center transition-all duration-300",
                                isWheelFullscreen 
                                    ? "max-w-[78vh] h-[78vh]" 
                                    : "max-w-[360px] md:max-w-[440px]"
                            )}>
                                <div 
                                    className={cn(
                                        "w-full h-full rounded-full shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden bg-slate-900 transition-none",
                                        isWheelFullscreen ? "border-[14px] border-slate-800" : "border-[10px] border-slate-800"
                                    )}
                                    style={{
                                        transform: `rotate(${rotation}deg)`,
                                        transition: 'none'
                                    }}
                                >
                                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_35px_rgba(0,0,0,0.6)] z-10 pointer-events-none border-[3px] border-white/10" />

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
                                            
                                            // Sınıftaki herkesin adı okunsun diye dinamik yazı boyutu
                                            const fontSize = Math.max(0.045, Math.min(0.085, 0.5 / (totalSlices > 0 ? totalSlices : 1)));

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
                                                        fontFamily="Arial Black, Impact, system-ui, sans-serif"
                                                        textAnchor="middle"
                                                        alignmentBaseline="middle"
                                                        transform={`rotate(${rotationDeg}, ${textX}, ${textY})`}
                                                        style={{ 
                                                            textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)',
                                                            letterSpacing: '0.02em'
                                                        }}
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
                                    className={cn(
                                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center justify-center z-20 cursor-pointer hover:scale-105 active:scale-95 transition-transform group",
                                        isWheelFullscreen 
                                            ? "w-28 h-28 border-[8px] border-slate-800" 
                                            : "w-20 h-20 border-[6px] border-slate-800"
                                    )}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-100 to-slate-300 rounded-full" />
                                    <span className={cn(
                                        "relative text-slate-900 font-black tracking-tight group-hover:text-indigo-600 transition-colors",
                                        isWheelFullscreen ? "text-lg" : "text-xs sm:text-sm"
                                    )}>
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
                                    <div className={cn(
                                        "relative text-center bg-slate-900 border-4 border-amber-400 rounded-[2.5rem] shadow-[0_0_100px_rgba(245,158,11,0.6)] w-full",
                                        isWheelFullscreen ? "p-10 max-w-md" : "p-6 md:p-8 max-w-sm"
                                    )}>
                                        <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-300 border-2 border-amber-400/50 flex items-center justify-center mx-auto mb-4 animate-bounce">
                                            <Trophy className="w-9 h-9" />
                                        </div>

                                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                                            Seçilen Öğrenci
                                        </span>

                                        <h3 className={cn(
                                            "font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 my-3",
                                            isWheelFullscreen ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"
                                        )}>
                                            {winner.name}
                                        </h3>
                                        <p className="text-base text-slate-300 font-bold mb-8">
                                            {winner.className || "Öğrenci"}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3.5">
                                            <Button
                                                onClick={removeCurrentStudent}
                                                variant="destructive"
                                                className="h-12 text-xs font-bold rounded-xl border border-red-500/40 cursor-pointer"
                                            >
                                                <UserMinus className="w-4 h-4 mr-1.5" /> Listeden Çıkar
                                            </Button>
                                            <Button
                                                onClick={() => setWinner(null)}
                                                className="h-12 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/40 cursor-pointer"
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
