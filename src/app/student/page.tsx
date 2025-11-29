
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, where, orderBy, getDoc, limit } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, ClipboardList, Target, Backpack } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";


function GlassCard({ href, icon, title, description, color, children, progress }: { href: string; icon: React.ReactNode; title: string; description: string; color: string; children?: React.ReactNode, progress?: number }) {
  return (
    <Link href={href} className="block group h-full">
      <div className={cn("bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center text-center h-full hover:border-fuchsia-400/50 transition-all", color)}>
        <div className="mb-4">
          {icon}
        </div>
        <h3 className="font-black text-xl text-white tracking-tight">{title}</h3>
        <p className="text-white/70 text-sm mt-1 mb-4 flex-grow">{description}</p>
        {children}
         {progress !== undefined && (
            <div className="w-full mt-auto pt-4">
                <div className="flex justify-between text-xs font-bold text-white/60 mb-1">
                    <span>İlerleme</span>
                    <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-green-400" style={{ width: `${progress}%` }} />
                </div>
            </div>
        )}
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
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 text-white">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-fuchsia-300">
                    <Trophy className="h-6 w-6"/>
                    Günün Efsaneleri
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="space-y-2 p-6">
                        <Skeleton className="h-12 w-full rounded-lg bg-white/10" />
                        <Skeleton className="h-12 w-full rounded-lg bg-white/10" />
                        <Skeleton className="h-12 w-full rounded-lg bg-white/10" />
                    </div>
                ) : dailyTop.length > 0 ? (
                     <div className="space-y-0">
                        {dailyTop.map((student, index) => (
                            <div key={student.uid} className="flex items-center justify-between py-3 px-4 transition-all hover:bg-white/5 border-b border-white/10 last:border-b-0">
                                <div className="flex items-center gap-3 flex-grow min-w-0">
                                    <div className="h-8 w-8 flex items-center justify-center flex-shrink-0">
                                      {rankIcons[index]}
                                    </div>
                                    <UserAvatar user={student} className="w-10 h-10 flex-shrink-0"/>
                                    <div className="flex-grow">
                                      <p className="font-medium text-sm sm:text-base truncate">{student.displayName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-base sm:text-lg text-fuchsia-300 ml-4 flex-shrink-0">{(student.score || 0).toLocaleString()} Puan</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-white/60 py-8 px-4">Bugün henüz kimse puan kazanmadı. İlk efsane sen ol!</p>
                )}
            </CardContent>
        </Card>
    )
}


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
          getDocs(query(collection(db, "users"), where("role", "in", ["student", "guest"]))),
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
        
        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
        
        let filteredCourses: Course[] = [];
        if (studentClassName) {
            const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
            const studentClassId = studentClass?.id;
            
            // This logic is complex, might need review. What if there are more than 1 class?
            // This assumes the first class created is the "base" for general courses.
            const allClassesSnap = await getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc'), limit(1)));
            const firstClassEverId = allClassesSnap.docs[0]?.id;
            
            if (studentClassId) { 
                const isFirstClass = studentClassId === firstClassEverId;
                filteredCourses = studentVisibleCourses.filter(course =>
                    !course.isTeacherOnly && (course.classId === studentClassId || (!course.classId && isFirstClass))
                );
            } else { 
                filteredCourses = studentVisibleCourses.filter(course => !course.classId && !course.isTeacherOnly);
            }
        } else {
             filteredCourses = studentVisibleCourses.filter(course => !course.classId && !course.isTeacherOnly);
        }
        
        let passedTests = 0;
        let totalQuestionBankTests = 0;

        coursesData = await Promise.all(filteredCourses.map(async (course) => {
            let totalTopics = 0;
            let completedTopics = 0;

            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`)));
                totalTopics += topicsSnap.size;
            }
            
            const progressSnap = await getDoc(doc(db, 'users', user.uid, 'progress', course.id));
            if (progressSnap.exists()) {
                completedTopics = (progressSnap.data().completedTopics || []).length;
            }
            
            completedTopicsTotal += completedTopics;
            grandTotalTopics += totalTopics;

            course.progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
            course.topicsCount = totalTopics;
            course.unitsCount = unitsSnap.size;
            course.completedTopicsCount = completedTopics;
            
            const qbStats = await getCourseQuestionBankStats(course.id, user.uid);
            passedTests += qbStats.passedTests;
            totalQuestionBankTests += qbStats.totalTests;

            return course;
        }));
        
        const coursesStartedCount = coursesData.filter(c => (c.progress || 0) > 0).length;
        const coursesCompletedCount = coursesData.filter(c => c.progress === 100).length;
        
        setCourses(coursesData);
        
        const qbProgressPercentage = totalQuestionBankTests > 0 
            ? Math.round((passedTests / totalQuestionBankTests) * 100)
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
    <div className="bg-[#0f041e] min-h-screen">
      <div className="p-4 sm:p-6 md:p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e] to-transparent z-0"></div>
        <div className="max-w-5xl mx-auto space-y-6 relative z-10 pb-20 md:pb-0">
          {/* Player Header */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-white">
              <UserAvatar user={user} className="w-24 h-24 text-4xl border-4 border-white/20 shadow-lg"/>
              <div className="text-center sm:text-left">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                  <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                    <Backpack className="h-4 w-4 text-indigo-300"/>
                    <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                  </div>
              </div>
              <div className="flex-grow"/>
              <div className="text-center sm:text-right">
                  <div className="flex items-center justify-center sm:justify-end gap-2 text-4xl font-black text-amber-300 drop-shadow-lg">
                      <Star className="h-8 w-8"/>
                      <span>{stats.score.toLocaleString()}</span>
                  </div>
                  <p className="text-sm opacity-80 font-medium">Toplam Puan</p>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard 
                    href="/student/ders-haritasi"
                    icon={<BookOpen className="h-10 w-10 text-cyan-300"/>} 
                    title="Ders Haritası"
                    description="Tüm derslerini, ünitelerini ve konularını buradan takip et."
                    color="from-cyan-900/50 to-cyan-800/50"
                    progress={lessonProgress}
                />
                <GlassCard 
                    href="/student/soru-bankasi"
                    icon={<ClipboardList className="text-sky-300"/>} 
                    title="Alıştırmalar"
                    description="Konu testleri çözerek kendini geliştir."
                    color="from-sky-900/50 to-sky-800/50"
                    progress={stats.questionBankProgress}
                />
                 <GlassCard 
                    href="/student/activities"
                    icon={<Gamepad2 className="h-10 w-10 text-rose-300"/>} 
                    title="Bireysel Etkinlikler"
                    description="Eğlenceli oyunlarla kendini sına ve puanları topla."
                    color="from-rose-900/50 to-rose-800/50"
                />
          </div>
          
          <HardestWorkersToday />
          
        </div>
      </div>
    </div>
    </>
  );
}
