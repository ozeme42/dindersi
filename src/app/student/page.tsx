"use client";

import React, { useState, useEffect, type ReactNode, useMemo, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, where, orderBy, getDoc, limit } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment, ScoreEvent } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Backpack, Target } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function GlassCard({
  href,
  icon,
  title,
  description,
  color,
  children
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className="block group h-full">
      <div
        className={cn(
          "bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center text-center h-full transition-all duration-300 group-hover:border-fuchsia-400/50 group-hover:-translate-y-1"
        )}
      >
        <div className={cn("p-4 rounded-full mb-4 bg-gradient-to-br", color)}>
            {React.cloneElement(icon as React.ReactElement, { className: "h-8 w-8 text-white drop-shadow-lg" })}
        </div>
        <h3 className="font-bold text-xl text-white">{title}</h3>
        <p className="text-indigo-200 text-sm mt-1">{description}</p>
        {children}
      </div>
    </Link>
  );
}


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
        <Card className="bg-card/80 backdrop-blur-sm shadow-xl col-span-1 md:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                    <Trophy className="h-6 w-6 text-amber-500"/>
                    Günün Efsaneleri
                </CardTitle>
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
      totalQuestionBankTests: 0,
      passedTests: 0,
      successRate: 0,
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
            const allClassesSnap = await getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc'), limit(1)));
            const firstClassEverId = allClassesSnap.docs[0]?.id;
            
            const isFirstClass = studentClassId === firstClassEverId;
            filteredCourses = studentVisibleCourses.filter(course =>
                !course.isTeacherOnly && (course.classId === studentClassId || (!course.classId && isFirstClass))
            );
        } else {
            filteredCourses = studentVisibleCourses.filter(course => !course.classId && !course.isTeacherOnly);
        }
        
        let totalQuestionBankPassedTests = 0;
        let totalQuestionBankTests = 0;
        let totalCorrectAnswers = 0;
        let totalAnsweredQuestions = 0;

        coursesData = await Promise.all(filteredCourses.map(async (course) => {
          let totalTopics = 0;
          let completedTopicsCount = 0;

          // Lesson Progress
          const unitsSnap = await getDocs(collection(db, 'courses', course.id, 'units'));
          for (const unitDoc of unitsSnap.docs) {
              const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
              totalTopics += topicsSnap.size;
          }
          const progressSnap = await getDoc(doc(db, 'users', user.uid, 'progress', course.id));
          if (progressSnap.exists()) {
              completedTopicsCount += (progressSnap.data().completedTopics || []).length;
          }

          completedTopicsTotal += completedTopicsCount;
          grandTotalTopics += totalTopics;
          
          course.progress = totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;

          // Question Bank Stats
          const qbStats = await getCourseQuestionBankStats(course.id, user.uid);
          
          totalQuestionBankTests += qbStats.totalTests;
          totalQuestionBankPassedTests += qbStats.passedTests;
          totalCorrectAnswers += qbStats.totalCorrect;
          totalAnsweredQuestions += qbStats.totalAnswered;

          return course;
        }));
        
        const coursesStartedCount = coursesData.filter(c => (c.progress || 0) > 0).length;
        const coursesCompletedCount = coursesData.filter(c => c.progress === 100).length;
        
        setCourses(coursesData);
        
        const qbProgressPercentage = totalQuestionBankTests > 0 
            ? Math.round((totalQuestionBankPassedTests / totalQuestionBankTests) * 100)
            : 0;

        const successRate = totalAnsweredQuestions > 0 ? Math.round((totalCorrectAnswers / totalAnsweredQuestions) * 100) : 0;

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
            totalQuestionBankTests: totalQuestionBankTests,
            passedTests: totalQuestionBankPassedTests,
            successRate,
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
        <div className="max-w-5xl mx-auto space-y-6 relative z-10 pb-20 md:pb-0">
          <Card className="bg-gradient-to-br from-indigo-800 to-fuchsia-700 text-primary-foreground shadow-2xl">
            <CardContent className="p-6">
                <div className="flex flex-row items-center gap-2">
                    <UserAvatar user={user} className="w-16 h-16"/>
                    <div className="flex-grow">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                        <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                          <Backpack className="h-4 w-4 text-indigo-300"/>
                          <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-3xl md:text-4xl font-black text-amber-300 drop-shadow-lg">
                            <Star className="h-7 w-7"/>
                            <span>{stats.score.toLocaleString()}</span>
                        </div>
                        <p className="text-xs opacity-80 text-amber-100 uppercase tracking-widest">Puan</p>
                    </div>
                </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard 
                    href="/student/soru-bankasi"
                    icon={<ClipboardList className="text-sky-300"/>} 
                    title="Alıştırmalar"
                    description="Konu testleri çözerek kendini geliştir."
                    color="from-sky-900/50 to-sky-800/50"
                >
                    <div className="w-full px-4 mt-4">
                        <div>
                            <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                                <span className="flex items-center gap-1"><Target className="h-3 w-3"/> İsabet Oranı</span>
                                <span>{stats.successRate}%</span>
                            </div>
                            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 rounded-full" style={{ width: `${stats.successRate}%`}}/>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard 
                    href="/student/yarismalar"
                    icon={<Gamepad2 className="text-fuchsia-300"/>} 
                    title="Yarışmalar"
                    description="Arkadaşlarınla yarış, zirveye oyna."
                    color="from-fuchsia-900/50 to-fuchsia-800/50"
                >
                     <div className="w-full px-4 mt-4">
                        <div>
                            <div className="flex justify-between text-xs font-bold text-fuchsia-100 mb-1 uppercase tracking-wide">
                                <span className="flex items-center gap-1"><Trophy className="h-3 w-3"/> Genel Sıralama</span>
                                <span>{stats.generalRank > 0 ? `${stats.generalRank}.` : '-'}</span>
                            </div>
                             <div className="flex justify-between text-xs font-bold text-fuchsia-100 mb-1 uppercase tracking-wide">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3"/> Sınıf Sıralaması</span>
                                <span>{stats.classRank > 0 ? `${stats.classRank}.` : '-'}</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard 
                    href="/student/deneme"
                    icon={<FileCog className="text-rose-300"/>} 
                    title="Deneme Sınavları"
                    description="Öğretmenin tarafından atanan sınavları çöz."
                    color="from-rose-900/50 to-rose-800/50"
                >
                    {examStats.pending > 0 ? (
                        <div className="mt-4 px-4 py-2 bg-rose-500/80 rounded-lg animate-pulse">
                            <p className="font-bold text-white">{examStats.pending} yeni deneme</p>
                        </div>
                    ) : (
                         <div className="mt-4 px-4 py-2 bg-black/20 rounded-lg">
                            <p className="font-bold text-rose-100">Yeni deneme yok</p>
                        </div>
                    )}
                </GlassCard>

                <GlassCard 
                    href="/student/activities"
                    icon={<Gamepad2 className="text-lime-300"/>} 
                    title="Bireysel Etkinlikler"
                    description="Eğlenceli oyunlarla kendini sına ve puanları topla."
                    color="from-lime-900/50 to-lime-800/50"
                />

                <GlassCard
                    href="/student/tekrar-et"
                    icon={<Repeat className="text-orange-300"/>}
                    title="Tekrar Et"
                    description="Yanlış yaptığın sorularla bilgilerini pekiştir."
                    color="from-orange-900/50 to-orange-800/50"
                />

                <GlassCard
                    href="/student/shop"
                    icon={<ShoppingCart className="text-teal-300"/>}
                    title="Puan Dükkanı"
                    description="Puanlarınla avatarını ve profilini özelleştir."
                    color="from-teal-900/50 to-teal-800/50"
                />

          </div>
          <HardestWorkersToday />
        </div>
      </div>
    </div>
  );
}

export default function StudentPage() {
  return <StudentDashboard />;
}
