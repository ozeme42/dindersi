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
    RotateCcw,
    Sparkles,
    Keyboard,
    Search,
    BookOpen,
    Sun,
    Moon
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ELIFBA_STAGES, ElifbaStage, getStageItemAssetUrls } from "@/lib/elifba-curriculum";
import { saveStudentQuranProgress, type QuranStudentProgress } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";

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
    
    // Kart Görünümü: 'dark' (Beyaz Yazı - Koyu Zemin) | 'light' (Siyah Yazı - Aydınlık Zemin)
    const [cardTheme, setCardTheme] = useState<'dark' | 'light'>('dark');

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
        return ELIFBA_STAGES.find(s => s.id === selectedStageId) || ELIFBA_STAGES[0];
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

    // Orijinal Sesi Çal
    const playStageAudio = useCallback(() => {
        if (!currentAsset?.audio) return;
        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            const audio = new Audio(currentAsset.audio);
            audioRef.current = audio;
            audio.play().catch(e => console.log("Ses oynatılamadı:", e));
        } catch (e) {
            console.error("Audio error:", e);
        }
    }, [currentAsset?.audio]);

    // Otomatik ses çal
    useEffect(() => {
        if (autoPlayAudio && currentAsset?.audio) {
            playStageAudio();
        }
    }, [currentItemIndex, autoPlayAudio, currentAsset?.audio, playStageAudio]);

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

    // Klavye Kısayolları
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Eğer arama input'u odaktaysa kısayolları yoksay
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === '1' || e.key === '+') {
                e.preventDefault();
                handleMark('+');
            } else if (e.key === '2') {
                e.preventDefault();
                handleMark('o');
            } else if (e.key === '3' || e.key === '-') {
                e.preventDefault();
                handleMark('-');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (currentItemIndex < currentStage.itemCount) setCurrentItemIndex(prev => prev + 1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (currentItemIndex > 1) setCurrentItemIndex(prev => prev - 1);
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                playStageAudio();
            } else if (e.key.toLowerCase() === 'm') {
                e.preventDefault();
                setSoundEnabled(prev => !prev);
            } else if (e.key.toLowerCase() === 't') {
                e.preventDefault();
                setCardTheme(prev => prev === 'dark' ? 'light' : 'dark');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentItemIndex, currentStage.itemCount, handleMark, playStageAudio]);

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

    // Önceki / Sonraki Öğrenci
    const currentStudentIndex = useMemo(() => {
        if (!student) return -1;
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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl w-[95vw] h-[92vh] p-0 overflow-hidden bg-slate-950 border border-white/10 text-slate-100 flex flex-col shadow-2xl rounded-3xl">
                
                {/* MODAL ÜST BAR: Öğrenci Seçici & Aşama & Kontroller */}
                <div className="flex items-center justify-between p-4 px-6 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl shrink-0 gap-3">
                    <DialogHeader className="p-0 space-y-0 text-left">
                        <DialogTitle className="flex items-center gap-3">
                            {/* Hızlı Öğrenci Seçici Popover */}
                            <Popover open={isStudentPickerOpen} onOpenChange={setIsStudentPickerOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-white font-black text-base transition-all group cursor-pointer"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                                            {student.displayName?.charAt(0) || 'Ö'}
                                        </div>
                                        <span className="group-hover:text-indigo-300 transition-colors">
                                            {student.displayName}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] text-indigo-300 border-indigo-400/40">
                                            {currentStudentIndex + 1}/{allStudents.length}
                                        </Badge>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-2 bg-slate-900 border-white/10 text-white rounded-2xl shadow-2xl">
                                    <div className="relative mb-2">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            placeholder="Öğrenci ara..."
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            className="h-8 pl-8 text-xs bg-slate-950 border-white/10 text-white rounded-xl"
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                        {filteredStudents.map((s, idx) => (
                                            <button
                                                key={s.uid}
                                                onClick={() => {
                                                    onSelectStudent(s);
                                                    setIsStudentPickerOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-left transition-colors",
                                                    s.uid === student.uid
                                                        ? "bg-indigo-600 text-white font-bold"
                                                        : "hover:bg-white/5 text-slate-300"
                                                )}
                                            >
                                                <span>{s.displayName}</span>
                                                <span className="text-[10px] opacity-60">#{idx + 1}</span>
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Önceki / Sonraki Öğrenci Okları */}
                            <div className="flex items-center gap-1">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handlePrevStudent}
                                    disabled={currentStudentIndex <= 0}
                                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                                    title="Önceki Öğrenci"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleNextStudent}
                                    disabled={currentStudentIndex >= allStudents.length - 1}
                                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                                    title="Sonraki Öğrenci"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{className} - {branch}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">{currentStage.title}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {/* Sağ Kontroller: Aşama Seçici, Zemin/Yazı Rengi & Ses Ayarı */}
                    <div className="flex items-center gap-2">
                        {/* Aşama Değiştirici (Radix UI Select - Asla siyah zemin sorunu olmaz) */}
                        <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                            <SelectTrigger className="bg-slate-950 border-white/10 text-xs text-white font-bold h-8 rounded-xl min-w-[140px]">
                                <SelectValue placeholder="Aşama Seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white max-h-72">
                                {ELIFBA_STAGES.filter(s => s.category !== 'quran').map(stage => (
                                    <SelectItem key={stage.id} value={stage.id} className="text-xs text-white font-semibold">
                                        {stage.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* YAZI / ZEMİN TEMA SEÇİCİ (Koyu Zemin & Beyaz Yazı vs. Aydınlık Kart) */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCardTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                            className={cn(
                                "h-8 px-2.5 text-xs font-bold rounded-xl border transition-all",
                                cardTheme === 'dark'
                                    ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/40 hover:bg-indigo-600/40 shadow-sm"
                                    : "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-sm"
                            )}
                            title="Yazı ve Zemin Rengini Değiştir [T]"
                        >
                            {cardTheme === 'dark' ? (
                                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-cyan-300" /> Beyaz Yazı 🌙</span>
                            ) : (
                                <span className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-amber-400" /> Aydınlık Kart ☀️</span>
                            )}
                        </Button>

                        {/* Otomatik Ses Çalma Toggle */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAutoPlayAudio(prev => !prev)}
                            className={cn(
                                "h-8 px-2.5 text-xs font-bold rounded-xl border transition-all",
                                autoPlayAudio
                                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                    : "border-white/10 text-slate-400 hover:text-white"
                            )}
                            title="Her yeni kartta sesi otomatik çal"
                        >
                            <Volume2 className="w-3.5 h-3.5 mr-1" />
                            Oto: {autoPlayAudio ? "Açık" : "Kapalı"}
                        </Button>

                        {/* Genel Ses Aç/Kapat */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSoundEnabled(prev => !prev)}
                            className={cn(
                                "h-8 w-8 rounded-xl border transition-all",
                                soundEnabled
                                    ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                    : "text-slate-500 border-white/10"
                            )}
                            title="Efekt Sesleri [M]"
                        >
                            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* ORTA SAHNE: Akıllı Tahta Kartı & Dinleme */}
                <div className="flex-1 flex flex-col items-center justify-between p-3 sm:p-4 md:p-5 relative overflow-y-auto custom-scrollbar min-h-0 bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
                    
                    {/* Arka Plan Glow Efekti (Kart durumuna göre renk değişir) */}
                    <div className={cn(
                        "absolute w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-20 transition-all duration-500",
                        cardStatuses[currentItemIndex] === '+' ? "bg-emerald-500" :
                        cardStatuses[currentItemIndex] === '-' ? "bg-rose-500" :
                        cardStatuses[currentItemIndex] === 'o' ? "bg-amber-500" : "bg-indigo-600"
                    )} />

                    {/* Kart Üst Bilgisi (Sıra ve Yüzde) */}
                    <div className="w-full max-w-lg flex items-center justify-between mb-2 shrink-0 z-10">
                        <Badge className="bg-slate-800/80 border border-white/10 text-white text-xs px-3 py-0.5 font-mono">
                            Kart: {currentItemIndex} / {currentStage.itemCount}
                        </Badge>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> {stats.correct}</span>
                            <span className="text-amber-400 flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5"/> {stats.help}</span>
                            <span className="text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> {stats.wrong}</span>
                            <span className="text-indigo-300 font-mono font-black">Başarı: %{stats.score}</span>
                        </div>
                    </div>

                    {/* ANA GÖRSEL KART */}
                    <div className={cn(
                        "relative group w-full max-w-lg flex-1 min-h-[160px] max-h-[270px] sm:max-h-[320px] rounded-3xl p-4 shadow-2xl flex flex-col items-center justify-center z-10 transition-all",
                        cardTheme === 'dark'
                            ? "bg-slate-900/90 border-2 border-white/20 backdrop-blur-2xl shadow-cyan-950/20"
                            : "bg-white border-4 border-slate-200 shadow-2xl"
                    )}>
                        
                        {/* Sol / Sağ Gezinme Butonları (Kartın üzerinde uçuşan) */}
                        <button
                            onClick={() => currentItemIndex > 1 && setCurrentItemIndex(prev => prev - 1)}
                            disabled={currentItemIndex <= 1}
                            className={cn(
                                "absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-0 cursor-pointer shadow-lg z-20",
                                cardTheme === 'dark'
                                    ? "bg-black/60 hover:bg-black/90 border border-white/20 text-white"
                                    : "bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800"
                            )}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => currentItemIndex < currentStage.itemCount && setCurrentItemIndex(prev => prev + 1)}
                            disabled={currentItemIndex >= currentStage.itemCount}
                            className={cn(
                                "absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-0 cursor-pointer shadow-lg z-20",
                                cardTheme === 'dark'
                                    ? "bg-black/60 hover:bg-black/90 border border-white/20 text-white"
                                    : "bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800"
                            )}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* GÖRSEL ALANI (Koyu modda beyaz ve ışıl ışıl, aydınlık modda orijinal siyah) */}
                        {currentAsset?.img ? (
                            <div className="w-full h-full flex items-center justify-center p-2 min-h-0">
                                <img
                                    src={currentAsset.img}
                                    alt={`Kart ${currentItemIndex}`}
                                    className="max-h-full max-w-full object-contain select-none pointer-events-none transition-all duration-300"
                                    style={{
                                        filter: cardTheme === 'dark'
                                            ? 'invert(1) hue-rotate(180deg) brightness(1.2) contrast(1.15) drop-shadow(0 0 16px rgba(255,255,255,0.3))'
                                            : 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))'
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="text-center p-6 text-slate-500">
                                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-40" />
                                <p className="text-sm font-bold text-slate-300">Görsel bulunamadı</p>
                            </div>
                        )}

                        {/* Kart Durum Rozeti */}
                        {cardStatuses[currentItemIndex] && (
                            <div className="absolute top-3 right-3 animate-in zoom-in-50 duration-200 z-20">
                                {cardStatuses[currentItemIndex] === '+' && (
                                    <Badge className="bg-emerald-500 text-white font-black px-2.5 py-0.5 text-xs shadow-lg shadow-emerald-900/50">
                                        ✓ Doğru Okundu
                                    </Badge>
                                )}
                                {cardStatuses[currentItemIndex] === 'o' && (
                                    <Badge className="bg-amber-500 text-white font-black px-2.5 py-0.5 text-xs shadow-lg shadow-amber-900/50">
                                        O Yardımla
                                    </Badge>
                                )}
                                {cardStatuses[currentItemIndex] === '-' && (
                                    <Badge className="bg-rose-500 text-white font-black px-2.5 py-0.5 text-xs shadow-lg shadow-rose-900/50">
                                        ✗ Tekrar Edilmeli
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Orijinal Sesi Dinle Butonu */}
                        {currentAsset?.audio && (
                            <button
                                onClick={playStageAudio}
                                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 transition-all hover:scale-105 active:scale-95 z-20"
                                title="Orijinal telaffuzu dinle [Boşluk]"
                            >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Sesi Dinle (Boşluk)</span>
                            </button>
                        )}
                    </div>

                    {/* BÜYÜK DEĞERLENDİRME AKSİYONLARI (HER EKRANDA KESİNTİSİZ GÖRÜNÜR) */}
                    <div className="flex items-center gap-3 sm:gap-4 mt-3 z-10 w-full max-w-lg shrink-0">
                        <Button
                            onClick={() => handleMark('+')}
                            className="flex-1 h-12 sm:h-14 bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-950/50 flex flex-col items-center justify-center gap-0.5 border border-emerald-400/30 transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="flex items-center gap-1.5 text-sm sm:text-base"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5"/> DOĞRU</span>
                            <span className="text-[10px] font-mono opacity-70">[ 1 ]</span>
                        </Button>

                        <Button
                            onClick={() => handleMark('o')}
                            className="flex-1 h-12 sm:h-14 bg-gradient-to-br from-amber-600 to-yellow-700 hover:from-amber-500 hover:to-yellow-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-950/50 flex flex-col items-center justify-center gap-0.5 border border-amber-400/30 transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="flex items-center gap-1.5 text-sm sm:text-base"><HelpCircle className="w-4 h-4 sm:w-5 sm:h-5"/> YARDIMLA</span>
                            <span className="text-[10px] font-mono opacity-70">[ 2 ]</span>
                        </Button>

                        <Button
                            onClick={() => handleMark('-')}
                            className="flex-1 h-12 sm:h-14 bg-gradient-to-br from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-rose-950/50 flex flex-col items-center justify-center gap-0.5 border border-rose-400/30 transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="flex items-center gap-1.5 text-sm sm:text-base"><XCircle className="w-4 h-4 sm:w-5 sm:h-5"/> TEKRAR</span>
                            <span className="text-[10px] font-mono opacity-70">[ 3 ]</span>
                        </Button>
                    </div>
                </div>

                {/* ALT ŞERİT: Mini Harf / Kart Strip & Kaydet Butonu */}
                <div className="px-4 py-2.5 border-t border-white/10 bg-slate-900/90 flex flex-col gap-2 shrink-0">
                    {/* Kart Şeridi */}
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                        {Array.from({ length: currentStage.itemCount }, (_, i) => i + 1).map(num => {
                            const st = cardStatuses[num];
                            const isCurrent = currentItemIndex === num;
                            return (
                                <button
                                    key={num}
                                    onClick={() => setCurrentItemIndex(num)}
                                    className={cn(
                                        "min-w-[32px] h-8 rounded-xl font-black text-xs flex flex-col items-center justify-center transition-all relative border cursor-pointer",
                                        isCurrent
                                            ? "border-cyan-400 bg-cyan-950/80 text-white scale-105 shadow-md shadow-cyan-900/40"
                                            : "border-white/5 bg-slate-950 text-slate-400 hover:border-white/20 hover:text-white",
                                        st === '+' && "border-emerald-500/50 bg-emerald-950/40 text-emerald-300",
                                        st === 'o' && "border-amber-500/50 bg-amber-950/40 text-amber-300",
                                        st === '-' && "border-rose-500/50 bg-rose-950/40 text-rose-300"
                                    )}
                                >
                                    <span>{num}</span>
                                    {st && (
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full absolute bottom-1",
                                            st === '+' ? "bg-emerald-400" : st === 'o' ? "bg-amber-400" : "bg-rose-400"
                                        )} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Alt Çubuk: Klavye Rehberi & Kaydet */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Keyboard className="w-3.5 h-3.5"/> [1] Doğru • [2] Yardımla • [3] Tekrar</span>
                            <span>•</span>
                            <span>[Boşluk] Ses • [←/→] Geçiş • [T] Renk Teması</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCardStatuses({})}
                                className="h-8 text-xs text-slate-400 hover:text-white"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" /> Sıfırla
                            </Button>

                            <Button
                                onClick={handleSaveProgress}
                                disabled={isSaving}
                                className={cn(
                                    "h-8 px-4 font-bold text-xs rounded-xl shadow-lg transition-all",
                                    stats.score >= 70
                                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                )}
                            >
                                <Save className="w-3.5 h-3.5 mr-1.5" />
                                {stats.score >= 70 ? "Geçti Olarak Kaydet (✓)" : "İlerlemeyi Kaydet"}
                            </Button>
                        </div>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
