
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
    GraduationCap,
    Copy,
    Eye
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc, getDoc, where, limit } from "firebase/firestore";
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
    }

    return (
        <Card className={cn(
            "flex flex-col transition-all duration-300 bg-slate-900/40 backdrop-blur-sm border-white/5 hover:border-white/10 group relative overflow-hidden", 
            isSelected && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 bg-indigo-900/10"
        )}>
             {/* Glow Effect */}
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <CardHeader className="flex flex-row items-start gap-4 pb-2 relative z-10">
                 <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(item.id)}
                    aria-label={`Select item`}
                    className="mt-1 border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                />
                <div className="flex-1 space-y-1">
                    <div className="flex items-start gap-3">
                       <span className="font-black text-indigo-400 text-lg">#{index + 1}</span>
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
  const [isLoading, setIsLoading] = useState(true);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const { toast } = useToast();
  
  const [allData, setAllData] = useState<{ classes: SchoolClass[]; courses: EnrichedCourse[] }>({
    classes: [],
    courses: [],
  });
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});

  const [filters, setFilters] = useState({
    classId: 'all',
    courseId: 'all',
    unitId: 'all',
    topicId: 'all',
  });
  
  const [editingItem, setEditingItem] = useState<Partial<ActivityItem> | null>(null);

  const [dataTypeFilter, setDataTypeFilter] = useState('all');
  const [isAIGenOpen, setIsAIGenOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [topicSourceText, setTopicSourceText] = useState<string>('');
  const [isSourceTextLoading, setIsSourceTextLoading] = useState<boolean>(false);
  const [isSourceTextEditorOpen, setIsSourceTextEditorOpen] = useState(false);
  const [isSourceTextReaderOpen, setIsSourceTextReaderOpen] = useState(false);
  const [editableSourceText, setEditableSourceText] = useState('');
  const [isSavingSourceText, setIsSavingSourceText] = useState(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState<string>('');
  const [quickClassTab, setQuickClassTab] = useState<string>('all');
  
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (!filters.topicId || filters.topicId === 'all' || !filters.courseId || filters.courseId === 'all' || !filters.unitId || filters.unitId === 'all') {
      setTopicSourceText('');
      return;
    }
    let isMounted = true;
    setIsSourceTextLoading(true);
    const fetchTopicSource = async () => {
      try {
        const topicRef = doc(db, 'courses', filters.courseId, 'units', filters.unitId, 'topics', filters.topicId);
        const snap = await getDoc(topicRef);
        if (isMounted && snap.exists()) {
          const data = snap.data();
          setTopicSourceText(data.sourceText || '');
        }
      } catch (err) {
        console.warn("Could not fetch topic source text in activity-data:", err);
      } finally {
        if (isMounted) setIsSourceTextLoading(false);
      }
    };
    fetchTopicSource();
    return () => { isMounted = false; };
  }, [filters.courseId, filters.unitId, filters.topicId]);

  const allTopics = useMemo(() => {
    return allData.courses.flatMap(c => 
      c.units?.flatMap(u => 
        (u.topics || []).map(t => ({ 
          ...t, 
          courseId: c.id, 
          courseTitle: c.title,
          unitId: u.id, 
          unitTitle: u.title,
          classId: c.classId, 
          className: c.className || (allData.classes.find(cl => cl.id === c.classId)?.name) || '',
        }))
      ) || []
    );
  }, [allData.courses, allData.classes]);

  const fetchItemsForFilter = useCallback(async () => {
    // 💡 Kullanıcı isteği: Konu seçilene kadar sayfaya önce hiç veri gelmesin!
    if (!filters.topicId || filters.topicId === 'all') {
      setActivityItems([]);
      setIsItemsLoading(false);
      return;
    }

    setIsItemsLoading(true);
    try {
      const qRef = query(collection(db, "activityItems"), where("topicId", "==", filters.topicId));
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

      // Firestore'da veri yoksa statik müfredat dosyasından yükle
      if (fetchedItems.length === 0) {
        try {
          const staticRes = await fetch(`/curriculum/activityItems/${filters.topicId}.json`);
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
      setTopicCounts(prev => ({ ...prev, [filters.topicId]: fetchedItems.length }));
    } catch (error) {
      console.error("Error fetching activity items:", error);
      toast({ title: "Hata", description: "Veriler yüklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsItemsLoading(false);
    }
  }, [filters.topicId, toast]);

  useEffect(() => {
    fetchItemsForFilter();
  }, [fetchItemsForFilter]);

  // Filtering Logic
  const filteredCourses = useMemo(() => {
    if (filters.classId === 'all') return allData.courses;
    const firstClassId = allData.classes[0]?.id;
    const isFirstClass = filters.classId === firstClassId;
    return allData.courses.filter(c => c.classId === filters.classId || (!c.classId && isFirstClass));
  }, [filters.classId, allData.courses, allData.classes]);

  const filteredUnits = useMemo(() => {
    if (filters.courseId === 'all') return allData.courses.flatMap(c => c.units || []);
    const course = filteredCourses.find(c => c.id === filters.courseId);
    return course?.units || [];
  }, [filters.courseId, filteredCourses, allData.courses]);

  const filteredTopics = useMemo(() => {
    if (filters.unitId === 'all') return filteredUnits.flatMap(u => u.topics || []);
    const unit = filteredUnits.find(u => u.id === filters.unitId);
    return unit?.topics || [];
  }, [filters.unitId, filteredUnits]);

  const filteredActivityItems = useMemo(() => {
    let temp = activityItems;
    
    if (filters.topicId !== 'all') temp = temp.filter(d => d.topicId === filters.topicId);
    else if (filters.unitId !== 'all') temp = temp.filter(d => d.unitId === filters.unitId);
    else if (filters.courseId !== 'all') temp = temp.filter(d => d.courseId === filters.courseId);
    else if (filters.classId !== 'all') {
        const courseIdsInClass = new Set(filteredCourses.map(c => c.id));
        temp = temp.filter(d => Boolean(d.courseId && courseIdsInClass.has(d.courseId)));
    }
    
    if (dataTypeFilter !== 'all') {
        temp = temp.filter(d => d.type === dataTypeFilter);
    }

    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        temp = temp.filter(d => {
            const content = d.content || {};
            return (
                (content.text && content.text.toLowerCase().includes(lowercasedTerm)) ||
                (content.term && content.term.toLowerCase().includes(lowercasedTerm)) ||
                (content.definition && content.definition.toLowerCase().includes(lowercasedTerm)) ||
                (content.title && content.title.toLowerCase().includes(lowercasedTerm))
            );
        });
    }

    return temp;
  }, [filters, searchTerm, activityItems, filteredCourses, dataTypeFilter]);

  const handleDelete = async (itemId: string) => {
    try {
        await deleteDoc(doc(db, "activityItems", itemId));
        toast({ title: "Başarılı", description: "Veri öğesi başarıyla silindi." });
        const deletedItem = activityItems.find(i => i.id === itemId);
        setActivityItems(prev => prev.filter(i => i.id !== itemId));
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
        });
        const deletedTopicId = deletedItem?.topicId;
        if (deletedTopicId) {
            setTopicCounts(prev => ({
                ...prev,
                [deletedTopicId]: Math.max(0, (prev[deletedTopicId] || 1) - 1)
            }));
        }
    } catch(e) {
        console.error("Error deleting item:", e);
        toast({ title: "Hata", description: "Öğe silinirken bir hata oluştu.", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const idsToDelete = Array.from(selectedItemIds);
    const result = await deleteBulkActivityItems(idsToDelete);
    if (result.success) {
        toast({ title: "Başarılı", description: `${result.count} veri seti silindi.` });
        setSelectedItemIds(new Set());
        setActivityItems(prev => prev.filter(i => !idsToDelete.includes(i.id)));
        if (filters.topicId && filters.topicId !== 'all') {
            setTopicCounts(prev => ({
                ...prev,
                [filters.topicId]: Math.max(0, (prev[filters.topicId] || idsToDelete.length) - idsToDelete.length)
            }));
        }
    } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsDeleting(false);
  };

  const handleSelectId = (id: string) => {
    setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
    });
  };

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredActivityItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredActivityItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredActivityItems.length / itemsPerPage);

  const handleSelectAllOnPage = () => {
    const allOnPageIds = paginatedItems.map(d => d.id);
    const currentSelection = new Set(selectedItemIds);
    const allOnPageSelected = paginatedItems.length > 0 && allOnPageIds.every(id => currentSelection.has(id));

    if (allOnPageSelected) {
        allOnPageIds.forEach(id => currentSelection.delete(id));
    } else {
        allOnPageIds.forEach(id => currentSelection.add(id));
    }
    setSelectedItemIds(currentSelection);
  };
  
  const aiGenerationContext = useMemo(() => {
      if (filters.topicId === 'all' || !filters.courseId || !filters.unitId) return null;
      const topic = allTopics.find(t => t.id === filters.topicId);
      if (!topic) return null;
      return { 
          courseId: topic.courseId, 
          unitId: topic.unitId, 
          topicId: topic.id, 
          topicTitle: topic.title,
          sourceText: topicSourceText || topic.sourceText || '',
          isLoadingSourceText: isSourceTextLoading,
      };
  }, [filters, allTopics, topicSourceText, isSourceTextLoading]);

  const selectedTopicObj = useMemo(() => {
    if (!filters.topicId || filters.topicId === 'all') return null;
    return allTopics.find(t => t.id === filters.topicId) || null;
  }, [filters.topicId, allTopics]);

  const searchableTopics = useMemo(() => {
    let list = allTopics;
    if (quickClassTab !== 'all') {
      list = list.filter(t => t.classId === quickClassTab);
    }
    if (topicSearchQuery.trim()) {
      const q = topicSearchQuery.toLowerCase();
      list = list.filter(t => 
        (t.title || '').toLowerCase().includes(q) ||
        (t.unitTitle || '').toLowerCase().includes(q) ||
        (t.courseTitle || '').toLowerCase().includes(q) ||
        (t.className || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allTopics, quickClassTab, topicSearchQuery]);

  const handleSelectTopicDirectly = (topic: typeof allTopics[0]) => {
    setFilters({
      classId: topic.classId || 'all',
      courseId: topic.courseId || 'all',
      unitId: topic.unitId || 'all',
      topicId: topic.id,
    });
    setCurrentPage(1);
    setTopicSearchQuery('');
  };

  const handleClearTopicSelection = () => {
    setFilters(f => ({ ...f, topicId: 'all' }));
    setCurrentPage(1);
  };

  const handleSaveSourceTextFromActivity = async () => {
    if (!filters.courseId || filters.courseId === 'all' || !filters.unitId || filters.unitId === 'all' || !filters.topicId || filters.topicId === 'all') return;
    setIsSavingSourceText(true);
    const result = await saveTopicSourceText(filters.courseId, filters.unitId, filters.topicId, editableSourceText);
    if (result.success) {
      toast({ title: "Başarılı", description: "Konu kaynak metni kaydedildi." });
      setTopicSourceText(editableSourceText);
      setIsSourceTextEditorOpen(false);
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsSavingSourceText(false);
  };

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
        fetchItemsForFilter();
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

  const handleOpenDialog = (item: Partial<ActivityItem>) => {
       const contextItem = (item.id && !item.id.startsWith('new-')) 
        ? item
        : {
            ...item,
            courseId: aiGenerationContext?.courseId || '',
            unitId: aiGenerationContext?.unitId || '',
            topicId: aiGenerationContext?.topicId || '',
        };
      setEditingItem(contextItem);
  }
  
  const handleDownload = () => {
    const dataStr = JSON.stringify(filteredActivityItems.map(({id, createdAt, ...rest}) => rest), null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `etkinlik_verileri_${filters.topicId || filters.unitId || filters.courseId || 'tum'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
        
       {/* Arka Plan */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-teal-900/10 rounded-full blur-[150px]" />
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-4">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                <div className="p-2 bg-teal-500/20 rounded-xl border border-teal-500/30">
                    <Database className="h-8 w-8 text-teal-400" />
                </div>
                <div>
                  Etkinlik Veri Bankası
                  <Badge className="ml-3 bg-pink-500/20 text-pink-300 border-pink-500/30">CANLI VERİTABANI</Badge>
                </div>
            </h1>
            <div className="flex items-center gap-3">
                <Button asChild className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold shadow-lg shadow-teal-500/20 border-0">
                    <Link href="/teacher/smartboard/yazilacaklar">
                        <Sparkles className="mr-2 h-4 w-4 text-amber-300" />
                        Yeni Merkezi Stüdyo 🚀
                    </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900">
                    <Link href="/teacher">
                        <Home className="mr-2 h-4 w-4" /> Panele Dön
                    </Link>
                </Button>
            </div>
        </div>

        {/* Central Studio Recommendation Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-teal-950/40 to-purple-950/60 border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                    <div className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                        Yeni: Merkezi Etkinlik & Kavram Stüdyosu
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Tavsiye Edilen</Badge>
                    </div>
                    <div className="text-xs text-slate-400">
                        Kavramlar, Kavram-Tanım eşleşmeleri, Özet Cümleler ve Akıllı Tahta sunumunu Miller sütunları ile tek ekrandan yönetin.
                    </div>
                </div>
            </div>
            <Button asChild size="sm" className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shrink-0 shadow-md">
                <Link href="/teacher/smartboard/yazilacaklar">
                    Stüdyoya Git <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Link>
            </Button>
        </div>

        {/* Main Content Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 space-y-6">
                 
                 {/* Filters */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Select value={filters.classId} onValueChange={v => { setFilters({ classId: v, courseId: 'all', unitId: 'all', topicId: 'all' }); setCurrentPage(1); }}>
                        <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11"><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Sınıflar</SelectItem>{allData.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={filters.courseId} onValueChange={v => { setFilters(f => ({ ...f, courseId: v, unitId: 'all', topicId: 'all' })); setCurrentPage(1); }} disabled={filteredCourses.length === 0}>
                        <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11"><SelectValue placeholder="Ders Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="all">Tüm Dersler</SelectItem>
                            {filteredCourses.map(c => {
                                const count = (c.units || []).reduce((acc, u) => acc + (u.topics || []).reduce((tAcc, t) => tAcc + (topicCounts[t.id] || 0), 0), 0);
                                return (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.title} {count > 0 ? `(${count})` : ''}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    <Select value={filters.unitId} onValueChange={v => { setFilters(f => ({ ...f, unitId: v, topicId: 'all' })); setCurrentPage(1); }} disabled={filteredUnits.length === 0}>
                        <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11"><SelectValue placeholder="Ünite Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="all">Tüm Üniteler</SelectItem>
                            {filteredUnits.map(u => {
                                const count = (u.topics || []).reduce((acc, t) => acc + (topicCounts[t.id] || 0), 0);
                                return (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.title} {count > 0 ? `(${count})` : ''}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    <Select value={filters.topicId} onValueChange={v => { setFilters(f => ({ ...f, topicId: v })); setCurrentPage(1); }} disabled={filteredTopics.length === 0}>
                        <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11"><SelectValue placeholder="Konu Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="all">Tüm Konular</SelectItem>
                            {filteredTopics.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.title} {topicCounts[t.id] !== undefined ? `(${topicCounts[t.id]})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={dataTypeFilter} onValueChange={v => { setDataTypeFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11"><SelectValue placeholder="Veri Tipi Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="all">Tüm Veri Tipleri</SelectItem>
                            <SelectItem value="concept">Kavram</SelectItem>
                            <SelectItem value="definition">Tanım</SelectItem>
                            <SelectItem value="sentence">Cümle</SelectItem>
                            <SelectItem value="categorization">Kategorizasyon</SelectItem>
                            <SelectItem value="sorting">Olay Sıralama</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>

                  {/* Actions & Search - Sadece konu seçiliyken gösterilir */}
                  {selectedTopicObj && (
                    <div className="flex flex-col xl:flex-row items-center gap-4 animate-in fade-in duration-200">
                        <div className="relative flex-grow w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input 
                                placeholder="Bu konunun verilerinde ara..." 
                                value={searchTerm} 
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                                className="pl-10 bg-slate-950 border-white/10 text-white focus:border-teal-500/50 h-11 w-full text-xs"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
                           <Button onClick={() => handleOpenDialog({})} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 text-xs font-bold h-11 px-4 rounded-xl"><PlusCircle className="mr-1.5 h-4 w-4"/> Yeni Veri</Button>
                           <Button onClick={() => setIsBulkOpen(true)} variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950 text-xs font-bold h-11 px-4 rounded-xl"><Upload className="mr-1.5 h-4 w-4"/> Toplu Ekle</Button>
                           <Button onClick={() => setIsAIGenOpen(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-900/20 text-xs font-bold h-11 px-4 rounded-xl transition-all hover:scale-105"><Sparkles className="mr-1.5 h-4 w-4 text-yellow-300 animate-pulse"/> AI ile Üret</Button>
                           <Button onClick={handleDownload} variant="outline" disabled={filteredActivityItems.length === 0} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950 text-xs font-bold h-11 px-4 rounded-xl"><Download className="mr-1.5 h-4 w-4"/> JSON İndir</Button>
                        </div>
                    </div>
                  )}
            </div>

            <div className="flex-grow p-6 md:p-8 bg-black/20">
                {!selectedTopicObj ? (
                    /* ════ 1. KONU SEÇİLMEDEN ÖNCE: PRATİK KONU SEÇİM VE ARAMA HUB'I ════ */
                    <div className="py-4 space-y-6">
                        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="p-3 bg-gradient-to-br from-teal-500/20 via-indigo-500/20 to-purple-500/20 rounded-2xl border border-teal-500/30 text-teal-300 shadow-md">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                            Etkinlik Verileri İçin Konu Seçin
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Sayfa performansını korumak için veriler konu bazlı yüklenir. Başlamak için aşağıdaki konulardan birine tıklayın.
                                        </p>
                                    </div>
                                </div>

                                {/* Hızlı Sınıf Sekmeleri */}
                                <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/10 self-start md:self-auto overflow-x-auto max-w-full">
                                    <button
                                        type="button"
                                        onClick={() => setQuickClassTab('all')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                                            quickClassTab === 'all'
                                                ? "bg-teal-600 text-white shadow-sm"
                                                : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        Tüm Sınıflar
                                    </button>
                                    {allData.classes.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setQuickClassTab(c.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                                                quickClassTab === c.id
                                                    ? "bg-teal-600 text-white shadow-sm"
                                                    : "text-slate-400 hover:text-white"
                                            )}
                                        >
                                            {c.name.includes('Sınıf') ? c.name : `${c.name}. Sınıf`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Canlı Konu Arama Çubuğu */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    value={topicSearchQuery}
                                    onChange={(e) => setTopicSearchQuery(e.target.value)}
                                    placeholder="Konu adı veya kavram ile anında filtrele (Örn: Zekat, Kader, Namaz, İhlas, Tevhid, Hac)..."
                                    className="pl-11 pr-10 h-12 bg-slate-950 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-2xl focus:border-teal-500/60 shadow-inner"
                                />
                                {topicSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setTopicSearchQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                                <span>
                                    Listelenen Konu: <strong className="text-teal-300 font-bold">{searchableTopics.length}</strong>
                                </span>
                                <span className="text-[11px] text-slate-500 hidden sm:inline">
                                    Konu kartına tıkladığınızda veriler ve AI Stüdyosu otomatik açılacaktır
                                </span>
                            </div>
                        </div>

                        {/* Konu Kartları Izgarası */}
                        {searchableTopics.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {searchableTopics.map(t => {
                                    const count = topicCounts[t.id];
                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => handleSelectTopicDirectly(t)}
                                            className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-teal-500/50 hover:bg-slate-900/95 transition-all cursor-pointer group flex flex-col justify-between space-y-3 hover:shadow-xl hover:shadow-teal-950/30"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Badge variant="outline" className="bg-teal-500/10 text-teal-300 border-teal-500/30 text-[10px] font-bold">
                                                        {t.className || 'Din Kültürü'}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{t.unitTitle}</span>
                                                </div>
                                                <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-2 leading-snug">
                                                    {t.title}
                                                </h4>
                                            </div>

                                            <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-[11px]">
                                                <span className="text-slate-400">
                                                    {count !== undefined ? (
                                                        <span className={count > 0 ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                                                            {count} veri kayıtlı
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500">Kayıt kontrolü</span>
                                                    )}
                                                </span>
                                                <span className="text-teal-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                    Verileri Aç <ChevronRight className="w-3.5 h-3.5" />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/40 space-y-2">
                                <Search className="h-10 w-10 opacity-20" />
                                <p className="text-base font-medium">"{topicSearchQuery}" aramasına uygun konu bulunamadı.</p>
                                <p className="text-xs text-slate-500">Farklı bir arama terimi deneyebilir veya sınıf filtresini temizleyebilirsiniz.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ════ 2. KONU SEÇİLDİKTEN SONRA: AKTİF KONU VERİ ÇALIŞMA ALANI ════ */
                    <div className="space-y-6">
                        {/* Aktif Konu Bilgi Kartı */}
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-indigo-950/60 border border-teal-500/30 shadow-xl">
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-500/40">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-[11px] font-bold">
                                            {selectedTopicObj.className}
                                        </Badge>
                                        <span className="text-xs text-slate-500">›</span>
                                        <span className="text-xs text-slate-300 font-medium">{selectedTopicObj.unitTitle}</span>
                                    </div>
                                    <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                                        {selectedTopicObj.title}
                                        <Badge variant="outline" className="bg-white/10 border-white/20 text-xs text-slate-200">
                                            {filteredActivityItems.length} Veri
                                        </Badge>
                                    </h2>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleClearTopicSelection}
                                    className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900 h-9 text-xs font-bold rounded-xl"
                                >
                                    <X className="w-3.5 h-3.5 mr-1" /> Başka Konu Seç
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setEditableSourceText(topicSourceText);
                                        if (topicSourceText) {
                                            setIsSourceTextReaderOpen(true);
                                        } else {
                                            setIsSourceTextEditorOpen(true);
                                        }
                                    }}
                                    className="border-teal-500/30 text-teal-300 hover:text-white hover:bg-teal-500/20 bg-teal-950/40 h-9 text-xs font-bold rounded-xl"
                                >
                                    <BookOpen className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                                    {topicSourceText ? `Kaynak Metin (${topicSourceText.split(/\s+/).filter(Boolean).length} kelime)` : '+ Kaynak Metin Ekle'}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setIsAIGenOpen(true)}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
                                >
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-yellow-300 animate-pulse" /> ✨ AI ile Üret
                                </Button>
                            </div>
                        </div>

                        {/* ══ KONU KAYNAK METNİ BİLGİ BARI ══ */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900/80 to-indigo-950/40 border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                                    <BookOpen className="h-5 w-5" />
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
                                        {topicSourceText || 'Bu konuya ait kaynak metin bulunmuyor. AI veri üretimi ve etkinlik içerikleri için metin ekleyebilirsiniz.'}
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

                        {/* Seçim ve Toplu Silme Barı */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                                <Checkbox id="select-all" checked={paginatedItems.length > 0 && paginatedItems.every(d => selectedItemIds.has(d.id))} onCheckedChange={handleSelectAllOnPage} disabled={paginatedItems.length === 0} className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"/>
                                <Label htmlFor="select-all" className="text-xs font-medium text-slate-300 cursor-pointer">Tümünü Seç ({paginatedItems.length})</Label>
                            </div>
                            {selectedItemIds.size > 0 && (
                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-5 duration-300">
                                    <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border-indigo-500/30 px-3 py-1.5 text-xs">
                                        {selectedItemIds.size} öğe seçildi
                                    </Badge>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={isDeleting} className="bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 text-xs"><Trash2 className="mr-1.5 h-3.5 w-3.5"/> Sil</Button></AlertDialogTrigger>
                                        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                            <AlertDialogHeader><AlertDialogTitle className="text-red-400">Emin misiniz?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Bu işlem geri alınamaz. Seçilen {selectedItemIds.size} veri öğesi kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                        </div>

                        {/* Veri Kartları Izgarası veya Boş Durum */}
                        {isLoading || isItemsLoading ? (
                            <div className="flex flex-col justify-center items-center h-64 gap-3">
                                <Loader2 className="h-10 w-10 animate-spin text-teal-500"/>
                                <span className="text-sm text-slate-400 font-medium">Bu konunun verileri yükleniyor...</span>
                            </div>
                        ) : paginatedItems.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {paginatedItems.map((item, index) => {
                                const topic = allTopics.find(t => t.id === item.topicId);
                                const globalIndex = (currentPage - 1) * itemsPerPage + index;
                                return (
                                    <ActivityItemCard 
                                        key={item.id} 
                                        item={item} 
                                        topicName={topic?.title}
                                        onEdit={() => handleOpenDialog(item)}
                                        onDelete={handleDelete}
                                        onSelect={handleSelectId}
                                        isSelected={selectedItemIds.has(item.id)}
                                        index={globalIndex}
                                    />
                                )
                            })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50 space-y-3">
                                <Database className="h-12 w-12 opacity-20 text-teal-400" />
                                <p className="text-base font-bold text-slate-300">Bu konuda henüz kayıtlı etkinlik verisi bulunmuyor.</p>
                                <p className="text-xs text-slate-500 max-w-sm text-center">
                                    Yapay zekâ stüdyosunu kullanarak saniyeler içinde anahtar kavramlar, tanımlar ve özet cümleleri üretebilirsiniz.
                                </p>
                                <Button
                                    onClick={() => setIsAIGenOpen(true)}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-lg shadow-purple-900/30 mt-2"
                                >
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-yellow-300 animate-pulse" /> ✨ AI ile Hemen Veri Üret
                                </Button>
                            </div>
                        )}

                        {/* Sayfalama */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                <span className="text-sm text-slate-500 font-medium">
                                    Toplam {filteredActivityItems.length} veri
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950">Önceki</Button>
                                    <span className="text-sm font-bold text-white px-4 bg-slate-900 py-1.5 rounded-lg border border-white/10">{currentPage} / {totalPages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950">Sonraki</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>

      <AiActivityGenerationPanel
        isOpen={isAIGenOpen}
        onOpenChange={setIsAIGenOpen}
        context={aiGenerationContext}
        onDataGenerated={fetchItemsForFilter}
      />
      <BulkActivityImportDialog
        isOpen={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        onImported={fetchItemsForFilter}
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
                  <DialogTitle className="flex items-center gap-2 text-lg font-bold text-teal-300">
                      <BookOpen className="w-5 h-5 text-teal-400" /> Konu Kaynak Metnini Düzenle
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                      Bu metin Sunum, Soru Bankası, Etkinlik Veri Bankası ve Yapay Zekâ stüdyolarında ortak birincil referans olarak kullanılır.
                  </DialogDescription>
              </DialogHeader>

              <div className="flex-grow my-2 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{selectedTopicObj?.title}</span>
                      <span>
                          {editableSourceText.trim().length > 0
                              ? `${editableSourceText.trim().split(/\s+/).length} kelime · ${editableSourceText.length} karakter`
                              : 'Henüz metin girilmedi'}
                      </span>
                  </div>
                  <Textarea
                      value={editableSourceText}
                      onChange={(e) => setEditableSourceText(e.target.value)}
                      placeholder="Müfredat ders kitabı veya konu anlatım metnini buraya yapıştırın veya yazın..."
                      className="min-h-[320px] max-h-[50vh] bg-slate-950 border-white/10 text-slate-200 font-mono text-sm leading-relaxed p-4 resize-y focus:border-teal-500"
                  />
              </div>

              <DialogFooter className="pt-2 flex items-center justify-between gap-3">
                  <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditableSourceText('')}
                      disabled={!editableSourceText}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  >
                      Temizle
                  </Button>
                  <div className="flex items-center gap-2">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsSourceTextEditorOpen(false)}
                          className="border-white/10 text-slate-300 hover:bg-white/5"
                      >
                          İptal
                      </Button>
                      <Button
                          size="sm"
                          onClick={handleSaveSourceTextFromActivity}
                          disabled={isSavingSourceText}
                          className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
                      >
                          {isSavingSourceText ? (
                              <>
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Kaydediliyor...
                              </>
                          ) : (
                              <>
                                  <Check className="w-3.5 h-3.5 mr-1.5" /> Kaydet
                              </>
                          )}
                      </Button>
                  </div>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* ══ KAYNAK METİN OKUMA MODALI ══ */}
      <Dialog open={isSourceTextReaderOpen} onOpenChange={setIsSourceTextReaderOpen}>
          <DialogContent className="max-w-3xl bg-slate-900 border-white/10 text-white max-h-[85vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle className="flex items-center justify-between text-lg font-bold text-teal-300 pr-6">
                      <span className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-teal-400" /> {selectedTopicObj?.title}
                      </span>
                      <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">
                          {topicSourceText.split(/\s+/).filter(Boolean).length} kelime
                      </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                      {selectedTopicObj?.unitTitle}
                  </DialogDescription>
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
    </>
  );
}
