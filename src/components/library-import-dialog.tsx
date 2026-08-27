"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Library, PlusCircle, AlertTriangle, Search, Check, Filter } from 'lucide-react';
import { getLibraryItems, type LibraryFilter } from '@/app/teacher/content-creation/edit/library-actions';
import type { Question, ActivityItem, LessonStep, Course, Unit, Topic, SchoolClass, ImageAsset } from '@/lib/types';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardFooter } from './ui/card';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import Image from 'next/image';

type LibraryItem = Question | ActivityItem | ImageAsset;

function LibraryItemCard({ item, onSelect, isSelected }: { item: LibraryItem, onSelect: (item: LibraryItem) => void, isSelected: boolean }) {
    const isQuestion = 'text' in item && 'type' in item && ['Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma'].includes((item as any).type);
    const isImage = 'url' in item && 'storagePath' in item;

    const renderContent = () => {
        if (isImage) {
            return (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                    <Image src={(item as ImageAsset).url} alt={(item as ImageAsset).title || 'Görsel'} fill className="object-cover" />
                </div>
            );
        }
        if (isQuestion) {
            const q = item as Question;
            return (
                <div className="space-y-1.5">
                    <p className="text-sm font-bold text-slate-100 line-clamp-2">{q.text}</p>
                    {q.options && q.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {q.options.slice(0, 4).map((opt, i) => (
                                <span key={i} className={cn("text-[10px] px-2 py-0.5 rounded-md border", opt === q.correctAnswer ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold" : "bg-slate-900 text-slate-400 border-white/5")}>
                                    {opt}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            );
        } else {
            const actItem = item as ActivityItem;
            switch (actItem.type) {
                case 'concept': 
                    return (
                        <div>
                            <span className="text-xs font-black uppercase text-blue-400 tracking-wider block mb-1">Kavram</span>
                            <p className="text-sm font-bold text-white">{actItem.content?.text || (actItem as any).title}</p>
                        </div>
                    );
                case 'definition': 
                    return (
                        <div className="space-y-1">
                            <span className="text-xs font-black uppercase text-emerald-400 tracking-wider block mb-1">Tanım Kartı</span>
                            <p className="text-sm font-bold text-white">{(actItem.content as any)?.term || (actItem as any).term || (actItem as any).concept}</p>
                            <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{(actItem.content as any)?.definition || (actItem as any).definition}</p>
                        </div>
                    );
                case 'sentence': 
                    return (
                        <div>
                            <span className="text-xs font-black uppercase text-cyan-400 tracking-wider block mb-1">Cümle</span>
                            <p className="text-sm font-medium text-slate-200">{actItem.content?.text}</p>
                        </div>
                    );
                default: 
                    return <p className="text-xs text-slate-400">{(actItem.content as any)?.title || 'İçerik Öğesi'}</p>;
            }
        }
    };
    
    const renderTypeBadge = () => {
        if (isImage) {
            return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Görsel</Badge>;
        }
        if (isQuestion) {
            const q = item as Question;
            return (
                <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[10px]">{q.type || 'Soru'}</Badge>
                    {q.difficulty && (
                        <Badge variant="outline" className={cn("text-[10px]", q.difficulty === 'Kolay' ? 'text-green-400 border-green-500/30' : q.difficulty === 'Orta' ? 'text-yellow-400 border-yellow-500/30' : 'text-rose-400 border-rose-500/30')}>
                            {q.difficulty}
                        </Badge>
                    )}
                </div>
            );
        } else {
            const actItem = item as ActivityItem;
            const typeLabels: Record<string, { label: string, color: string }> = { 
                concept: { label: 'Kavram', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' }, 
                definition: { label: 'Tanım Kartı', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }, 
                sentence: { label: 'Cümle', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' }, 
                categorization: { label: 'Kategori', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' } 
            };
            const config = typeLabels[actItem.type] || { label: 'Etkinlik', color: 'text-slate-400 border-white/10 bg-white/5' };
            return <Badge variant="outline" className={cn("text-[10px]", config.color)}>{config.label}</Badge>;
        }
    };

    return (
        <Card 
            className={cn(
                "flex flex-col justify-between transition-all duration-200 cursor-pointer rounded-2xl border overflow-hidden",
                isSelected 
                    ? "bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500" 
                    : "bg-slate-900/60 hover:bg-slate-800/80 border-white/5 hover:border-white/15"
            )}
            onClick={() => onSelect(item)}
        >
            <CardContent className="p-4 flex-grow space-y-2">
                {renderContent()}
                {isImage && <p className="text-xs font-bold text-slate-200 pt-1 truncate">{(item as ImageAsset).title}</p>}
            </CardContent>
            <CardFooter className="p-3 bg-slate-950/50 border-t border-white/5 flex justify-between items-center">
                {renderTypeBadge()}
                <div className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center border transition-all",
                    isSelected ? "bg-indigo-600 border-indigo-500 text-white" : "border-white/20 bg-slate-900"
                )}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
            </CardFooter>
        </Card>
    );
}

export function LibraryImportDialog({ isOpen, onOpenChange, onItemsSelected, context, config }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onItemsSelected: (items: LibraryItem[], stepType: LessonStep['type'] | 'keyConcepts' | 'questions' | 'anagramGame') => void;
    context: { courseId?: string | null, unitId?: string | null, topicId?: string | null };
    config: { filter: (ActivityItem['type'] | 'questions' | 'images')[]; multiSelect: boolean; stepType: LessonStep['type'] | 'keyConcepts' | 'questions' | 'anagramGame'; };
}) {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [allCourses, setAllCourses] = useState<(Course & { units: (Unit & { topics: Topic[]})[]})[]>([]);
    
    const [filters, setFilters] = useState<LibraryFilter>({
        type: config.filter.includes('questions') ? 'questions' : (config.filter.includes('images') ? 'images' : 'activities'),
    });
    
    const { toast } = useToast();
    const isImageType = useMemo(() => config.filter.includes('images'), [config]);

    useEffect(() => {
        if (!isOpen) return;

        const initialFilterType = config.filter.includes('questions') ? 'questions' : (config.filter.includes('images') ? 'images' : 'activities');
        setFilters({
            type: initialFilterType,
            classId: null,
            courseId: isImageType ? null : context?.courseId || null,
            unitId: isImageType ? null : context?.unitId || null,
            topicId: isImageType ? null : context?.topicId || null,
            searchTerm: '',
        });
        setSearchTerm('');
        setSelectedItemIds(new Set());

        if (!isImageType && allClasses.length === 0) {
            const fetchFilterData = async () => {
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
                            unit.topics = topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Topic);
                            return unit;
                        }));
                        return course;
                    }));
                    setAllCourses(coursesData);
                } catch (e) {
                    console.error("Error fetching filter options:", e);
                }
            };
            fetchFilterData();
        }
    }, [isOpen, context, config.filter, isImageType, allClasses.length]);
    
    useEffect(() => {
        if (!isOpen) return;
        const fetchItems = async () => {
            setIsLoading(true);
            setError(null);
            
            const filterPayload: LibraryFilter = { 
                ...filters, 
                activityTypes: config.filter.filter(f => !['questions', 'images'].includes(f)) as ActivityItem['type'][],
                questionTypes: config.filter.includes('questions') ? ['Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma'] : [],
                searchTerm,
            };

            const { items: fetchedItems, error: fetchError } = await getLibraryItems(filterPayload);
            
            if (fetchError) setError(fetchError);
            else setItems(fetchedItems);
            
            setIsLoading(false);
        };
        fetchItems();
    }, [isOpen, filters, config.filter, searchTerm]);

    const filteredItems = useMemo(() => {
        if (!items || items.length === 0) return [];
        // Eğer SADECE tanım kartı filtresi varsa ve kavram istenmemişse sadece dolu type === 'definition' olanları getir
        if (config.filter.length === 1 && config.filter.includes('definition')) {
            return items.filter(it => {
                if ('type' in it && it.type === 'concept') return false;
                if ('type' in it && it.type === 'definition') {
                    const def = (it as any).content?.definition || (it as any).definition;
                    return !!(def && String(def).trim().length > 0);
                }
                return true;
            });
        }
        return items;
    }, [items, config.filter]);

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
            setSelectedItemIds(new Set(filteredItems.map(item => item.id)));
        } else {
            setSelectedItemIds(new Set());
        }
    };
    
    const handleAddSelected = () => {
        const selected = filteredItems.filter(item => selectedItemIds.has(item.id));
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
            return (
                <div className="flex flex-col justify-center items-center h-64 gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">İçerikler Yükleniyor...</span>
                </div>
            );
        }
        if (error) {
            return (
                <Alert variant="destructive" className="bg-rose-950/40 border-rose-500/30 text-rose-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Veri Yüklenemedi</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            );
        }
        if (itemsToRender.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <Library className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-base font-bold">Kayıtlı veri bulunamadı.</p>
                    <p className="text-xs text-slate-600 mt-1">Filtreleri veya arama kelimesini değiştirerek tekrar deneyin.</p>
                </div>
            );
        }
        
        const allOnPageSelected = itemsToRender.length > 0 && itemsToRender.every(item => selectedItemIds.has(item.id));

        return (
            <div className="space-y-4">
                {config.multiSelect && (
                    <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="select-all-library"
                                checked={allOnPageSelected}
                                onCheckedChange={handleSelectAll}
                            />
                            <Label htmlFor="select-all-library" className="text-xs font-bold text-slate-300 cursor-pointer">
                                Tümünü Seç ({itemsToRender.length} Öğe)
                            </Label>
                        </div>
                        <span className="text-xs font-mono font-bold text-indigo-400">
                            {selectedItemIds.size} seçildi
                        </span>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {itemsToRender.map(item => (
                        <LibraryItemCard 
                            key={item.id} 
                            item={item} 
                            onSelect={handleSelect} 
                            isSelected={selectedItemIds.has(item.id)} 
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[88vh] flex flex-col p-0 bg-slate-950 border border-white/10 text-slate-100 shadow-2xl rounded-3xl overflow-hidden">
                <DialogHeader className="p-5 border-b border-white/10 bg-slate-900/60 backdrop-blur-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight text-white">
                            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                                <Library className="h-5 w-5" />
                            </div>
                            Veri Bankasından İçerik Aktar
                        </DialogTitle>
                        
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Kelime veya konu ara..."
                                className="pl-9 bg-slate-900 border-white/10 text-xs h-9 rounded-xl focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {!isImageType && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-3">
                            <Select value={filters.classId || 'all'} onValueChange={v => setFilters(f => ({ ...f, classId: v === 'all' ? null : v, courseId: null, unitId: null, topicId: null }))}>
                                <SelectTrigger className="bg-slate-900 border-white/10 text-xs h-9 rounded-xl"><SelectValue placeholder="Tüm Sınıflar" /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/15 text-white"><SelectItem value="all">Tüm Sınıflar</SelectItem>{allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.courseId || 'all'} onValueChange={v => setFilters(f => ({ ...f, courseId: v === 'all' ? null : v, unitId: null, topicId: null }))} disabled={!filters.classId}>
                                <SelectTrigger className="bg-slate-900 border-white/10 text-xs h-9 rounded-xl"><SelectValue placeholder="Tüm Dersler" /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/15 text-white"><SelectItem value="all">Tüm Dersler</SelectItem>{filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.unitId || 'all'} onValueChange={v => setFilters(f => ({ ...f, unitId: v === 'all' ? null : v, topicId: null }))} disabled={!filters.courseId}>
                                <SelectTrigger className="bg-slate-900 border-white/10 text-xs h-9 rounded-xl"><SelectValue placeholder="Tüm Üniteler" /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/15 text-white"><SelectItem value="all">Tüm Üniteler</SelectItem>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.topicId || 'all'} onValueChange={v => setFilters(f => ({ ...f, topicId: v === 'all' ? null : v }))} disabled={!filters.unitId}>
                                <SelectTrigger className="bg-slate-900 border-white/10 text-xs h-9 rounded-xl"><SelectValue placeholder="Tüm Konular" /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/15 text-white"><SelectItem value="all">Tüm Konular</SelectItem>{filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}
                </DialogHeader>
                
                <div className="flex-grow overflow-hidden p-5">
                    <ScrollArea className="h-full pr-3">
                        {renderTabContent(filteredItems)}
                    </ScrollArea>
                </div>

                <DialogFooter className="p-4 px-6 border-t border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between sm:justify-between flex-shrink-0">
                    <span className="text-xs font-bold text-slate-400">
                        Seçilen: <strong className="text-indigo-300">{selectedItemIds.size}</strong> öğe
                    </span>
                    <div className="flex gap-2">
                        <Button onClick={() => onOpenChange(false)} variant="ghost" className="text-slate-400 hover:text-white rounded-xl">
                            İptal
                        </Button>
                        <Button 
                            onClick={handleAddSelected} 
                            disabled={selectedItemIds.size === 0}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-950 cursor-pointer disabled:opacity-40"
                        >
                            <PlusCircle className="mr-2 h-4 w-4"/> Seçilenleri Akışa Ekle
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
