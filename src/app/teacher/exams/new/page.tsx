
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Save, X, Search, ArrowLeft, FileQuestion, Users, BookOpen, Clock, Calendar as CalendarIcon, FilePenLine, Trophy, Award
} from 'lucide-react';
import { createExam, getExamCreationData, updateExam, getTeacherExams } from '../actions';
import type { Assignment, UserProfile, Question, SchoolClass, Course, Unit, Topic } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { useParams, useRouter } from 'next/navigation';

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
                <Badge variant="outline" className={cn("font-bold border transition-colors", difficultyColors[question.difficulty])}>
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

export function CreateExamClientPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const assignmentId = params.assignmentId as string;
    const isEditMode = !!assignmentId;

    const [creationData, setCreationData] = useState<ExamCreationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
    const [successThreshold, setSuccessThreshold] = useState<number | undefined>(undefined);
    const [successReward, setSuccessReward] = useState<number | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);
    
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
    const [questionSearchTerm, setQuestionSearchTerm] = useState("");

    const [questionsCurrentPage, setQuestionsCurrentPage] = useState(1);
    const questionsItemsPerPage = 20;

    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        const data = await getExamCreationData();
        if (data.error) {
            toast({ title: 'Hata', description: "Sayfa verileri yüklenemedi.", variant: 'destructive'});
        } else {
            setCreationData(data);
            if (isEditMode && user) {
                const examsResult = await getTeacherExams(user.uid);
                const assignmentToEdit = examsResult.data?.find(a => a.id === assignmentId);
                if (assignmentToEdit) {
                    setTitle(assignmentToEdit.title);
                    setSelectedClassId(assignmentToEdit.classId || 'all');
                    setSelectedCourseId(assignmentToEdit.courseId || 'all');
                    setSelectedStudentUids(new Set(assignmentToEdit.assignedTo));
                    setSelectedQuestionIds(new Set(assignmentToEdit.questionIds || []));
                    setDuration(assignmentToEdit.duration);
                    setStartDate(assignmentToEdit.startDate ? new Date(assignmentToEdit.startDate) : undefined);
                    setDueDate(assignmentToEdit.dueDate ? new Date(assignmentToEdit.dueDate) : undefined);
                    setSuccessThreshold(assignmentToEdit.successThreshold);
                    setSuccessReward(assignmentToEdit.successReward);
                }
            }
        }
        setIsLoading(false);
    }, [isEditMode, assignmentId, user, toast]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (!isEditMode && selectedQuestionIds.size > 0) {
            setDuration(selectedQuestionIds.size);
        }
    }, [selectedQuestionIds.size, isEditMode]);

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
        if (!creationData) return [];
        if (selectedClassId === 'all') return creationData.students;
        if (!selectedClassData) return [];
        if (selectedBranch === 'all') return creationData.students.filter(s => s.class?.startsWith(selectedClassData.name));
        return creationData.students.filter(s => s.class === `${selectedClassData.name} - ${selectedBranch}`);
    }, [selectedClassId, selectedBranch, selectedClassData, creationData]);
    
    const filteredExamQuestions = useMemo(() => {
        if (!creationData?.examQuestions) return [];
        let questions = creationData.examQuestions;
        if (selectedTopicId && selectedTopicId !== 'all') questions = questions.filter(q => q.topicId === selectedTopicId);
        else if (selectedUnitId && selectedUnitId !== 'all') questions = questions.filter(q => q.unitId === selectedUnitId);
        else if (selectedCourseId && selectedCourseId !== 'all') questions = questions.filter(q => q.courseId === selectedCourseId);
        else if (selectedClassId && selectedClassId !== 'all') {
            const classCourseIds = new Set(filteredCourses.map(c => c.id));
            questions = questions.filter(q => q.courseId && classCourseIds.has(q.courseId));
        }
        if (questionSearchTerm) questions = questions.filter(q => q.text.toLowerCase().includes(questionSearchTerm.toLowerCase()));
        return questions;
    }, [creationData, selectedClassId, selectedCourseId, selectedUnitId, selectedTopicId, questionSearchTerm, filteredCourses]);

    const totalQuestionPages = useMemo(() => Math.ceil(filteredExamQuestions.length / questionsItemsPerPage), [filteredExamQuestions, questionsItemsPerPage]);
    const paginatedQuestions = useMemo(() => {
        const startIndex = (questionsCurrentPage - 1) * questionsItemsPerPage;
        return filteredExamQuestions.slice(startIndex, startIndex + questionsItemsPerPage);
    }, [filteredExamQuestions, questionsCurrentPage, questionsItemsPerPage]);

    const toggleQuestion = (questionId: string) => {
        setSelectedQuestionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) newSet.delete(questionId);
            else newSet.add(questionId);
            return newSet;
        });
    };
    
    const toggleAllQuestions = () => {
        const allIdsOnPage = new Set(paginatedQuestions.map(q => q.id));
        const currentSelectedOnPage = paginatedQuestions.filter(q => selectedQuestionIds.has(q.id));
        const allAreSelected = currentSelectedOnPage.length === paginatedQuestions.length && paginatedQuestions.length > 0;
        setSelectedQuestionIds(prev => {
            const newSet = new Set(prev);
            if (allAreSelected) allIdsOnPage.forEach(id => newSet.delete(id));
            else allIdsOnPage.forEach(id => newSet.add(id));
            return newSet;
        });
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
            title, teacherId: user.uid, assignmentType: 'deneme' as const, classId: selectedClassId,
            className: classData?.name || 'Tümü', courseId: selectedCourseId, courseName: courseData?.title || 'Tümü',
            questionIds: Array.from(selectedQuestionIds), assignedTo: Array.from(selectedStudentUids),
            duration, startDate, dueDate, topicIds: [], topicNames: [],
            successThreshold,
            successReward,
        };
        const result = isEditMode ? await updateExam(assignmentId, assignmentData) : await createExam(assignmentData);
        if (result.success) {
            toast({ title: "Başarılı", description: `Deneme sınavı ${isEditMode ? 'güncellendi' : 'oluşturuldu'}.` });
            router.push('/teacher/exams');
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const isAllQuestionsOnPageSelected = paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestionIds.has(q.id));

    if (isLoading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /></div>
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
             {/* Arka Plan */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                {/* Header */}
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-8">
                     <div>
                        <Button asChild variant="ghost" size="sm" className="mb-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
                            <Link href="/teacher/exams"><ArrowLeft className="mr-2 h-4 w-4" /> Denemeler Listesine Dön</Link>
                        </Button>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                <FilePenLine className="h-8 w-8 text-indigo-400" />
                            </div>
                            {isEditMode ? 'Denemeyi Düzenle' : 'Yeni Deneme Sınavı'}
                        </h1>
                     </div>
                     <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 h-12 px-6 rounded-xl">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} 
                        {isEditMode ? 'Değişiklikleri Kaydet' : 'Denemeyi Oluştur'}
                    </Button>
                </div>
                
                 {/* Main Layout */}
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                     {/* SOL PANEL */}
                     <div className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-8">
                         {/* Temel Bilgiler */}
                         <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
                            <CardHeader><CardTitle className="text-white">Temel Bilgiler</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label>Sınav Başlığı</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Örn: 1. Dönem Tarama" className="bg-slate-950 border-white/10 text-white"/></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>Süre (Dk)</Label><Input type="number" value={duration || ''} onChange={e => setDuration(parseInt(e.target.value) || undefined)} placeholder="40" className="bg-slate-950 border-white/10 text-white"/></div>
                                    <div><Label>Soru Sayısı</Label><div className="h-10 flex items-center px-3 rounded-md bg-slate-950/50 border border-white/10 text-slate-400 text-sm font-mono">{selectedQuestionIds.size}</div></div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div><Label>Başlangıç Tarihi</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start font-normal bg-slate-950 border-white/10 text-white hover:bg-slate-900"><CalendarIcon className="mr-2 h-4 w-4 text-indigo-400" />{startDate ? format(startDate, "PPP", { locale: tr }) : <span>Seçiniz...</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-white"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent></Popover></div>
                                    <div><Label>Son Teslim Tarihi</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start font-normal bg-slate-950 border-white/10 text-white hover:bg-slate-900"><CalendarIcon className="mr-2 h-4 w-4 text-rose-400" />{dueDate ? format(dueDate, "PPP", { locale: tr }) : <span>Seçiniz...</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-white"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent></Popover></div>
                                </div>
                            </CardContent>
                         </Card>
                         
                         {/* Ödül Ayarları */}
                        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white"><Trophy className="h-5 w-5 text-amber-400"/> Başarı Ödülü</CardTitle>
                                <CardDescription className="text-slate-400">Belirlenen puanı geçen öğrencilere verilecek ödülü ayarlayın.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Puan Eşiği</Label>
                                    <Input type="number" value={successThreshold || ''} onChange={e => setSuccessThreshold(parseInt(e.target.value) || undefined)} placeholder="Örn: 700" className="bg-slate-950 border-white/10 text-white"/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ödül Puanı</Label>
                                    <Input type="number" value={successReward || ''} onChange={e => setSuccessReward(parseInt(e.target.value) || undefined)} placeholder="Örn: 1000" className="bg-slate-950 border-white/10 text-white"/>
                                </div>
                            </CardContent>
                        </Card>
                         
                         {/* Katılımcılar */}
                         <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
                            <CardHeader><CardTitle className="text-white">Katılımcılar ({selectedStudentUids.size})</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                     <Select value={selectedClassId} onValueChange={v => { setSelectedClassId(v); setSelectedBranch('all'); setSelectedStudentUids(new Set()); }}>
                                        <SelectTrigger className="bg-slate-950 border-white/10 text-white text-xs h-9"><SelectValue placeholder="Sınıf"/></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tümü</SelectItem>{creationData?.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={selectedBranch} onValueChange={v => { setSelectedBranch(v); setSelectedStudentUids(new Set()); }} disabled={selectedClassId === 'all'}>
                                        <SelectTrigger className="bg-slate-950 border-white/10 text-white text-xs h-9"><SelectValue placeholder="Şube"/></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tümü</SelectItem>{selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="bg-slate-950 border border-white/10 rounded-lg overflow-hidden">
                                    <div className="p-2 border-b border-white/5 bg-slate-900/50 flex items-center gap-2"><Checkbox id="select-all-students" checked={selectedStudentUids.size === filteredStudents.length && filteredStudents.length > 0} onCheckedChange={checked => checked ? setSelectedStudentUids(new Set(filteredStudents.map(s => s.uid))) : setSelectedStudentUids(new Set())} /><label htmlFor="select-all-students" className="text-xs font-bold text-slate-300">Tümünü Seç</label></div>
                                    <ScrollArea className="h-48 p-2"><div className="space-y-1">{filteredStudents.map(student => (<div key={student.uid} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5"><Checkbox id={`student-${student.uid}`} checked={selectedStudentUids.has(student.uid)} onCheckedChange={() => toggleStudent(student.uid)} /><label htmlFor={`student-${student.uid}`} className="text-xs text-slate-300">{student.displayName}</label></div>))}</div></ScrollArea>
                                </div>
                            </CardContent>
                         </Card>
                     </div>

                     {/* SAĞ PANEL */}
                     <div className="lg:col-span-8 xl:col-span-9">
                        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
                            <CardHeader className="border-b border-white/5">
                                <CardTitle className="text-white">Soru Seçimi ({selectedQuestionIds.size})</CardTitle>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                                    <Select value={selectedCourseId} onValueChange={v => {setSelectedCourseId(v); setSelectedUnitId('all'); setSelectedTopicId('all');}}><SelectTrigger className="bg-slate-950 border-white/10 text-xs"><SelectValue placeholder="Ders" /></SelectTrigger><SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tümü</SelectItem>{filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
                                    <Select value={selectedUnitId} onValueChange={v => {setSelectedUnitId(v); setSelectedTopicId('all');}} disabled={!selectedCourseId || selectedCourseId === 'all'}><SelectTrigger className="bg-slate-950 border-white/10 text-xs"><SelectValue placeholder="Ünite" /></SelectTrigger><SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tümü</SelectItem>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent></Select>
                                    <Select value={selectedTopicId} onValueChange={setSelectedTopicId} disabled={!selectedUnitId || selectedUnitId === 'all'}><SelectTrigger className="bg-slate-950 border-white/10 text-xs"><SelectValue placeholder="Konu" /></SelectTrigger><SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tümü</SelectItem>{filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select>
                                    <div className="relative"><Input placeholder="Ara..." value={questionSearchTerm} onChange={e => setQuestionSearchTerm(e.target.value)} className="bg-slate-950 border-white/10 pl-8 text-xs"/><Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/></div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center gap-3 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                                    <Checkbox id="select-all-questions" onCheckedChange={toggleAllQuestions} checked={isAllQuestionsOnPageSelected} className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"/>
                                    <Label htmlFor="select-all-questions" className="text-sm font-medium text-slate-300">Bu sayfadaki tüm soruları seç ({paginatedQuestions.length})</Label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {paginatedQuestions.map(q => <QuestionSelectionCard key={q.id} question={q} isSelected={selectedQuestionIds.has(q.id)} onToggle={() => toggleQuestion(q.id)}/>)}
                                </div>
                            </CardContent>
                            {totalQuestionPages > 1 && (
                                <CardFooter className="flex justify-between items-center border-t border-white/5">
                                    <span className="text-sm text-slate-500">{filteredExamQuestions.length} soru bulundu.</span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setQuestionsCurrentPage(p => p - 1)} disabled={questionsCurrentPage === 1} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950">Önceki</Button>
                                        <span className="text-sm font-bold text-white px-4 bg-slate-900 py-1.5 rounded-lg border border-white/10">{questionsCurrentPage} / {totalQuestionPages}</span>
                                        <Button variant="outline" size="sm" onClick={() => setQuestionsCurrentPage(p => p + 1)} disabled={questionsCurrentPage >= totalQuestionPages} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950">Sonraki</Button>
                                    </div>
                                </CardFooter>
                            )}
                        </Card>
                     </div>
                 </div>
            </div>
        </div>
    )
}
```
- src/app/teacher/page.tsx:
```tsx
"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { Loader2, Zap } from "lucide-react";
import { useEffect } from 'react';
import Link from 'next/link';

// This page now only serves to redirect users. 
// The main dashboard logic has been consolidated into the root `src/app/page.tsx`.
export default function TeacherDashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Yönlendirme mantığını useEffect içine almak best-practice'dir (Render sırasında state update uyarısını önler)
  useEffect(() => {
    if (!loading) {
      if (user) {
        // Yönlendirmeyi /teacher yerine ana dizine yap
        router.replace('/');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Yükleme Ekranı Tasarımı (Cyber/Dark Tema)
  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Arka Plan Efektleri */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Logo / İkon Alanı */}
          <div className="relative group">
              <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-500" />
              <div className="relative bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl">
                  <Zap className="h-12 w-12 text-cyan-400 fill-cyan-400/20" />
              </div>
              
              {/* Dönen Loader Halkası */}
              <div className="absolute -inset-4 border-2 border-transparent border-t-cyan-500/50 border-r-indigo-500/50 rounded-full animate-spin [animation-duration:2s]" />
          </div>

          {/* Metin Alanı */}
          <div className="text-center space-y-3">
              <h2 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md">
                  Değerler Oyunu
              </h2>
              <div className="flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-bold tracking-widest uppercase">Yönlendiriliyor...</span>
              </div>
          </div>
      </div>
    </div>
  );
}

```
- src/app/teacher/superadmin/actions.ts:
```ts


'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
// Admin SDK importlarını isimlendirerek ayırıyoruz
import { Timestamp as AdminTimestamp, FieldValue } from "firebase-admin/firestore"; 
import { db } from "@/lib/firebase"; 
// Client SDK importları
import { collection, query, where, getDocs, orderBy, limit, addDoc, deleteDoc, doc, Timestamp as ClientTimestamp, serverTimestamp, getCountFromServer, getDoc } from 'firebase/firestore'; 
import { unstable_noStore as noStore } from 'next/cache';
import type { UserProfile, SchoolClass, Course, Unit, Topic, LessonStep, School, Announcement, Assignment } from "@/lib/types";

// Dosya sistemi modülleri
import fs from 'fs/promises';
import path from 'path';
import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale";

// --- TİP TANIMLARI ---
type LeaderboardEntry = UserProfile & { score: number };

export type HallOfFamePeriod = {
    periodName: string;
    winners: LeaderboardEntry[];
};

export type ClassLeaderboardEntry = {
    name: string;
    totalScore: number;
    studentCount: number;
};

// --- YARDIMCI FONKSİYON: GÜVENLİ SERIALIZER ---
const serialize = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map(serialize);
  
  if (data && typeof data === 'object' && typeof data.toDate === 'function') {
      return data.toDate().toISOString();
  }

  if (data && typeof data === 'object' && '_seconds' in data) {
      return new Date(data._seconds * 1000).toISOString();
  }
  
  if (data instanceof Date) return data.toISOString();
  
  if (typeof data === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = serialize(data[key]);
      }
    }
    return newObj;
  }
  return data;
};

// ==========================================
// 1. BÖLÜM: LEADERBOARD VERİLERİ (Öğrenci Sayfası İçin - Okuma Amaçlı)
// ==========================================

export async function getLiveLeaderboard(): Promise<LeaderboardEntry[]> {
    noStore();
    try {
        const usersQuery = query(
            collection(db, 'users'), 
            where('role', '==', 'student'), 
            orderBy('score', 'desc'), 
            limit(100)
        );
        const usersSnapshot = await getDocs(usersQuery);
        const leaderboard = usersSnapshot.docs.map(doc => ({
            ...doc.data(),
            uid: doc.id,
            score: doc.data().score || 0
        } as LeaderboardEntry));
        
        return serialize(leaderboard);
    } catch (e) {
        console.error("Leaderboard fetch error:", e);
        return [];
    }
}

export async function getHallOfFameData(): Promise<{ seasons: HallOfFamePeriod[], monthly: HallOfFamePeriod[] }> {
    noStore();

    const adminDb = getAdminDb();
    const seasonsSnap = await adminDb.collection('archivedSeasons').orderBy('createdAt', 'desc').get();
    
    const seasons = seasonsSnap.docs.map(doc => {
        const data = doc.data();
        return {
            periodName: data.seasonName,
            winners: data.leaderboard.slice(0, 10)
        } as HallOfFamePeriod;
    });

    const monthlyWinners: HallOfFamePeriod[] = [];
    const now = new Date();
    const startDate = subMonths(now, 6);
    const months = eachMonthOfInterval({ start: startDate, end: now });

    const usersSnapshot = await getDocs(query(collection(db, 'users'), where("role", "==", "student")));
    const studentsMap = new Map();
    usersSnapshot.forEach(doc => studentsMap.set(doc.id, { uid: doc.id, ...doc.data() }));

    for (const month of months) {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthlyEventsQuery = query(
            collection(db, 'scoreEvents'),
            where("timestamp", ">=", ClientTimestamp.fromDate(monthStart)),
            where("timestamp", "<=", ClientTimestamp.fromDate(monthEnd))
        );
        
        try {
            const eventsSnapshot = await getDocs(monthlyEventsQuery);
            const scoresByStudent = new Map<string, number>();
            
            eventsSnapshot.forEach(eventDoc => {
                const event = eventDoc.data();
                if (event.gameType === 'holiday_reward') return; 
                
                const currentScore = scoresByStudent.get(event.userId) || 0;
                scoresByStudent.set(event.userId, currentScore + event.points);
            });

            if (scoresByStudent.size > 0) {
                const leaderboard = Array.from(scoresByStudent.entries())
                    .map(([uid, score]) => ({ student: studentsMap.get(uid), score }))
                    .filter((entry): entry is { student: UserProfile; score: number } => !!entry.student && entry.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map(entry => ({...entry.student, score: entry.score }));

                if (leaderboard.length > 0) {
                    monthlyWinners.push({
                        periodName: format(monthStart, 'MMMM yyyy', { locale: tr }),
                        winners: leaderboard,
                    });
                }
            }
        } catch (e) {
            console.warn(`Monthly stats error for ${month}:`, e);
        }
    }
    
    return {
        seasons: serialize(seasons),
        monthly: serialize(monthlyWinners.reverse()),
    };
}

export async function archiveAndResetScores(seasonName: string) {
    const adminDb = getAdminDb();
    try {
        const usersSnap = await adminDb.collection('users')
            .where('role', '==', 'student')
            .orderBy('score', 'desc')
            .limit(100)
            .get();
            
        const leaderboard = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

        await adminDb.collection('archivedSeasons').add({
            seasonName,
            leaderboard,
            createdAt: new Date(),
        });

        const batch = adminDb.batch();
        const allStudentsSnap = await adminDb.collection('users').where('role', '==', 'student').get();
        
        let operationCount = 0;
        for (const doc of allStudentsSnap.docs) {
            batch.update(doc.ref, { score: 0 });
            operationCount++;
            if (operationCount >= 450) {
                await batch.commit();
                operationCount = 0;
            }
        }
        
        if (operationCount > 0) await batch.commit();

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ==========================================
// 2. BÖLÜM: DUYURU YÖNETİMİ
// ==========================================

export async function getAnnouncements(category: 'general' | 'exam' = 'general'): Promise<{ success: boolean; data?: Announcement[]; error?: string }> {
    try {
        const q = query(collection(db, 'announcements'), where('category', '==', category), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const data = snapshot.docs.map(doc => {
            const docData = doc.data();
            let createdIso = new Date().toISOString();
            if (docData.createdAt && typeof docData.createdAt.toDate === 'function') {
                createdIso = docData.createdAt.toDate().toISOString();
            } else if (docData.createdAt && docData.createdAt._seconds) {
                 createdIso = new Date(docData.createdAt._seconds * 1000).toISOString();
            }

            return {
                id: doc.id,
                ...docData,
                createdAt: createdIso
            };
        });

        return { success: true, data: serialize(data) };
    } catch (e: any) {
        console.error("Error getting announcements:", e);
        return { success: false, error: "Duyurular alınamadı." };
    }
}

export async function createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
    try {
        await addDoc(collection(db, 'announcements'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Duyuru oluşturulamadı." };
    }
}

export async function deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, 'announcements', id));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Duyuru silinemedi." };
    }
}

// ==========================================
// 3. BÖLÜM: YÖNETİM (Kullanıcı, Okul, Export)
// ==========================================

export async function deleteUserFromFirestore(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: 'Kullanıcı ID\'si belirtilmedi.' };
    try {
        const auth = getAdminAuth();
        await auth.deleteUser(userId);
        const adminDb = getAdminDb();
        await adminDb.collection('users').doc(userId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Silme hatası: ' + error.message };
    }
}

export async function deleteBulkUsers(userIds: string[]): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    if (!userIds || userIds.length === 0) return { success: false, error: "Kullanıcı seçilmedi." };
    
    const auth = getAdminAuth();
    const adminDb = getAdminDb();
    const batch = adminDb.batch();
    let deletedCount = 0;

    const authDeletions = userIds.map(uid => auth.deleteUser(uid).catch(e => ({ uid, error: e })));
    const authResults = await Promise.allSettled(authDeletions);

    authResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            const uid = userIds[index];
            batch.delete(adminDb.collection('users').doc(uid));
            deletedCount++;
        }
    });

    try {
        await batch.commit();
        return { success: true, deletedCount };
    } catch (dbError: any) {
        return { success: false, error: "Veritabanı hatası.", deletedCount };
    }
}

export async function saveUser(data: any) {
    // Placeholder 
    return { success: true }; 
}

// --- OKUL YÖNETİMİ ---

export async function saveSchool(data: { id?: string; name: string }) {
    if (!data.name || data.name.trim() === '') return { success: false, error: "Okul adı boş olamaz." };
    const adminDb = getAdminDb();
    try {
        if (data.id) {
            await adminDb.collection('schools').doc(data.id).update({ name: data.name.trim() });
        } else {
            await adminDb.collection('schools').add({ name: data.name.trim(), createdAt: new Date().toISOString() });
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSchool(schoolId: string) {
    if (!schoolId) return { success: false, error: "ID gerekli." };
    const adminDb = getAdminDb();
    try {
        await adminDb.collection('schools').doc(schoolId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bulkUpdateStudentSchool(userIds: string[], schoolId: string, schoolName: string) {
    if (!userIds.length || !schoolId) return { success: false, error: "Eksik bilgi." };
    const adminDb = getAdminDb();
    const batch = adminDb.batch();
    try {
        userIds.forEach(userId => {
            batch.update(adminDb.collection('users').doc(userId), { 
                schoolId, schoolName, updatedAt: new Date().toISOString() 
            });
        });
        await batch.commit();
        return { success: true, count: userIds.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


// --- VERİ EXPORT (JSON İNDİRME) ---

export async function exportAllData(dataType: string, filters: any) {
    const adminDb = getAdminDb();
    try {
        let query: any = adminDb.collection(dataType);
        const snapshot = await query.get();
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        return serialize(data);
    } catch (error) {
        console.error("Export error:", error);
        return [];
    }
}

// --- GELİŞMİŞ STATİK SİTE EXPORT FONKSİYONU ---

export async function exportStaticAdvanced(
  filters: { classId: string, courseId: string, unitId: string, topicId: string },
  types: string[] 
) {
  const adminDb = getAdminDb();
  const publicPath = path.join(process.cwd(), 'public');
  const curriculumPath = path.join(publicPath, 'curriculum');
  
  const dirs = ['ozetler', 'yazilacaklar', 'flows', 'questions', 'activityItems'];
  try {
      await fs.mkdir(curriculumPath, { recursive: true });
      for (const d of dirs) {
        await fs.mkdir(path.join(curriculumPath, d), { recursive: true });
      }
  } catch (e) {
      console.error("Klasör oluşturma hatası:", e);
  }

  const allDocsToWrite: { path: string, content: string }[] = [];

  try {
    const [classesSnap, coursesSnap, unitsSnap, topicsSnap] = await Promise.all([
      adminDb.collection('classes').orderBy('createdAt', 'asc').get(),
      adminDb.collection('courses').get(),
      adminDb.collectionGroup('units').get(),
      adminDb.collectionGroup('topics').get()
    ]);

    const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass));
    const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
    const units = unitsSnap.docs.map(d => ({ id: d.id, parentCourseId: d.ref.parent.parent!.id, ...d.data() } as Unit & { parentCourseId: string }));
    const topics = topicsSnap.docs.map(d => ({ id: d.id, parentUnitId: d.ref.parent.parent!.id, ...d.data() } as Topic & { parentUnitId: string }));

    // Filtreleme
    let targetTopicIds = new Set<string>();
    let targetUnitIds = new Set<string>();

    const filteredCourses = courses.filter(c => 
      (filters.classId === 'all' || c.classId === filters.classId) &&
      (filters.courseId === 'all' || c.id === filters.courseId)
    );
    const filteredCourseIds = new Set(filteredCourses.map(c => c.id));

    const filteredUnits = units.filter(u => 
      filteredCourseIds.has(u.parentCourseId) &&
      (filters.unitId === 'all' || u.id === filters.unitId)
    );
    const filteredUnitIds = new Set(filteredUnits.map(u => u.id));

    const filteredTopics = topics.filter(t => 
      filteredUnitIds.has(t.parentUnitId) &&
      (filters.topicId === 'all' || t.id === filters.topicId)
    );
    
    filteredTopics.forEach(t => targetTopicIds.add(t.id));
    filteredUnits.forEach(u => targetUnitIds.add(u.id));

    const addFile = (folder: string, filename: string, content: any) => {
      const finalContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      allDocsToWrite.push({
        path: path.join(curriculumPath, folder, filename),
        content: finalContent
      });
    };

    if (types.includes('manifest')) {
       const manifestStructure = [
           ...classes.map(cls => {
               const clsCourses = courses.filter(c => c.classId === cls.id && (c.isPublished ?? true));
               if(clsCourses.length === 0) return null;
               const processedCourses = processCoursesForManifest(clsCourses, units, topics);
               return processedCourses.length > 0 ? { name: cls.name, courses: processedCourses } : null;
           }),
           (() => {
               const genCourses = courses.filter(c => !c.classId && (c.isPublished ?? true));
               const processed = processCoursesForManifest(genCourses, units, topics);
               return processed.length > 0 ? { name: 'Genel', courses: processed } : null;
           })()
       ].filter(Boolean);

       addFile('', 'manifest.json', { classGroups: manifestStructure });
    }

    if (types.includes('ozet')) {
      for (const unit of filteredUnits) {
        if (unit.htmlContent) addFile('ozetler', `${unit.id}.html`, unit.htmlContent);
      }
      for (const topic of filteredTopics) {
        if (topic.htmlContent) addFile('ozetler', `${topic.id}.html`, topic.htmlContent);
      }
    }

    if (types.includes('flow')) {
      for (const unit of filteredUnits) {
        const published = (unit.steps || []).filter((s:any) => s.isPublished !== false);
        if(published.length) addFile('flows', `${unit.id}.json`, published);
      }
      for (const topic of filteredTopics) {
        const published = (topic.steps || []).filter((s:any) => s.isPublished !== false);
        if(published.length) addFile('flows', `${topic.id}.json`, published);
      }
    }

    if (types.includes('notes')) {
      const topicIdsArray = Array.from(targetTopicIds);
      if (topicIdsArray.length > 0) {
        for (let i = 0; i < topicIdsArray.length; i += 30) {
           const chunk = topicIdsArray.slice(i, i + 30);
           const defsSnap = await adminDb.collection('activityItems')
             .where('topicId', 'in', chunk)
             .where('type', '==', 'definition')
             .get();
           
           const defsByTopic: Record<string, any[]> = {};
           defsSnap.docs.forEach(d => {
             const data = d.data();
             if(!defsByTopic[data.topicId]) defsByTopic[data.topicId] = [];
             defsByTopic[data.topicId].push({ concept: data.content.term, definition: data.content.definition });
           });

           for (const tId of chunk) {
             const topic = topics.find(t => t.id === tId);
             const notes = topic?.writingContent?.notes || [];
             const defs = defsByTopic[tId] || [];
             if (notes.length > 0 || defs.length > 0) {
               addFile('yazilacaklar', `${tId}.json`, { notes, conceptDefinitions: defs });
             }
           }
        }
      }
    }

    const exportCollection = async (colName: string, folder: string, typeKey: string) => {
        if (!types.includes(typeKey)) return;
        const topicIdsArray = Array.from(targetTopicIds);
        if (topicIdsArray.length === 0) return;

        for (let i = 0; i < topicIdsArray.length; i += 30) {
           const chunk = topicIdsArray.slice(i, i + 30);
           const snap = await adminDb.collection(colName).where('topicId', 'in', chunk).get();
           
           const itemsByTopic: Record<string, any[]> = {};
           snap.docs.forEach(d => {
              const data = d.data();
              if(!itemsByTopic[data.topicId]) itemsByTopic[data.topicId] = [];
              itemsByTopic[data.topicId].push(serialize({ id: d.id, ...data }));
           });

           for (const tId of chunk) {
             if (itemsByTopic[tId]) {
                addFile(folder, `${tId}.json`, itemsByTopic[tId]);
             }
           }
        }
    };

    await exportCollection('questions', 'questions', 'questions');
    await exportCollection('activityItems', 'activityItems', 'activities');

    const CHUNK_SIZE = 50;
    for (let i = 0; i < allDocsToWrite.length; i += CHUNK_SIZE) {
        const chunk = allDocsToWrite.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(file => fs.writeFile(file.path, file.content)));
    }

    return { 
      success: true, 
      message: `İşlem tamamlandı. ${allDocsToWrite.length} dosya oluşturuldu/güncellendi.` 
    };

  } catch (error: any) {
    console.error("Export error:", error);
    return { success: false, error: "Dışa aktarma hatası: " + error.message };
  }
}

function processCoursesForManifest(courseList: any[], units: any[], topics: any[]) {
    return courseList.map(course => {
        const courseUnits = units.filter(u => u.parentCourseId === course.id && (u.isPublished ?? true));
        if(courseUnits.length === 0) return null;

        const processedUnits = courseUnits.map(unit => {
            const unitTopics = topics.filter(t => t.parentUnitId === unit.id && (t.isPublished ?? true));
            const hasContent = unit.htmlContent || (unit.steps?.length) || unitTopics.length > 0;
            if(!hasContent) return null;

            return {
                id: unit.id,
                title: unit.title,
                hasUnitOzet: !!unit.htmlContent,
                hasFlowContent: (unit.steps || []).some((s:any) => s.isPublished),
                topics: unitTopics.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    hasOzetContent: !!t.htmlContent,
                    hasFlowContent: (t.steps || []).some((s:any) => s.isPublished),
                    hasYazilacaklarContent: (t.writingContent?.notes?.length || 0) > 0 
                }))
            };
        }).filter(Boolean);

        return processedUnits.length > 0 ? { id: course.id, title: course.title, units: processedUnits } : null;
    }).filter(Boolean);
}

// --- Yeni Fonksiyon: Ödülleri Dağıt ---
export async function distributeExamRewards(assignmentId: string): Promise<{ success: boolean; error?: string; distributedCount?: number }> {
    if (!assignmentId) return { success: false, error: 'Ödev ID\'si eksik.' };

    const adminDb = getAdminDb();

    try {
        return await adminDb.runTransaction(async (transaction) => {
            const assignmentRef = adminDb.collection('assignments').doc(assignmentId);
            const assignmentDoc = await transaction.get(assignmentRef);

            if (!assignmentDoc.exists) throw new Error('Ödev bulunamadı.');
            const assignment = assignmentDoc.data() as Assignment;

            if (assignment.rewardsDistributed) throw new Error('Bu sınavın ödülleri zaten dağıtılmış.');
            
            const { successThreshold, successReward, assignedTo } = assignment;
            if (!successThreshold || !successReward || successThreshold <= 0 || successReward <= 0) {
                throw new Error('Bu sınav için ödül ayarları yapılmamış.');
            }
            if (!assignedTo || assignedTo.length === 0) {
                 return { success: true, distributedCount: 0 };
            }

            const scoreEventsQuery = adminDb.collection('scoreEvents')
                .where('context', '==', `Deneme ID: ${assignmentId}`)
                .where('userId', 'in', assignedTo);

            const scoreEventsSnap = await transaction.get(scoreEventsQuery);

            let distributedCount = 0;
            const userUpdatePromises: Promise<any>[] = [];

            scoreEventsSnap.forEach(eventDoc => {
                const event = eventDoc.data() as ScoreEvent;
                if (event.points >= successThreshold) {
                    const userRef = adminDb.collection('users').doc(event.userId);
                    const rewardEventRef = adminDb.collection('scoreEvents').doc();
                    
                    transaction.update(userRef, { score: FieldValue.increment(successReward) });
                    transaction.set(rewardEventRef, {
                        userId: event.userId,
                        points: successReward,
                        gameType: 'Deneme Ödülü',
                        context: `Başarı: ${assignment.title}`,
                        timestamp: FieldValue.serverTimestamp(),
                    });
                    distributedCount++;
                }
            });
            
            transaction.update(assignmentRef, { rewardsDistributed: true });

            return { success: true, distributedCount };
        });
    } catch (e: any) {
        console.error("Reward distribution error:", e);
        return { success: false, error: `Ödül dağıtımı hatası: ${e.message}` };
    }
}
```
- src/components/oyun-kurulum.tsx:
```tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    Sparkles, Loader2, Gamepad2, Search, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getCurriculumForSelection, type ClassGroup } from './actions/get-curriculum-for-selection';

// --- TİP TANIMLARI ---
type Topic = { id: string; title: string; hasOzetContent?: boolean; hasYazilacaklarContent?: boolean; };
type Unit = { id: string; title: string; topics: Topic[]; hasUnitOzet?: boolean; };
type EnrichedCourse = { id: string; title: string; icon: React.ElementType; color: string; className: string; units: Unit[]; };

const ICONS = [Book, Sparkles, Book, Gamepad2];
const getGradient = (index: number) => {
    const gradients = [
        "from-blue-600 to-cyan-500",
        "from-violet-600 to-purple-500",
        "from-emerald-600 to-teal-500",
        "from-rose-600 to-pink-500",
        "from-amber-600 to-orange-500"
    ];
    return gradients[index % gradients.length];
};

// --- UI COMPONENTS ---

const GlassPanel = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-xl bg-[#0f172a]/80 border border-white/10 rounded-2xl md:rounded-[2.5rem] shadow-2xl overflow-hidden relative transition-all duration-300",
        className
    )}>
        <div className="absolute top-0 left-0 w-full h-1 md:h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-50"></div>
        {children}
    </div>
);

const SearchInput = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => (
    <div className="relative w-full max-w-md mx-auto mb-6 group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
        <div className="relative bg-[#0f172a] border border-white/10 rounded-xl flex items-center px-4 py-3 shadow-xl">
            <Search className="h-5 w-5 text-slate-400 mr-3" />
            <input 
                type="text" 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Listede ara..." 
                className="bg-transparent border-none outline-none text-white placeholder-slate-500 w-full text-sm md:text-base font-medium"
            />
            {value && (
                <button onClick={() => onChange('')} className="ml-2 hover:bg-white/10 p-1 rounded-full transition-colors">
                    <XCircle className="h-5 w-5 text-slate-400 hover:text-white" />
                </button>
            )}
        </div>
    </div>
);

const SelectionCard = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    onClick, 
    delay = 0, 
    color = "from-slate-700 to-slate-800",
    hasContent = true,
}: { 
    title: string, 
    subtitle?: string, 
    icon: any, 
    onClick: () => void, 
    delay?: number,
    color?: string,
    isActive?: boolean,
    hasContent?: boolean
}) => (
    <button 
        onClick={onClick}
        disabled={!hasContent}
        className={cn(
            "group relative w-full overflow-hidden rounded-2xl p-[1px] transition-all duration-300 text-left h-full flex flex-col",
            hasContent ? "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10" : "opacity-40 cursor-not-allowed",
            "animate-in slide-in-from-bottom-4 fade-in fill-mode-forwards"
        )}
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={cn(
            "absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity bg-gradient-to-br", 
            color
        )}></div>
        
        <div className="relative h-full w-full bg-[#1e293b] rounded-[15px] p-3 md:p-5 flex items-center gap-3 md:gap-4 border border-white/5 group-hover:bg-[#1e293b]/95 transition-colors">
            
            <div className={cn(
                "h-10 w-10 md:h-16 md:w-16 rounded-lg md:rounded-xl flex items-center justify-center shadow-inner shrink-0 bg-gradient-to-br text-white transition-transform group-hover:scale-110 duration-300 border border-white/10",
                color
            )}>
                <Icon className="h-5 w-5 md:h-8 md:w-8 drop-shadow-md" />
            </div>
            
            <div className="flex-grow min-w-0 flex flex-col justify-center">
                {subtitle && (
                    <div className="inline-flex self-start items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 mb-1.5">
                        <span className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[150px]">{subtitle}</span>
                    </div>
                )}
                <h3 className="font-bold text-slate-100 text-sm md:text-base lg:text-lg leading-tight group-hover:text-white transition-colors line-clamp-2">
                    {title}
                </h3>
                 {!hasContent && <span className="text-[10px] text-red-400/70 font-semibold mt-1">İçerik Yok</span>}
            </div>
            
            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all shrink-0 ml-auto opacity-50 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="h-4 w-4" />
            </div>
        </div>
    </button>
);

// --- MAIN PAGE COMPONENT ---
type OyunKurulumProps = {
    pageTitle?: string;
    gameName?: string;
    gamePath?: string;
    pageIcon?: React.ElementType;
    gameIcon?: React.ElementType;
    targetPath?: string;
    dataType: 'games' | 'yazilacaklar' | 'ozetler';
    isStatic?: boolean;
}

export function OyunKurulum({ 
    pageTitle: initialPageTitle, 
    gameName, 
    gamePath, 
    pageIcon: PageIconProp, 
    gameIcon,
    targetPath, 
    dataType, 
    isStatic = false 
}: OyunKurulumProps) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);
    
    const PageIcon = PageIconProp || gameIcon || Gamepad2;
  
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [courses, setCourses] = useState<EnrichedCourse[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    
    const [searchQuery, setSearchQuery] = useState("");
  
    const pageTitle = initialPageTitle || gameName || searchParams.get('gameName') || "Etkinlik Kurulumu";
    const finalGamePath = gamePath || searchParams.get('gamePath') || "";
  
    const [selection, setSelection] = useState({
      classId: "",
      className: "",
      courseId: "",
      courseName: "",
      courseColor: "from-slate-700 to-slate-800", 
      unitId: "",
      unitName: "",
      topicName: ""
    });

    const stepsToDisplay = useMemo(() => {
        const allSteps = [
            { id: 1, name: "Ders", icon: Book },
            { id: 2, name: "Ünite", icon: Library },
            { id: 3, name: "Konu", icon: ListTodo },
        ];
        return allSteps;
    }, []);
  
    const getBackUrl = () => {
      if (targetPath?.startsWith('student')) return '/student';
      if(targetPath === 'oyunlar') return '/oyunlar';
      return '/'; 
    };
    
    const handleBack = () => {
      if (currentStep > 1) {
          setCurrentStep(currentStep - 1);
          setSearchQuery("");
      } else {
          router.push(getBackUrl());
      }
    };
  
    const fetchCurriculumData = useCallback(async () => {
      if (isRedirecting) return;
      setIsLoading(true);
      try {
          const userId = isStatic ? undefined : user?.uid;
          const { classGroups: fetchedClassGroups, error } = await getCurriculumForSelection(dataType, isStatic, userId);
          
          if (error) {
              console.error(error);
              setClassGroups([]);
              return;
          }
          
          const classGroupsWithData = (fetchedClassGroups || []).map((group, groupIndex) => ({
              ...group,
              courses: group.courses.map((course: any, courseIndex: number) => ({
                  ...course,
                  icon: ICONS[(groupIndex + courseIndex) % ICONS.length],
                  color: getGradient(groupIndex + courseIndex),
                  className: group.name,
              }))
          }));
          
          setClassGroups(classGroupsWithData);
          setCourses(classGroupsWithData.flatMap(group => group.courses));
      } catch (error) {
          console.error(error);
      } finally {
          setIsLoading(false);
      }
    }, [user?.uid, dataType, isStatic, isRedirecting]);
  
    useEffect(() => {
      if (!isRedirecting && !authLoading) {
          fetchCurriculumData();
      }
    }, [fetchCurriculumData, isRedirecting, authLoading]);
  
    const handleSelectCourse = (course: EnrichedCourse) => {
      setSelection({ 
          ...selection, 
          classId: course.classId || "",
          className: course.className || "", 
          courseId: course.id, 
          courseName: course.title, 
          courseColor: course.color || "from-slate-700 to-slate-800",
          unitId: '', unitName: '',
      });
      
      setIsLoading(true);
      setSearchQuery("");
      setTimeout(() => {
          let unitsWithContent = course.units;
          if (dataType !== 'games') {
               unitsWithContent = course.units.filter((unit) => {
                  if (dataType === 'ozetler') return (unit as any).hasUnitOzet || unit.topics.some((t: Topic) => (t as any).hasOzetContent);
                  if (dataType === 'yazilacaklar') return unit.topics.some((t: Topic) => (t as any).hasYazilacaklarContent);
                  return false;
               });
          }
          const sortedUnits = (unitsWithContent || []).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));
          setUnits(sortedUnits);
          setIsLoading(false);
          setCurrentStep(2);
      }, 300);
    };
  
    const handleSelectUnit = (unit: Unit) => {
      setSelection({ ...selection, unitId: unit.id, unitName: unit.title, topicName: '' });
      
      if (dataType === 'games' && unit.id === 'all') {
          const params = new URLSearchParams({
              gameName: pageTitle,
              gamePath: finalGamePath,
              classId: selection.classId,
              className: selection.className,
              courseId: selection.courseId,
              courseName: selection.courseName,
              unitId: 'all',
              unitName: 'Tüm Üniteler',
              topicId: 'all',
              topicName: 'Tüm Konular',
              isStatic: String(isStatic),
          });
          const url = `/oyunlar/${finalGamePath}/oyun?${params.toString()}`;
          router.push(url);
          return;
      }
  
      if (dataType === 'ozetler' && (unit as any).hasUnitOzet && (!unit.topics || unit.topics.every(t => !(t as any).hasOzetContent))) {
          const pathPrefix = isStatic ? '' : '/student';
          const url = `${pathPrefix}/ozetler/${selection.courseId}/${unit.id}`;
          router.push(url);
          return;
      }
  
      setIsLoading(true);
      setSearchQuery("");
      setTimeout(() => {
          const selectedCourse = courses.find(c => c.id === selection.courseId);
          const selectedUnit = selectedCourse?.units?.find(u => u.id === unit.id);
          
          let topicsWithContent: Topic[] = [];
          if (selectedUnit?.topics) {
              if (dataType === 'games') topicsWithContent = selectedUnit.topics;
              else if (dataType === 'ozetler') topicsWithContent = selectedUnit.topics.filter(t => (t as any).hasOzetContent);
              else if (dataType === 'yazilacaklar') topicsWithContent = selectedUnit.topics.filter(t => (t as any).hasYazilacaklarContent);
          }
          
          setTopics(topicsWithContent.sort((a,b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })));
          
          setIsLoading(false);
          setCurrentStep(3);
      }, 300);
    };
    
    const handleSelectTopic = (topicId: string, topicName: string) => {
        setSelection({...selection, topicName});
        const pathPrefix = isStatic ? '' : '/';
        let finalUrl = '';
        
        if (dataType === 'yazilacaklar') {
            finalUrl = `${pathPrefix}yazilacaklar/${selection.courseId}/${selection.unitId}/${topicId}`;
        } else if (dataType === 'ozetler') {
            finalUrl = `${pathPrefix}ozetler/${selection.courseId}/${selection.unitId}/${topicId}`;
        } else { // games
            const params = new URLSearchParams({
              gameName: pageTitle,
              gamePath: finalGamePath,
              classId: selection.classId, 
              className: selection.className, 
              courseId: selection.courseId,
              courseName: selection.courseName,
              unitId: selection.unitId,
              unitName: selection.unitName,
              topicId: topicId,
              topicName: topicName,
              isStatic: String(isStatic),
            });
            finalUrl = `/oyunlar/${finalGamePath}/oyun?${params.toString()}`;
        }
        router.push(finalUrl);
    };
  
    const filterItems = (items: any[]) => {
        if (!searchQuery) return items;
        return items.filter(item => 
            (item.title || item.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.className && item.className.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    };
  
    const renderStepContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-48 md:h-96 gap-4 animate-pulse">
                    <div className="relative">
                      <Loader2 className="h-10 w-10 md:h-20 md:w-20 text-cyan-400 animate-spin" />
                      <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full"></div>
                    </div>
                    <p className="text-sm md:text-2xl font-bold text-cyan-200">İçerikler Yükleniyor...</p>
                </div>
            );
        }
        
        const gridClasses = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 pb-10";
        
        switch(currentStep) {
            case 1:
              const filteredCourses = filterItems(courses);
              return (
                  <>
                      <SearchInput value={searchQuery} onChange={setSearchQuery} />
                      <div className={gridClasses}>
                          {filteredCourses.length > 0 ? filteredCourses.map((course, idx) => (
                              <SelectionCard 
                                  key={course.id}
                                  title={course.title}
                                  subtitle={course.className}
                                  icon={(course as any).icon || Book}
                                  color={(course as any).color || getGradient(idx)}
                                  onClick={() => handleSelectCourse(course as EnrichedCourse)}
                                  delay={idx * 50}
                              />
                          )) : <p className="col-span-full text-center text-slate-500 py-10">Aradığınız kriterde ders bulunamadı.</p>}
                      </div>
                  </>
              );
            case 2:
              const filteredUnits = filterItems(units);
              return (
                  <>
                      <SearchInput value={searchQuery} onChange={setSearchQuery} />
                      <div className={gridClasses}>
                          {dataType === 'games' && !searchQuery && (
                              <SelectionCard 
                                  key="all-units"
                                  title="Tüm Üniteler (Karma)"
                                  subtitle="Genel Tekrar"
                                  icon={Sparkles}
                                  color="from-yellow-600 to-amber-500"
                                  onClick={() => handleSelectUnit({ id: 'all', title: 'Tüm Üniteler' } as Unit)}
                                  delay={0}
                              />
                          )}
                          {filteredUnits.length > 0 ? filteredUnits.map((unit, idx) => (
                              <SelectionCard 
                                  key={unit.id}
                                  title={unit.title}
                                  subtitle={selection.courseName}
                                  icon={Library}
                                  color={selection.courseColor}
                                  onClick={() => handleSelectUnit(unit as Unit)}
                                  delay={(idx + 1) * 50}
                                  hasContent={dataType === 'games' || (unit as any).hasUnitOzet || (unit.topics && unit.topics.some((t: any) => t.hasOzetContent || t.hasYazilacaklarContent))}
                              />
                          )) : <p className="col-span-full text-center text-slate-500 py-10">Aradığınız kriterde ünite bulunamadı.</p>}
                      </div>
                  </>
              );
            case 3:
              const filteredTopics = filterItems(topics);
              
              return (
                  <>
                      <SearchInput value={searchQuery} onChange={setSearchQuery} />
                      <div className={gridClasses}>
                          {dataType === 'games' && !searchQuery && (
                                <SelectionCard 
                                  key="all-topics"
                                  title="Tüm Konular (Karma)"
                                  subtitle="Ünite Tekrarı"
                                  icon={Sparkles}
                                  color="from-yellow-600 to-amber-500"
                                  onClick={() => handleSelectTopic('all', 'Tüm Konular')}
                                  delay={0}
                              />
                          )}
                          
                          {filteredTopics.length > 0 ? filteredTopics.map((topic, idx) => (
                              <SelectionCard 
                                  key={topic.id}
                                  title={topic.title}
                                  subtitle={selection.unitName}
                                  icon={ListTodo}
                                  color={selection.courseColor}
                                  onClick={() => handleSelectTopic(topic.id, topic.title)}
                                  delay={(idx + 1) * 50}
                                  hasContent={true}
                              />
                          )) : (
                              <p className="col-span-full text-center text-slate-500 py-10">
                                  Bu ünite için görüntülenecek içerik bulunamadı.
                              </p>
                          )}
                      </div>
                  </>
              );
            default:
              return null;
        }
    }
  
    if (isRedirecting) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0f172a] text-white">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <Loader2 className="h-16 w-16 text-cyan-500 animate-spin" />
                        <div className="absolute inset-0 bg-cyan-500/30 blur-2xl rounded-full"></div>
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black tracking-tight">Oyun Başlatılıyor</h2>
                        <p className="text-slate-400">Görev yolculuğuna hazırlanıyorsun...</p>
                    </div>
                </div>
            </div>
        );
    }
  
    return (
      <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#0f172a] to-black p-2 md:p-10 pb-24 md:pb-10 font-sans text-white">
          
          <div className="max-w-7xl mx-auto flex items-center justify-between mb-4 md:mb-12 pt-2">
              <button 
                  onClick={handleBack}
                  className="p-2 md:p-4 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-2xl border border-white/10 transition-all group shrink-0"
              >
                  <ArrowLeft className="h-5 w-5 md:h-8 md:w-8 text-slate-400 group-hover:text-white transition-colors" />
              </button>
              <div className="text-center mx-2 overflow-hidden flex-1">
                  <div className="flex items-center justify-center gap-2">
                      <div className="hidden md:block p-2 bg-blue-500/20 rounded-xl">
                          <PageIcon className="h-8 w-8 text-blue-400" />
                      </div>
                      <h1 className="text-lg md:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400 truncate">
                          {pageTitle}
                      </h1>
                  </div>
              </div>
              <div className="w-9 md:w-20 shrink-0"></div>
          </div>
  
          <div className="max-w-4xl mx-auto mb-4 md:mb-12 px-1">
              <div className="relative flex justify-between items-center">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                  <div 
                      className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_#3b82f6] -z-10 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${((currentStep - 1) / (stepsToDisplay.length - 1)) * 100}%` }}
                  ></div>
  
                  {stepsToDisplay.slice(0, 3).map((step) => {
                      const isActive = currentStep >= step.id;
                      const isCurrent = currentStep === step.id;
                      return (
                          <div key={step.id} className="flex flex-col items-center gap-1">
                              <div className={cn("w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 md:border-4 transition-all duration-500 z-10 font-black text-xs md:text-xl shadow-xl", isActive ? "bg-blue-600 border-blue-400 text-white scale-110 shadow-blue-500/50" : "bg-slate-900 border-slate-700 text-slate-500")}>
                                  {isActive && !isCurrent ? <Check className="h-3 w-3 md:h-6 md:w-6" /> : step.id}
                              </div>
                              <span className={cn("text-[9px] md:text-sm font-bold uppercase tracking-wider transition-colors duration-300", isCurrent ? "text-blue-400" : isActive ? "text-white" : "text-slate-600")}>{step.name}</span>
                          </div>
                      );
                  })}
              </div>
          </div>
  
          <GlassPanel className="max-w-5xl mx-auto min-h-[calc(100vh-240px)] flex flex-col">
              <div className="p-3 md:p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                  <h2 className="text-base md:text-2xl font-bold text-white flex items-center gap-2">
                      {stepsToDisplay.find(s => s.id === currentStep)?.icon && (
                          <div className="p-1.5 md:p-2 bg-white/5 rounded-lg">
                             {React.createElement(stepsToDisplay.find(s => s.id === currentStep)!.icon, { className: "h-4 w-4 md:h-6 md:w-6 text-cyan-400" })}
                          </div>
                      )}
                      {stepsToDisplay.find(s => s.id === currentStep)?.name} Seçimi
                  </h2>
                  
                  <div className="px-2 py-0.5 md:px-4 md:py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] md:text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                      ADIM {currentStep} / {stepsToDisplay.length}
                  </div>
              </div>
  
              <div className="flex-grow p-2 md:p-8 lg:p-12 overflow-y-auto">
                  {renderStepContent()}
              </div>
  
              <div className="p-3 md:p-6 border-t border-white/5 bg-black/20 flex justify-between items-center text-slate-500 text-[10px] md:text-sm font-medium">
                  <span className="truncate mr-4">
                      {currentStep === 1 && "Devam etmek için bir ders seçin."}
                      {currentStep === 2 && <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>{selection.courseName} seçildi. Şimdi ünite seçin.</span>}
                      {currentStep === 3 && <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>{selection.unitName} seçildi. Son olarak, bir konu seç.</span>}
                  </span>
                  
                  <div className="flex gap-1 md:gap-2 shrink-0 opacity-50">
                      <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce"></div>
                      <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce delay-100"></div>
                      <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce delay-200"></div>
                  </div>
              </div>
          </GlassPanel>
      </div>
    );
}
```
- src/lib/firebase-admin.ts:
```ts
import { initializeApp, getApps, getApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export function getAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.error("Firebase Admin initialization failed: Missing environment variables.");
    // In a serverless environment, sometimes retrying helps if envs are slow to load.
    // However, throwing an error is generally safer to prevent undefined behavior.
    throw new Error("Firebase Admin initialization failed: Missing .env.local variables.");
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey,
  };

  return initializeApp({
    credential: cert(serviceAccount),
  });
}


export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

```
- src/lib/firebase.ts:
```ts
import { initializeApp, getApps, getApp, FirebaseApp, setLogLevel } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyCcMLHz5eLpV10YMXFkNSCVxYhxR6WxyBs",
  authDomain: "tamuyum.firebaseapp.com",
  projectId: "tamuyum",
  storageBucket: "tamuyum.appspot.com",
  messagingSenderId: "912689470856",
  appId: "1:912689470856:web:42898bb6fdc9c4dfa22e3d"
};

let app: FirebaseApp;

// Singleton pattern: Uygulamanın sadece bir kez başlatılmasını sağlar
if (!getApps().length) {
    try {
        app = initializeApp(firebaseConfig);
        setLogLevel('error');
    } catch (error) {
        console.error("Firebase initialization error", error);
        app = getApp();
    }
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Offline persistence (Sadece tarayıcıda çalışır)
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn("Firestore persistence failed (multiple tabs open).");
      } else if (err.code == 'unimplemented') {
        console.warn("Firestore persistence not supported.");
      }
    });
}

// Storage'ı da dışarı aktarıyoruz
export { app, auth, db, storage };

```
- src/lib/types.ts:
```ts


export type UserProfile = {
    uid: string;
    username?: string; // Unique username for login
    displayName: string;
    email: string;
    role: 'student' | 'teacher' | 'superadmin' | 'guest' | 'pending';
    class?: string; // e.g. "5/A" or "Yaz Okulu Havuzu"
    schoolName?: string; // e.g. "Değerler Okulu"
    studentNumber?: string; // Add student number
    score?: number;
    avatar?: string;
    createdAt?: any; // To accommodate Firestore's ServerTimestamp or a string
    ownedItems?: string[]; // Array of shop item IDs
    equippedFrameUrl?: string | null;
    equippedBadgeId?: string | null;
    guestPlayers?: string[];
    // Streak properties
    currentStreak?: number;
    longestStreak?: number;
    lastStreakDate?: string; // ISO string 'yyyy-MM-dd'
    lastWheelSpin?: any; // Can be a server timestamp on write, string on read
};

export type ShopItem = {
    id: string;
    name: string;
    price: number;
    type: 'avatarFrame' | 'avatarBadge';
    assetUrl?: string; // For CSS gradients or image URLs
    component?: React.ComponentType<any>; // For SVG icon components
    description: string;
};

export type Achievement = {
  periodType: 'weekly' | 'monthly';
  periodName: string; // e.g., "13-19 Mayıs 2024" or "Haziran 2024"
  rank: number;
  score: number;
};


export type UserProgress = {
    [topicId: string]: {
        completionCount: number;
        lastCompleted: any; // Can be a server timestamp on write, string on read
    };
};

// For Question Bank progression
export type TestResult = {
    status: 'passed' | 'failed';
    correct: number;
    total: number;
    score: number;
};
export type DifficultyProgress = { [testIndex: number]: TestResult };


export type QuestionBankTopicProgress = {
    [topicId: string]: {
        easy?: DifficultyProgress;
        medium?: DifficultyProgress;
        hard?: DifficultyProgress;
    };
};

export type QuestionBankProgress = {
    [topicId: string]: {
        easy?: DifficultyProgress;
        medium?: DifficultyProgress;
        hard?: DifficultyProgress;
    };
};

export type ImageAsset = {
    id: string;
    title: string;
    url: string;
    storagePath: string;
    teacherId: string;
    createdAt: any;
    folderId?: string | null; // ID of the folder it belongs to
    folderName?: string | null; // Name of the folder for display
};

export type Folder = {
    id: string;
    name: string;
    teacherId: string;
    createdAt: any;
};


// Discriminated union for more type-safe lesson steps
export type ContentStep = { type: 'content'; title: string; content: string; isPublished?: boolean; };
export type ObjectiveListStep = { type: 'objectiveList'; title: string; items: string[]; isPublished?: boolean; };
export type ConceptExplanationStep = { type: 'conceptExplanation'; title: string; items: { concept: string; definition: string; }[]; isPublished?: boolean; };
export type McqStep = { type: 'mcq'; title: string; question: string; options: string[]; correctAnswer: string; isPublished?: boolean; };
export type TfStep = { type: 'tf'; title: string; statement: string; isTrue: boolean; isPublished?: boolean; };
export type TrueFalseListStep = { type: 'trueFalseList'; title: string; questions: { statement: string; isTrue: boolean; }[]; isPublished?: boolean; };
export type FitbStep = { type: 'fitb'; title: string; sentenceWithBlank: string; options: string[]; correctAnswer: string; isPublished?: boolean; };
export type FlashcardStep = { type: 'flashcard'; title: string; cards: { term: string; definition: string; }[]; isPublished?: boolean; };
export type AnagramStep = { type: 'anagram'; title: string; definition: string; scrambledWord: string; correctAnswer: string; isPublished?: boolean; };
export type AnagramCard = { definition: string; scrambledWord: string; correctAnswer: string; };
export type AnagramFlashcardStep = { type: 'anagramFlashcard'; title: string; cards: AnagramCard[]; isPublished?: boolean; };
export type SentenceScrambleStep = { type: 'sentenceScramble'; title: string; scrambledSentence: string; correctSentence: string; isPublished?: boolean; };
export type VisualStep = { type: 'visual'; title: string; imageUrl: string; prompt?: string; isPublished?: boolean; };
export type AccordionStep = { type: 'accordion'; title: string; items: { id: string, title: string; content: string; }[]; isPublished?: boolean; };
export type IframeStep = { type: 'iframe'; title: string; url: string; isPublished?: boolean; };
export type ActivityLinkStep = { type: 'activityLink'; title: string; activityType: string; activityLabel: string; isPublished?: boolean; };
export type HtmlSlideStep = { type: 'htmlSlide'; title: string; htmlContent: string; isPublished?: boolean; };
export type VideoStep = { type: 'video'; title: string; url: string; description?: string; isPublished?: boolean; };
export type AnagramGameStep = { type: 'anagramGame'; title: string; cards: AnagramCard[]; isPublished?: boolean; };


export type ConceptMapData = {
  nodes: { id: string; label: string; isCentral?: boolean }[];
  edges: { from: string; to:string; label?: string }[];
};

export type ConceptMapStep = {
  type: 'conceptMap';
  title: string;
  mapData: ConceptMapData;
  isPublished?: boolean;
};

export type LessonStep = 
  | ContentStep 
  | ObjectiveListStep
  | McqStep 
  | TfStep 
  | TrueFalseListStep
  | FitbStep 
  | FlashcardStep 
  | AnagramStep 
  | AnagramFlashcardStep
  | SentenceScrambleStep 
  | VisualStep
  | AccordionStep
  | IframeStep
  | ActivityLinkStep
  | ConceptMapStep
  | HtmlSlideStep
  | ConceptExplanationStep
  | AnagramGameStep
  | VideoStep;

export type CategorizationGameData = {
    title: string;
    categories: string[];
    items: { text: string; category: string }[];
};

export type SortingGameData = {
    title: string;
    items: string[];
};

export type ActivityItem = {
  id: string;
  type: 'concept' | 'definition' | 'sentence' | 'categorization' | 'sorting';
  content: {
    text?: string;
    term?: string;
    definition?: string;
    title?: string;
    // Fields for categorization type
    categories?: string[];
    items?: { text: string; category: string }[] | string[];
  };
  courseId: string;
  unitId: string;
  topicId: string;
  createdAt?: any;
};

export type YazilacaklarContent = {
  conceptDefinitions: { concept: string; definition: string; }[];
  notes: string[];
};

export type Topic = {
    id: string;
    title: string;
    steps?: LessonStep[]; // Unified content for both student and teacher
    externalLink?: string;
    sourceText?: string;
    htmlContent?: string;
    writingContent?: YazilacaklarContent; // For the new "Yazılacaklar" module
    createdAt?: any;
    isPublished?: boolean;
};

export type Unit = {
    id: string;
    title: string;
    topics?: Topic[];
    createdAt?: any;
    htmlContent?: string; // YENİ EKLENDİ
    isPublished?: boolean;
    steps?: LessonStep[];
    sourceText?: string;
};

export type Course = {
    id: string;
    title: string;
    classId?: string;
    className?: string;
    description?: string;
    progress?: number; 
    unitsCount?: number;
    topicsCount?: number;
    completedTopicsCount?: number;
    units?: Unit[]; // Subcollection
    createdAt?: any;
    isTeacherOnly?: boolean;
    isSummerSchool?: boolean;
    isPublished?: boolean;
};

export type Question = {
    id: string;
    text: string;
    type: 'Çoktan Seçmeli' | 'Doğru/Yanlış' | 'Boşluk Doldurma';
    courseId: string;
    unitId?: string;
    topicId: string;
    topic: string; // The name of the topic for display
    difficulty: 'Kolay' | 'Orta' | 'Zor';
    options?: string[];
    correctAnswer?: string;
    isTrue?: boolean;
    classId?: string;
    className?: string;
    createdAt?: any;
};

// Represents a class in the school
export type SchoolClass = {
    id: string;
    name: string;
    studentCount?: number;
    branches?: string[];
    branchCounts?: { [branchName: string]: number };
    students?: UserProfile[]; // Now holds student data directly
    createdAt?: any;
    isPublished?: boolean;
};

export type School = {
    id: string;
    name: string;
};

export type DailyQuest = {
    completed: boolean;
    score: number;
    bonus: number;
    timestamp: any; // To accommodate Firestore's ServerTimestamp
}

export type Anagram = {
  definition: string;
  scrambledWord: string;
  correctAnswer: string;
};

export type SentenceScramble = {
  scrambledSentence: string;
  correctSentence: string;
};

export type Assignment = {
  id: string;
  title: string;
  teacherId: string;
  assignmentType: 'standard' | 'deneme';
  courseId: string;
  courseName: string;
  classId: string;
  className: string;
  topicIds: string[];
  topicNames: string[];
  questionIds?: string[];
  assignedTo: string[]; // array of student UIDs
  startDate?: any; // Firestore Timestamp
  dueDate?: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  duration?: number; // Total exam duration in minutes
};

export type EvaluationScaleColumn = {
  id: string;
  name: string;
  type: 'status'; // For now, only status is needed for checklists
};

// A manually created scale
export type EvaluationScale = {
  id: string;
  name: string;
  teacherId: string;
  classId: string;
  courseId: string;
  type: 'tally' | 'checklist';
  columns: EvaluationScaleColumn[];
  createdAt: any;
};

// An entry for a student within a scale
export type ScaleEntry = {
    // For tally type
    plus?: number;
    minus?: number;

    // For checklist type
    statuses?: { [columnId: string]: '+' | '-' | 'o' | null };

    // Common field
    note?: string;
    lastUpdated?: any;
}


export type AssignmentProgress = {
    status: 'not-started' | 'in-progress' | 'completed';
    completedTopicIds: string[];
    startedAt?: any;
    completedAt?: any;
}

export type CurriculumData = {
  classes: SchoolClass[];
  courses: (Course & { units?: (Unit & { topics: Topic[] })[] })[];
  students: UserProfile[];
  error?: string;
}

export type ErrorReportConversationItem = {
    sender: 'student' | 'teacher';
    message: string;
    createdAt: any; // ISO String
};

export type ErrorReport = {
    id: string;
    message: string; // The original message
    pathname: string;
    userId: string;
    userName:string;
    itemData?: string; // JSON string of the reported item
    createdAt: any; // ISO String
    status: 'new' | 'in-progress' | 'resolved';
    conversation: ErrorReportConversationItem[];
    studentHasUnreadMessages?: boolean;
}

export type ScoreEvent = {
    id: string;
    userId: string;
    points: number;
    gameType: string;
    context: string;
    timestamp: any;
    answers?: (string|boolean|null)[];
};

export type CourseProgress = {
    courseId: string;
    courseName: string;
    completedTopics: number;
    totalTopics: number;
    progress: number;
};

export type QuestionBankStats = {
    courseId: string;
    courseName: string;
    totalTests: number;
    passedTests: number;
    completionPercentage: number;
    totalScore: number;
};

export type StudentDetails = {
    profile: UserProfile;
    recentActivity: ScoreEvent[];
    coursesProgress: CourseProgress[];
    questionBankStats: QuestionBankStats[];
};

export type GetQuizInput = {
    courseId?: string;
    unitId?: string;
    topicId?: string;
    questionCount?: number;
    difficulty?: string[];
    questionTypes?: string[];
    isStatic?: boolean;
};

export type GetQuizOutput = {
    questions: Partial<Question>[];
    error?: string;
};

export type YaziTuraQuestions = {
    easy: Question[];
    medium: Question[];
    hard: Question[];
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success';
  category: 'general' | 'exam';
  createdAt: any; // Can be a Timestamp or string after serialization
};

export type GameTask = {
    id: string;
    title: string;
    gameType: string; // Örn: 'kelime-avi', 'milyoner-yarismasi'
    minSuccessRate: number; // Örn: 50 (Yüzde)
    description: string;
    xpReward?: number; // Görev başına ufak ödül
  };
  
  export type TopicMission = {
    id: string;
    title: string;
    description: string;
    order: number; // Listeleme sırası
    color: string; // Kart rengi (örn: 'from-blue-600 to-indigo-600')
    tasks: GameTask[]; // İçindeki oyunlar
    totalRewardMultiplier: number; // Bölüm sonu çarpanı (örn: 5)
    isPublished?: boolean;
  };
  
  export type UserMissionProgress = {
    userId: string;
    completedTaskIds: string[]; // Biten görev ID'leri
    scores: { [taskId: string]: number }; // Her görevden alınan puan
    completedTopicIds: string[]; // Tamamen biten konular
    lastUpdated?: any;
  };
```
- src/lib/utils.ts:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeNameToEmailLocalPart(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, '.') // handle one or more spaces
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9.-]/g, '');
}

// GÜNCELLENMİŞ FONKSİYON: Türkçe karakterleri korur.
export const cleanForAnagram = (text: string): string => {
  if (!text) return '';
  // Metni tamamen büyük harfe çevir (Türkçe karakterlere duyarlı)
  const upperCaseText = text.toLocaleUpperCase('tr-TR');
  // Sadece izin verilen Türkçe alfabe harfleri, rakamlar, boşluklar ve şapkalı harfler dışındaki her şeyi sil
  const cleanedText = upperCaseText.replace(/[^A-ZĞÜŞİÖÇÂÎÛ0-9\s]/g, '');
  return cleanedText;
};

// Türkiye saatine göre tarih stringi (YYYY-MM-DD)
export function getTurkeyDateString(date: Date = new Date()): string {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })).toISOString().split('T')[0];
}

```
- src/next.config.ts:
```ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Correctly placing allowedDevOrigins at the top level
  allowedDevOrigins: [
    "https://6000-firebase-degerleroyunu-1767537398519.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev",
    "https://9000-firebase-degerleroyunu-1767537398519.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev"
  ],
};

export default nextConfig;

```
- src/tailwind.config.ts:
```ts
import type {Config} from 'tailwindcss';

const colorNames = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Creates a regex pattern like: /^(bg|text|border)-(slate|gray|...)-(50|100|...)$/
const colorPattern = new RegExp(
  `^(bg|text|border|ring|fill|stroke)-(${colorNames.join('|')})-(${shades.join('|')})$`
);


export default {
  darkMode: ['class'],
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    {
      pattern: colorPattern,
    },
    {
        pattern: /bg-chart-(1|2|3|4|5)/,
    }
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['"Inter"', 'sans-serif'],
        headline: ['"Poppins"', 'serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "shake": {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        "shake-game": {
            "0%": { transform: "translateX(0)" },
            "25%": { transform: "translateX(-5px)" },
            "50%": { transform: "translateX(5px)" },
            "75%": { transform: "translateX(-5px)" },
            "100%": { transform: "translateX(0)" },
        },
        "tada": {
          "0%": { transform: "scale(1)" },
          "10%, 20%": { transform: "scale(0.9) rotate(-3deg)" },
          "30%, 50%, 70%, 90%": { transform: "scale(1.1) rotate(3deg)" },
          "40%, 60%, 80%": { transform: "scale(1.1) rotate(-3deg)" },
          "100%": { transform: "scale(1) rotate(0)" }
        },
        "bubbleFloat": {
            "0%": { transform: "translate(0px, 0px) scale(1)", opacity: "0.9" },
            "50%": { transform: "translate(var(--translate-x), var(--translate-y)) scale(1.02)", opacity: "0.95" },
            "100%": { transform: "translate(0px, 0px) scale(1)", opacity: "0.9" },
        },
        "fadeAndScaleIn": {
            from: { opacity: "0", transform: "scale(0.9)" },
            to: { opacity: "1", transform: "scale(1)" },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "shake": "shake 0.82s cubic-bezier(.36,.07,.19,.97) both",
        "tada": "tada 1s ease-in-out",
        "shake-game": "shake-game .3s ease-out",
        "bubbleFloat": "bubbleFloat var(--animation-duration, 5s) ease-in-out var(--animation-delay, 0s) infinite alternate",
        "fadeAndScaleIn": "fadeAndScaleIn .3s ease-out",
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;

```
- tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./src/*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}

```