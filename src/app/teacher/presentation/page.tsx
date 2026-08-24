'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Presentation, Settings, Sun, Moon, LayoutList, 
    Maximize2, X, Zap, Timer, Users, EyeOff, LayoutGrid, Play, Pause, 
    RotateCcw, Sparkles, BookOpen, HelpCircle, CheckCircle2, ChevronRight, 
    Check, Trophy, Volume2, VolumeX, Shuffle
} from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Topic, Unit, LessonStep } from '@/lib/types';
import { LessonContentViewer } from '@/components/lesson-content-viewer';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/context/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playSound } from '@/lib/audio-service';

function PresentationPageContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    const courseName = searchParams.get('courseName');
    const unitName = searchParams.get('unitName');

    const [content, setContent] = useState<(Topic | Unit) & { steps?: LessonStep[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mainContentRef = useRef<HTMLElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Settings state
    const [isSingleCardMode, setIsSingleCardMode] = useState(false);
    const [animationSpeed, setAnimationSpeed] = useState<'off' | 'slow' | 'normal' | 'fast'>('normal');
    const [fontSizeScale, setFontSizeScale] = useState<'normal' | 'large' | 'huge'>('normal');
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const { themeMode, setThemeMode } = useTheme();
    const isDarkMode = themeMode === 'dark';
    const setIsDarkMode = (checked: boolean) => setThemeMode(checked ? 'dark' : 'light');

    const increaseFontSize = () => {
        setFontSizeScale(prev => prev === 'normal' ? 'large' : 'huge');
    };
    const decreaseFontSize = () => {
        setFontSizeScale(prev => prev === 'huge' ? 'large' : 'normal');
    };

    // Step Tracking & Jump
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [totalStepsCount, setTotalStepsCount] = useState(0);
    const [jumpToStep, setJumpToStep] = useState<number | null>(null);

    const handleStepIndexChange = useCallback((idx: number, total: number) => {
        setCurrentStepIndex(idx);
        setTotalStepsCount(total);
    }, []);

    // Live Clock State
    const [currentTime, setCurrentTime] = useState<string>('');
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // ══ TAHTA ARAÇLARI STATE'LERİ ══
    // 1. Sınıf Sayacı (Classroom Timer)
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(60);
    const [initialTimerSeconds, setInitialTimerSeconds] = useState(60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // 2. Rastgele Öğrenci / Numara Seçici (Lucky Picker)
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pickerMode, setPickerMode] = useState<'number' | 'list'>('number');
    const [minNum, setMinNum] = useState(1);
    const [maxNum, setMaxNum] = useState(35);
    const [customNamesText, setCustomNamesText] = useState('Ahmet\nAyşe\nMehmet\nFatma\nAli\nZeynep\nMustafa\nElif');
    const [pickedResult, setPickedResult] = useState<string | number | null>(null);
    const [isRolling, setIsRolling] = useState(false);

    // 3. Slayt Çekmecesi (Slide Grid Drawer)
    const [isSlideDrawerOpen, setIsSlideDrawerOpen] = useState(false);

    // 4. Tahtayı Karart (Blackout / Freeze Mode)
    const [isBlackout, setIsBlackout] = useState(false);

    // 5. Ses Efektleri Açık/Kapalı
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);

    // Timer Effect
    useEffect(() => {
        if (isTimerRunning && timerSeconds > 0) {
            timerRef.current = setInterval(() => {
                setTimerSeconds(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        setIsTimerRunning(false);
                        if (isSoundEnabled) {
                            try { playSound('timeUp'); } catch(e) {}
                        }
                        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning, timerSeconds, isSoundEnabled]);

    const formatTimer = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startTimerPreset = (sec: number) => {
        setInitialTimerSeconds(sec);
        setTimerSeconds(sec);
        setIsTimerRunning(true);
    };

    // Random Picker Roll Logic
    const handleRoll = () => {
        if (isRolling) return;
        setIsRolling(true);
        setPickedResult(null);

        let candidates: (string | number)[] = [];
        if (pickerMode === 'number') {
            for (let i = minNum; i <= maxNum; i++) candidates.push(i);
        } else {
            candidates = customNamesText.split('\n').map(n => n.trim()).filter(Boolean);
        }

        if (candidates.length === 0) {
            setIsRolling(false);
            return;
        }

        let rollsCount = 0;
        const maxRolls = 20;
        const interval = setInterval(() => {
            const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
            setPickedResult(randomCandidate);
            if (isSoundEnabled) {
                try { playSound('hint'); } catch(e) {}
            }
            rollsCount++;

            if (rollsCount >= maxRolls) {
                clearInterval(interval);
                const finalWinner = candidates[Math.floor(Math.random() * candidates.length)];
                setPickedResult(finalWinner);
                setIsRolling(false);
                if (isSoundEnabled) {
                    try { playSound('win'); } catch(e) {}
                }
                confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
            }
        }, 100);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
                return;
            }

            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                setIsBlackout(prev => !prev);
            } else if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                setIsTimerOpen(prev => !prev);
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                setIsPickerOpen(prev => !prev);
            } else if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                setIsSlideDrawerOpen(prev => !prev);
            } else if (e.key === 'Escape') {
                setIsBlackout(false);
                setIsTimerOpen(false);
                setIsPickerOpen(false);
                setIsSlideDrawerOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        if (!courseId || !unitId) {
            setIsLoading(false);
            return;
        }

        try {
            let contentRef;
            if (topicId) {
                contentRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            } else {
                contentRef = doc(db, 'courses', courseId, 'units', unitId);
            }

            const contentSnap = await getDoc(contentRef);
            
            if (contentSnap.exists()) {
                 const data = contentSnap.data();
                 const contentId = contentSnap.id;
                 let steps = data.steps || [];

                 if (!topicId && steps.length === 0) {
                     const topicsSnapshot = await getDocs(query(collection(db, `courses/${courseId}/units/${unitId}/topics`), orderBy("title")));
                     steps = topicsSnapshot.docs.flatMap(doc => (doc.data().steps || []));
                 }
                 
                 try {
                     const flowRes = await fetch(`/curriculum/flows/${contentId}.json`);
                     if (flowRes.ok) {
                         const staticSteps = await flowRes.json();
                         if (staticSteps.length > 0 && steps.length === 0) {
                            steps = staticSteps;
                         }
                     }
                 } catch (e) {}
                
                let finalSteps = steps;
                if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                    finalSteps = steps.filter((s: any) => s.isPublished ?? true);
                }

                 setContent({ id: contentId, title: data.title, steps: finalSteps });
                 setTotalStepsCount(finalSteps.length);
            }
        } catch (error) {
            console.error("Error fetching content for presentation:", error);
        } finally {
            setIsLoading(false);
        }
    }, [courseId, unitId, topicId, user]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-14 w-14 animate-spin text-indigo-500" />
                    <p className="text-sm font-bold text-slate-400 tracking-widest uppercase animate-pulse">Sunum Yükleniyor...</p>
                </div>
            </div>
        );
    }
    
    if (!content) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
                <div className="text-center p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl">
                    <p className="text-2xl font-bold mb-4 text-white">Sunum içeriği bulunamadı.</p>
                    <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
                        <Link href="/teacher/ders-akisi">Ders Akışına Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const noOp = () => {};

    return (
        <main 
            ref={mainContentRef} 
            className={cn(
                "h-screen w-screen overflow-hidden flex flex-col font-sans relative transition-colors duration-500 select-none",
                isDarkMode ? "dark bg-[#020617] text-white" : "bg-slate-50 text-slate-900"
            )}
        >
            {/* Ambient Animated Background (Dark Mode Only) */}
            {isDarkMode && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.45, 0.25], rotate: [0, 90, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/25 blur-[130px]" 
                    />
                    <motion.div 
                        animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2], x: [0, 80, 0] }}
                        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-purple-900/25 blur-[120px]" 
                    />
                    <motion.div 
                        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15], y: [0, -50, 0] }}
                        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -bottom-[30%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-sky-900/25 blur-[160px]" 
                    />
                </div>
            )}
            
            <div className={cn("absolute inset-0 bg-[url('/grid-pattern.svg')] pointer-events-none", isDarkMode ? "opacity-[0.04]" : "opacity-[0.08]")} />

            {/* ══ ÜST HEADER: Breadcrumb, Saat ve Hızlı Araçlar ══ */}
            <header className="relative z-30 flex-shrink-0 flex items-center justify-between px-6 py-2.5 bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/10 shadow-sm">
                {/* SOL: Breadcrumb */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                        <Presentation className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm font-bold">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">{courseName || 'Ders'}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[160px] md:max-w-[240px]">{unitName || 'Ünite'}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold truncate max-w-[200px] md:max-w-[320px]">{content.title}</span>
                    </div>
                </div>

                {/* ORTA: Canlı Saat & Slayt İlerleme Rozeti */}
                <div className="hidden sm:flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>{currentTime}</span>
                    </div>
                    {totalStepsCount > 0 && (
                        <button 
                            onClick={() => setIsSlideDrawerOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-all active:scale-95"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Slayt {currentStepIndex + 1} / {totalStepsCount}</span>
                        </button>
                    )}
                </div>

                {/* SAĞ: TEK TUŞ SUNUM ARAÇLARI */}
                <div className="flex items-center gap-2">
                    {/* Canlı sayaç çalışıyorsa göster */}
                    {isTimerRunning && (
                        <button
                            onClick={() => setIsTimerOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/40 text-xs font-mono font-bold animate-pulse hover:bg-amber-500/30 transition-all"
                            title="Sayacı Görüntüle"
                        >
                            <Timer className="w-3.5 h-3.5" />
                            <span>{formatTimer(timerSeconds)}</span>
                        </button>
                    )}

                    {/* TEK TUŞ SUNUM ARAÇLARI & AYARLAR MENÜSÜ */}
                    <Popover open={isToolsOpen} onOpenChange={setIsToolsOpen}>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="default"
                                size="sm" 
                                className="h-9 px-3.5 rounded-xl font-black gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30 transition-all active:scale-95"
                            >
                                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                                <span className="text-xs tracking-wide">Sunum Araçları</span>
                                <ChevronDown className={cn("w-3.5 h-3.5 text-indigo-200 transition-transform duration-200", isToolsOpen && "rotate-180")} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" align="end" className="w-80 sm:w-96 p-0 rounded-2xl border-slate-200 dark:border-white/15 shadow-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl overflow-hidden z-50">
                            {/* Menü Başlığı */}
                            <div className="p-3.5 px-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                                        Sunum Araçları & Ayarlar
                                    </h4>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setIsSoundEnabled(prev => !prev)}
                                    className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                    title={isSoundEnabled ? "Ses Efektleri Açık" : "Ses Efektleri Kapalı"}
                                >
                                    {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                                </Button>
                            </div>

                            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                                {/* 1. Sınıf Araçları 2x2 Izgara */}
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tahta Araçları</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => { setIsTimerOpen(true); setIsToolsOpen(false); }}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-all text-left group"
                                        >
                                            <div className="p-2 rounded-lg bg-amber-500/20 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                                                <Timer className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs">Sayaç (T)</span>
                                                <span className="text-[10px] opacity-75">{isTimerRunning ? formatTimer(timerSeconds) : 'Geri sayım'}</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setIsPickerOpen(true); setIsToolsOpen(false); }}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition-all text-left group"
                                        >
                                            <div className="p-2 rounded-lg bg-sky-500/20 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs">Öğrenci (R)</span>
                                                <span className="text-[10px] opacity-75">Kura & Çark</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setIsSlideDrawerOpen(true); setIsToolsOpen(false); }}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-all text-left group"
                                        >
                                            <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                                <LayoutGrid className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs">Slaytlar (G)</span>
                                                <span className="text-[10px] opacity-75">Tüm adımlar</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setIsBlackout(true); setIsToolsOpen(false); }}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all text-left group"
                                        >
                                            <div className="p-2 rounded-lg bg-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                                <EyeOff className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs">Karart (B)</span>
                                                <span className="text-[10px] opacity-75">Dikkati topla</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* 2. Anlık Yazı Boyutu */}
                                <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Yazı Boyutu</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                                            {fontSizeScale === 'normal' ? 'Normal' : (fontSizeScale === 'large' ? 'Büyük' : 'Dev (Maks)')}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                        <button
                                            onClick={() => setFontSizeScale('normal')}
                                            className={cn(
                                                "py-1.5 rounded-lg text-xs font-bold transition-all",
                                                fontSizeScale === 'normal' 
                                                    ? "bg-indigo-600 text-white shadow-sm" 
                                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10"
                                            )}
                                        >
                                            Normal
                                        </button>
                                        <button
                                            onClick={() => setFontSizeScale('large')}
                                            className={cn(
                                                "py-1.5 rounded-lg text-xs font-bold transition-all",
                                                fontSizeScale === 'large' 
                                                    ? "bg-indigo-600 text-white shadow-sm" 
                                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10"
                                            )}
                                        >
                                            Büyük
                                        </button>
                                        <button
                                            onClick={() => setFontSizeScale('huge')}
                                            className={cn(
                                                "py-1.5 rounded-lg text-xs font-bold transition-all",
                                                fontSizeScale === 'huge' 
                                                    ? "bg-indigo-600 text-white shadow-sm" 
                                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10"
                                            )}
                                        >
                                            Dev
                                        </button>
                                    </div>
                                </div>

                                {/* 3. Tema & Sunum Ayarları */}
                                <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-white/10">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Görünüm & Efektler</span>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <Label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                                {isDarkMode ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />} 
                                                Koyu Tema
                                            </Label>
                                            <span className="text-[10px] text-slate-400">Akıllı tahta için önerilir.</span>
                                        </div>
                                        <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <Label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                                {isSingleCardMode ? <Maximize2 className="w-3.5 h-3.5 text-emerald-500" /> : <LayoutList className="w-3.5 h-3.5 text-sky-500" />} 
                                                Tek Kart Modu
                                            </Label>
                                            <span className="text-[10px] text-slate-400">Konu anlatımında tek tek göster.</span>
                                        </div>
                                        <Switch checked={isSingleCardMode} onCheckedChange={setIsSingleCardMode} />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <Label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                                Animasyon Hızı
                                            </Label>
                                            <span className="text-[10px] text-slate-400">Daktilo efektinin hızı.</span>
                                        </div>
                                        <Select value={animationSpeed} onValueChange={(v: any) => setAnimationSpeed(v)}>
                                            <SelectTrigger className="w-[95px] h-7 bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/20 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/20">
                                                <SelectItem value="off">Kapalı</SelectItem>
                                                <SelectItem value="slow">Yavaş</SelectItem>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="fast">Hızlı</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* 4. Hızlı Aksiyonlar (Tam Ekran & Çıkış) */}
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                                    <FullscreenToggle 
                                        elementRef={mainContentRef} 
                                        className="w-full h-9 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10" 
                                    />
                                    <Button 
                                        asChild 
                                        variant="ghost" 
                                        className="w-full h-9 rounded-xl text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white"
                                    >
                                        <Link href="/teacher/ders-akisi">
                                            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Çıkış
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </header>

            {/* ══ İÇERİK ALANI: LessonContentViewer ══ */}
            <div className="flex-grow flex flex-col min-h-0 relative z-10 w-full h-full">
                <LessonContentViewer
                    topic={content as Topic}
                    courseId={courseId!}
                    unitId={unitId!}
                    courseTitle={courseName!}
                    unitTitle={unitName!}
                    onTopicComplete={noOp}
                    progress={undefined}
                    onProgressUpdate={noOp}
                    onMultiAnswer={noOp}
                    onAllTfAnswered={noOp}
                    isFullscreen={true}
                    isSingleCardMode={isSingleCardMode}
                    animationSpeed={animationSpeed}
                    fontSizeScale={fontSizeScale}
                    jumpToStep={jumpToStep}
                    onJumpDone={() => setJumpToStep(null)}
                    onStepIndexChange={handleStepIndexChange}
                />
            </div>

            {/* ══ KÖŞE MİNİ SAYAÇ ROZETİ (Sayaç çalışırken modal kapatılırsa) ══ */}
            {isTimerRunning && !isTimerOpen && (
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="fixed top-16 right-6 z-40 cursor-pointer"
                    onClick={() => setIsTimerOpen(true)}
                >
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/90 text-slate-950 font-black text-lg shadow-[0_0_30px_rgba(245,158,11,0.5)] border-2 border-white/40 hover:scale-105 transition-transform backdrop-blur-xl animate-pulse">
                        <Timer className="w-5 h-5 animate-spin" />
                        <span className="font-mono">{formatTimer(timerSeconds)}</span>
                    </div>
                </motion.div>
            )}

            {/* ══ 1. SINIF GERİ SAYIM SAYACI MODALI ══ */}
            <AnimatePresence>
                {isTimerOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl p-4" onClick={() => setIsTimerOpen(false)}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md p-8 rounded-[2.5rem] bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-white/20 shadow-[0_0_60px_rgba(245,158,11,0.3)] flex flex-col items-center text-center text-white overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
                            
                            <button onClick={() => setIsTimerOpen(false)} className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-widest text-xs mb-4">
                                <Timer className="w-4 h-4" /> Sınıf Geri Sayım Sayacı
                            </div>

                            {/* Dev Dijital Ekran */}
                            <div className="w-full py-8 my-2 rounded-3xl bg-black/50 border border-white/10 flex items-center justify-center shadow-inner">
                                <span className={cn(
                                    "font-mono font-black text-6xl md:text-7xl tracking-tighter drop-shadow-lg",
                                    timerSeconds <= 10 && isTimerRunning ? "text-rose-500 animate-pulse" : "text-amber-400"
                                )}>
                                    {formatTimer(timerSeconds)}
                                </span>
                            </div>

                            {/* Preset Butonları */}
                            <div className="grid grid-cols-4 gap-2 w-full mt-4">
                                {[30, 60, 120, 300].map((sec) => (
                                    <Button
                                        key={sec}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => startTimerPreset(sec)}
                                        className="h-10 rounded-xl bg-white/5 border-white/10 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs transition-all text-white"
                                    >
                                        {sec < 60 ? `${sec}sn` : `${sec / 60}dk`}
                                    </Button>
                                ))}
                            </div>

                            {/* Kontrol Düğmeleri */}
                            <div className="flex items-center gap-3 w-full mt-6">
                                <Button
                                    onClick={() => setIsTimerRunning(prev => !prev)}
                                    className={cn(
                                        "flex-1 h-14 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                                        isTimerRunning 
                                            ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30" 
                                            : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/30"
                                    )}
                                >
                                    {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                                    {isTimerRunning ? 'Duraklat' : 'Başlat'}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsTimerRunning(false);
                                        setTimerSeconds(initialTimerSeconds);
                                    }}
                                    className="h-14 w-14 rounded-2xl bg-white/10 border-white/15 hover:bg-white/20 text-white flex items-center justify-center"
                                    title="Sıfırla"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ══ 2. RASTGELE ÖĞRENCİ SEÇİCİ MODALI ══ */}
            <AnimatePresence>
                {isPickerOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl p-4" onClick={() => setIsPickerOpen(false)}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg p-8 rounded-[2.5rem] bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-white/20 shadow-[0_0_70px_rgba(14,165,233,0.3)] flex flex-col items-center text-center text-white overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500" />
                            
                            <button onClick={() => setIsPickerOpen(false)} className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-widest text-xs mb-3">
                                <Shuffle className="w-4 h-4" /> Rastgele Söz Hakkı & Öğrenci Seçici
                            </div>

                            {/* Mod Seçimi */}
                            <div className="flex items-center gap-2 p-1 rounded-xl bg-black/40 border border-white/10 mb-5">
                                <button 
                                    onClick={() => setPickerMode('number')} 
                                    className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", pickerMode === 'number' ? "bg-sky-500 text-slate-950 font-black shadow-md" : "text-slate-400 hover:text-white")}
                                >
                                    Okul Numarası (1-N)
                                </button>
                                <button 
                                    onClick={() => setPickerMode('list')} 
                                    className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", pickerMode === 'list' ? "bg-sky-500 text-slate-950 font-black shadow-md" : "text-slate-400 hover:text-white")}
                                >
                                    İsim Listesi
                                </button>
                            </div>

                            {/* Seçim Ekranı / Çark Alanı */}
                            <div className="relative w-full h-44 rounded-3xl bg-black/60 border-2 border-sky-500/30 flex flex-col items-center justify-center overflow-hidden shadow-inner my-2">
                                <div className="absolute inset-0 bg-gradient-to-t from-sky-500/10 via-transparent to-sky-500/10 pointer-events-none" />
                                
                                {pickedResult !== null ? (
                                    <motion.div 
                                        key={String(pickedResult)}
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="flex flex-col items-center gap-2"
                                    >
                                        <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-widest">
                                            <Trophy className="w-4 h-4" /> Seçilen Kişi:
                                        </div>
                                        <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-sky-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.6)]">
                                            {pickerMode === 'number' ? `No: ${pickedResult}` : pickedResult}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-500">
                                        <Users className="w-10 h-10 stroke-[1.5]" />
                                        <span className="text-sm font-medium">Çevirmek için butona basın</span>
                                    </div>
                                )}
                            </div>

                            {/* Ayarlar Alanı */}
                            {pickerMode === 'number' ? (
                                <div className="flex items-center justify-center gap-3 my-4 text-xs font-bold">
                                    <span>Numara Aralığı:</span>
                                    <input 
                                        type="number" 
                                        value={minNum} 
                                        onChange={e => setMinNum(Number(e.target.value))}
                                        className="w-16 h-8 text-center rounded-lg bg-white/10 border border-white/20 text-white font-bold"
                                    />
                                    <span>ile</span>
                                    <input 
                                        type="number" 
                                        value={maxNum} 
                                        onChange={e => setMaxNum(Number(e.target.value))}
                                        className="w-16 h-8 text-center rounded-lg bg-white/10 border border-white/20 text-white font-bold"
                                    />
                                    <span>arası</span>
                                </div>
                            ) : (
                                <div className="w-full my-3">
                                    <textarea 
                                        rows={3} 
                                        value={customNamesText} 
                                        onChange={e => setCustomNamesText(e.target.value)}
                                        placeholder="Her satıra bir isim yazın..."
                                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-xs font-medium text-white focus:outline-none focus:border-sky-400"
                                    />
                                </div>
                            )}

                            {/* Çevir / Seç Butonu */}
                            <Button
                                onClick={handleRoll}
                                disabled={isRolling}
                                className="w-full h-14 mt-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-lg shadow-[0_0_30px_rgba(14,165,233,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Sparkles className={cn("w-5 h-5", isRolling && "animate-spin")} />
                                {isRolling ? 'Seçiliyor...' : 'Rastgele Seç'}
                            </Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ══ 3. SLAYT ÇEKMECESİ (SLIDE GRID OVERVIEW) ══ */}
            <AnimatePresence>
                {isSlideDrawerOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xl" onClick={() => setIsSlideDrawerOpen(false)}>
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-md h-full bg-slate-900 border-l border-white/10 p-6 flex flex-col text-white shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <LayoutGrid className="w-5 h-5 text-purple-400" />
                                    <h3 className="font-black text-lg">Slayt Çekmecesi ({content.steps?.length || 0})</h3>
                                </div>
                                <button onClick={() => setIsSlideDrawerOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                                {(content.steps || []).map((step, idx) => {
                                    const isActive = idx === currentStepIndex;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setJumpToStep(idx);
                                                setIsSlideDrawerOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3.5 group",
                                                isActive 
                                                    ? "bg-purple-500/20 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]" 
                                                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5",
                                                isActive ? "bg-purple-500 text-white" : "bg-black/30 text-slate-400 group-hover:text-white"
                                            )}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                                                        {step.type}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-sm text-slate-200 truncate group-hover:text-white">
                                                    {step.title || `Adım ${idx + 1}`}
                                                </h4>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ══ 4. TAHTAYI KARART (BLACKOUT / STAGE FREEZE OVERLAY) ══ */}
            <AnimatePresence>
                {isBlackout && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsBlackout(false)}
                        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer select-none"
                    >
                        <div className="flex flex-col items-center gap-6 p-8 text-center animate-pulse">
                            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                                <EyeOff className="w-12 h-12" />
                            </div>
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black text-white mb-2">Tahta Duraklatıldı</h2>
                                <p className="text-lg text-slate-400 font-medium">Dikkat Öğretmende 👨‍🏫</p>
                            </div>
                            <p className="text-xs text-slate-600 uppercase tracking-widest mt-4">
                                Devam etmek için ekrana tıklayın veya 'B' tuşuna basın
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}

export default function PresentationPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <PresentationPageContent />
        </Suspense>
    );
}