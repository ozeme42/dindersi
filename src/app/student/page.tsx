
"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc } from 'firebase/firestore';
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, MapIcon as Map, Backpack, Target, ClipboardList } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GlassCard = ({ href, children, className, color = "from-slate-800/50 to-slate-900/50" }: { href?: string; children: React.ReactNode; className?: string; color?: string }) => {
    const content = (
        <div className={cn("bg-gradient-to-b backdrop-blur-md border-2 border-white/10 rounded-3xl shadow-2xl overflow-hidden relative group h-full", color, className)}>
            {children}
        </div>
    );

    if (href) {
        return <Link href={href} className="block h-full transition-transform duration-300 hover:-translate-y-2">{content}</Link>;
    }
    return content;
};

function StatCard({ title, value, icon, href }: { title: string, value: string | number, icon: ReactNode, href: string }) {
    return (
        <GlassCard href={href} className="p-5 flex flex-col items-center justify-center text-center">
            {React.cloneElement(icon as React.ReactElement, { className: "h-8 w-8 text-white/80 mb-2" })}
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-sm font-semibold text-white/90">{title}</p>
        </GlassCard>
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
        0: <Crown className="h-6 w-6 text-yellow-300" />,
        1: <Award className="h-6 w-6 text-slate-300" />,
        2: <Award className="h-6 w-6 text-amber-500" />,
    };

    return (
        <GlassCard href="/leaderboard" className="bg-[#1a0b2e]/90 backdrop-blur-xl border-white/10">
            <div className="p-5">
                <h3 className="font-bold text-lg text-white mb-3 text-center">Günün Efsaneleri</h3>
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-10 w-full rounded-lg bg-white/10" />
                        <Skeleton className="h-10 w-full rounded-lg bg-white/10" />
                        <Skeleton className="h-10 w-full rounded-lg bg-white/10" />
                    </div>
                ) : dailyTop.length > 0 ? (
                     <div className="space-y-2">
                        {dailyTop.map((student, index) => (
                            <div key={student.uid} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-black/20 hover:bg-black/40 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-7 w-7 flex items-center justify-center flex-shrink-0">
                                      {rankIcons[index]}
                                    </div>
                                    <UserAvatar user={student} className="w-8 h-8 flex-shrink-0"/>
                                    <p className="font-medium text-sm text-white truncate">{student.displayName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm text-fuchsia-300 ml-2">{(student.score || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-sm text-white/50 py-8">Bugün henüz kimse puan kazanmadı.</p>
                )}
            </div>
        </GlassCard>
    )
}

function StudentPage() {
    return <StudentDashboard />;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
      score: 0,
      completedTopics: 0,
      totalTopics: 0,
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
        let userScore = user.score || 0;
        
        const studentClassName = user.class?.split(' - ')[0];

        const [allCoursesSnapshot, examsSnapshot] = await Promise.all([
          getDocs(collection(db, "courses")),
          getStudentExams(user.uid),
        ]);
        
        if (examsSnapshot.success && examsSnapshot.data) {
            const pending = examsSnapshot.data.filter(a => !a.solvedEvent).length;
            const solved = examsSnapshot.data.length - pending;
            setExamStats({ pending, solved });
        }

        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
        
        let filteredCourses: Course[] = [];
         if (studentClassName) {
            const classesSnapshot = await getDocs(query(collection(db, 'classes'), where('name', '==', studentClassName)));
            const studentClassId = classesSnapshot.docs[0]?.id;
            
            if (studentClassId) {
                const isFirstClass = classesSnapshot.docs[0]?.data().createdAt;
                const allClassesSnap = await getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc'), limit(1)));
                const firstClassEverId = allClassesSnap.docs[0]?.id;
                
                filteredCourses = studentVisibleCourses.filter(course =>
                    course.classId === studentClassId || (!course.classId && studentClassId === firstClassEverId)
                );
            } else {
                 filteredCourses = studentVisibleCourses.filter(course => !course.classId);
            }
        } else {
            filteredCourses = studentVisibleCourses.filter(course => !course.classId);
        }
        
        let totalQuestionBankPassedTests = 0;
        let totalQuestionBankTests = 0;

        for (const course of filteredCourses) {
            const progressSnap = await getDoc(doc(db, 'users', user.uid, 'progress', course.id));
            const completedTopics = progressSnap.exists() ? (progressSnap.data().completedTopics || []).length : 0;
            completedTopicsTotal += completedTopics;
            
            const unitsSnap = await getDocs(collection(db, 'courses', course.id, 'units'));
            let totalTopics = 0;
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                totalTopics += topicsSnap.size;
            }
            grandTotalTopics += totalTopics;

            const qbStats = await getCourseQuestionBankStats(course.id, user.uid);
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
        <div className="flex h-screen w-full items-center justify-center bg-[#0f041e]">
            <Loader2 className="h-16 w-16 animate-spin text-white/50" />
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
          <GlassCard href="/student/profile" color="from-slate-800/50 to-slate-900/50" className="bg-[#1a0b2e]/90">
              <div className="p-5 flex items-center gap-4">
                  <UserAvatar user={user} className="w-20 h-20 text-3xl"/>
                  <div className="space-y-1.5">
                      <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                      <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Backpack className="h-4 w-4 text-indigo-300"/>
                        <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                      </div>
                  </div>
                  <div className="ml-auto text-right">
                      <div className="flex items-center justify-end gap-2 text-3xl font-bold text-amber-300">
                          <Star className="h-6 w-6"/>
                          <span>{stats.score.toLocaleString()}</span>
                      </div>
                      <p className="text-sm opacity-80 text-amber-100">Puan</p>
                  </div>
              </div>
          </GlassCard>

          <GlassCard href="/student/ders" color="from-sky-900/50 to-sky-800/50" className="bg-[#0c2a4d]/90 md:col-span-3">
              <div className="p-5 flex flex-col h-full relative">
                  <div className="absolute top-4 right-4 bg-sky-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <Map className="h-8 w-8 text-sky-400" />
                  </div>
                  
                  <div className="mb-6">
                      <h2 className="text-2xl font-bold text-white">Ders Haritası</h2>
                      <p className="text-sky-200/80 text-sm">Konu anlatımları ve etkinlikler burada.</p>
                  </div>

                  <div className="mt-auto space-y-3">
                      <div>
                          <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                              <span>İlerleme</span>
                              <span>{lessonProgress}%</span>
                          </div>
                          <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 rounded-full transition-all duration-500" style={{ width: `${lessonProgress}%` }} />
                          </div>
                      </div>
                  </div>
              </div>
          </GlassCard>
          
          {/* Grid Menu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard 
                href="/student/soru-bankasi"
                color="from-teal-900/50 to-teal-800/50"
                className="md:col-span-2 bg-[#0c3a3d]/90"
            >
                <div className="p-5 flex flex-col h-full relative">
                    <div className="absolute top-4 right-4 bg-teal-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                        <ClipboardList className="h-8 w-8 text-teal-400" />
                    </div>
                    
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white">Alıştırmalar</h2>
                        <p className="text-teal-200/80 text-sm">Konu testleri çözerek kendini geliştir.</p>
                    </div>

                    <div className="mt-auto space-y-3">
                         <div>
                            <div className="flex justify-between text-xs font-bold text-teal-100 mb-1 uppercase tracking-wide">
                                <span>Başarı Oranı</span>
                                <span>{stats.questionBankProgress}%</span>
                            </div>
                             <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-gradient-to-r from-teal-400 to-green-300 rounded-full transition-all duration-500" style={{ width: `${stats.questionBankProgress}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <div className="hidden md:block">
               <HardestWorkersToday />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <GlassCard
                href="/student/activities"
                icon={<Gamepad2 className="h-8 w-8 text-fuchsia-300"/>} 
                title="Bireysel Etkinlikler"
                description="Eğlenceli oyunlarla kendini sına ve puanları topla."
                color="from-fuchsia-900/50 to-fuchsia-800/50"
                className="bg-[#3a0c3d]/90"
            />
            <GlassCard
                href="/student/yarismalar"
                icon={<Users className="h-8 w-8 text-red-300"/>} 
                title="Çok Oyunculu Yarışmalar"
                description="Arkadaşlarınla veya sınıfınla yarış."
                color="from-red-900/50 to-red-800/50"
                className="bg-[#4d0c1d]/90"
            />
             <GlassCard
                href="/student/deneme"
                icon={<FileCog className="h-8 w-8 text-indigo-300"/>}
                title="Deneme Sınavları"
                description={`${examStats.pending > 0 ? `${examStats.pending} yeni denemen var!` : 'Kendini değerlendir.'}`}
                color="from-indigo-900/50 to-indigo-800/50"
                className="bg-[#1a1c4d]/90"
                badgeCount={examStats.pending}
            />
          </div>

          <div className="block md:hidden">
              <HardestWorkersToday />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

const GlassCardBadge = ({ count }: { count: number }) => {
    if (count <= 0) return null;
    return (
        <div className="absolute top-4 right-4 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white/50 animate-pulse">
            {count}
        </div>
    );
};

const GlassCardContent = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
     <div className="p-5 flex flex-col items-center justify-center text-center h-full">
        <div className="bg-white/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <h3 className="font-bold text-xl text-white">{title}</h3>
        <p className="text-sm text-white/70 mt-1">{description}</p>
    </div>
);
const GlassCardWithIcon = ({ href, icon, title, description, color, className, badgeCount }: { href: string; icon: ReactNode; title: string; description: string; color: string; className?: string, badgeCount?: number }) => (
    <GlassCard href={href} color={color} className={className}>
        <GlassCardBadge count={badgeCount || 0} />
        <GlassCardContent icon={icon} title={title} description={description} />
    </GlassCard>
);
