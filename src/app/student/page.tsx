
"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, where, orderBy, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit } from "@/lib/types";
import { getStudentExams } from "@/app/student/deneme/actions";
import { getLiveLeaderboard } from "@/app/leaderboard/actions";

import { 
    BookOpen, Trophy, Star, Gamepad2, Users, 
    ShoppingCart, Columns, LayoutTemplate, FileCog, 
    Crown, Award, Zap, Target, Sparkles, Map, Swords, Backpack,
    Loader2, Home, User
} from 'lucide-react';

// --- UTILS ---

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}

const Link = ({ href, children, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
        {children}
    </a>
);

const UserAvatar = ({ user, className }: any) => (
    <div className={cn("rounded-full bg-slate-200 flex items-center justify-center overflow-hidden relative", className)}>
        {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
        ) : (
            <span className="font-bold text-slate-500 text-lg">{user?.displayName?.charAt(0) || "U"}</span>
        )}
    </div>
);

const Skeleton = ({ className }: { className?: string }) => (
    <div className={cn("animate-pulse rounded-md bg-white/10", className)} />
);


// --- COMPONENTS ---
const GlassCard = ({ href, icon, title, description, color, badge, children }: { href?: string, icon?: ReactNode, title?: string, description?: string, color?: string, badge?: string | number, children?: ReactNode }) => {
    const content = (
        <div className={cn("h-full w-full rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-fuchsia-500/30 bg-gradient-to-br text-white border border-white/10", color)}>
            <div className="flex justify-center items-center gap-4 mb-4">
                 {icon && (
                    <div className="bg-black/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                )}
                <div>
                    {title && <h2 className="text-2xl font-bold text-white text-center sm:text-left">{title}</h2>}
                    {description && <p className="text-white/70 text-sm text-center sm:text-left">{description}</p>}
                </div>
            </div>
            {children}
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block group h-full">
                {content}
            </Link>
        )
    }
    return <div className="h-full">{content}</div>;
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
        
        setStats({
            score: userScore,
            completedTopics: 0,
            totalTopics: 0,
            coursesStarted: 0,
            coursesCompleted: 0,
            totalCourses: 0,
            generalRank,
            classRank,
            branchRank,
            questionBankProgress: 0,
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
          
           <GlassCard>
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 p-4 md:p-6 relative overflow-hidden text-center sm:text-left">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="p-1 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 shadow-lg shadow-amber-500/20">
                         <UserAvatar user={user} className="w-24 h-24 border-4 border-[#2b1055] text-slate-800 bg-white"/>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-400 shadow-sm">
                        LVL {Math.floor(stats.score / 1000) + 1}
                    </div>
                  </div>
                  
                  <div className="flex-grow z-10 space-y-1">
                      <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                      <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Backpack className="h-4 w-4 text-indigo-300"/>
                        <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                      </div>
                  </div>
                  
                  <div className="text-center z-10 bg-black/30 p-3 rounded-2xl border border-white/10 min-w-[140px] mt-4 sm:mt-0">
                      <div className="flex items-center justify-center gap-2 text-3xl font-black text-amber-400 drop-shadow-sm">
                          <Star className="h-6 w-6 fill-amber-400 animate-pulse"/>
                          <span>{stats.score.toLocaleString()}</span>
                      </div>
                      <p className="text-xs uppercase tracking-widest text-amber-200/60 font-bold mt-1">Toplam Puan</p>
                  </div>
              </div>
          </GlassCard>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <GlassCard href="/student/soru-bankasi" icon={<Map className="h-8 w-8 text-sky-400" />} title="Macera Haritası" description="Dersler ve Soru Bankası" color="from-sky-900/40 to-blue-900/40 hover:border-sky-400/50 group-hover:bg-sky-900/30">
                  <div className="w-full px-4 mt-4 space-y-4">
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
              </GlassCard>
            
            <GlassCard href="/leaderboard" icon={<Trophy className="h-8 w-8 text-amber-400" />} title="Şöhret Salonu" description="Liderlik Tablosu Sıralaman" color="from-amber-900/40 to-orange-900/40 hover:border-amber-400/50 group-hover:bg-amber-900/30">
                <div className="mt-4 grid grid-cols-3 gap-2 w-full">
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

          <div className="grid grid-cols-2 gap-4">
              <GlassCard href="/student/yazilacaklar" icon={<Columns className="h-6 w-6"/>} title="Yazılacaklar" description="Ders notları ve kavramlar" color="from-orange-900/50 to-orange-800/50" />
              <GlassCard href="/student/ozetler" icon={<LayoutTemplate className="h-6 w-6"/>} title="Özetler" description="İnteraktif konu özetleri" color="from-teal-900/50 to-teal-800/50" />
          </div>

          <HardestWorkersToday />
          
      </div>
    </div>
    </>
  );
}
