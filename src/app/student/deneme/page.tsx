
'use client';

import { Suspense } from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Assignment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Loader2, ArrowLeft, Gamepad2, CheckCircle2, ClipboardCheck, BarChart3, Clock, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { getStudentExams } from './actions';
import { format, formatDistanceToNow, isFuture } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function DenemeSinaviPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await getStudentExams(user.uid);
    if (result.success && result.data) {
      setAssignments(result.data);
    } else {
      setError(result.error || "Denemeler yüklenemedi.");
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchAssignments();
    }
  }, [authLoading, fetchAssignments]);

  const handleStartExam = (assignment: any) => {
    if (!assignment.questionIds || assignment.questionIds.length === 0) {
        setError("Bu deneme için hiç soru atanmamış.");
        return;
    }
    const params = new URLSearchParams({
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        questionIds: assignment.questionIds.join(','),
        duration: assignment.duration || '0'
    });
    router.push(`/student/deneme/coz?${params.toString()}`);
  }

  const backUrl = '/student';

  if (isLoading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

   if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Denemeler Yüklenemedi!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4">
                         <Button asChild variant="secondary">
                            <Link href={backUrl}>Panele Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-center text-center mb-12">
        <ClipboardCheck className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold font-headline">Deneme Sınavlarım</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Öğretmenlerin tarafından sana özel olarak atanmış deneme sınavlarını buradan çözebilirsin.
        </p>
      </div>

       <div className="space-y-4">
            {assignments.length > 0 ? (
                assignments.map(assignment => {
                    const isSolved = !!assignment.solvedEvent;
                    const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
                    
                    return (
                        <Card key={assignment.id} className={cn("overflow-hidden", isSolved && "bg-muted/50")}>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                    <div className="flex-1">
                                        <CardTitle>{assignment.title}</CardTitle>
                                        <CardDescription>{assignment.className} - {assignment.courseName}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {assignment.duration && <Badge variant="outline"><Clock className="mr-1.5 h-3 w-3"/>{assignment.duration} dk</Badge>}
                                        <Badge variant="secondary">{assignment.questionIds?.length || 0} Soru</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardFooter className="bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                {isSolved ? (
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                        <div className="flex items-center gap-1.5 font-medium text-green-600"><CheckCircle2 className="h-4 w-4"/> Çözüldü</div>
                                        <div className="flex items-center gap-1.5"><BarChart3 className="h-4 w-4"/> Puan: <span className="font-bold">{assignment.solvedEvent.points}</span></div>
                                        <Link href={`/teacher/assignments/${assignment.id}`} className="flex items-center gap-1.5 cursor-pointer hover:underline">
                                            <Trophy className="h-4 w-4 text-amber-500"/> Derece: <span className="font-bold">{assignment.rank} / {assignment.totalParticipants}</span>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        {canStart ? (
                                            <>
                                                {assignment.dueDate && <span>Son Teslim: {formatDistanceToNow(new Date(assignment.dueDate), { addSuffix: true, locale: tr })}</span>}
                                            </>
                                        ) : (
                                            <span className="text-blue-600 font-medium">Başlangıç: {format(new Date(assignment.startDate), 'dd MMMM yyyy, HH:mm', { locale: tr })}</span>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    {isSolved && (
                                        <Button asChild variant="secondary" size="sm">
                                            <Link href={`/student/deneme/sonuc/${assignment.id}`}>Sonuçları Gör</Link>
                                        </Button>
                                    )}
                                     <Button size="sm" onClick={() => handleStartExam(assignment)} disabled={isSolved || !canStart}>
                                        <Gamepad2 className="mr-2 h-4 w-4"/> {isSolved ? "Tekrar Çöz" : "Sınava Başla"}
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    )
                })
            ) : (
                <Card className="text-center p-12 text-muted-foreground">
                    <p>Sana atanmış bir deneme sınavı bulunmuyor.</p>
                </Card>
            )}
       </div>
    </div>
  );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <DenemeSinaviPage />
        </Suspense>
    );
}
