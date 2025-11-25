
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, documentId } from 'firebase/firestore';
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
import { Loader2, ArrowLeft, Gamepad2, CheckCircle2, BarChart3, Clock, Trophy, Play, Award, CalendarIcon, ArrowRight, FileText, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { getStudentExams, getAssignmentDetails } from './actions';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/user-avatar';


function LeaderboardDialog({ assignment, isOpen, onOpenChange }: { assignment: any, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const [leaderboard, setLeaderboard] = useState<{ student: UserProfile, scoreEvent: ScoreEvent }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && assignment?.id) {
            const fetchLeaderboard = async () => {
                setIsLoading(true);
                const result = await getAssignmentDetails(assignment.id);
                if (result.success && result.data) {
                    const sorted = result.data.studentProgress
                        .filter(p => p.scoreEvent !== null)
                        .sort((a, b) => (b.scoreEvent?.points || 0) - (a.scoreEvent?.points || 0));
                    setLeaderboard(sorted as any);
                }
                setIsLoading(false);
            };
            fetchLeaderboard();
        }
    }, [isOpen, assignment]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{assignment?.title} - Sıralama</DialogTitle>
                </DialogHeader>
                {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div> :
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
                                        <UserAvatar user={entry.student} className="h-8 w-8" />
                                        <span>{entry.student.displayName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{entry.scoreEvent.points}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                }
            </DialogContent>
        </Dialog>
    );
}


function IntroCard({ assignment }: { assignment: any }) {
    const isSolved = !!assignment.solvedEvent;
    const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    
    return (
    <>
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-[fadeIn_0.5s_ease-out]">
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
                            <div className="text-gray-800 font-bold text-lg">{assignment.duration || 'Sınırsız'} Dakika</div>
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
                     {assignment.solvedEvent && (
                        <div className="flex items-center gap-4 pt-4 border-t cursor-pointer" onClick={() => setIsLeaderboardOpen(true)}>
                            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Trophy size={24} /></div>
                            <div>
                                <div className="text-xs text-gray-400 font-bold uppercase">Sıralama</div>
                                <div className="text-indigo-600 hover:underline font-bold">{assignment.rank} / {assignment.totalParticipants}</div>
                            </div>
                        </div>
                    )}
                </div>

                <hr className="border-gray-100" />
                
                {!isSolved ? (
                    <Button 
                        asChild={canStart}
                        onClick={!canStart ? () => {} : undefined}
                        className="w-full group relative flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-[1.02] shadow-lg"
                        disabled={!canStart}
                    >
                        {canStart ? (
                             <Link href={`/student/deneme/coz?assignmentId=${assignment.id}&assignmentTitle=${encodeURIComponent(assignment.title)}&questionIds=${assignment.questionIds.join(',')}&duration=${assignment.duration || '0'}`}>
                                SINAVI BAŞLAT <Play size={24} className="fill-current group-hover:translate-x-1 transition-transform" />
                             </Link>
                        ) : (
                            <span>{`Başlangıç: ${format(new Date(assignment.startDate), 'd MMM HH:mm')}`}</span>
                        )}
                    </Button>
                ) : (
                  <Button asChild className="w-full">
                     <Link href={`/student/deneme/sonuc/${assignment.id}`}>
                        Sonuçları Gör <ArrowRight className="ml-2 h-5 w-5"/>
                     </Link>
                  </Button>
                )}

                <p className="text-center text-xs text-gray-400">Başarılar Dileriz.</p>
            </div>
        </div>
        <LeaderboardDialog assignment={assignment} isOpen={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen} />
    </>
    );
}

function DenemeSinaviPage() {
  const { user, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
        setIsLoading(true);
        getStudentExams(user.uid).then(result => {
            if (result.success && result.data) {
                setAssignments(result.data);
            } else {
                setError(result.error || "Denemeler yüklenemedi.");
            }
            setIsLoading(false);
        });
    } else if (!authLoading && !user) {
        setIsLoading(false);
    }
  }, [user, authLoading]);


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

       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
            {assignments.length > 0 ? (
                assignments.map(assignment => (
                   <IntroCard key={assignment.id} assignment={assignment} />
                ))
            ) : (
                <div className="col-span-full text-center py-16 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12"/>
                    <h3 className="mt-4 text-lg font-semibold">Henüz sana atanmış bir deneme sınavı yok.</h3>
                </div>
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
