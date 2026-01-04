
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getUnitScaleDetails, saveScaleEntries, getScaleDetails, updateScaleColumns } from './actions';
import { createExam } from '@/app/teacher/exams/actions';
import type { Course, Unit, UserProfile, ScaleEntry, EvaluationScale, EvaluationScaleColumn, Topic } from "@/lib/types";
import { Loader2, ArrowLeft, Plus, Minus, Save, TrendingUp, Check, X, ChevronsUpDown, ClipboardList, Settings, PlusCircle, Trash2, Calendar as CalendarIcon, Send, Clock } from 'lucide-react';
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
import { format } from 'date-fns';
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

// SÜTUN DÜZENLEYİCİ DİYALOG (isSaving prop'u eklendi)
function ColumnEditorDialog({
    isOpen,
    onOpenChange,
    columns,
    onSave,
    isSaving
}: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    columns: EvaluationScaleColumn[];
    onSave: (newColumns: EvaluationScaleColumn[]) => void;
    isSaving: boolean; // <-- EKLENDİ
}) {
    const [localColumns, setLocalColumns] = useState(columns);

    useEffect(() => {
        setLocalColumns(columns);
    }, [columns, isOpen]);
    
    const handleColumnNameChange = (id: string, newName: string) => {
        setLocalColumns(prev => prev.map(col => col.id === id ? { ...col, name: newName } : col));
    }
    const handleAddColumn = () => {
        setLocalColumns(prev => [...prev, { id: `col_${Date.now()}`, name: "Yeni Görev", type: 'status' }]);
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
    const type = searchParams.get('type'); // 'unit' or 'manual'
    const branch = searchParams.get('branch'); // branch name like 'A'
    
    const [scale, setScale] = useState<EvaluationScale | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [unit, setUnit] = useState<Unit | null>(null);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [entries, setEntries] = useState<{ [studentId: string]: ScaleEntry }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);
    const { toast } = useToast();
    
    // State for Assignment Dialog
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [assignmentTitle, setAssignmentTitle] = useState("");
    const [assignmentDueDate, setAssignmentDueDate] = useState<Date | undefined>();
    const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        if (!scaleOrUnitId || !user) return;
        setIsLoading(true);

        const result = type === 'unit' && courseId 
            ? await getUnitScaleDetails(courseId, scaleOrUnitId, branch, user.schoolName || null, user.role || null) 
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
                 // Create a scale-like object from unit data
                 setScale({
                    id: unitData.id,
                    name: unitData.title,
                    type: 'checklist',
                    columns: (unitData.topics || []).map(t => ({ id: t.id, name: t.title, type: 'status' })),
                    classId: result.data.course.classId || '',
                    courseId: result.data.course.id,
                    teacherId: '', // not strictly needed
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

    const handleTallyChange = (studentId: string, field: 'plus' | 'minus', value: number) => {
        setEntries(prev => {
            const studentEntry = prev[studentId] || { plus: 0, minus: 0, note: '' };
            return {
                ...prev,
                [studentId]: {
                    ...studentEntry,
                    [field]: Math.max(0, value)
                }
            };
        });
    };

    const handleChecklistChange = (studentId: string, columnId: string) => {
        const statuses: (('+' | '-' | 'o') | null)[] = ['+', '-', 'o', null];
        setEntries(prev => {
            const studentEntry = prev[studentId] || { statuses: {}, note: '' };
            const currentStatus = studentEntry.statuses?.[columnId] || null;
            const currentIndex = currentStatus ? statuses.indexOf(currentStatus) : -1;
            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
            
            const newStatuses = { ...(studentEntry.statuses || {}), [columnId]: nextStatus };
            return { ...prev, [studentId]: { ...studentEntry, statuses: newStatuses } };
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
            toast({ title: "Kaydedildi", description: "Değerlendirmeler başarıyla kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
        }
        setIsSaving(false);
    };

    const handleSaveColumns = async (newColumns: EvaluationScaleColumn[]) => {
        if (!scale) return;
        setIsSaving(true); // <-- isSaving durumu burada ayarlanıyor
        const result = await updateScaleColumns(scale.id, newColumns);
        if (result.success) {
            toast({ title: "Sütunlar Güncellendi" });
            setScale(prev => prev ? { ...prev, columns: newColumns } : null);
            setIsColumnEditorOpen(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false); // <-- isSaving durumu burada kapatılıyor
    }
    
    const calculateChecklistScore = useCallback((entry: ScaleEntry): number | null => {
        if (!entry?.statuses) return null;
        const statuses = Object.values(entry.statuses);
        const pluses = statuses.filter(s => s === '+').length;
        const totalGraded = pluses + statuses.filter(s => s === '-').length;
        if (totalGraded === 0) return null;
        return Math.round((pluses / totalGraded) * 100);
    }, []);

    const overallScore = useMemo(() => {
        if (!scale || scale.type !== 'checklist') return null;

        const studentScores = Object.values(entries)
            .map(calculateChecklistScore)
            .filter((score): score is number => score !== null);
        
        if (studentScores.length === 0) return null;

        const totalScore = studentScores.reduce((sum, score) => sum + score, 0);
        return Math.round(totalScore / studentScores.length);
    }, [entries, calculateChecklistScore, scale]);

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

        const result = await createExam(assignmentData);
        if (result.success) {
            toast({ title: "Başarılı", description: "Ödev başarıyla oluşturuldu." });
            setIsAssignDialogOpen(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full py-20 bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
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
             {/* Arka Plan */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                {/* Aksiyon Barı */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                     <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/10">
                        <Link href="/teacher/scales">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tüm Ölçekler
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        {type === 'unit' && (
                            <Button variant="outline" size="sm" onClick={() => setIsAssignDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20">
                                <Send className="mr-2 h-4 w-4" /> Ödev Olarak Ata
                            </Button>
                        )}
                        {scale.type === 'checklist' && type !== 'unit' && (
                            <Button variant="outline" size="sm" onClick={() => setIsColumnEditorOpen(true)} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10">
                                <Settings className="mr-2 h-4 w-4" /> Sütunları Düzenle
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                            Değerlendirmeyi Kaydet
                        </Button>
                    </div>
                </div>
                
                {/* Ana İçerik Kartı */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-2xl font-black text-white">{scale.name.split('(')[0]?.trim() || 'Ölçek Başlığı'}</CardTitle>
                        <CardDescription className="text-slate-400">
                            <span className="font-bold text-sm">{course?.title} - {branch && `${course?.className} - ${branch}`}</span>
                        </CardDescription>
                         <div className="flex items-center gap-4 text-sm text-slate-300 flex-wrap pt-2">
                             <Badge className="bg-purple-600 text-white shadow-md">Tip: {scale.type === 'tally' ? 'Çetele' : 'Kontrol Listesi'}</Badge>
                             {scale.type === 'checklist' && overallScore !== null && (
                                 <span className="flex items-center gap-2">
                                     <TrendingUp className="h-4 w-4 text-cyan-400"/>
                                     Sınıf Ortalaması:
                                     <Badge className={cn("text-white font-bold", getScoreColorClass(overallScore))}>
                                         {overallScore}%
                                     </Badge>
                                 </span>
                             )}
                              {scale.type === 'tally' && (
                                  <>
                                      <span className="text-emerald-400">Toplam Artı: <span className="font-bold">{Object.values(entries).reduce((s, e) => s + (e.plus || 0), 0)}</span></span>
                                      <span className="text-red-400">Toplam Eksi: <span className="font-bold">{Object.values(entries).reduce((s, e) => s + (e.minus || 0), 0)}</span></span>
                                  </>
                              )}
                         </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                        <div className="border rounded-md overflow-x-auto">
                            {students.length > 0 ? (
                               <Table className="min-w-[1000px] border-collapse">
                                    <TableHeader className="bg-slate-800/80">
                                        <TableRow className="border-white/5 hover:bg-transparent">
                                            <TableHead className="min-w-48 sticky left-0 bg-slate-800/90 z-20 text-slate-300 font-bold text-base border-r border-white/5">Öğrenci / Başarı</TableHead>
                                            {scale.type === 'tally' && (
                                                <>
                                                    <TableHead className="w-40 text-center text-emerald-400">ART+ (Başarı)</TableHead>
                                                    <TableHead className="w-40 text-center text-red-400">EKSİ- (Gelişim)</TableHead>
                                                </>
                                            )}
                                            {scale.type === 'checklist' && (
                                                (scale.columns || []).map(col => (
                                                    <TableHead key={col.id} className="w-32 text-center text-slate-400 font-medium border-x border-white/5 rotate-0">
                                                        <span className="inline-block whitespace-nowrap text-xs font-bold uppercase tracking-wider">{col.name}</span>
                                                    </TableHead>
                                                ))
                                            )}
                                            <TableHead className="min-w-64 border-l border-white/5 text-slate-300">Notlar</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    
                                    <TableBody>
                                        {students.map(student => {
                                            const studentEntry = entries[student.uid] || { plus: 0, minus: 0, statuses: {}, note: '' };
                                            const studentScore = scale.type === 'checklist' ? calculateChecklistScore(studentEntry) : null;
                                            
                                            return (
                                                <TableRow key={student.uid} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                    
                                                    {/* Öğrenci Adı ve Başarı */}
                                                    <TableCell className="sticky left-0 bg-slate-900/90 z-10 border-r border-white/5 group-hover:bg-slate-800/90 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar user={student} className="h-9 w-9 border-2 border-slate-700 group-hover:border-purple-400" />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-white">{student.displayName}</span>
                                                                {studentScore !== null && (
                                                                    <Badge className={cn("w-fit text-white mt-1 text-xs font-bold", getScoreColorClass(studentScore))}>
                                                                        {studentScore}%
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    
                                                    {/* Çetele Girişi */}
                                                    {scale.type === 'tally' && (
                                                        <>
                                                            <TableCell className="text-center bg-transparent border-x border-white/5">
                                                                <div className="flex items-center justify-center gap-2 bg-emerald-900/30 p-1 rounded-lg">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/20" onClick={() => handleTallyChange(student.uid, 'plus', Math.max(0, (studentEntry.plus || 0) - 1))}><Minus className="h-4 w-4"/></Button>
                                                                    <span className="font-bold text-lg text-white">{studentEntry.plus || 0}</span>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/20" onClick={() => handleTallyChange(student.uid, 'plus', (studentEntry.plus || 0) + 1)}><Plus className="h-4 w-4"/></Button>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center bg-transparent border-r border-white/5">
                                                                <div className="flex items-center justify-center gap-2 bg-red-900/30 p-1 rounded-lg">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/20" onClick={() => handleTallyChange(student.uid, 'minus', Math.max(0, (studentEntry.minus || 0) - 1))}><Minus className="h-4 w-4"/></Button>
                                                                    <span className="font-bold text-lg text-white">{studentEntry.minus || 0}</span>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/20" onClick={() => handleTallyChange(student.uid, 'minus', (studentEntry.minus || 0) + 1)}><Plus className="h-4 w-4"/></Button>
                                                                </div>
                                                            </TableCell>
                                                        </>
                                                    )}
                                                    
                                                    {/* Kontrol Listesi Girişi */}
                                                    {scale.type === 'checklist' && (
                                                        (scale.columns || []).map(col => (
                                                            <TableCell key={col.id} className="text-center bg-transparent border-r border-white/5">
                                                                <StatusButton
                                                                    status={studentEntry.statuses?.[col.id] || null}
                                                                    onClick={() => handleChecklistChange(student.uid, col.id)}
                                                                />
                                                            </TableCell>
                                                        ))
                                                    )}
                                                    
                                                    {/* Not Alanı */}
                                                    <TableCell className="min-w-64">
                                                        <Input 
                                                            type="text" 
                                                            placeholder="Gözlem/Not ekle..." 
                                                            value={studentEntry.note || ''} 
                                                            onChange={e => handleNoteChange(student.uid, e.target.value)} 
                                                            className="bg-slate-900 border-white/10 text-white h-9 text-sm focus:border-purple-500/50"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-center h-24 text-slate-500 flex items-center justify-center">Bu şubede öğrenci bulunamadı.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Sütun Düzenleyici Modal */}
            <ColumnEditorDialog
                isOpen={isColumnEditorOpen}
                onOpenChange={setIsColumnEditorOpen}
                columns={scale.columns || []}
                onSave={handleSaveColumns}
                isSaving={isSaving} // isSaving prop'u aktarıldı
            />

            {/* Ödev Ata Dialogu (Sadece Ünite Bazlı Ölçekler için) */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-indigo-400">Ödev Olarak Ata</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            "{unit?.title}" ünitesindeki tüm konuları seçili öğrencilere ödev olarak atayın.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="assignment-title" className="text-slate-300">Ödev Başlığı</Label>
                            <Input id="assignment-title" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} placeholder={`${unit?.title} Tekrar Ödevi`} className="bg-slate-950 border-white/10 text-white"/>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Öğrenciler ({selectedStudentUids.size} seçildi)</Label>
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
