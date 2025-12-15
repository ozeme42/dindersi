
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
    FileQuestion, // EKLENDİ
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
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
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
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
                    urlRegex.test(part) ? (
                        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold break-all">
                            {part}
                        </a>
                    ) : (
                        <span key={index}>{part}</span>
                    )
                )}
            </AlertDescription>
        </Alert>
    );
}

function ErrorDisplay({ error }: { error: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-red-950/30 border border-red-500/30 rounded-xl">
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-white">Hata</h2>
            <ErrorWithLink message={error} />
            <Button asChild variant="outline" size="sm" className="mt-6 border-white/10 text-white hover:bg-white/10">
                 <Link href="/teacher/exams">
                     <ArrowLeft className="mr-2 h-4 w-4" />
                     Denemeler Sayfasına Dön
                 </Link>
             </Button>
        </div>
    )
}

export default function AssignmentDetailPage() {
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
                    <ErrorDisplay error={error || "Ödev detayları yüklenemedi."} />
                </div>
            </div>
        );
    }

    const { assignment, studentProgress } = details;
    const totalQuestions = assignment.questionIds?.length || 0;

    const getCorrectAnswers = (scoreEvent: ScoreEvent | null) => {
        if (!scoreEvent || !scoreEvent.points || totalQuestions === 0) return 0;
        // Puanlamanın 10 puan üzerinden olduğunu varsayarak doğru sayısını buluyoruz.
        return Math.round(scoreEvent.points / 10);
    };
    
    const sortedProgress = [...studentProgress].sort((a, b) => {
        const scoreA = a.scoreEvent?.points ?? -1;
        const scoreB = b.scoreEvent?.points ?? -1;

        if (scoreB !== scoreA) {
            return scoreB - scoreA;
        }
        // Skorlar aynıysa isme göre sırala
        return (a.student.displayName || '').localeCompare(b.student.displayName || '', 'tr');
    });


    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
             {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10">
                        <Link href="/teacher/exams">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tüm Denemeler
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">İlerleme Raporu</h1>
                </div>
                
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-3xl font-black text-white flex items-center gap-3">
                             <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                                <FileQuestion className="h-6 w-6 text-indigo-400" />
                            </div>
                            {assignment.title}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                             {assignment.className} ({assignment.courseName}) | {totalQuestions} Soru | Atanan: {assignment.assignedTo.length} öğrenci.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                        <div className="border rounded-md overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-800/80">
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="w-16 text-slate-300 font-bold text-base">Sıra</TableHead>
                                        <TableHead className="text-slate-300 font-bold text-base">Öğrenci</TableHead>
                                        <TableHead className="text-slate-300 font-bold text-base">Son Deneme</TableHead>
                                        <TableHead className="text-slate-300 font-bold text-base">Durum / Doğruluk</TableHead>
                                        <TableHead className="text-right text-slate-300 font-bold text-base">Skor (Puan)</TableHead>
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
                                                    <TableCell className="font-black text-lg text-indigo-400">{index + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar user={student} className="h-10 w-10 border-2 border-slate-700 group-hover:border-purple-400 transition-colors"/>
                                                            <span className="font-medium text-white">{student.displayName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-400 text-sm">
                                                        {hasAttempted ? formatDistanceToNow(new Date(scoreEvent.timestamp), { addSuffix: true, locale: tr }) : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {hasAttempted ? (
                                                            <Badge 
                                                                variant="outline" 
                                                                className={cn(
                                                                    "font-bold text-sm py-1 border-2",
                                                                    successRate >= 50 
                                                                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50' 
                                                                        : 'bg-red-600/20 text-red-300 border-red-500/50'
                                                                )}
                                                            >
                                                                {successRate >= 50 ? <CheckCircle className="mr-2 h-4 w-4"/> : <XCircle className="mr-2 h-4 w-4"/>}
                                                                {correctAnswers}/{totalQuestions} Doğru
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-slate-800 text-slate-400 border-white/10">Başlamadı</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-lg text-emerald-400">
                                                        {scoreEvent?.points || 0}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-slate-500 italic">
                                                Bu denemeyi henüz çözen öğrenci bulunmuyor veya denemeye öğrenci atanmamış.
                                            </TableCell>
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
