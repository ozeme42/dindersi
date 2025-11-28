
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
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Orbit } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const StatCard = ({ title, value, subValue, icon, href, colorClass }: { title: string, value: string | number, subValue?: string, icon: ReactNode, href: string, colorClass: string }) => (
    <Link href={href} className="block group h-full">
        <Card className={cn("h-full text-white flex flex-col items-center justify-center text-center p-4 transition-all duration-300 transform hover:scale-105", colorClass)}>
            {React.cloneElement(icon as React.ReactElement, { className: "h-10 w-10 opacity-80" })}
            <p className="text-3xl font-bold mt-2">{value}</p>
            <p className="font-semibold text-sm">{title}</p>
            {subValue && <p className="text-xs opacity-90">{subValue}</p>}
        </Card>
    </Link>
);


export default function StudentDashboard() {
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

  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY, currentTarget } = e;
      const { clientWidth, clientHeight } = currentTarget as HTMLElement;
      const x = (clientX / clientWidth) * 2 - 1;
      const y = (clientY / clientHeight) * 2 - 1;

      scene.style.setProperty('--x', `${x * -5}px`);
      scene.style.setProperty('--y', `${y * -5}px`);
    };

    scene.addEventListener('mousemove', handleMouseMove);
    return () => scene.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
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

      const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot, examsSnapshot] = await Promise.all([
        getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
        getDocs(collection(db, "courses")),
        getDocs(query(collection(db, "users"), where("role", "==", "student"))),
        getStudentExams(user.uid),
      ]);
      
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

        const completedTopics = progressSnap.exists() ? progressSnap.data().completedTopics || [] : [];
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

        totalQuestionBankPassedTests += questionBankStats.passedTests;
        totalQuestionBankTests += questionBankStats.totalTests;

        return course;
      }));
      
      const coursesStartedCount = coursesData.filter(c => (c.progress || 0) > 0).length;
      const coursesCompletedCount = coursesData.filter(c => c.progress === 100).length;
      
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

  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#2b1055]">
            <Loader2 className="h-16 w-16 animate-spin text-white" />
        </div>
    );
  }

  const lessonProgress = stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0;
  
  return (
    <div ref={sceneRef} className="relative min-h-screen overflow-hidden p-4 sm:p-6 md:p-8 bg-[#2b1055]">
        <img src="https://firebasestudio.page.link/dde-degerler-oyunu-stars" alt="stars" className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-300 ease-out" style={{ transform: 'translate(var(--x), var(--y))' }}/>
        <img src="https://firebasestudio.page.link/dde-degerler-oyunu-moon" alt="moon" className="absolute top-0 left-0 w-full h-full object-cover mix-blend-screen transition-transform duration-300 ease-out" style={{ transform: 'translate(calc(var(--x) * 0.5), calc(var(--y) * 0.5))' }}/>
        <img src="https://firebasestudio.page.link/dde-degerler-oyunu-mountains-behind" alt="mountains_behind" className="absolute top-0 left-0 w-full h-full object-cover z-20 transition-transform duration-300 ease-out" style={{ transform: 'translate(calc(var(--x) * 0.2), calc(var(--y) * 0.2))' }}/>
        <div className="relative z-30 max-w-5xl mx-auto space-y-4 md:space-y-6 animate-fade-in-up">
           
           <div className="flex flex-col items-center gap-4 text-white">
                <div className="relative w-32 h-32 animate-pop-in">
                    <UserAvatar user={user} className="w-full h-full text-4xl"/>
                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-full h-12 w-12 flex items-center justify-center font-bold text-slate-900 text-xl border-2 border-slate-800 shadow-lg">
                        {Math.floor(stats.score / 1000)}
                    </div>
                </div>
                <div className="text-center">
                    <h1 className="text-3xl font-bold font-headline drop-shadow-lg">{user?.displayName}</h1>
                    <p className="text-sm opacity-80">{user?.class}</p>
                </div>
                 <div className="w-full max-w-sm space-y-1">
                    <div className="flex justify-between text-xs font-semibold px-1">
                        <span>Seviye {Math.floor(stats.score / 1000)}</span>
                        <span className="opacity-80">Seviye {Math.floor(stats.score / 1000) + 1}</span>
                    </div>
                    <Progress value={(stats.score % 1000) / 10} className="h-3 bg-white/20 [&>div]:bg-gradient-to-r [&>div]:from-amber-400 [&>div]:to-yellow-500" />
                 </div>
           </div>
           
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <StatCard title="Genel Sıralama" value={stats.generalRank > 0 ? `${stats.generalRank}.` : '-'} icon={<Globe />} href="/leaderboard" colorClass="bg-gradient-to-br from-blue-500 to-cyan-500" />
                <StatCard title="Sınıf Sıralaması" value={stats.classRank > 0 ? `${stats.classRank}.` : '-'} icon={<School />} href="/leaderboard" colorClass="bg-gradient-to-br from-green-500 to-teal-500" />
                <StatCard title="Şube Sıralaması" value={stats.branchRank > 0 ? `${stats.branchRank}.` : '-'} icon={<Users />} href="/leaderboard" colorClass="bg-gradient-to-br from-purple-500 to-indigo-500" />
                <StatCard title="Soru Bankası" value={`${stats.questionBankProgress}%`} subValue="Başarı" icon={<ClipboardCheck />} href="/student/soru-bankasi" colorClass="bg-gradient-to-br from-orange-500 to-amber-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <Button size="lg" className="h-24 text-lg flex-col gap-1 bg-cyan-600 hover:bg-cyan-700 shadow-lg" asChild>
                    <Link href="/student/activities"><Gamepad2 className="h-6 w-6"/> Bireysel Etkinlikler</Link>
                </Button>
                <Button size="lg" className="h-24 text-lg flex-col gap-1 bg-rose-600 hover:bg-rose-700 shadow-lg" asChild>
                    <Link href="/student/yarismalar"><Users className="h-6 w-6"/> Çok Oyunculu Arena</Link>
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <Button size="lg" className="h-20 text-md flex-col gap-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20" asChild>
                    <Link href="/student/yazilacaklar"><Columns className="h-5 w-5"/> Yazılacaklar</Link>
                </Button>
                <Button size="lg" className="h-20 text-md flex-col gap-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20" asChild>
                    <Link href="/student/ozetler"><LayoutTemplate className="h-5 w-5"/> Özetler</Link>
                </Button>
                <Button size="lg" className="h-20 text-md flex-col gap-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20" asChild>
                    <Link href="/student/shop"><ShoppingCart className="h-5 w-5"/> Puan Dükkanı</Link>
                </Button>
                <div className="relative">
                    <Button size="lg" className="w-full h-20 text-md flex-col gap-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20" asChild>
                        <Link href="/student/deneme"><FileCog className="h-5 w-5"/> Denemelerim</Link>
                    </Button>
                    {examStats.pending > 0 && (
                        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white animate-pulse">
                            {examStats.pending}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
