
'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Gamepad2, CheckCircle2, ClipboardCheck, BarChart3, Clock, Trophy, Award, CalendarIcon, FileText, Play, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { getStudentExams } from './actions';
import { getAssignmentDetails } from '@/app/teacher/assignments/[assignmentId]/actions';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { Assignment, UserProfile } from '@/lib/types';
import { UserAvatar } from '@/components/user-avatar';


function LeaderboardDialog({ assignment }: { assignment: any }) {
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (assignment?.id) {
            const fetchLeaderboard = async () => {
                setIsLoading(true);
                const result = await getAssignmentDetails(assignment.id);
                if (result.success && result.data) {
                    const sorted = result.data.studentProgress
                        .filter(p => p.scoreEvent !== null)
                        .sort((a, b) => (b.scoreEvent?.points ?? 0) - (a.scoreEvent?.points ?? 0));
                    setLeaderboard(sorted);
                }
                setIsLoading(false);
            };
            fetchLeaderboard();
        }
    }, [assignment]);

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{assignment?.title} - Sıralama</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sıra</TableHead>
                                <TableHead>Öğrenci</TableHead>
                                <TableHead className="text-right">Puan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaderboard.map((entry, index) => (
                                <TableRow key={entry.student.uid}>
                                    <TableCell className="font-bold">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <UserAvatar user={entry.student} className="h-8 w-8"/>
                                            {entry.student.displayName}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">{entry.scoreEvent.points}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </DialogContent>
    );
}


function IntroCard({ assignment }: { assignment: any }) {
  const isSolved = !!assignment.solvedEvent;
  const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  return (
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-[fadeIn_0.5s_ease-out]">
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
          <div className="p-8 space-y-6">
              <div className="space-y-4">
                   <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">SINAV KONUSU</div>
                        <div className="text-gray-800 font-bold text-lg">{assignment.title}</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">SORU SAYISI</div>
                        <div className="text-gray-800 font-bold text-lg">{assignment.questionIds?.length || 0} Soru</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">SÜRE</div>
                        <div className="text-gray-800 font-bold text-lg">{assignment.duration || assignment.questionIds?.length || 0} Dakika</div>
                    </div>
                </div>

                 {assignment.dueDate && (
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl"><CalendarIcon size={24} /></div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase">Durum</div>
                            <div className="text-gray-800 font-bold">{isPast(new Date(assignment.dueDate)) ? 'Süre Doldu' : `Bitiş: ${formatDistanceToNow(new Date(assignment.dueDate), { addSuffix: true, locale: tr })}`}</div>
                        </div>
                    </div>
                )}
                
                {isSolved && (
                   <Dialog open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
                        <div className="flex flex-col gap-2 pt-4 border-t">
                             <div className="flex items-center gap-4 pt-4 border-t cursor-pointer" onClick={() => setIsLeaderboardOpen(true)}>
                                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Award size={24} /></div>
                                <div>
                                    <div className="text-xs text-gray-400 font-bold uppercase">Sıralama</div>
                                    <div className="text-indigo-600 hover:underline">
                                        <span className="font-bold">{assignment.rank}.</span> / {assignment.totalParticipants} yarışmacı
                                    </div>
                                </div>
                            </div>
                            <Button asChild className="w-full">
                               <Link href={`/student/deneme/sonuc/${assignment.id}`}>
                                  Sonuçları Gör <ArrowRight className="ml-2 h-5 w-5"/>
                               </Link>
                            </Button>
                        </div>
                        <LeaderboardDialog assignment={assignment} />
                   </Dialog>
                )}
              </div>
              {!isSolved && (
                  <Button asChild size="lg" className="w-full group relative flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-indigo-500/30">
                    <Link href={`/student/deneme/coz?assignmentId=${assignment.id}&assignmentTitle=${encodeURIComponent(assignment.title)}&questionIds=${assignment.questionIds?.join(',')}&duration=${assignment.duration || assignment.questionIds?.length || 0}`}
                    >
                        <span>
                            {canStart ? 'SINAVI BAŞLAT' : `Başlangıç: ${format(new Date(assignment.startDate), 'd MMM HH:mm')}`}
                        </span>
                        {canStart && <Play size={24} className="fill-current group-hover:translate-x-1 transition-transform" />}
                    </Link>
                </Button>
              )}
          </div>
      </div>
  )
}

function DenemeSinaviPage() {
  const { user, loading: authLoading } = useAuth();
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

       <div className="space-y-4 flex flex-col items-center">
            {assignments.length > 0 ? (
                assignments.map(assignment => (
                    <IntroCard key={assignment.id} assignment={assignment} />
                ))
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
