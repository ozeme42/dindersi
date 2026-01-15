'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAssignmentDetails } from "./actions";
import type { AssignmentDetails, UserProfile, ScoreEvent } from "@/lib/types";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    ArrowLeft,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Users,
    Calendar as CalendarIcon,
    FileQuestion,
    Trophy,
    Medal,
    Zap,
    Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { UserAvatar } from "@/components/user-avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, isFuture } from "date-fns";
import { tr } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function ErrorWithLink({ message }: { message: string }) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.split(urlRegex);

    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Hata!</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">
                {parts.map((part, index) => 
                    urlRegex.test(part) ? 
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold break-all">{part}</a> : 
                    <span key={index}>{part}</span>
                )}
            </AlertDescription>
        </Alert>
    );
}

function AssignmentDetailPage() {
    const params = useParams();
    const assignmentId = params.assignmentId as string;
    const router = useRouter();
    const { toast } = useToast();

    const [details, setDetails] = useState<AssignmentDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!assignmentId) {
            setError("Ödev ID'si bulunamadı.");
            setIsLoading(false);
            return;
        }

        const fetchDetails = async () => {
            setIsLoading(true);
            const result = await getAssignmentDetails(assignmentId);
            if (result.error) {
                setError(result.error);
                toast({ title: "Hata", description: result.error, variant: "destructive" });
            } else {
                setDetails(result.data as AssignmentDetails);
            }
            setIsLoading(false);
        };

        fetchDetails();
    }, [assignmentId, toast]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error || !details) {
        return (
            <div className="min-h-screen bg-slate-950 p-4 sm:p-6 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <ErrorWithLink message={error || "Ödev detayları yüklenemedi."} />
                </div>
            </div>
        );
    }

    const { assignment, studentProgress } = details;
    const totalQuestions = assignment.questionIds?.length || 0;
    const sortedThresholds = [...(assignment.rewardThresholds || [])].sort((a, b) => a.rate - b.rate);

    const getCorrectAnswers = (scoreEvent: ScoreEvent | null) => {
        if (!scoreEvent || !scoreEvent.points || totalQuestions === 0) return 0;
        return Math.round(scoreEvent.points / 10);
    };
    
    const sortedProgress = [...studentProgress].sort((a, b) => {
        const scoreA = a.scoreEvent?.points ?? -1;
        const scoreB = b.scoreEvent?.points ?? -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (a.student.displayName || '').localeCompare(b.student.displayName || '', 'tr');
    });

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                        <Link href="/teacher/exams">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Denemeler
                        </Link>
                    </Button>
                    <div className="text-right">
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">İlerleme Raporu</h1>
                        <p className="text-indigo-400 text-xs font-bold">Öğrenci Başarı Analizi</p>
                    </div>
                </div>

                {/* ÜST BİLGİ VE ÖDÜL KARTI */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                                    <FileQuestion className="h-8 w-8 text-indigo-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black text-white">{assignment.title}</CardTitle>
                                    <CardDescription className="text-slate-400 font-medium">
                                        {assignment.className} • {assignment.courseName} • {totalQuestions} Soru
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
                             <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Katılım Oranı</p>
                                <p className="text-xl font-black text-white">%{Math.round((studentProgress.filter(p => p.scoreEvent).length / assignment.assignedTo.length) * 100) || 0}</p>
                             </div>
                             <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Ort. Skor</p>
                                <p className="text-xl font-black text-cyan-400">
                                    {Math.round(studentProgress.reduce((acc, curr) => acc + (curr.scoreEvent?.points || 0), 0) / (studentProgress.filter(p => p.scoreEvent).length || 1))}
                                </p>
                             </div>
                             <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">En Yüksek</p>
                                <p className="text-xl font-black text-emerald-400">{Math.max(...studentProgress.map(p => p.scoreEvent?.points || 0), 0)}</p>
                             </div>
                             <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Toplam Atanan</p>
                                <p className="text-xl font-black text-indigo-400">{assignment.assignedTo.length}</p>
                             </div>
                        </CardContent>
                    </Card>

                    {/* ÖDÜL BAREMLERİ KARTI */}
                    <Card className="bg-slate-900/60 backdrop-blur-xl border border-amber-500/20 shadow-2xl overflow-hidden">
                        <div className="bg-amber-500/10 p-4 border-b border-amber-500/20 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-black text-amber-200 uppercase tracking-widest">Aktif Ödül Sistemi</span>
                        </div>
                        <CardContent className="p-4">
                            {sortedThresholds.length > 0 ? (
                                <div className="space-y-3">
                                    {sortedThresholds.map((t, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">%{t.rate}</Badge>
                                                <span className="text-xs font-bold text-slate-300">Başarı Üstü</span>
                                            </div>
                                            <span className="text-sm font-black text-emerald-400">+{t.points} XP</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                                    <Award className="h-8 w-8 text-slate-700 mb-2" />
                                    <p className="text-xs text-slate-500 font-medium">Bu deneme için özel bir ödül tanımlanmamış.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* TABLO KARTI */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden rounded-[2rem]">
                    <CardHeader className="bg-slate-800/40 border-b border-white/5">
                        <CardTitle className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                            <Users className="h-5 w-5 text-indigo-400" /> Öğrenci Sıralaması
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-950/50">
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="w-16 text-slate-400 font-bold uppercase text-[10px] text-center">Sıra</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[10px]">Öğrenci</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[10px]">Çözüm Tarihi</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[10px]">Doğruluk</TableHead>
                                        <TableHead className="text-right text-slate-400 font-bold uppercase text-[10px] pr-8">Puan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedProgress.length > 0 ? (
                                        sortedProgress.map(({ student, scoreEvent }, index) => {
                                            const correctAnswers = getCorrectAnswers(scoreEvent);
                                            const successRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
                                            const hasAttempted = !!scoreEvent;
                                            
                                            return (
                                                <TableRow key={student.uid} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                    <TableCell className="text-center">
                                                        {index === 0 ? <Medal className="h-6 w-6 text-yellow-500 mx-auto" /> :
                                                         index === 1 ? <Medal className="h-6 w-6 text-slate-400 mx-auto" /> :
                                                         index === 2 ? <Medal className="h-6 w-6 text-amber-700 mx-auto" /> :
                                                         <span className="font-black text-slate-600">#{index + 1}</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar user={student} className="h-9 w-9 border border-white/10 group-hover:border-indigo-500 transition-colors"/>
                                                            <span className="font-bold text-white text-sm">{student.displayName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-400 text-xs font-medium">
                                                        {hasAttempted ? formatDistanceToNow(new Date(scoreEvent.timestamp), { addSuffix: true, locale: tr }) : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {hasAttempted ? (
                                                            <Badge variant="outline" className={cn(
                                                                    "font-black text-[10px] px-3 py-1 border-2",
                                                                    successRate >= 50 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                )}>
                                                                {correctAnswers}/{totalQuestions} Doğru
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-slate-800/50 text-slate-500 border-white/5 text-[10px]">KATILMADI</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8">
                                                        <span className={cn("text-lg font-black", hasAttempted ? "text-cyan-400" : "text-slate-700")}>
                                                            {scoreEvent?.points || 0}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">Kayıtlı veri bulunamadı.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// KRİTİK: Next.js sayfanın bir default export içermesini bekler.
export default AssignmentDetailPage;