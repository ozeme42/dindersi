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
    GraduationCap,
    Eye,
    EyeOff
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
    ELIFBA_STAGES, 
    ALL_ELIFBA_STAGES, 
    DIYANET_ELIFBA_STAGES, 
    DIYANET_SECTIONS, 
    ElifbaStage, 
    getStageItemAssetUrls,
    getNextDiyanetStage,
    getDiyanetStepNumber
} from "@/lib/elifba-curriculum";
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

    // Harf Okunuş & İpucu Gizleme Seçeneği (Öğrenci okurken ipucunu gizleme)
    const [hideHints, setHideHints] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('quran_tracker_hide_hints') === 'true';
        }
        return false;
    });

    const toggleHideHints = useCallback(() => {
        setHideHints(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('quran_tracker_hide_hints', String(next));
            }
            return next;
        });
    }, []);

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

            if (e.key.toLowerCase() === 'h') {
                e.preventDefault();
                toggleHideHints();
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
    }, [isOpen, mode, currentItemIndex, currentStage.itemCount, handleMark, playStageAudio, toggleFullscreen, toggleHideHints]);

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

    // Sıradaki Diyanet Aşaması
    const nextStage = useMemo(() => {
        return getNextDiyanetStage(currentStage.id);
    }, [currentStage.id]);

    // Sonraki Aşamaya Terfi Ettir (Tek Tıkla Geçiş)
    const handlePromoteToNextStage = async () => {
        if (!student || !nextStage) return;
        setIsSaving(true);
        try {
            // 1. Mevcut aşamayı tamamlandı olarak kaydet
            await saveStudentQuranProgress({
                studentUid: student.uid,
                studentName: student.displayName || 'İsimsiz Öğrenci',
                studentNumber: student.studentNumber,
                classId,
                className,
                branch,
                stageId: currentStage.id,
                status: 'completed',
                score: Math.max(stats.score, 85),
                passedCount: stats.correct,
                totalCount: stats.total,
                notes: `Diyanet Adım ${currentStage.stepNumber} (${currentStage.shortTitle}) başarıyla geçildi.`
            });

            // 2. Bir sonraki aşamaya terfi et
            await saveStudentQuranProgress({
                studentUid: student.uid,
                studentName: student.displayName || 'İsimsiz Öğrenci',
                studentNumber: student.studentNumber,
                classId,
                className,
                branch,
                stageId: nextStage.id,
                status: 'in_progress'
            });

            toast({
                title: "Tebrikler! Sonraki Adıma Geçildi 🎉",
                description: `${student.displayName} başarıyla ${nextStage.title} aşamasına terfi ettirildi!`
            });

            setSelectedStageId(nextStage.id);
            setCurrentItemIndex(1);
            setCardStatuses({});
            onProgressSaved?.();
        } catch (err) {
            console.error("Aşama ilerletme hatası:", err);
            toast({
                title: "Hata",
                description: "Sonraki aşamaya geçilirken bir sorun oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
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
                    "p-0 overflow-hidden text-slate-100 flex flex-col shadow-2xl transition-all duration-300 select-none",
                    "bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-900",
                    isFullscreen
                        ? "fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none border-none z-[100]"
                        : "w-[98vw] max-w-[1700px] h-[95vh] rounded-[2rem] border border-white/15"
                )}
            >
                {/* Erişilebilirlik ve Radix UI gereksinimi için DialogTitle & Description */}
                <DialogHeader className="sr-only">
                    <DialogTitle>Canlı Kur&apos;an &amp; Harf Testi - {student.displayName}</DialogTitle>
                    <DialogDescription>
                        Öğrencinin Kur&apos;an-ı Kerim ve Elifba harf/kaide canlı sözlü okuma değerlendirmesi
                    </DialogDescription>
                </DialogHeader>

                {/* Canlı Çok Renkli Ambient Glow Efektleri */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-violet-600/25 rounded-full blur-[160px]" />
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-[140px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[130px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-[120px]" />
                </div>

                {/* ════════════════════════════════════════════════════════════ */}
                {/* HEADER                                                       */}
                {/* ════════════════════════════════════════════════════════════ */}
                <div className="relative z-10 shrink-0 border-b border-white/10 bg-white/8 backdrop-blur-2xl">

                    {/* Ana Header Satırı */}
                    <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 gap-2 sm:gap-3">

                        {/* SOL: Öğrenci Seçici + Oklar */}
                        <div className="flex items-center gap-2 min-w-0">
                            <Popover open={isStudentPickerOpen} onOpenChange={setIsStudentPickerOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all group cursor-pointer max-w-[190px] sm:max-w-[260px]"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                                            {student.displayName?.charAt(0) || 'Ö'}
                                        </div>
                                        <span className="truncate font-bold text-sm group-hover:text-white/90 transition-colors">
                                            {student.displayName}
                                        </span>
                                        <Badge variant="outline" className="text-[9px] font-mono text-slate-400 border-white/15 px-1 py-0 shrink-0">
                                            {currentStudentIndex + 1}/{allStudents.length}
                                        </Badge>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-3 bg-[#0d1424] border-white/10 text-white rounded-2xl shadow-2xl shadow-black/50 space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            placeholder="Öğrenci ara..."
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            className="h-8 pl-8 text-xs bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-500"
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                                        {filteredStudents.map((s, idx) => (
                                            <button
                                                key={s.uid}
                                                onClick={() => {
                                                    onSelectStudent(s);
                                                    setIsStudentPickerOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer",
                                                    s.uid === student.uid
                                                        ? "bg-gradient-to-r from-violet-600/80 to-indigo-600/80 text-white"
                                                        : "hover:bg-white/6 text-slate-300"
                                                )}
                                            >
                                                <span className="truncate max-w-[190px]">{s.displayName}</span>
                                                <span className="text-[10px] opacity-50 font-mono">#{idx + 1}</span>
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Önceki / Sonraki Öğrenci */}
                            <div className="flex items-center gap-0.5">
                                <Button size="icon" variant="ghost"
                                    onClick={handlePrevStudent}
                                    disabled={currentStudentIndex <= 0}
                                    className="h-7 w-7 rounded-lg text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                                    title="Önceki Öğrenci"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost"
                                    onClick={handleNextStudent}
                                    disabled={currentStudentIndex >= allStudents.length - 1}
                                    className="h-7 w-7 rounded-lg text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                                    title="Sonraki Öğrenci"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* ORTA: Adım Bilgisi + Aşama Seçici (masaüstü) */}
                        <div className="hidden md:flex items-center gap-2 min-w-0 flex-1 justify-center">
                            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5 shrink-0">
                                <GraduationCap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-xs font-black text-emerald-300 font-mono whitespace-nowrap">
                                    Adım {currentStage.stepNumber}/30
                                </span>
                            </div>
                            <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-xs text-white font-bold h-8 rounded-xl min-w-[140px] max-w-[220px] hover:bg-white/8 transition-colors">
                                    <SelectValue placeholder="Aşama Seçin" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0d1424] border-white/10 text-white max-h-80 overflow-y-auto rounded-2xl">
                                    {DIYANET_SECTIONS.map(sec => {
                                        const secStages = DIYANET_ELIFBA_STAGES.filter(s => s.section === sec.id && s.category !== 'quran');
                                        return (
                                            <React.Fragment key={sec.id}>
                                                <div className="px-3 py-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-white/3 sticky top-0 border-t first:border-t-0 border-white/8">
                                                    {sec.title}
                                                </div>
                                                {secStages.map(stage => (
                                                    <SelectItem key={stage.id} value={stage.id} className="text-xs font-semibold pl-5">
                                                        {stage.title}
                                                    </SelectItem>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                    <div className="px-3 py-1.5 text-[10px] font-black text-rose-400 uppercase tracking-widest bg-white/3 sticky top-0 border-t border-white/8">
                                        🤲 Münferit Namaz Duaları
                                    </div>
                                    {ALL_ELIFBA_STAGES.filter(s => s.category === 'dualar' && s.id !== 'dualar').map(stage => (
                                        <SelectItem key={stage.id} value={stage.id} className="text-xs font-semibold pl-5 text-rose-200">
                                            {stage.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* SAĞ: Mod Değiştirici + Kontrol İkonları */}
                        <div className="flex items-center gap-1.5 shrink-0">

                            {/* Görünüm Modu Pill */}
                            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/8 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setMode('flashcard')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                                        mode === 'flashcard'
                                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                                            : "text-slate-400 hover:text-white"
                                    )}
                                    title="Flaş Kart Modu [P]"
                                >
                                    <BookOpen className="w-3 h-3" />
                                    <span className="hidden sm:inline">Kart</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('grid')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                                        mode === 'grid'
                                            ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm"
                                            : "text-slate-400 hover:text-white"
                                    )}
                                    title="Pano Modu [G]"
                                >
                                    <LayoutGrid className="w-3 h-3" />
                                    <span className="hidden sm:inline">Pano</span>
                                </button>
                            </div>

                            {/* Ayırıcı */}
                            <div className="w-px h-5 bg-white/10 hidden sm:block" />

                            {/* Kart Teması */}
                            <button
                                type="button"
                                onClick={() => setCardTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                                className={cn(
                                    "h-8 w-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center",
                                    cardTheme === 'light'
                                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                                        : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25"
                                )}
                                title="Kart Temasını Değiştir [T]"
                            >
                                {cardTheme === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                            </button>

                            {/* İpuçları Gizle/Göster */}
                            <button
                                type="button"
                                onClick={toggleHideHints}
                                className={cn(
                                    "h-8 w-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center",
                                    hideHints
                                        ? "bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25"
                                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                )}
                                title="İpuçları Gizle / Göster [H]"
                            >
                                {hideHints ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            {/* Ses Efektleri */}
                            <button
                                type="button"
                                onClick={() => setSoundEnabled(prev => !prev)}
                                className={cn(
                                    "h-8 w-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center",
                                    soundEnabled
                                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
                                        : "bg-white/5 text-slate-500 border-white/10 hover:bg-white/10"
                                )}
                                title="Zil Sesleri [M]"
                            >
                                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                            </button>

                            {/* Tam Ekran */}
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                className={cn(
                                    "h-8 w-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center",
                                    isFullscreen
                                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                        : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                                )}
                                title="Tam Ekran [F]"
                            >
                                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>

                            {/* Kapat */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-8 w-8 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/10 cursor-pointer flex items-center justify-center transition-all"
                                title="Kapat [ESC]"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Mobil: Aşama Seçici Satırı */}
                    <div className="flex md:hidden items-center gap-2 px-3 pb-2.5">
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-1 shrink-0">
                            <GraduationCap className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-300 font-mono">Adım {currentStage.stepNumber}/30</span>
                        </div>
                        <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-xs text-white font-bold h-7 rounded-xl flex-1">
                                <SelectValue placeholder="Aşama Seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0d1424] border-white/10 text-white max-h-80 overflow-y-auto rounded-2xl">
                                {DIYANET_SECTIONS.map(sec => {
                                    const secStages = DIYANET_ELIFBA_STAGES.filter(s => s.section === sec.id && s.category !== 'quran');
                                    return (
                                        <React.Fragment key={sec.id}>
                                            <div className="px-3 py-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                                {sec.title}
                                            </div>
                                            {secStages.map(stage => (
                                                <SelectItem key={stage.id} value={stage.id} className="text-xs font-semibold pl-5">
                                                    {stage.title}
                                                </SelectItem>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════════ */}
                {/* ANA İÇERİK                                                   */}
                {/* ════════════════════════════════════════════════════════════ */}
                <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
                    {mode === 'flashcard' ? (

                        /* ── FLAŞ KART MODU ── */
                        <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-5 pt-3 pb-2 gap-2.5">

                            {/* İlerleme İstatistik Çubuğu */}
                            <div className="shrink-0 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-3 font-bold">
                                        <span className="flex items-center gap-1 text-emerald-400">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {stats.correct} Doğru
                                        </span>
                                        <span className="flex items-center gap-1 text-amber-400">
                                            <HelpCircle className="w-3.5 h-3.5" />
                                            {stats.help} Yardımla
                                        </span>
                                        <span className="flex items-center gap-1 text-rose-400">
                                            <XCircle className="w-3.5 h-3.5" />
                                            {stats.wrong} Tekrar
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-mono text-[11px]">
                                            {currentItemIndex}/{currentStage.itemCount}
                                        </span>
                                        <span className={cn(
                                            "font-black text-sm px-2.5 py-0.5 rounded-lg font-mono border",
                                            stats.score >= 70
                                                ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                                                : "text-indigo-300 bg-indigo-500/15 border-indigo-500/30"
                                        )}>
                                            %{stats.score}
                                        </span>
                                    </div>
                                </div>
                                {/* Segmentli Renkli Progress Bar */}
                                <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden flex gap-px">
                                    {Array.from({ length: currentStage.itemCount }, (_, i) => {
                                        const st = cardStatuses[i + 1];
                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "h-full flex-1 transition-all duration-300",
                                                    st === '+' ? "bg-emerald-500" :
                                                    st === 'o' ? "bg-amber-500" :
                                                    st === '-' ? "bg-rose-500" :
                                                    i + 1 === currentItemIndex ? "bg-cyan-400/80" :
                                                    "bg-white/10"
                                                )}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            {/* FLAŞ KART — animasyonlu */}
                            <div
                                key={currentItemIndex}
                                className={cn(
                                    "flex-1 min-h-0 w-full max-w-4xl xl:max-w-5xl mx-auto rounded-2xl border-2 flex flex-col overflow-hidden shadow-2xl animate-in fade-in-0 slide-in-from-right-3 duration-200 border-b-8",
                                    cardTheme === 'light'
                                        ? `bg-white ${currentCardTheme.border} ${currentCardTheme.glow}`
                                        : "bg-gradient-to-b from-indigo-950/80 to-slate-950/90 border-violet-500/25 border-b-violet-950/60 shadow-violet-900/30"
                                )}
                            >
                                {/* Kart Üst Şeridi */}
                                <div className={cn(
                                    "w-full h-8 px-4 flex items-center justify-between shadow-sm shrink-0 font-black text-xs",
                                    cardTheme === 'light'
                                        ? currentCardTheme.headerGradient
                                        : "bg-gradient-to-r from-violet-800/80 to-indigo-800/80 text-violet-100"
                                )}>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-xs opacity-60 font-mono">#{currentItemIndex}</span>
                                        <span className="font-black">
                                            {hideHints
                                                ? `${currentStage.shortTitle} #${currentItemIndex}`
                                                : (letterMeta ? `${letterMeta.name} (${letterMeta.arabic})` : `${currentStage.shortTitle} ${currentItemIndex}`)
                                            }
                                        </span>
                                    </div>

                                    {currentAsset?.audio ? (
                                        <button
                                            type="button"
                                            onClick={() => playStageAudio()}
                                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
                                            title="Sesi Dinle [Boşluk]"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" />
                                            <span>Dinle</span>
                                        </button>
                                    ) : (
                                        <span className="text-[11px] opacity-60">{currentStage.title}</span>
                                    )}
                                </div>

                                {/* ORTA HARF TUVALİ */}
                                <div
                                    onClick={() => playStageAudio()}
                                    className={cn(
                                        "flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 relative overflow-hidden cursor-pointer",
                                        cardTheme === 'light' ? "bg-gradient-to-b from-white to-slate-50/80" : "bg-[#080f1e]"
                                    )}
                                >
                                    {/* Ambient ışık */}
                                    <div className={cn(
                                        "absolute inset-0 pointer-events-none",
                                        cardTheme === 'light'
                                            ? "bg-radial from-amber-100/25 via-transparent to-transparent"
                                            : "bg-radial from-cyan-900/15 via-transparent to-transparent"
                                    )} />

                                    {/* Yüzen Sol Buton */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (currentItemIndex > 1) setCurrentItemIndex(prev => prev - 1);
                                        }}
                                        disabled={currentItemIndex <= 1}
                                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-16 sm:w-12 sm:h-20 rounded-2xl bg-black/8 hover:bg-black/20 active:scale-95 flex items-center justify-center backdrop-blur-sm border border-black/8 shadow-sm transition-all cursor-pointer group/nav disabled:opacity-0"
                                        title="Önceki [←]"
                                    >
                                        <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-slate-500 group-hover/nav:text-amber-600 transition-colors" />
                                    </button>

                                    {/* DEVASA ARAPÇA ÇİZİMİ */}
                                    {currentAsset?.img ? (
                                        <img
                                            src={currentAsset.img}
                                            alt={`Kart ${currentItemIndex}`}
                                            style={{
                                                filter: cardTheme === 'dark'
                                                    ? 'invert(1) hue-rotate(180deg) brightness(1.3) contrast(1.2) drop-shadow(0 0 20px rgba(255,255,255,0.2))'
                                                    : 'contrast(1.08) brightness(0.97)',
                                                imageRendering: isFullscreen ? 'auto' : '-webkit-optimize-contrast'
                                            }}
                                            className="h-full max-h-full w-auto max-w-full object-contain pointer-events-none transition-transform duration-200 drop-shadow-sm select-none scale-105 sm:scale-115"
                                        />
                                    ) : (
                                        <div className="text-center p-8 text-slate-500">
                                            <BookOpen className="w-20 h-20 mx-auto mb-3 opacity-30 text-emerald-400" />
                                            <p className="text-xl font-black text-slate-300">{currentStage.title} - #{currentItemIndex}</p>
                                        </div>
                                    )}

                                    {/* Yüzen Sağ Buton */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (currentItemIndex < currentStage.itemCount) setCurrentItemIndex(prev => prev + 1);
                                        }}
                                        disabled={currentItemIndex >= currentStage.itemCount}
                                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-16 sm:w-12 sm:h-20 rounded-2xl bg-black/8 hover:bg-black/20 active:scale-95 flex items-center justify-center backdrop-blur-sm border border-black/8 shadow-sm transition-all cursor-pointer group/nav disabled:opacity-0"
                                        title="Sonraki [→]"
                                    >
                                        <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-slate-500 group-hover/nav:text-emerald-600 transition-colors" />
                                    </button>

                                    {/* Değerlendirme Rozeti */}
                                    {cardStatuses[currentItemIndex] && (
                                        <div className="absolute top-3 right-4 z-20 animate-in zoom-in-75 duration-200">
                                            {cardStatuses[currentItemIndex] === '+' && (
                                                <div className="flex items-center gap-1.5 bg-emerald-500 text-white font-black px-3 py-1 rounded-full text-xs shadow-lg shadow-emerald-900/60">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Doğru
                                                </div>
                                            )}
                                            {cardStatuses[currentItemIndex] === 'o' && (
                                                <div className="flex items-center gap-1.5 bg-amber-500 text-slate-900 font-black px-3 py-1 rounded-full text-xs shadow-lg shadow-amber-900/60">
                                                    <HelpCircle className="w-3.5 h-3.5" /> Yardımla
                                                </div>
                                            )}
                                            {cardStatuses[currentItemIndex] === '-' && (
                                                <div className="flex items-center gap-1.5 bg-rose-500 text-white font-black px-3 py-1 rounded-full text-xs shadow-lg shadow-rose-900/60">
                                                    <XCircle className="w-3.5 h-3.5" /> Tekrar
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Kart Alt Şeridi: Mahreç / İpucu */}
                                <div
                                    onClick={toggleHideHints}
                                    className={cn(
                                        "px-4 sm:px-5 py-2.5 flex items-center justify-between shrink-0 border-t text-xs font-bold transition-all cursor-pointer",
                                        cardTheme === 'light'
                                            ? `${currentCardTheme.footerBg} border-slate-200 text-slate-700`
                                            : "bg-violet-950/50 border-violet-500/20 text-violet-200"
                                    )}
                                    title="İpucunu gizlemek veya açmak için tıklayın [H]"
                                >
                                    <div className="flex items-center gap-2 truncate min-w-0">
                                        {hideHints ? (
                                            <div className="flex items-center gap-2 text-rose-400 font-extrabold">
                                                <EyeOff className="w-3.5 h-3.5 animate-pulse shrink-0" />
                                                <span className="text-xs tracking-wide truncate">Okunuş Gizlendi — Öğrenci Okuyor</span>
                                            </div>
                                        ) : (
                                            <span className="font-black text-sm truncate" style={{ color: cardTheme === 'light' ? '#0f172a' : '#e2e8f0' }}>
                                                {letterMeta ? `${letterMeta.name} — ${letterMeta.desc}` : `${currentStage.title} · Öğe ${currentItemIndex}`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                        {hideHints ? (
                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/25">GİZLİ [H]</span>
                                        ) : (
                                            <span className="text-[10px] font-mono text-slate-500 hidden md:inline">[H] gizle • [Boşluk] ses</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3 BÜYÜK DEĞERLENDİRME BUTONU */}
                            <div className="flex items-stretch gap-2.5 sm:gap-3 shrink-0">
                                {/* DOĞRU */}
                                <button
                                    type="button"
                                    onClick={() => handleMark('+')}
                                    className={cn(
                                        "flex-1 py-3 sm:py-4 rounded-2xl font-black flex flex-col items-center justify-center gap-1.5 transition-all duration-150 active:translate-y-0.5 border-2 border-b-[5px] cursor-pointer select-none",
                                        cardStatuses[currentItemIndex] === '+'
                                            ? "bg-gradient-to-br from-emerald-400 to-green-500 border-emerald-600 border-b-emerald-800 text-white shadow-[0_6px_32px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/50 scale-[1.02]"
                                            : "bg-emerald-900/50 hover:bg-emerald-800/60 border-emerald-600/50 border-b-emerald-800/70 text-emerald-300 hover:text-white hover:shadow-[0_4px_24px_rgba(16,185,129,0.3)] hover:border-emerald-500/70 hover:scale-[1.01]"
                                    )}
                                >
                                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                    <span className="text-sm sm:text-base tracking-wide">DOĞRU</span>
                                    <kbd className="text-[10px] font-mono opacity-50 px-2 py-0.5 rounded bg-white/10 border border-white/10">1</kbd>
                                </button>

                                {/* YARDIMLA */}
                                <button
                                    type="button"
                                    onClick={() => handleMark('o')}
                                    className={cn(
                                        "flex-1 py-3 sm:py-4 rounded-2xl font-black flex flex-col items-center justify-center gap-1.5 transition-all duration-150 active:translate-y-0.5 border-2 border-b-[5px] cursor-pointer select-none",
                                        cardStatuses[currentItemIndex] === 'o'
                                            ? "bg-gradient-to-br from-amber-400 to-yellow-500 border-amber-600 border-b-amber-800 text-slate-900 shadow-[0_6px_32px_rgba(245,158,11,0.6)] ring-2 ring-amber-400/50 scale-[1.02]"
                                            : "bg-amber-900/50 hover:bg-amber-800/60 border-amber-600/50 border-b-amber-800/70 text-amber-300 hover:text-white hover:shadow-[0_4px_24px_rgba(245,158,11,0.3)] hover:border-amber-500/70 hover:scale-[1.01]"
                                    )}
                                >
                                    <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                    <span className="text-sm sm:text-base tracking-wide">YARDIMLA</span>
                                    <kbd className="text-[10px] font-mono opacity-50 px-2 py-0.5 rounded bg-black/10 border border-black/10">2</kbd>
                                </button>

                                {/* TEKRAR */}
                                <button
                                    type="button"
                                    onClick={() => handleMark('-')}
                                    className={cn(
                                        "flex-1 py-3 sm:py-4 rounded-2xl font-black flex flex-col items-center justify-center gap-1.5 transition-all duration-150 active:translate-y-0.5 border-2 border-b-[5px] cursor-pointer select-none",
                                        cardStatuses[currentItemIndex] === '-'
                                            ? "bg-gradient-to-br from-rose-400 to-red-500 border-rose-600 border-b-rose-800 text-white shadow-[0_6px_32px_rgba(244,63,94,0.6)] ring-2 ring-rose-400/50 scale-[1.02]"
                                            : "bg-rose-900/50 hover:bg-rose-800/60 border-rose-600/50 border-b-rose-800/70 text-rose-300 hover:text-white hover:shadow-[0_4px_24px_rgba(244,63,94,0.3)] hover:border-rose-500/70 hover:scale-[1.01]"
                                    )}
                                >
                                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                    <span className="text-sm sm:text-base tracking-wide">TEKRAR</span>
                                    <kbd className="text-[10px] font-mono opacity-50 px-2 py-0.5 rounded bg-white/10 border border-white/10">3</kbd>
                                </button>
                            </div>
                        </div>

                    ) : (

                        /* ── PANO / IZGARA MODU ── */
                        <div className="space-y-3 w-full flex-1 flex flex-col min-h-0 px-3 sm:px-5 pt-3 pb-2">

                            {/* Filtre ve Toplu İşlem Çubuğu */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 w-full">
                                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-xs">
                                    {([
                                        { val: 'all' as const, label: `Tümü (${currentStage.itemCount})`, active: 'bg-indigo-600 text-white border-indigo-500' },
                                        { val: '+' as const, label: `✓ Doğru (${stats.correct})`, active: 'bg-emerald-600 text-white border-emerald-500' },
                                        { val: 'o' as const, label: `◎ Yardım (${stats.help})`, active: 'bg-amber-600 text-white border-amber-500' },
                                        { val: '-' as const, label: `✗ Tekrar (${stats.wrong})`, active: 'bg-rose-600 text-white border-rose-500' },
                                        { val: 'empty' as const, label: `Kalan (${currentStage.itemCount - stats.evaluated})`, active: 'bg-slate-700 text-white border-slate-600' },
                                    ] as { val: typeof gridFilter; label: string; active: string }[]).map(f => (
                                        <button
                                            key={f.val}
                                            type="button"
                                            onClick={() => setGridFilter(f.val)}
                                            className={cn(
                                                "px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 text-xs border",
                                                gridFilter === f.val
                                                    ? f.active + " shadow-sm"
                                                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                                            )}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
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
                                        <Check className="w-3 h-3 mr-1" /> Tümünü Doğru
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
                                "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5 overflow-y-auto pr-1 custom-scrollbar flex-1 min-h-0 w-full",
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
                                                "border-2 rounded-2xl transition-all flex flex-col items-center justify-between p-2.5 sm:p-3 select-none hover:scale-[1.04] active:scale-[0.97] shadow-md hover:shadow-xl group cursor-pointer border-b-4",
                                                isFullscreen ? "min-h-[160px] sm:min-h-[190px]" : "min-h-[125px] sm:min-h-[140px]",
                                                st === '+'
                                                    ? "bg-gradient-to-br from-emerald-950/80 via-emerald-900/30 to-slate-950 border-emerald-500/70 shadow-[0_0_16px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/30"
                                                    : st === '-'
                                                    ? "bg-gradient-to-br from-rose-950/80 via-rose-900/30 to-slate-950 border-rose-500/70 shadow-[0_0_16px_rgba(244,63,94,0.2)] ring-1 ring-rose-500/30"
                                                    : st === 'o'
                                                    ? "bg-gradient-to-br from-amber-950/80 via-amber-900/30 to-slate-950 border-amber-500/70 shadow-[0_0_16px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/30"
                                                    : cardTheme === 'light'
                                                    ? "bg-white border-slate-200 text-slate-800 hover:border-indigo-400"
                                                    : "bg-white/4 border-white/10 text-slate-200 hover:border-indigo-500/40 hover:bg-white/6"
                                            )}
                                        >
                                            {/* Üst Satır: Numara & Durum */}
                                            <div className="w-full flex items-center justify-between text-[11px] font-mono font-bold">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded-md text-[10px]",
                                                    st === '+' ? "bg-emerald-500/20 text-emerald-300" :
                                                    st === '-' ? "bg-rose-500/20 text-rose-300" :
                                                    st === 'o' ? "bg-amber-500/20 text-amber-300" :
                                                    "bg-white/10 text-slate-400"
                                                )}>#{num}</span>
                                                <span>
                                                    {st === '+' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                                    {st === '-' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                                                    {st === 'o' && <HelpCircle className="w-3.5 h-3.5 text-amber-400" />}
                                                    {!st && <span className="text-[9px] text-slate-600 font-normal">tıkla</span>}
                                                </span>
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

                                            {/* Alt Satır */}
                                            <div className="w-full flex items-center justify-between pt-1.5 border-t border-white/6">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    st === '+' ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" :
                                                    st === '-' ? "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]" :
                                                    st === 'o' ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" :
                                                    "bg-white/15"
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

                {/* ════════════════════════════════════════════════════════════ */}
                {/* FOOTER                                                       */}
                {/* ════════════════════════════════════════════════════════════ */}
                <div className="relative z-10 px-3 sm:px-5 pt-2 pb-3 border-t border-white/10 bg-white/6 backdrop-blur-2xl shrink-0 space-y-2">

                    {/* İlerleme Rayı (yalnızca flaş kart modunda) */}
                    {mode === 'flashcard' && (
                        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
                            {Array.from({ length: currentStage.itemCount }, (_, i) => i + 1).map(num => {
                                const st = cardStatuses[num];
                                const isCurrent = currentItemIndex === num;
                                return (
                                    <button
                                        key={num}
                                        onClick={() => setCurrentItemIndex(num)}
                                        title={`Kart ${num}`}
                                        className={cn(
                                            "h-5 flex-shrink-0 rounded-full font-black text-[10px] flex items-center justify-center transition-all cursor-pointer border",
                                            isCurrent ? "w-7 border-cyan-400 bg-cyan-500/25 text-cyan-200" : "w-5 border-transparent",
                                            !isCurrent && st === '+' && "bg-emerald-500/70",
                                            !isCurrent && st === 'o' && "bg-amber-500/70",
                                            !isCurrent && st === '-' && "bg-rose-500/70",
                                            !isCurrent && !st && "bg-white/10 hover:bg-white/20"
                                        )}
                                    >
                                        {isCurrent && <span>{num}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Aksiyon Çubuğu */}
                    <div className="flex items-center justify-between gap-2">
                        {/* Klavye Kısayolları */}
                        <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-500 font-mono flex-wrap">
                            <span className="flex items-center gap-1 text-slate-400 font-bold mr-0.5">
                                <Keyboard className="w-3 h-3 text-amber-400/70" /> Kısayollar:
                            </span>
                            {([['1','Doğru'],['2','Yardım'],['3','Tekrar'],['←→','Geçiş'],['Boşluk','Ses'],['P','Pano'],['F','Tam Ekran']] as [string,string][]).map(([key, label]) => (
                                <span key={key} className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-white/60 text-[10px]">{key}</kbd>
                                    <span>{label}</span>
                                </span>
                            ))}
                        </div>

                        {/* Sağ Aksiyonlar */}
                        <div className="flex items-center gap-2 ml-auto">
                            <Button variant="ghost" size="sm"
                                onClick={() => setCardStatuses({})}
                                className="h-8 text-xs text-slate-500 hover:text-white cursor-pointer"
                            >
                                <RotateCcw className="w-3 h-3 mr-1.5" /> Sıfırla
                            </Button>

                            {/* Otomatik Ses (flaş kart modunda) */}
                            {mode === 'flashcard' && (
                                <button
                                    type="button"
                                    onClick={() => setAutoPlayAudio(prev => !prev)}
                                    className={cn(
                                        "h-8 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                                        autoPlayAudio
                                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                            : "bg-white/5 text-slate-500 border-white/10 hover:text-white hover:bg-white/10"
                                    )}
                                    title="Her yeni harfte telaffuz sesini otomatik çal"
                                >
                                    <Volume2 className="w-3.5 h-3.5" />
                                    <span>{autoPlayAudio ? 'Oto Ses: Açık' : 'Oto Ses'}</span>
                                </button>
                            )}

                            {/* Sonraki Adıma Terfi Butonu */}
                            {nextStage && stats.score >= 70 && (
                                <Button
                                    type="button"
                                    onClick={handlePromoteToNextStage}
                                    disabled={isSaving}
                                    className="h-8 px-3.5 font-black text-xs rounded-xl shadow-md cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0 flex items-center gap-1.5 shadow-amber-900/30"
                                    title={`Öğrenciyi sonraki aşamaya geçir: ${nextStage.title}`}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Sonraki Adım ({nextStage.shortTitle}) ➔</span>
                                </Button>
                            )}

                            {/* Kaydet Butonu */}
                            <Button
                                type="button"
                                onClick={handleSaveProgress}
                                disabled={isSaving}
                                className={cn(
                                    "h-8 px-4 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer border-0",
                                    stats.score >= 70
                                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                )}
                            >
                                {isSaving ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <Save className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                {isSaving ? 'Kaydediliyor...' : stats.score >= 70 ? `Geçti — Kaydet (%${stats.score})` : `Kaydet (%${stats.score})`}
                            </Button>
                        </div>
                    </div>
                </div>


            </DialogContent>
        </Dialog>
    );
}
