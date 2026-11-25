'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Presentation, Settings, Smartphone, Sun, Moon, LayoutList, 
    Maximize2, X, Zap, Timer, Users, EyeOff, LayoutGrid, Play, Pause, 
    RotateCcw, Sparkles, BookOpen, HelpCircle, CheckCircle2, ChevronRight, 
    ChevronDown, ChevronUp, Check, Trophy, Volume2, VolumeX, Shuffle, Pencil, Minus, Plus,
    Copy, Lock, Gauge, LogOut, Palette, Type, Pin, PinOff, Mic, Bell, Award, Search, SlidersHorizontal, Clock
} from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCachedSteps, setCachedSteps } from '@/lib/lesson-cache';
import type { Topic, Unit, LessonStep } from '@/lib/types';
import { LessonContentViewer, getStepTypeBadge } from '@/components/lesson-content-viewer';
import { getTurkishVoices, getBestTurkishVoice, prepareTurkishSpeech, getTurkishSpeechParams, type TurkishVoiceOption } from '@/components/lesson-viewer/tts-helper';
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
    const [toolsTab, setToolsTab] = useState<'tools' | 'display'>('tools');
    const [timerLabel, setTimerLabel] = useState<string>('Etkinlik Süresi');
    const [isTimerFinishedAlert, setIsTimerFinishedAlert] = useState<boolean>(false);
    const [blackoutMessage, setBlackoutMessage] = useState<string>('Dikkat Öğretmende 👨‍🏫');
    const [slideDrawerFilter, setSlideDrawerFilter] = useState<'all' | 'hidden'>('all');
    const [slideDrawerQuery, setSlideDrawerQuery] = useState<string>('');
    const [sourceTextSize, setSourceTextSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
    const [sourceSearchQuery, setSourceSearchQuery] = useState<string>('');
    const [isSpeakingSource, setIsSpeakingSource] = useState<boolean>(false);
    const { toast } = useToast();
    const [sourceText, setSourceText] = useState<string>('');
    const [isSourceTextOpen, setIsSourceTextOpen] = useState(false);
    const [isEditingSourceText, setIsEditingSourceText] = useState(false);
    const [editableSourceText, setEditableSourceText] = useState('');
    const [isSavingSourceText, setIsSavingSourceText] = useState(false);
    const { themeMode, setThemeMode } = useTheme();
    const isDarkMode = themeMode === 'dark';
    const setIsDarkMode = (checked: boolean) => setThemeMode(checked ? 'dark' : 'light');

    useEffect(() => {
        if (!isSourceTextOpen && isSpeakingSource && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeakingSource(false);
        }
    }, [isSourceTextOpen, isSpeakingSource]);

    const toggleSpeakSourceText = useCallback(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window) || !sourceText) return;
        if (isSpeakingSource) {
            window.speechSynthesis.cancel();
            setIsSpeakingSource(false);
            return;
        }
        window.speechSynthesis.cancel();
        const { spokenText } = prepareTurkishSpeech(sourceText);
        const voice = getBestTurkishVoice(preferredVoice === 'auto' ? null : preferredVoice);
        const { rate, pitch } = getTurkishSpeechParams(voice);
        const utter = new SpeechSynthesisUtterance(spokenText);
        if (voice) utter.voice = voice;
        utter.lang = 'tr-TR';
        utter.rate = rate;
        utter.pitch = pitch;
        utter.onend = () => setIsSpeakingSource(false);
        utter.onerror = () => setIsSpeakingSource(false);
        setIsSpeakingSource(true);
        window.speechSynthesis.speak(utter);
    }, [isSpeakingSource, sourceText, preferredVoice]);

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
                        setIsTimerFinishedAlert(true);
                        if (isSoundEnabled) {
                            try { playSound('timeUp'); } catch(e) {}
                        }
                        try { confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); } catch(e) {}
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
        setIsTimerFinishedAlert(false);
        setIsTimerRunning(true);
    };

    const adjustTimerSeconds = (delta: number) => {
        setIsTimerFinishedAlert(false);
        setTimerSeconds(prev => {
            const next = Math.max(0, prev + delta);
            setInitialTimerSeconds(init => Math.max(init, next, 15));
            return next;
        });
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
            {/* ══ SUNUM ARAÇLARI & AYARLAR PANELİ (İKİ SEKMELİ KOMUTA MERKEZİ) ══ */}
            <AnimatePresence>
                {isToolsOpen && (() => {
                    const isLightUi = presentationTheme === 'clean-light' || presentationTheme === 'sketchnote';
                    const sectionDivider = cn("space-y-2 pt-2.5 border-t", isLightUi ? "border-slate-200" : "border-white/10");
                    const optionIdle = isLightUi
                        ? "border-slate-200 bg-slate-100/70 text-slate-700 hover:border-slate-300"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25";
                    const labelTone = isLightUi ? "text-slate-800" : "text-white";
                    const mutedTone = isLightUi ? "text-slate-500" : "text-slate-400";
                    const sourceWordCount = sourceText ? sourceText.trim().split(/\s+/).filter(Boolean).length : 0;

                    return (
                    <div 
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-sm p-3 sm:p-4" 
                        onClick={() => setIsToolsOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 36, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 36, scale: 0.96 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                "w-full max-w-lg p-0 rounded-3xl border shadow-2xl overflow-hidden mb-14 sm:mb-0",
                                isLightUi
                                    ? "border-slate-200 bg-white text-slate-900"
                                    : "border-white/15 bg-slate-950 text-white"
                            )}
                        >
                            {/* Üst Başlık ve Sekme Değiştirici */}
                            <div className={cn(
                                "p-3.5 px-4 border-b space-y-2.5",
                                isLightUi ? "border-slate-200 bg-slate-50/90" : "border-white/10 bg-white/[0.03]"
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                            <Sparkles className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-xs uppercase tracking-wider leading-tight">
                                                Sunum Merkezi
                                            </h4>
                                            <span className={cn("text-[10px] font-medium block leading-tight", mutedTone)}>
                                                Adım {currentStepIndex + 1} / {totalStepsCount || 1} • {currentTime}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => setIsSoundEnabled(prev => !prev)}
                                            className={cn("h-8 w-8 rounded-xl cursor-pointer", isLightUi ? "text-slate-600 hover:bg-slate-200/70" : "text-slate-300 hover:bg-white/10")}
                                            title={isSoundEnabled ? "Ses Efektleri Açık" : "Ses Efektleri Kapalı"}
                                        >
                                            {isSoundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => setIsToolsOpen(false)}
                                            className={cn("h-8 w-8 rounded-xl cursor-pointer", isLightUi ? "text-slate-600 hover:bg-slate-200/70" : "text-slate-300 hover:bg-white/10")}
                                            title="Kapat"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* 2 Sekme Seçici */}
                                <div className={cn("grid grid-cols-2 gap-1 p-1 rounded-2xl border", isLightUi ? "bg-slate-200/60 border-slate-200" : "bg-white/5 border-white/10")}>
                                    <button
                                        type="button"
                                        onClick={() => setToolsTab('tools')}
                                        className={cn(
                                            "py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                            toolsTab === 'tools'
                                                ? (isLightUi ? "bg-white text-indigo-700 shadow-xs" : "bg-indigo-600 text-white shadow-xs")
                                                : mutedTone
                                        )}
                                    >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                        <span>Sınıf Araçları</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setToolsTab('display')}
                                        className={cn(
                                            "py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                            toolsTab === 'display'
                                                ? (isLightUi ? "bg-white text-indigo-700 shadow-xs" : "bg-indigo-600 text-white shadow-xs")
                                                : mutedTone
                                        )}
                                    >
                                        <Palette className="w-3.5 h-3.5" />
                                        <span>Görünüm & Ayarlar</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 space-y-3.5 max-h-[72vh] overflow-y-auto">
                                {toolsTab === 'tools' ? (
                                    <>
                                        {/* 1. Tahta & Öğrenci Araçları (3x2 Izgara) */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            <button
                                                onClick={() => { handleOpenWheel(); setIsToolsOpen(false); }}
                                                className={cn("flex flex-col justify-between p-3 rounded-2xl border transition-all text-left group cursor-pointer", isLightUi ? "bg-sky-50/90 hover:bg-sky-100 border-sky-200 text-sky-900" : "bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/25 text-sky-200")}
                                            >
                                                <div className="flex items-center justify-between w-full mb-2">
                                                    <div className="p-1.5 rounded-lg bg-sky-500 text-white">
                                                        <Users className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[10px] font-mono opacity-65">R</span>
                                                </div>
                                                <span className="font-black text-xs">Şanslı Çark</span>
                                                <span className="text-[10px] opacity-75">Kura & Öğrenci Seç</span>
                                            </button>

                                            <button
                                                onClick={() => { setIsTimerOpen(true); setIsToolsOpen(false); }}
                                                className={cn("flex flex-col justify-between p-3 rounded-2xl border transition-all text-left group cursor-pointer", isLightUi ? "bg-amber-50/90 hover:bg-amber-100 border-amber-200 text-amber-900" : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-200")}
                                            >
                                                <div className="flex items-center justify-between w-full mb-2">
                                                    <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950">
                                                        <Timer className="w-4 h-4" />
                                                    </div>
                                                    {isTimerRunning ? (
                                                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
                                                            {formatTimer(timerSeconds)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-mono opacity-65">T</span>
                                                    )}
                                                </div>
                                                <span className="font-black text-xs">Sınıf Sayacı</span>
                                                <span className="text-[10px] opacity-75">{isTimerRunning ? 'Çalışıyor • Aç' : 'Geri sayım kur'}</span>
                                            </button>

                                            <button
                                                onClick={() => { setIsDrawingOpen(true); setIsToolsOpen(false); }}
                                                className={cn("flex flex-col justify-between p-3 rounded-2xl border transition-all text-left group cursor-pointer", isLightUi ? "bg-cyan-50/90 hover:bg-cyan-100 border-cyan-200 text-cyan-900" : "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/25 text-cyan-200")}
                                            >
                                                <div className="flex items-center justify-between w-full mb-2">
                                                    <div className="p-1.5 rounded-lg bg-cyan-500 text-slate-950">
                                                        <Pencil className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[10px] font-mono opacity-65">D</span>
                                                </div>
                                                <span className="font-black text-xs">Çizim Tahtası</span>
                                                <span className="text-[10px] opacity-75">Kalem, fosfor & şekil</span>
                                            </button>

                                            <button
                                                onClick={() => { setIsRemoteModalOpen(true); setIsToolsOpen(false); }}
                                                className={cn("flex flex-col justify-between p-3 rounded-2xl border transition-all text-left group cursor-pointer", isLightUi ? "bg-indigo-50/90 hover:bg-indigo-100 border-indigo-200 text-indigo-900" : "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/25 text-indigo-200")}
                                            >
                                                <div className="flex items-center justify-between w-full mb-2">
                                                    <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                                                        <Smartphone className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[10px] font-mono opacity-65">Q</span>
                                                </div>
                                                <span className="font-black text-xs">Mobil Kumanda</span>
                                                <span className="text-[10px] opacity-75">QR kod ile telefon</span>
                                            </button>

                                            <button
                                                onClick={() => { setIsSlideDrawerOpen(true); setIsToolsOpen(false); }}
                                                className={cn("flex flex-col justify-between p-3 rounded-2xl border transition-all text-left group cursor-pointer", isLightUi ? "bg-purple-50/90 hover:bg-purple-100 border-purple-200 text-purple-900" : "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/25 text-purple-200")}
                                            >
                                                <div className="flex items-center justify-between w-full mb-2">
                                                    <div className="p-1.5 rounded-lg bg-purple-600 text-white">
                                                        <LayoutGrid className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[10px] font-mono opacity-65">G</span>
                                                </div>
                                                <span className="font-black text-xs">Slayt Çekmecesi</span>
                                                <span className="text-[10px] opacity-75">{totalStepsCount} adımda gezin</span>
                                            </button>

                                            <button
                                                onClick={() => { setIsSourceTextOpen(true); setIsToolsOpen(false); }}
                                                className={cn("flex flex-col justify-between p-3 rounded-2xl border transition-all text-left group cursor-pointer", isLightUi ? "bg-teal-50/90 hover:bg-teal-100 border-teal-200 text-teal-900" : "bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/25 text-teal-200")}
                                            >
                                                <div className="flex items-center justify-between w-full mb-2">
                                                    <div className="p-1.5 rounded-lg bg-teal-600 text-white">
                                                        <BookOpen className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[10px] font-mono opacity-65">K</span>
                                                </div>
                                                <span className="font-black text-xs">Kaynak Metin</span>
                                                <span className="text-[10px] opacity-75">
                                                    {sourceWordCount > 0 ? `${sourceWordCount} kelime` : 'Ders notu ekle'}
                                                </span>
                                            </button>
                                        </div>

                                        {/* 2. Hızlı Dikkat & Sınıf Sesleri Barı */}
                                        <div className={sectionDivider}>
                                            <span className={cn("text-[11px] font-bold uppercase tracking-wider", mutedTone)}>Dikkat & Sınıf Sesleri</span>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsBlackout(true); setIsToolsOpen(false); }}
                                                    className={cn("flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer", isLightUi ? "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700" : "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300")}
                                                >
                                                    <EyeOff className="w-3.5 h-3.5" />
                                                    <span>Karart (B)</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        try { playSound('bell'); } catch {}
                                                    }}
                                                    className={cn("flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95", isLightUi ? "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800" : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300")}
                                                >
                                                    <Bell className="w-3.5 h-3.5" />
                                                    <span>Ders Zili</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        try { playSound('applause'); } catch {}
                                                        try { confetti({ particleCount: 70, spread: 75, origin: { y: 0.7 } }); } catch {}
                                                    }}
                                                    className={cn("flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95", isLightUi ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300")}
                                                >
                                                    <Award className="w-3.5 h-3.5" />
                                                    <span>Alkışla</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* 3. Anlık Yazı Boyutu Stepper & Hızlı Anahtarlar */}
                                        <div className={sectionDivider}>
                                            <div className="flex items-center justify-between">
                                                <span className={cn("text-[11px] font-bold uppercase tracking-wider", mutedTone)}>Yazı & Kart Boyutu</span>
                                                <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20", isLightUi ? "text-indigo-700" : "text-indigo-300")}>
                                                    {FONT_SIZE_LEVELS[getCurrentScaleIndex()]?.badge} ({FONT_SIZE_LEVELS[getCurrentScaleIndex()]?.percent})
                                                </span>
                                            </div>

                                            <div className={cn("flex items-center justify-between gap-2 p-1.5 rounded-2xl border", isLightUi ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10")}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={getCurrentScaleIndex() === 0}
                                                    onClick={decreaseFontSize}
                                                    className={cn("h-8 w-8 p-0 rounded-xl shadow-xs disabled:opacity-30 flex items-center justify-center cursor-pointer", isLightUi ? "bg-white hover:bg-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/20 text-white")}
                                                    title="Küçült (-)"
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
                                                                        ? "w-6 bg-indigo-600"
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
                                                    title="Büyüt (+)"
                                                >
                                                    <Plus className="w-4 h-4 stroke-[3]" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl border", isLightUi ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10")}>
                                                    <span className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                        <LayoutList className="w-3.5 h-3.5 text-sky-500" /> Tek Kart
                                                    </span>
                                                    <Switch checked={isSingleCardMode} onCheckedChange={setIsSingleCardMode} />
                                                </div>
                                                <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl border", isLightUi ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10")}>
                                                    <span className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                        <Volume2 className="w-3.5 h-3.5 text-violet-500" /> Oto Oku
                                                    </span>
                                                    <Switch checked={isAutoReadEnabled} onCheckedChange={toggleAutoRead} />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* SEKME 2: TEMA, TİPOGRAFİ VE SİSTEM AYARLARI */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className={cn("text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5", mutedTone)}>
                                                    <Palette className="w-3.5 h-3.5 text-indigo-500" />
                                                    Sunum Atmosferi (M)
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                                <button
                                                    onClick={() => handleThemeChange('game-3d')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                        presentationTheme === 'game-3d'
                                                            ? "border-amber-400 bg-amber-500/20 text-amber-400 font-black"
                                                            : optionIdle
                                                    )}
                                                >
                                                    <span className="text-lg mb-0.5">🎮</span>
                                                    <span className="text-[11px] font-black leading-tight">3D Oyun</span>
                                                </button>
                                                <button
                                                    onClick={() => handleThemeChange('sketchnote')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                        presentationTheme === 'sketchnote'
                                                            ? cn("border-amber-500 bg-amber-500/20 font-black", isLightUi ? "text-amber-800" : "text-amber-200")
                                                            : optionIdle
                                                    )}
                                                >
                                                    <Sparkles className="w-4 h-4 mb-1 text-amber-500" />
                                                    <span className="text-[11px] font-bold leading-tight font-['Patrick_Hand']">Defter</span>
                                                </button>
                                                <button
                                                    onClick={() => handleThemeChange('clean-light')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                        presentationTheme === 'clean-light'
                                                            ? cn("border-amber-500 bg-amber-500/15 font-black", isLightUi ? "text-amber-700" : "text-amber-300")
                                                            : optionIdle
                                                    )}
                                                >
                                                    <Sun className="w-4 h-4 mb-1 text-amber-500" />
                                                    <span className="text-[11px] font-bold leading-tight">Aydınlık</span>
                                                </button>
                                                <button
                                                    onClick={() => handleThemeChange('cosmic-dark')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                        presentationTheme === 'cosmic-dark'
                                                            ? cn("border-indigo-500 bg-indigo-500/20 font-black", isLightUi ? "text-indigo-700" : "text-white")
                                                            : optionIdle
                                                    )}
                                                >
                                                    <Moon className="w-4 h-4 mb-1 text-indigo-400" />
                                                    <span className="text-[11px] font-bold leading-tight">Kozmik</span>
                                                </button>
                                                <button
                                                    onClick={() => handleThemeChange('vibrant-studio')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all cursor-pointer text-center",
                                                        presentationTheme === 'vibrant-studio'
                                                            ? cn("border-purple-500 bg-purple-500/20 font-black", isLightUi ? "text-purple-700" : "text-white")
                                                            : optionIdle
                                                    )}
                                                >
                                                    <Zap className="w-4 h-4 mb-1 text-amber-400" />
                                                    <span className="text-[11px] font-bold leading-tight">Canlı</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className={sectionDivider}>
                                            <span className={cn("text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5", mutedTone)}>
                                                <Type className="w-3.5 h-3.5 text-indigo-500" />
                                                Yazı Tipi (O)
                                            </span>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {[
                                                    { id: 'sketchnote', label: 'El Yazısı', cls: "font-['Caveat',cursive]" },
                                                    { id: 'outfit', label: 'Outfit', cls: 'font-outfit' },
                                                    { id: 'poppins', label: 'Poppins', cls: 'font-poppins' },
                                                    { id: 'jakarta', label: 'Jakarta', cls: 'font-jakarta' },
                                                    { id: 'playfair', label: 'Playfair', cls: 'font-playfair italic' },
                                                ].map(f => (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => handleFontChange(f.id as any)}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer text-center",
                                                            presentationFont === f.id
                                                                ? cn("border-indigo-500 bg-indigo-500/15 font-black", isLightUi ? "text-indigo-700" : "text-white")
                                                                : optionIdle
                                                        )}
                                                    >
                                                        <span className={cn("text-sm font-black", f.cls)}>Aa</span>
                                                        <span className="text-[10px] font-bold truncate w-full">{f.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={sectionDivider}>
                                            <span className={cn("text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5", mutedTone)}>
                                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                                Arka Plan Deseni (P)
                                            </span>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {[
                                                    { id: 'notebook-dots', label: 'Defter' },
                                                    { id: 'spotlight', label: 'Spot' },
                                                    { id: 'aurora', label: 'Aurora' },
                                                    { id: 'matrix', label: 'Izgara' },
                                                    { id: 'minimal', label: 'Sade' },
                                                ].map(bg => (
                                                    <button
                                                        key={bg.id}
                                                        onClick={() => handleBgPatternChange(bg.id as any)}
                                                        className={cn(
                                                            "py-2 px-1 rounded-xl border-2 text-[11px] font-bold transition-all cursor-pointer text-center",
                                                            presentationBgPattern === bg.id
                                                                ? cn("border-indigo-500 bg-indigo-500/15 font-black", isLightUi ? "text-indigo-700" : "text-white")
                                                                : optionIdle
                                                        )}
                                                    >
                                                        {bg.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={cn("space-y-2.5 pt-2.5 border-t", isLightUi ? "border-slate-200" : "border-white/10")}>
                                            <div className={cn("p-2.5 rounded-2xl border space-y-2", isLightUi ? "bg-slate-100/80 border-slate-200/80" : "bg-white/5 border-white/10")}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                        <Label className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                            <Mic className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                                            <span>Sesli Okuma Motoru</span>
                                                        </Label>
                                                        <span className={cn("text-[10px] truncate", mutedTone)}>
                                                            {activeVoiceName ? (
                                                                activeVoiceName.toLowerCase().includes('emel') 
                                                                    ? '✨ Microsoft Emel (Doğal Ses)'
                                                                    : activeVoiceName.toLowerCase().includes('ahmet')
                                                                        ? '✨ Microsoft Ahmet (Doğal Ses)'
                                                                        : activeVoiceName.toLowerCase().includes('google')
                                                                            ? '✨ Google Türkçe'
                                                                            : activeVoiceName.toLowerCase().includes('tolga')
                                                                                ? '⚠️ Microsoft Tolga (Klasik)'
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
                                                                <SelectItem value="auto">✨ Otomatik</SelectItem>
                                                                {availableVoices.map(v => (
                                                                    <SelectItem key={v.name} value={v.name}>
                                                                        {v.displayName.replace(' ✨', '').replace(' ⚠️', '')}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                    <Pin className="w-3.5 h-3.5 text-indigo-500" />
                                                    Üst Menü Çubuğunu Sabitle (H)
                                                </Label>
                                                <Switch checked={isHeaderPinned} onCheckedChange={toggleHeaderPinned} />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                    <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                                                    Akıllı Tahta Hızlı Mod
                                                </Label>
                                                <Switch 
                                                    checked={isPerfMode} 
                                                    onCheckedChange={(checked) => {
                                                        setIsPerfMode(checked);
                                                        if (checked) setAnimationSpeed('off');
                                                    }} 
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label className={cn("text-xs font-bold flex items-center gap-1.5", labelTone)}>
                                                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                                                    Yazı Animasyon Hızı
                                                </Label>
                                                <Select value={animationSpeed} onValueChange={(v: any) => setAnimationSpeed(v)}>
                                                    <SelectTrigger className={cn("w-[100px] h-7 text-xs", isLightUi ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-white/10 border-white/20 text-white")}>
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
                                    </>
                                )}

                                {/* Çıkış Butonu */}
                                <div className={cn("pt-2.5 border-t", isLightUi ? "border-slate-200" : "border-white/10")}>
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

            {/* ══ 1. SINIF GERİ SAYIM SAYACI MODALI (PREMİUM HALKA GRAFİK + CANLI EKLEME) ══ */}
            <AnimatePresence>
                {isTimerOpen && (() => {
                    const isLightUi = presentationTheme === 'clean-light' || presentationTheme === 'sketchnote';
                    const safeInit = Math.max(1, initialTimerSeconds);
                    const progress = Math.max(0, Math.min(1, timerSeconds / safeInit));
                    const radius = 84;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference * (1 - progress);
                    const ringColor = timerSeconds <= 10 && isTimerRunning
                        ? '#f43f5e'
                        : progress <= 0.25
                        ? '#f59e0b'
                        : '#4f46e5';

                    return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4" onClick={() => setIsTimerOpen(false)}>
                        <motion.div 
                            initial={{ scale: 0.92, opacity: 0, y: 18 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 18 }}
                            className={cn(
                                "relative w-full max-w-md p-6 sm:p-7 rounded-[2rem] border shadow-2xl flex flex-col items-center text-center overflow-hidden",
                                isLightUi ? "bg-white border-slate-200 text-slate-900" : "bg-slate-950 border-white/15 text-white"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-500" />

                            <div className="w-full flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs text-amber-500">
                                    <Timer className="w-4 h-4" /> Sınıf Zamanlayıcısı
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsTimerOpen(false)}
                                        className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer", isLightUi ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-white/10 hover:bg-white/15 text-slate-300")}
                                        title="Köşeye küçült"
                                    >
                                        Küçült
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsTimerOpen(false)}
                                        className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isLightUi ? "hover:bg-slate-100 text-slate-500" : "hover:bg-white/10 text-slate-400")}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Etkinlik Amacı Etiketi */}
                            <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
                                {['Etkinlik Süresi', 'Sessiz Düşünme', 'Soru Çözümü', 'Grup Tartışması'].map(lbl => (
                                    <button
                                        key={lbl}
                                        type="button"
                                        onClick={() => setTimerLabel(lbl)}
                                        className={cn(
                                            "px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer",
                                            timerLabel === lbl
                                                ? "bg-indigo-600 text-white border-indigo-500"
                                                : (isLightUi ? "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200" : "bg-white/5 border-white/10 text-slate-400 hover:text-white")
                                        )}
                                    >
                                        {lbl}
                                    </button>
                                ))}
                            </div>

                            {/* Dairesel İlerleme Halkalı Dijital Ekran */}
                            <div className="relative w-52 h-52 flex items-center justify-center my-1">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r={radius}
                                        fill="none"
                                        stroke={isLightUi ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}
                                        strokeWidth="12"
                                    />
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r={radius}
                                        fill="none"
                                        stroke={ringColor}
                                        strokeWidth="12"
                                        strokeLinecap="round"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        style={{ transition: 'stroke-dashoffset 0.35s linear, stroke 0.25s ease' }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider mb-0.5", isLightUi ? "text-slate-500" : "text-slate-400")}>
                                        {timerLabel}
                                    </span>
                                    <span className={cn(
                                        "font-mono font-black text-5xl tracking-tight tabular-nums",
                                        timerSeconds <= 10 && isTimerRunning ? "text-rose-500" : (isLightUi ? "text-slate-900" : "text-white")
                                    )}>
                                        {formatTimer(timerSeconds)}
                                    </span>
                                    {timerSeconds === 0 && isTimerFinishedAlert && (
                                        <span className="mt-1 text-xs font-black text-rose-500">Süre Doldu! ⏰</span>
                                    )}
                                </div>
                            </div>

                            {/* Canlı Süre Ekle / Çıkar */}
                            <div className="flex items-center justify-center gap-2 mt-2">
                                {[
                                    { delta: -15, label: '-15sn' },
                                    { delta: 15, label: '+15sn' },
                                    { delta: 60, label: '+1dk' },
                                ].map(btn => (
                                    <button
                                        key={btn.label}
                                        type="button"
                                        onClick={() => adjustTimerSeconds(btn.delta)}
                                        className={cn(
                                            "px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer active:scale-95",
                                            isLightUi ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/15 border-white/15 text-slate-200"
                                        )}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>

                            {/* Hazır Süreler */}
                            <div className="grid grid-cols-6 gap-1.5 w-full mt-4">
                                {[30, 60, 120, 180, 300, 600].map((sec) => (
                                    <button
                                        key={sec}
                                        type="button"
                                        onClick={() => startTimerPreset(sec)}
                                        className={cn(
                                            "h-9 rounded-xl border font-black text-xs transition-all cursor-pointer",
                                            initialTimerSeconds === sec
                                                ? "bg-amber-500 border-amber-400 text-slate-950"
                                                : (isLightUi ? "bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-900" : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-200")
                                        )}
                                    >
                                        {sec < 60 ? `${sec}sn` : `${sec / 60}dk`}
                                    </button>
                                ))}
                            </div>

                            {/* Başlat / Duraklat / Sıfırla */}
                            <div className="flex items-center gap-2.5 w-full mt-5">
                                {timerSeconds === 0 ? (
                                    <Button
                                        onClick={() => startTimerPreset(30)}
                                        className="flex-1 h-12 rounded-2xl font-black text-base bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                                    >
                                        +30sn Uzat & Başlat
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => {
                                            setIsTimerFinishedAlert(false);
                                            setIsTimerRunning(prev => !prev);
                                        }}
                                        className={cn(
                                            "flex-1 h-12 rounded-2xl font-black text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer",
                                            isTimerRunning 
                                                ? "bg-rose-500 hover:bg-rose-600 text-white" 
                                                : "bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950"
                                        )}
                                    >
                                        {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                                        {isTimerRunning ? 'Duraklat' : 'Başlat'}
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsTimerRunning(false);
                                        setIsTimerFinishedAlert(false);
                                        setTimerSeconds(initialTimerSeconds);
                                    }}
                                    className={cn("h-12 w-12 rounded-2xl flex items-center justify-center cursor-pointer", isLightUi ? "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700" : "bg-white/10 border-white/15 hover:bg-white/15 text-white")}
                                    title="Sıfırla"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                    );
                })()}
            </AnimatePresence>

            {/* ══ 2. ŞANSLI KURA ÇARKI (KAYITLI ÖĞRENCİLER & ÖZEL LİSTE) ══ */}
            <PresentationWheelModal 
                isOpen={isPickerOpen} 
                onClose={() => setIsPickerOpen(false)} 
                presentationTheme={presentationTheme}
            />

            {/* ══ 3. SLAYT ÇEKMECESİ (TÜRKÇE ETİKETLER & ARAMA / FİLTRE) ══ */}
            <AnimatePresence>
                {isSlideDrawerOpen && (() => {
                    const isLightUi = presentationTheme === 'clean-light' || presentationTheme === 'sketchnote';
                    const allSteps = content.steps || [];
                    const hiddenCount = allSteps.filter((s: any) => s.isPublished === false).length;
                    const q = slideDrawerQuery.trim().toLowerCase();

                    return (
                    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/45 backdrop-blur-sm" onClick={() => setIsSlideDrawerOpen(false)}>
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
                            className={cn(
                                "relative w-full max-w-md h-full border-l p-5 flex flex-col shadow-2xl overflow-hidden",
                                isLightUi ? "bg-white border-slate-200 text-slate-900" : "bg-slate-950 border-white/15 text-white"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className={cn("flex items-center justify-between pb-3.5 border-b", isLightUi ? "border-slate-200" : "border-white/10")}>
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-purple-600 text-white">
                                        <LayoutGrid className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-base leading-tight">Slayt Çekmecesi</h3>
                                        <p className={cn("text-xs font-medium", isLightUi ? "text-slate-500" : "text-slate-400")}>
                                            Toplam {allSteps.length} adım{hiddenCount > 0 ? ` • ${hiddenCount} gizli` : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSlideDrawerOpen(false)}
                                    className={cn("p-2 rounded-xl cursor-pointer transition-colors", isLightUi ? "hover:bg-slate-100 text-slate-500" : "hover:bg-white/10 text-slate-400")}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Arama & Filtre Barı */}
                            <div className="py-3 space-y-2 border-b border-slate-500/15">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={slideDrawerQuery}
                                        onChange={e => setSlideDrawerQuery(e.target.value)}
                                        placeholder="Slayt başlığı veya tür ara..."
                                        className={cn(
                                            "w-full h-9 pl-8 pr-8 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/40",
                                            isLightUi ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-white/5 border-white/15 text-white placeholder:text-slate-500"
                                        )}
                                    />
                                    {slideDrawerQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSlideDrawerQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {hiddenCount > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        {[
                                            { id: 'all' as const, label: `Tümü (${allSteps.length})` },
                                            { id: 'hidden' as const, label: `Öğrencide Gizli (${hiddenCount})` },
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setSlideDrawerFilter(tab.id)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                                                    slideDrawerFilter === tab.id
                                                        ? "bg-purple-600 border-purple-500 text-white"
                                                        : (isLightUi ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-white/5 border-white/10 text-slate-300")
                                                )}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
                                {allSteps.map((step, idx) => {
                                    const badge = getStepTypeBadge(step.type);
                                    if (slideDrawerFilter === 'hidden' && step.isPublished !== false) return null;
                                    if (q) {
                                        const hay = `${step.title || ''} ${badge}`.toLowerCase();
                                        if (!hay.includes(q)) return null;
                                    }
                                    const isActive = idx === currentStepIndex;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setJumpToStep(idx);
                                                setIsSlideDrawerOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 group cursor-pointer",
                                                isActive
                                                    ? (isLightUi ? "bg-purple-50 border-purple-500 shadow-sm" : "bg-purple-500/20 border-purple-400")
                                                    : (isLightUi ? "bg-slate-50 border-slate-200 hover:bg-indigo-50/70 hover:border-indigo-300" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/25")
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5",
                                                isActive
                                                    ? "bg-purple-600 text-white"
                                                    : (isLightUi ? "bg-slate-200 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white" : "bg-white/10 text-slate-300 group-hover:bg-indigo-500 group-hover:text-white")
                                            )}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                                    <span className={cn(
                                                        "text-[10px] font-black px-2 py-0.5 rounded-md",
                                                        isLightUi ? "text-purple-700 bg-purple-100" : "text-purple-200 bg-purple-500/25"
                                                    )}>
                                                        {badge}
                                                    </span>
                                                    {step.isPublished === false && (
                                                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                            <Lock className="w-2.5 h-2.5 text-amber-600" /> Gizli
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className={cn("font-bold text-sm truncate", isLightUi ? "text-slate-900" : "text-white")}>
                                                    {step.title || `Adım ${idx + 1}`}
                                                </h4>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                    );
                })()}
            </AnimatePresence>

            {/* ══ 4. TAHTAYI KARART (SERENE ODAK SAHNESİ) ══ */}
            <AnimatePresence>
                {isBlackout && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsBlackout(false)}
                        className="fixed inset-0 z-[100] bg-gradient-to-b from-[#040711] via-[#02040a] to-black flex flex-col items-center justify-between p-6 sm:p-10 cursor-pointer select-none"
                    >
                        <div className="flex items-center gap-3 text-xs font-mono font-bold text-slate-400 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>{currentTime}</span>
                            {content?.steps?.[currentStepIndex]?.title && (
                                <>
                                    <span className="opacity-40">•</span>
                                    <span className="font-sans truncate max-w-[260px] text-slate-300">
                                        {content.steps[currentStepIndex].title}
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="flex flex-col items-center gap-5 text-center max-w-2xl">
                            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                                <EyeOff className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                                {blackoutMessage}
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 uppercase tracking-widest">
                                Devam etmek için boşluğa dokunun veya &apos;B&apos; tuşuna basın
                            </p>
                        </div>

                        <div
                            className="flex flex-wrap items-center justify-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {[
                                'Dikkat Öğretmende 👨‍🏫',
                                'Sessiz Düşünme & Dinleme 🤫',
                                'Deftere Not Alalım ✏️',
                            ].map(cue => (
                                <button
                                    key={cue}
                                    type="button"
                                    onClick={() => setBlackoutMessage(cue)}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer",
                                        blackoutMessage === cue
                                            ? "bg-amber-400/20 border-amber-400/60 text-amber-200"
                                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    {cue}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══ 6. KAYNAK METİN & ÖZET ÇEKMECESİ (K) — ARAMA, SESLİ OKUMA & OKUMA BOYUTU ══ */}
            <AnimatePresence>
                {isSourceTextOpen && (() => {
                    const isLightUi = presentationTheme === 'clean-light' || presentationTheme === 'sketchnote';
                    const wordsCount = sourceText ? sourceText.trim().split(/\s+/).filter(Boolean).length : 0;
                    const readMinutes = Math.max(1, Math.ceil(wordsCount / 140));
                    const sizeClassMap = {
                        sm: 'text-sm leading-relaxed',
                        md: 'text-base md:text-lg leading-relaxed',
                        lg: 'text-lg md:text-xl leading-relaxed',
                        xl: 'text-xl md:text-2xl leading-loose',
                    };
                    const sizeOrder: ('sm' | 'md' | 'lg' | 'xl')[] = ['sm', 'md', 'lg', 'xl'];

                    const renderHighlightedSource = (text: string, queryStr: string) => {
                        const qTrim = queryStr.trim();
                        if (!qTrim) return text;
                        const escaped = qTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
                        return parts.map((part, idx) =>
                            part.toLowerCase() === qTrim.toLowerCase() ? (
                                <mark key={idx} className="bg-amber-300 text-slate-950 px-1 rounded font-bold">
                                    {part}
                                </mark>
                            ) : (
                                <span key={idx}>{part}</span>
                            )
                        );
                    };

                    return (
                    <div 
                        className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/50 backdrop-blur-sm" 
                        onClick={() => setIsSourceTextOpen(false)}
                    >
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
                            className={cn(
                                "relative w-full max-w-xl h-full border-l p-5 sm:p-6 flex flex-col shadow-2xl overflow-hidden",
                                isLightUi ? "bg-[#fffdf9] border-slate-200 text-slate-900" : "bg-slate-950 border-white/15 text-slate-100"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className={cn("flex items-center justify-between pb-3.5 border-b", isLightUi ? "border-slate-200" : "border-white/10")}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={cn("p-2 rounded-xl border shrink-0", isLightUi ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-teal-500/20 text-teal-400 border-teal-500/30")}>
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-base leading-tight">Kaynak Metin & Özet (K)</h3>
                                        <p className={cn("text-xs line-clamp-1", isLightUi ? "text-slate-500" : "text-slate-400")}>
                                            {content?.title || topicName || 'Konu'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsSourceTextOpen(false)} 
                                    className={cn("p-2 rounded-xl transition-colors cursor-pointer", isLightUi ? "hover:bg-slate-100 text-slate-500" : "hover:bg-white/10 text-slate-400 hover:text-white")}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Okuma Kontrolleri Barı */}
                            <div className={cn("flex flex-wrap items-center justify-between gap-2 py-3 border-b text-xs", isLightUi ? "border-slate-200 text-slate-600" : "border-white/10 text-slate-400")}>
                                <span className={cn("font-bold", isLightUi ? "text-teal-700" : "text-teal-300")}>
                                    {wordsCount > 0 ? `${wordsCount} kelime • ~${readMinutes} dk okuma` : 'Metin yok'}
                                </span>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    {!isEditingSourceText && sourceText && (
                                        <>
                                            <div className={cn("flex items-center rounded-lg border p-0.5", isLightUi ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/15")}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const i = sizeOrder.indexOf(sourceTextSize);
                                                        if (i > 0) setSourceTextSize(sizeOrder[i - 1]);
                                                    }}
                                                    disabled={sourceTextSize === 'sm'}
                                                    className="px-2 py-0.5 font-black disabled:opacity-30 cursor-pointer"
                                                    title="Küçült"
                                                >
                                                    A-
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const i = sizeOrder.indexOf(sourceTextSize);
                                                        if (i < sizeOrder.length - 1) setSourceTextSize(sizeOrder[i + 1]);
                                                    }}
                                                    disabled={sourceTextSize === 'xl'}
                                                    className="px-2 py-0.5 font-black disabled:opacity-30 cursor-pointer"
                                                    title="Büyüt"
                                                >
                                                    A+
                                                </button>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={toggleSpeakSourceText}
                                                className={cn(
                                                    "h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer",
                                                    isSpeakingSource
                                                        ? "bg-amber-500/20 text-amber-500"
                                                        : (isLightUi ? "hover:bg-slate-100 text-slate-700" : "hover:bg-white/10 text-slate-200")
                                                )}
                                            >
                                                {isSpeakingSource ? <VolumeX className="w-3.5 h-3.5 mr-1" /> : <Volume2 className="w-3.5 h-3.5 mr-1 text-violet-500" />}
                                                {isSpeakingSource ? 'Durdur' : 'Sesli Oku'}
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleCopySourceText}
                                                className={cn("h-7 px-2 text-xs rounded-lg cursor-pointer", isLightUi ? "hover:bg-slate-100 text-slate-700" : "hover:bg-white/10 text-slate-300")}
                                            >
                                                <Copy className="w-3.5 h-3.5 mr-1 text-teal-500" /> Kopyala
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            if (!isEditingSourceText) setEditableSourceText(sourceText);
                                            setIsEditingSourceText(prev => !prev);
                                        }}
                                        className={cn("h-7 px-2.5 text-xs rounded-lg font-bold cursor-pointer", isLightUi ? "border-teal-300 text-teal-700 hover:bg-teal-50" : "border-white/15 text-teal-300 hover:bg-teal-500/20")}
                                    >
                                        {isEditingSourceText ? 'Okuma Modu' : 'Düzenle'}
                                    </Button>
                                </div>
                            </div>

                            {/* Metin İçi Arama */}
                            {!isEditingSourceText && sourceText && (
                                <div className="pt-2.5">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={sourceSearchQuery}
                                            onChange={e => setSourceSearchQuery(e.target.value)}
                                            placeholder="Metin içinde kelime ara ve vurgula..."
                                            className={cn(
                                                "w-full h-8 pl-8 pr-8 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/40",
                                                isLightUi ? "bg-white border-slate-200 text-slate-900" : "bg-white/5 border-white/15 text-white placeholder:text-slate-500"
                                            )}
                                        />
                                        {sourceSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSourceSearchQuery('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* İçerik */}
                            <div className="flex-grow overflow-y-auto my-3 pr-1 scrollbar-thin">
                                {isEditingSourceText ? (
                                    <div className="space-y-3 h-full flex flex-col">
                                        <Textarea
                                            value={editableSourceText}
                                            onChange={(e) => setEditableSourceText(e.target.value)}
                                            placeholder="Bu konuya ait ders kitabı veya kaynak metnini buraya yapıştırın..."
                                            className={cn(
                                                "min-h-[360px] flex-grow font-sans text-sm leading-relaxed p-4 rounded-xl resize-y",
                                                isLightUi ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-white/15 text-white"
                                            )}
                                        />
                                        <Button
                                            onClick={handleSaveSourceText}
                                            disabled={isSavingSourceText}
                                            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold h-10 rounded-xl cursor-pointer"
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
                                    <div className={cn(
                                        "p-5 rounded-2xl border whitespace-pre-wrap font-sans selection:bg-teal-500/30",
                                        sizeClassMap[sourceTextSize],
                                        isLightUi ? "bg-white border-slate-200 text-slate-800 shadow-xs" : "bg-white/[0.03] border-white/10 text-slate-200"
                                    )}>
                                        {renderHighlightedSource(sourceText, sourceSearchQuery)}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                                        <BookOpen className="w-12 h-12 text-slate-500" />
                                        <p className={cn("text-sm font-medium", isLightUi ? "text-slate-600" : "text-slate-400")}>
                                            Bu konuya ait kayıtlı kaynak metin bulunamadı.
                                        </p>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setEditableSourceText('');
                                                setIsEditingSourceText(true);
                                            }}
                                            className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer"
                                        >
                                            + Kaynak Metin Ekle
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                    );
                })()}
            </AnimatePresence>

            {/* ══ 5. CANLI ÇİZİM, BEYAZ TAHTA & NOT ALMA ARACI ══ */}
            <PresentationDrawingBoard
                isOpen={isDrawingOpen}
                onClose={() => setIsDrawingOpen(false)}
                isDarkMode={presentationTheme !== 'sketchnote' && presentationTheme !== 'clean-light'}
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
                presentationTheme={presentationTheme}
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