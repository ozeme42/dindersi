'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    PlusCircle,
    Loader2,
    Trash2,
    FilePenLine,
    MoreHorizontal,
    Upload,
    Sparkles,
    Download,
    Database,
    Search,
    Filter,
    ArrowLeft,
    ArrowRight,
    Check,
    Home,
    BookOpen,
    X,
    ChevronRight,
    ChevronLeft,
    GraduationCap,
    Copy,
    Eye,
    Layers,
    Users,
    Book,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc, getDoc, where } from "firebase/firestore";
import type { ActivityItem, Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { AiActivityGenerationPanel } from "@/components/ai-activity-generation-panel";
import { deleteBulkActivityItems, saveActivityItem } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { ActivityItemEditorDialog } from "@/components/activity-item-editor-dialog";
import { BulkActivityImportDialog } from "@/components/bulk-activity-import-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { saveTopicSourceText } from "@/app/teacher/source-texts/actions";
import { cn } from "@/lib/utils";
import Link from 'next/link';

type EnrichedCourse = Course & { units: (Unit & { topics: Topic[] })[] };

// Sınıflara Özel Canlı Renk Temaları (İçerik Yönetimi ile Birebir)
const classBadgeThemes: Record<string, { active: string; idle: string; border: string }> = {
    '4': {
        active: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border-emerald-300 ring-2 ring-emerald-400/60',
        idle: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60 hover:border-emerald-400',
        border: 'border-emerald-500/40',
    },
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
    { active: 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)] border-teal-400 ring-1 ring-teal-300', idle: 'bg-teal-950/40 text-teal-200 border-teal-500/30 hover:bg-teal-900/50' },
    { active: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border-purple-400 ring-1 ring-purple-300', idle: 'bg-purple-950/40 text-purple-200 border-purple-500/30 hover:bg-purple-900/50' },
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

function ActivityItemCard({ item, topicName, onEdit, onDelete, onSelect, isSelected, index }: { 
    item: ActivityItem,
    topicName?: string,
    onEdit: () => void, 
    onDelete: (itemId: string) => void,
    onSelect: (itemId: string) => void,
    isSelected: boolean,
    index: number
}) {
    const typeLabels: {[key: string]: string} = {
        concept: 'Kavram',
        definition: 'Tanım',
        sentence: 'Cümle',
        categorization: 'Kategorizasyon',
        sorting: 'Olay Sıralama'
    };

    const typeColors: {[key: string]: string} = {
        concept: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
        definition: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20',
        sentence: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
        categorization: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20',
        sorting: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
    };

    const renderContent = () => {
        switch (item.type) {
            case 'concept': return item.content.text;
            case 'sentence': return `"${item.content.text}"`;
            case 'definition': return `${item.content.term}: ${item.content.definition}`;
            case 'categorization': return `${item.content.title} (${item.content.items?.length || 0} öğe)`;
            case 'sorting': return `${item.content.title} (${(item.content.items as string[])?.length || 0} cümle)`;
            default: return '';
        }
    };

    return (
        <Card className={cn(
            "flex flex-col transition-all duration-300 bg-slate-900/60 backdrop-blur-sm border-white/5 hover:border-white/10 group relative overflow-hidden", 
            isSelected && "ring-2 ring-teal-500 ring-offset-2 ring-offset-slate-950 bg-teal-900/10"
        )}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <CardHeader className="flex flex-row items-start gap-4 pb-2 relative z-10">
                 <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(item.id)}
                    aria-label={`Select item`}
                    className="mt-1 border-white/20 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                />
                <div className="flex-1 space-y-1">
                    <div className="flex items-start gap-3">
                       <span className="font-black text-teal-400 text-lg">#{index + 1}</span>
                       <p className="text-base font-medium text-slate-200 line-clamp-3 leading-relaxed">{renderContent()}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow text-xs text-slate-500 relative z-10 py-2 ml-11">
                {topicName && <p>Konu: <span className="text-slate-400">{topicName}</span></p>}
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-black/20 p-3 mt-auto border-t border-white/5 relative z-10">
                 <Badge variant="outline" className={cn("font-bold border transition-colors", typeColors[item.type] || "bg-slate-800 text-slate-300 border-white/10")}>
                    {typeLabels[item.type] || item.type}
                 </Badge>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10">
                            <MoreHorizontal className="h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-white">
                        <DropdownMenuItem onClick={onEdit} className="focus:bg-white/10 focus:text-white cursor-pointer">
                            <FilePenLine className="mr-2 h-4 w-4 text-emerald-400"/> Düzenle
                        </DropdownMenuItem>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full cursor-pointer">
                                    <Trash2 className="mr-2 h-4 w-4" /> Sil
                                </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-400">Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">Bu işlem geri alınamaz. Veri öğesi kalıcı olarak silinecektir.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-red-600 hover:bg-red-500 text-white border-none">
                                        Evet, Sil
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardFooter>
        </Card>
    );
}

export default function ActivityDataManagementPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);

    const [allData, setAllData] = useState<{ classes: SchoolClass[]; courses: EnrichedCourse[] }>({
        classes: [],
        courses: [],
    });
    const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});

    // Cockpit Selections
    const [selectedGrade, setSelectedGrade] = useState<string>('5');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [expandedUnitIds, setExpandedUnitIds] = useState<string[]>([]); // Varsayılan olarak kapalı!
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'has_items' | 'missing_items' | 'has_source' | 'missing_source'>('all');

    // Studio Workspace Modal State
    const [isStudioOpen, setIsStudioOpen] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

    // Items inside Studio
    const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
    const [isItemsLoading, setIsItemsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [dataTypeFilter, setDataTypeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Dialog States
    const [editingItem, setEditingItem] = useState<Partial<ActivityItem> | null>(null);
    const [isAIGenOpen, setIsAIGenOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    // Source Text States
    const [topicSourceText, setTopicSourceText] = useState<string>('');
    const [isSourceTextLoading, setIsSourceTextLoading] = useState<boolean>(false);
    const [isSourceTextEditorOpen, setIsSourceTextEditorOpen] = useState(false);
    const [isSourceTextReaderOpen, setIsSourceTextReaderOpen] = useState(false);
    const [editableSourceText, setEditableSourceText] = useState('');
    const [isSavingSourceText, setIsSavingSourceText] = useState(false);

    const fetchInitialTree = useCallback(async () => {
        setIsLoading(true);
        try {
            const [manifestRes, countsRes, classesSnapshot] = await Promise.all([
                fetch('/curriculum/manifest.json'),
                fetch('/curriculum/activity-counts.json').catch(() => null),
                getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))).catch(() => null)
            ]);

            let mData: any = null;
            if (manifestRes.ok) {
                mData = await manifestRes.json();
            }

            let countsMap: Record<string, number> = {};
            if (countsRes && countsRes.ok) {
                try {
                    countsMap = await countsRes.json();
                } catch (e) {}
            }
            setTopicCounts(countsMap);

            const firestoreClasses = classesSnapshot 
                ? classesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass))
                : [];

            let classesList: SchoolClass[] = [];
            const classIdToNameMap = new Map<string, string>();
            const gradeNameToClassIdMap = new Map<string, string>();

            if (firestoreClasses.length > 0) {
                classesList = firestoreClasses.map(c => ({
                    ...c,
                    name: c.name.includes('Sınıf') ? c.name : `${c.name}. Sınıf`
                }));
                firestoreClasses.forEach(c => {
                    const formattedName = c.name.includes('Sınıf') ? c.name : `${c.name}. Sınıf`;
                    classIdToNameMap.set(c.id, formattedName);
                    const grade = c.name.replace(/[^0-9]/g, '');
                    if (grade) {
                        gradeNameToClassIdMap.set(grade, c.id);
                        gradeNameToClassIdMap.set(c.name, c.id);
                    }
                });
            } else if (mData?.classGroups) {
                classesList = mData.classGroups.map((cg: any) => ({
                    id: cg.name,
                    name: `${cg.name}. Sınıf`,
                    grade: cg.name,
                    branches: ['A', 'B', 'C', 'D'],
                    createdAt: new Date().toISOString()
                }));
                classesList.forEach(c => {
                    classIdToNameMap.set(c.id, c.name);
                    gradeNameToClassIdMap.set(c.id, c.id);
                });
            }

            const coursesList: EnrichedCourse[] = [];
            if (mData?.classGroups) {
                for (const cg of mData.classGroups) {
                    const classId = gradeNameToClassIdMap.get(cg.name) || cg.name;
                    const className = classIdToNameMap.get(classId) || `${cg.name}. Sınıf`;

                    for (const c of cg.courses || []) {
                        coursesList.push({
                            id: c.id,
                            title: c.title,
                            classId: classId,
                            className: className,
                            isTeacherOnly: false,
                            units: (c.units || []).map((u: any) => ({
                                id: u.id,
                                title: u.title,
                                courseId: c.id,
                                topics: (u.topics || []).map((t: any) => ({
                                    id: t.id,
                                    title: t.title,
                                    unitId: u.id,
                                    sourceText: t.sourceText || '',
                                }))
                            }))
                        } as EnrichedCourse);
                    }
                }
            }

            setAllData({
                classes: classesList,
                courses: coursesList,
            });
        } catch (error) {
            console.error("Error fetching curriculum tree:", error);
            toast({ title: "Hata", description: "Müfredat yüklenirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInitialTree();
    }, [fetchInitialTree]);

    // Available Grades
    const availableGrades = useMemo(() => {
        const grades = new Set<string>();
        allData.classes.forEach(c => {
            const num = c.name?.replace(/[^0-9]/g, '') || (c as any).grade?.replace(/[^0-9]/g, '');
            if (num) grades.add(num);
        });
        if (grades.size === 0) return ['4', '5', '6', '7', '8'];
        return Array.from(grades).sort((a, b) => parseInt(a) - parseInt(b));
    }, [allData.classes]);

    // Courses for selected grade
    const coursesForSelectedGrade = useMemo(() => {
        return allData.courses.filter(c => {
            const cName = c.className || '';
            const g = cName.replace(/[^0-9]/g, '');
            return g === selectedGrade || c.classId === selectedGrade;
        });
    }, [allData.courses, selectedGrade]);

    // Auto-select first course when grade changes
    useEffect(() => {
        if (coursesForSelectedGrade.length > 0) {
            const currentStillExists = coursesForSelectedGrade.some(c => c.id === selectedCourseId);
            if (!currentStillExists) {
                setSelectedCourseId(coursesForSelectedGrade[0].id);
                setExpandedUnitIds([]); // Yeni ders seçildiğinde akordiyonlar kapalı başlar
            }
        } else {
            setSelectedCourseId('');
            setExpandedUnitIds([]);
        }
    }, [selectedGrade, coursesForSelectedGrade, selectedCourseId]);

    // Selected Course Object
    const selectedCourseObj = useMemo(() => {
        return allData.courses.find(c => c.id === selectedCourseId) || null;
    }, [allData.courses, selectedCourseId]);

    // Units for Selected Course (Sorted)
    const sortedUnits = useMemo(() => {
        if (!selectedCourseObj?.units) return [];
        return [...selectedCourseObj.units].sort((a, b) => compareTitles(a.title, b.title));
    }, [selectedCourseObj]);

    // Selected Unit & Topic Objects for Studio
    const activeUnitObj = useMemo(() => {
        if (!selectedCourseObj || !selectedUnitId) return null;
        return selectedCourseObj.units?.find(u => u.id === selectedUnitId) || null;
    }, [selectedCourseObj, selectedUnitId]);

    const activeTopicObj = useMemo(() => {
        if (!activeUnitObj || !selectedTopicId) return null;
        return activeUnitObj.topics?.find(t => t.id === selectedTopicId) || null;
    }, [activeUnitObj, selectedTopicId]);

    // Fetch Activity Items for Topic
    const fetchItemsForTopic = useCallback(async (topicId: string) => {
        if (!topicId) return;
        setIsItemsLoading(true);
        try {
            const qRef = query(collection(db, "activityItems"), where("topicId", "==", topicId));
            let fetchedItems: ActivityItem[] = [];

            try {
                const snap = await getDocs(qRef);
                fetchedItems = snap.docs.map(doc => {
                    const data = doc.data();
                    const createdAt = (data.createdAt as any)?.toDate?.()?.toISOString?.() ||
                        (typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString());
                    return {
                        id: doc.id,
                        ...data,
                        createdAt,
                    } as ActivityItem;
                });
            } catch (queryErr) {
                console.warn("Firestore query error for topic items:", queryErr);
            }

            if (fetchedItems.length === 0) {
                try {
                    const staticRes = await fetch(`/curriculum/activityItems/${topicId}.json`);
                    if (staticRes.ok) {
                        const staticList = await staticRes.json();
                        fetchedItems = staticList.map((item: any) => ({
                            ...item,
                            createdAt: item.createdAt || new Date(0).toISOString(),
                        }));
                    }
                } catch (err) {
                    console.warn("Could not load static activity items:", err);
                }
            }

            setActivityItems(fetchedItems);
            setTopicCounts(prev => ({ ...prev, [topicId]: fetchedItems.length }));
        } catch (error) {
            console.error("Error fetching activity items:", error);
            toast({ title: "Hata", description: "Veriler yüklenirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsItemsLoading(false);
        }
    }, [toast]);

    // Fetch Source Text for Topic
    const fetchTopicSourceText = useCallback(async (courseId: string, unitId: string, topicId: string) => {
        if (!courseId || !unitId || !topicId) {
            setTopicSourceText('');
            return;
        }
        setIsSourceTextLoading(true);
        try {
            const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            const snap = await getDoc(topicRef);
            if (snap.exists()) {
                const data = snap.data();
                setTopicSourceText(data.sourceText || '');
            } else {
                setTopicSourceText('');
            }
        } catch (err) {
            console.warn("Could not fetch topic source text in activity-data:", err);
            setTopicSourceText('');
        } finally {
            setIsSourceTextLoading(false);
        }
    }, []);

    // Open Studio for Topic
    const handleOpenStudio = (unitId: string, topicId: string) => {
        setSelectedUnitId(unitId);
        setSelectedTopicId(topicId);
        setIsStudioOpen(true);
        setCurrentPage(1);
        setSelectedItemIds(new Set());
        setSearchTerm('');
        if (selectedCourseId) {
            fetchItemsForTopic(topicId);
            fetchTopicSourceText(selectedCourseId, unitId, topicId);
        }
    };

    // Switch topic inside Studio (Previous / Next)
    const handleStudioTopicNavigate = (direction: 'prev' | 'next') => {
        if (!activeUnitObj || !selectedTopicId) return;
        const sortedTopics = [...(activeUnitObj.topics || [])].sort((a, b) => compareTitles(a.title, b.title));
        const currentIndex = sortedTopics.findIndex(t => t.id === selectedTopicId);
        if (currentIndex === -1) return;

        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < sortedTopics.length) {
            const nextTopic = sortedTopics[nextIndex];
            setSelectedTopicId(nextTopic.id);
            setCurrentPage(1);
            setSelectedItemIds(new Set());
            setSearchTerm('');
            if (selectedCourseId && selectedUnitId) {
                fetchItemsForTopic(nextTopic.id);
                fetchTopicSourceText(selectedCourseId, selectedUnitId, nextTopic.id);
            }
        }
    };

    // Save Source Text
    const handleSaveSourceTextFromActivity = async () => {
        if (!selectedCourseId || !selectedUnitId || !selectedTopicId) return;
        setIsSavingSourceText(true);
        const result = await saveTopicSourceText(selectedCourseId, selectedUnitId, selectedTopicId, editableSourceText);
        if (result.success) {
            toast({ title: "Başarılı", description: "Konu kaynak metni kaydedildi." });
            setTopicSourceText(editableSourceText);
            setIsSourceTextEditorOpen(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSavingSourceText(false);
    };

    // Filtered Items inside Studio
    const filteredActivityItems = useMemo(() => {
        let temp = activityItems;
        if (dataTypeFilter !== 'all') {
            temp = temp.filter(d => d.type === dataTypeFilter);
        }
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            temp = temp.filter(d => {
                const content = d.content || {};
                return (
                    (content.text && content.text.toLowerCase().includes(lower)) ||
                    (content.term && content.term.toLowerCase().includes(lower)) ||
                    (content.definition && content.definition.toLowerCase().includes(lower)) ||
                    (content.title && content.title.toLowerCase().includes(lower))
                );
            });
        }
        return temp;
    }, [activityItems, dataTypeFilter, searchTerm]);

    const totalPages = Math.ceil(filteredActivityItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredActivityItems.slice(start, start + itemsPerPage);
    }, [filteredActivityItems, currentPage, itemsPerPage]);

    // Save item
    const handleSave = async (itemToSave: Partial<ActivityItem>) => {
        if (!itemToSave.courseId || !itemToSave.unitId || !itemToSave.topicId) {
            toast({ title: "Hata", description: "Yeni öğe oluşturmak veya kaydetmek için bir konu seçilmelidir.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        const result = await saveActivityItem(itemToSave);

        if (result.success) {
            toast({ title: 'Başarılı', description: 'Veri öğesi kaydedildi.' });
            setEditingItem(null);
            if (selectedTopicId) fetchItemsForTopic(selectedTopicId);
            const savedTopicId = itemToSave.topicId;
            if (savedTopicId) {
                setTopicCounts(prev => ({
                    ...prev,
                    [savedTopicId]: (prev[savedTopicId] || 0) + (itemToSave.id?.startsWith('new-') || !itemToSave.id ? 1 : 0)
                }));
            }
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    // Delete single item
    const handleDelete = async (itemId: string) => {
        try {
            await deleteDoc(doc(db, "activityItems", itemId));
            toast({ title: "Başarılı", description: "Veri öğesi başarıyla silindi." });
            setActivityItems(prev => prev.filter(i => i.id !== itemId));
            setSelectedItemIds(prev => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
            if (selectedTopicId) {
                setTopicCounts(prev => ({
                    ...prev,
                    [selectedTopicId]: Math.max(0, (prev[selectedTopicId] || 1) - 1)
                }));
            }
        } catch(e) {
            console.error("Error deleting item:", e);
            toast({ title: "Hata", description: "Öğe silinirken bir hata oluştu.", variant: "destructive" });
        }
    };

    // Bulk Delete
    const handleBulkDelete = async () => {
        setIsDeleting(true);
        const idsToDelete = Array.from(selectedItemIds);
        const result = await deleteBulkActivityItems(idsToDelete);
        if (result.success) {
            toast({ title: "Başarılı", description: `${result.count} veri seti silindi.` });
            setSelectedItemIds(new Set());
            setActivityItems(prev => prev.filter(i => !idsToDelete.includes(i.id)));
            if (selectedTopicId) {
                setTopicCounts(prev => ({
                    ...prev,
                    [selectedTopicId]: Math.max(0, (prev[selectedTopicId] || idsToDelete.length) - idsToDelete.length)
                }));
            }
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsDeleting(false);
    };

    // Select single item
    const handleSelectId = (id: string) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Select all on page
    const handleSelectAllOnPage = () => {
        const allOnPageIds = paginatedItems.map(d => d.id);
        const currentSelection = new Set(selectedItemIds);
        const allSelected = paginatedItems.length > 0 && allOnPageIds.every(id => currentSelection.has(id));

        if (allSelected) {
            allOnPageIds.forEach(id => currentSelection.delete(id));
        } else {
            allOnPageIds.forEach(id => currentSelection.add(id));
        }
        setSelectedItemIds(currentSelection);
    };

    // JSON download
    const handleDownload = () => {
        const dataStr = JSON.stringify(filteredActivityItems.map(({id, createdAt, ...rest}) => rest), null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `etkinlik_verileri_${selectedTopicId || 'tum'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // AI Generation Context for Studio
    const aiGenerationContext = useMemo(() => {
        if (!selectedCourseObj || !activeUnitObj || !activeTopicObj) return null;
        return { 
            courseId: selectedCourseObj.id, 
            unitId: activeUnitObj.id, 
            topicId: activeTopicObj.id, 
            topicTitle: activeTopicObj.title,
            sourceText: topicSourceText || activeTopicObj.sourceText || '',
            isLoadingSourceText: isSourceTextLoading,
        };
    }, [selectedCourseObj, activeUnitObj, activeTopicObj, topicSourceText, isSourceTextLoading]);

    // Open item editor dialog
    const handleOpenDialog = (item: Partial<ActivityItem>) => {
        const contextItem = (item.id && !item.id.startsWith('new-')) 
            ? item
            : {
                ...item,
                courseId: selectedCourseObj?.id || '',
                unitId: activeUnitObj?.id || '',
                topicId: activeTopicObj?.id || '',
            };
        setEditingItem(contextItem);
    };

    // Total Stats for Selected Course
    const courseStats = useMemo(() => {
        let totalTopics = 0;
        let totalItems = 0;
        let topicsWithItems = 0;

        for (const u of sortedUnits) {
            for (const t of u.topics || []) {
                totalTopics++;
                const count = topicCounts[t.id] || 0;
                totalItems += count;
                if (count > 0) topicsWithItems++;
            }
        }
        return {
            totalUnits: sortedUnits.length,
            totalTopics,
            totalItems,
            topicsWithItems,
        };
    }, [sortedUnits, topicCounts]);

    // Accordion Toggle: Open All / Close All
    const handleToggleAllUnits = () => {
        if (expandedUnitIds.length === sortedUnits.length) {
            setExpandedUnitIds([]);
        } else {
            setExpandedUnitIds(sortedUnits.map(u => u.id));
        }
    };

    // Filtering topics in units
    const filteredUnitsWithTopics = useMemo(() => {
        return sortedUnits.map(unit => {
            let topics = [...(unit.topics || [])].sort((a, b) => compareTitles(a.title, b.title));
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                topics = topics.filter(t => 
                    t.title.toLowerCase().includes(q) || 
                    unit.title.toLowerCase().includes(q)
                );
            }
            if (filterStatus === 'has_items') {
                topics = topics.filter(t => (topicCounts[t.id] || 0) > 0);
            } else if (filterStatus === 'missing_items') {
                topics = topics.filter(t => (topicCounts[t.id] || 0) === 0);
            } else if (filterStatus === 'has_source') {
                topics = topics.filter(t => Boolean(t.sourceText && t.sourceText.trim().length > 0));
            } else if (filterStatus === 'missing_source') {
                topics = topics.filter(t => !t.sourceText || t.sourceText.trim().length === 0);
            }
            return {
                ...unit,
                filteredTopics: topics,
                totalItemsInUnit: (unit.topics || []).reduce((acc, t) => acc + (topicCounts[t.id] || 0), 0)
            };
        }).filter(unit => unit.filteredTopics.length > 0 || !searchQuery.trim());
    }, [sortedUnits, searchQuery, filterStatus, topicCounts]);

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[-10%] w-[800px] h-[800px] bg-teal-900/15 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] bg-indigo-900/10 rounded-full blur-[140px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-6">

                {/* ═══ 1. ÜST BAŞLIK VE KOKPİT ═══ */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-2xl border border-teal-500/30 text-teal-400 shadow-xl shadow-teal-950/20">
                            <Database className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase drop-shadow-md">
                                    Etkinlik Veri Bankası
                                </h1>
                                <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 font-bold text-xs">
                                    İÇERİK YÖNETİMİ MODU
                                </Badge>
                            </div>
                            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
                                Ünite ve konu hiyerarşisinde kavramları, tanımları, pano notlarını ve etkinlik cümlelerini yönetin.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start md:self-auto">
                        <Button asChild className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg shadow-teal-500/20 border-0">
                            <Link href="/teacher/smartboard/yazilacaklar">
                                <Sparkles className="mr-1.5 h-4 w-4 text-amber-300" />
                                Merkezi Stüdyo 🚀
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900/60 rounded-xl text-xs h-10 px-4">
                            <Link href="/">
                                <Home className="mr-1.5 h-4 w-4 text-indigo-400" /> Ana Sayfa
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900/60 rounded-xl text-xs h-10 px-4">
                            <Link href="/teacher">
                                <ArrowLeft className="mr-1.5 h-4 w-4 text-slate-400" /> Panele Dön
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* ═══ 2. SINIF SEÇİCİ BAR (İçerik Yönetimi Teması) ═══ */}
                <div className="p-2 rounded-2xl bg-slate-900/70 border border-white/5 backdrop-blur-xl shadow-lg flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-3 pr-2 hidden sm:inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-teal-400" /> Sınıf:
                    </span>
                    {availableGrades.map(grade => {
                        const isSelected = selectedGrade === grade;
                        const theme = classBadgeThemes[grade] || defaultClassTheme;
                        return (
                            <button
                                key={grade}
                                type="button"
                                onClick={() => setSelectedGrade(grade)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 border whitespace-nowrap flex items-center gap-2",
                                    isSelected ? theme.active : theme.idle
                                )}
                            >
                                <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                                {grade}. Sınıf
                            </button>
                        );
                    })}
                </div>

                {/* ═══ 3. DERS SEÇİCİ BAR ═══ */}
                {coursesForSelectedGrade.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pr-2 hidden sm:inline-flex items-center gap-1.5">
                            <Book className="w-3.5 h-3.5 text-indigo-400" /> Ders:
                        </span>
                        {coursesForSelectedGrade.map((course, idx) => {
                            const isSelected = selectedCourseId === course.id;
                            const grad = courseGradients[idx % courseGradients.length];
                            return (
                                <button
                                    key={course.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCourseId(course.id);
                                        setExpandedUnitIds([]); // Yeni ders seçildiğinde akordiyonlar kapalı başlar
                                    }}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border whitespace-nowrap shadow-sm",
                                        isSelected ? grad.active : grad.idle
                                    )}
                                >
                                    {course.title}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ═══ 4. ARAMA, FİLTRE VE İSTATİSTİK ÇUBUĞU ═══ */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Arama Input */}
                    <div className="relative flex-grow w-full md:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Konu veya ünite başlığında ara..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-10 bg-slate-950 border-white/10 text-white focus:border-teal-500/50 h-10 w-full text-xs rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Filtre ve Akordiyon Aç/Kapa Kontrolleri */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                        <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                            <SelectTrigger className="w-[170px] bg-slate-950 border-white/10 text-slate-300 text-xs h-10 rounded-xl">
                                <SelectValue placeholder="Durum Filtresi" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                                <SelectItem value="all">Tüm Konular</SelectItem>
                                <SelectItem value="has_items">Verisi Olanlar</SelectItem>
                                <SelectItem value="missing_items">Verisi Olmayanlar</SelectItem>
                                <SelectItem value="has_source">Kaynak Metni Olanlar</SelectItem>
                                <SelectItem value="missing_source">Kaynak Metni Olmayanlar</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToggleAllUnits}
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950 h-10 px-3.5 rounded-xl text-xs font-bold"
                        >
                            <Layers className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                            {expandedUnitIds.length === sortedUnits.length ? "Tümünü Kapat" : "Tümünü Aç"}
                        </Button>

                        {/* Canlı İstatistik Sayaçları */}
                        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-white/10">
                            <Badge variant="outline" className="bg-slate-950 border-white/10 text-slate-300 text-xs px-2.5 py-1">
                                <span className="text-teal-400 font-black mr-1">{courseStats.totalItems}</span> Veri
                            </Badge>
                            <Badge variant="outline" className="bg-slate-950 border-white/10 text-slate-300 text-xs px-2.5 py-1">
                                <span className="text-indigo-400 font-black mr-1">{courseStats.totalTopics}</span> Konu
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* ═══ 5. ÜNİTELER VE KONULAR (AKORDİYON MİMARİSİ - BAŞLANGIÇTA KAPALI) ═══ */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900/30 rounded-3xl border border-white/5">
                        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                        <span className="text-xs text-slate-400 font-medium">Müfredat ve etkinlik sayıları yükleniyor...</span>
                    </div>
                ) : filteredUnitsWithTopics.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/10 rounded-3xl bg-slate-900/40">
                        <Search className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm font-semibold text-slate-300">Bu kriterlere uygun ünite veya konu bulunamadı.</p>
                        <p className="text-xs text-slate-500 mt-1">Arama terimini değiştirmeyi veya filtreleri sıfırlamayı deneyin.</p>
                    </div>
                ) : (
                    <Accordion
                        type="multiple"
                        value={expandedUnitIds}
                        onValueChange={setExpandedUnitIds}
                        className="space-y-4"
                    >
                        {filteredUnitsWithTopics.map((unit, uIdx) => (
                            <AccordionItem
                                key={unit.id}
                                value={unit.id}
                                className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-lg transition-all"
                            >
                                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/[0.02] transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full pr-4 text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-black text-xs shrink-0">
                                                {uIdx + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                                                    {unit.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[11px] text-slate-400">
                                                        {unit.filteredTopics.length} Konu
                                                    </span>
                                                    <span className="text-[11px] text-slate-600">•</span>
                                                    <span className="text-[11px] text-teal-400 font-bold">
                                                        {unit.totalItemsInUnit} Veri Öğesi
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-center">
                                            <Badge variant="outline" className="bg-slate-950/80 border-white/10 text-slate-300 text-xs">
                                                {unit.totalItemsInUnit > 0 ? `${unit.totalItemsInUnit} Öğe` : 'Veri Yok'}
                                            </Badge>
                                        </div>
                                    </div>
                                </AccordionTrigger>

                                <AccordionContent className="px-5 pb-5 pt-2 border-t border-white/5 bg-black/20">
                                    {/* Konu Kartları Izgarası */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 mt-2">
                                        {unit.filteredTopics.map((topic, tIdx) => {
                                            const itemCount = topicCounts[topic.id] || 0;
                                            const hasSource = Boolean(topic.sourceText && topic.sourceText.trim().length > 0);

                                            return (
                                                <div
                                                    key={topic.id}
                                                    className="group p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-teal-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-teal-950/10 flex flex-col justify-between gap-3 relative overflow-hidden"
                                                >
                                                    <div className="space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="text-[11px] font-black text-teal-400">
                                                                #{tIdx + 1}
                                                            </span>
                                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                                {itemCount > 0 ? (
                                                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                                                                        {itemCount} Veri
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px]">
                                                                        Veri Yok
                                                                    </Badge>
                                                                )}
                                                                {hasSource && (
                                                                    <Badge variant="outline" className="bg-teal-500/10 text-teal-300 border-teal-500/30 text-[10px]">
                                                                        Metin Var
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <h4 className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-2 leading-snug group-hover:text-teal-300 transition-colors">
                                                            {topic.title}
                                                        </h4>
                                                    </div>

                                                    {/* Kart Aksiyon Butonları */}
                                                    <div className="pt-2 border-t border-white/5 flex items-center gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleOpenStudio(unit.id, topic.id)}
                                                            className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs h-8 rounded-xl shadow-md shadow-teal-900/20"
                                                        >
                                                            <Database className="w-3.5 h-3.5 mr-1 text-slate-950" />
                                                            Verileri Yönet
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUnitId(unit.id);
                                                                setSelectedTopicId(topic.id);
                                                                setIsAIGenOpen(true);
                                                            }}
                                                            title="Yapay Zeka ile Etkinlik Verisi Üret"
                                                            className="h-8 w-8 p-0 border-white/10 text-purple-300 hover:text-white hover:bg-purple-500/20 rounded-xl"
                                                        >
                                                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUnitId(unit.id);
                                                                setSelectedTopicId(topic.id);
                                                                handleOpenDialog({});
                                                            }}
                                                            title="Hızlı Yeni Veri Ekle"
                                                            className="h-8 w-8 p-0 border-white/10 text-emerald-300 hover:text-white hover:bg-emerald-500/20 rounded-xl"
                                                        >
                                                            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}

            </div>

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* ═══ 6. TAM EKRAN ETKİNLİK STÜDYOSU ÇALIŞMA MASASI (STUDIO MODAL) ═══ */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            <Dialog open={isStudioOpen} onOpenChange={setIsStudioOpen}>
                <DialogContent className="max-w-7xl w-[96vw] h-[92vh] bg-slate-950 border-white/10 text-white flex flex-col p-0 overflow-hidden shadow-2xl rounded-3xl">
                    
                    {/* Modal Üst Başlık & Konu Geçiş Navigasyonu */}
                    <div className="px-6 py-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-teal-500/20 rounded-xl border border-teal-500/30 text-teal-400">
                                <Database className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-[10px]">
                                        {selectedGrade}. Sınıf
                                    </Badge>
                                    <span className="text-xs text-slate-500">›</span>
                                    <span className="text-xs text-slate-400 font-medium truncate">
                                        {selectedCourseObj?.title}
                                    </span>
                                    <span className="text-xs text-slate-500">›</span>
                                    <span className="text-xs text-teal-300/80 font-medium truncate">
                                        {activeUnitObj?.title}
                                    </span>
                                </div>
                                <DialogTitle className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                                    {activeTopicObj?.title || "Etkinlik Stüdyosu"}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    {activeTopicObj?.title || "Seçilen konu"} etkinlik verileri yönetim masası
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Önceki / Sonraki Konu Navigasyonu */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStudioTopicNavigate('prev')}
                                className="h-8 px-2.5 border-white/10 text-slate-300 hover:text-white bg-slate-900 rounded-lg text-xs"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Önceki Konu
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStudioTopicNavigate('next')}
                                className="h-8 px-2.5 border-white/10 text-slate-300 hover:text-white bg-slate-900 rounded-lg text-xs"
                            >
                                Sonraki Konu <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>

                    {/* Modal Gövdesi */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-black/20">

                        {/* ══ KAYNAK METİN BİLGİ BARI ══ */}
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-indigo-950/40 border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                                    <BookOpen className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">Konu Kaynak Metni</span>
                                        {topicSourceText ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                                                {topicSourceText.split(/\s+/).filter(Boolean).length} kelime
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px]">
                                                Metin Yok
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-1 max-w-xl mt-0.5">
                                        {topicSourceText || 'Bu konuya ait kaynak metin bulunmuyor. AI veri üretimi için metin ekleyebilirsiniz.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                                {topicSourceText && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setIsSourceTextReaderOpen(true)}
                                        className="h-8 px-3 text-xs text-slate-300 hover:text-white hover:bg-white/10"
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1 text-teal-400" /> İncele
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setEditableSourceText(topicSourceText);
                                        setIsSourceTextEditorOpen(true);
                                    }}
                                    className="h-8 px-3 text-xs border-white/10 text-teal-300 hover:text-white hover:bg-teal-500/20 font-bold rounded-xl"
                                >
                                    <FilePenLine className="w-3.5 h-3.5 mr-1" /> {topicSourceText ? 'Düzenle' : '+ Metin Ekle'}
                                </Button>
                            </div>
                        </div>

                        {/* ══ ARAMA, VERİ TİPİ VE AKSİYONLAR ARAÇ ÇUBUĞU ══ */}
                        <div className="flex flex-col xl:flex-row items-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-white/5 shadow-md">
                            <div className="relative flex-grow w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input 
                                    placeholder="Bu konunun etkinlik verilerinde ara..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="pl-9 bg-slate-950 border-white/10 text-white focus:border-teal-500/50 h-9 w-full text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
                                <Select value={dataTypeFilter} onValueChange={(val: string) => { setDataTypeFilter(val); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-[150px] bg-slate-950 border-white/10 text-slate-300 text-xs h-9">
                                        <SelectValue placeholder="Veri Tipi" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                                        <SelectItem value="all">Tüm Veri Tipleri</SelectItem>
                                        <SelectItem value="concept">Kavram</SelectItem>
                                        <SelectItem value="definition">Tanım</SelectItem>
                                        <SelectItem value="sentence">Cümle</SelectItem>
                                        <SelectItem value="categorization">Kategorizasyon</SelectItem>
                                        <SelectItem value="sorting">Olay Sıralama</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-[120px] bg-slate-950 border-white/10 text-slate-300 text-xs h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                                        <SelectItem value="15">Sayfa: 15</SelectItem>
                                        <SelectItem value="25">Sayfa: 25</SelectItem>
                                        <SelectItem value="50">Sayfa: 50</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

                                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs h-9 px-3 rounded-xl shadow-md" onClick={() => setIsAIGenOpen(true)}>
                                    <Sparkles className="h-3.5 w-3.5 mr-1 text-yellow-300" /> AI ile Üret
                                </Button>
                                <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10 text-xs h-9 px-3 rounded-xl" onClick={() => setIsBulkOpen(true)}>
                                    <Upload className="h-3.5 w-3.5 mr-1" /> Toplu Ekle
                                </Button>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md" onClick={() => handleOpenDialog({})}>
                                    <PlusCircle className="h-3.5 w-3.5 mr-1" /> Yeni Veri
                                </Button>
                                <Button size="sm" variant="outline" disabled={filteredActivityItems.length === 0} className="border-white/10 text-slate-300 hover:text-white bg-slate-950 text-xs h-9 px-3 rounded-xl" onClick={handleDownload}>
                                    <Download className="h-3.5 w-3.5 mr-1" /> JSON
                                </Button>
                            </div>
                        </div>

                        {/* ══ ÇOKLU SEÇİM & TOPLU İŞLEM BARI ══ */}
                        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                            <div className="flex items-center gap-3 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/5">
                                <Checkbox
                                    id="select-all"
                                    checked={paginatedItems.length > 0 && paginatedItems.every(d => selectedItemIds.has(d.id))}
                                    onCheckedChange={handleSelectAllOnPage}
                                    disabled={paginatedItems.length === 0}
                                    className="border-white/20 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                                />
                                <Label htmlFor="select-all" className="text-xs font-semibold text-slate-300 cursor-pointer">
                                    Tümünü Seç ({paginatedItems.length})
                                </Label>
                            </div>

                            {selectedItemIds.size > 0 && (
                                <div className="flex items-center gap-2 animate-in fade-in duration-200">
                                    <Badge variant="secondary" className="bg-teal-500/20 text-teal-300 border-teal-500/30 px-2.5 py-1 text-xs font-bold">
                                        {selectedItemIds.size} Seçildi
                                    </Badge>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" disabled={isDeleting} className="bg-red-600 hover:bg-red-500 h-8 text-xs font-bold px-3">
                                                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Seçilenleri Sil
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-red-400">Emin misiniz?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-slate-400">
                                                    Bu işlem geri alınamaz. Seçilen {selectedItemIds.size} veri seti kalıcı olarak silinecektir.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white border-none" disabled={isDeleting}>
                                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Evet, Sil
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                        </div>

                        {/* ══ VERİ KARTLARI LİSTESİ ══ */}
                        {isItemsLoading ? (
                            <div className="flex flex-col justify-center items-center h-64 gap-3">
                                <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
                                <p className="text-xs text-slate-400 font-medium">Veriler veritabanından getiriliyor...</p>
                            </div>
                        ) : paginatedItems.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {paginatedItems.map((item, paginatedIndex) => {
                                    const globalIndex = (currentPage - 1) * itemsPerPage + paginatedIndex;
                                    return (
                                        <ActivityItemCard 
                                            key={item.id} 
                                            item={item}
                                            topicName={activeTopicObj?.title}
                                            index={globalIndex} 
                                            onEdit={() => handleOpenDialog(item)} 
                                            onDelete={handleDelete}
                                            onSelect={handleSelectId}
                                            isSelected={selectedItemIds.has(item.id)}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-white/10 rounded-3xl bg-slate-900/40">
                                <Database className="h-10 w-10 mb-3 opacity-20 text-teal-400" />
                                <p className="text-base font-bold text-slate-300">Bu konuya ait etkinlik verisi bulunamadı.</p>
                                <p className="text-xs text-slate-500 mt-1">Yukarıdaki "Yeni Veri" veya "AI ile Üret" butonunu kullanarak hemen kavram ve etkinlik ekleyebilirsiniz.</p>
                            </div>
                        )}

                        {/* Sayfalama Kontrolleri */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <span className="text-xs text-slate-400 font-medium">
                                    Toplam {filteredActivityItems.length} veri öğesi
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        disabled={currentPage === 1}
                                        className="border-white/10 text-slate-300 hover:text-white bg-slate-950 text-xs h-8"
                                    >
                                        Önceki
                                    </Button>
                                    <span className="text-xs font-bold text-white px-3 bg-slate-900 py-1 rounded-lg border border-white/10">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        disabled={currentPage >= totalPages}
                                        className="border-white/10 text-slate-300 hover:text-white bg-slate-950 text-xs h-8"
                                    >
                                        Sonraki
                                    </Button>
                                </div>
                            </div>
                        )}

                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══ 7. DİYALOGLAR (EDITOR, AI, BULK IMPORT, SOURCE TEXT) ═══ */}
            <AiActivityGenerationPanel
                isOpen={isAIGenOpen}
                onOpenChange={setIsAIGenOpen}
                context={aiGenerationContext}
                onDataGenerated={() => {
                    if (selectedTopicId) fetchItemsForTopic(selectedTopicId);
                }}
            />

            <BulkActivityImportDialog
                isOpen={isBulkOpen}
                onOpenChange={setIsBulkOpen}
                onImported={() => {
                    if (selectedTopicId) fetchItemsForTopic(selectedTopicId);
                }}
                context={aiGenerationContext}
            />

            {editingItem && (
                <ActivityItemEditorDialog
                    isOpen={!!editingItem}
                    onOpenChange={(isOpen) => !isOpen && setEditingItem(null)}
                    item={editingItem}
                    onSave={handleSave}
                    isSaving={isSaving}
                />
            )}

            {/* ══ KAYNAK METİN DÜZENLEME MODALI ══ */}
            <Dialog open={isSourceTextEditorOpen} onOpenChange={setIsSourceTextEditorOpen}>
                <DialogContent className="max-w-3xl bg-slate-900 border-white/10 text-white max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">
                                {selectedCourseObj?.className}
                            </Badge>
                            <span className="text-xs text-slate-400">›</span>
                            <span className="text-xs text-slate-400">{activeUnitObj?.title}</span>
                        </div>
                        <DialogTitle className="text-xl font-black text-white">
                            {activeTopicObj?.title} - Kaynak Metin
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Bu metin Sunum, Soru Bankası, Etkinlik Veri Bankası ve Yapay Zekâ stüdyolarında ortak referans olarak kullanılır.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 flex-grow flex flex-col">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold text-teal-300">
                                {editableSourceText.trim() ? editableSourceText.trim().split(/\s+/).filter(Boolean).length : 0} kelime • {editableSourceText.length.toLocaleString('tr-TR')} karakter
                            </span>
                        </div>

                        <Textarea
                            value={editableSourceText}
                            onChange={(e) => setEditableSourceText(e.target.value)}
                            placeholder="Müfredat ders kitabı veya konu anlatım metnini buraya yapıştırın veya yazın..."
                            className="min-h-[320px] bg-slate-950 border-white/10 text-white font-sans text-sm leading-relaxed p-4 rounded-xl resize-y flex-grow"
                        />
                    </div>

                    <DialogFooter className="border-t border-white/5 pt-3 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsSourceTextEditorOpen(false)}
                            disabled={isSavingSourceText}
                            className="border-white/10 text-slate-300 hover:bg-white/5"
                        >
                            Vazgeç
                        </Button>
                        <Button
                            onClick={handleSaveSourceTextFromActivity}
                            disabled={isSavingSourceText}
                            className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-6 shadow-lg shadow-teal-900/30"
                        >
                            {isSavingSourceText ? (
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

            {/* ══ KAYNAK METİN OKUMA MODALI ══ */}
            <Dialog open={isSourceTextReaderOpen} onOpenChange={setIsSourceTextReaderOpen}>
                <DialogContent className="max-w-3xl bg-slate-900 border-white/10 text-white max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">
                                {selectedCourseObj?.className}
                            </Badge>
                            <span className="text-xs text-slate-400">›</span>
                            <span className="text-xs text-slate-400">{activeUnitObj?.title}</span>
                        </div>
                        <DialogTitle className="text-xl font-black text-white">
                            {activeTopicObj?.title} - Kaynak Metin
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {activeTopicObj?.title} konusu kaynak metni
                        </DialogDescription>
                        <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                            <span>{topicSourceText ? topicSourceText.trim().split(/\s+/).filter(Boolean).length : 0} kelime</span>
                            <span>•</span>
                            <span>{topicSourceText.length.toLocaleString('tr-TR')} karakter</span>
                        </div>
                    </DialogHeader>

                    <div className="flex-grow overflow-y-auto pr-2 py-4 my-2 border-y border-white/5 bg-slate-950/60 rounded-xl p-5 shadow-inner">
                        <div className="text-base leading-relaxed whitespace-pre-wrap font-sans text-slate-200 selection:bg-teal-500/30">
                            {topicSourceText}
                        </div>
                    </div>

                    <DialogFooter className="pt-2 flex items-center justify-between gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(topicSourceText);
                                    toast({ title: "Kopyalandı", description: "Kaynak metin panoya kopyalandı." });
                                } catch(e) {}
                            }}
                            className="border-white/10 text-slate-300 hover:text-white"
                        >
                            <Copy className="w-3.5 h-3.5 mr-1.5 text-teal-400" /> Metni Kopyala
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsSourceTextReaderOpen(false)}
                                className="border-white/10 text-slate-300 hover:bg-white/5"
                            >
                                Kapat
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setIsSourceTextReaderOpen(false);
                                    setEditableSourceText(topicSourceText);
                                    setIsSourceTextEditorOpen(true);
                                }}
                                className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
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
