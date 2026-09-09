'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    PlusCircle,
    FilePenLine,
    ArrowLeft,
    ArrowRight,
    Loader2,
    Upload,
    Sparkles,
    Users,
    Book,
    Library,
    ListTodo,
    Check,
    ChevronDown,
    Trash2,
    ArrowDownAZ,
    CalendarClock,
    Search,
    Filter,
    Home,
    BookOpen,
    Eye,
    Copy,
    ChevronRight,
    ChevronLeft,
    SlidersHorizontal,
    Layers,
    ExternalLink,
    HelpCircle,
    FileText,
    CheckCircle2,
    X,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { saveTopicSourceText } from "@/app/teacher/source-texts/actions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuItem,
    DropdownMenuLabel,
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
import { collection, doc, getDoc, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import type { Question, Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { AIGenerationDialog } from "@/components/ai-generation-dialog";
import { BulkImportDialog } from "@/components/bulk-import-dialog";
import { cn } from "@/lib/utils";
import { saveQuestion, updateQuestionDifficulty, deleteBulkQuestions, saveBulkQuestions, saveGeneratedQuestions } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { QuestionEditorDialog } from "@/components/question-editor-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type EnrichedCourse = Course & { units: (Unit & { topics: Topic[] })[] };

const difficultyOptions: ('Kolay' | 'Orta' | 'Zor')[] = ['Kolay', 'Orta', 'Zor'];
const questionTypeOptions: Question['type'][] = ['Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma'];

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

function QuestionCard({ question, index, onEdit, onDifficultyChange, onSelect, isSelected }: { 
    question: Question, 
    index: number, 
    onEdit: () => void, 
    onDifficultyChange: (questionId: string, difficulty: Question['difficulty']) => void,
    onSelect: (questionId: string) => void,
    isSelected: boolean
}) {
    const difficultyColors = {
        'Kolay': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30',
        'Orta': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
        'Zor': 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
    };
    
    return (
        <Card className={cn(
            "flex flex-col hover:shadow-lg transition-all duration-300 bg-slate-900/60 backdrop-blur-sm border-white/5 hover:border-white/10 group relative overflow-hidden", 
            isSelected && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 bg-indigo-900/10"
        )}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <CardHeader className="flex flex-row items-start gap-4 pb-2 relative z-10">
                 <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(question.id)}
                    aria-label={`Select question ${index + 1}`}
                    className="mt-1 border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                />
                <div className="flex-1 space-y-1">
                    <div className="flex items-start gap-3">
                       <span className="font-black text-indigo-400 text-lg">#{index + 1}</span>
                       <p className="text-base font-medium text-slate-200 line-clamp-3 leading-relaxed">{question.text}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="py-2 px-4 ml-11 relative z-10">
                 <div className="p-3 bg-emerald-950/30 border-l-4 border-emerald-500 rounded-r-lg">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">Doğru Cevap</p>
                    <p className="text-sm font-medium text-emerald-100">{question.correctAnswer}</p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-black/20 p-3 mt-auto border-t border-white/5 relative z-10">
                 <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-white/10">{question.type}</Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Badge variant="outline" className={cn("cursor-pointer font-bold border", difficultyColors[question.difficulty || 'Orta'])}>
                                {question.difficulty || 'Orta'}
                            </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
                            <DropdownMenuLabel>Zorluğu Değiştir</DropdownMenuLabel>
                            {difficultyOptions.map(difficulty => (
                                <DropdownMenuItem key={difficulty} onClick={() => onDifficultyChange(question.id, difficulty)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    {difficulty}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
                <Button size="sm" variant="ghost" onClick={onEdit} className="text-slate-400 hover:text-white hover:bg-white/10 h-8">
                    <FilePenLine className="mr-2 h-3.5 w-3.5" /> Düzenle
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function ExamQuestionBankPage() {
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
    const [filterStatus, setFilterStatus] = useState<'all' | 'has_questions' | 'missing_questions' | 'has_source' | 'missing_source'>('all');

    // Studio Workspace Modal State
    const [isStudioOpen, setIsStudioOpen] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    
    // Questions State inside Studio
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([]);
    const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [sortBy, setSortBy] = useState<'text' | 'createdAt'>('text');

    // Dialog States
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingState, setEditingState] = useState<{ question: Question, index: number } | null>(null);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isAIGenOpen, setIsAIGenOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Source Text States
    const [topicSourceText, setTopicSourceText] = useState<string>('');
    const [isSourceTextLoading, setIsSourceTextLoading] = useState<boolean>(false);
    const [isSourceTextEditorOpen, setIsSourceTextEditorOpen] = useState<boolean>(false);
    const [isSourceTextReaderOpen, setIsSourceTextReaderOpen] = useState<boolean>(false);
    const [editableSourceText, setEditableSourceText] = useState<string>('');
    const [isSavingSourceText, setIsSavingSourceText] = useState<boolean>(false);

    const fetchInitialTree = useCallback(async () => {
        setIsLoading(true);
        try {
            const [manifestRes, countsRes, classesSnapshot] = await Promise.all([
                fetch('/curriculum/manifest.json'),
                fetch('/curriculum/question-counts.json').catch(() => null),
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

    // Fetch Questions for Studio Topic
    const fetchQuestionsForTopic = useCallback(async (topicId: string, unitId: string, courseId: string) => {
        if (!topicId) return;
        setIsQuestionsLoading(true);
        try {
            const qRef = query(collection(db, "questions"), where("topicId", "==", topicId));
            let fetchedQuestions: Question[] = [];

            try {
                const snap = await getDocs(qRef);
                fetchedQuestions = snap.docs.map(doc => {
                    const data = doc.data();
                    const createdAt = (data.createdAt as Timestamp)?.toDate?.()?.toISOString?.() || 
                        (typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString());
                    return {
                        ...data,
                        id: doc.id,
                        createdAt,
                    } as Question;
                });
            } catch (queryErr) {
                console.warn("Firestore query error:", queryErr);
            }

            if (fetchedQuestions.length === 0 && (topicCounts[topicId] || 0) > 0) {
                try {
                    const staticRes = await fetch(`/curriculum/questions/${topicId}.json`);
                    if (staticRes.ok) {
                        const staticList = await staticRes.json();
                        fetchedQuestions = staticList.map((q: any) => ({
                            ...q,
                            createdAt: q.createdAt || new Date(0).toISOString(),
                        }));
                    }
                } catch (err) {
                    console.warn("Could not load static questions:", err);
                }
            }

            setQuestions(fetchedQuestions);
            setTopicCounts(prev => ({ ...prev, [topicId]: fetchedQuestions.length }));
        } catch (error) {
            console.error("Error fetching questions for topic:", error);
            toast({ title: "Hata", description: "Sorular yüklenirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsQuestionsLoading(false);
        }
    }, [toast]);

    // Fetch Source Text for Studio Topic
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
            console.warn("Could not fetch topic source text:", err);
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
        setSelectedQuestions(new Set());
        setSearchTerm('');
        if (selectedCourseId) {
            fetchQuestionsForTopic(topicId, unitId, selectedCourseId);
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
            setSelectedQuestions(new Set());
            setSearchTerm('');
            if (selectedCourseId && selectedUnitId) {
                fetchQuestionsForTopic(nextTopic.id, selectedUnitId, selectedCourseId);
                fetchTopicSourceText(selectedCourseId, selectedUnitId, nextTopic.id);
            }
        }
    };

    // Save Source Text
    const handleSaveSourceTextFromQuestions = async () => {
        if (!selectedCourseId || !selectedUnitId || !selectedTopicId) return;
        setIsSavingSourceText(true);
        try {
            const res = await saveTopicSourceText(selectedCourseId, selectedUnitId, selectedTopicId, editableSourceText);
            if (res.success) {
                setTopicSourceText(editableSourceText.trim());
                setIsSourceTextEditorOpen(false);
                toast({ title: "Başarılı", description: "Konu kaynak metni güncellendi." });
            } else {
                toast({ title: "Hata", description: res.error || "Kaynak metin kaydedilemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message, variant: "destructive" });
        } finally {
            setIsSavingSourceText(false);
        }
    };

    // Filtered Questions inside Studio
    const filteredQuestions = useMemo(() => {
        let temp = questions;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            temp = temp.filter(q => (q.text || '').toLowerCase().includes(lower));
        }
        if (selectedQuestionTypes.length > 0) {
            temp = temp.filter(q => selectedQuestionTypes.includes(q.type));
        }
        if (selectedDifficulties.length > 0) {
            temp = temp.filter(q => Boolean(q.difficulty && selectedDifficulties.includes(q.difficulty)));
        }
        return [...temp].sort((a, b) => {
            if (sortBy === 'text') {
                return (a.text || '').localeCompare(b.text || '', 'tr');
            } else {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            }
        });
    }, [questions, searchTerm, selectedQuestionTypes, selectedDifficulties, sortBy]);

    const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
    const paginatedQuestions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredQuestions.slice(start, start + itemsPerPage);
    }, [filteredQuestions, currentPage, itemsPerPage]);

    // Question Actions
    const handleOpenEditor = (question: Partial<Question> | null, index: number = -1) => {
        if (!selectedCourseObj || !activeUnitObj || !activeTopicObj) return;
        const questionContext = {
            classId: selectedCourseObj.classId || '',
            className: selectedCourseObj.className || '',
            courseId: selectedCourseObj.id,
            unitId: activeUnitObj.id,
            topicId: activeTopicObj.id,
            topic: activeTopicObj.title,
        };

        setEditingState({
            question: question ? (question as Question) : {
                id: `new-${Date.now()}`,
                text: '',
                type: 'Çoktan Seçmeli',
                difficulty: 'Orta',
                options: ['', '', '', ''],
                correctAnswer: '',
                ...questionContext,
            },
            index
        });
        setIsEditorOpen(true);
    };

    const handleSaveQuestion = async (questionToSave: Question): Promise<Question | null> => {
        if (!questionToSave) return null;
        setIsSaving(true);
        const result = await saveQuestion(questionToSave);

        if (result.success && result.question) {
            toast({ title: "Başarılı", description: "Soru kaydedildi." });
            const savedQ = result.question as Question;
            setQuestions(prev => {
                const exists = prev.some(q => q.id === savedQ.id);
                if (exists) return prev.map(q => q.id === savedQ.id ? savedQ : q);
                return [savedQ, ...prev];
            });
            if (selectedTopicId) {
                setTopicCounts(prev => ({
                    ...prev,
                    [selectedTopicId]: (prev[selectedTopicId] || 0) + (questionToSave.id?.startsWith('new-') ? 1 : 0)
                }));
            }
            setIsSaving(false);
            setEditingState(prev => prev ? { ...prev, question: savedQ } : null);
            return savedQ;
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
            setIsSaving(false);
            return null;
        }
    };

    const handleNavigate = async (currentData: Question, direction: 'prev' | 'next') => {
        const savedData = await handleSaveQuestion(currentData);
        if (!savedData) return;
        if (editingState) {
            const newIndex = direction === 'next' ? editingState.index + 1 : editingState.index - 1;
            if (newIndex >= 0 && newIndex < filteredQuestions.length) {
                setEditingState({ question: filteredQuestions[newIndex], index: newIndex });
            }
        }
    };

    const handleDifficultyChange = async (questionId: string, difficulty: Question['difficulty']) => {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, difficulty } : q));
        const result = await updateQuestionDifficulty(questionId, difficulty);
        if (!result.success) {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
            if (selectedTopicId && selectedUnitId && selectedCourseId) {
                fetchQuestionsForTopic(selectedTopicId, selectedUnitId, selectedCourseId);
            }
        } else {
            toast({ title: "Başarılı", description: "Zorluk seviyesi güncellendi." });
        }
    };

    const handleSelectQuestion = (questionId: string) => {
        setSelectedQuestions(prev => {
            const next = new Set(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
        });
    };

    const handleSelectAllOnPage = () => {
        const allOnPageIds = paginatedQuestions.map(q => q.id);
        const currentSelection = new Set(selectedQuestions);
        const allSelected = paginatedQuestions.length > 0 && allOnPageIds.every(id => currentSelection.has(id));

        if (allSelected) {
            allOnPageIds.forEach(id => currentSelection.delete(id));
        } else {
            allOnPageIds.forEach(id => currentSelection.add(id));
        }
        setSelectedQuestions(currentSelection);
    };

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        const idsToDelete = Array.from(selectedQuestions);
        const result = await deleteBulkQuestions(idsToDelete, selectedTopicId);
        if (result.success) {
            toast({ title: "Başarılı", description: `${result.count} soru silindi.` });
            setQuestions(prev => prev.filter(q => !selectedQuestions.has(q.id)));
            if (selectedTopicId) {
                setTopicCounts(prev => ({
                    ...prev,
                    [selectedTopicId]: Math.max(0, (prev[selectedTopicId] || 0) - idsToDelete.length)
                }));
            }
            setSelectedQuestions(new Set());
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsDeleting(false);
    };

    const handleDeleteSingleQuestion = async (questionId: string) => {
        const result = await deleteBulkQuestions([questionId], selectedTopicId);
        if (result.success) {
            toast({ title: "Başarılı", description: "Soru silindi." });
            setQuestions(prev => prev.filter(q => q.id !== questionId));
            if (selectedTopicId) {
                setTopicCounts(prev => ({
                    ...prev,
                    [selectedTopicId]: Math.max(0, (prev[selectedTopicId] || 0) - 1)
                }));
            }
            setSelectedQuestions(prev => {
                const next = new Set(prev);
                next.delete(questionId);
                return next;
            });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    };

    // AI Generation Context for Studio
    const aiGenerationContext = useMemo(() => {
        if (!selectedCourseObj || !activeUnitObj || !activeTopicObj) return null;
        return {
            selection: {
                classId: selectedCourseObj.classId || '',
                courseId: selectedCourseObj.id,
                unitId: activeUnitObj.id,
                topicId: activeTopicObj.id,
            },
            selectionNames: {
                className: selectedCourseObj.className || '',
                courseName: selectedCourseObj.title,
                unitName: activeUnitObj.title,
                topicName: activeTopicObj.title,
            },
            sourceText: topicSourceText || activeTopicObj.sourceText || '',
            isLoadingSourceText: isSourceTextLoading,
        };
    }, [selectedCourseObj, activeUnitObj, activeTopicObj, topicSourceText, isSourceTextLoading]);

    // Total Stats for Selected Course
    const courseStats = useMemo(() => {
        let totalTopics = 0;
        let totalQuestions = 0;
        let topicsWithQuestions = 0;

        for (const u of sortedUnits) {
            for (const t of u.topics || []) {
                totalTopics++;
                const count = topicCounts[t.id] || 0;
                totalQuestions += count;
                if (count > 0) topicsWithQuestions++;
            }
        }
        return {
            totalUnits: sortedUnits.length,
            totalTopics,
            totalQuestions,
            topicsWithQuestions,
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
            if (filterStatus === 'has_questions') {
                topics = topics.filter(t => (topicCounts[t.id] || 0) > 0);
            } else if (filterStatus === 'missing_questions') {
                topics = topics.filter(t => (topicCounts[t.id] || 0) === 0);
            } else if (filterStatus === 'has_source') {
                topics = topics.filter(t => Boolean(t.sourceText && t.sourceText.trim().length > 0));
            } else if (filterStatus === 'missing_source') {
                topics = topics.filter(t => !t.sourceText || t.sourceText.trim().length === 0);
            }
            return {
                ...unit,
                filteredTopics: topics,
                totalQuestionsInUnit: (unit.topics || []).reduce((acc, t) => acc + (topicCounts[t.id] || 0), 0)
            };
        }).filter(unit => unit.filteredTopics.length > 0 || !searchQuery.trim());
    }, [sortedUnits, searchQuery, filterStatus, topicCounts]);

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[-10%] w-[800px] h-[800px] bg-indigo-900/15 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] bg-amber-900/10 rounded-full blur-[140px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-6">

                {/* ═══ 1. ÜST BAŞLIK VE KOKPİT ═══ */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/30 text-amber-400 shadow-xl shadow-amber-950/20">
                            <FilePenLine className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase drop-shadow-md">
                                    Soru Bankası
                                </h1>
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold text-xs">
                                    İÇERİK YÖNETİMİ MODU
                                </Badge>
                            </div>
                            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
                                Ünite ve konu hiyerarşisinde tüm soruları inceleyin, düzenleyin ve yapay zeka ile üretin.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start md:self-auto">
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
                        <Users className="w-3.5 h-3.5 text-indigo-400" /> Sınıf:
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
                            <Book className="w-3.5 h-3.5 text-purple-400" /> Ders:
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
                            className="pl-10 bg-slate-950 border-white/10 text-white focus:border-amber-500/50 h-10 w-full text-xs rounded-xl"
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
                                <SelectItem value="has_questions">Sorusu Olanlar</SelectItem>
                                <SelectItem value="missing_questions">Sorusu Olmayanlar</SelectItem>
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
                            <Layers className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                            {expandedUnitIds.length === sortedUnits.length ? "Tümünü Kapat" : "Tümünü Aç"}
                        </Button>

                        {/* Canlı İstatistik Sayaçları */}
                        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-white/10">
                            <Badge variant="outline" className="bg-slate-950 border-white/10 text-slate-300 text-xs px-2.5 py-1">
                                <span className="text-amber-400 font-black mr-1">{courseStats.totalQuestions}</span> Soru
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
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        <span className="text-xs text-slate-400 font-medium">Müfredat ve soru sayıları yükleniyor...</span>
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
                                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-xs shrink-0">
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
                                                    <span className="text-[11px] text-amber-400 font-bold">
                                                        {unit.totalQuestionsInUnit} Soru
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-center">
                                            <Badge variant="outline" className="bg-slate-950/80 border-white/10 text-slate-300 text-xs">
                                                {unit.totalQuestionsInUnit > 0 ? `${unit.totalQuestionsInUnit} Soru` : 'Soru Yok'}
                                            </Badge>
                                        </div>
                                    </div>
                                </AccordionTrigger>

                                <AccordionContent className="px-5 pb-5 pt-2 border-t border-white/5 bg-black/20">
                                    {/* Konu Kartları Izgarası */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 mt-2">
                                        {unit.filteredTopics.map((topic, tIdx) => {
                                            const questionCount = topicCounts[topic.id] || 0;
                                            const hasSource = Boolean(topic.sourceText && topic.sourceText.trim().length > 0);

                                            return (
                                                <div
                                                    key={topic.id}
                                                    className="group p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-amber-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-amber-950/10 flex flex-col justify-between gap-3 relative overflow-hidden"
                                                >
                                                    <div className="space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="text-[11px] font-black text-indigo-400">
                                                                #{tIdx + 1}
                                                            </span>
                                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                                {questionCount > 0 ? (
                                                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                                                                        {questionCount} Soru
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px]">
                                                                        Soru Yok
                                                                    </Badge>
                                                                )}
                                                                {hasSource && (
                                                                    <Badge variant="outline" className="bg-teal-500/10 text-teal-300 border-teal-500/30 text-[10px]">
                                                                        Metin Var
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <h4 className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
                                                            {topic.title}
                                                        </h4>
                                                    </div>

                                                    {/* Kart Aksiyon Butonları */}
                                                    <div className="pt-2 border-t border-white/5 flex items-center gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleOpenStudio(unit.id, topic.id)}
                                                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs h-8 rounded-xl shadow-md shadow-amber-900/20"
                                                        >
                                                            <FilePenLine className="w-3.5 h-3.5 mr-1 text-slate-950" />
                                                            Soruları Yönet
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUnitId(unit.id);
                                                                setSelectedTopicId(topic.id);
                                                                if (selectedCourseId) {
                                                                    fetchTopicSourceText(selectedCourseId, unit.id, topic.id);
                                                                }
                                                                setIsAIGenOpen(true);
                                                            }}
                                                            title="Yapay Zeka ile Soru Üret"
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
                                                                handleOpenEditor(null);
                                                            }}
                                                            title="Hızlı Yeni Soru Ekle"
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

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* ═══ 6. TAM EKRAN SORU STÜDYOSU ÇALIŞMA MASASI (STUDIO MODAL) ═══ */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <Dialog open={isStudioOpen} onOpenChange={setIsStudioOpen}>
                <DialogContent className="max-w-7xl w-[96vw] h-[92vh] bg-slate-950 border-white/10 text-white flex flex-col p-0 overflow-hidden shadow-2xl rounded-3xl">
                    
                    {/* Modal Üst Başlık & Konu Geçiş Navigasyonu */}
                    <div className="px-6 py-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30 text-amber-400">
                                <FilePenLine className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                                        {selectedGrade}. Sınıf
                                    </Badge>
                                    <span className="text-xs text-slate-500">›</span>
                                    <span className="text-xs text-slate-400 font-medium truncate">
                                        {selectedCourseObj?.title}
                                    </span>
                                    <span className="text-xs text-slate-500">›</span>
                                    <span className="text-xs text-amber-300/80 font-medium truncate">
                                        {activeUnitObj?.title}
                                    </span>
                                </div>
                                <DialogTitle className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                                    {activeTopicObj?.title || "Soru Bankası Stüdyosu"}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    {activeTopicObj?.title || "Seçilen konu"} soruları yönetim masası
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
                                        {topicSourceText || 'Bu konuya ait kaynak metin bulunmuyor. AI soru üretimi için metin ekleyebilirsiniz.'}
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

                        {/* ══ ARAMA, FİLTRE VE AKSİYONLAR ARAÇ ÇUBUĞU ══ */}
                        <div className="flex flex-col xl:flex-row items-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-white/5 shadow-md">
                            <div className="relative flex-grow w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input 
                                    placeholder="Bu konunun sorularında ara..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="pl-9 bg-slate-950 border-white/10 text-white focus:border-amber-500/50 h-9 w-full text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:text-white bg-slate-950 text-xs h-9">
                                            <Filter className="mr-1.5 h-3.5 w-3.5 text-indigo-400"/> Zorluk <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-slate-900 border-white/10 text-white text-xs">
                                        {difficultyOptions.map(option => (
                                            <DropdownMenuCheckboxItem
                                                key={option}
                                                checked={selectedDifficulties.includes(option)}
                                                onSelect={(e) => e.preventDefault()}
                                                onCheckedChange={(checked) => {
                                                    setSelectedDifficulties(checked 
                                                        ? [...selectedDifficulties, option] 
                                                        : selectedDifficulties.filter(item => item !== option)
                                                    );
                                                    setCurrentPage(1);
                                                }}
                                                className="focus:bg-white/10 focus:text-white cursor-pointer"
                                            >
                                                {option}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:text-white bg-slate-950 text-xs h-9">
                                            <ListTodo className="mr-1.5 h-3.5 w-3.5 text-purple-400"/> Soru Tipi <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-slate-900 border-white/10 text-white text-xs">
                                        {questionTypeOptions.map(option => (
                                            <DropdownMenuCheckboxItem
                                                key={option}
                                                checked={selectedQuestionTypes.includes(option)}
                                                onSelect={(e) => e.preventDefault()}
                                                onCheckedChange={(checked) => {
                                                    setSelectedQuestionTypes(checked 
                                                        ? [...selectedQuestionTypes, option] 
                                                        : selectedQuestionTypes.filter(item => item !== option)
                                                    );
                                                    setCurrentPage(1);
                                                }}
                                                className="focus:bg-white/10 focus:text-white cursor-pointer"
                                            >
                                                {option}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

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
                                    <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-300" /> AI Üretim
                                </Button>
                                <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10 text-xs h-9 px-3 rounded-xl" onClick={() => setIsBulkOpen(true)}>
                                    <Upload className="h-3.5 w-3.5 mr-1" /> Toplu Ekle
                                </Button>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md" onClick={() => handleOpenEditor(null)}>
                                    <PlusCircle className="h-3.5 w-3.5 mr-1" /> Yeni Soru
                                </Button>
                            </div>
                        </div>

                        {/* ══ ÇOKLU SEÇİM & TOPLU İŞLEM BARI ══ */}
                        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                            <div className="flex items-center gap-3 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/5">
                                <Checkbox
                                    id="select-all"
                                    checked={paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestions.has(q.id))}
                                    onCheckedChange={handleSelectAllOnPage}
                                    disabled={paginatedQuestions.length === 0}
                                    className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                />
                                <Label htmlFor="select-all" className="text-xs font-semibold text-slate-300 cursor-pointer">
                                    Tümünü Seç ({paginatedQuestions.length})
                                </Label>
                            </div>

                            {selectedQuestions.size > 0 && (
                                <div className="flex items-center gap-2 animate-in fade-in duration-200">
                                    <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 px-2.5 py-1 text-xs font-bold">
                                        {selectedQuestions.size} Seçildi
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
                                                    Bu işlem geri alınamaz. Seçilen {selectedQuestions.size} soru kalıcı olarak silinecektir.
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

                        {/* ══ SORU KARTLARI LİSTESİ ══ */}
                        {isQuestionsLoading ? (
                            <div className="flex flex-col justify-center items-center h-64 gap-3">
                                <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
                                <p className="text-xs text-slate-400 font-medium">Sorular veritabanından getiriliyor...</p>
                            </div>
                        ) : paginatedQuestions.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {paginatedQuestions.map((question, paginatedIndex) => {
                                    const globalIndex = (currentPage - 1) * itemsPerPage + paginatedIndex;
                                    return (
                                        <QuestionCard 
                                            key={question.id} 
                                            question={question} 
                                            index={globalIndex} 
                                            onEdit={() => handleOpenEditor(question, globalIndex)} 
                                            onDifficultyChange={handleDifficultyChange}
                                            onSelect={() => handleSelectQuestion(question.id)}
                                            isSelected={selectedQuestions.has(question.id)}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-white/10 rounded-3xl bg-slate-900/40">
                                <Search className="h-10 w-10 mb-3 opacity-20" />
                                <p className="text-base font-bold text-slate-300">Bu konuya ait soru bulunamadı.</p>
                                <p className="text-xs text-slate-500 mt-1">Yukarıdaki "Yeni Soru" veya "AI Üretim" butonunu kullanarak hemen soru ekleyebilirsiniz.</p>
                            </div>
                        )}

                        {/* Sayfalama Kontrolleri */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <span className="text-xs text-slate-400 font-medium">
                                    Toplam {filteredQuestions.length} soru
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
            {editingState && (
                <QuestionEditorDialog 
                    key={editingState.question.id} 
                    isOpen={isEditorOpen} 
                    onOpenChange={setIsEditorOpen} 
                    editingState={editingState} 
                    onSave={handleSaveQuestion} 
                    onNavigate={handleNavigate} 
                    isSaving={isSaving} 
                    totalQuestions={filteredQuestions.length} 
                    curriculum={allData.courses} 
                    classes={allData.classes} 
                    onDelete={handleDeleteSingleQuestion} 
                />
            )}

            <AIGenerationDialog 
                isOpen={isAIGenOpen} 
                onOpenChange={setIsAIGenOpen} 
                onQuestionsGenerated={() => {
                    if (selectedTopicId && selectedUnitId && selectedCourseId) {
                        fetchQuestionsForTopic(selectedTopicId, selectedUnitId, selectedCourseId);
                    }
                }} 
                context={aiGenerationContext}
                onSave={saveGeneratedQuestions}
            />

            <BulkImportDialog 
                isOpen={isBulkOpen} 
                onOpenChange={setIsBulkOpen} 
                onQuestionsImported={() => {
                    if (selectedTopicId && selectedUnitId && selectedCourseId) {
                        fetchQuestionsForTopic(selectedTopicId, selectedUnitId, selectedCourseId);
                    }
                }} 
                context={selectedTopicId && selectedCourseObj && activeUnitObj && activeTopicObj ? {
                    selection: {
                        classId: selectedCourseObj.classId || '',
                        courseId: selectedCourseObj.id,
                        unitId: activeUnitObj.id,
                        topicId: activeTopicObj.id,
                    },
                    selectionNames: {
                        className: selectedCourseObj.className || '',
                        courseName: selectedCourseObj.title,
                        unitName: activeUnitObj.title,
                        topicName: activeTopicObj.title,
                    }
                } : null}
                onSave={saveBulkQuestions}
            />

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
                            Bu konu için ders kitabı metnini veya özetini girin. Kaydettiğinizde soru bankası ve AI soru üretimi ile anında senkronize olur.
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
                            placeholder="Konu kaynak metnini buraya yapıştırın..."
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
                            onClick={handleSaveSourceTextFromQuestions}
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

            {/* ══ KAYNAK METİN OKUMA / İNCELEME MODALI ══ */}
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
