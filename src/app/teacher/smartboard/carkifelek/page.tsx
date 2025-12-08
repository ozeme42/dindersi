'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    ThumbsUp, ThumbsDown, StopCircle, HelpCircle, Check, X, 
    BarChart3, Trophy, Timer, User, ArrowLeft, 
    Meh, Frown, Smile, Trash2, Zap, Loader2, UserMinus, RotateCcw,
    Maximize2, Minimize2, PartyPopper, UserCog, Settings, Crown, Award, Swords
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

const WHEEL_COLORS = [
    '#3369e8', // Mavi
    '#d50f25', // Kırmızı
    '#eeb211', // Sarı
    '#009925', // Yeşil
    '#ff6d00', // Turuncu
    '#9e00bf', // Mor
    '#00aeb3', // Turkuaz
    '#f53d7f', // Pembe
];

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
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];

        for (let i = 0; i < 300; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 30,
                vy: (Math.random() - 0.5) * 30 - 15,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                gravity: 0.8,
                drag: 0.95
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
                ctx.fillRect(p.x, p.y, p.size, p.size);
                if (p.y > canvas.height) particles.splice(index, 1);
            });
            if (particles.length > 0) requestAnimationFrame(animate);
        };
        animate();
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[100]" />;
};

export default function WheelOfFortunePage() {
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [classFilter, setClassFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isRolling, setIsRolling] = useState(false);
    const [winner, setWinner] = useState<UserProfile | null>(null);
    const [removedStudentIds, setRemovedStudentIds] = useState<Set<string>>(new Set());
    const [currentRotation, setCurrentRotation] = useState(0); 
    const [isWheelFullscreen, setIsWheelFullscreen] = useState(false);

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

    const removeCurrentStudent = () => {
        if (winner) {
            setRemovedStudentIds(prev => new Set(prev).add(winner.uid));
            setWinner(null);
        }
    };
    
    const resetStudentList = () => {
        setRemovedStudentIds(new Set());
        setWinner(null);
        setCurrentRotation(0);
    };

    const spinWheel = () => {
        if (filteredStudents.length < 2) {
            alert("Çarkı çevirmek için en az 2 öğrenci gereklidir.");
            return;
        }
        if (isRolling) return;
        
        setWinner(null);
        setIsRolling(true);

        const winnerIndex = Math.floor(Math.random() * filteredStudents.length);
        const selected = filteredStudents[winnerIndex];

        const sliceCount = filteredStudents.length;
        const sliceAngle = 360 / sliceCount;
        
        const spins = 360 * (5 + Math.floor(Math.random() * 5)); 
        const winnerAngle = (winnerIndex * sliceAngle) + (sliceAngle / 2);
        
        const currentRot = currentRotation;
        const remainder = currentRot % 360;
        const nextZero = currentRot + (360 - remainder);
        const alignment = 360 - winnerAngle;
        const finalRotation = nextZero + spins + alignment;

        setCurrentRotation(finalRotation);

        setTimeout(() => {
            setIsRolling(false);
            setWinner(selected);
            playSound('win');
        }, 6000);
    };

    const students = filteredStudents;
    const total = students.length;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className={cn("grid w-full h-screen items-center gap-8 bg-slate-950 text-white", isWheelFullscreen ? "grid-cols-1 p-8" : "grid-cols-1 md:grid-cols-3 p-6")}>
            
            {winner && <Confetti />}

            <div className={cn("h-full flex flex-col gap-4", isWheelFullscreen && "hidden")}>
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
                    <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-2">Ayarlar</h3>
                    <div className="space-y-2">
                        <Label className="text-white">Sınıf</Label>
                        <Select value={classFilter} onValueChange={(val) => { setClassFilter(val); setCurrentRotation(0); }} disabled={isRolling}>
                            <SelectTrigger className="bg-slate-950 border-white/10 h-12 text-lg text-white"><SelectValue placeholder="Tüm Sınıflar"/></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="all">Tüm Öğrenciler</SelectItem>
                                {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-white">Şube</Label>
                        <Select value={branchFilter} onValueChange={(val) => { setBranchFilter(val); setCurrentRotation(0); }} disabled={!selectedClassData || isRolling}>
                            <SelectTrigger className="bg-slate-950 border-white/10 h-12 text-lg text-white"><SelectValue placeholder="Tüm Şubeler"/></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="all">Tüm Şubeler</SelectItem>
                                {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="pt-2 flex justify-between items-center text-sm text-slate-400">
                        <span>Kişi: {students.length}</span>
                        <Button variant="ghost" size="sm" onClick={resetStudentList} disabled={removedStudentIds.size === 0 || isRolling} className="h-8 text-xs text-white hover:text-white/80">
                            <RotateCcw className="mr-1 h-3 w-3"/> Sıfırla ({removedStudentIds.size})
                        </Button>
                    </div>
                </div>

                <div className="mt-auto space-y-3">
                    <Button 
                        size="lg" 
                        onClick={() => setIsWheelFullscreen(true)} 
                        className="w-full h-16 bg-slate-800 hover:bg-slate-700 text-white border border-white/5 rounded-2xl"
                    >
                        <Maximize2 className="mr-2 h-5 w-5"/> Tam Ekran Yap
                    </Button>
                    <Button asChild size="lg" variant="outline" className="w-full h-16 rounded-2xl border-white/10 text-slate-300">
                        <Link href="/teacher/smartboard">
                            <ArrowLeft className="mr-2 h-5 w-5"/> Tahta Menüsüne Dön
                        </Link>
                    </Button>
                </div>
            </div>
             
            <div className={cn("relative flex items-center justify-center", isWheelFullscreen ? "col-span-1 h-full w-full" : "md:col-span-2 h-[500px] md:h-full bg-slate-950 border-4 border-slate-700 rounded-[2.5rem] shadow-2xl overflow-hidden")}>
                
                {isWheelFullscreen && (
                    <Button onClick={() => setIsWheelFullscreen(false)} className="absolute top-8 right-8 z-50 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full h-16 w-16">
                       <Minimize2 className="h-8 w-8"/>
                    </Button>
                )}

                <div className="relative w-full max-w-[85vh] aspect-square flex items-center justify-center transition-all duration-500">
                    
                    <div className="absolute right-[-1px] top-1/2 -translate-y-1/2 z-30 filter drop-shadow-lg">
                        <div className="w-0 h-0 border-t-[25px] border-t-transparent border-r-[50px] border-r-white border-b-[25px] border-b-transparent" />
                    </div>

                    <div 
                       className="w-full h-full rounded-full border-[10px] border-slate-800 shadow-2xl relative transition-transform will-change-transform"
                       style={{ 
                           transform: `rotate(${currentRotation}deg)`,
                           transitionDuration: isRolling ? '6s' : '0s',
                           transitionTimingFunction: 'cubic-bezier(0.15, 0, 0.15, 1)'
                       }}
                    >
                       <svg viewBox="-1 -1 2 2" className="w-full h-full" style={{ transform: 'rotate(0deg)' }}>
                           {students.map((student, index) => {
                               const startPercent = index / total;
                               const endPercent = (index + 1) / total;
                               
                               const [startX, startY] = getCoordinatesForPercent(startPercent);
                               const [endX, endY] = getCoordinatesForPercent(endPercent);
                               const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;
                               const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
                               
                               const color = WHEEL_COLORS[index % WHEEL_COLORS.length];
                               
                               const midAngle = (startPercent + endPercent) * Math.PI; 
                               const textRadius = 0.55;
                               const textX = Math.cos(midAngle) * textRadius;
                               const textY = Math.sin(midAngle) * textRadius;
                               const rotationDeg = (midAngle * 180) / Math.PI;
                               const fontSize = Math.max(0.04, Math.min(0.08, 0.4 / (students.length > 0 ? students.length : 1)));

                               return (
                                   <g key={student.uid}>
                                       <path d={pathData} fill={color} stroke="#1e293b" strokeWidth="0.005" />
                                       <text 
                                           x={textX} 
                                           y={textY} 
                                           fill="white" 
                                           fontSize={fontSize}
                                           fontWeight="800"
                                           textAnchor="middle" 
                                           alignmentBaseline="middle"
                                           transform={`rotate(${rotationDeg}, ${textX}, ${textY})`}
                                           style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)', fontFamily: 'sans-serif' }}
                                       >
                                           {student.displayName.split(' ')[0]}
                                       </text>
                                   </g>
                               );
                           })}
                       </svg>
                    </div>
                    
                    <div 
                       className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-full border-8 border-slate-800 shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center z-20 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                       onClick={spinWheel}
                    >
                        <span className="text-slate-900 font-black text-xl tracking-tighter">ÇEVİR</span>
                    </div>

                    {winner && !isRolling && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-full animate-in fade-in duration-500" />
                            <div className="relative z-50 text-center animate-in zoom-in slide-in-from-bottom-10 duration-500 p-8 bg-slate-900 border-4 border-yellow-500 rounded-3xl shadow-[0_0_100px_rgba(234,179,8,0.8)] max-w-md mx-4">
                                <PartyPopper className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                                   <div className="p-1 bg-yellow-500 rounded-full shadow-lg">
                                       <UserAvatar user={winner} className="w-24 h-24 border-4 border-slate-900 text-4xl" />
                                   </div>
                                </div>
                                
                                <div className="mt-12 space-y-2">
                                    <h3 className="text-4xl md:text-5xl font-black text-white drop-shadow-md">{winner.displayName}</h3>
                                    <p className="text-xl text-slate-400 font-semibold">{winner.class || "Öğrenci"}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <Button onClick={removeCurrentStudent} variant="destructive" className="h-12 text-lg font-bold border-2 border-red-700 shadow-md">
                                        <UserMinus className="mr-2 h-5 w-5"/> Sil
                                    </Button>
                                    <Button onClick={() => setWinner(null)} className="h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 text-white shadow-md">
                                        Tamam
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
