
"use client";

import React, { useState, useEffect, type ReactNode, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, where, orderBy, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Map as MapIcon, Backpack, CalendarCheck, Target, FileQuestion, Activity } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function StatCard({ icon, title, value, href }: { icon: React.ReactNode, title: string, value: string | number, href: string }) {
    return (
        <Link href={href} className="block group">
            <div className="bg-[#1a0b2e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center text-center h-full transition-all group-hover:bg-[#2b1055]/90 group-hover:border-purple-400/50">
                <div className="p-4 bg-purple-500/20 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <p className="text-4xl font-black text-white">{value}</p>
                <p className="text-sm font-semibold text-white/80 mt-1">{title}</p>
            </div>
        </Link>
    )
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
       <div className="backdrop-blur-md border-2 border-white/20 rounded-3xl shadow-2xl overflow-hidden relative bg-gradient-to-b from-slate-800/50 to-slate-900/50">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Trophy className="text-amber-400" />
                    Günün Efsaneleri
                </h2>
            </div>
            <div className="px-2 pb-2 space-y-1">
                {isLoading ? (
                    <div className="space-y-2 p-4">
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                ) : dailyTop.length > 0 ? (
                    dailyTop.map((student, index) => (
                        <div key={student.uid} className="flex items-center justify-between py-2 px-3 transition-all bg-black/20 hover:bg-black/40 border border-white/10 rounded-xl">
                            <div className="flex items-center gap-3 flex-grow min-w-0">
                                <div className="h-8 w-8 flex items-center justify-center flex-shrink-0">
                                  {rankIcons[index]}
                                </div>
                                <UserAvatar user={student} className="w-10 h-10 flex-shrink-0"/>
                                <div className="flex-grow">
                                  <p className="font-medium text-sm sm:text-base text-white truncate">{student.displayName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-base sm:text-lg text-amber-300 ml-4 flex-shrink-0">{(student.score || 0).toLocaleString()} Puan</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-white/50 py-4">Bugün henüz kimse puan kazanmadı.</p>
                )}
            </div>
        </div>
    )
}

function GlassCard({ href, icon, title, description, color, children, progressValue, progressText }: { href?: string; icon: ReactNode; title: string; description: string; color: string; children?: ReactNode, progressValue?: number; progressText?: string; }) {
    const content = (
        <div className={cn(
            "relative group h-full w-full rounded-3xl p-6 flex flex-col justify-between text-white/90 shadow-2xl border-2 border-white/20 overflow-hidden transition-all duration-300 backdrop-blur-md",
            "bg-gradient-to-br hover:border-white/40",
            color
        )}>
             <div className="absolute -top-10 -right-10 opacity-20 group-hover:opacity-30 group-hover:scale-125 transition-all duration-500">
                {React.cloneElement(icon as React.ReactElement, { className: "h-32 w-32" })}
            </div>
            <div className="relative z-10">
                <h3 className="text-2xl font-bold header-font">{title}</h3>
                <p className="text-white/70 mt-1">{description}</p>
            </div>
            <div className="relative z-10 mt-4">
                {progressValue !== undefined && (
                     <div>
                        <div className="flex justify-between text-xs font-semibold text-white/80 mb-1">
                            <span>İlerleme</span>
                            <span>{progressText}</span>
                        </div>
                        <Progress value={progressValue} className="h-2.5 bg-white/20 [&>div]:bg-white" />
                    </div>
                )}
                {children}
            </div>
        </div>
    );
    
    return href ? <Link href={href} className="block h-full">{content}</Link> : <div className="h-full">{content}</div>;
}


function StudentPage() {
  return <StudentDashboard />;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
      score: 0,
      completedTopics: 0,
      totalTopics: 0,
      questionBankProgress: 0,
  });
  const [examStats, setExamStats] = useState<{ pending: number, solved: number }>({ pending: 0, solved: 0 });
  const [isLoading, setIsLoading] = useState(true);

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

        const [classesSnapshot, allCoursesSnapshot, examsSnapshot] = await Promise.all([
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
          getDocs(collection(db, "courses")),
          getStudentExams(user.uid),
        ]);
        
        if (examsSnapshot.success && examsSnapshot.data) {
            const pending = examsSnapshot.data.filter(a => !a.solvedEvent).length;
            const solved = examsSnapshot.data.length - pending;
            setExamStats({ pending, solved });
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

        for (const course of filteredCourses) {
            const progressSnap = await getDoc(doc(db, 'users', user.uid, 'progress', course.id));
            const qbStats = await getCourseQuestionBankStats(course.id, user.uid);
            
            if (progressSnap.exists()) {
                completedTopicsTotal += (progressSnap.data().completedTopics || []).length;
            }
          
            const unitsRef = collection(db, 'courses', course.id, 'units');
            const unitsSnap = await getDocs(unitsRef);
            let totalTopics = 0;
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                totalTopics += topicsSnap.size;
            }
            grandTotalTopics += totalTopics;

            totalQuestionBankPassedTests += qbStats.passedTests;
            totalQuestionBankTests += qbStats.totalTests;
        }
        
        const qbProgressPercentage = totalQuestionBankTests > 0 
            ? Math.round((totalQuestionBankPassedTests / totalQuestionBankTests) * 100)
            : 0;

        setStats({
            score: userScore,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
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
        <div className="flex h-[calc(100vh-theme(height.16))] w-full items-center justify-center bg-[#0f041e]">
            <Loader2 className="h-16 w-16 animate-spin text-white" />
        </div>
    );
  }

  const lessonProgress = stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0;
  
  return (
    <div className="bg-[#0f041e] min-h-screen">
      <div className="p-4 sm:p-6 md:p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e] to-transparent z-0"></div>
        <div className="max-w-5xl mx-auto space-y-6 relative z-10 pb-20 md:pb-0">
          {/* USER HEADER */}
          <div className="flex items-center gap-4">
              <UserAvatar user={user} className="w-20 h-20 text-3xl"/>
              <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                       <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                       <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                         <Backpack className="h-4 w-4 text-indigo-300"/>
                        <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                      </div>
                  </div>
                   <p className="text-4xl font-black text-amber-300 drop-shadow-lg flex items-center gap-2">
                       <Star className="h-8 w-8 text-amber-400 fill-current"/>
                       <span>{stats.score.toLocaleString()}</span>
                   </p>
              </div>
          </div>
          
          {/* MAIN GRID */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <GlassCard 
                    href="/student/soru-bankasi"
                    icon={<ClipboardList className="text-sky-300"/>} 
                    title="Alıştırmalar"
                    description="Konu testleri çözerek kendini geliştir."
                    color="from-sky-900/50 to-sky-800/50"
                    progressValue={stats.questionBankProgress}
                    progressText={`${stats.questionBankProgress}% Başarı`}
                />
                 <GlassCard 
                    href="/student/ders"
                    icon={<BookOpen className="text-green-300"/>} 
                    title="Dersler"
                    description="Konu içeriklerini keşfet ve tamamla."
                    color="from-green-900/50 to-green-800/50"
                    progressValue={lessonProgress}
                    progressText={`${stats.completedTopics}/${stats.totalTopics} Konu`}
                />
                
                <Link href="/student/activities" className="block group">
                    <div className="bg-[#1a0b2e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center text-center h-48 hover:border-fuchsia-400/50 transition-all">
                        <div className="p-4 bg-fuchsia-500/20 rounded-full mb-3 group-hover:scale-110 transition-transform">
                            <Gamepad2 className="h-8 w-8 text-fuchsia-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Bireysel Etkinlikler</h3>
                        <p className="text-sm text-white/60 mt-1">Eğlenceli oyunlarla kendini sına ve puanları topla.</p>
                    </div>
                </Link>

                <div className="lg:col-span-3">
                    <HardestWorkersToday />
                </div>
                
                 <Link href="/student/deneme" className="block group relative md:col-span-2">
                     <GlassCard 
                        icon={<FileQuestion className="text-rose-300"/>} 
                        title="Deneme Sınavlarım"
                        description="Öğretmeninin atadığı denemeleri çöz."
                        color="from-rose-900/50 to-rose-800/50"
                    >
                         {examStats.pending > 0 && (
                            <Badge className="absolute top-4 right-4 bg-red-500 text-white animate-pulse">
                                {examStats.pending} Yeni
                            </Badge>
                        )}
                        <div className="flex justify-around text-center mt-2">
                             <div>
                                <p className="text-2xl font-bold">{examStats.pending}</p>
                                <p className="text-xs text-white/70">Bekleyen</p>
                            </div>
                             <div>
                                <p className="text-2xl font-bold">{examStats.solved}</p>
                                <p className="text-xs text-white/70">Çözülen</p>
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                 <GlassCard 
                    href="/student/yarismalar"
                    icon={<Users className="text-teal-300"/>} 
                    title="Yarışmalar"
                    description="Arkadaşlarınla takım veya bireysel yarış."
                    color="from-teal-900/50 to-teal-800/50"
                />

           </div>
        </div>
      </div>
    </div>
  );
}
