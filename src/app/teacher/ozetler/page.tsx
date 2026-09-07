'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
    LayoutTemplate, BookOpen, Search, Home, ArrowLeft,
    Trash2, Copy, Check, Eye, Sparkles, Loader2, Layers,
    FileText, AlertCircle, ChevronRight, ChevronLeft, X,
    RefreshCw, GraduationCap, Maximize2, Minimize2, Plus,
    Minus, Wand2, MonitorPlay, Code2, BookmarkCheck, CheckCircle2,
    SlidersHorizontal, ArrowUpDown, BookMarked, Sparkle
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
    loadAllOzetlerData, 
    saveOzetContent, 
    clearOzetContent, 
    generateOzetWithAi, 
    type OzetItem 
} from './actions';

export default function OzetlerManagementPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [items, setItems] = useState<OzetItem[]>([]);

    // Filters & Selection (Miller Columns: Grade -> Course -> Unit -> Item)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGrade, setSelectedGrade] = useState<string>('5');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'has_ozet' | 'missing_ozet'>('all');

    // Focused Miller Column
    const [focusedColumn, setFocusedColumn] = useState<'grade' | 'course' | 'unit' | 'item'>('item');

    // Reader Pane State
    const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'source'>('preview');
    const [zoomLevel, setZoomLevel] = useState<number>(1.0);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const readerContainerRef = useRef<HTMLDivElement>(null);

    // Editor Modal State
    const [editingItem, setEditingItem] = useState<OzetItem | null>(null);
    const [editText, setEditText] = useState('');
    const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Fullscreen event listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Load Data
    const loadData = async (showToast = false) => {
        setIsLoading(true);
        try {
            const res = await loadAllOzetlerData();
            if (res.success && res.items) {
                setItems(res.items);
                if (showToast) {
                    toast({ title: "Veriler Güncellendi", description: "Tüm ünite ve konu özetleri başarıyla yüklendi." });
                }
            } else {
                toast({ title: "Hata", description: res.error || "Özetler yüklenemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            console.error("loadData error:", err);
            toast({ title: "Hata", description: err.message || "Veri yüklenirken hata oluştu.", variant: "destructive" });
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
        const total = items.length;
        const withOzet = items.filter(i => i.hasOzet).length;
        const withoutOzet = total - withOzet;
        const unitItems = items.filter(i => i.type === 'unit');
        const unitWithOzet = unitItems.filter(i => i.hasOzet).length;
        const topicItems = items.filter(i => i.type === 'topic');
        const topicWithOzet = topicItems.filter(i => i.hasOzet).length;
        const totalWords = items.reduce((acc, i) => acc + (i.wordCount || 0), 0);
        return {
            total,
            withOzet,
            withoutOzet,
            unitTotal: unitItems.length,
            unitWithOzet,
            topicTotal: topicItems.length,
            topicWithOzet,
            totalWords
        };
    }, [items]);

    // Available Grades
    const availableGrades = useMemo(() => {
        const grades = new Set<string>();
        items.forEach(i => { if (i.grade) grades.add(i.grade); });
        return Array.from(grades).sort((a, b) => Number(a) - Number(b));
    }, [items]);

    // Available Courses for selectedGrade
    const availableCourses = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number }>();
        items.forEach(i => {
            if (i.grade !== selectedGrade) return;
            if (!i.courseId) return;
            const existing = map.get(i.courseId);
            if (existing) {
                existing.count++;
            } else {
                map.set(i.courseId, {
                    id: i.courseId,
                    title: i.courseTitle,
                    count: 1
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    }, [items, selectedGrade]);

    // Available Units for selectedGrade + selectedCourseId
    const availableUnits = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number; hasUnitOzet: boolean }>();
        items.forEach(i => {
            if (i.grade !== selectedGrade) return;
            if (i.courseId !== selectedCourseId) return;
            if (!i.unitId) return;
            const existing = map.get(i.unitId);
            if (existing) {
                existing.count++;
                if (i.type === 'unit' && i.hasOzet) existing.hasUnitOzet = true;
            } else {
                map.set(i.unitId, {
                    id: i.unitId,
                    title: i.unitTitle || 'Ünite',
                    count: 1,
                    hasUnitOzet: i.type === 'unit' ? i.hasOzet : false
                });
            }
        });
        return Array.from(map.values());
    }, [items, selectedGrade, selectedCourseId]);

    // Available Items for selectedGrade + selectedCourseId + selectedUnitId
    const currentUnitItems = useMemo(() => {
        return items.filter(i => 
            i.grade === selectedGrade && 
            i.courseId === selectedCourseId && 
            i.unitId === selectedUnitId
        );
    }, [items, selectedGrade, selectedCourseId, selectedUnitId]);

    // Pinned Unit Summary
    const unitSummaryItem = useMemo(() => {
        return currentUnitItems.find(i => i.type === 'unit') || null;
    }, [currentUnitItems]);

    // Topic Summaries in current unit
    const topicSummaryItems = useMemo(() => {
        const list = currentUnitItems.filter(i => i.type === 'topic');
        if (filterStatus === 'has_ozet') return list.filter(t => t.hasOzet);
        if (filterStatus === 'missing_ozet') return list.filter(t => !t.hasOzet);
        return list;
    }, [currentUnitItems, filterStatus]);

    // Auto-selection synchronization
    useEffect(() => {
        if (items.length === 0) return;

        // 1. Sınıf kontrolü
        let currentGrade = selectedGrade;
        if (!currentGrade || !availableGrades.includes(currentGrade)) {
            currentGrade = availableGrades[0] || '5';
            setSelectedGrade(currentGrade);
        }

        // 2. Ders kontrolü
        const gradeItems = items.filter(i => i.grade === currentGrade);
        const validCourseIds = Array.from(new Set(gradeItems.map(i => i.courseId)));
        let currentCourse = selectedCourseId;
        if (!currentCourse || !validCourseIds.includes(currentCourse)) {
            currentCourse = validCourseIds[0] || '';
            setSelectedCourseId(currentCourse);
        }

        // 3. Ünite kontrolü
        const courseItems = gradeItems.filter(i => i.courseId === currentCourse);
        const validUnitIds = Array.from(new Set(courseItems.map(i => i.unitId)));
        let currentUnit = selectedUnitId;
        if (!currentUnit || !validUnitIds.includes(currentUnit)) {
            currentUnit = validUnitIds[0] || '';
            setSelectedUnitId(currentUnit);
        }

        // 4. İçerik (Ünite Özeti veya Konu) kontrolü
        const unitContent = courseItems.filter(i => i.unitId === currentUnit);
        const validItemIds = unitContent.map(i => i.id);
        let currentItem = selectedItemId;
        if (!currentItem || !validItemIds.includes(currentItem)) {
            const unitSummary = unitContent.find(i => i.type === 'unit');
            currentItem = unitSummary ? unitSummary.id : (unitContent[0]?.id || '');
            setSelectedItemId(currentItem);
        }
    }, [items, availableGrades, selectedGrade, selectedCourseId, selectedUnitId, selectedItemId]);

    // Cascading Handlers
    const handleGradeChange = (grade: string) => {
        setSelectedGrade(grade);
        const gradeItems = items.filter(i => i.grade === grade);
        const firstCourse = gradeItems[0]?.courseId || '';
        setSelectedCourseId(firstCourse);

        const courseItems = gradeItems.filter(i => i.courseId === firstCourse);
        const firstUnit = courseItems[0]?.unitId || '';
        setSelectedUnitId(firstUnit);

        const unitContent = courseItems.filter(i => i.unitId === firstUnit);
        const unitSummary = unitContent.find(i => i.type === 'unit');
        setSelectedItemId(unitSummary ? unitSummary.id : (unitContent[0]?.id || ''));
        setFocusedColumn('course');
    };

    const handleCourseChange = (courseId: string) => {
        setSelectedCourseId(courseId);
        const courseItems = items.filter(i => i.grade === selectedGrade && i.courseId === courseId);
        const firstUnit = courseItems[0]?.unitId || '';
        setSelectedUnitId(firstUnit);

        const unitContent = courseItems.filter(i => i.unitId === firstUnit);
        const unitSummary = unitContent.find(i => i.type === 'unit');
        setSelectedItemId(unitSummary ? unitSummary.id : (unitContent[0]?.id || ''));
        setFocusedColumn('unit');
    };

    const handleUnitChange = (unitId: string) => {
        setSelectedUnitId(unitId);
        const unitContent = items.filter(i => i.grade === selectedGrade && i.courseId === selectedCourseId && i.unitId === unitId);
        const unitSummary = unitContent.find(i => i.type === 'unit');
        setSelectedItemId(unitSummary ? unitSummary.id : (unitContent[0]?.id || ''));
        setFocusedColumn('item');
    };

    const handleItemChange = (itemId: string) => {
        setSelectedItemId(itemId);
        setFocusedColumn('item');
    };

    // Active Selection Objects
    const activeSelectedCourse = useMemo(() => {
        return availableCourses.find(c => c.id === selectedCourseId)?.title || 'Ders';
    }, [availableCourses, selectedCourseId]);

    const activeSelectedUnit = useMemo(() => {
        return availableUnits.find(u => u.id === selectedUnitId)?.title || 'Ünite';
    }, [availableUnits, selectedUnitId]);

    const activeSelectedItem = useMemo(() => {
        return currentUnitItems.find(i => i.id === selectedItemId) || currentUnitItems[0] || null;
    }, [currentUnitItems, selectedItemId]);

    // Sequential Navigation within Unit (Ünite Özeti -> 1. Konu -> 2. Konu ...)
    const orderedUnitItems = useMemo(() => {
        const res: OzetItem[] = [];
        if (unitSummaryItem) res.push(unitSummaryItem);
        currentUnitItems.filter(i => i.type === 'topic').forEach(t => res.push(t));
        return res;
    }, [unitSummaryItem, currentUnitItems]);

    const currentIndex = useMemo(() => {
        return orderedUnitItems.findIndex(i => i.id === selectedItemId);
    }, [orderedUnitItems, selectedItemId]);

    const prevItem = currentIndex > 0 ? orderedUnitItems[currentIndex - 1] : null;
    const nextItem = currentIndex >= 0 && currentIndex < orderedUnitItems.length - 1 ? orderedUnitItems[currentIndex + 1] : null;

    // Global Search Matches
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return items.filter(i => 
            (i.title || '').toLowerCase().includes(q) ||
            (i.unitTitle || '').toLowerCase().includes(q) ||
            (i.courseTitle || '').toLowerCase().includes(q) ||
            (i.className || '').toLowerCase().includes(q) ||
            (i.htmlContent || '').toLowerCase().includes(q)
        ).slice(0, 12);
    }, [items, searchQuery]);

    const handleSelectSearchResult = (item: OzetItem) => {
        setSelectedGrade(item.grade);
        setSelectedCourseId(item.courseId);
        setSelectedUnitId(item.unitId);
        setSelectedItemId(item.id);
        setFocusedColumn('item');
        setSearchQuery('');
    };

    // Copy to Clipboard
    const handleCopy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast({ title: "Kopyalandı", description: "Özet HTML içeriği panoya kopyalandı." });
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast({ title: "Hata", description: "Panoya kopyalanamadı.", variant: "destructive" });
        }
    };

    // Open Editor Dialog
    const handleOpenEdit = (item: OzetItem) => {
        setEditingItem(item);
        setEditText(item.htmlContent || '');
        setEditorTab('edit');
    };

    // Save Editor Action
    const handleSaveEdit = async () => {
        if (!editingItem) return;
        setIsSaving(true);
        try {
            const res = await saveOzetContent(
                editingItem.courseId,
                editingItem.unitId,
                editingItem.topicId,
                editText
            );

            if (res.success) {
                const trimmed = editText.trim();
                setItems(prev => prev.map(i => {
                    if (i.id === editingItem.id) {
                        return {
                            ...i,
                            htmlContent: trimmed,
                            wordCount: res.wordCount,
                            charCount: trimmed.length,
                            hasOzet: trimmed.length > 0
                        };
                    }
                    return i;
                }));

                toast({ 
                    title: "Kayıt Başarılı! 🎉", 
                    description: `${editingItem.title} özeti hem yerel dosyalara hem de veritabanına kaydedildi.` 
                });
                setEditingItem(null);
            } else {
                toast({ title: "Kayıt Hatası", description: res.error || "Özet kaydedilemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message || "İşlem sırasında hata oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // Clear Summary Action
    const handleClearOzet = async (item: OzetItem) => {
        try {
            const res = await clearOzetContent(item.courseId, item.unitId, item.topicId);
            if (res.success) {
                setItems(prev => prev.map(i => {
                    if (i.id === item.id) {
                        return {
                            ...i,
                            htmlContent: '',
                            wordCount: 0,
                            charCount: 0,
                            hasOzet: false
                        };
                    }
                    return i;
                }));
                toast({ title: "Temizlendi", description: `${item.title} özeti başarıyla sıfırlandı.` });
            } else {
                toast({ title: "Hata", description: res.error || "Özet silinemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message, variant: "destructive" });
        }
    };

    // AI Generate Summary Action
    const handleAiGenerate = async (item: OzetItem) => {
        setIsGeneratingAi(true);
        try {
            toast({ 
                title: "Yapay Zeka Hazırlanıyor... ✨", 
                description: `${item.title} için pedagojik ve interaktif HTML özet üretiliyor...` 
            });

            const unitTopics = items.filter(i => i.unitId === item.unitId && i.type === 'topic').map(t => t.title);

            const res = await generateOzetWithAi({
                title: item.title,
                type: item.type,
                sourceText: item.sourceText,
                grade: item.grade,
                courseTitle: item.courseTitle,
                unitTitle: item.unitTitle,
                topicTitles: unitTopics
            });

            if (res.success && res.htmlContent) {
                setEditingItem(item);
                setEditText(res.htmlContent);
                setEditorTab('preview');
                toast({ 
                    title: "Özet Üretildi! 🌟", 
                    description: "Üretilen özeti önizleyin ve kaydetmek için 'Değişiklikleri Kaydet' butonuna basın." 
                });
            } else {
                toast({ title: "Üretim Başarısız", description: res.error || "Yapay zeka yanıt vermedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message, variant: "destructive" });
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // Quick Template Inserter in Editor
    const insertTemplate = (templateType: 'heading' | 'callout' | 'ayah' | 'hadith' | 'concept' | 'points') => {
        let snippet = '';
        switch (templateType) {
            case 'heading':
                snippet = '\n<div class="my-6 border-b border-indigo-200 pb-2">\n  <h2 class="text-2xl font-black text-indigo-900">📌 Yeni Başlık</h2>\n</div>\n';
                break;
            case 'callout':
                snippet = '\n<div class="my-4 p-5 rounded-2xl bg-amber-50 border-l-4 border-amber-500 shadow-sm">\n  <h4 class="font-bold text-amber-900 mb-1">💡 Dikkat Edelim!</h4>\n  <p class="text-amber-800 text-sm">Buraya önemli not veya sınav ipucu metnini girin.</p>\n</div>\n';
                break;
            case 'ayah':
                snippet = '\n<div class="my-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">\n  <p class="text-xl font-arabic text-emerald-950 text-right leading-relaxed mb-2" dir="rtl">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ</p>\n  <p class="text-sm font-semibold text-emerald-800 italic">"Rahman ve Rahim olan Allah\'ın adıyla."</p>\n  <span class="block text-xs text-emerald-600 mt-1 font-bold">Kaynak / Sure Adı</span>\n</div>\n';
                break;
            case 'hadith':
                snippet = '\n<div class="my-4 p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm">\n  <h4 class="font-bold text-rose-900 mb-2 flex items-center gap-2">💬 Peygamber Efendimiz (s.a.v.) Buyurdu ki:</h4>\n  <p class="text-rose-950 font-medium italic">"Buraya hadis metnini giriniz."</p>\n  <span class="block text-xs text-rose-600 mt-1 font-bold">(Hadis Kaynağı)</span>\n</div>\n';
                break;
            case 'concept':
                snippet = '\n<div class="my-4 p-4 rounded-xl bg-indigo-50/80 border border-indigo-200">\n  <span class="font-black text-indigo-900 uppercase tracking-wider text-xs">Kavram:</span>\n  <h4 class="font-bold text-lg text-indigo-950">Kavram Adı</h4>\n  <p class="text-slate-700 text-sm mt-1">Kavramın MEB ders kitabı tanımı buraya yazılır.</p>\n</div>\n';
                break;
            case 'points':
                snippet = '\n<ul class="my-4 space-y-2">\n  <li class="flex items-start gap-2 text-slate-800"><span class="text-emerald-500 font-bold">✔</span> Birinci önemli kazanım ve madde.</li>\n  <li class="flex items-start gap-2 text-slate-800"><span class="text-emerald-500 font-bold">✔</span> İkinci önemli kazanım ve madde.</li>\n  <li class="flex items-start gap-2 text-slate-800"><span class="text-emerald-500 font-bold">✔</span> Üçüncü önemli kazanım ve madde.</li>\n</ul>\n';
                break;
        }
        setEditText(prev => prev + snippet);
    };

    // Fullscreen Smartboard URL for active item
    const smartboardUrl = useMemo(() => {
        if (!activeSelectedItem) return '#';
        if (activeSelectedItem.type === 'unit') {
            return `/teacher/smartboard/ozetler/goruntule/${activeSelectedItem.courseId}/${activeSelectedItem.unitId}`;
        }
        return `/teacher/smartboard/ozetler/goruntule/${activeSelectedItem.courseId}/${activeSelectedItem.unitId}/${activeSelectedItem.targetId}`;
    }, [activeSelectedItem]);

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 px-2 sm:px-4 md:px-6 py-4 md:py-6 relative overflow-x-hidden">
            {/* Arka Plan Atmosfer Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[900px] h-[900px] bg-purple-900/15 rounded-full blur-[160px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-rose-900/15 rounded-full blur-[160px]" />
                <div className="absolute top-[40%] right-[30%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[180px]" />
            </div>

            <div className="w-full relative z-10 space-y-6">

                {/* ══ ÜST GEZİNME VE BUTONLAR ══ */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 bg-slate-900/60 backdrop-blur-md rounded-xl h-11 px-5 shadow-lg">
                            <Link href="/">
                                <Home className="mr-2 h-5 w-5 text-purple-400" /> Ana Sayfa
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-11 px-4">
                            <Link href="/teacher">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Öğretmen Paneli
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="border-indigo-500/30 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50 hover:text-white rounded-xl h-11 px-4 hidden sm:flex">
                            <Link href="/teacher/source-texts">
                                <BookOpen className="mr-2 h-4 w-4 text-indigo-400" /> Kaynak Metinler
                            </Link>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            asChild
                            className="bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white rounded-xl h-11 px-5 font-bold shadow-lg shadow-rose-950/40"
                        >
                            <Link href="/teacher/smartboard">
                                <MonitorPlay className="mr-2 h-5 w-5" /> Akıllı Tahta Menüsü
                            </Link>
                        </Button>

                        <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isRefreshing || isLoading}
                            onClick={() => { setIsRefreshing(true); loadData(true); }}
                            className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-11 px-4"
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin text-purple-400")} />
                            Yenile
                        </Button>
                    </div>
                </div>

                {/* ══ BAŞLIK VE AÇIKLAMA ══ */}
                <div className="text-center space-y-4 py-3">
                    <div className="inline-flex items-center justify-center p-4 bg-slate-900 border border-purple-500/20 rounded-3xl shadow-2xl shadow-purple-950/50 mb-1">
                        <LayoutTemplate className="h-10 w-10 text-purple-400" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow-lg flex items-center justify-center gap-3">
                        Özet Kütüphanesi & Sunum Yönetimi
                        <Badge className="bg-gradient-to-r from-purple-500/20 to-rose-500/20 text-purple-300 border-purple-500/30 text-xs font-bold px-3 py-1">
                            ÜNİTE & KONU ÖZETLERİ
                        </Badge>
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto font-medium">
                        Akıllı tahtada sunulan, ders tekrarlarında kullanılan tüm <strong className="text-purple-300">Ünite Özetleri</strong> ve <strong className="text-indigo-300">Konu Özetleri</strong>ni tek bir merkezden görüntüleyin, AI ile üretin ve yönetin.
                    </p>
                </div>

                {/* ══ İSTATİSTİK KARTLARI ══ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                            <Layers className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Toplam İçerik</p>
                            <p className="text-2xl font-black text-white">{stats.total} <span className="text-xs font-normal text-slate-500">(Ünite + Konu)</span></p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Özeti Hazır</p>
                            <p className="text-2xl font-black text-emerald-400">{stats.withOzet}</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-rose-500/20 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                            <BookmarkCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-rose-300 font-bold uppercase tracking-wider">Ünite Özetleri</p>
                            <p className="text-2xl font-black text-rose-400">{stats.unitWithOzet} <span className="text-xs font-normal text-slate-500">/ {stats.unitTotal} Hazır</span></p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-amber-500/20 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">Özet Bekleyen</p>
                            <p className="text-2xl font-black text-amber-400">{stats.withoutOzet}</p>
                        </div>
                    </div>
                </div>

                {/* ══ HIZLI ARAMA ÇUBUĞU ══ */}
                <div className="relative z-30">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Özetlerde ara... (Ünite özeti, konu adı, sınıf, ders veya özet içeriği)"
                            className="pl-12 pr-10 h-13 bg-slate-900/90 border-white/10 text-base text-white placeholder:text-slate-500 rounded-2xl shadow-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 backdrop-blur-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                title="Aramayı temizle"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Canlı Arama Sonuçları */}
                    {searchQuery.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl max-h-80 overflow-y-auto p-2 space-y-1 z-50 divide-y divide-white/5">
                            <div className="p-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Arama Sonuçları ({searchResults.length})</span>
                                <span className="text-slate-500 font-normal">Tıklayarak doğrudan özete gidin</span>
                            </div>
                            {searchResults.length === 0 ? (
                                <div className="p-6 text-center text-sm text-slate-400">
                                    "{searchQuery}" ile eşleşen özet bulunamadı.
                                </div>
                            ) : (
                                searchResults.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelectSearchResult(item)}
                                        className="w-full text-left p-3 rounded-xl hover:bg-slate-800/80 transition-all flex items-center justify-between gap-3 group"
                                    >
                                        <div className="space-y-1 truncate">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {item.type === 'unit' ? (
                                                    <Badge className="text-[10px] bg-gradient-to-r from-purple-600 to-rose-600 text-white font-bold">
                                                        ⭐ ÜNİTE ÖZETİ
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                                                        KONU ÖZETİ
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                                                    {item.className}
                                                </Badge>
                                                <span className="text-[11px] text-slate-400 truncate">{item.courseTitle}</span>
                                            </div>
                                            <p className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                                                {item.title}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {item.hasOzet ? (
                                                <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                    {item.wordCount} kelime
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                                    Özet Yok
                                                </span>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* ══ MILLER COLUMNS ÖZET GEZGİNİ & İNTERAKTİF OKUYUCU ══ */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 2xl:gap-6 items-start w-full">
                    
                    {/* ── SOL BÖLÜM: 4 KADEMELİ ÖZET FİHRİSTİ (MILLER COLUMNS) ── */}
                    <div className="xl:col-span-5 2xl:col-span-5 flex flex-col h-[780px] xl:h-[840px] rounded-3xl bg-slate-900/75 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
                        {/* Fihrist Üst Başlık Barı */}
                        <div className="p-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutTemplate className="w-5 h-5 text-purple-400" />
                                <span className="font-bold text-sm text-white">Müfredat & Özet Fihristi</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                                <button 
                                    onClick={() => setFocusedColumn('grade')}
                                    className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'grade' ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-white")}
                                >
                                    Sınıf
                                </button>
                                <span>›</span>
                                <button 
                                    onClick={() => setFocusedColumn('course')}
                                    className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'course' ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-white")}
                                >
                                    Ders
                                </button>
                                <span>›</span>
                                <button 
                                    onClick={() => setFocusedColumn('unit')}
                                    className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'unit' ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-white")}
                                >
                                    Ünite
                                </button>
                                <span>›</span>
                                <button 
                                    onClick={() => setFocusedColumn('item')}
                                    className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'item' ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-white")}
                                >
                                    Özetler
                                </button>
                            </div>
                        </div>

                        {/* 4 Kademeli Kolon Konteyneri */}
                        <div className="flex flex-1 flex-row overflow-x-auto overflow-y-hidden divide-x divide-white/10 select-none">
                            
                            {/* ── KOLON 1: SINIFLAR ── */}
                            {focusedColumn === 'grade' ? (
                                <div className="flex-1 min-w-[190px] bg-slate-900/40 flex flex-col transition-all duration-300">
                                    <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                                        <div className="flex items-center gap-2">
                                            <GraduationCap className="w-4 h-4 text-purple-400" />
                                            <span className="text-xs font-bold text-slate-200">Sınıf Seviyesi</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500">{availableGrades.length} Seviye</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
                                        {availableGrades.map(grade => {
                                            const isSelected = selectedGrade === grade;
                                            const count = items.filter(i => i.grade === grade).length;
                                            return (
                                                <button
                                                    key={grade}
                                                    onClick={() => {
                                                        handleGradeChange(grade);
                                                        setFocusedColumn('course');
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-3.5 rounded-2xl transition-all flex items-center justify-between group",
                                                        isSelected
                                                            ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50 font-bold"
                                                            : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm", isSelected ? "bg-purple-700 text-white" : "bg-white/5 text-purple-400")}>
                                                            {grade}
                                                        </div>
                                                        <span>{grade}. Sınıf</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn("text-xs font-mono px-2 py-0.5 rounded-lg", isSelected ? "bg-purple-700/80 text-white" : "bg-white/5 text-slate-400")}>
                                                            {count}
                                                        </span>
                                                        <ChevronRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", isSelected ? "text-white" : "text-slate-600")} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => setFocusedColumn('grade')}
                                    title="Sınıfları genişletmek için tıklayın"
                                    className="w-14 sm:w-16 flex-shrink-0 bg-slate-950/70 hover:bg-slate-900/90 transition-all duration-300 flex flex-col items-center py-3 cursor-pointer group"
                                >
                                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 mb-2 group-hover:scale-110 transition-transform">
                                        <GraduationCap className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider group-hover:text-purple-400 mb-3">
                                        Sınıf
                                    </span>
                                    <div className="flex flex-col gap-2 items-center">
                                        {availableGrades.map(grade => {
                                            const isSelected = selectedGrade === grade;
                                            return (
                                                <button
                                                    key={grade}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleGradeChange(grade);
                                                        setFocusedColumn('course');
                                                    }}
                                                    title={`${grade}. Sınıf`}
                                                    className={cn(
                                                        "w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center transition-all",
                                                        isSelected
                                                            ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50 ring-2 ring-purple-400/50 scale-105"
                                                            : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                                                    )}
                                                >
                                                    {grade}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── KOLON 2: DERSLER ── */}
                            {focusedColumn === 'course' ? (
                                <div className="flex-1 min-w-[200px] bg-slate-900/40 flex flex-col transition-all duration-300">
                                    <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-indigo-400" />
                                            <span className="text-xs font-bold text-slate-200">{selectedGrade}. Sınıf Dersleri</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500">{availableCourses.length} Ders</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
                                        {availableCourses.map(course => {
                                            const isSelected = selectedCourseId === course.id;
                                            return (
                                                <button
                                                    key={course.id}
                                                    onClick={() => {
                                                        handleCourseChange(course.id);
                                                        setFocusedColumn('unit');
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-3.5 rounded-2xl transition-all flex items-center justify-between group",
                                                        isSelected
                                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-bold"
                                                            : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                        <BookOpen className={cn("w-4 h-4 flex-shrink-0", isSelected ? "text-white" : "text-indigo-400")} />
                                                        <span className="text-xs font-semibold leading-snug break-words">{course.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <span className={cn("text-xs font-mono px-2 py-0.5 rounded-lg", isSelected ? "bg-indigo-700/80 text-white" : "bg-white/5 text-slate-400")}>
                                                            {course.count}
                                                        </span>
                                                        <ChevronRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", isSelected ? "text-white" : "text-slate-600")} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => setFocusedColumn('course')}
                                    title="Dersleri genişletmek için tıklayın"
                                    className="w-28 sm:w-36 flex-shrink-0 bg-slate-950/70 hover:bg-slate-900/90 transition-all duration-300 flex flex-col items-center py-3 cursor-pointer group"
                                >
                                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider group-hover:text-indigo-400 mb-3">
                                        Ders
                                    </span>
                                    <div className="flex flex-col gap-2 w-full px-2">
                                        {availableCourses.map(course => {
                                            const isSelected = selectedCourseId === course.id;
                                            return (
                                                <button
                                                    key={course.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCourseChange(course.id);
                                                        setFocusedColumn('unit');
                                                    }}
                                                    title={course.title}
                                                    className={cn(
                                                        "w-full min-h-[44px] py-2 px-2 rounded-xl font-bold text-[10px] sm:text-[11px] leading-tight flex items-center justify-center text-center transition-all",
                                                        isSelected
                                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 ring-2 ring-indigo-400/50 scale-[1.02]"
                                                            : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5"
                                                    )}
                                                >
                                                    {course.title}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── KOLON 3: ÜNİTELER ── */}
                            {focusedColumn === 'unit' ? (
                                <div className="flex-1 min-w-[220px] bg-slate-900/40 flex flex-col transition-all duration-300">
                                    <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                                        <div className="flex items-center gap-2 truncate">
                                            <Layers className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                            <span className="text-xs font-bold text-slate-200 truncate">{activeSelectedCourse} Üniteleri</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{availableUnits.length} Ünite</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
                                        {availableUnits.map(unit => {
                                            const isSelected = selectedUnitId === unit.id;
                                            return (
                                                <button
                                                    key={unit.id}
                                                    onClick={() => {
                                                        handleUnitChange(unit.id);
                                                        setFocusedColumn('item');
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-3.5 rounded-2xl transition-all flex items-center justify-between group",
                                                        isSelected
                                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-bold"
                                                            : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 truncate">
                                                        <Layers className={cn("w-4 h-4 flex-shrink-0", isSelected ? "text-white" : "text-blue-400")} />
                                                        <span className="truncate text-xs font-semibold">{unit.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        {unit.hasUnitOzet && (
                                                            <span className="w-2 h-2 rounded-full bg-rose-400" title="Ünite Özeti Hazır" />
                                                        )}
                                                        <ChevronRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", isSelected ? "text-white" : "text-slate-600")} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => setFocusedColumn('unit')}
                                    title="Üniteleri genişletmek için tıklayın"
                                    className="w-16 sm:w-20 flex-shrink-0 bg-slate-950/70 hover:bg-slate-900/90 transition-all duration-300 flex flex-col items-center py-3 cursor-pointer group"
                                >
                                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 mb-2 group-hover:scale-110 transition-transform">
                                        <Layers className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider group-hover:text-blue-400 mb-3">
                                        Ünite
                                    </span>
                                    <div className="flex flex-col gap-1.5 items-center overflow-y-auto max-h-[580px] scrollbar-none">
                                        {availableUnits.map((unit, idx) => {
                                            const isSelected = selectedUnitId === unit.id;
                                            return (
                                                <button
                                                    key={unit.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUnitChange(unit.id);
                                                        setFocusedColumn('item');
                                                    }}
                                                    title={unit.title}
                                                    className={cn(
                                                        "w-11 sm:w-14 h-7 rounded-lg font-bold text-[11px] flex items-center justify-center transition-all truncate px-1",
                                                        isSelected
                                                            ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400/50 scale-105"
                                                            : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                                                    )}
                                                >
                                                    {idx + 1}.Ün
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── KOLON 4: ÖZETLER (ÜNİTE ÖZETİ PINNED + KONU ÖZETLERİ) ── */}
                            <div className="flex-1 min-w-[250px] bg-slate-900/40 flex flex-col transition-all duration-300">
                                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                                    <div className="flex items-center gap-2 truncate">
                                        <LayoutTemplate className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <span className="text-xs font-bold text-slate-200 truncate">{activeSelectedUnit}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setFilterStatus(s => s === 'all' ? 'has_ozet' : s === 'has_ozet' ? 'missing_ozet' : 'all')}
                                            className={cn(
                                                "text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-colors",
                                                filterStatus === 'all' ? "bg-white/5 border-white/10 text-slate-400" :
                                                filterStatus === 'has_ozet' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300 font-bold" :
                                                "bg-amber-500/20 border-amber-500/30 text-amber-300 font-bold"
                                            )}
                                            title="Filtrele (Tümü / Özeti Olanlar / Özet Bekleyenler)"
                                        >
                                            {filterStatus === 'all' ? 'Tümü' : filterStatus === 'has_ozet' ? 'Özeti Olan' : 'Özet Yok'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin">
                                    {/* 🌟 1. EN TEPEDE SABİTLENMİŞ ÜNİTE ÖZETİ (UNIT SUMMARY) */}
                                    {unitSummaryItem && (
                                        <div className="space-y-1">
                                            <button
                                                onClick={() => handleItemChange(unitSummaryItem.id)}
                                                className={cn(
                                                    "w-full text-left p-3.5 rounded-2xl transition-all flex flex-col gap-2 group border relative overflow-hidden",
                                                    selectedItemId === unitSummaryItem.id
                                                        ? "bg-gradient-to-br from-purple-600 to-rose-600 text-white shadow-xl shadow-purple-950/70 border-purple-400/80 font-bold"
                                                        : "bg-gradient-to-br from-purple-950/40 to-slate-900/60 hover:from-purple-900/50 hover:to-slate-800 text-slate-200 border-purple-500/30 shadow-md"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={cn(
                                                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5",
                                                            selectedItemId === unitSummaryItem.id
                                                                ? "bg-white/20 text-white border-white/30"
                                                                : "bg-purple-500/20 text-purple-300 border-purple-400/30"
                                                        )}>
                                                            ⭐ ÜNİTE ÖZETİ
                                                        </Badge>
                                                    </div>
                                                    {selectedItemId === unitSummaryItem.id && (
                                                        <ChevronRight className="w-4 h-4 flex-shrink-0 text-white" />
                                                    )}
                                                </div>

                                                <p className="text-xs font-extrabold line-clamp-2 leading-snug">
                                                    {activeSelectedUnit} Genel Özeti
                                                </p>

                                                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/10">
                                                    <span className={cn(
                                                        "text-[10px] font-bold",
                                                        selectedItemId === unitSummaryItem.id ? "text-purple-100" : "text-purple-400"
                                                    )}>
                                                        Tüm Ünite Tekrarı
                                                    </span>
                                                    {unitSummaryItem.hasOzet ? (
                                                        <span className={cn(
                                                            "font-mono text-[10px] px-1.5 py-0.5 rounded font-bold",
                                                            selectedItemId === unitSummaryItem.id ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-300"
                                                        )}>
                                                            {unitSummaryItem.wordCount} kelime
                                                        </span>
                                                    ) : (
                                                        <span className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded",
                                                            selectedItemId === unitSummaryItem.id ? "text-rose-100" : "text-amber-400/80 bg-amber-500/10"
                                                        )}>
                                                            Özet Yok
                                                        </span>
                                                    )}
                                                </div>
                                            </button>

                                            {/* Ayrım Çizgisi */}
                                            <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                <div className="h-px flex-1 bg-white/10" />
                                                <span>Konu Özetleri ({topicSummaryItems.length})</span>
                                                <div className="h-px flex-1 bg-white/10" />
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. KONU ÖZETLERİ (TOPIC SUMMARIES) */}
                                    {topicSummaryItems.map((topic, idx) => {
                                        const isSelected = selectedItemId === topic.id;
                                        return (
                                            <button
                                                key={topic.id}
                                                onClick={() => handleItemChange(topic.id)}
                                                className={cn(
                                                    "w-full text-left p-3.5 rounded-2xl transition-all flex flex-col gap-1.5 group border",
                                                    isSelected
                                                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-950/60 border-indigo-400/60 font-bold"
                                                        : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border-white/5"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span 
                                                            className={cn(
                                                                "w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5",
                                                                topic.hasOzet ? (isSelected ? "bg-emerald-300" : "bg-emerald-400") : "bg-slate-600"
                                                            )} 
                                                            title={topic.hasOzet ? "Özet hazır" : "Özet henüz yok"}
                                                        />
                                                        <span className="text-xs font-semibold line-clamp-2 leading-tight">
                                                            {topic.title}
                                                        </span>
                                                    </div>
                                                    {isSelected && (
                                                        <ChevronRight className="w-4 h-4 flex-shrink-0 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] pl-4.5 pt-0.5">
                                                    <span className={cn(isSelected ? "text-indigo-200" : "text-slate-500 font-mono")}>
                                                        {idx + 1}. Konu
                                                    </span>
                                                    {topic.hasOzet ? (
                                                        <span className={cn("font-mono text-[10px] px-1.5 py-0.5 rounded", isSelected ? "bg-indigo-700 text-emerald-200 font-bold" : "bg-emerald-500/10 text-emerald-400")}>
                                                            {topic.wordCount} kelime
                                                        </span>
                                                    ) : (
                                                        <span className={cn("text-[10px]", isSelected ? "text-amber-200" : "text-amber-400/70")}>
                                                            Özet Yok
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── SAĞ BÖLÜM: DİJİTAL ÖZET OKUYUCU & İNTERAKTİF ÖNİZLEME ── */}
                    <div className="xl:col-span-7 2xl:col-span-7 flex flex-col h-[780px] xl:h-[840px] rounded-3xl bg-slate-900/75 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
                        
                        {/* Okuyucu Üst Başlık ve Hiyerarşi */}
                        <div className="p-4 border-b border-white/10 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 font-medium">
                                    <span className="text-purple-400 font-bold">{selectedGrade}. Sınıf</span>
                                    <span>›</span>
                                    <span className="truncate max-w-[150px]">{activeSelectedCourse}</span>
                                    <span>›</span>
                                    <span className="truncate max-w-[150px]">{activeSelectedUnit}</span>
                                    {activeSelectedItem && (
                                        <Badge className={cn(
                                            "text-[10px] font-black uppercase px-2 py-0.5 ml-1",
                                            activeSelectedItem.type === 'unit' 
                                                ? "bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-sm" 
                                                : "bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
                                        )}>
                                            {activeSelectedItem.type === 'unit' ? '⭐ ÜNİTE ÖZETİ' : 'KONU ÖZETİ'}
                                        </Badge>
                                    )}
                                </div>
                                <h2 className="text-base sm:text-lg font-black text-white truncate flex items-center gap-2">
                                    {activeSelectedItem?.title || 'Özet Seçilmedi'}
                                </h2>
                            </div>

                            {/* Önceki & Sonraki Navigasyon */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!prevItem}
                                    onClick={() => prevItem && handleItemChange(prevItem.id)}
                                    className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-9 px-3 text-xs"
                                    title={prevItem ? `Önceki: ${prevItem.title}` : 'Önceki içerik yok'}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!nextItem}
                                    onClick={() => nextItem && handleItemChange(nextItem.id)}
                                    className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-9 px-3 text-xs"
                                    title={nextItem ? `Sonraki: ${nextItem.title}` : 'Sonraki içerik yok'}
                                >
                                    Sonraki <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>

                        {/* Aksiyon Araç Çubuğu (Toolbar) */}
                        <div className="px-4 py-3 bg-slate-950/40 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                            {/* Sekme Seçiciler */}
                            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
                                <button
                                    onClick={() => setActiveTab('preview')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'preview' ? "bg-purple-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Önizleme</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('code')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'code' ? "bg-purple-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    <Code2 className="w-3.5 h-3.5" />
                                    <span>HTML Kodu</span>
                                </button>
                                {activeSelectedItem?.sourceText && (
                                    <button
                                        onClick={() => setActiveTab('source')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                            activeTab === 'source' ? "bg-indigo-600 text-white shadow-md" : "text-indigo-400 hover:text-white"
                                        )}
                                    >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        <span>Kaynak Metin</span>
                                    </button>
                                )}
                            </div>

                            {/* Sağ Butonlar: Tahtada Aç, AI, Düzenle, Kopyala, Sil */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {activeSelectedItem && (
                                    <>
                                        {/* Akıllı Tahtada Aç */}
                                        <Button
                                            asChild
                                            size="sm"
                                            className="bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold rounded-xl h-9 px-3 text-xs shadow-md"
                                        >
                                            <a href={smartboardUrl} target="_blank" rel="noopener noreferrer">
                                                <MonitorPlay className="w-3.5 h-3.5 mr-1.5" />
                                                Tahtada Sun
                                            </a>
                                        </Button>

                                        {/* AI ile Özet Üret */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={isGeneratingAi}
                                            onClick={() => handleAiGenerate(activeSelectedItem)}
                                            className="border-purple-500/30 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 hover:text-white rounded-xl h-9 px-3 text-xs"
                                        >
                                            <Sparkles className={cn("w-3.5 h-3.5 mr-1.5", isGeneratingAi && "animate-spin text-purple-400")} />
                                            {isGeneratingAi ? "Üretiliyor..." : "AI ile Hazırla"}
                                        </Button>

                                        {/* Düzenle */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleOpenEdit(activeSelectedItem)}
                                            className="border-white/10 text-slate-200 hover:text-white bg-slate-900/80 rounded-xl h-9 px-3 text-xs"
                                        >
                                            <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                                            Düzenle
                                        </Button>

                                        {/* Kopyala */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={!activeSelectedItem.htmlContent}
                                            onClick={() => handleCopy(activeSelectedItem.id, activeSelectedItem.htmlContent)}
                                            className="text-slate-300 hover:text-white rounded-xl h-9 px-2 text-xs"
                                            title="Özet HTML'ini Kopyala"
                                        >
                                            {copiedId === activeSelectedItem.id ? (
                                                <Check className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </Button>

                                        {/* Temizle / Sil */}
                                        {activeSelectedItem.hasOzet && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl h-9 px-2 text-xs"
                                                        title="Özeti Temizle"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100 rounded-3xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-lg font-black text-white">Özeti Temizlemek İstediğinize Emin Misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-slate-400 text-sm">
                                                            <strong>{activeSelectedItem.title}</strong> için kayıtlı özet içeriği silinecektir. Bu işlem sonrasında tekrar AI ile özet oluşturabilirsiniz.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="bg-slate-800 text-slate-300 hover:bg-slate-700 border-0 rounded-xl">Vazgeç</AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={() => handleClearOzet(activeSelectedItem)}
                                                            className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold"
                                                        >
                                                            Evet, Özeti Temizle
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Okuyucu Ana Gövdesi */}
                        <div ref={readerContainerRef} className="flex-1 overflow-hidden relative flex flex-col bg-slate-950/60">
                            {activeTab === 'preview' && (
                                <>
                                    {/* Zoom ve Tam Ekran Kontrolleri */}
                                    <div className="px-4 py-2 bg-slate-900/60 border-b border-white/5 flex items-center justify-between text-xs text-slate-400">
                                        <div className="flex items-center gap-2 font-mono">
                                            {activeSelectedItem?.hasOzet ? (
                                                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                    {activeSelectedItem.wordCount.toLocaleString('tr-TR')} kelime ({activeSelectedItem.charCount.toLocaleString('tr-TR')} karakter)
                                                </span>
                                            ) : (
                                                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                                                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                                    Özet Bulunmuyor
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-white/10">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.1))} 
                                                    className="h-7 w-7 text-white hover:bg-white/10 rounded-md"
                                                    title="Küçült"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </Button>
                                                <span className="text-[10px] font-bold text-slate-300 w-12 text-center font-mono">
                                                    %{Math.round(zoomLevel * 100)}
                                                </span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.1))} 
                                                    className="h-7 w-7 text-white hover:bg-white/10 rounded-md"
                                                    title="Büyüt"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    if (!document.fullscreenElement) {
                                                        readerContainerRef.current?.requestFullscreen();
                                                    } else {
                                                        document.exitFullscreen();
                                                    }
                                                }}
                                                className="h-7 w-7 text-slate-300 hover:text-white rounded-md"
                                                title="Tam Ekran"
                                            >
                                                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* iFrame veya Boş Durum */}
                                    <div className="flex-1 w-full h-full overflow-hidden relative">
                                        {activeSelectedItem?.htmlContent ? (
                                            <iframe
                                                srcDoc={activeSelectedItem.htmlContent + `<style>body { zoom: ${zoomLevel}; transform-origin: top center; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }</style>`}
                                                className="w-full h-full border-0 bg-white"
                                                title={activeSelectedItem.title}
                                                sandbox="allow-scripts allow-same-origin"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                                                <div className="p-4 rounded-3xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    <LayoutTemplate className="w-12 h-12" />
                                                </div>
                                                <div className="space-y-1 max-w-md">
                                                    <h3 className="text-lg font-black text-white">Bu İçerik İçin Henüz Özet Hazırlanmamış</h3>
                                                    <p className="text-slate-400 text-sm">
                                                        {activeSelectedItem?.type === 'unit' 
                                                            ? "Bu ünite için genel tekrar özeti ekleyebilir veya aşağıdaki yapay zeka butonu ile ünite konularından otomatik özet derleyebilirsiniz."
                                                            : "Bu konu için interaktif özet hazırlayabilir veya kaynak metinden tek tıkla yapay zeka özeti üretebilirsiniz."}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 pt-2">
                                                    <Button
                                                        onClick={() => activeSelectedItem && handleAiGenerate(activeSelectedItem)}
                                                        disabled={isGeneratingAi}
                                                        className="bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-purple-950/50"
                                                    >
                                                        <Sparkles className="w-4 h-4 mr-2" />
                                                        {isGeneratingAi ? "Üretiliyor..." : "AI ile Otomatik Oluştur"}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => activeSelectedItem && handleOpenEdit(activeSelectedItem)}
                                                        className="border-white/10 text-slate-300 hover:text-white rounded-xl"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Manuel Özet Yaz
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {activeTab === 'code' && (
                                <div className="flex-1 w-full h-full p-4 overflow-y-auto font-mono text-xs text-purple-200 bg-slate-950 scrollbar-thin select-text">
                                    <pre className="whitespace-pre-wrap break-all leading-relaxed">
                                        {activeSelectedItem?.htmlContent || '<!-- Henüz HTML özet içeriği bulunmuyor -->'}
                                    </pre>
                                </div>
                            )}

                            {activeTab === 'source' && (
                                <div className="flex-1 w-full h-full p-6 overflow-y-auto text-sm text-slate-200 bg-slate-950/80 scrollbar-thin space-y-4 select-text">
                                    <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                                            <BookOpen className="w-4 h-4" />
                                            <span>Müfredat Kaynak Metni (Ders Kitabı)</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => activeSelectedItem && handleAiGenerate(activeSelectedItem)}
                                            disabled={isGeneratingAi}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold h-8"
                                        >
                                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                                            Bu Metinden Özet Üret
                                        </Button>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 whitespace-pre-wrap leading-relaxed">
                                        {activeSelectedItem?.sourceText || 'Bu konu için kayıtlı kaynak metin bulunmuyor.'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ ÖZET DÜZENLEME & AI ÖNİZLEME MODALI ══ */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="max-w-5xl h-[88vh] flex flex-col bg-slate-900 border-white/10 text-slate-100 rounded-3xl p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-5 border-b border-white/10 bg-slate-950/60 flex flex-row items-center justify-between flex-wrap gap-2">
                        <div>
                            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                                <LayoutTemplate className="w-5 h-5 text-purple-400" />
                                <span>{editingItem?.title} - Özet Düzenleyici</span>
                                <Badge className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border-purple-500/30">
                                    {editingItem?.type === 'unit' ? 'ÜNİTE ÖZETİ' : 'KONU ÖZETİ'}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400">
                                HTML formatında interaktif özet içeriği oluşturun veya düzenleyin.
                            </DialogDescription>
                        </div>

                        {/* AI Üret Butonu & Sekmeler */}
                        <div className="flex items-center gap-3">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={isGeneratingAi || !editingItem}
                                onClick={() => editingItem && handleAiGenerate(editingItem)}
                                className="border-purple-500/40 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 hover:text-white rounded-xl h-9 text-xs"
                            >
                                <Sparkles className={cn("w-3.5 h-3.5 mr-1.5", isGeneratingAi && "animate-spin text-purple-400")} />
                                {isGeneratingAi ? "Üretiliyor..." : "AI ile Yeniden Üret"}
                            </Button>

                            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10">
                                <button
                                    onClick={() => setEditorTab('edit')}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                                        editorTab === 'edit' ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Düzenle (HTML)
                                </button>
                                <button
                                    onClick={() => setEditorTab('preview')}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                                        editorTab === 'preview' ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Canlı Önizleme
                                </button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Hızlı Şablon Araç Çubuğu (Sadece Düzenleme sekmesinde) */}
                    {editorTab === 'edit' && (
                        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">Şablon Ekle:</span>
                            <button onClick={() => insertTemplate('heading')} className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-medium whitespace-nowrap">
                                + Başlık
                            </button>
                            <button onClick={() => insertTemplate('callout')} className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-medium whitespace-nowrap">
                                + Dikkat Kutusu
                            </button>
                            <button onClick={() => insertTemplate('ayah')} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-medium whitespace-nowrap">
                                + Ayet Meali
                            </button>
                            <button onClick={() => insertTemplate('hadith')} className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-medium whitespace-nowrap">
                                + Hadis Kutusu
                            </button>
                            <button onClick={() => insertTemplate('concept')} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-medium whitespace-nowrap">
                                + Kavram Kartı
                            </button>
                            <button onClick={() => insertTemplate('points')} className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-medium whitespace-nowrap">
                                + Madde Listesi
                            </button>
                        </div>
                    )}

                    {/* Modal Gövdesi */}
                    <div className="flex-1 p-4 overflow-hidden relative flex flex-col bg-slate-950/50">
                        {editorTab === 'edit' ? (
                            <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                placeholder="Özet HTML kodunu buraya yapıştırın veya yazın..."
                                className="w-full h-full bg-slate-950 border-white/10 text-slate-100 font-mono text-xs rounded-2xl p-4 resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 leading-relaxed scrollbar-thin"
                            />
                        ) : (
                            <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-white">
                                {editText.trim() ? (
                                    <iframe
                                        srcDoc={editText + `<style>body { padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }</style>`}
                                        className="w-full h-full border-0 bg-white"
                                        title="Preview"
                                        sandbox="allow-scripts allow-same-origin"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                        Önizlenecek bir HTML içeriği bulunmuyor.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between">
                        <div className="text-xs font-mono text-slate-400">
                            {editText.length.toLocaleString('tr-TR')} karakter
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                onClick={() => setEditingItem(null)} 
                                className="text-slate-400 hover:text-white rounded-xl"
                            >
                                İptal
                            </Button>
                            <Button
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                                className="bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white rounded-xl font-bold px-6 shadow-lg shadow-purple-950/40"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Kaydediliyor...
                                    </>
                                ) : (
                                    "Değişiklikleri Kaydet"
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
