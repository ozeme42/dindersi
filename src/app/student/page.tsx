
"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc, limit } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Target, ClipboardList } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";


const GlassCard = ({ href, icon, title, description, color }: { href: string, icon: ReactNode, title: string, description: string, color: string }) => (
    <Link href={href} className="block group h-full">
        <div className={cn(
            "h-full w-full rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-fuchsia-500/30",
            "bg-gradient-to-br text-white border border-white/10",
            color
        )}>
            {React.cloneElement(icon as React.ReactElement, { className: "h-10 w-10 mb-3" })}
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-xs text-white/70 mt-1">{description}</p>
        </div>
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
        2: <Award className="h-7 w-7 text-orange-400" />,
    };

    return (
        <Card className="bg-card/80 backdrop-blur-sm shadow-xl md:col-span-2">
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
        
        const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
        const studentClassId = studentClass?.id;

        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
        
        let filteredCourses: Course[] = [];
        
        const classesQuery = query(collection(db, "classes"), orderBy("createdAt", "asc"));
        const allClassesSnap = await getDocs(classesQuery);
        const firstClassEverId = allClassesSnap.docs[0]?.id;

        if (studentClassId) {
            const isFirstClass = studentClassId === firstClassEverId;
            filteredCourses = studentVisibleCourses.filter(course =>
                !course.isTeacherOnly && (course.classId === studentClassId || (!course.classId && isFirstClass))
            );
        } else {
            filteredCourses = studentVisibleCourses.filter(course => !course.classId && !course.isTeacherOnly);
        }
        
        let totalQuestionBankPassedTests = 0;
        let totalQuestionBankTests = 0;

        coursesData = await Promise.all(filteredCourses.map(async (course) => {
          const unitsRef = collection(db, 'courses', course.id, 'units');
          const unitsSnap = await getDocs(unitsRef);
          let totalTopics = 0;
          
          for (const unitDoc of unitsSnap.docs) {
            const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
            totalTopics += topicsSnap.size;
          }
          
          const progressSnap = await getDoc(doc(db, 'users', user.uid, 'progress', course.id));
          const completedTopicsCount = progressSnap.exists() ? (progressSnap.data()?.completedTopics?.length || 0) : 0;
          completedTopicsTotal += completedTopicsCount;

          grandTotalTopics += totalTopics;
          course.progress = totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;
          
          const qbStats = await getCourseQuestionBankStats(course.id, user.uid);
          totalQuestionBankPassedTests += qbStats.passedTests;
          totalQuestionBankTests += qbStats.totalTests;

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
              {/* Player Header */}
              <div className="flex items-center gap-4 text-white">
                  <UserAvatar user={user} className="w-16 h-16 md:w-20 md:h-20 text-3xl"/>
                  <div className="flex-grow">
                      <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                      <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Package className="h-4 w-4 text-indigo-300"/>
                        <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                      </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                      <div className="flex items-center justify-end gap-2 text-3xl md:text-4xl font-black">
                          <Star className="h-6 w-6 text-yellow-300"/>
                          <span>{stats.score.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-yellow-200 uppercase tracking-widest">Toplam Puan</p>
                  </div>
              </div>
              
              {/* Grid Menu */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Link href="/student/soru-bankasi" className="block group md:col-span-3">
                     <div className="bg-gradient-to-br from-indigo-700/80 to-purple-800/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center text-center text-white h-full hover:border-fuchsia-400/50 transition-all">
                         <div className="grid grid-cols-3 gap-4 items-center w-full">
                            <div className="flex flex-col items-center gap-2 border-r border-white/10 pr-4">
                                <BookOpen className="h-10 w-10 text-purple-300"/>
                                 <p className="font-bold text-lg">Ders Haritası</p>
                            </div>
                            <div className="col-span-2 space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-purple-200 mb-1 uppercase tracking-wide">
                                        <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3"/> Konu İlerlemesi</span>
                                        <span>{lessonProgress}%</span>
                                    </div>
                                    <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                      <div className="h-full bg-gradient-to-r from-purple-400 to-fuchsia-400 rounded-full transition-all duration-500" style={{width: `${lessonProgress}%`}}/>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-sky-200 mb-1 uppercase tracking-wide">
                                        <span className="flex items-center gap-1"><Target className="h-3 w-3"/> İsabet Oranı</span>
                                        <span>{stats.questionBankProgress}%</span>
                                    </div>
                                    <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                       <div className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full transition-all duration-500" style={{width: `${stats.questionBankProgress}%`}}/>
                                    </div>
                                </div>
                            </div>
                         </div>
                     </div>
                 </Link>

                  <GlassCard 
                      href="/student/activities"
                      icon={<Gamepad2 className="text-fuchsia-300"/>} 
                      title="Bireysel Etkinlikler"
                      description="Eğlenceli oyunlarla kendini sına ve puanları topla."
                      color="from-fuchsia-900/50 to-fuchsia-800/50"
                  />
                   <GlassCard 
                      href="/student/soru-bankasi"
                      icon={<ClipboardList className="text-sky-300"/>} 
                      title="Alıştırmalar"
                      description="Konu testleri çözerek kendini geliştir."
                      color="from-sky-900/50 to-sky-800/50"
                  />
                  <GlassCard 
                      href="/student/tekrar-et"
                      icon={<Repeat className="text-orange-300"/>} 
                      title="Tekrar Et"
                      description="Yanlış yaptığın soruları tekrar çöz, bilgilerini pekiştir."
                      color="from-orange-900/50 to-orange-800/50"
                  />

                  <HardestWorkersToday />
              </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function StudentPage() {
    return (
        <div>
            <StudentDashboard/>
        </div>
    )
}

    