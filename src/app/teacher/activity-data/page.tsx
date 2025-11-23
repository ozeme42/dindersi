
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PlusCircle,
  Loader2,
  Trash2,
  FilePenLine,
  MoreHorizontal,
  Upload,
  Sparkles,
  Download,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, deleteDoc, doc, where } from "firebase/firestore"
import type { ActivityItem, Course, Unit, Topic, SchoolClass } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { AiActivityGenerationPanel } from "@/components/ai-activity-generation-panel"
import { deleteBulkActivityItems, saveActivityItem } from "./actions"
import { Checkbox } from "@/components/ui/checkbox"
import { ActivityItemEditorDialog } from "@/components/activity-item-editor-dialog"
import { BulkActivityImportDialog } from "@/components/bulk-activity-import-dialog"
import { cn } from "@/lib/utils"

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
    const typeLabels = {
        concept: 'Kavram',
        definition: 'Tanım',
        sentence: 'Cümle',
        categorization: 'Kategorizasyon',
        sorting: 'Olay Sıralama'
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
        <Card className={cn("flex flex-col hover:shadow-md transition-shadow", isSelected && "ring-2 ring-primary")}>
            <CardHeader className="flex flex-row items-start gap-4 pb-4">
                 <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(item.id)}
                    aria-label={`Select item`}
                    className="mt-1"
                />
                <div className="flex-1 space-y-1">
                    <div className="flex items-start gap-3">
                        <span className="font-bold text-primary">{index + 1}.</span>
                        <p className="font-medium line-clamp-3 flex-1">{renderContent()}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow text-xs text-muted-foreground">
                {topicName && <p>Konu: {topicName}</p>}
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 p-3">
                 <Badge variant="secondary">{typeLabels[item.type]}</Badge>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={onEdit}><FilePenLine className="mr-2 h-4 w-4"/> Düzenle</DropdownMenuItem>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="w-full text-left relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" /> Sil
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>Bu işlem geri alınamaz. Veri öğesi kalıcı olarak silinecektir.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-destructive hover:bg-destructive/90">
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
  const { toast } = useToast();
  
  const [allData, setAllData] = useState<{ classes: SchoolClass[]; courses: EnrichedCourse[]; activityItems: ActivityItem[] }>({
    classes: [],
    courses: [],
    activityItems: [],
  });

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
  
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [activityItemsSnapshot, classesSnapshot, coursesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "activityItems"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
        getDocs(collection(db, "courses"))
      ]);

      const activityItems = activityItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityItem));
      const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
      const coursesDataRaw = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

      const enrichedCourses: EnrichedCourse[] = [];
      for (const courseDoc of coursesDataRaw) {
        const course = { ...courseDoc, units: [] } as EnrichedCourse;
        const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
        const unitsData: (Unit & { topics: Topic[] })[] = [];
        for (const unitDoc of unitsSnapshot.docs) {
          const unit = { id: unitDoc.id, ...unitDoc.data(), topics: [] } as (Unit & { topics: Topic[] });
          const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
          unit.topics = topicsSnapshot.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic));
          unitsData.push(unit);
        }
        course.units = unitsData;
        enrichedCourses.push(course);
      }
      setAllData({ classes: classesData, courses: enrichedCourses, activityItems });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Hata", description: "Veriler yüklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allTopics = useMemo(() => {
    return allData.courses.flatMap(c => c.units?.flatMap(u => u.topics.map(t => ({ ...t, courseId: c.id, unitId: u.id, classId: c.classId }))) || []);
  }, [allData.courses]);

  // Filtering Logic
  const filteredCourses = useMemo(() => {
    if (filters.classId === 'all') return allData.courses;
    const firstClassId = allData.classes[0]?.id;
    const isFirstClass = filters.classId === firstClassId;
    return allData.courses.filter(c => c.classId === filters.classId || (!c.classId && isFirstClass));
  }, [filters.classId, allData.courses, allData.classes]);

  const filteredUnits = useMemo(() => {
    if (filters.courseId === 'all') return allData.courses.flatMap(c => c.units);
    const course = filteredCourses.find(c => c.id === filters.courseId);
    return course?.units || [];
  }, [filters.courseId, filteredCourses, allData.courses]);

  const filteredTopics = useMemo(() => {
    if (filters.unitId === 'all') return filteredUnits.flatMap(u => u.topics);
    const unit = filteredUnits.find(u => u.id === filters.unitId);
    return unit?.topics || [];
  }, [filters.unitId, filteredUnits]);

  const filteredActivityItems = useMemo(() => {
    let temp = allData.activityItems;
    
    if (filters.topicId !== 'all') temp = temp.filter(d => d.topicId === filters.topicId);
    else if (filters.unitId !== 'all') temp = temp.filter(d => d.unitId === filters.unitId);
    else if (filters.courseId !== 'all') temp = temp.filter(d => d.courseId === filters.courseId);
    else if (filters.classId !== 'all') {
        const courseIdsInClass = new Set(filteredCourses.map(c => c.id));
        temp = temp.filter(d => courseIdsInClass.has(d.courseId));
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
  }, [filters, searchTerm, allData.activityItems, allTopics, filteredCourses, dataTypeFilter]);

  const handleDelete = async (itemId: string) => {
    try {
        await deleteDoc(doc(db, "activityItems", itemId));
        toast({ title: "Başarılı", description: "Veri öğesi başarıyla silindi." });
        fetchData();
    } catch(e) {
        console.error("Error deleting item:", e);
        toast({ title: "Hata", description: "Öğe silinirken bir hata oluştu.", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const result = await deleteBulkActivityItems(Array.from(selectedItemIds));
    if (result.success) {
        toast({ title: "Başarılı", description: `${result.count} veri seti silindi.` });
        setSelectedItemIds(new Set());
        fetchData();
    } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsDeleting(false);
  }

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
          sourceText: topic.sourceText || ''
      };
  }, [filters, allTopics]);

   const handleSave = async (itemToSave: Partial<ActivityItem>) => {
    if (!itemToSave.courseId || !itemToSave.unitId || !itemToSave.topicId) {
        toast({ title: "Hata", description: "Yeni öğe oluşturmak veya kaydetmek için bir konu seçilmelidir.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    
    const result = await saveActivityItem(itemToSave);

    if (result.success) {
        toast({ title: 'Başarılı', description: 'Veri öğesi kaydedildi.' });
        fetchData();
        setEditingItem(null);
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
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
            <CardTitle>Etkinlik Veri Bankası</CardTitle>
            <CardDescription>Yapay zeka ile üretilmiş veya manuel eklenmiş etkinlik verilerini yönetin.</CardDescription>
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2 pt-4">
                <Select value={filters.classId} onValueChange={v => setFilters({ classId: v, courseId: 'all', unitId: 'all', topicId: 'all' })}>
                    <SelectTrigger><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tüm Sınıflar</SelectItem>{allData.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                 <Select value={filters.courseId} onValueChange={v => setFilters(f => ({ ...f, courseId: v, unitId: 'all', topicId: 'all' }))} disabled={filteredCourses.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Ders Seç..." /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tüm Dersler</SelectItem>{filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
                 <Select value={filters.unitId} onValueChange={v => setFilters(f => ({ ...f, unitId: v, topicId: 'all' }))} disabled={filteredUnits.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Ünite Seç..." /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tüm Üniteler</SelectItem>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent>
                </Select>
                 <Select value={filters.topicId} onValueChange={v => setFilters(f => ({ ...f, topicId: v }))} disabled={filteredTopics.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Konu Seç..." /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tüm Konular</SelectItem>{filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>
                 <Select value={dataTypeFilter} onValueChange={setDataTypeFilter}>
                    <SelectTrigger><SelectValue placeholder="Veri Tipi Seç..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tüm Veri Tipleri</SelectItem>
                        <SelectItem value="concept">Kavram</SelectItem>
                        <SelectItem value="definition">Tanım</SelectItem>
                        <SelectItem value="sentence">Cümle</SelectItem>
                        <SelectItem value="categorization">Kategorizasyon</SelectItem>
                        <SelectItem value="sorting">Olay Sıralama</SelectItem>
                    </SelectContent>
                </Select>
             </div>
             <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                 <Input placeholder="İçerikte ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-grow"/>
                <Button onClick={() => handleOpenDialog({})} disabled={!aiGenerationContext}><PlusCircle className="mr-2 h-4 w-4"/> Yeni Veri Ekle</Button>
                <Button onClick={() => setIsBulkOpen(true)} variant="outline" disabled={!aiGenerationContext}><Upload className="mr-2 h-4 w-4"/> Toplu Veri Ekle</Button>
                <Button onClick={() => setIsAIGenOpen(true)} disabled={!aiGenerationContext} variant="outline"><Sparkles className="mr-2 h-4 w-4"/> Yapay Zeka ile Üret</Button>
                <Button onClick={handleDownload} variant="outline" disabled={filteredActivityItems.length === 0}><Download className="mr-2 h-4 w-4"/> JSON İndir</Button>
             </div>
        </CardHeader>
        <CardContent>
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Checkbox id="select-all" checked={paginatedItems.length > 0 && paginatedItems.every(d => selectedItemIds.has(d.id))} onCheckedChange={handleSelectAllOnPage} disabled={paginatedItems.length === 0}/>
                    <Label htmlFor="select-all" className="text-sm font-normal">Bu Sayfadaki Tümünü Seç ({paginatedItems.length})</Label>
                </div>
                {selectedItemIds.size > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{selectedItemIds.size} öğe seçildi.</span>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={isDeleting}><Trash2 className="mr-2 h-4 w-4"/> Seçilenleri Sil</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Emin misiniz?</AlertDialogTitle><AlertDialogDescription>Bu işlem geri alınamaz. Seçilen {selectedItemIds.size} veri öğesi kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Evet, Sil</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </div>
             {isLoading ? <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin"/></div> :
                paginatedItems.length > 0 ? (
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
                ) : <p className="text-center text-muted-foreground py-16">Bu filtrelerle eşleşen etkinlik verisi bulunamadı.</p>
             }
        </CardContent>
         {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t">
                <span className="text-sm text-muted-foreground">Toplam {filteredActivityItems.length} veri.</span>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Önceki</Button>
                    <span className="text-sm font-medium">Sayfa {currentPage} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}>Sonraki</Button>
                </div>
            </div>
        )}
      </Card>
        <AiActivityGenerationPanel
            isOpen={isAIGenOpen}
            onOpenChange={setIsAIGenOpen}
            context={aiGenerationContext}
            onDataGenerated={fetchData}
        />
        <BulkActivityImportDialog
            isOpen={isBulkOpen}
            onOpenChange={setIsBulkOpen}
            onImported={fetchData}
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
    </div>
  )
}
