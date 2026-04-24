'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

// UI Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
    AlertDialogTitle as RadixAlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Lucide Icons
import { 
    Loader2, Scale as ScaleIcon, BookOpen, ListChecks, PlusCircle, Trash2, 
    AlertTriangle, FolderOpen, UserCheck, Filter, Trophy, BarChart3, Home, UserCog,
    Sparkles, ClipboardList, Check, Settings, FileEdit, X, Plus, GripVertical
} from 'lucide-react';

// Firebase and Actions
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { createScale, getTeacherScales, deleteScale, getBranchScaleScores, type BranchScore, getScaleTemplates, saveScaleTemplate, deleteScaleTemplate } from './actions';
import { type ScaleTemplate } from '@/lib/scale-templates';

// Types and Utils
import type { EvaluationScale, SchoolClass, Course, Unit } from '@/lib/types';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type EnrichedCourse = Course & { units: Unit[] };
type EnrichedClass = SchoolClass & { courses: EnrichedCourse[] };

const createScaleSchema = z.object({
    name: z.string().min(3, { message: "Ölçek adı en az 3 karakter olmalıdır." }),
    type: z.enum(['tally', 'checklist', 'points']),
    templateId: z.string().optional(),
});

type CreateScaleFormValues = z.infer<typeof createScaleSchema>;

// --- ŞABLON EDİTÖRÜ BİLEŞENİ ---
function TemplateManagerDialog({
    isOpen,
    onOpenChange,
    templates,
    onSave,
    onDelete,
    isSaving
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    templates: ScaleTemplate[];
    onSave: (template: Partial<ScaleTemplate>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    isSaving: boolean;
}) {
    const [editingTemplate, setEditingTemplate] = useState<Partial<ScaleTemplate> | null>(null);

    const handleAdd = () => {
        setEditingTemplate({
            id: `temp-${Date.now()}`,
            name: '',
            description: '',
            type: 'checklist',
            columns: [{ id: `col_${Date.now()}`, name: 'Kriter 1', type: 'status' }]
        });
    };

    const handleEdit = (t: ScaleTemplate) => {
        setEditingTemplate(JSON.parse(JSON.stringify(t)));
    };

    const handleColumnChange = (colId: string, name: string) => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            columns: editingTemplate.columns?.map(c => c.id === colId ? { ...c, name } : c)
        });
    };

    const addColumn = () => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            columns: [
                ...(editingTemplate.columns || []),
                { id: `col_${Date.now()}`, name: `Kriter ${editingTemplate.columns?.length || 0 + 1}`, type: editingTemplate.type === 'points' ? 'number' : 'status' }
            ]
        });
    };

    const removeColumn = (id: string) => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            columns: editingTemplate.columns?.filter(c => c.id !== id)
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl bg-slate-950 border-white/10 text-white h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-white/5 bg-slate-900/50">
                    <DialogTitle className="text-2xl font-black flex items-center gap-3">
                        <Settings className="w-6 h-6 text-indigo-400" />
                        Şablon Yönetimi
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Hazır ölçek listesini buradan düzenleyebilir veya yeni şablonlar ekleyebilirsiniz.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* SOL: LİSTE */}
                    <div className="w-full md:w-80 border-r border-white/5 flex flex-col bg-slate-900/30">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kayıtlı Şablonlar</span>
                            <Button size="icon" variant="ghost" onClick={handleAdd} className="h-7 w-7 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {templates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleEdit(t)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl transition-all border",
                                            editingTemplate?.id === t.id 
                                                ? "bg-indigo-600/20 border-indigo-500/50 text-white" 
                                                : "bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                        )}
                                    >
                                        <p className="font-bold text-sm truncate">{t.name}</p>
                                        <p className="text-[10px] opacity-60 uppercase">{t.type === 'points' ? 'Puanlı' : 'Kontrol'}</p>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* SAĞ: EDİTÖR */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
                        {editingTemplate ? (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-400 text-xs uppercase font-bold">Şablon Adı</Label>
                                        <Input 
                                            value={editingTemplate.name} 
                                            onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} 
                                            className="bg-slate-900 border-white/10 text-white h-11"
                                            placeholder="Örn: Namaz Takibi"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-400 text-xs uppercase font-bold">Ölçek Tipi</Label>
                                        <Select 
                                            value={editingTemplate.type} 
                                            onValueChange={(v: any) => {
                                                const newCols = editingTemplate.columns?.map(c => ({...c, type: v === 'points' ? 'number' : 'status'}));
                                                setEditingTemplate({...editingTemplate, type: v, columns: newCols as any});
                                            }}
                                        >
                                            <SelectTrigger className="bg-slate-900 border-white/10 text-white h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                <SelectItem value="checklist">Kontrol Listesi</SelectItem>
                                                <SelectItem value="points">Puanlı Ölçek</SelectItem>
                                                <SelectItem value="tally">Çetele</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-400 text-xs uppercase font-bold">Açıklama</Label>
                                    <Input 
                                        value={editingTemplate.description} 
                                        onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})} 
                                        className="bg-slate-900 border-white/10 text-white h-11"
                                        placeholder="Kısa açıklama..."
                                    />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-indigo-400 font-black uppercase tracking-wider text-xs">Sütunlar (Kriterler)</Label>
                                        <Button size="sm" variant="outline" onClick={addColumn} className="border-indigo-500/30 text-indigo-400 h-8">
                                            <Plus className="w-3 h-3 mr-1" /> Ekle
                                        </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {editingTemplate.columns?.map((col, idx) => (
                                            <div key={col.id} className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-white/5">
                                                <div className="bg-white/5 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-slate-500">{idx + 1}</div>
                                                <Input 
                                                    value={col.name} 
                                                    onChange={e => handleColumnChange(col.id, e.target.value)} 
                                                    className="bg-transparent border-0 h-8 text-sm focus-visible:ring-0 p-1"
                                                    placeholder="Sütun adı..."
                                                />
                                                <Button size="icon" variant="ghost" onClick={() => removeColumn(col.id)} className="h-7 w-7 text-slate-500 hover:text-red-400">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-8 flex items-center justify-between border-t border-white/5">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" className="text-red-500 hover:bg-red-500/10 h-10 px-4">
                                                <Trash2 className="w-4 h-4 mr-2" /> Şablonu Sil
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                            <AlertDialogHeader>
                                                <RadixAlertDialogTitle>Emin misiniz?</RadixAlertDialogTitle>
                                                <AlertDialogDescription className="text-slate-400">Bu şablon kalıcı olarak silinecektir.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-transparent text-slate-400">İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => { onDelete(editingTemplate.id!); setEditingTemplate(null); }} className="bg-red-600 hover:bg-red-500">Evet, Sil</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    <Button onClick={() => onSave(editingTemplate)} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 px-8">
                                        {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        <Save className="w-4 h-4 mr-2" /> Şablonu Kaydet
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
                                <Settings className="w-16 h-16 opacity-10" />
                                <p className="text-lg">Düzenlemek için bir şablon seçin veya yeni bir tane oluşturun.</p>
                                <Button variant="outline" onClick={handleAdd} className="border-white/10 text-slate-300">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Yeni Şablon Ekle
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 bg-slate-900 border-t border-white/5">
                    <DialogClose asChild><Button variant="ghost" className="text-slate-400">Kapat</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- CREATE SCALE FORM ---
function CreateScaleForm({ onSave, isSaving, selectedClass, selectedBranch, selectedCourseId, templates, onManageTemplates, isSuperAdmin }: {
    onSave: (data: Omit<CreateScaleFormValues, 'branch'> & { generatedName: string, courseId: string, columns: any[] }) => void;
    isSaving: boolean;
    selectedClass: SchoolClass | undefined;
    selectedBranch: string;
    selectedCourseId: string;
    templates: ScaleTemplate[];
    onManageTemplates: () => void;
    isSuperAdmin: boolean;
}) {
    const { handleSubmit, control, watch, formState: { errors }, reset, setValue } = useForm<CreateScaleFormValues>({
        resolver: zodResolver(createScaleSchema),
        defaultValues: {
            name: '',
            type: 'checklist',
            templateId: 'none'
        }
    });

    const selectedTemplateId = watch('templateId');

    // Şablon seçildiğinde form alanlarını güncelle
    useEffect(() => {
        if (selectedTemplateId && selectedTemplateId !== 'none') {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (template) {
                setValue('name', template.name.split(' (')[0]);
                setValue('type', template.type);
            }
        }
    }, [selectedTemplateId, setValue, templates]);

    const onSubmit = (data: CreateScaleFormValues) => {
        if (!selectedClass || !selectedCourseId) return;
        
        let finalColumns: any[] = [];
        
        if (data.templateId && data.templateId !== 'none') {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (template) {
                finalColumns = template.columns;
            }
        } else {
            finalColumns = [{ id: `col_${Date.now()}`, name: 'Başlık 1', type: data.type === 'points' ? 'number' : 'status' }];
        }

        const generatedName = `${data.name} (${selectedClass.name} - ${selectedBranch})`;
        onSave({ ...data, generatedName, courseId: selectedCourseId, columns: finalColumns });
        reset();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-6 rounded-xl bg-slate-950/30 border border-white/5 shadow-inner">
            
            <div className="space-y-4">
                <div className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                        <Label className="text-indigo-400 text-xs font-bold uppercase flex items-center gap-2">
                            <Sparkles className="w-3 h-3"/> Hazır Şablon Seç (Önerilen)
                        </Label>
                        {isSuperAdmin && (
                            <Button type="button" variant="ghost" size="sm" onClick={onManageTemplates} className="h-6 text-[10px] text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10">
                                <Settings className="w-3 h-3 mr-1" /> Şablonları Yönet
                            </Button>
                        )}
                    </div>
                    <Controller
                        name="templateId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="bg-slate-900 border-white/10 text-white h-12">
                                    <SelectValue placeholder="Bir şablon seçin veya kendiniz oluşturun" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="none">Şablon Kullanma (Boş Ölçek)</SelectItem>
                                    {templates.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold">{t.name}</span>
                                                <span className="text-[10px] text-slate-500">{t.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="scale-name" className="text-slate-300">Ölçek Adı</Label>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => <Input id="scale-name" {...field} placeholder="Örn: Namaz Çetelesi" className="bg-slate-900 border-white/10 text-white h-10" />}
                        />
                        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label className="text-slate-300">Ölçek Tipi</Label>
                        <Controller
                            name="type"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value} disabled={selectedTemplateId !== 'none'}>
                                    <SelectTrigger className="bg-slate-900 border-white/10 text-white h-10"><SelectValue/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="tally">Çetele (+/-)</SelectItem>
                                        <SelectItem value="checklist">Kontrol Listesi (Başarı Oranlı)</SelectItem>
                                        <SelectItem value="points">Puanlı Ölçek (Sayısal Giriş)</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
                <Button type="submit" disabled={isSaving || !selectedCourseId || !watch('name')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20 px-8 h-11">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
                    <Check className="h-4 w-4 mr-2"/> Ölçeği Hemen Oluştur
                </Button>
            </div>
        </form>
    );
}

// --- ANA SAYFA ---
export default function ScalesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    
    // Veri State'leri
    const [unitBasedData, setUnitBasedData] = useState<EnrichedClass[]>([]);
    const [manualScales, setManualScales] = useState<EvaluationScale[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [templates, setTemplates] = useState<ScaleTemplate[]>([]);
    
    // UI State'leri
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isCreateAccordionOpen, setIsCreateAccordionOpen] = useState(false);
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
    
    // Seçim State'leri
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    
    // İstatistik State'i
    const [branchScores, setBranchScores] = useState<BranchScore[]>([]);
    const [isLoadingScores, setIsLoadingScores] = useState(true);

    const selectedClass = useMemo(() => allClasses.find(c => c.id === selectedClassId), [allClasses, selectedClassId]);

    // Verileri Çek
    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setFetchError(null);
        try {
            const [scalesResult, classesSnap, coursesSnap, templatesData] = await Promise.all([
                getTeacherScales(user.uid),
                getDocs(query(collection(db, 'classes'), orderBy('name'))),
                getDocs(query(collection(db, 'courses'), orderBy('title'))),
                getScaleTemplates()
            ]);

            if(scalesResult.success && scalesResult.data) {
                 setManualScales(scalesResult.data);
            } else if (scalesResult.error) {
                 setFetchError(scalesResult.error);
                 setManualScales([]);
            }

            const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setAllClasses(classes);
            setAllCourses(courses);
            setTemplates(templatesData);
            
            const enrichedClasses: EnrichedClass[] = await Promise.all(classes.map(async (cls) => {
                 const coursesForClass = courses.filter(course => course.classId === cls.id || !course.classId);

                 const enrichedCourses = await Promise.all(coursesForClass.map(async course => {
                     const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`)));
                     const units = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
                     units.sort((a,b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));
                     return { ...course, units };
                 }));

                return { ...cls, courses: enrichedCourses };
            }));

            setUnitBasedData(enrichedClasses);

        } catch (error) {
            console.error("Error fetching scales data:", error);
            setFetchError("Ölçek verileri alınırken bir sorun oluştu.");
        }
        setIsLoading(false);
    }, [user]);

    // Şube Skorlarını Çek
    useEffect(() => {
        const fetchBranchScores = async () => {
            setIsLoadingScores(true);
            const scores = await getBranchScaleScores();
            setBranchScores(scores);
            setIsLoadingScores(false);
        };
        fetchBranchScores();
    }, []);

    useEffect(() => {
        if(user) {
            fetchData();
        }
    }, [user, fetchData]);
    
     const handleDeleteScale = async (scaleId: string) => {
        const result = await deleteScale(scaleId);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Ölçek ve tüm girişleri silindi." });
            await fetchData();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    };
    
    const handleCreateScale = async (data: Omit<CreateScaleFormValues, 'branch'> & { generatedName: string, courseId: string, columns: any[] }) => {
        if (!user) return;
        setIsSaving(true);
        
        const dataToSave = {
            name: data.generatedName,
            type: data.type,
            teacherId: user.uid,
            classId: selectedClassId,
            courseId: data.courseId,
            columns: data.columns || [],
        };
        
        const result = await createScale(dataToSave as any);
        if (result.success) {
            toast({ title: "Başarılı", description: "Yeni ölçek oluşturuldu." });
            await fetchData();
            setIsCreateAccordionOpen(false);
        } else {
             toast({ title: "Hata", description: result.error, variant: "destructive"});
        }
        setIsSaving(false);
    };

    const handleSaveTemplate = async (template: Partial<ScaleTemplate>) => {
        setIsSaving(true);
        const result = await saveScaleTemplate(template);
        if (result.success) {
            toast({ title: "Başarılı", description: "Şablon güncellendi." });
            const updated = await getScaleTemplates();
            setTemplates(updated);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    }

    const handleDeleteTemplate = async (id: string) => {
        const result = await deleteScaleTemplate(id);
        if (result.success) {
            toast({ title: "Silindi" });
            const updated = await getScaleTemplates();
            setTemplates(updated);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    }

    const filteredUnitData = useMemo(() => {
        if (!selectedClass) return [];
        const classData = unitBasedData.find(c => c.id === selectedClassId);
        if (!classData) return [];

        const courses = classData.courses.map(course => ({
            ...course,
            units: course.units
        }));
        
        return [{...classData, courses }];

    }, [unitBasedData, selectedClassId, selectedClass]);
    
    const filteredManualScales = useMemo(() => {
        if (!selectedClassId) return manualScales;
        const className = selectedClass?.name;
        if (!className) return [];
    
        return manualScales.filter(scale => {
            const scaleClassNameMatch = scale.name.match(/\(([^)]+)\)/);
            if (!scaleClassNameMatch) return false;
            const scaleFullName = scaleClassNameMatch[1];
            const [scaleBaseClass, scaleBranch] = scaleFullName.split(' - ');
    
            if (scaleBaseClass !== className) {
                return false;
            }
            if (selectedBranch === 'all' || !selectedBranch) {
                return true; 
            }
            return scaleBranch === selectedBranch;
        });
    }, [manualScales, selectedClassId, selectedBranch, selectedClass]);


    const coursesForManualCreation = useMemo(() => {
        if (!selectedClass) return [];
         return allCourses.filter(c => c.classId === selectedClassId || !c.classId);
    }, [allCourses, selectedClass, selectedClassId]);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full py-20 bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
             {/* Arka Plan */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                
                {/* Ana Başlık ve Aksiyonlar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                     <div>
                        <h1 className="text-4xl font-black text-white flex items-center gap-3"><ScaleIcon className="text-purple-400 h-8 w-8"/> Değerlendirme Ölçekleri</h1>
                        <p className="text-slate-400 text-sm mt-1">Sınıf içi performans takibi ve analiz.</p>
                     </div>
                     
                     <div className="flex gap-3">
                         <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900">
                           <Link href="/"><Home className="mr-2 h-4 w-4"/>Panele Dön</Link>
                         </Button>
                         <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900">
                           <Link href="/teacher/students"><UserCog className="mr-2 h-4 w-4"/>Sanal Öğrencileri Yönet</Link>
                         </Button>
                         <Button 
                             onClick={() => setIsCreateAccordionOpen(!isCreateAccordionOpen)} 
                             className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20"
                         >
                             <PlusCircle className="mr-2 h-4 w-4"/> Yeni Ölçek Oluştur
                         </Button>
                     </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* SOL SÜTUN: Filtreler ve Analizler */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Filtre Kartı */}
                        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-white flex items-center gap-2 text-xl">
                                    <Filter className="h-5 w-5 text-slate-400"/> Filtreler
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-slate-300">Sınıf Seçimi</Label>
                                        <Select value={selectedClassId} onValueChange={(value) => { setSelectedClassId(value); setSelectedBranch(''); setSelectedCourseId('') }}>
                                            <SelectTrigger className="bg-slate-900 border-white/10 text-white h-10"><SelectValue placeholder="Sınıf Seçin..."/></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-300">Şube Seçimi</Label>
                                        <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!selectedClass}>
                                            <SelectTrigger className="bg-slate-900 border-white/10 text-white h-10"><SelectValue placeholder="Şube Seçin..." /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                <SelectItem value="all">Tüm Şubeler</SelectItem>
                                                {selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        {/* Manuel Ölçek Oluşturma (Accordion) */}
                        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
                            <Accordion type="single" value={isCreateAccordionOpen ? "create-scale" : ""} onValueChange={(value) => setIsCreateAccordionOpen(value === "create-scale")}>
                                <AccordionItem value="create-scale" className="border-b-0">
                                    <AccordionTrigger className="p-4 text-left hover:no-underline bg-white/5 data-[state=open]:bg-white/10">
                                        <div className="flex items-center gap-3">
                                            <PlusCircle className="h-5 w-5 text-indigo-400"/>
                                            <span className="font-bold text-white text-lg">Yeni Manuel Ölçek Oluştur</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-6 pt-4 space-y-4">
                                            {selectedBranch && selectedBranch !== 'all' ? (
                                                <>
                                                    <div className="space-y-1">
                                                        <Label className="text-slate-300 text-xs">Ders Seçimi (Ölçeğin İlişkilendirileceği)</Label>
                                                        <Select onValueChange={setSelectedCourseId} value={selectedCourseId}>
                                                            <SelectTrigger className="bg-slate-900 border-white/10 text-white h-10"><SelectValue placeholder="Ders Seçin..."/></SelectTrigger>
                                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                                {coursesForManualCreation.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    {selectedCourseId && <CreateScaleForm 
                                                        onSave={handleCreateScale}
                                                        isSaving={isSaving}
                                                        selectedClass={selectedClass}
                                                        selectedBranch={selectedBranch}
                                                        selectedCourseId={selectedCourseId}
                                                        templates={templates}
                                                        onManageTemplates={() => setIsTemplateManagerOpen(true)}
                                                        isSuperAdmin={user?.role === 'superadmin'}
                                                    />}
                                                </>
                                            ) : (
                                                <p className="text-muted-foreground text-sm text-center p-4">Lütfen önce bir **Sınıf** ve **Şube** seçin.</p>
                                            )}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </Card>

                        {/* Analiz Kartı (Sadece Şube Sıralaması) */}
                        <div className="space-y-6">
                            <BranchLeaderboardCard branchScores={branchScores} isLoading={isLoadingScores} />
                        </div>
                    </div>

                    {/* SAĞ SÜTUN: Sonuçlar (Üniteler ve Manuel Ölçekler) */}
                    <div className="lg:col-span-2 space-y-8">
                        {fetchError && <ErrorWithLink message={fetchError} />}

                        {selectedBranch && selectedBranch !== 'all' ? (
                            <>
                                {/* Ünite Bazlı Kontrol Listeleri */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-black text-white flex items-center gap-2 border-b border-white/10 pb-2">
                                        <ListChecks className="h-6 w-6 text-cyan-400"/> Ünite Bazlı Listeler
                                    </h3>
                                    
                                    {filteredUnitData.length > 0 && filteredUnitData[0].courses.length > 0 ? (
                                        <Accordion type="multiple" className="w-full space-y-4">
                                            {filteredUnitData[0].courses.map(course => (
                                                <AccordionItem key={course.id} value={course.id} className="border border-white/10 rounded-xl bg-slate-900/50 overflow-hidden shadow-lg">
                                                    <AccordionTrigger className="p-4 text-lg font-bold hover:no-underline hover:bg-white/5 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <BookOpen className="h-5 w-5 text-cyan-400"/> {course.title}
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-4 bg-black/20">
                                                        {course.units.length > 0 ? (
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {course.units.map(unit => (
                                                                    <Button key={unit.id} asChild variant="outline" className="h-20 text-base flex-col gap-1 border-white/10 text-white hover:bg-white/5 bg-slate-900/50 transition-all hover:-translate-y-1">
                                                                        <Link href={`/teacher/scales/${unit.id}?type=unit&courseId=${course.id}&branch=${selectedBranch}`}>
                                                                            <ListChecks className="h-5 w-5 text-white/70"/>
                                                                            <span className="font-bold text-sm">{unit.title}</span>
                                                                        </Link>
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        ) : <p className="text-center text-sm text-slate-500 p-4">Bu derse ünite eklenmemiş.</p>}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    ) : <p className="text-muted-foreground text-center p-8">Bu şube için ders içeriği bulunamadı.</p>}
                                </div>

                                {/* Manuel Ölçekler Listesi */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-black text-white flex items-center gap-2 border-b border-white/10 pb-2">
                                        <UserCheck className="h-6 w-6 text-purple-400"/> Özel Ölçekler ({filteredManualScales.length})
                                    </h3>
                                    
                                    {filteredManualScales.length > 0 ? (
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            {filteredManualScales.map(scale => {
                                                const courseName = allCourses.find(c => c.id === scale.courseId)?.title || 'Bilinmeyen Ders';
                                                return (
                                                    <Card key={scale.id} className="bg-slate-900 border-white/10 hover:border-purple-500/50 hover:bg-slate-800/80 transition-all">
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-sm font-bold text-white">{scale.name.split(' (')[0]}</CardTitle>
                                                            <CardDescription className="text-xs text-slate-500">{courseName}</CardDescription>
                                                            <Badge variant="outline" className="w-fit text-[10px] mt-1 bg-white/5">{scale.type === 'points' ? 'Puanlı' : scale.type === 'tally' ? 'Çetele' : 'Kontrol Listesi'}</Badge>
                                                        </CardHeader>
                                                        <CardFooter className="flex justify-between items-center pt-2 gap-2">
                                                            <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-500 text-white flex-1 text-xs">
                                                                <Link href={`/teacher/scales/${scale.id}?type=manual`}>Değerlendirme</Link>
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4"/></Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                                                    <AlertDialogHeader>
                                                                        <RadixAlertDialogTitle className="text-red-400">Ölçeği Sil</RadixAlertDialogTitle>
                                                                        <AlertDialogDescription className="text-slate-400">"{scale.name}" ölçeği ve tüm girişleri kalıcı olarak silinecektir.</AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDeleteScale(scale.id)} className="bg-red-600 hover:bg-red-500 text-white border-none">Evet, Sil</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </CardFooter>
                                                    </Card>
                                                )
                                            })}
                                        </div>
                                    ) : <p className="text-muted-foreground text-center p-8 border-2 border-dashed border-slate-800 rounded-xl">Bu şube için özel ölçek oluşturulmamış.</p>}
                                </div>
                            </>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 bg-slate-900/30 rounded-2xl p-10 border border-dashed border-white/10">
                                <FolderOpen className="h-16 w-16 text-slate-600 mb-4" />
                                <h3 className="text-xl font-bold text-slate-400">Başlamak için Bir Sınıf ve Şube Seçin</h3>
                                <p className="mt-2 text-sm max-w-sm">Değerlendirme yapmak veya yeni ölçek oluşturmak için lütfen sol taraftaki menüden bir sınıf ve ardından şube seçimi yapın.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TemplateManagerDialog 
                isOpen={isTemplateManagerOpen}
                onOpenChange={setIsTemplateManagerOpen}
                templates={templates}
                onSave={handleSaveTemplate}
                onDelete={handleDeleteTemplate}
                isSaving={isSaving}
            />
        </div>
    );
}