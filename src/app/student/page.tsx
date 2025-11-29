
"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import { 
    BookOpen, Trophy, Star, Gamepad2, Users, 
    ShoppingCart, Columns, LayoutTemplate, FileCog, 
    Crown, Award, Zap, Target, Sparkles, Map, Swords, Backpack,
    Loader2, Home, User, ClipboardList
} from 'lucide-react';
import { getStudentExams } from "@/app/student/deneme/actions";
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getDocs, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { UserProfile, SchoolClass, Course } from "@/lib/types";

// --- UTILS & MOCKS ---

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

const GlassCard = ({ href, icon, title, description, color, badge, children }: { href?: string, icon?: React.ReactNode, title?: string, description?: string, color?: string, badge?: string | number, children?: React.ReactNode }) => {
    const content = (
        <div className={cn("h-full w-full rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-fuchsia-500/30 bg-gradient-to-br text-white border border-white/10", color)}>
            {badge && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white animate-bounce shadow-sm">
                    {badge}
                </span>
            )}
            {icon && <div className="bg-black/30 p-3 rounded-full mb-4 group-hover:scale-110 transition-transform">{icon}</div>}
            {title && <h3 className="font-bold text-lg leading-tight">{title}</h3>}
            {description && <p className="text-xs text-white/70 mt-1">{description}</p>}
            {children}
        </div>
    );

    if (href) {
        return <Link href={href} className="block group h-full">{content}</Link>;
    }
    return <div className="h-full">{content}</div>;
};

// --- MOCK DATA & HOOKS ---

const MOCK_LEADERBOARD = [
    { uid: '1', displayName: 'Zeynep Yılmaz', score: 18500, class: '6-A' },
    { uid: '2', displayName: 'Ahmet Demir', score: 17200, class: '6-B' },
    { uid: '3', displayName: 'Ayşe Kaya', score: 16800, class: '6-A' },
];

const MOCK_STATS = {
    score: 15450,
    completedTopics: 12,
    totalTopics: 20,
    questionBankProgress: 65, 
    generalRank: 42,
    classRank: 5,
    branchRank: 3,
};

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
  const [stats, setStats] = useState(MOCK_STATS);
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

          const completedTopics = progressSnap.exists() ? (progressSnap.data() as any).completedTopics || [] : [];
          completedTopicsTotal += completedTopics.length;
          
          const unitsRef = collection(db, 'courses', course.id, 'units');
          const unitsSnap = await getDocs(unitsRef);
          let totalTopics = 0;
          
          for (const unitDoc of unitsSnap.docs) {
            const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
            totalTopics += topicsSnap.size;
          }
          
          grandTotalTopics += totalTopics;
          (course as any).progress = totalTopics > 0 ? Math.round((completedTopics.length / totalTopics) * 100) : 0;
          (course as any).topicsCount = totalTopics;
          (course as any).unitsCount = unitsSnap.size;
          (course as any).completedTopicsCount = completedTopics.length;
        
          const qbProgressRef = collection(db, `users/${user.uid}/questionBankProgress`);
          const qbSnapshot = await getDocs(query(qbProgressRef, where('courseId', '==', course.id)));

            if (!qbSnapshot.empty) {
                const progressData = qbSnapshot.docs[0].data();
                for (const topicId in progressData) {
                    const topicProgress = progressData[topicId];
                    if (topicProgress) {
                        const allResults = [
                            ...Object.values(topicProgress.easy || {}),
                            ...Object.values(topicProgress.medium || {}),
                            ...Object.values(topicProgress.hard || {})
                        ];
                        totalQuestionBankTests += allResults.length;
                        passedTests += allResults.filter((r: any) => r.status === 'passed').length;
                    }
                }
            }

          return course;
        }));
        
        const qbProgressPercentage = totalQuestionBankTests > 0 
            ? Math.round((passedTests / totalQuestionBankTests) * 100)
            : 0;

        setStats({
            score: userScore,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
            coursesStarted: coursesData.filter(c => ((c as any).progress || 0) > 0).length,
            coursesCompleted: coursesData.filter(c => (c as any).progress === 100).length,
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
    <div className="min-h-full bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black p-4 sm:p-6 md:p-8 pb-32 md:pb-12 text-white font-sans selection:bg-purple-500/30">
      <div className="max-w-5xl mx-auto space-y-6">
          
           <GlassCard>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-4 md:p-6 relative overflow-hidden">
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
                  
                  <div className="text-center sm:text-right z-10 bg-black/30 p-3 rounded-2xl border border-white/10 min-w-[140px]">
                      <div className="flex items-center justify-center sm:justify-end gap-2 text-3xl font-black text-amber-400 drop-shadow-sm">
                          <Star className="h-6 w-6 fill-amber-400 animate-pulse"/>
                          <span>{stats.score.toLocaleString()}</span>
                      </div>
                      <p className="text-xs uppercase tracking-widest text-amber-200/60 font-bold mt-1">Toplam Puan</p>
                  </div>
              </div>
          </GlassCard>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard href="/student/soru-bankasi" color="from-sky-900/50 to-blue-800/50" className="md:col-span-3">
              <div className="p-5 flex flex-col h-full relative">
                  <div className="absolute top-4 right-4 bg-sky-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <Map className="h-8 w-8 text-sky-400" />
                  </div>
                  <div className="mb-6 text-left">
                      <h2 className="text-2xl font-bold text-white mb-1">Macera Haritası</h2>
                      <p className="text-sky-200 text-sm">Dersler ve Soru Bankası</p>
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
              </div>
            </GlassCard>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <GameButton href="/student/activities" variant="info" className="flex-col gap-2 py-6 h-auto">
                <Gamepad2 className="h-8 w-8 mb-1"/> 
                <span>Etkinlikler</span>
            </GameButton>
            <GameButton href="/student/yarismalar" variant="secondary" className="flex-col gap-2 py-6 h-auto">
                <Swords className="h-8 w-8 mb-1"/> 
                <span>Arena</span>
            </GameButton>
          </div>
          
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GlassCard href="/student/yazilacaklar" icon={<Columns className="h-6 w-6"/>} title="Yazılacaklar" description="Konu özetlerini ve notlarını görüntüle." color="from-green-900/50 to-green-800/50" />
              <GlassCard href="/student/ozetler" icon={<LayoutTemplate className="h-6 w-6"/>} title="Özetler" description="İnteraktif sunumlarla konuları tekrar et." color="from-orange-900/50 to-orange-800/50" />
              <GlassCard href="/student/shop" icon={<ShoppingCart className="h-6 w-6"/>} title="Puan Dükkanı" description="Puanlarınla profilini özelleştir." color="from-teal-900/50 to-teal-800/50" />
              <GlassCard href="/student/deneme" icon={<FileCog className="h-6 w-6"/>} title="Deneme Sınavı" description="Sana atanan özel sınavları çöz." color="from-violet-900/50 to-violet-800/50" badge={examStats.pending > 0 ? `${examStats.pending} YENİ` : undefined} />
          </div>
          
          <HardestWorkersToday />
          
      </div>
      
    </div>
    </>
  );
}

export default function StudentPage() {
    return <StudentDashboard />;
}

    