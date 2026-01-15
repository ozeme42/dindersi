'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Save, Search, ArrowLeft, FileQuestion, Users, BookOpen, Clock, 
    Calendar as CalendarIcon, FilePenLine, Trophy, Award, Plus, Trash2, Zap
} from 'lucide-react';
import { createExam, getExamCreationData, updateExam } from '../actions';
import type { Assignment, UserProfile, Question, SchoolClass, Course, Unit, Topic } from "@/lib/types";
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
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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
                "bg-slate-900/40 border-white/5 hover:border-white/10",
                isSelected ? "ring-2 ring-indigo-500 bg-indigo-900/10 border-indigo-500/50" : "hover:bg-slate-800/60"
            )} 
            onClick={onToggle}
        >
            <div className="flex justify-between items-start gap-3 mb-2">
                <Badge variant="outline" className={cn("font-bold border transition-colors", difficultyColors[question.difficulty as keyof typeof difficultyColors] || 'bg-slate-500/20')}>
                    {question.difficulty}
                </Badge>
                <Checkbox checked={isSelected} onCheckedChange={() => onToggle()} className="border-white/20 data-[state=checked]:bg-indigo-500 border-indigo-500" />
            </div>
            <p className="text-sm text-slate-300 line-clamp-3 font-medium flex-grow mb-3 leading-relaxed">{question.text}</p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-3 border-t border-white/5">
                <span className="truncate max-w-[150px] font-medium text-slate-400">{question.topic || 'Genel'}</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">{question.type}</span>
            </div>
        </div>
    )
}

export default function CreateExamClientPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const assignmentId = params.assignmentId as string;
    const isEditMode = !!assignmentId;

    const [creationData, setCreationData] = useState<ExamCreationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [title, setTitle] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
    const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
    const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());
    const [duration, setDuration] = useState<number | undefined>(undefined);
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [dueDate, setDueDate] = useState<Date | undefined>();
    
    const [rewardThresholds, setRewardThresholds] = useState<{ rate: number; points: number }[]>([
        { rate: 50, points: 25 },
        { rate: 75, points: 50 },
        { rate: 90, points: 100 }
    ]);
    
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
    const [questionSearchTerm, setQuestionSearchTerm] = useState("");
    const [questionsCurrentPage, setQuestionsCurrentPage] = useState(1);
    const questionsItemsPerPage = 12;

    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getExamCreationData();
            if (data.error) {
                toast({ title: 'Hata', description: "Sayfa verileri yüklenemedi.", variant: 'destructive'});
            } else {
                setCreationData(data);
                if (isEditMode && user) {
                    const examRef = doc(db, "assignments", assignmentId);
                    const examSnap = await getDoc(examRef);
                    if (examSnap.exists()) {
                        const assignmentToEdit = examSnap.data() as Assignment;
                        setTitle(assignmentToEdit.title || '');
                        setSelectedClassId(assignmentToEdit.classId || 'all');
                        setSelectedCourseId(assignmentToEdit.courseId || 'all');
                        setSelectedStudentUids(new Set(assignmentToEdit.assignedTo || []));
                        setSelectedQuestionIds(new Set(assignmentToEdit.questionIds || []));
                        setDuration(assignmentToEdit.duration);
                        setStartDate(assignmentToEdit.startDate ? new Date(assignmentToEdit.startDate) : undefined);
                        setDueDate(assignmentToEdit.dueDate ? new Date(assignmentToEdit.dueDate) : undefined);
                        if (assignmentToEdit.rewardThresholds) setRewardThresholds(assignmentToEdit.rewardThresholds);
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [isEditMode, assignmentId, user, toast]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    const addThreshold = () => setRewardThresholds([...rewardThresholds, { rate: 0, points: 0 }]);
    const removeThreshold = (index: number) => setRewardThresholds(rewardThresholds.filter((_, i) => i !== index));
    const updateThreshold = (index: number, field: 'rate' | 'points', value: number) => {
        const newThresholds = [...rewardThresholds];
        newThresholds[index][field] = value;
        setRewardThresholds(newThresholds);
    };

    // Filtreleme Mantıkları
    const filteredCourses = useMemo(() => {
        const courses = creationData?.courses || [];
        if (selectedClassId === 'all') return courses;
        return courses.filter(c => c.classId === selectedClassId || !c.classId);
    }, [selectedClassId, creationData]);

    const filteredUnits = useMemo(() => {
        return filteredCourses?.find(c => c.id === selectedCourseId)?.units || [];
    }, [selectedCourseId, filteredCourses]);

    const filteredTopics = useMemo(() => {
        return filteredUnits?.find(u => u.id === selectedUnitId)?.topics || [];
    }, [selectedUnitId, filteredUnits]);

    const filteredStudents = useMemo(() => {
        const students = creationData?.students || [];
        if (selectedClassId === 'all') return students;
        const cls = creationData?.classes?.find(c => c.id === selectedClassId);
        if (!cls) return students;
        return students.filter(s => s.class?.startsWith(cls.name));
    }, [selectedClassId, creationData]);
    
    const filteredExamQuestions = useMemo(() => {
        const allQuestions = creationData?.examQuestions || [];
        let questions = [...allQuestions];

        if (questionSearchTerm) {
            questions = questions.filter(q => q.text.toLowerCase().includes(questionSearchTerm.toLowerCase()));
        }

        if (selectedTopicId !== 'all') {
            questions = questions.filter(q => q.topicId === selectedTopicId);
        } else if (selectedUnitId !== 'all') {
            questions = questions.filter(q => q.unitId === selectedUnitId);
        } else if (selectedCourseId !== 'all') {
            questions = questions.filter(q => q.courseId === selectedCourseId);
        } else if (selectedClassId !== 'all') {
            const classCourseIds = new Set(filteredCourses.map(c => c.id));
            if (classCourseIds.size > 0) {
                questions = questions.filter(q => q.courseId && classCourseIds.has(q.courseId));
            }
        }
        return questions;
    }, [creationData, selectedClassId, selectedCourseId, selectedUnitId, selectedTopicId, questionSearchTerm, filteredCourses]);

    const paginatedQuestions = useMemo(() => {
        const startIndex = (questionsCurrentPage - 1) * questionsItemsPerPage;
        return filteredExamQuestions.slice(startIndex, startIndex + questionsItemsPerPage);
    }, [filteredExamQuestions, questionsCurrentPage]);

    const totalQuestionPages = Math.ceil(filteredExamQuestions.length / questionsItemsPerPage);

    // Seçim İşlemleri
    const toggleQuestion = (id: string) => {
        const next = new Set(selectedQuestionIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedQuestionIds(next);
    };
    
    const toggleAllQuestions = () => {
        const allOnPageIds = paginatedQuestions.map(q => q.id);
        const allSelected = allOnPageIds.every(id => selectedQuestionIds.has(id));
        const next = new Set(selectedQuestionIds);
        allOnPageIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
        setSelectedQuestionIds(next);
    };

    const toggleStudent = (uid: string) => {
        const next = new Set(selectedStudentUids);
        if (next.has(uid)) next.delete(uid); else next.add(uid);
        setSelectedStudentUids(next);
    };

    const toggleAllStudents = () => {
        const filteredUids = filteredStudents.map(s => s.uid);
        const allSelected = filteredUids.every(uid => selectedStudentUids.has(uid));
        const next = new Set(selectedStudentUids);
        filteredUids.forEach(uid => allSelected ? next.delete(uid) : next.add(uid));
        setSelectedStudentUids(next);
    };

    const handleSave = async () => {
        if (!user || !title || selectedQuestionIds.size === 0 || selectedStudentUids.size === 0) {
            toast({ title: "Eksik Bilgi", description: "Başlık, öğrenciler ve sorular gereklidir.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        try {
            const classData = creationData?.classes.find(c => c.id === selectedClassId);
            const courseData = filteredCourses.find(c => c.id === selectedCourseId);
            const assignmentData = {
                title, teacherId: user.uid, assignmentType: 'deneme' as const, classId: selectedClassId,
                className: classData?.name || 'Tümü', courseId: selectedCourseId, courseName: courseData?.title || 'Tümü',
                questionIds: Array.from(selectedQuestionIds), assignedTo: Array.from(selectedStudentUids),
                duration, startDate, dueDate, topicIds: [], topicNames: [],
                rewardThresholds: rewardThresholds.filter(t => t.rate > 0).sort((a,b) => a.rate - b.rate),
            };
            const result = isEditMode ? await updateExam(assignmentId, assignmentData) : await createExam(assignmentData);
            if (result.success) {
                toast({ title: "Başarılı", description: "Sınav kaydedildi." });
                router.push('/teacher/exams');
            } else toast({ title: "Hata", description: result.error, variant: "destructive" });
        } finally { setIsSaving(false); }
    };

    if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /></div>

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-8">
                    <div>
                        <Button asChild variant="ghost" size="sm" className="mb-2 text-slate-400 hover:text-white"><Link href="/teacher/exams"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link></Button>
                        <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><FilePenLine className="h-8 w-8 text-indigo-400" /> {isEditMode ? 'Düzenle' : 'Yeni Deneme'}</h1>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-8 rounded-xl shadow-xl">{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Kaydet</Button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                        <Card className="bg-slate-900/60 border border-white/10 shadow-xl">
                            <CardHeader><CardTitle className="text-white text-xs uppercase">Sınav Yapılandırması</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label>Başlık</Label><Input value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-950 border-white/10 text-white"/></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>Süre (Dk)</Label><Input type="number" value={duration || ''} onChange={e => setDuration(parseInt(e.target.value))} className="bg-slate-950 border-white/10 text-white"/></div>
                                    <div><Label>Soru</Label><div className="h-10 flex items-center px-3 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold">{selectedQuestionIds.size}</div></div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start bg-slate-950 border-white/10 text-white"><CalendarIcon className="mr-2 h-4 w-4 text-indigo-400" />{startDate ? format(startDate, "PPP", { locale: tr }) : "Başlangıç"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 bg-slate-900 border-white/10"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent></Popover>
                                    <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start bg-slate-950 border-white/10 text-white"><CalendarIcon className="mr-2 h-4 w-4 text-rose-400" />{dueDate ? format(dueDate, "PPP", { locale: tr }) : "Bitiş"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 bg-slate-900 border-white/10"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent></Popover>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/60 border border-amber-500/20 shadow-xl overflow-hidden">
                            <div className="bg-amber-500/10 p-4 border-b border-amber-500/20 flex items-center justify-between">
                                <CardTitle className="text-white text-xs uppercase flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400 fill-amber-400" /> Ödül Baremleri</CardTitle>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-400" onClick={addThreshold}><Plus className="h-4 w-4" /></Button>
                            </div>
                            <CardContent className="p-4 space-y-3">
                                {rewardThresholds.map((threshold, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-slate-950/40 p-2 rounded-lg border border-white/5">
                                        <div className="flex-1"><Label className="text-[9px]">%</Label><Input type="number" value={threshold.rate} onChange={(e) => updateThreshold(index, 'rate', parseInt(e.target.value))} className="h-7 bg-transparent border-white/10 text-xs" /></div>
                                        <div className="flex-1"><Label className="text-[9px]">XP</Label><Input type="number" value={threshold.points} onChange={(e) => updateThreshold(index, 'points', parseInt(e.target.value))} className="h-7 bg-transparent border-white/10 text-xs text-amber-400 font-bold" /></div>
                                        <Button variant="ghost" size="icon" className="mt-3 h-7 w-7 text-slate-500 hover:text-red-400" onClick={() => removeThreshold(index)}><Trash2 className="h-3 w-3" /></Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        
                        <Card className="bg-slate-900/60 border border-white/10 shadow-xl">
                            <CardHeader className="pb-3"><CardTitle className="text-white text-xs uppercase flex justify-between items-center">Öğrenciler <span>{selectedStudentUids.size} Seçili</span></CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-white h-9"><SelectValue placeholder="Sınıf"/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Sınıflar</SelectItem>{creationData?.classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <div className="bg-slate-950 border border-white/10 rounded-lg overflow-hidden">
                                    <div className="p-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Öğrenci Listesi</label>
                                        <Button variant="ghost" size="sm" onClick={toggleAllStudents} className="h-6 text-[9px] font-bold text-indigo-400 hover:bg-indigo-500/10">TÜMÜNÜ SEÇ/KALDIR</Button>
                                    </div>
                                    <ScrollArea className="h-48 p-2">
                                        <div className="space-y-1">
                                            {filteredStudents.map(student => (
                                                <div key={student.uid} onClick={() => toggleStudent(student.uid)} className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer">
                                                    <Checkbox checked={selectedStudentUids.has(student.uid)} onCheckedChange={() => toggleStudent(student.uid)} />
                                                    <span className="text-xs text-slate-300 font-medium truncate">{student.displayName}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-8 xl:col-span-9">
                        <Card className="bg-slate-900/60 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden">
                            <CardHeader className="border-b border-white/5 bg-slate-900/40">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                    <CardTitle className="text-white flex items-center gap-2 font-black uppercase tracking-tight"><BookOpen className="h-5 w-5 text-indigo-400"/> Soru Havuzu</CardTitle>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <div className="relative flex-grow md:w-64"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/><Input placeholder="Soru ara..." value={questionSearchTerm} onChange={e => setQuestionSearchTerm(e.target.value)} className="bg-slate-950 border-white/10 pl-9 h-10"/></div>
                                        <Button variant="outline" size="sm" onClick={toggleAllQuestions} className="border-white/10 text-slate-300 h-10">{paginatedQuestions.every(q => selectedQuestionIds.has(q.id)) ? "Bırak" : "Hepsini Seç"}</Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <Select value={selectedCourseId} onValueChange={v => {setSelectedCourseId(v); setSelectedUnitId('all'); setSelectedTopicId('all');}}><SelectTrigger className="bg-slate-950 border-white/10 h-9"><SelectValue placeholder="Ders" /></SelectTrigger><SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Dersler</SelectItem>{filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
                                    <Select value={selectedUnitId} onValueChange={v => {setSelectedUnitId(v); setSelectedTopicId('all');}} disabled={selectedCourseId === 'all'}><SelectTrigger className="bg-slate-950 border-white/10 h-9"><SelectValue placeholder="Ünite" /></SelectTrigger><SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Üniteler</SelectItem>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent></Select>
                                    <Select value={selectedTopicId} onValueChange={setSelectedTopicId} disabled={selectedUnitId === 'all'}><SelectTrigger className="bg-slate-950 border-white/10 h-9"><SelectValue placeholder="Konu" /></SelectTrigger><SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Konular</SelectItem>{filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {paginatedQuestions.length > 0 ? (
                                        paginatedQuestions.map(q => <QuestionSelectionCard key={q.id} question={q} isSelected={selectedQuestionIds.has(q.id)} onToggle={() => toggleQuestion(q.id)}/>)
                                    ) : (
                                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-3xl"><Search className="h-12 w-12 mb-4 opacity-10" /><p className="text-sm">Soru bulunamadı.</p></div>
                                    )}
                                </div>
                            </CardContent>
                            {totalQuestionPages > 1 && (
                                <CardFooter className="flex justify-between items-center border-t border-white/5 p-6 bg-slate-900/20">
                                    <span className="text-xs text-slate-500">Toplam {filteredExamQuestions.length} soru.</span>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" size="sm" onClick={() => setQuestionsCurrentPage(p => p - 1)} disabled={questionsCurrentPage === 1} className="border-white/10 bg-slate-950">Önceki</Button>
                                        <Badge className="bg-slate-800 text-slate-300 border-white/5">{questionsCurrentPage} / {totalQuestionPages}</Badge>
                                        <Button variant="outline" size="sm" onClick={() => setQuestionsCurrentPage(p => p + 1)} disabled={questionsCurrentPage >= totalQuestionPages} className="border-white/10 bg-slate-950">Sonraki</Button>
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