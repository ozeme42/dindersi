'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Users,
    Book,
    Library,
    ListTodo,
    Check,
    PlusCircle,
    FilePenLine,
    Trash2,
    Loader2,
    Layers,
    ArrowLeft,
    Sparkles,
    FolderPlus,
    Eye,
    EyeOff,
    FileText,
    Workflow,
    GraduationCap,
    BookOpen,
    Search,
    ChevronDown,
    Plus,
    Presentation,
    RefreshCw,
    X,
    ExternalLink,
    ChevronRight,
    Play,
    Settings,
    MoreVertical
} from 'lucide-react';
import {
    saveCurriculumItem,
    deleteCurriculumItem,
    bulkAddCurriculumItems,
    togglePublishState,
} from './actions';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { SchoolClass, Course, Unit, Topic, LessonStep } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AiLessonStepGenerationDialog } from '@/components/ai-lesson-step-generation-dialog';

type EnrichedTopic = Topic & { questionCount?: number; steps?: any[] };
type EnrichedUnit = Unit & { topics: EnrichedTopic[]; questionCount?: number; hasFlowContent?: boolean };
type EnrichedCourse = Course & { units: EnrichedUnit[] };
type EnrichedClass = SchoolClass & { courses: EnrichedCourse[] };

type DialogState = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu' | null;
    parentId?: string;
    courseId?: string;
    currentItem?: { id: string; name?: string; title?: string; branches?: string[]; externalLink?: string; sourceText?: string; isPublished?: boolean };
};

type BulkAddDialogState = {
    isOpen: boolean;
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu' | null;
    parentId?: string;
    parentName?: string;
    courseId?: string;
};

type DeleteDialogState = {
    isOpen: boolean;
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu' | null;
    item: { id: string; name: string; path: string };
};

// Sınıflara Özel Canlı Neon Renk Temaları
const classBadgeThemes: Record<string, { active: string; idle: string; border: string }> = {
    '5': {
        active: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border-cyan-300 ring-2 ring-cyan-400/60',
        idle: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 hover:bg-cyan-900/60 hover:border-cyan-400',
        border: 'border-cyan-500/40',
    },
    '6': {
        active: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border-emerald-300 ring-2 ring-emerald-400/60',
        idle: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60 hover:border-emerald-400',
        border: 'border-emerald-500/40',
    },
    '7': {
        active: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] border-violet-300 ring-2 ring-violet-400/60',
        idle: 'bg-violet-950/40 text-violet-300 border-violet-500/30 hover:bg-violet-900/60 hover:border-violet-400',
        border: 'border-violet-500/40',
    },
    '8': {
        active: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] border-amber-300 ring-2 ring-amber-400/60',
        idle: 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/60 hover:border-amber-400',
        border: 'border-amber-500/40',
    },
};

const defaultClassTheme = {
    active: 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg border-white/30 ring-2 ring-white/40',
    idle: 'bg-slate-900/50 text-slate-300 border-white/10 hover:bg-slate-800/60 hover:border-white/20',
    border: 'border-white/10',
};

const courseGradients = [
    { active: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border-purple-400 ring-1 ring-purple-300', idle: 'bg-purple-950/40 text-purple-200 border-purple-500/30 hover:bg-purple-900/50' },
    { active: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)] border-teal-400 ring-1 ring-teal-300', idle: 'bg-teal-950/40 text-teal-200 border-teal-500/30 hover:bg-teal-900/50' },
    { active: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border-rose-400 ring-1 ring-rose-300', idle: 'bg-rose-950/40 text-rose-200 border-rose-500/30 hover:bg-rose-900/50' },
    { active: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border-amber-400 ring-1 ring-amber-300', idle: 'bg-amber-950/40 text-amber-200 border-amber-500/30 hover:bg-amber-900/50' },
];

function extractLeadingNumbers(title: string): number[] {
    if (!title) return [];
    const clean = title.trim();
    const uniteMatch = clean.match(/^Ünite\s+(\d+)/i);
    if (uniteMatch) return [parseInt(uniteMatch[1], 10)];
    const match = clean.match(/^(\d+(?:[\.\-]\d+)*)/);
    if (match) return match[1].split(/[\.\-]/).filter(Boolean).map(n => parseInt(n, 10));
    return [];
}

function compareTitles(titleA: string = '', titleB: string = ''): number {
    const numsA = extractLeadingNumbers(titleA);
    const numsB = extractLeadingNumbers(titleB);
    if (numsA.length > 0 && numsB.length > 0) {
        for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
            const a = numsA[i] ?? 0;
            const b = numsB[i] ?? 0;
            if (a !== b) return a - b;
        }
    } else if (numsA.length > 0) return -1;
    else if (numsB.length > 0) return 1;
    return titleA.localeCompare(titleB, 'tr', { numeric: true, sensitivity: 'base' });
}

// ══ MODÜL SEVİYESİNDE ÖNBELLEK (Sayfalar arası geçişte anında açılma) ══
let cachedCurriculumData: EnrichedClass[] | null = null;

export default function ContentCreationPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [curriculum, setCurriculum] = useState<EnrichedClass[]>(cachedCurriculumData || []);
    const [isLoading, setIsLoading] = useState(!cachedCurriculumData);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Seçimler
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [expandedUnitIds, setExpandedUnitIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Diyalog Durumları
    const [dialogState, setDialogState] = useState<DialogState>({
        isOpen: false,
        mode: 'add',
        type: null,
    });
    const [deleteDialogState, setDeleteDialogState] = useState<DeleteDialogState | null>(null);
    const [bulkAddDialogState, setBulkAddDialogState] = useState<BulkAddDialogState>({ isOpen: false, type: null });

    const [isSaving, setIsSaving] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [branches, setBranches] = useState<string[]>([]);
    const [newBranchName, setNewBranchName] = useState('');
    const [externalLink, setExternalLink] = useState('');
    const [sourceText, setSourceText] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [isAIGenOpen, setIsAIGenOpen] = useState(false);

    // Müfredat Verisini Çek
    const fetchCurriculum = async (forceRefresh = false) => {
        if (!forceRefresh && cachedCurriculumData && cachedCurriculumData.length > 0) {
            setCurriculum(cachedCurriculumData);
            setIsLoading(false);
            return;
        }

        if (forceRefresh) {
            setIsRefreshing(true);
        } else if (!cachedCurriculumData) {
            setIsLoading(true);
        }

        try {
            const classesQuery = query(collection(db, 'classes'), orderBy('createdAt', 'asc'));
            const [classesSnapshot, allCoursesSnapshot] = await Promise.all([
                getDocs(classesQuery),
                getDocs(collection(db, 'courses')),
            ]);

            const allCourses = allCoursesSnapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as Course)
            );

            // 1. AŞAMA: Sınıfları ve Dersleri anında ekranda göster
            const initialClasses: EnrichedClass[] = classesSnapshot.docs.map(classDoc => {
                const classData = { id: classDoc.id, ...classDoc.data() } as SchoolClass;
                const classCourses = allCourses
                    .filter(course => course.classId === classDoc.id)
                    .map(course => ({ ...course, units: [] } as EnrichedCourse));
                return { ...classData, courses: classCourses };
            });

            const generalCourses = allCourses
                .filter(course => !course.classId)
                .map(course => ({ ...course, units: [] } as EnrichedCourse));

            if (generalCourses.length > 0) {
                initialClasses.unshift({
                    id: 'general',
                    name: 'Genel',
                    courses: generalCourses,
                    createdAt: new Date()
                } as EnrichedClass);
            }

            setCurriculum(initialClasses);
            setIsLoading(false);

            // 2. AŞAMA: Tüm Üniteleri ve Konuları paralel çek
            const enrichCourseUnits = async (course: Course): Promise<EnrichedCourse> => {
                try {
                    const unitsSnapshot = await getDocs(
                        query(collection(db, `courses/${course.id}/units`), orderBy('title'))
                    );
                    const units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                        const unitData = { id: unitDoc.id, ...unitDoc.data() } as Unit;
                        try {
                            const topicsSnapshot = await getDocs(
                                query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy('title'))
                            );
                            const topics = topicsSnapshot.docs.map(tDoc => ({ id: tDoc.id, ...tDoc.data() } as Topic));
                            return {
                                ...unitData,
                                topics,
                                hasFlowContent: (unitData.steps || []).length > 0
                            } as EnrichedUnit;
                        } catch (e) {
                            return { ...unitData, topics: [], hasFlowContent: (unitData.steps || []).length > 0 } as EnrichedUnit;
                        }
                    }));
                    return { ...course, units };
                } catch (e) {
                    return { ...course, units: [] };
                }
            };

            const enrichedClasses: EnrichedClass[] = await Promise.all(initialClasses.map(async (cls) => {
                const coursesWithUnits = await Promise.all(cls.courses.map(enrichCourseUnits));
                return { ...cls, courses: coursesWithUnits };
            }));

            cachedCurriculumData = enrichedClasses;
            setCurriculum(enrichedClasses);
        } catch (error) {
            console.error('Error fetching curriculum: ', error);
            toast({ title: 'Hata', description: 'Müfredat yüklenirken hata oluştu.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCurriculum();
    }, []);

    // Sınıf ve Ders Varsayılan Seçimi (Sayfa açıldığında 5. Sınıf doğrudan seçili gelir)
    useEffect(() => {
        if (curriculum.length === 0) return;

        // Seçili sınıf geçerli mi?
        const currentClassExists = curriculum.some(c => c.id === selectedClassId);
        if (!selectedClassId || !currentClassExists) {
            // Öncelikli olarak 5. sınıfı seç, yoksa ilk sınıfı
            const grade5 = curriculum.find(c => c.name.includes('5'));
            const initialClass = grade5 || curriculum[0];
            setSelectedClassId(initialClass.id);
            if (initialClass.courses && initialClass.courses.length > 0) {
                setSelectedCourseId(initialClass.courses[0].id);
            } else {
                setSelectedCourseId('');
            }
        }
    }, [curriculum, selectedClassId]);

    // Seçili Sınıf Nesnesi
    const selectedClass = useMemo(
        () => curriculum.find(c => c.id === selectedClassId),
        [curriculum, selectedClassId]
    );

    // Seçili Ders Nesnesi
    const selectedCourse = useMemo(
        () => selectedClass?.courses?.find(c => c.id === selectedCourseId) || selectedClass?.courses?.[0],
        [selectedClass, selectedCourseId]
    );

    // Sınıf değişince ilgili sınıfın ilk dersini otomatik seç
    const handleSelectClass = (cls: EnrichedClass) => {
        setSelectedClassId(cls.id);
        if (cls.courses && cls.courses.length > 0) {
            setSelectedCourseId(cls.courses[0].id);
        } else {
            setSelectedCourseId('');
        }
    };

    // Ders değiştikçe veya sayfa açıldığında üniteler varsayılan olarak kapalı gelsin
    useEffect(() => {
        setExpandedUnitIds([]);
    }, [selectedCourse?.id]);

    // Sıralı ve Arama Filtreli Üniteler & Konular
    const displayedUnits = useMemo(() => {
        if (!selectedCourse?.units) return [];

        const sortedUnits = [...selectedCourse.units].sort((a, b) => compareTitles(a.title, b.title));
        const queryClean = searchQuery.trim().toLowerCase();

        if (!queryClean) {
            return sortedUnits.map(unit => ({
                ...unit,
                topics: [...(unit.topics || [])].sort((a, b) => compareTitles(a.title, b.title))
            }));
        }

        return sortedUnits
            .map(unit => {
                const unitMatch = unit.title.toLowerCase().includes(queryClean);
                const matchedTopics = (unit.topics || [])
                    .filter(t => t.title.toLowerCase().includes(queryClean))
                    .sort((a, b) => compareTitles(a.title, b.title));

                if (unitMatch) {
                    return {
                        ...unit,
                        topics: [...(unit.topics || [])].sort((a, b) => compareTitles(a.title, b.title))
                    };
                }

                if (matchedTopics.length > 0) {
                    return {
                        ...unit,
                        topics: matchedTopics
                    };
                }

                return null;
            })
            .filter(Boolean) as EnrichedUnit[];
    }, [selectedCourse, searchQuery]);

    // Tümünü Aç / Kapat Toggle
    const handleToggleExpandAll = () => {
        if (!selectedCourse?.units) return;
        if (expandedUnitIds.length === selectedCourse.units.length) {
            setExpandedUnitIds([]);
        } else {
            setExpandedUnitIds(selectedCourse.units.map(u => u.id));
        }
    };

    // Dialog Açma
    const openDialog = (
        mode: 'add' | 'edit',
        type: DialogState['type'],
        currentItem?: { id: string; name?: string; title?: string; branches?: string[]; externalLink?: string; sourceText?: string; isPublished?: boolean },
        parentId?: string,
        courseId?: string
    ) => {
        setDialogState({ isOpen: true, mode, type, parentId, courseId, currentItem });
        setNewItemName(mode === 'edit' && currentItem ? (currentItem.name || currentItem.title || '') : '');
        setBranches(
            type === 'Sınıf' && mode === 'edit' && currentItem
                ? currentItem.branches || []
                : []
        );
        setExternalLink(
            type === 'Konu' && mode === 'edit' && currentItem ? currentItem.externalLink || '' : ''
        );
        setSourceText(
            type === 'Konu' && mode === 'edit' && currentItem ? currentItem.sourceText || '' : ''
        );
    };

    const openDeleteDialog = (
        type: DeleteDialogState['type'],
        item: DeleteDialogState['item']
    ) => {
        setDeleteDialogState({ isOpen: true, type, item });
    };

    const openBulkAddDialog = (
        type: BulkAddDialogState['type'],
        parentId?: string,
        parentName?: string,
        courseId?: string
    ) => {
        setBulkAddDialogState({ isOpen: true, type, parentId, parentName, courseId });
        setBulkText('');
    };

    // Kayıt İşlemi
    const handleSave = async () => {
        if (!dialogState.type) return;
        setIsSaving(true);
        const { type, mode, currentItem, parentId, courseId } = dialogState;

        const result = await saveCurriculumItem(type, mode, {
            name: newItemName,
            id: currentItem?.id,
            parentId: parentId,
            courseId: courseId || selectedCourse?.id,
            branches: branches,
            externalLink: externalLink,
            sourceText: sourceText,
        });

        if (result.success) {
            toast({ title: 'Başarılı', description: `${type} kaydedildi.` });
            await fetchCurriculum(true);
            setDialogState({ isOpen: false, mode: 'add', type: null });
        } else {
            toast({ title: 'Hata', description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    // Silme İşlemi
    const handleDelete = async () => {
        if (!deleteDialogState) return;
        setIsSaving(true);
        const result = await deleteCurriculumItem(deleteDialogState.item.path);
        if (result.success) {
            toast({
                title: 'Başarılı',
                description: `${deleteDialogState.type} silindi.`,
            });
            await fetchCurriculum(true);
            setDeleteDialogState(null);
        } else {
            toast({ title: 'Hata', description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    // Yayınlama Durumu Değiştirme
    const handleTogglePublish = async (path: string, currentState: boolean) => {
        setIsSaving(true);
        const result = await togglePublishState(path, currentState);
        if (result.success) {
            toast({ title: 'Başarılı', description: currentState ? 'Öğe gizlendi.' : 'Öğe yayınlandı.' });
            await fetchCurriculum(true);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    // Toplu Ekleme
    const handleBulkSave = async () => {
        if (!bulkAddDialogState.type) return;
        setIsSaving(true);
        const names = bulkText.split('\n').map(n => n.trim()).filter(Boolean);
        const { type, parentId, courseId } = bulkAddDialogState;
        const result = await bulkAddCurriculumItems(
            type,
            names,
            parentId,
            type === 'Konu' ? (courseId || selectedCourse?.id) : undefined
        );
        if (result.success) {
            toast({ title: "Başarılı", description: `${result.count} öğe eklendi.` });
            await fetchCurriculum(true);
            setBulkAddDialogState({ isOpen: false, type: null });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-3 sm:p-5 md:p-8 relative overflow-hidden">
            {/* Kozmik Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[750px] h-[750px] bg-purple-900/10 rounded-full blur-[160px]" />
                <div className="absolute top-[20%] right-[-10%] w-[650px] h-[650px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[160px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-6">
                
                {/* ══ ÜST BAŞLIK & HIZLI İŞLEM BUTONLARI ══ */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-white/8 pb-5">
                    <div className="flex items-center gap-3.5">
                        <Link
                            href="/teacher"
                            className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-all shadow-md group"
                            title="Öğretmen Paneline Dön"
                        >
                            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
                                    İçerik & Müfredat Yönetimi
                                </h1>
                                <Badge variant="outline" className="bg-purple-950/60 border-purple-500/30 text-purple-300 text-[11px] font-bold px-2 py-0.5">
                                    Stüdyo
                                </Badge>
                            </div>
                            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                                Sınıf, ders, ünite ve konu sunumlarını tek ekrandan düzenleyin ve yayınlayın.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchCurriculum(true)}
                            disabled={isRefreshing}
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 bg-slate-900/60 h-9 rounded-xl text-xs font-bold"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefreshing && "animate-spin text-cyan-400")} />
                            Yenile
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog('add', 'Sınıf')}
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 bg-slate-900/60 h-9 rounded-xl text-xs font-bold"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1 text-cyan-400" />
                            Yeni Sınıf
                        </Button>

                        {selectedClassId && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDialog('add', 'Ders', undefined, selectedClassId)}
                                className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 bg-slate-900/60 h-9 rounded-xl text-xs font-bold"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1 text-purple-400" />
                                Yeni Ders
                            </Button>
                        )}

                        {selectedCourse && (
                            <Button
                                size="sm"
                                onClick={() => openDialog('add', 'Ünite', undefined, selectedCourse.id)}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold h-9 px-4 rounded-xl text-xs shadow-lg shadow-purple-950/50"
                            >
                                <PlusCircle className="h-4 w-4 mr-1.5" />
                                Yeni Ünite Ekle
                            </Button>
                        )}
                    </div>
                </div>

                {/* ══ SEÇİM KOKPİTİ: SINIF VE DERS SEÇİCİ (AKTİVİTELER & YAZILACAKLAR STİLİ) ══ */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl p-4 shadow-2xl space-y-3.5">
                    {/* 1. SATIR: SINIF SEÇİMİ */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black tracking-wider uppercase text-slate-400 px-1 flex items-center gap-1.5">
                                <GraduationCap className="w-4 h-4 text-cyan-400" /> Sınıf:
                            </span>
                            <div className="flex items-center gap-2 flex-wrap bg-black/40 p-1.5 rounded-xl border border-white/10">
                                {curriculum.map((schoolClass) => {
                                    const isSelected = schoolClass.id === selectedClassId;
                                    const gradeNum = schoolClass.name.replace(/[^0-9]/g, '');
                                    const theme = classBadgeThemes[gradeNum] || defaultClassTheme;

                                    return (
                                        <div key={schoolClass.id} className="relative group/pill flex items-center">
                                            <button
                                                onClick={() => handleSelectClass(schoolClass)}
                                                className={cn(
                                                    "h-9 px-4 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer",
                                                    isSelected ? theme.active : theme.idle
                                                )}
                                            >
                                                <span>{schoolClass.name}</span>
                                                {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                                            </button>

                                            {/* Sınıf düzenleme menüsü */}
                                            {isSelected && schoolClass.id !== 'general' && (
                                                <div className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white">
                                                                <MoreVertical className="h-3.5 w-3.5" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className="bg-slate-950 border-white/15 text-white">
                                                            <DropdownMenuItem onClick={() => openDialog('edit', 'Sınıf', schoolClass)} className="cursor-pointer">
                                                                <FilePenLine className="h-3.5 w-3.5 mr-2 text-indigo-400" /> Sınıfı Düzenle
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => openDeleteDialog('Sınıf', { id: schoolClass.id, name: schoolClass.name, path: `classes/${schoolClass.id}` })}
                                                                className="text-red-400 focus:text-red-300 cursor-pointer"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Sınıfı Sil
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Toplu Ekleme Butonu */}
                        {selectedCourse && (
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openBulkAddDialog('Ünite', selectedCourse.id, selectedCourse.title, selectedCourse.id)}
                                    className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 bg-slate-950/40 text-xs font-bold h-8 rounded-lg"
                                >
                                    <Layers className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                                    Toplu Ünite Ekle
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openBulkAddDialog('Konu', selectedCourse.units?.[0]?.id, selectedCourse.units?.[0]?.title, selectedCourse.id)}
                                    disabled={!selectedCourse.units || selectedCourse.units.length === 0}
                                    className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 bg-slate-950/40 text-xs font-bold h-8 rounded-lg disabled:opacity-40"
                                >
                                    <ListTodo className="h-3.5 w-3.5 mr-1.5 text-teal-400" />
                                    Toplu Konu Ekle
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* 2. SATIR: DERS SEÇİMİ (SEÇİLİ SINIFIN DERSLERİ) */}
                    {selectedClass && selectedClass.courses && selectedClass.courses.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pt-2.5 border-t border-white/8">
                            <span className="text-xs font-black tracking-wider uppercase text-slate-400 px-1 flex-shrink-0 flex items-center gap-1.5">
                                <Book className="w-4 h-4 text-purple-400" /> Ders:
                            </span>
                            <div className="flex items-center gap-2 overflow-x-auto py-0.5 flex-1">
                                {selectedClass.courses.map((course, idx) => {
                                    const isSelected = course.id === selectedCourseId;
                                    const theme = courseGradients[idx % courseGradients.length];

                                    return (
                                        <div key={course.id} className="flex items-center flex-shrink-0">
                                            <button
                                                onClick={() => setSelectedCourseId(course.id)}
                                                className={cn(
                                                    "h-8 px-3.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer",
                                                    isSelected ? theme.active : theme.idle
                                                )}
                                            >
                                                <span>{course.title}</span>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </button>

                                            {isSelected && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="ml-1 p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
                                                            <MoreVertical className="h-3 w-3" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="bg-slate-950 border-white/15 text-white">
                                                        <DropdownMenuItem onClick={() => openDialog('edit', 'Ders', course, selectedClass.id)} className="cursor-pointer">
                                                            <FilePenLine className="h-3.5 w-3.5 mr-2 text-indigo-400" /> Dersi Düzenle
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => openDeleteDialog('Ders', { id: course.id, name: course.title, path: `courses/${course.id}` })}
                                                            className="text-red-400 focus:text-red-300 cursor-pointer"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Dersi Sil
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    );
                                })}

                                <button
                                    onClick={() => openDialog('add', 'Ders', undefined, selectedClass.id)}
                                    className="h-8 px-2.5 rounded-lg text-xs font-bold border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 transition-colors flex items-center gap-1 flex-shrink-0"
                                >
                                    <Plus className="w-3 h-3" /> Ders Ekle
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ══ MÜFREDAT AKORDİYON ALANI: ÜNİTELER VE DOĞRUDAN KONULAR ══ */}
                <div className="space-y-4">
                    {/* Arama & Hızlı Araç Çubuğu */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ünite veya konu adı ile filtrele..."
                                className="pl-10 h-10 bg-slate-900/60 border-white/10 text-xs text-white rounded-xl placeholder:text-slate-500 focus:border-purple-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedCourse?.units && selectedCourse.units.length > 0 && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleToggleExpandAll}
                                    className="text-xs text-slate-400 hover:text-white hover:bg-white/5 h-9 rounded-xl"
                                >
                                    {expandedUnitIds.length === selectedCourse.units.length ? 'Tümünü Kapat' : 'Tümünü Aç'}
                                </Button>
                            )}
                            
                            <span className="text-xs font-bold text-slate-400 bg-slate-900/60 px-3 py-2 rounded-xl border border-white/8">
                                Toplam {selectedCourse?.units?.length || 0} Ünite • {selectedCourse?.units?.reduce((acc, u) => acc + (u.topics?.length || 0), 0) || 0} Konu
                            </span>
                        </div>
                    </div>

                    {/* Yükleme Durumu */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-white/10 bg-slate-900/40">
                            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
                            <p className="text-sm text-slate-400 font-medium">Müfredat ve ders akışları yükleniyor...</p>
                        </div>
                    ) : !selectedCourse ? (
                        /* Ders Bulunamadı Durumu */
                        <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 p-6">
                            <FolderPlus className="h-16 w-16 mx-auto mb-4 text-slate-600 opacity-50" />
                            <p className="text-lg font-bold text-white mb-1">Bu sınıfta henüz ders bulunmuyor.</p>
                            <p className="text-xs text-slate-400 mb-5">Ders ekleyerek müfredatı oluşturmaya başlayın.</p>
                            {selectedClassId && (
                                <Button
                                    onClick={() => openDialog('add', 'Ders', undefined, selectedClassId)}
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl"
                                >
                                    <Plus className="h-4 w-4 mr-1" /> İlk Dersi Ekle
                                </Button>
                            )}
                        </div>
                    ) : displayedUnits.length === 0 ? (
                        /* Ünite Bulunamadı Durumu */
                        <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 p-6">
                            <Library className="h-16 w-16 mx-auto mb-4 text-slate-600 opacity-50" />
                            <p className="text-lg font-bold text-white mb-1">
                                {searchQuery ? 'Aramanızla eşleşen ünite veya konu bulunamadı.' : 'Bu derste henüz ünite bulunmuyor.'}
                            </p>
                            <p className="text-xs text-slate-400 mb-5">Yeni ünite ekleyerek ders akışlarını yapılandırabilirsiniz.</p>
                            <Button
                                onClick={() => openDialog('add', 'Ünite', undefined, selectedCourse.id)}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl"
                            >
                                <Plus className="h-4 w-4 mr-1" /> Yeni Ünite Ekle
                            </Button>
                        </div>
                    ) : (
                        /* Üniteler ve Konular Akordiyonu */
                        <Accordion
                            type="multiple"
                            value={expandedUnitIds}
                            onValueChange={setExpandedUnitIds}
                            className="space-y-4"
                        >
                            {displayedUnits.map((unit, unitIdx) => {
                                const unitPath = `courses/${selectedCourse.id}/units/${unit.id}`;
                                const isUnitPublished = unit.isPublished ?? true;

                                return (
                                    <AccordionItem
                                        key={unit.id}
                                        value={unit.id}
                                        className={cn(
                                            "rounded-2xl border bg-slate-900/70 backdrop-blur-xl overflow-hidden shadow-xl transition-all duration-300",
                                            isUnitPublished ? "border-white/10" : "border-amber-500/20 opacity-70"
                                        )}
                                    >
                                        {/* ── ÜNİTE BAŞLIK ÇUBUĞU ── */}
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 px-4 sm:px-5 py-3.5 bg-slate-900/90 border-b border-white/5">
                                            {/* Sol: Akordiyon Açma Tetikleyicisi & Ünite Adı */}
                                            <AccordionTrigger className="flex-1 py-1 hover:no-underline text-left cursor-pointer [&[data-state=open]>div>svg]:rotate-180">
                                                <div className="flex items-center gap-3 w-full pr-3">
                                                    <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex-shrink-0">
                                                        <BookOpen className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-base sm:text-lg font-black text-white truncate">
                                                                {unit.title}
                                                            </span>
                                                            <Badge variant="outline" className="bg-black/30 text-purple-300 border-purple-500/25 text-[10px] px-2 py-0">
                                                                {unit.topics?.length || 0} Konu
                                                            </Badge>
                                                            {unit.hasFlowContent && (
                                                                <Badge variant="outline" className="bg-amber-950/60 text-amber-300 border-amber-500/30 text-[10px] px-2 py-0">
                                                                    Ünite Akışı
                                                                </Badge>
                                                            )}
                                                            {!isUnitPublished && (
                                                                <Badge variant="outline" className="bg-rose-950/60 text-rose-300 border-rose-500/30 text-[10px] px-2 py-0">
                                                                    Gizli
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>

                                            {/* Sağ: Ünite İşlem Butonları (StopPropagation ile akordiyonu tetiklemez) */}
                                            <div
                                                className="flex items-center gap-1.5 flex-wrap flex-shrink-0 self-end lg:self-center"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Yeni Konu Ekle Butonu */}
                                                <Button
                                                    size="sm"
                                                    onClick={() => openDialog('add', 'Konu', undefined, unit.id, selectedCourse.id)}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-md shadow-indigo-950/40 cursor-pointer"
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-1" /> Konu Ekle
                                                </Button>

                                                {/* Ünite Akışı / Sunumu Düzenle */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(`/teacher/content-creation/edit-unit/${unit.id}?courseId=${selectedCourse.id}`)}
                                                    className="border-purple-500/30 text-purple-300 hover:bg-purple-600/20 hover:text-white bg-purple-950/30 text-xs font-bold h-8 px-3 rounded-xl cursor-pointer"
                                                    title="Ünite Akışı ve Özetini Düzenle"
                                                >
                                                    <Workflow className="h-3.5 w-3.5 mr-1 text-purple-400" /> Ünite Akışı
                                                </Button>

                                                {/* Varsa Ünite Özeti Görüntüle */}
                                                {unit.htmlContent && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        asChild
                                                        className="h-8 w-8 text-rose-300 hover:text-white hover:bg-rose-950/40 rounded-xl"
                                                        title="Ünite Özeti"
                                                    >
                                                        <Link href={`/teacher/smartboard/ozetler/goruntule/${selectedCourse.id}/${unit.id}`} target="_blank">
                                                            <FileText className="h-3.5 w-3.5 text-rose-400" />
                                                        </Link>
                                                    </Button>
                                                )}

                                                {/* Ünite Yayınla/Gizle */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleTogglePublish(unitPath, isUnitPublished)}
                                                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer"
                                                    title={isUnitPublished ? "Üniteyi Gizle" : "Üniteyi Yayınla"}
                                                >
                                                    {isUnitPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-amber-400" />}
                                                </Button>

                                                {/* Ünite Düzenle */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => openDialog('edit', 'Ünite', unit, selectedCourse.id)}
                                                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer"
                                                    title="Üniteyi Düzenle"
                                                >
                                                    <FilePenLine className="h-3.5 w-3.5" />
                                                </Button>

                                                {/* Ünite Sil */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => openDeleteDialog('Ünite', { id: unit.id, name: unit.title, path: unitPath })}
                                                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl cursor-pointer"
                                                    title="Üniteyi Sil"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* ── ÜNİTE İÇERİĞİ: KONU KARTLARI IZGARASI ── */}
                                        <AccordionContent className="p-4 sm:p-5 bg-black/30 border-t border-white/5">
                                            {unit.topics && unit.topics.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                                                    {unit.topics.map((topic, topicIdx) => {
                                                        const topicPath = `courses/${selectedCourse.id}/units/${unit.id}/topics/${topic.id}`;
                                                        const isTopicPublished = topic.isPublished ?? true;
                                                        const stepCount = (topic.steps || []).length;
                                                        const editUrl = `/teacher/content-creation/edit?courseId=${selectedCourse.id}&unitId=${unit.id}&topicId=${topic.id}`;

                                                        return (
                                                            <div
                                                                key={topic.id}
                                                                className={cn(
                                                                    "group relative rounded-2xl border transition-all duration-300 p-4 flex flex-col justify-between shadow-lg hover:-translate-y-0.5",
                                                                    isTopicPublished
                                                                        ? "bg-slate-900/60 hover:bg-slate-900 border-white/10 hover:border-indigo-500/50 hover:shadow-indigo-500/10"
                                                                        : "bg-slate-950/40 border-dashed border-amber-500/30 opacity-75 hover:opacity-100"
                                                                )}
                                                            >
                                                                {/* Kart Üst Bilgisi */}
                                                                <div>
                                                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                                                        <span className="text-[10px] font-black tracking-wider uppercase text-slate-500">
                                                                            {topicIdx + 1}. Konu
                                                                        </span>
                                                                        <div className="flex items-center gap-1.5">
                                                                            {stepCount > 0 && (
                                                                                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                                                                                    {stepCount} Slayt
                                                                                </span>
                                                                            )}
                                                                            {!isTopicPublished && (
                                                                                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                                                                                    Gizli
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Konu Başlığı */}
                                                                    <Link
                                                                        href={editUrl}
                                                                        className="block group/link"
                                                                    >
                                                                        <h3 className="text-sm sm:text-base font-bold text-white group-hover/link:text-indigo-300 transition-colors line-clamp-2 min-h-[44px]">
                                                                            {topic.title}
                                                                        </h3>
                                                                    </Link>
                                                                </div>

                                                                {/* Kart Alt Çubuğu & Aksiyonlar */}
                                                                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                                                    {/* Birincil Aksiyon: Sunum & Ders Stüdyosu */}
                                                                    <Button
                                                                        size="sm"
                                                                        asChild
                                                                        className="bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 hover:border-indigo-500 text-white font-bold text-xs h-8 px-3 rounded-xl flex-1 transition-all cursor-pointer"
                                                                    >
                                                                        <Link href={editUrl}>
                                                                            <Sparkles className="h-3 w-3 mr-1 text-yellow-300" />
                                                                            Stüdyo
                                                                        </Link>
                                                                    </Button>

                                                                    {/* Hızlı İkon Butonları */}
                                                                    <div className="flex items-center gap-1">
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => handleTogglePublish(topicPath, isTopicPublished)}
                                                                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer"
                                                                            title={isTopicPublished ? "Gizle" : "Yayınla"}
                                                                        >
                                                                            {isTopicPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-amber-400" />}
                                                                        </Button>

                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => openDialog('edit', 'Konu', topic, unit.id, selectedCourse.id)}
                                                                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer"
                                                                            title="Konu Bilgilerini Düzenle"
                                                                        >
                                                                            <FilePenLine className="h-3.5 w-3.5" />
                                                                        </Button>

                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => openDeleteDialog('Konu', { id: topic.id, name: topic.title, path: topicPath })}
                                                                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl cursor-pointer"
                                                                            title="Konuyu Sil"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                /* Konu Bulunmuyor Boş Durumu */
                                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-dashed border-white/10 bg-black/20 text-center sm:text-left">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-300">Bu ünitede henüz konu bulunmuyor.</p>
                                                        <p className="text-[11px] text-slate-500">Konu ekleyerek sunum slaytlarınızı oluşturun.</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openDialog('add', 'Konu', undefined, unit.id, selectedCourse.id)}
                                                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold h-8 px-3 rounded-xl cursor-pointer"
                                                    >
                                                        <Plus className="h-3.5 w-3.5 mr-1" /> İlk Konuyu Ekle
                                                    </Button>
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}

                    {/* ══ ALT: YENİ ÜNİTE EKLE KARTI ══ */}
                    {selectedCourse && displayedUnits.length > 0 && (
                        <button
                            onClick={() => openDialog('add', 'Ünite', undefined, selectedCourse.id)}
                            className="w-full py-5 border-2 border-dashed border-white/15 hover:border-purple-500/50 rounded-2xl bg-slate-900/30 hover:bg-purple-950/20 text-slate-400 hover:text-purple-300 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                        >
                            <PlusCircle className="h-5 w-5 text-purple-400 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold">Bu Derse Yeni Ünite Ekle</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ══ 1. EKLE / DÜZENLE MODAL DIALOG ══ */}
            <Dialog open={dialogState.isOpen} onOpenChange={() => setDialogState({ isOpen: false, mode: 'add', type: null })}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                            {dialogState.mode === 'add' ? 'Yeni Ekle' : 'Düzenle'}: <span className="text-purple-400">{dialogState.type}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-slate-300 text-xs font-bold">Ad / Başlık</Label>
                            <Input
                                id="name"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                className="bg-slate-950 border-white/10 text-white h-11 text-sm rounded-xl focus:border-purple-500"
                                placeholder={dialogState.type === 'Sınıf' ? 'Örn: 5. Sınıf' : dialogState.type === 'Ders' ? 'Örn: Din Kültürü ve Ahlak Bilgisi' : dialogState.type === 'Ünite' ? 'Örn: 1. Ünite: Allah İnancı' : 'Örn: 1. Konu: Allah Vardır ve Birdir'}
                            />
                        </div>

                        {dialogState.type === 'Konu' && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="external-link" className="text-slate-300 text-xs font-bold">Dış Bağlantı (Opsiyonel)</Label>
                                    <Input
                                        id="external-link"
                                        value={externalLink}
                                        onChange={(e) => setExternalLink(e.target.value)}
                                        className="bg-slate-950 border-white/10 text-white h-11 text-sm rounded-xl focus:border-purple-500"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="source-text" className="text-slate-300 text-xs font-bold">Kaynak Metin (AI İçin)</Label>
                                    <Textarea
                                        id="source-text"
                                        value={sourceText}
                                        onChange={(e) => setSourceText(e.target.value)}
                                        className="bg-slate-950 border-white/10 text-white min-h-[110px] text-xs leading-relaxed rounded-xl focus:border-purple-500"
                                        placeholder="Ders kitabı özeti veya konu hakkında metin..."
                                    />
                                </div>
                            </>
                        )}
                        
                        {dialogState.type === 'Sınıf' && dialogState.mode === 'edit' && (
                            <div className="grid gap-3 pt-3 border-t border-white/10">
                                <Label className="text-slate-300 text-xs font-bold">Şubeler</Label>
                                <div className="space-y-3 p-3 bg-slate-950/50 rounded-xl border border-white/5">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Yeni Şube (A, B...)"
                                            value={newBranchName}
                                            onChange={(e) => setNewBranchName(e.target.value)}
                                            className="bg-slate-900 border-white/10 text-white h-9 text-xs rounded-lg"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                if (newBranchName.trim() && !branches.includes(newBranchName.trim())) {
                                                    setBranches([...branches, newBranchName.trim()]);
                                                    setNewBranchName("");
                                                }
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-3 rounded-lg"
                                        >
                                            Ekle
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {branches.map((branch, index) => (
                                            <div key={index} className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-full border border-white/10">
                                                <span className="font-bold text-xs">{branch}</span>
                                                <button
                                                    onClick={() => setBranches(branches.filter((_, i) => i !== index))}
                                                    className="text-slate-400 hover:text-red-400 ml-0.5"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {branches.length === 0 && <span className="text-xs text-slate-500 italic">Şube eklenmedi.</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogState({ ...dialogState, isOpen: false })} className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button>
                        <Button onClick={handleSave} disabled={isSaving || !newItemName.trim()} className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 rounded-xl">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══ 2. TOPLU EKLEME MODAL DIALOG ══ */}
            <Dialog open={bulkAddDialogState.isOpen} onOpenChange={() => setBulkAddDialogState({ isOpen: false, type: null })}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            Toplu {bulkAddDialogState.type} Ekle
                            {bulkAddDialogState.parentName && <span className="text-purple-400 text-sm block mt-1">({bulkAddDialogState.parentName})</span>}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Her satıra bir {bulkAddDialogState.type} ismi gelecek şekilde yapıştırın.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                        <Textarea
                            className="min-h-[260px] font-mono bg-slate-950 border-white/10 text-white text-xs leading-relaxed rounded-xl"
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder={`Örnek:\n1. Ünite: Allah İnancı\n2. Ünite: Ramazan ve Oruç\n3. Ünite: Ahlaki Davranışlar`}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setBulkAddDialogState({ isOpen: false, type: null })} className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button>
                        <Button onClick={handleBulkSave} disabled={isSaving || !bulkText.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 rounded-xl">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />} Toplu Ekle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══ 3. SİLME ONAY MODAL DIALOG ══ */}
            {deleteDialogState && (
                <AlertDialog open={deleteDialogState.isOpen} onOpenChange={(open) => !open && setDeleteDialogState(null)}>
                    <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-400 text-xl font-bold">Silmek İstediğinize Emin misiniz?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400 text-xs">
                                "{deleteDialogState.item.name}" adlı {deleteDialogState.type} ve altındaki tüm içerikler kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white border-none" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />} Kalıcı Olarak Sil
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* ══ 4. AI STEP GENERATION DIALOG ══ */}
            <AiLessonStepGenerationDialog
                isOpen={isAIGenOpen}
                onOpenChange={setIsAIGenOpen}
                context={null}
                onStepsGenerated={() => {}}
                generationType={'anlatim'}
            />
        </div>
    );
}
