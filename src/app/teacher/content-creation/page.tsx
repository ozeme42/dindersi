'use client';

import { useState, useEffect, useMemo } from 'react';
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
    LayoutGrid
} from 'lucide-react';
import {
    saveCurriculumItem,
    deleteCurriculumItem,
    bulkAddCurriculumItems,
} from './actions';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
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
import type { SchoolClass, Course, Unit, Topic } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

type EnrichedCourse = Course & { units: (Unit & { topics: Topic[] })[] };
type EnrichedClass = SchoolClass & { courses: EnrichedCourse[] };

const steps = [
    { id: 1, name: 'Sınıf Seçimi', icon: Users },
    { id: 2, name: 'Ders Seçimi', icon: Book },
    { id: 3, name: 'Ünite Seçimi', icon: Library },
    { id: 4, name: 'Konu Yönetimi', icon: ListTodo },
];

type DialogState = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu' | null;
    parentId?: string;
    currentItem?: { id: string; name?: string; title?: string; branches?: string[], externalLink?: string, sourceText?: string };
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

export default function ContentCreationPage() {
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
            const [classesSnapshot, coursesSnapshot] = await Promise.all([
                getDocs(classesQuery),
                getDocs(collection(db, 'courses')),
            ]);

            const allCourses = coursesSnapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as Course)
            );
            const enrichedClasses: EnrichedClass[] = [];

            for (const [index, classDoc] of classesSnapshot.docs.entries()) {
                const classData = {
                    id: classDoc.id,
                    ...classDoc.data(),
                } as SchoolClass;
                const enrichedClass: EnrichedClass = { ...classData, courses: [] };

                const classCourses = allCourses.filter(
                    (course) => course.classId === classDoc.id || (!course.classId && index === 0)
                );

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
                        const enrichedUnit = { ...unitData, topics: [] };

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
        currentItem?: { id: string; name?: string; title?: string; branches?: string[], externalLink?: string, sourceText?: string },
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
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
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
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

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

    const renderCurrentStep = () => {
        if (isLoading) {
            return (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                </div>
            );
        }

        let itemsToRender: any[] = [];
        let itemTitleKey = 'name';
        let handleItemEdit = (item: any) => { };
        let handleItemDelete = (item: any) => { };

        switch (currentStep) {
            case 1:
                itemsToRender = curriculum;
                handleItemEdit = (item) => openDialog('edit', 'Sınıf', item);
                handleItemDelete = (item) => openDeleteDialog('Sınıf', { ...item, path: `classes/${item.id}` });
                break;
            case 2:
                itemsToRender = selectedClass?.courses || [];
                itemTitleKey = 'title';
                handleItemEdit = (item) => openDialog('edit', 'Ders', item, selections.classId);
                handleItemDelete = (item) => openDeleteDialog('Ders', { ...item, path: `courses/${item.id}` });
                break;
            case 3:
                itemsToRender = selectedCourse?.units || [];
                itemTitleKey = 'title';
                handleItemEdit = (item) => openDialog('edit', 'Ünite', item, selections.courseId);
                handleItemDelete = (item) => openDeleteDialog('Ünite', { ...item, path: `courses/${selections.courseId}/units/${item.id}` });
                break;
            case 4:
                itemsToRender = selectedUnit?.topics || [];
                itemTitleKey = 'title';
                handleItemEdit = (item) => openDialog('edit', 'Konu', item, selections.unitId);
                handleItemDelete = (item) => openDeleteDialog('Konu', { ...item, path: `courses/${selections.courseId}/units/${selections.unitId}/topics/${item.id}` });
                break;
            default:
                return null;
        }

        if (itemsToRender.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                    <FolderPlus className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Bu seviyede içerik bulunmuyor.</p>
                    <p className="text-sm opacity-70">Yeni öğe ekleyerek başlayın.</p>
                </div>
            );
        }

        const isTopicStep = currentStep === 4;

        const handleButtonClick = (item: any) => {
            const displayName = item[itemTitleKey] || item.name;
            if (isTopicStep) {
                router.push(`/teacher/content-creation/edit?courseId=${selections.courseId}&unitId=${selections.unitId}&topicId=${item.id}`);
            } else {
                let type: 'class' | 'course' | 'unit' = 'class';
                if (currentStep === 2) type = 'course';
                if (currentStep === 3) type = 'unit';
                handleSelect(type, item.id, displayName);
            }
        };

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

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {itemsToRender.map((item, index) => {
                    const colorClass = colorClasses[index % colorClasses.length];
                    return (
                        <div key={item.id} className="relative group h-40">
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full h-full p-4 flex flex-col items-center justify-center text-center transition-all duration-300",
                                    "rounded-2xl border-b-[6px] active:border-b-0 active:translate-y-[6px] hover:-translate-y-1",
                                    "text-white shadow-xl hover:shadow-2xl",
                                    colorClass
                                )}
                                onClick={() => handleButtonClick(item)}
                            >
                                <div className="p-3 bg-white/20 rounded-full mb-3 shadow-inner">
                                    {isTopicStep ? <FilePenLine className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
                                </div>
                                <span className="text-lg font-bold leading-tight line-clamp-2">
                                    {item[itemTitleKey] || item.name}
                                </span>
                            </Button>
                            
                            {/* Hover Actions Overlay */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg shadow-md bg-white text-slate-900 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); handleItemEdit(item); }} title="Düzenle">
                                    <FilePenLine className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="destructive" className="h-8 w-8 rounded-lg shadow-md" onClick={(e) => { e.stopPropagation(); handleItemDelete(item); }} title="Sil">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };


    const getAddButtonAction = () => {
        switch (currentStep) {
            case 1:
                return () => openDialog('add', 'Sınıf');
            case 2:
                return () => openDialog('add', 'Ders', undefined, selections.classId);
            case 3:
                return () => openDialog('add', 'Ünite', undefined, selections.courseId);
            case 4:
                return () => openDialog('add', 'Konu', undefined, selections.unitId);
            default:
                return () => { };
        }
    };

    const getBulkAddButtonAction = () => {
        switch (currentStep) {
            case 1:
                return () => openBulkAddDialog('Sınıf');
            case 2:
                return () => openBulkAddDialog('Ders', selections.classId, selectionNames.className);
            case 3:
                return () => openBulkAddDialog('Ünite', selections.courseId, selectionNames.courseName);
            case 4:
                return () => openBulkAddDialog('Konu', selections.unitId, selectionNames.unitName);
            default:
                return null;
        }
    };

    const getBulkAddButtonType = () => {
        switch (currentStep) {
            case 1: return 'Sınıf';
            case 2: return 'Ders';
            case 3: return 'Ünite';
            case 4: return 'Konu';
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
             
             {/* Arka Plan */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                
                {/* Header */}
                <div className="text-center space-y-4 py-6">
                    <div className="inline-flex items-center justify-center p-4 bg-slate-900 border border-white/10 rounded-full shadow-2xl mb-2">
                        <Sparkles className="h-10 w-10 text-purple-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow-lg">
                        İçerik Sihirbazı
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                        Müfredat yapısını adım adım oluşturun ve yönetin.
                    </p>
                </div>

                {/* Stepper */}
                <div className="flex justify-center items-center px-4 w-full mb-8">
                    <div className="relative flex items-center justify-between w-full max-w-3xl">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                        <div 
                            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 -z-10 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                        ></div>

                        {steps.map((step, index) => {
                            const isCompleted = currentStep > step.id;
                            const isActive = currentStep === step.id;
                            
                            return (
                                <div key={step.id} 
                                    className="flex flex-col items-center gap-3 group cursor-pointer"
                                    onClick={() => currentStep > step.id && setCurrentStep(step.id)}
                                >
                                    <div className={cn(
                                        "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg",
                                        isActive 
                                            ? "bg-slate-900 border-purple-500 text-purple-400 scale-110 shadow-purple-500/50" 
                                            : isCompleted 
                                                ? "bg-indigo-600 border-indigo-600 text-white scale-100" 
                                                : "bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700"
                                    )}>
                                        {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : <step.icon className="w-6 h-6" />}
                                    </div>
                                    <span className={cn(
                                        "text-xs md:text-sm font-bold transition-colors duration-300 absolute -bottom-8 whitespace-nowrap uppercase tracking-wider",
                                        isActive ? "text-purple-400" : isCompleted ? "text-indigo-500" : "text-slate-600"
                                    )}>
                                        {step.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
                    <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                             <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 text-lg shadow-inner">
                                    {currentStep}
                                </span>
                                <span>{steps.find(s => s.id === currentStep)?.name}</span>
                            </h2>
                            <p className="text-sm text-slate-400 mt-1 pl-14">
                                {selectionNames.className}
                                {selectionNames.courseName && ` > ${selectionNames.courseName}`}
                                {selectionNames.unitName && ` > ${selectionNames.unitName}`}
                            </p>
                        </div>
                        
                        <div className="flex gap-3 w-full md:w-auto">
                            {getBulkAddButtonAction() && (
                                <Button size="sm" variant="outline" onClick={getBulkAddButtonAction()!} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 flex-1 md:flex-none">
                                    <Layers className="h-4 w-4 mr-2" /> Toplu Ekle
                                </Button>
                            )}
                            <Button size="sm" onClick={getAddButtonAction()} className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 flex-1 md:flex-none">
                                <PlusCircle className="h-4 w-4 mr-2" /> Yeni Ekle
                            </Button>
                        </div>
                    </div>

                    <div className="flex-grow p-6 md:p-10 bg-black/20">
                         {renderCurrentStep()}
                    </div>

                    <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/50 flex justify-between items-center">
                        {currentStep > 1 ? (
                            <Button 
                                variant="outline" 
                                onClick={handleBack}
                                className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-12 px-6 rounded-xl text-lg bg-transparent"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" /> Geri
                            </Button>
                        ) : <div />}
                    </div>
                </div>

            </div>

            {/* Dialogs */}
            <Dialog open={dialogState.isOpen} onOpenChange={() => setDialogState({ isOpen: false, mode: 'add', type: null })}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">{dialogState.mode === 'add' ? 'Yeni Ekle' : 'Düzenle'}: <span className="text-purple-400">{dialogState.type}</span></DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-slate-300">Ad / Başlık</Label>
                            <Input id="name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="bg-slate-950 border-white/10 text-white h-12" placeholder="Örn: Matematik" />
                        </div>

                        {dialogState.type === 'Konu' && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="external-link" className="text-slate-300">Dış Bağlantı (Opsiyonel)</Label>
                                    <Input id="external-link" value={externalLink} onChange={(e) => setExternalLink(e.target.value)} className="bg-slate-950 border-white/10 text-white h-12" placeholder="https://..." />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="source-text" className="text-slate-300">Kaynak Metin (AI İçin)</Label>
                                    <Textarea id="source-text" value={sourceText} onChange={(e) => setSourceText(e.target.value)} className="bg-slate-950 border-white/10 text-white min-h-[120px]" placeholder="Konu hakkında özet bilgi..." />
                                </div>
                            </>
                        )}
                        
                        {dialogState.type === 'Sınıf' && dialogState.mode === 'edit' && (
                             <div className="grid gap-4 pt-4 border-t border-white/10">
                                <Label className="text-slate-300">Şubeler</Label>
                                <div className="space-y-3 p-4 bg-slate-950/50 rounded-xl border border-white/5">
                                    <div className="flex gap-2">
                                        <Input placeholder="Yeni Şube (A, B...)" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} className="bg-slate-900 border-white/10 text-white" />
                                        <Button type="button" onClick={() => { if (newBranchName.trim() && !branches.includes(newBranchName.trim())) { setBranches([...branches, newBranchName.trim()]); setNewBranchName(""); } }} className="bg-indigo-600 hover:bg-indigo-500 text-white">Ekle</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {branches.map((branch, index) => (
                                            <div key={index} className="flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full border border-white/10">
                                                <span className="font-bold text-sm">{branch}</span>
                                                <button onClick={() => setBranches(branches.filter((_, i) => i !== index))} className="text-slate-400 hover:text-red-400 ml-1"><Trash2 className="h-3 w-3" /></button>
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
                        <Button onClick={handleSave} disabled={isSaving || !newItemName.trim()} className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={bulkAddDialogState.isOpen} onOpenChange={() => setBulkAddDialogState({ isOpen: false, type: null })}>
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Toplu {bulkAddDialogState.type} Ekle</DialogTitle>
                        <DialogDescription className="text-slate-400">Her satıra bir isim gelecek şekilde yapıştırın.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea className="min-h-[300px] font-mono bg-slate-950 border-white/10 text-white text-sm leading-relaxed" value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={`Örnek:\nMatematik\nFizik\nKimya`} />
                    </div>
                    <DialogFooter>
                         <Button variant="ghost" onClick={() => setBulkAddDialogState({ isOpen: false, type: null })} className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button>
                         <Button onClick={handleBulkSave} disabled={isSaving || !bulkText.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />} Toplu Ekle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {deleteDialogState && (
                 <AlertDialog open={deleteDialogState.isOpen} onOpenChange={() => setDeleteDialogState(null)}>
                    <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-400">Silmek İstediğinize Emin misiniz?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                                "{deleteDialogState.item.name}" adlı öğe ve altındaki tüm içerikler kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white border-none" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Sil
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

        </div>
    );
}