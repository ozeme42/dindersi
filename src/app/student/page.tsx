
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

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, FileQuestion, ClipboardCheck, Award, Crown, Globe, School, Backpack, Map as MapIcon, Target, ClipboardList } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GlassCard = ({ href, icon, title, description, color }: { href: string, icon: ReactNode, title: string, description: string, color: string }) => (
    <Link href={href} className="block group h-full">
        <div className={cn(
            "bg-gradient-to-br rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center text-center h-48 hover:border-fuchsia-400/50 transition-all text-white backdrop-blur-md border-2 border-white/20 overflow-hidden relative",
            color
        )}>
            <div className="absolute top-4 right-4 bg-white/10 p-2 rounded-lg group-hover:scale-110 transition-transform">
                {icon}
            </div>
            
            <div className="mb-6 self-start">
                <h3 className="text-xl font-bold font-headline">{title}</h3>
                <p className="text-sm text-white/70 mt-1 line-clamp-2">{description}</p>
            </div>
            
            <div className="mt-auto self-end">
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </div>
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
        2: <Award className="h-7 w-7 text-orange-500" />,
    };

    return (
         <div className="backdrop-blur-md border-2 border-white/20 rounded-3xl shadow-2xl overflow-hidden relative bg-gradient-to-b from-slate-800/50 to-slate-900/50">
            <div className="p-5">
                <h2 className="text-xl font-bold text-white mb-4 font-headline flex items-center gap-2"><Trophy className="text-amber-400"/> Günün Efsaneleri</h2>
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-lg bg-white/10" />
                        <Skeleton className="h-12 w-full rounded-lg bg-white/10" />
                        <Skeleton className="h-12 w-full rounded-lg bg-white/10" />
                    </div>
                ) : dailyTop.length > 0 ? (
                     <div className="space-y-2">
                        {dailyTop.map((student, index) => (
                            <div key={student.uid} className="flex items-center justify-between py-2 px-3 transition-all bg-black/20 hover:bg-black/40 rounded-lg">
                                <div className="flex items-center gap-3 flex-grow min-w-0">
                                    <div className="h-8 w-8 flex items-center justify-center flex-shrink-0">
                                      {rankIcons[index]}
                                    </div>
                                    <UserAvatar user={student} className="w-10 h-10 flex-shrink-0"/>
                                    <div className="flex-grow">
                                      <p className="font-medium text-sm sm:text-base text-white">{student.displayName}</p>
                                      <p className="text-xs text-slate-400">Seviye {Math.floor((student.score || 0) / 100) + 1}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-base sm:text-lg text-amber-400 ml-4 flex-shrink-0">{(student.score || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-slate-400 py-4">Bugün henüz kimse puan kazanmadı.</p>
                )}
            </div>
        </div>
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
          const unitsRef = collection(db, 'courses', course.id, 'units');
          const unitsSnap = await getDocs(unitsRef);
          let totalTopics = 0;
          
          for (const unitDoc of unitsSnap.docs) {
            const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
            totalTopics += topicsSnap.size;
          }
          const progressSnap = await getDoc(doc(db, 'users', user.uid, 'progress', course.id));
          if (progressSnap.exists()) {
              completedTopicsTotal += (progressSnap.data().completedTopics || []).length;
          }

          grandTotalTopics += totalTopics;

          // Also get QB stats for this course
          const qbStats = await getCourseQuestionBankStats(course.id, user.uid);
          totalQuestionBankPassedTests += qbStats.passedTests;
          totalQuestionBankTests += qbStats.totalTests;

          return course;
        }));
        
        const qbProgressPercentage = totalQuestionBankTests > 0 
            ? Math.round((totalQuestionBankPassedTests / totalQuestionBankTests) * 100)
            : 0;
        

        setStats({
            score: userScore,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
            coursesStarted: 0,
            coursesCompleted: 0,
            totalCourses: 0,
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
          <div className="flex items-center gap-4">
              <UserAvatar user={user} className="w-20 h-20 border-4 border-[#2b1055]"/>
              
              <div className="flex-grow">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                  <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                    <Backpack className="h-4 w-4 text-indigo-300"/>
                    <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                  </div>
              </div>
              <div className="text-right flex-shrink-0">
                  <div className="flex items-center justify-end gap-2 text-3xl md:text-4xl font-bold text-amber-400 drop-shadow-lg">
                      <Star className="h-6 w-6 md:h-8 md:w-8"/>
                      <span>{stats.score.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-amber-200/80">Puan</p>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                 <div className="grid grid-cols-2 gap-4">
                    <GlassCard 
                        href="/student/soru-bankasi" 
                        icon={<ClipboardList className="text-sky-300"/>} 
                        title="Alıştırmalar"
                        description="Konu testleri çözerek kendini geliştir."
                        color="from-sky-900/50 to-sky-800/50"
                    />
                    <GlassCard 
                        href="/student/activities"
                        icon={<Gamepad2 className="text-fuchsia-300"/>} 
                        title="Bireysel Etkinlikler"
                        description="Eğlenceli oyunlarla kendini sına ve puanları topla."
                        color="from-fuchsia-900/50 to-fuchsia-800/50"
                    />
                 </div>
                 <div className="grid grid-cols-1 gap-4 mt-4">
                     <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border-2 border-white/20 rounded-3xl shadow-2xl p-5">
                          <h2 className="text-xl font-bold text-white mb-4 font-headline flex items-center gap-2"><MapIcon className="text-green-400"/> Ders Haritası</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                  <div className="flex justify-between text-xs font-bold text-green-100 mb-1 uppercase tracking-wide">
                                      <span>Konu İlerlemesi</span>
                                      <span>{lessonProgress}%</span>
                                  </div>
                                  <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" style={{width: `${lessonProgress}%`}}/>
                                  </div>
                              </div>
                              <div>
                                  <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                                      <span className="flex items-center gap-1"><Target className="h-3 w-3"/> İsabet Oranı</span>
                                      <span>{stats.questionBankProgress}%</span>
                                  </div>
                                  <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                      <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full" style={{width: `${stats.questionBankProgress}%`}}/>
                                  </div>
                              </div>
                          </div>
                      </div>
                 </div>
              </div>
               <div className="md:col-span-1">
                  <HardestWorkersToday />
              </div>
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
