
'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Assignment, ScoreEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Loader2, ArrowLeft, Gamepad2, CheckCircle2, ClipboardCheck, BarChart3, Clock, Trophy, Award, FileText, AlertCircle, Calendar, Play, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { getStudentExams } from './actions';
import { format, formatDistanceToNow, isFuture } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

function LeaderboardDialog({ assignment, isOpen, onOpenChange }: { assignment: any | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    if (!assignment) return null;

    const sortedProgress = useMemo(() => {
        if (!assignment.studentProgress) return [];
        return [...assignment.studentProgress].sort((a, b) => (b.scoreEvent?.points || 0) - (a.scoreEvent?.points || 0));
    }, [assignment.studentProgress]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{assignment.title} - Sıralama</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">Sıra</TableHead>
                                <TableHead>Öğrenci</TableHead>
                                <TableHead className="text-right">Puan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedProgress.map((progress, index) => (
                                <TableRow key={progress.student.uid}>
                                    <TableCell className="font-bold">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <UserAvatar user={progress.student} className="w-8 h-8" />
                                            <span>{progress.student.displayName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">{progress.scoreEvent?.points || 0}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function IntroCard({ assignment, onStart, onShowLeaderboard }: { assignment: any, onStart: (assignment: any) => void, onShowLeaderboard: (assignment: any) => void }) {
    const isSolved = !!assignment.solvedEvent;
    const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
    const totalQuestions = assignment.questionIds?.length || 0;

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
                <div className="text-xs text-gray-400 font-bold uppercase">Sınav Durumu</div>
                <div className={`font-bold text-lg ${isSolved ? 'text-green-600' : (canStart ? 'text-blue-600' : 'text-amber-600')}`}>
                  {isSolved ? "Tamamlandı" : (canStart ? 'Aktif' : 'Beklemede')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                <FileText size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase">Soru Sayısı</div>
                <div className="text-gray-800 font-bold text-lg">{totalQuestions} Soru</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase">Süre</div>
                <div className="text-gray-800 font-bold text-lg">{assignment.duration ? `${assignment.duration} Dakika` : 'Süresiz'}</div>
              </div>
            </div>
             {assignment.dueDate && (
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Son Teslim</div>
                        <div className="text-gray-800 font-bold">{format(new Date(assignment.dueDate), "dd MMMM yyyy", { locale: tr })}</div>
                    </div>
                </div>
            )}
             {isSolved && (
                <div className="flex items-center gap-4 pt-4 border-t cursor-pointer" onClick={() => onShowLeaderboard(assignment)}>
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Trophy size={24} /></div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Sıralama</div>
                        <div className="text-gray-800 font-bold text-lg hover:underline">{assignment.rank} / {assignment.totalParticipants}</div>
                    </div>
                </div>
            )}
          </div>
          <hr className="border-gray-100" />
            {isSolved ? (
                 <Button asChild className="w-full">
                    <Link href={`/student/deneme/sonuc/${assignment.id}`}>
                       Sonuçları Gör <ArrowRight className="ml-2 h-5 w-5"/>
                    </Link>
                 </Button>
            ) : (
                 <Button onClick={() => onStart(assignment)} disabled={!canStart} className="w-full group relative flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-indigo-500/30">
                    <span>{canStart ? 'SINAVI BAŞLAT' : 'HENÜZ BAŞLAMADI'}</span>
                    {canStart && <Play size={24} className="fill-current group-hover:translate-x-1 transition-transform" />}
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
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

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

  const handleShowLeaderboard = (assignment: any) => {
    setSelectedAssignment(assignment);
    setIsLeaderboardOpen(true);
  };

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
      <div className="flex flex-wrap justify-center gap-8">
            {assignments.length > 0 ? (
                assignments.map(assignment => (
                   <IntroCard key={assignment.id} assignment={assignment} onStart={handleStartExam} onShowLeaderboard={handleShowLeaderboard}/>
                ))
            ) : (
                <Card className="text-center p-12 text-muted-foreground">
                    <p>Sana atanmış bir deneme sınavı bulunmuyor.</p>
                </Card>
            )}
       </div>
       <LeaderboardDialog assignment={selectedAssignment} isOpen={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen} />
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

      