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
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    HelpCircle,
    Save,
    Loader2,
    Sparkles,
    Search,
    BookOpen,
    Sun,
    Moon,
    Maximize2,
    Minimize2,
    X,
    Award,
    Flame,
    GraduationCap,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Layers,
    AlignJustify,
    Sliders,
    Check,
    Volume2,
    VolumeX
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";
import {
    KURAN_BOOK_PAGES,
    TILAVET_RUBRIC_CRITERIA,
    getPagesByGrade,
    getPageById,
    calculateRubricScore,
    getTilavetGradeBadge,
    type KuranBookPage
} from "@/lib/kuran-ders-kitabi-data";
import {
    saveStudentBookReadingProgress,
    type QuranStudentProgress,
    type BookReadingRecord
} from "./actions";

interface BookReadingTesterProps {
    isOpen: boolean;
    onClose: () => void;
    student: UserProfile | null;
    allStudents: UserProfile[];
    onSelectStudent: (student: UserProfile) => void;
    initialPageId?: string;
    initialGrade?: number;
    classId: string;
    className: string;
    branch: string;
    currentProgress?: QuranStudentProgress;
    onProgressSaved?: () => void;
}

// Ses Sentezleyici
const playChime = (type: 'correct' | 'wrong' | 'save') => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (type === 'save') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        } else if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch {
        // Sessiz devam et
    }
};

const QUICK_TAGS = [
    "Mahreçler Temiz",
    "Uzatmalara Dikkat Edilmeli",
    "Cezmde Harf Sektirdi",
    "Şeddeler Başarılı",
    "Tenvinler Tam",
    "Durak Kuralı Hatası",
    "Nefes Kontrolü Eksik",
    "Son Derece Akıcı Okudu"
];

export function BookReadingTester({
    isOpen,
    onClose,
    student,
    allStudents,
    onSelectStudent,
    initialPageId,
    initialGrade = 5,
    classId,
    className,
    branch,
    currentProgress,
    onProgressSaved
}: BookReadingTesterProps) {
    const { toast } = useToast();

    // Sınıf ve Sayfa Seçimi
    const [selectedGrade, setSelectedGrade] = useState<number>(initialGrade);
    const [selectedPageId, setSelectedPageId] = useState<string>(initialPageId || 'p5-1');

    // Aktif Sayfa Nesnesi
    const currentPage = useMemo(() => {
        return getPageById(selectedPageId) || getPagesByGrade(selectedGrade)[0] || KURAN_BOOK_PAGES[0];
    }, [selectedPageId, selectedGrade]);

    // Sayfa değiştiğinde veya sınıf değiştiğinde
    useEffect(() => {
        if (initialPageId) {
            setSelectedPageId(initialPageId);
            const page = getPageById(initialPageId);
            if (page) setSelectedGrade(page.grade);
        }
    }, [initialPageId]);

    // 10 Kriter Puanları State (Varsayılan olarak boş veya mevcut kayıttan)
    const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
    const [teacherNotes, setTeacherNotes] = useState<string>('');
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Öğrenci veya sayfa değiştiğinde mevcut kaydı yükle
    useEffect(() => {
        if (student && currentProgress?.bookReadings && currentProgress.bookReadings[selectedPageId]) {
            const record = currentProgress.bookReadings[selectedPageId];
            setCriteriaScores(record.criteriaScores || {});
            setTeacherNotes(record.teacherNotes || '');
        } else {
            // Varsayılan boş bırak
            setCriteriaScores({});
            setTeacherNotes('');
        }
    }, [student, selectedPageId, currentProgress]);

    // Görünüm & Yakınlaştırma State'leri
    const [zoomLevel, setZoomLevel] = useState<number>(1.0);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [themeMode, setThemeMode] = useState<'paper' | 'dark' | 'light'>('paper');
    const [showRuler, setShowRuler] = useState<boolean>(false);
    const [rulerTopPercent, setRulerTopPercent] = useState<number>(25);

    // Öğrenci Arama Popover
    const [studentSearch, setStudentSearch] = useState<string>('');
    const [isStudentPickerOpen, setIsStudentPickerOpen] = useState<boolean>(false);

    // Tam Ekran Kontrolü
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

    // Toplam Puan
    const currentScore = useMemo(() => {
        return calculateRubricScore(criteriaScores);
    }, [criteriaScores]);

    const gradeBadge = useMemo(() => {
        return getTilavetGradeBadge(currentScore);
    }, [currentScore]);

    // Tek Kriter Güncelleme (0 - 10 Puan)
    const handleSetCriterion = (criterionId: string, points: number) => {
        const clamped = Math.max(0, Math.min(10, Math.round(points)));
        setCriteriaScores(prev => ({
            ...prev,
            [criterionId]: clamped
        }));
        if (clamped >= 8) playChime('correct');
        else if (clamped === 0) playChime('wrong');
    };

    // Kriter Puanını +/- ile Artır / Azalt
    const handleAdjustCriterion = (criterionId: string, delta: number) => {
        const current = criteriaScores[criterionId] ?? 0;
        const newScore = Math.max(0, Math.min(10, current + delta));
        handleSetCriterion(criterionId, newScore);
    };

    // Tümünü Başarılı Yap (100 Puan) Sihirli Butonu
    const handleSetAllFull = () => {
        const fullScores: Record<string, number> = {};
        TILAVET_RUBRIC_CRITERIA.forEach(c => {
            fullScores[c.id] = 10;
        });
        setCriteriaScores(fullScores);
        playChime('save');
        toast({
            title: "Tüm Kriterler Tamamlandı ✨",
            description: "10 kriterin tamamı 10 puan (100 Puan) olarak işaretlendi."
        });
    };

    // Hızlı Not Etiketi Ekle
    const handleAddQuickTag = (tag: string) => {
        setTeacherNotes(prev => {
            if (prev.includes(tag)) return prev;
            return prev ? `${prev} • ${tag}` : tag;
        });
    };

    // Değerlendirmeyi Kaydet
    const handleSaveProgress = async (advanceNextStudent = false) => {
        if (!student) return;
        setIsSaving(true);

        const status = currentScore >= 70 ? 'completed' : (currentScore >= 40 ? 'in_progress' : 'needs_practice');

        try {
            const res = await saveStudentBookReadingProgress({
                studentUid: student.uid,
                studentName: student.displayName || 'İsimsiz Öğrenci',
                studentNumber: student.studentNumber,
                classId,
                className,
                branch,
                readingId: currentPage.id,
                grade: currentPage.grade,
                pageNumber: currentPage.pageNumber,
                status,
                score: currentScore,
                criteriaScores,
                teacherNotes
            });

            if (res.success) {
                playChime('save');
                toast({
                    title: "Tilavet Değerlendirmesi Kaydedildi ✔",
                    description: `${student.displayName} - ${currentPage.title} (%${currentScore} - ${gradeBadge.label})`,
                    className: "bg-emerald-600 text-white"
                });

                onProgressSaved?.();

                if (advanceNextStudent && currentStudentIndex < allStudents.length - 1) {
                    onSelectStudent(allStudents[currentStudentIndex + 1]);
                }
            } else {
                toast({
                    title: "Kayıt Hatası",
                    description: res.error || "Değerlendirme kaydedilemedi.",
                    variant: "destructive"
                });
            }
        } catch (err) {
            console.error("Save error:", err);
            toast({
                title: "Hata",
                description: "Bir sorun oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Öğrenci Navigasyonu
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

    // Filtrelenmiş Öğrenci Listesi
    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return allStudents;
        const q = studentSearch.toLocaleLowerCase('tr');
        return allStudents.filter(s =>
            (s.displayName || '').toLocaleLowerCase('tr').includes(q) ||
            (s.studentNumber || '').includes(q)
        );
    }, [allStudents, studentSearch]);

    // Klavye Kısayolları (Ok tuşları ile cetvel veya öğrenci değiştirme)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'ArrowUp' && showRuler) {
                e.preventDefault();
                setRulerTopPercent(prev => Math.max(5, prev - 4));
            } else if (e.key === 'ArrowDown' && showRuler) {
                e.preventDefault();
                setRulerTopPercent(prev => Math.min(95, prev + 4));
            } else if (e.key === 'ArrowLeft' && e.altKey) {
                e.preventDefault();
                handlePrevStudent();
            } else if (e.key === 'ArrowRight' && e.altKey) {
                e.preventDefault();
                handleNextStudent();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, showRuler, currentStudentIndex, allStudents]);

    if (!student) return null;

    const availablePagesForGrade = getPagesByGrade(selectedGrade);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                ref={modalRef}
                className={cn(
                    "p-0 overflow-hidden text-slate-100 flex flex-col shadow-2xl transition-all duration-300 select-none",
                    "bg-[#0a0f1d]",
                    isFullscreen
                        ? "fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none border-none z-[100]"
                        : "w-[98vw] max-w-[1720px] h-[96vh] rounded-[2rem] border border-white/15"
                )}
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>MEB Kur&apos;an Ders Kitabı Okuma &amp; Tilavet Değerlendirmesi - {student.displayName}</DialogTitle>
                    <DialogDescription>
                        Ders kitabı okuma sayfası ve 10 kriterli tecvid/tilavet canlı değerlendirme rubriği
                    </DialogDescription>
                </DialogHeader>

                {/* ════════════════════════════════════════════════════════════ */}
                {/* 1. ÜST HEADER                                                */}
                {/* ════════════════════════════════════════════════════════════ */}
                <div className="relative z-20 shrink-0 border-b border-white/10 bg-white/6 backdrop-blur-2xl px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
                    
                    {/* SOL: Öğrenci Seçici */}
                    <div className="flex items-center gap-2 min-w-0">
                        <Popover open={isStudentPickerOpen} onOpenChange={setIsStudentPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white/10 hover:bg-white/15 border-white/15 text-white font-bold h-9 px-3 rounded-2xl flex items-center gap-2 max-w-[240px] truncate"
                                >
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-[10px] font-black text-slate-950 shrink-0">
                                        {currentStudentIndex + 1}
                                    </div>
                                    <span className="truncate text-xs">{student.displayName}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-2 bg-[#0c1427] border-white/15 text-white rounded-2xl shadow-2xl z-[120]" align="start">
                                <div className="flex items-center gap-2 px-2 pb-2 border-b border-white/10 mb-1">
                                    <Search className="w-4 h-4 text-slate-400" />
                                    <Input
                                        value={studentSearch}
                                        onChange={e => setStudentSearch(e.target.value)}
                                        placeholder="Öğrenci ara..."
                                        className="h-8 text-xs bg-white/5 border-white/10 text-white rounded-xl"
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                                    {filteredStudents.map((s, idx) => {
                                        const isSelected = s.uid === student.uid;
                                        return (
                                            <button
                                                key={s.uid}
                                                type="button"
                                                onClick={() => {
                                                    onSelectStudent(s);
                                                    setIsStudentPickerOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-all",
                                                    isSelected ? "bg-emerald-500/20 text-emerald-300 font-bold" : "hover:bg-white/5 text-slate-300"
                                                )}
                                            >
                                                <span className="truncate">{s.displayName}</span>
                                                <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handlePrevStudent}
                                disabled={currentStudentIndex <= 0}
                                className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10 disabled:opacity-30"
                                title="Önceki Öğrenci [Alt + ←]"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleNextStudent}
                                disabled={currentStudentIndex >= allStudents.length - 1}
                                className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10 disabled:opacity-30"
                                title="Sonraki Öğrenci [Alt + →]"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* ORTA: Sınıf & Sayfa Seçici */}
                    <div className="flex items-center gap-2">
                        {/* Sınıf Seçimi */}
                        <div className="flex items-center bg-white/8 p-0.5 rounded-xl border border-white/12">
                            {[5, 6, 7, 8].map(g => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => {
                                        setSelectedGrade(g);
                                        const firstPage = getPagesByGrade(g)[0];
                                        if (firstPage) setSelectedPageId(firstPage.id);
                                    }}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-black transition-all",
                                        selectedGrade === g
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md"
                                            : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    {g}. Sınıf
                                </button>
                            ))}
                        </div>

                        {/* Sayfa Seçici Dropdown */}
                        <Select
                            value={selectedPageId}
                            onValueChange={(val) => setSelectedPageId(val)}
                        >
                            <SelectTrigger className="bg-white/8 border-white/15 text-xs text-white font-bold h-9 rounded-xl w-[200px] sm:w-[260px] truncate">
                                <SelectValue placeholder="Sayfa Seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0d1424] border-white/15 text-white max-h-80 overflow-y-auto rounded-2xl">
                                {availablePagesForGrade.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs font-semibold py-2">
                                        <div className="flex flex-col">
                                            <span className="font-bold">{p.pageNumber}. Sayfa: {p.title}</span>
                                            <span className="text-[10px] text-slate-400">{p.surahInfo}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* SAĞ: Araçlar & Kapat */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Satır Kılavuz Cetveli Aç/Kapat */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowRuler(prev => !prev)}
                            className={cn(
                                "h-8 w-8 rounded-xl border transition-all",
                                showRuler ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-white/5 text-slate-400 border-white/10"
                            )}
                            title="Satır Takip Cetveli (Yukarı/Aşağı Ok tuşlarıyla kaydırın)"
                        >
                            <AlignJustify className="w-3.5 h-3.5" />
                        </Button>

                        {/* Kağıt / Aydınlık / Karanlık Tema Modu */}
                        <div className="hidden sm:flex items-center bg-white/8 p-0.5 rounded-xl border border-white/10">
                            <button
                                type="button"
                                onClick={() => setThemeMode('paper')}
                                className={cn(
                                    "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                                    themeMode === 'paper' ? "bg-amber-200 text-amber-950 font-black shadow-sm" : "text-slate-400 hover:text-white"
                                )}
                                title="Kitap Kağıdı Görünümü (Klasik Sarı/Parchment)"
                            >
                                Kağıt
                            </button>
                            <button
                                type="button"
                                onClick={() => setThemeMode('light')}
                                className={cn(
                                    "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                                    themeMode === 'light' ? "bg-white text-slate-900 font-black shadow-sm" : "text-slate-400 hover:text-white"
                                )}
                                title="Beyaz Zemin"
                            >
                                Aydınlık
                            </button>
                            <button
                                type="button"
                                onClick={() => setThemeMode('dark')}
                                className={cn(
                                    "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                                    themeMode === 'dark' ? "bg-indigo-900 text-cyan-300 font-black shadow-sm" : "text-slate-400 hover:text-white"
                                )}
                                title="Gece / Koyu Mod"
                            >
                                Koyu
                            </button>
                        </div>

                        {/* Tam Ekran */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleFullscreen}
                            className="h-8 w-8 rounded-xl bg-white/5 text-slate-400 hover:text-white border border-white/10"
                            title="Tam Ekran"
                        >
                            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </Button>

                        {/* Kapat */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10"
                            title="Kapat [ESC]"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════════ */}
                {/* 2. ANA BÖLÜNMÜŞ ÇALIŞMA ALANI                                */}
                {/* ════════════════════════════════════════════════════════════ */}
                <div className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

                    {/* ──────────────────────────────────────────────────────── */}
                    {/* SOL TARAF: KİTAP OKUMA SAYFASI TUVALİ                    */}
                    {/* ──────────────────────────────────────────────────────── */}
                    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10 bg-[#080d19]">
                        
                        {/* Sayfa Üst Bilgi Barı */}
                        <div className="px-4 py-2 border-b border-white/8 flex items-center justify-between text-xs bg-black/20">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-black">
                                    {currentPage.grade}. Sınıf Kitabı
                                </Badge>
                                <span className="font-bold text-white">{currentPage.pageNumber}. Sayfa: {currentPage.title}</span>
                                <span className="hidden md:inline text-slate-400">({currentPage.surahInfo})</span>
                            </div>

                            {/* Zoom Kontrolleri */}
                            <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-xl border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.15))}
                                    className="p-1 hover:text-white text-slate-400"
                                    title="Uzaklaştır"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] font-mono font-bold w-9 text-center text-indigo-300">
                                    %{Math.round(zoomLevel * 100)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.15))}
                                    className="p-1 hover:text-white text-slate-400"
                                    title="Yakınlaştır"
                                >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setZoomLevel(1.0)}
                                    className="p-1 hover:text-white text-slate-500 hover:text-slate-300 text-[10px]"
                                    title="Sıfırla"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* GÖRSEL GÖRÜNTÜLEME ALANI */}
                        <div className={cn(
                            "flex-1 min-h-0 overflow-auto p-4 sm:p-6 flex items-center justify-center relative transition-colors duration-300",
                            themeMode === 'paper' ? "bg-[#f9f5ea]" :
                            themeMode === 'light' ? "bg-white" : "bg-[#090e1a]"
                        )}>
                            {/* Satır Takip Cetveli (Reader Line Guide) */}
                            {showRuler && (
                                <div
                                    className="absolute left-0 right-0 z-30 pointer-events-none transition-all duration-150"
                                    style={{ top: `${rulerTopPercent}%` }}
                                >
                                    <div className="h-14 sm:h-16 w-full bg-amber-400/25 border-y-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.3)] backdrop-blur-[0.5px]" />
                                    <div className="absolute right-3 -top-6 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                                        Satır Kılavuzu (Ok Tuşları: ↑ / ↓)
                                    </div>
                                </div>
                            )}

                            {/* Sayfa Görseli */}
                            <div 
                                className="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-200"
                                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                            >
                                <img
                                    src={currentPage.imageSrc}
                                    alt={currentPage.title}
                                    onError={(e) => {
                                        // Resim henüz yüklenmemişse görsel placeholder'a geç
                                        (e.target as HTMLElement).style.display = 'none';
                                        const placeholder = document.getElementById(`placeholder-${currentPage.id}`);
                                        if (placeholder) placeholder.style.display = 'flex';
                                    }}
                                    className={cn(
                                        "h-auto max-h-[82vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border-2 pointer-events-none select-none transition-all",
                                        themeMode === 'paper' ? "border-amber-900/10 shadow-amber-950/20" :
                                        themeMode === 'light' ? "border-slate-200 shadow-slate-900/10" :
                                        "border-white/10 shadow-black/80 invert-[0.92] hue-rotate-180 contrast-125"
                                    )}
                                />

                                {/* Resim Henüz Klasöre Eklenmemişse Gözüken Zengin Placeholder */}
                                <div
                                    id={`placeholder-${currentPage.id}`}
                                    style={{ display: 'none' }}
                                    className={cn(
                                        "w-[480px] max-w-full min-h-[500px] p-8 rounded-3xl border-4 border-dashed flex flex-col items-center justify-center text-center shadow-xl",
                                        themeMode === 'paper' ? "bg-amber-50/90 border-amber-400/50 text-slate-800" :
                                        themeMode === 'light' ? "bg-slate-50 border-slate-300 text-slate-800" :
                                        "bg-slate-900/90 border-violet-500/40 text-slate-100"
                                    )}
                                >
                                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
                                        <BookOpen className="w-8 h-8" />
                                    </div>
                                    <Badge className="mb-2 bg-emerald-600 text-white font-black text-xs px-3 py-1">
                                        {currentPage.grade}. Sınıf • Sayfa {currentPage.pageNumber}
                                    </Badge>
                                    <h3 className="text-xl font-black mb-1">{currentPage.title}</h3>
                                    <p className="text-xs text-slate-500 mb-6 font-semibold">{currentPage.surahInfo}</p>

                                    {/* Örnek Arapça Metin Gösterimi */}
                                    {currentPage.arabicPreview && (
                                        <div className="w-full p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 mb-6 font-serif text-2xl text-right leading-loose text-emerald-800 dark:text-emerald-300">
                                            {currentPage.arabicPreview}
                                        </div>
                                    )}

                                    <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs text-left w-full space-y-1">
                                        <p className="font-bold flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                            Kitap Sayfa Resmi Nasıl Eklenir?
                                        </p>
                                        <p className="text-[11px] opacity-90 leading-relaxed font-mono">
                                            Dosyayı projenizdeki <span className="font-bold underline">{currentPage.imageSrc}</span> konumuna atın. Sayfa anında bu alanda devasa netlikte açılacaktır.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ──────────────────────────────────────────────────────── */}
                    {/* SAĞ TARAF: 10 KRİTERLİ TİLAVET & TECVİD RUBRİĞİ          */}
                    {/* ──────────────────────────────────────────────────────── */}
                    <div className="w-full lg:w-[480px] xl:w-[540px] shrink-0 flex flex-col min-h-0 bg-[#0d1322] border-t lg:border-t-0">
                        
                        {/* Rubrik Üst Başlığı & Skor Göstergesi */}
                        <div className="p-4 border-b border-white/10 bg-white/5 shrink-0 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
                                    <Award className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm text-white">Tilavet &amp; Tecvid Rubriği</h4>
                                    <p className="text-[11px] text-slate-400 font-semibold">10 Kriter • 100 Puan Üzerinden</p>
                                </div>
                            </div>

                            {/* Puan Rozeti */}
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "px-3 py-1 rounded-xl border text-center font-mono font-black",
                                    gradeBadge.bg, gradeBadge.color
                                )}>
                                    <div className="text-xl leading-none font-black">{currentScore}</div>
                                    <div className="text-[9px] uppercase tracking-wider font-sans">{gradeBadge.label}</div>
                                </div>
                            </div>
                        </div>

                        {/* Sihirli Buton: Tümünü Tam Yap */}
                        <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border-b border-white/8 shrink-0 flex items-center justify-between gap-2">
                            <span className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                Hızlı Not Verme
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSetAllFull}
                                className="h-7 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-900/40 transition-all hover:scale-105 active:scale-95"
                            >
                                ✨ Tümünü Başarılı Yap (100 Puan)
                            </Button>
                        </div>

                        {/* 10 Kriter Listesi (Kaydırılabilir Alan) */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5 pr-2">
                            {TILAVET_RUBRIC_CRITERIA.map((criterion) => {
                                const currentPoint = criteriaScores[criterion.id] ?? null;

                                return (
                                    <div
                                        key={criterion.id}
                                        className={cn(
                                            "p-3 rounded-2xl border transition-all duration-200",
                                            currentPoint === 10 ? "bg-emerald-950/40 border-emerald-500/50 shadow-sm" :
                                            currentPoint !== null && currentPoint >= 8 ? "bg-teal-950/40 border-teal-500/50 shadow-sm" :
                                            currentPoint !== null && currentPoint >= 6 ? "bg-amber-950/40 border-amber-500/50 shadow-sm" :
                                            currentPoint !== null && currentPoint >= 4 ? "bg-orange-950/40 border-orange-500/50 shadow-sm" :
                                            currentPoint !== null && currentPoint >= 1 ? "bg-rose-950/40 border-rose-500/40 shadow-sm" :
                                            currentPoint === 0 ? "bg-rose-950/60 border-rose-500/60 shadow-sm" :
                                            "bg-white/4 border-white/8 hover:bg-white/6"
                                        )}
                                    >
                                        {/* Kriter Başlığı, Rozet ve +/- Ayarlayıcı */}
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-mono font-black flex items-center justify-center text-slate-300 shrink-0">
                                                    {criterion.number}
                                                </span>
                                                <span className="font-black text-xs text-white truncate">
                                                    {criterion.name}
                                                </span>
                                            </div>

                                            {/* Puan Göstergesi & Hızlı Arttır/Azalt */}
                                            <div className="flex items-center gap-1 shrink-0 bg-black/40 border border-white/10 rounded-xl p-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAdjustCriterion(criterion.id, -1)}
                                                    className="w-6 h-6 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                                                    title="1 Puan Düşür"
                                                >
                                                    -
                                                </button>
                                                
                                                <div className="min-w-[48px] px-1 text-center font-mono font-black text-xs">
                                                    {currentPoint !== null ? (
                                                        <span className={cn(
                                                            currentPoint === 10 ? "text-emerald-400" :
                                                            currentPoint >= 8 ? "text-teal-400" :
                                                            currentPoint >= 6 ? "text-amber-400" :
                                                            currentPoint >= 4 ? "text-orange-400" :
                                                            "text-rose-400"
                                                        )}>
                                                            {currentPoint} <span className="text-[10px] text-slate-500">/ 10</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500">- <span className="text-[10px]">/ 10</span></span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleAdjustCriterion(criterion.id, 1)}
                                                    className="w-6 h-6 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                                                    title="1 Puan Arttır"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-slate-400 leading-relaxed mb-2 pl-7">
                                            {criterion.description}
                                        </p>

                                        {/* 0'dan 10'a Birebir Puanlama Düğmeleri (11 Düğme) */}
                                        <div className="pl-7 space-y-2">
                                            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(pt => {
                                                    const isSelected = currentPoint === pt;
                                                    return (
                                                        <button
                                                            key={pt}
                                                            type="button"
                                                            onClick={() => handleSetCriterion(criterion.id, pt)}
                                                            className={cn(
                                                                "flex-1 min-w-[26px] sm:min-w-[28px] h-7.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer flex items-center justify-center border",
                                                                isSelected
                                                                    ? pt === 10
                                                                        ? "bg-emerald-500 text-white border-emerald-300 shadow-md shadow-emerald-950 font-black scale-105"
                                                                        : pt >= 8
                                                                            ? "bg-teal-500 text-slate-950 border-teal-300 shadow-md shadow-teal-950 font-black scale-105"
                                                                            : pt >= 6
                                                                                ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-950 font-black scale-105"
                                                                                : pt >= 4
                                                                                    ? "bg-orange-500 text-white border-orange-300 shadow-md shadow-orange-950 font-black scale-105"
                                                                                    : "bg-rose-500 text-white border-rose-300 shadow-md shadow-rose-950 font-black scale-105"
                                                                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/15 hover:border-white/25"
                                                            )}
                                                            title={`${criterion.name}: ${pt} Puan`}
                                                        >
                                                            {pt}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Hızlı Kısayol Etiketleri: Tam (10p), Kısmen (5p), Hatalı (0p) */}
                                            <div className="flex items-center justify-between gap-1.5 text-[10px]">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetCriterion(criterion.id, 10)}
                                                    className={cn(
                                                        "flex-1 py-1 px-1.5 rounded-lg border font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                                                        currentPoint === 10
                                                            ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-black"
                                                            : "bg-white/3 border-white/8 text-slate-400 hover:text-emerald-300 hover:bg-white/8"
                                                    )}
                                                >
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                    <span>Tam (10)</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSetCriterion(criterion.id, 5)}
                                                    className={cn(
                                                        "flex-1 py-1 px-1.5 rounded-lg border font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                                                        currentPoint === 5
                                                            ? "bg-amber-500/20 border-amber-500/60 text-amber-300 font-black"
                                                            : "bg-white/3 border-white/8 text-slate-400 hover:text-amber-300 hover:bg-white/8"
                                                    )}
                                                >
                                                    <HelpCircle className="w-3 h-3 text-amber-400" />
                                                    <span>Orta (5)</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSetCriterion(criterion.id, 0)}
                                                    className={cn(
                                                        "flex-1 py-1 px-1.5 rounded-lg border font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                                                        currentPoint === 0
                                                            ? "bg-rose-500/20 border-rose-500/60 text-rose-300 font-black"
                                                            : "bg-white/3 border-white/8 text-slate-400 hover:text-rose-300 hover:bg-white/8"
                                                    )}
                                                >
                                                    <XCircle className="w-3 h-3 text-rose-400" />
                                                    <span>Sıfır (0)</span>
                                                </button>
                                            </div>

                                            {/* Aktif Puana Göre Kılavuz Açıklaması */}
                                            {currentPoint !== null && (
                                                <div className={cn(
                                                    "p-1.5 rounded-lg text-[10px] leading-tight border transition-all",
                                                    currentPoint === 10 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" :
                                                    currentPoint >= 5 ? "bg-amber-500/10 border-amber-500/20 text-amber-300" :
                                                    "bg-rose-500/10 border-rose-500/20 text-rose-300"
                                                )}>
                                                    <span className="font-bold">Ölçüt: </span>
                                                    {currentPoint === 10 ? criterion.guidelines.full :
                                                     currentPoint >= 5 ? criterion.guidelines.partial :
                                                     criterion.guidelines.failed}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Öğretmen Geri Bildirim Notu & Hızlı Etiketler */}
                            <div className="pt-2 border-t border-white/10 space-y-2">
                                <label className="text-xs font-bold text-slate-300 block">
                                    Öğretmen Tilavet Değerlendirme Notu
                                </label>
                                
                                {/* Hızlı Etiket Butonları */}
                                <div className="flex flex-wrap gap-1">
                                    {QUICK_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => handleAddQuickTag(tag)}
                                            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-[10px] font-semibold border border-white/10 transition-all"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>

                                <Textarea
                                    value={teacherNotes}
                                    onChange={(e) => setTeacherNotes(e.target.value)}
                                    placeholder="Öğrencinin okuması hakkında bireysel not (örn: Harfler temiz ancak 4 eliflik medlerde uzatmayı erken kesti)..."
                                    className="h-16 text-xs bg-white/5 border-white/15 text-white rounded-xl resize-none"
                                />
                            </div>
                        </div>

                        {/* ALT ŞERİT: KAYDETME BUTONLARI */}
                        <div className="p-3 sm:p-4 border-t border-white/10 bg-white/5 shrink-0 flex flex-col sm:flex-row gap-2">
                            <Button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveProgress(false)}
                                variant="outline"
                                className="flex-1 h-11 rounded-2xl bg-white/10 hover:bg-white/15 border-white/20 text-white font-bold text-xs"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Sadece Kaydet
                            </Button>

                            <Button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveProgress(true)}
                                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-900/40"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                Kaydet &amp; Sıradaki Öğrenci [→]
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
