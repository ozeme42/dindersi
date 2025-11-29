
"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Map, Swords, Backpack, Target } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLiveLeaderboard } from "@/app/leaderboard/actions";

// --- GAMIFIED UI COMPONENTS ---

const GlassCard = ({ href, icon, title, description, color, badge, children }: { href?: string, icon: ReactNode, title: string, description: string, color: string, badge?: string | number, children?: ReactNode }) => {
    const content = (
        <div className={cn(
            "h-full w-full rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-fuchsia-500/30 bg-gradient-to-br text-white border border-white/10",
            color
        )}>
            <div className="flex items-center justify-center gap-4 mb-4">
                <div className="bg-black/30 p-3 rounded-full group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                 <div className="text-left">
                    <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
                    <p className="text-white/70 text-sm">{description}</p>
                </div>
            </div>

            {children}

            <div className="flex-grow" />
            <ArrowRight className="mt-4 h-6 w-6 group-hover:translate-x-1 transition-transform self-end" />
            
            {badge && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white animate-bounce shadow-sm">
                    {badge}
                </span>
            )}
        </div>
    );
    if (href) {
        return <Link href={href} className="block group h-full">{content}</Link>;
    }
    return <div className="h-full">{content}</div>;
};

// --- MOCK DATA & UTILS ---

const MOCK_LEADERBOARD = [
    { uid: '1', displayName: 'Zeynep Yılmaz', score: 18500, class: '6-A' },
    { uid: '2', displayName: 'Ahmet Demir', score: 17200, class: '6-B' },
    { uid: '3', displayName: 'Ayşe Kaya', score: 16800, class: '6-A' },
];

const MOCK_EXAM_STATS = {
    pending: 2,
    solved: 8
};

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
        <GlassCard icon={<Trophy className="h-8 w-8 text-amber-400" />} title="Günün Efsaneleri" description="Bugün en çok puan kazananlar" color="from-slate-800/50 to-slate-900/50">
            <div className="w-full mt-4">
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

export default function StudentDashboard() {
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
  const [examStats, setExamStats] = useState(MOCK_EXAM_STATS);

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
          const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
          
          const [progressSnap] = await Promise.all([
            getDoc(progressRef),
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

          return course;
        }));
        
        const coursesStartedCount = coursesData.filter(c => (c.progress || 0) > 0).length;
        const coursesCompletedCount = coursesData.filter(c => c.progress === 100).length;
        
        setStats(prev => ({
            ...prev,
            score: userScore,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
            coursesStarted: coursesStartedCount,
            coursesCompleted: coursesCompletedCount,
            totalCourses: coursesData.length,
            generalRank,
            classRank,
            branchRank,
        }));

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
    <div className="min-h-full bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black p-4 sm:p-6 md:p-8 pb-32 md:pb-12 text-white font-sans selection:bg-purple-500/30">
      <div className="max-w-5xl mx-auto space-y-6">
          
          {/* PLAYER HUD HEADER */}
           <GlassCard className="p-1 bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="p-1.5 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 shadow-lg shadow-amber-500/20">
                         <UserAvatar user={user} className="w-24 h-24 border-4 border-[#2b1055] text-slate-800 bg-white"/>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-sm font-bold px-3 py-1 rounded-full border-2 border-indigo-400 shadow-sm">
                        LVL {Math.floor(stats.score / 1000) + 1}
                    </div>
                  </div>
                  
                  <div className="flex-grow text-center sm:text-left z-10 space-y-2">
                      <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                      <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Backpack className="h-4 w-4 text-indigo-300"/>
                        <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                      </div>
                  </div>
                  
                  <div className="text-center z-10 bg-black/30 p-4 rounded-2xl border border-white/10 min-w-[160px] shadow-lg">
                      <div className="flex items-center justify-center gap-2 text-4xl font-black text-amber-400 drop-shadow-sm">
                          <Star className="h-7 w-7 fill-amber-400 animate-pulse"/>
                          <span>{stats.score.toLocaleString()}</span>
                      </div>
                      <p className="text-xs uppercase tracking-widest text-amber-200/60 font-bold mt-1">Toplam Puan</p>
                  </div>
              </div>
          </GlassCard>
          
          {/* MAIN QUEST BOARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <GlassCard 
                href="/student/soru-bankasi"
                icon={<Map className="h-8 w-8 text-sky-400" />}
                title="Macera Haritası"
                description="Dersler ve Soru Bankası"
                color="from-sky-900/40 to-blue-900/40 hover:border-sky-400/50 group-hover:bg-sky-900/30"
              >
                  <div className="w-full mt-4 space-y-4">
                      <div>
                          <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3"/> Tamamlanan Konu</span>
                              <span>{lessonProgress}%</span>
                          </div>
                          <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000" style={{width: `${lessonProgress}%`}}></div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                              <span className="flex items-center gap-1"><Target className="h-3 w-3"/> Başarı Oranı</span>
                              <span>{stats.questionBankProgress}%</span>
                          </div>
                          <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000" style={{width: `${stats.questionBankProgress}%`}}></div>
                          </div>
                      </div>
                  </div>
              </GlassCard>
            
            <GlassCard
                href="/leaderboard"
                icon={<Trophy className="h-8 w-8 text-amber-400" />}
                title="Şöhret Salonu"
                description="Liderlik Tablosu Sıralaman"
                color="from-amber-900/40 to-orange-900/40 hover:border-amber-400/50 group-hover:bg-amber-900/30"
            >
                <div className="mt-auto grid grid-cols-3 gap-2 w-full">
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
            </GlassCard>
          </div>

          {/* GAME MODES (PvE / PvP) */}
          <div className="grid grid-cols-2 gap-4 md:gap-6">
                <GameButton href="/student/activities" variant="info" className="text-xl flex-col gap-2 py-6 h-auto">
                    <Gamepad2 className="h-10 w-10 mb-1"/> 
                    <span>Etkinlikler</span>
                    <span className="text-[10px] opacity-70 font-normal normal-case">Arcade Modu</span>
                </GameButton>
                 <GameButton href="/student/yarismalar" variant="secondary" className="text-xl flex-col gap-2 py-6 h-auto">
                    <Swords className="h-10 w-10 mb-1"/> 
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
    </>
  );
}
