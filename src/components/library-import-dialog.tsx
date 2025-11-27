

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Library, PlusCircle, AlertTriangle } from 'lucide-react';
import { getLibraryItems, type LibraryFilter } from '@/app/teacher/content-creation/edit/library-actions';
import type { Question, ActivityItem, LessonStep, Course, Unit, Topic, SchoolClass, UploadedImage, VideoAsset } from '@/lib/types';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Card, CardContent, CardFooter } from './ui/card';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import Image from 'next/image';

type LibraryItem = Question | ActivityItem | UploadedImage | VideoAsset;

function LibraryItemCard({ item, onSelect, isSelected }: { item: LibraryItem, onSelect: (item: LibraryItem) => void, isSelected: boolean }) {
    
    const renderContent = () => {
        if ('text' in item) return (item as Question).text;
        if ('downloadUrl' in item) return <Image src={(item as UploadedImage).downloadUrl} alt={(item as UploadedImage).title || 'Görsel'} width={150} height={100} className="w-full h-24 object-cover rounded-md" />;
        if ('type' in item && item.type === 'video') return <p>{(item as VideoAsset).title}</p>;
        
        const actItem = item as ActivityItem;
        switch(actItem.type) {
            case 'concept': return actItem.content.text;
            case 'definition': return `${actItem.content.term}: ${actItem.content.definition}`;
            case 'sentence': return actItem.content.text;
            case 'categorization': return `Oyun: ${actItem.content.title}`;
            default: return 'Bilinmeyen öğe';
        }
    }
    
    const renderTypeBadge = () => {
        if ('text' in item) { // Question
            const q = item as Question;
            const difficultyColors: Record<string, string> = {
                'Kolay': 'bg-green-100 text-green-800',
                'Orta': 'bg-yellow-100 text-yellow-800',
                'Zor': 'bg-red-100 text-red-800',
            };
            return (
                <div className='flex items-center gap-1'>
                    <Badge variant="secondary">Soru</Badge>
                    <Badge variant="outline" className={cn("border", difficultyColors[q.difficulty] || '')}>{q.difficulty}</Badge>
                </div>
            )
        }
        if ('downloadUrl' in item) {
            return <Badge variant="outline">Görsel</Badge>
        }
        if ('type' in item && item.type === 'video') {
            return <Badge variant="outline">Video</Badge>
        }

        const actItem = item as ActivityItem;
        const typeLabels: Record<string, string> = {
            concept: 'Kavram',
            definition: 'Tanım',
            sentence: 'Cümle',
            categorization: 'Kategorizasyon'
        }
        return <Badge variant="outline">Etkinlik: {typeLabels[actItem.type]}</Badge>
    }

    return (
        <Card 
            className={cn("flex flex-col hover:shadow-md transition-shadow cursor-pointer", isSelected && "ring-2 ring-primary")}
            onClick={() => onSelect(item)}
        >
            <CardContent className="p-3 flex-grow space-y-2">
                <div className="text-sm font-medium line-clamp-3">{renderContent()}</div>
            </CardContent>
            <CardFooter className="p-2 bg-muted/50 flex justify-between items-center text-xs">
                {renderTypeBadge()}
                <Checkbox checked={isSelected} />
            </CardFooter>
        </Card>
    )
}

export function LibraryImportDialog({ isOpen, onOpenChange, onItemsSelected, context, config }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onItemsSelected: (items: LibraryItem[], stepType: LessonStep['type'] | 'keyConcepts' | 'questions' | 'images' | 'video') => void;
    context: { courseId?: string | null, unitId?: string | null, topicId?: string | null };
    config: { filter: (ActivityItem['type'] | 'questions' | 'imageLibrary' | 'videos')[]; multiSelect: boolean; stepType: LessonStep['type'] | 'keyConcepts' | 'questions' | 'images' | 'video'; };
}) {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [allCourses, setAllCourses] = useState<(Course & { units: (Unit & { topics: Topic[]})[]})[]>([]);
    
    const [filters, setFilters] = useState<LibraryFilter>({
        type: config.filter.includes('questions') ? 'questions' : config.filter.includes('imageLibrary') ? 'imageLibrary' : 'activities',
    });
    
    const { toast } = useToast();

     useEffect(() => {
        if (!isOpen) return;
        
        setFilters(prev => ({
            ...prev,
            type: config.filter.includes('questions') ? 'questions' : config.filter.includes('imageLibrary') ? 'imageLibrary' : 'activities',
        }));

        const fetchFilterData = async () => {
            if (allClasses.length > 0) return; // Don't refetch
            try {
                const [classesSnapshot, coursesSnapshot] = await Promise.all([
                    getDocs(query(collection(db, 'classes'), orderBy('name'))),
                    getDocs(query(collection(db, 'courses')))
                ]);
                
                const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SchoolClass);
                setAllClasses(classesData);

                const coursesData = await Promise.all(coursesSnapshot.docs.map(async (courseDoc) => {
                    const course = { id: courseDoc.id, ...courseDoc.data() } as Course & { units: (Unit & { topics: Topic[]})[] };
                    const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`)));
                    course.units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                        const unit = { id: unitDoc.id, ...unitDoc.data() } as Unit & { topics: Topic[] };
                        const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unit.id}/topics`)));
                        unit.topics = topicsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Topic);
                        return unit;
                    }));
                    return course;
                }));
                setAllCourses(coursesData);
            } catch(e) {
                console.error("Error fetching filter data:", e);
            }
        };
        
        fetchFilterData();
    }, [isOpen, config.filter]);
    
    useEffect(() => {
        if (!isOpen) return;
        const fetchItems = async () => {
            setIsLoading(true);
            setError(null);
            setSelectedItemIds(new Set());
            
            const filterPayload: LibraryFilter = { 
                ...filters, 
                activityTypes: config.filter.filter(f => f !== 'questions' && f !== 'imageLibrary' && f !== 'videos') as ActivityItem['type'][],
                questionTypes: config.filter.includes('questions') ? ['Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma'] : [],
            };
            const { items: fetchedItems, error: fetchError } = await getLibraryItems(filterPayload);
            
            if (fetchError) setError(fetchError);
            else setItems(fetchedItems);
            
            setIsLoading(false);
        };
        fetchItems();
    }, [isOpen, filters, config.filter]);

    const handleSelect = (item: LibraryItem) => {
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(item.id)) {
                newSet.delete(item.id);
            } else {
                if (!config.multiSelect) {
                    newSet.clear();
                }
                newSet.add(item.id);
            }
            return newSet;
        });
    };
    
    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedItemIds(new Set(items.map(item => item.id)));
        } else {
            setSelectedItemIds(new Set());
        }
    };
    
    const handleAddSelected = () => {
        const selected = items.filter(item => selectedItemIds.has(item.id));
        onItemsSelected(selected, config.stepType);
        onOpenChange(false);
    };

    const { filteredCourses, filteredUnits, filteredTopics } = useMemo(() => {
        if (!filters.classId || filters.classId === 'all') {
            return { filteredCourses: allCourses, filteredUnits: [], filteredTopics: [] };
        }
        const fc = allCourses.filter(c => c.classId === filters.classId || !c.classId);
        
        if (!filters.courseId || filters.courseId === 'all') {
            return { filteredCourses: fc, filteredUnits: [], filteredTopics: [] };
        }
        const fu = fc.find(c => c.id === filters.courseId)?.units || [];

        if (!filters.unitId || filters.unitId === 'all') {
             return { filteredCourses: fc, filteredUnits: fu, filteredTopics: [] };
        }
        const ft = fu.find(u => u.id === filters.unitId)?.topics || [];

        return { filteredCourses: fc, filteredUnits: fu, filteredTopics: ft };
    }, [filters, allCourses]);

    const renderTabContent = (itemsToRender: LibraryItem[]) => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
        }
        if (error) {
             return (
                <Alert variant="destructive" className="whitespace-pre-wrap">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Veri Yüklenemedi!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )
        }
        if (itemsToRender.length === 0) {
            return <p className="text-center text-muted-foreground pt-10">Bu filtreler için kütüphanede öğe bulunamadı.</p>
        }
        
        const allOnPageSelected = items.length > 0 && items.every(item => selectedItemIds.has(item.id));

        return (
            <>
                {config.multiSelect && (
                    <div className="flex items-center space-x-2 mb-4 p-2 bg-muted/50 rounded-md">
                        <Checkbox
                            id="select-all-library"
                            checked={allOnPageSelected}
                            onCheckedChange={handleSelectAll}
                        />
                        <Label htmlFor="select-all-library" className="font-semibold">
                            Tümünü Seç ({items.length})
                        </Label>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {itemsToRender.map(item => <LibraryItemCard key={item.id} item={item} onSelect={handleSelect} isSelected={selectedItemIds.has(item.id)} />)}
                </div>
            </>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Library /> Veri Bankasından İçerik Ekle</DialogTitle>
                </DialogHeader>
                {filters.type !== 'imageLibrary' && (
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2">
                        <Select value={filters.classId || 'all'} onValueChange={v => setFilters({ type: config.filter.includes('questions') ? 'questions' : 'activities', classId: v === 'all' ? null : v, courseId: null, unitId: null, topicId: null })}>
                            <SelectTrigger><SelectValue placeholder="Sınıf Seçin..." /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Tüm Sınıflar</SelectItem>{allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                         <Select value={filters.courseId || 'all'} onValueChange={v => setFilters(f => ({ ...f, courseId: v === 'all' ? null : v, unitId: null, topicId: null }))} disabled={!filters.classId}>
                            <SelectTrigger><SelectValue placeholder="Ders Seçin..." /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Tüm Dersler</SelectItem>{filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                        </Select>
                         <Select value={filters.unitId || 'all'} onValueChange={v => setFilters(f => ({ ...f, unitId: v === 'all' ? null : v, topicId: null }))} disabled={!filters.courseId}>
                            <SelectTrigger><SelectValue placeholder="Ünite Seçin..." /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Tüm Üniteler</SelectItem>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent>
                        </Select>
                         <Select value={filters.topicId || 'all'} onValueChange={v => setFilters(f => ({ ...f, topicId: v === 'all' ? null : v }))} disabled={!filters.unitId}>
                            <SelectTrigger><SelectValue placeholder="Konu Seçin..." /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Tüm Konular</SelectItem>{filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                )}
                
                <div className="flex-grow mt-4 overflow-hidden">
                    <ScrollArea className="h-full pr-4">
                        {renderTabContent(items)}
                    </ScrollArea>
                </div>

                <DialogFooter className="pt-4 border-t flex-shrink-0">
                    <span className="text-sm text-muted-foreground mr-auto">{selectedItemIds.size} öğe seçildi.</span>
                    <Button onClick={() => onOpenChange(false)} variant="ghost">İptal</Button>
                    <Button onClick={handleAddSelected} disabled={selectedItemIds.size === 0}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Seçilenleri Ekle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
