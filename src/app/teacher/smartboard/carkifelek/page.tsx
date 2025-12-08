
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Trophy, User, ArrowLeft, Trash2, Zap, UserMinus, RotateCcw,
    Maximize2, Minimize2, PartyPopper, Settings, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { SchoolClass, UserProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/user-avatar';
import { playSound } from '@/lib/audio-service';

// --- TİPLER ---
// Konfeti tipi tanımı burada gerekli değil, kaldırıldı.

const WHEEL_COLORS = [
    '#4f46e5', '#db2777', '#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
    '#14b8a6', '#64748b', '#ec4899', '#0ea5e9', '#f97316'
];


// --- KONFETİ EFEKTİ ---
const Confetti = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: any[] = [];
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#ffffff'];

        for (let i = 0; i < 400; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 40,
                vy: (Math.random() - 0.5) * 40 - 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                gravity: 0.6,
                drag: 0.96
            });
        }

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p, index) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= p.drag;
                p.vy *= p.drag;
                p.vy += p.gravity;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                if (p.y > canvas.height + 100) particles.splice(index, 1);
            });
            if (particles.length > 0) requestAnimationFrame(animate);
        };
        animate();
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[100]" />;
};

export default function WheelOfFortunePage() {
    // Data States
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [classFilter, setClassFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [isLoadingData, setIsLoadingData] = useState(true);

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
    const [tickerShake, setTickerShake] = useState(false); // İbre titremesi için

    // Veri Çekme
    useEffect(() => {
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
                console.error("Error fetching data:", error);
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
            if (branchFilter === 'all') {
                students = students.filter(s => s.class?.startsWith(selectedClassData.name));
            } else {
                const fullClassName = `${selectedClassData.name} - ${branchFilter}`;
                students = students.filter(s => s.class === fullClassName);
            }
        }
        return students.filter(s => !removedStudentIds.has(s.uid));
    }, [allStudents, classFilter, branchFilter, selectedClassData, removedStudentIds]);

    const students = filteredStudents;
    const totalSlices = students.length;
    const sliceAngle = 360 / (totalSlices || 1);

    // --- FİZİK TABANLI DÖNÜŞ MANTIĞI ---
    const spinWheel = () => {
        if (students.length < 2) {
            alert("Çarkı çevirmek için en az 2 öğrenci gereklidir.");
            return;
        }
        if (isRolling) return;
        
        setIsRolling(true);
        setWinner(null);
        
        const duration = 8000 + Math.random() * 4000;
        const initialSpeed = 50 + Math.random() * 20;
        
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
        
        const winnerStudent = students[winningIndex];
        
        setWinner(winnerStudent);
        playSound('win');
    };

    const removeCurrentStudent = () => {
        if (winner) {
            setRemovedStudentIds(prev => new Set(prev).add(winner.uid));
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

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative selection:bg-cyan-500/30 font-sans">
            
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/20 rounded-full blur-[180px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-fuchsia-900/20 rounded-full blur-[180px]" />
            </div>

            <header className={cn(
                "flex-shrink-0 p-6 flex items-center justify-between z-20 bg-slate-900/50 backdrop-blur-md border-b border-white/5",
                isWheelFullscreen && "hidden"
            )}>
                <div className="flex items-center gap-6">
                    <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white h-14 w-14 rounded-2xl">
                        <Link href="/teacher/smartboard">
                            <ArrowLeft className="h-8 w-8" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-3">
                        <Zap className="text-yellow-400 h-8 w-8 fill-yellow-400" />
                        Şanslı Çark
                    </h1>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden z-10 p-4 md:p-8 gap-8">
                 
                 {winner && <Confetti />}

                 {!isWheelFullscreen && (
                     <div className="w-80 md:w-96 flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
                        
                        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl">
                            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-sm mb-1">
                                <Settings className="w-4 h-4" /> Ayarlar
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-slate-300 ml-1">Sınıf Seçimi</Label>
                                <Select value={classFilter} onValueChange={(val) => { setClassFilter(val); setBranchFilter('all'); }} disabled={isRolling}>
                                    <SelectTrigger className="bg-slate-950/50 border-white/10 h-12 text-lg text-white rounded-xl focus:ring-purple-500/50"><SelectValue/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="all">Tüm Öğrenciler</SelectItem>
                                        {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-slate-300 ml-1">Şube</Label>
                                <Select value={branchFilter} onValueChange={(val) => { setBranchFilter(val); }} disabled={!selectedClassData || isRolling}>
                                    <SelectTrigger className="bg-slate-950/50 border-white/10 h-12 text-lg text-white rounded-xl focus:ring-purple-500/50"><SelectValue placeholder="Şube Seçin..."/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="all">Tüm Şubeler</SelectItem>
                                        {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-between items-center text-sm text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span>{students.length} Kişi</span>
                                </div>
                                {removedStudentIds.size > 0 && (
                                    <Button variant="ghost" size="sm" onClick={resetStudentList} disabled={isRolling} className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                                        <RotateCcw className="mr-1.5 h-3 w-3"/> Sıfırla ({removedStudentIds.size})
                                    </Button>
                                )}
                            </div>
                        </div>

                         <Button 
                            size="lg" 
                            onClick={spinWheel} 
                            disabled={isRolling || students.length < 2}
                            className="w-full h-20 text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-purple-900/30 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                            {isRolling ? "DÖNÜYOR..." : "ÇEVİR"}
                        </Button>

                         <div className="mt-auto">
                             <Button 
                                size="lg" 
                                variant="secondary"
                                onClick={() => setIsWheelFullscreen(true)} 
                                className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white border border-white/5 rounded-2xl"
                            >
                                <Maximize2 className="mr-2 h-5 w-5"/> Tam Ekran Modu
                            </Button>
                         </div>
                     </div>
                 )}
                 
                 <div className={cn(
                     "relative flex items-center justify-center transition-all duration-500", 
                     isWheelFullscreen 
                        ? "fixed inset-0 z-50 bg-slate-950 p-4" 
                        : "flex-1 h-[500px] md:h-full bg-slate-900/30 border-4 border-slate-800 rounded-[3rem] shadow-inner"
                    )}>
                     
                     {isWheelFullscreen && (
                         <div className="absolute top-8 right-8 z-50 flex gap-4">
                            <Button onClick={spinWheel} disabled={isRolling || students.length < 2} className="h-16 px-8 text-xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl">
                                {isRolling ? "Dönüyor..." : "Çevir"}
                            </Button>
                            <Button onClick={() => setIsWheelFullscreen(false)} className="bg-slate-800/80 hover:bg-slate-700 text-white rounded-full h-16 w-16 border border-white/10">
                                <Minimize2 className="h-8 w-8"/>
                            </Button>
                         </div>
                     )}

                     <div className={cn("relative aspect-square flex items-center justify-center transition-all duration-500", isWheelFullscreen ? "w-[90vh]" : "w-full max-w-[70vh]")}>
                         
                         <div className={cn(
                             "absolute right-[-25px] top-1/2 -translate-y-1/2 z-30 filter drop-shadow-2xl transition-transform origin-right",
                             tickerShake ? "rotate-[-15deg]" : "rotate-0"
                         )}>
                             <div className="relative">
                                 <div className="w-0 h-0 border-t-[30px] border-t-transparent border-r-[70px] border-r-white border-b-[30px] border-b-transparent drop-shadow-lg" />
                                 <div className="absolute top-1/2 right-2 -translate-y-1/2 w-4 h-4 bg-slate-300 rounded-full shadow-inner" />
                             </div>
                         </div>

                         <div 
                            className="w-full h-full rounded-full border-[12px] border-slate-800 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden bg-slate-900"
                            style={{ 
                                transform: `rotate(${rotation}deg)`,
                                transition: 'none'
                            }}
                         >
                            <div className="absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] z-10 pointer-events-none border-[4px] border-white/5" />

                            <svg viewBox="-1 -1 2 2" className="w-full h-full" style={{ transform: 'rotate(0deg)' }}>
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
                                    const fontSize = Math.max(0.035, Math.min(0.07, 0.4 / (totalSlices > 0 ? totalSlices : 1)));

                                    return (
                                        <g key={student.uid}>
                                            <path d={pathData} fill={color} stroke="#1e293b" strokeWidth="0.008" />
                                            <text 
                                                x={textX} 
                                                y={textY} 
                                                fill="white" 
                                                fontSize={fontSize}
                                                fontWeight="900"
                                                fontFamily="Arial Black, sans-serif"
                                                textAnchor="middle" 
                                                alignmentBaseline="middle"
                                                transform={`rotate(${rotationDeg}, ${textX}, ${textY})`}
                                                style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}
                                            >
                                                {student.displayName.split(' ')[0].toUpperCase()}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                         </div>
                         
                         <div 
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-white rounded-full border-[8px] border-slate-800 shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center justify-center z-20 cursor-pointer hover:scale-105 active:scale-95 transition-transform group"
                            onClick={spinWheel}
                         >
                             <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-300 rounded-full" />
                             <span className="relative text-slate-900 font-black text-xl tracking-tighter group-hover:text-indigo-600 transition-colors">ÇEVİR</span>
                         </div>

                         {winner && !isRolling && (
                             <div className="absolute inset-0 z-50 flex items-center justify-center">
                                 <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-500" />
                                 <div className="relative z-50 text-center animate-in zoom-in-50 slide-in-from-bottom-10 duration-500 p-10 bg-slate-900 border-4 border-yellow-500 rounded-[3rem] shadow-[0_0_100px_rgba(234,179,8,0.8)] max-w-lg mx-6">
                                     
                                     <PartyPopper className="w-20 h-20 text-yellow-400 mx-auto mb-6 animate-bounce" />
                                     
                                     <div className="absolute -top-14 left-1/2 -translate-x-1/2">
                                        <div className="p-2 bg-yellow-500 rounded-full shadow-2xl">
                                            <UserAvatar user={winner} className="w-28 h-28 border-4 border-slate-900 text-5xl bg-slate-800" />
                                        </div>
                                     </div>
                                     
                                     <div className="mt-16 space-y-3">
                                         <h3 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-sm">{winner.displayName}</h3>
                                         <p className="text-2xl text-slate-400 font-bold">{winner.class || "Öğrenci"}</p>
                                     </div>

                                     <div className="grid grid-cols-2 gap-4 mt-10">
                                         <Button onClick={removeCurrentStudent} variant="destructive" className="h-16 text-xl font-bold border-2 border-red-700 shadow-lg hover:shadow-red-900/50 rounded-2xl">
                                             <UserMinus className="mr-3 h-6 w-6"/> Çıkar
                                         </Button>
                                         <Button onClick={() => setWinner(null)} className="h-16 text-xl font-bold bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 text-white shadow-lg hover:shadow-emerald-900/50 rounded-2xl">
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
