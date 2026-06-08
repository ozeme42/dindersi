'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, Settings2, Play, Square, VolumeX, Mic, MicOff, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

export function NoiseMeter() {
    const [isListening, setIsListening] = useState(false);
    const [volume, setVolume] = useState(0);
    const [threshold, setThreshold] = useState(40);
    const [targetTime, setTargetTime] = useState(60); // in seconds
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hasError, setHasError] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const isNoisy = volume > threshold;

    // Tam Ekran Kontrolü
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch((err) => {
                console.error("Tam ekran hatası:", err);
            });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const stopListening = useCallback(() => {
        setIsListening(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
        setVolume(0);
    }, []);

    const startListening = async () => {
        try {
            setHasError(false);
            setIsSuccess(false);
            setElapsedTime(0);
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            streamRef.current = stream;

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            setIsListening(true);
            updateVolume();
            startTimer();

        } catch (err) {
            console.error('Mikrofon erişim hatası:', err);
            setHasError(true);
            setIsListening(false);
        }
    };

    const updateVolume = () => {
        if (!analyserRef.current || !isListening) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        
        // Average and scale to 0-100 roughly
        const average = sum / dataArray.length;
        const scaledVolume = Math.min(100, Math.round(average * 1.5));
        
        setVolume(scaledVolume);
        
        animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        
        timerRef.current = setInterval(() => {
            setVolume((currentVolume) => {
                if (currentVolume > threshold) {
                    setElapsedTime(0); // Sınır aşılırsa sayacı sıfırla
                } else {
                    setElapsedTime((prev) => {
                        const next = prev + 1;
                        if (next >= targetTime) {
                            handleSuccess();
                            return targetTime;
                        }
                        return next;
                    });
                }
                return currentVolume;
            });
        }, 1000);
    };

    const handleSuccess = () => {
        stopListening();
        setIsSuccess(true);
        confetti({
            particleCount: 200,
            spread: 120,
            origin: { y: 0.5 },
            colors: ['#10b981', '#3b82f6', '#f59e0b']
        });
        
        // Ses çal
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3");
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {}
    };

    useEffect(() => {
        return () => stopListening();
    }, [stopListening]);

    const progressPercentage = Math.min(100, (elapsedTime / targetTime) * 100);

    return (
        <div 
            ref={containerRef} 
            className={cn(
                "animate-in fade-in duration-700 transition-all font-sans bg-slate-50",
                isFullscreen ? "fixed inset-0 z-[99999] p-4 md:p-8 flex items-center justify-center bg-slate-900" : "w-full mx-auto"
            )}
        >
            <Card className={cn(
                "border border-slate-200 shadow-2xl rounded-[2rem] overflow-hidden flex flex-col relative w-full max-w-4xl mx-auto transition-colors duration-500",
                isFullscreen ? "h-full bg-slate-800 border-slate-700" : "h-[85vh] min-h-[600px] bg-white",
                isNoisy && isListening ? (isFullscreen ? "bg-red-900/40 border-red-500/50" : "bg-red-50/50 border-red-200") : ""
            )}>
                
                {/* HEADER */}
                <CardHeader className={cn(
                    "p-4 md:p-6 relative flex-shrink-0 z-20 border-b transition-colors duration-500",
                    isFullscreen ? "bg-slate-900/50 border-slate-700 text-white" : "bg-white border-slate-100",
                    isNoisy && isListening ? (isFullscreen ? "bg-red-950/80" : "bg-red-50") : ""
                )}>
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                                isNoisy && isListening ? "bg-red-100 text-red-600" : (isFullscreen ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500")
                            )}>
                                {isListening ? <Mic className="h-6 w-6 animate-pulse" /> : <MicOff className="h-6 w-6" />}
                            </div>
                            <div>
                                <CardTitle className={cn("text-2xl font-black uppercase tracking-tight transition-colors", isFullscreen ? "text-white" : "text-slate-800", isNoisy && isListening && !isFullscreen ? "text-red-700" : "")}>
                                    Sessizlik Barometresi
                                </CardTitle>
                                <CardDescription className={cn(isFullscreen ? "text-slate-400" : "text-slate-500", isNoisy && isListening && !isFullscreen ? "text-red-500 font-medium" : "")}>
                                    Sınıf sesini kontrol altında tutun
                                </CardDescription>
                            </div>
                        </div>

                        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className={cn("rounded-xl transition-colors", isFullscreen ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100")}>
                            {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                        </Button>
                    </div>
                </CardHeader>

                {/* CONTENT */}
                <CardContent className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-y-auto">
                    
                    {hasError ? (
                        <div className="flex flex-col items-center text-center max-w-md space-y-4">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                                <AlertTriangle className="h-10 w-10" />
                            </div>
                            <h3 className={cn("text-2xl font-black", isFullscreen ? "text-white" : "text-slate-800")}>Mikrofon Erişimi Reddedildi</h3>
                            <p className={cn("text-lg", isFullscreen ? "text-slate-400" : "text-slate-500")}>
                                Bu aracı kullanabilmek için tarayıcınızın mikrofona erişimine izin vermeniz gerekmektedir. Lütfen adres çubuğundaki kilit simgesine tıklayarak izin verin.
                            </p>
                        </div>
                    ) : isSuccess ? (
                        <div className="flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-500">
                            <div className="text-[8rem] md:text-[12rem] drop-shadow-2xl">🏆</div>
                            <div className="space-y-4">
                                <h3 className={cn("text-4xl md:text-6xl font-black tracking-tight", isFullscreen ? "text-emerald-400" : "text-emerald-600")}>
                                    HARİKA!
                                </h3>
                                <p className={cn("text-xl md:text-2xl font-bold", isFullscreen ? "text-slate-300" : "text-slate-600")}>
                                    Sınıf tam {targetTime} saniye boyunca odaklandı.
                                </p>
                            </div>
                            <Button 
                                onClick={() => { setIsSuccess(false); setElapsedTime(0); }}
                                className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg"
                            >
                                <RotateCcw className="mr-2 h-5 w-5" /> Yeniden Başla
                            </Button>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
                            
                            {/* EMOJI & BAR */}
                            <div className="flex flex-col items-center gap-8 w-full max-w-xs">
                                <div className={cn(
                                    "text-[8rem] md:text-[12rem] transition-all duration-300 transform",
                                    isNoisy && isListening ? "scale-110 rotate-3 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]" : "scale-100 drop-shadow-xl"
                                )}>
                                    {!isListening ? "😐" : isNoisy ? "😠" : "😴"}
                                </div>
                                
                                {/* Ses Seviyesi Barı */}
                                <div className="w-full space-y-3">
                                    <div className="flex justify-between items-center font-bold text-sm">
                                        <span className={cn(isFullscreen ? "text-slate-400" : "text-slate-500")}>Sessiz</span>
                                        <span className={cn(isFullscreen ? "text-slate-400" : "text-slate-500")}>Gürültülü</span>
                                    </div>
                                    <div className={cn("h-8 rounded-full overflow-hidden flex border shadow-inner transition-colors", isFullscreen ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200")}>
                                        <div 
                                            className={cn(
                                                "h-full transition-all duration-100",
                                                isNoisy ? "bg-gradient-to-r from-red-500 to-rose-600" : "bg-gradient-to-r from-emerald-400 to-green-500"
                                            )}
                                            style={{ width: `${Math.max(5, volume)}%` }}
                                        />
                                    </div>
                                    {/* Eşik Çizgisi Göstergesi (Barın Üstünde) */}
                                    <div className="relative w-full h-0">
                                        <div 
                                            className="absolute top-[-2rem] bottom-0 w-1 bg-slate-800 dark:bg-white z-10 rounded"
                                            style={{ left: `${threshold}%` }}
                                        />
                                        <div 
                                            className={cn("absolute top-2 text-[10px] font-black uppercase tracking-wider -translate-x-1/2", isFullscreen ? "text-slate-300" : "text-slate-600")}
                                            style={{ left: `${threshold}%` }}
                                        >
                                            Sınır
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SAYACA VE AYARLAR */}
                            <div className="flex flex-col items-center gap-8 w-full max-w-xs">
                                
                                {/* Dairesel İlerleme */}
                                <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle 
                                            cx="50" cy="50" r="45" 
                                            className={cn("fill-none stroke-[8]", isFullscreen ? "stroke-slate-700" : "stroke-slate-100")} 
                                        />
                                        <circle 
                                            cx="50" cy="50" r="45" 
                                            className={cn(
                                                "fill-none stroke-[8] stroke-linecap-round transition-all duration-1000",
                                                isNoisy && isListening ? "stroke-red-500" : "stroke-indigo-500"
                                            )} 
                                            strokeDasharray="283" 
                                            strokeDashoffset={283 - (283 * progressPercentage) / 100}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className={cn("text-5xl md:text-7xl font-black tabular-nums tracking-tighter", isFullscreen ? "text-white" : "text-slate-800")}>
                                            {targetTime - elapsedTime}
                                        </span>
                                        <span className={cn("text-xs md:text-sm font-bold uppercase tracking-widest mt-1", isFullscreen ? "text-slate-400" : "text-slate-400")}>
                                            Saniye Kaldı
                                        </span>
                                    </div>
                                </div>

                                {/* Kontroller */}
                                <div className="flex gap-4 w-full justify-center">
                                    {!isListening ? (
                                        <Button 
                                            onClick={startListening}
                                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-xl shadow-[0_5px_15px_rgba(79,70,229,0.3)] hover:scale-105 transition-all"
                                        >
                                            <Play className="mr-2 h-6 w-6" /> Başlat
                                        </Button>
                                    ) : (
                                        <Button 
                                            onClick={stopListening}
                                            variant="destructive"
                                            className="w-full h-14 font-black text-lg rounded-xl hover:scale-105 transition-all"
                                        >
                                            <Square className="mr-2 h-6 w-6" /> Durdur
                                        </Button>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}
                </CardContent>

                {/* FOOTER (Ayarlar) */}
                <CardFooter className={cn(
                    "p-4 md:p-6 border-t flex flex-col sm:flex-row gap-6 justify-between flex-shrink-0 z-20",
                    isFullscreen ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                )}>
                    
                    {/* Hedef Süre */}
                    <div className="flex-1 w-full space-y-2">
                        <label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isFullscreen ? "text-slate-400" : "text-slate-500")}>
                            <VolumeX className="w-4 h-4" /> Hedef Süre
                        </label>
                        <div className="flex gap-2">
                            {[30, 60, 120, 300].map(time => (
                                <button
                                    key={time}
                                    onClick={() => !isListening && setTargetTime(time)}
                                    disabled={isListening}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg font-bold text-sm transition-colors border disabled:opacity-50",
                                        targetTime === time 
                                            ? "bg-indigo-500 text-white border-indigo-600" 
                                            : (isFullscreen ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                                    )}
                                >
                                    {time >= 60 ? `${time/60} Dk` : `${time} Sn`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hassasiyet */}
                    <div className="flex-1 w-full space-y-2">
                        <label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isFullscreen ? "text-slate-400" : "text-slate-500")}>
                            <Settings2 className="w-4 h-4" /> Mikrofon Hassasiyeti (Sınır)
                        </label>
                        <div className="flex items-center gap-4">
                            <span className={cn("text-xs font-bold", isFullscreen ? "text-slate-500" : "text-slate-400")}>Hassas</span>
                            <input 
                                type="range" 
                                min="10" 
                                max="90" 
                                value={threshold}
                                onChange={(e) => setThreshold(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <span className={cn("text-xs font-bold", isFullscreen ? "text-slate-500" : "text-slate-400")}>Sağır</span>
                        </div>
                    </div>

                </CardFooter>
            </Card>
        </div>
    );
}
