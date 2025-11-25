
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
import { Loader2, ArrowLeft, Gamepad2, CheckCircle2, Clock, Trophy, Users, Play, XCircle, ClipboardCheck, Award } from 'lucide-react';
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
    <div className="container mx-auto p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
      <div className="flex flex-col items-center text-center mb-12">
        <ClipboardCheck className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold font-headline">Deneme Sınavlarım</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Öğretmenlerin tarafından sana özel olarak atanmış deneme sınavlarını buradan çözebilirsin.
        </p>
      </div>

       <div className="space-y-6">
            {assignments.length > 0 ? (
                assignments.map(assignment => {
                    const isSolved = !!assignment.solvedEvent;
                    const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
                    const isExpired = assignment.dueDate && !isFuture(new Date(assignment.dueDate));

                    const status = isSolved 
                        ? { text: "Çözüldü", color: "bg-green-600", icon: <CheckCircle2 /> }
                        : isExpired
                        ? { text: "Süre Doldu", color: "bg-red-600", icon: <XCircle /> }
                        : !canStart
                        ? { text: "Henüz Başlamadı", color: "bg-amber-600", icon: <Clock /> }
                        : { text: "Bekliyor", color: "bg-blue-600", icon: <Play /> };

                    return (
                        <Card key={assignment.id} className="bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden transition-all hover:shadow-2xl">
                          <CardHeader className="p-0">
                               <div className="p-6 bg-gradient-to-br from-primary/10 via-card to-accent/10">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                      <div className="flex-1">
                                          <CardTitle>{assignment.title}</CardTitle>
                                          <CardDescription>{assignment.className} - {assignment.courseName}</CardDescription>
                                      </div>
                                       <Badge className={cn("text-white", status.color)}>
                                          {status.icon}
                                          <span className="ml-1.5">{status.text}</span>
                                      </Badge>
                                  </div>
                               </div>
                          </CardHeader>
                          <CardContent className="p-6 space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                  <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground font-semibold uppercase">SORU SAYISI</p>
                                      <p className="text-lg font-bold">{assignment.questionIds?.length || 0} Soru</p>
                                  </div>
                                  <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground font-semibold uppercase">SÜRE</p>
                                      <p className="text-lg font-bold">{assignment.duration ? `${assignment.duration} Dakika` : 'Süresiz'}</p>
                                  </div>
                                  <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground font-semibold uppercase">BAŞLANGIÇ</p>
                                      <p className="text-lg font-bold">{assignment.startDate ? format(new Date(assignment.startDate), 'dd MMM', { locale: tr }) : '-'}</p>
                                  </div>
                                  <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground font-semibold uppercase">BİTİŞ</p>
                                      <p className="text-lg font-bold">{assignment.dueDate ? format(new Date(assignment.dueDate), 'dd MMM', { locale: tr }) : '-'}</p>
                                  </div>
                              </div>
                          </CardContent>
                          <CardFooter className="bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                {isSolved ? (
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <span className="font-bold text-lg">{assignment.solvedEvent.points}</span> Puan
                                        </div>
                                         {assignment.rank && (
                                            <Link href={`/teacher/assignments/${assignment.id}`} className="flex items-center gap-1.5 hover:underline">
                                                <Trophy className="h-4 w-4 text-amber-500"/> Derece: <span className="font-bold">{assignment.rank} / {assignment.totalParticipants}</span>
                                            </Link>
                                        )}
                                    </div>
                                ) : (
                                    <div/> // Placeholder to keep layout consistent
                                )}
                                <div className="flex gap-2 self-end sm:self-center">
                                    {isSolved && (
                                        <Button asChild variant="secondary" size="sm">
                                            <Link href={`/student/deneme/sonuc/${assignment.id}`}>Sonuçları Gör</Link>
                                        </Button>
                                    )}
                                     <Button size="sm" onClick={() => handleStartExam(assignment)} disabled={!canStart || isExpired || isSolved}>
                                        <Gamepad2 className="mr-2 h-4 w-4"/> Sınava Başla
                                    </Button>
                                </div>
                          </CardFooter>
                        </Card>
                    )
                })
            ) : (
                <Card className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-lg">
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

