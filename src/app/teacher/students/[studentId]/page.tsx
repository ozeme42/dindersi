

'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getStudentDetails } from './actions';
import type { StudentDetails, UserProfile, ScoreEvent, QuestionBankStats } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Star, Activity, BookOpenCheck, ClipboardList, TrendingUp, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { tr } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


function ErrorWithLink({ message }: { message: string }) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.split(urlRegex);

    return (
        <Alert variant="destructive" className="whitespace-pre-wrap">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Hata!</AlertTitle>
            <AlertDescription>
                {parts.map((part, index) => 
                    urlRegex.test(part) ? 
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold break-all">{part}</a> : 
                    <span key={index}>{part}</span>
                )}
            </AlertDescription>
        </Alert>
    );
}

function RecentActivityList({ recentActivity }: { recentActivity: ScoreEvent[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-orange-500"/> Son Aktiviteler</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Etkinlik Türü</TableHead>
                            <TableHead>Konu/Açıklama</TableHead>
                            <TableHead>Puan</TableHead>
                            <TableHead className="text-right">Zaman</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentActivity.length > 0 ? (
                            recentActivity.map(event => (
                                <TableRow key={event.id}>
                                    <TableCell className="font-medium">{event.gameType}</TableCell>
                                    <TableCell>{event.context}</TableCell>
                                    <TableCell className={cn("font-bold", event.points > 0 ? "text-green-600" : "text-red-600")}>
                                        {event.points > 0 ? `+${event.points}` : event.points}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: tr })}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Son zamanlarda bir aktivite bulunmuyor.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function CourseProgress({ coursesProgress }: { coursesProgress: StudentDetails['coursesProgress'] }) {
    if (!coursesProgress || coursesProgress.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-blue-500"/> Ders İlerlemesi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {coursesProgress.map(course => (
                    <div key={course.courseId}>
                        <div className="flex justify-between items-baseline mb-1">
                            <p className="font-semibold">{course.courseName}</p>
                             <p className="text-sm text-muted-foreground">
                                {course.completedTopics}/{course.totalTopics} Konu
                            </p>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

function QuestionBankStats({ questionBankStats }: { questionBankStats: QuestionBankStats[] }) {
    if (!questionBankStats || questionBankStats.length === 0) return null;
    
    return (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-purple-500"/> Soru Bankası Performansı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {questionBankStats.map(stat => (
                    <div key={stat.courseId}>
                         <div className="flex justify-between items-baseline mb-1">
                            <p className="font-semibold">{stat.courseName}</p>
                             <p className="text-sm text-muted-foreground">
                                {stat.passedTests}/{stat.totalTests} Test Başarılı
                            </p>
                        </div>
                        <Progress value={stat.completionPercentage} className="h-2 [&>div]:bg-purple-500" />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}


export default function StudentDetailPage() {
    const params = useParams();
    const studentId = params.studentId as string;
    const { toast } = useToast();

    const [details, setDetails] = useState<StudentDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (!studentId) {
            setError("Öğrenci ID'si bulunamadı.");
            setIsLoading(false);
            return;
        }

        const fetchDetails = async () => {
            setIsLoading(true);
            const result = await getStudentDetails(studentId);
            if (result.error) {
                setError(result.error);
            } else if (result.data) {
                setDetails(result.data as StudentDetails);
            }
            setIsLoading(false);
        };
        
        fetchDetails();
    }, [studentId, toast]);

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-theme(height.16))] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !details) {
        return (
            <div className="container mx-auto p-8 text-center">
                 {error && <ErrorWithLink message={error} />}
                 <Button asChild variant="link" className="mt-4">
                    <Link href="/teacher/students">Öğrenci Listesine Geri Dön</Link>
                </Button>
            </div>
        )
    }
    
    const { profile, recentActivity, coursesProgress, questionBankStats } = details;

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8 pb-20">
            <div className="flex items-center mb-6">
                 <Button asChild variant="outline" size="sm">
                    <Link href="/teacher/students">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tüm Öğrenciler
                    </Link>
                </Button>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
                            <UserAvatar user={profile} className="h-24 w-24 text-4xl"/>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold">{profile.displayName}</h2>
                                <p className="text-muted-foreground">{profile.class}</p>
                            </div>
                            <div className="flex items-center gap-2 text-2xl font-bold text-amber-500">
                                <Star className="h-6 w-6"/>
                                <span>{profile.score?.toLocaleString() || 0} Puan</span>
                            </div>
                        </CardContent>
                    </Card>
                    <CourseProgress coursesProgress={coursesProgress} />
                    <QuestionBankStats questionBankStats={questionBankStats} />
                </div>
                <div className="lg:col-span-2">
                   <RecentActivityList recentActivity={recentActivity} />
                </div>
            </div>
        </div>
    );
}
