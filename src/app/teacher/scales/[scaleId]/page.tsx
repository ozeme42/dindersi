'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getUnitScaleDetails, saveScaleEntries, getScaleDetails, updateScaleColumns } from './actions';
import { createExam } from '@/app/teacher/exams/actions';
import type { Course, Unit, UserProfile, ScaleEntry, EvaluationScale, EvaluationScaleColumn, Topic } from "@/lib/types";
import { Loader2, ArrowLeft, Plus, Minus, Save, TrendingUp, Check, X, ChevronsUpDown, ClipboardList, Settings, PlusCircle, Trash2, Calendar as CalendarIcon, Send, Clock, Hash, CalendarPlus, CalendarDays, History, Layers, ChevronUp, ChevronDown, Palette, Minimize2, Printer, ListPlus, Sparkles, BookOpen, Shuffle, ChevronLeft, ChevronRight, LayoutGrid, RotateCcw, Volume2, VolumeX, Search, Award, CheckCircle2, XCircle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/context/auth-context';

const StatusButton = ({ status, onClick }: { status: '+' | '-' | 'o' | null, onClick: () => void }) => {
    const statusMap = {
        '+': { icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500 text-white', text: '✓' },
        '-': { icon: X, color: 'bg-red-600 hover:bg-red-500 text-white', text: '✗' },
        'o': { icon: ClipboardList, color: 'bg-yellow-500 hover:bg-yellow-400 text-black', text: 'O' },
    };

    if (!status) {
        return (
            <>
                <Button size="icon" variant="ghost" className="h-10 w-10 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white print-hide" onClick={onClick}>
                    <ChevronsUpDown className="h-5 w-5" />
                </Button>
                <span className="print-show">-</span>
            </>
        );
    }
    
    const Icon = statusMap[status].icon;
    
    return (
        <>
            <Button size="icon" variant="default" className={cn("h-10 w-10 shadow-md print-hide", statusMap[status].color)} onClick={onClick}>
                <Icon className="h-6 w-6" />
            </Button>
            <span className="print-show font-bold">{statusMap[status].text}</span>
        </>
    )
}

function ColumnEditorDialog({
    isOpen,
    onOpenChange,
    columns,
    onSave,
    isSaving,
    scaleType
}: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    columns: EvaluationScaleColumn[];
    onSave: (newColumns: EvaluationScaleColumn[]) => void;
    isSaving: boolean;
    scaleType: 'checklist' | 'points' | 'tally';
}) {
    const [localColumns, setLocalColumns] = useState(columns);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [replaceExisting, setReplaceExisting] = useState(false);

    useEffect(() => {
        setLocalColumns(columns);
        setIsBulkOpen(false);
        setBulkText('');
    }, [columns, isOpen]);
    
    const handleColumnNameChange = (id: string, newName: string) => {
        setLocalColumns(prev => prev.map(col => col.id === id ? { ...col, name: newName } : col));
    };
    const handleAddColumn = () => {
        setLocalColumns(prev => [...prev, { id: `col_${Date.now()}`, name: "Yeni Başlık", type: scaleType === 'points' ? 'number' : 'status' }]);
    };
    const handleRemoveColumn = (id: string) => {
        setLocalColumns(prev => prev.filter(col => col.id !== id));
    };

    const detectedCriteria = useMemo(() => {
        return bulkText
            .split('\n')
            .map(l => l.trim().replace(/^[\d\-\*\•\.\)]+\s*/, ''))
            .filter(l => l.length > 0);
    }, [bulkText]);

    const handleApplyBulk = () => {
        if (detectedCriteria.length === 0) return;
        const colType = scaleType === 'points' ? 'number' : 'status';
        const baseTimestamp = Date.now();
        const newCols = detectedCriteria.map((name, idx) => ({
            id: `col_${baseTimestamp}_${idx}`,
            name,
            type: colType as 'number' | 'status'
        }));

        setLocalColumns(prev => replaceExisting ? newCols : [...prev, ...newCols]);
        setBulkText('');
        setIsBulkOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-6">
                        <DialogTitle className="text-xl font-bold">Sütunları (Kriterleri) Düzenle</DialogTitle>
                        <Badge variant="outline" className="bg-indigo-950/40 text-indigo-300 border-indigo-500/30 text-xs">
                            {localColumns.length} Kriter
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="py-2 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setIsBulkOpen(prev => !prev)} 
                                className={cn(
                                    "h-8 text-xs font-bold transition-all",
                                    isBulkOpen 
                                        ? "bg-emerald-600 text-white border-emerald-500" 
                                        : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                                )}
                            >
                                <ListPlus className="w-3.5 h-3.5 mr-1.5" /> 
                                {isBulkOpen ? "Paneli Kapat" : "Toplu Kriter Ekle"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleAddColumn} className="border-white/10 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 h-8 text-xs font-bold">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5"/> Tek Sütun
                            </Button>
                        </div>

                        {localColumns.length > 0 && (
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setLocalColumns([])} 
                                className="h-8 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Tümünü Temizle
                            </Button>
                        )}
                    </div>

                    {isBulkOpen && (
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-slate-950 to-slate-950 border-2 border-emerald-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                                        <ListPlus className="w-4 h-4" />
                                    </span>
                                    <span className="text-xs font-bold text-emerald-300">Toplu Kriter Girişi</span>
                                </div>
                                <span className="text-xs font-bold text-slate-400">
                                    {detectedCriteria.length > 0 ? (
                                        <span className="text-emerald-400 font-black">{detectedCriteria.length} kriter algılandı</span>
                                    ) : (
                                        "Kriter yazın veya yapıştırın"
                                    )}
                                </span>
                            </div>

                            <Textarea
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                placeholder={"Her satıra bir kriter gelecek şekilde yapıştırın:\nÖrn:\nDerse zamanında ve hazırlıklı gelme\nDers araç gereçlerini getirme\nÖdev ve görevleri eksiksiz yapma"}
                                rows={5}
                                className="bg-slate-900 border-white/10 text-white text-xs placeholder:text-slate-600 focus-visible:ring-emerald-500/40 font-mono leading-relaxed"
                            />

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        checked={replaceExisting}
                                        onChange={(e) => setReplaceExisting(e.target.checked)}
                                        className="rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 h-4 w-4"
                                    />
                                    <span>Mevcut sütunları temizle (üzerine yaz)</span>
                                </label>

                                <div className="flex items-center gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => { setBulkText(''); setIsBulkOpen(false); }}
                                        className="h-8 text-xs text-slate-400 hover:text-white"
                                    >
                                        Vazgeç
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        onClick={handleApplyBulk}
                                        disabled={detectedCriteria.length === 0}
                                        className="h-8 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 disabled:opacity-40"
                                    >
                                        <Check className="w-3.5 h-3.5 mr-1" />
                                        Kriterleri Ekle ({detectedCriteria.length})
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {localColumns.map((col, idx) => (
                            <div key={col.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-white/5">
                                <div className="bg-white/5 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">{idx + 1}</div>
                                <Input value={col.name} onChange={(e) => handleColumnNameChange(col.id, e.target.value)} className="bg-slate-900 border-white/10 text-white h-9 text-sm"/>
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveColumn(col.id)} className="text-slate-500 hover:text-red-400 shrink-0 h-8 w-8">
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="border-t border-white/10 pt-4">
                    <DialogClose asChild><Button variant="ghost" className="text-slate-400 hover:bg-white/5">İptal</Button></DialogClose>
                    <Button onClick={() => onSave(localColumns)} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const isArabicText = (text?: string): boolean => {
    if (!text) return false;
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
};

const playTone = (type: 'correct' | 'help' | 'wrong') => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'help') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.start(now);
            osc.stop(now + 0.16);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(261.63, now);
            osc.frequency.setValueAtTime(196.00, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch {
        // Audio policy ignore
    }
};

function LiveReadingTestDialog({
    isOpen,
    onOpenChange,
    scale,
    students,
    activeSessionId,
    entries,
    onStatusChange,
    onBatchStatusChange,
    onSave,
    isSaving,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    scale: EvaluationScale;
    students: UserProfile[];
    activeSessionId: string;
    entries: { [studentId: string]: ScaleEntry };
    onStatusChange: (studentId: string, columnId: string, status: ('+' | '-' | 'o') | null) => void;
    onBatchStatusChange: (studentId: string, statusMap: { [columnId: string]: ('+' | '-' | 'o') | null }) => void;
    onSave: () => Promise<void>;
    isSaving: boolean;
}) {
    const [studentIndex, setStudentIndex] = useState(0);
    const [columnIndex, setColumnIndex] = useState(0);
    const [mode, setMode] = useState<'flashcard' | 'grid'>('flashcard');
    const [isShuffled, setIsShuffled] = useState(false);
    const [autoAdvance, setAutoAdvance] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [gridFilter, setGridFilter] = useState<'all' | '+' | '-' | 'o' | 'empty'>('all');
    const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
    const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    const columns = useMemo(() => scale.columns || [], [scale.columns]);

    useEffect(() => {
        if (studentIndex >= students.length && students.length > 0) {
            setStudentIndex(students.length - 1);
        }
    }, [students.length, studentIndex]);

    useEffect(() => {
        if (columns.length > 0) {
            const indices = columns.map((_, i) => i);
            if (isShuffled) {
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
            }
            setShuffledIndices(indices);
            setColumnIndex(0);
        }
    }, [isShuffled, columns]);

    const currentStudent = students[studentIndex];

    const actualColumnIndex = useMemo(() => {
        if (!columns.length) return 0;
        if (isShuffled && shuffledIndices.length === columns.length) {
            return shuffledIndices[columnIndex] ?? 0;
        }
        return columnIndex;
    }, [columns.length, isShuffled, shuffledIndices, columnIndex]);

    const currentColumn = columns[actualColumnIndex];

    const studentStatuses = useMemo(() => {
        if (!currentStudent) return {};
        const entry = entries[currentStudent.uid];
        const sessionData = entry?.history?.[activeSessionId];
        if (sessionData?.statuses) return sessionData.statuses;
        if (activeSessionId === "1" && entry?.statuses) return entry.statuses;
        return {};
    }, [entries, currentStudent, activeSessionId]);

    const currentStatus = currentColumn ? (studentStatuses[currentColumn.id] || null) : null;

    const stats = useMemo(() => {
        let plus = 0;
        let minus = 0;
        let help = 0;
        const total = columns.length;
        columns.forEach(col => {
            const st = studentStatuses[col.id];
            if (st === '+') plus++;
            else if (st === '-') minus++;
            else if (st === 'o') help++;
        });
        const completed = plus + minus + help;
        const percent = total > 0 ? Math.round((plus / total) * 100) : 0;
        return { plus, minus, help, total, completed, percent };
    }, [columns, studentStatuses]);

    const handleMark = useCallback((status: ('+' | '-' | 'o') | null) => {
        if (!currentStudent || !currentColumn) return;
        onStatusChange(currentStudent.uid, currentColumn.id, status);

        if (soundEnabled && status) {
            if (status === '+') playTone('correct');
            else if (status === 'o') playTone('help');
            else if (status === '-') playTone('wrong');
        }

        if (autoAdvance && status !== null) {
            setColumnIndex(prev => (prev + 1) % columns.length);
        }
    }, [currentStudent, currentColumn, onStatusChange, autoAdvance, soundEnabled, columns.length]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
                return;
            }

            if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                setSoundEnabled(prev => !prev);
                return;
            }

            if (e.key === '[') {
                e.preventDefault();
                setStudentIndex(prev => Math.max(0, prev - 1));
                return;
            }

            if (e.key === ']') {
                e.preventDefault();
                setStudentIndex(prev => Math.min(students.length - 1, prev + 1));
                return;
            }

            if (mode === 'flashcard') {
                if (e.key === '1' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    handleMark('+');
                } else if (e.key === '2' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    handleMark('o');
                } else if (e.key === '3' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    handleMark('-');
                } else if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setColumnIndex(prev => (prev + 1) % columns.length);
                } else if (e.key === 'Backspace') {
                    e.preventDefault();
                    setColumnIndex(prev => (prev - 1 + columns.length) % columns.length);
                } else if (e.key === '0') {
                    e.preventDefault();
                    handleMark(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, mode, handleMark, columns.length, students.length]);

    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return students;
        return students.filter(s => 
            s.displayName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
            s.class?.toLowerCase().includes(studentSearch.toLowerCase())
        );
    }, [students, studentSearch]);

    const filteredGridColumns = useMemo(() => {
        if (gridFilter === 'all') return columns;
        return columns.filter(col => {
            const st = studentStatuses[col.id] || null;
            if (gridFilter === 'empty') return st === null;
            return st === gridFilter;
        });
    }, [columns, studentStatuses, gridFilter]);

    if (!currentStudent || columns.length === 0) {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-md bg-slate-900 border-white/10 text-white text-center p-8">
                    <DialogTitle className="text-lg font-bold">Ölçek Test Modu</DialogTitle>
                    <DialogDescription className="text-slate-400 mt-2">Test edilecek öğrenci veya kriter bulunamadı.</DialogDescription>
                    <DialogClose asChild>
                        <Button className="mt-4 bg-indigo-600 hover:bg-indigo-500">Kapat</Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>
        );
    }

    const isArabic = isArabicText(currentColumn?.name);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl w-[96vw] max-h-[96vh] bg-slate-950/95 backdrop-blur-2xl border-2 border-indigo-500/30 text-white p-0 overflow-hidden flex flex-col shadow-2xl rounded-[2.5rem]">
                {/* Header Bar */}
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-6 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
                                    Canlı Okuma & Test Modu
                                </DialogTitle>
                                <Badge className="bg-indigo-600/70 hover:bg-indigo-600 text-indigo-100 border border-indigo-400/40 text-[10px] font-bold px-2 py-0.5">
                                    {activeSessionId}. Oturum
                                </Badge>
                            </div>
                            <DialogDescription className="text-[11px] text-slate-400 m-0 p-0 line-clamp-1">
                                {scale.name.split(' (')[0]?.trim()} • Akıllı Tahta & Birebir Değerlendirme
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-white/10 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setMode('flashcard')}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                mode === 'flashcard' 
                                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/40" 
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <BookOpen className="w-3.5 h-3.5" /> Flaş Kart
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('grid')}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                mode === 'grid' 
                                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/40" 
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" /> Pano Modu ({columns.length})
                        </button>
                    </div>

                    {/* Quick Tools: Sound, Save, Close */}
                    <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSoundEnabled(prev => !prev)}
                            className={cn(
                                "h-9 w-9 rounded-xl border transition-all",
                                soundEnabled 
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" 
                                    : "border-white/10 text-slate-500 hover:text-slate-300"
                            )}
                            title={soundEnabled ? "Ses Efektleri Açık [M]" : "Ses Efektleri Kapalı [M]"}
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </Button>

                        <Button 
                            size="sm" 
                            onClick={() => onSave()} 
                            disabled={isSaving}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 text-xs shadow-lg shadow-emerald-900/40 rounded-xl transition-all"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                            Ölçeğe Kaydet
                        </Button>

                        <DialogClose asChild>
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                                <X className="w-4 h-4" />
                            </Button>
                        </DialogClose>
                    </div>
                </div>

                {/* Student Switcher Bar with Direct Dropdown Jump */}
                <div className="bg-slate-900/80 px-6 py-2 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setStudentIndex(prev => Math.max(0, prev - 1))}
                            disabled={studentIndex === 0}
                            className="border-white/10 text-slate-300 hover:bg-white/10 h-9 px-3 rounded-xl disabled:opacity-30 text-xs"
                            title="Önceki Öğrenci [ [ ]"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
                        </Button>

                        {/* Interactive Student Card -> Click opens quick student picker popover */}
                        <Popover open={isStudentPickerOpen} onOpenChange={setIsStudentPickerOpen}>
                            <PopoverTrigger asChild>
                                <button 
                                    type="button"
                                    className="flex items-center gap-3 bg-slate-950/80 hover:bg-slate-900 px-4 py-1.5 rounded-2xl border border-white/10 hover:border-indigo-500/50 transition-all text-left group shadow-sm cursor-pointer"
                                    title="Öğrenci Listesini Aç"
                                >
                                    <div className="relative">
                                        <UserAvatar user={currentStudent} className="h-9 w-9 border-2 border-indigo-500/60 shadow-[0_0_12px_rgba(99,102,241,0.3)]" />
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-indigo-500 flex items-center justify-center text-[9px] font-bold text-indigo-300">
                                            {studentIndex + 1}
                                        </div>
                                    </div>
                                    <div className="flex flex-col min-w-[140px]">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm text-white group-hover:text-indigo-300 transition-colors truncate max-w-[160px]">
                                                {currentStudent.displayName}
                                            </span>
                                            <ChevronsUpDown className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                            <span>{currentStudent.class || 'Sınıf'}</span>
                                            <span>•</span>
                                            <span className="text-emerald-400 font-bold">{stats.completed} / {stats.total} Okundu</span>
                                        </div>
                                    </div>
                                </button>
                            </PopoverTrigger>

                            <PopoverContent className="w-80 p-3 bg-slate-950 border-2 border-indigo-500/40 text-white rounded-2xl shadow-2xl space-y-3">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5" /> Öğrenci Seç ({students.length})
                                    </span>
                                    <span className="text-[10px] text-slate-500">Tıkla & Değerlendir</span>
                                </div>

                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <Input
                                        value={studentSearch}
                                        onChange={e => setStudentSearch(e.target.value)}
                                        placeholder="Öğrenci ara..."
                                        className="h-8 pl-8 text-xs bg-slate-900 border-white/10 text-white placeholder:text-slate-600 rounded-xl"
                                    />
                                </div>

                                <ScrollArea className="h-56 pr-2">
                                    <div className="space-y-1">
                                        {filteredStudents.map((student, idx) => {
                                            const originalIdx = students.findIndex(s => s.uid === student.uid);
                                            const entry = entries[student.uid];
                                            const sessionStatuses = entry?.history?.[activeSessionId]?.statuses || (activeSessionId === "1" ? entry?.statuses : {}) || {};
                                            const doneCount = Object.values(sessionStatuses).filter(v => v !== null).length;
                                            const isCurrent = originalIdx === studentIndex;

                                            return (
                                                <button
                                                    key={student.uid}
                                                    type="button"
                                                    onClick={() => {
                                                        setStudentIndex(originalIdx);
                                                        setIsStudentPickerOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all",
                                                        isCurrent 
                                                            ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30" 
                                                            : "hover:bg-white/5 text-slate-300 hover:text-white"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-[10px] font-mono text-slate-400 w-5 text-right">{originalIdx + 1}.</span>
                                                        <UserAvatar user={student} className="h-6 w-6 shrink-0" />
                                                        <span className="truncate">{student.displayName}</span>
                                                    </div>
                                                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 shrink-0", isCurrent ? "border-white/30 text-white" : "border-white/10 text-emerald-400")}>
                                                        {doneCount}/{columns.length}
                                                    </Badge>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>

                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setStudentIndex(prev => Math.min(students.length - 1, prev + 1))}
                            disabled={studentIndex === students.length - 1}
                            className="border-white/10 text-slate-300 hover:bg-white/10 h-9 px-3 rounded-xl disabled:opacity-30 text-xs"
                            title="Sonraki Öğrenci [ ] ]"
                        >
                            Sonraki <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>

                    {/* Progress Summary Pills */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-white/5 text-xs font-bold shadow-inner">
                            <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5 stroke-[3]" /> {stats.plus}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-amber-400 flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> {stats.help}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5 stroke-[3]" /> {stats.minus}</span>
                        </div>

                        <Badge className={cn("text-xs font-black px-3 py-1 shadow-md", stats.percent >= 85 ? "bg-emerald-500 text-white" : stats.percent >= 70 ? "bg-yellow-500 text-black" : stats.percent >= 50 ? "bg-orange-500 text-white" : "bg-red-500 text-white")}>
                            %{stats.percent} Başarı
                        </Badge>
                    </div>
                </div>

                {/* Dialog Body */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col justify-between custom-scrollbar">
                    {mode === 'flashcard' ? (
                        <div className="flex flex-col items-center justify-between flex-1 max-w-3xl mx-auto w-full gap-5">
                            {/* Flashcard Options Strip */}
                            <div className="flex items-center justify-between w-full text-xs text-slate-400 border-b border-white/5 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-indigo-300">
                                        Harf / Kriter {columnIndex + 1} / {columns.length}
                                    </span>
                                    {isShuffled && (
                                        <Badge variant="outline" className="text-[10px] bg-purple-950/50 text-purple-300 border-purple-500/40">
                                            Karışık Sıra Aktif
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex items-center gap-5">
                                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white select-none transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={isShuffled} 
                                            onChange={e => setIsShuffled(e.target.checked)} 
                                            className="rounded border-white/20 bg-slate-900 text-purple-500 focus:ring-purple-500/30 h-4 w-4"
                                        />
                                        <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                                        <span className="font-medium">Karışık Sıra</span>
                                    </label>

                                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white select-none transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={autoAdvance} 
                                            onChange={e => setAutoAdvance(e.target.checked)} 
                                            className="rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 h-4 w-4"
                                        />
                                        <span className="font-medium">Otomatik İlerle</span>
                                    </label>
                                </div>
                            </div>

                            {/* Massive Stage Presentation Card */}
                            <div className={cn(
                                "w-full min-h-[280px] md:min-h-[340px] rounded-[2.5rem] border-2 flex flex-col items-center justify-center relative p-8 transition-all duration-300 backdrop-blur-2xl overflow-hidden",
                                currentStatus === '+' 
                                    ? "bg-gradient-to-b from-emerald-950/40 via-slate-950 to-slate-950 border-emerald-500/70 shadow-[0_0_60px_rgba(16,185,129,0.25)]" 
                                    : currentStatus === '-' 
                                    ? "bg-gradient-to-b from-rose-950/40 via-slate-950 to-slate-950 border-rose-500/70 shadow-[0_0_60px_rgba(244,63,94,0.25)]"
                                    : currentStatus === 'o'
                                    ? "bg-gradient-to-b from-amber-950/40 via-slate-950 to-slate-950 border-amber-500/70 shadow-[0_0_60px_rgba(245,158,11,0.25)]"
                                    : "bg-gradient-to-b from-slate-900/70 via-slate-950 to-slate-950 border-white/10 hover:border-indigo-500/40 shadow-2xl"
                            )}>
                                {/* Background Ambient Radial Glow */}
                                <div className={cn(
                                    "absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-20",
                                    currentStatus === '+' ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent" :
                                    currentStatus === '-' ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-500 via-transparent to-transparent" :
                                    currentStatus === 'o' ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" :
                                    "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent"
                                )} />

                                {/* Top Badges */}
                                <div className="absolute top-5 left-6 flex items-center gap-2">
                                    <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-400 font-mono text-xs px-2.5 py-0.5">
                                        #{actualColumnIndex + 1}
                                    </Badge>
                                </div>

                                <div className="absolute top-5 right-6">
                                    {currentStatus === '+' && (
                                        <Badge className="bg-emerald-500/90 text-white font-black px-3.5 py-1 text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 border border-emerald-400">
                                            <Check className="w-3.5 h-3.5 stroke-[3]" /> DOĞRU OKUNDU
                                        </Badge>
                                    )}
                                    {currentStatus === '-' && (
                                        <Badge className="bg-rose-500/90 text-white font-black px-3.5 py-1 text-xs shadow-lg shadow-rose-500/30 flex items-center gap-1.5 border border-rose-400">
                                            <X className="w-3.5 h-3.5 stroke-[3]" /> TEKRAR EDİLECEK
                                        </Badge>
                                    )}
                                    {currentStatus === 'o' && (
                                        <Badge className="bg-amber-500 text-black font-black px-3.5 py-1 text-xs shadow-lg shadow-amber-500/30 flex items-center gap-1.5 border border-amber-300">
                                            <ClipboardList className="w-3.5 h-3.5" /> YARDIMLA OKUNDU
                                        </Badge>
                                    )}
                                    {!currentStatus && (
                                        <Badge variant="outline" className="text-slate-500 border-white/10 text-xs px-3 py-0.5">
                                            Henüz Değerlendirilmedi
                                        </Badge>
                                    )}
                                </div>

                                {/* Previous / Next Side Floating Arrows */}
                                <button 
                                    type="button"
                                    onClick={() => setColumnIndex(prev => (prev - 1 + columns.length) % columns.length)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-slate-900/60 hover:bg-white/10 border border-white/10 hover:border-white/30 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-lg group active:scale-95"
                                    title="Önceki [Backspace / Sol Ok]"
                                >
                                    <ChevronLeft className="w-7 h-7 group-hover:-translate-x-0.5 transition-transform" />
                                </button>
                                
                                <button 
                                    type="button"
                                    onClick={() => setColumnIndex(prev => (prev + 1) % columns.length)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-slate-900/60 hover:bg-white/10 border border-white/10 hover:border-white/30 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-lg group active:scale-95"
                                    title="Sonraki [Space / Enter]"
                                >
                                    <ChevronRight className="w-7 h-7 group-hover:translate-x-0.5 transition-transform" />
                                </button>

                                {/* Letter / Criterion Main Typography Display */}
                                <div className="text-center select-none py-4 px-14 z-10">
                                    <div className={cn(
                                        "font-bold transition-all duration-300 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]",
                                        isArabic 
                                            ? "text-9xl sm:text-[10.5rem] md:text-[12rem] font-serif text-white leading-none py-2 tracking-normal" 
                                            : "text-3xl sm:text-4xl md:text-5xl font-black text-slate-100 leading-snug"
                                    )}>
                                        {currentColumn?.name}
                                    </div>
                                    <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                        <span>Kriter {actualColumnIndex + 1} / {columns.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Massive Ergonomic Action Buttons */}
                            <div className="grid grid-cols-3 gap-4 w-full">
                                <Button
                                    type="button"
                                    onClick={() => handleMark('+')}
                                    className={cn(
                                        "h-16 md:h-20 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-1 shadow-xl active:scale-95",
                                        currentStatus === '+'
                                            ? "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white ring-4 ring-emerald-400/50 shadow-emerald-600/50 scale-[1.02]"
                                            : "bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white shadow-emerald-950/40"
                                    )}
                                >
                                    <div className="flex items-center gap-2 text-lg md:text-xl font-black">
                                        <Check className="w-6 h-6 stroke-[3]" />
                                        <span>DOĞRU</span>
                                    </div>
                                    <span className="text-[11px] font-mono font-bold opacity-75 bg-black/30 px-2 py-0.5 rounded-md">
                                        [ 1 ] veya [ Sağ Ok ]
                                    </span>
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() => handleMark('o')}
                                    className={cn(
                                        "h-16 md:h-20 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-1 shadow-xl active:scale-95",
                                        currentStatus === 'o'
                                            ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black ring-4 ring-amber-400/50 shadow-amber-600/50 scale-[1.02]"
                                            : "bg-amber-950/70 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black shadow-amber-950/40"
                                    )}
                                >
                                    <div className="flex items-center gap-2 text-lg md:text-xl font-black">
                                        <ClipboardList className="w-5 h-5" />
                                        <span>YARDIMLA</span>
                                    </div>
                                    <span className="text-[11px] font-mono font-bold opacity-75 bg-black/30 px-2 py-0.5 rounded-md">
                                        [ 2 ] veya [ Aşağı Ok ]
                                    </span>
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() => handleMark('-')}
                                    className={cn(
                                        "h-16 md:h-20 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-1 shadow-xl active:scale-95",
                                        currentStatus === '-'
                                            ? "bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white ring-4 ring-rose-400/50 shadow-rose-600/50 scale-[1.02]"
                                            : "bg-rose-950/70 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white shadow-rose-950/40"
                                    )}
                                >
                                    <div className="flex items-center gap-2 text-lg md:text-xl font-black">
                                        <X className="w-6 h-6 stroke-[3]" />
                                        <span>TEKRAR</span>
                                    </div>
                                    <span className="text-[11px] font-mono font-bold opacity-75 bg-black/30 px-2 py-0.5 rounded-md">
                                        [ 3 ] veya [ Sol Ok ]
                                    </span>
                                </Button>
                            </div>

                            {/* Visual Letter Strip (Harf Şeridi - Doğrudan Harfe Atlama) */}
                            <div className="w-full bg-slate-900/60 p-2.5 rounded-2xl border border-white/10">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mb-1.5 font-bold">
                                    <span>Hızlı Harf Şeridi (İstediğinize tıklayın):</span>
                                    <span>{columnIndex + 1} / {columns.length}</span>
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                    {columns.map((col, idx) => {
                                        const st = studentStatuses[col.id] || null;
                                        const isActive = idx === actualColumnIndex;
                                        const isColArabic = isArabicText(col.name);

                                        return (
                                            <button
                                                key={col.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isShuffled) {
                                                        const pos = shuffledIndices.indexOf(idx);
                                                        setColumnIndex(pos !== -1 ? pos : idx);
                                                    } else {
                                                        setColumnIndex(idx);
                                                    }
                                                }}
                                                className={cn(
                                                    "h-10 min-w-[36px] px-2 rounded-xl flex items-center justify-center font-bold text-xs transition-all relative shrink-0",
                                                    isActive 
                                                        ? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-lg scale-110 z-10" 
                                                        : st === '+'
                                                        ? "bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900"
                                                        : st === '-'
                                                        ? "bg-rose-950/80 border border-rose-500/50 text-rose-300 hover:bg-rose-900"
                                                        : st === 'o'
                                                        ? "bg-amber-950/80 border border-amber-500/50 text-amber-300 hover:bg-amber-900"
                                                        : "bg-slate-950 border border-white/10 text-slate-400 hover:bg-slate-900 hover:text-white"
                                                )}
                                                title={`${idx + 1}. ${col.name}`}
                                            >
                                                <span className={cn(isColArabic ? "text-base font-serif" : "text-[11px]")}>
                                                    {col.name}
                                                </span>
                                                {/* Mini status indicator dot */}
                                                <span className={cn(
                                                    "absolute top-1 right-1 w-1.5 h-1.5 rounded-full",
                                                    st === '+' ? "bg-emerald-400" : st === '-' ? "bg-rose-400" : st === 'o' ? "bg-amber-400" : "opacity-0"
                                                )} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Secondary Bar: Clear / Skip info */}
                            <div className="flex items-center justify-between w-full pt-0.5 text-xs">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMark(null)}
                                    className="text-slate-500 hover:text-slate-300 hover:bg-white/5 h-8 text-xs"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Notu Sıfırla [ 0 ]
                                </Button>

                                <div className="text-[11px] text-slate-500 italic hidden sm:flex items-center gap-2">
                                    <span>[Space / Enter]: Sıradaki</span>
                                    <span>•</span>
                                    <span>[ [ ] / [ ] ]: Öğrenci Değiştir</span>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setColumnIndex(prev => (prev + 1) % columns.length)}
                                    className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 h-8 font-bold text-xs"
                                >
                                    Pas Geç <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Modern Grid / Pano Mode */
                        <div className="space-y-4 max-w-5xl mx-auto w-full">
                            {/* Grid Filter Bar & Batch Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-white/10 shadow-lg">
                                {/* Filters */}
                                <div className="flex items-center gap-1.5 overflow-x-auto">
                                    <button
                                        type="button"
                                        onClick={() => setGridFilter('all')}
                                        className={cn(
                                            "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                            gridFilter === 'all' ? "bg-indigo-600 text-white" : "bg-slate-950 border border-white/10 text-slate-400 hover:text-white"
                                        )}
                                    >
                                        Tümü ({columns.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGridFilter('+')}
                                        className={cn(
                                            "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                            gridFilter === '+' ? "bg-emerald-600 text-white" : "bg-slate-950 border border-white/10 text-emerald-400 hover:text-white"
                                        )}
                                    >
                                        ✓ Doğru ({stats.plus})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGridFilter('-')}
                                        className={cn(
                                            "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                            gridFilter === '-' ? "bg-rose-600 text-white" : "bg-slate-950 border border-white/10 text-rose-400 hover:text-white"
                                        )}
                                    >
                                        ✗ Tekrar ({stats.minus})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGridFilter('o')}
                                        className={cn(
                                            "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                            gridFilter === 'o' ? "bg-amber-600 text-white" : "bg-slate-950 border border-white/10 text-amber-400 hover:text-white"
                                        )}
                                    >
                                        O Yardımla ({stats.help})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGridFilter('empty')}
                                        className={cn(
                                            "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                            gridFilter === 'empty' ? "bg-slate-700 text-white" : "bg-slate-950 border border-white/10 text-slate-400 hover:text-white"
                                        )}
                                    >
                                        Kalanlar ({columns.length - stats.completed})
                                    </button>
                                </div>

                                {/* Batch Actions */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const map: { [colId: string]: '+' } = {};
                                            columns.forEach(c => { map[c.id] = '+'; });
                                            onBatchStatusChange(currentStudent.uid, map);
                                            if (soundEnabled) playTone('correct');
                                        }}
                                        className="h-8 text-xs font-bold border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white shadow-sm"
                                    >
                                        <Check className="w-3.5 h-3.5 mr-1" /> Tümünü Doğru Yap (+)
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            const map: { [colId: string]: null } = {};
                                            columns.forEach(c => { map[c.id] = null; });
                                            onBatchStatusChange(currentStudent.uid, map);
                                        }}
                                        className="h-8 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Temizle
                                    </Button>
                                </div>
                            </div>

                            {/* Responsive High-Tech Letter Grid */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3 max-h-[58vh] overflow-y-auto pr-1 custom-scrollbar">
                                {filteredGridColumns.map((col, idx) => {
                                    const st = studentStatuses[col.id] || null;
                                    const isColArabic = isArabicText(col.name);
                                    const originalIdx = columns.findIndex(c => c.id === col.id);

                                    return (
                                        <button
                                            key={col.id}
                                            type="button"
                                            onClick={() => {
                                                const next = st === null ? '+' : st === '+' ? '-' : st === '-' ? 'o' : null;
                                                onStatusChange(currentStudent.uid, col.id, next);
                                                if (soundEnabled && next) {
                                                    if (next === '+') playTone('correct');
                                                    else if (next === 'o') playTone('help');
                                                    else if (next === '-') playTone('wrong');
                                                }
                                            }}
                                            className={cn(
                                                "p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-between min-h-[96px] relative select-none hover:scale-105 active:scale-95 shadow-md group cursor-pointer",
                                                st === '+' 
                                                    ? "bg-gradient-to-br from-emerald-950/70 via-emerald-900/40 to-slate-950 border-emerald-500 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                                                    : st === '-' 
                                                    ? "bg-gradient-to-br from-rose-950/70 via-rose-900/40 to-slate-950 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                                                    : st === 'o'
                                                    ? "bg-gradient-to-br from-amber-950/70 via-amber-900/40 to-slate-950 border-amber-500 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                                                    : "bg-slate-900/90 border-white/10 text-slate-300 hover:border-white/30 hover:bg-slate-850"
                                            )}
                                        >
                                            <div className="w-full flex items-center justify-between text-[10px] opacity-75">
                                                <span className="font-mono">#{originalIdx + 1}</span>
                                                {st === '+' && <span className="font-bold text-emerald-400 flex items-center gap-0.5"><Check className="w-3 h-3 stroke-[3]" /></span>}
                                                {st === '-' && <span className="font-bold text-rose-400 flex items-center gap-0.5"><X className="w-3 h-3 stroke-[3]" /></span>}
                                                {st === 'o' && <span className="font-bold text-amber-400 flex items-center gap-0.5"><ClipboardList className="w-3 h-3" /></span>}
                                            </div>

                                            <div className={cn(
                                                "font-bold py-1 leading-none transition-transform group-hover:scale-110",
                                                isColArabic ? "text-4xl md:text-5xl font-serif drop-shadow-md" : "text-base font-bold text-center line-clamp-2"
                                            )}>
                                                {col.name}
                                            </div>

                                            <div className="w-full flex items-center justify-center">
                                                <span className={cn(
                                                    "w-2.5 h-2.5 rounded-full transition-all",
                                                    st === '+' ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : 
                                                    st === '-' ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" : 
                                                    st === 'o' ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" : 
                                                    "bg-white/10"
                                                )} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Status Bar */}
                <div className="bg-slate-950 px-6 py-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>Aktif Oturum: <strong className="text-white">{activeSessionId}. Değerlendirme</strong></span>
                        <span>•</span>
                        <span className="text-emerald-400">Veriler anında tabloya senkronize edilir.</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <DialogClose asChild>
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-xs">
                                Kapat
                            </Button>
                        </DialogClose>
                        <Button 
                            type="button"
                            onClick={() => onSave()} 
                            disabled={isSaving} 
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 shadow-lg shadow-emerald-900/30 rounded-xl text-xs"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                            Ölçeğe Kaydet
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function ScaleDetailPage() {
    const params = useParams();
    const scaleOrUnitId = params.scaleId as string;
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const type = searchParams.get('type'); 
    const branch = searchParams.get('branch'); 
    
    const [scale, setScale] = useState<EvaluationScale | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [unit, setUnit] = useState<Unit | null>(null);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [entries, setEntries] = useState<{ [studentId: string]: ScaleEntry }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);
    const [isLiveTestOpen, setIsLiveTestOpen] = useState(false);
    const [headerZoom, setHeaderZoom] = useState<'normal' | 'large' | 'huge'>('normal');
    const { toast } = useToast();

    const [activeSessionId, setActiveSessionId] = useState<string>("1");

    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [assignmentDueDate, setAssignmentDueDate] = useState<Date | undefined>();
    const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());

    const availableSessions = useMemo(() => {
        const sessions = new Set<string>();
        sessions.add("1");
        
        Object.values(entries).forEach(entry => {
            if (entry.history) {
                Object.keys(entry.history).forEach(key => sessions.add(key));
            }
        });

        return Array.from(sessions).sort((a, b) => parseInt(a) - parseInt(b));
    }, [entries]);

    const handleAddSession = () => {
        const nextId = (Math.max(...availableSessions.map(s => parseInt(s))) + 1).toString();
        setActiveSessionId(nextId);
        toast({ title: `${nextId}. Değerlendirme Başlatıldı`, description: "Puanları girmeye başlayabilirsiniz." });
    }

    const fetchData = useCallback(async () => {
        if (!scaleOrUnitId || !user) return;
        setIsLoading(true);

        const result = type === 'unit' && courseId 
            ? await getUnitScaleDetails(courseId, scaleOrUnitId, branch, user.schoolName || null) 
            : await getScaleDetails(scaleOrUnitId);

        if (result.success && result.data) {
            setCourse(result.data.course || null);
            setStudents((result.data.students || []).sort((a, b) => 
                (a.displayName || '').localeCompare(b.displayName || '', 'tr', { sensitivity: 'base' })
            ));
            setEntries(result.data.entries || {});
            
            if (type === 'unit' && 'unit' in result.data) {
                const unitData = result.data.unit;
                 setUnit(unitData || null);
                 setScale({
                    id: unitData.id,
                    name: unitData.title,
                    type: 'checklist',
                    columns: (unitData.topics || []).map(t => ({ id: t.id, name: t.title, type: 'status' })),
                    classId: result.data.course.classId || '',
                    courseId: result.data.course.id,
                    teacherId: '', 
                    createdAt: unitData.createdAt,
                });
            } else if ('scale' in result.data) {
                setScale(result.data.scale || null);
            }

        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
        }
        setIsLoading(false);
    }, [scaleOrUnitId, courseId, type, branch, toast, user]);

    useEffect(() => {
        if (!type || (type === 'unit' && (!courseId || !branch))) {
            toast({ title: "Hata", description: "Eksik parametre. Lütfen ölçekler sayfasına geri dönün.", variant: "destructive" });
            router.push('/teacher/scales');
            return;
        }
        fetchData();
    }, [fetchData, type, courseId, branch, router, toast]);

    const getStudentDataAtSession = (studentId: string) => {
        const entry = entries[studentId];
        if (!entry) return null;
        
        if (entry.history && entry.history[activeSessionId]) {
            return entry.history[activeSessionId];
        }

        if (activeSessionId === "1") {
            return {
                plus: entry.plus,
                minus: entry.minus,
                statuses: entry.statuses,
                values: entry.values
            };
        }

        return null;
    };

    const handleTallyChange = (studentId: string, field: 'plus' | 'minus', value: number) => {
        setEntries(prev => {
            const studentEntry = prev[studentId] || { history: {}, note: '' };
            const history = studentEntry.history || {};
            const sessionData = history[activeSessionId] || { plus: 0, minus: 0 };
            
            return {
                ...prev,
                [studentId]: {
                    ...studentEntry,
                    history: {
                        ...history,
                        [activeSessionId]: {
                            ...sessionData,
                            [field]: Math.max(0, value)
                        }
                    }
                }
            };
        });
    };

    const handleChecklistChange = (studentId: string, columnId: string) => {
        const statuses: (('+' | '-' | 'o') | null)[] = ['+', '-', 'o', null];
        setEntries(prev => {
            const studentEntry = prev[studentId] || { history: {}, note: '' };
            const history = studentEntry.history || {};
            const sessionData = history[activeSessionId] || { statuses: {} };
            const currentStatuses = sessionData.statuses || {};
            
            const currentStatus = currentStatuses[columnId] || null;
            const currentIndex = statuses.indexOf(currentStatus);
            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
            
            return {
                ...prev,
                [studentId]: {
                    ...studentEntry,
                    history: {
                        ...history,
                        [activeSessionId]: {
                            ...sessionData,
                            statuses: { ...currentStatuses, [columnId]: nextStatus }
                        }
                    }
                }
            };
        });
    };

    const handleDirectStatusChange = (studentId: string, columnId: string, status: ('+' | '-' | 'o') | null) => {
        setEntries(prev => {
            const studentEntry = prev[studentId] || { history: {}, note: '' };
            const history = studentEntry.history || {};
            const sessionData = history[activeSessionId] || { statuses: {} };
            const currentStatuses = sessionData.statuses || {};
            
            return {
                ...prev,
                [studentId]: {
                    ...studentEntry,
                    history: {
                        ...history,
                        [activeSessionId]: {
                            ...sessionData,
                            statuses: { ...currentStatuses, [columnId]: status }
                        }
                    }
                }
            };
        });
    };

    const handleBatchStatusChange = (studentId: string, statusMap: { [columnId: string]: ('+' | '-' | 'o') | null }) => {
        setEntries(prev => {
            const studentEntry = prev[studentId] || { history: {}, note: '' };
            const history = studentEntry.history || {};
            const sessionData = history[activeSessionId] || { statuses: {} };
            const currentStatuses = sessionData.statuses || {};
            
            return {
                ...prev,
                [studentId]: {
                    ...studentEntry,
                    history: {
                        ...history,
                        [activeSessionId]: {
                            ...sessionData,
                            statuses: { ...currentStatuses, ...statusMap }
                        }
                    }
                }
            };
        });
    };

    const handlePointsChange = (studentId: string, columnId: string, value: number) => {
        setEntries(prev => {
            const studentEntry = prev[studentId] || { history: {}, note: '' };
            const history = studentEntry.history || {};
            const sessionData = history[activeSessionId] || { values: {} };
            const currentValues = sessionData.values || {};

            return {
                ...prev,
                [studentId]: {
                    ...studentEntry,
                    history: {
                        ...history,
                        [activeSessionId]: {
                            ...sessionData,
                            values: { ...currentValues, [columnId]: value }
                        }
                    }
                }
            };
        });
    };

    const handleNoteChange = (studentId: string, value: string) => {
        setEntries(prev => {
            const studentEntry = prev[studentId] || {};
            return {...prev, [studentId]: {...studentEntry, note: value}};
        });
    }

    const handleSave = async () => {
        if (!scale) return;
        setIsSaving(true);
        const result = await saveScaleEntries(scale.id, entries);
        if (result.success) {
            toast({ title: "Kaydedildi", description: "Değerlendirmeler başarıyla güncellendi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
        }
        setIsSaving(false);
    };

    const handleSaveColumns = async (newColumns: EvaluationScaleColumn[]) => {
        if (!scale) return;
        setIsSaving(true);
        const result = await updateScaleColumns(scale.id, newColumns);
        if (result.success) {
            toast({ title: "Sütunlar Güncellendi" });
            setScale(prev => prev ? { ...prev, columns: newColumns } : null);
            setIsColumnEditorOpen(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    }

    const calculateStudentAverage = useCallback((studentId: string): number | null => {
        const entry = entries[studentId];
        if (!entry || !entry.history) return null;

        const sessionKeys = Object.keys(entry.history);
        if (sessionKeys.length === 0) return null;

        let totalSumsAcrossSessions = 0;
        let validSessionCount = 0;

        sessionKeys.forEach(key => {
            const data = entry.history![key];
            if (scale?.type === 'points' && data.values) {
                const sessionSum = Object.values(data.values).reduce((a, b) => a + (b || 0), 0);
                if (sessionSum > 0 || Object.keys(data.values).length > 0) {
                    totalSumsAcrossSessions += sessionSum;
                    validSessionCount++;
                }
            } else if (scale?.type === 'checklist' && data.statuses) {
                const sessionStatuses = Object.values(data.statuses);
                let sessionSuccessSum = 0;
                let sessionGradedCount = 0;
                sessionStatuses.forEach(s => {
                    if (s === '+') sessionSuccessSum += 100;
                    else if (s === 'o') sessionSuccessSum += 50;
                    if (s !== null) sessionGradedCount++;
                });
                if (sessionGradedCount > 0) {
                    totalSumsAcrossSessions += (sessionSuccessSum / sessionGradedCount);
                    validSessionCount++;
                }
            }
        });

        if (validSessionCount === 0) return null;
        return Math.round(totalSumsAcrossSessions / validSessionCount);
    }, [entries, scale?.type]);

    const classOverallAverage = useMemo(() => {
        const studentAverages = students
            .map(s => calculateStudentAverage(s.uid))
            .filter((avg): avg is number => avg !== null);
        
        if (studentAverages.length === 0) return null;
        return Math.round(studentAverages.reduce((a, b) => a + b, 0) / studentAverages.length);
    }, [students, calculateStudentAverage]);

    const handleCreateAssignment = async () => {
        if (!user || !unit || !course || !branch || selectedStudentUids.size === 0) {
            toast({ title: "Eksik Bilgi", description: "Lütfen en az bir öğrenci seçin.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        const assignmentData = {
            title: assignmentTitle || `${unit.title} Tekrar Ödevi`,
            teacherId: user.uid,
            assignmentType: 'deneme' as const,
            classId: course.classId || '',
            className: course.className || '',
            courseId: course.id,
            courseName: course.title,
            topicIds: (unit.topics || []).map(t => t.id),
            topicNames: (unit.topics || []).map(t => t.title),
            assignedTo: Array.from(selectedStudentUids),
            dueDate: assignmentDueDate || null,
        };

        const result = await createExam(assignmentData as any);
        if (result.success) {
            toast({ title: "Başarılı", description: "Ödev başarıyla oluşturuldu." });
            setIsAssignDialogOpen(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const printPage = () => {
        window.print();
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full py-20 bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;
    }

    if (!scale) {
        return <div className="text-center p-8 text-slate-400">Ölçek bulunamadı.</div>;
    }
    
     const getScoreColorClass = (score: number | null) => {
        if (score === null) return "bg-slate-600";
        if (score >= 85) return "bg-emerald-500 text-white";
        if (score >= 70) return "bg-yellow-500 text-black";
        if (score >= 50) return "bg-orange-500 text-white";
        return "bg-red-500 text-white";
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            {/* SAF TABLO YAZDIRMA CSS'İ */}
            <style media="print">{`
                @page { size: portrait; margin: 10mm; }
                body { background: white !important; color: black !important; }
                
                /* Tüm UI elemanlarını gizle */
                .print-hide { display: none !important; }
                
                /* Ekran için gizli olan, print için gösterilecek yazılar */
                .print-show { display: block !important; color: black !important; text-align: center; }
                span.print-show { display: inline-block !important; }
                
                /* Container ve kart stillerini tamamen sıfırla */
                .min-h-screen, .max-w-\\[98\\%\\] { padding: 0 !important; margin: 0 !important; max-width: 100% !important; min-height: auto !important; background: transparent !important; }
                .card-wrapper { border: none !important; box-shadow: none !important; border-radius: 0 !important; background: transparent !important; margin: 0 !important; padding: 0 !important; }
                
                /* Tabloyu dümdüz siyah-beyaz çizgilere çevir */
                .table-wrapper { overflow: visible !important; max-height: none !important; background: transparent !important; }
                table { width: 100% !important; border-collapse: collapse !important; border: 1px solid black !important; margin: 0 !important; }
                th, td { 
                    border: 1px solid black !important; 
                    padding: 4px !important; 
                    color: black !important; 
                    background: transparent !important; 
                    font-size: 12pt !important; 
                    position: static !important; /* Sticky iptal */
                    text-align: center !important;
                }
                th:first-child, td:first-child { text-align: left !important; }
                th { font-weight: bold !important; }
                
                /* Inputları düz yazıya çevir */
                input { border: none !important; background: transparent !important; color: black !important; text-align: center !important; font-size: 12pt !important; font-weight: normal !important; padding: 0 !important; width: 100% !important; }
                input::placeholder { color: transparent !important; }
                td input[type="text"] { text-align: left !important; }
                
                /* Gereksiz boşlukları sil */
                * { box-shadow: none !important; text-shadow: none !important; border-radius: 0 !important; }
            `}</style>

            {/* Ekran için normalde gizli, CSS ile yönetilecek print sınıfı */}
            <style>{`
                .print-show { display: none; }
            `}</style>

             <div className="fixed inset-0 pointer-events-none z-0 print-hide">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-[98%] mx-auto relative z-10 space-y-6">
                
                {/* YAZDIRMADA GİZLENECEK ÜST BAR */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 print-hide">
                     <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                        <Link href="/teacher/scales">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Ölçekler
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        {type === 'unit' && (
                            <Button variant="outline" size="sm" onClick={() => setIsAssignDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20">
                                <Send className="mr-2 h-4 w-4" /> Ödev Ata
                            </Button>
                        )}
                        
                        {(scale.type === 'checklist' || scale.type === 'points') && type !== 'unit' && (
                            <Button variant="outline" size="sm" onClick={() => setIsColumnEditorOpen(true)} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10">
                                <Settings className="mr-2 h-4 w-4" /> Sütunlar
                            </Button>
                        )}
                        
                        <Button variant="outline" onClick={printPage} size="sm" className="border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-500/20">
                            <Printer className="mr-2 h-4 w-4" /> Yazdır
                        </Button>

                        {scale.type === 'checklist' && (
                            <Button 
                                onClick={() => setIsLiveTestOpen(true)} 
                                size="sm" 
                                className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-emerald-900/30 h-9"
                            >
                                <Sparkles className="mr-2 h-4 w-4" /> Canlı Harf / Test Modu
                            </Button>
                        )}

                        <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                            Değişiklikleri Kaydet
                        </Button>
                    </div>
                </div>
                
                {/* YAZDIRMADA GİZLENECEK KARTLAR */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-hide">
                    <Card className="md:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-2xl font-black text-white">{scale.name.split(' (')[0]?.trim() || 'Ölçek Başlığı'}</CardTitle>
                            <CardDescription className="text-slate-400">
                                <span className="font-bold text-sm">{course?.title} - {branch && `${course?.className} - ${branch}`}</span>
                            </CardDescription>
                            <div className="flex items-center gap-4 text-sm text-slate-300 flex-wrap pt-2">
                                <Badge className="bg-purple-600 text-white">{scale.type === 'tally' ? 'Çetele' : scale.type === 'checklist' ? 'Kontrol Listesi' : 'Puanlı Ölçek'}</Badge>
                                {classOverallAverage !== null && (
                                    <span className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-cyan-400"/>
                                        Sınıf Ortalaması: <Badge className={cn("text-white font-bold", getScoreColorClass(classOverallAverage))}>{classOverallAverage}{scale.type === 'checklist' ? '%' : ''}</Badge>
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="bg-indigo-900/20 border border-indigo-500/30 shadow-xl p-4 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <Label className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                                <History className="w-4 h-4"/> Değerlendirmeler
                            </Label>
                            <Button size="icon" variant="ghost" onClick={handleAddSession} className="h-7 w-7 rounded-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white" title="Yeni Ekle">
                                <Plus className="h-4 w-4"/>
                            </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {availableSessions.map(session => (
                                <button
                                    key={session}
                                    onClick={() => setActiveSessionId(session)}
                                    className={cn(
                                        "h-10 w-10 rounded-xl font-black transition-all border shadow-sm",
                                        activeSessionId === session 
                                            ? "bg-indigo-600 border-indigo-400 text-white scale-110 shadow-indigo-500/40" 
                                            : "bg-slate-900 border-white/5 text-slate-500 hover:border-white/20 hover:text-white"
                                    )}
                                >
                                    {session}
                                </button>
                            ))}
                            <button 
                                onClick={handleAddSession}
                                className="h-10 w-10 rounded-xl font-black border-2 border-dashed border-indigo-500/30 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/10 hover:border-indigo-500 transition-all"
                            >
                                <Plus className="h-5 w-5"/>
                            </button>
                        </div>
                        <p className="text-[10px] text-indigo-300/60 mt-3 text-center italic">Düzenlemek istediğiniz numaraya tıklayın.</p>
                    </Card>
                </div>
                
                {/* SADECE YAZDIRILACAK TABLO ALANI */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden rounded-[2rem] card-wrapper">
                    
                    {/* KART BAŞLIĞI YAZDIRMADA GİZLİ */}
                    <CardHeader className="bg-slate-800/40 border-b border-white/5 py-3 px-6 flex flex-row items-center justify-between print-hide">
                         <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-indigo-400">{activeSessionId}. Değerlendirme Oturumu</span>
                            <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded-xl border border-white/10 text-xs">
                                <span className="text-[10px] text-slate-400 font-bold mr-1">Yazı:</span>
                                <button
                                    type="button"
                                    onClick={() => setHeaderZoom('normal')}
                                    className={cn("px-2 py-0.5 rounded text-[11px] font-bold transition-all", headerZoom === 'normal' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                    title="Normal Boyut"
                                >
                                    A
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHeaderZoom('large')}
                                    className={cn("px-2 py-0.5 rounded text-xs font-bold transition-all", headerZoom === 'large' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                    title="Büyük Boyut"
                                >
                                    A+
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHeaderZoom('huge')}
                                    className={cn("px-2 py-0.5 rounded text-sm font-black transition-all", headerZoom === 'huge' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                    title="Çok Büyük (Harfler İçin İdeal)"
                                >
                                    A++
                                </button>
                            </div>
                         </div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Puanlar otomatik kaydedilmez, "Kaydet"e basın.</div>
                    </CardHeader>
                    
                    <CardContent className="p-0 card-wrapper">
                        {/* Tablo sadece print ekranında plain text olacak */}
                        <div className="relative max-h-[75vh] overflow-auto custom-scrollbar bg-slate-900/50 table-wrapper">
                            {/* Yazdırılırken Sayfanın Başına Ölçek Başlığı Ekle */}
                            <h2 className="print-show text-2xl font-bold mb-4 text-left">{scale.name.split(' (')[0]?.trim()} - {course?.title} {branch && `(${branch})`}</h2>

                            {students.length > 0 ? (
                                <table className="w-full border-separate border-spacing-0 text-left">
                                    <thead>
                                        <tr>
                                            <th className="sticky top-0 left-0 z-[60] bg-slate-800 text-slate-300 font-bold text-sm px-4 py-2 border-b border-r border-white/10 min-w-[200px] shadow-[1px_1px_0px_0px_rgba(255,255,255,0.05)]">
                                                Öğrenci
                                            </th>
                                            
                                            {(scale.type === 'checklist' || scale.type === 'points') && (
                                                (scale.columns || []).map(col => {
                                                    const isColArabic = isArabicText(col.name);
                                                    return (
                                                        <th key={col.id} className={cn(
                                                            "sticky top-0 z-[50] bg-slate-800 text-center text-slate-300 font-medium px-2 py-2.5 border-b border-r border-white/10 shadow-[0px_1px_0px_0px_rgba(255,255,255,0.05)]",
                                                            isColArabic ? "min-w-[60px] w-20" : "w-24"
                                                        )}>
                                                            <span className={cn(
                                                                "inline-block whitespace-nowrap font-bold",
                                                                isColArabic
                                                                    ? cn(
                                                                        "font-serif text-indigo-100 leading-none",
                                                                        headerZoom === 'huge' ? "text-3xl py-1" : headerZoom === 'large' ? "text-2xl py-0.5" : "text-xl"
                                                                      )
                                                                    : cn(
                                                                        "uppercase tracking-wider",
                                                                        headerZoom === 'huge' ? "text-base text-white" : headerZoom === 'large' ? "text-sm text-slate-200" : "text-xs text-slate-400"
                                                                      )
                                                            )}>
                                                                {col.name}
                                                            </span>
                                                        </th>
                                                    );
                                                })
                                            )}
                                            
                                            {scale.type === 'tally' && (
                                                <>
                                                    <th className="sticky top-0 z-[50] bg-slate-800 text-center text-emerald-400 px-2 py-2 text-sm border-b border-r border-white/10 shadow-[0px_1px_0px_0px_rgba(255,255,255,0.05)] w-20">ART+</th>
                                                    <th className="sticky top-0 z-[50] bg-slate-800 text-center text-red-400 px-2 py-2 text-sm border-b border-r border-white/10 shadow-[0px_1px_0px_0px_rgba(255,255,255,0.05)] w-20">EKSİ-</th>
                                                </>
                                            )}

                                            <th className="sticky top-0 z-[50] bg-slate-800 text-center text-emerald-400 font-black px-2 py-2 text-sm border-b border-r border-white/10 shadow-[0px_1px_0px_0px_rgba(255,255,255,0.05)] w-20">
                                                {scale.type === 'points' ? 'OTURUM' : 'BAŞARI'}
                                            </th>
                                            <th className="sticky top-0 z-[50] bg-slate-800 text-center text-indigo-400 font-black px-2 py-2 text-sm border-b border-r border-white/10 shadow-[0px_1px_0px_0px_rgba(255,255,255,0.05)] w-20">
                                                GENEL
                                            </th>
                                            <th className="sticky top-0 z-[50] bg-slate-800 text-slate-300 px-4 py-2 text-sm border-b border-white/10 shadow-[0px_1px_0px_0px_rgba(255,255,255,0.05)] min-w-[200px]">
                                                Notlar
                                            </th>
                                        </tr>
                                    </thead>
                                    
                                    <tbody>
                                        {students.map(student => {
                                            const studentEntry = entries[student.uid] || { history: {}, note: '' };
                                            const sessionData = getStudentDataAtSession(student.uid) || {};
                                            const studentAvg = calculateStudentAverage(student.uid);
                                            
                                            const currentSessionTotal = scale.type === 'points' 
                                                ? Object.values(sessionData.values || {}).reduce((a, b) => a + (b || 0), 0)
                                                : null;

                                            return (
                                                <tr key={student.uid} className="hover:bg-white/5 transition-colors group">
                                                    
                                                    <td className="sticky left-0 z-[40] bg-slate-900 border-b border-r border-white/10 px-4 py-2 group-hover:bg-slate-800 transition-colors shadow-[1px_0px_0px_0px_rgba(255,255,255,0.05)]">
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar user={student} className="h-9 w-9 border-2 border-slate-700 group-hover:border-purple-400 print-hide" />
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-base text-white truncate print-text-black">{student.displayName}</span>
                                                                {/* Sınıf ve Rozet yazdırmada gizli */}
                                                                <div className="flex items-center gap-2 mt-0.5 print-hide">
                                                                    <span className="text-[10px] text-slate-400 font-mono">{student.class}</span>
                                                                    {studentAvg !== null && (
                                                                        <Badge className={cn("text-xs font-black px-2 py-0 shadow-sm border-0", getScoreColorClass(studentAvg))}>
                                                                            Not: {studentAvg}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    
                                                    {scale.type === 'checklist' && (
                                                        (scale.columns || []).map(col => (
                                                            <td key={col.id} className="text-center p-2 border-b border-r border-white/5 bg-transparent">
                                                                <StatusButton
                                                                    status={sessionData.statuses?.[col.id] || null}
                                                                    onClick={() => handleChecklistChange(student.uid, col.id)}
                                                                />
                                                            </td>
                                                        ))
                                                    )}

                                                    {scale.type === 'points' && (
                                                         (scale.columns || []).map(col => (
                                                            <td key={col.id} className="text-center p-2 border-b border-r border-white/5 bg-transparent">
                                                                <Input 
                                                                    type="number"
                                                                    min="0"
                                                                    value={sessionData.values?.[col.id] ?? ""}
                                                                    onChange={(e) => handlePointsChange(student.uid, col.id, parseInt(e.target.value) || 0)}
                                                                    className="w-20 mx-auto bg-slate-950 border-white/20 text-center font-black text-lg text-cyan-300 h-10 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] placeholder:text-slate-700"
                                                                    placeholder="-"
                                                                />
                                                            </td>
                                                        ))
                                                    )}

                                                    {scale.type === 'tally' && (
                                                        <>
                                                            <td className="text-center p-2 border-b border-r border-white/5 bg-transparent">
                                                                <div className="flex items-center justify-center gap-1 bg-emerald-900/30 p-1 rounded-lg print-wrapper">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 print-hide" onClick={() => handleTallyChange(student.uid, 'plus', Math.max(0, (sessionData.plus || 0) - 1))}><Minus className="h-4 w-4"/></Button>
                                                                    <span className="font-black text-xl text-emerald-300 w-6 print-text-black">{sessionData.plus || 0}</span>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 print-hide" onClick={() => handleTallyChange(student.uid, 'plus', (sessionData.plus || 0) + 1)}><Plus className="h-4 w-4"/></Button>
                                                                </div>
                                                            </td>
                                                            <td className="text-center p-2 border-b border-r border-white/5 bg-transparent">
                                                                <div className="flex items-center justify-center gap-1 bg-red-900/30 p-1 rounded-lg print-wrapper">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 print-hide" onClick={() => handleTallyChange(student.uid, 'minus', Math.max(0, (sessionData.minus || 0) - 1))}><Minus className="h-4 w-4"/></Button>
                                                                    <span className="font-black text-xl text-red-300 w-6 print-text-black">{sessionData.minus || 0}</span>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 print-hide" onClick={() => handleTallyChange(student.uid, 'minus', (sessionData.minus || 0) + 1)}><Plus className="h-4 w-4"/></Button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                    
                                                    <td className="text-center p-2 bg-slate-950/40 border-b border-r border-white/10 font-bold">
                                                        {scale.type === 'points' ? (
                                                            <span className="text-2xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">{currentSessionTotal}</span>
                                                        ) : (
                                                            <span className="text-slate-500">-</span>
                                                        )}
                                                    </td>
                                                    
                                                    <td className="text-center p-2 bg-slate-900/60 border-b border-r border-white/10 group-hover:bg-slate-800/90 transition-colors">
                                                        <div className="flex flex-col items-center">
                                                            <span className={cn("text-2xl font-black transition-colors drop-shadow-md", studentAvg !== null ? "text-indigo-400" : "text-slate-700")}>
                                                                {studentAvg !== null ? studentAvg : "-"}
                                                            </span>
                                                            {studentAvg !== null && scale.type === 'checklist' && (
                                                                <div className="w-16 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden shadow-inner print-hide">
                                                                    <div className={cn("h-full transition-all", getScoreColorClass(studentAvg))} style={{ width: `${studentAvg}%` }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    
                                                    <td className="p-2 border-b border-white/10">
                                                        <Input 
                                                            type="text" 
                                                            placeholder="Gözlem ve Notlar..." 
                                                            value={studentEntry.note || ''} 
                                                            onChange={e => handleNoteChange(student.uid, e.target.value)} 
                                                            className="bg-slate-950 border-white/10 text-white h-10 text-sm focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-center h-24 text-slate-500 flex items-center justify-center font-medium text-base">Öğrenci bulunamadı.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* MODALLAR YAZDIRMADA GİZLİ */}
            <div className="print-hide">
                <ColumnEditorDialog
                    isOpen={isColumnEditorOpen}
                    onOpenChange={setIsColumnEditorOpen}
                    columns={scale.columns || []}
                    scaleType={scale.type}
                    onSave={handleSaveColumns}
                    isSaving={isSaving}
                />

                {scale.type === 'checklist' && (
                    <LiveReadingTestDialog
                        isOpen={isLiveTestOpen}
                        onOpenChange={setIsLiveTestOpen}
                        scale={scale}
                        students={students}
                        activeSessionId={activeSessionId}
                        entries={entries}
                        onStatusChange={handleDirectStatusChange}
                        onBatchStatusChange={handleBatchStatusChange}
                        onSave={handleSave}
                        isSaving={isSaving}
                    />
                )}

                <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                    <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-indigo-400">Ödev Olarak Ata</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                "{unit?.title}" ünitesindeki konuları öğrencilere atayın.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="assignment-title" className="text-slate-300">Ödev Başlığı</Label>
                                <Input id="assignment-title" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} placeholder={`${unit?.title} Ödevi`} className="bg-slate-950 border-white/10 text-white"/>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Öğrenciler ({selectedStudentUids.size})</Label>
                                    <ScrollArea className="h-48 border border-white/10 rounded-md bg-slate-950/50 p-2">
                                        <div className="flex items-center space-x-2 p-1 border-b border-white/10 bg-slate-900/50">
                                            <Checkbox 
                                                id="assign-all-students"
                                                checked={selectedStudentUids.size === students.length && students.length > 0}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedStudentUids(new Set(students.map(s => s.uid)))
                                                    else setSelectedStudentUids(new Set())
                                                }}
                                                className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                            />
                                            <label htmlFor="assign-all-students" className="text-sm font-bold text-white">Tümünü Seç</label>
                                        </div>
                                        <div className="space-y-1 pt-1">
                                            {students.map(student => (
                                                <div key={student.uid} className="flex items-center space-x-2 p-1 hover:bg-white/5 rounded">
                                                    <Checkbox id={`assign-student-${student.uid}`} checked={selectedStudentUids.has(student.uid)} onCheckedChange={() => setSelectedStudentUids(prev => { const newSet = new Set(prev); if (newSet.has(student.uid)) newSet.delete(student.uid); else newSet.add(student.uid); return newSet; })} className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"/>
                                                    <label htmlFor={`assign-student-${student.uid}`} className="text-sm text-slate-300">{student.displayName}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Son Teslim Tarihi</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 bg-slate-950 border-white/10 text-white hover:bg-slate-900", !assignmentDueDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4 text-rose-400" />
                                                {assignmentDueDate ? format(assignmentDueDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-white"><Calendar mode="single" selected={assignmentDueDate} onSelect={setAssignmentDueDate} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                        
                        <DialogFooter className="border-t border-white/10 pt-4">
                            <DialogClose asChild><Button variant="ghost" className="text-slate-400 hover:bg-white/5">İptal</Button></DialogClose>
                            <Button onClick={handleCreateAssignment} disabled={isSaving || selectedStudentUids.size === 0} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Ödevi Ata
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}