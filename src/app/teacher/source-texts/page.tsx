'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    BookOpen, Search, Filter, Home, ArrowLeft, PlusCircle, 
    FilePenLine, Trash2, Copy, Check, Eye, Sparkles, 
    Loader2, BookMarked, Layers, FileText, AlertCircle, 
    ChevronRight, X, ExternalLink, RefreshCw, ArrowUpDown, 
    ClipboardPaste, Eraser, CheckCircle2, Type, GraduationCap,
    RotateCcw, FilterX
} from 'lucide-react';
import { collectionGroup, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, 
    DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, 
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
    Select, SelectContent, SelectItem, 
    SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { saveTopicSourceText, clearTopicSourceText } from './actions';
import { cn } from '@/lib/utils';

interface TopicItem {
    id: string;
    courseId: string;
    unitId: string;
    topicId: string;
    title: string;
    sourceText: string;
    className: string;
    grade: string;
    unitTitle: string;
    courseTitle: string;
    wordCount: number;
    charCount: number;
}

export default function SourceTextsManagementPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [topics, setTopics] = useState<TopicItem[]>([]);
    
    // Filters & Search (Strictly hierarchical: Grade -> Course -> Unit -> Topic, NO 'all' option)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGrade, setSelectedGrade] = useState<string>('5');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [selectedTopicId, setSelectedTopicId] = useState<string>('');
    const [sortBy, setSortBy] = useState<'order' | 'word_desc' | 'word_asc' | 'title'>('order');

    // Modals
    const [readingTopic, setReadingTopic] = useState<TopicItem | null>(null);
    const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null);
    const [editText, setEditText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [readerFontSize, setReaderFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

    // Load Data
    const loadData = async (showRefreshToast = false) => {
        setIsLoading(true);
        try {
            const res = await fetch('/curriculum/manifest.json');
            let manifest: any = { classGroups: [] };
            if (res.ok) {
                manifest = await res.json();
            }

            const topicMetaMap = new Map<string, {
                courseId: string;
                unitId: string;
                className: string;
                grade: string;
                courseTitle: string;
                unitTitle: string;
                topicTitle: string;
            }>();

            for (const cg of manifest.classGroups || []) {
                const grade = cg.name;
                const className = `${grade}. Sınıf`;
                for (const course of cg.courses || []) {
                    for (const unit of course.units || []) {
                        for (const topic of unit.topics || []) {
                            topicMetaMap.set(topic.id, {
                                courseId: course.id,
                                unitId: unit.id,
                                className,
                                grade,
                                courseTitle: course.title,
                                unitTitle: unit.title,
                                topicTitle: topic.title
                            });
                        }
                    }
                }
            }

            const snapshot = await getDocs(query(collectionGroup(db, 'topics')));
            const firestoreTopicsMap = new Map<string, any>();
            snapshot.forEach(docSnap => {
                firestoreTopicsMap.set(docSnap.id, {
                    data: docSnap.data(),
                    path: docSnap.ref.path
                });
            });

            const topicList: TopicItem[] = [];
            const seenTopicIds = new Set<string>();

            // 1. Önce manifest sırasına göre tüm konuları ekle (doğal müfredat sıralaması)
            for (const cg of manifest.classGroups || []) {
                const grade = cg.name;
                const className = `${grade}. Sınıf`;
                for (const course of cg.courses || []) {
                    for (const unit of course.units || []) {
                        for (const topic of unit.topics || []) {
                            seenTopicIds.add(topic.id);
                            const firestoreDoc = firestoreTopicsMap.get(topic.id);
                            const sourceText = ((firestoreDoc?.data?.sourceText ?? topic.sourceText) || '').trim();
                            const wordCount = sourceText ? sourceText.split(/\s+/).filter(Boolean).length : 0;
                            const charCount = sourceText.length;

                            topicList.push({
                                id: topic.id,
                                topicId: topic.id,
                                courseId: course.id,
                                unitId: unit.id,
                                title: topic.title,
                                sourceText,
                                className,
                                grade,
                                unitTitle: unit.title,
                                courseTitle: course.title,
                                wordCount,
                                charCount
                            });
                        }
                    }
                }
            }

            // 2. Firestore'da olup manifest'te bulunmayan ek konular varsa onları da ekle
            firestoreTopicsMap.forEach((val, topicId) => {
                if (!seenTopicIds.has(topicId)) {
                    const d = val.data;
                    const pathParts = val.path.split('/');
                    const courseId = pathParts[1] || '';
                    const unitId = pathParts[3] || '';
                    const meta = topicMetaMap.get(topicId);
                    const sourceText = (d.sourceText || '').trim();
                    const wordCount = sourceText ? sourceText.split(/\s+/).filter(Boolean).length : 0;
                    const charCount = sourceText.length;

                    topicList.push({
                        id: topicId,
                        topicId,
                        courseId: courseId || meta?.courseId || '',
                        unitId: unitId || meta?.unitId || '',
                        title: d.title || meta?.topicTitle || 'İsimsiz Konu',
                        sourceText,
                        className: meta?.className || 'Din Kültürü',
                        grade: meta?.grade || '5',
                        unitTitle: meta?.unitTitle || 'Ünite',
                        courseTitle: meta?.courseTitle || 'DKAB',
                        wordCount,
                        charCount
                    });
                }
            });

            setTopics(topicList);
            if (showRefreshToast) {
                toast({ title: "Başarılı", description: "Kaynak metinler veritabanından güncellendi." });
            }
        } catch (error: any) {
            console.error("Error loading source texts:", error);
            toast({ title: "Hata", description: "Kaynak metinler yüklenemedi: " + error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Statistics
    const stats = useMemo(() => {
        const total = topics.length;
        const withText = topics.filter(t => t.sourceText.length > 0).length;
        const withoutText = total - withText;
        const totalWords = topics.reduce((acc, t) => acc + t.wordCount, 0);
        return { total, withText, withoutText, totalWords };
    }, [topics]);

    // Available Grades (e.g. ['5', '6', '7', '8'])
    const availableGrades = useMemo(() => {
        const grades = new Set<string>();
        topics.forEach(t => {
            if (t.grade) grades.add(t.grade);
        });
        return Array.from(grades).sort((a, b) => Number(a) - Number(b));
    }, [topics]);

    // Available Courses for selectedGrade (NO 'all')
    const availableCourses = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number }>();
        topics.forEach(t => {
            if (t.grade !== selectedGrade) return;
            if (!t.courseId) return;
            const existing = map.get(t.courseId);
            if (existing) {
                existing.count++;
            } else {
                map.set(t.courseId, {
                    id: t.courseId,
                    title: t.courseTitle || 'Ders',
                    count: 1
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    }, [topics, selectedGrade]);

    // Available Units for selectedGrade and selectedCourseId (NO 'all')
    const availableUnits = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number }>();
        topics.forEach(t => {
            if (t.grade !== selectedGrade) return;
            if (t.courseId !== selectedCourseId) return;
            if (!t.unitId) return;
            const existing = map.get(t.unitId);
            if (existing) {
                existing.count++;
            } else {
                map.set(t.unitId, {
                    id: t.unitId,
                    title: t.unitTitle || 'Ünite',
                    count: 1
                });
            }
        });
        return Array.from(map.values());
    }, [topics, selectedGrade, selectedCourseId]);

    // Available Topics for selectedGrade, selectedCourseId and selectedUnitId (NO 'all')
    const availableTopics = useMemo(() => {
        return topics.filter(t => 
            t.grade === selectedGrade && 
            t.courseId === selectedCourseId && 
            t.unitId === selectedUnitId
        );
    }, [topics, selectedGrade, selectedCourseId, selectedUnitId]);

    // Auto-select valid items on initial load or change
    useEffect(() => {
        if (topics.length === 0) return;

        // 1. Sınıf kontrolü
        let currentGrade = selectedGrade;
        if (!currentGrade || !availableGrades.includes(currentGrade)) {
            currentGrade = availableGrades[0] || '5';
            setSelectedGrade(currentGrade);
        }

        // 2. Ders kontrolü
        const gradeTopics = topics.filter(t => t.grade === currentGrade);
        const validCourseIds = Array.from(new Set(gradeTopics.map(t => t.courseId)));
        let currentCourse = selectedCourseId;
        if (!currentCourse || !validCourseIds.includes(currentCourse)) {
            currentCourse = validCourseIds[0] || '';
            setSelectedCourseId(currentCourse);
        }

        // 3. Ünite kontrolü
        const courseTopics = gradeTopics.filter(t => t.courseId === currentCourse);
        const validUnitIds = Array.from(new Set(courseTopics.map(t => t.unitId)));
        let currentUnit = selectedUnitId;
        if (!currentUnit || !validUnitIds.includes(currentUnit)) {
            currentUnit = validUnitIds[0] || '';
            setSelectedUnitId(currentUnit);
        }

        // 4. Konu kontrolü
        const unitTopics = courseTopics.filter(t => t.unitId === currentUnit);
        const validTopicIds = unitTopics.map(t => t.topicId);
        let currentTopic = selectedTopicId;
        if (!currentTopic || !validTopicIds.includes(currentTopic)) {
            currentTopic = validTopicIds[0] || '';
            setSelectedTopicId(currentTopic);
        }
    }, [topics, availableGrades, selectedGrade, selectedCourseId, selectedUnitId, selectedTopicId]);

    // Cascading Handlers (Strictly single selection, NO 'all' option)
    const handleGradeChange = (grade: string) => {
        setSelectedGrade(grade);
        const gradeTopics = topics.filter(t => t.grade === grade);
        const firstCourse = gradeTopics[0]?.courseId || '';
        setSelectedCourseId(firstCourse);

        const courseTopics = gradeTopics.filter(t => t.courseId === firstCourse);
        const firstUnit = courseTopics[0]?.unitId || '';
        setSelectedUnitId(firstUnit);

        const unitTopics = courseTopics.filter(t => t.unitId === firstUnit);
        const firstTopic = unitTopics[0]?.topicId || '';
        setSelectedTopicId(firstTopic);
    };

    const handleCourseChange = (courseId: string) => {
        setSelectedCourseId(courseId);
        const courseTopics = topics.filter(t => t.grade === selectedGrade && t.courseId === courseId);
        const firstUnit = courseTopics[0]?.unitId || '';
        setSelectedUnitId(firstUnit);

        const unitTopics = courseTopics.filter(t => t.unitId === firstUnit);
        const firstTopic = unitTopics[0]?.topicId || '';
        setSelectedTopicId(firstTopic);
    };

    const handleUnitChange = (unitId: string) => {
        setSelectedUnitId(unitId);
        const unitTopics = topics.filter(t => t.grade === selectedGrade && t.courseId === selectedCourseId && t.unitId === unitId);
        const firstTopic = unitTopics[0]?.topicId || '';
        setSelectedTopicId(firstTopic);
    };

    const handleTopicChange = (topicId: string) => {
        setSelectedTopicId(topicId);
    };

    // Active Selection Names
    const activeSelectedCourse = useMemo(() => {
        return availableCourses.find(c => c.id === selectedCourseId)?.title || 'Ders';
    }, [availableCourses, selectedCourseId]);

    const activeSelectedUnit = useMemo(() => {
        return availableUnits.find(u => u.id === selectedUnitId)?.title || 'Ünite';
    }, [availableUnits, selectedUnitId]);

    const activeSelectedTopic = useMemo(() => {
        return availableTopics.find(t => t.topicId === selectedTopicId) || availableTopics[0] || null;
    }, [availableTopics, selectedTopicId]);

    // Filtered Topics (current unit topics or global search results)
    const filteredTopics = useMemo(() => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return topics.filter(t => 
                (t.title || '').toLowerCase().includes(q) ||
                (t.unitTitle || '').toLowerCase().includes(q) ||
                (t.courseTitle || '').toLowerCase().includes(q) ||
                (t.className || '').toLowerCase().includes(q) ||
                (t.sourceText || '').toLowerCase().includes(q)
            );
        }

        let list = availableTopics;
        if (sortBy === 'word_desc') return [...list].sort((a, b) => b.wordCount - a.wordCount);
        if (sortBy === 'word_asc') return [...list].sort((a, b) => a.wordCount - b.wordCount);
        if (sortBy === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title, 'tr'));
        return list;
    }, [topics, availableTopics, searchQuery, sortBy]);

    // Copy action
    const handleCopy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast({ title: "Kopyalandı", description: "Kaynak metin panoya kopyalandı." });
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            toast({ title: "Hata", description: "Panoya kopyalanamadı.", variant: "destructive" });
        }
    };

    // Open Editor
    const handleOpenEdit = (topic: TopicItem) => {
        setEditingTopic(topic);
        setEditText(topic.sourceText);
    };

    // Save Editor
    const handleSaveEdit = async () => {
        if (!editingTopic) return;
        setIsSaving(true);
        try {
            const res = await saveTopicSourceText(
                editingTopic.courseId,
                editingTopic.unitId,
                editingTopic.topicId,
                editText
            );

            if (res.success) {
                const trimmed = editText.trim();
                const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
                const charCount = trimmed.length;

                setTopics(prev => prev.map(t => {
                    if (t.id === editingTopic.id) {
                        return {
                            ...t,
                            sourceText: trimmed,
                            wordCount,
                            charCount
                        };
                    }
                    return t;
                }));

                toast({ title: "Kayıt Başarılı", description: `${editingTopic.title} için kaynak metin güncellendi.` });
                setEditingTopic(null);
            } else {
                toast({ title: "Kayıt Hatası", description: res.error || "Metin kaydedilemedi.", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Hata", description: error.message || "İşlem sırasında hata oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // Clear / Delete Action
    const handleClearText = async (topic: TopicItem) => {
        try {
            const res = await clearTopicSourceText(topic.courseId, topic.unitId, topic.topicId);
            if (res.success) {
                setTopics(prev => prev.map(t => {
                    if (t.id === topic.id) {
                        return {
                            ...t,
                            sourceText: '',
                            wordCount: 0,
                            charCount: 0
                        };
                    }
                    return t;
                }));
                toast({ title: "Silindi", description: `${topic.title} kaynak metni temizlendi.` });
            } else {
                toast({ title: "Hata", description: res.error || "Metin silinemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message, variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[900px] h-[900px] bg-indigo-900/15 rounded-full blur-[160px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-emerald-900/15 rounded-full blur-[160px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                
                {/* ══ ÜST GEZİNME VE BUTONLAR ══ */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 bg-slate-900/60 backdrop-blur-md rounded-xl h-11 px-5 shadow-lg">
                            <Link href="/">
                                <Home className="mr-2 h-5 w-5 text-indigo-400" /> Ana Sayfa
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-11 px-4">
                            <Link href="/teacher">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Öğretmen Paneli
                            </Link>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isRefreshing || isLoading}
                            onClick={() => { setIsRefreshing(true); loadData(true); }}
                            className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-11 px-4"
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin text-indigo-400")} />
                            Yenile
                        </Button>
                    </div>
                </div>

                {/* ══ BAŞLIK VE AÇIKLAMA ══ */}
                <div className="text-center space-y-4 py-4">
                    <div className="inline-flex items-center justify-center p-4 bg-slate-900 border border-indigo-500/20 rounded-3xl shadow-2xl shadow-indigo-950/50 mb-1">
                        <BookOpen className="h-10 w-10 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow-lg flex items-center justify-center gap-3">
                        Kaynak Metin Kütüphanesi
                        <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-bold px-3 py-1">
                            MERKEZİ VERİ TABANI
                        </Badge>
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto font-medium">
                        Sunumlar, soru bankası sihirbazı ve etkinlik veri bankasında kullanılan tüm ders kitabı ve konu kaynak metinlerini tek bir yerden görüntüleyin, düzenleyin ve yönetin.
                    </p>
                </div>

                {/* ══ İSTATİSTİK KARTLARI ══ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Layers className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Toplam Konu</p>
                            <p className="text-2xl font-black text-white">{stats.total}</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Metni Olanlar</p>
                            <p className="text-2xl font-black text-emerald-400">{stats.withText}</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-amber-500/20 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">Metin Bekleyen</p>
                            <p className="text-2xl font-black text-amber-400">{stats.withoutText}</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                            <Type className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Toplam Kelime</p>
                            <p className="text-2xl font-black text-indigo-400">{stats.totalWords.toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                </div>

                {/* ══ FİLTRELER VE HİYERARŞİK SEÇİCİLER (NO 'TÜM') ══ */}
                <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-2xl space-y-5">
                    
                    {/* 1. Sınıf Doğrudan Seçim Sekmeleri */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <GraduationCap className="w-4 h-4 text-indigo-400" /> Sınıf Seviyesi
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                                Seçili: <strong className="text-indigo-400 font-bold">{selectedGrade}. Sınıf</strong>
                            </span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {availableGrades.map(grade => {
                                const count = topics.filter(t => t.grade === grade).length;
                                const isSelected = selectedGrade === grade;
                                return (
                                    <button
                                        key={grade}
                                        onClick={() => handleGradeChange(grade)}
                                        className={cn(
                                            "px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2.5",
                                            isSelected 
                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 ring-2 ring-indigo-400/40" 
                                                : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-white/5"
                                        )}
                                    >
                                        <span>{grade}. Sınıf</span>
                                        <span className={cn(
                                            "text-[11px] px-2 py-0.5 rounded-md font-mono",
                                            isSelected ? "bg-indigo-700/90 text-white" : "bg-white/5 text-slate-400"
                                        )}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Ders, Ünite, Konu Hiyerarşik Seçicileri */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                        {/* Ders Seçici */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Ders
                            </label>
                            <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                                <SelectTrigger className="h-11 bg-slate-950 border-white/10 text-sm text-white rounded-xl">
                                    <SelectValue placeholder="Ders Seçin" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white max-h-72">
                                    {availableCourses.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.title} ({c.count} Konu)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Ünite Seçici */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Ünite
                            </label>
                            <Select value={selectedUnitId} onValueChange={handleUnitChange}>
                                <SelectTrigger className="h-11 bg-slate-950 border-white/10 text-sm text-white rounded-xl">
                                    <SelectValue placeholder="Ünite Seçin" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white max-h-72">
                                    {availableUnits.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.title} ({u.count} Konu)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Konu Seçici */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Konu (Doğrudan Seç)
                            </label>
                            <Select value={selectedTopicId} onValueChange={handleTopicChange}>
                                <SelectTrigger className="h-11 bg-slate-950 border-white/10 text-sm text-white rounded-xl">
                                    <SelectValue placeholder="Konu Seçin" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white max-h-72">
                                    {availableTopics.map(top => (
                                        <SelectItem key={top.topicId} value={top.topicId}>
                                            <span className="flex items-center gap-2">
                                                <span 
                                                    className={cn(
                                                        "w-2 h-2 rounded-full flex-shrink-0", 
                                                        top.sourceText.length > 0 ? "bg-emerald-400" : "bg-slate-600"
                                                    )} 
                                                    title={top.sourceText.length > 0 ? "Metin var" : "Metin yok"}
                                                />
                                                <span className="truncate max-w-[280px]">{top.title}</span>
                                                {top.sourceText.length > 0 && (
                                                    <span className="text-[10px] text-emerald-400/80 font-mono">
                                                        ({top.wordCount} k.)
                                                    </span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 3. Arama ve Sıralama */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-white/5">
                        {/* Canlı Arama (8 sütun) */}
                        <div className="md:col-span-8 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Konu, ünite veya kaynak metin içinde canlı ara..."
                                className="pl-11 pr-10 h-11 bg-slate-950 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-indigo-500/60"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                    title="Aramayı temizle"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Sıralama (4 sütun) */}
                        <div className="md:col-span-4">
                            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                                <SelectTrigger className="h-11 bg-slate-950 border-white/10 text-sm text-white rounded-xl">
                                    <SelectValue placeholder="Sırala" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="order">Müfredat Sırasına Göre</SelectItem>
                                    <SelectItem value="word_desc">Kelime Sayısı (Çoktan Aza)</SelectItem>
                                    <SelectItem value="word_asc">Kelime Sayısı (Azdan Çoğa)</SelectItem>
                                    <SelectItem value="title">Konu Adı (A - Z)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 4. Konu Hızlı Erişim Hapları (Topic Pills) */}
                    {availableTopics.length > 0 && !searchQuery && (
                        <div className="pt-3 border-t border-white/5 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>{activeSelectedUnit} Konuları (Hızlı Seçim):</span>
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                    {availableTopics.length} Konu
                                </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap max-h-36 overflow-y-auto pr-1">
                                {availableTopics.map(t => {
                                    const isSelected = selectedTopicId === t.topicId;
                                    const hasText = t.sourceText.length > 0;
                                    return (
                                        <button
                                            key={t.topicId}
                                            onClick={() => {
                                                handleTopicChange(t.topicId);
                                                const el = document.getElementById(`topic-card-${t.topicId}`);
                                                if (el) {
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }}
                                            className={cn(
                                                "text-xs px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-2 border text-left",
                                                isSelected
                                                    ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-900/40 font-bold"
                                                    : "bg-slate-950/60 border-white/5 text-slate-300 hover:text-white hover:bg-slate-800"
                                            )}
                                        >
                                            <span 
                                                className={cn(
                                                    "w-2 h-2 rounded-full flex-shrink-0",
                                                    hasText ? (isSelected ? "bg-emerald-300" : "bg-emerald-400") : "bg-slate-600"
                                                )} 
                                                title={hasText ? "Metin var" : "Metin yok"}
                                            />
                                            <span className="truncate max-w-[220px]">{t.title}</span>
                                            {hasText && (
                                                <span className={cn(
                                                    "text-[10px] font-mono",
                                                    isSelected ? "text-indigo-200" : "text-slate-400"
                                                )}>
                                                    {t.wordCount}k
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 5. Aktif Hiyerarşi Özeti / Yol Bilgisi */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs text-slate-400">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-slate-500">
                                Konum:
                            </span>

                            <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs py-1 px-2.5 font-bold">
                                {selectedGrade}. Sınıf
                            </Badge>

                            <span className="text-slate-600">›</span>

                            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs py-1 px-2.5 font-semibold">
                                <GraduationCap className="w-3 h-3 mr-1" />
                                <span className="truncate max-w-[180px]">{activeSelectedCourse}</span>
                            </Badge>

                            <span className="text-slate-600">›</span>

                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs py-1 px-2.5 font-semibold">
                                <Layers className="w-3 h-3 mr-1" />
                                <span className="truncate max-w-[240px]">{activeSelectedUnit}</span>
                            </Badge>

                            {searchQuery.trim() && (
                                <>
                                    <span className="text-slate-600">•</span>
                                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs py-1 px-2.5 flex items-center gap-1.5">
                                        <span>Arama: "{searchQuery}"</span>
                                        <button onClick={() => setSearchQuery('')} className="hover:text-white ml-0.5">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <span>Gösterilen: <strong className="text-indigo-400 font-bold">{filteredTopics.length} Konu</strong></span>
                            {searchQuery.trim() && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSearchQuery('')}
                                    className="h-7 px-2 text-xs text-slate-400 hover:text-white hover:bg-white/5"
                                >
                                    <X className="w-3 h-3 mr-1" /> Aramayı Temizle
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══ KAYNAK METİN LİSTESİ ══ */}
                {isLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                        <p className="text-sm font-medium text-slate-400">Kaynak metinler ve müfredat yükleniyor...</p>
                    </div>
                ) : filteredTopics.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-slate-900/30 border-2 border-dashed border-white/10 rounded-3xl text-center">
                        <BookMarked className="h-12 w-12 text-slate-600" />
                        <h3 className="text-lg font-bold text-white">Eşleşen kaynak metin bulunamadı</h3>
                        <p className="text-xs text-slate-400 max-w-md">Arama kriterlerinizi temizleyebilir veya sınıf/ders/ünite seçimlerinizi değiştirebilirsiniz.</p>
                        {searchQuery && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSearchQuery('')}
                                className="border-white/10 text-slate-300 hover:text-white"
                            >
                                Aramayı Temizle
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTopics.map((topic) => {
                            const hasText = topic.sourceText.length > 0;
                            const isCurrentSelected = topic.topicId === selectedTopicId;

                            return (
                                <div
                                    key={topic.id}
                                    id={`topic-card-${topic.topicId}`}
                                    className={cn(
                                        "p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 backdrop-blur-md group hover:shadow-xl",
                                        isCurrentSelected
                                            ? "ring-2 ring-indigo-500 shadow-xl shadow-indigo-950/60 bg-slate-900/90 border-indigo-500/50"
                                            : hasText 
                                                ? "bg-slate-900/70 border-white/10 hover:border-indigo-500/40 hover:shadow-indigo-950/30" 
                                                : "bg-slate-900/30 border-amber-500/20 hover:border-amber-500/40"
                                    )}
                                >
                                    <div className="space-y-3">
                                        {/* Üst Bilgi Rozetleri & Hiyerarşi */}
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-[11px] font-bold">
                                                    {topic.className}
                                                </Badge>
                                                <span className="text-[11px] text-slate-500">›</span>
                                                <span className="text-[11px] text-slate-400 font-medium truncate max-w-[160px]" title={topic.unitTitle}>
                                                    {topic.unitTitle}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {isCurrentSelected && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-200 bg-indigo-500/30 px-2 py-0.5 rounded-full border border-indigo-400/50 shadow-sm">
                                                        Seçili Konu
                                                    </span>
                                                )}
                                                {hasText ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3" /> Metin Var
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                        <AlertCircle className="w-3 h-3" /> Metin Yok
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Konu Başlığı */}
                                        <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                                            {topic.title}
                                        </h3>

                                        {/* Metin Önizlemesi veya Boş Durum */}
                                        {hasText ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                                                        {topic.wordCount} kelime • {topic.charCount.toLocaleString('tr-TR')} karakter
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-normal bg-black/20 p-3 rounded-xl border border-white/5">
                                                    {topic.sourceText}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center gap-2.5">
                                                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                                <span className="text-xs text-amber-200/80 font-medium">
                                                    Bu konuya ait kaynak metin henüz kaydedilmemiş.
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Alt Butonlar */}
                                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                        {hasText ? (
                                            <>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setReadingTopic(topic)}
                                                        className="text-slate-300 hover:text-white hover:bg-white/10 h-8 px-2.5 text-xs font-semibold rounded-lg"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Oku
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleCopy(topic.id, topic.sourceText)}
                                                        className="text-slate-300 hover:text-white hover:bg-white/10 h-8 px-2 text-xs rounded-lg"
                                                        title="Metni Kopyala"
                                                    >
                                                        {copiedId === topic.id ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                                                        )}
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOpenEdit(topic)}
                                                        className="border-white/10 text-indigo-300 hover:text-white hover:bg-indigo-600/30 h-8 px-3 text-xs font-bold rounded-lg"
                                                    >
                                                        <FilePenLine className="w-3.5 h-3.5 mr-1" /> Düzenle
                                                    </Button>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0 rounded-lg"
                                                                title="Metni Sil"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-red-400">Kaynak Metni Temizle</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-slate-400">
                                                                    <strong>{topic.title}</strong> konusuna ait kaynak metin silinecektir. Bu işlem geri alınamaz.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5">İptal</AlertDialogCancel>
                                                                <AlertDialogAction 
                                                                    onClick={() => handleClearText(topic)}
                                                                    className="bg-red-600 hover:bg-red-500 text-white"
                                                                >
                                                                    Evet, Temizle
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenEdit(topic)}
                                                className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold h-9 rounded-xl shadow-lg shadow-indigo-950/40"
                                            >
                                                <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Kaynak Metin Ekle
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ══ DÜZENLEME MODALI ══ */}
            <Dialog open={!!editingTopic} onOpenChange={(open) => !open && setEditingTopic(null)}>
                <DialogContent className="max-w-3xl bg-slate-900 border-white/10 text-white max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                                {editingTopic?.className}
                            </Badge>
                            <span className="text-xs text-slate-400">›</span>
                            <span className="text-xs text-slate-400">{editingTopic?.unitTitle}</span>
                        </div>
                        <DialogTitle className="text-xl font-black text-white">
                            {editingTopic?.title} - Kaynak Metin
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Ders kitabı metnini veya konu özetini buraya girin. Bu metin sunumlarda, soru bankasında ve etkinlik üretiminde kullanılır.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Metin Düzenleme Alanı */}
                    <div className="space-y-3 py-2 flex-grow flex flex-col">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold text-indigo-300">
                                {editText.trim() ? editText.trim().split(/\s+/).filter(Boolean).length : 0} kelime • {editText.length.toLocaleString('tr-TR')} karakter
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const text = await navigator.clipboard.readText();
                                            if (text) {
                                                setEditText(prev => prev ? prev + '\n' + text : text);
                                                toast({ title: "Yapıştırıldı", description: "Pano içeriği eklendi." });
                                            }
                                        } catch(e) {
                                            toast({ title: "Hata", description: "Panodan okuma izni alınamadı.", variant: "destructive" });
                                        }
                                    }}
                                    className="h-7 px-2 text-xs text-slate-300 hover:text-white"
                                >
                                    <ClipboardPaste className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Panodan Yapıştır
                                </Button>
                                {editText && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        type="button"
                                        onClick={() => setEditText('')}
                                        className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                                    >
                                        <Eraser className="w-3.5 h-3.5 mr-1" /> Temizle
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Ders kitabı konusunu veya detaylı kaynak metni buraya yapıştırın ya da yazın..."
                            className="min-h-[320px] sm:min-h-[380px] bg-slate-950 border-white/10 text-white font-sans text-sm leading-relaxed p-4 rounded-xl focus:border-indigo-500 resize-y flex-grow"
                        />
                    </div>

                    <DialogFooter className="border-t border-white/5 pt-3 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setEditingTopic(null)}
                            disabled={isSaving}
                            className="border-white/10 text-slate-300 hover:bg-white/5"
                        >
                            Vazgeç
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 shadow-lg shadow-indigo-900/30"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-1.5" /> Kaydet
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══ OKUMA / İNCELEME MODALI ══ */}
            <Dialog open={!!readingTopic} onOpenChange={(open) => !open && setReadingTopic(null)}>
                <DialogContent className="max-w-3xl bg-slate-900 border-white/10 text-white max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                                    {readingTopic?.className}
                                </Badge>
                                <span className="text-xs text-slate-400">›</span>
                                <span className="text-xs text-slate-400">{readingTopic?.unitTitle}</span>
                            </div>

                            {/* Yazı Boyutu Ayarları */}
                            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-white/10">
                                <button
                                    onClick={() => setReaderFontSize('sm')}
                                    className={cn("px-2 py-0.5 rounded text-xs font-bold", readerFontSize === 'sm' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    A-
                                </button>
                                <button
                                    onClick={() => setReaderFontSize('base')}
                                    className={cn("px-2 py-0.5 rounded text-xs font-bold", readerFontSize === 'base' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    A
                                </button>
                                <button
                                    onClick={() => setReaderFontSize('lg')}
                                    className={cn("px-2 py-0.5 rounded text-xs font-bold", readerFontSize === 'lg' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    A+
                                </button>
                                <button
                                    onClick={() => setReaderFontSize('xl')}
                                    className={cn("px-2 py-0.5 rounded text-xs font-bold", readerFontSize === 'xl' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    A++
                                </button>
                            </div>
                        </div>

                        <DialogTitle className="text-xl font-black text-white pt-2">
                            {readingTopic?.title}
                        </DialogTitle>
                        <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                            <span>{readingTopic?.wordCount} kelime</span>
                            <span>•</span>
                            <span>{readingTopic?.charCount.toLocaleString('tr-TR')} karakter</span>
                            <span>•</span>
                            <span>Tahmini Okuma: ~{Math.ceil((readingTopic?.wordCount || 0) / 180)} dk</span>
                        </div>
                    </DialogHeader>

                    {/* Metin Okuma Alanı */}
                    <div className="flex-grow overflow-y-auto pr-2 py-4 my-2 border-y border-white/5 bg-slate-950/60 rounded-xl p-5 shadow-inner">
                        <div className={cn(
                            "leading-relaxed whitespace-pre-wrap font-sans text-slate-200 selection:bg-indigo-500/30",
                            readerFontSize === 'sm' && "text-sm",
                            readerFontSize === 'base' && "text-base",
                            readerFontSize === 'lg' && "text-lg",
                            readerFontSize === 'xl' && "text-xl"
                        )}>
                            {readingTopic?.sourceText}
                        </div>
                    </div>

                    <DialogFooter className="pt-2 flex items-center justify-between gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => readingTopic && handleCopy(readingTopic.id, readingTopic.sourceText)}
                            className="border-white/10 text-slate-300 hover:text-white"
                        >
                            <Copy className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Metni Kopyala
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReadingTopic(null)}
                                className="border-white/10 text-slate-300 hover:bg-white/5"
                            >
                                Kapat
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    const t = readingTopic;
                                    setReadingTopic(null);
                                    if (t) handleOpenEdit(t);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                            >
                                <FilePenLine className="w-3.5 h-3.5 mr-1.5" /> Düzenle
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
