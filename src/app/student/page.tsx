
'use client';

import React, { useState, useEffect, type ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Backpack, Swords, Map as MapIcon, Target } from 'lucide-react';
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

// Custom GlassCard definition
const GlassCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-2xl border border-white/10 bg-white/5 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-sm",
            className
        )}
        {...props}
    />
));
GlassCard.displayName = "GlassCard";

// Custom GameButton definition
interface GameButtonProps extends React.ComponentProps<typeof Link> {
    variant?: 'info' | 'secondary';
}

const GameButton = React.forwardRef<HTMLAnchorElement, GameButtonProps>(
    ({ className, variant, ...props }, ref) => {
      return (
        <Link
          ref={ref}
          className={cn(
            buttonVariants({ variant: 'default' }),
            "h-auto text-base font-bold transition-all transform hover:-translate-y-1 hover:shadow-2xl",
            variant === 'info' && "bg-sky-600 hover:bg-sky-700 text-white",
            variant === 'secondary' && "bg-rose-600 hover:bg-rose-700 text-white",
            className
          )}
          {...props}
        />
      );
    }
);
GameButton.displayName = "GameButton";


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
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  const lessonProgress = stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0;
  
  return (
    <div className="bg-[#0f041e] min-h-screen">
      <div className="p-4 sm:p-6 md:p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e] to-transparent z-0"></div>
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          
          {/* PLAYER HUD HEADER */}
           <GlassCard className="p-1 bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                  
                   <div className="relative shrink-0 w-24 h-24">
                        <div className="flex items-center justify-center overflow-hidden relative w-24 h-24 rounded-full">
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-rose-500 animate-spin-slow"></div>
                           <UserAvatar user={user} className="w-20 h-20 border-4 border-[#2b1055] text-slate-800 bg-white" />
                        </div>
                    </div>

                  <div className="flex-grow text-center sm:text-left">
                      <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                      <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Backpack className="h-4 w-4 text-indigo-300"/>
                        <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                      </div>
                  </div>
                  <div className="text-center sm:text-right shrink-0">
                      <p className="text-xs text-amber-200 uppercase font-bold tracking-widest">Puan</p>
                      <p className="text-5xl md:text-6xl font-black text-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.5)]">{stats.score.toLocaleString()}</p>
                  </div>
              </div>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10">
                    <div className="p-3 text-center">
                        <p className="text-2xl font-bold text-white">{stats.generalRank > 0 ? `${stats.generalRank}.` : '-'}</p>
                        <p className="text-xs font-semibold text-sky-200 uppercase">Genel Sıra</p>
                    </div>
                     <div className="p-3 text-center">
                        <p className="text-2xl font-bold text-white">{stats.classRank > 0 ? `${stats.classRank}.` : '-'}</p>
                        <p className="text-xs font-semibold text-sky-200 uppercase">Sınıf Sırası</p>
                    </div>
                     <div className="p-3 text-center">
                        <p className="text-2xl font-bold text-white">{stats.branchRank > 0 ? `${stats.branchRank}.` : '-'}</p>
                        <p className="text-xs font-semibold text-sky-200 uppercase">Şube Sırası</p>
                    </div>
                     <div className="p-3 text-center">
                        <p className="text-2xl font-bold text-white">{stats.completedTopics}</p>
                        <p className="text-xs font-semibold text-sky-200 uppercase">Tamamlanan Konu</p>
                    </div>
               </div>
               
                <div className="grid grid-cols-2 gap-px bg-white/10 rounded-b-xl overflow-hidden">
                      <div className="p-4 bg-black/30">
                          <GlassCard className="h-full">
                              <div>
                                  <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                                      <span className="flex items-center gap-1"><Target className="h-3 w-3"/> İsabet Oranı</span>
                                      <span>{stats.questionBankProgress}%</span>
                                  </div>
                                  <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                      <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full" style={{width: `${stats.questionBankProgress}%`}}></div>
                                  </div>
                              </div>
                          </GlassCard>
                      </div>
                      <div className="p-4 bg-black/30">
                           <GlassCard className="h-full">
                              <div>
                                  <div className="flex justify-between text-xs font-bold text-green-100 mb-1 uppercase tracking-wide">
                                      <span className="flex items-center gap-1"><MapIcon className="h-3 w-3"/> Ders İlerlemesi</span>
                                      <span>{lessonProgress}%</span>
                                  </div>
                                  <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" style={{width: `${lessonProgress}%`}}></div>
                                  </div>
                              </div>
                          </GlassCard>
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
          
          <HardestWorkersToday />
      </div>
    </div>
    </div>
  );
}
