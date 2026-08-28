'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Presentation, Settings, Sun, Moon, LayoutList, 
    Maximize2, X, Zap, Timer, Users, EyeOff, LayoutGrid, Play, Pause, 
    RotateCcw, Sparkles, BookOpen, HelpCircle, CheckCircle2, ChevronRight, 
    ChevronDown, Check, Trophy, Volume2, VolumeX, Shuffle, Pencil, Minus, Plus
} from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCachedSteps, setCachedSteps } from '@/lib/lesson-cache';
import type { Topic, Unit, LessonStep } from '@/lib/types';
import { LessonContentViewer } from '@/components/lesson-content-viewer';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { PresentationDrawingBoard } from '@/components/presentation-drawing-board';
import { PresentationWheelModal } from '@/components/presentation-wheel-modal';
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

const noOp = () => {};

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
    const FONT_SIZE_LEVELS: { key: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; label: string; short: string; badge: string; percent: string }[] = [
        { key: 'xs', label: 'Çok Küçük', short: 'Ç.Küçük', badge: '1. Çok Küçük', percent: '%75' },
        { key: 'sm', label: 'Küçük', short: 'Küçük', badge: '2. Küçük (Varsayılan)', percent: '%100' },
        { key: 'md', label: 'Orta', short: 'Orta', badge: '3. Orta', percent: '%125' },
        { key: 'lg', label: 'Büyük', short: 'Büyük', badge: '4. Büyük', percent: '%150' },
        { key: 'xl', label: 'Dev', short: 'Dev', badge: '5. Dev', percent: '%180' },
    ];

    const [isSingleCardMode, setIsSingleCardMode] = useState(false);
    const [animationSpeed, setAnimationSpeed] = useState<'off' | 'slow' | 'normal' | 'fast'>('normal');
    const [fontSizeScale, setFontSizeScale] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge'>('sm');
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const { themeMode, setThemeMode } = useTheme();
    const isDarkMode = themeMode === 'dark';
    const setIsDarkMode = (checked: boolean) => setThemeMode(checked ? 'dark' : 'light');

    const getCurrentScaleIndex = () => {
        if (fontSizeScale === 'normal') return 1; // 'sm'
        if (fontSizeScale === 'huge') return 4; // 'xl'
        const idx = FONT_SIZE_LEVELS.findIndex(lvl => lvl.key === fontSizeScale);
        return idx !== -1 ? idx : 1;
    };

    const increaseFontSize = () => {
        const curr = getCurrentScaleIndex();
        if (curr < FONT_SIZE_LEVELS.length - 1) {
            setFontSizeScale(FONT_SIZE_LEVELS[curr + 1].key);
        }
    };

    const decreaseFontSize = () => {
        const curr = getCurrentScaleIndex();
        if (curr > 0) {
            setFontSizeScale(FONT_SIZE_LEVELS[curr - 1].key);
        }
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

    // 2. Rastgele Öğrenci / Şanslı Çark (Presentation Wheel Modal)
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // 3. Slayt Çekmecesi (Slide Grid Drawer)
    const [isSlideDrawerOpen, setIsSlideDrawerOpen] = useState(false);

    // 4. Tahtayı Karart (Blackout / Freeze Mode)
    const [isBlackout, setIsBlackout] = useState(false);

    // 5. Canlı Çizim & Tahta (Drawing Board Mode)
    const [isDrawingOpen, setIsDrawingOpen] = useState(false);

    // 6. Ses Efektleri Açık/Kapalı
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
            } else if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                setIsDrawingOpen(prev => !prev);
            } else if (e.key === 'Escape') {
                setIsBlackout(false);
                setIsTimerOpen(false);
                setIsPickerOpen(false);
                setIsSlideDrawerOpen(false);
                setIsDrawingOpen(false);
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
        
        // Kullanıcı ilk etkileşime girdiğinde (tıklama, tuş) tam ekran yapma
        const enterFullscreen = () => {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        };

        const handleFirstGesture = () => {
            enterFullscreen();
        };

        window.addEventListener('click', handleFirstGesture, { once: true });
        window.addEventListener('keydown', handleFirstGesture, { once: true });
        window.addEventListener('touchstart', handleFirstGesture, { once: true });

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('click', handleFirstGesture);
            window.removeEventListener('keydown', handleFirstGesture);
            window.removeEventListener('touchstart', handleFirstGesture);
        };
    }, []);

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        if (!courseId || !unitId) {
            setIsLoading(false);
            return;
        }

        try {
            const targetId = topicId || unitId;
            // 0. Check client cache first if topicId is specified
            if (topicId) {
                const cached = getCachedSteps(topicId);
                if (cached && cached.length > 0) {
                    let finalSteps = cached;
                    if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                        finalSteps = cached.filter((s: any) => s.isPublished ?? true);
                    }
                    setContent({ id: topicId, title: topicName || 'Konu Sunumu', steps: finalSteps });
                    setTotalStepsCount(finalSteps.length);
                    setIsLoading(false);
                    return;
                }
            }

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
                 
                 if (steps.length === 0) {
                     try {
                         const flowRes = await fetch(`/curriculum/flows/${contentId}.json`);
                         if (flowRes.ok) {
                             const staticSteps = await flowRes.json();
                             if (staticSteps.length > 0) {
                                 steps = staticSteps;
                             }
                         }
                     } catch (e) {}
                 }
                
                 if (topicId && steps.length > 0) {
                     setCachedSteps(topicId, steps);
                 }

                 let finalSteps = steps;
                if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                    finalSteps = steps.filter((s: any) => s.isPublished ?? true);
                }

                 setContent({ id: contentId, title: data.title || topicName || 'Sunum', steps: finalSteps });
                 setTotalStepsCount(finalSteps.length);
            } else {
                // Fallback: Static Manifest & Flow JSON
                try {
                    const targetId = topicId || unitId;
                    let foundTitle = topicId ? 'Konu Sunumu' : 'Ünite Sunumu';
                    try {
                        const mRes = await fetch('/curriculum/manifest.json');
                        if (mRes.ok) {
                            const manifest = await mRes.json();
                            for (const g of manifest.classGroups || []) {
                                for (const c of g.courses || []) {
                                    for (const u of c.units || []) {
                                        if (u.id === targetId) foundTitle = u.title;
                                        for (const t of u.topics || []) {
                                            if (t.id === targetId) { foundTitle = t.title; break; }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (mErr) {}

                    const flowRes = await fetch(`/curriculum/flows/${targetId}.json`);
                    if (flowRes.ok) {
                        const staticSteps = await flowRes.json();
                        if (staticSteps.length > 0) {
                            let finalSteps = staticSteps;
                            if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                                finalSteps = staticSteps.filter((s: any) => s.isPublished ?? true);
                            }
                            setContent({ id: targetId, title: foundTitle, steps: finalSteps });
                            setTotalStepsCount(finalSteps.length);
                        }
                    }
                } catch (fallbackErr) {}
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

    return (
        <main 
            ref={mainContentRef} 
            className="h-screen w-screen overflow-hidden flex flex-col font-sans relative select-none bg-gradient-to-br from-indigo-50/70 via-sky-50/60 to-pink-50/50 text-slate-900"
        >
            {/* Canlı ve Neşeli Renkli Arka Plan Işıkları */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <motion.div 
                    animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.55, 0.35], rotate: [0, 90, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-indigo-300/40 blur-[140px]" 
                />
                <motion.div 
                    animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.5, 0.3], x: [0, 80, 0] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-purple-300/40 blur-[130px]" 
                />
                <motion.div 
                    animate={{ scale: [1, 1.3, 1], opacity: [0.25, 0.45, 0.25], y: [0, -50, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -bottom-[30%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-sky-300/35 blur-[160px]" 
                />
            </div>
            
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none" />

            {/* ══ ÜST HEADER: Breadcrumb, Saat ve Hızlı Araçlar (Tam ekranda gizlenir) ══ */}
            {!isFullscreen && (
                <header className="relative z-30 flex-shrink-0 flex items-center justify-between px-6 py-2.5 bg-white/85 backdrop-blur-2xl border-b border-indigo-100/80 shadow-sm text-slate-800">
                    {/* SOL: Breadcrumb */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 shadow-sm">
                            <Presentation className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2 text-xs md:text-sm font-bold">
                            <span className="text-slate-500 font-semibold">{courseName || 'Ders'}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-600 truncate max-w-[160px] md:max-w-[240px]">{unitName || 'Ünite'}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 font-black truncate max-w-[200px] md:max-w-[320px]">{content.title}</span>
                        </div>
                    </div>

                    {/* ORTA: Canlı Saat & Slayt İlerleme Rozeti */}
                    <div className="hidden sm:flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-mono font-bold text-slate-700 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                            <span>{currentTime}</span>
                        </div>
                        {totalStepsCount > 0 && (
                            <button 
                                onClick={() => setIsSlideDrawerOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-200/80 transition-all active:scale-95 shadow-sm"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>Slaytlar ({currentStepIndex + 1}/{totalStepsCount})</span>
                            </button>
                        )}
                    </div>

                    {/* SAĞ: Sayaç & Çizim (Sunum Araçları alt dock'taki 'Araçlar' butonuna taşındı) */}
                    <div className="flex items-center gap-2">
                        {/* Canlı sayaç çalışıyorsa göster */}
                        {isTimerRunning && (
                            <button
                                onClick={() => setIsTimerOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/40 text-xs font-mono font-bold animate-pulse hover:bg-amber-500/30 transition-all cursor-pointer"
                                title="Sayacı Görüntüle"
                            >
                                <Timer className="w-3.5 h-3.5" />
                                <span>{formatTimer(timerSeconds)}</span>
                            </button>
                        )}

                        {/* Hızlı Çizim & Tahta Butonu (D) */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsDrawingOpen(prev => !prev)}
                            className={cn(
                                "h-9 px-3 rounded-xl font-bold text-xs gap-1.5 transition-all border cursor-pointer",
                                isDrawingOpen 
                                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-md shadow-cyan-500/20" 
                                    : "bg-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10"
                            )}
                            title="Canlı Çizim & Not Alma (D)"
                        >
                            <Pencil className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="hidden sm:inline">Çizim (D)</span>
                        </Button>
                    </div>
                </header>
            )}

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
                    onOpenTools={() => setIsToolsOpen(prev => !prev)}
                />
            </div>

            {/* ══ SUNUM ARAÇLARI & AYARLAR PANELİ (ALT MENÜDEKİ 'ARAÇLAR' BUTONUNDAN AÇILIR) ══ */}
            <AnimatePresence>
                {isToolsOpen && (
                    <div 
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-sm p-3 sm:p-4" 
                        onClick={() => setIsToolsOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.95 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md p-0 rounded-3xl border-2 border-indigo-200 dark:border-white/15 shadow-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl overflow-hidden mb-16 sm:mb-0"
                        >
                            {/* Menü Başlığı */}
                            <div className="p-3.5 px-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                                        Sunum Araçları & Ayarlar
                                    </h4>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setIsSoundEnabled(prev => !prev)}
                                        className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                                        title={isSoundEnabled ? "Ses Efektleri Açık" : "Ses Efektleri Kapalı"}
                                    >
                                        {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setIsToolsOpen(false)}
                                        className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                                        title="Kapat"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                                {/* 1. Sınıf Araçları Izgara */}
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tahta Araçları</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => { setIsDrawingOpen(true); setIsToolsOpen(false); }}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 transition-all text-left group cursor-pointer"
                                        >
                                            <div className="p-2 rounded-lg bg-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs">Çizim & Not (D)</span>
                                                <span className="text-[10px] opacity-75">Kalem & Şekiller</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setIsTimerOpen(true); setIsToolsOpen(false); }}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-all text-left group cursor-pointer"
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
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition-all text-left group cursor-pointer"
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
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-all text-left group cursor-pointer"
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
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all text-left group col-span-2 cursor-pointer"
                                        >
                                            <div className="p-2 rounded-lg bg-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                                <EyeOff className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs">Tahtayı Karart (B)</span>
                                                <span className="text-[10px] opacity-75">Dikkati öğretmene topla</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* 2. Anlık Yazı & Kart Boyutu (Adım Adım Büyütme/Küçültme) */}
                                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Yazı & Kart Boyutu</span>
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                            {FONT_SIZE_LEVELS[getCurrentScaleIndex()]?.badge} ({FONT_SIZE_LEVELS[getCurrentScaleIndex()]?.percent})
                                        </span>
                                    </div>

                                    {/* Adım Adım Stepper (+ / -) */}
                                    <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={getCurrentScaleIndex() === 0}
                                            onClick={decreaseFontSize}
                                            className="h-8 w-8 p-0 rounded-xl bg-white dark:bg-white/10 shadow-xs hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white disabled:opacity-30 flex items-center justify-center cursor-pointer"
                                            title="Bir Adım Küçült (-)"
                                        >
                                            <Minus className="w-4 h-4 stroke-[3]" />
                                        </Button>

                                        <div className="flex-1 flex flex-col items-center">
                                            <div className="flex items-center gap-1.5 py-1">
                                                {FONT_SIZE_LEVELS.map((lvl, idx) => (
                                                    <div
                                                        key={lvl.key}
                                                        onClick={() => setFontSizeScale(lvl.key)}
                                                        className={cn(
                                                            "h-2.5 rounded-full cursor-pointer transition-all duration-300",
                                                            idx === getCurrentScaleIndex()
                                                                ? "w-6 bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.6)]"
                                                                : idx < getCurrentScaleIndex()
                                                                    ? "w-2.5 bg-indigo-400/60 hover:bg-indigo-500"
                                                                    : "w-2.5 bg-slate-300 dark:bg-white/20 hover:bg-slate-400"
                                                        )}
                                                        title={lvl.label}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">
                                                {FONT_SIZE_LEVELS[getCurrentScaleIndex()]?.label}
                                            </span>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={getCurrentScaleIndex() === FONT_SIZE_LEVELS.length - 1}
                                            onClick={increaseFontSize}
                                            className="h-8 w-8 p-0 rounded-xl bg-white dark:bg-white/10 shadow-xs hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white disabled:opacity-30 flex items-center justify-center cursor-pointer"
                                            title="Bir Adım Büyüt (+)"
                                        >
                                            <Plus className="w-4 h-4 stroke-[3]" />
                                        </Button>
                                    </div>

                                    {/* Hızlı Boyut Butonları (5 Kademe) */}
                                    <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                        {FONT_SIZE_LEVELS.map((lvl) => {
                                            const isActive = (fontSizeScale === lvl.key) || (fontSizeScale === 'normal' && lvl.key === 'sm') || (fontSizeScale === 'huge' && lvl.key === 'xl');
                                            return (
                                                <button
                                                    key={lvl.key}
                                                    onClick={() => setFontSizeScale(lvl.key)}
                                                    className={cn(
                                                        "py-1 rounded-lg text-[10px] font-bold transition-all truncate px-0.5 text-center cursor-pointer",
                                                        isActive
                                                            ? "bg-indigo-600 text-white shadow-xs font-black"
                                                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10"
                                                    )}
                                                    title={lvl.label}
                                                >
                                                    {lvl.short}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 3. Sunum Ayarları */}
                                <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-white/10">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Görünüm & Efektler</span>

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

                                {/* 4. Hızlı Aksiyon (Çıkış) */}
                                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                                    <Button 
                                        asChild 
                                        variant="ghost" 
                                        className="w-full h-9 rounded-xl text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white cursor-pointer"
                                    >
                                        <Link href="/teacher/ders-akisi">
                                            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Ders Akışına Dön / Çıkış
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4" onClick={() => setIsTimerOpen(false)}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md p-8 rounded-[2.5rem] bg-white/95 border-2 border-amber-300 shadow-2xl flex flex-col items-center text-center text-slate-900 overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
                            
                            <button onClick={() => setIsTimerOpen(false)} className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-2 text-amber-600 font-black uppercase tracking-widest text-xs mb-4">
                                <Timer className="w-4 h-4" /> Sınıf Geri Sayım Sayacı
                            </div>

                            {/* Dev Dijital Ekran */}
                            <div className="w-full py-8 my-2 rounded-3xl bg-amber-50/90 border-2 border-amber-300 flex items-center justify-center shadow-inner">
                                <span className={cn(
                                    "font-mono font-black text-6xl md:text-7xl tracking-tighter drop-shadow-sm",
                                    timerSeconds <= 10 && isTimerRunning ? "text-rose-600 animate-pulse" : "text-amber-600"
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
                                        className="h-10 rounded-xl bg-amber-100/70 border-amber-300 hover:bg-amber-500 hover:text-white font-black text-xs transition-all text-amber-950 shadow-sm"
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
                                            : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/30"
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
                                    className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 flex items-center justify-center shadow-sm"
                                    title="Sıfırla"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ══ 2. ŞANSLI KURA ÇARKI (KAYITLI ÖĞRENCİLER & ÖZEL LİSTE) ══ */}
            <PresentationWheelModal 
                isOpen={isPickerOpen} 
                onClose={() => setIsPickerOpen(false)} 
            />

            {/* ══ 3. SLAYT ÇEKMECESİ (SLIDE GRID OVERVIEW) ══ */}
            <AnimatePresence>
                {isSlideDrawerOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xl" onClick={() => setIsSlideDrawerOpen(false)}>
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-md h-full bg-white/95 border-l border-indigo-100 p-6 flex flex-col text-slate-800 shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-indigo-100">
                                <div className="flex items-center gap-2.5">
                                    <LayoutGrid className="w-5 h-5 text-purple-600" />
                                    <h3 className="font-black text-lg text-slate-900">Slayt Çekmecesi ({content.steps?.length || 0})</h3>
                                </div>
                                <button onClick={() => setIsSlideDrawerOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700">
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
                                                    ? "bg-purple-50 border-purple-400 shadow-md shadow-purple-100" 
                                                    : "bg-slate-50/80 border-slate-200 hover:bg-indigo-50/80 hover:border-indigo-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5",
                                                isActive ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white"
                                            )}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                                                        {step.type}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-sm text-slate-800 truncate group-hover:text-indigo-900">
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

            {/* ══ 5. CANLI ÇİZİM, BEYAZ TAHTA & NOT ALMA ARACI ══ */}
            <PresentationDrawingBoard
                isOpen={isDrawingOpen}
                onClose={() => setIsDrawingOpen(false)}
                isDarkMode={isDarkMode}
            />
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