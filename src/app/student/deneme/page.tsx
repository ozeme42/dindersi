'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import {
  Card,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import { Loader2, ArrowRight, Play, Trophy, Calendar, Clock, FileText, AlertTriangle, CheckCircle2, Medal, Timer, GraduationCap } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { getStudentExams } from './actions';
import { getAssignmentDetails } from '@/app/teacher/assignments/[assignmentId]/actions';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/user-avatar';

// --- LİDERLİK TABLOSU (KOYU TEMA) ---
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
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                     <Trophy className="h-5 w-5 text-amber-500" />
                     <span>Sıralama</span>
                     <span className="text-slate-500 text-sm font-normal ml-auto">{assignment?.title}</span>
                </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableHead className="text-slate-400 w-12 text-center">#</TableHead>
                                <TableHead className="text-slate-400">Öğrenci</TableHead>
                                <TableHead className="text-right text-slate-400">Puan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaderboard.length > 0 ? leaderboard.map((entry, index) => (
                                <TableRow key={entry.student.uid} className="border-white/10 hover:bg-white/5 transition-colors">
                                    <TableCell className="font-bold text-center text-slate-500">
                                        {index === 0 ? <Medal className="h-5 w-5 text-yellow-500 mx-auto" /> : 
                                         index === 1 ? <Medal className="h-5 w-5 text-slate-300 mx-auto" /> : 
                                         index === 2 ? <Medal className="h-5 w-5 text-amber-700 mx-auto" /> : 
                                         index + 1}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={entry.student} className="h-8 w-8 border border-white/10"/>
                                            <span className="font-medium text-slate-200">{entry.student.displayName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-cyan-400">{entry.scoreEvent.points}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow className="border-white/10">
                                    <TableCell colSpan={3} className="text-center text-slate-500 py-8">Henüz katılım yok.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </DialogContent>
    );
}

// --- SINAV KARTI (CYBER TASARIM) ---
function IntroCard({ assignment }: { assignment: any }) {
  const isSolved = !!assignment.solvedEvent;
  const canStart = !assignment.startDate || !isFuture(new Date(assignment.startDate));
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  return (
      <div className="group relative w-full max-w-2xl mx-auto rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-md overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1 shadow-2xl">
          
          {/* Kart Arkasındaki Işık Efekti */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/10 transition-colors" />

          {/* Header Kısmı */}
          <div className="relative p-6 pb-4 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-start">
             <div className="flex gap-4">
                 <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <FileText className="h-7 w-7 text-indigo-400" />
                 </div>
                 <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                            {assignment.courseName}
                        </span>
                        {isSolved ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Tamamlandı
                            </span>
                        ) : !canStart ? (
                             <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Bekleniyor
                            </span>
                        ) : (
                             <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                                <Play className="h-3 w-3" /> Aktif
                            </span>
                        )}
                     </div>
                     <h3 className="text-xl font-bold text-white leading-tight">{assignment.title}</h3>
                 </div>
             </div>
          </div>

          {/* İçerik (HUD Tarzı İstatistikler) */}
          <div className="p-6 pt-4 space-y-6">
              
              {/* Bilgi Grid'i */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                      <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><FileText className="h-3 w-3"/> Soru</div>
                      <div className="text-slate-200 font-bold text-lg">{assignment.questionIds?.length || 0}</div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                      <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Timer className="h-3 w-3"/> Süre</div>
                      <div className="text-slate-200 font-bold text-lg">{assignment.duration || assignment.questionIds?.length || 0} dk</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-slate-950/50 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                       {assignment.dueDate ? (
                           <>
                                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Calendar className="h-3 w-3"/> Bitiş</div>
                                <div className={cn("font-bold text-sm", isPast(new Date(assignment.dueDate)) ? "text-red-400" : "text-emerald-400")}>
                                     {isPast(new Date(assignment.dueDate)) ? 'Süre Doldu' : formatDistanceToNow(new Date(assignment.dueDate), { addSuffix: true, locale: tr })}
                                </div>
                           </>
                       ) : (
                           <div className="text-slate-500 text-xs">Süresiz</div>
                       )}
                  </div>
              </div>

              {/* Alt Aksiyon Alanı */}
              <div className="pt-2">
                {isSolved ? (
                   <Dialog open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
                        <div className="flex flex-col gap-3">
                             <div 
                                className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-colors group/rank"
                                onClick={() => setIsLeaderboardOpen(true)}
                             >
                                 <div className="flex items-center gap-3">
                                     <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                                         <Trophy className="h-5 w-5" />
                                     </div>
                                     <div>
                                         <div className="text-xs text-amber-200/70 font-bold uppercase">Sıralaman</div>
                                         <div className="text-white font-bold text-lg">
                                             #{assignment.rank} <span className="text-slate-500 text-sm font-normal">/ {assignment.totalParticipants}</span>
                                         </div>
                                     </div>
                                 </div>
                                 <ArrowRight className="h-5 w-5 text-amber-500 opacity-50 group-hover/rank:opacity-100 group-hover/rank:translate-x-1 transition-all" />
                             </div>
                             
                             <Button asChild className="w-full bg-slate-800 text-white hover:bg-slate-700 border border-white/10 h-12 rounded-xl font-bold">
                               <Link href={`/student/deneme/sonuc/${assignment.id}`}>
                                  Sonuçları İncele <FileText className="ml-2 h-4 w-4 opacity-70"/>
                               </Link>
                            </Button>
                        </div>
                        <LeaderboardDialog assignment={assignment} />
                   </Dialog>
                ) : (
                   <Button asChild size="lg" disabled={!canStart} className={cn(
                       "w-full relative h-14 rounded-xl font-bold text-lg tracking-wide shadow-lg transition-all transform hover:scale-[1.02]",
                       canStart 
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/20 hover:shadow-cyan-500/40 border border-cyan-400/20" 
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                   )}>
                     <Link href={canStart ? `/student/deneme/coz?assignmentId=${assignment.id}&assignmentTitle=${encodeURIComponent(assignment.title)}&questionIds=${assignment.questionIds?.join(',')}&duration=${assignment.duration || assignment.questionIds?.length || 0}` : '#'}>
                         <div className="flex items-center gap-2">
                             {canStart ? (
                                 <>SINAVA BAŞLA <Play className="h-5 w-5 fill-current" /></>
                             ) : (
                                 <>
                                    <Clock className="h-5 w-5" /> 
                                    <span>{format(new Date(assignment.startDate), 'd MMM HH:mm', { locale: tr })}</span>
                                 </>
                             )}
                         </div>
                     </Link>
                   </Button>
                )}
              </div>
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
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
      </div>
    );
  }

   if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-4 bg-slate-950">
                <div className="bg-slate-900 p-6 rounded-2xl border border-red-500/30 text-center max-w-md">
                    <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-lg mb-2">Denemeler Yüklenemedi</h3>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
        {/* Arka Plan Efektleri */}
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-12 relative z-10">
          
          {/* Başlık */}
          <div className="flex flex-col items-center text-center mb-10 md:mb-14">
            <div className="bg-slate-900/50 p-4 rounded-3xl border border-white/5 mb-4 shadow-xl backdrop-blur-sm">
                <GraduationCap className="h-12 w-12 text-cyan-400" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
                Deneme <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Sınavları</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              Öğretmenlerin tarafından sana özel olarak atanmış deneme sınavlarını buradan çözebilir, sıralamanı görebilirsin.
            </p>
          </div>

           <div className="space-y-6 flex flex-col items-center w-full">
               {assignments.length > 0 ? (
                   assignments.map(assignment => (
                       <IntroCard key={assignment.id} assignment={assignment} />
                   ))
               ) : (
                   <div className="text-center py-16 px-6 rounded-3xl bg-slate-900/50 border border-dashed border-white/10 max-w-lg w-full">
                       <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                       <p className="text-slate-400 font-medium">Sana atanmış aktif bir deneme sınavı bulunmuyor.</p>
                   </div>
               )}
           </div>
        </div>
    </div>
  );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>}>
            <DenemeSinaviPage />
        </Suspense>
    );
}