'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ArrowRight, FileQuestion, FilePenLine, Calendar as CalendarIcon, Clock, Users, BookOpen, CheckCircle2, AlertTriangle, Save, X } from 'lucide-react';
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
        'Kolay': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        'Orta': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        'Zor': 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
        <div 
            className={cn(
                "group relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer overflow-hidden",
                "bg-slate-900/40 border-white/5 hover:bg-slate-800/60",
                isSelected ? "ring-2 ring-indigo-500 bg-indigo-900/10 border-indigo-500/50" : "hover:border-white/10"
            )} 
            onClick={onToggle}
        >
            <div className="flex justify-between items-start gap-3 mb-2">
                <Badge variant="outline" className={cn("font-bold border", difficultyColors[question.difficulty])}>
                    {question.difficulty}
                </Badge>
                <Checkbox 
                    checked={isSelected} 
                    className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                />
            </div>
            
            <p className="text-sm text-slate-300 line-clamp-3 font-medium flex-grow mb-3 leading-relaxed">
                {question.text}
            </p>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-3 border-t border-white/5">
                <span className="truncate max-w-[150px] font-medium text-slate-400">{question.topic || 'Genel'}</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">{question.type}</span>
            </div>
        </div>
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
            assignmentType: 'deneme' as const,
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
            : await createExam({ ...assignmentData, topicIds: [], topicNames: []});

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
            <DialogContent className="max-w-7xl h-[95vh] flex flex-col p-0 bg-slate-950 border-white/10 text-slate-100 shadow-2xl">
                <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-slate-900/50">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-white">
                         <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <FileQuestion className="h-6 w-6 text-indigo-400" />
                        </div>
                        {editingAssignment ? 'Denemeyi Düzenle' : 'Yeni Deneme Sınavı'}
                    </DialogTitle>
                </DialogHeader>

                 <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
                    {/* SOL PANEL: Ayarlar ve Öğrenciler (3 Sütun) */}
                    <div className="lg:col-span-4 border-r border-white/5 bg-slate-900/20 overflow-y-auto custom-scrollbar">
                        <div className="p-6 space-y-8">
                            {/* Temel Bilgiler */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
                                    <FilePenLine className="h-4 w-4 text-indigo-400"/> Temel Bilgiler
                                </h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="title" className="text-slate-300 text-xs">Sınav Başlığı</Label>
                                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-950 border-white/10 text-white h-10" placeholder="Örn: 1. Dönem Tarama Sınavı" />
                                    </div>
                                     <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="duration" className="text-slate-300 text-xs">Süre (Dk)</Label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                <Input id="duration" type="number" value={duration || ''} onChange={e => setDuration(parseInt(e.target.value) || undefined)} className="pl-9 bg-slate-950 border-white/10 text-white h-10" placeholder="40" />
                                            </div>
                                        </div>
                                         <div className="space-y-1">
                                            <Label className="text-slate-300 text-xs">Soru Sayısı</Label>
                                            <div className="h-10 flex items-center px-3 rounded-md bg-slate-950/50 border border-white/10 text-slate-400 text-sm font-mono">
                                                {selectedQuestionIds.size} Seçildi
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-slate-300 text-xs">Başlangıç Tarihi</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 bg-slate-950 border-white/10 text-white hover:bg-slate-900", !startDate && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4 text-indigo-400" />
                                                        {startDate ? format(startDate, "PPP", { locale: tr }) : <span>Seçiniz...</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-white"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-slate-300 text-xs">Son Teslim Tarihi</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 bg-slate-950 border-white/10 text-white hover:bg-slate-900", !dueDate && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4 text-rose-400" />
                                                        {dueDate ? format(dueDate, "PPP", { locale: tr }) : <span>Seçiniz...</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-white"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Katılımcı Seçimi */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-emerald-400"/> Katılımcılar ({selectedStudentUids.size})
                                </h3>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                         <Select value={selectedClassId} onValueChange={(value) => { setSelectedClassId(value); setSelectedBranch('all'); setSelectedStudentUids(new Set()); }}>
                                            <SelectTrigger className="bg-slate-950 border-white/10 text-white h-9 text-xs"><SelectValue placeholder="Sınıf" /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Sınıflar</SelectItem>{creationData?.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={selectedBranch} onValueChange={(value) => { setSelectedBranch(value); setSelectedStudentUids(new Set()); }} disabled={selectedClassId === 'all'}>
                                            <SelectTrigger className="bg-slate-950 border-white/10 text-white h-9 text-xs"><SelectValue placeholder="Şube" /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Şubeler</SelectItem>{selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <div className="bg-slate-950 border border-white/10 rounded-lg overflow-hidden">
                                        <div className="p-2 border-b border-white/5 bg-slate-900/50 flex items-center gap-2">
                                            <Checkbox 
                                                id="select-all-students"
                                                checked={selectedStudentUids.size === filteredStudents.length && filteredStudents.length > 0}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedStudentUids(new Set(filteredStudents.map(s => s.uid)))
                                                    else setSelectedStudentUids(new Set())
                                                }}
                                                className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                            />
                                            <label htmlFor="select-all-students" className="text-xs font-bold text-slate-300 cursor-pointer">Tümünü Seç</label>
                                        </div>
                                        <ScrollArea className="h-48 p-2">
                                            {filteredStudents.length > 0 ? (
                                                <div className="space-y-1">
                                                    {filteredStudents.map(student => (
                                                        <div key={student.uid} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors">
                                                            <Checkbox 
                                                                id={`student-${student.uid}`} 
                                                                checked={selectedStudentUids.has(student.uid)} 
                                                                onCheckedChange={() => toggleStudent(student.uid)}
                                                                className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                            />
                                                            <label htmlFor={`student-${student.uid}`} className="text-xs text-slate-300 cursor-pointer select-none flex-1 truncate">
                                                                {student.displayName} <span className="text-slate-500 ml-1">({student.class})</span>
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="text-xs text-slate-500 text-center py-4">Öğrenci bulunamadı.</p>}
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAĞ PANEL: Soru Seçimi (9 Sütun) */}
                    <div className="lg:col-span-8 bg-black/20 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-slate-900/30 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Select value={selectedCourseId} onValueChange={v => {setSelectedCourseId(v); setSelectedUnitId('all'); setSelectedTopicId('all');}}>
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-white h-9 text-xs min-w-[120px]"><SelectValue placeholder="Ders" /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Dersler</SelectItem>{filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={selectedUnitId} onValueChange={v => {setSelectedUnitId(v); setSelectedTopicId('all');}} disabled={!selectedCourseId || selectedCourseId === 'all'}>
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-white h-9 text-xs min-w-[120px]"><SelectValue placeholder="Ünite" /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Üniteler</SelectItem>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={selectedTopicId} onValueChange={setSelectedTopicId} disabled={!selectedUnitId || selectedUnitId === 'all'}>
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-white h-9 text-xs min-w-[120px]"><SelectValue placeholder="Konu" /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Konular</SelectItem>{filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                                </Select>
                                <div className="relative flex-grow min-w-[150px]">
                                    <Input 
                                        placeholder="Soru metninde ara..." 
                                        value={questionSearchTerm} 
                                        onChange={e => setQuestionSearchTerm(e.target.value)} 
                                        className="bg-slate-950 border-white/10 text-white h-9 text-xs pl-8 focus:border-indigo-500/50"
                                    />
                                    <CheckCircle2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 bg-slate-900/40 px-3 py-1.5 rounded-lg border border-white/5">
                                    <Checkbox 
                                        id="select-all-questions" 
                                        onCheckedChange={() => toggleAllQuestions()} 
                                        checked={filteredExamQuestions.length > 0 && selectedQuestionIds.size === filteredExamQuestions.length} 
                                        className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                    />
                                    <Label htmlFor="select-all-questions" className="text-xs font-bold text-slate-300 cursor-pointer">Filtrelenenleri Seç ({filteredExamQuestions.length})</Label>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Toplam <span className="text-white font-bold">{selectedQuestionIds.size}</span> soru seçildi.
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {filteredExamQuestions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredExamQuestions.map(q => (
                                        <QuestionSelectionCard 
                                            key={q.id}
                                            question={q}
                                            isSelected={selectedQuestionIds.has(q.id)}
                                            onToggle={() => toggleQuestion(q.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                    <AlertTriangle className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Bu filtrelerle eşleşen soru bulunamadı.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t border-white/10 bg-slate-900 flex justify-between items-center shrink-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-white/5">
                        <X className="mr-2 h-4 w-4"/> İptal
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 shadow-lg shadow-indigo-900/20">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} 
                        {editingAssignment ? 'Değişiklikleri Kaydet' : 'Denemeyi Oluştur'}
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
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
             {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-8">
                     <div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                <FileQuestion className="h-8 w-8 text-indigo-400" />
                            </div>
                            {title}
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">{description}</p>
                     </div>
                     <Button onClick={handleOpenCreate} disabled={!creationData} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 h-12 px-6 rounded-xl">
                        <PlusCircle className="mr-2 h-5 w-5" /> {buttonLabel}
                    </Button>
                </div>
                
                {fetchError && <div className="mb-4 bg-red-950/30 border border-red-500/30 p-4 rounded-xl text-red-400 font-bold">{fetchError}</div>}

                {/* Content */}
                <div className="grid gap-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        </div>
                    ) : assignments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {assignments.map(assignment => (
                                <Card key={assignment.id} className="bg-slate-900/60 backdrop-blur-xl border border-white/5 shadow-xl overflow-hidden group hover:border-white/20 transition-all hover:-translate-y-1">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    
                                    <CardHeader className="pb-3 border-b border-white/5">
                                        <CardTitle className="flex justify-between items-start gap-4">
                                            <span className="text-xl font-bold text-white leading-tight">{assignment.title}</span>
                                            {assignment.duration && <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-500/10 shrink-0">{assignment.duration} Dk</Badge>}
                                        </CardTitle>
                                        <CardDescription className="text-slate-400 font-medium">
                                            {assignment.className} &bull; {assignment.courseName}
                                        </CardDescription>
                                    </CardHeader>
                                    
                                    <CardContent className="py-4 space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                             <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
                                             <span><strong>{assignment.questionIds?.length || 0}</strong> Soru</span>
                                        </div>
                                         <div className="flex items-center gap-2 text-sm text-slate-300">
                                             <Users className="w-4 h-4 text-purple-400"/>
                                             <span><strong>{assignment.assignedTo?.length || 0}</strong> Öğrenci</span>
                                        </div>
                                        {assignment.startDate && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <CalendarIcon className="w-3 h-3"/>
                                                Başlangıç: {format(new Date(assignment.startDate), "d MMM yyyy", { locale: tr })}
                                            </div>
                                        )}
                                    </CardContent>
                                    
                                    <CardFooter className="bg-black/20 p-4 border-t border-white/5 flex justify-between items-center gap-2">
                                         <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 flex-1">
                                            <Link href={`/teacher/assignments/${assignment.id}`}>Detaylar <ArrowRight className="ml-2 h-4 w-4"/></Link>
                                        </Button>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(assignment)} className="text-slate-400 hover:text-white hover:bg-white/10">
                                                <FilePenLine className="h-4 w-4"/>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-slate-400">"{assignment.title}" sınavını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(assignment.id)} className="bg-red-600 hover:bg-red-500 text-white border-none">Evet, Sil</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        !fetchError && (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-500 border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-900/30">
                                <FileQuestion className="h-16 w-16 mb-6 opacity-20" />
                                <h3 className="text-xl font-bold text-slate-400">Henüz deneme sınavı oluşturulmamış.</h3>
                                <p className="text-sm mt-2 opacity-60">Yeni bir sınav oluşturmak için yukarıdaki butonu kullanın.</p>
                            </div>
                        )
                    )}
                </div>
            </div>

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
