'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Volume2,
    VolumeX,
    CheckCircle2,
    XCircle,
    HelpCircle,
    Save,
    Loader2,
    Play,
    Sparkles,
    GraduationCap,
    Award,
    BookOpen,
    AlertTriangle,
    Check,
    RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
    DIYANET_ELIFBA_STAGES,
    getStageItemMeta,
    getStageItemAssetUrls,
    mapLegacyStageIdToDiyanet,
    isDiyanetStageCompleted,
    CUZ1_LETTER_META,
    LEGACY_STAGE_ALIASES,
    ElifbaStage
} from '@/lib/elifba-curriculum';
import { saveStudentQuranProgress, type QuranStudentProgress } from './actions';

interface StudentLetterReportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    student: UserProfile | null;
    initialStageId?: string;
    classId: string;
    className: string;
    branch: string;
    progress?: QuranStudentProgress;
    onStartLiveTest?: (student: UserProfile, stageId: string) => void;
    onProgressSaved?: () => void;
    ambianceTheme?: 'dark' | 'light';
}

export function StudentLetterReportDialog({
    isOpen,
    onClose,
    student,
    initialStageId = 'cuz1',
    classId,
    className,
    branch,
    progress,
    onStartLiveTest,
    onProgressSaved,
    ambianceTheme = 'dark'
}: StudentLetterReportDialogProps) {
    const { toast } = useToast();
    const [selectedStageId, setSelectedStageId] = useState<string>(initialStageId);
    const [localStatuses, setLocalStatuses] = useState<Record<number, '+' | 'o' | '-'>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Dialog açıldığında veya öğrenci / stageId değiştiğinde
    useEffect(() => {
        if (!isOpen) return;
        const resolved = initialStageId ? mapLegacyStageIdToDiyanet(initialStageId) : 'cuz1';
        setSelectedStageId(resolved);
    }, [isOpen, initialStageId]);

    // Seçili aşamanın nesnesi
    const currentStage = useMemo(() => {
        return DIYANET_ELIFBA_STAGES.find(s => s.id === selectedStageId) || DIYANET_ELIFBA_STAGES[0];
    }, [selectedStageId]);

    // Kaydedilmiş harf durumlarını yükle
    useEffect(() => {
        if (!isOpen || !student) return;

        const stages = progress?.stages || {};
        let saved = stages[selectedStageId]?.itemStatuses;

        if (!saved) {
            for (const [legacyId, mappedId] of Object.entries(LEGACY_STAGE_ALIASES)) {
                if (mappedId === selectedStageId && stages[legacyId]?.itemStatuses) {
                    saved = stages[legacyId].itemStatuses;
                    break;
                }
            }
        }

        if (saved && typeof saved === 'object') {
            const parsed: Record<number, '+' | 'o' | '-'> = {};
            for (const [key, val] of Object.entries(saved)) {
                const num = Number(key);
                if (!isNaN(num) && (val === '+' || val === 'o' || val === '-')) {
                    parsed[num] = val;
                }
            }
            setLocalStatuses(parsed);
        } else {
            setLocalStatuses({});
        }
        setHasUnsavedChanges(false);
    }, [isOpen, student?.uid, selectedStageId, progress]);

    // İstatistikler
    const stats = useMemo(() => {
        const total = currentStage.itemCount;
        const correct = Object.values(localStatuses).filter(s => s === '+').length;
        const help = Object.values(localStatuses).filter(s => s === 'o').length;
        const wrong = Object.values(localStatuses).filter(s => s === '-').length;
        const evaluated = Object.keys(localStatuses).length;
        const untested = Math.max(0, total - evaluated);
        const score = total > 0 ? Math.round(((correct + help * 0.5) / total) * 100) : 0;
        const isPassed = score >= 70;
        return { total, correct, help, wrong, evaluated, untested, score, isPassed };
    }, [localStatuses, currentStage.itemCount]);

    // Tekrar edilmesi gereken harflerin listesi
    const repeatItems = useMemo(() => {
        const list: { index: number; status: '+' | 'o' | '-'; meta: ReturnType<typeof getStageItemMeta> }[] = [];
        for (let i = 1; i <= currentStage.itemCount; i++) {
            const st = localStatuses[i];
            if (st === '-' || st === 'o') {
                list.push({
                    index: i,
                    status: st,
                    meta: getStageItemMeta(currentStage.id, i)
                });
            }
        }
        return list;
    }, [localStatuses, currentStage]);

    // Orijinal Telaffuz Sesini Çal
    const playAudio = useCallback((itemIndex: number) => {
        const asset = getStageItemAssetUrls(currentStage.id, itemIndex);
        if (!asset?.audio) return;

        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            const audio = new Audio(asset.audio);
            audioRef.current = audio;
            setPlayingIndex(itemIndex);
            audio.play().catch(e => {
                console.log("Ses oynatılamadı:", e);
                setPlayingIndex(null);
            });
            audio.onended = () => setPlayingIndex(null);
        } catch (e) {
            console.error("Audio error:", e);
            setPlayingIndex(null);
        }
    }, [currentStage.id]);

    // Harf Durumu Değiştirme
    const handleToggleItemStatus = (index: number, newStatus: '+' | 'o' | '-') => {
        setLocalStatuses(prev => {
            const current = prev[index];
            const updated = { ...prev };
            if (current === newStatus) {
                delete updated[index];
            } else {
                updated[index] = newStatus;
            }
            return updated;
        });
        setHasUnsavedChanges(true);
    };

    // Tümünü Doğru Olarak İşaretle
    const handleMarkAllCorrect = () => {
        const updated: Record<number, '+' | 'o' | '-'> = {};
        for (let i = 1; i <= currentStage.itemCount; i++) {
            updated[i] = '+';
        }
        setLocalStatuses(updated);
        setHasUnsavedChanges(true);
    };

    // Tümünü Temizle
    const handleClearAll = () => {
        setLocalStatuses({});
        setHasUnsavedChanges(true);
    };

    // Kaydet
    const handleSave = async () => {
        if (!student) return;
        setIsSaving(true);
        try {
            const status = stats.score >= 70 ? 'completed' : 'in_progress';
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
                itemStatuses: localStatuses,
                notes: `${stats.correct} doğru, ${stats.help} yardımla, ${stats.wrong} tekrar.`
            });

            if (res.success) {
                toast({
                    title: "Kaydedildi 🎉",
                    description: `${student.displayName} için ${currentStage.title} değerlendirmesi güncellendi.`
                });
                setHasUnsavedChanges(false);
                onProgressSaved?.();
            } else {
                toast({
                    title: "Kayıt Hatası",
                    description: res.error || "İlerleme kaydedilemedi.",
                    variant: "destructive"
                });
            }
        } catch (e: any) {
            toast({
                title: "Hata",
                description: e?.message || "Kayıt sırasında hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={cn(
                "max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-3xl border shadow-2xl",
                ambianceTheme === 'dark'
                    ? "bg-slate-950 border-white/15 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
            )}>
                {/* 1. ÜST BAŞLIK VE ÖĞRENCİ BİLGİSİ */}
                <div className={cn(
                    "p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0",
                    ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-pink-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-violet-900/40 shrink-0">
                            {student.displayName?.charAt(0) || 'Ö'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg sm:text-xl font-black tracking-tight">{student.displayName}</h2>
                                {student.studentNumber && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                        No: {student.studentNumber}
                                    </Badge>
                                )}
                                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                                    {className} {branch !== 'all' ? `(${branch})` : ''}
                                </Badge>
                            </div>
                            <p className={cn("text-xs mt-0.5", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                                Detaylı Harf &amp; Aşama Değerlendirme Karnesi
                            </p>
                        </div>
                    </div>

                    {/* Aşama Seçici */}
                    <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-bold shrink-0", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>Aşama:</span>
                        <Select
                            value={selectedStageId}
                            onValueChange={(val) => {
                                if (hasUnsavedChanges) {
                                    if (!window.confirm("Kaydedilmemiş değişiklikleriniz var. Aşamayı değiştirmek istediğinize emin misiniz?")) {
                                        return;
                                    }
                                }
                                setSelectedStageId(val);
                            }}
                        >
                            <SelectTrigger className={cn(
                                "w-[220px] sm:w-[260px] h-9 rounded-xl font-bold text-xs border",
                                ambianceTheme === 'dark'
                                    ? "bg-white/10 border-white/15 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                            )}>
                                <SelectValue placeholder="Aşama Seç" />
                            </SelectTrigger>
                            <SelectContent className={ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"}>
                                {DIYANET_ELIFBA_STAGES.filter(s => s.category !== 'quran').map((s) => {
                                    const isComp = isDiyanetStageCompleted(progress?.stages, s.id);
                                    return (
                                        <SelectItem key={s.id} value={s.id} className="text-xs font-semibold">
                                            <span>{isComp ? '✓ ' : ''}{s.shortTitle} ({s.itemCount} Öğe)</span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 2. ÖZET İSTATİSTİKLER VE UYARI ŞERİDİ */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                    
                    {/* Özet Kartları */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {/* Başarı Puanı */}
                        <div className={cn(
                            "p-3 rounded-2xl border transition-all text-center flex flex-col justify-center",
                            stats.isPassed
                                ? (ambianceTheme === 'dark' ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-emerald-50 border-emerald-300 text-emerald-900")
                                : (ambianceTheme === 'dark' ? "bg-amber-950/40 border-amber-500/40 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-900")
                        )}>
                            <span className="text-[11px] font-bold block opacity-80">Başarı Puanı</span>
                            <span className="text-2xl sm:text-3xl font-black font-mono mt-0.5">%{stats.score}</span>
                            <span className="text-[10px] font-bold mt-0.5">
                                {stats.isPassed ? "✓ AŞAMA GEÇİLDİ" : "⏳ GELİŞTİRİLMELİ"}
                            </span>
                        </div>

                        {/* Doğru Sayısı */}
                        <div className={cn(
                            "p-3 rounded-2xl border text-center flex flex-col justify-center",
                            ambianceTheme === 'dark' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                        )}>
                            <span className="text-[11px] font-bold block opacity-80">Doğru Harfler</span>
                            <span className="text-2xl sm:text-3xl font-black font-mono mt-0.5">{stats.correct}</span>
                            <span className="text-[10px] font-semibold mt-0.5 opacity-80">
                                / {stats.total} Harf
                            </span>
                        </div>

                        {/* Yardımla Sayısı */}
                        <div className={cn(
                            "p-3 rounded-2xl border text-center flex flex-col justify-center",
                            ambianceTheme === 'dark' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800"
                        )}>
                            <span className="text-[11px] font-bold block opacity-80">Yardımla Okunan</span>
                            <span className="text-2xl sm:text-3xl font-black font-mono mt-0.5">{stats.help}</span>
                            <span className="text-[10px] font-semibold mt-0.5 opacity-80">İpuçlu Okuma</span>
                        </div>

                        {/* Tekrar Sayısı */}
                        <div className={cn(
                            "p-3 rounded-2xl border text-center flex flex-col justify-center",
                            stats.wrong > 0
                                ? (ambianceTheme === 'dark' ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-rose-50 border-rose-300 text-rose-900")
                                : (ambianceTheme === 'dark' ? "bg-white/5 border-white/10 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600")
                        )}>
                            <span className="text-[11px] font-bold block opacity-80">Tekrar Gereken</span>
                            <span className="text-2xl sm:text-3xl font-black font-mono mt-0.5">{stats.wrong}</span>
                            <span className="text-[10px] font-semibold mt-0.5 opacity-80">
                                {stats.wrong > 0 ? "⚠️ Eksik Harf" : "Eksik Yok"}
                            </span>
                        </div>
                    </div>

                    {/* 3. ÖZEL VURGU: TEKRAR ÇALIŞILMASI GEREKEN HARFLER UYARI KUTUSU */}
                    {repeatItems.length > 0 ? (
                        <div className={cn(
                            "p-3.5 sm:p-4 rounded-2xl border shadow-sm space-y-2",
                            ambianceTheme === 'dark'
                                ? "bg-gradient-to-r from-rose-950/50 to-amber-950/40 border-rose-500/40 text-rose-200"
                                : "bg-gradient-to-r from-rose-50 to-amber-50 border-rose-300 text-rose-950"
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                                    <h3 className="text-xs sm:text-sm font-black">
                                        Tekrar Çalışılması ve Pekiştirilmesi Gereken Harfler ({repeatItems.length})
                                    </h3>
                                </div>
                                <span className="text-[10px] font-bold opacity-80">
                                    Öğrenciye özel etüt / çalışma rehberi
                                </span>
                            </div>

                            <p className="text-xs leading-relaxed opacity-90">
                                Öğrencinin bu aşamada telaffuzunda veya tanımasında zorlandığı harfler aşağıda listelenmiştir. Bu harflere öncelik veriniz:
                            </p>

                            <div className="flex flex-wrap gap-2 pt-1">
                                {repeatItems.map((item) => (
                                    <div
                                        key={item.index}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm",
                                            item.status === '-'
                                                ? (ambianceTheme === 'dark' ? "bg-rose-500/25 border-rose-500/50 text-rose-100" : "bg-rose-100 border-rose-300 text-rose-900")
                                                : (ambianceTheme === 'dark' ? "bg-amber-500/25 border-amber-500/50 text-amber-100" : "bg-amber-100 border-amber-300 text-amber-900")
                                        )}
                                    >
                                        {/* Arapça Karakter */}
                                        {item.meta.arabic && (
                                            <span className="font-serif text-lg leading-none">{item.meta.arabic}</span>
                                        )}
                                        <span>#{item.index} {item.meta.name}</span>
                                        <Badge className={cn(
                                            "text-[9px] px-1 py-0 h-4",
                                            item.status === '-' ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                                        )}>
                                            {item.status === '-' ? 'Tekrar' : 'Yardımla'}
                                        </Badge>
                                        <button
                                            type="button"
                                            onClick={() => playAudio(item.index)}
                                            className="w-5 h-5 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 text-white cursor-pointer"
                                            title="Sesi Dinle"
                                        >
                                            <Volume2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : stats.evaluated > 0 ? (
                        <div className={cn(
                            "p-3.5 rounded-2xl border flex items-center gap-2.5",
                            ambianceTheme === 'dark' ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-900"
                        )}>
                            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                            <div className="text-xs font-bold">
                                <span>Harika! Bu aşamada tekrar edilmesi gereken hiçbir eksik harf bulunmuyor. Tüm değerlendirilen harfler başarıyla okunmuş.</span>
                            </div>
                        </div>
                    ) : (
                        <div className={cn(
                            "p-3 rounded-2xl border text-xs font-medium text-center",
                            ambianceTheme === 'dark' ? "bg-white/5 border-white/10 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                        )}>
                            Bu aşama için henüz harf testi kaydedilmemiş. Canlı Sınav Başlat butonuna tıklayarak öğrenciyi hemen sınayabilirsiniz.
                        </div>
                    )}

                    {/* Hızlı Toplu İşlem Butonları */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-violet-400" />
                                <span>Tüm Harfler &amp; Öğeler Listesi ({currentStage.itemCount})</span>
                            </h3>
                            <span className={cn("text-[11px]", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                                (Durumu değiştirmek için tıklayın)
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleMarkAllCorrect}
                                className={cn("h-7 px-2 text-[11px] font-bold rounded-lg cursor-pointer", ambianceTheme === 'dark' ? "text-emerald-400 hover:bg-emerald-500/20" : "text-emerald-700 hover:bg-emerald-50")}
                            >
                                <Check className="w-3 h-3 mr-1" /> Tümünü Doğru Yap
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleClearAll}
                                className={cn("h-7 px-2 text-[11px] font-bold rounded-lg cursor-pointer", ambianceTheme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
                            >
                                <RotateCcw className="w-3 h-3 mr-1" /> Sıfırla
                            </Button>
                        </div>
                    </div>

                    {/* 4. TÜM HARFLERİN / ÖĞELERİN DETAYLI IZGARASI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {Array.from({ length: currentStage.itemCount }, (_, i) => i + 1).map((itemIndex) => {
                            const st = localStatuses[itemIndex];
                            const meta = getStageItemMeta(currentStage.id, itemIndex);
                            const isPlaying = playingIndex === itemIndex;

                            return (
                                <div
                                    key={itemIndex}
                                    className={cn(
                                        "p-3 rounded-2xl border transition-all flex flex-col justify-between shadow-sm relative overflow-hidden",
                                        st === '+'
                                            ? (ambianceTheme === 'dark' ? "bg-emerald-950/40 border-emerald-500/50 text-white" : "bg-emerald-50/80 border-emerald-300 text-emerald-950")
                                            : st === '-'
                                            ? (ambianceTheme === 'dark' ? "bg-rose-950/40 border-rose-500/50 text-white ring-1 ring-rose-500/30" : "bg-rose-50/80 border-rose-300 text-rose-950 ring-1 ring-rose-300")
                                            : st === 'o'
                                            ? (ambianceTheme === 'dark' ? "bg-amber-950/40 border-amber-500/50 text-white" : "bg-amber-50/80 border-amber-300 text-amber-950")
                                            : (ambianceTheme === 'dark' ? "bg-white/5 border-white/10 text-slate-300 hover:border-white/20" : "bg-white border-slate-200 text-slate-800 hover:border-slate-300")
                                    )}
                                >
                                    {/* Üst Kısım: Numara + Ses + Durum */}
                                    <div className="flex items-center justify-between gap-1 pb-1">
                                        <span className="font-mono text-[11px] font-bold opacity-75">
                                            #{itemIndex}
                                        </span>

                                        <div className="flex items-center gap-1">
                                            {meta.audio && (
                                                <button
                                                    type="button"
                                                    onClick={() => playAudio(itemIndex)}
                                                    className={cn(
                                                        "w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                                                        isPlaying
                                                            ? "bg-violet-600 text-white animate-pulse"
                                                            : ambianceTheme === 'dark' ? "bg-white/10 hover:bg-white/20 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                                    )}
                                                    title="Orijinal Ses Telaffuzu"
                                                >
                                                    <Volume2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            <Badge className={cn(
                                                "text-[10px] font-bold px-1.5 py-0 h-5",
                                                st === '+' ? "bg-emerald-600 text-white" :
                                                st === '-' ? "bg-rose-600 text-white" :
                                                st === 'o' ? "bg-amber-600 text-white" :
                                                "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                                            )}>
                                                {st === '+' ? '✓ Doğru' : st === '-' ? '✗ Tekrar' : st === 'o' ? '◎ Yardımla' : '— Boş'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Orta Kısım: Büyük Arapça Harf veya Görsel */}
                                    <div className="py-2 flex items-center justify-center">
                                        {meta.arabic ? (
                                            <div className="text-3xl sm:text-4xl font-serif text-center font-bold tracking-normal select-none">
                                                {meta.arabic}
                                            </div>
                                        ) : meta.img ? (
                                            <div className="h-12 w-full flex items-center justify-center p-1 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                <img
                                                    src={meta.img}
                                                    alt={meta.name}
                                                    className="max-h-full max-w-full object-contain pointer-events-none"
                                                    style={{ filter: 'contrast(1.08) brightness(1.0)' }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="text-lg font-bold text-center">
                                                {meta.name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Harf Adı ve Mahreç Açıklaması */}
                                    <div className="text-center pt-1 pb-2">
                                        <span className="text-xs font-black block truncate">{meta.name}</span>
                                        {meta.desc && (
                                            <span className={cn("text-[10px] block line-clamp-1 mt-0.5", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                                                {meta.desc}
                                            </span>
                                        )}
                                    </div>

                                    {/* Alt Kısım: 3 Durum Değiştirme Butonu */}
                                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleItemStatus(itemIndex, '+')}
                                            className={cn(
                                                "h-7 rounded-lg text-[10px] font-black transition-all flex items-center justify-center cursor-pointer",
                                                st === '+'
                                                    ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400"
                                                    : ambianceTheme === 'dark' ? "bg-white/5 hover:bg-emerald-950/40 text-emerald-400" : "bg-slate-100 hover:bg-emerald-100 text-emerald-800"
                                            )}
                                        >
                                            Doğru
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleItemStatus(itemIndex, 'o')}
                                            className={cn(
                                                "h-7 rounded-lg text-[10px] font-black transition-all flex items-center justify-center cursor-pointer",
                                                st === 'o'
                                                    ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-400"
                                                    : ambianceTheme === 'dark' ? "bg-white/5 hover:bg-amber-950/40 text-amber-400" : "bg-slate-100 hover:bg-amber-100 text-amber-800"
                                            )}
                                        >
                                            Yardım
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleItemStatus(itemIndex, '-')}
                                            className={cn(
                                                "h-7 rounded-lg text-[10px] font-black transition-all flex items-center justify-center cursor-pointer",
                                                st === '-'
                                                    ? "bg-rose-600 text-white shadow-sm ring-1 ring-rose-400"
                                                    : ambianceTheme === 'dark' ? "bg-white/5 hover:bg-rose-950/40 text-rose-400" : "bg-slate-100 hover:bg-rose-100 text-rose-800"
                                            )}
                                        >
                                            Tekrar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>

                {/* 5. ALT EYLEM ÇUBUĞU */}
                <div className={cn(
                    "p-3.5 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0",
                    ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                )}>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className={cn("rounded-xl font-bold text-xs cursor-pointer", ambianceTheme === 'dark' ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-slate-900")}
                        >
                            Kapat
                        </Button>

                        {onStartLiveTest && (
                            <Button
                                onClick={() => {
                                    onClose();
                                    onStartLiveTest(student, selectedStageId);
                                }}
                                className="rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-md cursor-pointer"
                            >
                                <Play className="w-3.5 h-3.5 mr-1.5 fill-white" /> Canlı Testi Aç
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {hasUnsavedChanges && (
                            <span className="text-[11px] font-bold text-amber-400 animate-pulse hidden sm:inline">
                                Değişiklikler kaydedilmeyi bekliyor
                            </span>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges}
                            className="w-full sm:w-auto rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                            <span>{hasUnsavedChanges ? 'Değişiklikleri Kaydet' : 'Kaydedildi'}</span>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
