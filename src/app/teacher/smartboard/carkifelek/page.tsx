'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Trophy, User, ArrowLeft, Trash2, Zap, UserMinus, RotateCcw,
    Maximize2, Minimize2, PartyPopper, Settings, Users, Plus, UserPlus,
    Volume2, VolumeX, Sparkles, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { SchoolClass, UserProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/user-avatar';
import { playSound } from '@/lib/audio-service';
import confetti from 'canvas-confetti';
import { addStudentToClass } from '@/app/teacher/students/actions';
import { useAuth } from '@/context/auth-context';

const WHEEL_COLORS = [
    '#4f46e5', '#db2777', '#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
    '#14b8a6', '#64748b', '#ec4899', '#0ea5e9', '#f97316'
];

const DEMO_SANAL_OGRENCILER: UserProfile[] = [
    { uid: 'sanal-1', displayName: 'Ahmet Yılmaz', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-2', displayName: 'Ayşe Kaya', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-3', displayName: 'Mehmet Demir', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-4', displayName: 'Fatma Çelik', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-5', displayName: 'Ali Şahin', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-6', displayName: 'Zeynep Yıldız', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-7', displayName: 'Mustafa Aydın', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-8', displayName: 'Elif Öztürk', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-9', displayName: 'Emir Arslan', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-10', displayName: 'Hira Doğan', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-11', displayName: 'Burak Koç', class: '5-A', role: 'guest' } as any,
    { uid: 'sanal-12', displayName: 'Merve Yavuz', class: '5-A', role: 'guest' } as any,
];

export default function WheelOfFortunePage() {
    const { user } = useAuth();

    // Data States
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [classFilter, setClassFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Manual Student Addition
    const [customStudentName, setCustomStudentName] = useState('');
    const [isAddingCustom, setIsAddingCustom] = useState(false);

    // Wheel States
    const [isRolling, setIsRolling] = useState(false);
    const [winner, setWinner] = useState<UserProfile | null>(null);
    const [removedStudentIds, setRemovedStudentIds] = useState<Set<string>>(new Set());
    const [rotation, setRotation] = useState(0); 
    const [isWheelFullscreen, setIsWheelFullscreen] = useState(false);
    
    // Animation Refs
    const requestRef = useRef<number>();
    const startTimeRef = useRef<number>();
    const totalRotationRef = useRef<number>(0);
    const [tickerShake, setTickerShake] = useState(false);

    // Veri Çekme: SADECE SANAL ÖĞRENCİLER (role === 'guest')
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoadingData(true);
            try {
                let fetchedClasses: SchoolClass[] = [];
                try {
                    const classesSnap = await getDocs(query(collection(db, "classes"), orderBy("name")));
                    fetchedClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
                } catch (e) {
                    console.warn("Classes could not be loaded:", e);
                }
                setAllClasses(fetchedClasses);

                let loadedGuests: UserProfile[] = [];
                try {
                    // AKILLI TAHTA ÇARKI: SADECE Sanal Öğrenciler (role === 'guest')
                    const guestsQuery = query(collection(db, "users"), where("role", "==", "guest"));
                    const guestsSnap = await getDocs(guestsQuery);
                    loadedGuests = guestsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
                } catch (e) {
                    console.warn("Could not query guest users:", e);
                }

                if (loadedGuests.length === 0) {
                    // Veritabanında sanal öğrenci yoksa hazır örnek sanal öğrencileri kullan
                    loadedGuests = [...DEMO_SANAL_OGRENCILER];
                }

                setAllStudents(loadedGuests);
            } catch (error) {
                console.error("Error fetching data:", error);
                setAllStudents([...DEMO_SANAL_OGRENCILER]);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchInitialData();
    }, []);

    const selectedClassData = useMemo(() => allClasses.find(c => c.id === classFilter), [classFilter, allClasses]);

    const filteredStudents = useMemo(() => {
        let students = allStudents;
        if (classFilter !== 'all' && selectedClassData) {
            const rawClassName = (selectedClassData.name || '').trim().toLowerCase();
            const gradeNum = rawClassName.match(/\d+/)?.[0] || '';

            if (branchFilter === 'all') {
                const matched = students.filter(s => {
                    const sc = (s.class || '').trim().toLowerCase();
                    return sc.includes(rawClassName) || (gradeNum && sc.startsWith(gradeNum));
                });
                if (matched.length > 0) students = matched;
            } else {
                const fullClassName = `${selectedClassData.name} - ${branchFilter}`.toLowerCase();
                const matched = students.filter(s => {
                    const sc = (s.class || '').trim().toLowerCase();
                    return sc === fullClassName || sc.includes(branchFilter.toLowerCase());
                });
                if (matched.length > 0) students = matched;
            }
        }
        return students.filter(s => !removedStudentIds.has(s.uid));
    }, [allStudents, classFilter, branchFilter, selectedClassData, removedStudentIds]);

    const students = filteredStudents;
    const totalSlices = students.length;
    const sliceAngle = 360 / (totalSlices || 1);

    // Hızlı Sanal Öğrenci Ekleme (Firestore'a guest olarak kaydeder)
    const handleAddCustomStudent = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = customStudentName.trim();
        if (!trimmed || isAddingCustom) return;

        setIsAddingCustom(true);
        const targetClassName = selectedClassData 
            ? (branchFilter !== 'all' ? `${selectedClassData.name} - ${branchFilter}` : selectedClassData.name)
            : '5-A';

        try {
            const res = await addStudentToClass(trimmed, targetClassName, user?.uid || null);
            if (res.success && res.newUser) {
                setAllStudents(prev => [res.newUser!, ...prev]);
            } else {
                // Fallback local sanal öğrenci
                const localUser: UserProfile = {
                    uid: `sanal-${Date.now()}`,
                    displayName: trimmed,
                    class: targetClassName,
                    role: 'guest'
                } as any;
                setAllStudents(prev => [localUser, ...prev]);
            }
            try { playSound('pop'); } catch (e) {}
        } catch (err) {
            const localUser: UserProfile = {
                uid: `sanal-${Date.now()}`,
                displayName: trimmed,
                class: targetClassName,
                role: 'guest'
            } as any;
            setAllStudents(prev => [localUser, ...prev]);
        } finally {
            setCustomStudentName('');
            setIsAddingCustom(false);
        }
    };

    // Örnek Sanal Öğrencileri Yükle
    const handleLoadDemoStudents = () => {
        setAllStudents([...DEMO_SANAL_OGRENCILER]);
        setRemovedStudentIds(new Set());
        setClassFilter('all');
        setBranchFilter('all');
        try { playSound('pop'); } catch (e) {}
    };

    // --- FİZİK TABANLI DÖNÜŞ MANTIĞI ---
    const spinWheel = () => {
        if (students.length < 2) {
            return;
        }
        if (isRolling) return;
        
        setIsRolling(true);
        setWinner(null);
        
        const duration = 6500 + Math.random() * 2500;
        const initialSpeed = 45 + Math.random() * 15;
        
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
            const sliceIndex = Math.floor(currentAngle / sliceAngle);
            const prevAngle = (totalRotationRef.current - currentSpeed) % 360;
            const prevSliceIndex = Math.floor(prevAngle / sliceAngle);
            
            if (sliceIndex !== prevSliceIndex) {
                setTickerShake(true);
                try { playSound('click'); } catch (e) {}
                setTimeout(() => setTickerShake(false), 40); 
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
        
        const winnerStudent = students[winningIndex];
        
        setWinner(winnerStudent);
        try { playSound('win'); } catch (e) {}
        try {
            confetti({
                particleCount: 100,
                spread: 90,
                origin: { y: 0.6 }
            });
        } catch (e) {}
    };

    const removeCurrentStudent = () => {
        if (winner) {
            setRemovedStudentIds(prev => new Set(prev).add(winner.uid));
            setWinner(null);
            try { playSound('pop'); } catch (e) {}
        }
    };
    
    const resetStudentList = () => {
        setRemovedStudentIds(new Set());
        setWinner(null);
        try { playSound('pop'); } catch (e) {}
    };

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative selection:bg-cyan-500/30 font-sans select-none">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/15 rounded-full blur-[180px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-fuchsia-900/15 rounded-full blur-[180px]" />
            </div>

            {/* Üst Menü Navigasyonu */}
            <header className={cn(
                "flex-shrink-0 p-4 sm:p-5 flex items-center justify-between z-20 bg-slate-900/60 backdrop-blur-md border-b border-white/10",
                isWheelFullscreen && "hidden"
            )}>
                <div className="flex items-center gap-4">
                    <Link
                        href="/teacher/smartboard"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 text-xs font-bold transition-all shadow-md group active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4 text-purple-400 group-hover:-translate-x-1 transition-transform" />
                        <span>Akıllı Tahta Menüsü</span>
                    </Link>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2.5">
                        <Zap className="text-yellow-400 h-6 w-6 fill-yellow-400" />
                        Şanslı Çark (Sanal Öğrenciler)
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => setIsWheelFullscreen(true)} 
                        className="h-10 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-xl font-bold text-xs"
                    >
                        <Maximize2 className="mr-1.5 h-4 w-4"/> Tam Ekran
                    </Button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden z-10 p-3 sm:p-6 gap-4 sm:gap-6">
                 {/* Sol Panel: Ayarlar ve Liste */}
                 {!isWheelFullscreen && (
                     <div className="w-80 md:w-96 flex flex-col gap-4 h-full overflow-y-auto pr-1 custom-scrollbar shrink-0">
                        {/* Ayarlar Kartı */}
                        <div className="bg-slate-900/70 backdrop-blur-xl p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl">
                            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-xs">
                                <Settings className="w-4 h-4 text-purple-400" /> Sanal Sınıf ve Şube
                            </div>
                            
                            <div className="space-y-1.5">
                                <Label className="text-slate-300 text-xs font-semibold">Sınıf</Label>
                                <Select value={classFilter} onValueChange={(val) => { setClassFilter(val); setBranchFilter('all'); }} disabled={isRolling}>
                                    <SelectTrigger className="bg-slate-950/60 border-white/10 h-11 text-sm text-white rounded-xl focus:ring-purple-500/50">
                                        <SelectValue placeholder="Sınıf Seçiniz"/>
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="all">Tüm Sanal Öğrenciler ({allStudents.length})</SelectItem>
                                        {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-1.5">
                                <Label className="text-slate-300 text-xs font-semibold">Şube</Label>
                                <Select value={branchFilter} onValueChange={(val) => setBranchFilter(val)} disabled={!selectedClassData || isRolling}>
                                    <SelectTrigger className="bg-slate-950/60 border-white/10 h-11 text-sm text-white rounded-xl focus:ring-purple-500/50">
                                        <SelectValue placeholder="Tüm Şubeler"/>
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="all">Tüm Şubeler</SelectItem>
                                        {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Hızlı Sanal Öğrenci Ekle */}
                            <form onSubmit={handleAddCustomStudent} className="pt-2 border-t border-white/10">
                                <Label className="text-slate-300 text-xs font-semibold mb-1.5 block">Hızlı Sanal Öğrenci Ekle</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Öğrenci Adı..."
                                        value={customStudentName}
                                        onChange={(e) => setCustomStudentName(e.target.value)}
                                        className="h-10 bg-slate-950/60 border-white/10 text-sm text-white rounded-xl"
                                        disabled={isRolling || isAddingCustom}
                                    />
                                    <Button type="submit" size="sm" className="h-10 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl" disabled={!customStudentName.trim() || isRolling || isAddingCustom}>
                                        {isAddingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </form>

                            {/* Durum Özeti */}
                            <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
                                <div className="flex items-center gap-1.5 font-bold">
                                    <Users className="w-4 h-4 text-purple-400" />
                                    <span>{students.length} Sanal Öğrenci Çarkta</span>
                                </div>
                                {removedStudentIds.size > 0 && (
                                    <Button variant="ghost" size="sm" onClick={resetStudentList} disabled={isRolling} className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 rounded-lg">
                                        <RotateCcw className="mr-1 h-3 w-3"/> Sıfırla ({removedStudentIds.size})
                                    </Button>
                                )}
                            </div>

                            {students.length < 2 && (
                                <Button 
                                    onClick={handleLoadDemoStudents} 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full h-10 border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 text-xs font-bold rounded-xl"
                                >
                                    <Sparkles className="mr-1.5 w-3.5 h-3.5" /> Örnek Sanal Öğrencileri Yükle
                                </Button>
                            )}
                        </div>

                         <Button 
                            size="lg" 
                            onClick={spinWheel} 
                            disabled={isRolling || students.length < 2}
                            className="w-full h-16 sm:h-20 text-2xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-xl shadow-purple-900/30 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                            {isRolling ? "ÇARK DÖNÜYOR..." : "ÇARKI ÇEVİR"}
                        </Button>
                     </div>
                 )}
                 
                 {/* Çark Alanı */}
                 <div className={cn(
                     "relative flex items-center justify-center transition-all duration-500 flex-1 overflow-hidden", 
                     isWheelFullscreen 
                        ? "fixed inset-0 z-50 bg-slate-950 p-4" 
                        : "bg-slate-900/40 border-2 border-white/10 rounded-3xl shadow-2xl p-4"
                    )}>
                     
                     {isWheelFullscreen && (
                         <div className="absolute top-6 right-6 z-50 flex gap-3">
                            <Button 
                                onClick={spinWheel} 
                                disabled={isRolling || students.length < 2} 
                                className="h-14 px-8 text-xl font-black bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl shadow-lg"
                            >
                                {isRolling ? "Dönüyor..." : "Çarkı Çevir"}
                            </Button>
                            <Button onClick={() => setIsWheelFullscreen(false)} className="bg-slate-800/90 hover:bg-slate-700 text-white rounded-2xl h-14 w-14 border border-white/15 shadow-md">
                                <Minimize2 className="h-6 w-6"/>
                            </Button>
                         </div>
                     )}

                     <div className={cn(
                         "relative aspect-square flex items-center justify-center transition-all duration-500", 
                         isWheelFullscreen ? "w-[88vh]" : "w-full max-w-[68vh]"
                     )}>
                         {/* İbre (Ticker) */}
                         <div className={cn(
                             "absolute right-[-20px] top-1/2 -translate-y-1/2 z-30 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] transition-transform origin-right",
                             tickerShake ? "rotate-[-18deg]" : "rotate-0"
                         )}>
                             <div className="relative">
                                 <div className="w-0 h-0 border-t-[26px] border-t-transparent border-r-[60px] border-r-white border-b-[26px] border-b-transparent drop-shadow-md" />
                                 <div className="absolute top-1/2 right-1.5 -translate-y-1/2 w-4 h-4 bg-slate-400 rounded-full shadow-inner" />
                             </div>
                         </div>

                         {/* Dönen Çark */}
                         <div 
                            className="w-full h-full rounded-full border-[10px] sm:border-[14px] border-slate-900 shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden bg-slate-900"
                            style={{ 
                                transform: `rotate(${rotation}deg)`,
                                transition: 'none'
                            }}
                         >
                            <div className="absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(0,0,0,0.6)] z-10 pointer-events-none border-[3px] border-white/10" />

                            <svg viewBox="-1 -1 2 2" className="w-full h-full">
                                {students.map((student, index) => {
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
                                    const fontSize = Math.max(0.032, Math.min(0.065, 0.38 / (totalSlices > 0 ? totalSlices : 1)));

                                    return (
                                        <g key={student.uid}>
                                            <path d={pathData} fill={color} stroke="#0f172a" strokeWidth="0.008" />
                                            <text 
                                                x={textX} 
                                                y={textY} 
                                                fill="white" 
                                                fontSize={fontSize}
                                                fontWeight="900"
                                                fontFamily="system-ui, -apple-system, sans-serif"
                                                textAnchor="middle" 
                                                alignmentBaseline="middle"
                                                transform={`rotate(${rotationDeg}, ${textX}, ${textY})`}
                                                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                                            >
                                                {student.displayName.split(' ')[0].toUpperCase()}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                         </div>
                         
                         {/* Merkez Buton */}
                         <div 
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-full border-[8px] border-slate-900 shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center justify-center z-20 cursor-pointer hover:scale-105 active:scale-95 transition-transform group"
                            onClick={spinWheel}
                         >
                             <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-200 rounded-full" />
                             <span className="relative text-slate-900 font-black text-lg sm:text-xl tracking-tight group-hover:text-purple-600 transition-colors">ÇEVİR</span>
                         </div>

                         {/* Kazanan Modalı */}
                         {winner && !isRolling && (
                             <div className="absolute inset-0 z-50 flex items-center justify-center">
                                 <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" />
                                 <div className="relative z-50 text-center animate-in zoom-in-75 duration-300 p-8 sm:p-10 bg-slate-900 border-4 border-yellow-500 rounded-[2.5rem] shadow-[0_0_100px_rgba(234,179,8,0.7)] max-w-md w-full mx-4">
                                     <PartyPopper className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                                     
                                     <div className="mb-4">
                                         <div className="w-24 h-24 mx-auto p-1.5 bg-yellow-500 rounded-full shadow-2xl">
                                             <UserAvatar user={winner} className="w-full h-full border-4 border-slate-900 text-4xl bg-slate-800" />
                                         </div>
                                     </div>
                                     
                                     <div className="space-y-1 mb-8">
                                         <span className="text-xs font-black uppercase tracking-widest text-yellow-400">ŞANSLI SANAL ÖĞRENCİ</span>
                                         <h3 className="text-3xl sm:text-4xl font-black text-white">{winner.displayName}</h3>
                                         <p className="text-lg text-slate-400 font-medium">{winner.class || "Sanal Öğrenci"}</p>
                                     </div>

                                     <div className="grid grid-cols-2 gap-3">
                                         <Button 
                                            onClick={removeCurrentStudent} 
                                            variant="destructive" 
                                            className="h-14 text-base font-black rounded-xl border border-rose-700 bg-rose-600 hover:bg-rose-500 shadow-md"
                                         >
                                             <UserMinus className="mr-2 h-5 w-5"/> Listeden Çıkar
                                         </Button>
                                         <Button 
                                            onClick={() => setWinner(null)} 
                                            className="h-14 text-base font-black bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white rounded-xl shadow-md"
                                         >
                                             Devam Et
                                         </Button>
                                     </div>
                                 </div>
                             </div>
                         )}
                     </div>
                 </div>
            </main>
        </div>
    );
}
