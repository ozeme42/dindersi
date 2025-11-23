

"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Book,
  ListTodo,
  Check,
  PlusCircle,
  FilePenLine,
  Trash2,
  Loader2,
  Layers,
  ArrowLeft,
  Sun
} from 'lucide-react';
import {
  saveSummerCurriculumItem,
  deleteSummerCurriculumItem,
  bulkAddSummerCurriculumItems,
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
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { Course, Topic } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SelectionGrid } from '@/components/selection-grid';

type EnrichedCourse = Course & { topics: Topic[] };

const steps = [
  { id: 1, name: 'Ders Seçimi', icon: Book },
  { id: 2, name: 'Konu Yönetimi', icon: ListTodo },
];

type DialogState = {
  isOpen: boolean;
  mode: 'add' | 'edit';
  type: 'Ders' | 'Konu' | null;
  parentId?: string;
  currentItem?: { id: string; name: string; externalLink?: string, sourceText?: string };
};

type BulkAddDialogState = {
  isOpen: boolean;
  type: 'Ders' | 'Konu' | null;
  parentId?: string;
  parentName?: string;
};

type DeleteDialogState = {
  isOpen: boolean;
  type: 'Ders' | 'Konu' | null;
  item: { id: string; name: string; path: string };
};

export default function SummerContentCreationPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<EnrichedCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [selections, setSelections] = useState({
    courseId: '',
  });
  const [selectionNames, setSelectionNames] = useState({
    courseName: '',
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
  const [externalLink, setExternalLink] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [bulkText, setBulkText] = useState('');

  const fetchCurriculum = async () => {
    setIsLoading(true);
    try {
      const coursesQuery = query(
        collection(db, 'courses'),
        where('isSummerSchool', '==', true),
        orderBy('title')
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      
      const enrichedCourses: EnrichedCourse[] = [];

      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
        const enrichedCourse: EnrichedCourse = { ...courseData, topics: [] };

        const topicsSnapshot = await getDocs(
          query(
            collection(db, `courses/${courseData.id}/topics`),
            orderBy('title')
          )
        );
        enrichedCourse.topics = topicsSnapshot.docs.map(
          (topicDoc) => ({ id: topicDoc.id, ...topicDoc.data() } as Topic)
        );
        enrichedCourses.push(enrichedCourse);
      }
      setCourses(enrichedCourses);
    } catch (error) {
      console.error('Error fetching summer curriculum: ', error);
      toast({title: "Hata", description: "Yaz kursu içerikleri yüklenemedi.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, []);

  const handleSelect = (
    type: 'course',
    id: string,
    name: string
  ) => {
    if (type === 'course') {
      setSelections({ courseId: id });
      setSelectionNames({ courseName: name });
    }
    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 2) {
        setSelections({ courseId: '' });
        setSelectionNames({ courseName: '' });
      }
      setCurrentStep((s) => s - 1);
    }
  };

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selections.courseId),
    [courses, selections.courseId]
  );

  const openDialog = (
    mode: 'add' | 'edit',
    type: DialogState['type'],
    currentItem?: { id: string; name: string; externalLink?: string, sourceText?: string },
    parentId?: string
  ) => {
    setDialogState({ isOpen: true, mode, type, parentId, currentItem });
    setNewItemName(mode === 'edit' && currentItem ? currentItem.name : '');
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
    
    let result = await saveSummerCurriculumItem(type, mode, {
        name: newItemName,
        id: currentItem?.id,
        parentId,
        externalLink,
        sourceText,
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
    const result = await deleteSummerCurriculumItem(deleteDialogState.item.path);
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
    
    const result = await bulkAddSummerCurriculumItems(type, names, parentId);
    if(result.success) {
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    let itemsToRender: any[] = [];
    let handleItemEdit = (item: any) => {};
    let handleItemDelete = (item: any) => {};

    switch (currentStep) {
      case 1:
        itemsToRender = courses;
        handleItemEdit = (item) => openDialog('edit', 'Ders', item);
        handleItemDelete = (item) => openDeleteDialog('Ders', { ...item, path: `courses/${item.id}` });
        break;
      case 2:
        itemsToRender = selectedCourse?.topics || [];
        handleItemEdit = (item) => openDialog('edit', 'Konu', item, selections.courseId);
        handleItemDelete = (item) => openDeleteDialog('Konu', { ...item, path: `courses/${selections.courseId}/topics/${item.id}` });
        break;
      default:
        return null;
    }

    if (itemsToRender.length === 0) {
      return <p className="text-center text-muted-foreground py-8">Bu seviyede gösterilecek içerik yok.</p>;
    }

    const isTopicStep = currentStep === 2;

    const handleButtonClick = (item: any) => {
        if (isTopicStep) {
            router.push(`/teacher/summer-school/content-creation/edit?courseId=${selections.courseId}&topicId=${item.id}`);
        } else {
            handleSelect('course', item.id, item.title);
        }
    };
    
    const colorClasses = [
        'bg-chart-1 hover:bg-chart-1/90', 'bg-chart-2 hover:bg-chart-2/90', 'bg-chart-3 hover:bg-chart-3/90',
        'bg-chart-4 hover:bg-chart-4/90', 'bg-chart-5 hover:bg-chart-5/90', 'bg-accent hover:bg-accent/90'
    ];

    return (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {itemsToRender.map((item, index) => {
                return (
                     <div key={item.id} className="relative group h-36">
                        <Button 
                            variant="default"
                            className={cn(
                                "w-full h-full whitespace-normal p-4 justify-center flex items-center text-center shadow-lg transition-transform duration-200 hover:-translate-y-1 text-primary-foreground",
                                colorClasses[index % colorClasses.length]
                            )}
                            onClick={() => handleButtonClick(item)}
                        >
                            <span className="text-2xl font-semibold leading-tight">{item.title}</span>
                        </Button>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/20 hover:bg-black/40 text-white" onClick={() => handleItemEdit(item)} title="Adını düzenle">
                                <FilePenLine className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/20 hover:bg-black/40 text-white" onClick={() => handleItemDelete(item)} title="Sil">
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
        return () => openDialog('add', 'Ders');
      case 2:
        return () => openDialog('add', 'Konu', undefined, selections.courseId);
      default:
        return () => {};
    }
  };
  
   const getBulkAddButtonAction = () => {
    switch (currentStep) {
      case 1:
        return () => openBulkAddDialog('Ders');
      case 2:
        return () => openBulkAddDialog('Konu', selections.courseId, selectionNames.courseName);
      default:
        return null;
    }
  };
  
  const getBulkAddButtonType = () => {
      switch(currentStep) {
          case 1: return 'Ders';
          case 2: return 'Konu';
          default: return null;
      }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center justify-center gap-2">
            <Sun className="h-10 w-10 text-orange-500" />
            Yaz Kursu İçerik Yönetimi
          </h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-4xl mx-auto">
            Yaz kursuna özel dersleri ve konuları yönetin.
          </p>
        </div>

        <div className="flex justify-center items-center mb-8 px-4">
          <ol className="flex items-center w-full max-w-md">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={cn('flex w-full items-center', {
                  "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block":
                    index !== steps.length - 1,
                })}
              >
                <span
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors duration-300 cursor-pointer',
                    currentStep > step.id
                      ? 'bg-primary text-primary-foreground'
                      : currentStep === step.id
                      ? 'bg-accent text-accent-foreground scale-110'
                      : 'bg-muted text-muted-foreground',
                  )}
                   onClick={() => currentStep > step.id && setCurrentStep(step.id)}
                >
                  <step.icon className="h-5 w-5" />
                </span>
              </li>
            ))}
          </ol>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{steps.find(s => s.id === currentStep)?.name}</CardTitle>
                <CardDescription>
                  {selectionNames.courseName}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                 {getBulkAddButtonAction() && (
                    <Button size="sm" className="gap-1" variant="outline" onClick={getBulkAddButtonAction()!}>
                        <Layers className="h-4 w-4" /> Toplu {getBulkAddButtonType()} Ekle
                    </Button>
                 )}
                 <Button size="sm" className="gap-1" onClick={getAddButtonAction()}>
                    <PlusCircle className="h-4 w-4" /> Yeni {getBulkAddButtonType()} Ekle
                 </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-[300px]">{renderCurrentStep()}</CardContent>
          <CardFooter className="justify-between">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Geri
              </Button>
            ) : <div />}
             <Link href="/teacher/summer-school" className="ml-auto">
                <Button variant="ghost">Yaz Kursu Paneline Dön</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      
       <Dialog open={dialogState.isOpen} onOpenChange={() => setDialogState({ isOpen: false, mode: 'add', type: null })}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dialogState.mode === 'add' ? 'Yeni' : 'Düzenle'}: {dialogState.type}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">{dialogState.type} Adı</Label>
                        <Input id="name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="col-span-3" />
                    </div>
                     {dialogState.type === 'Konu' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="external-link" className="text-right">
                                    Dış Link (İsteğe bağlı)
                                </Label>
                                <Input id="external-link" value={externalLink} onChange={(e) => setExternalLink(e.target.value)} className="col-span-3" placeholder="https://..."/>
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="source-text" className="text-right pt-2">
                                    Kaynak Metin
                                </Label>
                                <Textarea id="source-text" value={sourceText} onChange={(e) => setSourceText(e.target.value)} className="col-span-3 min-h-[120px]" placeholder="Konuyla ilgili temel bilgileri, özet metni veya anahtar kelimeleri buraya girin..."/>
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">İptal</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving || !newItemName.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={bulkAddDialogState.isOpen} onOpenChange={() => setBulkAddDialogState({ isOpen: false, type: null })}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Toplu {bulkAddDialogState.type} Ekle</DialogTitle>
                    <DialogDescription>Eklemek istediğiniz adları her satıra bir tane gelecek şekilde yapıştırın.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea className="min-h-[250px] font-mono" value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">İptal</Button></DialogClose>
                    <Button onClick={handleBulkSave} disabled={isSaving || !bulkText.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {deleteDialogState && (
             <AlertDialog open={deleteDialogState.isOpen} onOpenChange={() => setDeleteDialogState(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz. "{deleteDialogState.item.name}" adlı {deleteDialogState.type?.toLowerCase()} kalıcı olarak silinecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteDialogState(null)}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Evet, Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </div>
  );
}
