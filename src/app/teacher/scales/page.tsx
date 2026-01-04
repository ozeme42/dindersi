

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

// Lucide Icons
import { 
    Loader2, Scale as ScaleIcon, BookOpen, ListChecks, PlusCircle, Trash2, 
    AlertTriangle, FolderOpen, UserCheck, Filter, Trophy, BarChart3, Home, UserCog
} from 'lucide-react';

// Firebase and Actions
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { createScale, getTeacherScales, deleteScale, getBranchScaleScores, type BranchScore } from './actions';

// Types and Utils
import type { EvaluationScale, SchoolClass, Course, Unit } from '@/lib/types';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type EnrichedCourse = Course & { units: Unit[] };
type EnrichedClass = SchoolClass & { courses: EnrichedCourse[] };

const createScaleSchema = z.object({
    name: z.string().min(3, { message: "Ölçek adı en az 3 karakter olmalıdır." }),
    type: z.enum(['tally', 'checklist']),
});

type CreateScaleFormValues = z.infer<typeof createScaleSchema>;

// --- BİLEŞENLER ---

function CreateScaleForm({ onSave, isSaving, selectedClass, selectedBranch, selectedCourseId }: {
    onSave: (data: Omit<CreateScaleFormValues, 'branch'> & { generatedName: string, courseId: string }) => void;
    isSaving: boolean;
    selectedClass: SchoolClass | undefined;
    selectedBranch: string;
    selectedCourseId: string;
}) {
    const { handleSubmit, control, watch, formState: { errors }, reset } = useForm<CreateScaleFormValues>({
        resolver: zodResolver(createScaleSchema),
        defaultValues: {
            name: '',
            type: 'tally',
        }
    });

    const onSubmit = (data: CreateScaleFormValues) => {
        if (!selectedClass || !selectedCourseId) return;
        const generatedName = `${data.name} (${selectedClass.name} - ${selectedBranch})`;
        onSave({ ...data, generatedName, courseId: selectedCourseId });
        reset();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-6 rounded-xl bg-slate-950/30 border border-white/5 shadow-inner">
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
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="bg-slate-900 border-white/10 text-white h-10"><SelectValue/></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="tally">Çetele (+/-)</SelectItem>
                                    <SelectItem value="checklist">Kontrol Listesi</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || !selectedCourseId || !watch('name')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
                    <PlusCircle className="h-4 w-4 mr-2"/> Oluştur
                </Button>
            </div>
        </form>
    );
}

function ErrorWithLink({ message }: { message: string }) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.split(urlRegex);

    return (
        <Alert variant="destructive" className="whitespace-pre-wrap bg-red-900/40 border-red-500/50 text-red-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-white">Hata!</AlertTitle>
            <AlertDescription className="text-red-200">
                {parts.map((part, index) => 
                    urlRegex.test(part) ? 
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold break-all text-red-100">{part}</a> : 
                    <span key={index}>{part}</span>
                )}
            </AlertDescription>
        </Alert>
    );
}

// --- ŞUBE BAŞARI SIRALAMASI KARTI ---
function BranchLeaderboardCard({ branchScores, isLoading }: { branchScores: BranchScore[], isLoading: boolean }) {
    const getSuccessColor = (score: number) => {
        if (score >= 85) return 'bg-emerald-500';
        if (score >= 70) return 'bg-yellow-500';
        if (score >= 50) return 'bg-orange-500';
        return 'bg-red-500';
    }

    const rankIcon = (rank: number) => {
        if (rank === 0) return <Trophy className="h-5 w-5 text-yellow-400" />;
        if (rank === 1) return <Trophy className="h-5 w-5 text-slate-300" />;
        if (rank === 2) return <Trophy className="h-5 w-5 text-amber-600" />;
        return <span className="font-bold text-slate-400 w-6 text-center">{rank + 1}</span>
    }

    return (
        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                    <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                    </div>
                    Şube Başarı Sıralaması
                </CardTitle>
                <CardDescription className="text-slate-400">Ünite bazlı kontrol listesi ortalamaları.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-purple-400"/></div>
                ) : branchScores.length > 0 ? (
                    <div className="space-y-3">
                        {branchScores.map((branch, index) => (
                            <div key={branch.branchName} className="p-3 bg-slate-800/50 rounded-lg border border-white/5 flex items-center gap-4">
                                <div className="w-8 h-8 flex items-center justify-center shrink-0">{rankIcon(index)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <p className="font-bold text-base text-white truncate">{branch.branchName}</p>
                                        <p className="text-xs text-slate-400 font-mono">{branch.studentCount} Öğrenci</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Progress value={branch.averageSuccess} className="h-2 [&>div]:transition-all" indicatorClassName={getSuccessColor(branch.averageSuccess)} />
                                        <span className={cn("text-xs font-bold", getSuccessColor(branch.averageSuccess).replace('bg-','text-'))}>{branch.averageSuccess}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-sm text-slate-500 py-10">Sıralama için henüz yeterli veri bulunmuyor.</p>
                )}
            </CardContent>
        </Card>
    )
}

// --- ANA SAYFA COMPONENTİ ---
export default function ScalesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    // Veri State'leri
    const [unitBasedData, setUnitBasedData] = useState<EnrichedClass[]>([]);
    const [manualScales, setManualScales] = useState<EvaluationScale[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    
    // UI State'leri
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isCreateAccordionOpen, setIsCreateAccordionOpen] = useState(false);
    
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
            const scalesResult = await getTeacherScales(user.uid);
            if(scalesResult.success && scalesResult.data) {
                 setManualScales(scalesResult.data);
            } else if (scalesResult.error) {
                 setFetchError(scalesResult.error);
                 setManualScales([]);
            }

            const [classesSnap, coursesSnap] = await Promise.all([
                getDocs(query(collection(db, 'classes'), orderBy('name'))),
                getDocs(query(collection(db, 'courses'), orderBy('title'))),
            ]);

            const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setAllClasses(classes);
            setAllCourses(courses);
            
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
    
    const handleCreateScale = async (data: Omit<CreateScaleFormValues, 'branch'> & { generatedName: string, courseId: string }) => {
        if (!user) return;
        setIsSaving(true);
        
        const dataToSave = {
            name: data.generatedName,
            type: data.type,
            teacherId: user.uid,
            classId: selectedClassId,
            courseId: data.courseId,
            columns: [],
        };
        
        const result = await createScale(dataToSave);
        if (result.success) {
            toast({ title: "Başarılı", description: "Yeni ölçek oluşturuldu." });
            await fetchData();
            setIsCreateAccordionOpen(false);
        } else {
             toast({ title: "Hata", description: result.error, variant: "destructive"});
        }
        setIsSaving(false);
    };

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
                           <Link href="/teacher"><Home className="mr-2 h-4 w-4"/>Panele Dön</Link>
                         </Button>
                         <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900">
                           <Link href="/teacher/guest-students"><UserCog className="mr-2 h-4 w-4"/>Sanal Öğrencileri Yönet</Link>
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
                                        <UserCheck className="h-6 w-6 text-purple-400"/> Özel Çeteleler ({filteredManualScales.length})
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
                                                        </CardHeader>
                                                        <CardFooter className="flex justify-between items-center pt-2 gap-2">
                                                            <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-500 text-white flex-1 text-xs">
                                                                <Link href={`/teacher/scales/${scale.id}?type=manual`}>Değerlendir</Link>
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
        </div>
    );
}
