
'use client';

import { Suspense } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Assignment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, ArrowLeft, Gamepad2, CheckCircle2, ClipboardCheck, BarChart3, Clock, Trophy, Users, FileText, Play, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { getStudentExams } from './actions';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
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

       <div className="space-y-6">
            {assignments.length > 0 ? (
                assignments.map(assignment => {
                    const isSolved = !!assignment.solvedEvent;
                    const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
                    const isExpired = assignment.dueDate && isPast(new Date(assignment.dueDate));

                    return (
                        <div key={assignment.id} className="bg-white w-full max-w-md mx-auto rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-[fadeIn_0.5s_ease-out]">
                            <div className="bg-indigo-600 p-6 text-center relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                                 <div className="relative z-10">
                                     <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                        {isSolved ? <CheckCircle2 size={32} className="text-green-600"/> : <FileText size={32} className="text-indigo-600" />}
                                     </div>
                                     <h2 className="text-xl font-bold text-white tracking-wide uppercase">{assignment.title}</h2>
                                      <div className="mt-2 inline-block bg-indigo-800 text-indigo-100 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                                        {assignment.courseName}
                                    </div>
                                 </div>
                            </div>
                             <div className="p-6 space-y-4">
                               <div className="flex items-center gap-4">
                                  <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><FileText size={20} /></div>
                                  <div>
                                    <div className="text-xs text-gray-400 font-bold uppercase">SORU SAYISI</div>
                                    <div className="text-gray-800 font-bold">{assignment.questionIds?.length || 0} Soru</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Clock size={20} /></div>
                                  <div>
                                    <div className="text-xs text-gray-400 font-bold uppercase">SÜRE</div>
                                    <div className="text-gray-800 font-bold">{assignment.duration ? `${assignment.duration} Dakika` : "Süresiz"}</div>
                                  </div>
                                </div>
                                 <div className="flex items-center gap-4">
                                  <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Calendar size={20} /></div>
                                  <div>
                                    <div className="text-xs text-gray-400 font-bold uppercase">TARİH ARALIĞI</div>
                                    <div className="text-gray-800 font-bold text-sm">
                                        {assignment.startDate ? format(new Date(assignment.startDate), 'dd MMM', {locale: tr}) : 'Her zaman'}
                                        {assignment.dueDate && ` - ${format(new Date(assignment.dueDate), 'dd MMM yyyy', {locale: tr})}`}
                                    </div>
                                  </div>
                                </div>

                                {isSolved && (
                                     <div className="flex items-center gap-4 pt-4 border-t">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Trophy size={20} /></div>
                                        <div>
                                            <div className="text-xs text-gray-400 font-bold uppercase">SONUÇ</div>
                                            <div className="text-gray-800 font-bold">{assignment.solvedEvent.points} Puan (Derece: {assignment.rank}/{assignment.totalParticipants})</div>
                                        </div>
                                    </div>
                                )}
                                
                                <hr className="border-gray-100" />
                                
                                {isSolved ? (
                                    <Button asChild size="lg" className="w-full">
                                        <Link href={`/student/deneme/sonuc/${assignment.id}`}>
                                            Sonuçları Gör <BarChart3 className="ml-2 h-5 w-5"/>
                                        </Link>
                                    </Button>
                                ) : (
                                     <Button onClick={() => handleStartExam(assignment)} disabled={!canStart || isExpired} size="lg" className="w-full">
                                        {!canStart ? "Henüz Başlamadı" : isExpired ? "Süre Doldu" : "Sınava Başla"}
                                        {!isExpired && canStart && <Play className="ml-2 h-5 w-5"/>}
                                    </Button>
                                )}
                             </div>
                        </div>
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
