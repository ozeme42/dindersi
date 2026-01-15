
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
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-8">
                     <div>
                        <Button asChild variant="ghost" size="sm" className="mb-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
                            <Link href="/teacher/exams"><ArrowLeft className="mr-2 h-4 w-4" /> Denemeler Listesine Dön</Link>
                        </Button>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                <FileQuestion className="h-8 w-8 text-indigo-400" />
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
