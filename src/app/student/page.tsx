
"use client";

import React, { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc, limit } from 'firebase/firestore';
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Backpack, Target, ClipboardList } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GlassCard = ({ href, icon, title, description, color, hoverColor, className, ...props }: { href: string, icon: ReactNode, title: string, description: string, color: string, hoverColor: string, className?: string, props?: any }) => (
    <Link href={href} className="block group h-full">
        <div className={cn("h-full w-full rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br text-white border border-white/10", color, hoverColor, className)} {...props}>
            {icon}
            <h3 className="font-bold text-xl mt-4 text-shadow-lg">{title}</h3>
            <p className="text-sm mt-1 text-white/80">{description}</p>
        </div>
    </Link>
);


function HardestWorkersToday() {
    const [dailyTop, setDailyTop] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLiveLeaderboard = useCallback(async () => {
        getLiveLeaderboard().then(data => {
            setDailyTop(data.slice(0, 3));
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        fetchLiveLeaderboard();
        const intervalId = setInterval(fetchLiveLeaderboard, 60000); // every 60 seconds
        return () => clearInterval(intervalId);
    }, [fetchLiveLeaderboard]);
    
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
                    Günün Efsaneleri
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
          const qbStats = getCourseQuestionBankStats(course.id, user.uid);
          
          let totalTopics = 0;
          let completedTopicsCount = 0;
          
            const unitsSnap = await getDocs(query(collection(db, 'courses', course.id, 'units')));
            for (const unitDoc of unitsSnap.docs) {
                 const topicsSnap = await getDocs(query(collection(db, 'courses', course.id, 'units', unitDoc.id, 'topics')));
                 totalTopics += topicsSnap.size;
            }
          
            const progressSnap = await getDoc(doc(db, 'users', user.uid, 'progress', course.id));
            if (progressSnap.exists()) {
                completedTopicsCount = (progressSnap.data().completedTopics || []).length;
                completedTopicsTotal += completedTopicsCount;
            }
          
            grandTotalTopics += totalTopics;
          
            course.progress = totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;
            course.topicsCount = totalTopics;
            course.unitsCount = unitsSnap.size;
            course.completedTopicsCount = completedTopicsCount;

            const questionBankStats = await qbStats;
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
    <>
    <div className="bg-[#0f041e] min-h-screen">
      <div className="p-4 sm:p-6 md:p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e] to-transparent z-0"></div>
        <div className="max-w-5xl mx-auto space-y-6 relative z-10 pb-20 md:pb-0">
          <div className="flex flex-row items-center gap-4 text-white">
              <UserAvatar user={user} className="h-20 w-20 text-3xl shrink-0" />
              <div className="space-y-1">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                  <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                    <Backpack className="h-4 w-4 text-indigo-300"/>
                    <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                  </div>
              </div>
              <div className="ml-auto text-right shrink-0">
                  <p className="text-4xl font-black text-amber-300 drop-shadow-lg">{stats.score.toLocaleString()}</p>
                  <p className="text-xs text-amber-100/80 uppercase tracking-widest">Toplam Puan</p>
              </div>
          </div>
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard 
                    href="/student/ders-haritasi"
                    icon={<BookOpen className="h-10 w-10 text-rose-300"/>} 
                    title="Ders Haritası"
                    description="Konuları sırayla tamamla, rozetleri topla."
                    color="from-rose-900/50 to-rose-800/50"
                    hoverColor="hover:border-rose-400/50"
                    className="md:col-span-3"
                />

                <GlassCard 
                    href="/student/activities"
                    icon={<Gamepad2 className="text-fuchsia-300"/>} 
                    title="Bireysel Etkinlikler"
                    description="Eğlenceli oyunlarla kendini sına ve puanları topla."
                    color="from-fuchsia-900/50 to-fuchsia-800/50"
                    hoverColor="hover:border-fuchsia-400/50"
                />

                <GlassCard 
                    href="/student/soru-bankasi"
                    icon={<ClipboardList className="text-sky-300"/>} 
                    title="Alıştırmalar"
                    description="Konu testleri çözerek kendini geliştir."
                    color="from-sky-900/50 to-sky-800/50"
                    hoverColor="hover:border-sky-400/50"
                />

                <GlassCard 
                    href="/student/deneme"
                    icon={<FileCog className="text-teal-300"/>} 
                    title="Deneme Sınavları"
                    description="Sana özel atanan denemeleri çöz, seviyeni gör."
                    color="from-teal-900/50 to-teal-800/50"
                    hoverColor="hover:border-teal-400/50"
                />

                 <GlassCard 
                    href="/student/yazilacaklar"
                    icon={<Columns className="text-lime-300"/>} 
                    title="Yazılacaklar"
                    description="Ders notlarını ve önemli kavramları görüntüle."
                    color="from-lime-900/50 to-lime-800/50"
                    hoverColor="hover:border-lime-400/50"
                />

                 <GlassCard 
                    href="/student/ozetler"
                    icon={<LayoutTemplate className="text-blue-300"/>} 
                    title="Özetler"
                    description="İnteraktif konu özetlerini ve sunumları keşfet."
                    color="from-blue-900/50 to-blue-800/50"
                    hoverColor="hover:border-blue-400/50"
                />
            </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default function StudentPage() {
    return <StudentDashboard />
}