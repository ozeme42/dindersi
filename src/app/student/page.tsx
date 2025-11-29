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
import { 
    BookOpen, Trophy, Star, Gamepad2, Users, 
    ShoppingCart, Columns, LayoutTemplate, FileCog, 
    Crown, Award, Zap, Target, Sparkles, Map as MapIcon, Swords, Backpack,
    Loader2, Home, User
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// --- GAMIFIED UI COMPONENTS ---

const GameButton = ({ 
    children, 
    className, 
    variant = 'primary', 
    href, 
    badge,
    ...props 
}: any) => {
    const variants: {[key: string]: string} = {
        primary: "bg-indigo-500 hover:bg-indigo-400 border-indigo-700 text-white shadow-indigo-900/40",
        secondary: "bg-rose-500 hover:bg-rose-400 border-rose-700 text-white shadow-rose-900/40",
        success: "bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white shadow-emerald-900/40",
        warning: "bg-amber-500 hover:bg-amber-400 border-amber-700 text-white shadow-amber-900/40",
        info: "bg-sky-500 hover:bg-sky-400 border-sky-700 text-white shadow-sky-900/40",
        violet: "bg-violet-600 hover:bg-violet-500 border-violet-800 text-white shadow-violet-900/40",
        orange: "bg-orange-500 hover:bg-orange-400 border-orange-700 text-white shadow-orange-900/40",
    };

    const baseClass = "relative w-full flex items-center justify-center font-bold uppercase tracking-wide transition-all duration-200 border-b-[6px] active:border-b-0 active:translate-y-[6px] rounded-2xl py-4 px-4 shadow-xl group cursor-pointer";
    
    const content = (
        <span className={cn(baseClass, variants[variant], className)} {...props}>
            {children}
            {badge && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white animate-bounce shadow-sm">
                    {badge}
                </span>
            )}
        </span>
    );

    if (href) {
        return <Link href={href} className="block h-full">{content}</Link>;
    }
    return <button className="block w-full h-full">{content}</button>;
};

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-md bg-white/10 border-2 border-white/20 rounded-3xl shadow-2xl overflow-hidden relative",
        className
    )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50"></div>
        {children}
    </div>
);


// --- COMPONENTS ---

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
        0: <Crown className="h-6 w-6 text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />,
        1: <Award className="h-6 w-6 text-slate-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />,
        2: <Award className="h-6 w-6 text-orange-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />,
    };

    return (
        <GlassCard className="bg-gradient-to-b from-slate-800/50 to-slate-900/50">
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-400" />
                <h3 className="font-bold text-white text-lg">Günün Efsaneleri</h3>
            </div>
            <div className="p-2">
                {isLoading ? (
                    <div className="space-y-2 p-2">
                        <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
                        <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
                        <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
                    </div>
                ) : dailyTop.length > 0 ? (
                    <div className="space-y-2">
                        {dailyTop.map((student, index) => (
                            <div key={student.uid} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 flex items-center justify-center bg-black/20 rounded-lg">
                                        {rankIcons[index]}
                                    </div>
                                    <UserAvatar user={student} className="w-10 h-10 border-2 border-white/20 text-slate-700"/>
                                    <div>
                                        <p className="font-bold text-white text-sm">{student.displayName}</p>
                                        <p className="text-white/50 text-xs">Seviye {Math.floor((student.score || 0) / 1000) + 1}</p>
                                    </div>
                                </div>
                                <div className="bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                                    <p className="font-bold text-amber-300 text-sm">{(student.score || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-white/50 py-6 italic">Bugün henüz kimse XP kazanmadı.</p>
                )}
            </div>
        </GlassCard>
    )
}

function StudentDashboard() {
  const { user } = useAuth();
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
          
          grandTotalTopics += totalTopics;
          
          const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
          const qbStats = getCourseQuestionBankStats(course.id, user.uid);
          
          const [progressSnap, questionBankStats] = await Promise.all([
            getDoc(progressRef),
            qbStats
          ]);

          const completedTopics = progressSnap.exists() ? (progressSnap.data() as any).completedTopics?.length || 0 : 0;
          completedTopicsTotal += completedTopics;
          
          totalQuestionBankPassedTests += questionBankStats.passedTests;
          totalQuestionBankTests += questionBankStats.totalTests;

          return course;
        }));
        
        const qbProgressPercentage = totalQuestionBankTests > 0 
            ? Math.round((totalQuestionBankPassedTests / totalQuestionBankTests) * 100)
            : 0;

        setStats({
            score: userScore,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
            coursesStarted: 0, // Simplified for now
            coursesCompleted: 0, // Simplified for now
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
        <div className="flex h-screen w-full items-center justify-center bg-[#2b1055]">
            <Loader2 className="h-16 w-16 animate-spin text-indigo-400" />
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
          
          {/* PLAYER HUD HEADER */}
           <GlassCard className="p-1 bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="p-1 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 shadow-lg shadow-amber-500/20">
                         <UserAvatar user={user} className="w-20 h-20 border-4 border-[#2b1055] text-slate-800 bg-white"/>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-400 shadow-sm">
                        LVL {Math.floor(stats.score / 1000) + 1}
                    </div>
                  </div>
                  
                  <div className="flex-grow text-center sm:text-left z-10 space-y-1">
                      <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                      <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Backpack className="h-4 w-4 text-indigo-300"/>
                        <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                      </div>
                  </div>
                  
                  <div className="text-center z-10 bg-black/30 p-3 rounded-2xl border border-white/10 min-w-[140px]">
                      <div className="flex items-center justify-center gap-2 text-3xl font-black text-amber-400 drop-shadow-sm">
                          <Star className="h-6 w-6 fill-amber-400 animate-pulse"/>
                          <span>{stats.score.toLocaleString()}</span>
                      </div>
                      <p className="text-xs uppercase tracking-widest text-amber-200/60 font-bold mt-1">Toplam Puan</p>
                  </div>
              </div>
          </GlassCard>
          
          {/* MAIN QUEST BOARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <Link href="/student/soru-bankasi" className="group h-full">
                 <GlassCard className="h-full bg-gradient-to-br from-sky-900/40 to-blue-900/40 hover:border-sky-400/50 transition-colors group-hover:bg-sky-900/30">
                      <div className="p-5 flex flex-col h-full relative">
                          <div className="absolute top-4 right-4 bg-sky-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                              <MapIcon className="h-8 w-8 text-sky-400" />
                          </div>
                          
                          <div className="mb-6">
                              <h2 className="text-2xl font-bold text-white mb-1">Macera Haritası</h2>
                              <p className="text-sky-200 text-sm">Dersler ve Soru Bankası</p>
                          </div>

                          <div className="mt-auto space-y-4">
                              <div>
                                  <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3"/> Ders İlerlemesi</span>
                                      <span>{lessonProgress}%</span>
                                  </div>
                                  <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000" style={{width: `${lessonProgress}%`}}></div>
                                  </div>
                              </div>
                              <div>
                                  <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                                      <span className="flex items-center gap-1"><Target className="h-3 w-3"/> Soru Bankası Başarısı</span>
                                      <span>{stats.questionBankProgress}%</span>
                                  </div>
                                  <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                      <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000" style={{width: `${stats.questionBankProgress}%`}}></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                 </GlassCard>
              </Link>
            
            <Link href="/leaderboard" className="group h-full">
                <GlassCard className="h-full bg-gradient-to-br from-amber-900/40 to-orange-900/40 hover:border-amber-400/50 transition-colors group-hover:bg-amber-900/30">
                    <div className="p-5 flex flex-col h-full relative">
                        <div className="absolute top-4 right-4 bg-amber-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                             <Trophy className="h-8 w-8 text-amber-400" />
                        </div>

                        <div className="mb-6">
                             <h2 className="text-2xl font-bold text-white mb-1">Şöhret Salonu</h2>
                             <p className="text-amber-200 text-sm">Liderlik Tablosu Sıralaman</p>
                        </div>
                        
                        <div className="mt-auto grid grid-cols-3 gap-2">
                             <div className="bg-black/30 rounded-xl p-3 flex flex-col items-center justify-center border border-white/5">
                                 <span className="text-2xl font-black text-white">{stats.generalRank > 0 ? `#${stats.generalRank}` : '-'}</span>
                                 <span className="text-[10px] uppercase text-amber-200/70 font-bold mt-1">Genel</span>
                             </div>
                             <div className="bg-black/30 rounded-xl p-3 flex flex-col items-center justify-center border border-white/5">
                                 <span className="text-2xl font-black text-white">{stats.classRank > 0 ? `#${stats.classRank}` : '-'}</span>
                                 <span className="text-[10px] uppercase text-amber-200/70 font-bold mt-1">Sınıf</span>
                             </div>
                             <div className="bg-black/30 rounded-xl p-3 flex flex-col items-center justify-center border border-white/5">
                                 <span className="text-2xl font-black text-white">{stats.branchRank > 0 ? `#${stats.branchRank}` : '-'}</span>
                                 <span className="text-[10px] uppercase text-amber-200/70 font-bold mt-1">Şube</span>
                             </div>
                        </div>
                    </div>
                </GlassCard>
            </Link>
          </div>

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
          
           {/* UTILITY BELT */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GameButton href="/student/yazilacaklar" variant="orange" className="text-sm flex flex-col md:flex-row gap-2 items-center">
                  <Columns className="h-5 w-5"/> <span>Yazılacaklar</span>
              </GameButton>
              <GameButton href="/student/ozetler" variant="primary" className="text-sm flex flex-col md:flex-row gap-2 items-center">
                  <LayoutTemplate className="h-5 w-5"/> <span>Özetler</span>
              </GameButton>
              <GameButton href="/student/shop" variant="success" className="text-sm flex flex-col md:flex-row gap-2 items-center">
                  <ShoppingCart className="h-5 w-5"/> <span>Puan Dükkanı</span>
              </GameButton>
              <GameButton 
                href="/student/deneme" 
                variant="violet" 
                className="text-sm flex flex-col md:flex-row gap-2 items-center"
                badge={examStats.pending > 0 ? `${examStats.pending} YENİ` : undefined}
              >
                  <FileCog className="h-5 w-5"/> <span>Deneme Sınavı</span>
              </GameButton>
          </div>
          
          <HardestWorkersToday />
          
        </div>
      </div>
    </div>
    </>
  );
}

export default function StudentPage() {
    return <StudentDashboard />;
}