
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ArrowRight, FileQuestion, FilePenLine } from 'lucide-react';
import { createExam, getTeacherExams, deleteExam, getExamCreationData, updateExam } from './actions';
import type { Assignment, UserProfile, Question, SchoolClass, Course, Unit, Topic } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

type ExamCreationData = {
  classes: SchoolClass[];
  courses: (Course & { units: (Unit & { topics: Topic[] })[] })[];
  students: UserProfile[];
  examQuestions: Question[];
};

function QuestionSelectionCard({ question, isSelected, onToggle }: { question: Question, isSelected: boolean, onToggle: () => void }) {
    const difficultyColors = {
        'Kolay': 'bg-green-100 text-green-800',
        'Orta': 'bg-yellow-100 text-yellow-800',
        'Zor': 'bg-red-100 text-red-800',
    };
    return (
        <Card className={cn("flex flex-col hover:shadow-md transition-shadow", isSelected && "ring-2 ring-primary")} onClick={onToggle}>
            <CardContent className="p-3 flex-grow space-y-2 cursor-pointer">
                <p className="text-sm font-medium line-clamp-4">{question.text}</p>
            </CardContent>
            <CardFooter className="p-2 bg-muted/50 flex justify-between items-center text-xs">
                <div className="flex items-center gap-1 overflow-hidden">
                    <Badge variant="secondary" className="truncate">{question.topic}</Badge>
                    <Badge variant="outline" className={cn("border", difficultyColors[question.difficulty])}>{question.difficulty}</Badge>
                </div>
                <Checkbox checked={isSelected} />
            </CardFooter>
        </Card>
    )
}

function CreateExamDialog({ 
    isOpen, 
    onOpenChange, 
    creationData, 
    onCreate, 
    editingAssignment 
}: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    creationData: ExamCreationData | null,
    onCreate: () => void,
    editingAssignment: Assignment | null 
}) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [title, setTitle] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
    const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
    const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());
    const [duration, setDuration] = useState<number | undefined>(undefined);
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [isSaving, setIsSaving] = useState(false);
    
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
    const [questionSearchTerm, setQuestionSearchTerm] = useState("");

    useEffect(() => {
        if (editingAssignment) {
            setTitle(editingAssignment.title);
            setSelectedClassId(editingAssignment.classId || 'all');
            setSelectedCourseId(editingAssignment.courseId || 'all');
            setSelectedStudentUids(new Set(editingAssignment.assignedTo));
            setSelectedQuestionIds(new Set(editingAssignment.questionIds || []));
            setDuration(editingAssignment.duration);
            setStartDate(editingAssignment.startDate ? new Date(editingAssignment.startDate) : undefined);
            setDueDate(editingAssignment.dueDate ? new Date(editingAssignment.dueDate) : undefined);
        } else {
             setTitle('');
            setSelectedClassId('all');
            setSelectedBranch('all');
            setSelectedCourseId('all');
            setSelectedUnitId('all');
            setSelectedTopicId('all');
            setSelectedStudentUids(new Set());
            setSelectedQuestionIds(new Set());
            setQuestionSearchTerm('');
            setDuration(undefined);
            setStartDate(undefined);
            setDueDate(undefined);
        }
    }, [editingAssignment, isOpen]);
    
    useEffect(() => {
        if (!editingAssignment) {
            setDuration(selectedQuestionIds.size > 0 ? selectedQuestionIds.size : undefined);
        }
    }, [selectedQuestionIds.size, editingAssignment]);

     const selectedClassData = useMemo(() => {
        if (!creationData) return null;
        return creationData.classes.find(c => c.id === selectedClassId);
    }, [selectedClassId, creationData]);

     const filteredCourses = useMemo(() => {
        if (!creationData) return [];
        if (selectedClassId === 'all') return creationData.courses;
        return creationData.courses.filter(c => c.classId === selectedClassId || !c.classId);
    }, [selectedClassId, creationData]);

    const filteredUnits = useMemo(() => {
        if (!creationData || !selectedCourseId || selectedCourseId === 'all') return [];
        const course = filteredCourses.find(c => c.id === selectedCourseId);
        return course?.units || [];
    }, [selectedCourseId, filteredCourses, creationData]);

    const filteredTopics = useMemo(() => {
        if (!creationData || !selectedUnitId || selectedUnitId === 'all') return [];
        const unit = filteredUnits.find(u => u.id === selectedUnitId);
        return unit?.topics || [];
    }, [selectedUnitId, filteredUnits, creationData]);

    const filteredStudents = useMemo(() => {
        if (!creationData) {
            return [];
        }
        if (selectedClassId === 'all') {
            return creationData.students;
        }
        if (!selectedClassData) return [];
        
        if (selectedBranch === 'all') {
            return creationData.students.filter(s => s.class?.startsWith(selectedClassData.name));
        }
        
        return creationData.students.filter(s => s.class === `${selectedClassData.name} - ${selectedBranch}`);

    }, [selectedClassId, selectedBranch, selectedClassData, creationData]);
    
    const filteredExamQuestions = useMemo(() => {
        if (!creationData?.examQuestions) return [];
    
        let questions = creationData.examQuestions;

        if (selectedTopicId && selectedTopicId !== 'all') {
            questions = questions.filter(q => q.topicId === selectedTopicId);
        } else if (selectedUnitId && selectedUnitId !== 'all') {
            questions = questions.filter(q => q.unitId === selectedUnitId);
        } else if (selectedCourseId && selectedCourseId !== 'all') {
            questions = questions.filter(q => q.courseId === selectedCourseId);
        } else if (selectedClassId && selectedClassId !== 'all') {
            const classCourseIds = new Set(filteredCourses.map(c => c.id));
            questions = questions.filter(q => q.courseId && classCourseIds.has(q.courseId));
        }
        
        if (questionSearchTerm) {
            questions = questions.filter(q => q.text.toLowerCase().includes(questionSearchTerm.toLowerCase()));
        }
        
        return questions;
    }, [creationData, selectedClassId, selectedCourseId, selectedUnitId, selectedTopicId, questionSearchTerm, filteredCourses]);


    const toggleQuestion = (questionId: string) => {
        setSelectedQuestionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) newSet.delete(questionId);
            else newSet.add(questionId);
            return newSet;
        });
    };
    
    const toggleAllQuestions = () => {
        const allIds = new Set(filteredExamQuestions.map(q => q.id));
        if (selectedQuestionIds.size === allIds.size) {
            setSelectedQuestionIds(new Set());
        } else {
            setSelectedQuestionIds(allIds);
        }
    };
    
    const toggleStudent = (studentUid: string) => {
         setSelectedStudentUids(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentUid)) newSet.delete(studentUid);
            else newSet.add(studentUid);
            return newSet;
        });
    };

    const handleSave = async () => {
        if (!user || !title || selectedQuestionIds.size === 0 || selectedStudentUids.size === 0) {
            toast({ title: "Eksik Bilgi", description: "Lütfen başlık, en az bir öğrenci ve en az bir soru seçin.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        
        const classData = creationData?.classes.find(c => c.id === selectedClassId);
        const courseData = filteredCourses.find(c => c.id === selectedCourseId);
        
        const assignmentData = {
            title,
            teacherId: user.uid,
            classId: selectedClassId,
            className: classData?.name || 'Tümü',
            courseId: selectedCourseId,
            courseName: courseData?.title || 'Tümü',
            questionIds: Array.from(selectedQuestionIds),
            assignedTo: Array.from(selectedStudentUids),
            duration: duration,
            startDate: startDate,
            dueDate: dueDate,
        };

        const result = editingAssignment 
            ? await updateExam(editingAssignment.id, assignmentData)
            : await createExam({ ...assignmentData, assignmentType: 'deneme', topicIds: [], topicNames: []});

        if (result.success) {
            toast({ title: "Başarılı", description: `Deneme sınavı ${editingAssignment ? 'güncellendi' : 'oluşturuldu'}.` });
            onCreate();
            onOpenChange(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                    <DialogTitle>{editingAssignment ? 'Deneme Sınavını Düzenle' : 'Yeni Deneme Sınavı Oluştur'}</DialogTitle>
                </DialogHeader>
                 <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 overflow-y-auto">
                    {/* Column 1: Exam Details & Student Selection */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Deneme Başlığı</Label>
                                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="class">Atanacak Sınıf</Label>
                                    <Select value={selectedClassId} onValueChange={(value) => { setSelectedClassId(value); setSelectedBranch('all'); setSelectedStudentUids(new Set()); }}>
                                        <SelectTrigger id="class"><SelectValue placeholder="Sınıf Seçin..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tüm Sınıflar</SelectItem>
                                            {creationData?.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch">Şube</Label>
                                    <Select value={selectedBranch} onValueChange={(value) => { setSelectedBranch(value); setSelectedStudentUids(new Set()); }} disabled={selectedClassId === 'all'}>
                                        <SelectTrigger id="branch"><SelectValue placeholder="Şube Seçin..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tüm Şubeler</SelectItem>
                                            {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">Dakika Cinsinden Toplam Süre</Label>
                                <Input id="duration" type="number" value={duration || ''} onChange={e => setDuration(parseInt(e.target.value) || undefined)} placeholder="Örn: 40"/>
                                <p className="text-xs text-muted-foreground">Her soru için 1 dakika önerilir. ({selectedQuestionIds.size} soru seçildi).</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Başlangıç Tarihi (İsteğe Bağlı)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {startDate ? format(startDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Son Teslim Tarihi (İsteğe Bağlı)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dueDate ? format(dueDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <Label>Öğrenciler ({selectedStudentUids.size} seçildi)</Label>
                            <ScrollArea className="h-72 border rounded-md p-2">
                                {filteredStudents.length > 0 ? (
                                    <>
                                        <div className="flex items-center space-x-2 p-1 border-b">
                                            <Checkbox 
                                                id="select-all-students"
                                                checked={selectedStudentUids.size === filteredStudents.length && filteredStudents.length > 0}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedStudentUids(new Set(filteredStudents.map(s => s.uid)))
                                                    } else {
                                                        setSelectedStudentUids(new Set())
                                                    }
                                                }}
                                            />
                                            <label htmlFor="select-all-students" className="font-semibold">Tümünü Seç ({filteredStudents.length})</label>
                                        </div>
                                        {filteredStudents.map(student => (
                                        <div key={student.uid} className="flex items-center space-x-2 p-1">
                                            <Checkbox id={`student-${student.uid}`} checked={selectedStudentUids.has(student.uid)} onCheckedChange={() => toggleStudent(student.uid)}/>
                                            <label htmlFor={`student-${student.uid}`} className="text-sm font-medium leading-none">
                                                {student.displayName} - {student.class}
                                            </label>
                                        </div>
                                        ))}
                                    </>
                                ) : <p className="text-sm text-muted-foreground text-center p-4">Öğrenci seçmek için bir sınıf ve şube seçin.</p>}
                            </ScrollArea>
                        </div>
                    </div>
                     {/* Column 2: Question Selection */}
                    <div className="lg:col-span-2 space-y-2 flex flex-col">
                         <Label>{`Sorular (${selectedQuestionIds.size} seçildi)`}</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                            <Select value={selectedCourseId} onValueChange={v => {setSelectedCourseId(v); setSelectedUnitId('all'); setSelectedTopicId('all');}}>
                                <SelectTrigger><SelectValue placeholder="Ders Filtrele..." /></SelectTrigger>
                                <SelectContent><SelectItem value="all">Tüm Dersler</SelectItem>{filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={selectedUnitId} onValueChange={v => {setSelectedUnitId(v); setSelectedTopicId('all');}} disabled={!selectedCourseId || selectedCourseId === 'all'}>
                                <SelectTrigger><SelectValue placeholder="Ünite Filtrele..." /></SelectTrigger>
                                <SelectContent><SelectItem value="all">Tüm Üniteler</SelectItem>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={selectedTopicId} onValueChange={setSelectedTopicId} disabled={!selectedUnitId || selectedUnitId === 'all'}>
                                <SelectTrigger><SelectValue placeholder="Konu Filtrele..." /></SelectTrigger>
                                <SelectContent><SelectItem value="all">Tüm Konular</SelectItem>{filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input placeholder="Soru metninde ara..." value={questionSearchTerm} onChange={e => setQuestionSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="select-all-questions" onCheckedChange={() => toggleAllQuestions()} checked={filteredExamQuestions.length > 0 && selectedQuestionIds.size === filteredExamQuestions.length} />
                            <Label htmlFor="select-all-questions" className="text-sm font-medium">Filtrelenen Tüm Soruları Seç ({filteredExamQuestions.length})</Label>
                        </div>
                        <ScrollArea className="flex-grow border rounded-md p-2 min-h-0">
                            {filteredExamQuestions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                                    {filteredExamQuestions.map(q => (
                                        <QuestionSelectionCard 
                                            key={q.id}
                                            question={q}
                                            isSelected={selectedQuestionIds.has(q.id)}
                                            onToggle={() => toggleQuestion(q.id)}
                                        />
                                    ))}
                                </div>
                            ) : <p className="text-sm text-muted-foreground text-center p-4">Deneme havuzunda bu filtrelerle eşleşen soru bulunamadı.</p>}
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter className="p-6 pt-2 border-t flex-shrink-0">
                    <DialogClose asChild><Button variant="ghost">İptal</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} {editingAssignment ? 'Değişiklikleri Kaydet' : 'Denemeyi Oluştur'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function ExamsClientPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [creationData, setCreationData] = useState<ExamCreationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const title = 'Deneme Sınavları';
    const description = 'Öğrencilere deneme havuzundan seçtiğiniz sorularla deneme sınavları atayın ve ilerlemelerini takip edin.';
    const buttonLabel = 'Yeni Deneme Oluştur';

    const fetchExams = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setFetchError(null);
        const result = await getTeacherExams(user.uid);
        if (result.success && result.data) {
            setAssignments(result.data);
        } else if (result.error) {
            setFetchError(result.error);
        }
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        fetchExams();
        
        async function fetchCreationData() {
            const data = await getExamCreationData();
            if (data.error) {
                 toast({ title: 'Hata', description: "Deneme oluşturmak için gerekli veriler yüklenemedi.", variant: 'destructive'});
            } else {
                 setCreationData(data);
            }
        }
        fetchCreationData();
    }, [fetchExams, toast]);
    
    const handleOpenEdit = (assignment: Assignment) => {
        setEditingAssignment(assignment);
        setIsCreateOpen(true);
    }
    
    const handleOpenCreate = () => {
        setEditingAssignment(null);
        setIsCreateOpen(true);
    }
    
     const handleDelete = async (assignmentId: string) => {
        const result = await deleteExam(assignmentId);
        if (result.success) {
            toast({ title: "Başarılı", description: "Deneme sınavı silindi." });
            fetchExams();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold font-headline">{title}</h1>
                <Button onClick={handleOpenCreate} disabled={!creationData}><PlusCircle className="mr-2 h-4 w-4" /> {buttonLabel}</Button>
            </div>
            
            {fetchError && <div className="mb-4"><p className="text-red-500">{fetchError}</p></div>}

            <Card>
                <CardHeader>
                    <CardTitle>Oluşturulan {title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : assignments.length > 0 ? (
                        <div className="space-y-4">
                            {assignments.map(assignment => (
                                <Card key={assignment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{assignment.title}</h3>
                                        <p className="text-sm text-muted-foreground">{assignment.className} - {assignment.courseName}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {`${assignment.questionIds?.length || 0} soru içeriyor.`}
                                            {assignment.duration && ` | Süre: ${assignment.duration} dakika`}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 mt-4 sm:mt-0">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(assignment)}>
                                            <FilePenLine className="h-4 w-4"/>
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive-outline" size="sm"><Trash2 className="h-4 w-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                    <AlertDialogDescription>"{assignment.title}" sınavını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(assignment.id)} className="bg-destructive hover:bg-destructive/90">Evet, Sil</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Button asChild size="sm">
                                            <Link href={`/teacher/assignments/${assignment.id}`}>İlerlemeyi Gör <ArrowRight className="ml-2 h-4 w-4"/></Link>
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        !fetchError && (
                            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                                <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">Henüz deneme sınavı oluşturulmamış.</h3>
                                <p className="mt-1 text-sm">"{buttonLabel}" butonuna tıklayarak başlayın.</p>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>

            <CreateExamDialog
                isOpen={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                creationData={creationData}
                onCreate={fetchExams}
                editingAssignment={editingAssignment}
            />
        </div>
    );
}
