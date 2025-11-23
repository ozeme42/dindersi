

'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAssignmentDetails } from "./actions";
import type { AssignmentDetails, UserProfile, ScoreEvent } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

function ErrorDisplay({ error }: { error: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold">Hata</h2>
            <p className="text-muted-foreground">{error}</p>
        </div>
    )
}

export default function AssignmentDetailPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [details, setDetails] = useState<AssignmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) {
      setError("Ödev ID'si bulunamadı.");
      setIsLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      const result = await getAssignmentDetails(assignmentId);
      if (result.error) {
        setError(result.error);
        toast({ title: "Hata", description: result.error, variant: "destructive" });
      } else {
        setDetails(result.data as AssignmentDetails);
      }
      setIsLoading(false);
    };

    fetchDetails();
  }, [assignmentId, toast]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <Button asChild variant="outline" size="sm" className="mb-4">
          <Link href="/teacher/exams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Link>
        </Button>
        <ErrorDisplay error={error} />
      </div>
    );
  }

  if (!details) {
    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/teacher/exams">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Geri Dön
                </Link>
            </Button>
            <ErrorDisplay error={"Ödev detayları yüklenemedi."} />
        </div>
    );
  }

  const { assignment, studentProgress } = details;
  const totalQuestions = assignment.questionIds?.length || 0;

  const getCorrectAnswers = (scoreEvent: ScoreEvent | null) => {
    if (!scoreEvent || !scoreEvent.points || totalQuestions === 0) return 0;
    // Assuming 10 points per correct answer
    return Math.round(scoreEvent.points / 10);
  };
  
  const sortedProgress = [...studentProgress].sort((a, b) => {
    const scoreA = a.scoreEvent?.points ?? -1;
    const scoreB = b.scoreEvent?.points ?? -1;

    if (scoreB !== scoreA) {
        return scoreB - scoreA;
    }
    // If scores are the same, sort by name
    return (a.student.displayName || '').localeCompare(b.student.displayName || '', 'tr');
  });


  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex items-center mb-6">
            <Button asChild variant="outline" size="sm">
                <Link href="/teacher/exams">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tüm Denemeler
                </Link>
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>{assignment.title}</CardTitle>
                <CardDescription>
                    {assignment.className} - {assignment.courseName} | {assignment.assignedTo.length} öğrenciye atandı.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">Sıra</TableHead>
                            <TableHead>Öğrenci</TableHead>
                            <TableHead>Son Deneme</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">Skor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedProgress.length > 0 ? (
                             sortedProgress.map(({ student, scoreEvent }, index) => {
                                const correctAnswers = getCorrectAnswers(scoreEvent);
                                const successRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
                                
                                return (
                                    <TableRow key={student.uid}>
                                        <TableCell className="font-bold text-lg">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={student} />
                                                <span className="font-medium">{student.displayName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {scoreEvent ? formatDistanceToNow(new Date(scoreEvent.timestamp), { addSuffix: true, locale: tr }) : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {scoreEvent ? (
                                                <Badge variant={successRate >= 50 ? 'default' : 'destructive'} className={successRate >= 50 ? 'bg-green-600' : ''}>
                                                    {successRate >= 50 ? <CheckCircle className="mr-2 h-4 w-4"/> : <XCircle className="mr-2 h-4 w-4"/>}
                                                    {correctAnswers}/{totalQuestions} Doğru
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">Başlamadı</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-primary">
                                            {scoreEvent?.points || 0}
                                        </TableCell>
                                    </TableRow>
                                )
                             })
                        ) : (
                             <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Bu denemeyi henüz çözen öğrenci bulunmuyor veya denemeye öğrenci atanmamış.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
