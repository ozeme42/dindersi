
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Workflow, Loader2, FilePenLine, Link as LinkIcon, BookOpen, Columns, Layers, ChevronRight, Hash, GraduationCap, Book, Home, FileText
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, query, where, orderBy } from 'firebase/firestore';
import type { SchoolClass, Course, Unit, Topic, Question } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardHeader } from '@/components/ui/card';

type EnrichedTopic = Topic & { questionCount?: number };
type EnrichedUnit = Unit & { topics: EnrichedTopic[], questionCount?: number };
type EnrichedCourse = Course & { units: EnrichedUnit[] };
type EnrichedClass = SchoolClass & { courses: EnrichedCourse[] };

const steps = [
    { id: 1, name: 'Sınıf Seçimi', icon: <Users className="w-6 h-6" /> },
    { id: 2, name: 'Ders Seçimi', icon: <Book className="w-6 h-6" /> },
    { id: 3, name: 'Ünite Yönetimi', icon: <Library className="w-6 h-6" /> }, // Değiştirildi
    { id: 4, name: 'Konu Yönetimi', icon: <ListTodo className="w-6 h-6" /> },
];

const colorClasses = [
    'bg-blue-600 border-blue-500 shadow-blue-500/20',
    'bg-emerald-600 border-emerald-500 shadow-emerald-500/20',
    'bg-purple-600 border-purple-500 shadow-purple-500/20',
    'bg-rose-600 border-rose-500 shadow-rose-500/20',
    'bg-amber-600 border-amber-500 shadow-amber-500/20',
    'bg-indigo-600 border-indigo-500 shadow-indigo-500/20',
    'bg-teal-600 border-teal-500 shadow-teal-500/20',
    'bg-cyan-600 border-cyan-500 shadow-cyan-500/20'
];


type DialogState = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu' | null;
    parentId?: string;
    currentItem?: { id: string; name?: string; title?: string; branches?: string[], externalLink?: string, sourceText?: string, isPublished?: boolean };
};

type BulkAddDialogState = {
    isOpen: boolean;
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu' | null;
    parentId?: string;
    parentName?: string;
};

type DeleteDialogState = {
    isOpen: boolean;
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu' | null;
    item: { id: string; name: string; path: string };
};

export default function DersAkisiPage() {
    const router = useRouter();
    const [curriculum, setCurriculum] = useState<EnrichedClass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [selections, setSelections] = useState({
        classId: '',
        courseId: '',
        unitId: '',
    });
    const [selectionNames, setSelectionNames] = useState({
        className: '',
        courseName: '',
        unitName: '',
    });

    const { toast } = useToast();

    const [dialogState, setDialogState] = useState<DialogState>({
        isOpen: false,
        mode: 'add',
        type: null,
    });
    const [deleteDialogState, setDeleteDialogState] =
        useState<DeleteDialogState | null>(null);
    const [bulkAddDialogState, setBulkAddDialogState] =
        useState<BulkAddDialogState>({ isOpen: false, type: null });

    const [isSaving, setIsSaving] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [branches, setBranches] = useState<string[]>([]);
    const [newBranchName, setNewBranchName] = useState('');
    const [externalLink, setExternalLink] = useState('');
    const [sourceText, setSourceText] = useState('');
    const [bulkText, setBulkText] = useState('');

    const fetchCurriculum = async () => {
        setIsLoading(true);
        try {
            const classesQuery = query(
                collection(db, 'classes'),
                orderBy('createdAt', 'asc')
            );
            const [classesSnapshot, allCoursesSnapshot, allQuestionsSnapshot] = await Promise.all([
                getDocs(classesQuery),
                getDocs(collection(db, 'courses')),
                getDocs(collection(db, 'questions')), 
            ]);
            
            const allQuestions = allQuestionsSnapshot.docs.map(doc => doc.data() as Question);

            const allCourses = allCoursesSnapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as Course)
            );
            const enrichedClasses: EnrichedClass[] = [];

            for (const classDoc of classesSnapshot.docs) {
                const classData = {
                    id: classDoc.id,
                    ...classDoc.data(),
                } as SchoolClass;
                const enrichedClass: EnrichedClass = { ...classData, courses: [] };

                const classCourses = allCourses.filter(
                    (course) => course.classId === classDoc.id
                );
                
                if (enrichedClasses.length === 0) {
                    const generalCourses = allCourses.filter(course => !course.classId);
                    classCourses.push(...generalCourses);
                }

                for (const courseData of classCourses) {
                    const enrichedCourse: EnrichedCourse = { ...courseData, units: [] };

                    const unitsSnapshot = await getDocs(
                        query(
                            collection(db, `courses/${courseData.id}/units`),
                            orderBy('title')
                        )
                    );
                    for (const unitDoc of unitsSnapshot.docs) {
                        const unitData = { id: unitDoc.id, ...unitDoc.data() } as Unit;
                        const enrichedUnit: EnrichedUnit = { ...unitData, topics: [], questionCount: 0 };

                        const topicsSnapshot = await getDocs(
                            query(
                                collection(
                                    db,
                                    `courses/${courseData.id}/units/${unitDoc.id}/topics`
                                ),
                                orderBy('title')
                            )
                        );
                        enrichedUnit.topics = topicsSnapshot.docs.map(
                            (topicDoc) => ({ id: topicDoc.id, ...topicDoc.data() } as Topic)
                        );
                        
                        const unitQuestionCount = allQuestions.filter(q => q.unitId === unitDoc.id).length;
                        enrichedUnit.questionCount = unitQuestionCount;

                        enrichedCourse.units.push(enrichedUnit);
                    }
                    enrichedClass.courses.push(enrichedCourse);
                }
                enrichedClasses.push(enrichedClass);
            }
            setCurriculum(enrichedClasses);
        } catch (error) {
            console.error('Error fetching curriculum: ', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCurriculum();
    }, []);

    const handleSelect = (
        type: 'class' | 'course' | 'unit',
        id: string,
        name: string
    ) => {
        if (type === 'class') {
            setSelections({ classId: id, courseId: '', unitId: '' });
            setSelectionNames({ className: name, courseName: '', unitName: '' });
        } else if (type === 'course') {
            setSelections((s) => ({ ...s, courseId: id, unitId: '' }));
            setSelectionNames((s) => ({ ...s, courseName: name, unitName: '' }));
        } else if (type === 'unit') {
            setSelections((s) => ({ ...s, unitId: id }));
            setSelectionNames((s) => ({ ...s, unitName: name }));
        }
        setCurrentStep((s) => s + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) {
            if (currentStep === 2) {
                setSelections({ classId: '', courseId: '', unitId: '' });
                setSelectionNames({ className: '', courseName: '', unitName: '' });
            } else if (currentStep === 3) {
                setSelections((s) => ({ ...s, courseId: '', unitId: '' }));
                setSelectionNames((s) => ({ ...s, courseName: '', unitName: '' }));
            } else if (currentStep === 4) {
                setSelections((s) => ({ ...s, unitId: '' }));
                setSelectionNames((s) => ({ ...s, unitName: '' }));
            }
            setCurrentStep((s) => s - 1);
        }
    };

    const selectedClass = useMemo(
        () => curriculum.find((c) => c.id === selections.classId),
        [curriculum, selections.classId]
    );
    const selectedCourse = useMemo(
        () => selectedClass?.courses.find((c) => c.id === selections.courseId),
        [selectedClass, selections.courseId]
    );
    const selectedUnit = useMemo(
        () => selectedCourse?.units.find((u) => u.id === selections.unitId),
        [selectedCourse, selections.unitId]
    );

    const openDialog = (
        mode: 'add' | 'edit',
        type: DialogState['type'],
        currentItem?: { id: string; name?: string; title?: string; branches?: string[], externalLink?: string, sourceText?: string, isPublished?: boolean },
        parentId?: string
    ) => {
        setDialogState({ isOpen: true, mode, type, parentId, currentItem });
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
        parentName?: string
    ) => {
        setBulkAddDialogState({ isOpen: true, type, parentId, parentName });
    };

    const handleSave = async () => {
        if (!dialogState.type) return;
        setIsSaving(true);
        const { type, mode, currentItem, parentId } = dialogState;

        const result = await saveCurriculumItem(type, mode, {
            name: newItemName,
            id: currentItem?.id,
            parentId: parentId,
            courseId: selections.courseId,
            branches: branches,
            externalLink: externalLink,
            sourceText: sourceText,
        });

        if (result.success) {
            toast({ title: 'Başarılı', description: `${type} kaydedildi.` });
            fetchCurriculum();
            setDialogState({ isOpen: false, mode: 'add', type: null });
        } else {
            toast({ title: 'Hata', description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteDialogState) return;
        setIsSaving(true);
        const result = await deleteCurriculumItem(deleteDialogState.item.path);
        if (result.success) {
            toast({
                title: 'Başarılı',
                description: `${deleteDialogState.type} silindi.`,
            });
            fetchCurriculum();
            setDeleteDialogState(null);
        } else {
            toast({ title: 'Hata', description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleTogglePublish = async (path: string, currentState: boolean) => {
        setIsSaving(true);
        const result = await togglePublishState(path, currentState);
        if (result.success) {
            toast({ title: 'Başarılı', description: `Durum güncellendi.` });
            await fetchCurriculum(); 
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    }

    const handleBulkSave = async () => {
        if (!bulkAddDialogState.type) return;
        setIsSaving(true);
        const names = bulkText.split('\n').map(n => n.trim()).filter(Boolean);
        const { type, parentId } = bulkAddDialogState;
        let finalParentId = parentId;
        if (type === 'Konu' && parentId) {
            finalParentId = `${selections.courseId}/${parentId}`;
        }

        const result = await bulkAddCurriculumItems(type, names, finalParentId);
        if (result.success) {
            toast({ title: "Başarılı", description: `${result.count} öğe eklendi.` });
            fetchCurriculum();
            setBulkAddDialogState({ isOpen: false, type: null });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    }

    const renderCourseContent = (courseGroups: CourseGroup[]) => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-[50vh]">
                    <Loader2 className="h-24 w-24 animate-spin text-cyan-500" />
                </div>
            );
        }

        if (courseGroups.length === 0) {
            return (
                <div className="text-center py-32 border-4 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/50">
                    <Layers className="h-32 w-32 mx-auto mb-8 text-slate-600 opacity-50" />
                    <p className="text-4xl font-bold text-slate-500">Bu bölümde gösterilecek ders materyali bulunmuyor.</p>
                </div>
            );
        }

        return (
            <Accordion type="multiple" className="w-full space-y-8">
                {courseGroups.map((group, groupIndex) => (
                    <AccordionItem value={group.title} key={group.title} className="border-none">
                        <Card className="bg-slate-900/80 backdrop-blur-xl border-2 border-white/10 shadow-2xl overflow-hidden rounded-[2.5rem]">
                            {/* Grup Başlığı */}
                            <CardHeader className="p-0 border-b border-white/5">
                                <AccordionTrigger className={cn(
                                    "text-3xl md:text-5xl font-black hover:no-underline px-8 py-8 transition-all",
                                    "text-white bg-white/5 hover:bg-white/10 data-[state=open]:bg-indigo-500/20 data-[state=open]:text-indigo-300"
                                )}>
                                    <div className="flex items-center gap-6">
                                        <div className="p-3 rounded-2xl bg-indigo-500/20">
                                            <Hash className="w-10 h-10 md:w-12 md:h-12 text-indigo-400" />
                                        </div>
                                        {group.title}
                                    </div>
                                </AccordionTrigger>
                            </CardHeader>
                            
                            <AccordionContent className="p-6 md:p-8 bg-slate-950/30">
                                <div className="space-y-6">
                                {group.courses.map((course, courseIndex) => (
                                    <div key={course.id} className="pl-6 md:pl-10 border-l-4 border-indigo-500/30">
                                            <div className="flex items-start">
                                                {/* Bağlantı Çizgisi */}
                                                <div className="w-8 h-1 bg-indigo-500/30 -ml-10 mt-10 mr-4"></div>
                                                
                                                <Accordion type="single" collapsible className="w-full">
                                                    <AccordionItem value={course.id} className="border-2 border-white/10 rounded-3xl bg-slate-900 overflow-hidden shadow-xl">
                                                        <AccordionTrigger className={cn(
                                                            "px-8 py-6 text-2xl md:text-3xl font-bold hover:no-underline transition-all",
                                                            "text-slate-200 hover:text-white hover:bg-white/5 data-[state=open]:bg-white/5 data-[state=open]:text-cyan-400"
                                                        )}>
                                                            <div className="flex items-center gap-6 w-full">
                                                                <div className="h-16 w-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black text-2xl border-2 border-cyan-500/30">
                                                                    {course.className?.charAt(0) || 'G'}
                                                                </div>
                                                                <span className="flex-1 text-left">
                                                                    {course.className && /^\d+$/.test(course.className) 
                                                                        ? `${course.className}.Sınıf` 
                                                                        : course.className
                                                                    }
                                                                </span>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="p-6 md:p-8 bg-black/20">
                                                            <div className="space-y-6">
                                                                {course.units.map((unit, unitIndex) => (
                                                                    <Accordion key={unit.id} type="multiple" className="w-full">
                                                                        <AccordionItem value={unit.id} className="border-2 border-white/5 rounded-2xl bg-slate-900/50 overflow-hidden">
                                                                                <AccordionTrigger className={cn(
                                                                                    "px-6 py-5 text-xl md:text-2xl font-bold hover:no-underline transition-colors",
                                                                                    "text-slate-400 hover:text-white hover:bg-white/5"
                                                                                )}>
                                                                                    <span className="flex items-center gap-4">
                                                                                        <div className="p-2 bg-white/5 rounded-lg">
                                                                                            <Book className="w-6 h-6 text-slate-500" />
                                                                                        </div>
                                                                                        {unit.title}
                                                                                    </span>
                                                                                </AccordionTrigger>
                                                                                <AccordionContent className="p-6 bg-black/20">
                                                                                    {unit.topics.length > 0 ? (
                                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                                                             {unit.htmlContent && (
                                                                                                 <Link 
                                                                                                    href={`/teacher/smartboard/ozetler/goruntule/${course.id}/${unit.id}`}
                                                                                                    className="group relative w-full flex flex-col justify-center items-center text-center font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] rounded-[2rem] shadow-2xl min-h-[14rem] break-words whitespace-normal leading-tight p-8 bg-gradient-to-br from-amber-500 to-orange-600 border-b-8 border-orange-800 text-white"
                                                                                                 >
                                                                                                    <FileText className="h-12 w-12 mb-4 opacity-70 group-hover:scale-110 transition-transform" />
                                                                                                    <span className="text-2xl md:text-3xl line-clamp-3">{unit.title} (Ünite Özeti)</span>
                                                                                                 </Link>
                                                                                            )}
                                                                                            {unit.topics.map((topic, topicIndex) => {
                                                                                                const isLink = topic.externalLink;
                                                                                                const presentationUrl = `/teacher/presentation?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}&courseName=${encodeURIComponent(course.title)}&unitName=${encodeURIComponent(unit.title)}`;
                                                                                                
                                                                                                const neonClass = colorClasses[(topicIndex + unitIndex + 2) % colorClasses.length];

                                                                                                return (
                                                                                                    <Link 
                                                                                                        key={topic.id}
                                                                                                        href={isLink ? topic.externalLink! : presentationUrl}
                                                                                                        target={isLink ? "_blank" : undefined}
                                                                                                        className={cn(
                                                                                                            "group relative w-full flex flex-col justify-center items-center text-center font-bold",
                                                                                                            "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                                                                                                            "rounded-[2rem] shadow-2xl min-h-[14rem]",
                                                                                                            "break-words whitespace-normal leading-tight p-8",
                                                                                                            neonClass
                                                                                                        )}
                                                                                                    >
                                                                                                        {/* İkon */}
                                                                                                        {isLink ? (
                                                                                                            <LinkIcon className="h-12 w-12 mb-4 opacity-70 group-hover:scale-110 transition-transform" />
                                                                                                        ) : (
                                                                                                            <GraduationCap className="h-12 w-12 mb-4 opacity-70 group-hover:scale-110 transition-transform" />
                                                                                                        )}

                                                                                                        {/* Başlık */}
                                                                                                        <span className="text-2xl md:text-3xl line-clamp-3">
                                                                                                            {topic.title}
                                                                                                        </span>

                                                                                                        {/* Action Buttons Overlay - Sabit Sağ Üst */}
                                                                                                        <div className={cn(
                                                                                                            "absolute top-4 right-4 flex gap-2 z-20",
                                                                                                            "transition-all duration-300 ease-in-out",
                                                                                                            
                                                                                                            // MOBİL (< 768px): Her zaman görünür ve yerinde
                                                                                                            "opacity-100 visible translate-y-0", 
                                                                                                            
                                                                                                            // MASAÜSTÜ (>= 768px): Başlangıçta Görünmez ve Gizli
                                                                                                            "md:opacity-0 md:invisible md:-translate-y-2",
                                                                                                            
                                                                                                            // MASAÜSTÜ HOVER: Görünür, Visible ve Yerine Gelir
                                                                                                            "md:group-hover:opacity-100 md:group-hover:visible md:group-hover:translate-y-0"
                                                                                                        )}>
                                                                                                            {(topic.steps?.length || 0) > 0 && !isLink && (
                                                                                                                <div 
                                                                                                                    onClick={(e) => {
                                                                                                                        e.preventDefault();
                                                                                                                        e.stopPropagation();
                                                                                                                        window.open(`/student/ders/${course.id}?topicId=${topic.id}`, '_blank');
                                                                                                                    }}
                                                                                                                    className="h-12 w-12 flex items-center justify-center rounded-xl bg-black/60 hover:bg-emerald-600 text-white border-2 border-white/20 backdrop-blur-md shadow-xl transition-all cursor-pointer"
                                                                                                                    title="Öğrenci Görünümü"
                                                                                                                >
                                                                                                                    <BookOpen className="h-6 w-6" />
                                                                                                                </div>
                                                                                                            )}
                                                                                                            <div 
                                                                                                                onClick={(e) => handleEditClick(e, topic, course.id, unit.id)}
                                                                                                                className="h-12 w-12 flex items-center justify-center rounded-xl bg-black/60 hover:bg-amber-600 text-white border-2 border-white/20 backdrop-blur-md shadow-xl transition-all cursor-pointer"
                                                                                                                title="Düzenle"
                                                                                                            >
                                                                                                                <FilePenLine className="h-6 w-6" />
                                                                                                            </div>
                                                                                                            <div 
                                                                                                                onClick={(e) => handleSummaryClick(e, course.id, unit.id, topic.id)}
                                                                                                                className="h-12 w-12 flex items-center justify-center rounded-xl bg-black/60 hover:bg-purple-600 text-white border-2 border-white/20 backdrop-blur-md shadow-xl transition-all cursor-pointer"
                                                                                                                title="Özet"
                                                                                                            >
                                                                                                                <Columns className="h-6 w-6" />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </Link>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="text-xl text-slate-500 italic p-8 text-center border-4 border-dashed border-slate-800 rounded-3xl">
                                                                                            Bu üniteye henüz konu eklenmemiş.
                                                                                        </div>
                                                                                    )}
                                                                                </AccordionContent>
                                                                        </AccordionItem>
                                                                    </Accordion>
                                                                ))}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion>
                                            </div>
                                    </div>
                                ))}
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    }

    const { className, courseName, unitName } = selectionNames;
    const groupName = useMemo(() => {
        const course = curriculum.find(c => c.id === selections.classId)?.courses.find(c => c.id === selections.courseId);
        if (!course) return '';
        const unit = course.units.find(u => u.id === selections.unitId);
        if (unit) {
            return `${course.title} > ${unit.title}`;
        }
        return course.title;
    }, [curriculum, selections]);

    const handleEditClick = (e: React.MouseEvent, topic: Topic, courseId: string, unitId: string) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/teacher/content-creation/edit?courseId=${courseId}&unitId=${unitId}&topicId=${topic.id}`);
    };

    const handleSummaryClick = (e: React.MouseEvent, courseId: string, unitId: string, topicId: string) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/teacher/ders-akisi/ozet/${topicId}?courseId=${courseId}&unitId=${unitId}`);
    }
    
    // Group courses by title for main accordion
    const courseGroups: CourseGroup[] = useMemo(() => {
        const grouped: { [title: string]: EnrichedCourse[] } = {};
        const allEnrichedCourses: EnrichedCourse[] = curriculum.flatMap(c => c.courses.map(course => ({...course, className: c.name})));
        
        allEnrichedCourses.forEach(course => {
            let courseTitle = course.title;
            if (courseTitle.toUpperCase() === 'DKAB') courseTitle = 'Din Kültürü ve Ahlak Bilgisi';
            else if (courseTitle.toUpperCase() === 'SİYER') courseTitle = 'Peygamberimizin Hayatı (Siyer)';

            if (!grouped[courseTitle]) {
                grouped[courseTitle] = [];
            }
            grouped[courseTitle].push(course);
        });

        return Object.keys(grouped)
            .map(title => ({
                title,
                courses: grouped[title].sort((a,b) => (a.className || '').localeCompare(b.className || '')),
            }))
            .sort((a,b) => {
                 if (a.title.includes('Din Kültürü')) return -1;
                 if (b.title.includes('Din Kültürü')) return 1;
                 return a.title.localeCompare(b.title);
            });
    }, [curriculum]);

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-6 md:p-10 relative overflow-hidden">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[200px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[200px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-[95%] mx-auto relative z-10 space-y-12">
                
                 {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight uppercase drop-shadow-2xl">
                            Ders Akışı
                        </h1>
                        <p className="text-slate-400 text-xl md:text-2xl font-medium max-w-3xl mt-4">
                            Akıllı tahta modu devrede. Müfredat ve konuları buradan yönetin.
                        </p>
                    </div>
                     <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white h-14 px-8 rounded-xl text-lg bg-slate-900/50 backdrop-blur-md">
                        <Link href="/teacher">
                            <Home className="mr-2 h-5 w-5" /> Ana Panele Dön
                        </Link>
                    </Button>
                </div>

                {/* İçerik */}
                {renderCourseContent(courseGroups)}
            </div>
        </div>
    );
}
