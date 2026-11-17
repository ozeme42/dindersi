'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Lightbulb, CheckCircle2, 
    Timer, Play, Pause, RotateCcw, 
    Eye, EyeOff, Trophy, Maximize2, Minimize2, Award, 
    HelpCircle, X, Check, BookOpen, PenTool, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import type { OpenEndedQuestionsStep, OpenEndedQuestionItem } from '@/lib/types';
import { useAuth } from '@/context/auth-context';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

// 🎨 3D Arcade Kart Temaları (Arcade Modu Seçildiğinde)
const QUESTION_CARD_THEMES = [
    {
        container: 'bg-slate-900/75 border-4 border-emerald-400 border-b-[8px] border-b-emerald-600 shadow-[0_8px_25px_rgba(16,185,129,0.25)]',
        header: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_3px_0_#065f46]',
        badge: 'bg-emerald-300 text-slate-950 border border-emerald-200 font-black',
        label: '1. Soru • Kolay',
        hintBox: 'bg-amber-500/15 border-2 border-amber-400/50 text-amber-200',
        answerBox: 'bg-emerald-500/20 border-2 border-emerald-400/60 text-emerald-100',
        activeGlow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'
    },
    {
        container: 'bg-slate-900/75 border-4 border-amber-400 border-b-[8px] border-b-amber-600 shadow-[0_8px_25px_rgba(245,158,11,0.25)]',
        header: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-[0_3px_0_#b45309]',
        badge: 'bg-amber-300 text-slate-950 border border-amber-200 font-black',
        label: '2. Soru • Orta',
        hintBox: 'bg-amber-500/15 border-2 border-amber-400/50 text-amber-200',
        answerBox: 'bg-amber-500/20 border-2 border-amber-400/60 text-amber-100',
        activeGlow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]'
    },
    {
        container: 'bg-slate-900/75 border-4 border-rose-400 border-b-[8px] border-b-rose-600 shadow-[0_8px_25px_rgba(244,63,94,0.25)]',
        header: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-[0_3px_0_#9f1239]',
        badge: 'bg-rose-300 text-slate-950 border border-rose-200 font-black',
        label: '3. Soru • Biraz Zor',
        hintBox: 'bg-amber-500/15 border-2 border-amber-400/50 text-amber-200',
        answerBox: 'bg-rose-500/20 border-2 border-rose-400/60 text-rose-100',
        activeGlow: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.4)]'
    }
];

// ⭐ Sevimli Göz Kırpan Başparmak Yıldız Maskotu (Görseldeki Gibi)
function WinkingStarMascot({ className = "w-16 h-16 sm:w-20 sm:h-20" }: { className?: string }) {
    return (
        <svg viewBox="0 0 120 120" className={cn("overflow-visible filter drop-shadow-md select-none", className)}>
            {/* Sol Başparmak Havada Eli (Thumbs Up) */}
            <g transform="translate(4, 40) rotate(-10)">
                <path
                    d="M18 22 C18 12, 26 6, 30 8 C33 9, 34 14, 32 20 L35 20 C38 20, 40 22, 39 25 C40 26, 40 28, 38 30 C39 31, 39 33, 37 35 C38 36, 37 38, 34 39 L22 39 C16 39, 12 34, 12 28 C12 24, 15 22, 18 22 Z"
                    fill="#FFDF5D"
                    stroke="#4A2E14"
                    strokeWidth="3.2"
                    strokeLinejoin="round"
                />
                <path d="M22 25 L28 25 M22 30 L27 30 M22 35 L26 35" stroke="#D9930D" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* 5 Köşeli Tombik Yıldız Gövdesi */}
            <path
                d="M 68 12 
                   C 71 12, 75 22, 80 29 
                   C 88 30, 102 33, 105 38 
                   C 107 43, 99 52, 94 58 
                   C 96 66, 100 80, 96 85 
                   C 92 89, 81 83, 73 78 
                   C 65 83, 53 88, 49 84 
                   C 45 80, 49 66, 51 58 
                   C 46 52, 38 43, 40 38 
                   C 43 33, 56 30, 64 29 
                   C 66 22, 65 12, 68 12 Z"
                fill="#FFDE59"
                stroke="#4A2E14"
                strokeWidth="3.6"
                strokeLinejoin="round"
            />

            {/* Pembe Yanaklar */}
            <ellipse cx="56" cy="55" rx="5" ry="3.5" fill="#FF8BA7" opacity="0.85" />
            <ellipse cx="86" cy="55" rx="5" ry="3.5" fill="#FF8BA7" opacity="0.85" />

            {/* Sol Göz (Açık ve Parlak Çizgi Film Gözü) */}
            <ellipse cx="60" cy="46" rx="4.2" ry="5.8" fill="#2A170A" />
            <circle cx="61.5" cy="44.5" r="1.8" fill="#FFFFFF" />

            {/* Sağ Göz (Sevimli Göz Kırpma ⌒) */}
            <path
                d="M 79 48 Q 84.5 41 90 48"
                fill="none"
                stroke="#2A170A"
                strokeWidth="3.8"
                strokeLinecap="round"
            />

            {/* Neşeli Gülümseme */}
            <path
                d="M 66 54 Q 73 64 80 54"
                fill="#801414"
                stroke="#2A170A"
                strokeWidth="3.2"
                strokeLinecap="round"
            />
            {/* Dil */}
            <path
                d="M 69 58 Q 73 64 77 58"
                fill="#FF6B8B"
            />

            {/* Kaşlar */}
            <path d="M 57 37 Q 61 35 65 38" fill="none" stroke="#4A2E14" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 79 38 Q 84 35 88 38" fill="none" stroke="#4A2E14" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

// ✏️ Sağ Alt Köşedeki Kırmızı Kurşun Kalem İllüstrasyonu
function RedPencilIllustration({ className = "w-32 sm:w-44 md:w-52" }: { className?: string }) {
    return (
        <svg viewBox="0 0 200 60" className={cn("overflow-visible select-none filter drop-shadow-xl", className)}>
            <defs>
                <linearGradient id="pencilWood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
                <linearGradient id="pencilBody" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F87171" />
                    <stop offset="35%" stopColor="#DC2626" />
                    <stop offset="70%" stopColor="#B91C1C" />
                    <stop offset="100%" stopColor="#7F1D1D" />
                </linearGradient>
                <linearGradient id="pencilFerrule" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F1F5F9" />
                    <stop offset="50%" stopColor="#94A3B8" />
                    <stop offset="100%" stopColor="#64748B" />
                </linearGradient>
                <linearGradient id="pencilEraser" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FBCFE8" />
                    <stop offset="50%" stopColor="#F472B6" />
                    <stop offset="100%" stopColor="#DB2777" />
                </linearGradient>
            </defs>

            {/* Pembe Silgi */}
            <path d="M 175 18 L 190 18 C 196 18, 198 42, 190 42 L 175 42 Z" fill="url(#pencilEraser)" stroke="#4A2E14" strokeWidth="2.5" />
            
            {/* Gümüş Metal Bilezik (Ferrule) */}
            <rect x="156" y="17" width="20" height="26" rx="2" fill="url(#pencilFerrule)" stroke="#4A2E14" strokeWidth="2.5" />
            <line x1="162" y1="17" x2="162" y2="43" stroke="#475569" strokeWidth="1.5" />
            <line x1="169" y1="17" x2="169" y2="43" stroke="#475569" strokeWidth="1.5" />

            {/* Kırmızı Altıgen Kalem Gövdesi */}
            <rect x="42" y="17" width="116" height="26" fill="url(#pencilBody)" stroke="#4A2E14" strokeWidth="2.5" />
            {/* Işık ve gölge çizgileri */}
            <line x1="42" y1="24" x2="158" y2="24" stroke="#FECACA" strokeWidth="1.5" opacity="0.85" />
            <line x1="42" y1="35" x2="158" y2="35" stroke="#450A0A" strokeWidth="2" opacity="0.5" />

            {/* Açılmış Ahşap Koni */}
            <polygon points="42,17 42,43 14,30" fill="url(#pencilWood)" stroke="#4A2E14" strokeWidth="2.5" strokeLinejoin="round" />

            {/* Grafit Kurşun Uç */}
            <polygon points="22,26.5 22,33.5 12,30" fill="#18181B" stroke="#4A2E14" strokeWidth="1.5" />
        </svg>
    );
}

// 🎊 Sol Üst Köşe Renkli Konfeti Parçacıkları
function ConfettiDecors() {
    return (
        <svg viewBox="0 0 160 80" className="w-24 sm:w-36 h-12 sm:h-18 overflow-visible select-none pointer-events-none">
            {/* Mavi şeritler */}
            <rect x="10" y="12" width="6" height="14" rx="2" fill="#38BDF8" transform="rotate(25 10 12)" />
            <rect x="45" y="6" width="5" height="12" rx="1.5" fill="#0284C7" transform="rotate(-30 45 6)" />
            <rect x="80" y="18" width="6" height="13" rx="2" fill="#38BDF8" transform="rotate(15 80 18)" />

            {/* Pembe / Kırmızı şeritler */}
            <rect x="25" y="24" width="6" height="13" rx="2" fill="#F43F5E" transform="rotate(-40 25 24)" />
            <rect x="65" y="8" width="5" height="12" rx="1.5" fill="#FB7185" transform="rotate(35 65 8)" />

            {/* Sarı üçgenler & pullar */}
            <polygon points="35,10 40,18 30,18" fill="#FACC15" transform="rotate(15 35 14)" />
            <polygon points="95,12 100,20 90,20" fill="#FACC15" transform="rotate(-20 95 16)" />

            {/* Yeşil noktalar & pullar */}
            <circle cx="20" cy="8" r="3" fill="#10B981" />
            <circle cx="55" cy="22" r="3" fill="#34D399" />
            <polygon points="75,22 80,30 70,30" fill="#10B981" transform="rotate(45 75 26)" />

            {/* Turuncu süsler */}
            <rect x="110" y="8" width="5" height="14" rx="2" fill="#F97316" transform="rotate(-15 110 8)" />
        </svg>
    );
}

// 📎 Sol Kenardaki Spiralli Cilt Halkaları (Notebook Binder Coils)
function SpiralBinderRings({ count = 18 }: { count?: number }) {
    return (
        <div className="absolute left-1.5 sm:left-3 md:left-4 top-4 bottom-4 w-7 sm:w-9 flex flex-col justify-between pointer-events-none z-20 select-none">
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="relative w-full h-4 sm:h-5 flex items-center">
                    {/* Delik (Koyu delik kesiti) */}
                    <div className="w-4 sm:w-5 h-2.5 sm:h-3 rounded-full bg-[#3B2516] border border-[#23150B]/60 shadow-inner translate-x-1" />
                    {/* Metalik Spiral Halka */}
                    <div className="absolute -left-1 sm:-left-2 w-6 sm:w-7 h-3.5 sm:h-4 rounded-full border-[2.5px] sm:border-[3px] border-slate-300 shadow-[0_2px_4px_rgba(0,0,0,0.35)] bg-gradient-to-r from-slate-400 via-white to-slate-400 -rotate-12" />
                </div>
            ))}
        </div>
    );
}

export function OpenEndedQuestionsPlayer({
    step,
    isFullscreen: propIsFullscreen,
    fontSizeScale = 'normal',
    presentationTheme = 'clean-light',
    presentationFont = 'playfair'
}: {
    step: OpenEndedQuestionsStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
    presentationFont?: string;
}) {
    const isTeacher = useTeacherMode();
    const containerRef = useRef<HTMLDivElement>(null);

    // Bağımsız Tam Ekran State'i
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));

    // Tema Seçimi: Görseldeki 'notebook' (Spiralli Çizgili Defter) varsayılan temadır!
    const [activeTheme, setActiveTheme] = useState<'notebook' | 'arcade'>('notebook');

    // Canlı Font Büyütme/Küçültme Seviyesi (0: Normal, 1: Büyük, 2: Çok Büyük, 3: Dev Tahta)
    const initialLevel = fontSizeScale === 'huge' || fontSizeScale === 'xl' ? 3 :
                         fontSizeScale === 'lg' ? 2 : 1;
    const [fontLevel, setFontLevel] = useState<number>(initialLevel);

    useEffect(() => {
        if (typeof propIsFullscreen === 'boolean') {
            setIsFullscreen(propIsFullscreen);
        }
    }, [propIsFullscreen]);

    // Tarayıcı Tam Ekran Toggle
    const toggleFullscreen = async () => {
        try {
            if (!isFullscreen) {
                if (containerRef.current?.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                }
                setIsFullscreen(true);
            } else {
                if (document.fullscreenElement && document.exitFullscreen) {
                    await document.exitFullscreen();
                }
                setIsFullscreen(false);
            }
        } catch (err) {
            console.error('Tam ekran hatası:', err);
            setIsFullscreen(!isFullscreen);
        }
    };

    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Sorular (Varsayılan veya Konuya Özel)
    const questions: OpenEndedQuestionItem[] = useMemo(() => {
        if (Array.isArray(step.questions) && step.questions.length > 0) {
            return step.questions;
        }
        return [
            {
                question: 'Tahiyyat duası senin için ne anlam ifade ediyor?',
                hint: 'Duanın selam, rahmet ve evrensel kardeşlik anlamını düşünün.',
                modelAnswer: 'Tahiyyat duası, Allah’a saygımızı, Peygamberimize bağlılığımızı ve tüm inananlara esenlik dileğimizi ifade eder.',
                keywords: ['Selam', 'Rahmet', 'Kardeşlik'],
                difficulty: 'kolay'
            },
            {
                question: 'Günde 5 kez tüm evrene selam göndermek sana nasıl hissettiriyor?',
                hint: 'Namazın her oturuşunda tüm salih kullara edilen duaları hatırlayın.',
                modelAnswer: 'Bütün kainatla ve mümin kardeşlerimizle manevi bir bağ kurmamızı ve huzur hissetmemizi sağlar.',
                keywords: ['Huzur', 'Birlik', 'Selam'],
                difficulty: 'orta'
            },
            {
                question: 'Düşüncelerini bir cümleyle kendi defterine yaz ve arkadaşlarınla paylaş! 📝',
                hint: 'Kendi samimi cümlelerinle defterine not et.',
                modelAnswer: 'Namazdaki selamlaşma, kalbimi tüm dünyaya sevgiyle açmamı sağlar.',
                keywords: ['Defter', 'Paylaşım', 'Fikir'],
                difficulty: 'zor'
            }
        ];
    }, [step.questions]);

    // Her soru için ayrı açık/kapalı state'leri
    const [showHints, setShowHints] = useState<{ [idx: number]: boolean }>({});
    const [showAnswers, setShowAnswers] = useState<{ [idx: number]: boolean }>({});
    const [answeredStatus, setAnsweredStatus] = useState<{ [idx: number]: boolean }>({});

    // Timer State
    const defaultDuration = step.timerSeconds && step.timerSeconds > 0 ? step.timerSeconds : 90;
    const [timeLeft, setTimeLeft] = useState(defaultDuration);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsTimerRunning(false);
                        playSound('win');
                        import('canvas-confetti').then(m => {
                            m.default({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
                        }).catch(() => {});
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning, timeLeft]);

    const toggleHint = (idx: number) => {
        playSound('pop');
        setShowHints(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const toggleAnswer = (idx: number) => {
        playSound('pop');
        setShowAnswers(prev => {
            const nextState = !prev[idx];
            if (nextState) {
                import('canvas-confetti').then(m => {
                    m.default({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
                }).catch(() => {});
            }
            return { ...prev, [idx]: nextState };
        });
    };

    const toggleAnswered = (idx: number) => {
        playSound('pop');
        setAnsweredStatus(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const handleTimerToggle = () => {
        playSound('pop');
        setIsTimerRunning(!isTimerRunning);
    };

    const handleTimerReset = () => {
        playSound('pop');
        setIsTimerRunning(false);
        setTimeLeft(defaultDuration);
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const toggleAllHints = () => {
        playSound('pop');
        const anyClosed = questions.some((_, i) => !showHints[i]);
        const newState: { [k: number]: boolean } = {};
        questions.forEach((_, i) => { newState[i] = anyClosed; });
        setShowHints(newState);
    };

    const toggleAllAnswers = () => {
        playSound('pop');
        const anyClosed = questions.some((_, i) => !showAnswers[i]);
        const newState: { [k: number]: boolean } = {};
        questions.forEach((_, i) => { newState[i] = anyClosed; });
        setShowAnswers(newState);
        if (anyClosed) {
            import('canvas-confetti').then(m => {
                m.default({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
            }).catch(() => {});
        }
    };

    // Dinamik Font Boyutu Hesaplayıcıları
    const getQuestionTextClass = () => {
        switch (fontLevel) {
            case 0: return "text-base sm:text-lg md:text-xl leading-relaxed";
            case 1: return "text-lg sm:text-xl md:text-2xl leading-relaxed";
            case 2: return "text-xl sm:text-2xl md:text-3xl leading-snug";
            case 3: return "text-2xl sm:text-3xl md:text-4xl leading-tight font-extrabold";
            default: return "text-lg sm:text-xl md:text-2xl leading-relaxed";
        }
    };

    const getDetailTextClass = () => {
        switch (fontLevel) {
            case 0: return "text-sm sm:text-base leading-relaxed";
            case 1: return "text-base sm:text-lg leading-relaxed";
            case 2: return "text-lg sm:text-xl leading-relaxed";
            case 3: return "text-xl sm:text-2xl leading-normal";
            default: return "text-base sm:text-lg leading-relaxed";
        }
    };

    const fontLevelLabel = fontLevel === 0 ? 'N' :
                           fontLevel === 1 ? 'L' :
                           fontLevel === 2 ? 'XL' : 'XXL';

    // Üst Tebrik & Özet Metinleri
    const celebrationTitle = step.title && step.title !== 'openEndedQuestions' 
        ? step.title 
        : "Harika bir iş çıkardın!";
    
    const celebrationSummary = step.description || 
        "Tahiyyat duasının tüm evreni kucaklayan bir selamlaşma olduğunu başarıyla öğrendik.";

    // Defterde kalan boş çizgilerin sayısı
    const fillerLinesCount = Math.max(3, 7 - questions.length);

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative flex flex-col w-full overflow-hidden select-none transition-all duration-300 font-sans",
                activeTheme === 'notebook'
                    ? "bg-[#251E17] text-slate-900"
                    : "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white",
                isFullscreen 
                    ? "fixed inset-0 z-[100] p-2 sm:p-5 w-full h-full overflow-y-auto" 
                    : "w-full h-full rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl p-2 sm:p-4"
            )}
        >
            {/* ══ 1. ÜST HUD / KONTROL BARI (Akıllı Tahta Araçları) ══ */}
            <div className={cn(
                "w-full max-w-6xl mx-auto mb-3 p-2.5 sm:p-3.5 rounded-2xl border shadow-lg flex flex-wrap items-center justify-between gap-2 z-30 transition-all shrink-0",
                activeTheme === 'notebook'
                    ? "bg-[#3A2A1E]/95 border-[#785135] text-amber-100"
                    : "bg-slate-900/90 border-white/15 text-white"
            )}>
                {/* Sol: İkon & Başlık */}
                <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                    <div className={cn(
                        "p-2 rounded-xl shrink-0 border",
                        activeTheme === 'notebook' ? "bg-amber-500/20 border-amber-400/40 text-amber-300" : "bg-cyan-500/20 border-cyan-400/40 text-cyan-300"
                    )}>
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-black truncate block text-amber-200">
                            Açık Uçlu Düşünme & Değerlendirme
                        </span>
                        <span className="text-[11px] text-amber-200/70 hidden sm:block truncate">
                            Öğrenci Defteri • Akıllı Tahta Tartışma Adımı
                        </span>
                    </div>
                </div>

                {/* Sağ: Kontroller */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-wrap">
                    {/* 🎨 TEMA DEĞİŞTİRİCİ (Defter / Arcade) */}
                    <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10 text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setActiveTheme('notebook'); }}
                            className={cn(
                                "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                                activeTheme === 'notebook' ? "bg-amber-500 text-slate-950 font-black shadow-md" : "text-amber-200/80 hover:text-white"
                            )}
                            title="Defter Teması"
                        >
                            <PenTool className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Defter</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setActiveTheme('arcade'); }}
                            className={cn(
                                "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                                activeTheme === 'arcade' ? "bg-cyan-500 text-slate-950 font-black shadow-md" : "text-amber-200/80 hover:text-white"
                            )}
                            title="Arcade Kartlar"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Arcade</span>
                        </button>
                    </div>

                    {/* 🔍 YAZI BOYUTU (A- / A+) CANLI BÜYÜTÜCÜ 🔍 */}
                    <div className="flex items-center bg-black/40 px-1 py-0.5 rounded-xl border border-white/15 text-xs font-black shadow-inner">
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setFontLevel(prev => Math.max(0, prev - 1)); }}
                            disabled={fontLevel === 0}
                            className="px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-25 cursor-pointer font-bold active:scale-95"
                            title="Yazı Boyutunu Küçült (A-)"
                        >
                            A-
                        </button>
                        <span className="px-1.5 sm:px-2 text-[10px] sm:text-xs text-amber-300 whitespace-nowrap font-black">
                            {fontLevelLabel}
                        </span>
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setFontLevel(prev => Math.min(3, prev + 1)); }}
                            disabled={fontLevel === 3}
                            className="px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-25 cursor-pointer font-black active:scale-95"
                            title="Yazı Boyutunu Büyüt (A+)"
                        >
                            A+
                        </button>
                    </div>

                    {/* Toplu İpucu & Çözüm (Öğretmen) */}
                    {isTeacher && (
                        <>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={toggleAllHints}
                                className="rounded-xl text-xs font-bold gap-1 h-8 px-2 sm:px-2.5 text-amber-300 hover:text-white hover:bg-white/10 border border-amber-500/30 hidden lg:flex"
                                title="Tüm İpuçlarını Aç / Gizle"
                            >
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                <span>İpuçları</span>
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={toggleAllAnswers}
                                className="rounded-xl text-xs font-bold gap-1 h-8 px-2 sm:px-2.5 text-cyan-300 hover:text-white hover:bg-white/10 border border-cyan-500/30 cursor-pointer hidden lg:flex"
                                title="Tüm Çözümleri Aç / Gizle"
                            >
                                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Çözümler</span>
                            </Button>
                        </>
                    )}

                    {/* Süre Sayacı */}
                    <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-xl border text-xs font-black",
                        timeLeft <= 10 && timeLeft > 0
                            ? "bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse"
                            : "bg-black/40 border-white/15 text-amber-300"
                    )}>
                        <Timer className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-mono text-xs">{formatTime(timeLeft)}</span>
                        <button
                            type="button"
                            onClick={handleTimerToggle}
                            className="p-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer ml-0.5"
                            title={isTimerRunning ? 'Duraklat' : 'Başlat'}
                        >
                            {isTimerRunning ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                        </button>
                        <button
                            type="button"
                            onClick={handleTimerReset}
                            className="p-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                            title="Sıfırla"
                        >
                            <RotateCcw className="w-2.5 h-2.5 text-slate-400" />
                        </button>
                    </div>

                    {/* ══ TAM EKRAN BUTONU ══ */}
                    <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={toggleFullscreen}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl h-8 px-2.5 sm:px-3.5 gap-1.5 text-xs shadow-md shadow-emerald-900/30 cursor-pointer"
                        title={isFullscreen ? 'Tam Ekrandan Çık (Esc)' : 'Akıllı Tahta Tam Ekran'}
                    >
                        {isFullscreen ? (
                            <>
                                <Minimize2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Küçült</span>
                            </>
                        ) : (
                            <>
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Tam Ekran</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════════════
               ══ 2. ANA ALAN: SPİRALLİ ÇİZGİLİ DEFTER TEMASI (Görselin Birebir Aynısı) ══
               ══════════════════════════════════════════════════════════════════════════════ */}
            {activeTheme === 'notebook' ? (
                <div className="relative w-full max-w-6xl mx-auto my-auto flex-1 flex flex-col justify-center">
                    
                    {/* Dış Deri / Kraft Defter Kapağı (Brown Border Frame) */}
                    <div className="relative w-full rounded-[28px] sm:rounded-[36px] bg-[#C59B6D] p-2.5 sm:p-4 md:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.55)] border-[3.5px] sm:border-[4.5px] border-[#7A4E2B]">
                        
                        {/* Sol Kenardaki Spiralli Metal Cilt */}
                        <SpiralBinderRings count={18} />

                        {/* İç Krem Çizgili Defter Sayfası (Ruled Paper Sheet) */}
                        <div className="relative w-full rounded-[18px] sm:rounded-[26px] bg-[#FFFDF7] border-2 sm:border-[2.5px] border-[#6D4C3D] pl-12 sm:pl-18 md:pl-24 pr-4 sm:pr-8 md:pr-12 pt-5 sm:pt-7 pb-8 sm:pb-12 shadow-[inset_0_0_15px_rgba(180,150,110,0.15)] overflow-hidden">
                            
                            {/* ── A. ÜST TEBRİK & KONU ÖZETİ KUTUSU (Görseldeki Beyaz Kart) ── */}
                            <div className="relative w-full rounded-2xl border-2 sm:border-[2.5px] border-[#5A3E2C] bg-white p-3.5 sm:p-5 md:p-6 shadow-sm mb-5 sm:mb-7">
                                
                                {/* Sol Üst Köşedeki Renkli Konfetiler */}
                                <div className="absolute -top-3.5 -left-3.5 sm:-top-4 sm:-left-4 pointer-events-none">
                                    <ConfettiDecors />
                                </div>

                                {/* Başlık & Açıklama */}
                                <div className="pr-14 sm:pr-24">
                                    <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-[#2B1B10] flex items-center gap-1.5 sm:gap-2 tracking-tight">
                                        <span>{celebrationTitle}</span>
                                        <span className="text-xl sm:text-3xl">🎉</span>
                                    </h2>
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-base md:text-lg lg:text-xl font-bold text-[#442E20] leading-relaxed">
                                        {celebrationSummary}
                                    </p>
                                </div>

                                {/* Sağ Üst Köşedeki Göz Kırpan Başparmak Yıldız Maskotu ⭐ 👍 */}
                                <div className="absolute -top-1.5 right-1.5 sm:top-1 sm:right-3">
                                    <WinkingStarMascot className="w-14 h-14 sm:w-20 sm:h-20 md:w-22 md:h-22" />
                                </div>
                            </div>

                            {/* ── B. "ŞİMDİ SIRA SENDE..." BAŞLIĞI ── */}
                            <div className="mb-2 sm:mb-3">
                                <h3 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-[#2B1B10] tracking-tight">
                                    Şimdi sıra sende...
                                </h3>
                            </div>

                            {/* ── C. DEFTER ÇİZGİLERİ ÜZERİNDEKİ SORULAR ── */}
                            <div className="flex flex-col">
                                {questions.map((q, idx) => {
                                    const isHintOpen = Boolean(showHints[idx]);
                                    const isAnswerOpen = Boolean(showAnswers[idx]);
                                    const isDone = Boolean(answeredStatus[idx]);

                                    return (
                                        <div 
                                            key={idx}
                                            className="relative border-b-2 border-[#D8C7A5] py-2 sm:py-3 transition-colors hover:bg-amber-500/5 group"
                                        >
                                            <div className="flex items-start justify-between gap-2 sm:gap-4">
                                                {/* Soru Metni */}
                                                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                                                    <span 
                                                        onClick={() => toggleAnswered(idx)}
                                                        className={cn(
                                                            "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm font-black border transition-all shrink-0 cursor-pointer select-none mt-0.5",
                                                            isDone 
                                                                ? "bg-emerald-500 border-emerald-600 text-white shadow-sm" 
                                                                : "bg-[#F3E7D3] border-[#D8C7A5] text-[#6D4C3D] hover:bg-emerald-100"
                                                        )}
                                                        title="Tartışıldı / Yanıtlandı olarak işaretle"
                                                    >
                                                        {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : `${idx + 1}`}
                                                    </span>

                                                    <p className={cn(
                                                        "font-bold text-[#2B1B10] tracking-tight transition-all",
                                                        getQuestionTextClass(),
                                                        isDone && "line-through opacity-70"
                                                    )}>
                                                        {q.question}
                                                    </p>
                                                </div>

                                                {/* Soru Aksiyonları: İpucu & Çözüm Butonları */}
                                                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                                    {q.hint && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleHint(idx)}
                                                            className={cn(
                                                                "px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-xs font-black border transition-all cursor-pointer flex items-center gap-1 active:scale-95",
                                                                isHintOpen 
                                                                    ? "bg-amber-400 text-slate-950 border-amber-500 shadow-sm" 
                                                                    : "bg-white text-amber-900 border-[#D8C7A5] hover:bg-amber-100"
                                                            )}
                                                            title="İpucunu Aç / Kapat"
                                                        >
                                                            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                                                            <span className="hidden sm:inline">İpucu</span>
                                                        </button>
                                                    )}

                                                    {isTeacher && q.modelAnswer && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleAnswer(idx)}
                                                            className={cn(
                                                                "px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-xs font-black border transition-all cursor-pointer flex items-center gap-1 active:scale-95",
                                                                isAnswerOpen 
                                                                    ? "bg-emerald-500 text-white border-emerald-600 shadow-sm" 
                                                                    : "bg-white text-emerald-900 border-[#D8C7A5] hover:bg-emerald-100"
                                                            )}
                                                            title="Öğretmen Modu: Örnek Cevabı Aç / Kapat"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span className="hidden sm:inline">Cevap</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Açılan Post-it / Not Panelleri */}
                                            <AnimatePresence>
                                                {isHintOpen && q.hint && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -6, height: 0 }}
                                                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                        exit={{ opacity: 0, y: -6, height: 0 }}
                                                        className="mt-2 p-2.5 sm:p-3 rounded-xl bg-[#FEF08A] text-[#713F12] border-2 border-[#EAB308]/60 shadow-md rotate-[-0.5deg] font-medium text-xs sm:text-sm md:text-base flex items-start gap-2"
                                                    >
                                                        <Lightbulb className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <span className="font-black text-amber-900 block mb-0.5">💡 İpucu:</span>
                                                            <p>{q.hint}</p>
                                                        </div>
                                                        <button onClick={() => toggleHint(idx)} className="text-amber-800 hover:text-amber-950 p-0.5">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </motion.div>
                                                )}

                                                {isAnswerOpen && q.modelAnswer && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -6, height: 0 }}
                                                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                        exit={{ opacity: 0, y: -6, height: 0 }}
                                                        className="mt-2 p-2.5 sm:p-3 rounded-xl bg-[#DCFCE7] text-[#14532D] border-2 border-[#22C55E]/60 shadow-md rotate-[0.5deg] font-medium text-xs sm:text-sm md:text-base flex items-start gap-2"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <span className="font-black text-emerald-900 block mb-0.5">👁️ Örnek Çözüm / Yaklaşım:</span>
                                                            <p>{q.modelAnswer}</p>
                                                            {q.keywords && q.keywords.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                                    {q.keywords.map((kw, ki) => (
                                                                        <span key={ki} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                                                                            #{kw}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => toggleAnswer(idx)} className="text-emerald-800 hover:text-emerald-950 p-0.5">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}

                                {/* ── D. DEVAM EDEN BOŞ ÇİZGİLER (Görseldeki Gerçek Defter Çizgileri) ── */}
                                {Array.from({ length: fillerLinesCount }).map((_, fIdx) => (
                                    <div 
                                        key={fIdx} 
                                        className="w-full border-b-2 border-[#D8C7A5]/70 h-7 sm:h-9 md:h-11 flex items-center justify-end pr-4 text-xs font-mono text-[#D8C7A5]/40 select-none"
                                    >
                                        {/* Boş Defter Çizgisi */}
                                    </div>
                                ))}
                            </div>

                            {/* ── E. SAĞ ALT KÖŞEDEKİ KIRMIZI KURŞUN KALEM ── */}
                            <div className="absolute -bottom-3 -right-2 sm:-bottom-5 sm:-right-4 pointer-events-none z-10 rotate-[-35deg]">
                                <RedPencilIllustration className="w-28 sm:w-40 md:w-48" />
                            </div>

                        </div>
                    </div>
                </div>
            ) : (
                /* ══════════════════════════════════════════════════════════════════════════════
                   ══ 3. ARCADE KARTLARI MODU (Alternatif Seçenek Olarak Korundu) ══
                   ══════════════════════════════════════════════════════════════════════════════ */
                <div className="w-full max-w-6xl mx-auto my-auto flex-1 flex flex-col justify-center">
                    <div className={cn(
                        "grid gap-3 sm:gap-4 lg:gap-5 overflow-y-auto p-1 items-stretch",
                        questions.length === 1 ? "grid-cols-1 max-w-4xl mx-auto" :
                        questions.length === 2 ? "grid-cols-1 md:grid-cols-2" :
                        "grid-cols-1 md:grid-cols-3"
                    )}>
                        {questions.map((q, idx) => {
                            const theme = QUESTION_CARD_THEMES[idx % QUESTION_CARD_THEMES.length];
                            const isHintOpen = Boolean(showHints[idx]);
                            const isAnswerOpen = Boolean(showAnswers[idx]);

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: idx * 0.08 }}
                                    className={cn(
                                        "flex flex-col rounded-3xl transition-all duration-300 overflow-hidden relative justify-between",
                                        theme.container,
                                        theme.activeGlow
                                    )}
                                >
                                    {/* Kart Başlığı */}
                                    <div className={cn(
                                        "shrink-0 flex items-center justify-between px-4 py-3 transition-all",
                                        theme.header
                                    )}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base sm:text-lg">🎯</span>
                                            <h3 className="font-black text-sm sm:text-base md:text-lg tracking-tight truncate drop-shadow-md">
                                                {theme.label}
                                            </h3>
                                        </div>
                                        <span className={cn(
                                            "text-xs px-2.5 py-0.5 rounded-full shadow-xs",
                                            theme.badge
                                        )}>
                                            Soru {idx + 1}
                                        </span>
                                    </div>

                                    {/* Soru Gövdesi */}
                                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20 text-white font-black text-sm">
                                                ?
                                            </div>
                                            <p className={cn(
                                                "font-black text-white leading-relaxed drop-shadow-sm flex-1",
                                                getQuestionTextClass()
                                            )}>
                                                {q.question}
                                            </p>
                                        </div>

                                        {/* İpucu Kutusu */}
                                        <AnimatePresence>
                                            {isHintOpen && q.hint && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className={cn("p-3 rounded-2xl", theme.hintBox)}
                                                >
                                                    <span className="text-xs font-black block mb-1">💡 İpucu:</span>
                                                    <p className={getDetailTextClass()}>{q.hint}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Cevap Kutusu */}
                                        <AnimatePresence>
                                            {isAnswerOpen && q.modelAnswer && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className={cn("p-3 rounded-2xl", theme.answerBox)}
                                                >
                                                    <span className="text-xs font-black block mb-1">👁️ Örnek Çözüm:</span>
                                                    <p className={getDetailTextClass()}>{q.modelAnswer}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Kart Alt Butonları */}
                                    <div className="p-3 bg-black/40 border-t border-white/10 flex items-center justify-between gap-2">
                                        {q.hint ? (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => toggleHint(idx)}
                                                className="text-xs font-bold text-amber-300 hover:text-white hover:bg-white/10"
                                            >
                                                <Lightbulb className="w-3.5 h-3.5 mr-1" />
                                                {isHintOpen ? 'Gizle' : 'İpucu'}
                                            </Button>
                                        ) : <div />}

                                        {isTeacher && q.modelAnswer && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => toggleAnswer(idx)}
                                                className="text-xs font-bold text-cyan-300 hover:text-white hover:bg-white/10"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                {isAnswerOpen ? 'Kapat' : 'Çözüm'}
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
