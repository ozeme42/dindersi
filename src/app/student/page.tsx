
"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
    ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, 
    ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, 
    ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, 
    FileCog, ClipboardCheck, Award, Crown, Globe, School, Backpack, Target, Swords
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";


function HardestWorkersToday() {
    const [dailyTop, setDailyTop] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getLiveLeaderboard().then(data => {
            setDailyTop(data.slice(0, 3));
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);
    
    const rankIcons: { [key: number]: React.ReactNode } = {
        0: <Crown className="h-7 w-7 text-yellow-400" />,
        1: <Award className="h-7 w-7 text-gray-400" />,
        2: <Award className="h-7 w-7 text-orange-500" />,
    };

    return (
        <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-amber-500"/>
                    Günün Çalışkanları
                </CardTitle>
                <CardDescription>Bugün en çok puan kazanan öğrenciler.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="space-y-4 p-6">
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                ) : dailyTop.length > 0 ? (
                     <div className="space-y-0">
                        {dailyTop.map((student, index) => (
                            <div key={student.uid} className="flex items-center justify-between py-3 px-4 transition-all hover:bg-muted/50 border-b last:border-b-0 last:rounded-b-lg">
                                <div className="flex items-center gap-3 flex-grow min-w-0">
                                    <div className="h-8 w-8 flex items-center justify-center flex-shrink-0">
                                      {rankIcons[index]}
                                    </div>
                                    <UserAvatar user={student} className="w-10 h-10 flex-shrink-0"/>
                                    <div className="flex-grow">
                                      <p className="font-medium text-sm sm:text-base">{student.displayName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-base sm:text-lg text-primary ml-4 flex-shrink-0">{(student.score || 0).toLocaleString()} Puan</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-4">Bugün henüz kimse puan kazanmadı.</p>
                )}
            </CardContent>
        </Card>
    )
}


export default function StudentDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
      score: 0,
      completedTopics: 0,
      totalTopics: 0,
      coursesStarted: 0,
      coursesCompleted: 0,
      totalCourses: 0,
      generalRank: 0,
      classRank: 0,
      branchRank: 0,
      questionBankProgress: 0,
  });
  const [examStats, setExamStats] = useState<{ pending: number, solved: number }>({ pending: 0, solved: 0 });

  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) {
          setIsLoading(false);
          return;
      };

      setIsLoading(true);
      
      try {
        let completedTopicsTotal = 0;
        let grandTotalTopics = 0;
        let studentClassName: string | undefined;
        let userScore = user.score || 0;
        
        studentClassName = user.class?.split(' - ')[0];

        let coursesData: Course[] = [];

        const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot, examsSnapshot] = await Promise.all([
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
          getDocs(collection(db, "courses")),
          getDocs(query(collection(db, "users"), where("role", "==", "student"))),
          getStudentExams(user.uid),
        ]);
        
        // Calculate exam stats
        if (examsSnapshot.success && examsSnapshot.data) {
            const pending = examsSnapshot.data.filter(a => !a.solvedEvent).length;
            const solved = examsSnapshot.data.length - pending;
            setExamStats({ pending, solved });
        }

        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & {uid: string}));

        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === user.uid) + 1;

        let classRank = 0;
        let branchRank = 0;

        if(user.class) {
            const gradeName = user.class.split(' - ')[0];
            const branchName = user.class;

            const studentsInGrade = allStudents.filter(s => s.class?.startsWith(gradeName));
            const sortedGradeStudents = [...studentsInGrade].sort((a,b) => (b.score || 0) - (a.score || 0));
            classRank = sortedGradeStudents.findIndex(s => s.uid === user.uid) + 1;

            const studentsInBranch = allStudents.filter(s => s.class === branchName);
            const sortedBranchStudents = [...studentsInBranch].sort((a,b) => (b.score || 0) - (a.score || 0));
            branchRank = sortedBranchStudents.findIndex(s => s.uid === user.uid) + 1;
        }

        const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const firstClassId = allClasses.length > 0 ? allClasses[0].id : null;
        
        const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
        const studentClassId = studentClass?.id;

        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
        
        let filteredCourses: Course[] = [];
        if (studentClassId) {
            const isFirstClass = studentClassId === firstClassId;
            filteredCourses = studentVisibleCourses.filter(course =>
                !course.isTeacherOnly && (course.classId === studentClassId || (!course.classId && isFirstClass))
            );
        } else {
            filteredCourses = studentVisibleCourses.filter(course => !course.classId && !course.isTeacherOnly);
        }
        
        let totalQuestionBankPassedTests = 0;
        let totalQuestionBankTests = 0;

        coursesData = await Promise.all(filteredCourses.map(async (course) => {
          const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
          const qbStats = getCourseQuestionBankStats(course.id, user.uid);
          
          const [progressSnap, questionBankStats] = await Promise.all([
            getDoc(progressRef),
            qbStats
          ]);

          const completedTopics = progressSnap.exists() ? (progressSnap.data() as UserProgress).completedTopics || [] : [];
          completedTopicsTotal += completedTopics.length;
          
          const unitsRef = collection(db, 'courses', course.id, 'units');
          const unitsSnap = await getDocs(unitsRef);
          let totalTopics = 0;
          
          for (const unitDoc of unitsSnap.docs) {
            const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
            totalTopics += topicsSnap.size;
          }
          
          grandTotalTopics += totalTopics;
          course.progress = totalTopics > 0 ? Math.round((completedTopics.length / totalTopics) * 100) : 0;
          course.topicsCount = totalTopics;
          course.unitsCount = unitsSnap.size;
          course.completedTopicsCount = completedTopics.length;

          // Also get QB stats for this course
          totalQuestionBankPassedTests += questionBankStats.passedTests;
          totalQuestionBankTests += questionBankStats.totalTests;

          return course;
        }));
        
        const coursesStartedCount = coursesData.filter(c => (c.progress || 0) > 0).length;
        const coursesCompletedCount = coursesData.filter(c => c.progress === 100).length;
        
        setCourses(coursesData);
        
        const qbProgressPercentage = totalQuestionBankTests > 0 
            ? Math.round((totalQuestionBankPassedTests / totalQuestionBankTests) * 100)
            : 0;

        setStats({
            score: userScore,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
            coursesStarted: coursesStartedCount,
            coursesCompleted: coursesCompletedCount,
            totalCourses: coursesData.length,
            generalRank,
            classRank,
            branchRank,
            questionBankProgress: qbProgressPercentage,
        });

      } catch (error) {
        console.error("Error fetching student dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [user]);
  
  if (isLoading) {
    return (
        <div className="flex h-[calc(100vh-theme(height.16))] w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  const lessonProgress = stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0;
  
  return (
    <div className="min-h-full bg-gradient-to-br from-primary/10 via-blue-50/50 to-rose-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-rose-950 p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          {/* Player Header */}
          <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-4 p-6 relative overflow-hidden">
                <div className="p-1.5 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 shadow-lg shadow-amber-500/20">
                    <UserAvatar user={user} className="w-24 h-24 border-4 border-primary text-slate-800 bg-white"/>
                </div>
                
                <div className="text-center z-10 space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                    <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Backpack className="h-4 w-4 text-indigo-300"/>
                        <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                    </div>
                </div>
                
                <div className="text-center z-10 bg-black/30 p-3 rounded-2xl border border-white/10 min-w-[140px]">
                    <div className="flex items-center justify-center gap-2 text-3xl font-black text-amber-400 drop-shadow-sm">
                        <Star className="h-6 w-6 fill-amber-400 animate-pulse"/>
                        <span>{stats.score.toLocaleString()}</span>
                    </div>
                    <p className="text-xs uppercase tracking-widest text-amber-200/60 font-bold mt-1">Toplam Puan</p>
                </div>
            </CardContent>
          </Card>
          
          {/* MAIN QUEST BOARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <Link href="/student/soru-bankasi" className="block group">
                 <Card className="h-full bg-primary text-white flex flex-col p-4 transition-all duration-300 transform hover:scale-105 shadow-lg">
                      <CardHeader className="p-2 items-center flex-row gap-2">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Map className="h-6 w-6 text-white/90" />
                        </div>
                        <CardTitle className="text-2xl">Macera Haritası</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-4">
                          <div>
                              <div className="flex justify-between text-xs font-semibold text-white/80 mb-1">
                                  <span>Tamamlanan Konu</span>
                                  <span>{lessonProgress}%</span>
                              </div>
                              <Progress value={lessonProgress} className="h-3 bg-white/30 [&>div]:bg-green-400" />
                          </div>
                          <div>
                              <div className="flex justify-between text-xs font-semibold text-white/80 mb-1">
                                  <span className="flex items-center gap-1"><Target className="h-3 w-3"/> Başarı Oranı</span>
                                  <span>{stats.questionBankProgress}%</span>
                              </div>
                              <Progress value={stats.questionBankProgress} className="h-3 bg-white/30 [&>div]:bg-amber-400"/>
                          </div>
                      </CardContent>
                 </Card>
              </Link>
            
            <Link href="/leaderboard" className="block group h-full">
                <Card className="h-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex flex-col p-4 transition-all duration-300 transform hover:scale-105 shadow-lg">
                    <CardHeader className="p-2 items-center flex-row gap-2">
                        <Trophy className="h-8 w-8 text-white/90" />
                        <CardTitle className="text-2xl">Liderlik Tablosu</CardTitle>
                    </CardHeader>
                     <CardContent className="flex-grow flex items-stretch justify-around w-full bg-black/20 rounded-lg backdrop-blur-sm p-2">
                        <div className="flex flex-grow flex-col items-center justify-center">
                            <p className="text-3xl sm:text-4xl font-bold">{stats.generalRank > 0 ? `#${stats.generalRank}` : '-'}</p>
                            <p className="text-xs opacity-90 flex items-center gap-1"><Globe className="h-3 w-3"/> Genel</p>
                        </div>
                        <div className="w-px bg-white/30 self-stretch" />
                        <div className="flex flex-grow flex-col items-center justify-center">
                            <p className="text-3xl sm:text-4xl font-bold">{stats.classRank > 0 ? `#${stats.classRank}` : '-'}</p>
                            <p className="text-xs opacity-90 flex items-center gap-1"><School className="h-3 w-3"/> Sınıf</p>
                        </div>
                        <div className="w-px bg-white/30 self-stretch" />
                        <div className="flex flex-grow flex-col items-center justify-center">
                            <p className="text-3xl sm:text-4xl font-bold">{stats.branchRank > 0 ? `#${stats.branchRank}` : '-'}</p>
                            <p className="text-xs opacity-90 flex items-center gap-1"><Users className="h-3 w-3"/> Şube</p>
                        </div>
                    </CardContent>
                </Card>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/student/activities" className="block group">
              <Card className="h-full bg-cyan-600 text-white flex flex-col items-center justify-center text-center p-4 transition-all duration-300 transform hover:scale-105 shadow-lg">
                <Gamepad2 className="h-10 w-10 sm:h-12 sm:w-12 opacity-80" />
                <p className="text-lg sm:text-xl font-bold mt-2">Etkinlikler</p>
              </Card>
            </Link>
            <Link href="/student/yarismalar" className="block group">
              <Card className="h-full bg-rose-600 text-white flex flex-col items-center justify-center text-center p-4 transition-all duration-300 transform hover:scale-105 shadow-lg">
                <Swords className="h-10 w-10 sm:h-12 sm:w-12 opacity-80" />
                <p className="text-lg sm:text-xl font-bold mt-2">Çok Oyunculu</p>
              </Card>
            </Link>
          </div>
          
           {/* UTILITY BELT */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="relative">
                <Button size="lg" asChild className="w-full h-20 text-md flex-col gap-1 bg-orange-500 hover:bg-orange-600">
                    <Link href="/student/yazilacaklar"><Columns className="h-5 w-5"/> Yazılacaklar</Link>
                </Button>
              </Card>
              <Card className="relative">
                <Button size="lg" asChild className="w-full h-20 text-md flex-col gap-1 bg-sky-500 hover:bg-sky-600">
                    <Link href="/student/ozetler"><LayoutTemplate className="h-5 w-5"/> Özetler</Link>
                </Button>
              </Card>
              <Card className="relative">
                <Button size="lg" asChild className="w-full h-20 text-md flex-col gap-1 bg-green-600 hover:bg-green-700">
                    <Link href="/student/shop"><ShoppingCart className="h-5 w-5"/> Dükkan</Link>
                </Button>
              </Card>
              <Card className="relative">
                <Button size="lg" asChild className="w-full h-20 text-md flex-col gap-1 bg-violet-600 hover:bg-violet-700">
                    <Link href="/student/deneme">
                        <FileCog className="h-5 w-5"/> Deneme Sınavlarım
                    </Link>
                </Button>
                {examStats.pending > 0 && (
                    <Badge className="absolute top-2 right-2 bg-red-500 text-white animate-pulse">
                        {examStats.pending} Yeni
                    </Badge>
                )}
                 <CardFooter className="absolute bottom-0 left-0 right-0 p-1 bg-black/20 text-white text-xs text-center">
                    Çözülen: {examStats.solved}
                </CardFooter>
              </Card>
          </div>
          
          <HardestWorkersToday />
          
      </div>
    </div>
  );
}

    