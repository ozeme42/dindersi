'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Lightbulb, CheckCircle2, 
    Timer, Play, Pause, RotateCcw, 
    Eye, EyeOff, Trophy, Maximize2, Minimize2, Award, 
    HelpCircle, X, Check, BookOpen, PenTool, LayoutGrid, MessageSquare
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
        activeGlow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]'
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

// 📓 Başlık Yanındaki Özel Çizimli Not Defteri ve Kalem İkonu
function NotebookHeaderIcon({ className = "w-11 h-11 sm:w-14 sm:h-14 shrink-0" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Defter Gövdesi */}
            <rect x="10" y="10" width="34" height="44" rx="3" fill="#EAE6DF" stroke="#3D2817" strokeWidth="2.5"/>
            <rect x="10" y="10" width="31" height="44" rx="3" fill="#F7F5F0" stroke="#3D2817" strokeWidth="2.5"/>
            {/* Üst Spiral Halkalar */}
            <path d="M16 6V13M22 6V13M28 6V13M34 6V13" stroke="#3D2817" strokeWidth="2.5" strokeLinecap="round"/>
            {/* Defter Satır Çizgileri */}
            <line x1="16" y1="21" x2="34" y2="21" stroke="#3D2817" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="16" y1="28" x2="32" y2="28" stroke="#3D2817" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="16" y1="35" x2="29" y2="35" stroke="#3D2817" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="16" y1="42" x2="26" y2="42" stroke="#3D2817" strokeWidth="2.2" strokeLinecap="round"/>
            {/* Çapraz Kalem */}
            <g transform="translate(46, 15) rotate(42)">
                {/* Silgi */}
                <rect x="0" y="0" width="8" height="6" rx="1.5" fill="#F06A5A" stroke="#3D2817" strokeWidth="2.2"/>
                {/* Metal Kısım */}
                <rect x="0" y="5" width="8" height="4" fill="#D5D8DC" stroke="#3D2817" strokeWidth="2"/>
                {/* Sarı Gövde */}
                <rect x="0" y="9" width="8" height="22" fill="#F8C63D" stroke="#3D2817" strokeWidth="2.2"/>
                {/* Kalem Ucu */}
                <path d="M0 31L4 39L8 31H0Z" fill="#F3D2B3" stroke="#3D2817" strokeWidth="2.2" strokeLinejoin="round"/>
                <path d="M2.5 36L4 39L5.5 36H2.5Z" fill="#3D2817"/>
            </g>
        </svg>
    );
}

// ✏️ Sağ Alt Köşe Gülen Yüzlü Mavi-Turuncu Kalem İllüstrasyonu
function SmilingPencilMascot({ className = "w-36 h-38 sm:w-44 sm:h-48" }: { className?: string }) {
    return (
        <svg viewBox="0 0 165 175" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Kalem Ucundan Çıkan Kıvrımlı Çizgi */}
            <path d="M22 162 C 45 172, 72 166, 92 158 C 110 150, 128 153, 146 160" 
                  stroke="#4a2c11" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

            {/* Çapraz Duran Sevimli Kalem */}
            <g transform="translate(115, 22) rotate(36)">
                {/* Üstteki Gülen Yüzlü Başlık */}
                <circle cx="15" cy="14" r="13" fill="#FFD166" stroke="#3D2817" strokeWidth="2.6"/>
                {/* Saç / Tepe Kıvrımı */}
                <path d="M12 1.5C13 -1 17 -1 18 1.5" stroke="#3D2817" strokeWidth="2.4" strokeLinecap="round"/>
                {/* Gözler (Mutlu kavisli) */}
                <path d="M9 12C10 10 12 10 13 12" stroke="#3D2817" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M17 12C18 10 20 10 21 12" stroke="#3D2817" strokeWidth="2.2" strokeLinecap="round"/>
                {/* Yanaklar */}
                <circle cx="8" cy="15.5" r="2" fill="#F4845F" opacity="0.7"/>
                <circle cx="22" cy="15.5" r="2" fill="#F4845F" opacity="0.7"/>
                {/* Gülümseme */}
                <path d="M11.5 16.5C13 19.5 17 19.5 18.5 16.5" stroke="#3D2817" strokeWidth="2.2" strokeLinecap="round"/>

                {/* Turuncu Boyun Halkası */}
                <rect x="6" y="26" width="18" height="8" rx="3" fill="#F77F00" stroke="#3D2817" strokeWidth="2.5"/>

                {/* Mavi Kalem Gövdesi */}
                <rect x="5" y="34" width="20" height="62" rx="3" fill="#219EBC" stroke="#3D2817" strokeWidth="2.6"/>
                {/* Gövde Parlama Efekti */}
                <line x1="10" y1="40" x2="10" y2="88" stroke="#8ECAE6" strokeWidth="3" strokeLinecap="round"/>

                {/* Kalem Klipsi */}
                <path d="M25 38H29C30.5 38 31.5 39 31.5 40.5V66C31.5 67.5 30.5 68.5 29 68.5H25" 
                      fill="#FB8500" stroke="#3D2817" strokeWidth="2.4" strokeLinejoin="round"/>

                {/* Turuncu Tutma Yeri (Grip) */}
                <rect x="4.5" y="94" width="21" height="28" rx="4" fill="#FB8500" stroke="#3D2817" strokeWidth="2.6"/>
                {/* Tutma Yeri Çizgileri */}
                <line x1="8" y1="102" x2="22" y2="102" stroke="#3D2817" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="108" x2="22" y2="108" stroke="#3D2817" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="114" x2="22" y2="114" stroke="#3D2817" strokeWidth="2" strokeLinecap="round"/>

                {/* Metalik Koni Uç */}
                <path d="M6 122L11 138H19L24 122H6Z" fill="#B0C4DE" stroke="#3D2817" strokeWidth="2.5" strokeLinejoin="round"/>
                {/* Kalem Bilye Ucu */}
                <path d="M12 138L15 145L18 138H12Z" fill="#3D2817" stroke="#3D2817" strokeWidth="1.5" strokeLinejoin="round"/>
            </g>
        </svg>
    );
}

// 📎 Sol Kenardaki 14 Adet Gerçekçi Metalik Spiral Halkalar
function SpiralRingsColumn({ count = 14 }: { count?: number }) {
    return (
        <div className="spiral-container" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="spiral-unit">
                    <div className="spiral-hole" />
                    <div className="spiral-wire" />
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

    // Tema Seçimi: 'notebook' (Görselin Birebir Aynısı) varsayılan
    const [activeTheme, setActiveTheme] = useState<'notebook' | 'arcade'>('notebook');

    // Canlı Font Büyütme/Küçültme Seviyesi (0: Normal, 1: Büyük, 2: Çok Büyük, 3: Dev Tahta)
    const initialLevel = fontSizeScale === 'huge' || fontSizeScale === 'xl' ? 2 :
                         fontSizeScale === 'lg' ? 2 : 1;
    const [fontLevel, setFontLevel] = useState<number>(initialLevel);

    // Kullanıcı Notları (Post-it) ve Cevap Çizgileri State'leri
    const [userStickyNotes, setUserStickyNotes] = useState<{ [idx: number]: string }>({});
    const [userAnswers, setUserAnswers] = useState<{ [idx: number]: string }>({});

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
                question: 'Hz. Peygamber’in gençlerle kurduğu iletişimde seni en çok hangi özellik etkiledi? Neden?',
                hint: 'Gençlere verdiği değer, güven ve samimi yaklaşımı hatırlayın.',
                modelAnswer: 'Gençlere sorumluluk vermesi ve onları dikkatle dinlemesi beni çok etkiledi.',
                difficulty: 'orta'
            },
            {
                question: 'Bugün ailene veya arkadaşlarına karşı yaptığın ufak bir hatayı nasıl telafi edebilirsin? (Hemen bir iyilik düşün!)',
                hint: 'Özür dilemek, tebessüm etmek veya güzel bir söz söylemek ilk adımdır.',
                modelAnswer: 'Hemen gidip gönlünü alabilir ve ona yardımcı olacak bir iyilik yapabilirim.',
                difficulty: 'kolay'
            }
        ];
    }, [step.questions]);

    // Her soru için ayrı açık/kapalı state'leri
    const [showHints, setShowHints] = useState<{ [idx: number]: boolean }>({});
    const [showAnswers, setShowAnswers] = useState<{ [idx: number]: boolean }>({});
    const [answeredStatus, setAnsweredStatus] = useState<{ [idx: number]: boolean }>({});

    // Timer State
    const defaultDuration = step.timerSeconds && step.timerSeconds > 0 ? step.timerSeconds : 120;
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

    // Dinamik Font Boyutu Hesaplayıcıları
    const getQuestionTextClass = () => {
        switch (fontLevel) {
            case 0: return "text-base sm:text-lg md:text-xl";
            case 1: return "text-lg sm:text-[1.35rem] md:text-2xl";
            case 2: return "text-xl sm:text-2xl md:text-3xl font-extrabold";
            case 3: return "text-2xl sm:text-3xl md:text-4xl font-black";
            default: return "text-lg sm:text-[1.35rem] md:text-2xl";
        }
    };

    const fontLevelLabel = fontLevel === 0 ? 'N' :
                           fontLevel === 1 ? 'L' :
                           fontLevel === 2 ? 'XL' : 'XXL';

    // Üst Başlık Metni
    const pageTitle = step.title && step.title !== 'openEndedQuestions' 
        ? step.title 
        : "Kendi Öğrenme Günlüğün";

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative flex flex-col w-full min-h-full items-stretch justify-start select-none transition-all duration-300 font-sans",
                isFullscreen 
                    ? "fixed inset-0 z-[100] pl-7 sm:pl-9 pr-3 sm:pr-5 py-3 w-full h-full overflow-y-auto" 
                    : "w-full h-full rounded-2xl md:rounded-3xl pl-7 sm:pl-9 pr-2 sm:pr-4 py-2 overflow-y-auto"
            )}
            style={{
                backgroundColor: '#f4f1ea',
                backgroundImage: `
                    linear-gradient(to right, rgba(210, 203, 190, 0.45) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(210, 203, 190, 0.45) 1px, transparent 1px)
                `,
                backgroundSize: '28px 28px',
                fontFamily: "'Quicksand', sans-serif"
            }}
        >
            {/* ══ STYLES (Kullanıcının Verdiği CSS Kuralları) ══ */}
            <style dangerouslySetInnerHTML={{ __html: `
                .notebook-page {
                    background-color: #faf9f6;
                    box-shadow: 
                        0 10px 30px rgba(0, 0, 0, 0.08),
                        4px 0 0 #f2efe9,
                        5px 0 2px rgba(0,0,0,0.06),
                        9px 0 0 #eae6de,
                        10px 0 4px rgba(0,0,0,0.08);
                    border: 1px solid #e6e2d8;
                    position: relative;
                }

                .title-font {
                    font-family: 'Fredoka', cursive, sans-serif;
                    color: #4a2c11;
                    letter-spacing: 0.5px;
                }

                .question-text {
                    color: #4a2c11;
                    font-weight: 700;
                    line-height: 1.45;
                }

                .sticky-yellow {
                    background: linear-gradient(180deg, #fae042 0%, #fae042 18%, #fdf078 18%, #fcf07e 100%);
                    box-shadow: -3px 6px 12px rgba(0, 0, 0, 0.14);
                    transform: rotate(-5.5deg);
                    transition: transform 0.25s ease, box-shadow 0.25s ease;
                }
                .sticky-yellow:hover {
                    transform: rotate(-3deg) scale(1.02);
                    box-shadow: -5px 10px 18px rgba(0, 0, 0, 0.18);
                }

                .sticky-green {
                    background: linear-gradient(180deg, #98ee55 0%, #98ee55 18%, #b3f778 18%, #b6f87d 100%);
                    box-shadow: -3px 6px 12px rgba(0, 0, 0, 0.14);
                    transform: rotate(-5.5deg);
                    transition: transform 0.25s ease, box-shadow 0.25s ease;
                }
                .sticky-green:hover {
                    transform: rotate(-3deg) scale(1.02);
                    box-shadow: -5px 10px 18px rgba(0, 0, 0, 0.18);
                }

                .sticky-pink {
                    background: linear-gradient(180deg, #f472b6 0%, #f472b6 18%, #fbcfe8 18%, #fce7f3 100%);
                    box-shadow: -3px 6px 12px rgba(0, 0, 0, 0.14);
                    transform: rotate(-5.5deg);
                    transition: transform 0.25s ease, box-shadow 0.25s ease;
                }
                .sticky-pink:hover {
                    transform: rotate(-3deg) scale(1.02);
                    box-shadow: -5px 10px 18px rgba(0, 0, 0, 0.18);
                }

                .dotted-lines-area {
                    background-image: radial-gradient(circle, #5c432c 1.25px, transparent 1.35px);
                    background-size: 7px 36px;
                    background-position: 0 28px;
                    line-height: 36px;
                    color: #3d2511;
                    font-weight: 600;
                    resize: none;
                    outline: none;
                    width: 100%;
                    background-color: transparent;
                }

                .sticky-textarea {
                    background: transparent;
                    border: none;
                    outline: none;
                    resize: none;
                    width: 100%;
                    height: 78%;
                    margin-top: 18%;
                    padding: 12px;
                    color: #4a2c11;
                    font-weight: 600;
                    font-size: 0.95rem;
                    line-height: 1.35;
                }
                .sticky-textarea::placeholder {
                    color: rgba(74, 44, 17, 0.35);
                }

                .spiral-container {
                    position: absolute;
                    left: -24px;
                    top: 28px;
                    bottom: 28px;
                    width: 54px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    pointer-events: none;
                    z-index: 20;
                }

                .spiral-unit {
                    position: relative;
                    height: 22px;
                    width: 100%;
                    display: flex;
                    align-items: center;
                }

                .spiral-hole {
                    position: absolute;
                    right: 4px;
                    width: 15px;
                    height: 15px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 35% 35%, #555 0%, #2a2a2a 70%, #111 100%);
                    box-shadow: inset 1px 2px 3px rgba(0,0,0,0.8), 0 1px 1px rgba(255,255,255,0.8);
                }

                .spiral-wire {
                    position: absolute;
                    left: 2px;
                    width: 44px;
                    height: 12px;
                    border-radius: 10px;
                    background: linear-gradient(180deg, 
                        #6e6e6e 0%, 
                        #d8d8d8 22%, 
                        #ffffff 42%, 
                        #8c8c8c 65%, 
                        #4a4a4a 90%, 
                        #222222 100%);
                    box-shadow: 0 3px 4px rgba(0, 0, 0, 0.35);
                    transform: rotate(-3deg);
                }

                .spiral-wire::after {
                    content: '';
                    position: absolute;
                    top: 5px;
                    left: 2px;
                    right: 2px;
                    height: 3px;
                    border-radius: 4px;
                    background: linear-gradient(90deg, rgba(40,40,40,0.7), rgba(255,255,255,0.6), rgba(40,40,40,0.7));
                }

                @media (max-width: 768px) {
                    .spiral-container {
                        left: -18px;
                        width: 40px;
                    }
                    .spiral-wire {
                        width: 32px;
                        height: 10px;
                    }
                    .spiral-hole {
                        width: 12px;
                        height: 12px;
                    }
                }
            `}} />

            {/* ══ 1. ÜST KONTROL ÇUBUĞU (AKILLI TAHTA KONTROLLERİ) ══ */}
            <div className="w-full mb-3 px-3 py-2 rounded-2xl bg-white/90 backdrop-blur-md border border-[#D8C7A5] shadow-md flex items-center justify-between gap-2 z-30 shrink-0 text-[#4a2c11]">
                {/* Sol: Rozet */}
                <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 text-xs font-black">
                        📝 Açık Uçlu Soru
                    </span>
                    <span className="text-xs font-bold hidden sm:inline text-[#6d4c3d]">
                        Kendi Öğrenme Günlüğün • Sınıf Tartışması
                    </span>
                </div>

                {/* Sağ: Tema, Font, Sayaç ve Tam Ekran */}
                <div className="flex items-center gap-2">
                    {/* Canlı Font Ölçekleyici (A- / A+) */}
                    <div className="flex items-center bg-[#F4F1EA] px-1 py-0.5 rounded-xl border border-[#D8C7A5] text-xs font-black shadow-inner">
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setFontLevel(prev => Math.max(0, prev - 1)); }}
                            disabled={fontLevel === 0}
                            className="px-2 py-0.5 rounded-lg hover:bg-amber-200/60 text-[#4a2c11] disabled:opacity-30 cursor-pointer font-bold active:scale-95"
                            title="Yazıyı Küçült (A-)"
                        >
                            A-
                        </button>
                        <span className="px-1.5 text-[11px] text-amber-900 font-black">
                            {fontLevelLabel}
                        </span>
                        <button
                            type="button"
                            onClick={() => { playSound('pop'); setFontLevel(prev => Math.min(3, prev + 1)); }}
                            disabled={fontLevel === 3}
                            className="px-2 py-0.5 rounded-lg hover:bg-amber-200/60 text-[#4a2c11] disabled:opacity-30 cursor-pointer font-black active:scale-95"
                            title="Yazıyı Büyüt (A+)"
                        >
                            A+
                        </button>
                    </div>

                    {/* Süre Sayacı */}
                    <div className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-black",
                        timeLeft <= 10 && timeLeft > 0
                            ? "bg-rose-100 border-rose-400 text-rose-800 animate-pulse"
                            : "bg-[#F4F1EA] border-[#D8C7A5] text-[#4a2c11]"
                    )}>
                        <Timer className="w-3.5 h-3.5 text-amber-700" />
                        <span className="font-mono text-xs font-black">{formatTime(timeLeft)}</span>
                        <button
                            type="button"
                            onClick={handleTimerToggle}
                            className="p-0.5 rounded hover:bg-amber-200/50 cursor-pointer ml-0.5"
                            title={isTimerRunning ? 'Duraklat' : 'Başlat'}
                        >
                            {isTimerRunning ? <Pause className="w-3 h-3 text-amber-800" /> : <Play className="w-3 h-3 text-emerald-700" />}
                        </button>
                        <button
                            type="button"
                            onClick={handleTimerReset}
                            className="p-0.5 rounded hover:bg-amber-200/50 cursor-pointer"
                            title="Sıfırla"
                        >
                            <RotateCcw className="w-2.5 h-2.5 text-slate-500" />
                        </button>
                    </div>

                    {/* Tam Ekran Butonu */}
                    <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={toggleFullscreen}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl h-8 px-3 gap-1.5 text-xs shadow-md cursor-pointer"
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

            {/* ══ 2. ANA DEFTER KONTEYNERİ (Görselin Birebir Aynısı - Sağa Sola Tam Yaslı) ══ */}
            <main className="notebook-page w-full rounded-sm pl-8 sm:pl-14 pr-4 sm:pr-10 pt-8 sm:pt-10 pb-16 sm:pb-24 my-2 relative">
                
                {/* Sol Kenar Spiral Halkalar (Tam 14 adet) */}
                <SpiralRingsColumn count={14} />

                {/* Üst Başlık ve İkon */}
                <header className="flex items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10 pt-1">
                    <h1 className="title-font text-3xl sm:text-5xl font-bold text-center select-none">
                        {pageTitle}
                    </h1>
                    
                    {/* Başlık Yanındaki Özel Çizimli Not Defteri ve Kalem İkonu */}
                    <NotebookHeaderIcon className="w-11 h-11 sm:w-14 sm:h-14 shrink-0" />
                </header>

                {/* İçerik Bölümü: Sorular (Sol Post-it + Sağ Soru & Noktalı Çizgiler) */}
                <div className="space-y-10 sm:space-y-12">
                    {questions.map((q, idx) => {
                        const isHintOpen = Boolean(showHints[idx]);
                        const isAnswerOpen = Boolean(showAnswers[idx]);
                        const isDone = Boolean(answeredStatus[idx]);

                        // Post-it renk sınıfları: 1. Sarı, 2. Yeşil, 3. Pembe/Sarı
                        const stickyClass = idx === 0 
                            ? "sticky-yellow" 
                            : (idx === 1 ? "sticky-green" : "sticky-pink");

                        const stickyPlaceholder = idx === 0 
                            ? "Kısa notun..." 
                            : (idx === 1 ? "İyilik notun..." : "Fikir notun...");

                        return (
                            <section key={idx} className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-10 relative">
                                
                                {/* Sol Yapışkan Not (Post-it) */}
                                <div className={cn(stickyClass, "w-44 h-44 sm:w-52 sm:h-52 shrink-0 rounded-[2px] relative group")}>
                                    <textarea 
                                        className="sticky-textarea" 
                                        placeholder={stickyPlaceholder}
                                        value={userStickyNotes[idx] || ''}
                                        onChange={(e) => setUserStickyNotes(prev => ({ ...prev, [idx]: e.target.value }))}
                                        aria-label={`${idx + 1}. yapışkan not alanı`}
                                    />

                                    {/* Post-it Üzerinde İpucu Varsa Minik Buton */}
                                    {q.hint && (
                                        <button
                                            type="button"
                                            onClick={() => toggleHint(idx)}
                                            className="absolute top-1.5 right-2 text-xs font-black p-1 rounded-md text-[#713f12] hover:bg-black/10 transition-colors"
                                            title="İpucunu Aç / Kapat"
                                        >
                                            💡
                                        </button>
                                    )}
                                </div>

                                {/* Sağ Soru ve Noktalı Satırlar */}
                                <div className="w-full pt-1 sm:pt-3 flex-1 min-w-0 pr-0 sm:pr-14">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <h2 className={cn(
                                            "question-text transition-all",
                                            getQuestionTextClass(),
                                            isDone && "line-through opacity-70"
                                        )}>
                                            {q.question}
                                        </h2>

                                        {/* Tamamlandı / Tartışıldı Butonu */}
                                        <button
                                            type="button"
                                            onClick={() => toggleAnswered(idx)}
                                            className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border transition-all shrink-0 cursor-pointer mt-1",
                                                isDone 
                                                    ? "bg-emerald-600 border-emerald-700 text-white shadow-sm" 
                                                    : "bg-[#F3E7D3] border-[#D8C7A5] text-[#4a2c11] hover:bg-emerald-100"
                                            )}
                                            title="Tartışıldı olarak işaretle"
                                        >
                                            {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : `${idx + 1}`}
                                        </button>
                                    </div>

                                    {/* Dotted Lines Yazı Alanı */}
                                    <textarea 
                                        rows={3} 
                                        className="dotted-lines-area text-base sm:text-lg md:text-xl font-bold" 
                                        placeholder="Düşüncelerini buraya yaz..."
                                        value={userAnswers[idx] || ''}
                                        onChange={(e) => setUserAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                                        aria-label={`${idx + 1}. soru cevabı`}
                                    />

                                    {/* İpucu & Öğretmen Örnek Çözüm Açılır Panelleri */}
                                    <div className="flex items-center gap-2 mt-2">
                                        {q.hint && (
                                            <button
                                                type="button"
                                                onClick={() => toggleHint(idx)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs font-black border transition-all flex items-center gap-1 cursor-pointer",
                                                    isHintOpen 
                                                        ? "bg-amber-300 text-amber-950 border-amber-400 shadow-sm" 
                                                        : "bg-white text-amber-900 border-[#D8C7A5] hover:bg-amber-100"
                                                )}
                                            >
                                                <Lightbulb className="w-3.5 h-3.5 text-amber-700" />
                                                <span>{isHintOpen ? 'İpucunu Kapat' : 'İpucu'}</span>
                                            </button>
                                        )}

                                        {isTeacher && q.modelAnswer && (
                                            <button
                                                type="button"
                                                onClick={() => toggleAnswer(idx)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs font-black border transition-all flex items-center gap-1 cursor-pointer",
                                                    isAnswerOpen 
                                                        ? "bg-emerald-500 text-white border-emerald-600 shadow-sm" 
                                                        : "bg-white text-emerald-900 border-[#D8C7A5] hover:bg-emerald-100"
                                                )}
                                            >
                                                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                                <span>{isAnswerOpen ? 'Cevabı Gizle' : 'Örnek Cevap'}</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* İpucu Paneli */}
                                    <AnimatePresence>
                                        {isHintOpen && q.hint && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4, height: 0 }}
                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                exit={{ opacity: 0, y: -4, height: 0 }}
                                                className="mt-3 p-3 rounded-xl bg-[#FEF08A] text-[#713F12] border-2 border-[#EAB308]/60 shadow-md font-medium text-xs sm:text-sm flex items-start gap-2"
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
                                                initial={{ opacity: 0, y: -4, height: 0 }}
                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                exit={{ opacity: 0, y: -4, height: 0 }}
                                                className="mt-3 p-3 rounded-xl bg-[#DCFCE7] text-[#14532D] border-2 border-[#22C55E]/60 shadow-md font-medium text-xs sm:text-sm flex items-start gap-2"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <span className="font-black text-emerald-900 block mb-0.5">👁️ Örnek Cevap:</span>
                                                    <p>{q.modelAnswer}</p>
                                                </div>
                                                <button onClick={() => toggleAnswer(idx)} className="text-emerald-800 hover:text-emerald-950 p-0.5">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </section>
                        );
                    })}
                </div>

                {/* Sağ Alt Köşe: Düşünen Çocuk Maskotu */}
                <div className="hidden sm:flex items-end justify-end absolute bottom-3 right-4 sm:right-6 pointer-events-none select-none z-10" aria-hidden="true">
                    <img 
                        src="/images/thinking-boy.png" 
                        alt="Düşünen Çocuk" 
                        className="w-[110px] sm:w-[130px] md:w-[150px] lg:w-[170px] h-auto object-contain drop-shadow-xl select-none pointer-events-none transition-transform duration-300 hover:scale-105"
                    />
                </div>

            </main>
        </div>
    );
}
