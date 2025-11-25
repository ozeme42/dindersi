
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getStudentExams } from './actions';
import { getAssignmentDetails } from '@/app/teacher/assignments/[assignmentId]/actions';
import type { Assignment, ScoreEvent, StudentProgress } from '@/lib/types';
import { Loader2, ArrowLeft, Gamepad2, CheckCircle2, FileText, Calendar, Clock, AlertCircle, Award, Trophy, ArrowRight, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/user-avatar';
import { format, formatDistanceToNow, isFuture } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

// --- BİLEŞENLER ---

function LeaderboardDialog({ assignment, isOpen, onOpenChange }: {
    assignment: any | null,
    isOpen: boolean,
    onOpenChange: (isOpen: boolean) => void
}) {
    const [leaderboard, setLeaderboard] = useState<StudentProgress[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && assignment) {
            setIsLoading(true);
            getAssignmentDetails(assignment.id)
                .then(result => {
                    if (result.success && result.data) {
                        const sortedProgress = result.data.studentProgress.sort((a, b) => (b.scoreEvent?.points || 0) - (a.scoreEvent?.points || 0));
                        setLeaderboard(sortedProgress);
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, assignment]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{assignment?.title} - Sıralama</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
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
                                    <TableCell>{entry.student.displayName}</TableCell>
                                    <TableCell className="text-right">{entry.scoreEvent?.points || 0}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
        </Dialog>
    );
}

// 1. GİRİŞ KARTI
const IntroCard = ({ assignment, onStart }: { assignment: any; onStart: (assignment: any) => void }) => {
    const isSolved = !!assignment.solvedEvent;
    const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
    const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

    const handleOpenLeaderboard = () => {
        setSelectedAssignment(assignment);
        setIsLeaderboardOpen(true);
    };

    return (
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
                <AlertCircle size={24} />
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
                <div className="text-gray-800 font-bold text-lg">{assignment.duration || 0} Dakika</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                <Calendar size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase">TARİH ARALIĞI</div>
                <div className="text-gray-800 font-bold">
                    {assignment.startDate ? format(new Date(assignment.startDate), 'd MMM', {locale: tr}) : 'Her zaman'} - {assignment.dueDate ? format(new Date(assignment.dueDate), 'd MMM yyyy', {locale: tr}) : 'Süresiz'}
                </div>
              </div>
            </div>
            
             {assignment.solvedEvent && (
                <>
                <div className="flex items-center gap-4 pt-4 border-t cursor-pointer" onClick={handleOpenLeaderboard}>
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Trophy size={24} /></div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Sıralama</div>
                        <div className="text-indigo-600 font-bold text-lg">{assignment.rank} / {assignment.totalParticipants}</div>
                    </div>
                </div>
                <LeaderboardDialog assignment={selectedAssignment} isOpen={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen} />
                </>
            )}


          </div>

          <hr className="border-gray-100" />
            
             {!isSolved ? (
                <Button 
                    onClick={() => onStart(assignment)}
                    disabled={!canStart}
                    className="w-full group relative flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-indigo-500/30"
                >
                    {canStart ? 'SINAVI BAŞLAT' : `Başlangıç: ${format(new Date(assignment.startDate), 'd MMM HH:mm')}`}
                    {canStart && <Play size={24} className="fill-current group-hover:translate-x-1 transition-transform" />}
                </Button>
            ) : (
                <div className="flex gap-2">
                    <Button asChild className="w-full" variant="secondary">
                        <Link href={`/student/deneme/sonuc/${assignment.id}`}>
                            Sonuçları Gör
                        </Link>
                    </Button>
                </div>
            )}
          <p className="text-center text-xs text-gray-400 mt-2">Başarılar Dileriz.</p>
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

  if (isLoading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
                  <IntroCard key={assignment.id} assignment={assignment} onStart={handleStartExam} />
              ))
          ) : (
              <p>Sana atanmış bir deneme sınavı bulunmuyor.</p>
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
