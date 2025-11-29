"use client";

import React, { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
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
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Target, Backpack, MapIcon, Home, User, PenSquare, Workflow, MonitorPlay, Settings, DollarSign, BrainCircuit, Milestone, Wind, Coins, Swords } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GlassCard = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "bg-[#1a0b2e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl",
            className
        )}
        {...props}
    />
));
GlassCard.displayName = 'GlassCard';

const GameButton = ({ href, variant, className, children }: { href: string, variant: 'info' | 'secondary', className?: string, children: React.ReactNode }) => {
  const baseClasses = "text-white/90 hover:text-white font-bold transition-all duration-300 transform hover:scale-105 shadow-lg rounded-2xl";
  const variantClasses = {
      info: "bg-gradient-to-br from-sky-500 to-indigo-600 hover:shadow-sky-400/30",
      secondary: "bg-gradient-to-br from-rose-500 to-fuchsia-600 hover:shadow-rose-400/30"
  };
  return (
      <Button asChild className={cn(baseClasses, variantClasses[variant], className)}>
          <Link href={href}>{children}</Link>
      </Button>
  );
};


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
    <div className="bg-[#0f041e] min-h-screen">
      <div className="p-4 sm:p-6 md:p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e] to-transparent z-0"></div>

        <div className="relative z-10 max-w-5xl mx-auto space-y-4 md:space-y-6">
          
          {/* PLAYER HUD HEADER */}
           <GlassCard className="p-1 bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                  
                  <div className="relative shrink-0">
                      <UserAvatar user={user} className="w-24 h-24 text-4xl border-4 border-white/10" />
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                      <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                      <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Backpack className="h-4 w-4 text-indigo-300"/>
                        <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 shrink-0">
                      <div>
                          <div className="flex justify-between text-xs font-bold text-green-100 mb-1 uppercase tracking-wide">
                              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3"/> Dersler</span>
                              <span>{lessonProgress}%</span>
                          </div>
                          <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-gradient-to-r from-green-400 to-cyan-400 rounded-full" style={{width: `${lessonProgress}%`}}></div>
                          </div>
                      </div>
                       <div>
                          <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                              <span className="flex items-center gap-1"><Target className="h-3 w-3"/> İsabet Oranı</span>
                              <span>{stats.questionBankProgress}%</span>
                          </div>
                          <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full" style={{width: `${stats.questionBankProgress}%`}}></div>
                          </div>
                      </div>
                       <div className="flex items-center gap-2 text-white">
                          <Trophy className="h-5 w-5 text-amber-300"/>
                          <span className="font-bold">{stats.generalRank > 0 ? `${stats.generalRank}.` : '-'}</span>
                          <span className="text-xs opacity-70">Genel</span>
                      </div>
                       <div className="flex items-center gap-2 text-white">
                          <Star className="h-5 w-5 text-yellow-300"/>
                          <span className="font-bold">{stats.score.toLocaleString()}</span>
                           <span className="text-xs opacity-70">Puan</span>
                      </div>
                  </div>
              </div>
          </GlassCard>

          {/* GAME MODES (PvE / PvP) */}
          <div className="grid grid-cols-2 gap-4 md:gap-6">
                <GameButton href="/student/activities" variant="info" className="flex flex-col gap-2 py-6 h-auto">
                    <Gamepad2 className="h-8 w-8 mb-1"/> 
                    <span>Etkinlikler</span>
                    <span className="text-[10px] opacity-70 font-normal normal-case">Arcade Modu</span>
                </GameButton>
                 <GameButton href="/student/yarismalar" variant="secondary" className="flex flex-col gap-2 py-6 h-auto">
                    <Swords className="h-8 w-8 mb-1"/> 
                    <span>Çok Oyunculu</span>
                    <span className="text-[10px] opacity-70 font-normal normal-case">PvP Arena</span>
                </GameButton>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Link href="/student/soru-bankasi" className="block group">
                  <GlassCard className="h-full">
                      <div className="p-5 flex flex-col h-full relative">
                          <div className="absolute top-4 right-4 bg-sky-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                              <MapIcon className="h-8 w-8 text-sky-400" />
                          </div>
                          
                          <div className="mb-6">
                              <h3 className="text-2xl font-bold text-white">Ders Haritası</h3>
                              <p className="text-white/60 text-sm">Konuları keşfet ve testleri çöz.</p>
                          </div>
                          
                          <div className="flex-grow space-y-4">
                               <ProgressStat label="Ders İlerlemesi" value={lessonProgress} color="bg-green-400" />
                               <ProgressStat label="Soru Bankası Başarısı" value={stats.questionBankProgress} color="bg-sky-400" />
                          </div>
                      </div>
                  </GlassCard>
              </Link>
              <HardestWorkersToday />
          </div>
      </div>
    </div>
  );
}

const ProgressStat = ({ label, value }: { label: string, value: number, color: string }) => (
    <div>
        <div className="flex justify-between text-xs text-white/70 mb-1">
            <span>{label}</span>
            <span>{value}%</span>
        </div>
        <Progress value={value} className="h-2 bg-black/30" indicatorClassName={color} />
    </div>
);

export default StudentDashboard;
