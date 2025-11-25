
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAssignmentDetails } from '@/app/teacher/assignments/[assignmentId]/actions';
import type { AssignmentDetails, Question, StudentProgress, ScoreEvent } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, BookCopy, BarChart3, Clock, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/user-avatar";

function WrongAnswersDialog({
  isOpen,
  onOpenChange,
  questions,
  studentAnswers
}: {
  isOpen: boolean,
  onOpenChange: (open: boolean) => void,
  questions: Question[],
  studentAnswers: (string | boolean | null)[]
}) {
  const wrongQuestions = questions.map((q, i) => {
    let isCorrect = false;
    if (q.type === 'Doğru/Yanlış') {
      isCorrect = studentAnswers[i] === (q.isTrue ?? (q.correctAnswer === 'Doğru'));
    } else {
      isCorrect = studentAnswers[i] === q.correctAnswer;
    }
    return { ...q, studentAnswer: studentAnswers[i], isCorrect };
  }).filter(q => !q.isCorrect);

  const getAnswerText = (answer: any) => {
    if (typeof answer === 'boolean') return answer ? 'Doğru' : 'Yanlış';
    return answer || 'Boş';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Yanlış Cevaplar</DialogTitle>
          <DialogDescription>Yanlış cevapladığın soruları ve doğru cevaplarını incele.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4">
          {wrongQuestions.length > 0 ? (
            <div className="space-y-4">
              {wrongQuestions.map((q, index) => (
                <Card key={q.id} className="w-full">
                  <CardHeader>
                    <CardTitle className="text-base flex items-start gap-3">
                      <span className="font-bold text-primary">{index + 1}.</span>
                      <span className="flex-1">{q.text}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-2 rounded-md bg-red-100 dark:bg-red-900/30">
                      <p className="text-xs font-semibold">Senin Cevabın:</p>
                      <div className="flex items-center gap-2 mt-1">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <p className="font-medium">{getAnswerText(q.studentAnswer)}</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                      <p className="text-xs font-semibold">Doğru Cevap:</p>
                      <p className="font-medium mt-1">{getAnswerText(q.correctAnswer ?? (q.isTrue ? 'Doğru' : 'Yanlış'))}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Tüm soruları doğru cevapladın, tebrikler!</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function ExamResultsPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const assignmentId = params.assignmentId as string;
    
    const [details, setDetails] = useState<AssignmentDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isWrongAnswersOpen, setIsWrongAnswersOpen] = useState(false);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState<StudentProgress[]>([]);

    const fetchResults = useCallback(async () => {
        if (!user || !assignmentId) return;

        setIsLoading(true);
        const result = await getAssignmentDetails(assignmentId);
        if (result.success && result.data) {
            const studentData = result.data.studentProgress.find(p => p.student.uid === user.uid);
            if (!studentData?.scoreEvent) {
                setError("Bu deneme için bir sonuç kaydı bulunamadı.");
            } else {
                 setDetails({
                    assignment: result.data.assignment,
                    studentProgress: [studentData]
                });
            }
        } else {
            setError(result.error || "Sonuçlar getirilemedi.");
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsLoading(false);
    }, [assignmentId, user, toast]);

    const fetchLeaderboard = async () => {
        setIsLoading(true);
        const result = await getAssignmentDetails(assignmentId);
        if (result.success && result.data) {
            const sorted = result.data.studentProgress
                .filter(p => p.scoreEvent !== null)
                .sort((a, b) => (b.scoreEvent?.points || 0) - (a.scoreEvent?.points || 0));
            setLeaderboardData(sorted);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);
    
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Yükleniyor...</div>;
    }
    
    if (error || !details) {
        return (
            <div className="flex h-screen items-center justify-center text-center p-4">
                <div>
                     <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-xl font-semibold">Sonuçlar Yüklenemedi</h2>
                    <p className="text-muted-foreground">{error || "Bir hata oluştu."}</p>
                     <Button asChild variant="outline" className="mt-4">
                        <Link href="/student/deneme">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Deneme Sınavlarıma Dön
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    const { assignment, studentProgress } = details;
    const scoreEvent = studentProgress[0]?.scoreEvent;
    const studentAnswers = scoreEvent?.answers || [];
    const questions = assignment.questions || [];
    
    const correctCount = questions.reduce((count, question, index) => {
        if (!question) return count;
        const studentAnswer = studentAnswers[index];
        let isCorrect = false;
        if (question.type === 'Doğru/Yanlış') {
            const correctAnswerBool = question.isTrue ?? (question.correctAnswer === 'Doğru');
            isCorrect = studentAnswer === correctAnswerBool;
        } else {
            isCorrect = studentAnswer === question.correctAnswer;
        }
        return count + (isCorrect ? 1 : 0);
    }, 0);

    const wrongCount = questions.length - correctCount;

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="mb-6">
                <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/student/deneme">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Deneme Sınavlarıma Dön
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline">{assignment.title}</h1>
                <p className="text-muted-foreground">Sınav Sonuç Detayları</p>
            </div>
            
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Genel Sonuç</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100" onClick={() => { fetchLeaderboard(); setIsLeaderboardOpen(true); }}>
                        <Trophy className="h-6 w-6 text-blue-500 mb-1"/>
                        <p className="text-sm text-blue-500">Sıralama</p>
                        <p className="text-2xl font-bold text-blue-600">{assignment.rank || '-'}</p>
                    </div>
                     <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <Star className="h-6 w-6 text-amber-500 mb-1"/>
                        <p className="text-sm text-amber-500">Puan</p>
                        <p className="text-2xl font-bold text-amber-600">{scoreEvent?.points || 0}</p>
                    </div>
                     <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <CheckCircle2 className="h-6 w-6 text-green-500 mb-1"/>
                        <p className="text-sm text-green-500">Doğru</p>
                        <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100" onClick={() => setIsWrongAnswersOpen(true)}>
                        <XCircle className="h-6 w-6 text-red-500 mb-1"/>
                        <p className="text-sm text-red-500">Yanlış</p>
                        <p className="text-2xl font-bold text-red-600">{wrongCount}</p>
                    </div>
                </CardContent>
            </Card>

            <WrongAnswersDialog
              isOpen={isWrongAnswersOpen}
              onOpenChange={setIsWrongAnswersOpen}
              questions={questions}
              studentAnswers={studentAnswers}
            />

            <Dialog open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{assignment.title} - Sıralama</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] mt-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
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
                                    {leaderboardData.map((p, index) => (
                                        <TableRow key={p.student.uid}>
                                            <TableCell className="font-bold">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <UserAvatar user={p.student} className="h-8 w-8" />
                                                    {p.student.displayName}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">{p.scoreEvent?.points}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ExamResultsPage />
        </Suspense>
    );
}
