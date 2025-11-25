
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
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
import { Loader2, ArrowLeft, Gamepad2, CheckCircle2, FileText, Clock, Calendar, Play, XCircle, Award, AlertCircle, Trophy } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { getStudentExams } from './actions';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function InfoBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            {icon}
        </div>
        <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</div>
            <div className="text-gray-800 font-bold">{value}</div>
        </div>
    </div>
  )
}

function IntroCard({ assignment }: { assignment: any }) {
  const router = useRouter();

  const handleStartExam = () => {
      if (!assignment.questionIds || assignment.questionIds.length === 0) {
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

  const isSolved = !!assignment.solvedEvent;
  const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
  const isExpired = assignment.dueDate && isPast(new Date(assignment.dueDate));
  
  const status = isSolved
      ? { text: "Çözüldü", color: "bg-green-600", icon: <CheckCircle2 /> }
      : isExpired
      ? { text: "Süre Doldu", color: "bg-red-600", icon: <XCircle /> }
      : !canStart
      ? { text: "Henüz Başlamadı", color: "bg-amber-600", icon: <Clock /> }
      : { text: "Bekliyor", color: "bg-blue-600", icon: <Play /> };


  return (
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-indigo-600 p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <div className="relative z-10">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <FileText size={32} className="text-indigo-600" />
                  </div>
                  <h1 className="text-xl font-bold text-white tracking-wide">{assignment.title}</h1>
                  <div className="mt-1 inline-block bg-indigo-800 text-indigo-100 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
                      {assignment.courseName}
                  </div>
              </div>
          </div>
          <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                  <InfoBlock icon={<AlertCircle size={20}/>} label="SINAV DURUMU" value={<Badge className={`${status.color} text-white`}>{status.text}</Badge>} />
                  {isSolved && assignment.rank > 0 && (
                      <Link href={`/teacher/assignments/${assignment.id}`} className="block">
                          <InfoBlock icon={<Trophy size={20}/>} label="SIRALAMA" value={`${assignment.rank}. / ${assignment.totalParticipants || '?'}`} />
                      </Link>
                  )}
                  <InfoBlock icon={<FileText size={20}/>} label="SORU SAYISI" value={`${assignment.questionIds?.length || 0} Soru`} />
                  <InfoBlock icon={<Clock size={20}/>} label="SÜRE" value={`${assignment.duration || '?'} Dakika`} />
                  {assignment.startDate && (
                      <InfoBlock icon={<Calendar size={20}/>} label="TARİH ARALIĞI" value={`${format(new Date(assignment.startDate), 'dd MMM', {locale: tr})} - ${assignment.dueDate ? format(new Date(assignment.dueDate), 'dd MMM yyyy', {locale: tr}) : 'Süresiz'}`} />
                  )}
              </div>
              <hr className="border-gray-100" />
              {isSolved ? (
                  <Button asChild className="w-full" variant="secondary">
                      <Link href={`/student/deneme/sonuc/${assignment.id}`}>
                          Sonuçları Gör <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                  </Button>
              ) : (
                  <Button onClick={handleStartExam} disabled={!canStart || isExpired} className="w-full group">
                      <Play className="mr-2 h-5 w-5 fill-current" /> Sınavı Başlat
                  </Button>
              )}
          </div>
      </div>
  );
}


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
                            <Link href="/student">Panele Dön</Link>
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

      {assignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {assignments.map(assignment => (
                  <IntroCard key={assignment.id} assignment={assignment} />
              ))}
          </div>
      ) : (
          <Card className="text-center p-12 text-muted-foreground">
              <p>Sana atanmış bir deneme sınavı bulunmuyor.</p>
          </Card>
      )}
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
