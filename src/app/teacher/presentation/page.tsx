'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Presentation, Settings, Smartphone, Sun, Moon, LayoutList, 
    Maximize2, X, Zap, Timer, Users, EyeOff, LayoutGrid, Play, Pause, 
    RotateCcw, Sparkles, BookOpen, HelpCircle, CheckCircle2, ChevronRight, 
    ChevronDown, ChevronUp, Check, Trophy, Volume2, VolumeX, Shuffle, Pencil, Minus, Plus,
    Copy, Lock, Gauge, LogOut, Palette, Type, Pin, PinOff, Mic
} from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCachedSteps, setCachedSteps } from '@/lib/lesson-cache';
import type { Topic, Unit, LessonStep } from '@/lib/types';
import { LessonContentViewer } from '@/components/lesson-content-viewer';
import { getTurkishVoices, getBestTurkishVoice, type TurkishVoiceOption } from '@/components/lesson-viewer/tts-helper';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { PresentationDrawingBoard } from '@/components/presentation-drawing-board';
import { PresentationWheelModal } from '@/components/presentation-wheel-modal';
import { PresentationRemoteModal } from '@/components/presentation-remote-modal';
import { PresentationSceneBackground } from '@/components/presentation-scenes';
import { PresentationWoodenHeader } from '@/components/presentation-wooden-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/context/theme-provider';
import { useToast } from '@/hooks/use-toast';
import { saveTopicSourceText } from '@/app/teacher/source-texts/actions';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playSound, setGlobalSoundEnabled } from '@/lib/audio-service';

const noOp = () => {};

function PresentationPageContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleExit = useCallback(() => {
        if (typeof document !== 'undefined' && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
        if (typeof window !== 'undefined' && document.referrer && document.referrer.includes(window.location.host)) {
            router.back();
        } else {
            router.push('/teacher/ders-akisi');
        }
    }, [router]);
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    const courseName = searchParams.get('courseName');
    const unitName = searchParams.get('unitName');
    const topicName = searchParams.get('topicName');

    const [content, setContent] = useState<(Topic | Unit) & { steps?: LessonStep[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mainContentRef = useRef<HTMLElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Settings state
    const FONT_SIZE_LEVELS: { key: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; label: string; short: string; badge: string; percent: string }[] = [
        { key: 'xs', label: 'Küçük', short: 'Küçük', badge: '1. Küçük', percent: '%80' },
        { key: 'sm', label: 'Standart', short: 'Standart', badge: '2. Standart', percent: '%100' },
        { key: 'md', label: 'Büyük', short: 'Büyük (Varsayılan)', badge: '3. Büyük (Varsayılan)', percent: '%130' },
        { key: 'lg', label: 'Çok Büyük', short: 'Ç.Büyük', badge: '4. Çok Büyük', percent: '%160' },
        { key: 'xl', label: 'Dev', short: 'Dev', badge: '5. Dev', percent: '%200' },
    ];

    const [isSingleCardMode, setIsSingleCardMode] = useState(false);
    const [animationSpeed, setAnimationSpeed] = useState<'off' | 'slow' | 'normal' | 'fast'>('off');
    const [fontSizeScale, setFontSizeScale] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge'>('md');
    const [isAutoReadEnabled, setIsAutoReadEnabled] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('presentation_auto_read');
            return saved === 'true'; // varsayılan kapalı
        }
        return false;
    });

    const toggleAutoRead = useCallback((checked: boolean) => {
        setIsAutoReadEnabled(checked);
        if (typeof window !== 'undefined') {
            localStorage.setItem('presentation_auto_read', String(checked));
        }
    }, []);

    const [availableVoices, setAvailableVoices] = useState<TurkishVoiceOption[]>([]);
    const [activeVoiceName, setActiveVoiceName] = useState<string>('');
    const [preferredVoice, setPreferredVoice] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('preferred_turkish_voice') || 'auto';
        }
        return 'auto';
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const updateVoices = () => {
            const list = getTurkishVoices();
            setAvailableVoices(list);
            const best = getBestTurkishVoice(preferredVoice === 'auto' ? null : preferredVoice);
            if (best) {
                setActiveVoiceName(best.name);
            }
        };
        updateVoices();
        window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
        };
    }, [preferredVoice]);

    const handleVoiceChange = (val: string) => {
        setPreferredVoice(val);
        if (typeof window !== 'undefined') {
            if (val === 'auto') {
                localStorage.removeItem('preferred_turkish_voice');
            } else {
                localStorage.setItem('preferred_turkish_voice', val);
            }
        }
    };

    const [isPerfMode, setIsPerfMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('presentation_perf_mode');
            if (saved !== null) return saved === 'true';
            return true; // Varsayılan olarak akıllı tahta dostu hızlı mod açık
        }
        return true;
    });

    useEffect(() => {
        if (typeof document !== 'undefined') {
            if (isPerfMode || animationSpeed === 'off') {
                document.documentElement.classList.add('perf-mode');
            } else {
                document.documentElement.classList.remove('perf-mode');
            }
        }
        try {
            localStorage.setItem('presentation_perf_mode', String(isPerfMode));
        } catch (_) {}
        return () => {
            if (typeof document !== 'undefined') {
                document.documentElement.classList.remove('perf-mode');
            }
        };
    }, [isPerfMode, animationSpeed]);

    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const { toast } = useToast();
    const [sourceText, setSourceText] = useState<string>('');
    const [isSourceTextOpen, setIsSourceTextOpen] = useState(false);
    const [isEditingSourceText, setIsEditingSourceText] = useState(false);
    const [editableSourceText, setEditableSourceText] = useState('');
    const [isSavingSourceText, setIsSavingSourceText] = useState(false);
    const { themeMode, setThemeMode } = useTheme();
    const isDarkMode = themeMode === 'dark';
    const setIsDarkMode = (checked: boolean) => setThemeMode(checked ? 'dark' : 'light');

    const handleSaveSourceText = async () => {
        if (!courseId || !unitId || (!topicId && !unitId)) return;
        setIsSavingSourceText(true);
        try {
            const targetTopicId = topicId || unitId;
            const res = await saveTopicSourceText(courseId, unitId, targetTopicId, editableSourceText);
            if (res.success) {
                setSourceText(editableSourceText.trim());
                setIsEditingSourceText(false);
                toast({ title: "Kaydedildi", description: "Kaynak metin başarıyla güncellendi." });
            } else {
                toast({ title: "Hata", description: res.error || "Kaydedilemedi.", variant: "destructive" });
            }
        } catch (e: any) {
            toast({ title: "Hata", description: e.message, variant: "destructive" });
        } finally {
            setIsSavingSourceText(false);
        }
    };

    const handleCopySourceText = async () => {
        if (!sourceText) return;
        try {
            await navigator.clipboard.writeText(sourceText);
            toast({ title: "Kopyalandı", description: "Kaynak metin panoya kopyalandı." });
        } catch (e) {
            toast({ title: "Hata", description: "Panoya kopyalanamadı.", variant: "destructive" });
        }
    };

    const getCurrentScaleIndex = () => {
        if (fontSizeScale === 'normal') return 2; // 'md'
        if (fontSizeScale === 'huge') return 4; // 'xl'
        const idx = FONT_SIZE_LEVELS.findIndex(lvl => lvl.key === fontSizeScale);
        return idx !== -1 ? idx : 2;
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
    const [isWheelQuickActive, setIsWheelQuickActive] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('presentation_wheel_quick_active');
            if (saved === 'true') {
                setIsWheelQuickActive(true);
            }
        }
    }, []);

    const handleOpenWheel = useCallback(() => {
        setIsWheelQuickActive(true);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('presentation_wheel_quick_active', 'true');
        }
        setIsPickerOpen(true);
    }, []);

    const handleDismissWheelQuick = useCallback(() => {
        setIsWheelQuickActive(false);
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('presentation_wheel_quick_active');
        }
    }, []);

    // 3. Slayt Çekmecesi (Slide Grid Drawer)
    const [isSlideDrawerOpen, setIsSlideDrawerOpen] = useState(false);

    // 4. Tahtayı Karart (Blackout / Freeze Mode)
    const [isBlackout, setIsBlackout] = useState(false);

    // 5. Canlı Çizim & Tahta (Drawing Board Mode)
    const [isDrawingOpen, setIsDrawingOpen] = useState(false);

    // 6. Ses Efektleri Açık/Kapalı
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);

    useEffect(() => {
        setGlobalSoundEnabled(isSoundEnabled);
        return () => setGlobalSoundEnabled(true);
    }, [isSoundEnabled]);

    // 7. Mobil Kumanda (QR Kod Oturumu)
    const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);

    // 8. Sunum Teması (Defter / Sketchnote Varsayılan)
    const [presentationTheme, setPresentationTheme] = useState<'game-3d' | 'sketchnote' | 'cosmic-dark' | 'vibrant-studio' | 'clean-light'>('sketchnote');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('presentation_theme_v4');
            if (saved === 'game-3d' || saved === 'sketchnote' || saved === 'cosmic-dark' || saved === 'vibrant-studio' || saved === 'clean-light') {
                setPresentationTheme(saved as any);
            } else {
                setPresentationTheme('sketchnote');
                localStorage.setItem('presentation_theme_v4', 'sketchnote');
                localStorage.setItem('presentation_theme_v3', 'sketchnote');
                localStorage.setItem('presentation_theme_v2', 'sketchnote');
                localStorage.setItem('presentation_theme', 'sketchnote');
            }
        }
    }, []);

    const handleThemeChange = useCallback((newTheme: 'game-3d' | 'sketchnote' | 'cosmic-dark' | 'vibrant-studio' | 'clean-light') => {
        setPresentationTheme(newTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem('presentation_theme_v4', newTheme);
            localStorage.setItem('presentation_theme_v3', newTheme);
            localStorage.setItem('presentation_theme_v2', newTheme);
            localStorage.setItem('presentation_theme', newTheme);
        }
        if (newTheme === 'sketchnote') {
            setPresentationFont('sketchnote');
            setPresentationBgPattern('notebook-dots');
            if (typeof window !== 'undefined') {
                localStorage.setItem('presentation_font_v3', 'sketchnote');
                localStorage.setItem('presentation_font_v2', 'sketchnote');
                localStorage.setItem('presentation_font', 'sketchnote');
                localStorage.setItem('presentation_bg_pattern_v3', 'notebook-dots');
                localStorage.setItem('presentation_bg_pattern_v2', 'notebook-dots');
                localStorage.setItem('presentation_bg_pattern', 'notebook-dots');
            }
        } else if (newTheme === 'game-3d') {
            setPresentationFont('outfit');
            setPresentationBgPattern('aurora');
            if (typeof window !== 'undefined') {
                localStorage.setItem('presentation_font_v3', 'outfit');
                localStorage.setItem('presentation_bg_pattern_v3', 'aurora');
            }
        }
    }, []);

    const cycleTheme = useCallback(() => {
        setPresentationTheme(prev => {
            const themes: ('game-3d' | 'sketchnote' | 'clean-light' | 'cosmic-dark' | 'vibrant-studio')[] = ['game-3d', 'sketchnote', 'clean-light', 'cosmic-dark', 'vibrant-studio'];
            const nextIdx = (themes.indexOf(prev) + 1) % themes.length;
            const next = themes[nextIdx];
            if (typeof window !== 'undefined') {
                localStorage.setItem('presentation_theme_v4', next);
                localStorage.setItem('presentation_theme_v3', next);
                localStorage.setItem('presentation_theme_v2', next);
                localStorage.setItem('presentation_theme', next);
            }
            if (next === 'sketchnote') {
                setPresentationFont('sketchnote');
                setPresentationBgPattern('notebook-dots');
                if (typeof window !== 'undefined') {
                    localStorage.setItem('presentation_font_v3', 'sketchnote');
                    localStorage.setItem('presentation_font_v2', 'sketchnote');
                    localStorage.setItem('presentation_font', 'sketchnote');
                    localStorage.setItem('presentation_bg_pattern_v3', 'notebook-dots');
                    localStorage.setItem('presentation_bg_pattern_v2', 'notebook-dots');
                    localStorage.setItem('presentation_bg_pattern', 'notebook-dots');
                }
            } else if (next === 'game-3d') {
                setPresentationFont('outfit');
                setPresentationBgPattern('aurora');
            }
            return next;
        });
    }, []);

    // 9. Sunum Yazı Tipi (Defter El Yazısı Varsayılan)
    const [presentationFont, setPresentationFont] = useState<'sketchnote' | 'outfit' | 'poppins' | 'jakarta' | 'playfair'>('sketchnote');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedFont = localStorage.getItem('presentation_font_v3') as any;
            if (savedFont && ['sketchnote', 'outfit', 'poppins', 'jakarta', 'playfair'].includes(savedFont)) {
                setPresentationFont(savedFont);
            } else {
                setPresentationFont('sketchnote');
                localStorage.setItem('presentation_font_v3', 'sketchnote');
                localStorage.setItem('presentation_font_v2', 'sketchnote');
                localStorage.setItem('presentation_font', 'sketchnote');
            }
        }
    }, []);

    const handleFontChange = useCallback((newFont: 'sketchnote' | 'outfit' | 'poppins' | 'jakarta' | 'playfair') => {
        setPresentationFont(newFont);
        if (typeof window !== 'undefined') {
            localStorage.setItem('presentation_font_v3', newFont);
            localStorage.setItem('presentation_font_v2', newFont);
            localStorage.setItem('presentation_font', newFont);
        }
    }, []);

    const cycleFont = useCallback(() => {
        setPresentationFont(prev => {
            const fonts: ('sketchnote' | 'playfair' | 'outfit' | 'poppins' | 'jakarta')[] = ['sketchnote', 'playfair', 'outfit', 'poppins', 'jakarta'];
            const nextIdx = (fonts.indexOf(prev) + 1) % fonts.length;
            const next = fonts[nextIdx];
            if (typeof window !== 'undefined') {
                localStorage.setItem('presentation_font_v3', next);
                localStorage.setItem('presentation_font_v2', next);
                localStorage.setItem('presentation_font', next);
            }
            return next;
        });
    }, []);

    // 10. Arka Plan Deseni (Defter Noktaları Varsayılan)
    const [presentationBgPattern, setPresentationBgPattern] = useState<'notebook-dots' | 'spotlight' | 'aurora' | 'matrix' | 'minimal'>('notebook-dots');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedPattern = localStorage.getItem('presentation_bg_pattern_v3') as any;
            if (savedPattern && ['notebook-dots', 'spotlight', 'aurora', 'matrix', 'minimal'].includes(savedPattern)) {
                setPresentationBgPattern(savedPattern);
            } else {
                setPresentationBgPattern('notebook-dots');
                localStorage.setItem('presentation_bg_pattern_v3', 'notebook-dots');
                localStorage.setItem('presentation_bg_pattern_v2', 'notebook-dots');
                localStorage.setItem('presentation_bg_pattern', 'notebook-dots');
            }
        }
    }, []);

    const handleBgPatternChange = useCallback((newPattern: 'notebook-dots' | 'spotlight' | 'aurora' | 'matrix' | 'minimal') => {
        setPresentationBgPattern(newPattern);
        if (typeof window !== 'undefined') {
            localStorage.setItem('presentation_bg_pattern', newPattern);
        }
    }, []);

    const cycleBgPattern = useCallback(() => {
        setPresentationBgPattern(prev => {
            const patterns: ('notebook-dots' | 'spotlight' | 'aurora' | 'matrix' | 'minimal')[] = ['notebook-dots', 'spotlight', 'aurora', 'matrix', 'minimal'];
            const nextIdx = (patterns.indexOf(prev) + 1) % patterns.length;
            const next = patterns[nextIdx];
            if (typeof window !== 'undefined') {
                localStorage.setItem('presentation_bg_pattern', next);
            }
            return next;
        });
    }, []);

    // 11. Üst Menü Görünürlüğü (Varsayılan olarak dikkat dağıtmaması için gizlidir)
    const [isHeaderPinned, setIsHeaderPinned] = useState<boolean>(false);
    const [isHeaderHovered, setIsHeaderHovered] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedPinned = localStorage.getItem('presentation_header_pinned');
            if (savedPinned === 'true') {
                setIsHeaderPinned(true);
            }
        }
    }, []);

    const toggleHeaderPinned = useCallback(() => {
        setIsHeaderPinned(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('presentation_header_pinned', String(next));
            }
            return next;
        });
    }, []);

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
                setIsPickerOpen(prev => {
                    const next = !prev;
                    if (next) {
                        setIsWheelQuickActive(true);
                        if (typeof window !== 'undefined') {
                            sessionStorage.setItem('presentation_wheel_quick_active', 'true');
                        }
                    }
                    return next;
                });
            } else if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                setIsSlideDrawerOpen(prev => !prev);
            } else if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                setIsDrawingOpen(prev => !prev);
            } else if (e.key === 'k' || e.key === 'K') {
                e.preventDefault();
                setIsSourceTextOpen(prev => !prev);
            } else if (e.key === 'q' || e.key === 'Q') {
                e.preventDefault();
                setIsRemoteModalOpen(prev => !prev);
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                cycleTheme();
            } else if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();
                cycleFont();
            } else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                cycleBgPattern();
            } else if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                toggleHeaderPinned();
            } else if (e.key === 'Escape') {
                setIsRemoteModalOpen(false);
                setIsBlackout(false);
                setIsTimerOpen(false);
                setIsPickerOpen(false);
                setIsSlideDrawerOpen(false);
                setIsDrawingOpen(false);
                setIsSourceTextOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cycleTheme, cycleFont, cycleBgPattern, toggleHeaderPinned]);

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
            const targetId = topicId || unitId;
            let contentRef = topicId 
                ? doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId)
                : doc(db, 'courses', courseId, 'units', unitId);

            // 0. Check client cache first if topicId is specified
            if (topicId) {
                // Also fetch sourceText and live Firestore steps in background for cached topics
                getDoc(contentRef).then(snap => {
                    if (snap.exists()) {
                        const data = snap.data();
                        const txt = data?.sourceText || '';
                        setSourceText(txt);
                        setEditableSourceText(txt);

                        if (Array.isArray(data?.steps) && data.steps.length > 0) {
                            const liveSteps = data.steps;
                            setCachedSteps(topicId, liveSteps);
                            let freshFinal = liveSteps;
                            if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                                freshFinal = liveSteps.filter((s: any) => s.isPublished ?? true);
                            }
                            setContent(prev => prev ? { ...prev, steps: freshFinal, title: data.title || prev.title } : { id: topicId, title: data.title || topicName || 'Konu Sunumu', steps: freshFinal });
                            setTotalStepsCount(freshFinal.length);
                        }
                    }
                }).catch(() => {});

                const cached = getCachedSteps(topicId);
                if (cached && cached.length > 0) {
                    let finalSteps = cached;
                    if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                        finalSteps = cached.filter((s: any) => s.isPublished ?? true);
                    }
                    setContent({ id: topicId, title: topicName || 'Konu Sunumu', steps: finalSteps });
                    setTotalStepsCount(finalSteps.length);
                    setIsLoading(false);

                    // Stale-While-Revalidate: Arka planda statik dosyadaki yenilikleri kontrol et (0 Firestore read)
                    setTimeout(async () => {
                        try {
                            const flowRes = await fetch(`/curriculum/flows/${topicId}.json?v=${Date.now()}`, { cache: 'no-cache' });
                            if (flowRes.ok) {
                                const freshSteps = await flowRes.json();
                                if (Array.isArray(freshSteps) && freshSteps.length > 0) {
                                    if (JSON.stringify(freshSteps) !== JSON.stringify(cached)) {
                                        setCachedSteps(topicId, freshSteps);
                                        let freshFinal = freshSteps;
                                        if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                                            freshFinal = freshSteps.filter((s: any) => s.isPublished ?? true);
                                        }
                                        setContent(prev => prev ? { ...prev, steps: freshFinal } : prev);
                                        setTotalStepsCount(freshFinal.length);
                                    }
                                }
                            }
                        } catch (e) {}
                    }, 60);

                    return;
                }
            }

            // 1. STATİK ÖNCELİK: /curriculum/flows/${targetId}.json (0ms, 0 Firestore reads)
            let steps: LessonStep[] = [];
            let loadedTitle = topicName || (topicId ? 'Konu Sunumu' : 'Ünite Sunumu');
            let loadedSourceText = '';

            try {
                const flowRes = await fetch(`/curriculum/flows/${targetId}.json?v=${Date.now()}`, { cache: 'no-cache' });
                if (flowRes.ok) {
                    const staticSteps = await flowRes.json();
                    if (Array.isArray(staticSteps) && staticSteps.length > 0) {
                        steps = staticSteps;
                        if (topicId) setCachedSteps(topicId, steps);
                    }
                }
            } catch (e) {}

            // 2. FIRESTORE FALLBACK (Statik dosya yoksa veya ünite genel akışıysa çalışır)
            if (steps.length === 0) {
                const contentSnap = await getDoc(contentRef);
                if (contentSnap.exists()) {
                    const data = contentSnap.data();
                    loadedSourceText = data.sourceText || '';
                    steps = data.steps || [];
                    if (data.title) loadedTitle = data.title;

                    if (!topicId && steps.length === 0) {
                        const topicsSnapshot = await getDocs(query(collection(db, `courses/${courseId}/units/${unitId}/topics`), orderBy("title")));
                        steps = topicsSnapshot.docs.flatMap(doc => (doc.data().steps || []));
                    }
                    if (topicId && steps.length > 0) {
                        setCachedSteps(topicId, steps);
                    }
                }
            } else {
                // Statik dosya bulunduysa hem sourceText'i hem de güncel Firestore adımlarını arka planda kontrol et (Stale-While-Revalidate)
                getDoc(contentRef).then(snap => {
                    if (snap.exists()) {
                        const data = snap.data();
                        if (data?.sourceText) {
                            const txt = data.sourceText;
                            setSourceText(txt);
                            setEditableSourceText(txt);
                        }
                        if (Array.isArray(data?.steps) && data.steps.length > 0) {
                            const liveSteps = data.steps;
                            if (JSON.stringify(liveSteps) !== JSON.stringify(steps)) {
                                if (topicId) setCachedSteps(topicId, liveSteps);
                                let freshFinal = liveSteps;
                                if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                                    freshFinal = liveSteps.filter((s: any) => s.isPublished ?? true);
                                }
                                setContent(prev => prev ? { ...prev, steps: freshFinal, title: data.title || prev.title } : { id: targetId, title: data.title || loadedTitle, steps: freshFinal });
                                setTotalStepsCount(freshFinal.length);
                            }
                        }
                    }
                }).catch(() => {});
            }

            if (steps.length > 0) {
                let finalSteps = steps;
                if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                    finalSteps = steps.filter((s: any) => s.isPublished ?? true);
                }
                setContent({ id: targetId, title: loadedTitle, steps: finalSteps });
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
            data-presentation-theme={presentationTheme}
            data-presentation-font={presentationFont}
            className={cn(
                "h-screen w-screen overflow-hidden flex flex-col relative select-none transition-colors duration-500",
                presentationFont === 'sketchnote' ? 'font-sketchnote' :
                presentationFont === 'poppins' ? 'font-poppins' :
                presentationFont === 'jakarta' ? 'font-jakarta' :
                presentationFont === 'playfair' ? 'font-playfair' :
                'font-outfit',
                presentationTheme === 'game-3d' && "bg-[#020617] text-white",
                presentationTheme === 'sketchnote' && "bg-[#faf8f3] text-slate-900 theme-sketchnote",
                presentationTheme === 'cosmic-dark' && "bg-[#050811] text-slate-100",
                presentationTheme === 'vibrant-studio' && "bg-[#070614] text-white",
                presentationTheme === 'clean-light' && "bg-[#edf1f7] text-slate-950",
                "presentation-mode",
                (isPerfMode || animationSpeed === 'off') && "perf-mode"
            )}
        >
            {/* ═══ 3D OYUN DÜNYASI SAHNELERİ & PARILTILI İSLAMİ MOTİFLER ═══ */}
            {presentationTheme === 'game-3d' && (
                <PresentationSceneBackground stepIndex={currentStepIndex} />
            )}

            {/* ═══ 0. RENKLİ DEFTER KAĞIDI NOKTALI TABAN (SKETCHNOTE NOTEBOOK GRID) ═══ */}
            {(presentationTheme === 'sketchnote' || presentationBgPattern === 'notebook-dots') && presentationTheme !== 'game-3d' && (
                <div 
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                        backgroundColor: '#faf8f3',
                        backgroundImage: 'radial-gradient(#cbd5e1 1.25px, transparent 1.25px)',
                        backgroundSize: '24px 24px'
                    }}
                />
            )}

            {/* ═══ 1. DERİN SAHNE TABANI (BASE AMBIENT STAGE GRADIENT) ═══ */}
            {presentationTheme !== 'sketchnote' && presentationTheme !== 'game-3d' && (
                <div 
                    className={cn(
                        "absolute inset-0 pointer-events-none z-0 transition-opacity duration-700",
                        presentationTheme === 'cosmic-dark' && "bg-[radial-gradient(ellipse_100%_80%_at_50%_-10%,#111830_0%,#070b15_55%,#03050a_100%)]",
                        presentationTheme === 'vibrant-studio' && "bg-[radial-gradient(ellipse_100%_80%_at_50%_-10%,#1b123c_0%,#0c1229_55%,#050713_100%)]",
                        presentationTheme === 'clean-light' && "bg-[radial-gradient(ellipse_100%_75%_at_50%_-10%,#e6ecf5_0%,#edf1f7_55%,#e4eaf2_100%)]"
                    )} 
                />
            )}

            {/* ═══ 2. SAHNE TEPE SPOT IŞIĞI (KEYNOTE OVERHEAD STAGE SPOTLIGHT) ═══ */}
            {presentationBgPattern !== 'minimal' && (
                <div 
                    className={cn(
                        "absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] max-w-[1700px] h-[50vh] pointer-events-none z-0 transition-opacity duration-700",
                        presentationTheme === 'cosmic-dark' && "bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(99,102,241,0.16),rgba(147,51,234,0.06)_45%,transparent_75%)]",
                        presentationTheme === 'vibrant-studio' && "bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(168,85,247,0.22),rgba(6,182,212,0.1)_45%,transparent_75%)]",
                        presentationTheme === 'clean-light' && "bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(99,102,241,0.09),transparent_70%)]"
                    )} 
                />
            )}

            {/* ═══ 3. SADE & SAKİN ORTAM IŞIĞI (GPU DOSTU STATİK PARILTI) ═══ */}
            {presentationTheme !== 'sketchnote' && presentationTheme !== 'game-3d' && presentationBgPattern === 'aurora' && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className={cn(
                        "absolute -top-[18%] -left-[10%] w-[55vw] h-[55vw] rounded-full blur-[120px] opacity-60",
                        presentationTheme === 'clean-light' ? "bg-indigo-200/35" :
                        presentationTheme === 'vibrant-studio' ? "bg-indigo-600/25" :
                        "bg-indigo-600/18"
                    )} />
                    <div className={cn(
                        "absolute -bottom-[20%] right-[5%] w-[55vw] h-[55vw] rounded-full blur-[130px] opacity-55",
                        presentationTheme === 'clean-light' ? "bg-sky-200/35" :
                        presentationTheme === 'vibrant-studio' ? "bg-fuchsia-600/20" :
                        "bg-purple-600/16"
                    )} />
                </div>
            )}
            
            {/* ═══ 5. MASKELİ NOKTALI IZGARA (KEYNOTE DOT MATRIX GRID) ═══ */}
            {presentationBgPattern !== 'minimal' && (
                <div 
                    className={cn(
                        "absolute inset-0 pointer-events-none z-0 transition-opacity duration-500",
                        presentationTheme === 'clean-light'
                            ? "bg-[radial-gradient(rgba(99,102,241,0.16)_1.2px,transparent_1.2px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_40%,black_35%,transparent_90%)]"
                            : "bg-[radial-gradient(rgba(255,255,255,0.09)_1.2px,transparent_1.2px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_40%,black_35%,transparent_85%)]"
                    )} 
                />
            )}

            {/* ═══ 6. SİNEMATİK KENAR KARARTMASI (CINEMATIC VIGNETTE) ═══ */}
            <div 
                className={cn(
                    "absolute inset-0 pointer-events-none z-0 transition-opacity duration-700",
                    presentationTheme === 'clean-light'
                        ? "bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(148,163,184,0.2)_100%)]"
                        : "bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(2,4,8,0.72)_100%)]"
                )} 
            />

            {/* ═══ ÜST TETİKLEYİCİ BÖLGE (HEADER HOVER SENSOR & DISCREET HANDLE) ═══ */}
            {!isHeaderPinned && (
                <div 
                    onMouseEnter={() => setIsHeaderHovered(true)}
                    className="fixed top-0 left-0 right-0 h-4 z-40 group flex items-start justify-center cursor-pointer pointer-events-auto"
                    title="Üst Menüyü Göster (H)"
                >
                    <div className="w-16 h-1 rounded-full bg-white/20 group-hover:bg-indigo-400 group-hover:h-1.5 transition-all duration-200 mt-0.5 shadow-sm opacity-30 group-hover:opacity-100" />
                </div>
            )}

            {/* ══ 3D OYUN DÜNYASI: AHŞAP VE ALTIN ASMA TABELA ══ */}
            {presentationTheme === 'game-3d' ? (
                <div 
                    onMouseEnter={() => setIsHeaderHovered(true)}
                    onMouseLeave={() => setIsHeaderHovered(false)}
                    className={cn(
                        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-auto",
                        (isHeaderPinned || isHeaderHovered)
                            ? "translate-y-0 opacity-100 pointer-events-auto"
                            : "-translate-y-full opacity-0 pointer-events-none"
                    )}
                >
                    <PresentationWoodenHeader
                        title={(content as any)?.steps?.[currentStepIndex]?.title || content?.title || 'Ders Sunumu'}
                        subtitle={unitName || (content as any)?.title || 'İlim ve İbadet Dünyası'}
                        score={250 + currentStepIndex * 50}
                        currentStep={currentStepIndex}
                        totalSteps={totalStepsCount || (content as any)?.steps?.length || 1}
                        elapsedTime={timerSeconds}
                        isFullscreen={isFullscreen}
                        isMuted={!isSoundEnabled}
                        isHeaderPinned={isHeaderPinned}
                        onTogglePin={toggleHeaderPinned}
                        onHide={() => {
                            setIsHeaderPinned(false);
                            setIsHeaderHovered(false);
                        }}
                        onToggleFullscreen={() => {
                            if (typeof document !== 'undefined') {
                                if (!document.fullscreenElement) {
                                    document.documentElement.requestFullscreen().catch(() => {});
                                } else {
                                    document.exitFullscreen().catch(() => {});
                                }
                            }
                        }}
                        onToggleMute={() => setIsSoundEnabled(prev => !prev)}
                        onOpenTools={() => setIsToolsOpen(prev => !prev)}
                        onOpenWheel={handleOpenWheel}
                        showWheelButton={isWheelQuickActive}
                        onExit={handleExit}
                    />
                </div>
            ) : (
                /* ══ SADELEŞTİRİLMİŞ ÖĞRETMEN ÜST KONTROL ÇUBUĞU ══ */
                <header 
                    onMouseEnter={() => setIsHeaderHovered(true)}
                    onMouseLeave={() => setIsHeaderHovered(false)}
                    className={cn(
                    "fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 px-3 sm:px-6 py-2 transition-all duration-300 shadow-lg",
                    presentationTheme === 'cosmic-dark' 
                        ? "bg-slate-950/92 backdrop-blur-2xl border-b border-white/10 text-white shadow-black/80"
                        : presentationTheme === 'vibrant-studio'
                            ? "bg-[#0b1329]/95 backdrop-blur-2xl border-b border-indigo-500/25 text-white shadow-indigo-950/50"
                            : presentationTheme === 'sketchnote'
                                ? "bg-[#fffdf7]/95 backdrop-blur-xl border-b-2 border-[#1e293b]/15 text-[#1e293b] shadow-amber-900/5"
                                : "bg-white/95 backdrop-blur-2xl border-b border-slate-200/90 text-slate-900 shadow-slate-200/50",
                    (isHeaderPinned || isHeaderHovered) 
                        ? "translate-y-0 opacity-100 pointer-events-auto" 
                        : "-translate-y-full opacity-0 pointer-events-none"
                )}
            >
                    {/* SOL: Konu Başlığı & Breadcrumb */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className={cn(
                            "p-2 rounded-xl border shadow-xs transition-colors shrink-0",
                            presentationTheme === 'sketchnote'
                                ? "bg-[#fefce8] border-[#eab308] text-[#854d0e]"
                                : presentationTheme === 'clean-light'
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    : "bg-white/10 border-white/15 text-indigo-300"
                        )}>
                            <Presentation className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs md:text-sm font-bold min-w-0">
                            <span className={cn(
                                "truncate max-w-[110px] md:max-w-[170px] hidden lg:inline font-semibold",
                                (presentationTheme === 'clean-light' || presentationTheme === 'sketchnote') ? "text-slate-500" : "text-slate-400"
                            )}>{unitName || courseName || 'Ders'}</span>
                            <ChevronRight className="h-3.5 w-3.5 opacity-40 hidden lg:inline shrink-0" />
                            <span className={cn(
                                "font-black truncate max-w-[150px] sm:max-w-[260px] md:max-w-[360px]",
                                presentationTheme === 'sketchnote'
                                    ? "text-slate-900 font-['Caveat',cursive] text-xl md:text-2xl"
                                    : presentationTheme === 'clean-light'
                                        ? "text-slate-900"
                                        : "text-white"
                            )}>{content.title}</span>
                            {presentationTheme === 'sketchnote' && (
                                <span className="hidden xl:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e0f2fe] text-[#0369a1] border border-[#0284c7] font-bold text-[11px] shrink-0">
                                    🕌 Atölye Defteri
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ORTA: A-/A+ Punto, Görünüm Popover (Tema+Font+Desen), Saat & Slaytlar */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                        {/* Hızlı A- / A+ Punto Kontrolü */}
                        <div className={cn(
                            "flex items-center p-0.5 rounded-xl border text-xs font-black",
                            (presentationTheme === 'clean-light' || presentationTheme === 'sketchnote')
                                ? "bg-slate-100 border-slate-300 text-slate-800"
                                : "bg-white/10 border-white/15 text-white"
                        )}>
                            <button
                                type="button"
                                onClick={decreaseFontSize}
                                disabled={getCurrentScaleIndex() === 0}
                                className="px-2 py-1 rounded-lg hover:bg-black/10 disabled:opacity-30 cursor-pointer"
                                title="Yazıyı Küçült (-)"
                            >
                                A-
                            </button>
                            <span className="px-1.5 text-[10px] font-mono opacity-80 hidden md:inline">
                                {FONT_SIZE_LEVELS[getCurrentScaleIndex()]?.percent}
                            </span>
                            <button
                                type="button"
                                onClick={increaseFontSize}
                                disabled={getCurrentScaleIndex() === FONT_SIZE_LEVELS.length - 1}
                                className="px-2 py-1 rounded-lg hover:bg-black/10 disabled:opacity-30 cursor-pointer"
                                title="Yazıyı Büyüt (+)"
                            >
                                A+
                            </button>
                        </div>

                        {/* 🎨 Görünüm Menüsü (Tema + Font + Desen Tek Popover'da) */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer",
                                        (presentationTheme === 'clean-light' || presentationTheme === 'sketchnote')
                                            ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs"
                                            : "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                                    )}
                                    title="Tema, Yazı Tipi ve Arka Planı Özelleştir"
                                >
                                    <Palette className="w-3.5 h-3.5 text-indigo-500" />
                                    <span className="hidden sm:inline">Görünüm</span>
                                    <ChevronDown className="w-3 h-3 opacity-60" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="center"
                                className={cn(
                                    "w-[340px] sm:w-[400px] p-4 rounded-2xl border shadow-2xl space-y-4 z-[90]",
                                    (presentationTheme === 'clean-light' || presentationTheme === 'sketchnote')
                                        ? "bg-white border-slate-200 text-slate-900"
                                        : "bg-slate-950 border-white/15 text-white"
                                )}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider opacity-70">
                                        <span>Sunum Teması (M)</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {[
                                            { id: 'game-3d', label: '3D Oyun', icon: '🎮' },
                                            { id: 'sketchnote', label: 'Defter', icon: '📒' },
                                            { id: 'clean-light', label: 'Aydınlık', icon: '☀️' },
                                            { id: 'cosmic-dark', label: 'Kozmik', icon: '🌙' },
                                            { id: 'vibrant-studio', label: 'Canlı', icon: '⚡' },
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => handleThemeChange(t.id as any)}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer",
                                                    presentationTheme === t.id
                                                        ? "border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500 font-black"
                                                        : "border-slate-500/20 hover:bg-slate-500/10"
                                                )}
                                            >
                                                <span className="text-base mb-0.5">{t.icon}</span>
                                                <span className="truncate w-full text-center text-[10px]">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-500/20">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider opacity-70">
                                        <span>Yazı Tipi (O)</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {[
                                            { id: 'sketchnote', label: 'El Yazısı' },
                                            { id: 'outfit', label: 'Outfit' },
                                            { id: 'poppins', label: 'Poppins' },
                                            { id: 'jakarta', label: 'Jakarta' },
                                            { id: 'playfair', label: 'Serif' },
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => handleFontChange(f.id as any)}
                                                className={cn(
                                                    "py-1.5 px-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer truncate",
                                                    presentationFont === f.id
                                                        ? "border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500 font-black"
                                                        : "border-slate-500/20 hover:bg-slate-500/10"
                                                )}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-500/20">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider opacity-70">
                                        <span>Arka Plan Deseni (P)</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[
                                            { id: 'notebook-dots', label: 'Noktalı' },
                                            { id: 'spotlight', label: 'Spot' },
                                            { id: 'aurora', label: 'Aurora' },
                                            { id: 'minimal', label: 'Sade' },
                                        ].map(bg => (
                                            <button
                                                key={bg.id}
                                                type="button"
                                                onClick={() => handleBgPatternChange(bg.id as any)}
                                                className={cn(
                                                    "py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer",
                                                    presentationBgPattern === bg.id
                                                        ? "border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500 font-black"
                                                        : "border-slate-500/20 hover:bg-slate-500/10"
                                                )}
                                            >
                                                {bg.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Saat */}
                        <div className={cn(
                            "hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold",
                            (presentationTheme === 'clean-light' || presentationTheme === 'sketchnote')
                                ? "bg-slate-100 border-slate-200 text-slate-700"
                                : "bg-white/5 border-white/10 text-slate-300"
                        )}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{currentTime}</span>
                        </div>

                        {totalStepsCount > 0 && (
                            <button 
                                onClick={() => setIsSlideDrawerOpen(true)}
                                className={cn(
                                    "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer border",
                                    (presentationTheme === 'clean-light' || presentationTheme === 'sketchnote')
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100"
                                        : "bg-indigo-500/20 border-indigo-400/35 text-indigo-200 hover:bg-indigo-500/30"
                                )}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>{currentStepIndex + 1} / {totalStepsCount}</span>
                            </button>
                        )}
                    </div>

                    {/* SAĞ: Sayaç & Çizim & Kumanda & Çıkış */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Canlı sayaç çalışıyorsa göster */}
                        {isTimerRunning && (
                            <button
                                onClick={() => setIsTimerOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/40 text-xs font-mono font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
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
                                "h-9 px-2.5 sm:px-3 rounded-xl font-bold text-xs gap-1.5 transition-all border cursor-pointer",
                                isDrawingOpen 
                                    ? "bg-cyan-500/25 text-cyan-600 border-cyan-500/60" 
                                    : ((presentationTheme === 'clean-light' || presentationTheme === 'sketchnote')
                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                                        : "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10")
                            )}
                            title="Canlı Çizim & Not Alma (D)"
                        >
                            <Pencil className="w-3.5 h-3.5 text-cyan-500" />
                            <span className="hidden md:inline">Çizim (D)</span>
                        </Button>

                        {/* Hızlı Mobil Kumanda Butonu (Q) */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsRemoteModalOpen(prev => !prev)}
                            className={cn(
                                "h-9 px-2.5 sm:px-3 rounded-xl font-bold text-xs gap-1.5 transition-all border cursor-pointer",
                                isRemoteModalOpen 
                                    ? "bg-indigo-500/25 text-indigo-600 border-indigo-500/60" 
                                    : ((presentationTheme === 'clean-light' || presentationTheme === 'sketchnote')
                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                                        : "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10")
                            )}
                            title="Telefondan Yönet (Q)"
                        >
                            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="hidden md:inline">Kumanda (Q)</span>
                        </Button>

                        {/* Çıkış Butonu */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleExit}
                            className={cn(
                                "h-9 px-3 rounded-xl font-extrabold text-xs gap-1.5 transition-all border cursor-pointer active:scale-95",
                                (presentationTheme === 'clean-light' || presentationTheme === 'sketchnote')
                                    ? "bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border-rose-200"
                                    : "bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border-rose-500/30"
                            )}
                            title="Ders Akışından Çıkış Yap"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Çıkış</span>
                        </Button>

                        {/* Sabitle / Otomatik Gizle Butonu (H) */}
                        <button
                            onClick={toggleHeaderPinned}
                            className={cn(
                                "h-9 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer",
                                isHeaderPinned
                                    ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                                    : ((presentationTheme === 'clean-light' || presentationTheme === 'sketchnote')
                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" 
                                        : "bg-white/10 hover:bg-white/15 text-slate-300 border-white/15")
                            )}
                            title={isHeaderPinned ? "Üst Menü Sabitlendi (H)" : "Üst Menüyü Sabitle (H)"}
                        >
                            {isHeaderPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5 opacity-70" />}
                        </button>

                        {/* Gizle (Kapat) Butonu */}
                        <button
                            onClick={() => {
                                setIsHeaderPinned(false);
                                setIsHeaderHovered(false);
                                if (typeof window !== 'undefined') localStorage.setItem('presentation_header_pinned', 'false');
                            }}
                            className={cn(
                                "h-9 w-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer",
                                (presentationTheme === 'clean-light' || presentationTheme === 'sketchnote')
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                                    : "bg-white/10 hover:bg-white/15 text-slate-300 border-white/15"
                            )}
                            title="Üst Menüyü Gizle (H)"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    </div>
                </header>
            )}

            {/* ══ İÇERİK ALANI: LessonContentViewer ══ */}
            <div className={cn(
                "flex-grow flex flex-col min-h-0 relative z-10 w-full h-full transition-all duration-300",
                presentationTheme === 'game-3d' && isHeaderPinned ? "pt-11 sm:pt-13" : ""
            )}>
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
                    onOpenWheel={handleOpenWheel}
                    showWheelButton={isWheelQuickActive}
                    onCloseWheelButton={handleDismissWheelQuick}
                    isTeacherMode={true}
                    isPerfMode={isPerfMode}
                    presentationTheme={presentationTheme}
                    presentationFont={presentationFont}
                    isAutoReadEnabled={isAutoReadEnabled}
                />
            </div>

            {/* ══ SUNUM ARAÇLARI & AYARLAR PANELİ (ALT MENÜDEKİ 'ARAÇLAR' BUTONUNDAN AÇILIR) ══ */}
            <AnimatePresence>
                {isToolsOpen && (() => {
                    const isLightUi = presentationTheme === 'clean-light' || presentationTheme === 'sketchnote';
                    const sectionDivider = cn("space-y-2 pt-2 border-t", isLightUi ? "border-slate-200" : "border-white/10");
                    const optionIdle = isLightUi
                        ? "border-slate-200 bg-slate-100/70 text-slate-700 hover:border-slate-300"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25";
                    const labelTone = isLightUi ? "text-slate-800" : "text-white";
                    const mutedTone = isLightUi ? "text-slate-500" : "text-slate-400";

                    return (
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
                            className={cn(
                                "w-full max-w-md p-0 rounded-3xl border-2 shadow-2xl backdrop-blur-3xl overflow-hidden mb-16 sm:mb-0",
                                isLightUi
                                    ? "border-indigo-200 bg-white/95 text-slate-900"
                                    : "border-white/15 bg-slate-950/95 text-white"
                            )}
                        >
                            {/* Menü Başlığı */}
                            <div className={cn(
                                "p-3.5 px-4 border-b flex items-center justify-between",
                                isLightUi
                                    ? "border-slate-200 bg-slate-50"
                                    : "border-white/10 bg-white/5"
                            )}>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-500" />
                                    <h4 className="font-extrabold text-xs uppercase tracking-wider">
                                        Sunum Araçları & Ayarlar
                                    </h4>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setIsSoundEnabled(prev => !prev)}
                                        className={cn("h-7 w-7 rounded-lg text-slate-500 cursor-pointer", isLightUi ? "hover:text-slate-800" : "hover:text-white")}
                                        title={isSoundEnabled ? "Ses Efektleri Açık" : "Ses Efektleri Kapalı"}
                                    >
                                        {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setIsToolsOpen(false)}
                                        className={cn("h-7 w-7 rounded-lg text-slate-500 cursor-pointer", isLightUi ? "hover:text-slate-800" : "hover:text-white")}
                                        title="Kapat"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                                {/* 1. Sınıf Araçları Izgara */}
                                <div className="space-y-1.5">
                                    <span className={cn("text-[11px] font-bold uppercase tracking-wider", mutedTone)}>Tahta Araçları</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => { setIsRemoteModalOpen(true); setIsToolsOpen(false); }}
                                            className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all text-left group cursor-pointer", isLightUi ? "text-indigo-700" : "text-indigo-300")}
                                        >
                                            <div className="p-2 rounded-lg bg-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                <Smartphone className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs flex items-center gap-1">
                                                    Mobil Kumanda (Q)
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                </span>
                                                <span className="text-[10px] opacity-75">QR ile telefondan yönet</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setIsDrawingOpen(true); setIsToolsOpen(false); }}
                                            className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all text-left group cursor-pointer", isLightUi ? "text-cyan-700" : "text-cyan-400")}
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
                                            className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-left group cursor-pointer", isLightUi ? "text-amber-700" : "text-amber-400")}
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
                                            onClick={() => { handleOpenWheel(); setIsToolsOpen(false); }}
                                            className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/20 transition-all text-left group cursor-pointer", isLightUi ? "text-sky-700" : "text-sky-400")}
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
                                            className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 transition-all text-left group cursor-pointer", isLightUi ? "text-purple-700" : "text-purple-400")}
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
                                            onClick={() => { setIsSourceTextOpen(true); setIsToolsOpen(false); }}
                                            className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border border-teal-500/20 bg-teal-500/10 hover:bg-teal-500/20 transition-all text-left group cursor-pointer", isLightUi ? "text-teal-700" : "text-teal-400")}
                                        >
                                            <div className="p-2 rounded-lg bg-teal-500/20 group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors">
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs">Kaynak Metin (K)</span>
                                                <span className="text-[10px] opacity-75">Ders Notu & Özet</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setIsBlackout(true); setIsToolsOpen(false); }}
                                            className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 transition-all text-left group cursor-pointer", isLightUi ? "text-rose-700" : "text-rose-400")}
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
                                <div className={sectionDivider}>
                                    <div className="flex items-center justify-between">
                                        <span className={cn("text-[11px] font-bold uppercase tracking-wider", mutedTone)}>Yazı & Kart Boyutu</span>
                                        <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20", isLightUi ? "text-indigo-700" : "text-indigo-300")}>
                                            {FONT_SIZE_LEVELS[getCurrentScaleIndex()]?.badge} ({FONT_SIZE_LEVELS[getCurrentScaleIndex()]?.percent})
                                        </span>
                                    </div>

                                    {/* Adım Adım Stepper (+ / -) */}
                                    <div className={cn("flex items-center justify-between gap-2 p-1.5 rounded-2xl border", isLightUi ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10")}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={getCurrentScaleIndex() === 0}
                                            onClick={decreaseFontSize}
                                            className={cn("h-8 w-8 p-0 rounded-xl shadow-xs disabled:opacity-30 flex items-center justify-center cursor-pointer", isLightUi ? "bg-white hover:bg-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/20 text-white")}
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
                                                                    : (isLightUi ? "w-2.5 bg-slate-300 hover:bg-slate-400" : "w-2.5 bg-white/20 hover:bg-white/35")
                                                        )}
                                                        title={lvl.label}
                                                    />
                                                ))}
                                            </div>
                                            <span className={cn("text-[11px] font-black", labelTone)}>
                                                {FONT_SIZE_LEVELS[getCurrentScaleIndex()]?.label}
                                            </span>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={getCurrentScaleIndex() === FONT_SIZE_LEVELS.length - 1}
                                            onClick={increaseFontSize}
                                            className={cn("h-8 w-8 p-0 rounded-xl shadow-xs disabled:opacity-30 flex items-center justify-center cursor-pointer", isLightUi ? "bg-white hover:bg-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/20 text-white")}
                                            title="Bir Adım Büyüt (+)"
                                        >
                                            <Plus className="w-4 h-4 stroke-[3]" />
                                        </Button>
                                    </div>

                                    {/* Hızlı Boyut Butonları (5 Kademe) */}
                                    <div className={cn("grid grid-cols-5 gap-1 p-1 rounded-xl border", isLightUi ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10")}>
                                        {FONT_SIZE_LEVELS.map((lvl) => {
                                            const isActive = (fontSizeScale === lvl.key) || (fontSizeScale === 'normal' && lvl.key === 'md') || (fontSizeScale === 'huge' && lvl.key === 'xl');
                                            return (
                                                <button
                                                    key={lvl.key}
                                                    onClick={() => setFontSizeScale(lvl.key)}
                                                    className={cn(
                                                        "py-1 rounded-lg text-[10px] font-bold transition-all truncate px-0.5 text-center cursor-pointer",
                                                        isActive
                                                            ? "bg-indigo-600 text-white shadow-xs font-black"
                                                            : (isLightUi ? "text-slate-600 hover:bg-slate-200/60" : "text-slate-300 hover:bg-white/10")
                                                    )}
                                                    title={lvl.label}
                                                >
                                                    {lvl.short}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 3. Sunum Atmosferi & Teması */}
                                <div className={sectionDivider}>
                                    <div className="flex items-center justify-between">
                                        <span className={cn("text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5", mutedTone)}>
                                            <Palette className="w-3.5 h-3.5 text-indigo-500" />
                                            Sunum Atmosferi (M)
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400">Kısayol: M</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                        <button
                                            onClick={() => handleThemeChange('game-3d')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationTheme === 'game-3d'
                                                    ? "border-amber-400 bg-amber-500/25 text-amber-300 shadow-lg shadow-amber-500/30 font-black ring-2 ring-amber-400/50"
                                                    : optionIdle
                                            )}
                                        >
                                            <span className="text-xl mb-0.5">🎮</span>
                                            <span className="text-xs font-black leading-tight text-amber-400">3D Oyun</span>
                                            <span className="text-[9px] opacity-80">Sahne & Maskot</span>
                                        </button>

                                        <button
                                            onClick={() => handleThemeChange('sketchnote')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationTheme === 'sketchnote'
                                                    ? cn("border-amber-500 bg-amber-500/20 shadow-md shadow-amber-500/20 font-black", isLightUi ? "text-amber-800" : "text-amber-200")
                                                    : optionIdle
                                            )}
                                        >
                                            <Sparkles className="w-4 h-4 mb-1 text-amber-500" />
                                            <span className="text-xs font-bold leading-tight font-['Patrick_Hand']">Defter</span>
                                            <span className="text-[9px] opacity-70">Sketchnote & Fosfor</span>
                                        </button>

                                        <button
                                            onClick={() => handleThemeChange('clean-light')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationTheme === 'clean-light'
                                                    ? cn("border-amber-500 bg-amber-500/15 shadow-md shadow-amber-500/20 font-black", isLightUi ? "text-amber-700" : "text-amber-300")
                                                    : optionIdle
                                            )}
                                        >
                                            <Sun className="w-4 h-4 mb-1 text-amber-500" />
                                            <span className="text-xs font-bold leading-tight">Aydınlık</span>
                                            <span className="text-[9px] opacity-70">Akıllı Tahta</span>
                                        </button>

                                        <button
                                            onClick={() => handleThemeChange('cosmic-dark')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationTheme === 'cosmic-dark'
                                                    ? cn("border-indigo-500 bg-indigo-500/20 shadow-md shadow-indigo-500/20 font-black", isLightUi ? "text-indigo-700" : "text-white")
                                                    : optionIdle
                                            )}
                                        >
                                            <Moon className="w-4 h-4 mb-1 text-indigo-400" />
                                            <span className="text-xs font-bold leading-tight">Kozmik</span>
                                            <span className="text-[9px] opacity-70">Keynote</span>
                                        </button>

                                        <button
                                            onClick={() => handleThemeChange('vibrant-studio')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationTheme === 'vibrant-studio'
                                                    ? cn("border-purple-500 bg-purple-500/20 shadow-md shadow-purple-500/20 font-black", isLightUi ? "text-purple-700" : "text-white")
                                                    : optionIdle
                                            )}
                                        >
                                            <Zap className="w-4 h-4 mb-1 text-amber-400" />
                                            <span className="text-xs font-bold leading-tight">Canlı</span>
                                            <span className="text-[9px] opacity-70">Neon Stüdyo</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 3.5. Yazı Tipi & Tipografi Stili (Font) */}
                                <div className={sectionDivider}>
                                    <div className="flex items-center justify-between">
                                        <span className={cn("text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5", mutedTone)}>
                                            <Type className="w-3.5 h-3.5 text-indigo-500" />
                                            Yazı Tipi & Tipografi (O)
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400">Kısayol: O</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                        <button
                                            onClick={() => handleFontChange('sketchnote')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationFont === 'sketchnote'
                                                    ? cn("border-amber-500 bg-amber-500/20 shadow-md shadow-amber-500/20 font-black", isLightUi ? "text-amber-800" : "text-amber-200")
                                                    : optionIdle
                                            )}
                                        >
                                            <span className="text-base font-black font-['Caveat',cursive] mb-0.5">Aa</span>
                                            <span className="text-xs font-bold leading-tight font-['Patrick_Hand']">El Yazısı</span>
                                            <span className="text-[9px] opacity-70">Caveat Defter</span>
                                        </button>

                                        <button
                                            onClick={() => handleFontChange('outfit')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationFont === 'outfit'
                                                    ? cn("border-indigo-500 bg-indigo-500/20 shadow-md shadow-indigo-500/20 font-black", isLightUi ? "text-indigo-700" : "text-white")
                                                    : optionIdle
                                            )}
                                        >
                                            <span className="text-base font-black font-outfit mb-0.5">Aa</span>
                                            <span className="text-xs font-bold leading-tight font-outfit">Outfit</span>
                                            <span className="text-[9px] opacity-70">Keynote Modern</span>
                                        </button>

                                        <button
                                            onClick={() => handleFontChange('poppins')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationFont === 'poppins'
                                                    ? cn("border-purple-500 bg-purple-500/20 shadow-md shadow-purple-500/20 font-black", isLightUi ? "text-purple-700" : "text-white")
                                                    : optionIdle
                                            )}
                                        >
                                            <span className="text-base font-black font-poppins mb-0.5">Aa</span>
                                            <span className="text-xs font-bold leading-tight font-poppins">Poppins</span>
                                            <span className="text-[9px] opacity-70">Yuvarlak & Samimi</span>
                                        </button>

                                        <button
                                            onClick={() => handleFontChange('jakarta')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationFont === 'jakarta'
                                                    ? cn("border-cyan-500 bg-cyan-500/20 shadow-md shadow-cyan-500/20 font-black", isLightUi ? "text-cyan-700" : "text-white")
                                                    : optionIdle
                                            )}
                                        >
                                            <span className="text-base font-black font-jakarta mb-0.5">Aa</span>
                                            <span className="text-xs font-bold leading-tight font-jakarta">Plus Jakarta</span>
                                            <span className="text-[9px] opacity-70">Keskin Stüdyo</span>
                                        </button>

                                        <button
                                            onClick={() => handleFontChange('playfair')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationFont === 'playfair'
                                                    ? cn("border-amber-500 bg-amber-500/20 shadow-md shadow-amber-500/20 font-black", isLightUi ? "text-amber-700" : "text-amber-300")
                                                    : optionIdle
                                            )}
                                        >
                                            <span className="text-base font-black font-playfair mb-0.5 italic">Aa</span>
                                            <span className="text-xs font-bold leading-tight font-playfair">Playfair</span>
                                            <span className="text-[9px] opacity-70">Zarif Serif</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 3.6. Arka Plan Işıltısı & Deseni (P) */}
                                <div className={sectionDivider}>
                                    <div className="flex items-center justify-between">
                                        <span className={cn("text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5", mutedTone)}>
                                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                            Arka Plan Işıltısı (P)
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400">Kısayol: P</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                        <button
                                            onClick={() => handleBgPatternChange('notebook-dots')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationBgPattern === 'notebook-dots'
                                                    ? cn("border-amber-500 bg-amber-500/20 shadow-md shadow-amber-500/20 font-black", isLightUi ? "text-amber-800" : "text-white")
                                                    : optionIdle
                                            )}
                                        >
                                            <BookOpen className="w-4 h-4 mb-1 text-amber-500" />
                                            <span className="text-xs font-bold leading-tight">Defter</span>
                                            <span className="text-[9px] opacity-70">Noktalı Sayfa</span>
                                        </button>
                                        <button
                                            onClick={() => handleBgPatternChange('spotlight')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationBgPattern === 'spotlight'
                                                    ? cn("border-indigo-500 bg-indigo-500/20 shadow-md shadow-indigo-500/20 font-black", isLightUi ? "text-indigo-700" : "text-white")
                                                    : optionIdle
                                            )}
                                        >
                                            <Sparkles className="w-4 h-4 mb-1 text-indigo-400" />
                                            <span className="text-xs font-bold leading-tight">Sahne Spotu</span>
                                            <span className="text-[9px] opacity-70">Keynote Tepe</span>
                                        </button>

                                        <button
                                            onClick={() => handleBgPatternChange('aurora')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationBgPattern === 'aurora'
                                                    ? cn("border-purple-500 bg-purple-500/20 shadow-md shadow-purple-500/20 font-black", isLightUi ? "text-purple-700" : "text-white")
                                                    : optionIdle
                                            )}
                                        >
                                            <Zap className="w-4 h-4 mb-1 text-purple-400" />
                                            <span className="text-xs font-bold leading-tight">Aurora</span>
                                            <span className="text-[9px] opacity-70">Kuzey Işıkları</span>
                                        </button>

                                        <button
                                            onClick={() => handleBgPatternChange('matrix')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationBgPattern === 'matrix'
                                                    ? cn("border-cyan-500 bg-cyan-500/20 shadow-md shadow-cyan-500/20 font-black", isLightUi ? "text-cyan-700" : "text-white")
                                                    : optionIdle
                                            )}
                                        >
                                            <LayoutGrid className="w-4 h-4 mb-1 text-cyan-400" />
                                            <span className="text-xs font-bold leading-tight">Izgara</span>
                                            <span className="text-[9px] opacity-70">Noktalı Matrix</span>
                                        </button>

                                        <button
                                            onClick={() => handleBgPatternChange('minimal')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                presentationBgPattern === 'minimal'
                                                    ? cn("border-slate-500 bg-slate-500/20 shadow-md font-black", isLightUi ? "text-slate-800" : "text-white")
                                                    : optionIdle
                                            )}
                                        >
                                            <Moon className="w-4 h-4 mb-1 text-slate-400" />
                                            <span className="text-xs font-bold leading-tight">Sade</span>
                                            <span className="text-[9px] opacity-70">Minimal Mat</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 4. Sunum Ayarları */}
                                <div className={cn("space-y-3 pt-1 border-t", isLightUi ? "border-slate-200" : "border-white/10")}>
                                    <span className={cn("text-[11px] font-bold uppercase tracking-wider", mutedTone)}>Görünüm & Efektler</span>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <Label className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                <Pin className="w-3.5 h-3.5 text-indigo-500" />
                                                Üst Menü Çubuğunu Sabitle
                                            </Label>
                                            <span className={cn("text-[10px]", mutedTone)}>Ders esnasında dikkat dağıtmaması için varsayılan olarak gizlidir (H).</span>
                                        </div>
                                        <Switch checked={isHeaderPinned} onCheckedChange={toggleHeaderPinned} />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <Label className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                <Volume2 className="w-3.5 h-3.5 text-violet-500" />
                                                Kart Açılınca Otomatik Oku
                                            </Label>
                                            <span className={cn("text-[10px]", mutedTone)}>Yeni cümle kartı açıldığında sesli okumayı otomatik başlatır (varsayılan kapalı).</span>
                                        </div>
                                        <Switch checked={isAutoReadEnabled} onCheckedChange={toggleAutoRead} />
                                    </div>

                                    {/* Sesli Okuma Ses Motoru & Gerçek İnsan Sesi Rehberi */}
                                    <div className={cn("p-2.5 rounded-2xl border space-y-2", isLightUi ? "bg-slate-100/80 border-slate-200/80" : "bg-white/5 border-white/10")}>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <Label className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                    <Mic className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                                    <span>Sesli Okuma Kalitesi</span>
                                                </Label>
                                                <span className={cn("text-[10px] truncate", mutedTone)}>
                                                    {activeVoiceName ? (
                                                        activeVoiceName.toLowerCase().includes('emel') 
                                                            ? '✨ Microsoft Emel (Doğal İnsan Sesi - Kadın)'
                                                            : activeVoiceName.toLowerCase().includes('ahmet')
                                                                ? '✨ Microsoft Ahmet (Doğal İnsan Sesi - Erkek)'
                                                                : activeVoiceName.toLowerCase().includes('google')
                                                                    ? '✨ Google Türkçe (Doğal Ses)'
                                                                    : activeVoiceName.toLowerCase().includes('tolga')
                                                                        ? '⚠️ Microsoft Tolga (Windows Mekanik Robot Sesi)'
                                                                        : activeVoiceName
                                                    ) : 'Sistem sesi taranıyor...'}
                                                </span>
                                            </div>

                                            {availableVoices.length > 1 && (
                                                <Select value={preferredVoice} onValueChange={handleVoiceChange}>
                                                    <SelectTrigger className={cn("w-[130px] h-7 text-xs shrink-0", isLightUi ? "bg-white border-slate-200 text-slate-900" : "bg-slate-800 border-white/20 text-white")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className={cn(isLightUi ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-white/20 text-white")}>
                                                        <SelectItem value="auto">✨ Otomatik (En Doğal)</SelectItem>
                                                        {availableVoices.map(v => (
                                                            <SelectItem key={v.name} value={v.name}>
                                                                {v.displayName.replace(' ✨', '').replace(' ⚠️', '')}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>

                                        {/* Eğer Tolga (robotik mekanik ses) aktifse kullanıcıya açık ve pratik rehber */}
                                        {activeVoiceName && (activeVoiceName.toLowerCase().includes('tolga') || activeVoiceName.toLowerCase().includes('desktop')) && (
                                            <div className={cn("p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] leading-relaxed flex flex-col gap-1", isLightUi ? "text-amber-900" : "text-amber-200")}>
                                                <div className={cn("font-bold flex items-center gap-1", isLightUi ? "text-amber-700" : "text-amber-400")}>
                                                    <span>💡 Gerçek İnsan Sesi İçin:</span>
                                                </div>
                                                <p className="text-[10px] opacity-90">
                                                    Şu an Chrome&apos;da Windows&apos;un eski mekanik robot sesi çalmaktadır. Gerçek bir insan spiker kalitesi için:
                                                </p>
                                                <div className="text-[10px] space-y-1">
                                                    <div>• <strong>En pratik yol:</strong> Sunumu bilgisayarınızdaki <strong>Microsoft Edge</strong> tarayıcısında açın (Stüdyo kalitesinde yapay zeka sesi kendiliğinden devreye girer).</div>
                                                    <div>• <strong>Chrome için:</strong> Windows 11 Ayarları &gt; Erişilebilirlik &gt; Ekran Okuyucusu menüsünden <em>&quot;Doğal sesler ekle &gt; Türkçe&quot;</em> paketini indirin.</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <Label className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                {isSingleCardMode ? <Maximize2 className="w-3.5 h-3.5 text-emerald-500" /> : <LayoutList className="w-3.5 h-3.5 text-sky-500" />} 
                                                Tek Kart Modu
                                            </Label>
                                            <span className={cn("text-[10px]", mutedTone)}>Konu anlatımında tek tek göster.</span>
                                        </div>
                                        <Switch checked={isSingleCardMode} onCheckedChange={setIsSingleCardMode} />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <Label className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                                                Akıllı Tahta Hızlı Mod
                                            </Label>
                                            <span className={cn("text-[10px]", mutedTone)}>Pardus ve eski tahtalarda donmayı önler.</span>
                                        </div>
                                        <Switch 
                                            checked={isPerfMode} 
                                            onCheckedChange={(checked) => {
                                                setIsPerfMode(checked);
                                                if (checked) setAnimationSpeed('off');
                                            }} 
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <Label className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                                Animasyon Hızı
                                            </Label>
                                            <span className={cn("text-[10px]", mutedTone)}>Daktilo efektinin hızı.</span>
                                        </div>
                                        <Select value={animationSpeed} onValueChange={(v: any) => setAnimationSpeed(v)}>
                                            <SelectTrigger className={cn("w-[95px] h-7 text-xs", isLightUi ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-white/10 border-white/20 text-white")}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className={cn(isLightUi ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-white/20 text-white")}>
                                                <SelectItem value="off">Kapalı</SelectItem>
                                                <SelectItem value="slow">Yavaş</SelectItem>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="fast">Hızlı</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* 4. Hızlı Aksiyon (Çıkış) */}
                                <div className={cn("pt-2 border-t", isLightUi ? "border-slate-200" : "border-white/10")}>
                                    <Button 
                                        asChild 
                                        variant="ghost" 
                                        className={cn("w-full h-9 rounded-xl text-xs font-bold bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white cursor-pointer", isLightUi ? "text-rose-600" : "text-rose-400")}
                                    >
                                        <Link href="/teacher/ders-akisi">
                                            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Ders Akışına Dön / Çıkış
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                    );
                })()}
            </AnimatePresence>

            {/* ══ KÖŞE MİNİ SAYAÇ ROZETİ (Sayaç çalışırken modal kapatılırsa) ══ */}
            {isTimerRunning && !isTimerOpen && (
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="fixed top-16 right-6 z-40 cursor-pointer"
                    onClick={() => setIsTimerOpen(true)}
                >
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/95 text-slate-950 font-black text-lg shadow-lg border-2 border-white/50 hover:scale-105 transition-transform backdrop-blur-xl">
                        <Timer className="w-5 h-5" />
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
                                                    {step.isPublished === false && (
                                                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                            <Lock className="w-2.5 h-2.5 text-amber-600" /> Öğrencide Gizli
                                                        </span>
                                                    )}
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

            {/* ══ 6. KAYNAK METİN & ÖZET ÇEKMECESİ (K) ══ */}
            <AnimatePresence>
                {isSourceTextOpen && (
                    <div 
                        className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xl" 
                        onClick={() => setIsSourceTextOpen(false)}
                    >
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-xl h-full bg-slate-900/95 border-l border-white/10 p-6 flex flex-col text-slate-100 shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-base text-white">Kaynak Metin & Özet (K)</h3>
                                        <p className="text-xs text-slate-400 line-clamp-1">{content?.title || topicName || 'Konu'}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsSourceTextOpen(false)} 
                                    className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Araç Çubuğu */}
                            <div className="flex items-center justify-between py-3 border-b border-white/5 text-xs text-slate-400">
                                <span className="font-semibold text-teal-300">
                                    {sourceText ? `${sourceText.trim().split(/\s+/).filter(Boolean).length} kelime` : 'Metin yok'}
                                </span>
                                <div className="flex items-center gap-2">
                                    {sourceText && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCopySourceText}
                                            className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-white/10"
                                        >
                                            <Copy className="w-3.5 h-3.5 mr-1 text-teal-400" /> Kopyala
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            if (!isEditingSourceText) setEditableSourceText(sourceText);
                                            setIsEditingSourceText(prev => !prev);
                                        }}
                                        className="h-7 px-2.5 text-xs border-white/10 text-teal-300 hover:text-white hover:bg-teal-500/20"
                                    >
                                        {isEditingSourceText ? 'Okuma Modu' : 'Düzenle'}
                                    </Button>
                                </div>
                            </div>

                            {/* İçerik */}
                            <div className="flex-grow overflow-y-auto my-3 pr-2 scrollbar-thin">
                                {isEditingSourceText ? (
                                    <div className="space-y-3 h-full flex flex-col">
                                        <Textarea
                                            value={editableSourceText}
                                            onChange={(e) => setEditableSourceText(e.target.value)}
                                            placeholder="Bu konuya ait ders kitabı veya kaynak metnini buraya yapıştırın..."
                                            className="min-h-[360px] flex-grow bg-slate-950 border-white/10 text-white font-sans text-sm leading-relaxed p-4 rounded-xl resize-y"
                                        />
                                        <Button
                                            onClick={handleSaveSourceText}
                                            disabled={isSavingSourceText}
                                            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold h-10 shadow-lg shadow-teal-950/40"
                                        >
                                            {isSavingSourceText ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Kaydediliyor...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4 mr-1.5" /> Kaydet ve Güncelle
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ) : sourceText ? (
                                    <div className="p-5 rounded-2xl bg-black/30 border border-white/5 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans text-slate-200 selection:bg-teal-500/30">
                                        {sourceText}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                                        <BookOpen className="w-12 h-12 text-slate-600" />
                                        <p className="text-sm font-medium text-slate-400">Bu konuya ait kayıtlı kaynak metin bulunamadı.</p>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setEditableSourceText('');
                                                setIsEditingSourceText(true);
                                            }}
                                            className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
                                        >
                                            + Kaynak Metin Ekle
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ══ 5. CANLI ÇİZİM, BEYAZ TAHTA & NOT ALMA ARACI ══ */}
            <PresentationDrawingBoard
                isOpen={isDrawingOpen}
                onClose={() => setIsDrawingOpen(false)}
                isDarkMode={isDarkMode}
            />

            {/* ══ 6. MOBİL KUMANDA & QR KOD MODALI ══ */}
            <PresentationRemoteModal
                isOpen={isRemoteModalOpen}
                onClose={() => setIsRemoteModalOpen(false)}
                courseTitle={courseName || ''}
                unitTitle={unitName || ''}
                topicTitle={(content as any)?.title || ''}
                currentStepIndex={currentStepIndex}
                totalStepsCount={totalStepsCount}
                currentStepTitle={(content as any)?.steps?.[currentStepIndex]?.title || ''}
                steps={(content as any)?.steps || []}
                onNext={() => setJumpToStep(Math.min((totalStepsCount || 1) - 1, currentStepIndex + 1))}
                onPrev={() => setJumpToStep(Math.max(0, currentStepIndex - 1))}
                onJump={(idx) => setJumpToStep(idx)}
                isBlackout={isBlackout}
                onToggleBlackout={() => setIsBlackout(prev => !prev)}
                onStartTimer={(secs) => {
                    setTimerSeconds(secs);
                    setInitialTimerSeconds(secs);
                    setIsTimerRunning(true);
                    setIsTimerOpen(true);
                }}
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