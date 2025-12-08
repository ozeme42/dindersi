'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    ThumbsUp, ThumbsDown, StopCircle, HelpCircle, Check, X, 
    BarChart3, RefreshCw, Trophy, Volume2, Timer, User, ArrowLeft, 
    Meh, Frown, Smile, Trash2, Zap, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { SchoolClass, UserProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// --- TİPLER ---
type FeedbackMode = 'idle' | 'yes_no' | 'traffic_light' | 'quiz' | 'emoji' | 'random_student';

export default function InstantFeedbackPage() {
    const [mode, setMode] = useState<FeedbackMode>('idle');
    const [votes, setVotes] = useState<Record<string, number>>({});
    const [timer, setTimer] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    
    // Data states for student selection
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [classFilter, setClassFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Rastgele Öğrenci State
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const [isRolling, setIsRolling] = useState(false);

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
                console.error("Error fetching data for feedback tool:", error);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchInitialData();
    }, []);

    const selectedClassData = useMemo(() => allClasses.find(c => c.id === classFilter), [classFilter, allClasses]);

    const filteredStudents = useMemo(() => {
        if (classFilter === 'all') {
            return allStudents;
        }
        if (!selectedClassData) return [];
        
        if (branchFilter === 'all') {
            return allStudents.filter(s => s.class?.startsWith(selectedClassData.name));
        }

        const fullClassName = `${selectedClassData.name} - ${branchFilter}`;
        return allStudents.filter(s => s.class === fullClassName);
    }, [allStudents, classFilter, branchFilter, selectedClassData]);


    // Zamanlayıcı
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setIsTimerRunning(false);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timer]);

    const startTimer = (seconds: number) => {
        setTimer(seconds);
        setIsTimerRunning(true);
    };

    const handleVote = (key: string) => {
        setVotes((prev) => ({
            ...prev,
            [key]: (prev[key] || 0) + 1
        }));
    };

    const resetVotes = () => setVotes({});

    const pickRandomStudent = () => {
        if (filteredStudents.length === 0) {
            alert("Seçilen kriterlere uygun öğrenci bulunamadı.");
            return;
        }
        setIsRolling(true);
        setSelectedStudent(null);
        let count = 0;
        const interval = setInterval(() => {
            setSelectedStudent(filteredStudents[Math.floor(Math.random() * filteredStudents.length)].displayName);
            count++;
            if (count > 20) {
                clearInterval(interval);
                setIsRolling(false);
            }
        }, 100);
    };

    // --- MOD BİLEŞENLERİ ---

    // 1. Evet / Hayır Modu
    const YesNoView = () => (
        <div className="grid grid-cols-2 gap-8 w-full h-full">
            <button 
                onClick={() => handleVote('yes')}
                className="group relative flex flex-col items-center justify-center bg-emerald-600/20 border-4 border-emerald-500 rounded-[3rem] hover:bg-emerald-600/40 transition-all active:scale-95"
            >
                <ThumbsUp className="w-32 h-32 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-6xl font-black text-white mt-4 uppercase">EVET</span>
                <div className="absolute top-6 right-8 bg-emerald-500 text-black font-black text-4xl px-4 py-2 rounded-xl min-w-[80px]">
                    {votes['yes'] || 0}
                </div>
            </button>
            <button 
                onClick={() => handleVote('no')}
                className="group relative flex flex-col items-center justify-center bg-red-600/20 border-4 border-red-500 rounded-[3rem] hover:bg-red-600/40 transition-all active:scale-95"
            >
                <ThumbsDown className="w-32 h-32 text-red-400 group-hover:scale-110 transition-transform" />
                <span className="text-6xl font-black text-white mt-4 uppercase">HAYIR</span>
                <div className="absolute top-6 right-8 bg-red-500 text-white font-black text-4xl px-4 py-2 rounded-xl min-w-[80px]">
                    {votes['no'] || 0}
                </div>
            </button>
        </div>
    );

    // 2. Trafik Işığı Modu (Anlama Kontrolü)
    const TrafficLightView = () => (
        <div className="grid grid-cols-3 gap-6 w-full h-full">
            {[
                { key: 'green', label: 'ANLADIM', color: 'bg-emerald-500', icon: Smile, border: 'border-emerald-500', text: 'text-emerald-400' },
                { key: 'yellow', label: 'KISMEN', color: 'bg-yellow-500', icon: Meh, border: 'border-yellow-500', text: 'text-yellow-400' },
                { key: 'red', label: 'ANLAMADIM', color: 'bg-red-500', icon: Frown, border: 'border-red-500', text: 'text-red-400' }
            ].map((item) => (
                <button 
                    key={item.key}
                    onClick={() => handleVote(item.key)}
                    className={cn(
                        "group relative flex flex-col items-center justify-center bg-slate-900/50 border-4 rounded-[2.5rem] hover:bg-slate-800 transition-all active:scale-95",
                        item.border
                    )}
                >
                    <div className={cn("w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]", item.color)}>
                        <item.icon className="w-14 h-14 text-black" />
                    </div>
                    <span className={cn("text-4xl font-black mt-8", item.text)}>{item.label}</span>
                    <div className={cn("mt-6 text-6xl font-black text-white")}>
                        {votes[item.key] || 0}
                    </div>
                </button>
            ))}
        </div>
    );

    // 3. Quiz (A/B/C/D) Modu
    const QuizView = () => (
        <div className="grid grid-cols-2 gap-6 w-full h-full">
            {['A', 'B', 'C', 'D'].map((opt, i) => {
                const colors = [
                    'border-indigo-500 text-indigo-400 bg-indigo-500',
                    'border-pink-500 text-pink-400 bg-pink-500',
                    'border-cyan-500 text-cyan-400 bg-cyan-500',
                    'border-orange-500 text-orange-400 bg-orange-500'
                ];
                const activeColor = colors[i];
                
                return (
                    <button 
                        key={opt}
                        onClick={() => handleVote(opt)}
                        className={cn(
                            "group relative flex items-center justify-between px-12 bg-slate-900/50 border-4 rounded-[2rem] hover:bg-slate-800 transition-all active:scale-95",
                            activeColor.split(' ')[0] // Border class
                        )}
                    >
                        <div className={cn(
                            "w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black text-black",
                            activeColor.split(' ')[2] // BG Class
                        )}>
                            {opt}
                        </div>
                        <div className={cn("text-8xl font-black", activeColor.split(' ')[1])}>
                            {votes[opt] || 0}
                        </div>
                    </button>
                )
            })}
        </div>
    );

    // 4. Rastgele Öğrenci Modu
    const RandomStudentView = () => (
        <div className="flex flex-col items-center justify-center w-full h-full gap-8">
             <div className="w-full max-w-lg mx-auto grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-slate-400">Sınıf</Label>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="bg-slate-900 border-white/10"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tüm Sınıflar</SelectItem>
                            {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label className="text-slate-400">Şube</Label>
                    <Select value={branchFilter} onValueChange={setBranchFilter} disabled={!selectedClassData}>
                        <SelectTrigger className="bg-slate-900 border-white/10"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tüm Şubeler</SelectItem>
                            {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="relative w-full max-w-2xl aspect-video flex items-center justify-center">
                {/* Daire Efektleri */}
                <div className={cn("absolute inset-0 rounded-full border-4 border-dashed border-slate-700 animate-[spin_10s_linear_infinite]", isRolling && "border-cyan-500 duration-1000")} />
                <div className={cn("absolute inset-4 rounded-full border-4 border-slate-800 animate-[spin_15s_linear_infinite_reverse]", isRolling && "border-purple-500 duration-1000")} />
                
                <div className="relative z-10 text-center">
                     <User className={cn("w-24 h-24 mx-auto mb-6 text-slate-600", isRolling && "text-cyan-400 animate-bounce")} />
                     <h2 className={cn(
                         "text-5xl md:text-7xl font-black transition-all",
                         isRolling ? "text-slate-400 blur-sm" : "text-white scale-110 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]"
                     )}>
                         {selectedStudent || "???"}
                     </h2>
                </div>
            </div>
            <Button 
                size="lg" 
                onClick={pickRandomStudent} 
                disabled={isRolling || isLoadingData || filteredStudents.length === 0}
                className="mt-12 h-20 px-12 text-3xl rounded-3xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_30px_rgba(8,145,178,0.4)] transition-all hover:scale-105"
            >
                {isLoadingData ? <Loader2 className="animate-spin h-8 w-8"/> : isRolling ? "Seçiliyor..." : "Öğrenci Seç"}
            </Button>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative selection:bg-cyan-500/30 font-sans">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-fuchsia-900/20 rounded-full blur-[150px]" />
            </div>

            {/* Üst Bar */}
            <header className="flex-shrink-0 p-6 flex items-center justify-between z-20 bg-slate-900/50 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-6">
                    <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white h-14 w-14 rounded-2xl">
                        <Link href="/teacher/smartboard">
                            <ArrowLeft className="h-8 w-8" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-3">
                        <Zap className="text-yellow-400 h-8 w-8 fill-yellow-400" />
                        Anlık Geri Bildirim
                    </h1>
                </div>

                {/* Sağ Taraf: Zamanlayıcı */}
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all",
                        isTimerRunning ? "bg-red-900/20 border-red-500 text-red-400 animate-pulse" : "bg-slate-800 border-slate-700 text-slate-300"
                    )}>
                        <Timer className="h-8 w-8" />
                        <span className="text-4xl font-mono font-black w-24 text-center">{timer}s</span>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => startTimer(10)} variant="outline" className="h-14 w-14 rounded-xl border-slate-700 hover:bg-slate-800 text-xl font-bold">10</Button>
                        <Button onClick={() => startTimer(30)} variant="outline" className="h-14 w-14 rounded-xl border-slate-700 hover:bg-slate-800 text-xl font-bold">30</Button>
                        <Button onClick={() => startTimer(60)} variant="outline" className="h-14 w-14 rounded-xl border-slate-700 hover:bg-slate-800 text-xl font-bold">60</Button>
                    </div>
                </div>
            </header>

            {/* Ana İçerik */}
            <main className="flex-1 flex overflow-hidden z-10 p-6 gap-6">
                
                {/* SOL PANEL: Araç Seçimi */}
                <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    <ModeButton 
                        active={mode === 'yes_no'} 
                        onClick={() => { setMode('yes_no'); resetVotes(); }}
                        title="Evet / Hayır"
                        icon={<ThumbsUp className="w-6 h-6" />}
                        color="bg-emerald-600"
                    />
                    <ModeButton 
                        active={mode === 'traffic_light'} 
                        onClick={() => { setMode('traffic_light'); resetVotes(); }}
                        title="Trafik Işığı"
                        subtitle="Anlama Kontrolü"
                        icon={<StopCircle className="w-6 h-6" />}
                        color="bg-yellow-600"
                    />
                    <ModeButton 
                        active={mode === 'quiz'} 
                        onClick={() => { setMode('quiz'); resetVotes(); }}
                        title="Çoktan Seçmeli"
                        subtitle="A / B / C / D"
                        icon={<HelpCircle className="w-6 h-6" />}
                        color="bg-indigo-600"
                    />
                     <ModeButton 
                        active={mode === 'random_student'} 
                        onClick={() => { setMode('random_student'); setSelectedStudent(null); }}
                        title="Şanslı Öğrenci"
                        icon={<Trophy className="w-6 h-6" />}
                        color="bg-cyan-600"
                    />

                    <div className="mt-auto pt-4 border-t border-white/5">
                         <Button 
                            onClick={resetVotes} 
                            variant="ghost" 
                            className="w-full h-14 justify-start gap-4 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-2xl"
                        >
                            <Trash2 className="w-6 h-6" /> 
                            <span className="text-lg font-bold">Sonuçları Temizle</span>
                        </Button>
                    </div>
                </div>

                {/* SAĞ PANEL: Aktif Görüntü */}
                <div className="flex-1 bg-slate-900/50 backdrop-blur-xl border-2 border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col">
                    
                    {/* İçerik */}
                    <div className="flex-grow flex items-center justify-center">
                        {mode === 'idle' && (
                            <div className="text-center text-slate-500">
                                <BarChart3 className="w-32 h-32 mx-auto mb-6 opacity-20" />
                                <h2 className="text-3xl font-bold text-slate-400">Bir geri bildirim modu seçin</h2>
                                <p className="text-xl mt-2 opacity-60">Sol menüden bir araç başlatın.</p>
                            </div>
                        )}
                        {mode === 'yes_no' && <YesNoView />}
                        {mode === 'traffic_light' && <TrafficLightView />}
                        {mode === 'quiz' && <QuizView />}
                        {mode === 'random_student' && <RandomStudentView />}
                    </div>

                </div>
            </main>
        </div>
    );
}

// Yardımcı Alt Bileşen: Mode Selection Button
function ModeButton({ active, onClick, title, subtitle, icon, color }: { active: boolean, onClick: () => void, title: string, subtitle?: string, icon: React.ReactNode, color: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full p-4 rounded-2xl border-2 text-left transition-all duration-300 group relative overflow-hidden",
                active 
                    ? `border-white/20 bg-slate-800 shadow-lg scale-[1.02] z-10` 
                    : "border-transparent bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-white"
            )}
        >
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-2 transition-all duration-300",
                active ? color : "bg-transparent group-hover:bg-slate-700"
            )} />
            
            <div className="flex items-center gap-4 pl-4">
                <div className={cn(
                    "p-3 rounded-xl transition-colors",
                    active ? "bg-white/10 text-white" : "bg-black/20 text-slate-500 group-hover:text-white"
                )}>
                    {icon}
                </div>
                <div>
                    <h3 className={cn("text-lg font-bold leading-tight", active ? "text-white" : "text-slate-300")}>{title}</h3>
                    {subtitle && <p className="text-xs font-medium opacity-60 mt-0.5">{subtitle}</p>}
                </div>
            </div>
        </button>
    )
}
