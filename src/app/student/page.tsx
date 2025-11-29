
"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc, getCountFromServer } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Backpack } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// --- HELPER COMPONENTS ---

const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: ReactNode }) => (
  <div className="bg-black/20 p-4 rounded-lg text-center backdrop-blur-sm">
    <div className="text-3xl font-bold">{value}</div>
    <div className="text-xs font-semibold opacity-80 flex items-center justify-center gap-1.5 mt-1">
      {icon}
      <span>{title}</span>
    </div>
  </div>
);

const GameButton = ({ href, children, className, variant }: { href: string, children: ReactNode, className?: string, variant: "orange" | "sky" | "fuchsia" | "info" }) => {
    const colorClasses = {
        orange: "bg-orange-500/80 hover:bg-orange-500 border-orange-400",
        sky: "bg-sky-500/80 hover:bg-sky-500 border-sky-400",
        fuchsia: "bg-fuchsia-500/80 hover:bg-fuchsia-500 border-fuchsia-400",
        info: "bg-blue-500/80 hover:bg-blue-500 border-blue-400",
    }
    return (
        <Button asChild className={cn("text-white font-bold h-20 text-lg transition-transform hover:scale-105 border-b-4", colorClasses[variant], className)}>
            <Link href={href}>
                {children}
            </Link>
        </Button>
    )
}

function StudentDashboard() {
  const { user } = useAuth();
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
          
          const [progressSnap, questionBankStats] = await Promise.all([
            getDoc(progressRef),
            getCourseQuestionBankStats(course.id, user.uid),
          ]);
          
          const progressData = progressSnap.exists() ? progressSnap.data() : { completedTopics: [] };
          const completedTopics = progressData.completedTopics || [];
          completedTopicsTotal += completedTopics.length;

          const unitsRef = collection(db, 'courses', course.id, 'units');
          const unitsSnap = await getDocs(unitsRef);
          let totalTopics = 0;

          for (const unitDoc of unitsSnap.docs) {
            const topicsSnap = await getCountFromServer(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
            totalTopics += topicsSnap.data().count;
          }
          
          grandTotalTopics += totalTopics;
          course.progress = totalTopics > 0 ? Math.round((completedTopics.length / totalTopics) * 100) : 0;

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
    <>
    <div className="w-full bg-slate-900 text-white md:p-8 p-4">
       <div className="max-w-7xl mx-auto">
          {/* USER INFO & STATS */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 md:p-6 relative overflow-hidden">
                <div className="flex-shrink-0">
                    <UserAvatar user={user} className="h-32 w-32 text-4xl border-4 border-white/20 shadow-lg"/>
                </div>
                <div className="flex-grow text-center sm:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center justify-center sm:justify-start gap-2">
                         <span>{user?.displayName}</span>
                        <span className="px-2 py-1 text-xs font-bold bg-yellow-400 text-yellow-900 rounded-full">LVL 84</span>
                    </h1>
                    <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10 mt-2">
                      <Backpack className="h-4 w-4 text-indigo-300" />
                      <span className="text-sm font-medium text-indigo-200">
                        {user?.class || 'Sınıfsız Gezgin'}
                      </span>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
                    <StatCard title="Toplam Puan" value={stats.score.toLocaleString()} icon={<Star className="h-6 w-6 opacity-80"/>} />
                    <StatCard title="Tamamlanan Konu" value={stats.completedTopics} icon={<CheckCircle2 className="h-6 w-6 opacity-80"/>} />
                    <StatCard title="Başarı Oranı" value={`${stats.questionBankProgress}%`} icon={<Trophy className="h-6 w-6 opacity-80"/>} />
                    <StatCard title="Genel Sıralama" value={stats.generalRank > 0 ? `${stats.generalRank}.` : '-'} icon={<Globe className="h-6 w-6 opacity-80"/>} />
                </div>
          </div>
        </div>
    </div>
    
    <div className="min-h-full bg-gradient-to-br from-primary/10 via-blue-50/50 to-rose-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-rose-950 p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

          {/* GAME MODES (PvE / PvP) */}
          <div className="grid grid-cols-2 gap-4 md:gap-6">
                <GameButton href="/student/activities" variant="info" className="text-xl flex-col gap-2 py-6 h-auto">
                    <Gamepad2 className="h-10 w-10 mb-1"/> 
                    <span>Etkinlikler</span>
                    <span className="text-[10px] opacity-70 font-normal normal-case">Arcade Modu</span>
                </GameButton>
                <GameButton href="/student/yarismalar" variant="fuchsia" className="text-xl flex-col gap-2 py-6 h-auto">
                    <Users className="h-10 w-10 mb-1"/>
                    <span>Yarışmalar</span>
                    <span className="text-[10px] opacity-70 font-normal normal-case">Çok Oyunculu</span>
                </GameButton>
          </div>

          {/* UTILITY BELT */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GameButton href="/student/yazilacaklar" variant="orange" className="text-sm flex flex-col md:flex-row gap-2 items-center">
                  <Columns className="h-5 w-5"/> <span>Yazılacaklar</span>
              </GameButton>
              <GameButton href="/student/ozetler" variant="primary" className="text-sm flex flex-col md:flex-row gap-2 items-center">
                  <LayoutTemplate className="h-5 w-5"/> <span>Özetler</span>
              </GameButton>
               <GameButton href="/student/tekrar-et" variant="sky" className="text-sm flex flex-col md:flex-row gap-2 items-center">
                   <Repeat className="h-5 w-5"/> <span>Tekrar Et</span>
                </GameButton>
              <Button asChild size="lg" className="h-full text-base sm:text-md flex-col gap-1 bg-green-600 hover:bg-green-700">
                  <Link href="/student/shop"><ShoppingCart className="h-5 w-5"/> <span>Puan Dükkanı</span></Link>
              </Button>
          </div>
          
      </div>
    </div>
    </>
  );
}

export default StudentDashboard;

