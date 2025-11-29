
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc, limit } from 'firebase/firestore';
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
    BookOpen, Trophy, Star, Gamepad2, Users, 
    ShoppingCart, Columns, LayoutTemplate, FileCog, 
    Crown, Award, Zap, Target, Sparkles, Map, Swords, Backpack,
    Loader2, Home, User, ClipboardList
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";

// --- GAMIFIED UI COMPONENTS ---

const GlassCard = ({ href, icon, title, description, color, badge }: { 
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    badge?: string | number;
}) => (
    <Link href={href} className="group h-full">
        <div className={cn(
            "h-full w-full rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-fuchsia-500/30",
            "bg-gradient-to-br text-white border border-white/10",
            color
        )}>
            <div className="mb-4">{icon}</div>
            <h3 className="font-bold text-xl">{title}</h3>
            <p className="text-xs opacity-70 mt-1 flex-grow">{description}</p>
            <div className="mt-4">
                <span className="inline-block px-4 py-1 bg-black/20 rounded-full text-xs font-semibold backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                    Başla
                </span>
            </div>
             {badge && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white animate-bounce shadow-sm">
                    {badge}
                </span>
            )}
        </div>
    </Link>
);


// --- MOCK DATA & COMPONENTS FOR DISPLAY ---

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
        <div className="backdrop-blur-md bg-white/5 border-2 border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
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
                                        <p className="text-white/50 text-xs">{student.class}</p>
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
        </div>
    )
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    score: 0,
    completedTopics: 0,
    totalTopics: 0,
    questionBankProgress: 0,
    generalRank: 0,
    classRank: 0,
    branchRank: 0,
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
            const [allStudentsSnapshot, classesSnapshot, allCoursesSnapshot, examsResult] = await Promise.all([
                getDocs(query(collection(db, "users"), where("role", "==", "student"))),
                getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
                getDocs(collection(db, "courses")),
                getStudentExams(user.uid),
            ]);

            if (examsResult.success && examsResult.data) {
                const pending = examsResult.data.filter(a => !a.solvedEvent).length;
                const solved = examsResult.data.length - pending;
                setExamStats({ pending, solved });
            }

            const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            const allStudents = allStudentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & {uid: string}));

            const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
            const generalRank = sortedAllStudents.findIndex(s => s.uid === user.uid) + 1;
            let classRank = 0;
            let branchRank = 0;
            if(user.class) {
                const gradeName = user.class.split(' - ')[0];
                const studentsInGrade = allStudents.filter(s => s.class?.startsWith(gradeName));
                const sortedGradeStudents = [...studentsInGrade].sort((a,b) => (b.score || 0) - (a.score || 0));
                classRank = sortedGradeStudents.findIndex(s => s.uid === user.uid) + 1;
                
                const studentsInBranch = allStudents.filter(s => s.class === user.class);
                const sortedBranchStudents = [...studentsInBranch].sort((a,b) => (b.score || 0) - (a.score || 0));
                branchRank = sortedBranchStudents.findIndex(s => s.uid === user.uid) + 1;
            }

            const studentClassName = user.class?.split(' - ')[0];
            const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
            const studentClassId = studentClass?.id;
            
            const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
            let filteredCourses: Course[] = [];
            if (studentClassId) {
                const firstClassId = classesSnapshot.docs[0]?.id;
                const isFirstClass = studentClassId === firstClassId;
                filteredCourses = studentVisibleCourses.filter(course =>
                    !course.isTeacherOnly && (course.classId === studentClassId || (!course.classId && isFirstClass))
                );
            } else {
                filteredCourses = studentVisibleCourses.filter(course => !course.classId && !course.isTeacherOnly);
            }
            
            let completedTopicsTotal = 0;
            let grandTotalTopics = 0;
            let totalQuestionBankPassedTests = 0;
            let totalQuestionBankTests = 0;
            
            for (const course of filteredCourses) {
                const [progressSnap, unitsSnap, qbStats] = await Promise.all([
                    getDoc(doc(db, 'users', user.uid, 'progress', course.id)),
                    getDocs(collection(db, 'courses', course.id, 'units')),
                    getCourseQuestionBankStats(course.id, user.uid)
                ]);
                
                if (progressSnap.exists()) {
                    completedTopicsTotal += (progressSnap.data().completedTopics || []).length;
                }
                
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
                score: user.score || 0,
                completedTopics: completedTopicsTotal,
                totalTopics: grandTotalTopics,
                questionBankProgress: qbProgressPercentage,
                generalRank,
                classRank,
                branchRank
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
    <div className="min-h-full bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black p-4 sm:p-6 md:p-8 pb-32 md:pb-12 text-white font-sans selection:bg-purple-500/30">
      <div className="max-w-5xl mx-auto space-y-6">
          
          <GlassCard className="p-1 bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
              <div className="flex flex-row items-center gap-4 p-4 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="p-1 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 shadow-lg shadow-amber-500/20">
                         <UserAvatar user={user} className="w-20 h-20 border-4 border-[#2b1055] text-slate-800 bg-white"/>
                    </div>
                  </div>
                  
                  <div className="flex-grow text-left z-10 space-y-1">
                      <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                      <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Backpack className="h-4 w-4 text-indigo-300"/>
                        <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                      </div>
                  </div>
                  
                  <div className="text-center z-10 bg-black/30 p-3 rounded-2xl border border-white/10 min-w-[120px]">
                      <div className="flex items-center justify-center gap-2 text-xl font-black text-amber-400 drop-shadow-sm">
                          <Star className="h-5 w-5 fill-amber-400 animate-pulse"/>
                          <span>{stats.score.toLocaleString()}</span>
                      </div>
                      <p className="text-xs uppercase tracking-widest text-amber-200/60 font-bold mt-1">Toplam Puan</p>
                  </div>
              </div>
          </GlassCard>
          
           <GlassCard className="bg-gradient-to-br from-sky-900/40 to-blue-900/40 hover:border-sky-400/50 transition-colors group-hover:bg-sky-900/30">
                <Link href="/student/soru-bankasi" className="p-5 flex flex-col h-full relative">
                    <div className="absolute top-4 right-4 bg-sky-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                        <Map className="h-8 w-8 text-sky-400" />
                    </div>
                    
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white mb-1">Ders Haritası</h2>
                        <p className="text-sky-200 text-sm">Tüm dersler, üniteler ve konular.</p>
                    </div>

                    <div className="mt-auto space-y-4">
                        <div>
                            <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3"/> Görev İlerlemesi</span>
                                <span>{lessonProgress}%</span>
                            </div>
                            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000" style={{width: `${lessonProgress}%`}}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                                <span className="flex items-center gap-1"><Target className="h-3 w-3"/> İsabet Oranı</span>
                                <span>{stats.questionBankProgress}%</span>
                            </div>
                            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000" style={{width: `${stats.questionBankProgress}%`}}></div>
                            </div>
                        </div>
                    </div>
                </Link>
           </GlassCard>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GlassCard href="/student/activities" icon={<Gamepad2 className="h-10 w-10 text-rose-300"/>} title="Bireysel Etkinlikler" description="Eğlenceli oyunlarla kendini sına ve puanları topla." color="from-rose-900/50 to-rose-800/50"/>
              <GlassCard href="/student/yazilacaklar" icon={<Columns className="h-10 w-10 text-orange-300"/>} title="Yazılacaklar" description="Ders notları ve önemli kavramlar." color="from-orange-900/50 to-orange-800/50"/>
              <GlassCard href="/student/ozetler" icon={<LayoutTemplate className="h-10 w-10 text-teal-300"/>} title="Özetler" description="İnteraktif konu özetleri ve sunumlar." color="from-teal-900/50 to-teal-800/50"/>
              <GlassCard href="/student/deneme" icon={<FileCog className="h-10 w-10 text-violet-300"/>} title="Deneme Sınavları" description="Sana özel atanan deneme sınavlarını çöz." color="from-violet-900/50 to-violet-800/50" badge={examStats.pending > 0 ? `${examStats.pending} YENİ` : undefined}/>
          </div>
          
          <HardestWorkersToday />
          
      </div>

      <MobileNav />
    </div>
    </>
  );
}
