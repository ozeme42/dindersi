

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { EvaluationScale, SchoolClass, Course, Unit } from '@/lib/types';
import { Loader2, Scale as ScaleIcon, BookOpen, ListChecks, PlusCircle, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { createScale, getTeacherScales, deleteScale } from './actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as RadixAlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


export const dynamic = 'force-dynamic';

type EnrichedCourse = Course & { units: Unit[] };
type EnrichedClass = SchoolClass & { courses: EnrichedCourse[] };

const createScaleSchema = z.object({
  name: z.string().min(3, { message: "Ölçek adı en az 3 karakter olmalıdır." }),
  type: z.enum(['tally', 'checklist']),
});

type CreateScaleFormValues = z.infer<typeof createScaleSchema>;

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
        const generatedName = `${data.name} (${selectedClass?.name} - ${selectedBranch})`;
        onSave({ ...data, generatedName, courseId: selectedCourseId });
        reset();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 border rounded-lg bg-muted/50">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="scale-name">Ölçek Adı</Label>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => <Input id="scale-name" {...field} placeholder="Örn: Namaz Çetelesi" />}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                 <div className="space-y-1">
                    <Label>Ölçek Tipi</Label>
                     <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                           <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tally">Çetele (+/-)</SelectItem>
                                    <SelectItem value="checklist">Kontrol Listesi</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
                    Oluştur
                </Button>
            </div>
        </form>
    );
}

function ErrorWithLink({ message }: { message: string }) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.split(urlRegex);

    return (
        <Alert variant="destructive" className="whitespace-pre-wrap">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Hata!</AlertTitle>
            <AlertDescription>
                {parts.map((part, index) => 
                    urlRegex.test(part) ? 
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold break-all">{part}</a> : 
                    <span key={index}>{part}</span>
                )}
            </AlertDescription>
        </Alert>
    );
}


export default function ScalesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [unitBasedData, setUnitBasedData] = useState<EnrichedClass[]>([]);
    const [manualScales, setManualScales] = useState<EvaluationScale[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    const [isCreateAccordionOpen, setIsCreateAccordionOpen] = useState(false);
    
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    
    const selectedClass = useMemo(() => allClasses.find(c => c.id === selectedClassId), [allClasses, selectedClassId]);

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
                    const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
                    const units = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
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
                return true; // Show all branches for the selected class
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
            <div className="flex justify-center items-center h-full py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><ScaleIcon/> Değerlendirme Ölçekleri</h1>
            </div>
            
            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Filtreler</CardTitle>
                        <CardDescription>Aşağıdaki ölçekleri görüntülemek için bir sınıf ve şube seçin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <Label>Sınıf</Label>
                                 <Select value={selectedClassId} onValueChange={(value) => { setSelectedClassId(value); setSelectedBranch(''); setSelectedCourseId('') }}>
                                    <SelectTrigger><SelectValue placeholder="Sınıf Seçin..."/></SelectTrigger>
                                    <SelectContent>
                                        {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Şube</Label>
                                <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!selectedClass}>
                                    <SelectTrigger><SelectValue placeholder="Şube Seçin..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tüm Şubeler</SelectItem>
                                        {selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {selectedClassId && (
                <>
                    {selectedBranch && selectedBranch !== 'all' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Ünite Bazlı Kontrol Listeleri</CardTitle>
                                <CardDescription>İçerik yönetimi panelinden eklediğiniz ünitelere dayalı otomatik olarak oluşturulan kontrol listeleri.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {filteredUnitData.length > 0 ? (
                                    <Accordion type="multiple" className="w-full space-y-4">
                                        {filteredUnitData[0].courses.map(course => (
                                            <AccordionItem key={course.id} value={course.id} className="border rounded-lg">
                                                <AccordionTrigger className="p-3 text-lg font-semibold hover:no-underline">
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="h-5 w-5"/> {course.title}
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="p-3">
                                                    {course.units.length > 0 ? (
                                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {course.units.map(unit => (
                                                                <Button key={unit.id} asChild variant="secondary" className="h-20 text-base flex-col gap-1">
                                                                    <Link href={`/teacher/scales/${unit.id}?type=unit&courseId=${course.id}&branch=${selectedBranch}`}>
                                                                        <ListChecks className="h-5 w-5"/>
                                                                        <span>{unit.title}</span>
                                                                    </Link>
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-center text-sm text-muted-foreground p-4">Bu ders için ünite bulunmuyor.</p>
                                                    )}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                ) : (
                                    <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                                        <p>Bu sınıf için ders bulunmuyor.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <Accordion type="single" collapsible className="w-full" value={isCreateAccordionOpen ? "manual-scales" : ""} onValueChange={(value) => setIsCreateAccordionOpen(value === "manual-scales")}>
                            <AccordionItem value="manual-scales" className="border-b-0">
                                <AccordionTrigger className="p-6 text-left hover:no-underline">
                                    <div className="flex-1">
                                        <CardTitle>Manuel Ölçekler</CardTitle>
                                        <CardDescription className="mt-1.5">Belirli bir ders veya konu için manuel olarak oluşturduğunuz özel kontrol listeleri veya çeteleler.</CardDescription>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
                                     {selectedBranch && selectedBranch !== 'all' ? (
                                         <>
                                            <div className="space-y-1">
                                                <Label>Ders Seçimi</Label>
                                                <Select onValueChange={setSelectedCourseId} value={selectedCourseId}>
                                                    <SelectTrigger><SelectValue placeholder="Manuel ölçek için ders seçin..."/></SelectTrigger>
                                                    <SelectContent>
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
                                     ) : <p className="text-muted-foreground text-sm text-center">Yeni manuel ölçek oluşturmak için bir şube seçmelisiniz.</p> }
                                    
                                    <div className="border-t pt-4">
                                        {fetchError && <ErrorWithLink message={fetchError} />}
                                        {filteredManualScales.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {filteredManualScales.map(scale => {
                                                    const courseName = allCourses.find(c => c.id === scale.courseId)?.title || 'Bilinmeyen Ders';
                                                    return (
                                                        <Card key={scale.id}>
                                                            <CardHeader>
                                                                <CardTitle>{scale.name}</CardTitle>
                                                                <CardDescription>{courseName}</CardDescription>
                                                            </CardHeader>
                                                            <CardFooter className="flex justify-end gap-2">
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="destructive-outline" size="sm"><Trash2 className="h-4 w-4"/></Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <RadixAlertDialogTitle>Emin misiniz?</RadixAlertDialogTitle>
                                                                            <AlertDialogDescription>"{scale.name}" ölçeği ve tüm verileri kalıcı olarak silinecektir.</AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDeleteScale(scale.id)} className="bg-destructive hover:bg-destructive/90">
                                                                                Evet, Sil
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                                <Button asChild>
                                                                    <Link href={`/teacher/scales/${scale.id}?type=manual`}>Değerlendir</Link>
                                                                </Button>
                                                            </CardFooter>
                                                        </Card>
                                                    )
                                                })}
                                        </div>
                                        ) : !fetchError && (
                                            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                                <p>Bu şube için manuel ölçek oluşturulmamış.</p>
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </Card>
                </>
                )}
            </div>
        </div>
    );
}
