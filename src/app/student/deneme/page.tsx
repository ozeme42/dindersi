
'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
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
import { Loader2, ArrowLeft, Gamepad2, CheckCircle2, ClipboardCheck, BarChart3, Clock, Trophy, Users, Play, AlertCircle, Award, XCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { getStudentExams } from './actions';
import { format, formatDistanceToNow, isFuture } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';


function IntroCard({ assignment, onStart }: { assignment: any; onStart: () => void }) {
    const isSolved = !!assignment.solvedEvent;
    const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
    const isExpired = assignment.dueDate && !isFuture(new Date(assignment.dueDate));

    const getStatus = () => {
        return isSolved
        ? { text: "Çözüldü", color: "bg-green-600", icon: <CheckCircle2 /> }
        : isExpired
        ? { text: "Süre Doldu", color: "bg-red-600", icon: <XCircle /> }
        : !canStart
        ? { text: "Henüz Başlamadı", color: "bg-amber-600", icon: <Clock /> }
        : { text: "Bekliyor", color: "bg-blue-600", icon: <Play /> };
    }

    const status = getStatus();

    return (
         <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-[fadeIn_0.5s_ease-out]">
            {/* Üst Başlık Alanı */}
            <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FileText size={40} className="text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-wide uppercase">Deneme Sınavı</h1>
                     <div className="mt-2 inline-block bg-indigo-800 text-indigo-100 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                        {assignment.courseName}
                    </div>
                </div>
            </div>

            {/* Detaylar */}
            <div className="p-8 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                         <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase">SINAV BAŞLIĞI</div>
                            <div className="text-gray-800 font-bold text-lg">{assignment.title}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                            <FileText size={24} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase">SORU SAYISI</div>
                            <div className="text-gray-800 font-bold text-lg">{assignment.questionIds.length} Soru</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase">SÜRE</div>
                            <div className="text-gray-800 font-bold text-lg">{assignment.duration} Dakika</div>
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase">TARİH ARALIĞI</div>
                            <div className="text-gray-800 font-bold">
                                {assignment.startDate ? format(new Date(assignment.startDate), "d MMM", { locale: tr }) : "Hemen"} - {assignment.dueDate ? format(new Date(assignment.dueDate), "d MMM yyyy", { locale: tr }) : "Yok"}
                            </div>
                        </div>
                    </div>
                     {assignment.solvedEvent && (
                        <div className="flex items-center gap-4 pt-4 border-t">
                            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Award size={24} /></div>
                            <div>
                                <div className="text-xs text-gray-400 font-bold uppercase">SONUÇ</div>
                                <Link href={`/teacher/assignments/${assignment.id}`} className="text-indigo-600 hover:underline">
                                    <div className="text-gray-800 font-bold text-lg">
                                        {assignment.solvedEvent.points} Puan (Derece: {assignment.rank}/{assignment.totalParticipants})
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <hr className="border-gray-100" />
                
                <Button
                    onClick={onStart}
                    disabled={!canStart || isSolved}
                    className="w-full group relative flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-[1.02] shadow-lg"
                >
                    <span>{isSolved ? 'TEKRAR ÇÖZ' : 'SINAVI BAŞLAT'}</span>
                    <Play size={24} className="fill-current group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
};

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {assignments.length > 0 ? (
            assignments.map(assignment => (
                <IntroCard key={assignment.id} assignment={assignment} onStart={() => handleStartExam(assignment)} />
            ))
        ) : (
            <Card className="md:col-span-2 lg:col-span-3 text-center p-12 text-muted-foreground">
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
