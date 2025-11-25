
'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import type { Assignment, UserProfile, ScoreEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
    Loader2,
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    BarChart3,
    Clock,
    Trophy,
    Users,
    AlertCircle,
    FileText,
    Award,
    ArrowRight,
    Home,
    Play,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { getStudentExams, getAssignmentDetails } from './actions';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';


function LeaderboardDialog({ assignmentId, isOpen, onOpenChange }: { assignmentId: string, isOpen: boolean, onOpenChange: (isOpen: boolean) => void }) {
    const [leaderboard, setLeaderboard] = useState<{ student: UserProfile, scoreEvent: ScoreEvent | null }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && assignmentId) {
            setIsLoading(true);
            getAssignmentDetails(assignmentId).then(result => {
                if (result.success && result.data) {
                    const sorted = result.data.studentProgress
                        .filter(p => p.scoreEvent)
                        .sort((a, b) => (b.scoreEvent?.points || 0) - (a.scoreEvent?.points || 0));
                    setLeaderboard(sorted as any);
                }
            }).finally(() => setIsLoading(false));
        }
    }, [isOpen, assignmentId]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Sınav Sıralaması</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] mt-4">
                    {isLoading ? (
                         <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
                    ) : leaderboard.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Sıra</TableHead>
                                    <TableHead>Öğrenci</TableHead>
                                    <TableHead className="text-right">Puan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaderboard.map((entry, index) => (
                                    <TableRow key={entry.student.uid}>
                                        <TableCell className="font-bold">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={entry.student} />
                                                <span>{entry.student.displayName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{entry.scoreEvent?.points}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Bu sınav için henüz sıralama oluşmadı.</p>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

function IntroCard({ assignment }: { assignment: any }) {
    const isSolved = !!assignment.solvedEvent;
    const canStart = !isSolved && (!assignment.startDate || isPast(new Date(assignment.startDate))) && (!assignment.dueDate || isFuture(new Date(assignment.dueDate)));
    const totalQuestions = assignment.questionIds?.length || 0;
    const correctAnswers = isSolved ? Math.round((assignment.solvedEvent.points || 0) / 10) : 0;
    const score = isSolved ? assignment.solvedEvent.points : 0;
    const successRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    
    return (
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FileText size={40} className="text-indigo-600" />
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-wide uppercase">{assignment.title}</h1>
                    <div className="mt-2 inline-block bg-indigo-800 text-indigo-100 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                        {assignment.courseName}
                    </div>
                </div>
            </div>
            <div className="p-8 space-y-6">
                <div className="space-y-4">
                    {isSolved ? (
                        <>
                             <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <div className="text-xs text-gray-400 font-bold uppercase">DOĞRU</div>
                                    <div className="text-green-600 font-bold text-2xl">{correctAnswers}</div>
                                </div>
                                 <div className="p-3 bg-red-50 rounded-lg">
                                    <div className="text-xs text-gray-400 font-bold uppercase">YANLIŞ</div>
                                    <div className="text-red-600 font-bold text-2xl">{totalQuestions - correctAnswers}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 pt-4 border-t cursor-pointer" onClick={() => (window as any).openLeaderboardModal(assignment.id)}>
                                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Award size={24} /></div>
                                <div>
                                    <div className="text-xs text-gray-400 font-bold uppercase">Sıralama</div>
                                    <div className="text-gray-800 font-bold text-lg">{assignment.rank} / {assignment.totalParticipants}</div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                           <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><FileText size={24} /></div>
                                <div>
                                    <div className="text-xs text-gray-400 font-bold uppercase">Soru Sayısı</div>
                                    <div className="text-gray-800 font-bold text-lg">{totalQuestions} Soru</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Clock size={24} /></div>
                                <div>
                                    <div className="text-xs text-gray-400 font-bold uppercase">Süre</div>
                                    <div className="text-gray-800 font-bold text-lg">{assignment.duration} Dakika</div>
                                </div>
                            </div>
                        </>
                    )}
                    {assignment.dueDate && (
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><CalendarIcon size={24} /></div>
                            <div>
                                <div className="text-xs text-gray-400 font-bold uppercase">Durum</div>
                                <div className="text-gray-800 font-bold">{isPast(new Date(assignment.dueDate)) ? 'Süre Doldu' : `Bitiş: ${formatDistanceToNow(new Date(assignment.dueDate), { addSuffix: true, locale: tr })}`}</div>
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
                    <Button 
                        asChild={canStart}
                        onClick={canStart ? undefined : (e) => e.preventDefault()}
                        className="w-full group relative flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-indigo-500/30 disabled:bg-gray-400"
                        disabled={!canStart}
                    >
                         <Link href={canStart ? `/student/deneme/coz?assignmentId=${assignment.id}&assignmentTitle=${encodeURIComponent(assignment.title)}&questionIds=${assignment.questionIds.join(',')}&duration=${assignment.duration || '0'}` : '#'}>
                            {canStart ? 'SINAVI BAŞLAT' : `Başlangıç: ${format(new Date(assignment.startDate), 'd MMM HH:mm')}`}
                            {canStart && <Play size={24} className="fill-current group-hover:translate-x-1 transition-transform" />}
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}


function DenemeSinaviPage() {
  const { user, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

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
  
  (window as any).openLeaderboardModal = (id: string) => setSelectedAssignmentId(id);

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
                   <IntroCard key={assignment.id} assignment={assignment} />
                ))
            ) : (
                <Card className="col-span-full text-center p-12 text-muted-foreground">
                    <p>Sana atanmış bir deneme sınavı bulunmuyor.</p>
                </Card>
            )}
       </div>
       <LeaderboardDialog assignmentId={selectedAssignmentId || ''} isOpen={!!selectedAssignmentId} onOpenChange={() => setSelectedAssignmentId(null)} />
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

    