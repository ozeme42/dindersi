'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getUnitScaleDetails, saveScaleEntries, getScaleDetails, updateScaleColumns } from './actions';
import { createExam } from '@/app/teacher/exams/actions';
import type { Course, Unit, UserProfile, ScaleEntry, EvaluationScale, EvaluationScaleColumn, Topic } from "@/lib/types";
import { Loader2, ArrowLeft, Plus, Minus, Save, TrendingUp, Check, X, ChevronsUpDown, ClipboardList, Settings, PlusCircle, Trash2, Calendar as CalendarIcon, Send, Clock, Hash, CalendarPlus, CalendarDays, History, Layers, ChevronUp, ChevronDown, Palette, Minimize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/context/auth-context';

const StatusButton = ({ status, onClick }: { status: '+' | '-' | 'o' | null, onClick: () => void }) => {
    const statusMap = {
        '+': { icon: Check, color: 'bg-emerald-600 hover:bg-emerald-500' },
        '-': { icon: X, color: 'bg-red-600 hover:bg-red-500' },
        'o': { icon: ClipboardList, color: 'bg-yellow-600 hover:bg-yellow-500' },
    };

    if (!status) {
        return (
            <Button size="icon" variant="ghost" className="h-10 w-10 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white" onClick={onClick}>
                <ChevronsUpDown className="h-5 w-5" />
            </Button>
        );
    }
    
    const Icon = statusMap[status].icon;
    
    return (
        <Button size="icon" variant="default" className={cn("h-10 w-10 text-white shadow-md", statusMap[status].color)} onClick={onClick}>
            <Icon className="h-6 w-6" />
        </Button>
    )
}

// SÜTUN DÜZENLEYİCİ DİYALOG
function ColumnEditorDialog({
    isOpen,
    onOpenChange,
    columns,
    onSave,
    isSaving,
    scaleType
}: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    columns: EvaluationScaleColumn[];
    onSave: (newColumns: EvaluationScaleColumn[]) => void;
    isSaving: boolean;
    scaleType: 'checklist' | 'points' | 'tally';
}) {
    const [localColumns, setLocalColumns] = useState(columns);

    useEffect(() => {
        setLocalColumns(columns);
    }, [columns, isOpen]);
    
    const handleColumnNameChange = (id: string, newName: string) => {
        setLocalColumns(prev => prev.map(col => col.id === id ? { ...col, name: newName } : col));
    }
    const handleAddColumn = () => {
        setLocalColumns(prev => [...prev, { id: `col_${Date.now()}`, name: "Yeni Başlık", type: scaleType === 'points' ? 'number' : 'status' }]);
    }
    const handleRemoveColumn = (id: string) => {
        setLocalColumns(prev => prev.filter(col => col.id !== id));
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Sütunları Düzenle</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-3">
                    {localColumns.map(col => (
                        <div key={col.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-white/5">
                            <Input value={col.name} onChange={(e) => handleColumnNameChange(col.id, e.target.value)} className="bg-slate-900 border-white/10 text-white h-10"/>
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveColumn(col.id)} className="text-slate-500 hover:text-red-400">
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddColumn} className="border-white/10 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20">
                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Sütun Ekle
                    </Button>
                </div>
                <DialogFooter className="border-t border-white/10 pt-4">
                    <DialogClose asChild><Button variant="ghost" className="text-slate-400 hover:bg-white/5">İptal</Button></DialogClose>
                    <Button onClick={() => onSave(localColumns)} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ScaleDetailPage() {
    const params = useParams();
    const scaleOrUnitId = params.scaleId as string;
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const type = searchParams.get('type'); 
    const branch = searchParams.get('branch'); 
    
    const [scale, setScale] = useState<EvaluationScale | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [unit, setUnit] = useState<Unit | null>(null);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [entries, setEntries] = useState<{ [studentId: string]: ScaleEntry }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);
    const { toast } = useToast();

    // --- OTURUM MANTIĞI ---
    const [activeSessionId, setActiveSessionId] = useState<string>("1");

    // --- ÖDEV ATA STATE'LERİ ---
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [assignmentDueDate, setAssignmentDueDate] = useState<Date | undefined>();
    const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());

    const availableSessions = useMemo(() => {
        const sessions = new Set<string>();
        sessions.add("1");
        
        Object.values(entries).forEach(entry => {
            if (entry.history) {
                Object.keys(entry.history).forEach(key => sessions.add(key));
            }
        });

        return Array.from(sessions).sort((a, b) => parseInt(a) - parseInt(b));
    }, [entries]);

    const handleAddSession = () => {
        const nextId = (Math.max(...availableSessions.map(s => parseInt(s))) + 1).toString();
        setActiveSessionId(nextId);
        toast({ title: `${nextId}. Değerlendirme Başlatıldı`, description: "Puanları girmeye başlayabilirsiniz." });
    }

    const fetchData = useCallback(async () => {
        if (!scaleOrUnitId || !user) return;
        setIsLoading(true);

        const result = type === 'unit' && courseId 
            ? await getUnitScaleDetails(courseId, scaleOrUnitId, branch, user.schoolName || null) 
            : await getScaleDetails(scaleOrUnitId);

        if (result.success && result.data) {
            setCourse(result.data.course || null);
            setStudents((result.data.students || []).sort((a, b) => 
                (a.displayName || '').localeCompare(b.displayName || '', 'tr', { sensitivity: 'base' })
            ));
            setEntries(result.data.entries || {});
            
            if (type === 'unit' && 'unit' in result.data) {
                const unitData = result.data.unit;
                 setUnit(unitData || null);
                 setScale({
                    id: unitData.id,
                    name: unitData.title,
                    type: 'checklist',
                    columns: (unitData.topics || []).map(t => ({ id: t.id, name: t.title, type: 'status' })),
                    classId: result.data.course.classId || '',
                    courseId: result.data.course.id,
                    teacherId: '', 
                    createdAt: unitData.createdAt,
                });
            } else if ('scale' in result.data) {
                setScale(result.data.scale || null);
            }

        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
        }
        setIsLoading(false);
    }, [scaleOrUnitId, courseId, type, branch, toast, user]);

    useEffect(() => {
        if (!type || (type === 'unit' && (!courseId || !branch))) {
            toast({ title: "Hata", description: "Eksik parametre. Lütfen ölçekler sayfasına geri dönün.", variant: "destructive" });
            router.push('/teacher/scales');
            return;
        }
        fetchData();
    }, [fetchData, type, courseId, branch, router, toast]);

    const getStudentDataAtSession = (studentId: string) => {
        const entry = entries[studentId];
        if (!entry) return null;
        
        if (entry.history && entry.history[activeSessionId]) {
            return entry.history[activeSessionId];
        }

        if (activeSessionId === "1") {
            return {
                plus: entry.plus,
                minus: entry.minus,
                statuses: entry.statuses,
                values: entry.values
            };
        }

        return null;
    };

    const handleTallyChange = (studentId: string, field: 'plus' | 'minus', value: number) => {
        setEntries(prev => {
            const studentEntry = prev[studentId] || { history: {}, note: '' };
            const history = studentEntry.history || {};
            const sessionData = history[activeSessionId] || { plus: 0, minus: 0 };
            
            return {
                ...prev,
                [studentId]: {
                    ...studentEntry,
                    history: {
                        ...history,
                        [activeSessionId]: {
                            ...sessionData,
                            [field]: Math.max(0, value)
                        }
                    }
                }
            };
        });
    };

    const handleChecklistChange = (studentId: string, columnId: string) => {
        const statuses: (('+' | '-' | 'o') | null)[] = ['+', '-', 'o', null];
        setEntries(prev => {
            const studentEntry = prev[studentId] || { history: {}, note: '' };
            const history = studentEntry.history || {};
            const sessionData = history[activeSessionId] || { statuses: {} };
            const currentStatuses = sessionData.statuses || {};
            
            const currentStatus = currentStatuses[columnId] || null;
            const currentIndex = statuses.indexOf(currentStatus);
            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
            
            return {
                ...prev,
                [studentId]: {
                    ...studentEntry,
                    history: {
                        ...history,
                        [activeSessionId]: {
                            ...sessionData,
                            statuses: { ...currentStatuses, [columnId]: nextStatus }
                        }
                    }
                }
            };
        });
    };

    const handlePointsChange = (studentId: string, columnId: string, value: number) => {
        setEntries(prev => {
            const studentEntry = prev[studentId] || { history: {}, note: '' };
            const history = studentEntry.history || {};
            const sessionData = history[activeSessionId] || { values: {} };
            const currentValues = sessionData.values || {};

            return {
                ...prev,
                [studentId]: {
                    ...studentEntry,
                    history: {
                        ...history,
                        [activeSessionId]: {
                            ...sessionData,
                            values: { ...currentValues, [columnId]: value }
                        }
                    }
                }
            };
        });
    };

    const handleNoteChange = (studentId: string, value: string) => {
        setEntries(prev => {
            const studentEntry = prev[studentId] || {};
            return {...prev, [studentId]: {...studentEntry, note: value}};
        });
    }

    const handleSave = async () => {
        if (!scale) return;
        setIsSaving(true);
        const result = await saveScaleEntries(scale.id, entries);
        if (result.success) {
            toast({ title: "Kaydedildi", description: "Değerlendirmeler başarıyla güncellendi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
        }
        setIsSaving(false);
    };

    const handleSaveColumns = async (newColumns: EvaluationScaleColumn[]) => {
        if (!scale) return;
        setIsSaving(true);
        const result = await updateScaleColumns(scale.id, newColumns);
        if (result.success) {
            toast({ title: "Sütunlar Güncellendi" });
            setScale(prev => prev ? { ...prev, columns: newColumns } : null);
            setIsColumnEditorOpen(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    }

    const calculateStudentAverage = useCallback((studentId: string): number | null => {
        const entry = entries[studentId];
        if (!entry || !entry.history) return null;

        const sessionKeys = Object.keys(entry.history);
        if (sessionKeys.length === 0) return null;

        let totalSumsAcrossSessions = 0;
        let validSessionCount = 0;

        sessionKeys.forEach(key => {
            const data = entry.history![key];
            if (scale?.type === 'points' && data.values) {
                const sessionSum = Object.values(data.values).reduce((a, b) => a + (b || 0), 0);
                if (sessionSum > 0 || Object.keys(data.values).length > 0) {
                    totalSumsAcrossSessions += sessionSum;
                    validSessionCount++;
                }
            } else if (scale?.type === 'checklist' && data.statuses) {
                const sessionStatuses = Object.values(data.statuses);
                let sessionSuccessSum = 0;
                let sessionGradedCount = 0;
                sessionStatuses.forEach(s => {
                    if (s === '+') sessionSuccessSum += 100;
                    else if (s === 'o') sessionSuccessSum += 50;
                    if (s !== null) sessionGradedCount++;
                });
                if (sessionGradedCount > 0) {
                    totalSumsAcrossSessions += (sessionSuccessSum / sessionGradedCount);
                    validSessionCount++;
                }
            }
        });

        if (validSessionCount === 0) return null;
        return Math.round(totalSumsAcrossSessions / validSessionCount);
    }, [entries, scale?.type]);

    const classOverallAverage = useMemo(() => {
        const studentAverages = students
            .map(s => calculateStudentAverage(s.uid))
            .filter((avg): avg is number => avg !== null);
        
        if (studentAverages.length === 0) return null;
        return Math.round(studentAverages.reduce((a, b) => a + b, 0) / studentAverages.length);
    }, [students, calculateStudentAverage]);

    const handleCreateAssignment = async () => {
        if (!user || !unit || !course || !branch || selectedStudentUids.size === 0) {
            toast({ title: "Eksik Bilgi", description: "Lütfen en az bir öğrenci seçin.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        const assignmentData = {
            title: assignmentTitle || `${unit.title} Tekrar Ödevi`,
            teacherId: user.uid,
            assignmentType: 'deneme' as const,
            classId: course.classId || '',
            className: course.className || '',
            courseId: course.id,
            courseName: course.title,
            topicIds: (unit.topics || []).map(t => t.id),
            topicNames: (unit.topics || []).map(t => t.title),
            assignedTo: Array.from(selectedStudentUids),
            dueDate: assignmentDueDate || null,
        };

        const result = await createExam(assignmentData as any);
        if (result.success) {
            toast({ title: "Başarılı", description: "Ödev başarıyla oluşturuldu." });
            setIsAssignDialogOpen(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full py-20 bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;
    }

    if (!scale) {
        return <div className="text-center p-8 text-slate-400">Ölçek bulunamadı.</div>;
    }
    
     const getScoreColorClass = (score: number | null) => {
        if (score === null) return "bg-slate-600";
        if (score >= 85) return "bg-emerald-600";
        if (score >= 70) return "bg-yellow-600 text-black";
        if (score >= 50) return "bg-orange-600";
        return "bg-red-600";
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                     <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                        <Link href="/teacher/scales">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Ölçekler
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        {type === 'unit' && (
                            <Button variant="outline" size="sm" onClick={() => setIsAssignDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20">
                                <Send className="mr-2 h-4 w-4" /> Ödev Ata
                            </Button>
                        )}
                        
                        {(scale.type === 'checklist' || scale.type === 'points') && type !== 'unit' && (
                            <Button variant="outline" size="sm" onClick={() => setIsColumnEditorOpen(true)} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10">
                                <Settings className="mr-2 h-4 w-4" /> Sütunlar
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                            Değişiklikleri Kaydet
                        </Button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-2xl font-black text-white">{scale.name.split(' (')[0]?.trim() || 'Ölçek Başlığı'}</CardTitle>
                            <CardDescription className="text-slate-400">
                                <span className="font-bold text-sm">{course?.title} - {branch && `${course?.className} - ${branch}`}</span>
                            </CardDescription>
                            <div className="flex items-center gap-4 text-sm text-slate-300 flex-wrap pt-2">
                                <Badge className="bg-purple-600 text-white">{scale.type === 'tally' ? 'Çetele' : scale.type === 'checklist' ? 'Kontrol Listesi' : 'Puanlı Ölçek'}</Badge>
                                {classOverallAverage !== null && (
                                    <span className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-cyan-400"/>
                                        Sınıf Ortalaması: <Badge className={cn("text-white font-bold", getScoreColorClass(classOverallAverage))}>{classOverallAverage}{scale.type === 'checklist' ? '%' : ''}</Badge>
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="bg-indigo-900/20 border border-indigo-500/30 shadow-xl p-4 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <Label className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                                <History className="w-4 h-4"/> Değerlendirmeler
                            </Label>
                            <Button size="icon" variant="ghost" onClick={handleAddSession} className="h-7 w-7 rounded-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white" title="Yeni Ekle">
                                <Plus className="h-4 w-4"/>
                            </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {availableSessions.map(session => (
                                <button
                                    key={session}
                                    onClick={() => setActiveSessionId(session)}
                                    className={cn(
                                        "h-10 w-10 rounded-xl font-black transition-all border shadow-sm",
                                        activeSessionId === session 
                                            ? "bg-indigo-600 border-indigo-400 text-white scale-110 shadow-indigo-500/40" 
                                            : "bg-slate-900 border-white/5 text-slate-500 hover:border-white/20 hover:text-white"
                                    )}
                                >
                                    {session}
                                </button>
                            ))}
                            <button 
                                onClick={handleAddSession}
                                className="h-10 w-10 rounded-xl font-black border-2 border-dashed border-indigo-500/30 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/10 hover:border-indigo-500 transition-all"
                            >
                                <Plus className="h-5 w-5"/>
                            </button>
                        </div>
                        <p className="text-[10px] text-indigo-300/60 mt-3 text-center italic">Düzenlemek istediğiniz numaraya tıklayın.</p>
                    </Card>
                </div>
                
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden rounded-[2rem]">
                    <CardHeader className="bg-slate-800/40 border-b border-white/5 py-3 px-6 flex flex-row items-center justify-between">
                         <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-indigo-400">{activeSessionId}. Değerlendirme Oturumu</span>
                         </div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Puanlar otomatik kaydedilmez, "Kaydet"e basın.</div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* 
                          GÜNCELLEME: Tabloya dondurulmuş (sticky) hücreler eklendi.
                          1. Dış div'e max yükseklik ve overflow-auto eklendi.
                          2. Header sticky top yapıldı.
                          3. İlk sütun (Öğrenci) sticky left yapıldı.
                        */}
                        <div className="border rounded-md overflow-auto max-h-[70vh] custom-scrollbar">
                            {students.length > 0 ? (
                               <Table className="min-w-[1000px] border-separate border-spacing-0">
                                    <TableHeader className="sticky top-0 z-30 bg-slate-800 shadow-md">
                                        <TableRow className="border-white/5 hover:bg-transparent">
                                            <TableHead className="min-w-48 sticky left-0 top-0 bg-slate-800 z-40 text-slate-300 font-bold text-base border-r border-white/10">Öğrenci</TableHead>
                                            
                                            {(scale.type === 'checklist' || scale.type === 'points') && (
                                                (scale.columns || []).map(col => (
                                                    <TableHead key={col.id} className="w-32 text-center text-slate-400 font-medium border-x border-white/5 bg-slate-800">
                                                        <span className="inline-block whitespace-nowrap text-xs font-bold uppercase tracking-wider">{col.name}</span>
                                                    </TableHead>
                                                ))
                                            )}
                                            
                                            {scale.type === 'tally' && (
                                                <>
                                                    <TableHead className="w-40 text-center text-emerald-400 bg-slate-800">ART+ (Başarı)</TableHead>
                                                    <TableHead className="w-40 text-center text-red-400 bg-slate-800">EKSİ- (Gelişim)</TableHead>
                                                </>
                                            )}

                                            <TableHead className="w-32 text-center text-emerald-400 font-black border-l border-white/10 bg-slate-800">
                                                {scale.type === 'points' ? 'OTURUM TOPLAMI' : 'OTURUM BAŞARISI'}
                                            </TableHead>
                                            <TableHead className="w-32 text-center text-indigo-400 font-black border-l border-white/10 bg-slate-800">GENEL NOT</TableHead>
                                            <TableHead className="min-w-64 border-l border-white/5 text-slate-300 bg-slate-800">Notlar</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    
                                    <TableBody>
                                        {students.map(student => {
                                            const studentEntry = entries[student.uid] || { history: {}, note: '' };
                                            const sessionData = getStudentDataAtSession(student.uid) || {};
                                            const studentAvg = calculateStudentAverage(student.uid);
                                            
                                            // Aktif oturum toplamı (Puanlı ölçek için)
                                            const currentSessionTotal = scale.type === 'points' 
                                                ? Object.values(sessionData.values || {}).reduce((a, b) => a + (b || 0), 0)
                                                : null;

                                            return (
                                                <TableRow key={student.uid} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                    
                                                    <TableCell className="sticky left-0 bg-slate-900 z-10 border-r border-white/10 group-hover:bg-slate-800 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar user={student} className="h-9 w-9 border-2 border-slate-700 group-hover:border-purple-400" />
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-white truncate">{student.displayName}</span>
                                                                <span className="text-[10px] text-slate-500 font-mono">{student.class}</span>
                                                                {studentAvg !== null && <span className="text-[9px] font-black text-indigo-400 uppercase">Not: {studentAvg}</span>}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    
                                                    {scale.type === 'checklist' && (
                                                        (scale.columns || []).map(col => (
                                                            <TableCell key={col.id} className="text-center bg-transparent border-r border-white/5">
                                                                <StatusButton
                                                                    status={sessionData.statuses?.[col.id] || null}
                                                                    onClick={() => handleChecklistChange(student.uid, col.id)}
                                                                />
                                                            </TableCell>
                                                        ))
                                                    )}

                                                    {scale.type === 'points' && (
                                                         (scale.columns || []).map(col => (
                                                            <TableCell key={col.id} className="text-center bg-transparent border-r border-white/5">
                                                                <Input 
                                                                    type="number"
                                                                    min="0"
                                                                    value={sessionData.values?.[col.id] ?? ""}
                                                                    onChange={(e) => handlePointsChange(student.uid, col.id, parseInt(e.target.value) || 0)}
                                                                    className="w-20 mx-auto bg-slate-800 border-white/10 text-center font-bold text-lg h-10 focus:ring-cyan-500/50 focus:border-cyan-500"
                                                                    placeholder="-"
                                                                />
                                                            </TableCell>
                                                        ))
                                                    )}

                                                    {scale.type === 'tally' && (
                                                        <>
                                                            <TableCell className="text-center bg-transparent border-x border-white/5">
                                                                <div className="flex items-center justify-center gap-2 bg-emerald-900/30 p-1 rounded-lg">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400" onClick={() => handleTallyChange(student.uid, 'plus', Math.max(0, (sessionData.plus || 0) - 1))}><Minus className="h-4 w-4"/></Button>
                                                                    <span className="font-bold text-lg text-white">{sessionData.plus || 0}</span>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400" onClick={() => handleTallyChange(student.uid, 'plus', (sessionData.plus || 0) + 1)}><Plus className="h-4 w-4"/></Button>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center bg-transparent border-r border-white/5">
                                                                <div className="flex items-center justify-center gap-2 bg-red-900/30 p-1 rounded-lg">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => handleTallyChange(student.uid, 'minus', Math.max(0, (sessionData.minus || 0) - 1))}><Minus className="h-4 w-4"/></Button>
                                                                    <span className="font-bold text-lg text-white">{sessionData.minus || 0}</span>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => handleTallyChange(student.uid, 'minus', (sessionData.minus || 0) + 1)}><Plus className="h-4 w-4"/></Button>
                                                                </div>
                                                            </TableCell>
                                                        </>
                                                    )}
                                                    
                                                    {/* OTURUM TOPLAMI SÜTUNU */}
                                                    <TableCell className="text-center bg-slate-950/30 border-l border-white/10 font-bold">
                                                        {scale.type === 'points' ? (
                                                            <span className="text-2xl font-black text-cyan-400 drop-shadow-sm">{currentSessionTotal}</span>
                                                        ) : (
                                                            <span className="text-slate-500">-</span>
                                                        )}
                                                    </TableCell>
                                                    
                                                    {/* GENEL NOT (ORTALAMA) SÜTUNU */}
                                                    <TableCell className="text-center bg-slate-900/50 border-l border-white/10 group-hover:bg-slate-800/80 transition-colors">
                                                        <div className="flex flex-col items-center">
                                                            <span className={cn("text-2xl font-black transition-colors", studentAvg !== null ? "text-indigo-400" : "text-slate-700")}>
                                                                {studentAvg !== null ? studentAvg : "-"}
                                                            </span>
                                                            {studentAvg !== null && scale.type === 'checklist' && (
                                                                <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                                                    <div className={cn("h-full transition-all", getScoreColorClass(studentAvg))} style={{ width: `${studentAvg}%` }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    
                                                    <TableCell className="min-w-64 border-l border-white/5">
                                                        <Input 
                                                            type="text" 
                                                            placeholder="Gözlem..." 
                                                            value={studentEntry.note || ''} 
                                                            onChange={e => handleNoteChange(student.uid, e.target.value)} 
                                                            className="bg-slate-900 border-white/10 text-white h-9 text-sm"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-center h-24 text-slate-500 flex items-center justify-center font-medium">Öğrenci bulunamadı.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <ColumnEditorDialog
                isOpen={isColumnEditorOpen}
                onOpenChange={setIsColumnEditorOpen}
                columns={scale.columns || []}
                scaleType={scale.type}
                onSave={handleSaveColumns}
                isSaving={isSaving}
            />

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-indigo-400">Ödev Olarak Ata</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            "{unit?.title}" ünitesindeki konuları öğrencilere atayın.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="assignment-title" className="text-slate-300">Ödev Başlığı</Label>
                            <Input id="assignment-title" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} placeholder={`${unit?.title} Ödevi`} className="bg-slate-950 border-white/10 text-white"/>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Öğrenciler ({selectedStudentUids.size})</Label>
                                <ScrollArea className="h-48 border border-white/10 rounded-md bg-slate-950/50 p-2">
                                    <div className="flex items-center space-x-2 p-1 border-b border-white/10 bg-slate-900/50">
                                        <Checkbox 
                                            id="assign-all-students"
                                            checked={selectedStudentUids.size === students.length && students.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedStudentUids(new Set(students.map(s => s.uid)))
                                                else setSelectedStudentUids(new Set())
                                            }}
                                            className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                        />
                                        <label htmlFor="assign-all-students" className="text-sm font-bold text-white">Tümünü Seç</label>
                                    </div>
                                    <div className="space-y-1 pt-1">
                                        {students.map(student => (
                                            <div key={student.uid} className="flex items-center space-x-2 p-1 hover:bg-white/5 rounded">
                                                <Checkbox id={`assign-student-${student.uid}`} checked={selectedStudentUids.has(student.uid)} onCheckedChange={() => setSelectedStudentUids(prev => { const newSet = new Set(prev); if (newSet.has(student.uid)) newSet.delete(student.uid); else newSet.add(student.uid); return newSet; })} className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"/>
                                                <label htmlFor={`assign-student-${student.uid}`} className="text-sm text-slate-300">{student.displayName}</label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Son Teslim Tarihi</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 bg-slate-950 border-white/10 text-white hover:bg-slate-900", !assignmentDueDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4 text-rose-400" />
                                            {assignmentDueDate ? format(assignmentDueDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-white"><Calendar mode="single" selected={assignmentDueDate} onSelect={setAssignmentDueDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter className="border-t border-white/10 pt-4">
                        <DialogClose asChild><Button variant="ghost" className="text-slate-400 hover:bg-white/5">İptal</Button></DialogClose>
                        <Button onClick={handleCreateAssignment} disabled={isSaving || selectedStudentUids.size === 0} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Ödevi Ata
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
