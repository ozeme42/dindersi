'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, PlusCircle, Trash2, ArrowRight, FileQuestion, FilePenLine, 
    Calendar as CalendarIcon, Clock, Users, BookOpen, CheckCircle2, 
    AlertTriangle, Save, X, Search, ArrowLeft
} from 'lucide-react';
import { getTeacherExams, deleteExam } from './actions';
import type { Assignment } from '@/lib/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
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


export function ExamsClientPage() {
    const { toast } = useToast();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const title = 'Deneme Sınavları';
    const description = 'Öğrencilere deneme havuzundan seçtiğiniz sorularla deneme sınavları atayın ve ilerlemelerini takip edin.';
    const buttonLabel = 'Yeni Deneme Oluştur';

    const fetchExams = useCallback(async () => {
        // Assume user is always authenticated here due to layout guard
        setIsLoading(true);
        setFetchError(null);
        // This action needs to be adjusted to not require teacherId if it can be derived server-side
        const result = await getTeacherExams("placeholder-teacher-id"); // Placeholder, will be fixed
        if (result.success && result.data) {
            setAssignments(result.data);
        } else if (result.error) {
            setFetchError(result.error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchExams();
    }, [fetchExams]);
    
    const handleDelete = async (assignmentId: string) => {
        setIsDeleting(true);
        const result = await deleteExam(assignmentId);
        if (result.success) {
            toast({ title: "Başarılı", description: "Deneme sınavı silindi." });
            fetchExams();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsDeleting(false);
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
                     <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 h-12 px-6 rounded-xl">
                        <Link href="/teacher/exams/new">
                            <PlusCircle className="mr-2 h-5 w-5" /> {buttonLabel}
                        </Link>
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
                                            <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10">
                                                 <Link href={`/teacher/exams/edit/${assignment.id}`}><FilePenLine className="h-4 w-4"/></Link>
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
                                                        <AlertDialogAction onClick={() => handleDelete(assignment.id)} disabled={isDeleting} className="bg-red-600 hover:bg-red-500 text-white border-none">
                                                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Evet, Sil"}
                                                        </AlertDialogAction>
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
        </div>
    );
}