
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
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
import { Loader2, ArrowLeft, Play, CheckCircle2, XCircle, Clock, Trophy, Users, BarChart3, FileText, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { getStudentExams } from './actions';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function IntroCard({ assignment }: { assignment: any }) {
    const router = useRouter();

    const startExam = () => {
        if (!assignment.questionIds || assignment.questionIds.length === 0) {
            alert("Bu deneme için hiç soru atanmamış.");
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

    const getStatus = () => {
        const isSolved = !!assignment.solvedEvent;
        const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
        const isExpired = assignment.dueDate && isPast(new Date(assignment.dueDate));

        if (isSolved) {
            return { text: "Çözüldü", color: "bg-green-600", icon: <CheckCircle2 /> };
        }
        if (isExpired) {
            return { text: "Süre Doldu", color: "bg-red-600", icon: <XCircle /> };
        }
        if (!canStart) {
            return { text: "Henüz Başlamadı", color: "bg-amber-600", icon: <Clock /> };
        }
        return { text: "Bekliyor", color: "bg-blue-600", icon: <Play /> };
    };

    const status = getStatus();

    return (
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FileText size={40} className="text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-wide uppercase">{assignment.title}</h1>
                    <div className="mt-2 inline-block bg-indigo-800 text-indigo-100 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                        {assignment.courseName}
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase">SINAV DURUMU</div>
                            <div className={cn("text-white font-bold text-lg px-2 py-1 rounded-md mt-1", status.color)}>
                                {status.text}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><FileText size={24} /></div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase">SORU SAYISI</div>
                            <div className="text-gray-800 font-bold text-lg">{assignment.questionIds?.length || 0} Soru</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Clock size={24} /></div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase">SÜRE</div>
                            <div className="text-gray-800 font-bold text-lg">{assignment.duration || 'Sınırsız'} Dakika</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Calendar size={24} /></div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase">TARİH ARALIĞI</div>
                            <div className="text-gray-800 font-bold">
                                {assignment.startDate ? format(new Date(assignment.startDate), 'dd MMM', {locale: tr}) : 'Her zaman'} - {assignment.dueDate ? format(new Date(assignment.dueDate), 'dd MMM yyyy', {locale: tr}) : 'Süresiz'}
                            </div>
                        </div>
                    </div>
                     {assignment.solvedEvent && (
                        <div className="flex items-center gap-4 pt-4 border-t">
                            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Award size={24} /></div>
                            <div>
                                <div className="text-xs text-gray-400 font-bold uppercase">SONUÇ</div>
                                <Link href={`/teacher/assignments/${assignment.id}`} className="text-indigo-600 hover:underline">
                                    <div className="text-gray-800 font-bold text-lg">{assignment.solvedEvent.points} Puan (Derece: {assignment.rank}/{assignment.totalParticipants})</div>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <hr className="border-gray-100" />
                
                {status.text === 'Bekliyor' ? (
                     <button onClick={startExam} className="w-full group relative flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-indigo-500/30">
                        <span>SINAVI BAŞLAT</span>
                        <Play size={24} className="fill-current group-hover:translate-x-1 transition-transform" />
                    </button>
                ) : status.text === "Çözüldü" ? (
                     <Link href={`/student/deneme/sonuc/${assignment.id}`} className="w-full block text-center bg-gray-600 hover:bg-gray-700 text-white py-4 rounded-xl font-bold text-xl transition-all shadow-lg">
                        SONUÇLARI GÖR
                    </Link>
                ) : null}
            </div>
        </div>
    );
}


function DenemeSinaviPage() {
  const { user, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    };
    
    const fetchAssignments = async () => {
        setIsLoading(true);
        const result = await getStudentExams(user.uid);
        if (result.success && result.data) {
          setAssignments(result.data);
        } else {
          setError(result.error || "Denemeler yüklenemedi.");
        }
        setIsLoading(false);
    };

    fetchAssignments();
  }, [user, authLoading]);


  if (isLoading || authLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

   if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Denemeler Yüklenemedi!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }
  
    if (assignments.length === 0) {
        return (
             <div className="flex h-screen items-center justify-center text-center p-4">
                 <div>
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <h2 className="text-xl font-semibold">Henüz Atanmış Deneme Sınavı Yok</h2>
                    <p className="text-gray-500 mt-2">Öğretmeniniz bir deneme atadığında burada görünecektir.</p>
                 </div>
            </div>
        )
    }

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans pb-20 md:pb-8">
      <style>{`
          @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
          }
      `}</style>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {assignments.map(assignment => (
          <IntroCard key={assignment.id} assignment={assignment} />
        ))}
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
