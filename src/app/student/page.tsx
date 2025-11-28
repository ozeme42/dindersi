"use client";

import React, { useState, useEffect, type ReactNode, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Milestone, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, Layers, FolderKanban, MousePointerClick, Link2, Mic, Pencil, Wind, Coins, BrainCircuit } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const StatCard = ({ title, value, subValue, icon, href }: { title: string, value: string | number, subValue?: string, icon: ReactNode, color?: string, href: string }) => (
    <Link href={href} className="block group h-full">
        <Card className={cn(
            "h-full text-white flex flex-col items-center justify-center text-center p-4 transition-all duration-300 transform hover:scale-105",
            "bg-primary" // Default color
        )}>
            {React.cloneElement(icon as React.ReactElement, { className: "h-12 w-12 opacity-80" })}
            <p className="text-4xl font-bold mt-2">{value}</p>
            <p className="font-semibold">{title}</p>
            {subValue && <p className="text-xs opacity-90">{subValue}</p>}
        </Card>
    </Link>
);


export default function StudentDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
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
  const [dailyTop, setDailyTop] = useState<UserProfile[]>([]);

  const fetchData = useCallback(async () => {
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

      const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot, examsSnapshot, liveLeaderboard] = await Promise.all([
        getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
        getDocs(collection(db, "courses")),
        getDocs(query(collection(db, "users"), where("role", "==", "student"))),
        getStudentExams(user.uid),
        getLiveLeaderboard(),
      ]);
      
      setDailyTop(liveLeaderboard.slice(0, 3));
      
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

        const completedTopics = progressSnap.exists() ? (progressSnap.data() as any).completedTopics || [] : [];
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
  }, [user]);
  
  useEffect(() => {
      fetchData();
  }, [fetchData]);
  
  const lessonProgress = stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0;
  
  const rankIcons: { [key: number]: React.ReactNode } = {
      0: <Crown className="h-7 w-7 text-yellow-400" />,
      1: <Award className="h-7 w-7 text-gray-400" />,
      2: <Award className="h-7 w-7 text-orange-500" />,
  };
  
  if (isLoading) {
    return (
        <div className="flex h-[calc(100vh-theme(height.16))] w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2b1055] overflow-hidden font-body">
        <section className="relative flex items-center justify-center h-screen p-4 overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1b0738] to-[#2b1055] z-0"/>
            <img src="https://firebasestudio.page.link/ddegerler-oyunu-stars" id="stars" alt="stars" className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none z-10" />
            <img src="https://firebasestudio.page.link/ddegerler-oyunu-moon" id="moon" alt="moon" className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none mix-blend-screen z-20" />
            <img src="https://firebasestudio.page.link/ddegerler-oyunu-mountains-behind" alt="mountains" className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none z-30" />

            <div className="z-40 relative flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
                
                {/* Character Vitrine */}
                <div className="relative flex flex-col items-center animate-pop-in">
                    <UserAvatar user={user} className="w-40 h-40 border-4 border-white shadow-2xl" />
                    <div className="absolute -bottom-10 bg-black/30 backdrop-blur-md px-6 py-2 rounded-xl border border-white/20">
                         <h1 className="text-2xl font-bold font-headline text-white">{user?.displayName}</h1>
                         <p className="text-center text-sm font-semibold text-yellow-300">Seviye {Math.floor((stats.score || 0) / 1000) + 1}</p>
                    </div>
                </div>
                
                 {/* XP Bar */}
                <div className="w-full max-w-lg space-y-2 pt-8 animate-fade-in-up" style={{ animationDelay: '0.2s'}}>
                    <div className="flex justify-between items-end text-white/90 px-1">
                        <div className="flex items-center gap-2">
                             <Star className="h-6 w-6 text-yellow-400 fill-yellow-400"/>
                             <span className="text-2xl font-bold">{stats.score.toLocaleString()}</span>
                        </div>
                        <span className="text-sm font-semibold">Sonraki Seviye: {((Math.floor((stats.score || 0) / 1000) + 1) * 1000).toLocaleString()}</span>
                    </div>
                    <Progress value={((stats.score || 0) % 1000) / 10} className="h-4 [&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-amber-500" />
                </div>
                
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in-up" style={{ animationDelay: '0.4s'}}>
                    {/* Leaderboard Card */}
                     <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Trophy/> Sıralama</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-around text-center">
                                <div>
                                    <p className="text-4xl font-bold">{stats.generalRank > 0 ? `${stats.generalRank}.` : '-'}</p>
                                    <p className="text-xs opacity-80 flex items-center gap-1"><Globe className="h-3 w-3"/> Genel</p>
                                </div>
                                 <div>
                                    <p className="text-4xl font-bold">{stats.classRank > 0 ? `${stats.classRank}.` : '-'}</p>
                                    <p className="text-xs opacity-80 flex items-center gap-1"><School className="h-3 w-3"/> Sınıf</p>
                                </div>
                                 <div>
                                    <p className="text-4xl font-bold">{stats.branchRank > 0 ? `${stats.branchRank}.` : '-'}</p>
                                    <p className="text-xs opacity-80 flex items-center gap-1"><Users className="h-3 w-3"/> Şube</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="ghost" className="w-full text-white/80 hover:text-white hover:bg-white/10">
                                <Link href="/leaderboard">Liderlik Tablosuna Git <ArrowRight className="ml-2 h-4 w-4"/></Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Progress Card */}
                    <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2"><ClipboardCheck/> İlerleme</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-white/80 mb-1">
                                    <span>Ders İlerlemesi</span>
                                    <span>{lessonProgress}%</span>
                                </div>
                                <Progress value={lessonProgress} className="h-3 bg-white/30 [&>div]:bg-green-400" />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-white/80 mb-1">
                                    <span>Soru Bankası Başarısı</span>
                                    <span>{stats.questionBankProgress}%</span>
                                </div>
                                <Progress value={stats.questionBankProgress} className="h-3 bg-white/30 [&>div]:bg-amber-400"/>
                            </div>
                        </CardContent>
                         <CardFooter>
                            <Button asChild variant="ghost" className="w-full text-white/80 hover:text-white hover:bg-white/10">
                                <Link href="/student/soru-bankasi">Soru Bankasına Git <ArrowRight className="ml-2 h-4 w-4"/></Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                 <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                    <Button size="lg" className="h-20 text-md flex-col gap-1 bg-gradient-to-br from-cyan-500 to-blue-600 text-white" asChild>
                        <Link href="/student/activities"><Gamepad2 className="h-5 w-5"/> Etkinlikler</Link>
                    </Button>
                    <Button size="lg" className="h-20 text-md flex-col gap-1 bg-gradient-to-br from-rose-500 to-pink-600 text-white" asChild>
                        <Link href="/student/yarismalar"><Users className="h-5 w-5"/> Arena</Link>
                    </Button>
                    <Card className="relative col-span-1">
                        <Button size="lg" className="w-full h-20 text-md flex-col gap-1 bg-gradient-to-br from-violet-500 to-purple-600 text-white" asChild>
                            <Link href="/student/deneme">
                                <FileCog className="h-5 w-5"/> Denemeler
                            </Link>
                        </Button>
                        {examStats.pending > 0 && (
                            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white animate-pulse">
                                {examStats.pending}
                            </Badge>
                        )}
                    </Card>
                    <Button size="lg" className="h-20 text-md flex-col gap-1 bg-gradient-to-br from-amber-500 to-orange-600 text-white" asChild>
                        <Link href="/student/shop"><ShoppingCart className="h-5 w-5"/> Dükkan</Link>
                    </Button>
                </div>
            </div>

            <img src="https://firebasestudio.page.link/ddegerler-oyunu-mountains-front" alt="mountains" className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none z-50" />
        </section>
    </div>
  );
}
