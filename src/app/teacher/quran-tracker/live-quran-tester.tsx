'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Volume2,
    VolumeX,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    HelpCircle,
    Save,
    Loader2,
    RotateCcw,
    Sparkles,
    Keyboard,
    Search,
    BookOpen,
    Sun,
    Moon,
    Maximize2,
    Minimize2,
    LayoutGrid,
    Check,
    X,
    Trash2,
    Award,
    Flame,
    GraduationCap
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ELIFBA_STAGES, ALL_ELIFBA_STAGES, ElifbaStage, getStageItemAssetUrls } from "@/lib/elifba-curriculum";
import { saveStudentQuranProgress, type QuranStudentProgress } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";

// 29 Temel Harfin Otantik İsimleri ve Mahreçleri (Elifba Entegrasyonu)
const CUZ1_LETTER_META: Record<number, { name: string; arabic: string; desc: string }> = {
    1: { name: 'Elif', arabic: 'ا', desc: 'Boğaz sonu - "E" sesi gibidir' },
    2: { name: 'Be', arabic: 'ب', desc: 'Alt ve üst dudak - "B" sesi gibidir' },
    3: { name: 'Te', arabic: 'ت', desc: 'Dil ucu ile ön diş dipleri - "T" sesi gibidir' },
    4: { name: 'Se (Peltek)', arabic: 'ث', desc: 'Dil ucu ile ön diş uçları - Peltek "S"' },
    5: { name: 'Cim', arabic: 'ج', desc: 'Dil ortası ve üst damak - "C" sesi' },
    6: { name: 'Ha', arabic: 'ح', desc: 'Boğaz ortası - Hırıltısız temiz "H"' },
    7: { name: 'Hı', arabic: 'خ', desc: 'Boğazın ağza en yakın kısmı - Hırıltılı "H"' },
    8: { name: 'Dal', arabic: 'د', desc: 'Dil ucu ile üst ön diş dipleri - "D" sesi' },
    9: { name: 'Zel (Peltek)', arabic: 'ذ', desc: 'Dil ucu ile ön diş uçları - Peltek "Z"' },
    10: { name: 'Ra', arabic: 'ر', desc: 'Dil ucu ile ön damak - "R" sesi' },
    11: { name: 'Ze', arabic: 'ز', desc: 'Dil ucu ile alt dişler - Keskin "Z" sesi' },
    12: { name: 'Sin', arabic: 'س', desc: 'Dil ucu ile alt dişler - Keskin "S" sesi' },
    13: { name: 'Şın', arabic: 'ش', desc: 'Dil ortası ve üst damak - Yumuşak "Ş" sesi' },
    14: { name: 'Sad', arabic: 'ص', desc: 'Dil ucu ile alt ön dişler - Kalın "S" sesi (Sa)' },
    15: { name: 'Dad', arabic: 'ض', desc: 'Dil kenarı ve üst azı dişler - Kalın harf' },
    16: { name: 'Tı', arabic: 'ط', desc: 'Dil ucu ile üst diş dipleri - Kalın "T" sesi (Ta)' },
    17: { name: 'Zı (Peltek)', arabic: 'ظ', desc: 'Dil ucu ve ön diş uçları - Kalın Peltek "Z"' },
    18: { name: 'Ayn', arabic: 'ع', desc: 'Boğaz ortası sıkılarak çıkarılan boğaz harfi' },
    19: { name: 'Gayn', arabic: 'غ', desc: 'Boğazın ağza en yakın kısmı - Yumuşak "G"' },
    20: { name: 'Fe', arabic: 'ف', desc: 'Üst ön dişler ve alt dudak - "F" sesi' },
    21: { name: 'Kaf', arabic: 'ق', desc: 'Dil kökü ve küçük dil - Kalın "K" sesi (Ka)' },
    22: { name: 'Kef', arabic: 'ك', desc: 'Dil kökü önü - İnce "K" sesi (Ke)' },
    23: { name: 'Lam', arabic: 'ل', desc: 'Dil ucu ve üst damak - "L" sesi' },
    24: { name: 'Mim', arabic: 'م', desc: 'Alt ve üst dudak kapanarak - "M" sesi' },
    25: { name: 'Nun', arabic: 'ن', desc: 'Dil ucu ve iki üst ön diş eti - "N" sesi' },
    26: { name: 'Vav', arabic: 'و', desc: 'Dudaklar ileri uzatılarak - "V" sesi' },
    27: { name: 'He', arabic: 'ه', desc: 'Boğaz sonu / Göğüs - Hafif "H" sesi' },
    28: { name: 'Lamelif', arabic: 'لا', desc: 'Lam (ل) ve Elif (ا) harflerinin birleşimi' },
    29: { name: 'Ye', arabic: 'ى', desc: 'Dil ortası ve üst damak - "Y" sesi' },
};

// Fiziksel Kart Tema Renkleri
const CARD_COLOR_THEMES = [
    { border: 'border-amber-400', glow: 'shadow-amber-500/20', headerGradient: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white', footerBg: 'bg-amber-50/70', badgeBg: 'bg-amber-500 text-slate-950' },
    { border: 'border-emerald-400', glow: 'shadow-emerald-500/20', headerGradient: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white', footerBg: 'bg-emerald-50/70', badgeBg: 'bg-emerald-500 text-white' },
    { border: 'border-cyan-400', glow: 'shadow-cyan-500/20', headerGradient: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white', footerBg: 'bg-cyan-50/70', badgeBg: 'bg-cyan-500 text-white' },
    { border: 'border-rose-400', glow: 'shadow-rose-500/20', headerGradient: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white', footerBg: 'bg-rose-50/70', badgeBg: 'bg-rose-500 text-white' },
    { border: 'border-violet-400', glow: 'shadow-violet-500/20', headerGradient: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white', footerBg: 'bg-violet-50/70', badgeBg: 'bg-violet-500 text-white' },
];

interface LiveQuranTesterProps {
    isOpen: boolean;
    onClose: () => void;
    student: UserProfile | null;
    allStudents: UserProfile[];
    onSelectStudent: (student: UserProfile) => void;
    currentProgress?: QuranStudentProgress;
    initialStageId?: string;
    classId: string;
    className: string;
    branch: string;
    onProgressSaved?: () => void;
}

// Ses Sentezleyici (Doğru / Yanlış / Yardım Efektleri)
const playFeedbackChime = (type: 'correct' | 'wrong' | 'help') => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (type === 'correct') {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'triangle';
            osc2.type = 'sine';

            osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5

            osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.05); // E5
            osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.25); // C6

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start();
            osc2.start(ctx.currentTime + 0.05);
            osc1.stop(ctx.currentTime + 0.35);
            osc2.stop(ctx.currentTime + 0.35);
        } else if (type === 'wrong') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.2);

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } else {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        }
    } catch {
        // AudioContext engellenirse sessiz kal
    }
};

export function LiveQuranTester({
    isOpen,
    onClose,
    student,
    allStudents,
    onSelectStudent,
    currentProgress,
    initialStageId,
    classId,
    className,
    branch,
    onProgressSaved
}: LiveQuranTesterProps) {
    const { toast } = useToast();
    
    // Aktif Aşama
    const [selectedStageId, setSelectedStageId] = useState<string>(initialStageId || 'harfler');
    const [currentItemIndex, setCurrentItemIndex] = useState<number>(1);
    
    // Kart Görünümü: 'light' (Temiz Beyaz Hat Kartı - Varsayılan) | 'dark' (Karanlık Stüdyo Tablet)
    const [cardTheme, setCardTheme] = useState<'light' | 'dark'>('light');

    // Görünüm Modu: 'flashcard' (Büyük Kart) | 'grid' (Tüm Harfler / Pano)
    const [mode, setMode] = useState<'flashcard' | 'grid'>('flashcard');
    const [gridFilter, setGridFilter] = useState<'all' | '+' | '-' | 'o' | 'empty'>('all');

    // Tam Ekran Durumu
    const [isFullscreen, setIsFullscreen] = useState(false);
    const modalRef = useRef<HTMLDivElement | null>(null);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            modalRef.current?.requestFullscreen?.().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isDocFs = !!document.fullscreenElement;
            const isWinFs = typeof window !== 'undefined' && (
                window.innerHeight === window.screen.height && window.innerWidth === window.screen.width
            );
            setIsFullscreen(isDocFs || isWinFs);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('resize', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('resize', handleFullscreenChange);
        };
    }, []);

    // Öğrenci Hızlı Seçici Filtresi
    const [studentSearch, setStudentSearch] = useState('');
    const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);

    // Ayarlar
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [autoPlayAudio, setAutoPlayAudio] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Kart Değerlendirmeleri (1..itemCount => '+' | 'o' | '-')
    const [cardStatuses, setCardStatuses] = useState<{ [index: number]: '+' | 'o' | '-' }>({});

    // Ses Çalıcı Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const currentStage = useMemo(() => {
        return ALL_ELIFBA_STAGES.find(s => s.id === selectedStageId) || ALL_ELIFBA_STAGES[0];
    }, [selectedStageId]);

    // Başlangıç aşaması güncellendiğinde
    useEffect(() => {
        if (initialStageId) {
            setSelectedStageId(initialStageId);
        }
    }, [initialStageId]);

    // Aşama veya öğrenci değiştiğinde kart indexini 1'e al ve kayıtlı durumu yükle
    useEffect(() => {
        setCurrentItemIndex(1);
        setCardStatuses({});
    }, [selectedStageId, student?.uid]);

    // Mevcut kartın varlık URL'leri
    const currentAsset = useMemo(() => {
        return getStageItemAssetUrls(currentStage.id, currentItemIndex);
    }, [currentStage.id, currentItemIndex]);

    // Kart tema rengi
    const currentCardTheme = useMemo(() => {
        return CARD_COLOR_THEMES[currentItemIndex % CARD_COLOR_THEMES.length];
    }, [currentItemIndex]);

    // Orijinal Sesi Çal
    const playStageAudio = useCallback((itemIndex?: number) => {
        const targetIndex = itemIndex ?? currentItemIndex;
        const asset = getStageItemAssetUrls(currentStage.id, targetIndex);
        if (!asset?.audio) return;
        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            const audio = new Audio(asset.audio);
            audioRef.current = audio;
            audio.play().catch(e => console.log("Ses oynatılamadı:", e));
        } catch (e) {
            console.error("Audio error:", e);
        }
    }, [currentStage.id, currentItemIndex]);

    // Otomatik ses çal
    useEffect(() => {
        if (mode === 'flashcard' && autoPlayAudio && currentAsset?.audio) {
            playStageAudio();
        }
    }, [mode, currentItemIndex, autoPlayAudio, currentAsset?.audio, playStageAudio]);

    // İlerleme ve İstatistikler
    const stats = useMemo(() => {
        const total = currentStage.itemCount;
        const correct = Object.values(cardStatuses).filter(s => s === '+').length;
        const help = Object.values(cardStatuses).filter(s => s === 'o').length;
        const wrong = Object.values(cardStatuses).filter(s => s === '-').length;
        const evaluated = Object.keys(cardStatuses).length;
        const score = total > 0 ? Math.round(((correct + help * 0.5) / total) * 100) : 0;
        return { total, correct, help, wrong, evaluated, score };
    }, [cardStatuses, currentStage.itemCount]);

    // Kart Değerlendirme
    const handleMark = useCallback((status: '+' | 'o' | '-') => {
        setCardStatuses(prev => ({ ...prev, [currentItemIndex]: status }));

        if (soundEnabled) {
            if (status === '+') playFeedbackChime('correct');
            else if (status === 'o') playFeedbackChime('help');
            else playFeedbackChime('wrong');
        }

        // Sonraki karta geç (eğer son kart değilse)
        if (currentItemIndex < currentStage.itemCount) {
            setCurrentItemIndex(prev => prev + 1);
        }
    }, [currentItemIndex, currentStage.itemCount, soundEnabled]);

    // Pano / Izgara Filtrelenmiş Harf Listesi
    const filteredGridItems = useMemo(() => {
        const items = Array.from({ length: currentStage.itemCount }, (_, i) => i + 1);
        if (gridFilter === 'all') return items;
        return items.filter(num => {
            const st = cardStatuses[num] || null;
            if (gridFilter === 'empty') return st === null;
            return st === gridFilter;
        });
    }, [currentStage.itemCount, cardStatuses, gridFilter]);

    // Klavye Kısayolları
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'g') {
                e.preventDefault();
                setMode(prev => prev === 'flashcard' ? 'grid' : 'flashcard');
                return;
            }

            if (e.key.toLowerCase() === 'f') {
                e.preventDefault();
                toggleFullscreen();
                return;
            }

            if (e.key.toLowerCase() === 't') {
                e.preventDefault();
                setCardTheme(prev => prev === 'dark' ? 'light' : 'dark');
                return;
            }

            if (e.key.toLowerCase() === 'm') {
                e.preventDefault();
                setSoundEnabled(prev => !prev);
                return;
            }

            if (mode === 'flashcard') {
                if (e.key === '1' || e.key === 'q' || e.key === 'Q') {
                    e.preventDefault();
                    handleMark('+');
                } else if (e.key === '2' || e.key === 'w' || e.key === 'W') {
                    e.preventDefault();
                    handleMark('o');
                } else if (e.key === '3' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                    handleMark('-');
                } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                    e.preventDefault();
                    if (currentItemIndex < currentStage.itemCount) setCurrentItemIndex(prev => prev + 1);
                } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                    e.preventDefault();
                    if (currentItemIndex > 1) setCurrentItemIndex(prev => prev - 1);
                } else if (e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    playStageAudio();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, mode, currentItemIndex, currentStage.itemCount, handleMark, playStageAudio, toggleFullscreen]);

    // Sonuçları Kaydet
    const handleSaveProgress = async () => {
        if (!student) return;
        setIsSaving(true);

        const isPassed = stats.score >= 70;
        const status = isPassed ? 'completed' : 'in_progress';

        const res = await saveStudentQuranProgress({
            studentUid: student.uid,
            studentName: student.displayName || 'İsimsiz Öğrenci',
            studentNumber: student.studentNumber,
            classId,
            className,
            branch,
            stageId: currentStage.id,
            status,
            score: stats.score,
            passedCount: stats.correct,
            totalCount: stats.total,
            notes: `${stats.correct} doğru, ${stats.help} yardımla, ${stats.wrong} tekrar.`
        });

        if (res.success) {
            toast({
                title: isPassed ? "Tebrikler! Aşama Geçildi 🎉" : "İlerleme Kaydedildi",
                description: `${student.displayName} için ${currentStage.title} değerlendirmesi kaydedildi (Başarı: %${stats.score}).`
            });
            onProgressSaved?.();
        } else {
            toast({
                title: "Kayıt Hatası",
                description: res.error || "İlerleme kaydedilemedi.",
                variant: "destructive"
            });
        }
        setIsSaving(false);
    };

    // Filtrelenmiş Öğrenci Listesi
    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return allStudents;
        const q = studentSearch.toLocaleLowerCase('tr');
        return allStudents.filter(s =>
            (s.displayName || '').toLocaleLowerCase('tr').includes(q) ||
            (s.studentNumber || '').includes(q)
        );
    }, [allStudents, studentSearch]);

    const currentStudentIndex = useMemo(() => {
        if (!student) return 0;
        return allStudents.findIndex(s => s.uid === student.uid);
    }, [allStudents, student]);

    const handlePrevStudent = () => {
        if (currentStudentIndex > 0) {
            onSelectStudent(allStudents[currentStudentIndex - 1]);
        }
    };

    const handleNextStudent = () => {
        if (currentStudentIndex < allStudents.length - 1) {
            onSelectStudent(allStudents[currentStudentIndex + 1]);
        }
    };

    if (!student) return null;

    // Harf Aşaması Bilgisi (Cüz 1 ise)
    const letterMeta = (currentStage.id === 'harfler' || currentStage.id === 'cuz1') ? CUZ1_LETTER_META[currentItemIndex] : null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                ref={modalRef}
                className={cn(
                    "p-0 overflow-hidden bg-[#0a0f1d] border text-slate-100 flex flex-col shadow-2xl transition-all duration-200 select-none",
                    isFullscreen
                        ? "fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none border-none z-[100]"
                        : "w-[98vw] max-w-[1700px] h-[95vh] rounded-[2.5rem] border-2 border-white/10"
                )}
            >
                {/* Erişilebilirlik ve Radix UI gereksinimi için DialogTitle & Description */}
                <DialogHeader className="sr-only">
                    <DialogTitle>Canlı Kur&apos;an &amp; Harf Testi - {student.displayName}</DialogTitle>
                    <DialogDescription>
                        Öğrencinin Kur&apos;an-ı Kerim ve Elifba harf/kaide canlı sözlü okuma değerlendirmesi
                    </DialogDescription>
                </DialogHeader>
                
                {/* Arka Plan Glow Efektleri */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-900/15 rounded-full blur-[140px]" />
                    <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-900/15 rounded-full blur-[140px]" />
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 1. MODAL ÜST BAR: ÖĞRENCİ SEÇİCİ & AŞAMA & KONTROLLER */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className="relative z-10 flex flex-wrap items-center justify-between p-3 sm:p-4 px-4 sm:px-6 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl shrink-0 gap-3">
                    
                    {/* Sol: Öğrenci Seçici & Oklar */}
                    <div className="flex items-center gap-2">
                        <Popover open={isStudentPickerOpen} onOpenChange={setIsStudentPickerOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 hover:from-indigo-900/60 hover:to-purple-900/60 border border-indigo-500/30 text-white font-black text-sm sm:text-base transition-all group cursor-pointer shadow-md shadow-indigo-950/40"
                                >
                                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                                        {student.displayName?.charAt(0) || 'Ö'}
                                    </div>
                                    <span className="group-hover:text-indigo-300 transition-colors truncate max-w-[160px] sm:max-w-[220px]">
                                        {student.displayName}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] font-mono text-indigo-300 border-indigo-400/40 px-1.5 py-0">
                                        {currentStudentIndex + 1}/{allStudents.length}
                                    </Badge>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-3 bg-slate-900 border-white/15 text-white rounded-3xl shadow-2xl space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        placeholder="Öğrenci ara..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        className="h-8 pl-8 text-xs bg-slate-950 border-white/10 text-white rounded-xl"
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                    {filteredStudents.map((s, idx) => (
                                        <button
                                            key={s.uid}
                                            onClick={() => {
                                                onSelectStudent(s);
                                                setIsStudentPickerOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer",
                                                s.uid === student.uid
                                                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold"
                                                    : "hover:bg-white/5 text-slate-300"
                                            )}
                                        >
                                            <span className="truncate max-w-[180px]">{s.displayName}</span>
                                            <span className="text-[10px] opacity-60 font-mono">#{idx + 1}</span>
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Önceki / Sonraki Öğrenci Okları */}
                        <div className="flex items-center gap-0.5 bg-black/20 p-0.5 rounded-xl border border-white/10">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handlePrevStudent}
                                disabled={currentStudentIndex <= 0}
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                title="Önceki Öğrenci"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleNextStudent}
                                disabled={currentStudentIndex >= allStudents.length - 1}
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                title="Sonraki Öğrenci"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Orta: Görünüm Modu Seçici (Flaş Kart vs Pano) */}
                    <div className="flex items-center bg-black/30 p-1 rounded-2xl border border-white/10 shadow-inner shrink-0 text-xs">
                        <button
                            type="button"
                            onClick={() => setMode('flashcard')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer",
                                mode === 'flashcard'
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40"
                                    : "text-slate-400 hover:text-white"
                            )}
                            title="Flaş Kart Modu [P]"
                        >
                            <BookOpen className="w-3.5 h-3.5" /> Flaş Kart
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('grid')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer",
                                mode === 'grid'
                                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40"
                                    : "text-slate-400 hover:text-white"
                            )}
                            title="Tüm Harfler Pano Modu [G]"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" /> Tüm Harfler ({currentStage.itemCount})
                        </button>
                    </div>

                    {/* Sağ: Aşama Seçici + Kart Teması + Ses + Tam Ekran */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Aşama Seçici Dropdown */}
                        <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                            <SelectTrigger className="bg-slate-950 border-white/10 text-xs text-white font-bold h-8 rounded-xl min-w-[140px] max-w-[200px]">
                                <SelectValue placeholder="Aşama Seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white max-h-80 overflow-y-auto rounded-2xl">
                                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/80 sticky top-0">
                                    📖 Standart Müfredat (1-17)
                                </div>
                                {ELIFBA_STAGES.filter(s => s.category !== 'quran').map(stage => (
                                    <SelectItem key={stage.id} value={stage.id} className="text-xs font-semibold">
                                        {stage.title}
                                    </SelectItem>
                                ))}
                                <div className="px-2 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-slate-950/80 sticky top-0 mt-2 border-t border-white/10 pt-2">
                                    📜 Elifba Cüz Dersleri (1-28)
                                </div>
                                {ALL_ELIFBA_STAGES.filter(s => s.category === 'advanced').map(stage => (
                                    <SelectItem key={stage.id} value={stage.id} className="text-xs text-amber-200 font-semibold">
                                        {stage.title}
                                    </SelectItem>
                                ))}
                                <div className="px-2 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-slate-950/80 sticky top-0 mt-2 border-t border-white/10 pt-2">
                                    🤲 Namaz Duaları (8 Dua)
                                </div>
                                {ALL_ELIFBA_STAGES.filter(s => s.category === 'dualar').map(stage => (
                                    <SelectItem key={stage.id} value={stage.id} className="text-xs text-emerald-200 font-semibold">
                                        {stage.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Kart Teması Değiştirici: Aydınlık / Karanlık */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCardTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                            className={cn(
                                "h-8 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer",
                                cardTheme === 'light'
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                                    : "bg-indigo-600/30 text-indigo-200 border-indigo-500/40 hover:bg-indigo-600/40"
                            )}
                            title="Kart Görünümünü Değiştir [T]"
                        >
                            {cardTheme === 'light' ? (
                                <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-amber-400" /> Beyaz Kart</span>
                            ) : (
                                <span className="flex items-center gap-1"><Moon className="w-3.5 h-3.5 text-indigo-300" /> Koyu Kart</span>
                            )}
                        </Button>

                        {/* Otomatik Ses Çalma Toggle */}
                        {mode === 'flashcard' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAutoPlayAudio(prev => !prev)}
                                className={cn(
                                    "h-8 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer",
                                    autoPlayAudio
                                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                        : "border-white/10 text-slate-400 hover:text-white"
                                )}
                                title="Her yeni harfte telaffuz sesini otomatik çal"
                            >
                                <Volume2 className="w-3.5 h-3.5 mr-1" />
                                {autoPlayAudio ? "Oto: Açık" : "Oto Ses"}
                            </Button>
                        )}

                        {/* Ses Efektleri */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSoundEnabled(prev => !prev)}
                            className={cn(
                                "h-8 w-8 rounded-xl border transition-all cursor-pointer",
                                soundEnabled ? "text-emerald-400 border-emerald-500/30" : "text-slate-500 border-white/10"
                            )}
                            title="Zil / Doğru-Yanlış Efekt Sesleri [M]"
                        >
                            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        </Button>

                        {/* Tam Ekran Butonu */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleFullscreen}
                            className={cn(
                                "h-8 w-8 rounded-xl border transition-all cursor-pointer",
                                isFullscreen ? "bg-indigo-600/40 text-indigo-200 border-indigo-500/50" : "text-slate-400 border-white/10 hover:text-white"
                            )}
                            title="Tam Ekran / Akıllı Tahta [F]"
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>

                        {/* Kapat Butonu */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 cursor-pointer"
                            title="Pencereyi Kapat [ESC]"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 2. ORTA SAHNE: AKILLI TAHTA KARTI VEYA TÜM HARFLER PANOSU */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-between p-2 sm:p-4 min-h-0 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950">
                    
                    {mode === 'flashcard' ? (

                        /* ──────────────────────────────────────────────────────────── */
                        /* 2.A FLAŞ KART MODU: FİZİKSEL DERİNLİKTE DEV HARF KARTI */
                        /* ──────────────────────────────────────────────────────────── */
                        <div className="flex-1 min-h-0 w-full max-w-4xl xl:max-w-5xl mx-auto flex flex-col justify-between gap-2.5">
                            
                            {/* Kart Üst İlerleme ve Skor Rozetleri */}
                            <div className="w-full flex items-center justify-between shrink-0 px-1 text-xs">
                                <Badge className="bg-slate-800/90 border border-white/10 text-white font-mono font-bold px-3 py-1 text-xs shadow-sm">
                                    Kart: {currentItemIndex} / {currentStage.itemCount}
                                </Badge>
                                
                                <div className="flex items-center gap-2 sm:gap-3 text-xs font-black">
                                    <span className="text-emerald-400 flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                                        <CheckCircle2 className="w-3.5 h-3.5"/> {stats.correct} Doğru
                                    </span>
                                    <span className="text-amber-400 flex items-center gap-1 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                                        <HelpCircle className="w-3.5 h-3.5"/> {stats.help} Yardım
                                    </span>
                                    <span className="text-rose-400 flex items-center gap-1 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                                        <XCircle className="w-3.5 h-3.5"/> {stats.wrong} Tekrar
                                    </span>
                                    <span className="text-indigo-300 font-mono bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                                        Başarı: %{stats.score}
                                    </span>
                                </div>
                            </div>

                            {/* FİZİKSEL DEVASA ARAPÇA HAT KARTI */}
                            <div className={cn(
                                "flex-1 min-h-0 w-full rounded-3xl border-2 flex flex-col justify-between transition-all duration-200 shadow-2xl relative select-none border-b-8 overflow-hidden",
                                cardTheme === 'light'
                                    ? `bg-white ${currentCardTheme.border} ${currentCardTheme.glow}`
                                    : "bg-[#0f172a] border-white/20 border-b-slate-900 shadow-cyan-950/40"
                            )}>
                                {/* Kart Üst Şeridi */}
                                <div className={cn(
                                    "w-full h-8 px-4 flex items-center justify-between shadow-sm shrink-0 font-black text-xs",
                                    cardTheme === 'light'
                                        ? currentCardTheme.headerGradient
                                        : "bg-gradient-to-r from-slate-800 to-slate-700 text-slate-200"
                                )}>
                                    <span>
                                        #{currentItemIndex} • {letterMeta ? `${letterMeta.name} (${letterMeta.arabic})` : `${currentStage.shortTitle} ${currentItemIndex}`}
                                    </span>

                                    {currentAsset?.audio ? (
                                        <button
                                            type="button"
                                            onClick={() => playStageAudio()}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] transition-all cursor-pointer"
                                            title="Sesi Dinle [Boşluk]"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" />
                                            <span>Dokun & Dinle</span>
                                        </button>
                                    ) : (
                                        <span className="text-[10px] opacity-75">{currentStage.title}</span>
                                    )}
                                </div>

                                {/* ORTA HARF TUVALİ (YÜZEN OKLAR & DEV ARAPÇA HAT) */}
                                <div 
                                    onClick={() => playStageAudio()}
                                    className={cn(
                                        "flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 relative overflow-hidden cursor-pointer",
                                        cardTheme === 'light' ? "bg-white" : "bg-[#0b1120]"
                                    )}
                                >
                                    {/* Yüzen Sol Buton (Önceki Kart) */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (currentItemIndex > 1) setCurrentItemIndex(prev => prev - 1);
                                        }}
                                        disabled={currentItemIndex <= 1}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-16 sm:w-12 sm:h-20 rounded-2xl bg-black/10 hover:bg-black/25 active:scale-95 text-slate-800 flex items-center justify-center backdrop-blur-md border border-black/10 shadow-md transition-all cursor-pointer group disabled:opacity-0"
                                        title="Önceki Harf [←]"
                                    >
                                        <ChevronLeft className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 group-hover:scale-110 transition-transform" />
                                    </button>

                                    {/* Arka Plan Yumuşak Radial Işık */}
                                    <div className="absolute inset-0 bg-radial from-amber-100/25 via-transparent to-transparent pointer-events-none" />

                                    {/* DEVASA ARAPÇA ÇİZİMİ (SIFIR TAŞMA, GÜVENLİ ÖLÇEK) */}
                                    {currentAsset?.img ? (
                                        <img
                                            src={currentAsset.img}
                                            alt={`Kart ${currentItemIndex}`}
                                            style={{
                                                filter: cardTheme === 'dark'
                                                    ? 'invert(1) hue-rotate(180deg) brightness(1.25) contrast(1.15) drop-shadow(0 0 16px rgba(255,255,255,0.3))'
                                                    : 'contrast(1.10) brightness(0.98)',
                                                imageRendering: isFullscreen ? 'auto' : '-webkit-optimize-contrast'
                                            }}
                                            className="h-full max-h-full w-auto max-w-full object-contain pointer-events-none transition-transform duration-200 drop-shadow-sm select-none scale-105 sm:scale-115"
                                        />
                                    ) : (
                                        <div className="text-center p-6 text-slate-500">
                                            <BookOpen className="w-16 h-16 mx-auto mb-2 opacity-40 text-emerald-400" />
                                            <p className="text-xl font-black text-slate-300">{currentStage.title} - #{currentItemIndex}</p>
                                        </div>
                                    )}

                                    {/* Yüzen Sağ Buton (Sonraki Kart) */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (currentItemIndex < currentStage.itemCount) setCurrentItemIndex(prev => prev + 1);
                                        }}
                                        disabled={currentItemIndex >= currentStage.itemCount}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-16 sm:w-12 sm:h-20 rounded-2xl bg-black/10 hover:bg-black/25 active:scale-95 text-slate-800 flex items-center justify-center backdrop-blur-md border border-black/10 shadow-md transition-all cursor-pointer group disabled:opacity-0"
                                        title="Sonraki Harf [→]"
                                    >
                                        <ChevronRight className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 group-hover:scale-110 transition-transform" />
                                    </button>

                                    {/* Mevcut Değerlendirme Rozeti */}
                                    {cardStatuses[currentItemIndex] && (
                                        <div className="absolute top-3 right-4 z-20 animate-in zoom-in-50 duration-200">
                                            {cardStatuses[currentItemIndex] === '+' && (
                                                <Badge className="bg-emerald-500 text-white font-black px-3 py-1 text-xs shadow-lg shadow-emerald-950/40">
                                                    ✓ Doğru Okundu
                                                </Badge>
                                            )}
                                            {cardStatuses[currentItemIndex] === 'o' && (
                                                <Badge className="bg-amber-500 text-slate-950 font-black px-3 py-1 text-xs shadow-lg shadow-amber-950/40">
                                                    O Yardımla
                                                </Badge>
                                            )}
                                            {cardStatuses[currentItemIndex] === '-' && (
                                                <Badge className="bg-rose-500 text-white font-black px-3 py-1 text-xs shadow-lg shadow-rose-950/40">
                                                    ✗ Tekrar Edilmeli
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Kart Alt Şeridi: Mahreç Açıklaması */}
                                <div className={cn(
                                    "w-full h-9 sm:h-10 px-4 sm:px-6 flex items-center justify-between shrink-0 border-t text-xs font-bold",
                                    cardTheme === 'light' ? `${currentCardTheme.footerBg} border-slate-200 text-slate-800` : "bg-slate-900/90 border-white/10 text-slate-300"
                                )}>
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="text-slate-400 font-bold uppercase text-[10px] hidden sm:inline">Telaffuz & Mahreç:</span>
                                        <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                                            {letterMeta ? `${letterMeta.name} (${letterMeta.desc})` : `${currentStage.title} - Öğe ${currentItemIndex}`}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
                                        [Boşluk] ile sesi çal
                                    </span>
                                </div>
                            </div>

                            {/* 3 BÜYÜK FİZİKSEL DEĞERLENDİRME BUTONU (DOKUNMATİK DOSTU) */}
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full">
                                <button
                                    type="button"
                                    onClick={() => handleMark('+')}
                                    className={cn(
                                        "flex-1 h-12 sm:h-14 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 shadow-lg transition-all active:translate-y-1 active:border-b-2 border-2 border-b-6 cursor-pointer select-none",
                                        cardStatuses[currentItemIndex] === '+'
                                            ? "bg-gradient-to-r from-emerald-600 to-green-600 border-emerald-800 text-white ring-4 ring-emerald-400/50 shadow-emerald-950/60 scale-[1.02]"
                                            : "bg-emerald-950/80 hover:bg-emerald-900 border-emerald-600/50 text-emerald-300 shadow-emerald-950/40"
                                    )}
                                >
                                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5"/> DOĞRU</span>
                                    <span className="text-[10px] font-mono opacity-70">[ 1 ]</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleMark('o')}
                                    className={cn(
                                        "flex-1 h-12 sm:h-14 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 shadow-lg transition-all active:translate-y-1 active:border-b-2 border-2 border-b-6 cursor-pointer select-none",
                                        cardStatuses[currentItemIndex] === 'o'
                                            ? "bg-gradient-to-r from-amber-500 to-yellow-500 border-amber-800 text-slate-950 ring-4 ring-amber-400/50 shadow-amber-950/60 scale-[1.02]"
                                            : "bg-amber-950/80 hover:bg-amber-900 border-amber-600/50 text-amber-300 shadow-amber-950/40"
                                    )}
                                >
                                    <span className="flex items-center gap-1.5"><HelpCircle className="w-4 h-4 sm:w-5 sm:h-5"/> YARDIMLA</span>
                                    <span className="text-[10px] font-mono opacity-70">[ 2 ]</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleMark('-')}
                                    className={cn(
                                        "flex-1 h-12 sm:h-14 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 shadow-lg transition-all active:translate-y-1 active:border-b-2 border-2 border-b-6 cursor-pointer select-none",
                                        cardStatuses[currentItemIndex] === '-'
                                            ? "bg-gradient-to-r from-rose-600 to-red-600 border-rose-800 text-white ring-4 ring-rose-400/50 shadow-rose-950/60 scale-[1.02]"
                                            : "bg-rose-950/80 hover:bg-rose-900 border-rose-600/50 text-rose-300 shadow-rose-950/40"
                                    )}
                                >
                                    <span className="flex items-center gap-1.5"><XCircle className="w-4 h-4 sm:w-5 sm:h-5"/> TEKRAR</span>
                                    <span className="text-[10px] font-mono opacity-70">[ 3 ]</span>
                                </button>
                            </div>
                        </div>

                    ) : (

                        /* ──────────────────────────────────────────────────────────── */
                        /* 2.B TÜM HARFLER (PANO / IZGARA MODU) */
                        /* ──────────────────────────────────────────────────────────── */
                        <div className="space-y-3 w-full flex-1 flex flex-col min-h-0 px-1 sm:px-3">
                            
                            {/* Filtre ve Toplu İşlem Çubuğu */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/90 p-2 sm:p-2.5 rounded-2xl border border-white/10 shadow-lg shrink-0 w-full">
                                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setGridFilter('all')}
                                        className={cn(
                                            "px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs",
                                            gridFilter === 'all' ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-950 border border-white/10 text-slate-400 hover:text-white"
                                        )}
                                    >
                                        Tümü ({currentStage.itemCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGridFilter('+')}
                                        className={cn(
                                            "px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs",
                                            gridFilter === '+' ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-950 border border-white/10 text-emerald-400 hover:text-white"
                                        )}
                                    >
                                        ✓ Doğru ({stats.correct})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGridFilter('o')}
                                        className={cn(
                                            "px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs",
                                            gridFilter === 'o' ? "bg-amber-600 text-white shadow-sm" : "bg-slate-950 border border-white/10 text-amber-400 hover:text-white"
                                        )}
                                    >
                                        O Yardımla ({stats.help})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGridFilter('-')}
                                        className={cn(
                                            "px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs",
                                            gridFilter === '-' ? "bg-rose-600 text-white shadow-sm" : "bg-slate-950 border border-white/10 text-rose-400 hover:text-white"
                                        )}
                                    >
                                        ✗ Tekrar ({stats.wrong})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGridFilter('empty')}
                                        className={cn(
                                            "px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs",
                                            gridFilter === 'empty' ? "bg-slate-700 text-white shadow-sm" : "bg-slate-950 border border-white/10 text-slate-400 hover:text-white"
                                        )}
                                    >
                                        Kalan ({currentStage.itemCount - stats.evaluated})
                                    </button>
                                </div>

                                {/* Toplu Eylemler */}
                                <div className="flex items-center gap-2 shrink-0 ml-auto">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const newMap: { [index: number]: '+' } = {};
                                            for (let i = 1; i <= currentStage.itemCount; i++) {
                                                newMap[i] = '+';
                                            }
                                            setCardStatuses(newMap);
                                            if (soundEnabled) playFeedbackChime('correct');
                                        }}
                                        className="h-7 text-xs font-bold border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white cursor-pointer"
                                    >
                                        <Check className="w-3 h-3 mr-1" /> Tümünü Doğru Yap
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setCardStatuses({})}
                                        className="h-7 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" /> Temizle
                                    </Button>
                                </div>
                            </div>

                            {/* Pano Harf Izgarası */}
                            <div className={cn(
                                "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 overflow-y-auto pr-1 custom-scrollbar flex-1 min-h-0 w-full",
                                isFullscreen ? "max-h-none py-1" : "max-h-[60vh]"
                            )}>
                                {filteredGridItems.map(num => {
                                    const asset = getStageItemAssetUrls(currentStage.id, num);
                                    const st = cardStatuses[num] || null;

                                    return (
                                        <div
                                            key={num}
                                            onClick={() => {
                                                const next = st === null ? '+' : st === '+' ? '-' : st === '-' ? 'o' : null;
                                                setCardStatuses(prev => {
                                                    const updated = { ...prev };
                                                    if (next === null) {
                                                        delete updated[num];
                                                    } else {
                                                        updated[num] = next;
                                                    }
                                                    return updated;
                                                });
                                                if (soundEnabled && next) {
                                                    if (next === '+') playFeedbackChime('correct');
                                                    else if (next === 'o') playFeedbackChime('help');
                                                    else if (next === '-') playFeedbackChime('wrong');
                                                }
                                            }}
                                            className={cn(
                                                "border-2 rounded-2xl transition-all flex flex-col items-center justify-between p-3 select-none hover:scale-[1.03] active:scale-95 shadow-md hover:shadow-xl group cursor-pointer border-b-4",
                                                isFullscreen ? "min-h-[160px] sm:min-h-[190px]" : "min-h-[130px] sm:min-h-[145px]",
                                                st === '+'
                                                    ? "bg-gradient-to-br from-emerald-950/70 via-emerald-900/40 to-slate-950 border-emerald-500 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/40"
                                                    : st === '-'
                                                    ? "bg-gradient-to-br from-rose-950/70 via-rose-900/40 to-slate-950 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-2 ring-rose-500/40"
                                                    : st === 'o'
                                                    ? "bg-gradient-to-br from-amber-950/70 via-amber-900/40 to-slate-950 border-amber-500 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/40"
                                                    : cardTheme === 'light'
                                                    ? "bg-white border-slate-200 text-slate-800 hover:border-indigo-400"
                                                    : "bg-slate-900/90 border-white/10 text-slate-200 hover:border-indigo-500/40"
                                            )}
                                        >
                                            {/* Üst Satır: Numara & Durum */}
                                            <div className="w-full flex items-center justify-between text-[11px] font-mono font-bold opacity-80">
                                                <span>#{num}</span>
                                                {st === '+' && <span className="font-black text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3"/> Doğru</span>}
                                                {st === '-' && <span className="font-black text-rose-400 flex items-center gap-0.5"><XCircle className="w-3 h-3"/> Tekrar</span>}
                                                {st === 'o' && <span className="font-black text-amber-400 flex items-center gap-0.5"><HelpCircle className="w-3 h-3"/> Yardımla</span>}
                                                {!st && <span className="text-slate-500 font-normal">Tıkla & Notla</span>}
                                            </div>

                                            {/* Harf Görseli */}
                                            {asset?.img ? (
                                                <div className="w-full flex items-center justify-center p-1 my-auto min-h-0">
                                                    <img
                                                        src={asset.img}
                                                        alt={`Harf ${num}`}
                                                        className="max-h-full max-w-full object-contain pointer-events-none transition-transform group-hover:scale-110"
                                                        style={{
                                                            filter: (st || cardTheme === 'dark')
                                                                ? 'invert(1) hue-rotate(180deg) brightness(1.25) contrast(1.15)'
                                                                : 'contrast(1.10) brightness(0.98)'
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-full flex items-center justify-center font-black my-auto text-2xl">
                                                    #{num}
                                                </div>
                                            )}

                                            {/* Alt Satır: Dinle Butonu */}
                                            <div className="w-full flex items-center justify-between pt-1 border-t border-white/5">
                                                <span className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    st === '+' ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" :
                                                    st === '-' ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" :
                                                    st === 'o' ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" :
                                                    "bg-white/10"
                                                )} />

                                                {asset?.audio && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            playStageAudio(num);
                                                        }}
                                                        className="h-5 w-5 rounded-md bg-white/10 hover:bg-cyan-600 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                                        title="Sesi Dinle"
                                                    >
                                                        <Volume2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 3. ALT ŞERİT: MİNİ RAY & KLAVYE REHBERİ & KAYDET BUTONU */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className="relative z-10 px-4 py-2.5 border-t border-white/10 bg-slate-900/95 flex flex-col gap-2 shrink-0">
                    
                    {/* Flaş Kart Modu Hızlı Atlama Rayı */}
                    {mode === 'flashcard' && (
                        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
                            {Array.from({ length: currentStage.itemCount }, (_, i) => i + 1).map(num => {
                                const st = cardStatuses[num];
                                const isCurrent = currentItemIndex === num;
                                return (
                                    <button
                                        key={num}
                                        onClick={() => setCurrentItemIndex(num)}
                                        className={cn(
                                            "min-w-[30px] h-7 rounded-xl font-black text-xs flex items-center justify-center transition-all relative border cursor-pointer",
                                            isCurrent
                                                ? "border-cyan-400 bg-cyan-950 text-white scale-105 shadow-md shadow-cyan-900/40"
                                                : "border-white/5 bg-slate-950 text-slate-400 hover:border-white/20 hover:text-white",
                                            st === '+' && "border-emerald-500/50 bg-emerald-950/40 text-emerald-300",
                                            st === 'o' && "border-amber-500/50 bg-amber-950/40 text-amber-300",
                                            st === '-' && "border-rose-500/50 bg-rose-950/40 text-rose-300"
                                        )}
                                    >
                                        <span>{num}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Alt Kontrol Çubuğu: Kısayol Bilgisi & Kaydet */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5 shrink-0 gap-2">
                        <div className="hidden lg:flex items-center gap-2.5 text-[11px] truncate">
                            <span className="flex items-center gap-1 text-slate-300 font-bold"><Keyboard className="w-3.5 h-3.5 text-amber-400"/> [1] Doğru • [2] Yardımla • [3] Tekrar</span>
                            <span>•</span>
                            <span>[Boşluk] Sesi Çal • [←/→] Geçiş • [P] Pano/Kart • [F] Tam Ekran</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCardStatuses({})}
                                className="h-8 text-xs text-slate-400 hover:text-white cursor-pointer"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" /> Sıfırla
                            </Button>

                            <Button
                                type="button"
                                onClick={handleSaveProgress}
                                disabled={isSaving}
                                className={cn(
                                    "h-8 sm:h-9 px-4 font-black text-xs rounded-xl shadow-lg transition-all shrink-0 cursor-pointer border",
                                    stats.score >= 70
                                        ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-emerald-400/40 shadow-emerald-950/50"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/30"
                                )}
                            >
                                {isSaving ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <Save className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                {isSaving ? "Kaydediliyor..." : (stats.score >= 70 ? `Geçti Olarak Kaydet (%${stats.score})` : `İlerlemeyi Kaydet (%${stats.score})`)}
                            </Button>
                        </div>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
