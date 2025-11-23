
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getUnitScaleDetails, saveScaleEntries, getScaleDetails, updateScaleColumns } from './actions';
import { createExam } from '@/app/teacher/exams/actions';
import type { Course, Unit, UserProfile, ScaleEntry, EvaluationScale, EvaluationScaleColumn, Topic } from "@/lib/types";
import { Loader2, ArrowLeft, Plus, Minus, Save, TrendingUp, Check, X, ChevronsUpDown, ClipboardList, Settings, PlusCircle, Trash2, CalendarIcon, Send } from 'lucide-react';
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
        '+': { icon: Check, color: 'bg-green-500 hover:bg-green-600' },
        '-': { icon: X, color: 'bg-red-500 hover:bg-red-600' },
        'o': { icon: ClipboardList, color: 'bg-yellow-500 hover:bg-yellow-600' },
    };

    if (!status) {
        return (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClick}>
                <ChevronsUpDown className="h-5 w-5 text-muted-foreground" />
            </Button>
        );
    }
    
    const Icon = statusMap[status].icon;
    
    return (
        <Button size="icon" variant="default" className={cn("h-8 w-8 text-white", statusMap[status].color)} onClick={onClick}>
            <Icon className="h-5 w-5" />
        </Button>
    )
}

function ColumnEditorDialog({
    isOpen,
    onOpenChange,
    columns,
    onSave,
}: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    columns: EvaluationScaleColumn[];
    onSave: (newColumns: EvaluationScaleColumn[]) => void;
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sütunları Düzenle</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    {localColumns.map(col => (
                        <div key={col.id} className="flex items-center gap-2">
                            <Input value={col.name} onChange={(e) => handleColumnNameChange(col.id, e.target.value)} />
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveColumn(col.id)}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddColumn}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Sütun Ekle
                    </Button>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">İptal</Button></DialogClose>
                    <Button onClick={() => onSave(localColumns)}>Kaydet</Button>
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
        if (!scaleOrUnitId) return;
        setIsLoading(true);

        const result = type === 'unit' && courseId 
            ? await getUnitScaleDetails(courseId, scaleOrUnitId, branch) 
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
    }, [scaleOrUnitId, courseId, type, branch, toast]);

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
    
    const calculateChecklistScore = useCallback((entry: ScaleEntry): number | null => {
        if (!entry?.statuses) return null;
        const statuses = Object.values(entry.statuses);
        const pluses = statuses.filter(s => s === '+').length;
        const minuses = statuses.filter(s => s === '-').length;
        const total = pluses + minuses;
        if (total === 0) return null;
        return Math.round((pluses / total) * 100);
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
        return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!scale) {
        return <div className="text-center p-8">Ölçek bulunamadı.</div>;
    }
    
     const getScoreColorClass = (score: number | null) => {
        if (score === null) return "bg-gray-400";
        if (score >= 85) return "bg-green-600";
        if (score >= 70) return "bg-yellow-500 text-black";
        if (score >= 50) return "bg-orange-500";
        return "bg-red-600";
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
                 <Button asChild variant="outline" size="sm">
                    <Link href="/teacher/scales">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tüm Ölçekler
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    {type === 'unit' && (
                        <Button variant="outline" size="sm" onClick={() => setIsAssignDialogOpen(true)}>
                            <Send className="mr-2 h-4 w-4" /> Ödev Olarak Ata
                        </Button>
                    )}
                    {scale.type === 'checklist' && type !== 'unit' && (
                        <Button variant="outline" size="sm" onClick={() => setIsColumnEditorOpen(true)}>
                            <Settings className="mr-2 h-4 w-4" /> Sütunları Düzenle
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        Değerlendirmeyi Kaydet
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{scale.name}</CardTitle>
                    <CardDescription>{course?.title} - {branch && `${course?.className} - ${branch}`}</CardDescription>
                     <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {scale.type === 'checklist' && overallScore !== null && (
                            <span className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-500"/>
                                Sınıf Başarı Ortalaması:
                                <Badge className={cn("text-white", getScoreColorClass(overallScore))}>
                                    {overallScore} / 100
                                </Badge>
                            </span>
                        )}
                         {scale.type === 'tally' && (
                             <>
                                <span>Toplam Artı: <span className="font-bold text-green-600">{Object.values(entries).reduce((s, e) => s + (e.plus || 0), 0)}</span></span>
                                <span>Toplam Eksi: <span className="font-bold text-red-600">{Object.values(entries).reduce((s, e) => s + (e.minus || 0), 0)}</span></span>
                             </>
                         )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md overflow-x-auto">
                        {students.length > 0 ? (
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-40 sticky left-0 bg-card z-10">Öğrenci</TableHead>
                                        {scale.type === 'tally' && (
                                            <>
                                                <TableHead className="w-40 text-center">Artı (+)</TableHead>
                                                <TableHead className="w-40 text-center">Eksi (-)</TableHead>
                                            </>
                                        )}
                                         {scale.type === 'checklist' && (
                                            (scale.columns || []).map(col => (
                                                <TableHead key={col.id} className="w-28 text-center">{col.name}</TableHead>
                                            ))
                                         )}
                                        <TableHead className="min-w-40">Not</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map(student => {
                                        const studentEntry = entries[student.uid] || { plus: 0, minus: 0, statuses: {}, note: '' };
                                        const studentScore = scale.type === 'checklist' ? calculateChecklistScore(studentEntry) : null;
                                        return (
                                            <TableRow key={student.uid}>
                                                <TableCell className="sticky left-0 bg-card z-10">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar user={student} className="h-9 w-9" />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{student.displayName}</span>
                                                             {studentScore !== null && (
                                                                <Badge className={cn("w-fit text-white", getScoreColorClass(studentScore))}>
                                                                    {studentScore} / 100
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                 {scale.type === 'tally' && (
                                                    <>
                                                        <TableCell>
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleTallyChange(student.uid, 'plus', Math.max(0, (studentEntry.plus || 0) - 1))}><Minus className="h-4 w-4"/></Button>
                                                                <Input type="number" className="w-14 h-8 text-center" value={studentEntry.plus || 0} onChange={e => handleTallyChange(student.uid, 'plus', parseInt(e.target.value) || 0)} />
                                                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleTallyChange(student.uid, 'plus', (studentEntry.plus || 0) + 1)}><Plus className="h-4 w-4"/></Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleTallyChange(student.uid, 'minus', Math.max(0, (studentEntry.minus || 0) - 1))}><Minus className="h-4 w-4"/></Button>
                                                                <Input type="number" className="w-14 h-8 text-center" value={studentEntry.minus || 0} onChange={e => handleTallyChange(student.uid, 'minus', parseInt(e.target.value) || 0)} />
                                                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleTallyChange(student.uid, 'minus', (studentEntry.minus || 0) + 1)}><Plus className="h-4 w-4"/></Button>
                                                            </div>
                                                        </TableCell>
                                                    </>
                                                 )}
                                                 {scale.type === 'checklist' && (
                                                    (scale.columns || []).map(col => (
                                                        <TableCell key={col.id} className="text-center">
                                                            <StatusButton
                                                                status={studentEntry.statuses?.[col.id] || null}
                                                                onClick={() => handleChecklistChange(student.uid, col.id)}
                                                            />
                                                        </TableCell>
                                                    ))
                                                 )}
                                                <TableCell>
                                                    <Input type="text" placeholder="Not ekle..." value={studentEntry.note || ''} onChange={e => handleNoteChange(student.uid, e.target.value)} />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-center h-24 text-muted-foreground flex items-center justify-center">Bu şubede öğrenci bulunamadı.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <ColumnEditorDialog
                isOpen={isColumnEditorOpen}
                onOpenChange={setIsColumnEditorOpen}
                columns={scale.columns || []}
                onSave={handleSaveColumns}
            />

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Ödev Olarak Ata</DialogTitle>
                        <DialogDescription>
                            "{unit?.title}" ünitesindeki tüm konuları seçili öğrencilere ödev olarak atayın.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="py-4 space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="assignment-title">Ödev Başlığı</Label>
                            <Input id="assignment-title" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} placeholder={`${unit?.title} Tekrar Ödevi`} />
                         </div>
                         <div className="space-y-2">
                            <Label>Öğrenciler ({selectedStudentUids.size} seçildi)</Label>
                            <ScrollArea className="h-48 border rounded-md p-2">
                                <div className="flex items-center space-x-2 p-1 border-b">
                                    <Checkbox 
                                        id="select-all-students"
                                        checked={selectedStudentUids.size === students.length && students.length > 0}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedStudentUids(new Set(students.map(s => s.uid)))
                                            } else {
                                                setSelectedStudentUids(new Set())
                                            }
                                        }}
                                    />
                                    <label htmlFor="select-all-students" className="font-semibold">Tümünü Seç</label>
                                </div>
                                {students.map(student => (
                                    <div key={student.uid} className="flex items-center space-x-2 p-1">
                                        <Checkbox 
                                            id={`student-${student.uid}`} 
                                            checked={selectedStudentUids.has(student.uid)} 
                                            onCheckedChange={() => {
                                                setSelectedStudentUids(prev => {
                                                    const newSet = new Set(prev);
                                                    if (newSet.has(student.uid)) newSet.delete(student.uid);
                                                    else newSet.add(student.uid);
                                                    return newSet;
                                                })
                                            }}
                                        />
                                        <label htmlFor={`student-${student.uid}`}>{student.displayName}</label>
                                    </div>
                                ))}
                            </ScrollArea>
                         </div>
                         <div className="space-y-2">
                            <Label>Son Teslim Tarihi (İsteğe Bağlı)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !assignmentDueDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {assignmentDueDate ? format(assignmentDueDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={assignmentDueDate} onSelect={setAssignmentDueDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                     </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">İptal</Button></DialogClose>
                        <Button onClick={handleCreateAssignment} disabled={isSaving || selectedStudentUids.size === 0}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Ödevi Ata
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
