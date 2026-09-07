'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    ThumbsUp, ThumbsDown, StopCircle, HelpCircle, Check, X, 
    BarChart3, RefreshCw, Trophy, Timer, ArrowLeft, 
    Meh, Frown, Smile, Trash2, Zap, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

// --- TİPLER ---
type FeedbackMode = 'idle' | 'yes_no' | 'traffic_light' | 'quiz';

export default function InstantFeedbackPage() {
    const [mode, setMode] = useState<FeedbackMode>('yes_no');
    const [votes, setVotes] = useState<Record<string, number>>({});
    const [timer, setTimer] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Zamanlayıcı
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        try { playSound('timeUp'); } catch (e) {}
                        setIsTimerRunning(false);
                        return 0;
                    }
                    if (prev <= 5) {
                        try { playSound('timer'); } catch (e) {}
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (timer === 0) {
            setIsTimerRunning(false);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timer]);

    const startTimer = (seconds: number) => {
        try { playSound('click'); } catch (e) {}
        setTimer(seconds);
        setIsTimerRunning(true);
    };

    const handleVote = (key: string) => {
        try { playSound('pop'); } catch (e) {}
        setVotes((prev) => ({
            ...prev,
            [key]: (prev[key] || 0) + 1
        }));
    };

    const resetVotes = () => {
        try { playSound('click'); } catch (e) {}
        setVotes({});
    };

    const changeMode = (newMode: FeedbackMode) => {
        try { playSound('click'); } catch (e) {}
        setMode(newMode);
        setVotes({});
    };

    // --- MOD BİLEŞENLERİ ---
    const YesNoView = () => (
        <div className="grid grid-cols-2 gap-6 sm:gap-8 w-full h-full p-2">
            <button 
                onClick={() => handleVote('yes')}
                className="group relative flex flex-col items-center justify-center bg-emerald-600/20 border-4 border-emerald-500 rounded-[2.5rem] sm:rounded-[3rem] hover:bg-emerald-600/35 transition-all active:scale-95 shadow-xl hover:shadow-emerald-500/20"
            >
                <ThumbsUp className="w-24 h-24 sm:w-32 sm:h-32 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-4xl sm:text-6xl font-black text-white mt-4 uppercase tracking-wider">EVET</span>
                <div className="absolute top-6 right-6 sm:right-8 bg-emerald-500 text-black font-black text-3xl sm:text-4xl px-4 py-2 rounded-2xl min-w-[70px] shadow-lg text-center">
                    {votes['yes'] || 0}
                </div>
            </button>
            <button 
                onClick={() => handleVote('no')}
                className="group relative flex flex-col items-center justify-center bg-rose-600/20 border-4 border-rose-500 rounded-[2.5rem] sm:rounded-[3rem] hover:bg-rose-600/35 transition-all active:scale-95 shadow-xl hover:shadow-rose-500/20"
            >
                <ThumbsDown className="w-24 h-24 sm:w-32 sm:h-32 text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="text-4xl sm:text-6xl font-black text-white mt-4 uppercase tracking-wider">HAYIR</span>
                <div className="absolute top-6 right-6 sm:right-8 bg-rose-500 text-white font-black text-3xl sm:text-4xl px-4 py-2 rounded-2xl min-w-[70px] shadow-lg text-center">
                    {votes['no'] || 0}
                </div>
            </button>
        </div>
    );

    const TrafficLightView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full h-full p-2">
            {[
                { key: 'green', label: 'ANLADIM', color: 'bg-emerald-500', icon: Smile, border: 'border-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-950/40 hover:bg-emerald-900/40' },
                { key: 'yellow', label: 'KISMEN', color: 'bg-amber-500', icon: Meh, border: 'border-amber-500', text: 'text-amber-400', bg: 'bg-amber-950/40 hover:bg-amber-900/40' },
                { key: 'red', label: 'ANLAMADIM', color: 'bg-rose-500', icon: Frown, border: 'border-rose-500', text: 'text-rose-400', bg: 'bg-rose-950/40 hover:bg-rose-900/40' }
            ].map((item) => (
                <button 
                    key={item.key}
                    onClick={() => handleVote(item.key)}
                    className={cn(
                        "group relative flex flex-col items-center justify-center border-4 rounded-[2rem] sm:rounded-[2.5rem] transition-all active:scale-95 shadow-lg",
                        item.bg,
                        item.border
                    )}
                >
                    <div className={cn("w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform", item.color)}>
                        <item.icon className="w-12 h-12 sm:w-14 sm:h-14 text-black" />
                    </div>
                    <span className={cn("text-2xl sm:text-4xl font-black mt-6 uppercase tracking-wide", item.text)}>{item.label}</span>
                    <div className="mt-4 text-5xl sm:text-6xl font-black text-white">
                        {votes[item.key] || 0}
                    </div>
                </button>
            ))}
        </div>
    );

    const QuizView = () => {
        const options = [
            { key: 'A', color: 'bg-red-500 border-red-500 text-red-400', hoverBg: 'hover:bg-red-600/30' },
            { key: 'B', color: 'bg-blue-500 border-blue-500 text-blue-400', hoverBg: 'hover:bg-blue-600/30' },
            { key: 'C', color: 'bg-yellow-500 border-yellow-500 text-yellow-400', hoverBg: 'hover:bg-yellow-600/30' },
            { key: 'D', color: 'bg-emerald-500 border-emerald-500 text-emerald-400', hoverBg: 'hover:bg-emerald-600/30' }
        ];

        return (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full h-full p-2">
                {options.map((opt) => {
                    const count = votes[opt.key] || 0;
                    return (
                        <button
                            key={opt.key}
                            onClick={() => handleVote(opt.key)}
                            className={cn(
                                "group relative flex items-center justify-between p-6 sm:p-8 bg-slate-900/60 border-4 rounded-[2rem] sm:rounded-[2.5rem] transition-all active:scale-95 shadow-lg",
                                opt.color.split(' ')[1],
                                opt.hoverBg
                            )}
                        >
                            <div className="flex items-center gap-4 sm:gap-6">
                                <div className={cn("w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-md", opt.color.split(' ')[0])}>
                                    {opt.key}
                                </div>
                                <span className="text-2xl sm:text-3xl font-black text-white/80 uppercase tracking-wide">Seçenek {opt.key}</span>
                            </div>
                            <div className={cn("text-5xl sm:text-6xl font-black", opt.color.split(' ')[2])}>
                                {count}
                            </div>
                        </button>
                    )
                })}
            </div>
        );
    };

    return (
        <div ref={containerRef} className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative selection:bg-cyan-500/30 font-sans select-none">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-900/15 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-fuchsia-900/15 rounded-full blur-[150px]" />
            </div>

            <header className="flex-shrink-0 p-4 sm:p-5 flex items-center justify-between z-20 bg-slate-900/60 backdrop-blur-md border-b border-white/10">
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
                        Anlık Geri Bildirim
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* Zamanlayıcı */}
                    <div className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all",
                        isTimerRunning ? "bg-rose-950/60 border-rose-500 text-rose-400 animate-pulse" : "bg-slate-800/80 border-slate-700 text-slate-300"
                    )}>
                        <Timer className="h-5 w-5" />
                        <span className="text-xl font-mono font-black w-14 text-center">{timer}s</span>
                    </div>

                    <div className="flex gap-1.5">
                        <Button onClick={() => startTimer(10)} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-slate-700 hover:bg-slate-800 text-sm font-bold">10</Button>
                        <Button onClick={() => startTimer(30)} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-slate-700 hover:bg-slate-800 text-sm font-bold">30</Button>
                        <Button onClick={() => startTimer(60)} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-slate-700 hover:bg-slate-800 text-sm font-bold">60</Button>
                    </div>

                    <FullscreenToggle elementRef={containerRef} />
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden z-10 p-4 sm:p-6 gap-4 sm:gap-6">
                {/* Sol Menü: Modlar */}
                <div className="w-72 sm:w-80 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar shrink-0">
                    <ModeButton 
                        active={mode === 'yes_no'} 
                        onClick={() => changeMode('yes_no')} 
                        title="Evet / Hayır" 
                        subtitle="Hızlı oylama"
                        icon={<ThumbsUp className="w-5 h-5" />} 
                        color="bg-emerald-500" 
                    />
                    <ModeButton 
                        active={mode === 'traffic_light'} 
                        onClick={() => changeMode('traffic_light')} 
                        title="Trafik Işığı" 
                        subtitle="Anlama kontrolü" 
                        icon={<StopCircle className="w-5 h-5" />} 
                        color="bg-amber-500" 
                    />
                    <ModeButton 
                        active={mode === 'quiz'} 
                        onClick={() => changeMode('quiz')} 
                        title="Çoktan Seçmeli" 
                        subtitle="A / B / C / D testi" 
                        icon={<HelpCircle className="w-5 h-5" />} 
                        color="bg-indigo-500" 
                    />

                    <div className="mt-auto pt-3 border-t border-white/10">
                        <Button 
                            onClick={resetVotes} 
                            variant="ghost" 
                            className="w-full h-12 justify-start gap-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl font-bold text-sm"
                        >
                            <RotateCcw className="w-4 h-4" /> 
                            <span>Oyları Sıfırla</span>
                        </Button>
                    </div>
                </div>

                {/* Ana İçerik */}
                <div className="flex-1 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="flex-grow flex items-center justify-center">
                        {mode === 'idle' && (
                            <div className="text-center text-slate-500">
                                <BarChart3 className="w-24 h-24 mx-auto mb-4 opacity-30" />
                                <h2 className="text-2xl font-bold text-slate-400">Bir geri bildirim modu seçin</h2>
                                <p className="text-sm mt-1 opacity-60">Sol menüden bir araç başlatın.</p>
                            </div>
                        )}
                        {mode === 'yes_no' && <YesNoView />}
                        {mode === 'traffic_light' && <TrafficLightView />}
                        {mode === 'quiz' && <QuizView />}
                    </div>
                </div>
            </main>
        </div>
    );
}

function ModeButton({ active, onClick, title, subtitle, icon, color }: { active: boolean, onClick: () => void, title: string, subtitle?: string, icon: React.ReactNode, color: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full p-3.5 rounded-2xl border-2 text-left transition-all duration-200 group relative overflow-hidden active:scale-98",
                active 
                    ? "border-white/25 bg-slate-800/90 shadow-lg scale-[1.01] z-10" 
                    : "border-transparent bg-slate-900/50 hover:bg-slate-800/60 text-slate-400 hover:text-white"
            )}
        >
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-2 transition-all duration-200",
                active ? color : "bg-transparent group-hover:bg-slate-700"
            )} />
            
            <div className="flex items-center gap-3 pl-2">
                <div className={cn(
                    "p-2.5 rounded-xl transition-colors",
                    active ? "bg-white/10 text-white" : "bg-black/20 text-slate-500 group-hover:text-white"
                )}>
                    {icon}
                </div>
                <div>
                    <h3 className={cn("text-base font-black leading-tight", active ? "text-white" : "text-slate-300")}>{title}</h3>
                    {subtitle && <p className="text-[11px] font-medium opacity-60 mt-0.5">{subtitle}</p>}
                </div>
            </div>
        </button>
    )
}
